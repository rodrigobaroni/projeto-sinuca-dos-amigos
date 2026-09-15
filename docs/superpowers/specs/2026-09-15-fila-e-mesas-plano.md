# Plano de implementação — Fila da noite e mesas nomeadas

Spec: `2026-09-15-fila-e-mesas-design.md`
Migração: `docs/migrations/20260915_add_queue_and_tables.sql` (rodada em HML)

Plano do arquiteto, com as emendas da revisão do tech lead marcadas **[emenda]**.

## Leituras adotadas onde a spec era ambígua

| Ponto | Escolha |
|---|---|
| "aba Fila" nas configurações | Uma segunda `settings-section` dentro de Configurações, não uma aba nova no `admin-tabs`. Virar aba depois é barato. |
| "a mais recente" em `mesaOndePerdeu` | `ended_at ?? played_at`. Com mesas em paralelo, quem começou antes pode terminar depois. |
| "adicionar e remover" mesas | Delete real, com `ConfirmDialog` avisando que as partidas daquela mesa ficam sem mesa (`on delete set null`). Desativar fica ao lado como caminho seguro. |
| Nomes das funções | Inglês, como o resto do código (`upsertMatch`, `computeStats`). |

---

## Tarefa 0 — Rodar a migração em produção **[emenda]**

Era a tarefa 13 do plano original. Foi promovida a primeira.

A migração só **acrescenta** duas tabelas e uma coluna anulável — é compatível
com o código que já está no ar. Rodar agora não quebra nada e fecha a janela de
risco inteira em vez de administrá-la por doze tarefas.

Rodrigo cola o SQL no SQL Editor do Supabase de produção. Verificar depois:
`pool_tables` com as duas mesas semeadas, `attendance` vazia, `matches.table_id`
existindo, e as duas tabelas em `Database → Replication`.

As defesas das Tarefas 4, 7 e 9 continuam valendo mesmo assim — protegem quem
clonar o repo, o ambiente de alguém que não rodou, e qualquer banco futuro.

## Tarefa 1 — `schema.sql` recebe as tabelas novas

`docs/HOMOLOGACAO.md` manda rodar `schema.sql` para montar banco do zero, e ele
não conhece as tabelas novas. Precedente: a migração 2x2 foi dobrada lá dentro.

Copiar tudo da migração no estilo do `schema.sql` (sem `begin/commit`, tudo
`if not exists`). **Verificação:** rodar o `schema.sql` inteiro em HML; sucesso
= sem erro e `select count(*) from pool_tables` continua 2.

## Tarefa 2 — Generalizar os helpers de lista por id

`src/domain/collection.js` + teste. Extrair de `match.js`:

```js
export function upsertBy(items, row, { key = "id", sort } = {})
export function addIfAbsentBy(items, row, { key = "id", sort } = {})
export function removeBy(items, id, { key = "id" } = {})
```

`dedupeById` vira `dedupeBy`, **preservando o comentário da política de
desempate** (última ocorrência vence). `upsertMatch`/`addMatchIfAbsent` viram
one-liners sobre os genéricos.

**Verificação:** `npm test` verde **sem editar uma linha de `match.test.js`** —
é o que prova que a extração é mecânica.

**[emenda] Commit próprio**, separado da feature, para `git bisect` isolar.

## Tarefa 3 — Domínio puro da fila

`src/domain/queue.js` + teste.

| Spec | Função |
|---|---|
| `donoDaMesa` **[emenda]** | `tableHolders({ tables, gameDay, matches, attendance })` → `{ [tableId]: playerId[] }` |
| `fila` | `queueForDay({ gameDay, attendance, liveMatches, holders })` |
| `mesaOndePerdeu` | `lastLossTableId({ playerId, gameDay, finishedMatches })` |
| `mesasSugeridas` | `suggestedTableIds({ activeTables, lastLossTableId })` |
| `proximoDaMesa` | `nextForTable(tableId, entries)` / `eligibleForTable(tableId, entries)` |
| rótulo | `tableSuggestionLabel({ activeTables, suggestedTableIds })` (`""` = sem rótulo) |
| composição | `buildQueue({ ... })` → `{ holders, entries }` |

Detalhes obrigatórios:

- `queueForDay` ordena por `enqueued_at` **com desempate por `id`** — sem isso
  dois perdedores de um 2x2 carimbados no mesmo milissegundo ficam em ordem
  indefinida entre renders.
- `lastLossTableId` usa `playerSide` + `winnerSide` de `match.js` (funciona no
  2x2, onde a derrota é do lado e `winner_id` é nulo) e ordena por
  `ended_at ?? played_at`.
- `suggestedTableIds`: se a mesa da derrota não estiver entre as ativas (mesa
  desativada ou apagada), a subtração não remove nada e o resultado é "todas" —
  correto e automático.
- `tableSuggestionLabel` **nesta ordem**: uma mesa ativa → `""`; todas
  elegíveis → `qualquer`; uma → o nome; resto → `qualquer menos X`.
- **[emenda]** `tableHolders`: por mesa, se há partida ao vivo → sem dono; senão
  o lado vencedor da partida finalizada mais recente da noite naquela mesa,
  filtrando quem tem `left_at` e quem está em partida ao vivo em outra mesa.

**Verificação:** os 22 testes da lista do arquiteto **mais os 7 de
`tableHolders`** que a spec passou a exigir.

## Tarefa 4 — Repositório

`src/services/supabaseRepository.js`: `loadQueue(gameDay)`, `enqueuePlayer`,
`markDeparture`, `addPoolTable`, `updatePoolTable`, `deletePoolTable`,
`onPoolTablesChange`, `onAttendanceChange`.

**`loadQueue` separado do `loadScoreboard`**, porque `loadScoreboard` roda para
todo visitante e usa `throw playersError || matchesError` — uma query em
`pool_tables` ali derrubaria o ranking público inteiro num banco sem migração.
Fila é feature de admin; não pode ser ponto único de falha do app público.

**`loadQueue` não lança.** Em erro devolve `{ tables: [], attendance: [],
available: false }`, seguindo o precedente do `match_clips` no próprio
`loadScoreboard`.

**`enqueuePlayer` é um primitivo só** para chegou / voltou / perdeu e volta:
upsert com `onConflict: "game_day,player_id"` e `left_at: null`. `arrived_at`
fica **fora do payload** de propósito — o PostgREST só atualiza colunas
presentes, então o `arrived_at` original é preservado no conflito.

`enqueued_at` é carimbado no cliente (única forma de expressar
`set enqueued_at = now()` via PostgREST sem função RPC, que exigiria uma segunda
migração em dois bancos). Custo: relógios dessincronizados podem inverter duas
posições por alguns segundos. Aceito, documentado junto do AUD-06.

`attendance` só da noite atual (`.eq("game_day", gameDay)`, batendo com o
índice). **Consequência obrigatória:** o handler de realtime precisa descartar
eventos de outro `game_day`, senão injeta linhas que a query nunca traria.

Realtime: dois canais, espelhando `onMatchesChange`.

## Tarefa 5 — Estado da fila no App

`src/hooks/useQueue.js` (diretório novo — ponto mais sujeito a veto; o hook é
autocontido e barato de reverter), `src/App.jsx`, `src/views/AdminView.jsx`.

Motivo de não pôr no `App.jsx`: ~120 linhas entre estado, dois efeitos de
realtime, um de carga e cinco ações; e o `AdminView` já recebe 25 props. Com o
hook, `App.jsx` cresce duas linhas e `AdminView` ganha **uma** prop. Nenhum
estado existente muda de lugar.

Cada ação de escrita aplica a resposta HTTP com **`addIfAbsentBy`**, nunca
`upsertBy` — é o bug corrigido em `addMatchIfAbsent`: a resposta do insert pode
chegar depois do evento do WebSocket e voltaria a lista para uma versão velha.
`updateTable` é exceção legítima (devolve a linha nova, não há lacuna).

Sem patch otimista nas escritas da fila: são operações raras contra um banco na
mesma região, e evita reimplementar a máquina de reversão do `persistMatch`.

## Tarefa 6 — Extrair configurações do `AdminView.jsx`

`src/views/AdminSettings.jsx` + `src/services/gameSettingsStorage.js`.

Mover `AdminSettings`, `settingLabel`, `settingValueLabel` e
`KnockoutColorPicker`; e `GAME_SETTINGS_KEY`/`loadGameSettings` para `services/`
(não `domain/rules.js`, que é puro e testado sem `window`).

Fica onde está, de propósito: `LiveMatchPanel`, `SimpleLiveMatchPanel`,
`LivePlayerColumn`, `StartMatchPanel`, `PlayerAdmin`, `AdminLogs`.

**[emenda] Commit próprio**, separado da feature.

**Verificação manual em `dev:hml`:** trocar modelo de jogo para Lisas e
Listradas, ver o prompt de bola de castigo, escolher, recarregar e conferir que
persistiu; ligar/desligar "Gerenciar partidas em uma tela".

## Tarefa 7 — Seção "fila" nas configurações

`rules.js`, `AdminSettings.jsx`, `src/components/TablesAdmin.jsx`, `styles.css`.

Em `DEFAULT_SETTINGS`:
- `autoPickPlayers: true` — o pré-preenchimento do jogador A já é o
  comportamento de hoje; `false` seria regressão silenciosa.
- `showQueuePanel: false` — opt-in. Vira `true` num commit separado depois, se
  o Rodrigo quiser; recomendação é ligar pelo interruptor na primeira noite,
  para poder desligar num toque se algo estiver errado.

`rules.test.js` usa `toBe` em chaves individuais, **não** igualdade estrita do
objeto — verificado; acrescentar chaves não quebra teste. **[emenda: ponto que
o plano deixou em aberto, conferido e resolvido]**

`TablesAdmin` reaproveita a interação do `PlayerAdmin` (input + adicionar, edição
inline com Enter/Escape), mais `.switch` de ativa e "Remover" via `requestConfirm`
com a mensagem **"As partidas jogadas nessa mesa ficam sem mesa registrada."**

Nome duplicado é barrado pelo índice único do banco: capturar e mostrar
"Já existe uma mesa com esse nome", como `updatePlayer` faz.

Auditoria: `table_created`, `table_updated`, `table_deleted`. **Não auditar
presença** — dezenas de eventos por noite afogariam a aba Logs e a fila já está
visível na tela.

## Tarefa 8 — Bloco da fila no painel

`src/components/QueuePanel.jsx`, `AdminView.jsx`, `styles.css`.

Acima do `StartMatchPanel`, abaixo dos cards ao vivo, quando `showQueuePanel`.

**[emenda]** Cabeçalho de mesas com o dono de cada uma (`segurando` / `em jogo`
/ `livre`), conforme a spec atualizada.

Linhas: posição, `PlayerBall`, nome, rótulo da mesa (**omitido quando o rótulo é
`""`**), `⨯` que chama `markDeparture` sem diálogo.

`available === false` → "Fila indisponível — a migração 20260915 ainda não rodou
neste banco." É o único ponto onde a ausência das tabelas é visível, e só para
quem pode agir.

Folha "quem chegou": `PlayerPickerModal` **não serve** (fecha ao primeiro toque
e a spec pede marcar várias pessoas). Overlay local no `QueuePanel`,
reaproveitando `.identity-alert-bg` / `.identity-alert` / `.identity-grid`,
listando todos os jogadores com estado por linha (`na fila` / `jogando` /
`na mesa` / `foi embora`) e permanecendo aberta entre toques.

## Tarefa 9 — `table_id` ao iniciar partida

`StartMatchPanel` recebe `activeTables`; campo `<select>` só quando
`activeTables.length > 1`. Com 0 ou 1 mesa ativa o formulário fica byte a byte o
de hoje.

No payload: `...(tableId ? { table_id: tableId } : {})`.

**Este spread é o ponto crítico da feature.** Com `table_id: null` fixo, o
PostgREST devolve 400 num banco sem a migração — e `startMatch` é o caminho mais
quente do painel.

## Tarefa 10 — Perdedor volta pro fim da fila

`FinishMatchButton.jsx`, `AdminView.jsx`.

`onFinished` muda de `(sideLeadId)` para um objeto com `match`, `winnerSide`,
`winnerIds`, `loserIds`, `tableId`, `mode`. **Três call sites mudam juntos**
(verificados: `AdminView.jsx:82`, `AdminView.jsx:102` e o `onFinished?.(winnerId)`
do `finishWithPenalty` em `AdminView.jsx:812`).

**Bug adjacente a corrigir de passagem:** `finishWithPenalty` chama
`persistMatch` sem checar o retorno e dispara `onFinished` mesmo com a escrita
falhando. Com a fila plugada nesse callback, uma falha mandaria o perdedor pra
fila de uma partida que não terminou. Aplicar o mesmo `if (!ok) return`.

`enqueuePlayers(loserIds)` com `enqueued_at` distinto por perdedor
(`now`, `now + 1ms`) para a ordem entre os dois do 2x2 ser determinística.

## Tarefa 11 — Pré-preenchimento do formulário

`preferredPlayerA` sai; entra `prefill = { stamp, mode, tableId, a: [], b: [] }`.

- `tableId` = a mesa da partida finalizada, **só se ainda estiver ativa**.
- `b` = `eligibleForTable(...)`; lista vazia é resultado válido → campo vazio.
- Só vale se `settings.autoPickPlayers`.

**O `useEffect` das linhas ~512-518 é a armadilha.** Hoje ele reavalia A e B a
cada mudança de `players` ou `liveMatches` — ou seja, toda vez que qualquer
partida começa ou termina em qualquer mesa, sobrescrevendo escolha manual do
admin. Passa a depender de `prefill?.stamp` e aplicar **uma vez por stamp**
(`useRef` com o último aplicado). Um segundo efeito, separado, só **remove**
seleções que viraram inválidas, sem impor novas.

Descartado: `key={prefill.stamp}` no `StartMatchPanel` — zeraria também a
data/hora digitada e a trava `starting`.

## Tarefa 12 — `game_day` no cruzar do meio-dia

Cruzar o meio-dia com a tela aberta é benigno (a noite acabou mesmo). O caso que
morde é o tablet ligado da sexta à noite até sábado à noite: o `gameDay` no
estado ainda é o de sexta, a fila mostra a presença da noite passada como se
fosse a de hoje, **e** o filtro de realtime descarta silenciosamente todos os
eventos de hoje.

Solução, ~8 linhas: listener de `visibilitychange` + `focus` recalcula
`gameDayKey`; se mudou, `setGameDay` e o efeito de carga refaz o fetch.
Descartado `setInterval` — o navegador estrangula timer em background.

---

## Ordem

0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12.
`npm test` verde ao fim de cada uma.

## Riscos registrados

- **Relógio do cliente carimba `enqueued_at`** — limite do PostgREST sem RPC.
- **Apagar mesa reescreve o histórico** (`on delete set null`), e como a mesa
  sugerida é derivada, a fila muda retroativamente. Mitigado pelo diálogo.
- **Mudança de contrato do `onFinished`** — esquecer um call site é silencioso:
  nenhum erro, só o perdedor da partida numerada não entra na fila.
- **`liveMatches` de outras noites** — uma partida antiga esquecida em aberto
  some alguém da fila de hoje. Não tratado: é problema de dado pré-existente que
  já polui o painel; filtrar esconderia o sintoma.
- **Concorrência entre dois admins** (AUD-06) — fora de escopo, como na spec.

## Fora do plano, de propósito

Fila para não-admin; reordenar arrastando; relatório de presença; notificação de
vez; `table_id` retroativo; mover `LiveMatchPanel`; layout lado-a-lado em desktop.
