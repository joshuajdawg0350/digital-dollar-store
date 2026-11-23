/* Hustle City Cosmic Bowling — 3D REBUILD: renderer, input, game flow.
   True 3D (Three.js WebGL) on the proven logic core (logic3d.js).
   Default alley is a clean neutral house lane — Joshua picks the final
   looks separately; nothing aesthetic blocks the game.
   Sound is the standing synthesized WebAudio placeholder (flagged in
   the build record — bowling sound direction is Joshua's open call).
   (c) 2026 J-Dawgs Industries. */
'use strict';
const L = window.BowlLogic3D;
const $ = s => document.querySelector(s);

/* ================= save ================= */
const SAVE_KEY = 'cb3d-save-v1';
let save;
try { save = JSON.parse(localStorage.getItem(SAVE_KEY)) || L.defaultSave(); }
catch (e) { save = L.defaultSave(); }
if (!save.balls) save = L.defaultSave();
let savedT = null;
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  const el = $('#savedTag'); el.classList.add('on');
  clearTimeout(savedT); savedT = setTimeout(() => el.classList.remove('on'), 900);
}

/* ================= audio (synthesized placeholder) ================= */
const AudioX = {
  ctx: null,
  ensure() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  noise(dur, freq, gain, type) {
    const ctx = this.ensure(); if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
  },
  tone(freq, dur, gain, slideTo) {
    const ctx = this.ensure(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  },
  pinHit(count) { this.noise(0.16, 1800 + count * 120, Math.min(0.5, 0.14 + count * 0.05)); this.tone(2100, 0.07, 0.05); },
  gutter() { this.tone(160, 0.25, 0.22, 60); },
  land() { this.noise(0.06, 500, 0.10, 'lowpass'); },
  strike() { this.tone(660, 0.12, 0.12); setTimeout(() => this.tone(880, 0.16, 0.12), 90); },
  spare() { this.tone(587, 0.12, 0.10); },
  ui() { this.tone(1200, 0.04, 0.04); },
};

/* ================= three setup ================= */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.Fog(0x05070d, 26, 46);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 80);

const hemi = new THREE.HemisphereLight(0xbdd7ff, 0x1a1410, 0.85);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(3.5, 7.5, 10);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -3; key.shadow.camera.right = 3;
key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
key.shadow.camera.near = 1; key.shadow.camera.far = 25;
key.target.position.set(0, 0, 18.6);
scene.add(key); scene.add(key.target);
const fill = new THREE.DirectionalLight(0x9fc4ff, 0.55);
fill.position.set(-4, 5, -2); scene.add(fill);
const deckGlow = new THREE.PointLight(0xfff2d8, 30, 12, 1.8);
deckGlow.position.set(0, 2.6, 18.8); scene.add(deckGlow);

/* ================= textures ================= */
// v7 fix: centred text that never touches its frame — shrink the font
// until the line fits maxW. Device fonts (e.g. Android's) render wider
// than the design font, and edge-to-edge text is what clipped the
// HUSTLE CITY lines at the screen/sign frame edges on a real phone.
function fitText(g, text, cx, y, weight, size, maxW) {
  let s = size;
  g.font = `${weight} ${s}px system-ui, sans-serif`;
  while (s > 10 && g.measureText(text).width > maxW) { s -= 2; g.font = `${weight} ${s}px system-ui, sans-serif`; }
  g.fillText(text, cx, y);
}
function laneTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 2048;
  const g = c.getContext('2d');
  // maple boards: 39 across the lane width; canvas y runs foul(far in v) -> deck
  for (let i = 0; i < 39; i++) {
    const l = 62 + Math.sin(i * 12.9898) * 4 + (i % 2) * 2;
    g.fillStyle = `hsl(33, 42%, ${l}%)`;
    g.fillRect(Math.floor(i * 256 / 39), 0, Math.ceil(256 / 39) + 1, 2048);
  }
  g.fillStyle = 'rgba(90,55,20,0.35)';
  for (let i = 0; i <= 39; i++) g.fillRect(Math.floor(i * 256 / 39), 0, 1, 2048);
  // oil sheen: brighter, cooler through the heads/mid-lane
  // (v7: alphas halved — with the key-light specular this stacked into
  // a distinct bright pool mid-lane that read wrong)
  const grad = g.createLinearGradient(0, 2048, 0, 700);
  grad.addColorStop(0, 'rgba(255,255,255,0.055)');
  grad.addColorStop(0.55, 'rgba(210,230,255,0.028)');
  grad.addColorStop(1, 'rgba(210,230,255,0.0)');
  g.fillStyle = grad; g.fillRect(0, 700, 256, 1348);
  // z -> canvas y: lane spans z=-1.2..19.75 over the plane; foul line z=0
  const yOf = z => 2048 - ((z + 1.2) / 20.95) * 2048;
  // foul line
  g.fillStyle = '#14161c'; g.fillRect(0, yOf(0) - 2, 256, 4);
  // range-finder arrows (boards 5,10,15,20,25,30,35 from the left edge of play)
  g.fillStyle = 'rgba(30,26,22,0.85)';
  const arrows = [ // [xFrac, zNear, zFar]
    [0.10, 3.4, 4.6], [0.24, 4.1, 5.5], [0.38, 4.8, 6.4], [0.50, 5.4, 7.2],
    [0.62, 4.8, 6.4], [0.76, 4.1, 5.5], [0.90, 3.4, 4.6]];
  for (const [xf, zn, zf] of arrows) {
    const x = xf * 256;
    g.beginPath();
    g.moveTo(x - 5, yOf(zn)); g.lineTo(x + 5, yOf(zn)); g.lineTo(x, yOf(zf));
    g.closePath(); g.fill();
  }
  // dots at ~2.3m and pin-deck spots
  for (const xf of [0.14, 0.32, 0.50, 0.68, 0.86]) {
    g.beginPath(); g.arc(xf * 256, yOf(2.3), 4, 0, 7); g.fill();
  }
  g.fillStyle = 'rgba(20,18,16,0.5)';
  const pos = L.rackPositions();
  for (const n in pos) {
    const x = (pos[n][0] / L.LANE.width + 0.5) * 256;
    g.beginPath(); g.arc(x, yOf(pos[n][1]), 5, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.flipY = false; // plane v=1 sits at the foul end; yOf() is written for it
  return t;
}
function signTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0e16'; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = '#46536a'; g.lineWidth = 6; g.strokeRect(10, 10, 1004, 236);
  g.textAlign = 'center';
  const grad = g.createLinearGradient(0, 50, 0, 160);
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.55, '#9fb6cc'); grad.addColorStop(1, '#e8f4ff');
  g.fillStyle = grad; fitText(g, 'HUSTLE CITY', 512, 118, 900, 92, 800);
  g.fillStyle = '#38b6ff';
  fitText(g, '★ COSMIC BOWLING ★', 512, 200, 900, 54, 760);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function ballTexture(skin) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = skin.base; g.fillRect(0, 0, 256, 128);
  g.globalAlpha = 0.55; g.fillStyle = skin.swirl;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.ellipse((i * 53) % 256, 24 + (i * 37) % 84, 34 + (i % 3) * 12, 10 + (i % 4) * 4, i * 0.7, 0, 7);
    g.fill();
  }
  g.globalAlpha = 0.9; g.fillStyle = skin.glow;
  g.beginPath(); g.ellipse(70, 44, 46, 7, 0.4, 0, 7); g.fill();
  g.globalAlpha = 1; g.fillStyle = 'rgba(8,8,10,0.92)';
  for (const [x, y, r] of [[128, 34, 7], [142, 46, 6], [116, 48, 6]]) {
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ================= alley build ================= */
const laneTex = laneTexture();
function buildLane(cx) {
  const grp = new THREE.Group();
  const surf = new THREE.Mesh(
    new THREE.PlaneGeometry(L.LANE.width, 20.95),
    new THREE.MeshStandardMaterial({ map: laneTex, roughness: 0.60, metalness: 0.04 }));
  surf.rotation.x = -Math.PI / 2;
  surf.position.set(cx, 0, 9.275);
  surf.receiveShadow = true;
  grp.add(surf);
  const gutMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.5, metalness: 0.4 });
  for (const s of [-1, 1]) {
    const gut = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.045, 20.95), gutMat);
    gut.position.set(cx + s * L.LANE.gutterCentre, -0.012, 9.275);
    grp.add(gut);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 20.95),
      new THREE.MeshStandardMaterial({ color: 0xb9c4d4, roughness: 0.25, metalness: 0.9 }));
    rail.position.set(cx + s * (L.LANE.gutterCentre + 0.10), 0.012, 9.275);
    grp.add(rail);
  }
  scene.add(grp);
  return grp;
}
buildLane(0); buildLane(-1.42); buildLane(1.42); buildLane(-2.84); buildLane(2.84);
// approach
{
  const ap = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6),
    new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.6 }));
  ap.rotation.x = -Math.PI / 2; ap.position.set(0, -0.001, -2.5);
  ap.receiveShadow = true; scene.add(ap);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 14),
    new THREE.MeshStandardMaterial({ color: 0x11141c, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.02, -6);
  scene.add(floor);
}
// pit + masking unit + sign
{
  const pit = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.5, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 1 }));
  pit.position.set(0, 0.18, 20.35); scene.add(pit);
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.75, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x171c26, roughness: 0.85 }));
  cushion.position.set(0, 0.55, 20.85); scene.add(cushion);
  const mask = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.15, 0.18),
    new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.6 }));
  mask.position.set(0, 2.05, 20.2); scene.add(mask);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 7),
    new THREE.MeshStandardMaterial({ color: 0x0a0d14, roughness: 1 }));
  wall.position.set(0, 3.5, 21.4); scene.add(wall);
  // ceiling light strips
  const stripMat = new THREE.MeshBasicMaterial({ color: 0xcfe6ff });
  for (const z of [2, 8, 14, 19]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.35), stripMat);
    strip.rotation.x = Math.PI / 2; strip.position.set(0, 3.4, z);
    scene.add(strip);
  }
  // side walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 1 });
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(24, 5), wallMat);
    w.rotation.y = s * -Math.PI / 2; w.position.set(s * 3.4, 2.5, 9);
    scene.add(w);
  }
}

/* pins */
const PIN_PROFILE = [
  [0.000, 0.001], [0.000, 0.030], [0.002, 0.042], [0.008, 0.049], [0.020, 0.0545], [0.045, 0.0585],
  [0.075, 0.0603], [0.114, 0.0605], [0.150, 0.0580], [0.185, 0.0515], [0.215, 0.0435], [0.240, 0.0365],
  [0.258, 0.0325], [0.272, 0.0308], [0.288, 0.0328], [0.305, 0.0352], [0.322, 0.0358], [0.338, 0.0335],
  [0.352, 0.0285], [0.364, 0.0215], [0.374, 0.0125], [0.381, 0.001]];
function pinStripe(h) { return (h >= 0.243 && h < 0.261) || (h >= 0.269 && h < 0.287); }
const pinGeo = (() => {
  const pts = PIN_PROFILE.map(([h, r]) => new THREE.Vector2(r, h));
  const geo = new THREE.LatheGeometry(pts, 22);
  const colors = [];
  const posA = geo.attributes.position;
  const white = new THREE.Color(0xf7f9fc), red = new THREE.Color(0xd8232a);
  for (let i = 0; i < posA.count; i++) {
    const col = pinStripe(posA.getY(i)) ? red : white;
    colors.push(col.r, col.g, col.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
})();
const pinMatBase = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.02 });
const pinViews = {}; // n -> { grp, pivot, mode, fallT, spinV, fade }
{
  const pos = L.rackPositions();
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const grp = new THREE.Group();
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(pinGeo, pinMatBase.clone());
    mesh.castShadow = true;
    pivot.add(mesh); grp.add(pivot);
    grp.position.set(pos[n][0], 0, pos[n][1]);
    scene.add(grp);
    pinViews[n] = { grp, pivot, mesh, mode: 'stand', fallT: 0, spinV: 0 };
  }
}
/* ================= venue dressing — the WHOLE alley =================
   Joshua (2026-11-22): the judged picture is the entire 3D bowling
   alley — Hustle City backgrounds and branding in the venue,
   neighbouring lanes dressed, frames up top (the scoreboard bar),
   ball returns, overhead monitors. Not a bare lane in a void. */
function posterTexture(big, small) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0e16'; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = '#38b6ff'; g.lineWidth = 5; g.strokeRect(12, 12, 488, 296);
  g.textAlign = 'center';
  const grad = g.createLinearGradient(0, 60, 0, 150);
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.55, '#9fb6cc'); grad.addColorStop(1, '#e8f4ff');
  g.fillStyle = grad; fitText(g, big, 256, 140, 900, 64, 430);
  g.fillStyle = '#38b6ff';
  fitText(g, small, 256, 215, 900, 40, 430);
  g.fillStyle = '#8fb8dd';
  fitText(g, 'BIG DREAMS FOR A SMALL WORLD', 256, 272, 700, 25, 430);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function monitorTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 288;
  const g = c.getContext('2d');
  g.fillStyle = '#0b1220'; g.fillRect(0, 0, 512, 288);
  g.textAlign = 'center';
  // v7: header given real headroom (was baseline 46 at 34px — glyph
  // tops sat ~4% from the screen's top edge and read clipped)
  g.fillStyle = '#38b6ff'; fitText(g, 'HUSTLE CITY', 256, 58, 900, 32, 420);
  // a frames grid, like the overhead scorers in a real house
  for (const row of [0, 1]) {
    for (let f = 0; f < 5; f++) {
      const x = 36 + f * 90, y = 86 + row * 94;
      g.strokeStyle = '#46536a'; g.lineWidth = 3; g.strokeRect(x, y, 78, 74);
      g.beginPath(); g.moveTo(x, y + 28); g.lineTo(x + 78, y + 28); g.stroke();
      g.beginPath(); g.moveTo(x + 52, y); g.lineTo(x + 52, y + 28); g.stroke();
    }
  }
  g.fillStyle = '#8fb8dd';
  fitText(g, 'FRAMES 1–5', 256, 276, 800, 24, 300);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
{
  // dressed racks on the neighbouring lanes (static, shared geometry)
  const pos = L.rackPositions();
  for (const cx of [-1.42, 1.42, -2.84, 2.84]) {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const m = new THREE.Mesh(pinGeo, pinMatBase);
      m.position.set(cx + pos[n][0], 0, pos[n][1]);
      scene.add(m);
    }
    const pit2 = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.5, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 1 }));
    pit2.position.set(cx, 0.18, 20.35); scene.add(pit2);
  }
  // ball return with house balls, right of the approach
  const retMat = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.4, metalness: 0.6 });
  const ret = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 2.6), retMat);
  ret.position.set(1.05, 0.25, -1.7); scene.add(ret);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 2.6),
    new THREE.MeshStandardMaterial({ color: 0xb9c4d4, roughness: 0.25, metalness: 0.9 }));
  rail.position.set(1.05, 0.53, -1.7); scene.add(rail);
  const returnSkins = [L.BALL_BY_ID['chrome-comet'], L.BALL_BY_ID['nebula-bouncer'], L.BALL_BY_ID['gas-giant']];
  returnSkins.forEach((b, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(L.LANE.ballR, 24, 18),
      new THREE.MeshStandardMaterial({ map: ballTexture(b.skin), roughness: 0.2 }));
    m.position.set(1.05, 0.53 + L.LANE.ballR, -2.5 + i * 0.85);
    scene.add(m);
  });
  // overhead scoring monitors above the pin decks
  // (v7: raised, slimmed and moved outward — at y 3.05 over the lane
  // centres their lower edges crossed the masking sign's HUSTLE CITY
  // line from the menu/aim cameras and clipped it)
  const monTex = monitorTexture();
  for (const cx of [-1.62, 1.62]) {
    const mon = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 0.08),
      new THREE.MeshStandardMaterial({ map: monTex, roughness: 0.5, emissive: 0x223349, emissiveIntensity: 0.7 }));
    mon.position.set(cx, 3.22, 17.6); mon.rotation.x = 0.18;
    scene.add(mon);
  }
  // Hustle City posters on both side walls
  const postTex = posterTexture('HUSTLE CITY', 'COSMIC BOWLING');
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.25),
      new THREE.MeshStandardMaterial({ map: postTex, roughness: 0.7, emissive: 0x111a26, emissiveIntensity: 0.8 }));
    p.rotation.y = s * -Math.PI / 2 + (s < 0 ? Math.PI : 0);
    p.position.set(s * 3.35, 2.3, 6.5);
    if (s < 0) p.rotation.y = Math.PI / 2; else p.rotation.y = -Math.PI / 2;
    scene.add(p);
  }
  // bench seating behind the approach
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x14273d, roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.5), benchMat);
    seat.position.set(-1.35 + i * 0.9, 0.45, -4.6); scene.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.1), benchMat);
    back.position.set(-1.35 + i * 0.9, 0.85, -4.85); scene.add(back);
  }
}

/* ball */
const ballGrp = new THREE.Group();
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(L.LANE.ballR, 36, 24),
  new THREE.MeshStandardMaterial({ roughness: 0.18, metalness: 0.08 }));
ballMesh.castShadow = true;
ballGrp.add(ballMesh);
ballGrp.position.set(0, L.LANE.ballR, -0.4);
scene.add(ballGrp);
function setBallSkin(ball) {
  ballMesh.material.map = ballTexture(ball.skin);
  ballMesh.material.emissive = new THREE.Color(ball.skin.glow);
  ballMesh.material.emissiveIntensity = 0.07;
  ballMesh.material.needsUpdate = true;
}

/* ================= game state ================= */
let phase = 'menu';            // menu | aim | rolling | settle | aithrow | over
let mode = 'career';           // career | practice
let rivalIdx = 0;
let sides = null;              // { you: side, ai: side }
let turn = 'you';
let curBallId = save.bag[0] || 'house-rock';
if (!save.balls[curBallId] || !save.balls[curBallId].owned) curBallId = 'house-rock';
let aim = { startX: -0.10, angleDeg: 0 }; // near-centre default stance, like the top games — a casual diagonal flick from the default stance must curve, not gutter
let throwState = null;
let settleT = 0, pendingAfterSettle = null;
let clockLeft = 20, clockOn = false;
let timeScale = 1;
let aiQueue = [];              // timed callbacks {at, fn} in game-seconds
let gameTime = 0;
let leaveBefore = null;        // standing pins before a 2nd/3rd ball (spare/split checks)
let menuOrbit = 0;
const seedBox = { s: (Date.now() % 2147483647) || 7 };
const rand = L.rng(seedBox);

function curSide() { return turn === 'you' ? sides.you : sides.ai; }
function curBallDef() { return turn === 'you' ? L.BALL_BY_ID[curBallId] : { id: 'rival', name: 'Rival', type: L.RIVALS[rivalIdx].type }; }
function curStats() {
  if (turn === 'you') return L.ballStatsAt(L.BALL_BY_ID[curBallId], save.balls[curBallId].level);
  return { ...L.RIVALS[rivalIdx].stats };
}
function schedule(delay, fn) { aiQueue.push({ at: gameTime + delay, fn }); }

/* ================= UI helpers ================= */
function toast(msg, ms) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms || 2400);
}
function banner(big, sub, ms) {
  const b = $('#banner');
  b.querySelector('.big').textContent = big;
  b.querySelector('.sub').textContent = sub || '';
  b.classList.add('show');
  clearTimeout(b._h); b._h = setTimeout(() => b.classList.remove('show'), ms || 1500);
}
function rollMarks(rolls, frameIdx, side) {
  // display marks for one frame from the flat roll list
  const scored = L.scoreSoFar5(side.rolls);
  const fr = scored.frames[frameIdx];
  if (!fr || !fr.rolls.length) return '';
  const r = fr.rolls;
  const rackOf = idx => { // pins available to roll idx within this frame (frame 5 resets)
    if (frameIdx < 4) return idx === 0 ? 10 : 10 - r[0];
    if (idx === 0) return 10;
    if (r[0] === 10) return idx === 1 ? 10 : (r[1] === 10 ? 10 : 10 - r[1]);
    return idx === 1 ? 10 - r[0] : 10;
  };
  return r.map((v, i) => {
    if (v === 0) return '–';
    if (v === rackOf(i)) {
      if (i === 0) return 'X';
      // a full clear on a later ball of frame 5 after a strike is a strike too
      if (frameIdx === 4 && (r[0] === 10) && (i === 1 || r[1] === 10)) return 'X';
      return '/';
    }
    return String(v);
  }).join(' ');
}
function refreshScore() {
  const rows = { you: $('#scoreTable tr.me'), ai: $('#scoreTable tr.ai') };
  for (const who of ['you', 'ai']) {
    const side = sides ? sides[who] : null;
    const cells = rows[who].querySelectorAll('td[data-f]');
    cells.forEach((td, f) => {
      td.querySelector('.rolls').textContent = side ? rollMarks(null, f, side) : '';
      const sc = side ? L.scoreSoFar5(side.rolls) : null;
      td.querySelector('.cum').textContent = sc && sc.frames[f] && sc.frames[f].cum !== null ? sc.frames[f].cum : '';
      td.classList.toggle('cur', !!side && !side.done && side.frame === f && turn === who && phase !== 'over');
    });
  }
  $('#aiName').textContent = mode === 'practice' ? '—' : L.RIVALS[rivalIdx].name.toUpperCase();
  $('#aiTitle').textContent = mode === 'practice' ? 'PRACTICE' : L.RIVALS[rivalIdx].title.toUpperCase();
  $('#myTier').textContent = L.leagueTier(save.trophies).toUpperCase();
}
function refreshTop() {
  $('#chips').textContent = save.chips;
  $('#trophies').textContent = save.trophies;
}
const PIN_GRID = [7, 8, 9, 10, 4, 5, 6, null, 2, 3, null, null, 1, null, null, null];
function refreshPinDots() {
  const wrap = $('#pinDots');
  if (!wrap.children.length) {
    for (const n of PIN_GRID) {
      const i = document.createElement('i');
      if (n === null) i.className = 'sp';
      else i.dataset.pin = n;
      wrap.appendChild(i);
    }
  }
  const standing = new Set(sides ? curSide().standing : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  if (throwState) for (const p of throwState.pins) if (p.down) standing.delete(p.n);
  wrap.querySelectorAll('i[data-pin]').forEach(i => {
    i.classList.toggle('off', !standing.has(+i.dataset.pin));
  });
}
function orbStyle(ball) {
  const s = ball.skin;
  return `background: radial-gradient(circle at 32% 28%, #ffffffcc 0%, ${s.glow} 12%, ${s.swirl} 42%, ${s.base} 78%, #00000088 100%), ${s.base};`;
}
function refreshDeck() {
  const def = L.BALL_BY_ID[curBallId];
  const st = L.ballStatsAt(def, save.balls[curBallId].level);
  $('#curOrb').setAttribute('style', orbStyle(def));
  $('#ballName').textContent = def.name;
  $('#ballType').textContent = `${def.type.toUpperCase()} · Lv ${save.balls[curBallId].level}`;
  $('#ballStats').textContent = `PWR ${st.power.toFixed(0)} · SPN ${st.spin.toFixed(0)} · ACC ${st.accuracy.toFixed(0)} · CTL ${st.control.toFixed(0)}`;
  const bag = $('#bagRow'); bag.innerHTML = '';
  for (const b of L.BALLS) {
    if (!save.balls[b.id].owned || b.id === curBallId) continue;
    const o = document.createElement('div');
    o.className = 'orb'; o.style.cssText = orbStyle(b) + 'width:34px;height:34px;';
    o.title = b.name;
    o.addEventListener('click', () => { selectBall(b.id); AudioX.ui(); });
    bag.appendChild(o);
  }
}
function selectBall(id) {
  if (!save.balls[id] || !save.balls[id].owned) return;
  curBallId = id;
  setBallSkin(L.BALL_BY_ID[id]);
  refreshDeck();
}

/* ================= pins: view sync ================= */
function resetPinViews(standingNums) {
  const pos = L.rackPositions();
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const v = pinViews[n];
    const on = standingNums.includes(n);
    v.grp.visible = on;
    v.mode = 'stand'; v.fallT = 0;
    v.pivot.rotation.set(0, 0, 0);
    v.grp.rotation.set(0, 0, 0);
    v.grp.position.set(pos[n][0], 0, pos[n][1]);
    v.mesh.material.opacity = 1; v.mesh.material.transparent = false;
  }
}
function pinFallStart(p) {
  const v = pinViews[p.n];
  if (!v || v.mode !== 'stand') return;
  const sp = Math.hypot(p.vx, p.vz);
  const dir = sp > 0.05 ? Math.atan2(p.vx, p.vz) : Math.atan2(p.x - p.ox, p.z - p.oz);
  v.grp.rotation.y = dir;
  v.mode = 'falling'; v.fallT = 0;
  v.spinV = Math.max(-3, Math.min(3, p.peak * 0.8)) * (p.n % 2 ? 1 : -1);
}
function sweepDeadPins() {
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const v = pinViews[n];
    if (v.mode === 'falling' || v.mode === 'down') v.mode = 'sweep';
  }
}
function tickPins(dt) {
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const v = pinViews[n];
    if (!v.grp.visible) continue;
    if (v.mode === 'falling') {
      v.fallT += dt * 3.4;
      const k = Math.min(1, v.fallT);
      const ease = 1 - Math.pow(1 - k, 3);
      v.pivot.rotation.x = ease * 1.92 - Math.sin(k * Math.PI) * 0.05;
      v.grp.rotation.y += v.spinV * dt * (1 - k * 0.6);
      if (throwState) {
        const p = throwState.pins.find(q => q.n === n);
        if (p) {
          // slide in the pin's local frame: grp is yawed, physics is world
          const c = Math.cos(-v.grp.rotation.y), s = Math.sin(-v.grp.rotation.y);
          const wx = p.x, wz = p.z;
          v.grp.position.x = wx; v.grp.position.z = wz;
        }
      }
      if (k >= 1) v.mode = 'down';
    } else if (v.mode === 'sweep') {
      v.grp.position.z += dt * 3.2;
      v.grp.position.y -= dt * 0.55;
      v.mesh.material.transparent = true;
      v.mesh.material.opacity = Math.max(0, v.mesh.material.opacity - dt * 2.2);
      if (v.mesh.material.opacity <= 0) { v.grp.visible = false; v.mode = 'gone'; }
    }
  }
}

/* ================= camera ================= */
const camPos = new THREE.Vector3(0, 1.6, -3.4);
const camLook = new THREE.Vector3(0, 0.2, 10);
let camMode = 'menu';
function tickCamera(dt) {
  const desired = new THREE.Vector3(), look = new THREE.Vector3();
  const b = throwState ? throwState.ball : null;
  if (camMode === 'menu') {
    menuOrbit += dt * 0.11;
    desired.set(Math.sin(menuOrbit) * 1.7, 1.5 + Math.sin(menuOrbit * 0.7) * 0.25, -2.9 + Math.cos(menuOrbit) * 0.5);
    look.set(0, 0.3, 12);
  } else if (camMode === 'aim') {
    desired.set(aim.startX * 0.85, 1.52, -2.5);
    look.set(aim.startX * 0.35, 0.22, 9);
  } else if (camMode === 'chase' && b) {
    // TRUE FOLLOW CAM (Joshua, 2026-11-22: "a camera that follows the
    // ball down the alley just like the good ones"): one continuous
    // travel with the ball from release into the pin action — the
    // camera rides behind the ball the whole way, easing to a stop
    // just short of the deck while the ball crashes the rack. No cuts.
    const camZ = Math.min(b.z - 2.7, 16.1);
    desired.set(b.x * 0.8, 1.34, camZ);
    look.set(b.x * 0.55, 0.2, Math.min(b.z + 3.9, 19.3));
  } else if (camMode === 'scatter') {
    desired.set(1.05, 0.85, 16.1);
    look.set(-0.1, 0.22, 18.9);
  } else {
    desired.set(aim.startX * 0.85, 1.52, -2.5);
    look.set(0, 0.25, 12);
  }
  const kp = 1 - Math.exp(-dt * (camMode === 'chase' ? 7.5 : 3.2));
  const kl = 1 - Math.exp(-dt * (camMode === 'chase' ? 9 : 3.6));
  camPos.lerp(desired, kp); camLook.lerp(look, kl);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}
function project(x, z) {
  const v = new THREE.Vector3(x, 0.1, z).project(camera);
  const r = canvas.getBoundingClientRect();
  return { x: (v.x * 0.5 + 0.5) * r.width + r.left, y: (-v.y * 0.5 + 0.5) * r.height + r.top };
}

/* ================= input — the throw =================
   Bowling Crew's documented scheme on our proven v3 integrity:
   drag the ball to position · drag the lane to angle · pull back and
   hold (hook needle sweeps) · flick up to throw. Every sample is
   recorded (coalesced events unpacked); a tremor accumulator with a
   deadband keeps aim from ratcheting; parseThrow's dip-averaging and
   +/-4.5 deg deadzone keep straight flicks dead straight. */
let gesture = null;
function laneMetersPerPx() {
  const a = project(-L.LANE.halfWidth, -0.4), b = project(L.LANE.halfWidth, -0.4);
  return L.LANE.width / Math.max(40, Math.abs(b.x - a.x));
}
canvas.addEventListener('pointerdown', e => {
  AudioX.ensure();
  if (phase !== 'aim' || turn !== 'you' || gesture) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  const bp = project(aim.startX, -0.4);
  const zone = Math.hypot(e.clientX - bp.x, e.clientY - bp.y) < 78 ? 'ball' : 'lane';
  gesture = {
    id: e.pointerId, zone, samples: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }],
    armed: false, armT: 0, carry: 0, lastX: e.clientX, startY: e.clientY, mpp: laneMetersPerPx(),
  };
});
canvas.addEventListener('pointermove', e => {
  if (!gesture || e.pointerId !== gesture.id) return;
  const evs = (e.getCoalescedEvents && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
  for (const ev of evs) {
    gesture.samples.push({ x: ev.clientX, y: ev.clientY, t: ev.timeStamp });
    const dx = ev.clientX - gesture.lastX;
    gesture.lastX = ev.clientX;
    if (!gesture.armed && ev.clientY - gesture.startY > 10) {
      gesture.armed = true; gesture.armT = ev.timeStamp;
    }
    const deadband = gesture.armed ? 7 : 2;
    gesture.carry += dx;
    if (Math.abs(gesture.carry) > deadband) {
      const apply = gesture.carry - Math.sign(gesture.carry) * deadband;
      gesture.carry = Math.sign(gesture.carry) * deadband;
      if (gesture.zone === 'ball') {
        aim.startX = Math.max(-0.44, Math.min(0.44, aim.startX + apply * gesture.mpp));
      } else {
        aim.angleDeg = Math.max(-9, Math.min(9, aim.angleDeg + apply * 0.03));
      }
    }
  }
});
function endGesture(e, cancelled) {
  if (!gesture || e.pointerId !== gesture.id) return;
  const g = gesture; gesture = null;
  $('#needleWrap').style.visibility = 'hidden';
  if (cancelled || phase !== 'aim' || turn !== 'you') return;
  g.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
  const parsed = L.parseThrow(g.samples);
  if (!parsed) return; // a drag, not a throw — ball stays lined up
  let hook = 0;
  if (g.armed) {
    const tSec = Math.max(0, (parsed.from.t - g.armT) / 1000);
    hook = L.effectiveHook(L.needleValue(tSec, curStats().control), curStats());
  }
  doThrow({
    startX: aim.startX,
    angleDeg: Math.max(-9, Math.min(9, aim.angleDeg + parsed.errDeg)),
    power: parsed.power, hook, loft: parsed.loft,
  });
}
canvas.addEventListener('pointerup', e => endGesture(e, false));
canvas.addEventListener('pointercancel', e => endGesture(e, true));

/* ================= throwing & flow ================= */
function doThrow(params) {
  const side = curSide();
  leaveBefore = side.standing.slice();
  const pins = L.makeRack(side.standing);
  throwState = L.createThrow(curBallDef(), curStats(), params, pins, 1.0);
  phase = 'rolling';
  clockOn = false;
  $('#clockWrap').style.visibility = 'hidden';
  $('#angleStrip').style.visibility = 'hidden';
  $('#mph').style.visibility = 'visible';
  camMode = 'chase';
  ballGrp.visible = true;
  ballGrp.position.set(params.startX, L.LANE.ballR, -0.4);
  setHint('');
}
function setHint(t) { $('#hint').innerHTML = t; }
const AIM_HINT = '<b>Drag ball</b> to line up · <b>drag lane</b> to angle · <b>pull back, hold</b> (hook needle sweeps) · <b>flick up</b> to throw';

function isSplitLeave(standing) {
  if (standing.length < 2 || standing.length > 6 || standing.includes(1)) return false;
  const pos = L.rackPositions();
  const xs = standing.map(n => pos[n][0]).sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > 0.5) return true;
  return false;
}

function finalizeThrow(downNums) {
  const side = curSide();
  const wasBall = side.ball, frameIdx = side.frame;
  const fr = side.frameRolls.slice();
  const downCount = downNums.length;
  const strike = downCount === 10 && leaveBefore.length === 10;
  const spare = !strike && wasBall >= 1 && fr[0] < 10 && fr[0] + downCount === 10 &&
    (frameIdx < 4 || wasBall === 1);
  const splitPickup = !strike && !spare && wasBall >= 1 && isSplitLeave(leaveBefore) && downCount === leaveBefore.length;
  if (turn === 'you') {
    save.stats.totalPins += downCount;
    if (strike) { save.stats.strikes++; matchStats.strikes++; matchStats.run++; save.stats.bestStrikeRun = Math.max(save.stats.bestStrikeRun, matchStats.run); }
    else matchStats.run = 0;
    if (spare) { save.stats.spares++; matchStats.spares++; }
    if (splitPickup) { save.stats.splitPickups++; toast('SPLIT PICKUP! 🎳'); }
    matchStats.pins += downCount;
  }
  if (strike) { banner('STRIKE!', turn === 'you' ? '' : `${L.RIVALS[rivalIdx].name} strikes`, 1300); AudioX.strike(); }
  else if (spare) { banner('SPARE!', '', 1100); AudioX.spare(); }
  else if (downCount === 0) banner('MISS', '', 800);

  const ev = L.feedRoll(side, downNums);
  sweepDeadPins();
  throwState = null;
  $('#mph').style.visibility = 'hidden';
  refreshScore(); refreshPinDots(); persist();
  schedule(0.55, () => resetPinViews(curSide().standing));

  if (ev.matchEnded || side.done) {
    const other = turn === 'you' ? sides.ai : sides.you;
    if (mode === 'practice' || other.done) { schedule(0.9, endMatch); phase = 'settle'; return; }
    turn = turn === 'you' ? 'ai' : 'you';
    beginTurn();
    return;
  }
  if (ev.frameEnded) {
    if (mode === 'practice') { beginTurn(); return; }
    turn = turn === 'you' ? 'ai' : 'you';
    beginTurn();
    return;
  }
  // same side, next ball
  if (turn === 'you') beginAim();
  else { phase = 'aithrow'; schedule(0.65, aiStep); }
}

function beginTurn() {
  refreshScore();
  if (turn === 'you') {
    setBallSkin(L.BALL_BY_ID[curBallId]);
    banner('YOUR THROW', `Frame ${curSide().frame + 1}`, 800);
    beginAim();
  } else {
    setBallSkin(L.BALL_BY_ID['chrome-comet']);
    banner(`${L.RIVALS[rivalIdx].name.toUpperCase()}`, `Frame ${curSide().frame + 1}`, 800);
    phase = 'aithrow';
    schedule(0.75, aiStep);
  }
}
function beginAim() {
  phase = 'aim';
  camMode = 'aim';
  clockLeft = 20; clockOn = true;
  $('#clockWrap').style.visibility = 'visible';
  $('#angleStrip').style.visibility = 'visible';
  ballGrp.visible = true;
  ballGrp.position.set(aim.startX, L.LANE.ballR, -0.4);
  $('#turnTag').textContent = mode === 'practice' ? `PRACTICE · FRAME ${curSide().frame + 1}` : `FRAME ${curSide().frame + 1} · BALL ${curSide().ball + 1}`;
  setHint(AIM_HINT);
  refreshPinDots();
}
function aiStep() {
  if (phase !== 'aithrow' || !sides || sides.ai.done) return;
  const side = sides.ai;
  const pins = L.makeRack(side.standing);
  const params = L.aiChooseParams(L.RIVALS[rivalIdx], pins, side.ball === 0, rand);
  aim.startX = params.startX;
  doThrow(params);
}
function forfeitThrow() {
  gesture = null;
  $('#needleWrap').style.visibility = 'hidden';
  banner('TOO SLOW', 'The shot clock ate that throw', 1200);
  leaveBefore = curSide().standing.slice();
  phase = 'settle'; settleT = 0.5;
  pendingAfterSettle = () => finalizeThrow([]);
}

let matchStats = { strikes: 0, spares: 0, pins: 0, run: 0 };
function startMatch(idx, practice) {
  mode = practice ? 'practice' : 'career';
  rivalIdx = practice ? 0 : Math.max(0, Math.min(L.RIVALS.length - 1, idx));
  sides = { you: L.newSide(), ai: L.newSide() };
  turn = 'you';
  matchStats = { strikes: 0, spares: 0, pins: 0, run: 0 };
  aiQueue = [];
  resetPinViews([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  refreshScore(); refreshTop();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('open'));
  if (practice) { banner('PRACTICE', 'Five frames, just you and the pins', 1300); $('#turnTag').textContent = 'PRACTICE'; }
  else banner(`VS ${L.RIVALS[rivalIdx].name.toUpperCase()}`, L.RIVALS[rivalIdx].title, 1500);
  beginAim();
  $('#playBtn').disabled = true; $('#practiceBtn').disabled = true;
}
function applyCards(ballId, count) {
  const rec = save.balls[ballId];
  rec.cards += count;
  let unlocked = false;
  if (!rec.owned && rec.cards >= L.UNLOCK_CARDS) { rec.owned = true; unlocked = true; }
  return unlocked;
}
function endMatch() {
  phase = 'over';
  clockOn = false;
  $('#clockWrap').style.visibility = 'hidden';
  const youTotal = L.scoreGame5(sides.you.rolls).total;
  const aiTotal = mode === 'practice' ? null : L.scoreGame5(sides.ai.rolls).total;
  save.stats.matches++;
  save.stats.bestScore = Math.max(save.stats.bestScore, youTotal);
  const rows = [];
  rows.push(`<div class="kv"><span>Your score</span><b>${youTotal}</b></div>`);
  let title, sub = '';
  if (mode === 'practice') {
    title = 'PRACTICE DONE';
    sub = `Best score: ${save.stats.bestScore}`;
    save.chips += 10; rows.push(`<div class="kv"><span>Practice chips</span><b>+10</b></div>`);
  } else {
    rows.push(`<div class="kv"><span>${L.RIVALS[rivalIdx].name}</span><b>${aiTotal}</b></div>`);
    const win = youTotal > aiTotal, push = youTotal === aiTotal;
    title = win ? 'YOU WIN!' : push ? 'PUSH — DEAD EVEN' : 'HOUSE TAKES IT';
    sub = win ? `${L.RIVALS[rivalIdx].name} is beaten` : push ? 'Nobody blinks. Run it back.' : `${L.RIVALS[rivalIdx].name} holds the house`;
    if (win) save.stats.wins++;
    const chips = win ? 60 : push ? 30 : 15;
    save.chips += chips;
    rows.push(`<div class="kv"><span>Chips</span><b>+${chips}</b></div>`);
    const td = push ? 0 : L.trophyDelta(win, rivalIdx);
    save.trophies = Math.max(0, save.trophies + td);
    rows.push(`<div class="kv"><span>Trophies</span><b>${td >= 0 ? '+' : ''}${td} (now ${save.trophies} · ${L.leagueTier(save.trophies)})</b></div>`);
    if (win && rivalIdx === save.ladder && !save.beaten[rivalIdx]) {
      save.beaten[rivalIdx] = true; save.ladder = Math.min(L.RIVALS.length, save.ladder + 1);
      const prize = L.openCase(rand);
      save.chips += prize.chips;
      const unlocked = applyCards(prize.cards.ballId, prize.cards.count);
      rows.push(`<div class="kv"><span>🏆 Ladder case</span><b>+${prize.chips} chips</b></div>`);
      rows.push(`<div class="kv"><span>Cards</span><b>+${prize.cards.count} ${L.BALL_BY_ID[prize.cards.ballId].name}${unlocked ? ' — UNLOCKED!' : ''}</b></div>`);
      if (save.ladder < L.RIVALS.length) rows.push(`<div class="kv"><span>Next up</span><b>${L.RIVALS[save.ladder].name}</b></div>`);
      else rows.push(`<div class="kv"><span>Ladder</span><b>COMPLETE — Cosmic Champion!</b></div>`);
    }
    // missions
    bumpMission('strikes3', matchStats.strikes); bumpMission('wins2', win ? 1 : 0);
    bumpMission('score100', youTotal >= 100 ? 1 : 0); bumpMission('spares2', matchStats.spares);
    bumpMission('pins300', matchStats.pins); bumpMission('play4', 1);
  }
  // achievements
  const snap = {
    strikes: save.stats.strikes, bestStrikeRun: save.stats.bestStrikeRun, spares: save.stats.spares,
    splitPickups: save.stats.splitPickups, bestScore: save.stats.bestScore,
    rivalsBeaten: Object.keys(save.beaten).length,
    ballsOwned: L.BALLS.filter(b => save.balls[b.id].owned).length,
    maxBallLevel: Math.max(...L.BALLS.map(b => save.balls[b.id].level)),
    totalPins: save.stats.totalPins,
  };
  for (const a of L.ACHIEVEMENTS) {
    if (!save.achievements[a.id] && a.test(snap)) {
      save.achievements[a.id] = true;
      rows.push(`<div class="kv"><span>🏅 Achievement</span><b>${a.name}</b></div>`);
      setTimeout(() => toast(`🏅 ${a.name}`), 600);
    }
  }
  $('#resTitle').textContent = title;
  $('#resSub').textContent = sub;
  $('#resRows').innerHTML = rows.join('');
  $('#resultsScreen').classList.add('open');
  $('#playBtn').disabled = false; $('#practiceBtn').disabled = false;
  refreshTop(); refreshScore(); refreshDeck(); persist();
}
function bumpMission(id, by) {
  if (!by) return;
  if (save.missions[id] === -1) return;
  save.missions[id] = (save.missions[id] || 0) + by;
}

/* ================= screens ================= */
function renderCareer() {
  const list = $('#ladderList'); list.innerHTML = '';
  L.RIVALS.forEach((r, i) => {
    const beaten = !!save.beaten[i];
    const isNext = i === save.ladder;
    const locked = i > save.ladder;
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<div class="row">
      <div style="flex:1">
        <div class="nm">${i + 1}. ${r.name} <span class="tagchip ${beaten ? 'done' : isNext ? '' : 'lock'}">${beaten ? 'BEATEN ✓' : isNext ? 'NEXT UP' : 'LOCKED'}</span></div>
        <div class="ds">${r.title} · bowls a ${r.type} ball</div>
        <div class="st">PWR ${r.stats.power} · SPN ${r.stats.spin} · ACC ${r.stats.accuracy} · CTL ${r.stats.control}</div>
      </div>
      ${!locked ? `<button class="btn mini ${isNext ? 'primary' : ''}" data-fight="${i}">${beaten ? 'REMATCH' : 'BOWL'}</button>` : ''}
    </div>`;
    list.appendChild(card);
  });
  list.querySelectorAll('[data-fight]').forEach(b => b.addEventListener('click', () => { AudioX.ui(); startMatch(+b.dataset.fight, false); }));
  const ml = $('#missionList'); ml.innerHTML = '';
  for (const m of L.MISSIONS) {
    const prog = save.missions[m.id];
    const claimed = prog === -1;
    const done = !claimed && (prog || 0) >= m.goal;
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<div class="row"><div style="flex:1">
        <div class="nm" style="font-size:13px;">${m.text} ${claimed ? '<span class="tagchip done">CLAIMED ✓</span>' : ''}</div>
        ${claimed ? '' : `<div class="prog"><i style="width:${Math.min(100, (prog || 0) / m.goal * 100)}%"></i></div>
        <div class="ds">${Math.min(prog || 0, m.goal)} / ${m.goal} · pays ${m.reward.chips ? m.reward.chips + ' chips' : 'a prize case'}</div>`}
      </div>
      ${done ? `<button class="btn mini primary" data-claim="${m.id}">CLAIM</button>` : ''}
    </div>`;
    ml.appendChild(card);
  }
  ml.querySelectorAll('[data-claim]').forEach(b => b.addEventListener('click', () => {
    const m = L.MISSIONS.find(x => x.id === b.dataset.claim);
    save.missions[m.id] = -1;
    if (m.reward.chips) { save.chips += m.reward.chips; toast(`+${m.reward.chips} chips`); }
    if (m.reward.case) {
      const prize = L.openCase(rand);
      save.chips += prize.chips;
      const un = applyCards(prize.cards.ballId, prize.cards.count);
      toast(`Case: +${prize.chips} chips, +${prize.cards.count} ${L.BALL_BY_ID[prize.cards.ballId].name} cards${un ? ' — UNLOCKED!' : ''}`, 3200);
    }
    refreshTop(); refreshDeck(); persist(); renderCareer();
  }));
  const al = $('#achList'); al.innerHTML = '';
  for (const a of L.ACHIEVEMENTS) {
    const got = !!save.achievements[a.id];
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<div class="row"><div class="nm" style="font-size:13px;">${got ? '🏅' : '🔒'} ${a.name}</div>
      <span class="tagchip ${got ? 'done' : 'lock'}" style="margin-left:auto">${got ? 'EARNED' : 'LOCKED'}</span></div>`;
    al.appendChild(card);
  }
}
function renderBag() {
  const list = $('#bagList'); list.innerHTML = '';
  for (const b of L.BALLS) {
    const rec = save.balls[b.id];
    const st = L.ballStatsAt(b, rec.level);
    const cost = rec.level < L.MAX_LEVEL ? L.upgradeCost(b, rec.level) : null;
    const card = document.createElement('div'); card.className = 'card';
    let action = '';
    if (!rec.owned) action = rec.cards >= L.UNLOCK_CARDS
      ? `<button class="btn mini primary" data-unlock="${b.id}">UNLOCK</button>`
      : `<span class="tagchip lock">${rec.cards}/${L.UNLOCK_CARDS} CARDS</span>`;
    else if (b.id === curBallId) action = '<span class="tagchip done">IN HAND</span>';
    else action = `<button class="btn mini" data-select="${b.id}">SELECT</button>`;
    card.innerHTML = `<div class="row">
      <div class="orb" style="${orbStyle(b)}"></div>
      <div style="flex:1;min-width:0">
        <div class="nm">${b.name} <span class="tagchip">${b.type.toUpperCase()}</span> <span class="tagchip lock">${b.rarity.toUpperCase()}</span></div>
        <div class="ds">${b.blurb}</div>
        <div class="st">Lv ${rec.level} · PWR ${st.power.toFixed(0)} · SPN ${st.spin.toFixed(0)} · ACC ${st.accuracy.toFixed(0)} · CTL ${st.control.toFixed(0)}${rec.owned ? ` · ${rec.cards} cards` : ''}</div>
      </div>${action}</div>
      ${rec.owned && cost ? `<div class="row" style="margin-top:7px"><div class="ds" style="flex:1">Upgrade to Lv ${rec.level + 1}: ${cost.cards} cards + ${cost.chips} chips</div>
        <button class="btn mini" data-upgrade="${b.id}" ${rec.cards >= cost.cards && save.chips >= cost.chips ? '' : 'disabled'}>UPGRADE</button></div>` : ''}`;
    list.appendChild(card);
  }
  list.querySelectorAll('[data-select]').forEach(x => x.addEventListener('click', () => { selectBall(x.dataset.select); renderBag(); AudioX.ui(); }));
  list.querySelectorAll('[data-unlock]').forEach(x => x.addEventListener('click', () => {
    const rec = save.balls[x.dataset.unlock];
    rec.cards -= L.UNLOCK_CARDS; rec.owned = true;
    toast(`${L.BALL_BY_ID[x.dataset.unlock].name} unlocked!`);
    persist(); renderBag(); refreshDeck();
  }));
  list.querySelectorAll('[data-upgrade]').forEach(x => x.addEventListener('click', () => {
    const b = L.BALL_BY_ID[x.dataset.upgrade], rec = save.balls[b.id];
    const cost = L.upgradeCost(b, rec.level);
    if (rec.cards < cost.cards || save.chips < cost.chips) return;
    rec.cards -= cost.cards; save.chips -= cost.chips; rec.level++;
    toast(`${b.name} → Lv ${rec.level}`);
    persist(); renderBag(); refreshDeck(); refreshTop(); AudioX.ui();
  }));
}
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => {
  b.closest('.screen').classList.remove('open'); AudioX.ui();
}));
$('#careerBtn').addEventListener('click', () => { renderCareer(); $('#careerScreen').classList.add('open'); AudioX.ui(); });
$('#bagBtn').addEventListener('click', () => { renderBag(); $('#bagScreen').classList.add('open'); AudioX.ui(); });
$('#helpBtn').addEventListener('click', () => { $('#helpScreen').classList.add('open'); AudioX.ui(); });
$('#curOrb').addEventListener('click', () => { renderBag(); $('#bagScreen').classList.add('open'); });
$('#playBtn').addEventListener('click', () => { startMatch(Math.min(save.ladder, L.RIVALS.length - 1), false); });
$('#practiceBtn').addEventListener('click', () => { startMatch(0, true); });
$('#resClose').addEventListener('click', () => { $('#resultsScreen').classList.remove('open'); phase = 'menu'; camMode = 'menu'; $('#turnTag').textContent = 'COSMIC BOWLING'; setHint(''); });
$('#resAgain').addEventListener('click', () => { startMatch(mode === 'practice' ? 0 : rivalIdx, mode === 'practice'); });

/* ================= main loop ================= */
function resize() {
  const st = $('#stage');
  const w = st.clientWidth, h = st.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

let lastT = performance.now();
let physAcc = 0;
let ballLog = null;
let renderPaused = false;
function tick(now) {
  requestAnimationFrame(tick);
  // wall-clock dt with a generous cap: on a 60 fps phone this changes
  // nothing; on a slow frame (tab switch, weak GPU) the game still
  // advances in real time instead of slow-motion.
  let dt = Math.min(0.25, (now - lastT) / 1000);
  lastT = now;
  timeScale = window.__fast ? 6 : (turn === 'ai' && (phase === 'rolling' || phase === 'aithrow') ? 1.6 : 1);
  const sdt = dt * timeScale;
  gameTime += sdt;
  // scheduled callbacks
  for (let i = aiQueue.length - 1; i >= 0; i--) {
    if (gameTime >= aiQueue[i].at) { const f = aiQueue[i].fn; aiQueue.splice(i, 1); f(); }
  }
  // shot clock (real time)
  if (clockOn && phase === 'aim') {
    clockLeft -= dt;
    const el = $('#clockNum');
    el.textContent = Math.max(0, Math.ceil(clockLeft));
    $('#clockWrap').classList.toggle('low', clockLeft <= 5.5);
    if (clockLeft <= 0) { clockOn = false; forfeitThrow(); }
  }
  // physics
  if (phase === 'rolling' && throwState) {
    physAcc += sdt;
    const step = 1 / 240;
    let guard = 0;
    while (physAcc >= step && guard++ < 2400) {
      L.stepThrow(throwState, step);
      physAcc -= step;
      if (ballLog) ballLog.push({ x: throwState.ball.x, z: throwState.ball.z, vx: throwState.ball.vx, vz: throwState.ball.vz });
      const evs = throwState.events.splice(0);
      for (const ev of evs) {
        if (ev.type === 'pinhit') AudioX.pinHit(1);
        else if (ev.type === 'pinfall') { const p = throwState.pins.find(q => q.n === ev.pin); if (p) pinFallStart(p); }
        else if (ev.type === 'gutter') AudioX.gutter();
        else if (ev.type === 'land') AudioX.land();
      }
      if (throwState.ball.done) break;
    }
    const b = throwState.ball;
    // ball visual
    let y = L.LANE.ballR;
    if (b.airborne && b.loftZ > 0) {
      const prog = Math.max(0, Math.min(1, b.z / b.loftZ));
      y = L.LANE.ballR + Math.sin(prog * Math.PI) * 0.34 * (b.loftZ / 6);
    }
    ballGrp.position.set(b.x, y, b.z);
    ballMesh.rotation.x += (b.vz * sdt) / L.LANE.ballR * 0.9;
    ballMesh.rotation.z -= (b.vx * sdt) / L.LANE.ballR * 0.9;
    ballMesh.rotation.y += b.spin * sdt * 1.5;
    $('#mph').textContent = `${Math.max(0, Math.round(b.vz * 2.237))} MPH`;
    refreshPinDots();
    if (b.done) {
      phase = 'settle'; settleT = 0.85;
      camMode = L.pinsDown(throwState).length ? 'scatter' : 'aim';
      const st2 = throwState;
      pendingAfterSettle = () => finalizeThrow(L.pinsDown(st2));
    }
  } else if (phase === 'settle') {
    settleT -= sdt;
    if (settleT <= 0 && pendingAfterSettle) { const f = pendingAfterSettle; pendingAfterSettle = null; f(); }
  } else if (phase === 'aim' && turn === 'you') {
    ballGrp.position.x += (aim.startX - ballGrp.position.x) * Math.min(1, dt * 14);
    ballGrp.position.z = -0.4;
    ballGrp.position.y = L.LANE.ballR;
    const strip = $('#angleStrip');
    strip.querySelector('.deg').textContent = `${aim.angleDeg.toFixed(1)}°`;
  }
  // needle UI while holding the pull-back
  if (gesture && gesture.armed && phase === 'aim') {
    $('#needleWrap').style.visibility = 'visible';
    const tSec = Math.max(0, (performance.now() - gesture.armT) / 1000);
    const n = L.needleValue(tSec, curStats().control);
    $('#needleMark').style.left = `${50 + n * 47}%`;
  }
  tickPins(sdt);
  tickCamera(dt);
  if (!renderPaused && !document.hidden) renderer.render(scene, camera);
}

/* ================= boot ================= */
setBallSkin(L.BALL_BY_ID[curBallId]);
refreshTop(); refreshDeck(); refreshScore(); refreshPinDots();
resetPinViews([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
resize();
setTimeout(resize, 60);
$('#turnTag').textContent = 'COSMIC BOWLING';
setHint('<b>PLAY</b> starts your career match · <b>PRACTICE</b> is five frames solo');
requestAnimationFrame(tick);

/* debug / test hooks (used by the drift + match harnesses) */
window.CB3D = {
  L, save: () => save,
  phase: () => phase,
  state: () => ({
    phase, mode, turn,
    frame: sides ? curSide().frame : -1,
    ballInFrame: sides ? curSide().ball : -1,
    aim: { ...aim },
    ball: throwState ? { x: throwState.ball.x, z: throwState.ball.z, vx: throwState.ball.vx, vz: throwState.ball.vz, done: throwState.ball.done } : null,
    standing: sides ? curSide().standing.slice() : null,
    scores: sides ? { you: L.scoreGame5(sides.you.rolls).total, ai: L.scoreGame5(sides.ai.rolls).total } : null,
    rolls: sides ? { you: sides.you.rolls.slice(), ai: sides.ai.rolls.slice() } : null,
  }),
  project,
  startMatch: i => startMatch(i, false),
  startPractice: () => startMatch(0, true),
  debugThrow: p => { if (phase === 'aim' && turn === 'you') { doThrow({ loft: 0, ...p }); return true; } return false; },
  setFast: v => { window.__fast = !!v; },
  startBallLog: () => { ballLog = []; },
  ballLogLen: () => (ballLog || []).length,
  ballLog: () => { const l = ballLog; ballLog = null; return l || []; },
  pauseRender: v => { renderPaused = !!v; },
  renderOnce: () => { renderer.render(scene, camera); return canvas.toDataURL('image/png'); },
};
