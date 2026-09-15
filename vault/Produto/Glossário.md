---
tags: [produto, referência]
---
# Glossário

Vocabulário da resenha, e como cada termo aparece no código.

| Termo | O que é | No código |
| --- | --- | --- |
| **Vai quem ganha** | Quem vence continua na mesa e enfrenta o próximo | Implícito: `preferredPlayerA` já vem preenchido com o último vencedor em `AdminView.jsx:461` |
| **Dia de jogatina** | Uma noite de jogo, das 12h de um dia às 12h do seguinte | `gameDayKey()`, `gameDayRange()` em `src/utils/date.js` · [[Dia de Jogatina]] |
| **Lavada / 7x0** | Vencer sem o adversário encaçapar nenhuma bola do grupo dele | `washouts` em `specialRecordCounts()` ⚠️ [[AUD-03 Record lavador é fictício]] |
| **Trunfo** | Encaçapar a bola de castigo (1 ou 8) antes de limpar seu grupo — é falta | `reason: "trunfo"` no `ball_log`, `classifyPot()` em `src/domain/rules.js:200` |
| **Bola de castigo** | A bola que decide o jogo no fim (1 ou 8, depende do modo) | `penaltyBall` em `src/domain/rules.js` · [[Modos de Jogo]] |
| **Freguês** | Quem mais perdeu para o mesmo adversário | `h2hRecords().fregues` |
| **Carrasco** | Quem mais dominou um adversário específico | `h2hRecords().carrasco` |
| **Pé-quente / pé-frio** | Maior sequência de vitórias / de derrotas | `bestStreak` / `bestLosingStreak()` |
| **Lanterna** | Quem acumulou mais derrotas | `RecordsView.jsx:16` |
| **Maratonista** | Quem mais jogou num único dia | `marathonRecord()` ⚠️ [[AUD-04 Maratonista usa dia UTC]] |
| **Quebra** | A tacada inicial | `breaker_id` na tabela `matches`, `brk: true` na entrada do `ball_log` |
| **Encaçapei** | Produto irmão, linkado no rodapé (`public/encacapei-*.html`) | `src/App.jsx:312-320` |

## Vocabulário técnico

| Termo | Significado aqui |
| --- | --- |
| `ball_log` | Lista ordenada de eventos da partida: `{ n, ball, by, type, reason?, brk? }`. `type` é `"pot"` ou `"foul"` |
| `finished` | O conjunto de partidas que conta para as estatísticas: `status !== "live" && (winner_id \|\| winner_side)` — `src/App.jsx:39` |
| `live` | Partida em andamento, `status = 'live'`. Não entra em nenhuma conta |
| `winner_side` | `"a"` ou `"b"`. É o que vale em [[Duplas 2x2]], onde `winner_id` fica nulo |
| RLS | Row Level Security do Postgres — as regras de quem lê e escreve. Ver [[Segurança e RLS]] |

Relacionado: [[Home]] · [[Estatísticas e Ranking]]
