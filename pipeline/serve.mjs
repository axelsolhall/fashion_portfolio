// Tiny static server for dist/ that mimics GitHub Pages (pretty URLs, base path). Usage: SITE_BASE=/x/ npm run dev
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const DIST = path.resolve(import.meta.dirname, '../dist');
const BASE = (process.env.SITE_BASE || '/').replace(/\/?$/, '/');
const PORT = +process.env.PORT || 4321;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!p.startsWith(BASE)) { res.writeHead(302, { location: BASE }); return res.end(); }
  p = path.join(DIST, p.slice(BASE.length));
  if (!p.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  try {
    if ((await fs.stat(p)).isDirectory()) {
      if (!req.url.split('?')[0].endsWith('/')) { res.writeHead(301, { location: req.url.split('?')[0] + '/' }); return res.end(); }
      p = path.join(p, 'index.html');
    }
    const body = await fs.readFile(p);
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); }
}).listen(PORT, () => console.log(`serving dist/ at http://localhost:${PORT}${BASE}`));
