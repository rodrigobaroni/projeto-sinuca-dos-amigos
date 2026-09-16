---
tags: [registro, commit]
sha: 705fdac67bf765daa9ba2d319be2d933069f6ba9
data: 2026-09-16
autor: Rodrigo Baroni
---
# fix: horario da partida nao congela mais quando o formulario nao desmonta

```
fix: horario da partida nao congela mais quando o formulario nao desmonta

O campo "data e hora" do StartMatchPanel era calculado uma vez na
montagem do formulario e nunca mais - dava certo por acidente,
porque iniciar partida navegava pra tela da partida e desmontava o
formulario a cada vez. Com "ir direto a partida" desligado e
"gerenciar pelo painel" ligado, o formulario nunca desmonta e o
horario congelou: em producao, 20 partidas de ontem foram gravadas
as 23:01 e 13 as 02:35 - todas com o carimbo de quando o admin abriu
a tela, nao de quando cada uma comecou de verdade.

playedAtISO({ edited, inputValue, now }) (src/utils/date.js) resolve
isso: sem edicao, grava o instante real do clique; editado, le o
valor digitado - preservando o lancamento retroativo, que precisa
continuar funcionando. O campo em si (`when`) tambem deixou de vir
de useState(() => ...) fixo na montagem: sem edicao (`whenEdited`
false) ele mostra o relogio corrente a cada render, e volta a seguir
o relogio depois que a partida comeca, pra nao herdar o horario
retroativo de uma pra outra.

Duas correcoes de escopo extra que o Prumo aprovou explicitamente
junto:
- O valor editado passa a ser lido no fuso do produto
  (America/Sao_Paulo), nao no fuso do navegador de quem esta com a
  tela aberta - reaproveita o toInstant que ja existe em date.js e
  alinha com a decisao ja registrada em AUD-12.
- Fechado um crash latente: campo editado e depois apagado
  (new Date("").toISOString()) lancava RangeError e derrubava o
  inicio da partida. Agora cai no instante real em vez de estourar.

Nenhuma migracao de dado: as partidas de ontem com horario empilhado
continuam como estao - o desempate por created_at (commit anterior)
recupera a ordem real delas sem tocar no passado.

Prumo aprovado sem ressalvas. 148 testes e build verdes.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

## Por que

Fecha o registro de [[2026-09-16 - Horario congelado no formulario de partida]]: o formulário de iniciar partida calculava o horário uma única vez, na montagem, e isso só virou problema visível quando as mudanças do dia anterior ([[2026-09-15 6fc6ad8 - grid-no-painel|grid no painel]] e o fluxo `finishFromPanel`) fizeram o formulário parar de desmontar entre partidas. Este bug é metade da história do dia — a outra metade é [[2026-09-16 f18aab2 - paginacao-e-ordem|f18aab2]], e as duas se encadeiam (ver [[2026-09-16 - Encadeamento paginacao e horario congelado]]).

## Arquivos tocados

| Arquivo | O que mudou |
| --- | --- |
| `src/utils/date.js` | `playedAtISO({ edited, inputValue, now })`, nova: instante real sem edição, valor digitado (no fuso do produto) quando editado, fallback pro instante real se o campo editado ficar vazio/inválido. |
| `src/views/AdminView.jsx` | `StartMatchPanel` ganhou o estado `whenEdited`; o campo "data e hora" mostra o relógio corrente enquanto não editado, em vez de um valor fixado na montagem; `whenEdited` volta a `false` depois que a partida começa. |
| `src/utils/date.test.js` | Testes de `playedAtISO`: instante real vs. editado, leitura no fuso do produto, fallback de campo vazio/inválido, carimbos diferentes em cliques em instantes diferentes. |

## Revisão e QA

- **Prumo**: aprovado sem ressalvas, incluindo as duas correções de escopo extra (fuso do campo editado, crash de `RangeError`).
- 148 testes e build verdes.

## O que ficou de fora

Nenhuma migração de correção de dado — decisão de produto registrada em [[2026-09-16 - Horario congelado no formulario de partida]]: as partidas já gravadas com horário empilhado continuam como estão.

Relacionado: [[2026-09-16 - Horario congelado no formulario de partida]] · [[2026-09-16 f18aab2 - paginacao-e-ordem]] · [[2026-09-16 - Encadeamento paginacao e horario congelado]] · [[AUD-12 Dia de jogatina depende do fuso do navegador]] · [[Diario de Trabalho]]
