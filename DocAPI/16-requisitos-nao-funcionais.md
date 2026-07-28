# 16. Requisitos não funcionais

Todo requisito aqui é **mensurável** e ancorado no padrão de uso real do produto: pico concentrado entre **20h e 01h BRT**, terças a domingos, com rajadas curtas e intensas (4 amigos registrando 9 partidas em 2 horas).

Cada item traz alvo de **MVP** e alvo de **crescimento** (10× o volume inicial).

---

## 16.1 Perfil de carga esperado

| Métrica | MVP | Crescimento (10×) |
|---|---|---|
| Usuários cadastrados | < 50 mil | 500 mil |
| Usuários ativos diários (DAU) | 2 mil | 20 mil |
| Ligas ativas | 5 mil | 50 mil |
| Jogatinas simultâneas no pico | 300 | 3 mil |
| Partidas finalizadas/dia | 5 mil | 50 mil |
| Eventos de bola/dia | 40 mil | 400 mil |
| RPS médio | 15 | 150 |
| **RPS de pico (22h BRT)** | **120** | **1 200** |
| Razão leitura/escrita | 4:1 | 4:1 |

**Característica dominante:** a carga é **extremamente concentrada**. 70 % das requisições do dia acontecem em 4 horas. Isso favorece autoscaling agressivo e desaconselha provisionamento fixo para o pico.

---

## 16.2 Disponibilidade

| Requisito | MVP | Crescimento |
|---|---|---|
| SLO de disponibilidade mensal | **99,5 %** (≈ 3 h 40 min/mês) | 99,9 % (≈ 43 min/mês) |
| **SLO na janela crítica (20h–02h BRT)** | **99,9 %** | 99,95 % |
| Réplicas de API | 2 (mínimo, zonas distintas) | 4–20 com autoscale |
| Banco | Azure PostgreSQL Flexible Server, **zone-redundant HA** | + read replica para relatórios |
| Deploy | Blue-green via deployment slots, **zero downtime** | Idem + canary 10 % |
| Janela de manutenção | **03:00–05:00 BRT**, comunicada 48 h antes | Sem janela (rolling) |

**Racional do SLO duplo `[R]`:** 99,5 % mensal é folgado para um app de lazer, mas 5 minutos fora do ar às 22h de uma terça derrubam a jogatina de centenas de grupos. Separar a janela crítica com alvo mais rígido é mais honesto (e mais barato) do que exigir 99,95 % em horário comercial, quando quase ninguém usa.

---

## 16.3 Performance e latência

Medida no servidor (exclui rede do cliente). Todos os alvos são **p95**, com p99 indicado onde importa.

### Escritas

| Endpoint | p95 MVP | p99 MVP | p95 Crescimento | Por que este alvo |
|---|---:|---:|---:|---|
| `POST /matches/{id}/events` | **150 ms** | 400 ms | 150 ms | Toque na bola precisa parecer instantâneo |
| `POST /matches/{id}/finish` | **400 ms** | 800 ms | 400 ms | Transação com ranking + pódio; abre o modal em cima |
| `POST /matches` | 300 ms | 600 ms | 300 ms | — |
| `POST /leagues` | 500 ms | 1 s | 500 ms | Cria 5+ registros e N convites |
| `POST /auth/login` | **600 ms** | 1 s | 600 ms | Argon2id consome ~100 ms de propósito |
| `POST /auth/register` | 800 ms | 1,5 s | 800 ms | Hash + envio de e-mail assíncrono |
| `PATCH /leagues/{id}` | 250 ms | 500 ms | 250 ms | — |
| `POST /matches/{id}/corrections` | 800 ms | 2 s | 400 ms (assíncrono) | Rebuild síncrono em liga pequena |

### Leituras

| Endpoint | p95 MVP | p95 Crescimento |
|---|---:|---:|
| `GET /me?include=statistics,counters` | **200 ms** | 200 ms |
| `GET /leagues/{id}/ranking` | **250 ms** | 200 ms (cache) |
| `GET /play-sessions/{id}/ranking` | 200 ms | 150 ms |
| `GET /matches/{id}` | 150 ms | 150 ms |
| `GET /leagues/{id}/members?include=sessionStats` | 300 ms | 250 ms |
| `GET /leagues/{id}/matches` (histórico paginado) | 300 ms | 300 ms |
| `GET /me/statistics/timeseries` | 400 ms | 300 ms |
| `GET /me/head-to-head/{userId}` | 300 ms | 250 ms |
| `GET /venues?lat=&lng=` | **300 ms** | 250 ms |
| `GET /me/notifications` | 250 ms | 200 ms |
| `GET /me/notifications/unread-count` | **50 ms** | 30 ms (Redis) |

### Regras de eficiência `[R]`

| Regra | Motivo |
|---|---|
| **Zero N+1** em qualquer listagem | Verificado por teste de integração que conta queries (`AssertQueryCount`) |
| Toda consulta de lista tem índice coberto | `EXPLAIN` obrigatório em code review de consulta nova |
| Nenhuma query de leitura de tela > 50 ms no banco | Alerta de query lenta em 100 ms |
| Payload de resposta < 100 KB | Ranking de 200 membros ≈ 60 KB |
| Compressão | Brotli/gzip para respostas > 1 KB |
| Pool de conexões | 2× vCPU + 5 por réplica; PgBouncer em `transaction` mode no crescimento |

---

## 16.4 Escalabilidade

| Dimensão | MVP | Crescimento |
|---|---|---|
| API | App Service P1v3, autoscale 2→6 por CPU > 65 % e fila de requisições | Container Apps / AKS, 4→20, KEDA por RPS |
| Banco | 2 vCPU / 8 GB, 128 GB storage | 8 vCPU / 32 GB + read replica; PgBouncer |
| Worker | 1 instância (jobs com advisory lock) | 2–4 instâncias (outbox usa `SKIP LOCKED`) |
| Redis | Basic C1 (1 GB) | Standard C2+ com réplica |
| Blob/CDN | Escala sozinho | Idem |
| Escala horizontal da API | **Stateless** — nenhuma sessão em memória; rate limit e cache em Redis | Idem |

### Pontos de contenção previstos e mitigação

| Contenção | Quando aparece | Mitigação |
|---|---|---|
| `UPDATE` concorrente na mesma `LeagueRankingEntry` | Duas partidas do mesmo jogador finalizando junto | Impossível: 1 partida ativa por jogador (RN-MATCH-005) |
| Reposicionamento do ranking a cada finalização | Liga com > 200 membros | Recalcular só as posições **afetadas** (janela entre a posição antiga e a nova), não a liga inteira |
| Polling do outbox | > 500 eventos/s | `SKIP LOCKED` + múltiplos workers; depois migrar para Service Bus (§13.1) |
| Contador de não lidas | Endpoint chamado a cada foreground | Redis com TTL 30 s |
| Busca trigram de usuários | Base > 500 mil | Índice GIN já previsto; se degradar, migrar para busca dedicada |
| `venues` com `ST_DWithin` | Catálogo > 100 mil locais | Índice GIST + limite de raio em 50 km |
| Particionamento | `audit_logs` e `notifications` > 50 M linhas | Partição mensal já prevista no schema |

---

## 16.5 Consistência

| Dado | Garantia | Janela |
|---|---|---|
| Partida, participantes, eventos | **Forte** (ACID) | — |
| Ranking da liga e da jogatina | **Forte** (mesma transação) | — |
| Contadores da liga e da jogatina | **Forte** | — |
| Estatísticas do usuário | Eventual | **p99 < 5 s** |
| Séries temporais | Eventual | p99 < 5 s |
| Head-to-head | Eventual | p99 < 30 s |
| Notificações | Eventual | p99 < 10 s |
| Cache de ranking | Eventual | ≤ 15 s (TTL) |
| Contador de não lidas | Eventual | ≤ 30 s (TTL) |
| Imagem de compartilhamento | Assíncrona | p95 < 10 s |
| Réplica de leitura (crescimento) | Eventual | lag < 1 s; **nunca** usada para ranking |

**Invariante de projeto:** nenhum número exibido ao usuário existe **apenas** num agregado materializado. Todos são reconstituíveis de `matches`, e há job de verificação de deriva com alvo de **zero** divergências (§12.6).

---

## 16.6 Backup e recuperação de desastre

| Item | MVP | Crescimento |
|---|---|---|
| Backup do banco | Automático diário + **PITR de 35 dias** | Idem + geo-redundante |
| **RPO** | **5 min** (PITR) | 1 min |
| **RTO** | **4 h** | 1 h |
| Teste de restauração | **Trimestral**, com evidência documentada | Mensal, automatizado |
| Blob Storage | LRS + soft delete 30 dias + versionamento | GRS |
| Key Vault | Soft-delete + purge protection | Idem |
| Configuração e infra | **IaC (Bicep/Terraform)** versionado — ambiente recriável do zero | Idem |
| Runbook de DR | Documentado e ensaiado ao menos 1×/ano | Semestral |
| Runbook de restauração | Inclui **reaplicação de anonimizações pendentes** (§15.9) | Idem |

**Cenários cobertos pelo runbook:**
1. Perda de uma zona de disponibilidade → HA zone-redundant assume automaticamente.
2. Corrupção lógica (deploy que corrompe dados) → PITR para o instante anterior + replay de outbox.
3. Perda de região → restauração geo-redundante (crescimento) ou recriação por IaC + restore (MVP, dentro do RTO de 4 h).
4. Exclusão acidental de recurso → locks de recurso no Azure + soft delete.

---

## 16.7 Observabilidade

| Pilar | Ferramenta | Requisito |
|---|---|---|
| **Tracing** | OpenTelemetry → Application Insights | 100 % das requisições amostradas no MVP; **sampling adaptativo** de 20 % no crescimento, com 100 % em erro e em rota crítica (`finish`, `corrections`) |
| **Logs** | Serilog estruturado | JSON, com `traceId`, `userId`, `route`, `statusCode`, `durationMs`. Redação de PII obrigatória (§14.8) |
| **Métricas** | Azure Monitor | Técnicas + de negócio (§14.8) |
| **Health checks** | `/health/live`, `/health/ready` | `ready` verifica banco e Redis; `live` só o processo |
| **Dashboards** | 3 painéis: (1) Saúde da API, (2) Jornada da jogatina, (3) Integridade de ranking | — |
| **Retenção** | 90 dias quente, 1 ano frio | — |

### Painel "Jornada da jogatina" `[R]`

Métricas de produto que revelam problemas invisíveis nas métricas técnicas:

| Métrica | O que revela |
|---|---|
| `sessions_opened_total` vs `sessions_closed_total` | Jogatinas abandonadas (UX de encerramento ruim) |
| `matches_started_total` vs `matches_finished_total` | Partidas abandonadas |
| `matches_cancelled_total` por `reason` | `MISTAKE` alto = seleção de adversário confusa |
| `matches_corrected_total / matches_finished_total` | **Taxa de correção.** > 2 % indica UX de finalização ambígua ou necessidade de confirmação (`DP-001`) |
| `concurrent_modification_conflicts_total` | Dois celulares na mesma mesa — se alto, falta sincronização em tempo real |
| `idempotent_replays_total` | Qualidade da rede dos usuários |
| `ball_already_pocketed_total` | Duplo toque — se alto, o botão da bola precisa de debounce |
| `outbox_lag_seconds` | Saúde do processamento assíncrono |
| `ranking_drift_detected_total` | **Deve ser sempre 0** |

---

## 16.8 Alertas

| Alerta | Condição | Severidade | Ação |
|---|---|---|---|
| API fora do ar | `/health/ready` falha 3× em 3 min | **P1** — acorda alguém | Runbook de indisponibilidade |
| Taxa de erro 5xx | > 1 % em 5 min | **P1** | Investigar por `traceId` |
| Latência de `finish` | p95 > 1 s em 10 min | **P2** | Verificar contenção no ranking |
| **Deriva de ranking** | `ranking_drift_detected_total > 0` | **P1** | Rebuild + causa raiz |
| Outbox parado | `outbox_lag_seconds > 60` | **P2** | Verificar worker |
| Dead letter | `outbox_dead_lettered_total > 0` | **P2** | Analisar e reprocessar |
| Banco perto do limite | CPU > 80 % ou storage > 85 % por 15 min | **P2** | Escalar |
| Pool de conexões esgotado | Espera > 100 ms | **P2** | Ajustar pool / PgBouncer |
| Falha em job de anonimização | Qualquer falha | **P1** (LGPD) | Executar manualmente e registrar |
| Falha em job de lembrete | Lembrete não enviado | **P2** | Produto perde a função principal de retenção |
| Taxa de correção anormal | > 5 % em 24 h | **P3** | Investigar UX |
| Rate limit em massa | > 100 `429`/min de um IP | **P3** | Avaliar bloqueio |
| Bounce de e-mail | > 5 % em 1 h | **P2** | Verificar reputação de domínio |
| Certificado expirando | < 21 dias | **P3** | Renovar |
| Backup falhou | Qualquer falha | **P1** | — |

**Regra antifadiga `[R]`:** todo alerta P1/P2 tem runbook escrito **antes** de ser criado. Alerta sem runbook é ruído, e ruído treina o time a ignorar alerta.

---

## 16.9 Limites de payload e cotas

| Item | Limite |
|---|---|
| Corpo JSON | 256 KB |
| Profundidade de JSON | 16 níveis |
| Upload de avatar | 5 MB |
| `limit`/`pageSize` de paginação | 100 |
| `userIds[]` em convite | 50 |
| `participantUserIds[]` em jogatina | 20 |
| `notificationIds[]` | 200 |
| Tamanho de `q` | 60 caracteres |
| `radiusKm` | 50 |
| Timeout de requisição | 30 s (5 s para leitura simples) |
| Timeout de query no banco | 5 s (30 s para rebuild) |
| Timeout de render de imagem | 30 s |
| Ligas criadas por usuário | 10/dia · 100 total |
| Membros por liga | 200 (acima disso o ranking passa a paginar) |
| Partidas por jogatina | 200 |
| Jogatinas por liga por dia | 1 |
| Correções por usuário | 5/dia |
| Compartilhamentos gerados | 10/h |
| Exportações de dados | 1/dia |

Cotas retornam `429 QUOTA_EXCEEDED` com `detail` explicando o limite — não erro genérico.

---

## 16.10 Rate limits

Tabela completa em §7.12. Requisito não funcional associado:

| Requisito | Valor |
|---|---|
| Precisão do rate limit | Sliding window, erro < 5 % |
| Overhead do rate limit | < 5 ms p95 |
| Comportamento com Redis indisponível | **Fail-open** com limite por instância (não transformar queda de cache em indisponibilidade) |
| Headers | `X-RateLimit-*` em **todas** as respostas de rota limitada, não só nas bloqueadas |

---

## 16.11 SLO e error budget

| SLI | SLO mensal | Error budget |
|---|---|---|
| Disponibilidade geral | 99,5 % | 3 h 39 min |
| Disponibilidade 20h–02h BRT | 99,9 % | ~11 min na janela |
| Latência p95 de `POST /matches/{id}/finish` | 99 % das requisições < 400 ms | 1 % |
| Latência p95 de `GET /leagues/{id}/ranking` | 99 % < 250 ms | 1 % |
| Corretude do ranking | **100 %** (zero deriva) | **0** |
| Entrega de lembrete de jogatina | 99 % dentro de ±5 min do horário | 1 % |
| Perda de evento do outbox | **0** | **0** |
| Partidas duplicadas por retry | **0** | **0** |

**Política de error budget `[R]`:** consumidos 75 % do budget de disponibilidade no mês, novas features param e o time trabalha em confiabilidade até o fim do período. Os dois SLIs com budget **zero** (corretude do ranking e perda de evento) são tratados como incidente automático — qualquer ocorrência gera post-mortem, independentemente do impacto percebido.

---

## 16.12 Requisitos de manutenibilidade `[R]`

| Requisito | Alvo |
|---|---|
| Arquitetura | Clean Architecture; `Encacapei.Domain` **sem** referência a EF Core, ASP.NET ou Azure SDK |
| Verificação de dependência | Teste de arquitetura (NetArchTest/ArchUnitNET) que **falha o build** se o domínio referenciar framework |
| Cobertura de testes | ≥ 80 % em `Domain` e `Application`; **100 %** nas regras de ranking, `businessDate` e máquinas de estado |
| Análise estática | SonarCloud — quality gate obrigatório; **migrações EF Core excluídas** (padrão da organização) |
| Tempo de build + testes | < 10 min |
| Tempo de deploy | < 5 min |
| Migrações | Sempre compatíveis com a versão anterior (expand/contract), permitindo rollback sem perda |
| Documentação de API | OpenAPI gerada e **validada no CI** contra a especificação deste documento |
| ADRs | Toda decisão `[R]` deste documento vira ADR no repositório |
| Onboarding | Novo dev sobe o ambiente local (Docker Compose com Postgres + Redis + seed do dataset canônico) em < 30 min |

---

## 16.13 Acessibilidade e internacionalização (impacto no backend)

| Item | MVP | Crescimento |
|---|---|---|
| Idioma das mensagens de erro | `pt-BR` fixo | i18n por `Accept-Language` (`pt-BR`, `en-US`, `es`) |
| Formatação de números e datas | **Responsabilidade do cliente** — API sempre em ISO 8601 e decimal com ponto | Idem |
| Fuso horário | Por liga e por usuário, já modelado | Idem |
| Moeda | `BRL` com campo `currency` desde o início | Multi-moeda |
| Textos de notificação | Gerados no servidor em `pt-BR` | Chave de template + parâmetros, traduzidos no cliente |

> A decisão de gerar `title`/`body` de notificação e `shareText` **no servidor** facilita o MVP mas dificulta i18n. A migração prevista é: manter os campos atuais e **adicionar** `titleKey` + `params` no mesmo payload, permitindo que o cliente traduza sem quebrar versões antigas.
