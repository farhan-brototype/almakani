-- =====================================================================
--  ENTRY WINDOWS — run once in the Supabase SQL editor
--  Per-item and custom ("random") programme entry windows: each window
--  has its own deadline and open/closed switch. When the deadline has
--  passed the window counts as closed automatically; the admin can turn
--  it back on (which clears / extends the deadline).
-- =====================================================================

-- 1. TABLES ----------------------------------------------------------

create table if not exists public.entry_windows (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('item', 'random')),
  -- for kind = 'item' this is the category item name (Stage, Non-stage, …)
  -- for kind = 'random' this is the admin-given name of the group
  name        text not null,
  deadline    timestamptz,
  is_open     boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kind, name)
);

create table if not exists public.entry_window_programs (
  window_id   uuid not null references public.entry_windows(id) on delete cascade,
  program_id  uuid not null references public.programs(id) on delete cascade,
  primary key (window_id, program_id)
);

create index if not exists entry_window_programs_program_idx
  on public.entry_window_programs(program_id);

-- 2. GRANTS (required for the Data API) -------------------------------

grant select on public.entry_windows, public.entry_window_programs to anon;
grant select, insert, update, delete on
  public.entry_windows, public.entry_window_programs to authenticated;
grant all on public.entry_windows, public.entry_window_programs to service_role;

-- 3. RLS ---------------------------------------------------------------

alter table public.entry_windows enable row level security;
alter table public.entry_window_programs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['entry_windows', 'entry_window_programs'] loop
    execute format('drop policy if exists "public read %1$s" on public.%1$I', t);
    execute format('create policy "public read %1$s" on public.%1$I for select
      to anon, authenticated using (true)', t);
    execute format('drop policy if exists "admin all %1$s" on public.%1$I', t);
    execute format('create policy "admin all %1$s" on public.%1$I for all to authenticated
      using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- 4. REALTIME ----------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.entry_windows;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.entry_window_programs;
  exception when duplicate_object then null; end;
end $$;

alter table public.entry_windows replica identity full;
alter table public.entry_window_programs replica identity full;
