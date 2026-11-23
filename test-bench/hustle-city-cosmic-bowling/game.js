/* Hustle City Cosmic Bowling — game shell: save, audio, screens, match engine.
   Mechanics copied from the #1 bowling game's published design (RESEARCH.md);
   all code and art original. (c) 2026 J-Dawgs Industries. */
'use strict';
const L = window.BowlLogic;
const $ = s => document.querySelector(s);

/* ================= save ================= */
const SAVE_KEY = 'hccb-save-v1';
function defaultSave() {
  const balls = {};
  for (const b of L.BALLS) {
    const starter = ['house-rock', 'chrome-comet', 'nebula-bouncer', 'starlight', 'gas-giant', 'moonshot'].includes(b.id);
    balls[b.id] = { owned: starter, level: 1, cards: 0 };
  }
  return {
    v: 1, chips: 250, trophies: 0, cases: 0,
    balls, bag: ['house-rock', 'chrome-comet', 'nebula-bouncer', 'starlight', 'gas-giant', 'moonshot'],
    missions: L.MISSIONS.slice(0, 3).map(m => ({ id: m.id, prog: 0 })),
    lastDaily: '', sound: true, tutorial: 0,
    stats: { matches: 0, wins: 0, strikes: 0, spares: 0, pins: 0, best: 0, perfects: 0 },
  };
}
let S = (() => {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const p = JSON.parse(raw); if (p && p.v === 1) return Object.assign(defaultSave(), p); } } catch (e) {}
  return defaultSave();
})();
let saveFlashT = null;
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
  const el = $('#savedTag'); el.classList.add('on');
  clearTimeout(saveFlashT); saveFlashT = setTimeout(() => el.classList.remove('on'), 1200);
}
function refreshTop() {
  $('#chipCt').textContent = S.chips;
  $('#trophCt').textContent = S.trophies;
  $('#soundBtn').textContent = S.sound ? '🔊' : '🔇';
}

/* ================= audio (synth, no files) ================= */
const AU = {
  ctx: null, master: null, rumbleGain: null, rumbleSrc: null,
  ensure() {
    if (!S.sound) return null;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      } catch (e) { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  env(gain, t0, a, peak, d) { gain.gain.setValueAtTime(0.0001, t0); gain.gain.linearRampToValueAtTime(peak, t0 + a); gain.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); },
  tone(freq, dur, type, vol, slideTo) {
    const c = this.ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    this.env(g, c.currentTime, 0.008, vol || 0.15, dur);
    o.connect(g); g.connect(this.master); o.start(); o.stop(c.currentTime + dur + 0.05);
  },
  noiseBurst(dur, filterFreq, vol, type) {
    const c = this.ensure(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = filterFreq; f.Q.value = 0.8;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
  },
  click() { this.tone(660, 0.06, 'triangle', 0.08); },
  whoosh(p) { this.noiseBurst(0.22 + p * 0.2, 900 + p * 900, 0.10 + p * 0.10, 'bandpass'); },
  thud() { this.noiseBurst(0.16, 160, 0.30, 'lowpass'); this.tone(70, 0.14, 'sine', 0.20, 45); },
  gutter() { this.noiseBurst(0.4, 300, 0.10, 'lowpass'); },
  pinCrash(intensity) { // 0..1
    this.noiseBurst(0.5, 2600, 0.16 + intensity * 0.30, 'highpass');
    this.noiseBurst(0.28, 900, 0.12 + intensity * 0.2, 'bandpass');
    const n = 2 + Math.floor(intensity * 3);
    for (let i = 0; i < n; i++) setTimeout(() => this.tone(1900 + Math.random() * 1600, 0.10, 'triangle', 0.05), i * 34);
    if (navigator.vibrate) navigator.vibrate(intensity > 0.75 ? 70 : 30);
  },
  pinTick() { this.tone(2300 + Math.random() * 700, 0.05, 'triangle', 0.045); },
  sting(win) {
    const seq = win ? [523, 659, 784, 1046] : [392, 330, 262];
    seq.forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.12), i * 95));
  },
  caseJingle() { [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'sine', 0.11), i * 80)); },
  rumbleStart() {
    const c = this.ensure(); if (!c || this.rumbleSrc) return;
    const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = last * 3.2; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    this.rumbleSrc = src; this.rumbleGain = g;
  },
  rumbleSet(v) { if (this.rumbleGain && this.ctx) this.rumbleGain.gain.setTargetAtTime(Math.min(0.24, v * 0.03), this.ctx.currentTime, 0.06); },
  rumbleStop() { if (this.rumbleSrc) { try { this.rumbleSrc.stop(); } catch (e) {} this.rumbleSrc = null; this.rumbleGain = null; } },
};

/* ================= navigation ================= */
function show(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('on'));
  $('#screen-' + id).classList.add('on');
  window.scrollTo(0, 0);
  if (id === 'title') renderTitle();
  if (id === 'alleys') renderAlleys();
  if (id === 'arsenal') renderArsenal();
}
function ballOrbStyle(def, size) {
  // Realism pass (2026-11-22): hot specular core, environment sheen band,
  // the ball's own glow rimming the shadow side, deep contact shading.
  return `background:
    radial-gradient(circle at 34% 29%, rgba(255,255,255,.98) 0 3.5%, rgba(255,255,255,.55) 9%, transparent 27%),
    radial-gradient(ellipse 90% 42% at 50% 16%, rgba(255,255,255,.16), transparent 70%),
    radial-gradient(circle at 80% 84%, ${def.skin.glow}66 0 12%, transparent 42%),
    radial-gradient(circle at 62% 64%, ${def.skin.swirl} 0 26%, transparent 58%),
    radial-gradient(circle at 50% 50%, ${def.skin.base} 0 60%, #04050c 128%);
    box-shadow: inset -8px -10px 18px rgba(0,0,0,.62), inset 3px 4px 8px rgba(255,255,255,.14), 0 0 14px ${def.skin.glow}55, 0 5px 14px rgba(0,0,0,.55);`;
}
function statBars(def, level) {
  const st = L.ballStatsAt(def, level);
  const row = (lbl, v) => `<div class="stat"><span class="sn">${lbl}</span><span class="bar"><i style="width:${Math.min(100, v / 20 * 100)}%"></i></span><span class="sv">${Math.round(v * 10) / 10}</span></div>`;
  return row('WEIGHT', st.weight) + row('HOOK CTRL', st.hookControl) + row('SPEED', st.speed) + row('GUIDE', st.guide) + row('HOOK', st.hook);
}

/* ================= title ================= */
function todayStr() { return new Date().toISOString().slice(0, 10); }
function renderTitle() {
  refreshTop();
  const st = S.stats;
  $('#titleStats').innerHTML =
    `League: <b style="color:var(--blue)">${L.leagueRank(S.trophies)}</b> · Matches ${st.matches} · Wins ${st.wins} · Strikes ${st.strikes} · Best game ${st.best}` +
    (S.cases ? `<br>🎁 You have <b style="color:#ffe9a8">${S.cases} unopened case${S.cases > 1 ? 's' : ''}</b> — open ${S.cases > 1 ? 'them' : 'it'} in the Arsenal` : '');
  $('#dailyBtn').style.display = (S.lastDaily !== todayStr()) ? 'block' : 'none';
  $('#caseLbl').textContent = S.cases ? `${S.cases} case${S.cases > 1 ? 's' : ''} waiting!` : 'Balls & upgrades';
}
$('#playBtn').onclick = () => { AU.click(); show('alleys'); };
$('#practiceBtn').onclick = () => { AU.click(); startMatch(null, true); };
$('#arsenalBtn').onclick = () => { AU.click(); show('arsenal'); };
$('#dailyBtn').onclick = () => {
  S.chips += 100; S.lastDaily = todayStr(); save(); AU.caseJingle(); renderTitle();
  toast('🎁 +100 chips — daily case chips claimed');
};
$('#soundBtn').onclick = () => { S.sound = !S.sound; if (!S.sound) AU.rumbleStop(); save(); refreshTop(); AU.click(); };
$('#helpBtn').onclick = () => showHelp();
$('#alleysBack').onclick = () => { AU.click(); show('title'); };
$('#arsenalBack').onclick = () => { AU.click(); show('title'); };

function toast(msg) {
  const card = $('#modalCard');
  card.innerHTML = `<h2 style="font-size:19px;">${msg}</h2><div class="menu"><button class="bigbtn" onclick="document.querySelector('#modal').classList.remove('on')">OK</button></div>`;
  $('#modal').classList.add('on');
}
function showHelp() {
  const card = $('#modalCard');
  card.innerHTML = `<h2>HOW TO PLAY</h2><div class="helpTxt">
    <p><b>The match:</b> 3 frames, real bowling scoring — strikes and spares count the next balls, just like the lanes. Perfect game is 90. Beat the house pro to take the pot, the trophies, and a case.</p>
    <p style="margin-top:8px;"><b>① Line up:</b> drag the ball sideways on the approach.</p>
    <p><b>② Angle:</b> drag anywhere else on the lane to swing the aim arrows.</p>
    <p><b>③ Throw:</b> pull the ball <b>down</b>, hold, then <b>swipe up</b>. One swipe does it all:</p>
    <p>· The <b>needle</b> sweeping under the ball sets your hook — swipe as it crosses <b>centre for straight</b>, off-centre to bend it. Distance = bend strength.<br>
    · <b>Swipe speed = power.</b> A truly fast flick lofts the ball — it lands late, skips the early hook, and drives.<br>
    · A crooked swipe pushes the ball off line. Straight wrist, true ball.</p>
    <p style="margin-top:8px;"><b>The bag:</b> your 6 balls cycle — thrown ball goes to the back. Heavy Power balls plow racks, Bounce balls make pins fly (splits!), Precise balls pick spares. SWAP burns a turn of the cycle to reach the next ball.</p>
    <p style="margin-top:8px;"><b>Shot clock:</b> 20 seconds a throw. Dawdle and the throw is gone.</p>
    <p style="margin-top:8px;"><b>Alleys:</b> win trophies to unlock new rooms. Oil changes the hook — heavy oil skids, dry boards bite. From The Orbit Room on, the racks themselves change…</p>
    </div><div class="menu"><button class="bigbtn" onclick="document.querySelector('#modal').classList.remove('on')">GOT IT</button></div>`;
  $('#modal').classList.add('on');
}

/* ================= alleys ================= */
function renderAlleys() {
  refreshTop();
  const rank = L.leagueRank(S.trophies);
  const next = L.LEAGUE_RANKS.find(r => r.at > S.trophies);
  $('#leagueStrip').innerHTML = `🏆 League: <b>${rank}</b> · ${S.trophies} trophies` +
    (next ? ` · next rank <b>${next.name}</b> at ${next.at}` : ' · top rank!') +
    `<br>🪙 Chips: <b>${S.chips}</b>` + (S.cases ? ` · 🎁 ${S.cases} case${S.cases > 1 ? 's' : ''} in the Arsenal` : '');
  const list = $('#alleyList'); list.innerHTML = '';
  L.ALLEYS.forEach((a, i) => {
    const locked = S.trophies < a.gate;
    const afford = S.chips >= a.stake;
    const div = document.createElement('div');
    div.className = 'alley' + (locked ? ' locked' : '');
    div.style.setProperty('--hue', a.hue);
    div.innerHTML = `<div class="nm">${i + 1}. ${a.name}</div>
      <div class="meta">House pro: <span class="ai">${a.aiName}</span> · Stake <b>${a.stake} chips</b> · Winner takes <b>${a.stake * 2}</b><br>
      ${a.hookFactor > 1.05 ? 'Dry boards — big hook' : a.hookFactor < 0.85 ? 'Heavy oil — ball skids, hook comes late' : 'House oil pattern'}${a.layouts ? ' · Twisted racks' : ' · Classic racks'}
      ${locked ? `<br>🔒 Unlocks at <b>${a.gate} trophies</b>` : afford ? '' : `<br>⚠ You need ${a.stake} chips for the stake`}</div>
      ${locked ? '' : '<div class="go">▶</div>'}`;
    if (!locked) div.onclick = () => {
      if (S.chips < a.stake) { toast(`Not enough chips — the stake is ${a.stake}. Win at a cheaper alley first.`); return; }
      AU.click(); startMatch(i, false);
    };
    list.appendChild(div);
  });
  if (S.chips < L.ALLEYS[0].stake) {
    const b = document.createElement('div'); b.className = 'menu';
    b.innerHTML = `<button class="bigbtn">HOUSE FLOAT — +100 CHIPS<small>On the house, once a day. Don't tell the boss.</small></button>`;
    b.querySelector('button').onclick = () => { S.chips += 100; S.lastDaily = todayStr(); save(); AU.caseJingle(); renderAlleys(); };
    list.appendChild(b);
  }
}

/* ================= arsenal ================= */
let bagSel = 0;
function renderArsenal() {
  refreshTop();
  const bagRow = $('#bagRow'); bagRow.innerHTML = '<span style="font-size:10px; letter-spacing:1px; color:var(--dim)">BAG</span>';
  S.bag.forEach((id, i) => {
    const def = L.BALL_BY_ID[id], rec = S.balls[id];
    const slot = document.createElement('div');
    slot.className = 'slot' + (i === bagSel ? ' sel' : '');
    slot.innerHTML = `<div class="qball" style="${ballOrbStyle(def)}"><span class="lv">Lv${rec.level}</span></div>`;
    slot.onclick = () => { bagSel = i; AU.click(); renderArsenal(); };
    bagRow.appendChild(slot);
  });
  if (S.cases) {
    const c = document.createElement('button');
    c.className = 'minibtn pink'; c.style.marginLeft = 'auto';
    c.textContent = `🎁 OPEN CASE (${S.cases})`;
    c.onclick = () => openCaseUI();
    bagRow.appendChild(c);
  }
  const list = $('#ballList'); list.innerHTML = '';
  for (const def of L.BALLS) {
    const rec = S.balls[def.id];
    const inBag = S.bag.includes(def.id);
    const card = document.createElement('div'); card.className = 'bcard';
    let act = '';
    if (!rec.owned) {
      act = `<div class="cardsTag">🃏 ${rec.cards}/${L.UNLOCK_CARDS} cards<br>to unlock</div>`;
    } else {
      const cost = L.upgradeCost(def, rec.level);
      const canUp = def.type !== 'Beginner' && rec.level < L.MAX_LEVEL && rec.cards >= cost.cards && S.chips >= cost.chips;
      act = `<button class="minibtn" data-up="${def.id}" ${canUp ? '' : 'disabled'}>${def.type === 'Beginner' ? 'NO UPGRADES' : rec.level >= L.MAX_LEVEL ? 'MAX LEVEL' : `⬆ Lv${rec.level + 1}<br><span style="font-size:10px">${cost.cards}🃏 · ${cost.chips}🪙</span>`}</button>
             <button class="minibtn pink" data-bag="${def.id}">${inBag ? 'IN BAG ✓' : '→ BAG SLOT ' + (bagSel + 1)}</button>
             <div class="cardsTag">🃏 ${rec.cards} cards</div>`;
    }
    card.innerHTML = `<div class="orb" style="${ballOrbStyle(def)}"></div>
      <div class="inf"><div class="nm">${def.name} ${rec.owned ? `<span style="font-size:11px; color:var(--blue)">Lv${rec.level}</span>` : '<span style="font-size:11px; color:#ff9d5c">LOCKED</span>'}</div>
      <div class="tp">${def.type.toUpperCase()} · ${def.rarity.toUpperCase()}</div>
      <div class="blurb">${def.blurb}</div>${statBars(def, rec.level)}</div>
      <div class="act">${act}</div>`;
    list.appendChild(card);
  }
  list.querySelectorAll('[data-up]').forEach(btn => btn.onclick = () => {
    const def = L.BALL_BY_ID[btn.dataset.up], rec = S.balls[def.id], cost = L.upgradeCost(def, rec.level);
    rec.cards -= cost.cards; S.chips -= cost.chips; rec.level += 1; save(); AU.caseJingle(); renderArsenal();
  });
  list.querySelectorAll('[data-bag]').forEach(btn => btn.onclick = () => {
    const id = btn.dataset.bag;
    const existing = S.bag.indexOf(id);
    if (existing === bagSel) return;
    if (existing >= 0) { // swap slots
      const t = S.bag[bagSel]; S.bag[bagSel] = id; S.bag[existing] = t;
    } else S.bag[bagSel] = id;
    save(); AU.click(); renderArsenal();
  });
}
function openCaseUI() {
  if (!S.cases) return;
  S.cases -= 1;
  const rand = L.rng({ s: (Date.now() % 2147483647) >>> 0 });
  const prize = L.openCase(rand);
  S.chips += prize.chips;
  const rec = S.balls[prize.cards.ballId];
  rec.cards += prize.cards.count;
  let unlockMsg = '';
  if (!rec.owned && rec.cards >= L.UNLOCK_CARDS) { rec.owned = true; unlockMsg = `<br>✨ <b>NEW BALL UNLOCKED: ${L.BALL_BY_ID[prize.cards.ballId].name}!</b>`; }
  save(); AU.caseJingle(); renderArsenal(); refreshTop();
  const card = $('#modalCard');
  card.innerHTML = `<h2>🎁 CASE OPENED</h2><div class="scoreLine">+${prize.chips} chips</div>
    <div class="deltas">🃏 <b>${prize.cards.count}× ${L.BALL_BY_ID[prize.cards.ballId].name}</b> cards${unlockMsg}</div>
    <div class="menu"><button class="bigbtn" onclick="document.querySelector('#modal').classList.remove('on')">NICE</button></div>`;
  $('#modal').classList.add('on');
}

/* ================= missions ================= */
function missionEvent(kind, n) {
  let changed = false;
  for (const m of S.missions) {
    const def = L.MISSIONS.find(x => x.id === m.id);
    if (!def || m.prog >= def.goal) continue;
    const hit = (kind === 'strike' && m.id === 'strikes3') || (kind === 'win' && m.id === 'wins2') ||
      (kind === 'spare' && m.id === 'spares2') || (kind === 'pins' && m.id === 'pins300') ||
      (kind === 'match' && m.id === 'play4') || (kind === 'score55' && m.id === 'score55');
    if (hit) { m.prog = Math.min(def.goal, m.prog + (kind === 'pins' ? n : 1)); changed = true; }
  }
  if (changed) {
    // grant completed missions and rotate in fresh ones
    for (let i = 0; i < S.missions.length; i++) {
      const m = S.missions[i], def = L.MISSIONS.find(x => x.id === m.id);
      if (def && m.prog >= def.goal) {
        if (def.reward.chips) S.chips += def.reward.chips;
        if (def.reward.case) S.cases += def.reward.case;
        const used = S.missions.map(x => x.id);
        const next = L.MISSIONS.find(x => !used.includes(x.id));
        S.missions[i] = next ? { id: next.id, prog: 0 } : { id: m.id, prog: 0 };
        setTimeout(() => toast(`🎯 Mission done: "${def.text}" — reward paid!`), 400);
      }
    }
    save();
  }
}
function missionListHTML() {
  return S.missions.map(m => {
    const def = L.MISSIONS.find(x => x.id === m.id);
    return `<div class="miss">🎯 ${def.text} — ${Math.min(m.prog, def.goal)}/${def.goal}<div class="pbar"><i style="width:${Math.min(100, m.prog / def.goal * 100)}%"></i></div></div>`;
  }).join('');
}

/* ================= canvas renderer ================= */
const cv = $('#lane'), ctx = cv.getContext('2d');
let W = 390, H = 520, laneTex = null, texHue = 265;
function sizeCanvas() {
  const wrap = $('#laneWrap');
  const w = wrap.clientWidth - 2;
  const h = Math.max(430, Math.min(600, Math.round(w * 1.34)));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = w; H = h;
}
window.addEventListener('resize', () => { if ($('#screen-match').classList.contains('on')) sizeCanvas(); });

/* HD lane texture (1024x2048) — 3D Realism pass, 2026-11-22.
   Texture rows map to lane z: row 0 = pit end (z=21.6), row 2048 = behind
   the foul line (z=-1). x maps lane -0.53..+0.53 m across 39 boards. */
function makeLaneTexture(hue) {
  const t = document.createElement('canvas'); t.width = 1024; t.height = 2048;
  const c = t.getContext('2d');
  const ty = z => (1 - (z + 1) / 21.6) * 2048;         // lane z -> texture row
  const bx = x => (x / L.LANE.width + 0.5) * 1024;     // lane x (m) -> texture col
  const g = c.createLinearGradient(0, 0, 0, 2048);
  g.addColorStop(0, '#070a1c'); g.addColorStop(0.55, '#0a1030'); g.addColorStop(1, '#0e1644');
  c.fillStyle = g; c.fillRect(0, 0, 1024, 2048);
  // nebula swirls projected on the lane
  const blob = (x, y, r, col, a) => { const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col.replace('A', a)); rg.addColorStop(1, col.replace('A', '0')); c.fillStyle = rg; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
  blob(280, 480, 420, `hsla(${hue},95%,62%,A)`, '0.32'); blob(780, 840, 480, 'hsla(315,95%,60%,A)', '0.24');
  blob(400, 1400, 520, `hsla(${(hue + 60) % 360},95%,58%,A)`, '0.22'); blob(840, 1760, 360, 'hsla(190,100%,60%,A)', '0.26');
  blob(180, 1900, 300, 'hsla(280,95%,65%,A)', '0.20');
  // planets on the lane surface (like the real cosmic alleys)
  const planet = (x, y, r, col) => {
    const rg = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,.75)'); rg.addColorStop(0.25, col); rg.addColorStop(1, 'rgba(0,0,10,.0)');
    c.fillStyle = rg; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  };
  planet(800, 360, 68, 'hsla(28,90%,58%,.5)'); planet(192, 1120, 52, 'hsla(160,80%,55%,.45)'); planet(660, 2020, 80, 'hsla(200,95%,62%,.45)');
  // stars
  for (let i = 0; i < 520; i++) {
    c.fillStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.5})`;
    const r = Math.random() * 2.6 + 0.6;
    c.beginPath(); c.arc(Math.random() * 1024, Math.random() * 2048, r, 0, 7); c.fill();
  }
  // 39 boards with per-board tone, gloss variance + grooves
  for (let i = 0; i < 39; i++) {
    const x0 = i * 1024 / 39;
    c.fillStyle = i % 2 ? 'rgba(130,180,255,.055)' : 'rgba(0,0,0,.11)';
    c.fillRect(x0, 0, 1024 / 39, 2048);
    if (i % 3 === 1) { c.fillStyle = 'rgba(190,225,255,.030)'; c.fillRect(x0, 0, 1024 / 39, 2048); }  // glossier boards catch more light
    c.fillStyle = 'rgba(6,8,20,.35)';
    c.fillRect(x0, 0, 1.6, 2048);
    if (i % 5 === 4) { c.fillStyle = 'rgba(150,200,255,.13)'; c.fillRect(x0 + 1024 / 39 - 2.4, 0, 2.4, 2048); }
  }
  // oil sheen: glossy heads/mid-lane that fades before the backends
  const oil = c.createLinearGradient(0, ty(13.5), 0, ty(-0.2));
  oil.addColorStop(0, 'rgba(170,215,255,0)'); oil.addColorStop(0.55, 'rgba(170,215,255,.095)'); oil.addColorStop(1, 'rgba(190,225,255,.16)');
  c.fillStyle = oil; c.fillRect(0, ty(13.5), 1024, ty(-0.2) - ty(13.5));
  // overhead specular streak: the house lights reflecting in the oil,
  // a soft band left of centre running the oiled length of the lane
  const streak = c.createLinearGradient(240, 0, 580, 0);
  streak.addColorStop(0, 'rgba(190,225,255,0)'); streak.addColorStop(0.5, 'rgba(190,225,255,0.075)'); streak.addColorStop(1, 'rgba(190,225,255,0)');
  c.fillStyle = streak; c.fillRect(240, ty(14), 340, ty(-0.2) - ty(14));
  // range-finder arrows at ~4.6 m (tips toward the pins) + dots at ~2.3 m and ~8.6 m
  c.fillStyle = 'rgba(165,215,255,.55)';
  const arrow = (board, z) => {
    const x = (board + 0.5) * 1024 / 39, y = ty(z), wdt = 15, len = 64 + (board === 19 ? 16 : 0);
    c.beginPath(); c.moveTo(x - wdt, y); c.lineTo(x + wdt, y); c.lineTo(x, y - len); c.closePath(); c.fill();
  };
  [4, 9, 14, 19, 24, 29, 34].forEach((b, i) => arrow(b, 4.35 + Math.abs(3 - i) * 0.28));
  const dot = (board, z) => { c.beginPath(); c.arc((board + 0.5) * 1024 / 39, ty(z), 9, 0, 7); c.fill(); };
  [9, 14, 19, 24, 29].forEach(b => dot(b, 2.3));
  [4, 14, 24, 34].forEach(b => dot(b, 8.6));
  // foul line — a hard glowing edge at z=0
  c.fillStyle = 'rgba(10,12,26,.9)'; c.fillRect(0, ty(0), 1024, 2048 - ty(0));       // approach: darker
  c.fillStyle = 'rgba(120,220,255,.85)'; c.fillRect(0, ty(0) - 3, 1024, 5);
  c.fillStyle = 'rgba(120,220,255,.20)'; c.fillRect(0, ty(0) - 12, 1024, 9);
  [9, 14, 19, 24, 29].forEach(b => dot(b, -0.55));                                   // approach dots
  // pin deck: lighter surface + dark pin spots where the rack stands
  const deckG = c.createLinearGradient(0, ty(19.95), 0, ty(17.8));
  deckG.addColorStop(0, 'rgba(190,215,255,.16)'); deckG.addColorStop(1, 'rgba(190,215,255,.03)');
  c.fillStyle = deckG; c.fillRect(0, ty(19.95), 1024, ty(17.8) - ty(19.95));
  // deck gloss: a pool of light at the rack so the pins sit in it and reflect
  const pool = c.createRadialGradient(512, ty(18.9), 10, 512, ty(18.9), 330);
  pool.addColorStop(0, 'rgba(200,225,255,0.11)'); pool.addColorStop(1, 'rgba(200,225,255,0)');
  c.fillStyle = pool; c.fillRect(182, ty(19.95), 660, ty(17.8) - ty(19.95));
  c.fillStyle = 'rgba(5,6,16,.5)';
  for (const n in L.rackPositions()) {
    const [px2, pz2] = L.rackPositions()[n];
    c.beginPath(); c.arc(bx(px2), ty(pz2), 15, 0, 7); c.fill();
  }
  // pit: near-black cushion with pad seams
  c.fillStyle = '#02030a'; c.fillRect(0, 0, 1024, ty(19.95));
  c.fillStyle = 'rgba(90,110,170,.25)';
  for (let i = 1; i < 5; i++) c.fillRect(i * 1024 / 5, 0, 2, ty(19.95));
  c.fillStyle = 'rgba(56,182,255,.35)'; c.fillRect(0, ty(19.95) - 2, 1024, 3);
  return t;
}
function proj(x, z) {
  const t = Math.max(0, Math.min(1, (z + 1.0) / 21.6));
  const s = 1 - 0.70 * Math.pow(t, 1.12);
  return { x: W / 2 + x * (W * 0.47) * s / 0.53, y: H * (0.985 - 0.70 * Math.pow(t, 1.5)), s };
}
function laneHalfPx(z) { const t = Math.max(0, Math.min(1, (z + 1.0) / 21.6)); return W * 0.47 * (1 - 0.70 * Math.pow(t, 1.12)); }

const view = { pins: [], ball: null, particles: [], phase: 'idle', aim: null, pull: null, time: 0 };
function spawnParticles(x, z, n, color, spread) {
  for (let i = 0; i < n; i++) view.particles.push({
    x: x + (Math.random() - 0.5) * (spread || 0.1), z: z + (Math.random() - 0.5) * 0.2,
    vx: (Math.random() - 0.5) * 0.7, vz: (Math.random() - 0.5) * 0.7 - 0.2,
    life: 1, color, size: 0.008 + Math.random() * 0.016,
  });
}
/* ---------- 3D models (Realism package) ----------
   Pins are true lathe models: a real pin profile (height/radius rings)
   projected ring by ring, lit by a fixed key light, tipping in 3D along
   the physics fall direction. The ball is a shaded sphere with rotating
   finger holes and surface bands. Shadows are soft sprites projected on
   the lane from the same light. */
const shadowSprite = (() => {
  const t = document.createElement('canvas'); t.width = t.height = 128;
  const c = t.getContext('2d');
  const g = c.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,10,0.88)'); g.addColorStop(0.55, 'rgba(0,0,10,0.42)'); g.addColorStop(1, 'rgba(0,0,10,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  return t;
})();
function groundShadow(c, x, y, rx, ry, alpha) {
  c.save(); c.globalAlpha = alpha;
  c.drawImage(shadowSprite, x - rx, y - ry, rx * 2, ry * 2);
  c.restore();
}
const PIN_PROFILE = [ // [height m, radius m] — a real pin's silhouette, base -> crown.
  // Refined lathe (whole-game realism pass, 2026-11-22): 22 rings tracing the true
  // curve — base flare, belly max at 0.114 m, neck pinch at 0.272 m, head swell,
  // rounded crown. Physics never reads this; it is the render model only.
  [0.000, 0.001], [0.000, 0.030], [0.002, 0.042], [0.008, 0.049], [0.020, 0.0545], [0.045, 0.0585],
  [0.075, 0.0603], [0.114, 0.0605], [0.150, 0.0580], [0.185, 0.0515], [0.215, 0.0435], [0.240, 0.0365],
  [0.258, 0.0325], [0.272, 0.0308], [0.288, 0.0328], [0.305, 0.0352], [0.322, 0.0358], [0.338, 0.0335],
  [0.352, 0.0285], [0.364, 0.0215], [0.374, 0.0125], [0.381, 0.001],
];
function pinStripe(h) { return (h >= 0.243 && h < 0.261) || (h >= 0.269 && h < 0.287); }  // twin UV neck stripes
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
/* Key light from the upper-left, wrapped around the cylinder: deep shade at
   the edges, a bright face left of centre, and a tight specular plateau —
   the gloss streak of a lacquered pin. Stripes shade on the same model. */
const PIN_STOPS = [[0, '#414e68'], [0.16, '#7e8fb2'], [0.30, '#dde7fa'], [0.365, '#ffffff'], [0.44, '#eef3ff'], [0.62, '#bccbe6'], [0.84, '#71819f'], [1, '#39465e']];
const PIN_STOPS_STRIPE = [[0, '#0d4570'], [0.16, '#1f7fc4'], [0.30, '#8fd8ff'], [0.365, '#ffffff'], [0.44, '#bfeaff'], [0.62, '#3fa9e8'], [0.84, '#19639f'], [1, '#0b3a5e']];
function pinBandFill(c, x0, y0, x1, y1, f, stripe) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [o, col] of (stripe ? PIN_STOPS_STRIPE : PIN_STOPS)) g.addColorStop(o, shade(col, f));
  return g;
}
const pinReflSprite = (() => {
  const t = document.createElement('canvas'); t.width = 64; t.height = 128;
  const c = t.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(195,220,255,0.55)'); g.addColorStop(0.4, 'rgba(150,190,255,0.18)'); g.addColorStop(1, 'rgba(150,190,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 128);
  return t;
})();
function pinAxis(p) {
  if (!p.down) return { x: 0, y: 1, z: 0 };
  const f = p.fallT === undefined ? 1 : Math.min(1, Math.max(0, p.fallT));
  const ang = 1.80 * f * f;   // tips over with gravity's ease-in, ends just past flat
  const a = (p.fallA !== undefined) ? p.fallA : 0.8;
  return { x: Math.sin(ang) * Math.sin(a), y: Math.cos(ang), z: Math.sin(ang) * Math.cos(a) };
}
function drawPin3D(c, p) {
  const axis = pinAxis(p);
  const rings = PIN_PROFILE.map(([h, r]) => {
    const wx = p.x + axis.x * h, wz = p.z + axis.z * h;
    const g = proj(wx, wz);
    const sc = laneHalfPx(wz) / 0.53;               // px per metre at that depth
    return { x: g.x, y: g.y - axis.y * h * sc, r: Math.max(0.4, r * sc), h };
  });
  const top = rings[rings.length - 1], base = rings[0];
  let ax = top.x - base.x, ay = top.y - base.y;
  const alen = Math.hypot(ax, ay) || 1; ax /= alen; ay /= alen;
  const px = -ay, py = ax;                          // silhouette direction on screen
  for (let i = 0; i < rings.length - 1; i++) {
    const r0 = rings[i], r1 = rings[i + 1];
    c.beginPath();
    c.moveTo(r0.x - px * r0.r, r0.y - py * r0.r);
    c.lineTo(r1.x - px * r1.r, r1.y - py * r1.r);
    c.lineTo(r1.x + px * r1.r, r1.y + py * r1.r);
    c.lineTo(r0.x + px * r0.r, r0.y + py * r0.r);
    c.closePath();
    // ambient occlusion near the base, full light at the crown
    const f = r0.h < 0.02 ? 0.70 : 0.86 + 0.14 * Math.min(1, r0.h / 0.25);
    c.fillStyle = pinBandFill(c, r0.x - px * r0.r, r0.y - py * r0.r, r0.x + px * r0.r, r0.y + py * r0.r, f, pinStripe(r0.h));
    c.fill();
  }
  // gloss sheen: one continuous specular sweep clipped to the silhouette,
  // so the lacquer reads as a single surface across the bands
  c.save();
  c.beginPath();
  rings.forEach((r, i) => { if (i === 0) c.moveTo(r.x - px * r.r, r.y - py * r.r); else c.lineTo(r.x - px * r.r, r.y - py * r.r); });
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; c.lineTo(r.x + px * r.r, r.y + py * r.r); }
  c.closePath(); c.clip();
  const rB = Math.max(1, rings[4].r);
  const sg = c.createLinearGradient(base.x - px * rB, base.y - py * rB, base.x + px * rB, base.y + py * rB);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(0.27, 'rgba(255,255,255,0.04)');
  sg.addColorStop(0.355, 'rgba(255,255,255,0.30)');
  sg.addColorStop(0.44, 'rgba(255,255,255,0.03)');
  sg.addColorStop(1, 'rgba(120,165,255,0.07)');
  c.fillStyle = sg;
  c.fillRect(Math.min(base.x, top.x) - rB * 2, Math.min(base.y, top.y) - rB, rB * 4, Math.abs(base.y - top.y) + rB * 3);
  c.restore();
  // crown highlight
  c.save();
  const cg = c.createRadialGradient(top.x - px * top.r * 0.3, top.y - py * top.r * 0.3, 0, top.x, top.y, Math.max(1.2, rings[rings.length - 3].r));
  cg.addColorStop(0, 'rgba(255,255,255,0.55)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = cg;
  c.beginPath(); c.arc(top.x, top.y, Math.max(1.2, rings[rings.length - 3].r), 0, 7); c.fill();
  c.restore();
  if (p.down) { // base cap, visible once tipped — shaded, with a rim of light
    c.save();
    c.translate(base.x, base.y); c.rotate(Math.atan2(ay, ax) + Math.PI / 2);
    const capR = Math.max(0.6, rings[2].r);
    const bg2 = c.createRadialGradient(-capR * 0.3, -capR * 0.12, 0, 0, 0, capR);
    bg2.addColorStop(0, '#8492b0'); bg2.addColorStop(0.75, '#5d6a88'); bg2.addColorStop(1, '#39445c');
    c.fillStyle = bg2;
    c.beginPath(); c.ellipse(0, 0, capR, Math.max(0.3, capR * 0.38), 0, 0, 7); c.fill();
    c.restore();
  }
}
function drawBall3D(c, px, py, r, def, dist) {
  c.save();
  c.shadowColor = def.skin.glow; c.shadowBlur = 18;
  const g = c.createRadialGradient(px - r * 0.38, py - r * 0.42, r * 0.08, px, py, r * 1.03);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.20, def.skin.base); g.addColorStop(0.62, def.skin.swirl); g.addColorStop(0.88, '#05060f'); g.addColorStop(1, '#02030a');
  c.fillStyle = g; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill();
  c.shadowBlur = 0;
  // rolling surface bands
  c.strokeStyle = def.skin.glow; c.globalAlpha = 0.75; c.lineWidth = Math.max(1.4, r * 0.07);
  c.beginPath(); c.arc(px, py, r * 0.62, dist * 2.2, dist * 2.2 + 4.4); c.stroke();
  c.globalAlpha = 0.5; c.beginPath(); c.arc(px, py, r * 0.34, -dist * 3.1, -dist * 3.1 + 3.6); c.stroke();
  c.globalAlpha = 1;
  // finger holes, rotating with the roll
  const ha = dist * 2.2;
  for (let k = 0; k < 3; k++) {
    const a = ha + k * 2.1;
    const hx = px + Math.cos(a) * r * 0.36, hy = py + Math.sin(a) * r * 0.30;
    const fade = 0.30 + 0.70 * Math.max(0, Math.cos(a - 0.7));
    c.fillStyle = `rgba(2,3,10,${0.25 + 0.55 * fade})`;
    c.beginPath(); c.arc(hx, hy, Math.max(1, r * 0.085), 0, 7); c.fill();
  }
  // realism pass (2026-11-22): environment sheen across the upper face,
  // a rim of the ball's own glow on the shadow side, a tighter specular
  // with a hot core, and contact shading where the ball meets the lane
  c.save();
  c.beginPath(); c.arc(px, py, r, 0, 7); c.clip();
  const es = c.createLinearGradient(px, py - r, px, py + r * 0.25);
  es.addColorStop(0, 'rgba(255,255,255,0.13)'); es.addColorStop(0.55, 'rgba(255,255,255,0.02)'); es.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = es; c.fillRect(px - r, py - r, r * 2, r * 1.25);
  const cs = c.createLinearGradient(px, py + r * 0.55, px, py + r);
  cs.addColorStop(0, 'rgba(2,3,10,0)'); cs.addColorStop(1, 'rgba(2,3,10,0.42)');
  c.fillStyle = cs; c.fillRect(px - r, py + r * 0.55, r * 2, r * 0.45);
  c.restore();
  c.save();
  c.strokeStyle = hexA(def.skin.glow, 0.55); c.lineWidth = Math.max(1.2, r * 0.09);
  c.shadowColor = def.skin.glow; c.shadowBlur = r * 0.35;
  c.beginPath(); c.arc(px, py, r * 0.94, 0.15, 1.25); c.stroke();
  c.restore();
  // specular highlight from the key light
  const sg = c.createRadialGradient(px - r * 0.36, py - r * 0.44, 0, px - r * 0.36, py - r * 0.44, r * 0.26);
  sg.addColorStop(0, 'rgba(255,255,255,0.95)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sg; c.beginPath(); c.arc(px - r * 0.36, py - r * 0.44, r * 0.26, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.beginPath(); c.arc(px - r * 0.36, py - r * 0.44, Math.max(0.8, r * 0.07), 0, 7); c.fill();
  c.restore();
}
function drawScene(now) {
  ctx.clearRect(0, 0, W, H);
  // back wall + sign
  const deckY = proj(0, 20.6).y, headY = proj(0, L.LANE.headPinZ).y;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#04040e'); bg.addColorStop(0.35, '#070a20'); bg.addColorStop(1, '#05060f');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,36,.95)'; ctx.fillRect(0, deckY - H * 0.055, W, headY - deckY + H * 0.06);
  ctx.font = `900 ${Math.round(H * 0.036)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.shadowColor = '#38b6ff'; ctx.shadowBlur = 16; ctx.fillStyle = '#cfe9ff';
  ctx.fillText('H U S T L E   C I T Y', W / 2, deckY - H * 0.012);
  ctx.restore();
  // masking units flanking the sign — slim glow panels, kept clear of the lettering
  ctx.save();
  for (const sgn of [-1, 1]) {
    const mx = W / 2 + sgn * W * 0.415, mw = W * 0.15, my = deckY - H * 0.052, mh = headY - deckY + H * 0.052;
    ctx.fillStyle = 'rgba(16,10,34,.88)';
    ctx.beginPath(); ctx.roundRect(mx - mw / 2, my, mw, mh, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,79,216,.38)'; ctx.lineWidth = 1.2; ctx.stroke();
    const pg = ctx.createRadialGradient(mx, my + mh * 0.5, 1, mx, my + mh * 0.5, mw * 0.55);
    pg.addColorStop(0, 'rgba(255,79,216,.20)'); pg.addColorStop(1, 'rgba(255,79,216,0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(mx, my + mh * 0.5, mw * 0.55, 0, 7); ctx.fill();
  }
  ctx.restore();
  // lane surface in perspective strips (HD texture)
  if (laneTex) {
    const strips = 72, z0 = -1.0, z1 = 20.6;
    for (let i = 0; i < strips; i++) {
      const za = z0 + (z1 - z0) * i / strips, zb = z0 + (z1 - z0) * (i + 1) / strips;
      const pa = proj(0, za), pb = proj(0, zb);
      const wa = laneHalfPx(za) / 0.53, wb = laneHalfPx(zb) / 0.53;
      const va = (1 - (za + 1) / 21.6) * 2048, vb = (1 - (zb + 1) / 21.6) * 2048;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pa.x - 0.53 * wa, pa.y); ctx.lineTo(pa.x + 0.53 * wa, pa.y);
      ctx.lineTo(pb.x + 0.53 * wb, pb.y); ctx.lineTo(pb.x - 0.53 * wb, pb.y);
      ctx.closePath(); ctx.clip();
      ctx.drawImage(laneTex, 0, vb, 1024, Math.max(1, va - vb), pa.x - 0.53 * wa, pb.y - 1, 0.53 * wa + 0.53 * wb, (pa.y - pb.y) + 2);
      ctx.restore();
    }
    // gutters: dark channel + chrome rail + neon edge
    for (const sgn of [-1, 1]) {
      const p1 = proj(sgn * 0.545, -1), p2 = proj(sgn * 0.545, 20.2), p3 = proj(sgn * 0.70, 20.2), p4 = proj(sgn * 0.70, -1);
      const gg = ctx.createLinearGradient(p1.x, 0, p4.x, 0);
      gg.addColorStop(0, '#05060f'); gg.addColorStop(0.5, '#131a38'); gg.addColorStop(1, '#04050c');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
      const r1 = proj(sgn * 0.70, -1), r2 = proj(sgn * 0.70, 20.2), r3 = proj(sgn * 0.79, 20.2), r4 = proj(sgn * 0.79, -1);
      ctx.fillStyle = '#1a2138';
      ctx.beginPath(); ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.lineTo(r3.x, r3.y); ctx.lineTo(r4.x, r4.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(200,225,255,.35)'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(56,182,255,.55)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    // pin-deck light pool
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const dg = ctx.createRadialGradient(W / 2, headY, 4, W / 2, headY, W * 0.30);
    dg.addColorStop(0, 'rgba(150,190,255,.20)'); dg.addColorStop(1, 'rgba(150,190,255,0)');
    ctx.fillStyle = dg; ctx.fillRect(W / 2 - W * 0.30, headY - W * 0.10, W * 0.60, W * 0.24);
    ctx.restore();
  }
  // lighting: a fixed key-light cone from upper-left + sweeping disco spots
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const kg = ctx.createRadialGradient(W * 0.16, H * 0.02, 10, W * 0.16, H * 0.02, W * 0.85);
  kg.addColorStop(0, 'rgba(190,220,255,.13)'); kg.addColorStop(1, 'rgba(190,220,255,0)');
  ctx.fillStyle = kg; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2; i++) {
    const lx = W * (0.5 + 0.38 * Math.sin(now / 3400 + i * 2.6)), ly = H * (0.55 + 0.2 * Math.cos(now / 2900 + i * 1.7));
    const rg = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.24);
    rg.addColorStop(0, i ? 'rgba(255,79,216,.10)' : 'rgba(56,182,255,.12)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  // guide line + aim arrow
  if (view.phase === 'aim' && view.aim) {
    const st = view.aim.stats, a = view.aim;
    const guideLen = 3.5 + st.guide * 0.55;
    ctx.save();
    ctx.strokeStyle = 'rgba(120,255,170,.85)'; ctx.lineWidth = 2.4; ctx.setLineDash([7, 7]);
    ctx.shadowColor = '#4dff9d'; ctx.shadowBlur = 7;
    ctx.beginPath();
    for (let d = 0; d <= guideLen; d += 0.4) {
      const z = -0.4 + d, x = a.startX + Math.tan(a.angleDeg * Math.PI / 180) * d;
      const p = proj(x, z);
      if (d === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke(); ctx.setLineDash([]);
    // angle chevron
    const bp = proj(a.startX, -0.4);
    ctx.translate(bp.x, bp.y - H * 0.085); ctx.rotate(a.angleDeg * Math.PI / 180 * 2.2);
    ctx.fillStyle = '#ffd21f'; ctx.shadowColor = '#ffd21f'; ctx.shadowBlur = 9;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, 5); ctx.lineTo(-7, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // ground shadows (light falls from upper-left: shadows lean right/back)
  for (const p of view.pins) {
    if (p.gone) continue;
    const gp = proj(p.x, p.z), sc = laneHalfPx(p.z) / 0.53;
    // glossy deck reflection: a squashed mirror streak under each standing pin
    if (!p.down && p.z > 15) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.17;
      ctx.drawImage(pinReflSprite, gp.x - 0.055 * sc, gp.y + 1, 0.11 * sc, 0.381 * sc * 0.62);
      ctx.restore();
    }
    groundShadow(ctx, gp.x + 0.05 * sc * 0.4, gp.y, 0.075 * sc, 0.030 * sc, 0.50);
    if (p.down) {
      const axis = pinAxis(p);
      const tip = proj(p.x + axis.x * 0.34, p.z + axis.z * 0.34);
      groundShadow(ctx, tip.x + 0.05 * sc * 0.4, tip.y, 0.070 * sc, 0.028 * sc, 0.34);
    }
  }
  if (view.ball) {
    const b = view.ball, gp = proj(b.x, b.z);
    const r = Math.max(2.2, L.LANE.ballR * (laneHalfPx(b.z) / 0.53));
    groundShadow(ctx, gp.x + r * 0.22, gp.y + r * 0.10, r * (b.airborne ? 0.80 : 0.98), r * 0.36, b.airborne ? 0.30 : 0.52);
    // glossy lane reflection: a squashed mirror of the ball in its own
    // colours on the oiled surface, plus a whisper of its glow
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.translate(gp.x, gp.y + r * 0.32); ctx.scale(1, 0.30);
    const rg = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r * 0.72);
    rg.addColorStop(0, hexA(b.def.skin.swirl, b.airborne ? 0.14 : 0.30));
    rg.addColorStop(0.55, hexA(b.def.skin.base, b.airborne ? 0.06 : 0.14));
    rg.addColorStop(1, hexA(b.def.skin.base, 0));
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, 7); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.10;
    ctx.fillStyle = b.def.skin.glow;
    ctx.beginPath(); ctx.ellipse(gp.x, gp.y + r * 0.34, r * 0.55, r * 0.16, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  // pins (far to near) — 3D lathe models
  const pinsSorted = [...view.pins].sort((a, b) => b.z - a.z);
  for (const p of pinsSorted) {
    if (p.gone && p.down) continue;
    ctx.save();
    if (p.down) ctx.globalAlpha = 0.96;
    drawPin3D(ctx, p);
    ctx.restore();
  }
  // particles
  for (const pt of view.particles) {
    const pr = proj(pt.x, pt.z);
    ctx.save(); ctx.globalAlpha = Math.max(0, pt.life) * 0.9;
    ctx.fillStyle = pt.color; ctx.shadowColor = pt.color; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(pr.x, pr.y, Math.max(0.6, pt.size * laneHalfPx(pt.z) * 2), 0, 7); ctx.fill();
    ctx.restore();
  }
  // ball — shaded 3D sphere resting on the lane surface
  if (view.ball) {
    const b = view.ball, pr = proj(b.x, b.z);
    const r = Math.max(2.2, L.LANE.ballR * (laneHalfPx(b.z) / 0.53));
    const cy = pr.y - r * 0.92 - (b.airborne ? r * 0.55 : 0);
    drawBall3D(ctx, pr.x, cy, r, b.def, b.dist || 0);
  }
  // hook meter during pull-back
  if (view.phase === 'pullback' && view.pull) {
    const st = view.pull.stats;
    const needle = L.needleValue((now - view.pull.startT) / 1000, st.hookControl);
    const bw = W * 0.74, bx = W / 2 - bw / 2, by = H * 0.66, bh = 16;
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,18,.82)'; ctx.strokeStyle = 'rgba(56,182,255,.6)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
    const grd = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grd.addColorStop(0, '#ff4fd8'); grd.addColorStop(0.5, '#3aff8c'); grd.addColorStop(1, '#ff4fd8');
    ctx.fillStyle = grd; ctx.globalAlpha = 0.30;
    ctx.beginPath(); ctx.roundRect(bx + 2, by + 2, bw - 4, bh - 4, 6); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.fillRect(W / 2 - 1.2, by - 3, 2.4, bh + 6);
    const nx = W / 2 + needle * (bw / 2 - 8);
    ctx.fillStyle = '#ffd21f'; ctx.shadowColor = '#ffd21f'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(nx, by - 7); ctx.lineTo(nx + 6.5, by + 2); ctx.lineTo(nx - 6.5, by + 2); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.font = "800 10px 'Segoe UI', sans-serif"; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb7ec'; ctx.fillText('◀ HOOK', bx + 24, by + bh + 14);
    ctx.fillStyle = '#8dffbe'; ctx.fillText('STRAIGHT', W / 2, by + bh + 14);
    ctx.fillStyle = '#ffb7ec'; ctx.fillText('HOOK ▶', bx + bw - 24, by + bh + 14);
    ctx.font = "800 11.5px 'Segoe UI', sans-serif"; ctx.fillStyle = '#fff';
    ctx.fillText('SWIPE UP TO THROW — SPEED IS POWER', W / 2, by - 14);
    ctx.restore();
  }
}
let rafOn = false;
function renderLoop(now) {
  if (!rafOn) return;
  // step particles
  for (const pt of view.particles) { pt.x += pt.vx * 0.016; pt.z += pt.vz * 0.016; pt.life -= 0.022; }
  view.particles = view.particles.filter(p => p.life > 0);
  // advance pin tip-over animation
  const dtF = Math.min(0.05, ((now || 0) - (view._lastNow || now || 0)) / 1000 || 0.016);
  view._lastNow = now || 0;
  for (const p of view.pins) if (p.down && p.fallT !== undefined && p.fallT < 1) p.fallT = Math.min(1, p.fallT + dtF * 3.4);
  drawScene(now || 0);
  if (rollAnim.active) stepRollAnim();
  requestAnimationFrame(renderLoop);
}

/* ================= match engine ================= */
let M = null;
const rollAnim = { active: false, ts: null, last: 0, acc: 0, scale: 1, resolve: null, crashed: false, side: null };

function currentBallRec() { const id = M.queue[0]; return { id, def: L.BALL_BY_ID[id], stats: L.ballStatsAt(L.BALL_BY_ID[id], S.balls[id].level) }; }
function renderQueue() {
  const q = $('#queueBalls'); q.innerHTML = '';
  M.queue.forEach((id, i) => {
    const def = L.BALL_BY_ID[id], rec = S.balls[id];
    const d = document.createElement('div');
    d.className = 'qball' + (i === 0 ? ' cur' : '');
    d.style.cssText = ballOrbStyle(def);
    d.innerHTML = `<span class="lv">Lv${rec.level}</span>`;
    d.title = def.name;
    q.appendChild(d);
  });
  const { def, stats } = currentBallRec();
  $('#ballInfo .bn').textContent = def.name;
  $('#ballInfo .bt').textContent = `${def.type} · W${Math.round(stats.weight)} HC${Math.round(stats.hookControl)} SPD${stats.speed} GDE${stats.guide} HK${stats.hook}`;
  $('#swapBtn').disabled = view.phase !== 'aim';
}
$('#swapBtn').onclick = () => {
  if (!M || view.phase !== 'aim') return;
  M.queue.push(M.queue.shift()); AU.click(); renderQueue();
  setHint(`Next ball up: <b>${currentBallRec().def.name}</b>. The thrown ball goes to the back of the line.`);
};
function setHint(html) { $('#hint').innerHTML = html; }
function banner(big, small, ms) {
  const b = $('#banner');
  b.querySelector('.big').textContent = big;
  b.querySelector('.small').textContent = small || '';
  b.classList.add('show');
  clearTimeout(banner._t);
  banner._t = setTimeout(() => b.classList.remove('show'), ms || 1500);
}
function frameSlices(rolls, rackSizes) {
  const out = [[], [], []]; let ri = 0;
  for (let f = 0; f < 3; f++) {
    if (f < 2) {
      if (rolls[ri] === undefined) break;
      if (rolls[ri] === rackSizes[f]) { out[f] = [rolls[ri]]; ri += 1; }
      else { out[f] = rolls.slice(ri, ri + 2); ri += out[f].length; }
    } else out[f] = rolls.slice(ri);
  }
  return out;
}
function rollSymbol(r, rackSize, prevInFrame) {
  if (r === 0) return '–';
  if (prevInFrame === null && r === rackSize) return 'X';
  if (prevInFrame !== null && prevInFrame + r === rackSize) return '/';
  return String(r);
}
function renderScorebug() {
  const mk = (name, rolls, isMe) => {
    const slices = frameSlices(rolls, M.rackSizes);
    const soFar = L.scoreSoFar(rolls, M.rackSizes);
    let cells = '';
    for (let f = 0; f < 3; f++) {
      const sl = slices[f];
      let syms = '';
      if (f < 2) syms = sl.map((r, i) => rollSymbol(r, M.rackSizes[f], i === 0 ? null : sl[0])).join(' ');
      else {
        let standing = 10; syms = sl.map(r => {
          let s; if (r === 10 && standing === 10) s = 'X'; else if (r === standing && standing < 10) s = '/'; else s = r === 0 ? '–' : String(r);
          standing -= r; if (standing <= 0 || r === 10) standing = 10; return s;
        }).join(' ');
      }
      cells += `<td><div class="rolls">${syms || '&nbsp;'}</div><div class="cum">${soFar.frames[f] && soFar.frames[f].cum !== null ? soFar.frames[f].cum : ''}</div></td>`;
    }
    const fin = L.scoreGame(rolls, M.rackSizes);
    const complete = frameSlices(rolls, M.rackSizes)[2].length >= 2 && soFar.frames[2].cum !== null;
    return `<tr class="${isMe ? 'me' : ''}"><td class="nm">${name}</td>${cells}<td class="tot">${complete || M.over ? fin.total : (soFar.total || '')}</td></tr>`;
  };
  $('#scorebug').innerHTML = `<table><tr><th></th><th>FRAME 1</th><th>FRAME 2</th><th>FRAME 3</th><th>TOTAL</th></tr>
    ${mk('YOU', M.you.rolls, true)}${M.practice ? '' : mk(M.alley.aiName.toUpperCase(), M.ai.rolls, false)}</table>`;
}

async function startMatch(alleyIdx, practice) {
  const alley = practice ? L.ALLEYS[0] : L.ALLEYS[alleyIdx];
  if (!practice) { S.chips -= alley.stake; save(); }
  const rand = L.rng({ s: (Date.now() % 2147483647) >>> 0 });
  const layouts = [0, 1].map(() => (alley.layouts && rand() < 0.55) ? L.LAYOUT_KEYS[1 + Math.floor(rand() * (L.LAYOUT_KEYS.length - 1))] : 'full');
  M = {
    alley, alleyIdx: practice ? 0 : alleyIdx, practice, rand, over: false, aborted: false,
    you: { rolls: [] }, ai: { rolls: [] },
    layoutByFrame: layouts,
    rackSizes: [L.LAYOUTS[layouts[0]].pins.length, L.LAYOUTS[layouts[1]].pins.length, 10],
    queue: [...S.bag],
  };
  laneTex = makeLaneTexture(alley.hue); texHue = alley.hue;
  show('match'); sizeCanvas();
  view.pins = L.makeRack('full'); view.ball = null; view.phase = 'idle'; view.particles = [];
  renderScorebug(); renderQueue();
  $('#turnTag').textContent = practice ? 'PRACTICE' : `VS ${alley.aiName.toUpperCase()}`;
  rafOn = true; requestAnimationFrame(renderLoop);
  const mine = M;
  for (let f = 0; f < 3; f++) {
    await playFrame('you', f); if (M !== mine || mine.aborted) return;
    renderScorebug();
    if (!practice) { await playFrame('ai', f); if (M !== mine || mine.aborted) return; renderScorebug(); }
  }
  finishMatch();
}

async function playFrame(side, f) {
  const isYou = side === 'you';
  const data = isYou ? M.you : M.ai;
  const layoutKey = f < 2 ? M.layoutByFrame[f] : 'full';
  let rack = L.makeRack(layoutKey);
  let prevDown = 0;
  const doRoll = async (first) => {
    const got = await executeRoll(side, rack, first, prevDown);
    if (!M || M.aborted) return 0;
    const d = rack.filter(p => p.down).length;
    const pins = d - prevDown; prevDown = d;
    data.rolls.push(pins);
    if (isYou) {
      S.stats.pins += pins;
      const rackSize = rack.length;
      if (first && pins === rackSize) { S.stats.strikes++; missionEvent('strike', 1); banner('STRIKE!', 'All ten — beautiful', 1600); AU.sting(true); }
      else if (!first && pins > 0 && data.rolls[data.rolls.length - 2] + pins === rackSize && f < 2) { S.stats.spares++; missionEvent('spare', 1); banner('SPARE!', 'Picked it up', 1400); }
      else if (pins === 0) banner(first ? 'MISS' : 'NO GOOD', '', 900);
      missionEvent('pins', pins);
      save();
    } else {
      const rackSize = rack.length;
      if (first && pins === rackSize) banner('STRIKE', `${M.alley.aiName} finds the pocket`, 1100);
      else if (!first && pins > 0 && data.rolls[data.rolls.length - 2] + pins === rackSize && f < 2) banner('SPARE', `${M.alley.aiName} converts`, 1000);
    }
    renderScorebug();
    await wait(420);
    return pins;
  };
  if (f < 2) {
    const r1 = await doRoll(true); if (!M || M.aborted) return;
    if (r1 < rack.length) await doRoll(false);
  } else {
    const r1 = await doRoll(true); if (!M || M.aborted) return;
    if (r1 === 10) {
      rack = L.makeRack('full'); prevDown = 0;
      const r2 = await doRoll(true); if (!M || M.aborted) return;
      if (r2 === 10) { rack = L.makeRack('full'); prevDown = 0; await doRoll(true); }
      else await doRoll(false);
    } else {
      const r2 = await doRoll(false); if (!M || M.aborted) return;
      if (r1 + r2 === 10) { rack = L.makeRack('full'); prevDown = 0; await doRoll(true); }
    }
  }
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

/* One roll: sets up the rack view, gets the throw (human gesture or AI),
   animates the physics, merges the result back into the frame rack.
   Returns when the roll is fully settled. */
async function executeRoll(side, rack, first, prevDown) {
  const isYou = side === 'you';
  const standing = rack.filter(p => !p.down);
  view.pins = standing.map(p => ({ ...p }));
  let ballDef, stats, params;
  if (isYou) {
    const rec = currentBallRec(); ballDef = rec.def; stats = rec.stats;
    $('#turnTag').textContent = 'YOUR THROW';
    params = await aimPhase(rec, standing, first);
    if (!M || M.aborted) return 0;
    if (params === null) { // shot clock ran out
      banner('TOO SLOW', 'The shot clock ate that throw', 1400);
      view.ball = null; view.phase = 'idle';
      await wait(700);
      rotateQueueAfterThrow();
      return 0;
    }
  } else {
    ballDef = M.alleyIdx >= 3 ? L.BALL_BY_ID['void-walker'] : L.BALL_BY_ID['chrome-comet'];
    const ai = L.aiBallFor(M.alleyIdx); stats = ai.stats;
    $('#turnTag').textContent = `${M.alley.aiName.toUpperCase()} — HOUSE PRO`;
    setHint(`${M.alley.aiName} is on the lane. Watch the line — then beat it. <b>Tap the lane to hurry.</b>`);
    params = L.aiChooseParams(M.alley, rack, first, M.rand);
    view.phase = 'ai-show';
    view.ball = { x: params.startX, z: -0.4, def: ballDef, dist: 0, airborne: false };
    await wait(750); if (!M || M.aborted) return 0;
  }
  // animate the throw
  const simPins = standing.map(p => ({ ...p }));
  const ts = L.createThrow(ballDef, stats, params, simPins, M.alley);
  view.pins = ts.pins;
  view.ball = { x: ts.ball.x, z: ts.ball.z, def: ballDef, dist: 0, airborne: ts.ball.airborne };
  view.phase = 'rolling';
  AU.whoosh(params.power); AU.rumbleStart();
  await new Promise(res => { rollAnim.active = true; rollAnim.ts = ts; rollAnim.last = performance.now(); rollAnim.acc = 0; rollAnim.scale = isYou ? 1 : 1.45; rollAnim.resolve = res; rollAnim.crashed = false; rollAnim.side = side; });
  AU.rumbleStop();
  view.phase = 'idle'; view.ball = null;
  // merge back into the frame rack
  for (const sp of ts.pins) {
    const rp = rack.find(p => p.n === sp.n);
    if (rp) { rp.down = sp.down; rp.x = sp.x; rp.z = sp.z; rp.gone = sp.gone; rp.renderFall = sp.renderFall; }
  }
  view.pins = rack.filter(p => !p.down).map(p => ({ ...p }));
  if (isYou) rotateQueueAfterThrow();
  return rack.filter(p => p.down).length - prevDown;
}
function rotateQueueAfterThrow() { M.queue.push(M.queue.shift()); renderQueue(); }

function stepRollAnim() {
  const now = performance.now();
  let dt = Math.min(0.05, (now - rollAnim.last) / 1000) * rollAnim.scale;
  rollAnim.last = now;
  rollAnim.acc += dt;
  const ts = rollAnim.ts, step = 1 / 300;
  let firstHitDone = rollAnim.crashed;
  while (rollAnim.acc >= step) {
    L.stepThrow(ts, step);
    rollAnim.acc -= step;
    for (const e of ts.events) {
      if (e.type === 'pinhit' && !firstHitDone) { AU.pinCrash(Math.min(1, e.speed / 9)); firstHitDone = true; rollAnim.crashed = true; }
      else if (e.type === 'pinhit') AU.pinTick();
      else if (e.type === 'gutter') AU.gutter();
      else if (e.type === 'land') AU.thud();
      else if (e.type === 'pinfall') {
        const p = ts.pins.find(q => q.n === e.pin);
        if (p) {
          p.renderFall = Math.atan2(p.vx, p.vz) + Math.PI / 2;
          p.fallA = Math.atan2(p.vx, p.vz);   // 3D tip-over follows the hit direction
          p.fallT = 0;
          spawnParticles(p.x, p.z, 5, '#b18cff', 0.16);
        }
      }
    }
    ts.events.length = 0;
    if (ts.ball.done) break;
  }
  view.ball = { x: ts.ball.x, z: ts.ball.z, def: ts.ballDef, dist: ts.ball.dist, airborne: ts.ball.airborne };
  view.pins = ts.pins;
  if (!ts.ball.inGutter && ts.ball.z > 0 && ts.ball.z < L.LANE.headPinZ) {
    AU.rumbleSet(Math.abs(ts.ball.vz));
    if (Math.random() < 0.5) spawnParticles(ts.ball.x, ts.ball.z - 0.2, 1, ts.ballDef.skin.glow, 0.05);
  } else AU.rumbleSet(0);
  if (ts.ball.done) {
    rollAnim.active = false;
    const res = rollAnim.resolve; rollAnim.resolve = null;
    setTimeout(res, 300);
  }
}

/* ================= aim phase (human input) =================
   (the gesture handlers live below aimPhase — see the input block) */
function aimPhase(rec, standing, first) {
  return new Promise(resolve => {
    const stats = rec.stats;
    view.phase = 'aim';
    view.aim = { startX: -0.06, angleDeg: 0, stats };
    view.ball = { x: view.aim.startX, z: -0.4, def: rec.def, dist: 0, airborne: false };
    renderQueue();
    const leave = standing.length;
    if (S.tutorial < 3) {
      setHint(`<b>①</b> Drag the <b>ball</b> sideways to line up · <b>②</b> drag the lane to angle · <b>③</b> pull the ball <b>down</b>, hold, then <b>swipe up</b> — needle at centre = straight ball.`);
    } else if (!first) {
      setHint(`${leave} pin${leave > 1 ? 's' : ''} standing. Pick up the spare — a straighter ball helps.`);
    } else {
      setHint(`Frame ball — ${rec.def.name} is up. Find the pocket: between the head pin and the 3 pin.`);
    }
    // shot clock
    let left = 20;
    const clockEl = $('#clockNum'), wrap = $('#clockWrap');
    wrap.style.visibility = 'visible'; clockEl.textContent = left; wrap.classList.remove('low');
    const iv = setInterval(() => {
      left -= 0.1;
      clockEl.textContent = Math.max(0, Math.ceil(left));
      if (left <= 5.05) wrap.classList.add('low');
      if (left <= 0) { cleanup(); resolve(null); }
    }, 100);
    const cleanup = () => { clearInterval(iv); wrap.style.visibility = 'hidden'; input.aimResolve = null; };
    input.aimResolve = (params) => { cleanup(); resolve(params); };
    input.aimStats = stats; input.aimDef = rec.def;
  });
}

/* Gesture input — REWRITTEN 2026-11-22 for real fingers.
   The old chain failed on phones three ways: (1) the throw only armed
   after a 20-34px pull-down begun inside a small circle on the ball —
   touches starting anywhere else were trapped in 'rotate' forever, and a
   shallow natural dip never armed at all; (2) samples were recorded only
   in pull-back mode and the flick parser demanded dense pointermove
   samples inside a 300 ms window, but touch browsers deliver sparse,
   coalesced moves (and none while the finger holds still), so even a
   textbook pull-hold-flick starved the parser and was rejected; (3) a
   second finger could steal the pointer id mid-gesture. Result, in
   Joshua's words: "you can move it side to side, but you can't roll it."
   Now: every sample of the gesture is recorded (coalesced events
   unpacked, event timeStamps kept), position/aim follow the drag from
   any start point, a 10px dip arms the pull-back, and the release is
   read by L.parseThrow from the shape of the whole gesture. */
const input = { pid: null, mode: null, samples: [], minY: 0, maxY: 0, armT: 0, carry: 0, aimResolve: null, aimStats: null, aimDef: null };
function canvasPos(e) {
  const r = cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function pushSamples(e) {
  let list = null;
  try { list = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : null; } catch (err) {}
  const evs = (list && list.length) ? list : [e];
  const r = cv.getBoundingClientRect();
  let p = null;
  for (const ce of evs) {
    p = { x: ce.clientX - r.left, y: ce.clientY - r.top, t: ce.timeStamp || e.timeStamp || performance.now() };
    input.samples.push(p);
    if (p.y < input.minY) input.minY = p.y;
    if (p.y > input.maxY) input.maxY = p.y;
  }
  if (input.samples.length > 300) input.samples.splice(0, input.samples.length - 300);
  return p;
}
cv.addEventListener('pointerdown', e => {
  AU.ensure();
  if (rollAnim.active && rollAnim.side === 'ai') { rollAnim.scale = 2.8; return; }
  if (view.phase !== 'aim' || !view.aim) return;
  if (input.pid !== null) return;                    // one finger runs the throw
  e.preventDefault();
  input.pid = e.pointerId;
  input.samples = [];
  input.armT = 0;
  input.carry = 0;
  const p = pushSamples(e);
  input.minY = input.maxY = p.y;
  const bp = proj(view.aim.startX, -0.4);
  // near the ball = positioning grip; anywhere else still aims — and
  // EITHER start can pull back and throw. No dead zones.
  input.mode = Math.hypot(p.x - bp.x, p.y - bp.y) < 84 ? 'ball' : 'lane';
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
});
cv.addEventListener('pointermove', e => {
  if (input.pid !== e.pointerId || !view.aim) return;
  const prevIdx = input.samples.length - 1;
  const prev = input.samples[prevIdx];
  const p = pushSamples(e);
  if (!p) return;
  // arming: a 10px dip below the gesture's highest point starts the
  // pull-back and the hook needle — from any start, any grip.
  if (!input.armT && input.maxY - input.minY >= 10) {
    input.armT = p.t;
    view.phase = 'pullback';
    view.pull = { startT: input.armT, stats: input.aimStats };
  }
  const rising = input.maxY - p.y > 12;              // the flick is under way — freeze the aim
  if (!rising && prev) {
    /* Tremor accumulator (2026-11-22 real-phone fix #2): raw per-event dx
       used to feed the aim directly, so finger tremor while lining up —
       and worse, while HOLDING the pull-back — ratcheted the ball and the
       angle sideways a fraction at a time (lane mode: 0.030 deg/px), and
       a throw the player aimed straight left crooked before the flick
       even started. Deltas now collect in input.carry and only the part
       past a deadband applies: 2 px while lining up, 7 px once the
       pull-back is armed (the hold is a wind-up — re-aiming there takes
       a deliberate drag, not a tremor). Oscillating tremor cancels inside
       the accumulator instead of accumulating; a steady deliberate drag
       loses nothing, because the unapplied remainder stays in the carry —
       net tracking stays 1:1 with the finger, with no offset. */
    input.carry += p.x - prev.x;
    const band = input.armT ? 7 : 2;
    if (Math.abs(input.carry) >= band) {
      const dx = input.carry;
      input.carry = 0;
      if (input.mode === 'ball') {
        const mPerPx = 0.53 / laneHalfPx(-0.4);
        view.aim.startX = Math.max(-0.45, Math.min(0.45, view.aim.startX + dx * mPerPx));
        view.ball.x = view.aim.startX;
      } else {
        view.aim.angleDeg = Math.max(-8, Math.min(8, view.aim.angleDeg + dx * 0.030));
      }
    }
  }
});
function endPointer(e) {
  if (input.pid !== e.pointerId) return;
  input.pid = null;
  const wasPullback = view.phase === 'pullback';
  try { if (e.clientX !== undefined) pushSamples(e); } catch (err) {}
  view.phase = 'aim'; view.pull = null;
  if (!input.aimResolve) return;
  const th = L.parseThrow(input.samples);
  if (!th) {
    if (wasPullback) setHint('Pull down, then <b>swipe up</b> — the swipe up is the throw.');
    return;
  }
  const t0 = input.armT || (input.samples[0] && input.samples[0].t) || th.from.t;
  const needle = L.needleValue((th.from.t - t0) / 1000, input.aimStats.hookControl);
  const hook = L.effectiveHook(needle, input.aimStats);
  const params = {
    startX: view.aim.startX,
    angleDeg: Math.max(-9, Math.min(9, view.aim.angleDeg + th.errDeg)),
    power: th.power, hook, loft: th.loft,
  };
  if (S.tutorial < 3) { S.tutorial = 3; save(); }
  const res = input.aimResolve; res(params);
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);

/* ================= match end ================= */
function finishMatch() {
  M.over = true; view.phase = 'idle';
  const youT = L.scoreGame(M.you.rolls, M.rackSizes).total;
  const aiT = M.practice ? 0 : L.scoreGame(M.ai.rolls, M.rackSizes).total;
  S.stats.matches++;
  if (youT === 90) { S.stats.perfects++; }
  S.stats.best = Math.max(S.stats.best, youT);
  missionEvent('match', 1);
  if (youT >= 55) missionEvent('score55', 1);
  let head, sub, deltas = '';
  if (M.practice) {
    head = 'PRACTICE DONE';
    sub = `You bowled <b>${youT}</b> of 90. ${youT >= 70 ? 'Pro-level. Take it to a real alley.' : youT >= 50 ? 'Solid — the pocket is findable. Again?' : 'The pocket is between the 1 and 3 pins. Aim small, miss small.'}`;
    AU.sting(youT >= 50);
  } else if (youT > aiT) {
    const pot = M.alley.stake * 2, td = L.trophyDelta(true, M.alleyIdx);
    S.chips += pot; S.trophies += td; S.cases += 1; S.stats.wins++;
    missionEvent('win', 1);
    head = '🏆 YOU WIN'; sub = `${youT} — ${aiT} over ${M.alley.aiName}.`;
    deltas = `Pot <b>+${pot} chips</b> · Trophies <b>+${td}</b> (now ${S.trophies})<br>🎁 <b>+1 case</b> — open it in the Arsenal`;
    AU.sting(true);
  } else if (youT < aiT) {
    const td = L.trophyDelta(false, M.alleyIdx);
    S.trophies = Math.max(0, S.trophies + td);
    head = 'HOUSE TAKES IT';
    sub = `${M.alley.aiName} ${aiT} — you ${youT}. The stake and ${Math.abs(td)} trophies stay with the house.`;
    deltas = `Trophies <b>${td}</b> (now ${S.trophies}) · League: <b>${L.leagueRank(S.trophies)}</b>`;
    AU.sting(false);
  } else {
    S.chips += M.alley.stake;
    head = 'DEAD HEAT';
    sub = `${youT} — ${aiT}. Nobody blinks. Stake refunded.`;
    deltas = `Stake <b>refunded</b> · No trophies move`;
    AU.sting(true);
  }
  if (youT === 90 && !M.practice) { S.cases += 1; deltas += '<br>🌟 <b>PERFECT GAME!</b> Bonus case earned'; }
  save(); refreshTop();
  const card = $('#modalCard');
  card.innerHTML = `<h2>${head}</h2><div class="msub">${sub}</div>
    <div class="deltas">${deltas}</div>
    <div style="text-align:left; margin:10px 0;">${missionListHTML()}</div>
    <div class="menu">
      ${M.practice ? '' : `<button class="bigbtn hot" id="rematchBtn">REMATCH — ${M.alley.stake} CHIPS</button>`}
      <button class="bigbtn" id="toAlleysBtn">${M.practice ? 'PLAY A MATCH' : 'CHANGE ALLEY'}</button>
      <button class="bigbtn" id="toTitleBtn">TITLE</button>
    </div>`;
  $('#modal').classList.add('on');
  const close = () => { $('#modal').classList.remove('on'); rafOn = false; M = null; };
  if (!M.practice) $('#rematchBtn').onclick = () => {
    if (S.chips < M.alley.stake) { toast('Not enough chips for the stake.'); return; }
    const idx = M.alleyIdx; close(); startMatch(idx, false);
  };
  $('#toAlleysBtn').onclick = () => { close(); show('alleys'); };
  $('#toTitleBtn').onclick = () => { close(); show('title'); };
}
$('#quitMatchBtn').onclick = () => {
  if (!M || M.over) { rafOn = false; M = null; show('title'); return; }
  const card = $('#modalCard');
  card.innerHTML = `<h2>QUIT MATCH?</h2><div class="msub">${M.practice ? 'Practice ends — no harm done.' : 'Quitting counts as a loss: the stake stays with the house and trophies drop.'}</div>
    <div class="menu"><button class="bigbtn hot" id="quitYes">QUIT</button><button class="bigbtn" id="quitNo">KEEP BOWLING</button></div>`;
  $('#modal').classList.add('on');
  $('#quitNo').onclick = () => $('#modal').classList.remove('on');
  $('#quitYes').onclick = () => {
    $('#modal').classList.remove('on');
    if (M && !M.practice && !M.over) {
      S.trophies = Math.max(0, S.trophies + L.trophyDelta(false, M.alleyIdx));
      S.stats.matches++; save();
    }
    if (M) M.aborted = true;
    rafOn = false; AU.rumbleStop();
    show('title');
  };
};

/* boot */
refreshTop(); renderTitle();
if ('serviceWorker' in navigator) { /* registered in index.html */ }
