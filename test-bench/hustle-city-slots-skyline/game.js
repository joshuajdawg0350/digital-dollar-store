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
      `<div class="payrow"><div class="thumb"><img src="${ART.BN}" alt="BONUS DICE"></div><div class="nm">BONUS DICE</div><span class="pv wide">3+ anywhere starts the DICE ROLL bonus: the pot starts at 0 / ${fmt(Math.round(cfg.bonusStart[4] * lineBet()))} / ${fmt(Math.round(cfg.bonusStart[5] * lineBet()))} for 3 / 4 / 5 dice. Every roll adds its total × ${cfg.diceUnit} × line bet to the pot. Roll a 7 and the pot BUSTS. Bank the pot after any safe roll — or push your luck</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.VT}" alt="BET"></div><div class="nm">BET</div><span class="pv wide">Bets run in $25 steps: $25, $50, $75 … all the way up to $2,500 a spin. A step unlocks the first time your balance reaches it — and stays unlocked even if your balance dips. Use the −25 / +25 buttons or MAX BET. NEW GAME resets you to a $25 bet. Your current max is on the machine under the buttons</span></div>`;
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
  function celebrate(kind, title, sub, durMs) {
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
    closeBonus();
    if (b && b.resolve) b.resolve(prize);
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
        fsBanner.textContent = `★ ${ev.freeSpins} FREE SPINS ★ LINE WINS ×2 ★`;
        fsBanner.classList.add('on');
        msgEl.textContent = `${ev.scatterCount} scatters! ${ev.freeSpins} free spins${isFree ? ' added' : ''} — here they come!`;
        spinning = false;
        /* celebration first, then the spins (Joshua, 12:54 CT) */
        celebrate('fs', `${ev.freeSpins} FREE SPINS!`, 'Line wins pay DOUBLE — here they come!', 2400)
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

    if (ev.bonus) {
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

  spinBtn.addEventListener('click', () => {
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
  const machineBusy = () => spinning || !!bonus;
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
    getState: () => ({ credits, bet: betSel, betPerLine: lineBet(), maxBet: unlockedMax(), peak, spinning, bonus: !!bonus, stops: stops.slice() })
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
