// Module 0 (optional): fetch placeholder stock imagery. See ASSUMPTIONS.md A-01.
// In:  content/placeholders.yml   Out: content/projects/<slug>/_placeholder_NN.jpg
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const spec = YAML.parse(await fs.readFile(path.join(ROOT, 'content/placeholders.yml'), 'utf8')) || {};
let fetched = 0, cached = 0;
for (const [slug, { ids }] of Object.entries(spec)) {
  const dir = path.join(ROOT, 'content/projects', slug);
  await fs.mkdir(dir, { recursive: true });
  await Promise.all(ids.map(async (id, i) => {
    const out = path.join(dir, `_placeholder_${String(i + 1).padStart(2, '0')}.jpg`);
    try { await fs.access(out); cached++; return; } catch {}
    const url = `https://images.unsplash.com/photo-${id}?w=2400&q=85&fm=jpg`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${slug}: ${url} → HTTP ${res.status}`);
    await fs.writeFile(out, Buffer.from(await res.arrayBuffer()));
    fetched++;
  }));
}
console.log(`placeholders: ${fetched} fetched, ${cached} already present`);
