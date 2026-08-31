#!/usr/bin/env node
/**
 * Post-build prerender: renders key static routes in a headless browser
 * and writes the fully-rendered HTML into dist/<route>/index.html.
 *
 * Why: the app is a client-side React SPA. Crawlers that don't execute JS
 * would otherwise see an empty #root. Pre-rendering each route to static
 * HTML means search engines get the real content + meta out of the box,
 * while the JS bundle still loads and takes over for interactive users.
 *
 * Run automatically via `npm run build` (postbuild). Requires a system
 * Chromium/Chrome (puppeteer-core). Safe to skip if no browser is found.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');

// Routes to prerender (path -> priority used for sitemap/order)
const ROUTES = ['/', '/courses', '/about', '/ai', '/pricing', '/blog', '/support', '/contact', '/instructor'];

const CHROMIUM_CANDIDATES = [
  process.env.CHROME_PATH,
  '/snap/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
].filter(Boolean);

function findChrome() {
  for (const c of CHROMIUM_CANDIDATES) {
    try {
      // eslint-disable-next-line no-sync
      const r = spawnSync(c, ['--version'], { stdio: 'ignore', timeout: 8000 });
      if (!r.error) return c;
    } catch { /* try next */ }
  }
  return null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = normalize(join(distDir, urlPath));
      // SPA fallback: if not an asset, serve index.html
      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        filePath = join(distDir, 'index.html');
      } else if (statSync(filePath).isDirectory()) {
        filePath = join(filePath, 'index.html');
      }
      const ext = extname(filePath);
      try {
        const body = readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function main() {
  if (!existsSync(join(distDir, 'index.html'))) {
    console.log('[prerender] dist/index.html not found — run `vite build` first. Skipping.');
    return;
  }

  const chrome = findChrome();
  if (!chrome) {
    console.log('[prerender] No Chromium/Chrome found; skipping prerender (SPA will rely on JS rendering).');
    return;
  }

  // If an API env is set to a dev/localhost URL, the prerender could hang on network.
  // Skip network-heavy routes gracefully via page.goto waitUntil 'networkidle2'.

  let puppeteer;
  try {
    puppeteer = (await import('puppeteer-core')).default;
  } catch {
    console.log('[prerender] puppeteer-core not installed; skipping.');
    return;
  }

  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--disable-extensions'],
    });

    for (const route of ROUTES) {
      try {
        const page = await browser.newPage();
        await page.goto(`${base}${route}`, { waitUntil: 'networkidle2', timeout: 20000 });
        await page.evaluateHandle('document.fonts.ready');
        // Give React a moment to render
        await new Promise(r => setTimeout(r, 800));
        const html = await page.content();
        const routeDir = route === '/' ? distDir : join(distDir, route.replace(/^\//, ''));
        mkdirSync(routeDir, { recursive: true });
        writeFileSync(join(routeDir, 'index.html'), html);
        console.log(`[prerender] ${route === '/' ? '/' : route} -> dist${route === '/' ? '/index.html' : route + '/index.html'} (${(html.length / 1024).toFixed(0)} KB)`);
        await page.close();
      } catch (err) {
        console.log(`[prerender] failed ${route}: ${err.message.split('\n')[0]}`);
      }
    }
  } catch (err) {
    console.log('[prerender] error launching browser:', err.message.split('\n')[0]);
  } finally {
    try { if (browser) await browser.close(); } catch {}
    server.close();
  }
  console.log('[prerender] done');
}

main();
