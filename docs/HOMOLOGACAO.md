# Banco de homologação (HML) — passo a passo

Objetivo: parar de testar direto no banco de produção. O banco de HML é uma
cópia do schema + dos dados reais de produção, num projeto Supabase separado.

Ferramentas usadas: `psql` e `pg_dump` (já instalados neste Mac via Homebrew,
não precisa instalar nada). Não usamos a CLI do Supabase — o fluxo continua
manual, igual ao [PASSO-A-PASSO.md](../PASSO-A-PASSO.md) original.

---

## Parte 1 — Criar o projeto de homologação no Supabase

1. Acesse **supabase.com** → **New project**.
2. Nome sugerido: `sinuca-hml`.
3. Defina uma senha de banco **diferente** da de produção e anote — vai
   precisar dela no terminal na Parte 3.
4. Região: **South America (São Paulo)**, igual ao projeto de produção.
5. **Create** e aguarde ~2 minutos provisionar.

## Parte 2 — Recriar a estrutura (schema) em HML

Igual ao que vocês já fizeram na produção:

1. No projeto **HML** → menu lateral → **SQL Editor** → **New query**.
2. Cole todo o conteúdo de [`schema.sql`](../schema.sql) (o mesmo arquivo do
   projeto, sem alterar nada) e clique **Run**.
3. Crie o usuário admin de teste: **Authentication** → **Users** → **Add
   user** → **Create new user**, marcando **Auto Confirm User**. Pode ser um
   e-mail diferente do admin de produção — é ambiente de teste.

Neste ponto o HML já tem toda a estrutura (tabelas, RLS, triggers, bucket
`match-clips`), só que vazio.

## Parte 3 — Copiar os dados reais de produção para HML

Pegue as duas *connection strings* (uma por projeto): **Project Settings →
Database → Connection string → URI**, na aba **Direct connection** (não use
a de "Connection pooling" — `pg_dump`/`psql` funcionam melhor na direta,
porta `5432`).

Não cole a senha do banco aqui no chat. No terminal, exporte como variáveis
de ambiente (elas somem quando você fecha o terminal):

```bash
export PROD_DB="postgresql://postgres:SENHA_PROD@HOST_PROD.supabase.co:5432/postgres"
export HML_DB="postgresql://postgres:SENHA_HML@HOST_HML.supabase.co:5432/postgres"
```

Depois, exporte só os **dados** das 4 tabelas da aplicação (o schema já
existe em HML, então dump completo geraria erro de "já existe"):

```bash
pg_dump "$PROD_DB" \
  --data-only \
  --table=public.players \
  --table=public.matches \
  --table=public.audit_logs \
  --table=public.match_clips \
  --column-inserts \
  --no-owner \
  -f /tmp/sinuca_dados_prod.sql
```

E restaure em HML:

```bash
psql "$HML_DB" -f /tmp/sinuca_dados_prod.sql
```

Pronto: HML agora tem os mesmos jogadores, partidas e histórico de bolas que
a produção, num banco isolado.

**Sobre os clipes de vídeo (`match_clips`):** as *linhas* da tabela são
copiadas, mas os **arquivos de vídeo** em si vivem no Storage do Supabase
(bucket `match-clips`), fora do Postgres — `pg_dump` não os copia. Em HML os
clipes vão aparecer na lista, mas o vídeo não vai carregar. Se isso importar
para os testes, dá pra baixar os arquivos do bucket de produção (Storage →
`match-clips`) e subir manualmente no bucket de HML; senão, pode ignorar.

**Re-sincronizar depois:** sempre que quiser atualizar HML com dados mais
recentes de produção, repita só os dois comandos acima (dump + restore) —
mas rode um `TRUNCATE public.players, public.matches, public.audit_logs,
public.match_clips CASCADE;` em HML antes, via SQL Editor, pra não duplicar
linhas.

## Parte 4 — Apontar o app local para o banco de homologação

1. Crie um arquivo **`.env.hml.local`** na raiz do projeto (mesmo formato do
   `.env.local`, já ignorado pelo git):

   ```bash
   VITE_SUPABASE_URL="https://SEU-PROJETO-HML.supabase.co"
   VITE_SUPABASE_ANON="chave-anon-public-do-projeto-hml"
   ```

2. Rode:

   ```bash
   npm run dev:hml
   ```

   Isso sobe o app local apontando para o banco de **homologação** — a
   produção (`.env.local`, usado por `npm run dev` normal) fica intocada.

3. Pra gerar um build de homologação (ex: publicar em
   `sinuca-hml.netlify.app` separado do site de produção):

   ```bash
   npm run build:hml
   ```

   e arraste essa pasta `dist/` pra um **site novo** no Netlify (não o
   mesmo site de produção).

Daqui pra frente, teste sempre com `npm run dev:hml` / `npm run build:hml`.
Reserve `npm run dev` / `npm run build` (que usam `.env.local`) só para
publicar de verdade em produção.
