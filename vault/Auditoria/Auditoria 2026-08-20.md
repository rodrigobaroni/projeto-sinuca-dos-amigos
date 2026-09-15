---
tags: [auditoria, moc]
data: 2026-08-20
---
# Auditoria — 20/08/2026

Análise completa do app web, executada contra o [[Banco de Homologação]] (11 jogadores, 406 partidas reais). Revisão cruzada independente por um segundo modelo (Codex/GPT-5), que confirmou os achados de domínio e levantou o [[AUD-11 Limpar a data derruba o app|AUD-11]].

> [!abstract] Resumo em uma linha
> O **ranking está correto**. O que estava quebrado — dois **records**, a **suíte de testes**, ordenação do realtime, duplo clique, crash com data vazia, fuso do navegador — **foi corrigido em 2026-08-20** (ver [[2026-08-20 - Correções da auditoria de 20-08]]). O **buraco de permissão** (AUD-01) foi aceito conscientemente enquanto o app rodar só entre amigos.

## Achados

| # | Achado | Severidade | Status |
| --- | --- | --- | --- |
| [[AUD-01 Cadastro aberto concede escrita total\|AUD-01]] | Cadastro aberto concede escrita total | 🔴 CRÍTICO | ⏸️ **risco aceito** — reabrir antes de ter clientes |
| [[AUD-02 A suíte de testes não roda\|AUD-02]] | A suíte de testes não roda | 🟠 ALTO | ✅ corrigido em 20/08 |
| [[AUD-03 Record lavador é fictício\|AUD-03]] | Record "lavador / 7x0" é fictício | 🟠 ALTO | ✅ corrigido em 20/08 — 140 → 0 |
| [[AUD-04 Maratonista usa dia UTC\|AUD-04]] | "Maratonista" usa dia UTC | 🟠 ALTO | ✅ corrigido em 20/08 |
| [[AUD-05 Realtime quebra a ordem cronológica\|AUD-05]] | Realtime quebra a ordem cronológica | 🟠 ALTO | ✅ corrigido em 20/08 |
| [[AUD-06 Perda de bolas no ball_log\|AUD-06]] | Perda de bolas no `ball_log` | 🟠 ALTO | 🟡 parcial em 20/08 — falta multi-mesa |
| [[AUD-11 Limpar a data derruba o app\|AUD-11]] | Limpar o campo de data derruba o app | 🟠 ALTO | ✅ corrigido em 20/08 |
| [[AUD-07 Duplo clique cria partida duplicada\|AUD-07]] | Duplo clique cria partida duplicada | 🟡 MÉDIO | ✅ corrigido em 20/08 |
| [[AUD-08 Configurações vivem no localStorage\|AUD-08]] | Configurações de jogo no `localStorage` | 🟡 MÉDIO | 🟡 parcial em 20/08 — segue no localStorage |
| [[AUD-09 Dois apps e dois vite.config no mesmo repo\|AUD-09]] | Dois apps no mesmo repositório | 🟡 MÉDIO | ⏸️ aberto — precisa de decisão |
| [[AUD-12 Dia de jogatina depende do fuso do navegador\|AUD-12]] | Dia de jogatina depende do fuso do navegador | 🟡 MÉDIO | ✅ corrigido em 20/08 |
| [[AUD-10 Achados latentes e menores\|AUD-10]] | 4 latentes + 10 menores | 🔵 BAIXO | 🟡 parcial — L1, L2, M1, M5 corrigidos em 20/08 |

Reprodução passo a passo: [[Como Reproduzir os Achados]]. Correções: [[2026-08-20 - Correções da auditoria de 20-08]].

## Os dois números que mais importam

**Record "lavador / 7x0"** — exibido hoje: *Rodrigo Baroni, 140 lavadas*. Contando só partidas que têm registro de bolas: **0**. Como 83% das partidas têm `ball_log` vazio e o código lê "sem bolas registradas" como "adversário não encaçapou nada", o recorde inteiro é ruído.

**Record "maratonista"** — exibido hoje: *Felipe Kchevi, 25 partidas*. Correto pelo [[Dia de Jogatina]]: **Rodrigo Baroni, 40 partidas** na noite de 23/06. O cálculo usa dia UTC, e 11 das 14 noites de jogatina atravessam a virada do dia UTC.

## O que está saudável

Vale registrar, porque é bastante coisa:

- **A RLS funciona como escrita.** Escrita anônima devolve 401 nas três tabelas; `audit_logs` não vaza para anônimo.
- **Nenhum segredo no repositório.** `.env.local` e `.env.hml.local` fora do versionamento, `dist/` não rastreado, nenhuma `service_role` key.
- **Os dados de homologação estão íntegros.** Zero partidas órfãs, zero `live` travadas, zero vencedor inconsistente.
- **O ranking principal está certo** — conferido contra os 406 registros.
- **A arquitetura é boa.** Domínio puro e testável, estado centralizado em `App.jsx`, acesso ao banco isolado num repositório só.
- **O build funciona** (~600ms) e o app sobe corretamente contra homologação.
- **Boas defesas já existentes:** validação das env vars com fallback amigável, degradação elegante quando clipes falham, auditoria otimista com rollback, confirmação antes de apagar partida, guarda de clique duplo no compartilhamento.
- **`normalizeGameSettings`** é defensiva de verdade, inclusive migrando uma chave legada.

## Ordem de ataque

**Decidido não corrigir agora:** [[AUD-01 Cadastro aberto concede escrita total]] — risco aceito enquanto o app for só entre amigos. Reabrir antes de qualquer cliente externo.

**Correções aplicadas em 2026-08-20** (detalhe completo em [[2026-08-20 - Correções da auditoria de 20-08]]):
1. Consertar `npm run test` — [[AUD-02 A suíte de testes não roda]]. ✅
2. `marathonRecord` passa a usar `gameDayKey` — [[AUD-04 Maratonista usa dia UTC]]. ✅
3. `specialRecordCounts` ignora partida sem `ball_log` — [[AUD-03 Record lavador é fictício]]. ✅
4. Ordenar por `played_at` no handler do realtime — [[AUD-05 Realtime quebra a ordem cronológica]]. ✅
5. Trava de clique duplo em "Iniciar partida" e "Definir vencedor" — [[AUD-07 Duplo clique cria partida duplicada]]. ✅
6. Guarda em `gameDayRange` + error boundary na raiz — [[AUD-11 Limpar a data derruba o app]]. ✅
7. Fixar o fuso do produto em `date.js` e rodar a suíte sob 5 `TZ` — [[AUD-12 Dia de jogatina depende do fuso do navegador]]. ✅
8. Derrota fantasma sem `winner_id`, fronteira das 12:00, texto de falta e handler de apagar duplicado — [[AUD-10 Achados latentes e menores]] (L1, L2, M1, M5). ✅

**Parcial em 2026-08-20:**
9. Trava de UI no `ball_log` (resolve o mesmo cliente) — [[AUD-06 Perda de bolas no ball_log]]. Falta a escrita atômica multi-mesa.
10. `loadGameSettings` memoizado — [[AUD-08 Configurações vivem no localStorage]]. Configuração continua no `localStorage`.

**Ainda precisa de decisão:**
11. Policies amarradas ao admin de verdade — [[AUD-01 Cadastro aberto concede escrita total]].
12. Escrita atômica do `ball_log` (multi-mesa) — [[AUD-06 Perda de bolas no ball_log]].
13. Limpar o export do Figma — [[AUD-09 Dois apps e dois vite.config no mesmo repo]].
14. Configuração de jogo no banco, com snapshot na partida — [[AUD-08 Configurações vivem no localStorage]].

> [!tip] Escreva o teste antes da correção
> Foi o caminho seguido nesta sessão: a suíte foi de 18 para 28 testes, um de regressão por bug corrigido. Ver [[Testes]].

## Escopo desta auditoria
- ✅ Todo `src/` do app real, `schema.sql`, migrations, configuração de build e de ambiente
- ✅ Execução contra homologação: leitura, tentativa de escrita, configuração de auth, execução do domínio sobre os 406 registros
- ❌ Não auditado: o app fantasma em `src/app/` ([[Código Morto e Duplicado]]), o app iOS de clipes, `public/encacapei-*.html`
- ❌ Nenhuma task foi criada, conforme pedido

Relacionado: [[Home]] · [[Como Reproduzir os Achados]] · [[Testes]] · [[2026-08-20 - Correções da auditoria de 20-08]]
