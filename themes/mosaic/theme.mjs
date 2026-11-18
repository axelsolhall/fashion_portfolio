// Theme B — MOSAIC
// Inspired by Isabela Orozco: edge-to-edge cover grid with a giant high-contrast name laid over it.
// Additions: hover "flipbook" through each shoot, category filter, horizontal-scroll project pages
// with credits on the first panel.
import { esc, picture, head, page, creditsDl, coverOf, neighbours, fmtDate, pad, variantUrl } from '../_shared/lib.mjs';

export const meta = {
  title: 'Mosaic',
  tagline: 'Isabela Orozco’s grid, made bolder',
  notes: 'Your covers edge to edge under a big name. Hover a cover to flip through the whole shoot, filter by type of work, and open a project into a sideways-scrolling story with the credits first.',
};

const FONTS = 'family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..600;1,6..96,400&family=Inter:wght@400;500';

function shell(ctx, { title, description, path, ogImage, body, current, bodyAttrs = '' }) {
  const s = ctx.site;
  const h = head(ctx, { title, description, path, ogImage, fonts: FONTS, css: ctx.themeAssets + 'mosaic.css' });
  const nav = [['', 'Work'], ['about/', 'About']];
  return page(h, `<a class="skip" href="#main">Skip to content</a>
<header class="hd">
  <nav class="hd__nav" aria-label="Main">${nav.map(([p, l]) => `<a href="${ctx.u(p)}"${current === p ? ' aria-current="page"' : ''}>${l}</a>`).join('')}<a href="mailto:${esc(s.email)}">Contact</a></nav>
  <a class="hd__name" href="${ctx.u()}"><span>${esc(s.name)}</span></a>
  <p class="hd__role">${esc(s.role)}</p>
</header>
${bodyAttrs.includes('home') ? `<p class="mega" aria-hidden="true">${esc(s.name)}</p>` : ''}
<main id="main">${body}</main>
<footer class="ft">
  <span>© ${new Date().getFullYear()} ${esc(s.name)}</span>
  <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>
  ${s.instagram ? `<a href="https://instagram.com/${esc(s.instagram)}" rel="noopener" target="_blank">Instagram</a>` : ''}
  ${ctx.preview ? '<span class="ft__note">Preview · placeholder images &amp; credits</span>' : ''}
</footer>`, { bodyAttrs: `class="no-js" ${bodyAttrs}`, scripts: [ctx.assetBase + 'shared/core.js', ctx.themeAssets + 'mosaic.js'] });
}

function home(ctx) {
  const cats = [...new Set(ctx.projects.map(p => p.category))];
  const count = c => ctx.projects.filter(p => p.category === c).length;
  const tiles = ctx.projects.map((p, i) => {
    const c = coverOf(p);
    const flip = p.images.map(im => variantUrl(ctx, im, 480)).join(' ');
    return `<li class="tile" data-cat="${esc(p.category)}" style="view-transition-name:t-${p.slug}">
  <a href="${ctx.u(`work/${p.slug}/`)}" data-flip="${flip}">
    ${picture(ctx, c, { sizes: '(max-width: 640px) 50vw, (max-width: 1100px) 50vw, 34vw', eager: i < 6, priority: i < 3, alt: `${p.title} — ${c.alt}` })}
    <span class="tile__over" aria-hidden="true"><b>${esc(p.title)}</b><span>${esc(p.publication)} · ${p.year}</span><i class="tile__n">${pad(p.images.length)} images</i></span>
    <span class="tile__cap"><b>${esc(p.title)}</b> ${esc(p.publication)}</span>
  </a></li>`;
  }).join('');
  const body = `<h1 class="sr-only">${esc(ctx.site.name)} — selected work</h1>
<div class="filters" role="group" aria-label="Filter by type">
  <button aria-pressed="true" data-f="*">All <sup>${ctx.projects.length}</sup></button>
  ${cats.map(c => `<button aria-pressed="false" data-f="${esc(c)}">${esc(c)} <sup>${count(c)}</sup></button>`).join('')}
</div>
<ul class="grid" role="list">${tiles}</ul>`;
  return shell(ctx, { title: `${ctx.site.name} — ${ctx.site.role}`, path: '', current: '', body, bodyAttrs: 'data-page="home"' });
}

function project(ctx, p, idx) {
  const { next } = neighbours(ctx.projects, idx);
  const imgs = p.images.map((im, k) => {
    const full = variantUrl(ctx, im, 2048);
    return `<a class="strip__img" href="${full}" data-lightbox="${p.slug}" data-full="${full}" data-caption="${esc(p.title)} · ${esc(p.publication)}" style="--ratio:${ctx.img(im.src).ratio}"${k === 0 ? ' data-hero' : ''}>
      ${picture(ctx, im, { sizes: `(max-width: 760px) 100vw, ${Math.round(ctx.img(im.src).ratio * 82)}vh`, eager: k < 3, priority: k === 0 })}
      <span class="strip__n">${pad(k + 1)}</span></a>`;
  }).join('');
  const nc = coverOf(next);
  const body = `<article class="pj">
  <div class="strip" tabindex="0" aria-label="${esc(p.title)} — images, scroll sideways">
    <header class="strip__info">
      <p class="pj__kicker">${esc(p.category)} · ${fmtDate(p.date)}</p>
      <h1 class="pj__title">${esc(p.title)}</h1>
      <p class="pj__pub">${esc(p.publication)}</p>
      ${p.summary ? `<p class="pj__summary">${esc(p.summary)}</p>` : ''}
      ${creditsDl(p, 'credits')}
      <p class="pj__hint" aria-hidden="true"><span>Scroll</span> <svg viewBox="0 0 40 10"><path d="M0 5h38M34 1l4 4-4 4" fill="none" stroke="currentColor"/></svg></p>
    </header>
    ${imgs}
    <a class="strip__next" href="${ctx.u(`work/${next.slug}/`)}">
      ${picture(ctx, nc, { sizes: '40vh', alt: '' })}
      <span><i>Next</i><b>${esc(next.title)}</b></span>
    </a>
  </div>
  <div class="strip__bar" aria-hidden="true"><span class="strip__count">01 / ${pad(p.images.length)}</span><span class="strip__track"><i></i></span><a href="${ctx.u()}">All work</a></div>
</article>`;
  return shell(ctx, {
    title: `${p.title} — ${p.publication} · ${ctx.site.name}`, description: `${p.title} for ${p.publication} (${fmtDate(p.date)}). Styling: ${ctx.site.name}. ${p.summary}`,
    path: `work/${p.slug}/`, ogImage: '/img/' + ctx.img(coverOf(p).src).og, current: '', body, bodyAttrs: 'data-page="project"',
  });
}

function about(ctx) {
  const s = ctx.site;
  const list = (t, xs) => xs?.length ? `<section><h2>${t}</h2><ul role="list">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '';
  const strip = ctx.projects.slice(0, 6).map(p => picture(ctx, coverOf(p), { sizes: '17vw', alt: '' })).join('');
  const body = `<article class="ab">
  <h1 class="ab__bio">${esc(s.bio)}</h1>
  <div class="ab__cols">
    <section><h2>Contact</h2><ul role="list">
      <li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>
      ${s.instagram ? `<li><a href="https://instagram.com/${esc(s.instagram)}" rel="noopener" target="_blank">@${esc(s.instagram)}</a></li>` : ''}
      ${s.agent ? `<li>${esc(s.agent.name)} — <a href="mailto:${esc(s.agent.email)}">${esc(s.agent.email)}</a></li>` : ''}
      <li>${esc(s.location)}</li></ul></section>
    ${list('Publications', s.publications)}${list('Clients', s.clients)}${list('Experience', s.experience)}${list('Education', s.education)}
  </div>
  <div class="ab__strip" aria-hidden="true">${strip}</div>
</article>`;
  return shell(ctx, { title: `About — ${s.name}`, path: 'about/', current: 'about/', body, bodyAttrs: 'data-page="about"' });
}

export function render(ctx) {
  return [
    { path: 'index.html', html: home(ctx) },
    { path: 'about/index.html', html: about(ctx) },
    ...ctx.projects.map((p, i) => ({ path: `work/${p.slug}/index.html`, html: project(ctx, p, i) })),
  ];
}
