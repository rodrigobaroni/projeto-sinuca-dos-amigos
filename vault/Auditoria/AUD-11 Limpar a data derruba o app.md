---
tags: [auditoria, achado]
severidade: ALTO
status: corrigido
---
# AUD-11 — Limpar o campo de data derruba o app inteiro

> [!success] Corrigido em 2026-08-20
> `gameDayRange("")` devolve `{ start: "", end: "" }` em vez de estourar `RangeError` (`utils/date.js`). E foi criado `src/components/ErrorBoundary.jsx`, montado na raiz em `main.jsx` — qualquer exceção futura de render vira mensagem, não tela branca. Ainda não commitado. Ver [[2026-08-20 - Correções da auditoria de 20-08]].

**Severidade:** 🟠 ALTO · **Onde:** `src/views/RankingView.jsx:20` + `:138`, `src/utils/date.js:37` · **Visível ao usuário:** sim, tela branca

> Achado levantado pela revisão cruzada (Codex) e confirmado em execução.

## O problema
A tela de Ranking tem um seletor de [[Dia de Jogatina]]:
```jsx
// RankingView.jsx:138
<input className="search no-margin" type="date" value={selectedDay}
       onChange={(event) => setSelectedDay(event.target.value)} />
```

Um `<input type="date">` emite **string vazia** quando o usuário limpa o campo — e todo navegador oferece como fazer isso (o "×" no Chrome, selecionar e apagar em qualquer um).

Esse valor vai direto para `gameDayRange`, durante a renderização:
```jsx
// RankingView.jsx:20
const { start: rangeStart, end: rangeEnd } = useMemo(() => gameDayRange(selectedDay), [selectedDay]);
```

E `gameDayRange` não valida a entrada:
```js
// utils/date.js:37
export function gameDayRange(dayValue) {
  const start = new Date(`${dayValue}T12:00:00`);   // "" → new Date("T12:00:00") → Invalid Date
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };  // → toISOString() estoura
}
```

Confirmado em execução:
```
gameDayRange("") -> RangeError: Invalid time value
```

## Cenário concreto de falha
1. Qualquer visitante — não precisa ser admin, a tela é pública — abre o Ranking.
2. Clica no campo "dia da jogatina" e limpa.
3. `selectedDay` vira `""`, o `useMemo` roda na renderização e lança `RangeError`.
4. **Não existe error boundary no projeto** (verificado: nenhum `componentDidCatch`, `ErrorBoundary` ou `getDerivedStateFromError` em `src/`).
5. React desmonta a árvore inteira. **Tela branca.** Só volta com F5.

## Detalhe revelador
`matchesInRange` — a função chamada logo **depois** — é defensiva e trata exatamente esse caso:
```js
if (!startValue || !endValue) return [];
```
A proteção existe, mas está um passo tarde demais: `gameDayRange` estoura antes de `matchesInRange` chegar a ser chamada.

## Correção
Guarda na origem, em `utils/date.js`:
```js
export function gameDayRange(dayValue) {
  const start = new Date(`${dayValue}T12:00:00`);
  if (!Number.isFinite(start.getTime())) return { start: "", end: "" };
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
}
```
Com isso `matchesInRange` recebe `""` e devolve `[]` — o painel do dia fica vazio em vez de derrubar o app.

Independente disso, vale **adicionar um error boundary** na raiz (`src/main.jsx`), para que qualquer exceção futura de renderização vire uma mensagem em vez de tela branca.

Teste de regressão:
```js
it("não estoura com dia vazio", () => {
  expect(() => gameDayRange("")).not.toThrow();
});
```

Relacionado: [[Dia de Jogatina]] · [[Camada de Views]] · [[Auditoria 2026-08-20]]
