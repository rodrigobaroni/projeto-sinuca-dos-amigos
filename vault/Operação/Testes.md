---
tags: [operação, qualidade]
---
# Testes

## O estado real
**28 testes em 4 arquivos**, todos verdes, e `npm run test` funciona:

| Arquivo | Cobre |
| --- | --- |
| `src/domain/rules.test.js` | normalização de configuração, grupos, classificação de tacada, `foulReasonText` com a bola do log |
| `src/domain/stats.test.js` | estatísticas, ranking, resolução de vencedor via `winnerSide`, lavada sem `ball_log`, maratonista por dia de jogatina, ordem cronológica |
| `src/utils/date.test.js` | dia de jogatina, fronteira das 12:00, `gameDayRange("")`, fuso fixo do produto |
| `src/utils/player.test.js` | iniciais e cor |

```bash
$ npm run test
Test Files  4 passed (4)
     Tests  28 passed (28)
```

> [!success] Comando corrigido em 2026-08-20
> `package.json` agora tem `"test": "vitest run --config vite.config.js"` — antes o Vitest carregava `vite.config.ts` (que importa um pacote não instalado), e nenhum teste chegava a executar. `vite.config.ts` continua no repo, ver [[AUD-09 Dois apps e dois vite.config no mesmo repo]]. Detalhe da correção em [[AUD-02 A suíte de testes não roda]].

## Fusos cobertos
A suíte roda verde em 5 `TZ`: `America/Sao_Paulo`, `UTC`, `Asia/Tokyo`, `Pacific/Kiritimati`, `America/Los_Angeles`. Ver [[AUD-12 Dia de jogatina depende do fuso do navegador]].

## O que ainda não está coberto
- Qualquer coisa em `views/` — não há teste de componente
- Escrita atômica do `ball_log` multi-mesa (não implementada, ver [[AUD-06 Perda de bolas no ball_log]])
- Configuração de jogo persistida no banco (não implementada, ver [[AUD-08 Configurações vivem no localStorage]])

> [!success] Correções de 2026-08-20 nasceram com teste de regressão
> Para cada achado corrigido nesta sessão foi escrito o teste que falhava antes da correção — foi assim que a suíte foi de 18 para 28 testes. Ver [[2026-08-20 - Correções da auditoria de 20-08]].

Relacionado: [[Camada de Domínio]] · [[Auditoria 2026-08-20]] · [[2026-08-20 - Correções da auditoria de 20-08]]
