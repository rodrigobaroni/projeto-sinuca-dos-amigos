---
tags: [registro, sessão]
data: 2026-08-20
---
# 2026-08-20 — Correções da auditoria de 20/08

> [!note] Estado no momento desta nota
> Mudança feita direto pelo Rodrigo (orquestrador), sem passar pelo par Mira → implementador. Revisão do Prumo **em andamento**, ainda sem veredito. Ainda **não commitada** — segue como alteração local no working tree (`git status`: `package.json`, `src/App.jsx`, `src/components/sheets.jsx`, `src/domain/rules.js`, `src/domain/rules.test.js`, `src/domain/stats.js`, `src/domain/stats.test.js`, `src/main.jsx`, `src/utils/date.js`, `src/utils/date.test.js`, `src/views/AdminView.jsx` modificados; `src/components/ErrorBoundary.jsx` novo). Quando o Rack commitar, criar a nota em `Registro/Commits/` e linkar aqui.

Sessão de correção dos achados da [[Auditoria 2026-08-20]] (12 achados, AUD-01 a AUD-12). A auditoria já estava documentada; esta sessão registra as correções.

## Decisão de produto — AUD-01

[[AUD-01 Cadastro aberto concede escrita total]] foi **aceito conscientemente** pelo Rodrigo, não corrigido. Motivo: o app hoje roda só entre amigos e o produto ainda está em desenvolvimento — o custo de um vândalo é baixo e conhecido. A nota AUD-01 já traz esse status.

> [!warning] Reabrir antes de qualquer cliente externo
> No momento em que existir um usuário fora da turma, isso volta a ser bloqueador de release.

## Correções aplicadas

| Achado | O que mudou | Onde |
| --- | --- | --- |
| [[AUD-02 A suíte de testes não roda]] | `"test"` no `package.json` passou a apontar `--config vite.config.js` explicitamente | `package.json:11` |
| [[AUD-03 Record lavador é fictício]] | `specialRecordCounts` só conta lavada se `ball_log` não estiver vazio | `src/domain/stats.js` |
| [[AUD-04 Maratonista usa dia UTC]] | `marathonRecord` usa `gameDayKey` (dia de jogatina) em vez de dia UTC | `src/domain/stats.js` |
| [[AUD-05 Realtime quebra a ordem cronológica]] | Novo `sortByPlayedAt()` em `date.js`, aplicado no handler de realtime do `App.jsx` e dentro de `computeStats`; `defaultGameDay` parou de assumir array ordenado | `src/utils/date.js`, `src/App.jsx`, `src/domain/stats.js` |
| [[AUD-07 Duplo clique cria partida duplicada]] | Trava de submissão em "Iniciar partida" (`StartMatchPanel`) e "Definir vencedor" (`SimpleLiveMatchPanel`) | `src/views/AdminView.jsx` |
| [[AUD-11 Limpar a data derruba o app]] | `gameDayRange("")` devolve janela vazia em vez de estourar `RangeError`; `ErrorBoundary` novo na raiz | `src/utils/date.js`, `src/components/ErrorBoundary.jsx` (novo), `src/main.jsx` |
| [[AUD-12 Dia de jogatina depende do fuso do navegador]] | `date.js` reescrito para usar fuso fixo do produto (`America/Sao_Paulo`) via `Intl.DateTimeFormat`, em vez de `getHours()`/`setDate()` do navegador | `src/utils/date.js` |
| L1 ([[AUD-10 Achados latentes e menores]]) | `computeStats`, `h2hRecords` e `specialRecordCounts` passaram a resolver vencedor/perdedor via `singlesOutcome()` (usa `winnerSide`) em vez de ler `winner_id` cru; partida sem vencedor definido é ignorada em vez de gerar derrota fantasma para `player_a` | `src/domain/stats.js` |
| L2 ([[AUD-10 Achados latentes e menores]]) | `matchesInRange` passou a usar fim exclusivo (`<`), então as 12:00 em ponto pertencem a um dia só | `src/utils/date.js` |
| M1 ([[AUD-10 Achados latentes e menores]]) | `foulReasonText(reason, ball)` recebe a bola da própria entrada do log em vez de um `defaultRules` fixo em `even-odd` — antes dizia sempre "bola 1 fora da hora" | `src/domain/rules.js`, `src/components/sheets.jsx` |
| M5 ([[AUD-10 Achados latentes e menores]]) | Handler de exclusão de partida, duplicado literalmente em duas views do `App.jsx`, virou uma função única (`deleteMatch`) | `src/App.jsx` |

## Correções parciais — ficou pendência

> [!success] AUD-06 — parcial
> `serialize()` no `LiveMatchPanel` (`AdminView.jsx`) impede escritas concorrentes de `ball_log` **no mesmo cliente** — resolve o duplo toque. **Não resolve** duas mesas anotando a mesma partida ao mesmo tempo: isso precisa de escrita atômica no banco (função SQL `append_ball`, já esboçada na nota do achado). Ficou de fora conscientemente.

> [!success] AUD-08 — parcial
> `loadGameSettings()` agora é memoizado com `useMemo` em `LiveMatchRouter` — parou de reparsear o `localStorage` e recriar `GameRules` a cada render. A configuração **continua** no `localStorage` por aparelho; mover para o banco (`app_settings` ou snapshot em `matches.settings`) ficou de fora, ainda precisa de decisão do Rodrigo.

## Não corrigido — precisa de decisão

- [[AUD-09 Dois apps e dois vite.config no mesmo repo]] — só o script de teste foi ajustado. Apagar o export do Figma (`src/app/`, `src/main.tsx`, `src/imports/`, `src/styles/`, `figma-export/`, etc.) não foi feito, precisa de decisão.
- AUD-06 e AUD-08 completos, conforme acima.

## Verificação
```
Test Files  4 passed (4)
     Tests  28 passed (28)
```
Eram 18 antes desta sessão ([[Testes]]); foram escritos testes de regressão para cada bug corrigido. Suíte verde em 5 fusos: `America/Sao_Paulo`, `UTC`, `Asia/Tokyo`, `Pacific/Kiritimati`, `America/Los_Angeles`. Build de produção ok. As correções do lavador (AUD-03) e do maratonista (AUD-04) foram validadas contra os 406 registros reais de [[Banco de Homologação|homologação]].

Relacionado: [[Auditoria 2026-08-20]] · [[Diario de Trabalho]] · [[Testes]] · [[Dia de Jogatina]] · [[Records]]
