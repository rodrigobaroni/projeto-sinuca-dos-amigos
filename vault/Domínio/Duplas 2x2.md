---
tags: [domínio]
---
# Duplas 2x2

Adicionado depois da v1 pela migration `docs/migrations/20260728_add_doubles.sql`.

## Como a partida é representada
- `mode = '2x2'`
- `team_a` e `team_b`: arrays JSON com **2 uuids** cada
- `winner_side`: `'a'` ou `'b'` — em duplas o `winner_id` fica **nulo**
- `player_a` / `player_b` continuam preenchidos (são `NOT NULL`) com o primeiro jogador de cada lado

A constraint `matches_team_shape_check` garante no banco: dois arrays de tamanho 2, sem jogador repetido dentro do time nem entre os times.

## Camada de abstração
`src/domain/match.js` existe justamente para esconder essa dualidade:

| Função | O que resolve |
| --- | --- |
| `matchMode(match)` | `'2x2'` ou `'1x1'` |
| `matchSides(match)` | `{ a: [ids], b: [ids] }` — funciona nos dois modos |
| `winnerSide(match)` | Usa `winner_side`; se faltar, deduz de `winner_id` vs `player_a`/`player_b` |
| `playerWon(match, id)` | Combina os dois acima |
| `teamKey(ids)` | Chave estável da dupla: ids ordenados, juntos por `\|` |

## Estatísticas de dupla
`computeDoublesStats(players, matches)` agrupa por `teamKey` — a dupla é a entidade, não o jogador. Cada partida credita uma vitória para um time e uma derrota para o outro.

`doublesPlayerStats(players, matches, playerId)` inverte a visão: para um jogador, quais parceiros rendem mais. Usado no perfil.

> [!important] Duplas não afetam o ranking individual
> `computeStats()` filtra `mode === '1x1'`. Uma vitória em dupla não conta como vitória individual, não mexe em streak e não entra em "mais jogos". Isso é intencional, mas não está escrito em lugar nenhum do produto — vale explicitar na interface.

## Estado em homologação
Só **2 partidas 2x2** de 406. A feature está praticamente sem uso, o que significa que os caminhos de código de duplas estão pouco exercitados na prática.

## Pontos de atenção
- `RankingView.jsx:89` calcula o total de jogos 2x2 como `soma(team.total) / 2`. Se algum time for descartado por dados malformados, a soma fica ímpar e a tela mostra algo como "1.5 jogos".
- `doublesPlayerStats` ignora silenciosamente a partida se não achar um parceiro diferente do jogador — o que só acontece com dados que a constraint do banco já impede.
- `winnerSide()` deduz de `winner_id` quando `winner_side` falta. Como `player_a` é `NOT NULL`, essa dedução é segura hoje.

Relacionado: [[Modelo de Dados]] · [[Estatísticas e Ranking]]
