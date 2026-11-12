/* Sruthi G. · Debut (SG-001) — the record player */
(() => {
  const root = document.documentElement;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Listening modes: Studio / Acoustic / Live ---------- */
  const modes = $('.modes');
  const modeBtns = modes ? $$('button', modes) : [];
  const themeMeta = $('meta[name="theme-color"]');
  const MODE_BG = { studio: '#0d0c0b', acoustic: '#efe9de', live: '#070708' };
  const placeThumb = () => {
    const on = modeBtns.find((b) => b.dataset.mode === root.dataset.mode);
    if (!on) return;
    modes.style.setProperty('--tx', `${on.offsetLeft}px`);
    modes.style.setProperty('--tw', `${on.offsetWidth}px`);
  };
  const setMode = (mode, focus) => {
    root.dataset.mode = mode;
    try { localStorage.setItem('mode', mode); } catch (e) { /* storage blocked */ }
    modeBtns.forEach((b) => {
      const on = b.dataset.mode === mode;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    $$('.rpm-text').forEach((el) => { el.textContent = mode === 'live' ? '45' : '33⅓'; });
    if (themeMeta) themeMeta.setAttribute('content', MODE_BG[mode]);
    placeThumb();
    sound.retune && sound.retune();
  };
  modeBtns.forEach((b, i) => {
    b.addEventListener('click', () => setMode(b.dataset.mode));
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      setMode(modeBtns[(i + d + modeBtns.length) % modeBtns.length].dataset.mode, true);
    });
  });
  window.addEventListener('resize', placeThumb);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeThumb);

  /* ---------- Opening: title cards, record slides out, needle drops ---------- */
  const intro = root.classList.contains('intro');
  let dropped = !intro;
  const play = () => {
    if (root.classList.contains('played')) return;
    root.classList.add('played');
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) { /* ignore */ }
    setTimeout(() => { root.classList.add('needle'); dropped = true; requestFrame(); }, root.classList.contains('skip') ? 1500 : 2150);
  };
  if (intro) {
    const t = setTimeout(play, 2800);
    const skip = () => { clearTimeout(t); root.classList.add('skip'); play(); };
    const skipBtn = $('#skipIntro');
    if (skipBtn) skipBtn.addEventListener('click', skip);
    ['keydown', 'wheel', 'touchstart', 'pointerdown'].forEach((ev) => window.addEventListener(ev, function once() {
      if (!root.classList.contains('played')) skip();
      window.removeEventListener(ev, once);
    }, { passive: true }));
  }

  /* ---------- Waveforms: one per track, generated from its name ---------- */
  const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  $$('.wave').forEach((w) => {
    const r = rng(hash(w.dataset.seed || 'x'));
    const N = 140, H = 40;
    let d = '', prev = 0.5;
    const a = 0.08 + r() * 0.12, b = 0.02 + r() * 0.05;
    for (let i = 0; i < N; i++) {
      const env = Math.min(1, i / 10, (N - i) / 14);
      const shape = 0.45 + 0.3 * Math.sin(i * a) * Math.sin(i * b + 1.3);
      const v = Math.max(0.06, Math.min(1, (prev * 0.45 + (shape + (r() - 0.5) * 0.55) * 0.55) * (0.35 + 0.65 * env)));
      prev = v;
      const h = Math.max(1.2, v * H);
      d += `M${i * 3} ${(H - h) / 2}h2v${h.toFixed(2)}h-2z`;
    }
    const svg = (cls) => `<svg class="${cls}" viewBox="0 0 ${N * 3 - 1} ${H}" preserveAspectRatio="none"><path d="${d}"/></svg>`;
    w.innerHTML = svg('w-base') + svg('w-play');
  });


  /* ---------- Sides: a turntable beside the tracks that changes records ---------- */
  const LIGHT_LABELS = new Set(['#e9dcc2', '#d9a441', '#8fa37a']);
  const sideGrids = $$('.side-grid').map((grid) => {
    const deck = document.createElement('aside');
    deck.className = 'spin';
    deck.setAttribute('aria-hidden', 'true');
    deck.innerHTML = `
      <div class="spin-stage">
        <div class="spin-sleeve"><span class="ss-code"></span><span class="ss-title"></span><span class="ss-foot"><span>SG-001</span><span class="ss-side"></span></span></div>
        <div class="spin-record"><div class="spin-label"><b></b><i></i></div></div>
        <div class="spin-arm"></div>
      </div>
      <p class="spin-now"><span>Now spinning</span><b></b></p>`;
    grid.prepend(deck);
    const items = $$('.track', grid);
    return { grid, deck, items, current: null, rec: $('.spin-record', deck) };
  });

  const setLabel = (side, track, animate) => {
    const { deck, rec } = side;
    const apply = () => {
      const lab = track.dataset.label || '#ff5a1f';
      deck.style.setProperty('--lab', lab);
      deck.classList.toggle('light-label', LIGHT_LABELS.has(lab));
      $('.ss-code', deck).textContent = `${track.dataset.code} · ${track.dataset.side}`;
      $('.ss-title', deck).textContent = track.dataset.title;
      $('.ss-side', deck).textContent = track.dataset.len;
      $('.spin-label b', deck).textContent = track.dataset.code;
      $('.spin-label i', deck).textContent = track.dataset.title;
      $('.spin-now b', deck).textContent = `${track.dataset.code} · ${track.dataset.title}`;
    };
    if (!animate || still) { apply(); return; }
    deck.classList.add('lifted');
    rec.classList.remove('swap-in');
    rec.classList.add('swap-out');
    setTimeout(() => {
      apply();
      rec.classList.remove('swap-out');
      void rec.offsetWidth;
      rec.classList.add('swap-in');
      setTimeout(() => deck.classList.remove('lifted'), 550);
    }, 420);
  };
  sideGrids.forEach((side) => { if (side.items[0]) { side.current = side.items[0]; setLabel(side, side.items[0], false); } });

  /* Each track: a mini record and liner notes split into words */
  $$('.side-tracks .track').forEach((t) => {
    t.style.setProperty('--lab', t.dataset.label || '');
    const head = $('.track-head', t);
    const mini = document.createElement('span');
    mini.className = 'mini-rec';
    mini.setAttribute('aria-hidden', 'true');
    head.prepend(mini);
    const lede = $('.notes-lede', t);
    if (lede && !still) {
      const words = lede.textContent.trim().split(/\s+/);
      lede.innerHTML = words.map((w) => `<span class="wd">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join(' ');
      t._words = $$('.wd', lede);
    }
  });

  /* ---------- EQs: bars move with how much of their section you can see ---------- */
  $$('.eq').forEach((eq) => {
    const n = eq.classList.contains('p-eq') ? 7 : 9;
    eq.innerHTML = '<i></i>'.repeat(n);
  });
  const levels = new Map();          // section -> visible ratio (0..1)
  const eqSections = new Set($$('.eq:not(.p-eq)').map((eq) => eq.closest('section')).filter(Boolean));
  const rack = $('.rack');
  const levelObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      levels.set(e.target, e.intersectionRatio);
      if (e.target.id === 'studio' && rack) rack.style.setProperty('--lvl', Math.min(1, e.intersectionRatio * 1.6).toFixed(3));
    });
    wakeEq();
  }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
  eqSections.forEach((s) => levelObserver.observe(s));

  const playerEq = $('.p-eq');
  let energy = 0;                    // scroll energy, decays
  let eqRunning = false;
  const SPEED = { studio: 1, acoustic: 0.6, live: 1.7 };
  const drawEq = (now) => {
    const t = now / 1000 * (SPEED[root.dataset.mode] || 1);
    let active = false;
    eqSections.forEach((s) => {
      const lvl = levels.get(s) || 0;
      const eq = $('.eq', s);
      if (!eq) return;
      if (lvl > 0.005) active = true;
      const amp = Math.min(1, lvl * 1.4);
      [...eq.children].forEach((bar, i) => {
        const n = 0.5 + 0.5 * Math.sin(t * (2.1 + i * 0.37) + i * 1.7) * Math.sin(t * (1.3 + i * 0.21) + i);
        bar.style.transform = `scaleY(${(0.1 + amp * (0.2 + 0.8 * Math.abs(n))).toFixed(3)})`;
      });
    });
    if (playerEq) {
      const amp = Math.min(1, energy + (sound.on ? 0.65 : 0));
      if (amp > 0.01) active = true;
      [...playerEq.children].forEach((bar, i) => {
        const n = Math.abs(Math.sin(t * (2.6 + i * 0.5) + i * 2.1));
        bar.style.transform = `scaleY(${(0.12 + amp * 0.88 * n).toFixed(3)})`;
      });
    }
    energy *= 0.94;
    if (active && !still && !document.hidden) requestAnimationFrame(drawEq);
    else eqRunning = false;
  };
  function wakeEq() {
    if (still) { drawEq(1000); return; }
    if (eqRunning || document.hidden) return;
    eqRunning = true;
    requestAnimationFrame(drawEq);
  }
  document.addEventListener('visibilitychange', wakeEq);

  /* ---------- Reveal ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
      if (e.target.classList.contains('unit')) setTimeout(() => e.target.classList.add('lit'), 500);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => revealObserver.observe(el));

  /* ---------- Scroll: needle, now playing, track progress ---------- */
  const nav = $('.nav');
  const player = $('#player');
  const pCode = $('#pCode'), pTitle = $('#pTitle'), pSide = $('#pSide'), pTime = $('#pTime'), pLen = $('#pLen'), pFill = $('#pFill');
  const navLinks = $$('.nav-links a');
  const navFor = { tracks: 'tracks', 'side-a': 'tracks', 'side-b': 'tracks', a1: 'tracks', a2: 'tracks', a3: 'tracks', b1: 'tracks', b2: 'tracks', b3: 'tracks', b4: 'tracks', studio: 'studio', awards: 'awards', training: 'awards', credits: 'credits', bonus: 'credits' };
  const tlLinks = new Map($$('.tl a').map((a) => [a.getAttribute('href').slice(1), a]));
  const toSec = (t) => { if (!t || !t.includes(':')) return 0; const [m, s] = t.split(':').map(Number); return m * 60 + s; };
  const fmt = (n) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  let tracks = [];
  const collect = () => { tracks = $$('[data-track]').filter((el) => !el.hidden); };
  collect();

  let current = null, lastY = window.scrollY, spinTimer = 0;
  function onFrame() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = Math.max(1, root.scrollHeight - vh);
    const prog = Math.min(1, Math.max(0, y / max));

    if (nav) nav.classList.toggle('scrolled', y > 20);

    // needle: 20deg at the outer groove, 38deg near the label
    if (dropped) root.style.setProperty('--arm', `${(20 + 18 * prog).toFixed(2)}deg`);
    root.style.setProperty('--arm-mini', `${(8 + 26 * prog).toFixed(2)}deg`);

    // which track is under the needle?
    const probe = y + vh * 0.42;
    let idx = 0;
    const tops = tracks.map((el) => el.getBoundingClientRect().top + y);
    tops.forEach((top, i) => { if (top <= probe) idx = i; });
    const el = tracks[idx];
    if (el) {
      const top = tops[idx];
      const end = idx + 1 < tracks.length ? tops[idx + 1] : root.scrollHeight - vh * 0.58;
      const frac = Math.min(1, Math.max(0, (probe - top) / Math.max(1, end - top)));
      if (el !== current) {
        current = el;
        pCode.textContent = el.dataset.code;
        pTitle.textContent = el.dataset.title;
        pSide.textContent = el.dataset.side;
        pLen.textContent = el.dataset.len;
        tlLinks.forEach((a, id) => a.classList.toggle('is-playing', id === el.id));
        const key = navFor[el.id] || navFor[el.closest('section') && el.closest('section').id];
        navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${key}`));
      }
      const len = toSec(el.dataset.len);
      pTime.textContent = len ? fmt(frac * len) : '∞';
      pFill.style.transform = `scaleX(${frac.toFixed(4)})`;
    }

    // waveforms fill as you read through each track
    $$('.track').forEach((t) => {
      const r = t.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.62 - r.top) / Math.max(1, r.height)));
      const w = $('.wave', t);
      if (w) w.style.setProperty('--p', p.toFixed(4));
      t.classList.toggle('on-air', r.top < vh * 0.7 && r.bottom > vh * 0.25);
      if (t._words) {
        const n = t._words.length;
        const upto = Math.floor(Math.min(1, p * 1.6) * n);
        if (t._lit !== upto) {
          t._lit = upto;
          t._words.forEach((wd, i) => { wd.classList.toggle('lit', i < upto); wd.classList.toggle('now', i === upto - 1 && upto < n); });
        }
      }
    });
    sideGrids.forEach((side) => {
      let on = side.items[0];
      side.items.forEach((t) => { if (t.getBoundingClientRect().top < vh * 0.5) on = t; });
      if (on && on !== side.current) { side.current = on; setLabel(side, on, true); }
    });

    if (player) {
      player.classList.toggle('show', (dropped && y > vh * 0.35) || sound.on);
      const dy = Math.abs(y - lastY);
      if (dy > 1) {
        energy = Math.min(1, energy + dy / 260);
        wakeEq();
        player.classList.add('spinning');
        clearTimeout(spinTimer);
        spinTimer = setTimeout(() => { if (!sound.on && !root.classList.contains('ended')) player.classList.remove('spinning'); }, 600);
      }
    }
    lastY = y;
  }
  let ticking = false;
  function requestFrame() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onFrame(); });
  }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame, { passive: true });
  window.addEventListener('load', requestFrame);

  const jump = (dir) => {
    const i = Math.max(0, Math.min(tracks.length - 1, tracks.indexOf(current) + dir));
    const target = tracks[i];
    const top = i === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: still ? 'auto' : 'smooth' });
  };
  $('#pPrev').addEventListener('click', () => jump(-1));
  $('#pNext').addEventListener('click', () => jump(1));

  /* ---------- Hidden track ---------- */
  const hiddenBtn = $('#hiddenBtn');
  const bonus = $('#bonus');
  if (hiddenBtn && bonus) {
    hiddenBtn.addEventListener('click', () => {
      if (!bonus.hidden) { bonus.scrollIntoView({ behavior: still ? 'auto' : 'smooth' }); return; }
      bonus.hidden = false;
      hiddenBtn.setAttribute('aria-expanded', 'true');
      hiddenBtn.firstChild.textContent = 'Now playing: the hidden track ';
      eqSections.add(bonus);
      levelObserver.observe(bonus);
      collect();
      requestAnimationFrame(() => bonus.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' }));
    });
  }

  /* Awards wall: tap to spread the discs on touch screens */
  const wall = $('#wall');
  if (wall) wall.addEventListener('click', () => wall.classList.toggle('open'));

  /* ---------- The end: the record winds down, gets signed, and can be flipped ---------- */
  const runout = $('#runout');
  if (runout) {
    const pRec = $('.p-record');
    let windRaf = 0;
    const setRate = (target, ms) => {
      if (!pRec || still) return;
      cancelAnimationFrame(windRaf);
      const anims = pRec.getAnimations ? pRec.getAnimations() : [];
      if (!anims.length) return;
      const from = anims[0].playbackRate || 1, start = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - start) / ms);
        const r = from + (target - from) * (1 - Math.pow(1 - k, 3));
        anims.forEach((a) => { a.playbackRate = Math.max(0.0001, r); });
        if (k < 1) windRaf = requestAnimationFrame(step);
      };
      windRaf = requestAnimationFrame(step);
    };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio > 0.45) {
        if (!root.classList.contains('ended')) {
          root.classList.add('ended');
          runout.classList.add('signed');
          player.classList.add('spinning');
          setRate(0, 2600);                        // the platter coasts to a stop
        }
      } else if (e.intersectionRatio < 0.2 && root.classList.contains('ended')) {
        root.classList.remove('ended');
        setRate(1, 900);
      }
    }, { threshold: [0, 0.2, 0.45, 0.7] }).observe(runout);

    const flipBtn = $('#flipBtn');
    if (flipBtn) flipBtn.addEventListener('click', () => {
      if (still) { window.scrollTo({ top: 0 }); return; }
      runout.classList.add('flipping');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // drop the record onto the platter again
        root.classList.add('intro', 'replay');
        root.classList.remove('played', 'needle', 'skip');
        dropped = false;
        const waitTop = () => {
          if (window.scrollY > 40) { requestAnimationFrame(waitTop); return; }
          runout.classList.remove('flipping');
          requestAnimationFrame(() => {
            root.classList.add('played');
            setTimeout(() => { root.classList.add('needle'); dropped = true; requestFrame(); }, 2150);
          });
        };
        requestAnimationFrame(waitTop);
      }, 750);
    });
  }

  /* Visual only: no sound */
  const sound = { on: false };

  setMode(root.dataset.mode || 'studio');
  onFrame();
  wakeEq();
})();
