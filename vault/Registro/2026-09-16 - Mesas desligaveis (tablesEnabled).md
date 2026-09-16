---
tags: [registro, sessão, revisão]
data: 2026-09-16
---
# 2026-09-16 — Mesas desligáveis (`tablesEnabled`)

> [!success] APROVADO — reconferência final, ainda não commitado
> Revisão original contra `HEAD 705fdac` bloqueou por dois achados médios (abaixo); corrigidos e reconferidos. 168/168 testes, build e diff check verdes. Observação não bloqueante: os testes novos provam a semântica pura da recomposição, a fiação React (`composedQueue` em `AdminView`) foi validada empiricamente em tela, não por teste de componente.

## O que a mudança faz

Três peças no mesmo diff:

1. **`tablesEnabled`** (`src/domain/rules.js`, default `true`) — interruptor novo em `AdminSettings`. Desligado, as mesas continuam cadastradas no banco, mas somem da tela (seletor, rótulo na fila, cabeçalho de donos) e a noite vira **mesa única**: só uma partida ao vivo por vez. `AdminView.jsx:49-69` centraliza a leitura da flag (`tablesEnabled`, `defaultTableId`, `effectiveActiveTables`, `effectiveEntries`, `effectiveQueue`) — quem consome (`StartMatchPanel`, `QueuePanel`) recebe valores já derivados, nunca lê a flag crua. A partida continua gravando `table_id` com a **mesa padrão** (a primeira ativa) mesmo com a tela sem seletor — é o que mantém `tableHolders` funcionando e "quem ganha fica" não quebrar na noite mais simples. `StartMatchPanel` ganhou `oneMatchAtATime` (reintroduz a trava de uma partida por vez, agora por configuração, não por índice único no banco — esse continua removido) e `fallbackTableId` (a mesa padrão a gravar quando o seletor não existe).
2. **`playersToReenqueue`** (`src/domain/queue.js:127-136`) — quem volta pro fim da fila ao perder, menos quem o admin já marcou como tendo ido embora. Sem isso, o upsert de enfileirar limpa o `left_at` e a pessoa reaparece na fila sozinha, desfazendo em silêncio uma ação explícita do admin.
3. **`liveDayHeadToHead`** extraída de `AdminView.jsx` para `src/domain/dayScore.js` — placar do confronto da jogatina (quantas vitórias cada lado tem hoje), exibido como badge no card de partida ao vivo.

## Veredito inicial do Prumo — BLOQUEADO (dois achados médios)

### Achado 1 — mesas desligadas não desligam a alternância

**Onde**: `AdminView.jsx:58-61` (`effectiveEntries`) e `AdminView.jsx:93-101` (`tablesForData`/`validTableId`/`eligibleForTable`), na versão original do diff.

**O que estava errado**: `effectiveEntries`, com `tablesEnabled=false`, só limpava o campo `label` de cada entrada da fila — mantinha `suggestedTableIds`, que `buildQueue` calcula com base em `lastLossTableId` (a regra de alternância: depois de perder numa mesa, a sugestão pula essa mesa na rodada seguinte). Com as mesas desligadas, toda partida usa a mesma mesa padrão — inclusive a derrota mais recente. `eligibleForTable(defaultTableId, effectiveEntries)` filtrava por `suggestedTableIds.includes(defaultTableId)`, e quem acabava de perder ali tinha exatamente essa mesa excluída da própria sugestão. Resultado: com mesas desligadas, quem perde podia **nunca** ser auto-selecionado como próximo adversário via `autoPickPlayers`.

### Achado 2 — holders de mesa não padrão somem da fila ao desligar no meio da noite

**Onde**: `src/domain/queue.js:96-98` (`queueForDay`, exclui `Object.values(holders).flat()` — holders de **todas** as mesas) combinado com o antigo `effectiveQueue`, que não recompunha `entries`.

**O que estava errado**: `holders` não era filtrado pela flag de propósito (pra manter o cabeçalho de donos e a folha de presença coerentes). Mas `queue.entries` já vinha de `buildQueue`/`queueForDay` com **todo mundo que é dono de alguma mesa excluído da fila**, antes mesmo de chegar no efetivo. Se o admin desligasse `tablesEnabled` no meio da noite, quem era dono de uma mesa não-padrão simplesmente sumia da fila visível e não reaparecia.

## Correção aplicada

`AdminView.jsx:42-78` — a fila deixou de só "esconder mesa" e passou a ser **recomposta**: `composedQueue` chama `buildQueue({ tables: effectiveActiveTables, gameDay, matches, attendance })` direto, com `effectiveActiveTables` contendo só a mesa padrão quando `tablesEnabled` é falso. Isso resolve os dois achados de uma vez, porque os dois vinham do mesmo lugar (compor a fila olhando pra todas as mesas em vez de só a que continua existindo pra quem está desligado):

- `suggestedTableIds` de todo mundo passa a ser `[padrão]` (uma mesa só ativa desliga a alternância sozinha, sem caso especial); quem acabou de perder na padrão volta a ser elegível pra próxima partida.
- Só a mesa padrão tem dono — quem segurava outra mesa deixa de ser "holder" e volta pra fila.

Duas peças de apoio pra isso funcionar sem recalcular tudo do zero:
- **`useQueue` expõe `matches` cru** (`src/hooks/useQueue.js`) — `buildQueue` precisa do conjunto exato de partidas que a composição original usou. Reconstruir a partir de `liveMatches + finished` não serviria: `finished` (no `App`) exige vencedor (`winner_id`/`winner_side`), enquanto `buildQueue` só olha `status === "finished"` — uma partida finalizada sem vencedor mudaria quem é dono de mesa entre as duas composições.
- **`showTableField`/`showTables`** (props novas em `StartMatchPanel` e `QueuePanel`) separam domínio de apresentação: a lógica de quais mesas existem já está correta em `effectiveActiveTables`/`composedQueue`; essas props só decidem se o seletor/cabeçalho aparecem na tela.

**Edge case aceito, não corrigido**: uma partida que rolou numa mesa não-padrão **antes** de a flag ser desligada não pré-seleciona mesa nem sugere o lado B quando termina — a mesa dela não está mais em `effectiveActiveTables`. O admin escolhe o lado B manualmente essa vez; as próximas partidas, já gravadas na mesa padrão, voltam a ter prefill automático. Decisão de produto aceita pelo Rodrigo: é uma transição única no momento em que a flag muda, não um estado permanente.

## Ressalva baixa — teste de madrugada em `dayScore` não testa madrugada

`src/domain/dayScore.test.js`, teste "trata a madrugada como a mesma noite": usa `played_at` às `01Z`/`02Z`, que em `America/Sao_Paulo` (UTC-3) são **22h/23h do dia anterior** — noite, não madrugada. O teste acaba duplicando o cenário "mesma jogatina" já coberto noutro teste, sem exercitar de fato uma partida depois da meia-noite local (precisaria de algo como `05Z`, que vira `02h` em SP). Não bloqueia — a lógica de dia de jogatina em si já está validada em [[AUD-12 Dia de jogatina depende do fuso do navegador]]; é só o dado do teste que não testa o que o nome promete.

## Aprovado sem ressalva (rodada inicial)

- `playersToReenqueue` e a integração em `useQueue.enqueuePlayers`.
- Extração de `liveDayHeadToHead` para `domain/dayScore.js` e o badge de placar no card ao vivo.
- `oneMatchAtATime` / `fallbackTableId` em si (a trava de uma partida por vez com mesas desligadas, e a gravação da mesa padrão no `table_id`).

## Reconferência final — APROVADO

5 testes novos em `src/domain/queue.test.js:499-540` travam a semântica pura da recomposição: o achado 1 antes/depois (`:499`, `:505`), o rótulo vazio sem mapa manual (`:511`), o achado 2 antes/depois (`:521`, `:533`). O Prumo registrou como observação **não bloqueante** que esses testes provam a função `buildQueue` isolada — a fiação em React (`composedQueue`, o `useMemo` em `AdminView`, o encaminhamento de `showTableField`/`showTables`) foi validada empiricamente em tela, sem teste de componente/harness cobrindo essa integração.

**Testes e build**: 168/168 testes, build e diff check verdes.

## Próximo passo

Falta só o commit. Quando sair, atualizar esta nota com o sha e criar o registro em `Registro/Commits/`.

Relacionado: [[Partida ao Vivo]] · [[AUD-12 Dia de jogatina depende do fuso do navegador]] · [[2026-09-16 - Horario congelado no formulario de partida]] · [[Diario de Trabalho]]
