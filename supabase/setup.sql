-- Arts Fest — full database setup for a fresh Supabase project
create extension if not exists pgcrypto with schema extensions;
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT admin_users_pkey PRIMARY KEY (user_id),
  CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.ai_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  content text,
  file_url text,
  file_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ai_documents_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  team_id uuid NOT NULL,
  announcement_id uuid NOT NULL,
  CONSTRAINT announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  CONSTRAINT announcement_reads_pkey PRIMARY KEY (team_id, announcement_id),
  CONSTRAINT announcement_reads_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  body text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT announcements_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  program_id uuid NOT NULL,
  student_id uuid NOT NULL,
  team_id uuid,
  slot_index integer NOT NULL CHECK (slot_index >= 0),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  CONSTRAINT assignments_program_id_student_id_key UNIQUE (program_id, student_id),
  CONSTRAINT assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT assignments_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS assignments_program_team_slot_key
  ON public.assignments (program_id, team_id, slot_index) WHERE team_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.categories (
  name text NOT NULL,
  is_general boolean DEFAULT false NOT NULL,
  sort integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (name)
);
CREATE TABLE IF NOT EXISTS public.category_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  kind text DEFAULT 'Individual'::text NOT NULL,
  sort integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT category_items_kind_check CHECK ((kind = ANY (ARRAY['Individual'::text, 'Group'::text]))),
  CONSTRAINT category_items_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.category_limits (
  category text NOT NULL,
  stage_limit integer DEFAULT 3 NOT NULL,
  nonstage_limit integer DEFAULT 3 NOT NULL,
  group_limit integer DEFAULT 999 NOT NULL,
  stage_unlimited boolean DEFAULT false NOT NULL,
  nonstage_unlimited boolean DEFAULT false NOT NULL,
  sports_limit integer DEFAULT 0 NOT NULL,
  sports_unlimited boolean DEFAULT false NOT NULL,
  arts_max integer DEFAULT 0 NOT NULL,
  arts_min integer DEFAULT 0 NOT NULL,
  min_total integer DEFAULT 0 NOT NULL,
  min_items text[] DEFAULT '{}'::text[] NOT NULL,
  stage_min integer DEFAULT 0 NOT NULL,
  nonstage_min integer DEFAULT 0 NOT NULL,
  CONSTRAINT category_limits_pkey PRIMARY KEY (category)
);
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS stage_unlimited boolean DEFAULT false NOT NULL;
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS nonstage_unlimited boolean DEFAULT false NOT NULL;
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS sports_limit integer DEFAULT 0 NOT NULL;
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS sports_unlimited boolean DEFAULT false NOT NULL;
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS arts_max integer DEFAULT 0 NOT NULL;
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS arts_min integer DEFAULT 0 NOT NULL;
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS min_total integer DEFAULT 0 NOT NULL;
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS min_items text[] DEFAULT '{}'::text[] NOT NULL;
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS stage_min integer DEFAULT 0 NOT NULL;
ALTER TABLE public.category_limits ADD COLUMN IF NOT EXISTS nonstage_min integer DEFAULT 0 NOT NULL;
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  remarks text,
  category text DEFAULT 'General'::text,
  file_url text NOT NULL,
  file_name text,
  file_type text,
  file_size bigint,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sort_order integer DEFAULT 0,
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.fest_settings (
  id integer DEFAULT 1 NOT NULL,
  entry_open boolean DEFAULT true NOT NULL,
  fest_name text DEFAULT 'Arts Fest'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  main_hidden boolean DEFAULT false NOT NULL,
  maintenance_message text DEFAULT 'The page will be updated soon.'::text,
  hero_title text DEFAULT 'Arts Fest'::text,
  hero_subtitle text DEFAULT 'The annual arts festival of our college.'::text,
  about_text text,
  contact_email text,
  contact_phone text,
  contact_address text,
  contact_map_url text,
  live_enabled boolean DEFAULT false NOT NULL,
  logo_url text,
  CONSTRAINT fest_settings_id_check CHECK ((id = 1)),
  CONSTRAINT fest_settings_pkey PRIMARY KEY (id)
);
ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS main_hidden boolean DEFAULT false NOT NULL;
ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS maintenance_message text DEFAULT 'The page will be updated soon.';
ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS hero_title text DEFAULT 'Arts Fest';
ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS hero_subtitle text DEFAULT 'The annual arts festival of our college.';
ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS about_text text;
ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS contact_address text;
ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS contact_map_url text;
ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS live_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE public.fest_settings ADD COLUMN IF NOT EXISTS logo_url text;
CREATE TABLE IF NOT EXISTS public.gallery (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text,
  caption text,
  album text DEFAULT 'General'::text,
  image_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  mobile_image_url text,
  sort_order integer DEFAULT 0,
  CONSTRAINT gallery_pkey PRIMARY KEY (id)
);
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS mobile_image_url text;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.grading_schemes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  grade_count integer DEFAULT 2 NOT NULL,
  grade_a_percent numeric DEFAULT 80 NOT NULL,
  grade_b_percent numeric DEFAULT 60 NOT NULL,
  grade_c_percent numeric DEFAULT 40 NOT NULL,
  grade_a_points integer DEFAULT 5 NOT NULL,
  grade_b_points integer DEFAULT 3 NOT NULL,
  grade_c_points integer DEFAULT 1 NOT NULL,
  pos1_points integer DEFAULT 5 NOT NULL,
  pos2_points integer DEFAULT 3 NOT NULL,
  pos3_points integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT grading_schemes_code_key UNIQUE (code),
  CONSTRAINT grading_schemes_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.live_reveals (
  program_id uuid NOT NULL,
  show_details boolean DEFAULT false NOT NULL,
  show_first boolean DEFAULT false NOT NULL,
  show_others boolean DEFAULT false NOT NULL,
  CONSTRAINT live_reveals_pkey PRIMARY KEY (program_id),
  CONSTRAINT live_reveals_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.mark_settings (
  id integer DEFAULT 1 NOT NULL,
  grade_a_percent numeric DEFAULT 80 NOT NULL,
  grade_b_percent numeric DEFAULT 60 NOT NULL,
  grade_c_percent numeric DEFAULT 40 NOT NULL,
  grade_a_points integer DEFAULT 5 NOT NULL,
  grade_b_points integer DEFAULT 3 NOT NULL,
  grade_c_points integer DEFAULT 1 NOT NULL,
  pos1_points integer DEFAULT 5 NOT NULL,
  pos2_points integer DEFAULT 3 NOT NULL,
  pos3_points integer DEFAULT 1 NOT NULL,
  CONSTRAINT mark_settings_id_check CHECK ((id = 1)),
  CONSTRAINT mark_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.program_mark_config (
  program_id uuid NOT NULL,
  columns integer DEFAULT 1 NOT NULL,
  grade_a_percent numeric,
  grade_b_percent numeric,
  grade_c_percent numeric,
  CONSTRAINT program_mark_config_pkey PRIMARY KEY (program_id),
  CONSTRAINT program_mark_config_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.program_registration (
  program_id uuid NOT NULL,
  is_open boolean DEFAULT true NOT NULL,
  deadline timestamp with time zone,
  max_entries integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT program_registration_pkey PRIMARY KEY (program_id),
  CONSTRAINT program_registration_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  candidates integer DEFAULT 1 NOT NULL,
  status text DEFAULT 'upcoming'::text NOT NULL,
  allowed_classes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  entry_mode text DEFAULT 'individual'::text NOT NULL,
  group_count integer DEFAULT 1 NOT NULL,
  group_size integer DEFAULT 1 NOT NULL,
  grading_scheme_id uuid,
  CONSTRAINT programs_code_key UNIQUE (code),
  CONSTRAINT programs_entry_mode_check CHECK ((entry_mode = ANY (ARRAY['individual'::text, 'group'::text, 'team'::text]))),
  CONSTRAINT programs_grading_scheme_id_fkey FOREIGN KEY (grading_scheme_id) REFERENCES grading_schemes(id) ON DELETE SET NULL,
  CONSTRAINT programs_pkey PRIMARY KEY (id),
  CONSTRAINT programs_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'completed'::text, 'pending'::text]))),
  CONSTRAINT programs_type_check CHECK ((type = ANY (ARRAY['Stage'::text, 'Non-stage'::text, 'Group'::text])))
);
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS entry_mode text DEFAULT 'individual' NOT NULL;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS group_count integer DEFAULT 1 NOT NULL;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS group_size integer DEFAULT 1 NOT NULL;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS grading_scheme_id uuid;
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_grading_scheme_id_fkey;
ALTER TABLE public.programs ADD CONSTRAINT programs_grading_scheme_id_fkey FOREIGN KEY (grading_scheme_id) REFERENCES grading_schemes(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  program_id uuid NOT NULL,
  team_id uuid NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  admin_note text,
  link text,
  remark text,
  seen_by_team boolean DEFAULT false NOT NULL,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT registrations_pkey PRIMARY KEY (id),
  CONSTRAINT registrations_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  CONSTRAINT registrations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
  CONSTRAINT registrations_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.result_entries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  program_id uuid NOT NULL,
  team_id uuid,
  student_id uuid,
  is_group boolean DEFAULT false NOT NULL,
  mark1 numeric,
  mark2 numeric,
  total numeric DEFAULT 0 NOT NULL,
  max_total numeric DEFAULT 10 NOT NULL,
  percent numeric DEFAULT 0 NOT NULL,
  position integer,
  grade text,
  points integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'enrolled'::text NOT NULL,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  manual_override boolean DEFAULT false NOT NULL,
  CONSTRAINT result_entries_pkey PRIMARY KEY (id),
  CONSTRAINT result_entries_position_check CHECK ((("position" >= 1) AND ("position" <= 10))),
  CONSTRAINT result_entries_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  CONSTRAINT result_entries_status_check CHECK ((status = ANY (ARRAY['enrolled'::text, 'draft'::text, 'published'::text]))),
  CONSTRAINT result_entries_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  CONSTRAINT result_entries_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS public.results (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  program_id uuid,
  program_code text NOT NULL,
  program_name text,
  category text,
  type text,
  position integer,
  grade text,
  points integer DEFAULT 0 NOT NULL,
  adno text,
  student_name text,
  team_id uuid,
  team_name text,
  published boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT results_pkey PRIMARY KEY (id),
  CONSTRAINT results_position_check CHECK ((("position" >= 1) AND ("position" <= 10))),
  CONSTRAINT results_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
  CONSTRAINT results_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS public.students (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  adno text NOT NULL,
  name text NOT NULL,
  class text,
  category text,
  team_id uuid,
  photo_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT students_adno_key UNIQUE (adno),
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS public.team_sessions (
  token uuid DEFAULT gen_random_uuid() NOT NULL,
  team_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT team_sessions_pkey PRIMARY KEY (token),
  CONSTRAINT team_sessions_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL,
  captain text,
  vice_captain text,
  vice_captain2 text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  short_name text,
  CONSTRAINT teams_name_key UNIQUE (name),
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_username_key UNIQUE (username)
);
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS short_name text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS color text;
CREATE UNIQUE INDEX IF NOT EXISTS teams_color_key ON public.teams (lower(color)) WHERE color IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.timetable (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  program_id uuid NOT NULL,
  event_date date NOT NULL,
  event_time time without time zone,
  stage text,
  completed boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  end_time time without time zone,
  CONSTRAINT timetable_pkey PRIMARY KEY (id),
  CONSTRAINT timetable_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
ALTER TABLE public.timetable ADD COLUMN IF NOT EXISTS end_time time without time zone;
CREATE INDEX IF NOT EXISTS results_program_code_idx ON public.results USING btree (program_code);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_mark_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_reveals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mark_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated; GRANT ALL ON public.teams TO service_role; GRANT SELECT ON public.teams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO authenticated; GRANT ALL ON public.admin_users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_reads TO authenticated; GRANT ALL ON public.announcement_reads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated; GRANT ALL ON public.documents TO service_role; GRANT SELECT ON public.documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fest_settings TO authenticated; GRANT ALL ON public.fest_settings TO service_role; GRANT SELECT ON public.fest_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated; GRANT ALL ON public.categories TO service_role; GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_documents TO authenticated; GRANT ALL ON public.ai_documents TO service_role; GRANT SELECT ON public.ai_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated; GRANT ALL ON public.assignments TO service_role; GRANT SELECT ON public.assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated; GRANT ALL ON public.announcements TO service_role; GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_mark_config TO authenticated; GRANT ALL ON public.program_mark_config TO service_role; GRANT SELECT ON public.program_mark_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery TO authenticated; GRANT ALL ON public.gallery TO service_role; GRANT SELECT ON public.gallery TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grading_schemes TO authenticated; GRANT ALL ON public.grading_schemes TO service_role; GRANT SELECT ON public.grading_schemes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.result_entries TO authenticated; GRANT ALL ON public.result_entries TO service_role; GRANT SELECT ON public.result_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_registration TO authenticated; GRANT ALL ON public.program_registration TO service_role; GRANT SELECT ON public.program_registration TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated; GRANT ALL ON public.programs TO service_role; GRANT SELECT ON public.programs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_reveals TO authenticated; GRANT ALL ON public.live_reveals TO service_role; GRANT SELECT ON public.live_reveals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_items TO authenticated; GRANT ALL ON public.category_items TO service_role; GRANT SELECT ON public.category_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated; GRANT ALL ON public.registrations TO service_role; GRANT SELECT ON public.registrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mark_settings TO authenticated; GRANT ALL ON public.mark_settings TO service_role; GRANT SELECT ON public.mark_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_limits TO authenticated; GRANT ALL ON public.category_limits TO service_role; GRANT SELECT ON public.category_limits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable TO authenticated; GRANT ALL ON public.timetable TO service_role; GRANT SELECT ON public.timetable TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_sessions TO authenticated; GRANT ALL ON public.team_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated; GRANT ALL ON public.results TO service_role; GRANT SELECT ON public.results TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated; GRANT ALL ON public.students TO service_role; GRANT SELECT ON public.students TO anon;
CREATE OR REPLACE FUNCTION public.recalc_all_results()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare pid uuid;
begin
  for pid in select distinct program_id from public.result_entries loop
    perform public.recalc_program_results(pid);
  end loop;
end $function$
;
CREATE OR REPLACE FUNCTION public.team_login(p_username text, p_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare t public.teams; tok uuid;
begin
  select * into t from public.teams where lower(username) = lower(p_username);
  if t.id is null or t.password_hash <> crypt(p_password, t.password_hash) then
    raise exception 'Invalid username or password';
  end if;
  insert into public.team_sessions (team_id) values (t.id) returning token into tok;
  return json_build_object('token', tok, 'team',
    json_build_object('id', t.id, 'name', t.name, 'captain', t.captain,
                      'vice_captain', t.vice_captain, 'vice_captain2', t.vice_captain2));
end $function$
;
CREATE OR REPLACE FUNCTION public.team_mark_read(p_token uuid, p_announcement_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  insert into public.announcement_reads (team_id, announcement_id)
  values (tid, p_announcement_id) on conflict do nothing;
end $function$
;
CREATE OR REPLACE FUNCTION public.team_mark_registrations_seen(p_token uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  update public.registrations set seen_by_team = true
   where team_id = tid and status <> 'pending' and seen_by_team = false;
end $function$
;
CREATE OR REPLACE FUNCTION public.team_of(p_token uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select team_id from public.team_sessions where token = p_token
$function$
;
CREATE OR REPLACE FUNCTION public.team_open_registrations(p_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'program_id', p.id, 'code', p.code, 'name', p.name, 'type', p.type,
      'category', p.category, 'candidates', p.candidates,
      'allowed_classes', p.allowed_classes,
      'max_entries', r.max_entries,
      'deadline', r.deadline, 'is_open', r.is_open) order by p.code)
    from public.program_registration r
    join public.programs p on p.id = r.program_id), '[]'::json);
end $function$
;
CREATE OR REPLACE FUNCTION public.hash_password(p_password text)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select crypt(p_password, gen_salt('bf'))
$function$
;
CREATE OR REPLACE FUNCTION public.team_logout(p_token uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  delete from public.team_sessions where token = p_token
$function$
;
CREATE OR REPLACE FUNCTION public.published_results()
 RETURNS TABLE(id uuid, program_id uuid, program_code text, program_name text, type text, category text, status text, "position" integer, grade text, points integer, total numeric, max_total numeric, percent numeric, is_group boolean, adno text, student_name text, photo_url text, team_id uuid, team_name text, team_short text, published_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select e.id, e.program_id, p.code, p.name, p.type, p.category,
         e.status, e.position, e.grade, e.points, e.total, e.max_total, e.percent,
         e.is_group, s.adno, s.name, s.photo_url, e.team_id, t.name, t.short_name,
         e.published_at, e.updated_at
    from public.result_entries e
    join public.programs p on p.id = e.program_id
    left join public.students s on s.id = e.student_id
    left join public.teams t on t.id = e.team_id
   where e.status = 'published'
$function$
;
CREATE OR REPLACE FUNCTION public.approved_registrations()
 RETURNS TABLE(id uuid, program_code text, program_name text, type text, category text, candidates integer, allowed_classes text, link text, remark text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select r.id, p.code, p.name, p.type, p.category, p.candidates, p.allowed_classes,
         r.link, r.remark, r.created_at
    from public.registrations r
    join public.programs p on p.id = r.program_id
   where r.status = 'approved'
$function$
;
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$function$
;
CREATE OR REPLACE FUNCTION public.live_results()
 RETURNS TABLE(id uuid, program_id uuid, program_code text, program_name text, type text, category text, status text, "position" integer, grade text, points integer, total numeric, max_total numeric, percent numeric, is_group boolean, adno text, student_name text, photo_url text, team_id uuid, team_name text, team_short text, published_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select e.id, e.program_id, p.code, p.name, p.type, p.category,
         e.status, e.position, e.grade, e.points, e.total, e.max_total, e.percent,
         e.is_group, s.adno, s.name, s.photo_url, e.team_id, t.name, t.short_name,
         e.published_at, e.updated_at
    from public.result_entries e
    join public.programs p on p.id = e.program_id
    left join public.students s on s.id = e.student_id
    left join public.teams t on t.id = e.team_id
   where e.status in ('draft','published')
$function$
;
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
end $function$
;
CREATE OR REPLACE FUNCTION public.team_assign(p_token uuid, p_program_code text, p_adno text, p_slot_index integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid; pr public.programs; st public.students; lim public.category_limits; used int; cnt int; max_slots int;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  if p_slot_index < 0 then raise exception 'Invalid candidate slot'; end if;
  if not (select entry_open from public.fest_settings where id = 1) then
    raise exception 'Programme entry is closed by the admin';
  end if;

  select * into pr from public.programs where lower(code) = lower(p_program_code);
  if pr.id is null then raise exception 'Unknown programme code'; end if;
  max_slots := case when pr.entry_mode = 'group'
    then greatest(1, pr.group_count) * greatest(1, pr.group_size)
    else greatest(1, pr.candidates) end;
  if p_slot_index >= max_slots then raise exception 'Invalid candidate slot for programme %', pr.code; end if;
  select * into st from public.students where lower(adno) = lower(p_adno);
  if st.id is null then raise exception 'Ad.No % does not exist', p_adno; end if;
  if st.team_id is distinct from tid then
    raise exception 'Ad.No % belongs to another team', p_adno;
  end if;

  if pr.category <> 'Kulliyya' and st.category is distinct from pr.category then
    raise exception 'Student category (%) does not match programme category (%)', st.category, pr.category;
  end if;
  if pr.allowed_classes is not null and coalesce(st.class,'') <> pr.allowed_classes then
    raise exception 'Programme % is only for class %', pr.code, pr.allowed_classes;
  end if;

  select count(*) into cnt from public.assignments where program_id = pr.id and team_id = tid;
  if cnt >= max_slots then
    raise exception 'Programme % already has the maximum % candidates', pr.code, max_slots;
  end if;

  select * into lim from public.category_limits where category = st.category;
  if lim.category is not null and pr.type in ('Stage','Non-stage') then
    select count(*) into used from public.assignments a
      join public.programs p2 on p2.id = a.program_id
      where a.student_id = st.id and p2.type = pr.type;
    if (pr.type = 'Stage' and used >= lim.stage_limit)
       or (pr.type = 'Non-stage' and used >= lim.nonstage_limit) then
      raise exception '% limit reached for %', pr.type, st.name;
    end if;
  end if;

  insert into public.assignments (program_id, student_id, team_id, slot_index)
  values (pr.id, st.id, tid, p_slot_index) on conflict do nothing;
  return json_build_object('ok', true, 'student', st.name);
end $function$
;
CREATE OR REPLACE FUNCTION public.team_assignments(p_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  return coalesce((select json_agg(json_build_object(
      'id', a.id, 'program_id', a.program_id, 'program_code', p.code,
      'student_id', s.id, 'adno', s.adno, 'name', s.name, 'slot_index', a.slot_index)
      order by a.program_id, a.slot_index)
    from public.assignments a
    join public.programs p on p.id = a.program_id
    join public.students s on s.id = a.student_id
    where a.team_id = tid), '[]'::json);
end $function$
;
CREATE OR REPLACE FUNCTION public.team_register(p_token uuid, p_program_code text, p_link text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid; pr public.programs; reg public.program_registration; cnt int; lim int;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;

  select * into pr from public.programs where lower(code) = lower(p_program_code);
  if pr.id is null then raise exception 'Unknown programme code'; end if;
  select * into reg from public.program_registration where program_id = pr.id;
  if reg.program_id is null or not reg.is_open then
    raise exception 'Registration is not open for %', pr.code;
  end if;
  if reg.deadline is not null and now() > reg.deadline then
    raise exception 'Registration deadline for % has passed', pr.code;
  end if;

  lim := greatest(coalesce(reg.max_entries, pr.candidates, 1), 1);

  select count(*) into cnt from public.registrations
   where program_id = pr.id and team_id = tid and status <> 'rejected';
  if cnt >= lim then
    raise exception 'Programme % already has the maximum % entries', pr.code, lim;
  end if;

  insert into public.registrations (program_id, team_id, link, remark)
  values (pr.id, tid, nullif(btrim(coalesce(p_link,'')), ''), nullif(btrim(coalesce(p_remark,'')), ''));
  return json_build_object('ok', true, 'program', pr.code);
end $function$
;
CREATE OR REPLACE FUNCTION public.team_registrations(p_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', r.id, 'program_id', r.program_id, 'program_code', p.code,
      'program_name', p.name, 'type', p.type, 'category', p.category,
      'status', r.status, 'admin_note', r.admin_note, 'link', r.link,
      'remark', r.remark, 'reviewed_at', r.reviewed_at,
      'seen_by_team', r.seen_by_team, 'created_at', r.created_at)
      order by r.created_at desc)
    from public.registrations r
    join public.programs p on p.id = r.program_id
    where r.team_id = tid), '[]'::json);
end $function$
;
CREATE OR REPLACE FUNCTION public.team_results(p_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', e.id, 'program_code', p.code, 'program_name', p.name, 'type', p.type,
      'category', p.category, 'position', e.position, 'grade', e.grade,
      'points', e.points, 'total', e.total, 'max_total', e.max_total,
      'is_group', e.is_group, 'student_id', e.student_id, 'adno', s.adno,
      'student_name', s.name, 'photo_url', s.photo_url))
    from public.result_entries e
    join public.programs p on p.id = e.program_id
    left join public.students s on s.id = e.student_id
    where e.team_id = tid and e.status = 'published'), '[]'::json);
end $function$
;
CREATE OR REPLACE FUNCTION public.team_students(p_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select json_agg(x order by x->>'name')
    from (
      select json_build_object(
        'id', s.id, 'adno', s.adno, 'name', s.name, 'class', s.class,
        'category', s.category, 'photo_url', s.photo_url,
        'programs', coalesce((
          select json_agg(json_build_object(
            'code', p.code, 'name', p.name, 'type', p.type, 'category', p.category,
            'event_date', tt.event_date, 'event_time', tt.event_time, 'stage', tt.stage,
            'completed', coalesce(tt.completed,false)))
          from public.assignments a
          join public.programs p on p.id = a.program_id
          left join public.timetable tt on tt.program_id = p.id
          where a.student_id = s.id), '[]'::json)
      ) as x
      from public.students s where s.team_id = tid
    ) q), '[]'::json);
end $function$
;
CREATE OR REPLACE FUNCTION public.team_unassign(p_token uuid, p_assignment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  if not (select entry_open from public.fest_settings where id = 1) then
    raise exception 'Programme entry is closed by the admin';
  end if;
  delete from public.assignments where id = p_assignment_id and team_id = tid;
end $function$
;
CREATE OR REPLACE FUNCTION public.team_unread(p_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  return coalesce((select json_agg(json_build_object('id', an.id, 'title', an.title,
      'body', an.body, 'created_at', an.created_at) order by an.created_at desc)
    from public.announcements an
    where not exists (select 1 from public.announcement_reads r
                      where r.team_id = tid and r.announcement_id = an.id)), '[]'::json);
end $function$
;
CREATE OR REPLACE FUNCTION public.team_unregister(p_token uuid, p_registration_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tid uuid;
begin
  tid := public.team_of(p_token);
  if tid is null then raise exception 'Not authenticated'; end if;
  delete from public.registrations
   where id = p_registration_id and team_id = tid and status = 'pending';
end $function$
;
CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin new.updated_at = now(); return new; end $function$
;
DROP POLICY IF EXISTS "admins read admin_users" ON public.admin_users;
CREATE POLICY "admins read admin_users" ON public.admin_users FOR SELECT TO authenticated USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "public read programs" ON public.programs;
CREATE POLICY "public read programs" ON public.programs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "public read timetable" ON public.timetable;
CREATE POLICY "public read timetable" ON public.timetable FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "public read announcements" ON public.announcements;
CREATE POLICY "public read announcements" ON public.announcements FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "public read teams" ON public.teams;
CREATE POLICY "public read teams" ON public.teams FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "public read settings" ON public.fest_settings;
CREATE POLICY "public read settings" ON public.fest_settings FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "public read limits" ON public.category_limits;
CREATE POLICY "public read limits" ON public.category_limits FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "admin all teams" ON public.teams;
CREATE POLICY "admin all teams" ON public.teams FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all programs" ON public.programs;
CREATE POLICY "admin all programs" ON public.programs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all students" ON public.students;
CREATE POLICY "admin all students" ON public.students FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all timetable" ON public.timetable;
CREATE POLICY "admin all timetable" ON public.timetable FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all announcements" ON public.announcements;
CREATE POLICY "admin all announcements" ON public.announcements FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all assignments" ON public.assignments;
CREATE POLICY "admin all assignments" ON public.assignments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all fest_settings" ON public.fest_settings;
CREATE POLICY "admin all fest_settings" ON public.fest_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all category_limits" ON public.category_limits;
CREATE POLICY "admin all category_limits" ON public.category_limits FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public read documents" ON public.documents;
CREATE POLICY "public read documents" ON public.documents FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "admin all gallery" ON public.gallery;
CREATE POLICY "admin all gallery" ON public.gallery FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all documents" ON public.documents;
CREATE POLICY "admin all documents" ON public.documents FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public read gallery" ON public.gallery;
CREATE POLICY "public read gallery" ON public.gallery FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "public read results" ON public.results;
CREATE POLICY "public read results" ON public.results FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "public read category_items" ON public.category_items;
CREATE POLICY "public read category_items" ON public.category_items FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "public read ai_documents" ON public.ai_documents;
CREATE POLICY "public read ai_documents" ON public.ai_documents FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "admin all results" ON public.results;
CREATE POLICY "admin all results" ON public.results FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public read categories" ON public.categories;
CREATE POLICY "public read categories" ON public.categories FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "public read live_reveals" ON public.live_reveals;
CREATE POLICY "public read live_reveals" ON public.live_reveals FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "admin all mark_settings" ON public.mark_settings;
CREATE POLICY "admin all mark_settings" ON public.mark_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all registrations" ON public.registrations;
CREATE POLICY "admin all registrations" ON public.registrations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public read mark_settings" ON public.mark_settings;
CREATE POLICY "public read mark_settings" ON public.mark_settings FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "admin all categories" ON public.categories;
CREATE POLICY "admin all categories" ON public.categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all program_mark_config" ON public.program_mark_config;
CREATE POLICY "admin all program_mark_config" ON public.program_mark_config FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all result_entries" ON public.result_entries;
CREATE POLICY "admin all result_entries" ON public.result_entries FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public read grading_schemes" ON public.grading_schemes;
CREATE POLICY "public read grading_schemes" ON public.grading_schemes FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "public read program_mark_config" ON public.program_mark_config;
CREATE POLICY "public read program_mark_config" ON public.program_mark_config FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "admin all category_items" ON public.category_items;
CREATE POLICY "admin all category_items" ON public.category_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all program_registration" ON public.program_registration;
CREATE POLICY "admin all program_registration" ON public.program_registration FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all ai_documents" ON public.ai_documents;
CREATE POLICY "admin all ai_documents" ON public.ai_documents FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public read program_registration" ON public.program_registration;
CREATE POLICY "public read program_registration" ON public.program_registration FOR SELECT TO anon,authenticated USING (true);

DROP POLICY IF EXISTS "admin all grading_schemes" ON public.grading_schemes;
CREATE POLICY "admin all grading_schemes" ON public.grading_schemes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all live_reveals" ON public.live_reveals;
CREATE POLICY "admin all live_reveals" ON public.live_reveals FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS result_entries_touch ON public.result_entries;
CREATE TRIGGER result_entries_touch BEFORE UPDATE ON public.result_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Baseline rows the app expects
INSERT INTO public.fest_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO public.mark_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Make yourself admin: sign up in the app first, then run
-- INSERT INTO public.admin_users (user_id) SELECT id FROM auth.users WHERE email = 'you@example.com';

-- ---------------------------------------------------------------
-- Storage buckets creation & RLS policies
-- ---------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('student-photos', 'student-photos', true),
  ('fest-documents', 'fest-documents', true),
  ('fest-gallery',   'fest-gallery',   true),
  ('fest-branding',  'fest-branding',  true),
  ('fest-ai',        'fest-ai',        true)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['student-photos','fest-documents','fest-gallery','fest-branding','fest-ai'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "public read %1$s" ON storage.objects', b);
    EXECUTE format('CREATE POLICY "public read %1$s" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = %1$L)', b);

    EXECUTE format('DROP POLICY IF EXISTS "admin write %1$s" ON storage.objects', b);
    EXECUTE format('CREATE POLICY "admin write %1$s" ON storage.objects FOR ALL TO authenticated USING (bucket_id = %1$L AND public.is_admin()) WITH CHECK (bucket_id = %1$L AND public.is_admin())', b);
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- Programme type check: allow 'Stage', 'Non-stage', 'Sports', 'Group'
-- ---------------------------------------------------------------
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_type_check;

-- ---------------------------------------------------------------
-- Category rename: 'General' -> 'Kulliyya' in check constraints
-- (The frontend uses 'Kulliyya'; the xlsx files use 'Kulliya' which
--  the import code normalises to 'Kulliyya'.)
-- ---------------------------------------------------------------

-- programs table
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_category_check;

-- students table  
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_category_check;

-- category_limits table: PK is category text so we handle via upsert

-- Rename any existing 'General' row in categories -> Kulliyya
UPDATE public.categories SET name = 'Kulliyya' WHERE name = 'General';

-- Seed canonical category rows (is_general=true means no per-student limits)
INSERT INTO public.categories (name, is_general, sort) VALUES
  ('Aliya',      false, 1),
  ('Thanawiyya', false, 2),
  ('Thaniya',    false, 3),
  ('Uoola',      false, 4),
  ('Kulliyya',   true,  5)
ON CONFLICT (name) DO UPDATE SET is_general = EXCLUDED.is_general, sort = EXCLUDED.sort;

-- Migrate any existing data that used the old spelling 'General'
UPDATE public.programs  SET category = 'Kulliyya' WHERE category = 'General';
UPDATE public.students  SET category = 'Kulliyya' WHERE category = 'General';
UPDATE public.result_entries re SET team_id = re.team_id WHERE EXISTS (
  SELECT 1 FROM public.programs p WHERE p.id = re.program_id AND p.category = 'General'
); -- no-op, just a safety guard

-- Remove any old 'General' limit row and ensure Kulliyya has no row
-- (Kulliyya is a whole-team group with unlimited per-student participation)
DELETE FROM public.category_limits WHERE category = 'General';
DELETE FROM public.category_limits WHERE category = 'Kulliyya';

-- ---------------------------------------------------------------------
-- Minus marks (team penalties)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  points numeric NOT NULL DEFAULT 0,
  remark text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_penalties ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;
ALTER TABLE public.team_penalties ADD COLUMN IF NOT EXISTS published_at timestamptz;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_penalties TO authenticated;
GRANT ALL ON public.team_penalties TO service_role;
GRANT SELECT ON public.team_penalties TO anon;
ALTER TABLE public.team_penalties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read team_penalties" ON public.team_penalties;
CREATE POLICY "public read team_penalties" ON public.team_penalties
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin write team_penalties" ON public.team_penalties;
CREATE POLICY "admin write team_penalties" ON public.team_penalties
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'team_penalties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_penalties;
  END IF;
END $$;
