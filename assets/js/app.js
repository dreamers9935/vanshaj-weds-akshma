/* =========================================================
   Vanshaj & Akshma — page behaviour
   Gate & music, section moods for the 3D world, reveal and
   date animations, and the per-event interactions:
   flowers for Ganesh, haldi on the idols, akshat on the kalash,
   a playable dholak, fireworks for the baraat, sky lanterns.
   ========================================================= */
import { createFX, PAL } from './fx.js';

const doc = document;
const body = doc.body;
const $ = (s, c = doc) => c.querySelector(s);
const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
const mobile = coarse || innerWidth < 760;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const TAU = Math.PI * 2;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};
const gsap = window.gsap || null;
const animate = gsap && !reduce;

const fx = createFX($('#fx'), { reduce, coarse });

/* ---------- 3D world (optional: the page works without it) ---------- */
let world = null;
try {
  const { createWorld } = await import('./world.js');
  world = createWorld($('#world'), { mobile, reduce, adaptive: !/[?&]hq\b/.test(location.search) });
  world.start();
} catch (err) {
  console.warn('3D world unavailable:', err);
  body.classList.add('no-webgl');
}
const W = (fn) => { if (world) { try { fn(world); } catch (e) { console.warn(e); } } };
const toWorld = (x, y, z) => (world ? world.screenToWorld(x, y, z) : null);

/* =========================================================
   Sound — music from the invitation video + small effects
   ========================================================= */
const Sound = (() => {
  const music = $('#music');
  const btn = $('#musicBtn');
  const LOOP_AT = 15.3; // the vandana plays once, then the melody loops
  const LINES = [[0.5, 4.35], [4.35, 7.95], [7.95, 11.95], [11.95, 15.25]];
  const lineEls = $$('.shloka .line');
  let wanted = store.get('va3d-sound') !== 'off';
  let playing = false;
  let ctx = null;
  let sfx = null;
  let noiseBuf = null;
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* unsupported */ }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    sfx = ctx.createGain();
    sfx.gain.value = 0.9;
    sfx.connect(ctx.destination);
    return ctx;
  }
  function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }

  function setUI(on) {
    btn.classList.toggle('is-playing', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'संगीत बंद करें' : 'संगीत चालू करें');
  }
  function play(fromStart) {
    unlock();
    if (fromStart) { try { music.currentTime = 0; } catch (e) { /* not loaded yet */ } }
    music.volume = 0.9;
    playing = true;
    setUI(true);
    const p = music.play();
    if (p && p.catch) p.catch(() => { playing = false; setUI(false); });
  }
  function pause() { playing = false; music.pause(); setUI(false); }

  function karaoke(t) {
    const i = t < LOOP_AT ? LINES.findIndex(([a, b]) => t >= a && t < b) : -1;
    lineEls.forEach((el, k) => el.classList.toggle('is-sung', k === i && playing));
  }
  music.addEventListener('timeupdate', () => {
    const d = music.duration;
    if (d && music.currentTime > d - 0.25) music.currentTime = LOOP_AT;
    karaoke(music.currentTime);
  });
  music.addEventListener('ended', () => {
    if (!playing) return;
    music.currentTime = LOOP_AT;
    music.play().catch(() => {});
  });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    wanted = !playing;
    store.set('va3d-sound', wanted ? 'on' : 'off');
    if (wanted) play(false); else { pause(); karaoke(99); }
  });
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) music.pause();
    else if (playing) music.play().catch(() => {});
  });

  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function tone(freq, gain, decay, { type = 'sine', at = 0, glide = 0 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, t + decay * 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g);
    g.connect(sfx);
    o.start(t);
    o.stop(t + decay + 0.05);
  }
  function hiss(gain, decay, { type = 'highpass', freq = 2500, at = 0 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource();
    s.buffer = noise();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    s.connect(f); f.connect(g); g.connect(sfx);
    s.start(t, Math.random() * 0.3);
    s.stop(t + decay + 0.05);
  }
  const ok = () => playing && ctx;

  return {
    start() { unlock(); if (wanted) play(true); else setUI(false); },
    get on() { return playing; },
    bell() { if (!ok()) return; [[1, 0.12, 3.4], [2.01, 0.06, 2.4], [2.76, 0.045, 1.8], [5.4, 0.02, 1]].forEach(([r, a, d]) => tone(440 * r, a, d)); },
    chime() { if (!ok()) return; const f = pick([1318.5, 1568, 1760, 2093]); tone(f, 0.035, 0.9); tone(f * 2.76, 0.01, 0.4); },
    pop(k = 1) {
      if (!ok()) return;
      hiss(0.12 * k, 0.4, { type: 'lowpass', freq: 1400 });
      for (let i = 0; i < 5; i++) hiss(0.03 * k, 0.05, { at: 0.22 + Math.random() * 0.5, freq: 3000 });
    },
    dha() { if (!ok()) return; tone(150, 0.5, 0.55, { glide: 0.45 }); hiss(0.05, 0.05, { type: 'lowpass', freq: 600 }); },
    ta() { if (!ok()) return; tone(520, 0.16, 0.18, { type: 'triangle' }); hiss(0.08, 0.07, { type: 'bandpass', freq: 3200 }); },
  };
})();

/* =========================================================
   Smooth scrolling
   ========================================================= */
let lenis = null;
if (window.Lenis && !reduce) {
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  lenis.stop();
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
const progressBar = $('#progress');
let lastY = scrollY;
let lastT = performance.now();
function onScroll() {
  const limit = Math.max(1, doc.documentElement.scrollHeight - innerHeight);
  const y = lenis ? lenis.scroll : scrollY;
  const now = performance.now();
  const v = lenis ? lenis.velocity * 60 : ((y - lastY) / Math.max(1, now - lastT)) * 1000;
  lastY = y;
  lastT = now;
  const p = Math.min(1, Math.max(0, y / limit));
  progressBar.style.transform = `scaleX(${p})`;
  W((w) => w.setScroll(p, v));
}
if (lenis) lenis.on('scroll', onScroll);
else addEventListener('scroll', onScroll, { passive: true });

function scrollToEl(target) {
  if (!target) return;
  if (lenis) lenis.scrollTo(target, { duration: 1.6 });
  else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const t = id.length > 1 ? $(id) : null;
    if (!t) return;
    e.preventDefault();
    scrollToEl(t);
  });
});

/* =========================================================
   Gate
   ========================================================= */
const gate = $('#gate');
let opened = false;

const fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2800))]).then(async () => {
  body.classList.remove('is-loading');
  try { await doc.fonts.load('600 120px "Cormorant Garamond"'); } catch (e) { /* fallback font */ }
  W((w) => w.prepareNumbers(['02', '03', '04']));
});

function openInvite() {
  if (opened) return;
  opened = true;
  Sound.start();
  gate.classList.add('is-open');
  body.classList.add('is-open');
  body.classList.remove('is-locked');
  if (lenis) lenis.start();
  W((w) => w.bloomLotus());
  setTimeout(() => {
    fx.shower('mix', mobile ? 36 : 56, 3600);
    W((w) => {
      w.burst(w.screenToWorld(innerWidth * 0.3, innerHeight * 0.3, -10), { pal: ['#fff3c4', '#ffd977', '#ff9eb5'], n: 120, type: 'ring' });
      setTimeout(() => w.burst(w.screenToWorld(innerWidth * 0.7, innerHeight * 0.25, -10), { pal: ['#fff3c4', '#ffd977', '#ff9eb5'], n: 120 }), 450);
    });
  }, 900);
  setTimeout(() => gate.remove(), 3400);
  startReveals();
  if (location.hash && $(location.hash)) setTimeout(() => scrollToEl($(location.hash)), 1600);
}
gate.addEventListener('click', openInvite);
doc.addEventListener('keydown', (e) => { if (!opened && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openInvite(); } });

/* =========================================================
   Reveal animations
   ========================================================= */
$$('[data-words]').forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ');
});
if (animate) {
  gsap.set('[data-reveal]', { opacity: 0, y: 36 });
  gsap.set('[data-words] .word', { opacity: 0, y: 18, rotateX: -50 });
  gsap.set('.tcard', { opacity: 0, rotateY: -70, z: -200, y: 30 });
  gsap.set('.dayhead > *', { opacity: 0 });
}

function startReveals() {
  if (!animate) return;
  const io = new IntersectionObserver((entries) => {
    let k = 0;
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      const delay = (k++) * 0.09;
      if (el.hasAttribute('data-words')) {
        gsap.to(el.querySelectorAll('.word'), { opacity: 1, y: 0, rotateX: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay });
      } else {
        gsap.to(el, { opacity: 1, y: 0, duration: 1.05, ease: 'power3.out', delay });
      }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
  $$('[data-reveal], [data-words]').forEach((el) => io.observe(el));
}

/* Date headers — digits flip in like a card being turned */
// A date header plays once it is in view AND its section owns the 3D world.
function tryHead(head) {
  if (!opened || !head._visible || head.closest('.sec') !== current) return;
  if (head._played && performance.now() - head._played < 8000) return;
  head._played = performance.now();
  playHead(head);
}
const headIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    e.target._visible = e.isIntersecting;
    tryHead(e.target);
  });
}, { threshold: 0.6 });
$$('.dayhead').forEach((h) => headIO.observe(h));

function playHead(head) {
  const digits = $$('.digit', head);
  const sec = head.closest('.sec');
  const pal = sec.id === 'haldi' ? PAL.haldi : sec.id === 'mandha' ? PAL.dusk : PAL.festive;
  if (animate) {
    gsap.set($('.dayhead__date', head), { opacity: 1 });
    const tl = gsap.timeline();
    tl.fromTo($('.dayhead__ord', head), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
      .fromTo(digits, { opacity: 0, rotateX: -110, y: 50, scale: 0.8 }, { opacity: 1, rotateX: 0, y: 0, scale: 1, duration: 1.1, ease: 'back.out(1.6)', stagger: 0.16 }, '-=.2')
      .fromTo($('.dayhead__meta', head), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6 }, '-=.6')
      .fromTo($('.dayhead__line', head), { opacity: 0, scaleX: 0 }, { opacity: 0.6, scaleX: 1, duration: 0.8, ease: 'power2.out' }, '-=.4');
  }
  // golden (or haldi) particles swarm in and form the date over the numerals, then scatter
  const style = NUM_STYLE[sec.id] || { color: '#ffd98a', alpha: 0.9 };
  const token = showNumber(sec.dataset.num, $('.dayhead__date', head), style, 3400);
  setTimeout(() => {
    const r = $('.dayhead__date', head).getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    fx.burst(r.left + r.width / 2, r.top + r.height / 2, { pal, n: 56, speed: 4.2 });
    Sound.chime();
  }, 700);
  return token;
}

// Particle dates: one at a time, anchored to a numeral on the page.
let numToken = 0;
function showNumber(key, el, style, hold) {
  const token = ++numToken;
  W((w) => w.setNumberAt(key, el.getBoundingClientRect(), style));
  if (hold) {
    setTimeout(() => {
      if (token !== numToken) return;
      W((w) => {
        const r = el.getBoundingClientRect();
        w.setNumber(null);
        if (r.bottom > 0 && r.top < innerHeight) {
          const c = w.screenToWorld(r.left + r.width / 2, r.top + r.height / 2, -6);
          w.burst(c, { pal: style.light ? ['#ffd400', '#ffb300', '#fff3b0'] : ['#fff3c4', '#ffd977', '#ffffff'], n: 90, speed: 0.09, type: 'ring' });
        }
      });
    }, hold);
  }
  return token;
}
function releaseNumber() { numToken++; W((w) => w.setNumber(null)); }

/* =========================================================
   Section moods → 3D world
   ========================================================= */
const NUM_STYLE = {
  haldi: { color: '#f59e0b', alpha: 0.8, light: true },
  mandha: { color: '#ffd36b', alpha: 0.95 },
  baraat: { color: '#bfe9ff', alpha: 0.95 },
};
let current = null;
const tithiTimers = [];
const lastEnter = {};

const hooks = {
  aamantran() { fx.shower('rose', mobile ? 18 : 28, 2600); },
  tithi() { playTithi(); },
  haldi() { fx.shower('marigold', mobile ? 24 : 36, 3200); },
  baraat() {
    W((w) => {
      w.rocket({ x: -3, onBoom: () => Sound.pop(0.7) });
      setTimeout(() => w.rocket({ x: 3, onBoom: () => Sound.pop(0.7) }), 500);
    });
  },
  parivar() {
    W((w) => {
      for (let i = 0; i < 5; i++) setTimeout(() => w.launchLantern(w.screenToWorld(innerWidth * rnd(0.15, 0.85), innerHeight * 0.95, -5)), i * 350);
    });
  },
  sampark() {
    W((w) => {
      w.burst(w.screenToWorld(innerWidth * 0.25, innerHeight * 0.25, -10), { pal: ['#fff3c4', '#ffd977', '#ff9eb5'] });
      setTimeout(() => w.burst(w.screenToWorld(innerWidth * 0.75, innerHeight * 0.2, -10)), 500);
    });
  },
};

function setSection(sec) {
  if (sec === current) return;
  current = sec;
  const mood = sec.dataset.mood;
  body.dataset.mood = mood;
  body.classList.toggle('theme-dark', sec.classList.contains('sec--dark'));
  $$('.daylinks a').forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === '#' + sec.id));
  tithiTimers.splice(0).forEach(clearTimeout);
  releaseNumber();
  W((w) => w.setMood(mood));
  const head = $('.dayhead', sec);
  if (head) tryHead(head);
  if (opened && sec.id === 'tithi') { hooks.tithi(); return; }
  if (opened && hooks[sec.id] && (!lastEnter[sec.id] || performance.now() - lastEnter[sec.id] > 6000)) {
    lastEnter[sec.id] = performance.now();
    hooks[sec.id]();
  }
}

const moodIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) setSection(e.target); });
}, { rootMargin: '-48% 0px -48% 0px', threshold: 0 });
$$('.sec').forEach((s) => moodIO.observe(s));

/* Dates intro: the cards turn in one by one; a swarm of light flies from date to date */
function playTithi() {
  const cards = $$('.tcard');
  const keys = ['02', '03', '04'];
  const STEP = 1300;
  if (animate) gsap.to(cards, { opacity: 1, rotateY: 0, z: 0, y: 0, duration: 1.1, ease: 'power3.out', stagger: STEP / 1000 });
  keys.forEach((k, i) => tithiTimers.push(setTimeout(() => {
    const last = i === keys.length - 1;
    showNumber(k, $('.tcard__num', cards[i]), { color: '#ffe2a0', alpha: 1, fill: 0.7 }, last ? 2600 : 0);
    cards.forEach((c, j) => c.classList.toggle('is-lit', j === i));
    const r = cards[i].getBoundingClientRect();
    fx.burst(r.left + r.width / 2, r.top + r.height * 0.4, { pal: [PAL.haldi, PAL.dusk, PAL.festive][i], n: 40 });
    Sound.chime();
  }, 450 + i * STEP)));
  tithiTimers.push(setTimeout(() => cards.forEach((c) => c.classList.remove('is-lit')), 450 + keys.length * STEP + 2600));
}

/* =========================================================
   Pointer: parallax, card tilt, sparkle trail
   ========================================================= */
addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') W((w) => w.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1)));
}, { passive: true });
addEventListener('deviceorientation', (e) => {
  if (e.gamma == null || e.beta == null) return;
  W((w) => w.setPointer(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (45 - e.beta) / 30))));
}, { passive: true });

if (!coarse && !reduce) {
  $$('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add('is-tilting');
      el.style.setProperty('--ry', (x * 12).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
}

let trailAt = 0;
let pressed = false;
addEventListener('pointerdown', () => { pressed = true; }, { passive: true });
addEventListener('pointerup', () => { pressed = false; }, { passive: true });
addEventListener('pointermove', (e) => {
  if (!opened || reduce) return;
  const now = performance.now();
  if (now - trailAt < (pressed ? 18 : 45)) return;
  trailAt = now;
  if (pressed || e.pointerType === 'mouse') fx.sparkle(e.clientX, e.clientY, { n: pressed ? 3 : 1 });
}, { passive: true });

/* =========================================================
   Interactions
   ========================================================= */
// Shri Ganesh — offer flowers
$('#ganeshCard').addEventListener('click', (e) => {
  const r = e.currentTarget.querySelector('.arch__frame').getBoundingClientRect();
  fx.dropOn(r, 'mix', mobile ? 30 : 44);
  fx.sparkle(e.clientX, e.clientY, { n: 8 });
  Sound.bell();
  W((w) => w.burst(w.screenToWorld(r.left + r.width / 2, r.top + r.height * 0.3, -4), { pal: PAL.gold, n: 90, speed: 0.1, type: 'ring' }));
});

// Couple — hearts
$$('.person').forEach((p) => p.addEventListener('click', (e) => {
  fx.heart(e.clientX, e.clientY);
  Sound.chime();
  W((w) => w.burst(w.screenToWorld(e.clientX, e.clientY, -6), { pal: PAL.rose, type: 'heart', n: 120, speed: 0.1 }));
}));

// Haldi — sprinkle turmeric on the idols
const HALDI = ['#ffd400', '#ffc21a', '#f6a700', '#ffe066', '#e89400'];
$$('[data-powder]').forEach((card) => {
  const cv = card.querySelector('canvas');
  const g = cv.getContext('2d', { willReadFrequently: true });
  let sized = false;
  let count = 0;
  let blessed = false;
  let lastAt = 0;

  function size() {
    const r = card.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(r.width * dpr);
    const h = Math.round(r.height * dpr);
    if (!w || !h || (cv.width === w && cv.height === h)) return;
    let prev = null;
    if (sized) { prev = document.createElement('canvas'); prev.width = cv.width; prev.height = cv.height; prev.getContext('2d').drawImage(cv, 0, 0); }
    cv.width = w;
    cv.height = h;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (prev) g.drawImage(prev, 0, 0, r.width, r.height);
    sized = true;
  }
  function paint(x, y) {
    const r = card.getBoundingClientRect();
    const rad = Math.max(26, r.width * 0.13);
    const grd = g.createRadialGradient(x, y, 0, x, y, rad * 1.3);
    grd.addColorStop(0, 'rgba(255,200,0,.5)');
    grd.addColorStop(1, 'rgba(255,200,0,0)');
    g.globalAlpha = 1;
    g.fillStyle = grd;
    g.fillRect(x - rad * 1.3, y - rad * 1.3, rad * 2.6, rad * 2.6);
    for (let i = 0; i < 110; i++) {
      const a = Math.random() * TAU;
      const d = Math.pow(Math.random(), 0.6) * rad;
      g.globalAlpha = rnd(0.55, 0.95);
      g.fillStyle = pick(HALDI);
      g.beginPath();
      g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rnd(0.8, 2.8), 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  function coverage() {
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let on = 0;
    let n = 0;
    for (let i = 3; i < d.length; i += 4 * 37) { n++; if (d[i] > 90) on++; }
    return n ? on / n : 0;
  }
  function sprinkle(e) {
    size();
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    paint(x, y);
    fx.powder(e.clientX, e.clientY, mobile ? 10 : 16);
    if (++count % 3 === 1) W((w) => w.powderBurst(w.screenToWorld(e.clientX, e.clientY, -3), undefined, 26));
    if (count % 4 === 0) {
      const c = coverage();
      card.querySelector('.powder__meter i').style.setProperty('--p', Math.min(100, Math.round((c / 0.34) * 100)) + '%');
      if (!blessed && c >= 0.34) {
        blessed = true;
        card.classList.add('is-blessed');
        fx.dropOn(r, 'marigold', 40);
        fx.burst(r.left + r.width / 2, r.top + r.height * 0.4, { pal: PAL.haldi, n: 70 });
        Sound.bell();
        W((w) => w.burst(w.screenToWorld(r.left + r.width / 2, r.top + r.height * 0.3, -4), { pal: ['#ffd400', '#ffc21a', '#fff3b0', '#ff9f1a'], n: 130 }));
      }
    }
  }
  card.addEventListener('pointerdown', (e) => { lastAt = performance.now(); sprinkle(e); });
  card.addEventListener('pointermove', (e) => {
    if (!(e.buttons & 1) || e.pointerType === 'touch') return;
    const now = performance.now();
    if (now - lastAt < 45) return;
    lastAt = now;
    sprinkle(e);
  });
  addEventListener('resize', () => { if (sized) size(); });
});

// Haldi sky — tap anywhere for a cloud of haldi
// (handled in the section tap router below)

// Mandha poojan — akshat and flowers on the kalash
$('#kalashCard').addEventListener('click', (e) => {
  const r = e.currentTarget.querySelector('.event__photo').getBoundingClientRect();
  fx.dropOn(r, 'akshat', mobile ? 50 : 70);
  Sound.bell();
});

// Preetibhoj — spin the thali
$('#bhojCard').addEventListener('click', (e) => {
  const card = e.currentTarget;
  card.classList.remove('is-spun');
  void card.offsetWidth;
  card.classList.add('is-spun');
  const r = card.querySelector('.thali').getBoundingClientRect();
  for (let i = 0; i < 6; i++) fx.sparkle(r.left + rnd(0, r.width), r.top + rnd(0, r.height), { n: 3 });
  Sound.chime();
});

// Mahila sangeet — a playable dholak
let beats = 0;
$$('[data-drum]').forEach((head) => {
  head.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const kind = head.dataset.drum;
    if (kind === 'dha') Sound.dha(); else Sound.ta();
    head.classList.add('is-hit');
    setTimeout(() => head.classList.remove('is-hit'), 140);
    const r = head.getBoundingClientRect();
    fx.notes(r.left + r.width / 2, r.top, kind === 'dha' ? 2 : 1);
    fx.burst(r.left + r.width / 2, r.top + r.height / 2, { pal: PAL.dusk, n: 14, speed: 2.4 });
    W((w) => w.stagePulse(pick(['#ff3fa4', '#8a5cff', '#3fd6ff', '#ffd36b'])));
    if (++beats % 10 === 0) fx.shower('mix', 22, 1800);
  });
  head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); head.dispatchEvent(new PointerEvent('pointerdown')); } });
});

// Baraat — fireworks show
$('#fireBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  W((w) => {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => w.rocket({ onBoom: () => Sound.pop(0.8) }), i * 260);
    }
  });
  if (!world) fx.shower('mix', 40, 2500);
});

/* Taps on the open sky of each section */
const own = 'a, button, [data-powder], .dholak, #kalashCard, #bhojCard, #ganeshCard, .person, .tcard, .topbar';
addEventListener('click', (e) => {
  if (!opened || e.target.closest(own)) return;
  const sec = e.target.closest('.sec');
  if (!sec) return;
  const x = e.clientX;
  const y = e.clientY;
  switch (sec.id) {
    case 'haldi':
      fx.powder(x, y, 22);
      W((w) => w.powderBurst(w.screenToWorld(x, y, -4), undefined, 60));
      break;
    case 'mandha':
      fx.notes(x, y, 3);
      fx.burst(x, y, { pal: PAL.dusk, n: 36 });
      W((w) => w.stagePulse());
      Sound.chime();
      break;
    case 'baraat':
    case 'sampark':
      W((w) => {
        const p = w.screenToWorld(x, y, -10);
        w.rocket({ x: p.x, y: p.y, z: -10, onBoom: () => Sound.pop(0.8) });
      });
      if (!world) fx.burst(x, y, { pal: PAL.festive, n: 60 });
      break;
    case 'parivar':
      W((w) => w.launchLantern(w.screenToWorld(x, y, -5)));
      fx.sparkle(x, y, { n: 6, pal: ['#ffb347', '#ffd36b', '#fff0c2'] });
      Sound.chime();
      break;
    default:
      fx.burst(x, y, { pal: sec.id === 'aamantran' ? PAL.rose : PAL.gold, n: 40 });
      Sound.chime();
  }
});

W((w) => { w.onAutoBoom = () => Sound.pop(0.45); });

/* =========================================================
   Countdown
   ========================================================= */
const cd = $('#countdown');
if (cd) {
  const target = Date.parse(cd.dataset.target);
  const out = {};
  $$('[data-cd]', cd).forEach((el) => { out[el.dataset.cd] = el; });
  const pad = (n) => String(n).padStart(2, '0');
  const set = (el, v) => {
    if (el.textContent === v) return;
    el.textContent = v;
    if (!reduce && el.animate) el.animate([{ transform: 'rotateX(-90deg)', opacity: 0.2 }, { transform: 'rotateX(0)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  };
  let timer = 0;
  const tick = () => {
    let diff = target - Date.now();
    if (!(diff > 0)) {
      cd.previousElementSibling.hidden = true;
      cd.hidden = true;
      clearInterval(timer);
      return;
    }
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const h = Math.floor(diff / 36e5); diff -= h * 36e5;
    const m = Math.floor(diff / 6e4); diff -= m * 6e4;
    set(out.d, pad(d)); set(out.h, pad(h)); set(out.m, pad(m)); set(out.s, pad(Math.floor(diff / 1e3)));
  };
  tick();
  timer = setInterval(tick, 1000);
}
