// Theme A — ATELIER
// Inspired by Julia Sarr-Jamois (Agnes's favourite): airy, outlined display name, quiet left nav,
// one image at a time on the home page, masonry overview. Fixes her one complaint:
// every image links into its project page, which shows all images + full credits.
import { esc, picture, head, page, creditsDl, coverOf, neighbours, rows, fmtDate, pad, variantUrl } from '../_shared/lib.mjs';

export const meta = {
  title: 'Atelier',
  tagline: 'Closest to Julia Sarr-Jamois — your favourite',
  notes: 'Quiet and airy. One image at a time on the home page with arrows, swipe and keys; an Overview of every image; click any image to open its project with all images and full credits.',
};

const FONTS = 'family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500';

function shell(ctx, { title, description, path, ogImage, body, current, bodyAttrs = '' }) {
  const s = ctx.site;
  const nav = [['', 'Home'], ['overview/', 'Overview'], ['about/', 'About']];
  const h = head(ctx, { title, description, path, ogImage, fonts: FONTS, css: ctx.themeAssets + 'atelier.css' });
  return page(h, `<a class="skip" href="#main">Skip to content</a>
<header class="hd">
  <a class="hd__name" href="${ctx.u()}" aria-label="${esc(s.name)} — home"><span>${esc(s.name)}</span></a>
  <p class="hd__role">${esc(s.role)}<span> · ${esc(s.location)}</span></p>
  <nav class="hd__nav" aria-label="Main">${nav.map(([p, l]) => `<a href="${ctx.u(p)}"${current === p ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
</header>
<main id="main" class="main">${body}</main>
<footer class="ft">
  <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>
  ${s.instagram ? `<a href="https://instagram.com/${esc(s.instagram)}" rel="noopener" target="_blank">Instagram</a>` : ''}
  ${ctx.preview ? '<span class="ft__note">Preview · placeholder images &amp; credits</span>' : ''}
</footer>`, { bodyAttrs: `class="no-js" ${bodyAttrs}`, scripts: [ctx.assetBase + 'shared/core.js', ctx.themeAssets + 'atelier.js'] });
}

const projectLine = p => [p.publication, fmtDate(p.date)].filter(Boolean).join(', ');

function home(ctx) {
  const ps = ctx.projects.filter(p => p.featured);
  const slides = ps.map((p, i) => {
    const c = coverOf(p);
    return `<a class="show__slide${i === 0 ? ' is-active' : ''}" href="${ctx.u(`work/${p.slug}/`)}" data-title="${esc(p.title)}" data-line="${esc(projectLine(p))}" ${i ? 'aria-hidden="true" tabindex="-1"' : ''}>
      ${picture(ctx, c, { sizes: '(max-width: 760px) 92vw, 46vw', eager: i < 2, priority: i === 0, alt: `${p.title} — ${c.alt}`})}
    </a>`;
  }).join('');
  const body = `<section class="show" aria-roledescription="carousel" aria-label="Selected work">
  <div class="show__stage">${slides}</div>
  <button class="show__arrow show__arrow--prev" aria-label="Previous project"><svg viewBox="0 0 10 18" aria-hidden="true"><path d="M9 1 1 9l8 8" fill="none" stroke="currentColor"/></svg></button>
  <button class="show__arrow show__arrow--next" aria-label="Next project"><svg viewBox="0 0 10 18" aria-hidden="true"><path d="m1 1 8 8-8 8" fill="none" stroke="currentColor"/></svg></button>
  <p class="show__cap" aria-live="polite"><a class="show__title" href="${ctx.u(`work/${ps[0].slug}/`)}">${esc(ps[0].title)}</a> <span class="show__line">${esc(projectLine(ps[0]))}</span> <span class="show__count">01 / ${pad(ps.length)}</span></p>
  <div class="show__progress" aria-hidden="true"><i></i></div>
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
    <span class="ov__label"><b>${esc(p.title)}</b> ${esc(p.publication)}</span>
  </a></li>`).join('')}</ul>`;
  return shell(ctx, { title: `Overview — ${ctx.site.name}`, path: 'overview/', current: 'overview/', body, bodyAttrs: 'data-page="overview"' });
}

function project(ctx, p, idx) {
  const { prev, next } = neighbours(ctx.projects, idx);
  let n = 0;
  const grid = rows(ctx, p.images).map(r => `<div class="pj__row pj__row--${r.length}">${r.map(im => {
    const k = n++;
    const full = variantUrl(ctx, im, 2048);
    return `<a class="pj__img" href="${full}" data-lightbox="${p.slug}" data-full="${full}" data-caption="${esc(p.title)} — ${esc(p.publication)}" id="i${k + 1}"${k === 0 ? ' data-hero' : ''}>
      ${picture(ctx, im, { sizes: r.length === 2 ? '(max-width: 760px) 92vw, 34vw' : '(max-width: 760px) 92vw, 68vw', eager: k < 2, priority: k === 0 })}
    </a>`;
  }).join('')}</div>`).join('');
  const body = `<article class="pj">
  <header class="pj__hd">
    <h1 class="pj__title">${esc(p.title)}</h1>
    <p class="pj__meta"><span>${esc(p.publication)}</span><span>${fmtDate(p.date)}</span><span>${esc(p.category)}</span></p>
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
    title: `${p.title} — ${p.publication} · Styled by ${ctx.site.name}`, description: `${p.title} for ${p.publication} (${fmtDate(p.date)}). ${p.summary}`,
    path: `work/${p.slug}/`, ogImage: '/img/' + ctx.img(coverOf(p).src).og, current: 'overview/', body, bodyAttrs: 'data-page="project" data-deeplink="scroll"',
  });
}

function about(ctx) {
  const s = ctx.site;
  const list = (t, xs) => xs?.length ? `<section><h2>${t}</h2><ul role="list">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '';
  const body = `<article class="ab">
  <h1 class="sr-only">About</h1>
  <p class="ab__bio">${esc(s.bio)}</p>
  <div class="ab__cols">
    <section><h2>Contact</h2><ul role="list">
      <li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>
      ${s.instagram ? `<li><a href="https://instagram.com/${esc(s.instagram)}" rel="noopener" target="_blank">@${esc(s.instagram)}</a></li>` : ''}
      ${s.agent ? `<li>Represented by ${esc(s.agent.name)} — <a href="mailto:${esc(s.agent.email)}">${esc(s.agent.email)}</a></li>` : ''}
      <li>${esc(s.location)}</li></ul></section>
    ${list('Clients &amp; publications', s.clients)}
    ${list('Experience', s.experience)}
    ${list('Education', s.education)}
  </div>
</article>`;
  return shell(ctx, { title: `About — ${s.name}`, path: 'about/', current: 'about/', body, bodyAttrs: 'data-page="about"' });
}

export function render(ctx) {
  return [
    { path: 'index.html', html: home(ctx) },
    { path: 'overview/index.html', html: overview(ctx) },
    { path: 'about/index.html', html: about(ctx) },
    ...ctx.projects.map((p, i) => ({ path: `work/${p.slug}/index.html`, html: project(ctx, p, i) })),
  ];
}
