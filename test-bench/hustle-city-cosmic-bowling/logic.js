/* Hustle City Cosmic Bowling — pure game logic: scoring, physics, balls,
   alleys, AI, gesture parsing. No DOM. Node-testable (see sim.js).
   Mechanics/structure copied from the #1 bowling game's published design
   (see ../RESEARCH.md); all code, names and art are original J-Dawgs work.
   (c) 2026 J-Dawgs Industries. */
'use strict';

/* ================= lane & physics constants (metres) ================= */
const LANE = {
  width: 1.06,          // playing surface width
  halfWidth: 0.53,
  gutterCentre: 0.615,  // ball centre rides here once in the gutter
  headPinZ: 18.29,      // 60 ft to the head pin
  deckEndZ: 19.75,
  pitZ: 20.4,
  ballR: 0.108,
  pinR: 0.0605,
  pinMass: 1.55,
  pinSpacing: 0.3048,   // 12 in centre to centre
  rowDepth: 0.2639,     // spacing * sin(60deg)
};

/* Standard rack: pin number -> [x, z] (head pin = 1 at z = headPinZ). */
function rackPositions() {
  const s = LANE.pinSpacing, d = LANE.rowDepth, z0 = LANE.headPinZ;
  return {
    1: [0, z0],
    2: [-s / 2, z0 + d], 3: [s / 2, z0 + d],
    4: [-s, z0 + 2 * d], 5: [0, z0 + 2 * d], 6: [s, z0 + 2 * d],
    7: [-1.5 * s, z0 + 3 * d], 8: [-s / 2, z0 + 3 * d], 9: [s / 2, z0 + 3 * d], 10: [1.5 * s, z0 + 3 * d],
  };
}

/* Varied starting layouts (Alleys 3+). Frame 3 always uses the full rack. */
const LAYOUTS = {
  full:        { name: 'Full Rack',    pins: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  cornersOff:  { name: 'Corners Off',  pins: [1, 2, 3, 4, 5, 6, 8, 9] },
  middleOut:   { name: 'Middle Out',   pins: [1, 2, 3, 4, 6, 7, 8, 9, 10] },
  leftStack:   { name: 'Left Stack',   pins: [1, 2, 4, 5, 7, 8] },
  rightStack:  { name: 'Right Stack',  pins: [1, 3, 5, 6, 9, 10] },
  theSplit:    { name: 'The Split',    pins: [1, 2, 3, 7, 10] },
};
const LAYOUT_KEYS = Object.keys(LAYOUTS);

function makeRack(layoutKey) {
  const pos = rackPositions();
  return LAYOUTS[layoutKey].pins.map(n => ({
    n, x: pos[n][0], z: pos[n][1], ox: pos[n][0], oz: pos[n][1],
    vx: 0, vz: 0, down: false, gone: false, hit: false, peak: 0,
  }));
}

/* ================= balls =================
   Types: Beginner / Power / Bounce / Precise.
   Weight + Hook Control grow with level; Speed / Guide / Hook are fixed
   identity stats. Stat scale 0..20. */
const RARITY_MULT = { Common: 1, Rare: 1.6, Epic: 2.5 };
const BALLS = [
  { id: 'house-rock',     name: 'House Rock',     type: 'Beginner', rarity: 'Common', stats: { weight: 11, hookControl: 6,  speed: 5, guide: 6,  hook: 4 },  skin: { base: '#c8ccd4', glow: '#7fb2ff', swirl: '#5b7fa6' }, blurb: 'The chrome house ball. Honest, free, never upgrades — it just bowls.' },
  { id: 'chrome-comet',   name: 'Chrome Comet',   type: 'Power',    rarity: 'Common', stats: { weight: 14, hookControl: 4,  speed: 6, guide: 4,  hook: 5 },  skin: { base: '#dfe6ee', glow: '#38b6ff', swirl: '#1c6fd9' }, blurb: 'Polished chrome with a comet heart. Plows the rack and keeps driving.' },
  { id: 'nebula-bouncer', name: 'Nebula Bouncer', type: 'Bounce',   rarity: 'Common', stats: { weight: 11, hookControl: 6,  speed: 6, guide: 5,  hook: 6 },  skin: { base: '#3a1150', glow: '#ff4fd8', swirl: '#8a2be2' }, blurb: 'Magenta nebula resin. Pins jump off it — splits beware.' },
  { id: 'starlight',      name: 'Starlight Sniper', type: 'Precise', rarity: 'Common', stats: { weight: 10, hookControl: 8,  speed: 5, guide: 9,  hook: 3 },  skin: { base: '#101c3a', glow: '#bfe0ff', swirl: '#e8f4ff' }, blurb: 'Long guide, soft hands. Built to pick off single pins.' },
  { id: 'gas-giant',      name: 'Gas Giant',      type: 'Power',    rarity: 'Rare',   stats: { weight: 16, hookControl: 5,  speed: 5, guide: 4,  hook: 6 },  skin: { base: '#4a2410', glow: '#ffb35c', swirl: '#d97b2b' }, blurb: 'A banded planet of a ball. The heaviest thing on the rack.' },
  { id: 'moonshot',       name: 'Moonshot',       type: 'Precise',  rarity: 'Rare',   stats: { weight: 11, hookControl: 9,  speed: 6, guide: 10, hook: 4 },  skin: { base: '#8f97a3', glow: '#e8ecf2', swirl: '#5c6470' }, blurb: 'Cratered grey moonstone. Dead-eye guide for ugly leaves.' },
  { id: 'void-walker',    name: 'Void Walker',    type: 'Power',    rarity: 'Epic',   stats: { weight: 18, hookControl: 6,  speed: 7, guide: 5,  hook: 8 },  skin: { base: '#05060a', glow: '#9d6bff', swirl: '#4b1d96' }, blurb: 'A black hole in ball form. Bends late and hits like a truck.' },
  { id: 'pulsar',         name: 'Pulsar',         type: 'Bounce',   rarity: 'Epic',   stats: { weight: 12, hookControl: 8,  speed: 8, guide: 6,  hook: 7 },  skin: { base: '#062a33', glow: '#3ff7e0', swirl: '#0e7f8c' }, blurb: 'A spinning neutron star. Pins leave the deck at escape velocity.' },
  { id: 'quasar-queen',   name: 'Quasar Queen',   type: 'Precise',  rarity: 'Epic',   stats: { weight: 12, hookControl: 10, speed: 7, guide: 11, hook: 6 },  skin: { base: '#2a0a3a', glow: '#e07bff', swirl: '#a03fd9' }, blurb: 'The brightest object in the alley. Control like a laser.' },
];
const BALL_BY_ID = Object.fromEntries(BALLS.map(b => [b.id, b]));
const MAX_LEVEL = 20;
const UNLOCK_CARDS = 5; // cards needed to unlock an unowned ball

function ballStatsAt(ball, level) {
  const s = ball.stats, lv = Math.max(1, level || 1);
  if (ball.type === 'Beginner') return { ...s };
  return {
    weight: s.weight + 0.35 * (lv - 1),
    hookControl: s.hookControl + 0.30 * (lv - 1),
    speed: s.speed, guide: s.guide, hook: s.hook,
  };
}
function upgradeCost(ball, level) { // cost to go level -> level+1
  return { cards: level, chips: Math.round(25 * level * RARITY_MULT[ball.rarity]) };
}

/* ================= alleys & league ================= */
const ALLEYS = [
  { id: 'nebula',  name: 'Neon Nebula Lanes', gate: 0,   stake: 25,   hookFactor: 1.0,  aiSkill: 0.30, aiName: 'Nova Rex',      hue: 265 },
  { id: 'planet9', name: 'Planet Nine',       gate: 30,  stake: 60,   hookFactor: 0.72, aiSkill: 0.45, aiName: 'Captain Comet', hue: 210 },
  { id: 'orbit',   name: 'The Orbit Room',    gate: 90,  stake: 150,  hookFactor: 1.18, aiSkill: 0.58, aiName: 'Vega Vance',    hue: 190, layouts: true },
  { id: 'comet',   name: 'Comet Club',        gate: 200, stake: 400,  hookFactor: 0.85, aiSkill: 0.72, aiName: 'Halley Hart',   hue: 320, layouts: true },
  { id: 'darkside', name: 'Dark Side Lanes',  gate: 420, stake: 1000, hookFactor: 1.0,  aiSkill: 0.86, aiName: 'The Eclipse',   hue: 285, layouts: true },
];
const LEAGUE_RANKS = [
  { name: 'Rookie', at: 0 }, { name: 'Bronze', at: 40 }, { name: 'Silver', at: 120 },
  { name: 'Gold', at: 260 }, { name: 'Platinum', at: 500 }, { name: 'Cosmic', at: 800 },
];
function leagueRank(trophies) {
  let r = LEAGUE_RANKS[0];
  for (const k of LEAGUE_RANKS) if (trophies >= k.at) r = k;
  return r.name;
}
function trophyDelta(win, alleyIdx) { return win ? 10 + alleyIdx * 2 : -(6 + alleyIdx); }

/* ================= scoring (3 frames, traditional) =================
   rolls: flat pin counts. rackSizes: pins in the starting rack per frame
   (frame 3 always 10). Frame 3 works like a real 10th frame. */
function scoreGame(rolls, rackSizes) {
  const rack = rackSizes || [10, 10, 10];
  let total = 0, ri = 0;
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const start = ri;
    if (f < 2) {
      if (rolls[ri] === rack[f] && rolls[ri] !== undefined) {           // strike
        total += rack[f] + (rolls[ri + 1] || 0) + (rolls[ri + 2] || 0); ri += 1;
      } else if ((rolls[ri] || 0) + (rolls[ri + 1] || 0) === rack[f]) { // spare
        total += rack[f] + (rolls[ri + 2] || 0); ri += 2;
      } else { total += (rolls[ri] || 0) + (rolls[ri + 1] || 0); ri += 2; }
    } else {
      total += (rolls[ri] || 0) + (rolls[ri + 1] || 0) + (rolls[ri + 2] || 0); ri += 3;
    }
    frames.push({ rolls: rolls.slice(start, ri), cum: total });
  }
  return { total, frames };
}
/* Running score for a game in progress: score only frames whose bonus
   rolls have all been thrown (standard scoreboard behaviour). */
function scoreSoFar(rolls, rackSizes) {
  const rack = rackSizes || [10, 10, 10];
  let total = 0, ri = 0;
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const start = ri;
    let cum = null;
    if (f < 2) {
      if (rolls[ri] === undefined) { frames.push({ rolls: [], cum: null }); break; }
      if (rolls[ri] === rack[f]) {
        if (rolls[ri + 1] !== undefined && rolls[ri + 2] !== undefined) { total += rack[f] + rolls[ri + 1] + rolls[ri + 2]; cum = total; }
        ri += 1;
      } else if (rolls[ri + 1] === undefined) { frames.push({ rolls: rolls.slice(start), cum: null }); ri += 1; break; }
      else if (rolls[ri] + rolls[ri + 1] === rack[f]) {
        if (rolls[ri + 2] !== undefined) { total += rack[f] + rolls[ri + 2]; cum = total; }
        ri += 2;
      } else { total += rolls[ri] + rolls[ri + 1]; cum = total; ri += 2; }
    } else {
      const mine = rolls.slice(ri);
      if (mine.length) { total += mine.reduce((a, b) => a + b, 0); cum = total; }
      ri += mine.length;
    }
    frames.push({ rolls: rolls.slice(start, ri), cum });
  }
  return { total, frames };
}

/* ================= the throw — physics =================
   Top-down 2D simulation (x = across the lane, z = down the lane),
   presented in perspective by the renderer. Pins are physics bodies:
   velocity transfer, pin-on-pin collisions, kickback bounces. */
function ballMass(stats) { return 3.4 + stats.weight * 0.32; }        // ~6.9 (W11) .. ~9.2 (W18)
function pinExitBoost(ballDef) { return ballDef.type === 'Bounce' ? 1.24 : 1.0; }

/* params: { startX, angleDeg, power 0..1, hook -1..1, loft 0..1 }
   stats: effective ball stats (ballStatsAt). alley: { hookFactor }. */
function createThrow(ballDef, stats, params, pins, alley) {
  const v = (4.4 + 7.4 * params.power) * (0.92 + stats.speed * 0.016);
  const ang = params.angleDeg * Math.PI / 180;
  return {
    ballDef, stats, alley,
    ball: {
      x: params.startX, z: -0.4,
      vx: v * Math.sin(ang), vz: v * Math.cos(ang),
      r: LANE.ballR, spin: params.hook, loftZ: params.loft * 6.0,
      airborne: params.loft > 0.03, inGutter: false, done: false, dist: 0,
    },
    pins: pins.map(p => ({ ...p })),
    t: 0, events: [], hook: params.hook,
    maxHookAccel: (stats.hook / 10) * 2.7 * (alley.hookFactor || 1),
  };
}

function stepThrow(st, dt) {
  const b = st.ball, ev = st.events;
  if (b.done) return st;
  st.t += dt;
  /* --- ball --- */
  if (!b.inGutter) {
    if (b.airborne && b.z >= b.loftZ) { b.airborne = false; ev.push({ type: 'land', x: b.x, z: b.z }); }
    if (!b.airborne) {
      // skid -> hook -> roll: friction reads grow mid-lane, fade late
      const zf = b.z / LANE.headPinZ;
      const phase = zf < 0.38 ? 0.12 : zf < 0.76 ? 1.0 : 0.30;
      b.vx += -st.hook * st.maxHookAccel * phase * dt;   // +hook bends left (right-hand hook)
      b.vz -= 0.38 * dt;                                  // lane friction
    }
    if (Math.abs(b.x) > LANE.halfWidth + 0.015 && !b.airborne) {
      b.inGutter = true; b.x = Math.sign(b.x) * LANE.gutterCentre; b.vx = 0;
      ev.push({ type: 'gutter', z: b.z });
    }
  } else {
    b.vz -= 0.10 * dt;
  }
  b.x += b.vx * dt; b.z += b.vz * dt; b.dist += Math.abs(b.vz) * dt;

  /* --- pins: integrate --- */
  for (const p of st.pins) {
    if (p.gone) continue;
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > 0.001) {
      p.x += p.vx * dt; p.z += p.vz * dt;
      const damp = Math.exp(-1.8 * dt);
      p.vx *= damp; p.vz *= damp;
      if (Math.hypot(p.vx, p.vz) < 0.05) { p.vx = 0; p.vz = 0; }
    }
    // kickbacks: pins bounce off the side walls and stay dangerous
    if (Math.abs(p.x) > 0.60) { p.x = Math.sign(p.x) * 0.60; p.vx = -p.vx * 0.5; }
    if (p.z > LANE.pitZ || Math.abs(p.x) > 0.72) p.gone = true;
    // a pin topples when it was genuinely hit, or shoved well off its spot;
    // a slow nudge that just slides it a few cm leaves it standing
    if (!p.down && ((Math.hypot(p.x - p.ox, p.z - p.oz) > 0.085 && p.peak > 0.9) ||
                    Math.hypot(p.x - p.ox, p.z - p.oz) > 0.17 || p.gone)) {
      p.down = true; ev.push({ type: 'pinfall', pin: p.n });
    }
  }
  /* --- ball vs pins --- */
  if (!b.inGutter) {
    const mb = ballMass(st.stats), mp = LANE.pinMass, boost = pinExitBoost(st.ballDef);
    for (const p of st.pins) {
      if (p.gone) continue;
      const dx = p.x - b.x, dz = p.z - b.z, rr = LANE.ballR + LANE.pinR;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-9) {
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d;
        const rvn = (p.vx - b.vx) * nx + (p.vz - b.vz) * nz;
        if (rvn < 0) {
          const e = 0.50, j = -(1 + e) * rvn / (1 / mb + 1 / mp);
          b.vx -= j / mb * nx; b.vz -= j / mb * nz;
          p.vx += j / mp * nx * boost; p.vz += j / mp * nz * boost;
          const overlap = rr - d;
          p.x += nx * overlap; p.z += nz * overlap;
          p.peak = Math.max(p.peak, Math.abs(rvn));
          if (!p.hit) { p.hit = true; ev.push({ type: 'pinhit', pin: p.n, speed: Math.abs(rvn) }); }
        }
      }
    }
  }
  /* --- pin vs pin --- */
  const ps = st.pins;
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].gone) continue;
    for (let k = i + 1; k < ps.length; k++) {
      if (ps[k].gone) continue;
      const a = ps[i], c = ps[k];
      const dx = c.x - a.x, dz = c.z - a.z, rr = LANE.pinR * 2;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-9) {
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d;
        const rvn = (c.vx - a.vx) * nx + (c.vz - a.vz) * nz;
        if (rvn < 0) {
          const e = 0.60, j = -(1 + e) * rvn / (2 / LANE.pinMass);
          a.vx -= j / LANE.pinMass * nx; a.vz -= j / LANE.pinMass * nz;
          c.vx += j / LANE.pinMass * nx; c.vz += j / LANE.pinMass * nz;
          const push = (rr - d) / 2;
          a.x -= nx * push; a.z -= nz * push; c.x += nx * push; c.z += nz * push;
          a.peak = Math.max(a.peak, Math.abs(rvn)); c.peak = Math.max(c.peak, Math.abs(rvn));
          if (!c.hit) { c.hit = true; ev.push({ type: 'pinhit', pin: c.n, speed: Math.abs(rvn) }); }
          if (!a.hit) { a.hit = true; ev.push({ type: 'pinhit', pin: a.n, speed: Math.abs(rvn) }); }
        }
      }
    }
  }
  /* --- end conditions --- */
  const pinsMoving = st.pins.some(p => !p.gone && Math.hypot(p.vx, p.vz) > 0.09);
  if ((b.z > LANE.pitZ + 0.25 || (b.z > LANE.headPinZ && b.vz < 0.4) || st.t > 7) && !pinsMoving) b.done = true;
  if (st.t > 9) b.done = true;
  return st;
}

function runThrow(ballDef, stats, params, pins, alley) {
  const st = createThrow(ballDef, stats, params, pins, alley);
  const dt = 1 / 300;
  while (!st.ball.done) stepThrow(st, dt);
  return st;
}
function pinsDown(st) { return st.pins.filter(p => p.down).map(p => p.n); }
function standingPins(st) { return st.pins.filter(p => !p.down && !p.gone); }

/* ================= gesture parsing (pure) =================
   The pull-back + flick: samples = [{x, y, t}] in CSS pixels (y down).
   Power from the flick's upward speed; direction error from its lateral
   drift; loft from power (a truly fast flick lobs the ball). */
function parseFlick(samples) {
  if (!samples || samples.length < 3) return null;
  const last = samples[samples.length - 1];
  // fastest upward run inside the final 300 ms
  let best = null;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (last.t - s.t > 300 || last.t - s.t < 30) continue;
    const vy = (s.y - last.y) / ((last.t - s.t) / 1000); // px/s upward positive
    if (vy > 0 && (!best || vy > best.vy)) best = { vy, dx: last.x - s.x, dy: s.y - last.y, from: s };
  }
  if (!best || best.vy < 260) return null; // not a throw — a drag
  const power = Math.min(1, Math.max(0.08, best.vy / 2300));
  const errDeg = Math.atan2(best.dx, Math.max(40, best.dy)) * 180 / Math.PI * 0.55;
  const loft = Math.max(0, Math.min(1, (power - 0.78) / 0.22)) * 0.9;
  return { power, errDeg: Math.max(-9, Math.min(9, errDeg)), loft, from: best.from };
}
/* Hook needle: sweeps while the player holds the pull-back. Slower sweep
   = higher Hook Control. Value -1..1; 0 = dead centre = straight ball. */
function needleValue(tSec, hookControl) {
  const hz = 1.18 - Math.min(20, hookControl) * 0.026; // ~1.0 Hz stock, ~0.66 Hz maxed
  return Math.sin(tSec * Math.PI * 2 * hz);
}
function effectiveHook(needle, stats) {
  return Math.max(-1, Math.min(1, needle)) * (0.35 + stats.hook / 10 * 0.85);
}

/* ================= AI opponent =================
   The house AI throws with the same physics. Skill scales its aim noise
   and pocket discipline, so its scores are earned, not scripted. */
function rng(seedObj) { // mulberry32
  let a = seedObj.s >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function aiBallFor(alleyIdx) {
  const base = BALL_BY_ID['chrome-comet'];
  const stats = { weight: 12.5 + alleyIdx * 1.1, hookControl: 6, speed: 5.5 + alleyIdx * 0.4, guide: 6, hook: 5 + alleyIdx * 0.5 };
  return { def: base, stats };
}
function aiThrowParams(alley, standing, isFirstRoll, rand) {
  const skill = alley.aiSkill;
  const noise = (1 - skill) * 0.055 + 0.008;             // metres of aim wander
  const g = () => (rand() + rand() + rand() - 1.5) / 1.5; // soft gaussian -1..1
  let targetX, hook = 0.55 + g() * 0.2;
  if (isFirstRoll) {
    targetX = 0.055 + g() * noise * 2.2;                  // the 1-3 pocket, right side
  } else {
    // shoot the leave: aim at the centroid of what's standing, straighter ball
    const cx = standing.reduce((a, p) => a + p.x, 0) / standing.length;
    targetX = cx + g() * noise * 1.6;
    hook = 0.12 * Math.sign(targetX || 1);
  }
  // solve a start position + angle that lands the ball near targetX at the pins
  const startX = Math.max(-0.42, Math.min(0.42, targetX - 0.16 - hook * 0.05 + g() * noise));
  const angleDeg = Math.atan2(targetX - startX - hook * -0.10, LANE.headPinZ) * 180 / Math.PI + g() * (1 - skill) * 1.1;
  return {
    startX, angleDeg: Math.max(-7, Math.min(7, angleDeg)),
    power: 0.62 + skill * 0.25 + g() * 0.08,
    hook: Math.max(-1, Math.min(1, hook)), loft: 0,
  };
}
/* The AI picks its line the honest way: it tries candidate lines against
   the live rack in the same physics, keeps the best, then human execution
   noise (scaled by 1 - skill) is applied. Its scores are earned. */
function aiChooseParams(alley, rackPins, isFirstRoll, rand) {
  const skill = alley.aiSkill;
  const g = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const { def, stats } = aiBallFor(ALLEYS.indexOf(alley));
  const standing = rackPins.filter(p => !p.down && !p.gone);
  const cands = [];
  if (isFirstRoll) {
    for (const hook of [0.35, 0.55, 0.75]) {
      for (const sx of [-0.40, -0.33, -0.26, -0.19]) {
        for (const ang of [1.6, 2.4, 3.2]) {
          cands.push({ startX: sx + g() * 0.012, angleDeg: ang + g() * 0.3, power: 0.74 + skill * 0.14 + g() * 0.03, hook: hook + g() * 0.05, loft: 0 });
        }
      }
    }
  } else {
    const cx = standing.reduce((a, p) => a + p.x, 0) / standing.length;
    for (const hook of [0, 0.15, -0.15]) {
      for (const off of [-0.05, 0, 0.05]) {
        const startX = Math.max(-0.45, Math.min(0.45, cx + off - hook * 0.1));
        const ang = Math.atan2(cx - startX + hook * 0.35, LANE.headPinZ) * 180 / Math.PI;
        cands.push({ startX, angleDeg: ang + g() * 0.25, power: 0.72 + g() * 0.04, hook, loft: 0 });
      }
    }
  }
  let best = null;
  for (const c of cands) {
    const st = runThrow(def, stats, c, standing.map(p => ({ ...p })), alley);
    const down = pinsDown(st).length;
    if (!best || down > best.down) best = { params: c, down };
  }
  // execution noise: worse bowlers miss their chosen line by more
  const n = (1 - skill);
  const p = { ...best.params };
  p.startX += g() * 0.030 * n + g() * 0.006;
  p.angleDeg += g() * 0.85 * n + g() * 0.15;
  p.power = Math.max(0.3, Math.min(1, p.power + g() * 0.09 * n));
  p.hook = Math.max(-1, Math.min(1, p.hook + g() * 0.16 * n));
  return p;
}

/* ================= missions & cases ================= */
const MISSIONS = [
  { id: 'strikes3',  text: 'Throw 3 strikes',        goal: 3,   reward: { chips: 60 } },
  { id: 'wins2',     text: 'Win 2 matches',          goal: 2,   reward: { case: 1 } },
  { id: 'score55',   text: 'Score 55+ in a match',   goal: 1,   reward: { chips: 80 } },
  { id: 'spares2',   text: 'Convert 2 spares',       goal: 2,   reward: { chips: 50 } },
  { id: 'pins300',   text: 'Knock down 300 pins',    goal: 300, reward: { case: 1 } },
  { id: 'play4',     text: 'Play 4 matches',         goal: 4,   reward: { chips: 45 } },
];
function openCase(rand) {
  const chips = 40 + Math.floor(rand() * 81); // 40..120
  const ball = BALLS[1 + Math.floor(rand() * (BALLS.length - 1))]; // never the house ball
  const cards = 2 + Math.floor(rand() * 3);   // 2..4
  return { chips, cards: { ballId: ball.id, count: cards } };
}

const api = {
  LANE, rackPositions, LAYOUTS, LAYOUT_KEYS, makeRack,
  BALLS, BALL_BY_ID, MAX_LEVEL, UNLOCK_CARDS, RARITY_MULT, ballStatsAt, upgradeCost,
  ALLEYS, LEAGUE_RANKS, leagueRank, trophyDelta,
  scoreGame, scoreSoFar,
  ballMass, createThrow, stepThrow, runThrow, pinsDown, standingPins,
  parseFlick, needleValue, effectiveHook,
  rng, aiBallFor, aiThrowParams, aiChooseParams, MISSIONS, openCase,
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.BowlLogic = api;
