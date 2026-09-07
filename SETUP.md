# Arts Fest Programme Manager — Setup

The live site runs on the Supabase database at https://almakani.islahululoom.in (schema applied, storage
buckets created, admin account ready):

- **Admin login:** `admin@festislah.com` / `admin@fest786`
- Public self-signup is disabled; extra admins are added by inserting their user id into
  `public.admin_users`.

Everything is driven by ONE database project. To move the app to your own Supabase project you
only change the credentials and re-run the SQL file. No other code change is needed.


## 1. Create the Supabase project

1. Go to https://supabase.com → New project.
2. Note the **Project URL** (`https://<project-id>.supabase.co`) and the **anon / publishable key**
   from *Project Settings → API*.

## 2. Run the SQL

Open **SQL Editor → New query**, paste the whole content of `supabase/setup.sql`, press **Run**.
This creates every table, grant, RLS policy, team-login function, fest rules and the
`student-photos` storage bucket. It is safe to re-run.

## 3. Point the app at the project

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your anon / publishable key>
```

(Or edit the two fallback constants in `src/config.ts`. `src/config.ts` also holds the fest name
and college name shown in the header.)

## 4. Create the admin account

1. Supabase dashboard → **Authentication → Users → Add user** → enter email + password and tick
   *Auto Confirm User*.
2. Copy the new user's **UID**.
3. SQL Editor → run:

```sql
insert into public.admin_users (user_id) values ('<PASTE-THE-UID-HERE>');
```

That user can now sign in at `/login` → **Admin** tab. Repeat for more admins.

## 5. Create team accounts

Sign in as admin → **Team Accounts → New team**. Enter team name, username, password, captain and
vice captains. Passwords are hashed by the database (`hash_password`) — they are never stored in
plain text. Teams log in at `/login` → **Team** tab.

## 6. Run and build

```
bun install
bun run dev      # local development
bun run build    # production build
```

`bun run build` produces the **`dist/`** folder:

- `dist/client/` — static assets **plus real `.html` files**: `index.html`, `programlist.html`,
  `teams.html`, `login.html`. This folder can be uploaded to any static host.
- `dist/server/` — the server bundle used when you deploy to a Node/edge host.

## 7. Bulk import formats

Every bulk import dialog has a **Download template** button. Column headers are case/space
insensitive.

- **Programmes**: Code, Name, Type (Stage/Non-stage/Group), Category
  (Aliya/Thanawiyya/Thaniya/Uoola/General), Candidates, Status
- **Students**: AdNo, Name, Class, Category, Team, PhotoURL
- **Timetable**: Code, Date (YYYY-MM-DD), Time (HH:MM), Stage, Completed (yes/no)
- **Bulk photos**: select many image files at once; each file must be named with the student's
  Ad.No (e.g. `1001.jpg`), and it is linked automatically.

## 8. Fest rules

*Fest Control* holds the programme-entry open/close switch, the per-category Stage / Non-stage /
Group limits, and class-specific codes (e.g. a Uoola code restricted to class 1). All of these are
enforced **inside the database**, so teams cannot bypass them from the browser.
