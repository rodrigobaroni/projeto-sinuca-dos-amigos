---
tags: [arquitetura, operação]
---
# Ambientes

Dois projetos Supabase distintos, selecionados pelo modo do Vite.

| Ambiente | Comando | Arquivo de env | Projeto Supabase |
| --- | --- | --- | --- |
| Local → **produção** | `npm run dev` | `.env.local` | `jxa…` |
| Local → **homologação** | `npm run dev:hml` | `.env.hml.local` | `sqkf…` |
| Build produção | `npm run build` | `.env.local` | `jxa…` |
| Build homologação | `npm run build:hml` | `.env.hml.local` | `sqkf…` |

Variáveis (ver `.env.example`):
```
VITE_SUPABASE_URL="https://<projeto>.supabase.co"
VITE_SUPABASE_ANON="<chave anon public>"
```

`src/main.jsx:7-16` limpa aspas em volta do valor, valida o formato da URL contra `^https://.+\.supabase\.co/?$` e só cria o cliente se passar. Se não passar, o app mostra *"Configure o Supabase nas variáveis..."* em vez de quebrar. Isso é bem feito.

## Deploy
`netlify.toml` na raiz. O build gera `dist/`.

Verificado: `dist/` existe no disco mas **não está versionado** (0 arquivos rastreados pelo git), e `.env.local` / `.env.hml.local` também estão fora do versionamento. O único `.env*` commitado é o `.env.example`, que só tem placeholders. Nada de segredo no repositório.

## Homologação tem dados de verdade
Não é um banco vazio: 11 jogadores, 406 partidas, nenhuma partida travada em `live`. É um bom espelho de produção para testar. Ver [[Banco de Homologação]].

> [!danger] Os dois ambientes têm cadastro aberto
> Verificado em ambos: `disable_signup: false`. Ver [[Segurança e RLS]].

Relacionado: [[Rodando Localmente]] · [[Segurança e RLS]]
