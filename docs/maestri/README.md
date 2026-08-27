# Setup do time Maestri — passos que só o Rodrigo faz (UI)

O design aprovado está em
[`docs/superpowers/specs/2026-08-26-time-maestri-sinuca-design.md`](../superpowers/specs/2026-08-26-time-maestri-sinuca-design.md).
O prompt para colar na janela do orquestrador está em
[`PROMPT-ORQUESTRADOR.md`](PROMPT-ORQUESTRADOR.md) — cole o arquivo **inteiro**.

## Antes de colar o prompt

1. **Criar os presets de licença** (uma vez, nas configurações de presets do Maestri):
   - **Claude Pessoal** → comando: `CLAUDE_CONFIG_DIR="$HOME/.claude-pessoal" claude`
     (conta rodrigobaroni@me.com)
   - **Claude Empresa** → comando: `claude` (config padrão, conta lftm)
   - Conferir se existe um preset **Codex** (CLI `codex`, assinatura ChatGPT). Se não,
     criar também.
   - Regra daqui pra frente: projeto pessoal → janelas do preset pessoal; projeto
     lftm/mappi → preset empresa. A licença é decidida na criação da janela.

2. **Abrir (ou criar) o workspace da sinuca** com raiz em
   `~/Developer/Projeto Sinuca dos amigos`.

3. **Abrir um terminal novo com o preset "Claude Pessoal"** nesse workspace — essa será
   a janela do Orquestrador. (Janela criada com outro preset roda na conta errada.)

4. **Ligar o Maestro Mode** nessa janela (toggle no canvas). Sem isso, parte dos
   comandos de orquestração é bloqueada.

5. **Colar o conteúdo de `PROMPT-ORQUESTRADOR.md`** na janela e deixar o bootstrap
   rodar. Ele reaproveita janelas ociosas, recruta as faltantes, cria papéis, conexões,
   o Kanban e a nota-espelho, e avisa quando terminar.

## Depois do bootstrap

6. **Obsidian**: abrir o vault `~/Developer/Projeto Sinuca dos amigos/vault` e instalar
   o plugin da comunidade **Kanban** (Settings → Community plugins → Browse → "Kanban").
   O quadro fica em `vault/Operação/Kanban.md`.

7. **Uso diário**: fale só com o Orquestrador. Ele sempre roda o brainstorm antes de
   qualquer feature. Priorize movendo cards para **A Fazer** no Kanban; acompanhe o
   resumo na nota "Quadro — Sinuca" do canvas.
