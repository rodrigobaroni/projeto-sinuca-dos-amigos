# 10. Catálogo de erros

## 10.1 Estrutura padrão — RFC 9457 (Problem Details)

`Content-Type: application/problem+json`

```json
{
  "type": "https://api.encacapei.com.br/problems/league-not-found",
  "title": "Liga não encontrada",
  "status": 404,
  "code": "LEAGUE_NOT_FOUND",
  "detail": "A liga informada não existe ou não está disponível para este usuário.",
  "instance": "/api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000009",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-28T14:02:10Z",
  "retryable": false,
  "errors": []
}
```

### Campos

| Campo | Sempre | Tipo | Descrição |
|---|:--:|---|---|
| `type` | ✔ | uri | URI documentada e **estável** do tipo de problema. Padrão: `https://api.encacapei.com.br/problems/{code-em-kebab-case}` |
| `title` | ✔ | string | Título curto em `pt-BR`. Não varia entre instâncias do mesmo `code` |
| `status` | ✔ | integer | Espelha o status HTTP |
| `code` | ✔ | string | **Contrato de programação.** `SCREAMING_SNAKE_CASE`. O cliente ramifica por aqui, **nunca** por `title`/`detail` |
| `detail` | ✔ | string | Mensagem apresentável ao usuário final; pode variar por instância |
| `instance` | ✔ | string | Path da requisição que falhou |
| `traceId` | ✔ | string | 32 hex do W3C Trace Context. Exibível na tela de erro para suporte |
| `timestamp` | ✔ | date-time | ISO 8601 UTC |
| `retryable` | ✔ | boolean | `true` quando repetir a requisição **idêntica** pode dar certo |
| `errors[]` | em `422` | array | Erros por campo: `{ field, code, message }` |
| extensões | conforme | — | Campos adicionais específicos do erro (ex.: `currentVersion`, `conflictingMatchId`) |

### Diferença entre `title` e `detail` `[R]`

| | Exemplo |
|---|---|
| `title` | "Bola já encaçapada" — fixo por `code`, serve para agrupar em dashboards |
| `detail` | "A bola 2 já está fora da mesa nesta partida." — variável, é o que o app mostra |

### Regras de ouro `[R]`

1. **Nunca** vazar stack trace, SQL, nome de tabela, caminho de arquivo ou versão de framework.
2. **Nunca** revelar existência de recurso privado — usar `404`, não `403` (§3.4).
3. Toda resposta de erro carrega `X-Trace-Id` também no **header** (o app pode logar sem parsear o corpo).
4. `422` sempre acumula **todos** os erros de campo; não para no primeiro.
5. Erros de `5xx` têm `detail` genérico (`"Ocorreu um erro inesperado. Tente novamente."`) e o diagnóstico fica no log correlacionado por `traceId`.

---

## 10.2 Catálogo completo

### Autenticação (`401`, `403`)

| Código | HTTP | Significado | Quando ocorre | Ação esperada do cliente |
|---|---:|---|---|---|
| `UNAUTHENTICATED` | 401 | Sem credencial válida | Header `Authorization` ausente ou malformado | Ir para a tela de login |
| `TOKEN_EXPIRED` | 401 | Access token vencido | `exp` no passado | Chamar `POST /auth/refresh` **uma vez** e repetir a requisição |
| `TOKEN_INVALID` | 401 | Assinatura, `aud`, `iss` ou formato inválidos | Token adulterado ou de outro ambiente | Logout imediato |
| `TOKEN_REVOKED` | 401 | `jti` na denylist | Logout, troca de senha ou revogação administrativa | Logout imediato |
| `INVALID_CREDENTIALS` | 401 | E-mail/senha incorretos **ou** conta bloqueada | Login falho (mensagem única, anti-enumeração — RN-AUTH-015) | Exibir "E-mail ou senha inválidos" |
| `INVALID_CURRENT_PASSWORD` | 401 | Senha atual não confere | `password/change`, `deactivate`, `DELETE /me` | Destacar o campo de senha atual |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh inexistente, expirado ou revogado | `auth/refresh` | Logout e login |
| `REFRESH_TOKEN_REUSE_DETECTED` | 401 | Token já rotacionado foi reapresentado | Possível roubo — **toda a família foi revogada** (RN-AUTH-014) | Logout imediato + alerta de segurança ao usuário |
| `RESET_TOKEN_INVALID` | 401 | Token de reset inexistente ou já usado | `password/reset` | Pedir novo link |
| `VERIFICATION_TOKEN_INVALID` | 401 | Token de verificação inválido/usado | `email/verify` | Reenviar verificação |
| `ACCOUNT_DELETED` | 403 | Conta anonimizada | Login em conta eliminada | Oferecer novo cadastro |
| `EMAIL_NOT_VERIFIED` | 403 | Ação exige e-mail verificado | Criar liga, convidar, compartilhar após 7 dias (RN-AUTH-008) | Levar à tela de verificação |
| `RESET_TOKEN_EXPIRED` | 410 | Token de reset venceu (30 min) | `password/reset` | Solicitar novo link |
| `VERIFICATION_TOKEN_EXPIRED` | 410 | Token de verificação venceu (24 h) | `email/verify` | Reenviar |

### Autorização (`403`, `404`)

| Código | HTTP | Significado | Quando ocorre | Ação esperada do cliente |
|---|---:|---|---|---|
| `FORBIDDEN` | 403 | Sem permissão (genérico) | Fallback | Esconder a ação |
| `INSUFFICIENT_LEAGUE_ROLE` | 403 | Papel na liga insuficiente | `PLAYER` tentando editar/encerrar/convidar | Ocultar o botão; o servidor já envia `permissions` no recurso |
| `NOT_LEAGUE_MEMBER` | 403 | Não é membro ativo | Iniciar partida, ver ranking de liga pública em detalhe | Oferecer "entrar na liga" |
| `NOT_MATCH_PARTICIPANT` | 403 | Não joga essa partida | Registrar evento, finalizar, cancelar | Modo somente leitura |
| `NOT_SESSION_PARTICIPANT` | 403 | Não jogou nessa jogatina | Gerar card de compartilhamento | Esconder botão de compartilhar |
| `NOT_SHARE_OWNER` | 403 | Não criou o artefato | Revogar compartilhamento alheio | — |
| `PROFILE_PRIVATE` | 403 | Perfil privado | Stats de terceiro com `profileVisibility = PRIVATE` | Exibir só nome e avatar |
| `PROFILE_FRIENDS_ONLY` | 403 | Só amigos veem | Idem, `FRIENDS_ONLY` sem amizade nem liga em comum | Oferecer "adicionar amigo" |
| `HEAD_TO_HEAD_NOT_ALLOWED` | 403 | Sem vínculo suficiente | H2H com quem nunca jogou nem é amigo | Esconder a ação |
| `USER_BLOCKED` | 403 | Bloqueio ativo | Convite para quem bloqueou (mensagem genérica) | Silenciar; não revelar o bloqueio |
| `CORRECTION_WINDOW_EXPIRED` | 403 | Janela de correção vencida | Correção após 24 h por não-admin (RN-MATCH-015) | Instruir a acionar o admin da liga; extensão `deadline` |
| `REOPEN_WINDOW_EXPIRED` | 403 | Janela de reabertura vencida | Reabrir jogatina após 12 h | — |
| `LEAGUE_IS_PRIVATE` | 403 | Liga privada | `POST /leagues/{id}/join` em liga privada | Pedir convite ou código |
| `SHARE_CONSENT_REQUIRED` | 403 | Falta consentimento | `visibilityLevel = FULL` sem opt-in de todos | Usar `MINIMAL`; extensão `missingConsentUserIds[]` |

### Recurso inexistente (`404`)

| Código | HTTP | Significado | Quando ocorre | Ação esperada do cliente |
|---|---:|---|---|---|
| `USER_NOT_FOUND` | 404 | Usuário inexistente, anonimizado ou não buscável | Busca, perfil, convite | Remover da lista |
| `LEAGUE_NOT_FOUND` | 404 | Liga inexistente **ou privada sem vínculo** | Qualquer rota `/leagues/{id}` | Voltar à lista de ligas |
| `LEAGUE_MEMBER_NOT_FOUND` | 404 | Membro inexistente na liga | Alterar papel, remover, sair | Recarregar membros |
| `PLAY_SESSION_NOT_FOUND` | 404 | Jogatina inexistente ou sem acesso | Rotas `/play-sessions/{id}` | Voltar à liga |
| `MATCH_NOT_FOUND` | 404 | Partida inexistente ou sem acesso | Rotas `/matches/{id}` | Voltar à jogatina |
| `MATCH_EVENT_NOT_FOUND` | 404 | Evento inexistente ou de outra partida | Desfazer evento | Recarregar `tableState` |
| `VENUE_NOT_FOUND` | 404 | Local inexistente ou inativo | Detalhe, `venueId` em liga | Recarregar busca |
| `FRIEND_REQUEST_NOT_FOUND` | 404 | Convite inexistente **ou o solicitante não é parte** | Aceitar/recusar/cancelar | Recarregar convites |
| `FRIENDSHIP_NOT_FOUND` | 404 | Não são amigos | Remover amigo | Recarregar lista |
| `INVITATION_NOT_FOUND` | 404 | Convite de liga inexistente ou de outra pessoa | Aceitar/recusar | Recarregar convites |
| `INVITE_CODE_NOT_FOUND` | 404 | Código inexistente | Preview, entrar por código | Pedir o código correto |
| `NOTIFICATION_NOT_FOUND` | 404 | Notificação inexistente ou de outro usuário | Marcar lida, excluir | Recarregar caixa |
| `SHARE_ARTIFACT_NOT_FOUND` | 404 | Artefato inexistente | Status, revogar | — |
| `SHARE_NOT_FOUND` | 404 | Token público inexistente | Link público | Página "link inválido" |
| `UPLOAD_TOKEN_NOT_FOUND` | 404 | Token de upload inválido/expirado | Confirmar avatar | Repetir o upload |
| `RANKING_REBUILD_NOT_FOUND` | 404 | Job inexistente | Status de reprocessamento | — |
| `EXPORT_NOT_FOUND` | 404 | Exportação inexistente | Status LGPD | — |

### Validação (`422`)

Sempre com `errors[]`. `code` do envelope é `VALIDATION_ERROR`; os códigos abaixo aparecem em `errors[].code`.

| Código | Campo típico | Significado |
|---|---|---|
| `REQUIRED` | qualquer | Campo obrigatório ausente |
| `TOO_SHORT` / `TOO_LONG` | strings | Fora do intervalo de tamanho |
| `OUT_OF_RANGE` | números/datas | Fora dos limites |
| `INVALID_FORMAT` | qualquer | Formato inválido |
| `INVALID_ENUM_VALUE` | enums | Valor não pertence ao enum — extensão `allowedValues[]` |
| `EMAIL_INVALID` | `email` | Formato de e-mail |
| `USERNAME_INVALID_FORMAT` | `username` | Fora de `^[a-z0-9_.]{3,20}$` |
| `USERNAME_TAKEN` | `username` | Já em uso |
| `USERNAME_RESERVED` | `username` | Reservado pela plataforma |
| `PASSWORD_TOO_SHORT` | `password` | < 8 caracteres (`[C]`) |
| `PASSWORD_MISSING_UPPERCASE` | `password` | Sem maiúscula (`[C]`) |
| `PASSWORD_MISSING_LOWERCASE` | `password` | Sem minúscula (`[C]`) |
| `PASSWORD_MISSING_DIGIT` | `password` | Sem número (`[C]`) |
| `PASSWORD_MISSING_SPECIAL` | `password` | Sem caractere especial (`[C]`) |
| `PASSWORD_SAME_AS_CURRENT` | `newPassword` | Igual à atual |
| `PASSWORD_REUSED` | `newPassword` | Entre as 3 últimas (RN-AUTH-003) |
| `TERMS_VERSION_OUTDATED` | `acceptedTermsVersion` | Versão desatualizada |
| `INVALID_CONFIRMATION` | `confirmation` | Texto de confirmação divergente |
| `INVALID_TIMEZONE` | `timezone` | Fuso IANA inválido |
| `INVALID_TIME_FORMAT` | `startTime`/`endTime` | Fora de `HH:mm` |
| `INVALID_WEEKDAY` / `DUPLICATE_WEEKDAY` | `schedule.weekdays` | Valor inválido ou repetido |
| `START_DATE_IN_PAST` | `startsAt` | Data anterior ao permitido |
| `VENUE_CONFLICT` | `venueId`/`venueLabel` | Ambos informados |
| `INVALID_BALLS_COUNT` | `rules.ballsCount` | Diferente de 8 ou 15 |
| `INVALID_PARTICIPANT_COUNT` | `participants` | ≠2 em 1v1 — extensão `expected`/`received` |
| `INVALID_SIDE_DISTRIBUTION` | `participants[].side` | Distribuição inválida entre lados |
| `DUPLICATE_PARTICIPANT` | `participants` | Mesmo usuário repetido (RN-MATCH-003) |
| `PARTICIPANT_NOT_LEAGUE_MEMBER` | `participants[].userId` | Não é membro ativo — extensão `userId` |
| `INVALID_BALL_NUMBER` | `ballNumber` | Fora de 1..`ballsCount` |
| `BALL_NUMBER_NOT_ALLOWED` | `ballNumber` | Enviado em evento `FOUL` |
| `ACTOR_NOT_PARTICIPANT` | `actorUserId` | Não joga a partida |
| `INVALID_WINNER_SIDE` | `winnerSide` | Lado inexistente |
| `WINNER_NOT_PARTICIPANT` | `winnerUserId` | Fora da partida |
| `AMBIGUOUS_WINNER` | `winnerSide`/`winnerUserId` | Ambos enviados e divergentes |
| `FINISHED_AT_BEFORE_START` | `finishedAt` | Antes de `startedAt` |
| `STARTED_AT_OUT_OF_RANGE` | `startedAt` | Fora de `now-6h … now+5min` |
| `OCCURRED_AT_OUT_OF_RANGE` | `occurredAt` | Fora da janela da partida |
| `BUSINESS_DATE_OUT_OF_RANGE` | `businessDate` | Fora de ±7 dias |
| `CORRECTION_NO_CHANGE` | `winnerSide` | Correção sem mudança (RN-MATCH-018) |
| `CANCEL_NOTE_REQUIRED` | `note` | `reason = OTHER` sem nota |
| `CANNOT_FRIEND_SELF` | `userId` | Convite para si mesmo |
| `CANNOT_COMPARE_WITH_SELF` | `userId` | H2H consigo mesmo |
| `CANNOT_BLOCK_SELF` | `userId` | Bloquear a si mesmo |
| `TOO_MANY_INVITES` | `userIds` | > 50 por chamada |
| `TOO_MANY_PARTICIPANTS` | `userIds` | > 20 por jogatina |
| `TOO_MANY_IDS` | `notificationIds` | > 200 |
| `SEARCH_QUERY_TOO_SHORT` | `q` | < 2 caracteres |
| `INVALID_SORT_FIELD` | `sort` | Campo fora da lista permitida — extensão `allowedFields[]` |
| `INVALID_FILTER_VALUE` | filtros | Valor inválido |
| `CONFLICTING_FILTERS` | `period` + `from`/`to` | Filtros mutuamente exclusivos |
| `AMBIGUOUS_SELECTION` | seleção múltipla | Mais de uma forma de seleção enviada |
| `INVALID_METRIC` | `metric` | Métrica desconhecida |
| `INVALID_GRANULARITY_FOR_PERIOD` | `granularity` | Combinação inválida com `period` |
| `INVALID_COORDINATES` | `lat`/`lng` | Fora dos limites |
| `RADIUS_OUT_OF_RANGE` | `radiusKm` | > 50 km |
| `LOCATION_OR_QUERY_REQUIRED` | — | Nenhum critério de busca de local |
| `INVALID_IMAGE` | arquivo | Magic bytes divergentes, corrompida ou < 64×64 |
| `INVALID_PUSH_TOKEN` | `pushToken` | Formato inválido |
| `CANNOT_DISABLE_SYSTEM_CATEGORY` | `category` | Tentativa de desligar `SYSTEM` |
| `INVALID_QUIET_HOURS` | `quietHours` | Só um dos horários informado |
| `EXPIRES_IN_OUT_OF_RANGE` | `expiresInDays` | Fora de 1–90 |
| `INVALID_ROLE` | `role` | Papel desconhecido |

### Conflito de estado (`409`)

| Código | HTTP | Significado | Quando ocorre | Ação esperada do cliente |
|---|---:|---|---|---|
| `CONCURRENT_MODIFICATION` | 409 | Versão divergente | `If-Match` ≠ `version` | Reconciliar com `currentState` do corpo; **não** repetir cegamente |
| `ALREADY_FRIENDS` | 409 | Já são amigos | Enviar convite | Atualizar o card para "Amigos" |
| `FRIEND_REQUEST_ALREADY_PENDING` | 409 | Convite pendente já existe | Reenviar | Mostrar "Pendente"; extensão `existingRequestId` |
| `FRIEND_REQUEST_NOT_PENDING` | 409 | Já respondido | Aceitar/recusar/cancelar | Se `currentStatus = ACCEPTED`, tratar como sucesso |
| `ALREADY_BLOCKED` | 409 | Bloqueio já existe | Bloquear | — |
| `ALREADY_MEMBER` | 409 | Já é membro da liga | Convidar, entrar, aceitar convite | Navegar para a liga (é sucesso na prática) |
| `INVITATION_NOT_PENDING` | 409 | Convite de liga já respondido/revogado | Aceitar/recusar | Recarregar; extensão `currentStatus` |
| `LEAGUE_FINISHED` | 409 | Liga encerrada | Criar partida/jogatina, convidar, editar, entrar | Modo somente leitura |
| `LEAGUE_ALREADY_FINISHED` | 409 | Encerramento repetido | `POST /finish` | Tratar como sucesso |
| `LEAGUE_HAS_ACTIVE_SESSION` | 409 | Jogatina aberta | Encerrar liga com `force = false` | Oferecer "encerrar mesmo assim" |
| `LEAGUE_HAS_HISTORY` | 409 | Liga com partidas finalizadas | `DELETE /leagues/{id}` | Oferecer "encerrar" em vez de excluir |
| `LEAGUE_RULES_LOCKED` | 409 | Regras congeladas | Editar `gameMode`/toggles após 1ª partida | Desabilitar campos; extensão `lockedFields[]` |
| `OWNER_MUST_TRANSFER` | 409 | Dono precisa transferir antes de sair | `POST /leave` | Abrir seletor com `eligibleSuccessors[]` |
| `CANNOT_REMOVE_OWNER` | 409 | Dono não pode ser removido | Remover membro | Esconder ação |
| `CANNOT_DEMOTE_SELF_AS_OWNER` | 409 | Dono se rebaixando sem sucessor | Alterar papel | Exigir transferência |
| `MEMBER_NOT_ACTIVE` | 409 | Membro saiu ou foi removido | Alterar papel | Recarregar membros |
| `MEMBER_HAS_ACTIVE_MATCH` | 409 | Membro está jogando | Remover membro, sair | Aguardar ou cancelar a partida; extensão `matchId` |
| `OWNER_OF_ACTIVE_LEAGUES` | 409 | É dono de liga ativa | Desativar/excluir conta | Listar `leagues[]` e exigir transferência |
| `NOT_ENOUGH_MEMBERS` | 409 | Membros insuficientes | Iniciar partida de duplas | — |
| `SESSION_ALREADY_EXISTS` | 409 | Jogatina do dia já existe | `POST /play-sessions` | Usar a existente; extensão `playSessionId` |
| `SESSION_ALREADY_OPEN` | 409 | Outra jogatina aberta na liga | Criar jogatina | Fechar a anterior |
| `SESSION_CLOSED` | 409 | Jogatina fechada | Criar partida, adicionar participante | Reabrir (admin) ou abrir nova |
| `SESSION_ALREADY_CLOSED` | 409 | Fechamento repetido | `POST /close` | Tratar como sucesso |
| `SESSION_NOT_CLOSED` | 409 | Jogatina não está fechada | `POST /reopen` | — |
| `SESSION_HAS_ACTIVE_MATCHES` | 409 | Partidas em andamento | Fechar jogatina com `force = false` | Oferecer "encerrar mesmo assim"; extensão `activeMatchIds[]` |
| `SESSION_HAS_NO_MATCHES` | 409 | Sem partidas finalizadas | Gerar compartilhamento | Esconder botão |
| `ANOTHER_SESSION_OPEN` | 409 | Já há jogatina aberta | Reabrir jogatina antiga | — |
| `PLAYER_ALREADY_IN_MATCH` | 409 | Jogador em partida ativa | Iniciar partida (RN-MATCH-005) | Oferecer "retomar" ou "cancelar a anterior"; extensões `userId`, `conflictingMatchId` |
| `MATCH_NOT_IN_PROGRESS` | 409 | Partida não está em andamento | Registrar/desfazer evento | Recarregar a partida; extensão `currentStatus` |
| `MATCH_ALREADY_FINISHED` | 409 | Partida já finalizada | Finalizar, cancelar | Ir ao resultado; extensões `winnerSide`, `finishedBy` |
| `MATCH_ALREADY_CANCELLED` | 409 | Já cancelada | Cancelar | Tratar como sucesso |
| `MATCH_CANCELLED` | 409 | Partida cancelada | Finalizar | Recarregar |
| `MATCH_NOT_FINISHED` | 409 | Não finalizada | Corrigir resultado | — |
| `BALL_ALREADY_POCKETED` | 409 | Bola já fora da mesa | Duplo toque na mesma bola (RN-EVENT-003) | Ignorar silenciosamente e sincronizar `tableState`; extensões `ballNumber`, `existingEventId` |
| `EVENT_ALREADY_UNDONE` | 409 | Evento já desfeito | Desfazer duas vezes | Tratar como sucesso |
| `EVENT_TYPE_DISABLED` | 409 | Tipo desabilitado pela regra da liga | `FOUL` com `trackFouls = false` | Esconder o controle; extensão `disabledType` |
| `EMAIL_ALREADY_VERIFIED` | 409 | E-mail já verificado | `email/verify` | Tratar como sucesso |
| `EXPORT_ALREADY_IN_PROGRESS` | 409 | Exportação pendente | `POST /data-exports` | Mostrar a existente |
| `ALREADY_REVIEWED` | 409 | Local já avaliado | Avaliar local | Oferecer editar |
| `NEVER_PLAYED_HERE` | 409 | Sem jogatina no local | Avaliar local | Esconder ação |
| `USERNAME_CHANGE_TOO_SOON` | 409 | Troca de username antes de 30 dias | `PATCH /me` | Mostrar `nextChangeAllowedAt` |
| `IDEMPOTENT_REQUEST_IN_PROGRESS` | 409 | Mesma chave em processamento | Retry muito rápido | Aguardar `Retry-After` e repetir (`retryable: true`) |
| `FEATURE_NOT_AVAILABLE` | 409 | Recurso desligado nesta versão | `TEAM_2V2`, geração de imagem, avaliações | Esconder via `features` do bootstrap; extensão `feature` |
| `SHARE_NOT_READY` | 409 | Imagem em geração | Link público de artefato em processamento | Aguardar `Retry-After: 3` |

### Expiração permanente (`410`)

| Código | HTTP | Significado | Quando ocorre | Ação esperada do cliente |
|---|---:|---|---|---|
| `INVITATION_EXPIRED` | 410 | Convite de liga venceu (7 dias) | Aceitar convite antigo | Pedir novo convite |
| `INVITE_CODE_EXPIRED` | 410 | Código venceu | Entrar por código | Pedir código atualizado |
| `INVITE_CODE_REVOKED` | 410 | Código substituído/revogado | Entrar por código | Pedir código atualizado; extensão `revokedAt` |
| `INVITE_CODE_EXHAUSTED` | 410 | `maxUses` atingido | Entrar por código | Pedir novo código |
| `SHARE_EXPIRED` | 410 | Link público venceu (30 dias) | Abrir link | Página "link expirado" |
| `SHARE_REVOKED` | 410 | Link revogado | Abrir link | Página "link indisponível" |
| `EXPORT_EXPIRED` | 410 | Download expirou (72 h) | Baixar export | Solicitar nova exportação |

### Requisição e protocolo (`400`, `405`, `413`, `415`, `428`)

| Código | HTTP | Significado | Quando ocorre | Ação esperada do cliente |
|---|---:|---|---|---|
| `MALFORMED_REQUEST` | 400 | JSON inválido / body ilegível | Bug do cliente | Corrigir (não repetir) |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Header obrigatório ausente | POSTs mutantes (RN-IDEM-001) | Bug do cliente — gerar UUID e repetir |
| `MISSING_REQUIRED_HEADER` | 400 | Outro header obrigatório ausente | — | Corrigir |
| `METHOD_NOT_ALLOWED` | 405 | Método inválido na rota | — | Corrigir |
| `PAYLOAD_TOO_LARGE` | 413 | Corpo > 256 KB | — | Reduzir |
| `FILE_TOO_LARGE` | 413 | Arquivo > 5 MB | Avatar | Comprimir antes de enviar |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | `Content-Type` não suportado | Upload de tipo inválido | Converter |
| `PRECONDITION_REQUIRED` | 428 | `If-Match` obrigatório ausente | Mutação de recurso versionado | Fazer `GET`, ler `ETag` e repetir |
| `IDEMPOTENCY_KEY_REUSE` | 422 | Mesma chave, corpo diferente | Bug do cliente (RN-IDEM-003) | Gerar chave nova |
| `INVALID_IDEMPOTENCY_KEY` | 422 | Chave não é UUID | — | Corrigir |

### Limites e indisponibilidade (`429`, `500`, `503`)

| Código | HTTP | Significado | Quando ocorre | Ação esperada do cliente |
|---|---:|---|---|---|
| `RATE_LIMIT_EXCEEDED` | 429 | Limite de requisições | Ver buckets em §7.12 | Respeitar `Retry-After`; backoff exponencial (`retryable: true`) |
| `TOO_MANY_LOGIN_ATTEMPTS` | 429 | Tentativas de login excedidas | 5/min por IP+e-mail | Exibir tempo de espera |
| `QUOTA_EXCEEDED` | 429 | Cota funcional atingida | 10 ligas/dia, 30 convites/dia, 5 correções/dia | Explicar o limite |
| `INTERNAL_ERROR` | 500 | Erro inesperado | Bug ou falha de dependência | Exibir `traceId`; oferecer "tentar novamente" |
| `SERVICE_UNAVAILABLE` | 503 | Indisponível | Manutenção, dependência fora | Respeitar `Retry-After` (`retryable: true`) |
| `MAINTENANCE_MODE` | 503 | Manutenção programada | `maintenanceMode` no bootstrap | Tela de manutenção; extensão `estimatedEndAt` |
| `DEPENDENCY_UNAVAILABLE` | 503 | Dependência externa fora | E-mail, Blob, mapas | Degradar a funcionalidade específica |

---

## 10.3 Exemplos completos por classe de erro

### `401` — token expirado
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
WWW-Authenticate: Bearer realm="encacapei", error="invalid_token", error_description="The access token expired"
X-Trace-Id: 0af7651916cd43dd8448eb211c80319c
```
```json
{
  "type": "https://api.encacapei.com.br/problems/token-expired",
  "title": "Sessão expirada",
  "status": 401,
  "code": "TOKEN_EXPIRED",
  "detail": "Seu acesso expirou. Renovando a sessão automaticamente.",
  "instance": "/api/v1/me",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-28T14:05:00Z",
  "retryable": true,
  "errors": []
}
```

### `403` — papel insuficiente
```json
{
  "type": "https://api.encacapei.com.br/problems/insufficient-league-role",
  "title": "Permissão insuficiente na liga",
  "status": 403,
  "code": "INSUFFICIENT_LEAGUE_ROLE",
  "detail": "Apenas o dono da liga pode encerrá-la.",
  "instance": "/api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001/finish",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-28T14:06:00Z",
  "retryable": false,
  "errors": [],
  "requiredRole": "OWNER",
  "currentRole": "PLAYER"
}
```

### `404` — liga privada (indistinguível de inexistente)
```json
{
  "type": "https://api.encacapei.com.br/problems/league-not-found",
  "title": "Liga não encontrada",
  "status": 404,
  "code": "LEAGUE_NOT_FOUND",
  "detail": "A liga informada não existe ou não está disponível para este usuário.",
  "instance": "/api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000009",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-28T14:07:00Z",
  "retryable": false,
  "errors": []
}
```

### `409` — jogador já em partida (com caminho de recuperação)
```json
{
  "type": "https://api.encacapei.com.br/problems/player-already-in-match",
  "title": "Jogador já está em partida",
  "status": 409,
  "code": "PLAYER_ALREADY_IN_MATCH",
  "detail": "João Pereira já está em uma partida em andamento. Finalize ou cancele antes de começar outra.",
  "instance": "/api/v1/matches",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-15T00:47:01Z",
  "retryable": false,
  "errors": [],
  "userId": "22222222-2222-4222-8222-222222222222",
  "conflictingMatchId": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
  "conflictingMatchStartedAt": "2026-07-15T00:47:00Z"
}
```

### `409` — modificação concorrente (com estado atual)
Exemplo completo em [§9.3 (13)](09-exemplos-contratos.md#13-conflito-de-concorrência--dois-celulares-na-mesma-mesa).

### `410` — convite de liga expirado
```json
{
  "type": "https://api.encacapei.com.br/problems/invitation-expired",
  "title": "Convite expirado",
  "status": 410,
  "code": "INVITATION_EXPIRED",
  "detail": "Este convite para a Liga do Churrasco expirou em 01/08/2026. Peça um novo a Felipe Costa.",
  "instance": "/api/v1/league-invitations/8a9b0c1d-2e3f-4a5b-8c6d-000000000001/accept",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-08-05T10:00:00Z",
  "retryable": false,
  "errors": [],
  "expiredAt": "2026-08-01T14:30:00Z",
  "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000004",
  "invitedByDisplayName": "Felipe Costa"
}
```

### `422` — validação com múltiplos campos
Exemplo completo em [§9.5](09-exemplos-contratos.md#95-erros-de-validação--cadastro-com-senha-fraca).

### `428` — precondição obrigatória
```json
{
  "type": "https://api.encacapei.com.br/problems/precondition-required",
  "title": "Cabeçalho If-Match obrigatório",
  "status": 428,
  "code": "PRECONDITION_REQUIRED",
  "detail": "Esta operação exige o cabeçalho If-Match com a versão atual do recurso.",
  "instance": "/api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-28T14:09:00Z",
  "retryable": false,
  "errors": [],
  "currentVersion": 7,
  "currentETag": "W/\"7\""
}
```

### `429` — rate limit
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 42
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1785302442
```
```json
{
  "type": "https://api.encacapei.com.br/problems/rate-limit-exceeded",
  "title": "Muitas tentativas",
  "status": 429,
  "code": "RATE_LIMIT_EXCEEDED",
  "detail": "Você excedeu o limite de tentativas. Tente novamente em 42 segundos.",
  "instance": "/api/v1/auth/login",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-28T14:10:00Z",
  "retryable": true,
  "errors": [],
  "retryAfterSeconds": 42,
  "limit": 5,
  "windowSeconds": 60
}
```

### `500` — erro interno (sem vazamento)
```json
{
  "type": "https://api.encacapei.com.br/problems/internal-error",
  "title": "Erro inesperado",
  "status": 500,
  "code": "INTERNAL_ERROR",
  "detail": "Ocorreu um erro inesperado. Tente novamente em alguns instantes.",
  "instance": "/api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/finish",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-28T14:11:00Z",
  "retryable": true,
  "errors": []
}
```

> Nenhum detalhe técnico. O `traceId` é a única chave — o suporte busca por ele no Application Insights e vê a exceção completa.

---

## 10.4 Guia de tratamento no cliente `[R]`

| Classe | Estratégia |
|---|---|
| `401 TOKEN_EXPIRED` | Refresh silencioso **uma vez** + retry automático. Fila de requisições concorrentes |
| `401` demais | Logout imediato, sem retry |
| `403` | Nunca retry. Esconder a ação e, quando possível, corrigir o estado local a partir de `permissions` |
| `404` | Remover o item da lista e recarregar o contexto pai |
| `409` "já aconteceu" (`ALREADY_MEMBER`, `EMAIL_ALREADY_VERIFIED`, `SESSION_ALREADY_CLOSED`, `EVENT_ALREADY_UNDONE`) | **Tratar como sucesso.** O estado desejado já é o vigente |
| `409 CONCURRENT_MODIFICATION` | Reconciliar com `currentState`; só repetir se a intenção continuar válida |
| `409 BALL_ALREADY_POCKETED` | Silencioso — sincronizar `tableState` sem alerta |
| `410` | Estado terminal: mensagem clara e caminho alternativo (pedir novo convite/código) |
| `422` | Marcar campos com `errors[].field`/`code`. Nunca traduzir `message` no cliente |
| `428` | `GET` → ler `ETag` → repetir |
| `429`/`503` com `retryable: true` | Backoff exponencial com jitter, respeitando `Retry-After`; máximo 3 tentativas |
| `500` | Uma tentativa de retry; depois, tela de erro com `traceId` copiável |

## 10.5 Regras de estabilidade do catálogo `[R]`

- Um `code` **nunca** muda de significado nem de status HTTP após publicado. Novos casos ganham códigos novos.
- Remover um `code` é mudança quebrável (exige `/api/v2`).
- Todo `code` tem página em `https://api.encacapei.com.br/problems/{code-kebab}` com causa, exemplo e ação recomendada.
- O catálogo vive como **enum em código** (`ErrorCode`), com teste que garante que todo valor tem `title`, `type` e status mapeados — nenhum erro é montado com string literal.
