---
tags: [auditoria, achado, segurança]
severidade: CRÍTICO
status: aceito-conscientemente
revisar-quando: o app sair do círculo de amigos
---
# AUD-01 — Cadastro aberto concede escrita total

> [!success] Risco aceito conscientemente pelo Rodrigo em 2026-08-20
> O app hoje roda só entre amigos e a ideia ainda está em desenvolvimento. O custo de um vândalo é baixo e conhecido, então **não vamos corrigir agora**.
>
> **Reabrir este achado antes de levar o produto para qualquer cliente.** No momento em que existir um usuário que não seja da turma, isso vira bloqueador de release: hoje qualquer pessoa que se cadastre pode apagar todo o histórico. A correção está descrita abaixo e leva minutos.

**Severidade:** 🔴 CRÍTICO · **Onde:** `schema.sql:212-233` + configuração do projeto Supabase · **Afeta:** produção **e** homologação

## O problema
As policies de escrita autorizam qualquer usuário autenticado:
```sql
create policy "escrita admin matches" on matches for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
```
`SPEC.md` diz que admin é *"um usuário criado no Supabase Auth"* — singular. A policy não expressa isso: expressa "qualquer um que esteja logado".

E o cadastro está aberto. Verificado nos dois ambientes em 2026-08-20:
```
disable_signup     : false
email provider     : true
mailer_autoconfirm : false
```

## Cenário concreto de falha
1. Qualquer pessoa abre o app — é público por design.
2. Extrai a chave `anon` do bundle (ela é pública, isso é esperado).
3. `POST /auth/v1/signup` com um e-mail próprio.
4. Confirma o e-mail (chega na caixa dela).
5. A partir daí tem **INSERT, UPDATE e DELETE** em `players`, `matches` e `match_clips`.

Resultado possível: apagar as 406 partidas do histórico, renomear jogadores, inserir partidas falsas, subir arquivos no bucket. Nada no app impede, e a auditoria só registra ações feitas *pela interface*.

## O que está correto
A RLS funciona exatamente como escrita. Testado contra homologação com a chave anon:

| Operação anônima | HTTP |
| --- | --- |
| `INSERT players` | **401** ✅ |
| `INSERT matches` | **401** ✅ |
| `INSERT audit_logs` | **401** ✅ |
| `SELECT audit_logs` | 200 com 0 linhas ✅ |

O problema não é a policy — é o conjunto "authenticated" ser aberto.

## Correção
Duas ações, ambas necessárias:

**1. Fechar o cadastro** (imediato, sem deploy): Supabase → Authentication → Providers → Email → **Disable signup**. O produto tem exatamente um admin; não há motivo para aceitar auto-cadastro.

**2. Amarrar a policy ao admin de verdade:**
```sql
drop policy if exists "escrita admin matches" on matches;
create policy "escrita admin matches" on matches for all
  using ((auth.jwt() ->> 'email') = 'rodrigo@exemplo.com')
  with check ((auth.jwt() ->> 'email') = 'rodrigo@exemplo.com');
```
Ou, mais limpo, um claim `role: admin` no `app_metadata` do usuário e `using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')`. Repetir para `players`, `match_clips` e as policies de `storage.objects`.

Fazer só o item 1 já elimina o risco prático. O item 2 é o que torna o sistema correto por construção.

Relacionado: [[Segurança e RLS]] · [[Auditoria 2026-08-20]]
