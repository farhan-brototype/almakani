# Deploying Static Site (Netlify / Namecheap / Vercel) + Supabase

## 1. Build the static site

```bash
npm install
npm run build
```

The build command outputs a completely self-contained static `dist/` directory that contains:
- `index.html` (the primary SPA shell that handles all client routes: `/results`, `/teams`, `/schedule`, `/live`, `/login`, `/admin/*`, `/team/*`, etc.)
- `404.html` (for fallback routing on GitHub Pages and static hosts)
- `assets/` (optimized JS & CSS bundles with automatic code splitting)
- `_redirects` & `_headers` (pre-configured for **Netlify**)
- `.htaccess` (pre-configured for **Namecheap / cPanel / Apache**)
- `vercel.json` (pre-configured for **Vercel**)

### Deployment Options

- **Netlify**:
  - **Drag & drop**: Upload the generated `dist/` folder at [app.netlify.com](https://app.netlify.com) → "Deploy manually".
  - **Git repository**: Connect your git repo on Netlify. `netlify.toml` is pre-configured with `command = "npm run build"` and `publish = "dist"`.
- **Namecheap / cPanel**:
  - Upload the contents of the `dist/` folder into your domain's `public_html/` folder via File Manager or FTP. The included `.htaccess` file handles URL routing.
- **Vercel**:
  - Deploy using Vercel CLI (`vercel`) or connect your Git repository. The included `vercel.json` handles URL rewriting to `index.html`.

### Environment Variables

Set these in your host's environment settings (or in `.env` before building):

```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>
```

### One limitation


## 2. Move the database to your own Supabase

1. Create a project at supabase.com.
2. Open **SQL Editor → New query**, paste the whole of `supabase/setup.sql`
   from this repo and run it. That creates every table, index, RLS policy,
   grant, database function and trigger the app uses, plus the two baseline
   settings rows.
3. **Storage:** create these buckets (all private) under Storage →
   New bucket: `student-photos`, `fest-documents`, `fest-gallery`,
   `fest-branding`.
4. **Admin user:** Authentication → Users → Add user (email + password), then
   run in SQL Editor:

   ```sql
   INSERT INTO public.admin_users (user_id)
   SELECT id FROM auth.users WHERE email = 'you@example.com';
   ```

5. **Existing data (optional):** Export data CSVs from your previous Supabase project, then import them in the new Supabase project via
   Table editor → Import data from CSV. Import in this order so foreign keys
   resolve: `teams`, `students`, `categories`, `grading_schemes`, `programs`,
   `assignments`, `timetable`, `result_entries`, then the rest.
6. Put the new project's URL and publishable key into the Netlify env vars
   above and rebuild.


## 3. HTTPS (the "Not secure" warning)

The certificate is issued by whoever *serves* almakani.islahululoom.in, not by
the app code. Pick the host you actually use:

- **Netlify** — Site configuration → Domain management → add
  `almakani.islahululoom.in`, point the DNS record at Netlify, then
  HTTPS → *Verify DNS configuration* → *Provision certificate*. Finally switch
  on **Force HTTPS**. `netlify.toml` already redirects http → https.
- **Vercel** — Project → Settings → Domains → add the domain and follow the
  DNS instructions. Vercel provisions the certificate automatically and always
  redirects to https.
- **Namecheap / cPanel shared hosting** — upload the contents of `dist/` into
  `public_html` (keep `.htaccess`), then cPanel → **SSL/TLS Status** → select
  the domain → **Run AutoSSL**. Wait for the Let's Encrypt certificate to be
  issued; the `.htaccess` in this repo then forces https.

If it still says "Not secure": the DNS record is probably still pointing at an
old host (check with dnschecker.org), or the certificate covers only
`islahululoom.in` and not the `almakani` subdomain — AutoSSL has to be run for
the subdomain itself.

## 4. Being found when searching "almakani"

Shipped in the repo: title/description/keywords, Open Graph + Twitter cards,
`WebSite`, `EducationalOrganization` and `SearchAction` JSON-LD, `robots.txt`
(admin/team routes excluded) and `sitemap.xml`.

Still to do once, by hand, in Google:

1. Open Google Search Console → **Add property** → URL prefix
   `https://almakani.islahululoom.in/`.
2. Verify with the **HTML tag** method — paste the given
   `<meta name="google-site-verification" ...>` into `index.html`'s `<head>`,
   redeploy, then press Verify.
3. **Sitemaps** → submit `sitemap.xml`.
4. **URL Inspection** → enter the homepage → *Request indexing*.

Indexing for the name usually takes a few days after that.
