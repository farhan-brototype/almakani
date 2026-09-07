-- Public helper for the Certificate / My Card page.
--
-- Anyone can list the students that have at least one published result, so the
-- card page can offer a Class -> Ad.No selection. Only the fields printed on
-- the card are exposed. Run this in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.card_students()
RETURNS TABLE(adno text, name text, class text, category text, photo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT s.adno, s.name, s.class, s.category::text, s.photo_url
  FROM public.students s
  JOIN public.result_entries e ON e.student_id = s.id
  WHERE e.status = 'published'
  ORDER BY s.adno;
$$;

GRANT EXECUTE ON FUNCTION public.card_students() TO anon, authenticated;
