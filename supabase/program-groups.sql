-- =====================================================================
--  GROUP PROGRAMMES — candidate slots backfill
--  Group-mode programmes store the total candidate slots in `candidates`
--  (groups x candidates per group) so every screen agrees on how many
--  entries a team must fill.
-- =====================================================================

update public.programs
   set candidates = greatest(coalesce(group_count, 1), 1) * greatest(coalesce(group_size, 1), 1)
 where entry_mode = 'group'
   and candidates <> greatest(coalesce(group_count, 1), 1) * greatest(coalesce(group_size, 1), 1);

-- Keep max_entries of already-registered group programmes in sync.
update public.program_registration r
   set max_entries = p.candidates
  from public.programs p
 where p.id = r.program_id
   and p.entry_mode = 'group'
   and coalesce(r.max_entries, 1) < p.candidates;
