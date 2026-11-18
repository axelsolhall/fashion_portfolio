# Data contracts between modules

```
content/ ──[1 content]──▶ build/content.json ──[2 images]──▶ build/images.json + build/img/ ──[3 site]──▶ dist/ ──[eval]
```

Each module reads only the previous module's output, so any module can be re-run on its own.

### content/v1: `build/content.json` (module 1)
```
{ schema, generated, warnings[], site: <content/site.yml as-is: name, role, location, email, instagram, agent|null, url, bio,
         education[], experience[], publications[], clients[] — empty lists hide their section>,
  projects: [{ slug, title, publication, date "YYYY[-MM]", year, category, summary,
               credits: [{role, name}], order|null, featured, placeholder,
               cover: <file>, images: [{ file, src: "content/projects/<slug>/<file>", alt, caption|null }] }] }
```

### images/v1: `build/images.json` (module 2)
```
{ schema, settings, images: { "<src>": { hash, w, h, ratio, orientation, color "#rrggbb", dark,
  lqip "data:image/webp;base64…", srcBytes, og "<file>.jpg",
  variants: { avif: [{w, file}], webp: [{w, file}] } } } }
```
Files live in `build/img/` and are copied once to `dist/img/`, then shared by all themes.

### Theme interface (module 3)
`themes/<name>/theme.mjs` exports `meta {title, tagline, notes}` and `render(ctx) → [{path, html}]`.
`ctx` = content/v1 + `u(path)` URL helper + `img(src)` lookup + `preview` flag. The shared helpers are in `themes/_shared/lib.mjs`.
A new theme needs a folder with `theme.mjs` + `assets/`, then gets added to `SITE_THEMES`.

### pages/v1: `dist/pages.json`
The list of generated pages per theme. Module 3's eval uses it.
