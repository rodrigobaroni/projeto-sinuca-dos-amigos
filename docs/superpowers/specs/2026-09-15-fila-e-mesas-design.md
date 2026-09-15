# Fila da noite e mesas nomeadas

**Data:** 2026-09-15
**Status:** aprovado no brainstorm, pronto para virar plano de implementação

## O problema

A galera joga a noite toda, quem ganha fica na mesa e quem perde volta pro fim
da fila. Hoje isso é combinado de boca e discutido na hora. Em noite de duas
mesas piora: ninguém lembra quem é o próximo de cada mesa, e existe uma regra
da casa que ninguém consegue rastrear de cabeça — **quem perde numa mesa não
volta para essa mesa, tem que ir para a outra**.

O app já registra partidas e já suporta várias partidas ao vivo ao mesmo tempo,
mas não sabe em qual mesa cada uma acontece e não tem nenhuma noção de quem
está esperando.

## Objetivo

Mostrar no painel, em ordem, quem está esperando e para qual mesa cada um
deveria ir — e fazer isso sem engessar o admin, que precisa poder furar a
ordem quando a noite pedir.

## Decisões tomadas no brainstorm

| Decisão | Escolha | Por quê |
|---|---|---|
| Onde a fila vive | Banco (Supabase), com realtime | Quem abre o painel no celular em vez do tablet tem que ver a mesma fila. Em `localStorage` a noite se perderia na troca de aparelho. |
| Estrutura da fila | Uma fila só, com a mesa sugerida ao lado de cada nome | Foi o pedido explícito: a fila **informa**, o admin **decide**. Filas separadas por mesa exigiriam equilibrar as listas na mão. |
| Entrada na fila | Admin marca quem chegou | Quem chegou e ainda não jogou é justamente quem mais precisa aparecer na fila; derivar das partidas deixaria essa pessoa invisível. |
| Fim da partida | Perdedor volta sozinho pro fim da fila | O caso comum acontece sem diálogo; a exceção (foi embora) custa um toque. |
| Duplas 2x2 | A fila trata pessoas, nunca duplas | Uma lógica só serve 1x1 e 2x2. Dupla fixa travaria a fila se um dos dois fosse embora. |
| O que é gravado | Só a **ordem**; a mesa sugerida é **calculada** | A regra é uma leitura do histórico de partidas. Gravada, ela passa a mentir quando uma partida é apagada ou corrigida — e o painel permite apagar. Calculada, se conserta sozinha. |

A última linha é a decisão estruturante desta spec. Tudo o que é derivável fica
derivado.

## Modelo de dados

Migração pronta em `docs/migrations/20260915_add_queue_and_tables.sql`.

### `pool_tables`

Uma linha por mesa: `name`, `sort_order`, `active`. Fica no banco (não em
`localStorage`) porque a fila é compartilhada — nome local faria um aparelho
mostrar "Mesa 1" e o outro "mesa do fundo".

`active` é como se diz "hoje é noite de mesa só": com uma mesa ativa, a regra
de alternância se desliga sozinha, sem código condicional espalhado.

### `attendance`

Uma linha por pessoa por noite:

| Campo | Papel |
|---|---|
| `game_day` | A noite, chave `YYYY-MM-DD` do recorte de 12h às 12h (`gameDayKey` em `src/utils/date.js`). Não é data de calendário. |
| `player_id` | Quem |
| `arrived_at` | Quando chegou — histórico, não afeta a fila |
| `enqueued_at` | **A posição na fila** |
| `left_at` | Preenchido = foi embora e saiu da fila; nulo = está aqui |

`enqueued_at` ser a posição é o que dispensa coluna numérica: chegou, carimba e
entra no fim; perdeu, recarimba e volta pro fim. Sem renumeração, sem duas
linhas disputando a mesma posição.

Voltar alguém que tinha ido embora: limpa `left_at` e recarimba `enqueued_at`.

### `matches.table_id`

Coluna nova, **anulável**, apontando para `pool_tables`. Anulável porque as
partidas que já existem foram jogadas antes de haver mesa nomeada, e preencher
na marra seria inventar dado. Partida sem mesa continua válida.

## Regras de domínio

Tudo isto é função pura, em `src/domain/queue.js`, testável sem banco — mesmo
padrão dos helpers de `src/domain/match.js`.

### Quem está segurando cada mesa

Quem ganha permanece na mesa. Entre uma partida e a próxima ele não está
jogando, mas também **não está esperando** — está de pé na mesa aguardando
desafiante. A fila precisa saber disso, senão o vencedor reaparece na lista de
espera (e, com o carimbo antigo, na primeira posição, como se fosse o próximo a
entrar).

```
donoDaMesa(tableId, gameDay, partidas, attendance) =
  se há partida ao vivo nessa mesa            -> ninguém (está em jogo)
  senão, a partida finalizada mais recente
  dessa noite nessa mesa -> os jogadores do lado VENCEDOR
  filtrando quem foi embora (left_at) e quem
  já entrou em partida ao vivo em outra mesa  -> ninguém, se sobrar vazio
```

No 1x1 é uma pessoa; no 2x2 é a dupla inteira. Partida sem `table_id` não gera
dono de mesa nenhuma.

### Quem está na fila

```
fila(gameDay, attendance, liveMatches, partidas) =
  linhas de attendance com game_day === gameDay e left_at nulo
  menos quem está em qualquer partida ao vivo
  menos quem é dono de alguma mesa
  ordenado por enqueued_at crescente
```

Quem está jogando não aparece na fila — está na mesa. Quem acabou de vencer
também não: vira dono da mesa. Ele volta para a fila no momento em que perder,
que é quando `enqueuePlayers` recarimba a posição dele.

### A mesa sugerida

```
mesaOndePerdeu(playerId, gameDay, partidasFinalizadas) =
  entre as partidas finalizadas da noite em que a pessoa perdeu,
  a mais recente; devolve o table_id dela (pode ser nulo)

mesasSugeridas(playerId, mesasAtivas, mesaOndePerdeu) =
  se mesasAtivas tem 0 ou 1 mesa        -> todas as mesas ativas
  se mesaOndePerdeu é nulo              -> todas as mesas ativas
  senão                                 -> mesasAtivas menos mesaOndePerdeu
```

O rótulo na tela, avaliado nesta ordem:

1. **uma só mesa ativa** → sem rótulo nenhum; a coluna de mesa some da fila.
   Repetir "Mesa 1" em todo mundo seria ruído puro.
2. todas as mesas ativas elegíveis → `qualquer`
3. exatamente uma elegível → o nome dela (`MESA 2`)
4. mais de uma, mas não todas → `qualquer menos Mesa 1`

A ordem importa: com uma mesa ativa os casos 2 e 3 descreveriam o mesmo estado
com rótulos diferentes, então o caso 1 decide antes de qualquer outro.

Se a última derrota foi numa partida sem `table_id` (partida antiga, ou
iniciada antes das mesas existirem), `mesaOndePerdeu` é nulo e o rótulo é
`qualquer`. A regra degrada para o comportamento de hoje em vez de quebrar.

### O próximo de uma mesa

```
proximoDaMesa(tableId, fila) =
  o primeiro da fila cujas mesasSugeridas incluem tableId
```

É isso que "pular quem está marcado para a outra mesa" quer dizer. Não remove
ninguém da fila — apenas escolhe quem o formulário pré-seleciona.

## Telas

### Painel — bloco da fila

Vizinho do formulário de iniciar partida; em tela de celular, **empilhado
acima** dele, porque a fila é o que se consulta antes de montar a partida.

```
MESA 1  ●  Baroni segurando
MESA 2  ●  em jogo

FILA DA NOITE · 4 esperando            [ quem chegou ]

1   ●  Tiago           MESA 2      ⨯
2   ●  Régis           qualquer    ⨯
3   ●  Fernando        MESA 1      ⨯
4   ●  Zé              qualquer    ⨯
```

O cabeçalho mostra, por mesa ativa: quem está segurando, `em jogo` quando há
partida ao vivo, ou `livre` quando não há nem dono nem partida. Com uma mesa só
ativa o cabeçalho continua aparecendo — ali ele é a única forma de saber quem
está na mesa.

- `⨯` marca "foi embora": preenche `left_at`, sai da fila na hora, sem diálogo.
- **Quem chegou** abre uma folha com todos os jogadores cadastrados e marca
  presença por toque. Também é por onde alguém que foi embora volta.
- Fila vazia mostra um estado vazio convidando a marcar quem chegou.

### Iniciar partida — campo de mesa

O formulário ganha um seletor de mesa. Com **uma** mesa ativa, o campo não
aparece: ela é escolhida sozinha e o formulário fica idêntico ao de hoje. Com
duas ou mais, o admin escolhe.

Com **seleção automática** ligada, ao finalizar uma partida na mesa X o
formulário volta preenchido:

- mesa = X
- lado A = quem venceu (no 2x2, os dois vencedores)
- lado B = `proximoDaMesa(X, fila)` (no 2x2, os dois primeiros elegíveis)

Tudo é pré-preenchimento. Qualquer campo pode ser trocado antes de confirmar.
Isso estende o que já existe: hoje o formulário já pré-seleciona o último
vencedor como jogador A (`preferredPlayerA`).

### Configurações — aba "Fila"

- **Mesas**: nome, ativa/inativa, adicionar e remover. Renomear e desativar
  saem daqui.
- **Seleção automática de jogador**: liga/desliga o pré-preenchimento acima.
- **Mostrar a fila no painel**: desligado, o painel volta a ser exatamente o de
  hoje.

Os dois interruptores ficam em `localStorage`, junto de `openMatchOnStart` e
`finishFromPanel`, porque são preferência de quem opera. As mesas vão para o
banco, porque são fato da noite e precisam bater em qualquer aparelho.

## Casos de borda

| Situação | Comportamento |
|---|---|
| Ninguém elegível na fila para a mesa | O campo de jogador fica vazio; o admin escolhe na mão. Sem erro. |
| Fila vazia | Estado vazio; o formulário funciona como hoje. |
| Vencedor vai embora logo após vencer | Marcar a saída tira ele de dono de mesa; a mesa fica `livre`. |
| Vencedor é escalado pelo admin para outra mesa | Entra em partida ao vivo, deixa de ser dono da primeira; ela fica `livre`. |
| Vira o dia de jogatina (12h) | `game_day` muda, a fila nasce vazia. A presença da noite anterior fica no histórico. |
| Mesa desativada com partida ao vivo em cima | A partida mantém seu `table_id` e termina normal. A fila apenas deixa de sugerir aquela mesa. |
| Partida apagada ou corrigida | A mesa sugerida se recalcula sozinha — é o motivo de não gravá-la. |
| Jogador apagado do cadastro | `on delete cascade` remove a presença junto. |
| Jogador perde, some da fila, e volta depois | Marcar presença de novo limpa `left_at` e recarimba a posição: entra no fim. |
| Duas mesas, pessoa perde em ambas alternadamente | A regra olha só a **última** derrota, então alterna 1 → 2 → 1. Correto por construção. |
| Dois admins mexendo ao mesmo tempo | Realtime sincroniza; carimbos são último-a-escrever-vence. Mesma limitação de concorrência já registrada em AUD-06, não resolvida aqui. |

## Testes

Domínio puro, vitest em Node, sem banco e sem jsdom — igual ao que já existe:

- `fila` exclui quem tem `left_at`, exclui quem está em partida ao vivo, exclui
  quem é dono de mesa, e ordena por `enqueued_at`.
- `donoDaMesa` devolve o vencedor da última partida finalizada da mesa.
- `donoDaMesa` devolve ninguém quando há partida ao vivo na mesa.
- `donoDaMesa` devolve a dupla inteira no 2x2.
- `donoDaMesa` ignora o vencedor que foi embora (`left_at` preenchido).
- `donoDaMesa` ignora o vencedor que já entrou em partida em outra mesa.
- `donoDaMesa` devolve ninguém quando a mesa não teve partida na noite.
- `mesaOndePerdeu` pega a derrota **mais recente**, ignora vitórias, ignora
  partidas de outras noites, e devolve nulo para quem não perdeu.
- `mesaOndePerdeu` funciona no 2x2 (derrota é do lado, não do `winner_id`).
- `mesasSugeridas` com uma mesa ativa devolve essa mesa (regra desligada).
- `mesasSugeridas` com duas mesas devolve a outra.
- `mesasSugeridas` com três mesas devolve as duas restantes.
- `mesasSugeridas` com última derrota sem `table_id` devolve todas.
- `proximoDaMesa` pula quem não pode entrar naquela mesa.
- `proximoDaMesa` devolve nulo quando ninguém é elegível.
- Rótulos: `qualquer`, nome único, `qualquer menos X`.

A orquestração de tela (folha de presença, pré-preenchimento do formulário)
fica para verificação manual no ambiente de homologação (`npm run dev:hml`),
como o resto da UI do projeto.

## Fora de escopo

- Fila visível para quem não é admin. O painel é a tela de quem administra.
- Reordenar a fila arrastando. A ordem sai da chegada e das derrotas; furar a
  ordem acontece na criação da partida, não mexendo na lista.
- Relatório ou histórico de presença ("quem mais apareceu no ano").
- Notificar alguém de que chegou a vez.
- Preencher `table_id` retroativamente nas partidas antigas.
- Resolver concorrência real entre dois admins (AUD-06).
