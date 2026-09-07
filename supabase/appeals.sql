-- =====================================================================
--  APPEALS — run once in the Supabase SQL editor
--  Teams raise appeals after registration (content + explanation +
--  optional file). Admins review, reply and resolve them.
-- =====================================================================

-- 1. TABLE -------------------------------------------------------------

create table if not exists public.appeals (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  program_id    uuid references public.programs(id) on delete set null,
  subject       text not null,
  kind          text not null default 'general',       -- general | registration | result | grading | schedule | other
  priority      text not null default 'normal',        -- low | normal | high | urgent
  content       text not null,
  explanation   text,
  file_url      text,
  file_name     text,
  status        text not null default 'open',          -- open | in_review | resolved | rejected | withdrawn
  admin_reply   text,
  resolved_at   timestamptz,
  resolved_by   text,
  seen_by_team  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists appeals_team_idx on public.appeals (team_id, created_at desc);
create index if not exists appeals_status_idx on public.appeals (status);

grant select, insert, update, delete on public.appeals to authenticated;
grant all on public.appeals to service_role;

alter table public.appeals enable row level security;

drop policy if exists "admins manage appeals" on public.appeals;
create policy "admins manage appeals" on public.appeals
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- realtime
do $$ begin
  execute 'alter publication supabase_realtime add table public.appeals';
exception when others then null; end $$;

-- 2. STORAGE BUCKET ----------------------------------------------------

insert into storage.buckets (id, name, public)
values ('fest-appeals', 'fest-appeals', true)
on conflict (id) do nothing;

drop policy if exists "appeal files readable" on storage.objects;
create policy "appeal files readable" on storage.objects
  for select using (bucket_id = 'fest-appeals');

drop policy if exists "appeal files uploadable" on storage.objects;
create policy "appeal files uploadable" on storage.objects
  for insert with check (bucket_id = 'fest-appeals');

-- 3. TEAM RPCs ---------------------------------------------------------

create or replace function public.team_appeals(p_token uuid)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', a.id, 'subject', a.subject, 'kind', a.kind, 'priority', a.priority,
      'content', a.content, 'explanation', a.explanation,
      'file_url', a.file_url, 'file_name', a.file_name,
      'status', a.status, 'admin_reply', a.admin_reply,
      'program_code', p.code, 'program_name', p.name,
      'resolved_at', a.resolved_at, 'created_at', a.created_at,
      'updated_at', a.updated_at) order by a.created_at desc)
    from public.appeals a
    left join public.programs p on p.id = a.program_id
    where a.team_id = tid), '[]'::json);
end $function$;

create or replace function public.team_appeal_create(
  p_token uuid,
  p_subject text,
  p_content text,
  p_explanation text default null,
  p_kind text default 'general',
  p_priority text default 'normal',
  p_program_code text default null,
  p_file_url text default null,
  p_file_name text default null)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare tid uuid; pid uuid; nid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  if btrim(coalesce(p_subject, '')) = '' then raise exception 'Subject is required'; end if;
  if btrim(coalesce(p_content, '')) = '' then raise exception 'Content is required'; end if;

  if p_program_code is not null and btrim(p_program_code) <> '' then
    select id into pid from public.programs where lower(code) = lower(btrim(p_program_code));
  end if;

  insert into public.appeals (team_id, program_id, subject, kind, priority, content,
                              explanation, file_url, file_name)
  values (tid, pid, btrim(p_subject),
          coalesce(nullif(p_kind, ''), 'general'),
          coalesce(nullif(p_priority, ''), 'normal'),
          btrim(p_content),
          nullif(btrim(coalesce(p_explanation, '')), ''),
          nullif(btrim(coalesce(p_file_url, '')), ''),
          nullif(btrim(coalesce(p_file_name, '')), ''))
  returning id into nid;
  return json_build_object('ok', true, 'id', nid);
end $function$;

create or replace function public.team_appeal_withdraw(p_token uuid, p_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  update public.appeals
     set status = 'withdrawn', updated_at = now()
   where id = p_id and team_id = tid and status in ('open', 'in_review');
  return json_build_object('ok', true);
end $function$;

grant execute on function public.team_appeals(uuid) to anon, authenticated, service_role;
grant execute on function public.team_appeal_create(uuid, text, text, text, text, text, text, text, text)
  to anon, authenticated, service_role;
grant execute on function public.team_appeal_withdraw(uuid, uuid) to anon, authenticated, service_role;
