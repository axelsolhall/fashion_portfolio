// Shared render helpers used by every theme. Pure functions: data in → HTML string out.
export const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fmtDate = (d, style = 'long') => {
  const [y, m] = String(d).split('-');
  if (!m) return y;
  return style === 'short' ? `${MONTHS[+m - 1].slice(0, 3)} ${y}` : `${MONTHS[+m - 1]} ${y}`;
};
export const pad = n => String(n).padStart(2, '0');

/** Build a theme context: url helpers + image lookup bound to this mount. */
export function makeCtx({ content, images, base, mount, assetBase }) {
  const root = base + mount;                         // e.g. /fashion_portfolio/atelier/
  const u = (p = '') => root + p.replace(/^\//, '');
  const img = src => {
    const m = images.images[src];
    if (!m) throw new Error(`no processed image for ${src} — run npm run images`);
    return m;
  };
  const imgUrl = f => assetBase + 'img/' + f;
  return { ...content, base, root, u, img, imgUrl, assetBase };
}

/**
 * <picture> with AVIF + WebP srcsets, intrinsic size, dominant colour + blurred LQIP behind it.
 * opts: sizes, alt, cls, eager, priority, vt (view-transition-name), attrs (extra on <img>)
 */
export function picture(ctx, image, opts = {}) {
  const m = ctx.img(image.src);
  const set = list => list.map(v => `${ctx.imgUrl(v.file)} ${v.w}w`).join(', ');
  const fallback = m.variants.webp.find(v => v.w >= 960) || m.variants.webp.at(-1);
  const sizes = opts.sizes || '100vw';
  const style = [`--ratio:${m.ratio}`, `--c:${m.color}`, `--lqip:url(${m.lqip})`, opts.vt ? `view-transition-name:${opts.vt}` : ''].filter(Boolean).join(';');
  return `<picture class="pic ${opts.cls || ''}" style="${style}"${m.dark ? ' data-dark' : ''}>`
    + `<source type="image/avif" srcset="${set(m.variants.avif)}" sizes="${sizes}">`
    + `<source type="image/webp" srcset="${set(m.variants.webp)}" sizes="${sizes}">`
    + `<img src="${ctx.imgUrl(fallback.file)}" width="${m.w}" height="${m.h}" alt="${esc(opts.alt ?? image.alt)}"`
    + ` loading="${opts.eager ? 'eager' : 'lazy'}" decoding="async"${opts.priority ? ' fetchpriority="high"' : ''}${opts.attrs ? ' ' + opts.attrs : ''}>`
    + `</picture>`;
}

/** Smallest variant ≥ w (for JS preloading / flipbooks). */
export const variantUrl = (ctx, image, w = 960, fmt = 'webp') => {
  const m = ctx.img(image.src);
  return ctx.imgUrl((m.variants[fmt].find(v => v.w >= w) || m.variants[fmt].at(-1)).file);
};

export const coverOf = p => p.images.find(i => i.file === p.cover) || p.images[0];

/** <head> contents: meta, OG/Twitter, JSON-LD, fonts, css. */
export function head(ctx, { title, description, path = '', ogImage, fonts, css, extra = '' }) {
  const s = ctx.site;
  const og = ogImage ? (s.url.replace(/\/$/, '') + ogImage) : '';
  const ld = {
    '@context': 'https://schema.org', '@type': 'Person', name: s.name, jobTitle: s.role, email: s.email,
    url: s.url, sameAs: s.instagram ? [`https://instagram.com/${s.instagram}`] : [],
  };
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description || s.bio.slice(0, 155))}">
${ctx.preview ? '<meta name="robots" content="noindex, nofollow">' : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description || s.role)}">
${og ? `<meta property="og:image" content="${og}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="canonical" href="${esc(s.url.replace(/\/$/, '') + '/' + path)}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%23111'/><text x='16' y='22' font-family='Georgia,serif' font-size='17' fill='%23fff' text-anchor='middle'>AS</text></svg>`).replace(/%2523/g, '%23')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts}&display=swap">
<link rel="stylesheet" href="${ctx.assetBase}shared/base.css">
<link rel="stylesheet" href="${css}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${extra}`;
}

export const page = (headHtml, body, { bodyAttrs = '', scripts = [] } = {}) =>
  `<!doctype html>\n<html lang="en">\n<head>\n${headHtml}\n</head>\n<body ${bodyAttrs}>\n${body}\n${scripts.map(s => `<script src="${s}" defer></script>`).join('\n')}\n</body>\n</html>\n`;

/** Project credits as <dl>. Styling credit first is Agnes's — highlight optionally. */
export const creditsDl = (p, cls = 'credits') =>
  `<dl class="${cls}">${p.credits.map(c => `<div><dt>${esc(c.role)}</dt><dd>${esc(c.name)}</dd></div>`).join('')}</dl>`;

/** Prev/next neighbours (wraps around). */
export const neighbours = (projects, i) => ({ prev: projects[(i - 1 + projects.length) % projects.length], next: projects[(i + 1) % projects.length] });

/** Group a project's images into rows for editorial layouts: landscape alone, portraits in pairs. */
export function rows(ctx, images) {
  const out = []; let pair = [];
  for (const im of images) {
    if (ctx.img(im.src).orientation === 'landscape') { if (pair.length) out.push(pair), pair = []; out.push([im]); }
    else { pair.push(im); if (pair.length === 2) out.push(pair), pair = []; }
  }
  if (pair.length) out.push(pair);
  return out;
}
