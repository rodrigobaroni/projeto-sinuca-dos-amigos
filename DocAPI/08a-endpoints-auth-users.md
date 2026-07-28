# 8a. Endpoints — Auth e Users

> Todos os exemplos usam o dataset canônico do [README §0.6](README.md#06-dataset-canônico-usado-em-todos-os-exemplos-deste-documento).
> Base URL omitida nos títulos: `https://api.encacapei.com.br/api/v1`.

---

# Módulo Auth

## AUTH-01 · Cadastro de usuário

| | |
|---|---|
| **Caso de uso** | `RegisterUser` — conclusão do wizard de cadastro em 6 etapas |
| **Método / Rota** | `POST /auth/register` |
| **Descrição** | Cria a conta, emite tokens e dispara o e-mail de verificação. Etapas 1–6 são de UI; o servidor recebe tudo de uma vez |
| **Autenticação** | Pública |
| **Permissões** | Visitante |
| **Tela** | Login → aba "Cadastro" (`[C]`) |

**Headers**

| Header | Obrig. | Valor |
|---|:--:|---|
| `Content-Type` | ✔ | `application/json` |
| `Idempotency-Key` | ✔ | UUID |
| `X-App-Version` | ✖ | `1.0.0 (1)` |

**Request body**

| Campo | Tipo | Obrig. | Formato | Validação | Descrição |
|---|---|:--:|---|---|---|
| `fullName` | string | ✔ | texto | 2–60 chars, trim, sem caracteres de controle | Etapa 1 — "Rodrigo Baroni" |
| `username` | string | ✔ | `^[a-z0-9_.]{3,20}$` | Único (case-insensitive), não reservado | Etapa 2 — `@baroni` |
| `email` | string | ✔ | RFC 5322, ≤ 254 | Único (case-insensitive) | Etapa 3 |
| `password` | string | ✔ | — | RN-AUTH-001: ≥8, maiúscula, minúscula, número, especial; ≤128 | Etapa 5 |
| `acceptedTermsVersion` | string | ✔ | `^\d{4}-\d{2}-\d{2}$` | Deve ser a versão vigente | Etapa 6 — prova de consentimento |
| `timezone` | string | ✖ | IANA | Default `America/Sao_Paulo` | |
| `locale` | string | ✖ | BCP 47 | Default `pt-BR` | |
| `avatarUploadToken` | string | ✖ | opaco | Token devolvido pelo upload prévio | Etapa 4 (foto) — `DP-002` |
| `deviceInfo` | object | ✖ | — | — | Nomeia a sessão |
| `deviceInfo.deviceId` | string | ✖ | UUID | | |
| `deviceInfo.deviceName` | string | ✖ | ≤60 | | `iPhone 15 de Rodrigo` |
| `deviceInfo.platform` | string | ✖ | enum | `IOS`\|`ANDROID`\|`WEB` | |

**Exemplo de request**
```http
POST /api/v1/auth/register HTTP/1.1
Host: api.encacapei.com.br
Content-Type: application/json
Idempotency-Key: d290f1ee-6c54-4b01-90e6-d701748f0851
X-App-Version: 1.0.0 (1)

{
  "fullName": "Rodrigo Baroni",
  "username": "baroni",
  "email": "rodrigo.baroni@email.com",
  "password": "Sinuca@2026",
  "acceptedTermsVersion": "2026-06-01",
  "timezone": "America/Sao_Paulo",
  "locale": "pt-BR",
  "deviceInfo": {
    "deviceId": "b1c2d3e4-f5a6-4b7c-8d9e-000000000001",
    "deviceName": "iPhone 15 de Rodrigo",
    "platform": "IOS"
  }
}
```

**Exemplo de sucesso — `201 Created`**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImVuYy0yMDI2LTAzIn0.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEifQ.mS4k…",
  "refreshToken": "v1.MWY0YTNiMmMtOGQ5ZS00ZjcwLTgxMmItMDAwMDAwMDAwMDAx.7Rq2xK9mZ0pL",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshExpiresIn": 2592000,
  "user": {
    "id": "11111111-1111-4111-8111-111111111111",
    "username": "baroni",
    "displayName": "Rodrigo Baroni",
    "email": "rodrigo.baroni@email.com",
    "avatarUrl": null,
    "initials": "RB",
    "avatarColor": "#C1E778",
    "status": "PENDING_VERIFICATION",
    "emailVerified": false,
    "memberSince": "2026-07-27",
    "timezone": "America/Sao_Paulo",
    "locale": "pt-BR",
    "createdAt": "2026-07-27T18:30:00Z"
  }
}
```
Headers: `Location: /api/v1/users/11111111-1111-4111-8111-111111111111`, `Cache-Control: no-store`.

**Erros**

| Status | `code` | Quando |
|---|---|---|
| `400` | `IDEMPOTENCY_KEY_REQUIRED` | Header ausente |
| `422` | `VALIDATION_ERROR` | Ver `errors[]`: `USERNAME_TAKEN`, `USERNAME_INVALID_FORMAT`, `USERNAME_RESERVED`, `EMAIL_INVALID`, `PASSWORD_TOO_SHORT`, `PASSWORD_MISSING_UPPERCASE`, `PASSWORD_MISSING_LOWERCASE`, `PASSWORD_MISSING_DIGIT`, `PASSWORD_MISSING_SPECIAL`, `TERMS_VERSION_OUTDATED` |
| `422` | `IDEMPOTENCY_KEY_REUSE` | Mesma chave, corpo diferente |
| `429` | `RATE_LIMIT_EXCEEDED` | > 3 cadastros/h por IP |

> **E-mail já cadastrado** `[R]`: **não** retorna erro específico. O servidor responde `201` com corpo idêntico ao de sucesso **apenas se o e-mail não existir**; se existir, retorna `202 Accepted` com `{"status":"VERIFICATION_SENT"}` e envia um e-mail de "alguém tentou criar conta com seu e-mail — faça login ou recupere a senha". Isso impede enumeração de base. **Impacto de UX:** o app precisa tratar `202` levando o usuário à tela de login com a mensagem correta. Alternativa (retornar `409 EMAIL_TAKEN`) é mais amigável e expõe a base — decisão registrada em `DP-030`, **recomendação: anti-enumeração**.

**Efeitos colaterais** — cria `User`, `UserCredential`, `UserProfileSettings`, `UserStatistics` (zerada), preferências de notificação default, sessão + refresh token, token de verificação; envia e-mail.
**Eventos** — `UserRegistered`.
**Idempotência** — `Idempotency-Key` obrigatório; replay devolve os mesmos tokens (janela de 24 h).
**Concorrência** — corrida de `username`/`email` resolvida pelo unique index → mapeado para `422`.

---

## AUTH-02 · Login

| | |
|---|---|
| **Caso de uso** | `Login` |
| **Método / Rota** | `POST /auth/login` |
| **Autenticação** | Pública |
| **Tela** | Login → "Entrar" (`[C]`) |

**Request body**

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `email` | string | ✔ | Formato de e-mail, ≤254 |
| `password` | string | ✔ | 1–128 (política **não** é validada no login) |
| `deviceInfo` | object | ✖ | Igual a AUTH-01 |

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "rodrigo.baroni@email.com",
  "password": "Sinuca@2026",
  "deviceInfo": { "deviceId": "b1c2d3e4-f5a6-4b7c-8d9e-000000000001", "deviceName": "iPhone 15 de Rodrigo", "platform": "IOS" }
}
```

**`200 OK`** — mesmo corpo de AUTH-01, com `user.status: "ACTIVE"` e `emailVerified: true`.

| Status | `code` | Quando |
|---|---|---|
| `401` | `INVALID_CREDENTIALS` | E-mail inexistente **ou** senha errada **ou** conta bloqueada — mensagem única e tempo de resposta constante |
| `403` | `ACCOUNT_DELETED` | Conta anonimizada |
| `422` | `VALIDATION_ERROR` | Campos ausentes/malformados |
| `429` | `RATE_LIMIT_EXCEEDED` | 5/min por IP+e-mail |

**Efeitos colaterais** — cria sessão; zera `failed_attempts` em sucesso, incrementa em falha; atualiza `last_seen_at`; grava `login_attempts`; reativa conta `DEACTIVATED` (RN-USER-005).
**Eventos** — `UserLoggedIn` (analítico), `AccountReactivated` (se aplicável).
**Idempotência** — não aplicável (não cria recurso de negócio).

---

## AUTH-03 · Renovação de token

| | |
|---|---|
| **Caso de uso** | `RefreshTokens` |
| **Método / Rota** | `POST /auth/refresh` |
| **Autenticação** | Pública (o refresh token **é** a credencial) |
| **Tela** | Transversal — splash e retry de 401 (`[I]`) |

**Request body**

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `refreshToken` | string | ✔ | Opaco, ≤512 |

```json
{ "refreshToken": "v1.MWY0YTNiMmMtOGQ5ZS00ZjcwLTgxMmItMDAwMDAwMDAwMDAx.7Rq2xK9mZ0pL" }
```

**`200 OK`**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImVuYy0yMDI2LTAzIn0.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJleHAiOjE3ODUxNzc5MDB9.Xa9…",
  "refreshToken": "v1.NGE1YjZjN2QtOGU5Zi00MDAxLTgyM2MtMDAwMDAwMDAwMDAy.Kp8mQ2vN4tR",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshExpiresIn": 2592000
}
```

| Status | `code` | Quando |
|---|---|---|
| `401` | `INVALID_REFRESH_TOKEN` | Não encontrado, expirado ou revogado |
| `401` | `REFRESH_TOKEN_REUSE_DETECTED` | Token já rotacionado → **toda a família é revogada**; app deve deslogar e pedir login |
| `429` | `RATE_LIMIT_EXCEEDED` | 30/min |

**Efeitos colaterais** — revoga o token apresentado (`ROTATED`), emite novo par na mesma `session_id`.
**Eventos** — `SuspiciousRefreshDetected` no caso de reuso.
**Observação `[R]`** — o app deve serializar refreshes concorrentes: 3 requisições recebendo 401 ao mesmo tempo não podem disparar 3 refreshes (o 2º e o 3º usariam token já rotacionado e derrubariam a sessão).

---

## AUTH-04 · Logout

| | |
|---|---|
| **Caso de uso** | `Logout` |
| **Método / Rota** | `POST /auth/logout` |
| **Autenticação** | Bearer |
| **Tela** | Perfil → "Sair da conta" (`[C]`) |

**Request body**

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `refreshToken` | string | ✖ | Se omitido, revoga a sessão do `sid` do access token |
| `allSessions` | boolean | ✖ | Default `false` |

```json
{ "refreshToken": "v1.NGE1YjZjN2QtOGU5Zi00MDAxLTgyM2MtMDAwMDAwMDAwMDAy.Kp8mQ2vN4tR", "allSessions": false }
```

**`204 No Content`** — sem corpo.

| Status | `code` | Quando |
|---|---|---|
| `401` | `UNAUTHENTICATED` | Sem token válido |

**Efeitos colaterais** — revoga refresh token(s) (`LOGOUT`); adiciona `jti` do access token à denylist até `exp`; desregistra o device de push da sessão `[R]`.
**Idempotência** — natural: deslogar duas vezes devolve `204`.

---

## AUTH-05 · Solicitar recuperação de senha

| | |
|---|---|
| **Caso de uso** | `RequestPasswordReset` |
| **Método / Rota** | `POST /auth/password/forgot` |
| **Autenticação** | Pública |
| **Tela** | Login → "Esqueceu a senha?" (`[C]`) |

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `email` | string | ✔ | Formato de e-mail |

```json
{ "email": "rodrigo.baroni@email.com" }
```

**`202 Accepted`**
```json
{ "status": "ACCEPTED", "message": "Se existir uma conta com esse e-mail, enviaremos as instruções em instantes." }
```

| Status | `code` | Quando |
|---|---|---|
| `422` | `VALIDATION_ERROR` | E-mail malformado |
| `429` | `RATE_LIMIT_EXCEEDED` | 3/h por IP e por e-mail |

**Efeitos colaterais** — se a conta existir: cria `PasswordResetToken` (TTL 30 min, uso único), invalida tokens anteriores, envia e-mail. Se não existir: **nada**, com o mesmo tempo de resposta.
**Eventos** — `PasswordResetRequested`.
**Observação** — o link do e-mail é um deep link: `encacapei://reset-password?token=…` com fallback web.

---

## AUTH-06 · Redefinir senha

| | |
|---|---|
| **Caso de uso** | `ResetPassword` |
| **Método / Rota** | `POST /auth/password/reset` |
| **Autenticação** | Pública (o token é a credencial) |

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `token` | string | ✔ | Opaco, ≤256 |
| `newPassword` | string | ✔ | RN-AUTH-001 + RN-AUTH-003 |

```json
{ "token": "rst_9f8e7d6c5b4a43928180000000000001", "newPassword": "NovaSinuca@2026" }
```

**`200 OK`**
```json
{ "status": "PASSWORD_RESET", "sessionsRevoked": 3, "message": "Senha alterada. Faça login novamente." }
```

| Status | `code` | Quando |
|---|---|---|
| `410` | `RESET_TOKEN_EXPIRED` | Passou de 30 min |
| `401` | `RESET_TOKEN_INVALID` | Inexistente ou já usado |
| `422` | `VALIDATION_ERROR` | Política de senha (`errors[]` por critério) ou `PASSWORD_REUSED` |
| `429` | `RATE_LIMIT_EXCEEDED` | 10/h por IP |

**Efeitos colaterais** — troca hash, marca token usado, **revoga todas as sessões**, envia e-mail de confirmação, grava `AuditLog(PASSWORD_CHANGED)`.
**Eventos** — `PasswordChanged`, `SessionRevoked` (N).

---

## AUTH-07 · Alterar senha (autenticado)

| | |
|---|---|
| **Caso de uso** | `ChangePassword` |
| **Método / Rota** | `POST /auth/password/change` |
| **Autenticação** | Bearer |
| **Tela** | Perfil → "Alterar senha" (`[C]`) |

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `currentPassword` | string | ✔ | Deve conferir |
| `newPassword` | string | ✔ | RN-AUTH-001, RN-AUTH-003, diferente da atual |
| `keepCurrentSession` | boolean | ✖ | Default `true` |

```json
{ "currentPassword": "Sinuca@2026", "newPassword": "OutraSinuca@2027", "keepCurrentSession": true }
```

**`200 OK`**
```json
{ "status": "PASSWORD_CHANGED", "sessionsRevoked": 2, "changedAt": "2026-07-27T18:35:41Z" }
```

| Status | `code` | Quando |
|---|---|---|
| `401` | `INVALID_CURRENT_PASSWORD` | Senha atual errada (conta rate limit) |
| `422` | `VALIDATION_ERROR` | `PASSWORD_SAME_AS_CURRENT`, `PASSWORD_REUSED`, critérios de política |
| `429` | `RATE_LIMIT_EXCEEDED` | 5/h |

---

## AUTH-08 · Verificar e-mail

| | |
|---|---|
| **Caso de uso** | `VerifyEmail` |
| **Método / Rota** | `POST /auth/email/verify` |
| **Autenticação** | Pública (token é a credencial) |

| Campo | Tipo | Obrig. |
|---|---|:--:|
| `token` | string | ✔ |

```json
{ "token": "evt_2b3c4d5e6f7048129a34000000000001" }
```

**`200 OK`**
```json
{ "status": "EMAIL_VERIFIED", "userId": "11111111-1111-4111-8111-111111111111", "verifiedAt": "2026-07-27T18:41:03Z" }
```

| Status | `code` | Quando |
|---|---|---|
| `410` | `VERIFICATION_TOKEN_EXPIRED` | > 24 h |
| `401` | `VERIFICATION_TOKEN_INVALID` | Inexistente/usado |
| `409` | `EMAIL_ALREADY_VERIFIED` | Idempotente do ponto de vista do usuário — o app pode tratar como sucesso |

**Efeitos colaterais** — `emailVerifiedAt`, `status: ACTIVE`, libera ações de RN-AUTH-008.
**Eventos** — `EmailVerified`.

## AUTH-09 · Reenviar verificação

`POST /auth/email/verify/resend` · Bearer · sem corpo · **`202 Accepted`** `{"status":"ACCEPTED","nextResendAvailableAt":"2026-07-27T18:42:03Z"}`.
Erros: `409 EMAIL_ALREADY_VERIFIED`, `429 RATE_LIMIT_EXCEEDED` (1/min, 5/dia).

## AUTH-10 · Disponibilidade de username

| | |
|---|---|
| **Caso de uso** | `CheckUsernameAvailability` — etapa 2 do cadastro e edição de perfil |
| **Método / Rota** | `GET /users/username-available` |
| **Autenticação** | Pública (com rate limit agressivo) |

**Query params**

| Param | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `username` | string | ✔ | 3–20, `^[a-z0-9_.]+$` |

```http
GET /api/v1/users/username-available?username=baroni
```

**`200 OK`**
```json
{ "username": "baroni", "available": false, "reason": "TAKEN", "suggestions": ["baroni1", "baroni_sinuca", "rbaroni"] }
```
```json
{ "username": "baroni_sinuca", "available": true, "reason": null, "suggestions": [] }
```

`reason` ∈ `TAKEN` \| `RESERVED` \| `INVALID_FORMAT` \| `null`.

| Status | `code` | Quando |
|---|---|---|
| `422` | `VALIDATION_ERROR` | Formato inválido (retorna `available: false` com `reason` em vez de erro, quando possível) |
| `429` | `RATE_LIMIT_EXCEEDED` | 20/min por IP |

**Observação `[R]`** — este endpoint é, por natureza, um oráculo de existência de username (não de e-mail). Isso é aceitável: usernames são públicos por design (`@baroni` aparece na UI). O rate limit impede varredura em massa.

---

# Módulo Users

## USER-01 · Consultar perfil autenticado

| | |
|---|---|
| **Caso de uso** | `GetMyProfile` |
| **Método / Rota** | `GET /me` |
| **Autenticação** | Bearer |
| **Tela** | Home (cabeçalho), Perfil (card) (`[C]`) |

**Query params**

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `include` | string (csv) | — | `statistics`, `counters` — evita 3 chamadas na abertura da Home `[R]` |

```http
GET /api/v1/me?include=statistics,counters
Authorization: Bearer eyJ…
```

**`200 OK`** (`ETag: W/"3"`)
```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "username": "baroni",
  "displayName": "Rodrigo Baroni",
  "email": "rodrigo.baroni@email.com",
  "avatarUrl": "https://cdn.encacapei.com.br/avatars/11111111-1111-4111-8111-111111111111/256.webp",
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
  "updatedAt": "2026-07-20T11:05:33Z",
  "version": 3,
  "statistics": {
    "matchesPlayed": 47,
    "wins": 29,
    "losses": 18,
    "winRate": 61.70,
    "currentWinStreak": 5,
    "longestWinStreak": 7,
    "currentLossStreak": 0,
    "longestLossStreak": 2,
    "sessionsPlayed": 14,
    "podiumFirsts": 6,
    "lastMatchAt": "2026-07-15T01:08:22Z"
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

> **Nota de consistência com o mockup:** a Home exibe `62%`. O valor exato é `29/47 = 61.70%`, que arredondado (half-up, 0 casas) é **62%**. O backend devolve `61.70`; o app arredonda. Ver `DP-009`.

| Status | `code` | Quando |
|---|---|---|
| `401` | `UNAUTHENTICATED` / `TOKEN_EXPIRED` | |

**Cache** — `private, max-age=0, must-revalidate` + `ETag`; `If-None-Match` → `304`.

---

## USER-02 · Editar perfil

| | |
|---|---|
| **Caso de uso** | `UpdateMyProfile` |
| **Método / Rota** | `PATCH /me` |
| **Autenticação** | Bearer |
| **Tela** | Perfil → "Editar perfil" (`[C]`) |

**Headers:** `If-Match: W/"3"` (obrigatório).

**Request body** (todos opcionais; omitir = não alterar)

| Campo | Tipo | Formato | Validação | Descrição |
|---|---|---|---|---|
| `displayName` | string | texto | 2–60 | |
| `username` | string | `^[a-z0-9_.]{3,20}$` | Único; RN-USER-004 (1×/30 dias) | |
| `bio` | string \| null | texto | ≤160 | `null` limpa |
| `timezone` | string | IANA | Fuso válido | Afeta agrupamento de estatísticas |
| `locale` | string | BCP 47 | `pt-BR`, `en-US` | |
| `profileVisibility` | string | enum | `PUBLIC`\|`FRIENDS_ONLY`\|`PRIVATE` | `DP-015` |
| `searchableByUsername` | boolean | — | — | |
| `shareStatsPublicly` | boolean | — | — | `DP-004` |

Campos **ignorados** se enviados: `id`, `email`, `status`, `createdAt`, `version`, `statistics`. Alterar e-mail é fluxo próprio (pós-MVP, exige reverificação).

```http
PATCH /api/v1/me
Authorization: Bearer eyJ…
Content-Type: application/json
If-Match: W/"3"

{ "displayName": "Rodrigo Baroni", "username": "baroni", "profileVisibility": "FRIENDS_ONLY" }
```

**`200 OK`** — recurso completo (igual a USER-01, sem `include`), `ETag: W/"4"`.

| Status | `code` | Quando |
|---|---|---|
| `409` | `CONCURRENT_MODIFICATION` | `If-Match` divergente (corpo traz `currentVersion` e o estado atual) |
| `409` | `USERNAME_CHANGE_TOO_SOON` | RN-USER-004 (extensão `nextChangeAllowedAt`) |
| `422` | `VALIDATION_ERROR` | `USERNAME_TAKEN`, `USERNAME_RESERVED`, tamanho de campo |
| `428` | `PRECONDITION_REQUIRED` | `If-Match` ausente |

**Eventos** — `UserProfileUpdated`, `UsernameChanged` (se aplicável).

---

## USER-03 · Obter URL de upload de avatar

| | |
|---|---|
| **Caso de uso** | `RequestAvatarUploadUrl` |
| **Método / Rota** | `POST /me/avatar/upload-url` |
| **Autenticação** | Bearer |
| **Tela** | Editar perfil → foto (`[I]`) |

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `contentType` | string | ✔ | `image/jpeg`\|`image/png`\|`image/webp` |
| `contentLength` | integer | ✔ | 1 – 5 242 880 (5 MB) |

```json
{ "contentType": "image/jpeg", "contentLength": 842113 }
```

**`200 OK`**
```json
{
  "uploadUrl": "https://stlftmencacapeiprd.blob.core.windows.net/avatars-staging/11111111-1111-4111-8111-111111111111/6f2a9c1b.jpg?sv=2024-11-04&se=2026-07-27T18%3A45%3A00Z&sp=cw&sig=…",
  "uploadToken": "upl_6f2a9c1b8d3e4f5a9b0c1d2e3f4a5b6c",
  "method": "PUT",
  "requiredHeaders": { "x-ms-blob-type": "BlockBlob", "Content-Type": "image/jpeg" },
  "expiresAt": "2026-07-27T18:45:00Z",
  "maxBytes": 5242880
}
```

| Status | `code` | Quando |
|---|---|---|
| `413` | `FILE_TOO_LARGE` | `contentLength` > 5 MB |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | Tipo fora da lista |
| `429` | `RATE_LIMIT_EXCEEDED` | 10/h |

**Observação `[R]`** — o app faz `PUT` **direto no Blob** (não passa pelo backend, economizando banda e timeout em 4G) e depois chama USER-04.

## USER-04 · Confirmar avatar

`PUT /me/avatar` · Bearer · `{"uploadToken":"upl_6f2a9c1b8d3e4f5a9b0c1d2e3f4a5b6c"}`

**`200 OK`**
```json
{
  "avatarUrl": "https://cdn.encacapei.com.br/avatars/11111111-1111-4111-8111-111111111111/256.webp",
  "thumbnailUrl": "https://cdn.encacapei.com.br/avatars/11111111-1111-4111-8111-111111111111/64.webp",
  "updatedAt": "2026-07-27T18:44:12Z",
  "version": 5
}
```

| Status | `code` | Quando |
|---|---|---|
| `404` | `UPLOAD_TOKEN_NOT_FOUND` | Token inválido/expirado |
| `422` | `INVALID_IMAGE` | Magic bytes não conferem com o `contentType`, imagem corrompida, ou < 64×64 |
| `422` | `IMAGE_REJECTED` | Reprovada na moderação automática (pós-MVP) |

**Efeitos colaterais** — valida magic bytes, remove metadados EXIF (**inclusive GPS** — RN-PRIV-002), gera 256×256 e 64×64 em WebP, move do container de staging para o público, invalida CDN, apaga o avatar anterior.

## USER-05 · Remover avatar

`DELETE /me/avatar` · Bearer · **`204 No Content`**. Volta a exibir iniciais.

---

## USER-06 · Estatísticas do usuário autenticado

| | |
|---|---|
| **Caso de uso** | `GetMyStatistics` |
| **Método / Rota** | `GET /me/statistics` |
| **Tela** | Home — 4 KPIs (`[C]`) |

**Query params**

| Param | Tipo | Default | Valores |
|---|---|---|---|
| `period` | string | `ALL_TIME` | `LAST_7_DAYS`, `LAST_30_DAYS`, `LAST_90_DAYS`, `CURRENT_YEAR`, `ALL_TIME` |
| `leagueId` | uuid | — | Recorta por liga |

```http
GET /api/v1/me/statistics
```

**`200 OK`**
```json
{
  "period": "ALL_TIME",
  "leagueId": null,
  "matchesPlayed": 47,
  "wins": 29,
  "losses": 18,
  "winRate": 61.70,
  "currentWinStreak": 5,
  "longestWinStreak": 7,
  "currentLossStreak": 0,
  "longestLossStreak": 2,
  "sessionsPlayed": 14,
  "podiumFirsts": 6,
  "podiums": { "first": 6, "second": 4, "third": 2 },
  "ballsPocketedTotal": 213,
  "averageMatchDurationSeconds": 1284,
  "firstMatchAt": "2025-01-21T23:14:00Z",
  "lastMatchAt": "2026-07-15T01:08:22Z",
  "computedAt": "2026-07-27T18:30:05Z"
}
```

**Mapeamento direto para a tela:**

| KPI do mockup | Campo |
|---|---|
| "Partidas jogadas — 47" | `matchesPlayed` |
| "Taxa de vitória — 62%" | `winRate` (61.70 → exibir 62) |
| "Vitórias consecutivas — 5" | `currentWinStreak` |
| "Maiores derrotas — 2" | `longestLossStreak` (`DP-016b`) |

| Status | `code` | Quando |
|---|---|---|
| `404` | `LEAGUE_NOT_FOUND` | `leagueId` inexistente ou sem vínculo |

---

## USER-07 · Séries temporais (gráficos da Home)

| | |
|---|---|
| **Caso de uso** | `GetStatisticsTimeSeries` |
| **Método / Rota** | `GET /me/statistics/timeseries` |
| **Tela** | Home → expander "Gráficos de evolução" (`[C]`) |

**Query params**

| Param | Tipo | Obrig. | Default | Valores |
|---|---|:--:|---|---|
| `metric` | string | ✔ | — | `WIN_RATE` \| `WINS_LOSSES` \| `MATCHES_PLAYED` |
| `period` | string | ✖ | `LAST_30_DAYS` | `LAST_7_DAYS`, `LAST_30_DAYS`, `LAST_90_DAYS`, `LAST_4_WEEKS`, `LAST_12_WEEKS`, `CURRENT_YEAR` |
| `granularity` | string | ✖ | derivada | `DAY` \| `WEEK` \| `MONTH` |
| `leagueId` | uuid | ✖ | — | |
| `fillGaps` | boolean | ✖ | `true` | Preenche dias sem jogo (o gráfico de linha precisa de continuidade) |

**Gráfico 1 — "Taxa de vitória — últimos 30 dias"**
```http
GET /api/v1/me/statistics/timeseries?metric=WIN_RATE&period=LAST_30_DAYS&granularity=DAY
```
```json
{
  "metric": "WIN_RATE",
  "period": "LAST_30_DAYS",
  "granularity": "DAY",
  "timezone": "America/Sao_Paulo",
  "from": "2026-06-28",
  "to": "2026-07-27",
  "unit": "PERCENT",
  "points": [
    { "bucket": "2026-06-30", "date": "2026-06-30", "value": 50.00, "matchesPlayed": 3 },
    { "bucket": "2026-07-07", "date": "2026-07-07", "value": 55.56, "matchesPlayed": 4 },
    { "bucket": "2026-07-14", "date": "2026-07-14", "value": 61.70, "matchesPlayed": 4 }
  ],
  "summary": { "first": 50.00, "last": 61.70, "change": 11.70, "trend": "UP" }
}
```

**Gráfico 2 — "Vitórias e derrotas por semana"**
```http
GET /api/v1/me/statistics/timeseries?metric=WINS_LOSSES&period=LAST_4_WEEKS&granularity=WEEK
```
```json
{
  "metric": "WINS_LOSSES",
  "period": "LAST_4_WEEKS",
  "granularity": "WEEK",
  "timezone": "America/Sao_Paulo",
  "from": "2026-06-29",
  "to": "2026-07-26",
  "unit": "COUNT",
  "points": [
    { "bucket": "2026-W27", "weekStart": "2026-06-29", "weekEnd": "2026-07-05", "label": "Sem 1", "wins": 5, "losses": 3 },
    { "bucket": "2026-W28", "weekStart": "2026-07-06", "weekEnd": "2026-07-12", "label": "Sem 2", "wins": 4, "losses": 4 },
    { "bucket": "2026-W29", "weekStart": "2026-07-13", "weekEnd": "2026-07-19", "label": "Sem 3", "wins": 6, "losses": 2 },
    { "bucket": "2026-W30", "weekStart": "2026-07-20", "weekEnd": "2026-07-26", "label": "Sem 4", "wins": 5, "losses": 2 }
  ],
  "summary": { "totalWins": 20, "totalLosses": 11, "winRate": 64.52 }
}
```

| Status | `code` | Quando |
|---|---|---|
| `422` | `INVALID_METRIC` / `INVALID_GRANULARITY_FOR_PERIOD` | Ex.: `granularity=MONTH` com `period=LAST_7_DAYS` |

**Observações**
- Semanas começam na **segunda-feira** (ISO-8601), coerente com `pt-BR`.
- `label` ("Sem 1") é gerado pelo servidor para o app não ter que calcular — `[R]`, e evita divergência de fuso.
- Agrupamento sempre no fuso do **usuário** (`users.timezone`), não da liga.

---

## USER-08 · Buscar usuários

| | |
|---|---|
| **Caso de uso** | `SearchUsers` |
| **Método / Rota** | `GET /users` |
| **Tela** | Amigos → busca (`[C]`/`[I]`) |

**Query params**

| Param | Tipo | Obrig. | Default | Validação |
|---|---|:--:|---|---|
| `q` | string | ✔ | — | 2–60 chars |
| `limit` | integer | ✖ | 20 | 1–50 |
| `cursor` | string | ✖ | — | Opaco |
| `excludeFriends` | boolean | ✖ | `false` | |
| `leagueId` | uuid | ✖ | — | Restringe a membros da liga (usado na seleção de adversário) |

```http
GET /api/v1/users?q=carlos&limit=20
```

**`200 OK`**
```json
{
  "items": [
    {
      "id": "66666666-6666-4666-8666-666666666666",
      "username": "carlosmota",
      "displayName": "Carlos Mota",
      "avatarUrl": null,
      "initials": "CA",
      "avatarColor": "#c8b6ff",
      "relationship": {
        "status": "REQUEST_RECEIVED",
        "friendRequestId": "9f8e7d6c-5b4a-4392-8180-000000000001",
        "canSendRequest": false
      },
      "mutualLeaguesCount": 0,
      "mutualFriendsCount": 2
    }
  ],
  "meta": { "totalItems": 1, "pageSize": 20, "hasMore": false, "nextCursor": null }
}
```

`relationship.status` ∈ `NONE` \| `REQUEST_SENT` \| `REQUEST_RECEIVED` \| `FRIENDS` \| `BLOCKED` \| `SELF` — é o que decide o botão exibido no card (`Adicionar` / `Pendente` / `Aceitar` / `Amigos`).

| Status | `code` | Quando |
|---|---|---|
| `422` | `SEARCH_QUERY_TOO_SHORT` | `q` < 2 |
| `429` | `RATE_LIMIT_EXCEEDED` | 30/min |

**Privacidade** — não retorna e-mail; ignora usuários com `searchableByUsername = false` (salvo se já forem amigos); nunca permite buscar por e-mail (RN-PRIV-007).

---

## USER-09 · Perfil público de outro usuário

`GET /users/{userId}` · Bearer

**Path params**

| Param | Tipo | Descrição |
|---|---|---|
| `userId` | uuid | ID do usuário |

**`200 OK`**
```json
{
  "id": "22222222-2222-4222-8222-222222222222",
  "username": "joaop",
  "displayName": "João Pereira",
  "avatarUrl": "https://cdn.encacapei.com.br/avatars/22222222-2222-4222-8222-222222222222/256.webp",
  "initials": "JO",
  "avatarColor": "#8ecae6",
  "memberSince": "2025-03-08",
  "relationship": { "status": "FRIENDS", "friendsSince": "2025-04-02T19:22:00Z" },
  "sharedLeagues": [
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001", "name": "Liga da Terça" },
    { "id": "0a1b2c3d-4e5f-4a6b-8c7d-000000000002", "name": "Ranking do Bar do Zé" }
  ],
  "statisticsVisible": true
}
```

| Status | `code` | Quando |
|---|---|---|
| `404` | `USER_NOT_FOUND` | Inexistente, anonimizado, ou bloqueou o solicitante |

## USER-10 · Estatísticas de outro usuário

`GET /users/{userId}/statistics?leagueId=&period=` · Bearer · mesmo corpo de USER-06.

| Status | `code` | Quando |
|---|---|---|
| `403` | `PROFILE_PRIVATE` | `profileVisibility = PRIVATE` e não há liga em comum |
| `403` | `PROFILE_FRIENDS_ONLY` | `FRIENDS_ONLY`, não são amigos e não há liga em comum |
| `404` | `USER_NOT_FOUND` | |

> Dentro de `leagueId` em comum, V/D/% são **sempre** visíveis (RN-USER-008): já estão no ranking.

---

## USER-11 · Partida ativa do usuário

| | |
|---|---|
| **Caso de uso** | `GetMyActiveMatch` — recuperação após fechar o app no meio da partida |
| **Método / Rota** | `GET /me/active-match` |
| **Tela** | Splash / retomada (`[I]`, RN-MATCH-020) |

**`200 OK`** — recurso `Match` completo (ver [08d](08d-endpoints-sessions-matches.md#match-03--consultar-partida)).
**`204 No Content`** — nenhuma partida em andamento.

---

## USER-12 · Desativar conta

`POST /me/deactivate` · Bearer · `If-Match` obrigatório

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `password` | string | ✔ | Confirma identidade |
| `reason` | string | ✖ | ≤300 — feedback de produto |

**`200 OK`**
```json
{ "status": "DEACTIVATED", "deactivatedAt": "2026-07-27T18:50:00Z", "reactivationHint": "Faça login novamente a qualquer momento para reativar sua conta." }
```

| Status | `code` | Quando |
|---|---|---|
| `401` | `INVALID_CURRENT_PASSWORD` | |
| `409` | `OWNER_OF_ACTIVE_LEAGUES` | É `OWNER` de liga ativa com outros membros — extensão `leagues[]` lista quais; precisa transferir ou encerrar antes |

**Efeitos colaterais** — `status = DEACTIVATED`, revoga todas as sessões, remove das buscas, cancela convites pendentes enviados. **Não** remove de ligas nem apaga histórico.

## USER-13 · Excluir conta (LGPD)

`DELETE /me` · Bearer · `If-Match` obrigatório

| Campo | Tipo | Obrig. | Validação |
|---|---|:--:|---|
| `password` | string | ✔ | |
| `confirmation` | string | ✔ | Deve ser exatamente `EXCLUIR MINHA CONTA` |
| `reason` | string | ✖ | ≤300 |

**`202 Accepted`**
```json
{
  "status": "DELETION_SCHEDULED",
  "scheduledFor": "2026-08-26T18:52:00Z",
  "cancelBy": "2026-08-26T18:52:00Z",
  "message": "Sua conta será anonimizada em 30 dias. Faça login antes disso para cancelar.",
  "dataRetentionNotice": "Seu histórico de partidas será mantido de forma anonimizada para preservar o ranking dos demais jogadores."
}
```

| Status | `code` | Quando |
|---|---|---|
| `401` | `INVALID_CURRENT_PASSWORD` | |
| `422` | `INVALID_CONFIRMATION` | Texto de confirmação divergente |
| `409` | `OWNER_OF_ACTIVE_LEAGUES` | Igual a USER-12 |

**Eventos** — `AccountDeletionRequested`; job diário anonimiza (RN-USER-007).
**Auditoria** — `AuditLog(DELETION_REQUESTED)` obrigatório.

## USER-14 · Exportar meus dados (LGPD)

`POST /me/data-exports` · Bearer · sem corpo · **`202 Accepted`**
```json
{
  "id": "e1f2a3b4-c5d6-4e7f-8a9b-000000000001",
  "status": "PENDING",
  "requestedAt": "2026-07-27T18:55:00Z",
  "estimatedReadyAt": "2026-07-27T19:05:00Z",
  "statusUrl": "/api/v1/me/data-exports/e1f2a3b4-c5d6-4e7f-8a9b-000000000001"
}
```

`GET /me/data-exports/{id}` → **`200 OK`**
```json
{
  "id": "e1f2a3b4-c5d6-4e7f-8a9b-000000000001",
  "status": "READY",
  "fileUrl": "https://stlftmencacapeiprd.blob.core.windows.net/exports/…?se=2026-07-30T19%3A05%3A00Z&sig=…",
  "fileSizeBytes": 184320,
  "format": "ZIP",
  "contents": ["profile.json", "matches.csv", "leagues.json", "friendships.json", "notifications.json", "audit.json"],
  "requestedAt": "2026-07-27T18:55:00Z",
  "completedAt": "2026-07-27T19:01:12Z",
  "expiresAt": "2026-07-30T19:01:12Z"
}
```

| Status | `code` | Quando |
|---|---|---|
| `409` | `EXPORT_ALREADY_IN_PROGRESS` | Já existe exportação pendente |
| `410` | `EXPORT_EXPIRED` | Passou de 72 h |
| `429` | `RATE_LIMIT_EXCEEDED` | 1 exportação/dia |

---

## APP-01 · Bootstrap do aplicativo

| | |
|---|---|
| **Caso de uso** | `GetAppBootstrap` — chamado na splash (`[R]`) |
| **Método / Rota** | `GET /app/bootstrap` |
| **Autenticação** | Pública |

**`200 OK`**
```json
{
  "minSupportedVersion": { "ios": "1.0.0", "android": "1.0.0" },
  "latestVersion": { "ios": "1.2.0", "android": "1.2.0" },
  "forceUpdate": false,
  "maintenanceMode": false,
  "termsVersion": "2026-06-01",
  "privacyPolicyVersion": "2026-06-01",
  "urls": {
    "terms": "https://encacapei.com.br/termos",
    "privacy": "https://encacapei.com.br/privacidade",
    "support": "https://encacapei.com.br/suporte"
  },
  "features": {
    "teamMatches": false,
    "pushNotifications": false,
    "shareImageGeneration": false,
    "venueReviews": false,
    "publicLeagueJoin": true
  },
  "serverTime": "2026-07-27T18:30:00Z"
}
```

**Observação `[R]`** — `features` são as flags que materializam as decisões pendentes: o app esconde o chip "Duplas" enquanto `teamMatches = false`, em vez de mostrar uma opção que o backend rejeita.
**Cache** — `public, max-age=300`.
