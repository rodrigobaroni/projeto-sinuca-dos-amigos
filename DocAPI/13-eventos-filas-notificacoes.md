# 13. Eventos, filas e notificações

## 13.1 Decisão arquitetural: outbox in-process, não mensageria

**MVP: Transactional Outbox em PostgreSQL + worker in-process. Sem Service Bus, sem RabbitMQ, sem Event Grid.**

| Alternativa | Custo | Quando faz sentido |
|---|---|---|
| **A. Outbox + worker (escolhida)** | Uma tabela, um `BackgroundService`. Zero infra nova | Um único deployável, < 100 eventos/min, consumidores internos |
| B. Azure Service Bus desde o dia 1 | Namespace, tópicos, subscriptions, DLQ, SDK, custo mensal, mais um ponto de falha | Consumidores externos, múltiplos serviços, > 1000 msg/s, necessidade de retenção longa |
| C. Chamadas diretas em processo, sem outbox | Zero infra, mas **perde eventos**: se a notificação falha depois do commit, ela nunca acontece | Nunca — o Encaçapei tem lembretes e notificações que não podem sumir |

O ponto decisivo é que **todos os consumidores são internos** (ranking, estatísticas, notificações). Mensageria existe para desacoplar processos; aqui há um só. O que realmente se precisa é da garantia "**se a transação commitou, o efeito colateral vai acontecer**" — e isso é exatamente o que o outbox dá, sem broker.

### Como funciona

```
BEGIN;
  -- muta o agregado
  UPDATE matches SET status='FINISHED', ... ;
  UPDATE league_ranking_entries ... ;
  -- grava o evento na MESMA transação
  INSERT INTO outbox_messages (id, aggregate_type, aggregate_id, event_type, payload, occurred_at, trace_id)
  VALUES (:id, 'Match', :matchId, 'MatchFinished', :payload::jsonb, now(), :traceId);
COMMIT;
```

O worker (`Encacapei.Worker`) faz polling a cada **1 s**:

```sql
UPDATE outbox_messages SET attempts = attempts + 1
WHERE id IN (
  SELECT id FROM outbox_messages
  WHERE processed_at IS NULL AND dead_lettered_at IS NULL AND available_at <= now()
  ORDER BY occurred_at
  FOR UPDATE SKIP LOCKED
  LIMIT 50
)
RETURNING *;
```

`FOR UPDATE SKIP LOCKED` permite escalar para N réplicas do worker sem processamento duplicado — é a peça que torna essa solução simples **e** correta.

### Garantias

| Propriedade | Garantia |
|---|---|
| Entrega | **At-least-once.** Todo handler é idempotente (§13.5) |
| Ordem | **Por agregado**, via `ORDER BY occurred_at` + processamento serial por `aggregate_id` quando a ordem importa (ranking) |
| Durabilidade | Do banco (a mesma do dado de negócio) |
| Latência p95 | < 2 s (polling de 1 s + processamento) |
| Perda | Impossível sem perder o commit de negócio |

### Retentativas e DLQ

| Tentativa | Backoff (`available_at = now() + X`) |
|---|---|
| 1 | imediato |
| 2 | 5 s |
| 3 | 30 s |
| 4 | 2 min |
| 5 | 10 min |
| 6 | 30 min |
| 7 | 2 h |
| 8 | 6 h |
| > 8 | `dead_lettered_at = now()` |

**DLQ = a própria tabela** com `dead_lettered_at IS NOT NULL`. Um alerta dispara na primeira mensagem morta (métrica `outbox_dead_lettered_total > 0`). Há endpoint de back-office para reprocessar (`POST /admin/outbox/{id}/retry`).

Erros **permanentes** (payload inválido, agregado deletado) vão direto para DLQ sem 8 tentativas — classificados por tipo de exceção.

### Quando migrar para Service Bus `[R]`

Gatilhos objetivos, não "quando crescer":

| Gatilho | Ação |
|---|---|
| Volume sustentado > 500 eventos/s | Migrar para Service Bus com tópicos |
| Surge um segundo deployável que precisa consumir eventos | Migrar |
| Necessidade de replay histórico > 30 dias | Event Store ou Event Hubs |
| Latência p95 do outbox > 10 s | Primeiro otimizar polling/índices; migrar só se persistir |

O contrato de evento (§13.2) já é serializável para Service Bus sem alteração — a migração troca apenas o transporte.

---

## 13.2 Contrato de envelope de evento

Todo evento tem envelope idêntico; só `data` varia.

```json
{
  "eventId": "b1a2c3d4-e5f6-4708-89ab-000000000001",
  "eventType": "MatchFinished",
  "eventVersion": 1,
  "occurredAt": "2026-07-15T01:08:22Z",
  "aggregateType": "Match",
  "aggregateId": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "actorUserId": "11111111-1111-4111-8111-111111111111",
  "data": { }
}
```

| Campo | Descrição |
|---|---|
| `eventId` | UUID único — **chave de idempotência do consumidor** |
| `eventType` | Nome em `PascalCase`, passado |
| `eventVersion` | Inteiro. Mudança quebrável no `data` incrementa a versão; consumidores tratam ambas por um período |
| `occurredAt` | Instante do fato (não da publicação) |
| `aggregateType`/`aggregateId` | Origem — permite ordenação e particionamento |
| `traceId` | Correlaciona o evento com a requisição HTTP que o originou |
| `actorUserId` | Quem causou; `null` quando é o sistema |
| `data` | Payload específico, **sem PII além do necessário** |

**Regra de payload `[R]`:** o evento carrega **IDs e o mínimo desnormalizado** para o consumidor não precisar consultar em 90 % dos casos (ex.: `leagueName` na notificação de convite). Nunca carrega e-mail, hash, token ou coordenada.

---

## 13.3 Catálogo de eventos

Legenda de consumidores: **N** = Notifications · **R** = Rankings · **S** = Statistics · **A** = Audit · **L** = Leagues · **SH** = Sharing · **AN** = Analytics · **E** = Email

### Identity & Users

#### `UserRegistered`
| | |
|---|---|
| **Produtor** | Auth — `POST /auth/register` |
| **Momento** | Após commit da criação da conta |
| **Consumidores** | **E** (e-mail de verificação) · **AN** · **A** |
| **Idempotência do consumidor** | `eventId` + `user_id` (não reenviar e-mail duplicado) |

```json
{
  "eventType": "UserRegistered",
  "data": {
    "userId": "11111111-1111-4111-8111-111111111111",
    "username": "baroni",
    "displayName": "Rodrigo Baroni",
    "emailVerificationTokenId": "evt-2b3c4d5e",
    "locale": "pt-BR",
    "registeredAt": "2026-07-27T18:30:00Z"
  }
}
```

> O evento **não** carrega o e-mail nem o token em claro. O handler de e-mail busca ambos pelo `emailVerificationTokenId` — assim o payload no banco (e em qualquer log de outbox) fica limpo de PII e de credencial.

#### `EmailVerified` · `PasswordChanged` · `SessionRevoked` · `SuspiciousRefreshDetected`
| Evento | Consumidores | `data` |
|---|---|---|
| `EmailVerified` | **AN**, **A** | `{ userId, verifiedAt }` |
| `PasswordChanged` | **E** (aviso de segurança), **A** | `{ userId, changedAt, sessionsRevoked, source: "RESET"\|"CHANGE" }` |
| `SessionRevoked` | **A** | `{ userId, sessionId, reason }` |
| `SuspiciousRefreshDetected` | **E**, **A**, alerta de segurança | `{ userId, sessionId, detectedAt, familyRevoked: true }` |

#### `AccountDeletionRequested` · `AccountAnonymized`
| Evento | Consumidores | `data` |
|---|---|---|
| `AccountDeletionRequested` | Auth (revoga sessões), Friendships, Invitations, **E**, **A** | `{ userId, requestedAt, scheduledFor }` |
| `AccountAnonymized` | **S**, **R** (substitui nome exibido), **A** | `{ userId, anonymizedAt, anonymizedUsername: "deleted_a1b2c3d4" }` |

### Friendships

#### `FriendRequestSent`
| | |
|---|---|
| **Produtor** | Friendships — `POST /friend-requests` |
| **Consumidores** | **N** (notificação ao destinatário) · **AN** |
| **Idempotência** | `dedupeKey = "friend_request:" + requestId` |

```json
{
  "eventType": "FriendRequestSent",
  "actorUserId": "66666666-6666-4666-8666-666666666666",
  "data": {
    "requestId": "9f8e7d6c-5b4a-4392-8180-000000000001",
    "requesterId": "66666666-6666-4666-8666-666666666666",
    "requesterDisplayName": "Carlos Mota",
    "requesterUsername": "carlosmota",
    "addresseeId": "11111111-1111-4111-8111-111111111111",
    "createdAt": "2026-07-27T13:30:00Z"
  }
}
```

#### `FriendRequestAccepted` · `FriendRequestDeclined` · `FriendRequestCancelled` · `FriendshipRemoved`
| Evento | Consumidores | Notifica? | `data` |
|---|---|---|---|
| `FriendRequestAccepted` | **N**, **S**, **AN** | ✔ ao remetente | `{ requestId, friendshipId, userAId, userBId, acceptedByUserId }` |
| `FriendRequestDeclined` | **AN** | ✖ (RN-FRIEND-007) | `{ requestId, requesterId, addresseeId }` |
| `FriendRequestCancelled` | **N** (apaga notificação pendente) | ✖ | `{ requestId, requesterId, addresseeId }` |
| `FriendshipRemoved` | **S**, **AN** | ✖ | `{ friendshipId, userAId, userBId, removedByUserId }` |

### Leagues & Memberships

#### `LeagueCreated`
| | |
|---|---|
| **Produtor** | Leagues — `POST /leagues` |
| **Consumidores** | **R** (cria `RankingEntry` do dono) · Venues (`leaguesCount++`) · Scheduling (agenda `nextSessionAt` e lembretes) · **AN** · **A** |

```json
{
  "eventType": "LeagueCreated",
  "actorUserId": "11111111-1111-4111-8111-111111111111",
  "data": {
    "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
    "name": "Liga da Terça",
    "visibility": "PRIVATE",
    "ownerUserId": "11111111-1111-4111-8111-111111111111",
    "venueId": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001",
    "gameMode": "ONE_VS_ONE",
    "durationType": "SIX_MONTHS",
    "startsAt": "2026-07-28",
    "endsAt": "2027-01-28",
    "weekdays": ["TUESDAY", "FRIDAY"],
    "timezone": "America/Sao_Paulo",
    "nextSessionAt": "2026-07-28T23:00:00Z"
  }
}
```

#### `LeagueInvitationSent`
| | |
|---|---|
| **Produtor** | Invitations |
| **Consumidores** | **N** · **AN** |
| **Idempotência** | `dedupeKey = "league_invitation:" + invitationId` |

```json
{
  "eventType": "LeagueInvitationSent",
  "actorUserId": "33333333-3333-4333-8333-333333333333",
  "data": {
    "invitationId": "8a9b0c1d-2e3f-4a5b-8c6d-000000000001",
    "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000004",
    "leagueName": "Liga do Churrasco",
    "invitedUserId": "11111111-1111-4111-8111-111111111111",
    "invitedByUserId": "33333333-3333-4333-8333-333333333333",
    "invitedByDisplayName": "Felipe Costa",
    "expiresAt": "2026-08-01T14:30:00Z"
  }
}
```

> `leagueName` e `invitedByDisplayName` são desnormalizados de propósito: são exatamente os dois campos que o card amarelo do mockup precisa ("Liga do Churrasco" / "Convidado por Felipe Costa"). Sem isso o handler faria 2 consultas por notificação.

#### Demais eventos de liga
| Evento | Consumidores | Notifica? | `data` |
|---|---|---|---|
| `LeagueUpdated` | **A**, Scheduling | ✖ | `{ leagueId, changedFields[], version }` |
| `LeagueRulesChanged` | **N**, **A** | ✔ membros | `{ leagueId, leagueName, changes: { trackFouls: {from,to} } }` |
| `LeagueFinished` | **N**, **R** (congela), Invitations (expira), **A** | ✔ membros | `{ leagueId, leagueName, finishedByUserId, finalRanking: [{userId, position, wins, losses}] }` |
| `LeagueDeleted` | **A**, Venues | ✖ | `{ leagueId }` |
| `LeagueInvitationAccepted` | **N**, **R**, **L** (`membersCount++`), **AN** | ✔ quem convidou | `{ invitationId, leagueId, leagueName, userId, displayName }` |
| `LeagueInvitationDeclined` | **AN** | ✖ | `{ invitationId, leagueId, userId }` |
| `LeagueInvitationExpired` | **N** (resolve notificação) | ✖ | `{ invitationId, leagueId, userId }` |
| `InviteCodeGenerated` / `InviteCodeRedeemed` | **AN**, **A** | ✖ | `{ codeId, leagueId, code, usesCount }` |
| `LeagueMemberJoined` | **N** (avisa admins), **R**, **L**, **AN** | ✔ admins | `{ leagueId, leagueName, userId, displayName, role, joinedVia }` |
| `LeagueMemberLeft` / `LeagueMemberRemoved` | **N**, **R**, **L**, **A** | ✔ (só em `Removed`, ao removido) | `{ leagueId, userId, removedByUserId?, reason? }` |
| `LeagueMemberRoleChanged` | **N**, **A** | ✔ ao membro | `{ leagueId, userId, fromRole, toRole, changedByUserId }` |
| `LeagueOwnershipTransferred` | **N**, **A** | ✔ ambos | `{ leagueId, fromUserId, toUserId }` |

### Play Sessions

#### `PlaySessionStarted`
| | |
|---|---|
| **Produtor** | Play Sessions |
| **Consumidores** | **N** (opcional: "a jogatina começou"), **L**, Scheduling (agenda auto-close), **AN** |

```json
{
  "eventType": "PlaySessionStarted",
  "actorUserId": "11111111-1111-4111-8111-111111111111",
  "data": {
    "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
    "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
    "leagueName": "Liga da Terça",
    "businessDate": "2026-07-14",
    "venueId": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001",
    "openedByUserId": "11111111-1111-4111-8111-111111111111",
    "outOfSchedule": false,
    "autoCloseAt": "2026-07-15T07:00:00Z"
  }
}
```

#### `PlaySessionReminderDue`
| | |
|---|---|
| **Produtor** | **Scheduling** (job a cada 5 min varrendo `leagues.next_session_at`) |
| **Momento** | `nextSessionAt - reminderMinutesBefore` |
| **Consumidores** | **N** (uma notificação por membro ativo com preferência habilitada) |
| **Idempotência** | `dedupeKey = "session_reminder:" + leagueId + ":" + businessDate + ":" + userId` — **crítico**: o job roda a cada 5 min e não pode gerar 12 notificações por hora |

```json
{
  "eventType": "PlaySessionReminderDue",
  "actorUserId": null,
  "data": {
    "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
    "leagueName": "Liga da Terça",
    "businessDate": "2026-07-28",
    "sessionStartsAt": "2026-07-28T23:00:00Z",
    "venueId": "5e6f7a8b-9c0d-4e1f-8a2b-000000000001",
    "venueName": "Bar do Zé",
    "minutesBefore": 60,
    "recipientUserIds": [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
      "44444444-4444-4444-8444-444444444444",
      "55555555-5555-4555-8555-555555555555"
    ]
  }
}
```

Gera exatamente a notificação do mockup: *"Sua jogatina da **Liga da Terça** começa em 1 hora"* (`[C]`).

#### `PlaySessionClosed` · `PlaySessionParticipantAdded` · `PlaySessionReopened`
| Evento | Consumidores | Notifica? | `data` |
|---|---|---|---|
| `PlaySessionClosed` | **N** (pódio final), **SH** (pré-gera card), **R**, **L**, **AN** | ✔ participantes | `{ playSessionId, leagueId, businessDate, closedReason, matchesCount, podium: [{userId, position, wins, losses}] }` |
| `PlaySessionParticipantAdded` | **AN** | ✖ | `{ playSessionId, userId, addedByUserId }` |
| `PlaySessionReopened` | **A** | ✖ | `{ playSessionId, reopenedByUserId, reason }` |

### Matches

#### `MatchStarted`
```json
{
  "eventType": "MatchStarted",
  "actorUserId": "11111111-1111-4111-8111-111111111111",
  "data": {
    "matchId": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
    "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
    "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
    "gameMode": "ONE_VS_ONE",
    "startedAt": "2026-07-15T00:47:00Z",
    "createdByUserId": "11111111-1111-4111-8111-111111111111",
    "participants": [
      { "userId": "11111111-1111-4111-8111-111111111111", "side": 1 },
      { "userId": "22222222-2222-4222-8222-222222222222", "side": 2 }
    ]
  }
}
```
**Consumidores:** **AN** (funil de uso). Nenhuma notificação — os dois jogadores estão na mesa.

#### `MatchFinished` — o evento mais importante do sistema
| | |
|---|---|
| **Produtor** | Matches — `POST /matches/{id}/finish` |
| **Momento** | Após o commit da transação (ranking **já** atualizado sincronamente) |
| **Consumidores** | **S** (`UserStatistics`, `UserDailyStat`, `HeadToHeadStat`) · **N** (avisa o adversário se ele não registrou) · **AN** |
| **Idempotência** | Consumidores usam `matchId` como chave: `INSERT … ON CONFLICT (user_id, match_id) DO NOTHING` numa tabela `stats_applied_matches`, ou recomputação idempotente por período |

```json
{
  "eventType": "MatchFinished",
  "eventVersion": 1,
  "occurredAt": "2026-07-15T01:08:22Z",
  "aggregateType": "Match",
  "aggregateId": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "actorUserId": "11111111-1111-4111-8111-111111111111",
  "data": {
    "matchId": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
    "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
    "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
    "leagueName": "Liga da Terça",
    "businessDate": "2026-07-14",
    "timezone": "America/Sao_Paulo",
    "winnerSide": 1,
    "startedAt": "2026-07-15T00:47:00Z",
    "finishedAt": "2026-07-15T01:08:22Z",
    "finishedByUserId": "11111111-1111-4111-8111-111111111111",
    "resultStatus": "ORIGINAL",
    "participants": [
      { "userId": "11111111-1111-4111-8111-111111111111", "side": 1, "isWinner": true,  "ballsPocketed": 1, "fouls": 0 },
      { "userId": "22222222-2222-4222-8222-222222222222", "side": 2, "isWinner": false, "ballsPocketed": 1, "fouls": 0 }
    ]
  }
}
```

> `businessDate` e `timezone` vão no payload para os consumidores de estatística **não** recalcularem a data de negócio — evita duas implementações da regra mais delicada do sistema (§4.8).

#### `MatchCancelled` · `MatchResultCorrected` · `MatchEventRecorded` · `MatchEventUndone`
| Evento | Consumidores | Notifica? | `data` |
|---|---|---|---|
| `MatchCancelled` | **S** (reverte, se estava finalizada), **R**, **A**, **AN** | ✔ se estava finalizada | `{ matchId, previousStatus, cancelReason, cancelledByUserId, participants[] }` |
| `MatchResultCorrected` | **R** (rebuild), **S**, **N**, **A** | ✔ **todos** os participantes | ver abaixo |
| `MatchEventRecorded` | **AN** | ✖ | `{ matchId, eventId, type, ballNumber, actorUserId, sequence }` |
| `MatchEventUndone` | **AN**, **A** | ✖ | `{ matchId, eventId, undoneByUserId }` |

```json
{
  "eventType": "MatchResultCorrected",
  "actorUserId": "11111111-1111-4111-8111-111111111111",
  "data": {
    "matchId": "3f4a5b6c-7d8e-4f90-8a1b-000000000009",
    "correctionId": "d5e6f708-192a-4b3c-8d4e-000000000001",
    "leagueId": "0a1b2c3d-4e5f-4a6b-8c7d-000000000001",
    "leagueName": "Liga da Terça",
    "playSessionId": "7c8d9e0f-1a2b-4c3d-8e4f-000000000001",
    "previousWinnerSide": 1,
    "newWinnerSide": 2,
    "previousWinnerUserIds": ["11111111-1111-4111-8111-111111111111"],
    "newWinnerUserIds": ["22222222-2222-4222-8222-222222222222"],
    "reason": "Marcamos errado: quem venceu foi o João, a bola 8 caiu na caçapa errada.",
    "correctedByUserId": "11111111-1111-4111-8111-111111111111",
    "affectedUserIds": [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222"
    ]
  }
}
```

### Rankings & Statistics
| Evento | Produtor | Consumidores | `data` |
|---|---|---|---|
| `RankingUpdated` | Rankings | **AN**, cache (invalida) | `{ leagueId, playSessionId?, changedEntries: [{userId, fromPosition, toPosition, wins, losses, winRate}] }` |
| `RankingRebuildRequested` | Matches | Rankings (worker) | `{ jobId, leagueId, triggeredBy, sourceMatchId }` |
| `RankingRebuildCompleted` | Rankings | **N** (avisa quem mudou de posição sem jogar), **A** | `{ jobId, leagueId, matchesProcessed, positionChanges[] }` |
| `RankingFrozen` | Rankings | **AN** | `{ leagueId, frozenAt, finalRanking[] }` |
| `UserStatisticsUpdated` | Statistics | cache | `{ userId, matchesPlayed, wins, losses, winRate, currentWinStreak }` |

### Sharing
| Evento | Produtor | Consumidores | `data` |
|---|---|---|---|
| `ShareArtifactRequested` | Sharing | Worker de render (só se `IMAGE_*`) | `{ shareArtifactId, playSessionId, kind, format, visibilityLevel, snapshot }` |
| `ShareArtifactReady` | Worker | **N** (opcional: "seu card está pronto") | `{ shareArtifactId, imageUrl, shareUrl }` |
| `ShareArtifactFailed` | Worker | **N**, alerta | `{ shareArtifactId, failureReason, attempts }` |
| `ShareRevoked` | Sharing | CDN purge, **A** | `{ shareArtifactId, revokedByUserId }` |

### Notifications
| Evento | Produtor | Consumidores | `data` |
|---|---|---|---|
| `NotificationCreated` | Notifications | Push dispatcher (pós-MVP), cache do contador | `{ notificationId, userId, category, type, title }` |
| `PushDeliveryFailed` | Push dispatcher | Users (desativa device) | `{ deviceId, userId, providerError }` |

---

## 13.4 Matriz evento → notificação

Tradução direta de evento de domínio para o que aparece na aba Notificações.

| Evento | `category` | `type` | Destinatário | Título gerado | Ações inline |
|---|---|---|---|---|---|
| `FriendRequestSent` | `FRIEND_REQUESTS` | `FRIEND_REQUEST_RECEIVED` | Destinatário | "Carlos Mota quer ser seu amigo" `[C]` | Aceitar / Recusar |
| `FriendRequestAccepted` | `FRIEND_REQUESTS` | `FRIEND_REQUEST_ACCEPTED` | Remetente | "Carlos Mota aceitou seu convite" | — |
| `LeagueInvitationSent` | `LEAGUE_INVITATIONS` | `LEAGUE_INVITATION_RECEIVED` | Convidado | "Liga do Churrasco te convidou" `[C]` | Aceitar / Recusar |
| `LeagueInvitationAccepted` | `LEAGUE_UPDATES` | `LEAGUE_MEMBER_JOINED` | Quem convidou + admins | "João Pereira entrou na Liga da Terça" | — |
| `PlaySessionReminderDue` | `SESSION_ALERTS` | `SESSION_REMINDER` | Membros ativos | "Sua jogatina da Liga da Terça começa em 1 hora" `[C]` | — |
| `PlaySessionStarted` | `SESSION_ALERTS` | `SESSION_STARTED` | Membros que não estão presentes | "A jogatina da Liga da Terça começou" | — |
| `PlaySessionClosed` | `SESSION_ALERTS` | `SESSION_CLOSED_PODIUM` | Participantes | "Pódio da jogatina de 14 jul: você ficou em 1º 🥇" | Compartilhar |
| `MatchFinished` | `MATCH_RESULTS` | `MATCH_FINISHED` | Adversário (se não registrou) | "Rodrigo Baroni registrou: você perdeu por 1 a 0" | Contestar |
| `MatchResultCorrected` | `MATCH_RESULTS` | `MATCH_RESULT_CORRECTED` | Todos os participantes | "O resultado de Rodrigo × João foi corrigido" | Ver detalhes |
| `RankingRebuildCompleted` | `LEAGUE_UPDATES` | `RANKING_CHANGED` | Quem mudou de posição sem ter jogado | "Sua posição na Liga da Terça mudou de 2º para 3º" | — |
| `LeagueRulesChanged` | `LEAGUE_UPDATES` | `LEAGUE_RULES_CHANGED` | Membros | "As regras da Liga da Terça mudaram" | — |
| `LeagueFinished` | `LEAGUE_UPDATES` | `LEAGUE_FINISHED` | Membros | "A Liga da Terça foi encerrada. Campeão: Felipe Costa 🏆" | Ver ranking final |
| `LeagueMemberRemoved` | `LEAGUE_UPDATES` | `REMOVED_FROM_LEAGUE` | Removido | "Você foi removido da Liga da Terça" | — |
| `LeagueMemberRoleChanged` | `LEAGUE_UPDATES` | `ROLE_CHANGED` | Membro | "Você agora é administrador da Liga da Terça" | — |
| `LeagueOwnershipTransferred` | `LEAGUE_UPDATES` | `OWNERSHIP_TRANSFERRED` | Novo e antigo dono | "Você agora é o dono da Liga da Terça" | — |
| `PasswordChanged` | `SYSTEM` | `SECURITY_PASSWORD_CHANGED` | Titular | "Sua senha foi alterada" | — |
| `SuspiciousRefreshDetected` | `SYSTEM` | `SECURITY_ALERT` | Titular | "Detectamos um acesso suspeito. Sua sessão foi encerrada." | — |

**Notificação "Contestar" em `MATCH_FINISHED`** `[R]`: é a compensação por não exigir confirmação do adversário (`DP-001`). Quem perdeu recebe o aviso e tem um caminho de um toque para abrir a correção — resolvendo o problema social sem adicionar um estado à máquina de partida.

**Eventos que deliberadamente NÃO notificam:**

| Evento | Por quê |
|---|---|
| `FriendRequestDeclined` | Proteção social (RN-FRIEND-007) |
| `LeagueInvitationDeclined` | Idem |
| `FriendshipRemoved` | Remover amigo é silencioso |
| `MatchStarted` | Os jogadores estão na mesa |
| `MatchEventRecorded` | Ruído puro — seriam 8 notificações por partida |
| Ação do próprio usuário | RN-NOTIF-007 |

---

## 13.5 Idempotência dos consumidores

At-least-once significa que **todo handler pode rodar duas vezes**. Estratégia por tipo:

| Handler | Estratégia |
|---|---|
| Criar notificação | `UNIQUE (user_id, dedupe_key)` com `ON CONFLICT DO NOTHING` |
| Enviar e-mail | Tabela `sent_emails (event_id, template)` com unique; consulta antes de enviar |
| Atualizar `UserStatistics` | Tabela `stats_applied_matches (user_id, match_id)` com unique. Se já aplicado, ignora |
| Atualizar `HeadToHeadStat` | Idem, por `(pair_key, match_id)` |
| Rebuild de ranking | **Naturalmente idempotente**: recalcula do zero a partir de `matches` |
| Push notification | `notification_id` como chave de deduplicação no provedor |
| Contadores desnormalizados (`membersCount`) | **Não** incrementar por evento. Recalcular com `SELECT COUNT(*)` ou aplicar na transação síncrona |

> A regra é: **nunca incremente um contador dentro de um handler de evento at-least-once.** Ou o contador é atualizado na transação síncrona do agregado, ou é recalculado. `UPDATE … SET count = count + 1` num consumidor é bug de produção esperando a hora.

---

## 13.6 Jobs agendados

Implementação `[R]`: `BackgroundService` com Quartz.NET (ou Hangfire) no `Encacapei.Worker`, com **lock distribuído** por job (`pg_advisory_lock`) para suportar múltiplas réplicas.

| Job | Frequência | O que faz | Alerta se |
|---|---|---|---|
| `outbox-dispatcher` | 1 s | Publica eventos pendentes | Lag > 30 s ou DLQ > 0 |
| `session-reminders` | 5 min | Varre `leagues.next_session_at` e emite `PlaySessionReminderDue` | Lembrete perdido (verificação diária) |
| `close-stale-sessions` | 15 min | Fecha jogatinas abertas há mais de `endTime + 4 h` (RN-SESSION-009) | > 10 por dia (indica bug de UX) |
| `finish-expired-leagues` | diário 05:00 UTC | `endsAt < hoje` → `FINISHED` | Falha |
| `expire-invitations` | 1 h | Convites e códigos vencidos → `EXPIRED` | Falha |
| `recompute-next-session` | diário 04:30 UTC | Recalcula `next_session_at` de todas as ligas ativas | Divergência > 0 |
| `ranking-drift-check` | diário 04:00 UTC | Recalcula amostra e compara com o materializado (§12.6) | **Qualquer** divergência |
| `anonymize-deleted-accounts` | diário 03:00 UTC | `deletion_scheduled_at < now()` → anonimiza | Falha (risco de LGPD) |
| `purge-expired-tokens` | 1 h | Remove refresh/reset/verification vencidos | — |
| `purge-idempotency-records` | 1 h | Remove registros > 24 h | — |
| `purge-old-notifications` | diário | Soft-delete de lidas > 12 meses | — |
| `purge-expired-shares` | diário | Remove imagens de artefatos expirados do Blob | — |
| `purge-login-attempts` | diário | Remove > 90 dias (LGPD) | — |
| `cleanup-dead-devices` | semanal | Remove `user_devices` com `last_seen_at` > 90 dias | — |
| `venue-catalog-sync` | semanal | Atualiza `rating`/horários da fonte externa (se `DP-018` = C) | — |

**Regra de janela `[R]`:** todos os jobs pesados rodam entre **03:00 e 06:00 UTC** (= 00:00–03:00 BRT), que é justamente quando o pico de uso do produto está terminando. Nenhum job de expurgo roda entre 22:00 e 04:00 UTC (19:00–01:00 BRT), a janela de jogatina.

---

## 13.7 Processamentos assíncronos (visão do usuário)

| Operação | Modo | Contrato | Feedback ao usuário |
|---|---|---|---|
| Finalizar partida | **Síncrono** (ranking na transação) | `200` com pódio | Imediato |
| Correção com rebuild (liga > 500 partidas) | Assíncrono | `202` + `statusUrl` | "Atualizando ranking..." com polling |
| Correção com rebuild (liga pequena) | Síncrono | `200` com ranking novo | Imediato |
| Geração de imagem de card | Assíncrono | `202` + `statusUrl` | Spinner com polling 1/2/4/8 s |
| Exportação LGPD | Assíncrono | `202` + `statusUrl` | "Avisaremos quando estiver pronto" |
| Envio de e-mail | Assíncrono (fire-and-forget) | `202` | "Enviamos as instruções" |
| Upload de avatar | Semi-síncrono | SAS → `PUT` no Blob → `PUT /me/avatar` | Progresso do upload |
| Anonimização de conta | Assíncrono (D+30) | `202` + `scheduledFor` | "Sua conta será anonimizada em 30 dias" |
| Notificações | Assíncrono (< 10 s) | — | Badge atualiza no próximo foreground |
| Estatísticas da Home | Assíncrono (< 5 s) | — | Invisível |

**Princípio `[R]`:** é síncrono tudo que o usuário **vê na tela seguinte**. É assíncrono tudo que ele só verá minutos depois. A finalização de partida é síncrona porque o modal de pódio abre em cima dela — e um pódio errado por 2 segundos é pior que 150 ms extra de latência.
