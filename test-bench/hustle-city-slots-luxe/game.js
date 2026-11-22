/* Hustle City Slots — Poker Luxe · cabinet UI.
   Grown-up rebuild 2026-11-21 around generated luxury poker-room art.
   Engine (logic.js) + strips/paytable/vault (machines.js): 5x3, 20 paylines,
   weighted strips, WILD substitutes, X2/X3 line multipliers, SCATTER free
   spins, BONUS tokens on reels 2-4 opening the SKULL VAULT (bonus feature
   about 1 spin in 69; a feature about 1 in 35), NO blank stops (every
   reel position is a real symbol),
   RTP 98% theoretical (Joshua's settled target, 2026-11-21).
   Reels spin on a physics curve: spin-up, blur at speed, staggered stops
   left-to-right, settle bounce — with a mechanical rolling sound that
   tracks the motion. SPIN becomes STOP while the reels turn. Pull arm +
   SPIN button fire the same spin. Max bet climbs in tiers as the balance
   grows. Play credits only.
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
    SC: 'assets/sym-sc.webp', BN: 'assets/sym-bn.webp', DD: 'assets/sym-dd.webp',
    X2: 'assets/sym-x2.webp', X3: 'assets/sym-x3.webp'
  };
  const NAMES = {
    AC: 'Ace of Spades', KG: 'King', QN: 'Queen', JK: 'Jack', DM: 'Diamond',
    CP: 'Poker Chips', CG: 'Champagne', DK: 'Dice', WD: 'WILD', SC: 'SCATTER',
    BN: 'BONUS', DD: 'BIG DOLLAR', X2: 'WIN ×2', X3: 'WIN ×3'
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
  const bonusOverlay = $('bonusOverlay'), bonusMsg = $('bonusMsg');
  const vaultGrid = $('vaultGrid'), vaultLed = $('vaultLed'), vaultDoorsLed = $('vaultDoorsLed'),
    vaultSkullsLed = $('vaultSkullsLed'), vaultBankBtn = $('vaultBankBtn');
  const vaultEndEl = $('vaultEnd'), vaultEndImg = $('vaultEndImg'), vaultEndTitle = $('vaultEndTitle'),
    vaultEndLine1 = $('vaultEndLine1'), vaultEndLine2 = $('vaultEndLine2'), vaultEndBtn = $('vaultEndBtn');
  const wheelOverlay = $('wheelOverlay'), wheelMsg = $('wheelMsg'), wheelRotor = $('wheelRotor'),
    wheelPointer = $('wheelPointer'), wheelPrize = $('wheelPrize');

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
    document.querySelectorAll('.cell.win,.cell.scatterhit,.cell.bonushit,.cell.doorhit').forEach(c => c.classList.remove('win', 'scatterhit', 'bonushit', 'doorhit'));
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
  /* DOLLAR DOOR beats 1+2 (Joshua, 2026-11-22): when this reel carries the
     third dollar (fx.slow), it crawls at ~38% speed under a rising tension
     sound while the cabinet glows — then SLAMS to a stop: a heavy thunk, a
     cabinet jolt and a hard bounce, nothing like a normal reel stop. */
  function spinReel(r, finalStops, duration, fx) {
    return new Promise(resolve => {
      const reel = reelsEl[r], H = cellH(r), strip = cfg.strips[r];
      const grid = core.windowForStops(cfg.strips, finalStops);

      const len = strip.length;
      const vmax = PEAK_SYM_PER_SEC * H * (fx && fx.slow ? 0.38 : 1);   /* this machine's 20x peak, px/s */
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
        if (fx && fx.slow) {
          /* BEAT 2 — THE SLAM */
          reel.classList.remove('anticipating');
          reel.classList.add('slamming');
          setTimeout(() => reel.classList.remove('slamming'), 480);
          try { Kit.thunk(); Kit.play('thunk', { gain: 1.8 }); } catch (e) {}
        }
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
      if (fx && fx.slow) {
        /* BEAT 1 — THE SLOW-DOWN: tension rises, the reel glows */
        try { Kit.tension(); } catch (e) {}
        reel.classList.add('anticipating');
      }
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
       button. While the Skull Vault is open the vault manages the
       controls itself (runSkullVault). */
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
      `<div class="payrow"><div class="thumb"><img src="${ART.DD}" alt="DOLLAR DOOR"></div><div class="nm">THE DOLLAR DOOR</div><span class="pv wide">3+ BIG GREEN DOLLARS anywhere — the ONLY way into a bonus. The third dollar slows the reels, they SLAM to a stop, the dollars grow and POP, and the bonus opens: half the time the BONUS WHEEL spins (12 wedges, every wedge pays × your total bet — MINI 1.4×, MINOR 2.8×, MAJOR 4×, GRAND 8.5×); the rest of the time the SKULL VAULT opens: 12 doors, 9 hide blue-chip prizes (${cfg.vault.prizes.slice().sort((a, b) => b - a).join('×, ')}× your total bet — ${cfg.vault.prizes.reduce((a, b) => a + b, 0)}× in all) and ${cfg.vault.skulls} hide SKULLS. Every door you open PAYS YOU ON THE SPOT — a SKULL ends the vault, and you keep everything you collected. The door lands about once every 20 spins</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.CP}" alt="BET"></div><div class="nm">BET</div><span class="pv wide">Bets run in $25 steps: $25, $50, $75 … all the way up to $2,500 a spin. A step unlocks the first time your balance reaches it — and stays unlocked even if your balance dips. Use the −25 / +25 buttons or MAX BET. NEW GAME resets you to a $25 bet</span></div>`;
  }

  /* ---------- paytable sheet ---------- */
  function openSheet() { paySheet.classList.add('on'); paySheet.setAttribute('aria-hidden', 'false'); sheetBackdrop.classList.add('on'); }
  function closeSheet() { paySheet.classList.remove('on'); paySheet.setAttribute('aria-hidden', 'true'); sheetBackdrop.classList.remove('on'); }
  $('payBtn').addEventListener('click', openSheet);
  $('sheetHandle').addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

  /* ---------- bonus-screen minimum-view lock (Joshua, 2026-11-22) ----------
     "Make sure you have to see a couple seconds at least of the bonus
     screen before it goes away." Every celebration / bonus screen arms
     its lock the moment it appears; while locked, a tap that would skip /
     advance / dismiss it is IGNORED — never queued, so a stray tap at
     0.5s does not fire at 2.0s. After 2 seconds every tap works exactly
     as before. Deliberate gameplay picks (vault door taps, STOP)
     are NOT locked, and auto-advance timers are not taps. */
  const BONUS_MIN_VIEW_MS = 2000;
  const mkViewLock = () => ({
    t: 0,
    arm() { this.t = performance.now(); },
    locked() { return performance.now() - this.t < BONUS_MIN_VIEW_MS; }
  });
  const celebLock = mkViewLock(), videoLock = mkViewLock(), wheelLock = mkViewLock();

  /* ---------- celebration screens (Joshua, 2026-11-21 12:52–12:54 CT) ----------
     A bonus or free-spins trigger NEVER cuts straight in: a full-cabinet
     celebration plays first (~3s, tap to skip ahead — never skips the
     prize itself). Input is locked by the overlay while it shows. */
  /* ---------- bonus celebration VIDEO (Joshua, 2026-11-21 19:34 CT) ----------
     Engine-Rev Jackpot (celebration-hc-5) is Luxe's celebration:
     full-screen, the full 5.0s, tap-to-skip, its OWN audio unmuted (no
     sound-kit fanfare under it). The ★ BONUS ★ title rides as a separate
     overlay layer (assets/celeb-title.png) — FINAL: round-3 pick #15
     "Brushed Red Metal", word BONUS only, stars removed (Joshua,
     2026-11-21 20:45 CT). Swap = replace that one file. */
  const celebVideoEl = $('celebVideo'), celebVideoVid = $('celebVideoEl');
  const celebVideoCap = $('celebVideoCap');
  function playBonusVideo(capText) {
    return new Promise(res => {
      videoLock.arm(); /* minimum-view lock: no tap-skip for the first 2s */
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try { celebVideoVid.pause(); } catch (e) {}
        celebVideoEl.classList.remove('on');
        celebVideoEl.setAttribute('aria-hidden', 'true');
        celebVideoEl.removeEventListener('click', onTap);
        celebVideoVid.removeEventListener('ended', finish);
        res();
      };
      /* a tap inside the first 2s is ignored outright — not queued */
      const onTap = () => { if (videoLock.locked()) return; finish(); };
      if (celebVideoCap) { celebVideoCap.textContent = capText || ''; celebVideoCap.style.display = capText ? 'block' : 'none'; }
      celebVideoEl.classList.add('on');
      celebVideoEl.setAttribute('aria-hidden', 'false');
      celebVideoEl.addEventListener('click', onTap);
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
    /* the show fires at BOTH big moments (Joshua, 2026-11-21 20:50 CT): the
       bonus trigger and the free-spins trigger (caption carries the title) */
    if (kind === 'bonus') return playBonusVideo('');
    if (kind === 'fs') return playBonusVideo(title);
    return new Promise(res => {
      celebLock.arm(); /* minimum-view lock: no tap-skip for the first 2s */
      celebEl.className = 'celeb on k-' + kind;
      celebKickEl.textContent = kind === 'bonus' ? 'BONUS' : 'FREE SPINS';
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
        celebEl.removeEventListener('click', onTap);
        res();
      };
      /* a tap inside the first 2s is ignored outright — not queued */
      const onTap = () => { if (celebLock.locked()) return; finish(); };
      celebEl.addEventListener('click', onTap);
      setTimeout(finish, durMs);
    });
  }
  function celebDur() { return 2600 + Math.min(900, totalBet() * 3); }

  /* ---------- SKULL VAULT ----------
     Joshua's pick #2 (2026-11-21 23:02 CT), replacing the press-and-watch
     Bonus Wheel on the BN door. 12 riveted steel doors: the 9 prizes from
     cfg.vault.prizes (multiples of the TOTAL bet) plus cfg.vault.skulls
     skulls, shuffled face-down.
     PAY PATH (Joshua's order, 2026-11-22 15:18 CT — he played the shipped
     stop-and-bank build and reported "I opened one box it didn't pay and
     then I hit the head": the prize only sat in an unbanked total the
     credit meter never showed, and the skull then wiped it, so the bonus
     paid ZERO): every door now PAYS ON THE SPOT — the prize credits the
     balance the moment the door opens and the WIN meter counts it up in
     plain sight. A skull ENDS the vault; everything collected stays in
     the balance, and the ending beat (vaultEndShow) holds the scene and
     spells out what was collected and what the skull left locked inside.
     STOP ends the vault early with the same summary. Prize values, the
     door rate and free spins are untouched. */
  let vaultOpen = false, vaultState = null, vaultRig = null;
  const VAULT_BIG = Math.max.apply(null, cfg.vault.prizes);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function vaultReadouts() {
    if (!vaultState) return;
    vaultLed.textContent = fmt(vaultState.collected);
    vaultDoorsLed.textContent = String(vaultState.doorsLeft);
    vaultSkullsLed.textContent = String(vaultState.skullsLeft);
    vaultBankBtn.disabled = vaultState.over;
    vaultBankBtn.textContent = vaultState.collected > 0
      ? `STOP — KEEP ${fmt(vaultState.collected)}`
      : 'STOP — END VAULT';
  }
  function buildVaultDoors() {
    vaultGrid.innerHTML = '';
    vaultState.layout.forEach((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vault-door';
      b.dataset.idx = String(i);
      b.setAttribute('aria-label', `Vault door ${i + 1}`);
      b.innerHTML =
        `<span class="door-prize">${v === 0
          ? '<img src="assets/vault-skull.webp" alt="SKULL" draggable="false">'
          : `<img src="assets/sym-cg.webp" alt="Blue chips" draggable="false"><span class="door-prize-val">×${v}</span>`}</span>` +
        '<span class="door-face"><span class="door-handle"></span></span>';
      b.addEventListener('click', () => vaultPick(i));
      vaultGrid.appendChild(b);
    });
  }
  function runSkullVault(betAtTrigger) {
    return new Promise(resolve => {
      const layout = vaultRig
        ? vaultRig.slice()
        : shuffle(cfg.vault.prizes.concat(Array(cfg.vault.skulls).fill(0)));
      vaultRig = null;
      vaultState = {
        layout, bet: betAtTrigger, unbanked: 0, collected: 0, pay: 0, over: false,
        winShown: parseFloat(winEl.textContent.replace(/[^0-9.]/g, '')) || 0,
        doorsLeft: layout.length,
        skullsLeft: cfg.vault.skulls,
        safeLeft: cfg.vault.prizes.length,
        resolve
      };
      buildVaultDoors();
      vaultEndEl.classList.remove('on');
      vaultEndEl.setAttribute('aria-hidden', 'true');
      bonusOverlay.classList.add('on');
      bonusOverlay.setAttribute('aria-hidden', 'false');
      bonusMsg.textContent = 'Pick a door — every door pays you on the spot!';
      msgEl.textContent = 'SKULL VAULT! Every door pays on the spot — a skull ends the vault, you keep what you collected!';
      /* the vault is tap-driven on its doors: freeze the cabinet controls */
      betDownBtn.disabled = true; betUpBtn.disabled = true; maxBetBtn.disabled = true;
      spinBtn.disabled = true;
      const lv = $('lever');
      if (lv) { lv.classList.add('off'); lv.setAttribute('aria-disabled', 'true'); }
      vaultOpen = true;
      vaultReadouts();
    });
  }
  function vaultClose(delayMs) {
    const st = vaultState;
    setTimeout(() => {
      bonusOverlay.classList.remove('on');
      bonusOverlay.setAttribute('aria-hidden', 'true');
      vaultOpen = false;
      spinBtn.disabled = false;
      const lv = $('lever');
      if (lv) { lv.classList.remove('off'); lv.setAttribute('aria-disabled', 'false'); }
      vaultState = null;
      /* final re-assert (fix, 2026-11-22): whatever happened during the
         celebration, the closing balance is rendered and saved as the
         vault hands control back to the main game. */
      renderReadouts();
      save();
      st.resolve(st.pay || 0);
    }, delayMs);
  }
  /* WIN-meter count-up that a newer call supersedes: rapid door taps must
     never leave the meter short of the true credited total. */
  let winAnimSeq = 0;
  function winCountTo(from, to, dur) {
    const seq = ++winAnimSeq;
    if (to <= from) { winEl.textContent = fmt(to); return; }
    const t0 = performance.now();
    let lastTick = 0;
    (function step(t) {
      if (seq !== winAnimSeq) return; /* a newer count owns the meter now */
      const p = Math.min(1, (t - t0) / dur);
      winEl.textContent = fmt(Math.round(from + (to - from) * p));
      if (t - lastTick >= 45) { lastTick = t; Kit.countTick(); }
      if (p < 1) requestAnimationFrame(step); else winEl.textContent = fmt(to);
    })(t0);
  }

  /* ---------- THE VAULT ENDING BEAT (Joshua, 2026-11-22 15:18 CT) ----------
     "when you hit the head or whatever make it make the scene a little
     longer so you know what happened." Every way the vault ends — skull,
     STOP, full clear — lands on this panel: big art, the outcome in plain
     words (what was collected, what stayed locked inside), and a hold
     long enough to read it. CONTINUE arms after VAULT_END_HOLD_MS; the
     panel auto-closes at VAULT_END_MAX_MS so nobody is ever trapped. */
  const VAULT_END_HOLD_MS = 4000, VAULT_END_MAX_MS = 15000;
  function vaultEndShow(kind) {
    const st = vaultState;
    if (!st) return;
    st.pay = st.collected;
    let leftMult = 0;
    st.layout.forEach((v, idx) => {
      const b = vaultGrid.children[idx];
      if (v > 0 && b && !b.classList.contains('open')) leftMult += v;
    });
    const leftCredits = Math.round(leftMult * st.bet);
    const doorsWord = st.doorsLeft === 1 ? 'door' : 'doors';
    if (kind === 'skull') {
      vaultEndImg.src = 'assets/vault-skull.webp';
      vaultEndImg.alt = 'SKULL';
      vaultEndTitle.textContent = 'THE SKULL ENDS THE VAULT';
      vaultEndLine1.textContent = st.collected > 0
        ? `You collected ${fmt(st.collected)} credits — already in your balance.`
        : 'You collected nothing this time.';
      vaultEndLine2.textContent = leftCredits > 0
        ? `Still locked inside: ${fmt(leftCredits)} credits behind ${st.doorsLeft} unopened ${doorsWord}.`
        : 'Nothing was left inside.';
    } else if (kind === 'clear') {
      vaultEndImg.src = 'assets/vault-chips.webp';
      vaultEndImg.alt = 'Blue chips';
      vaultEndTitle.textContent = 'FULL CLEAR — VAULT EMPTIED!';
      vaultEndLine1.textContent = `You collected the whole vault: ${fmt(st.collected)} credits — already in your balance.`;
      vaultEndLine2.textContent = 'Every chip door opened. Nothing left inside.';
    } else {
      vaultEndImg.src = 'assets/vault-chips.webp';
      vaultEndImg.alt = 'Blue chips';
      vaultEndTitle.textContent = 'YOU CLOSE THE VAULT';
      vaultEndLine1.textContent = st.collected > 0
        ? `You collected ${fmt(st.collected)} credits — already in your balance.`
        : 'You collected nothing this time.';
      vaultEndLine2.textContent = leftCredits > 0
        ? `Left inside: ${fmt(leftCredits)} credits behind ${st.doorsLeft} unopened ${doorsWord}.`
        : 'Nothing was left inside.';
    }
    vaultEndEl.classList.add('on');
    vaultEndEl.setAttribute('aria-hidden', 'false');
    vaultEndBtn.disabled = true;
    vaultEndBtn.textContent = 'CONTINUE';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      vaultEndEl.classList.remove('on');
      vaultEndEl.setAttribute('aria-hidden', 'true');
      vaultClose(350);
    };
    vaultEndBtn.onclick = () => { if (!vaultEndBtn.disabled) finish(); };
    setTimeout(() => { vaultEndBtn.disabled = false; }, VAULT_END_HOLD_MS);
    setTimeout(finish, VAULT_END_MAX_MS);
  }
  function vaultPick(i) {
    const st = vaultState;
    if (!vaultOpen || !st || st.over) return;
    const btn = vaultGrid.children[i];
    if (!btn || btn.classList.contains('open')) return;
    btn.classList.add('open');
    btn.disabled = true;
    st.doorsLeft--;
    const v = st.layout[i];
    if (v === 0) {
      /* SKULL — the vault ENDS. Everything already collected STAYS in the
         balance (each door paid on the spot); the ending beat holds the
         scene and spells out what was collected and what the skull left
         locked inside, so nobody is left wondering what happened. */
      st.over = true;
      st.skullsLeft--;
      btn.classList.add('skull');
      Kit.bust(); /* the low bust sting — no synth buzz */
      bonusMsg.textContent = 'SKULL! The vault ends — what you collected is yours.';
      vaultReadouts();
      vaultBankBtn.disabled = true;
      vaultEndShow('skull');
      return;
    }
    /* SAFE DOOR — IT PAYS RIGHT NOW (fix, 2026-11-22): the prize credits
       the balance the moment the door opens — money first, saved
       synchronously — and the WIN meter counts it up in plain sight. */
    st.unbanked += v;
    st.safeLeft--;
    const payNow = Math.round(v * st.bet);
    st.collected += payNow;
    st.pay = st.collected;
    credits += payNow;
    notePeak();
    save();
    Kit.prize(cfg.vault.prizes.length - st.safeLeft);
    const winFrom = st.winShown;
    st.winShown += payNow;
    winCountTo(winFrom, st.winShown, Math.min(900, 300 + payNow * 2));
    if (st.safeLeft === 0) {
      /* FULL CLEAR — every chip door opened, every prize already paid */
      st.over = true;
      bonusMsg.textContent = `FULL CLEAR! Every chip door opened — ${fmt(st.collected)} credits collected!`;
      Kit.jackpot(); /* full bell + coin celebration */
      vaultReadouts();
      vaultBankBtn.disabled = true;
      vaultEndShow('clear');
      return;
    }
    bonusMsg.textContent = v >= VAULT_BIG
      ? `THE BIG DOOR! ×${v} — ${fmt(payNow)} credits PAID. ${fmt(st.collected)} collected.`
      : `×${v} — ${fmt(payNow)} credits PAID. ${fmt(st.collected)} collected so far.`;
    vaultReadouts();
  }
  vaultBankBtn.addEventListener('click', () => {
    const st = vaultState;
    if (!vaultOpen || !st || st.over) return;
    st.over = true;
    Kit.bankIt(st.unbanked);
    bonusMsg.textContent = st.collected > 0
      ? `You stop — ${fmt(st.collected)} credits collected, already yours.`
      : 'You stop — nothing collected.';
    vaultReadouts();
    vaultBankBtn.disabled = true;
    vaultEndShow('stop');
  });


  /* ---------- BONUS WHEEL (ported 2026-11-22 from Pearl's Paws) ----------
     JOINS the Skull Vault on the same BN door — replaces nothing. When
     the vault would open, a cfg.wheelShare roll sends the player here
     instead (see the trigger split in doSpin). A layered SVG wheel in
     the settled Luxe wheel pick #8 dress — "chrome biker/red": dark
     chrome rim with bolts, black and deep-red wedges, chrome separators,
     electric-blue label glow, red as a primary accent. NO GOLD. Physics
     mirror Pearl's: the winning wedge is drawn first, then the wheel
     spins (6 full turns, quartic ease-out 5.6–6.3s, real-kit peg clicks
     + pointer flick, near-GRAND nearBell) and settles exactly on it.
     Every wedge pays wedge × total bet, credited exactly like the
     vault's award (credits += pay, then countUp + render + save). */
  const WEDGES = cfg.wheel, WTIERS = cfg.wheelTiers || {};
  const WSEG = 360 / WEDGES.length;
  let wheelBuilt = false, wheelAngle = 0, wheelSpinning = false, wheelArmed = null, wheelOpen = false;
  const SVGNS = 'http://www.w3.org/2000/svg';
  function wedgeFill(v, i) {
    if (WTIERS[v] === 'GRAND') return 'url(#wgGrand)';
    if (WTIERS[v] === 'MAJOR') return 'url(#wgMajor)';
    if (WTIERS[v] === 'MINOR') return 'url(#wgMinor)';
    if (WTIERS[v] === 'MINI') return 'url(#wgMini)';
    return i % 2 ? 'url(#wgB)' : 'url(#wgA)';
  }
  function buildWheel() {
    if (wheelBuilt) return;
    wheelBuilt = true;
    /* machined bolts around the static dark-chrome rim */
    const bolts = $('wheelBolts');
    if (bolts) for (let i = 0; i < 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180;
      const b = document.createElementNS(SVGNS, 'circle');
      b.setAttribute('cx', 170 + 165 * Math.cos(a)); b.setAttribute('cy', 170 + 165 * Math.sin(a));
      b.setAttribute('r', 3.4); b.setAttribute('fill', 'url(#wgPeg)'); b.setAttribute('stroke', 'rgba(0,0,0,.55)'); b.setAttribute('stroke-width', '0.7');
      bolts.appendChild(b);
    }
    const cx = 170, cy = 170, rO = 148, rI = 54;
    const pt = (r, aDeg) => { const a = (aDeg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    WEDGES.forEach((v, i) => {
      const a0 = i * WSEG - WSEG / 2, a1 = a0 + WSEG;
      const [x0, y0] = pt(rO, a0), [x1, y1] = pt(rO, a1), [x2, y2] = pt(rI, a1), [x3, y3] = pt(rI, a0);
      const pth = document.createElementNS(SVGNS, 'path');
      pth.setAttribute('d', `M ${x0} ${y0} A ${rO} ${rO} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${rI} ${rI} 0 0 0 ${x3} ${y3} Z`);
      pth.setAttribute('fill', wedgeFill(v, i));
      pth.setAttribute('stroke', 'rgba(190,205,225,.55)');
      pth.setAttribute('stroke-width', '1.6');
      wheelRotor.appendChild(pth);
      /* label group at the wedge center angle */
      const g = document.createElementNS(SVGNS, 'g');
      const mid = i * WSEG;
      g.setAttribute('transform', `rotate(${mid} ${cx} ${cy})`);
      if (WTIERS[v]) {
        const t1 = document.createElementNS(SVGNS, 'text');
        t1.setAttribute('x', cx); t1.setAttribute('y', cy - rO + 48);
        t1.setAttribute('class', 'wlabel tier');
        t1.textContent = WTIERS[v];
        const t2 = document.createElementNS(SVGNS, 'text');
        t2.setAttribute('x', cx); t2.setAttribute('y', cy - rO + 68);
        t2.setAttribute('class', 'wlabel tierval');
        t2.textContent = v + '×';
        g.appendChild(t1); g.appendChild(t2);
      } else {
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', cx); t.setAttribute('y', cy - rO + 66);
        t.setAttribute('class', 'wlabel');
        t.textContent = v + '×';
        g.appendChild(t);
      }
      wheelRotor.appendChild(g);
      /* a machined peg sphere on every boundary */
      const [px, py] = pt(157, a0);
      const peg = document.createElementNS(SVGNS, 'circle');
      peg.setAttribute('cx', px); peg.setAttribute('cy', py); peg.setAttribute('r', 5.6);
      peg.setAttribute('fill', 'url(#wgPeg)');
      peg.setAttribute('stroke', 'rgba(0,0,0,.6)');
      peg.setAttribute('stroke-width', '0.8');
      wheelRotor.appendChild(peg);
    });
  }
  function spinWheelPhysics(targetIdx) {
    return new Promise(resolve => {
      wheelSpinning = true;
      const current = wheelAngle % 360;
      let delta = ((-targetIdx * WSEG) - current) % 360;
      if (delta < 0) delta += 360;
      const total = 360 * 6 + delta;
      const start = wheelAngle;
      const dur = 5600 + Math.random() * 700;
      const easeOut = u => 1 - Math.pow(1 - u, 4.2);
      let lastPeg = Math.floor(start / WSEG);
      const t0 = performance.now();
      (function frame(now) {
        const u = Math.min(1, (now - t0) / dur);
        wheelAngle = start + total * easeOut(u);
        wheelRotor.setAttribute('transform', `rotate(${wheelAngle} 170 170)`);
        const peg = Math.floor(wheelAngle / WSEG);
        if (peg !== lastPeg) {
          lastPeg = peg;
          if (u < 0.985) {
            let nearGrand = false;
            if (u > 0.8) {
              const gCenter = WEDGES.indexOf(Math.max(...WEDGES)) * WSEG;
              const ptr = (((-wheelAngle) % 360) + 360) % 360;
              let d = Math.abs(ptr - gCenter); if (d > 180) d = 360 - d;
              nearGrand = d < WSEG * 1.1;
            }
            if (nearGrand && Kit.nearBell) Kit.nearBell(); else Kit.peg();
            wheelPointer.classList.remove('flick'); void wheelPointer.offsetWidth; wheelPointer.classList.add('flick');
          }
        }
        if (u < 1) requestAnimationFrame(frame);
        else { wheelSpinning = false; resolve(); }
      })(t0);
    });
  }
  function runBonusWheel(betAtTrigger, forceIdx) {
    return new Promise(resolve => {
      buildWheel();
      wheelOpen = true;
      wheelOverlay.classList.add('on');
      wheelOverlay.setAttribute('aria-hidden', 'false');
      wheelLock.arm(); /* minimum-view lock: the wheel must be seen 2s before a tap can spin it */
      wheelPrize.classList.remove('on');
      wheelMsg.textContent = 'Pull the arm — or tap SPIN!';
      msgEl.textContent = 'BONUS WHEEL! Pull the arm or tap SPIN to spin the wheel!';
      /* the wheel is spun with the cabinet SPIN button / pull arm (and its
         own SPIN THE WHEEL button): freeze the bet controls, arm SPIN */
      betDownBtn.disabled = true; betUpBtn.disabled = true; maxBetBtn.disabled = true;
      spinBtn.disabled = false;
      spinBtn.classList.remove('stopping');
      spinFace.textContent = 'SPIN THE WHEEL';
      const lv = $('lever');
      if (lv) { lv.classList.remove('off'); lv.setAttribute('aria-disabled', 'false'); }
      wheelArmed = async () => {
        wheelArmed = null;
        const idx = (typeof forceIdx === 'number') ? forceIdx : Math.floor(Math.random() * WEDGES.length);
        const val = WEDGES[idx];
        wheelMsg.textContent = 'The wheel is spinning…';
        await spinWheelPhysics(idx);
        const pay = Math.round(val * betAtTrigger);
        const tier = WTIERS[val];
        /* the prize lands on a chrome prize plaque — no paw token here */
        wheelPrize.querySelector('.plaque-amt').textContent = '+' + fmt(pay);
        wheelPrize.classList.add('on');
        if (tier) {
          wheelMsg.innerHTML = `${tier} JACKPOT! The wheel pays <b>${fmt(pay)}</b> credits!`;
          Kit.jackpot();
        } else {
          wheelMsg.innerHTML = `The wheel pays <b>${fmt(pay)}</b> credits!`;
          Kit.win(val);
        }
        if (pay > 0) {
          const before = parseInt(winEl.textContent.replace(/[^0-9]/g, ''), 10) || 0;
          /* MONEY FIRST (fix, 2026-11-22): same rule as the vault award —
             credit + save synchronously, animation after. */
          credits += pay;
          save();
          renderReadouts(before + pay);
          await countUp(winEl, before, before + pay, Math.min(1500, 400 + pay));
          renderReadouts(before + pay);
          save();
        }
        setTimeout(() => {
          wheelOverlay.classList.remove('on');
          wheelOverlay.setAttribute('aria-hidden', 'true');
          wheelOpen = false;
          spinFace.textContent = controlsOn ? 'SPIN' : 'STOP';
          resolve(pay);
        }, 2100);
      };
    });
  }
  $('wheelSpinBtn').addEventListener('click', () => {
    if (wheelArmed) { if (wheelLock.locked()) return; const f = wheelArmed; ac(); f(); }
  });

  /* ---------- DOLLAR DOOR beat 3: grow + pop ---------- */
  let lastDoor = { hit: false, reel: -1, count: 0 };
  function doorPopSequence(cells) {
    return new Promise(res => {
      cells.forEach((c, i) => {
        const track = reelsEl[c.r].firstElementChild;
        const cell = track && track.children[c.row];
        if (cell) { cell.classList.add('doorhit'); cell.style.animationDelay = (i * 0.13) + 's'; }
        setTimeout(() => { try { Kit.play('bell', { rate: 1 + i * 0.09 }); } catch (e) {} }, 420 + i * 130);
      });
      try { Kit.play('coins'); } catch (e) {}
      setTimeout(res, 620 + cells.length * 130 + 450);
    });
  }

  /* ---------- spin flow ---------- */
  async function doSpin(isFree) {
    if (spinning || vaultOpen || wheelOpen) return;
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
    /* DOLLAR DOOR choreography: the dealt grid is known before the reels
       move, so the reel that lands the THIRD dollar is singled out up
       front — it crawls in slow motion (beat 1) and slams (beat 2). The
       Luxe door can also fire inside free spins, as its bonus always
       could. */
    const dealtGrid = core.windowForStops(cfg.strips, finalStops);
    const dealtEv = core.evaluateGrid(dealtGrid, lineBet(), cfg);
    let doorReel = -1;
    if (dealtEv.bonus) {
      let cum = 0;
      for (let r = 0; r < 5; r++) {
        cum += dealtGrid[r].filter(s => s === cfg.doorSymbol).length;
        if (cum >= 3) { doorReel = r; break; }
      }
    }
    const reelFx = [null, null, null, null, null];
    if (doorReel >= 0) {
      durations[doorReel] = 3600;
      reelFx[doorReel] = { slow: true };
      msgEl.textContent = 'The dollars are on the reels — watch for the third one…';
    }
    stopRequested = false;
    clatterAcc.fill(0);
    startRollSound();
    await Promise.all(finalStops.map((_, r) => spinReel(r, finalStops, durations[r], reelFx[r])));
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
    lastDoor = { hit: ev.bonus, reel: doorReel, count: ev.bonusCount };
    if (ev.bonus) {
      /* BEAT 3 — GROW AND POP: every landed dollar swells up and pops,
         one after another, bells rising, before the bonus opens. */
      const cells = [];
      for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === cfg.doorSymbol) cells.push({ r, row });
      await doorPopSequence(cells);
      msgEl.textContent = `${ev.bonusCount} BIG GREEN DOLLARS — the door is open!`;
    }

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

    if (!ev.bonus && ev.lineWins.some(w => w.count >= 5)) {
      /* FIVE OF A KIND celebrates too (Joshua, 2026-11-21 20:57 CT) */
      await celebrate('bonus', 'FIVE OF A KIND!', 'Five on a line — that is a big one!', celebDur());
    }

    /* Skull Vault plays before free spins when both trigger together.
       Celebrate first — never cut straight in (Joshua, 12:52 CT). */
    if (ev.bonus) {
      spinning = false;
      /* Trigger split: the wheel and the vault share the DOLLAR DOOR —
         a wheelShare roll decides which bonus opens (2026-11-22: the
         door replaced the old BN token trigger; it lands ~1 in 20). */
      if (Math.random() < (cfg.wheelShare ?? 0.5)) {
        msgEl.textContent = '3 BIG GREEN DOLLARS! The Bonus Wheel is yours!';
        await celebrate('bonus', 'BONUS WHEEL!', 'One spin — every wedge pays!', celebDur());
        await runBonusWheel(betAtTrigger);
      } else {
        msgEl.textContent = '3 BIG GREEN DOLLARS! The Skull Vault is yours!';
        await celebrate('bonus', 'SKULL VAULT!', 'Every door pays on the spot!', celebDur());
        await runSkullVault(betAtTrigger);
      }
      notePeak();
      renderReadouts();
      spinning = true;
    }

    if (ev.freeSpins > 0) {
      freeSpinsLeft += ev.freeSpins;
      fsBanner.textContent = `${ev.freeSpins} FREE SPINS — LINE WINS ×2`;
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
    if (wheelArmed) { if (wheelLock.locked()) return; const f = wheelArmed; f(); return; }
    if (vaultOpen) return; /* the vault is played on its doors */
    if (spinning) { requestStop(); return; }
    if (!controlsOn) return; /* free-spin pause etc.: the STOP face is inert */
    doSpin(false);
  });

  /* ---------- pull arm (lever): drag it down, it springs back and spins.
     Tap = scripted full pull. Both paths fire the exact SPIN button path. ---------- */
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
      if (vaultOpen) return;
      if (!controlsOn && !spinning && !wheelArmed) return;
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
      if ((e.key === 'Enter' || e.key === ' ') && !vaultOpen && (controlsOn || spinning || wheelArmed)) { e.preventDefault(); leverScriptedPull(); }
    });
  }
  betDownBtn.addEventListener('click', () => { betSel = Math.max(BET_MIN, betSel - BET_STEP); renderReadouts(); buildPaytable(); sTick(); });
  betUpBtn.addEventListener('click', () => { betSel = Math.min(unlockedMax(), betSel + BET_STEP); renderReadouts(); buildPaytable(); sTick(); });
  maxBetBtn.addEventListener('click', () => { betSel = unlockedMax(); renderReadouts(); buildPaytable(); sTick(); });
  /* NEW GAME (Joshua, 2026-11-21): when the balance can't cover a spin,
     one tap restarts the game fresh — standard 1,000 starting credits,
     $25 bet, unlocks reset to the fresh 1,000-credit peak. */
  newGameBtn.addEventListener('click', () => {
    if (spinning || vaultOpen || wheelOpen || freeSpinsLeft > 0) return;
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
    msgEl.textContent = 'You bought back in — 1,000 credits on the house. Good luck!';
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
    bonus: () => runSkullVault(totalBet()),
    wheel: (idx) => runBonusWheel(totalBet(), idx),
    vaultRig: layout => { vaultRig = Array.isArray(layout) ? layout.slice() : null; },
    vaultState: () => vaultState ? { unbanked: vaultState.unbanked, collected: vaultState.collected, bet: vaultState.bet, over: vaultState.over, doorsLeft: vaultState.doorsLeft, skullsLeft: vaultState.skullsLeft, safeLeft: vaultState.safeLeft, pay: vaultState.pay || 0 } : null,
    getState: () => ({ credits, bet: betSel, betPerLine: lineBet(), maxBet: unlockedMax(), peak, spinning, vaultOpen, wheelOpen, wheelArmed: !!wheelArmed, wheelSpinning, stops: stops.slice(), door: { ...lastDoor } })
  };
  soundStateEl.textContent = soundOn ? 'ON' : 'OFF';

  /* keep cells square-ish if the viewport changes mid-session */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (!spinning) showWindow(); }, 180);
  });

  showWindow();
  renderReadouts(0);
  buildPaytable();
})();
