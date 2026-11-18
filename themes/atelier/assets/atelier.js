/* ATELIER — home slideshow: arrows, keys, swipe, autoplay with pause on hover/hidden tab, preloads next. */
(() => {
  const show = document.querySelector('.show');
  if (!show) return;
  const slides = [...show.querySelectorAll('.show__slide')];
  const title = show.querySelector('.show__title'), line = show.querySelector('.show__line'), count = show.querySelector('.show__count');
  const DUR = 5500, total = String(slides.length).padStart(2, '0');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0, timer = null;

  const go = n => {
    slides[i].classList.remove('is-active'); slides[i].setAttribute('aria-hidden', 'true'); slides[i].tabIndex = -1;
    i = (n + slides.length) % slides.length;
    const s = slides[i];
    s.classList.add('is-active'); s.removeAttribute('aria-hidden'); s.removeAttribute('tabindex');
    title.textContent = s.dataset.title; title.href = s.href; line.textContent = s.dataset.line;
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${total}`;
    // warm the next image so the crossfade never shows a blank
    const nx = slides[(i + 1) % slides.length].querySelector('img'); if (nx.loading === 'lazy') nx.loading = 'eager';
    restart();
  };
  const restart = () => {
    clearTimeout(timer); show.classList.remove('is-playing'); void show.offsetWidth;
    if (reduce || show.matches(':hover') || document.hidden) return;
    show.classList.add('is-playing'); timer = setTimeout(() => go(i + 1), DUR);
  };
  show.style.setProperty('--dur', DUR + 'ms');
  show.querySelector('.show__arrow--prev').onclick = () => go(i - 1);
  show.querySelector('.show__arrow--next').onclick = () => go(i + 1);
  addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); });
  AS.swipe(show, () => go(i + 1), () => go(i - 1));
  show.addEventListener('mouseenter', () => { clearTimeout(timer); show.classList.remove('is-playing'); });
  show.addEventListener('mouseleave', restart);
  document.addEventListener('visibilitychange', restart);
  restart();
})();
