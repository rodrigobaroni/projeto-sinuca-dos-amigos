---
tags: [auditoria, achado, domínio]
severidade: ALTO
status: corrigido
---
# AUD-04 — "Maratonista" usa dia UTC em vez do dia de jogatina

> [!success] Corrigido em 2026-08-20
> `marathonRecord` (`src/domain/stats.js`) passou a usar `gameDayKey()`. Efeito medido em homologação: o record mudou de "Felipe Kchevi, 25" para "Rodrigo Baroni, 40 (noite de 23/06)" — o valor correto. Ainda não commitado. Ver [[2026-08-20 - Correções da auditoria de 20-08]].

**Severidade:** 🟠 ALTO · **Onde:** `src/domain/stats.js:231` · **Visível ao usuário:** sim, na tela Records

## O problema
```js
const day = new Date(match.played_at).toISOString().slice(0, 10);
```

O projeto inteiro tem um conceito próprio de dia — o [[Dia de Jogatina]], das 12h às 12h, justamente porque a jogatina vira a madrugada. `marathonRecord` ignora isso e usa o **dia de calendário UTC**.

No fuso do Brasil (UTC−3), toda partida a partir das **21h locais** cai no dia UTC seguinte. Como o pico de jogo é 18h–23h, a mesma noite é partida ao meio.

## Cenário concreto, com dados reais
```
Record exibido hoje:  Felipe Kchevi   — 25 partidas
Correto:              Rodrigo Baroni  — 40 partidas (noite de 2026-06-23)
```

Holder errado **e** número errado. E não é um caso de borda:
```
11 das 14 noites de jogatina caem em 2 dias UTC diferentes
```

Distribuição por hora local que explica o efeito:
```
0h:32  1h:18  ...  18h:46  19h:58  20h:61  21h:63  22h:44  23h:41
```

## Correção
Usar a função que o projeto já tem:
```js
import { gameDayKey } from "../utils/date.js";
// ...
const day = gameDayKey(match.played_at);
```

Decidir junto: `marathonRecord` conta partidas 1x1 **e** 2x2, enquanto o record "mais jogos" conta só 1x1. Dois recordes de quantidade com regras diferentes confundem. Ver [[Records]].

Teste de regressão sugerido: duas partidas às 23h e à 01h locais devem cair no **mesmo** dia e somar 2 para o jogador.

Relacionado: [[Dia de Jogatina]] · [[Records]] · [[Como Reproduzir os Achados]]
