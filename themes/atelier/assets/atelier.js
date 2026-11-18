/* ATELIER — home strip that scrolls sideways.
   Mouse wheel → smooth horizontal scroll, trackpad/touch scroll natively, drag with the mouse,
   arrow keys and buttons step one image, counter + progress follow the scroll position. */
(() => {
  const strip = document.querySelector('.strip');
  if (!strip) return;
  const track = strip.querySelector('.strip__track');
  const items = [...track.querySelectorAll('.strip__item:not(.strip__end)')];
  const count = strip.querySelector('.strip__count'), bar = strip.querySelector('.strip__progress');
  const [back, fwd] = strip.querySelectorAll('.strip__arrow');
  const P = n => String(n).padStart(2, '0'), total = P(items.length);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const max = () => track.scrollWidth - track.clientWidth;

  // --- smooth scrolling toward a target (wheel, keys, buttons). Native scrolls resync the target.
  let target = 0, raf = 0;
  const tick = () => {
    const d = target - track.scrollLeft;
    if (Math.abs(d) < 1.5) { track.scrollLeft = target; raf = 0; return; }
    track.scrollLeft += Math.abs(d * 0.14) < 1 ? Math.sign(d) : d * 0.14;
    raf = requestAnimationFrame(tick);
  };
  const scrollTo = x => {
    if (!raf) target = track.scrollLeft;
    target = Math.max(0, Math.min(max(), x));
    if (reduce) { track.scrollLeft = target; return; }
    if (!raf) raf = requestAnimationFrame(tick);
  };

  // the page itself never scrolls vertically on home, so a vertical wheel anywhere moves the strip
  addEventListener('wheel', e => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // pinch-zoom / sideways trackpad: leave native
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * track.clientWidth : e.deltaY;
    scrollTo((raf ? target : track.scrollLeft) + dy);
  }, { passive: false });

  // --- step to the next/previous image edge
  const lefts = () => items.map(li => li.offsetLeft - track.offsetLeft);
  const step = dir => {
    const x = raf ? target : track.scrollLeft, ls = [...lefts(), max()];
    const next = dir > 0 ? ls.find(l => l > x + 4) : ls.findLast(l => l < x - 4);
    scrollTo(next ?? (dir > 0 ? max() : 0));
  };
  back.onclick = () => step(-1);
  fwd.onclick = () => step(1);
  addEventListener('keydown', e => {
    if (e.target.closest('input,textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
    if (e.key === 'Home') scrollTo(0);
    if (e.key === 'End') scrollTo(max());
  });
  // keyboard focus on an off-screen image brings it into view
  track.addEventListener('focusin', e => { const li = e.target.closest('.strip__item'); if (li) scrollTo(li.offsetLeft - track.offsetLeft); });

  // --- drag with the mouse (touch already scrolls natively); a drag never counts as a click
  let drag = null;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft, moved: false };
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; strip.classList.add('is-dragging'); cancelAnimationFrame(raf); raf = 0; }
    if (drag.moved) track.scrollLeft = drag.left - dx;
  });
  addEventListener('pointerup', () => {
    if (drag?.moved) setTimeout(() => strip.classList.remove('is-dragging'), 0);
    drag = null;
  });
  track.addEventListener('click', e => { if (strip.classList.contains('is-dragging')) { e.preventDefault(); e.stopPropagation(); } }, true);

  // --- counter, progress, arrow states
  let pending = false;
  const update = () => {
    pending = false;
    const x = track.scrollLeft, m = max(), ls = lefts();
    const i = Math.max(0, ls.findLastIndex(l => l <= x + track.clientWidth * 0.25));
    count.textContent = `${P(Math.min(i + 1, items.length))} / ${total}`;
    bar.style.setProperty('--p', m > 0 ? (x / m).toFixed(4) : 1);
    back.disabled = x < 2; fwd.disabled = x > m - 2;
  };
  track.addEventListener('scroll', () => {
    if (!raf) target = track.scrollLeft;
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener('resize', update);
  update();
})();
