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
  winner_id   uuid references players(id) on delete cascade,
  status      text not null default 'finished' check (status in ('live', 'finished')),
  ball_log    jsonb not null default '[]'::jsonb,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint matches_distinct_players check (player_a <> player_b),
  constraint matches_winner_participates check (
    winner_id is null or winner_id = player_a or winner_id = player_b
  ),
  constraint matches_finished_has_winner check (
    status <> 'finished' or winner_id is not null
  )
);

-- Migração segura para bancos criados com a versão HTML inicial.
alter table matches add column if not exists status text not null default 'finished';
alter table matches add column if not exists updated_at timestamptz not null default now();
alter table matches alter column winner_id drop not null;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matches_status_check'
  ) then
    alter table matches add constraint matches_status_check check (status in ('live', 'finished'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matches_distinct_players'
  ) then
    alter table matches add constraint matches_distinct_players check (player_a <> player_b);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'matches_winner_participates'
  ) then
    alter table matches add constraint matches_winner_participates check (
      winner_id is null or winner_id = player_a or winner_id = player_b
    );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'matches_finished_has_winner'
  ) then
    alter table matches add constraint matches_finished_has_winner check (
      status <> 'finished' or winner_id is not null
    );
  end if;
end $$;

create index if not exists matches_played_at_idx on matches (played_at desc);
create unique index if not exists matches_single_live_idx
  on matches ((status))
  where status = 'live';

create or replace function touch_matches_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists matches_touch_updated_at on matches;
create trigger matches_touch_updated_at
  before update on matches
  for each row
  execute function touch_matches_updated_at();

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
