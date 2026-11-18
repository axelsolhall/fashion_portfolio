// Module 3 — SITE
// In:  build/content.json (content/v1) + build/images.json (images/v1) + themes/<name>/theme.mjs
// Out: dist/  — static site, one folder per theme (or one theme at the root), plus dist/pages.json
// Config (env) — ASSUMPTIONS A-07:
//   SITE_BASE        URL path the site is served under. "/" for agnes.solhall.se, "/fashion_portfolio/" for GitHub Pages preview.
//   SITE_THEMES      comma list of themes to build (default: atelier,mosaic,spread)
//   SITE_ROOT_THEME  if set, that single theme is mounted at SITE_BASE (production). Otherwise each theme at SITE_BASE<theme>/ + a chooser page.
//   SITE_PREVIEW     "1" (default) adds noindex + placeholder notice. Set "0" once real content is in.
import fs from 'node:fs/promises';
import path from 'node:path';
import { makeCtx } from '../themes/_shared/lib.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BASE = (process.env.SITE_BASE || '/').replace(/\/?$/, '/');
const ROOT_THEME = process.env.SITE_ROOT_THEME || '';
const THEMES = ROOT_THEME ? [ROOT_THEME] : (process.env.SITE_THEMES || 'atelier,mosaic,spread').split(',').map(s => s.trim());
const PREVIEW = process.env.SITE_PREVIEW !== '0';

const content = JSON.parse(await fs.readFile(path.join(ROOT, 'build/content.json'), 'utf8'));
const images = JSON.parse(await fs.readFile(path.join(ROOT, 'build/images.json'), 'utf8'));
if (content.schema !== 'content/v1' || images.schema !== 'images/v1') throw new Error('contract version mismatch — re-run npm run build');

await fs.rm(DIST, { recursive: true, force: true });
await fs.mkdir(DIST, { recursive: true });

// shared assets + processed images are stored once and referenced by every theme
await fs.cp(path.join(ROOT, 'build/img'), path.join(DIST, 'img'), { recursive: true });
await fs.cp(path.join(ROOT, 'themes/_shared/assets'), path.join(DIST, 'shared'), { recursive: true });

const pages = [];
const meta = [];
for (const name of THEMES) {
  const theme = await import(path.join(ROOT, 'themes', name, 'theme.mjs'));
  const mount = ROOT_THEME ? '' : name + '/';
  const ctx = { ...makeCtx({ content, images, base: BASE, mount, assetBase: BASE }), preview: PREVIEW, themeAssets: BASE + mount + 'assets/' };
  const out = await theme.render(ctx);
  for (const { path: p, html } of out) {
    const file = path.join(DIST, mount, p);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, html);
    pages.push({ theme: name, url: BASE + mount + p.replace(/index\.html$/, ''), file: path.relative(DIST, file), bytes: Buffer.byteLength(html) });
  }
  await fs.cp(path.join(ROOT, 'themes', name, 'assets'), path.join(DIST, mount, 'assets'), { recursive: true });
  meta.push({ name, mount, ...theme.meta });
}

if (!ROOT_THEME) {
  const chooser = (await import('../themes/_shared/chooser.mjs')).render({ content, images, base: BASE, themes: meta });
  await fs.writeFile(path.join(DIST, 'index.html'), chooser);
  pages.push({ theme: 'chooser', url: BASE, file: 'index.html', bytes: Buffer.byteLength(chooser) });
}
// Old preview links (/<theme>/…, shared with Agnes before launch) redirect to the same page at the root.
// Atelier keeps deep links (/atelier/work/rouge/#3 → /work/rouge/#3); the other themes go to the home page.
if (ROOT_THEME) {
  const redirect = to => `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0;url=${to}"><script>location.replace(${JSON.stringify(to)}+location.hash)</script><a href="${to}">${to}</a>\n`;
  for (const old of ['atelier', 'mosaic', 'spread']) {
    const targets = old === ROOT_THEME ? pages.map(p => p.url.slice(BASE.length)) : [''];
    for (const t of targets) {
      const f = path.join(DIST, old, t, 'index.html');
      await fs.mkdir(path.dirname(f), { recursive: true });
      await fs.writeFile(f, redirect(BASE + t));
    }
  }
}
await fs.writeFile(path.join(DIST, '.nojekyll'), '');
await fs.writeFile(path.join(DIST, 'robots.txt'), PREVIEW ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${content.site.url.replace(/\/$/, '')}/sitemap.xml\n`);
if (!PREVIEW && ROOT_THEME) {
  const urls = pages.map(p => content.site.url.replace(/\/$/, '') + p.url.slice(BASE.length - 1));
  await fs.writeFile(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${u}</loc></url>`).join('')}</urlset>\n`);
}
await fs.writeFile(path.join(DIST, 'pages.json'), JSON.stringify({ schema: 'pages/v1', base: BASE, themes: meta, pages }, null, 1));
console.log(`site: ${pages.length} pages across ${THEMES.length} theme(s) at base ${BASE} → dist/`);
