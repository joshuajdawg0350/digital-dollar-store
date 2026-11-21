/* Hustle City Slots — Casino Classics · v2 cabinet UI.
   Presentation layer rebuilt 2026-11-21 around generated chrome/blue art assets.
   Engine (logic.js) + strips/paytable (machines.js): 5x3, 20 paylines, weighted
   strips, WILD substitutes, X2/X3 line multipliers, SCATTER free spins, BONUS
   Pick-a-Garage (3+ garage doors on a paid spin), NO blank stops (every reel
   position is a real symbol), total RTP 98.02% incl. the bonus game's share.
   v2.3 (2026-11-21, Joshua's orders): photoreal garage art with the real HC3
   Big Body Scotty on the bust reveal; garage fires ~1 in 38.6 paid spins (the
   ~1-in-40 bonus standard), free spins at the same rate; SPIN becomes STOP
   while the reels turn; NEW GAME restarts a broke player at 1,000 credits;
   the max bet climbs tiers as the balance grows; the reels ROLL — a noise-bed
   rolling/clatter sound tracks reel speed instead of synth ticks.
   Cabinet wears the v2 chrome + electric-blue treatment (restored at Joshua's
   order 2026-11-21); cherries are electric red, the dollar sign electric green.
   Reels spin with real-machine motion: spin-up acceleration, motion blur at
   speed, staggered stops 1-2-3-4-5, and a spring settle with a small recoil.
   Pull arm + SPIN button both fire the same spin.
   Play credits only. (c) 2026 J-Dawgs Industries. */
'use strict';
(function () {
  const core = window.SlotCore;
  const cfg = window.SlotMachines.CLASSICS;
  const LS_KEY = 'hcslots-classics-v2';

  const ART = {
    DL: 'assets/sym-dl.webp', SV: 'assets/sym-sv.webp', CH: 'assets/sym-ch.webp',
    HS: 'assets/sym-hs.webp', BL: 'assets/sym-bl.webp', B1: 'assets/sym-b1.webp',
    WD: 'assets/sym-wd.webp', SC: 'assets/sym-sc.webp', BN: 'assets/sym-bn.webp',
    X2: 'assets/sym-x2.webp', X3: 'assets/sym-x3.webp'
  };
  const NAMES = {
    DL: 'Dollar Sign', SV: 'Seven', HS: 'Horseshoe', CH: 'Cherry',
    BL: 'Bell', B1: 'BAR', WD: 'WILD', SC: 'SCATTER', BN: 'BONUS',
    X2: 'WIN ×2', X3: 'WIN ×3'
  };

  const $ = id => document.getElementById(id);
  const reelsEl = [$('reel0'), $('reel1'), $('reel2'), $('reel3'), $('reel4')];
  const creditsEl = $('credits'), betEl = $('bet'), winEl = $('win'), msgEl = $('msg');
  const spinBtn = $('spinBtn'), betDownBtn = $('betDownBtn'), betUpBtn = $('betUpBtn'), maxBetBtn = $('maxBetBtn');
  const celebEl = $('celeb'), celebKickEl = $('celebKick'), celebTitleEl = $('celebTitle'), celebSubEl = $('celebSub');
  const fsBanner = $('fsBanner'), newGameBtn = $('newGameBtn'), soundBtn = $('soundBtn');
  const spinFace = spinBtn.querySelector('.spin-face'), tierLineEl = $('tierLine');
  const soundStateEl = $('soundState'), winFlash = $('winFlash');
  const paySheet = $('paySheet'), sheetBackdrop = $('sheetBackdrop');
  const bonusGame = $('bonusGame'), bonusBackdrop = $('bonusBackdrop');
  const trunksEl = $('trunks'), bonusBankEl = $('bonusBank');
  const bonusResultEl = $('bonusResult'), bonusCollectBtn = $('bonusCollect');

  const START_CREDITS = 1000;
  /* Bet ladder (Joshua, 2026-11-21 13:02 CT): the bet is a TOTAL bet per
     spin in $25 steps — 25, 50, 75 … up to 2,500. A step unlocks the first
     time the player's PEAK balance reaches it and stays unlocked even if
     the balance dips (sticky); only NEW GAME resets it. Internally the
     engine still bets per line: line bet = total ÷ 20 lines (fractional is
     fine — payouts scale linearly, wins are rounded to whole credits when
     paid, so RTP is unchanged at every step). */
  const BET_STEP = 25, BET_MIN = 25, BET_MAX = 2500;
  let credits = START_CREDITS, betSel = BET_MIN, peak = START_CREDITS, lastUnlocked = BET_MIN, spinning = false;
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
  const sTick = () => Kit.click();
  const sStop = () => Kit.thunk();

  /* ---------- rolling reel sound ----------
     Joshua (2026-11-21): the reels must ROLL — a mechanical rolling/clatter
     that tracks the spin, not synth blips. A looped noise bed (low rumble +
     grit) runs through a band-pass filter; its loudness, filter pitch and
     playback rate follow the fastest reel's speed — rising on spin-up,
     rolling through cruise, falling as each reel brakes. Every symbol that
     passes adds a short ratchet clack, and each reel landing keeps the low
     mechanical clunk (sStop). When the last reel lands — naturally or via
     STOP — the roll cuts with it. Win jingles are untouched. */
  const RollSound = (() => {
    let graph = null, activeReels = 0, level = 0;
    function ensure() {
      const a = ac(); if (!a) return null;
      if (graph) return graph;
      const len = a.sampleRate;
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = (last * 3.2 + w * 0.28) * 0.7; }
      const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
      const filt = a.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 420; filt.Q.value = 0.7;
      const g = a.createGain(); g.gain.value = 0;
      src.connect(filt); filt.connect(g); g.connect(a.destination);
      src.start();
      graph = { a, src, filt, g, buf };
      return graph;
    }
    function reelStart() {
      activeReels++;
      if (!soundOn) return;
      const gr = ensure(); if (!gr) return;
      gr.g.gain.setTargetAtTime(Math.max(gr.g.gain.value, 0.015), gr.a.currentTime, 0.05);
    }
    function setSpeed(norm) {
      if (!graph || !soundOn) return;
      const n = Math.max(0, Math.min(1, norm));
      level = n > level ? n : level + (n - level) * 0.25;
      const t = graph.a.currentTime;
      graph.g.gain.setTargetAtTime(0.015 + 0.085 * level, t, 0.06);
      graph.filt.frequency.setTargetAtTime(320 + 780 * level, t, 0.06);
      graph.src.playbackRate.setTargetAtTime(0.72 + 0.55 * level, t, 0.06);
    }
    function clack(v) {
      if (!soundOn || !graph) return;
      const a = graph.a;
      const s = a.createBufferSource(); s.buffer = graph.buf;
      s.playbackRate.value = 1.4 + Math.random() * 0.5;
      const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500 + Math.random() * 500; f.Q.value = 1.1;
      const g = a.createGain();
      const t = a.currentTime;
      g.gain.setValueAtTime(Math.min(0.05, 0.014 + v / 24000), t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.045);
      s.connect(f); f.connect(g); g.connect(a.destination);
      s.start(t, Math.random() * 0.4, 0.06);
    }
    function reelDone() {
      activeReels = Math.max(0, activeReels - 1);
      if (activeReels === 0 && graph) {
        level = 0;
        graph.g.gain.setTargetAtTime(0, graph.a.currentTime, 0.045);
      }
    }
    function cut() { /* sound toggled off mid-spin: silence the roll at once */
      activeReels = 0; level = 0;
      if (graph) graph.g.gain.setTargetAtTime(0, graph.a.currentTime, 0.02);
    }
    return { reelStart, setSpeed, clack, reelDone, cut, isActive: () => activeReels > 0, level: () => level };
  })();
  /* STOP support: every spinning reel registers its finisher here; STOP
     calls them all and each reel lands cleanly on its dealt stop. */
  const activeReelStops = new Set();
  function stopAllReels() { for (const f of [...activeReelStops]) f(); }

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

  /* Real-machine reel motion, driven by requestAnimationFrame physics:
     spin-UP acceleration from rest (~0.30s), a cruise at peak speed with
     speed-proportional motion blur, a firm deceleration, then a spring
     settle over the last fraction of a cell that overshoots a hair and
     recoils ONCE onto the stop. The symbol sequence and the dealt result
     are exactly the engine's — only the motion is new. */
  function spinReel(r, finalStops, duration) {
    return new Promise(resolve => {
      const reel = reelsEl[r], H = cellH(r), strip = cfg.strips[r];
      const grid = core.windowForStops(cfg.strips, finalStops);
      const seq = [];
      seq.push(...core.windowForStops(cfg.strips, stops)[r]);
      const extra = 14 + r * 5;
      let idx = Math.floor(Math.random() * strip.length);
      for (let i = 0; i < extra; i++) { seq.push(strip[idx % strip.length]); idx++; }
      seq.push(...grid[r]);
      const track = document.createElement('div');
      track.className = 'track';
      track.innerHTML = seq.map(s => cellHTML(s, H)).join('');
      reel.innerHTML = '';
      reel.appendChild(track);

      const D = (seq.length - 3) * H;              /* total travel, px */
      const motion = core.createReelMotion(D, H, duration);
      let last = performance.now(), lastCell = 0, lastTick = 0, lastBlur = 0;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(hardStop);
        activeReelStops.delete(finish);
        track.style.filter = '';
        track.innerHTML = grid[r].map(s => cellHTML(s, H)).join('');
        track.style.transform = 'translateY(0px)';
        sStop();
        RollSound.reelDone();
        resolve();
      };
      const hardStop = setTimeout(finish, duration + 1600);
      activeReelStops.add(finish);
      RollSound.reelStart();
      function frame(now) {
        if (finished) return;
        /* dt clamp is generous (0.25s) so a slow device still spins in
           real time — the integrator substeps keep the spring stable */
        const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
        last = now;
        const { p, v, done } = motion.step(dt);
        if (done) { finish(); return; }
        RollSound.setSpeed(v / motion.vmax);
        track.style.transform = `translateY(${-p}px)`;
        const blur = v > 320 ? Math.min(3.2, (v - 320) / 260) : 0;
        if (Math.abs(blur - lastBlur) >= 0.3 || (blur === 0 && lastBlur !== 0)) {
          track.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px)` : '';
          lastBlur = blur;
        }
        const cell = Math.floor(p / H);
        if (cell !== lastCell) {
          lastCell = cell;
          if (now - lastTick >= 45) { RollSound.clack(v); lastTick = now; }
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  /* ---------- readouts / controls ---------- */
  function renderReadouts(winVal) {
    creditsEl.textContent = fmt(credits);
    betEl.textContent = fmt(totalBet());
    if (typeof winVal === 'number') winEl.textContent = fmt(winVal);
  }
  let controlsOn = true;
  function renderBet() {
    betDownBtn.disabled = !controlsOn || betSel <= BET_MIN;
    betUpBtn.disabled = !controlsOn || betSel >= unlockedMax();
    maxBetBtn.disabled = !controlsOn;
    renderTier();
  }
  function setControlsEnabled(on) {
    controlsOn = on;
    spinBtn.disabled = !on;
    renderBet();
    const lv = $('lever');
    if (lv) { lv.classList.toggle('off', !on); lv.setAttribute('aria-disabled', String(!on)); }
  }
  /* While the reels turn, SPIN becomes STOP (Joshua, 2026-11-21): tapping it
     lands every reel on its dealt stop at once — results and payouts are
     exactly the ones the spin dealt. */
  function setStopMode(on) {
    if (on) {
      spinBtn.disabled = false;
      spinBtn.classList.add('stop');
      spinFace.textContent = 'STOP';
      spinBtn.setAttribute('aria-label', 'Stop the reels');
    } else {
      spinBtn.classList.remove('stop');
      spinFace.textContent = 'SPIN';
      spinBtn.setAttribute('aria-label', 'Spin the reels');
    }
  }
  function renderTier() {
    const um = unlockedMax();
    tierLineEl.textContent = um < BET_MAX
      ? `MAX BET ${fmt(um)} · ${fmt(um + BET_STEP)} UNLOCKS AT ${fmt(um + BET_STEP)} BALANCE`
      : `MAX BET ${fmt(um)} · TOP BET UNLOCKED`;
  }
  let levelUpMsg = null;
  /* Track the PEAK balance; a new peak that crosses a $25 step unlocks
     that bet for good (until NEW GAME). */
  function notePeak(announce) {
    if (credits > peak) peak = credits;
    const um = unlockedMax();
    if (um > lastUnlocked) {
      lastUnlocked = um;
      renderTier();
      save();
      tierLineEl.classList.remove('bump'); void tierLineEl.offsetWidth; tierLineEl.classList.add('bump');
      if (announce) {
        Kit.win(1);
        levelUpMsg = `NEW MAX BET UNLOCKED — your balance peak hit ${fmt(peak)}, so you can now bet up to ${fmt(um)} a spin!`;
      }
    }
    if (betSel > um) { betSel = um; renderReadouts(); }
  }
  const checkTierUnlock = notePeak;
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
        const cells = sym === 'CH'
          ? `<span class="pv">2× <b>${fmt(Math.round(t[2] * lineBet()))}</b></span>${cell(3)}${cell(4)}`
          : (t[5] ? `${cell(3)}${cell(4)}${cell(5)}` : `${cell(3)}${cell(4)}<span class="pv"></span>`);
        return `<div class="payrow"><div class="thumb"><img src="${ART[sym]}" alt="${NAMES[sym]}"></div><div class="nm">${NAMES[sym]}</div>${cells}</div>`;
      }).join('');
    $('payrows').innerHTML = rows +
      `<div class="payrow"><div class="thumb"><img src="${ART.WD}" alt="WILD"></div><div class="nm">WILD</div><span class="pv wide">Substitutes for every symbol except SCATTER</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X2}" alt="WIN ×2"></div><div class="nm">WIN ×2</div><span class="pv wide">Anywhere on a winning line, this line's win is DOUBLED (×2)</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X3}" alt="WIN ×3"></div><div class="nm">WIN ×3</div><span class="pv wide">Anywhere on a winning line, this line's win is TRIPLED (×3). Two multipliers on the same line multiply together — ×2 and ×3 pay ×6</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.SC}" alt="SCATTER"></div><div class="nm">SCATTER</div><span class="pv wide">3+ anywhere: pays 2× / 8× / 40× total bet + 7 / 10 / 15 FREE SPINS at 2× line wins</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.BN}" alt="BONUS"></div><div class="nm">BONUS — PICK-A-GARAGE</div><span class="pv wide">3+ anywhere on a paid spin opens the garage: 9 trunks — 8 prizes (½×–4× total bet) + SCOTTY. Banked prizes are kept; Scotty ends it. Clear all 8 for a 6× GARAGE BONUS</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.DL}" alt="BET"></div><div class="nm">BET</div><span class="pv wide">Bets run in $25 steps: $25, $50, $75 … all the way up to $2,500 a spin. A step unlocks the first time your balance reaches it — and stays unlocked even if your balance dips. Use the −25 / +25 buttons or MAX BET. NEW GAME resets you to a $25 bet</span></div>`;
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
  /* bigger bets celebrate a touch longer/brighter */
  function celebDur() { return 2600 + Math.min(900, totalBet() * 3); }

  /* ---------- spin flow ---------- */
  async function doSpin(isFree) {
    if (spinning) return;
    spinning = true;
    setControlsEnabled(false);
    clearWinMarks();
    winEl.textContent = '0';
    if (!isFree) {
      if (credits < totalBet()) {
        msgEl.textContent = credits < BET_MIN ? 'Out of credits — hit NEW GAME below to start over with 1,000.' : 'Not enough credits for that bet — lower the bet.';
        newGameBtn.classList.toggle('on', credits < BET_MIN);
        spinning = false; setControlsEnabled(true);
        return;
      }
      credits -= totalBet();
      renderReadouts();
    }
    setStopMode(true);
    msgEl.textContent = isFree ? `Free spin — ${freeSpinsLeft} left after this one. Wins pay double!` : 'Good luck!';
    const finalStops = core.randomStops(Math.random, cfg.strips);
    const durations = [1900, 2220, 2540, 2860, 3180]; /* staggered stops, reel 1 first */
    await Promise.all(finalStops.map((_, r) => spinReel(r, finalStops, durations[r])));
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
    const bonusHit = !isFree && ev.bonusCount >= 3; /* Pick-a-Garage: paid spins only */
    if (bonusHit) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'BN') markCell(r, row, 'bonushit');

    if (totalWin > 0) {
      winFlash.classList.add('on');
      Kit.win(totalWin / totalBet());
      await countUp(winEl, 0, totalWin, Math.min(1400, 350 + totalWin));
      credits += totalWin;
      checkTierUnlock(true);
      if (isFree) freeSpinTotal += totalWin;
    }
    renderReadouts(totalWin);
    save();

    if (ev.freeSpins > 0) {
      freeSpinsLeft += ev.freeSpins;
    }
    const finishTurn = () => {
      if (ev.freeSpins > 0) {
        fsBanner.textContent = `★ ${ev.freeSpins} FREE SPINS ★ LINE WINS ×2 ★`;
        fsBanner.classList.add('on');
        msgEl.textContent = `${ev.scatterCount} scatters! ${ev.freeSpins} free spins${isFree ? ' added' : ''} — here they come!`;
        spinning = false;
        setStopMode(false);
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
          setStopMode(false);
          setTimeout(runFreeSpins, 1100);
          return;
        }
        fsBanner.classList.remove('on');
        msgEl.textContent = freeSpinTotal > 0 ? `Free spins done — you won ${fmt(freeSpinTotal)} credits!` : 'Free spins done. Spin again!';
        freeSpinTotal = 0;
        levelUpMsg = null;
      } else {
        msgEl.textContent = levelUpMsg || (lastBonusPaid > 0
          ? `Pick-a-Garage paid ${fmt(lastBonusPaid)} credits!`
          : totalWin > 0
            ? (ev.lineWins.length ? `Winner! ${ev.lineWins.map(w => `${w.count}× ${NAMES[w.symbol]}${w.mult > 1 ? ` (×${w.mult})` : ''}`).join(' · ')}` : 'Scatter pay!')
            : 'Set your bet, then press SPIN — or pull the arm.');
        levelUpMsg = null;
        lastBonusPaid = 0;
      }
      newGameBtn.classList.toggle('on', credits < BET_MIN);
      setStopMode(false);
      spinning = false;
      setControlsEnabled(true);
    };
    if (bonusHit) {
      /* celebrate first, THEN the garage; any free spins won on this spin
         run after it (Joshua, 12:52 CT) */
      msgEl.textContent = `${ev.bonusCount} BONUS doors — the garage is open!`;
      await celebrate('bonus', 'PICK-A-GARAGE!', `${ev.bonusCount} BONUS doors hit — pick your trunks!`, celebDur());
      openBonus(totalBet(), finishTurn);
      return;
    }
    finishTurn();
  }

  /* ---------- PICK-A-GARAGE bonus ----------
     9 trunks: 8 prizes (x total bet of the triggering spin) + 1 SCOTTY.
     Banked prizes are KEPT even when Scotty ends the round; clearing all
     8 safe trunks adds the completion (GARAGE) bonus. */
  let bonusDeck = null, lastBonusPaid = 0;
  function openBonus(tb, done) {
    setControlsEnabled(false);
    Kit.garageDoor(); /* the real door rolls up as the round starts */
    const deck = cfg.bonus.prizes.map(m => ({ prize: Math.round(m * tb) }));
    deck.push({ scotty: true });
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    bonusDeck = deck;
    const completion = Math.round(cfg.bonus.completion * tb);
    let banked = 0, safePicked = 0, over = false;
    bonusBankEl.textContent = '0';
    bonusResultEl.innerHTML = '';
    bonusCollectBtn.classList.remove('on');
    trunksEl.innerHTML = '';
    deck.forEach((card, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'trunk';
      b.setAttribute('aria-label', `Trunk ${i + 1}`);
      b.innerHTML = `<img src="assets/trunk-closed.webp" alt="" draggable="false">`;
      b.addEventListener('click', () => {
        if (over || b.classList.contains('open')) return;
        b.classList.add('open');
        Kit.trunkOpen(); /* latch + creak on every trunk */
        if (card.scotty) {
          over = true;
          b.classList.add('scotty');
          b.innerHTML = `<img src="assets/trunk-open.webp" alt="" draggable="false"><span class="busted-tag">SCOTTY!</span>`;
          Kit.engineBust(); /* engine rev + bell crash — the bust sting */
          bonusResultEl.innerHTML = `<img class="scotty-img" src="assets/scotty.webp" alt="Scotty">SCOTTY was hiding in that trunk! Bonus over — you keep your banked <b>${fmt(banked)}</b> credits. Only the un-opened trunks are lost.`;
          bonusCollectBtn.textContent = `COLLECT ${fmt(banked)}`;
          bonusCollectBtn.classList.add('on');
          setTimeout(() => bonusGame.scrollTo({ top: bonusGame.scrollHeight, behavior: 'smooth' }), 60);
          return;
        }
        banked += card.prize;
        safePicked++;
        b.innerHTML = `<img src="assets/trunk-open.webp" alt="" draggable="false"><span class="prize">+${fmt(card.prize)}</span>`;
        /* rising prize dings as the bank grows; deep picks get tension */
        setTimeout(() => Kit.prize(safePicked - 1), 130);
        if (safePicked >= 5) setTimeout(() => Kit.tension(), 420);
        bonusBankEl.textContent = fmt(banked);
        if (safePicked === cfg.bonus.prizes.length) {
          over = true;
          banked += completion;
          bonusBankEl.textContent = fmt(banked);
          Kit.jackpot(); /* full clear = the jackpot celebration */
          bonusResultEl.innerHTML = `<span class="clear-title">YOU CLEARED THE GARAGE!</span><br>All 8 trunks opened and Scotty never showed — GARAGE BONUS +${fmt(completion)} credits. Total banked: <b>${fmt(banked)}</b>.`;
          bonusCollectBtn.textContent = `COLLECT ${fmt(banked)}`;
          bonusCollectBtn.classList.add('on');
          setTimeout(() => bonusGame.scrollTo({ top: bonusGame.scrollHeight, behavior: 'smooth' }), 60);
        }
      });
      trunksEl.appendChild(b);
    });
    bonusGame.classList.add('on');
    bonusGame.setAttribute('aria-hidden', 'false');
    bonusBackdrop.classList.add('on');
    const collect = () => {
      bonusCollectBtn.removeEventListener('click', collect);
      credits += banked;
      checkTierUnlock(false);
      renderReadouts(banked);
      save();
      bonusGame.classList.remove('on');
      bonusGame.setAttribute('aria-hidden', 'true');
      bonusBackdrop.classList.remove('on');
      bonusDeck = null;
      lastBonusPaid = banked;
      done();
    };
    bonusCollectBtn.addEventListener('click', collect);
  }
  /* QA hook: force the bonus open / inspect the shuffled deck / drive state */
  window.__slotsDebug = {
    openBonus: tb => openBonus(tb || totalBet(), () => setControlsEnabled(true)),
    deck: () => bonusDeck,
    setCredits: n => { credits = Math.max(0, n | 0); notePeak(false); renderReadouts(); newGameBtn.classList.toggle('on', credits < totalBet()); save(); },
    celebrate: (kind, title, sub, dur) => celebrate(kind || 'bonus', title || 'PICK-A-GARAGE!', sub || '', dur || 3000),
    kit: Kit,
    getState: () => ({ credits, bet: betSel, betPerLine: lineBet(), maxBet: unlockedMax(), peak, spinning, rolling: RollSound.isActive(), rollLevel: Math.round(RollSound.level() * 100) / 100, stops: stops.slice() })
  };
  function runFreeSpins() { if (freeSpinsLeft > 0 && !spinning) doSpin(true); }

  spinBtn.addEventListener('click', () => { if (spinning) { stopAllReels(); return; } ac(); doSpin(false); });

  /* ---------- pull arm (lever): drag it down, it springs back and spins.
     Tap = scripted full pull. Both paths fire the exact SPIN button path. ---------- */
  const leverEl = $('lever'), leverArm = $('leverArm');
  const LEVER_MAX = 62; /* px of knob travel */
  let leverDrag = null;
  function leverSet(y, animate) {
    leverArm.style.transition = animate ? 'transform .5s cubic-bezier(.25,1.35,.4,1)' : 'none';
    leverArm.style.transform = `translateY(${y}px)`;
  }
  function leverFire() { if (!spinning && !spinBtn.disabled) spinBtn.click(); }
  function leverScriptedPull() {
    leverArm.style.transition = 'transform .16s ease-in';
    leverArm.style.transform = `translateY(${LEVER_MAX}px)`;
    setTimeout(() => { leverSet(0, true); leverFire(); }, 175);
  }
  if (leverEl && leverArm) {
    leverEl.addEventListener('pointerdown', e => {
      if (spinning || spinBtn.disabled) return;
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
      if ((e.key === 'Enter' || e.key === ' ') && !spinning && !spinBtn.disabled) { e.preventDefault(); leverScriptedPull(); }
    });
  }
  betDownBtn.addEventListener('click', () => { betSel = Math.max(BET_MIN, betSel - BET_STEP); renderReadouts(); renderBet(); buildPaytable(); sTick(); });
  betUpBtn.addEventListener('click', () => { betSel = Math.min(unlockedMax(), betSel + BET_STEP); renderReadouts(); renderBet(); buildPaytable(); sTick(); });
  maxBetBtn.addEventListener('click', () => { betSel = unlockedMax(); renderReadouts(); renderBet(); buildPaytable(); sTick(); });
  /* NEW GAME (Joshua, 2026-11-21): a broke player restarts clean — the
     machine's standard 1,000 starting credits, $25 bet, unlocks reset to
     the fresh 1,000-credit peak. */
  newGameBtn.addEventListener('click', () => {
    credits = START_CREDITS; betSel = BET_MIN; peak = START_CREDITS; lastUnlocked = unlockedMax();
    newGameBtn.classList.remove('on');
    renderReadouts(0); renderBet(); buildPaytable(); save();
    msgEl.textContent = 'New game — 1,000 credits on the house. Good luck!';
    Kit.coin();
  });
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundStateEl.textContent = soundOn ? 'ON' : 'OFF';
    save();
    if (soundOn) sTick(); else { RollSound.cut(); Kit.stopAll(); }
  });
  soundStateEl.textContent = soundOn ? 'ON' : 'OFF';

  /* keep cells square-ish if the viewport changes mid-session */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (!spinning) showWindow(); }, 180);
  });

  notePeak(false);
  showWindow();
  renderReadouts(0);
  renderBet();
  buildPaytable();
  newGameBtn.classList.toggle('on', credits < totalBet());
})();
