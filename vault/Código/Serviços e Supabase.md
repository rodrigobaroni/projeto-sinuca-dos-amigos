---
tags: [código, arquitetura]
---
# Serviços e Supabase

`src/services/supabaseRepository.js` — 103 linhas, fábrica que recebe o cliente e devolve um objeto de métodos. **Toda** a comunicação com o Supabase passa por aqui, o que é excelente: trocar de backend seria mexer num arquivo só.

## Métodos
| Método | O que faz |
| --- | --- |
| `loadScoreboard()` | Carrega players + matches em paralelo, depois clips |
| `getClipPublicUrl(path)` | URL pública do bucket `match-clips` |
| `listAuditLogs(limit=100)` / `createAuditLog(entry)` | Auditoria |
| `addPlayer` / `updatePlayer` | Jogadores |
| `startMatch` / `updateMatch` / `deleteMatch` | Partidas |
| `signIn` / `signOut` / `getSession` / `onAuthStateChange` | Auth |
| `onMatchesChange(cb)` | Assinatura realtime, devolve função de cleanup |

## Detalhes de implementação

**Carga paralela com falha dura nas duas primeiras:**
```js
const [{data: players, error: e1}, {data: matches, error: e2}] = await Promise.all([...]);
if (e1 || e2) throw e1 || e2;
```
Se players ou matches falhar, o app mostra a tela de erro. Correto.

**Clipes degradam com elegância:** se `match_clips` falhar, `safeClips = []` e o app segue funcionando sem os vídeos. Boa decisão — clipe é acessório.

**Auditoria é otimista:** `App.jsx:140-170` insere uma entrada local com id `local-...` antes de gravar, e substitui pelo registro real quando volta. Se falhar, mostra toast e mantém a entrada local. Bem feito.

## Pontos de atenção

> [!warning] Nada é paginado
> `loadScoreboard()` faz `select("*")` sem `limit` em `players` e `matches`. Hoje são 406 partidas — irrelevante. O Supabase, porém, aplica um teto padrão de linhas na API REST; quando o histórico crescer o suficiente, o app vai simplesmente **parar de ver as partidas mais antigas sem nenhum erro**, e todo ranking histórico fica silenciosamente errado. Vale resolver antes de virar problema, não depois.

> [!note] `updateMatch` sobrescreve o que receber
> Não faz merge nem checa versão. É o que viabiliza o [[AUD-06 Perda de bolas no ball_log]].

> [!note] `deleteMatch` não devolve confirmação
> Só propaga erro. Como a exclusão é otimista na UI, uma exclusão que não afetou nenhuma linha (por RLS, por exemplo) some da tela sem ter sumido do banco. Só aparece de novo no próximo `load()`.

Relacionado: [[Visão Geral da Arquitetura]] · [[Segurança e RLS]] · [[Tempo Real]]
