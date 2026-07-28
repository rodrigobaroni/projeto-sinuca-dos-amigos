# 7. Padrões gerais da API

## 7.1 Base URL e versionamento

| Ambiente | Base URL |
|---|---|
| Produção | `https://api.encacapei.com.br/api/v1` |
| Homologação | `https://api-hml.encacapei.com.br/api/v1` |
| Desenvolvimento | `https://localhost:5001/api/v1` |

**Versionamento por path (`/api/v1`)** `[R]`. Alternativas avaliadas:

| Estratégia | Prós | Contras | Decisão |
|---|---|---|---|
| Path (`/api/v1`) | Óbvio no log, no cache e no CDN; trivial de rotear | "Polui" a URL | **Escolhida** — cliente mobile com versões antigas na loja precisa de rota estável e legível |
| Header (`Accept: application/vnd.encacapei.v1+json`) | URL limpa | Difícil de depurar, cache por header é frágil | Rejeitada |
| Query (`?version=1`) | Simples | Fácil de omitir por engano | Rejeitada |

**Política de evolução `[R]`:**
- Mudanças **aditivas** (novo campo opcional, novo endpoint, novo valor de enum em campo de leitura) não incrementam a versão. O cliente **deve** ignorar campos desconhecidos.
- Mudanças **quebráveis** (remover campo, mudar tipo, tornar campo obrigatório, mudar semântica) exigem `/api/v2`, com `v1` mantido por no mínimo **6 meses** e header `Sunset` (RFC 8594) nas respostas da versão antiga.
- Novos valores de enum em campos de **escrita** são aditivos; em campos de **leitura** o cliente precisa tratar valor desconhecido de forma tolerante (documentado no contrato).

## 7.2 Formato e convenções

| Item | Regra |
|---|---|
| Content type | `application/json; charset=utf-8`. Erros usam `application/problem+json` |
| Naming | `camelCase` em propriedades JSON; `kebab-case` em segmentos de rota (`/friend-requests`, `/play-sessions`, `/invite-codes`) |
| Recursos | Substantivos no **plural** (`/leagues`, `/matches`) |
| Ações não-CRUD | Sub-recurso verbal em `POST`: `/matches/{id}/finish`, `/leagues/{id}/leave`. Preferível a `PATCH` com `{"status": "..."}`, porque cada ação tem autorização, validação e efeito colateral próprios |
| Enums | `SCREAMING_SNAKE_CASE` (`ONE_VS_ONE`, `PENDING`, `LEAGUE_INVITATIONS`) |
| Booleanos | Prefixo `is`/`has`/`can` (`isWinner`, `hasActiveSession`, `canEdit`) |
| IDs | UUID em `string` (nunca inteiro sequencial exposto) |
| Nulos | Campo ausente ≠ `null`. `PATCH` omite o campo para "não mudar" e envia `null` para "limpar" |
| Coleções | Sempre objeto com `items`, nunca array na raiz (permite adicionar `meta` sem quebrar) |
| Datas | ISO 8601 em **UTC** com `Z`: `2026-07-27T18:30:00Z` |
| Data pura | `2026-07-14` (sem hora) — usado em `businessDate`, `startsAt`, `endsAt` |
| Hora pura | `20:00` (`HH:mm`, 24 h) — usado em `schedule.startTime` |
| Timezone | IANA (`America/Sao_Paulo`), nunca offset fixo (o Brasil já mudou de horário de verão e pode mudar de novo) |
| Duração | Inteiro com unidade no nome (`reminderMinutesBefore`, `expiresInHours`, `durationSeconds`) |
| Dinheiro | `{"amount": 30.00, "currency": "BRL"}` — número decimal, **nunca** string com "R$" |
| Percentual | Número 0–100 com 2 casas (`62.50`), **não** fração |
| Coordenadas | `latitude`/`longitude` como números decimais |
| Idioma | Textos de erro em `pt-BR`; `Accept-Language` respeitado quando houver i18n |

### Envelope de resposta `[R]`

**Decisão: envelope `data` apenas em coleções; recursos únicos vão "crus".**

Racional pedido no enunciado: envelopes uniformes (`{data, meta, links}`) são úteis quando toda resposta precisa de metadados. Aqui, ~70 % dos endpoints devolvem um recurso único onde `meta` seria sempre vazio — envelope viraria ruído em todo cliente (`response.data.data.name`). Já coleções **sempre** precisam de paginação. Portanto:

**Recurso único — sem envelope:**
```json
{
  "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
  "name": "Liga da Terça",
  "status": "ACTIVE",
  "createdAt": "2026-01-14T22:10:00Z",
  "version": 7
}
```

**Coleção — com `items` + `meta` (+ `links` quando houver mais páginas):**
```json
{
  "items": [ { "id": "…", "name": "…" } ],
  "meta": {
    "totalItems": 47,
    "pageSize": 20,
    "hasMore": true,
    "nextCursor": "eyJpZCI6IjNmNGE1YjZjIiwidCI6IjIwMjYtMDctMTVUMDI6MjE6MTVaIn0"
  },
  "links": {
    "next": "/api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001/matches?cursor=eyJpZCI6…&limit=20"
  }
}
```

**Erro — sempre RFC 9457** (`application/problem+json`), detalhado no [capítulo 10](10-catalogo-erros.md).

## 7.3 Autenticação

**Bearer JWT (RS256) no header `Authorization`.**

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImVuYy0yMDI2LTAzIn0…
```

| Token | Vida | Armazenamento no app | Rotação |
|---|---|---|---|
| **Access token** | **15 min** | Memória (nunca em disco) | Reemitido pelo refresh |
| **Refresh token** | **30 dias** | Keychain/Keystore (secure storage) | **Rotacionado a cada uso**, com detecção de reuso |

**Racional dos prazos `[R]`:** 15 min limita a janela de um access token vazado sem exigir refresh a cada tela; 30 dias evita que o jogador precise logar de novo toda semana — comportamento esperado num app de lazer. A rotação com detecção de reuso (RN-AUTH-014) é o que torna 30 dias aceitável.

**Fluxo de expiração no cliente:** ao receber `401` com `code = TOKEN_EXPIRED`, o app chama `POST /auth/refresh` **uma vez**, com fila de requisições pendentes, e repete a requisição original. `401 TOKEN_REVOKED` ou `INVALID_REFRESH_TOKEN` → logout imediato.

Endpoints públicos (sem `Authorization`): `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/password/forgot`, `/auth/password/reset`, `/auth/email/verify`, `GET /public/shares/{token}`, `GET /app/bootstrap`, `GET /health`.

## 7.4 Headers

### Request

| Header | Obrigatório | Exemplo | Descrição |
|---|---|---|---|
| `Authorization` | Sim (exceto públicos) | `Bearer eyJ…` | Access token |
| `Content-Type` | Em body | `application/json; charset=utf-8` | |
| `Accept` | Não | `application/json` | |
| `Accept-Language` | Não | `pt-BR` | Idioma das mensagens |
| `Idempotency-Key` | Sim em POSTs mutantes | `d290f1ee-6c54-4b01-90e6-d701748f0851` | UUID v4 gerado pelo **cliente** por intenção do usuário |
| `If-Match` | Sim em mutação de recurso versionado | `W/"7"` | Optimistic locking |
| `If-None-Match` | Não | `W/"7"` | Cache condicional (GET) |
| `X-Correlation-Id` | Não | `0af7651916cd43dd8448eb211c80319c` | Se ausente, o servidor gera |
| `traceparent` | Não | `00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01` | W3C Trace Context (preferido) |
| `X-App-Version` | Recomendado | `1.4.2 (312)` | Diagnóstico e force-update |
| `X-Device-Id` | Recomendado | UUID estável do device | Correlação de sessão |
| `X-Client-Timezone` | Não | `America/Sao_Paulo` | Fallback quando o perfil não tem fuso |

### Response

| Header | Quando | Exemplo |
|---|---|---|
| `Content-Type` | Sempre | `application/json; charset=utf-8` \| `application/problem+json` |
| `X-Correlation-Id` | Sempre | Ecoa ou gera |
| `X-Trace-Id` | Sempre | `0af7651916cd43dd8448eb211c80319c` — o mesmo valor que aparece no corpo do erro |
| `ETag` | GET/PATCH de recurso versionado | `W/"7"` |
| `Location` | `201 Created` | `/api/v1/leagues/0a1b2c3d-…-000000000001` |
| `Retry-After` | `429`, `503`, `409 IN_PROGRESS` | `30` (segundos) |
| `X-RateLimit-Limit` / `-Remaining` / `-Reset` | Sempre em rotas limitadas | `60` / `57` / `1785177960` |
| `Cache-Control` | Sempre | `private, max-age=0, must-revalidate` (padrão) |
| `Idempotent-Replay` | Resposta replicada | `true` |
| `Deprecation` / `Sunset` | Endpoint em descontinuação | `Sun, 01 Feb 2027 00:00:00 GMT` |
| `Strict-Transport-Security` | Sempre | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | Sempre | `nosniff` |

## 7.5 Paginação

**Duas estratégias, escolhidas por caso de uso `[R]`:**

### Cursor (padrão para feeds e históricos)

Usada em: histórico de partidas, notificações, jogatinas, busca de usuários, busca de ligas públicas, h2h por jogatina.

```
GET /api/v1/leagues/{id}/matches?limit=20&cursor=eyJpZCI6IjNmNGE1YjZjIiwidCI6IjIwMjYtMDctMTVUMDI6MjE6MTVaIn0
```

| Parâmetro | Tipo | Default | Máx. | Descrição |
|---|---|---|---|---|
| `limit` | integer | 20 | 100 | Itens por página |
| `cursor` | string | — | — | Opaco (base64 de `{lastId, lastSortValue}`); **não** deve ser construído pelo cliente |

Vantagem decisiva: listas ordenadas por `finishedAt DESC` recebem itens novos o tempo todo durante a jogatina. Com `offset`, rolar a lista mostraria itens repetidos ou pularia partidas. Com cursor, não.

### Offset (só onde o total importa e o conjunto é estável)

Usada em: membros da liga, ranking, lista de amigos.

```
GET /api/v1/leagues/{id}/members?page=1&pageSize=50
```

| Parâmetro | Tipo | Default | Máx. |
|---|---|---|---|
| `page` | integer (1-based) | 1 | — |
| `pageSize` | integer | 20 | 100 |

`meta` inclui `totalItems` e `totalPages`.

### Coleções não paginadas

Ranking de liga (≤ ~50 membros), pódio da jogatina e preferências de notificação retornam a coleção completa com `meta.totalItems`. Se uma liga passar de **200 membros**, o ranking passa a paginar — regra registrada agora para não virar incidente depois.

## 7.6 Ordenação

```
?sort=-finishedAt,displayName
```

- Prefixo `-` = decrescente; sem prefixo = crescente.
- Múltiplos campos separados por vírgula, aplicados na ordem.
- Cada endpoint declara sua **lista fechada** de campos ordenáveis; campo fora da lista → `422 INVALID_SORT_FIELD`. Nunca interpolar o parâmetro em SQL.

| Endpoint | Campos permitidos | Default |
|---|---|---|
| `GET /me/leagues` | `name`, `createdAt`, `lastActivityAt`, `nextSessionAt` | `-lastActivityAt` |
| `GET /leagues/{id}/matches` | `finishedAt`, `startedAt` | `-finishedAt` |
| `GET /leagues/{id}/members` | `displayName`, `joinedAt`, `role` | `displayName` |
| `GET /me/friends` | `displayName`, `createdAt` | `displayName` |
| `GET /venues` | `distance`, `rating`, `pricePerHour`, `name` | `distance` (ou `name` sem coordenadas) |
| `GET /me/notifications` | `createdAt` | `-createdAt` |
| `GET /leagues/public` | `relevance`, `membersCount`, `lastActivityAt` | `relevance` |

Ranking **não** aceita `sort`: a ordem é regra de negócio (RN-RANKING-002), não preferência de cliente.

## 7.7 Filtros

**Convenção:** um parâmetro por conceito, valores em `SCREAMING_SNAKE_CASE`, múltiplos valores separados por vírgula (`?status=ACTIVE,FINISHED`). Nada de sintaxe `filter[campo][op]=valor` — a API não precisa de um DSL para 8 filtros.

| Parâmetro | Onde | Valores |
|---|---|---|
| `status` | ligas, partidas, jogatinas, convites | Enums do recurso |
| `leagueId` | h2h, partidas, jogatinas | UUID |
| `playSessionId` | partidas | UUID |
| `userId` / `opponentId` | partidas | UUID |
| `result` | partidas | `WIN` \| `LOSS` — **relativo ao usuário autenticado** `[C]` |
| `period` | h2h, estatísticas | `LAST_7_DAYS` \| `LAST_30_DAYS` \| `LAST_90_DAYS` \| `CURRENT_YEAR` \| `ALL_TIME` `[C]` |
| `from` / `to` | qualquer intervalo customizado | `date` (ISO), interpretado no fuso do recurso |
| `direction` | convites | `INCOMING` \| `OUTGOING` |
| `category` | notificações | Enum de categoria |
| `unreadOnly` | notificações | `true` \| `false` |
| `visibility` | ligas | `PUBLIC` \| `PRIVATE` |

**Regra de precedência:** `period` e `from`/`to` são mutuamente exclusivos → enviar ambos = `422 CONFLICTING_FILTERS`.

## 7.8 Busca textual

| Parâmetro | Regras |
|---|---|
| `q` | 2–60 caracteres; `< 2` → `422 SEARCH_QUERY_TOO_SHORT`; trim; normalização de acentos (`unaccent`) |

| Endpoint | Campos pesquisados | Técnica |
|---|---|---|
| `GET /users` | `username`, `displayName` | Trigram (`pg_trgm`) + prefixo exato priorizado |
| `GET /leagues/public` | `name`, `description`, nome do local | Trigram + ranking por relevância |
| `GET /venues` | `name`, `neighborhood`, `city` | Trigram |
| `GET /me/friends` | `username`, `displayName` | Filtro em memória/índice (conjunto pequeno) |
| `GET /leagues/{id}/members` | `username`, `displayName` | Idem |

Rate limit específico de busca: **30 req/min por usuário** (o campo dispara a cada tecla; o app **deve** aplicar debounce de 300 ms).

## 7.9 Idempotência

Ver RN-IDEM-001..005. Resumo operacional:

| Situação | Resposta |
|---|---|
| 1ª chamada | Processa; grava `key + hash(body) + response`; responde normalmente |
| Retry, mesmo corpo, original concluída | Replica status e corpo originais + `Idempotent-Replay: true` |
| Retry, mesmo corpo, original em andamento | `409 IDEMPOTENT_REQUEST_IN_PROGRESS` + `Retry-After: 1` |
| Mesma chave, corpo diferente | `422 IDEMPOTENCY_KEY_REUSE` |
| Chave ausente onde obrigatória | `400 IDEMPOTENCY_KEY_REQUIRED` |
| Chave malformada (não-UUID) | `422 INVALID_IDEMPOTENCY_KEY` |

**Escopo:** chave é única por (`userId`, `endpoint`). Isso impede que uma chave reutilizada em outro endpoint devolva a resposta errada.
**Regra para o app `[R]`:** gerar a chave **quando o usuário toca no botão**, não quando a requisição é montada — assim o retry automático reaproveita a mesma chave.

## 7.10 Concorrência otimista

```http
GET /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001
→ 200 OK
   ETag: W/"7"
   { …, "version": 7 }

PATCH /api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000001
   If-Match: W/"7"
→ 200 OK
   ETag: W/"8"
```

| Cenário | Status | Código |
|---|---|---|
| `If-Match` ausente onde obrigatório | `428` | `PRECONDITION_REQUIRED` |
| `If-Match` divergente | `409` | `CONCURRENT_MODIFICATION` (corpo traz `currentVersion` e o estado atual) |
| `If-None-Match` igual ao atual (GET) | `304` | — |

**Por que `409` e não `412` no divergente `[R]`:** `412` é semanticamente correto, mas clientes HTTP e proxies tratam `412` de forma inconsistente e o app precisa do **corpo** com o estado atual para reconciliar sem uma segunda ida ao servidor. Usamos `409` com Problem Details completo. `412` fica reservado a `If-None-Match` em escrita.

Recursos com `ETag`/`version`: `League`, `Match`, `PlaySession`, `LeagueMember`, `User` (`/me`), `Venue`.

## 7.11 Cache

| Tipo de recurso | Política | Exemplo |
|---|---|---|
| Dado pessoal/autenticado | `Cache-Control: private, max-age=0, must-revalidate` + `ETag` | `/me`, `/me/leagues` |
| Ranking | `private, max-age=15, must-revalidate` | Muda a cada partida; 15 s corta a rajada de refresh |
| Estatísticas e séries | `private, max-age=60` | Tolerante a atraso |
| Catálogo de locais | `public, max-age=300` (sem `lat/lng`) / `private, max-age=60` (com) | Coordenadas tornam a resposta pessoal |
| Detalhe de partida em andamento | `no-store` | Estado vivo |
| Link público de compartilhamento | `public, max-age=600` + `X-Robots-Tag: noindex` | |
| Qualquer resposta de auth | `no-store` | |

Cache **server-side** (Redis / Azure Cache for Redis) `[R]`: contador de não lidas (TTL 30 s, invalidado por evento), ranking de liga (TTL 60 s, invalidado em `RankingUpdated`), bootstrap e catálogo de locais (TTL 5 min). Chaves versionadas por `version` do recurso para invalidação natural.

## 7.12 Rate limiting

Implementação `[R]`: *sliding window* em Redis, aplicada por (`userId` \| `ipHash`, bucket). Azure API Management ou middleware `AspNetCoreRateLimit`.

| Bucket | Limite | Escopo | Motivo |
|---|---|---|---|
| `auth:login` | 5/min, 20/h | IP + e-mail | Força bruta |
| `auth:register` | 3/h | IP | Criação em massa |
| `auth:forgot-password` | 3/h | IP + e-mail | Abuso de envio de e-mail |
| `auth:refresh` | 30/min | Usuário | |
| `auth:verify-resend` | 1/min, 5/dia | Usuário | |
| `search` | 30/min | Usuário | Busca a cada tecla |
| `write:matches` | 120/min | Usuário | Registro de bola é rápido, mas não infinito |
| `write:general` | 60/min | Usuário | |
| `read:general` | 300/min | Usuário | |
| `share:generate` | 10/h | Usuário | Geração de imagem é cara |
| `public:shares` | 60/min | IP | Link público |
| `global` | 1000/min | IP | Defesa de borda |

Resposta ao estourar: `429` + `Retry-After` + Problem Details `RATE_LIMIT_EXCEEDED`. Headers `X-RateLimit-*` presentes **em todas** as respostas dessas rotas, não só nas bloqueadas.

## 7.13 Estrutura padrão de sucesso

| Operação | Status | Corpo | Headers notáveis |
|---|---|---|---|
| Leitura de recurso | `200` | Recurso | `ETag` |
| Leitura de coleção | `200` | `{items, meta, links?}` | |
| Criação | `201` | Recurso criado | `Location`, `ETag` |
| Criação idempotente já existente | `200` | Recurso existente | `Idempotent-Replay: true` |
| Atualização | `200` | Recurso atualizado | `ETag` |
| Ação sem retorno relevante | `204` | vazio | |
| Processamento assíncrono aceito | `202` | `{jobId, status, statusUrl}` | `Location: statusUrl` |
| Login/refresh | `200` | `{accessToken, refreshToken, expiresIn, tokenType, user}` | `no-store` |

## 7.14 Estrutura padrão de erro

RFC 9457 (Problem Details), `Content-Type: application/problem+json`:

```json
{
  "type": "https://api.encacapei.com.br/problems/league-not-found",
  "title": "Liga não encontrada",
  "status": 404,
  "code": "LEAGUE_NOT_FOUND",
  "detail": "A liga informada não existe ou não está disponível para este usuário.",
  "instance": "/api/v1/leagues/0a1b2c3d-4e5f-4a6b-8c7d-000000000009",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-27T18:30:12Z",
  "retryable": false,
  "errors": []
}
```

| Campo | Sempre? | Descrição |
|---|---|---|
| `type` | ✔ | URI estável e documentada do tipo de problema |
| `title` | ✔ | Título curto em `pt-BR`, **não** varia por instância |
| `status` | ✔ | Espelha o código HTTP |
| `code` | ✔ | **Chave estável** para o cliente ramificar lógica — nunca traduza `title` para decidir comportamento |
| `detail` | ✔ | Explicação legível ao usuário final; pode variar por instância |
| `instance` | ✔ | Path da requisição |
| `traceId` | ✔ | Correlação com o log (o app pode exibir na tela de erro) |
| `timestamp` | ✔ | |
| `retryable` | ✔ | `true` quando repetir a requisição idêntica pode dar certo (429, 503, 409 in-progress) |
| `errors[]` | Em `422` | Erros por campo |
| Extensões | Conforme o caso | `currentVersion`, `retryAfterSeconds`, `conflictingMatchId`, `expiresAt` |

**Erro de validação (`422`):**
```json
{
  "type": "https://api.encacapei.com.br/problems/validation-error",
  "title": "Dados inválidos",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "detail": "Um ou mais campos estão inválidos.",
  "instance": "/api/v1/auth/register",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "timestamp": "2026-07-27T18:30:12Z",
  "retryable": false,
  "errors": [
    { "field": "password", "code": "PASSWORD_MISSING_UPPERCASE", "message": "A senha deve conter ao menos uma letra maiúscula." },
    { "field": "password", "code": "PASSWORD_TOO_SHORT", "message": "A senha deve ter no mínimo 8 caracteres." },
    { "field": "username", "code": "USERNAME_TAKEN", "message": "Este nome de usuário já está em uso." }
  ]
}
```

`errors[]` acumula **todos** os problemas (não para no primeiro) — a tela de cadastro precisa marcar os 5 critérios de senha de uma vez.

## 7.15 Semântica de status HTTP

| Status | Uso no Encaçapei |
|---|---|
| `200` | Leitura, atualização, ação concluída com corpo |
| `201` | Recurso criado (liga, partida, convite, evento) |
| `202` | Aceito para processamento assíncrono (correção com rebuild, geração de imagem, exportação LGPD) |
| `204` | Ação sem corpo (marcar lida, remover amigo, sair da liga) |
| `304` | `If-None-Match` bateu |
| `400` | Requisição malformada (JSON inválido, header obrigatório ausente) |
| `401` | Não autenticado / token expirado / revogado |
| `403` | Autenticado, recurso visível, mas sem permissão |
| `404` | Não existe **ou** não é visível ao solicitante (privacidade) |
| `405` | Método não permitido na rota |
| `409` | Conflito de estado ou concorrência (já é membro, partida já finalizada, versão divergente) |
| `410` | Recurso expirou permanentemente (convite expirado, link revogado) |
| `413` | Payload acima do limite (avatar > 5 MB) |
| `415` | `Content-Type` não suportado |
| `422` | Sintaticamente válido, semanticamente inválido (validação de campo) |
| `428` | `If-Match` obrigatório ausente |
| `429` | Rate limit |
| `500` | Erro interno — nunca vaza stack trace |
| `503` | Indisponível (manutenção, dependência fora) — com `Retry-After` |

**`400` vs `422` `[R]`:** `400` é para requisição que o servidor não consegue **interpretar** (JSON quebrado, header ausente). `422` é para requisição perfeitamente interpretável cujo **conteúdo** viola regra de negócio ou formato de campo. A distinção importa: `422` sempre traz `errors[]` acionável pela UI; `400` normalmente indica bug do cliente.

## 7.16 Observabilidade da API `[R]`

- **`traceId`** é o `trace-id` do W3C Trace Context, propagado de ponta a ponta e presente no header, no corpo de erro e em todo log estruturado.
- **Log estruturado** (Serilog → Application Insights) com: `traceId`, `userId`, `route`, `statusCode`, `durationMs`, `idempotencyKey` (hash), `leagueId`/`matchId` quando aplicável. **Nunca** corpo de requisição de autenticação, e-mail, token ou coordenada.
- **Métricas de negócio** expostas junto às técnicas: `matches_finished_total`, `matches_corrected_total`, `sessions_opened_total`, `ranking_rebuilds_total`, `idempotent_replays_total`, `concurrent_modification_conflicts_total`.

## 7.17 Limites de payload

| Item | Limite |
|---|---|
| Corpo JSON | 256 KB |
| Upload de avatar | 5 MB |
| Convites em lote (`userIds[]`) | 50 por chamada |
| `limit` de paginação | 100 |
| Profundidade de JSON | 16 níveis |
| Tamanho de string livre | Ver `CHECK` de cada campo (§5) |
| Timeout de requisição | 30 s (5 s para leituras simples) |
