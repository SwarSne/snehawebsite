/* Interactive behaviour for Sneha Swaroopa's site. No dependencies. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Toast ---------- */
  const toastEl = $('.toast');
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (toastEl.hidden = true), 2200);
  }

  /* ---------- Theme toggle ---------- */
  function currentTheme() {
    return root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }
  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next; store.set('theme', next);
  }
  $$('[data-theme-toggle]').forEach(b => b.addEventListener('click', toggleTheme));

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-btn'), links = $('#nav-links');
  if (menuBtn && links) {
    menuBtn.addEventListener('click', () => menuBtn.setAttribute('aria-expanded', links.classList.toggle('open')));
    $$('a', links).forEach(a => a.addEventListener('click', () => { links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }));
  }

  /* ---------- Scroll: header border, progress bar, active nav link ---------- */
  const nav = $('.nav-wrap'), bar = $('.progress');
  const sections = $$('main section[id]');
  const navLinks = $$('.nav-links a');
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    nav && nav.classList.toggle('scrolled', y > 8);
    if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    let cur = '';
    for (const s of sections) if (s.offsetTop - 120 <= y) cur = s.id;
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- Cursor spotlight (page + cards) ---------- */
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    const spot = $('.spotlight');
    addEventListener('pointermove', e => {
      if (spot) { spot.style.setProperty('--sx', e.clientX + 'px'); spot.style.setProperty('--sy', e.clientY + 'px'); }
      const card = e.target.closest && e.target.closest('.card');
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }
    }, { passive: true });

    /* gentle 3D tilt on the portrait */
    const tilt = $('.tilt');
    if (tilt) {
      tilt.addEventListener('pointermove', e => {
        const r = tilt.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        tilt.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
      });
      tilt.addEventListener('pointerleave', () => (tilt.style.transform = ''));
    }
  }

  /* ---------- Typed roles ---------- */
  const typed = $('.typed');
  if (typed && !reduced) {
    let words = [];
    try { words = JSON.parse(typed.dataset.words); } catch (e) {}
    let w = 0, i = words[0] ? words[0].length : 0, deleting = true;
    const tick = () => {
      const word = words[w] || '';
      typed.textContent = word.slice(0, i);
      if (!deleting && i === word.length) { deleting = true; return setTimeout(tick, 1800); }
      if (deleting && i === 0) { deleting = false; w = (w + 1) % words.length; return setTimeout(tick, 300); }
      i += deleting ? -1 : 1;
      setTimeout(tick, deleting ? 35 : 65);
    };
    if (words.length > 1) setTimeout(tick, 2200);
  }

  /* ---------- Reveal + count-up on scroll ---------- */
  const counted = new WeakSet();
  function countUp(el) {
    if (counted.has(el)) return; counted.add(el);
    const to = +el.dataset.to; if (reduced || !to) return;
    const t0 = performance.now(), dur = 1400;
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0'; requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('.count', e.target).forEach(countUp);
      io.unobserve(e.target);
    }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('in'));
  }

  /* ---------- Publication filters ---------- */
  const filters = $$('.filter'), firstOnly = $('#first-only'), countEl = $('#pub-count');
  let typeFilter = 'all';
  function applyPubFilters() {
    let shown = 0;
    $$('#pub-list .pub').forEach(p => {
      const ok = (typeFilter === 'all' || p.dataset.type === typeFilter) && (!firstOnly || !firstOnly.checked || p.dataset.first === 'true');
      p.classList.toggle('hide', !ok); if (ok) shown++;
    });
    if (countEl) countEl.textContent = `Showing ${shown} ${shown === 1 ? 'entry' : 'entries'}`;
  }
  filters.forEach(btn => btn.addEventListener('click', () => {
    filters.forEach(b => { const on = b === btn; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
    typeFilter = btn.dataset.filter; applyPubFilters();
  }));
  firstOnly && firstOnly.addEventListener('change', applyPubFilters);
  if ($('#pub-list')) applyPubFilters();

  /* Open the summary of a paper linked by #id */
  function openTarget() {
    const el = location.hash && document.getElementById(location.hash.slice(1));
    if (el && el.classList.contains('pub')) { const d = $('.pub-more', el); if (d) d.open = true; el.classList.add('in'); }
  }
  addEventListener('hashchange', openTarget); openTarget();

  /* ---------- Copy email ---------- */
  async function copyEmail(email) {
    try { await navigator.clipboard.writeText(email); toast('Email copied to clipboard'); }
    catch (e) { location.href = 'mailto:' + email; }
  }
  $$('.copy-email').forEach(b => b.addEventListener('click', () => copyEmail(b.dataset.email)));

  /* ---------- Command palette (⌘K / Ctrl+K) ---------- */
  const pal = $('.palette');
  if (pal) {
    const input = $('.palette-input', pal), items = $$('.palette-list li', pal);
    let sel = 0, lastFocus = null;
    const visible = () => items.filter(li => !li.hidden);
    const render = () => visible().forEach((li, k) => li.classList.toggle('sel', k === sel));
    function open() { lastFocus = document.activeElement; pal.hidden = false; input.value = ''; items.forEach(li => (li.hidden = false)); sel = 0; render(); input.focus(); }
    function close() { pal.hidden = true; lastFocus && lastFocus.focus && lastFocus.focus(); }
    function run(li) {
      if (!li) return; close();
      const { href, action } = li.dataset;
      if (action === 'theme') return toggleTheme();
      if (action === 'copy-email') return copyEmail($('.copy-email')?.dataset.email || '');
      if (href) {
        if ('external' in li.dataset) window.open(href, '_blank', 'noopener');
        else location.href = href;
      }
    }
    $$('[data-open-palette]').forEach(b => b.addEventListener('click', open));
    addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? open() : close(); return; }
      if (pal.hidden) return;
      const vis = visible();
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % vis.length; render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + vis.length) % vis.length; render(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(vis[sel]); }
    });
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      items.forEach(li => (li.hidden = q && !li.textContent.toLowerCase().includes(q)));
      sel = 0; render();
    });
    items.forEach(li => li.addEventListener('click', () => run(li)));
    pal.addEventListener('click', e => { if (e.target === pal) close(); });
  }
})();
