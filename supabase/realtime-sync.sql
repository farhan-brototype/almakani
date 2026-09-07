-- =====================================================================
--  REALTIME SYNC — run once in the Supabase SQL editor
--  Makes every app table broadcast its changes, so no page ever needs
--  a manual refresh. Safe to re-run.
-- =====================================================================

do $$
declare t record;
begin
  for t in
    select c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname not like 'pg_%'
  loop
    execute format('alter table public.%I replica identity full', t.name);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t.name
    ) then
      begin
        execute format('alter publication supabase_realtime add table public.%I', t.name);
      exception when others then null;
      end;
    end if;
  end loop;
end $$;

-- Quick check: every public table should be listed here.
-- select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1;
