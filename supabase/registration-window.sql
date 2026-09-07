-- =====================================================================
--  UNIVERSAL REGISTRATION WINDOW — run once in the Supabase SQL editor
--  One master start time + closing time + switch for the whole fest.
--  Per-programme deadlines still apply on top (they can only close a
--  programme earlier, never open it outside the universal window).
--  Also exposes entry_mode / group_count / group_size to the team side
--  so group programmes give the right number of candidate slots.
-- =====================================================================

-- 1. SETTINGS COLUMNS --------------------------------------------------

alter table public.fest_settings
  add column if not exists reg_start    timestamptz,
  add column if not exists reg_deadline timestamptz,
  add column if not exists reg_is_open  boolean not null default true;

-- 2. HELPER ------------------------------------------------------------

create or replace function public.registration_window_open()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select s.reg_is_open
            and (s.reg_start is null or now() >= s.reg_start)
            and (s.reg_deadline is null or now() <= s.reg_deadline)
       from public.fest_settings s where s.id = 1),
    true)
$$;

grant execute on function public.registration_window_open() to anon, authenticated, service_role;

-- 3. TEAM: LIST OPEN PROGRAMMES ---------------------------------------

create or replace function public.team_open_registrations(p_token uuid)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare tid uuid; s public.fest_settings; gopen boolean;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  select * into s from public.fest_settings where id = 1;
  gopen := public.registration_window_open();
  return json_build_object(
    'window', json_build_object(
      'is_open', gopen,
      'reg_is_open', coalesce(s.reg_is_open, true),
      'reg_start', s.reg_start,
      'reg_deadline', s.reg_deadline),
    'programs', coalesce((
      select json_agg(json_build_object(
        'program_id', p.id, 'code', p.code, 'name', p.name, 'type', p.type,
        'category', p.category, 'candidates', p.candidates,
        'entry_mode', p.entry_mode, 'group_count', p.group_count,
        'group_size', p.group_size,
        'allowed_classes', p.allowed_classes,
        'max_entries', r.max_entries,
        'deadline', r.deadline,
        'is_open', r.is_open and gopen) order by p.code)
      from public.program_registration r
      join public.programs p on p.id = r.program_id), '[]'::json));
end $function$;

-- 4. TEAM: REGISTER (honours the universal window) ---------------------

create or replace function public.team_register(
  p_token uuid, p_program_code text,
  p_link text default null, p_remark text default null)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare tid uuid; pr public.programs; reg public.program_registration; cnt int; lim int;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;

  if not public.registration_window_open() then
    raise exception 'Registration is closed';
  end if;

  select * into pr from public.programs where lower(code) = lower(p_program_code);
  if pr.id is null then raise exception 'Unknown programme code'; end if;
  select * into reg from public.program_registration where program_id = pr.id;
  if reg.program_id is null or not reg.is_open then
    raise exception 'Registration is not open for %', pr.code;
  end if;
  if reg.deadline is not null and now() > reg.deadline then
    raise exception 'Registration deadline for % has passed', pr.code;
  end if;

  lim := greatest(
    coalesce(reg.max_entries,
      case when pr.entry_mode = 'group'
        then greatest(coalesce(pr.group_count, 1), 1) * greatest(coalesce(pr.group_size, 1), 1)
        else pr.candidates end,
      1), 1);

  select count(*) into cnt from public.registrations
   where program_id = pr.id and team_id = tid and status <> 'rejected';
  if cnt >= lim then
    raise exception 'Programme % already has the maximum % entries', pr.code, lim;
  end if;

  insert into public.registrations (program_id, team_id, link, remark)
  values (pr.id, tid, nullif(btrim(coalesce(p_link,'')), ''), nullif(btrim(coalesce(p_remark,'')), ''));
  return json_build_object('ok', true, 'program', pr.code);
end $function$;
