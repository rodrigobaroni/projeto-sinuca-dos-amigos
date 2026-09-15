---
tags: [auditoria, achado, domínio]
severidade: ALTO
status: corrigido
---
# AUD-03 — O record "lavador / 7x0" é fictício

> [!success] Corrigido em 2026-08-20
> `specialRecordCounts` (`src/domain/stats.js`) só conta lavada se `match.ball_log` **não** estiver vazio. Efeito medido em homologação: o record caiu de 140 lavadas fantasma para 0. Ainda não commitado. Ver [[2026-08-20 - Correções da auditoria de 20-08]].

**Severidade:** 🟠 ALTO · **Onde:** `src/domain/stats.js:216-217` · **Visível ao usuário:** sim, na tela Records

## O problema
```js
const loserPots = (match.ball_log || [])
  .filter((e) => e.by === loser && e.type !== "foul" && Number(e.ball) >= 2 && Number(e.ball) <= 15).length;
if (loserPots === 0 && counts[match.winner_id]) counts[match.winner_id].washouts += 1;
```

"Lavada" quer dizer *vencer sem o adversário encaçapar nenhuma bola do grupo dele*. O código traduz isso como `loserPots === 0`. Mas quando o `ball_log` está **vazio**, `loserPots` também é `0` — e a partida vira uma lavada sem que ninguém saiba como ela foi jogada.

Anotar as bolas é **opcional** por decisão de produto ([[Escopo]]). O caso "não sei o que aconteceu" está sendo lido como "sei que foi 7x0".

## Cenário concreto, com dados reais
Homologação, 406 partidas finalizadas, **335 (83%) com `ball_log` vazio**:

```
Record exibido hoje:                    Rodrigo Baroni — 140 lavadas
Contando só partidas com ball_log:      Rodrigo Baroni — 0 lavadas
```

**As 140 são fantasma.** O record no ar não tem nenhuma relação com a realidade — e como o líder tem 0 lavadas reais, o número correto hoje seria "ninguém ainda".

## Correção
Exigir que a partida tenha registro antes de julgar:
```js
const log = match.ball_log || [];
if (!log.length) return;                    // sem anotação, não dá pra afirmar nada
const loserPots = log.filter(/* ... */).length;
if (loserPots === 0 && counts[match.winner_id]) counts[match.winner_id].washouts += 1;
```

Teste de regressão sugerido:
```js
it("não conta lavada quando o ball_log está vazio", () => {
  const r = specialRecordCounts(players, [{ mode: "1x1", player_a: "a", player_b: "b", winner_id: "a", ball_log: [] }]);
  expect(r.find(x => x.id === "a").washouts).toBe(0);
});
```

Relacionado: [[Records]] · [[Banco de Homologação]] · [[Como Reproduzir os Achados]]
