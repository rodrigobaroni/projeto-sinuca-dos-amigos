# 19. Decisões pendentes

Backlog de decisões de **produto** que a engenharia não deve tomar sozinha. Cada item traz alternativas, recomendação e o impacto de escolher cada caminho.

**Prioridade:**
- 🔴 **Bloqueante** — impede começar o módulo. Precisa de resposta antes da primeira linha de código de domínio.
- 🟠 **Alta** — pode ser implementada com a recomendação, mas mudar depois custa migração de dados.
- 🟡 **Média** — implementável com a recomendação; mudar depois é barato (feature flag ou config de liga).
- 🟢 **Baixa** — pós-MVP; registrada para não ser esquecida.

**Como usar este capítulo:** cada `DP-nnn` tem uma recomendação **já implementada** na especificação. Silêncio de Produto = adotar a recomendação. O que exige decisão explícita são os itens 🔴.

---

## 19.1 Backlog completo

| ID | Pergunta | Alternativas | Recomendação | Impacto de cada alternativa | Responsável sugerido | Prior. |
|---|---|---|---|---|---|:--:|
| **DP-001** | O adversário precisa **confirmar** o resultado? | **A.** Não — quem registra é fonte da verdade, com correção auditada · **B.** Sim — `AWAITING_CONFIRMATION` até o outro aceitar · **C.** Sim, mas com auto-confirmação em 24 h | **A** | **A:** fluxo de 2 toques; risco de resultado errado, mitigado por notificação "Contestar" + correção em 24 h. **B:** +1 estado na máquina de partida, +fila de pendências, ranking só materializa após confirmar, e trava a jogatina se alguém sai do bar. **C:** complexidade de B + job de auto-confirmação | Produto + Design | 🔴 |
| **DP-011** | Uma partida pode existir **fora de uma liga** (jogo avulso)? | **A.** Não — `leagueId` obrigatório · **B.** Sim — partidas soltas com ranking global · **C.** Sim, mas sem entrar em ranking | **A** | **A:** modelo simples; o caso avulso é atendido por liga `durationType = ONE_DAY`, que já existe no wizard. **B:** `leagueId` nullable propaga `IS NULL` em ~15 consultas e exige ranking global (ver DP-016). **C:** partida que não conta em nada — feature sem valor claro | Produto | 🔴 |
| **DP-012** | A jogatina é criada **explicitamente** ou implicitamente? | **A.** Implícita, com endpoint explícito disponível · **B.** Só explícita (tela "abrir jogatina") · **C.** Só implícita | **A** | **A:** "Iniciar partida" continua sendo 1 toque; `POST /play-sessions` existe para quem quiser abrir antes. **B:** +1 tela e +1 toque no fluxo mais usado do app. **C:** impede registrar noite passada e pré-cadastrar presentes | Produto | 🔴 |
| **DP-013** | **Duplas** entram no MVP? | **A.** Modelar agora, habilitar depois (flag `teamMatches`) · **B.** MVP completo com duplas · **C.** Remover o chip "Duplas" do wizard | **A** | **A:** schema com `side` e 1..2 jogadores por lado desde o início; API rejeita `TEAM_2V2` com `FEATURE_NOT_AVAILABLE`. **B:** +telas de seleção de dupla, +ranking de duplas, +h2h ambíguo — dobra o escopo de Matches. **C:** honesto, mas fecha a porta e o chip já está desenhado | Produto | 🔴 |
| **DP-009** | Qual é exatamente a **fórmula e o desempate** do ranking? | **A.** `winRate` → `wins` → menos derrotas → confronto direto → `joinedAt`; arredondamento **half-up** na exibição · **B.** Ordenar por vitórias absolutas · **C.** Sistema de pontos (3 por vitória) | **A** | **A:** coerente com a coluna "%" em negrito do mockup. Exige o design aceitar `56%` onde o print mostra `55%`. **B:** penaliza quem joga pouco e vence sempre; contradiz o mockup. **C:** conceito novo a explicar ao usuário; não existe empate em sinuca | Produto | 🔴 |
| **DP-014** | Quem registra a bola encaçapada, e **para quem ela conta**? | **A.** `actorUserId` opcional (app infere o jogador da vez) · **B.** Obrigatório · **C.** Não registrar autoria — só estado da mesa | **A** | **A:** dado analítico quando disponível, sem travar o fluxo. **B:** exige a UI perguntar "quem encaçapou?" a cada bola — atrito real na beira da mesa. **C:** a feature de 8 bolas vira enfeite, sem nenhuma estatística derivável | Produto + Design | 🔴 |
| **DP-004** | Quais dados podem aparecer em **link público** de compartilhamento? | **A.** Mínimo: primeiro nome + inicial, avatar de iniciais, posição e vitórias · **B.** Nome completo + `@username` · **C.** Sem link público — só imagem | **A** | **A:** LGPD tranquila, expiração de 30 dias, opt-out por usuário. **B:** exige base legal específica e consentimento de **todos** os participantes. **C:** perde o preview no WhatsApp, que é o principal vetor de crescimento | Produto + Jurídico/DPO | 🔴 |
| **DP-003** | Quem pode **corrigir** um resultado, e por quanto tempo? | **A.** Participantes em até 24 h; depois só `ADMIN`/`OWNER` · **B.** Só admin da liga, sempre · **C.** Qualquer participante, sem prazo | **A** | **A:** resolve o caso comum (erro na hora) sem abrir brecha; `correctionWindowHours` é configurável por liga. **B:** trava a correção quando o admin não está presente. **C:** ranking nunca é confiável — alguém pode reescrever um resultado de 6 meses atrás | Produto | 🟠 |
| **DP-006** | Liga **pública** permite entrada automática? | **A.** Sim, entrada direta (`joinPolicy: OPEN`) · **B.** Aprovação do admin · **C.** Pública só para **visualização**; entrada sempre por convite | **A** | **A:** simples e é o que "buscar ligas públicas" sugere. **B:** +estado `PENDING_APPROVAL`, +fila, +notificações; contrato já prevê `202`. **C:** o campo de busca pública fica meio inútil | Produto | 🟠 |
| **DP-008** | Regras da liga podem mudar **com histórico existente**? | **A.** `gameMode` e regras de marcação congelam na 1ª partida finalizada · **B.** Editáveis sempre · **C.** Versionar regra por partida | **A** | **A:** `rules_locked_at` + `409 LEAGUE_RULES_LOCKED`; o app desabilita os campos. **B:** ranking passa a misturar partidas com regras diferentes. **C:** correto em teoria, mas exige `league_rule_versions` e join em toda leitura de partida — desproporcional | Produto | 🟠 |
| **DP-010** | O que o contador de partidas da liga **conta**? | **A.** Todas as partidas `FINISHED`, inclusive de ex-membros · **B.** Só entre membros ativos · **C.** Dois campos (`matchesCount` + `rankedMatchesCount`) | **A** | **A:** definição única e verificável (`Σ V = Σ D = matchesCount`); no dataset canônico dá **27**, não os 32 do mockup. **B:** contador muda quando alguém sai — confuso. **C:** mais preciso, mas mais um número para o design acomodar | Produto | 🟠 |
| **DP-015** | Qual a **visibilidade default** do perfil? | **A.** `FRIENDS_ONLY` · **B.** `PUBLIC` · **C.** `PRIVATE` | **A** | Em todos os casos, V/D/% **dentro de liga em comum** são sempre visíveis (é o ranking). **A:** equilíbrio privacidade/social. **B:** perfil de qualquer um exposto a qualquer autenticado. **C:** quebra a descoberta social e o h2h | Produto + DPO | 🟠 |
| **DP-019** | Qual a **validade dos convites**? | **A.** Liga: 7 dias · Amizade: sem expiração · Código: 7 dias · **B.** Tudo 30 dias · **C.** Nada expira | **A** | **A:** convite de liga velho é ruído (o grupo já jogou); convite de amizade não incomoda ninguém. **B:** card amarelo do mockup fica semanas na tela. **C:** aceitar um convite de 2 anos para uma liga encerrada | Produto | 🟠 |
| **DP-016b** | O que significa o KPI **"Maiores derrotas — 2"**? | **A.** Maior sequência de derrotas (`longestLossStreak`) · **B.** Total de derrotas no período · **C.** Derrotas para o maior rival | **A** | **A:** simétrico ao KPI vizinho ("Vitórias consecutivas"); fecha com o valor 2 do mockup. Sugestão: **renomear** para "Maior sequência de derrotas" — "Maiores derrotas" sugere derrota por placar largo, conceito que não existe. **B:** seria 18, não 2. **C:** o card não tem espaço para dizer contra quem | Produto + Design | 🟠 |
| **DP-020** | Como o **card de imagem** é gerado? | **A.** Backend, HTML + headless browser · **B.** No cliente (`ViewToImage`) · **C.** Serviço externo (Bannerbear/Cloudinary) · **D.** Sem imagem — só link + texto no MVP | **D no MVP, A depois** | **A:** template igual ao design; serve de `og:image` do link (preview no WhatsApp). **B:** zero custo, mas 2 implementações e sem preview no link. **C:** dado do pódio sai para terceiro. **D:** entrega 80 % do valor com 5 % do esforço | Produto | 🟡 |
| **DP-005** | O **horário da jogatina** é editável? | **A.** Sim, `startTime`/`endTime` editáveis · **B.** Fixo em 20:00–00:00 · **C.** Presets ("noite", "tarde") | **A** | No mockup o horário aparece como **somente leitura** em duas telas, mas com valor específico (20:00–00:00) — provavelmente é lacuna de protótipo. **B** inviabiliza ligas de sábado à tarde | Produto + Design | 🟡 |
| **DP-007** | Participante comum pode **convidar** para a liga? | **A.** Sim em liga `PUBLIC`, não em `PRIVATE` · **B.** Só admins · **C.** Qualquer membro sempre | **A** | **A:** liga privada preserva o controle do dono; pública cresce sozinha. **B:** o dono vira gargalo. **C:** qualquer um pode encher a liga privada de desconhecidos | Produto | 🟡 |
| **DP-017** | Usuários podem **avaliar locais**? | **A.** Não no MVP; nota vem de curadoria ou de terceiro · **B.** Sim, 1 avaliação por usuário, editável · **C.** Sim, mas só quem já jogou no local | **A** | O mockup exibe `4.5 (128 avaliações)` **sem** oferecer ação de avaliar — número típico de fonte externa. **B:** exige moderação e antispam. **C:** melhor variante de B (`409 NEVER_PLAYED_HERE`), mas 128 avaliações levariam anos | Produto | 🟡 |
| **DP-018** | Como os **locais são cadastrados**? | **A.** Curadoria manual (~50 locais nas capitais de lançamento) · **B.** Google Places · **C.** OpenStreetMap · **D.** Cadastro pelos usuários | **A no MVP** | **A:** zero custo, zero dependência, qualidade controlada; não escala geograficamente. **B:** cobertura nacional imediata e explica o `4.5`, mas custo por chamada, **ToS proíbe cache prolongado** e exige atribuição. **C:** grátis, mas cobertura irregular de bares e sem preço/hora. **D:** escala sozinho e é a única fonte real de "R$ 30/hora", mas exige moderação e dedupe | Produto + Operações | 🟡 |
| **DP-023** | Verificação de e-mail é **obrigatória** para usar o app? | **A.** Uso completo por 7 dias; depois bloqueia só ações que geram e-mail ou expõem a terceiros · **B.** Bloqueio total até verificar · **C.** Nunca obrigatória | **A** | **A:** onboarding sem atrito (o mockup vai direto do cadastro para a Home) e ainda protege contra e-mail falso. **B:** perde usuários que erram o e-mail ou não abrem a caixa. **C:** convites vão para endereços inexistentes; recuperação de senha impossível | Produto | 🟡 |
| **DP-030** | E-mail já cadastrado: erro claro ou **anti-enumeração**? | **A.** `202` genérico + e-mail "alguém tentou criar conta com seu endereço" · **B.** `409 EMAIL_TAKEN` | **A** | **A:** impede varredura da base; custa UX (o usuário não vê "e-mail já cadastrado" na tela). **B:** amigável, mas transforma o cadastro num oráculo de "esta pessoa usa o Encaçapei" | Produto + Segurança | 🟡 |
| **DP-021** | O app precisa funcionar **offline**? | **A.** Não no MVP; exige conectividade · **B.** Fila local com sincronização · **C.** Modo offline completo | **A** | Bar com sinal ruim é risco real, mas: **A** já é mitigado por idempotência (retry seguro) e payloads pequenos. **B:** o contrato **já suporta** (`occurredAt` e `startedAt` aceitam passado) — é decisão de cliente, não de backend. **C:** exige resolução de conflito no device | Produto + Mobile | 🟡 |
| **DP-025** | Quem **saiu da liga** continua no ranking? | **A.** Sim, com `isActive: false` (default `includeInactive=true`) · **B.** Não · **C.** Sim, mas em seção separada | **A** | **A:** sumir com o jogador **distorce o passado** — as partidas dele aconteceram e afetaram o V/D dos outros. O print do mockup (5 linhas) corresponde a `includeInactive=false`, também suportado. **B:** `Σ V ≠ Σ D` sem explicação | Produto | 🟡 |
| **DP-027** | Empate no **pódio da jogatina** | **A.** Medalhas compartilhadas (dois 🥇, nenhum 🥈) · **B.** Desempate forçado por menos derrotas · **C.** Ordem alfabética | **A** | **A:** padrão olímpico; o contrato já separa `position` e `medal`. **B:** injusto quando ambos fizeram 4V/1D. **C:** arbitrário e indefensável na mesa | Produto | 🟡 |
| **DP-028** | A **sequência de vitórias** da Home é global ou por liga? | **A.** Global na Home, por liga no ranking · **B.** Só global · **C.** Só por liga | **A** | **A:** é o único caminho em que o KPI "5" do mockup fecha com o dataset (1 antes + 4 na noite). **C:** o card exibiria **4** | Produto | 🟡 |
| **DP-031** | O gráfico de 30 dias mostra taxa **acumulada** ou diária? | **A.** Acumulada · **B.** Diária · **C.** Média móvel de 7 dias | **A** | **A:** produz a curva suave e ascendente do mockup. **B:** com 3–4 partidas por noite, oscila entre 0 % e 100 % — serrote ilegível. **C:** bom meio, mas exige explicar "média móvel" | Produto + Design | 🟡 |
| **DP-002** | Quais são exatamente as **6 etapas do cadastro**? | **A.** Nome → username → e-mail → foto → senha → termos · **B.** Sem foto; incluir "como conheceu" · **C.** 4 etapas | **A** | O mockup confirma apenas a etapa **5 = senha**. **A** é a única sequência que dá 6 etapas com a senha em 5º. Impacto: define se `avatarUploadToken` entra no `POST /auth/register` | Produto + Design | 🟡 |
| **DP-024** | Trocar de **username** é permitido? | **A.** 1× a cada 30 dias, antigo reservado por 30 dias · **B.** Livre · **C.** Imutável | **A** | **A:** permite corrigir erro sem viabilizar impersonação. **B:** trocar de `@` e assumir a identidade de outro. **C:** um typo no cadastro é permanente | Produto | 🟢 |
| **DP-022** | Existe **bloqueio** de usuário? | **A.** Pós-MVP · **B.** No MVP · **C.** Nunca — só remover amizade | **A** | Risco de assédio existe em produto social, mas nenhuma tela foi desenhada. **B:** +tabela, +filtros em busca/convites/h2h. **C:** sem saída para quem recebe convites indesejados | Produto | 🟢 |
| **DP-016** | Existe **ranking global** entre todas as ligas? | **A.** Não no MVP · **B.** Global por `winRate` com mínimo de partidas · **C.** Elo/Glicko-2 | **A** | **A:** nenhuma tela do mockup pede isso. **B:** enganoso — 80 % numa liga de iniciantes não é comparável a 65 % numa liga forte. **C:** estatisticamente correto e comparável, mas é outro produto: exige explicar "rating" e novo schema | Produto | 🟢 |
| **DP-026** | Encaçapar a bola 8 deve **sugerir** encerrar a partida? | **A.** O app sugere; o servidor nunca decide · **B.** Servidor finaliza automaticamente · **C.** Nenhuma sugestão | **A** | **A:** a resposta do evento já traz `suggestion.suggestedWinnerSide`. **B:** em sinuca a 8 na caçapa errada faz **perder** — automatizar erraria o vencedor. **C:** perde um atalho barato de UX | Produto + Design | 🟢 |
| **DP-029** | O produto aceita **menores de 18 anos**? | **A.** Não — termos exigem 18+; não coletar data de nascimento · **B.** Sim, com consentimento parental · **C.** Sim, sem tratamento especial | **A** | **A:** simples e defensável (bares são ambiente adulto). **B:** LGPD art. 14 exige consentimento específico e verificável de responsável — muda o cadastro. **C:** **risco jurídico** — tratar dado de criança sem base legal | Produto + Jurídico/DPO | 🟢 |
| **DP-032** | O usuário pode **entrar em partida de terceiros** como registrador? | **A.** Sim — qualquer membro da liga pode registrar a partida de outros dois · **B.** Só os próprios jogadores | **A** | **A:** realidade de bar — um celular registra a noite inteira. **B:** obriga cada dupla a ter o app instalado e logado | Produto | 🟢 |

---

## 19.2 As 7 decisões bloqueantes, em uma página

Se houver tempo para apenas uma reunião de produto, é sobre estes sete itens. Todos já têm recomendação implementada; o que se pede é **confirmação ou veto**.

| ID | Pergunta de uma linha | Recomendação | Custo de mudar depois |
|---|---|---|---|
| **DP-001** | Adversário confirma o resultado? | **Não** | **Alto** — novo estado na máquina de partida e no ranking |
| **DP-011** | Partida existe fora de liga? | **Não** | **Alto** — `leagueId` nullable é migração de dados |
| **DP-012** | Jogatina é implícita? | **Sim**, com endpoint explícito | Médio — muda o fluxo mais usado do app |
| **DP-013** | Duplas no MVP? | **Não** — modelar, não habilitar | **Alto** se não modelar agora |
| **DP-009** | Fórmula e desempate do ranking? | `winRate` → `wins` → menos derrotas → h2h → `joinedAt`; half-up | **Alto** — reprocessa todo o histórico |
| **DP-014** | Bola encaçapada tem autoria? | **Opcional** | Médio — dado histórico não recuperável se não coletado |
| **DP-004** | O que aparece em link público? | **Mínimo** (primeiro nome + inicial) | **Alto** — LGPD; links já publicados não voltam |

---

## 19.3 Decisões técnicas já tomadas (`[R]`) — não precisam de Produto

Registradas para rastreabilidade. Viram ADR no repositório e são autonomia da engenharia.

| Área | Decisão | Alternativa rejeitada e por quê |
|---|---|---|
| Arquitetura | Monólito modular em .NET, Clean Architecture | Microsserviços: distribuiria um domínio fortemente transacional sem ganho de escala real |
| Banco | PostgreSQL 16 + PostGIS + `citext` + `pg_trgm` | NoSQL: ranking e invariantes de unicidade pedem ACID e constraints |
| Mensageria | **Outbox** em PostgreSQL + worker in-process | Service Bus no dia 1: infra e custo sem consumidor externo |
| Ranking | **Materializado**, atualizado na transação | On-demand: 3 leituras de ranking em 10 s no fluxo do pódio |
| Reprocessamento | **Rebuild completo determinístico** | Delta: deriva silenciosa e streaks impossíveis de manter |
| Eventos de partida | **Log append-only** + estado projetado | Coluna de bits: perderia autoria, ordem e horário |
| Correção | `resultStatus` como **2ª dimensão** | `status = CORRECTED`: quebraria todo `WHERE status='FINISHED'` |
| Concorrência | `version` + `If-Match`, com `409` (não `412`) trazendo `currentState` | `412`: tratamento inconsistente em proxies e sem corpo para reconciliar |
| Idempotência | `Idempotency-Key` obrigatório em POSTs mutantes | Deduplicação por hash de conteúdo: falharia em partidas legitimamente idênticas |
| Senha | **Argon2id** (`m=19MiB, t=2, p=1`) | bcrypt: sem resistência a ataque com memória |
| Tokens | Access 15 min (RS256) + refresh 30 dias rotacionado com detecção de reuso | Refresh sem rotação: token roubado vale 30 dias |
| Autorização | Papéis de liga **fora** do JWT, consultados por requisição | No token: papel mudaria só após 15 min |
| Privacidade de recurso | **`404`**, não `403`, em recurso privado | `403`: confirma existência e permite enumeração |
| Avatar | Upload direto ao Blob via SAS + confirmação | Via backend: 5 MB em 4G de bar = timeout |
| Compartilhamento social | **Sem integração** — share sheet do SO | OAuth com Meta/TikTok: revisão de app e token de longa duração para postar um pódio |
| Exclusão de conta | **Anonimização** preservando o histórico | Hard delete: apagaria o ranking de terceiros |
| `businessDate` | Função de domínio no fuso da liga, com corte deslocado | `CAST(finished_at AS date)`: partida das 00:40 iria para a noite errada |
| Paginação | **Cursor** em feeds, **offset** em conjuntos estáveis | Offset em tudo: itens repetidos durante a jogatina |
| Envelope | `data` só em coleções | Envelope universal: `response.data.data.name` em todo cliente |

---

## 19.4 Processo de decisão sugerido

| Etapa | Quem | Entrega |
|---|---|---|
| 1. Leitura prévia | Produto, Design, Tech Lead | Este capítulo + §0.7 do README |
| 2. Reunião de 90 min sobre os 7 🔴 | Produto (decide), Design, Tech Lead, DPO (em `DP-004`) | Ata com decisão por ID |
| 3. Confirmação assíncrona dos 🟠 e 🟡 | Produto | Silêncio = adotar a recomendação |
| 4. Registro | Tech Lead | ADR por decisão; atualização deste capítulo com `Decidido: A · 2026-08-05` |
| 5. Ajuste de contrato | Backend | Atualização da OpenAPI **antes** da implementação |
| 6. Feature flags | Backend | `AppBootstrap.features` refletindo o que ficou fora |

> **Nota de método (SDD):** nenhuma decisão pendente bloqueia o **começo** do trabalho. Auth, Users e Friendships não dependem de nenhum item 🔴 e podem entrar em desenvolvimento imediatamente (ver [capítulo 20](20-roadmap-tecnico.md), Fase 0). O que os 🔴 bloqueiam é o módulo de **Matches** — e é justamente por isso que precisam de resposta na primeira semana.
