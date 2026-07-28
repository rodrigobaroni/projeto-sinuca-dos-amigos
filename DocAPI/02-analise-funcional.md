# 2. Análise funcional do mockup

Mapeamento exaustivo de **cada tela, aba, campo, botão, filtro, modal e estado** presente no HTML, para a operação de backend correspondente.

Legenda de status: `[C]` confirmado · `[I]` inferido · `[R]` recomendação técnica · `[P]` pendente de decisão.

---

## 2.1 Splash e Onboarding

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| Splash (`scr-splash`) | Abrir o app | — (spinner de 2,2 s no mockup, puramente visual) | Nenhuma. **Recomendação:** aproveitar a janela para validar sessão e buscar configuração remota | `GET /api/v1/app/bootstrap` (versão mínima, feature flags, URLs de termos) | `[R]` |
| Splash | Abrir o app **já logado** | `refresh_token` do secure storage | Renovar par de tokens e decidir rota inicial | `POST /api/v1/auth/refresh` | `[I]` |
| Onboarding (`scr-onboarding`) | Avançar entre os 3 slides (🏆 ligas, 👥 amigos, 📲 compartilhar) | Conteúdo estático embutido no app (array `OB`) | **Nenhuma** — conteúdo local | — | `[C]` |
| Onboarding | Tocar em "Pular" ou concluir | — | Nenhuma; app marca `onboardingSeen` local | — | `[C]` |

---

## 2.2 Autenticação e conta

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| Login — aba "Login" | Preencher e-mail e senha, tocar **Entrar** | `email`, `password`, `deviceInfo` | Autenticar, emitir `accessToken` + `refreshToken`, registrar sessão | `POST /api/v1/auth/login` | `[C]` |
| Login | Tocar **"Esqueceu a senha?"** | `email` | Gerar token de reset, enviar e-mail; resposta sempre 202 (anti-enumeração) | `POST /api/v1/auth/password/forgot` | `[C]` |
| Login (deep link do e-mail) | Definir nova senha | `token`, `newPassword` | Validar token de uso único, trocar hash, **revogar todas as sessões** | `POST /api/v1/auth/password/reset` | `[I]` |
| Cadastro — etapa 1 | Informar nome completo | `fullName` | Validação local + server-side no submit final | (payload de `POST /auth/register`) | `[I]` `DP-002` |
| Cadastro — etapa 2 | Escolher **username** | `username` | **Checagem de disponibilidade em tempo real** (username é único e exibido como `@baroni`) | `GET /api/v1/users/username-available?username=baroni` | `[I]` |
| Cadastro — etapa 3 | Informar e-mail | `email` | Checagem de formato; **não** revelar se já existe (anti-enumeração) | validado no `POST /auth/register` | `[I]` |
| Cadastro — **etapa 5 de 6** | Criar senha com feedback dos 5 critérios | `password` | Política validada no cliente **e** no servidor: ≥8 chars, maiúscula, minúscula, número, especial | `POST /api/v1/auth/register` | `[C]` |
| Cadastro — etapa 6 | Tocar **Criar conta** | Todos os campos + `acceptedTermsVersion` | Criar `User` + `UserCredential`, enviar e-mail de verificação, emitir tokens, publicar `UserRegistered` | `POST /api/v1/auth/register` | `[C]` |
| Cadastro (pós) | Abrir link de verificação no e-mail | `token` | Marcar `emailVerifiedAt` | `POST /api/v1/auth/email/verify` | `[I]` |
| Cadastro (pós) | Tocar "reenviar e-mail" | sessão | Reenviar com rate limit de 1/60 s e 5/dia | `POST /api/v1/auth/email/verify/resend` | `[I]` |
| Qualquer tela | Access token expirou (401) | `refreshToken` | Rotacionar refresh token, detectar reuso | `POST /api/v1/auth/refresh` | `[I]` |
| Perfil → **Sair da conta** | Confirmar logout | `refreshToken` | Revogar a sessão atual (não todas) | `POST /api/v1/auth/logout` | `[C]` |
| Perfil → **Alterar senha** | Informar senha atual + nova | `currentPassword`, `newPassword` | Validar atual, aplicar política, revogar demais sessões | `POST /api/v1/auth/password/change` | `[C]` |

---

## 2.3 Home

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| Home | Abrir a aba | `displayName`, `avatar`/iniciais, `memberSince` ("Desde jan 2025") | Perfil resumido do usuário autenticado | `GET /api/v1/me` | `[C]` |
| Home — KPIs | Ver os 4 cartões | `matchesPlayed=47`, `winRate=62`, `currentWinStreak=5`, `worstLossStreak=2` | Agregação de estatísticas do usuário | `GET /api/v1/me/statistics` | `[C]` |
| Home — expander "Gráficos de evolução" | Expandir | Série diária de `winRate` dos últimos 30 dias (9 pontos no mockup) | Série temporal agregada por dia no fuso do usuário | `GET /api/v1/me/statistics/timeseries?metric=WIN_RATE&period=LAST_30_DAYS&granularity=DAY` | `[C]` |
| Home — gráfico de barras | Ver vitórias × derrotas por semana | 4 buckets semanais com `wins` e `losses` | Série temporal agregada por semana | `GET /api/v1/me/statistics/timeseries?metric=WINS_LOSSES&period=LAST_4_WEEKS&granularity=WEEK` | `[C]` |
| Home — "Ligas ativas · 3 ligas" | Ver a lista resumida | Por liga: `id`, `name`, `status`, `membersCount`, `matchesCount`, `nextSessionAt` | Listagem das ligas do usuário, ordenada por atividade recente, limitada | `GET /api/v1/me/leagues?limit=3&sort=-lastActivityAt` | `[C]` / `INC-05` |
| Home — badge "Próxima: terça, 20h" | — | `nextSessionAt` (ISO UTC) + `timezone` da liga | **Campo derivado**: calcular a próxima ocorrência a partir de `LeagueSchedule` | incluso no recurso `League` | `[I]` |
| Home — card de liga | Tocar no card | `leagueId` | Navegar para detalhe | `GET /api/v1/leagues/{leagueId}` | `[C]` |
| Home — "Ver todas as ligas" | Tocar | — | Navegação local para a aba Liga | — | `[C]` |
| Home — cabeçalho com avatar | Tocar | — | Navegação local para Perfil | — | `[C]` |

---

## 2.4 Amigos

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| Amigos — campo "Buscar amigos..." | Digitar | `q` | Busca **dentro da lista de amigos** (filtro por nome/username) | `GET /api/v1/me/friends?q=joao` | `[C]` |
| Amigos | Buscar pessoas que **ainda não são** amigos | `q`, paginação | Busca global de usuários com `relationshipStatus` por resultado | `GET /api/v1/users?q=carlos` | `[I]` |
| Amigos — aba "Seus amigos" | Abrir | Por amigo: `id`, `displayName`, `username`, `avatarUrl`/iniciais | Listar amizades aceitas, ordem alfabética | `GET /api/v1/me/friends` | `[C]` |
| Amigos — aba "Convites **2**" | Abrir / ver badge | `pendingIncomingCount` | Contador de convites recebidos pendentes | `GET /api/v1/me/friend-requests?direction=INCOMING&status=PENDING` (usa `meta.totalItems`) | `[C]` |
| Amigos — convites | Ver "Carlos Mota — quer ser seu amigo" | `requestId`, remetente, `createdAt` | Listar convites recebidos | `GET /api/v1/me/friend-requests?direction=INCOMING` | `[C]` |
| Amigos — convites | Tocar **Aceitar** | `requestId` | Criar `Friendship`, encerrar request, notificar remetente | `POST /api/v1/friend-requests/{id}/accept` | `[C]` |
| Amigos — convites | Tocar **Recusar** | `requestId` | Marcar `DECLINED`; **não** notificar o remetente | `POST /api/v1/friend-requests/{id}/decline` | `[C]` |
| Busca de usuários | Tocar "Adicionar" | `targetUserId` | Criar convite; auto-aceitar se houver convite recíproco pendente | `POST /api/v1/friend-requests` | `[I]` |
| Convites enviados | Cancelar convite | `requestId` | Marcar `CANCELLED` | `DELETE /api/v1/friend-requests/{id}` | `[I]` |
| Amigo — ação destrutiva | Remover amizade | `friendUserId` | Remover `Friendship` (soft delete); histórico de partidas **permanece** | `DELETE /api/v1/me/friends/{userId}` | `[I]` |
| Amigo | Bloquear usuário | `targetUserId` | Criar `UserBlock`, remover amizade, impedir novos convites | `POST /api/v1/me/blocks` | `[P]` `DP-022` |
| Amigos — linha da lista | Tocar no amigo | `friendUserId` | Navegar para head-to-head | `GET /api/v1/me/head-to-head/{userId}` | `[C]` |

---

## 2.5 Head-to-head (confronto direto)

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| H2H — topbar | Abrir | `displayName`, avatar do adversário | Perfil público resumido | `GET /api/v1/users/{userId}` | `[C]` |
| H2H — placar "5 × 3" | Ver | `myWins`, `theirWins`, `winRatePercent=62`, `totalMatches` | Agregação de confronto direto entre dois usuários | `GET /api/v1/me/head-to-head/{userId}` | `[C]` |
| H2H — barra de progresso 62% | Ver | `winRatePercent` | Mesmo agregado | mesmo endpoint | `[C]` |
| H2H — filtro de liga | Selecionar `Todas as ligas / Liga da Terça / Bar do Zé` | `leagueId` | Filtrar o agregado **e** a lista por liga; opções vêm das ligas **em comum** | `?leagueId=…` + `GET /api/v1/me/head-to-head/{userId}/leagues` | `[C]` |
| H2H — filtro de período | Selecionar `Últimos 90 dias / 30 dias / Tudo` | `period` | Filtrar por janela temporal no fuso do usuário | `?period=LAST_90_DAYS\|LAST_30_DAYS\|ALL_TIME` | `[C]` |
| H2H — "Dias de jogatina" | Ver lista | Por jogatina: `date`, `myWins × theirWins`, `leagueName`, `venueName` | **Agregação por jogatina**, não por partida; paginada | `GET /api/v1/me/head-to-head/{userId}/sessions` | `[C]` |
| H2H — item da lista | Tocar num dia `[I]` | `playSessionId` | Detalhe da jogatina com as partidas do confronto | `GET /api/v1/play-sessions/{id}` | `[I]` |

---

## 2.6 Ligas — lista

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| Ligas — card amarelo de convite | Ver "Liga do Churrasco — Convidado por Felipe Costa — há 2 dias" | `invitationId`, `league.name`, `invitedBy`, `createdAt`, `expiresAt` | Listar convites de liga pendentes recebidos | `GET /api/v1/me/league-invitations?status=PENDING` | `[C]` |
| Ligas — convite | Tocar **Aceitar** | `invitationId` | Criar `LeagueMember` (`PLAYER`), fechar convite, notificar admin, incrementar `membersCount` | `POST /api/v1/league-invitations/{id}/accept` | `[C]` |
| Ligas — convite | Tocar **Recusar** | `invitationId` | Marcar `DECLINED` | `POST /api/v1/league-invitations/{id}/decline` | `[C]` |
| Ligas — "Buscar ligas públicas..." | Digitar | `q`, paginação, (opcional) `lat/lng` | Busca full-text em ligas `PUBLIC` e `ACTIVE`, com flag `alreadyMember` | `GET /api/v1/leagues/public?q=bar` | `[C]` |
| Busca pública | Tocar em "Entrar" numa liga pública | `leagueId` | Ingressar direto ou criar solicitação | `POST /api/v1/leagues/{id}/join` | `[P]` `DP-006` |
| Ligas — seção "Ativas" | Ver | `id`, `name`, `status`, `membersCount`, `matchesCount`, `nextSessionAt` | Listar ligas do usuário filtrando por status | `GET /api/v1/me/leagues?status=ACTIVE` | `[C]` |
| Ligas — seção "Encerradas" | Ver | idem, sem `nextSessionAt` | idem com `status=FINISHED` | `GET /api/v1/me/leagues?status=FINISHED` | `[C]` |
| Ligas — FAB "Criar liga" | Tocar | — | Abrir wizard (local) | — | `[C]` |
| Ligas | Entrar por código recebido no WhatsApp `[I]` | `code` | Resolver código → liga; ingressar | `POST /api/v1/leagues/join-by-code` | `[I]` |

---

## 2.7 Wizard "Criar liga" (modal, 3 passos)

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| Passo 1 | Digitar **Nome da liga** | `name` (3–60 chars) | Validação; unicidade **não** exigida | payload de `POST /leagues` | `[C]` |
| Passo 1 | Buscar **Local** ("Bar do Zé") | `q` → `venueId` | Autocomplete de locais | `GET /api/v1/venues?q=bar%20do%20ze` | `[C]` |
| Passo 1 | Escolher **Duração** (`Um dia` / `6 meses` / `Infinita`) | `durationType` ∈ `ONE_DAY, SIX_MONTHS, UNLIMITED` | Deriva `endsAt`; `ONE_DAY` encerra automaticamente | payload de `POST /leagues` | `[C]` |
| Passo 1 | Escolher **Dias de jogatina** (multi) | `weekdays[]` ∈ `MONDAY…SUNDAY` | Cria `LeagueSchedule`; base para `nextSessionAt` e lembretes | payload de `POST /leagues` | `[C]` |
| Passo 2 | Escolher **Estilo de jogo** | `gameMode` ∈ `ONE_VS_ONE, TEAM_2V2` | `TEAM_2V2` rejeitado no MVP (`FEATURE_NOT_AVAILABLE`) | payload | `[C]` + `DP-013` |
| Passo 2 | Toggle **"Marca bola caída?"** (default ON) | `rules.trackPocketedBalls` | Habilita a grade de 8 bolas na tela de partida | payload | `[C]` |
| Passo 2 | Toggle **"Marca falta?"** (default OFF no wizard) | `rules.trackFouls` | Habilita registro de faltas | payload | `[C]` / `INC-08` |
| Passo 2 | Ver **Horário 20:00 – 00:00** | `schedule.startTime`, `schedule.endTime`, `timezone` | Somente leitura no mockup; **precisa ser editável** | payload | `[C]` + `[P]` `DP-005` |
| Passo 3 | Tocar **Convidar amigos** | `userIds[]` | Envia N convites nominais (após a liga existir) | `POST /api/v1/leagues/{id}/invitations` | `[C]` |
| Passo 3 | Tocar **Gerar código de convite** | `leagueId` | Gera código curto com validade e limite de uso | `POST /api/v1/leagues/{id}/invite-codes` | `[C]` |
| Passo 3 | Tocar **Criar liga** | Todo o payload acumulado | Criar `League` + `LeagueRule` + `LeagueSchedule` + `LeagueMember(OWNER)`; publicar `LeagueCreated` | `POST /api/v1/leagues` | `[C]` |

> **Ordem das chamadas** `[R]`: o passo 3 oferece convidar **antes** de "Criar liga". Como convite exige `leagueId`, a recomendação é: `POST /leagues` é disparado ao **entrar** no passo 3 (liga nasce em `ACTIVE`), e os botões de convite operam sobre a liga já criada. Alternativa: acumular tudo e enviar `invitations[]`/`generateInviteCode` dentro do próprio `POST /leagues` — contrato previsto em §8.3.

---

## 2.8 Liga — detalhe (3 abas)

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| Topbar | Abrir a liga | `name`, `venue.name`, `schedule` legível ("terças 20h–00h"), `status`, `myRole` | Detalhe da liga com permissões do solicitante | `GET /api/v1/leagues/{id}` | `[C]` |
| Aba **Ranking** | Abrir | Por linha: `position`, `player.displayName`, `wins`, `losses`, `winRate`, `isMe` | Ranking materializado da liga com desempate aplicado | `GET /api/v1/leagues/{id}/ranking` | `[C]` |
| Aba Ranking | Tocar **Iniciar partida** | `leagueId` | Resolver/abrir jogatina do dia e ir para seleção | `GET /api/v1/leagues/{id}/play-sessions/current` | `[C]` |
| Aba **Histórico** | Abrir | Por partida: `id`, participantes, `resultForMe` (Vitória/Derrota), `finishedAt` | Listar partidas finalizadas da liga, paginadas, ordem `-finishedAt` | `GET /api/v1/leagues/{id}/matches` | `[C]` |
| Aba Histórico — filtro "dias" | Selecionar `Todos os dias / 7 de julho / 30 de junho` | `playSessionId` (ou `date`) | Filtrar por jogatina; opções vêm da lista de jogatinas da liga | `?playSessionId=…` + `GET /api/v1/leagues/{id}/play-sessions` | `[C]` |
| Aba Histórico — filtro "resultados" | Selecionar `Todos / Vitórias / Derrotas` | `result` | Filtro **relativo ao usuário autenticado** | `?result=WIN\|LOSS` | `[C]` |
| Aba Histórico — item | Tocar numa partida `[I]` | `matchId` | Detalhe da partida com eventos | `GET /api/v1/matches/{id}` | `[I]` |
| Aba **Config** | Abrir | Config atual + `version` (ETag) | Detalhe da liga (mesmo recurso) | `GET /api/v1/leagues/{id}` | `[C]` |
| Aba Config | Editar nome / local / estilo / toggles e tocar **Salvar** | `name`, `venueId`, `gameMode`, `rules`, `If-Match: <version>` | Atualização parcial com optimistic locking; registrar em `AuditLog`; publicar `LeagueUpdated` | `PATCH /api/v1/leagues/{id}` | `[C]` |
| Aba Config | Tocar **Convidar mais amigos** | `userIds[]` | Convites nominais em lote | `POST /api/v1/leagues/{id}/invitations` | `[C]` |
| Aba Config | Tocar **Gerar código de convite** | `leagueId`, `expiresInHours`, `maxUses` | Gerar/rotacionar código | `POST /api/v1/leagues/{id}/invite-codes` | `[C]` |
| Aba Config | Tocar **Encerrar liga** | `leagueId`, `If-Match` | `ACTIVE → FINISHED`: bloquear novas partidas, congelar ranking final, notificar membros | `POST /api/v1/leagues/{id}/finish` | `[C]` |
| Aba Config `[I]` | Ver/gerenciar membros | lista de `LeagueMember` com papel | Listar membros | `GET /api/v1/leagues/{id}/members` | `[I]` |
| Aba Config `[I]` | Promover a admin / rebaixar | `memberId`, `role` | Alterar papel (só OWNER) | `PATCH /api/v1/leagues/{id}/members/{userId}` | `[I]` |
| Aba Config `[I]` | Remover membro | `memberId` | Remoção com histórico preservado | `DELETE /api/v1/leagues/{id}/members/{userId}` | `[I]` |
| Aba Config `[I]` | **Sair da liga** (não-dono) | `leagueId` | Sair; bloqueado para OWNER sem transferência | `POST /api/v1/leagues/{id}/leave` | `[I]` |

---

## 2.9 Partidas e jogatinas

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| Seleção — card "Jogador 1" | Ver a si mesmo fixo, "3 vitórias hoje" | `me.displayName`, `winsToday` | Ranking parcial da jogatina corrente | `GET /api/v1/play-sessions/{id}/ranking` | `[C]` |
| Seleção | Ver contexto "Jogatina de 14 jul" | `playSessionId`, `businessDate`, `league`, `venue` | Resolver jogatina aberta da liga hoje (cria se não existir) | `GET /api/v1/leagues/{id}/play-sessions/current` | `[C]`+`[I]` |
| Seleção — busca | Digitar "Quem vai jogar contra?" | `q` | Filtrar **membros da liga**, não amigos | `GET /api/v1/leagues/{id}/members?q=joao` | `[C]` |
| Seleção — lista | Ver "N vitórias hoje" por jogador | `winsToday` por membro | Ranking parcial da jogatina (join com membros) | `GET /api/v1/play-sessions/{id}/ranking` | `[C]` |
| Seleção | Selecionar adversário (borda lime) | `opponentUserId` | Estado local | — | `[C]` |
| Seleção | Tocar **Começar partida** | `playSessionId`, `participants[]`, `Idempotency-Key` | Criar `Match` em `IN_PROGRESS`, adicionar participantes, publicar `MatchStarted` | `POST /api/v1/matches` | `[C]` |
| Seleção `[I]` | Adicionar à jogatina alguém que ainda não jogou hoje | `userId` | Registrar participante da jogatina | `POST /api/v1/play-sessions/{id}/participants` | `[I]` |
| Partida — topbar | Ver `Liga da Terça` / `Jogatina de 14 jul • 21:47` | `league.name`, `session.businessDate`, `match.startedAt` | Detalhe da partida | `GET /api/v1/matches/{id}` | `[C]` |
| Partida — avatares | Ver "3 vitórias hoje" / "1 vitória hoje" | `winsToday` dos dois participantes | Incluído no recurso `Match` (`participants[].winsInSession`) | `GET /api/v1/matches/{id}` | `[C]` |
| Partida — bolas | Tocar numa bola **não** encaçapada | `matchId`, `ballNumber`, `pocketedByUserId`, `Idempotency-Key`, `If-Match` | Criar `MatchEvent(BALL_POCKETED)`; publicar `MatchEventRecorded` | `POST /api/v1/matches/{id}/events` | `[C]` |
| Partida — bolas | Tocar numa bola **já** encaçapada (desfazer) | `matchId`, `eventId` | Marcar evento como `undone` (soft), nunca deletar | `DELETE /api/v1/matches/{id}/events/{eventId}` | `[C]` |
| Partida `[I]` | Registrar **falta** (quando `trackFouls=true`) | `matchId`, `type=FOUL`, `committedByUserId` | Criar `MatchEvent(FOUL)` | `POST /api/v1/matches/{id}/events` | `[I]` |
| Partida | Tocar **Venceu** | `matchId`, `winnerSide/winnerUserId`, `If-Match`, `Idempotency-Key` | `IN_PROGRESS → FINISHED`, atualizar ranking da liga e da jogatina, publicar `MatchFinished` | `POST /api/v1/matches/{id}/finish` | `[C]` |
| Partida | Tocar **Perdeu** | idem, com vencedor = adversário | Mesma operação | `POST /api/v1/matches/{id}/finish` | `[C]` |
| Partida | Voltar (seta) sem finalizar `[I]` | `matchId` | Partida permanece `IN_PROGRESS`; deve ser recuperável ("retomar partida") | `GET /api/v1/matches/{id}` | `[I]` |
| Partida `[I]` | Cancelar/abandonar partida | `matchId`, `reason` | `IN_PROGRESS → CANCELLED`; **não** conta no ranking | `POST /api/v1/matches/{id}/cancel` | `[I]` |
| Histórico `[I]` | Corrigir resultado errado | `matchId`, `winnerUserId`, `reason`, `If-Match` | `FINISHED → CORRECTED`, enfileirar reprocessamento de ranking, `AuditLog`, notificar envolvidos | `POST /api/v1/matches/{id}/corrections` | `[I]` `DP-003` |
| Modal pós-vitória | Ver pódio parcial | `podium[]` com `position`, `player`, `wins` | Ranking da jogatina | `GET /api/v1/play-sessions/{id}/ranking` | `[C]` |
| Modal | Tocar **Próxima partida** | `playSessionId` | Voltar à seleção mantendo a mesma jogatina | — (estado local) | `[C]` |
| Jogatina `[I]` | Encerrar a noite | `playSessionId` | `IN_PROGRESS → CLOSED`, congelar pódio, publicar `PlaySessionClosed` | `POST /api/v1/play-sessions/{id}/close` | `[I]` |
| Jogatina `[I]` | Fechamento automático | job noturno | Fechar jogatinas abertas após `endTime + 4 h` | job `close-stale-sessions` | `[R]` |

---

## 2.10 Locais

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| Locais — mapa | Abrir a aba | Permissão de GPS → `lat`, `lng` | Buscar locais num raio, ordenados por distância | `GET /api/v1/venues?lat=-23.5583&lng=-46.6604&radiusKm=5` | `[C]` |
| Locais — mapa | Ver pins | Por local: `id`, `name`, `latitude`, `longitude` | Mesmo endpoint (projeção leve para o mapa) | `?fields=map` | `[C]` |
| Locais | Sem permissão de GPS `[I]` | — | Fallback: busca textual por cidade/bairro | `GET /api/v1/venues?q=pinheiros` | `[I]` |
| Locais | Arrastar o mapa / "buscar nesta área" `[I]` | novo centro + raio | Nova consulta por bounding box | `?lat=&lng=&radiusKm=` | `[I]` |
| Modal do local | Tocar num pin | `name`, `rating=4.5`, `ratingCount=128`, `openingHours`, `pricePerHour=30.00 BRL`, `distanceKm=2.4`, `photoUrl`, `address` | Detalhe do local (distância só se `lat/lng` forem enviados) | `GET /api/v1/venues/{id}?lat=&lng=` | `[C]` |
| Modal | Ver "Ligas que jogam aqui" | Lista de ligas **visíveis ao solicitante** (públicas + as suas) | Ligas associadas ao local | `GET /api/v1/venues/{id}/leagues` | `[C]` |
| Modal | Tocar **Traçar rota** | `latitude`, `longitude`, `name` | **Nenhuma** — app abre o app de mapas nativo. Backend apenas fornece coordenadas | — | `[C]` |
| Modal | Tocar **Atrelar liga a este local** | `venueId`, `leagueId` (seleção entre as ligas que o usuário administra) | `PATCH` na liga alterando `venueId` | `PATCH /api/v1/leagues/{id}` | `[C]` |
| Modal `[I]` | Desatrelar | `leagueId` | `PATCH` com `venueId: null` | `PATCH /api/v1/leagues/{id}` | `[I]` |
| Modal | Avaliar o local | `rating`, `comment` | Sem ação no mockup — nota provavelmente é de terceiro | `POST /api/v1/venues/{id}/reviews` | `[P]` `DP-017` |

---

## 2.11 Perfil

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| Perfil — card | Abrir | `displayName`, `username`, `avatarUrl`, `winRate=62`, `matchesPlayed=47` | Perfil + estatísticas | `GET /api/v1/me` + `GET /api/v1/me/statistics` | `[C]` |
| Perfil — aba Configurações | Tocar **Editar perfil** | `fullName`, `username`, `bio?`, `avatar` | Atualização parcial + verificação de username | `PATCH /api/v1/me` | `[C]` |
| Editar perfil `[I]` | Trocar foto | arquivo (≤5 MB, jpeg/png/webp) | Upload direto para Blob via SAS + confirmação | `POST /api/v1/me/avatar/upload-url` → `PUT` no Blob → `PUT /api/v1/me/avatar` | `[I]` |
| Perfil — Configurações | Tocar **Alterar senha** | `currentPassword`, `newPassword` | Ver §2.2 | `POST /api/v1/auth/password/change` | `[C]` |
| Perfil — Configurações | Tocar **Sair da conta** | `refreshToken` | Revogar sessão atual | `POST /api/v1/auth/logout` | `[C]` |
| Perfil `[I]` | Desativar conta | `password` | `status=DEACTIVATED`, sai dos rankings ativos, perfil some das buscas | `POST /api/v1/me/deactivate` | `[I]` |
| Perfil `[I]` | Excluir conta (LGPD) | `password`, confirmação | Agenda anonimização em 30 dias; publica `AccountDeletionRequested` | `DELETE /api/v1/me` | `[I]` |
| Perfil `[I]` | Exportar meus dados (LGPD) | — | Job assíncrono gera JSON/ZIP e envia link expirável | `POST /api/v1/me/data-exports` | `[I]` |
| Perfil — aba **Notificações (3)** | Abrir / ver badge | `unreadCount=3` | Contador de não lidas | `GET /api/v1/me/notifications/unread-count` | `[C]` |
| Notificações | Ver seções "Convites de liga", "Convites de amigos", "Avisos de jogatina" | `type`, `title`, `body`, `createdAt`, `readAt`, `actions[]`, `payload` | Listagem paginada e agrupável por categoria | `GET /api/v1/me/notifications?groupBy=category` | `[C]` |
| Notificações | Tocar **Aceitar** num convite de liga (inline) | `invitationId` (vem no `payload` da notificação) | Aceita o convite e marca a notificação como lida/resolvida | `POST /api/v1/league-invitations/{id}/accept` | `[C]` |
| Notificações | Tocar **Aceitar** num convite de amizade (inline) | `friendRequestId` | Idem | `POST /api/v1/friend-requests/{id}/accept` | `[C]` |
| Notificações | Ver "Sua jogatina começa em 1 hora" | Notificação gerada por **job agendado** (T-1h) | `PlaySessionReminderDue` → cria notificação | job `session-reminders` | `[C]` |
| Notificações | Abrir a aba (marca como lidas) `[I]` | ids visíveis | Marcar em lote | `POST /api/v1/me/notifications/read` | `[I]` |
| Notificações | Marcar **uma** como lida | `notificationId` | Marcar lida | `POST /api/v1/me/notifications/{id}/read` | `[I]` |
| Notificações | Tocar **Limpar histórico** | — | Soft delete de todas as **lidas**; pendentes acionáveis permanecem | `DELETE /api/v1/me/notifications` | `[C]` |
| Notificações `[I]` | Excluir uma notificação | `notificationId` | Soft delete | `DELETE /api/v1/me/notifications/{id}` | `[I]` |
| Notificações `[I]` | Preferências (o que quero receber) | mapa `categoria → {inApp, push, email}` | Ler/gravar preferências | `GET/PUT /api/v1/me/notification-preferences` | `[I]` |
| App (background) `[I]` | Registrar device para push | `token`, `platform`, `appVersion` | Registrar no Notification Hubs | `POST /api/v1/me/devices` | `[I]` |

---

## 2.12 Compartilhamento

| Tela/fluxo | Ação do usuário | Dados necessários | Operação de backend | Endpoint relacionado | Status |
|---|---|---|---|---|---|
| Modal de vitória | Abrir automaticamente após "Venceu" | `podium[]`, `session.businessDate`, `league.name`, `myPosition` | Resumo da jogatina (dados estruturados) | `GET /api/v1/play-sessions/{id}/summary` | `[C]` |
| Modal | Tocar **WhatsApp** | `shareText`, `shareUrl` | Backend devolve texto formatado + link; app abre o share sheet | `POST /api/v1/play-sessions/{id}/share` | `[C]` |
| Modal | Tocar **Instagram** / **TikTok** | `imageUrl` (1080×1920) | Geração assíncrona de imagem; app posta no stories | `POST /api/v1/share-artifacts` + `GET /api/v1/share-artifacts/{id}` | `[C]` + `DP-020` |
| Modal | Tocar **Copiar** | `shareUrl` | Link público com expiração | `POST /api/v1/play-sessions/{id}/share` | `[C]` |
| Link público (fora do app) | Alguém abre o link | Resumo mínimo, sem dado sensível | Página/JSON público por token opaco | `GET /api/v1/public/shares/{token}` | `[I]` `DP-004` |

---

## 2.13 Comportamentos transversais (não desenhados, obrigatórios)

| Comportamento | Necessidade | Solução | Status |
|---|---|---|---|
| Pull-to-refresh em todas as listas | Padrão mobile | `ETag` + `If-None-Match` → 304 | `[R]` |
| Scroll infinito | Listas grandes (histórico, notificações, membros) | Paginação por cursor | `[I]` |
| Estado vazio ("você ainda não tem ligas") | Usuário novo | Listas retornam `items: []` com `meta.totalItems: 0` | `[I]` |
| Tela de erro / retry | Rede de bar | Erros Problem Details com `code` estável e `retryable` | `[R]` |
| Sessão expirada no meio da partida | Token de 15 min < duração da noite | Refresh silencioso + retry automático da requisição | `[R]` |
| Dois dispositivos na mesma partida | Um marca bola, outro finaliza | `version` + `If-Match` + 409 `CONCURRENT_MODIFICATION` | `[R]` |
| Retry de "Começar partida" por timeout | 4G instável | `Idempotency-Key` obrigatório em POSTs de escrita | `[R]` |
| Forçar atualização do app | Mudança de contrato | `GET /app/bootstrap` com `minSupportedVersion` | `[R]` |
| Fuso da jogatina que vira o dia | Partida às 00:31 pertence à jogatina de 14/07 | `businessDate` calculado no fuso da liga | `[I]` crítico |
