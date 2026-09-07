-- =====================================================================
--  ARTS FEST MANAGER — FULL DATABASE SCHEMA
--  Run this ONCE in your Supabase project: SQL Editor -> New query -> Run
-- =====================================================================

-- pgcrypto lives in the "extensions" schema on Supabase. Create it there and make sure
-- every security-definer function below can still see crypt()/gen_salt().
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------
-- 1. ADMIN ROLES
-- ---------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

drop policy if exists "admins read admin_users" on public.admin_users;
create policy "admins read admin_users" on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- 2. CORE TABLES
-- ---------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  username text not null unique,
  password_hash text not null,
  captain text,
  vice_captain text,
  vice_captain2 text,
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type text not null check (type in ('Stage','Non-stage','Sports','Group')),
  category text not null check (category in ('Aliya','Thanawiyya','Thaniya','Uoola','Kulliyya')),
  candidates int not null default 1,
  status text not null default 'upcoming' check (status in ('upcoming','completed','pending')),
  allowed_classes text,                     -- e.g. '1'  (restrict a code to class 1 of Uoola)
  entry_mode text not null default 'individual' check (entry_mode in ('individual','group','team')),
  group_count int not null default 1 check (group_count > 0),
  group_size int not null default 1 check (group_size > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  adno text not null unique,
  name text not null,
  class text,
  category text check (category in ('Aliya','Thanawiyya','Thaniya','Uoola','Kulliyya')),
  team_id uuid references public.teams(id) on delete set null,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.timetable (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  event_date date not null,
  event_time time,
  stage text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  slot_index int not null check (slot_index >= 0),
  created_at timestamptz not null default now(),
  unique (program_id, student_id)
);
create unique index if not exists assignments_program_team_slot_key
  on public.assignments (program_id, team_id, slot_index) where team_id is not null;

create table if not exists public.fest_settings (
  id int primary key default 1 check (id = 1),
  entry_open boolean not null default true,
  fest_name text not null default 'Arts Fest',
  updated_at timestamptz not null default now()
);
insert into public.fest_settings (id) values (1) on conflict do nothing;

create table if not exists public.category_limits (
  category text primary key check (category in ('Aliya','Thanawiyya','Thaniya','Uoola','Kulliyya')),
  stage_limit int not null default 3,
  nonstage_limit int not null default 3,
  group_limit int not null default 3
);
insert into public.category_limits (category) values
  ('Aliya'),('Thanawiyya'),('Thaniya'),('Uoola')
on conflict do nothing;

create table if not exists public.team_sessions (
  token uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.announcement_reads (
  team_id uuid not null references public.teams(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  primary key (team_id, announcement_id)
);

-- ---------------------------------------------------------------
-- 3. GRANTS  (required for the Data API)
-- ---------------------------------------------------------------
grant select on public.programs, public.timetable, public.announcements to anon;
grant select on public.teams to anon;   -- safe: password_hash is blocked by the public view below
grant select, insert, update, delete on
  public.programs, public.students, public.timetable, public.announcements,
  public.assignments, public.teams, public.fest_settings, public.category_limits
  to authenticated;
grant select on public.fest_settings, public.category_limits to anon;
grant all on public.programs, public.students, public.timetable, public.announcements,
  public.assignments, public.teams, public.fest_settings, public.category_limits,
  public.team_sessions, public.announcement_reads to service_role;

-- public-safe team view (no password hash)
create or replace view public.teams_public
with (security_invoker = on) as
  select id, name, captain, vice_captain, vice_captain2 from public.teams;
grant select on public.teams_public to anon, authenticated;

-- ---------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------
alter table public.teams            enable row level security;
alter table public.programs         enable row level security;
alter table public.students         enable row level security;
alter table public.timetable        enable row level security;
alter table public.announcements    enable row level security;
alter table public.assignments      enable row level security;
alter table public.fest_settings    enable row level security;
alter table public.category_limits  enable row level security;
alter table public.team_sessions    enable row level security;
alter table public.announcement_reads enable row level security;

-- Public (anonymous) read: only the non-personal fest information
drop policy if exists "public read programs" on public.programs;
create policy "public read programs" on public.programs for select to anon using (true);
drop policy if exists "public read timetable" on public.timetable;
create policy "public read timetable" on public.timetable for select to anon using (true);
drop policy if exists "public read announcements" on public.announcements;
create policy "public read announcements" on public.announcements for select to anon using (true);
drop policy if exists "public read teams" on public.teams;
create policy "public read teams" on public.teams for select to anon using (true);
drop policy if exists "public read settings" on public.fest_settings;
create policy "public read settings" on public.fest_settings for select to anon using (true);
drop policy if exists "public read limits" on public.category_limits;
create policy "public read limits" on public.category_limits for select to anon using (true);

-- NOTE: students and assignments are NOT readable by anon. Teams reach their own
-- rows only through the security-definer RPCs below (token checked server side).

-- Admin full access on everything
do $$
declare t text;
begin
  foreach t in array array['teams','programs','students','timetable','announcements',
                           'assignments','fest_settings','category_limits'] loop
    execute format('drop policy if exists "admin all %1$s" on public.%1$I', t);
    execute format(
      'create policy "admin all %1$s" on public.%1$I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- 5. TEAM AUTHENTICATION + TEAM RPCs (security definer)
-- ---------------------------------------------------------------
create or replace function public.team_login(p_username text, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare t public.teams; tok uuid;
begin
  select * into t from public.teams where lower(username) = lower(p_username);
  if t.id is null or t.password_hash <> crypt(p_password, t.password_hash) then
    raise exception 'Invalid username or password';
  end if;
  insert into public.team_sessions (team_id) values (t.id) returning token into tok;
  return json_build_object('token', tok, 'team',
    json_build_object('id', t.id, 'name', t.name, 'captain', t.captain,
                      'vice_captain', t.vice_captain, 'vice_captain2', t.vice_captain2));
end $$;

create or replace function public.team_of(p_token uuid)
returns uuid language sql stable security definer set search_path = public, extensions as $$
  select team_id from public.team_sessions where token = p_token
$$;

create or replace function public.team_logout(p_token uuid)
returns void language sql security definer set search_path = public, extensions as $$
  delete from public.team_sessions where token = p_token
$$;

-- students of my team (with program counts)
create or replace function public.team_students(p_token uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select json_agg(x order by x->>'name')
    from (
      select json_build_object(
        'id', s.id, 'adno', s.adno, 'name', s.name, 'class', s.class,
        'category', s.category, 'photo_url', s.photo_url,
        'programs', coalesce((
          select json_agg(json_build_object(
            'code', p.code, 'name', p.name, 'type', p.type, 'category', p.category,
            'event_date', tt.event_date, 'event_time', tt.event_time, 'stage', tt.stage,
            'completed', coalesce(tt.completed,false)))
          from public.assignments a
          join public.programs p on p.id = a.program_id
          left join public.timetable tt on tt.program_id = p.id
          where a.student_id = s.id), '[]'::json)
      ) as x
      from public.students s where s.team_id = tid
    ) q), '[]'::json);
end $$;

-- assignments of my team
create or replace function public.team_assignments(p_token uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  return coalesce((select json_agg(json_build_object(
      'id', a.id, 'program_id', a.program_id, 'program_code', p.code,
      'student_id', s.id, 'adno', s.adno, 'name', s.name, 'slot_index', a.slot_index)
      order by a.program_id, a.slot_index)
    from public.assignments a
    join public.programs p on p.id = a.program_id
    join public.students s on s.id = a.student_id
    where a.team_id = tid), '[]'::json);
end $$;

-- assign a student (all fest rules enforced here, server side)
create or replace function public.team_assign(p_token uuid, p_program_code text, p_adno text, p_slot_index int)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare tid uuid; pr public.programs; st public.students; lim public.category_limits; used int; cnt int;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  if p_slot_index < 0 then raise exception 'Invalid candidate slot'; end if;
  if not (select entry_open from public.fest_settings where id = 1) then
    raise exception 'Programme entry is closed by the admin';
  end if;

  select * into pr from public.programs where code = p_program_code;
  if pr.id is null then raise exception 'Unknown programme code'; end if;
  select * into st from public.students where adno = p_adno and team_id = tid;
  if st.id is null then raise exception 'Ad.No % is not in your team', p_adno; end if;

  if pr.category <> 'Kulliyya' and st.category is distinct from pr.category then
    raise exception 'Student category (%) does not match programme category (%)', st.category, pr.category;
  end if;
  if pr.allowed_classes is not null and coalesce(st.class,'') <> pr.allowed_classes then
    raise exception 'Programme % is only for class %', pr.code, pr.allowed_classes;
  end if;

  select count(*) into cnt from public.assignments where program_id = pr.id and team_id = tid;
  if cnt >= pr.candidates then
    raise exception 'Programme % already has the maximum % candidates', pr.code, pr.candidates;
  end if;

  select * into lim from public.category_limits where category = st.category;
  if lim.category is not null then
    select count(*) into used from public.assignments a
      join public.programs p2 on p2.id = a.program_id
      where a.student_id = st.id and p2.type = pr.type;
    if (pr.type = 'Stage' and used >= lim.stage_limit)
       or (pr.type = 'Non-stage' and used >= lim.nonstage_limit)
       or (pr.type = 'Group' and used >= lim.group_limit) then
      raise exception '% limit reached for %', pr.type, st.name;
    end if;
  end if;

  insert into public.assignments (program_id, student_id, team_id, slot_index)
  values (pr.id, st.id, tid, p_slot_index) on conflict do nothing;
  return json_build_object('ok', true, 'student', st.name);
end $$;

create or replace function public.team_unassign(p_token uuid, p_assignment_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  if not (select entry_open from public.fest_settings where id = 1) then
    raise exception 'Programme entry is closed by the admin';
  end if;
  delete from public.assignments where id = p_assignment_id and team_id = tid;
end $$;

create or replace function public.team_mark_read(p_token uuid, p_announcement_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  insert into public.announcement_reads (team_id, announcement_id)
  values (tid, p_announcement_id) on conflict do nothing;
end $$;

create or replace function public.team_unread(p_token uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  return coalesce((select json_agg(json_build_object('id', an.id, 'title', an.title,
      'body', an.body, 'created_at', an.created_at) order by an.created_at desc)
    from public.announcements an
    where not exists (select 1 from public.announcement_reads r
                      where r.team_id = tid and r.announcement_id = an.id)), '[]'::json);
end $$;

-- password helpers used by the admin panel
create or replace function public.hash_password(p_password text)
returns text language sql security definer set search_path = public, extensions as $$
  select crypt(p_password, gen_salt('bf'))
$$;
revoke all on function public.hash_password(text) from anon;
grant execute on function public.hash_password(text) to authenticated;

grant execute on function public.team_login(text,text), public.team_logout(uuid),
  public.team_students(uuid), public.team_assignments(uuid), public.team_assign(uuid,text,text,int),
  public.team_unassign(uuid,uuid), public.team_mark_read(uuid,uuid), public.team_unread(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------
-- 6. STORAGE BUCKET FOR STUDENT PHOTOS
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('student-photos','student-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read photos" on storage.objects;
create policy "public read photos" on storage.objects for select to anon, authenticated
  using (bucket_id = 'student-photos');
drop policy if exists "admin write photos" on storage.objects;
create policy "admin write photos" on storage.objects for all to authenticated
  using (bucket_id = 'student-photos' and public.is_admin())
  with check (bucket_id = 'student-photos' and public.is_admin());

-- ---------------------------------------------------------------
-- 7. REALTIME (live updates in every panel)
-- ---------------------------------------------------------------
alter table public.programs replica identity full;
alter table public.students replica identity full;
alter table public.timetable replica identity full;
alter table public.assignments replica identity full;
alter table public.announcements replica identity full;
alter table public.teams replica identity full;
alter table public.fest_settings replica identity full;

do $$
declare t text;
begin
  foreach t in array array['programs','students','timetable','assignments','announcements','teams','fest_settings'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- =====================================================================
--  SECTION 8 — PUBLIC SITE MODULES (v2)
--  Documents · Gallery · Results · AI knowledge · Site content
--  Safe to re-run: everything below is idempotent.
-- =====================================================================

-- 8.1 extra site-wide settings ---------------------------------------
alter table public.fest_settings add column if not exists main_hidden boolean not null default false;
alter table public.fest_settings add column if not exists maintenance_message text
  default 'The page will be updated soon.';
alter table public.fest_settings add column if not exists hero_title text default 'Arts Fest';
alter table public.fest_settings add column if not exists hero_subtitle text
  default 'The annual arts festival of our college.';
alter table public.fest_settings add column if not exists about_text text;
alter table public.fest_settings add column if not exists contact_email text;
alter table public.fest_settings add column if not exists contact_phone text;
alter table public.fest_settings add column if not exists contact_address text;
alter table public.fest_settings add column if not exists contact_map_url text;

-- 8.2 documents -------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  remarks text,
  category text default 'General',
  file_url text not null,
  file_name text,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);
grant select on public.documents to anon, authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;

-- 8.3 gallery ---------------------------------------------------------
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text,
  caption text,
  album text default 'General',
  image_url text not null,
  created_at timestamptz not null default now()
);
grant select on public.gallery to anon, authenticated;
grant all on public.gallery to service_role;
alter table public.gallery enable row level security;

-- 8.4 results (denormalised on purpose: publicly readable, no PII join)
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete set null,
  program_code text not null,
  program_name text,
  category text,
  type text,
  position int check (position between 1 and 10),
  grade text,
  points int not null default 0,
  adno text,
  student_name text,
  team_id uuid references public.teams(id) on delete set null,
  team_name text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists results_program_code_idx on public.results (program_code);
grant select on public.results to anon, authenticated;
grant all on public.results to service_role;
alter table public.results enable row level security;

-- 8.5 AI knowledge base ----------------------------------------------
create table if not exists public.ai_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  file_url text,
  file_name text,
  created_at timestamptz not null default now()
);
grant select on public.ai_documents to anon, authenticated;
grant all on public.ai_documents to service_role;
alter table public.ai_documents enable row level security;

-- 8.6 policies ---------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['documents','gallery','results','ai_documents'] loop
    execute format('drop policy if exists "public read %1$s" on public.%1$I', t);
    execute format('create policy "public read %1$s" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "admin all %1$s" on public.%1$I', t);
    execute format('create policy "admin all %1$s" on public.%1$I for all to authenticated
      using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- 8.7 group programmes have NO per-student limit ----------------------
alter table public.category_limits alter column group_limit set default 999;
update public.category_limits set group_limit = 999;

create or replace function public.team_assign(p_token uuid, p_program_code text, p_adno text, p_slot_index int)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare tid uuid; pr public.programs; st public.students; lim public.category_limits; used int; cnt int; max_slots int;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  if p_slot_index < 0 then raise exception 'Invalid candidate slot'; end if;
  if not (select entry_open from public.fest_settings where id = 1) then
    raise exception 'Programme entry is closed by the admin';
  end if;

  select * into pr from public.programs where lower(code) = lower(p_program_code);
  if pr.id is null then raise exception 'Unknown programme code'; end if;
  max_slots := case when pr.entry_mode = 'group'
    then greatest(1, pr.group_count) * greatest(1, pr.group_size)
    else greatest(1, pr.candidates) end;
  if p_slot_index >= max_slots then raise exception 'Invalid candidate slot for programme %', pr.code; end if;
  select * into st from public.students where lower(adno) = lower(p_adno);
  if st.id is null then raise exception 'Ad.No % does not exist', p_adno; end if;
  if st.team_id is distinct from tid then
    raise exception 'Ad.No % belongs to another team', p_adno;
  end if;

  if pr.category <> 'Kulliyya' and st.category is distinct from pr.category then
    raise exception 'Student category (%) does not match programme category (%)', st.category, pr.category;
  end if;
  if pr.allowed_classes is not null and coalesce(st.class,'') <> pr.allowed_classes then
    raise exception 'Programme % is only for class %', pr.code, pr.allowed_classes;
  end if;

  select count(*) into cnt from public.assignments where program_id = pr.id and team_id = tid;
  if cnt >= max_slots then
    raise exception 'Programme % already has the maximum % candidates', pr.code, max_slots;
  end if;

  -- Group programmes are unlimited per student; only Stage / Non-stage are capped.
  select * into lim from public.category_limits where category = st.category;
  if lim.category is not null and pr.type in ('Stage','Non-stage') then
    select count(*) into used from public.assignments a
      join public.programs p2 on p2.id = a.program_id
      where a.student_id = st.id and p2.type = pr.type;
    if (pr.type = 'Stage' and used >= lim.stage_limit)
       or (pr.type = 'Non-stage' and used >= lim.nonstage_limit) then
      raise exception '% limit reached for %', pr.type, st.name;
    end if;
  end if;

  insert into public.assignments (program_id, student_id, team_id, slot_index)
  values (pr.id, st.id, tid, p_slot_index) on conflict do nothing;
  return json_build_object('ok', true, 'student', st.name);
end $$;
grant execute on function public.team_assign(uuid,text,text,int) to anon, authenticated;

-- 8.8 storage buckets --------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('fest-documents','fest-documents', true),
  ('fest-gallery','fest-gallery', true),
  ('fest-ai','fest-ai', true)
on conflict (id) do nothing;

do $$
declare b text;
begin
  foreach b in array array['fest-documents','fest-gallery','fest-ai'] loop
    execute format('drop policy if exists "public read %1$s" on storage.objects', b);
    execute format($f$create policy "public read %1$s" on storage.objects for select
      to anon, authenticated using (bucket_id = %1$L)$f$, b);
    execute format('drop policy if exists "admin write %1$s" on storage.objects', b);
    execute format($f$create policy "admin write %1$s" on storage.objects for all
      to authenticated using (bucket_id = %1$L and public.is_admin())
      with check (bucket_id = %1$L and public.is_admin())$f$, b);
  end loop;
end $$;

-- 8.9 realtime for the new tables --------------------------------------
do $$
declare t text;
begin
  foreach t in array array['documents','gallery','results','ai_documents'] loop
    execute format('alter table public.%I replica identity full', t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
