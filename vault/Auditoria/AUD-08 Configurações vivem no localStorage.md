---
tags: [auditoria, achado, arquitetura]
severidade: MÉDIO
status: parcial
---
# AUD-08 — Configurações de jogo vivem no `localStorage`

> [!success] Parcial em 2026-08-20
> `loadGameSettings()` foi memoizado com `useMemo` em `LiveMatchRouter` — parou de reparsear o `localStorage` e recriar `GameRules` a cada render (o "agravante menor" descrito abaixo). A configuração **continua** no `localStorage` por aparelho: mover para o banco (mínimo, ou `app_settings` compartilhado) ficou de fora, ainda precisa de decisão do Rodrigo. Ainda não commitado. Ver [[2026-08-20 - Correções da auditoria de 20-08]].

**Severidade:** 🟡 MÉDIO · **Onde:** `src/views/AdminView.jsx:10-26`, `563-568`

## O problema
O modo de jogo, a bola de castigo e as cores do mata a mata são salvos em `localStorage` sob a chave `sinuca-game-settings`:

```js
function loadGameSettings() {
  const stored = JSON.parse(window.localStorage.getItem(GAME_SETTINGS_KEY) || "null");
  return normalizeGameSettings({ ...DEFAULT_GAME_SETTINGS, ...(stored || {}) });
}
```

E a partida **não registra sob qual modo foi jogada** — não existe coluna para isso em `matches`.

## Por que isso importa agora
O produto suporta [[Partida ao Vivo|várias mesas simultâneas]], cada uma operada de um aparelho. Cada aparelho tem seu próprio `localStorage`.

## Cenário concreto de falha
1. Mesa 1 (celular do Rodrigo) está em `solids-stripes`, bola de castigo 8.
2. Mesa 2 (tablet da casa) está no padrão `even-odd`, bola de castigo 1.
3. As duas anotam partidas. `classifyPot()` roda com regras diferentes e grava `type` e `reason` diferentes no `ball_log` para situações equivalentes.
4. Meses depois, ninguém consegue dizer sob qual regra cada partida foi jogada. Os records derivados de falta e trunfo misturam duas realidades.

Agravante menor: `LiveMatchRouter` chama `loadGameSettings()` **a cada render**, fazendo um `JSON.parse` no localStorage repetidamente e recriando o objeto `GameRules` toda vez.

Consequência relacionada: `foulReasonText()` (`rules.js:233`) usa um `defaultRules` fixo em `even-odd`, então a mensagem de trunfo diz **"bola 1 fora da hora"** mesmo numa partida cuja bola de castigo é a 8. Confirmado em execução:
```
configured-penalty 8   detail-text: "bola 1 fora da hora"
```

## Correção
**Mínimo:** gravar as configurações usadas na própria partida, num campo `settings jsonb` em `matches`, no momento do `startMatch`. A partida passa a ser autoexplicativa e `foulReasonText` pode receber as regras corretas.

**Melhor:** mover a configuração para uma tabela `app_settings` no Supabase, com realtime, para que todas as mesas compartilhem a mesma regra — e ainda assim gravar o snapshot na partida.

**Barato e imediato:** memoizar `loadGameSettings()` com `useMemo` e passar `rules` para `foulReasonText`.

Relacionado: [[Modos de Jogo]] · [[Partida ao Vivo]]
