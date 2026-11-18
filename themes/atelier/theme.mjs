// Theme A — ATELIER
// Inspired by Julia Sarr-Jamois (Agnes's favourite): airy, quiet left nav, masonry overview.
// Agnes chose this direction (2026-11-18), with her changes: sideways-scrolling home, pink cursor + nav hover,
// an edgier all-caps name. Fixes her one complaint about the reference:
// every image links into its project page, which shows all images + full credits.
import { esc, picture, head, page, creditsDl, coverOf, neighbours, rows, fmtDate, pad, variantUrl } from '../_shared/lib.mjs';

export const meta = {
  title: 'Atelier',
  tagline: 'Closest to Julia Sarr-Jamois — your favourite',
  notes: 'Agnes’s choice. Quiet and airy. Scroll the home page sideways (wheel, trackpad, drag, swipe or keys); an Overview of every image; click any image to open its project with all images and full credits.',
};

// ---- Agnes's round-1 picks (2026-11-18). The two knobs she is most likely to change live here. ----
// accent: the pink of the cursor, nav hover and links (A-14). nameFont: the display face for her name (A-15).
// Other candidates are on the preview-only page /atelier/type/, where you can swap one in and copy its entry.
export const NAME_FONTS = {
  syne:      { label: 'Syne ExtraBold',        css: 'family=Syne:wght@800',                   family: 'Syne',                  weight: 800, track: '-.02em' },
  unbounded: { label: 'Unbounded Bold',        css: 'family=Unbounded:wght@700',              family: 'Unbounded',             weight: 700, track: '-.02em' },
  archivo:   { label: 'Archivo Expanded Black', css: 'family=Archivo:wdth,wght@125,900',      family: 'Archivo',               weight: 900, track: '-.01em', stretch: '125%' },
  syncopate: { label: 'Syncopate Bold',        css: 'family=Syncopate:wght@700',              family: 'Syncopate',             weight: 700, track: '.02em' },
  anton:     { label: 'Anton',                 css: 'family=Anton',                           family: 'Anton',                 weight: 400, track: '.01em' },
  shoulders: { label: 'Big Shoulders Display', css: 'family=Big+Shoulders+Display:wght@900',  family: 'Big Shoulders Display', weight: 900, track: '0' },
  michroma:  { label: 'Michroma',              css: 'family=Michroma',                        family: 'Michroma',              weight: 400, track: '0' },
  dela:      { label: 'Dela Gothic One',       css: 'family=Dela+Gothic+One',                 family: 'Dela Gothic One',       weight: 400, track: '0' },
};
export const DESIGN = { accent: '#ff2d87', nameFont: 'syne', nameOutline: false };

const nf = NAME_FONTS[DESIGN.nameFont];
const FONTS = `family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500&${nf.css}`;

/** Pink cursors as SVG data URIs (1x + 2x for retina), so the colour lives only in DESIGN.accent. */
const svgUrl = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const arrow = s => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M4 2.5v17.4l4.7-4.5 3 6.8 3-1.3-3-6.7h6.5z" fill="${DESIGN.accent}" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
const zoom = s => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="${DESIGN.accent}" stroke="#fff" stroke-width="1.2"/><path d="M16 10v12M10 16h12" stroke="#fff" stroke-width="1.6"/></svg>`;
const designVars = (font = nf) => `<style>:root{--accent:${DESIGN.accent};--name-font:'${font.family}';--name-wght:${font.weight};--name-track:${font.track};--name-stretch:${font.stretch || '100%'};
  --cur:image-set(${svgUrl(arrow(24))} 1x,${svgUrl(arrow(48))} 2x) 4 3,auto;
  --cur-zoom:image-set(${svgUrl(zoom(32))} 1x,${svgUrl(zoom(64))} 2x) 16 16,zoom-in}</style>`;

function shell(ctx, { title, description, path, ogImage, body, current, bodyAttrs = '', fonts = FONTS, extra = '' }) {
  const s = ctx.site;
  const nav = [['', 'Home'], ['overview/', 'Overview'], ['about/', 'About']];
  const h = head(ctx, { title, description, path, ogImage, fonts, css: ctx.themeAssets + 'atelier.css', extra: designVars() + extra });
  return page(h, `<a class="skip" href="#main">Skip to content</a>
<header class="hd">
  <a class="hd__name${DESIGN.nameOutline ? ' is-outline' : ''}" href="${ctx.u()}" aria-label="${esc(s.name)} — home"><span>${esc(s.name)}</span></a>
  <p class="hd__role">${esc(s.role)}<span> · ${esc(s.location)}</span></p>
  <nav class="hd__nav" aria-label="Main">${nav.map(([p, l]) => `<a href="${ctx.u(p)}"${current === p ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
</header>
<main id="main" class="main">${body}</main>
<footer class="ft">
  <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>
  ${s.instagram ? `<a href="https://instagram.com/${esc(s.instagram)}" rel="noopener" target="_blank">Instagram</a>` : ''}
  ${ctx.preview && ctx.projects.some(p => p.placeholder) ? '<span class="ft__note">Preview · placeholder images &amp; credits</span>' : ''}
</footer>`, { bodyAttrs: `class="no-js" ${bodyAttrs}`, scripts: [ctx.assetBase + 'shared/core.js', ctx.themeAssets + 'atelier.js'] });
}

// Agnes's part in a job she assisted is stated, never implied (A-20): "Assisting Harry Lambert".
const assisting = p => p.role === 'Styling assistant' && p.leadStylist ? `Assisting ${p.leadStylist}` : '';
const projectLine = p => [p.publication, assisting(p), fmtDate(p.date)].filter(Boolean).join(' · ');
const titleWithPub = p => [p.title, p.publication].filter(Boolean).join(' — ');

function home(ctx) {
  // A horizontal strip of covers (Agnes: "scroll sideways instead of clicking"). Wheel, trackpad, drag, keys, swipe.
  const ps = ctx.projects.filter(p => p.featured);
  const items = ps.map((p, i) => {
    const c = coverOf(p), r = ctx.img(c.src).ratio;
    return `<li class="strip__item" style="--ratio:${r}"><a href="${ctx.u(`work/${p.slug}/`)}" draggable="false">
      ${picture(ctx, c, { sizes: `(max-width: 760px) ${Math.round(60 * r)}svh, ${Math.round(72 * r)}vh`, eager: i < 3, priority: i === 0, alt: `${p.title} — ${c.alt}`, attrs: 'draggable="false"' })}
      <span class="strip__cap"><b>${esc(p.title)}</b><span>${esc(projectLine(p))}</span></span>
    </a></li>`;
  }).join('');
  const body = `<h1 class="sr-only">${esc(ctx.site.name)} — selected work</h1>
<section class="strip" aria-label="Selected work">
  <ul class="strip__track" role="list" tabindex="0" aria-label="Selected work, scroll sideways">${items}
    <li class="strip__item strip__end"><a href="${ctx.u('overview/')}"><span>All work</span><b>Overview →</b></a></li>
  </ul>
  <div class="strip__bar">
    <span class="strip__count">01 / ${pad(ps.length)}</span>
    <span class="strip__progress" aria-hidden="true"><i></i></span>
    <button class="strip__arrow" data-dir="-1" aria-label="Scroll back"><svg viewBox="0 0 18 10" aria-hidden="true"><path d="M5 1 1 5l4 4M1 5h16" fill="none" stroke="currentColor"/></svg></button>
    <button class="strip__arrow" data-dir="1" aria-label="Scroll forward"><svg viewBox="0 0 18 10" aria-hidden="true"><path d="m13 1 4 4-4 4M17 5H1" fill="none" stroke="currentColor"/></svg></button>
  </div>
</section>`;
  return shell(ctx, { title: `${ctx.site.name} — ${ctx.site.role}`, path: '', current: '', ogImage: null, body, bodyAttrs: 'data-page="home"' });
}

function overview(ctx) {
  // every image of every project; each links to that exact image inside its project
  // round-robin across projects (1st image of each, then 2nd of each…) so shoots mix like a moodboard
  const max = Math.max(...ctx.projects.map(p => p.images.length));
  const items = Array.from({ length: max }, (_, i) => ctx.projects.filter(p => p.images[i]).map(p => ({ p, im: p.images[i], i }))).flat();
  const body = `<h1 class="sr-only">Overview</h1>
<ul class="ov" role="list">${items.map(({ p, im, i }) => `<li class="ov__item">
  <a href="${ctx.u(`work/${p.slug}/`)}#${i + 1}">
    ${picture(ctx, im, { sizes: '(max-width: 760px) 46vw, 24vw', alt: `${p.title} — ${im.alt}` })}
    <span class="ov__label"><b>${esc(p.title)}</b> ${esc(p.publication || assisting(p))}</span>
  </a></li>`).join('')}</ul>`;
  return shell(ctx, { title: `Overview — ${ctx.site.name}`, path: 'overview/', current: 'overview/', body, bodyAttrs: 'data-page="overview"' });
}

function project(ctx, p, idx) {
  const { prev, next } = neighbours(ctx.projects, idx);
  let n = 0;
  const grid = rows(ctx, p.images).map(r => `<div class="pj__row pj__row--${r.length}">${r.map(im => {
    const k = n++, m = ctx.img(im.src);
    // never show a small source (e.g. 800px magazine scans) larger than its real size on a single-image row
    const cap = r.length === 1 && m.w < 1600 ? ` style="max-width:${m.w}px;margin-inline:auto"` : '';
    if (m.video) return `<div class="pj__img pj__vid" id="i${k + 1}" data-video="${m.hash}"${cap}>
      <video src="${ctx.imgUrl(m.video.file)}" poster="${variantUrl(ctx, im, 1440)}" width="${m.w}" height="${m.h}" style="--ratio:${m.ratio}" muted loop playsinline autoplay preload="metadata" aria-label="${esc(im.alt)}"></video>
      <button class="pj__sound" type="button" aria-pressed="false">Sound on</button>
    </div>`;
    const full = variantUrl(ctx, im, 2048);
    return `<a class="pj__img" href="${full}" data-lightbox="${p.slug}" data-full="${full}" data-caption="${esc(titleWithPub(p))}" id="i${k + 1}"${k === 0 ? ' data-hero' : ''}${cap}>
      ${picture(ctx, im, { sizes: r.length === 2 ? '(max-width: 760px) 92vw, 34vw' : '(max-width: 760px) 92vw, 68vw', eager: k < 2, priority: k === 0 })}
    </a>`;
  }).join('')}</div>`).join('');
  const body = `<article class="pj">
  <header class="pj__hd">
    <h1 class="pj__title">${esc(p.title)}</h1>
    <p class="pj__meta">${[p.publication, assisting(p), fmtDate(p.date), p.category].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}</p>
    ${p.summary ? `<p class="pj__summary">${esc(p.summary)}</p>` : ''}
    ${creditsDl(p, 'credits pj__credits')}
  </header>
  <div class="pj__imgs">${grid}</div>
  <nav class="pj__next" aria-label="More projects">
    <a href="${ctx.u(`work/${prev.slug}/`)}" class="pj__nb"><span>Previous</span><b>${esc(prev.title)}</b></a>
    <a href="${ctx.u('overview/')}" class="pj__nb pj__nb--mid"><span>All work</span></a>
    <a href="${ctx.u(`work/${next.slug}/`)}" class="pj__nb pj__nb--next"><span>Next</span><b>${esc(next.title)}</b></a>
  </nav>
</article>`;
  return shell(ctx, {
    title: `${titleWithPub(p)} · ${ctx.site.name}`,
    description: [`${titleWithPub(p)}, ${fmtDate(p.date)}.`, p.credits.map(c => `${c.role}: ${c.name}`).join('. ') + '.', p.summary].filter(Boolean).join(' '),
    path: `work/${p.slug}/`, ogImage: '/img/' + ctx.img(coverOf(p).src).og, current: 'overview/', body, bodyAttrs: 'data-page="project" data-deeplink="scroll"',
  });
}

function about(ctx) {
  // Editorial CV layout: one row per section (small label | content). Publications and clients run on as
  // flowing text separated by slashes, the way stylists' CVs list them, instead of tall single-name columns.
  const s = ctx.site;
  const item = x => typeof x === 'string' ? esc(x) : `${esc(x.name)}${x.note ? ` <small>${esc(x.note)}</small>` : ''}`;
  const row = (t, inner) => `<section class="ab__row"><h2>${t}</h2>${inner}</section>`;
  const flow = (t, xs) => xs?.length ? row(t, `<ul class="ab__flow" role="list">${xs.map(x => `<li>${item(x)}</li>`).join('')}</ul>`) : '';
  const stack = (t, xs) => xs?.length ? row(t, `<ul class="ab__stack" role="list">${xs.map(x => `<li>${item(x)}</li>`).join('')}</ul>`) : '';
  const contact = [
    `<li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>`,
    s.instagram ? `<li><a href="https://instagram.com/${esc(s.instagram)}" rel="noopener" target="_blank">@${esc(s.instagram)}</a></li>` : '',
    s.agent ? `<li>Represented by ${esc(s.agent.name)} — <a href="mailto:${esc(s.agent.email)}">${esc(s.agent.email)}</a></li>` : '',
    `<li>${esc(s.location)}</li>`,
  ].join('');
  const body = `<article class="ab">
  <h1 class="sr-only">About</h1>
  <p class="ab__bio">${esc(s.bio)}</p>
  <div class="ab__rows">
    ${row('Contact', `<ul class="ab__contact" role="list">${contact}</ul>`)}
    ${flow('Selected publications', s.publications)}
    ${flow('Selected clients', s.clients)}
    ${stack('Experience', s.experience)}
    ${stack('Education', s.education)}
  </div>
</article>`;
  return shell(ctx, { title: `About — ${s.name}`, path: 'about/', current: 'about/', body, bodyAttrs: 'data-page="about"' });
}

/** GitHub Pages serves /404.html for any unknown URL (old preview links, typos). Absolute URLs, so it works at any depth. */
function notFound(ctx) {
  const body = `<article class="nf"><h1 class="nf__h">Page not found</h1>
  <p class="nf__p">This page has moved or no longer exists. <a href="${ctx.u()}">See the work</a> or the <a href="${ctx.u('overview/')}">overview</a>.</p></article>`;
  return shell(ctx, { title: `Not found — ${ctx.site.name}`, path: '404.html', current: '', body, bodyAttrs: 'data-page="404"', extra: '<meta name="robots" content="noindex">' });
}

/** Preview-only: every name-font candidate, so Agnes can compare them on her own screen. */
function typePage(ctx) {
  const fonts = Object.values(NAME_FONTS).map(f => f.css).join('&');
  const rows = Object.entries(NAME_FONTS).map(([k, f]) => `<li class="tp__row${k === DESIGN.nameFont ? ' is-current' : ''}">
    <span class="tp__label">${esc(f.label)}${k === DESIGN.nameFont ? ' — in use' : ''} <code>${k}</code></span>
    <span class="tp__name" style="font-family:'${f.family}';font-weight:${f.weight};letter-spacing:${f.track};font-stretch:${f.stretch || '100%'}">${esc(ctx.site.name)}</span></li>`).join('');
  const body = `<article class="tp"><h1 class="tp__h">Name typeface — pick one</h1>
  <p class="tp__p">All caps. Hover a row to see it in pink. <label><input type="checkbox" id="tp-outline"> Outline</label></p>
  <ul class="tp__list" role="list">${rows}</ul>
  <script>document.getElementById('tp-outline').onchange=e=>document.querySelector('.tp').classList.toggle('is-outline',e.target.checked)</script></article>`;
  return shell(ctx, { title: `Typeface — ${ctx.site.name}`, path: 'type/', current: '', body, bodyAttrs: 'data-page="type"', fonts: `${FONTS}&${fonts}`, extra: '<meta name="robots" content="noindex">' });
}

export function render(ctx) {
  return [
    { path: 'type/index.html', html: typePage(ctx) },
    { path: '404.html', html: notFound(ctx) },   // unlinked + noindex; remove once Agnes has picked her font (A-15)
    { path: 'index.html', html: home(ctx) },
    { path: 'overview/index.html', html: overview(ctx) },
    { path: 'about/index.html', html: about(ctx) },
    ...ctx.projects.map((p, i) => ({ path: `work/${p.slug}/index.html`, html: project(ctx, p, i) })),
  ];
}
