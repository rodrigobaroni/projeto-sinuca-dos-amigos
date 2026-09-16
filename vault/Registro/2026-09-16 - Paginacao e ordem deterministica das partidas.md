---
tags: [registro, sessão, revisão]
data: 2026-09-16
---
# 2026-09-16 — Paginação e ordem determinística das partidas

> [!success] APROVADO SEM RESSALVAS — commit [[2026-09-16 f18aab2 - paginacao-e-ordem|f18aab2]]
> Revisão original contra `HEAD 2134990` bloqueou por achado de **alta severidade** em `src/services/supabaseRepository.js`; correção aplicada pelo Tabela e reconferida pelo Prumo, que fechou **sem ressalvas**. Validação independente: 148/148 testes, build e diff check verdes.
>
> Esta nota cobre só a parte de **paginação e ordem**. O bug do horário congelado que alimentou os lotes empatados (item 2 abaixo) tem nota própria — [[2026-09-16 - Horario congelado no formulario de partida]] — e os dois juntos têm uma terceira nota sobre como um causou o outro e os números medidos contra produção: [[2026-09-16 - Encadeamento paginacao e horario congelado]].

## O que a mudança faz

Fecha [[AUD-10 Achados latentes e menores|L4 (nada é paginado)]].

`players`, `matches` e `match_clips` passam por `fetchAllRows()` (`src/services/fetchAllRows.js`, novo), que percorre em páginas de 1000 linhas até a página vir incompleta. Sem isso, o PostgREST corta a resposta em 1000 linhas **sem erro nenhum**; como a ordem é crescente, o que sumia eram as partidas mais recentes. `attendance`, `pool_tables` e `audit_logs` ficam de fora de propósito (não crescem sem teto, ou já têm `.limit()` por decisão de produto).

Enquanto essa paginação estava sendo revisada, um segundo bug — o horário congelado no formulário — estava produzindo os lotes de `played_at` idêntico que tornaram a instabilidade da ordenação visível. Ver as duas notas linkadas acima para o bug em si e para como um alimentou o outro.

## Achado do Prumo — BLOQUEADO (severidade alta)

**Onde**: `src/services/supabaseRepository.js`, consulta de `matches` em `loadScoreboard()`.

**O que estava errado**: a consulta paginada ordenava só por `played_at` (`sb.from("matches").select("*").order("played_at", { ascending: true })`, sem segunda chave). Numa página do PostgREST, linhas empatadas em `played_at` podem vir em qualquer ordem — e o desempate de fato, quando a chave pedida não distingue, cai no `id`, que é **UUID aleatório**. `computeStats` calcula `curStreak` na ordem em que as partidas chegam (`src/domain/stats.js`), então o sorteio do UUID decidia sequência de vitória dentro de um lote de `played_at` igual — e lotes assim não são raros: o [[2026-09-16 - Horario congelado no formulario de partida|bug do horário congelado]] gravava dezenas de partidas no mesmo minuto.

**Cenário reproduzido**: mesma dupla de partidas (uma derrota às 02:02, uma vitória às 02:03), só a ordem de chegada muda — `curStreak` sai **1** na ordem cronológica real e **0** na ordem que o desempate por `id` daria. Teste que trava isso: `src/domain/stats.test.js:30` ("curStreak depende da ordem de chegada - por isso o desempate e cronologico").

**Recomendação aceita pelo Rodrigo**: ordenar por `played_at ASC`, depois `created_at ASC` (ordem real de inserção, `NOT NULL`), e `id ASC` só para fechar a ordem total — nunca `id` como segunda chave.

## Correção aplicada

| Consulta | Ordem antes | Ordem depois |
| --- | --- | --- |
| `matches` | `played_at asc` | `played_at asc, created_at asc, id asc` — `src/services/supabaseRepository.js:39-41` |
| `players` | `name asc` | `name asc, created_at asc, id asc` — `src/services/supabaseRepository.js:28-30` |
| `match_clips` | `created_at desc` | `created_at desc, id asc` — `src/services/supabaseRepository.js:50-51` (aqui `created_at` já é a chave principal; `id` só fecha a ordem total) |

Testes novos travando a ordem exata em `src/services/supabaseRepository.test.js` (via cliente falso que registra as cláusulas `order`/`range`) e o cenário de streak em `src/domain/stats.test.js:30`. `fetchAllRows` (`src/services/fetchAllRows.js:26-28`) também passou a recusar `pageSize` inválido (zero, negativo, `NaN`, fracionário) em vez de repetir a mesma fatia pra sempre — coberto em `src/services/fetchAllRows.test.js:103`.

## Aprovado sem ressalva (rodada inicial)

- Paginação em si e contrato de erros (`matches`/`players` lançam; `match_clips` degrada pra lista vazia — comportamento que já existia antes da paginação, preservado).
- `playedAtISO` — instante real vs. horário editado, fallback do campo vazio/inválido.
- Leitura do horário digitado no fuso `America/Sao_Paulo`, não no fuso do navegador.

## Reconferência final — APROVADO SEM RESSALVAS

Prumo confirmou a ordem corrigida nas três consultas (`matches`: `played_at ASC, created_at ASC, id ASC`; `players`: `name, created_at, id`; `clips`: `created_at DESC, id`), a validação de `pageSize` e a cobertura de teste (ordens, paginação, contratos de erro no repositório; premissa do streak em `stats.test.js`). Sem achados novos, sem ressalvas.

**Testes e build**: 148/148 testes, build e diff check verdes (validação independente).

Relacionado: [[Serviços e Supabase]] · [[AUD-10 Achados latentes e menores]] · [[Estatísticas e Ranking]] · [[2026-09-16 - Horario congelado no formulario de partida]] · [[2026-09-16 - Encadeamento paginacao e horario congelado]] · [[Diario de Trabalho]]
