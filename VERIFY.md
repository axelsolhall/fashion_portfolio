# Verify: what needs a human sign-off

Automated checks live in `npm run eval`. Everything below needs a person.

## Now: round 2 (Agnes chose Atelier, 2026-11-18)
- [ ] Agnes picks the name typeface on `/atelier/type/` (A-15). It is Syne for now.
- [ ] Is #ff2d87 the right pink (A-14)? Look at it on her own laptop, since cursor colours vary by screen.
- [ ] Try the sideways home on a laptop with a mouse wheel, on a trackpad and on a phone. Does it feel natural?
- [ ] Check her client and publication list on About (A-17).
- [x] Public vs private originals: public (Axel, 2026-11-18, A-12).

## Done: round 1 of design review (Agnes + Axel)
- [ ] Open the preview chooser on **a phone and a laptop**, and try all three directions.
- [ ] For each: open a project from the home page. Are all images and full credits easy to find? (This was Agnes's main ask.)
- [ ] Pick a direction, or a mix ("A's home + C's project page"), and list what to change.
- [ ] Is the name typography right for her (outline serif / Bodoni / wide grotesk)?

## Before launch
- [ ] Replace placeholder photos with Agnes's work (A-01). `npm run eval:content` must show 0 placeholder projects.
- [ ] Real titles, publications, dates and credits for every project (A-02). The eval must show 0 "Name Surname".
- [x] Bio, contact, publications and clients in `content/site.yml` (2026-11-18). She chose not to list education or experience.
- [x] Contact e-mail: her own Gmail (A-04).
- [x] DNS record in Route 53 `agnes.solhall.se CNAME axelsolhall.github.io` (Axel, 2026-11-18) + custom domain set on the repo (A-07).
- [x] Workflow switched to `SITE_ROOT_THEME=atelier` at `/` (2026-11-18).
- [ ] Set `SITE_PREVIEW: "0"` once her real projects replace the placeholders (A-10). Until then the live site is noindex and shows the placeholder note.
- [ ] Check the share preview (OG image) by pasting a project link into iMessage/WhatsApp.

## Verified by Claude (2026-11-18)
- `npm run eval`: all checks pass. 0 broken links out of 4,097. 9/9 project pages in every theme contain all of their images and credits (checked by a mutation test: deleting one image or one credit makes it fail). 0 images without alt text.
- Manually checked in Chrome at 1243×806 and at phone width: home, project, overview/index, filters (Mosaic), sideways scroll (Mosaic), spread paging (Spread).
- **Not** checked: Safari/iOS (view transitions and scroll-driven animation fall back gracefully, but nobody has looked), Lighthouse scores, screen readers.

## Verified by Claude (2026-11-18, round 2 — Atelier changes)
- `npm run eval`: all checks pass, 0 broken links, 9/9 Atelier project pages complete, 0 TODO(agnes) left in site.yml.
- Chrome, 1512×805: a mouse wheel moves the home strip sideways (scrollLeft 0 → 500, counter 01 → 02, page itself never scrolls vertically). Nav is grey and turns #ff2d87 on hover. The computed cursor is the pink SVG (rendered both cursor images to check them). Name is in Syne caps. About shows publications and clients.
- At 375 and 390 px (iframes): no horizontal page overflow, the name fits (right edge at 340/353 px), the strip swipes and the counter follows.
- **Not** checked: real mouse-drag and trackpad feel (synthetic events only), Safari's cursor `image-set` rendering, iOS scroll-snap feel.
