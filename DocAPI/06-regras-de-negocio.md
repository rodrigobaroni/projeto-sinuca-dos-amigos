# 6. Regras de negócio

Cada regra tem: **ID** estável (usado em código, teste e mensagem de erro), enunciado, **origem** (`[C]`/`[I]`/`[R]`/`[P]`), exceções e impacto técnico.

Convenção de implementação `[R]`: regras de invariante ficam em **entidades de domínio** (`Match.Finish()` recusa estado inválido); regras de autorização ficam em **políticas de aplicação**; regras de formato ficam em **validators** na borda. Nenhuma regra vive apenas no banco — o `CHECK` é rede de segurança, não a especificação.

---

## 6.1 Autenticação e conta (`RN-AUTH`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-AUTH-001 | A senha deve ter **≥ 8 caracteres** e conter ao menos **1 maiúscula, 1 minúscula, 1 número e 1 caractere especial**. Os 5 critérios são retornados individualmente para o feedback em tempo real da tela | `[C]` (5 itens na tela de cadastro) | Nenhuma | `PasswordPolicy` no domínio; erro `422` com `errors[]` por critério, não mensagem única |
| RN-AUTH-002 | A senha nunca é armazenada em claro. Hash **Argon2id** (`m=19456KiB, t=2, p=1`), com rehash transparente no próximo login se os parâmetros mudarem | `[R]` | Nenhuma | `IPasswordHasher` na infra |
| RN-AUTH-003 | A nova senha não pode ser igual a nenhuma das **3 últimas** | `[R]` | Nenhuma | `previous_hashes[]`; comparação por verificação de hash, uma a uma |
| RN-AUTH-004 | E-mail é **único** e tratado como case-insensitive | `[I]` | Contas anonimizadas liberam o e-mail | Coluna `citext` + unique parcial |
| RN-AUTH-005 | `username` é **único**, 3–20 caracteres, apenas `[a-z0-9_.]`, case-insensitive, exibido com `@` | `[C]` (`@baroni`, `@joaop`, `@felipao`, `@ander`, `@marcao`) | Reservados: `admin, api, encacapei, suporte, me, null, undefined` | `citext` + unique + `CHECK`; endpoint de disponibilidade com rate limit |
| RN-AUTH-006 | O cadastro tem **6 etapas** no cliente, mas **uma única transação** no servidor. Não há usuário parcialmente criado | `[C]` ("Etapa 5 de 6") + `[R]` | Nenhuma | `POST /auth/register` recebe o payload completo; etapas 2 (username) e 3 (e-mail) têm validação incremental opcional |
| RN-AUTH-007 | Após o cadastro o usuário **já recebe tokens** e entra no app; a verificação de e-mail é assíncrona | `[C]` (mockup vai direto do "Criar conta" para a Home) | — | `status = PENDING_VERIFICATION`, mas com acesso |
| RN-AUTH-008 | Sem verificar o e-mail em **7 dias**, ficam bloqueadas as ações que geram e-mail ou expõem a terceiros: criar liga, enviar convite (amizade/liga), gerar link público. Leitura e jogo continuam liberados | `[P]` `DP-023` | Admin de plataforma pode conceder prorrogação | Política `RequireVerifiedEmail`; erro `403 EMAIL_NOT_VERIFIED` |
| RN-AUTH-009 | Token de verificação de e-mail expira em **24 h**, é de **uso único** e invalida os anteriores do mesmo usuário | `[R]` | — | Só o hash é persistido |
| RN-AUTH-010 | `POST /auth/password/forgot` responde **sempre `202`**, exista ou não a conta | `[R]` (anti-enumeração) | — | Tempo de resposta constante (evita timing attack) |
| RN-AUTH-011 | Token de redefinição expira em **30 min**, é de uso único, e usá-lo **revoga todas as sessões** do usuário | `[R]` | — | `revoked_reason = 'PASSWORD_CHANGED'` |
| RN-AUTH-012 | Trocar a senha autenticado **revoga todas as outras sessões**, mantendo a atual | `[C]` (botão "Alterar senha") + `[R]` | — | Revoga por `session_id <> current` |
| RN-AUTH-013 | Access token vive **15 min**; refresh token vive **30 dias** e é **rotacionado a cada uso** | `[R]` | — | JWT assinado com RS256 (chave em Azure Key Vault, rotação trimestral) |
| RN-AUTH-014 | Reapresentar um refresh token já rotacionado indica roubo: **toda a família de sessão é revogada** e o usuário precisa logar de novo | `[R]` | — | `replaced_by_id` forma a cadeia; evento `SuspiciousRefreshDetected` |
| RN-AUTH-015 | **10 falhas** de login para o mesmo e-mail em 15 min bloqueiam a conta por 15 min; o rate limit por IP é independente e mais estrito | `[R]` | Admin pode desbloquear | `failed_attempts` + `locked_until`; resposta idêntica à de senha errada (`401 INVALID_CREDENTIALS`) para não revelar o bloqueio |
| RN-AUTH-016 | Logout revoga **apenas a sessão corrente** | `[C]` ("Sair da conta") | `logout?all=true` revoga todas | Access token remanescente vai para denylist por `jti` até expirar |

## 6.2 Perfil e conta (`RN-USER`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-USER-001 | `displayName` tem 2–60 caracteres e é o nome mostrado em ranking, histórico e pódio | `[C]` ("Rodrigo Baroni") | — | Trim + colapso de espaços; recusa caracteres de controle |
| RN-USER-002 | Avatar aceita `image/jpeg`, `image/png`, `image/webp`, até **5 MB**; é redimensionado para 256×256 e 64×64 e servido por CDN | `[R]` | — | Upload direto ao Blob com SAS de escrita (TTL 10 min); validação de **magic bytes**, não da extensão |
| RN-USER-003 | Sem avatar, a UI mostra as **iniciais** do `displayName` sobre `avatarColor` — o backend fornece ambos | `[C]` (`RB`, `JO`, `FE`, `AN`, `MA`) | — | Campos `initials` e `avatarColor` no DTO de usuário |
| RN-USER-004 | Trocar de `username` é permitido **1 vez a cada 30 dias**; o antigo fica reservado por 30 dias | `[P]` `DP-024` | Admin | `username_changed_at` |
| RN-USER-005 | Desativar a conta esconde o perfil das buscas, impede novos convites e mantém o histórico; qualquer login **reativa** | `[I]` | — | `status = DEACTIVATED`; ranking histórico continua exibindo o nome |
| RN-USER-006 | Excluir a conta agenda **anonimização em 30 dias**; nesse período o login cancela a exclusão | `[I]` + `[R]` (LGPD) | Solicitação expressa de eliminação imediata é atendida em até 15 dias | `deletion_scheduled_at`; job diário |
| RN-USER-007 | Anonimização substitui `displayName` por "Jogador removido", `username` por `deleted_<8hex>`, apaga e-mail, avatar e credencial — **mas mantém `id`, partidas e ranking** | `[R]` (LGPD art. 16, III — preservação de dados de terceiros) | — | O histórico de outros jogadores não pode ser destruído por decisão unilateral de um participante |
| RN-USER-008 | A visibilidade do perfil (`PUBLIC`/`FRIENDS_ONLY`/`PRIVATE`) controla stats de terceiros, **exceto** dentro de ligas em comum, onde V/D/% são sempre visíveis (é o ranking) | `[P]` `DP-015` | — | Política de leitura no `GetUserStatistics` |

## 6.3 Amizades (`RN-FRIEND`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-FRIEND-001 | Amizade é **simétrica**: aceita uma vez, vale para os dois lados | `[C]` (lista única "Seus amigos") | — | Armazenada com `user_a_id < user_b_id` |
| RN-FRIEND-002 | Não é possível enviar convite para si mesmo | `[R]` | — | `422 CANNOT_FRIEND_SELF` |
| RN-FRIEND-003 | Só pode existir **um** convite `PENDING` por par ordenado | `[R]` | — | Unique parcial; reenvio devolve o convite existente (idempotente) |
| RN-FRIEND-004 | Se B convida A enquanto existe convite pendente de A para B, a amizade é **criada automaticamente** e ambos os convites viram `ACCEPTED` | `[R]` | — | Evita o estado absurdo de dois convites cruzados |
| RN-FRIEND-005 | Convidar quem já é amigo falha com `409 ALREADY_FRIENDS` | `[R]` | — | |
| RN-FRIEND-006 | Só o **destinatário** aceita ou recusa; só o **remetente** cancela | `[C]` (botões só no card do destinatário) | — | `404` em vez de `403` quando o solicitante não é parte |
| RN-FRIEND-007 | Recusar **não notifica** o remetente | `[R]` (proteção social) | — | Nenhum evento de notificação em `DECLINED` |
| RN-FRIEND-008 | Aceitar **notifica** o remetente | `[I]` | Respeita preferências | `FriendRequestAccepted` → `FRIEND_REQUEST_ACCEPTED` |
| RN-FRIEND-009 | Remover amizade é unilateral, silencioso, e **não apaga** histórico de partidas nem tira ninguém de liga | `[I]` | — | Soft delete; h2h continua acessível se houver liga em comum |
| RN-FRIEND-010 | Amizade **não é pré-requisito** para jogar: membros de uma mesma liga podem se enfrentar sem serem amigos | `[C]` (liga entra por código, sem amizade) | — | Nenhuma checagem de amizade em `POST /matches` |
| RN-FRIEND-011 | Convite de amizade **não expira** | `[P]` `DP-019` | — | Job opcional de limpeza após 1 ano |
| RN-FRIEND-012 | Bloquear alguém remove a amizade, cancela convites pendentes nos dois sentidos e impede novos | `[P]` `DP-022` (pós-MVP) | — | Filtro em busca, convites e h2h |

## 6.4 Ligas (`RN-LEAGUE`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-LEAGUE-001 | Criar liga torna o criador **`OWNER`** e único membro inicial. A liga é válida com 1 membro | `[C]` ("comece sozinho e convide depois") | — | `League` + `LeagueRule` + `LeagueSchedule` + `LeagueMember(OWNER)` na mesma transação |
| RN-LEAGUE-002 | `name` tem 3–60 caracteres; **não** precisa ser único | `[C]` | — | Duas "Liga da Terça" podem coexistir |
| RN-LEAGUE-003 | `durationType` determina `endsAt`: `ONE_DAY` → `startsAt`; `SIX_MONTHS` → `startsAt + 6 meses`; `UNLIMITED` → `NULL` | `[C]` (chips do wizard) | Admin pode ajustar `endsAt` explicitamente | Cálculo no domínio, nunca no cliente |
| RN-LEAGUE-004 | Liga com `endsAt` vencido é encerrada **automaticamente** pelo job diário (`ACTIVE → FINISHED`) | `[I]` | — | Job `finish-expired-leagues` às 05:00 UTC; notifica membros |
| RN-LEAGUE-005 | `weekdays` aceita 0 a 7 dias. Liga **sem** dias definidos não gera `nextSessionAt` nem lembretes, mas permite jogar a qualquer momento | `[C]` (multisseleção) + `[I]` | — | `nextSessionAt = NULL` |
| RN-LEAGUE-006 | `nextSessionAt` é **derivado** de `weekdays` + `startTime` + `timezone`, nunca informado pelo cliente | `[I]` ("Próxima: terça, 20h") | Liga `FINISHED` → `NULL` | Recalculado ao alterar schedule, ao fechar jogatina e por job diário |
| RN-LEAGUE-007 | Uma liga tem **exatamente um** `OWNER` a qualquer momento | `[R]` | — | Unique parcial no banco (`ux_league_single_owner`) |
| RN-LEAGUE-008 | Editar a liga exige `ADMIN` ou `OWNER`; encerrar e transferir propriedade exigem `OWNER` | `[I]` | Admin de plataforma via back-office com auditoria | Política de objeto (§3.3) |
| RN-LEAGUE-009 | Após a **primeira partida finalizada**, `gameMode`, `trackPocketedBalls`, `trackFouls` e `ballsCount` tornam-se **imutáveis** | `[P]` `DP-008` (`INC-06`) | Admin de plataforma com auditoria | `rules_locked_at`; erro `409 LEAGUE_RULES_LOCKED`. Alternativa: versionar regra por partida — o `rules_snapshot` em `matches` já protege o histórico |
| RN-LEAGUE-010 | Liga `FINISHED` recusa: nova partida, nova jogatina, novo convite, entrada de membro e edição de config. Aceita: leitura, saída de membro e correção dentro da janela | `[C]` (badge "Encerrada") + `[I]` | Admin de plataforma pode reabrir com auditoria | `409 LEAGUE_FINISHED` |
| RN-LEAGUE-011 | Encerrar a liga **congela** o ranking final (`frozen_at`) e cancela jogatinas/partidas em aberto | `[I]` | — | Transação: `FinishLeague` → `CloseSessions` → `CancelMatches` → `FreezeRanking` |
| RN-LEAGUE-012 | Exclusão permanente só é possível se a liga **nunca teve partida finalizada**; caso contrário, só encerramento | `[R]` | Admin de plataforma (LGPD) | `409 LEAGUE_HAS_HISTORY` |
| RN-LEAGUE-013 | Liga `PRIVATE` não aparece em busca pública nem em "Ligas que jogam aqui" para não-membros; acesso por ID retorna **404** | `[C]` ("Buscar ligas públicas") + `[R]` | Admin de plataforma | Filtro obrigatório no repositório de leitura |
| RN-LEAGUE-014 | Liga `PUBLIC` é buscável por qualquer autenticado, que vê nome, local, contadores e ranking — mas **não** o histórico detalhado antes de entrar | `[C]` + `[P]` `DP-006` | — | Dois DTOs: `LeagueSummary` (público) e `LeagueDetail` (membro) |
| RN-LEAGUE-015 | Trocar o `venueId` afeta apenas jogatinas **futuras**; jogatinas passadas mantêm o local em que ocorreram | `[I]` | — | `play_sessions.venue_id` é snapshot |
| RN-LEAGUE-016 | `ONE_DAY` cria a liga já com a jogatina do dia aberta | `[I]` (é o caso "jogo avulso" de `DP-011`) | — | `CreateLeague` dispara `OpenSession` quando `durationType = ONE_DAY` |

## 6.5 Membros (`RN-MEMBER`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-MEMBER-001 | Um usuário é membro ativo de uma liga **no máximo uma vez** | `[R]` | — | Unique parcial `WHERE status='ACTIVE'` |
| RN-MEMBER-002 | Entrar na liga cria a `RankingEntry` zerada, para o jogador já aparecer na tabela com 0/0/0% | `[I]` (ranking lista todos os membros) | — | Mesma transação |
| RN-MEMBER-003 | Sair da liga define `status = LEFT`; o histórico de partidas **permanece** e o nome continua aparecendo no ranking histórico | `[I]` | — | `[P]` `DP-025`: quem saiu continua no ranking corrente? **Recomendação: sim, marcado como `inactive: true`** — sumir distorce o passado |
| RN-MEMBER-004 | O `OWNER` **não pode sair** sem transferir a propriedade | `[R]` | Se for o único membro, sair = encerrar a liga | `409 OWNER_MUST_TRANSFER` |
| RN-MEMBER-005 | `ADMIN` pode remover `PLAYER`; não pode remover outro `ADMIN` nem o `OWNER`. `OWNER` pode remover qualquer um | `[I]` | — | Comparação de nível de papel |
| RN-MEMBER-006 | Alterar papel é exclusivo do `OWNER`; promover alguém a `OWNER` **rebaixa** o dono atual a `ADMIN` (transferência atômica) | `[I]` | — | Uma transação, dois `UPDATE` |
| RN-MEMBER-007 | Membro removido ou que saiu **não pode** iniciar partida nem registrar evento, mesmo em partida já criada | `[R]` | — | Checagem no momento da ação, não no início da noite |
| RN-MEMBER-008 | Rejoin reaproveita a linha existente (`LEFT → ACTIVE`) preservando `RankingEntry` e estatísticas | `[R]` | Após 12 meses, `[P]` zerar? Recomendação: **preservar sempre** | `UPDATE` em vez de `INSERT` |
| RN-MEMBER-009 | Liga com `gameMode = TEAM_2V2` exige no mínimo 4 membros ativos para iniciar partida | `[I]` (pós-MVP) | — | `409 NOT_ENOUGH_MEMBERS` |

## 6.6 Convites de liga (`RN-INVITE`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-INVITE-001 | Convite nominal é endereçado a um usuário existente e mostra **quem convidou** | `[C]` ("Convidado por Felipe Costa") | — | `invited_by_user_id` obrigatório |
| RN-INVITE-002 | Convite expira em **7 dias** (`expiresAt`); expirado não pode ser aceito | `[P]` `DP-019` | Admin da liga pode reenviar | Job horário marca `EXPIRED`; erro `410 INVITATION_EXPIRED` |
| RN-INVITE-003 | Não pode haver dois convites `PENDING` para o mesmo par (liga, usuário); reenviar **renova** o `expiresAt` do existente | `[R]` | — | Unique parcial; operação idempotente |
| RN-INVITE-004 | Convidar quem já é membro ativo falha com `409 ALREADY_MEMBER` | `[R]` | — | |
| RN-INVITE-005 | Aceitar cria o membro como `PLAYER`, incrementa `membersCount`, cria `RankingEntry` e notifica quem convidou | `[C]`+`[I]` | — | Transação única + outbox |
| RN-INVITE-006 | Só o destinatário aceita/recusa; admins podem **revogar** | `[C]` | — | `404` para terceiros |
| RN-INVITE-007 | Código de convite é único global, tem `expiresAt` (7 dias) e `maxUses` opcional; gerar um novo **revoga** o anterior da liga | `[C]` ("Gerar código de convite") + `[R]` | Admin pode manter múltiplos ativos via parâmetro | Alfabeto sem caracteres ambíguos (§5.8) |
| RN-INVITE-008 | Entrar por código não exige amizade nem convite nominal e registra `joinedVia = INVITE_CODE` | `[I]` | Liga `FINISHED` recusa | Incremento atômico de `uses_count` com `CHECK` |
| RN-INVITE-009 | Código inválido, expirado, revogado ou esgotado retorna erro **específico** para cada caso | `[R]` | — | `INVITE_CODE_NOT_FOUND`, `INVITE_CODE_EXPIRED`, `INVITE_CODE_REVOKED`, `INVITE_CODE_EXHAUSTED` |
| RN-INVITE-010 | Preview do código (`GET /invite-codes/{code}`) mostra nome da liga, local e nº de membros **sem** entrar — para o usuário saber onde está entrando | `[R]` | — | Endpoint de leitura sem efeito colateral |
| RN-INVITE-011 | Encerrar a liga expira todos os convites e códigos pendentes | `[I]` | — | Handler de `LeagueFinished` |
| RN-INVITE-012 | Entrada em liga **pública**: `DP-006`. Recomendação — **entrada direta** (`ACTIVE` imediato), com `requiresApproval` como flag futura | `[P]` | — | Se aprovação for exigida, o membro nasce `PENDING_APPROVAL` |

## 6.7 Jogatinas (`RN-SESSION`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-SESSION-001 | Existe no máximo **uma** jogatina `IN_PROGRESS` por liga | `[I]` | — | Unique parcial `ux_play_sessions_single_open` |
| RN-SESSION-002 | Existe no máximo **uma** jogatina por (`liga`, `businessDate`) não cancelada | `[I]` | — | Unique parcial |
| RN-SESSION-003 | `businessDate` é a data no **fuso da liga**, com corte deslocado quando a janela cruza a meia-noite (§4.8). Partida às 00:31 pertence à noite anterior | `[C]` (20h–00h) + `[I]` | — | Função pura de domínio, testada isoladamente. **Nunca** `CAST(now() AS date)` |
| RN-SESSION-004 | Iniciar partida sem jogatina aberta **abre** a jogatina do dia automaticamente | `[I]` `DP-012` | — | `OpenOrGetCurrentSession` idempotente; corrida resolvida por `ON CONFLICT DO NOTHING` + releitura |
| RN-SESSION-005 | Abrir jogatina não exige que seja um dia de calendário da liga | `[I]` | — | Jogou fora do dia previsto? Conta igual. Flag `outOfSchedule: true` para analítica |
| RN-SESSION-006 | Participar de uma partida inclui o jogador automaticamente em `PlaySessionParticipant` | `[I]` | — | |
| RN-SESSION-007 | É possível adicionar participante que ainda não jogou; ele aparece no pódio com 0 vitórias | `[C]` ("4º Anderson — 0 vitórias") | — | `POST /play-sessions/{id}/participants` |
| RN-SESSION-008 | Fechar a jogatina exige que **nenhuma partida** esteja `IN_PROGRESS`; ou o cliente cancela antes, ou usa `force=true` (cancela em cascata com motivo `SESSION_CLOSED`) | `[I]` | — | `409 SESSION_HAS_ACTIVE_MATCHES` |
| RN-SESSION-009 | Jogatina aberta há mais de **`endTime + 4 h`** é fechada automaticamente pelo job noturno | `[R]` | — | Evita jogatina zumbi de 3 meses distorcendo "N vitórias hoje" |
| RN-SESSION-010 | Fechar a jogatina congela o pódio, publica `PlaySessionClosed` e (se houver preferência) gera o card de compartilhamento | `[I]` | — | |
| RN-SESSION-011 | Jogatina `CLOSED` recusa novas partidas; para continuar, abre-se **nova jogatina** — que colidiria com o unique de `businessDate`, então reabrir a existente é a operação correta | `[R]` | — | `POST /play-sessions/{id}/reopen` restrito a admin, com auditoria, dentro de 12 h |
| RN-SESSION-012 | Lembrete é criado `reminderMinutesBefore` (default **60**) antes de `nextSessionAt`, para todos os membros ativos com a preferência habilitada | `[C]` ("começa em 1 hora") | Membro que já está em jogatina aberta não recebe | Job de 5 em 5 min varrendo `next_session_at` |

## 6.8 Partidas (`RN-MATCH`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-MATCH-001 | Toda partida pertence a uma **jogatina** e a uma **liga** | `[I]` `DP-011` | — | `play_session_id` e `league_id` NOT NULL |
| RN-MATCH-002 | Em `ONE_VS_ONE` a partida tem **exatamente 2 participantes**, um em cada lado | `[C]` | `TEAM_2V2`: 4 participantes, 2 por lado (pós-MVP) | Validado no domínio antes de persistir |
| RN-MATCH-003 | Um jogador não enfrenta a si mesmo | `[R]` | — | `422 DUPLICATE_PARTICIPANT` |
| RN-MATCH-004 | Todos os participantes devem ser **membros ativos** da liga no momento da criação | `[C]` (a lista de adversários vem dos membros) | — | `422 NOT_LEAGUE_MEMBER` |
| RN-MATCH-005 | Um jogador só pode estar em **uma partida `IN_PROGRESS`** por vez, em qualquer liga | `[R]` | Admin pode cancelar a anterior | `users.active_match_id` unique; erro `409 PLAYER_ALREADY_IN_MATCH` com o `matchId` conflitante para o app oferecer "retomar" |
| RN-MATCH-006 | Quem cria a partida **não precisa** ser um dos jogadores — o organizador registra partidas alheias | `[I]` (realidade de bar) | Precisa ser membro ativo | `created_by_user_id` |
| RN-MATCH-007 | A partida nasce `IN_PROGRESS` com `startedAt = now()`; não existe estado `CREATED` separado | `[C]` ("Começar partida" leva direto à tela de jogo) | — | Simplifica a máquina de estados |
| RN-MATCH-008 | A partida congela as regras vigentes (`rules_snapshot`) na criação | `[R]` | — | Protege o histórico de mudança de configuração |
| RN-MATCH-009 | Finalizar exige `winnerSide ∈ {1,2}`. A UI ("Venceu"/"Perdeu") é traduzida pelo app para o lado correto | `[C]` + `[R]` `DP-013` | — | Contrato por lado, não por "eu venci" — sobrevive a duplas e ao registro por terceiros |
| RN-MATCH-010 | Finalizar exige `status = IN_PROGRESS`. Repetir a chamada com a **mesma** `Idempotency-Key` devolve `200` com o mesmo resultado; com chave diferente, `409 MATCH_ALREADY_FINISHED` | `[R]` | — | |
| RN-MATCH-011 | Finalizar atualiza, **na mesma transação**: `MatchParticipant.isWinner`, `LeagueRankingEntry` dos envolvidos, `SessionRankingEntry`, contadores da liga e da jogatina | `[I]` | — | Consistência forte — ranking nunca fica "atrasado" ao voltar para a tela |
| RN-MATCH-012 | Estatísticas do usuário, séries diárias, h2h e notificações são atualizados **assincronamente** via outbox | `[R]` | — | Consistência eventual (< 5 s) aceitável nesses agregados |
| RN-MATCH-013 | Partida `CANCELLED` **não conta** em ranking, estatística, h2h nem pódio | `[I]` | — | Todos os agregados filtram `status = 'FINISHED'` |
| RN-MATCH-014 | Cancelar exige `IN_PROGRESS`; partida finalizada só muda por **correção** | `[I]` | Admin da liga pode cancelar finalizada dentro de 24 h, com motivo | `409 MATCH_ALREADY_FINISHED` |
| RN-MATCH-015 | Correção de resultado: permitida a participantes da partida em até **24 h** do `finishedAt`; depois disso, só `ADMIN`/`OWNER` da liga | `[P]` `DP-003` | Liga encerrada: só admin de plataforma | `403 CORRECTION_WINDOW_EXPIRED` |
| RN-MATCH-016 | Correção exige `reason` (5–300 chars), cria `MatchCorrection`, define `result_status = 'CORRECTED'`, gera `AuditLog` e **notifica todos os participantes** | `[I]` | — | O resultado anterior nunca é sobrescrito sem registro |
| RN-MATCH-017 | Correção dispara **reprocessamento assíncrono** do ranking da liga e da jogatina; a resposta é `202` com `rebuildJobId` | `[I]` | Ligas pequenas (< 500 partidas) podem ser reprocessadas de forma síncrona | Ver §12.6 |
| RN-MATCH-018 | Não é permitido "corrigir" para o mesmo vencedor (no-op) | `[R]` | — | `422 CORRECTION_NO_CHANGE` |
| RN-MATCH-019 | Partida em liga `FINISHED` não pode ser criada | `[C]` | — | `409 LEAGUE_FINISHED` |
| RN-MATCH-020 | Sair da tela sem finalizar mantém a partida `IN_PROGRESS`; ao reabrir o app o usuário é levado de volta a ela | `[I]` | — | `GET /me/active-match` |

## 6.9 Eventos de partida (`RN-EVENT`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-EVENT-001 | Eventos só são aceitos com a partida `IN_PROGRESS` | `[R]` | — | `409 MATCH_NOT_IN_PROGRESS` |
| RN-EVENT-002 | `BALL_POCKETED` exige `ballNumber` entre **1 e `rules_snapshot.ballsCount`** (8 no MVP) | `[C]` (8 bolas na tela) | — | `422 INVALID_BALL_NUMBER` |
| RN-EVENT-003 | A mesma bola não pode estar encaçapada duas vezes ao mesmo tempo | `[C]` (toggle) | — | Unique parcial `WHERE undone_at IS NULL` → `409 BALL_ALREADY_POCKETED` |
| RN-EVENT-004 | Desfazer é **soft** (`undoneAt`), nunca `DELETE`; a bola volta a ficar disponível | `[C]` (toggle reversível) | — | Preserva a trilha "encaçapou e desfez" |
| RN-EVENT-005 | Só participantes da partida (ou admin da liga) registram e desfazem eventos | `[R]` | — | `403 NOT_MATCH_PARTICIPANT` |
| RN-EVENT-006 | Evento de tipo desabilitado pela regra da liga é rejeitado: `BALL_POCKETED` requer `trackPocketedBalls`; `FOUL` requer `trackFouls` | `[C]` (toggles da config) | — | `409 EVENT_TYPE_DISABLED` |
| RN-EVENT-007 | `sequence` é atribuído pelo servidor, monotônico por partida | `[R]` | — | `MAX(sequence)+1` sob lock da linha da partida, ou sequence dedicada |
| RN-EVENT-008 | Registrar bola **não** finaliza a partida automaticamente, nem mesmo a bola 8 | `[C]` (finalização é por botão explícito) | — | `[P]` `DP-026`: sugerir finalização quando a 8 cai? Recomendação: o app **sugere**, o servidor não decide |
| RN-EVENT-009 | Eventos são preservados em partida cancelada ou corrigida | `[R]` | — | Base analítica futura |
| RN-EVENT-010 | `actorUserId` (quem encaçapou) é opcional no MVP; ausente, o evento conta só para a mesa | `[P]` `DP-014` | — | Se o produto quiser "bolas por jogador", torna-se obrigatório |

## 6.10 Ranking (`RN-RANKING`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-RANKING-001 | `winRate = wins / (wins + losses) × 100`, `numeric(5,2)`. Sem partidas → `0.00` | `[C]` (colunas V, D, %) + `[P]` `DP-009` | `minMatchesForRanking > 0` desloca o jogador para o fim | Nunca `float`; arredondamento **half-up** só na exibição |
| RN-RANKING-002 | Ordenação: `winRate DESC` → `wins DESC` → `losses ASC` → confronto direto → `joinedAt ASC` | `[C]` (tabela ordenada por %) + `[P]` `DP-009` | Configurável por `tiebreaker_order` | Determinístico e estável |
| RN-RANKING-003 | Todos os membros ativos aparecem no ranking, inclusive com 0 partidas | `[C]` (5 membros, 5 linhas) | — | `RankingEntry` criada na entrada |
| RN-RANKING-004 | Partidas `CANCELLED` e eventos desfeitos não afetam o ranking | `[I]` | — | |
| RN-RANKING-005 | O ranking é **materializado** e atualizado na transação da finalização | `[R]` | Reprocessamento é assíncrono | Leitura O(membros), sem agregação |
| RN-RANKING-006 | Aplicar o resultado é **idempotente por `matchId`**: reprocessar não duplica | `[R]` | — | `ranking_applied_matches (league_id, match_id)` ou rebuild completo determinístico |
| RN-RANKING-007 | Correção dispara rebuild **completo e determinístico** da liga a partir de `matches`, sob advisory lock | `[R]` | — | Reconstruir é mais seguro que aplicar delta |
| RN-RANKING-008 | Encerrar a liga congela o ranking (`frozenAt`); leituras posteriores servem o congelado | `[I]` | Correção pós-encerramento por admin descongela, reprocessa e recongela | |
| RN-RANKING-009 | Ranking da jogatina ordena por `wins DESC` → `losses ASC` → `winRate` da liga → `joinedAt` | `[C]` (pódio por nº de vitórias) | — | Empate em 1º: `[P]` `DP-027` — recomendação: **medalhas compartilhadas** (dois 🥇 e nenhum 🥈) |
| RN-RANKING-010 | O pódio da jogatina é **parcial** enquanto ela estiver aberta e é recalculado a cada partida | `[C]` (`INC-07`) | — | Rótulo da UI deve ser "está em 1º", não "ficou em 1º" |
| RN-RANKING-011 | Sequência de vitórias considera **todas** as partidas do jogador em ordem de `finishedAt`, atravessando ligas e jogatinas | `[I]` (KPI global da Home) | — | `[P]` `DP-028`: streak por liga também? Recomendação: global na Home, por liga no ranking |
| RN-RANKING-012 | Existe verificação diária de deriva: recalcula uma amostra e alerta divergências | `[R]` | — | Métrica `ranking_drift_detected_total` |
| RN-RANKING-013 | Em duplas, vitória credita **os dois** jogadores do lado vencedor no ranking individual | `[I]` (pós-MVP) `DP-013` | Ranking de duplas por par é feature separada | |

## 6.11 Locais (`RN-VENUE`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-VENUE-001 | Busca por proximidade exige `lat` + `lng`; `radiusKm` default **5**, máximo **50** | `[C]` ("perto de você") | Busca textual dispensa coordenadas | `ST_DWithin` com índice GIST |
| RN-VENUE-002 | `distanceKm` só aparece quando o cliente envia coordenadas; é arredondado a 1 decimal | `[C]` ("2,4 km de você") | — | Nunca persistido |
| RN-VENUE-003 | Coordenadas do usuário **não são armazenadas** nem logadas; ficam apenas na requisição | `[R]` (LGPD — minimização) | Consentimento explícito para histórico de localização, se um dia existir | Excluídas do log de acesso |
| RN-VENUE-004 | Resultados vêm ordenados por distância crescente | `[C]` | `sort=rating` opcional | |
| RN-VENUE-005 | O catálogo é somente leitura para o app; criação e edição são de admin de plataforma | `[I]` `DP-018` | — | |
| RN-VENUE-006 | "Ligas que jogam aqui" mostra apenas ligas visíveis ao solicitante (públicas + as suas) | `[C]` + `[R]` | — | Filtro obrigatório |
| RN-VENUE-007 | Atrelar liga a local exige `ADMIN`/`OWNER` **da liga**; nenhuma permissão sobre o local é necessária | `[C]` ("Atrelar liga a este local") | — | É um `PATCH` na liga |
| RN-VENUE-008 | "Traçar rota" não gera chamada ao backend | `[C]` | — | Backend só fornece `latitude`/`longitude` |
| RN-VENUE-009 | `rating`/`ratingCount` são exibidos com a **fonte** (`ratingSource`); se vierem de terceiro, a atribuição obrigatória do provedor deve ser respeitada | `[C]` (4.5 / 128) + `[P]` `DP-017` | — | Termos de uso do Google Places exigem exibir atribuição e proíbem cache prolongado |

## 6.12 Notificações (`RN-NOTIF`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-NOTIF-001 | Toda notificação tem `category`, que determina a seção da tela | `[C]` (3 seções) | — | |
| RN-NOTIF-002 | O contador de não lidas conta `read_at IS NULL AND deleted_at IS NULL` | `[C]` (badge 3) | — | Índice parcial |
| RN-NOTIF-003 | Notificação acionável carrega no `payload` o ID necessário para a ação inline | `[C]` (Aceitar/Recusar no card) | — | `invitationId`, `friendRequestId` |
| RN-NOTIF-004 | Executar a ação **resolve** a notificação (`resolvedAt`) e some com os botões | `[I]` | — | Handler de `LeagueInvitationAccepted` etc. |
| RN-NOTIF-005 | "Limpar histórico" apaga (soft) apenas notificações **lidas ou já resolvidas**; pendentes acionáveis permanecem | `[C]` + `[R]` | `force=true` apaga tudo | Perder um convite por engano é pior que uma lista suja |
| RN-NOTIF-006 | Notificações são **deduplicadas** por `dedupeKey` | `[R]` | — | Reprocessar evento não gera duplicata |
| RN-NOTIF-007 | O usuário não é notificado de ação que ele próprio executou | `[R]` | — | `if (recipientId == actorId) skip` |
| RN-NOTIF-008 | Recusa de convite (amizade ou liga) não gera notificação ao remetente | `[R]` | — | |
| RN-NOTIF-009 | Preferências são por categoria e por canal (in-app / push / e-mail); `SYSTEM` e segurança **não** podem ser desligados | `[I]` | — | |
| RN-NOTIF-010 | Push respeita `quietHours` do usuário; in-app nunca é suprimido | `[R]` | Lembrete de jogatina que caia em quiet hours é adiantado, não suprimido | |
| RN-NOTIF-011 | Lembrete de jogatina expira quando a jogatina começa | `[I]` | — | `expiresAt = nextSessionAt` |
| RN-NOTIF-012 | Token de push inválido (retorno do provedor) desativa o device | `[R]` | — | `disabled_at`; limpeza após 90 dias |

## 6.13 Compartilhamento (`RN-SHARE`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-SHARE-001 | Só participantes da jogatina geram o card dela | `[C]` (modal aparece para quem jogou) | Admin da liga | `403 NOT_SESSION_PARTICIPANT` |
| RN-SHARE-002 | O artefato **congela** o pódio no momento da geração (`snapshot`) | `[R]` | — | Correção posterior não altera um card já enviado ao WhatsApp |
| RN-SHARE-003 | O link público expira em **30 dias** e é revogável a qualquer momento por quem o criou ou por admin da liga | `[R]` | — | `410 SHARE_EXPIRED` / `SHARE_REVOKED` |
| RN-SHARE-004 | Conteúdo público é **minimizado**: primeiro nome + inicial do sobrenome, avatar, posição e nº de vitórias. Sem `@username`, sem e-mail, sem ID interno, sem link para perfil | `[P]` `DP-004` (LGPD) | Usuário com `shareStatsPublicly = true` aparece com nome completo | Projeção dedicada, nunca reuso do DTO interno |
| RN-SHARE-005 | O token público tem ≥128 bits de entropia e é opaco | `[R]` | — | 32 bytes base64url |
| RN-SHARE-006 | Geração de imagem é assíncrona: `202` + `status` consultável | `[C]` (Instagram/TikTok) + `[R]` `DP-020` | Formato `LINK` é síncrono | Polling ou push quando pronto |
| RN-SHARE-007 | O backend **não** publica em rede social; não há OAuth nem token social | `[R]` | — | Elimina uma classe inteira de risco |
| RN-SHARE-008 | Página pública tem `X-Robots-Tag: noindex, nofollow` | `[R]` | — | Evita indexação de nome de pessoa física |
| RN-SHARE-009 | Um usuário pode se **excluir** de cards públicos; aparece como "Jogador" e sem avatar | `[R]` (LGPD — oposição) | — | Preferência `share_stats_publicly = false` + opt-out específico |

## 6.14 Idempotência, concorrência e auditoria (`RN-IDEM`, `RN-CONC`, `RN-AUDIT`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-IDEM-001 | `Idempotency-Key` (UUID) é **obrigatório** em: `POST /matches`, `/matches/{id}/events`, `/matches/{id}/finish`, `/matches/{id}/corrections`, `/leagues`, `/play-sessions`, `/friend-requests`, `/leagues/{id}/invitations` | `[R]` | GETs e DELETEs (idempotentes por natureza) | `400 IDEMPOTENCY_KEY_REQUIRED` |
| RN-IDEM-002 | Mesma chave + mesmo corpo → **replica** a resposta original (mesmo status e body) | `[R]` | — | `idempotency_records` |
| RN-IDEM-003 | Mesma chave + corpo **diferente** → `422 IDEMPOTENCY_KEY_REUSE` | `[R]` | — | Comparação por SHA-256 do corpo canonicalizado |
| RN-IDEM-004 | Chave em processamento concorrente → `409 IDEMPOTENT_REQUEST_IN_PROGRESS` com `Retry-After: 1` | `[R]` | — | Estado `IN_PROGRESS` |
| RN-IDEM-005 | Registros de idempotência vivem **24 h** | `[R]` | — | Job de limpeza |
| RN-CONC-001 | Recursos mutáveis expõem `ETag` no GET e exigem `If-Match` em mutação de estado | `[R]` | POSTs de criação | `428` se ausente, `412`/`409` se divergente |
| RN-CONC-002 | Conflito devolve `409 CONCURRENT_MODIFICATION` com o estado atual no corpo, para o app reconciliar sem novo GET | `[R]` | — | |
| RN-CONC-003 | Locks de linha são adquiridos sempre na mesma ordem (por `user_id` crescente) | `[R]` | — | Prevenção de deadlock |
| RN-CONC-004 | Rebuild de ranking usa advisory lock por liga | `[R]` | — | |
| RN-CONC-005 | Duas tentativas simultâneas de abrir a jogatina do mesmo dia: uma vence, a outra **reaproveita** a existente (não é erro) | `[R]` | — | `ON CONFLICT DO NOTHING` + releitura |
| RN-AUDIT-001 | Toda ação da lista de §4.16 gera `AuditLog` na **mesma transação** da mutação | `[R]` | — | Se a auditoria falha, a operação falha |
| RN-AUDIT-002 | `AuditLog` é imutável (append-only), retido por 5 anos | `[R]` | — | Permissões de banco + trigger |
| RN-AUDIT-003 | Nunca registrar senha, token, hash ou payload de credencial na auditoria | `[R]` (LGPD/segurança) | — | Lista de campos permitidos, não lista de bloqueio |
| RN-AUDIT-004 | A trilha de correções de uma partida é **visível aos participantes** no app | `[I]` | — | "Resultado corrigido por Felipe em 15/07 — motivo: …" |

## 6.15 Privacidade e dados pessoais (`RN-PRIV`)

| ID | Regra | Origem | Exceções | Impacto técnico |
|---|---|---|---|---|
| RN-PRIV-001 | Geolocalização exige consentimento explícito registrado (`locationConsentAt` + versão) | `[R]` (LGPD art. 8º) | — | Sem consentimento, aba Locais opera em modo busca textual |
| RN-PRIV-002 | Coordenadas do usuário não são persistidas nem logadas | `[R]` | — | Filtro de sanitização no logger |
| RN-PRIV-003 | Exportação de dados entrega **tudo** que se refere ao titular em formato legível (JSON + CSV), em até 15 dias — na prática, minutos | `[R]` (LGPD art. 18, V) | Dados de terceiros são pseudonimizados no export | Job assíncrono; link com TTL de 72 h |
| RN-PRIV-004 | Exclusão de conta é atendida por **anonimização** irreversível, preservando o histórico de terceiros | `[R]` (LGPD art. 16, III) | — | Ver RN-USER-007 |
| RN-PRIV-005 | Retenção: `login_attempts` 90 dias · IP em `refresh_tokens` 90 dias · notificações lidas 12 meses · `user_daily_stats` 24 meses · `audit_logs` 5 anos | `[R]` | — | Jobs de expurgo com métricas |
| RN-PRIV-006 | Logs de aplicação nunca contêm e-mail, senha, token, coordenada ou corpo de requisição de auth | `[R]` | — | Redator estruturado; teste automatizado que falha o build se vazar |
| RN-PRIV-007 | Busca de usuários não revela e-mail nem permite busca **por** e-mail | `[R]` (anti-enumeração) | — | Só `q` sobre `username` e `displayName` |
| RN-PRIV-008 | O usuário pode se tornar não-buscável (`searchableByUsername = false`); ainda assim pode ser convidado por quem já é amigo | `[R]` | — | |
| RN-PRIV-009 | Menores de 18 anos: o produto não coleta data de nascimento no MVP e, portanto, não pode ser direcionado a crianças. Termos devem exigir 18+ | `[P]` `DP-029` (LGPD art. 14) | — | Se Produto quiser público adolescente, exige consentimento parental e muda o cadastro |
