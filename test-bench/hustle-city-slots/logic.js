/* Hustle City Slots — shared engine core (web game + Node verifier).
   5 reels x 3 rows, 20 paylines, weighted reel strips, WILD + SCATTER free spins.
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
   that symbol-or-WILD; WILD also pays as its own symbol. Returns line-bet units. */
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
  return best;
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
      lineWins.push({ line: li + 1, symbol: res.symbol, count: res.count, pay: credits, rows: rows.slice(0, res.count) });
      lineWinTotal += credits;
    }
  }
  let scatterCount = 0;
  for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'SC') scatterCount++;
  const totalBet = lineBet * PAYLINES.length;
  const capped = Math.min(scatterCount, 5);
  const scatterPay = scatterCount >= 3 ? cfg.scatterPay[capped] * totalBet : 0;
  const freeSpins = scatterCount >= 3 ? cfg.scatterSpins[capped] : 0;
  return { lineWins, lineWinTotal, scatterCount, scatterPay, freeSpins };
}

const coreApi = { PAYLINES, FREE_SPIN_MULTIPLIER, windowForStops, randomStops, evaluateLine, evaluateGrid };
if (typeof module !== 'undefined' && module.exports) module.exports = coreApi;
if (typeof window !== 'undefined') window.SlotCore = coreApi;
