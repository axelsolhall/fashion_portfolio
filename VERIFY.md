# Verify: what needs a human sign-off

Automated checks live in `npm run eval`. Everything below needs a person.

## Now: round 1 of design review (Agnes + Axel)
- [ ] Open the preview chooser on **a phone and a laptop**, and try all three directions.
- [ ] For each: open a project from the home page. Are all images and full credits easy to find? (This was Agnes's main ask.)
- [ ] Pick a direction, or a mix ("A's home + C's project page"), and list what to change.
- [ ] Is the name typography right for her (outline serif / Bodoni / wide grotesk)?

## Before launch
- [ ] Replace placeholder photos with Agnes's work (A-01). `npm run eval:content` must show 0 placeholder projects.
- [ ] Real titles, publications, dates and credits for every project (A-02). The eval must show 0 "Name Surname".
- [ ] Bio, location, education, experience and clients in `content/site.yml` (A-03). No `TODO(agnes)` left.
- [ ] The contact e-mail works (A-04).
- [ ] Axel adds the DNS record in Route 53: `agnes.solhall.se CNAME axelsolhall.github.io`, then sets the custom domain in repo Settings → Pages (A-07).
- [ ] Switch the workflow to `SITE_ROOT_THEME=<chosen>` and `SITE_PREVIEW=0` (A-10).
- [ ] Check the share preview (OG image) by pasting a project link into iMessage/WhatsApp.

## Verified by Claude (2026-11-18)
- `npm run eval`: all checks pass. 0 broken links out of 4,097. 9/9 project pages in every theme contain all of their images and credits (checked by a mutation test: deleting one image or one credit makes it fail). 0 images without alt text.
- Manually checked in Chrome at 1243×806 and at phone width: home, project, overview/index, filters (Mosaic), sideways scroll (Mosaic), spread paging (Spread).
- **Not** checked: Safari/iOS (view transitions and scroll-driven animation fall back gracefully, but nobody has looked), Lighthouse scores, screen readers.
