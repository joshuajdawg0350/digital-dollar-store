/* Lucky Duck — personal-use fidelity clone of the VGT Lucky Ducky $1 floor
   machine (Class II bingo-driven 3-reel, Downstream Casino install).
   Pure game math: paytable, tier weights, reel strips, bingo card/pattern
   generation. No DOM. Node-testable (see ../sim.js).
   (c) 2026 J-Dawgs Industries — personal build, not for sale. */
'use strict';

/* Symbols: DUCK (logo), SEVEN (red/blue variants on the strips, one pay),
   BAR3, BAR2, BAR1, CHERRY, BLANK. */
const SYMBOLS = ['DUCK', 'SEVEN', 'BAR3', 'BAR2', 'BAR1', 'CHERRY', 'BLANK'];
const BARS = ['BAR1', 'BAR2', 'BAR3'];

/* Paytable in CREDITS by coins bet (1/2/3). $1 machine: 1 credit = $1.
   Top award VERIFIED: 10,000 credits on 3 coins. Per-line values below the
   top are RECONSTRUCTED on the classic VGT ladder (see RESEARCH.md). */
const PAYTABLE = {
  DUCK:   [2500, 5000, 10000],
  SEVEN:  [100, 200, 300],
  BAR3:   [40, 80, 120],
  BAR2:   [25, 50, 75],
  BAR1:   [10, 20, 30],
  ANYBAR: [5, 10, 15],
  CHERRY3: [20, 40, 60],
  CHERRY2: [5, 10, 15],
  CHERRY1: [2, 4, 6]
};
const TIER_ORDER = ['DUCK', 'SEVEN', 'BAR3', 'BAR2', 'BAR1', 'ANYBAR', 'CHERRY3', 'CHERRY2', 'CHERRY1'];

/* Relative weights per 100,000. Tuned by simulation (../sim.js) so the full
   game — base pays + red-screen re-spins + pick-a-duck — returns ~91% in
   play credits with a high hit frequency, matching the floor game's
   documented character (frequent small wins, long sessions). */
const TIER_WEIGHTS = {
  DUCK: 4, SEVEN: 56, BAR3: 195, BAR2: 316, BAR1: 632,
  ANYBAR: 1265, CHERRY3: 237, CHERRY2: 1739, CHERRY1: 8696
};
const TOTAL_WEIGHT = 100000;

/* Feature odds (documented/inferred — see RESEARCH.md):
   red screen ~1 in 5 winning spins; chains up to 5; pick-a-duck sometimes
   replaces a red-screen re-spin. */
const RED_CHANCE = 0.20;       // per winning spin (player-reported ~1 in 5)
const RED_CHAIN_CHANCE = 0.20; // a red spin can flash red again
const RED_MAX = 5;             // reported maximum chain
const PICK_CHANCE = 0.25;      // share of red triggers that become Pick a Duck

/* 22-stop mechanical strips (reconstructed; counts set the near-miss feel —
   the tier draw above decides outcomes, strips decide what the eye sees). */
const STRIPS = [
  ['BLANK','BAR1','BLANK','CHERRY','BLANK','BAR2','BLANK','SEVEN','BLANK','BAR1','BLANK','DUCK','BLANK','BAR3','BLANK','CHERRY','BLANK','BAR1','BLANK','BAR2','BLANK','SEVEN'],
  ['BLANK','BAR2','BLANK','CHERRY','BLANK','BAR1','BLANK','BAR3','BLANK','SEVEN','BLANK','BAR1','BLANK','DUCK','BLANK','CHERRY','BLANK','BAR2','BLANK','BAR1','BLANK','SEVEN'],
  ['BLANK','BAR1','BLANK','SEVEN','BLANK','BAR2','BLANK','CHERRY','BLANK','BAR1','BLANK','BAR3','BLANK','DUCK','BLANK','BAR2','BLANK','CHERRY','BLANK','SEVEN','BLANK','BAR1']
];

function evaluateCombo(combo) {
  const [a, b, c] = combo;
  if (a === 'DUCK' && b === 'DUCK' && c === 'DUCK') return 'DUCK';
  if (a === 'SEVEN' && b === 'SEVEN' && c === 'SEVEN') return 'SEVEN';
  if (a === 'BAR3' && b === 'BAR3' && c === 'BAR3') return 'BAR3';
  if (a === 'BAR2' && b === 'BAR2' && c === 'BAR2') return 'BAR2';
  if (a === 'BAR1' && b === 'BAR1' && c === 'BAR1') return 'BAR1';
  if (BARS.includes(a) && BARS.includes(b) && BARS.includes(c)) return 'ANYBAR';
  const cherries = combo.filter(s => s === 'CHERRY').length;
  if (cherries === 3) return 'CHERRY3';
  if (cherries === 2) return 'CHERRY2';
  if (cherries === 1) return 'CHERRY1';
  return null;
}

function payFor(tier, coins) {
  if (!tier) return 0;
  if (tier === 'PROGRESSIVE') return 0; // handled by caller
  return PAYTABLE[tier][coins - 1];
}

function pickTier(rng) {
  let r = rng() * TOTAL_WEIGHT;
  for (const t of TIER_ORDER) {
    r -= TIER_WEIGHTS[t];
    if (r < 0) return t;
  }
  return null; // losing spin
}

/* Pick a tier whose pay (at this coin count) is >= minPay — used by the
   red-screen re-spin, which guarantees at least the triggering win and
   normally corresponds in size to it. Weighted toward the close tiers. */
function pickTierAtLeast(minPay, coins, rng) {
  const ok = TIER_ORDER.filter(t => payFor(t, coins) >= minPay)
    .sort((x, y) => payFor(x, coins) - payFor(y, coins)); // ascending by pay
  if (!ok.length) return 'DUCK';
  // weight by log-distance from the trigger (correspond-in-size behavior):
  // the closest tiers dominate; the jackpot tier stays a rare leap.
  const weighted = [];
  ok.forEach((t, i) => {
    const p = payFor(t, coins);
    let w = Math.round(100 * Math.pow(minPay / p, 3.2));
    if (i === 0) w = Math.max(w, 100); // closest tier always dominates
    for (let k = 0; k < w; k++) weighted.push(t);
  });
  return weighted[Math.floor(rng() * weighted.length)] || ok[ok.length - 1];
}

/* Build a reel combo that evaluates to the requested tier (or a natural
   loser). Returns [s1, s2, s3]. */
function comboForTier(tier, rng) {
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  switch (tier) {
    case 'DUCK': return ['DUCK', 'DUCK', 'DUCK'];
    case 'SEVEN': return ['SEVEN', 'SEVEN', 'SEVEN'];
    case 'BAR3': return ['BAR3', 'BAR3', 'BAR3'];
    case 'BAR2': return ['BAR2', 'BAR2', 'BAR2'];
    case 'BAR1': return ['BAR1', 'BAR1', 'BAR1'];
    case 'ANYBAR': {
      let combo;
      do { combo = [pick(BARS), pick(BARS), pick(BARS)]; } while (evaluateCombo(combo) !== 'ANYBAR');
      return combo;
    }
    case 'CHERRY3': return ['CHERRY', 'CHERRY', 'CHERRY'];
    case 'CHERRY2': {
      const other = pick(['BLANK', 'SEVEN', 'DUCK', 'BAR1', 'BAR2', 'BAR3']);
      const pos = Math.floor(rng() * 3);
      const combo = ['CHERRY', 'CHERRY', 'CHERRY'];
      combo[pos] = other;
      return combo;
    }
    case 'CHERRY1': {
      const pos = Math.floor(rng() * 3);
      const others = ['BLANK', 'SEVEN', 'DUCK', 'BAR1', 'BAR2', 'BAR3'];
      let combo;
      do {
        combo = [pick(others), pick(others), pick(others)];
        combo[pos] = 'CHERRY';
      } while (evaluateCombo(combo) !== 'CHERRY1');
      return combo;
    }
    default: { // loser — sometimes a near miss (two ducks / two sevens)
      const roll = rng();
      if (roll < 0.10) { const c = ['DUCK', 'DUCK', pick(['BLANK', 'BAR1', 'BAR2'])]; if (evaluateCombo(c) === null) return c; }
      if (roll < 0.18) { const c = ['SEVEN', 'SEVEN', 'BLANK']; if (evaluateCombo(c) === null) return c; }
      let combo;
      do { combo = [pick(SYMBOLS), pick(SYMBOLS), pick(SYMBOLS)]; } while (evaluateCombo(combo) !== null);
      return combo;
    }
  }
}

/* Find a stop index on a strip whose symbol == sym (random among matches). */
function stopFor(stripIdx, sym, rng) {
  const strip = STRIPS[stripIdx];
  const idxs = [];
  strip.forEach((s, i) => { if (s === sym) idxs.push(i); });
  return idxs[Math.floor(rng() * idxs.length)];
}

/* ---------- Class II bingo layer ----------
   A bingo "game": 38 gold numbers drawn from 75; the rest are called in
   white, ~1 per second, until the game resets. Each spin deals a fresh
   5x5 card. Winning patterns are made of GOLD numbers only. Each reel tier
   maps to a pattern — the same display logic the floor machine uses. */
const PATTERNS = {
  DUCK:    { name: 'LUCKY X',        cells: [0, 4, 6, 8, 12, 16, 18, 20, 24] },
  SEVEN:   { name: 'SIX PACK',       cells: [1, 2, 3, 6, 7, 8] },
  BAR3:    { name: 'PRIVATE STRIPES', cells: [0, 2, 4, 10, 12, 14, 20, 22, 24] },
  BAR2:    { name: 'FULL COLUMN',    cells: null }, // chosen per card
  BAR1:    { name: 'DIAGONAL',       cells: null },
  ANYBAR:  { name: 'FOUR CORNERS',   cells: [0, 4, 20, 24] },
  CHERRY3: { name: 'CHERRIES x3',    cells: null }, // N gold singles, no line
  CHERRY2: { name: 'CHERRIES x2',    cells: null },
  CHERRY1: { name: 'CHERRY',         cells: null }
};
const LINES = [
  [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
  [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
  [0,6,12,18,24],[4,8,12,16,20]
];

function colRange(col) { return [col * 15 + 1, col * 15 + 15]; }

/* Generate a card for a tier: returns {grid:[25 numbers|'FREE'], gold:Set of
   cell indexes daubed gold, patternName}. Pattern cells hold gold numbers;
   other cells hold non-gold numbers so no unintended pattern completes. */
function genCard(tier, goldSet, rng) {
  const goldByCol = [[], [], [], [], []];
  const whiteByCol = [[], [], [], [], []];
  for (let n = 1; n <= 75; n++) {
    const col = Math.floor((n - 1) / 15);
    (goldSet.has(n) ? goldByCol : whiteByCol)[col].push(n);
  }
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const goldPool = goldByCol.map(shuffle);
  const whitePool = whiteByCol.map(shuffle);

  // decide gold cells
  let goldCells = [];
  let patternName = 'NO WIN';
  if (tier && PATTERNS[tier]) {
    patternName = PATTERNS[tier].name;
    if (PATTERNS[tier].cells) goldCells = PATTERNS[tier].cells.slice();
    else if (tier === 'BAR2') { const col = Math.floor(rng() * 5); goldCells = [0, 1, 2, 3, 4].map(r => r * 5 + col); }
    else if (tier === 'BAR1') { goldCells = rng() < 0.5 ? [0, 6, 12, 18, 24] : [4, 8, 12, 16, 20]; }
    else if (tier === 'CHERRY3' || tier === 'CHERRY2' || tier === 'CHERRY1') {
      const want = tier === 'CHERRY3' ? 3 : tier === 'CHERRY2' ? 2 : 1;
      // place singles that complete no line/corners/X
      let tries = 0;
      while (goldCells.length < want && tries++ < 200) {
        const cell = Math.floor(rng() * 25);
        if (cell === 12 || goldCells.includes(cell)) continue;
        const trial = goldCells.concat(cell);
        const bad = LINES.some(l => l.every(x => trial.includes(x) || x === 12)) ||
          [0, 4, 20, 24].every(x => trial.includes(x));
        if (!bad) goldCells = trial;
      }
    }
  }
  const goldSetCells = new Set(goldCells);
  const grid = new Array(25);
  for (let cell = 0; cell < 25; cell++) {
    if (cell === 12) { grid[cell] = 'FREE'; continue; }
    const col = cell % 5;
    if (goldSetCells.has(cell)) grid[cell] = goldPool[col].length ? goldPool[col].pop() : null;
    else grid[cell] = whitePool[col].length ? whitePool[col].pop() : null;
    if (grid[cell] === null) { // pool exhausted (rare) — borrow from the other pool
      const other = goldSetCells.has(cell) ? whitePool[col] : goldPool[col];
      grid[cell] = other.length ? other.pop() : 1 + col * 15 + (cell % 15);
    }
  }
  return { grid, goldCells: goldSetCells, patternName };
}

function newGoldSet(rng) {
  const nums = [];
  for (let n = 1; n <= 75; n++) nums.push(n);
  for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
  return new Set(nums.slice(0, 38));
}

/* Pick a Duck prize: an amount hidden "under the duck", scaled to the
   triggering win (the red-screen family correspondence), min 5 credits. */
function pickDuckPrize(triggerWin, coins, rng) {
  const mults = [0.5, 1, 1, 1.5, 2, 3, 5];
  const weights = [26, 32, 22, 11, 6, 2, 1];
  let r = rng() * 100, m = 1;
  for (let i = 0; i < mults.length; i++) { r -= weights[i]; if (r < 0) { m = mults[i]; break; } }
  const raw = Math.max(5 * coins, triggerWin * m);
  return Math.round(raw / 5) * 5;
}

const api = { SYMBOLS, BARS, PAYTABLE, TIER_ORDER, TIER_WEIGHTS, TOTAL_WEIGHT, RED_CHANCE, RED_CHAIN_CHANCE, RED_MAX, PICK_CHANCE, STRIPS, PATTERNS, LINES, evaluateCombo, payFor, pickTier, pickTierAtLeast, comboForTier, stopFor, genCard, newGoldSet, pickDuckPrize };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.LuckyLogic = api;
