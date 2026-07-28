# 8e. Endpoints — Locais, notificações e compartilhamento

# Módulo Venues

## VENUE-01 · Buscar locais (proximidade ou texto)

| | |
|---|---|
| **Caso de uso** | `SearchVenues` |
| **Método / Rota** | `GET /venues` |
| **Autenticação** | Bearer |
| **Permissões** | Qualquer usuário autenticado |
| **Tela** | Aba Locais (mapa) e autocomplete do wizard (`[C]`) |

**Query params**

| Param | Tipo | Obrig. | Default | Validação | Descrição |
|---|---|:--:|---|---|---|
| `lat` | number | ✖¹ | — | −90 a 90, 6 decimais | Latitude do usuário |
| `lng` | number | ✖¹ | — | −180 a 180 | Longitude do usuário |
| `radiusKm` | number | ✖ | 5 | 0,1–50 | Raio de busca (RN-VENUE-001) |
| `q` | string | ✖¹ | — | 2–60 | Busca por nome/bairro/cidade |
| `city` | string | ✖ | — | ≤80 | |
| `openNow` | boolean | ✖ | `false` | — | Filtra por horário de funcionamento no fuso do local |
| `maxPricePerHour` | number | ✖ | — | ≥0 | |
| `minRating` | number | ✖ | — | 0–5 | |
| `limit` | integer | ✖ | 20 | 1–50 | |
| `cursor` | string | ✖ | — | Opaco | |
| `sort` | string | ✖ | `distance` (com coords) / `name` | `distance`, `rating`, `pricePerHour`, `name` | |
| `fields` | string | ✖ | `full` | `full` \| `map` | `map` devolve só o necessário para os pins |

¹ É obrigatório informar **`lat`+`lng`** ou **`q`** ou **`city`**. Nenhum dos três → `422 LOCATION_OR_QUERY_REQUIRED`.

```http
GET /api/v1/venues?lat=-23.5583&lng=-46.6604&radiusKm=5&sort=distance
Authorization: Bearer eyJ…
```

**`200 OK`**
```json
{
  "items": [
    {
      "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001",
      "name": "Bar do Zé",
      "photoUrl": "https://cdn.encacapei.com.br/venues/5e6f7a8b-9c0d-4e1f-8a2b-000000000001/cover.webp",
      "addressLine": "R. Domingos de Morais, 1234",
      "neighborhood": "Vila Mariana",
      "city": "São Paulo",
      "state": "SP",
      "postalCode": "04010-200",
      "latitude": -23.561414,
      "longitude": -46.655881,
      "distanceKm": 2.4,
      "pricePerHour": { "amount": 30.00, "currency": "BRL" },
      "rating": 4.5,
      "ratingCount": 128,
      "ratingSource": "INTERNAL",
      "tablesCount": 3,
      "isOpenNow": true,
      "openingHoursSummary": "Seg–Dom, 20h–04h",
      "leaguesCount": 2,
      "status": "ACTIVE"
    },
    {
      "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000002",
      "name": "Sinuca Central",
      "photoUrl": "https://cdn.encacapei.com.br/venues/5e6f7a8b-9c0d-4e1f-8a2b-000000000002/cover.webp",
      "addressLine": "Av. São João, 700",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "postalCode": "01035-000",
      "latitude": -23.550520,
      "longitude": -46.633308,
      "distanceKm": 3.8,
      "pricePerHour": { "amount": 25.00, "currency": "BRL" },
      "rating": 4.1,
      "ratingCount": 64,
      "ratingSource": "INTERNAL",
      "tablesCount": 6,
      "isOpenNow": true,
      "openingHoursSummary": "Ter–Dom, 18h–02h",
      "leaguesCount": 1,
      "status": "ACTIVE"
    },
    {
      "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000003",
      "name": "Snooker House Pinheiros",
      "photoUrl": "https://cdn.encacapei.com.br/venues/5e6f7a8b-9c0d-4e1f-8a2b-000000000003/cover.webp",
      "addressLine": "R. dos Pinheiros, 980",
      "neighborhood": "Pinheiros",
      "city": "São Paulo",
      "state": "SP",
      "postalCode": "05422-001",
      "latitude": -23.567200,
      "longitude": -46.693400,
      "distanceKm": 5.1,
      "pricePerHour": { "amount": 45.00, "currency": "BRL" },
      "rating": 4.8,
      "ratingCount": 210,
      "ratingSource": "INTERNAL",
      "tablesCount": 8,
      "isOpenNow": false,
      "openingHoursSummary": "Qua–Sáb, 19h–03h",
      "leaguesCount": 1,
      "status": "ACTIVE"
    }
  ],
  "meta": {
    "totalItems": 3,
    "pageSize": 20,
    "hasMore": false,
    "nextCursor": null,
    "searchCenter": { "latitude": -23.5583, "longitude": -46.6604 },
    "radiusKm": 5
  }
}
```

> São os **3 pins do mapa** (`[C]`). `distanceKm: 2.4` reproduz "📍 2,4 km de você".
> `Snooker House Pinheiros` está a 5,1 km — fora do raio de 5 km. Incluído aqui por ser o 3º pin do mockup; na prática o cliente enviaria `radiusKm=6`. **Nota de implementação:** o filtro é `ST_DWithin` estrito; não há tolerância.

**Erros**

| Status | `code` | Quando |
|---|---|---|
| `422` | `LOCATION_OR_QUERY_REQUIRED` | Nenhum critério informado |
| `422` | `INVALID_COORDINATES` | Fora dos limites geográficos |
| `422` | `RADIUS_OUT_OF_RANGE` | > 50 km |
| `422` | `SEARCH_QUERY_TOO_SHORT` | `q` < 2 |
| `429` | `RATE_LIMIT_EXCEEDED` | 60/min |

**Privacidade** — `lat`/`lng` do usuário **não são persistidos nem logados** (RN-PRIV-002); os parâmetros são removidos do log de acesso por filtro dedicado.
**Cache** — `private, max-age=60` quando há coordenadas; `public, max-age=300` na busca textual.
**Efeitos colaterais / eventos** — nenhum.

## VENUE-02 · Detalhe do local

| | |
|---|---|
| **Método / Rota** | `GET /venues/{venueId}` |
| **Tela** | Modal do local (`[C]`) |

**Query params:** `lat`, `lng` (opcionais — habilitam `distanceKm`).

```http
GET /api/v1/venues/5e6f7a8b-9c0d-4e1f-8a2b-000000000001?lat=-23.5583&lng=-46.6604
```

**`200 OK`** (`ETag: W/"2"`)
```json
{
  "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001",
  "name": "Bar do Zé",
  "description": "Bar de esquina com 3 mesas de sinuca e chope gelado.",
  "photoUrl": "https://cdn.encacapei.com.br/venues/5e6f7a8b-9c0d-4e1f-8a2b-000000000001/cover.webp",
  "addressLine": "R. Domingos de Morais, 1234",
  "neighborhood": "Vila Mariana",
  "city": "São Paulo",
  "state": "SP",
  "postalCode": "04010-200",
  "country": "BR",
  "latitude": -23.561414,
  "longitude": -46.655881,
  "distanceKm": 2.4,
  "phone": "+551155551234",
  "pricePerHour": { "amount": 30.00, "currency": "BRL" },
  "rating": 4.5,
  "ratingCount": 128,
  "ratingSource": "INTERNAL",
  "ratingAttribution": null,
  "tablesCount": 3,
  "isOpenNow": true,
  "openingHoursSummary": "Seg–Dom, 20h–04h",
  "openingHours": [
    { "weekday": "MONDAY",    "opensAt": "20:00", "closesAt": "04:00", "crossesMidnight": true },
    { "weekday": "TUESDAY",   "opensAt": "20:00", "closesAt": "04:00", "crossesMidnight": true },
    { "weekday": "WEDNESDAY", "opensAt": "20:00", "closesAt": "04:00", "crossesMidnight": true },
    { "weekday": "THURSDAY",  "opensAt": "20:00", "closesAt": "04:00", "crossesMidnight": true },
    { "weekday": "FRIDAY",    "opensAt": "20:00", "closesAt": "04:00", "crossesMidnight": true },
    { "weekday": "SATURDAY",  "opensAt": "20:00", "closesAt": "04:00", "crossesMidnight": true },
    { "weekday": "SUNDAY",    "opensAt": "20:00", "closesAt": "04:00", "crossesMidnight": true }
  ],
  "leaguesCount": 2,
  "myLeaguesHere": [
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça" },
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000002", "name": "Ranking do Bar do Zé" }
  ],
  "directions": {
    "latitude": -23.561414,
    "longitude": -46.655881,
    "label": "Bar do Zé",
    "geoUri": "geo:-23.561414,-46.655881?q=-23.561414,-46.655881(Bar%20do%20Z%C3%A9)"
  },
  "attachableLeagues": [
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça", "alreadyHere": true },
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000002", "name": "Ranking do Bar do Zé", "alreadyHere": true }
  ],
  "status": "ACTIVE",
  "createdAt": "2025-11-02T13:00:00Z",
  "updatedAt": "2026-06-18T10:22:00Z",
  "version": 2
}
```

> `directions.geoUri` é tudo que o botão **"Traçar rota"** precisa — o app abre o mapa nativo, sem chamada ao backend (RN-VENUE-008).
> `attachableLeagues` popula o seletor de **"Atrelar liga a este local"**, listando apenas ligas que o usuário administra (`[C]` + `[R]`).

**Erros:** `404 VENUE_NOT_FOUND`, `422 INVALID_COORDINATES`.

## VENUE-03 · Ligas que jogam no local

| | |
|---|---|
| **Método / Rota** | `GET /venues/{venueId}/leagues` |
| **Tela** | Modal → "Ligas que jogam aqui" (`[C]`) |

**Query params:** `status` (default `ACTIVE`), `limit`, `cursor`.

**`200 OK`**
```json
{
  "items": [
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça", "visibility": "PRIVATE", "status": "ACTIVE", "membersCount": 5, "scheduleSummary": "Terças, 20h–00h", "isMember": true, "canJoin": false },
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000002", "name": "Ranking do Bar do Zé", "visibility": "PUBLIC", "status": "ACTIVE", "membersCount": 8, "scheduleSummary": "Sextas, 21h–01h", "isMember": true, "canJoin": false }
  ],
  "meta": { "totalItems": 2, "pageSize": 20, "hasMore": false, "nextCursor": null }
}
```

> Retorna **"Liga da Terça, Ranking do Bar do Zé"** exatamente como no modal (`[C]`).
> A liga privada só aparece porque o solicitante é membro (RN-VENUE-006). Para um estranho, a lista traria apenas a pública, e `meta.totalItems` seria 1 — **o contador nunca revela a existência de ligas privadas**.

**Erros:** `404 VENUE_NOT_FOUND`.

## VENUE-04 · Atrelar / desatrelar liga a um local

Não existe endpoint próprio: é um `PATCH` na liga (`[C]`, RN-VENUE-007).

```http
PATCH /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001
Authorization: Bearer eyJ…
Content-Type: application/json
If-Match: W/"7"

{ "venueId": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001" }
```
Desatrelar: `{ "venueId": null }`. Contrato completo em [LEAGUE-05](08c-endpoints-leagues.md#league-05--editar-liga).

## VENUE-05 · Avaliar local (`DP-017` — fora do MVP)

| | |
|---|---|
| **Método / Rota** | `POST /venues/{venueId}/reviews` |
| **Status** | **Não implementado no MVP.** Contrato reservado; a API responde `409 FEATURE_NOT_AVAILABLE` com `feature: "venueReviews"` |

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `rating` | integer | ✔ | 1–5 |
| `comment` | string | ✖ | ≤500 |

**`201 Created`** — `{ "id": "…", "rating": 5, "comment": "Mesa nova, taco bom.", "createdAt": "…", "venueRating": { "rating": 4.5, "ratingCount": 129 } }`
Erros previstos: `409 ALREADY_REVIEWED` (1 avaliação por usuário, editável), `409 NEVER_PLAYED_HERE` (`[R]`: só avalia quem tem jogatina registrada no local — mata spam), `404 VENUE_NOT_FOUND`.

## VENUE-06 · Administração do catálogo (back-office)

`POST /admin/venues`, `PATCH /admin/venues/{id}`, `DELETE /admin/venues/{id}` — exclusivo de `PLATFORM_ADMIN` (`DP-018`). Campos idênticos a VENUE-02, com `status` e `externalRef`. Toda mutação gera `AuditLog(PLATFORM_ADMIN_ACTION)`.

---

# Módulo Notifications

## NOTIF-01 · Listar notificações

| | |
|---|---|
| **Caso de uso** | `ListNotifications` |
| **Método / Rota** | `GET /me/notifications` |
| **Permissões** | Próprio usuário (escopo `/me` filtra sempre por `sub`) |
| **Tela** | Perfil → aba Notificações, com 3 seções (`[C]`) |

**Query params**

| Param | Tipo | Default | Valores |
|---|---|---|---|
| `category` | string (csv) | todas | `LEAGUE_INVITATIONS`, `FRIEND_REQUESTS`, `SESSION_ALERTS`, `MATCH_RESULTS`, `LEAGUE_UPDATES`, `SYSTEM` |
| `unreadOnly` | boolean | `false` | |
| `pendingActionOnly` | boolean | `false` | Só notificações acionáveis não resolvidas |
| `groupBy` | string | — | `category` — devolve `groups[]` em vez de `items[]` |
| `limit` | integer | 20 | 1–100 |
| `cursor` | string | — | |
| `sort` | string | `-createdAt` | `createdAt` |

```http
GET /api/v1/me/notifications?groupBy=category&limit=50
Authorization: Bearer eyJ…
```

**`200 OK`** — formato agrupado, espelhando as 3 seções da tela:
```json
{
  "groups": [
    {
      "category": "LEAGUE_INVITATIONS",
      "label": "Convites de liga",
      "unreadCount": 1,
      "items": [
        {
          "id": "2b3c4d5e-6f70-4812-9a34-000000000001",
          "category": "LEAGUE_INVITATIONS",
          "type": "LEAGUE_INVITATION_RECEIVED",
          "title": "Liga do Churrasco te convidou",
          "body": "Felipe Costa quer você na Liga do Churrasco.",
          "payload": {
            "invitationId": "8a9b0c1d-2e3f-4a5b-8c6d-000000000001",
            "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000004",
            "leagueName": "Liga do Churrasco",
            "invitedByUserId": "33333333-3333-4333-8333-333333333333",
            "expiresAt": "2026-08-01T14:30:00Z"
          },
          "actions": [
            { "key": "ACCEPT",  "label": "Aceitar", "style": "PRIMARY",   "method": "POST", "href": "/api/v1/league-invitations/8a9b0c1d-2e3f-4a5b-8c6d-000000000001/accept" },
            { "key": "DECLINE", "label": "Recusar", "style": "SECONDARY", "method": "POST", "href": "/api/v1/league-invitations/8a9b0c1d-2e3f-4a5b-8c6d-000000000001/decline" }
          ],
          "deepLink": "encacapei://league-invitations/8a9b0c1d-2e3f-4a5b-8c6d-000000000001",
          "icon": "ENVELOPE",
          "readAt": null,
          "resolvedAt": null,
          "expiresAt": "2026-08-01T14:30:00Z",
          "createdAt": "2026-07-27T16:30:00Z"
        }
      ]
    },
    {
      "category": "FRIEND_REQUESTS",
      "label": "Convites de amigos",
      "unreadCount": 1,
      "items": [
        {
          "id": "2b3c4d5e-6f70-4812-9a34-000000000002",
          "category": "FRIEND_REQUESTS",
          "type": "FRIEND_REQUEST_RECEIVED",
          "title": "Carlos Mota quer ser seu amigo",
          "body": null,
          "payload": {
            "friendRequestId": "9f8e7d6c-5b4a-4392-8180-000000000001",
            "userId": "66666666-6666-4666-8666-666666666666",
            "displayName": "Carlos Mota",
            "username": "carlosmota"
          },
          "actions": [
            { "key": "ACCEPT",  "label": "Aceitar", "style": "PRIMARY",   "method": "POST", "href": "/api/v1/friend-requests/9f8e7d6c-5b4a-4392-8180-000000000001/accept" },
            { "key": "DECLINE", "label": "Recusar", "style": "SECONDARY", "method": "POST", "href": "/api/v1/friend-requests/9f8e7d6c-5b4a-4392-8180-000000000001/decline" }
          ],
          "deepLink": "encacapei://friend-requests/9f8e7d6c-5b4a-4392-8180-000000000001",
          "icon": "USERS",
          "readAt": null,
          "resolvedAt": null,
          "expiresAt": null,
          "createdAt": "2026-07-27T13:30:00Z"
        }
      ]
    },
    {
      "category": "SESSION_ALERTS",
      "label": "Avisos de jogatina",
      "unreadCount": 1,
      "items": [
        {
          "id": "2b3c4d5e-6f70-4812-9a34-000000000003",
          "category": "SESSION_ALERTS",
          "type": "SESSION_REMINDER",
          "title": "Sua jogatina da Liga da Terça começa em 1 hora",
          "body": "Hoje às 20h no Bar do Zé.",
          "payload": {
            "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
            "leagueName": "Liga da Terça",
            "sessionStartsAt": "2026-07-28T23:00:00Z",
            "venueId": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001",
            "venueName": "Bar do Zé"
          },
          "actions": [],
          "deepLink": "encacapei://leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
          "icon": "CLOCK",
          "readAt": null,
          "resolvedAt": null,
          "expiresAt": "2026-07-28T23:00:00Z",
          "createdAt": "2026-07-28T22:00:00Z"
        }
      ]
    }
  ],
  "meta": { "totalItems": 3, "unreadCount": 3, "pageSize": 50, "hasMore": false, "nextCursor": null }
}
```

> `meta.unreadCount = 3` é o **badge vermelho "3"** da aba (`[C]`).
> Os três cards do mockup estão reproduzidos com os textos originais, inclusive `"hoje, 19:00"` (que o app deriva de `createdAt` — o backend nunca envia data relativa).
> `actions[].href` permite ao app executar a ação inline sem saber montar a rota (`[R]`, HATEOAS pontual e útil).

**Erros:** `401 UNAUTHENTICATED`, `422 INVALID_FILTER_VALUE`.

Sem `groupBy`, a resposta usa o formato plano `{ "items": [...], "meta": {...} }` com os mesmos objetos.

## NOTIF-02 · Contador de não lidas

| | |
|---|---|
| **Método / Rota** | `GET /me/notifications/unread-count` |
| **Tela** | Badges do app (`[C]`) |

**`200 OK`**
```json
{
  "total": 3,
  "byCategory": {
    "LEAGUE_INVITATIONS": 1,
    "FRIEND_REQUESTS": 1,
    "SESSION_ALERTS": 1,
    "MATCH_RESULTS": 0,
    "LEAGUE_UPDATES": 0,
    "SYSTEM": 0
  },
  "pendingActions": 2,
  "computedAt": "2026-07-28T22:05:00Z"
}
```

**Cache** `[R]` — Redis com TTL de 30 s, invalidado por `NotificationCreated` / `MarkAsRead`. Endpoint de altíssima frequência (chamado a cada foreground do app).

## NOTIF-03 · Marcar uma como lida

`POST /me/notifications/{notificationId}/read` · **`200 OK`**
```json
{ "id": "2b3c4d5e-6f70-4812-9a34-000000000003", "readAt": "2026-07-28T22:06:11Z", "unreadCount": 2 }
```
Erros: `404 NOTIFICATION_NOT_FOUND` (também quando pertence a outro usuário). Repetir é idempotente: devolve o `readAt` original.

## NOTIF-04 · Marcar várias / todas como lidas

`POST /me/notifications/read`

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `notificationIds` | array\<uuid\> | ✖¹ | ≤200 |
| `category` | string | ✖¹ | Enum de categoria |
| `all` | boolean | ✖¹ | `true` marca todas |

¹ Exatamente uma das três formas.

```json
{ "all": true }
```

**`200 OK`** — `{ "markedCount": 3, "unreadCount": 0, "readAt": "2026-07-28T22:06:30Z" }`
Erros: `422 AMBIGUOUS_SELECTION` (mais de uma forma), `422 TOO_MANY_IDS`.

## NOTIF-05 · Excluir notificação

`DELETE /me/notifications/{notificationId}` · **`204 No Content`** (soft delete).
Erros: `404 NOTIFICATION_NOT_FOUND`, `409 NOTIFICATION_HAS_PENDING_ACTION` (convite pendente não é apagável sem `?force=true` — RN-NOTIF-005).

## NOTIF-06 · Limpar histórico

| | |
|---|---|
| **Método / Rota** | `DELETE /me/notifications` |
| **Tela** | Notificações → "Limpar histórico" (`[C]`) |

**Query params**

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `scope` | string | `READ` | `READ` (apaga lidas e resolvidas) \| `ALL` |
| `category` | string | — | Limita a uma seção |
| `olderThan` | date | — | |

```http
DELETE /api/v1/me/notifications?scope=READ
```

**`200 OK`**
```json
{ "deletedCount": 41, "keptCount": 2, "keptReason": "PENDING_ACTION", "unreadCount": 2 }
```

> `scope=READ` é o default **de propósito** (RN-NOTIF-005): perder um convite de liga por ter tocado em "Limpar histórico" é pior que uma lista comprida. `keptReason` permite a UI explicar por que 2 itens ficaram.

## NOTIF-07 · Consultar preferências

`GET /me/notification-preferences` · **`200 OK`**
```json
{
  "items": [
    { "category": "LEAGUE_INVITATIONS", "label": "Convites de liga",    "inAppEnabled": true, "pushEnabled": true,  "emailEnabled": false, "locked": false },
    { "category": "FRIEND_REQUESTS",    "label": "Convites de amigos",  "inAppEnabled": true, "pushEnabled": true,  "emailEnabled": false, "locked": false },
    { "category": "SESSION_ALERTS",     "label": "Avisos de jogatina",  "inAppEnabled": true, "pushEnabled": true,  "emailEnabled": false, "locked": false },
    { "category": "MATCH_RESULTS",      "label": "Resultados",          "inAppEnabled": true, "pushEnabled": false, "emailEnabled": false, "locked": false },
    { "category": "LEAGUE_UPDATES",     "label": "Novidades da liga",   "inAppEnabled": true, "pushEnabled": false, "emailEnabled": false, "locked": false },
    { "category": "SYSTEM",             "label": "Avisos do sistema",   "inAppEnabled": true, "pushEnabled": true,  "emailEnabled": true,  "locked": true }
  ],
  "quietHours": { "enabled": true, "startTime": "23:30", "endTime": "08:00", "timezone": "America/Sao_Paulo" },
  "pushAvailable": false,
  "pushUnavailableReason": "FEATURE_DISABLED"
}
```

> `locked: true` em `SYSTEM`: avisos de segurança não podem ser desligados (RN-NOTIF-009).
> `pushAvailable: false` no MVP — o app esconde a coluna de push em vez de mostrar um toggle inútil.

## NOTIF-08 · Atualizar preferências

`PUT /me/notification-preferences`

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `items` | array\<object\> | ✔ | 1–6 itens |
| `items[].category` | string | ✔ | Enum; não pode ser `SYSTEM` |
| `items[].inAppEnabled` | boolean | ✖ | |
| `items[].pushEnabled` | boolean | ✖ | |
| `items[].emailEnabled` | boolean | ✖ | |
| `quietHours.enabled` | boolean | ✖ | |
| `quietHours.startTime` / `endTime` | string | ✖ | `HH:mm`; ambos ou nenhum |
| `quietHours.timezone` | string | ✖ | IANA |

```json
{
  "items": [
    { "category": "MATCH_RESULTS", "pushEnabled": true },
    { "category": "LEAGUE_UPDATES", "inAppEnabled": false }
  ],
  "quietHours": { "enabled": true, "startTime": "23:30", "endTime": "08:00", "timezone": "America/Sao_Paulo" }
}
```

**`200 OK`** — recurso completo de NOTIF-07.
Erros: `422 CANNOT_DISABLE_SYSTEM_CATEGORY`, `422 INVALID_QUIET_HOURS` (só um dos horários), `422 INVALID_TIMEZONE`.

## NOTIF-09 · Registrar device para push

| | |
|---|---|
| **Método / Rota** | `POST /me/devices` |
| **Tela** | Nenhuma — chamado no boot do app após permissão do SO (`[I]`) |

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `pushToken` | string | ✔ | 32–4096 chars |
| `platform` | string | ✔ | `IOS` \| `ANDROID` \| `WEB` |
| `deviceId` | string | ✖ | UUID estável do device |
| `deviceName` | string | ✖ | ≤60 |
| `appVersion` | string | ✖ | ≤20 |
| `osVersion` | string | ✖ | ≤20 |
| `locale` | string | ✖ | BCP 47 |

**`200 OK`** (upsert por `pushToken`)
```json
{
  "id": "e7f8a9b0-c1d2-4e3f-8a4b-000000000001",
  "platform": "IOS",
  "deviceName": "iPhone 15 de Rodrigo",
  "registeredAt": "2026-07-28T22:10:00Z",
  "lastSeenAt": "2026-07-28T22:10:00Z",
  "pushEnabled": false,
  "note": "Push notifications ainda não estão habilitadas nesta versão do produto."
}
```
Erros: `422 INVALID_PUSH_TOKEN`, `429 RATE_LIMIT_EXCEEDED` (10/h).
**Observação `[R]`** — o endpoint **entra no MVP** mesmo com push desligado: assim, quando o Notification Hubs for ativado, a base de tokens já existe e não é preciso esperar um ciclo de atualização nas lojas.

## NOTIF-10 · Remover device

`DELETE /me/devices/{deviceId}` · **`204 No Content`**. Chamado no logout (RN-AUTH-016).

---

# Módulo Sharing

## SHARE-01 · Resumo da jogatina

| | |
|---|---|
| **Caso de uso** | `GetSessionSummary` |
| **Método / Rota** | `GET /play-sessions/{playSessionId}/summary` |
| **Permissões** | Participante da jogatina ou membro da liga |
| **Tela** | Modal "Parabéns! 🎉" — dados do card (`[C]`) |

```http
GET /api/v1/play-sessions/7c8d9e0f-1a2b-4c3d-8e4f-000000000001/summary
Authorization: Bearer eyJ…
```

**`200 OK`**
```json
{
  "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
  "businessDate": "2026-07-14",
  "label": "Jogatina de 14 jul",
  "league": { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça" },
  "venue": { "id": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001", "name": "Bar do Zé" },
  "status": "IN_PROGRESS",
  "isFinal": false,
  "headline": "Você está em 1º lugar na jogatina de hoje da Liga da Terça.",
  "myPosition": 1,
  "myWins": 4,
  "myLosses": 0,
  "totalMatches": 9,
  "podium": [
    { "position": 1, "medal": "GOLD",   "displayName": "Rodrigo Baroni", "shortName": "Rodrigo",  "initials": "RB", "avatarColor": "#C1E778", "wins": 4, "losses": 0, "isMe": true },
    { "position": 2, "medal": "SILVER", "displayName": "Felipe Costa",   "shortName": "Felipe",   "initials": "FE", "avatarColor": "#f4a261", "wins": 3, "losses": 1, "isMe": false },
    { "position": 3, "medal": "BRONZE", "displayName": "João Pereira",   "shortName": "João",     "initials": "JO", "avatarColor": "#8ecae6", "wins": 2, "losses": 2, "isMe": false },
    { "position": 4, "medal": null,     "displayName": "Anderson Lima",  "shortName": "Anderson", "initials": "AN", "avatarColor": "#e9c46a", "wins": 0, "losses": 6, "isMe": false }
  ],
  "shareText": "🎱 Jogatina de 14 jul — Liga da Terça\n\n🥇 Rodrigo — 4 vitórias\n🥈 Felipe — 3 vitórias\n🥉 João — 2 vitórias\n4º Anderson — 0 vitórias\n\nRegistrado no Encaçapei 🏆",
  "permissions": { "canShare": true, "canGenerateImage": false },
  "generatedAt": "2026-07-15T01:08:25Z"
}
```

> `shortName` ("Rodrigo", "Felipe", "João") é exatamente o que o card do mockup exibe (`[C]`) e já é a **forma minimizada** exigida por `DP-004`.
> `shareText` sai pronto do backend, com emojis e quebras de linha — o app só entrega ao share sheet (§4.15).
> `canGenerateImage: false` reflete a feature flag do MVP.

**Erros:** `403 NOT_SESSION_PARTICIPANT`, `404 PLAY_SESSION_NOT_FOUND`.

## SHARE-02 · Criar compartilhamento

| | |
|---|---|
| **Caso de uso** | `CreateShare` |
| **Método / Rota** | `POST /play-sessions/{playSessionId}/share` |
| **Permissões** | Participante da jogatina ou `ADMIN`/`OWNER` (RN-SHARE-001) |
| **Headers** | `Idempotency-Key` obrigatório |
| **Tela** | Modal → WhatsApp / Copiar / Instagram / TikTok (`[C]`) |

| Campo | Tipo | Obrig. | Validação | Default | Descrição |
|---|---|:--:|---|---|---|
| `format` | string | ✖ | `LINK` \| `IMAGE_STORY` \| `IMAGE_SQUARE` | `LINK` | Story = 1080×1920 (Instagram/TikTok) |
| `kind` | string | ✖ | `SESSION_PODIUM` \| `LEAGUE_RANKING` | `SESSION_PODIUM` | |
| `visibilityLevel` | string | ✖ | `MINIMAL` \| `FULL` | `MINIMAL` | `FULL` exige opt-in de **todos** os participantes (`DP-004`) |
| `expiresInDays` | integer | ✖ | 1–90 | 30 | |

**Exemplo — link (síncrono)**
```http
POST /api/v1/play-sessions/7c8d9e0f-1a2b-4c3d-8e4f-000000000001/share
Authorization: Bearer eyJ…
Content-Type: application/json
Idempotency-Key: c1d2e3f4-a5b6-4c7d-8e9f-000000000030

{ "format": "LINK", "visibilityLevel": "MINIMAL", "expiresInDays": 30 }
```

**`201 Created`**
```json
{
  "id": "4c5d6e7f-8091-42a3-b5c6-000000000001",
  "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
  "kind": "SESSION_PODIUM",
  "format": "LINK",
  "status": "READY",
  "publicToken": "Jt7xK2mQ9pR4vN8sL1yB6cW3zA5dF0hG-eU",
  "shareUrl": "https://encacapei.com.br/p/Jt7xK2mQ9pR4vN8sL1yB6cW3zA5dF0hG-eU",
  "imageUrl": null,
  "shareText": "🎱 Jogatina de 14 jul — Liga da Terça\n\n🥇 Rodrigo — 4 vitórias\n🥈 Felipe — 3 vitórias\n🥉 João — 2 vitórias\n4º Anderson — 0 vitórias\n\nVeja o resumo: https://encacapei.com.br/p/Jt7xK2mQ9pR4vN8sL1yB6cW3zA5dF0hG-eU",
  "visibilityLevel": "MINIMAL",
  "snapshotFrozenAt": "2026-07-15T01:10:00Z",
  "viewCount": 0,
  "expiresAt": "2026-08-14T01:10:00Z",
  "createdBy": { "id": "11111111-1111-4111-8111-111111111111", "displayName": "Rodrigo Baroni" },
  "createdAt": "2026-07-15T01:10:00Z"
}
```

**Exemplo — imagem (assíncrono, `DP-020`)**
```json
{ "format": "IMAGE_STORY" }
```
**`202 Accepted`** (`Location: /api/v1/share-artifacts/4c5d6e7f-8091-42a3-b5c6-000000000002`)
```json
{
  "id": "4c5d6e7f-8091-42a3-b5c6-000000000002",
  "kind": "SESSION_PODIUM",
  "format": "IMAGE_STORY",
  "status": "PROCESSING",
  "publicToken": "Rq9wT4nZ8kM2xC6vB1yH5jL0pD7sF3gA-eK",
  "shareUrl": "https://encacapei.com.br/p/Rq9wT4nZ8kM2xC6vB1yH5jL0pD7sF3gA-eK",
  "imageUrl": null,
  "statusUrl": "/api/v1/share-artifacts/4c5d6e7f-8091-42a3-b5c6-000000000002",
  "estimatedReadySeconds": 4,
  "expiresAt": "2026-08-14T01:10:30Z",
  "createdAt": "2026-07-15T01:10:30Z"
}
```

**Erros**

| Status | `code` | Quando |
|---|---|---|
| `400` | `IDEMPOTENCY_KEY_REQUIRED` | |
| `403` | `NOT_SESSION_PARTICIPANT` | Não jogou nessa noite |
| `403` | `SHARE_CONSENT_REQUIRED` | `visibilityLevel = FULL` sem opt-in de todos — extensão `missingConsentUserIds[]` |
| `404` | `PLAY_SESSION_NOT_FOUND` | |
| `409` | `FEATURE_NOT_AVAILABLE` | `IMAGE_*` no MVP — `feature: "shareImageGeneration"` |
| `409` | `SESSION_HAS_NO_MATCHES` | Jogatina sem partida finalizada — não há pódio |
| `422` | `EXPIRES_IN_OUT_OF_RANGE` | |
| `429` | `RATE_LIMIT_EXCEEDED` | 10/h (RN-SHARE, geração de imagem é caro) |

**Efeitos colaterais** — cria `ShareArtifact` com `snapshot` **congelado** (RN-SHARE-002); se `IMAGE_*`, enfileira render.
**Eventos** — `ShareArtifactRequested`, depois `ShareArtifactReady` \| `ShareArtifactFailed`.

## SHARE-03 · Consultar status da geração

`GET /share-artifacts/{shareArtifactId}` · criador, participantes ou admin da liga

**`200 OK`**
```json
{
  "id": "4c5d6e7f-8091-42a3-b5c6-000000000002",
  "status": "READY",
  "format": "IMAGE_STORY",
  "imageUrl": "https://cdn.encacapei.com.br/shares/4c5d6e7f-8091-42a3-b5c6-000000000002/story.png",
  "imageWidth": 1080,
  "imageHeight": 1920,
  "imageSizeBytes": 214_512,
  "shareUrl": "https://encacapei.com.br/p/Rq9wT4nZ8kM2xC6vB1yH5jL0pD7sF3gA-eK",
  "viewCount": 0,
  "expiresAt": "2026-08-14T01:10:30Z",
  "completedAt": "2026-07-15T01:10:34Z",
  "failureReason": null
}
```

`status` ∈ `PENDING` \| `PROCESSING` \| `READY` \| `FAILED` \| `REVOKED`.
Em `FAILED`: `failureReason` legível (`RENDER_TIMEOUT`, `STORAGE_ERROR`) e `retryable: true`.
Erros: `403 NOT_SHARE_OWNER`, `404 SHARE_ARTIFACT_NOT_FOUND`.
**Polling recomendado `[R]`** — 1 s, 2 s, 4 s, 8 s (backoff), desistindo em 30 s com mensagem "o card está sendo gerado, avisaremos".

## SHARE-04 · Revogar compartilhamento

`DELETE /share-artifacts/{shareArtifactId}` · criador ou `ADMIN`/`OWNER` da liga · **`204 No Content`**.
Efeito: `status = REVOKED`, link passa a responder `410`, imagem é removida do CDN. `AuditLog(SHARE_REVOKED)`.

## SHARE-05 · Consultar compartilhamento público

| | |
|---|---|
| **Caso de uso** | `GetPublicShare` |
| **Método / Rota** | `GET /public/shares/{publicToken}` |
| **Autenticação** | **Pública** — qualquer pessoa com o link |
| **Tela** | Página aberta a partir do WhatsApp (`[I]`) |

```http
GET /api/v1/public/shares/Jt7xK2mQ9pR4vN8sL1yB6cW3zA5dF0hG-eU
```

**`200 OK`** — **conteúdo minimizado** (`DP-004`, RN-SHARE-004):
```json
{
  "kind": "SESSION_PODIUM",
  "date": "2026-07-14",
  "label": "Jogatina de 14 jul",
  "leagueName": "Liga da Terça",
  "venueName": "Bar do Zé",
  "city": "São Paulo",
  "podium": [
    { "position": 1, "medal": "GOLD",   "name": "Rodrigo B.",  "initials": "RB", "avatarColor": "#C1E778", "wins": 4 },
    { "position": 2, "medal": "SILVER", "name": "Felipe C.",   "initials": "FE", "avatarColor": "#f4a261", "wins": 3 },
    { "position": 3, "medal": "BRONZE", "name": "João P.",     "initials": "JO", "avatarColor": "#8ecae6", "wins": 2 },
    { "position": 4, "medal": null,     "name": "Anderson L.", "initials": "AN", "avatarColor": "#e9c46a", "wins": 0 }
  ],
  "totalMatches": 9,
  "imageUrl": null,
  "appDeepLink": "encacapei://play-sessions/7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
  "appStoreUrl": "https://encacapei.com.br/app",
  "expiresAt": "2026-08-14T01:10:00Z"
}
```

> **O que foi deliberadamente omitido:** `userId`, `username`, avatar real, `playSessionId`, `leagueId`, e-mail, estatísticas gerais e link para perfil. O nome vem como **"Rodrigo B."** — primeiro nome + inicial. Um participante que optou por não aparecer vira `"Jogador"` sem iniciais (RN-SHARE-009).

**Headers de resposta:** `Cache-Control: public, max-age=600`, `X-Robots-Tag: noindex, nofollow` (RN-SHARE-008).

**Erros**

| Status | `code` | Quando |
|---|---|---|
| `404` | `SHARE_NOT_FOUND` | Token inexistente |
| `410` | `SHARE_EXPIRED` | Passou de `expiresAt` |
| `410` | `SHARE_REVOKED` | Revogado |
| `409` | `SHARE_NOT_READY` | Imagem ainda em geração — `Retry-After: 3` |
| `429` | `RATE_LIMIT_EXCEEDED` | 60/min por IP |

**Efeitos colaterais** — incrementa `viewCount` (assíncrono, sem bloquear a resposta e sem registrar IP).
