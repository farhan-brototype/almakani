-- ---------------------------------------------------------------
-- Team colours
-- Adds a unique colour per team (hex value, e.g. #DC2626).
-- Run once in the SQL editor.
-- ---------------------------------------------------------------

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS color text;

-- a colour can belong to only one team (case-insensitive on the hex)
CREATE UNIQUE INDEX IF NOT EXISTS teams_color_key
  ON public.teams (lower(color))
  WHERE color IS NOT NULL;

-- only proper hex colours are accepted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_color_hex_chk'
  ) THEN
    ALTER TABLE public.teams
      ADD CONSTRAINT teams_color_hex_chk
      CHECK (color IS NULL OR color ~* '^#[0-9a-f]{6}$');
  END IF;
END $$;

-- expose the colour publicly (no password hash in this view)
CREATE OR REPLACE VIEW public.teams_public
WITH (security_invoker = on) AS
  SELECT id, name, captain, vice_captain, vice_captain2, color
  FROM public.teams;

GRANT SELECT ON public.teams_public TO anon, authenticated;
