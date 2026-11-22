/* Lucky Duck — personal machine UI/engine. Presentation cloned from the VGT
   Lucky Ducky $1 floor machine (Downstream Casino): TWO-PART cabinet — a
   compact top video screen (small bingo card left, duck medallion + bill art
   right, Won/Paid/Bet/Cash meters along its bottom) over THREE BIG
   mechanical reels behind glass that dominate the lower half.
   Rebuilt 2026-11-21 to Joshua's four points + his three reference photos:
   reels way bigger · the REAL duck (white duck, top hat, green bow tie,
   coins, medallion) · RED sevens · the real machine's symbol faces.
   All art drawn in code; all sounds synthesized. Play credits only. */
'use strict';
const L = window.LuckyLogic;
const $ = id => document.getElementById(id);
const rng = Math.random;

/* ---------------- the duck — the real character, drawn in code ----------------
   White duck, black top hat with a gold band, big orange bill open in a
   grin, green bow tie, gold coins in his wing, chest coin — inside a gold
   medallion on green money art. Matches Joshua's logo reference. */
function duckFaceSVG() {
  /* THE duck, as he appears in Joshua's references: three-quarter/profile
     head facing LEFT, one long sweeping bill with a grin crease and an open
     red grin at its base, one big eye under an arched brow, tilted black top
     hat with a gold band, green bow tie at the front of his neck, wing
     holding gold coins, big coin at his chest. */
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="M40 82 Q62 72 88 80 Q97 94 93 113 L46 113 Q35 97 40 82 Z" fill="#ffffff"/>
    <path d="M87 34 q11 -5 13 3 q-6 2 -10 6 Z" fill="#ffffff"/>
    <path d="M90 46 q10 -2 11 5 q-6 1 -10 4 Z" fill="#ffffff"/>
    <ellipse cx="66" cy="52" rx="27" ry="26" fill="#ffffff"/>
    <path d="M42 62 Q36 74 44 82" stroke="rgba(0,0,0,.10)" stroke-width="2" fill="none" stroke-linecap="round"/>
    <g transform="rotate(-11 68 22)">
      <path d="M43 20 L47 0 Q68 -5 87 0 L91 20 Q68 25 43 20 Z" fill="#232327"/>
      <path d="M44.5 13 L89.5 13 L90.7 19.4 Q68 24 43.3 19.4 Z" fill="#c9a227"/>
      <ellipse cx="68" cy="21" rx="32" ry="5.5" fill="#19191c"/>
    </g>
    <path d="M45 32 Q57 24 71 29" stroke="#2b2b2b" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="57" cy="43" rx="8" ry="11.5" fill="#ffffff" stroke="#cfd4d8" stroke-width=".6"/>
    <circle cx="53.8" cy="41" r="4.6" fill="#7a4a12"/>
    <circle cx="52.9" cy="40.2" r="2.3" fill="#14100a"/>
    <circle cx="51.5" cy="37.8" r="1.1" fill="#ffffff"/>
    <path d="M38 57 Q48 54 54 57 Q52 68 43 70.5 Q37 65 38 57 Z" fill="#7c1710"/>
    <ellipse cx="44" cy="66.5" rx="5.5" ry="2.2" fill="#e2574c"/>
    <path d="M52 39 Q30 34 12 44 Q1 50 3 56.5 Q5 62 20 62.5 Q40 63 54 55 Q60 46 52 39 Z" fill="url(#billG)" stroke="#cf7a0d" stroke-width="1"/>
    <path d="M9 53.5 Q28 51.5 50 48.5" stroke="rgba(120,60,0,.42)" stroke-width="1.5" fill="none"/>
    <ellipse cx="15" cy="47.5" rx="2.3" ry="1.3" fill="rgba(120,60,0,.45)"/>
    <path d="M22 62.5 Q38 62.5 53 56.5 Q51 66 39 69.5 Q27 70 22 62.5 Z" fill="#f59b1d" stroke="#cf7a0d" stroke-width=".8"/>
    <path d="M47 86 L31 78.5 Q28.5 88 31 97.5 Z" fill="#22a355" stroke="#0d6e33" stroke-width="1"/>
    <path d="M47 86 L63 78.5 Q65.5 88 63 97.5 Z" fill="#22a355" stroke="#0d6e33" stroke-width="1"/>
    <rect x="40.5" y="79.5" width="13" height="13" rx="3.5" fill="#178a43" stroke="#0d6e33" stroke-width="1"/>
    <path d="M56 92 Q74 86 84 94 Q88 104 80 110 Q64 114 56 106 Q52 98 56 92 Z" fill="#ffffff" stroke="#d5d5d5" stroke-width="1"/>
    <path d="M60 98 Q70 94 79 98" stroke="rgba(0,0,0,.12)" stroke-width="1.6" fill="none"/>
    <path d="M59 104 Q69 100 77 103" stroke="rgba(0,0,0,.12)" stroke-width="1.6" fill="none"/>
    <circle cx="50" cy="101" r="6.6" fill="url(#coinG)" stroke="#9a6b0d" stroke-width="1"/>
    <circle cx="62" cy="107.5" r="5.9" fill="url(#coinG)" stroke="#9a6b0d" stroke-width="1"/>
    <text x="50" y="104.2" font-size="7.6" text-anchor="middle" fill="#7a5205" font-family="Georgia,serif" font-weight="bold">$</text>
    <text x="62" y="110.4" font-size="6.8" text-anchor="middle" fill="#7a5205" font-family="Georgia,serif" font-weight="bold">$</text>
    <circle cx="88" cy="93" r="8.4" fill="url(#coinG)" stroke="#9a6b0d" stroke-width="1.2"/>
    <text x="88" y="97.2" font-size="10.2" text-anchor="middle" fill="#7a5205" font-family="Georgia,serif" font-weight="bold">$</text>
  </svg>`;
}
function duckMedallionSVG() {
  let rays = '';
  for (let a = 0; a < 360; a += 30) rays += `<path d="M60 60 L55.5 7 L64.5 7 Z" fill="#ffffff" opacity=".10" transform="rotate(${a} 60 60)"/>`;
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="56" fill="url(#medBg)"/>
    ${rays}
    <g transform="translate(4,3) scale(0.93)">${duckFaceSVG().replace(/<\/?svg[^>]*>/g, '')}</g>
    <circle cx="60" cy="60" r="56.5" fill="none" stroke="#8a6d1f" stroke-width="5.5"/>
    <circle cx="60" cy="60" r="52.8" fill="none" stroke="#e8c85a" stroke-width="1.8"/>
  </svg>`;
}
function gemSVG() {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <polygon points="50,4 88,34 50,96 12,34" fill="url(#gemG)" stroke="#1d6f9e" stroke-width="3"/>
    <polygon points="50,4 70,34 50,96 30,34" fill="#ffffff" opacity=".28"/>
    <polyline points="12,34 88,34" stroke="#eaf9ff" stroke-width="2.4" fill="none"/>
    <polyline points="30,34 50,4 70,34" stroke="#eaf9ff" stroke-width="1.8" fill="none"/>
  </svg>`;
}
function coinPileSVG() {
  return `<svg class="coinPile" viewBox="0 0 100 44" aria-hidden="true">
    <rect x="56" y="2" width="34" height="17" rx="2.5" fill="#3f9e4d" stroke="#1d6b41" stroke-width="1.6" transform="rotate(9 73 10)"/>
    <text x="73" y="15.5" font-size="11.5" text-anchor="middle" fill="#d9f2dc" font-family="Georgia,serif" font-weight="bold" transform="rotate(9 73 10)">$</text>
    <g fill="url(#coinG)" stroke="#9a6b0d" stroke-width="1.3">
      <ellipse cx="24" cy="36" rx="15" ry="5.2"/><ellipse cx="24" cy="30.5" rx="15" ry="5.2"/><ellipse cx="24" cy="25" rx="15" ry="5.2"/>
      <ellipse cx="52" cy="38" rx="14" ry="4.8"/><ellipse cx="52" cy="33" rx="14" ry="4.8"/>
      <ellipse cx="76" cy="39" rx="13" ry="4.5"/><ellipse cx="38" cy="40" rx="12" ry="4.2"/><ellipse cx="64" cy="42" rx="11" ry="4"/>
    </g>
  </svg>`;
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
$('marqueeDuck').innerHTML = duckMedallionSVG();
$('billDuck').innerHTML = duckFaceSVG();
$('redBillDuck').innerHTML = duckFaceSVG();
document.querySelectorAll('.badgeDuck').forEach(el => { el.innerHTML = duckMedallionSVG(); el.style.display = 'block'; el.style.width = '24px'; el.style.height = '24px'; el.firstChild.style.width = '100%'; });

function symHTML(sym) {
  switch (sym) {
    case 'DUCK': return `<div class="sym"><div class="duckMedal">${duckMedallionSVG()}</div><div class="duckLogoText">LUCKY DUCKY</div></div>`;
    case 'SEVEN': return `<div class="sym"><div class="sevenWrap"><div class="sevenRed">7<span class="emboss">$</span></div>${coinPileSVG()}</div></div>`;
    case 'BAR3': return `<div class="sym"><div class="bar"><small>BAR</small><small>BAR</small><small>BAR</small></div></div>`;
    case 'BAR2': return `<div class="sym"><div class="bar"><small>BAR</small><small>BAR</small></div></div>`;
    case 'BAR1': return `<div class="sym"><div class="bar">BAR</div></div>`;
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
let save = { cash: 1000, progressive: 250000, sound: true, jewels: 0 };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s.cash === 'number') save = Object.assign(save, s); } catch (e) {}
soundOn = save.sound !== false;
let coinsBet = 3, busy = false, sessionPaid = 0;
const state = { cash: save.cash, progressive: save.progressive, lastWon: 0, jewels: Math.min(L.JEWELS_TO_TRIGGER - 1, Math.max(0, save.jewels | 0)) };
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

/* ---------------- bingo game (continuous live call) ---------------- */
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
/* pattern banner + mini diagram; idle = attract cycle like the floor machine */
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

/* ---------------- reels ---------------- */
/* Measure a rendered symbol: getComputedStyle returns the --cell clamp()
   UNRESOLVED, and parseFloat of it is NaN — that silently killed every reel
   transform in the first v2 pass. The rendered height is the truth. */
const CELL_H = () => { const s = document.querySelector('#reel0 .strip .sym'); return s ? s.getBoundingClientRect().height : 100; };
const reelEls = [$('reel0'), $('reel1'), $('reel2')];
const strips = [];
reelEls.forEach((el, ri) => {
  const strip = document.createElement('div');
  strip.className = 'strip';
  let html = '';
  for (let rep = 0; rep < 3; rep++) for (const s of L.STRIPS[ri]) html += symHTML(s);
  strip.innerHTML = html;
  el.appendChild(strip);
  strips.push({ el: strip, pos: 0 }); // pos = stop index at payline
});
function setReelInstant(ri, stopIdx) {
  const st = strips[ri], h = CELL_H();
  const m = stopIdx + 22; // middle repetition: cell m sits on the payline row
  st.el.style.transform = `translateY(${-(m - 1) * h}px)`;
  st.pos = stopIdx;
}
reelEls.forEach((_, ri) => setReelInstant(ri, 3 + ri * 5));
function spinReelTo(ri, stopIdx, dur) {
  return new Promise(res => {
    const st = strips[ri], h = CELL_H();
    const stripLen = L.STRIPS[ri].length;
    let cur = st.pos;
    const candidates = [stopIdx, stopIdx + stripLen, stopIdx + stripLen * 2].filter(p => p > cur + 8);
    const finalPos = candidates.length ? candidates[0] : stopIdx + stripLen * 2;
    const fromY = -(cur + stripLen - 1) * h;
    const toY = -(finalPos + stripLen - 1) * h;
    st.el.classList.add('spinning');
    const anim = st.el.animate(
      [{ transform: `translateY(${fromY}px)` }, { transform: `translateY(${toY}px)` }],
      { duration: dur, easing: 'cubic-bezier(.15,.55,.25,1)', fill: 'forwards' }
    );
    const tickInt = setInterval(tickSnd, 58);
    anim.onfinish = () => {
      try { anim.commitStyles(); anim.cancel(); } catch (e) {}
      clearInterval(tickInt);
      st.el.classList.remove('spinning');
      st.pos = ((finalPos % stripLen) + stripLen) % stripLen;
      setReelInstant(ri, st.pos);
      thunk();
      res();
    };
  });
}

/* ---------------- meters / messages ---------------- */
const fmt$ = n => '$' + Math.floor(n).toLocaleString('en-US');
function renderMeters(won, paid) {
  $('mBet').textContent = coinsBet;
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

/* ---------------- the spin ---------------- */
async function doSpin(isRed, minPay) {
  const tier = isRed ? L.pickTierAtLeast(minPay, coinsBet, rng) : L.pickTier(rng);
  const combo = L.comboForTier(tier, rng);
  dealCard(tier);
  const stops = combo.map((s, ri) => L.stopFor(ri, s, rng));
  banner(null);
  await Promise.all([
    spinReelTo(0, stops[0], 950),
    spinReelTo(1, stops[1], 1250),
    spinReelTo(2, stops[2], 1550)
  ]);
  let pay = L.payFor(tier, coinsBet);
  let jackpot = false;
  if (tier === 'DUCK' && coinsBet === 3) { pay = Math.floor(state.progressive); jackpot = true; }
  return { tier, pay, jackpot, combo };
}

async function playSpin() {
  if (busy) return;
  if (state.cash < coinsBet) { msg('OUT OF CASH — TAP + $1,000 CASH'); return; }
  busy = true; document.body.dataset.busy = '1'; stopAttract(); renderMeters();
  state.cash -= coinsBet;
  state.progressive += coinsBet * 0.01;
  sessionPaid = 0; state.lastWon = 0;
  renderMeters(0, 0);
  msg('GOOD LUCK!');

  let { tier, pay, jackpot, combo } = await doSpin(false, 0);
  let totalWon = 0;

  /* jewel collection — one jewel per duck on the payline (reconstructed) */
  const ducks = combo.filter(s => s === 'DUCK').length;
  let huntPending = false;
  if (ducks > 0) {
    const before = state.jewels;
    state.jewels = Math.min(L.JEWELS_TO_TRIGGER, state.jewels + ducks);
    renderJewels(before);
    gemSnd();
    if (state.jewels >= L.JEWELS_TO_TRIGGER) { huntPending = true; msg('JEWEL HUNT! TEN JEWELS COLLECTED!'); }
    else msg(`${ducks} JEWEL${ducks === 1 ? '' : 'S'} COLLECTED — ${state.jewels} OF 10!`);
    persist();
    await wait(650);
  }

  if (pay > 0) {
    totalWon += pay;
    banner('win', jackpot ? 'JACKPOT!' : 'WINNER!');
    jingle(pay >= 100 || jackpot); if (tier === 'DUCK') quack();
    msg(jackpot ? `3 DUCKS — PROGRESSIVE ${fmt$(pay)}!` : `${nameOf(tier)} PAYS ${pay}`);
    await countUp(pay, pay >= 100 ? 1500 : 700);
    if (jackpot) { state.progressive = 250000; }
    sessionPaid = totalWon; state.lastWon = totalWon; renderMeters(totalWon, sessionPaid);

    /* red screen family — the top screen floods red, BARs glow (floor still) */
    let chain = 0, triggerPay = pay;
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
      if (chain === 1 && rng() < L.PICK_CHANCE) {
        document.body.classList.remove('redspin'); $('screen').classList.remove('redflood');
        await pickADuck(triggerPay); break;
      }
      msg(`RED SCREEN RE-SPIN ${chain}!`);
      const r = await doSpin(true, triggerPay);
      totalWon += r.pay; triggerPay = r.pay;
      banner('win', 'WINNER!'); jingle(r.pay >= 100 || r.jackpot); if (r.tier === 'DUCK') quack();
      msg(`RE-SPIN ${nameOf(r.tier)} PAYS ${r.pay}`);
      await countUp(r.pay, r.pay >= 100 ? 1400 : 650);
      if (r.jackpot) state.progressive = 250000;
      sessionPaid = totalWon; state.lastWon = totalWon; renderMeters(totalWon, sessionPaid);
      document.body.classList.remove('redspin'); $('screen').classList.remove('redflood');
    }
  } else {
    banner('over', 'GAME OVER');
    if (!huntPending && ducks === 0) msg('NO WIN — SPIN AGAIN');
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
function nameOf(tier) {
  return { DUCK: '3 DUCKS', SEVEN: '3 SEVENS', BAR3: '3 TRIPLE BARS', BAR2: '3 DOUBLE BARS', BAR1: '3 BARS', ANYBAR: 'ANY BARS', CHERRY3: '3 CHERRIES', CHERRY2: '2 CHERRIES', CHERRY1: 'A CHERRY' }[tier] || '';
}
const wait = ms => new Promise(r => setTimeout(r, ms));

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
      b.innerHTML = `<span class="ripple"></span>` + duckFaceSVG() + `<div class="amt">$${prize}</div>`;
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
$('betOneBtn').onclick = () => { if (busy) return; coinsBet = coinsBet % 3 + 1; beep(880, .05, 'square', .05); renderMeters(); msg(`BET ${coinsBet} — SPIN WHEN READY`); };
$('betMaxBtn').onclick = () => { if (busy) return; coinsBet = 3; beep(880, .05, 'square', .05); beep(1174, .06, 'square', .05, .06); renderMeters(); msg('MAX BET 3 — SPIN WHEN READY'); };
$('spinBtn').onclick = () => { ac(); playSpin(); };
$('paysBtn').onclick = () => { $('paySheet').classList.toggle('open'); };
$('soundBtn').onclick = () => { soundOn = !soundOn; $('soundBtn').textContent = soundOn ? 'SOUND ON' : 'SOUND OFF'; persist(); };
$('refillBtn').onclick = () => { if (busy) return; state.cash += 1000; jingle(false); renderMeters(); persist(); msg('$1,000 CASH ADDED — GOOD LUCK!'); };
$('soundBtn').textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';

/* paytable sheet */
(function buildPaytable() {
  const rows = [
    ['3 DUCKS', 'DUCK', true], ['3 SEVENS', 'SEVEN'], ['3 TRIPLE BARS', 'BAR3'],
    ['3 DOUBLE BARS', 'BAR2'], ['3 BARS', 'BAR1'], ['ANY 3 BARS', 'ANYBAR'],
    ['3 CHERRIES', 'CHERRY3'], ['2 CHERRIES', 'CHERRY2'], ['1 CHERRY', 'CHERRY1']
  ];
  $('payTable').innerHTML = '<tr><th>LINE PAYS</th><th>1 COIN</th><th>2 COINS</th><th>3 COINS</th></tr>' +
    rows.map(([label, tier, top]) => `<tr class="${top ? 'top' : ''}"><td>${label}</td><td>${L.PAYTABLE[tier][0].toLocaleString()}</td><td>${L.PAYTABLE[tier][1].toLocaleString()}</td><td>${L.PAYTABLE[tier][2].toLocaleString()}</td></tr>`).join('');
})();

/* boot */
startBingoGame();
dealCard(null);
renderMeters(0, 0);
renderJewels(-1);
setPattern(ATTRACT[0], null);
startAttract();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
