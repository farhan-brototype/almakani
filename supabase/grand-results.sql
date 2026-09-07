-- Grand Results switch (Fest Control → after Programme entry).
-- When on, the public Team Points page shows Winners / Runner Up / Third / Fourth
-- and plays the celebration animation.

ALTER TABLE public.fest_settings
  ADD COLUMN IF NOT EXISTS grand_results boolean NOT NULL DEFAULT false;
