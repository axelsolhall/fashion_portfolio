// Preview-only landing page: lets Agnes compare the three directions side by side.
import { esc } from './lib.mjs';

export function render({ content, images, base, themes }) {
  const covers = ['rouge', 'white-coast', 'noir'].map(s => content.projects.find(p => p.slug === s) || content.projects[0]);
  const thumb = p => { const m = images.images[p.images[0].src]; return base + 'img/' + (m.variants.webp.find(v => v.w >= 960) || m.variants.webp.at(-1)).file; };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(content.site.name)} — three directions</title><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500&display=swap">
<style>
:root{--bg:#f4f2ee;--ink:#151413;--mute:#7d7872}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 'Hanken Grotesk',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1320px;margin:0 auto;padding:clamp(28px,6vw,80px) clamp(18px,4vw,48px)}
h1{margin:0;font:400 clamp(40px,7vw,92px)/.95 'Instrument Serif',serif;letter-spacing:-.02em}
h1 i{color:var(--mute)}
.lead{max-width:44em;margin:20px 0 0;color:#45413d;font-size:15px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:clamp(18px,2.5vw,36px);margin-top:clamp(36px,6vw,72px)}
a.card{display:block;color:inherit;text-decoration:none}
.card .img{aspect-ratio:4/5;overflow:hidden;background:#ddd}
.card img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s cubic-bezier(.2,.7,.1,1)}
.card:hover img{transform:scale(1.04)}
.k{display:flex;justify-content:space-between;margin-top:16px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--mute)}
h2{margin:6px 0 0;font:400 44px/1 'Instrument Serif',serif}
.tag{margin:6px 0 0;font:italic 18px/1.3 'Instrument Serif',serif;color:#45413d}
.notes{margin:10px 0 0;color:#55504b}
.go{display:inline-block;margin-top:12px;border-bottom:1px solid;padding-bottom:1px}
.card:hover .go{color:#b4432c}
footer{margin-top:clamp(40px,7vw,90px);padding-top:16px;border-top:1px solid #dcd7cf;color:var(--mute);font-size:12px;max-width:60em}
</style></head><body><main>
<h1>Agnes Solhall <i>— three directions</i></h1>
<p class="lead">Three takes on the same portfolio, all with the same projects, so you can compare layout and feel. Click into each one, open a project, try it on your phone, and note what you like and what you don't. Mixing is fine (“the home page from A, the project page from C”).</p>
<div class="grid">${themes.map((t, i) => `<a class="card" href="${base}${t.mount}">
  <div class="img"><img src="${thumb(covers[i % covers.length])}" alt="" loading="${i ? 'lazy' : 'eager'}"></div>
  <p class="k"><span>Direction ${'ABC'[i]}</span><span>${esc(base.replace(/\/$/, ''))}/${esc(t.mount)}</span></p>
  <h2>${esc(t.title)}</h2>
  <p class="tag">${esc(t.tagline)}</p>
  <p class="notes">${esc(t.notes)}</p>
  <span class="go">Open ${esc(t.title)} →</span>
</a>`).join('')}</div>
<footer>All photos are placeholders from Unsplash (free licence) and all credits apart from the photographer handles are made up. They'll be replaced with Agnes's own work and credits. Not indexed by search engines.</footer>
</main></body></html>`;
}
