/* Pearl's Paws and Buster's Bones — cabinet UI. Built 2026-11-21 at Joshua's order for his
   mom Pam: the Casino Classics machine cloned 1:1 (same engine in logic.js,
   same strips/paytable/bonus math in machines.js — verified identical RTP
   98.02% in sim/rtp.js) and re-faced as a warm puppy machine: photoreal
   puppy heads as the premium faces, paw prints, dog bones, paw-print WILD /
   x2 / x3 medallions, a chrome-paw SCATTER, and the PICK A PUPPY HOUSE
   bonus (9 dog houses, 8 prizes + BIG AL bust, banked prizes kept — the
   Pick-a-Garage math exactly). Bonus and free spins both fire ~1 in 38.6
   paid spins (the ~1-in-40 standard); SPIN becomes STOP while the reels
   turn; NEW GAME restarts a broke player at 1,000 credits; bets climb the
   $25-step ladder to $2,500 as the peak balance grows; the reels ROLL
   with the shared real-recording sound kit. Reels spin with real-machine
   motion: spin-up acceleration, motion blur at speed, staggered stops
   1-2-3-4-5, and a spring settle with a small recoil. Pull arm + SPIN
   button both fire the same spin.
   Play credits only. (c) 2026 J-Dawgs Industries. */
'use strict';
(function () {
  const core = window.SlotCore;
  const cfg = window.SlotMachines.PEARLS;
  const LS_KEY = 'pearls-paws-v1';

  const ART = {
    GP: 'assets/sym-gp.webp', SP: 'assets/sym-sp.webp', CP: 'assets/sym-cp.webp',
    BO: 'assets/sym-bo.webp', BA: 'assets/sym-ba.webp', PW: 'assets/sym-pw.webp',
    WD: 'assets/sym-wd.webp', SC: 'assets/sym-sc.webp', BN: 'assets/sym-bn.webp', WH: 'assets/sym-wh.webp',
    X2: 'assets/sym-x2.webp', X3: 'assets/sym-x3.webp'
  };
  const NAMES = {
    GP: 'Brown Yorkie', SP: 'White Shih Tzu', CP: 'Shih Tzu Puppy', BO: 'Bone',
    BA: 'Ball', PW: 'Paw Print', WD: 'WILD', SC: 'SCATTER', BN: 'BONUS', WH: 'WHEEL',
    X2: 'WIN ×2', X3: 'WIN ×3'
  };

  const $ = id => document.getElementById(id);
  const reelsEl = [$('reel0'), $('reel1'), $('reel2'), $('reel3'), $('reel4')];
  const creditsEl = $('credits'), betEl = $('bet'), winEl = $('win'), msgEl = $('msg');
  const spinBtn = $('spinBtn'), betDownBtn = $('betDownBtn'), betUpBtn = $('betUpBtn'), maxBetBtn = $('maxBetBtn');
  const celebEl = $('celeb'), celebKickEl = $('celebKick'), celebTitleEl = $('celebTitle'), celebSubEl = $('celebSub'), celebAmtEl = $('celebAmt');
  const celebRainEl = $('celebRain'), dogTagAmtEl = $('dogTagAmt');
  const celebVideo = $('celebVideo');
  const wheelOverlay = $('wheelOverlay'), wheelMsg = $('wheelMsg'), wheelRotor = $('wheelRotor'), wheelPointer = $('wheelPointer'), wheelPawPrize = $('wheelPawPrize');
  const fsBanner = $('fsBanner'), newGameBtn = $('newGameBtn'), soundBtn = $('soundBtn');
  const brokePanel = $('brokePanel'), brokeBackBtn = $('brokeBackBtn');
  const spinFace = spinBtn.querySelector('.spin-face'), tierLineEl = $('tierLine');
  const soundStateEl = $('soundState'), winFlash = $('winFlash');
  const paySheet = $('paySheet'), sheetBackdrop = $('sheetBackdrop');
  const bonusGame = $('bonusGame'), bonusBackdrop = $('bonusBackdrop');
  const trunksEl = $('trunks'), bonusBankEl = $('bonusBank');
  const bonusResultEl = $('bonusResult'), bonusCollectBtn = $('bonusCollect');
  const fetchGame = $('fetchGame'), fetchBackdrop = $('fetchBackdrop');
  const fetchPotEl = $('fetchPot'), fetchBankEl = $('fetchBank'), fetchBallNoEl = $('fetchBallNo');
  const fetchResultEl = $('fetchResult'), fetchThrowBtn = $('fetchThrowBtn'), fetchBankBtn = $('fetchBankBtn'), fetchCollectBtn = $('fetchCollect');
  const fetchBuster = $('fetchBuster'), fetchBallImg = $('fetchBallImg'), fetchButterfly = $('fetchButterfly');
  const fetchMarkers = Array.from(document.querySelectorAll('#fetchLadder .fetch-marker'));

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
     Joshua (2026-11-21): the reels must ROLL — and after his ear test
     killed the modeled kit, the roll itself is now a REAL recording:
     a loop of an actual slot machine's reels (shared kit, Kit.roll*),
     its rate and level tracking the fastest reel's speed — rising on
     spin-up, rolling through cruise, falling as each reel brakes.
     Every symbol that passes adds a real prize-wheel peg click (Kit
     'peg', rate-jittered like a real mechanism), and each reel landing
     keeps the real mechanical clunk (sStop). When the last reel lands
     — naturally or via STOP — the roll cuts with it. */
  const RollSound = (() => {
    let activeReels = 0, level = 0;
    function reelStart() {
      activeReels++;
      if (!soundOn) return;
      if (activeReels === 1) Kit.rollStart();
    }
    function setSpeed(norm) {
      if (!soundOn) return;
      const n = Math.max(0, Math.min(1, norm));
      level = n > level ? n : level + (n - level) * 0.25;
      Kit.rollSpeed(level);
    }
    function clack(v) {
      if (!soundOn) return;
      Kit.play('peg', { group: 'peg', gain: Math.min(0.85, 0.3 + v / 16000), rate: 0.92 + Math.random() * 0.18 });
    }
    function reelDone() {
      activeReels = Math.max(0, activeReels - 1);
      if (activeReels === 0) { level = 0; Kit.rollStop(false); }
    }
    function cut() { /* sound toggled off mid-spin: silence the roll at once */
      activeReels = 0; level = 0;
      Kit.rollStop(true);
    }
    return { reelStart, setSpeed, clack, reelDone, cut, isActive: () => activeReels > 0, level: () => level };
  })();
  /* STOP support: every spinning reel registers its brake handle here;
     STOP calls them all and each reel brakes fast — a hair of stagger,
     left to right — onto the same dealt stop it was already rolling to. */
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
  /* SILVER PAW LANDING POP (Joshua, 2026-11-22 — "my mom's paws land
     just like those green dollar signs"): on a paw slam spin, each
     landed silver paw swells big and settles as its reel stops. */
  function popLandedPaws(r, grid) {
    for (let row = 0; row < 3; row++) {
      if (grid[r][row] !== 'SC') continue;
      markCell(r, row, 'pawpop');
      const track = reelsEl[r].firstElementChild;
      const cell = track && track.children[row];
      if (cell) setTimeout(() => cell.classList.remove('pawpop'), 950);
    }
  }

  /* Real-machine reel motion, driven by the shared physics in logic.js
     (createReelMotion — identical on all three cabinets): spin-UP from
     rest on a smoothstep torque curve (~0.42s), a cruise at peak speed
     with speed-proportional motion blur, a firm brake, staggered stops
     left to right, then a spring settle over the last fraction of a cell
     that overshoots a hair and recoils ONCE onto the stop. STOP brakes
     the reel fast into the same settle on the same dealt stop. The
     symbol sequence and the dealt result are exactly the engine's —
     only the motion is presentation. */
  /* Peak reel speed — Joshua, 2026-11-21: "spin the wheels 20 times
     faster." The old build peaked at ~943 px/s at a 59px cell
     (16.0 symbols/sec), so every reel now cruises at 20x that:
     319.7 symbols/sec. Distance grows with the speed — the spin keeps
     its ~2-2.5s shape, the strip just travels ~20x farther. */
  const PEAK_SYM_PER_SEC = 319.7;
  function spinReel(r, finalStops, duration, opts) {
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
      let last = performance.now(), lastCell = 0, lastTick = 0, lastBlur = -1;
      let finished = false, stopTimer = null;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(hardStop);
        if (stopTimer) clearTimeout(stopTimer);
        activeReelStops.delete(stopper);
        track.style.filter = '';
        track.innerHTML = grid[r].map(s => cellHTML(s, H)).join('');
        track.style.transform = 'translateY(0px)';
        sStop();
        if (opts && opts.slam) {
          Kit.thunk(); /* the slam hit — real-kit percussion, as the door machines land it */
          const cab = $('cabinet');
          if (cab) { cab.classList.remove('slamming'); void cab.offsetWidth; cab.classList.add('slamming'); }
        }
        /* Pam's silver-paw ding (2026-11-22): if THIS reel's dealt
           window holds a silver paw (the chrome SCATTER), ring the
           real casino bell once — at the exact moment the reel lands,
           one ding per paw, so she can count 1-2-3 by ear. Non-paw
           stops keep the plain thunk above; nothing dings at spin
           start or at payout. */
        if (grid[r].includes('SC')) Kit.pawDing();
        RollSound.reelDone();
        resolve();
      };
      /* STOP: brake this reel (staggered a hair by reel order) — the
         motion lands it on the same dealt stop through the same settle;
         the timer is only a failsafe if the brake ever failed to land. */
      const stopper = () => {
        if (finished || stopTimer) return;
        motion.brake(r * 0.05);
        stopTimer = setTimeout(finish, 1400);
      };
      const hardStop = setTimeout(finish, duration + 1600);
      activeReelStops.add(stopper);
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
    syncBroke();
  }
  /* OUT OF COINS (Joshua, 2026-11-21 21:59 CT — Pam hit the dead end
     playing live): when the balance can't cover the smallest bet, a big
     BACK panel shows right under the message line. One tap on BACK runs
     the same refill as NEW GAME — back on the main screen with a fresh
     1,000 coins, ready to spin. Never shows over a bonus/wheel/free-spin
     flow that is still playing out. */
  function syncBroke() {
    if (!brokePanel) return;
    const overlayUp = document.querySelector('.bonus.on, .wheel-overlay.on, .celeb.on');
    const broke = credits < BET_MIN && freeSpinsLeft <= 0 && !overlayUp;
    brokePanel.classList.toggle('on', broke);
    brokePanel.setAttribute('aria-hidden', broke ? 'false' : 'true');
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
     brakes every reel fast onto its dealt stop — results and payouts are
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
        const cells = sym === 'BO'
          ? `<span class="pv">2× <b>${fmt(Math.round(t[2] * lineBet()))}</b></span>${cell(3)}${cell(4)}`
          : (t[5] ? `${cell(3)}${cell(4)}${cell(5)}` : `${cell(3)}${cell(4)}<span class="pv"></span>`);
        return `<div class="payrow"><div class="thumb"><img src="${ART[sym]}" alt="${NAMES[sym]}"></div><div class="nm">${NAMES[sym]}</div>${cells}</div>`;
      }).join('');
    $('payrows').innerHTML = rows +
      `<div class="payrow"><div class="thumb"><img src="${ART.WD}" alt="WILD"></div><div class="nm">WILD</div><span class="pv wide">Substitutes for every symbol except SCATTER</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X2}" alt="WIN ×2"></div><div class="nm">WIN ×2</div><span class="pv wide">Anywhere on a winning line, this line's win is DOUBLED (×2)</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X3}" alt="WIN ×3"></div><div class="nm">WIN ×3</div><span class="pv wide">Anywhere on a winning line, this line's win is TRIPLED (×3). Two multipliers on the same line multiply together — ×2 and ×3 pay ×6</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.SC}" alt="SCATTER"></div><div class="nm">SCATTER</div><span class="pv wide">3+ anywhere: pays 2× / 8× / 40× total bet + 7 / 10 / 15 FREE SPINS at 2× line wins. Every silver paw DINGS as its reel lands — count 1-2-3 by ear!</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.BN}" alt="BONUS"></div><div class="nm">BONUS — BUSTER'S BONES</div><span class="pv wide">3+ dog houses anywhere on a paid spin opens the yard: 9 houses — 8 hide BONES with amounts on them (½×–4× total bet), 1 hides BIG AL, the tall redheaded cowboy — pick him and the round ends (banked bones are kept). Clear all 8 bone houses for a 6× BUSTER BONUS</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.WH}" alt="WHEEL"></div><div class="nm">WHEEL — PEARL'S PAWS</div><span class="pv wide">The chrome WHEEL token rides reels 2, 3 and 4 — one in each of those windows on a paid spin opens Pearl's wheel. Every wedge pays little PAWS with amounts (× your total bet): MINI 8× · MINOR 15× · MAJOR 30× · GRAND 50× — and the GRAND wedge carries BIG AL himself: land on him for the top prize. Every wedge pays. Not the scatter: the plain chrome PAW is free spins, the WHEEL medallion is the wheel</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.BA}" alt="BALL"></div><div class="nm">BALL — FETCH!</div><span class="pv wide">3+ red balls anywhere on a paid spin can open FETCH! (about 1 in 162 spins): Buster chases the ball past 5 bone markers and the pot climbs 1× · 2× · 3× · 5× · 8× your total bet with every good throw. After each throw, BRING IT BACK to bank the pot safe or THROW AGAIN to grow it — a butterfly can make Buster drop the ball and that pot is gone (banked pots are always safe). 3 balls — bank all 3 at the full 8× and a 15× PERFECT GAME bonus makes 39× in all</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.GP}" alt="BET"></div><div class="nm">BET</div><span class="pv wide">Bets run in $25 steps: $25, $50, $75 … all the way up to $2,500 a spin. A step unlocks the first time your balance reaches it — and stays unlocked even if your balance dips. Use the −25 / +25 buttons or MAX BET. NEW GAME resets you to a $25 bet</span></div>`;
  }

  /* ---------- paytable sheet ---------- */
  function openSheet() { paySheet.classList.add('on'); paySheet.setAttribute('aria-hidden', 'false'); sheetBackdrop.classList.add('on'); }
  function closeSheet() { paySheet.classList.remove('on'); paySheet.setAttribute('aria-hidden', 'true'); sheetBackdrop.classList.remove('on'); }
  $('payBtn').addEventListener('click', openSheet);
  $('sheetHandle').addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

  /* ---------- bonus-screen minimum-view lock (Joshua, 2026-11-22 00:07 CT) ----------
     "Make sure you have to see a couple seconds at least of the bonus
     screen before it goes away. It's easy to accidentally push it right
     past it." Every bonus screen arms its lock the moment it appears;
     while locked, a tap that would skip / advance / dismiss it is
     IGNORED — never queued, so a stray tap at 0.5s does not fire at
     2.0s. After 2 seconds every tap works exactly as before. Deliberate
     play inside a bonus (picking a house, throwing the ball, spinning
     the wheel) is untouched once its screen has been up the 2 seconds,
     and auto-advance timers are not taps — they run as they always did.
     Presentation only: no math, logic or sound changes. */
  const BONUS_MIN_VIEW_MS = 2000;
  const mkViewLock = () => ({
    t: 0,
    arm() { this.t = performance.now(); },
    locked() { return performance.now() - this.t < BONUS_MIN_VIEW_MS; }
  });
  const celebLock = mkViewLock(), wheelLock = mkViewLock(),
        bonusLock = mkViewLock(), bonusCollectLock = mkViewLock(),
        fetchLock = mkViewLock(), fetchCollectLock = mkViewLock();

  /* ---------- celebration screens (Joshua, 2026-11-21 12:52–12:54 CT) ----------
     A bonus or free-spins trigger NEVER cuts straight in: a full-cabinet
     celebration plays first (~3s, tap to skip ahead — never skips the
     prize itself). Input is locked by the overlay while it shows. */
  /* Bone + paw rain for the dog-tag BIG WIN screen: flat shapes in the
     reference's tan / gold / cream, falling + tumbling like confetti.
     Built fresh per showing, torn down when the screen closes. */
  function buildRain() {
    const BONE = '<svg viewBox="-30 -20 60 40"><use href="#dtBone" fill="FILL"/></svg>';
    const PAW = '<svg viewBox="-30 -25 60 50"><use href="#dtPaw" fill="FILL"/></svg>';
    const fills = ['#e8b04b', '#d99a35', '#f0d49b', '#c9852e'];
    let html = '';
    for (let i = 0; i < 26; i++) {
      const bone = i % 3 !== 2;
      const size = Math.round(bone ? 26 + Math.random() * 30 : 20 + Math.random() * 22);
      const left = (Math.random() * 96).toFixed(1);
      const dur = (2.8 + Math.random() * 2.4).toFixed(2);
      const delay = (-Math.random() * 5).toFixed(2);
      const sway = Math.round(Math.random() * 70 - 35);
      const spin = Math.round(Math.random() * 520 - 260);
      const shape = (bone ? BONE : PAW).replace('FILL', fills[i % fills.length]);
      html += `<span class="rain-piece" style="left:${left}%;width:${size}px;animation-duration:${dur}s;animation-delay:${delay}s;--sway:${sway}px;--spin:${spin}deg">${shape}</span>`;
    }
    celebRainEl.innerHTML = html;
  }
  function clearRain() { celebRainEl.innerHTML = ''; }

  function celebrate(kind, title, sub, durMs, amt, theme) {
    return new Promise(res => {
      celebEl.className = 'celeb on k-' + kind;
      celebKickEl.textContent = kind === 'fs' ? 'FREE SPINS' : kind === 'win' ? 'BIG WIN' : kind === 'grand' ? 'JACKPOT' : 'BONUS';
      celebTitleEl.textContent = title;
      celebSubEl.textContent = sub || '';
      /* Pam's big-win amount (2026-11-22): when a celebration carries a
         win total, it renders in the giant gold .celeb-amt line between
         the title and the sub — front and center, impossible to miss.
         On the dog-tag screen (theme 'dogtag', the BIG WIN celebration)
         the same amount is engraved on the silver tag instead. */
      celebAmtEl.textContent = amt || '';
      celebEl.classList.toggle('has-amt', !!amt);
      const dogtag = theme === 'dogtag';
      celebEl.classList.toggle('dogtag', dogtag);
      dogTagAmtEl.textContent = amt ? String(amt).replace(/\s*CREDITS$/i, '') : '';
      if (dogtag) buildRain(); else clearRain();
      celebEl.setAttribute('aria-hidden', 'false');
      document.body.classList.add('celebrating'); /* cabinet light-chase runs with the show */
      celebLock.arm(); /* minimum-view lock: no tap-skip for the first 2s */
      /* Each celebration clip carries its own soundtrack, so the kit
         stays quiet under the show — no double audio mush. If the clip
         can't play at all, the kit fanfare covers the moment. */
      /* the celebration SHOW (Joshua, 2026-11-21 22:00–22:02 CT): a
         RANDOM pick per trigger from his three chosen clips — #3 THE
         BIG CATCH, #4 TREAT JAR POP, #5 PAW PRINT TRAIL. The old Puppy
         Party clip was REMOVED from the game at his order the same
         night (its master stays preserved in the vault). If a clip
         can't play, the CSS celebration underneath shows instead —
         never a black screen, never a hang. */
      let videoLive = false;
      if (celebVideo && !dogtag) { /* the dog-tag screen is a designed card, no clip behind it */
        try {
          const CELEB_CLIPS = ['assets/celeb-big-catch.mp4', 'assets/celeb-treat-jar.mp4', 'assets/celeb-paw-trail.mp4'];
          const pick = CELEB_CLIPS[Math.floor(Math.random() * CELEB_CLIPS.length)];
          if (celebVideo.getAttribute('src') !== pick) { celebVideo.src = pick; celebVideo.load(); }
          celebVideo.classList.remove('dead');
          const startAt = kind === 'grand' ? 2.5 : 0.2; /* grand starts on the finale half of the clip */
          const seek = () => { try { celebVideo.currentTime = startAt; } catch (e) {} };
          if (celebVideo.readyState >= 1) seek(); else celebVideo.addEventListener('loadedmetadata', seek, { once: true });
          celebVideo.muted = false;
          const p = celebVideo.play();
          if (p && p.then) p.then(() => { videoLive = true; }).catch(() => {
            /* autoplay-with-sound refused: retry muted (show still runs),
               and let the kit fanfare cover the moment */
            celebVideo.muted = true;
            const p2 = celebVideo.play();
            if (p2 && p2.catch) p2.catch(() => celebVideo.classList.add('dead'));
            if (kind === 'fs') Kit.fsFlourish(); else Kit.fanfare();
          });
          celebVideo.onerror = () => celebVideo.classList.add('dead');
        } catch (e) { celebVideo.classList.add('dead'); }
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        celebEl.classList.remove('on');
        celebEl.classList.remove('dogtag');
        clearRain();
        celebEl.setAttribute('aria-hidden', 'true');
        celebEl.removeEventListener('click', onTap);
        document.body.classList.remove('celebrating');
        if (celebVideo) { try { celebVideo.pause(); } catch (e) {} }
        res();
      };
      /* a tap inside the first 2s is ignored outright — not queued */
      const onTap = () => { if (celebLock.locked()) return; finish(); };
      celebEl.addEventListener('click', onTap);
      setTimeout(finish, durMs);
    });
  }
  /* bigger bets celebrate a touch longer/brighter */
  function celebDur() { return 5000; } /* the show runs ~5s (Joshua, 2026-11-21 18:53 CT), tap to skip */

  /* ---------- PEARL'S PAWS — BONUS WHEEL (added 2026-11-21 at Joshua's
     order: "do the wheel too" + tiered jackpots 18:56 CT + the realism
     standard 18:56 CT + named Pearl's Paws 19:01 CT) ----------
     A layered SVG wheel, not flat wedges on a disc: lit radial-gradient
     wedges with raised separators, a machined dark-blue rim with bolts, real
     peg spheres at every boundary, a glass gloss that does NOT rotate,
     and Big Al's face (Joshua's pick #2) on the GRAND wedge. Prizes are
     presented as little black PAWS carrying chrome amounts. The wedge table
     is cfg.wheel — the same table the RTP simulator models. Physics mirror
     the platform wheel: the winning wedge is drawn first, then the wheel
     spins (hard launch, friction decay, real-kit peg clicks) and settles
     exactly on it. */
  const WEDGES = cfg.wheel, TIERS = cfg.wheelTiers || {};
  const WSEG = 360 / WEDGES.length;
  let wheelBuilt = false, wheelAngle = 0, wheelSpinning = false, wheelArmed = null;
  const SVGNS = 'http://www.w3.org/2000/svg';
  function wedgeFill(v, i) {
    if (v === 0) return 'url(#wgBust)';
    if (TIERS[v] === 'GRAND') return 'url(#wgGrand)';
    if (TIERS[v] === 'MAJOR') return 'url(#wgMajor)';
    if (TIERS[v] === 'MINOR') return 'url(#wgMinor)';
    if (TIERS[v] === 'MINI') return 'url(#wgMini)';
    return i % 2 ? 'url(#wgA)' : 'url(#wgB)';
  }
  function buildWheel() {
    if (wheelBuilt) return;
    wheelBuilt = true;
    /* machined bolts around the static brass rim */
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
      p.setAttribute('stroke', 'rgba(6,10,18,.85)');
      p.setAttribute('stroke-width', '1.6');
      wheelRotor.appendChild(p);
      /* label group at the wedge center angle */
      const g = document.createElementNS(SVGNS, 'g');
      const mid = i * WSEG;
      g.setAttribute('transform', `rotate(${mid} ${cx} ${cy})`);
      if (v !== 0 && TIERS[v] !== 'GRAND') {
        const paw = document.createElementNS(SVGNS, 'use');
        paw.setAttribute('href', '#wgPaw');
        paw.setAttribute('transform', `translate(${cx} ${cy - rO + (TIERS[v] ? 20 : 26)}) scale(${TIERS[v] ? 0.5 : 0.62})`);
        paw.setAttribute('fill', '#14100c');
        paw.setAttribute('opacity', '0.92');
        g.appendChild(paw);
      }
      if (TIERS[v]) {
        if (TIERS[v] === 'GRAND') {
          /* Big Al IS the grand prize (Joshua, 2026-11-21 19:32 CT):
             his face rides the 50x wedge under the GRAND label */
          const img = document.createElementNS(SVGNS, 'image');
          img.setAttribute('href', 'assets/big-al-face.webp');
          img.setAttribute('x', cx - 15); img.setAttribute('y', cy - rO + 4);
          img.setAttribute('width', 30); img.setAttribute('height', 30);
          img.setAttribute('clip-path', 'url(#grandClip)');
          img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
          g.appendChild(img);
        }
        const t1 = document.createElementNS(SVGNS, 'text');
        t1.setAttribute('x', cx); t1.setAttribute('y', cy - rO + (TIERS[v] === 'GRAND' ? 48 : 56));
        t1.setAttribute('class', 'wlabel tier' + (TIERS[v] === 'GRAND' ? '' : ' wtier'));
        t1.textContent = TIERS[v];
        const t2 = document.createElementNS(SVGNS, 'text');
        t2.setAttribute('x', cx); t2.setAttribute('y', cy - rO + (TIERS[v] === 'GRAND' ? 66 : 74));
        t2.setAttribute('class', 'wlabel tierval' + (TIERS[v] === 'GRAND' ? '' : ' wtier'));
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
      /* Spin profile (fixed 2026-11-22 — Joshua, watching Pam play:
         "in the bonus wheel and that one spun all funny"): the old
         quartic ease-out started at full speed and spent its last
         second-plus nearly frozen (its final second covered ~3
         degrees), then stopped dead — the funny spin. A real wheel
         obeys friction: fast off the pull, velocity decaying
         exponentially, still clearly travelling as it settles onto
         the winning peg. This profile is exact at u=1, so the wheel
         still lands precisely on the awarded wedge; its tail keeps
         ~27 degrees of travel in the final second — a settle, not a
         stall. Peg clicks now fire as a peg actually crosses the
         pointer (pegs ride the wedge boundaries, half a wedge offset
         from the centers the old counter used). */
      const easeOut = u => (1 - Math.exp(-4.6 * u)) / (1 - Math.exp(-4.6));
      let lastPeg = Math.floor((start + WSEG / 2) / WSEG);
      const t0 = performance.now();
      (function frame(now) {
        const u = Math.min(1, (now - t0) / dur);
        wheelAngle = start + total * easeOut(u);
        wheelRotor.setAttribute('transform', `rotate(${wheelAngle} 170 170)`);
        const peg = Math.floor((wheelAngle + WSEG / 2) / WSEG);
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
      wheelPawPrize.classList.remove('on');
      wheelMsg.textContent = 'Pull the arm — or tap SPIN!';
      msgEl.textContent = "PEARL'S PAWS! Pull the arm or tap SPIN to spin the wheel!";
      betDownBtn.disabled = true; betUpBtn.disabled = true; maxBetBtn.disabled = true;
      spinBtn.disabled = false;
      spinBtn.classList.remove('stop');
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
        {
          const tier = TIERS[val];
          wheelPawPrize.querySelector('.paw-amt').textContent = '+' + fmt(pay);
          wheelPawPrize.classList.add('on');
          if (tier === 'GRAND') {
            wheelMsg.innerHTML = `BIG AL — GRAND JACKPOT! The cowboy himself pays <b>${fmt(pay)}</b> credits!`;
            Kit.jackpot();
            await celebrate('grand', 'GRAND JACKPOT!', `Pearl's biggest paw — ${fmt(pay)} credits!`, 5000, `${fmt(pay)} CREDITS`);
          } else if (tier) {
            wheelMsg.innerHTML = `${tier} JACKPOT! The paw pays <b>${fmt(pay)}</b> credits!`;
            Kit.jackpot();
          } else {
            wheelMsg.innerHTML = `The paw pays <b>${fmt(pay)}</b> credits!`;
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
        msgEl.textContent = credits < BET_MIN ? 'Out of coins — tap the big BACK button below to get 1,000 more coins.' : 'Not enough credits for that bet — lower the bet.';
        newGameBtn.classList.toggle('on', credits < BET_MIN);
        spinning = false; setControlsEnabled(true);
        return;
      }
      credits -= totalBet();
      renderReadouts();
      Kit.lever(); /* the real lever pull that starts a paid spin */
    }
    setStopMode(true);
    msgEl.textContent = isFree ? `Free spin — ${freeSpinsLeft} left after this one. Wins pay double!` : 'Good luck!';
    const finalStops = core.randomStops(Math.random, cfg.strips);
    /* SILVER PAW SLAM SPIN (Joshua, 2026-11-22: "I want my mom's paws
       to land just like those green dollar signs" — the landing he
       approved on the Hustle City door machines, mirrored): when the
       dealt grid carries 3+ silver paws, this spin performs — the
       reels stop in sequence with long hangs (the slow crawl; reels
       still turning after the second paw glow in anticipation), each
       reel slams home (thunk + cabinet jolt in spinReel), every paw
       DINGS as it lands (spinReel) and POPS big (popLandedPaws), a
       beat passes, and then the free spins open. Paid spins only —
       free-spin retriggers land normally, like the door machines. */
    const dealtGrid = core.windowForStops(cfg.strips, finalStops);
    const dealtEv = core.evaluateGrid(dealtGrid, lineBet(), cfg);
    const pawSlam = !isFree && dealtEv.scatterCount >= 3;
    const durations = pawSlam
      ? [2000, 2650, 3300, 3950, 4900] /* sequential slams; the deciding reels hang longest */
      : [1700, 1900, 2100, 2300, 2500]; /* staggered stops, reel 1 first, ~200ms apart */
    if (pawSlam) {
      const pawReels = [0, 1, 2, 3, 4].filter(r => dealtGrid[r].includes('SC'));
      for (let r = pawReels[1] + 1; r < 5; r++) reelsEl[r].classList.add('paw-tease');
    }
    window.__pawSlam = pawSlam;
    await Promise.all(finalStops.map((_, r) => spinReel(r, finalStops, durations[r], pawSlam ? { slam: true } : undefined)
      .then(() => { reelsEl[r].classList.remove('paw-tease'); if (pawSlam) popLandedPaws(r, dealtGrid); })));
    window.__pawSlam = false;
    if (pawSlam) await new Promise(res => setTimeout(res, 500)); /* the beat after the last slam — then the show goes off */
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
    const bonusHit = !isFree && ev.bonusCount >= 3; /* Buster's Bones: paid spins only */
    if (bonusHit) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'BN') markCell(r, row, 'bonushit');
    const wheelHit = !isFree && ev.wheelHit; /* Pearl's Paws wheel: paid spins only */
    if (wheelHit) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'WH') markCell(r, row, 'bonushit');
    /* FETCH! (2026-11-21): the concept's trigger — 3+ red balls anywhere on
       a paid spin — with a WEIGHTED award: BA is a common line symbol, so
       3+ balls land on ~59% of spins; cfg.fetch.weight is what lands the
       game itself ~1 in 176 spins (see the machines.js header). */
    let fetchHit = !isFree && ev.ballCount >= 3 && Math.random() < cfg.fetch.weight;
    if (debugForceFetch && !isFree) { fetchHit = true; debugForceFetch = false; }
    if (fetchHit) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'BA') markCell(r, row, 'bonushit');

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
        fsBanner.textContent = `${ev.freeSpins} FREE SPINS — LINE WINS ×2`;
        fsBanner.classList.add('on');
        msgEl.textContent = `${ev.scatterCount} scatters! ${ev.freeSpins} free spins${isFree ? ' added' : ''} — here they come!`;
        spinning = false;
        setStopMode(false);
        /* celebration first, then the spins (Joshua, 12:54 CT) */
        celebrate('fs', `${ev.freeSpins} FREE SPINS!`, 'Line wins pay DOUBLE — here they come!', 5000)
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
          ? `Bonus paid ${fmt(lastBonusPaid)} credits!`
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
    /* FIVE OF A KIND on any payline gets a celebration too (Joshua,
       2026-11-21 20:57 CT: "a celebration for every type of small bonus
       there is — or wheel, or five of a kind"). Fires before any bonus
       game on the same spin opens; free-spins retriggers already take
       the FS celebration path above.
       BIG WIN (Pam's request, via Joshua 2026-11-22: "How about
       something to show you a big win?"): any win of 10x the total bet
       or more gets the DOG-TAG celebration screen — Joshua's pick #3
       from the rendered options (12:41 CT): deep blue field, bones and
       paws raining like confetti, chunky gold BIG WIN letters, and the
       amount engraved on a big silver dog tag hanging below them —
       held the full celebDur() (~5s) under the same 2-second
       minimum-view lock as every bonus screen, so it can't be tapped
       past before she's had a real look at it. A five-of-a-kind that
       is also a big win gets ONE combined celebration, not two. */
    const w5 = ev.lineWins.find(w => w.count >= 5);
    const BIG_WIN_RATIO = 10;
    if (totalWin >= BIG_WIN_RATIO * totalBet()) {
      await celebrate('win', 'BIG WIN!',
        w5 ? `Five ${NAMES[w5.symbol]} on one line — look at that win!` : 'Look at that win!',
        celebDur(), `${fmt(totalWin)} CREDITS`, 'dogtag');
    } else if (w5) {
      await celebrate('win', 'FIVE OF A KIND!', `Five ${NAMES[w5.symbol]} on one line — celebration time!`, celebDur(), totalWin > 0 ? `${fmt(totalWin)} CREDITS` : '');
    }
    if (bonusHit || fetchHit || wheelHit) {
      /* celebrate first, THEN the bonus games; any free spins won on this
         spin run after them (platform order: bonuses first, free spins
         after). Several on one spin run in order: Buster's Bones, then
         Fetch!, then the wheel. */
      const tb = totalBet();
      (async () => {
        if (bonusHit) {
          msgEl.textContent = `${ev.bonusCount} BONUS dog houses — the yard is open!`;
          await celebrate('bonus', "BUSTER'S BONES!", `${ev.bonusCount} BONUS dog houses hit — pick your houses!`, celebDur());
          await new Promise(res => openBonus(tb, res));
        }
        if (fetchHit) {
          msgEl.textContent = `${ev.ballCount} red balls — Fetch!`;
          await celebrate('bonus', 'FETCH!', `${ev.ballCount} red balls landed — throw the ball and watch Buster run!`, celebDur());
          await runFetch(tb);
        }
        if (wheelHit) {
          msgEl.textContent = 'WHEEL tokens on reels 2, 3 and 4 — the wheel is open!';
          await celebrate('bonus', "PEARL'S PAWS!", 'The wheel tokens lit all three middle reels — spin the wheel!', celebDur());
          await runBonusWheel(tb);
        }
        finishTurn();
      })();
      return;
    }
    finishTurn();
  }

  /* ---------- BUSTER'S BONES bonus (the Pick a Puppy House game, renamed
     by Joshua 2026-11-21 19:01 CT) ----------
     9 dog houses: 8 hide BONES with amounts on them (x total bet of the
     triggering spin) + 1 hides BIG AL (Joshua's picked cowboy, candidate
     #2). Banked bones are KEPT even when Big Al ends the round; clearing
     all 8 bone houses adds the completion (BUSTER) bonus. Math unchanged. */
  let bonusDeck = null, lastBonusPaid = 0;
  function openBonus(tb, done) {
    setControlsEnabled(false);
    Kit.trunkOpen(); /* a wooden latch + creak as the yard gate opens */
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
      b.setAttribute('aria-label', `Dog house ${i + 1}`);
      b.innerHTML = `<img src="assets/house-closed.webp" alt="" draggable="false"><span class="car-num">${i + 1}</span>`;
      b.addEventListener('click', () => {
        if (bonusLock.locked()) return; /* yard must be seen 2s before a pick lands */
        if (over || b.classList.contains('open')) return;
        b.classList.add('open');
        Kit.trunkOpen(); /* latch + creak on every trunk */
        if (card.scotty) {
          over = true;
          bonusCollectLock.arm(); /* the result + COLLECT get their own 2s of screen time */
          b.classList.add('scotty');
          b.innerHTML = `<img src="assets/big-al-face.webp" alt="Big Al" draggable="false"><span class="busted-tag">BIG AL!</span>`;
          Kit.bust(); /* the shared bust sting — round over */
          bonusResultEl.innerHTML = `<img class="scotty-img" src="assets/big-al.webp" alt="Big Al, a tall redheaded cowboy with a big red mustache, tipping his hat from inside a dog house">BIG AL! That house was hiding Big Al — the tall redheaded cowboy himself! Bonus over — you keep your banked <b>${fmt(banked)}</b> credits. Only the un-picked houses are lost.`;
          bonusCollectBtn.textContent = `COLLECT ${fmt(banked)}`;
          bonusCollectBtn.classList.add('on');
          setTimeout(() => bonusGame.scrollTo({ top: bonusGame.scrollHeight, behavior: 'smooth' }), 60);
          return;
        }
        banked += card.prize;
        safePicked++;
        b.innerHTML = `<img src="assets/house-open.webp" alt="" draggable="false"><span class="prize"><img class="prize-bone" src="assets/sym-bo.webp" alt="" draggable="false"><span class="prize-amt">+${fmt(card.prize)}</span></span>`;
        /* rising prize dings as the bank grows; deep picks get tension */
        setTimeout(() => Kit.prize(safePicked - 1), 130);
        if (safePicked >= 5) setTimeout(() => Kit.tension(), 420);
        bonusBankEl.textContent = fmt(banked);
        if (safePicked === cfg.bonus.prizes.length) {
          over = true;
          bonusCollectLock.arm(); /* the result + COLLECT get their own 2s of screen time */
          banked += completion;
          bonusBankEl.textContent = fmt(banked);
          Kit.jackpot(); /* full clear = the jackpot celebration */
          bonusResultEl.innerHTML = `<span class="clear-title">YOU CLEARED THE YARD!</span><br>All 8 bone houses opened and no Big Al in sight — BUSTER BONUS +${fmt(completion)} credits. Total banked: <b>${fmt(banked)}</b>.`;
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
    bonusLock.arm(); /* minimum-view lock starts as the yard appears */
    const collect = () => {
      if (bonusCollectLock.locked()) return; /* an early tap on COLLECT is ignored, not queued */
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
  /* ---------- FETCH! bonus (2026-11-21, Joshua's pick #2 from the second
     bonus board) ----------
     Buster chases the red ball past 5 bone markers; every good throw climbs
     the pot ladder (1x/2x/3x/5x/8x of the triggering spin's total bet).
     After each throw Pam chooses BRING IT BACK (bank the pot — banked money
     is ALWAYS safe) or THROW AGAIN. Each throw, a butterfly may distract
     Buster (cfg.fetch.drop): he drops the ball and the UNBANKED pot is
     gone. 3 balls. Banking all three balls at the full 8x adds the 15x
     PERFECT GAME bonus — a perfect game pays 3x8 + 15 = 39x, the concept's
     headline number. No timers, no pressure: the game waits for her tap.
     forcedDrops (QA only): array of booleans, one per throw (true = drop). */
  let debugForceFetch = false;
  function runFetch(tb, forcedDrops) {
    const F = cfg.fetch;
    return new Promise(resolve => {
      setControlsEnabled(false);
      Kit.trunkOpen();
      let banked = 0, ball = 1, rung = 0, fullBalls = 0, busy = false, over = false;
      const queue = Array.isArray(forcedDrops) ? forcedDrops.slice() : null;
      const POS = [13, 27, 41, 55, 69, 83]; /* Buster's left % at rung 0..5 */
      const potNow = () => (rung > 0 ? Math.round(F.ladder[rung - 1] * tb) : 0);
      const wait = ms => new Promise(r => setTimeout(r, ms));

      function render() {
        fetchPotEl.textContent = fmt(potNow());
        fetchBankEl.textContent = fmt(banked);
        fetchBallNoEl.textContent = `${Math.min(ball, F.balls)} / ${F.balls}`;
        fetchMarkers.forEach((m, i) => m.classList.toggle('lit', i < rung));
        fetchBuster.style.left = POS[rung] + '%';
        fetchBallImg.style.left = (POS[rung] + 6) + '%'; /* at Buster's paws, drawn over the photo */
        fetchThrowBtn.disabled = busy || over;
        fetchThrowBtn.textContent = rung === 0 ? 'THROW THE BALL' : 'THROW AGAIN';
        fetchBankBtn.disabled = busy || over || rung === 0;
        fetchBankBtn.textContent = rung === 0 ? 'BRING IT BACK' : `BRING IT BACK — BANK ${fmt(potNow())}`;
      }
      function say(html) { fetchResultEl.innerHTML = html; }

      function nextBallOrEnd() {
        if (ball >= F.balls) { endGame(); return; }
        ball++; rung = 0;
        fetchButterfly.classList.remove('on');
        say(`Ball ${ball} of ${F.balls} — throw it when you're ready! Banked so far: <b>${fmt(banked)}</b>.`);
        render();
      }
      function endGame() {
        over = true;
        if (fullBalls === F.balls) {
          const bonus = Math.round(F.perfectBonus * tb);
          banked += bonus;
          Kit.jackpot();
          say(`<span class="clear-title">PERFECT GAME!</span><br>All 3 balls brought back at the full 8× — the ${F.perfectBonus}× PERFECT GAME bonus adds <b>${fmt(bonus)}</b>!<br>Fetch pays <b>${fmt(banked)}</b> in all — 39× your bet!`);
        } else if (banked > 0) {
          Kit.fanfare();
          say(`That's all 3 balls — Fetch pays <b>${fmt(banked)}</b>! Tap COLLECT to take it.`);
        } else {
          say(`That's all 3 balls — the butterflies won this round. Nothing was banked, so nothing was lost but the pots. Tap COLLECT to head back.`);
        }
        render();
        fetchCollectBtn.textContent = banked > 0 ? `COLLECT ${fmt(banked)}` : 'COLLECT';
        fetchCollectBtn.classList.add('on');
        fetchCollectLock.arm(); /* the end screen + COLLECT get their own 2s */
        /* RETURN FIX (2026-11-22, Pam's real-phone report: "after she plays
           fetch it doesn't return to the game"): on a short viewport the
           end screen is taller than the sheet — COLLECT landed BELOW the
           fold, completely off-screen, and nothing scrolled it into view
           (measured: at 360x640 the button sits 53px past the bottom edge
           while the result text above it is visible, so the game reads as
           stuck). Two-part fix, mirroring the dog-house game's pattern:
           the dead THROW / BRING IT BACK row is hidden at the end (the
           .ended CSS reclaims its ~78px), and the sheet scrolls itself to
           the bottom so COLLECT is on screen either way. */
        fetchGame.classList.add('ended');
        setTimeout(() => fetchGame.scrollTo({ top: fetchGame.scrollHeight, behavior: 'smooth' }), 60);
        syncBroke();
      }
      async function bankPot(auto) {
        if (fetchLock.locked()) return; /* screen must be seen 2s before a tap lands */
        if (over || rung === 0) return;
        busy = true;
        const p = potNow();
        banked += p;
        if (rung === F.ladder.length) fullBalls++;
        Kit.bankIt(p / tb);
        say(auto
          ? `Buster brought it ALL the way back — <b>${fmt(p)}</b> banked safe!`
          : `Good call — <b>${fmt(p)}</b> banked safe. It's yours no matter what.`);
        rung = 0;
        render();
        await wait(1250);
        busy = false;
        nextBallOrEnd();
      }
      async function doThrow() {
        if (fetchLock.locked()) return; /* screen must be seen 2s before a tap lands */
        if (busy || over) return;
        busy = true; render();
        Kit.play('diceRoll'); /* the ball rolls out across the yard */
        fetchBallImg.classList.add('rolling');
        await wait(820);
        fetchBallImg.classList.remove('rolling');
        const dropped = queue && queue.length ? !!queue.shift() : Math.random() < F.drop;
        if (dropped) {
          const lost = potNow();
          fetchButterfly.classList.add('on');
          fetchBuster.classList.add('dropped');
          Kit.bust();
          say(lost > 0
            ? `A butterfly! Buster dropped the ball — that <b>${fmt(lost)}</b> pot is gone.${banked > 0 ? ` Your banked <b>${fmt(banked)}</b> is safe.` : ''}`
            : `A butterfly right away! Buster dropped the ball — no pot built yet, so nothing lost.`);
          rung = 0;
          render(); /* busy stays true through the pause: buttons stay locked */
          await wait(1500);
          fetchBuster.classList.remove('dropped');
          busy = false;
          nextBallOrEnd();
          return;
        }
        rung++;
        Kit.risingDing(rung);
        if (rung >= F.ladder.length) {
          render();
          await wait(650);
          bankPot(true);
          return;
        }
        busy = false;
        say(`He's got it — past marker ${rung}! The pot is <b>${fmt(potNow())}</b>. Bank it safe, or throw again to grow it?`);
        render();
      }
      fetchThrowBtn.onclick = () => { ac(); doThrow(); };
      fetchBankBtn.onclick = () => { ac(); bankPot(false); };
      fetchCollectBtn.onclick = () => {
        if (!over) return;
        if (fetchCollectLock.locked()) return; /* an early tap on COLLECT is ignored, not queued */
        fetchGame.classList.remove('on');
        fetchGame.classList.remove('ended');
        fetchGame.setAttribute('aria-hidden', 'true');
        fetchBackdrop.classList.remove('on');
        fetchCollectBtn.classList.remove('on');
        credits += banked;
        checkTierUnlock(false);
        renderReadouts(banked);
        lastBonusPaid = banked;
        save();
        syncBroke();
        resolve();
      };
      fetchCollectBtn.classList.remove('on');
      fetchGame.classList.remove('ended');
      fetchButterfly.classList.remove('on');
      fetchBuster.classList.remove('dropped');
      say(`Ball 1 of ${F.balls} — tap THROW THE BALL and watch Buster run!`);
      render();
      fetchBackdrop.classList.add('on');
      fetchGame.classList.add('on');
      fetchGame.setAttribute('aria-hidden', 'false');
      fetchLock.arm(); /* minimum-view lock starts as the Fetch! yard appears */
      fetchGame.scrollTop = 0;
      syncBroke();
    });
  }
  /* QA hook: force the bonus open / inspect the shuffled deck / drive state */
  window.__slotsDebug = {
    openBonus: tb => openBonus(tb || totalBet(), () => setControlsEnabled(true)),
    deck: () => bonusDeck,
    setCredits: n => { credits = Math.max(0, n | 0); notePeak(false); renderReadouts(); newGameBtn.classList.toggle('on', credits < totalBet()); save(); },
    celebrate: (kind, title, sub, dur) => celebrate(kind || 'bonus', title || "BUSTER'S BONES!", sub || '', dur || 5000),
    wheel: forceIdx => runBonusWheel(totalBet(), forceIdx),
    fetch: drops => runFetch(totalBet(), drops).then(() => setControlsEnabled(true)),
    forceFetch: () => { debugForceFetch = true; },
    kit: Kit,
    getState: () => ({ credits, bet: betSel, betPerLine: lineBet(), maxBet: unlockedMax(), peak, spinning, wheelArmed: !!wheelArmed, wheelSpinning, fetchOn: fetchGame.classList.contains('on'), rolling: RollSound.isActive(), rollLevel: Math.round(RollSound.level() * 100) / 100, stops: stops.slice() })
  };
  function runFreeSpins() { if (freeSpinsLeft > 0 && !spinning) doSpin(true); }

  $('wheelSpinBtn').addEventListener('click', () => {
    if (wheelArmed) { if (wheelLock.locked()) return; const f = wheelArmed; ac(); f(); }
  });
  spinBtn.addEventListener('click', () => {
    if (wheelArmed) { if (wheelLock.locked()) return; const f = wheelArmed; ac(); f(); return; }
    if (spinning) { if (!window.__pawSlam) stopAllReels(); return; } /* the paw slam performance is unskippable, like the door machines */
    ac(); doSpin(false);
  });

  /* ---------- TAP-TO-SPIN (Joshua, 2026-11-22 00:31 CT — his option B over
     shrinking the machine) ----------
     Tapping the machine itself — reels, marquee, belly, readouts, deck
     background — spins, exactly like the SPIN button: one big forgiving
     tap target for Pam. IDLE BASE GAME ONLY: never mid-spin (a machine
     tap is never a STOP), never during free spins, never under a bonus /
     Fetch / wheel / celebration / paytable screen (those overlays live
     outside the cabinet, and the guards below belt-and-brace it). Real
     controls keep their own taps: anything landing on a button, the
     lever, or the out-of-coins panel is filtered by target, so nothing
     ever double-fires. */
  const cabinetEl = $('cabinet');
  cabinetEl.addEventListener('click', e => {
    if (e.target.closest('button, a, input, select, textarea, #lever, #brokePanel')) return;
    if (spinning || freeSpinsLeft > 0 || wheelArmed || wheelSpinning) return;
    if (spinBtn.disabled) return;
    if (document.querySelector('.bonus.on, .wheel-overlay.on, .celeb.on, .sheet.on')) return;
    spinBtn.click();
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
  function startNewGame() {
    credits = START_CREDITS; betSel = BET_MIN; peak = START_CREDITS; lastUnlocked = unlockedMax();
    newGameBtn.classList.remove('on');
    renderReadouts(0); renderBet(); buildPaytable(); save();
    msgEl.textContent = 'New game — 1,000 credits on the house. Good luck!';
    Kit.coin();
  }
  newGameBtn.addEventListener('click', startNewGame);
  /* the big BACK button on the out-of-coins panel runs the same refill */
  if (brokeBackBtn) brokeBackBtn.addEventListener('click', startNewGame);
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
