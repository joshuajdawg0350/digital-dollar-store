/* Hustle City Slots — Poker Luxe · cabinet UI.
   Grown-up rebuild 2026-11-21 around generated luxury poker-room art.
   Engine (logic.js) + strips/paytable/wheel (machines.js): 5x3, 20 paylines,
   weighted strips, WILD substitutes, X2/X3 line multipliers, SCATTER free
   spins, BONUS tokens on reels 2-4 opening the BONUS WHEEL (about 1 spin
   in 40), NO blank stops (every reel position is a real symbol),
   RTP 98% theoretical (Joshua's settled target, 2026-11-21).
   Reels spin on a physics curve: spin-up, blur at speed, staggered stops
   left-to-right, settle bounce — with a mechanical rolling sound that
   tracks the motion. SPIN becomes STOP while the reels turn. Pull arm +
   SPIN button fire the same spin — and both spin the Bonus Wheel when it
   is open. Max bet climbs in tiers as the balance grows. Play credits only.
   (c) 2026 J-Dawgs Industries. */
'use strict';
(function () {
  const core = window.SlotCore;
  const cfg = window.SlotMachines.LUXE;
  const LS_KEY = 'hcslots-luxe-v1';

  const ART = {
    AC: 'assets/sym-ac.webp', KG: 'assets/sym-kg.webp', QN: 'assets/sym-qn.webp',
    JK: 'assets/sym-jk.webp', DM: 'assets/sym-dm.webp', CP: 'assets/sym-cp.webp',
    CG: 'assets/sym-cg.webp', DK: 'assets/sym-dk.webp', WD: 'assets/sym-wd.webp',
    SC: 'assets/sym-sc.webp', BN: 'assets/sym-bn.webp',
    X2: 'assets/sym-x2.webp', X3: 'assets/sym-x3.webp'
  };
  const NAMES = {
    AC: 'Ace of Spades', KG: 'King', QN: 'Queen', JK: 'Jack', DM: 'Diamond',
    CP: 'Poker Chips', CG: 'Champagne', DK: 'Dice', WD: 'WILD', SC: 'SCATTER',
    BN: 'BONUS', X2: 'WIN ×2', X3: 'WIN ×3'
  };

  const $ = id => document.getElementById(id);
  const reelsEl = [$('reel0'), $('reel1'), $('reel2'), $('reel3'), $('reel4')];
  const creditsEl = $('credits'), betEl = $('bet'), winEl = $('win'), msgEl = $('msg');
  const spinBtn = $('spinBtn'), betDownBtn = $('betDownBtn'), betUpBtn = $('betUpBtn'), maxBetBtn = $('maxBetBtn');
  const celebEl = $('celeb'), celebKickEl = $('celebKick'), celebTitleEl = $('celebTitle'), celebSubEl = $('celebSub');
  const spinFace = spinBtn.querySelector('.spin-face');
  const fsBanner = $('fsBanner'), newGameBtn = $('newGameBtn'), soundBtn = $('soundBtn');
  const maxBetLineEl = $('maxBetLine');
  const soundStateEl = $('soundState'), winFlash = $('winFlash');
  const paySheet = $('paySheet'), sheetBackdrop = $('sheetBackdrop');
  const bonusOverlay = $('bonusOverlay'), wheelEl = $('wheel'), bonusMsg = $('bonusMsg');
  const wheelPointer = $('wheelPointer');

  let credits = 1000, spinning = false;
  let freeSpinsLeft = 0, freeSpinTotal = 0, soundOn = true;
  let stops = [4, 9, 2, 14, 7];

  /* ---------- bet ladder (Joshua, 2026-11-21 13:02 CT) ----------
     The bet is a TOTAL bet per spin in $25 steps — 25, 50, 75 … up to
     2,500. A step unlocks the first time the player's PEAK balance
     reaches it and stays unlocked even if the balance dips (sticky);
     only NEW GAME resets it. Internally the engine still bets per
     line: line bet = total ÷ 20 lines (fractional is fine — payouts
     scale linearly, wins are rounded to whole credits when paid, so
     RTP is unchanged at every step). */
  const BET_STEP = 25, BET_MIN = 25, BET_MAX = 2500;
  let betSel = BET_MIN, peak = 1000, lastUnlocked = BET_MIN, tierUpMsg = null;
  function unlockedMax() { return Math.max(BET_MIN, Math.min(BET_MAX, Math.floor(peak / BET_STEP) * BET_STEP)); }
  function notePeak() {
    if (credits > peak) peak = credits;
    const um = unlockedMax();
    if (um > lastUnlocked) {
      lastUnlocked = um;
      tierUpMsg = `★ NEW MAX BET! Your balance peak hit ${fmt(peak)} — you can now bet up to ${fmt(um)} a spin! ★`;
      save();
    }
    if (betSel > um) betSel = um;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved && typeof saved.credits === 'number') credits = saved.credits;
    if (saved && typeof saved.sound === 'boolean') soundOn = saved.sound;
    if (saved && typeof saved.peak === 'number') peak = saved.peak;
    if (saved && typeof saved.bet === 'number') betSel = Math.min(BET_MAX, Math.max(BET_MIN, Math.round(saved.bet / BET_STEP) * BET_STEP));
  } catch (e) { /* restricted webview: play without persistence */ }
  if (peak < credits) peak = credits;
  if (betSel > unlockedMax()) betSel = unlockedMax();
  lastUnlocked = unlockedMax();

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ credits, sound: soundOn, peak, bet: betSel })); } catch (e) {}
  }
  function fmt(n) { return n.toLocaleString('en-US'); }
  function totalBet() { return betSel; }
  function lineBet() { return betSel / core.PAYLINES.length; }

  /* ---------- audio (WebAudio, no assets) ---------- */
  let actx = null;
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  /* Win / bonus / bust audio comes from the SHARED Hustle City sound kit
     (soundkit.js — real recordings + physical-model bell/coin models;
     Joshua 2026-11-21: "real slot machines dings and bells. Not this
     ghetto default stuff"). The old square/triangle oscillator jingles
     are GONE. Only the mechanical reel bed below stays WebAudio. */
  const Kit = window.SlotKit;
  Kit.init(ac, () => soundOn);
  /* ---------- mechanical reel sound (Joshua, 2026-11-21) ----------
     The reels ROLL — no digital beeps, and after his ear test killed
     the modeled kit, no noise buffers either: the shared kit's
     reel-roll loop is a REAL slot machine's reels, its rate and level
     tracking the reels' actual speed (rises on spin-up, rolls through
     cruise, falls as reels brake). The clatter is the kit's real
     prize-wheel peg click, scheduled from the reels' real travel —
     one click per tooth pitch, rate-jittered like a real mechanism —
     so it ticks down naturally as each reel lands, and cuts dead when
     STOP slams the reels home. Reel landings are the kit's real clunk. */
  function clack(intensity) {
    if (!soundOn) return;
    Kit.play('peg', { group: 'peg', gain: 0.25 + 0.55 * (intensity || 0.5), rate: 0.92 + Math.random() * 0.18 });
  }
  function thunk() {
    if (!soundOn) return;
    Kit.thunk();
  }
  function startRollSound() {
    if (!soundOn) return;
    Kit.rollStart();
  }
  function rollLevel(speedNorm) {
    Kit.rollSpeed(speedNorm);
  }
  function stopRollSound(quick) {
    Kit.rollStop(quick);
  }
  const sTick = () => Kit.click();
  const sPeg = () => Kit.peg();
  const sStop = () => Kit.thunk();

  /* ---------- reel rendering (generated art cells) ---------- */
  function cellHTML(sym, h) {
    return `<div class="cell" data-sym="${sym}" style="height:${h}px"><img src="${ART[sym]}" alt="${NAMES[sym]}" draggable="false"></div>`;
  }
  function cellH(r) { return reelsEl[r].clientHeight / 3; }
  function showWindow() {
    const grid = core.windowForStops(cfg.strips, stops);
    for (let r = 0; r < 5; r++) {
      const h = cellH(r);
      reelsEl[r].innerHTML = '<div class="track">' + grid[r].map(s => cellHTML(s, h)).join('') + '</div>';
    }
    return grid;
  }
  function clearWinMarks() {
    document.querySelectorAll('.cell.win,.cell.scatterhit,.cell.bonushit').forEach(c => c.classList.remove('win', 'scatterhit', 'bonushit'));
    winFlash.classList.remove('on');
  }
  function markCell(reel, row, cls) {
    const track = reelsEl[reel].firstElementChild;
    if (track && track.children[row]) track.children[row].classList.add(cls);
  }

  /* STOP control (Joshua, 2026-11-21): while the reels turn, SPIN becomes
     STOP. Tapping it brakes every spinning reel fast — a hair of stagger,
     left to right — onto its dealt stop (the same final window a full
     spin would land on); the roll sound ticks down with the braking
     instead of cutting, each reel's thunk fires at its real landing,
     and payouts evaluate from those dealt stops exactly as an
     unstopped spin. */
  let activeReelFinishes = [null, null, null, null, null];
  let stopRequested = false;
  const clatterAcc = [0, 0, 0, 0, 0];
  function requestStop() {
    if (!spinning || stopRequested) return;
    stopRequested = true;
    /* the roll bed is NOT cut here: the braking reels keep driving
       rollLevel() down as they slow, and the spin flow's own
       stopRollSound(false) fades the bed once the last reel lands */
    for (const f of activeReelFinishes) if (f) f();
  }

  /* Physics-curve reel spin: smoothstep velocity profile (spin-up, fast
     middle, gentle arrival), motion blur while the reel is moving fast,
     and a small settle bounce when it locks. Reels stop left to right
     because each reel's duration is longer than the one before it. The
     rolling sound and tooth clatter are driven from this same motion. */
  /* Peak reel speed — Joshua, 2026-11-21: "spin the wheels 20 times
     faster." The old build's smoothstep curve peaked at ~1,597 px/s at
     a 59px cell (27.1 symbols/sec), so every reel now cruises at 20x
     that: 541.4 symbols/sec. Distance grows with the speed — the spin
     keeps its ~2-2.5s shape, the strip just travels ~20x farther. */
  const PEAK_SYM_PER_SEC = 541.4;
  function spinReel(r, finalStops, duration) {
    return new Promise(resolve => {
      const reel = reelsEl[r], H = cellH(r), strip = cfg.strips[r];
      const grid = core.windowForStops(cfg.strips, finalStops);

      const len = strip.length;
      const vmax = PEAK_SYM_PER_SEC * H;   /* this machine's 20x peak, px/s */
      let N = Math.max(24, Math.round(core.reelDistance(vmax, H, duration) / H));
      N += ((finalStops[r] - stops[r] - N) % len + len) % len;  /* land exactly on the dealt stop */
      const D = N * H;                     /* total travel, px */
      /* Recycling strip renderer: at 20x speed a spin travels hundreds
         of cells — far past mobile layer limits if built as one tall
         track. Only K cells live in the DOM; their symbols rotate as the
         strip passes, exactly like a real reel band looping its drum.
         The walk is the machine's own strip, continuous from the resting
         window to the dealt window (guard cell first, for the settle). */
      const K = 8;
      const seq = new Array(N + K + 2);
      for (let i = 0; i < seq.length; i++) seq[i] = strip[(((stops[r] + i - 1) % len) + len) % len];
      const track = document.createElement('div');
      track.className = 'track';
      track.innerHTML = seq.slice(0, K).map(s => cellHTML(s, H)).join('');
      reel.innerHTML = '';
      reel.appendChild(track);
      const cellDivs = [...track.children];
      const cellImgs = cellDivs.map(c => c.querySelector('img'));
      const shown = seq.slice(0, K);
      let shownBase = 0;
      const motion = core.createReelMotion(D, H, duration, vmax);
      let finished = false, stopTimer = null;
      let last = performance.now(), lastP = 0, lastClack = 0, lastBlur = -1;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(hardStop);
        if (stopTimer) clearTimeout(stopTimer);
        activeReelFinishes[r] = null;
        track.style.filter = '';
        track.style.transform = 'translateY(0px)';
        track.innerHTML = grid[r].map(s => cellHTML(s, H)).join('');
        sStop();
        resolve();
      };
      /* STOP: brake this reel (staggered a hair by reel order) — the
         motion lands it on the same dealt stop through the same settle;
         the timer is only a failsafe if the brake ever failed to land.
         The roll bed is NOT hard-cut: braking reels keep driving
         rollLevel down, and the spin flow fades the bed after landing. */
      activeReelFinishes[r] = () => {
        if (finished || stopTimer) return;
        motion.brake(r * 0.05);
        stopTimer = setTimeout(finish, 1400);
      };
      const hardStop = setTimeout(finish, duration + 1600);
      function frame(now) {
        if (finished) return;
        const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
        last = now;
        const { p, v, done } = motion.step(dt);
        if (done) { finish(); return; }
        /* rolling sound follows this reel's motion; clatter per tooth pitch */
        rollLevel(Math.min(1, v / motion.vmax));
        clatterAcc[r] += p - lastP;
        lastP = p;
        if (clatterAcc[r] >= H * 0.75 && now - lastClack >= 28) {
          clatterAcc[r] = 0;
          lastClack = now;
          if (v > motion.vmax * 0.08) clack(Math.min(1, v / motion.vmax));
        }

        const base = Math.max(0, Math.min(N, Math.floor(p / H)));
        if (base !== shownBase) {
          shownBase = base;
          for (let j = 0; j < K; j++) {
            const code = seq[base + j];
            if (shown[j] !== code) {
              shown[j] = code;
              cellDivs[j].dataset.sym = code;
              cellImgs[j].src = ART[code];
              cellImgs[j].alt = NAMES[code];
            }
          }
        }
        track.style.transform = `translateY(${-(p - base * H) - H}px)`;
        /* photographic, speed-proportional blur: the smear grows with
           the distance travelled per frame, capped so the strip still
           reads as symbols in motion, never a digital smear */
        const blurPx = Math.min(14, (v / 60) * 0.3);
        if (Math.abs(blurPx - lastBlur) >= 0.75 || (blurPx < 0.05 && lastBlur >= 0.05)) {
          lastBlur = blurPx;
          track.style.filter = blurPx >= 0.05 ? `blur(${blurPx.toFixed(1)}px) brightness(1.07) saturate(1.12)` : '';
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  /* ---------- readouts / controls ---------- */
  function updateMaxBetLine() {
    if (!maxBetLineEl) return;
    const um = unlockedMax();
    maxBetLineEl.innerHTML = um < BET_MAX
      ? `MAX BET <b>${fmt(um)}</b> · ${fmt(um + BET_STEP)} UNLOCKS AT ${fmt(um + BET_STEP)} BALANCE`
      : `MAX BET <b>${fmt(um)}</b> · TOP BET UNLOCKED`;
    renderBet();
  }
  function renderBet() {
    betDownBtn.disabled = !controlsOn || betSel <= BET_MIN;
    betUpBtn.disabled = !controlsOn || betSel >= unlockedMax();
    maxBetBtn.disabled = !controlsOn;
  }
  function renderReadouts(winVal) {
    creditsEl.textContent = fmt(credits);
    betEl.textContent = fmt(totalBet());
    if (typeof winVal === 'number') winEl.textContent = fmt(winVal);
    /* NEW GAME shows whenever the balance can't cover the current bet */
    newGameBtn.classList.toggle('on', credits < totalBet());
    updateMaxBetLine();
  }
  let controlsOn = true;
  function setControlsEnabled(on) {
    /* The SPIN button never disables: while the reels turn it is the STOP
       button (and while the Bonus Wheel is armed it fires the wheel —
       runBonusWheel manages that state itself). */
    controlsOn = on;
    window.__busy = !on;
    renderBet();
    spinBtn.classList.toggle('stopping', !on);
    spinFace.textContent = on ? 'SPIN' : 'STOP';
    spinBtn.setAttribute('aria-label', on ? 'Spin the reels' : 'Stop the reels');
    const lv = $('lever');
    if (lv) { lv.classList.toggle('off', !on); lv.setAttribute('aria-disabled', String(!on)); }
  }
  function countUp(el, from, to, dur) {
    return new Promise(res => {
      if (to <= from) { el.textContent = fmt(to); res(); return; }
      const t0 = performance.now();
      let lastTick = 0;
      (function step(t) {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(Math.round(from + (to - from) * p));
        /* credit-meter ticking synced to the on-screen roll (kit) */
        if (t - lastTick >= 45) { lastTick = t; Kit.countTick(); }
        if (p < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }
  function buildPaytable() {
    const rows = Object.keys(cfg.paytable)
      .sort((a, b) => cfg.paytable[b][5] - cfg.paytable[a][5])
      .map(sym => {
        const t = cfg.paytable[sym];
        const cell = n => t[n] ? `<span class="pv">${n}× <b>${fmt(Math.round(t[n] * lineBet()))}</b></span>` : '<span class="pv"></span>';
        const cells = sym === 'CP'
          ? `<span class="pv">2× <b>${fmt(Math.round(t[2] * lineBet()))}</b></span>${cell(3)}${cell(4)}`
          : (t[5] ? `${cell(3)}${cell(4)}${cell(5)}` : `${cell(3)}${cell(4)}<span class="pv"></span>`);
        return `<div class="payrow"><div class="thumb"><img src="${ART[sym]}" alt="${NAMES[sym]}"></div><div class="nm">${NAMES[sym]}</div>${cells}</div>`;
      }).join('');
    $('payrows').innerHTML = rows +
      `<div class="payrow"><div class="thumb"><img src="${ART.WD}" alt="WILD"></div><div class="nm">WILD</div><span class="pv wide">Substitutes for every symbol except SCATTER</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X2}" alt="WIN ×2"></div><div class="nm">WIN ×2</div><span class="pv wide">Anywhere on a winning line, this line's win is DOUBLED (×2)</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X3}" alt="WIN ×3"></div><div class="nm">WIN ×3</div><span class="pv wide">Anywhere on a winning line, this line's win is TRIPLED (×3). Two multipliers on the same line multiply together — ×2 and ×3 pay ×6</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.SC}" alt="SCATTER"></div><div class="nm">SCATTER</div><span class="pv wide">3+ anywhere: pays 2× / 7× / 35× total bet + 7 / 10 / 15 FREE SPINS at 2× line wins</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.BN}" alt="BONUS"></div><div class="nm">BONUS WHEEL</div><span class="pv wide">BONUS tokens ride reels 2, 3 and 4 — when all three windows show one, the BONUS WHEEL opens: one spin, wedges pay × your total bet up to a ${Math.max(...cfg.wheel)}× JACKPOT (BANKRUPT pays nothing). The wheel lands about once every 40 spins</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.CP}" alt="BET"></div><div class="nm">BET</div><span class="pv wide">Bets run in $25 steps: $25, $50, $75 … all the way up to $2,500 a spin. A step unlocks the first time your balance reaches it — and stays unlocked even if your balance dips. Use the −25 / +25 buttons or MAX BET. NEW GAME resets you to a $25 bet</span></div>`;
  }

  /* ---------- paytable sheet ---------- */
  function openSheet() { paySheet.classList.add('on'); paySheet.setAttribute('aria-hidden', 'false'); sheetBackdrop.classList.add('on'); }
  function closeSheet() { paySheet.classList.remove('on'); paySheet.setAttribute('aria-hidden', 'true'); sheetBackdrop.classList.remove('on'); }
  $('payBtn').addEventListener('click', openSheet);
  $('sheetHandle').addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

  /* ---------- celebration screens (Joshua, 2026-11-21 12:52–12:54 CT) ----------
     A bonus or free-spins trigger NEVER cuts straight in: a full-cabinet
     celebration plays first (~3s, tap to skip ahead — never skips the
     prize itself). Input is locked by the overlay while it shows. */
  /* ---------- bonus celebration VIDEO (Joshua, 2026-11-21 19:34 CT) ----------
     Engine-Rev Jackpot (celebration-hc-5) is Luxe's bonus celebration:
     full-screen, the full 5.0s, tap-to-skip, its OWN audio unmuted (no
     sound-kit fanfare under it). The ★ BONUS ★ title rides as a separate
     overlay layer (assets/celeb-title.png) — TITLE HOLD: Joshua's graffiti
     pick swaps that one file when it lands. */
  const celebVideoEl = $('celebVideo'), celebVideoVid = $('celebVideoEl');
  function playBonusVideo() {
    return new Promise(res => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try { celebVideoVid.pause(); } catch (e) {}
        celebVideoEl.classList.remove('on');
        celebVideoEl.setAttribute('aria-hidden', 'true');
        celebVideoEl.removeEventListener('click', finish);
        celebVideoVid.removeEventListener('ended', finish);
        res();
      };
      celebVideoEl.classList.add('on');
      celebVideoEl.setAttribute('aria-hidden', 'false');
      celebVideoEl.addEventListener('click', finish);
      celebVideoVid.addEventListener('ended', finish);
      setTimeout(finish, 5600); /* safety net: the player is never trapped */
      try {
        celebVideoVid.currentTime = 0;
        celebVideoVid.muted = false;
        const p = celebVideoVid.play();
        if (p && p.catch) p.catch(() => {
          /* browser blocked unmuted playback: start muted rather than
             not at all; the overlay still shows the full celebration */
          celebVideoVid.muted = true;
          celebVideoVid.play().catch(() => {});
        });
      } catch (e) {}
    });
  }
  function celebrate(kind, title, sub, durMs) {
    if (kind === 'bonus') return playBonusVideo();
    return new Promise(res => {
      celebEl.className = 'celeb on k-' + kind;
      celebKickEl.textContent = kind === 'bonus' ? '★ BONUS ★' : '★ FREE SPINS ★';
      celebTitleEl.textContent = title;
      celebSubEl.textContent = sub || '';
      celebEl.setAttribute('aria-hidden', 'false');
      if (kind === 'bonus') Kit.fanfare(); else Kit.fsFlourish();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        celebEl.classList.remove('on');
        celebEl.setAttribute('aria-hidden', 'true');
        celebEl.removeEventListener('click', finish);
        res();
      };
      celebEl.addEventListener('click', finish);
      setTimeout(finish, durMs);
    });
  }
  function celebDur() { return 2600 + Math.min(900, totalBet() * 3); }

  /* ---------- BONUS WHEEL ----------
     The wedge layout comes straight from cfg.wheel (machines.js) — the same
     table the RTP simulator models. The winning wedge is drawn first, then
     the wheel is spun with real physics feel (fast launch, friction decay,
     peg ticks) so it settles exactly on that wedge under the pointer. */
  const WEDGES = cfg.wheel;
  const WSEG = 360 / WEDGES.length;
  let wheelBuilt = false, wheelAngle = 0, wheelSpinning = false, wheelArmed = null;

  function wedgeLabel(v) {
    if (v === 0) return 'BANKRUPT';
    if (v === Math.max(...WEDGES)) return 'JACKPOT';
    return '×' + v;
  }
  /* Wedge shading (2026-11-21 wheel realism rebuild): every wedge is a lit
     physical panel — light catches its leading edge and falls toward the
     trailing edge. Presentation only; wedge values and order untouched. */
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  function wedgeBase(v, i) {
    /* Joshua 2026-11-21: "No gold!" + wheel example #8 adopted — black
       leather wedges, two deep-red accent wedges (the two specials),
       chrome hardware. Palette: chrome, black, red. */
    if (v === 0) return '#7a0a18'; /* BANKRUPT: deepest red leather */
    if (v === Math.max(...WEDGES)) return '#c01430'; /* JACKPOT: rich lit red leather */
    return '#16191f'; /* standard wedges: black leather */
  }
  function buildWheel() {
    if (wheelBuilt) return;
    wheelBuilt = true;
    /* physical wheel dressing (2026-11-21 realism pass): separator grooves
       between wedges, a rim vignette, and a chrome peg at every boundary —
       all children of the wheel so they spin with it, physics untouched */
    const lines = document.createElement('div');
    lines.className = 'wheel-lines';
    /* layered light (2026-11-21 wheel realism rebuild): a lit dome over the
       face, a chrome pinstripe ring, per-wedge bevel catch-light at each
       leading edge and shade at each trailing edge, rim falloff */
    lines.style.background = [
      'radial-gradient(circle at 50% 38%, rgba(255, 255, 255, .17) 0%, rgba(255, 255, 255, .05) 34%, transparent 58%)',
      'radial-gradient(circle, transparent 61.5%, rgba(230, 238, 246, .42) 62.6%, rgba(70, 80, 95, .35) 63.6%, transparent 64.8%)',
      'repeating-conic-gradient(from 0deg, rgba(255, 255, 255, .014) 0deg 1deg, transparent 1deg 2deg)',
      `repeating-conic-gradient(from ${-WSEG / 2}deg, rgba(0, 0, 0, .5) 0deg 1deg, rgba(255, 255, 255, .14) 1deg 3.4deg, transparent 3.4deg ${WSEG - 3.2}deg, rgba(0, 0, 0, .24) ${WSEG}deg)`,
      'radial-gradient(circle, transparent 56%, rgba(0, 0, 0, .26) 88%, rgba(0, 0, 0, .55) 100%)'
    ].join(',');
    wheelEl.appendChild(lines);
    /* motion-streak layer (spin feel): sits over the face under the glass,
       faded in by the spin loop in proportion to the wheel's real speed */
    const streaks = document.createElement('div');
    streaks.className = 'wheel-streaks';
    streaks.id = 'wheelStreaks';
    const wrapEl = wheelEl.parentElement;
    const glossEl = wrapEl ? wrapEl.querySelector('.wheel-gloss') : null;
    if (wrapEl && glossEl) wrapEl.insertBefore(streaks, glossEl);
    else if (wrapEl) wrapEl.appendChild(streaks);
    WEDGES.forEach((v, i) => {
      const peg = document.createElement('div');
      peg.className = 'wheel-peg';
      peg.style.transform = `rotate(${i * WSEG - WSEG / 2}deg)`;
      peg.innerHTML = '<span></span>';
      wheelEl.appendChild(peg);
    });
    /* chrome studs (rivets) riding every wedge seam — wheel example #8's
       signature hardware (2026-11-21 settled pick) */
    WEDGES.forEach((v, i) => {
      ['r1', 'r2', 'r3'].forEach(cls => {
        const stud = document.createElement('div');
        stud.className = 'wheel-stud';
        stud.style.transform = `rotate(${i * WSEG - WSEG / 2}deg)`;
        stud.innerHTML = `<span class="${cls}"></span>`;
        wheelEl.appendChild(stud);
      });
    });
    const grads = WEDGES.map((v, i) => {
      const base = wedgeBase(v, i);
      const a = i * WSEG, b = (i + 1) * WSEG;
      /* black leather takes a gentler, matte sweep; the red accents glow */
      const hi = base === '#16191f' ? .20 : .38, lo = base === '#16191f' ? -.32 : -.42;
      return `${shade(base, hi)} ${a}deg, ${shade(base, .02)} ${a + WSEG * .48}deg, ${shade(base, lo)} ${b}deg`;
    }).join(',');
    wheelEl.style.background = `conic-gradient(from ${-WSEG / 2}deg, ${grads})`;
    WEDGES.forEach((v, i) => {
      const lab = document.createElement('div');
      lab.className = 'wheel-label' + (v === 0 ? ' bad' : (v === Math.max(...WEDGES) ? ' jackpot' : ''));
      lab.style.transform = `rotate(${i * WSEG}deg)`;
      lab.innerHTML = `<span>${wedgeLabel(v)}</span>`;
      wheelEl.appendChild(lab);
    });
  }
  function spinWheelPhysics(targetIdx) {
    return new Promise(resolve => {
      wheelSpinning = true;
      /* wedge i center sits at wheel-local angle i*WSEG (conic starts at
         -WSEG/2). To park it under the top pointer, the wheel's final
         rotation must be ≡ -i*WSEG (mod 360). */
      const current = wheelAngle % 360;
      let delta = ((-targetIdx * WSEG) - current) % 360;
      if (delta < 0) delta += 360;
      const total = 360 * 6 + delta;
      const start = wheelAngle;
      const dur = 5600 + Math.random() * 700;
      const easeOut = u => 1 - Math.pow(1 - u, 4.2); /* hard launch, long friction tail */
      let lastPeg = Math.floor(start / WSEG);
      let prevAngle = start;
      const streakEl = document.getElementById('wheelStreaks');
      const t0 = performance.now();
      (function frame(now) {
        const u = Math.min(1, (now - t0) / dur);
        wheelAngle = start + total * easeOut(u);
        wheelEl.style.transform = `rotate(${wheelAngle}deg)`;
        /* spin feel only: motion streaks track the wheel's real per-frame
           speed — strong at the launch, gone as friction wins. The angle
           math above is untouched. */
        if (streakEl) streakEl.style.opacity = Math.min(.6, Math.abs(wheelAngle - prevAngle) / 26).toFixed(3);
        prevAngle = wheelAngle;
        const peg = Math.floor(wheelAngle / WSEG);
        if (peg !== lastPeg) {
          lastPeg = peg;
          if (u < 0.985) {
            /* peg clicks track the wheel's real speed (frame-driven);
               late in the spin, when the pointer creeps within a wedge
               of the JACKPOT, a near-bell builds the anticipation */
            let nearJackpot = false;
            if (u > 0.8) {
              const jpCenter = WEDGES.indexOf(Math.max(...WEDGES)) * WSEG;
              const ptr = (((-wheelAngle) % 360) + 360) % 360;
              let d = Math.abs(ptr - jpCenter); if (d > 180) d = 360 - d;
              nearJackpot = d < WSEG * 1.1;
            }
            if (nearJackpot) Kit.nearBell(); else sPeg();
            wheelPointer.classList.remove('flick'); void wheelPointer.offsetWidth; wheelPointer.classList.add('flick');
          }
        }
        if (u < 1) requestAnimationFrame(frame);
        else {
          if (streakEl) streakEl.style.opacity = 0;
          wheelSpinning = false;
          try { wheelEl.animate([{ transform: `rotate(${wheelAngle - 1.6}deg)` }, { transform: `rotate(${wheelAngle}deg)` }], { duration: 220, easing: 'ease-out' }); } catch (e) {}
          resolve();
        }
      })(t0);
    });
  }
  function runBonusWheel(betAtTrigger) {
    return new Promise(resolve => {
      buildWheel();
      bonusOverlay.classList.add('on');
      bonusOverlay.setAttribute('aria-hidden', 'false');
      bonusMsg.textContent = 'Pull the arm — or tap SPIN!';
      msgEl.textContent = 'BONUS WHEEL! Pull the arm or tap SPIN to spin it!';
      /* arm the wheel: SPIN button and lever now spin the wheel, not the reels */
      betDownBtn.disabled = true; betUpBtn.disabled = true; maxBetBtn.disabled = true;
      spinBtn.disabled = false;
      spinBtn.classList.remove('stopping');
      spinFace.textContent = 'SPIN';
      const lv = $('lever');
      if (lv) { lv.classList.remove('off'); lv.setAttribute('aria-disabled', 'false'); }
      wheelArmed = async () => {
        wheelArmed = null;
        const idx = Math.floor(Math.random() * WEDGES.length);
        const val = WEDGES[idx];
        bonusMsg.textContent = 'The wheel is spinning…';
        await spinWheelPhysics(idx);
        const pay = val * betAtTrigger;
        if (val === 0) {
          bonusMsg.textContent = 'BANKRUPT — the wheel gives nothing this time.';
          Kit.bust(); /* the low bust sting — no synth buzz */
        } else if (val === Math.max(...WEDGES)) {
          bonusMsg.textContent = `★ JACKPOT! ${val}× your bet = ${fmt(pay)} credits! ★`;
          Kit.jackpot(); /* full bell + coin celebration */
        } else {
          bonusMsg.textContent = `The wheel pays ${val}× your bet = ${fmt(pay)} credits!`;
          Kit.win(pay / betAtTrigger);
        }
        if (pay > 0) {
          const before = parseInt(winEl.textContent.replace(/[^0-9]/g, ''), 10) || 0;
          credits += pay;
          await countUp(winEl, before, before + pay, Math.min(1500, 400 + pay));
          renderReadouts(before + pay);
          save();
        }
        setTimeout(() => {
          bonusOverlay.classList.remove('on');
          bonusOverlay.setAttribute('aria-hidden', 'true');
          resolve(pay);
        }, 2100);
      };
    });
  }

  /* ---------- spin flow ---------- */
  async function doSpin(isFree) {
    if (spinning || wheelArmed || wheelSpinning) return;
    spinning = true;
    setControlsEnabled(false);
    clearWinMarks();
    winEl.textContent = '0';
    if (!isFree) {
      if (credits < totalBet()) {
        msgEl.textContent = credits <= 0 ? 'Out of credits — tap NEW GAME below for a fresh 1,000.' : 'Not enough credits for that bet — lower the bet, or tap NEW GAME for a fresh start.';
        renderReadouts();
        spinning = false; setControlsEnabled(true);
        return;
      }
      credits -= totalBet();
      renderReadouts();
      Kit.lever(); /* the real lever pull that starts a paid spin */
    }
    msgEl.textContent = isFree ? `Free spin — ${freeSpinsLeft} left after this one. Wins pay double!` : 'Good luck!';
    const betAtTrigger = totalBet();
    const finalStops = core.randomStops(Math.random, cfg.strips);
    const durations = [1700, 1900, 2100, 2300, 2500]; /* staggered stops, reel 1 first, ~200ms apart — same ladder on all three cabinets */
    stopRequested = false;
    clatterAcc.fill(0);
    startRollSound();
    await Promise.all(finalStops.map((_, r) => spinReel(r, finalStops, durations[r])));
    stopRollSound(false);
    stops = finalStops;
    const grid = core.windowForStops(cfg.strips, stops);
    const ev = core.evaluateGrid(grid, lineBet(), cfg);
    const mult = isFree ? core.FREE_SPIN_MULTIPLIER : 1;
    const linePay = ev.lineWinTotal * mult;
    const totalWin = Math.round(linePay + ev.scatterPay);

    for (const w of ev.lineWins) {
      for (let r = 0; r < w.count; r++) markCell(r, w.rows[r], 'win');
      if (w.mult > 1 && w.multCells) for (const r of w.multCells) markCell(r, core.PAYLINES[w.line - 1][r], 'win');
    }
    if (ev.scatterCount >= 1) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'SC') markCell(r, row, 'scatterhit');
    if (ev.bonusCount >= 1) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'BN') markCell(r, row, 'bonushit');

    if (totalWin > 0) {
      winFlash.classList.add('on');
      Kit.win(totalWin / totalBet());
      await countUp(winEl, 0, totalWin, Math.min(1400, 350 + totalWin));
      credits += totalWin;
      if (isFree) freeSpinTotal += totalWin;
    }
    renderReadouts(totalWin);
    notePeak();
    save();

    /* Bonus Wheel plays before free spins when both trigger together.
       Celebrate first — never cut straight in (Joshua, 12:52 CT). */
    if (ev.bonus) {
      msgEl.textContent = '3 BONUS tokens! The Bonus Wheel is yours — one spin!';
      spinning = false;
      await celebrate('bonus', 'BONUS WHEEL!', 'One spin — make it count!', celebDur());
      await runBonusWheel(betAtTrigger);
      notePeak();
      renderReadouts();
      spinning = true;
    }

    if (ev.freeSpins > 0) {
      freeSpinsLeft += ev.freeSpins;
      fsBanner.textContent = `★ ${ev.freeSpins} FREE SPINS ★ LINE WINS ×2 ★`;
      fsBanner.classList.add('on');
      msgEl.textContent = `${ev.scatterCount} scatters! ${ev.freeSpins} free spins${isFree ? ' added' : ''} — here they come!`;
      spinning = false;
      /* celebration first, then the spins (Joshua, 12:54 CT) */
      await celebrate('fs', `${ev.freeSpins} FREE SPINS!`, 'Line wins pay DOUBLE — here they come!', 2400);
      setTimeout(runFreeSpins, 350);
      return;
    }
    if (isFree) {
      freeSpinsLeft--;
      if (freeSpinsLeft > 0) {
        msgEl.textContent = `Free spins left: ${freeSpinsLeft} — session win so far: ${fmt(freeSpinTotal)}.`;
        spinning = false;
        setTimeout(runFreeSpins, 1100);
        return;
      }
      fsBanner.classList.remove('on');
      msgEl.textContent = freeSpinTotal > 0 ? `Free spins done — you won ${fmt(freeSpinTotal)} credits!` : 'Free spins done. Spin again!';
      freeSpinTotal = 0;
    } else {
      msgEl.textContent = totalWin > 0
        ? (ev.lineWins.length ? `Winner! ${ev.lineWins.map(w => `${w.count}× ${NAMES[w.symbol]}${w.mult > 1 ? ` (×${w.mult})` : ''}`).join(' · ')}` : 'Scatter pay!')
        : 'Set your bet, then press SPIN — or pull the arm.';
    }
    if (tierUpMsg) { msgEl.textContent = tierUpMsg; tierUpMsg = null; }
    renderReadouts();
    spinning = false;
    setControlsEnabled(true);
  }
  function runFreeSpins() { if (freeSpinsLeft > 0 && !spinning) doSpin(true); }

  spinBtn.addEventListener('click', () => {
    ac();
    if (wheelArmed) { const fire = wheelArmed; fire(); return; }
    if (spinning) { requestStop(); return; }
    if (!controlsOn) return; /* free-spin pause etc.: the STOP face is inert */
    doSpin(false);
  });

  /* Tapping the bonus card (the wheel sits in it) also spins the wheel
     while it is armed (verification fix 2026-11-21 — the overlay sits
     above the cabinet and its card covers the arm's knob at phone
     widths, so the card is the control a player can always reach;
     clicks on the card bubble up to the overlay, whose backdrop lets
     taps through to the arm / SPIN button everywhere else). */
  bonusOverlay.addEventListener('click', () => {
    ac();
    if (wheelArmed) { const fire = wheelArmed; fire(); }
  });

  /* ---------- pull arm (lever): drag it down, it springs back and spins.
     Tap = scripted full pull. Both paths fire the exact SPIN button path —
     so the arm also spins the Bonus Wheel when the wheel is armed. ---------- */
  const leverEl = $('lever'), leverArm = $('leverArm');
  const LEVER_MAX = 62; /* px of knob travel */
  let leverDrag = null;
  function leverSet(y, animate) {
    leverArm.style.transition = animate ? 'transform .5s cubic-bezier(.25,1.35,.4,1)' : 'none';
    leverArm.style.transform = `translateY(${y}px)`;
  }
  function leverFire() { spinBtn.click(); }
  function leverScriptedPull() {
    leverArm.style.transition = 'transform .16s ease-in';
    leverArm.style.transform = `translateY(${LEVER_MAX}px)`;
    setTimeout(() => { leverSet(0, true); leverFire(); }, 175);
  }
  if (leverEl && leverArm) {
    leverEl.addEventListener('pointerdown', e => {
      if (!wheelArmed && !controlsOn && !spinning) return;
      e.preventDefault();
      try { leverEl.setPointerCapture(e.pointerId); } catch (err) {}
      leverDrag = { y0: e.clientY, travel: 0, t0: performance.now() };
      leverArm.style.transition = 'none';
    });
    leverEl.addEventListener('pointermove', e => {
      if (!leverDrag) return;
      let travel = (e.clientY - leverDrag.y0) / 1.35; /* resistance: pull farther than the knob moves */
      if (travel < 0) travel = 0;
      if (travel > LEVER_MAX) travel = LEVER_MAX + (travel - LEVER_MAX) * 0.25; /* rubber-band */
      leverDrag.travel = travel;
      leverArm.style.transform = `translateY(${travel}px)`;
    });
    const leverRelease = () => {
      if (!leverDrag) return;
      const d = leverDrag; leverDrag = null;
      if (d.travel >= LEVER_MAX * 0.45) {
        leverArm.style.transition = 'transform .12s ease-in';
        leverArm.style.transform = `translateY(${LEVER_MAX}px)`;
        setTimeout(() => { leverSet(0, true); leverFire(); }, 130);
      } else if (d.travel < 8 && performance.now() - d.t0 < 350) {
        leverScriptedPull(); /* tap fallback */
      } else {
        leverSet(0, true); /* short pull let go early: springs back, no spin */
      }
    };
    leverEl.addEventListener('pointerup', leverRelease);
    leverEl.addEventListener('pointercancel', () => { leverDrag = null; leverSet(0, true); });
    leverEl.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && (wheelArmed || controlsOn || spinning)) { e.preventDefault(); leverScriptedPull(); }
    });
  }
  betDownBtn.addEventListener('click', () => { betSel = Math.max(BET_MIN, betSel - BET_STEP); renderReadouts(); buildPaytable(); sTick(); });
  betUpBtn.addEventListener('click', () => { betSel = Math.min(unlockedMax(), betSel + BET_STEP); renderReadouts(); buildPaytable(); sTick(); });
  maxBetBtn.addEventListener('click', () => { betSel = unlockedMax(); renderReadouts(); buildPaytable(); sTick(); });
  /* NEW GAME (Joshua, 2026-11-21): when the balance can't cover a spin,
     one tap restarts the game fresh — standard 1,000 starting credits,
     $25 bet, unlocks reset to the fresh 1,000-credit peak. */
  newGameBtn.addEventListener('click', () => {
    if (spinning || wheelArmed || wheelSpinning || freeSpinsLeft > 0) return;
    credits = 1000;
    betSel = BET_MIN;
    peak = 1000;
    lastUnlocked = unlockedMax();
    tierUpMsg = null;
    freeSpinTotal = 0;
    fsBanner.classList.remove('on');
    clearWinMarks();
    winEl.textContent = '0';
    renderReadouts(0);
    buildPaytable();
    save();
    msgEl.textContent = 'New game — 1,000 credits on the house. Good luck!';
    Kit.coin();
  });
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundStateEl.textContent = soundOn ? 'ON' : 'OFF';
    if (!soundOn) { stopRollSound(true); Kit.stopAll(); }
    save();
    if (soundOn) sTick();
  });
  /* QA hook: force states / inspect the kit (mirrors the other cabinets) */
  window.__slotsDebug = {
    setCredits: n => { credits = Math.max(0, n | 0); notePeak(); renderReadouts(); save(); },
    celebrate: (kind, title, sub, dur) => celebrate(kind || 'bonus', title || 'BONUS WHEEL!', sub || '', dur || 3000),
    kit: Kit,
    bonus: () => runBonusWheel(totalBet()),
    getState: () => ({ credits, bet: betSel, betPerLine: lineBet(), maxBet: unlockedMax(), peak, spinning, wheelArmed: !!wheelArmed, stops: stops.slice() })
  };
  soundStateEl.textContent = soundOn ? 'ON' : 'OFF';

  /* keep cells square-ish if the viewport changes mid-session */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (!spinning) showWindow(); }, 180);
  });

  buildWheel();
  showWindow();
  renderReadouts(0);
  buildPaytable();
})();
