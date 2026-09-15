-- Fila da noite e mesas nomeadas.
--
-- Cria as mesas (pool_tables), a presenca por dia de jogatina (attendance) e
-- liga a partida a mesa onde foi jogada (matches.table_id).
--
-- Seguro para rodar em banco que ja tem partidas: table_id nasce nulo e as
-- partidas antigas continuam validas sem mesa. Idempotente - rodar duas vezes
-- nao duplica nada.
begin;

-- ---------------------------------------------------------------- pool_tables
-- As mesas moram no banco, nao no localStorage, porque a fila e compartilhada:
-- se o nome fosse local, um segundo aparelho mostraria "mesa 1" enquanto o
-- primeiro mostra "mesa do fundo". O flag active e como se diz "hoje e noite
-- de mesa so" - com uma mesa ativa, a regra de nao voltar pra mesa onde
-- perdeu se desliga sozinha.
create table if not exists public.pool_tables (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pool_tables_name_not_blank check (btrim(name) <> '')
);

create unique index if not exists pool_tables_name_idx on public.pool_tables (lower(btrim(name)));

-- ----------------------------------------------------------------- attendance
-- Uma linha por pessoa por noite. enqueued_at E a posicao na fila: chegou,
-- carimba; perdeu, recarimba e volta pro fim. Sem coluna de posicao numerica,
-- entao nao ha renumeracao nem duas linhas brigando pelo mesmo lugar.
--
-- left_at preenchido = foi embora, sai da fila. Voltou? Limpa left_at e
-- recarimba enqueued_at.
--
-- game_day e a chave 'YYYY-MM-DD' do dia de jogatina (12h as 12h), calculada
-- no app por gameDayKey() em src/utils/date.js - nao e a data de calendario.
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  game_day    text not null,
  player_id   uuid not null references public.players(id) on delete cascade,
  arrived_at  timestamptz not null default now(),
  enqueued_at timestamptz not null default now(),
  left_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint attendance_game_day_format check (game_day ~ '^\d{4}-\d{2}-\d{2}$'),
  constraint attendance_unique_player_per_day unique (game_day, player_id)
);

create index if not exists attendance_queue_idx on public.attendance (game_day, enqueued_at);

-- ----------------------------------------------------- matches.table_id
-- Nulo de proposito: as partidas que ja existem foram jogadas antes de haver
-- mesa nomeada, e preencher na marra seria inventar dado.
alter table public.matches
  add column if not exists table_id uuid references public.pool_tables(id) on delete set null;

create index if not exists matches_table_id_idx on public.matches (table_id);

-- --------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pool_tables_touch_updated_at on public.pool_tables;
create trigger pool_tables_touch_updated_at
  before update on public.pool_tables
  for each row
  execute function public.touch_updated_at();

drop trigger if exists attendance_touch_updated_at on public.attendance;
create trigger attendance_touch_updated_at
  before update on public.attendance
  for each row
  execute function public.touch_updated_at();

-- ---------------------------------------------------------------------- RLS
-- Mesmo contrato das tabelas que ja existem: qualquer um le, so admin logado
-- escreve.
alter table public.pool_tables enable row level security;
alter table public.attendance  enable row level security;

drop policy if exists "leitura publica pool_tables" on public.pool_tables;
create policy "leitura publica pool_tables"
  on public.pool_tables for select using (true);

drop policy if exists "escrita admin pool_tables" on public.pool_tables;
create policy "escrita admin pool_tables"
  on public.pool_tables for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "leitura publica attendance" on public.attendance;
create policy "leitura publica attendance"
  on public.attendance for select using (true);

drop policy if exists "escrita admin attendance" on public.attendance;
create policy "escrita admin attendance"
  on public.attendance for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ----------------------------------------------------------------- realtime
-- A fila so vale a pena compartilhada: quem marca presenca num aparelho tem
-- que aparecer no outro sem reload.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pool_tables'
  ) then
    alter publication supabase_realtime add table public.pool_tables;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance'
  ) then
    alter publication supabase_realtime add table public.attendance;
  end if;
end $$;

-- --------------------------------------------------------------------- seed
-- Duas mesas pra comecar. Renomear e ativar/desativar sai pela aba Fila das
-- configuracoes depois que a tela existir.
insert into public.pool_tables (name, sort_order, active)
values ('Mesa 1', 1, true), ('Mesa 2', 2, true)
on conflict do nothing;

commit;
