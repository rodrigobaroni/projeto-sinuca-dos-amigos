---
tags: [auditoria, achado]
severidade: BAIXO
status: aberto
---
# AUD-10 — Achados latentes e menores

Coisas que **não** quebram com os dados de hoje, mas que o código ou o schema permitem. Registradas para não serem redescobertas.

> [!success] L1, L2, M1 e M5 corrigidos em 2026-08-20
> Ver detalhe em cada item abaixo e em [[2026-08-20 - Correções da auditoria de 20-08]]. Ainda não commitado.

## Latentes (o schema permite, os dados não exibem)

### L1 — Derrota fantasma quando falta `winner_id` ✅ corrigido
`computeStats` (`stats.js:17`) e `h2hRecords` (`stats.js:176`) derivam o perdedor lendo `winner_id` cru:
```js
const loser = match.winner_id === match.player_a ? match.player_b : match.player_a;
```
A constraint `matches_finished_has_winner` aceita uma partida **1x1** finalizada só com `winner_side`. Nesse caso `stats[null]` é `undefined` (ninguém ganha) e o `player_a` leva uma derrota que não existiu.
**Verificado em homologação: 0 ocorrências.**

> [!success] Corrigido em 2026-08-20
> Nova `singlesOutcome()` em `stats.js`, que resolve vencedor/perdedor via `winnerSide()` — trata `winner_id` **e** `winner_side`. Partida sem vencedor definido é ignorada (`return null`), em vez de gerar derrota fantasma para `player_a`. Aplicado em `computeStats`, `h2hRecords` e `specialRecordCounts`.

### L2 — Fronteira exata das 12:00 contada em dois dias ✅ corrigido
`matchesInRange` usa `>=` no início **e** `<=` no fim, e `gameDayRange(d).end === gameDayRange(d+1).start`. Uma partida às 12:00:00.000 entraria nos dois dias.
**Verificado: 0 ocorrências, soma por dia bate exatamente (406 = 406).**

> [!success] Corrigido em 2026-08-20
> `matchesInRange` (`utils/date.js`) passou a usar fim exclusivo (`<`).

### L3 — Dependência de fuso → promovido
Deixou de ser latente: a própria suíte falha sob outro `TZ`. Virou achado próprio em [[AUD-12 Dia de jogatina depende do fuso do navegador]].

### L4 — Nada é paginado 🚧 correção em andamento
`loadScoreboard()` faz `select("*")` sem `limit`. A API REST do Supabase aplica um teto de linhas; ao ultrapassá-lo o app **para de ver as partidas mais antigas sem erro nenhum** e todo o ranking histórico fica errado em silêncio. Hoje são 406 partidas. Ver [[Serviços e Supabase]].

> [!warning] Correção aprovada pelo Prumo — falta só o commit
> A correção introduziu um segundo achado (ordenação instável derrubando `curStreak`), corrigido e reconferido: **APROVADO SEM RESSALVAS**. Ver [[2026-09-16 - Paginacao e ordem deterministica das partidas]]. Assim que commitar, este item vira ✅ corrigido.

## Menores (visíveis, baixo impacto)

| # | Achado | Onde |
| --- | --- | --- |
| M1 ✅ | ~~`foulReasonText` sempre diz "bola 1 fora da hora", mesmo quando a bola de castigo é a 8~~ — corrigido em 2026-08-20: `foulReasonText(reason, ball)` agora recebe a bola da própria entrada do log em vez de um `defaultRules` fixo | `rules.js`, `components/sheets.jsx` — ver [[AUD-08 Configurações vivem no localStorage]] |
| M2 | Filtro de período da tela Records (`Geral` / `Jun/26`) é estático, não faz nada | `RecordsView.jsx:29-32` |
| M3 | `foulCounts` exclui faltas de `reason: "juiz"`; `specialRecordCounts().donated` inclui. Duas contagens divergentes do mesmo conceito | `stats.js:136` vs `stats.js:221` |
| M4 | Total de jogos 2x2 é `soma(total)/2` — com dados malformados exibe "1.5 jogos" | `RankingView.jsx:89` |
| M5 ✅ | ~~Handler de apagar partida duplicado literalmente, ~25 linhas~~ — corrigido em 2026-08-20: unificado numa função só (`deleteMatch`) | `App.jsx` |
| M6 | `DEFAULT_GAME_SETTINGS` definido em dois lugares com os mesmos valores | `rules.js:15` e `AdminView.jsx:11` |
| M7 | `monthLabel()` quebra com chave de mês inválida (`MONTHS[...]` é `undefined` e `.charAt` estoura) | `utils/date.js:57` |
| M8 | `dangerouslySetInnerHTML` nos ícones da nav — conteúdo estático hoje, padrão arriscado se virar dinâmico | `App.jsx:327` |
| M9 | `deleteMatch` não verifica linhas afetadas; exclusão bloqueada por RLS some da tela sem sumir do banco | `supabaseRepository.js:69` |
| M11 | `ball_log` não tem validação de forma no banco — qualquer JSON é aceito na coluna | `schema.sql:30` |
| M10 | Se o grupo só jogar duplas, "mais vitórias" mostra o primeiro nome alfabético com 0, sem indicar ausência de dados | `RecordsView.jsx:12` |

## Questão de regra, não bug
`isGroupCleared()` (`rules.js:191`) considera removida qualquer bola que apareça no log, **inclusive as que o adversário encaçapou por falta**. Na mesa a bola realmente saiu, então isso pode estar certo — mas é uma decisão de regra não documentada. Vale confirmar com a turma e escrever em `RulesView`.

Relacionado: [[Auditoria 2026-08-20]] · [[Camada de Domínio]]
