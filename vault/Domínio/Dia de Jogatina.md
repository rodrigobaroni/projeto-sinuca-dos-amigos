---
tags: [domínio]
---
# Dia de Jogatina

O conceito mais específico deste produto. Implementado em `src/utils/date.js`.

## O problema que resolve
A galera joga à noite e a jogatina vira a madrugada. Uma partida às 00:30 pertence, na cabeça de todo mundo, à noite **anterior**. Um "dia" de calendário partiria a mesma noite em dois.

Os dados de homologação confirmam: das 406 partidas, **32 aconteceram entre 00h e 01h** e 18 entre 01h e 02h. O pico é 18h–23h.

```
0h:32  1h:18  10h:2  11h:1  15h:8  16h:14  17h:18
18h:46 19h:58 20h:61 21h:63 22h:44 23h:41
```

## A regra
**Um dia de jogatina vai das 12:00 de um dia até as 12:00 do dia seguinte.**

```js
export function gameDayKey(ts) {
  const parts = zonedParts(ts);   // Intl.DateTimeFormat no fuso America/Sao_Paulo
  if (!parts) return "";
  const key = `${parts.year}-${parts.month}-${parts.day}`;
  return Number(parts.hour) < 12 ? shiftDayKey(key, -1) : key;
}
```
Antes do meio-dia → pertence ao dia anterior. Meio-dia ou depois → pertence ao próprio dia.

> [!success] Fuso fixo no produto desde 2026-08-20
> O cálculo usa `Intl.DateTimeFormat` com `timeZone: "America/Sao_Paulo"` (`TIMEZONE` em `date.js`), não mais `getHours()`/`setDate()` do navegador. Ver correção de [[AUD-12 Dia de jogatina depende do fuso do navegador]] mais abaixo — a armadilha correspondente foi removida desta nota.

## As funções
| Função | O que faz |
| --- | --- |
| `gameDayKey(ts)` | Dado um instante, devolve a chave `YYYY-MM-DD` da noite a que ele pertence, no fuso do produto |
| `gameDayRange(dia)` | Devolve `{ start, end }` — as 12:00 do dia e as 12:00 do seguinte, como instantes ISO absolutos. `gameDayRange("")` devolve `{ start: "", end: "" }` em vez de estourar |
| `matchesInRange(matches, start, end)` | Filtra partidas dentro da janela, com fim **exclusivo** (`<`) — as 12:00 em ponto pertencem só ao dia que começa |
| `defaultGameDay(matches)` | Escolhe a noite a exibir por padrão: a da partida com o **maior** `played_at` do conjunto — não assume array ordenado |
| `sortByPlayedAt(matches)` | Ordem cronológica estável por `played_at`, usada onde a ordem importa (sequências, histórico, dia padrão) |
| `toDatetimeLocal` / `toDateInputValue` | Convertem `Date` para o formato dos inputs HTML no fuso do produto |

## Onde é usado
- [[Estatísticas e Ranking]] — o painel "dia de jogatina" da tela de Ranking (`RankingView.jsx:20-28`).
- Perfil do jogador — agrupamento por noite (`PlayerView.jsx:57`).
- Painel ao vivo — placar do dia entre os dois jogadores (`AdminView.jsx:570`).

## Armadilhas corrigidas em 2026-08-20

> [!success] `defaultGameDay` não confia mais na ordem do array
> Antes lia `matches[matches.length - 1]`, assumindo ordem crescente — uma partida retroativa chegando pelo [[Tempo Real|realtime]] fazia o painel de todo mundo pular para a data errada (reproduzido: `2026-07-27` → `2026-06-23`). Agora percorre o conjunto e pega o **maior** `played_at`. Ver [[AUD-05 Realtime quebra a ordem cronológica]].

> [!success] O dia não depende mais do fuso do navegador
> `gameDayKey` usa `Intl.DateTimeFormat` fixado em `America/Sao_Paulo`, não mais `getHours()`/`setDate()` do fuso de quem está olhando. Ver [[AUD-12 Dia de jogatina depende do fuso do navegador]].

> [!success] Fronteira exata do meio-dia corrigida
> `matchesInRange` agora usa fim **exclusivo** (`<`) em vez de `<=`. Uma partida às 12:00:00.000 entra só no dia que começa. Era um risco latente (0 ocorrências nos dados reais), não um bug ativo — ver [[AUD-10 Achados latentes e menores]].

> [!success] `gameDayRange("")` não derruba mais o app
> Devolve `{ start: "", end: "" }` em vez de estourar `RangeError`. Além disso, `src/components/ErrorBoundary.jsx` foi montado na raiz (`main.jsx`): qualquer exceção futura de render vira mensagem, não tela branca. Ver [[AUD-11 Limpar a data derruba o app]].

Relacionado: [[Estatísticas e Ranking]] · [[Records]] · [[2026-08-20 - Correções da auditoria de 20-08]]
