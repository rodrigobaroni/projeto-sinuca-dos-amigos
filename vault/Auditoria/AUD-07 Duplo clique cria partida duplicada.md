---
tags: [auditoria, achado]
severidade: MÉDIO
status: corrigido
---
# AUD-07 — Duplo clique cria partida ao vivo duplicada

> [!success] Corrigido em 2026-08-20
> Trava de submissão (`starting` / `finishing`) em "Iniciar partida" (`StartMatchPanel`) e "Definir vencedor" (`SimpleLiveMatchPanel`), em `AdminView.jsx`. Reforço no banco (índice único de par ao vivo) não foi feito — a trava de UI já cobre o caso mais frequente. Ainda não commitado. Ver [[2026-08-20 - Correções da auditoria de 20-08]].

**Severidade:** 🟡 MÉDIO · **Onde:** `src/views/AdminView.jsx:529-558`

## O problema
```jsx
<button className="btn chalk" disabled={!valid || (mode === "2x2" && availablePlayers.length < 4)}
  onClick={async () => {
    const createdMatch = await repo.startMatch(match);   // ← sem trava
    setMatches((items) => [...items, createdMatch]);
    ...
  }}>Iniciar partida</button>
```

O `disabled` só considera a validade da seleção. Durante o `await`, o botão continua clicável. A proteção contra jogador já ocupado (`busyPlayerIds`, linha 457) é calculada na renderização — ainda não reflete a partida que está sendo criada.

E o banco não ajuda: o índice `matches_single_live_idx` foi **removido de propósito** para permitir várias mesas simultâneas ([[Partida ao Vivo]]). Não há nada impedindo duas linhas `live` com os mesmos dois jogadores.

## Cenário concreto de falha
Admin toca duas vezes em "Iniciar partida" (comum em celular, onde o feedback de toque demora):
1. Duas linhas `status='live'` são criadas com os mesmos `player_a` e `player_b`.
2. O painel passa a listar duas partidas ao vivo idênticas.
3. `onStarted(createdMatch.id)` roda duas vezes e o admin cai numa delas — a outra fica órfã.
4. A órfã só sai do caminho se alguém notar e cancelar manualmente. Enquanto isso, `busyPlayerIds` marca os dois jogadores como ocupados, **bloqueando o início de qualquer nova partida com eles**.

O mesmo padrão existe em `finishMatch()` (`AdminView.jsx:619`), que só fecha o overlay depois das chamadas de rede — dois toques geram duas escritas e dois registros de auditoria.

## Correção
Trava de submissão nos dois pontos:
```js
const [starting, setStarting] = useState(false);
// ...
onClick={async () => {
  if (starting) return;
  setStarting(true);
  try { /* ... */ } finally { setStarting(false); }
}}
disabled={starting || !valid || ...}
```

Reforço opcional no banco, se partidas ao vivo duplicadas nunca fizerem sentido para o mesmo par:
```sql
create unique index matches_live_pair_idx on matches (least(player_a,player_b), greatest(player_a,player_b))
  where status = 'live';
```

Relacionado: [[Partida ao Vivo]]
