---
tags: [registro, moc]
---
# Diário de Trabalho

Índice cronológico invertido (mais recente primeiro) das sessões de trabalho registradas no vault.

- [[2026-09-16 - Mesas desligaveis (tablesEnabled)]] — ✅ APROVADO na reconferência final do Prumo (os 2 achados médios corrigidos via recomposição da fila em `buildQueue`; ressalva baixa no teste de madrugada de `dayScore` segue aberta). 168/168 testes, build e diff check verdes; falta só o commit.
- [[2026-09-16 - Encadeamento paginacao e horario congelado]] — como o horário congelado alimentou a instabilidade de ordenação; números medidos contra produção pós-deploy (1073 partidas, zero id duplicado, 46 lotes empatados/12 fora de ordem).
- [[2026-09-16 705fdac - horario-nao-congela]] — commit que corrige o horário congelado; Prumo aprovado sem ressalvas, 148 testes e build verdes.
- [[2026-09-16 - Horario congelado no formulario de partida]] — `StartMatchPanel` congelava o horário quando o formulário não desmontava; corrigido com `playedAtISO`.
- [[2026-09-16 f18aab2 - paginacao-e-ordem]] — commit que fecha a revisão de paginação/ordem; Prumo aprovou sem ressalvas, 148 testes e build verdes.
- [[2026-09-16 - Paginacao e ordem deterministica das partidas]] — ✅ APROVADO SEM RESSALVAS na reconferência final do Prumo (achado alto original: desempate por UUID reordenava partidas e alterava `curStreak`, corrigido). Fecha [[AUD-10 Achados latentes e menores|L4]]. 148/148 testes, build e diff check verdes.
- [[2026-09-15 - Cards MESA-01 MESA-02 MESA-03]] — triagem do Súmula: MESA-01 (sugerir dupla inteira, aguarda decisão de UX) e MESA-02 (fechar lacuna de teste) no Backlog; MESA-03 (QA ao vivo contra hml, bloqueante pro push) em QA.
- [[2026-09-15 790f1ce - mesas-livres]] — commit que fecha a revisão de mesas livres; Prumo aprovou com ressalva baixa, 119 testes e build verdes.
- [[2026-09-15 - Mesas livres no formulario de partida]] — ✅ APROVADO COM RESSALVAS pelo Prumo na reconferência (os 2 bloqueios corrigidos; ressalva baixa de cobertura de teste), entregue no commit acima.
- [[2026-09-15 6fc6ad8 - grid-no-painel]] — commit que fechou o pedido de grid no painel; Prumo sem achados, 105 testes e build verdes.
- [[2026-09-15 - Pedido de mudança - grid no painel]] — ✅ entregue no commit acima; pedido do Rodrigo para grid ≥2 colunas nas partidas ao vivo e `StartMatchPanel`/`QueuePanel` lado a lado acima de 768px.
- [[2026-08-20 - Correções da auditoria de 20-08]] — correção de 10 dos 12 achados da [[Auditoria 2026-08-20]]; AUD-01 aceito conscientemente, AUD-09 pendente de decisão.

Relacionado: [[Home]] · [[Auditoria 2026-08-20]]
