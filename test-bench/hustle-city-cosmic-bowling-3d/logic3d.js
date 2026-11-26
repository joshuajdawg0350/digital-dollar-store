/* Hustle City Cosmic Bowling — 3D REBUILD: pure game logic.
   Scoring (5 frames, 5th = 10th rules), lane physics (rigid-body pins on
   the lane plane), throw parsing, AI rivals, career, balls, economy.
   No DOM, no Three.js. Node-testable (see sim3d.js).
   Mechanics copied from the published design of the top bowling games
   (see ../compare/best-parts.md); all code, names and art are original
   J-Dawgs work. Throw integrity (parseThrow deadzone + dip averaging,
   needle centre snap) carried over verbatim from the proven v3 build.
   (c) 2026 J-Dawgs Industries LLC. */
'use strict';

/* ================= lane & physics constants (metres) ================= */
const LANE = {
  width: 1.06, halfWidth: 0.53,
  gutterCentre: 0.615,
  headPinZ: 18.29, deckEndZ: 19.75, pitZ: 20.4,
  ballR: 0.108, pinR: 0.0605, pinMass: 1.38,
  pinSpacing: 0.3048, rowDepth: 0.2639,
};

function rackPositions() {
  const s = LANE.pinSpacing, d = LANE.rowDepth, z0 = LANE.headPinZ;
  return {
    1: [0, z0],
    2: [-s / 2, z0 + d], 3: [s / 2, z0 + d],
    4: [-s, z0 + 2 * d], 5: [0, z0 + 2 * d], 6: [s, z0 + 2 * d],
    7: [-1.5 * s, z0 + 3 * d], 8: [-s / 2, z0 + 3 * d], 9: [s / 2, z0 + 3 * d], 10: [1.5 * s, z0 + 3 * d],
  };
}
function makeRack(pinNums) {
  const pos = rackPositions();
  return (pinNums || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map(n => ({
    n, x: pos[n][0], z: pos[n][1], ox: pos[n][0], oz: pos[n][1],
    vx: 0, vz: 0, down: false, gone: false, hit: false, peak: 0,
  }));
}

/* ================= balls =================
   Three stat types (Bowling Crew's published system): Power (heavy,
   drives through big sets), Bounce (pins leave at higher velocity —
   split medicine), Precise (light, maximum aim control). Stats 0..20:
   power -> mass & drive, spin -> hook potential, accuracy -> needle
   centre snap width, control -> needle sweep speed. No single best
   ball: the right ball depends on the shot. Upgrades raise all four
   working stats; everything is earned by playing — no paywalls. */
const BALLS = [
  { id: 'house-rock',     name: 'House Rock',      type: 'Precise', rarity: 'Common', stats: { power: 11, spin: 4,  accuracy: 10, control: 6  }, skin: { base: '#c8ccd4', glow: '#7fb2ff', swirl: '#5b7fa6' }, blurb: 'The chrome house ball. Honest and free — it just bowls.' },
  { id: 'chrome-comet',   name: 'Chrome Comet',    type: 'Power',   rarity: 'Common', stats: { power: 14, spin: 5,  accuracy: 6,  control: 4  }, skin: { base: '#dfe6ee', glow: '#38b6ff', swirl: '#1c6fd9' }, blurb: 'Polished chrome with a comet heart. Plows the rack and keeps driving.' },
  { id: 'nebula-bouncer', name: 'Nebula Bouncer',  type: 'Bounce',  rarity: 'Common', stats: { power: 11, spin: 6,  accuracy: 7,  control: 6  }, skin: { base: '#3a1150', glow: '#ff4fd8', swirl: '#8a2be2' }, blurb: 'Magenta nebula resin. Pins jump off it — splits beware.' },
  { id: 'starlight',      name: 'Starlight Sniper', type: 'Precise', rarity: 'Common', stats: { power: 10, spin: 3,  accuracy: 13, control: 8  }, skin: { base: '#101c3a', glow: '#bfe0ff', swirl: '#e8f4ff' }, blurb: 'Dead-eye accuracy. Built to pick off single pins.' },
  { id: 'gas-giant',      name: 'Gas Giant',       type: 'Power',   rarity: 'Rare',   stats: { power: 16, spin: 6,  accuracy: 6,  control: 5  }, skin: { base: '#4a2410', glow: '#ffb35c', swirl: '#d97b2b' }, blurb: 'A banded planet of a ball. The heaviest thing on the rack.' },
  { id: 'moonshot',       name: 'Moonshot',        type: 'Precise', rarity: 'Rare',   stats: { power: 11, spin: 4,  accuracy: 14, control: 9  }, skin: { base: '#8f97a3', glow: '#e8ecf2', swirl: '#5c6470' }, blurb: 'Cratered grey moonstone. A laser for ugly leaves.' },
  { id: 'void-walker',    name: 'Void Walker',     type: 'Power',   rarity: 'Epic',   stats: { power: 18, spin: 8,  accuracy: 7,  control: 6  }, skin: { base: '#05060a', glow: '#9d6bff', swirl: '#4b1d96' }, blurb: 'A black hole in ball form. Bends late and hits like a truck.' },
  { id: 'pulsar',         name: 'Pulsar',          type: 'Bounce',  rarity: 'Epic',   stats: { power: 12, spin: 7,  accuracy: 8,  control: 8  }, skin: { base: '#062a33', glow: '#3ff7e0', swirl: '#0e7f8c' }, blurb: 'A spinning neutron star. Pins leave the deck at escape velocity.' },
  { id: 'quasar-queen',   name: 'Quasar Queen',    type: 'Precise', rarity: 'Epic',   stats: { power: 12, spin: 6,  accuracy: 15, control: 10 }, skin: { base: '#2a0a3a', glow: '#e07bff', swirl: '#a03fd9' }, blurb: 'The brightest object in the alley. Control like a laser.' },
];
const BALL_BY_ID = Object.fromEntries(BALLS.map(b => [b.id, b]));
const MAX_LEVEL = 10;
const UNLOCK_CARDS = 5;
const RARITY_MULT = { Common: 1, Rare: 1.6, Epic: 2.5 };

function ballStatsAt(ball, level) {
  const s = ball.stats, lv = Math.max(1, Math.min(MAX_LEVEL, level || 1));
  if (ball.id === 'house-rock') return { ...s };
  const k = lv - 1;
  return {
    power: s.power + 0.35 * k, spin: s.spin + 0.30 * k,
    accuracy: s.accuracy + 0.25 * k, control: s.control + 0.20 * k,
  };
}
function upgradeCost(ball, level) {
  return { cards: level, chips: Math.round(25 * level * RARITY_MULT[ball.rarity]) };
}

/* ================= scoring — 5 frames, 5th plays like the 10th =========
   rolls: flat pin counts in throw order. Frames 1-4 standard; frame 5
   sums its own rolls (2 or 3). Perfect game = 150. */
function scoreGame5(rolls) {
  let total = 0, ri = 0;
  const frames = [];
  for (let f = 0; f < 5; f++) {
    const start = ri;
    if (f < 4) {
      if (rolls[ri] === 10) { total += 10 + (rolls[ri + 1] || 0) + (rolls[ri + 2] || 0); ri += 1; }
      else if ((rolls[ri] || 0) + (rolls[ri + 1] || 0) === 10) { total += 10 + (rolls[ri + 2] || 0); ri += 2; }
      else { total += (rolls[ri] || 0) + (rolls[ri + 1] || 0); ri += 2; }
    } else {
      const mine = rolls.slice(ri);
      total += mine.reduce((a, b) => a + b, 0);
      ri += mine.length;
    }
    frames.push({ rolls: rolls.slice(start, ri), cum: total });
  }
  return { total, frames };
}
/* Running score: a frame's cumulative shows only once every roll it
   depends on has been thrown (standard scoreboard behaviour). */
function scoreSoFar5(rolls) {
  let total = 0, ri = 0;
  const frames = [];
  for (let f = 0; f < 5; f++) {
    const start = ri;
    let cum = null;
    if (f < 4) {
      if (rolls[ri] === undefined) { frames.push({ rolls: [], cum: null }); break; }
      if (rolls[ri] === 10) {
        if (rolls[ri + 1] !== undefined && rolls[ri + 2] !== undefined) { total += 10 + rolls[ri + 1] + rolls[ri + 2]; cum = total; }
        ri += 1;
      } else if (rolls[ri + 1] === undefined) { frames.push({ rolls: rolls.slice(start), cum: null }); ri += 1; break; }
      else if (rolls[ri] + rolls[ri + 1] === 10) {
        if (rolls[ri + 2] !== undefined) { total += 10 + rolls[ri + 2]; cum = total; }
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

/* ================= match state machine =================
   One side's frame progression. feed(pins) records a throw of `pins`
   pins and reports what happens next. Rack rules:
   - Frames 1-4: fresh rack ball 1; strike ends the frame; else ball 2
     at the standing pins.
   - Frame 5 (like the 10th): strike -> fresh rack and keep going (max
     3 balls); after a ball-2 strike the rack resets again; if ball 2
     leaves pins, ball 3 shoots at those; a spare on balls 1+2 earns a
     third ball at a fresh rack; an open frame ends at 2 balls. */
function newSide() {
  return { rolls: [], frame: 0, ball: 0, standing: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], frameRolls: [], done: false };
}
function feedRoll(side, pinsDownNums) {
  const down = pinsDownNums.slice();
  side.rolls.push(down.length);
  side.frameRolls.push(down.length);
  side.standing = side.standing.filter(n => !down.includes(n));
  const ev = { frameEnded: false, matchEnded: false, newRack: false, pins: down.length };
  const f = side.frame, fr = side.frameRolls;
  if (f < 4) {
    if (side.ball === 0 && down.length === 10) { endFrame(side, ev); }
    else if (side.ball === 1) { endFrame(side, ev); }
    else { side.ball = 1; }
  } else {
    if (side.ball === 0) {
      if (down.length === 10) { resetRack(side); ev.newRack = true; }
      side.ball = 1;
    } else if (side.ball === 1) {
      const first = fr[0];
      if (first === 10) {
        if (down.length === 10) { resetRack(side); ev.newRack = true; }
        // else: ball 3 shoots at the pins ball 2 left standing
        side.ball = 2;
      } else if (first + down.length === 10) { resetRack(side); ev.newRack = true; side.ball = 2; }
      else { endFrame(side, ev); }
    } else { endFrame(side, ev); }
  }
  if (side.frame > 4) { side.done = true; ev.matchEnded = true; }
  return ev;
}
function resetRack(side) { side.standing = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; }
function endFrame(side, ev) {
  ev.frameEnded = true;
  side.frame += 1; side.ball = 0; side.frameRolls = [];
  resetRack(side);
}

/* ================= physics — rigid-body pins on the lane plane ========
   Ball and pins are rigid bodies in the lane plane (x across, z down
   the lane): impulse collisions with restitution, pin-on-pin chains,
   kickback bounces off the side walls. A pin topples only when truly
   hit or shoved off its spot — no patterned faults, no scripted falls.
   The 3D layer renders height/topple from these states. */
function ballMass(stats) { return 3.4 + stats.power * 0.32; }
function pinExitBoost(ballDef) { return ballDef.type === 'Bounce' ? 1.30 : 1.10; }

/* params: { startX, angleDeg, power 0..1, hook -1..1, loft 0..1 }
   hookFactor: lane oil (1.0 neutral default). */
function createThrow(ballDef, stats, params, pins, hookFactor) {
  const v = (4.4 + 7.4 * params.power) * (0.92 + stats.power * 0.008);
  const ang = params.angleDeg * Math.PI / 180;
  return {
    ballDef, stats,
    ball: {
      x: params.startX, z: -0.4,
      vx: v * Math.sin(ang), vz: v * Math.cos(ang),
      r: LANE.ballR, spin: params.hook, loftZ: params.loft * 6.0,
      airborne: params.loft > 0.03, inGutter: false, done: false, dist: 0,
    },
    pins: pins.map(p => ({ ...p })),
    t: 0, events: [], hook: params.hook,
    maxHookAccel: (stats.spin / 10) * 2.7 * (hookFactor || 1),
  };
}

function stepThrow(st, dt) {
  const b = st.ball, ev = st.events;
  if (b.done) return st;
  st.t += dt;
  if (!b.inGutter) {
    if (b.airborne && b.z >= b.loftZ) { b.airborne = false; ev.push({ type: 'land', x: b.x, z: b.z }); }
    if (!b.airborne) {
      const zf = b.z / LANE.headPinZ;
      const phase = zf < 0.38 ? 0.12 : zf < 0.76 ? 1.0 : 0.30;
      b.vx += -st.hook * st.maxHookAccel * phase * dt;
      b.vz -= 0.55 * dt;
    }
    if (Math.abs(b.x) > LANE.halfWidth + 0.015 && !b.airborne) {
      b.inGutter = true; b.x = Math.sign(b.x) * LANE.gutterCentre; b.vx = 0;
      ev.push({ type: 'gutter', z: b.z });
    }
  } else {
    b.vz -= 0.10 * dt;
  }
  b.x += b.vx * dt; b.z += b.vz * dt; b.dist += Math.abs(b.vz) * dt;

  for (const p of st.pins) {
    if (p.gone) continue;
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > 0.001) {
      p.x += p.vx * dt; p.z += p.vz * dt;
      const damp = Math.exp(-1.05 * dt);
      p.vx *= damp; p.vz *= damp;
      if (Math.hypot(p.vx, p.vz) < 0.05) { p.vx = 0; p.vz = 0; }
    }
    if (Math.abs(p.x) > 0.60) { p.x = Math.sign(p.x) * 0.60; p.vx = -p.vx * 0.66; }
    if (p.z > LANE.pitZ || Math.abs(p.x) > 0.72) p.gone = true;
    if (!p.down && ((Math.hypot(p.x - p.ox, p.z - p.oz) > 0.065 && p.peak > 0.85) ||
                    Math.hypot(p.x - p.ox, p.z - p.oz) > 0.14 || p.gone)) {
      p.down = true; ev.push({ type: 'pinfall', pin: p.n });
    }
  }
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
          const e = 0.64, j = -(1 + e) * rvn / (1 / mb + 1 / mp);
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
          const e = 0.71, j = -(1 + e) * rvn / (2 / LANE.pinMass);
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
  const pinsMoving = st.pins.some(p => !p.gone && Math.hypot(p.vx, p.vz) > 0.09);
  if ((b.z > LANE.pitZ + 0.25 || (b.z > LANE.headPinZ && b.vz < 0.4) || st.t > 7) && !pinsMoving) b.done = true;
  if (st.t > 9) b.done = true;
  return st;
}

function runThrow(ballDef, stats, params, pins, hookFactor) {
  const st = createThrow(ballDef, stats, params, pins, hookFactor);
  const dt = 1 / 300;
  while (!st.ball.done) stepThrow(st, dt);
  return st;
}
function pinsDown(st) { return st.pins.filter(p => p.down).map(p => p.n); }
function standingPins(st) { return st.pins.filter(p => !p.down && !p.gone); }

/* ================= gesture parsing (pure) =================
   Carried over from the proven v3 build. parseThrow reads the WHOLE
   gesture from its shape: find the bottom of the backswing (the
   deepest sample), then measure how far and how fast the finger rose
   out of it. Direction is read robustly: both ends of the flick are
   averaged over neighbouring samples (lift-off spikes and dip jitter
   wash out) and the raw angle passes a +/-4.5 deg deadzone — inside it
   the throw snaps to dead straight; a deliberate sideways flick keeps
   the excess at 0.55 gain (full +/-9 deg still reachable).
   samples: [{x, y, t}] CSS px, y down, t in ms (event timeStamps).
   Returns { power, errDeg, loft, from } or null (not a throw). */
function parseThrow(samples) {
  if (!samples || samples.length < 3) return null;
  let di = 0;
  for (let i = 1; i < samples.length; i++) if (samples[i].y >= samples[di].y) di = i;
  const deep = samples[di], last = samples[samples.length - 1];
  const rise = deep.y - last.y;
  if (rise < 26) return null;
  let bestVy = 0, from = deep;
  for (let i = di; i < samples.length; i++) {
    const s = samples[i];
    const dt = Math.max(0.025, (last.t - s.t) / 1000);
    const vy = (s.y - last.y) / dt;
    if (vy > bestVy) { bestVy = vy; from = s; }
  }
  const mids = samples.length - 2 - di;
  if (mids <= 1) {
    const vyJump = rise / 0.28;
    if (vyJump > bestVy) { bestVy = vyJump; from = deep; }
  }
  if (bestVy < 170) return null;
  const power = Math.min(1, Math.max(0.10, (bestVy - 120) / 2100));
  const nearX = (idx, ms) => {
    const tC = samples[idx].t;
    let sx = 0, n = 0;
    for (let i = Math.max(0, idx - 2); i <= Math.min(samples.length - 1, idx + 2); i++) {
      if (Math.abs(samples[i].t - tC) <= ms) { sx += samples[i].x; n++; }
    }
    return n ? sx / n : samples[idx].x;
  };
  const fromX = nearX(di, 60);
  let relX = last.x, rn = 1;
  for (let i = samples.length - 2; i >= 0 && last.t - samples[i].t <= 40; i--) { relX += samples[i].x; rn++; }
  relX /= rn;
  const dx = relX - fromX;
  const rawDeg = Math.atan2(dx, Math.max(40, rise)) * 180 / Math.PI;
  const DEAD_DEG = 4.5;
  const errDeg = Math.abs(rawDeg) <= DEAD_DEG ? 0
    : Math.max(-9, Math.min(9, Math.sign(rawDeg) * (Math.abs(rawDeg) - DEAD_DEG) * 0.55));
  const loft = Math.max(0, Math.min(1, (power - 0.78) / 0.22)) * 0.9;
  return { power, errDeg, loft, from: deep };
}
/* Hook needle: sweeps while the player holds the pull-back. Slower
   sweep = higher Control. Value -1..1; 0 = dead centre = straight. */
function needleValue(tSec, control) {
  const hz = 1.18 - Math.min(20, control) * 0.026;
  return Math.sin(tSec * Math.PI * 2 * hz);
}
function effectiveHook(needle, stats) {
  /* Centre snap: inside the snap width the needle reads dead centre;
     past it the hook rescales smoothly to full strength. Accuracy
     widens the snap — a Precise ball forgives a hair-late flick. At
     accuracy 10 the snap is exactly the proven v3 width (+/-0.15). */
  const n = Math.max(-1, Math.min(1, needle));
  const snap = 0.10 + Math.min(20, stats.accuracy) * 0.005;
  const mag = Math.abs(n) <= snap ? 0 : Math.sign(n) * (Math.abs(n) - snap) / (1 - snap);
  return mag * (0.35 + stats.spin / 10 * 0.85);
}

/* ================= AI rivals & the career ladder =================
   PBA-style ladder: named rivals, each with a stat profile (power /
   hook / control) that drives their ball and their execution noise.
   The AI bowls honestly — it searches real lines through the same
   physics, keeps the best, then human execution noise scaled by its
   skill and control is applied. Its scores are earned, not scripted. */
const RIVALS = [
  { name: 'Nova Rex',       title: 'Rookie House Pro',  skill: 0.30, stats: { power: 12, spin: 5, accuracy: 8,  control: 5 }, type: 'Power'   },
  { name: 'Trixie Lane',    title: 'Neon Regular',      skill: 0.38, stats: { power: 11, spin: 6, accuracy: 10, control: 6 }, type: 'Precise' },
  { name: 'Big Sal Moretti', title: 'The Wrecking Ball', skill: 0.45, stats: { power: 15, spin: 4, accuracy: 6,  control: 4 }, type: 'Power'   },
  { name: 'Captain Comet',  title: 'League Captain',    skill: 0.52, stats: { power: 13, spin: 6, accuracy: 9,  control: 6 }, type: 'Bounce'  },
  { name: 'Pearl Delgado',  title: 'The Surgeon',       skill: 0.58, stats: { power: 11, spin: 5, accuracy: 13, control: 8 }, type: 'Precise' },
  { name: 'Vega Vance',     title: 'Hook Merchant',     skill: 0.64, stats: { power: 13, spin: 8, accuracy: 9,  control: 7 }, type: 'Bounce'  },
  { name: 'Johnny Knuckles', title: 'Barroom Legend',   skill: 0.70, stats: { power: 15, spin: 6, accuracy: 9,  control: 6 }, type: 'Power'   },
  { name: 'Halley Hart',    title: 'The Closer',        skill: 0.76, stats: { power: 12, spin: 7, accuracy: 12, control: 9 }, type: 'Precise' },
  { name: 'Old Man Ferris', title: '40 Years Unbeaten', skill: 0.82, stats: { power: 13, spin: 6, accuracy: 13, control: 10 }, type: 'Precise' },
  { name: 'Duchess Marlowe', title: 'House Royalty',    skill: 0.87, stats: { power: 14, spin: 8, accuracy: 12, control: 9 }, type: 'Bounce'  },
  { name: 'The Eclipse',    title: 'The Undefeated',    skill: 0.91, stats: { power: 15, spin: 8, accuracy: 13, control: 10 }, type: 'Power'  },
  { name: 'Kingpin Cole',   title: 'Cosmic Champion',   skill: 0.95, stats: { power: 16, spin: 9, accuracy: 14, control: 11 }, type: 'Power'  },
];
const LEAGUE_TIERS = [
  { name: 'Rookie', at: 0 }, { name: 'Bronze', at: 30 }, { name: 'Silver', at: 90 },
  { name: 'Gold', at: 180 }, { name: 'Platinum', at: 320 }, { name: 'Cosmic', at: 520 },
];
function leagueTier(trophies) {
  let r = LEAGUE_TIERS[0];
  for (const t of LEAGUE_TIERS) if (trophies >= t.at) r = t;
  return r.name;
}
function trophyDelta(win, rivalIdx) { return win ? 12 + rivalIdx * 2 : -(5 + Math.floor(rivalIdx / 2)); }

function rng(seedObj) { // mulberry32
  let a = seedObj.s >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function rivalBall(rival) {
  return { def: { id: 'rival', name: rival.name, type: rival.type }, stats: { ...rival.stats } };
}
function aiChooseParams(rival, rackPins, isFirstRoll, rand) {
  const skill = rival.skill;
  const g = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const { def, stats } = rivalBall(rival);
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
  const scored = [];
  for (const c of cands) {
    const st = runThrow(def, stats, c, standing.map(p => ({ ...p })), 1.0);
    scored.push({ params: c, down: pinsDown(st).length });
  }
  scored.sort((a, b) => b.down - a.down);
  // weaker bowlers don't always find their best line — they settle for
  // one of the first few that looks good enough
  const K = 1 + Math.round((1 - skill) * 6);
  const pick = scored[Math.floor(rand() * Math.min(K, scored.length))];
  const n = (1 - skill) * (1.15 - Math.min(20, rival.stats.control) * 0.03);
  const p = { ...pick.params };
  p.startX += g() * 0.042 * n + g() * 0.006;
  p.angleDeg += g() * 1.05 * n + g() * 0.15;
  p.power = Math.max(0.3, Math.min(1, p.power + g() * 0.09 * n));
  p.hook = Math.max(-1, Math.min(1, p.hook + g() * 0.16 * n));
  return p;
}

/* ================= achievements, missions, cases ================= */
const ACHIEVEMENTS = [
  { id: 'first-strike', name: 'First Strike',        test: s => s.strikes >= 1 },
  { id: 'turkey',       name: 'Turkey',              test: s => s.bestStrikeRun >= 3 },
  { id: 'spare-pro',    name: 'Spare Pro',           test: s => s.spares >= 10 },
  { id: 'split-pickup', name: 'Split Pickup',        test: s => s.splitPickups >= 1 },
  { id: 'club-100',     name: '100 Club',            test: s => s.bestScore >= 100 },
  { id: 'club-130',     name: '130 Club',            test: s => s.bestScore >= 130 },
  { id: 'perfect',      name: 'Perfect 150',         test: s => s.bestScore >= 150 },
  { id: 'ladder-5',     name: 'Ladder Climber',      test: s => s.rivalsBeaten >= 5 },
  { id: 'champion',     name: 'Cosmic Champion',     test: s => s.rivalsBeaten >= RIVALS.length },
  { id: 'collector',    name: 'Ball Collector',      test: s => s.ballsOwned >= 5 },
  { id: 'maxed',        name: 'Fully Tuned',         test: s => s.maxBallLevel >= MAX_LEVEL },
  { id: 'pins-1000',    name: 'Pin Wrecker',         test: s => s.totalPins >= 1000 },
];
const MISSIONS = [
  { id: 'strikes3',  text: 'Throw 3 strikes',       goal: 3,   reward: { chips: 60 } },
  { id: 'wins2',     text: 'Win 2 matches',         goal: 2,   reward: { case: 1 } },
  { id: 'score100',  text: 'Score 100+ in a match', goal: 1,   reward: { chips: 80 } },
  { id: 'spares2',   text: 'Convert 2 spares',      goal: 2,   reward: { chips: 50 } },
  { id: 'pins300',   text: 'Knock down 300 pins',   goal: 300, reward: { case: 1 } },
  { id: 'play4',     text: 'Play 4 matches',        goal: 4,   reward: { chips: 45 } },
];
function openCase(rand) {
  const chips = 40 + Math.floor(rand() * 81);
  const ball = BALLS[1 + Math.floor(rand() * (BALLS.length - 1))];
  const cards = 2 + Math.floor(rand() * 3);
  return { chips, cards: { ballId: ball.id, count: cards } };
}

/* ================= save ================= */
function defaultSave() {
  const balls = {};
  for (const b of BALLS) balls[b.id] = { owned: b.id === 'house-rock', level: 1, cards: 0 };
  return {
    v: 1, chips: 150, trophies: 0,
    ladder: 0,               // next rival index to beat
    beaten: {},              // rivalIdx -> true
    balls, bag: ['house-rock'],
    achievements: {},
    missions: {},            // id -> progress (claimed removed)
    stats: { matches: 0, wins: 0, strikes: 0, spares: 0, splitPickups: 0, bestScore: 0, bestStrikeRun: 0, totalPins: 0 },
    lastDaily: '',
  };
}

const api = {
  LANE, rackPositions, makeRack,
  BALLS, BALL_BY_ID, MAX_LEVEL, UNLOCK_CARDS, ballStatsAt, upgradeCost,
  scoreGame5, scoreSoFar5, newSide, feedRoll,
  ballMass, createThrow, stepThrow, runThrow, pinsDown, standingPins,
  parseThrow, needleValue, effectiveHook,
  RIVALS, LEAGUE_TIERS, leagueTier, trophyDelta, rng, rivalBall, aiChooseParams,
  ACHIEVEMENTS, MISSIONS, openCase, defaultSave,
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.BowlLogic3D = api;
