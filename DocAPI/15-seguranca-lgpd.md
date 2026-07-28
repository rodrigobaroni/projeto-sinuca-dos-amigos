# 15. Segurança e LGPD

## 15.1 Hash de senhas

| Item | Definição |
|---|---|
| Algoritmo | **Argon2id** — vencedor da Password Hashing Competition, resistente a GPU e a side-channel |
| Parâmetros | `memory = 19 MiB`, `iterations = 2`, `parallelism = 1`, `saltLength = 16 B`, `hashLength = 32 B` (baseline OWASP 2024) |
| Biblioteca | `Konscious.Security.Cryptography.Argon2` ou `Isopoh.Cryptography.Argon2` |
| Salt | Único por senha, gerado por CSPRNG, armazenado junto ao hash (formato PHC) |
| Pepper | ✖ Não usado — adiciona um segredo que, se rotacionado errado, invalida todas as senhas. Argon2id com salt já resolve rainbow table |
| Rehash | Se `password_algo` ou os parâmetros divergirem do baseline, **rehash transparente no próximo login** bem-sucedido |
| Verificação | Comparação em **tempo constante** (a própria biblioteca garante) |
| Histórico | 3 hashes anteriores em `previous_hashes[]` (RN-AUTH-003) |
| Nunca | Log, telemetria, resposta de API, mensagem de erro, evento de outbox |

**Por que não bcrypt:** aceitável, mas limitado a 72 bytes de entrada e sem resistência a ataque com memória. `bcrypt` está na lista de `password_algo` apenas para permitir migração de uma base legada — não é a escolha inicial.

## 15.2 Política de senha

Exatamente os 5 critérios do mockup (`[C]`), validados no cliente **e** no servidor:

| Critério | Código de erro |
|---|---|
| Mínimo 8 caracteres | `PASSWORD_TOO_SHORT` |
| Ao menos 1 maiúscula | `PASSWORD_MISSING_UPPERCASE` |
| Ao menos 1 minúscula | `PASSWORD_MISSING_LOWERCASE` |
| Ao menos 1 número | `PASSWORD_MISSING_DIGIT` |
| Ao menos 1 caractere especial | `PASSWORD_MISSING_SPECIAL` |

Complementos `[R]`: máximo 128 caracteres (proteja contra DoS de hash), Unicode permitido (senhas com acento são válidas), **sem** expiração periódica (NIST 800-63B: expiração forçada piora senhas), e verificação opcional contra lista de senhas vazadas (`k-anonymity` da API do Have I Been Pwned) — registrado como melhoria pós-MVP.

## 15.3 Proteção de tokens

### Access token (JWT)

| Item | Definição |
|---|---|
| Algoritmo | **RS256** (assimétrico) — permite validar sem compartilhar o segredo de assinatura |
| Chave | Par RSA 2048 no **Azure Key Vault**, rotação trimestral com `kid` no header e período de sobreposição de 24 h |
| Vida | **15 min** |
| Claims | `iss`, `aud`, `sub`, `sid`, `jti`, `iat`, `exp`, `username`, `email_verified`, `roles` (§3.4) |
| **Nunca no token** | Papéis de liga (mudam a qualquer momento e o token vive 15 min), e-mail, dados sensíveis |
| Validação | Assinatura, `iss`, `aud`, `exp`, `nbf`, e **denylist de `jti`** em Redis |
| Armazenamento no app | **Memória apenas.** Nunca `UserDefaults`/`SharedPreferences` |
| Transporte | Header `Authorization: Bearer`. Nunca query string (vaza em log de proxy e histórico) |

### Refresh token

| Item | Definição |
|---|---|
| Formato | Opaco, 32 bytes de CSPRNG em base64url, com prefixo de versão (`v1.`) |
| Persistência | Somente **SHA-256** no banco. O valor cru existe apenas na resposta HTTP |
| Vida | **30 dias** |
| Rotação | **A cada uso** (RN-AUTH-013) |
| Cadeia | `replaced_by_id` liga a rotação; `session_id` agrupa a família |
| Detecção de reuso | Apresentar token já rotacionado → **revoga a família inteira** + `SuspiciousRefreshDetected` + e-mail ao titular (RN-AUTH-014) |
| Armazenamento no app | **Keychain (iOS) / Keystore (Android)** |

### Revogação de sessões

| Gatilho | Escopo |
|---|---|
| Logout | Sessão atual |
| Logout com `allSessions=true` | Todas |
| Troca de senha autenticada | Todas **exceto** a atual |
| Reset de senha | **Todas** |
| Reuso de refresh detectado | Toda a família (`session_id`) |
| Desativação/exclusão de conta | Todas |
| Ação administrativa | Todas, com `AuditLog` |

O access token remanescente vai para a **denylist de `jti`** em Redis com TTL igual ao `exp` — no máximo 15 min de janela residual, e a denylist é pequena por construção.

## 15.4 Rate limiting e antiabuso

Buckets completos em §7.12. Destaques de segurança:

| Vetor | Defesa |
|---|---|
| Força bruta de senha | 5 login/min por (IP + e-mail); 10 falhas em 15 min → conta bloqueada 15 min; resposta **idêntica** à de senha errada (não revela o bloqueio) |
| Criação de contas em massa | 3 registros/h por IP + verificação de e-mail obrigatória para ações sensíveis |
| Abuso de envio de e-mail | 3 forgot-password/h por IP e por e-mail; 1 reenvio de verificação/min, 5/dia |
| Varredura de códigos de convite | 20 tentativas/h por usuário; alfabeto de 32 símbolos × 8 posições = 2⁴⁰ combinações |
| Enumeração via busca | 30 buscas/min; nunca busca por e-mail |
| Spam de convites | 30 convites de amizade/dia; 100 convites de liga/dia |
| DoS de escrita | 120 escritas/min em partidas; 60 gerais; corpo máximo de 256 KB |
| Abuso de geração de imagem | 10/h por usuário |
| Scraping de link público | 60/min por IP + `noindex` |

Implementação `[R]`: sliding window em Redis com chave `{bucket}:{scope}:{janela}`. Se o Redis cair, degrada para limite por instância (fail-open com limite mais baixo) — **nunca** fail-closed em rota de leitura, para não transformar queda de cache em indisponibilidade.

## 15.5 Prevenção de enumeração de usuários

| Superfície | Comportamento | Racional |
|---|---|---|
| `POST /auth/login` | `401 INVALID_CREDENTIALS` para e-mail inexistente, senha errada **e** conta bloqueada. Tempo de resposta normalizado (hash é executado mesmo com usuário inexistente, contra dummy hash) | Impede descobrir quem tem conta |
| `POST /auth/password/forgot` | **Sempre `202`**, com o mesmo tempo de resposta | Idem |
| `POST /auth/register` com e-mail existente | `202 VERIFICATION_SENT` + e-mail "alguém tentou criar conta com seu endereço" (`DP-030`) | Idem. Alternativa `409 EMAIL_TAKEN` é mais amigável e vaza a base |
| `GET /users/username-available` | Revela existência de **username** (não de e-mail) | Aceitável: `@baroni` é público por design na UI. Rate limit de 20/min |
| `GET /users?q=` | Só `username` e `displayName`; respeita `searchableByUsername`; **nunca** aceita busca por e-mail | Minimização |
| `GET /leagues/{id}` privada | `404`, não `403` | Não confirma existência |
| `POST /friend-requests` para usuário bloqueado | `403 USER_BLOCKED` genérico, sem dizer que houve bloqueio | Não expõe o bloqueio |
| Recursos em escopo `/me` | Sempre filtrados por `sub`; ID de outro usuário → `404` | — |

**Trade-off assumido e documentado:** anti-enumeração no cadastro custa UX (o usuário não vê "e-mail já cadastrado"). A mitigação é o e-mail automático que o leva ao login/recuperação. `DP-030` registra a alternativa caso Produto priorize clareza.

## 15.6 Controle de acesso por recurso (anti-IDOR)

Detalhado em §3.3. Resumo operacional:

| Camada | Responsabilidade |
|---|---|
| Autenticação | Middleware valida o JWT e popula `ICurrentUser` |
| **Política de recurso** | Handler dedicado por agregado (`ILeagueAccessPolicy`, `IMatchAccessPolicy`) carrega o vínculo do banco e decide |
| Repositório de leitura | **Toda** consulta por ID em contexto de liga recebe `requesterId`. Não existe `GetById(id)` sem escopo |
| Domínio | Invariantes de estado (`Match.Finish` recusa partida finalizada) |
| Banco | Unique constraints como última linha (§11.14) |

**Regras que previnem IDOR na prática:**
1. Nenhum endpoint aceita `userId` no body para identificar o autor — vem sempre do `sub`.
2. `PATCH /me` ignora `id`, `email`, `status`, `version` se enviados.
3. Recurso privado sem vínculo → `404`, nunca `403`.
4. Papéis de liga **nunca** vêm do token; são consultados a cada requisição.
5. Testes automatizados de autorização são obrigatórios por endpoint (§17.4) — cada rota com path param tem um teste "usuário sem vínculo recebe 404/403".

## 15.7 Upload seguro

| Controle | Implementação |
|---|---|
| Tipo | Validação por **magic bytes**, não por extensão ou `Content-Type` declarado |
| Tamanho | 5 MB no SAS (`contentLength` assinado) e revalidado no confirm |
| Dimensões | Mínimo 64×64; máximo 8000×8000 (evita decompression bomb) |
| Reprocessamento | Imagem é **re-encodada** para WebP — destrói payload malicioso embutido |
| Metadados | **Todo EXIF removido**, com atenção especial a GPS |
| Path | `avatars/{userId}/{hash}/256.webp` — não aceita nome de arquivo do usuário |
| Container de staging | Privado, TTL de 24 h; o arquivo só vai para o container público após validação |
| Serving | Via CDN com `Content-Type` fixado pelo servidor e `X-Content-Type-Options: nosniff` |
| SVG | **Proibido** (vetor de XSS) |
| Antivírus | ✖ MVP. Azure Defender for Storage registrado como pós-MVP |

## 15.8 Proteção contra injection e ataques comuns

| Vetor | Defesa |
|---|---|
| SQL injection | EF Core com parametrização; **zero** SQL concatenado. `sort` e filtros validados contra lista fechada (`INVALID_SORT_FIELD`), nunca interpolados |
| NoSQL/JSON injection | `jsonb` recebe objetos serializados de DTOs tipados, nunca string do usuário |
| XSS | API só devolve JSON; `Content-Type` correto; `nosniff`. O render de imagem escapa todo dado. Link público serve HTML com CSP restritiva |
| CSRF | Não aplicável: autenticação por header `Authorization`, sem cookie de sessão |
| SSRF | Nenhum endpoint aceita URL do usuário. O render de imagem roda **sem acesso à rede externa** |
| Path traversal | Nenhum caminho de arquivo derivado de input |
| Mass assignment | DTOs de request explícitos; campos não mapeados são ignorados |
| DoS por payload | Corpo 256 KB, profundidade de JSON 16, arrays limitados (50 convites, 20 participantes, 200 IDs) |
| DoS por regex | Regex simples e ancorados; sem backtracking catastrófico; timeout de 100 ms |
| Zip bomb / decompression | Limites de dimensão de imagem |
| Clickjacking | `X-Frame-Options: DENY` na página pública de compartilhamento |
| Downgrade de TLS | HSTS `max-age=31536000; includeSubDomains; preload`; TLS 1.2+ apenas |
| Timing attack | Comparação de hash em tempo constante; resposta de login com tempo normalizado |
| Race condition de negócio | Unique constraints + optimistic locking (§11.14) |

**Headers de segurança em toda resposta `[R]`:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Cache-Control: private, max-age=0, must-revalidate   (default)
```
Na página pública de compartilhamento, adicionalmente:
```
Content-Security-Policy: default-src 'none'; img-src 'self' https://cdn.encacapei.com.br; style-src 'unsafe-inline'; font-src 'self'
X-Robots-Tag: noindex, nofollow
```

---

## 15.9 LGPD — mapeamento de tratamento

### Papéis

| Papel | Quem |
|---|---|
| **Controlador** | A empresa operadora do Encaçapei |
| **Operadores** | Microsoft Azure (hospedagem, e-mail, storage), e eventualmente Google (catálogo de locais, se `DP-018` = B) |
| **Titulares** | Usuários cadastrados |
| **Encarregado (DPO)** | A definir — item do checklist de handoff |

### Inventário de dados pessoais

| Dado | Categoria | Finalidade | Base legal (art. 7º) | Retenção |
|---|---|---|---|---|
| E-mail | Identificação/contato | Login, verificação, recuperação | **Execução de contrato** (V) | Vida da conta + 30 dias |
| Senha (hash) | Credencial | Autenticação | Execução de contrato (V) | Vida da conta |
| Nome de exibição | Identificação | Exibição em ranking, histórico, pódio | Execução de contrato (V) | Preservado anonimizado após exclusão |
| `@username` | Identificação | Identificação pública no app | Execução de contrato (V) | Substituído por `deleted_xxxx` |
| Avatar | Identificação (imagem) | Personalização | **Consentimento** (I) — upload é opcional | Excluído na exclusão de conta |
| Resultados de partidas | Comportamental | Ranking e estatísticas — **finalidade central** | Execução de contrato (V) | **Permanente** (pseudonimizado após exclusão) |
| Geolocalização (`lat`/`lng`) | **Sensível por natureza de rastreamento** | Buscar locais próximos | **Consentimento específico** (I) | **Não persistida** — só na requisição |
| IP e user-agent | Técnico/segurança | Antifraude, auditoria de acesso | **Legítimo interesse** (IX) | 90 dias, depois hash |
| Device token de push | Técnico | Entrega de notificação | Consentimento (I) | Até revogação ou 90 dias inativo |
| Tentativas de login | Segurança | Detecção de força bruta | Legítimo interesse (IX) | 90 dias (hash de e-mail e IP) |
| Logs de auditoria | Segurança/compliance | Prova de ação, disputa de resultado | **Obrigação legal / legítimo interesse** | 5 anos |

### Consentimento de geolocalização (RN-PRIV-001)

| Item | Definição |
|---|---|
| Momento | Ao abrir a aba **Locais** pela primeira vez |
| Granularidade | Específico para "encontrar locais próximos" — não é consentimento genérico |
| Registro | `user_profile_settings.location_consent_at` + `location_consent_version` |
| Revogação | A qualquer momento, em Perfil; a aba passa a operar por busca textual |
| Uso | **Apenas** na requisição. Nunca persistida, nunca logada, nunca enviada a terceiro |
| Prova | O registro de consentimento com versão é a evidência exigida pelo art. 8º, §1º |

### Direitos do titular (art. 18) — implementação

| Direito | Endpoint / mecanismo | Prazo |
|---|---|---|
| **Confirmação e acesso** | `GET /me`, `GET /me/statistics`, `POST /me/data-exports` | Imediato / minutos |
| **Correção** | `PATCH /me`, `PATCH /leagues/{id}`, `POST /matches/{id}/corrections` | Imediato |
| **Anonimização / eliminação** | `DELETE /me` → anonimização em D+30 | ≤ 15 dias se solicitado imediatamente |
| **Portabilidade** | `POST /me/data-exports` → ZIP com JSON + CSV | Minutos |
| **Informação sobre compartilhamento** | Política de privacidade lista os operadores | — |
| **Revogação de consentimento** | `PATCH /me` (avatar, localização, compartilhamento público) | Imediato |
| **Oposição** | `shareStatsPublicly = false`, `searchableByUsername = false` | Imediato |
| **Revisão de decisão automatizada** | Não aplicável — não há decisão automatizada com efeito jurídico |

### Exportação de dados — conteúdo do pacote

| Arquivo | Conteúdo |
|---|---|
| `profile.json` | Perfil, preferências, consentimentos, datas |
| `matches.csv` | Todas as partidas: data, liga, local, adversários (**pseudonimizados**: "Jogador A"), resultado, bolas |
| `leagues.json` | Ligas, papéis, datas de entrada e saída |
| `friendships.json` | Amizades e convites (contrapartes pseudonimizadas) |
| `statistics.json` | Agregados e séries temporais |
| `notifications.json` | Histórico de notificações recebidas |
| `audit.json` | Ações do titular registradas na auditoria |
| `README.txt` | Dicionário de dados e explicação da pseudonimização |

**Pseudonimização de terceiros no export `[R]`:** exportar "perdi de João Pereira em 14/07" entrega dado pessoal de **outro** titular a quem pediu o export. O pacote traz `"Jogador A"` com um mapeamento estável **dentro do próprio arquivo**, sem nome ou username — atende à portabilidade sem violar a privacidade de terceiros.

### Anonimização (RN-USER-007)

| Campo | Após anonimização |
|---|---|
| `id` | **Preservado** (chave de integridade do histórico) |
| `display_name` | `"Jogador removido"` |
| `username` | `deleted_<8 hex>` |
| `email` | `NULL` (libera o endereço para novo cadastro) |
| `avatar_url` | `NULL` + blob apagado |
| `user_credentials` | Linha **removida** |
| `refresh_tokens`, tokens | Removidos |
| `user_devices` | Removidos |
| `notifications` | Removidas |
| `friend_requests`, `friendships` | Removidos |
| `matches`, `match_participants`, `match_events` | **Preservados** |
| `league_ranking_entries`, `session_ranking_entries` | **Preservados** |
| `user_statistics`, `user_daily_stats`, `head_to_head_stats` | **Preservados** (referenciam apenas `user_id`) |
| `audit_logs` | Preservados (obrigação legal), com `actor_user_id` mantido |
| `status` | `ANONYMIZED` |

**Justificativa legal da preservação do histórico:** art. 16, III da LGPD permite conservação para "transferência a terceiro, desde que respeitados os requisitos de tratamento de dados" e, mais diretamente, o inciso IV (uso exclusivo do controlador, vedado o acesso por terceiro, desde que anonimizados). Após a anonimização, `user_id` é um identificador **sem** vínculo com pessoa natural — é dado anonimizado, fora do escopo da LGPD (art. 12). Sem isso, um jogador poderia apagar o ranking de uma liga inteira ao excluir a própria conta.

**Isso deve estar explícito na política de privacidade e na tela de exclusão** — e o contrato de `DELETE /me` já devolve `dataRetentionNotice` com esse texto.

### Política de retenção consolidada (RN-PRIV-005)

| Dado | Retenção | Mecanismo |
|---|---|---|
| Conta ativa | Indefinida | — |
| Conta desativada | Indefinida (reversível) | — |
| Conta excluída | Anonimizada em D+30 | Job `anonymize-deleted-accounts` |
| Tentativas de login | 90 dias | Job diário; partição mensal |
| IP em `refresh_tokens` | 90 dias, depois `NULL` | Job diário |
| Refresh/reset/verification tokens | Removidos ao expirar | Job horário |
| Notificações lidas | 12 meses | Job diário |
| `user_daily_stats` | 24 meses detalhado, depois agregação mensal | Job mensal |
| `audit_logs` | **5 anos** | Partições frias |
| `share_artifacts` | 30 dias (imagem apagada do Blob) | Job diário |
| Exportações de dados | 72 h | Job horário |
| `idempotency_records` | 24 h | Job horário |
| Backups | 35 dias | Política do Azure |
| Logs de aplicação | 90 dias | Application Insights |

> Backup é o ponto cego clássico de LGPD: um titular excluído em D+30 continua nos backups até D+65. Isso é aceitável e defensável (art. 16, I — cumprimento de obrigação e segurança), **desde que documentado** na política de privacidade e que a restauração de backup dispare a reaplicação das anonimizações pendentes. Runbook obrigatório.

## 15.10 Auditoria

Detalhada em §4.16 e §5.12. Garantias de segurança:

| Controle | Implementação |
|---|---|
| Imutabilidade | `REVOKE UPDATE, DELETE ON audit_logs FROM app_user` + trigger `BEFORE UPDATE OR DELETE` que levanta exceção |
| Atomicidade | Gravada na **mesma transação** da mutação: se a auditoria falha, a operação falha (RN-AUDIT-001) |
| Ausência de PII sensível | Lista de **permissão** de campos em `before_state`/`after_state`; nunca senha, token ou coordenada |
| Rastreabilidade | `trace_id` correlaciona com o log de aplicação e com a requisição HTTP |
| Consulta pelo titular | Trilha de correções de partida é exposta no app (RN-AUDIT-004) — resolve disputa entre amigos sem suporte |
| Particionamento | Mensal, com partições antigas em armazenamento frio |

## 15.11 Segurança de infraestrutura `[R]`

| Item | Definição (CAF + convenção LFTM) |
|---|---|
| Rede | App Service com **VNet integration**; PostgreSQL e Redis com **Private Endpoint**, sem IP público |
| Identidade | **Managed Identity** para Key Vault, Blob e Communication Services — zero connection string com segredo em configuração |
| Segredos | Key Vault com soft-delete e purge protection; rotação de chave JWT trimestral |
| TLS | Terminação no Front Door/App Gateway; TLS 1.2+; certificado gerenciado |
| WAF | Azure Front Door com OWASP ruleset em modo prevenção |
| Banco | `require_secure_transport = ON`; TDE; usuário de aplicação **sem** `SUPERUSER`; usuário separado somente-leitura para relatórios |
| Backup | PITR de 35 dias; teste de restauração trimestral documentado |
| Segregação de ambientes | Subscriptions/resource groups distintos para `dev`/`hml`/`prd`; **nenhum dado de produção em ambiente inferior** |
| Dados de teste | Massa sintética gerada por script (o dataset canônico deste documento serve de base) |
| CI/CD | Pipeline com análise estática (SonarCloud — **migrações EF Core excluídas** por padrão da organização), verificação de dependências (`dotnet list package --vulnerable`), e scan de segredos |
| Acesso humano a produção | Just-in-time via PIM, com aprovação e registro; consulta a dado pessoal em produção requer justificativa registrada |

## 15.12 Checklist de segurança pré-produção

- [ ] Argon2id com parâmetros do baseline e teste de rehash
- [ ] Rotação de chave JWT testada com dois `kid` simultâneos
- [ ] Rotação de refresh com detecção de reuso validada em teste de integração
- [ ] Denylist de `jti` funcional após logout
- [ ] Rate limit validado em todos os buckets do §7.12
- [ ] Teste automatizado de autorização para **cada** rota com path parameter
- [ ] Teste que falha o build se PII aparecer em log
- [ ] Remoção de EXIF/GPS verificada com imagem real de celular
- [ ] `404` (não `403`) em todos os recursos privados sem vínculo
- [ ] Tempo de resposta de login normalizado (medido)
- [ ] Headers de segurança presentes em todas as respostas
- [ ] CSP e `noindex` na página pública de compartilhamento
- [ ] Trigger de imutabilidade de `audit_logs` testado
- [ ] Job de anonimização testado com conta real de teste
- [ ] Exportação de dados revisada quanto a PII de terceiros
- [ ] Política de privacidade publicada, incluindo retenção de backup e preservação de histórico
- [ ] Encarregado (DPO) designado e canal de contato publicado
- [ ] Registro de operadores (Azure, e eventualmente Google) documentado
- [ ] Runbook de incidente de segurança com prazo de comunicação à ANPD
- [ ] Runbook de restauração de backup incluindo reaplicação de anonimizações
