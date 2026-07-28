# 3. Atores e matriz de permissões

## 3.1 Atores

| Ator | Definição técnica | Como o backend identifica |
|---|---|---|
| **Visitante** | Requisição sem `Authorization` válido | Ausência de token |
| **Usuário autenticado** | Token válido, `user.status = ACTIVE` | `sub` do JWT |
| **Usuário não verificado** | Autenticado, `emailVerifiedAt = null` | claim `email_verified: false` |
| **Amigo** | Existe `Friendship ACTIVE` entre solicitante e alvo | Consulta relacional (não vai no token) |
| **Participante de liga** (`PLAYER`) | `LeagueMember` com `status = ACTIVE` e `role = PLAYER` | Consulta relacional |
| **Admin da liga** (`ADMIN`) | `LeagueMember.role = ADMIN` | Consulta relacional |
| **Dono da liga** (`OWNER`) | `LeagueMember.role = OWNER`; exatamente 1 por liga | Consulta relacional |
| **Admin da plataforma** | Claim `role: PLATFORM_ADMIN`; conta de operação da LFTM, sem app | Claim de papel global |
| **Sistema** | Jobs, workers, outbox | Sem token de usuário; identidade de serviço (Managed Identity) |

> **Usuário não verificado** `[P]` `DP-023`: o mockup leva direto do "Criar conta" para a Home, sem barreira de verificação. **Recomendação:** permitir uso completo por **7 dias** sem verificar; depois disso, bloquear apenas ações que geram e-mail ou exposição a terceiros (criar liga, enviar convite, compartilhar publicamente). Leitura nunca é bloqueada.

## 3.2 Matriz de permissões

Legenda: **✔** permitido · **✖** negado · **●** permitido apenas sobre o próprio recurso · **◐** permitido com condição (nota abaixo) · **—** não aplicável

### Autenticação e conta

| Recurso/Ação | Visitante | Usuário | Participante | Admin da liga | Admin plataforma |
|---|---:|---:|---:|---:|---:|
| `POST /auth/register` | ✔ | ✖ | — | — | ✖ |
| `POST /auth/login` | ✔ | ✔ | — | — | ✔ |
| `POST /auth/refresh` | ✔ (com refresh token) | ✔ | — | — | ✔ |
| `POST /auth/logout` | ✖ | ● | — | — | ● |
| `POST /auth/password/forgot` | ✔ | ✔ | — | — | ✔ |
| `POST /auth/password/reset` | ✔ (com token) | ✔ | — | — | ✔ |
| `POST /auth/password/change` | ✖ | ● | — | — | ● |
| `POST /auth/email/verify` | ✔ (com token) | ● | — | — | — |
| `GET /me`, `PATCH /me` | ✖ | ● | — | — | ● |
| `PUT /me/avatar` | ✖ | ● | — | — | ● |
| `POST /me/deactivate`, `DELETE /me` | ✖ | ● | — | — | ● |
| `POST /me/data-exports` | ✖ | ● | — | — | ◐¹ |

¹ Admin da plataforma só dispara exportação em nome de titular mediante solicitação LGPD registrada, com log de auditoria obrigatório.

### Usuários e amizades

| Recurso/Ação | Visitante | Usuário | Amigo | Admin da liga | Admin plataforma |
|---|---:|---:|---:|---:|---:|
| `GET /users?q=` (busca) | ✖ | ✔ | ✔ | ✔ | ✔ |
| `GET /users/{id}` (perfil público: nome, @, avatar) | ✖ | ✔ | ✔ | ✔ | ✔ |
| `GET /users/{id}/statistics` (stats de terceiro) | ✖ | ◐² | ✔ | ◐² | ✔ |
| `GET /me/friends` | ✖ | ● | — | — | ✖ |
| `POST /friend-requests` | ✖ | ✔ | ✖³ | ✔ | ✖ |
| `POST /friend-requests/{id}/accept\|decline` | ✖ | ◐⁴ | — | — | ✖ |
| `DELETE /friend-requests/{id}` (cancelar) | ✖ | ◐⁵ | — | — | ✖ |
| `DELETE /me/friends/{userId}` | ✖ | ✖ | ● | — | ✖ |
| `GET /me/head-to-head/{userId}` | ✖ | ◐⁶ | ✔ | ◐⁶ | ✖ |

² Estatísticas de terceiros respeitam `profileVisibility` (`PUBLIC` \| `FRIENDS_ONLY` \| `PRIVATE`, default `FRIENDS_ONLY`) — `DP-015`. Membros da mesma liga sempre veem V/D/% **daquela liga** (é o ranking).
³ Já são amigos → `409 ALREADY_FRIENDS`.
⁴ Só o **destinatário** do convite.
⁵ Só o **remetente**.
⁶ Permitido se forem amigos **ou** se tiverem ao menos uma partida em comum (o histórico já é compartilhado pelo ranking da liga).

### Ligas

| Recurso/Ação | Visitante | Usuário | Participante | Admin da liga | Dono | Admin plataforma |
|---|---:|---:|---:|---:|---:|---:|
| `POST /leagues` | ✖ | ✔ | — | — | — | ✖ |
| `GET /leagues/public` | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `GET /leagues/{id}` (privada) | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ |
| `GET /leagues/{id}` (pública) | ✖ | ✔ (resumo) | ✔ (completo) | ✔ | ✔ | ✔ |
| `GET /leagues/{id}/ranking` | ✖ | ◐⁷ | ✔ | ✔ | ✔ | ✔ |
| `GET /leagues/{id}/matches` (histórico) | ✖ | ◐⁷ | ✔ | ✔ | ✔ | ✔ |
| `GET /leagues/{id}/members` | ✖ | ◐⁷ | ✔ | ✔ | ✔ | ✔ |
| `PATCH /leagues/{id}` | ✖ | ✖ | ✖ | ✔ | ✔ | ◐⁸ |
| `POST /leagues/{id}/finish` | ✖ | ✖ | ✖ | ✖ | ✔ | ◐⁸ |
| `DELETE /leagues/{id}` | ✖ | ✖ | ✖ | ✖ | ◐⁹ | ◐⁸ |
| `POST /leagues/{id}/invitations` | ✖ | ✖ | ◐¹⁰ | ✔ | ✔ | ✖ |
| `POST /leagues/{id}/invite-codes` | ✖ | ✖ | ✖ | ✔ | ✔ | ✖ |
| `POST /leagues/join-by-code` | ✖ | ✔ | — | — | — | ✖ |
| `POST /leagues/{id}/join` (pública) | ✖ | ✔ | ✖ (já é) | — | — | ✖ |
| `POST /leagues/{id}/leave` | ✖ | ✖ | ✔ | ✔ | ✖¹¹ | ✖ |
| `PATCH /leagues/{id}/members/{userId}` (papel) | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ |
| `DELETE /leagues/{id}/members/{userId}` | ✖ | ✖ | ✖ | ◐¹² | ✔ | ✖ |

⁷ Somente se a liga for `PUBLIC`; em liga privada retorna **404** (não 403 — ver §3.4).
⁸ Admin da plataforma só age via back-office, com motivo obrigatório e `AuditLog`. Não é caminho de app.
⁹ Exclusão permanente só é permitida se a liga **nunca teve partida finalizada**; caso contrário, apenas `finish`.
¹⁰ `DP-007`: participante comum pode convidar? **Recomendação: sim em liga `PUBLIC`, não em `PRIVATE`.**
¹¹ Dono precisa **transferir a propriedade** antes de sair (`PATCH members/{id}` promovendo outro a `OWNER`).
¹² Admin pode remover `PLAYER`; não pode remover outro `ADMIN` nem o `OWNER`.

### Jogatinas, partidas e eventos

| Recurso/Ação | Visitante | Usuário | Participante da liga | Participante **da partida** | Admin da liga | Admin plataforma |
|---|---:|---:|---:|---:|---:|---:|
| `POST /play-sessions` | ✖ | ✖ | ✔ | — | ✔ | ✖ |
| `GET /play-sessions/{id}` | ✖ | ◐⁷ | ✔ | ✔ | ✔ | ✔ |
| `GET /play-sessions/{id}/ranking` | ✖ | ◐⁷ | ✔ | ✔ | ✔ | ✔ |
| `POST /play-sessions/{id}/participants` | ✖ | ✖ | ✔ | — | ✔ | ✖ |
| `POST /play-sessions/{id}/close` | ✖ | ✖ | ◐¹³ | — | ✔ | ✖ |
| `POST /matches` (iniciar) | ✖ | ✖ | ✔¹⁴ | — | ✔ | ✖ |
| `GET /matches/{id}` | ✖ | ◐⁷ | ✔ | ✔ | ✔ | ✔ |
| `POST /matches/{id}/events` (bola/falta) | ✖ | ✖ | ✖ | ✔ | ✔ | ✖ |
| `DELETE /matches/{id}/events/{eventId}` | ✖ | ✖ | ✖ | ✔ | ✔ | ✖ |
| `POST /matches/{id}/finish` | ✖ | ✖ | ✖ | ✔ | ✔ | ✖ |
| `POST /matches/{id}/cancel` | ✖ | ✖ | ✖ | ✔ | ✔ | ✖ |
| `POST /matches/{id}/corrections` | ✖ | ✖ | ✖ | ◐¹⁵ | ✔ | ◐⁸ |

¹³ Quem abriu a jogatina também pode fechá-la.
¹⁴ Quem cria a partida precisa ser membro ativo da liga; **não precisa** ser um dos dois jogadores (o organizador pode registrar a partida de outros dois). Confirmado como necessidade prática de bar.
¹⁵ `DP-003`: **Recomendação:** participante da partida pode corrigir dentro de **24 h** da finalização; após isso, só admin da liga. Toda correção gera `AuditLog` e notifica os envolvidos.

### Locais, notificações e compartilhamento

| Recurso/Ação | Visitante | Usuário | Participante | Admin da liga | Admin plataforma |
|---|---:|---:|---:|---:|---:|
| `GET /venues` (busca por proximidade) | ✖ | ✔ | ✔ | ✔ | ✔ |
| `GET /venues/{id}` | ✖ | ✔ | ✔ | ✔ | ✔ |
| `GET /venues/{id}/leagues` | ✖ | ◐¹⁶ | ✔ | ✔ | ✔ |
| `POST/PATCH/DELETE /venues` (curadoria) | ✖ | ✖ | ✖ | ✖ | ✔ |
| `POST /venues/{id}/reviews` | ✖ | `DP-017` | — | — | ✔ |
| `GET /me/notifications` e derivados | ✖ | ● | — | — | ✖ |
| `PUT /me/notification-preferences` | ✖ | ● | — | — | ✖ |
| `POST /me/devices` | ✖ | ● | — | — | ✖ |
| `POST /play-sessions/{id}/share` | ✖ | ✖ | ◐¹⁷ | ✔ | ✖ |
| `GET /public/shares/{token}` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `DELETE /share-artifacts/{id}` (revogar link) | ✖ | ● (criador) | — | ✔ | ✔ |

¹⁶ Retorna apenas ligas `PUBLIC` + as ligas privadas das quais o solicitante é membro.
¹⁷ Só quem participou da jogatina pode gerar o card dela.

---

## 3.3 Autorização em nível de objeto (object-level authorization)

**Princípio inegociável:** conhecer o `id` de um recurso **nunca** concede acesso a ele. Toda rota com path parameter executa, em ordem:

1. **Autenticação** — token válido, não revogado, `user.status = ACTIVE`.
2. **Resolução do recurso** — carregar a entidade; se não existir → `404`.
3. **Checagem de relacionamento** — o solicitante tem vínculo com o recurso? (`LeagueMember`, `MatchParticipant`, `Friendship`, `ownerId`).
4. **Checagem de papel** — o vínculo tem papel suficiente para a ação?
5. **Checagem de estado** — o recurso está num estado que permite a ação? (ex.: liga `FINISHED` não aceita partida).
6. **Checagem de concorrência** — `If-Match` bate com `version`?

### Implementação recomendada `[R]` (ASP.NET Core, Clean Architecture)

- **Handlers de autorização baseados em recurso** (`IAuthorizationHandler<TRequirement, TResource>`) na camada de aplicação; o domínio permanece sem dependência de `Microsoft.AspNetCore.*`.
- Cada caso de uso recebe um `ICurrentUser` (abstração de domínio: `UserId`, `IsPlatformAdmin`) e um **serviço de política** (`ILeagueAccessPolicy`, `IMatchAccessPolicy`).
- A verificação de vínculo é **uma consulta**, não uma leitura de token — papéis de liga mudam a qualquer momento e não podem viver em JWT de 15 minutos.
- **Nunca** filtrar por `WHERE id = @id` sem `AND` do vínculo. Todo repositório de leitura por ID em contexto de liga recebe `requesterId`.

### Exemplos concretos de IDOR que a política precisa barrar

| Cenário de ataque | Rota | Resposta correta |
|---|---|---|
| Usuário fora da liga tenta ler o ranking de liga privada usando o UUID vazado num print | `GET /leagues/{id}/ranking` | `404 LEAGUE_NOT_FOUND` |
| Participante comum tenta encerrar a liga | `POST /leagues/{id}/finish` | `403 INSUFFICIENT_LEAGUE_ROLE` |
| Terceiro tenta registrar bola numa partida alheia | `POST /matches/{id}/events` | `403 NOT_MATCH_PARTICIPANT` |
| Usuário aceita convite de liga endereçado a outra pessoa | `POST /league-invitations/{id}/accept` | `404 INVITATION_NOT_FOUND` |
| Usuário tenta ler notificação de outro usuário | `GET /me/notifications/{id}` | `404` (escopo `/me` sempre filtra por `sub`) |
| Usuário edita `PATCH /me` enviando `"id": "<outro-uuid>"` | `PATCH /me` | Campo ignorado; `id` nunca vem do body |
| Usuário busca stats de perfil `PRIVATE` | `GET /users/{id}/statistics` | `403 PROFILE_PRIVATE` |
| Usuário tenta corrigir partida de 3 meses atrás | `POST /matches/{id}/corrections` | `403 CORRECTION_WINDOW_EXPIRED` |

### 404 vs 403 — política explícita `[R]`

| Situação | Status | Por quê |
|---|---|---|
| Recurso **privado** ao qual o solicitante não tem vínculo | **404** | Evita confirmar a existência do recurso (enumeração) |
| Recurso **visível** mas ação exige papel maior | **403** | O usuário já sabe que o recurso existe; negar com clareza é melhor UX |
| Recurso existe, visível, papel ok, mas estado inválido | **409** | Conflito de estado, não de permissão |

---

## 3.4 Escopos de token `[R]`

O access token carrega apenas identidade e papéis **globais** — nunca papéis de liga.

```json
{
  "iss": "https://api.encacapei.com.br",
  "aud": "encacapei-app",
  "sub": "11111111-1111-4111-8111-111111111111",
  "sid": "c3d4e5f6-a7b8-4901-8234-000000000001",
  "username": "baroni",
  "email_verified": true,
  "roles": ["USER"],
  "iat": 1785177000,
  "exp": 1785177900,
  "jti": "b8f2a1c0-3d4e-4f5a-9b6c-000000000001"
}
```

| Claim | Uso |
|---|---|
| `sub` | Identidade do usuário |
| `sid` | Sessão (refresh token family) — permite revogação granular |
| `email_verified` | Gate de ações que disparam e-mail |
| `roles` | `USER` \| `PLATFORM_ADMIN` |
| `jti` | Denylist de tokens revogados (cache distribuído, TTL = vida do token) |
