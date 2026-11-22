/* Hustle City Slots — shared REAL-SOUND kit (all three machines).
   Joshua (2026-11-21): "real slot machine dings and bells — not this
   ghetto default stuff." And later the same day, after the first kit
   failed his ear test: "Make it sound like a real slot machine."
   Every event on the floor now plays a REAL RECORDING — a real slot
   machine's payout dings and reels, a real one-armed-bandit-era lever,
   real bells, real coins, real dice, a real prize wheel's peg clicks —
   sourced CC0 / public domain, trimmed and mastered offline. NO
   synthesized or physically-modeled sounds remain. Per-file sources
   and licenses: j-dawgs-vault/hustle-city-slots/soundkit/MANIFEST.md.
   The rolling reel bed is a loop of a real machine's reels, its rate
   and level driven by the reels' actual speed (rollStart/rollSpeed/
   rollStop below); repeated mechanical clicks get a small random
   playback-rate jitter, the way real mechanisms never repeat exactly.

   Contract with each cabinet's game.js:
     SlotKit.init(ac, () => soundOn)  — share the cabinet's AudioContext
                                        and its sound toggle.
   All plays are group-tagged; starting a sound in a group cuts that
   group's previous sound so wins never pile into mush. SlotKit.stopAll()
   silences everything instantly (sound toggle / STOP). If a file fails
   to load, that event stays silent — never a cheap fallback beep.
   SlotKit.plays is a plain log of what fired (QA reads it). */
'use strict';
window.SlotKit = (() => {
  const BASE = 'assets/sfx/';
  const FILES = {
    bell: 'bell.mp3', winSmall: 'win-small.mp3', winMed: 'win-med.mp3',
    winBig: 'win-big.mp3', coins: 'coins.mp3', coin: 'coin.mp3',
    tick: 'count-tick.mp3', bust: 'bust.mp3', fanfare: 'fanfare.mp3',
    fsFlourish: 'fs-flourish.mp3', garageDoor: 'garage-door.mp3',
    trunk: 'trunk-open.mp3', tension: 'tension.mp3', engine: 'engine-bust.mp3',
    diceShake: 'dice-shake.mp3', diceRoll: 'dice-roll.mp3', peg: 'peg.mp3',
    nearBell: 'near-bell.mp3', click: 'click.mp3', thunk: 'thunk.mp3',
    lever: 'lever.mp3', roll: 'reel-roll.mp3'
  };
  let getCtx = null, isOn = () => true, master = null;
  const buffers = {}, loading = {}, failed = {};
  const active = []; /* { src, group, name } */
  const plays = [];
  const playsDetailed = []; /* debug twin of plays: {name, group, t} per play —
    lets QA tell the silver-paw dings (group 'paw') apart from the win
    fanfare's bell arpeggio (group 'winfx'), which shares the bell file. */

  function ctx() {
    if (!getCtx) return null;
    const a = getCtx();
    if (a && !master) { master = a.createGain(); master.gain.value = 0.95; master.connect(a.destination); }
    return a;
  }
  function load(name) {
    if (buffers[name] || failed[name] || loading[name]) return;
    const a = ctx(); if (!a) return;
    loading[name] = true;
    fetch(BASE + FILES[name])
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => a.decodeAudioData(ab))
      .then(buf => { buffers[name] = buf; delete loading[name]; if (name === 'roll' && rollWanted) startRollNow(); })
      .catch(() => { failed[name] = true; delete loading[name]; });
  }
  function preload() { Object.keys(FILES).forEach(load); }
  function cutGroup(group) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].group === group) {
        try { active[i].src.stop(); } catch (e) {}
        active.splice(i, 1);
      }
    }
  }
  function play(name, opts) {
    const o = opts || {};
    const group = o.group || 'misc';
    if (!isOn()) return false;
    const a = ctx(); if (!a) return false;
    if (o.cut !== false && group !== 'tick' && group !== 'peg') cutGroup(group);
    const buf = buffers[name];
    if (!buf) { load(name); return false; } /* first-ever play warms the cache */
    const src = a.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = o.rate || 1;
    const g = a.createGain();
    g.gain.value = o.gain == null ? 1 : o.gain;
    src.connect(g); g.connect(master);
    const rec = { src, group, name };
    active.push(rec);
    src.onended = () => { const i = active.indexOf(rec); if (i >= 0) active.splice(i, 1); };
    src.start(a.currentTime + (o.delay || 0));
    plays.push(name);
    playsDetailed.push({ name, group, t: Date.now() });
    return true;
  }
  function stopAll() {
    for (const rec of active) { try { rec.src.stop(); } catch (e) {} }
    active.length = 0;
    rollStop(true);
  }

  /* ---- the rolling reel bed: a loop of a REAL machine's reels ----
     rollStart/rollSpeed/rollStop are driven by each cabinet from its
     reels' actual motion: the loop's rate and level rise on spin-up,
     cruise, and fall as reels brake; rollStop cuts it dead (STOP). */
  let rollNodes = null, rollWanted = false;
  function startRollNow() {
    const a = ctx(); if (!a || rollNodes) return;
    const buf = buffers.roll; if (!buf) return;
    const src = a.createBufferSource();
    src.buffer = buf; src.loop = true;
    src.playbackRate.value = 0.72;
    const g = a.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(0.10, a.currentTime, 0.07);
    src.connect(g); g.connect(master);
    src.start();
    rollNodes = { src, g };
    plays.push('roll');
  }
  function rollStart() {
    if (!isOn()) return;
    rollWanted = true;
    if (buffers.roll) startRollNow(); else load('roll');
  }
  function rollSpeed(norm) {
    if (!rollNodes) return;
    const a = ctx(); if (!a) return;
    const n = Math.max(0, Math.min(1, norm || 0));
    const t = a.currentTime;
    rollNodes.src.playbackRate.setTargetAtTime(0.72 + 0.58 * n, t, 0.06);
    rollNodes.g.gain.setTargetAtTime(0.08 + 0.42 * n, t, 0.06);
  }
  function rollStop(quick) {
    rollWanted = false;
    if (!rollNodes) return;
    const nodes = rollNodes; rollNodes = null;
    const a = ctx(); if (!a) return;
    const t = a.currentTime;
    try {
      nodes.g.gain.cancelScheduledValues(t);
      nodes.g.gain.setTargetAtTime(0, t, quick ? 0.025 : 0.08);
      nodes.src.stop(t + (quick ? 0.12 : 0.4));
    } catch (e) { /* already stopped */ }
  }
  function rollActive() { return !!rollNodes; }
  function activeCount(group) {
    return group ? active.filter(r => r.group === group).length : active.length;
  }

  /* ---- composed events (the floor's shared vocabulary) ---- */
  function win(ratio) { /* win size vs total bet */
    if (ratio >= 25) { play('winBig', { group: 'win' }); play('coins', { group: 'winfx', delay: 0.18, gain: 0.8 }); }
    else if (ratio >= 4) play('winMed', { group: 'win' });
    else play('winSmall', { group: 'win' });
    if (ratio >= 4) goodSpin(ratio);
  }
  /* GOOD-SPIN response (Joshua, 2026-11-21 18:52 CT — Pearl's Paws and
     Buster's Bones only): a win at or above the medium tier gets an
     unmistakable excitement answer ON TOP of the win tier — a rising bell
     arpeggio plus a coin shower, scaled to the win. All plays pass
     cut:false so the arpeggio notes layer instead of cutting each other
     (or the win jingle) off. */
  function goodSpin(ratio) {
    const big = ratio >= 25;
    play('bell', { group: 'winfx', cut: false, delay: 0.05, rate: 1, gain: 0.75 });
    play('bell', { group: 'winfx', cut: false, delay: 0.17, rate: 1.19, gain: 0.8 });
    play('bell', { group: 'winfx', cut: false, delay: 0.29, rate: 1.335, gain: 0.85 });
    play('coins', { group: 'winfx', cut: false, delay: 0.22, gain: big ? 0.95 : 0.7 });
    if (big) {
      play('bell', { group: 'winfx', cut: false, delay: 0.41, rate: 1.5, gain: 0.9 });
      play('coins', { group: 'winfx', cut: false, delay: 0.55, gain: 0.9 });
      play('coin', { group: 'winfx', cut: false, delay: 0.7, gain: 0.8 });
    }
  }
  /* SILVER PAW DING (Pam's request, relayed by Joshua 2026-11-22):
     when a silver paw — the chrome SCATTER — lands on a stopping reel,
     one clear strike of the real service bell (bell.mp3, the kit's real
     recording). One ding per paw, cut:false so paws landing on
     back-to-back reels each ring out and can be counted by ear —
     1-2-3 silver paws = the free-spins trigger — without watching the
     reels. Full gain: it has to carry over the reel bed on a phone
     speaker. Fired from the cabinet's reel-stop, never at spin start
     and never at payout. */
  function pawDing() { play('bell', { group: 'paw', cut: false, gain: 1 }); }
  function jackpot() {
    play('winBig', { group: 'win' });
    play('coins', { group: 'winfx', delay: 0.15, gain: 0.9 });
    play('bell', { group: 'winfx', delay: 0.72, rate: 1.19, gain: 0.7 });
  }
  function prize(pickIndex) { /* Pick-a-Garage: ding climbs as the bank grows */
    play('bell', { group: 'bonus', rate: Math.min(1.45, 1 + pickIndex * 0.055) });
    if (pickIndex >= 3) play('coin', { group: 'bonusfx', delay: 0.06, gain: 0.8 });
  }
  function risingDing(rolls) { /* Dice Roll: one bell step up per safe roll */
    play('bell', { group: 'bonus', rate: Math.min(1.5, 1 + Math.max(1, rolls) * 0.06) });
    play('coin', { group: 'bonusfx', delay: 0.05, gain: 0.7 });
  }
  function bankIt(ratio) {
    play('coins', { group: 'win' });
    play(ratio >= 8 ? 'winBig' : 'winMed', { group: 'winfx', delay: 0.1, gain: 0.9 });
  }
  function dice() {
    play('diceShake', { group: 'dice' });
    play('diceRoll', { group: 'dice', delay: 0.3 });
  }
  /* mechanical jitter: real mechanisms never repeat a click at the
     exact same pitch — repeated one-shots get a few % of random rate */
  const jit = (spread) => 1 + (Math.random() * 2 - 1) * spread;
  function countTick() { play('tick', { group: 'tick', gain: 0.55, rate: jit(0.03) }); }

  function init(gc, onFn) {
    getCtx = gc;
    if (typeof onFn === 'function') isOn = onFn;
    /* warm every buffer on the player's first touch anywhere, so the
       first win of the session is never silent (browser gesture rules) */
    const warm = () => { preload(); document.removeEventListener('pointerdown', warm); };
    document.addEventListener('pointerdown', warm);
  }

  return {
    init, preload, play, stopAll, activeCount, plays, playsDetailed,
    win, jackpot, prize, risingDing, bankIt, dice, countTick, pawDing,
    rollStart, rollSpeed, rollStop, rollActive,
    fanfare: () => play('fanfare', { group: 'cel' }),
    fsFlourish: () => play('fsFlourish', { group: 'cel' }),
    bust: () => play('bust', { group: 'bonus' }),
    engineBust: () => play('engine', { group: 'bonus' }),
    garageDoor: () => play('garageDoor', { group: 'bonus' }),
    trunkOpen: () => play('trunk', { group: 'bonusfx' }),
    tension: () => play('tension', { group: 'bonusfx' }),
    coin: () => play('coin', { group: 'winfx', rate: jit(0.04) }),
    click: () => play('click', { group: 'ui', gain: 0.8 }),
    peg: () => play('peg', { group: 'peg', gain: 0.9, rate: jit(0.05) }),
    nearBell: () => play('nearBell', { group: 'peg', gain: 0.8 }),
    thunk: () => play('thunk', { group: 'ui' }),
    lever: () => play('lever', { group: 'ui' }),
    loaded: name => !!buffers[name]
  };
})();
