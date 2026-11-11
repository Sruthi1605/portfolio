const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- Scroll: one rAF-throttled handler (nav state, progress, active link, back-to-top) ---------- */
const nav = document.querySelector('.nav');
const progress = document.querySelector('#scrollProgress');
const toTop = document.querySelector('#toTop');
const navLinks = [...document.querySelectorAll('.nav-links > a[href^="#"]:not(.btn)')];
const linkFor = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
// Sections without their own nav link highlight a related one
const alias = { ml: 'work', other: 'work' };
const spySections = [...document.querySelectorAll('main section[id]')];

let sectionTops = [];
function measure() {
  sectionTops = spySections.map((s) => ({ id: s.id, top: s.getBoundingClientRect().top + window.scrollY }));
}

function onFrame() {
  const y = window.scrollY;
  if (nav) nav.classList.toggle('scrolled', y > 24);
  if (progress) {
    const max = root.scrollHeight - root.clientHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  }
  if (toTop) toTop.classList.toggle('show', y > 600);

  if (navLinks.length) {
    const probe = y + window.innerHeight * 0.35;
    let current = '';
    for (const s of sectionTops) if (s.top <= probe) current = s.id;
    const target = linkFor.has(current) ? current : alias[current];
    navLinks.forEach((a) => {
      const on = a === linkFor.get(target);
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
}

let ticking = false;
function requestFrame() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    onFrame();
  });
}

window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', () => { measure(); requestFrame(); }, { passive: true });
window.addEventListener('load', () => { measure(); requestFrame(); });
measure();
onFrame();

if (toTop) {
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
}

/* ---------- Theme ---------- */
const themeToggle = document.querySelector('#themeToggle');
const themeMeta = document.querySelector('meta[name="theme-color"]');

function syncTheme() {
  const light = root.dataset.theme === 'light';
  if (themeToggle) themeToggle.setAttribute('aria-pressed', light ? 'true' : 'false');
  if (themeMeta) themeMeta.setAttribute('content', light ? '#f7f5f0' : '#07090c');
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) { /* storage blocked */ }
    syncTheme();
  });
}
syncTheme();

/* ---------- Pause decorative animation in background tabs ---------- */
document.addEventListener('visibilitychange', () => root.classList.toggle('is-hidden', document.hidden));

/* ---------- Reveal on scroll ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('visible');
    revealObserver.unobserve(entry.target);
  }
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

/* ---------- Mouse-follow glow on cards (fine pointers only) ---------- */
if (finePointer && !reduceMotion) {
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
}


/* ==========================================================================
   Animations
   ========================================================================== */

/* 1. Name reveal: split "Sruthi G." into letters (screen readers still read the whole name) */
const heroName = document.querySelector('.hero-name');
if (heroName && !reduceMotion) {
  const fullName = heroName.textContent.trim();
  heroName.setAttribute('aria-label', fullName);
  let i = 0;
  const wrap = (text, extraClass) => [...text].map((ch) => {
    const s = document.createElement('span');
    s.className = 'ch' + (ch === ' ' ? ' ch-space' : '') + (extraClass ? ' ' + extraClass : '');
    s.textContent = ch === ' ' ? '\u00a0' : ch;
    s.style.setProperty('--i', i++);
    s.setAttribute('aria-hidden', 'true');
    return s;
  });
  const parts = [];
  heroName.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) parts.push(...wrap(node.textContent));
    else if (node.classList && node.classList.contains('accent')) parts.push(...wrap(node.textContent, 'accent'));
  });
  heroName.replaceChildren(...parts);
  heroName.classList.add('split');
}

/* 2. Badge follows the mouse: tilt the ID card toward the pointer (desktop, fine pointer only) */
const idCard = document.querySelector('.id-card');
const hero = document.querySelector('.hero');
if (idCard && hero && finePointer && !reduceMotion) {
  let raf = 0;
  const reset = () => {
    idCard.style.setProperty('--tilt-x', '0deg');
    idCard.style.setProperty('--tilt-y', '0deg');
    idCard.style.setProperty('--sheen', '0');
  };
  window.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const heroBox = hero.getBoundingClientRect();
      if (heroBox.bottom < 0 || e.clientY > heroBox.bottom) { reset(); return; }   // only while the hero is on screen
      const r = idCard.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      const clamp = (v) => Math.max(-1, Math.min(1, v));
      idCard.style.setProperty('--tilt-y', `${(clamp(dx) * 10).toFixed(2)}deg`);
      idCard.style.setProperty('--tilt-x', `${(clamp(-dy) * 8).toFixed(2)}deg`);
      idCard.style.setProperty('--sheen-x', `${50 + clamp(dx) * 40}%`);
      idCard.style.setProperty('--sheen-y', `${30 + clamp(dy) * 40}%`);
      idCard.style.setProperty('--sheen', '1');
    });
  }, { passive: true });
  document.addEventListener('pointerleave', reset);
}

/* 3. KitchenKart mockup: the cart count ticks up once the project is on screen */
const cartPill = document.querySelector('[data-cart]');
if (cartPill && !reduceMotion) {
  const target = parseInt(cartPill.dataset.cart, 10) || 0;
  cartPill.textContent = 'Cart · 0';
  const cartObserver = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    cartObserver.disconnect();
    let n = 0;
    const tick = () => {
      n += 1;
      cartPill.textContent = `Cart · ${n}`;
      cartPill.classList.remove('bump');
      void cartPill.offsetWidth;
      cartPill.classList.add('bump');
      if (n < target) setTimeout(tick, 550);
    };
    setTimeout(tick, 900);
  }, { threshold: 0.5 });
  cartObserver.observe(cartPill);
}


/* ---------- Lanyard cord: a curve from the top-right corner to the ID card's slot ---------- */
const cordSvg = document.querySelector('#lanyardCord');
const cardSlot = document.querySelector('.id-card .id-slot');
if (cordSvg && cardSlot && hero) {
  const parts = ['.cord-edge', '.cord-band', '.cord-text'].map((s) => cordSvg.querySelector(s));
  const clip = cordSvg.querySelector('.cord-clip');
  const drawCord = () => {
    if (getComputedStyle(cordSvg).display === 'none') return;
    const heroBox = hero.getBoundingClientRect();
    cordSvg.style.height = `${heroBox.bottom + window.scrollY}px`;
    const slot = cardSlot.getBoundingClientRect();
    const ex = slot.left + slot.width / 2;
    const ey = slot.top + slot.height / 2 + window.scrollY;
    const sx = document.documentElement.clientWidth + 24;   // just past the top-right corner
    const sy = -24;
    const dy = ey - sy;
    // S-curve: falls from the corner, swings left, then drops straight into the slot
    const d = `M ${sx} ${sy} C ${sx - 10} ${sy + dy * 0.55}, ${ex + (sx - ex) * 0.15} ${ey - dy * 0.75}, ${ex} ${ey - 22}`;
    const c1x = sx - 10, c1y = sy + dy * 0.55, c2x = ex + (sx - ex) * 0.15, c2y = ey - dy * 0.75;
    const dRev = `M ${ex} ${ey - 22} C ${c2x} ${c2y}, ${c1x} ${c1y}, ${sx} ${sy}`;   // same curve, reversed, so the words read left to right
    parts.forEach((p, i) => p && p.setAttribute('d', i === 2 ? dRev : d));
    if (clip) clip.setAttribute('transform', `translate(${ex} ${ey - 4})`);
  };
  let until = performance.now() + 3200;               // follow the card closely while it flies in
  const loop = () => { drawCord(); if (performance.now() < until) requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const follow = () => { until = Math.max(until, performance.now() + 700); requestAnimationFrame(loop); };
  window.addEventListener('resize', follow, { passive: true });
  window.addEventListener('pointermove', follow, { passive: true });   // the card tilts with the mouse
  window.addEventListener('load', follow);
}
