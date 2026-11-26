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
   v2.4 (2026-11-21 23:34 CT, Joshua's two picks): (1) Pick-a-Garage is
   now a TRUNK game — each car keeps its real photo and the pick pops
   that car's trunk: the lid swings open on the prize inside, or on
   SCOTTY (banked prizes still kept when he ends it). The bust Scotty
   is the corrected Hustle City 3 coming-soon-video Scotty (beanie,
   sunglasses, full beard), cropped from the settled HC3 poster — the
   earlier bonus Scotty Joshua rejected is gone. (2) EVERY payout grew
   20% (line paytable, scatter pays, garage prizes — see machines.js):
   total RTP ~131.6%, deliberately over 100% at his pick.
   Play credits only. (c) 2026 J-Dawgs Industries LLC. */
'use strict';
(function () {
  const core = window.SlotCore;
  const cfg = window.SlotMachines.CLASSICS;
  /* v2-21: the door counts DD + DL together (Joshua's "three big green
     dollar signs" — either kind, mixed). */
  const DOOR_SYMS = cfg.doorSymbols || [cfg.doorSymbol];
  const LS_KEY = 'hcslots-classics-v2';

  const ART = {
    DL: 'assets/sym-dl.webp', SV: 'assets/sym-sv.webp', CH: 'assets/sym-ch.webp',
    HS: 'assets/sym-hs.webp', BL: 'assets/sym-bl.webp', B1: 'assets/sym-b1.webp',
    WD: 'assets/sym-wd.webp', SC: 'assets/sym-sc.webp', BN: 'assets/sym-bn.webp',
    DD: 'assets/sym-dd.webp',
    X2: 'assets/sym-x2.webp', X3: 'assets/sym-x3.webp'
  };
  const NAMES = {
    DL: 'Dollar Sign', SV: 'Seven', HS: 'Horseshoe', CH: 'Cherry',
    BL: 'Bell', B1: 'BAR', WD: 'WILD', SC: 'SCATTER', BN: 'BONUS',
    DD: 'BIG DOLLAR',
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
  const wheelOverlay = $('wheelOverlay'), wheelMsg = $('wheelMsg'), wheelRotor = $('wheelRotor'), wheelPointer = $('wheelPointer'), wheelPrize = $('wheelPrize');
  const vaultOverlay = $('vaultOverlay'), vaultMsg = $('vaultMsg');
  const vaultGrid = $('vaultGrid'), vaultLed = $('vaultLed'), vaultDoorsLed = $('vaultDoorsLed'),
    vaultSkullsLed = $('vaultSkullsLed'), vaultBankBtn = $('vaultBankBtn');
  const vaultEndEl = $('vaultEnd'), vaultEndImg = $('vaultEndImg'), vaultEndTitle = $('vaultEndTitle'),
    vaultEndLine1 = $('vaultEndLine1'), vaultEndLine2 = $('vaultEndLine2'), vaultEndBtn = $('vaultEndBtn');

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
    document.querySelectorAll('.cell.win,.cell.scatterhit,.cell.bonushit,.cell.doorhit,.cell.scatterpop').forEach(c => c.classList.remove('win', 'scatterhit', 'bonushit', 'doorhit', 'scatterpop'));
    winFlash.classList.remove('on');
  }
  function markCell(reel, row, cls) {
    const track = reelsEl[reel].firstElementChild;
    if (track && track.children[row]) track.children[row].classList.add(cls);
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
        if (fx && fx.slow) {
          /* BEAT 2 — THE SLAM */
          reel.classList.remove('anticipating');
          reel.classList.add('slamming');
          setTimeout(() => reel.classList.remove('slamming'), 480);
          try { Kit.thunk(); Kit.play('thunk', { gain: 1.8 }); } catch (e) {}
        }
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
      if (fx && fx.slow) {
        /* BEAT 1 — THE SLOW-DOWN: tension rises, the reel glows */
        try { Kit.tension(); } catch (e) {}
        reel.classList.add('anticipating');
      }
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
        const cells = sym === 'CH'
          ? `<span class="pv">2× <b>${fmt(Math.round(t[2] * lineBet()))}</b></span>${cell(3)}${cell(4)}`
          : (t[5] ? `${cell(3)}${cell(4)}${cell(5)}` : `${cell(3)}${cell(4)}<span class="pv"></span>`);
        return `<div class="payrow"><div class="thumb"><img src="${ART[sym]}" alt="${NAMES[sym]}"></div><div class="nm">${NAMES[sym]}</div>${cells}</div>`;
      }).join('');
    $('payrows').innerHTML = rows +
      `<div class="payrow"><div class="thumb"><img src="${ART.WD}" alt="WILD"></div><div class="nm">WILD</div><span class="pv wide">Substitutes for every symbol except SCATTER</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X2}" alt="WIN ×2"></div><div class="nm">WIN ×2</div><span class="pv wide">Anywhere on a winning line, this line's win is DOUBLED (×2)</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.X3}" alt="WIN ×3"></div><div class="nm">WIN ×3</div><span class="pv wide">Anywhere on a winning line, this line's win is TRIPLED (×3). Two multipliers on the same line multiply together — ×2 and ×3 pay ×6</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.SC}" alt="SCATTER"></div><div class="nm">SCATTER</div><span class="pv wide">3+ anywhere: pays 2.4× / 9.6× / 48× total bet + 7 / 10 / 15 FREE SPINS at 2× line wins. The third scatter slows the reels, they SLAM to a stop, and the scatters grow and POP before the free spins open.</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.DD}" alt="DOLLAR DOOR"></div><div class="nm">THE DOLLAR DOOR</div><span class="pv wide">3+ BIG GREEN DOLLARS anywhere on a paid spin — plain dollars and medallion dollars count TOGETHER, any mix — the ONLY way into a bonus. The third dollar slows the reels, they SLAM to a stop, the dollars grow and POP, and the bonus opens. Which bonus you get is RANDOM — one of three. PICK-A-GARAGE: 9 real cars — pop a trunk! 8 trunks hide prizes (0.1×–1.2× total bet), 1 hides SCOTTY. Banked prizes are kept; Scotty ends it. Pop all 8 for a 1.8× GARAGE BONUS — the last closed trunk then stays live as a no-risk reveal of SCOTTY. The BONUS WHEEL: 12 wedges, every wedge pays × total bet — MINI 1× · MINOR 2× · MAJOR 3.75× · GRAND 7×. Or the SKULL VAULT: 12 doors, 9 hide blue-chip prizes (${cfg.vault.prizes.slice().sort((a, b) => b - a).join('×, ')}× your total bet — ${cfg.vault.prizes.reduce((a, b) => a + b, 0)}× in all) and ${cfg.vault.skulls} hide SKULLS. Every door you open PAYS YOU ON THE SPOT — a SKULL ends the vault, and you keep everything you collected. The door lands about once every 20 spins</span></div>` +
      `<div class="payrow"><div class="thumb"><img src="${ART.DL}" alt="BET"></div><div class="nm">BET</div><span class="pv wide">Bets run in $25 steps: $25, $50, $75 … all the way up to $2,500 a spin. A step unlocks the first time your balance reaches it — and stays unlocked even if your balance dips. Use the −25 / +25 buttons or MAX BET. NEW GAME resets you to a $25 bet</span></div>`;
  }

  /* ---------- paytable sheet ---------- */
  function openSheet() { paySheet.classList.add('on'); paySheet.setAttribute('aria-hidden', 'false'); sheetBackdrop.classList.add('on'); }
  function closeSheet() { paySheet.classList.remove('on'); paySheet.setAttribute('aria-hidden', 'true'); sheetBackdrop.classList.remove('on'); }
  $('payBtn').addEventListener('click', openSheet);
  $('sheetHandle').addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

  /* ---------- TWO-SECOND MINIMUM-VIEW LOCK (Joshua's standing rule,
     2026-11-22): "Make sure you have to see a couple seconds at least of
     the bonus screen before it goes away. It's easy to accidentally push
     it right past it." Every bonus screen arms its lock the moment it
     appears; while locked, a tap that would skip / advance / dismiss it
     is IGNORED — never queued, so a stray tap at 0.5s does not fire at
     2.0s. After 2 seconds every tap works exactly as before. Deliberate
     play inside a bonus (trunk picks, COLLECT) is NOT locked, and
     auto-advance timers are not taps — they run as they always did. */
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
      celebLock.arm(); /* minimum-view lock: no tap-skip for the first 2s */
      celebEl.className = 'celeb on k-' + kind;
      celebKickEl.textContent = kind === 'bonus' ? 'BONUS' : 'FREE SPINS';
      celebTitleEl.textContent = title;
      celebSubEl.textContent = sub || '';
      celebEl.setAttribute('aria-hidden', 'false');
      const celebVideo = $('celebVideo');
      const titleFx = $('celebTitleFx');
      /* the settled #15 BONUS title image rides every celebration — bonus AND
         free-spins triggers alike (Joshua, 2026-11-21 20:50 CT) */
      /* The celebration SHOW: Dice & Cards Explosion — the 5s clip Joshua
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
  /* bigger bets celebrate a touch longer/brighter */
  function celebDur() { return 5000; } /* the show runs the full 5s clip (Joshua, 2026-11-21 19:34 CT), tap to skip */

  /* ---------- CASINO CLASSICS — BONUS WHEEL (2026-11-22, ported from
     Pearl's Paws at Joshua's order) ----------
     A layered SVG wheel, not flat wedges on a disc: lit radial-gradient
     wedges with raised separators, a dark steel rim with bolts, real peg
     spheres at every boundary, a glass gloss that does NOT rotate.
     Dressed for Classics: garage chrome — chrome + electric-blue wedges,
     red reserved for the GRAND wedge. NO GOLD anywhere. The wedge table
     is cfg.wheel — physics mirror Pearl's: the winning wedge is drawn
     first, then the wheel spins (6 full turns, quartic ease-out,
     real-kit peg clicks + pointer flick, near-GRAND bell) and settles
     exactly on it. The wheel opens INSTEAD of Pick-a-Garage on
     cfg.wheelShare of bonus triggers; the garage itself is untouched. */
  const WEDGES = cfg.wheel, TIERS = cfg.wheelTiers || {};
  const WSEG = 360 / WEDGES.length;
  let wheelBuilt = false, wheelAngle = 0, wheelSpinning = false, wheelArmed = null;
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
    /* machined bolts around the static steel rim */
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
      if (TIERS[v]) {
        const t1 = document.createElementNS(SVGNS, 'text');
        t1.setAttribute('x', cx); t1.setAttribute('y', cy - rO + 48);
        t1.setAttribute('class', 'wlabel tier' + (TIERS[v] === 'GRAND' ? ' wgrand' : ' wtier'));
        t1.textContent = TIERS[v];
        const t2 = document.createElementNS(SVGNS, 'text');
        t2.setAttribute('x', cx); t2.setAttribute('y', cy - rO + 66);
        t2.setAttribute('class', 'wlabel tierval' + (TIERS[v] === 'GRAND' ? ' wgrand' : ' wtier'));
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
      wheelOverlay.classList.add('on');
      wheelOverlay.setAttribute('aria-hidden', 'false');
      wheelLock.arm(); /* minimum-view lock: the wheel must be seen 2s before a tap can spin it */
      wheelPrize.classList.remove('on');
      wheelMsg.textContent = 'Pull the arm — or tap SPIN!';
      msgEl.textContent = 'BONUS WHEEL! Pull the arm or tap SPIN to spin the wheel!';
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
          wheelPrize.querySelector('.prize-amt').textContent = '+' + fmt(pay);
          wheelPrize.classList.add('on');
          if (tier === 'GRAND') {
            wheelMsg.innerHTML = `GRAND JACKPOT! The wheel pays <b>${fmt(pay)}</b> credits!`;
            Kit.jackpot();
            await celebrate('bonus', 'GRAND JACKPOT!', `Top wedge on the wheel — ${fmt(pay)} credits!`, celebDur());
          } else if (tier) {
            wheelMsg.innerHTML = `${tier} JACKPOT! The wheel pays <b>${fmt(pay)}</b> credits!`;
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
          lastBonusWhat = 'Bonus Wheel';
          save();
        }
        setTimeout(() => {
          wheelOverlay.classList.remove('on');
          wheelOverlay.setAttribute('aria-hidden', 'true');
          spinFace.textContent = 'SPIN';
          resolve(pay);
        }, 2100);
      };
    });
  }

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

  /* ---------- SCATTER beats 3-4: grow + pop (same standard as the door) ---------- */
  function scatterPopSequence(cells) {
    return new Promise(res => {
      cells.forEach((c, i) => {
        const track = reelsEl[c.r].firstElementChild;
        const cell = track && track.children[c.row];
        if (cell) { cell.classList.add('scatterpop'); cell.style.animationDelay = (i * 0.13) + 's'; }
        setTimeout(() => { try { Kit.play('bell', { rate: 1.15 + i * 0.09 }); } catch (e) {} }, 420 + i * 130);
      });
      try { Kit.play('coins'); } catch (e) {}
      setTimeout(res, 620 + cells.length * 130 + 450);
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
        msgEl.textContent = credits < BET_MIN ? 'Out of credits — hit NEW GAME below to start over with 1,000.' : 'Not enough credits for that bet — lower the bet.';
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
    const durations = [1700, 1900, 2100, 2300, 2500]; /* staggered stops, reel 1 first, ~200ms apart */
    /* DOLLAR DOOR choreography: the dealt grid is known before the reels
       move, so the reel that lands the THIRD dollar is singled out up
       front — it crawls in slow motion (beat 1) and slams (beat 2). */
    const dealtGrid = core.windowForStops(cfg.strips, finalStops);
    const dealtEv = core.evaluateGrid(dealtGrid, lineBet(), cfg);
    let doorReel = -1;
    if (!isFree && dealtEv.bonusCount >= 3) {
      let cum = 0;
      for (let r = 0; r < 5; r++) {
        cum += dealtGrid[r].filter(s => DOOR_SYMS.includes(s)).length;
        if (cum >= 3) { doorReel = r; break; }
      }
    }
    const reelFx = [null, null, null, null, null];
    if (doorReel >= 0) {
      durations[doorReel] = 3600;
      reelFx[doorReel] = { slow: true };
      msgEl.textContent = 'The dollars are on the reels — watch for the third one…';
    }

    /* SCATTER choreography (Joshua's standard, 2026-11-22 16:37 CT): the
       scatters get the same four beats as the dollars — the reel that
       lands the THIRD scatter crawls in slow motion (beat 1) and slams
       (beat 2), exactly like the third-dollar reel. */
    let scatterReel = -1;
    if (dealtEv.scatterCount >= 3) {
      let scum = 0;
      for (let r = 0; r < 5; r++) {
        scum += dealtGrid[r].filter(s => s === 'SC').length;
        if (scum >= 3) { scatterReel = r; break; }
      }
    }
    if (scatterReel >= 0 && scatterReel !== doorReel) {
      durations[scatterReel] = 3600;
      reelFx[scatterReel] = { slow: true };
      if (doorReel < 0) msgEl.textContent = 'Scatters are on the reels — watch for the third one…';
    }
    await Promise.all(finalStops.map((_, r) => spinReel(r, finalStops, durations[r], reelFx[r])));
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
    const bonusHit = !isFree && ev.bonusCount >= 3; /* Dollar Door: paid spins only */
    lastDoor = { hit: bonusHit, reel: doorReel, count: ev.bonusCount };
    if (bonusHit) {
      /* BEAT 3 — GROW AND POP: every landed dollar swells up and pops,
         one after another, bells rising, before the bonus opens. */
      const cells = [];
      for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (DOOR_SYMS.includes(grid[r][row])) cells.push({ r, row });
      await doorPopSequence(cells);
      msgEl.textContent = `${ev.bonusCount} BIG GREEN DOLLARS — the door is open!`;
    }

    if (ev.scatterCount >= 3) {
      /* BEATS 3-4 FOR SCATTERS: every landed scatter swells up and pops,
         one after another, before the free spins open — the same
         treatment the dollars get (Joshua's standard, 2026-11-22). */
      const sCells = [];
      for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) if (grid[r][row] === 'SC') sCells.push({ r, row });
      await scatterPopSequence(sCells);
    }

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
        celebrate('fs', `${ev.freeSpins} FREE SPINS!`, 'Line wins pay DOUBLE — here they come!', celebDur())
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
          ? `${lastBonusWhat} paid ${fmt(lastBonusPaid)} credits!`
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
    if (!bonusHit && ev.lineWins.some(w => w.count >= 5)) {
      /* FIVE OF A KIND celebrates too (Joshua, 2026-11-21 20:57 CT) */
      await celebrate('bonus', 'FIVE OF A KIND!', 'Five on a line — that is a big one!', celebDur());
    }
    if (bonusHit) {
      /* celebrate first, THEN the bonus; any free spins won on this spin
         run after it (Joshua, 12:52 CT). RANDOM BONUS POOL (2026-11-22,
         Joshua: "get different bonuses at random" + "Add the vault as
         well... the vault game, the same one"): the door deals one of
         THREE bonus games at random — the SKULL VAULT on cfg.vaultShare
         of triggers, the BONUS WHEEL on cfg.wheelShare, PICK-A-GARAGE
         the rest (equal thirds as configured) — the roll happens here,
         at the dispatch, so the bonus-door frequency (and the combined
         feature frequency) is unchanged by construction. */
      const poolRoll = Math.random();
      if (poolRoll < (cfg.vaultShare ?? 0)) {
        msgEl.textContent = `${ev.bonusCount} BIG GREEN DOLLARS — the skull vault is open!`;
        await celebrate('bonus', 'SKULL VAULT!', `${ev.bonusCount} big green dollars — every door pays on the spot, dodge the skulls!`, celebDur());
        await runSkullVault(totalBet());
        finishTurn();
        return;
      }
      if (poolRoll < (cfg.vaultShare ?? 0) + (cfg.wheelShare ?? 0.5)) {
        msgEl.textContent = `${ev.bonusCount} BIG GREEN DOLLARS — the bonus wheel is open!`;
        await celebrate('bonus', 'BONUS WHEEL!', `${ev.bonusCount} big green dollars — spin the wheel!`, celebDur());
        await runBonusWheel(totalBet());
        finishTurn();
        return;
      }
      msgEl.textContent = `${ev.bonusCount} BIG GREEN DOLLARS — the garage is open!`;
      await celebrate('bonus', 'PICK-A-GARAGE!', `${ev.bonusCount} big green dollars — pop a trunk, dodge Scotty!`, celebDur());
      openBonus(totalBet(), finishTurn);
      return;
    }
    finishTurn();
  }

  /* ---------- PICK-A-GARAGE bonus ----------
     9 cars, 9 TRUNKS: 8 prizes (x total bet of the triggering spin) +
     1 SCOTTY. The pick pops the trunk — the lid swings open on the
     prize inside, or on Scotty. Banked prizes are KEPT even when
     Scotty ends the round; popping all 8 prize trunks banks the
     completion (GARAGE) bonus and leaves the one closed trunk LIVE
     as a no-risk final reveal — it always holds Scotty, and the
     round only ends when he is shown or found. (2026-11-22 fix:
     the round used to end on the 8th prize with Scotty's trunk
     permanently dead and a 5s celebration overlay sitting on top
     of COLLECT — Joshua's real-phone report. No overlay covers the
     bonus any more, and COLLECT is bound ONCE, below, against the
     live session — no per-round listener stacking.) */
  let bonusDeck = null, bonusSession = null, lastBonusPaid = 0, lastBonusWhat = 'Pick-a-Garage';
  function buildGarageDeck(tb) {
    const deck = cfg.bonus.prizes.map(m => ({ prize: Math.round(m * tb) }));
    deck.push({ scotty: true });
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    return deck;
  }
  function endGarage(html) {
    if (!bonusSession) return;
    bonusSession.phase = 'over';
    bonusResultEl.innerHTML = html;
    bonusCollectBtn.textContent = `COLLECT ${fmt(bonusSession.banked)}`;
    bonusCollectBtn.classList.add('on');
    /* instant scroll: the button must be STATIONARY when it appears —
       a smooth scroll left it moving under the player's tap */
    setTimeout(() => bonusGame.scrollTo({ top: bonusGame.scrollHeight, behavior: 'auto' }), 60);
  }
  function collectBonus() {
    const session = bonusSession;
    if (!session || session.phase !== 'over' || session.collected) return;
    session.collected = true;
    const banked = session.banked;
    credits += banked;
    checkTierUnlock(false);
    renderReadouts(banked);
    save();
    bonusGame.classList.remove('on');
    bonusGame.setAttribute('aria-hidden', 'true');
    bonusBackdrop.classList.remove('on');
    bonusDeck = null;
    bonusSession = null;
    lastBonusPaid = banked;
    lastBonusWhat = 'Pick-a-Garage';
    session.done();
  }
  bonusCollectBtn.addEventListener('click', collectBonus);
  function openBonus(tb, done) {
    setControlsEnabled(false);
    Kit.garageDoor(); /* the real door rolls up as the round starts */
    const deck = buildGarageDeck(tb);
    bonusDeck = deck;
    const session = {
      deck,
      completion: Math.round(cfg.bonus.completion * tb),
      prizeTotal: deck.reduce((s, c) => s + (c.prize || 0), 0),
      banked: 0, safePicked: 0, phase: 'picking', done, collected: false
    };
    bonusSession = session;
    bonusBankEl.textContent = '0';
    bonusResultEl.innerHTML = '';
    bonusCollectBtn.textContent = 'COLLECT';
    bonusCollectBtn.classList.remove('on');
    trunksEl.innerHTML = '';
    deck.forEach((card, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'trunk';
      b.setAttribute('aria-label', `Trunk ${i + 1}`);
      b.innerHTML = `<span class="car-photo"><img src="assets/car-${i + 1}.webp" alt="" draggable="false"></span><span class="cavity"></span><span class="lid"><span class="lid-plate">TRUNK <b>${i + 1}</b></span><span class="lid-latch"></span></span>`;
      b.addEventListener('click', () => {
        if (bonusSession !== session || session.collected || session.phase === 'over' || b.classList.contains('open')) return;
        if (session.phase === 'final-reveal' && !card.scotty) return; /* only Scotty's trunk is left by construction */
        b.classList.add('open');
        Kit.trunkOpen(); /* latch + creak on every trunk */
        if (card.scotty) {
          b.classList.add('scotty');
          b.querySelector('.cavity').innerHTML = `<img class="cavity-scotty" src="assets/scotty.webp" alt="Scotty" draggable="false"><span class="busted-tag">SCOTTY!</span>`;
          if (session.phase === 'final-reveal') {
            /* no-risk reveal: every prize is already banked, Scotty
               showing his face cannot take any of it away */
            Kit.jackpot();
            endGarage(`<span class="clear-title">YOU CLEARED THE GARAGE!</span><br>All 8 prize trunks popped and SCOTTY was hiding in the last trunk. Prizes ${fmt(session.prizeTotal)} + GARAGE BONUS ${fmt(session.completion)} = total banked: <b>${fmt(session.banked)}</b>.`);
          } else {
            Kit.engineBust(); /* engine rev + bell crash — the bust sting */
            endGarage(`<img class="scotty-img" src="assets/scotty.webp" alt="Scotty">SCOTTY was hiding in that trunk! Bonus over — you keep your banked <b>${fmt(session.banked)}</b> credits. Only the un-popped trunks are lost.`);
          }
          return;
        }
        session.banked += card.prize;
        session.safePicked++;
        b.querySelector('.cavity').innerHTML = `<span class="prize">+${fmt(card.prize)}</span>`;
        /* rising prize dings as the bank grows; deep picks get tension */
        setTimeout(() => Kit.prize(session.safePicked - 1), 130);
        if (session.safePicked >= 5) setTimeout(() => Kit.tension(), 420);
        bonusBankEl.textContent = fmt(session.banked);
        if (session.safePicked === cfg.bonus.prizes.length) {
          session.banked += session.completion;
          bonusBankEl.textContent = fmt(session.banked);
          session.phase = 'final-reveal';
          const remaining = trunksEl.querySelector('.trunk:not(.open)');
          if (remaining) remaining.classList.add('final-reveal');
          bonusResultEl.innerHTML = `<span class="clear-title">ALL 8 PRIZE TRUNKS POPPED!</span><br>Prizes ${fmt(session.prizeTotal)} + GARAGE BONUS ${fmt(session.completion)} = <b>${fmt(session.banked)}</b> banked. One trunk is still closed — pop it to reveal SCOTTY. The ${fmt(session.banked)} is already yours.`;
          setTimeout(() => bonusGame.scrollTo({ top: bonusGame.scrollHeight, behavior: 'auto' }), 60);
        }
      });
      trunksEl.appendChild(b);
    });
    bonusGame.classList.add('on');
    bonusGame.setAttribute('aria-hidden', 'false');
    bonusBackdrop.classList.add('on');
  }
  /* ---------- SKULL VAULT — PORTED WHOLE FROM POKER LUXE v17 (2026-11-22) ----------
     Joshua: "Add the vault as well to the Hustle City classic slot.
     As a bonus game. The vault game the same one." Same game, same
     pay-on-the-spot path, same skull rule, same ending beat — only
     the prize scale is Classics' own (cfg.vault in machines.js)
     and the overlay ids are vaultOverlay/vaultMsg on this cabinet. */
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
      vaultOverlay.classList.add('on');
      vaultOverlay.setAttribute('aria-hidden', 'false');
      vaultMsg.textContent = 'Pick a door — every door pays you on the spot!';
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
      vaultOverlay.classList.remove('on');
      vaultOverlay.setAttribute('aria-hidden', 'true');
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
      lastBonusPaid = st.pay || 0;
      lastBonusWhat = 'Skull Vault';
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
      vaultMsg.textContent = 'SKULL! The vault ends — what you collected is yours.';
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
    notePeak(false);
    save();
    Kit.prize(cfg.vault.prizes.length - st.safeLeft);
    const winFrom = st.winShown;
    st.winShown += payNow;
    winCountTo(winFrom, st.winShown, Math.min(900, 300 + payNow * 2));
    if (st.safeLeft === 0) {
      /* FULL CLEAR — every chip door opened, every prize already paid */
      st.over = true;
      vaultMsg.textContent = `FULL CLEAR! Every chip door opened — ${fmt(st.collected)} credits collected!`;
      Kit.jackpot(); /* full bell + coin celebration */
      vaultReadouts();
      vaultBankBtn.disabled = true;
      vaultEndShow('clear');
      return;
    }
    vaultMsg.textContent = v >= VAULT_BIG
      ? `THE BIG DOOR! ×${v} — ${fmt(payNow)} credits PAID. ${fmt(st.collected)} collected.`
      : `×${v} — ${fmt(payNow)} credits PAID. ${fmt(st.collected)} collected so far.`;
    vaultReadouts();
  }
  vaultBankBtn.addEventListener('click', () => {
    const st = vaultState;
    if (!vaultOpen || !st || st.over) return;
    st.over = true;
    Kit.bankIt(st.unbanked);
    vaultMsg.textContent = st.collected > 0
      ? `You stop — ${fmt(st.collected)} credits collected, already yours.`
      : 'You stop — nothing collected.';
    vaultReadouts();
    vaultBankBtn.disabled = true;
    vaultEndShow('stop');
  });



  /* QA hook: force the bonus open / inspect the shuffled deck / drive state */
  window.__slotsDebug = {
    openBonus: tb => openBonus(tb || totalBet(), () => setControlsEnabled(true)),
    deck: () => bonusDeck,
    buildGarageDeck: tb => buildGarageDeck(tb || totalBet()),
    garage: () => bonusSession ? { phase: bonusSession.phase, banked: bonusSession.banked, safePicked: bonusSession.safePicked, prizeTotal: bonusSession.prizeTotal, completion: bonusSession.completion, collected: bonusSession.collected } : null,
    setCredits: n => { credits = Math.max(0, n | 0); notePeak(false); renderReadouts(); newGameBtn.classList.toggle('on', credits < totalBet()); save(); },
    celebrate: (kind, title, sub, dur) => celebrate(kind || 'bonus', title || 'PICK-A-GARAGE!', sub || '', dur || 3000),
    wheel: (idx) => runBonusWheel(totalBet(), idx),
    openVault: (layout) => { if (Array.isArray(layout)) vaultRig = layout.slice(); return runSkullVault(totalBet()); },
    vaultRig: layout => { vaultRig = Array.isArray(layout) ? layout.slice() : null; },
    vaultState: () => vaultState ? { unbanked: vaultState.unbanked, collected: vaultState.collected, bet: vaultState.bet, over: vaultState.over, doorsLeft: vaultState.doorsLeft, skullsLeft: vaultState.skullsLeft, safeLeft: vaultState.safeLeft, pay: vaultState.pay || 0 } : null,
    vaultOpen: () => vaultOpen,
    kit: Kit,
    getState: () => ({ credits, bet: betSel, betPerLine: lineBet(), maxBet: unlockedMax(), peak, spinning, wheelArmed: !!wheelArmed, wheelSpinning, rolling: RollSound.isActive(), rollLevel: Math.round(RollSound.level() * 100) / 100, stops: stops.slice(), door: { ...lastDoor } })
  };
  function runFreeSpins() { if (freeSpinsLeft > 0 && !spinning) doSpin(true); }

  $('wheelSpinBtn').addEventListener('click', () => {
    if (wheelArmed) { if (wheelLock.locked()) return; const f = wheelArmed; ac(); f(); }
  });
  spinBtn.addEventListener('click', () => {
    if (wheelArmed) { if (wheelLock.locked()) return; const f = wheelArmed; ac(); f(); return; }
    if (spinning) { stopAllReels(); return; }
    ac(); doSpin(false);
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
  function leverFire() { if (wheelArmed) { spinBtn.click(); return; } if (!spinning && !spinBtn.disabled) spinBtn.click(); }
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
