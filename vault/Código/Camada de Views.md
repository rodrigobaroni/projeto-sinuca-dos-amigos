---
tags: [código]
---
# Camada de Views

Todas em `src/views/`. Recebem dados por prop; nenhuma faz I/O direto (exceto `AdminView`, que recebe o `repo` para login e operações da partida ao vivo).

## `RankingView.jsx` (316)
Duas seções: **temporada inteira** e **painel do [[Dia de Jogatina]]**, com alternância 1x1 / 2x2. Recalcula estatísticas para a janela do dia em vez de filtrar o ranking geral — correto.
Também gera a imagem de compartilhamento (`shareSummary`), com fallback para download quando `navigator.share` não existe. Tem guarda contra clique duplo (`isSharing`).

> [!success] Crash de data vazia corrigido em 2026-08-20
> Limpar o campo de data não derruba mais a árvore: `gameDayRange("")` devolve janela vazia em vez de estourar, e há um `ErrorBoundary` na raiz (`main.jsx`) como rede de segurança para qualquer exceção futura de render. Ver [[AUD-11 Limpar a data derruba o app]].

## `PlayerView.jsx` (800)
A view mais densa: perfil, evolução ao longo do tempo, confrontos, parceiros de dupla, filtros por mês e por dia.
Ordena explicitamente por data (`sort((a,b) => new Date(b.played_at) - new Date(a.played_at))`, linhas 53 e 321). Desde 2026-08-20 o array de partidas já chega ordenado por `sortByPlayedAt()` a partir do `App.jsx`, então essa ordenação local é redundante, mas inofensiva.

## `MatchesView.jsx` (48)
Histórico com filtro por nome. Usa `finished.slice().reverse()` — assume ordem crescente. Desde 2026-08-20 essa suposição é garantida: o array chega ordenado por `sortByPlayedAt()` (ver [[AUD-05 Realtime quebra a ordem cronológica]]), inclusive quando o realtime insere uma partida retroativa.
Detalhe de navegação: está marcada como `hidden: true` em `constants.js:4`, então não aparece na barra inferior; só se chega nela por link interno.

## `RecordsView.jsx` (52)
Ver [[Records]] — dois dos recordes exibidos estão errados.

## `AdminView.jsx` (988)
Login, abas (Partida / Jogadores / Configurações / Logs) e todo o fluxo de [[Partida ao Vivo]]. 12 componentes internos num arquivo só.

## `RulesView.jsx` (25)
Texto estático das regras da casa.

## Padrões observados

✅ **Bom:** estado centralizado, views puras, atualização otimista com rollback (`persistMatch` recarrega tudo se o UPDATE falhar), confirmação antes de apagar partida, cleanup dos efeitos.

✅ **Corrigido em 2026-08-20:** o handler de apagar partida, antes duplicado literalmente em duas rotas do `App.jsx` (~25 linhas idênticas), virou uma função única (`deleteMatch`). Ver [[AUD-10 Achados latentes e menores]] (M5).

⚠️ **A vigiar:**
- `dangerouslySetInnerHTML` nos ícones da navegação (`App.jsx:327`) — o conteúdo vem de `constants.js`, é estático e não representa risco hoje, mas é um padrão que convida a acidente se alguém tornar os ícones dinâmicos.

Relacionado: [[Mapa do Código]] · [[Partida ao Vivo]] · [[2026-08-20 - Correções da auditoria de 20-08]]
