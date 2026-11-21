/* Hustle City Slots — shared engine core (web game + Node verifier).
   5 reels x 3 rows, 20 paylines, weighted reel strips, WILD + SCATTER free spins,
   X2 / X3 line multipliers, BONUS dice trigger count. No blank stops: every
   strip position is a real symbol.
   Machine-specific strips/paytables live in machines.js. Play credits only.
   (c) 2026 J-Dawgs Industries. */
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
  let scatterCount = 0;
  let bonusCount = 0;
  for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) {
    if (grid[r][row] === 'SC') scatterCount++;
    if (grid[r][row] === 'BN') bonusCount++;
  }
  const totalBet = lineBet * PAYLINES.length;
  const capped = Math.min(scatterCount, 5);
  const scatterPay = scatterCount >= 3 ? cfg.scatterPay[capped] * totalBet : 0;
  const freeSpins = scatterCount >= 3 ? cfg.scatterSpins[capped] : 0;
  return { lineWins, lineWinTotal, scatterCount, scatterPay, freeSpins, bonusCount, bonus: bonusCount >= 3 };
}

const coreApi = { PAYLINES, FREE_SPIN_MULTIPLIER, MULTIPLIERS, lineMultiplier, windowForStops, randomStops, evaluateLine, evaluateGrid };
if (typeof module !== 'undefined' && module.exports) module.exports = coreApi;
if (typeof window !== 'undefined') window.SlotCore = coreApi;
