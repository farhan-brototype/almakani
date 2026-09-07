-- =====================================================================
--  SCHEDULE JUDGES + MANUAL REGISTRATION WINDOW
--  Run once in the Supabase SQL editor.
--   1. Judge 1 / Judge 2 (optional) on every scheduled item.
--   2. The universal registration window no longer opens or closes by
--      itself unless the matching "use this time" switch is armed.
-- =====================================================================

-- 1. JUDGES ------------------------------------------------------------

alter table public.timetable
  add column if not exists judge1 text,
  add column if not exists judge2 text;

-- 2. WINDOW SWITCHES ---------------------------------------------------

alter table public.fest_settings
  add column if not exists reg_use_start    boolean not null default false,
  add column if not exists reg_use_deadline boolean not null default false;

create or replace function public.registration_window_open()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select s.reg_is_open
            and (not coalesce(s.reg_use_start, false)
                 or s.reg_start is null
                 or now() >= s.reg_start)
            and (not coalesce(s.reg_use_deadline, false)
                 or s.reg_deadline is null
                 or now() <= s.reg_deadline)
       from public.fest_settings s where s.id = 1),
    true)
$$;

grant execute on function public.registration_window_open() to anon, authenticated, service_role;

-- 3. TEAM: LIST OPEN PROGRAMMES (now reports the two switches) ---------

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
      'reg_deadline', s.reg_deadline,
      'reg_use_start', coalesce(s.reg_use_start, false),
      'reg_use_deadline', coalesce(s.reg_use_deadline, false)),
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
