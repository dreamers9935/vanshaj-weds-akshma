/* =========================================================
   The 3D world behind the invitation.
   A golden 3D mandala, floating shapes, moving lights and a
   set piece for every event — the sky moves from dawn to night
   as the guest scrolls through the wedding days.
   ========================================================= */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export const PALETTES = {
  gold: ['#fff3c4', '#ffd977', '#f2b94b', '#ffe9b0', '#ffffff'],
  rose: ['#ff7aa8', '#ff3d6e', '#ffd1e0', '#ffd36b'],
  haldi: ['#ffe14d', '#ffc21a', '#ff9f1a', '#fff3b0'],
  festive: ['#ffd36b', '#ff8a3d', '#ff4f7a', '#ffffff', '#7fd8ff', '#c9a0ff', '#7dffb0'],
  dusk: ['#ff5fb4', '#c77dff', '#ffd36b', '#7fd8ff', '#ffffff'],
  lantern: ['#ffb347', '#ffd36b', '#fff0c2', '#ff8a3d'],
};

/* Each mood: sky (top, middle, bottom), fog, lights, bloom and accents. */
/* Light moods keep bloom above 1.0 so only flames, sparks and gems glow. */
const MOODS = {
  dawn: {
    sky: ['#f6c39e', '#fff0dc', '#f3d2b2'], fog: '#fbe7d2', fogD: 0.012,
    hemi: ['#fff4e2', '#c98f62', 0.95], sun: ['#ffe2b0', 1.5], a: ['#ffb347', 14], b: ['#ff7aa8', 10],
    bloom: 0.32, threshold: 1.02, gold: 0.02, env: 0.42, enamel: '#a3243f', gem: '#e0457b', petal: '#f7a8c4', dust: '#c98a2e', stars: 0, tilt: 0,
  },
  blush: {
    sky: ['#efb0c2', '#fff0ec', '#f2cdbf'], fog: '#fbe3e5', fogD: 0.012,
    hemi: ['#fff1f3', '#c98898', 0.95], sun: ['#ffe0d0', 1.4], a: ['#ff7aa8', 14], b: ['#ffc46b', 10],
    bloom: 0.32, threshold: 1.02, gold: 0.02, env: 0.42, enamel: '#b0184e', gem: '#c2185b', petal: '#ff9eb5', dust: '#c97a92', stars: 0, tilt: 0,
  },
  royal: {
    sky: ['#12030b', '#3b0d1f', '#6a1a34'], fog: '#2a0a17', fogD: 0.018,
    hemi: ['#7a3448', '#140409', 0.5], sun: ['#ffd08a', 0.45], a: ['#ffc35a', 34], b: ['#ff4f81', 24],
    bloom: 0.72, threshold: 0.82, gold: 0.12, env: 0.75, enamel: '#7a1236', gem: '#ffd36b', petal: '#ffd1dc', dust: '#ffd98a', stars: 0.35, tilt: 0,
  },
  haldi: {
    sky: ['#ffc23a', '#fff1b0', '#ffd463'], fog: '#ffe89a', fogD: 0.011,
    hemi: ['#fff7c8', '#c98a00', 1.0], sun: ['#fff0b0', 1.6], a: ['#ffb300', 12], b: ['#ff7a00', 10],
    bloom: 0.3, threshold: 1.02, gold: 0.02, env: 0.4, enamel: '#c2410c', gem: '#ff8f00', petal: '#ffc107', dust: '#c77d00', stars: 0, tilt: 0,
  },
  dusk: {
    sky: ['#2a1150', '#a3326a', '#f0905a'], fog: '#6a2556', fogD: 0.016,
    hemi: ['#ffb0c8', '#2a0f3a', 0.7], sun: ['#ffb37a', 0.9], a: ['#ff3fa4', 40], b: ['#7c4dff', 34],
    bloom: 0.78, threshold: 0.8, gold: 0.1, env: 0.7, enamel: '#6a1b9a', gem: '#ff4fb0', petal: '#ffd36b', dust: '#ffd6f0', stars: 0.2, tilt: 0,
  },
  night: {
    sky: ['#02040f', '#0b0e33', '#241350'], fog: '#090a24', fogD: 0.012,
    hemi: ['#3a4a8a', '#05030f', 0.4], sun: ['#9fb4ff', 0.3], a: ['#5ad1ff', 30], b: ['#ff5ad1', 30],
    bloom: 0.95, threshold: 0.74, gold: 0.1, env: 0.7, enamel: '#1a237e', gem: '#7fd8ff', petal: '#ffd36b', dust: '#ffffff', stars: 1, tilt: 0.1,
  },
  lantern: {
    sky: ['#040720', '#141038', '#3d1a30'], fog: '#110b28', fogD: 0.013,
    hemi: ['#ffb36b', '#0a0614', 0.45], sun: ['#ffb36b', 0.35], a: ['#ff9a3d', 36], b: ['#ffcf6b', 26],
    bloom: 0.9, threshold: 0.76, gold: 0.1, env: 0.7, enamel: '#7a2e0e', gem: '#ffb347', petal: '#ffd36b', dust: '#ffe0a8', stars: 0.85, tilt: 0.06,
  },
  finale: {
    sky: ['#10031a', '#3a0b2a', '#6b1a38'], fog: '#2a0a1f', fogD: 0.015,
    hemi: ['#ff9ab8', '#12030a', 0.5], sun: ['#ffd08a', 0.5], a: ['#ffd36b', 36], b: ['#ff4f81', 30],
    bloom: 0.85, threshold: 0.78, gold: 0.1, env: 0.75, enamel: '#8a1d3c', gem: '#ffd36b', petal: '#ff9eb5', dust: '#ffd98a', stars: 0.6, tilt: 0.04,
  },
};

/* Which set pieces appear in which mood. */
const SHOW = {
  dawn: ['lotus', 'diyas'],
  blush: ['roses'],
  royal: [],
  haldi: ['marigolds', 'beams', 'turmeric'],
  dusk: ['toran', 'kalash', 'stage', 'notes'],
  night: ['bulbs'],
  lantern: ['lanterns'],
  finale: ['lanterns', 'roses'],
};

/* ---------------------------------------------------------
   Shared shapes & textures
   --------------------------------------------------------- */
function petalShape(len = 1, wid = 0.36) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(wid * 1.1, len * 0.22, wid * 0.9, len * 0.78, 0, len);
  s.bezierCurveTo(-wid * 0.9, len * 0.78, -wid * 1.1, len * 0.22, 0, 0);
  return s;
}

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const flameTexture = () => canvasTexture(128, (g, s) => {
  const grd = g.createRadialGradient(s / 2, s * 0.62, 2, s / 2, s * 0.58, s * 0.46);
  grd.addColorStop(0, 'rgba(255,255,240,1)');
  grd.addColorStop(0.25, 'rgba(255,214,120,.95)');
  grd.addColorStop(0.6, 'rgba(255,120,30,.45)');
  grd.addColorStop(1, 'rgba(255,80,0,0)');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(s / 2, s * 0.06);
  g.bezierCurveTo(s * 0.78, s * 0.4, s * 0.8, s * 0.72, s / 2, s * 0.95);
  g.bezierCurveTo(s * 0.2, s * 0.72, s * 0.22, s * 0.4, s / 2, s * 0.06);
  g.fill();
});

const glowTexture = () => canvasTexture(128, (g, s) => {
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
});

const noteTexture = (glyph) => canvasTexture(128, (g, s) => {
  g.fillStyle = '#ffffff';
  g.font = '96px serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(255,255,255,.8)';
  g.shadowBlur = 12;
  g.fillText(glyph, s / 2, s / 2 + 6);
});

/* Soft-point shader used by sparks, dust, stars and the date particles. */
function pointsMaterial({ additive = true, hdr = 2.2, twinkle = 0 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uScale: { value: 400 },
      uHdr: { value: hdr },
      uAlpha: { value: 1 },
      uTime: { value: 0 },
      uTwinkle: { value: twinkle },
      uTint: { value: new THREE.Color(1, 1, 1) },
    },
    vertexShader: /* glsl */`
      attribute float aSize;
      attribute float aAlpha;
      attribute vec3 aColor;
      uniform float uScale;
      uniform float uTime;
      uniform float uTwinkle;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * 2.3 + position.x * 7.1 + position.y * 3.7));
        vAlpha = aAlpha * tw;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uHdr;
      uniform float uAlpha;
      uniform vec3 uTint;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        a = pow(a, 1.5);
        gl_FragColor = vec4(vColor * uTint * (1.0 + uHdr * a * a), a * vAlpha * uAlpha);
      }`,
  });
}

/* ---------------------------------------------------------
   Particle pool (fireworks, fountains, powder)
   --------------------------------------------------------- */
class Sparks {
  constructor(cap, opts) {
    this.cap = cap;
    this.pos = new Float32Array(cap * 3);
    this.vel = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 3);
    this.alpha = new Float32Array(cap);
    this.size = new Float32Array(cap);
    this.base = new Float32Array(cap);
    this.life = new Float32Array(cap);
    this.decay = new Float32Array(cap);
    this.grav = new Float32Array(cap);
    this.drag = new Float32Array(cap);
    this.flick = new Uint8Array(cap);
    this.split = new Uint8Array(cap);
    this.cursor = 0;
    this.awake = false;
    const geo = new THREE.BufferGeometry();
    const mk = (arr, n) => new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
    this.aPos = mk(this.pos, 3);
    this.aCol = mk(this.col, 3);
    this.aAlpha = mk(this.alpha, 1);
    this.aSize = mk(this.size, 1);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('aColor', this.aCol);
    geo.setAttribute('aAlpha', this.aAlpha);
    geo.setAttribute('aSize', this.aSize);
    this.material = pointsMaterial(opts);
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.onSplit = null;
  }

  emit(x, y, z, vx, vy, vz, color, size, decay, grav, drag, flick = 0, split = 0) {
    const i = this.cursor;
    this.cursor = (i + 1) % this.cap;
    const j = i * 3;
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z;
    this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    this.col[j] = color.r; this.col[j + 1] = color.g; this.col[j + 2] = color.b;
    this.size[i] = this.base[i] = size;
    this.life[i] = 1;
    this.alpha[i] = 1;
    this.decay[i] = decay;
    this.grav[i] = grav;
    this.drag[i] = drag;
    this.flick[i] = flick;
    this.split[i] = split;
    this.awake = true;
  }

  update(dt) {
    if (!this.awake) return;
    const f = dt * 60;
    let any = false;
    for (let i = 0; i < this.cap; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= this.decay[i] * f;
      if (this.life[i] <= 0) {
        this.alpha[i] = 0;
        if (this.split[i] && this.onSplit) this.onSplit(this, i);
        continue;
      }
      any = true;
      const j = i * 3;
      const d = Math.pow(this.drag[i], f);
      this.vel[j] *= d;
      this.vel[j + 1] = this.vel[j + 1] * d - this.grav[i] * f;
      this.vel[j + 2] *= d;
      this.pos[j] += this.vel[j] * f;
      this.pos[j + 1] += this.vel[j + 1] * f;
      this.pos[j + 2] += this.vel[j + 2] * f;
      let a = Math.min(1, this.life[i] * 1.3);
      if (this.flick[i] && this.life[i] < 0.5 && Math.random() < 0.45) a *= 0.2;
      this.alpha[i] = a;
      this.size[i] = this.base[i] * (0.55 + 0.45 * this.life[i]);
    }
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aAlpha.needsUpdate = this.aSize.needsUpdate = true;
    this.awake = any;
  }
}

/* ---------------------------------------------------------
   World
   --------------------------------------------------------- */
export function createWorld(canvas, { mobile = false, reduce = false, adaptive = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance', alpha: false });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  camera.position.set(0, 0, 14);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.fog = new THREE.FogExp2(0xfbe7d2, 0.011);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.6, 0.55, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let useComposer = true;

  /* ---------- Lights ---------- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x886644, 1.1);
  const sun = new THREE.DirectionalLight(0xffe2b0, 2);
  sun.position.set(6, 10, 8);
  const lightA = new THREE.PointLight(0xffb347, 30, 0, 1);
  const lightB = new THREE.PointLight(0xff7aa8, 20, 0, 1);
  const flashes = [new THREE.PointLight(0xffffff, 0, 0, 1.2), new THREE.PointLight(0xffffff, 0, 0, 1.2)];
  scene.add(hemi, sun, lightA, lightB, ...flashes);

  /* ---------- Materials ---------- */
  const goldMat = new THREE.MeshStandardMaterial({ color: '#c8963e', metalness: 1, roughness: 0.32, emissive: '#3a2206', emissiveIntensity: 0.05 });
  const brightGold = new THREE.MeshStandardMaterial({ color: '#e8bb5e', metalness: 1, roughness: 0.22 });
  const enamelMat = new THREE.MeshStandardMaterial({ color: '#a3243f', metalness: 0.25, roughness: 0.3, emissive: '#2a0610', emissiveIntensity: 0.2 });
  const gemMat = new THREE.MeshStandardMaterial({ color: '#e0457b', metalness: 0.15, roughness: 0.08, flatShading: true, emissive: '#e0457b', emissiveIntensity: 0.25 });
  const petalMat = new THREE.MeshStandardMaterial({ color: '#f7a8c4', metalness: 0.2, roughness: 0.45, side: THREE.DoubleSide, emissive: '#5a1030', emissiveIntensity: 0.2 });
  const pearlMat = new THREE.MeshStandardMaterial({ color: '#fff4e6', metalness: 0.15, roughness: 0.18 });

  /* ---------- Sky ---------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uTime: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; uniform float uTime;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 col = h > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.5, h)) : mix(uMid, uBot, smoothstep(0.0, 0.42, -h));
        float glow = exp(-pow(length(vec2(vDir.x * 0.9, h + 0.05)) * 2.2, 2.0));
        col += uMid * glow * 0.18;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  /* ---------- Stars ---------- */
  const STAR_N = mobile ? 700 : 1400;
  const stars = (() => {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(STAR_N * 3);
    const c = new Float32Array(STAR_N * 3);
    const a = new Float32Array(STAR_N);
    const s = new Float32Array(STAR_N);
    for (let i = 0; i < STAR_N; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * TAU;
      const r = Math.sqrt(1 - u * u);
      const R = 120;
      p.set([Math.cos(th) * r * R, Math.abs(u) * R * 0.9 - 8, -Math.abs(Math.sin(th) * r) * R], i * 3);
      const tint = Math.random();
      c.set(tint < 0.2 ? [1, 0.85, 0.7] : tint < 0.35 ? [0.75, 0.85, 1] : [1, 1, 1], i * 3);
      a[i] = rnd(0.4, 1);
      s[i] = rnd(0.25, 0.9);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(c, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(a, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
    const mat = pointsMaterial({ hdr: 1.4, twinkle: 0.6 });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, mat };
  })();

  /* ---------- Golden 3D mandala ---------- */
  const mandala = (() => {
    const group = new THREE.Group();
    const petalGeo = new THREE.ExtrudeGeometry(petalShape(1, 0.36), {
      depth: 0.04, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.045, bevelSegments: 2, curveSegments: mobile ? 8 : 11,
    });
    const rings = [];
    let r = 0.8;
    for (let i = 0; i < 9; i++) {
      const s = 0.8 + i * 0.13;
      const n = Math.max(8, Math.round((TAU * r) / (s * 0.55) / 4) * 4);
      rings.push({ n, r, s, z: 0.6 - i * 0.16 });
      r += s * 0.82;
    }
    const halves = [new THREE.Group(), new THREE.Group()];
    const q = new THREE.Quaternion();
    const qz = new THREE.Quaternion();
    const qx = new THREE.Quaternion();
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const Z = new THREE.Vector3(0, 0, 1);
    const X = new THREE.Vector3(1, 0, 0);
    [0, 1].forEach((half) => {
      const list = rings.filter((_, i) => i % 2 === half);
      const total = list.reduce((acc, ring) => acc + ring.n, 0);
      const petals = new THREE.InstancedMesh(petalGeo, half ? enamelMat : goldMat, total);
      const pearls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), pearlMat, total);
      let k = 0;
      list.forEach((ring) => {
        for (let i = 0; i < ring.n; i++) {
          const a = (i / ring.n) * TAU + (half ? Math.PI / ring.n : 0);
          qz.setFromAxisAngle(Z, a - Math.PI / 2);
          qx.setFromAxisAngle(X, half ? 0.42 : -0.42);
          q.copy(qz).multiply(qx);
          pos.set(Math.cos(a) * ring.r, Math.sin(a) * ring.r, ring.z);
          scl.setScalar(ring.s);
          m.compose(pos, q, scl);
          petals.setMatrixAt(k, m);
          const tip = ring.r + ring.s * 1.02;
          pos.set(Math.cos(a) * tip, Math.sin(a) * tip, ring.z + 0.05);
          scl.setScalar(ring.s);
          m.compose(pos, q, scl);
          pearls.setMatrixAt(k, m);
          k++;
        }
        const torus = new THREE.Mesh(new THREE.TorusGeometry(ring.r - 0.05, 0.022 * ring.s, 6, 160), brightGold);
        torus.position.z = ring.z;
        halves[half].add(torus);
      });
      halves[half].add(petals, pearls);
      group.add(halves[half]);
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 2), new THREE.MeshStandardMaterial({ color: '#f3d27c', metalness: 0.9, roughness: 0.15, emissive: '#ffb84a', emissiveIntensity: 0.15, flatShading: true }));
    core.position.z = 0.9;
    group.add(core);
    group.position.set(0, 0, -30);
    group.rotation.x = -0.22;
    scene.add(group);
    return { group, halves, core, spin: 0 };
  })();

  /* ---------- Floating shapes ---------- */
  const shapes = (() => {
    const group = new THREE.Group();
    const defs = [
      { geo: new THREE.TorusGeometry(0.34, 0.075, 14, 48), mat: goldMat, n: mobile ? 14 : 24, s: 1 },
      { geo: new THREE.OctahedronGeometry(0.3, 0), mat: gemMat, n: mobile ? 12 : 20, s: 1 },
      { geo: new THREE.ExtrudeGeometry(petalShape(1, 0.36), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 1, curveSegments: 8 }), mat: petalMat, n: mobile ? 16 : 28, s: 0.5 },
      { geo: new THREE.SphereGeometry(0.12, 16, 12), mat: pearlMat, n: mobile ? 18 : 34, s: 1 },
    ];
    const items = [];
    defs.forEach((d) => {
      const mesh = new THREE.InstancedMesh(d.geo, d.mat, d.n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < d.n; i++) {
        let x;
        const z = rnd(-18, 3);
        do { x = rnd(-17, 17); } while (z > -6 && Math.abs(x) < 3.5);
        items.push({
          mesh, i, x, y0: rnd(-14, 14), z, s: d.s * rnd(0.7, 1.35),
          rx: rnd(0, TAU), ry: rnd(0, TAU), vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), ph: rnd(0, TAU),
        });
      }
      group.add(mesh);
    });
    scene.add(group);
    return { group, items, offset: 0 };
  })();

  /* ---------- Ambient dust ---------- */
  const DUST_N = mobile ? 500 : 1000;
  const dust = (() => {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(DUST_N * 3);
    const c = new Float32Array(DUST_N * 3).fill(1);
    const a = new Float32Array(DUST_N);
    const s = new Float32Array(DUST_N);
    const v = new Float32Array(DUST_N);
    for (let i = 0; i < DUST_N; i++) {
      p.set([rnd(-20, 20), rnd(-14, 14), rnd(-22, 8)], i * 3);
      a[i] = rnd(0.25, 0.9);
      s[i] = rnd(0.04, 0.12);
      v[i] = rnd(0.002, 0.008);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(c, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(a, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
    const mat = pointsMaterial({ hdr: 1.6, twinkle: 0.45 });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, mat, p, v, geo };
  })();

  /* ---------- Sparks: fireworks & powder ---------- */
  const fire = new Sparks(mobile ? 3500 : 7000, { additive: true, hdr: 2.6 });
  const powder = new Sparks(mobile ? 900 : 1600, { additive: false, hdr: 0 });
  scene.add(fire.points, powder.points);
  const tmpColor = new THREE.Color();
  fire.onSplit = (sys, i) => {
    const j = i * 3;
    tmpColor.setRGB(sys.col[j], sys.col[j + 1], sys.col[j + 2]);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      sys.emit(sys.pos[j], sys.pos[j + 1], sys.pos[j + 2], Math.cos(a) * 0.05, Math.sin(a) * 0.05, rnd(-0.02, 0.02), tmpColor, 0.18, 0.035, 0.0012, 0.95, 1);
    }
  };

  /* ---------- Date particles ---------- */
  const NUM_N = mobile ? 1500 : 2600;
  const numbers = (() => {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(NUM_N * 3);
    const c = new Float32Array(NUM_N * 3);
    const a = new Float32Array(NUM_N);
    const s = new Float32Array(NUM_N);
    const scatter = new Float32Array(NUM_N * 3);
    const speed = new Float32Array(NUM_N);
    for (let i = 0; i < NUM_N; i++) {
      const ang = rnd(0, TAU);
      const rad = rnd(7, 14);
      scatter.set([Math.cos(ang) * rad, Math.sin(ang) * rad * 0.6, rnd(-3, 2)], i * 3);
      p.set([scatter[i * 3], scatter[i * 3 + 1], scatter[i * 3 + 2]], i * 3);
      c.set([1, 0.85, 0.5], i * 3);
      a[i] = rnd(0.5, 1);
      s[i] = rnd(0.07, 0.16);
      speed[i] = rnd(0.035, 0.08);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(c, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(a, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
    const mat = pointsMaterial({ hdr: 2, twinkle: 0.25 });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.position.z = -6;
    scene.add(pts);
    return {
      pts, mat, geo, p, c, scatter, speed, targets: {},
      key: null, x: 0, y: 0, scale: 1, alpha: 0.35, targetAlpha: 0.35, color: new THREE.Color('#ffd98a'), light: false,
    };
  })();

  function prepareNumbers(keys, font = '600 360px "Cormorant Garamond", serif') {
    const W = 1024;
    const H = 512;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    keys.forEach((key) => {
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#fff';
      g.font = font;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(key, W / 2, H / 2 + 10);
      const d = g.getImageData(0, 0, W, H).data;
      const pts = [];
      for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (d[(y * W + x) * 4 + 3] > 140) pts.push(x, y);
      const t = new Float32Array(NUM_N * 3);
      const count = pts.length / 2;
      for (let i = 0; i < NUM_N; i++) {
        const k = ((Math.random() * count) | 0) * 2;
        t[i * 3] = ((pts[k] + rnd(-1.5, 1.5)) / W - 0.5) * 10;
        t[i * 3 + 1] = -((pts[k + 1] + rnd(-1.5, 1.5)) / H - 0.5) * 5;
        t[i * 3 + 2] = rnd(-0.35, 0.35);
      }
      numbers.targets[key] = t;
    });
  }

  function setNumber(key, { x = 0, y = 0, scale = 1, alpha = 1, color } = {}) {
    numbers.key = key && numbers.targets[key] ? key : null;
    numbers.x = x;
    numbers.y = y;
    numbers.scale = scale;
    numbers.targetAlpha = numbers.key ? alpha : 0.32;
    if (color) numbers.color.set(color);
  }

  // Form a date exactly over a numeral on the page (rect from getBoundingClientRect).
  function setNumberAt(key, rect, { alpha = 1, color, fill = 0.72 } = {}) {
    const z = numbers.pts.position.z;
    const c = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, z);
    const { hh } = frustum(z);
    const perPx = (2 * hh) / innerHeight;
    const GLYPH_H = 2.2; // height of a digit at scale 1 (600 360px Cormorant on a 512px canvas = 5 units)
    setNumber(key, { x: c.x, y: c.y, scale: (rect.height * fill * perPx) / GLYPH_H, alpha, color });
    return c;
  }

  /* ---------- Set pieces ---------- */
  const pieces = {};
  const piece = (name, group, apply, update) => {
    pieces[name] = { group, vis: 0, target: 0, apply, update };
    group.visible = false;
    scene.add(group);
  };

  // Lotus (opening)
  const lotus = (() => {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.08, side: THREE.DoubleSide, emissive: '#5a0f2e', emissiveIntensity: 0.35 });
    const c0 = new THREE.Color('#fff6f8');
    const c1 = new THREE.Color('#ff8fbd');
    const c2 = new THREE.Color('#d9286a');
    const cc = new THREE.Color();
    const makeGeo = (len, wid) => {
      const g = new THREE.ExtrudeGeometry(petalShape(len, wid), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 2, curveSegments: 14 });
      const pa = g.attributes.position;
      const col = new Float32Array(pa.count * 3);
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i);
        const y = pa.getY(i);
        const t = clamp(y / len, 0, 1);
        pa.setZ(i, pa.getZ(i) - 0.34 * len * t * t + (x * x) / wid * 0.5);
        cc.copy(c0).lerp(c1, smooth(clamp(t / 0.6, 0, 1))).lerp(c2, smooth(clamp((t - 0.6) / 0.4, 0, 1)));
        col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    };
    const layers = [
      { n: 9, len: 2.4, wid: 0.8, r: 0.38, open: 1.2, closed: 0.3, off: 0 },
      { n: 9, len: 2.0, wid: 0.68, r: 0.26, open: 0.82, closed: 0.18, off: TAU / 18 },
      { n: 7, len: 1.55, wid: 0.56, r: 0.16, open: 0.45, closed: 0.08, off: 0 },
    ];
    const petals = [];
    layers.forEach((L, li) => {
      const geo = makeGeo(L.len, L.wid);
      for (let i = 0; i < L.n; i++) {
        const pivot = new THREE.Object3D();
        pivot.rotation.y = (i / L.n) * TAU + L.off;
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.z = L.r;
        mesh.rotation.x = L.closed;
        pivot.add(mesh);
        group.add(pivot);
        petals.push({ mesh, open: L.open, closed: L.closed, delay: li * 0.16 + i * 0.015 });
      }
    });
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.34, 32), brightGold);
    pod.position.y = 0.32;
    group.add(pod);
    for (let i = 0; i < 7; i++) {
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshStandardMaterial({ color: '#7a5a12', roughness: 0.4, metalness: 0.6 }));
      const a = (i / 6) * TAU;
      seed.position.set(i ? Math.cos(a) * 0.24 : 0, 0.5, i ? Math.sin(a) * 0.24 : 0);
      group.add(seed);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(2.2, 1.2, 1.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.set(7, 7, 1);
    glow.position.y = 0.6;
    group.add(glow);
    return { group, petals, glow, bloom: 0, target: 0 };
  })();
  piece('lotus', lotus.group, (v) => {
    const { hh } = frustum(0);
    lotus.group.scale.setScalar(Math.max(0.001, v) * (camera.aspect < 0.8 ? 0.85 : 1.15));
    lotus.group.position.set(0, -hh * (camera.aspect < 0.8 ? 0.8 : 0.7), 0);
    lotus.group.rotation.x = 0.42;
  }, (dt, t) => {
    lotus.bloom += (lotus.target - lotus.bloom) * Math.min(1, dt * 0.9);
    lotus.petals.forEach((p) => {
      const e = easeOut(clamp(lotus.bloom * 1.35 - p.delay, 0, 1));
      p.mesh.rotation.x = p.closed + (p.open - p.closed) * e + Math.sin(t * 0.9 + p.delay * 9) * 0.02;
    });
    lotus.group.rotation.y = t * 0.12;
    lotus.glow.material.opacity = 0.35 + 0.35 * lotus.bloom;
  });

  // Diyas circling Shri Ganesh
  const diyas = (() => {
    const group = new THREE.Group();
    const prof = [[0, 0], [0.42, 0], [0.58, 0.08], [0.68, 0.2], [0.72, 0.3], [0.64, 0.34], [0.48, 0.25], [0.28, 0.21], [0, 0.21]].map(([x, y]) => new THREE.Vector2(x, y));
    const clay = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), new THREE.MeshStandardMaterial({ color: '#b5562b', roughness: 0.75 }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.035, 8, 48), brightGold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.31;
    const tex = flameTexture();
    const list = [];
    const N = 8;
    for (let i = 0; i < N; i++) {
      const d = new THREE.Group();
      d.add(clay.clone(), rim.clone());
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(4, 2.4, 1.1), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      flame.scale.set(0.38, 0.62, 1);
      flame.position.y = 0.62;
      d.add(flame);
      d.scale.setScalar(0.8);
      group.add(d);
      list.push({ d, flame, a: (i / N) * TAU, ph: rnd(0, TAU) });
    }
    return { group, list };
  })();
  piece('diyas', diyas.group, (v) => { diyas.group.scale.setScalar(v); }, (dt, t) => {
    const rx = mobile ? 4.2 : 8;
    diyas.list.forEach((o) => {
      const a = o.a + t * 0.18;
      o.d.position.set(Math.cos(a) * rx, -3.2 + Math.sin(a * 2 + o.ph) * 0.15, Math.sin(a) * 3 - 4);
      const f = 1 + Math.sin(t * 13 + o.ph) * 0.08 + Math.sin(t * 7.3 + o.ph * 2) * 0.06;
      o.flame.scale.set(0.38 * f, 0.62 * f * 1.05, 1);
    });
  });

  // Falling rose petals
  const roses = (() => {
    const N = mobile ? 40 : 70;
    const geo = new THREE.ExtrudeGeometry(petalShape(1, 0.5), { depth: 0.01, bevelEnabled: false, curveSegments: 8 });
    const mat = new THREE.MeshStandardMaterial({ color: '#e8456f', roughness: 0.5, side: THREE.DoubleSide, emissive: '#5a0820', emissiveIntensity: 0.3 });
    const mesh = new THREE.InstancedMesh(geo, mat, N);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const c = new THREE.Color();
    const data = [];
    for (let i = 0; i < N; i++) {
      data.push({ x: rnd(-16, 16), y: rnd(-12, 14), z: rnd(-12, 4), vy: rnd(0.6, 1.4), rx: rnd(0, TAU), rz: rnd(0, TAU), sp: rnd(0.6, 1.6), ph: rnd(0, TAU), s: rnd(0.16, 0.3) });
      mesh.setColorAt(i, c.set(pick(['#e8456f', '#ff7aa0', '#c2123f', '#ffb3c8'])));
    }
    const group = new THREE.Group();
    group.add(mesh);
    return { group, mesh, data };
  })();
  const m4 = new THREE.Matrix4();
  const qa = new THREE.Quaternion();
  const ea = new THREE.Euler();
  const va = new THREE.Vector3();
  const vs = new THREE.Vector3();
  piece('roses', roses.group, (v) => { roses.group.scale.setScalar(Math.max(0.001, v)); }, (dt, t) => {
    roses.data.forEach((d, i) => {
      d.y -= d.vy * dt;
      if (d.y < -14) { d.y = 14; d.x = rnd(-16, 16); }
      ea.set(d.rx + t * d.sp, t * d.sp * 0.7, d.rz + Math.sin(t + d.ph));
      qa.setFromEuler(ea);
      va.set(d.x + Math.sin(t * 0.8 + d.ph) * 0.8, d.y, d.z);
      vs.setScalar(d.s);
      m4.compose(va, qa, vs);
      roses.mesh.setMatrixAt(i, m4);
    });
    roses.mesh.instanceMatrix.needsUpdate = true;
  });

  // Marigolds for Haldi
  const marigolds = (() => {
    const group = new THREE.Group();
    const petalGeo = new THREE.CircleGeometry(0.17, 9);
    petalGeo.scale(1, 0.75, 1);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide, emissive: '#5a2a00', emissiveIntensity: 0.25 });
    const PER = mobile ? 70 : 90;
    const flowers = [];
    const Zax = new THREE.Vector3(0, 0, 1);
    const dir = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const q2 = new THREE.Quaternion();
    const c = new THREE.Color();
    const spots = [[-9, 5], [-11, -1], [-8, -6], [9, 5.5], [11, 0], [8.5, -6], [-4.5, 8], [4.5, -8.5], [-13, 6], [13, -5], [0, 9], [-1, -9.5]];
    spots.slice(0, mobile ? 8 : 12).forEach(([x, y], f) => {
      const mesh = new THREE.InstancedMesh(petalGeo, mat, PER);
      for (let i = 0; i < PER; i++) {
        const k = i + 0.5;
        const phi = Math.acos(1 - (2 * k) / PER);
        const th = Math.PI * (1 + Math.sqrt(5)) * k;
        dir.set(Math.cos(th) * Math.sin(phi), Math.sin(th) * Math.sin(phi), Math.cos(phi));
        q.setFromUnitVectors(Zax, dir);
        q2.setFromAxisAngle(dir, rnd(0, TAU));
        q.premultiply(q2);
        va.copy(dir).multiplyScalar(0.42 + rnd(-0.04, 0.05));
        vs.setScalar(rnd(0.8, 1.25));
        m4.compose(va, q, vs);
        mesh.setMatrixAt(i, m4);
        const yellow = f % 3 === 0;
        mesh.setColorAt(i, c.set(yellow ? pick(['#ffc400', '#ffd42a', '#ffb300']) : pick(['#ff8c00', '#ff7a00', '#ffa21f', '#f26a00'])));
      }
      const wrap = new THREE.Group();
      wrap.add(mesh);
      wrap.position.set(x * (mobile ? 0.45 : 1), y * (mobile ? 1.05 : 1), rnd(-8, -2));
      wrap.scale.setScalar(rnd(1.1, 1.9));
      group.add(wrap);
      flowers.push({ wrap, ph: rnd(0, TAU), sp: rnd(0.2, 0.5), y0: wrap.position.y });
    });
    return { group, flowers };
  })();
  piece('marigolds', marigolds.group, (v) => { marigolds.group.scale.setScalar(Math.max(0.001, v)); }, (dt, t) => {
    marigolds.flowers.forEach((f) => {
      f.wrap.rotation.set(t * f.sp, t * f.sp * 0.8, 0);
      f.wrap.position.y = f.y0 + Math.sin(t * 0.7 + f.ph) * 0.4;
    });
  });

  // Sunbeams for Haldi
  const beams = (() => {
    const group = new THREE.Group();
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uAlpha: { value: 0.22 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uAlpha; varying vec2 vUv; void main(){ float a = smoothstep(0.0,0.5,vUv.x) * smoothstep(1.0,0.5,vUv.x) * smoothstep(0.0,0.9,vUv.y); gl_FragColor = vec4(1.0, 0.98, 0.88, a * uAlpha); }',
    });
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(rnd(1.4, 3), 46), mat);
      b.position.set(-8 + i * 4, 9, -10 - i);
      b.rotation.z = -0.5 + i * 0.12;
      group.add(b);
    }
    return { group, mat };
  })();
  piece('beams', beams.group, (v) => { beams.mat.uniforms.uAlpha.value = 0.22 * v; }, (dt, t) => {
    beams.group.children.forEach((b, i) => { b.rotation.z = -0.5 + i * 0.12 + Math.sin(t * 0.3 + i) * 0.05; });
  });

  // Turmeric dust drifting in the Haldi sky
  const turmeric = { group: new THREE.Group(), clock: 0 };
  piece('turmeric', turmeric.group, () => {}, (dt) => {
    turmeric.clock += dt;
    if (turmeric.clock > 0.08 && pieces.turmeric.vis > 0.5) {
      turmeric.clock = 0;
      const c = tmpColor.set(pick(PALETTES.haldi));
      powder.emit(rnd(-16, 16), rnd(8, 12), rnd(-12, 0), rnd(-0.01, 0.01), 0, 0, c, rnd(0.25, 0.55), rnd(0.003, 0.006), 0.0006, 0.995);
    }
  });

  // Toran garlands for Mandha Poojan
  const toran = (() => {
    const group = new THREE.Group();
    const beadGeo = new THREE.IcosahedronGeometry(0.15, 1);
    const beadMat = new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true, emissive: '#4a1a00', emissiveIntensity: 0.3 });
    const leafShape = petalShape(0.55, 0.2);
    const leafGeo = new THREE.ShapeGeometry(leafShape, 6);
    const leafMat = new THREE.MeshStandardMaterial({ color: '#2f7d32', roughness: 0.55, side: THREE.DoubleSide });
    const beads = new THREE.InstancedMesh(beadGeo, beadMat, 260);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, 60);
    group.add(beads, leaves);
    return { group, beads, leaves };
  })();
  function layoutToran() {
    const z = -4;
    const { hw, hh } = frustum(z);
    const strings = [
      { x0: -hw * 1.05, x1: 0, y: hh * 0.98, sag: hh * 0.22 },
      { x0: 0, x1: hw * 1.05, y: hh * 0.98, sag: hh * 0.22 },
      { x0: -hw * 0.55, x1: hw * 0.55, y: hh * 1.02, sag: hh * 0.32 },
    ];
    let bi = 0;
    let li = 0;
    const c = new THREE.Color();
    strings.forEach((s, si) => {
      const len = s.x1 - s.x0;
      const n = Math.min(Math.floor(len / 0.3), 100);
      for (let i = 0; i <= n && bi < 260; i++) {
        const u = i / n;
        const x = s.x0 + len * u;
        const y = s.y - s.sag * (1 - Math.pow(2 * u - 1, 2));
        va.set(x, y, z - si * 0.6);
        qa.identity();
        vs.setScalar(1);
        m4.compose(va, qa, vs);
        toran.beads.setMatrixAt(bi, m4);
        toran.beads.setColorAt(bi, c.set(i % 4 < 2 ? '#ff8c00' : '#ffc400'));
        bi++;
        if (i % 6 === 3 && li < 60) {
          ea.set(0, 0, Math.PI + rnd(-0.2, 0.2));
          qa.setFromEuler(ea);
          va.set(x, y - 0.12, z - si * 0.6 + 0.05);
          m4.compose(va, qa, vs);
          toran.leaves.setMatrixAt(li++, m4);
        }
      }
    });
    toran.beads.count = bi;
    toran.leaves.count = li;
    toran.beads.instanceMatrix.needsUpdate = true;
    if (toran.beads.instanceColor) toran.beads.instanceColor.needsUpdate = true;
    toran.leaves.instanceMatrix.needsUpdate = true;
  }
  piece('toran', toran.group, (v) => { toran.group.position.y = (1 - v) * 6; }, (dt, t) => {
    toran.group.rotation.z = Math.sin(t * 0.6) * 0.008;
  });

  // Kalash for Mandha Poojan
  const kalash = (() => {
    const group = new THREE.Group();
    const prof = [[0, 0], [0.55, 0], [0.75, 0.15], [0.95, 0.45], [1.0, 0.7], [0.92, 1.0], [0.7, 1.2], [0.48, 1.3], [0.42, 1.42], [0.5, 1.5], [0.56, 1.56], [0.5, 1.6], [0.3, 1.6]].map(([x, y]) => new THREE.Vector2(x, y));
    const pot = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ color: '#c8742e', metalness: 0.95, roughness: 0.25 }));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.05, 10, 48), new THREE.MeshStandardMaterial({ color: '#d1122f', roughness: 0.6 }));
    band.rotation.x = Math.PI / 2;
    band.position.y = 1.33;
    const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), new THREE.MeshStandardMaterial({ color: '#7a4a26', roughness: 0.9 }));
    coconut.scale.set(1, 1.15, 1);
    coconut.position.y = 2.0;
    group.add(pot, band, coconut);
    const leafGeo = new THREE.ShapeGeometry(petalShape(0.95, 0.26), 8);
    const leafMat = new THREE.MeshStandardMaterial({ color: '#3d8b37', roughness: 0.5, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const pivot = new THREE.Object3D();
      pivot.position.y = 1.62;
      pivot.rotation.y = (i / 7) * TAU;
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.rotation.x = 1.05;
      leaf.position.z = 0.3;
      pivot.add(leaf);
      group.add(pivot);
    }
    const swastik = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 32), new THREE.MeshStandardMaterial({ color: '#d1122f' }));
    swastik.position.set(0, 0.72, 0.99);
    group.add(swastik);
    return { group };
  })();
  piece('kalash', kalash.group, (v) => { kalash.group.scale.setScalar(Math.max(0.001, v) * (mobile ? 0.95 : 1.45)); }, (dt, t) => {
    const { hw, hh } = frustum(-6);
    kalash.group.position.set(-hw * (mobile ? 0.62 : 0.72), -hh * (mobile ? 0.78 : 0.66), -6);
    kalash.group.rotation.y = t * 0.4;
  });

  // Sangeet stage lights
  const stage = (() => {
    const group = new THREE.Group();
    const cols = ['#ff3fa4', '#8a5cff', '#3fd6ff'];
    const cones = cols.map((col, i) => {
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(col) }, uAlpha: { value: 0.0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv; void main(){ float a = pow(vUv.y, 1.6) * (0.35 + 0.65 * sin(vUv.x * 3.14159)); gl_FragColor = vec4(uColor * 1.6, a * uAlpha); }',
      });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 22, 32, 1, true), mat);
      cone.geometry.translate(0, -11, 0);
      const pivot = new THREE.Group();
      pivot.add(cone);
      pivot.position.set(-9 + i * 9, 13, -12);
      group.add(pivot);
      return { pivot, mat, ph: i * 2.1 };
    });
    return { group, cones, flash: 0 };
  })();
  piece('stage', stage.group, (v) => { stage.cones.forEach((c) => { c.mat.uniforms.uAlpha.value = (0.26 + stage.flash * 0.5) * v; }); }, (dt, t) => {
    stage.flash *= Math.pow(0.08, dt);
    stage.cones.forEach((c) => { c.pivot.rotation.z = Math.sin(t * 0.7 + c.ph) * 0.5; c.pivot.rotation.x = Math.sin(t * 0.5 + c.ph) * 0.2; });
  });

  // Music notes floating up
  const notes = (() => {
    const group = new THREE.Group();
    const texs = ['♪', '♫', '♩', '♬'].map(noteTexture);
    const list = [];
    for (let i = 0; i < (mobile ? 10 : 16); i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pick(texs), color: new THREE.Color(pick(['#ffd36b', '#ffc2e0', '#ffffff', '#c9b6ff'])).multiplyScalar(1.6), transparent: true, depthWrite: false }));
      const sc = rnd(0.6, 1.1);
      s.scale.set(sc, sc, 1);
      group.add(s);
      list.push({ s, x: rnd(-13, 13), y: rnd(-12, 12), z: rnd(-10, -2), v: rnd(0.6, 1.2), ph: rnd(0, TAU) });
    }
    return { group, list };
  })();
  piece('notes', notes.group, (v) => { notes.list.forEach((n) => { n.s.material.opacity = v * 0.9; }); }, (dt, t) => {
    notes.list.forEach((n) => {
      n.y += n.v * dt;
      if (n.y > 13) { n.y = -13; n.x = rnd(-13, 13); }
      n.s.position.set(n.x + Math.sin(t + n.ph) * 0.6, n.y, n.z);
    });
  });

  // String lights for the Baraat night
  const bulbs = (() => {
    const N = 120;
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.55, 0.8) }), N);
    const group = new THREE.Group();
    group.add(mesh);
    return { group, mesh, N };
  })();
  function layoutBulbs() {
    const z = -5;
    const { hw, hh } = frustum(z);
    let k = 0;
    [[-hw * 1.05, 0, hh * 0.9, hh * 0.16], [0, hw * 1.05, hh * 0.9, hh * 0.16], [-hw * 0.6, hw * 0.6, hh * 0.98, hh * 0.28]].forEach(([x0, x1, y, sag], si) => {
      const n = 40;
      for (let i = 0; i < n && k < bulbs.N; i++) {
        const u = i / (n - 1);
        va.set(x0 + (x1 - x0) * u, y - sag * (1 - Math.pow(2 * u - 1, 2)), z - si);
        qa.identity();
        vs.setScalar(1);
        m4.compose(va, qa, vs);
        bulbs.mesh.setMatrixAt(k++, m4);
      }
    });
    bulbs.mesh.count = k;
    bulbs.mesh.instanceMatrix.needsUpdate = true;
  }
  piece('bulbs', bulbs.group, (v) => { bulbs.group.position.y = (1 - v) * 5; }, (dt, t) => {
    bulbs.mesh.material.color.setRGB(2.2 * (0.85 + 0.15 * Math.sin(t * 3)), 1.55, 0.8);
  });

  // Sky lanterns for the family
  const lanterns = (() => {
    const N = 44;
    const geo = new THREE.CylinderGeometry(0.28, 0.21, 0.56, 12, 1, true);
    const mat = new THREE.MeshStandardMaterial({ color: '#ffb36b', emissive: '#ff7a1a', emissiveIntensity: 2.6, side: THREE.DoubleSide, roughness: 0.8 });
    const mesh = new THREE.InstancedMesh(geo, mat, N);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const data = [];
    for (let i = 0; i < N; i++) {
      data.push({ on: i < (mobile ? 18 : 28), ambient: i < (mobile ? 18 : 28), x: rnd(-16, 16), y: rnd(-14, 14), z: rnd(-16, -3), vy: rnd(0.5, 1.0), ph: rnd(0, TAU), s: rnd(0.7, 1.3) });
    }
    const group = new THREE.Group();
    group.add(mesh);
    return { group, mesh, data, N };
  })();
  piece('lanterns', lanterns.group, () => {}, (dt, t) => {
    const v = pieces.lanterns.vis;
    lanterns.data.forEach((d, i) => {
      if (d.on) {
        d.y += d.vy * dt;
        if (d.y > 15) {
          if (d.ambient) { d.y = -15; d.x = rnd(-16, 16); } else d.on = false;
        }
      }
      const s = d.on ? d.s * v : 0.0001;
      ea.set(Math.sin(t * 0.8 + d.ph) * 0.12, 0, Math.sin(t * 0.6 + d.ph) * 0.12);
      qa.setFromEuler(ea);
      va.set(d.x + Math.sin(t * 0.4 + d.ph) * 0.5, d.y, d.z);
      vs.setScalar(s);
      m4.compose(va, qa, vs);
      lanterns.mesh.setMatrixAt(i, m4);
    });
    lanterns.mesh.instanceMatrix.needsUpdate = true;
  });

  /* ---------- Helpers ---------- */
  function frustum(z) {
    const dist = camera.position.z - z;
    const hh = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    return { hh, hw: hh * camera.aspect };
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  function screenToWorld(x, y, z = -6) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    plane.constant = -z;
    const out = new THREE.Vector3();
    ray.ray.intersectPlane(plane, out);
    return out;
  }

  function flash(p, color, power = 140) {
    const l = flashes[0].intensity <= flashes[1].intensity ? flashes[0] : flashes[1];
    l.position.copy(p);
    l.color.set(color);
    l.intensity = power;
  }

  /* ---------- Fireworks ---------- */
  const rockets = [];
  const randDir = (v) => {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * TAU;
    const r = Math.sqrt(1 - u * u);
    return v.set(Math.cos(th) * r, u, Math.sin(th) * r);
  };

  function burst(p, { pal = PALETTES.festive, n = 160, speed = 0.16, type, size = 0.24 } = {}) {
    if (reduce) return;
    const cols = pal.map((c) => new THREE.Color(c));
    type = type || pick(['peony', 'peony', 'ring', 'willow', 'crossette', 'heart']);
    n = Math.round(n * (mobile ? 0.7 : 1));
    const dir = new THREE.Vector3();
    const ax = randDir(new THREE.Vector3());
    const bx = new THREE.Vector3().crossVectors(ax, new THREE.Vector3(0, 1, 0.3)).normalize();
    const cx = new THREE.Vector3().crossVectors(ax, bx).normalize();
    for (let i = 0; i < n; i++) {
      let v = speed;
      if (type === 'ring') {
        const a = (i / n) * TAU;
        dir.copy(bx).multiplyScalar(Math.cos(a)).addScaledVector(cx, Math.sin(a));
        v *= rnd(0.95, 1.02);
      } else if (type === 'heart') {
        const t = (i / n) * TAU;
        dir.set(16 * Math.pow(Math.sin(t), 3) / 16, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16, rnd(-0.05, 0.05));
        v *= 0.9;
      } else {
        randDir(dir);
        v *= Math.cbrt(Math.random()) * rnd(0.85, 1.05);
      }
      const willow = type === 'willow';
      const col = cols[(i * 7 + (type === 'ring' ? 0 : (Math.random() * cols.length) | 0)) % cols.length];
      fire.emit(p.x, p.y, p.z, dir.x * v, dir.y * v, dir.z * v, col, size * rnd(0.8, 1.2),
        willow ? rnd(0.006, 0.009) : rnd(0.011, 0.018), willow ? 0.0016 : 0.0011, willow ? 0.962 : 0.972,
        type !== 'ring' && Math.random() < 0.4 ? 1 : 0, type === 'crossette' && i % 9 === 0 ? 1 : 0);
    }
    flash(p, cols[0]);
  }

  function rocket({ x, y, z = -10, pal, type, onBoom } = {}) {
    if (reduce) return;
    const { hw, hh } = frustum(z);
    const tx = x !== undefined ? x : rnd(-hw * 0.75, hw * 0.75);
    const ty = y !== undefined ? y : rnd(hh * 0.05, hh * 0.65);
    const y0 = -hh - 1;
    const g = 0.0022;
    const vy = Math.sqrt(2 * g * Math.max(1, ty - y0)) * 60 / 60;
    rockets.push({ x: tx + rnd(-1.5, 1.5), y: y0, z, vx: 0, vy, g, ty, tx, pal, type, onBoom });
  }

  function fountain(dt, active) {
    if (!active || reduce) return;
    const z = -7;
    const { hw, hh } = frustum(z);
    const gold = tmpColor;
    const n = Math.round((mobile ? 3 : 5) * dt * 60);
    [-1, 1].forEach((side) => {
      for (let i = 0; i < n; i++) {
        gold.set(pick(['#fff1c1', '#ffd36b', '#ffb347', '#ffffff']));
        fire.emit(side * hw * 0.82, -hh + 0.4, z, rnd(-0.035, 0.035) - side * 0.01, rnd(0.16, 0.24), rnd(-0.02, 0.02), gold, rnd(0.12, 0.22), rnd(0.018, 0.03), 0.0045, 0.985, 1);
      }
    });
  }

  function heartBurst(p, pal = PALETTES.rose) { burst(p, { pal, type: 'heart', n: 140, speed: 0.12 }); }

  function powderBurst(p, pal = PALETTES.haldi, n = 60) {
    if (reduce) return;
    const dir = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      randDir(dir);
      const v = rnd(0.02, 0.09);
      powder.emit(p.x, p.y, p.z, dir.x * v, dir.y * v * 0.8 + 0.01, dir.z * v, tmpColor.set(pick(pal)), rnd(0.35, 0.9), rnd(0.008, 0.016), -0.0003, 0.94);
    }
  }

  function launchLantern(p) {
    const d = lanterns.data.find((o) => !o.on && !o.ambient) || lanterns.data.find((o) => !o.ambient);
    if (!d) return;
    Object.assign(d, { on: true, x: p.x, y: p.y, z: p.z, vy: rnd(0.8, 1.2), s: rnd(0.9, 1.3), ph: rnd(0, TAU) });
    powderBurst(p, PALETTES.lantern, 16);
  }

  function stagePulse(color) {
    stage.flash = 1;
    stage.cones.forEach((c, i) => { if (color && i === 1) c.mat.uniforms.uColor.value.set(color); });
  }

  /* ---------- Mood ---------- */
  const cur = {};
  const from = {};
  const to = {};
  const colorKeys = ['skyTop', 'skyMid', 'skyBot', 'fog', 'hemiSky', 'hemiGround', 'sun', 'lightA', 'lightB', 'gem', 'petal', 'dust', 'enamel'];
  const numKeys = ['fogD', 'hemiI', 'sunI', 'aI', 'bI', 'bloom', 'threshold', 'gold', 'stars', 'tilt', 'env'];
  colorKeys.forEach((k) => { cur[k] = new THREE.Color(); from[k] = new THREE.Color(); to[k] = new THREE.Color(); });
  const flat = (m) => ({
    skyTop: m.sky[0], skyMid: m.sky[1], skyBot: m.sky[2], fog: m.fog, hemiSky: m.hemi[0], hemiGround: m.hemi[1], sun: m.sun[0],
    lightA: m.a[0], lightB: m.b[0], gem: m.gem, petal: m.petal, dust: m.dust, enamel: m.enamel,
    fogD: m.fogD, hemiI: m.hemi[2], sunI: m.sun[1], aI: m.a[1], bI: m.b[1], bloom: m.bloom, threshold: m.threshold, gold: m.gold, stars: m.stars, tilt: m.tilt, env: m.env,
  });
  let moodName = 'dawn';
  let mix = 1;
  const MIX_DUR = 1.6;
  (function initMood() {
    const f = flat(MOODS.dawn);
    colorKeys.forEach((k) => { cur[k].set(f[k]); to[k].set(f[k]); });
    numKeys.forEach((k) => { cur[k] = from[k] = to[k] = f[k]; });
  })();

  function setMood(name) {
    const m = MOODS[name];
    if (!m || name === moodName) return;
    moodName = name;
    const f = flat(m);
    colorKeys.forEach((k) => { from[k].copy(cur[k]); to[k].set(f[k]); });
    numKeys.forEach((k) => { from[k] = cur[k]; to[k] = f[k]; });
    mix = 0;
    Object.entries(pieces).forEach(([key, p]) => { p.target = (SHOW[name] || []).includes(key) ? 1 : 0; });
    numberStyle(name);
  }
  // On light skies the date particles are drawn as ink; on dark skies they glow.
  function numberStyle(name) {
    const light = ['dawn', 'blush', 'haldi'].includes(name);
    if (light === numbers.light) return;
    numbers.light = light;
    numbers.mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    numbers.mat.uniforms.uHdr.value = light ? 0 : 2;
    numbers.mat.needsUpdate = true;
  }
  numberStyle('dawn');
  Object.values(pieces).forEach((p) => { p.target = 0; });
  pieces.lotus.target = 1;
  pieces.diyas.target = 1;

  function applyMood(dt) {
    if (mix < 1) {
      mix = Math.min(1, mix + dt / MIX_DUR);
      const e = smooth(mix);
      colorKeys.forEach((k) => { cur[k].copy(from[k]).lerp(to[k], e); });
      numKeys.forEach((k) => { cur[k] = from[k] + (to[k] - from[k]) * e; });
    }
    skyMat.uniforms.uTop.value.copy(cur.skyTop);
    skyMat.uniforms.uMid.value.copy(cur.skyMid);
    skyMat.uniforms.uBot.value.copy(cur.skyBot);
    scene.fog.color.copy(cur.fog);
    scene.fog.density = cur.fogD;
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.hemiI;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunI;
    lightA.color.copy(cur.lightA);
    lightA.intensity = cur.aI;
    lightB.color.copy(cur.lightB);
    lightB.intensity = cur.bI;
    bloom.strength = cur.bloom;
    bloom.threshold = cur.threshold;
    goldMat.emissiveIntensity = cur.gold;
    goldMat.envMapIntensity = cur.env;
    brightGold.envMapIntensity = cur.env;
    enamelMat.color.copy(cur.enamel);
    enamelMat.envMapIntensity = cur.env;
    gemMat.color.copy(cur.gem);
    gemMat.emissive.copy(cur.gem);
    petalMat.color.copy(cur.petal);
    dust.mat.uniforms.uTint.value.copy(cur.dust);
    stars.mat.uniforms.uAlpha.value = cur.stars;
  }

  /* ---------- Input ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scroll = { p: 0, v: 0 };
  function setPointer(x, y) { pointer.tx = x; pointer.ty = y; }
  function setScroll(p, v) { scroll.p = p; scroll.v = v; }

  /* ---------- Resize ---------- */
  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 62 : 48;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(w, h);
    const scale = (h * pixelRatio) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    [fire.material, powder.material, dust.mat, stars.mat, numbers.mat].forEach((m) => { m.uniforms.uScale.value = scale; });
    layoutToran();
    layoutBulbs();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  let running = true;
  let raf = 0;
  let autoFire = 0;
  let slow = 0;
  let frames = 0;
  const cam = new THREE.Vector3();

  function frame() {
    raf = requestAnimationFrame(frame);
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05); // motion: slow-motion rather than jumps on slow devices
    const rdt = Math.min(raw, 0.25); // moods & fades: keep up with real time
    const t = clock.elapsedTime;

    applyMood(rdt);

    // camera: gentle parallax + mood tilt
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);
    cam.set(pointer.x * 0.9, pointer.y * 0.55 - scroll.p * 0.8, 14);
    camera.position.lerp(cam, Math.min(1, dt * 3));
    camera.lookAt(pointer.x * 0.3, -scroll.p * 0.8, -12);
    sky.position.copy(camera.position);
    stars.pts.position.copy(camera.position);

    // mandala
    mandala.spin += dt * (0.05 + Math.min(0.6, Math.abs(scroll.v) * 0.0009));
    mandala.halves[0].rotation.z = mandala.spin;
    mandala.halves[1].rotation.z = -mandala.spin * 0.8;
    mandala.group.rotation.x = -0.22 + pointer.y * 0.06;
    mandala.group.rotation.y = pointer.x * 0.08;
    mandala.core.rotation.y = t * 0.6;
    mandala.core.material.emissiveIntensity = 0.5 + 0.3 * Math.sin(t * 1.7);

    // moving lights sweep the patterns
    lightA.position.set(Math.cos(t * 0.35) * 11, Math.sin(t * 0.5) * 7, -20);
    lightB.position.set(Math.cos(t * 0.27 + 2) * 12, Math.sin(t * 0.33 + 1) * 8, -18);
    flashes.forEach((l) => { l.intensity *= Math.pow(0.02, dt); });

    // floating shapes (infinite vertical field driven by scroll)
    shapes.offset = scroll.p * 26;
    shapes.items.forEach((it) => {
      const span = 30;
      let y = (((it.y0 + shapes.offset + Math.sin(t * 0.5 + it.ph) * 0.4) % span) + span) % span - span / 2;
      ea.set(it.rx + t * it.vx, it.ry + t * it.vy, 0);
      qa.setFromEuler(ea);
      va.set(it.x - pointer.x * (it.z + 20) * 0.03, y, it.z);
      vs.setScalar(it.s);
      m4.compose(va, qa, vs);
      it.mesh.setMatrixAt(it.i, m4);
    });
    shapes.group.children.forEach((m) => { m.instanceMatrix.needsUpdate = true; });

    // dust drifts upward
    for (let i = 0; i < DUST_N; i++) {
      dust.p[i * 3 + 1] += dust.v[i] * dt * 60;
      if (dust.p[i * 3 + 1] > 14) dust.p[i * 3 + 1] = -14;
    }
    dust.geo.attributes.position.needsUpdate = true;
    dust.mat.uniforms.uTime.value = t;
    stars.mat.uniforms.uTime.value = t;
    numbers.mat.uniforms.uTime.value = t;

    // date particles
    const tgt = numbers.key ? numbers.targets[numbers.key] : null;
    const sc = numbers.scale;
    const rot = t * 0.06;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    for (let i = 0; i < NUM_N; i++) {
      const j = i * 3;
      let tx;
      let ty;
      let tz;
      if (tgt) {
        tx = tgt[j] * sc + numbers.x;
        ty = tgt[j + 1] * sc + numbers.y;
        tz = tgt[j + 2];
      } else {
        const sx = numbers.scatter[j];
        const sy = numbers.scatter[j + 1];
        tx = sx * cr - sy * sr * 1.6;
        ty = sx * sr * 0.6 + sy * cr;
        tz = numbers.scatter[j + 2];
      }
      const k = numbers.speed[i] * dt * 60;
      numbers.p[j] += (tx - numbers.p[j]) * k + Math.sin(t * 1.3 + i) * 0.002;
      numbers.p[j + 1] += (ty - numbers.p[j + 1]) * k;
      numbers.p[j + 2] += (tz - numbers.p[j + 2]) * k;
      numbers.c[j] = numbers.color.r;
      numbers.c[j + 1] = numbers.color.g;
      numbers.c[j + 2] = numbers.color.b;
    }
    numbers.geo.attributes.position.needsUpdate = true;
    numbers.geo.attributes.aColor.needsUpdate = true;
    numbers.alpha += (numbers.targetAlpha - numbers.alpha) * Math.min(1, dt * 2);
    numbers.mat.uniforms.uAlpha.value = numbers.alpha;

    // set pieces
    Object.values(pieces).forEach((p) => {
      p.vis += (p.target - p.vis) * Math.min(1, rdt * 2.2);
      const on = p.vis > 0.01;
      p.group.visible = on;
      if (on) {
        p.apply(p.vis);
        p.update(dt, t);
      }
    });

    // rockets
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      const f = dt * 60;
      r.vy -= r.g * f;
      r.y += r.vy * f;
      r.x += (r.tx - r.x) * 0.02 * f;
      fire.emit(r.x, r.y, r.z, rnd(-0.01, 0.01), rnd(-0.04, -0.01), 0, tmpColor.set('#ffd9a0'), 0.16, 0.06, 0.0005, 0.95);
      if (r.y >= r.ty || r.vy <= 0.005) {
        rockets.splice(i, 1);
        const p = new THREE.Vector3(r.x, r.y, r.z);
        burst(p, { pal: r.pal, type: r.type });
        if (r.onBoom) r.onBoom(p);
      }
    }

    // automatic fireworks at night
    if (['night', 'finale'].includes(moodName) && !reduce) {
      autoFire -= dt;
      if (autoFire <= 0) {
        autoFire = rnd(1.1, 2.4);
        rocket({ z: rnd(-16, -9), pal: pick([PALETTES.festive, PALETTES.gold, PALETTES.rose, PALETTES.dusk]), onBoom: api.onAutoBoom });
      }
    }
    fountain(dt, moodName === 'night');

    fire.update(dt);
    powder.update(dt);

    if (useComposer) composer.render(dt);
    else renderer.render(scene, camera);

    // adaptive quality
    frames++;
    if (adaptive && frames > 30 && frames < 400) {
      slow = slow * 0.95 + (dt > 0.034 ? 1 : 0) * 0.05;
      if (frames % 90 === 0 && slow > 0.5) {
        if (pixelRatio > 1) {
          pixelRatio = 1;
          renderer.setPixelRatio(1);
          resize();
        } else if (useComposer) {
          useComposer = false;
        }
        slow = 0;
      }
    }
  }

  function start() {
    if (raf) return;
    clock.getDelta();
    frame();
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (running) start(); });

  const api = {
    start, stop, setMood, setPointer, setScroll, prepareNumbers, setNumber, setNumberAt, screenToWorld,
    burst, heartBurst, rocket, powderBurst, launchLantern, stagePulse, flash,
    bloomLotus() { lotus.target = 1; },
    get mood() { return moodName; },
    onAutoBoom: null,
    renderer,
  };
  return api;
}
