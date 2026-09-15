---
tags: [código, dívida]
---
# Código Morto e Duplicado ⚠️

Um export do Figma Make foi despejado dentro de `src/` e nunca foi integrado nem removido. Hoje convivem **dois aplicativos** no mesmo diretório.

## O app real
```
index.html → /src/main.jsx → src/App.jsx → src/views/*
```
React 19 + Vite + CSS puro (`src/styles.css`, 1182 linhas).

## O app fantasma
| Caminho | Tamanho | Status |
| --- | --- | --- |
| `src/app/App.tsx` | 1717 linhas | Nunca importado |
| `src/app/components/ui/*` | ~50 componentes shadcn | Nunca importados |
| `src/main.tsx` | 6 linhas | Entrada alternativa, não referenciada |
| `src/imports/` | — | Do export do Figma |
| `src/styles/` (tailwind, theme, globals) | — | Não usados pelo app real |
| `figma-export/` | tem `package.json` e `node_modules` próprios | Projeto paralelo na raiz |
| `guidelines/`, `default_shadcn_theme.css`, `pnpm-workspace.yaml`, `postcss.config.mjs` | — | Do mesmo export |

Nada disso está versionado ainda — aparece como *untracked* no `git status`.

## Os dois `vite.config`
| Arquivo | Conteúdo | Quem usa |
| --- | --- | --- |
| `vite.config.js` | react() apenas | **Vite** (dev e build) — vence por precedência |
| `vite.config.ts` | react + tailwind + alias `@` + resolver de asset do Figma | **Vitest** — e quebra |

O Vite resolve `vite.config.js` antes de `.ts`, então o `.ts` é ignorado em `npm run dev` e `npm run build`. Mas o **Vitest** carrega o `.ts`, que importa `@tailwindcss/vite` — pacote que não está no `package.json` nem instalado. Resultado: a suíte inteira morre na largada.

Ver [[AUD-02 A suíte de testes não roda]] e [[AUD-09 Dois apps e dois vite.config no mesmo repo]].

## Duplicação dentro do app real
- **Handler de apagar partida** duplicado literalmente: `src/App.jsx:242-267` e `src/App.jsx:268-293` (~25 linhas idênticas em `PlayerView` e `MatchesView`).
- `DEFAULT_GAME_SETTINGS` aparece em `src/domain/rules.js:15` **e** em `src/views/AdminView.jsx:11`, com os mesmos valores. Duas fontes da verdade para o mesmo default.
- `EVEN_BALLS` / `ODD_BALLS` em `constants.js:30-31` duplicam a definição de grupos que já vive em `rules.js`.

## Recomendação
Decidir e executar, nesta ordem:
1. **Escolher um `vite.config`.** Se o `.ts` é o alvo, instalar `@tailwindcss/vite` e apagar o `.js`. Se não, apagar o `.ts`. Não dá para manter os dois.
2. **Tirar o export do Figma de dentro de `src/`.** Mover para uma pasta de referência fora do build (ou para `figma-export/`, que já existe) ou apagar.
3. **Extrair o handler de exclusão duplicado** para uma função só.

Enquanto os dois convivem, qualquer busca no código devolve resultados de um app que ninguém executa — e foi exatamente isso que quebrou os testes.

Relacionado: [[Mapa do Código]] · [[Testes]]
