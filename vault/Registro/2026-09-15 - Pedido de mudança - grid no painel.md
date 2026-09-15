---
tags: [registro, sessão, pedido-de-mudança]
data: 2026-09-15
---
# 2026-09-15 — Pedido de mudança: grid no painel (iPad)

> [!warning] PARADO — aguardando QA da fila
> Pedido feito pelo Pessoal (Rodrigo) e ainda **sem nenhuma linha de código tocada**. O Efeito está com o app aberto testando a fila (ver [[Partida ao Vivo]] / feature de fila e mesas) neste exato momento — mexer no código agora invalidaria o que ele já verificou. Esta nota registra a intenção; a implementação só entra depois do veredito do QA.

## Pedido

Origem: Rodrigo, direto, fora do fluxo Mira → implementador (mudança puramente visual, sem decisão de arquitetura).

Contexto de uso que justifica a regra de tela: **o painel roda num iPad em cima da mesa de sinuca durante os dias de jogatina**; eventualmente um amigo assume pelo celular. Não é preferência estética — é o aparelho real.

Três mudanças, todas CSS, nenhuma de funcionalidade:

1. Partidas ao vivo no painel: lista empilhada → **grid de no mínimo 2 colunas**.
2. `StartMatchPanel` e `QueuePanel`: hoje um embaixo do outro → **lado a lado**, dividindo a largura.
3. **Breakpoint em 768px** (iPad retrato): acima → grid/lado a lado; abaixo → coluna única, como hoje. iPad em qualquer orientação cai no layout novo; celular fica no layout atual.

## Nota técnica — o que o plano da fila já previa

O Rodrigo relatou que o layout lado a lado já estava antecipado na Tarefa 8 do plano da fila, com um breakpoint sugerido em 900px a ser ajustado por CSS depois. Fui conferir o arquivo (`docs/superpowers/specs/2026-09-15-fila-e-mesas-plano.md`) e **não encontrei esse trecho literalmente** — nem a menção a 900px, nem a frase citada sobre "coluna única como layout base". O que o arquivo realmente registra, em `docs/superpowers/specs/2026-09-15-fila-e-mesas-plano.md:288-291` (seção "Fora do plano, de propósito"):

> Fila para não-admin; reordenar arrastando; relatório de presença; notificação de [...] vez; `table_id` retroativo; mover `LiveMatchPanel`; **layout lado-a-lado em desktop**.

Ou seja: o layout lado a lado estava listado como **fora de escopo da Tarefa 8**, não como "próximo passo já desenhado com breakpoint definido". A conclusão prática do Rodrigo — que dá pra entregar só com CSS, sem tocar em `QueuePanel`/`StartMatchPanel` como componentes — pode estar certa mesmo assim (o motivo de ter ficado fora era só não duplicar esforço na mesma tarefa), mas o valor de 900px e a citação exata não vêm do arquivo. Sinalizei essa diferença ao Pessoal ao confirmar o registro.

## Escopo do pedido

- **Dentro**: grid ≥2 colunas nas partidas ao vivo; `StartMatchPanel` + `QueuePanel` lado a lado; corte em 768px.
- **Fora**: qualquer mudança de comportamento, dado ou componente — é CSS/layout puro.

Relacionado: [[Partida ao Vivo]] · [[Diario de Trabalho]] · [[Kanban]]
