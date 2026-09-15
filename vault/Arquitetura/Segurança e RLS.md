---
tags: [arquitetura, segurança]
---
# Segurança e RLS ⚠️

## O modelo pretendido
`SPEC.md` diz: *"leitura pública, escrita só pro admin logado"*, sendo o admin **um usuário criado no Supabase Auth**.

## O modelo implementado
As policies em `schema.sql:189-233` usam:
```sql
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated')
```

Isso não diz "o admin". Diz **qualquer usuário autenticado**.

## O buraco

> [!danger] Cadastro aberto + escrita para qualquer autenticado
> O projeto Supabase está com `disable_signup: false` e provider de e-mail habilitado — **em produção e em homologação**. Qualquer pessoa com o link do app tem a chave `anon` no bundle, pode se cadastrar sozinha, confirmar o e-mail e passa a ter INSERT/UPDATE/DELETE em `players`, `matches` e `match_clips`.
>
> Detalhes e correção: [[AUD-01 Cadastro aberto concede escrita total]]

Verificado em 2026-08-20 contra os dois ambientes:
```
disable_signup : False
email provider : True
mailer_autoconfirm : False   (precisa confirmar o e-mail, mas isso não é barreira)
anonymous_users : False
```

## O que está correto
Testado contra [[Banco de Homologação|homologação]] com a chave `anon`:

| Operação | Resultado | Esperado |
| --- | --- | --- |
| `SELECT players` | 200, 11 registros | ✅ leitura pública |
| `SELECT matches` | 200, 406 registros | ✅ leitura pública |
| `SELECT audit_logs` | 200, **0 registros** | ✅ policy exige autenticado |
| `INSERT players` (anônimo) | **401** | ✅ bloqueado |
| `INSERT matches` (anônimo) | **401** | ✅ bloqueado |
| `INSERT audit_logs` (anônimo) | **401** | ✅ bloqueado |

Ou seja: **a RLS faz exatamente o que foi escrita para fazer.** O problema não é a policy, é que "authenticated" é um conjunto aberto.

## Outros pontos
- A chave `anon` no bundle **não é um vazamento** — ela é pública por design no Supabase. A proteção é a RLS, não o segredo da chave.
- `.env.local` e `.env.hml.local` estão cobertos pelo `.gitignore` (`.env.local`, `.env.*.local`) e **não estão versionados**. Confirmado.
- Não há nenhuma `service_role` key no repositório.
- O bucket `match-clips` é **público para leitura** por design (o web app precisa exibir os clipes). Escrita exige autenticado — e herda o mesmo problema acima.
- `audit_logs` não tem policy de UPDATE nem DELETE, então o log é append-only mesmo para autenticados. Isso está certo.

## Correção recomendada
Trocar `auth.role() = 'authenticated'` por uma checagem de admin de verdade. Duas opções:

```sql
-- Opção A: lista fixa de e-mails admin
using ((auth.jwt() ->> 'email') in ('rodrigo@exemplo.com'))

-- Opção B: claim de role no app_metadata
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
```
E, independente disso, **desligar o cadastro aberto** no painel do Supabase (Authentication → Providers → Email → Disable signup), já que o produto tem exatamente um admin.

Relacionado: [[Modelo de Dados]] · [[AUD-01 Cadastro aberto concede escrita total]] · [[Ambientes]]
