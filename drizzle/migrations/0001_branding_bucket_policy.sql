CREATE POLICY "admin all fest-branding" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'fest-branding' AND public.is_admin())
  WITH CHECK (bucket_id = 'fest-branding' AND public.is_admin());