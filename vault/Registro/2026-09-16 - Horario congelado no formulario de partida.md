---
tags: [registro, sessão]
data: 2026-09-16
---
# 2026-09-16 — Horário congelado no formulário de partida

> [!success] Corrigido — commit [[2026-09-16 705fdac - horario-nao-congela|705fdac]]
> Prumo aprovado sem ressalvas. 148 testes e build verdes. Ver [[2026-09-16 - Encadeamento paginacao e horario congelado]] para como este bug se encadeou com a instabilidade de paginação do mesmo dia.

## O problema

O campo "data e hora" do `StartMatchPanel` era calculado **uma vez**, na montagem do formulário (`useState(() => ...)` fixo). Isso passava despercebido porque iniciar uma partida navegava para a tela da partida, desmontando o formulário a cada vez — o campo nunca vivia tempo suficiente pra congelar de verdade.

As mudanças do dia anterior ([[2026-09-15 6fc6ad8 - grid-no-painel|grid no painel]] e o fluxo de `finishFromPanel`) mudaram isso: com `openMatchOnStart` desligado e `finishFromPanel` ligado, o admin gerencia tudo pelo painel e o formulário **nunca desmonta**. O horário calculado na primeira renderização ficou congelado pela noite inteira.

**Evidência em produção**: 20 partidas gravadas com `played_at` idêntico às 23:01, 13 às 02:35, 8 às 01:49 — todas com o carimbo de quando o admin abriu a tela, não de quando cada uma começou de verdade.

## Correção

`playedAtISO({ edited, inputValue, now })` em `src/utils/date.js:123` — grava o instante real do clique quando o admin não mexeu no campo; quando editou (lançamento retroativo, que precisa continuar funcionando), respeita o valor digitado. O campo em si (`when`, em `StartMatchPanel`) deixou de vir de um `useState` fixo: sem edição (`whenEdited === false`) ele mostra o relógio corrente a cada render, e volta a segui-lo depois que uma partida começa, pra não herdar o horário retroativo de uma pra outra.

## Duas correções de escopo extra, aprovadas explicitamente pelo Prumo

- **Fuso do campo editado**: o valor digitado passou a ser lido no fuso do produto (`America/Sao_Paulo`), não no fuso do navegador de quem está com a tela aberta — reaproveita o `toInstant` que já existia em `date.js` e alinha com a decisão já registrada em [[AUD-12 Dia de jogatina depende do fuso do navegador]].
- **Crash latente fechado**: campo editado e depois apagado pelo admin fazia `new Date("").toISOString()` lançar `RangeError` e derrubar o início da partida. Agora cai no instante real em vez de estourar.

## Decisão de produto registrada

Nenhuma migração de correção de dado. As partidas já gravadas com horário empilhado continuam como estão — o desempate por `created_at` (ver [[2026-09-16 - Paginacao e ordem deterministica das partidas]]) recupera a ordem cronológica real **na leitura**, sem tocar no passado. Isso tira a urgência de qualquer correção retroativa no banco.

Relacionado: [[2026-09-16 - Paginacao e ordem deterministica das partidas]] · [[2026-09-16 - Encadeamento paginacao e horario congelado]] · [[AUD-12 Dia de jogatina depende do fuso do navegador]] · [[Diario de Trabalho]]
