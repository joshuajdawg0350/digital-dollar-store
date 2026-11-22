/* Lucky Duck — personal machine UI/engine. Presentation cloned from the VGT
   Lucky Ducky $1 floor machine (Downstream Casino): bingo screen on top,
   three mechanical reels below, BET 1 / SPIN-CASH OUT / BET 3 deck,
   BET·WON·PAID·CASH meters, Red Screen re-spins, Pick a Duck.
   All art drawn in code; all sounds synthesized. Play credits only. */
'use strict';
const L = window.LuckyLogic;
const $ = id => document.getElementById(id);
const rng = Math.random;

/* ---------------- our drawn art (in the original's likeness) ---------------- */
function duckSVG(cls, withHat) {
  return `<svg class="${cls || ''}" viewBox="0 0 100 84" aria-hidden="true">
    ${withHat ? '<rect x="34" y="2" width="34" height="7" rx="3" fill="#191919"/><rect x="41" y="-6" width="20" height="12" rx="2" fill="#232323" transform="translate(0,6)"/><rect x="41" y="12" width="20" height="4" fill="#c8102e"/>' : ''}
    <ellipse cx="46" cy="56" rx="34" ry="22" fill="#ffd21f"/>
    <ellipse cx="46" cy="60" rx="30" ry="17" fill="#ffda3d"/>
    <path d="M14 52 Q2 44 8 34 Q18 40 20 48 Z" fill="#f4b400"/>
    <circle cx="72" cy="34" r="16" fill="#ffd21f"/>
    <ellipse cx="86" cy="38" rx="9" ry="5.5" fill="#ff8a00"/>
    <circle cx="76" cy="31" r="2.6" fill="#191919"/>
    <path d="M30 50 Q46 40 62 50 Q46 56 30 50Z" fill="#f4b400" opacity=".65"/>
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
$('marqueeDuck').innerHTML = duckSVG('', true);

function symHTML(sym, reelIdx) {
  switch (sym) {
    case 'DUCK': return `<div class="sym">${duckSVG('duckSym', true)}<div class="duckWord">LUCKY DUCKY</div></div>`;
    case 'SEVEN': return `<div class="sym"><div class="seven ${reelIdx === 1 ? 'blue' : 'red'}">7</div></div>`;
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

/* ---------------- state ---------------- */
const SAVE_KEY = 'luckyDuckPersonalV1';
let save = { cash: 1000, progressive: 250000, sound: true };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s.cash === 'number') save = s; } catch (e) {}
soundOn = save.sound !== false;
let coinsBet = 3, busy = false, sessionPaid = 0;
function persist() { save.cash = state.cash; save.progressive = state.progressive; save.sound = soundOn; try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const state = { cash: save.cash, progressive: save.progressive, lastWon: 0 };

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
function renderGameState() { $('gameState').textContent = `GAME ${bingo.gameNo} · ${bingo.called.length + 38}/75`; }
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
  // daub gold pattern cells with a stagger, like the floor display lighting up
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
  const name = pat ? pat.name : '—';
  $('patternName').textContent = tier ? `PATTERN: ${name}` : name;
  const cells = pat ? pat.cells : null;
  $('patternGrid').innerHTML = Array.from({ length: 25 }, (_, i) => `<i class="${cells && cells.includes(i) ? 'on' : ''}"></i>`).join('');
}
function startAttract() {
  stopAttract();
  attractTimer = setInterval(() => { if (!busy) { setPattern(ATTRACT[attractIdx % ATTRACT.length], null); attractIdx++; } }, 3400);
}
function stopAttract() { if (attractTimer) clearInterval(attractTimer); attractTimer = null; }

/* ---------------- reels ---------------- */
const CELL_H = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell'));
const reelEls = [$('reel0'), $('reel1'), $('reel2')];
const strips = [];
reelEls.forEach((el, ri) => {
  const strip = document.createElement('div');
  strip.className = 'strip';
  let html = '';
  for (let rep = 0; rep < 3; rep++) for (const s of L.STRIPS[ri]) html += symHTML(s, ri);
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
    // target in the third repetition so motion is always forward (downward roll)
    let cur = st.pos;
    // land on the next position (mod strip) that is > cur + 8, within our
    // 3 rendered repetitions (absolute index <= 44 keeps the window covered)
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
  return { tier, pay, jackpot };
}

async function playSpin() {
  if (busy) return;
  if (state.cash < coinsBet) { msg('OUT OF CASH — TAP + $1,000 CASH'); return; }
  busy = true; document.body.dataset.busy = '1'; stopAttract(); renderMeters();
  state.cash -= coinsBet;
  state.progressive += coinsBet * 0.01;
  sessionPaid = 0; state.lastWon = 0;
  renderMeters(0, 0);
  msg(isRedMsg());
  function isRedMsg() { return 'GOOD LUCK!'; }

  let { tier, pay, jackpot } = await doSpin(false, 0);
  let totalWon = 0;
  if (pay > 0) {
    totalWon += pay;
    banner('win', jackpot ? 'JACKPOT!' : 'WINNER!');
    jingle(pay >= 100 || jackpot); if (tier === 'DUCK') quack();
    msg(jackpot ? `3 DUCKS — PROGRESSIVE ${fmt$(pay)}!` : `${nameOf(tier)} PAYS ${pay}`);
    await countUp(pay, pay >= 100 ? 1500 : 700);
    if (jackpot) { state.progressive = 250000; }
    sessionPaid = totalWon; state.lastWon = totalWon; renderMeters(totalWon, sessionPaid);

    /* red screen family */
    let chain = 0, triggerPay = pay;
    while (chain < L.RED_MAX && rng() < (chain === 0 ? L.RED_CHANCE : L.RED_CHAIN_CHANCE)) {
      chain++;
      $('redSub').textContent = chain > 1 ? `RE-SPIN ${chain} — STILL GUARANTEED` : 'GUARANTEED WIN — NO CHARGE';
      $('redFlash').classList.add('on'); siren();
      await wait(1250);
      $('redFlash').classList.remove('on');
      if (chain === 1 && rng() < L.PICK_CHANCE) { await pickADuck(triggerPay); break; }
      msg(`RED SCREEN RE-SPIN ${chain}!`);
      const r = await doSpin(true, triggerPay);
      totalWon += r.pay; triggerPay = r.pay;
      banner('win', 'WINNER!'); jingle(r.pay >= 100 || r.jackpot); if (r.tier === 'DUCK') quack();
      msg(`RE-SPIN ${nameOf(r.tier)} PAYS ${r.pay}`);
      await countUp(r.pay, r.pay >= 100 ? 1400 : 650);
      if (r.jackpot) state.progressive = 250000;
      sessionPaid = totalWon; state.lastWon = totalWon; renderMeters(totalWon, sessionPaid);
    }
  } else {
    banner('over', 'GAME OVER');
    msg('NO WIN — SPIN AGAIN');
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
      b.innerHTML = duckSVG('', false) + `<div class="amt">$${prize}</div>`;
      b.setAttribute('aria-label', 'Pick this duck');
      b.onclick = async () => {
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
setPattern(ATTRACT[0], null);
startAttract();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
