---
tags: [operação, banco]
---
# Banco de Homologação

Projeto Supabase separado de produção, selecionado por `npm run dev:hml` / `npm run build:hml` via `.env.hml.local`.

## Não é um banco vazio
Levantado em 2026-08-20:

| Métrica | Valor |
| --- | --- |
| Jogadores | 11 |
| Partidas | 406 |
| Partidas 1x1 | 404 |
| Partidas 2x2 | 2 |
| Partidas `live` | 0 |
| Clipes | 0 |
| Logs de auditoria (via anon) | 0 — a policy exige autenticado |

É um espelho útil de produção: dá para reproduzir bugs de verdade sem tocar nos dados da galera.

## Saúde dos dados
Nenhuma anomalia estrutural:

| Verificação | Resultado |
| --- | --- |
| `finished` sem `winner_id` **e** sem `winner_side` | 0 |
| 1x1 com `winner_side` mas sem `winner_id` | 0 |
| `winner_id` que não é `player_a` nem `player_b` | 0 |
| 2x2 sem lado vencedor resolvível | 0 |
| Partidas travadas em `live` há mais de 24h | 0 |
| **`finished` com `ball_log` vazio** | **335 (83%)** |

A última linha não é corrupção — a anotação de bolas é opcional por [[Escopo|decisão de produto]]. Mas é exatamente o que dispara o [[AUD-03 Record lavador é fictício]].

## Como consultar sem subir o app
Com as variáveis de `.env.hml.local` carregadas:

```bash
set -a; . ./.env.hml.local; set +a
U=$(echo "$VITE_SUPABASE_URL" | tr -d '"'); K=$(echo "$VITE_SUPABASE_ANON" | tr -d '"')

curl -s "$U/rest/v1/matches?select=*&order=played_at.asc" \
  -H "apikey: $K" -H "Authorization: Bearer $K" > matches.json
```

Para rodar o domínio real contra esses dados, veja [[Como Reproduzir os Achados]].

> [!danger] Homologação tem o mesmo buraco de cadastro que produção
> `disable_signup: false` nos dois ambientes. Ver [[Segurança e RLS]].

Relacionado: [[Ambientes]] · [[Modelo de Dados]]
