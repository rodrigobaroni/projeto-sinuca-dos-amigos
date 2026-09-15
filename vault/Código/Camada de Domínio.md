---
tags: [código, domínio]
---
# Camada de Domínio

`src/domain/` + `src/utils/`. Funções puras, sem React e sem rede. É a parte mais bem desenhada do projeto e a que mais merece cuidado.

## `match.js` — a abstração 1x1 / 2x2
45 linhas que escondem a dualidade do schema. Sempre que precisar saber *quem jogou* ou *quem ganhou*, use estas funções em vez de ler `winner_id` cru:

`matchMode` · `matchSides` · `matchPlayerIds` · `winnerSide` · `playerSide` · `playerWon` · `sideLabel` · `teamKey`

> [!success] `computeStats()` e `h2hRecords()` passaram a usar a abstração (2026-08-20)
> Antes liam `match.winner_id` diretamente e derivavam o perdedor com um ternário — se `winner_id` fosse nulo (partida finalizada só com `winner_side`), `player_a` levava uma derrota que não existiu. Agora as duas (e `specialRecordCounts()`) resolvem vencedor/perdedor via `singlesOutcome()`, que usa `winnerSide()` de `match.js` e devolve `null` quando não há vencedor definido. Ver [[AUD-10 Achados latentes e menores]] (L1).

## `stats.js` — os números
| Função | Entrega | Escopo |
| --- | --- | --- |
| `computeStats` | wins, losses, pct, curStreak, bestStreak, history | só 1x1 |
| `rankedFrom` | ordena por wins → pct → menos losses → nome | — |
| `computeDoublesStats` | ranking de duplas por `teamKey` | só 2x2 |
| `doublesPlayerStats` | rendimento por parceiro | só 2x2 |
| `h2hRecords` | clássico, freguês, carrasco | só 1x1 |
| `bestLosingStreak` | pé-frio | derivado de `history` |
| `ballRunRecord` | maior corrida de bolas seguidas | todas |
| `specialRecordCounts` | lavadas, trunfos, scratches, faltas | só 1x1 |
| `marathonRecord` | mais jogos num dia, por [[Dia de Jogatina]] | todas |
| `foulCounts` / `breakCounts` | faltas e quebras | todas |

## `rules.js` — os modos de jogo
Classe `GameRules` construída a partir de um objeto de configuração normalizado. `normalizeGameSettings()` é defensiva de verdade: valida o modo, escolhe a bola de castigo válida para o modo, garante que as duas cores do mata a mata sejam diferentes e ainda migra uma chave legada (`knockoutColor` → `knockoutColorA`). Bem escrita.

Ver [[Modos de Jogo]].

## `utils/date.js`
Ver [[Dia de Jogatina]] — a lógica de recorte 12h–12h vive aqui.

## Testes
28 testes em 4 arquivos, todos passando, e `npm run test` funciona. Cobrem `rules`, `stats`, `date` e `player`. Ver [[Testes]].

Relacionado: [[Estatísticas e Ranking]] · [[Mapa do Código]] · [[2026-08-20 - Correções da auditoria de 20-08]]
