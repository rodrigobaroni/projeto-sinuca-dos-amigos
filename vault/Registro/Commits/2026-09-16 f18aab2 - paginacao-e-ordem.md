---
tags: [registro, commit]
sha: f18aab2a1ec615c9dcce24cc9a56f8d04595f3fe
data: 2026-09-16
autor: Rodrigo Baroni
---
# fix: pagina leitura de matches/players/clips e fecha ordem com created_at

```
fix: pagina leitura de matches/players/clips e fecha ordem com created_at

Producao tem 1075 partidas e o PostgREST corta toda resposta em 1000
linhas, sem erro nenhum - so 200 OK truncado. Como a ordem e
crescente, o que sumia eram as 75 MAIS RECENTES: partida ao vivo
desaparecia ao recarregar, o historico da noite nao existia num
aparelho recem-aberto, e ranking/recordes ficavam desatualizados pra
todo mundo. Nao foi causado por feature nova - era defeito latente
(AUD-10 L4) que so disparou ao cruzar a marca de mil linhas.

fetchAllRows() (novo, src/services/fetchAllRows.js) pagina em fatias
de 1000 ate a pagina vir incompleta, com teto de seguranca em linhas
(nao em paginas) pra nunca travar num loop infinito se o servidor
ignorar o range. players, matches e match_clips passam por ele -
attendance, pool_tables e audit_logs ficam de fora de proposito, por
nao crescerem sem teto ou ja terem .limit() por decisao de produto.

O detalhe que importa: a ordenacao de matches virou
`played_at, created_at, id`, nunca so `played_at`. Sem uma segunda
chave, linhas empatadas podem sair em ordem diferente entre duas
paginas do PostgREST - a fronteira duplica uma linha e perde outra.
E o desempate nao pode ser por `id`: como e UUID aleatorio e
computeStats calcula curStreak na ordem em que as partidas chegam, o
sorteio do UUID passaria a decidir sequencia de vitoria - justamente
nos lotes de horario identico que o bug do formulario congelado
(proximo commit) andou criando. Medido no hml: 5 de 10 lotes saiam
em ordem diferente. created_at (NOT NULL, ordem real de insercao)
desempata de verdade; id fecha a ordem total so por ultimo. Mesmo
raciocinio aplicado a players e match_clips.

O Prumo bloqueou a primeira rodada por isso (severidade alta) -
corrigido e reconferido, aprovado sem ressalva. 148 testes e build
verdes.

Fecha AUD-10 L4. Inclui o registro do Talco sobre a revisao.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

## Por que

Fecha o ciclo de revisão documentado em [[2026-09-16 - Paginacao e ordem deterministica das partidas]]: o Prumo bloqueou a primeira versão do diff por um achado de alta severidade (desempate por UUID reordenando partidas e alterando `curStreak`), corrigido e reconferido como **APROVADO SEM RESSALVAS**. Fecha [[AUD-10 Achados latentes e menores|AUD-10 L4]]. Ver também [[2026-09-16 - Encadeamento paginacao e horario congelado]] para como este bug se relaciona com o do commit seguinte, [[2026-09-16 705fdac - horario-nao-congela|705fdac]].

## Arquivos tocados

| Arquivo | O que mudou |
| --- | --- |
| `src/services/fetchAllRows.js` (novo) | Pagina qualquer query em fatias de 1000 linhas até a página vir incompleta; recusa `pageSize` inválido; teto de segurança em linhas contra loop infinito. |
| `src/services/supabaseRepository.js` | `players`, `matches` e `match_clips` passam por `fetchAllRows`; ordenação ganhou segunda e terceira chaves (`created_at`, `id`) nas três consultas. |
| `src/services/fetchAllRows.test.js`, `src/services/supabaseRepository.test.js` (novos) | Testes de paginação, contratos de erro e ordem exata das cláusulas `order`. |
| `src/domain/stats.test.js` | Teste de regressão: mesma dupla de partidas, ordem de chegada diferente, `curStreak` muda — trava a premissa que motivou o desempate cronológico. |

## Revisão e QA

- **Prumo**: bloqueou a primeira versão (achado alto), reconferiu e aprovou sem ressalvas.
- **Validação independente**: 148/148 testes, build e diff check verdes.
- **Produção, pós-deploy**: 1073 partidas trazidas (zero truncamento), zero `id` duplicado na fronteira entre páginas, última partida visível avançou de 15/09 21:24 para 16/09 03:23. Detalhe completo em [[2026-09-16 - Encadeamento paginacao e horario congelado]].

## O que ficou de fora

Nenhuma migração de correção de dado — as partidas já gravadas com `played_at` empilhado continuam como estão; o desempate por `created_at` recupera a ordem real na leitura, sem tocar no passado.

Relacionado: [[2026-09-16 - Paginacao e ordem deterministica das partidas]] · [[2026-09-16 705fdac - horario-nao-congela]] · [[2026-09-16 - Encadeamento paginacao e horario congelado]] · [[AUD-10 Achados latentes e menores]] · [[Diario de Trabalho]]
