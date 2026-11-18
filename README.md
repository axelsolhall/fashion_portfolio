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
1. Create a folder `content/projects/<url-name>/`, e.g. `content/projects/vogue-scandinavia-2026/`.
2. Put the photos in it. They are shown in filename order (`01.jpg`, `02.jpg`, …). Full-resolution JPEGs are fine; they get resized automatically.
3. Add `project.yml`:
   ```yaml
   title: Spring Forward
   publication: Vogue Scandinavia
   date: 2026-04            # YYYY-MM
   category: Editorial      # becomes a filter in Mosaic
   summary: One line about the story.   # optional
   alt: Model in a pink knitted gown against a stone wall   # describes the photos for screen readers/Google
   cover: 03.jpg            # optional, default = first image
   credits:
     Photography: Name
     Styling: Agnes Solhall
     Hair: Name
     Make-up: Name
     Model: Name
   ```
4. Commit and push. GitHub Actions builds, runs the evals and deploys.

## Deploy
`.github/workflows/deploy.yml` builds on every push to `main` and publishes to GitHub Pages.
- Preview (now): all three themes at `https://axelsolhall.github.io/fashion_portfolio/`
- Launch: set `SITE_ROOT_THEME` to the chosen theme, set `SITE_PREVIEW=0`, add the Route 53 CNAME (see VERIFY.md).
