# 8c. Endpoints — Ligas, membros e convites

# Módulo Leagues

## LEAGUE-01 · Criar liga

| | |
|---|---|
| **Caso de uso** | `CreateLeague` — conclusão do wizard de 3 passos |
| **Método / Rota** | `POST /leagues` |
| **Autenticação** | Bearer (e-mail verificado — RN-AUTH-008) |
| **Permissões** | Qualquer usuário ativo |
| **Tela** | FAB "Criar liga" → wizard (`[C]`) |

**Headers**

| Header | Obrig. | Valor |
|---|:--:|---|
| `Authorization` | ✔ | `Bearer <access_token>` |
| `Content-Type` | ✔ | `application/json` |
| `Idempotency-Key` | ✔ | UUID |

**Request body**

| Campo | Tipo | Obrig. | Formato | Validação | Descrição |
|---|---|:--:|---|---|---|
| `name` | string | ✔ | texto | 3–60 chars, trim | Passo 1 — "Liga da Terça" |
| `description` | string | ✖ | texto | ≤500 | |
| `visibility` | string | ✖ | enum | `PUBLIC`\|`PRIVATE`, default `PRIVATE` | Deriva da busca "ligas públicas" (`[C]`) |
| `venueId` | uuid | ✖¹ | UUID | Local `ACTIVE` existente | Passo 1 — autocomplete "Bar do Zé" |
| `venueLabel` | string | ✖¹ | texto | ≤120 | Local em texto livre quando não está no catálogo |
| `durationType` | string | ✔ | enum | `ONE_DAY`\|`SIX_MONTHS`\|`UNLIMITED` | Passo 1 — chips (default do mockup: `SIX_MONTHS`) |
| `startsAt` | date | ✖ | `YYYY-MM-DD` | ≥ hoje-1d e ≤ hoje+365d; default hoje | |
| `gameMode` | string | ✖ | enum | `ONE_VS_ONE`\|`TEAM_2V2`, default `ONE_VS_ONE` | Passo 2 — chips |
| `schedule` | object | ✖ | — | — | Passo 1 e 2 |
| `schedule.weekdays` | array\<string\> | ✖ | enum | 0–7 itens, sem repetição: `MONDAY`…`SUNDAY` | Chips "Seg…Dom" (mockup: `TUESDAY`, `FRIDAY`) |
| `schedule.startTime` | string | ✖ | `HH:mm` | 00:00–23:59, default `20:00` | |
| `schedule.endTime` | string | ✖ | `HH:mm` | default `00:00`; se ≤ `startTime`, cruza a meia-noite | |
| `schedule.timezone` | string | ✖ | IANA | default = fuso do usuário | |
| `schedule.reminderMinutesBefore` | integer | ✖ | — | 0–1440, default `60` | Lembrete "começa em 1 hora" (`[C]`) |
| `rules` | object | ✖ | — | — | Passo 2 |
| `rules.trackPocketedBalls` | boolean | ✖ | — | default `true` | Toggle "Marca bola caída?" (`[C]`, ON) |
| `rules.trackFouls` | boolean | ✖ | — | default `false` | Toggle "Marca falta?" (`[C]`, OFF — `INC-08`) |
| `rules.ballsCount` | integer | ✖ | — | `8` ou `15`, default `8` | 8 bolas na tela de partida (`[C]`) |
| `rules.correctionWindowHours` | integer | ✖ | — | 0–720, default `24` | `DP-003` |
| `rules.minMatchesForRanking` | integer | ✖ | — | 0–50, default `0` | |
| `inviteUserIds` | array\<uuid\> | ✖ | — | ≤50, todos amigos ou usuários existentes | Passo 3 — "Convidar amigos" |
| `generateInviteCode` | boolean | ✖ | — | default `false` | Passo 3 — "Gerar código de convite" |

¹ `venueId` e `venueLabel` são mutuamente exclusivos; ambos são opcionais (liga sem local fixo é válida).

**Exemplo de request**
```http
POST /api/v1/leagues HTTP/1.1
Host: api.encacapei.com.br
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImVuYy0yMDI2LTAzIn0…
Content-Type: application/json
Idempotency-Key: d290f1ee-6c54-4b01-90e6-d701748f0851

{
  "name": "Liga da Terça",
  "visibility": "PRIVATE",
  "venueId": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001",
  "durationType": "SIX_MONTHS",
  "startsAt": "2026-07-28",
  "gameMode": "ONE_VS_ONE",
  "schedule": {
    "weekdays": ["TUESDAY", "FRIDAY"],
    "startTime": "20:00",
    "endTime": "00:00",
    "timezone": "America/Sao_Paulo",
    "reminderMinutesBefore": 60
  },
  "rules": {
    "trackPocketedBalls": true,
    "trackFouls": false,
    "ballsCount": 8,
    "correctionWindowHours": 24
  },
  "inviteUserIds": [
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444",
    "55555555-5555-4555-8555-555555555555"
  ],
  "generateInviteCode": true
}
```

**Exemplo de sucesso — `201 Created`**
```http
HTTP/1.1 201 Created
Location: /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001
ETag: W/"1"
Content-Type: application/json; charset=utf-8
```
```json
{
  "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
  "name": "Liga da Terça",
  "description": null,
  "visibility": "PRIVATE",
  "status": "ACTIVE",
  "gameMode": "ONE_VS_ONE",
  "durationType": "SIX_MONTHS",
  "startsAt": "2026-07-28",
  "endsAt": "2027-01-28",
  "owner": {
    "id": "11111111-1111-4111-8111-111111111111",
    "username": "baroni",
    "displayName": "Rodrigo Baroni",
    "avatarUrl": null,
    "initials": "RB",
    "avatarColor": "#C1E778"
  },
  "venue": {
    "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001",
    "name": "Bar do Zé",
    "addressLine": "R. Domingos de Morais, 1234",
    "neighborhood": "Vila Mariana",
    "city": "São Paulo",
    "state": "SP",
    "latitude": -23.561414,
    "longitude": -46.655881
  },
  "venueLabel": null,
  "schedule": {
    "weekdays": ["TUESDAY", "FRIDAY"],
    "startTime": "20:00",
    "endTime": "00:00",
    "crossesMidnight": true,
    "timezone": "America/Sao_Paulo",
    "reminderMinutesBefore": 60,
    "humanReadable": "Terças e sextas, 20h–00h"
  },
  "rules": {
    "trackPocketedBalls": true,
    "trackFouls": false,
    "ballsCount": 8,
    "requireOpponentConfirmation": false,
    "correctionWindowHours": 24,
    "minMatchesForRanking": 0,
    "tiebreakerOrder": ["WIN_RATE", "WINS", "FEWER_LOSSES", "HEAD_TO_HEAD", "JOINED_AT"],
    "locked": false
  },
  "counters": { "membersCount": 1, "matchesCount": 0, "sessionsCount": 0 },
  "nextSessionAt": "2026-07-28T23:00:00Z",
  "lastActivityAt": null,
  "currentSession": null,
  "myMembership": { "role": "OWNER", "status": "ACTIVE", "joinedAt": "2026-07-27T19:10:00Z" },
  "permissions": {
    "canEdit": true, "canFinish": true, "canDelete": true, "canInvite": true,
    "canGenerateCode": true, "canManageMembers": true, "canLeave": false, "canStartMatch": true
  },
  "inviteCode": {
    "code": "TERCA-7K9M",
    "expiresAt": "2026-08-03T19:10:00Z",
    "maxUses": null,
    "usesCount": 0,
    "shareUrl": "https://encacapei.com.br/j/TERCA-7K9M"
  },
  "invitationsSent": 4,
  "createdAt": "2026-07-27T19:10:00Z",
  "updatedAt": "2026-07-27T19:10:00Z",
  "version": 1
}
```

> `nextSessionAt` = terça 28/07/2026 às 20:00 `America/Sao_Paulo` = `2026-07-28T23:00:00Z` (UTC-3). Confere com "Próxima: terça, 20h" (`[C]`).
> `permissions` é calculado pelo servidor para o app não reimplementar autorização — o botão "Encerrar liga" só aparece se `canFinish = true`.

**Erros**

| Status | `code` | Quando |
|---|---|---|
| `400` | `IDEMPOTENCY_KEY_REQUIRED` | Header ausente |
| `403` | `EMAIL_NOT_VERIFIED` | RN-AUTH-008 |
| `404` | `VENUE_NOT_FOUND` | `venueId` inexistente ou inativo |
| `409` | `FEATURE_NOT_AVAILABLE` | `gameMode = TEAM_2V2` no MVP (`DP-013`) — extensão `feature: "teamMatches"` |
| `422` | `VALIDATION_ERROR` | `NAME_TOO_SHORT`, `INVALID_WEEKDAY`, `DUPLICATE_WEEKDAY`, `INVALID_TIME_FORMAT`, `INVALID_TIMEZONE`, `START_DATE_IN_PAST`, `VENUE_CONFLICT` (ambos os campos de local), `TOO_MANY_INVITES` (>50), `INVALID_BALLS_COUNT` |
| `422` | `IDEMPOTENCY_KEY_REUSE` | Chave repetida com corpo diferente |
| `429` | `RATE_LIMIT_EXCEEDED` | 10 ligas/dia `[R]` |

**Efeitos colaterais** — em **uma transação**: `League` + `LeagueRule` + `LeagueSchedule` + `LeagueScheduleWeekday[]` + `LeagueMember(OWNER)` + `LeagueRankingEntry` zerada + (opcional) `LeagueInviteCode` + N `LeagueInvitation`. Se `durationType = ONE_DAY`, abre também a `PlaySession` do dia (RN-LEAGUE-016). Fora da transação (outbox): notificações de convite.
**Eventos** — `LeagueCreated`, `LeagueInvitationSent` (×N), `InviteCodeGenerated`, `PlaySessionStarted` (se `ONE_DAY`).
**Idempotência** — obrigatória; replay devolve `201` com o mesmo `id` e `Idempotent-Replay: true`.
**Concorrência** — não há conflito na criação.
**Observação `[R]`** — o wizard pode alternativamente criar a liga ao entrar no passo 3 e chamar os endpoints de convite separadamente (§2.7). Este contrato suporta os dois fluxos: `inviteUserIds` e `generateInviteCode` são opcionais.

---

## LEAGUE-02 · Listar minhas ligas

| | |
|---|---|
| **Caso de uso** | `ListMyLeagues` |
| **Método / Rota** | `GET /me/leagues` |
| **Tela** | Home ("Ligas ativas") e aba Liga (seções Ativas/Encerradas) (`[C]`) |

**Query params**

| Param | Tipo | Default | Valores |
|---|---|---|---|
| `status` | string (csv) | todos | `ACTIVE`, `FINISHED`, `ARCHIVED` |
| `q` | string | — | 2–60 |
| `page` / `pageSize` | integer | 1 / 20 | `pageSize` ≤ 100 |
| `sort` | string | `-lastActivityAt` | `name`, `createdAt`, `lastActivityAt`, `nextSessionAt` (com `-`) |
| `limit` | integer | — | Atalho para a Home (`?limit=3`) |

```http
GET /api/v1/me/leagues?status=ACTIVE&sort=-lastActivityAt
```

**`200 OK`**
```json
{
  "items": [
    {
      "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
      "name": "Liga da Terça",
      "status": "ACTIVE",
      "visibility": "PRIVATE",
      "gameMode": "ONE_VS_ONE",
      "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" },
      "counters": { "membersCount": 5, "matchesCount": 27, "sessionsCount": 9 },
      "nextSessionAt": "2026-07-28T23:00:00Z",
      "lastActivityAt": "2026-07-15T01:08:22Z",
      "myMembership": { "role": "OWNER", "status": "ACTIVE" },
      "myRanking": { "position": 2, "wins": 7, "losses": 4, "winRate": 63.64 },
      "hasActiveSession": false,
      "scheduleSummary": "Terças e sextas, 20h–00h"
    },
    {
      "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000002",
      "name": "Ranking do Bar do Zé",
      "status": "ACTIVE",
      "visibility": "PUBLIC",
      "gameMode": "ONE_VS_ONE",
      "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" },
      "counters": { "membersCount": 8, "matchesCount": 61, "sessionsCount": 17 },
      "nextSessionAt": "2026-07-31T00:00:00Z",
      "lastActivityAt": "2026-07-24T02:40:00Z",
      "myMembership": { "role": "PLAYER", "status": "ACTIVE" },
      "myRanking": { "position": 4, "wins": 12, "losses": 9, "winRate": 57.14 },
      "hasActiveSession": false,
      "scheduleSummary": "Sextas, 21h–01h"
    }
  ],
  "meta": { "totalItems": 2, "page": 1, "pageSize": 20, "totalPages": 1, "hasMore": false }
}
```

> **`INC-02` resolvido no contrato:** `matchesCount` = **todas as partidas `FINISHED`** da liga (**27** na Liga da Terça — inclui as 4 que envolveram o ex-membro Ricardo Alves; README §0.6). O mockup exibia 32; o rótulo da UI deve dizer "27 partidas".
> `nextSessionAt` da Liga do Bar do Zé: sexta 31/07 às 21:00 BRT = `2026-07-31T00:00:00Z`.

**Erros:** `401`, `422 INVALID_SORT_FIELD`.
**Observação:** a Home usa `?limit=3` sem filtro de status (`INC-05`), e o rótulo da seção deve ser "Suas ligas".

---

## LEAGUE-03 · Buscar ligas públicas

| | |
|---|---|
| **Caso de uso** | `SearchPublicLeagues` |
| **Método / Rota** | `GET /leagues/public` |
| **Tela** | Ligas → "Buscar ligas públicas..." (`[C]`) |

**Query params**

| Param | Tipo | Obrig. | Default | Validação |
|---|---|:--:|---|---|
| `q` | string | ✖ | — | 2–60 |
| `venueId` | uuid | ✖ | — | |
| `lat` / `lng` | number | ✖ | — | Ordena por proximidade do local da liga |
| `radiusKm` | number | ✖ | 10 | 0,1–50 |
| `limit` | integer | ✖ | 20 | 1–50 |
| `cursor` | string | ✖ | — | |
| `sort` | string | ✖ | `relevance` | `relevance`, `membersCount`, `lastActivityAt`, `distance` |

```http
GET /api/v1/leagues/public?q=bar&lat=-23.5583&lng=-46.6604&radiusKm=10
```

**`200 OK`**
```json
{
  "items": [
    {
      "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000002",
      "name": "Ranking do Bar do Zé",
      "description": "Todo mundo é bem-vindo, sexta à noite.",
      "status": "ACTIVE",
      "visibility": "PUBLIC",
      "gameMode": "ONE_VS_ONE",
      "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé", "neighborhood": "Vila Mariana", "city": "São Paulo", "distanceKm": 2.4 },
      "owner": { "id": "33333333-3333-4333-8333-333333333333", "username": "felipao", "displayName": "Felipe Costa" },
      "counters": { "membersCount": 8, "matchesCount": 61 },
      "scheduleSummary": "Sextas, 21h–01h",
      "nextSessionAt": "2026-07-31T00:00:00Z",
      "alreadyMember": true,
      "canJoin": false,
      "joinPolicy": "OPEN"
    }
  ],
  "meta": { "totalItems": 1, "pageSize": 20, "hasMore": false, "nextCursor": null }
}
```

`joinPolicy` ∈ `OPEN` (entra direto) \| `APPROVAL_REQUIRED` (`DP-006`) \| `INVITE_ONLY`.

**Erros:** `422 SEARCH_QUERY_TOO_SHORT`, `422 INVALID_COORDINATES`, `429 RATE_LIMIT_EXCEEDED`.
**Privacidade:** ligas `PRIVATE` nunca aparecem (RN-LEAGUE-013), nem sob busca por nome exato.

---

## LEAGUE-04 · Consultar detalhes da liga

| | |
|---|---|
| **Caso de uso** | `GetLeague` |
| **Método / Rota** | `GET /leagues/{leagueId}` |
| **Permissões** | Membro; ou qualquer autenticado se `PUBLIC` (visão resumida) |
| **Tela** | Liga → topbar + aba Config (`[C]`) |

**Path params:** `leagueId` (uuid).
**Query params:** `include` (csv) — `ranking`, `currentSession`, `members`.

```http
GET /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001?include=currentSession
Authorization: Bearer eyJ…
If-None-Match: W/"6"
```

**`200 OK`** (`ETag: W/"7"`) — mesmo schema de LEAGUE-01, com estado atual:
```json
{
  "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
  "name": "Liga da Terça",
  "description": null,
  "visibility": "PRIVATE",
  "status": "ACTIVE",
  "gameMode": "ONE_VS_ONE",
  "durationType": "SIX_MONTHS",
  "startsAt": "2026-01-14",
  "endsAt": "2026-07-14",
  "owner": { "id": "11111111-1111-4111-8111-111111111111", "username": "baroni", "displayName": "Rodrigo Baroni", "initials": "RB", "avatarColor": "#C1E778" },
  "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé", "addressLine": "R. Domingos de Morais, 1234", "neighborhood": "Vila Mariana", "city": "São Paulo", "state": "SP", "latitude": -23.561414, "longitude": -46.655881 },
  "schedule": { "weekdays": ["TUESDAY"], "startTime": "20:00", "endTime": "00:00", "crossesMidnight": true, "timezone": "America/Sao_Paulo", "reminderMinutesBefore": 60, "humanReadable": "Terças, 20h–00h" },
  "rules": { "trackPocketedBalls": true, "trackFouls": true, "ballsCount": 8, "requireOpponentConfirmation": false, "correctionWindowHours": 24, "minMatchesForRanking": 0, "tiebreakerOrder": ["WIN_RATE","WINS","FEWER_LOSSES","HEAD_TO_HEAD","JOINED_AT"], "locked": true, "lockedAt": "2026-01-21T23:35:00Z" },
  "counters": { "membersCount": 5, "matchesCount": 27, "sessionsCount": 9 },
  "nextSessionAt": "2026-07-28T23:00:00Z",
  "lastActivityAt": "2026-07-15T01:08:22Z",
  "currentSession": null,
  "myMembership": { "role": "OWNER", "status": "ACTIVE", "joinedAt": "2026-01-14T22:10:00Z" },
  "myRanking": { "position": 2, "wins": 7, "losses": 4, "winRate": 63.64 },
  "permissions": { "canEdit": true, "canFinish": true, "canDelete": false, "canInvite": true, "canGenerateCode": true, "canManageMembers": true, "canLeave": false, "canStartMatch": true },
  "createdAt": "2026-01-14T22:10:00Z",
  "updatedAt": "2026-07-15T02:21:16Z",
  "version": 7
}
```

> `rules.locked: true` porque a liga já tem partidas finalizadas (RN-LEAGUE-009) — o app deve **desabilitar** os chips de estilo de jogo e os toggles na aba Config, em vez de deixar o usuário salvar e receber `409`.
> `permissions.canDelete: false` porque há histórico (RN-LEAGUE-012).

**Visão de não-membro em liga `PUBLIC`** — omite `rules` detalhadas, `myRanking`, `currentSession`, e traz `permissions` todo `false` com `canJoin: true`.

**Erros**

| Status | `code` | Quando |
|---|---|---|
| `304` | — | `If-None-Match` bateu |
| `404` | `LEAGUE_NOT_FOUND` | Inexistente **ou** privada sem vínculo (§3.3) |

---

## LEAGUE-05 · Editar liga

| | |
|---|---|
| **Caso de uso** | `UpdateLeague` |
| **Método / Rota** | `PATCH /leagues/{leagueId}` |
| **Permissões** | `ADMIN` ou `OWNER` |
| **Tela** | Liga → Config → "Salvar"; modal do local → "Atrelar liga a este local" (`[C]`) |

**Headers:** `If-Match: W/"7"` (obrigatório), `Content-Type`.

**Request body** (todos opcionais)

| Campo | Tipo | Validação | Observação |
|---|---|---|---|
| `name` | string | 3–60 | |
| `description` | string \| null | ≤500 | |
| `visibility` | string | `PUBLIC`\|`PRIVATE` | Tornar pública exige `OWNER` `[R]` |
| `venueId` | uuid \| null | Local ativo | `null` desatrela (`[I]`); afeta só jogatinas futuras (RN-LEAGUE-015) |
| `venueLabel` | string \| null | ≤120 | |
| `gameMode` | string | `ONE_VS_ONE`\|`TEAM_2V2` | **Bloqueado** se `rules.locked` |
| `durationType` | string | enum | Recalcula `endsAt` |
| `endsAt` | date \| null | ≥ `startsAt` | Sobrescreve o derivado |
| `schedule.weekdays` | array | 0–7 itens | Recalcula `nextSessionAt` e lembretes |
| `schedule.startTime` / `endTime` | string | `HH:mm` | |
| `schedule.timezone` | string | IANA | |
| `schedule.reminderMinutesBefore` | integer | 0–1440 | |
| `rules.trackPocketedBalls` | boolean | | **Bloqueado** se `rules.locked` |
| `rules.trackFouls` | boolean | | **Bloqueado** se `rules.locked` |
| `rules.ballsCount` | integer | 8\|15 | **Bloqueado** se `rules.locked` |
| `rules.correctionWindowHours` | integer | 0–720 | Sempre editável |
| `rules.minMatchesForRanking` | integer | 0–50 | Dispara recálculo de posições |
| `rules.tiebreakerOrder` | array\<string\> | Enums válidos, sem repetição | Dispara recálculo de posições |

```http
PATCH /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001
Authorization: Bearer eyJ…
Content-Type: application/json
If-Match: W/"7"

{ "name": "Liga da Terça", "venueId": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "rules": { "trackFouls": true } }
```

**`200 OK`** — recurso completo, `ETag: W/"8"`.

**Erros**

| Status | `code` | Quando |
|---|---|---|
| `403` | `INSUFFICIENT_LEAGUE_ROLE` | Membro comum tentando editar |
| `404` | `LEAGUE_NOT_FOUND` / `VENUE_NOT_FOUND` | |
| `409` | `CONCURRENT_MODIFICATION` | `If-Match` divergente — corpo traz `currentVersion` e o estado atual |
| `409` | `LEAGUE_FINISHED` | Liga encerrada (RN-LEAGUE-010) |
| `409` | `LEAGUE_RULES_LOCKED` | Campo bloqueado após a 1ª partida — extensão `lockedFields: ["gameMode","rules.trackPocketedBalls"]` |
| `409` | `FEATURE_NOT_AVAILABLE` | `TEAM_2V2` |
| `422` | `VALIDATION_ERROR` | Como em LEAGUE-01 |
| `428` | `PRECONDITION_REQUIRED` | `If-Match` ausente |

**Efeitos colaterais** — `AuditLog(LEAGUE_UPDATED` / `LEAGUE_RULES_CHANGED)`; recálculo de `nextSessionAt`; reagendamento de lembretes; notificação `LEAGUE_RULES_CHANGED` aos membros quando regra de jogo muda `[I]`.
**Eventos** — `LeagueUpdated`, `LeagueRulesChanged`.

---

## LEAGUE-06 · Encerrar liga

| | |
|---|---|
| **Caso de uso** | `FinishLeague` |
| **Método / Rota** | `POST /leagues/{leagueId}/finish` |
| **Permissões** | `OWNER` |
| **Tela** | Liga → Config → "Encerrar liga" (botão vermelho) (`[C]`) |

**Headers:** `If-Match`, `Idempotency-Key`.

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `reason` | string | ✖ | ≤300 |
| `force` | boolean | ✖ | default `false` — cancela jogatinas/partidas abertas |

**`200 OK`**
```json
{
  "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000003",
  "name": "Copa Fim de Ano",
  "status": "FINISHED",
  "finishedAt": "2026-07-27T19:20:00Z",
  "finishedBy": { "id": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni" },
  "finalRanking": {
    "frozenAt": "2026-07-27T19:20:00Z",
    "champion": { "userId": "33333333-3333-4333-8333-333333333333", "displayName": "Felipe Costa", "wins": 12, "losses": 6, "winRate": 66.67 },
    "entriesCount": 6
  },
  "sideEffects": { "sessionsClosed": 0, "matchesCancelled": 0, "invitationsExpired": 2, "inviteCodesRevoked": 1 },
  "version": 12
}
```

**Erros**

| Status | `code` | Quando |
|---|---|---|
| `403` | `INSUFFICIENT_LEAGUE_ROLE` | Não é `OWNER` |
| `409` | `LEAGUE_ALREADY_FINISHED` | |
| `409` | `LEAGUE_HAS_ACTIVE_SESSION` | Jogatina aberta e `force = false` — extensão `playSessionId` |
| `409` | `CONCURRENT_MODIFICATION` | |
| `428` | `PRECONDITION_REQUIRED` | |

**Efeitos colaterais** — `status = FINISHED`; congela ranking (`frozenAt`); fecha jogatinas e cancela partidas em aberto (se `force`); expira convites e revoga códigos; notifica todos os membros; `AuditLog(LEAGUE_FINISHED)`.
**Eventos** — `LeagueFinished`, `PlaySessionClosed` (×N), `MatchCancelled` (×N), `RankingFrozen`.

## LEAGUE-07 · Excluir liga

`DELETE /leagues/{leagueId}` · `OWNER` · `If-Match` obrigatório · **`204 No Content`**

| Status | `code` | Quando |
|---|---|---|
| `409` | `LEAGUE_HAS_HISTORY` | Existe partida finalizada — extensão `matchesCount`; usar `finish` |
| `403` | `INSUFFICIENT_LEAGUE_ROLE` | |

Soft delete; `AuditLog(LEAGUE_DELETED)`.

---

## LEAGUE-08 · Listar membros

| | |
|---|---|
| **Caso de uso** | `ListLeagueMembers` |
| **Método / Rota** | `GET /leagues/{leagueId}/members` |
| **Tela** | Config → gerenciar membros; **seleção de adversário** (`[C]`/`[I]`) |

**Query params**

| Param | Tipo | Default | Valores |
|---|---|---|---|
| `q` | string | — | 2–60 — campo "Quem vai jogar contra?" |
| `status` | string (csv) | `ACTIVE` | `ACTIVE`, `LEFT`, `REMOVED` |
| `role` | string (csv) | todos | `OWNER`, `ADMIN`, `PLAYER` |
| `page` / `pageSize` | integer | 1 / 50 | ≤100 |
| `sort` | string | `displayName` | `displayName`, `joinedAt`, `role` |
| `include` | string (csv) | — | `sessionStats` — adiciona "N vitórias hoje" |
| `playSessionId` | uuid | — | Contexto para `sessionStats` |

```http
GET /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001/members?include=sessionStats&playSessionId=7c8d9e0f-1a2b-4c3d-8e4f-000000000001
```

**`200 OK`**
```json
{
  "items": [
    {
      "userId": "11111111-1111-4111-8111-111111111111",
      "username": "baroni",
      "displayName": "Rodrigo Baroni",
      "avatarUrl": null,
      "initials": "RB",
      "avatarColor": "#C1E778",
      "role": "OWNER",
      "status": "ACTIVE",
      "joinedAt": "2026-01-14T22:10:00Z",
      "joinedVia": "CREATOR",
      "ranking": { "position": 2, "wins": 7, "losses": 4, "winRate": 63.64 },
      "sessionStats": { "wins": 3, "losses": 0, "matchesPlayed": 3, "position": 1 },
      "isMe": true,
      "canBeRemoved": false,
      "canChangeRole": false
    },
    {
      "userId": "22222222-2222-4222-8222-222222222222",
      "username": "joaop",
      "displayName": "João Pereira",
      "avatarUrl": "https://cdn.encacapei.com.br/avatars/22222222-2222-4222-8222-222222222222/256.webp",
      "initials": "JO",
      "avatarColor": "#8ecae6",
      "role": "PLAYER",
      "status": "ACTIVE",
      "joinedAt": "2026-01-15T18:02:00Z",
      "joinedVia": "INVITATION",
      "ranking": { "position": 3, "wins": 5, "losses": 4, "winRate": 55.56 },
      "sessionStats": { "wins": 2, "losses": 1, "matchesPlayed": 3, "position": 3 },
      "isMe": false,
      "canBeRemoved": true,
      "canChangeRole": true
    },
    {
      "userId": "33333333-3333-4333-8333-333333333333",
      "username": "felipao",
      "displayName": "Felipe Costa",
      "avatarUrl": "https://cdn.encacapei.com.br/avatars/33333333-3333-4333-8333-333333333333/256.webp",
      "initials": "FE",
      "avatarColor": "#f4a261",
      "role": "ADMIN",
      "status": "ACTIVE",
      "joinedAt": "2026-01-15T18:05:00Z",
      "joinedVia": "INVITATION",
      "ranking": { "position": 1, "wins": 8, "losses": 2, "winRate": 80.00 },
      "sessionStats": { "wins": 3, "losses": 1, "matchesPlayed": 4, "position": 2 },
      "isMe": false,
      "canBeRemoved": true,
      "canChangeRole": true
    },
    {
      "userId": "44444444-4444-4444-8444-444444444444",
      "username": "ander",
      "displayName": "Anderson Lima",
      "avatarUrl": null,
      "initials": "AN",
      "avatarColor": "#e9c46a",
      "role": "PLAYER",
      "status": "ACTIVE",
      "joinedAt": "2026-01-20T19:44:00Z",
      "joinedVia": "INVITE_CODE",
      "ranking": { "position": 5, "wins": 3, "losses": 7, "winRate": 30.00 },
      "sessionStats": { "wins": 0, "losses": 6, "matchesPlayed": 6, "position": 4 },
      "isMe": false,
      "canBeRemoved": true,
      "canChangeRole": true
    },
    {
      "userId": "55555555-5555-4555-8555-555555555555",
      "username": "marcao",
      "displayName": "Marcos Silva",
      "avatarUrl": null,
      "initials": "MA",
      "avatarColor": "#c8b6ff",
      "role": "PLAYER",
      "status": "ACTIVE",
      "joinedAt": "2026-02-03T20:11:00Z",
      "joinedVia": "INVITATION",
      "ranking": { "position": 4, "wins": 4, "losses": 6, "winRate": 40.00 },
      "sessionStats": { "wins": 0, "losses": 0, "matchesPlayed": 0, "position": 5 },
      "isMe": false,
      "canBeRemoved": true,
      "canChangeRole": true
    }
  ],
  "meta": { "totalItems": 5, "page": 1, "pageSize": 50, "totalPages": 1, "hasMore": false }
}
```

> `sessionStats.wins` é exatamente o "**N vitórias hoje**" da tela de seleção de adversário (`[C]`). Os valores acima são a **parcial após 8 partidas** da jogatina de 14/07 (README §0.6), momento exato em que essa tela é exibida no mockup.

**Erros:** `403 INSUFFICIENT_LEAGUE_ROLE` (liga pública, não-membro pedindo `sessionStats`), `404 LEAGUE_NOT_FOUND`.

---

## LEAGUE-09 · Alterar papel de membro

`PATCH /leagues/{leagueId}/members/{userId}` · **`OWNER`** · `If-Match` do membro

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `role` | string | ✔ | `OWNER`\|`ADMIN`\|`PLAYER` |

```json
{ "role": "ADMIN" }
```

**`200 OK`**
```json
{
  "userId": "33333333-3333-4333-8333-333333333333",
  "displayName": "Felipe Costa",
  "role": "ADMIN",
  "previousRole": "PLAYER",
  "status": "ACTIVE",
  "changedAt": "2026-07-27T19:25:00Z",
  "version": 2
}
```

**Transferência de propriedade** (`role: "OWNER"`) — resposta inclui:
```json
{ "userId": "33333333-3333-4333-8333-333333333333", "role": "OWNER", "ownershipTransferred": true, "previousOwner": { "userId": "11111111-1111-4111-8111-111111111111", "newRole": "ADMIN" } }
```

| Status | `code` | Quando |
|---|---|---|
| `403` | `INSUFFICIENT_LEAGUE_ROLE` | Não é `OWNER` |
| `404` | `LEAGUE_MEMBER_NOT_FOUND` | |
| `409` | `CANNOT_DEMOTE_SELF_AS_OWNER` | `OWNER` tentando se rebaixar sem transferir |
| `409` | `MEMBER_NOT_ACTIVE` | Membro saiu/foi removido |
| `422` | `INVALID_ROLE` | |

**Efeitos** — transação atômica na transferência; `AuditLog(ROLE_CHANGED` / `OWNERSHIP_TRANSFERRED)`; notifica o membro.

## LEAGUE-10 · Remover membro

`DELETE /leagues/{leagueId}/members/{userId}` · `ADMIN`/`OWNER` (RN-MEMBER-005)

| Campo (body opcional) | Tipo | Validação |
|---|---|---|
| `reason` | string | ≤300 |

**`204 No Content`**

| Status | `code` | Quando |
|---|---|---|
| `403` | `INSUFFICIENT_LEAGUE_ROLE` | `ADMIN` tentando remover `ADMIN`/`OWNER` |
| `404` | `LEAGUE_MEMBER_NOT_FOUND` | |
| `409` | `CANNOT_REMOVE_OWNER` | |
| `409` | `MEMBER_HAS_ACTIVE_MATCH` | Está jogando — extensão `matchId` |

**Efeitos** — `status = REMOVED`, `membersCount--`, mantém histórico e `RankingEntry` (marcada `inactive`), notifica o removido, `AuditLog(MEMBER_REMOVED)`.

## LEAGUE-11 · Sair da liga

`POST /leagues/{leagueId}/leave` · membro · **`204 No Content`**

| Status | `code` | Quando |
|---|---|---|
| `409` | `OWNER_MUST_TRANSFER` | É `OWNER` e há outros membros — extensão `eligibleSuccessors[]` |
| `409` | `MEMBER_HAS_ACTIVE_MATCH` | |
| `404` | `LEAGUE_MEMBER_NOT_FOUND` | Não é membro |

**Caso especial:** `OWNER` único membro → sair **encerra** a liga; resposta `200` com `{"leagueFinished": true}`.

## LEAGUE-12 · Entrar em liga pública

`POST /leagues/{leagueId}/join` · Bearer · `Idempotency-Key`

**`201 Created`**
```json
{
  "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000002",
  "leagueName": "Ranking do Bar do Zé",
  "membership": { "role": "PLAYER", "status": "ACTIVE", "joinedAt": "2026-07-27T19:30:00Z", "joinedVia": "PUBLIC_JOIN" },
  "ranking": { "position": 9, "wins": 0, "losses": 0, "winRate": 0.00 }
}
```

Se `joinPolicy = APPROVAL_REQUIRED` (`DP-006`): **`202 Accepted`** com `{"status":"PENDING_APPROVAL","requestId":"…"}`.

| Status | `code` | Quando |
|---|---|---|
| `403` | `LEAGUE_IS_PRIVATE` | Liga privada — exige convite ou código |
| `409` | `ALREADY_MEMBER` | |
| `409` | `LEAGUE_FINISHED` | |
| `404` | `LEAGUE_NOT_FOUND` | |

---

# Convites de liga

## INVITE-01 · Convidar membros

| | |
|---|---|
| **Caso de uso** | `InviteUsersToLeague` |
| **Método / Rota** | `POST /leagues/{leagueId}/invitations` |
| **Permissões** | `ADMIN`/`OWNER` (participante comum só em liga `PUBLIC` — `DP-007`) |
| **Tela** | Wizard passo 3 e Config → "Convidar mais amigos" (`[C]`) |

**Headers:** `Idempotency-Key`.

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `userIds` | array\<uuid\> | ✔¹ | 1–50, sem repetição |
| `usernames` | array\<string\> | ✔¹ | 1–50 |
| `message` | string | ✖ | ≤200 |

¹ Ao menos um dos dois.

```json
{
  "userIds": [
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444"
  ],
  "message": "Bora jogar terça?"
}
```

**`207 Multi-Status`** — resultado **por destinatário** (convite em lote precisa reportar sucesso parcial):
```json
{
  "results": [
    { "userId": "22222222-2222-4222-8222-222222222222", "status": "INVITED", "invitationId": "8a9b0c1d-2e3f-4a5b-8c6d-000000000010", "expiresAt": "2026-08-03T19:35:00Z" },
    { "userId": "33333333-3333-4333-8333-333333333333", "status": "ALREADY_MEMBER", "invitationId": null },
    { "userId": "44444444-4444-4444-8444-444444444444", "status": "ALREADY_INVITED", "invitationId": "8a9b0c1d-2e3f-4a5b-8c6d-000000000004", "expiresAt": "2026-08-03T19:35:00Z", "renewed": true }
  ],
  "summary": { "invited": 1, "alreadyMember": 1, "alreadyInvited": 1, "failed": 0 }
}
```

`status` por item ∈ `INVITED` \| `ALREADY_MEMBER` \| `ALREADY_INVITED` \| `USER_NOT_FOUND` \| `USER_BLOCKED` \| `LIMIT_EXCEEDED`.
Quando há **um único** destinatário e ele é convidado com sucesso, o servidor responde `201 Created` com o convite — evita o app ter que tratar `207` no caso simples `[R]`.

| Status | `code` | Quando |
|---|---|---|
| `403` | `INSUFFICIENT_LEAGUE_ROLE` / `EMAIL_NOT_VERIFIED` | |
| `409` | `LEAGUE_FINISHED` | |
| `422` | `TOO_MANY_INVITES` | > 50 |
| `429` | `RATE_LIMIT_EXCEEDED` | 100 convites/dia por usuário |

**Efeitos** — cria/renova `LeagueInvitation` (7 dias); notifica cada convidado.
**Eventos** — `LeagueInvitationSent` (×N).

## INVITE-02 · Listar meus convites de liga

`GET /me/league-invitations?status=PENDING&direction=INCOMING`

**`200 OK`**
```json
{
  "items": [
    {
      "id": "8a9b0c1d-2e3f-4a5b-8c6d-000000000001",
      "status": "PENDING",
      "league": {
        "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000004",
        "name": "Liga do Churrasco",
        "visibility": "PRIVATE",
        "gameMode": "ONE_VS_ONE",
        "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000003", "name": "Snooker House Pinheiros" },
        "scheduleSummary": "Sábados, 15h–20h",
        "membersCount": 6
      },
      "invitedBy": {
        "id": "33333333-3333-4333-8333-333333333333",
        "username": "felipao",
        "displayName": "Felipe Costa",
        "avatarUrl": "https://cdn.encacapei.com.br/avatars/33333333-3333-4333-8333-333333333333/256.webp",
        "initials": "FE",
        "avatarColor": "#f4a261"
      },
      "message": null,
      "createdAt": "2026-07-25T14:30:00Z",
      "expiresAt": "2026-08-01T14:30:00Z"
    }
  ],
  "meta": { "totalItems": 1, "pageSize": 20, "hasMore": false, "nextCursor": null }
}
```

> Reproduz o card amarelo: **"Liga do Churrasco"**, *"Convidado por Felipe Costa"*, **"há 2 dias"** (`createdAt` = 25/07, hoje = 27/07) (`[C]`).

## INVITE-03 · Aceitar convite de liga

`POST /league-invitations/{invitationId}/accept` · somente o convidado · `Idempotency-Key`

**`200 OK`**
```json
{
  "invitationId": "8a9b0c1d-2e3f-4a5b-8c6d-000000000001",
  "status": "ACCEPTED",
  "respondedAt": "2026-07-27T19:40:00Z",
  "league": { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000004", "name": "Liga do Churrasco", "status": "ACTIVE" },
  "membership": { "role": "PLAYER", "status": "ACTIVE", "joinedAt": "2026-07-27T19:40:00Z", "joinedVia": "INVITATION" },
  "ranking": { "position": 7, "wins": 0, "losses": 0, "winRate": 0.00 }
}
```

| Status | `code` | Quando |
|---|---|---|
| `404` | `INVITATION_NOT_FOUND` | Inexistente ou endereçado a outra pessoa |
| `409` | `INVITATION_NOT_PENDING` | Já respondido/revogado — extensão `currentStatus` |
| `410` | `INVITATION_EXPIRED` | Passou de 7 dias (RN-INVITE-002) |
| `409` | `LEAGUE_FINISHED` | |
| `409` | `ALREADY_MEMBER` | Entrou por código nesse meio-tempo — tratar como sucesso |

**Efeitos** — cria `LeagueMember(PLAYER)` + `RankingEntry`, `membersCount++`, resolve a notificação, notifica quem convidou.
**Eventos** — `LeagueInvitationAccepted`, `LeagueMemberJoined`.

## INVITE-04 · Recusar convite de liga

`POST /league-invitations/{invitationId}/decline` · **`200 OK`**
```json
{ "invitationId": "8a9b0c1d-2e3f-4a5b-8c6d-000000000001", "status": "DECLINED", "respondedAt": "2026-07-27T19:41:00Z" }
```
Erros: `404 INVITATION_NOT_FOUND`, `409 INVITATION_NOT_PENDING`, `410 INVITATION_EXPIRED`. Não notifica o remetente (RN-NOTIF-008).

## INVITE-05 · Revogar convite enviado

`DELETE /league-invitations/{invitationId}` · `ADMIN`/`OWNER` ou quem convidou · **`204 No Content`**.
Erros: `404 INVITATION_NOT_FOUND`, `409 INVITATION_NOT_PENDING`. Apaga a notificação pendente do convidado.

---

# Códigos de convite

## CODE-01 · Gerar código

`POST /leagues/{leagueId}/invite-codes` · `ADMIN`/`OWNER` · `Idempotency-Key`

| Campo | Tipo | Obrig. | Validação | Default |
|---|---|:--:|---|---|
| `expiresInHours` | integer | ✖ | 1–8760 | 168 (7 dias) |
| `maxUses` | integer \| null | ✖ | ≥1 | `null` (ilimitado) |
| `revokePrevious` | boolean | ✖ | — | `true` |

**`201 Created`**
```json
{
  "id": "c0d1e2f3-a4b5-4c6d-8e7f-000000000001",
  "code": "TERCA-7K9M",
  "shareUrl": "https://encacapei.com.br/j/TERCA-7K9M",
  "deepLink": "encacapei://join?code=TERCA-7K9M",
  "shareText": "Bora jogar sinuca? Entra na Liga da Terça no Encaçapei: https://encacapei.com.br/j/TERCA-7K9M",
  "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
  "maxUses": null,
  "usesCount": 0,
  "expiresAt": "2026-08-03T19:45:00Z",
  "createdAt": "2026-07-27T19:45:00Z",
  "revokedPreviousCode": "TERCA-3B8P"
}
```

> `shareText` pronto para o WhatsApp é responsabilidade do backend (§4.15) — o app só abre o share sheet.

Erros: `403 INSUFFICIENT_LEAGUE_ROLE`, `409 LEAGUE_FINISHED`, `429 RATE_LIMIT_EXCEEDED` (10/h).

## CODE-02 · Listar códigos ativos

`GET /leagues/{leagueId}/invite-codes` · `ADMIN`/`OWNER` → `{ "items": [...], "meta": {...} }`.

## CODE-03 · Revogar código

`DELETE /leagues/{leagueId}/invite-codes/{codeId}` · `ADMIN`/`OWNER` · **`204 No Content`**.

## CODE-04 · Pré-visualizar código (antes de entrar)

| | |
|---|---|
| **Método / Rota** | `GET /invite-codes/{code}` |
| **Autenticação** | Bearer |
| **Objetivo** | Mostrar em que liga o usuário está prestes a entrar (RN-INVITE-010) |

```http
GET /api/v1/invite-codes/TERCA-7K9M
```

**`200 OK`**
```json
{
  "code": "TERCA-7K9M",
  "valid": true,
  "league": {
    "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
    "name": "Liga da Terça",
    "visibility": "PRIVATE",
    "gameMode": "ONE_VS_ONE",
    "venue": { "name": "Bar do Zé", "neighborhood": "Vila Mariana", "city": "São Paulo" },
    "scheduleSummary": "Terças, 20h–00h",
    "membersCount": 5,
    "owner": { "displayName": "Rodrigo Baroni", "username": "baroni" }
  },
  "alreadyMember": false,
  "expiresAt": "2026-08-03T19:45:00Z"
}
```

| Status | `code` | Quando |
|---|---|---|
| `404` | `INVITE_CODE_NOT_FOUND` | Código inexistente |
| `410` | `INVITE_CODE_EXPIRED` / `INVITE_CODE_REVOKED` / `INVITE_CODE_EXHAUSTED` | Cada caso com `code` próprio (RN-INVITE-009) |

## CODE-05 · Entrar por código

`POST /leagues/join-by-code` · Bearer · `Idempotency-Key`

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `code` | string | ✔ | 6–16, `^[A-Z0-9-]+$`, normalizado para maiúsculas |

```json
{ "code": "terca-7k9m" }
```

**`201 Created`** — mesmo corpo de LEAGUE-12 com `joinedVia: "INVITE_CODE"`.

| Status | `code` | Quando |
|---|---|---|
| `404` | `INVITE_CODE_NOT_FOUND` | |
| `410` | `INVITE_CODE_EXPIRED` \| `INVITE_CODE_REVOKED` \| `INVITE_CODE_EXHAUSTED` | |
| `409` | `ALREADY_MEMBER` | Tratar como sucesso na UI |
| `409` | `LEAGUE_FINISHED` | |
| `429` | `RATE_LIMIT_EXCEEDED` | 20 tentativas/h por usuário — impede varredura de códigos |

**Concorrência** — `uses_count` incrementado com `UPDATE … SET uses_count = uses_count + 1 WHERE id = :id AND (max_uses IS NULL OR uses_count < max_uses)`; 0 linhas → `410 INVITE_CODE_EXHAUSTED`.

---

## LEAGUE-13 · Ranking da liga

| | |
|---|---|
| **Caso de uso** | `GetLeagueRanking` |
| **Método / Rota** | `GET /leagues/{leagueId}/ranking` |
| **Tela** | Liga → aba Ranking (`[C]`) |

**Query params**

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `period` | string | `ALL_TIME` | `LAST_30_DAYS`, `LAST_90_DAYS`, `CURRENT_YEAR`, `ALL_TIME` — recorte não materializado |
| `playSessionId` | uuid | — | Ranking restrito a uma jogatina (equivalente a SESSION-04) |
| `includeInactive` | boolean | `true` | Inclui quem saiu da liga (`DP-025`) |

```http
GET /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001/ranking
```

**`200 OK`**
```json
{
  "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
  "leagueName": "Liga da Terça",
  "leagueStatus": "ACTIVE",
  "period": "ALL_TIME",
  "frozen": false,
  "frozenAt": null,
  "tiebreakerOrder": ["WIN_RATE", "WINS", "FEWER_LOSSES", "HEAD_TO_HEAD", "JOINED_AT"],
  "minMatchesForRanking": 0,
  "items": [
    {
      "position": 1,
      "user": { "id": "33333333-3333-4333-8333-333333333333", "username": "felipao", "displayName": "Felipe Costa", "avatarUrl": "https://cdn.encacapei.com.br/avatars/33333333-3333-4333-8333-333333333333/256.webp", "initials": "FE", "avatarColor": "#f4a261" },
      "wins": 8, "losses": 2, "matchesPlayed": 10, "winRate": 80.00,
      "currentWinStreak": 3, "longestWinStreak": 5,
      "lastMatchAt": "2026-07-14T23:38:52Z",
      "isMe": false, "isActive": true, "previousPosition": 1, "positionChange": 0
    },
    {
      "position": 2,
      "user": { "id": "11111111-1111-4111-8111-111111111111", "username": "baroni", "displayName": "Rodrigo Baroni", "avatarUrl": null, "initials": "RB", "avatarColor": "#C1E778" },
      "wins": 7, "losses": 4, "matchesPlayed": 11, "winRate": 63.64,
      "currentWinStreak": 5, "longestWinStreak": 5,
      "lastMatchAt": "2026-07-15T01:08:22Z",
      "isMe": true, "isActive": true, "previousPosition": 4, "positionChange": 2
    },
    {
      "position": 3,
      "user": { "id": "22222222-2222-4222-8222-222222222222", "username": "joaop", "displayName": "João Pereira", "avatarUrl": "https://cdn.encacapei.com.br/avatars/22222222-2222-4222-8222-222222222222/256.webp", "initials": "JO", "avatarColor": "#8ecae6" },
      "wins": 5, "losses": 4, "matchesPlayed": 9, "winRate": 55.56,
      "currentWinStreak": 0, "longestWinStreak": 2,
      "lastMatchAt": "2026-07-15T01:08:22Z",
      "isMe": false, "isActive": true, "previousPosition": 3, "positionChange": 0
    },
    {
      "position": 4,
      "user": { "id": "55555555-5555-4555-8555-555555555555", "username": "marcao", "displayName": "Marcos Silva", "avatarUrl": null, "initials": "MA", "avatarColor": "#c8b6ff" },
      "wins": 4, "losses": 6, "matchesPlayed": 10, "winRate": 40.00,
      "currentWinStreak": 0, "longestWinStreak": 2,
      "lastMatchAt": "2026-07-08T01:12:30Z",
      "isMe": false, "isActive": true, "previousPosition": 5, "positionChange": 1
    },
    {
      "position": 5,
      "user": { "id": "44444444-4444-4444-8444-444444444444", "username": "ander", "displayName": "Anderson Lima", "avatarUrl": null, "initials": "AN", "avatarColor": "#e9c46a" },
      "wins": 3, "losses": 7, "matchesPlayed": 10, "winRate": 30.00,
      "currentWinStreak": 0, "currentLossStreak": 6, "longestWinStreak": 3,
      "lastMatchAt": "2026-07-15T00:45:31Z",
      "isMe": false, "isActive": true, "previousPosition": 2, "positionChange": -3
    }
  ],
  "meta": { "totalItems": 5, "updatedAt": "2026-07-15T02:21:16Z" }
}
```

> Reproduz a tabela do mockup exatamente (Felipe 8/2, Você 7/4, João 5/4, Marcos 4/6, Anderson 3/7). Duas notas:
> 1. **Arredondamento (`INC-01`):** `63.64` → exibe `64%`; `55.56` → exibe `56%` (o mockup mostrava `55%`, truncado). Uma única regra — **half-up na exibição** — resolve a divergência.
> 2. **`positionChange`:** os valores refletem o ranking **antes** da jogatina de 14/07 (README §0.6). Anderson vinha em **2º** com 3V/1D (75,00 %) e terminou em **5º** após 6 derrotas seguidas.

**Erros:** `403 NOT_LEAGUE_MEMBER` (liga pública sem detalhe), `404 LEAGUE_NOT_FOUND`.
**Cache:** `private, max-age=15, must-revalidate` + `ETag` derivado de `updatedAt`.

---

## LEAGUE-14 · Histórico de partidas da liga

| | |
|---|---|
| **Caso de uso** | `ListLeagueMatches` |
| **Método / Rota** | `GET /leagues/{leagueId}/matches` |
| **Tela** | Liga → aba Histórico, com os dois filtros (`[C]`) |

**Query params**

| Param | Tipo | Default | Valores |
|---|---|---|---|
| `playSessionId` | uuid | — | Filtro "Todos os dias / 7 de julho / 30 de junho" (`[C]`) |
| `businessDate` | date | — | Alternativa ao `playSessionId` |
| `result` | string | — | `WIN` \| `LOSS` — **relativo ao usuário autenticado** (`[C]`) |
| `status` | string (csv) | `FINISHED` | `FINISHED`, `CANCELLED`, `IN_PROGRESS` |
| `userId` | uuid | — | Partidas de um jogador específico |
| `opponentId` | uuid | — | Confrontos contra alguém |
| `from` / `to` | date | — | |
| `limit` | integer | 20 | 1–100 |
| `cursor` | string | — | |
| `sort` | string | `-finishedAt` | `finishedAt`, `startedAt` |

```http
GET /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001/matches?playSessionId=7c8d9e0f-1a2b-4c3d-8e4f-000000000002&limit=20
```

**`200 OK`**
```json
{
  "items": [
    {
      "id": "3f4a5b6c-7d8e-4f90-8a1b-000000000023",
      "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000002",
      "businessDate": "2026-07-07",
      "status": "FINISHED",
      "resultStatus": "ORIGINAL",
      "gameMode": "ONE_VS_ONE",
      "winnerSide": 1,
      "startedAt": "2026-07-08T00:14:02Z",
      "finishedAt": "2026-07-08T00:32:41Z",
      "durationSeconds": 1119,
      "participants": [
        { "userId": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni", "initials": "RB", "avatarColor": "#C1E778", "side": 1, "isWinner": true, "ballsPocketed": 6, "fouls": 0 },
        { "userId": "22222222-2222-4222-8222-222222222222", "displayName": "João Pereira", "initials": "JO", "avatarColor": "#8ecae6", "side": 2, "isWinner": false, "ballsPocketed": 3, "fouls": 1 }
      ],
      "myResult": "WIN",
      "title": "Você vs João",
      "canCorrect": false,
      "correctionCount": 0
    },
    {
      "id": "3f4a5b6c-7d8e-4f90-8a1b-000000000022",
      "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000002",
      "businessDate": "2026-07-07",
      "status": "FINISHED",
      "resultStatus": "ORIGINAL",
      "gameMode": "ONE_VS_ONE",
      "winnerSide": 2,
      "startedAt": "2026-07-07T23:47:10Z",
      "finishedAt": "2026-07-08T00:04:55Z",
      "durationSeconds": 1065,
      "participants": [
        { "userId": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni", "initials": "RB", "avatarColor": "#C1E778", "side": 1, "isWinner": false, "ballsPocketed": 2, "fouls": 2 },
        { "userId": "33333333-3333-4333-8333-333333333333", "displayName": "Felipe Costa", "initials": "FE", "avatarColor": "#f4a261", "side": 2, "isWinner": true, "ballsPocketed": 7, "fouls": 0 }
      ],
      "myResult": "LOSS",
      "title": "Você vs Felipe",
      "canCorrect": false,
      "correctionCount": 0
    },
    {
      "id": "3f4a5b6c-7d8e-4f90-8a1b-000000000021",
      "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000002",
      "businessDate": "2026-07-07",
      "status": "FINISHED",
      "resultStatus": "ORIGINAL",
      "gameMode": "ONE_VS_ONE",
      "winnerSide": 1,
      "startedAt": "2026-07-07T23:04:33Z",
      "finishedAt": "2026-07-07T23:20:18Z",
      "durationSeconds": 945,
      "participants": [
        { "userId": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni", "initials": "RB", "avatarColor": "#C1E778", "side": 1, "isWinner": true, "ballsPocketed": 8, "fouls": 0 },
        { "userId": "44444444-4444-4444-8444-444444444444", "displayName": "Anderson Lima", "initials": "AN", "avatarColor": "#e9c46a", "side": 2, "isWinner": false, "ballsPocketed": 1, "fouls": 3 }
      ],
      "myResult": "WIN",
      "title": "Você vs Anderson",
      "canCorrect": false,
      "correctionCount": 0
    }
  ],
  "meta": { "totalItems": 8, "pageSize": 20, "hasMore": true, "nextCursor": "eyJpZCI6IjNmNGE1YjZjLTdkOGUtNGY5MC04YTFiLTAwMDAwMDAwMDAyMSIsInQiOiIyMDI2LTA3LTA3VDIzOjIwOjE4WiJ9" }
}
```

> **Exemplo truncado nos 3 primeiros itens** (a jogatina de 07/07 teve 8 partidas); `meta.hasMore` e `nextCursor` refletem isso.
> `finishedAt` de `2026-07-08T00:32:41Z` = **21:32** em `America/Sao_Paulo` — exatamente o horário do mockup (`[C]`). Os três cards do histórico (`21:32`, `21:04`, `20:20`) estão reproduzidos.
> `title` ("Você vs João") é gerado pelo servidor com a perspectiva do solicitante `[R]`.

**Erros:** `403 NOT_LEAGUE_MEMBER`, `404 LEAGUE_NOT_FOUND`, `422 CONFLICTING_FILTERS`.

## LEAGUE-15 · Listar jogatinas da liga

`GET /leagues/{leagueId}/play-sessions?status=&from=&to=&limit=&cursor=`

Alimenta o **select "Todos os dias / 7 de julho / 30 de junho"** do histórico (`[C]`).

**`200 OK`**
```json
{
  "items": [
    { "id": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001", "businessDate": "2026-07-14", "status": "CLOSED", "label": "14 de julho", "matchesCount": 9, "participantsCount": 4, "openedAt": "2026-07-14T23:00:00Z", "closedAt": "2026-07-15T01:15:00Z", "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" }, "myWins": 4, "myLosses": 0, "myPosition": 1 },
    { "id": "7c8d9e0f-1a2b-4c3d-8e4f-000000000002", "businessDate": "2026-07-07", "status": "CLOSED", "label": "7 de julho", "matchesCount": 8, "participantsCount": 4, "openedAt": "2026-07-07T23:00:00Z", "closedAt": "2026-07-08T02:55:00Z", "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" }, "myWins": 3, "myLosses": 2, "myPosition": 2 },
    { "id": "7c8d9e0f-1a2b-4c3d-8e4f-000000000003", "businessDate": "2026-06-30", "status": "CLOSED", "label": "30 de junho", "matchesCount": 6, "participantsCount": 3, "openedAt": "2026-06-30T23:05:00Z", "closedAt": "2026-07-01T02:20:00Z", "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" }, "myWins": 0, "myLosses": 2, "myPosition": 3 }
  ],
  "meta": { "totalItems": 9, "pageSize": 20, "hasMore": true, "nextCursor": "eyJkIjoiMjAyNi0wNi0zMCJ9" }
}
```
