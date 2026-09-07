-- Run this once in the Supabase SQL editor.
-- 1) Draft / publish flag for minus marks
-- 2) Positions capped at the top three

alter table public.team_penalties
  add column if not exists published boolean not null default false,
  add column if not exists published_at timestamptz;

-- Existing deductions were already live, keep them published.
update public.team_penalties
   set published = true, published_at = coalesce(published_at, created_at)
 where published = false;

-- Only First / Second / Third are stored as positions from now on.
update public.result_entries set position = null where position > 3;

CREATE OR REPLACE FUNCTION public.recalc_program_results(p_program_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s record;
begin
  select coalesce(gs.grade_count, 2) as grade_count,
         coalesce(gs.grade_a_percent, ms.grade_a_percent) as ap,
         coalesce(gs.grade_b_percent, ms.grade_b_percent) as bp,
         coalesce(gs.grade_c_percent, ms.grade_c_percent) as cp,
         coalesce(gs.grade_a_points, ms.grade_a_points) as apt,
         coalesce(gs.grade_b_points, ms.grade_b_points) as bpt,
         coalesce(gs.grade_c_points, ms.grade_c_points) as cpt,
         coalesce(gs.pos1_points, ms.pos1_points) as p1,
         coalesce(gs.pos2_points, ms.pos2_points) as p2,
         coalesce(gs.pos3_points, ms.pos3_points) as p3
    into s
    from public.mark_settings ms
    left join public.programs pg on pg.id = p_program_id
    left join public.grading_schemes gs on gs.id = pg.grading_scheme_id
   where ms.id = 1;

  update public.result_entries e
     set total = coalesce(e.mark1,0) + coalesce(e.mark2,0),
         percent = case when coalesce(e.max_total,0) > 0
                        then round(((coalesce(e.mark1,0) + coalesce(e.mark2,0)) / e.max_total) * 100, 2)
                        else 0 end
   where e.program_id = p_program_id;

  with ranked as (
    select id, total, percent,
           case when total > 0 then rank() over (order by total desc) else null end as rnk
      from public.result_entries where program_id = p_program_id and manual_override = false
  )
  update public.result_entries e
     set position = case when r.rnk is not null and r.rnk <= 3 then r.rnk::int else null end,
         grade = case
           when s.grade_count >= 1 and r.percent >= s.ap then 'A'
           when s.grade_count >= 2 and r.percent >= s.bp then 'B'
           when s.grade_count >= 3 and r.percent >= s.cp then 'C'
           else null end,
         points = (case when r.rnk = 1 then s.p1 when r.rnk = 2 then s.p2 when r.rnk = 3 then s.p3 else 0 end)
                + (case
                     when s.grade_count >= 1 and r.percent >= s.ap then s.apt
                     when s.grade_count >= 2 and r.percent >= s.bp then s.bpt
                     when s.grade_count >= 3 and r.percent >= s.cp then s.cpt
                     else 0 end)
    from ranked r
   where e.id = r.id;

  -- manually edited rows keep their position/grade; points follow the scheme
  update public.result_entries e
     set points = (case when e.position = 1 then s.p1 when e.position = 2 then s.p2 when e.position = 3 then s.p3 else 0 end)
                + (case when e.grade = 'A' then s.apt when e.grade = 'B' then s.bpt when e.grade = 'C' then s.cpt else 0 end)
   where e.program_id = p_program_id and e.manual_override = true;
end $function$;
