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
  ended_at    timestamptz,
  player_a    uuid not null references players(id) on delete cascade,
  player_b    uuid not null references players(id) on delete cascade,
  winner_id   uuid references players(id) on delete cascade,
  mode        text not null default '1x1' check (mode in ('1x1', '2x2')),
  team_a      jsonb,
  team_b      jsonb,
  winner_side text check (winner_side in ('a', 'b')),
  breaker_id  uuid references players(id) on delete set null,
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
    status <> 'finished' or winner_id is not null or winner_side is not null
  )
);

-- Migração segura para bancos criados com a versão HTML inicial.
alter table matches add column if not exists status text not null default 'finished';
alter table matches add column if not exists updated_at timestamptz not null default now();
alter table matches add column if not exists ended_at timestamptz;
alter table matches add column if not exists mode text not null default '1x1';
alter table matches add column if not exists team_a jsonb;
alter table matches add column if not exists team_b jsonb;
alter table matches add column if not exists winner_side text;
alter table matches add column if not exists breaker_id uuid references players(id) on delete set null;
alter table matches alter column winner_id drop not null;
update matches
set winner_side = case when winner_id = player_a then 'a' when winner_id = player_b then 'b' end
where winner_side is null and winner_id is not null;
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
      status <> 'finished' or winner_id is not null or winner_side is not null
    );
  end if;
end $$;

alter table matches drop constraint if exists matches_finished_has_winner;
alter table matches add constraint matches_finished_has_winner check (
  status <> 'finished' or winner_id is not null or winner_side is not null
);
alter table matches drop constraint if exists matches_mode_check;
alter table matches add constraint matches_mode_check check (mode in ('1x1', '2x2'));
alter table matches drop constraint if exists matches_winner_side_check;
alter table matches add constraint matches_winner_side_check check (winner_side is null or winner_side in ('a', 'b'));
alter table matches drop constraint if exists matches_team_shape_check;
alter table matches add constraint matches_team_shape_check check (
  mode = '1x1'
  or (
    jsonb_typeof(team_a) = 'array' and jsonb_array_length(team_a) = 2
    and jsonb_typeof(team_b) = 'array' and jsonb_array_length(team_b) = 2
    and team_a->>0 <> team_a->>1
    and team_b->>0 <> team_b->>1
    and team_a->>0 <> team_b->>0 and team_a->>0 <> team_b->>1
    and team_a->>1 <> team_b->>0 and team_a->>1 <> team_b->>1
  )
);

create index if not exists matches_played_at_idx on matches (played_at desc);

-- Antes só existia uma mesa de sinuca, então só podia haver 1 partida "live"
-- por vez. Hoje há mais de uma mesa, então essa trava foi removida (o app
-- passou a suportar múltiplas partidas ao vivo simultâneas).
drop index if exists matches_single_live_idx;

-- Realtime na tabela matches: cada tela (por mesa) reflete o que acontece
-- nas outras sem precisar de reload manual.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;

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

-- Logs de auditoria ------------------------------------------
-- Registra ações administrativas relevantes: jogadores,
-- partidas, configurações e eventos da partida ao vivo.
create table if not exists audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid,
  actor_email   text not null default 'admin',
  action        text not null,
  entity_type   text not null,
  entity_id     text,
  message       text not null,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on audit_logs (created_at desc);
create index if not exists audit_logs_actor_email_idx on audit_logs (actor_email);

-- Clipes de partidas -----------------------------------------
-- Arquivos gravados pelo app iOS e vinculados a uma partida.
create table if not exists match_clips (
  id                uuid primary key default gen_random_uuid(),
  match_id          uuid not null references matches(id) on delete cascade,
  storage_path      text not null,
  duration_seconds  int not null check (duration_seconds > 0),
  label             text,
  file_name         text,
  mime_type         text not null default 'video/mp4',
  created_by        uuid,
  created_at        timestamptz not null default now()
);

create index if not exists match_clips_match_id_idx on match_clips (match_id);
create index if not exists match_clips_created_at_idx on match_clips (created_at desc);

-- Bucket publico para download/visualização dos clipes no web app.
insert into storage.buckets (id, name, public)
values ('match-clips', 'match-clips', true)
on conflict (id) do update set public = true;

-- ============================================================
--  RLS (Row Level Security)
--  Leitura: liberada para todos (qualquer pessoa com o link).
--  Escrita: somente usuario logado (o admin).
-- ============================================================
alter table players enable row level security;
alter table matches enable row level security;
alter table audit_logs enable row level security;
alter table match_clips enable row level security;

-- Leitura publica
drop policy if exists "leitura publica players" on players;
create policy "leitura publica players"
  on players for select using (true);

drop policy if exists "leitura publica matches" on matches;
create policy "leitura publica matches"
  on matches for select using (true);

drop policy if exists "leitura admin audit_logs" on audit_logs;
create policy "leitura admin audit_logs"
  on audit_logs for select using (auth.role() = 'authenticated');

drop policy if exists "leitura publica match_clips" on match_clips;
create policy "leitura publica match_clips"
  on match_clips for select using (true);

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

drop policy if exists "escrita admin audit_logs" on audit_logs;
create policy "escrita admin audit_logs"
  on audit_logs for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "escrita admin match_clips" on match_clips;
create policy "escrita admin match_clips"
  on match_clips for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Storage: leitura publica, escrita somente admin autenticado.
drop policy if exists "leitura publica match clip files" on storage.objects;
create policy "leitura publica match clip files"
  on storage.objects for select
  using (bucket_id = 'match-clips');

drop policy if exists "escrita admin match clip files" on storage.objects;
create policy "escrita admin match clip files"
  on storage.objects for all
  using (bucket_id = 'match-clips' and auth.role() = 'authenticated')
  with check (bucket_id = 'match-clips' and auth.role() = 'authenticated');
