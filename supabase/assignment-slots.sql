-- Run once on an existing database to preserve each candidate's exact box.
alter table public.assignments add column if not exists slot_index integer;

with positioned as (
  select id,
    row_number() over (
      partition by program_id, team_id
      order by created_at, id
    ) - 1 as position
  from public.assignments
)
update public.assignments a
set slot_index = positioned.position
from positioned
where a.id = positioned.id and a.slot_index is null;

alter table public.assignments alter column slot_index set not null;
alter table public.assignments drop constraint if exists assignments_slot_index_check;
alter table public.assignments
  add constraint assignments_slot_index_check check (slot_index >= 0);
create unique index if not exists assignments_program_team_slot_key
  on public.assignments (program_id, team_id, slot_index) where team_id is not null;

drop function if exists public.team_assign(uuid, text, text);
create or replace function public.team_assign(
  p_token uuid,
  p_program_code text,
  p_adno text,
  p_slot_index integer
)
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
    then greatest(1, coalesce(pr.group_count, 1)) * greatest(1, coalesce(pr.group_size, 1))
    else greatest(1, pr.candidates) end;
  if p_slot_index >= max_slots then raise exception 'Invalid candidate slot for programme %', pr.code; end if;

  select * into st from public.students where lower(adno) = lower(p_adno);
  if st.id is null then raise exception 'Ad.No % does not exist', p_adno; end if;
  if st.team_id is distinct from tid then raise exception 'Ad.No % belongs to another team', p_adno; end if;
  if pr.category <> 'Kulliyya' and st.category is distinct from pr.category then
    raise exception 'Student category (%) does not match programme category (%)', st.category, pr.category;
  end if;
  if pr.allowed_classes is not null and coalesce(st.class,'') <> pr.allowed_classes then
    raise exception 'Programme % is only for class %', pr.code, pr.allowed_classes;
  end if;

  select count(*) into cnt from public.assignments where program_id = pr.id and team_id = tid;
  if cnt >= max_slots then raise exception 'Programme % already has the maximum % candidates', pr.code, max_slots; end if;

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
  values (pr.id, st.id, tid, p_slot_index);
  return json_build_object('ok', true, 'student', st.name);
end $$;

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

grant execute on function public.team_assign(uuid,text,text,int) to anon, authenticated;
grant execute on function public.team_assignments(uuid) to anon, authenticated;