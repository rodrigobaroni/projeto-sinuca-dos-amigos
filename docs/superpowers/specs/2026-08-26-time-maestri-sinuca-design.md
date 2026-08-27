# Design — Time Maestri para o "Projeto Sinuca dos Amigos"

> Aprovado pelo Rodrigo em 2026-08-26. Artefatos derivados: `docs/maestri/PROMPT-ORQUESTRADOR.md`
> (prompt de bootstrap) e `docs/maestri/README.md` (setup na UI do Maestri).

## Contexto e problema

O time de agentes anterior (arquiteto, implementador, revisor-codex, qa) foi criado como
*subagents* do Claude Code em `~/.claude/agents/` — roda dentro de uma única sessão e não
usa as janelas do canvas do Maestri. Este design migra o fluxo para o modelo nativo do
Maestri: cada papel é um terminal no canvas, com role preset próprio, conversando via
`maestri ask/check`.

## Decisões (com o Rodrigo, 2026-08-26)

1. **Licença**: o workspace da sinuca usa a conta pessoal (`rodrigobaroni@me.com`,
   `CLAUDE_CONFIG_DIR=~/.claude-pessoal`). A config padrão `~/.claude`
   (rodrigo.baroni@lftm.com.br) fica para projetos da empresa (lftm/mappi).
2. **Formato**: time completo no canvas, mas com **ativação por fase** — no máximo 2
   janelas Claude trabalhando simultaneamente (cota Max 5x). O Revisor roda em Codex/GPT-5
   (assinatura ChatGPT) e não conta na cota.
3. **Kanban**: fonte da verdade em `vault/Operação/Kanban.md` (formato do plugin Kanban do
   Obsidian) + nota-espelho "Quadro — Sinuca" no canvas do Maestri.
4. **Rigor**: modo produção — plano auditado e diff revisado pelo Codex, QA antes de
   finalizar.

## Topologia do workspace

Workspace enraizado em `~/Developer/Projeto Sinuca dos amigos`, 9 janelas:

| Janela | Papel | Motor |
|---|---|---|
| Orquestrador | Tech lead; único interlocutor do Rodrigo; roda brainstorm; coordena fases | Claude (pessoal) |
| PM/PO | Mini-PRD com critérios de aceite | Claude (pessoal) |
| UI/UX | Fluxos/wireframes; guardião do `DESIGN-SYSTEM.md` | Claude (pessoal) |
| Arquiteto | Plano técnico em tarefas pequenas e verificáveis | Claude (pessoal) |
| Dev Front | React + Vite em `src/` | Claude (pessoal) |
| Dev Back | Supabase: SQL, migrações, RLS, auth | Claude (pessoal) |
| QA | Suíte vitest + portais web/mobile/device | Claude (pessoal) |
| Documentador | Dono do vault, do Kanban.md e da nota-espelho | Claude (pessoal) |
| Revisor | Audita planos e revisa diffs; veredito APROVADO/BLOQUEADO | Codex/GPT-5 |

Cada papel é um role preset do workspace (`maestri role create`), com colaboração explícita
no prompt (quem chamar via `maestri ask`, que nota ler, que portal dirigir). Codinomes das
janelas são inventados pelo Orquestrador (nome ≠ papel). Janelas ociosas existentes são
reaproveitadas via `maestri recruit --replace` / `maestri role assign` — nunca duplicadas.

Conexões diretas (fora do hub do Orquestrador): Revisor↔Arquiteto e Revisor↔Devs (iteração
de auditoria/revisão sem intermediário), Documentador↔nota "Quadro — Sinuca", QA↔portais
(criados pelo próprio QA no primeiro uso).

## Licenças: presets

Dois presets de terminal na UI do Maestri, criados uma vez pelo Rodrigo:

- **Claude Pessoal** → `CLAUDE_CONFIG_DIR="$HOME/.claude-pessoal" claude`
- **Claude Empresa** → `claude` (config padrão)

A licença é decidida na criação da janela. A própria janela do Orquestrador deve nascer do
preset pessoal. Fallback do bootstrap sem preset: `--command` com o `CLAUDE_CONFIG_DIR`
inline. `~/.claude-pessoal` já contém as skills do Maestri.

## Fluxo de uma feature (modo produção)

1. **Brainstorm** — Rodrigo pede; Orquestrador roda a skill `brainstorm` até alinhar escopo.
2. **Descoberta** — PM/PO escreve mini-PRD; UI/UX entra se houver interface nova.
3. **Plano** — Arquiteto planeja → Revisor audita. BLOQUEADO volta ao Arquiteto.
4. **Build** — Dev Front e/ou Dev Back implementam (paralelo só se as frentes não se tocam).
5. **Revisão** — Revisor revisa o diff; devs corrigem até liberar.
6. **QA** — suíte + exploração via portais.
7. **Encerramento** — Documentador registra no vault, move card, atualiza nota-espelho;
   Orquestrador reporta ao Rodrigo.

Regras transversais: máx. 2 janelas Claude ativas; divergência Claude×Codex sobe ao
Rodrigo; trivialidades (typo, um arquivo) vão direto ao dev, mas a revisão de diff
permanece.

## Kanban + documentação

- `vault/Operação/Kanban.md`, frontmatter `kanban-plugin: board`, colunas
  Backlog / A Fazer / Em Andamento / Em Revisão / QA / Concluído.
- Rodrigo prioriza movendo cards para "A Fazer"; Orquestrador relê o board a cada demanda.
- Só o Documentador escreve no board e no vault (evita corrida de escrita).
- Nota-espelho "Quadro — Sinuca" no canvas, atualizada a cada transição de fase.
- Plugin "Kanban" (community plugin) instalado pelo Rodrigo no vault do projeto.

## QA: janela web e devices

- Portal "Preview Desktop" → `npm run dev` (Vite em `http://127.0.0.1:5173`).
- Portal "Preview Mobile" → mesmo URL, `--size 390x844`.
- Devices reais sob demanda: `maestri portal devices` → simulador iOS como portal.

## Fora do escopo (v1)

Rotinas agendadas, floors git-isolados e replicação do workspace como template
(`maestri workspace create --from "Sinuca"`) ficam para depois.
