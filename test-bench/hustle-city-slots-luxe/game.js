/* Hustle City Slots — shared cabinet UI. Machine chosen by window.MACHINE_ID;
   symbol art/names by window.SYMBOL_ART / window.SYMBOL_NAMES. (c) 2026 J-Dawgs Industries. */
'use strict';
(function () {
  const core = window.SlotCore;
  const cfg = window.SlotMachines[window.MACHINE_ID.toUpperCase()];
  const ART = window.SYMBOL_ART;
  const NAMES = window.SYMBOL_NAMES;
  const LS_KEY = 'hcslots-' + cfg.id;

  const $ = id => document.getElementById(id);
  const reelsEl = [$('reel0'), $('reel1'), $('reel2'), $('reel3'), $('reel4')];
  const creditsEl = $('credits'), betEl = $('bet'), winEl = $('win'), msgEl = $('msg');
  const spinBtn = $('spinBtn'), betOneBtn = $('betOneBtn'), maxBetBtn = $('maxBetBtn');
  const fsBanner = $('fsBanner'), refillBtn = $('refillBtn'), soundBtn = $('soundBtn');

  let credits = 1000, betPerLine = 1, spinning = false;
  let freeSpinsLeft = 0, freeSpinTotal = 0, soundOn = true;
  let stops = [0, 0, 0, 0, 0];
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

  /* ---------- audio (simple WebAudio bleeps) ---------- */
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
  const sTick = () => tone(1250, 0.04, 'square', 0.03);
  const sStop = () => tone(160, 0.09, 'sine', 0.12);
  const sWin = big => { const n = big ? 8 : 5; for (let i = 0; i < n; i++) tone(523 + i * 131, 0.11, 'triangle', 0.07, i * 0.07); };
  const sScatter = () => { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, i * 0.09)); };

  /* ---------- reel rendering ---------- */
  function cellHTML(sym) { return `<div class="cell" data-sym="${sym}"><div class="art">${ART[sym] || ''}</div></div>`; }
  function cellHeight(reelIdx) { return reelsEl[reelIdx].clientHeight / 3; }
  function showWindow() {
    const grid = core.windowForStops(cfg.strips, stops);
    for (let r = 0; r < 5; r++) {
      reelsEl[r].innerHTML = '<div class="track">' + grid[r].map(cellHTML).join('') + '</div>';
    }
    return grid;
  }
  function clearWinMarks() {
    document.querySelectorAll('.cell.win,.cell.scatterhit').forEach(c => c.classList.remove('win', 'scatterhit'));
  }
  function markCell(reel, row, cls) {
    const track = reelsEl[reel].firstElementChild;
    if (track && track.children[row]) track.children[row].classList.add(cls);
  }

  function spinReel(r, finalStops, duration) {
    return new Promise(resolve => {
      const reel = reelsEl[r], H = cellHeight(r), strip = cfg.strips[r];
      const grid = core.windowForStops(cfg.strips, finalStops);
      const seq = [];
      const cur = core.windowForStops(cfg.strips, stops)[r];
      seq.push(...cur);
      const extra = 14 + r * 5;
      let idx = Math.floor(Math.random() * strip.length);
      for (let i = 0; i < extra; i++) { seq.push(strip[idx % strip.length]); idx++; }
      seq.push(...grid[r]);
      const track = document.createElement('div');
      track.className = 'track';
      track.innerHTML = seq.map(cellHTML).join('');
      reel.innerHTML = '';
      reel.appendChild(track);
      const target = -(seq.length - 3) * H;
      track.style.transform = 'translateY(0px)';
      void track.offsetHeight;
      track.style.transition = `transform ${duration}ms cubic-bezier(.12,.6,.18,1)`;
      track.style.transform = `translateY(${target}px)`;
      let tickCount = 0;
      const tickInt = setInterval(() => { if (++tickCount % 3 === 0) sTick(); }, 50);
      const done = () => {
        clearInterval(tickInt);
        track.style.transition = 'none';
        track.innerHTML = grid[r].map(cellHTML).join('');
        track.style.transform = 'translateY(0px)';
        sStop();
        resolve();
      };
      track.addEventListener('transitionend', done, { once: true });
      setTimeout(() => { if (track.isConnected && track.children.length > 3) done(); }, duration + 700);
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
  }
  function countUp(el, from, to, dur) {
    return new Promise(res => {
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
        return `<div class="payrow"><div class="art">${ART[sym]}</div><div class="nm">${NAMES[sym]}</div>${cell(3)}${cell(4)}${cell(5)}</div>`;
      }).join('');
    $('payrows').innerHTML = rows +
      `<div class="payrow"><div class="art">${ART.WD}</div><div class="nm">${NAMES.WD}</div><span class="pv" style="grid-column: span 3; text-align:left">Substitutes for every symbol except ${NAMES.SC}</span></div>` +
      `<div class="payrow"><div class="art">${ART.SC}</div><div class="nm">${NAMES.SC}</div><span class="pv" style="grid-column: span 3; text-align:left">3+ anywhere: pays 2× / 8× / 40× total bet + 7 / 10 / 15 FREE SPINS at 2× line wins</span></div>`;
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
    const durations = [1050, 1300, 1550, 1800, 2050];
    await Promise.all(finalStops.map((_, r) => spinReel(r, finalStops, durations[r])));
    stops = finalStops;
    const grid = core.windowForStops(cfg.strips, stops);
    const ev = core.evaluateGrid(grid, betPerLine, cfg);
    const mult = isFree ? core.FREE_SPIN_MULTIPLIER : 1;
    const linePay = ev.lineWinTotal * mult;
    const totalWin = linePay + ev.scatterPay;

    for (const w of ev.lineWins) for (let r = 0; r < w.count; r++) markCell(r, w.rows[r], 'win');
    if (ev.scatterCount >= 1) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'SC') markCell(r, row, 'scatterhit');

    if (totalWin > 0) {
      sWin(totalWin >= totalBet() * 25);
      await countUp(winEl, 0, totalWin, Math.min(1400, 350 + totalWin));
      credits += totalWin;
      if (isFree) freeSpinTotal += totalWin;
    }
    renderReadouts(totalWin);
    save();

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
        ? (ev.lineWins.length ? `Winner! ${ev.lineWins.map(w => `${w.count}× ${NAMES[w.symbol]}`).join(' · ')}` : 'Scatter pay!')
        : 'Set your bet, then press SPIN.';
    }
    refillBtn.classList.toggle('on', credits < core.PAYLINES.length);
    spinning = false;
    setControlsEnabled(true);
  }
  function runFreeSpins() { if (freeSpinsLeft > 0 && !spinning) doSpin(true); }

  spinBtn.addEventListener('click', () => { ac(); doSpin(false); });
  betOneBtn.addEventListener('click', () => { betPerLine = betPerLine >= 5 ? 1 : betPerLine + 1; renderReadouts(); buildPaytable(); sTick(); });
  maxBetBtn.addEventListener('click', () => { betPerLine = 5; renderReadouts(); buildPaytable(); sTick(); });
  refillBtn.addEventListener('click', () => { credits += 1000; refillBtn.classList.remove('on'); renderReadouts(); save(); msgEl.textContent = '1,000 play credits added. Good luck!'; });
  soundBtn.addEventListener('click', () => { soundOn = !soundOn; soundBtn.textContent = soundOn ? 'SOUND ON' : 'SOUND OFF'; save(); if (soundOn) sTick(); });
  soundBtn.textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';

  showWindow();
  renderReadouts(0);
  buildPaytable();
  refillBtn.classList.toggle('on', credits < core.PAYLINES.length);
})();
