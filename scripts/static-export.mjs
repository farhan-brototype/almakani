// Post-build static export for pure SPA build.
// Copies index.html to 404.html and route .html files so static hosts serve all URLs directly,
// and adds .htaccess (Namecheap/cPanel), _redirects (Netlify), and vercel.json (Vercel).

import { copyFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");
const INDEX_HTML = join(DIST, "index.html");

if (!existsSync(INDEX_HTML)) {
  console.error("[static-export] ERROR: dist/index.html not found after build!");
  process.exit(1);
}

const PAGES = [
  "about",
  "documents",
  "gallery",
  "results",
  "contact",
  "schedule",
  "teams",
  "login",
  "live",
  "programlist",
  "registration",
  "admin",
];

// Write 404.html
copyFileSync(INDEX_HTML, join(DIST, "404.html"));
console.log("[static-export] Created dist/404.html");

// Write route HTML files
for (const page of PAGES) {
  copyFileSync(INDEX_HTML, join(DIST, `${page}.html`));
  console.log(`[static-export] Created dist/${page}.html`);
}

// --- Apache / cPanel / Namecheap hosting (.htaccess) ---
writeFileSync(
  join(DIST, ".htaccess"),
  `# Arts Fest Manager — static hosting rules for cPanel / Namecheap
Options -MultiViews
RewriteEngine On

# Serve real files/folders as-is
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# /path -> /path.html when it exists
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.*)$ $1.html [L]

# Everything else falls back to index.html for client-side routing
RewriteRule ^ index.html [L]
`,
);

// --- Netlify (_redirects) ---
writeFileSync(
  join(DIST, "_redirects"),
  `# Netlify SPA routing
/*    /index.html    200
`,
);

// --- Vercel (vercel.json) ---
writeFileSync(
  join(DIST, "vercel.json"),
  JSON.stringify(
    {
      cleanUrls: true,
      rewrites: [
        {
          source: "/(.*)",
          destination: "/index.html",
        },
      ],
    },
    null,
    2,
  ),
);

console.log("[static-export] Pure static export complete! dist/ contents:", readdirSync(DIST).join(", "));
