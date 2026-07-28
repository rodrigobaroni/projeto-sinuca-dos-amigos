# Encaçapei — Especificação Técnica de Backend

**Versão:** 1.0 (draft para revisão de Produto + Engenharia)
**Data:** 2026-07-27
**Autor:** Arquitetura de Software
**Fonte primária:** mockup navegável `https://sinucadosparceiros.netlify.app/encacapei-mockup.html`
**Método:** SDD (contexto → comportamento esperado → restrições → fora do escopo)

---

## 0. Como ler este documento

### 0.1 Índice

| # | Capítulo | Arquivo |
|---|---|---|
| — | Preâmbulo: confirmado / inferido / bloqueadores | Este arquivo (§0.3 a §0.6) |
| 1 | Resumo executivo | [01-resumo-executivo.md](01-resumo-executivo.md) |
| 2 | Análise funcional do mockup | [02-analise-funcional.md](02-analise-funcional.md) |
| 3 | Atores e matriz de permissões | [03-atores-permissoes.md](03-atores-permissoes.md) |
| 4 | Domínios e módulos do backend | [04-dominios-modulos.md](04-dominios-modulos.md) |
| 5 | Modelo de dados | [05-modelo-de-dados.md](05-modelo-de-dados.md) |
| 6 | Regras de negócio | [06-regras-de-negocio.md](06-regras-de-negocio.md) |
| 7 | Padrões gerais da API | [07-padroes-api.md](07-padroes-api.md) |
| 8 | Catálogo de endpoints | [08a-endpoints-auth-users.md](08a-endpoints-auth-users.md) · [08b-endpoints-friendships.md](08b-endpoints-friendships.md) · [08c-endpoints-leagues.md](08c-endpoints-leagues.md) · [08d-endpoints-sessions-matches.md](08d-endpoints-sessions-matches.md) · [08e-endpoints-venues-notif-sharing.md](08e-endpoints-venues-notif-sharing.md) |
| 9 | Exemplos completos de contratos (fluxo fim a fim) | [09-exemplos-contratos.md](09-exemplos-contratos.md) |
| 10 | Catálogo de erros | [10-catalogo-erros.md](10-catalogo-erros.md) |
| 11 | Estados e máquinas de estado | [11-maquinas-estado.md](11-maquinas-estado.md) |
| 12 | Ranking e cálculos | [12-ranking-calculos.md](12-ranking-calculos.md) |
| 13 | Eventos, filas e notificações | [13-eventos-filas-notificacoes.md](13-eventos-filas-notificacoes.md) |
| 14 | Integrações externas | [14-integracoes-externas.md](14-integracoes-externas.md) |
| 15 | Segurança e LGPD | [15-seguranca-lgpd.md](15-seguranca-lgpd.md) |
| 16 | Requisitos não funcionais | [16-requisitos-nao-funcionais.md](16-requisitos-nao-funcionais.md) |
| 17 | Estratégia de testes | [17-estrategia-testes.md](17-estrategia-testes.md) |
| 18 | OpenAPI 3.1 | [openapi/openapi.yaml](openapi/openapi.yaml) + `openapi/paths/*.yaml` + `openapi/components/*.yaml` |
| 19 | Decisões pendentes | [19-decisoes-pendentes.md](19-decisoes-pendentes.md) |
| 20 | Roadmap técnico | [20-roadmap-tecnico.md](20-roadmap-tecnico.md) |
| 21 | Checklist de handoff | [21-checklist-handoff.md](21-checklist-handoff.md) |

### 0.2 Convenção de classificação de requisitos

Todo requisito, campo, regra e endpoint carrega uma etiqueta:

| Etiqueta | Significado | Como tratar |
|---|---|---|
| **`[C]`** | **Confirmado pelo mockup** — existe elemento visual, texto, dado ou interação explícita no HTML | Implementar. Mudança exige revisão de design. |
| **`[I]`** | **Inferido a partir do mockup** — não desenhado, mas necessário para a tela funcionar (ex.: paginação de uma lista, ID de recurso, endpoint de leitura por trás de um card) | Implementar. Validar com Produto se houver custo relevante. |
| **`[R]`** | **Recomendação técnica** — decisão de engenharia não visível ao usuário (hash de senha, índice, ETag, DLQ) | Autonomia do time técnico. Registrada para rastreabilidade. |
| **`[P]`** | **Pendente de decisão do produto** — há mais de um caminho viável e a escolha muda contrato/modelo | **Bloqueia** implementação do item. Consolidado no [capítulo 19](19-decisoes-pendentes.md) como `DP-nnn`. |

Itens `[P]` sempre trazem: dúvida → alternativas → recomendação → impacto de cada alternativa.

---

## 0.3 O que foi possível **confirmar** no mockup

O mockup é uma página única, estática, sem `fetch`/`XHR` — não há contrato de API preexistente a respeitar. Toda a confirmação vem de estrutura de DOM, textos e handlers `onclick`. Confirmado:

**Navegação e shell**
- Aplicação **mobile-first** (viewport travado, `user-scalable=no`, moldura 380×780). Cliente é um app de celular; o backend serve exclusivamente API.
- **Tab bar com 5 abas**: Home, Amigos, Liga, Locais, Perfil (`TAB_SCREENS` no JS).
- Fluxo de entrada: **Splash → Onboarding (3 slides) → Login**. Onboarding é 100% client-side (array `OB` local), sem backend.
- 12 telas: splash, onboarding, login/cadastro, home, amigos, head-to-head, ligas (lista), liga detalhe (3 abas), seleção de partida, partida em andamento, locais (mapa), perfil (2 abas).
- 3 modais: detalhe de local, compartilhar resultado, wizard de criação de liga (3 passos).

**Autenticação**
- Tela única com segmented control **Login | Cadastro**.
- Login por **e-mail + senha** (`nome@email.com`, campo `type=password`).
- Link **"Esqueceu a senha?"**.
- **Cadastro em 6 etapas** — o mockup renderiza literalmente `"Etapa 5 de 6 — Crie sua senha"`.
- **Política de senha explícita e validada em tempo real**, com 5 critérios listados: letra maiúscula, letra minúscula, número, caractere especial, mínimo 8 caracteres. Exemplo aceito: `Sinuca@2026`.
- **Sair da conta** (botão danger em Perfil → Configurações), retornando à tela de login.

**Home**
- Cabeçalho com avatar (iniciais `RB`), nome `Rodrigo Baroni` e **"Desde jan 2025"** (data de cadastro).
- **4 KPIs**: `Partidas jogadas = 47`, `Taxa de vitória = 62%`, `Vitórias consecutivas = 5`, `Maiores derrotas = 2`.
- Bloco expansível **"Gráficos de evolução"** com dois gráficos:
  - **"Taxa de vitória — últimos 30 dias"** — série temporal, eixo Y rotulado 40%–80%, 9 pontos.
  - **"Vitórias e derrotas por semana"** — barras pareadas em 4 semanas (Sem 1 a Sem 4).
- Seção **"Ligas ativas"** com contador `3 ligas`, cards com `nome`, `badge de status`, `N amigos • N partidas` e, quando existe, `Próxima: terça, 20h`.
- Card de liga **encerrada** aparece na Home sob o rótulo "Ligas ativas" (inconsistência do mockup — ver §0.5).
- Ação **"Ver todas as ligas"**.

**Amigos**
- Busca textual (`Buscar amigos...`).
- Segmented control **"Seus amigos" | "Convites"** com **badge numérico de pendências (2)**.
- Lista de amigos com **nome + `@username`** (`João Pereira / @joaop`, `Felipe Costa / @felipao`, `Anderson Lima / @ander`, `Marcos Silva / @marcao`).
- Convites recebidos com texto `"quer ser seu amigo"` e ações **Aceitar / Recusar** (`Carlos Mota`, `Pedro Nunes`).
- Clicar num amigo abre o **head-to-head**.

**Head-to-head (confronto direto)**
- Placar agregado `Você 5 × 3 João` e **"62% de aproveitamento no confronto"** com barra de progresso em 62%.
- **Dois filtros**: liga (`Todas as ligas | Liga da Terça | Bar do Zé`) e período (`Últimos 90 dias | Últimos 30 dias | Tudo`).
- Lista **"Dias de jogatina"** — agregação por **dia de jogatina**, não por partida: `7 de julho, 2026 → Você 2 × 1`, `30 de junho, 2026 → João 2 × 0`, `23 de junho, 2026 → Você 3 × 0`, cada um com `Liga • Local`.

**Ligas**
- Card destacado de **convite de liga pendente** no topo: nome, `Convidado por Felipe Costa`, `há 2 dias`, ações Aceitar/Recusar.
- Busca **"Buscar ligas públicas..."** → existe conceito de **visibilidade pública/privada**.
- Agrupamento em **"Ativas"** e **"Encerradas"**.
- FAB **"Criar liga"** abre o wizard.

**Liga — detalhe**
- Topbar: nome, `Bar do Zé • terças 20h–00h` (local + dias + janela horária), badge `Ativa`.
- 3 abas: **Ranking | Histórico | Config**.
- **Ranking**: tabela `# | Jogador | V | D | %` com 5 linhas (Felipe 8/2/80%, Você 7/4/64%, João 5/4/55%, Marcos 4/6/40%, Anderson 3/7/30%). Ordenação por **%** decrescente.
- Botão **"Iniciar partida"** dentro da aba Ranking.
- **Histórico**: filtros `Todos os dias | 7 de julho | 30 de junho` e `Todos os resultados | Vitórias | Derrotas`; itens `Você vs João — Vitória — 7 jul • 21:32`, `Você vs Felipe — Derrota — 7 jul • 21:04`, `Você vs Anderson — Vitória — 7 jul • 20:20` (partidas têm **horário de término, com minuto**).
- **Config** (edição): `Nome da liga`, `Local`, `Estilo de jogo (1v1 | Duplas)`, toggle **"Marca bola caída?"** (ligado), toggle **"Marca falta?"** (ligado), `Horário 20:00 – 00:00` (somente leitura na config), e ações: **Salvar**, **Convidar mais amigos**, **Gerar código de convite**, **Encerrar liga**.

**Wizard de criação de liga (3 passos)**
- Passo 1: `Nome da liga`, `Local` (campo de **busca** de local, valor `Bar do Zé`), `Duração` (`Um dia | 6 meses | Infinita` — seleção única, default `6 meses`), `Dias de jogatina` (`Seg…Dom`, **multisseleção**, default `Ter` + `Sex`).
- Passo 2: `Estilo de jogo` (`1v1` default | `Duplas`), toggle `Marca bola caída?` (**ligado** por default), toggle `Marca falta?` (**desligado** por default), `Horário 20:00 – 00:00`.
- Passo 3: `Convidar amigos`, `Gerar código de convite`; texto: *"Convide os amigos agora ou comece sozinho e convide depois."* → **liga pode existir com 1 membro**.
- Botão final **"Criar liga"** → navega direto para o detalhe da liga.

**Partidas**
- **Seleção de adversário**: jogador logado fixo como `Jogador 1` (card com check), `VS`, busca `"Quem vai jogar contra?"`, lista de candidatos com **"N vitórias hoje"** por jogador (`João 1`, `Felipe 4`, `Anderson 0`; Rodrigo `3`), seleção única marcada com borda lime. Botão **"Começar partida"**.
- **Partida em andamento**: topbar `Liga da Terça` + **`Jogatina de 14 jul • 21:47`** → **existe a entidade "jogatina" (sessão), com data, à qual a partida pertence**.
- Placar de contexto: `3 vitórias hoje` / `1 vitória hoje` por jogador.
- **"Bolas na mesa"**: 8 bolas numeradas 1–8, instrução *"Toque na bola quando ela for encaçapada"*, estado **toggle** (bola 2 e 4 já encaçapadas) → **evento reversível**.
- Encerramento por **dois botões: "Venceu" | "Perdeu"** (perspectiva do usuário logado). "Venceu" abre o modal de compartilhamento; "Perdeu" volta à seleção de adversário.

**Locais**
- Aba própria com mapa e título *"Bares com mesa de sinuca perto de você"* → **busca por proximidade / geolocalização**.
- 3 pins no mapa; clique abre modal.
- Modal do local: imagem/capa, nome `Bar do Zé`, **avaliação `⭐ 4.5 (128 avaliações)`**, **horário `Seg–Dom, 20h–04h`**, **preço `R$ 30/hora`**, **distância `📍 2,4 km de você`**, **`Ligas que jogam aqui: Liga da Terça, Ranking do Bar do Zé`**, ações **"Traçar rota"** e **"Atrelar liga a este local"**.

**Perfil**
- Card com avatar, nome, `@baroni`, `62%` e `47 partidas`.
- Abas **Configurações | Notificações** com **badge de não lidas (3)**.
- Configurações: **Editar perfil**, **Alterar senha**, **Sair da conta**.
- Notificações: ação **"Limpar histórico"**; **agrupamento por tipo** em 3 seções — **"Convites de liga"** (com ações Aceitar/Recusar inline), **"Convites de amigos"** (Aceitar/Recusar inline), **"Avisos de jogatina"** (`Sua jogatina da Liga da Terça começa em 1 hora`, `hoje, 19:00` → **lembrete T-1h**); timestamps relativos (`há 2 horas`, `há 5 horas`).

**Compartilhamento**
- Modal pós-vitória: *"Parabéns! 🎉 Você ficou em 1º lugar na jogatina de hoje da Liga da Terça."*
- **Card de pódio do dia**: `Jogatina de 14 jul — Liga da Terça` com ranking do dia por número de vitórias (`🥇 Rodrigo — 4 vitórias`, `🥈 Felipe — 3`, `🥉 João — 2`, `4º Anderson — 0`) — inclui **todos** os participantes, não só o pódio.
- 4 destinos: **Instagram, TikTok, WhatsApp, Copiar**.
- Ação **"Próxima partida"** → volta à seleção de adversário **na mesma jogatina**.

---

## 0.4 O que foi **inferido** (não desenhado, mas necessário)

| # | Inferência | Evidência que a sustenta |
|---|---|---|
| I-01 | Existe entidade **PlaySession (jogatina)** distinta de Match, com data, liga, local e participantes | `"Jogatina de 14 jul • 21:47"`, `"N vitórias hoje"`, `"pódio da jogatina de hoje"`, h2h agrupado por "Dias de jogatina" |
| I-02 | A jogatina é **aberta implicitamente** ao iniciar a primeira partida do dia naquela liga | Não há nenhuma tela de "criar jogatina"; "Iniciar partida" está direto no ranking da liga. Ver `DP-012` |
| I-03 | Toda partida do mockup **pertence a uma liga** | Só existe entrada por `Liga → Ranking → Iniciar partida`. Ver `DP-011` |
| I-04 | Toda lista precisa de **paginação, ordenação e filtro server-side** (amigos, ligas, histórico, notificações, locais, ranking) | Listas de tamanho arbitrário renderizadas com 3–5 itens de exemplo |
| I-05 | Cada card clicável carrega um **identificador de recurso** (liga, usuário, local, partida) | `onclick="go('scr-liga-det')"` é placeholder de navegação por ID |
| I-06 | Contadores de badge (`Convites 2`, `Notificações 3`) vêm de **endpoints de contagem** ou do envelope da listagem | Badges numéricos com dado dinâmico |
| I-07 | O ranking da liga precisa do campo **"posição"** materializado ou calculado, e o usuário logado é destacado como `"Você"` | Coluna `#` e linha `Você` |
| I-08 | Existe **estatística agregada por usuário** (47 partidas, 62%, streak 5, pior sequência 2) e **série temporal de 30 dias / 4 semanas** | KPIs + 2 gráficos |
| I-09 | Existem **estatísticas por jogatina** (`N vitórias hoje`) consultadas na tela de seleção de adversário | `"3 vitórias hoje"` |
| I-10 | O convite de liga tem **remetente** e **data de envio** e, portanto, expiração | `"Convidado por Felipe Costa"`, `"há 2 dias"` |
| I-11 | Existe **código de convite** de liga (string curta compartilhável) além do convite nominal | Botão `Gerar código de convite` em 2 telas |
| I-12 | Locais são um **catálogo pré-existente** consultável (não criado pelo usuário no mockup) | Mapa já vem populado; não há "cadastrar local". Ver `DP-018` |
| I-13 | A associação **liga ↔ local** é N:1 pela liga e 1:N pelo local | `Ligas que jogam aqui: …` + `Atrelar liga a este local` |
| I-14 | O evento de bola encaçapada precisa de **autoria** (quem encaçapou) para ter valor analítico | A UI só registra "caiu", mas o dado sozinho não gera estatística. Ver `DP-014` |
| I-15 | Registro de **falta** existe no modelo mesmo sem UI desenhada na tela de partida | Toggle `Marca falta?` na config da liga sem contrapartida visual na partida |
| I-16 | Partida precisa de `startedAt` e `finishedAt` | `21:32`, `21:04`, `20:20` no histórico |
| I-17 | Existe **notificação de resultado/encerramento** e **preferências de notificação** | Escopo do produto + seção de notificações agrupada |
| I-18 | Push notification exige **registro de device token** | Lembrete "começa em 1 hora" só funciona fora do app |
| I-19 | O card de compartilhamento é **gerado como imagem** para Instagram/TikTok (que não aceitam texto puro) | Botões Instagram/TikTok. Ver `DP-020` |
| I-20 | "Copiar" produz **link público** de resumo da jogatina | Par natural de `Copiar` + destinos sociais |
| I-21 | Perfil público de outro usuário existe (nome, @username, avatar, stats) | Busca de usuários + lista de amigos + h2h |
| I-22 | Verificação de e-mail faz parte do cadastro de 6 etapas | 6 etapas para coletar ~4 dados (nome, username, e-mail, senha) implica etapas de verificação e avatar. Ver `DP-002` |
| I-23 | Liga guarda **contadores desnormalizados** (`N amigos`, `N partidas`) | Card `5 amigos • 32 partidas` sem custo de agregação em lista |
| I-24 | `Próxima: terça, 20h` é **calculado** a partir do schedule + timezone, não armazenado | Campo derivado presente só em ligas ativas com schedule |

---

## 0.5 Inconsistências detectadas no mockup (precisam de decisão)

Registradas porque afetam contrato ou fórmula, não são "detalhe de arte":

| # | Inconsistência | Efeito | Encaminhamento |
|---|---|---|---|
| INC-01 | **Arredondamento do percentual**: Felipe 8/10 = 80% ✓; Você 7/11 = 63,6% exibido **64%** (arredondado); João 5/9 = 55,6% exibido **55%** (truncado). Regras diferentes na mesma tabela. | Ranking pode ordenar/desempatar errado | `DP-009` — recomendação: armazenar `decimal(5,2)`, ordenar pelo valor exato, exibir arredondado (half-up) |
| INC-02 | Card "Liga da Terça" diz **32 partidas**, mas o ranking soma (8+2)+(7+4)+(5+4)+(4+6)+(3+7) = 50 participações = **25 partidas** | Ambiguidade sobre o que o contador conta | `DP-010` — recomendação: `matchesCount` = partidas **FINISHED** da liga; expor também `playersCount` |
| INC-03 | Card diz **"5 amigos"** e o ranking tem 5 jogadores **incluindo você** | Rótulo conta membros, não amigos | Contrato usa `membersCount` (inclui o próprio usuário); rótulo é responsabilidade do app |
| INC-04 | Tela de seleção mostra `Felipe — 4 vitórias hoje` e `João — 1 vitória hoje`; o pódio, gerado logo após Rodrigo vencer João, mostra `Felipe — 3` e `João — 2`. Felipe **perde** uma vitória entre as duas telas e João **ganha** uma sem jogar | Dado de exemplo incoerente | Sem impacto de contrato. O dataset canônico (§0.6) adota os números do **pódio**, que são os internamente consistentes, e deriva a parcial: Felipe 3, João 2 |
| INC-11 | A tabela de ranking da liga (Felipe **8V/2D**) é **aritmeticamente incompatível** com o pódio da mesma noite (Felipe 3V): qualquer combinação de derrotas de Felipe na jogatina o levaria a mais de 2 derrotas na liga | As duas telas descrevem estados que não podem coexistir | Sem impacto de contrato. O dataset canônico adota a **tabela de ranking como o estado pós-noite** e deriva o pré-noite por subtração (§0.6), garantindo que ranking, pódio, histórico e KPIs fechem entre si |
| INC-10 | O h2h agrega `Você 5 × 3 João` (62 %), mas a soma dos dias listados (`2+0+3` × `1+2+0`) já dá 5×3 **sem** contar a jogatina de 14/07, na qual Rodrigo e João também se enfrentaram | O total não fecha com o histórico | Sem impacto de contrato. O dataset canônico ajusta 23/06 de `3 × 0` para `2 × 0` e inclui 14/07 (`1 × 0`), preservando o total 5×3 e os 62 % |
| INC-05 | A Home lista **"Copa Fim de Ano — Encerrada"** sob a seção **"Ligas ativas"**, e o contador diz "3 ligas" | Define o que a Home busca | `[I]`: Home busca as **N ligas mais recentes do usuário** independente do status; rótulo da seção deve mudar para "Suas ligas" |
| INC-06 | Config da liga permite editar `Local` e `Estilo de jogo` **com liga em andamento** | Alterar `gameMode` invalida partidas passadas | `DP-008` — recomendação: `gameMode` e regras de marcação viram **imutáveis** após a 1ª partida finalizada |
| INC-07 | O modal de vitória afirma **"Você ficou em 1º lugar"** imediatamente após a partida, mas a jogatina continua ("Próxima partida") | Pódio parcial vs. final | `[I]`: pódio é **parcial e recalculado a cada partida**; o texto deve dizer "está em 1º lugar" |
| INC-08 | Toggle `Marca falta?` vem **ligado** na config e **desligado** no wizard | Default divergente | `[I]`: default de criação = `trackFouls: false`; a config apenas reflete o valor salvo |
| INC-09 | Botão **"Perdeu"** encerra a partida sem confirmação e sem informar quem venceu quando a liga é de **duplas** | Modelo de finalização | `DP-013` — finalização por `winnerSide`, não por "eu venci/perdi" |

---

## 0.6 Dataset canônico (usado em **todos** os exemplos deste documento)

Todos os capítulos, exemplos de request/response, casos de teste e a OpenAPI usam **exatamente** estes identificadores e valores.

**Instante de referência:** `2026-07-27T18:30:00Z` (= 2026-07-27 15:30 em `America/Sao_Paulo`).

### Usuários

| Nome | Username | UUID | Papel nos exemplos |
|---|---|---|---|
| Rodrigo Baroni | `@baroni` | `11111111-1111-4111-8111-111111111111` | Usuário autenticado ("Você"), dono da Liga da Terça |
| João Pereira | `@joaop` | `22222222-2222-4222-8222-222222222222` | Amigo, adversário do h2h |
| Felipe Costa | `@felipao` | `33333333-3333-4333-8333-333333333333` | Amigo, admin da Liga do Churrasco |
| Anderson Lima | `@ander` | `44444444-4444-4444-8444-444444444444` | Amigo, membro |
| Marcos Silva | `@marcao` | `55555555-5555-4555-8555-555555555555` | Amigo, membro |
| Carlos Mota | `@carlosmota` | `66666666-6666-4666-8666-666666666666` | Convite de amizade pendente (recebido) |
| Pedro Nunes | `@pedronunes` | `77777777-7777-4777-8777-777777777777` | Convite de amizade pendente (recebido) |

### Ligas

| Nome | UUID | Status | Visibilidade | Local |
|---|---|---|---|---|
| Liga da Terça | `0a1b2c3d-4e5f-4a6b-8c7d-000000000001` | `ACTIVE` | `PRIVATE` | Bar do Zé |
| Ranking do Bar do Zé | `0a1b2c3d-4e5f-4a6b-8c7d-000000000002` | `ACTIVE` | `PUBLIC` | Bar do Zé |
| Copa Fim de Ano | `0a1b2c3d-4e5f-4a6b-8c7d-000000000003` | `FINISHED` | `PRIVATE` | Sinuca Central |
| Liga do Churrasco | `0a1b2c3d-4e5f-4a6b-8c7d-000000000004` | `ACTIVE` | `PRIVATE` | Snooker House Pinheiros |

### Locais (venues)

| Nome | UUID | Coordenadas | Distância do usuário |
|---|---|---|---|
| Bar do Zé | `5e6f7a8b-9c0d-4e1f-8a2b-000000000001` | `-23.561414, -46.655881` | 2,4 km |
| Sinuca Central | `5e6f7a8b-9c0d-4e1f-8a2b-000000000002` | `-23.550520, -46.633308` | 3,8 km |
| Snooker House Pinheiros | `5e6f7a8b-9c0d-4e1f-8a2b-000000000003` | `-23.567200, -46.693400` | 5,1 km |

Posição do usuário nos exemplos de proximidade: `lat=-23.5583`, `lng=-46.6604` (Vila Mariana / SP).

### Jogatinas (play sessions)

| Data (local) | UUID | Liga | Status |
|---|---|---|---|
| 2026-07-14 | `7c8d9e0f-1a2b-4c3d-8e4f-000000000001` | Liga da Terça | `IN_PROGRESS` (jogatina do fluxo principal) |
| 2026-07-07 | `7c8d9e0f-1a2b-4c3d-8e4f-000000000002` | Liga da Terça | `CLOSED` |
| 2026-06-30 | `7c8d9e0f-1a2b-4c3d-8e4f-000000000003` | Liga da Terça | `CLOSED` |
| 2026-06-23 | `7c8d9e0f-1a2b-4c3d-8e4f-000000000004` | Ranking do Bar do Zé | `CLOSED` |

### Partidas da jogatina de 14/07/2026 (`…0001`)

Jogatina aberta em `2026-07-14T23:00:00Z` (20:00 local). Todos os horários locais em `America/Sao_Paulo` (UTC-3).

| # | UUID | Lado 1 | Lado 2 | Vencedor | startedAt (UTC) | finishedAt (UTC) | Local |
|---|---|---|---|---|---|---|---|
| 1 | `3f4a5b6c-7d8e-4f90-8a1b-000000000001` | Felipe | Anderson | **Felipe** | `2026-07-14T23:00:00Z` | `2026-07-14T23:11:38Z` | 20:11 |
| 2 | `3f4a5b6c-7d8e-4f90-8a1b-000000000002` | Felipe | João | **Felipe** | `2026-07-14T23:12:00Z` | `2026-07-14T23:24:05Z` | 20:24 |
| 3 | `3f4a5b6c-7d8e-4f90-8a1b-000000000003` | Rodrigo | Anderson | **Rodrigo** | `2026-07-14T23:25:00Z` | `2026-07-14T23:38:52Z` | 20:38 |
| 4 | `3f4a5b6c-7d8e-4f90-8a1b-000000000004` | Felipe | Anderson | **Felipe** | `2026-07-14T23:39:00Z` | `2026-07-14T23:51:19Z` | 20:51 |
| 5 | `3f4a5b6c-7d8e-4f90-8a1b-000000000005` | Rodrigo | Felipe | **Rodrigo** | `2026-07-14T23:52:00Z` | `2026-07-15T00:06:44Z` | 21:06 |
| 6 | `3f4a5b6c-7d8e-4f90-8a1b-000000000006` | Rodrigo | Anderson | **Rodrigo** | `2026-07-15T00:07:00Z` | `2026-07-15T00:19:27Z` | 21:19 |
| 7 | `3f4a5b6c-7d8e-4f90-8a1b-000000000007` | João | Anderson | **João** | `2026-07-15T00:20:00Z` | `2026-07-15T00:33:56Z` | 21:33 |
| 8 | `3f4a5b6c-7d8e-4f90-8a1b-000000000008` | João | Anderson | **João** | `2026-07-15T00:34:00Z` | `2026-07-15T00:45:31Z` | 21:45 |
| 9 | `3f4a5b6c-7d8e-4f90-8a1b-000000000009` | **Rodrigo** | **João** | **Rodrigo** | `2026-07-15T00:47:00Z` (**21:47** — o relógio do mockup) | `2026-07-15T01:08:22Z` | 22:08 |

**Parcial após 8 partidas** — estado exato da tela "Nova partida":

| Jogador | V | D | Partidas | Pos. parcial |
|---|---:|---:|---:|---:|
| Rodrigo | 3 | 0 | 3 | 1º |
| Felipe | 3 | 1 | 4 | 2º |
| João | 2 | 1 | 3 | 3º |
| Anderson | 0 | 6 | 6 | 4º |

✔ "**3 vitórias hoje**" de Rodrigo confere com o mockup. Felipe (3) e João (2) divergem do print (4 e 1) — ver `INC-04`.

**Pódio final após a partida 9** — idêntico ao modal de compartilhamento:

| Medalha | Jogador | V | D | Partidas |
|---|---|---:|---:|---:|
| 🥇 | **Rodrigo** | 4 | 0 | 4 |
| 🥈 | **Felipe** | 3 | 1 | 4 |
| 🥉 | **João** | 2 | 2 | 4 |
| 4º | **Anderson** | 0 | 6 | 6 |

✔ Σ V = 9 = nº de partidas · ✔ Σ D = 9 · ✔ 18 participações ÷ 2 = 9 partidas.

### Membro histórico da Liga da Terça

Para que a aritmética do ranking feche (`Σ V = Σ D = nº de partidas`), o dataset inclui um ex-membro:

| Nome | Username | UUID | Situação |
|---|---|---|---|
| Ricardo Alves | `@ricardoalves` | `88888888-8888-4888-8888-888888888888` | `LEFT` desde 2026-05-20 · 0 V / 4 D na liga |

### Ranking da Liga da Terça — antes e depois da noite

O ranking exibido no mockup (Felipe 8/2, Você 7/4, João 5/4, Marcos 4/6, Anderson 3/7) é o estado **após** 14/07. Subtraindo a jogatina chega-se ao estado anterior:

| Jogador | Antes (V/D) | Δ noite | Depois (V/D) | % depois | Exibe | Pos. antes → depois |
|---|---|---|---|---:|---:|---|
| Felipe | 5 / 1 | +3 / +1 | **8 / 2** | 80,00 | 80 % | 1º → **1º** |
| Rodrigo | 3 / 4 | +4 / +0 | **7 / 4** | 63,64 | 64 % | 4º → **2º** |
| João | 3 / 2 | +2 / +2 | **5 / 4** | 55,56 | 56 % | 3º → **3º** |
| Marcos | 4 / 6 | — | **4 / 6** | 40,00 | 40 % | 5º → **4º** |
| Anderson | 3 / 1 | +0 / +6 | **3 / 7** | 30,00 | 30 % | **2º → 5º** |
| Ricardo (ex-membro) | 0 / 4 | — | **0 / 4** | 0,00 | oculto | — |
| **Σ V** | **18** | +9 | **27** | | | |
| **Σ D** | **18** | +9 | **27** | | | |
| **Partidas** | **18** | +9 | **27** | | | |

Anderson caindo de 2º a 5º após perder 6 seguidas é um caso de teste natural para `positionChange`.

### Estatísticas globais de Rodrigo — antes e depois

| | Antes de 14/07 | Δ noite | Depois | Confere com |
|---|---:|---:|---:|---|
| Partidas | 43 | +4 | **47** | card "Partidas jogadas — 47" |
| Vitórias | 25 | +4 | **29** | |
| Derrotas | 18 | +0 | **18** | 29 + 18 = 47 |
| Taxa de vitória | 58,14 % | | **61,70 %** | exibe **62 %** = card "Taxa de vitória — 62%" |
| Vitórias consecutivas | 1 | +4 | **5** | card "Vitórias consecutivas — 5" |
| Maior sequência de derrotas | 2 | — | **2** | card "Maiores derrotas — 2" |

Os "47 partidas / 62 % / 5 consecutivas" da Home são o estado **depois** desta noite — Rodrigo venceu as 4 partidas que jogou, emendando na vitória que já tinha.

### Head-to-head canônico Rodrigo × João — **5 × 3** (62,50 %)

| Jogatina | Liga | Rodrigo | João |
|---|---|---:|---:|
| 2026-07-14 | Liga da Terça | 1 | 0 |
| 2026-07-07 | Liga da Terça | 2 | 1 |
| 2026-06-30 | Liga da Terça | 0 | 2 |
| 2026-06-23 | Ranking do Bar do Zé | 2 | 0 |
| **Total** | | **5** | **3** |

### Outros identificadores fixos

| Recurso | UUID / valor |
|---|---|
| Convite de liga pendente (Liga do Churrasco → Rodrigo) | `8a9b0c1d-2e3f-4a5b-8c6d-000000000001` |
| Código de convite da Liga da Terça | `TERCA-7K9M` |
| Convite de amizade Carlos Mota → Rodrigo | `9f8e7d6c-5b4a-4392-8180-000000000001` |
| Convite de amizade Pedro Nunes → Rodrigo | `9f8e7d6c-5b4a-4392-8180-000000000002` |
| Amizade Rodrigo ↔ João | `6d5c4b3a-2918-4706-85f4-000000000001` |
| Notificação "Liga do Churrasco te convidou" | `2b3c4d5e-6f70-4812-9a34-000000000001` |
| Artefato de compartilhamento do pódio 14/07 | `4c5d6e7f-8091-42a3-b5c6-000000000001` |
| `traceId` usado nos exemplos de erro | `0af7651916cd43dd8448eb211c80319c` |
| `Idempotency-Key` usado nos exemplos | `d290f1ee-6c54-4b01-90e6-d701748f0851` |

---

## 0.7 Perguntas críticas que **bloqueiam** decisões arquiteturais

Sete decisões precisam de resposta **antes** da primeira linha de código de domínio. As demais (total de 24) estão no [capítulo 19](19-decisoes-pendentes.md).

| ID | Pergunta bloqueante | Por que bloqueia | Recomendação |
|---|---|---|---|
| **DP-001** | **O resultado precisa de confirmação do adversário?** | Muda a máquina de estados da partida (`FINISHED` direto vs. `AWAITING_CONFIRMATION`), muda o ranking (materializado só após confirmar) e cria fila de pendências + notificações | **MVP: não.** Quem registra é fonte da verdade; qualquer participante pode **contestar** via correção com auditoria. Confirmação vira `DP-001b` pós-MVP |
| **DP-011** | **Partida pode existir fora de uma liga?** ("jogo avulso") | Define se `Match.leagueId` é obrigatório, se existe ranking global e se `PlaySession` pode ser órfã. Reescrever depois é migração de dados | **MVP: não.** `leagueId` obrigatório. Para o jogo avulso, o usuário cria uma liga de duração "Um dia" — que já existe no wizard |
| **DP-012** | **A jogatina é criada explicitamente ou implicitamente?** | Muda o contrato de "Iniciar partida" (1 chamada vs. 2) e o comportamento offline | **Implícita com endpoint explícito disponível**: `POST /matches` resolve/cria a sessão aberta do dia; `POST /play-sessions` existe para quem quiser abrir antes |
| **DP-013** | **Duplas entram no MVP?** | `MatchParticipant` precisa de `side` + N jogadores por lado desde o início; ranking de duplas tem fórmula própria; o mockup **desenha o chip "Duplas"** mas não desenha nenhuma tela de duplas | **Modelar agora, habilitar depois**: schema suporta `side` e 1..2 jogadores; API rejeita `gameMode=TEAM_2V2` no MVP com `FEATURE_NOT_AVAILABLE` |
| **DP-009** | **Qual é exatamente a fórmula e o desempate do ranking?** | É o coração do produto e do capítulo 12; o mockup usa duas regras de arredondamento diferentes | `winRate = wins / (wins + losses)`, `decimal(5,2)`, mínimo de partidas = 0; desempate: `winRate` → `wins` → menos derrotas → confronto direto → `joinedAt` |
| **DP-014** | **Quem registra a bola encaçapada e para quem ela conta?** | Define se `MatchEvent` tem `actorUserId` obrigatório; sem isso a feature vira enfeite sem estatística | Registrar `pocketedByUserId` (default: jogador da vez inferido pelo app, editável). Se Produto não quiser, degradar para `ballsOnTable` como estado agregado da partida |
| **DP-004** | **Quais dados aparecem em link público de compartilhamento?** | LGPD: um link sem autenticação expondo nome completo + @username + resultados é tratamento de dado pessoal com base legal própria | Card público mostra **primeiro nome + inicial** e avatar; link com `expiresAt` de 30 dias e `revocable`; opt-out por usuário nas preferências |

---

## 0.8 Restrições e premissas assumidas

| # | Premissa | Origem |
|---|---|---|
| PR-01 | Cliente é **app mobile nativo/híbrido**; não há SPA web no MVP. Backend expõe apenas API REST/JSON | Mockup travado em viewport de celular |
| PR-02 | Público inicial **Brasil**: idioma `pt-BR`, moeda `BRL`, timezone padrão `America/Sao_Paulo` | Enunciado + textos do mockup |
| PR-03 | Stack: **C#/.NET 8+ (ASP.NET Core Minimal API/Controllers)**, **Azure**, **PostgreSQL (Azure Database for PostgreSQL Flexible Server)**, Clean Architecture com domínio livre de framework | Padrão técnico da organização |
| PR-04 | Nomenclatura de recursos Azure segue **CAF + convenção LFTM** | Padrão técnico da organização |
| PR-05 | **Migrações EF Core ficam fora** da análise de qualidade de código | Padrão técnico da organização |
| PR-06 | Volume inicial estimado: **< 50 mil usuários**, **< 5 mil partidas/dia**, pico concentrado entre 20h e 01h (BRT), dias úteis à noite e fim de semana | Inferido do domínio (jogatina noturna) — validar com Produto |
| PR-07 | Não há requisito de **operação offline** no MVP; a partida exige conectividade | Nenhum indício de sincronização no mockup. Ver `DP-021` |

---

## 0.9 Fora do escopo desta especificação

- Design de UI/UX, design system e implementação do app cliente.
- Estratégia de monetização, anúncios ou planos pagos.
- Torneios com chaveamento (mata-mata), handicap, sistema de pontos tipo Elo.
- Streaming/vídeo de partidas.
- Cadastro colaborativo de locais pelos usuários (ver `DP-018`).
- Sistema de moderação de conteúdo e denúncias (ver `DP-022`).
- Marketplace ou reserva de mesa em bares.
