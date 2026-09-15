---
tags: [domínio]
---
# Estatísticas e Ranking

Tudo é derivado em memória a partir das partidas. Nenhum número é persistido. `src/domain/stats.js`.

## O portão de entrada
Antes de qualquer conta, `src/App.jsx:39` define o conjunto válido:
```js
const finished = matches.filter((m) => m.status !== "live" && (m.winner_id || m.winner_side));
```
Partida ao vivo não entra. Partida sem vencedor não entra.

## `computeStats(players, matches)`
Monta um mapa `id → stat` para **todos** os jogadores (inclusive quem nunca jogou, que fica zerado).

> [!important] Só conta 1x1
> `matches.filter((m) => matchMode(m) === "1x1")`. Partidas de [[Duplas 2x2]] **não entram** em vitórias, derrotas, aproveitamento nem sequências individuais. Duplas têm ranking próprio.

Campos produzidos:

| Campo | Cálculo |
| --- | --- |
| `wins` / `losses` / `total` | Contagem direta, vencedor/perdedor resolvidos por `singlesOutcome()` (usa `winnerSide`, trata `winner_id` e `winner_side`) |
| `pct` | `Math.round(wins / total * 100)`, ou `0` se nunca jogou |
| `history` | Lista `{ match, won }`, montada a partir das partidas já ordenadas por `sortByPlayedAt()` |
| `curStreak` | Vitórias consecutivas no fim do `history` |
| `bestStreak` | Maior corrida de vitórias em todo o `history` |

> [!success] Ordenação e resolução de vencedor corrigidas em 2026-08-20
> Antes, `history` era preenchido na ordem recebida do array (sem reordenar), e o perdedor era lido de `match.winner_id` cru — uma partida sem `winner_id` (finalizada só com `winner_side`) gerava derrota fantasma para `player_a`. Agora `computeStats` roda `sortByPlayedAt()` antes de montar o `history`, e usa `singlesOutcome()` para resolver vencedor/perdedor; partida sem vencedor definido é ignorada. Ver [[AUD-05 Realtime quebra a ordem cronológica]] e [[AUD-10 Achados latentes e menores]] (L1).

## `rankedFrom(stats)`
Critérios de desempate, em ordem:
1. Mais vitórias
2. Maior aproveitamento (`pct`)
3. **Menos** derrotas
4. Nome (alfabético)

## Ranking do dia
`RankingView.jsx` recalcula tudo para a janela do [[Dia de Jogatina]] selecionado — `computeStats(players, periodSingles)` — em vez de filtrar o ranking geral. Está correto: sequências dentro de uma noite são sequências daquela noite.

## Confronto direto (H2H)
`h2hRecords(players, matches)` agrupa por par ordenado de ids e produz "clássico da resenha" (par que mais se enfrentou), "freguês" e "carrasco".

## Estado atual em homologação
```
1. Rodrigo Baroni   173V/94D (65%)  seq atual 0, melhor 13
2. Felipe Kchevi    112V/91D (55%)  seq atual 10, melhor 10
3. Anderson Kchevi   43V/56D (43%)  seq atual 1,  melhor 6
4. Andre Sindicú     41V/78D (34%)  seq atual 0,  melhor 5
5. Vinicius M        13V/28D (32%)  seq atual 0,  melhor 2
```
Esses números conferem — o ranking principal **não** está afetado pelos bugs. O que está errado são os [[Records]].

Relacionado: [[Records]] · [[Duplas 2x2]] · [[Camada de Domínio]]
