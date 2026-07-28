-- Partidas 2x2. Seguro para executar em bancos que já possuem partidas 1x1.
begin;

alter table public.matches add column if not exists mode text not null default '1x1';
alter table public.matches add column if not exists team_a jsonb;
alter table public.matches add column if not exists team_b jsonb;
alter table public.matches add column if not exists winner_side text;
alter table public.matches add column if not exists breaker_id uuid references public.players(id) on delete set null;
alter table public.matches alter column winner_id drop not null;

update public.matches
set winner_side = case when winner_id = player_a then 'a' when winner_id = player_b then 'b' end
where winner_side is null and winner_id is not null;

alter table public.matches drop constraint if exists matches_finished_has_winner;
alter table public.matches add constraint matches_finished_has_winner check (
  status <> 'finished' or winner_id is not null or winner_side is not null
);

alter table public.matches drop constraint if exists matches_mode_check;
alter table public.matches add constraint matches_mode_check check (mode in ('1x1', '2x2'));

alter table public.matches drop constraint if exists matches_winner_side_check;
alter table public.matches add constraint matches_winner_side_check check (
  winner_side is null or winner_side in ('a', 'b')
);

alter table public.matches drop constraint if exists matches_team_shape_check;
alter table public.matches add constraint matches_team_shape_check check (
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

commit;
