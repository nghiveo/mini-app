create table if not exists public.team_setups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by text,
  total_members integer not null check (total_members >= 4)
);

create table if not exists public.team_setup_members (
  id uuid primary key default gen_random_uuid(),
  setup_id uuid not null references public.team_setups (id) on delete cascade,
  full_name text not null,
  title text,
  team_number smallint not null check (team_number between 1 and 4),
  position_in_team integer not null check (position_in_team >= 1),
  created_at timestamptz not null default now()
);

create index if not exists idx_team_setup_members_setup_id
  on public.team_setup_members (setup_id);

