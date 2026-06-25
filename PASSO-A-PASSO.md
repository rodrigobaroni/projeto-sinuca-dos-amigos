# Placar da Sinuca — passo a passo pra colocar no ar hoje

Tudo grátis. São duas contas (Supabase = banco, Netlify = site) e ~30 min.
Faça na ordem abaixo.

---

## Parte 1 — Banco de dados (Supabase)

1. Acesse **supabase.com** e crie conta (dá pra entrar com GitHub).
2. Clique em **New project**.
   - Dê um nome (ex: `sinuca`).
   - Defina uma senha de banco (anote, mas você quase não vai usar).
   - Região: escolha **South America (São Paulo)** se aparecer.
   - Clique em **Create**. Espera ~2 minutos provisionar.
3. No menu lateral, abra **SQL Editor** → **New query**.
   - Cole **todo** o conteúdo do arquivo `schema.sql` e clique em **Run**.
   - Deve aparecer "Success". Isso cria as tabelas e as regras de acesso.
4. Crie o usuário **admin** (quem vai lançar partidas):
   - Menu lateral → **Authentication** → **Users** → **Add user** → **Create new user**.
   - Coloque um e-mail e uma senha que você vá lembrar.
   - **Marque a opção "Auto Confirm User"** (importante, senão pede confirmação por e-mail).
   - Clique em **Create user**.
5. Pegue as duas chaves do projeto:
   - Menu lateral → **Project Settings** (engrenagem) → **API**.
   - Copie o **Project URL** (ex: `https://xxxx.supabase.co`).
   - Copie a chave **anon public** (a primeira, longa).

> A chave anon pode ficar pública no site sem problema: ela só permite o que as regras (RLS) deixam, que é **leitura pra todos** e **escrita só pra quem loga**.

---

## Parte 2 — Configurar as chaves no app

1. Crie um arquivo `.env.local` na raiz do projeto.
2. Cole estas variáveis:

   ```bash
   VITE_SUPABASE_URL="COLE_AQUI_A_URL_DO_PROJETO"
   VITE_SUPABASE_ANON="COLE_AQUI_A_CHAVE_ANON"
   ```

3. Substitua pelo seu **Project URL** e sua **chave anon**. Salve.
4. Para testar com dados fictícios, rode o projeto e abra com `?demo=1`.

---

## Parte 3 — Rodar e publicar o site

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Rode localmente:

   ```bash
   npm run dev
   ```

3. Gere a versão de produção:

   ```bash
   npm run build
   ```

4. Acesse **app.netlify.com/drop** (faça login / crie conta grátis).
5. **Arraste a pasta `dist`** para a área indicada.
   - Em segundos sai uma URL tipo `nome-aleatorio.netlify.app`.
6. (Opcional) Em **Site configuration → Change site name**, troque pra algo tipo `sinuca-da-galera`, virando `sinuca-da-galera.netlify.app`.
7. **Compartilhe esse link no grupo.** Todo mundo abre e vê o placar. Só você (logando em **Admin**) consegue lançar partida.

---

## Como usar no jogo

- Aba **Admin** → entre com o e-mail/senha que você criou no passo 4.
- **Lançar partida**: escolhe jogador A, jogador B, quem venceu e a data.
  - Jogador novo? No dropdown escolha **"+ novo jogador"** e digite o nome (evita nome duplicado bagunçando o ranking).
  - Ordem das bolas é **opcional**: vá adicionando "quem encaçapou + qual bola" pra ter o histórico completo da partida.
- O resto da galera só abre o link: **Ranking**, **Partidas**, **Records** e **Regras**.
- No **Ranking**, dá pra ver o placar geral, escolher o dia da jogatina (o app busca de meio-dia até meio-dia do dia seguinte), compartilhar o resumo e comparar confrontos diretos no total ou só naquele dia.

---

## Se der algo errado

- **"Não consegui conectar no banco"** na tela: a URL ou a chave anon estão erradas/trocadas. Revise o passo da Parte 2.
- **Login não entra**: confirme que marcou "Auto Confirm User" ao criar o usuário, ou em Authentication → Providers → Email, desligue "Confirm email".
- **Mudou o app depois de publicar**: rode `npm run build` de novo e arraste a nova pasta `dist` no Netlify.
