# 8d. Endpoints — Jogatinas, partidas e eventos

> Este é o núcleo transacional do produto. Todos os exemplos reproduzem a **jogatina de 14/07/2026 da Liga da Terça** e a **partida 9 (Rodrigo × João)**, que é a tela "Partida em andamento" do mockup (relógio `21:47`).

---

# Módulo Play Sessions

## SESSION-01 · Obter (ou abrir) a jogatina corrente da liga

| | |
|---|---|
| **Caso de uso** | `OpenOrGetCurrentSession` — a operação por trás do botão "Iniciar partida" |
| **Método / Rota** | `GET /leagues/{leagueId}/play-sessions/current` |
| **Autenticação** | Bearer |
| **Permissões** | Membro ativo da liga |
| **Tela** | Liga → Ranking → "Iniciar partida" (`[C]`); topbar "Jogatina de 14 jul" (`[C]`) |

**Path params:** `leagueId` (uuid).

**Query params**

| Param | Tipo | Obrig. | Default | Descrição |
|---|---|:--:|---|---|
| `createIfMissing` | boolean | ✖ | `false` | `true` abre a jogatina do dia se não houver nenhuma (`DP-012`) |
| `include` | string (csv) | ✖ | — | `ranking`, `participants`, `matches` |

```http
GET /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001/play-sessions/current?createIfMissing=true&include=ranking
Authorization: Bearer eyJ…
```

**`200 OK`** — jogatina já existia (`ETag: W/"9"`)
**`201 Created`** — jogatina foi aberta agora (`Location`, `ETag: W/"1"`)
**`204 No Content`** — não há jogatina aberta e `createIfMissing=false`

```json
{
  "id": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
  "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
  "leagueName": "Liga da Terça",
  "businessDate": "2026-07-14",
  "label": "Jogatina de 14 jul",
  "status": "IN_PROGRESS",
  "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" },
  "timezone": "America/Sao_Paulo",
  "openedAt": "2026-07-14T23:00:00Z",
  "openedBy": { "id": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni" },
  "closedAt": null,
  "outOfSchedule": false,
  "counters": { "matchesCount": 8, "participantsCount": 4, "activeMatchesCount": 0 },
  "myStats": { "wins": 3, "losses": 0, "matchesPlayed": 3, "position": 1 },
  "ranking": [
    { "position": 1, "user": { "id": "11111111-1111-4111-8111-111111111111", "username": "baroni", "displayName": "Rodrigo Baroni", "initials": "RB", "avatarColor": "#C1E778" }, "wins": 3, "losses": 0, "matchesPlayed": 3, "isMe": true },
    { "position": 2, "user": { "id": "33333333-3333-4333-8333-333333333333", "username": "felipao", "displayName": "Felipe Costa", "initials": "FE", "avatarColor": "#f4a261" }, "wins": 3, "losses": 1, "matchesPlayed": 4, "isMe": false },
    { "position": 3, "user": { "id": "22222222-2222-4222-8222-222222222222", "username": "joaop", "displayName": "João Pereira", "initials": "JO", "avatarColor": "#8ecae6" }, "wins": 2, "losses": 1, "matchesPlayed": 3, "isMe": false },
    { "position": 4, "user": { "id": "44444444-4444-4444-8444-444444444444", "username": "ander", "displayName": "Anderson Lima", "initials": "AN", "avatarColor": "#e9c46a" }, "wins": 0, "losses": 6, "matchesPlayed": 6, "isMe": false }
  ],
  "permissions": { "canStartMatch": true, "canAddParticipant": true, "canClose": true, "canShare": true },
  "createdAt": "2026-07-14T23:00:00Z",
  "updatedAt": "2026-07-15T00:45:31Z",
  "version": 9
}
```

> `businessDate` = `2026-07-14` mesmo quando a chamada acontece à `00:20` local do dia 15 — a janela da liga cruza a meia-noite (RN-SESSION-003).
> Empate entre Rodrigo e Felipe em vitórias (3 e 3): o desempate por **menos derrotas** coloca Rodrigo em 1º — 0 contra 1 (RN-RANKING-009). É por isso que o pódio não pode ser ordenado no cliente.

**Erros**

| Status | `code` | Quando |
|---|---|---|
| `403` | `NOT_LEAGUE_MEMBER` | Não é membro ativo |
| `404` | `LEAGUE_NOT_FOUND` | |
| `409` | `LEAGUE_FINISHED` | Liga encerrada e `createIfMissing=true` |

**Efeitos colaterais** (quando cria) — `PlaySession` + `PlaySessionParticipant` do criador; `sessionsCount++` na liga; agenda o fechamento automático.
**Eventos** — `PlaySessionStarted`.
**Idempotência** — o unique parcial `(league_id, business_date)` garante que duas chamadas simultâneas não criem duas jogatinas: quem perde a corrida relê e devolve `200` com a existente (RN-CONC-005).

## SESSION-02 · Criar jogatina explicitamente

| | |
|---|---|
| **Método / Rota** | `POST /play-sessions` |
| **Permissões** | Membro ativo |
| **Headers** | `Idempotency-Key` obrigatório |

| Campo | Tipo | Obrig. | Validação | Descrição |
|---|---|:--:|---|---|
| `leagueId` | uuid | ✔ | Liga ativa da qual é membro | |
| `businessDate` | date | ✖ | Entre hoje-7 e hoje+7 no fuso da liga; default = hoje | Permite registrar uma noite passada `[R]` |
| `venueId` | uuid | ✖ | Local ativo; default = local da liga | |
| `participantUserIds` | array\<uuid\> | ✖ | ≤20, todos membros ativos | Pré-cadastro de quem apareceu |
| `notes` | string | ✖ | ≤500 | |

**`201 Created`** — mesmo corpo de SESSION-01.

| Status | `code` | Quando |
|---|---|---|
| `409` | `SESSION_ALREADY_EXISTS` | Já existe jogatina para (liga, data) — extensão `playSessionId`; o app deve usá-la |
| `409` | `SESSION_ALREADY_OPEN` | Já existe **outra** jogatina aberta na liga (RN-SESSION-001) |
| `409` | `LEAGUE_FINISHED` | |
| `422` | `BUSINESS_DATE_OUT_OF_RANGE` | Fora da janela de ±7 dias |
| `403` | `NOT_LEAGUE_MEMBER` | |

## SESSION-03 · Consultar jogatina

`GET /play-sessions/{playSessionId}?include=ranking,participants,matches` · membro da liga

**`200 OK`** — mesmo schema de SESSION-01. Com `include=matches`, adiciona `matches[]` no formato de LEAGUE-14.
Erros: `404 PLAY_SESSION_NOT_FOUND`, `403 NOT_LEAGUE_MEMBER`.

## SESSION-04 · Ranking / pódio da jogatina

| | |
|---|---|
| **Caso de uso** | `GetSessionRanking` |
| **Método / Rota** | `GET /play-sessions/{playSessionId}/ranking` |
| **Tela** | Seleção de adversário ("N vitórias hoje") e modal de pódio (`[C]`) |

```http
GET /api/v1/play-sessions/7c8d9e0f-1a2b-4c3d-8e4f-000000000001/ranking
```

**`200 OK`** — estado **após** a partida 9 (o momento do modal de compartilhamento):
```json
{
  "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
  "businessDate": "2026-07-14",
  "label": "Jogatina de 14 jul",
  "league": { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça" },
  "status": "IN_PROGRESS",
  "isFinal": false,
  "items": [
    { "position": 1, "medal": "GOLD",   "user": { "id": "11111111-1111-4111-8111-111111111111", "username": "baroni",  "displayName": "Rodrigo Baroni", "initials": "RB", "avatarColor": "#C1E778" }, "wins": 4, "losses": 0, "matchesPlayed": 4, "isMe": true },
    { "position": 2, "medal": "SILVER", "user": { "id": "33333333-3333-4333-8333-333333333333", "username": "felipao", "displayName": "Felipe Costa",   "initials": "FE", "avatarColor": "#f4a261" }, "wins": 3, "losses": 1, "matchesPlayed": 4, "isMe": false },
    { "position": 3, "medal": "BRONZE", "user": { "id": "22222222-2222-4222-8222-222222222222", "username": "joaop",   "displayName": "João Pereira",   "initials": "JO", "avatarColor": "#8ecae6" }, "wins": 2, "losses": 2, "matchesPlayed": 4, "isMe": false },
    { "position": 4, "medal": null,     "user": { "id": "44444444-4444-4444-8444-444444444444", "username": "ander",   "displayName": "Anderson Lima",  "initials": "AN", "avatarColor": "#e9c46a" }, "wins": 0, "losses": 6, "matchesPlayed": 6, "isMe": false }
  ],
  "meta": { "totalItems": 4, "updatedAt": "2026-07-15T01:08:23Z" }
}
```

> Reproduz o card do modal: 🥇 Rodrigo — 4 vitórias · 🥈 Felipe — 3 · 🥉 João — 2 · 4º Anderson — 0 (`[C]`).
> `isFinal: false` porque a jogatina segue aberta — o texto na UI deve ser "**está** em 1º lugar" (`INC-07`).
> `medal` é calculado no servidor, incluindo o caso de empate (`DP-027`: medalhas compartilhadas).

Erros: `403 NOT_LEAGUE_MEMBER`, `404 PLAY_SESSION_NOT_FOUND`.
Cache: `private, max-age=10, must-revalidate`.

## SESSION-05 · Adicionar participante

| | |
|---|---|
| **Método / Rota** | `POST /play-sessions/{playSessionId}/participants` |
| **Permissões** | Membro ativo da liga |
| **Objetivo** | Registrar quem apareceu mas ainda não jogou — é assim que "Anderson — 0 vitórias" aparece no pódio (`[C]`, RN-SESSION-007) |

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `userIds` | array\<uuid\> | ✔ | 1–20, membros ativos da liga |

**`200 OK`**
```json
{
  "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
  "added": [{ "userId": "55555555-5555-4555-8555-555555555555", "displayName": "Marcos Silva", "joinedAt": "2026-07-15T00:50:00Z" }],
  "alreadyPresent": ["44444444-4444-4444-8444-444444444444"],
  "participantsCount": 5
}
```

| Status | `code` | Quando |
|---|---|---|
| `403` | `NOT_LEAGUE_MEMBER` | Solicitante ou algum `userId` não é membro |
| `409` | `SESSION_CLOSED` | |
| `422` | `TOO_MANY_PARTICIPANTS` | > 20 |

## SESSION-06 · Encerrar jogatina

| | |
|---|---|
| **Método / Rota** | `POST /play-sessions/{playSessionId}/close` |
| **Permissões** | `ADMIN`/`OWNER` da liga ou quem abriu (RN-SESSION-008) |
| **Headers** | `If-Match`, `Idempotency-Key` |

| Campo | Tipo | Obrig. | Default | Descrição |
|---|---|:--:|---|---|
| `force` | boolean | ✖ | `false` | Cancela partidas em andamento (`SESSION_CLOSED`) |
| `generateShare` | boolean | ✖ | `false` | Já dispara o card do pódio |

**`200 OK`**
```json
{
  "id": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
  "status": "CLOSED",
  "closedAt": "2026-07-15T01:15:00Z",
  "closedBy": { "id": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni" },
  "closedReason": "MANUAL",
  "finalPodium": [
    { "position": 1, "medal": "GOLD",   "userId": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni", "wins": 4, "losses": 0 },
    { "position": 2, "medal": "SILVER", "userId": "33333333-3333-4333-8333-333333333333", "displayName": "Felipe Costa",   "wins": 3, "losses": 1 },
    { "position": 3, "medal": "BRONZE", "userId": "22222222-2222-4222-8222-222222222222", "displayName": "João Pereira",   "wins": 2, "losses": 2 },
    { "position": 4, "medal": null,     "userId": "44444444-4444-4444-8444-444444444444", "displayName": "Anderson Lima",  "wins": 0, "losses": 6 }
  ],
  "counters": { "matchesCount": 9, "participantsCount": 4 },
  "shareArtifactId": null,
  "version": 11
}
```

| Status | `code` | Quando |
|---|---|---|
| `403` | `INSUFFICIENT_LEAGUE_ROLE` | |
| `409` | `SESSION_ALREADY_CLOSED` | |
| `409` | `SESSION_HAS_ACTIVE_MATCHES` | `force = false` — extensão `activeMatchIds[]` |
| `409` | `CONCURRENT_MODIFICATION` | |
| `428` | `PRECONDITION_REQUIRED` | |

**Efeitos colaterais** — congela o pódio (`isFinal: true`), notifica participantes (`SESSION_CLOSED_PODIUM`), recalcula `nextSessionAt` da liga, cancela em cascata se `force`.
**Eventos** — `PlaySessionClosed`, `MatchCancelled` (×N), `ShareArtifactRequested` (se `generateShare`).

## SESSION-07 · Resumo para compartilhamento

`GET /play-sessions/{playSessionId}/summary` — ver [08e](08e-endpoints-venues-notif-sharing.md#share-01--resumo-da-jogatina).

## SESSION-08 · Reabrir jogatina

`POST /play-sessions/{playSessionId}/reopen` · `ADMIN`/`OWNER`, até 12 h após o fechamento (RN-SESSION-011)

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `reason` | string | ✔ | 5–300 |

**`200 OK`** — jogatina com `status: IN_PROGRESS`.
Erros: `403 INSUFFICIENT_LEAGUE_ROLE`, `403 REOPEN_WINDOW_EXPIRED`, `409 SESSION_NOT_CLOSED`, `409 LEAGUE_FINISHED`, `409 ANOTHER_SESSION_OPEN`.
`AuditLog(SESSION_REOPENED)` obrigatório.

---

# Módulo Matches

## MATCH-01 · Iniciar partida

| | |
|---|---|
| **Caso de uso** | `StartMatch` |
| **Método / Rota** | `POST /matches` |
| **Autenticação** | Bearer |
| **Permissões** | Membro ativo da liga (não precisa ser um dos jogadores — RN-MATCH-006) |
| **Tela** | Nova partida → "Começar partida" (`[C]`) |

**Headers**

| Header | Obrig. | Valor |
|---|:--:|---|
| `Authorization` | ✔ | `Bearer <access_token>` |
| `Content-Type` | ✔ | `application/json` |
| `Idempotency-Key` | ✔ | UUID — **crítico**: rede de bar gera retry |

**Request body**

| Campo | Tipo | Obrig. | Formato | Validação | Descrição |
|---|---|:--:|---|---|---|
| `leagueId` | uuid | ✔¹ | UUID | Liga `ACTIVE` da qual é membro | |
| `playSessionId` | uuid | ✖¹ | UUID | Jogatina `IN_PROGRESS` da liga | Se omitido, resolve/abre a do dia (`DP-012`) |
| `participants` | array\<object\> | ✔ | — | 2 itens em `ONE_VS_ONE`; 4 em `TEAM_2V2` | |
| `participants[].userId` | uuid | ✔ | UUID | Membro ativo, sem repetição, ≠ entre si | |
| `participants[].side` | integer | ✔ | 1 ou 2 | Exatamente 1 por lado em 1v1; 2 por lado em duplas | |
| `startedAt` | date-time | ✖ | ISO 8601 UTC | Entre `now-6h` e `now+5min` | Registro retroativo dentro da noite |
| `notes` | string | ✖ | texto | ≤300 | |

¹ `leagueId` é obrigatório; `playSessionId` é opcional. Se ambos vierem, precisam ser coerentes.

**Exemplo de request**
```http
POST /api/v1/matches HTTP/1.1
Host: api.encacapei.com.br
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImVuYy0yMDI2LTAzIn0…
Content-Type: application/json
Idempotency-Key: 5f8a3b2c-1d4e-4a6b-9c7d-000000000009

{
  "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
  "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
  "participants": [
    { "userId": "11111111-1111-4111-8111-111111111111", "side": 1 },
    { "userId": "22222222-2222-4222-8222-222222222222", "side": 2 }
  ]
}
```

**Exemplo de sucesso — `201 Created`**
```http
HTTP/1.1 201 Created
Location: /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009
ETag: W/"1"
```
```json
{
  "id": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
  "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
  "sessionLabel": "Jogatina de 14 jul",
  "businessDate": "2026-07-14",
  "league": { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça" },
  "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" },
  "status": "IN_PROGRESS",
  "resultStatus": "ORIGINAL",
  "gameMode": "ONE_VS_ONE",
  "rules": { "trackPocketedBalls": true, "trackFouls": true, "ballsCount": 8 },
  "winnerSide": null,
  "startedAt": "2026-07-15T00:47:00Z",
  "finishedAt": null,
  "durationSeconds": null,
  "createdBy": { "id": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni" },
  "participants": [
    {
      "userId": "11111111-1111-4111-8111-111111111111",
      "username": "baroni",
      "displayName": "Rodrigo Baroni",
      "avatarUrl": null,
      "initials": "RB",
      "avatarColor": "#C1E778",
      "side": 1,
      "isWinner": null,
      "ballsPocketed": 0,
      "fouls": 0,
      "winsInSession": 3,
      "lossesInSession": 0,
      "isMe": true
    },
    {
      "userId": "22222222-2222-4222-8222-222222222222",
      "username": "joaop",
      "displayName": "João Pereira",
      "avatarUrl": "https://cdn.encacapei.com.br/avatars/22222222-2222-4222-8222-222222222222/256.webp",
      "initials": "JO",
      "avatarColor": "#8ecae6",
      "side": 2,
      "isWinner": null,
      "ballsPocketed": 0,
      "fouls": 0,
      "winsInSession": 2,
      "lossesInSession": 1,
      "isMe": false
    }
  ],
  "tableState": { "ballsCount": 8, "pocketedBalls": [], "remainingBalls": [1, 2, 3, 4, 5, 6, 7, 8] },
  "eventsCount": 0,
  "permissions": { "canRecordEvent": true, "canFinish": true, "canCancel": true, "canCorrect": false },
  "createdAt": "2026-07-15T00:47:00Z",
  "updatedAt": "2026-07-15T00:47:00Z",
  "version": 1
}
```

> `winsInSession` é o "**3 vitórias hoje**" / "**1 vitória hoje**" exibido sob cada avatar (`[C]`; aqui João tem 2 pelo dataset canônico — ver `INC-04`).
> `tableState` já vem pronto para a grade de 8 bolas.

**Erros**

| Status | `code` | Quando | Extensões |
|---|---|---|---|
| `400` | `IDEMPOTENCY_KEY_REQUIRED` | Header ausente | |
| `403` | `NOT_LEAGUE_MEMBER` | Solicitante fora da liga | |
| `404` | `LEAGUE_NOT_FOUND` / `PLAY_SESSION_NOT_FOUND` | | |
| `409` | `LEAGUE_FINISHED` | Liga encerrada (RN-MATCH-019) | |
| `409` | `SESSION_CLOSED` | Jogatina fechada | `playSessionId` |
| `409` | `PLAYER_ALREADY_IN_MATCH` | Algum jogador já está em partida `IN_PROGRESS` (RN-MATCH-005) | `userId`, `conflictingMatchId` — o app oferece "retomar" ou "cancelar a anterior" |
| `409` | `FEATURE_NOT_AVAILABLE` | `TEAM_2V2` no MVP | `feature: "teamMatches"` |
| `409` | `IDEMPOTENT_REQUEST_IN_PROGRESS` | Retry durante o processamento | `Retry-After: 1` |
| `422` | `INVALID_PARTICIPANT_COUNT` | ≠ 2 em 1v1 | `expected: 2, received: 3` |
| `422` | `INVALID_SIDE_DISTRIBUTION` | Dois jogadores no mesmo lado em 1v1 | |
| `422` | `DUPLICATE_PARTICIPANT` | Mesmo `userId` duas vezes (RN-MATCH-003) | |
| `422` | `PARTICIPANT_NOT_LEAGUE_MEMBER` | Algum jogador não é membro ativo (RN-MATCH-004) | `userId` |
| `422` | `STARTED_AT_OUT_OF_RANGE` | Fora de `now-6h … now+5min` | |
| `422` | `IDEMPOTENCY_KEY_REUSE` | Mesma chave, corpo diferente | |
| `429` | `RATE_LIMIT_EXCEEDED` | 120/min | |

**Efeitos colaterais** — cria `Match` + 2 `MatchParticipant` + participantes da jogatina (se novos); define `users.active_match_id` para os jogadores; `matchesCount++` na jogatina; congela `rules_snapshot`.
**Eventos** — `MatchStarted`, `PlaySessionParticipantAdded` (se novos).
**Idempotência** — obrigatória. Replay devolve `201` com o mesmo `id` e `Idempotent-Replay: true`.
**Concorrência** — `users.active_match_id` é unique: dois celulares tentando abrir a mesma partida ao mesmo tempo → um cria, o outro recebe `409 PLAYER_ALREADY_IN_MATCH` com o `conflictingMatchId`, que é justamente a partida recém-criada. O app trata esse caso navegando para ela.

---

## MATCH-02 · Consultar partida

| | |
|---|---|
| **Método / Rota** | `GET /matches/{matchId}` |
| **Permissões** | Participante da partida, membro da liga, ou qualquer autenticado se a liga for `PUBLIC` |
| **Tela** | Partida em andamento; retomada após fechar o app (`[C]`/`[I]`) |

**Query params:** `include` (csv) — `events`, `corrections`.

```http
GET /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009?include=events
Authorization: Bearer eyJ…
```

**`200 OK`** (`ETag: W/"3"`) — estado exato da tela do mockup, com as bolas **2 e 4 encaçapadas**:
```json
{
  "id": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
  "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
  "sessionLabel": "Jogatina de 14 jul",
  "businessDate": "2026-07-14",
  "league": { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça" },
  "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" },
  "status": "IN_PROGRESS",
  "resultStatus": "ORIGINAL",
  "gameMode": "ONE_VS_ONE",
  "rules": { "trackPocketedBalls": true, "trackFouls": true, "ballsCount": 8 },
  "winnerSide": null,
  "startedAt": "2026-07-15T00:47:00Z",
  "finishedAt": null,
  "durationSeconds": null,
  "createdBy": { "id": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni" },
  "finishedBy": null,
  "participants": [
    { "userId": "11111111-1111-4111-8111-111111111111", "username": "baroni", "displayName": "Rodrigo Baroni", "avatarUrl": null, "initials": "RB", "avatarColor": "#C1E778", "side": 1, "isWinner": null, "ballsPocketed": 1, "fouls": 0, "winsInSession": 3, "lossesInSession": 0, "isMe": true },
    { "userId": "22222222-2222-4222-8222-222222222222", "username": "joaop", "displayName": "João Pereira", "avatarUrl": "https://cdn.encacapei.com.br/avatars/22222222-2222-4222-8222-222222222222/256.webp", "initials": "JO", "avatarColor": "#8ecae6", "side": 2, "isWinner": null, "ballsPocketed": 1, "fouls": 0, "winsInSession": 2, "lossesInSession": 1, "isMe": false }
  ],
  "tableState": {
    "ballsCount": 8,
    "pocketedBalls": [
      { "ballNumber": 2, "eventId": "ae1b2c3d-4e5f-4a60-8b71-000000000001", "pocketedByUserId": "11111111-1111-4111-8111-111111111111", "occurredAt": "2026-07-15T00:49:12Z" },
      { "ballNumber": 4, "eventId": "ae1b2c3d-4e5f-4a60-8b71-000000000002", "pocketedByUserId": "22222222-2222-4222-8222-222222222222", "occurredAt": "2026-07-15T00:52:40Z" }
    ],
    "remainingBalls": [1, 3, 5, 6, 7, 8]
  },
  "events": [
    { "id": "ae1b2c3d-4e5f-4a60-8b71-000000000001", "sequence": 1, "type": "BALL_POCKETED", "ballNumber": 2, "actorUserId": "11111111-1111-4111-8111-111111111111", "actorDisplayName": "Rodrigo Baroni", "side": 1, "recordedByUserId": "11111111-1111-4111-8111-111111111111", "occurredAt": "2026-07-15T00:49:12Z", "undoneAt": null },
    { "id": "ae1b2c3d-4e5f-4a60-8b71-000000000002", "sequence": 2, "type": "BALL_POCKETED", "ballNumber": 4, "actorUserId": "22222222-2222-4222-8222-222222222222", "actorDisplayName": "João Pereira", "side": 2, "recordedByUserId": "11111111-1111-4111-8111-111111111111", "occurredAt": "2026-07-15T00:52:40Z", "undoneAt": null }
  ],
  "eventsCount": 2,
  "correctionCount": 0,
  "permissions": { "canRecordEvent": true, "canFinish": true, "canCancel": true, "canCorrect": false },
  "createdAt": "2026-07-15T00:47:00Z",
  "updatedAt": "2026-07-15T00:52:40Z",
  "version": 3
}
```

Erros: `403 NOT_MATCH_PARTICIPANT` (liga pública, detalhe restrito), `404 MATCH_NOT_FOUND`.
Cache: `no-store` enquanto `IN_PROGRESS`; `private, max-age=300` quando `FINISHED`.

---

## MATCH-03 · Registrar evento (bola encaçapada / falta)

| | |
|---|---|
| **Caso de uso** | `RecordMatchEvent` |
| **Método / Rota** | `POST /matches/{matchId}/events` |
| **Permissões** | Participante da partida ou `ADMIN`/`OWNER` da liga |
| **Tela** | Partida → toque numa bola não encaçapada (`[C]`) |

**Headers:** `Idempotency-Key` obrigatório; `If-Match` **opcional** (ver observação).

**Request body**

| Campo | Tipo | Obrig. | Formato | Validação | Descrição |
|---|---|:--:|---|---|---|
| `type` | string | ✔ | enum | `BALL_POCKETED` \| `FOUL` | Tipo do evento |
| `ballNumber` | integer | ✔¹ | — | 1 – `rules.ballsCount`; não pode estar encaçapada | Obrigatório em `BALL_POCKETED` |
| `actorUserId` | uuid | ✖ | UUID | Deve ser participante da partida | Quem encaçapou / cometeu a falta (`DP-014`) |
| `occurredAt` | date-time | ✖ | ISO UTC | Entre `startedAt` e `now+5min`; default `now` | Suporta fila local do app |

¹ Proibido em `FOUL`.

**Exemplo de request**
```http
POST /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/events HTTP/1.1
Authorization: Bearer eyJ…
Content-Type: application/json
Idempotency-Key: 7b1c2d3e-4f50-4617-8829-000000000012

{
  "type": "BALL_POCKETED",
  "ballNumber": 8,
  "actorUserId": "11111111-1111-4111-8111-111111111111"
}
```

**Exemplo de sucesso — `201 Created`** (`ETag: W/"4"`)
```json
{
  "event": {
    "id": "ae1b2c3d-4e5f-4a60-8b71-000000000003",
    "matchId": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
    "sequence": 3,
    "type": "BALL_POCKETED",
    "ballNumber": 8,
    "actorUserId": "11111111-1111-4111-8111-111111111111",
    "actorDisplayName": "Rodrigo Baroni",
    "side": 1,
    "recordedByUserId": "11111111-1111-4111-8111-111111111111",
    "occurredAt": "2026-07-15T01:07:55Z",
    "undoneAt": null
  },
  "tableState": {
    "ballsCount": 8,
    "pocketedBalls": [
      { "ballNumber": 2, "eventId": "ae1b2c3d-4e5f-4a60-8b71-000000000001", "pocketedByUserId": "11111111-1111-4111-8111-111111111111", "occurredAt": "2026-07-15T00:49:12Z" },
      { "ballNumber": 4, "eventId": "ae1b2c3d-4e5f-4a60-8b71-000000000002", "pocketedByUserId": "22222222-2222-4222-8222-222222222222", "occurredAt": "2026-07-15T00:52:40Z" },
      { "ballNumber": 8, "eventId": "ae1b2c3d-4e5f-4a60-8b71-000000000003", "pocketedByUserId": "11111111-1111-4111-8111-111111111111", "occurredAt": "2026-07-15T01:07:55Z" }
    ],
    "remainingBalls": [1, 3, 5, 6, 7]
  },
  "participants": [
    { "userId": "11111111-1111-4111-8111-111111111111", "ballsPocketed": 2, "fouls": 0 },
    { "userId": "22222222-2222-4222-8222-222222222222", "ballsPocketed": 1, "fouls": 0 }
  ],
  "suggestion": { "type": "SUGGEST_FINISH", "reason": "EIGHT_BALL_POCKETED", "suggestedWinnerSide": 1 },
  "matchVersion": 4
}
```

> `suggestion` é **dica de UX, não decisão de negócio** (RN-EVENT-008): quando a bola 8 cai, o app pode abrir o diálogo "Encerrar partida? Rodrigo venceu?" — mas o servidor não finaliza nada sozinho.

**Erros**

| Status | `code` | Quando | Extensões |
|---|---|---|---|
| `400` | `IDEMPOTENCY_KEY_REQUIRED` | | |
| `403` | `NOT_MATCH_PARTICIPANT` | Terceiro tentando registrar (RN-EVENT-005) | |
| `404` | `MATCH_NOT_FOUND` | | |
| `409` | `MATCH_NOT_IN_PROGRESS` | Partida finalizada/cancelada (RN-EVENT-001) | `currentStatus` |
| `409` | `BALL_ALREADY_POCKETED` | Bola já está fora da mesa (RN-EVENT-003) | `ballNumber`, `existingEventId` |
| `409` | `EVENT_TYPE_DISABLED` | `FOUL` com `trackFouls = false`, ou `BALL_POCKETED` com `trackPocketedBalls = false` (RN-EVENT-006) | `disabledType` |
| `422` | `INVALID_BALL_NUMBER` | Fora de 1..`ballsCount` (RN-EVENT-002) | `ballsCount` |
| `422` | `BALL_NUMBER_NOT_ALLOWED` | `ballNumber` enviado em `FOUL` | |
| `422` | `ACTOR_NOT_PARTICIPANT` | `actorUserId` fora da partida | |
| `422` | `OCCURRED_AT_OUT_OF_RANGE` | Antes do início ou muito no futuro | |
| `429` | `RATE_LIMIT_EXCEEDED` | 120/min | |

**Efeitos colaterais** — cria `MatchEvent`; atualiza `MatchParticipant.ballsPocketed`/`fouls`; incrementa `match.version`.
**Eventos** — `MatchEventRecorded`.
**Idempotência** — chave obrigatória. **Este é o endpoint mais sujeito a duplo toque**: dois toques rápidos na mesma bola geram duas requisições. Com chaves diferentes, a segunda cai no `409 BALL_ALREADY_POCKETED` (o unique parcial protege); com a mesma chave, é replay silencioso.
**Concorrência `[R]`** — `If-Match` é **opcional aqui, propositalmente**: exigir a versão exata numa tela em que dois celulares registram bolas alternadamente geraria conflitos constantes sem ganho — o unique de bola já garante a invariante real. Nos endpoints de **finalização e correção**, `If-Match` é obrigatório.

---

## MATCH-04 · Desfazer evento

| | |
|---|---|
| **Caso de uso** | `UndoMatchEvent` |
| **Método / Rota** | `DELETE /matches/{matchId}/events/{eventId}` |
| **Tela** | Partida → toque numa bola **já** encaçapada (toggle) (`[C]`) |

**`200 OK`**
```json
{
  "event": { "id": "ae1b2c3d-4e5f-4a60-8b71-000000000003", "type": "BALL_POCKETED", "ballNumber": 8, "undoneAt": "2026-07-15T01:08:05Z", "undoneByUserId": "11111111-1111-4111-8111-111111111111" },
  "tableState": {
    "ballsCount": 8,
    "pocketedBalls": [
      { "ballNumber": 2, "eventId": "ae1b2c3d-4e5f-4a60-8b71-000000000001", "pocketedByUserId": "11111111-1111-4111-8111-111111111111", "occurredAt": "2026-07-15T00:49:12Z" },
      { "ballNumber": 4, "eventId": "ae1b2c3d-4e5f-4a60-8b71-000000000002", "pocketedByUserId": "22222222-2222-4222-8222-222222222222", "occurredAt": "2026-07-15T00:52:40Z" }
    ],
    "remainingBalls": [1, 3, 5, 6, 7, 8]
  },
  "participants": [
    { "userId": "11111111-1111-4111-8111-111111111111", "ballsPocketed": 1, "fouls": 0 },
    { "userId": "22222222-2222-4222-8222-222222222222", "ballsPocketed": 1, "fouls": 0 }
  ],
  "matchVersion": 5
}
```

| Status | `code` | Quando |
|---|---|---|
| `403` | `NOT_MATCH_PARTICIPANT` | |
| `404` | `MATCH_EVENT_NOT_FOUND` | Evento inexistente ou de outra partida |
| `409` | `MATCH_NOT_IN_PROGRESS` | |
| `409` | `EVENT_ALREADY_UNDONE` | Idempotente na prática — o app trata como sucesso |

**Efeitos** — `undoneAt` preenchido (**nunca** `DELETE` físico — RN-EVENT-004); contadores recalculados; `AuditLog(MATCH_EVENT_UNDONE)`.
**Eventos** — `MatchEventUndone`.

## MATCH-05 · Listar eventos da partida

`GET /matches/{matchId}/events?includeUndone=true&limit=100` → `{ "items": [...], "meta": {...} }` com o schema de `event` acima, ordenado por `sequence`.

---

## MATCH-06 · Finalizar partida

| | |
|---|---|
| **Caso de uso** | `FinishMatch` |
| **Método / Rota** | `POST /matches/{matchId}/finish` |
| **Permissões** | Participante da partida ou `ADMIN`/`OWNER` da liga |
| **Tela** | Partida → botões **"Venceu"** / **"Perdeu"** (`[C]`) |

**Headers**

| Header | Obrig. | Valor |
|---|:--:|---|
| `Authorization` | ✔ | Bearer |
| `Content-Type` | ✔ | `application/json` |
| `Idempotency-Key` | ✔ | UUID |
| `If-Match` | ✔ | `W/"5"` |

**Request body**

| Campo | Tipo | Obrig. | Formato | Validação | Descrição |
|---|---|:--:|---|---|---|
| `winnerSide` | integer | ✔¹ | 1 ou 2 | Lado existente na partida | Contrato canônico (RN-MATCH-009) |
| `winnerUserId` | uuid | ✔¹ | UUID | Participante da partida | Alternativa conveniente para 1v1; o servidor deriva `winnerSide` |
| `finishedAt` | date-time | ✖ | ISO UTC | ≥ `startedAt`, ≤ `now+5min` | |
| `notes` | string | ✖ | texto | ≤300 | |

¹ Exatamente um dos dois.

> **Por que não "eu venci / eu perdi"** `[R]`: o botão da UI é relativo ao usuário logado, mas quem registra pode ser um terceiro (RN-MATCH-006), e duplas não têm "eu". O app traduz: "Venceu" → `winnerSide` do meu lado; "Perdeu" → o outro lado.

**Exemplo de request**
```http
POST /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/finish HTTP/1.1
Authorization: Bearer eyJ…
Content-Type: application/json
Idempotency-Key: 9c2d3e4f-5061-4728-893a-000000000019
If-Match: W/"5"

{ "winnerSide": 1 }
```

**Exemplo de sucesso — `200 OK`** (`ETag: W/"6"`)
```json
{
  "match": {
    "id": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
    "status": "FINISHED",
    "resultStatus": "ORIGINAL",
    "winnerSide": 1,
    "startedAt": "2026-07-15T00:47:00Z",
    "finishedAt": "2026-07-15T01:08:22Z",
    "durationSeconds": 1282,
    "finishedBy": { "id": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni" },
    "participants": [
      { "userId": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni", "side": 1, "isWinner": true,  "ballsPocketed": 1, "fouls": 0 },
      { "userId": "22222222-2222-4222-8222-222222222222", "displayName": "João Pereira",   "side": 2, "isWinner": false, "ballsPocketed": 1, "fouls": 0 }
    ],
    "myResult": "WIN",
    "correctionDeadline": "2026-07-16T01:08:22Z",
    "version": 6
  },
  "leagueRanking": {
    "updated": true,
    "myEntry": { "position": 2, "previousPosition": 4, "wins": 7, "losses": 4, "winRate": 63.64 },
    "opponentEntries": [
      { "userId": "22222222-2222-4222-8222-222222222222", "position": 3, "previousPosition": 3, "wins": 5, "losses": 4, "winRate": 55.56 }
    ]
  },
  "sessionRanking": {
    "isFinal": false,
    "myPosition": 1,
    "podium": [
      { "position": 1, "medal": "GOLD",   "userId": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni", "wins": 4, "losses": 0 },
      { "position": 2, "medal": "SILVER", "userId": "33333333-3333-4333-8333-333333333333", "displayName": "Felipe Costa",   "wins": 3, "losses": 1 },
      { "position": 3, "medal": "BRONZE", "userId": "22222222-2222-4222-8222-222222222222", "displayName": "João Pereira",   "wins": 2, "losses": 2 },
      { "position": 4, "medal": null,     "userId": "44444444-4444-4444-8444-444444444444", "displayName": "Anderson Lima",  "wins": 0, "losses": 6 }
    ]
  },
  "streak": { "currentWinStreak": 5, "longestWinStreak": 7, "isPersonalBest": false }
}
```

> **Uma única chamada entrega tudo que o modal de vitória precisa** (`[R]`): a posição no pódio, o pódio completo e a atualização de ranking. Sem isso, o app faria 3 requisições logo após tocar em "Venceu" — na pior rede do fluxo inteiro.

**Erros**

| Status | `code` | Quando | Extensões |
|---|---|---|---|
| `400` | `IDEMPOTENCY_KEY_REQUIRED` | | |
| `403` | `NOT_MATCH_PARTICIPANT` | | |
| `404` | `MATCH_NOT_FOUND` | | |
| `409` | `MATCH_ALREADY_FINISHED` | Já finalizada com chave diferente (RN-MATCH-010) | `winnerSide`, `finishedAt`, `finishedBy` |
| `409` | `MATCH_CANCELLED` | | |
| `409` | `CONCURRENT_MODIFICATION` | `If-Match` divergente — corpo traz o estado atual | `currentVersion` |
| `409` | `LEAGUE_FINISHED` | Liga encerrada no meio da partida | |
| `422` | `INVALID_WINNER_SIDE` | Lado inexistente | |
| `422` | `WINNER_NOT_PARTICIPANT` | `winnerUserId` fora da partida | |
| `422` | `AMBIGUOUS_WINNER` | Os dois campos enviados e divergentes | |
| `422` | `FINISHED_AT_BEFORE_START` | | |
| `428` | `PRECONDITION_REQUIRED` | `If-Match` ausente | |

**Efeitos colaterais — transação síncrona (RN-MATCH-011)**
1. `Match.status = FINISHED`, `winnerSide`, `finishedAt`, `finishedBy`, `version++`
2. `MatchParticipant.isWinner` dos dois lados
3. `LeagueRankingEntry` dos envolvidos (`wins`/`losses`/`winRate`/`streak`) e **recálculo de posições da liga**
4. `SessionRankingEntry` e posições da jogatina
5. `league.matchesCount++`, `league.lastActivityAt`, `session.matchesCount++`
6. Limpa `users.active_match_id` dos dois jogadores
7. Grava outbox: `MatchFinished`

**Assíncrono (outbox)** — `UserStatistics`, `UserDailyStat`, `HeadToHeadStat`, notificação `MATCH_FINISHED` ao adversário (se ele não foi quem registrou — RN-NOTIF-007).
**Eventos** — `MatchFinished`, `RankingUpdated`.
**Concorrência** — locks nas `LeagueRankingEntry` adquiridos em ordem crescente de `user_id` (RN-CONC-003).

---

## MATCH-07 · Cancelar partida

| | |
|---|---|
| **Método / Rota** | `POST /matches/{matchId}/cancel` |
| **Permissões** | Participante ou `ADMIN`/`OWNER` |
| **Headers** | `If-Match`, `Idempotency-Key` |
| **Tela** | Não desenhada — necessária para abandono (`[I]`, RN-MATCH-014) |

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `reason` | string | ✔ | `ABANDONED` \| `MISTAKE` \| `OTHER` |
| `note` | string | ✖ | ≤300; obrigatório se `reason = OTHER` |

**`200 OK`**
```json
{
  "id": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
  "status": "CANCELLED",
  "cancelReason": "MISTAKE",
  "note": "Partida aberta por engano com o adversário errado",
  "cancelledAt": "2026-07-15T00:48:10Z",
  "cancelledBy": { "id": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni" },
  "rankingImpact": "NONE",
  "version": 3
}
```

| Status | `code` | Quando |
|---|---|---|
| `403` | `NOT_MATCH_PARTICIPANT` | |
| `409` | `MATCH_ALREADY_FINISHED` | Partida finalizada — usar correção |
| `409` | `MATCH_ALREADY_CANCELLED` | |
| `409` | `CONCURRENT_MODIFICATION` / `428 PRECONDITION_REQUIRED` | |
| `422` | `CANCEL_NOTE_REQUIRED` | `reason = OTHER` sem `note` |

**Efeitos** — `CANCELLED`; eventos preservados (RN-EVENT-009); **não** afeta ranking (RN-MATCH-013); limpa `active_match_id`; `AuditLog(MATCH_CANCELLED)`.
**Eventos** — `MatchCancelled`.

---

## MATCH-08 · Corrigir resultado

| | |
|---|---|
| **Caso de uso** | `CorrectMatchResult` |
| **Método / Rota** | `POST /matches/{matchId}/corrections` |
| **Permissões** | Participante dentro de 24 h de `finishedAt`; depois disso só `ADMIN`/`OWNER` (`DP-003`, RN-MATCH-015) |
| **Headers** | `If-Match`, `Idempotency-Key` |
| **Tela** | Não desenhada — necessária e prevista no escopo (`[I]`) |

| Campo | Tipo | Obrig. | Formato | Validação | Descrição |
|---|---|:--:|---|---|---|
| `winnerSide` | integer | ✔¹ | 1 ou 2 | Diferente do atual (RN-MATCH-018) | |
| `winnerUserId` | uuid | ✔¹ | UUID | Participante | |
| `reason` | string | ✔ | texto | 5–300 | Obrigatório — é o que encerra a discussão |
| `finishedAt` | date-time | ✖ | ISO UTC | Correção de horário | |

¹ Exatamente um.

```http
POST /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/corrections
Authorization: Bearer eyJ…
Content-Type: application/json
Idempotency-Key: b4c5d6e7-f809-4a1b-8c2d-000000000021
If-Match: W/"6"

{ "winnerSide": 2, "reason": "Marcamos errado: quem venceu foi o João, a bola 8 caiu na caçapa errada." }
```

**`202 Accepted`** (`Location: /api/v1/ranking-rebuilds/…`)
```json
{
  "correction": {
    "id": "d5e6f708-192a-4b3c-8d4e-000000000001",
    "matchId": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
    "previousResult": { "winnerSide": 1, "winnerUserIds": ["11111111-1111-4111-8111-111111111111"] },
    "newResult": { "winnerSide": 2, "winnerUserIds": ["22222222-2222-4222-8222-222222222222"] },
    "reason": "Marcamos errado: quem venceu foi o João, a bola 8 caiu na caçapa errada.",
    "correctedBy": { "id": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni" },
    "createdAt": "2026-07-15T01:22:40Z"
  },
  "match": {
    "id": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
    "status": "FINISHED",
    "resultStatus": "CORRECTED",
    "winnerSide": 2,
    "correctionCount": 1,
    "version": 7
  },
  "rankingRebuild": {
    "jobId": "f6a7b8c9-0d1e-4f2a-8b3c-000000000001",
    "status": "QUEUED",
    "scope": ["LEAGUE_RANKING", "SESSION_RANKING", "USER_STATISTICS", "HEAD_TO_HEAD"],
    "statusUrl": "/api/v1/ranking-rebuilds/f6a7b8c9-0d1e-4f2a-8b3c-000000000001",
    "estimatedCompletionSeconds": 3
  }
}
```

**Erros**

| Status | `code` | Quando | Extensões |
|---|---|---|---|
| `403` | `NOT_MATCH_PARTICIPANT` | | |
| `403` | `CORRECTION_WINDOW_EXPIRED` | Passou de 24 h e não é admin | `deadline`, `correctionWindowHours` |
| `404` | `MATCH_NOT_FOUND` | | |
| `409` | `MATCH_NOT_FINISHED` | Partida em andamento ou cancelada | `currentStatus` |
| `409` | `CONCURRENT_MODIFICATION` / `428` | | |
| `409` | `LEAGUE_FINISHED` | Liga encerrada — só admin de plataforma | |
| `422` | `CORRECTION_NO_CHANGE` | Mesmo vencedor (RN-MATCH-018) | |
| `422` | `VALIDATION_ERROR` | `reason` fora de 5–300 | |
| `429` | `RATE_LIMIT_EXCEEDED` | 5 correções/dia por usuário `[R]` |

**Efeitos colaterais** — cria `MatchCorrection`; atualiza `Match` (`resultStatus = CORRECTED`) e `MatchParticipant.isWinner`; enfileira rebuild; `AuditLog(MATCH_RESULT_CORRECTED)`; **notifica todos os participantes** (RN-MATCH-016).
**Eventos** — `MatchResultCorrected`, `RankingRebuildRequested`.
**Observação `[R]`** — `202` (e não `200`) porque o ranking pode não estar consistente no instante da resposta. Para ligas pequenas (< 500 partidas), o rebuild é síncrono e o servidor pode responder `200` com o ranking já atualizado; o contrato suporta os dois (o app checa `rankingRebuild.status`).

## MATCH-09 · Histórico de correções

`GET /matches/{matchId}/corrections` · participantes e membros da liga

**`200 OK`**
```json
{
  "items": [
    {
      "id": "d5e6f708-192a-4b3c-8d4e-000000000001",
      "previousResult": { "winnerSide": 1, "winnerUserIds": ["11111111-1111-4111-8111-111111111111"] },
      "newResult": { "winnerSide": 2, "winnerUserIds": ["22222222-2222-4222-8222-222222222222"] },
      "reason": "Marcamos errado: quem venceu foi o João, a bola 8 caiu na caçapa errada.",
      "correctedBy": { "id": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni", "initials": "RB" },
      "createdAt": "2026-07-15T01:22:40Z"
    }
  ],
  "meta": { "totalItems": 1 }
}
```

> É a trilha exigida por RN-AUDIT-004: "Resultado corrigido por Rodrigo em 14/07 às 22:22 — motivo: …".

## MATCH-10 · Status do reprocessamento de ranking

`GET /ranking-rebuilds/{jobId}` · membro da liga

**`200 OK`**
```json
{
  "jobId": "f6a7b8c9-0d1e-4f2a-8b3c-000000000001",
  "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
  "triggeredBy": "MATCH_CORRECTION",
  "sourceMatchId": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
  "status": "COMPLETED",
  "scope": ["LEAGUE_RANKING", "SESSION_RANKING", "USER_STATISTICS", "HEAD_TO_HEAD"],
  "matchesProcessed": 25,
  "entriesUpdated": 5,
  "positionChanges": [
    { "userId": "11111111-1111-4111-8111-111111111111", "from": 2, "to": 3 },
    { "userId": "22222222-2222-4222-8222-222222222222", "from": 3, "to": 2 }
  ],
  "queuedAt": "2026-07-15T01:22:40Z",
  "startedAt": "2026-07-15T01:22:41Z",
  "completedAt": "2026-07-15T01:22:43Z",
  "error": null
}
```

`status` ∈ `QUEUED` \| `RUNNING` \| `COMPLETED` \| `FAILED`.
Erros: `404 RANKING_REBUILD_NOT_FOUND`, `403 NOT_LEAGUE_MEMBER`.
