ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS stage_min integer NOT NULL DEFAULT 0;
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS nonstage_min integer NOT NULL DEFAULT 0;