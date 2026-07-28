# 8b. Endpoints — Amizades e confronto direto

# Módulo Friendships

## FRIEND-01 · Listar amigos

| | |
|---|---|
| **Caso de uso** | `ListFriends` |
| **Método / Rota** | `GET /me/friends` |
| **Autenticação** | Bearer |
| **Permissões** | Próprio usuário |
| **Tela** | Amigos → aba "Seus amigos" (`[C]`) |

**Query params**

| Param | Tipo | Obrig. | Default | Validação | Descrição |
|---|---|:--:|---|---|---|
| `q` | string | ✖ | — | 2–60 | Filtro do campo "Buscar amigos..." |
| `page` | integer | ✖ | 1 | ≥1 | |
| `pageSize` | integer | ✖ | 50 | 1–100 | |
| `sort` | string | ✖ | `displayName` | `displayName`, `-displayName`, `createdAt`, `-createdAt` | |
| `include` | string (csv) | ✖ | — | `headToHead` | Traz o placar resumido de cada amigo |

```http
GET /api/v1/me/friends?sort=displayName&pageSize=50
Authorization: Bearer eyJ…
```

**`200 OK`**
```json
{
  "items": [
    {
      "id": "44444444-4444-4444-8444-444444444444",
      "username": "ander",
      "displayName": "Anderson Lima",
      "avatarUrl": null,
      "initials": "AN",
      "avatarColor": "#e9c46a",
      "friendshipId": "6d5c4b3a-2918-4706-85f4-000000000003",
      "friendsSince": "2025-06-11T20:05:00Z",
      "mutualLeaguesCount": 1,
      "lastPlayedAt": "2026-07-15T00:45:31Z"
    },
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "username": "felipao",
      "displayName": "Felipe Costa",
      "avatarUrl": "https://cdn.encacapei.com.br/avatars/33333333-3333-4333-8333-333333333333/256.webp",
      "initials": "FE",
      "avatarColor": "#f4a261",
      "friendshipId": "6d5c4b3a-2918-4706-85f4-000000000002",
      "friendsSince": "2025-02-19T21:40:00Z",
      "mutualLeaguesCount": 2,
      "lastPlayedAt": "2026-07-15T00:33:56Z"
    },
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "username": "joaop",
      "displayName": "João Pereira",
      "avatarUrl": "https://cdn.encacapei.com.br/avatars/22222222-2222-4222-8222-222222222222/256.webp",
      "initials": "JO",
      "avatarColor": "#8ecae6",
      "friendshipId": "6d5c4b3a-2918-4706-85f4-000000000001",
      "friendsSince": "2025-04-02T19:22:00Z",
      "mutualLeaguesCount": 2,
      "lastPlayedAt": "2026-07-15T01:08:22Z"
    },
    {
      "id": "55555555-5555-4555-8555-555555555555",
      "username": "marcao",
      "displayName": "Marcos Silva",
      "avatarUrl": null,
      "initials": "MA",
      "avatarColor": "#c8b6ff",
      "friendshipId": "6d5c4b3a-2918-4706-85f4-000000000004",
      "friendsSince": "2025-09-30T22:15:00Z",
      "mutualLeaguesCount": 1,
      "lastPlayedAt": "2026-07-08T01:12:30Z"
    }
  ],
  "meta": { "totalItems": 4, "page": 1, "pageSize": 50, "totalPages": 1, "hasMore": false }
}
```

**Erros:** `401 UNAUTHENTICATED`, `422 SEARCH_QUERY_TOO_SHORT`.
**Efeitos colaterais / eventos:** nenhum.
**Cache:** `private, max-age=0, must-revalidate` + `ETag`.
**Observação:** a ordenação default alfabética reproduz a lista do mockup; `lastPlayedAt` está no contrato para permitir a ordenação "quem joguei mais recentemente" sem nova versão de API.

---

## FRIEND-02 · Listar convites de amizade

| | |
|---|---|
| **Caso de uso** | `ListFriendRequests` |
| **Método / Rota** | `GET /me/friend-requests` |
| **Tela** | Amigos → aba "Convites" + badge `2` (`[C]`) |

**Query params**

| Param | Tipo | Obrig. | Default | Valores |
|---|---|:--:|---|---|
| `direction` | string | ✖ | `INCOMING` | `INCOMING` \| `OUTGOING` |
| `status` | string (csv) | ✖ | `PENDING` | `PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED` |
| `limit` | integer | ✖ | 20 | 1–100 |
| `cursor` | string | ✖ | — | |

```http
GET /api/v1/me/friend-requests?direction=INCOMING&status=PENDING
```

**`200 OK`**
```json
{
  "items": [
    {
      "id": "9f8e7d6c-5b4a-4392-8180-000000000001",
      "direction": "INCOMING",
      "status": "PENDING",
      "user": {
        "id": "66666666-6666-4666-8666-666666666666",
        "username": "carlosmota",
        "displayName": "Carlos Mota",
        "avatarUrl": null,
        "initials": "CA",
        "avatarColor": "#c8b6ff"
      },
      "message": null,
      "mutualFriendsCount": 2,
      "createdAt": "2026-07-27T13:30:00Z",
      "expiresAt": null
    },
    {
      "id": "9f8e7d6c-5b4a-4392-8180-000000000002",
      "direction": "INCOMING",
      "status": "PENDING",
      "user": {
        "id": "77777777-7777-4777-8777-777777777777",
        "username": "pedronunes",
        "displayName": "Pedro Nunes",
        "avatarUrl": null,
        "initials": "PE",
        "avatarColor": "#8ecae6"
      },
      "message": null,
      "mutualFriendsCount": 1,
      "createdAt": "2026-07-26T22:14:00Z",
      "expiresAt": null
    }
  ],
  "meta": { "totalItems": 2, "pageSize": 20, "hasMore": false, "nextCursor": null }
}
```

> `meta.totalItems` é a fonte do **badge vermelho "2"** na aba (`[C]`). Não é preciso endpoint de contagem separado — a tela já carrega a lista.

**Erros:** `401`, `422 INVALID_FILTER_VALUE`.

---

## FRIEND-03 · Enviar convite de amizade

| | |
|---|---|
| **Caso de uso** | `SendFriendRequest` |
| **Método / Rota** | `POST /friend-requests` |
| **Permissões** | Usuário autenticado e verificado (RN-AUTH-008) |
| **Tela** | Busca de usuários → "Adicionar" (`[I]`) |

**Headers:** `Idempotency-Key` obrigatório.

**Request body**

| Campo | Tipo | Obrig. | Formato | Validação | Descrição |
|---|---|:--:|---|---|---|
| `userId` | uuid | ✔¹ | UUID | Deve existir, `<> self`, não bloqueado | Destinatário |
| `username` | string | ✔¹ | `^[a-z0-9_.]{3,20}$` | Alternativa a `userId` | Permite convidar direto pelo `@` |
| `message` | string | ✖ | texto | ≤200 | Pós-MVP |

¹ Exatamente um de `userId` **ou** `username`.

```http
POST /api/v1/friend-requests
Authorization: Bearer eyJ…
Content-Type: application/json
Idempotency-Key: 3c4d5e6f-7a8b-49c0-8d1e-000000000010

{ "userId": "66666666-6666-4666-8666-666666666666" }
```

**`201 Created`**
```json
{
  "id": "9f8e7d6c-5b4a-4392-8180-000000000010",
  "direction": "OUTGOING",
  "status": "PENDING",
  "user": {
    "id": "66666666-6666-4666-8666-666666666666",
    "username": "carlosmota",
    "displayName": "Carlos Mota",
    "avatarUrl": null,
    "initials": "CA",
    "avatarColor": "#c8b6ff"
  },
  "createdAt": "2026-07-27T19:00:00Z",
  "expiresAt": null
}
```
`Location: /api/v1/friend-requests/9f8e7d6c-5b4a-4392-8180-000000000010`

**Caso especial — convite recíproco (RN-FRIEND-004):** se já existia convite pendente do destinatário para o solicitante, a resposta é **`200 OK`** com:
```json
{
  "id": "9f8e7d6c-5b4a-4392-8180-000000000001",
  "status": "ACCEPTED",
  "autoAccepted": true,
  "friendship": { "id": "6d5c4b3a-2918-4706-85f4-000000000005", "createdAt": "2026-07-27T19:00:00Z" },
  "user": { "id": "66666666-6666-4666-8666-666666666666", "username": "carlosmota", "displayName": "Carlos Mota" }
}
```

**Erros**

| Status | `code` | Quando |
|---|---|---|
| `400` | `IDEMPOTENCY_KEY_REQUIRED` | |
| `403` | `EMAIL_NOT_VERIFIED` | RN-AUTH-008 |
| `403` | `USER_BLOCKED` | O destinatário bloqueou o solicitante (mensagem genérica, não revela o bloqueio) |
| `404` | `USER_NOT_FOUND` | Inexistente/anonimizado/não buscável |
| `409` | `ALREADY_FRIENDS` | RN-FRIEND-005 |
| `409` | `FRIEND_REQUEST_ALREADY_PENDING` | Já existe pendente no mesmo sentido — devolve o existente em `extensions.existingRequestId` |
| `422` | `CANNOT_FRIEND_SELF` | RN-FRIEND-002 |
| `422` | `VALIDATION_ERROR` | Nenhum ou ambos os identificadores |
| `429` | `RATE_LIMIT_EXCEEDED` | 30 convites/dia `[R]` (antispam) |

**Efeitos colaterais** — cria `FriendRequest`; cria `Notification(FRIEND_REQUEST_RECEIVED)` para o destinatário.
**Eventos** — `FriendRequestSent`.
**Idempotência** — chave obrigatória; reenvio com a mesma chave replica a resposta; reenvio com chave nova e convite já pendente devolve `409` com o ID existente (não cria duplicata).

---

## FRIEND-04 · Aceitar convite

| | |
|---|---|
| **Caso de uso** | `AcceptFriendRequest` |
| **Método / Rota** | `POST /friend-requests/{requestId}/accept` |
| **Permissões** | Somente o **destinatário** |
| **Tela** | Amigos → Convites → "Aceitar"; Notificações → ação inline (`[C]`) |

**Path params:** `requestId` (uuid).
**Body:** vazio.

```http
POST /api/v1/friend-requests/9f8e7d6c-5b4a-4392-8180-000000000001/accept
Authorization: Bearer eyJ…
```

**`200 OK`**
```json
{
  "requestId": "9f8e7d6c-5b4a-4392-8180-000000000001",
  "status": "ACCEPTED",
  "respondedAt": "2026-07-27T19:05:00Z",
  "friendship": {
    "id": "6d5c4b3a-2918-4706-85f4-000000000005",
    "createdAt": "2026-07-27T19:05:00Z",
    "friend": {
      "id": "66666666-6666-4666-8666-666666666666",
      "username": "carlosmota",
      "displayName": "Carlos Mota",
      "avatarUrl": null,
      "initials": "CA",
      "avatarColor": "#c8b6ff"
    }
  }
}
```

| Status | `code` | Quando |
|---|---|---|
| `404` | `FRIEND_REQUEST_NOT_FOUND` | Inexistente **ou** o solicitante não é o destinatário (§3.3) |
| `409` | `FRIEND_REQUEST_NOT_PENDING` | Já aceito/recusado/cancelado — extensão `currentStatus` |
| `409` | `ALREADY_FRIENDS` | Corrida com aceitação recíproca |

**Efeitos colaterais** — cria `Friendship` (com `userAId < userBId`), marca request `ACCEPTED`, resolve a notificação original, notifica o remetente (`FRIEND_REQUEST_ACCEPTED`).
**Eventos** — `FriendRequestAccepted`, `FriendshipCreated`.
**Idempotência** — repetir devolve `409 FRIEND_REQUEST_NOT_PENDING`; o app trata como sucesso quando `currentStatus = ACCEPTED`.
**Concorrência** — transação com `SELECT … FOR UPDATE` no request; unique da amizade cobre a corrida.

---

## FRIEND-05 · Recusar convite

`POST /friend-requests/{requestId}/decline` · Bearer · destinatário · body vazio

**`200 OK`**
```json
{ "requestId": "9f8e7d6c-5b4a-4392-8180-000000000002", "status": "DECLINED", "respondedAt": "2026-07-27T19:06:00Z" }
```

Erros: `404 FRIEND_REQUEST_NOT_FOUND`, `409 FRIEND_REQUEST_NOT_PENDING`.
**Efeitos colaterais** — status `DECLINED`, resolve a notificação. **Não notifica o remetente** (RN-FRIEND-007).
**Eventos** — `FriendRequestDeclined` (interno; sem notificação).

## FRIEND-06 · Cancelar convite enviado

`DELETE /friend-requests/{requestId}` · Bearer · somente o **remetente**

**`204 No Content`**

Erros: `404 FRIEND_REQUEST_NOT_FOUND` (inclusive quando o solicitante é o destinatário — ele deve usar `decline`), `409 FRIEND_REQUEST_NOT_PENDING`.
**Efeitos colaterais** — status `CANCELLED`; **apaga (soft) a notificação** pendente no destinatário `[R]` — um convite cancelado não deve continuar acionável.

---

## FRIEND-07 · Remover amigo

| | |
|---|---|
| **Caso de uso** | `RemoveFriend` |
| **Método / Rota** | `DELETE /me/friends/{userId}` |
| **Tela** | Lista de amigos → ação destrutiva (`[I]`) |

**`204 No Content`**

| Status | `code` | Quando |
|---|---|---|
| `404` | `FRIENDSHIP_NOT_FOUND` | Não são amigos |

**Efeitos colaterais** — soft delete da `Friendship`. **Não** remove de ligas, **não** apaga partidas, **não** notifica (RN-FRIEND-009). O head-to-head continua acessível se houver liga em comum.
**Eventos** — `FriendshipRemoved`.
**Idempotência** — natural.

---

## FRIEND-08 · Head-to-head (agregado)

| | |
|---|---|
| **Caso de uso** | `GetHeadToHead` |
| **Método / Rota** | `GET /me/head-to-head/{userId}` |
| **Permissões** | Amigos **ou** ao menos uma liga/partida em comum (§3.2, nota ⁶) |
| **Tela** | H2H — placar "5 × 3" + barra 62% (`[C]`) |

**Path params:** `userId` (uuid) — adversário.

**Query params**

| Param | Tipo | Obrig. | Default | Valores | Descrição |
|---|---|:--:|---|---|---|
| `leagueId` | uuid | ✖ | — | | Filtro "Todas as ligas / Liga da Terça / Bar do Zé" (`[C]`) |
| `period` | string | ✖ | `LAST_90_DAYS` | `LAST_30_DAYS`, `LAST_90_DAYS`, `ALL_TIME` | Filtro de período (`[C]`) |
| `from` / `to` | date | ✖ | — | ISO | Alternativa a `period` (mutuamente exclusivos) |

```http
GET /api/v1/me/head-to-head/22222222-2222-4222-8222-222222222222?period=ALL_TIME
Authorization: Bearer eyJ…
```

**`200 OK`**
```json
{
  "opponent": {
    "id": "22222222-2222-4222-8222-222222222222",
    "username": "joaop",
    "displayName": "João Pereira",
    "avatarUrl": "https://cdn.encacapei.com.br/avatars/22222222-2222-4222-8222-222222222222/256.webp",
    "initials": "JO",
    "avatarColor": "#8ecae6"
  },
  "filters": { "leagueId": null, "period": "ALL_TIME", "from": null, "to": null },
  "summary": {
    "myWins": 5,
    "opponentWins": 3,
    "totalMatches": 8,
    "myWinRate": 62.50,
    "opponentWinRate": 37.50,
    "sessionsPlayed": 4,
    "currentStreak": { "holder": "ME", "count": 1 },
    "longestStreak": { "holder": "ME", "count": 2 },
    "lastMatch": {
      "id": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
      "winnerUserId": "11111111-1111-4111-8111-111111111111",
      "finishedAt": "2026-07-15T01:08:22Z",
      "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
      "leagueName": "Liga da Terça"
    },
    "firstMatchAt": "2025-04-15T23:40:00Z"
  },
  "byLeague": [
    { "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "leagueName": "Liga da Terça", "myWins": 3, "opponentWins": 3, "totalMatches": 6 },
    { "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000002", "leagueName": "Ranking do Bar do Zé", "myWins": 2, "opponentWins": 0, "totalMatches": 2 }
  ]
}
```

> `myWinRate = 5/8 = 62.50` → a UI exibe **62%** e a barra em 62% (`[C]`).
> `byLeague` alimenta as opções do **filtro de liga** da tela, evitando um segundo request.

**Erros**

| Status | `code` | Quando |
|---|---|---|
| `403` | `HEAD_TO_HEAD_NOT_ALLOWED` | Não são amigos e não há liga/partida em comum |
| `404` | `USER_NOT_FOUND` | |
| `422` | `CONFLICTING_FILTERS` | `period` junto com `from`/`to` |
| `422` | `CANNOT_COMPARE_WITH_SELF` | `userId` = solicitante |

**Cache:** `private, max-age=60`.

---

## FRIEND-09 · Head-to-head por jogatina

| | |
|---|---|
| **Caso de uso** | `GetHeadToHeadSessions` |
| **Método / Rota** | `GET /me/head-to-head/{userId}/sessions` |
| **Tela** | H2H → "Dias de jogatina" (`[C]`) |

**Query params:** `leagueId`, `period`, `from`, `to` (iguais a FRIEND-08), `limit` (default 20, máx 100), `cursor`.

```http
GET /api/v1/me/head-to-head/22222222-2222-4222-8222-222222222222/sessions?period=LAST_90_DAYS&limit=20
```

**`200 OK`**
```json
{
  "items": [
    {
      "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
      "businessDate": "2026-07-14",
      "league": { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça" },
      "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" },
      "myWins": 1,
      "opponentWins": 0,
      "totalMatches": 1,
      "outcome": "WIN",
      "matchIds": ["3f4a5b6c-7d8e-4f90-8a1b-000000000009"]
    },
    {
      "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000002",
      "businessDate": "2026-07-07",
      "league": { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça" },
      "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" },
      "myWins": 2,
      "opponentWins": 1,
      "totalMatches": 3,
      "outcome": "WIN",
      "matchIds": [
        "3f4a5b6c-7d8e-4f90-8a1b-000000000021",
        "3f4a5b6c-7d8e-4f90-8a1b-000000000024",
        "3f4a5b6c-7d8e-4f90-8a1b-000000000026"
      ]
    },
    {
      "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000003",
      "businessDate": "2026-06-30",
      "league": { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça" },
      "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" },
      "myWins": 0,
      "opponentWins": 2,
      "totalMatches": 2,
      "outcome": "LOSS",
      "matchIds": [
        "3f4a5b6c-7d8e-4f90-8a1b-000000000031",
        "3f4a5b6c-7d8e-4f90-8a1b-000000000032"
      ]
    },
    {
      "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000004",
      "businessDate": "2026-06-23",
      "league": { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000002", "name": "Ranking do Bar do Zé" },
      "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" },
      "myWins": 2,
      "opponentWins": 0,
      "totalMatches": 2,
      "outcome": "WIN",
      "matchIds": [
        "3f4a5b6c-7d8e-4f90-8a1b-000000000041",
        "3f4a5b6c-7d8e-4f90-8a1b-000000000042"
      ]
    }
  ],
  "meta": { "totalItems": 4, "pageSize": 20, "hasMore": false, "nextCursor": null }
}
```

> Reproduz os cards do mockup — `7 de julho, 2026 — Você 2 × 1`, `30 de junho, 2026 — João 2 × 0`, `23 de junho, 2026 — Você 2 × 0` — acrescido da jogatina de **14/07**, que o mockup omitia (`INC-10`). A soma fecha em 5 × 3, exatamente o placar do topo da tela.
> `outcome` (`WIN`/`LOSS`/`DRAW`) determina a cor do badge, poupando o app de comparar números.

**Erros:** iguais a FRIEND-08.

---

## FRIEND-10 · Ligas em comum com um adversário

`GET /me/head-to-head/{userId}/leagues` · Bearer

Existe para popular o **select de liga** do H2H quando o cliente não quer carregar o agregado inteiro.

**`200 OK`**
```json
{
  "items": [
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça", "status": "ACTIVE", "matchesTogether": 6 },
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000002", "name": "Ranking do Bar do Zé", "status": "ACTIVE", "matchesTogether": 2 }
  ],
  "meta": { "totalItems": 2 }
}
```

---

## FRIEND-11 · Bloquear usuário (pós-MVP, `DP-022`)

| | |
|---|---|
| **Método / Rota** | `POST /me/blocks` |
| **Body** | `{ "userId": "…", "reason": "HARASSMENT" }` (`reason` ∈ `SPAM`\|`HARASSMENT`\|`OTHER`, opcional) |
| **Sucesso** | `201 Created` — `{ "id": "…", "blockedUser": {…}, "createdAt": "…" }` |
| **Efeitos** | Remove amizade, cancela convites pendentes nos dois sentidos, oculta o perfil nas buscas, impede novos convites |
| **Erros** | `404 USER_NOT_FOUND`, `409 ALREADY_BLOCKED`, `422 CANNOT_BLOCK_SELF` |
| **Não faz** | Não remove de ligas em comum nem apaga histórico de partidas — bloquear alguém não pode apagar o ranking de terceiros |

`GET /me/blocks` (lista) e `DELETE /me/blocks/{userId}` (`204`) completam o módulo.
