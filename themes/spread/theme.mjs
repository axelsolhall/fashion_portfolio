// Theme C — SPREAD
// Inspired by Harley Weir @ Art Partner (two-up magazine spreads, dots at the edges, grid toggle)
// and Harry Lambert @ Bryant Artists (one story at a time, "4 / 37" counter, credits as text).
import { esc, picture, head, page, coverOf, neighbours, fmtDate, pad, variantUrl } from '../_shared/lib.mjs';

export const meta = {
  title: 'Spread',
  tagline: 'Harley Weir’s spreads + Harry Lambert’s counter',
  notes: 'Work is shown as two-page magazine spreads, one at a time, with the credits on screen. Click the sides or use arrows/swipe to page through; switch to the grid icon to see every image at once.',
};

const FONTS = 'family=Archivo:wdth,wght@62..125,300..600';

/** Pair a project's images into spreads: portraits two-up, landscapes alone. Spreads never cross projects. */
function spreadsOf(ctx, p) {
  const out = []; let cur = [];
  p.images.forEach((im, i) => {
    const item = { im, i };
    if (ctx.img(im.src).orientation === 'landscape') { if (cur.length) out.push(cur); out.push([item]); cur = []; }
    else { cur.push(item); if (cur.length === 2) { out.push(cur); cur = []; } }
  });
  if (cur.length) out.push(cur);
  return out.map(items => ({ p, items }));
}

const creditLine = p => p.credits.filter(c => !/^styl/i.test(c.role)).slice(0, 2).map(c => `${c.role} ${c.name}`).join(' · ');

function shell(ctx, { title, description, path, ogImage, body, current, bodyAttrs = '' }) {
  const s = ctx.site;
  const h = head(ctx, { title, description, path, ogImage, fonts: FONTS, css: ctx.themeAssets + 'spread.css' });
  const nav = [['', 'Work'], ['index/', 'Index'], ['about/', 'About']];
  return page(h, `<a class="skip" href="#main">Skip to content</a>
<header class="hd">
  <p class="hd__role">${esc(s.role)}</p>
  <a class="hd__name" href="${ctx.u()}">${esc(s.name)}</a>
  <nav class="hd__nav" aria-label="Main">${nav.map(([p, l]) => `<a href="${ctx.u(p)}"${current === p ? ' aria-current="page"' : ''}>${l}</a>`).join('')}${s.instagram ? `<a href="https://instagram.com/${esc(s.instagram)}" rel="noopener" target="_blank" aria-label="Instagram"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor"/></svg></a>` : ''}</nav>
  <a class="hd__toggle" href="${ctx.u(current === 'index/' ? '' : 'index/')}" aria-label="${current === 'index/' ? 'Show spreads' : 'Show all images as a grid'}">${current === 'index/'
    ? '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="3" width="6.3" height="10" fill="currentColor"/><rect x="8.7" y="3" width="6.3" height="10" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1" width="6" height="6" fill="currentColor"/><rect x="9" y="1" width="6" height="6" fill="currentColor"/><rect x="1" y="9" width="6" height="6" fill="currentColor"/><rect x="9" y="9" width="6" height="6" fill="currentColor"/></svg>'}</a>
</header>
<main id="main">${body}</main>
${ctx.preview ? '<p class="note">Preview · placeholder images &amp; credits</p>' : ''}`, { bodyAttrs: `class="no-js" ${bodyAttrs}`, scripts: [ctx.assetBase + 'shared/core.js', ctx.themeAssets + 'spread.js'] });
}

/** The viewer. mode "home": image click → project. mode "project": image click → lightbox. */
function viewer(ctx, spreads, mode) {
  const figs = spreads.map(({ p, items }, k) => `<figure class="sp${k === 0 ? ' is-active' : ''}" data-k="${k}" data-first="${items[0].i + 1}" data-slug="${p.slug}"
    data-title="${esc(p.title)}" data-sub="${esc([p.publication, fmtDate(p.date, 'short')].filter(Boolean).join(' — '))}" data-credit="${esc(creditLine(p))}" data-href="${ctx.u(`work/${p.slug}/`)}" ${k ? 'aria-hidden="true"' : ''}>
    ${items.map(({ im, i }) => {
      const r = ctx.img(im.src).ratio;
      const full = variantUrl(ctx, im, 2048);
      const sizes = `(max-width: 760px) 92vw, ${Math.round((items.length === 2 ? 40 : 70) * Math.min(1, r))}vw`;
      return mode === 'home'
        ? `<a class="sp__img" href="${ctx.u(`work/${p.slug}/`)}#${i + 1}" style="--ratio:${r}"${k ? ' tabindex="-1"' : ''}>${picture(ctx, im, { sizes, eager: k < 2, priority: k === 0, alt: `${p.title} — ${im.alt}` })}</a>`
        : `<a class="sp__img" href="${full}" data-lightbox="${p.slug}" data-full="${full}" data-caption="${esc(p.title)} — ${esc(p.publication)}" style="--ratio:${r}"${k ? ' tabindex="-1"' : ''}${i === 0 ? ' data-hero' : ''}>${picture(ctx, im, { sizes, eager: k < 2, priority: k === 0 })}</a>`;
    }).join('')}
  </figure>`).join('');
  const s0 = spreads[0].p;
  const total = spreads.reduce((n, s) => n + s.items.length, 0);
  return `<section class="viewer" data-mode="${mode}" aria-roledescription="carousel" aria-label="Spreads">
  <div class="viewer__stage">${figs}
    <button class="viewer__side viewer__side--prev" aria-label="Previous spread"><i></i></button>
    <button class="viewer__side viewer__side--next" aria-label="Next spread"><i></i></button>
    <span class="viewer__cursor" aria-hidden="true"></span>
  </div>
  <div class="viewer__cap" aria-live="polite">
    <p class="cap__l">${mode === 'home' ? `<a class="cap__title" href="${ctx.u(`work/${s0.slug}/`)}">${esc(s0.title)}</a>` : `<span class="cap__title">${esc(s0.title)}</span>`}<span class="cap__sub">${esc([s0.publication, fmtDate(s0.date, 'short')].filter(Boolean).join(' — '))}</span></p>
    <p class="cap__c"><span class="cap__count">${pad(1)}–${pad(spreads[0].items.length)} / ${pad(total)}</span></p>
    <p class="cap__r">${mode === 'home' ? `<a class="cap__go" href="${ctx.u(`work/${s0.slug}/`)}">View story <span aria-hidden="true">→</span></a>` : `<span class="cap__credit">${esc(creditLine(s0))}</span>`}</p>
  </div>
</section>`;
}

function home(ctx) {
  const spreads = ctx.projects.flatMap(p => spreadsOf(ctx, p));
  return shell(ctx, { title: `${ctx.site.name} — ${ctx.site.role}`, path: '', current: '', body: `<h1 class="sr-only">${esc(ctx.site.name)} — work</h1>${viewer(ctx, spreads, 'home')}`, bodyAttrs: 'data-page="home"' });
}

function index(ctx) {
  const rows = ctx.projects.map(p => `<section class="ix__row">
  <a class="ix__head" href="${ctx.u(`work/${p.slug}/`)}"><b>${esc(p.title)}</b><span>${esc(p.publication)}</span><span>${fmtDate(p.date, 'short')}</span></a>
  <ul class="ix__thumbs" role="list">${p.images.map((im, i) => `<li style="--ratio:${ctx.img(im.src).ratio}"><a href="${ctx.u(`work/${p.slug}/`)}#${i + 1}">${picture(ctx, im, { sizes: '200px', alt: `${p.title} — ${im.alt}` })}</a></li>`).join('')}</ul>
</section>`).join('');
  return shell(ctx, { title: `Index — ${ctx.site.name}`, path: 'index/', current: 'index/', body: `<h1 class="sr-only">Index of all work</h1><div class="ix">${rows}</div>`, bodyAttrs: 'data-page="index"' });
}

function project(ctx, p, idx) {
  const { prev, next } = neighbours(ctx.projects, idx);
  const body = `<article class="pj">
  ${viewer(ctx, spreadsOf(ctx, p), 'project')}
  <div class="pj__info">
    <h1 class="pj__title">${esc(p.title)}</h1>
    <p class="pj__meta">${esc(p.publication)}<br>${fmtDate(p.date)}<br>${esc(p.category)}</p>
    ${p.summary ? `<p class="pj__summary">${esc(p.summary)}</p>` : ''}
    <dl class="pj__credits">${p.credits.map(c => `<div><dt>${esc(c.role)}</dt><dd>${esc(c.name)}</dd></div>`).join('')}</dl>
  </div>
  <nav class="pj__nav" aria-label="More stories">
    <a href="${ctx.u(`work/${prev.slug}/`)}"><span>Previous story</span>${esc(prev.title)}</a>
    <a href="${ctx.u(`work/${next.slug}/`)}"><span>Next story</span>${esc(next.title)}</a>
  </nav>
</article>`;
  return shell(ctx, {
    title: `${p.title} — ${p.publication} · ${ctx.site.name}`, description: `${p.title} for ${p.publication} (${fmtDate(p.date)}). Styling: ${ctx.site.name}. ${p.summary}`,
    path: `work/${p.slug}/`, ogImage: '/img/' + ctx.img(coverOf(p).src).og, current: '', body, bodyAttrs: 'data-page="project" data-deeplink="none"',
  });
}

function about(ctx) {
  const s = ctx.site;
  const list = (t, xs) => xs?.length ? `<section><h2>${t}</h2><ul role="list">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '';
  const body = `<article class="ab">
  <h1 class="sr-only">About</h1>
  <p class="ab__bio">${esc(s.bio)}</p>
  <div class="ab__cols">
    <section><h2>Contact</h2><ul role="list"><li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>${s.instagram ? `<li><a href="https://instagram.com/${esc(s.instagram)}" rel="noopener" target="_blank">@${esc(s.instagram)}</a></li>` : ''}${s.agent ? `<li>${esc(s.agent.name)}</li>` : ''}<li>${esc(s.location)}</li></ul></section>
    ${list('Clients', s.clients)}${list('Experience', s.experience)}${list('Education', s.education)}
  </div>
</article>`;
  return shell(ctx, { title: `About — ${s.name}`, path: 'about/', current: 'about/', body, bodyAttrs: 'data-page="about"' });
}

export function render(ctx) {
  return [
    { path: 'index.html', html: home(ctx) },
    { path: 'index/index.html', html: index(ctx) },
    { path: 'about/index.html', html: about(ctx) },
    ...ctx.projects.map((p, i) => ({ path: `work/${p.slug}/index.html`, html: project(ctx, p, i) })),
  ];
}
