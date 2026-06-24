# Placar da Sinuca — especificação

## Objetivo
App recreativo pra registrar e consultar o histórico de partidas de sinuca de um
grupo de amigos (formato "vai quem ganha", 1v1). Foco em ser fácil e gostoso de
consultar pela galera.

## Escopo (v1)
- Registrar partida: jogador A, jogador B, vencedor, data/hora.
- Ordem das bolas encaçapadas: opcional por partida.
- Ranking geral (vitórias, derrotas, % aproveitamento, sequência atual e melhor sequência).
- Histórico de partidas com filtro por nome e detalhe (incluindo ordem das bolas).
- Confronto direto (head-to-head) entre dois jogadores.
- Perfil do jogador com stats e últimos jogos.
- Records: mais vitórias, maior sequência na mesa, mais bolas em sequência, mais
  jogos, melhor aproveitamento (3+ jogos), quem está em sequência agora.
- Acesso: leitura pública (qualquer um com o link); escrita só pro admin logado.

## Fora de escopo (v1)
Foto de jogador, comentários por partida, edição da ordem das bolas após salvar
(apaga e relança), notificações.

## Arquitetura
- Front: arquivo único `index.html` (HTML + JS puro + cliente Supabase via CDN),
  sem build. Hospedado de graça no Netlify.
- Back: Supabase (Postgres + API automática + Auth). Camada gratuita.
- Sem servidor próprio.

## Dados
- `players(id, name único, created_at)`
- `matches(id, played_at, player_a, player_b, winner_id, ball_log jsonb, notes, created_at)`
  - `ball_log`: lista ordenada `{ n, ball, by(playerId) }`, vazia quando não registrada.

## Segurança / acesso
- RLS: SELECT liberado pra todos; INSERT/UPDATE/DELETE só `authenticated`.
- Admin = um usuário criado no Supabase Auth (e-mail/senha). Login feito no app.

## Cálculos (no cliente)
- Stats e streaks derivados das partidas em ordem cronológica.
- "Mais bolas em sequência" = maior corrida de entradas consecutivas do mesmo
  jogador no `ball_log`, em qualquer partida.

## Visual
Tema mesa de sinuca: fundo pano verde, destaque amarelo (bola 1) pra vencedor,
azul giz pra interação, latão nos detalhes. Jogadores representados como bolas.
Mobile-first com navegação por barra inferior (Ranking, Partidas, Confronto,
Records, Admin).
