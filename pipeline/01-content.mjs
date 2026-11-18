// Module 1 — CONTENT
// In:  content/site.yml, content/projects/<slug>/{project.yml, *.jpg|png|webp|tif}
// Out: build/content.json   (contract: schema "content/v1", see pipeline/contracts.md)
// Job: read + validate + normalise what Agnes edits. No image processing here.
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const C = path.join(ROOT, 'content');
const IMG_RE = /\.(jpe?g|png|webp|tiff?|avif)$/i;
const errors = [], warnings = [];

const site = YAML.parse(await fs.readFile(path.join(C, 'site.yml'), 'utf8'));
for (const k of ['name', 'role', 'email', 'bio']) if (!site?.[k]) errors.push(`site.yml: missing "${k}"`);

const projects = [];
for (const slug of (await fs.readdir(path.join(C, 'projects'))).sort()) {
  const dir = path.join(C, 'projects', slug);
  if (!(await fs.stat(dir)).isDirectory()) continue;
  if (!/^[a-z0-9-]+$/.test(slug)) errors.push(`${slug}: folder name must be lowercase-with-dashes (it becomes the URL)`);
  let meta;
  try { meta = YAML.parse(await fs.readFile(path.join(dir, 'project.yml'), 'utf8')) || {}; }
  catch (e) { errors.push(`${slug}: project.yml missing or invalid — ${e.message}`); continue; }
  if (meta.draft) continue;

  const files = (await fs.readdir(dir)).filter(f => IMG_RE.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  // Optional explicit order / per-image alt + caption: images: [{file, alt, caption}] or ["file.jpg"]
  const listed = (meta.images || []).map(x => typeof x === 'string' ? { file: x } : x);
  const ordered = listed.length ? listed : files.map(file => ({ file }));
  for (const im of ordered) if (!files.includes(im.file)) errors.push(`${slug}: images lists "${im.file}" but no such file`);
  const images = ordered.filter(im => files.includes(im.file)).map((im, i) => ({
    file: im.file,
    src: path.posix.join('content/projects', slug, im.file),
    alt: im.alt || `${meta.alt || meta.title || slug} — image ${i + 1}`,
    caption: im.caption || null,
  }));
  if (!images.length) errors.push(`${slug}: no images in folder`);

  for (const k of ['title', 'date', 'category']) if (!meta[k]) errors.push(`${slug}: project.yml missing "${k}"`);
  const date = String(meta.date ?? '');
  if (date && !/^\d{4}(-\d{2})?$/.test(date)) errors.push(`${slug}: date must be YYYY or YYYY-MM, got "${date}"`);
  const credits = Object.entries(meta.credits || {}).map(([role, name]) => ({ role, name: String(name) }));
  if (!credits.length) warnings.push(`${slug}: no credits`);
  if (!credits.some(c => /styl/i.test(c.role))) warnings.push(`${slug}: no Styling credit`);
  if (credits.some(c => /name surname/i.test(c.name))) warnings.push(`${slug}: placeholder credit names ("Name Surname")`);

  const coverFile = meta.cover ? String(meta.cover) : images[0]?.file;
  if (meta.cover && !images.some(i => i.file === coverFile)) errors.push(`${slug}: cover "${coverFile}" not found`);

  projects.push({
    slug, title: meta.title, publication: meta.publication || '', date, year: date.slice(0, 4),
    category: meta.category, summary: meta.summary || '', credits,
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
