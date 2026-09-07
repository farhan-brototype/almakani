-- "All Photos" link for the Gallery page (Settings → Fest logo section).
-- When set, the Gallery page shows an "All Photos" button that opens this URL.

ALTER TABLE public.fest_settings
  ADD COLUMN IF NOT EXISTS gallery_link text;
