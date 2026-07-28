# 9. Exemplos completos de contratos — fluxo fim a fim

Este capítulo encadeia **uma noite completa** do Encaçapei em requisições HTTP reais, na ordem em que o app as dispara. Todos os IDs, horários e números são os do dataset canônico ([README §0.6](README.md)) e batem com os capítulos 8a–8e.

Cabeçalhos repetidos em todas as chamadas autenticadas (omitidos por brevidade a partir da 3ª):
```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImVuYy0yMDI2LTAzIn0…
Accept: application/json
Accept-Language: pt-BR
X-App-Version: 1.0.0 (1)
X-Device-Id: b1c2d3e4-f5a6-4b7c-8d9e-000000000001
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

---

## 9.1 Abertura do app — splash e Home

### (1) Bootstrap

```http
GET /api/v1/app/bootstrap HTTP/1.1
Host: api.encacapei.com.br
```
```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=300
X-Trace-Id: 0af7651916cd43dd8448eb211c80319c
```
```json
{
  "minSupportedVersion": { "ios": "1.0.0", "android": "1.0.0" },
  "latestVersion": { "ios": "1.0.0", "android": "1.0.0" },
  "forceUpdate": false,
  "maintenanceMode": false,
  "termsVersion": "2026-06-01",
  "privacyPolicyVersion": "2026-06-01",
  "urls": { "terms": "https://encacapei.com.br/termos", "privacy": "https://encacapei.com.br/privacidade", "support": "https://encacapei.com.br/suporte" },
  "features": { "teamMatches": false, "pushNotifications": false, "shareImageGeneration": false, "venueReviews": false, "publicLeagueJoin": true },
  "serverTime": "2026-07-14T22:58:00Z"
}
```

### (2) Renovar sessão

```http
POST /api/v1/auth/refresh HTTP/1.1
Content-Type: application/json

{ "refreshToken": "v1.MWY0YTNiMmMtOGQ5ZS00ZjcwLTgxMmItMDAwMDAwMDAwMDAx.7Rq2xK9mZ0pL" }
```
```http
HTTP/1.1 200 OK
Cache-Control: no-store
```
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImVuYy0yMDI2LTAzIn0.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJzaWQiOiJjM2Q0ZTVmNi1hN2I4LTQ5MDEtODIzNC0wMDAwMDAwMDAwMDEiLCJleHAiOjE3ODQxNTE1MDB9.Xa9…",
  "refreshToken": "v1.NGE1YjZjN2QtOGU5Zi00MDAxLTgyM2MtMDAwMDAwMDAwMDAy.Kp8mQ2vN4tR",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshExpiresIn": 2592000
}
```

### (3) Home em uma chamada

```http
GET /api/v1/me?include=statistics,counters HTTP/1.1
```
```http
HTTP/1.1 200 OK
ETag: W/"3"
Cache-Control: private, max-age=0, must-revalidate
```
```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "username": "baroni",
  "displayName": "Rodrigo Baroni",
  "email": "rodrigo.baroni@email.com",
  "avatarUrl": null,
  "initials": "RB",
  "avatarColor": "#C1E778",
  "status": "ACTIVE",
  "emailVerified": true,
  "memberSince": "2025-01-14",
  "timezone": "America/Sao_Paulo",
  "locale": "pt-BR",
  "profileVisibility": "FRIENDS_ONLY",
  "searchableByUsername": true,
  "locationConsentGrantedAt": "2026-03-02T14:20:00Z",
  "createdAt": "2025-01-14T22:10:00Z",
  "updatedAt": "2026-07-10T11:05:33Z",
  "version": 3,
  "statistics": {
    "matchesPlayed": 43,
    "wins": 25,
    "losses": 18,
    "winRate": 58.14,
    "currentWinStreak": 1,
    "longestWinStreak": 7,
    "currentLossStreak": 0,
    "longestLossStreak": 2,
    "sessionsPlayed": 13,
    "podiumFirsts": 5,
    "lastMatchAt": "2026-07-08T00:32:41Z"
  },
  "counters": {
    "unreadNotifications": 3,
    "pendingFriendRequests": 2,
    "pendingLeagueInvitations": 1,
    "activeLeagues": 2,
    "activeMatchId": null
  }
}
```

> Estado **antes** da noite de 14/07: 43 partidas, 58,14 %, streak 1. Ao final da jogatina (4 partidas, 4 vitórias) chega a **47 partidas, 29V/18D = 61,70 % e streak 5** → exatamente os "47 partidas / 62 % / 5 consecutivas" da Home do mockup. As duas telas são o **antes** e o **depois** desta mesma noite.

### (4) Ligas da Home

```http
GET /api/v1/me/leagues?limit=3&sort=-lastActivityAt HTTP/1.1
```
```json
{
  "items": [
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça", "status": "ACTIVE", "visibility": "PRIVATE", "gameMode": "ONE_VS_ONE", "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" }, "counters": { "membersCount": 5, "matchesCount": 18, "sessionsCount": 8 }, "nextSessionAt": "2026-07-14T23:00:00Z", "lastActivityAt": "2026-07-08T00:32:41Z", "myMembership": { "role": "OWNER", "status": "ACTIVE" }, "myRanking": { "position": 4, "wins": 3, "losses": 4, "winRate": 42.86 }, "hasActiveSession": false, "scheduleSummary": "Terças, 20h–00h" },
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000002", "name": "Ranking do Bar do Zé", "status": "ACTIVE", "visibility": "PUBLIC", "gameMode": "ONE_VS_ONE", "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" }, "counters": { "membersCount": 8, "matchesCount": 61, "sessionsCount": 17 }, "nextSessionAt": "2026-07-17T00:00:00Z", "lastActivityAt": "2026-06-27T02:40:00Z", "myMembership": { "role": "PLAYER", "status": "ACTIVE" }, "myRanking": { "position": 4, "wins": 12, "losses": 9, "winRate": 57.14 }, "hasActiveSession": false, "scheduleSummary": "Sextas, 21h–01h" },
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000003", "name": "Copa Fim de Ano", "status": "FINISHED", "visibility": "PRIVATE", "gameMode": "ONE_VS_ONE", "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000002", "name": "Sinuca Central" }, "counters": { "membersCount": 6, "matchesCount": 18, "sessionsCount": 4 }, "nextSessionAt": null, "lastActivityAt": "2026-01-06T02:15:00Z", "myMembership": { "role": "PLAYER", "status": "ACTIVE" }, "myRanking": { "position": 2, "wins": 7, "losses": 5, "winRate": 58.33 }, "hasActiveSession": false, "scheduleSummary": "Sábados, 19h–23h" }
  ],
  "meta": { "totalItems": 3, "page": 1, "pageSize": 3, "totalPages": 1, "hasMore": false }
}
```

> `Copa Fim de Ano` aparece **encerrada** nesta lista — é o `INC-05`. A seção da UI deve se chamar "Suas ligas".
> `matchesCount: 18` da Copa reproduz o card "6 amigos • 18 partidas" (`[C]`).

---

## 9.2 Criação de liga (wizard) — referência do enunciado revisada

O exemplo de referência do briefing usava `schedule.startsAt` / `endsAt` para **horas** e envelope `data`. Ambos foram revisados:

| Campo do briefing | Campo adotado | Motivo |
|---|---|---|
| `schedule.startsAt: "20:00"` | `schedule.startTime: "20:00"` | `startsAt` já significa **data** de início da liga; usar o mesmo nome para hora causa colisão semântica e bug de parsing |
| `schedule.endsAt: "00:00"` | `schedule.endTime: "00:00"` | idem |
| envelope `{ "data": { … } }` | recurso cru | Envelope só em coleções (§7.2) |
| — | `schedule.crossesMidnight` (leitura) | Derivado; a UI precisa saber que 00:00 é o dia seguinte |
| — | `schedule.reminderMinutesBefore` | O lembrete "começa em 1 hora" precisa de origem configurável |

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

Resposta completa em [LEAGUE-01](08c-endpoints-leagues.md#league-01--criar-liga) — `201 Created`, `ETag: W/"1"`, `Location`, `inviteCode.code = "TERCA-7K9M"`.

---

## 9.3 A noite de 14/07 — do ranking ao pódio

### (5) Abrir a liga

```http
GET /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001?include=currentSession HTTP/1.1
```
`200 OK`, `ETag: W/"6"` — ver [LEAGUE-04](08c-endpoints-leagues.md#league-04--consultar-detalhes-da-liga). `currentSession: null`, `hasActiveSession: false`.

### (6) Ranking (aba padrão)

```http
GET /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001/ranking HTTP/1.1
```
`200 OK` — estado **antes** da noite:
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
    { "position": 1, "user": { "id": "33333333-3333-4333-8333-333333333333", "username": "felipao", "displayName": "Felipe Costa", "initials": "FE", "avatarColor": "#f4a261" }, "wins": 5, "losses": 1, "matchesPlayed": 6, "winRate": 83.33, "currentWinStreak": 2, "longestWinStreak": 5, "lastMatchAt": "2026-07-08T00:04:55Z", "isMe": false, "isActive": true, "previousPosition": 1, "positionChange": 0 },
    { "position": 2, "user": { "id": "44444444-4444-4444-8444-444444444444", "username": "ander", "displayName": "Anderson Lima", "initials": "AN", "avatarColor": "#e9c46a" }, "wins": 3, "losses": 1, "matchesPlayed": 4, "winRate": 75.00, "currentWinStreak": 2, "longestWinStreak": 3, "lastMatchAt": "2026-07-08T00:20:18Z", "isMe": false, "isActive": true, "previousPosition": 2, "positionChange": 0 },
    { "position": 3, "user": { "id": "22222222-2222-4222-8222-222222222222", "username": "joaop", "displayName": "João Pereira", "initials": "JO", "avatarColor": "#8ecae6" }, "wins": 3, "losses": 2, "matchesPlayed": 5, "winRate": 60.00, "currentWinStreak": 0, "longestWinStreak": 2, "lastMatchAt": "2026-07-08T00:32:41Z", "isMe": false, "isActive": true, "previousPosition": 3, "positionChange": 0 },
    { "position": 4, "user": { "id": "11111111-1111-4111-8111-111111111111", "username": "baroni", "displayName": "Rodrigo Baroni", "initials": "RB", "avatarColor": "#C1E778" }, "wins": 3, "losses": 4, "matchesPlayed": 7, "winRate": 42.86, "currentWinStreak": 1, "longestWinStreak": 7, "lastMatchAt": "2026-07-08T00:32:41Z", "isMe": true, "isActive": true, "previousPosition": 4, "positionChange": 0 },
    { "position": 5, "user": { "id": "55555555-5555-4555-8555-555555555555", "username": "marcao", "displayName": "Marcos Silva", "initials": "MA", "avatarColor": "#c8b6ff" }, "wins": 4, "losses": 6, "matchesPlayed": 10, "winRate": 40.00, "currentWinStreak": 0, "longestWinStreak": 2, "lastMatchAt": "2026-07-08T01:12:30Z", "isMe": false, "isActive": true, "previousPosition": 5, "positionChange": 0 }
  ],
  "meta": { "totalItems": 5, "updatedAt": "2026-07-08T01:12:31Z" }
}
```

> **Ordenação estritamente por `winRate DESC`** (RN-RANKING-002): 83,33 · 75,00 · 60,00 · 42,86 · 40,00. Note que Anderson está em 2º com **3 vitórias** enquanto Marcos, com **4**, é o último — percentual, e não vitórias absolutas, é o critério primário. Marcos também tem mais vitórias que João e Rodrigo.
> Este é o estado **antes** da jogatina de 14/07. Ao final da noite a tabela vira exatamente a do mockup (Felipe 8/2 · Você 7/4 · João 5/4 · Marcos 4/6 · Anderson 3/7), com Rodrigo subindo de 4º para 2º e Anderson caindo de 2º para 5º — ver [LEAGUE-13](08c-endpoints-leagues.md#league-13--ranking-da-liga) e README §0.6.
> O ex-membro **Ricardo Alves** (`88888888-…`, 0V/4D) não aparece porque a consulta usa o default do print do mockup (5 linhas). Com `includeInactive=true` ele viria em 6º com `isActive: false`.

### (7) "Iniciar partida" → resolve/abre a jogatina

```http
GET /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001/play-sessions/current?createIfMissing=true&include=ranking HTTP/1.1
```
```http
HTTP/1.1 201 Created
Location: /api/v1/play-sessions/7c8d9e0f-1a2b-4c3d-8e4f-000000000001
ETag: W/"1"
```
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
  "counters": { "matchesCount": 0, "participantsCount": 1, "activeMatchesCount": 0 },
  "myStats": { "wins": 0, "losses": 0, "matchesPlayed": 0, "position": 1 },
  "ranking": [
    { "position": 1, "user": { "id": "11111111-1111-4111-8111-111111111111", "username": "baroni", "displayName": "Rodrigo Baroni", "initials": "RB", "avatarColor": "#C1E778" }, "wins": 0, "losses": 0, "matchesPlayed": 0, "isMe": true }
  ],
  "permissions": { "canStartMatch": true, "canAddParticipant": true, "canClose": true, "canShare": false },
  "createdAt": "2026-07-14T23:00:00Z",
  "updatedAt": "2026-07-14T23:00:00Z",
  "version": 1
}
```

### (8) Lista de adversários com "N vitórias hoje"

Após 8 partidas, ao entrar na tela "Nova partida" para a 9ª:

```http
GET /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001/members?include=sessionStats&playSessionId=7c8d9e0f-1a2b-4c3d-8e4f-000000000001 HTTP/1.1
```
`200 OK` — ver [LEAGUE-08](08c-endpoints-leagues.md#league-08--listar-membros): Rodrigo 3V/0D (1º), Felipe 3V/1D (2º), João 2V/1D (3º), Anderson 0V/6D (4º), Marcos 0V/0D. O "**3 vitórias hoje**" de Rodrigo confere com o mockup.

### (9) Iniciar a partida 9 (Rodrigo × João)

```http
POST /api/v1/matches HTTP/1.1
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
`201 Created`, `Location: /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009`, `ETag: W/"1"` — corpo completo em [MATCH-01](08d-endpoints-sessions-matches.md#match-01--iniciar-partida).

### (10) Encaçapar a bola 2 (Rodrigo)

```http
POST /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/events HTTP/1.1
Content-Type: application/json
Idempotency-Key: 7b1c2d3e-4f50-4617-8829-000000000010

{ "type": "BALL_POCKETED", "ballNumber": 2, "actorUserId": "11111111-1111-4111-8111-111111111111" }
```
```http
HTTP/1.1 201 Created
ETag: W/"2"
```
```json
{
  "event": { "id": "ae1b2c3d-4e5f-4a60-8b71-000000000001", "matchId": "3f4a5b6c-7d8e-4f90-8a1b-000000000009", "sequence": 1, "type": "BALL_POCKETED", "ballNumber": 2, "actorUserId": "11111111-1111-4111-8111-111111111111", "actorDisplayName": "Rodrigo Baroni", "side": 1, "recordedByUserId": "11111111-1111-4111-8111-111111111111", "occurredAt": "2026-07-15T00:49:12Z", "undoneAt": null },
  "tableState": { "ballsCount": 8, "pocketedBalls": [ { "ballNumber": 2, "eventId": "ae1b2c3d-4e5f-4a60-8b71-000000000001", "pocketedByUserId": "11111111-1111-4111-8111-111111111111", "occurredAt": "2026-07-15T00:49:12Z" } ], "remainingBalls": [1, 3, 4, 5, 6, 7, 8] },
  "participants": [ { "userId": "11111111-1111-4111-8111-111111111111", "ballsPocketed": 1, "fouls": 0 }, { "userId": "22222222-2222-4222-8222-222222222222", "ballsPocketed": 0, "fouls": 0 } ],
  "suggestion": null,
  "matchVersion": 2
}
```

### (11) Duplo toque na mesma bola — o retry que o produto precisa sobreviver

O usuário toca duas vezes na bola 2. O app já enviou a requisição (10) e envia outra com **chave nova**:

```http
POST /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/events HTTP/1.1
Content-Type: application/json
Idempotency-Key: 7b1c2d3e-4f50-4617-8829-000000000011

{ "type": "BALL_POCKETED", "ballNumber": 2, "actorUserId": "11111111-1111-4111-8111-111111111111" }
```
```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json
```
```json
{
  "type": "https://api.encacapei.com.br/problems/ball-already-pocketed",
  "title": "Bola já encaçapada",
  "status": 409,
  "code": "BALL_ALREADY_POCKETED",
  "detail": "A bola 2 já está fora da mesa nesta partida.",
  "instance": "/api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/events",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-15T00:49:12Z",
  "retryable": false,
  "errors": [],
  "ballNumber": 2,
  "existingEventId": "ae1b2c3d-4e5f-4a60-8b71-000000000001"
}
```

Já um **retry por timeout de rede** (mesma chave, mesmo corpo) devolve:
```http
HTTP/1.1 201 Created
Idempotent-Replay: true
ETag: W/"2"
```
com corpo **idêntico** ao de (10). O app não precisa distinguir os casos.

### (12) Bola 4 (João) e desfazer

```http
POST /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/events
Idempotency-Key: 7b1c2d3e-4f50-4617-8829-000000000012

{ "type": "BALL_POCKETED", "ballNumber": 4, "actorUserId": "22222222-2222-4222-8222-222222222222" }
```
`201 Created`, `ETag: W/"3"`, `sequence: 2`, `eventId: ae1b2c3d-4e5f-4a60-8b71-000000000002`.

Estado da mesa = exatamente o mockup (bolas **2 e 4** apagadas). Desfazer a bola 4:
```http
DELETE /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/events/ae1b2c3d-4e5f-4a60-8b71-000000000002
```
`200 OK` com `undoneAt: "2026-07-15T00:53:02Z"` e `remainingBalls: [1, 3, 4, 5, 6, 7, 8]`.

### (13) Conflito de concorrência — dois celulares na mesma mesa

João, no celular dele, finaliza a partida primeiro (`version` vai de 3 para 4). Rodrigo, com `ETag: W/"3"` em mãos, tenta finalizar:

```http
POST /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/finish HTTP/1.1
Content-Type: application/json
Idempotency-Key: 9c2d3e4f-5061-4728-893a-000000000013
If-Match: W/"3"

{ "winnerSide": 1 }
```
```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json
ETag: W/"4"
```
```json
{
  "type": "https://api.encacapei.com.br/problems/concurrent-modification",
  "title": "Registro alterado por outra pessoa",
  "status": 409,
  "code": "CONCURRENT_MODIFICATION",
  "detail": "Esta partida foi atualizada por João Pereira enquanto você estava na tela. Confira o estado atual.",
  "instance": "/api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/finish",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-15T01:08:24Z",
  "retryable": false,
  "errors": [],
  "expectedVersion": 3,
  "currentVersion": 4,
  "currentState": {
    "id": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
    "status": "FINISHED",
    "winnerSide": 1,
    "finishedAt": "2026-07-15T01:08:22Z",
    "finishedBy": { "id": "22222222-2222-4222-8222-222222222222", "displayName": "João Pereira" }
  }
}
```

> `currentState` no corpo do 409 é o que evita uma segunda ida ao servidor. Neste caso o vencedor registrado por João coincide com o que Rodrigo ia registrar — o app pode simplesmente seguir para o pódio, **sem** mostrar erro ao usuário.

### (14) Finalizar a partida (caminho felizes)

```http
POST /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/finish HTTP/1.1
Content-Type: application/json
Idempotency-Key: 9c2d3e4f-5061-4728-893a-000000000019
If-Match: W/"3"

{ "winnerSide": 1 }
```
`200 OK`, `ETag: W/"4"` — corpo completo em [MATCH-06](08d-endpoints-sessions-matches.md#match-06--finalizar-partida), com `sessionRanking.podium` já pronto para o modal.

### (15) Card de compartilhamento

```http
GET /api/v1/play-sessions/7c8d9e0f-1a2b-4c3d-8e4f-000000000001/summary HTTP/1.1
```
`200 OK` — ver [SHARE-01](08e-endpoints-venues-notif-sharing.md#share-01--resumo-da-jogatina).

```http
POST /api/v1/play-sessions/7c8d9e0f-1a2b-4c3d-8e4f-000000000001/share HTTP/1.1
Content-Type: application/json
Idempotency-Key: c1d2e3f4-a5b6-4c7d-8e9f-000000000030

{ "format": "LINK", "visibilityLevel": "MINIMAL", "expiresInDays": 30 }
```
`201 Created` — `shareUrl: https://encacapei.com.br/p/Jt7xK2mQ9pR4vN8sL1yB6cW3zA5dF0hG-eU`.

### (16) Fechar a noite

```http
POST /api/v1/play-sessions/7c8d9e0f-1a2b-4c3d-8e4f-000000000001/close HTTP/1.1
Content-Type: application/json
Idempotency-Key: e2f3a4b5-c6d7-4e8f-9a0b-000000000031
If-Match: W/"10"

{ "force": false, "generateShare": false }
```
`200 OK` — `status: CLOSED`, `finalPodium` congelado, `matchesCount: 9`.

---

## 9.4 Correção de resultado com reprocessamento

### (17) Alguém marcou errado

```http
POST /api/v1/matches/3f4a5b6c-7d8e-4f90-8a1b-000000000009/corrections HTTP/1.1
Content-Type: application/json
Idempotency-Key: b4c5d6e7-f809-4a1b-8c2d-000000000021
If-Match: W/"4"

{ "winnerSide": 2, "reason": "Marcamos errado: quem venceu foi o João, a bola 8 caiu na caçapa errada." }
```
`202 Accepted` — corpo completo em [MATCH-08](08d-endpoints-sessions-matches.md#match-08--corrigir-resultado), com `rankingRebuild.jobId`.

### (18) Acompanhar o reprocessamento

```http
GET /api/v1/ranking-rebuilds/f6a7b8c9-0d1e-4f2a-8b3c-000000000001 HTTP/1.1
```
`200 OK` — `status: COMPLETED`, `positionChanges: [{ Rodrigo 2→3 }, { João 3→2 }]`.

### (19) Ranking já reprocessado

```http
GET /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001/ranking HTTP/1.1
If-None-Match: W/"..."
```
`200 OK` com `meta.updatedAt: "2026-07-15T01:22:43Z"` e as posições trocadas.

---

## 9.5 Erros de validação — cadastro com senha fraca

```http
POST /api/v1/auth/register HTTP/1.1
Content-Type: application/json
Idempotency-Key: a1b2c3d4-e5f6-4708-899a-000000000040

{
  "fullName": "R",
  "username": "Baroni!",
  "email": "rodrigo@",
  "password": "sinuca",
  "acceptedTermsVersion": "2025-01-01"
}
```
```http
HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json
```
```json
{
  "type": "https://api.encacapei.com.br/problems/validation-error",
  "title": "Dados inválidos",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "detail": "Um ou mais campos estão inválidos.",
  "instance": "/api/v1/auth/register",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-28T14:02:10Z",
  "retryable": false,
  "errors": [
    { "field": "fullName", "code": "TOO_SHORT", "message": "O nome deve ter no mínimo 2 caracteres." },
    { "field": "username", "code": "USERNAME_INVALID_FORMAT", "message": "Use apenas letras minúsculas, números, ponto e underscore." },
    { "field": "email", "code": "EMAIL_INVALID", "message": "Informe um e-mail válido." },
    { "field": "password", "code": "PASSWORD_TOO_SHORT", "message": "A senha deve ter no mínimo 8 caracteres." },
    { "field": "password", "code": "PASSWORD_MISSING_UPPERCASE", "message": "A senha deve conter ao menos uma letra maiúscula." },
    { "field": "password", "code": "PASSWORD_MISSING_DIGIT", "message": "A senha deve conter ao menos um número." },
    { "field": "password", "code": "PASSWORD_MISSING_SPECIAL", "message": "A senha deve conter ao menos um caractere especial." },
    { "field": "acceptedTermsVersion", "code": "TERMS_VERSION_OUTDATED", "message": "Aceite a versão atual dos termos de uso." }
  ]
}
```

> Os 4 códigos de `password` mapeiam **um a um** para os checkmarks da tela de cadastro (`[C]`): a UI marca ✓/✗ por critério a partir de `errors[].code`, sem interpretar texto. `PASSWORD_MISSING_LOWERCASE` não aparece porque `"sinuca"` tem minúsculas — a lista contém só o que falhou.

---

## 9.6 Convite por código recebido no WhatsApp

### (20) Preview antes de entrar

```http
GET /api/v1/invite-codes/TERCA-7K9M HTTP/1.1
```
`200 OK` — nome da liga, local, `membersCount: 5`, `alreadyMember: false`.

### (21) Entrar

```http
POST /api/v1/leagues/join-by-code HTTP/1.1
Content-Type: application/json
Idempotency-Key: f1a2b3c4-d5e6-4f70-8a1b-000000000050

{ "code": "terca-7k9m" }
```
```http
HTTP/1.1 201 Created
Location: /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001
```
```json
{
  "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
  "leagueName": "Liga da Terça",
  "membership": { "role": "PLAYER", "status": "ACTIVE", "joinedAt": "2026-07-28T14:10:00Z", "joinedVia": "INVITE_CODE" },
  "ranking": { "position": 6, "wins": 0, "losses": 0, "winRate": 0.00 }
}
```

### (22) Código esgotado

```http
POST /api/v1/leagues/join-by-code
Idempotency-Key: f1a2b3c4-d5e6-4f70-8a1b-000000000051

{ "code": "TERCA-3B8P" }
```
```http
HTTP/1.1 410 Gone
Content-Type: application/problem+json
```
```json
{
  "type": "https://api.encacapei.com.br/problems/invite-code-revoked",
  "title": "Código de convite inválido",
  "status": 410,
  "code": "INVITE_CODE_REVOKED",
  "detail": "Este código foi substituído por um novo. Peça o código atualizado a quem te convidou.",
  "instance": "/api/v1/leagues/join-by-code",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-28T14:11:00Z",
  "retryable": false,
  "errors": [],
  "revokedAt": "2026-07-27T19:45:00Z"
}
```

---

## 9.7 Aba Locais com consentimento de geolocalização

```http
GET /api/v1/venues?lat=-23.5583&lng=-46.6604&radiusKm=6&sort=distance HTTP/1.1
```
`200 OK` — 3 locais, `distanceKm` 2.4 / 3.8 / 5.1 (ver [VENUE-01](08e-endpoints-venues-notif-sharing.md#venue-01--buscar-locais-proximidade-ou-texto)).

Sem consentimento de localização, o app usa a variante textual:
```http
GET /api/v1/venues?city=S%C3%A3o%20Paulo&q=pinheiros HTTP/1.1
```

---

## 9.8 Resumo dos IDs usados neste capítulo

| Recurso | ID |
|---|---|
| Usuário autenticado (Rodrigo) | `11111111-1111-4111-8111-111111111111` |
| Sessão (claim `sid`) | `c3d4e5f6-a7b8-4901-8234-000000000001` |
| Liga da Terça | `0a1b2c3d-4e5f-4a6b-8c7d-000000000001` |
| Jogatina 14/07 | `7c8d9e0f-1a2b-4c3d-8e4f-000000000001` |
| Partida 9 (Rodrigo × João) | `3f4a5b6c-7d8e-4f90-8a1b-000000000009` |
| Evento bola 2 | `ae1b2c3d-4e5f-4a60-8b71-000000000001` |
| Evento bola 4 | `ae1b2c3d-4e5f-4a60-8b71-000000000002` |
| Correção | `d5e6f708-192a-4b3c-8d4e-000000000001` |
| Job de rebuild | `f6a7b8c9-0d1e-4f2a-8b3c-000000000001` |
| Artefato de compartilhamento | `4c5d6e7f-8091-42a3-b5c6-000000000001` |
| Local Bar do Zé | `5e6f7a8b-9c0d-4e1f-8a2b-000000000001` |
| Código de convite | `TERCA-7K9M` |
| `traceId` | `0af7651916cd43dd8448eb211c80319c` |
