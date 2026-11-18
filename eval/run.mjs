// Evals — one section per pipeline module, each runnable alone:
//   npm run eval            all modules
//   npm run eval:content    module 1 (content/v1)   — schema, completeness, placeholders left
//   npm run eval:images     module 2 (images/v1)    — files exist, compression vs source, LQIP size
//   npm run eval:site       module 3 (dist/)        — broken links, every project shows ALL images + ALL credits,
//                                                     alt text, page weight per theme
// Exit code 1 if any check FAILS (warnings don't fail). Output names the module that is wrong.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const which = process.argv[2] || 'all';
const read = async p => JSON.parse(await fs.readFile(path.join(ROOT, p), 'utf8'));
const exists = p => fs.access(p).then(() => true, () => false);
const kb = b => (b / 1024).toFixed(0) + ' KB', mb = b => (b / 1048576).toFixed(1) + ' MB';
let failed = 0;
const fail = (mod, msg) => { failed++; console.log(`  ✗ FAIL [${mod}] ${msg}`); };
const ok = msg => console.log(`  ✓ ${msg}`);
const warn = msg => console.log(`  ! ${msg}`);
const table = rows => { const w = rows[0].map((_, i) => Math.max(...rows.map(r => String(r[i]).length))); rows.forEach(r => console.log('    ' + r.map((c, i) => String(c).padEnd(w[i])).join('  '))); };

// ---------------------------------------------------------------- module 1
async function evalContent() {
  console.log('\n[1] CONTENT  build/content.json');
  const c = await read('build/content.json');
  c.schema === 'content/v1' ? ok('schema content/v1') : fail('content', `schema is ${c.schema}`);
  const ps = c.projects;
  const rows = [['project', 'images', 'credits', 'styling?', 'placeholder imgs', 'placeholder names']];
  for (const p of ps) {
    const names = p.credits.filter(x => /name surname/i.test(x.name)).length;
    rows.push([p.slug, p.images.length, p.credits.length, p.credits.some(x => /styl/i.test(x.role)) ? 'yes' : 'NO', p.placeholder ? 'yes' : '-', names || '-']);
    if (!p.images.length) fail('content', `${p.slug} has no images`);
    if (p.images.length < 3) warn(`${p.slug}: only ${p.images.length} images — stories read better with 4+`);
  }
  table(rows);
  const nImg = ps.reduce((n, p) => n + p.images.length, 0);
  ok(`${ps.length} projects, ${nImg} images, ${(nImg / ps.length).toFixed(1)} images/project`);
  const ph = ps.filter(p => p.placeholder).length;
  ph ? warn(`${ph}/${ps.length} projects still use placeholder photos → replace before launch (VERIFY.md)`) : ok('no placeholder photos');
  const todo = (await fs.readFile(path.join(ROOT, 'content/site.yml'), 'utf8')).match(/TODO\(agnes\)/g)?.length || 0;
  todo ? warn(`${todo} TODO(agnes) fields left in content/site.yml`) : ok('site.yml complete');
}

// ---------------------------------------------------------------- module 2
async function evalImages() {
  console.log('\n[2] IMAGES  build/images.json + build/img/');
  const im = await read('build/images.json');
  im.schema === 'images/v1' ? ok('schema images/v1') : fail('images', `schema is ${im.schema}`);
  const c = await read('build/content.json');
  const srcs = c.projects.flatMap(p => p.images.map(i => i.src));
  const missing = srcs.filter(s => !im.images[s]);
  missing.length ? fail('images', `${missing.length} content images not processed: ${missing.slice(0, 3).join(', ')}`) : ok(`all ${srcs.length} content images processed`);
  let srcBytes = 0, avif960 = 0, webp960 = 0, lqip = 0, n = 0, files = 0, missingFiles = 0;
  for (const s of srcs) {
    const m = im.images[s]; if (!m) continue;
    n++; srcBytes += m.srcBytes; lqip += m.lqip.length;
    for (const v of [...m.variants.avif, ...m.variants.webp, { file: m.og }]) { files++; if (!(await exists(path.join(ROOT, 'build/img', v.file)))) missingFiles++; }
    const a = m.variants.avif.find(v => v.w >= 960) || m.variants.avif.at(-1), w = m.variants.webp.find(v => v.w >= 960) || m.variants.webp.at(-1);
    avif960 += (await fs.stat(path.join(ROOT, 'build/img', a.file))).size;
    webp960 += (await fs.stat(path.join(ROOT, 'build/img', w.file))).size;
  }
  missingFiles ? fail('images', `${missingFiles}/${files} variant files missing on disk`) : ok(`${files} variant files present`);
  table([['metric', 'value', 'baseline / target'],
    ['avg source JPEG', kb(srcBytes / n), '—'],
    ['avg AVIF @ ~960w', kb(avif960 / n), '< 150 KB'],
    ['avg WebP @ ~960w', kb(webp960 / n), '< 220 KB'],
    ['bytes saved vs source (AVIF 960)', ((1 - avif960 / srcBytes) * 100).toFixed(1) + '%', '> 85%'],
    ['avg inline LQIP', (lqip / n).toFixed(0) + ' B', '< 1200 B']]);
  if (avif960 / n > 150 * 1024) warn('AVIF 960 average above target — lower SETTINGS.avif.quality');
  if (lqip / n > 1200) warn('LQIP above target — lower lqipWidth');
}

// ---------------------------------------------------------------- module 3
async function evalSite() {
  console.log('\n[3] SITE  dist/');
  const DIST = path.join(ROOT, 'dist');
  const pj = await read('dist/pages.json');
  const c = await read('build/content.json');
  const base = pj.base;
  const resolve = url => {
    if (!url.startsWith(base)) return null;
    let p = path.join(DIST, decodeURIComponent(url.slice(base.length).split(/[?#]/)[0]));
    return p.endsWith('/') || !path.extname(p) ? path.join(p, 'index.html') : p;
  };
  const broken = new Set(); let links = 0;
  const perTheme = {};
  for (const page of pj.pages) {
    const html = await fs.readFile(path.join(DIST, page.file), 'utf8');
    const t = perTheme[page.theme] ||= { pages: 0, html: 0, imgsNoAlt: 0, projOK: 0, projBad: [] };
    t.pages++; t.html += page.bytes;
    // links & assets
    const urls = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1])
      .concat([...html.matchAll(/srcset="([^"]+)"/g)].flatMap(m => m[1].split(',').map(s => s.trim().split(' ')[0])));
    for (const u of urls) {
      if (/^(https?:|mailto:|data:|#)/.test(u)) continue;
      links++;
      const f = resolve(u);
      if (!f || !(await exists(f))) broken.add(`${page.url} → ${u}`);
    }
    t.imgsNoAlt += [...html.matchAll(/<img(?![^>]*\balt=)[^>]*>/g)].length;
    // project completeness: every image + every credit of that project is on its page
    const m = page.url.match(/work\/([^/]+)\/$/);
    if (m) {
      const p = c.projects.find(x => x.slug === m[1]);
      const shown = new Set([...html.matchAll(/data-lightbox="[^"]+"[^>]*data-full="[^"]*\/img\/([^"-]+)/g)].map(x => x[1]));
      const im = await read('build/images.json');
      const want = p.images.map(i => im.images[i.src].hash);
      const missingImgs = want.filter(h => ![...shown].some(s => h.startsWith(s) || s.startsWith(h))).length;
      const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
      const missingCredits = p.credits.filter(cr => !html.includes(esc(cr.name)) || !html.includes(esc(cr.role))).length;
      if (missingImgs || missingCredits) t.projBad.push(`${p.slug} (${missingImgs} imgs, ${missingCredits} credits missing)`); else t.projOK++;
    }
  }
  broken.size ? [...broken].slice(0, 10).forEach(b => fail('site', `broken link ${b}`)) : ok(`${links} internal links/assets checked, 0 broken`);
  const rows = [['theme', 'pages', 'avg HTML', 'projects complete', 'img w/o alt', 'CSS+JS']];
  for (const [name, t] of Object.entries(perTheme)) {
    let assets = 0;
    const dir = path.join(DIST, name === 'chooser' ? 'shared' : (pj.themes.find(x => x.name === name)?.mount || '') + 'assets');
    for (const f of await fs.readdir(dir).catch(() => [])) assets += (await fs.stat(path.join(dir, f))).size;
    rows.push([name, t.pages, kb(t.html / t.pages), name === 'chooser' ? '-' : `${t.projOK}/${c.projects.length}`, t.imgsNoAlt, kb(assets)]);
    t.projBad.forEach(b => fail('site', `${name}: project page incomplete — ${b}`));
    if (t.imgsNoAlt) fail('site', `${name}: ${t.imgsNoAlt} <img> without alt`);
  }
  table(rows);
  let shared = 0; for (const f of await fs.readdir(path.join(DIST, 'shared'))) shared += (await fs.stat(path.join(DIST, 'shared', f))).size;
  ok(`shared core CSS+JS ${kb(shared)} (target < 20 KB, no frameworks)`);
  let img = 0; for (const f of await fs.readdir(path.join(DIST, 'img'))) img += (await fs.stat(path.join(DIST, 'img', f))).size;
  ok(`deployed images ${mb(img)} (GitHub Pages limit 1 GB)`);
}

if (which === 'all' || which === 'content') await evalContent().catch(e => fail('content', e.message));
if (which === 'all' || which === 'images') await evalImages().catch(e => fail('images', e.message));
if (which === 'all' || which === 'site') await evalSite().catch(e => fail('site', e.message));
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
