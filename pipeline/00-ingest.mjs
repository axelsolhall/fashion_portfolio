// Module 0 — INGEST: Agnes's delivery folders → content/projects/<slug>/
// In:  a folder of numbered project folders, as Agnes sends them (WeTransfer), e.g.
//        "4. Moncler x EE72 - Stylist Rebecca Purshouse - Photographer Tyler Mitchell - Assisted by Agnes Solhall - September 2025/"
//          "1. cover.jpg", "2 bild.mov", "3. bild.jpg", …
// Out: content/projects/<slug>/NN.jpg | NN.mp4 + NN.poster.jpg, and a drafted project.yml (never overwritten)
//      build/ingest.json — what was read, written and flagged (eval: npm run eval:ingest)
// Job: make originals safe and small enough for a public git repo (A-12, A-19):
//      images → sRGB JPEG q90, long edge ≤ MAX_EDGE, all metadata (EXIF/GPS/camera serials) stripped;
//      video  → H.264 MP4 (web, faststart) + poster frame.
//      Near-duplicates of a photo already in another project (or earlier in this delivery) are skipped (A-23).
//      Folders may be numbered ("4. Moncler …") or not; the site order lives in content/order.yml (A-24).
// Usage: node pipeline/00-ingest.mjs "<delivery folder>" [--force]
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import sharp from 'sharp';
import { fingerprint, distance } from './lib/fingerprint.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
export const INGEST = { maxEdge: 3200, jpegQuality: 90, lowResEdge: 1400, video: { crf: 23, maxW: 1080, audioKbps: 128, posterAt: 1 },
  // fingerprint distance (pipeline/lib/fingerprint.mjs): ≤ dupMax = same photo (re-export, resize, recompress, slight crop) → skipped;
  // ≤ similarMax = flagged for a human look. Calibrated by npm run eval:ingest (A-23).
  dupMax: 0.22, similarMax: 0.30 };
const IMG = /\.(jpe?g|png|tiff?|webp|avif|heic)$/i, VID = /\.(mov|mp4|m4v)$/i;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const [srcDir, ...flags] = process.argv.slice(2);
if (!srcDir) { console.error('usage: node pipeline/00-ingest.mjs "<delivery folder>" [--force]'); process.exit(2); }
const FORCE = flags.includes('--force');
const slugify = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[×x]\s/g, 'x ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = f => parseInt(f, 10);              // file order: "1. cover.jpg", "2 bild.mov"
const folderNum = n => +(n.match(/^(\d+)\.\s/)?.[1] ?? 0); // folder order only when written "4. Moncler …" ("72 Magazine …" is not number 72)

/** Parse a delivery folder name into draft metadata. Pure function — the one place folder-name conventions live (A-18). */
export function parseFolder(name) {
  const parts = name.replace(/^\d+\.\s*/, '').replace(/:/g, '/').split(/\s+-\s+/).map(s => s.trim());
  let title = parts.shift(), date = '', stylist = '', photographer = '', assisted = false, story = '';
  const notes = [];
  for (const p of parts) {
    let m;
    if ((m = p.match(/^Stylist\s+(.+)/i))) stylist = m[1];
    else if ((m = p.match(/^Photographer\s+(.+)/i))) photographer = m[1];
    else if (/^Assisted by/i.test(p)) assisted = true;
    else if ((m = p.match(/^(?:([A-Za-z]+)\s+)?(\d{4})$/))) date = m[1] && MONTHS.includes(m[1].toLowerCase()) ? `${m[2]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0')}` : m[2];
    else if (!stylist && !/\d/.test(p)) { stylist = p; notes.push(`"${p}" has no label — assumed to be the stylist`); }
    else { story = story ? `${story} ${p}` : p; date ||= storyDate(p); }
  }
  const ty = title.match(/^(.*?)\s+(\d{4})$/); // "Dedicated Lifestyle 2026"
  if (ty) { title = ty[1]; date ||= ty[2]; }
  return { title, story, date, stylist, photographer, assisted, notes };
}
/** Year from a season/edition label: "SS27 …" → 2027, "AW26" → 2026, "Winter 25/26" → 2025, "Spring/Summer 2024 Issue" → 2024. */
export function storyDate(p) {
  let m;
  if ((m = p.match(/\b(\d{4})\b/))) return m[1];
  if ((m = p.match(/\b(?:SS|AW|FW|PF|RS)(\d{2})\b/i))) return '20' + m[1];
  if ((m = p.match(/\b(\d{2})\/\d{2}\b/))) return '20' + m[1];
  return '';
}

/** Path sharp can decode: the file itself, or a lossless PNG made by macOS ImageIO (sips) for formats the bundled
 *  libheif can't read (e.g. 10-bit 4:4:4 AVIF saved from magazine websites). A-19. */
async function readable(p) {
  try { await sharp(p, { failOn: 'none' }).resize(8).toBuffer(); return p; }
  catch {
    const out = path.join(os.tmpdir(), `ingest-${process.pid}-${path.basename(p)}.png`);
    execFileSync('sips', ['-s', 'format', 'png', p, '--out', out], { stdio: 'ignore' });
    return out;
  }
}

const report = { schema: 'ingest/v1', generated: new Date().toISOString(), source: path.resolve(srcDir), settings: INGEST, projects: [] };
const folders = (await fs.readdir(srcDir, { withFileTypes: true })).filter(d => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('__'))
  .sort((a, b) => (folderNum(a.name) || 1e9) - (folderNum(b.name) || 1e9) || a.name.localeCompare(b.name));
const used = new Set();
// A folder ingested before keeps its slug, even if the project folder was renamed since: project.yml records the source folder name.
const known = new Map();
for (const s of await fs.readdir(path.join(ROOT, 'content/projects')).catch(() => [])) {
  const y = await fs.readFile(path.join(ROOT, 'content/projects', s, 'project.yml'), 'utf8').catch(() => '');
  const m = y.match(/^#   (.+)$/m); if (m) known.set(m[1].trim(), s);
}
const taken = new Set(known.values());

// Every photo already on the site, for duplicate detection: [{ slug, file, h }]
const seen = [];
for (const s of await fs.readdir(path.join(ROOT, 'content/projects')).catch(() => []))
  for (const f of await fs.readdir(path.join(ROOT, 'content/projects', s)).catch(() => []))
    if (/^\d+\.jpg$/.test(f)) seen.push({ slug: s, file: f, h: await fingerprint(path.join(ROOT, 'content/projects', s, f)) });
report.duplicates = []; report.similar = [];

for (const d of folders) {
  const meta = parseFolder(d.name);
  let slug = known.get(d.name) || slugify([meta.title, meta.story].filter(Boolean).join(' '));
  if (!known.has(d.name) && (used.has(slug) || taken.has(slug))) slug += '-' + slugify(meta.photographer || meta.stylist || String(folderNum(d.name)));
  used.add(slug);
  const out = path.join(ROOT, 'content/projects', slug);
  await fs.mkdir(out, { recursive: true });
  const files = (await fs.readdir(path.join(srcDir, d.name))).filter(f => IMG.test(f) || VID.test(f)).sort((a, b) => num(a) - num(b) || a.localeCompare(b));
  const items = []; let n = 0;
  for (const f of files) {
    const orig = path.join(srcDir, d.name, f), inBytes = (await fs.stat(orig)).size;
    const inPath = IMG.test(f) ? await readable(orig) : orig;
    if (IMG.test(f)) { // duplicate check against every other project's photos and this delivery so far (not this project's own files: re-runs stay idempotent)
      const h = await fingerprint(inPath);
      const near = seen.filter(x => x.slug !== slug || x.fresh).map(x => ({ ...x, d: distance(h, x.h) })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d <= INGEST.dupMax) { report.duplicates.push({ folder: d.name, file: f, of: `${near.slug}/${near.file}`, distance: near.d }); continue; }
      if (near && near.d <= INGEST.similarMax) report.similar.push({ folder: d.name, file: f, to: `${near.slug}/${near.file}`, distance: near.d });
      seen.push({ slug, file: `${String(n + 1).padStart(2, '0')}.jpg`, h, fresh: true });
    }
    const nn = String(++n).padStart(2, '0');
    if (VID.test(f)) {
      const mp4 = path.join(out, `${nn}.mp4`), poster = path.join(out, `${nn}.poster.jpg`);
      if (FORCE || !(await fs.access(mp4).then(() => true, () => false))) {
        const V = INGEST.video;
        execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', inPath, '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1',
          '-vf', `scale='min(${V.maxW},iw)':-2`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(V.crf), '-pix_fmt', 'yuv420p', '-profile:v', 'high',
          '-c:a', 'aac', '-b:a', `${V.audioKbps}k`, '-movflags', '+faststart', mp4]);
        execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(V.posterAt), '-i', mp4, '-frames:v', '1', '-q:v', '2', poster]);
      }
      const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', mp4]));
      items.push({ in: f, inBytes, out: `${nn}.mp4`, poster: `${nn}.poster.jpg`, kind: 'video', w: probe.streams[0].width, h: probe.streams[0].height,
        duration: +(+probe.format.duration).toFixed(1), outBytes: (await fs.stat(mp4)).size });
    } else {
      const jpg = path.join(out, `${nn}.jpg`);
      const m = await sharp(inPath, { failOn: 'none' }).metadata();
      const [w0, h0] = (m.orientation || 1) >= 5 ? [m.height, m.width] : [m.width, m.height];
      if (FORCE || !(await fs.access(jpg).then(() => true, () => false))) {
        // .rotate() bakes in EXIF orientation; sharp writes no metadata unless asked → EXIF/GPS/XMP gone; pixels converted to sRGB.
        await sharp(inPath, { failOn: 'none', limitInputPixels: false }).rotate()
          .resize({ width: INGEST.maxEdge, height: INGEST.maxEdge, fit: 'inside', withoutEnlargement: true })
          .toColourspace('srgb').jpeg({ quality: INGEST.jpegQuality, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(jpg);
      }
      const o = await sharp(jpg).metadata();
      items.push({ in: f, inBytes, out: `${nn}.jpg`, kind: 'image', inW: w0, inH: h0, w: o.width, h: o.height, outBytes: (await fs.stat(jpg)).size,
        exifOut: !!o.exif, lowRes: Math.max(w0, h0) < INGEST.lowResEdge });
    }
  }
  // Draft project.yml once; after that it is Agnes's/Axel's file and is never overwritten.
  const yml = path.join(out, 'project.yml');
  const drafted = !(await fs.access(yml).then(() => true, () => false));
  if (drafted) {
    const role = meta.assisted ? 'Styling assistant' : 'Stylist';
    const credits = meta.assisted
      ? { Styling: meta.stylist, 'Styling assistant': 'Agnes Solhall', Photography: meta.photographer }
      : { Styling: meta.stylist || 'Agnes Solhall', Photography: meta.photographer };
    const lines = [`# Drafted by pipeline/00-ingest.mjs from the folder name — edit freely, it is never overwritten:`, `#   ${d.name}`,
      ...meta.notes.map(n => `# NOTE: ${n}`),
      `title: ${JSON.stringify(meta.story || meta.title)}`, `publication: ${JSON.stringify(meta.story ? meta.title : '')}`, `date: ${meta.date ? `"${meta.date}"` : '""   # TODO'}`, `category: Editorial`,
      `role: ${role}                 # Agnes's role on this job: Stylist | Styling assistant`, ...(folderNum(d.name) ? [`order: ${folderNum(d.name)}   # superseded by content/order.yml when the project is listed there`] : []), `credits:`,
      ...Object.entries(credits).filter(([, v]) => v).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)];
    await fs.writeFile(yml, lines.join('\n') + '\n');
  }
  report.projects.push({ folder: d.name, slug, parsed: meta, drafted, items });
}

await fs.mkdir(path.join(ROOT, 'build'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'build/ingest.json'), JSON.stringify(report, null, 1));
const all = report.projects.flatMap(p => p.items);
const mb = b => (b / 1e6).toFixed(1);
report.duplicates.forEach(x => console.warn(`  skipped duplicate: ${x.folder}/${x.file} = ${x.of} (distance ${x.distance})`));
report.similar.forEach(x => console.warn(`  similar, check by eye: ${x.folder}/${x.file} ~ ${x.to} (distance ${x.distance})`));
console.log(`ingest: ${report.projects.length} projects, ${all.length} files, ${mb(all.reduce((n, x) => n + x.inBytes, 0))} MB in → ${mb(all.reduce((n, x) => n + x.outBytes, 0))} MB out, ${report.duplicates.length} duplicates skipped → content/projects/ (report: build/ingest.json)`);
