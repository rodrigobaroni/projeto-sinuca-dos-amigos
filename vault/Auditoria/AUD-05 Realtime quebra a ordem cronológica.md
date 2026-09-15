---
tags: [auditoria, achado, domínio]
severidade: ALTO
status: corrigido
---
# AUD-05 — Realtime quebra a ordem cronológica

> [!success] Corrigido em 2026-08-20
> Novo `sortByPlayedAt()` em `utils/date.js`, aplicado no handler de realtime (`App.jsx`) e dentro de `computeStats`. `defaultGameDay` parou de assumir que o array está ordenado — agora pega o maior `played_at` do conjunto. Ainda não commitado. Ver [[2026-08-20 - Correções da auditoria de 20-08]].

**Severidade:** 🟠 ALTO · **Onde:** `src/App.jsx:126` · **Visível ao usuário:** sim

## O problema
A carga inicial vem ordenada:
```js
sb.from("matches").select("*").order("played_at", { ascending: true })
```

Mas o handler do [[Tempo Real|realtime]] anexa sempre no fim, sem reordenar:
```js
return [...items, newRow];   // src/App.jsx:126
```

E três lugares dependem dessa ordem sem nunca ordenar:

| Lugar | Como depende |
| --- | --- |
| `defaultGameDay()` (`utils/date.js:25`) | Lê `matches[matches.length - 1]` para escolher a noite exibida |
| `computeStats()` (`domain/stats.js:35`) | Constrói `history` na ordem do array e calcula streaks percorrendo ele |
| `MatchesView.jsx:9` | `finished.slice().reverse()` para listar do mais novo ao mais antigo |

(`PlayerView` é a exceção: ordena explicitamente por `played_at` e está imune.)

## Cenário concreto de falha
O campo **data e hora** do painel é editável (`AdminView.jsx:514`), então o admin pode lançar uma partida de uma noite anterior — é um caso de uso normal, "esqueci de registrar o jogo de sábado".

Quando ele faz isso, todos os clientes com o app aberto recebem a linha via realtime e ela entra no **fim** do array.

Reproduzido com os 406 registros de homologação:
```
dia de jogatina ANTES : 2026-07-27
dia de jogatina DEPOIS: 2026-06-23   ← o painel de todo mundo pula pra data errada

Impacto nas sequências:
  Andre Sindicú: curStreak 0 → 1
```

O painel "dia de jogatina" da tela de Ranking salta para uma data antiga, e a sequência atual de um jogador muda para um valor que a cronologia real não sustenta. Some com um F5 — o que torna o bug intermitente e difícil de diagnosticar.

## Correção
Ordenar na entrada, num lugar só. No handler do realtime:
```js
setMatches((items) => {
  const next = /* ... lógica atual ... */;
  return next.sort((a, b) => new Date(a.played_at) - new Date(b.played_at));
});
```

Mais robusto ainda: parar de depender da ordem do array e ordenar dentro de `computeStats` antes de montar o `history`, já que streak é um conceito cronológico e não deveria confiar em quem chamou.

Teste de regressão: passar as mesmas partidas embaralhadas e ordenadas para `computeStats` deve produzir `curStreak` e `bestStreak` idênticos.

Relacionado: [[Tempo Real]] · [[Estatísticas e Ranking]] · [[Dia de Jogatina]]
