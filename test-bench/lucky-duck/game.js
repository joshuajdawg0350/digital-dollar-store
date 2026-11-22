/* Lucky Duck — personal machine UI/engine. Presentation cloned from the VGT
   Lucky Ducky $1 floor machine (Class II bingo-driven 3-reel): TWO-PART
   cabinet — a compact top video screen (bingo card left, duck bill art
   right, Won/Paid/Bet/Cash meters along its bottom) over THREE BIG reels
   behind glass.
   v3 (2026-11-22): the duck mechanics are REAL now — the logo is WILD on
   the payline, one duck DOUBLES the win, two ducks PAY 4X, the duck counts
   as a cherry (logic.js, researched in ../RESEARCH.md) — and the duck art
   is the generated medallion/bill artwork, not a code drawing. The reel
   window shows ~1.78 symbol rows like the floor machine: one big symbol
   centered on the payline, neighbors peeking.
   Play credits only. Personal machine, never sold. */
'use strict';
const L = window.LuckyLogic;
const $ = id => document.getElementById(id);
const rng = Math.random;

/* ---------------- the duck — artwork COPIED from Joshua's photos
   (v6, 2026-11-22; his standing order: "Don't redraw — copy the shit").
   The medallion is the duck himself cropped out of the upper-screen
   oval in 1000009636_30_g2f5.jpg; the bill panel is the machine's own
   lower LUCKY DUCKY MONEY panel cropped out of 1000009633_31_13ia.jpg;
   the reel logo, BAR plates, badges, PAYLINE marker and $1 plate are
   likewise the photos' own pixels — see the v6 section of the vault
   BUILD-RECORD.md for the source box of every asset. ------------- */
const MEDAL_IMG = 'assets/duck-medallion-photo.png';
function gemSVG() {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <polygon points="50,4 88,34 50,96 12,34" fill="url(#gemG)" stroke="#1d6f9e" stroke-width="3"/>
    <polygon points="50,4 70,34 50,96 30,34" fill="#ffffff" opacity=".28"/>
    <polyline points="12,34 88,34" stroke="#eaf9ff" stroke-width="2.4" fill="none"/>
    <polyline points="30,34 50,4 70,34" stroke="#eaf9ff" stroke-width="1.8" fill="none"/>
  </svg>`;
}
/* The red 7 COPIED from Joshua's photo of the real machine
   (2026-11-22, his order: "Don't redraw — copy the shit"): the 7 and
   its gold coin pile were cropped straight out of his photo
   (~/workspace/user/files/1000009618_23_e9td.jpg, middle reel), the
   reel-glass background lifted off, and the cutout ships as the
   symbol — same shape, same proportions, same red, same shading,
   same coin pile. assets/seven-photo.png. No redraw, no likeness
   approximation. */
const SEVEN_IMG = 'assets/seven-photo.png';
function sevenHTML() {
  return `<img class="sevenImg" src="${SEVEN_IMG}" alt="7">`;
}
function cherrySVG() {
  return `<svg class="cherry" viewBox="0 0 60 60" aria-hidden="true">
    <path d="M20 34 Q30 14 48 8" stroke="#2e7d32" stroke-width="3.5" fill="none"/>
    <path d="M38 40 Q40 22 48 8" stroke="#2e7d32" stroke-width="3.5" fill="none"/>
    <ellipse cx="48" cy="9" rx="7" ry="4" fill="#43a047" transform="rotate(-24 48 9)"/>
    <circle cx="20" cy="42" r="13" fill="#d81f36"/><circle cx="16" cy="37" r="4" fill="#ff8f9d" opacity=".8"/>
    <circle cx="40" cy="48" r="14" fill="#b30f27"/><circle cx="35" cy="42" r="4.5" fill="#ff8f9d" opacity=".8"/>
  </svg>`;
}
$('marqueeDuck').innerHTML = `<img src="${MEDAL_IMG}" alt="Lucky Ducky medallion">`;

function symHTML(sym) {
  switch (sym) {
    case 'DUCK': return `<div class="sym"><img class="duckLogoImg" src="assets/ducklogo-photo.png" alt="Lucky Ducky"></div>`;
    case 'SEVEN': return `<div class="sym">${sevenHTML()}</div>`;
    case 'BAR3': return `<div class="sym"><img class="barImg" src="assets/bar3-photo.png" alt="BAR BAR BAR"></div>`;
    case 'BAR2': return `<div class="sym"><img class="barImg" src="assets/bar2-photo.png" alt="BAR BAR"></div>`;
    case 'BAR1': return `<div class="sym"><img class="barImg" src="assets/bar1-photo.png" alt="BAR"></div>`;
    case 'CHERRY': return `<div class="sym">${cherrySVG()}</div>`;
    default: return `<div class="sym"></div>`;
  }
}

/* ---------------- sound (our own synthesis, floor character) ---------------- */
let AC = null, soundOn = true;
function ac() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; }
function beep(freq, dur, type, vol, when, slideTo) {
  if (!soundOn) return;
  try {
    const a = ac(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (when || 0);
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || .06, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .02);
  } catch (e) { /* audio unavailable */ }
}
function thunk() { beep(110, .09, 'sine', .22, 0, 55); beep(2400, .02, 'square', .03); }
function tickSnd() { beep(1900, .015, 'square', .022); }
function coinTick() { beep(1560, .05, 'square', .05); beep(2090, .07, 'square', .045, .045); }
function jingle(big) {
  const notes = big ? [523, 659, 784, 1046, 784, 1046, 1318] : [523, 659, 784, 1046];
  notes.forEach((f, i) => beep(f, .13, 'square', .055, i * .085));
}
function quack() { beep(620, .13, 'sawtooth', .09, 0, 240); beep(660, .11, 'sawtooth', .08, .16, 260); }
function siren() { for (let i = 0; i < 3; i++) { beep(520, .22, 'sawtooth', .05, i * .42, 940); beep(940, .2, 'sawtooth', .05, i * .42 + .21, 520); } }
function splash() { beep(300, .25, 'sine', .12, 0, 90); beep(1200, .05, 'square', .03, .05); }
function gemSnd() { beep(1318, .12, 'sine', .07); beep(1760, .16, 'sine', .06, .09); beep(2217, .2, 'sine', .045, .18); }

/* ---------------- state ---------------- */
const SAVE_KEY = 'luckyDuckPersonalV1';
let save = { cash: 1000, progressive: 10000, sound: true, jewels: 0 };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s.cash === 'number') save = Object.assign(save, s); } catch (e) {}
soundOn = save.sound !== false;
let coinsBet = 3, busy = false, sessionPaid = 0;
const state = { cash: save.cash, progressive: Math.max(10000, save.progressive || 10000), lastWon: 0, jewels: Math.min(L.JEWELS_TO_TRIGGER - 1, Math.max(0, save.jewels | 0)) };
function persist() { save.cash = state.cash; save.progressive = state.progressive; save.sound = soundOn; save.jewels = state.jewels; try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

/* ---------------- bonus minimum-view lock ----------------
   Joshua's standing rule (2026-11-22 00:07 CT): "Make sure you have to see
   a couple seconds at least of the bonus screen before it goes away. It's
   easy to accidentally push it right past it." Every tap-advanced bonus
   screen ignores taps for its first 2 seconds — ignored, not queued. */
const BONUS_MIN_VIEW_MS = 2000;
const bonusLocked = openedAt => Date.now() - openedAt < BONUS_MIN_VIEW_MS;

/* ---------------- jewel hunt ---------------- */
function renderJewels(justIdx) {
  $('jewels').innerHTML = Array.from({ length: L.JEWELS_TO_TRIGGER }, (_, i) =>
    `<div class="jewel ${i < state.jewels ? 'on' : 'off'}${i === justIdx ? ' just' : ''}">${gemSVG()}</div>`).join('');
  const left = L.JEWELS_TO_TRIGGER - state.jewels;
  $('jewelStrip').textContent = state.jewels === 0
    ? 'COLLECT 10 JEWELS TO TRIGGER THE JEWEL HUNT BONUS'
    : `COLLECT ${left} MORE JEWEL${left === 1 ? '' : 'S'} TO TRIGGER THE JEWEL HUNT BONUS`;
}
function jewelHunt() {
  return new Promise(resolve => {
    let openedAt = Date.now() + 1e9; // locked until the screen is actually up
    const grid = $('jewelGrid');
    grid.innerHTML = '';
    $('jewelResult').style.display = 'none';
    const prize = L.jewelPrize(coinsBet, rng);
    for (let i = 0; i < 10; i++) {
      const b = document.createElement('button');
      b.className = 'jewelPick';
      b.innerHTML = gemSVG() + `<div class="amt">$${prize}</div>`;
      b.setAttribute('aria-label', 'Pick this jewel');
      b.onclick = async () => {
        if (bonusLocked(openedAt)) return; // minimum-view lock: early taps ignored
        if (b.classList.contains('picked')) return;
        document.querySelectorAll('.jewelPick').forEach(d => { d.onclick = null; if (d !== b) d.classList.add('dim'); });
        b.classList.add('picked'); gemSnd(); jingle(true);
        $('jewelAmt').textContent = `YOUR JEWEL HIDES $${prize}!`;
        $('jewelResult').style.display = 'block';
        $('jewelCollectBtn').onclick = async () => {
          $('jewelOverlay').classList.remove('on');
          await countUp(prize, 1000);
          sessionPaid += prize; state.lastWon = sessionPaid;
          renderMeters(state.lastWon, sessionPaid); persist();
          resolve();
        };
      };
      grid.appendChild(b);
    }
    $('jewelOverlay').classList.add('on');
    openedAt = Date.now();
  });
}

/* ---------------- bingo game (continuous live call) ----------------
   The card is the game, like the floor machine: balls are called and
   daubed live, and each spin's card completes the pattern that matches
   the prize the reels act out. */
const bingo = { gameNo: 1, gold: L.newGoldSet(rng), called: [], order: [], idx: 0, card: null };
function startBingoGame() {
  bingo.gold = L.newGoldSet(rng);
  bingo.called = [];
  bingo.order = [];
  for (let n = 1; n <= 75; n++) if (!bingo.gold.has(n)) bingo.order.push(n);
  for (let i = bingo.order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [bingo.order[i], bingo.order[j]] = [bingo.order[j], bingo.order[i]]; }
  bingo.idx = 0;
  bingo.gameNo++;
  renderCalled(); renderGameState();
}
function renderGameState() { $('gameState').textContent = `G${bingo.gameNo} · ${bingo.called.length + 38}/75`; }
function renderCalled() {
  const last = bingo.called.slice(-9);
  $('calledBalls').innerHTML = last.map((n, i) => `<div class="ball${i === last.length - 1 ? ' latest' : ''}">${n}</div>`).join('');
}
setInterval(() => {
  if (bingo.idx >= bingo.order.length) { startBingoGame(); if (!busy) dealCard(null); return; }
  bingo.called.push(bingo.order[bingo.idx++]);
  renderCalled(); renderGameState(); markWhites();
}, 1150);

/* bingo card render */
const BH = ['B', 'I', 'N', 'G', 'O'];
function dealCard(tier) {
  bingo.card = L.genCard(tier, bingo.gold, rng);
  const card = $('bingoCard');
  let html = BH.map(h => `<div class="bh">${h}</div>`).join('');
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const cell = r * 5 + c, v = bingo.card.grid[cell];
    if (v === 'FREE') html += `<div class="cell free" data-cell="${cell}">FREE</div>`;
    else html += `<div class="cell" data-cell="${cell}" data-num="${v}"><span>${v}</span></div>`;
  }
  card.innerHTML = html;
  markWhites();
  bingo.card.goldCells.forEach((cell, i) => {
    setTimeout(() => { const el = card.querySelector(`[data-cell="${cell}"]`); if (el) el.classList.add('gold'); }, 130 * i + 60);
  });
  if (tier) setPattern({ name: L.PATTERNS[tier].name, cells: Array.from(bingo.card.goldCells) }, tier);
}
function markWhites() {
  if (!bingo.card) return;
  document.querySelectorAll('#bingoCard .cell[data-num]').forEach(el => {
    if (bingo.called.includes(+el.dataset.num)) el.classList.add('marked');
  });
}
/* pattern banner; idle = attract cycle like the floor machine */
const ATTRACT = [
  { name: 'PRIVATE STRIPES', cells: L.PATTERNS.BAR3.cells },
  { name: 'SIX PACK', cells: L.PATTERNS.SEVEN.cells },
  { name: 'LUCKY X', cells: L.PATTERNS.DUCK.cells },
  { name: 'FOUR CORNERS', cells: L.PATTERNS.ANYBAR.cells }
];
let attractIdx = 0, attractTimer = null;
function setPattern(pat, tier) {
  /* the pattern shows on the card itself — the gold cells ARE the diagram */
  $('patternName').textContent = pat ? pat.name : '—';
}
function startAttract() {
  stopAttract();
  attractTimer = setInterval(() => { if (!busy) { setPattern(ATTRACT[attractIdx % ATTRACT.length], null); attractIdx++; } }, 3400);
}
function stopAttract() { if (attractTimer) clearInterval(attractTimer); attractTimer = null; }

/* ---------------- reels ----------------
   Window = 1.78 symbol rows (floor machine: one big symbol centered on
   the payline, neighbors peeking). The payline cell's center must sit at
   the window's center, so the strip offset is (ROWS - 1) / 2 = 0.39 of a
   cell above the cell's top. Measure a rendered symbol for the cell
   height: getComputedStyle returns the --cell clamp() UNRESOLVED and
   parseFloat of it is NaN — the rendered height is the truth. */
const ROW_OFF = 0.39;
const REEL_BORDER = 3; // .reel's border width: the strip's containing box starts
                       // this far inside the window, so the payline cell needs
                       // the same nudge to sit exactly on the payline
const CELL_H = () => { const s = document.querySelector('#reel0 .strip .sym'); return s ? s.getBoundingClientRect().height : 100; };
const reelEls = [$('reel0'), $('reel1'), $('reel2')];
const strips = [];
/* The strip carries FIVE repetitions and rests in the middle one
   (rep 2, offset 44). A spin travels DOWNWARD (FIX B, below), landing
   in a lower repetition, and finish() renormalizes back to the home
   repetition — the same picture, so the snap is invisible. */
const REPS = 5, HOME_OFF = 44;
reelEls.forEach((el, ri) => {
  const strip = document.createElement('div');
  strip.className = 'strip';
  let html = '';
  for (let rep = 0; rep < REPS; rep++) for (const s of L.STRIPS[ri]) html += symHTML(s);
  strip.innerHTML = html;
  el.appendChild(strip);
  strips.push({ el: strip, pos: 0 }); // pos = stop index at payline
});
function setReelInstant(ri, stopIdx) {
  const st = strips[ri], h = CELL_H();
  const m = stopIdx + HOME_OFF; // home repetition: cell m sits on the payline
  st.el.style.transform = `translateY(${-(m - ROW_OFF) * h - REEL_BORDER}px)`;
  st.pos = stopIdx;
}
reelEls.forEach((_, ri) => setReelInstant(ri, [11, 6, 4][ri])); // boot window: DUCK · BAR3 · CHERRY
function spinReelTo(ri, stopIdx, dur) {
  return new Promise(res => {
    const st = strips[ri], h = CELL_H();
    const stripLen = L.STRIPS[ri].length;
    const cur = st.pos;
    /* FIX B — THE REELS FALL DOWNWARD (Joshua, 2026-11-22: he ordered
       "spin down" and reported the reels still going UP — he was
       right: the old code animated the strip to MORE negative
       translateY, which drags every symbol UP the window). Downward
       travel means the strip's translateY INCREASES toward its stop:
       the target cell sits in a LOWER repetition than the home cell.
       Pick the lower-rep landing that gives a real run (16+ cells);
       the rep-0 landing always gives 23+, so one always qualifies. */
    const homePos = cur + HOME_OFF;
    const lower = [stopIdx + stripLen, stopIdx].filter(p => homePos - p >= 16);
    const finalPos = lower.length ? lower[0] : stopIdx;
    const fromY = -(homePos - ROW_OFF) * h - REEL_BORDER;
    const toY = -(finalPos - ROW_OFF) * h - REEL_BORDER;
    st.el.classList.add('spinning');
    /* Mechanical reel profile (Joshua, 2026-11-22: "make it spin down"):
       SPIN UP (accelerating, first 15% of the travel time, ~10% of the
       distance) -> ROLL (full speed, linear) -> SPIN DOWN (a long strong
       deceleration over the last ~40%) -> SETTLE (falling downward, the
       reel lands ~7px PAST its stop — below it — and eases back up onto
       it, like a real reel's weight settling). The motion blur sharpens
       away as it slows. */
    const dist = toY - fromY; // positive: the strip moves DOWN the window
    const anim = st.el.animate(
      [
        { transform: `translateY(${fromY}px)`, easing: 'cubic-bezier(.55,.06,.68,.19)' },
        { transform: `translateY(${fromY + dist * 0.10}px)`, offset: 0.15, easing: 'linear' },
        { transform: `translateY(${fromY + dist * 0.72}px)`, offset: 0.58, easing: 'cubic-bezier(.23,1,.32,1)' },
        { transform: `translateY(${toY + 7}px)`, offset: 0.94, easing: 'ease-out' },
        { transform: `translateY(${toY}px)`, offset: 1 }
      ],
      { duration: dur, fill: 'forwards' }
    );
    const blurAnim = st.el.animate(
      [{ filter: 'blur(2px) brightness(1.04)' }, { filter: 'blur(0px) brightness(1)' }],
      { duration: dur, easing: 'ease-out', fill: 'forwards' }
    );
    const tickInt = setInterval(tickSnd, 58);
    /* Settle exactly once, whichever way the animation ends. A WAAPI
       animation that gets CANCELED on a phone (tab throttling, overlay
       churn) never fires onfinish — without an oncancel path the spin
       promise would hang forever and the game would sit dead after an
       announcement screen (the red-screen stall Joshua hit). The
       timeout is the belt-and-braces path to the same settle. */
    let settledSpin = false;
    const finish = () => {
      if (settledSpin) return; settledSpin = true;
      try { anim.commitStyles(); } catch (e) {}
      try { anim.cancel(); } catch (e) {}
      try { blurAnim.cancel(); } catch (e) {}
      clearInterval(tickInt);
      st.el.classList.remove('spinning');
      st.pos = ((finalPos % stripLen) + stripLen) % stripLen;
      setReelInstant(ri, st.pos);
      thunk();
      res();
    };
    anim.onfinish = finish;
    anim.oncancel = finish;
    setTimeout(finish, dur + 700);
  });
}

/* ---------------- meters / messages ---------------- */
const fmt$ = n => '$' + Math.floor(n).toLocaleString('en-US');
function renderMeters(won, paid) {
  $('mBet').textContent = coinsBet;
  [['betOneBtn', 1], ['betTwoBtn', 2], ['betMaxBtn', 3]].forEach(([id, n]) => {
    const b = $(id); if (b) b.classList.toggle('sel', coinsBet === n);
  });
  $('mWon').textContent = won !== undefined ? won : state.lastWon;
  $('mPaid').textContent = paid !== undefined ? paid : sessionPaid;
  $('mCash').textContent = fmt$(state.cash);
  $('progressiveAmt').textContent = '$' + state.progressive.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  $('refillBtn').style.display = state.cash < coinsBet && !busy ? 'block' : 'none';
}
setInterval(() => { state.progressive += 0.01 + rng() * 0.05; if (!busy) renderMeters(); }, 900);
function msg(t) { $('msg').textContent = t; }
function banner(kind, text) {
  const b = $('banner');
  b.className = kind || ''; b.textContent = text || '';
  if (kind) b.style.display = 'block'; else b.style.display = 'none';
}
function countUp(amount, durMs) {
  return new Promise(res => {
    if (amount <= 0) { res(); return; }
    const steps = Math.max(6, Math.min(40, Math.floor(amount / 4)));
    const inc = amount / steps; let shown = 0, i = 0;
    const startCash = state.cash;
    const int = setInterval(() => {
      i++; shown = Math.min(amount, Math.round(inc * i));
      state.cash = startCash + shown;
      renderMeters(shown, sessionPaid);
      if (i % 2 === 0) coinTick();
      if (i >= steps) { clearInterval(int); state.cash = startCash + amount; renderMeters(amount, sessionPaid); res(); }
    }, Math.max(24, durMs / steps));
  });
}

/* ---------------- the spin ----------------
   The result is drawn first (tier + duck variant), the dealt combo IS
   the result, and the reels stop on it — the same direction as the
   floor machine, where the bingo card decides and the reels act it out.
   What the reels show is exactly what gets paid. */
async function doSpin(isRed, minPay) {
  const res = isRed ? L.pickResultAtLeast(minPay, coinsBet, rng) : L.drawResult(coinsBet, rng);
  dealCard(res.tier);
  const stops = res.combo.map((s, ri) => L.stopFor(ri, s, rng));
  banner(null);
  await Promise.all([
    spinReelTo(0, stops[0], 1150),
    spinReelTo(1, stops[1], 1450),
    spinReelTo(2, stops[2], 1750)
  ]);
  let pay = res.pay, jackpot = false;
  if (res.tier === 'DUCK' && coinsBet === 3) { pay = Math.max(pay, Math.floor(state.progressive)); jackpot = true; }
  return { combo: res.combo, tier: res.tier, ducks: res.ducks, mult: res.mult, base: res.base, pay, jackpot };
}

function nameOf(tier) {
  return { DUCK: '3 DUCKS', SEVEN: '3 SEVENS', BAR3: '3 TRIPLE BARS', BAR2: '3 DOUBLE BARS', BAR1: '3 BARS', ANYBAR: 'ANY BARS', CHERRY3: '3 CHERRIES', CHERRY2: '2 CHERRIES', CHERRY1: 'A CHERRY' }[tier] || '';
}
/* Announce the duck arithmetic out loud — the floor glass rules:
   one duck DOUBLES the winning combination, two ducks PAY 4X. */
function winMsg(r, prefix) {
  if (r.jackpot) return `3 DUCKS — PROGRESSIVE ${fmt$(r.pay)}!`;
  const nm = nameOf(r.tier);
  if (r.mult === 2) return `${prefix}${nm} ${r.base} — THE DUCK DOUBLES IT TO ${r.pay}!`;
  if (r.mult === 4) return `${prefix}${nm} ${r.base} — TWO DUCKS PAY 4X = ${r.pay}!`;
  return `${prefix}${nm} PAYS ${r.pay}`;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function playSpin() {
  if (busy) return;
  if (state.cash < coinsBet) { banner('over', 'GAME OVER'); msg('OUT OF CASH — TAP + $1,000 CASH'); return; }
  busy = true; document.body.dataset.busy = '1'; stopAttract(); renderMeters();
  state.cash -= coinsBet;
  state.progressive += coinsBet * 0.01;
  sessionPaid = 0; state.lastWon = 0;
  renderMeters(0, 0);
  msg('GOOD LUCK!');

  let totalWon = 0;
  let huntPending = false;
  /* jewel collection — one jewel per duck centered on the payline
     (reconstructed collection rule; the hunt itself is on the glass) */
  const collectJewels = async ducks => {
    if (ducks <= 0) return;
    const before = state.jewels;
    state.jewels = Math.min(L.JEWELS_TO_TRIGGER, state.jewels + ducks);
    renderJewels(before);
    gemSnd();
    if (state.jewels >= L.JEWELS_TO_TRIGGER) { huntPending = true; msg('JEWEL HUNT! TEN JEWELS COLLECTED!'); }
    else msg(`${ducks} JEWEL${ducks === 1 ? '' : 'S'} COLLECTED — ${state.jewels} OF 10!`);
    persist();
    await wait(650);
  };

  let r = await doSpin(false, 0);
  await collectJewels(r.ducks);

  if (r.pay > 0) {
    totalWon += r.pay;
    banner('win', r.jackpot ? 'JACKPOT!' : 'WINNER!');
    jingle(r.pay >= 100 || r.jackpot); if (r.tier === 'DUCK') quack();
    msg(winMsg(r, ''));
    await countUp(r.pay, r.pay >= 100 ? 1500 : 700);
    if (r.jackpot) state.progressive = 10000;
    sessionPaid = totalWon; state.lastWon = totalWon; renderMeters(totalWon, sessionPaid);

    /* RED SCREEN — the game's bonus: the top screen floods red and the
       machine RE-SPINS, guaranteed to pay at least the win that
       triggered it; a re-spin can flash red again and chain (max 5).
       Every re-spin's pay ADDS to the session total. The red screen
       ALWAYS re-spins — nothing diverts it. Pick a Duck is a separate
       bonus on its own trigger, rolled after this chain settles
       (Joshua, 2026-11-22: "the red screen does the re-spins").
       (Player-reported + filmed: RESEARCH.md.) */
    let chain = 0, triggerPay = r.pay;
    while (chain < L.RED_MAX && rng() < (chain === 0 ? L.RED_CHANCE : L.RED_CHAIN_CHANCE)) {
      chain++;
      $('redSub').textContent = chain > 1 ? `RE-SPIN ${chain} — STILL GUARANTEED` : 'GUARANTEED WIN — NO CHARGE';
      $('redJewels').innerHTML = Array.from({ length: L.JEWELS_TO_TRIGGER }, (_, i) =>
        `<div class="jewel ${i < state.jewels ? 'on' : 'off'}">${gemSVG()}</div>`).join('');
      $('redJewelText').textContent = state.jewels >= L.JEWELS_TO_TRIGGER ? 'JEWEL HUNT!' :
        `COLLECT ${L.JEWELS_TO_TRIGGER - state.jewels} MORE DIAMOND${L.JEWELS_TO_TRIGGER - state.jewels === 1 ? '' : 'S'}!`;
      $('redFlash').classList.add('on');
      $('screen').classList.add('redflood');
      document.body.classList.add('redspin');
      siren();
      /* the red screen is a bonus screen — Joshua's minimum-view rule: it
         stays up a full couple of seconds before anything can move past it */
      await wait(2150);
      $('redFlash').classList.remove('on');
      msg(`RED SCREEN RE-SPIN ${chain}!`);
      const rr = await doSpin(true, triggerPay);
      await collectJewels(rr.ducks);
      totalWon += rr.pay; triggerPay = rr.pay;
      banner('win', 'WINNER!'); jingle(rr.pay >= 100 || rr.jackpot); if (rr.tier === 'DUCK') quack();
      msg(winMsg(rr, 'RE-SPIN — '));
      await countUp(rr.pay, rr.pay >= 100 ? 1400 : 650);
      if (rr.jackpot) state.progressive = 10000;
      sessionPaid = totalWon; state.lastWon = totalWon; renderMeters(totalWon, sessionPaid);
      document.body.classList.remove('redspin'); $('screen').classList.remove('redflood');
    }

    /* PICK A DUCK — its own bonus on its own trigger: an independent
       roll on a winning spin, taken only after any red-screen chain
       has fully settled. It never interrupts or replaces a re-spin. */
    if (rng() < L.PICK_CHANCE) {
      await pickADuck(r.pay);
      totalWon = state.lastWon;
    }
  } else {
    /* A losing spin just settles — no GAME OVER in the spin loop
       (Joshua, 2026-11-22). GAME OVER belongs to session end only:
       see the out-of-cash stop in playSpin. */
    msg('NO WIN — SPIN AGAIN');
  }

  if (huntPending) {
    banner(null);
    await jewelHunt();
    state.jewels = 0; renderJewels(-1); persist();
    totalWon = state.lastWon;
  }

  state.lastWon = totalWon;
  renderMeters(totalWon, sessionPaid);
  persist();
  busy = false; delete document.body.dataset.busy; renderMeters();
  startAttract();
}

/* ---------------- pick a duck ---------------- */
function pickADuck(triggerPay) {
  return new Promise(resolve => {
    let openedAt = Date.now() + 1e9; // locked until the pond is actually up
    const pond = $('pond');
    pond.innerHTML = '';
    $('pickResult').style.display = 'none';
    const prize = L.pickDuckPrize(triggerPay, coinsBet, rng);
    for (let i = 0; i < 9; i++) {
      const b = document.createElement('button');
      b.className = 'pondDuck';
      const col = i % 3, row = Math.floor(i / 3);
      b.style.top = (5 + row * 31 + (col % 2) * 3) + '%';
      b.style.left = (3 + col * 32 + (row % 2) * 2) + '%';
      b.style.animationDuration = (2.2 + (i % 4) * 0.7) + 's';
      b.style.animationDelay = (i * 0.3) + 's';
      b.innerHTML = `<span class="ripple"></span><img src="${MEDAL_IMG}" alt="Lucky Ducky"><div class="amt">$${prize}</div>`;
      b.setAttribute('aria-label', 'Pick this duck');
      b.onclick = async () => {
        if (bonusLocked(openedAt)) return; // minimum-view lock: early taps ignored
        if (b.classList.contains('picked')) return;
        document.querySelectorAll('.pondDuck').forEach(d => { d.onclick = null; if (d !== b) d.classList.add('dim'); });
        b.classList.add('picked'); splash(); quack();
        $('pickAmt').textContent = `YOUR DUCK HIDES $${prize}!`;
        $('pickResult').style.display = 'block';
        $('collectBtn').onclick = async () => {
          $('pickOverlay').classList.remove('on');
          await countUp(prize, 900);
          sessionPaid += prize; state.lastWon = sessionPaid;
          renderMeters(state.lastWon, sessionPaid); persist();
          resolve();
        };
      };
      pond.appendChild(b);
    }
    $('pickOverlay').classList.add('on');
    openedAt = Date.now();
  });
}

/* ---------------- controls ---------------- */
$('betOneBtn').onclick = () => { if (busy) return; coinsBet = 1; beep(880, .05, 'square', .05); renderMeters(); msg('BET 1 — SPIN WHEN READY'); };
$('betTwoBtn').onclick = () => { if (busy) return; coinsBet = 2; beep(880, .05, 'square', .05); renderMeters(); msg('BET 2 — SPIN WHEN READY'); };
$('betMaxBtn').onclick = () => { if (busy) return; coinsBet = 3; beep(880, .05, 'square', .05); beep(1174, .06, 'square', .05, .06); renderMeters(); msg('MAX BET 3 — SPIN WHEN READY'); };
$('spinBtn').onclick = () => { ac(); playSpin(); };
$('paysBtn').onclick = () => { $('paySheet').classList.toggle('open'); };
$('soundBtn').onclick = () => { soundOn = !soundOn; $('soundBtn').textContent = soundOn ? 'SOUND ON' : 'SOUND OFF'; persist(); };
$('refillBtn').onclick = () => { if (busy) return; state.cash += 1000; banner(null); jingle(false); renderMeters(); persist(); msg('$1,000 CASH ADDED — GOOD LUCK!'); };
$('soundBtn').textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';

/* paytable sheet */
(function buildPaytable() {
  const rows = [
    ['3 DUCKS', 'DUCK', true], ['3 SEVENS', 'SEVEN'], ['3 TRIPLE BARS', 'BAR3'],
    ['3 DOUBLE BARS', 'BAR2'], ['3 BARS', 'BAR1'], ['ANY 3 BARS', 'ANYBAR'],
    ['3 CHERRIES', 'CHERRY3'], ['2 CHERRIES', 'CHERRY2'], ['1 CHERRY', 'CHERRY1']
  ];
  $('payTable').innerHTML = '<tr><th>LINE PAYS</th><th class="c1">1 COIN</th><th class="c2">2 COINS</th><th class="c3">3 COINS</th></tr>' +
    rows.map(([label, tier, top]) => `<tr class="${top ? 'top' : ''}"><td>${label}</td><td class="c1">${L.PAYTABLE[tier][0].toLocaleString()}</td><td class="c2">${L.PAYTABLE[tier][1].toLocaleString()}</td><td class="c3">${L.PAYTABLE[tier][2].toLocaleString()}</td></tr>`).join('');
})();

/* boot */
startBingoGame();
dealCard(null);
renderMeters(0, 0);
renderJewels(-1);
setPattern(ATTRACT[0], null);
startAttract();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
