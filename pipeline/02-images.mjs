// Module 2 — IMAGES
// In:  build/content.json (uses images[].src)
// Out: build/img/<hash>-<width>.<avif|webp|jpg>  +  build/images.json (contract "images/v1")
// Job: responsive variants, intrinsic size, dominant colour, tiny blurred placeholder (LQIP).
// Cached by source-file hash + settings, so re-runs only touch new/changed photos.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
// Tunables — ASSUMPTIONS A-06 (widths/quality chosen for full-bleed editorial images on retina screens)
export const SETTINGS = { widths: [480, 960, 1440, 2048], avif: { quality: 52, effort: 4 }, webp: { quality: 78 }, jpg: { quality: 80, width: 1200 }, lqipWidth: 24 };
const SETTINGS_KEY = crypto.createHash('md5').update(JSON.stringify(SETTINGS)).digest('hex').slice(0, 6);

const content = JSON.parse(await fs.readFile(path.join(ROOT, 'build/content.json'), 'utf8'));
const OUT = path.join(ROOT, 'build/img');
await fs.mkdir(OUT, { recursive: true });
const prev = await fs.readFile(path.join(ROOT, 'build/images.json'), 'utf8').then(JSON.parse).catch(() => ({ images: {} }));

const srcs = [...new Set(content.projects.flatMap(p => p.images.map(i => i.src)))];
const result = {}; let built = 0, reused = 0;
const t0 = Date.now();

async function processOne(src) {
  const buf = await fs.readFile(path.join(ROOT, src));
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10) + SETTINGS_KEY;
  const old = prev.images?.[src];
  if (old?.hash === hash && await fs.access(path.join(OUT, path.basename(old.og))).then(() => true, () => false)) { result[src] = old; reused++; return; }

  const base = sharp(buf, { failOn: 'none' }).rotate(); // respect EXIF orientation
  const { width: W, height: H } = await base.clone().toBuffer({ resolveWithObject: true }).then(r => r.info);
  const widths = [...new Set(SETTINGS.widths.filter(w => w < W).concat(Math.min(W, SETTINGS.widths.at(-1))))].sort((a, b) => a - b);
  const variants = { avif: [], webp: [] };
  for (const w of widths) {
    const r = base.clone().resize({ width: w }).withMetadata({ orientation: undefined });
    const a = `${hash}-${w}.avif`, b = `${hash}-${w}.webp`;
    await r.clone().avif(SETTINGS.avif).toFile(path.join(OUT, a));
    await r.clone().webp(SETTINGS.webp).toFile(path.join(OUT, b));
    variants.avif.push({ w, file: a }); variants.webp.push({ w, file: b });
  }
  const og = `${hash}-og.jpg`;
  await base.clone().resize({ width: Math.min(W, SETTINGS.jpg.width) }).jpeg({ quality: SETTINGS.jpg.quality, mozjpeg: true }).toFile(path.join(OUT, og));
  const { dominant } = await base.clone().stats();
  const lqipBuf = await base.clone().resize({ width: SETTINGS.lqipWidth }).blur(1.2).webp({ quality: 40 }).toBuffer();
  const hex = '#' + [dominant.r, dominant.g, dominant.b].map(v => v.toString(16).padStart(2, '0')).join('');
  const lum = (0.2126 * dominant.r + 0.7152 * dominant.g + 0.0722 * dominant.b) / 255;
  result[src] = { hash, w: W, h: H, ratio: +(W / H).toFixed(4), orientation: W > H * 1.05 ? 'landscape' : 'portrait',
    color: hex, dark: lum < 0.45, lqip: 'data:image/webp;base64,' + lqipBuf.toString('base64'),
    srcBytes: buf.length, variants, og };
  built++;
}

// small concurrency pool
const queue = [...srcs]; const N = Math.max(2, Math.min(6, os.cpus().length - 1));
await Promise.all(Array.from({ length: N }, async () => { while (queue.length) await processOne(queue.shift()); }));

// prune files no longer referenced
const keep = new Set(Object.values(result).flatMap(r => [r.og, ...r.variants.avif.map(v => v.file), ...r.variants.webp.map(v => v.file)]));
let pruned = 0;
for (const f of await fs.readdir(OUT)) if (!keep.has(f)) { await fs.unlink(path.join(OUT, f)); pruned++; }

await fs.writeFile(path.join(ROOT, 'build/images.json'), JSON.stringify({ schema: 'images/v1', settings: SETTINGS, images: result }, null, 1));
console.log(`images: ${srcs.length} sources (${built} built, ${reused} cached, ${pruned} stale files pruned) in ${((Date.now() - t0) / 1000).toFixed(1)}s → build/images.json`);
