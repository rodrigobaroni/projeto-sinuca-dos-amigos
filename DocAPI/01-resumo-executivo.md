# 1. Resumo executivo

## 1.1 Contexto

Sinuca entre amigos é organizada hoje por grupo de WhatsApp, papel e memória. Quem venceu quantas vezes na terça passada é uma discussão recorrente e sem fonte da verdade. O **Encaçapei** transforma essa rotina informal em dado: liga com regras acordadas, jogatinas com data e local, partidas registradas em tempo real na beira da mesa e ranking atualizado automaticamente — mais o pódio do dia pronto para cair no grupo.

O mockup navegável já define o produto com clareza incomum: cinco áreas (Home, Amigos, Liga, Locais, Perfil), um wizard de criação de liga com regras configuráveis, uma tela de partida que registra bola a bola, e um card de compartilhamento como desfecho natural da noite.

## 1.2 Objetivo do produto

Permitir que grupos de amigos **organizem, registrem e comparem** partidas de sinuca com esforço próximo de zero durante o jogo:

1. **Organizar** — criar ligas com local, calendário recorrente (dias + janela horária), duração e regras de marcação.
2. **Registrar** — abrir a jogatina do dia, escolher adversário, marcar bolas encaçapadas e fechar o resultado em dois toques.
3. **Comparar** — ranking por liga, estatísticas pessoais, evolução em 30 dias e histórico de confronto direto entre dois jogadores.
4. **Encontrar** — bares com mesa próximos, com preço/hora, horário de funcionamento e rota.
5. **Compartilhar** — pódio da jogatina como card visual para WhatsApp, Instagram e TikTok.

## 1.3 Principais usuários

| Persona | Descrição | O que espera do produto | Telas críticas |
|---|---|---|---|
| **O organizador** (ex.: Rodrigo, `@baroni`) | Cria a liga, convida a galera, cobra presença. Dono/admin | Configurar regras, convidar por código, encerrar liga, ranking confiável | Wizard, Config da liga, Ranking |
| **O jogador da noite** (ex.: João, `@joaop`) | Só quer jogar e ver se está ganhando | Registro rápido durante a partida, "N vitórias hoje", pódio no fim | Seleção de adversário, Partida, Modal de pódio |
| **O competitivo** (ex.: Felipe, `@felipao`) | Acompanha número, provoca no grupo | Head-to-head, taxa de vitória, evolução 30 dias, sequência de vitórias | Home (KPIs + gráficos), H2H |
| **O explorador** | Grupo sem mesa fixa | Achar bar perto, ver preço/hora e traçar rota | Locais (mapa + modal) |
| **Admin da plataforma** `[R]` | Operação/suporte da LFTM | Curar catálogo de locais, atender LGPD, investigar abuso | Back-office (fora do app) |

## 1.4 Módulos do sistema

| Módulo | Responsabilidade em uma frase | Prioridade |
|---|---|---|
| **Identity & Auth** | Cadastro em etapas, login, tokens, recuperação e troca de senha, verificação de e-mail | MVP |
| **Users** | Perfil, username único, avatar, busca de usuários, desativação/exclusão | MVP |
| **Friendships** | Convites de amizade, lista de amigos, remoção, bloqueio | MVP |
| **Leagues** | Ligas, regras, calendário, visibilidade, encerramento | MVP |
| **League Memberships** | Membros, papéis (owner/admin/player), entrada e saída | MVP |
| **Invitations** | Convites nominais e códigos de convite (liga) | MVP |
| **Play Sessions** | Jogatinas: a "noite de jogo" que agrupa partidas e gera o pódio do dia | MVP |
| **Matches & Match Events** | Partidas, participantes, bolas encaçapadas, faltas, finalização, correção | MVP |
| **Rankings** | Ranking materializado por liga e por jogatina, desempates, reprocessamento | MVP |
| **Statistics** | KPIs pessoais, séries temporais, head-to-head | MVP |
| **Venues** | Catálogo de locais, busca por proximidade, associação a ligas | MVP (leitura) |
| **Notifications** | Notificações in-app, contadores, preferências, push | MVP (in-app) / Pós-MVP (push) |
| **Sharing** | Resumo da jogatina, geração de card e link público | Pós-MVP (imagem) / MVP (texto + link) |
| **Audit Logs** | Trilha imutável de alterações sensíveis (correção de resultado, mudança de regra, remoção de membro) | MVP |

## 1.5 Responsabilidade do backend

**O backend é dono de:**

- Toda a **verdade transacional**: quem é membro de quê, quem venceu qual partida, qual é a posição no ranking.
- **Autorização em nível de objeto** — nenhuma tela decide permissão; o servidor decide.
- **Cálculo de ranking, estatísticas e pódio**, incluindo reprocessamento após correção de resultado. O app **nunca** calcula percentual, posição ou streak.
- **Consistência sob concorrência**: dois celulares na mesma mesa registrando a mesma partida.
- **Idempotência** de operações de escrita disparadas em rede instável (bar, 4G ruim).
- **Agendamento e disparo** de lembretes de jogatina, convites e resultados.
- **Geolocalização**: cálculo de distância e ordenação por proximidade.
- **Retenção, exportação e eliminação de dados pessoais** (LGPD).
- **Geração do artefato de compartilhamento** (dados do resumo + imagem renderizada + link público com expiração).

**O backend NÃO é dono de:**

- Render do onboarding, animações, estado de UI (abas, expanders, chips selecionados).
- Formatação de datas relativas ("há 2 horas") — envia `ISO 8601 UTC`, o app formata.
- Abertura do compositor nativo do WhatsApp/Instagram/TikTok — o app usa share sheet do SO com a URL/imagem que o backend produziu.
- Render do mapa e do traçado de rota — o app usa o SDK de mapas com as coordenadas que o backend fornece.
- Cache de UI e otimismo visual (o app pode pintar a bola como encaçapada antes do 202).

## 1.6 Escopo do MVP

### Dentro do MVP

| Área | Entregas |
|---|---|
| Auth | Cadastro em 6 etapas, verificação de e-mail, login, refresh com rotação, logout, esqueci/redefinir senha, alterar senha |
| Perfil | Ver/editar perfil, username único, upload de avatar, estatísticas próprias, desativar conta, exportar dados, excluir conta |
| Amigos | Buscar usuários, convidar, aceitar, recusar, cancelar, listar, remover, head-to-head com filtros de liga e período |
| Ligas | Criar (wizard 3 passos), listar ativas/encerradas, buscar públicas, ver detalhe, editar config, encerrar, sair, membros, papéis, convite nominal, código de convite, entrar por código |
| Jogatinas | Abertura implícita e explícita, listar, consultar jogatina ativa, participantes, pódio parcial e final, encerrar |
| Partidas | Iniciar 1v1, registrar bola encaçapada, registrar falta, desfazer evento, finalizar, cancelar, corrigir resultado com auditoria |
| Ranking | Ranking materializado por liga, ranking da jogatina, desempates, reprocessamento assíncrono após correção |
| Estatísticas | 4 KPIs da Home, série de taxa de vitória (30 dias), vitórias/derrotas por semana (4 semanas), "N vitórias hoje" |
| Locais | Busca por proximidade (lat/lng/raio), detalhe, ligas do local, atrelar/desatrelar liga; catálogo curado pela plataforma |
| Notificações | In-app: listar agrupado, contador de não lidas, marcar lida, marcar todas, excluir, limpar histórico, preferências |
| Compartilhamento | Resumo estruturado da jogatina + link público com expiração + texto pronto para WhatsApp |
| LGPD | Consentimento de localização, exportação, exclusão/anonimização, retenção, auditoria |

### Fora do MVP (pós-MVP explícito)

| Item | Motivo | Fase |
|---|---|---|
| Partidas em **duplas** (`TEAM_2V2`) | Chip existe no wizard, mas nenhuma tela de duplas foi desenhada; ranking de duplas exige fórmula própria (`DP-013`) | Pós-MVP |
| **Confirmação do resultado pelo adversário** | Adiciona estado e fricção; correção com auditoria cobre o caso (`DP-001`) | Pós-MVP |
| **Push notifications** | Exige Notification Hubs + device tokens + app publicado nas lojas; in-app cobre o MVP | Pós-MVP (mas `POST /devices` já entra no MVP) |
| **Geração de imagem do card** (Instagram/TikTok) | Renderização server-side é infra dedicada; MVP entrega link + texto (`DP-020`) | Pós-MVP |
| **Ranking global** entre todas as ligas | Sem tela no mockup; abre problema de comparabilidade entre ligas com regras diferentes (`DP-016`) | Futuro |
| **Avaliação de locais pelo usuário** | Mockup exibe nota `4.5 (128 avaliações)` mas não oferece ação de avaliar; provavelmente dado de terceiro (`DP-017`) | Futuro |
| **Cadastro de locais pelo usuário** | Sem tela; exige moderação (`DP-018`) | Futuro |
| **Bloqueio de usuário** | Sem tela; risco de assédio existe, mas não é bloqueante no MVP (`DP-022`) | Pós-MVP |
| **Modo offline / fila local** | Sem indício no mockup; bar com sinal ruim é risco real (`DP-021`) | Pós-MVP |
| Torneios, chaveamento, Elo, handicap | Não estão no produto | Futuro |

## 1.7 Restrições

| # | Restrição | Consequência de projeto |
|---|---|---|
| RS-01 | Uso **na beira da mesa**, com uma mão, sinal instável, tela de celular | Escritas idempotentes, payloads pequenos, endpoint único por ação, tolerância a retry |
| RS-02 | Vários celulares registram a **mesma** partida | Optimistic locking (`version` + `If-Match`) e chave natural anti-duplicidade |
| RS-03 | Jogatina **cruza a meia-noite** (20h–00h+) | Data da jogatina é `businessDate` no fuso da liga, nunca `date(created_at UTC)` |
| RS-04 | Dado pessoal de brasileiros (LGPD) | Base legal por finalidade, minimização em links públicos, exportação e eliminação |
| RS-05 | Stack C#/.NET + Azure, Clean Architecture | Domínio sem dependência de EF Core/ASP.NET; adapters nas bordas |
| RS-06 | Time pequeno no MVP | Monólito modular, sem mensageria externa no dia 1 (outbox + worker in-process) |

## 1.8 Critérios de sucesso técnico do MVP

| Métrica | Alvo |
|---|---|
| p95 de `POST /matches/{id}/finish` | < 400 ms |
| p95 de `GET /leagues/{id}/ranking` | < 250 ms |
| Divergência de ranking após correção de resultado | 0 (reprocessamento com consistência verificável) |
| Partidas duplicadas por retry de rede | 0 (idempotência comprovada em teste de caos) |
| Disponibilidade na janela 20h–02h BRT | ≥ 99,5 % |
