# Agnes Solhall: styling portfolio

A static, framework-free portfolio for fashion stylist Agnes Solhall. It will live at **agnes.solhall.se**.
Three design directions are built from the same content so they can be compared:

| | Direction | Lineage |
|-|-|-|
| A | **Atelier**: outlined serif name, one image at a time, masonry overview | Julia Sarr-Jamois (Agnes's favourite) |
| B | **Mosaic**: edge-to-edge cover grid under a giant Bodoni name, hover flip-book, filters, sideways stories | Isabela Orozco |
| C | **Spread**: two-page magazine spreads, edge dots, counter, contact-sheet index | Harley Weir / Harry Lambert |

In all three, **clicking any image opens its project page with every image and the full credits**. That was Agnes's one complaint about her favourite reference site.

## Pipeline

```
content/  →  [1] content  →  [2] images  →  [3] site  →  dist/   (+ eval per module)
```
See `pipeline/contracts.md`. Each step persists its output in `build/`, so steps re-run independently.

```bash
npm ci
npm run placeholders   # only while using stock placeholder photos (ASSUMPTIONS A-01)
npm run build          # content → images (cached, ~2 min first run) → site
npm run eval           # or eval:content / eval:images / eval:site
npm run dev            # http://localhost:4321/
```

## Adding a project (for Agnes)

**Easiest:** send a WeTransfer like the first one. One folder per project, named
`N. Title - Stylist X - Photographer Y - Assisted by Agnes Solhall - Month Year` (leave out "Assisted by" for your own jobs),
with the images numbered in order (`1. cover.jpg`, `2. bild.jpg`, …). Videos (.mov/.mp4) are fine. Then Axel runs:

```
npm run ingest -- "/path/to/unzipped/folder"   # shrinks + strips metadata, converts video, drafts project.yml
npm run eval:ingest                             # what came in, what's low-res
# edit content/projects/<slug>/project.yml (title, publication, category, role), then:
npm run build && npm run eval && git add content && git push   # deploys to agnes.solhall.se
```

Running it again on the same folder is safe: existing files and project.yml are never overwritten.

**By hand:** make `content/projects/<slug>/` with numbered images and a project.yml:

```yaml
title: In Harmony
publication: 72 Magazine          # optional
date: "2026-03"                   # YYYY or YYYY-MM
category: Editorial               # Editorial | Campaign | …
role: Styling assistant           # or Stylist — decides "Assisting …" vs her own credit
order: 2                          # optional; otherwise newest first
credits:
  Styling: Rebecca Purshouse
  Styling assistant: Agnes Solhall
  Photography: Justin French
```

## Deploy
`.github/workflows/deploy.yml` builds on every push to `main` and publishes to GitHub Pages.
- Preview (now): all three themes at `https://axelsolhall.github.io/fashion_portfolio/`
- Launch: set `SITE_ROOT_THEME` to the chosen theme, set `SITE_PREVIEW=0`, add the Route 53 CNAME (see VERIFY.md).
