---
tags: [registro, sessão]
data: 2026-09-16
---
# 2026-09-16 — Como o bug do horário quase escondeu a paginação instável

A parte mais interessante do dia: os dois bugs de 16/09 não são independentes — um alimentou o outro.

## O encadeamento

1. O [[2026-09-16 - Horario congelado no formulario de partida|bug do horário congelado]] gravou dezenas de partidas por noite com `played_at` **idêntico** (formulário nunca desmontava, o carimbo era sempre o mesmo).
2. Isso tornou a [[2026-09-16 - Paginacao e ordem deterministica das partidas|paginação de `matches`]] instável: sem uma ordem **total** (uma chave que nunca empata), o PostgREST pode devolver linhas empatadas em `played_at` numa ordem diferente entre duas páginas — a fronteira duplica uma linha e perde outra.
3. O desempate óbvio seria por `id`. Mas `matches.id` é **UUID aleatório**, e `computeStats` calcula `curStreak` na ordem de chegada das partidas — desempatar por `id` faria o sorteio do UUID decidir sequência de vitória **ao acaso**, justamente dentro dos lotes que o bug do horário estava criando.
4. Foi o Prumo quem identificou essa cadeia durante a revisão da paginação. A solução: desempatar por `played_at, created_at, id` — `created_at` é `NOT NULL` e reflete a ordem real de inserção; `id` só fecha a ordem total, nunca decide nada sozinho.

Sem o bug do horário, o desempate por `id` teria ficado quase sempre invisível — pouquíssimos empates de verdade em `played_at`. O próprio bug que precisava ser corrigido foi o que expôs, em produção, o quão perto a paginação estava de decidir sequências de vitória por sorteio de UUID.

## Números medidos contra produção, depois do deploy

Validação feita direto em produção após os dois commits ([[2026-09-16 f18aab2 - paginacao-e-ordem|f18aab2]] e [[2026-09-16 705fdac - horario-nao-congela|705fdac]]) irem ao ar:

- **1073 partidas** trazidas pela paginação (1075 no banco menos as 2 ao vivo que o Rodrigo cancelou no meio da validação), **zero `id` duplicado** na fronteira entre páginas, ordem por `played_at` correta.
- A última partida que o app enxerga passou de **15/09 21:24** para **16/09 03:23** — as partidas mais recentes, que a página de 1000 linhas vinha escondendo, voltaram a aparecer.
- **46 lotes** de `played_at` empatado em produção; **12 deles sairiam fora de ordem cronológica** sem o desempate por `created_at`. Em homologação eram só 5 de 10 lotes — o risco real em produção era maior do que a validação em hml sugeria.

> [!warning] Limitação honesta
> O Tabela não conseguiu exibir, no dado real de hml, um `curStreak` de fato alterado pela reordenação — o impacto foi **provado em teste determinista** (`src/domain/stats.test.js:30`, cenário construído), não reproduzido ao vivo no dado de homologação. O embaralhamento nos lotes reais existe (12 de 46 em produção), mas não foi isolado o caso específico em que ele muda um streak exibido a alguém. Em produção os lotes são bem maiores que em hml, então o risco de impacto visível é maior, não menor — mas ainda não observado diretamente.

Relacionado: [[2026-09-16 - Paginacao e ordem deterministica das partidas]] · [[2026-09-16 - Horario congelado no formulario de partida]] · [[Estatísticas e Ranking]] · [[Diario de Trabalho]]
