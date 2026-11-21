/* Hustle City Slots — shared REAL-SOUND kit (all three machines).
   Joshua (2026-11-21): "real slot machine dings and bells — not this
   ghetto default stuff." Every melodic/mechanical event on the floor now
   plays a file from this one kit: a real public-domain garage-door
   recording, and physical models (inharmonic-partial bells, resonant
   coin pings, shaped-noise mechanics) rendered offline — see the vault
   manifest at j-dawgs-vault/hustle-city-slots/soundkit/MANIFEST.md.
   No oscillator beep melodies remain wired to any event.

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
    nearBell: 'near-bell.mp3', click: 'click.mp3', thunk: 'thunk.mp3'
  };
  let getCtx = null, isOn = () => true, master = null;
  const buffers = {}, loading = {}, failed = {};
  const active = []; /* { src, group, name } */
  const plays = [];

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
      .then(buf => { buffers[name] = buf; delete loading[name]; })
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
    return true;
  }
  function stopAll() {
    for (const rec of active) { try { rec.src.stop(); } catch (e) {} }
    active.length = 0;
  }
  function activeCount(group) {
    return group ? active.filter(r => r.group === group).length : active.length;
  }

  /* ---- composed events (the floor's shared vocabulary) ---- */
  function win(ratio) { /* win size vs total bet */
    if (ratio >= 25) { play('winBig', { group: 'win' }); play('coins', { group: 'winfx', delay: 0.18, gain: 0.8 }); }
    else if (ratio >= 4) play('winMed', { group: 'win' });
    else play('winSmall', { group: 'win' });
  }
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
  function countTick() { play('tick', { group: 'tick', gain: 0.55 }); }

  function init(gc, onFn) {
    getCtx = gc;
    if (typeof onFn === 'function') isOn = onFn;
    /* warm every buffer on the player's first touch anywhere, so the
       first win of the session is never silent (browser gesture rules) */
    const warm = () => { preload(); document.removeEventListener('pointerdown', warm); };
    document.addEventListener('pointerdown', warm);
  }

  return {
    init, preload, play, stopAll, activeCount, plays,
    win, jackpot, prize, risingDing, bankIt, dice, countTick,
    fanfare: () => play('fanfare', { group: 'cel' }),
    fsFlourish: () => play('fsFlourish', { group: 'cel' }),
    bust: () => play('bust', { group: 'bonus' }),
    engineBust: () => play('engine', { group: 'bonus' }),
    garageDoor: () => play('garageDoor', { group: 'bonus' }),
    trunkOpen: () => play('trunk', { group: 'bonusfx' }),
    tension: () => play('tension', { group: 'bonusfx' }),
    coin: () => play('coin', { group: 'winfx' }),
    click: () => play('click', { group: 'ui', gain: 0.8 }),
    peg: () => play('peg', { group: 'peg', gain: 0.9 }),
    nearBell: () => play('nearBell', { group: 'peg', gain: 0.8 }),
    thunk: () => play('thunk', { group: 'ui' }),
    loaded: name => !!buffers[name]
  };
})();
