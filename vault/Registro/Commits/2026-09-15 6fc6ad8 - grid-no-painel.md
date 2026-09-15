---
tags: [registro, commit]
sha: 6fc6ad81cb6a2bf99067ace5c9108d6755e16e57
data: 2026-09-15
autor: Rodrigo Baroni
---
# feat: grid de 2 colunas no painel admin para iPad

```
feat: grid de 2 colunas no painel admin para iPad

O Rodrigo usa um iPad como painel durante os dias de jogatina; os
amigos as vezes assumem pelo celular. O layout empilhado de sempre
desperdicava a largura do iPad, entao:

1. Partidas ao vivo no painel viram grid de 2 colunas
   (.panel-live-grid).
2. StartMatchPanel fica lado a lado com o QueuePanel
   (.panel-start-grid).
3. Corte em 768px (iPad retrato): acima, grid; abaixo, coluna unica.

Todas as regras novas em styles.css sao aditivas dentro de
@media (min-width:768px) - abaixo de 768px .panel-live-grid e
.panel-start-grid nao recebem estilo nenhum, entao o mobile fica
byte a byte identico ao layout anterior. Medido com screenshots em
390px e 767px; confirmado por leitura no diff pelo Prumo (revisao
sem achados). O Efeito ja tinha validado ao vivo a feature anterior
(fila). 105 testes e build verdes.

Inclui o registro do Talco no vault sobre o pedido de mudanca.
```

## Por que

Fecha o [[2026-09-15 - Pedido de mudança - grid no painel|pedido de mudança]] do Rodrigo: o painel roda num iPad em cima da mesa de sinuca durante os dias de jogatina, e o layout empilhado desperdiçava a largura da tela. Não é preferência estética — é o aparelho real usado em produção.

## Arquivos tocados

| Arquivo | O que mudou |
| --- | --- |
| `src/styles.css` | Bloco novo `@media (min-width:768px)` com `.panel-live-grid` (2 colunas fixas para as partidas ao vivo) e `.panel-start-grid` (`QueuePanel` + `StartMatchPanel` lado a lado). Tudo aditivo: sem regra abaixo de 768px, então o celular fica byte a byte igual ao layout anterior. `:only-child` faz o painel ocupar a largura toda quando só sobra uma partida ao vivo ou só o formulário (sem fila ligada), em vez de abrir um buraco do lado. |
| `src/views/AdminView.jsx` | `liveMatches.map(...)` passou a viver dentro de um `<div className="panel-live-grid">` (só renderizado quando há partida ao vivo); `QueuePanel` + `StartMatchPanel` viraram irmãos dentro de `<div className="panel-start-grid">`. Nenhuma lógica mudou — é reorganização de wrapper para o CSS ter onde agarrar. |

## Revisão e QA

- **Prumo**: revisão do diff, **sem achados**.
- **Efeito**: não testou este commit especificamente ao vivo (é CSS puro); a validação ao vivo que ele fez foi da feature de fila, anterior a este commit.
- 105 testes e build verdes.

## O que ficou de fora

Nada do pedido original ficou de fora — as três mudanças pedidas (grid ≥2 colunas nas partidas ao vivo, `StartMatchPanel`/`QueuePanel` lado a lado, corte em 768px) entraram neste commit único.

Relacionado: [[2026-09-15 - Pedido de mudança - grid no painel]] · [[Partida ao Vivo]] · [[Diario de Trabalho]]
