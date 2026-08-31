#!/usr/bin/env node
/**
 * Build-time SEO generator: creates public/sitemap.xml and public/robots.txt.
 *
 * - Fetches the full published course list from the backend (public /subjects)
 *   to include dynamic course URLs in the sitemap.
 * - Falls back gracefully (static routes only) if the API is unreachable,
 *   so builds never fail because of an offline backend.
 *
 * Run automatically via `npm run build` (prebuild) or standalone:
 *   node scripts/generate-sitemap.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  const vars = {};
  const envFile = join(root, '.env.production');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m) vars[m[1]] = m[2];
    }
  }
  return vars;
}

const env = loadEnv();
const SITE_DOMAIN = (env.VITE_DOMAIN || 'mohamed-atta.com').replace(/^https?:\/\//, '').replace(/\/+$/, '');
const API_BASE = env.VITE_API_URL || `https://${SITE_DOMAIN}/api/v1`;
const ORIGIN = `https://${SITE_DOMAIN}`;

// Static (non-dynamic) routes to include in the sitemap
const STATIC_ROUTES = [
  { path: '/', priority: '1.0', frequency: 'daily' },
  { path: '/courses', priority: '0.9', frequency: 'daily' },
  { path: '/ai', priority: '0.7', frequency: 'weekly' },
  { path: '/about', priority: '0.6', frequency: 'monthly' },
  { path: '/pricing', priority: '0.6', frequency: 'monthly' },
  { path: '/blog', priority: '0.5', frequency: 'weekly' },
  { path: '/support', priority: '0.3', frequency: 'monthly' },
  { path: '/contact', priority: '0.5', frequency: 'monthly' },
  { path: '/instructor', priority: '0.4', frequency: 'weekly' },
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fetchAllCourses() {
  // Prefer the dedicated SEO sitemap endpoint (compact, sitemap-shaped data).
  try {
    const res = await fetch(`${API_BASE}/seo/sitemap`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const json = await res.json();
      const data = Array.isArray(json) ? json : (json?.data?.courses ?? json?.courses);
      if (Array.isArray(data)) {
        return data.map(c => ({
          id: c?.id,
          name: c?.title,
          url: c?.url,
          lastmod: c?.lastMod ?? c?.lastmod,
          ...(c ?? {}),
        }));
      }
    }
  } catch {
    /* fall back to paginated /subjects below */
  }

  // Fallback: paginate over the public /subjects endpoint.
  const courses = [];
  let page = 1;
  const perPage = 100;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await fetch(`${API_BASE}/subjects?page=${page}&per_page=${perPage}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) break;
      const json = await res.json();
      const data = Array.isArray(json) ? json : (json.data ?? []);
      if (!Array.isArray(data) || data.length === 0) break;
      courses.push(...data);
      const total = json?.meta?.total ?? json?.total ?? data.length;
      if (courses.length >= total || data.length < perPage) break;
      page += 1;
    }
  } catch {
    /* backend offline — fall back to static-only sitemap */
  }
  return courses;
}

function coursePath(c) {
  // Prefer the URL provided by the SEO sitemap endpoint.
  if (typeof c?.url === 'string' && c.url.startsWith('/subject/')) {
    return c.url.split(/[?#]/)[0];
  }
  const id = c?.id ?? c?.guidId;
  const guid = typeof c?.guidId === 'string' ? c.guidId : (typeof id === 'string' && id.includes('-') ? id : undefined);
  const numeric = typeof id === 'number' ? id : (guid ? undefined : id);
  if (guid) return `/subject/${guid}`;
  if (numeric) return `/subject/${numeric}`;
  return null;
}

async function main() {
  const courses = await fetchAllCourses();
  const courseEntries = courses
    .map(c => {
      const p = coursePath(c);
      if (!p) return null;
      const lastmod = c?.lastMod || c?.updatedAt || c?.createdAt || new Date().toISOString().slice(0, 10);
      return { path: p, priority: '0.8', frequency: 'monthly', lastmod };
    })
    .filter(Boolean);

  const entries = [...STATIC_ROUTES, ...courseEntries];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
  for (const e of entries) {
    xml += `  <url>\n`;
    xml += `    <loc>${esc(`${ORIGIN}${e.path}`)}</loc>\n`;
    if (e.lastmod) xml += `    <lastmod>${esc(e.lastmod)}</lastmod>\n`;
    xml += `    <changefreq>${e.frequency}</changefreq>\n`;
    xml += `    <priority>${e.priority}</priority>\n`;
    xml += `  </url>\n`;
  }
  xml += `</urlset>\n`;

  const robots = [
    `User-agent: *`,
    `Allow: /`,
    `Disallow: /dashboard`,
    `Disallow: /teacher`,
    `Disallow: /admin`,
    `Disallow: /checkout`,
    `Disallow: /login`,
    `Disallow: /signup`,
    `Disallow: /forgot-password`,
    `Disallow: /verify-email`,
    `Disallow: /payment-*`,
    ``,
    `Sitemap: ${ORIGIN}/sitemap.xml`,
    ``,
  ].join('\n');

  writeFileSync(join(root, 'public', 'sitemap.xml'), xml);
  writeFileSync(join(root, 'public', 'robots.txt'), robots);

  console.log(`[seo] sitemap.xml written: ${entries.length} URLs (${courses.length} courses)`);
  console.log(`[seo] robots.txt written`);
}

main().catch(err => {
  console.error('[seo] sitemap generation failed (continuing build):', err.message);
});
