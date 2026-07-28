# 12. Ranking e cálculos

O ranking é o produto. Se ele estiver errado, o app perde a razão de existir — a discussão volta para o grupo do WhatsApp. Este capítulo é, portanto, o mais prescritivo do documento.

---

## 12.1 Taxa de vitória (`winRate`)

### Fórmula

```
matchesPlayed = wins + losses
winRate       = matchesPlayed = 0 ? 0.00 : ROUND(wins * 100.0 / matchesPlayed, 2)
```

| Decisão | Valor | Justificativa |
|---|---|---|
| Tipo de armazenamento | `numeric(5,2)` | `float`/`double` produzem `62.99999999` e ordenação instável. Dinheiro e percentual nunca em binário flutuante |
| Casas decimais persistidas | **2** | Suficiente para desempatar 7/11 (63,64) de 5/8 (62,50) sem inflar o schema |
| Base | `wins + losses` | **Não** inclui partidas `CANCELLED` nem `IN_PROGRESS` |
| Sem partidas | `0.00` | Alternativa (`null`) obrigaria tratamento especial em toda ordenação e na UI. `0.00` com `matchesPlayed = 0` é inequívoco |
| Arredondamento na **exibição** | **Half-up para inteiro**, no cliente | `63.64 → 64%`, `55.56 → 56%`, `62.50 → 63%` |
| Arredondamento no **cálculo** | Nunca. Ordena-se pelo valor de 2 casas | Arredondar antes de ordenar cria empates artificiais |

### Resolução de `INC-01`

O mockup usa duas regras na mesma tabela: `7/11 = 63,63…` exibido como **64 %** (arredondado) e `5/9 = 55,55…` exibido como **55 %** (truncado). Ambos não podem estar certos.

| Alternativa | Prós | Contras |
|---|---|---|
| **A. Half-up (recomendada)** | Convenção brasileira, é o que o usuário espera de "arredondar" | `55,56 → 56 %` divergirá do print do mockup |
| B. Truncamento | Nunca "infla" o desempenho | `63,63 → 63 %` divergirá do mockup e parece punitivo |
| C. Exibir 1 decimal (`63,6 %`) | Sem ambiguidade | Ocupa espaço na coluna estreita da tabela; excesso de precisão para o contexto |

**Recomendação: A.** Impacto: o design precisa aceitar `56 %` onde o print mostra `55 %`. Decisão em `DP-009`.

### Mínimo de partidas (`minMatchesForRanking`)

Problema real: quem jogou **1 partida e venceu** aparece com 100 % à frente de quem fez 8/10.

| Alternativa | Comportamento |
|---|---|
| **A. `minMatchesForRanking = 0` (default, recomendado para o MVP)** | Todos ordenados junto. Simples, previsível, e em grupos de 5 amigos o problema se autocorrige em uma noite |
| B. `min = 3` | Quem tem menos de 3 jogos vai para o fim da lista, com `provisional: true`. Justo, mas exige explicação na UI |
| C. Ordenar por vitórias absolutas | Elimina o problema, mas penaliza quem joga pouco e vence sempre — e contradiz a coluna "%" destacada em negrito no mockup |

**Recomendação: A no MVP, com o campo já no schema** para virar B por configuração de liga sem migração. Quando `min > 0`, os jogadores abaixo do mínimo são ordenados **entre si** por vitórias e recebem `provisional: true` no contrato.

---

## 12.2 Ordenação e desempate

### Ordem canônica (RN-RANKING-002)

```sql
ORDER BY
  CASE WHEN matches_played >= :min_matches THEN 0 ELSE 1 END,  -- provisórios no fim
  win_rate      DESC,   -- 1º critério
  wins          DESC,   -- 2º
  losses        ASC,    -- 3º
  -- 4º critério: confronto direto (resolvido em memória, ver 12.2.1)
  joined_at     ASC,    -- 5º
  user_id       ASC     -- desempate final determinístico
```

| # | Critério | Por quê | Exemplo do dataset |
|---|---|---|---|
| 1 | `winRate DESC` | É a coluna em negrito do mockup (`[C]`) | Felipe 80,00 > Rodrigo 63,64 |
| 2 | `wins DESC` | Entre iguais em %, quem venceu mais jogou mais e provou mais | 6/10 e 3/5 empatam em 60 %; 6 vitórias vem antes |
| 3 | `losses ASC` | Consequência natural do critério 2 quando o % é igual | Felipe 3V/0D antes de Rodrigo 3V/1D no pódio de 14/07 |
| 4 | Confronto direto | Critério esportivo clássico: quem ganhou do outro fica na frente | — |
| 5 | `joinedAt ASC` | Quem está na liga há mais tempo | — |
| 6 | `userId ASC` | **Determinismo absoluto** — sem ele, dois rebuilds podem produzir ordens diferentes | — |

O critério 6 é `[R]` e não-negociável: sem tiebreaker total, `ORDER BY` com empate é não-determinístico no Postgres, e a posição do jogador mudaria a cada leitura sem nenhuma partida nova. Isso destruiria a confiança no ranking.

### 12.2.1 Confronto direto como desempate

Aplicado **apenas** quando 2..N jogadores empatam nos critérios 1–3.

```
Para o grupo empatado G:
  1. Filtrar partidas FINISHED da liga onde ambos os participantes ∈ G
  2. Somar vitórias de cada jogador nessas partidas
  3. Ordenar por vitórias no confronto interno (DESC)
  4. Empate persistente → cai para joinedAt
```

**Custo:** para um grupo de até ~10 empatados, é uma consulta sobre um índice já existente (`ix_match_participants_user_match`). Executado **só** quando há empate real. Se o grupo empatado tiver mais de 8 jogadores, o critério é **pulado** (`[R]`) e vai direto para `joinedAt` — a complexidade de mini-tabela não paga o benefício.

**Alternativa mais simples** para o MVP: pular o critério 4 inteiramente. Com 5 amigos, empate triplo em `winRate` **e** `wins` **e** `losses` é raro. Registrado em `DP-009` como sub-decisão; o campo `tiebreakerOrder` na liga permite ligar/desligar sem deploy.

---

## 12.3 Ranking da liga — materializado

**Decisão `[R]`: materializado em `league_ranking_entries`, atualizado na transação de finalização.**

| Alternativa | Latência de leitura | Consistência | Complexidade |
|---|---|---|---|
| **A. Materializado (escolhida)** | O(membros) — 5 linhas por índice | Forte: ao voltar da partida, o ranking já está certo | Precisa de rebuild determinístico e verificação de deriva |
| B. On-demand (`GROUP BY` em `match_participants`) | O(partidas da liga) | Sempre correta por construção | Simples, mas a Home + o ranking + a seleção de adversário agregariam a cada toque |
| C. View materializada com refresh periódico | Rápida | **Atrasada** — inaceitável: o usuário finaliza a partida e volta para um ranking velho | — |

O fator decisivo é o fluxo do mockup: **"Venceu" → modal com o pódio → "Próxima partida" → lista com N vitórias hoje**. Três leituras de ranking em 10 segundos, na pior conexão. Materializar é a única opção que entrega isso com latência previsível *e* consistência imediata.

### O que é atualizado na transação síncrona

```
BEGIN;
  UPDATE matches SET status='FINISHED', winner_side=:side, finished_at=:now, version=version+1
    WHERE id=:matchId AND version=:expectedVersion;             -- 0 linhas → 409
  UPDATE match_participants SET is_winner=(side=:side) WHERE match_id=:matchId;

  -- locks em ordem crescente de user_id (RN-CONC-003)
  SELECT * FROM league_ranking_entries
    WHERE league_id=:leagueId AND user_id IN (:u1,:u2) ORDER BY user_id FOR UPDATE;

  UPDATE league_ranking_entries SET wins=wins+1, win_rate=..., current_win_streak=current_win_streak+1,
         longest_win_streak=GREATEST(longest_win_streak, current_win_streak+1), last_match_at=:now, version=version+1
    WHERE league_id=:leagueId AND user_id=:winnerId;
  UPDATE league_ranking_entries SET losses=losses+1, win_rate=..., current_win_streak=0, version=version+1
    WHERE league_id=:leagueId AND user_id=:loserId;

  -- reposiciona a liga inteira (≤200 linhas)
  WITH ranked AS (SELECT id, ROW_NUMBER() OVER (ORDER BY <ordem canônica>) AS pos
                  FROM league_ranking_entries WHERE league_id=:leagueId)
  UPDATE league_ranking_entries e SET previous_position = e.position, position = r.pos
    FROM ranked r WHERE e.id = r.id AND (e.position IS DISTINCT FROM r.pos OR e.position IS NULL);

  -- pódio da jogatina (mesma lógica, ordem própria)
  UPDATE session_ranking_entries ...;

  UPDATE leagues SET matches_count=matches_count+1, last_activity_at=:now WHERE id=:leagueId;
  UPDATE play_sessions SET matches_count=matches_count+1 WHERE id=:sessionId;
  UPDATE users SET active_match_id=NULL WHERE id IN (:u1,:u2);

  INSERT INTO outbox_messages (event_type, payload, ...) VALUES ('MatchFinished', ...);
COMMIT;
```

**Custo medido esperado:** ~8 statements sobre ≤10 linhas. p95 alvo de `POST /finish` = **< 400 ms** (§16), com folga.

### O que fica assíncrono (outbox)

| Agregado | Por quê pode atrasar |
|---|---|
| `user_statistics` (KPIs da Home) | O usuário está na tela de pódio, não na Home. Atraso de 2 s é invisível |
| `user_daily_stats` (gráficos) | Idem |
| `head_to_head_stats` | Tela de h2h não é acessada durante a jogatina |
| Notificação ao adversário | Assíncrona por natureza |

Consistência eventual com alvo de **< 5 s** (p99). Se o usuário abrir a Home antes disso, vê o número anterior — aceitável, e o `ETag` garante refresh no próximo pull.

---

## 12.4 Pódio da jogatina

### Fórmula e ordenação

```
ORDER BY
  wins           DESC,   -- "4 vitórias" é o que o card mostra
  losses         ASC,
  win_rate_liga  DESC,   -- desempate importado do ranking da liga
  joined_at      ASC,
  user_id        ASC
```

**Por que `wins` e não `winRate`:** o card do mockup diz literalmente `🥇 Rodrigo — 4 vitórias` (`[C]`). Numa única noite, quem venceu mais é o campeão do dia — mesmo tendo jogado mais partidas. Usar percentual faria alguém com 1V/0D (100 %) ganhar de quem fez 4V/1D (80 %), o que ninguém aceitaria na mesa.

### Medalhas e empate (`DP-027`)

| Alternativa | Comportamento com Rodrigo 4V e Felipe 4V |
|---|---|
| **A. Medalhas compartilhadas (recomendada)** | Ambos `position: 1, medal: "GOLD"`; ninguém recebe 🥈; o próximo é `position: 3` |
| B. Desempate forçado | Aplica `losses ASC` e crava um 1º — pode ser injusto se ambos fizeram 4V/1D |
| C. Ordem alfabética | Arbitrário e indefensável na mesa |

**Recomendação: A** (padrão olímpico). O contrato já devolve `position` e `medal` separados, então a UI não precisa saber a regra.

### Pódio parcial vs. final (`INC-07`)

| Estado da jogatina | `isFinal` | Texto correto na UI |
|---|:--:|---|
| `IN_PROGRESS` | `false` | "Você **está** em 1º lugar" |
| `CLOSED` | `true` | "Você **ficou** em 1º lugar" |

O mockup exibe "ficou em 1º lugar" com a jogatina ainda aberta. O backend fornece `isFinal`; o texto é responsabilidade do app.

### Participantes sem partida

Quem foi adicionado à jogatina mas não jogou aparece com `wins: 0, losses: 0` no fim da lista — exatamente o `4º Anderson — 0 vitórias` do card (`[C]`, RN-SESSION-007).

---

## 12.5 Tratamento de partidas canceladas e em andamento

| Situação | Ranking da liga | Pódio da jogatina | Stats do usuário | H2H | `matchesCount` |
|---|:--:|:--:|:--:|:--:|:--:|
| `IN_PROGRESS` | ✖ | ✖ | ✖ | ✖ | ✖ |
| `FINISHED` (`ORIGINAL`) | ✔ | ✔ | ✔ | ✔ | ✔ |
| `FINISHED` (`CORRECTED`) | ✔ (com o novo vencedor) | ✔ | ✔ | ✔ | ✔ |
| `CANCELLED` | ✖ | ✖ | ✖ | ✖ | ✖ |

Todo agregado filtra `status = 'FINISHED'`. Eventos de partida cancelada **permanecem** no banco (RN-EVENT-009) mas não alimentam `ballsPocketedTotal`.

**Regra derivada `[R]`:** `matchesCount` da liga conta apenas `FINISHED` — é o que resolve `INC-02` (mockup mostrava 32; o coerente com o ranking é 25).

---

## 12.6 Reprocessamento após correção

### Estratégia: **rebuild completo determinístico**, não delta

| Alternativa | Risco |
|---|---|
| **A. Rebuild completo da liga (escolhida)** | Nenhum: recalcula tudo de `matches`, a fonte da verdade. Custo O(partidas da liga) — 25 linhas na Liga da Terça, ~5 mil na maior liga imaginável |
| B. Aplicar delta (`-1` no antigo vencedor, `+1` no novo) | Deriva silenciosa. Um delta perdido por falha de rede deixa o ranking permanentemente errado, sem detecção |

Streaks tornam B praticamente inviável: `currentWinStreak` depende da **ordem** das partidas. Corrigir a 3ª de 10 partidas exige reprocessar as 7 seguintes. Rebuild completo já faz isso de graça.

### Algoritmo

```
RebuildLeagueRanking(leagueId):
  BEGIN
    pg_advisory_xact_lock(hashtext('ranking:' || leagueId))     -- serializa rebuilds da liga

    zera wins/losses/streaks de todas as entries da liga (preserva position em previous_position)

    para cada partida FINISHED da liga, ORDER BY finished_at ASC, id ASC:
        para cada participante:
            se is_winner: wins++, current_streak++, longest = max(longest, current_streak)
            senão:        losses++, current_streak = 0
        registra last_match_at

    recalcula win_rate de cada entry
    recalcula position pela ordem canônica (§12.2)
    recalcula session_ranking_entries das jogatinas afetadas
    enfileira recomputação de user_statistics, user_daily_stats e head_to_head_stats dos envolvidos
    AuditLog(RANKING_REBUILT, {leagueId, sourceMatchId, positionChanges})
  COMMIT
```

**Determinismo:** a ordem `finished_at ASC, id ASC` é total. Dois rebuilds da mesma liga produzem **byte a byte** o mesmo resultado — propriedade testável (`TC-RANK-007`).

### Síncrono ou assíncrono

| Tamanho da liga | Modo | Resposta |
|---|---|---|
| ≤ 500 partidas finalizadas | **Síncrono**, na mesma transação da correção | `200 OK` com o ranking já atualizado |
| > 500 partidas | **Assíncrono** via outbox | `202 Accepted` com `rankingRebuild.jobId` e `statusUrl` |

O contrato de `POST /matches/{id}/corrections` documenta os dois; o cliente decide pelo campo `rankingRebuild.status` (`COMPLETED` vs `QUEUED`). No MVP, com ligas de amigos, praticamente todo rebuild será síncrono — o caminho assíncrono existe para não precisar de mudança de contrato depois.

### Escopo do reprocessamento

Uma correção afeta:

| Agregado | Escopo recalculado |
|---|---|
| `league_ranking_entries` | Toda a liga (posições de todos mudam potencialmente) |
| `session_ranking_entries` | Apenas a jogatina da partida corrigida |
| `user_statistics` | Somente os 2 (ou 4) participantes |
| `user_daily_stats` | Somente os dias afetados desses usuários |
| `head_to_head_stats` | Somente o par envolvido (global + por liga) |

### Notificação de mudança de posição `[R]`

Se o rebuild mudar a posição de alguém que **não** participou da partida corrigida, esse jogador recebe notificação `LEAGUE_UPDATES / RANKING_CHANGED`: "Sua posição na Liga da Terça mudou de 2º para 3º após a correção de um resultado." Sem isso, a mudança parece bug.

### Verificação de deriva `[R]`

Job diário (04:00 UTC) recalcula o ranking de uma **amostra** de ligas ativas em memória e compara com o materializado:

- Divergência encontrada → métrica `ranking_drift_detected_total`, alerta de severidade alta, `AuditLog`, e rebuild automático.
- Alvo: **zero** divergências. Qualquer ocorrência é incidente, não ruído.

---

## 12.7 Consistência transacional — o que é forte e o que é eventual

| Dado | Consistência | Justificativa |
|---|---|---|
| `matches`, `match_participants`, `match_events` | **Forte** | Fonte da verdade |
| `league_ranking_entries` | **Forte** (mesma transação) | O usuário volta para o ranking imediatamente após finalizar |
| `session_ranking_entries` | **Forte** | O modal de pódio abre na mesma ação |
| `leagues.matchesCount`, `lastActivityAt` | **Forte** | Baratos e visíveis na mesma tela |
| `user_statistics` | Eventual < 5 s | Home não é acessada durante a jogatina |
| `user_daily_stats` | Eventual < 5 s | Gráficos toleram atraso |
| `head_to_head_stats` | Eventual < 30 s | Tela raramente aberta durante a jogatina |
| `notifications` | Eventual < 10 s | — |
| `share_artifacts` (imagem) | Assíncrona por design | Render leva segundos |

**Garantia de não-perda:** todo agregado eventual é derivado de `matches` e possui job de recomputação. Nenhum número do produto existe **apenas** num agregado materializado.

---

## 12.8 Estatísticas do usuário

### KPIs da Home

| KPI do mockup | Campo | Fórmula |
|---|---|---|
| "Partidas jogadas — 47" | `matchesPlayed` | `COUNT(*)` de `match_participants` em partidas `FINISHED` |
| "Taxa de vitória — 62%" | `winRate` | `wins * 100.0 / matchesPlayed` = `29*100/47` = `61.70` → exibe **62 %** |
| "Vitórias consecutivas — 5" | `currentWinStreak` | Ver §12.8.1 |
| "Maiores derrotas — 2" | `longestLossStreak` | `DP-016b` — ver abaixo |

**Interpretação de "Maiores derrotas"** (`DP-016b`): o rótulo é ambíguo.

| Alternativa | Leitura | Avaliação |
|---|---|---|
| **A. Maior sequência de derrotas (recomendada)** | `longestLossStreak = 2` | Simétrica ao KPI vizinho ("Vitórias consecutivas"); é a leitura mais natural de dois cards lado a lado |
| B. Total de derrotas no período | Seria 18, não 2 | Incompatível com o valor exibido |
| C. Derrotas para o maior rival | Precisaria dizer contra quem | O card não tem espaço para isso |

**Recomendação: A**, com sugestão ao design de renomear para "**Maior sequência de derrotas**" — "Maiores derrotas" sugere derrotas por placar largo, conceito que não existe no produto (não há placar por bolas).

### 12.8.1 Sequência de vitórias (streak)

```
Ordenar todas as partidas FINISHED do jogador por finished_at ASC, id ASC
currentWinStreak = nº de vitórias consecutivas contando do FIM para trás, parando na 1ª derrota
longestWinStreak = maior janela de vitórias consecutivas em toda a série
```

| Decisão | Valor | Justificativa |
|---|---|---|
| Escopo do streak da **Home** | **Global** (todas as ligas) | É um KPI do jogador, não de uma liga (`DP-028`) |
| Escopo do streak do **ranking da liga** | **Por liga** | Contextualizado à tabela em que aparece |
| Partidas canceladas | Ignoradas — não quebram nem somam | Uma partida cancelada não "aconteceu" |
| Recálculo após correção | **Sempre recalculado do zero** (RN-RANKING-011) | Incrementar cegamente após correção produz streak impossível |
| Empate/abandono | Não existe empate no produto | Toda partida `FINISHED` tem vencedor |

### 12.8.2 Séries temporais dos gráficos

**Gráfico 1 — "Taxa de vitória — últimos 30 dias"**

```
Para cada dia D no intervalo [hoje-29, hoje] no fuso do USUÁRIO:
    acumulado_wins   = Σ wins   de user_daily_stats onde stat_date <= D
    acumulado_played = Σ played de user_daily_stats onde stat_date <= D
    value = acumulado_played = 0 ? null : ROUND(acumulado_wins*100.0/acumulado_played, 2)
```

**Decisão `[R]`: a linha é a taxa de vitória _acumulada_, não a taxa diária.** A curva do mockup é suave e ascendente (`90 → 26` em coordenadas SVG, ou seja, ~48 % → ~82 %). Taxa diária com 3–4 partidas por noite oscilaria entre 0 % e 100 % — um serrote ilegível. Taxa acumulada é o que produz a curva desenhada. `DP-031` registra a alternativa (taxa diária com média móvel de 7 dias) caso Produto queira sensibilidade maior.

Dias sem jogo: com `fillGaps=true` (default), repetem o último valor acumulado — a linha não tem buracos.

**Gráfico 2 — "Vitórias e derrotas por semana"**

```
Semanas ISO-8601 (segunda a domingo), no fuso do USUÁRIO
Últimas 4 semanas completas + a semana corrente parcial
Para cada semana: wins = Σ wins, losses = Σ losses de user_daily_stats
label = "Sem 1".."Sem 4" gerado pelo servidor
```

### 12.8.3 Timezone dos agrupamentos — regra crítica

| Agregado | Fuso usado | Por quê |
|---|---|---|
| `businessDate` da jogatina | **Fuso da liga** (`league_schedules.timezone`) | A noite pertence à liga, não a quem consulta |
| `user_daily_stats.stat_date` | **Fuso do usuário** (`users.timezone`) | "Meus últimos 30 dias" é do ponto de vista de quem olha |
| Gráficos e KPIs por período | **Fuso do usuário** | Idem |
| Filtro `period` do h2h | **Fuso do usuário** | Idem |
| Ranking da liga | Sem agrupamento temporal | `ALL_TIME` por default |

**Consequência inevitável:** uma partida finalizada às `2026-07-15T02:00:00Z` conta na jogatina de **14/07** (fuso da liga, `America/Sao_Paulo`) e no dia **14/07** das estatísticas de um jogador em SP — mas no dia **15/07** das estatísticas de um jogador que configurou `America/Manaus`? Não: `02:00Z` = `22:00` de 14/07 em Manaus (UTC-4). O caso divergente real seria um jogador em Lisboa (`03:00` de 15/07). **Isso é correto e intencional** — cada um vê seus dias no próprio calendário. Documentado para não ser tratado como bug.

Nunca usar: `CURRENT_DATE`, `DateTime.Today`, `CAST(finished_at AS date)`. O fuso é sempre explícito.

---

## 12.9 Head-to-head

### Agregado

```
myWins        = COUNT partidas FINISHED onde eu is_winner e o oponente participou
opponentWins  = COUNT partidas FINISHED onde ele is_winner e eu participei
totalMatches  = myWins + opponentWins
myWinRate     = totalMatches = 0 ? 0.00 : ROUND(myWins*100.0/totalMatches, 2)
```

Dataset canônico: `5/8 = 62.50` → a barra de progresso em **62 %** e o texto "62% de aproveitamento no confronto" (`[C]`).

### Filtros

| Filtro | Implementação |
|---|---|
| `leagueId` | `WHERE m.league_id = :leagueId`; materializado em `head_to_head_stats` (uma linha por par por liga) |
| `leagueId = null` ("Todas as ligas") | Linha materializada com `league_id IS NULL` |
| `period` (30/90 dias, tudo) | **Nunca materializado** — sempre agregação em `match_participants` com `finished_at >= :from` no fuso do usuário |

**Por que o período não é materializado:** manter linhas por (par × liga × janela deslizante) exigiria recalcular tudo diariamente. A agregação sob demanda percorre ~8 partidas com índice — irrelevante.

### Agrupamento por jogatina

A tela lista **dias**, não partidas (`[C]`):

```sql
SELECT ps.id, ps.business_date, ps.league_id, ps.venue_id,
       SUM(CASE WHEN mp_me.is_winner THEN 1 ELSE 0 END)  AS my_wins,
       SUM(CASE WHEN mp_opp.is_winner THEN 1 ELSE 0 END) AS opponent_wins
FROM matches m
JOIN match_participants mp_me  ON mp_me.match_id  = m.id AND mp_me.user_id  = :meId
JOIN match_participants mp_opp ON mp_opp.match_id = m.id AND mp_opp.user_id = :opponentId
JOIN play_sessions ps ON ps.id = m.play_session_id
WHERE m.status = 'FINISHED' AND m.finished_at >= :from
GROUP BY ps.id, ps.business_date, ps.league_id, ps.venue_id
ORDER BY ps.business_date DESC
```

`outcome` (`WIN`/`LOSS`/`DRAW`) é derivado no servidor para o app não comparar números (define a cor do badge).

---

## 12.10 Ranking global (`DP-016`)

**Não entra no MVP.** Nenhuma tela do mockup mostra ranking entre desconhecidos.

O problema não é técnico, é de significado: comparar 80 % numa liga de 5 amigos iniciantes com 65 % numa liga de 10 jogadores fortes não diz nada. Um ranking global honesto exige **rating relativo** (Elo/Glicko), que é outro produto.

| Alternativa | Avaliação |
|---|---|
| A. Não fazer (recomendada no MVP) | Zero custo, zero risco de ranking sem sentido |
| B. Ranking global por `winRate` com mínimo de partidas | Fácil, mas enganoso e potencialmente desmotivador |
| C. Elo/Glicko-2 | Estatisticamente correto e comparável entre grupos; exige explicar "rating" ao usuário e mudar o schema (`rating`, `ratingDeviation`, histórico) |

**Se um dia for feito, recomenda-se C**, como métrica **adicional** — nunca substituindo V/D/% por liga, que é o que o usuário entende.

---

## 12.11 Ranking em duplas (`DP-013`, pós-MVP)

Quando `gameMode = TEAM_2V2`:

| Regra | Definição |
|---|---|
| Ranking **individual** | Vitória credita **os dois** jogadores do lado vencedor (RN-RANKING-013). `wins`/`losses` continuam por pessoa |
| Ranking **de duplas** | Entidade nova `TeamRankingEntry` com chave `(leagueId, userAId, userBId)` e `userAId < userBId`. **Não** faz parte do MVP |
| Pódio da jogatina | Continua individual — o card mostra pessoas, não duplas |
| Head-to-head | Ambíguo em duplas ("eu venci você" quando eram parceiros?). Regra: h2h conta apenas partidas em que os dois estavam em **lados opostos** |
| Estatísticas pessoais | Contam normalmente |

Antes de habilitar duplas, Produto precisa responder: o ranking da liga passa a ser individual, de duplas, ou os dois em abas separadas? Sem essa resposta, `TEAM_2V2` fica rejeitado com `FEATURE_NOT_AVAILABLE`.

---

## 12.12 Verificação numérica completa do dataset canônico

Prova de que todos os números deste documento fecham entre si. É a base dos casos de teste `TC-RANK-*` e o critério objetivo de aceite do módulo.

**Regra de conferência usada:** numa liga, `Σ vitórias = Σ derrotas = nº de partidas finalizadas`, **desde que todos os participantes históricos sejam contados** — inclusive quem saiu. O dataset inclui, por isso, um ex-membro:

| Jogador | UUID | `status` |
|---|---|---|
| Ricardo Alves (`@ricardoalves`) | `88888888-8888-4888-8888-888888888888` | `LEFT` (saiu em 2026-05-20) |

### Jogatina de 14/07/2026 — 9 partidas

| Jogador | Partidas | V | D | Pódio |
|---|---:|---:|---:|---|
| Rodrigo | 4 | 4 | 0 | 🥇 1º |
| Felipe | 4 | 3 | 1 | 🥈 2º |
| João | 4 | 2 | 2 | 🥉 3º |
| Anderson | 6 | 0 | 6 | 4º |
| **Total** | **18** | **9** | **9** | |

✔ 18 participações ÷ 2 = **9 partidas** · ✔ Σ V = Σ D = 9 · ✔ pódio idêntico ao modal do mockup (4, 3, 2, 0 vitórias).

**Parcial após 8 partidas** (tela "Nova partida"): Rodrigo 3V/0D · Felipe 3V/1D · João 2V/1D · Anderson 0V/6D.
✔ "3 vitórias hoje" de Rodrigo confere com o print. Felipe (3) e João (2) divergem do print (4 e 1) — `INC-04`.

### Ranking da Liga da Terça — antes e depois

| Jogador | Antes (V/D) | Δ noite | Depois (V/D) | `winRate` | Exibido | Pos. |
|---|---|---|---|---:|---:|---|
| Felipe | 5 / 1 | +3 / +1 | **8 / 2** | 80,00 | 80 % | 1º → **1º** |
| Rodrigo | 3 / 4 | +4 / +0 | **7 / 4** | 63,64 | 64 % | 4º → **2º** |
| João | 3 / 2 | +2 / +2 | **5 / 4** | 55,56 | 56 % | 3º → **3º** |
| Marcos | 4 / 6 | — | **4 / 6** | 40,00 | 40 % | 5º → **4º** |
| Anderson | 3 / 1 | +0 / +6 | **3 / 7** | 30,00 | 30 % | **2º → 5º** |
| Ricardo (`LEFT`) | 0 / 4 | — | **0 / 4** | 0,00 | oculto | — |
| **Σ vitórias** | **18** | +9 | **27** | | | |
| **Σ derrotas** | **18** | +9 | **27** | | | |
| **Partidas da liga** | **18** | +9 | **27** | | | |

✔ Σ V = Σ D = nº de partidas nos dois estados · ✔ as cinco linhas visíveis reproduzem exatamente a tabela do mockup · ✔ ordenação pré-noite estritamente por `winRate` (83,33 · 75,00 · 60,00 · 42,86 · 40,00).

> **Ricardo aparece no ranking?** Com `includeInactive=true` (default), sim, com `isActive: false` — `DP-025`. O print do mockup tem 5 linhas, correspondendo a `includeInactive=false`.
>
> **`matchesCount = 27`**, não 32 como no card do mockup (`INC-02`). Definição adotada: **todas as partidas `FINISHED` da liga**, incluindo as 4 que envolveram o ex-membro. Recomendação em `DP-010`.

### Estatísticas globais de Rodrigo

| | Antes | Δ noite | Depois | Confere com |
|---|---:|---:|---:|---|
| Partidas | 43 | +4 | **47** | ✔ card "Partidas jogadas — 47" |
| Vitórias | 25 | +4 | **29** | |
| Derrotas | 18 | +0 | **18** | ✔ 29 + 18 = 47 |
| `winRate` | 58,14 | | **61,70** | ✔ half-up → **62 %** = card "Taxa de vitória — 62%" |
| `currentWinStreak` | 1 | +4 | **5** | ✔ card "Vitórias consecutivas — 5" |
| `longestWinStreak` | 7 | — | **7** | — |
| `longestLossStreak` | 2 | — | **2** | ✔ card "Maiores derrotas — 2" |

> O streak fecha porque Rodrigo **venceu as 4 partidas que jogou** na noite, emendando na vitória anterior (streak 1 → 5). Isso vale para o escopo **global** do streak (§12.8.1). Se Produto optar por streak **por liga**, o card exibiria **4** (as 4 vitórias na Liga da Terça) — impacto registrado em `DP-028`.

### Head-to-head Rodrigo × João

| Jogatina | Liga | Rodrigo | João |
|---|---|---:|---:|
| 2026-07-14 | Liga da Terça | 1 | 0 |
| 2026-07-07 | Liga da Terça | 2 | 1 |
| 2026-06-30 | Liga da Terça | 0 | 2 |
| 2026-06-23 | Ranking do Bar do Zé | 2 | 0 |
| **Total** | | **5** | **3** |

✔ `5/8 = 62,50 %` → barra de progresso em 62 % e texto "62% de aproveitamento no confronto" (`[C]`)
✔ Por liga: Liga da Terça **3 × 3** (6 partidas) · Ranking do Bar do Zé **2 × 0** (2 partidas) — conforme `byLeague` em [FRIEND-08](08b-endpoints-friendships.md#friend-08--head-to-head-agregado)
✔ `currentStreak = { holder: "ME", count: 1 }` · `longestStreak = { holder: "ME", count: 2 }`

### Resumo: os 6 números do mockup, todos fechando

| Elemento do mockup | Valor | Origem no dataset |
|---|---:|---|
| Home — "Partidas jogadas" | **47** | 43 antes + 4 na noite |
| Home — "Taxa de vitória" | **62 %** | `29/47 = 61,70` → half-up |
| Home — "Vitórias consecutivas" | **5** | 1 antes + 4 vitórias na noite |
| Home — "Maiores derrotas" | **2** | `longestLossStreak` |
| Ranking da liga | **8/2 · 7/4 · 5/4 · 4/6 · 3/7** | Σ V = Σ D = 27 com o ex-membro |
| Pódio da jogatina | **4 · 3 · 2 · 0** | Σ V = 9 = nº de partidas |
| H2H | **5 × 3 (62 %)** | Soma dos 4 dias de jogatina |
