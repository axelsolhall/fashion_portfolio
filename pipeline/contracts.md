# Data contracts between modules

```
delivery folder ──[0 ingest]──▶ content/projects/ + build/ingest.json
content/ ──[1 content]──▶ build/content.json ──[2 images]──▶ build/images.json + build/img/ ──[3 site]──▶ dist/ ──[eval]
```

Each module reads only the previous module's output, so any module can be re-run on its own.

### ingest/v1: `build/ingest.json` (module 0)
```
{ schema, generated, source, settings,
  duplicates: [{ folder, file, of: "<slug>/<file>", distance }],   // skipped: same photo already on the site (A-23)
  similar:    [{ folder, file, to: "<slug>/<file>", distance }],   // kept, flagged for a look
  projects: [{ folder, slug, parsed: {title, story, date, stylist, photographer, assisted, notes[]}, drafted,
               items: [{ in, inBytes, out, kind, w, h, outBytes, inW?, inH?, exifOut?, lowRes?, poster?, duration? }] }] }
```
Additions below to content/v1 and images/v1 are optional fields, so older readers keep working.

### content/v1: `build/content.json` (module 1)
```
{ schema, generated, warnings[], site: <content/site.yml as-is: name, role, location, email, instagram, agent|null, url, bio,
         education[], experience[], publications[], clients[] — each item "Name" or {name, note}; empty lists hide their section>,
  projects: [{ slug, title, publication, date "YYYY[-MM]", year, category, summary,
               credits: [{role, name}], role "Stylist"|"Styling assistant", leadStylist ("" unless assisting),
               order|null (position from content/order.yml, A-24), featured, placeholder, cover: <image file>,
               images: [{ file, src: "content/projects/<slug>/<file>", alt, caption|null,
                          kind "image"|"video", poster?: src of NN.poster.jpg (videos) }] }] }
```

### images/v1: `build/images.json` (module 2)
```
{ schema, settings, images: { "<src>": { hash, w, h, ratio, orientation, color "#rrggbb", dark,
  lqip "data:image/webp;base64…", srcBytes, og "<file>.jpg",
  variants: { avif: [{w, file}], webp: [{w, file}] } } } }
```
A video's entry (keyed by the .mp4 src) is its poster's entry plus `video: { file "<sha>.mp4", bytes }`.
Files live in `build/img/` and are copied once to `dist/img/`, then shared by all themes.

### Theme interface (module 3)
`themes/<name>/theme.mjs` exports `meta {title, tagline, notes}` and `render(ctx) → [{path, html}]`.
`ctx` = content/v1 + `u(path)` URL helper + `img(src)` lookup + `preview` flag. The shared helpers are in `themes/_shared/lib.mjs`.
A new theme needs a folder with `theme.mjs` + `assets/`, then gets added to `SITE_THEMES`.

### pages/v1: `dist/pages.json`
The list of generated pages per theme. Module 3's eval uses it.
