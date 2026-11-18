/* MOSAIC — hover flipbook, animated filters, horizontal story scroller. */
(() => {
  const d = document, hover = matchMedia('(hover: hover)').matches, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- scroll-shrink fallback for browsers without scroll-driven animations
  if (!CSS.supports('animation-timeline: scroll()')) {
    const on = () => d.body.classList.toggle('is-scrolled', scrollY > 40);
    addEventListener('scroll', on, { passive: true }); on();
  }

  // --- hover flipbook: cycle through the shoot while hovering a cover
  if (hover && !reduce) d.querySelectorAll('[data-flip]').forEach(a => {
    const urls = a.dataset.flip.split(' ').slice(1);
    if (!urls.length) return;
    let t = null, k = 0, img = null;
    a.addEventListener('mouseenter', () => {
      urls.forEach(u => { const p = new Image(); p.src = u; });          // preload small variants
      t = setTimeout(function tick() {
        if (!img) { img = d.createElement('img'); img.className = 'flip'; img.alt = ''; a.querySelector('.pic').append(img); }
        img.src = urls[k++ % urls.length];
        t = setTimeout(tick, 620);
      }, 380);
    });
    a.addEventListener('mouseleave', () => { clearTimeout(t); k = 0; img?.remove(); img = null; });
  });

  // --- filters (animated with same-document View Transitions where supported)
  const btns = [...d.querySelectorAll('.filters button')];
  btns.forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.f;
    const apply = () => {
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      d.querySelectorAll('.tile').forEach(t => { t.hidden = f !== '*' && t.dataset.cat !== f; });
    };
    if (d.startViewTransition && !reduce) d.startViewTransition(apply); else apply();
    history.replaceState(null, '', f === '*' ? location.pathname : '#' + encodeURIComponent(f));
  }));
  const pre = decodeURIComponent(location.hash.slice(1));
  btns.find(b => b.dataset.f === pre)?.click();

  // --- horizontal story: wheel → sideways, progress + counter, arrow keys
  const strip = d.querySelector('.strip');
  if (!strip) return;
  const wide = matchMedia('(min-width: 761px)');
  const imgs = [...strip.querySelectorAll('.strip__img')];
  const count = d.querySelector('.strip__count'), bar = d.querySelector('.strip__track i');
  const total = String(imgs.length).padStart(2, '0');
  strip.addEventListener('wheel', e => {
    if (!wide.matches || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault(); strip.scrollLeft += e.deltaY;
  }, { passive: false });
  const update = () => {
    const max = strip.scrollWidth - strip.clientWidth;
    bar.style.setProperty('--p', max > 0 ? strip.scrollLeft / max : 0);
    const mid = strip.scrollLeft + strip.clientWidth / 2;
    let cur = 0; imgs.forEach((im, n) => { if (im.offsetLeft <= mid) cur = n; });
    count.textContent = `${String(cur + 1).padStart(2, '0')} / ${total}`;
  };
  strip.addEventListener('scroll', update, { passive: true }); update();
  addEventListener('keydown', e => {
    if (d.querySelector('.lb[open]') || !wide.matches) return;
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    const mid = strip.scrollLeft + strip.clientWidth / 2;
    const target = step > 0 ? imgs.find(im => im.offsetLeft + im.offsetWidth / 2 > mid + 4) : [...imgs].reverse().find(im => im.offsetLeft + im.offsetWidth / 2 < mid - 4);
    if (target) strip.scrollTo({ left: target.offsetLeft - (strip.clientWidth - target.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    else if (step < 0) strip.scrollTo({ left: 0, behavior: 'smooth' });
  });
  // drag to scroll with the mouse
  let down = null;
  strip.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && wide.matches) down = { x: e.clientX, l: strip.scrollLeft, moved: false }; });
  addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 4) { down.moved = true; strip.scrollLeft = down.l - dx; strip.style.scrollSnapType = 'none'; } });
  addEventListener('pointerup', () => { if (down?.moved) strip.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true }); strip.style.scrollSnapType = ''; down = null; });
})();
