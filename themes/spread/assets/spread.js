/* SPREAD — page through two-up spreads: side zones with label cursor, keys, swipe, deep links, preloading. */
(() => {
  const v = document.querySelector('.viewer');
  if (!v) return;
  const spreads = [...v.querySelectorAll('.sp')];
  const stage = v.querySelector('.viewer__stage'), cursor = v.querySelector('.viewer__cursor');
  const $ = s => v.querySelector(s);
  const total = spreads.reduce((n, s) => n + s.querySelectorAll('.sp__img').length, 0);
  const starts = []; spreads.reduce((n, s, k) => (starts[k] = n, n + s.querySelectorAll('.sp__img').length), 0);
  const P = n => String(n).padStart(2, '0');
  const home = v.dataset.mode === 'home';
  let k = 0;

  const eager = s => s?.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
  const go = (n, push = true) => {
    const old = spreads[k];
    k = (n + spreads.length) % spreads.length;
    const s = spreads[k];
    old.classList.remove('is-active'); old.setAttribute('aria-hidden', 'true'); old.querySelectorAll('a').forEach(a => a.tabIndex = -1);
    s.classList.add('is-active'); s.removeAttribute('aria-hidden'); s.querySelectorAll('a').forEach(a => a.removeAttribute('tabindex'));
    const nImg = s.querySelectorAll('.sp__img').length, a = starts[k] + 1;
    $('.cap__count').textContent = `${P(a)}${nImg > 1 ? '–' + P(a + nImg - 1) : ''} / ${P(total)}`;
    const t = $('.cap__title'); t.textContent = s.dataset.title; if (t.href !== undefined) t.href = s.dataset.href;
    $('.cap__sub').textContent = s.dataset.sub;
    const go2 = $('.cap__go'); if (go2) go2.href = s.dataset.href;
    const cr = $('.cap__credit'); if (cr) cr.textContent = s.dataset.credit;
    eager(spreads[(k + 1) % spreads.length]); eager(spreads[(k - 1 + spreads.length) % spreads.length]);
    if (!home && push) history.replaceState(null, '', '#' + s.dataset.first);
  };

  $('.viewer__side--prev').onclick = () => go(k - 1);
  $('.viewer__side--next').onclick = () => go(k + 1);
  addEventListener('keydown', e => {
    if (document.querySelector('.lb[open]')) return;
    if (e.key === 'ArrowRight') go(k + 1);
    if (e.key === 'ArrowLeft') go(k - 1);
  });
  AS.swipe(stage, () => go(k + 1), () => go(k - 1));

  // label cursor ("Previous" / "Next" / "View story") follows the mouse
  stage.addEventListener('mousemove', e => {
    const side = e.target.closest('.viewer__side'), img = e.target.closest('.sp__img');
    cursor.textContent = side ? (side.classList.contains('viewer__side--prev') ? '← Previous' : 'Next →') : (img && home ? 'View story' : '');
    cursor.classList.toggle('on', !!cursor.textContent && !img);
    cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
  });
  stage.addEventListener('mouseleave', () => cursor.classList.remove('on'));

  // project pages: #n → the spread containing image n
  const n = parseInt(location.hash.slice(1), 10);
  if (n > 1) { const idx = starts.findLastIndex(s => s < n); if (idx > 0) go(idx, false); }
  else eager(spreads[1]);
})();
