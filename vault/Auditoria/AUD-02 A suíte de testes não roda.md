---
tags: [auditoria, achado, qualidade]
severidade: ALTO
status: corrigido
---
# AUD-02 — A suíte de testes não roda

> [!success] Corrigido em 2026-08-20
> `package.json:11` — `"test": "vitest run --config vite.config.js"`. `npm run test` volta a executar. `vite.config.ts` **não** foi removido — o export do Figma continua no repo, ver [[AUD-09 Dois apps e dois vite.config no mesmo repo]]. Ainda não commitado. Ver [[2026-08-20 - Correções da auditoria de 20-08]].

**Severidade:** 🟠 ALTO · **Onde:** `package.json:9` + `vite.config.ts:3`

## O problema
```bash
$ npm run test
> vitest run
failed to load config from /.../vite.config.ts
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@tailwindcss/vite'
```

O repositório tem **dois** arquivos de configuração ([[Código Morto e Duplicado]]):
- `vite.config.js` — só o plugin do React. É o que o **Vite** usa (precedência de extensão).
- `vite.config.ts` — importa `@tailwindcss/vite`, pacote que **não está no `package.json` nem instalado**.

O Vitest carrega o `.ts` e morre antes de executar qualquer teste.

## Cenário concreto de falha
O desenvolvedor roda `npm run test`, vê um erro de módulo, assume que é problema de ambiente, e segue. **Nenhum dos 18 testes existentes protege nada.** Qualquer regressão em `stats.js`, `rules.js` ou `date.js` passa direto — inclusive as que já estão em produção hoje ([[AUD-03 Record lavador é fictício]], [[AUD-04 Maratonista usa dia UTC]]).

## Prova de que a suíte é saudável
```bash
$ npx vitest run --config vite.config.js
 Test Files  4 passed (4)
      Tests  18 passed (18)
   Duration  132ms
```
Os testes existem, são rápidos e passam. Só estão inalcançáveis.

## Correção
Depende da decisão sobre qual config fica ([[AUD-09 Dois apps e dois vite.config no mesmo repo]]).

**Se o app continua em `vite.config.js` (recomendado, é o que roda hoje):**
```bash
rm vite.config.ts        # junto com o resto do export do Figma
```

**Correção mínima, se quiser desacoplar já:** apontar o vitest explicitamente no script.
```json
"test": "vitest run --config vite.config.js"
```

Verificação: `npm run test` deve terminar com `Tests 18 passed`.

Relacionado: [[Testes]] · [[Código Morto e Duplicado]]
