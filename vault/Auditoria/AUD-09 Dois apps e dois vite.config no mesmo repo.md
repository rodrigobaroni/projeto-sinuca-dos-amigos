---
tags: [auditoria, achado, dívida]
severidade: MÉDIO
status: aberto
---
# AUD-09 — Dois apps e dois `vite.config` no mesmo repositório

**Severidade:** 🟡 MÉDIO · **Onde:** raiz e `src/`

## O problema
Um export do Figma Make foi despejado dentro de `src/` e nunca integrado nem removido. Hoje o repositório contém dois aplicativos:

| | App real | App fantasma |
| --- | --- | --- |
| Entrada | `src/main.jsx` (referenciado no `index.html`) | `src/main.tsx` (não referenciado) |
| Raiz | `src/App.jsx` (359 linhas) | `src/app/App.tsx` (1717 linhas) |
| UI | `src/components/` + `src/styles.css` | `src/app/components/ui/*` (~50 componentes shadcn) |
| Config | `vite.config.js` | `vite.config.ts` |

Junto vieram `src/imports/`, `src/styles/`, `figma-export/` (com `package.json` e `node_modules` próprios), `guidelines/`, `default_shadcn_theme.css`, `pnpm-workspace.yaml` e `postcss.config.mjs`. Nada disso está versionado — tudo aparece como *untracked* no `git status`.

## Cenário concreto de falha
Já aconteceu: **é a causa raiz do [[AUD-02 A suíte de testes não roda]]**.

O Vite resolve `vite.config.js` antes de `.ts`, então dev e build usam o `.js` e funcionam. O Vitest carrega o `.ts`, que importa `@tailwindcss/vite` — ausente do `package.json` e do `node_modules`. A suíte inteira morre.

Falhas seguintes prováveis:
- Uma busca por `App` ou por um nome de componente devolve resultados dos dois apps; alguém edita o arquivo errado e a mudança não aparece.
- `recharts` e `lucide-react` são importados pelo app fantasma e também não estão instalados — qualquer tentativa de aproveitar aquele código quebra na hora.
- O `pnpm-workspace.yaml` na raiz sugere pnpm, mas o projeto usa npm (`package-lock.json`).

## Correção
Decidir primeiro **qual é o alvo**:

**Cenário A — o app atual continua (recomendado).**
```bash
rm vite.config.ts src/main.tsx
rm -rf src/app src/imports src/styles
rm -rf figma-export guidelines
rm default_shadcn_theme.css pnpm-workspace.yaml postcss.config.mjs
```
Se o material do Figma tem valor como referência visual, mover para fora de `src/` (por exemplo `docs/referencia-figma/`) em vez de apagar. Ver [[AUD-02 A suíte de testes não roda]].

**Cenário B — migrar para o app do Figma.** Aí é um projeto, não uma limpeza: instalar tailwind, recharts, lucide-react, apontar o `index.html` para `main.tsx`, portar as chamadas ao Supabase e o domínio. Precisa de plano próprio.

Não decidir é a pior opção: os testes continuam mortos e cada busca no código devolve ruído.

Relacionado: [[Código Morto e Duplicado]] · [[Testes]]
