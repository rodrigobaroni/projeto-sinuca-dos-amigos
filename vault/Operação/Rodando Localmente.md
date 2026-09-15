---
tags: [operação]
---
# Rodando Localmente

## Pré-requisitos
Node com suporte a ESM. O projeto usa `npm` (há um `package-lock.json`; o `pnpm-workspace.yaml` na raiz veio junto com o export do Figma e não reflete o gerenciador real).

```bash
npm install
```

## Contra produção
```bash
npm run dev          # usa .env.local  → projeto jxa…
```

## Contra homologação (recomendado para desenvolver)
```bash
npm run dev:hml      # usa .env.hml.local → projeto sqkf…
```
Sobe em `http://127.0.0.1:5173/`. O banner do Vite mostra o modo:
```
VITE v7.3.5  hml  ready in 158 ms
➜  Local: http://127.0.0.1:5173/
```

Confira sempre o rótulo do modo antes de mexer em dados — é a única indicação visual de qual banco está atrás. Ver [[Banco de Homologação]].

## Build
```bash
npm run build        # produção → dist/
npm run build:hml    # homologação
npm run preview      # serve o dist/
```
O build funciona e leva ~600ms.

## Variáveis
Copie `.env.example` e preencha:
```
VITE_SUPABASE_URL="https://<projeto>.supabase.co"
VITE_SUPABASE_ANON="<chave anon public>"
```
Se a URL não casar com `^https://.+\.supabase\.co/?$`, o app não cria o cliente e exibe uma mensagem pedindo a configuração — em vez de quebrar com tela branca.

## Banco
Para subir um banco do zero, cole `schema.sql` inteiro no SQL Editor do Supabase. As migrations incrementais ficam em `docs/migrations/` e são seguras de rodar em bancos que já têm dados.

## Testes
```bash
npm run test         # ⚠️ NÃO FUNCIONA hoje
npx vitest run --config vite.config.js    # funciona: 18 testes passam
```
Ver [[Testes]].

Relacionado: [[Ambientes]] · [[Banco de Homologação]]
