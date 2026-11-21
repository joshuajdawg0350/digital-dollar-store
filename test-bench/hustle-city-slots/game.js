/* Hustle City Slots — Casino Classics · v2 cabinet UI.
   Presentation layer rebuilt 2026-11-21 around generated chrome/blue art assets.
   Engine (logic.js) + strips/paytable (machines.js): 5x3, 20 paylines, weighted
   strips, WILD substitutes, X2/X3 line multipliers, SCATTER free spins, BONUS
   Pick-a-Garage (3+ garage doors on a paid spin), NO blank stops (every reel
   position is a real symbol), total RTP 94.61% incl. the bonus game's share.
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
  const spinBtn = $('spinBtn'), betOneBtn = $('betOneBtn'), maxBetBtn = $('maxBetBtn');
  const fsBanner = $('fsBanner'), refillBtn = $('refillBtn'), soundBtn = $('soundBtn');
  const soundStateEl = $('soundState'), winFlash = $('winFlash');
  const paySheet = $('paySheet'), sheetBackdrop = $('sheetBackdrop');
  const bonusGame = $('bonusGame'), bonusBackdrop = $('bonusBackdrop');
  const trunksEl = $('trunks'), bonusBankEl = $('bonusBank');
  const bonusResultEl = $('bonusResult'), bonusCollectBtn = $('bonusCollect');

  let credits = 1000, betPerLine = 1, spinning = false;
  let freeSpinsLeft = 0, freeSpinTotal = 0, soundOn = true;
  let stops = [4, 9, 2, 14, 7];
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved && typeof saved.credits === 'number') credits = saved.credits;
    if (saved && typeof saved.sound === 'boolean') soundOn = saved.sound;
  } catch (e) { /* restricted webview: play without persistence */ }

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ credits, sound: soundOn })); } catch (e) {}
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
  const sTick = () => tone(1250, 0.04, 'square', 0.028);
  const sStop = () => tone(150, 0.1, 'sine', 0.14);
  const sCoin = () => { tone(988, 0.09, 'square', 0.05); tone(1319, 0.14, 'square', 0.05, 0.07); };
  const sWin = big => { const n = big ? 9 : 5; for (let i = 0; i < n; i++) tone(523 + i * 131, 0.12, 'triangle', 0.07, i * 0.07); };
  const sScatter = () => { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, i * 0.09)); };

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
        track.style.filter = '';
        track.innerHTML = grid[r].map(s => cellHTML(s, H)).join('');
        track.style.transform = 'translateY(0px)';
        sStop();
        resolve();
      };
      const hardStop = setTimeout(finish, duration + 1600);
      function frame(now) {
        if (finished) return;
        /* dt clamp is generous (0.25s) so a slow device still spins in
           real time — the integrator substeps keep the spring stable */
        const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
        last = now;
        const { p, v, done } = motion.step(dt);
        if (done) { finish(); return; }
        track.style.transform = `translateY(${-p}px)`;
        const blur = v > 320 ? Math.min(3.2, (v - 320) / 260) : 0;
        if (Math.abs(blur - lastBlur) >= 0.3 || (blur === 0 && lastBlur !== 0)) {
          track.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px)` : '';
          lastBlur = blur;
        }
        const cell = Math.floor(p / H);
        if (cell !== lastCell) {
          lastCell = cell;
          if (now - lastTick >= 45) { sTick(); lastTick = now; }
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
  function setControlsEnabled(on) {
    spinBtn.disabled = !on; betOneBtn.disabled = !on; maxBetBtn.disabled = !on;
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
        const cells = sym === 'CH'
          ? `<span class="pv">2× <b>${fmt(t[2] * betPerLine)}</b></span>${cell(3)}${cell(4)}`
          : (t[5] ? `${cell(3)}${cell(4)}${cell(5)}` : `${cell(3)}${cell(4)}<span class="pv"></span>`);
        return `<div class="payrow"><div class="thumb"><img src="${ART[sym]}" alt="${NAMES[sym]}"></div><div class="nm">${NAMES[sym]}</div>${cells}</div>`;
      }).join('');
    $('payrows').innerHTML = rows +
      `<div class="payrow"><div class="thumb"><img src="${ART.WD}" alt="WILD"></div><div class="nm">WILD</div><span class="pv wide">Substitutes for every symbol except SCATTER</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X2}" alt="WIN ×2"></div><div class="nm">WIN ×2</div><span class="pv wide">Anywhere on a winning line, this line's win is DOUBLED (×2)</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X3}" alt="WIN ×3"></div><div class="nm">WIN ×3</div><span class="pv wide">Anywhere on a winning line, this line's win is TRIPLED (×3). Two multipliers on the same line multiply together — ×2 and ×3 pay ×6</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.SC}" alt="SCATTER"></div><div class="nm">SCATTER</div><span class="pv wide">3+ anywhere: pays 2× / 8× / 40× total bet + 7 / 10 / 15 FREE SPINS at 2× line wins</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.BN}" alt="BONUS"></div><div class="nm">BONUS — PICK-A-GARAGE</div><span class="pv wide">3+ anywhere on a paid spin opens the garage: 9 trunks — 8 prizes (½×–4× total bet) + SCOTTY. Banked prizes are kept; Scotty ends it. Clear all 8 for a 6× GARAGE BONUS</span></div>`;
  }

  /* ---------- paytable sheet ---------- */
  function openSheet() { paySheet.classList.add('on'); paySheet.setAttribute('aria-hidden', 'false'); sheetBackdrop.classList.add('on'); }
  function closeSheet() { paySheet.classList.remove('on'); paySheet.setAttribute('aria-hidden', 'true'); sheetBackdrop.classList.remove('on'); }
  $('payBtn').addEventListener('click', openSheet);
  $('sheetHandle').addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

  /* ---------- spin flow ---------- */
  async function doSpin(isFree) {
    if (spinning) return;
    spinning = true;
    setControlsEnabled(false);
    clearWinMarks();
    winEl.textContent = '0';
    if (!isFree) {
      if (credits < totalBet()) {
        msgEl.textContent = credits <= 0 ? 'Out of credits — grab 1,000 free play credits below.' : 'Not enough credits for that bet — lower the bet or refill.';
        refillBtn.classList.toggle('on', credits < core.PAYLINES.length);
        spinning = false; setControlsEnabled(true);
        return;
      }
      credits -= totalBet();
      renderReadouts();
    }
    msgEl.textContent = isFree ? `Free spin — ${freeSpinsLeft} left after this one. Wins pay double!` : 'Good luck!';
    const finalStops = core.randomStops(Math.random, cfg.strips);
    const durations = [1900, 2220, 2540, 2860, 3180]; /* staggered stops, reel 1 first */
    await Promise.all(finalStops.map((_, r) => spinReel(r, finalStops, durations[r])));
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
    const bonusHit = !isFree && ev.bonusCount >= 3; /* Pick-a-Garage: paid spins only */
    if (bonusHit) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'BN') markCell(r, row, 'bonushit');

    if (totalWin > 0) {
      winFlash.classList.add('on');
      sWin(totalWin >= totalBet() * 25);
      sCoin();
      await countUp(winEl, 0, totalWin, Math.min(1400, 350 + totalWin));
      credits += totalWin;
      if (isFree) freeSpinTotal += totalWin;
    }
    renderReadouts(totalWin);
    save();

    if (ev.freeSpins > 0) {
      sScatter();
      freeSpinsLeft += ev.freeSpins;
    }
    const finishTurn = () => {
      if (ev.freeSpins > 0) {
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
        msgEl.textContent = lastBonusPaid > 0
          ? `Pick-a-Garage paid ${fmt(lastBonusPaid)} credits!`
          : totalWin > 0
            ? (ev.lineWins.length ? `Winner! ${ev.lineWins.map(w => `${w.count}× ${NAMES[w.symbol]}${w.mult > 1 ? ` (×${w.mult})` : ''}`).join(' · ')}` : 'Scatter pay!')
            : 'Set your bet, then press SPIN — or pull the arm.';
        lastBonusPaid = 0;
      }
      refillBtn.classList.toggle('on', credits < core.PAYLINES.length);
      spinning = false;
      setControlsEnabled(true);
    };
    if (bonusHit) {
      /* the garage comes first; any free spins won on this spin run after it */
      msgEl.textContent = `${ev.bonusCount} BONUS doors — the garage is open!`;
      tone(660, 0.14, 'triangle', 0.08); tone(880, 0.16, 'triangle', 0.08, 0.1); tone(1108, 0.2, 'triangle', 0.08, 0.2);
      setTimeout(() => openBonus(totalBet(), finishTurn), 1500);
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
        if (card.scotty) {
          over = true;
          b.classList.add('scotty');
          b.innerHTML = `<img src="assets/trunk-open.webp" alt="" draggable="false"><span class="busted-tag">SCOTTY!</span>`;
          sStop(); tone(196, 0.3, 'sawtooth', 0.07); tone(147, 0.4, 'sawtooth', 0.07, 0.12);
          bonusResultEl.innerHTML = `<img class="scotty-img" src="assets/scotty.webp" alt="Scotty">SCOTTY was hiding in that trunk! Bonus over — you keep your banked <b>${fmt(banked)}</b> credits. Only the un-opened trunks are lost.`;
          bonusCollectBtn.textContent = `COLLECT ${fmt(banked)}`;
          bonusCollectBtn.classList.add('on');
          setTimeout(() => bonusGame.scrollTo({ top: bonusGame.scrollHeight, behavior: 'smooth' }), 60);
          return;
        }
        banked += card.prize;
        safePicked++;
        b.innerHTML = `<img src="assets/trunk-open.webp" alt="" draggable="false"><span class="prize">+${fmt(card.prize)}</span>`;
        sCoin();
        bonusBankEl.textContent = fmt(banked);
        if (safePicked === cfg.bonus.prizes.length) {
          over = true;
          banked += completion;
          bonusBankEl.textContent = fmt(banked);
          sWin(true);
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
  /* QA hook: force the bonus open / inspect the shuffled deck */
  window.__slotsDebug = { openBonus: tb => openBonus(tb || totalBet(), () => setControlsEnabled(true)), deck: () => bonusDeck };
  function runFreeSpins() { if (freeSpinsLeft > 0 && !spinning) doSpin(true); }

  spinBtn.addEventListener('click', () => { ac(); doSpin(false); });

  /* ---------- pull arm (lever): drag it down, it springs back and spins.
     Tap = scripted full pull. Both paths fire the exact SPIN button path. ---------- */
  const leverEl = $('lever'), leverArm = $('leverArm');
  const LEVER_MAX = 62; /* px of knob travel */
  let leverDrag = null;
  function leverSet(y, animate) {
    leverArm.style.transition = animate ? 'transform .5s cubic-bezier(.25,1.35,.4,1)' : 'none';
    leverArm.style.transform = `translateY(${y}px)`;
  }
  function leverFire() { if (!spinBtn.disabled) spinBtn.click(); }
  function leverScriptedPull() {
    leverArm.style.transition = 'transform .16s ease-in';
    leverArm.style.transform = `translateY(${LEVER_MAX}px)`;
    setTimeout(() => { leverSet(0, true); leverFire(); }, 175);
  }
  if (leverEl && leverArm) {
    leverEl.addEventListener('pointerdown', e => {
      if (spinBtn.disabled) return;
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
      if ((e.key === 'Enter' || e.key === ' ') && !spinBtn.disabled) { e.preventDefault(); leverScriptedPull(); }
    });
  }
  betOneBtn.addEventListener('click', () => { betPerLine = betPerLine >= 5 ? 1 : betPerLine + 1; renderReadouts(); buildPaytable(); sTick(); });
  maxBetBtn.addEventListener('click', () => { betPerLine = 5; renderReadouts(); buildPaytable(); sTick(); });
  refillBtn.addEventListener('click', () => { credits += 1000; refillBtn.classList.remove('on'); renderReadouts(); save(); msgEl.textContent = '1,000 play credits added. Good luck!'; });
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundStateEl.textContent = soundOn ? 'ON' : 'OFF';
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

  showWindow();
  renderReadouts(0);
  buildPaytable();
  refillBtn.classList.toggle('on', credits < core.PAYLINES.length);
})();
