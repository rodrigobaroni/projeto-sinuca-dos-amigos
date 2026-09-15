---
tags: [registro, sessão, kanban]
data: 2026-09-15
---
# 2026-09-15 — Cards MESA-01, MESA-02, MESA-03 (triagem do Súmula)

Três cards criados pelo Súmula a partir do relato do Pessoal, cobrindo o que sobrou da feature de mesas (fila + seletor de mesa no formulário de partida). Nenhum bloqueia o que já está commitado (`487d07d`, `6fc6ad8`, `790f1ce`); sem push pra produção ainda; sem migração pendente.

## MESA-01 — Sugerir a dupla inteira no 2x2, não só o jogador 1

**Coluna**: Backlog

**Contexto**: ao escolher uma mesa no formulário de iniciar partida, o lado A é preenchido com quem está segurando a mesa (ver [[2026-09-15 - Mesas livres no formulario de partida]]). No 2x2 quem segura a mesa é a dupla, mas hoje só um dos dois jogadores é preenchido automaticamente — o Tabela não extrapolou porque o pedido original dizia "jogador 1", e fez certo em perguntar antes de assumir escopo maior.

**Consequência de não corrigir**: em noite de dupla, o admin refaz metade do trabalho de preenchimento a cada rodada.

**Comportamento esperado**: ao selecionar mesa numa partida 2x2, os dois jogadores da dupla que segura a mesa são preenchidos automaticamente no lado A (hoje só o primeiro é).

**Spec técnica**: mexe no `onChange` do `<select>` de mesa em `StartMatchPanel` (`src/views/AdminView.jsx`) e provavelmente em `tableHolderSuggestion` (`src/domain/queue.js:72-83`), que hoje devolve um único id. Tamanho pequeno.

**Restrição**: ⚠️ **decisão de produto pendente do Rodrigo** — não iniciar implementação antes de definir a UX exata (ex.: qual dupla sugerir quando o histórico for ambíguo, holder mudou de parceiro entre partidas, etc.).

**Fora de escopo**: comportamento do 1x1 — já funciona, não mexer.

**Definition of Done**: ao selecionar mesa em partida 2x2, os dois jogadores do lado A (dupla que segura a mesa) são preenchidos automaticamente; teste cobrindo o cenário de dupla em `tableHolderSuggestion`.

**Responsável**: pendente de decisão do Rodrigo; depois, Mira planeja e Tabela implementa.

**Commit/PR**: n/a — ainda não iniciado.

## MESA-02 — Fechar a lacuna de teste da derivação por modo

**Coluna**: Backlog

**Contexto**: ressalva do Prumo na revisão do commit `790f1ce`, aceita como não bloqueante (ver [[2026-09-15 - Mesas livres no formulario de partida]], seção "Reconferência final"). O teste novo em `src/domain/queue.test.js` usa arrays fixos: prova o helper `tableHolderSuggestion`, mas não exercita a derivação `requiredSlots.filter(...)` dentro do `onChange` do `StartMatchPanel` (`src/views/AdminView.jsx:459`), que é justamente o trecho que corrige o bug de 2x2→1x1 (resíduo em A2 matando a sugestão).

**Risco de não corrigir**: se alguém mexer naquela linha, nenhum teste quebra hoje.

**Spec técnica** (caminho sugerido pelo próprio Prumo): extrair a derivação `requiredSlots.filter(...)` para uma função pura em `src/domain/` (dentro de `queue.js` ou módulo novo) e testá-la isoladamente, cobrindo o cenário 2x2→1x1 com resíduo em A2.

**Fora de escopo**: qualquer mudança de comportamento visível — é só fechar cobertura de teste de um trecho já correto.

**Definition of Done**: função pura extraída e usada pelo `onChange`; teste unitário novo que quebra se a lógica de filtro de slots regredir no caso 2x2→1x1.

**Responsável**: Tabela — mudança pequena e sem decisão de design, pode implementar direto.

**Commit/PR**: referência ao `790f1ce` (onde a ressalva foi levantada).

## MESA-03 — QA do grid e do seletor de mesa no painel logado

**Coluna**: QA

**Contexto**: a fila (commit `487d07d`) já teve QA ao vivo completo pelo Efeito. O grid (`6fc6ad8`) e o seletor de mesa (`790f1ce`) só foram verificados pelo Tabela em harness React com props falsas — bom sinal, mas não é o app inteiro: sem Supabase real, sem login, sem realtime de verdade. Revisão de código desses commits já está feita (ver MESA-02 acima, sobre a ressalva do Prumo).

**Spec técnica**: validar no painel logado contra o [[Banco de Homologação|ambiente de homologação (hml)]].

**Definition of Done**:
- Grid verificado em largura de iPad e em 390px.
- Seletor de mesa verificado com duas mesas e partidas reais entrando e saindo da fila.
- Tudo contra hml, com Supabase, login e realtime reais — não harness com props falsas.

**Restrição**: isso precisa acontecer **antes** de qualquer push pra produção dos commits `6fc6ad8` e `790f1ce`.

**Fora de escopo**: novas funcionalidades — é QA de regressão do que já foi commitado.

**Responsável**: Efeito.

**Commit/PR**: `6fc6ad8`, `790f1ce`.

Relacionado: [[Kanban]] · [[2026-09-15 - Mesas livres no formulario de partida]] · [[Diario de Trabalho]]
