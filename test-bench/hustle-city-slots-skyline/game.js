/* Hustle City Slots — Midnight Skyline · grown-up rebuild 2026-11-21.
   Presentation layer modeled on Casino Classics v2 (the house benchmark),
   rethemed midnight-noir with generated chrome/blue art assets.
   Engine (logic.js) + strips/paytable (machines.js): 5x3, 20 paylines,
   weighted strips, WILD substitutes, X2/X3 line multipliers, SCATTER free
   spins (line wins x2), BONUS DICE -> DICE ROLL push-your-luck bonus game,
   NO blank stops (every reel position is a real symbol), RTP 94.77%.
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
  const spinBtn = $('spinBtn'), betOneBtn = $('betOneBtn'), maxBetBtn = $('maxBetBtn');
  const fsBanner = $('fsBanner'), refillBtn = $('refillBtn'), soundBtn = $('soundBtn');
  const soundStateEl = $('soundState'), winFlash = $('winFlash');
  const paySheet = $('paySheet'), sheetBackdrop = $('sheetBackdrop');
  const bonusEl = $('bonusGame'), bonusBackdrop = $('bonusBackdrop');
  const bonusPotEl = $('bonusPot'), bonusMsgEl = $('bonusMsg'), bonusLadderEl = $('bonusLadder');
  const bonusRollBtn = $('bonusRollBtn'), bonusBankBtn = $('bonusBankBtn');
  const bonusTotalEl = $('bonusRollTotal'), bonusTriggerEl = $('bonusTriggerText');
  const dieEls = [$('die0'), $('die1')];

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
  const sDice = () => { for (let i = 0; i < 6; i++) tone(180 + Math.random() * 260, 0.05, 'square', 0.06, i * 0.09); };
  const sBust = () => { tone(196, 0.3, 'sawtooth', 0.09); tone(147, 0.42, 'sawtooth', 0.09, 0.12); };

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

  /* Reel motion: spin-up acceleration, motion blur at speed, staggered stops
     (durations rise left to right), and a settle bounce — the track overshoots
     a few px past the stop, then recoils onto it. Pure presentation: the dealt
     stops are whatever the engine rolled. */
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
      const overshoot = target - Math.max(5, H * 0.09);
      track.style.transform = 'translateY(0px)';
      void track.offsetHeight;
      reel.classList.add('blur');
      track.style.transition = `transform ${duration}ms cubic-bezier(.28,.62,.32,1)`;
      track.style.transform = `translateY(${overshoot}px)`;
      let tickCount = 0;
      const tickInt = setInterval(() => { if (++tickCount % 3 === 0) sTick(); }, 50);
      let finished = false;
      const settle = () => {
        if (finished) return;
        finished = true;
        clearInterval(tickInt);
        reel.classList.remove('blur');
        track.style.transition = 'transform 130ms cubic-bezier(.2,.9,.3,1.4)';
        track.style.transform = `translateY(${target}px)`;
        setTimeout(() => {
          track.style.transition = 'none';
          track.innerHTML = grid[r].map(s => cellHTML(s, H)).join('');
          track.style.transform = 'translateY(0px)';
          sStop();
          resolve();
        }, 140);
      };
      track.addEventListener('transitionend', settle, { once: true });
      setTimeout(settle, duration + 700);
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
        const cells = sym === 'TX'
          ? `<span class="pv">2× <b>${fmt(t[2] * betPerLine)}</b></span>${cell(3)}${cell(4)}`
          : (t[5] ? `${cell(3)}${cell(4)}${cell(5)}` : `${cell(3)}${cell(4)}<span class="pv"></span>`);
        return `<div class="payrow"><div class="thumb"><img src="${ART[sym]}" alt="${NAMES[sym]}"></div><div class="nm">${NAMES[sym]}</div>${cells}</div>`;
      }).join('');
    $('payrows').innerHTML = rows +
      `<div class="payrow"><div class="thumb"><img src="${ART.WD}" alt="WILD"></div><div class="nm">WILD</div><span class="pv wide">Substitutes for every symbol except SCATTER</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X2}" alt="WIN ×2"></div><div class="nm">WIN ×2</div><span class="pv wide">Anywhere on a winning line, this line's win is DOUBLED (×2)</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X3}" alt="WIN ×3"></div><div class="nm">WIN ×3</div><span class="pv wide">Anywhere on a winning line, this line's win is TRIPLED (×3). Two multipliers on the same line multiply together — ×2 and ×3 pay ×6</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.SC}" alt="SCATTER"></div><div class="nm">SCATTER</div><span class="pv wide">3+ anywhere: pays 2× / 8× / 40× total bet + 7 / 10 / 15 FREE SPINS at 2× line wins</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.BN}" alt="BONUS DICE"></div><div class="nm">BONUS DICE</div><span class="pv wide">3+ anywhere starts the DICE ROLL bonus: the pot starts at 0 / ${fmt(cfg.bonusStart[4] * betPerLine)} / ${fmt(cfg.bonusStart[5] * betPerLine)} for 3 / 4 / 5 dice. Every roll adds its total × ${cfg.diceUnit} × line bet to the pot. Roll a 7 and the pot BUSTS. Bank the pot after any safe roll — or push your luck</span></div>`;
  }

  /* ---------- paytable sheet ---------- */
  function openSheet() { paySheet.classList.add('on'); paySheet.setAttribute('aria-hidden', 'false'); sheetBackdrop.classList.add('on'); }
  function closeSheet() { paySheet.classList.remove('on'); paySheet.setAttribute('aria-hidden', 'true'); sheetBackdrop.classList.remove('on'); }
  $('payBtn').addEventListener('click', openSheet);
  $('sheetHandle').addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

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
    const startPot = cfg.bonusStart[Math.min(count, 5)] * betPerLine;
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
    sScatter();
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
    sDice();
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
        sBust();
        bonus.rolling = false;
        setTimeout(() => endBonus(0), 1500);
        return;
      }
      const add = total * cfg.diceUnit * betPerLine;
      bonus.pot += add;
      bonusLadderEl.innerHTML += `<div class="rung">Roll ${bonus.rolls}: ${d1} + ${d2} = ${total} → +${fmt(add)} &nbsp;·&nbsp; pot ${fmt(bonus.pot)}</div>`;
      bonusLadderEl.scrollTop = bonusLadderEl.scrollHeight;
      bonusPotEl.textContent = fmt(bonus.pot);
      bonusMsgEl.textContent = `Pot is ${fmt(bonus.pot)}. Bank it — or roll again and risk the 7.`;
      sCoin();
      bonus.rolling = false;
      bonusRollBtn.disabled = false;
      bonusBankBtn.disabled = false;
    }, 680);
  });
  bonusBankBtn.addEventListener('click', () => {
    if (!bonus || bonus.rolling || bonus.pot <= 0) return;
    const prize = bonus.pot;
    bonusMsgEl.textContent = `Banked ${fmt(prize)} credits!`;
    sWin(prize >= totalBet() * 2);
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
    const durations = [1100, 1360, 1620, 1880, 2140];
    await Promise.all(finalStops.map((_, r) => spinReel(r, finalStops, durations[r])));
    stops = finalStops;
    const grid = core.windowForStops(cfg.strips, stops);
    const ev = core.evaluateGrid(grid, betPerLine, cfg);
    const mult = isFree ? core.FREE_SPIN_MULTIPLIER : 1;
    const linePay = ev.lineWinTotal * mult;
    let totalWin = linePay + ev.scatterPay;

    for (const w of ev.lineWins) {
      for (let r = 0; r < w.count; r++) markCell(r, w.rows[r], 'win');
      if (w.mult > 1 && w.multCells) for (const r of w.multCells) markCell(r, core.PAYLINES[w.line - 1][r], 'win');
    }
    if (ev.scatterCount >= 1) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'SC') markCell(r, row, 'scatterhit');
    if (ev.bonus) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'BN') markCell(r, row, 'bonushit');

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

    const finishSpin = () => {
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
      refillBtn.classList.toggle('on', credits < core.PAYLINES.length);
      spinning = false;
      setControlsEnabled(true);
    };

    if (ev.bonus) {
      msgEl.textContent = `${ev.bonusCount} bonus dice — DICE ROLL bonus!`;
      spinning = false;
      setTimeout(() => {
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
      }, 900);
      return;
    }
    finishSpin();
  }
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
