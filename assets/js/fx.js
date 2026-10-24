/* =========================================================
   2D effects drawn above the page: sparkles, small bursts,
   petals, akshat (rice), haldi powder and music notes.
   ========================================================= */
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

export const PAL = {
  gold: ['#fff3c4', '#ffd977', '#f2b94b', '#ffe9b0', '#ffffff'],
  rose: ['#ff7aa8', '#ff3d6e', '#ffd1e0', '#ffd36b'],
  haldi: ['#ffd400', '#ffc21a', '#f6a700', '#ffe066'],
  festive: ['#ffd36b', '#ff8a3d', '#ff4f7a', '#ffffff', '#7fd8ff', '#c9a0ff'],
  dusk: ['#ff5fb4', '#c77dff', '#ffd36b', '#7fd8ff'],
};
const PETAL_COLORS = {
  rose: [['#9e0d32', '#f2577e'], ['#c2123f', '#ff8fae'], ['#e8577f', '#ffd1dc']],
  marigold: [['#f27a00', '#ffc23d'], ['#ff9500', '#ffd75e'], ['#e86a00', '#ffb000']],
};
PETAL_COLORS.mix = PETAL_COLORS.rose.concat(PETAL_COLORS.marigold);

export function createFX(canvas, { reduce = false, coarse = false } = {}) {
  const ctx = canvas.getContext('2d');
  const sparks = [];
  const flakes = [];
  const LIMIT = coarse ? 700 : 1300;
  let w = 0;
  let h = 0;
  let raf = 0;
  let last = 0;

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
  }
  size();
  window.addEventListener('resize', size);

  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };

  function spark(o) {
    if (sparks.length >= LIMIT) return;
    o.px = o.x;
    o.py = o.y;
    sparks.push(o);
  }

  /* ---------- Emitters ---------- */
  function burst(x, y, { pal = PAL.gold, n = 48, speed = 3.4 } = {}) {
    if (reduce) return;
    const k = Math.min(w, h) / 640;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(-0.08, 0.08);
      const v = speed * Math.max(0.7, k) * Math.pow(Math.random(), 0.45);
      spark({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color: pick(pal), life: 1, decay: rnd(0.014, 0.024), g: 0.035, drag: 0.972, size: rnd(1.2, 2.2), flicker: Math.random() < 0.35 });
    }
    kick();
  }

  function heart(x, y, pal = PAL.rose) {
    if (reduce) return;
    const s = 0.22 * Math.max(0.75, Math.min(w, h) / 640);
    for (let i = 0; i < 70; i++) {
      const t = (i / 70) * TAU;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      spark({ x, y, vx: hx * s, vy: hy * s, color: pick(pal), life: 1, decay: 0.012, g: 0.008, drag: 0.952, size: 2 });
    }
    kick();
  }

  function sparkle(x, y, { n = 2, pal = PAL.gold } = {}) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      spark({ star: true, x: x + rnd(-7, 7), y: y + rnd(-7, 7), vx: rnd(-0.7, 0.7), vy: rnd(-1.2, -0.1), color: pick(pal), life: 1, decay: rnd(0.022, 0.04), g: 0.012, drag: 0.95, size: rnd(1.6, 3.4) });
    }
    kick();
  }

  // Petals or rice falling onto an element (rect from getBoundingClientRect)
  function dropOn(rect, kind = 'mix', count = 30) {
    if (reduce) return;
    for (let i = 0; i < count; i++) {
      const rice = kind === 'rice' || (kind === 'akshat' && Math.random() < 0.65);
      flakes.push({
        rice,
        x: rnd(rect.left + rect.width * 0.08, rect.right - rect.width * 0.08),
        y: rect.top - rnd(10, 140),
        vy: rnd(1.6, 3.2), vx: rnd(-0.5, 0.5),
        floor: rnd(rect.top + rect.height * 0.35, rect.bottom - 6),
        rot: rnd(0, TAU), vr: rnd(-0.12, 0.12), flip: rnd(0, TAU), vf: rnd(0.05, 0.12), sway: rnd(0, TAU),
        size: rice ? rnd(3, 4.5) : rnd(6, 11), c: pick(PETAL_COLORS[kind === 'akshat' ? 'marigold' : kind] || PETAL_COLORS.mix),
        life: 1, landed: false,
      });
    }
    kick();
  }

  // Petals across the whole screen
  function shower(kind = 'mix', count = 40, dur = 3000) {
    if (reduce) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        flakes.push({
          x: rnd(-20, w + 20), y: rnd(-60, -12), vy: rnd(1, 2.2), vx: rnd(-0.4, 0.4), floor: h + 40,
          rot: rnd(0, TAU), vr: rnd(-0.05, 0.05), flip: rnd(0, TAU), vf: rnd(0.03, 0.08), sway: rnd(0, TAU),
          size: rnd(6, 12), c: pick(PETAL_COLORS[kind] || PETAL_COLORS.mix), life: 1, landed: false,
        });
        kick();
      }, rnd(0, dur));
    }
  }

  // A soft cloud of haldi
  function powder(x, y, n = 18) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU);
      const v = rnd(0.4, 2.4);
      spark({ puff: true, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, color: pick(PAL.haldi), life: 1, decay: rnd(0.012, 0.022), g: -0.01, drag: 0.94, size: rnd(6, 16) });
    }
    kick();
  }

  function notes(x, y, n = 3, pal = ['#ffd36b', '#ffc2e0', '#ffffff', '#c9b6ff']) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      flakes.push({ note: true, glyph: pick(['♪', '♫', '♩', '♬']), x: x + rnd(-14, 14), y, vy: -rnd(1, 2.2), vx: rnd(-0.9, 0.9), size: rnd(18, 30), c: pick(pal), life: 1, sway: rnd(0, TAU), rot: rnd(-0.3, 0.3) });
    }
    kick();
  }

  /* ---------- Loop ---------- */
  function drawStar(s) {
    const r = s.size * (0.6 + s.life) * 1.6;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - r);
    ctx.quadraticCurveTo(s.x, s.y, s.x + r, s.y);
    ctx.quadraticCurveTo(s.x, s.y, s.x, s.y + r);
    ctx.quadraticCurveTo(s.x, s.y, s.x - r, s.y);
    ctx.quadraticCurveTo(s.x, s.y, s.x, s.y - r);
    ctx.fill();
  }

  function loop(t) {
    const dt = last ? Math.min(3, (t - last) / 16.667) : 1;
    last = t;
    ctx.clearRect(0, 0, w, h);

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.px = s.x;
      s.py = s.y;
      const d = Math.pow(s.drag, dt);
      s.vx *= d;
      s.vy = s.vy * d + s.g * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= s.decay * dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      let a = Math.min(1, s.life * 1.2);
      if (s.flicker && s.life < 0.5 && Math.random() < 0.5) a *= 0.25;
      if (s.puff) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a * 0.55;
        const r = s.size * (1.6 - s.life * 0.6);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        g.addColorStop(0, s.color);
        g.addColorStop(1, 'rgba(255,200,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, TAU);
        ctx.fill();
        continue;
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      if (s.star) {
        drawStar(s);
      } else {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(s.px - s.vx * 1.6, s.py - s.vy * 1.6);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    for (let i = flakes.length - 1; i >= 0; i--) {
      const p = flakes[i];
      if (p.note) {
        p.sway += 0.05 * dt;
        p.x += (p.vx + Math.sin(p.sway) * 0.4) * dt;
        p.y += p.vy * dt;
        p.life -= 0.012 * dt;
        if (p.life <= 0) { flakes.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        ctx.fillStyle = p.c;
        ctx.font = Math.round(p.size) + 'px serif';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillText(p.glyph, 0, 0);
        ctx.restore();
        continue;
      }
      if (!p.landed) {
        p.sway += 0.04 * dt;
        p.x += (p.vx + Math.sin(p.sway) * 0.7) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.flip += p.vf * dt;
        if (p.y >= p.floor) { p.landed = true; p.y = p.floor; }
      } else {
        p.life -= 0.012 * dt;
        if (p.life <= 0) { flakes.splice(i, 1); continue; }
      }
      if (p.y > h + 40) { flakes.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 1.4) * 0.95;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.rice) {
        ctx.fillStyle = '#fff8e8';
        ctx.strokeStyle = 'rgba(160,120,60,.35)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.42, p.size, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
      } else {
        const s = p.size;
        ctx.scale(Math.max(0.2, Math.abs(Math.cos(p.flip))), 1);
        const g = ctx.createLinearGradient(0, -s, 0, s);
        g.addColorStop(0, p.c[1]);
        g.addColorStop(1, p.c[0]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.95, -s * 0.6, s * 0.75, s * 0.75, 0, s);
        ctx.bezierCurveTo(-s * 0.75, s * 0.75, -s * 0.95, -s * 0.6, 0, -s);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (sparks.length || flakes.length) raf = requestAnimationFrame(loop);
    else { raf = 0; ctx.clearRect(0, 0, w, h); }
  }

  return { burst, heart, sparkle, dropOn, shower, powder, notes };
}
