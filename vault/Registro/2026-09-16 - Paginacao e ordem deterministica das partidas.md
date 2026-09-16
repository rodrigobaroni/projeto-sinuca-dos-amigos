---
tags: [registro, sessão, revisão]
data: 2026-09-16
---
# 2026-09-16 — Paginação e ordem determinística das partidas

> [!success] APROVADO SEM RESSALVAS — reconferência final do Prumo, ainda não commitado
> Revisão original contra `HEAD 2134990` bloqueou por achado de **alta severidade** em `src/services/supabaseRepository.js`; correção aplicada pelo Tabela e reconferida pelo Prumo, que fechou **sem ressalvas**. Validação independente: 148/148 testes, build e diff check verdes. O Pessoal já recebeu o parecer final. Falta só o commit — quando sair, atualizar esta nota, criar o registro em `Registro/Commits/` e marcar [[AUD-10 Achados latentes e menores]] L4 como corrigido.

## O que a mudança faz

Fecha [[AUD-10 Achados latentes e menores|L4 (nada é paginado)]] e resolve, de quebra, um segundo bug achado durante o trabalho:

1. **Paginação** — `players`, `matches` e `match_clips` passam por `fetchAllRows()` (`src/services/fetchAllRows.js`, novo), que percorre em páginas de 1000 linhas até a página vir incompleta. Sem isso, o PostgREST corta a resposta em 1000 linhas **sem erro nenhum**; como a ordem é crescente, o que sumia eram as partidas mais recentes. `attendance`, `pool_tables` e `audit_logs` ficam de fora de propósito (não crescem sem teto, ou já têm `.limit()` por decisão de produto).
2. **Horário congelado no formulário** — `StartMatchPanel` calculava o campo "data e hora" uma vez, na montagem. Com `openMatchOnStart` desligado o formulário nunca desmonta, então a noite inteira ia pro banco com o mesmo carimbo (visto em produção: 20 partidas às 23:01, 13 às 02:35). `playedAtISO({ edited, inputValue, now })` (`src/utils/date.js:123`) resolve isso: sem edição, usa o instante real do clique; editado, lê o valor digitado no fuso do produto (`America/Sao_Paulo`); editado mas vazio/inválido, cai no instante real em vez de estourar (`new Date("").toISOString()` lança `RangeError`).

## Achado do Prumo — BLOQUEADO (severidade alta)

**Onde**: `src/services/supabaseRepository.js`, consulta de `matches` em `loadScoreboard()`.

**O que estava errado**: a consulta paginada ordenava só por `played_at` (`sb.from("matches").select("*").order("played_at", { ascending: true })`, sem segunda chave). Numa página do PostgREST, linhas empatadas em `played_at` podem vir em qualquer ordem — e o desempate de fato, quando a chave pedida não distingue, cai no `id`, que é **UUID aleatório**. `computeStats` calcula `curStreak` na ordem em que as partidas chegam (`src/domain/stats.js`), então o sorteio do UUID decidia sequência de vitória dentro de um lote de `played_at` igual — e lotes assim não são raros: o bug do horário congelado (item 2 acima) gravava dezenas de partidas no mesmo minuto.

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

## Próximo passo

Falta só o commit. Quando sair, atualizar esta nota com o sha, criar o registro em `Registro/Commits/` e marcar [[AUD-10 Achados latentes e menores]] L4 como corrigido (ajustando também o card correspondente no [[Kanban]], se o Súmula já tiver criado um).

Relacionado: [[Serviços e Supabase]] · [[AUD-10 Achados latentes e menores]] · [[Estatísticas e Ranking]] · [[Diario de Trabalho]]
