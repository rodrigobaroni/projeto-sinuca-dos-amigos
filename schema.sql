-- ============================================================
--  PLACAR DA SINUCA — schema do banco (Supabase / Postgres)
--  Cole TODO este conteudo no SQL Editor do Supabase e clique RUN.
-- ============================================================

-- Tabela de jogadores -----------------------------------------
create table if not exists players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- Tabela de partidas ------------------------------------------
-- Cada linha = um jogo 1v1 com vencedor definido.
-- ball_log guarda a ordem das bolas (opcional): lista de
--   { "n": 1, "ball": "7", "by": "<uuid-do-jogador>" }
create table if not exists matches (
  id          uuid primary key default gen_random_uuid(),
  played_at   timestamptz not null default now(),
  player_a    uuid not null references players(id) on delete cascade,
  player_b    uuid not null references players(id) on delete cascade,
  winner_id   uuid not null references players(id) on delete cascade,
  ball_log    jsonb not null default '[]'::jsonb,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists matches_played_at_idx on matches (played_at desc);

-- ============================================================
--  RLS (Row Level Security)
--  Leitura: liberada para todos (qualquer pessoa com o link).
--  Escrita: somente usuario logado (o admin).
-- ============================================================
alter table players enable row level security;
alter table matches enable row level security;

-- Leitura publica
drop policy if exists "leitura publica players" on players;
create policy "leitura publica players"
  on players for select using (true);

drop policy if exists "leitura publica matches" on matches;
create policy "leitura publica matches"
  on matches for select using (true);

-- Escrita somente para logado (admin)
drop policy if exists "escrita admin players" on players;
create policy "escrita admin players"
  on players for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "escrita admin matches" on matches;
create policy "escrita admin matches"
  on matches for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
