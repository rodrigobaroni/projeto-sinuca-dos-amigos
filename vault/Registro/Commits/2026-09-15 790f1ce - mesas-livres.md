---
tags: [registro, commit]
sha: 790f1ceea1a12c42326fd5df041ae9ab4620df98
data: 2026-09-15
autor: Rodrigo Baroni
---
# feat: mesas ocupadas somem do seletor e dono da mesa sugere o lado A

```
feat: mesas ocupadas somem do seletor e dono da mesa sugere o lado A

Duas mudancas no formulario de iniciar partida:

1. O seletor de mesa so lista mesas SEM partida ao vivo em cima
   (freeTables). Com todas ocupadas, o formulario da lugar a um
   aviso em vez de deixar montar uma partida que nunca vai poder
   comecar.
2. Escolher uma mesa preenche o lado A com quem esta segurando ela -
   o vencedor da ultima partida ali (tableHolderSuggestion). E
   sugestao, nao trava: sem dono disponivel, o campo fica como
   estava.

Dois detalhes de por que ficou assim:

- A sugestao do lado A mora no onChange do select, nunca num efeito
  reativo. Trocar de mesa e acao direta do admin, nao prefill vindo
  de fora - e o que preserva a guarda `dirty`, que existe pra
  finalizar uma partida numa mesa nao apagar o formulario que o
  admin monta pra outra.
- A validacao do botao passou a exigir que a mesa escolhida
  pertenca as mesas livres, em vez de confiar na contagem. A versao
  por contagem tinha uma janela real: quando o Realtime avisava que
  outra mesa tinha acabado de ficar ocupada, o botao continuava
  habilitado com a mesa velha ate o efeito passivo rodar. Medido no
  navegador com flushSync, nao deduzido.

O Prumo apontou dois bloqueios na primeira revisao (sugestao podia
sumir por residuo de slot de um 2x2 anterior; a janela de Realtime
acima) - ambos corrigidos e reconferidos. Aprovado com uma ressalva
nao-bloqueante de cobertura de teste (o novo teste de regressao
2x2->1x1 cobre o helper isolado, nao o onChange que usa ele de
verdade). 119 testes e build verdes.

Inclui os registros do Talco no vault sobre a revisao e o pedido
original de mesas livres.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

## Por que

Fecha o ciclo de revisão documentado em [[2026-09-15 - Mesas livres no formulario de partida]]: o Prumo bloqueou a primeira versão do diff com dois achados médios, ambos corrigidos e reconferidos como **APROVADO COM RESSALVAS**. A ressalva (cobertura de teste da derivação 2x2→1x1) não bloqueou o commit e virou o card MESA-02 no [[Kanban]] (ver [[2026-09-15 - Cards MESA-01 MESA-02 MESA-03]]).

## Arquivos tocados

| Arquivo | O que mudou |
| --- | --- |
| `src/domain/queue.js` | Duas funções novas: `freeTables({ activeTables, liveMatches })` (mesas ativas sem partida ao vivo em cima) e `tableHolderSuggestion({ tableId, holders, availablePlayerIds, takenPlayerIds })` (sugere o dono da mesa, pulando quem não está disponível ou já foi escalado). |
| `src/domain/queue.test.js` | Testes novos para as duas funções, incluindo o caso de regressão 2x2→1x1 (residuo em A2 não deve suprimir a sugestão) — mas testando o helper isolado, não a derivação real do `onChange` (ver ressalva abaixo). |
| `src/views/AdminView.jsx` | `StartMatchPanel` passa a usar `availableTables` (via `freeTables`) em vez de `activeTables` no seletor e no early-return "todas as mesas ocupadas"; `onChange` do seletor de mesa chama `tableHolderSuggestion` e preenche `playerA`; `valid` passou a exigir `availableTables.some((table) => table.id === tableId)` em vez de comparar por contagem (`AdminView.jsx:415`); `takenPlayerIds` passado ao helper deriva de `requiredSlots` (`AdminView.jsx:459`), não mais de `playerA2`/`playerB2` direto. |

## Revisão e QA

- **Prumo**: bloqueou a primeira versão (2 achados médios), reconferiu e aprovou com ressalva baixa de cobertura de teste — detalhe completo em [[2026-09-15 - Mesas livres no formulario de partida]].
- **QA ao vivo**: ainda não feito contra homologação real (Supabase, login, realtime) — é o card MESA-03 no Kanban, responsabilidade do Efeito, e é bloqueante pra qualquer push de produção deste commit.
- 119 testes e build verdes.

## O que ficou de fora

- Sugestão da dupla inteira no 2x2 (hoje só o primeiro jogador é sugerido) — decisão de UX pendente do Rodrigo, card MESA-01.
- Fechar a lacuna de teste do `onChange` real — card MESA-02.
- QA ao vivo contra hml — card MESA-03, bloqueante pro push.

Relacionado: [[2026-09-15 - Mesas livres no formulario de partida]] · [[2026-09-15 - Cards MESA-01 MESA-02 MESA-03]] · [[Partida ao Vivo]] · [[Diario de Trabalho]]
