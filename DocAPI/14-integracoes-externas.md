# 14. Integrações externas

## 14.1 Matriz de avaliação

| Integração | Finalidade | Dados enviados | Riscos | Alternativas | MVP? |
|---|---|---|---|---|:--:|
| **Azure Communication Services — Email** | Verificação de e-mail, reset de senha, avisos de segurança | E-mail, `displayName`, link com token | Entregabilidade (spam), vazamento de token se o e-mail for interceptado, dependência de reputação de domínio | SendGrid, Amazon SES, Postmark, Resend | **✔ obrigatório** |
| **Azure Blob Storage + Azure CDN** | Avatares, capas de local, imagens de card | Imagem, `userId` no path | Upload de conteúdo ilegal, custo de banda, URL adivinhável | S3 + CloudFront, Cloudinary | **✔ obrigatório** |
| **Azure Notification Hubs** | Push (lembrete de jogatina, convites) | Device token, título/corpo da notificação | Vazamento de conteúdo em lock screen, token morto | FCM/APNs diretos, OneSignal | ✖ Pós-MVP (endpoint de device já no MVP) |
| **Google Places / Geocoding API** | Popular o catálogo de locais, `rating`, horários | Nome/coordenada de bar (**nenhum dado de usuário**) | Custo por chamada, ToS restritivo (proíbe cache prolongado e exige atribuição), lock-in | OpenStreetMap/Nominatim, Foursquare, curadoria manual | **Depende de `DP-018`** |
| **Mapas no cliente** (Google Maps SDK / MapKit) | Renderizar o mapa e traçar rota | Coordenada do local, posição do usuário (fica no device) | Nenhum para o backend | — | ✔ (responsabilidade do app) |
| **Redes sociais** (WhatsApp, Instagram, TikTok) | Compartilhar pódio | **Nada** — o app usa o share sheet do SO | Nenhum: não há OAuth, token ou API | Deep links / Web Intent | **✔ como share sheet, ✖ como API** |
| **Renderização de imagem** (Azure Container Apps + Playwright headless, ou Puppeteer) | Card 1080×1920 para stories | HTML do card com nomes e vitórias | Custo de CPU, timeout, RCE se o template aceitar input não sanitizado | ImageSharp/SkiaSharp server-side, Bannerbear, Cloudinary com overlays | ✖ Pós-MVP |
| **Application Insights + OpenTelemetry** | Traces, métricas, logs, alertas | Telemetria técnica, `userId` **pseudonimizado**, `traceId` | Vazamento de PII em log se não houver redação | Grafana + Loki + Tempo, Datadog, New Relic | **✔ obrigatório** |
| **Azure Key Vault** | Chaves de assinatura JWT, connection strings, chaves de API | — | Configuração incorreta de acesso | HashiCorp Vault, App Configuration | **✔ obrigatório** |
| **Azure Cache for Redis** | Rate limit distribuído, contador de não lidas, cache de ranking | `userId`, contadores | Perda de cache = degradação, não falha | Cache em memória (só com 1 réplica) | ✔ recomendado no MVP |
| **reCAPTCHA / Azure Bot Detection** | Antiabuso em cadastro e login | IP, sinais de comportamento | Fricção de UX, privacidade | Rate limit + PoW + verificação de e-mail | ✖ (só se houver abuso) |
| **Provedor de SMS** | 2FA, verificação de telefone | Telefone | Custo, o produto não coleta telefone | — | ✖ Fora do escopo |
| **Gateway de pagamento** | — | — | — | — | ✖ Produto gratuito no MVP |

---

## 14.2 Provedor de e-mail — detalhamento

**Escolha `[R]`: Azure Communication Services Email.** Fica dentro da subscription Azure, respeita o padrão CAF/LFTM, tem Managed Identity e não adiciona fornecedor novo ao inventário de terceiros (o que simplifica o mapeamento LGPD de operadores).

| Item | Definição |
|---|---|
| Domínio remetente | `nao-responda@encacapei.com.br` |
| Autenticação de domínio | **SPF + DKIM + DMARC** (`p=quarantine` no lançamento, `p=reject` após 30 dias de monitoramento) |
| E-mails transacionais | Verificação de e-mail, reset de senha, senha alterada, acesso suspeito, exportação de dados pronta, conta agendada para exclusão |
| E-mails **não** enviados no MVP | Convite de liga, convite de amizade, lembrete de jogatina — são **in-app**. E-mail para isso vira spam e exige opt-in |
| Idioma | `pt-BR`, template com nome do usuário e link de ação |
| Rate limit por destinatário | 5/h, 20/dia |
| Retentativa | 3 tentativas (backoff 30 s / 5 min / 30 min); depois DLQ com alerta |
| Bounce/complaint | Webhook grava `email_bounced_at`; hard bounce bloqueia envios e marca a conta para revalidação |
| Rastreamento de abertura | **Desligado** (`[R]`) — pixel de rastreamento em e-mail transacional é tratamento de dado sem finalidade legítima clara |

**Conteúdo dos tokens em e-mail:** o link carrega token opaco de uso único com TTL curto (30 min para reset, 24 h para verificação). O e-mail **nunca** contém senha, nem sugestão de senha, nem o token em texto fora do link.

---

## 14.3 Armazenamento de avatar e mídia

| Item | Definição |
|---|---|
| Containers | `avatars` (público via CDN), `avatars-staging` (privado, TTL 24 h), `venues` (público), `shares` (público, TTL 30 dias), `exports` (privado, SAS 72 h) |
| Nomenclatura (CAF + LFTM) | `stlftmencacapei{env}` — ex.: `stlftmencacapeiprd` |
| Fluxo de upload | `POST /me/avatar/upload-url` → SAS de escrita (TTL 10 min, permissão `cw`) → `PUT` direto no Blob → `PUT /me/avatar` confirma |
| Por que upload direto `[R]` | Não passa 5 MB pelo backend em 4G de bar; elimina timeout de request e economiza banda de saída do App Service |
| Validação no confirm | **Magic bytes** (não extensão nem `Content-Type`), dimensões mínimas 64×64, máximo 5 MB, formato em `{jpeg, png, webp}` |
| Sanitização | **Remoção de todo EXIF**, com destaque para GPS (RN-PRIV-002) — uma selfie tirada em casa carrega a coordenada da casa |
| Derivadas | 256×256 e 64×64 em WebP, qualidade 82 |
| Nome do arquivo | `avatars/{userId}/{sha256(conteúdo)[0..12]}/256.webp` — hash no path permite cache imutável no CDN e invalidação natural na troca |
| CDN | `Cache-Control: public, max-age=31536000, immutable` |
| Moderação | ✖ no MVP. Denúncia manual + remoção por admin. Azure Content Safety fica registrado como pós-MVP |
| Custo estimado | 50 mil avatares × ~30 KB (256+64) ≈ **1,5 GB** — irrelevante |

---

## 14.4 Push notifications (pós-MVP)

| Item | Definição |
|---|---|
| Provedor | Azure Notification Hubs (abstrai APNs + FCM) |
| Registro | `POST /me/devices` — **já no MVP**, para a base de tokens existir quando o push for ligado |
| Segmentação | Por `userId` (tag `user:{uuid}`) e por liga (tag `league:{uuid}`) |
| Conteúdo | Título e corpo **sem dado sensível**: "Sua jogatina começa em 1 hora" ✔ · "Você perdeu de João por 1 a 0" ⚠ (aparece na tela de bloqueio) |
| Categorias com push | `SESSION_ALERTS` (o caso de uso real: avisar quem está longe do app), `LEAGUE_INVITATIONS`, `FRIEND_REQUESTS` |
| Categorias **sem** push | `MATCH_RESULTS` (o usuário está na mesa), `LEAGUE_UPDATES` (baixa urgência) — `DP-020b` |
| Quiet hours | Respeitadas (RN-NOTIF-010); lembrete que cai na janela é **adiantado**, não suprimido |
| Token inválido | Retorno do provedor → `user_devices.disabled_at`; limpeza em 90 dias |
| Retentativa | 2 tentativas; push é *best-effort* — a notificação in-app é a fonte da verdade |

**Por que push não entra no MVP:** exige app publicado nas lojas com certificados APNs e FCM configurados, e a única notificação que realmente precisa dele (lembrete de jogatina) tem valor limitado antes de haver base de usuários. In-app cobre o MVP sem bloquear nada.

---

## 14.5 Mapas, geocodificação e catálogo de locais

### Divisão de responsabilidade

| Item | Onde |
|---|---|
| Renderizar o mapa e os pins | **App** (Google Maps SDK / MapKit) |
| Traçar rota | **App** (abre o app de mapas nativo com `geo:` URI ou universal link) |
| Buscar locais por raio | **Backend** (PostGIS `ST_DWithin`) |
| Calcular distância | **Backend** (`ST_Distance` sobre `geography`) |
| Geocodificar endereço → coordenada | **Backend**, só no cadastro administrativo do local |
| Reverse geocoding | ✖ Não usado |

O backend **nunca** chama API de mapas em requisição de usuário. Isso mantém a latência previsível, elimina custo por chamada no caminho crítico e evita enviar a posição do usuário a terceiros (RN-VENUE-003).

### Origem do catálogo — `DP-018`

| Alternativa | Prós | Contras | Custo |
|---|---|---|---|
| **A. Curadoria manual (recomendada no MVP)** | Qualidade controlada, zero dependência, zero custo, sem restrição de ToS | Não escala geograficamente; precisa de operação | Baixo (planilha → seed) |
| B. Google Places | Cobertura nacional imediata, `rating` e horários prontos — explica o `4.5 (128 avaliações)` do mockup | Custo por chamada; ToS **proíbe cache prolongado** e exige atribuição visível; `rating` não é do Encaçapei; lock-in | ~US$ 17/1000 chamadas |
| C. OpenStreetMap / Overpass | Gratuito, dados abertos, sem restrição de cache | Cobertura irregular de bares no Brasil; sem `rating`; sem preço/hora | Baixo |
| D. Cadastro pelos usuários | Escala sozinho, dado hiperlocal (preço/hora só o frequentador sabe) | Exige moderação, antispam e resolução de duplicatas | Médio-alto |

**Recomendação: A no MVP, com o schema já preparado para B ou C** (`rating_source`, `external_ref`). Começar com ~50 locais curados nas capitais onde o produto será lançado é suficiente e evita comprometer o produto com o ToS de um terceiro antes de haver tração.

**Se B for escolhida**, três obrigações não-negociáveis: exibir atribuição "Powered by Google", respeitar o limite de cache do ToS (dados de `rating` não podem ser armazenados indefinidamente) e deixar claro na UI que a nota é de terceiro — o que o campo `ratingSource` já suporta.

**Preço por hora** (`R$ 30/hora` no mockup) **não existe** em nenhuma fonte externa. Ou é curadoria manual, ou é informado pelo usuário (`DP-018`). Sem decisão, o campo fica `null` e a UI oculta a linha.

---

## 14.6 Compartilhamento social — a integração que não existe

**Decisão `[R]`: o backend não integra com nenhuma rede social.**

| O que o mockup sugere | O que realmente acontece |
|---|---|
| Botão "WhatsApp" | App abre o share sheet do SO com `shareText` + `shareUrl` que o backend gerou |
| Botão "Instagram" | App abre o compositor de stories do Instagram com a **imagem** que o backend gerou |
| Botão "TikTok" | Idem |
| Botão "Copiar" | App copia `shareUrl` para a área de transferência |

**Consequências dessa decisão:**

| Aspecto | Resultado |
|---|---|
| OAuth com Meta/TikTok | Não existe |
| Token social armazenado | Nenhum |
| Revisão de app pelas plataformas | Não necessária |
| Risco de mudança de API de terceiro | Zero |
| LGPD | Nenhum dado sai para rede social pelo backend |
| Esforço | Reduzido a gerar texto, link e imagem |

Publicação programática (postar direto no Instagram do usuário) exigiria Instagram Graph API, conta business, revisão de app e armazenamento de token de longa duração — desproporcional para compartilhar um pódio de sinuca. Se um dia entrar, é decisão de produto com custo de compliance próprio.

---

## 14.7 Geração de imagem do card (pós-MVP)

| Alternativa | Prós | Contras |
|---|---|---|
| **A. HTML + Playwright headless em Azure Container Apps (recomendada)** | Template em HTML/CSS — o mesmo design do app; iteração rápida; tipografia e emoji corretos | Container pesado (~400 MB), ~1,5 s por render, precisa de sandbox |
| B. SkiaSharp / ImageSharp programático | Leve, rápido (~150 ms), sem browser | Layout em código; emoji e fontes customizadas são trabalhosos; qualquer ajuste de design é código |
| C. Serviço externo (Bannerbear, Cloudinary) | Zero infra | Custo por imagem; dado do pódio sai para terceiro (LGPD) |
| D. Gerar no cliente (`ViewToImage`) | Zero custo de servidor; usa o componente já renderizado | Precisa ser implementado 2× (iOS/Android); inconsistência visual; sem link público com preview |

**Recomendação: A**, com **fallback para D** se o custo de infra incomodar. O ponto a favor de A é que a imagem também serve de `og:image` do link público, o que faz o card aparecer no preview do WhatsApp — valor real que D não entrega.

**Segurança do render `[R]`:** o template recebe **apenas dados escapados** de um DTO tipado. Nunca HTML de usuário. O container roda sem rede externa, com usuário não-root, timeout de 30 s e limite de memória.

---

## 14.8 Observabilidade

| Item | Definição |
|---|---|
| Traces | OpenTelemetry → Application Insights. Instrumentação automática de ASP.NET Core, EF Core, HttpClient, Redis |
| Correlação | `traceparent` (W3C) propagado do app até o banco; `traceId` no corpo de todo erro |
| Logs | Serilog estruturado → Application Insights. Nível `Information` em produção, `Debug` sob feature flag temporária |
| Métricas técnicas | Latência p50/p95/p99 por rota, taxa de erro, throughput, pool de conexões, hit rate do cache |
| Métricas de negócio | `matches_finished_total`, `matches_corrected_total`, `sessions_opened_total`, `ranking_rebuilds_total`, `idempotent_replays_total`, `concurrent_modification_conflicts_total`, `outbox_lag_seconds`, `outbox_dead_lettered_total`, `ranking_drift_detected_total` |
| Alertas | Ver §16.8 |
| Retenção | 90 dias no Application Insights; export para Log Analytics com 1 ano em tier frio |

### Redação de PII em logs `[R]`

Lista de **permissão** (não de bloqueio) para o que pode ir a log:

| Permitido | Proibido |
|---|---|
| `userId` (UUID), `leagueId`, `matchId` | E-mail, `displayName`, `username` |
| `traceId`, `route`, `statusCode`, `durationMs` | Senha, hash, token, refresh token |
| `errorCode`, `exceptionType` | `lat`/`lng` do usuário |
| Hash de `Idempotency-Key` | Corpo de requisição de `/auth/*` |
| `ipHash` (salt rotativo) | IP em claro além de 90 dias |

Um **teste automatizado** varre a saída de log dos testes de integração procurando padrões de e-mail, JWT e coordenada, e **falha o build** se encontrar. Sem esse teste, a regra se degrada em três sprints.

---

## 14.9 Inventário de dependências externas e plano de degradação

| Dependência | Criticidade | Se cair | Degradação |
|---|---|---|---|
| PostgreSQL | **Crítica** | API indisponível | `503` com `Retry-After` |
| Key Vault | **Crítica** no boot | App não inicia | Chaves em cache de memória sobrevivem à queda temporária |
| Blob Storage | Média | Sem upload de avatar; avatares existentes seguem no CDN | `503 DEPENDENCY_UNAVAILABLE` só no endpoint de upload |
| CDN | Baixa | Imagens lentas | Fallback para URL direta do Blob |
| Redis | Baixa | Rate limit e contadores degradados | Fallback para cache em memória por réplica; rate limit fica por instância |
| E-mail | Média | Verificação e reset não chegam | Enfileirado no outbox; entrega quando voltar. Cadastro e login continuam funcionando |
| Notification Hubs | Baixa | Sem push | In-app continua (é a fonte da verdade) |
| Render de imagem | Baixa | Card não gera | Compartilhamento por link + texto continua |
| Google Places | Baixa | Sem sincronização de catálogo | Catálogo local continua servindo |

**Princípio `[R]`:** **nenhuma** dependência externa está no caminho crítico de registrar uma partida. Iniciar, marcar bola e finalizar dependem só de PostgreSQL. É o requisito que protege o momento de uso real do produto — quatro amigos em volta de uma mesa às 22h.
