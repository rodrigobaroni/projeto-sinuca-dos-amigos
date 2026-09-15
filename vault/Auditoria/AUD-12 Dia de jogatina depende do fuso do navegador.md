---
tags: [auditoria, achado, domínio]
severidade: MÉDIO
status: corrigido
---
# AUD-12 — O dia de jogatina depende do fuso do navegador

> [!success] Corrigido em 2026-08-20
> `utils/date.js` reescrito para usar o fuso fixo do produto (`America/Sao_Paulo`) via `Intl.DateTimeFormat`, em vez de `getHours()`/`setDate()` do navegador. Uma string sem fuso passa a ser interpretada como horário do produto. Suíte verde em 5 fusos: `America/Sao_Paulo`, `UTC`, `Asia/Tokyo`, `Pacific/Kiritimati`, `America/Los_Angeles`. Ainda não commitado. Ver [[2026-08-20 - Correções da auditoria de 20-08]].

**Severidade:** 🟡 MÉDIO · **Onde:** `src/utils/date.js:31-42` · **Detectável pela própria suíte**

> Levantado pela revisão cruzada (Codex) e confirmado em execução.

## O problema
Todo o recorte do [[Dia de Jogatina]] usa métodos que operam no **fuso local de quem está olhando**:
```js
export function gameDayKey(ts) {
  const date = new Date(ts);
  if (date.getHours() < 12) date.setDate(date.getDate() - 1);   // ← getHours() = fuso do navegador
  return toDateInputValue(date);
}
```

O mesmo instante cai em noites diferentes conforme o fuso:
```
2026-06-25T14:30:00Z
  TZ=America/Sao_Paulo → 2026-06-24
  TZ=UTC               → 2026-06-25
  TZ=Asia/Tokyo        → 2026-06-25
```

O "dia de jogatina" é uma propriedade **do evento** — a noite em que a galera jogou naquele bar — não do observador. Deveria ser o mesmo para todo mundo.

## A própria suíte detecta
```bash
$ TZ=Asia/Tokyo npx vitest run --config vite.config.js src/utils/date.test.js
 Test Files  1 failed (1)
      Tests  2 failed | 1 passed (3)

- Expected      + Received
  [
+   "before",
    "inside",
  ]
  ❯ src/utils/date.test.js:22
```
Os testes passam apenas porque a máquina de quem os roda está no mesmo fuso do produto. Trocando o fuso, 2 de 3 quebram — o que mostra que o acoplamento é real, não teórico.

## Cenário concreto de falha
Um jogador viaja (ou só está com o relógio do celular em outro fuso) e abre o Ranking. As partidas da mesma noite aparecem distribuídas em dois "dias de jogatina" diferentes dos que a turma vê, e o painel do dia mostra um recorte que não corresponde a nenhuma jogatina real. Ninguém consegue reproduzir o problema no próprio aparelho.

## Correção
Fixar o fuso do produto em vez de herdar o do navegador:
```js
const TZ = "America/Sao_Paulo";
const partes = (ts) => new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
}).formatToParts(new Date(ts)).reduce((o, p) => (o[p.type] = p.value, o), {});

export function gameDayKey(ts) {
  const { year, month, day, hour } = partes(ts);
  if (Number(hour) < 12) { /* subtrai um dia sobre year-month-day */ }
  return `${year}-${month}-${day}`;
}
```
E rodar a suíte em CI sob pelo menos dois fusos (`TZ=UTC` e `TZ=America/Sao_Paulo`) para travar a regressão.

Relacionado: [[Dia de Jogatina]] · [[Testes]] · [[AUD-10 Achados latentes e menores]]
