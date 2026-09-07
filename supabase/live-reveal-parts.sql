-- Live reveal per-part controls + realtime publication
-- Idempotent; safe to re-run any time.

-- ---------------------------------------------------------------------------
-- 1. Add per-part reveal columns to live_reveals
-- ---------------------------------------------------------------------------
ALTER TABLE public.live_reveals
  ADD COLUMN IF NOT EXISTS show_second   boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS show_third    boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS show_all_grades boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS revealed_grades uuid[] DEFAULT '{}'::uuid[] NOT NULL;

-- Keep the old show_others column working; nothing is dropped.
-- Back-fill: any row that already revealed "other places" keeps second/third on.

-- ---------------------------------------------------------------------------
-- 2. Realtime publication + replica identity
-- ---------------------------------------------------------------------------
-- result_entries drives the published/live result views.
ALTER TABLE public.result_entries REPLICA IDENTITY FULL;
ALTER TABLE public.live_reveals   REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'result_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.result_entries;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'live_reveals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_reveals;
  END IF;
END $$;
