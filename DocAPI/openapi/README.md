# 18. OpenAPI 3.1 — Encaçapei API

Especificação executável da API. **Validada** com Redocly CLI 2.41: `0 erros`.

## Estatísticas

| Métrica | Valor |
|---|---:|
| Versão OpenAPI | 3.1.0 |
| Path items | **86** |
| Operações | **98** |
| Schemas | **162** |
| Parâmetros reutilizáveis | 61 |
| Tags | 13 |
| Códigos de erro catalogados (`ErrorCode`) | **131** |

## Estrutura de arquivos

```
openapi/
├── openapi.yaml                 ← raiz: info, servers, tags, security, paths, components compartilhados
├── openapi.bundled.yaml         ← gerado: arquivo único (12 183 linhas) para Swagger Editor
├── components/
│   ├── schemas.yaml             ← 162 schemas de domínio, enums e DTOs
│   └── errors.yaml              ← Problem Details (RFC 9457), enum ErrorCode e respostas 4xx/5xx
└── paths/
    ├── app.yaml                 ← bootstrap e health checks
    ├── auth.yaml                ← cadastro, login, tokens, senha, verificação de e-mail
    ├── users.yaml               ← perfil, avatar, busca, estatísticas, LGPD
    ├── friendships.yaml         ← amigos, convites de amizade, head-to-head
    ├── leagues.yaml             ← ligas, membros, ranking, histórico, jogatina corrente
    ├── invitations.yaml         ← convites nominais e códigos de convite
    ├── matches.yaml             ← jogatinas, partidas, eventos de bola, finalização, correção
    ├── venues.yaml              ← catálogo de locais e busca por proximidade
    ├── notifications.yaml       ← caixa de entrada, preferências, devices de push
    └── sharing.yaml             ← resumo da jogatina, card e link público
```

## Como validar

### Redocly CLI (recomendado — resolve `$ref` relativos)

```bash
npx @redocly/cli@latest lint openapi/openapi.yaml
```

### Swagger Editor

O editor online (`editor.swagger.io`) **não resolve `$ref` para arquivos locais**. Use o bundle:

```bash
npx @redocly/cli@latest bundle openapi/openapi.yaml -o openapi/openapi.bundled.yaml
```

Depois cole o conteúdo de `openapi.bundled.yaml` — ele é autocontido e valida sem dependências externas.

### Documentação navegável

```bash
npx @redocly/cli@latest preview-docs openapi/openapi.yaml
```

### Geração de código

```bash
npx @redocly/cli@latest bundle openapi/openapi.yaml -o openapi/openapi.bundled.yaml
npx @openapitools/openapi-generator-cli generate -i openapi/openapi.bundled.yaml -g swift5 -o ./client-ios
```

## Warnings conhecidos e aceitos

O lint reporta 3 warnings, todos intencionais:

| Warning | Onde | Por que é aceito |
|---|---|---|
| `no-server-example.com` | `servers[2]` = `https://localhost:5001` | O ambiente de desenvolvimento local é documentado de propósito |
| `operation-4xx-response` (×2) | `/health/live`, `/health/ready` | Probes não têm resposta `4xx` legítima: ou o serviço responde `200`, ou `503` |

## Decisões de contrato refletidas na especificação

| Decisão | Onde aparece |
|---|---|
| Envelope `data` **apenas em coleções**; recursos únicos vêm crus | Todos os schemas de resposta |
| `schedule.startTime` / `endTime` em vez de `startsAt` / `endsAt` para horas | `LeagueSchedule` — `startsAt` já significa a **data** de início da liga |
| `winnerSide` em vez de "eu venci/perdi" | `FinishMatchRequest` — sobrevive a duplas e ao registro por terceiro |
| `resultStatus` como **segunda dimensão**, não estado de `status` | `Match` — `CORRECTED` não quebra `WHERE status = 'FINISHED'` |
| `permissions` calculado pelo servidor | `League`, `Match`, `PlaySession` — o app não reimplementa autorização |
| Percentual como número 0–100 com 2 casas, arredondado só na exibição | `WinRate` |
| Dinheiro sempre `{amount, currency}` | `Money` |
| `businessDate` no fuso da liga, com corte deslocado | `PlaySession` |
| `If-Match` obrigatório em finalização/correção, **opcional** em evento de bola | `MatchFinish`, `MatchCorrections` vs. `MatchEvents` |
| Resposta de `finish` traz o pódio completo | `FinishMatchResponse` — evita 3 requisições na pior rede do fluxo |
| Link público **minimizado** ("Rodrigo B.") | `PublicShare` |
| Feature flags materializam decisões pendentes | `AppBootstrap.features` |
| `404` (não `403`) em recurso privado sem vínculo | Descrições de `LeagueById`, `NotFound` |

## Rastreabilidade

Cada operação referencia, na descrição, as regras de negócio (`RN-*`) e decisões pendentes (`DP-*`) do documento narrativo:

- Regras de negócio → [capítulo 6](../06-regras-de-negocio.md)
- Catálogo de erros → [capítulo 10](../10-catalogo-erros.md)
- Máquinas de estado → [capítulo 11](../11-maquinas-estado.md)
- Ranking e cálculos → [capítulo 12](../12-ranking-calculos.md)
- Decisões pendentes → [capítulo 19](../19-decisoes-pendentes.md)

## Dataset dos exemplos

Todos os `example` da especificação usam o **dataset canônico** do [README §0.6](../README.md), verificado aritmeticamente: os 6 números do mockup (47 partidas, 62 %, 5 vitórias consecutivas, ranking 8/2·7/4·5/4·4/6·3/7, pódio 4·3·2·0 e h2h 5×3) fecham entre si.

Isso significa que a suíte de testes pode usar o mesmo seed e qualquer divergência entre especificação e implementação aparece como teste vermelho.
