/* Hustle City Slots — shared engine core (web game + Node verifier).
   5 reels x 3 rows, 20 paylines, weighted reel strips, WILD + SCATTER free spins,
   X2 / X3 line multipliers. No blank stops: every strip position is a real symbol.
   Machine-specific strips/paytables live in machines.js. Play credits only.
   (c) 2026 J-Dawgs Industries LLC. */
'use strict';

/* 20 paylines: row index (0 top, 1 middle, 2 bottom) for reels 1..5 */
const PAYLINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1],
  [1, 0, 1, 0, 1], [1, 2, 1, 2, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1],
  [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 0, 2, 0, 1],
  [1, 2, 0, 2, 1], [0, 2, 0, 2, 0]
];
const FREE_SPIN_MULTIPLIER = 2;

/* Line multipliers: an X2 / X3 anywhere on a payline multiplies that line's win
   (X2 doubles it, X3 triples it). Two multipliers on the same line multiply
   together (X2 + X3 = x6). Multipliers never substitute and never pay alone. */
const MULTIPLIERS = { X2: 2, X3: 3 };

function lineMultiplier(cells) {
  let m = 1;
  for (const c of cells) if (MULTIPLIERS[c]) m *= MULTIPLIERS[c];
  return m;
}

function windowForStops(strips, stops) {
  const grid = [];
  for (let r = 0; r < 5; r++) {
    const col = [];
    for (let row = 0; row < 3; row++) col.push(strips[r][(stops[r] + row) % strips[r].length]);
    grid.push(col);
  }
  return grid;
}

function randomStops(rng, strips) {
  return strips.map(strip => Math.floor(rng() * strip.length));
}

/* Best pay for one payline: for each paying symbol, the run from the left of
   that symbol-or-WILD; WILD also pays as its own symbol. Any X2/X3 on the line
   then multiplies the win (they multiply together). Returns line-bet units:
   pay = basePay x mult. */
function evaluateLine(cells, paytable) {
  let best = { pay: 0, symbol: null, count: 0 };
  for (const sym of Object.keys(paytable)) {
    let run = 0;
    while (run < 5 && (cells[run] === sym || cells[run] === 'WD')) run++;
    const table = paytable[sym];
    for (let n = run; n >= 2; n--) {
      if (table[n]) {
        if (table[n] > best.pay) best = { pay: table[n], symbol: sym, count: n };
        break;
      }
    }
  }
  const mult = lineMultiplier(cells);
  return { pay: best.pay * mult, basePay: best.pay, mult, symbol: best.symbol, count: best.count };
}

/* cfg = { strips, paytable, scatterPay, scatterSpins } */
function evaluateGrid(grid, lineBet, cfg) {
  const lineWins = [];
  let lineWinTotal = 0;
  for (let li = 0; li < PAYLINES.length; li++) {
    const rows = PAYLINES[li];
    const cells = [];
    for (let r = 0; r < 5; r++) cells.push(grid[r][rows[r]]);
    const res = evaluateLine(cells, cfg.paytable);
    if (res.pay > 0) {
      const credits = res.pay * lineBet;
      const multCells = [];
      for (let r = 0; r < 5; r++) if (MULTIPLIERS[cells[r]]) multCells.push(r);
      lineWins.push({ line: li + 1, symbol: res.symbol, count: res.count, pay: credits, mult: res.mult, multCells, rows: rows.slice(0, res.count) });
      lineWinTotal += credits;
    }
  }
  let scatterCount = 0, bonusCount = 0;
  for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) {
    if (grid[r][row] === 'SC') scatterCount++;
    if (grid[r][row] === 'BN') bonusCount++;
  }
  const totalBet = lineBet * PAYLINES.length;
  const capped = Math.min(scatterCount, 5);
  const scatterPay = scatterCount >= 3 ? cfg.scatterPay[capped] * totalBet : 0;
  const freeSpins = scatterCount >= 3 ? cfg.scatterSpins[capped] : 0;
  /* BONUS WHEEL trigger: a WHEEL token in each of the reel 2, 3 and 4 windows */
  const wheelHit = [1, 2, 3].every(r => grid[r].includes('WH'));
  return { lineWins, lineWinTotal, scatterCount, scatterPay, freeSpins, bonusCount, wheelHit };
}

/* Reel motion model (pure + node-testable) — the SAME physics on all
   three Hustle City slot machines, so every cabinet spins identically:
     SPIN-UP  velocity eases from rest to the machine's peak speed over
              ~0.42s on a smoothstep torque curve (90% of peak at ~0.35s);
     CRUISE   peak speed — 20x the old builds' peak (Joshua, 2026-11-21),
              so the symbols are a motion-blurred streak, like a real
              cabinet photographed mid-spin;
     BRAKE    a firm ~0.55s closed-loop deceleration down to creep speed
              (decel recomputed every substep from speed + room left, its
              bite ramped in over ~80ms so velocity has no kink);
     SETTLE   an underdamped spring over the last fraction of a cell —
              the reel overshoots a few px past the stop and recoils ONCE
              onto it, the mechanical thunk landing.
   brake(delaySec) is the STOP button: after a hair of per-reel stagger
   the reel whips (up to ~3.4x cruise speed under full blur) then brakes
   hard into the same settle, landing on the EXACT same dealt stop.
   step(dtSeconds) advances the integrator in <=4ms substeps and returns
   { p, v, done } with p in pixels travelled toward D. */
const REEL_T_UP = 0.42, REEL_T_BRAKE = 0.55, REEL_T_SPRING_EST = 0.30;
const REEL_CREEP = 230;                                /* spring entry speed, px/s */
function reelSpringDist(H, D) { return Math.max(6, Math.min(0.38 * H, D * 0.15)); }
function reelDistance(vmax, H, durationMs) {
  const T = Math.max(0.95, durationMs / 1000);
  const tCruise = Math.max(0.12, T - REEL_T_UP - REEL_T_BRAKE - REEL_T_SPRING_EST);
  const springDist = Math.max(6, Math.min(0.38 * H, vmax * 0.05));
  return vmax * (REEL_T_UP / 2 + tCruise + REEL_T_BRAKE / 2) + (REEL_CREEP * REEL_T_BRAKE) / 2 + springDist;
}
function createReelMotion(D, H, durationMs, vmax) {
  const CREEP = REEL_CREEP;
  const springDist = reelSpringDist(H, D);
  if (!vmax) { /* fallback: solve peak speed from distance + duration */
    const T = Math.max(0.95, durationMs / 1000);
    const tCruise = Math.max(0.12, T - REEL_T_UP - REEL_T_BRAKE - REEL_T_SPRING_EST);
    vmax = Math.max(420, (D - springDist - (CREEP * REEL_T_BRAKE) / 2) / (REEL_T_UP / 2 + tCruise + REEL_T_BRAKE / 2));
  }
  const DEC = (vmax - CREEP) / REEL_T_BRAKE;           /* firm brake, px/s^2 */
  const DEC_HARD = Math.max(DEC * 2.2, (vmax * 3.4 - CREEP) / 0.12);
  const K = 1400, C = 31;                              /* settle spring */
  let p = 0, v = 0, t = 0, mode = 'accel', springT = 0, brakeT = 0, done = false;
  let stopAt = Infinity;
  const smooth = u => u * u * (3 - 2 * u);
  function brakeDistAt(speed, dec) { return ((speed * speed - CREEP * CREEP) / (2 * dec)) + springDist; }
  function brake(delaySec) {
    if (done || mode === 'spring' || mode === 'stopcruise' || mode === 'stopbrake') return;
    stopAt = Math.min(stopAt, t + Math.max(0, delaySec || 0));
  }
  function step(dt) {
    let remaining = dt;
    while (remaining > 0 && !done) {
      const h = Math.min(0.004, remaining);
      remaining -= h;
      t += h;
      if (stopAt !== Infinity && t >= stopAt && mode !== 'spring') { mode = 'stopcruise'; stopAt = Infinity; }
      if (mode === 'accel') {
        const u = Math.min(1, t / REEL_T_UP);
        v = vmax * smooth(u);
        p += v * h;
        if (u >= 1) { v = vmax; mode = 'cruise'; }
      } else if (mode === 'cruise') {
        v = vmax;
        p += v * h;
        if (D - p <= brakeDistAt(v, DEC)) { mode = 'brake'; brakeT = 0; }
      } else if (mode === 'brake' || mode === 'stopbrake') {
        /* closed-loop brake: the decel is recomputed every substep from
           the CURRENT speed and the room left, so the reel always arrives
           at creep speed exactly at the spring — at 20x speeds an
           open-loop brake misses by thousands of px/s. The bite still
           ramps in over ~80ms (factor 0.5 -> 1) for a kink-free join;
           the feedback compensates by raising decel as the room shrinks. */
        const decFull = mode === 'brake' ? DEC : DEC_HARD;
        brakeT += h;
        const factor = 0.5 + 0.5 * smooth(Math.min(1, brakeT / 0.08));
        const room = Math.max(1, (D - p) - springDist);
        const decNeed = (v * v - CREEP * CREEP) / (2 * room);
        const dec = Math.min(decFull * 2.5, decNeed * factor);
        v -= dec * h;
        if (v <= CREEP) { v = CREEP; mode = 'spring'; }
        else if (D - p <= springDist * 0.9) mode = 'spring';  /* position catch: spring absorbs the entry speed */
        p += v * h;
      } else if (mode === 'stopcruise') {
        const vT = vmax * 3.4;
        v = Math.min(vT, v + vmax * 12 * h);
        p += v * h;
        if (D - p <= brakeDistAt(v, DEC_HARD)) { mode = 'stopbrake'; brakeT = 0; }
      } else if (mode === 'spring') {
        springT += h;
        v += (K * (D - p) - C * v) * h;
        p += v * h;
        if ((Math.abs(D - p) < 0.6 && Math.abs(v) < 26) || springT > 0.85) { p = D; v = 0; done = true; }
      }
      if (!done && mode !== 'spring' && p > D + springDist) mode = 'spring';
    }
    return { p, v, done };
  }
  return { step, brake, vmax, D, get done() { return done; } };
}

const coreApi = { PAYLINES, FREE_SPIN_MULTIPLIER, MULTIPLIERS, lineMultiplier, windowForStops, randomStops, evaluateLine, evaluateGrid, createReelMotion, reelDistance };
if (typeof module !== 'undefined' && module.exports) module.exports = coreApi;
if (typeof window !== 'undefined') window.SlotCore = coreApi;
