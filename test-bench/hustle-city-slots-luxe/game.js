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
  const spinBtn = $('spinBtn'), betOneBtn = $('betOneBtn'), maxBetBtn = $('maxBetBtn');
  const spinFace = spinBtn.querySelector('.spin-face');
  const fsBanner = $('fsBanner'), newGameBtn = $('newGameBtn'), soundBtn = $('soundBtn');
  const maxBetLineEl = $('maxBetLine');
  const soundStateEl = $('soundState'), winFlash = $('winFlash');
  const paySheet = $('paySheet'), sheetBackdrop = $('sheetBackdrop');
  const bonusOverlay = $('bonusOverlay'), wheelEl = $('wheel'), bonusMsg = $('bonusMsg');
  const wheelPointer = $('wheelPointer');

  let credits = 1000, betPerLine = 1, spinning = false;
  let freeSpinsLeft = 0, freeSpinTotal = 0, soundOn = true;
  let stops = [4, 9, 2, 14, 7];

  /* ---------- max-bet progression (Joshua, 2026-11-21) ----------
     "The more money you get, the higher the max bet goes." The cap on
     bet-per-line rises in tiers as the credit balance grows. Once a tier
     unlocks it stays unlocked for this game (the cap never drops when the
     balance dips); a NEW GAME restart returns to the base tier. */
  const BET_TIERS = [
    { at: 0, cap: 5 }, { at: 2500, cap: 10 }, { at: 5000, cap: 25 },
    { at: 10000, cap: 50 }, { at: 25000, cap: 100 }
  ];
  const BET_STEPS = [1, 2, 3, 4, 5, 10, 15, 20, 25, 40, 50, 75, 100];
  let maxTier = 0, tierUpMsg = null;
  function tierFor(balance) { let t = 0; BET_TIERS.forEach((x, i) => { if (balance >= x.at) t = i; }); return t; }
  function maxBetCap() { return BET_TIERS[maxTier].cap; }
  function checkTierUp() {
    const t = tierFor(credits);
    if (t > maxTier) {
      maxTier = t;
      tierUpMsg = `★ MAX BET UP! Your balance passed ${fmt(BET_TIERS[t].at)} credits — max bet is now ${maxBetCap()} per line! ★`;
      save();
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved && typeof saved.credits === 'number') credits = saved.credits;
    if (saved && typeof saved.sound === 'boolean') soundOn = saved.sound;
    if (saved && typeof saved.tier === 'number') maxTier = Math.max(0, Math.min(BET_TIERS.length - 1, saved.tier | 0));
  } catch (e) { /* restricted webview: play without persistence */ }
  maxTier = Math.max(maxTier, tierFor(credits));
  if (betPerLine > maxBetCap()) betPerLine = maxBetCap();

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ credits, sound: soundOn, tier: maxTier })); } catch (e) {}
  }
  function fmt(n) { return n.toLocaleString('en-US'); }
  function totalBet() { return betPerLine * core.PAYLINES.length; }

  /* ---------- audio (WebAudio, no assets) ---------- */
  let actx = null;
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, dur, type, vol, when) {
    if (!soundOn) return;
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    const t = a.currentTime + (when || 0);
    g.gain.setValueAtTime(vol || 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  /* ---------- mechanical reel sound (Joshua, 2026-11-21) ----------
     The reels ROLL — no digital beeps. A looped noise bed runs through a
     bandpass whose level and pitch track the reels' actual speed (rises on
     spin-up, rolls through cruise, falls as reels brake), and a dry
     clatter of short noise clicks is scheduled from the reels' real
     travel — one click per tooth pitch, so it ticks down naturally as
     each reel lands, and cuts dead when STOP slams the reels home. */
  let noiseBuf = null;
  function getNoiseBuf(a) {
    if (noiseBuf) return noiseBuf;
    const buf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
    return buf;
  }
  function clack(intensity) {
    if (!soundOn) return;
    const a = ac(); if (!a) return;
    const src = a.createBufferSource();
    src.buffer = getNoiseBuf(a);
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1700;
    const g = a.createGain();
    const t = a.currentTime;
    g.gain.setValueAtTime(0.028 + 0.045 * (intensity || 0.5), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(hp); hp.connect(g); g.connect(a.destination);
    src.start(t, Math.random() * 0.4, 0.05);
  }
  function thunk() {
    if (!soundOn) return;
    const a = ac(); if (!a) return;
    const src = a.createBufferSource();
    src.buffer = getNoiseBuf(a);
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = a.createGain();
    const t = a.currentTime;
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.connect(lp); lp.connect(g); g.connect(a.destination);
    src.start(t, Math.random() * 0.4, 0.1);
  }
  let rollNodes = null;
  function startRollSound() {
    if (rollNodes || !soundOn) return;
    const a = ac(); if (!a) return;
    const src = a.createBufferSource();
    src.buffer = getNoiseBuf(a); src.loop = true;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.85;
    const g = a.createGain(); g.gain.value = 0;
    src.connect(bp); bp.connect(g); g.connect(a.destination);
    src.start();
    rollNodes = { src, bp, g };
  }
  function rollLevel(speedNorm) {
    if (!rollNodes || !actx) return;
    const t = actx.currentTime;
    rollNodes.g.gain.setTargetAtTime(soundOn ? 0.015 + 0.085 * speedNorm : 0, t, 0.05);
    rollNodes.bp.frequency.setTargetAtTime(480 + 1450 * speedNorm, t, 0.05);
  }
  function stopRollSound(quick) {
    if (!rollNodes || !actx) { rollNodes = null; return; }
    const nodes = rollNodes; rollNodes = null;
    const t = actx.currentTime;
    try {
      nodes.g.gain.cancelScheduledValues(t);
      nodes.g.gain.setTargetAtTime(0, t, quick ? 0.025 : 0.085);
      nodes.src.stop(t + (quick ? 0.14 : 0.4));
    } catch (e) { /* already stopped */ }
  }
  const sTick = () => clack(0.35);
  const sPeg = () => clack(0.55);
  const sStop = () => { tone(130, 0.1, 'sine', 0.12); thunk(); };
  const sCoin = () => { tone(988, 0.09, 'square', 0.05); tone(1319, 0.14, 'square', 0.05, 0.07); };
  const sWin = big => { const n = big ? 9 : 5; for (let i = 0; i < n; i++) tone(523 + i * 131, 0.12, 'triangle', 0.07, i * 0.07); };
  const sScatter = () => { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, i * 0.09)); };
  const sBonus = () => { [523, 659, 784, 1046, 1319, 1568].forEach((f, i) => tone(f, 0.18, 'triangle', 0.09, i * 0.1)); };

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
     STOP. Tapping it calls every spinning reel's finish() at once — each
     reel snaps cleanly onto its dealt stop (the same final window a full
     spin would land on), the roll sound cuts, and payouts evaluate from
     those dealt stops exactly as an unstopped spin. */
  let activeReelFinishes = [null, null, null, null, null];
  let stopRequested = false;
  const clatterAcc = [0, 0, 0, 0, 0];
  function requestStop() {
    if (!spinning || stopRequested) return;
    stopRequested = true;
    stopRollSound(true);
    for (const f of activeReelFinishes) if (f) f();
  }

  /* Physics-curve reel spin: smoothstep velocity profile (spin-up, fast
     middle, gentle arrival), motion blur while the reel is moving fast,
     and a small settle bounce when it locks. Reels stop left to right
     because each reel's duration is longer than the one before it. The
     rolling sound and tooth clatter are driven from this same motion. */
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
      const target = -(seq.length - 3) * H;
      const smooth = u => u * u * (3 - 2 * u);
      let finished = false;
      let lastOffset = 0;
      const finish = () => {
        if (finished) return;
        finished = true;
        activeReelFinishes[r] = null;
        track.classList.remove('fast');
        track.style.transform = 'translateY(0px)';
        track.innerHTML = grid[r].map(s => cellHTML(s, H)).join('');
        if (!stopRequested || r === 0) sStop();
        /* settle bounce: a quick physical recoil as the reel locks */
        try {
          track.animate(
            [{ transform: 'translateY(-6px)' }, { transform: 'translateY(2px)' }, { transform: 'translateY(0px)' }],
            { duration: 190, easing: 'ease-out' }
          );
        } catch (e) { /* WAAPI unavailable: reel simply rests */ }
        resolve();
      };
      activeReelFinishes[r] = finish;
      const t0 = performance.now();
      (function frame(now) {
        if (finished) return;
        const u = Math.min(1, (now - t0) / duration);
        const p = smooth(u);
        track.style.transform = `translateY(${target * p}px)`;
        const vel = 6 * u * (1 - u); /* smoothstep derivative, peaks mid-spin */
        track.classList.toggle('fast', vel > 0.62);
        /* rolling sound follows this reel's motion; clatter per tooth pitch */
        const speedNorm = Math.min(1, vel / 1.5);
        rollLevel(speedNorm);
        const off = Math.abs(target * p);
        clatterAcc[r] += off - lastOffset;
        lastOffset = off;
        if (clatterAcc[r] >= H * 0.75) { clatterAcc[r] = 0; if (vel > 0.12) clack(speedNorm); }
        if (u < 1) requestAnimationFrame(frame);
        else finish();
      })(t0);
      setTimeout(finish, duration + 900); /* safety net */
    });
  }

  /* ---------- readouts / controls ---------- */
  function updateMaxBetLine() {
    if (!maxBetLineEl) return;
    const next = BET_TIERS[maxTier + 1];
    maxBetLineEl.innerHTML = next
      ? `MAX BET <b>${maxBetCap()}/LINE</b> · NEXT ${next.cap}/LINE AT ${fmt(next.at)}`
      : `MAX BET <b>${maxBetCap()}/LINE</b> · TOP TIER UNLOCKED`;
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
    betOneBtn.disabled = !on; maxBetBtn.disabled = !on;
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
      (function step(t) {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(Math.round(from + (to - from) * p));
        if (p < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }
  function buildPaytable() {
    const rows = Object.keys(cfg.paytable)
      .sort((a, b) => cfg.paytable[b][5] - cfg.paytable[a][5])
      .map(sym => {
        const t = cfg.paytable[sym];
        const cell = n => t[n] ? `<span class="pv">${n}× <b>${fmt(t[n] * betPerLine)}</b></span>` : '<span class="pv"></span>';
        const cells = sym === 'CP'
          ? `<span class="pv">2× <b>${fmt(t[2] * betPerLine)}</b></span>${cell(3)}${cell(4)}`
          : (t[5] ? `${cell(3)}${cell(4)}${cell(5)}` : `${cell(3)}${cell(4)}<span class="pv"></span>`);
        return `<div class="payrow"><div class="thumb"><img src="${ART[sym]}" alt="${NAMES[sym]}"></div><div class="nm">${NAMES[sym]}</div>${cells}</div>`;
      }).join('');
    $('payrows').innerHTML = rows +
      `<div class="payrow"><div class="thumb"><img src="${ART.WD}" alt="WILD"></div><div class="nm">WILD</div><span class="pv wide">Substitutes for every symbol except SCATTER</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X2}" alt="WIN ×2"></div><div class="nm">WIN ×2</div><span class="pv wide">Anywhere on a winning line, this line's win is DOUBLED (×2)</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X3}" alt="WIN ×3"></div><div class="nm">WIN ×3</div><span class="pv wide">Anywhere on a winning line, this line's win is TRIPLED (×3). Two multipliers on the same line multiply together — ×2 and ×3 pay ×6</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.SC}" alt="SCATTER"></div><div class="nm">SCATTER</div><span class="pv wide">3+ anywhere: pays 2× / 7× / 35× total bet + 7 / 10 / 15 FREE SPINS at 2× line wins</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.BN}" alt="BONUS"></div><div class="nm">BONUS WHEEL</div><span class="pv wide">BONUS tokens ride reels 2, 3 and 4 — when all three windows show one, the BONUS WHEEL opens: one spin, wedges pay × your total bet up to a ${Math.max(...cfg.wheel)}× JACKPOT (BANKRUPT pays nothing). The wheel lands about once every 40 spins</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.CP}" alt="MAX BET"></div><div class="nm">MAX BET GROWS</div><span class="pv wide">The more credits you hold, the higher your max bet climbs — and once a tier unlocks it stays unlocked for this game: you start at 5/line · balance 2,500+ → 10/line · 5,000+ → 25/line · 10,000+ → 50/line · 25,000+ → 100/line</span></div>`;
  }

  /* ---------- paytable sheet ---------- */
  function openSheet() { paySheet.classList.add('on'); paySheet.setAttribute('aria-hidden', 'false'); sheetBackdrop.classList.add('on'); }
  function closeSheet() { paySheet.classList.remove('on'); paySheet.setAttribute('aria-hidden', 'true'); sheetBackdrop.classList.remove('on'); }
  $('payBtn').addEventListener('click', openSheet);
  $('sheetHandle').addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

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
  function wedgeColor(v, i) {
    if (v === 0) return '#20060a';
    if (v === Math.max(...WEDGES)) return '#c9a227';
    return i % 2 ? '#0d2c56' : '#12407c';
  }
  function buildWheel() {
    if (wheelBuilt) return;
    wheelBuilt = true;
    const grads = WEDGES.map((v, i) => `${wedgeColor(v, i)} ${i * WSEG}deg ${(i + 1) * WSEG}deg`).join(',');
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
      const t0 = performance.now();
      (function frame(now) {
        const u = Math.min(1, (now - t0) / dur);
        wheelAngle = start + total * easeOut(u);
        wheelEl.style.transform = `rotate(${wheelAngle}deg)`;
        const peg = Math.floor(wheelAngle / WSEG);
        if (peg !== lastPeg) {
          lastPeg = peg;
          if (u < 0.985) { sPeg(); wheelPointer.classList.remove('flick'); void wheelPointer.offsetWidth; wheelPointer.classList.add('flick'); }
        }
        if (u < 1) requestAnimationFrame(frame);
        else {
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
      betOneBtn.disabled = true; maxBetBtn.disabled = true;
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
          tone(160, 0.5, 'sawtooth', 0.06);
          tone(120, 0.6, 'sawtooth', 0.05, 0.18);
        } else if (val === Math.max(...WEDGES)) {
          bonusMsg.textContent = `★ JACKPOT! ${val}× your bet = ${fmt(pay)} credits! ★`;
          sWin(true); sCoin();
        } else {
          bonusMsg.textContent = `The wheel pays ${val}× your bet = ${fmt(pay)} credits!`;
          sWin(false); sCoin();
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
    }
    msgEl.textContent = isFree ? `Free spin — ${freeSpinsLeft} left after this one. Wins pay double!` : 'Good luck!';
    const betAtTrigger = totalBet();
    const finalStops = core.randomStops(Math.random, cfg.strips);
    const durations = [1050, 1300, 1550, 1800, 2050];
    stopRequested = false;
    clatterAcc.fill(0);
    startRollSound();
    await Promise.all(finalStops.map((_, r) => spinReel(r, finalStops, durations[r])));
    stopRollSound(false);
    stops = finalStops;
    const grid = core.windowForStops(cfg.strips, stops);
    const ev = core.evaluateGrid(grid, betPerLine, cfg);
    const mult = isFree ? core.FREE_SPIN_MULTIPLIER : 1;
    const linePay = ev.lineWinTotal * mult;
    const totalWin = linePay + ev.scatterPay;

    for (const w of ev.lineWins) {
      for (let r = 0; r < w.count; r++) markCell(r, w.rows[r], 'win');
      if (w.mult > 1 && w.multCells) for (const r of w.multCells) markCell(r, core.PAYLINES[w.line - 1][r], 'win');
    }
    if (ev.scatterCount >= 1) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'SC') markCell(r, row, 'scatterhit');
    if (ev.bonusCount >= 1) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'BN') markCell(r, row, 'bonushit');

    if (totalWin > 0) {
      winFlash.classList.add('on');
      sWin(totalWin >= totalBet() * 25);
      sCoin();
      await countUp(winEl, 0, totalWin, Math.min(1400, 350 + totalWin));
      credits += totalWin;
      if (isFree) freeSpinTotal += totalWin;
    }
    renderReadouts(totalWin);
    checkTierUp();
    save();

    /* Bonus Wheel plays before free spins when both trigger together. */
    if (ev.bonus) {
      sBonus();
      msgEl.textContent = '3 BONUS tokens! The Bonus Wheel is yours — one spin!';
      spinning = false;
      await runBonusWheel(betAtTrigger);
      checkTierUp();
      renderReadouts();
      spinning = true;
    }

    if (ev.freeSpins > 0) {
      sScatter();
      freeSpinsLeft += ev.freeSpins;
      fsBanner.textContent = `★ ${ev.freeSpins} FREE SPINS ★ LINE WINS ×2 ★`;
      fsBanner.classList.add('on');
      msgEl.textContent = `${ev.scatterCount} scatters! ${ev.freeSpins} free spins${isFree ? ' added' : ''} — here they come!`;
      spinning = false;
      setTimeout(runFreeSpins, 1600);
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
  betOneBtn.addEventListener('click', () => {
    const steps = BET_STEPS.filter(s => s <= maxBetCap());
    const next = steps.find(s => s > betPerLine);
    betPerLine = next === undefined ? 1 : next;
    renderReadouts(); buildPaytable(); sTick();
  });
  maxBetBtn.addEventListener('click', () => { betPerLine = maxBetCap(); renderReadouts(); buildPaytable(); sTick(); });
  /* NEW GAME (Joshua, 2026-11-21): when the balance can't cover a spin,
     one tap restarts the game fresh — standard 1,000 starting credits,
     base bet, base max-bet tier. */
  newGameBtn.addEventListener('click', () => {
    if (spinning || wheelArmed || wheelSpinning || freeSpinsLeft > 0) return;
    credits = 1000;
    betPerLine = 1;
    maxTier = 0;
    tierUpMsg = null;
    freeSpinTotal = 0;
    fsBanner.classList.remove('on');
    clearWinMarks();
    winEl.textContent = '0';
    renderReadouts(0);
    buildPaytable();
    save();
    msgEl.textContent = 'New game — 1,000 credits on the house. Good luck!';
    sCoin();
  });
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundStateEl.textContent = soundOn ? 'ON' : 'OFF';
    if (!soundOn) stopRollSound(true);
    save();
    if (soundOn) sTick();
  });
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
