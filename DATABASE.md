# Moving this database to another backend

Everything the app needs on the server lives in SQL — there are no edge functions.
The database schema is described by:

- `supabase/setup.sql` — the complete database schema (tables, RLS policies, RPCs, triggers, and storage buckets).

## 1. Export the current database

```bash
# full schema (no data)
pg_dump "$DATABASE_URL" --schema-only --schema=public --no-owner --no-privileges > backup-schema.sql

# data only (teams, programmes, students, results …)
pg_dump "$DATABASE_URL" --data-only --schema=public --no-owner > backup-data.sql

# storage objects metadata + auth users, if you also move accounts
pg_dump "$DATABASE_URL" --schema=auth --schema=storage --no-owner > backup-auth-storage.sql
```

Or run `bash scripts/dump-db.sh` which writes all three into `./backup/`.

## 2. Restore into a new Supabase project

```bash
supabase link --project-ref <new-ref>
supabase db push                      # applies supabase/migrations in order
psql "$NEW_DATABASE_URL" -f backup-data.sql
```

If you prefer a single shot to restore the full schema:

```bash
psql "$NEW_DATABASE_URL" -f supabase/setup.sql
```

Then recreate the storage buckets (all public):
`student-photos`, `fest-documents`, `fest-gallery`, `fest-ai`.

## 3. Restore into plain Postgres (non-Supabase)

The schema uses three Supabase-specific things:

| Used | Replace with |
| --- | --- |
| `auth.users` / `auth.uid()` | your own users table + a `current_setting('app.user_id')` helper |
| RLS `anon` / `authenticated` roles | create both roles: `CREATE ROLE anon; CREATE ROLE authenticated;` |
| `pgcrypto` (`crypt`, `gen_salt`) | `CREATE EXTENSION pgcrypto;` — same functions |

Team login, assignments and results all go through `SECURITY DEFINER`
functions (`team_login`, `team_assign`, `published_results`, …), so a plain
Postgres + PostgREST stack works unchanged once those roles exist.

## 4. Point the app at the new backend

Update these variables:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 5. Admin account

Create the admin user in Auth, then grant it:

```sql
insert into public.admin_users(user_id)
select id from auth.users where email = 'admin@festislah.com';
```
