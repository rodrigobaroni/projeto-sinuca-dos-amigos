# 17. Estratégia de testes

## 17.1 Pirâmide e escopo

| Nível | Volume alvo | O que cobre | Ferramentas | Tempo máximo |
|---|---:|---|---|---|
| **Unitário** | ~500 | Regras de domínio puras: `winRate`, `businessDate`, máquinas de estado, política de senha, ordenação de ranking, desempates | xUnit + FluentAssertions + AutoFixture | < 30 s |
| **Integração** | ~200 | Casos de uso com **PostgreSQL real** (Testcontainers), transações, constraints, concorrência, idempotência | xUnit + Testcontainers + Respawn | < 5 min |
| **Contrato** | ~90 (1 por endpoint) | Request/response contra a OpenAPI; nenhum campo a mais nem a menos | Schemathesis / Microsoft.OpenApi + snapshot | < 2 min |
| **Segurança** | ~120 | Autorização por rota, IDOR, enumeração, rate limit, redação de PII em log | xUnit + cenários dedicados | < 3 min |
| **E2E** | ~15 | Jornadas completas contra ambiente de homologação | Playwright (API) / k6 | < 10 min |
| **Carga** | 5 cenários | Pico de 22h, rajada de eventos de bola, rebuild de ranking | k6 | sob demanda |
| **Arquitetura** | ~10 | Domínio sem dependência de framework, nomes de rota, convenções | NetArchTest | < 10 s |

**Regra de ouro `[R]`:** as três coisas que **não podem** estar erradas — cálculo de ranking, `businessDate` e autorização de objeto — têm cobertura de **100 %** e testes em mais de um nível.

Massa de dados: **o dataset canônico do [README §0.6](README.md)** é o seed padrão de todo teste de integração. Isso significa que qualquer divergência entre a especificação e o código aparece como teste vermelho.

---

## 17.2 Fluxos felizes (`TC-HAPPY-*`)

| ID | Cenário | Pré-condição | Operação | Resultado esperado |
|---|---|---|---|---|
| TC-HAPPY-001 | Cadastro completo | E-mail e username livres | `POST /auth/register` com payload válido | `201`; usuário `PENDING_VERIFICATION`; tokens emitidos; `UserRegistered` no outbox; e-mail de verificação enfileirado |
| TC-HAPPY-002 | Verificação de e-mail | Token válido de 2 h | `POST /auth/email/verify` | `200`; `status = ACTIVE`; `emailVerifiedAt` preenchido |
| TC-HAPPY-003 | Login e refresh | Conta `ACTIVE` | `POST /auth/login` → `POST /auth/refresh` | `200` em ambos; refresh antigo marcado `ROTATED`; novo par válido |
| TC-HAPPY-004 | Criar liga com convites | Rodrigo verificado, `venueId` válido | `POST /leagues` (payload de §9.2) | `201`; `OWNER` criado; `RankingEntry` zerada; 4 convites `PENDING`; `inviteCode` gerado; `nextSessionAt = 2026-07-28T23:00:00Z` |
| TC-HAPPY-005 | Aceitar convite de liga | Convite `PENDING` para João | `POST /league-invitations/{id}/accept` | `200`; `LeagueMember(PLAYER)`; `membersCount = 2`; `RankingEntry` zerada; notificação ao convidante |
| TC-HAPPY-006 | Entrar por código | Código `TERCA-7K9M` válido | `POST /leagues/join-by-code` | `201`; `joinedVia = INVITE_CODE`; `usesCount = 1` |
| TC-HAPPY-007 | Abrir jogatina implicitamente | Liga ativa, sem jogatina aberta | `GET /leagues/{id}/play-sessions/current?createIfMissing=true` | `201`; `businessDate = 2026-07-14`; `status = IN_PROGRESS` |
| TC-HAPPY-008 | Ciclo completo de partida | Jogatina aberta, 2 membros | `POST /matches` → 2× `POST /events` → `POST /finish` | `201`, `201`, `201`, `200`; ranking da liga e da jogatina atualizados na resposta do `finish` |
| TC-HAPPY-009 | Noite completa de 9 partidas | Dataset canônico | Executar as 9 partidas do README §0.6 | Pódio final = Rodrigo 4 · Felipe 3 · João 2 · Anderson 0; ranking da liga = 8/2 · 7/4 · 5/4 · 4/6 · 3/7 |
| TC-HAPPY-010 | Fechar jogatina | 9 partidas finalizadas | `POST /play-sessions/{id}/close` | `200`; `isFinal = true`; pódio congelado; notificação aos 4 participantes |
| TC-HAPPY-011 | Compartilhar pódio | Jogatina com partidas | `POST /play-sessions/{id}/share` | `201`; `shareUrl` acessível sem auth; `snapshot` congelado |
| TC-HAPPY-012 | Convite e aceite de amizade | Sem relação prévia | `POST /friend-requests` → `accept` | `201` → `200`; `Friendship` criada com `userAId < userBId` |
| TC-HAPPY-013 | Head-to-head | Dataset canônico | `GET /me/head-to-head/{joaoId}?period=ALL_TIME` | `myWins = 5`, `opponentWins = 3`, `myWinRate = 62.50`; `byLeague` = 3×3 e 2×0 |
| TC-HAPPY-014 | KPIs da Home | Dataset canônico pós-noite | `GET /me?include=statistics` | `matchesPlayed = 47`, `winRate = 61.70`, `currentWinStreak = 5`, `longestLossStreak = 2` |
| TC-HAPPY-015 | Buscar locais por proximidade | 3 locais no seed | `GET /venues?lat=-23.5583&lng=-46.6604&radiusKm=6` | 3 itens ordenados por distância: 2.4, 3.8, 5.1 km |
| TC-HAPPY-016 | Encerrar liga | Liga ativa sem jogatina aberta, ator `OWNER` | `POST /leagues/{id}/finish` | `200`; `FINISHED`; ranking congelado; convites expirados; códigos revogados |
| TC-HAPPY-017 | Notificações agrupadas | 3 notificações não lidas | `GET /me/notifications?groupBy=category` | 3 grupos; `meta.unreadCount = 3`; ações inline presentes nos convites |
| TC-HAPPY-018 | Encerrar sessão | Sessão ativa | `POST /auth/logout` | `204`; refresh revogado; `jti` na denylist |

---

## 17.3 Validações (`TC-VAL-*`)

| ID | Cenário | Pré-condição | Operação | Resultado esperado |
|---|---|---|---|---|
| TC-VAL-001 | Senha viola os 5 critérios | — | `POST /auth/register` com `"sinuca"` | `422 VALIDATION_ERROR` com **4** itens: `TOO_SHORT`, `MISSING_UPPERCASE`, `MISSING_DIGIT`, `MISSING_SPECIAL` — e **sem** `MISSING_LOWERCASE` |
| TC-VAL-002 | Todos os erros acumulados | Payload inválido em 5 campos | `POST /auth/register` | `errors[]` com todos, não apenas o primeiro |
| TC-VAL-003 | Username em uso | `@baroni` existe | `POST /auth/register` | `422` com `USERNAME_TAKEN` |
| TC-VAL-004 | Username com formato inválido | — | `username = "Baroni!"` | `422 USERNAME_INVALID_FORMAT` |
| TC-VAL-005 | Username reservado | — | `username = "admin"` | `422 USERNAME_RESERVED` |
| TC-VAL-006 | Nome de liga curto | — | `POST /leagues` com `name = "AB"` | `422` com `TOO_SHORT` em `name` |
| TC-VAL-007 | Dia da semana duplicado | — | `weekdays = ["TUESDAY","TUESDAY"]` | `422 DUPLICATE_WEEKDAY` |
| TC-VAL-008 | Fuso inválido | — | `timezone = "America/Nowhere"` | `422 INVALID_TIMEZONE` |
| TC-VAL-009 | Local e rótulo juntos | — | `venueId` + `venueLabel` | `422 VENUE_CONFLICT` |
| TC-VAL-010 | Participantes insuficientes | Liga 1v1 | `POST /matches` com 1 participante | `422 INVALID_PARTICIPANT_COUNT` com `expected: 2` |
| TC-VAL-011 | Mesmo jogador duas vezes | — | `participants` com `userId` repetido | `422 DUPLICATE_PARTICIPANT` |
| TC-VAL-012 | Lados inválidos | — | Dois participantes no `side = 1` | `422 INVALID_SIDE_DISTRIBUTION` |
| TC-VAL-013 | Não-membro como participante | Marcos removido da liga | `POST /matches` incluindo Marcos | `422 PARTICIPANT_NOT_LEAGUE_MEMBER` com `userId` |
| TC-VAL-014 | Bola fora da faixa | `ballsCount = 8` | `POST /events` com `ballNumber = 9` | `422 INVALID_BALL_NUMBER` com `ballsCount: 8` |
| TC-VAL-015 | `ballNumber` em falta | — | `type = FOUL` com `ballNumber` | `422 BALL_NUMBER_NOT_ALLOWED` |
| TC-VAL-016 | Vencedor inválido | Partida 1v1 | `finish` com `winnerSide = 3` | `422 INVALID_WINNER_SIDE` |
| TC-VAL-017 | Vencedor não participante | — | `winnerUserId` de terceiro | `422 WINNER_NOT_PARTICIPANT` |
| TC-VAL-018 | Vencedor ambíguo | — | `winnerSide = 1` e `winnerUserId` do lado 2 | `422 AMBIGUOUS_WINNER` |
| TC-VAL-019 | Correção sem mudança | Partida com `winnerSide = 1` | `corrections` com `winnerSide = 1` | `422 CORRECTION_NO_CHANGE` |
| TC-VAL-020 | Motivo de correção curto | — | `reason = "erro"` (4 chars) | `422` com `TOO_SHORT` |
| TC-VAL-021 | Busca curta | — | `GET /users?q=a` | `422 SEARCH_QUERY_TOO_SHORT` |
| TC-VAL-022 | Campo de ordenação inválido | — | `?sort=-hackme` | `422 INVALID_SORT_FIELD` com `allowedFields[]` |
| TC-VAL-023 | Filtros conflitantes | — | `?period=LAST_30_DAYS&from=2026-01-01` | `422 CONFLICTING_FILTERS` |
| TC-VAL-024 | Coordenadas inválidas | — | `lat=200` | `422 INVALID_COORDINATES` |
| TC-VAL-025 | Raio excessivo | — | `radiusKm=100` | `422 RADIUS_OUT_OF_RANGE` |
| TC-VAL-026 | Sem critério de busca de local | — | `GET /venues` sem parâmetros | `422 LOCATION_OR_QUERY_REQUIRED` |
| TC-VAL-027 | Convite para si mesmo | — | `POST /friend-requests` com o próprio `userId` | `422 CANNOT_FRIEND_SELF` |
| TC-VAL-028 | Excesso de convites | — | 51 `userIds` | `422 TOO_MANY_INVITES` |
| TC-VAL-029 | Avatar grande | — | `contentLength = 6 MB` | `413 FILE_TOO_LARGE` |
| TC-VAL-030 | Tipo não suportado | — | `contentType = "image/svg+xml"` | `415 UNSUPPORTED_MEDIA_TYPE` |
| TC-VAL-031 | Imagem falsificada | Arquivo `.jpg` com bytes de PDF | `PUT /me/avatar` | `422 INVALID_IMAGE` |
| TC-VAL-032 | JSON malformado | — | Body `{"name":` | `400 MALFORMED_REQUEST` |
| TC-VAL-033 | Corpo acima do limite | — | 300 KB de JSON | `413 PAYLOAD_TOO_LARGE` |
| TC-VAL-034 | Desativar categoria de sistema | — | `PUT /me/notification-preferences` com `SYSTEM` | `422 CANNOT_DISABLE_SYSTEM_CATEGORY` |
| TC-VAL-035 | Quiet hours parcial | — | Só `startTime` | `422 INVALID_QUIET_HOURS` |

---

## 17.4 Autorização e IDOR (`TC-AUTH-*`)

**Requisito de cobertura:** toda rota com path parameter tem ao menos um teste desta seção. É verificado por um teste meta que enumera as rotas registradas e falha se alguma não tiver teste de autorização correspondente `[R]`.

| ID | Cenário | Pré-condição | Operação | Resultado esperado |
|---|---|---|---|---|
| TC-AUTH-001 | Sem token | — | `GET /me` | `401 UNAUTHENTICATED` |
| TC-AUTH-002 | Token expirado | `exp` no passado | `GET /me` | `401 TOKEN_EXPIRED` + `WWW-Authenticate` |
| TC-AUTH-003 | Token revogado | Após logout | `GET /me` | `401 TOKEN_REVOKED` |
| TC-AUTH-004 | Token com assinatura adulterada | — | `GET /me` | `401 TOKEN_INVALID` |
| TC-AUTH-005 | **IDOR — liga privada** | Carlos não é membro da Liga da Terça | `GET /leagues/{id}` | **`404 LEAGUE_NOT_FOUND`** (não 403) |
| TC-AUTH-006 | IDOR — ranking de liga privada | Idem | `GET /leagues/{id}/ranking` | `404` |
| TC-AUTH-007 | IDOR — histórico de liga privada | Idem | `GET /leagues/{id}/matches` | `404` |
| TC-AUTH-008 | Papel insuficiente — editar | João é `PLAYER` | `PATCH /leagues/{id}` | `403 INSUFFICIENT_LEAGUE_ROLE` |
| TC-AUTH-009 | Papel insuficiente — encerrar | Felipe é `ADMIN`, não `OWNER` | `POST /leagues/{id}/finish` | `403 INSUFFICIENT_LEAGUE_ROLE` com `requiredRole: OWNER` |
| TC-AUTH-010 | `ADMIN` removendo `ADMIN` | Felipe e outro `ADMIN` | `DELETE /members/{id}` | `403 INSUFFICIENT_LEAGUE_ROLE` |
| TC-AUTH-011 | Evento em partida alheia | Marcos não joga a partida | `POST /matches/{id}/events` | `403 NOT_MATCH_PARTICIPANT` |
| TC-AUTH-012 | Finalizar partida alheia | Idem | `POST /matches/{id}/finish` | `403 NOT_MATCH_PARTICIPANT` |
| TC-AUTH-013 | Aceitar convite de outro | Convite endereçado a João | Carlos chama `accept` | **`404 INVITATION_NOT_FOUND`** |
| TC-AUTH-014 | Cancelar convite recebido | João é o destinatário | João chama `DELETE /friend-requests/{id}` | `404` (deve usar `decline`) |
| TC-AUTH-015 | Aceitar convite enviado | Carlos é o remetente | Carlos chama `accept` | `404` |
| TC-AUTH-016 | Notificação de outro usuário | Notificação de João | Rodrigo marca como lida | `404 NOTIFICATION_NOT_FOUND` |
| TC-AUTH-017 | `PATCH /me` com `id` de outro | — | Body com `"id": "<outro>"` | `200`, campo **ignorado**; `id` inalterado |
| TC-AUTH-018 | `PATCH /me` alterando `status` | — | Body com `"status": "ACTIVE"` | Campo ignorado |
| TC-AUTH-019 | Stats de perfil privado | João com `profileVisibility = PRIVATE`, sem liga em comum | `GET /users/{id}/statistics` | `403 PROFILE_PRIVATE` |
| TC-AUTH-020 | Stats de amigo-only sem amizade | `FRIENDS_ONLY`, sem liga em comum | Idem | `403 PROFILE_FRIENDS_ONLY` |
| TC-AUTH-021 | Stats na mesma liga | `PRIVATE` mas liga em comum | `GET /users/{id}/statistics?leagueId=…` | `200` com V/D/% daquela liga |
| TC-AUTH-022 | H2H sem vínculo | Nunca jogaram, não são amigos | `GET /me/head-to-head/{id}` | `403 HEAD_TO_HEAD_NOT_ALLOWED` |
| TC-AUTH-023 | Correção fora da janela | 25 h após `finishedAt`, ator é participante | `POST /corrections` | `403 CORRECTION_WINDOW_EXPIRED` com `deadline` |
| TC-AUTH-024 | Correção fora da janela por admin | 25 h, ator é `OWNER` | Idem | `202` — permitido |
| TC-AUTH-025 | Compartilhar jogatina alheia | Marcos não jogou em 14/07 | `POST /share` | `403 NOT_SESSION_PARTICIPANT` |
| TC-AUTH-026 | Revogar share de outro | — | `DELETE /share-artifacts/{id}` | `403 NOT_SHARE_OWNER` |
| TC-AUTH-027 | Entrar em liga privada | Liga `PRIVATE` | `POST /leagues/{id}/join` | `403 LEAGUE_IS_PRIVATE` |
| TC-AUTH-028 | Ação sem e-mail verificado | Conta com 8 dias sem verificar | `POST /leagues` | `403 EMAIL_NOT_VERIFIED` |
| TC-AUTH-029 | Enumeração no login | E-mail inexistente vs. senha errada | Dois `POST /auth/login` | Mesmo `401 INVALID_CREDENTIALS`; diferença de tempo < 50 ms |
| TC-AUTH-030 | Enumeração no forgot | E-mail inexistente | `POST /auth/password/forgot` | `202` idêntico; nenhum e-mail enviado |
| TC-AUTH-031 | Busca não revela e-mail | — | `GET /users?q=rodrigo` | Resposta **sem** campo `email` |
| TC-AUTH-032 | Busca por e-mail | — | `GET /users?q=rodrigo.baroni@email.com` | Nenhum resultado por e-mail |
| TC-AUTH-033 | Usuário não-buscável | `searchableByUsername = false` | `GET /users?q=…` | Ausente dos resultados |
| TC-AUTH-034 | PII em log | Executar suíte de integração | Varredura do log | **Zero** ocorrência de e-mail, JWT ou coordenada |

---

## 17.5 Concorrência (`TC-CONC-*`)

Todos executados com **PostgreSQL real** e threads paralelas de verdade.

| ID | Cenário | Pré-condição | Operação | Resultado esperado |
|---|---|---|---|---|
| TC-CONC-001 | Dois celulares finalizam a mesma partida | Partida `IN_PROGRESS`, `version = 3` | 2 `POST /finish` simultâneos com `If-Match: W/"3"` | Um `200`; o outro `409 CONCURRENT_MODIFICATION` com `currentVersion: 4` e `currentState` preenchido |
| TC-CONC-002 | `If-Match` ausente | — | `POST /finish` sem header | `428 PRECONDITION_REQUIRED` com `currentETag` |
| TC-CONC-003 | Duas aberturas de jogatina | Liga sem jogatina | 2 `GET .../current?createIfMissing=true` simultâneos | **Uma única** `PlaySession`; um `201`, outro `200` com o mesmo `id` |
| TC-CONC-004 | Duas partidas para o mesmo jogador | João livre | 2 `POST /matches` simultâneos incluindo João | Um `201`; outro `409 PLAYER_ALREADY_IN_MATCH` com `conflictingMatchId` |
| TC-CONC-005 | Mesma bola duas vezes | Bola 2 livre | 2 `POST /events` simultâneos, `ballNumber = 2`, chaves distintas | Um `201`; outro `409 BALL_ALREADY_POCKETED` com `existingEventId`; **um único** `MatchEvent` ativo |
| TC-CONC-006 | Duas aceitações do mesmo convite | Convite `PENDING` | 2 `accept` simultâneos | Um `200`; outro `409 INVITATION_NOT_PENDING`; **um único** `LeagueMember` |
| TC-CONC-007 | Convites recíprocos simultâneos | Sem relação | A→B e B→A ao mesmo tempo | **Uma única** `Friendship`; nenhum erro 500 |
| TC-CONC-008 | Código com `maxUses = 1` | Código válido | 3 `join-by-code` simultâneos | Um `201`; dois `410 INVITE_CODE_EXHAUSTED`; `usesCount = 1` |
| TC-CONC-009 | Dois rebuilds da mesma liga | Duas correções simultâneas | 2 rebuilds | Serializados pelo advisory lock; resultado final **idêntico** ao rebuild único |
| TC-CONC-010 | Dois donos | Liga com `OWNER` | 2 transferências simultâneas de propriedade | Unique parcial garante **exatamente 1** `OWNER`; uma falha com `409` |
| TC-CONC-011 | Deadlock em ranking | 2 partidas com jogadores cruzados finalizando | Finalizações simultâneas | Nenhum deadlock (locks em ordem de `user_id`); ambas concluem |
| TC-CONC-012 | Sair enquanto joga | Membro em partida ativa | `POST /leave` | `409 MEMBER_HAS_ACTIVE_MATCH` com `matchId` |
| TC-CONC-013 | Encerrar liga com jogatina aberta | Jogatina `IN_PROGRESS` | `POST /finish` sem `force` | `409 LEAGUE_HAS_ACTIVE_SESSION` com `playSessionId` |
| TC-CONC-014 | Múltiplos workers no outbox | 100 eventos pendentes, 3 workers | Processamento | Cada evento processado **exatamente uma vez** (`SKIP LOCKED`) |
| TC-CONC-015 | Refresh concorrente | Um refresh token válido | 3 `POST /auth/refresh` simultâneos | Um `200`; os outros `401 REFRESH_TOKEN_REUSE_DETECTED`; família revogada |

---

## 17.6 Idempotência (`TC-IDEM-*`)

| ID | Cenário | Pré-condição | Operação | Resultado esperado |
|---|---|---|---|---|
| TC-IDEM-001 | Retry de criação de partida | — | 2× `POST /matches` com **mesma** chave e corpo | Duas respostas `201` **idênticas** (mesmo `matchId`); 2ª com `Idempotent-Replay: true`; **uma** partida no banco |
| TC-IDEM-002 | Chave reutilizada com corpo diferente | Chave já usada | `POST /matches` com adversário diferente | `422 IDEMPOTENCY_KEY_REUSE`; nenhuma partida nova |
| TC-IDEM-003 | Chave ausente | — | `POST /matches` sem header | `400 IDEMPOTENCY_KEY_REQUIRED` |
| TC-IDEM-004 | Chave malformada | — | `Idempotency-Key: abc` | `422 INVALID_IDEMPOTENCY_KEY` |
| TC-IDEM-005 | Retry durante processamento | Requisição em voo | Retry imediato com a mesma chave | `409 IDEMPOTENT_REQUEST_IN_PROGRESS` com `Retry-After: 1` |
| TC-IDEM-006 | Retry de finalização | Partida finalizada com a chave X | Retry com a chave X | `200` idêntico; ranking **não** incrementado duas vezes |
| TC-IDEM-007 | Finalização com chave nova | Já finalizada | `finish` com chave nova | `409 MATCH_ALREADY_FINISHED` com `winnerSide` e `finishedBy` |
| TC-IDEM-008 | Retry de evento de bola | — | 2× `POST /events` com mesma chave | Um único `MatchEvent`; `ballsPocketed = 1` |
| TC-IDEM-009 | Retry de convite | Convite já enviado | Mesma chave | Mesma resposta; **um** convite |
| TC-IDEM-010 | Reenvio de convite (chave nova) | Convite `PENDING` existe | Chave nova | `409 FRIEND_REQUEST_ALREADY_PENDING` com `existingRequestId` |
| TC-IDEM-011 | Chave escopada por usuário | Rodrigo usou a chave K | João usa a **mesma** chave K | `201` normal — chaves não colidem entre usuários |
| TC-IDEM-012 | Expiração de registro | Chave usada há 25 h | Mesma chave | Processada como nova requisição |
| TC-IDEM-013 | Handler de evento executado 2× | `MatchFinished` reentregue | Reprocessar | `UserStatistics` **não** duplicado (`stats_applied_matches`) |
| TC-IDEM-014 | Notificação reentregue | `LeagueInvitationSent` 2× | Reprocessar | **Uma** notificação (`dedupeKey`) |
| TC-IDEM-015 | Lembrete de jogatina em job repetido | Job roda 12× na hora | Cada execução | **Uma** notificação por membro (`dedupeKey` com `businessDate`) |
| TC-IDEM-016 | Ações naturalmente idempotentes | — | 2× `logout`, `read`, `DELETE friend` | `204`/`200` em ambas, sem erro |

---

## 17.7 Correção de resultado (`TC-CORR-*`)

| ID | Cenário | Pré-condição | Operação | Resultado esperado |
|---|---|---|---|---|
| TC-CORR-001 | Correção pelo participante | Partida 9 finalizada há 1 h, `winnerSide = 1` | `POST /corrections` com `winnerSide = 2` | `202`; `resultStatus = CORRECTED`; `MatchCorrection` criado; `AuditLog`; notificação aos 2 |
| TC-CORR-002 | Ranking reprocessado | Após TC-CORR-001 | `GET /leagues/{id}/ranking` | Rodrigo 6/5 (54,55 %), João 6/3 (66,67 %); posições recalculadas |
| TC-CORR-003 | Pódio reprocessado | Idem | `GET /play-sessions/{id}/ranking` | Rodrigo 3V/1D, João 3V/1D — empate; medalhas compartilhadas (`DP-027`) |
| TC-CORR-004 | Streak recalculado | Idem | `GET /me/statistics` | `currentWinStreak` recalculado do zero, **não** decrementado |
| TC-CORR-005 | H2H reprocessado | Idem | `GET /me/head-to-head/{joaoId}` | 4 × 4 (50,00 %) |
| TC-CORR-006 | Determinismo do rebuild | Liga com 27 partidas | Rebuild 2× | Resultado **byte a byte** idêntico |
| TC-CORR-007 | Rebuild não perde partidas | — | Comparar `Σ wins` com `COUNT` de `matches FINISHED` | Igualdade exata |
| TC-CORR-008 | Correção de correção | Já `CORRECTED` | Nova correção | `202`; **dois** `MatchCorrection` empilhados; histórico completo |
| TC-CORR-009 | Correção fora da janela | 25 h, participante | `POST /corrections` | `403 CORRECTION_WINDOW_EXPIRED` |
| TC-CORR-010 | Correção em partida não finalizada | `IN_PROGRESS` | `POST /corrections` | `409 MATCH_NOT_FINISHED` |
| TC-CORR-011 | Correção sem mudança | — | Mesmo `winnerSide` | `422 CORRECTION_NO_CHANGE` |
| TC-CORR-012 | Notificação de mudança de posição | Marcos não jogou mas caiu de posição | Após rebuild | Notificação `RANKING_CHANGED` para Marcos |
| TC-CORR-013 | Card já compartilhado não muda | Share criado antes da correção | `GET /public/shares/{token}` | Pódio **original** (snapshot congelado) |
| TC-CORR-014 | Cancelar partida finalizada | Admin, dentro de 24 h | `POST /cancel` | `200`; ranking reverte; `matchesCount` decrementa |
| TC-CORR-015 | Auditoria da correção | Após correção | `GET /matches/{id}/corrections` | `previousResult`, `newResult`, `reason`, `correctedBy`, `createdAt` |

---

## 17.8 Ranking e cálculos (`TC-RANK-*`)

| ID | Cenário | Pré-condição | Operação | Resultado esperado |
|---|---|---|---|---|
| TC-RANK-001 | `winRate` sem partidas | Membro novo | Calcular | `0.00`, `matchesPlayed = 0` |
| TC-RANK-002 | `winRate` exato | 7V/4D | Calcular | `63.64` (não `63.6` nem `64`) |
| TC-RANK-003 | Arredondamento na exibição | `55.56` | Half-up para inteiro | `56` |
| TC-RANK-004 | Precisão decimal | 1V/3D | Calcular | `25.00` — nunca `24.999999` |
| TC-RANK-005 | Ordem por `winRate` | Dataset canônico pós-noite | `GET /ranking` | Felipe(80) · Rodrigo(63,64) · João(55,56) · Marcos(40) · Anderson(30) |
| TC-RANK-006 | Desempate por `wins` | A 6/4 e B 3/2 (ambos 60 %) | Ordenar | A antes de B |
| TC-RANK-007 | Desempate por menos derrotas | A 3V/0D e B 3V/1D (pódio) | Ordenar | A antes de B |
| TC-RANK-008 | Desempate final determinístico | Empate total em todos os critérios | Ordenar 100× | **Mesma** ordem sempre (`userId ASC`) |
| TC-RANK-009 | Membro sem partidas aparece | Marcos 0/0 na jogatina | `GET /play-sessions/{id}/ranking` | Presente com `wins = 0` |
| TC-RANK-010 | Partida cancelada não conta | 1 partida `CANCELLED` | Todos os agregados | Ranking, pódio, stats e h2h inalterados |
| TC-RANK-011 | Partida em andamento não conta | 1 `IN_PROGRESS` | Idem | Inalterados |
| TC-RANK-012 | Pódio ordena por vitórias | A 4V/1D, B 1V/0D | `GET /session-ranking` | A em 1º (4 > 1), apesar de B ter 100 % |
| TC-RANK-013 | Medalhas compartilhadas | A 4V/1D e B 4V/1D | Idem | Ambos `position = 1, medal = GOLD`; próximo é `position = 3` |
| TC-RANK-014 | Streak global | Dataset canônico | `GET /me/statistics` | `currentWinStreak = 5` |
| TC-RANK-015 | Streak quebra na derrota | V,V,D,V | Calcular | `currentWinStreak = 1`, `longestWinStreak = 2` |
| TC-RANK-016 | `longestLossStreak` | D,D,V,D | Calcular | `longestLossStreak = 2` |
| TC-RANK-017 | Congelamento no encerramento | Liga `FINISHED` | `GET /ranking` | `frozen = true`, `frozenAt` preenchido |
| TC-RANK-018 | Ranking congelado não muda | Liga `FINISHED` | Nova leitura | Valores idênticos |
| TC-RANK-019 | Verificação de deriva | Materializado alterado manualmente | Rodar `ranking-drift-check` | Divergência detectada + métrica + rebuild |
| TC-RANK-020 | `Σ V = Σ D` | Liga completa com ex-membro | Somar | 27 = 27 = `matchesCount` |
| TC-RANK-021 | Ex-membro incluído | `includeInactive = true` | `GET /ranking` | Ricardo presente com `isActive = false` |
| TC-RANK-022 | Ex-membro excluído | `includeInactive = false` | Idem | 5 linhas, sem Ricardo |
| TC-RANK-023 | Série de 30 dias | Dataset canônico | `GET /timeseries?metric=WIN_RATE` | Taxa **acumulada** monotônica quando há sequência de vitórias |
| TC-RANK-024 | Série semanal | `metric=WINS_LOSSES&granularity=WEEK` | Consultar | 4 buckets ISO (segunda a domingo) com `label` "Sem 1..4" |
| TC-RANK-025 | Granularidade inválida | `period=LAST_7_DAYS&granularity=MONTH` | Consultar | `422 INVALID_GRANULARITY_FOR_PERIOD` |

### `businessDate` (`TC-SESS-*`) — testes unitários puros

| ID | Cenário | Entrada | Resultado esperado |
|---|---|---|---|
| TC-SESS-001 | Antes da meia-noite | `2026-07-15T01:08:22Z`, liga 20:00–00:00 `America/Sao_Paulo` | `2026-07-14` |
| TC-SESS-002 | Depois da meia-noite, janela cruza | `2026-07-15T02:30:00Z`, liga 20:00–04:00 | `2026-07-14` |
| TC-SESS-003 | Depois do fim da janela | `2026-07-15T09:00:00Z`, liga 20:00–00:00 | `2026-07-15` |
| TC-SESS-004 | Janela que não cruza | `2026-07-14T18:00:00Z`, liga 10:00–18:00 | `2026-07-14` |
| TC-SESS-005 | Fuso diferente | Liga em `America/Manaus` (UTC-4) | Data calculada em -4, não -3 |
| TC-SESS-006 | Horário de verão (histórico) | Data em que o Brasil tinha DST | Conversão correta via IANA, **não** offset fixo |
| TC-SESS-007 | Exatamente na virada | `2026-07-15T03:00:00Z` = 00:00 local, liga até 00:00 | `2026-07-14` (limite inclusivo no corte) |
| TC-SESS-008 | Sem uso de `CURRENT_DATE` | Análise estática | Nenhuma ocorrência de `CURRENT_DATE`/`DateTime.Today` em código de domínio |

---

## 17.9 Convites e tokens (`TC-INV-*`, `TC-TOK-*`)

| ID | Cenário | Pré-condição | Operação | Resultado esperado |
|---|---|---|---|---|
| TC-INV-001 | Convite expirado | `expiresAt` no passado | `accept` | `410 INVITATION_EXPIRED` com `expiredAt` |
| TC-INV-002 | Reenvio renova validade | Convite `PENDING` há 5 dias | `POST /invitations` novamente | `expiresAt` renovado; **um** convite |
| TC-INV-003 | Convite para membro | João já é membro | `POST /invitations` | Item `ALREADY_MEMBER` no `207` |
| TC-INV-004 | Lote com resultados mistos | 1 novo, 1 membro, 1 já convidado | `POST /invitations` | `207` com `summary: {invited:1, alreadyMember:1, alreadyInvited:1}` |
| TC-INV-005 | Convite único → 201 | 1 destinatário válido | Idem | `201` (não `207`) |
| TC-INV-006 | Convite em liga encerrada | Liga `FINISHED` | `POST /invitations` | `409 LEAGUE_FINISHED` |
| TC-INV-007 | Encerrar liga expira convites | 2 convites `PENDING` | `POST /leagues/{id}/finish` | Ambos `EXPIRED`; `invitationsExpired: 2` |
| TC-INV-008 | Código expirado | `expiresAt` passado | `join-by-code` | `410 INVITE_CODE_EXPIRED` |
| TC-INV-009 | Código revogado | Novo código gerado | Código antigo | `410 INVITE_CODE_REVOKED` com `revokedAt` |
| TC-INV-010 | Código esgotado | `maxUses = 1`, já usado | `join-by-code` | `410 INVITE_CODE_EXHAUSTED` |
| TC-INV-011 | Código inexistente | — | `code = "XXXX-0000"` | `404 INVITE_CODE_NOT_FOUND` |
| TC-INV-012 | Código case-insensitive | `TERCA-7K9M` existe | `code = "terca-7k9m"` | `201` — normalizado |
| TC-INV-013 | Preview sem entrar | Código válido | `GET /invite-codes/{code}` | `200` com dados da liga; **nenhum** membro criado |
| TC-INV-014 | Alfabeto sem ambíguos | Gerar 1000 códigos | Analisar | Nenhum `0`, `O`, `1`, `I` |
| TC-TOK-001 | Reset expirado | Token de 31 min | `password/reset` | `410 RESET_TOKEN_EXPIRED` |
| TC-TOK-002 | Reset reutilizado | Token já usado | Idem | `401 RESET_TOKEN_INVALID` |
| TC-TOK-003 | Reset revoga sessões | 3 sessões ativas | `password/reset` | `sessionsRevoked: 3`; todas inválidas |
| TC-TOK-004 | Verificação expirada | Token de 25 h | `email/verify` | `410 VERIFICATION_TOKEN_EXPIRED` |
| TC-TOK-005 | Verificação repetida | Já verificado | Idem | `409 EMAIL_ALREADY_VERIFIED` |
| TC-TOK-006 | Refresh após 30 dias | `expiresAt` passado | `auth/refresh` | `401 INVALID_REFRESH_TOKEN` |
| TC-TOK-007 | Reuso de refresh | Token já rotacionado | `auth/refresh` | `401 REFRESH_TOKEN_REUSE_DETECTED`; **toda** a família revogada |
| TC-TOK-008 | Troca de senha revoga outras | 3 sessões | `password/change` com `keepCurrentSession=true` | `sessionsRevoked: 2`; a atual continua |
| TC-TOK-009 | Rotação de chave JWT | Dois `kid` válidos | Token assinado com o antigo | Validado durante a sobreposição de 24 h |
| TC-TOK-010 | Bloqueio por força bruta | 10 falhas em 15 min | 11ª tentativa (senha **correta**) | `401 INVALID_CREDENTIALS` — não revela o bloqueio |

---

## 17.10 Notificações (`TC-NOTIF-*`)

| ID | Cenário | Pré-condição | Operação | Resultado esperado |
|---|---|---|---|---|
| TC-NOTIF-001 | Convite gera notificação | — | `POST /friend-requests` | Notificação `FRIEND_REQUEST_RECEIVED` com `friendRequestId` no payload e 2 ações |
| TC-NOTIF-002 | Recusa não notifica | Convite pendente | `decline` | **Nenhuma** notificação ao remetente |
| TC-NOTIF-003 | Aceite notifica | Idem | `accept` | Notificação `FRIEND_REQUEST_ACCEPTED` ao remetente |
| TC-NOTIF-004 | Ação própria não notifica | Rodrigo finaliza sua partida | `finish` | Notificação **só** para João |
| TC-NOTIF-005 | Agrupamento por categoria | 3 notificações de tipos diferentes | `GET ?groupBy=category` | 3 grupos com `label` em pt-BR |
| TC-NOTIF-006 | Contador de não lidas | 3 não lidas | `GET /unread-count` | `total = 3` e `byCategory` correto |
| TC-NOTIF-007 | Marcar lida atualiza contador | 3 não lidas | `POST /{id}/read` | `unreadCount = 2` |
| TC-NOTIF-008 | Marcar todas | 3 não lidas | `POST /read {all:true}` | `markedCount = 3`, `unreadCount = 0` |
| TC-NOTIF-009 | Limpar histórico preserva pendentes | 2 lidas + 1 convite pendente | `DELETE ?scope=READ` | `deletedCount = 2`, `keptCount = 1`, `keptReason = PENDING_ACTION` |
| TC-NOTIF-010 | Excluir pendente sem force | Convite pendente | `DELETE /{id}` | `409 NOTIFICATION_HAS_PENDING_ACTION` |
| TC-NOTIF-011 | Ação resolve notificação | Convite pendente | `accept` | `resolvedAt` preenchido; `actions` vazio |
| TC-NOTIF-012 | Convite cancelado apaga notificação | Convite pendente | Remetente cancela | Notificação com `deletedAt` |
| TC-NOTIF-013 | Lembrete T-1h | `nextSessionAt` em 60 min | Job `session-reminders` | 1 notificação por membro ativo com preferência ligada |
| TC-NOTIF-014 | Lembrete não duplica | Job roda 12× na hora | Idem | **1** notificação por membro (`dedupeKey`) |
| TC-NOTIF-015 | Lembrete expira | Jogatina começou | Consultar | `expiresAt` no passado; some da lista |
| TC-NOTIF-016 | Preferência desliga notificação | `SESSION_ALERTS.inAppEnabled = false` | Job de lembrete | Nenhuma notificação para esse usuário |
| TC-NOTIF-017 | `SYSTEM` não desligável | — | `PUT /preferences` com `SYSTEM` | `422 CANNOT_DISABLE_SYSTEM_CATEGORY` |
| TC-NOTIF-018 | Deduplicação por reprocessamento | Evento reentregue | Reprocessar | **1** notificação |
| TC-NOTIF-019 | Notificação de correção | Correção aplicada | — | Notificação `MATCH_RESULT_CORRECTED` para **todos** os participantes |
| TC-NOTIF-020 | Notificação de mudança de posição | Marcos cai de posição sem jogar | Rebuild | Notificação `RANKING_CHANGED` |

---

## 17.11 Localização (`TC-GEO-*`)

| ID | Cenário | Pré-condição | Operação | Resultado esperado |
|---|---|---|---|---|
| TC-GEO-001 | Busca por raio | 3 locais no seed | `?lat=-23.5583&lng=-46.6604&radiusKm=5` | 2 locais (2,4 e 3,8 km); Pinheiros (5,1) **fora** |
| TC-GEO-002 | Raio ampliado | Idem | `radiusKm=6` | 3 locais |
| TC-GEO-003 | Distância correta | Bar do Zé | Calcular | `2.4` km (±0,1) |
| TC-GEO-004 | Ordenação por distância | 3 locais | `sort=distance` | 2.4 · 3.8 · 5.1 |
| TC-GEO-005 | Sem coordenadas, sem distância | — | `?q=bar` | Itens **sem** `distanceKm` |
| TC-GEO-006 | Coordenadas não persistidas | Requisição com `lat`/`lng` | Inspecionar banco e logs | **Nenhuma** ocorrência das coordenadas do usuário |
| TC-GEO-007 | `openNow` no fuso do local | Local 20h–04h, agora 02:00 local | `?openNow=true` | Local presente (janela cruza a meia-noite) |
| TC-GEO-008 | Ligas do local filtradas | 1 pública + 1 privada; solicitante não é membro | `GET /venues/{id}/leagues` | **Apenas** a pública; `totalItems = 1` |
| TC-GEO-009 | Ligas do local para membro | Solicitante é membro da privada | Idem | Ambas |
| TC-GEO-010 | Atrelar liga ao local | Ator é `OWNER` | `PATCH /leagues/{id}` com `venueId` | `200`; `leaguesCount` do local incrementado |
| TC-GEO-011 | Desatrelar | — | `venueId: null` | `200`; `venue = null` |
| TC-GEO-012 | Jogatina passada mantém local | Liga muda de local | Consultar jogatina antiga | `venue` original preservado |

---

## 17.12 Testes de contrato

| ID | Cenário | Resultado esperado |
|---|---|---|
| TC-CTR-001 | Toda resposta valida contra a OpenAPI | Nenhum campo extra, nenhum obrigatório ausente, tipos corretos |
| TC-CTR-002 | Todo erro valida contra o schema Problem Details | `type`, `title`, `status`, `code`, `detail`, `instance`, `traceId`, `timestamp`, `retryable` presentes |
| TC-CTR-003 | Todo `code` de erro existe no enum `ErrorCode` | Nenhuma string literal de erro no código |
| TC-CTR-004 | Todo `ErrorCode` tem `title`, `type` e status mapeados | Teste sobre o enum completo |
| TC-CTR-005 | Datas em ISO 8601 UTC com `Z` | Regex em todas as respostas |
| TC-CTR-006 | Propriedades em `camelCase` | Nenhum `snake_case` vazando |
| TC-CTR-007 | Enums em `SCREAMING_SNAKE_CASE` | — |
| TC-CTR-008 | Coleções sempre com `items` + `meta` | Nunca array na raiz |
| TC-CTR-009 | Percentuais como número 0–100 com 2 casas | Nunca fração nem string |
| TC-CTR-010 | Dinheiro com `amount` + `currency` | Nunca `"R$ 30,00"` |
| TC-CTR-011 | Compatibilidade retroativa | Diff da OpenAPI vs. `main` não contém mudança quebrável (falha o PR) |
| TC-CTR-012 | OpenAPI válida | `openapi.yaml` passa em validador 3.1 e no Swagger Editor |

---

## 17.13 Testes end-to-end

| ID | Jornada | Passos | Critério de aceite |
|---|---|---|---|
| TC-E2E-001 | **Do zero à primeira partida** | Cadastro → verificação → criar liga → gerar código → 2º usuário entra → abrir jogatina → partida → finalizar → pódio | Todos os passos `2xx`; pódio correto |
| TC-E2E-002 | **A noite canônica completa** | Reproduzir as 9 partidas do README §0.6 | Ranking e pódio exatamente como o dataset; Home = 47/62 %/5 |
| TC-E2E-003 | **Correção e reprocessamento** | Finalizar → compartilhar → corrigir → verificar ranking, stats, h2h e link público | Ranking novo; link público com pódio **antigo** |
| TC-E2E-004 | **Rede instável** | Repetir cada POST 3× com a mesma chave | Zero duplicatas em partidas, eventos e convites |
| TC-E2E-005 | **Dois dispositivos** | Sessões simultâneas registrando a mesma partida | Um vence; o outro recebe `409` com `currentState` e reconcilia |
| TC-E2E-006 | **Ciclo de vida da liga** | Criar → convidar → jogar 3 noites → encerrar → verificar ranking congelado | Ranking final imutável; convites expirados |
| TC-E2E-007 | **Sair e voltar à liga** | Membro sai → ranking preservado → volta | `RankingEntry` e estatísticas intactas |
| TC-E2E-008 | **Sessão expirando durante a partida** | Access token expira no meio | Refresh silencioso + retry; nenhuma ação perdida |
| TC-E2E-009 | **Retomar partida abandonada** | Fechar o app com partida `IN_PROGRESS` → reabrir | `GET /me/active-match` devolve a partida com `tableState` correto |
| TC-E2E-010 | **Fluxo de amizade e h2h** | Convite → aceite → jogar 4 noites → consultar h2h com filtros | Agregados e lista por jogatina corretos |
| TC-E2E-011 | **Fluxo LGPD completo** | Exportar dados → verificar pseudonimização → excluir conta → aguardar job → verificar anonimização | Export sem PII de terceiros; histórico preservado; PII do titular removida |
| TC-E2E-012 | **Locais e associação** | Buscar por proximidade → abrir local → atrelar liga → verificar "ligas que jogam aqui" | Liga aparece; distância correta |
| TC-E2E-013 | **Lembrete de jogatina** | Liga com `nextSessionAt` em 1 h → executar job | Notificação para todos os membros, uma vez |
| TC-E2E-014 | **Encerramento automático de jogatina** | Jogatina aberta há 5 h após `endTime` → job | `CLOSED` com `closedReason = AUTO_TIMEOUT` |
| TC-E2E-015 | **Force update** | `minSupportedVersion` acima da versão do app | `GET /app/bootstrap` → `forceUpdate: true` |

---

## 17.14 Testes de carga (k6)

| ID | Cenário | Perfil | Critério de aceite |
|---|---|---|---|
| TC-LOAD-001 | Pico de 22h | 120 RPS por 30 min, mix 4:1 leitura/escrita | p95 dentro dos alvos de §16.3; erro < 0,1 % |
| TC-LOAD-002 | Rajada de eventos de bola | 300 jogatinas simultâneas, 8 eventos em 20 s cada | p95 de `POST /events` < 150 ms; zero duplicata |
| TC-LOAD-003 | Finalizações simultâneas | 100 `finish` no mesmo segundo, ligas distintas | p95 < 400 ms; zero deadlock |
| TC-LOAD-004 | Finalizações na mesma liga | 20 `finish` na mesma liga (jogadores distintos) | Serializadas sem erro; ranking final correto |
| TC-LOAD-005 | Rebuild de liga grande | Liga com 5 000 partidas | Rebuild < 10 s; ranking correto |
| TC-LOAD-006 | Ranking sob leitura intensa | 500 RPS em `GET /ranking` | p95 < 250 ms com cache |
| TC-LOAD-007 | Throughput do outbox | 10 000 eventos na fila | Drenados em < 5 min; zero perda |
| TC-LOAD-008 | Busca de locais | 200 RPS com coordenadas variadas | p95 < 300 ms; índice GIST usado (`EXPLAIN`) |

---

## 17.15 Testes de arquitetura e qualidade

| ID | Regra | Verificação |
|---|---|---|
| TC-ARCH-001 | `Encacapei.Domain` sem referência a EF Core, ASP.NET ou Azure SDK | NetArchTest — **falha o build** |
| TC-ARCH-002 | `Domain` não referencia `Infrastructure` | NetArchTest |
| TC-ARCH-003 | Casos de uso não dependem de `DbContext` concreto | NetArchTest |
| TC-ARCH-004 | Nenhum `CURRENT_DATE`/`DateTime.Now`/`DateTime.Today` em `Domain` ou `Application` | Análise estática — usar `IClock` |
| TC-ARCH-005 | Nenhuma consulta por ID em contexto de liga sem `requesterId` | Revisão + teste de assinatura de repositório |
| TC-ARCH-006 | Nenhum SQL concatenado | Análise estática |
| TC-ARCH-007 | Nenhum `float`/`double` em campo de percentual ou dinheiro | Análise estática |
| TC-ARCH-008 | Zero N+1 nas listagens | Contador de queries por teste de integração |
| TC-ARCH-009 | Cobertura de `Domain` ≥ 80 % e 100 % em ranking/`businessDate`/estados | Coverlet + quality gate |
| TC-ARCH-010 | Toda rota com path param tem teste de autorização | Teste meta que enumera as rotas registradas |
| TC-ARCH-011 | Migrações EF Core excluídas da análise de qualidade | Configuração do SonarCloud (padrão da organização) |
| TC-ARCH-012 | Nenhum contador incrementado em handler de evento | Revisão + regra de análise |

---

## 17.16 Ambiente de testes

| Item | Definição |
|---|---|
| Banco | PostgreSQL 16 via **Testcontainers** (mesma versão de produção, com PostGIS, `citext`, `pg_trgm`) |
| Reset entre testes | **Respawn** (truncate seletivo) — mais rápido e mais fiel que transação com rollback |
| Seed | Dataset canônico do README §0.6, materializado num único `SeedBuilder` reutilizável |
| Relógio | `IClock` injetável — o instante de referência dos testes é `2026-07-27T18:30:00Z`; a jogatina canônica usa `2026-07-14T23:00:00Z` |
| Aleatoriedade | `IGuidGenerator` e `IRandom` injetáveis — UUIDs determinísticos nos testes |
| E-mail | `FakeEmailSender` que registra em memória; asserções sobre template e destinatário |
| Blob | Azurite |
| Redis | Testcontainers |
| Outbox | Worker executado **sincronamente** nos testes (`ProcessOutboxNow()`) para tornar os efeitos assíncronos determinísticos |
| Push | `FakePushSender` |
| Paralelismo | Testes de integração isolados por banco/schema, permitindo execução paralela |

**Definition of Done por endpoint `[R]`:** implementado + teste de fluxo felizes + testes de validação de cada campo + teste de autorização + teste de idempotência (se POST mutante) + teste de concorrência (se versionado) + teste de contrato + documentado na OpenAPI. Sem os oito, o endpoint não é considerado pronto.
