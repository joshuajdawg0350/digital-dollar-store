/* Lucky Duck — personal-use fidelity clone of the VGT Lucky Ducky $1 floor
   machine (Class II bingo-driven 3-reel, Downstream Casino install).
   Pure game math: paytable, tier weights, reel strips, bingo card/pattern
   generation. No DOM. Node-testable (see ../sim.js).
   (c) 2026 J-Dawgs Industries — personal build, not for sale. */
'use strict';

/* Symbols: DUCK (logo), SEVEN (RED only — Joshua's ruling 2026-11-21 23:53 CT
   settles the red/blue question: "Red sevens"), BAR3, BAR2, BAR1, CHERRY,
   BLANK. Faces evidenced from floor photos — see RESEARCH.md (2026-11-21
   rebuild section). */
const SYMBOLS = ['DUCK', 'SEVEN', 'BAR3', 'BAR2', 'BAR1', 'CHERRY', 'BLANK'];
const BARS = ['BAR1', 'BAR2', 'BAR3'];

/* Paytable in CREDITS by coins bet (1/2/3). $1 machine: 1 credit = $1.
   Top award VERIFIED: 10,000 credits on 3 coins. Per-line values below the
   top are RECONSTRUCTED on the classic VGT ladder (see RESEARCH.md).
   These are the BASE pays — a winning line containing ducks pays its base
   times the duck multiplier (see evaluateCombo). */
const PAYTABLE = {
  DUCK:   [3500, 5000, 10000],
  SEVEN:  [100, 200, 300],
  BAR3:   [40, 80, 120],
  BAR2:   [20, 40, 60],
  BAR1:   [10, 20, 30],
  ANYBAR: [5, 10, 15],
  CHERRY3: [20, 40, 60],
  CHERRY2: [5, 10, 15],
  CHERRY1: [2, 4, 6]
};
const TIER_ORDER = ['DUCK', 'SEVEN', 'BAR3', 'BAR2', 'BAR1', 'ANYBAR', 'CHERRY3', 'CHERRY2', 'CHERRY1'];

/* Relative weights per 100,000. Tuned by simulation (../sim.js) so the full
   game — base pays WITH the duck multipliers + red-screen re-spins +
   pick-a-duck — returns ~91% in play credits, matching the floor game's
   documented character (frequent small wins, long sessions). Re-tuned
   2026-11-22 for the wild build: duck variants multiply the average win
   ~1.3x, so the tier weights came down to hold the same return. */
/* v12 (Joshua, 2026-11-22 19:20 CT, from his real-phone V11 play:
   "None of the spins are hitting" + "I haven't had one duck land in a
   long time, at all"): the v10 "odds up" pass moved the DUCK weight
   4 -> 10 on a 100,000 scale — one duck result per ~10,000 spins,
   invisible in real play. V12 sets the scale Joshua's words mean:
   DUCK 3,000 (a duck payline result ~1 in 33 spins) and total paying
   weight 33,000 (~1 in 3 spins a hit), spread over the existing tiers
   — more BAR1 / ANYBAR / CHERRY2, some SEVEN / BAR3, CHERRY1 still
   the frequent small hit. Paytable amounts UNCHANGED (displayed pays
   stay true); red-screen, pick-till-you-lose and bingo rules as v10
   except the red award range (see redSpinCount note). Proof: 1M-spin
   Monte Carlo per bet level through drawResult/stopFor exactly as
   game.js calls them (../sim-v12.js) — numbers in the vault
   BUILD-RECORD.md V12 section. */
const TIER_WEIGHTS = {
  DUCK: 3000, SEVEN: 120, BAR3: 450, BAR2: 700, BAR1: 3200,
  ANYBAR: 4200, CHERRY3: 500, CHERRY2: 5200, CHERRY1: 15630
};
/* Re-tuned 2026-11-22 (v7) — JOSHUA'S RULING: the machine pays out
   MORE than it takes in, RTP above 100% at BOTH bet levels, aiming
   ~110%. (Supersedes the v4 tune below the line in git history: red
   routing fix era, 87.48% @1c / 85.90% @3c at 2M spins, hit 11.0%.)
   Method: win weights scaled x1.24 across the board (hit rate rises
   with them — a loose machine that rarely hits is wrong), plus the
   one paytable touch the levels needed: DUCK at 1 coin 2500 -> 3500.
   DUCK is the only tier worth more per coin at 3 coins than at 1
   (10000/3 vs 2500/1), which tilted 3-coin RTP ~5 points over
   1-coin at any pure weight scale; 3500 closes the tilt so both
   levels land together. The displayed paytable is rendered from
   PAYTABLE above, so displayed = actual by construction. Red-chain
   behavior UNCHANGED (RED_CHANCE 0.20 / RED_CHAIN_CHANCE 0.20 /
   RED_MAX 5), PICK_CHANCE unchanged. [v10 supersedes the chain:
   Joshua's 2026-11-22 16:44 ruling — a red hit awards a flat random
   2-8 re-spins via redSpinCount; the chain constants are gone.]
   Proof: Monte Carlo 2,000,000
   spins per level on this file (../sim.js simSpins replica) —
   numbers recorded in the vault BUILD-RECORD.md V7 section.
   Tuner cross-check (seeded, 5M spins/level): 110.11% @1c /
   110.50% @3c, hit 13.6%. */
const TOTAL_WEIGHT = 100000;

/* Feature odds (documented/inferred — see RESEARCH.md):
   red screen ~1 in 5 winning spins; pick-a-duck is an independent roll
   on a winning spin, taken after the red spins settle. */
const RED_CHANCE = 0.35;       // per winning spin (v10: raised from 0.20 — see below)
/* v10 (Joshua, 2026-11-22 16:44 CT — his numbers, superseding the old
   20%-continue / cap-5 chain): every time the red screen hits it awards
   AT LEAST 2 re-spins and at most 8, drawn flat random — never one.
   RED_CHAIN_CHANCE and RED_MAX are dead and removed. [Award range cut
   to 2-4 by the v12 ruling below.] */
function redSpinCount(rng) { return 2 + Math.floor(rng() * 3); } // uniform 2..4 (v12: Joshua, 2026-11-22 19:25 CT — 2 to 4 at the most, never 1, never more than 4; frequency rule unchanged, RED_CAP stays 30)
/* v10 frequency (Joshua, 2026-11-22 16:54 CT, corrected 16:55 CT):
   a red screen at least once every 30 spins, never a longer wait.
   RED_CHANCE 0.35 per winning spin puts the natural mean gap near
   ~21 spins; RED_CAP is the hard backstop — the 30th spin since the
   last red screen is dealt as a win and always goes red (game.js). */
const RED_CAP = 30;
/* Pick a Duck's OWN trigger: an independent roll on a winning spin.
   Until 2026-11-22 this was 0.25 as a SHARE OF RED TRIGGERS, and the red
   screen diverted into the pond instead of re-spinning — Joshua, from
   the real machine: "the red screen does the re-spins." The pick never
   diverts a red screen now; 0.05 per winning spin is the old effective
   rate (0.20 red x 0.25 share), so the pay band holds. */
const PICK_CHANCE = 0.05;

/* How many ducks show in a WINNING display (the base tier is drawn first,
   then the display is dealt): 0 ducks ~78%, 1 duck ~17%, 2 ducks ~5%.
   The ducks are not decoration — each one in the line multiplies the pay
   (x2 / x4), which is the real machine's headline rule (floor glass:
   "[duck] DOUBLES Winning Combination", "2 LUCKY DUCKY PAYS 4X"). */
/* v10 (Joshua, 2026-11-22 16:40 CT: "Increase the odds on lucky
   ducks"): the duck roll moved from [0.83, 0.13, 0.04] to
   [0.74, 0.19, 0.07] — a dealt win now carries 1 duck 19% of the
   time (was 13%) and 2 ducks 7% (was 4%), so duck-doubled and
   duck-quadrupled pays land far more often. */
const DUCK_ROLL = [0.74, 0.19, 0.07];

/* 22-stop mechanical strips (reconstructed; counts set the near-miss feel —
   the tier draw above decides outcomes, strips decide what the eye sees).
   2026-11-22 rework, second pass (Joshua, 13:12 CT: "make it spin down
   and fill in the reels"): ZERO blank stops — every position on every
   strip is a real symbol from the evidenced set, so no empty slot ever
   shows in the window or rolls past. (The v1-v3 strips alternated
   blank/symbol — 11 blanks per reel; a first rework cut that to 4;
   Joshua's word is none.) Counts per reel — R1: DUCK 1 SEVEN 2 BAR3 2
   BAR2 4 BAR1 7 CHERRY 6; R2: DUCK 1 SEVEN 2 BAR3 2 BAR2 5 BAR1 7
   CHERRY 5; R3: DUCK 1 SEVEN 2 BAR3 3 BAR2 4 BAR1 6 CHERRY 6.
   v10 (Joshua, 2026-11-22 16:40 CT: "Add two more ducks to the
   reels"): one extra DUCK stop on reel 1 (index 5) and one on reel 3
   (index 6), each 7 stops from the reel's original duck — R1 and R3
   are now 23 stops with DUCK 2; R2 stays 22 stops with DUCK 1. The
   strips are window dressing (the tier draw decides outcomes), so
   the added ducks raise how often a duck shows in the window and
   rolls past; the payline duck rate itself is moved by DUCK_ROLL
   and the DUCK tier weight, both raised in the same order. Dealt combos never contain BLANK either — see loserCombo
   and the cherry fillers in comboForResult. */
const STRIPS = [
  ['BAR1','CHERRY','BAR2','CHERRY','BAR1','DUCK','SEVEN','BAR3','CHERRY','BAR1','BAR1','BAR2','DUCK','BAR1','CHERRY','BAR3','BAR2','BAR1','BAR2','SEVEN','CHERRY','CHERRY','BAR1'],
  ['BAR2','BAR1','CHERRY','SEVEN','BAR1','BAR1','BAR3','BAR2','CHERRY','BAR1','CHERRY','BAR2','DUCK','BAR1','CHERRY','BAR3','BAR2','SEVEN','BAR1','BAR2','CHERRY','BAR1'],
  ['BAR1','SEVEN','BAR2','BAR3','CHERRY','BAR1','DUCK','BAR2','BAR3','CHERRY','BAR1','CHERRY','BAR2','DUCK','BAR1','BAR1','CHERRY','BAR3','BAR1','SEVEN','CHERRY','BAR2','CHERRY']
];

/* ---------- the duck: WILD, with multipliers (2026-11-22 research) ----------
   Floor glass on the real machine (Hard Rock Tulsa photo, RESEARCH.md):
   "[DUCK] DOUBLES Winning Combination" · "[DUCK] is WILD on payline only" ·
   "2 LUCKY DUCKY PAYS 4X". Corroborated by paid jackpots photographed on
   the floor (DUCK + two triple-BARs paid exactly 3xBAR3 doubled; two logos
   + a red 7 on the sibling game paid three 7s at 4x) and by the sibling
   game's published rule text. So:
   - the duck substitutes for every symbol ON THE PAYLINE;
   - the line is read its best way (highest base pay wins);
   - 1 duck in the paying line multiplies the pay x2, 2 ducks x4;
   - the duck also stands in as a cherry for the cherry count pays — the
     "Doubles" family behavior (a lone duck therefore pays the doubled
     1-cherry prize; two ducks + a blank pay the 2-cherry prize at 4x).
     This cherry interaction is INFERRED from the family design — no
     published source states it in words; flagged in RESEARCH.md;
   - three ducks are the paytable's own top line (no extra multiplier);
   - two ducks + a blank is NOT a standalone pair pay — no source shows
     one; it pays through the cherry count above (60 credits at 3 coins). */
function evaluateCombo(combo) {
  const ducks = combo.filter(s => s === 'DUCK').length;
  if (ducks === 3) return { tier: 'DUCK', ducks: 3, mult: 1 };
  const others = combo.filter(s => s !== 'DUCK');
  let best = null;
  const consider = t => { if (t && (!best || PAYTABLE[t][2] > PAYTABLE[best][2])) best = t; };
  // three-of-a-kind line: every non-duck symbol is the same line symbol
  if (others.length && others.every(s => s === others[0]) &&
      ['SEVEN', 'BAR3', 'BAR2', 'BAR1'].includes(others[0])) consider(others[0]);
  // any-bar line: every non-duck symbol is a bar
  if (others.length && others.every(s => BARS.includes(s))) consider('ANYBAR');
  // cherry count pays: real cherries + ducks standing in as cherries
  const cherryCount = combo.filter(s => s === 'CHERRY').length + ducks;
  if (cherryCount >= 3) consider('CHERRY3');
  else if (cherryCount === 2) consider('CHERRY2');
  else if (cherryCount === 1) consider('CHERRY1');
  if (!best) return null;
  return { tier: best, ducks, mult: Math.pow(2, ducks) };
}

function payFor(tier, coins) {
  if (!tier) return 0;
  if (tier === 'PROGRESSIVE') return 0; // handled by caller
  return PAYTABLE[tier][coins - 1];
}

/* Full result for a dealt combo: {combo, tier, ducks, mult, base, pay}.
   tier is null and pay 0 for a non-winning line. */
function resultForCombo(combo, coins) {
  const ducks = combo.filter(s => s === 'DUCK').length;
  const ev = evaluateCombo(combo);
  if (!ev) return { combo: combo.slice(), tier: null, ducks, mult: 1, base: 0, pay: 0 };
  const base = payFor(ev.tier, coins);
  return { combo: combo.slice(), tier: ev.tier, ducks: ev.ducks, mult: ev.mult, base, pay: base * ev.mult };
}

function pickTier(rng) {
  let r = rng() * TOTAL_WEIGHT;
  for (const t of TIER_ORDER) {
    r -= TIER_WEIGHTS[t];
    if (r < 0) return t;
  }
  return null; // losing spin
}

const shuffleArr = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/* Build a combo that evaluates to EXACTLY (tier, ducks) — verified against
   evaluateCombo before returning. Some pairs are impossible under the
   best-reading rule (e.g. 2 ducks + a single BAR reads as 3 cherries,
   which pays more than 3 single BARs, so (BAR1, 2 ducks) can never be the
   result); those return null and callers fall back. */
function comboForResult(tier, ducks, rng, attempts) {
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const maxTry = attempts || 12;
  for (let attempt = 0; attempt < maxTry; attempt++) {
    let combo = null;
    if (tier === 'DUCK') {
      combo = ['DUCK', 'DUCK', 'DUCK'];
    } else if (['SEVEN', 'BAR3', 'BAR2', 'BAR1'].includes(tier)) {
      combo = [tier, tier, tier];
      shuffleArr([0, 1, 2], rng).slice(0, ducks).forEach(p => { combo[p] = 'DUCK'; });
    } else if (tier === 'ANYBAR') {
      const bars = shuffleArr(BARS, rng);
      combo = [bars[0], bars[1], bars[0]];
      shuffleArr([0, 1, 2], rng).slice(0, ducks).forEach(p => { combo[p] = 'DUCK'; });
      combo = shuffleArr(combo, rng);
    } else if (tier && tier.indexOf('CHERRY') === 0) {
      const total = tier === 'CHERRY3' ? 3 : tier === 'CHERRY2' ? 2 : 1;
      const realCherries = total - ducks;
      if (realCherries < 0) return null;
      combo = [];
      for (let i = 0; i < ducks; i++) combo.push('DUCK');
      for (let i = 0; i < realCherries; i++) combo.push('CHERRY');
      const fillers = ['SEVEN', 'BAR1', 'BAR2', 'BAR3', 'SEVEN', 'BAR1']; // no BLANK: strips carry none (2026-11-22)
      while (combo.length < 3) combo.push(pick(fillers));
      combo = shuffleArr(combo, rng);
    }
    if (!combo) return null;
    const ev = evaluateCombo(combo);
    if (ev && ev.tier === tier && ev.ducks === ducks) return combo;
  }
  return null;
}

/* A natural loser under the wild rules (near-misses that still pay 0:
   two sevens + a bar, two bars + a seven). Anything with a duck next to
   a cherry — or a duck alone — PAYS now, so it can never be dealt as a
   loser; the rejection loop enforces that against evaluateCombo. And
   since the strips carry no blank stops (2026-11-22), a loser is dealt
   from real faces only: the random draw comes from {SEVEN, BAR1, BAR2,
   BAR3} — no cherries (any cherry pays), no ducks (a duck pays). */
function loserCombo(rng) {
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const roll = rng();
  if (roll < 0.10) { const c = ['SEVEN', 'SEVEN', pick(BARS)]; if (!evaluateCombo(c)) return c; }
  if (roll < 0.18) { const c = [pick(BARS), pick(BARS), 'SEVEN']; if (!evaluateCombo(c)) return c; }
  let combo = null, guard = 0;
  const FACES = ['SEVEN', 'BAR1', 'BAR2', 'BAR3'];
  do { combo = [pick(FACES), pick(FACES), pick(FACES)]; } while (evaluateCombo(combo) !== null && ++guard < 80);
  if (evaluateCombo(combo) !== null) combo = ['SEVEN', 'BAR1', 'SEVEN'];
  return combo;
}

/* One base-game spin: draw the tier, deal the display (with the duck
   variant roll), and score the dealt combo. The combo IS the result —
   what the reels show is exactly what gets paid. */
function drawResult(coins, rng) {
  /* through the api object, so the QA suites can stub the tier draw
     (LuckyLogic.pickTier = ...) and have it take effect — a plain
     internal call would bypass the stub (found 2026-11-22, v4 QA). */
  const tier = api.pickTier(rng);
  if (!tier) return resultForCombo(loserCombo(rng), coins);
  if (tier === 'DUCK') return resultForCombo(['DUCK', 'DUCK', 'DUCK'], coins);
  const r = rng();
  const ducksWanted = r < DUCK_ROLL[0] ? 0 : r < DUCK_ROLL[0] + DUCK_ROLL[1] ? 1 : 2;
  const combo = comboForResult(tier, ducksWanted, rng) || comboForResult(tier, 0, rng, 40);
  return resultForCombo(combo, coins);
}

/* Red-screen re-spin draw: a result whose pay is >= minPay (the real
   machine guarantees at least the triggering win, and the re-spin's size
   normally corresponds to it — candidates are weighted toward the closest
   pays above the floor). */
function pickResultAtLeast(minPay, coins, rng) {
  const cands = [];
  for (const t of TIER_ORDER) {
    for (let d = 0; d <= 2; d++) {
      const pay = payFor(t, coins) * Math.pow(2, d);
      if (pay >= minPay) cands.push({ t, d, pay });
    }
  }
  cands.sort((a, b) => a.pay - b.pay);
  const weighted = [];
  cands.forEach((c, i) => {
    let w = Math.round(100 * Math.pow(minPay / c.pay, 3.2));
    if (i === 0) w = Math.max(w, 100); // closest tier always dominates
    for (let k = 0; k < w; k++) weighted.push(c);
  });
  for (let tries = 0; tries < 12 && weighted.length; tries++) {
    const c = weighted[Math.floor(rng() * weighted.length)];
    const combo = comboForResult(c.t, c.d, rng);
    if (combo) return resultForCombo(combo, coins);
  }
  for (const c of cands) {
    const combo = comboForResult(c.t, c.d, rng, 40);
    if (combo) return resultForCombo(combo, coins);
  }
  return resultForCombo(['DUCK', 'DUCK', 'DUCK'], coins);
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
   maps to a pattern — the same display logic the floor machine uses: the
   card decides the prize, the reels act it out (the floor machine's own
   top screen prints "PRIZES AWARDED FOR BINGO CARD ONLY"). */
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

/* ---------- Jewel Hunt ----------
   SEEN on a floor install (Joshua's TikTok still, 2026-11-21): a row of 10
   diamond slots across the top screen, "COLLECT 1 MORE DIAMOND!" prompts,
   and "COLLECT 10 JEWELS TO TRIGGER THE JEWEL HUNT BONUS" printed above the
   reels. The collection/prize mechanics below are RECONSTRUCTED (never
   published): one jewel per duck landing on the payline; at 10 the hunt
   opens a pick-a-jewel screen paying one prize from this table. */
const JEWELS_TO_TRIGGER = 10;
function jewelPrize(coins, rng) {
  const table = [10, 15, 20, 25, 40, 50, 75, 100, 150, 250];
  const weights = [22, 20, 18, 14, 10, 7, 5, 2.5, 1, 0.5];
  let r = rng() * 100;
  for (let i = 0; i < table.length; i++) { r -= weights[i]; if (r < 0) return table[i] * coins; }
  return 10 * coins;
}

const api = { SYMBOLS, BARS, PAYTABLE, TIER_ORDER, TIER_WEIGHTS, TOTAL_WEIGHT, RED_CHANCE, redSpinCount, RED_CAP, PICK_CHANCE, DUCK_ROLL, STRIPS, PATTERNS, LINES, evaluateCombo, payFor, resultForCombo, pickTier, comboForResult, loserCombo, drawResult, pickResultAtLeast, stopFor, genCard, newGoldSet, pickDuckPrize, JEWELS_TO_TRIGGER, jewelPrize };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.LuckyLogic = api;
