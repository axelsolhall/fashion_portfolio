// Module 1 — CONTENT
// In:  content/site.yml, content/projects/<slug>/{project.yml, *.jpg|png|webp|tif}
// Out: build/content.json   (contract: schema "content/v1", see pipeline/contracts.md)
// Job: read + validate + normalise what Agnes edits. No image processing here.
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const C = path.join(ROOT, 'content');
// Media: images, plus web videos (NN.mp4) that need a poster frame next to them (NN.poster.jpg — not an item itself).
const IMG_RE = /^(?!.*\.poster\.)[^/]+\.(jpe?g|png|webp|tiff?|avif)$/i, VID_RE = /\.mp4$/i;
const ROLES = ['Stylist', 'Styling assistant'];
const errors = [], warnings = [];

const site = YAML.parse(await fs.readFile(path.join(C, 'site.yml'), 'utf8'));
for (const k of ['name', 'role', 'email', 'bio']) if (!site?.[k]) errors.push(`site.yml: missing "${k}"`);
for (const k of ['publications', 'clients', 'experience', 'education']) {
  if (site?.[k] != null && !Array.isArray(site[k])) errors.push(`site.yml: "${k}" must be a list`);
  (site?.[k] || []).forEach((x, i) => { if (typeof x !== 'string' && !(x && typeof x.name === 'string')) errors.push(`site.yml: ${k}[${i}] must be a name or {name, note}`); });
}

const projects = [];
for (const slug of (await fs.readdir(path.join(C, 'projects'))).sort()) {
  const dir = path.join(C, 'projects', slug);
  if (!(await fs.stat(dir)).isDirectory()) continue;
  if (!/^[a-z0-9-]+$/.test(slug)) errors.push(`${slug}: folder name must be lowercase-with-dashes (it becomes the URL)`);
  let meta;
  try { meta = YAML.parse(await fs.readFile(path.join(dir, 'project.yml'), 'utf8')) || {}; }
  catch (e) { errors.push(`${slug}: project.yml missing or invalid — ${e.message}`); continue; }
  if (meta.draft) continue;

  const all = await fs.readdir(dir);
  const files = all.filter(f => IMG_RE.test(f) || VID_RE.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  for (const v of files.filter(f => VID_RE.test(f))) if (!all.includes(v.replace(VID_RE, '.poster.jpg'))) errors.push(`${slug}: video ${v} has no poster ${v.replace(VID_RE, '.poster.jpg')}`);
  // Optional explicit order / per-image alt + caption: images: [{file, alt, caption}] or ["file.jpg"]
  const listed = (meta.images || []).map(x => typeof x === 'string' ? { file: x } : x);
  const ordered = listed.length ? listed : files.map(file => ({ file }));
  for (const im of ordered) if (!files.includes(im.file)) errors.push(`${slug}: images lists "${im.file}" but no such file`);
  const images = ordered.filter(im => files.includes(im.file)).map((im, i) => ({
    file: im.file,
    src: path.posix.join('content/projects', slug, im.file),
    alt: im.alt || `${meta.alt || meta.title || slug} — image ${i + 1}`,
    caption: im.caption || null,
    ...(VID_RE.test(im.file) ? { kind: 'video', poster: path.posix.join('content/projects', slug, im.file.replace(VID_RE, '.poster.jpg')) } : { kind: 'image' }),
  }));
  if (!images.length) errors.push(`${slug}: no images in folder`);

  for (const k of ['title', 'date', 'category']) if (!meta[k]) errors.push(`${slug}: project.yml missing "${k}"`);
  const date = String(meta.date ?? '');
  if (date && !/^\d{4}(-\d{2})?$/.test(date)) errors.push(`${slug}: date must be YYYY or YYYY-MM, got "${date}"`);
  const credits = Object.entries(meta.credits || {}).map(([role, name]) => ({ role, name: String(name) }));
  if (!credits.length) warnings.push(`${slug}: no credits`);
  if (!credits.some(c => /styl/i.test(c.role))) warnings.push(`${slug}: no Styling credit`);
  if (credits.some(c => /name surname/i.test(c.name))) warnings.push(`${slug}: placeholder credit names ("Name Surname")`);

  // Agnes's role on the job (A-20). Pages must never say "styled by" her on a job she assisted.
  const role = meta.role || 'Stylist';
  if (!ROLES.includes(role)) errors.push(`${slug}: role must be one of ${ROLES.join(' | ')}, got "${role}"`);
  const herCredit = credits.find(c => c.name === site?.name);
  if (role === 'Styling assistant' && herCredit && /^styl(ing|ist)$/i.test(herCredit.role)) errors.push(`${slug}: role is "Styling assistant" but credits list ${site.name} as "${herCredit.role}"`);
  if (role === 'Stylist' && credits.some(c => /assist/i.test(c.role) && c.name === site?.name)) errors.push(`${slug}: role is "Stylist" but credits list ${site.name} as an assistant`);

  const coverFile = meta.cover ? String(meta.cover) : images.find(i => i.kind === 'image')?.file;
  if (meta.cover && !images.some(i => i.file === coverFile && i.kind === 'image')) errors.push(`${slug}: cover "${coverFile}" not found (must be an image)`);

  projects.push({
    slug, title: meta.title, publication: meta.publication || '', date, year: date.slice(0, 4),
    category: meta.category, summary: meta.summary || '', credits, role,
    leadStylist: role === 'Styling assistant' ? (credits.find(c => /^styl(ing|ist)$/i.test(c.role))?.name || '') : '',
    order: meta.order ?? null, featured: meta.featured !== false,
    placeholder: images.some(i => i.file.startsWith('_placeholder_')),
    cover: coverFile, images,
  });
}
// Order: explicit `order` first, then newest date first (ASSUMPTIONS A-05)
projects.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

const out = { schema: 'content/v1', generated: new Date().toISOString(), site, projects, warnings };
await fs.mkdir(path.join(ROOT, 'build'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'build/content.json'), JSON.stringify(out, null, 2));
warnings.forEach(w => console.warn('  warn:', w));
if (errors.length) { errors.forEach(e => console.error('  ERROR:', e)); process.exit(1); }
console.log(`content: ${projects.length} projects, ${projects.reduce((n, p) => n + p.images.length, 0)} images → build/content.json`);
