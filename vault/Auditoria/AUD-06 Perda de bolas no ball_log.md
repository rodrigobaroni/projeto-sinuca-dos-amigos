---
tags: [auditoria, achado]
severidade: ALTO
status: parcial
---
# AUD-06 — Perda de bolas no `ball_log` (last-write-wins)

> [!success] Parcial em 2026-08-20
> `serialize()` em `LiveMatchPanel` (`AdminView.jsx`) impede escritas concorrentes de `ball_log` no **mesmo cliente** — resolve o duplo toque (item 1 da correção abaixo). **Não resolve** duas mesas anotando a mesma partida ao mesmo tempo: continua precisando da escrita atômica no banco (item 2, função SQL `append_ball`). Ficou de fora conscientemente. Ainda não commitado. Ver [[2026-08-20 - Correções da auditoria de 20-08]].

**Severidade:** 🟠 ALTO · **Onde:** `src/views/AdminView.jsx:729-732`, `src/services/supabaseRepository.js:64`

## O problema
Cada bola anotada reescreve a coluna inteira, a partir da cópia local:
```js
const entry = { n: log.length + 1, ball: String(ball), by, type, ... };
const nextLog = [...log, entry];
await persistMatch(liveMatch.id, { ball_log: nextLog });
```
`updateMatch` faz `update({ ball_log })` — sem merge, sem checagem de versão, sem `jsonb_set`.

Isso seria seguro se houvesse um único escritor. Mas o produto **explicitamente** suporta o contrário: o `schema.sql:111-114` documenta que o índice de partida única ao vivo foi removido *"porque hoje há mais de uma mesa"*, e a tabela foi publicada no realtime para que *"cada tela reflita o que acontece nas outras"*.

## Cenário concreto de falha
Dois aparelhos anotando a mesma partida (ou o mesmo admin com o app aberto no celular e no notebook):

```
log no banco: [bola 3]
Aparelho A lê log = [3]      Aparelho B lê log = [3]
A anota a 5 → escreve [3,5]
B anota a 7 → escreve [3,7]   ← a bola 5 sumiu
```

Variante no mesmo aparelho: dois toques rápidos antes do React re-renderizar leem o mesmo `log` e a segunda escrita apaga a primeira. Os botões de bola não têm nenhuma trava de "em voo".

O `ball_log` é a base de "mais bolas em sequência", "lavador" e do detalhe da partida — perder entradas corrompe silenciosamente esses números.

## Correção
Em ordem de esforço:

**1. Trava de UI (barata, resolve o duplo toque):** desabilitar os botões enquanto houver escrita em voo, com um `useState` de `saving`.

**2. Escrita atômica no banco (resolve o multi-mesa):** anexar via SQL em vez de sobrescrever, com uma função Postgres:
```sql
create or replace function append_ball(match_id uuid, entry jsonb)
returns void language sql as $$
  update matches set ball_log = ball_log || entry where id = match_id;
$$;
```
Chamada por `sb.rpc("append_ball", { match_id, entry })`. O `n` passa a ser derivado da posição no array em vez de calculado no cliente.

**3. Alternativa:** optimistic locking com `updated_at` — `update ... where id = ? and updated_at = ?` e recarregar se afetar 0 linhas.

O item 1 sozinho já cobre o caso mais frequente.

Relacionado: [[Partida ao Vivo]] · [[Serviços e Supabase]] · [[Tempo Real]]
