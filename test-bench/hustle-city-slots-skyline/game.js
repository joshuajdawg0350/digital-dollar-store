/* Hustle City Slots — Midnight Skyline · grown-up rebuild 2026-11-21.
   Presentation layer modeled on Casino Classics v2 (the house benchmark),
   rethemed midnight-noir with generated chrome/blue art assets.
   Engine (logic.js) + strips/paytable (machines.js): 5x3, 20 paylines,
   weighted strips, WILD substitutes, X2/X3 line multipliers, SCATTER free
   spins (line wins x2), BONUS DICE -> DICE ROLL push-your-luck bonus game,
   NO blank stops (every reel position is a real symbol).
   Standards pass 2026-11-21 (Joshua's orders): BONUS trigger tuned to
   1 in 39.6 spins on average (his 1-in-40 standard); TOTAL RTP 98.04%
   theoretical (his settled 98%); SPIN becomes STOP while the reels roll
   and halts them on their dealt stops; NEW GAME button appears when the
   balance can't cover a spin and restarts at 1,000 credits; MAX BET
   climbs a tier ladder as the balance grows (unlocks are sticky until a
   NEW GAME); reel sound is a mechanical rolling clatter tracked to the
   actual reel motion (filtered-noise pawl clicks + a landing thunk),
   not oscillator beeps.
   Blue cabinet treatment (Joshua's order: blue, not black) so the screen
   pops. Pull arm + SPIN button both fire the same spin. Reels spin up with
   acceleration, blur at speed, stop staggered left-to-right with a settle
   bounce. Play credits only. (c) 2026 J-Dawgs Industries. */
'use strict';
(function () {
  const core = window.SlotCore;
  const cfg = window.SlotMachines.SKYLINE;
  const LS_KEY = 'hcslots-skyline-v2';

  const ART = {
    VT: 'assets/sym-vt.webp', SK: 'assets/sym-sk.webp', MN: 'assets/sym-mn.webp',
    TX: 'assets/sym-tx.webp', LM: 'assets/sym-lm.webp', SL: 'assets/sym-sl.webp',
    WD: 'assets/sym-wd.webp', SC: 'assets/sym-sc.webp',
    X2: 'assets/sym-x2.webp', X3: 'assets/sym-x3.webp', BN: 'assets/sym-bn.webp'
  };
  const NAMES = {
    VT: 'Vault Door', SK: 'Skyscraper', MN: 'Full Moon', TX: 'Taxi',
    LM: 'Laser', SL: 'Searchlight', WD: 'WILD', SC: 'SCATTER',
    X2: 'WIN ×2', X3: 'WIN ×3', BN: 'BONUS DICE'
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
  const bonusEl = $('bonusGame'), bonusBackdrop = $('bonusBackdrop');
  const bonusPotEl = $('bonusPot'), bonusMsgEl = $('bonusMsg'), bonusLadderEl = $('bonusLadder');
  const bonusRollBtn = $('bonusRollBtn'), bonusBankBtn = $('bonusBankBtn');
  const bonusTotalEl = $('bonusRollTotal'), bonusTriggerEl = $('bonusTriggerText');
  const dieEls = [$('die0'), $('die1')];
  const wheelOverlay = $('wheelOverlay'), wheelMsg = $('wheelMsg'), wheelRotor = $('wheelRotor'), wheelPointer = $('wheelPointer'), wheelPrize = $('wheelPrize');

  /* Bet ladder (Joshua, 2026-11-21 13:02 CT): the bet is a TOTAL bet per
     spin in $25 steps — 25, 50, 75 … up to 2,500. A step unlocks the first
     time the player's PEAK balance reaches it and stays unlocked even if
     the balance dips (sticky); only NEW GAME resets it. Internally the
     engine still bets per line: line bet = total ÷ 20 lines (fractional
     is fine — payouts scale linearly, wins are rounded to whole credits
     when paid, so RTP is unchanged at every step). */
  const BET_STEP = 25, BET_MIN = 25, BET_MAX = 2500;
  let credits = 1000, betSel = BET_MIN, peak = 1000, spinning = false;
  let freeSpinsLeft = 0, freeSpinTotal = 0, soundOn = true;
  let stops = [4, 9, 2, 14, 7];
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved && typeof saved.credits === 'number') credits = saved.credits;
    if (saved && typeof saved.sound === 'boolean') soundOn = saved.sound;
    if (saved && typeof saved.peak === 'number') peak = saved.peak;
    if (saved && typeof saved.bet === 'number') betSel = Math.min(BET_MAX, Math.max(BET_MIN, Math.round(saved.bet / BET_STEP) * BET_STEP));
  } catch (e) { /* restricted webview: play without persistence */ }
  if (peak < credits) peak = credits;
  function unlockedMax() { return Math.max(BET_MIN, Math.min(BET_MAX, Math.floor(peak / BET_STEP) * BET_STEP)); }
  if (betSel > unlockedMax()) betSel = unlockedMax();

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
     are GONE. Only the mechanical reel clatter below stays WebAudio. */
  const Kit = window.SlotKit;
  Kit.init(ac, () => soundOn);
  const sTick = () => Kit.click();

  /* ---------- mechanical reel sound (Joshua, 2026-11-21: "more of a
     rolling noise", not a digital beep — and after his ear test killed
     the modeled kit, every part of it is now a REAL recording) ----------
     The shared kit's reel-roll loop (an actual slot machine's reels)
     runs under the spin, its rate/level driven by the reels' own speed
     from the motion loop. Per symbol cell that passes, one real
     prize-wheel peg click fires (rate-jittered like a real mechanism) —
     so the clatter accelerates with spin-up, rolls steady at cruise,
     ticks down as the reel brakes, and cuts the moment the last reel
     settles (a STOP-button brake included). Each landing is the kit's
     real mechanical clunk. No noise buffers, no oscillators. */
  function clatterBurst(intensity) {
    if (!soundOn) return;
    Kit.play('peg', { group: 'peg', gain: 0.25 + 0.55 * Math.min(1, intensity || 0), rate: 0.92 + Math.random() * 0.18 });
  }
  function landThunk() {
    if (!soundOn) return;
    Kit.thunk();
  }
  /* (win/dice/bust sounds moved to the shared kit — see Kit.* call sites) */

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

  /* STOP control (Joshua, 2026-11-21): while the reels roll, SPIN reads
     STOP and stays live; pressing it brakes every reel fast onto its
     dealt stop (same stops, same evaluation, same payouts — just no
     waiting). reelStoppers[r] is the in-flight reel's brake handle. */
  const reelStoppers = [];
  let reelsRolling = false;
  function setStopMode(on) {
    reelsRolling = on;
    spinFace.textContent = on ? 'STOP' : 'SPIN';
    spinBtn.classList.toggle('stop-mode', on);
    spinBtn.setAttribute('aria-label', on ? 'Stop the reels' : 'Spin the reels');
    if (on) spinBtn.disabled = false;
  }
  function requestStop() {
    if (!reelsRolling) return;
    for (const s of reelStoppers) if (typeof s === 'function') s();
  }

  /* Reel motion: the shared real-machine physics from logic.js
     (createReelMotion — identical on all three cabinets): spin-UP from
     rest on a smoothstep torque curve (~0.42s), a full-speed cruise with
     motion blur, a firm brake, staggered stops left to right, and a
     spring settle that overshoots a few px past the stop and recoils
     ONCE onto it. Pure presentation: the dealt stops are whatever the
     engine rolled. The rolling clatter is driven by the track's real
     position: one pawl click per cell passing, rising with spin-up,
     rolling at cruise, ticking down as the reel brakes; landThunk()
     fires at the true landing moment. STOP brakes the reel fast into
     the same settle on the same dealt stop. */
  /* Peak reel speed — Joshua, 2026-11-21: "spin the wheels 20 times
     faster." The old build's CSS-bezier launch peaked at ~2,446 px/s at
     a 59px cell (41.5 symbols/sec), so every reel now cruises at 20x
     that: 829.2 symbols/sec. Distance grows with the speed — the spin
     keeps its ~2-2.5s shape, the strip just travels ~20x farther. */
  const PEAK_SYM_PER_SEC = 829.2;
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
      let last = performance.now(), lastCell = 0, lastTick = 0, lastBlur = -1;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(hardStop);
        if (stopTimer) clearTimeout(stopTimer);
        reelStoppers[r] = null;
        track.style.filter = '';
        track.innerHTML = grid[r].map(s => cellHTML(s, H)).join('');
        track.style.transform = 'translateY(0px)';
        landThunk();
        resolve();
      };
      /* STOP: brake this reel (staggered a hair by reel order) — the
         motion lands it on the same dealt stop through the same settle;
         the timer is only a failsafe if the brake ever failed to land. */
      reelStoppers[r] = () => {
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
        const cell = Math.floor(p / H);
        if (cell !== lastCell) {
          lastCell = cell;
          if (now - lastTick >= 32) { clatterBurst(Math.min(1, v / motion.vmax)); lastTick = now; }
        }
        Kit.rollSpeed(Math.min(1, v / motion.vmax)); /* the real-reels bed tracks the fastest motion */
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  /* ---------- readouts / controls ---------- */
  function refreshBet() {
    if (credits > peak) { peak = credits; save(); }
    if (betSel > unlockedMax()) betSel = unlockedMax();
    const um = unlockedMax();
    maxBetLineEl.textContent = um < BET_MAX
      ? `MAX BET ${fmt(um)} · ${fmt(um + BET_STEP)} UNLOCKS AT ${fmt(um + BET_STEP)} BALANCE`
      : `MAX BET ${fmt(um)} · TOP BET UNLOCKED`;
    renderBet();
  }
  let controlsOn = true;
  function renderBet() {
    betDownBtn.disabled = !controlsOn || betSel <= BET_MIN;
    betUpBtn.disabled = !controlsOn || betSel >= unlockedMax();
    maxBetBtn.disabled = !controlsOn;
  }
  function renderReadouts(winVal) {
    refreshBet();
    creditsEl.textContent = fmt(credits);
    betEl.textContent = fmt(totalBet());
    if (typeof winVal === 'number') winEl.textContent = fmt(winVal);
  }
  /* NEW GAME control: shown only when the balance can't cover a spin and
     no spin / free-spin session / bonus is running. */
  function updateNewGame() {
    newGameBtn.classList.toggle('on', !spinning && !bonus && freeSpinsLeft <= 0 && credits < totalBet());
  }
  function setControlsEnabled(on) {
    controlsOn = on;
    spinBtn.disabled = !on;
    renderBet();
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
        const cells = sym === 'TX'
          ? `<span class="pv">2× <b>${fmt(Math.round(t[2] * lineBet()))}</b></span>${cell(3)}${cell(4)}`
          : (t[5] ? `${cell(3)}${cell(4)}${cell(5)}` : `${cell(3)}${cell(4)}<span class="pv"></span>`);
        return `<div class="payrow"><div class="thumb"><img src="${ART[sym]}" alt="${NAMES[sym]}"></div><div class="nm">${NAMES[sym]}</div>${cells}</div>`;
      }).join('');
    $('payrows').innerHTML = rows +
      `<div class="payrow"><div class="thumb"><img src="${ART.WD}" alt="WILD"></div><div class="nm">WILD</div><span class="pv wide">Substitutes for every symbol except SCATTER</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X2}" alt="WIN ×2"></div><div class="nm">WIN ×2</div><span class="pv wide">Anywhere on a winning line, this line's win is DOUBLED (×2)</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X3}" alt="WIN ×3"></div><div class="nm">WIN ×3</div><span class="pv wide">Anywhere on a winning line, this line's win is TRIPLED (×3). Two multipliers on the same line multiply together — ×2 and ×3 pay ×6</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.SC}" alt="SCATTER"></div><div class="nm">SCATTER</div><span class="pv wide">3+ anywhere: pays 2× / 8× / 40× total bet + 7 / 10 / 15 FREE SPINS at 2× line wins</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.BN}" alt="BONUS DICE"></div><div class="nm">BONUS DICE</div><span class="pv wide">3+ anywhere starts the DICE ROLL bonus: the pot starts at 0 / ${fmt(Math.round(cfg.bonusStart[4] * lineBet()))} / ${fmt(Math.round(cfg.bonusStart[5] * lineBet()))} for 3 / 4 / 5 dice. Every roll adds its total × ${cfg.diceUnit} × line bet to the pot. Roll a 7 and the pot BUSTS. Bank the pot after any safe roll — or push your luck. Half the time the BONUS WHEEL opens instead: one spin, 12 wedges, every wedge pays × your total bet — MINI 4× · MINOR 9× · MAJOR 15× · GRAND 25×</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.VT}" alt="BET"></div><div class="nm">BET</div><span class="pv wide">Bets run in $25 steps: $25, $50, $75 … all the way up to $2,500 a spin. A step unlocks the first time your balance reaches it — and stays unlocked even if your balance dips. Use the −25 / +25 buttons or MAX BET. NEW GAME resets you to a $25 bet. Your current max is on the machine under the buttons</span></div>`;
  }

  /* ---------- paytable sheet ---------- */
  function openSheet() { paySheet.classList.add('on'); paySheet.setAttribute('aria-hidden', 'false'); sheetBackdrop.classList.add('on'); }
  function closeSheet() { paySheet.classList.remove('on'); paySheet.setAttribute('aria-hidden', 'true'); sheetBackdrop.classList.remove('on'); }
  $('payBtn').addEventListener('click', openSheet);
  $('sheetHandle').addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

  /* ---------- BONUS-SCREEN MINIMUM-VIEW LOCK (Joshua's standing rule,
     2026-11-22): "Make sure you have to see a couple seconds at least of
     the bonus screen before it goes away. It's easy to accidentally push
     it right past it." Every bonus screen arms its lock the moment it
     appears; while locked, a tap that would skip / advance / dismiss it
     is IGNORED — never queued, so a stray tap at 0.5s does not fire at
     2.0s. After 2 seconds every tap works exactly as before. Deliberate
     play inside a bonus (the dice ROLL / BANK buttons) is NOT locked.
     Presentation only: no math, logic or sound changes. */
  const BONUS_MIN_VIEW_MS = 2000;
  const mkViewLock = () => ({
    t: 0,
    arm() { this.t = performance.now(); },
    locked() { return performance.now() - this.t < BONUS_MIN_VIEW_MS; }
  });
  const celebLock = mkViewLock(), wheelLock = mkViewLock();

  /* ---------- celebration screens (Joshua, 2026-11-21 12:52–12:54 CT) ----------
     A bonus or free-spins trigger NEVER cuts straight in: a full-cabinet
     celebration plays first (~3s, tap to skip ahead — never skips the
     prize itself). Input is locked by the overlay while it shows. */
  function celebrate(kind, title, sub, durMs) {
    return new Promise(res => {
      celebEl.className = 'celeb on k-' + kind;
      celebKickEl.textContent = kind === 'bonus' ? 'BONUS' : 'FREE SPINS';
      celebTitleEl.textContent = title;
      celebSubEl.textContent = sub || '';
      celebEl.setAttribute('aria-hidden', 'false');
      celebLock.arm(); /* minimum-view lock: no tap-skip for the first 2s */
      const celebVideo = $('celebVideo');
      const titleFx = $('celebTitleFx');
      /* the settled #15 BONUS title image rides every celebration — bonus AND
         free-spins triggers alike (Joshua, 2026-11-21 20:50 CT) */
      /* The celebration SHOW: Street-Race Victory — the 5s clip Joshua
         picked (2026-11-21 19:34 CT), rebuilt TITLE-FREE: the title rides
         as its own overlay layer (celeb-title.css, one-step swap when his
         graffiti pick lands). The clip carries its own soundtrack, so the
         kit stays quiet under the show; if the clip can't play at all,
         the kit fanfare covers the moment — never a black screen, never
         a hang. Tap skips ahead — never skips the prize itself. */
      if (celebVideo) {
        try {
          celebVideo.classList.remove('dead');
          const seek = () => { try { celebVideo.currentTime = 0.2; } catch (e) {} };
          if (celebVideo.readyState >= 1) seek(); else celebVideo.addEventListener('loadedmetadata', seek, { once: true });
          celebVideo.muted = false;
          const p = celebVideo.play();
          if (p && p.then) p.then(() => {}).catch(() => {
            /* autoplay-with-sound refused: retry muted (show still runs),
               and let the kit fanfare cover the moment */
            celebVideo.muted = true;
            const p2 = celebVideo.play();
            if (p2 && p2.catch) p2.catch(() => celebVideo.classList.add('dead'));
            if (kind === 'bonus') Kit.fanfare(); else Kit.fsFlourish();
          });
          celebVideo.onerror = () => celebVideo.classList.add('dead');
        } catch (e) { celebVideo.classList.add('dead'); if (kind === 'bonus') Kit.fanfare(); else Kit.fsFlourish(); }
      } else if (kind === 'bonus') Kit.fanfare(); else Kit.fsFlourish();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        celebEl.classList.remove('on');
        celebEl.setAttribute('aria-hidden', 'true');
        celebEl.removeEventListener('click', onTap);
        if (celebVideo) { try { celebVideo.pause(); } catch (e) {} }
        res();
      };
      /* a tap inside the first 2s is ignored outright — not queued */
      const onTap = () => { if (celebLock.locked()) return; finish(); };
      celebEl.addEventListener('click', onTap);
      setTimeout(finish, durMs);
    });
  }
  function celebDur() { return 5000; } /* the show runs the full 5s clip (Joshua, 2026-11-21 19:34 CT), tap to skip */

  /* ---------- DICE ROLL bonus game (push your luck) ---------- */
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function drawDie(el, val) {
    el.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const p = document.createElement('span');
      p.className = 'pip' + (PIPS[val].includes(i) ? ' on' : '');
      el.appendChild(p);
    }
  }
  function rollTwoDice() {
    if (typeof window.__diceRoll === 'function') { const r = window.__diceRoll(); return [r[0], r[1]]; }
    return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
  }
  let bonus = null; /* { pot, rolls, isFree, resolve } */
  function openBonus(count, isFree, onDone) {
    const startPot = Math.round(cfg.bonusStart[Math.min(count, 5)] * lineBet());
    bonus = { pot: startPot, rolls: 0, isFree, resolve: onDone, rolling: false };
    bonusTriggerEl.textContent = `${count} BONUS DICE — the pot starts at ${fmt(startPot)}!`;
    bonusPotEl.textContent = fmt(startPot);
    bonusLadderEl.innerHTML = '';
    bonusTotalEl.textContent = '–';
    drawDie(dieEls[0], 3); drawDie(dieEls[1], 4);
    bonusMsgEl.textContent = 'Roll the dice to grow the pot. A 7 busts it all — bank any time.';
    bonusBankBtn.disabled = startPot <= 0;
    bonusRollBtn.disabled = false;
    bonusEl.classList.add('on'); bonusEl.setAttribute('aria-hidden', 'false');
    bonusBackdrop.classList.add('on');
  }
  function closeBonus() {
    bonusEl.classList.remove('on'); bonusEl.setAttribute('aria-hidden', 'true');
    bonusBackdrop.classList.remove('on');
  }
  function endBonus(prize) {
    const b = bonus; bonus = null;
    const finish = () => { closeBonus(); if (b && b.resolve) b.resolve(prize); };
    /* a banked dice pot is an award moment — it celebrates (Joshua, 2026-11-21 20:57 CT) */
    if (prize > 0) celebrate('bonus', 'DICE WIN!', `You banked ${fmt(prize)} credits!`, celebDur()).then(finish);
    else finish();
  }
  bonusRollBtn.addEventListener('click', () => {
    if (!bonus || bonus.rolling) return;
    bonus.rolling = true;
    bonusRollBtn.disabled = true; bonusBankBtn.disabled = true;
    bonusMsgEl.textContent = 'Rolling…';
    Kit.dice(); /* real shake-in-cup, then the roll across the table */
    dieEls.forEach(d => d.classList.add('tumbling'));
    const tumble = setInterval(() => { drawDie(dieEls[0], 1 + Math.floor(Math.random() * 6)); drawDie(dieEls[1], 1 + Math.floor(Math.random() * 6)); }, 90);
    setTimeout(() => {
      clearInterval(tumble);
      dieEls.forEach(d => d.classList.remove('tumbling'));
      if (!bonus) return; /* round already ended (banked) while the dice tumbled — nothing to resolve */
      const [d1, d2] = rollTwoDice();
      drawDie(dieEls[0], d1); drawDie(dieEls[1], d2);
      const total = d1 + d2;
      bonusTotalEl.textContent = String(total);
      bonus.rolls++;
      if (total === 7) {
        const lost = bonus.pot;
        bonusLadderEl.innerHTML += `<div class="rung bust">Roll ${bonus.rolls}: ${d1} + ${d2} = 7 — BUST! The pot of ${fmt(lost)} is gone.</div>`;
        bonusPotEl.textContent = '0';
        bonusMsgEl.textContent = 'BUST! The 7 got you — the pot is gone.';
        Kit.bust(); /* the low bust sting */
        bonus.rolling = false;
        setTimeout(() => endBonus(0), 1500);
        return;
      }
      const add = Math.round(total * cfg.diceUnit * lineBet());
      bonus.pot += add;
      bonusLadderEl.innerHTML += `<div class="rung">Roll ${bonus.rolls}: ${d1} + ${d2} = ${total} → +${fmt(add)} &nbsp;·&nbsp; pot ${fmt(bonus.pot)}</div>`;
      bonusLadderEl.scrollTop = bonusLadderEl.scrollHeight;
      bonusPotEl.textContent = fmt(bonus.pot);
      bonusMsgEl.textContent = `Pot is ${fmt(bonus.pot)}. Bank it — or roll again and risk the 7.`;
      Kit.risingDing(bonus.rolls); /* the note climbs with every safe roll */
      if (bonus.rolls >= 4) setTimeout(() => Kit.tension(), 380); /* deep-run tension */
      bonus.rolling = false;
      bonusRollBtn.disabled = false;
      bonusBankBtn.disabled = false;
    }, 680);
  });
  bonusBankBtn.addEventListener('click', () => {
    if (!bonus || bonus.rolling || bonus.pot <= 0) return;
    const prize = bonus.pot;
    bonusMsgEl.textContent = `Banked ${fmt(prize)} credits!`;
    Kit.bankIt(prize / totalBet()); /* coin-shower celebration */
    setTimeout(() => endBonus(prize), 450);
  });

  /* ---------- BRIDGE RUN bonus game (bonus-pool game, 2026-11-22) ----------
     Joshua's pick #3 from the Skyline bonus boards, built ON Hustle City
     Drag Racing v0.4.5: the race model is that game's stepCar /
     doShiftCar / rpmFor / torqueFactor / rivalShapeAt with fixed street
     builds and 1/8-mile spans, and the engine voice is Drag Racing's own
     oscillator synth (saw + square + sub through a lowpass, blower
     whine, lopey idle, strain wobble at the redline). Race the rival
     across 5 spans paying 2/4/7/12/20x total bet, +20x finish bonus
     (max 40x). After each span: PIT (bank) or RACE ON. 2 engines — a
     lost or blown race costs one. Spans 2 and 4 LOCK their prize.
     Tuned by simulation (sim/bridgerun-sim.js, 4,000 races/span):
     good driving EV = 7.65x bet; perfect play 32.9x; sloppy 0.15x.
     Pool contract (same as Dice Roll): play(opts, onDone) — the game
     resolves onDone(prizeCredits); the CALLER credits the prize. */
  const BR_LADDER = [2, 4, 7, 12, 20];
  const BR_LOCKS = { 2: 4, 4: 12 };
  const BR_FINISH_BONUS = 20;
  const BR_RIVAL_POWER = [1.002, 1.007, 1.022, 1.027, 1.042];
  const BR_SHAPES = ['even', 'launch', 'charge', 'launch', 'charge'];
  const BR_SPAN_M = 201.168; /* 1/8 mile — Drag Racing's 1/8mi split mark */
  const BR_RATIOS = [2.82, 2.15, 1.62, 1.22, 0.81], BR_FINAL_D = 3.7, BR_WHEEL_C = 2.05;
  const BR_REDLINE = 7500, BR_LIMITER = 7680, BR_PERFECT_LO = 6850, BR_PERFECT_HI = 7500;
  const BR_FORCE_K = 5.4, BR_DRAG_C = 0.0005, BR_ROLL_R = 0.25;
  const brRpmFor = (v, g) => v / BR_WHEEL_C * BR_RATIOS[g] * BR_FINAL_D * 60;
  const brTorque = rpm => Math.max(0.78, Math.min(1.14, 1.22 - Math.abs(rpm - 5600) / 12000));
  const brClamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const brNorm = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.73;
  /* Drag Racing v0.4.5 rivalShapeAt, breakpoints scaled to the span */
  function brShapeAt(shape, dist) {
    if (shape === 'launch') { if (dist < 50) return 1.01 - 0.01 * (dist / 50); if (dist < 125) return 1; return 1 - 0.0325 * ((dist - 125) / 76); }
    if (shape === 'charge') { if (dist < 50) return 0.98 + 0.02 * (dist / 50); if (dist < 100) return 1; return 1 + 0.03 * ((dist - 100) / 101); }
    return 1;
  }
  function brNewCar(power, isPlayer) {
    return { v: 0, dist: 0, gear: 0, throttle: 0, power, shiftCut: 0, launched: false, finishT: null,
             slip: 0, redTime: 0, blown: false, isPlayer: !!isPlayer, rpmDisp: 900,
             powerMult: 1.30, forceMult: 1.22, cutP: 0.14, cutN: 0.24, cutKeep: 0.62 };
  }
  function brStep(c, dt, clock) {
    if (!c.launched) return;
    if (c.finishT !== null || c.blown) { /* roll-out: lift, brake, coast — never freeze at the line; a blown motor is dead weight */
      c.throttle = 0;
      const a = -BR_DRAG_C * c.v * c.v - (c.v > 0.01 ? BR_ROLL_R : 0) - 3.4;
      c.v = Math.max(0, c.v + a * dt); c.dist += c.v * dt;
      c.rpmDisp += ((c.v < 0.5 ? 900 : brRpmFor(c.v, c.gear)) - c.rpmDisp) * Math.min(1, dt * 10);
      return;
    }
    const gear = c.gear, rpmC = brRpmFor(c.v, gear);
    let force = 0;
    if (c.throttle > 0 && rpmC < BR_LIMITER) {
      force = c.throttle * c.power * c.powerMult * c.forceMult * BR_FORCE_K * BR_RATIOS[gear] * brTorque(Math.max(rpmC, c.slip > 0 ? 4300 : 0));
      if (c.shiftCut > 0) force *= c.cutKeep;
      if (!c.isPlayer && c.shape) force *= brShapeAt(c.shape, c.dist);
    }
    if (c.shiftCut > 0) c.shiftCut -= dt;
    let a = force - BR_DRAG_C * c.v * c.v - (c.v > 0.01 ? BR_ROLL_R : 0);
    if (c.slip > 0) { a *= 0.60; c.slip -= dt; }
    c.v = Math.max(0, c.v + a * dt);
    c.dist += c.v * dt;
    if (c.isPlayer) { /* hold it in the red 2s and the motor lets go (Drag Racing's law) */
      if (rpmC >= BR_REDLINE && c.throttle > 0) { c.redTime += dt; if (c.redTime >= 2.0) c.blown = true; }
      else c.redTime = Math.max(0, c.redTime - dt * 2);
    }
    let rpm = brRpmFor(c.v, c.gear);
    if (c.slip > 0 && c.throttle > 0) rpm = Math.max(rpm, 4300 + Math.sin(clock * 40) * 120);
    if (c.throttle === 0) rpm = Math.max(rpm, 900);
    c.rpmDisp += (rpm - c.rpmDisp) * Math.min(1, dt * 18);
    if (c.dist >= BR_SPAN_M && c.finishT === null) c.finishT = clock;
  }
  function brShiftCar(c) {
    if (!c.launched || c.finishT !== null || c.blown || c.gear >= 4 || c.shiftCut > 0) return null;
    const rpm = brRpmFor(c.v, c.gear);
    let q = 'good';
    if (rpm >= BR_PERFECT_LO && rpm <= BR_PERFECT_HI) q = 'perfect';
    else if (rpm < 5200) q = 'early';
    else if (rpm > BR_PERFECT_HI) q = 'late';
    c.gear++;
    c.shiftCut = (q === 'perfect') ? c.cutP : c.cutN;
    return q;
  }
  /* Drag Racing's engine voice, ported: saw + square + sub sine through
     a lowpass, roots-blower whine (tier 2 street build), lopey idle,
     valve-float strain wobble near the redline. Runs on the cabinet's
     shared AudioContext and obeys the machine's SOUND toggle. */
  const BrEng = {
    n: null,
    start() {
      const a = ac(); if (!a || this.n) return;
      try {
        const g = a.createGain(); g.gain.value = 0;
        const flt = a.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 900; flt.Q.value = 2;
        const o1 = a.createOscillator(); o1.type = 'sawtooth';
        const o2 = a.createOscillator(); o2.type = 'square';
        const g2 = a.createGain(); g2.gain.value = 0.4;
        const sub = a.createOscillator(); sub.type = 'sine';
        const gs = a.createGain(); gs.gain.value = 0.7;
        o1.connect(flt); o2.connect(g2); g2.connect(flt); sub.connect(gs); gs.connect(flt);
        flt.connect(g); g.connect(a.destination);
        o1.start(); o2.start(); sub.start();
        const wo = a.createOscillator(); wo.type = 'triangle';
        const wg = a.createGain(); wg.gain.value = 0;
        wo.connect(wg); wg.connect(a.destination); wo.start();
        this.n = { g, flt, o1, o2, sub, wo, wg };
      } catch (e) { this.n = null; }
    },
    engine(rpm, throttle, running) {
      if (!this.n) return;
      const a = ac(); if (!a) return;
      const t = a.currentTime, n = this.n;
      if (!soundOn) { n.g.gain.setTargetAtTime(0, t, 0.03); n.wg.gain.setTargetAtTime(0, t, 0.03); return; }
      const strain = brClamp((rpm - 7150) / 500, 0, 1);
      let f = 29 + rpm / 7500 * 138;
      if (strain > 0.03) f *= (1 + 0.012 * Math.sin(t * 47) * strain);
      n.o1.frequency.setTargetAtTime(f, t, 0.03);
      n.o2.frequency.setTargetAtTime(f * 0.5 + 2, t, 0.03);
      n.sub.frequency.setTargetAtTime(f * 0.5, t, 0.03);
      n.flt.frequency.setTargetAtTime(420 + throttle * 2500 + rpm / 7500 * 950, t, 0.05);
      let target = running ? 0.055 + throttle * 0.145 : 0.0;
      if (strain > 0.03) target *= (1 - 0.22 * strain * Math.abs(Math.sin(t * 23)));
      if (running && rpm < 1500) target *= (0.68 + 0.32 * Math.sin(t * 56));
      n.g.gain.setTargetAtTime(target, t, 0.05);
      n.wo.frequency.setTargetAtTime(180 + rpm * 0.34, t, 0.04);
      n.wg.gain.setTargetAtTime(running ? (0.006 + 0.030 * (2 / 3)) * (0.35 + throttle * 0.65) * (rpm / 7500) : 0, t, 0.07);
    },
    stop() { if (this.n) this.engine(0, 0, false); }
  };

  const bridgeEl = $('bridgeGame'), bridgeBackdrop = $('bridgeBackdrop');
  const bridgeTriggerEl = $('bridgeTriggerText'), bridgeMsgEl = $('bridgeMsg');
  const bridgePrizeEl = $('bridgePrize'), bridgeLockedEl = $('bridgeLocked');
  const bridgeSpansEl = $('bridgeSpans'), bridgeEnginesEl = $('bridgeEngines');
  const bridgeCanvas = $('bridgeCanvas'), brCtx = bridgeCanvas.getContext('2d');
  const bridgeFlashEl = $('bridgeFlash'), bridgeBigEl = $('bridgeBigText');
  const bridgeTachFill = $('bridgeTachFill'), bridgeGearEl = $('bridgeGear'), bridgeMphEl = $('bridgeMph');
  const bridgeStartBtn = $('bridgeStartBtn'), bridgeGasBtn = $('bridgeGasBtn'), bridgeShiftBtn = $('bridgeShiftBtn');
  const bridgePitBtn = $('bridgePitBtn'), bridgeRaceBtn = $('bridgeRaceBtn');
  const brTreeBulbs = Array.from(document.querySelectorAll('#bridgeTree .tl'));
  const brImgBackdrop = new Image(); brImgBackdrop.src = 'assets/bridge-backdrop.webp';
  const brImgPlayer = new Image(); brImgPlayer.src = 'assets/bridge-car-player.png';
  const brImgRival = new Image(); brImgRival.src = 'assets/bridge-car-rival.png';

  let bridgeRun = null; /* { bet, resolve, span, engines, cur, locked, phase, clock, ... } */
  let brP = null, brR = null; /* the two cars */
  let brRaf = 0, brLastTs = 0, brAcc = 0;
  let brGasHeld = false, brLaunchRpm = 900, brTreeFired = {}, brGreenAt = 2.3, brSettleEnd = 0, brFlashUntil = 0;

  function brSetPhase(p) { if (bridgeRun) bridgeRun.phase = p; bridgeEl.dataset.phase = p; }
  function brTree(name, on) {
    const idx = { stage: 0, amber1: 1, amber2: 2, amber3: 3, green: 4, red: 5 }[name];
    if (brTreeBulbs[idx]) brTreeBulbs[idx].classList.toggle('on', !!on);
  }
  function brTreeAllOff() { brTreeBulbs.forEach(b => b.classList.remove('on')); }
  function brHud() {
    if (!bridgeRun) return;
    bridgePrizeEl.textContent = fmt(Math.round(bridgeRun.cur * bridgeRun.bet));
    bridgeLockedEl.textContent = fmt(Math.round(bridgeRun.locked * bridgeRun.bet));
    bridgeEnginesEl.innerHTML = [1, 2].map(i =>
      `<span class="br-engine${i <= bridgeRun.engines ? '' : ' lost'}">ENGINE ${i}</span>`).join('');
    bridgeSpansEl.innerHTML = BR_LADDER.map((v, i) => {
      const n = i + 1;
      let cls = 'br-span';
      if (n < bridgeRun.span || (n === bridgeRun.span && bridgeRun.cur >= v)) cls += ' done';
      if (n === bridgeRun.span) cls += ' current';
      if (BR_LOCKS[n] && bridgeRun.locked >= BR_LOCKS[n]) cls += ' locked';
      return `<span class="${cls}">SPAN ${n}<b>${v}×</b>${BR_LOCKS[n] ? '<i>LOCK</i>' : ''}</span>`;
    }).join('');
  }
  function brFlash(text, cls) {
    bridgeFlashEl.textContent = text;
    bridgeFlashEl.className = 'bridge-flash show ' + (cls || '');
    brFlashUntil = performance.now() + 750;
  }
  function brBig(text, cls) {
    bridgeBigEl.textContent = text || '';
    bridgeBigEl.className = 'bridge-bigtext' + (text ? ' show ' : ' ') + (cls || '');
  }
  function brLaunchQuality(rpm) {
    if (rpm >= 5600 && rpm <= 6800) return { slip: 0.80, form: 1.000, label: 'CLEAN LAUNCH!' };
    if (rpm > 6800 && rpm <= 7300) return { slip: 1.00, form: 0.995, label: 'HOT LAUNCH' };
    if (rpm > 7300) return { slip: 1.65, form: 0.970, label: 'WHEELSPIN!' };
    if (rpm >= 4200) return { slip: 1.05, form: 0.985, label: 'SOFT LAUNCH' };
    return { slip: 1.45, form: 0.965, label: 'BOGGED DOWN' };
  }
  function brLaunchPlayer(delay, slip, form) {
    brP.launched = true; brP.launchAt = bridgeRun.clock;
    brP.slip = slip; brP.power = form * (1 + (Math.random() * 2 - 1) * 0.015);
    brP.throttle = brGasHeld ? 1 : 0;
    brFlash(delay <= 0.12 ? 'REACTION ' + delay.toFixed(2) : 'LAUNCH +' + delay.toFixed(2) + 's', 'blue');
  }
  function brStartSpan() {
    const b = bridgeRun; if (!b) return;
    brP = brNewCar(1.0, true);
    const rp = BR_RIVAL_POWER[b.span - 1] * (1 + (Math.random() * 2 - 1) * 0.05);
    brR = brNewCar(rp, false);
    brR.shape = BR_SHAPES[b.span - 1];
    brR.launchDelay = brClamp(0.16 + brNorm() * 0.06, 0.08, 0.45);
    brR.launchSlip = brClamp(0.90 + brNorm() * 0.20, 0.6, 1.5);
    brR.shiftTargets = [0, 1, 2, 3].map(() => 7000 + brNorm() * 300);
    b.clock = 0; brAcc = 0; brTreeFired = {}; brGreenAt = 2.3;
    brLaunchRpm = 900; brGasHeld = false;
    brTreeAllOff(); brBig('');
    brSetPhase('tree');
    bridgeMsgEl.textContent = `Span ${b.span} of 5 — pays ${BR_LADDER[b.span - 1]}×. HOLD GAS to stage your revs (sweet spot 5,600–6,800), launch on GREEN, SHIFT in the green zone!`;
    brHud();
    BrEng.start();
  }
  function brEndRace(win, blown) {
    const b = bridgeRun; if (!b || b.phase !== 'race') return;
    b.result = { win, blown };
    brSettleEnd = b.clock + 0.9;
    brSetPhase('settle');
    if (blown) { brTree('red', true); brBig('MOTOR BLOWN!', 'red'); Kit.engineBust(); BrEng.stop(); }
    else if (win) brBig(`SPAN ${b.span} — YOURS!`, 'blue');
    else brBig('OUTRUN!', 'red');
  }
  function brResolveRace() {
    const b = bridgeRun; if (!b || !b.result) return;
    const { win, blown } = b.result; b.result = null;
    if (win) {
      b.cur = BR_LADDER[b.span - 1];
      if (BR_LOCKS[b.span]) b.locked = Math.max(b.locked, BR_LOCKS[b.span]);
      Kit.risingDing(b.span);
      brHud();
      if (b.span >= 5) { brCollect(b.cur + BR_FINISH_BONUS, true); return; }
      b.nextSpan = b.span + 1;
      brSetPhase('choice');
      bridgeMsgEl.textContent = BR_LOCKS[b.span]
        ? `Span ${b.span} is yours and ${BR_LADDER[b.span - 1]}× is LOCKED IN. PIT and bank ${fmt(Math.round(b.cur * b.bet))}, or RACE ON to span ${b.span + 1} for ${BR_LADDER[b.span]}×.`
        : `Span ${b.span} is yours — prize is ${fmt(Math.round(b.cur * b.bet))}. PIT and bank it, or RACE ON to span ${b.span + 1} for ${BR_LADDER[b.span]}×.`;
    } else {
      b.engines--;
      if (!blown) Kit.bust();
      brHud();
      if (b.engines <= 0) {
        bridgeMsgEl.textContent = blown ? 'Second engine gone — the run is over.' : 'Out of engines — the run is over.';
        brCollect(b.locked, false);
        return;
      }
      b.nextSpan = b.span; /* a lost span is re-run, not skipped */
      brSetPhase('choice');
      bridgeMsgEl.textContent = blown
        ? `That motor is scrap — one engine left. PIT and bank ${fmt(Math.round(b.cur * b.bet))}, or RACE ON and run span ${b.span} again on your last engine.`
        : `The rival took span ${b.span} — one engine left. PIT and bank ${fmt(Math.round(b.cur * b.bet))}, or RACE ON and run span ${b.span} again.`;
    }
  }
  function brCollect(amountX, finishedAll) {
    const b = bridgeRun; if (!b || b.phase === 'collect') return;
    brSetPhase('collect');
    BrEng.stop();
    const prize = Math.round(amountX * b.bet);
    const finish = () => { brClose(); if (b.resolve) b.resolve(prize); };
    if (prize > 0) {
      bridgeMsgEl.textContent = finishedAll
        ? `FULL CROSSING! All five spans plus the finish bonus — Bridge Run pays ${fmt(prize)} credits!`
        : `Banked! Bridge Run pays ${fmt(prize)} credits.`;
      Kit.bankIt(amountX);
      if (finishedAll) setTimeout(() => Kit.jackpot(), 250);
      setTimeout(() => celebrate('bonus', 'BRIDGE RUN!', `You banked ${fmt(prize)} credits!`, celebDur()).then(finish), 700);
    } else {
      bridgeMsgEl.textContent = 'Out of engines with nothing locked in — the bridge keeps this one.';
      setTimeout(finish, 1500);
    }
  }
  function brClose() {
    cancelAnimationFrame(brRaf); brRaf = 0;
    BrEng.stop();
    bridgeRun = null; brP = null; brR = null;
    bridgeEl.classList.remove('on'); bridgeEl.setAttribute('aria-hidden', 'true');
    bridgeBackdrop.classList.remove('on');
  }
  function openBridgeRun(opts, onDone) {
    if (bridgeRun) return;
    opts = opts || {};
    bridgeRun = { bet: totalBet(), resolve: onDone || null, span: 1, engines: 2, cur: 0, locked: 0,
                  phase: 'intro', clock: 0, nextSpan: 1, result: null, introAt: performance.now() };
    brP = brNewCar(1.0, true); brR = brNewCar(1.0, false);
    bridgeTriggerEl.textContent = opts.triggerText || 'Bridge Run — race the rival across five neon spans!';
    bridgeMsgEl.textContent = 'Five spans. Two engines. Read the run, then start yours.';
    brTreeAllOff(); brBig('');
    bridgeStartBtn.disabled = true; /* 2-second bonus-screen minimum view (house rule) */
    setTimeout(() => { if (bridgeRun && bridgeRun.phase === 'intro') bridgeStartBtn.disabled = false; }, 2000);
    brSetPhase('intro');
    brHud();
    bridgeEl.classList.add('on'); bridgeEl.setAttribute('aria-hidden', 'false');
    bridgeBackdrop.classList.add('on');
    brLastTs = performance.now();
    cancelAnimationFrame(brRaf);
    brRaf = requestAnimationFrame(brFrame);
  }
  /* the bonus-pool registry — the $$$ door deals a random game from here */
  window.__bonusPool = window.__bonusPool || { games: {}, register(id, def) { this.games[id] = def; } };
  window.__bonusPool.register('bridgeRun', { title: 'BRIDGE RUN', play: (opts, onDone) => openBridgeRun(opts, onDone) });
  window.__bridgeRunBonus = { play: (opts, onDone) => openBridgeRun(opts, onDone) };
  window.__bridgeRunState = () => bridgeRun ? { phase: bridgeRun.phase, span: bridgeRun.span, engines: bridgeRun.engines, curX: bridgeRun.cur, lockedX: bridgeRun.locked, prize: Math.round(bridgeRun.cur * bridgeRun.bet), playerDist: brP ? Math.round(brP.dist) : 0, rivalDist: brR ? Math.round(brR.dist) : 0, blown: brP ? brP.blown : false } : null;

  function brFrame(ts) {
    if (!bridgeRun) { brRaf = 0; return; }
    brRaf = requestAnimationFrame(brFrame);
    let dt = Math.min(0.05, (ts - brLastTs) / 1000 || 0); brLastTs = ts;
    const b = bridgeRun;
    if (performance.now() > brFlashUntil && bridgeFlashEl.classList.contains('show')) bridgeFlashEl.classList.remove('show');

    if (b.phase === 'tree') {
      b.clock += dt;
      /* stage revs: hold GAS to climb the tach, release and it falls */
      if (brGasHeld) brLaunchRpm = Math.min(7900, brLaunchRpm + 3600 * dt);
      else brLaunchRpm = Math.max(900, brLaunchRpm - 4600 * dt);
      brP.rpmDisp += (brLaunchRpm - brP.rpmDisp) * Math.min(1, dt * 18);
      BrEng.engine(brLaunchRpm, brGasHeld ? 0.85 : 0.15, true);
      const sched = [[0.3, 'stage'], [0.8, 'amber1'], [1.3, 'amber2'], [1.8, 'amber3'], [brGreenAt, 'green']];
      for (const [t, name] of sched) {
        if (b.clock >= t && !brTreeFired[name]) {
          brTreeFired[name] = true; brTree(name, true);
          if (name === 'green') {
            Kit.nearBell();
            brBig('GREEN!', 'green'); setTimeout(() => { if (bridgeRun && bridgeRun.phase === 'race') brBig(''); }, 650);
            brSetPhase('race');
            if (brGasHeld) { const q = brLaunchQuality(brLaunchRpm); brLaunchPlayer(0.10, q.slip, q.form); brFlash(q.label, 'blue'); }
          } else Kit.click();
        }
      }
    } else if (b.phase === 'race' || b.phase === 'settle') {
      brAcc += dt;
      const step = 1 / 240;
      let guard = 0;
      while (brAcc >= step && guard++ < 40) {
        brAcc -= step; b.clock += step;
        if (b.phase === 'race') {
          if (!brP.launched && brGasHeld && b.clock >= brGreenAt) brLaunchPlayer(Math.max(0.10, b.clock - brGreenAt), 1.15, 0.98);
          if (!brR.launched && b.clock >= brGreenAt + brR.launchDelay) { brR.launched = true; brR.slip = brR.launchSlip; brR.throttle = 1; }
          if (brP.launched) brP.throttle = brGasHeld ? 1 : 0;
          if (brR.launched && brR.finishT === null && brR.gear < 4 && brRpmFor(brR.v, brR.gear) >= brR.shiftTargets[brR.gear]) brShiftCar(brR);
        }
        brStep(brP, step, b.clock);
        brStep(brR, step, b.clock);
        if (b.phase === 'race') {
          if (brP.blown) { brEndRace(false, true); break; }
          if (brP.finishT !== null && brR.finishT !== null) { brEndRace(brP.finishT <= brR.finishT, false); break; }
          if (brP.finishT !== null && brR.dist < BR_SPAN_M - 30) { brEndRace(true, false); break; }
          if (brR.finishT !== null && brP.dist < BR_SPAN_M - 30) { brEndRace(false, false); break; }
          if (b.clock - brGreenAt > 15) { brEndRace(brP.dist >= brR.dist, false); break; }
        }
      }
      BrEng.engine(brP ? brP.rpmDisp : 900, brP && brP.launched && brGasHeld ? 1 : 0.25, b.phase === 'race');
      if (b.phase === 'settle' && b.clock >= brSettleEnd) brResolveRace();
    }
    brDraw();
    /* tach + readouts */
    const rpm = brP ? brP.rpmDisp : 900;
    bridgeTachFill.style.width = brClamp(rpm / 8000 * 100, 0, 100) + '%';
    bridgeTachFill.classList.toggle('red', rpm >= BR_REDLINE);
    bridgeGearEl.textContent = brP && brP.launched ? String(brP.gear + 1) : 'N';
    bridgeMphEl.textContent = brP ? String(Math.round(brP.v * 2.23694)) : '0';
  }
  function brDraw() {
    const W = 720, H = 420, c = brCtx;
    if (!c) return;
    const pD = brP ? brP.dist : 0, rD = brR ? brR.dist : 0;
    const cam = (pD + rD) / 2;
    /* sky + far bridge (the picked board's world), slow parallax */
    c.fillStyle = '#040814'; c.fillRect(0, 0, W, H);
    if (brImgBackdrop.complete && brImgBackdrop.naturalWidth) {
      const iw = 981, off = -((cam * 1.2) % iw);
      c.globalAlpha = 0.92;
      c.drawImage(brImgBackdrop, off, 0, iw, 420);
      c.drawImage(brImgBackdrop, off + iw, 0, iw, 420);
      c.globalAlpha = 1;
    }
    /* deck */
    const deckY = 292;
    const grad = c.createLinearGradient(0, deckY, 0, H);
    grad.addColorStop(0, '#0a1428'); grad.addColorStop(0.12, '#060b18'); grad.addColorStop(1, '#03060f');
    c.fillStyle = grad; c.fillRect(0, deckY, W, H - deckY);
    c.fillStyle = 'rgba(64,190,255,0.85)'; c.fillRect(0, deckY, W, 2);
    c.fillStyle = 'rgba(64,190,255,0.30)'; c.fillRect(0, H - 6, W, 2);
    /* lane dashes + distance posts stream past at full speed */
    const pxM = 3.0;
    c.fillStyle = 'rgba(190,225,255,0.5)';
    for (const laneY of [deckY + 44, deckY + 88]) {
      const dashOff = -((cam * pxM) % 46);
      for (let x = dashOff; x < W; x += 46) c.fillRect(x, laneY, 26, 3);
    }
    c.fillStyle = 'rgba(64,190,255,0.75)';
    const postOff = -((cam * pxM) % (25 * pxM));
    for (let x = postOff; x < W; x += 25 * pxM) { c.fillRect(x, deckY - 16, 3, 16); c.fillRect(x - 1, deckY - 20, 5, 5); }
    /* finish gantry for this span */
    const finX = W / 2 + (BR_SPAN_M - cam) * pxM;
    if (finX > -40 && finX < W + 40) {
      c.fillStyle = 'rgba(238,243,249,0.9)';
      c.fillRect(finX - 3, deckY - 118, 6, 118);
      c.fillStyle = 'rgba(64,190,255,0.95)';
      c.fillRect(finX - 60, deckY - 124, 120, 7);
      c.fillStyle = '#eaf6ff'; c.font = '700 15px "Bebas Neue", sans-serif'; c.textAlign = 'center';
      c.fillText('SPAN ' + (bridgeRun ? bridgeRun.span : 1) + ' FINISH', finX, deckY - 130);
    }
    /* cars: rival on the far lane, player on the near lane */
    const drawCar = (img, car, laneBase, w) => {
      if (!car || !img.complete || !img.naturalWidth) return;
      const h = w * (img.naturalHeight / img.naturalWidth);
      const x = W / 2 + (car.dist - cam) * pxM - w / 2;
      const y = laneBase - h;
      /* speed streaks */
      if (car.v > 8) {
        c.strokeStyle = 'rgba(64,190,255,0.35)'; c.lineWidth = 2;
        const n = Math.min(6, 1 + (car.v / 14) | 0);
        for (let i = 0; i < n; i++) {
          const sy = y + h * (0.25 + 0.6 * ((i * 37 % 10) / 10));
          const len = car.v * (0.5 + (i % 3) * 0.22);
          c.beginPath(); c.moveTo(x + 6, sy); c.lineTo(x + 6 - len, sy); c.stroke();
        }
      }
      c.drawImage(img, x, y, w, h);
      if (car.blown) { /* smoke from the dead motor */
        c.fillStyle = 'rgba(160,170,185,0.5)';
        for (let i = 0; i < 5; i++) {
          const sx = x + w * 0.72 + Math.sin(performance.now() / 300 + i) * 6;
          const sy = y + 6 - i * 9 - ((performance.now() / 60) % 12);
          c.beginPath(); c.arc(sx, sy, 6 + i * 2.4, 0, 7); c.fill();
        }
      }
    };
    drawCar(brImgRival, brR, deckY + 62, 168);
    drawCar(brImgPlayer, brP, deckY + 106, 176);
    /* span progress strip */
    if (bridgeRun) {
      c.fillStyle = 'rgba(4,10,22,0.65)'; c.fillRect(0, 0, W, 22);
      c.fillStyle = 'rgba(64,190,255,0.9)';
      c.fillRect(0, 20, W * brClamp(((pD + rD) / 2) / BR_SPAN_M, 0, 1), 2);
      c.fillStyle = '#cfe9ff'; c.font = '600 12px "Bebas Neue", sans-serif'; c.textAlign = 'left';
      c.fillText(`SPAN ${bridgeRun.span} / 5 · YOU ${Math.round(pD)}m · RIVAL ${Math.round(rD)}m · ${Math.round(BR_SPAN_M)}m`, 10, 15);
    }
  }
  bridgeStartBtn.addEventListener('click', () => {
    if (!bridgeRun || bridgeRun.phase !== 'intro') return;
    if (performance.now() - bridgeRun.introAt < 2000) return; /* minimum-view lock */
    Kit.click();
    brStartSpan();
  });
  const brGasOn = e => { e.preventDefault(); brGasHeld = true; bridgeGasBtn.classList.add('held'); };
  const brGasOff = () => { brGasHeld = false; bridgeGasBtn.classList.remove('held'); };
  bridgeGasBtn.addEventListener('pointerdown', brGasOn);
  bridgeGasBtn.addEventListener('pointerup', brGasOff);
  bridgeGasBtn.addEventListener('pointerleave', brGasOff);
  bridgeGasBtn.addEventListener('pointercancel', brGasOff);
  bridgeShiftBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!bridgeRun || bridgeRun.phase !== 'race' || !brP || !brP.launched) return;
    const q = brShiftCar(brP);
    if (!q) return;
    if (q === 'perfect') { brFlash('PERFECT SHIFT!', 'blue'); Kit.peg(); }
    else if (q === 'good') { brFlash('GOOD SHIFT', ''); Kit.thunk(); }
    else if (q === 'early') { brFlash('EARLY — BOGGED', 'red'); Kit.thunk(); }
    else { brFlash('LATE SHIFT!', 'red'); Kit.thunk(); }
  });
  bridgePitBtn.addEventListener('click', () => {
    if (!bridgeRun || bridgeRun.phase !== 'choice') return;
    brCollect(bridgeRun.cur, false);
  });
  bridgeRaceBtn.addEventListener('click', () => {
    if (!bridgeRun || bridgeRun.phase !== 'choice') return;
    bridgeRun.span = bridgeRun.nextSpan;
    Kit.click();
    brStartSpan();
  });

  /* ---------- BONUS WHEEL (ported from Pearl's Paws, 2026-11-22) ----------
     Alongside the Dice Roll bonus, replaces nothing: when the dice bonus
     would open, cfg.wheelShare of triggers open this wheel instead (see
     doSpin) — bonus frequency unchanged by construction. Dressed midnight
     deco: deep blue/black wedges, a machined chrome rim with bolts,
     electric-blue glow, red neon reserved for the GRAND wedge. NO GOLD.
     Physics mirror Pearl's: the winning wedge is drawn first, then the
     wheel spins (6 full turns, quartic ease-out 5.6–6.3s, real-kit peg
     clicks + pointer flick, near-GRAND Kit.nearBell) and settles exactly
     on it. Pay = wedge × total bet, presented on a chrome prize plaque. */
  const WEDGES = cfg.wheel, TIERS = cfg.wheelTiers || {};
  const WSEG = 360 / WEDGES.length;
  let wheelBuilt = false, wheelAngle = 0, wheelSpinning = false, wheelArmed = null;
  let lastBonusPaid = 0;
  const SVGNS = 'http://www.w3.org/2000/svg';
  function wedgeFill(v, i) {
    if (TIERS[v] === 'GRAND') return 'url(#wgGrand)';
    if (TIERS[v] === 'MAJOR') return 'url(#wgMajor)';
    if (TIERS[v] === 'MINOR') return 'url(#wgMinor)';
    if (TIERS[v] === 'MINI') return 'url(#wgMini)';
    return i % 2 ? 'url(#wgA)' : 'url(#wgB)';
  }
  function buildWheel() {
    if (wheelBuilt) return;
    wheelBuilt = true;
    /* machined bolts around the static chrome rim */
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
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', `M ${x0} ${y0} A ${rO} ${rO} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${rI} ${rI} 0 0 0 ${x3} ${y3} Z`);
      p.setAttribute('fill', wedgeFill(v, i));
      p.setAttribute('stroke', 'rgba(3,6,14,.85)');
      p.setAttribute('stroke-width', '1.6');
      wheelRotor.appendChild(p);
      /* label group at the wedge center angle */
      const g = document.createElementNS(SVGNS, 'g');
      const mid = i * WSEG;
      g.setAttribute('transform', `rotate(${mid} ${cx} ${cy})`);
      if (TIERS[v]) {
        const star = document.createElementNS(SVGNS, 'use');
        star.setAttribute('href', '#wgStar');
        star.setAttribute('transform', `translate(${cx} ${cy - rO + 22}) scale(0.55)`);
        star.setAttribute('fill', TIERS[v] === 'GRAND' ? '#ffd7da' : '#0a1526');
        star.setAttribute('stroke', TIERS[v] === 'GRAND' ? '#ffffff' : '#6fc2ff');
        star.setAttribute('stroke-width', '1.4');
        g.appendChild(star);
        const t1 = document.createElementNS(SVGNS, 'text');
        t1.setAttribute('x', cx); t1.setAttribute('y', cy - rO + 50);
        t1.setAttribute('class', 'wlabel tier' + (TIERS[v] === 'GRAND' ? ' grand' : ''));
        t1.textContent = TIERS[v];
        const t2 = document.createElementNS(SVGNS, 'text');
        t2.setAttribute('x', cx); t2.setAttribute('y', cy - rO + 68);
        t2.setAttribute('class', 'wlabel tierval' + (TIERS[v] === 'GRAND' ? ' grand' : ''));
        t2.textContent = v + '×';
        g.appendChild(t1); g.appendChild(t2);
      } else {
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', cx); t.setAttribute('y', cy - rO + 62);
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
            if (nearGrand) Kit.nearBell(); else Kit.peg();
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
      wheelOverlay.classList.add('on');
      wheelOverlay.setAttribute('aria-hidden', 'false');
      wheelLock.arm(); /* minimum-view lock: the wheel must be seen 2s before a tap can spin it */
      wheelPrize.classList.remove('on');
      wheelMsg.textContent = 'Pull the arm — or tap SPIN!';
      msgEl.textContent = 'BONUS WHEEL! Pull the arm or tap SPIN to spin the wheel!';
      betDownBtn.disabled = true; betUpBtn.disabled = true; maxBetBtn.disabled = true;
      spinBtn.disabled = false;
      spinFace.textContent = 'SPIN THE WHEEL';
      const lv = $('lever');
      if (lv) { lv.classList.remove('off'); lv.setAttribute('aria-disabled', 'false'); }
      wheelArmed = async () => {
        wheelArmed = null;
        spinBtn.disabled = true;
        const idx = (typeof forceIdx === 'number') ? forceIdx : Math.floor(Math.random() * WEDGES.length);
        const val = WEDGES[idx];
        wheelMsg.textContent = 'The wheel is spinning…';
        await spinWheelPhysics(idx);
        const pay = Math.round(val * betAtTrigger);
        {
          const tier = TIERS[val];
          wheelPrize.querySelector('.plaque-amt').textContent = '+' + fmt(pay);
          wheelPrize.classList.add('on');
          if (tier === 'GRAND') {
            wheelMsg.innerHTML = `GRAND! The wheel pays <b>${fmt(pay)}</b> credits!`;
            Kit.jackpot();
            await celebrate('bonus', 'GRAND!', `The wheel's top wedge — ${fmt(pay)} credits!`, celebDur());
          } else if (tier) {
            wheelMsg.innerHTML = `${tier}! The wheel pays <b>${fmt(pay)}</b> credits!`;
            Kit.jackpot();
          } else {
            wheelMsg.innerHTML = `The wheel pays <b>${fmt(pay)}</b> credits!`;
            Kit.win(val);
          }
        }
        if (pay > 0) {
          const before = parseInt(winEl.textContent.replace(/[^0-9]/g, ''), 10) || 0;
          credits += pay;
          await countUp(winEl, before, before + pay, Math.min(1500, 400 + pay));
          renderReadouts(before + pay);
          lastBonusPaid = pay;
          save();
        }
        setTimeout(() => {
          wheelOverlay.classList.remove('on');
          wheelOverlay.setAttribute('aria-hidden', 'true');
          spinFace.textContent = 'SPIN'; /* restore the resting face (the wheel borrowed it) */
          resolve(pay);
        }, 2100);
      };
    });
  }

  /* ---------- spin flow ---------- */
  async function doSpin(isFree) {
    if (spinning) return;
    spinning = true;
    setControlsEnabled(false);
    clearWinMarks();
    winEl.textContent = '0';
    if (!isFree) {
      if (credits < totalBet()) {
        msgEl.textContent = credits <= 0 ? 'Out of credits — hit NEW GAME below to start over with 1,000.' : 'Not enough credits for that bet — lower the bet or hit NEW GAME.';
        spinning = false; setControlsEnabled(true);
        updateNewGame();
        return;
      }
      credits -= totalBet();
      renderReadouts();
      Kit.lever(); /* the real lever pull that starts a paid spin */
    }
    newGameBtn.classList.remove('on');
    msgEl.textContent = isFree ? `Free spin — ${freeSpinsLeft} left after this one. Wins pay double!` : 'Good luck!';
    const finalStops = core.randomStops(Math.random, cfg.strips);
    const durations = [1700, 1900, 2100, 2300, 2500]; /* staggered stops, reel 1 first, ~200ms apart */
    setStopMode(true);
    if (soundOn) Kit.rollStart();
    await Promise.all(finalStops.map((_, r) => spinReel(r, finalStops, durations[r])));
    Kit.rollStop(false);
    setStopMode(false);
    spinBtn.disabled = true; /* payout / bonus phase: button rests until controls return */
    reelStoppers.length = 0;
    stops = finalStops;
    const grid = core.windowForStops(cfg.strips, stops);
    const ev = core.evaluateGrid(grid, lineBet(), cfg);
    const mult = isFree ? core.FREE_SPIN_MULTIPLIER : 1;
    const linePay = ev.lineWinTotal * mult;
    let totalWin = Math.round(linePay + ev.scatterPay);

    for (const w of ev.lineWins) {
      for (let r = 0; r < w.count; r++) markCell(r, w.rows[r], 'win');
      if (w.mult > 1 && w.multCells) for (const r of w.multCells) markCell(r, core.PAYLINES[w.line - 1][r], 'win');
    }
    if (ev.scatterCount >= 1) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'SC') markCell(r, row, 'scatterhit');
    if (ev.bonus) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'BN') markCell(r, row, 'bonushit');

    if (totalWin > 0) {
      winFlash.classList.add('on');
      Kit.win(totalWin / totalBet());
      await countUp(winEl, 0, totalWin, Math.min(1400, 350 + totalWin));
      credits += totalWin;
      if (isFree) freeSpinTotal += totalWin;
    }
    renderReadouts(totalWin);
    save();

    const finishSpin = () => {
      if (ev.freeSpins > 0) {
        freeSpinsLeft += ev.freeSpins;
        fsBanner.textContent = `${ev.freeSpins} FREE SPINS — LINE WINS ×2`;
        fsBanner.classList.add('on');
        msgEl.textContent = `${ev.scatterCount} scatters! ${ev.freeSpins} free spins${isFree ? ' added' : ''} — here they come!`;
        spinning = false;
        /* celebration first, then the spins (Joshua, 12:54 CT) */
        celebrate('fs', `${ev.freeSpins} FREE SPINS!`, 'Line wins pay DOUBLE — here they come!', celebDur())
          .then(() => setTimeout(runFreeSpins, 350));
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
      spinning = false;
      setControlsEnabled(true);
      updateNewGame();
    };

    if (!ev.bonus && ev.lineWins.some(w => w.count >= 5)) {
      /* FIVE OF A KIND celebrates too (Joshua, 2026-11-21 20:57 CT) */
      await celebrate('bonus', 'FIVE OF A KIND!', 'Five on a line — that is a big one!', celebDur());
    }
    if (ev.bonus) {
      /* Trigger split (2026-11-22): the BONUS WHEEL joins Dice Roll
         alongside it — when the dice bonus would open, wheelShare of
         triggers open the wheel instead. The celebration fires for the
         wheel trigger the same way, before the wheel opens. Bonus
         frequency is unchanged by construction. */
      if (Math.random() < cfg.wheelShare) {
        msgEl.textContent = `${ev.bonusCount} bonus dice — BONUS WHEEL!`;
        spinning = false;
        await celebrate('bonus', 'BONUS WHEEL!', `${ev.bonusCount} bonus dice — spin the wheel!`, celebDur());
        const wheelPay = await runBonusWheel(totalBet());
        if (wheelPay > 0) {
          if (isFree) freeSpinTotal += wheelPay;
          totalWin += wheelPay;
        }
        spinning = true;
        finishSpin();
        return;
      }
      msgEl.textContent = `${ev.bonusCount} bonus dice — DICE ROLL bonus!`;
      spinning = false;
      /* celebrate first, THEN the dice come out (Joshua, 12:52 CT) */
      await celebrate('bonus', 'DICE ROLL!', `${ev.bonusCount} bonus dice — push your luck!`, celebDur());
      {
        openBonus(ev.bonusCount, isFree, async prize => {
          if (prize > 0) {
            const before = parseInt(winEl.textContent.replace(/[^0-9]/g, ''), 10) || 0;
            await countUp(winEl, before, before + prize, Math.min(1200, 300 + prize));
            credits += prize;
            if (isFree) freeSpinTotal += prize;
            totalWin += prize;
            renderReadouts(totalWin);
            save();
          }
          spinning = true;
          finishSpin();
        });
      }
      return;
    }
    finishSpin();
  }
  function runFreeSpins() { if (freeSpinsLeft > 0 && !spinning) doSpin(true); }

  $('wheelSpinBtn').addEventListener('click', () => {
    if (wheelArmed) { if (wheelLock.locked()) return; const f = wheelArmed; ac(); f(); }
  });
  spinBtn.addEventListener('click', () => {
    if (wheelArmed) { if (wheelLock.locked()) return; const f = wheelArmed; ac(); f(); return; }
    ac();
    if (reelsRolling) { requestStop(); return; }
    if (!spinning) doSpin(false);
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
  const machineBusy = () => spinning || !!bonus || wheelSpinning || !!bridgeRun;
  function leverFire() { if (!machineBusy()) spinBtn.click(); }
  function leverScriptedPull() {
    leverArm.style.transition = 'transform .16s ease-in';
    leverArm.style.transform = `translateY(${LEVER_MAX}px)`;
    setTimeout(() => { leverSet(0, true); leverFire(); }, 175);
  }
  if (leverEl && leverArm) {
    leverEl.addEventListener('pointerdown', e => {
      if (machineBusy()) return;
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
      if ((e.key === 'Enter' || e.key === ' ') && !machineBusy()) { e.preventDefault(); leverScriptedPull(); }
    });
  }
  betDownBtn.addEventListener('click', () => { betSel = Math.max(BET_MIN, betSel - BET_STEP); renderReadouts(); buildPaytable(); updateNewGame(); sTick(); });
  betUpBtn.addEventListener('click', () => { betSel = Math.min(unlockedMax(), betSel + BET_STEP); renderReadouts(); buildPaytable(); updateNewGame(); sTick(); });
  maxBetBtn.addEventListener('click', () => { betSel = unlockedMax(); renderReadouts(); buildPaytable(); updateNewGame(); sTick(); });
  newGameBtn.addEventListener('click', () => {
    if (machineBusy()) return;
    credits = 1000; betSel = BET_MIN; peak = 1000;
    freeSpinsLeft = 0; freeSpinTotal = 0;
    fsBanner.classList.remove('on'); fsBanner.textContent = '';
    clearWinMarks();
    renderReadouts(0); buildPaytable(); updateNewGame(); save();
    msgEl.textContent = 'New game — 1,000 fresh credits. Bet is back to $25; bigger bets unlock again as your balance grows. Good luck!';
    Kit.coin();
  });
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundStateEl.textContent = soundOn ? 'ON' : 'OFF';
    save();
    if (soundOn) sTick(); else Kit.stopAll();
  });
  /* QA hook: force states / inspect the kit (mirrors Casino Classics) */
  window.__slotsDebug = {
    setCredits: n => { credits = Math.max(0, n | 0); if (credits > peak) peak = credits; renderReadouts(); updateNewGame(); save(); },
    celebrate: (kind, title, sub, dur) => celebrate(kind || 'bonus', title || 'DICE ROLL!', sub || '', dur || 3000),
    kit: Kit,
    openBonus: (count, isFree) => openBonus(count || 3, !!isFree, () => setControlsEnabled(true)),
    wheel: (idx) => runBonusWheel(totalBet(), idx),
    openBridgeRun: () => {
      if (machineBusy()) return 'busy';
      openBridgeRun({}, async prize => {
        if (prize > 0) { /* credit exactly like the spin flow's bonus resolve */
          const before = parseInt(winEl.textContent.replace(/[^0-9]/g, ''), 10) || 0;
          await countUp(winEl, before, before + prize, Math.min(1200, 300 + prize));
          credits += prize;
          renderReadouts(prize);
          save();
        }
        setControlsEnabled(true);
      });
      return 'ok';
    },
    bridgeState: () => window.__bridgeRunState(),
    getState: () => ({ credits, bet: betSel, betPerLine: lineBet(), maxBet: unlockedMax(), peak, spinning, bonus: !!bonus, wheelArmed: !!wheelArmed, wheelSpinning, lastBonusPaid, stops: stops.slice() })
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
  updateNewGame();
})();
