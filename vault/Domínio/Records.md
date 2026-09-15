---
tags: [domínio]
---
# Records

A tela `RecordsView.jsx` monta dois blocos: **hall da fama** e **hall da vergonha**.

> [!success] Lavador e maratonista corrigidos em 2026-08-20
> Os dois records abaixo estavam errados desde sempre; ambos foram corrigidos nesta sessão. Ver [[2026-08-20 - Correções da auditoria de 20-08]].

## Hall da fama
| Record | Fonte | Estado |
| --- | --- | --- |
| mais vitórias | `rankedFrom(stats)[0]` | ✅ |
| pé-quente (maior sequência de vitórias) | `bestStreak` | ✅ (ordem cronológica garantida por `sortByPlayedAt`, ver [[AUD-05 Realtime quebra a ordem cronológica]]) |
| clássico da resenha | `h2hRecords().classic` | ✅ |
| melhor aproveitamento (3+ jogos) | `values.filter(t => t.total >= 3)` | ✅ |
| mais jogos | `total` | ✅ (só 1x1) |

## Hall da vergonha
| Record | Fonte | Estado |
| --- | --- | --- |
| pé-frio | `bestLosingStreak()` | ✅ (mesma correção de ordem) |
| lanterna | mais derrotas | ✅ |
| freguês | `h2hRecords().fregues` | ✅ |
| carrasco | `h2hRecords().carrasco` | ✅ |
| **lavador / 7x0** | `specialRecordCounts().washouts` | ✅ corrigido em 20/08 |
| **maratonista** | `marathonRecord()` | ✅ corrigido em 20/08 |

## ✅ Lavador / 7x0 (corrigido)
`src/domain/stats.js`:
```js
if (log.length) {
  const loserPots = log.filter((entry) => entry.by === loser && entry.type !== "foul" && Number(entry.ball) >= 2 && Number(entry.ball) <= 15).length;
  if (loserPots === 0 && counts[winner]) counts[winner].washouts += 1;
}
```
Antes, partida sem `ball_log` tinha `loserPots === 0` e virava lavada. Como a anotação de bolas é **opcional** por [[Escopo|decisão de produto]], isso atingia a maioria das partidas — agora a checagem `if (log.length)` trata "sem anotação" como "não sei", não como "7x0".

Medido em homologação:
```
Antes:   Rodrigo Baroni — 140 lavadas (todas fantasma)
Depois:  Rodrigo Baroni — 0 lavadas
```
Ver [[AUD-03 Record lavador é fictício]].

## ✅ Maratonista (corrigido)
`src/domain/stats.js` agrupa agora pelo [[Dia de Jogatina]] (`gameDayKey`), em vez de dia UTC:
```js
const day = gameDayKey(match.played_at);
```
No fuso do Brasil, toda partida a partir das 21h local caía no dia UTC seguinte, partindo a mesma noite em dois.

Medido em homologação:
```
Antes:   Felipe Kchevi — 25 partidas
Depois:  Rodrigo Baroni — 40 partidas (noite de 2026-06-23) — correto
```
11 das 14 noites de jogatina caíam em dois dias UTC diferentes. Ver [[AUD-04 Maratonista usa dia UTC]].

## Inconsistências menores que continuam abertas
- `marathonRecord` conta partidas 1x1 **e** 2x2; "mais jogos" conta só 1x1. Dois recordes de "quantidade de jogos" com regras diferentes.
- `foulCounts()` ignora faltas com `reason === "juiz"`; `specialRecordCounts().donated` conta todas. Duas contagens de falta divergentes (M3 em [[AUD-10 Achados latentes e menores]]).
- O filtro de período no topo da tela (`Geral` / `Jun/26`) é **estático** — `RecordsView.jsx:29-32` são spans fixos, não fazem nada (M2).
- Se o grupo só jogasse duplas, `mostWins` seria o primeiro nome em ordem alfabética com 0 vitórias, sem indicação de que não há dados (M10).

Relacionado: [[Estatísticas e Ranking]] · [[Auditoria 2026-08-20]] · [[2026-08-20 - Correções da auditoria de 20-08]]
