/* Shared client behaviour for every theme. No dependencies, ~4 KB.
   - progressive image fade-in
   - lightbox (<dialog>) for any [data-lightbox] group: keys, swipe, prev/next cursor, deep link #n
   - swipe() helper used by sliders
*/
(() => {
  const d = document;
  d.documentElement.classList.remove('no-js');

  // --- 1. image fade-in -------------------------------------------------------
  const mark = img => img.classList.add('is-loaded');
  const watch = root => root.querySelectorAll('.pic img').forEach(img => {
    if (img.complete && img.naturalWidth) mark(img);
    else img.addEventListener('load', () => mark(img), { once: true });
  });
  watch(d);
  window.AS = window.AS || {};
  AS.watch = watch;

  // --- 2. swipe helper ---------------------------------------------------------
  AS.swipe = (el, onLeft, onRight) => {
    let x0 = null, y0 = null;
    el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) (dx < 0 ? onLeft : onRight)();
      x0 = null;
    }, { passive: true });
  };

  // --- 3. cross-document view transition: the clicked image morphs into the project's hero image ----
  let clicked = null;
  d.addEventListener('click', e => { const a = e.target.closest('a[href]'); clicked = a && a.querySelector('img'); }, true);
  addEventListener('pageswap', e => { if (e.viewTransition && clicked && e.activation?.entry?.url?.includes('/work/')) clicked.style.viewTransitionName = 'hero'; });
  addEventListener('pagereveal', e => {
    if (!e.viewTransition) return;
    const t = !location.hash && d.querySelector('[data-hero] img');
    if (t) { t.style.viewTransitionName = 'hero'; e.viewTransition.finished.finally(() => { t.style.viewTransitionName = ''; }); }
  });
  addEventListener('pageshow', () => d.querySelectorAll('img[style*="view-transition"]').forEach(i => i.style.viewTransitionName = ''));

  // --- 4. lightbox -----------------------------------------------------------------
  const triggers = [...d.querySelectorAll('[data-lightbox]')];
  if (!triggers.length) return;
  const lb = d.createElement('dialog');
  lb.className = 'lb';
  lb.setAttribute('aria-label', 'Image viewer');
  lb.innerHTML = `<div class="lb__stage"><img alt=""><button class="lb__nav lb__nav--prev" aria-label="Previous image"></button><button class="lb__nav lb__nav--next" aria-label="Next image"></button><span class="lb__cursor" aria-hidden="true"></span></div>
  <div class="lb__bar"><span class="lb__count"></span><span class="lb__cap"></span><button class="lb__close">Close</button></div>`;
  d.body.append(lb);
  const $ = s => lb.querySelector(s);
  const img = $('.lb__stage img'), count = $('.lb__count'), cap = $('.lb__cap'), cursor = $('.lb__cursor');
  let group = [], i = 0;

  const show = n => {
    i = (n + group.length) % group.length;
    const t = group[i], src = t.querySelector('img');
    img.src = src.currentSrc || src.src;               // instant: what the page already loaded
    img.alt = src.alt;
    const big = t.dataset.full;                          // then upgrade to the largest variant
    if (big) { const pre = new Image(); pre.onload = () => { if (group[i] === t) img.src = big; }; pre.src = big; }
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(group.length).padStart(2, '0')}`;
    cap.textContent = t.dataset.caption || '';
    history.replaceState(null, '', '#' + (i + 1));
  };
  const open = t => {
    group = triggers.filter(x => x.dataset.lightbox === t.dataset.lightbox);
    lb.showModal(); d.documentElement.style.overflow = 'hidden';
    show(group.indexOf(t));
  };
  const close = () => lb.close();
  lb.addEventListener('close', () => {
    d.documentElement.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.search);
    group[i]?.focus({ preventScroll: true });
    group[i]?.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  triggers.forEach(t => t.addEventListener('click', e => { e.preventDefault(); open(t); }));
  $('.lb__nav--prev').onclick = () => show(i - 1);
  $('.lb__nav--next').onclick = () => show(i + 1);
  $('.lb__close').onclick = close;
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(i + 1); }
  });
  lb.addEventListener('mousemove', e => {
    const onNav = e.target.closest('.lb__nav');
    cursor.textContent = onNav ? (onNav.classList.contains('lb__nav--prev') ? (AS.prevLabel || 'Prev') : (AS.nextLabel || 'Next')) : '';
    cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
  });
  AS.swipe($('.lb__stage'), () => show(i + 1), () => show(i - 1));

  // deep link: /work/rouge/#3 opens image 3 (used by index pages: "click any image → that image in its project")
  const n = parseInt(location.hash.slice(1), 10);
  if (n && triggers[n - 1] && d.body.dataset.deeplink !== 'none') {
    const t = triggers[n - 1];
    if (d.body.dataset.deeplink === 'scroll') { t.scrollIntoView({ block: 'center' }); t.classList.add('is-target'); history.replaceState(null, '', location.pathname); }
    else open(t);
  }
})();
