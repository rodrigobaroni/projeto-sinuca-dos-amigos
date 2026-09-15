---
tags: [registro, sessão, revisão]
data: 2026-09-15
---
# 2026-09-15 — Mesas livres no formulário de partida

> [!success] APROVADO COM RESSALVAS pelo Prumo — ainda não commitado
> Reconferência final depois da correção dos dois bloqueios abaixo. `git status` no momento desta nota ainda mostra `src/domain/queue.js`, `src/domain/queue.test.js`, `src/views/AdminView.jsx` modificados sobre `HEAD 6fc6ad8` — falta o commit. Resta uma ressalva **baixa**, de cobertura de teste, que não impede o commit. Quando commitado, mover o registro pra `Registro/Commits/` e linkar aqui.

## O que a mudança faz

Estende a Tarefa 9 do plano de fila e mesas (`docs/superpowers/specs/2026-09-15-fila-e-mesas-plano.md`), que já dava ao `StartMatchPanel` a lista de `activeTables`. Duas funções novas em `src/domain/queue.js`:

- **`freeTables({ activeTables, liveMatches })`** (`src/domain/queue.js:64-70`) — mesas ativas que não têm partida ao vivo em cima agora. Partida ao vivo sem `table_id` (banco pré-migração 20260915) não ocupa mesa nenhuma, de propósito, para não esconder todas as mesas do formulário por causa de uma partida órfã.
- **`tableHolderSuggestion({ tableId, holders, availablePlayerIds, takenPlayerIds })`** (`src/domain/queue.js:72-83`) — quando o admin escolhe uma mesa manualmente, sugere o dono dela (vencedor da última partida ali) no campo "quem começa", pulando quem não está mais disponível ou já foi escalado noutro campo. É sugestão, não trava: sem candidato válido, o campo fica como estava.

Em `src/views/AdminView.jsx`: o `<select>` de mesa passa a listar só `availableTables` (não mais todas as `activeTables`); sem nenhuma mesa livre, o formulário mostra "Todas as mesas estão ocupadas com partida ao vivo" em vez de deixar montar uma partida que o botão nunca vai aceitar; e o `onChange` da mesa chama `tableHolderSuggestion` e preenche `playerA` quando há sugestão.

## Veredito inicial do Prumo — BLOQUEADO

| # | Achado | Onde | Cenário |
| --- | --- | --- | --- |
| 1 | Slots A2/B2 ocultos após trocar 2x2 → 1x1 podem suprimir a sugestão do dono da mesa | `src/views/AdminView.jsx:449` (`takenPlayerIds: [playerA2, playerB, playerB2].filter(Boolean)`); raiz em `src/views/AdminView.jsx:428` (`setMode("1x1")` não limpa `playerA2`/`playerB2`) | Admin monta uma dupla 2x2, troca pra 1x1 (campos somem da UI mas o estado continua com valor) e escolhe uma mesa: o dono sugerido pode ser descartado como "já escalado" por um `playerA2`/`playerB2` fantasma que não aparece mais na tela. |
| 2 | `valid` aceita `availableTables.length <= 1` antes do `useEffect` sincronizar `tableId` | `src/views/AdminView.jsx:408` (`availableTables.length <= 1 \|\| Boolean(tableId)`); efeito de sincronização depende de `availableTables` no array de dependências | Numa janela de Realtime em que outra mesa acaba de ficar ocupada (por outro cliente/admin) e `availableTables` cai para 1 antes do efeito rodar, o botão fica habilitado mesmo com `tableId` ainda vazio ou apontando pra mesa que acabou de ficar ocupada — o insert em `src/views/AdminView.jsx:506` (`...(tableId ? { table_id: tableId } : {})`) sai sem `table_id` ou com `table_id` de uma mesa já tomada. |

**Confirmado correto pelo Prumo** (sem achado):
- Guarda de "sujo"/prefill entre Mesa 1 e Mesa 2 preservada.
- Partida iniciada sem `table_id` corretamente não ocupa mesa nenhuma.
- `return` antecipado quando todas as mesas estão ocupadas está certo.

**Testes e build**: 118 testes e build verdes — o veredito era sobre correção de borda, não sobre regressão.

## Correções aplicadas

| Achado | Correção | Onde |
| --- | --- | --- |
| 1 (slots fantasma) | `takenPlayerIds` passou a derivar de `requiredSlots` (só os slots ativos no modo atual), em vez de citar `playerA2`/`playerB2` direto — resíduo de um 2x2 anterior some do cálculo assim que o modo muda pra 1x1 | `src/views/AdminView.jsx:459` (`requiredSlots.filter((slot) => slot !== "a").map((slot) => selections[slot]).filter(Boolean)`) |
| 2 (janela de Realtime) | `valid` trocou "contagem" por "conteúdo": exige que `tableId` esteja de fato em `availableTables` sempre que existe alguma mesa ativa, em vez de liberar o envio só porque `availableTables.length <= 1`. Fecha a janela entre o Realtime encolher `availableTables` e o `useEffect` resincronizar `tableId` — na pior hipótese o botão fica travado até o efeito rodar, nunca envia vazio ou pra mesa errada | `src/views/AdminView.jsx:415` (`activeTables.length === 0 \|\| availableTables.some((table) => table.id === tableId)`) |

## Reconferência final — APROVADO COM RESSALVAS

Prumo confirmou os dois bloqueios corrigidos e sem regressão em dirty/prefill/early-return.

> [!warning] Ressalva baixa — cobertura de teste
> O teste novo em `src/domain/queue.test.js` ("sugere o dono que só ocupa slot inativo do modo atual") passa `takenPlayerIds` **hardcoded** direto pro helper `tableHolderSuggestion` — testa o helper, não a derivação `requiredSlots.filter(...)` que roda de verdade no `onChange` do seletor de mesa (`AdminView.jsx:459`). Ou seja: a regressão 2x2→1x1 em si (o comportamento real do componente) não tem teste automatizado, só a peça que ela alimenta. O Prumo sugeriu teste de componente/harness pro `onChange`, ou extrair a derivação de `takenPlayerIds` como função pura testável isoladamente. Não bloqueia o commit — fica como pendência de qualidade.

**Testes e build**: 119 testes e build verdes (1 teste a mais que a rodada anterior, cobrindo o `tableHolderSuggestion` isolado).

## Próximo passo

Pronto pra commit. A ressalva de cobertura de teste pode virar um card de qualidade separado, se o Sumula/Rodrigo quiser tratá-la; não é bloqueante. Quando commitado, mover o registro pra `Registro/Commits/` e linkar aqui.

Relacionado: [[Partida ao Vivo]] · [[Diario de Trabalho]] · [[2026-09-15 - Pedido de mudança - grid no painel]]
