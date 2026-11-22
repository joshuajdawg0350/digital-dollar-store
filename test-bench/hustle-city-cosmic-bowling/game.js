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
  return `background:
    radial-gradient(circle at 34% 30%, rgba(255,255,255,.85) 0 6%, transparent 26%),
    radial-gradient(circle at 62% 64%, ${def.skin.swirl} 0 26%, transparent 58%),
    radial-gradient(circle at 50% 50%, ${def.skin.base} 0 62%, #04050c 130%);
    box-shadow: inset -8px -10px 18px rgba(0,0,0,.6), 0 0 14px ${def.skin.glow}55, 0 4px 12px rgba(0,0,0,.5);`;
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

function makeLaneTexture(hue) {
  const t = document.createElement('canvas'); t.width = 512; t.height = 1024;
  const c = t.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 1024);
  g.addColorStop(0, '#070a1c'); g.addColorStop(0.55, '#0a1030'); g.addColorStop(1, '#0d1440');
  c.fillStyle = g; c.fillRect(0, 0, 512, 1024);
  // nebula swirls projected on the lane
  const blob = (x, y, r, col, a) => { const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col.replace('A', a)); rg.addColorStop(1, col.replace('A', '0')); c.fillStyle = rg; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
  blob(140, 240, 210, `hsla(${hue},95%,62%,A)`, '0.34'); blob(390, 420, 240, 'hsla(315,95%,60%,A)', '0.26');
  blob(200, 700, 260, `hsla(${(hue + 60) % 360},95%,58%,A)`, '0.24'); blob(420, 880, 180, 'hsla(190,100%,60%,A)', '0.28');
  blob(90, 950, 150, 'hsla(280,95%,65%,A)', '0.22');
  // planets on the lane surface (like the real cosmic alleys)
  const planet = (x, y, r, col) => {
    const rg = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,.75)'); rg.addColorStop(0.25, col); rg.addColorStop(1, 'rgba(0,0,10,.0)');
    c.fillStyle = rg; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  };
  planet(400, 180, 34, 'hsla(28,90%,58%,.55)'); planet(96, 560, 26, 'hsla(160,80%,55%,.5)'); planet(330, 1010, 40, 'hsla(200,95%,62%,.5)');
  // stars
  for (let i = 0; i < 260; i++) {
    c.fillStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.5})`;
    const r = Math.random() * 1.6 + 0.4;
    c.beginPath(); c.arc(Math.random() * 512, Math.random() * 1024, r, 0, 7); c.fill();
  }
  // boards
  for (let i = 0; i <= 39; i++) {
    c.fillStyle = i % 2 ? 'rgba(120,170,255,.05)' : 'rgba(0,0,0,.10)';
    c.fillRect(i * 512 / 39, 0, 512 / 39, 1024);
  }
  c.fillStyle = 'rgba(140,190,255,.16)';
  for (let i = 0; i <= 39; i += 5) c.fillRect(i * 512 / 39, 0, 1.4, 1024);
  // range-finder arrows (texture v: 0 = far/pins end, 1024 = foul line end)
  c.fillStyle = 'rgba(160,210,255,.5)';
  const arrow = (bx, vz) => { c.beginPath(); c.moveTo(bx - 7, vz); c.lineTo(bx + 7, vz); c.lineTo(bx, vz + 26); c.closePath(); c.fill(); };
  [64, 128, 192, 256, 320, 384, 448].forEach((bx, i) => arrow(bx, 700 - Math.abs(3 - i) * 22));
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
function drawPinShape(c, hgt, fallen, fallA) {
  const wdt = hgt * 0.36;
  c.save();
  if (fallen) { c.rotate(fallA); c.translate(0, -hgt * 0.1); }
  const grad = c.createLinearGradient(-wdt, 0, wdt, 0);
  grad.addColorStop(0, '#aebadd'); grad.addColorStop(0.32, '#ffffff'); grad.addColorStop(0.62, '#dfe8ff'); grad.addColorStop(1, '#8fa0c8');
  c.fillStyle = grad;
  c.beginPath();
  c.moveTo(-wdt * 0.52, 0);
  c.bezierCurveTo(-wdt * 0.58, -hgt * 0.30, -wdt * 0.30, -hgt * 0.42, -wdt * 0.21, -hgt * 0.60);
  c.bezierCurveTo(-wdt * 0.13, -hgt * 0.72, -wdt * 0.30, -hgt * 0.78, -wdt * 0.27, -hgt * 0.90);
  c.bezierCurveTo(-wdt * 0.24, -hgt * 1.0, wdt * 0.24, -hgt * 1.0, wdt * 0.27, -hgt * 0.90);
  c.bezierCurveTo(wdt * 0.30, -hgt * 0.78, wdt * 0.13, -hgt * 0.72, wdt * 0.21, -hgt * 0.60);
  c.bezierCurveTo(wdt * 0.30, -hgt * 0.42, wdt * 0.58, -hgt * 0.30, wdt * 0.52, 0);
  c.closePath(); c.fill();
  if (!fallen) { // chrome-blue neck stripes under UV
    c.fillStyle = '#38b6ff';
    c.fillRect(-wdt * 0.235, -hgt * 0.70, wdt * 0.47, hgt * 0.045);
    c.fillRect(-wdt * 0.245, -hgt * 0.635, wdt * 0.49, hgt * 0.045);
  }
  c.restore();
}
function drawBallShape(c, px, py, r, def, dist, airborne) {
  c.save();
  if (airborne) { c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(px, py + r * 0.4, r * 0.9, r * 0.32, 0, 0, 7); c.fill(); c.translate(0, -r * 0.55); }
  c.shadowColor = def.skin.glow; c.shadowBlur = 20;
  const g = c.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.1, px, py, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.22, def.skin.base); g.addColorStop(0.75, def.skin.swirl); g.addColorStop(1, '#02030a');
  c.fillStyle = g; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = def.skin.glow; c.globalAlpha = 0.75; c.lineWidth = Math.max(1.4, r * 0.07);
  c.beginPath(); c.arc(px, py, r * 0.62, dist * 2.2, dist * 2.2 + 4.4); c.stroke();
  c.globalAlpha = 0.5; c.beginPath(); c.arc(px, py, r * 0.34, -dist * 3.1, -dist * 3.1 + 3.6); c.stroke();
  c.globalAlpha = 1;
  c.fillStyle = 'rgba(255,255,255,.9)';
  c.beginPath(); c.arc(px - r * 0.34, py - r * 0.4, r * 0.10, 0, 7); c.fill();
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
  // lane surface in perspective strips
  if (laneTex) {
    const strips = 56, z0 = -1.0, z1 = 20.6;
    for (let i = 0; i < strips; i++) {
      const za = z0 + (z1 - z0) * i / strips, zb = z0 + (z1 - z0) * (i + 1) / strips;
      const pa = proj(0, za), pb = proj(0, zb);
      const wa = laneHalfPx(za) / 0.53, wb = laneHalfPx(zb) / 0.53;
      const va = (1 - (za + 1) / 21.6) * 1024, vb = (1 - (zb + 1) / 21.6) * 1024;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pa.x - 0.53 * wa, pa.y); ctx.lineTo(pa.x + 0.53 * wa, pa.y);
      ctx.lineTo(pb.x + 0.53 * wb, pb.y); ctx.lineTo(pb.x - 0.53 * wb, pb.y);
      ctx.closePath(); ctx.clip();
      ctx.drawImage(laneTex, 0, vb, 512, Math.max(1, va - vb), pa.x - 0.53 * wa, pb.y - 1, 0.53 * wa + 0.53 * wb, (pa.y - pb.y) + 2);
      ctx.restore();
    }
    // gutters
    for (const sgn of [-1, 1]) {
      const p1 = proj(sgn * 0.545, -1), p2 = proj(sgn * 0.545, 20.2), p3 = proj(sgn * 0.70, 20.2), p4 = proj(sgn * 0.70, -1);
      ctx.fillStyle = '#0a0e22';
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(56,182,255,.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
  }
  // disco light spots sweeping
  ctx.save(); ctx.globalCompositeOperation = 'screen';
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
  // pins (far to near)
  const pinsSorted = [...view.pins].sort((a, b) => b.z - a.z);
  for (const p of pinsSorted) {
    if (p.gone && p.down) continue;
    const pr = proj(p.x, p.z), hgt = 0.717 * laneHalfPx(p.z) * 2 * 0.5 + 6;
    const pinH = (0.38 / 1.06) * (2 * laneHalfPx(p.z));
    ctx.save();
    ctx.translate(pr.x, pr.y);
    ctx.shadowColor = 'rgba(190,140,255,.8)'; ctx.shadowBlur = p.down ? 0 : 9;
    if (p.down) { ctx.globalAlpha = 0.92; drawPinShape(ctx, pinH, true, (p.renderFall || 0.8)); }
    else drawPinShape(ctx, pinH, false, 0);
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
  // ball
  if (view.ball) {
    const b = view.ball, pr = proj(b.x, b.z);
    const r = Math.max(2.2, L.LANE.ballR * (laneHalfPx(b.z) / 0.53));
    drawBallShape(ctx, pr.x, pr.y, r, b.def, b.dist || 0, b.airborne);
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
        if (p) { p.renderFall = Math.atan2(p.vx, p.vz) + Math.PI / 2; spawnParticles(p.x, p.z, 5, '#b18cff', 0.16); }
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

/* ================= aim phase (human input) ================= */
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

const input = { mode: null, pid: null, lastX: 0, lastY: 0, startPX: 0, startPY: 0, samples: [], pullStartT: 0, aimResolve: null, aimStats: null, aimDef: null };
function canvasPos(e) {
  const r = cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
cv.addEventListener('pointerdown', e => {
  AU.ensure();
  if (rollAnim.active && rollAnim.side === 'ai') { rollAnim.scale = 2.8; return; }
  if (view.phase !== 'aim' || !view.aim) return;
  const p = canvasPos(e);
  const bp = proj(view.aim.startX, -0.4);
  input.pid = e.pointerId; input.lastX = p.x; input.lastY = p.y;
  input.startPX = p.x; input.startPY = p.y;
  input.mode = Math.hypot(p.x - bp.x, p.y - bp.y) < 72 ? 'maybe' : 'rotate';
  input.samples = [{ x: p.x, y: p.y, t: performance.now() }];
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', e => {
  if (input.pid !== e.pointerId || !input.mode || !view.aim) return;
  const p = canvasPos(e);
  const dx = p.x - input.lastX, dy = p.y - input.lastY;
  const cumDx = p.x - input.startPX, cumDy = p.y - input.startPY;
  if (input.mode === 'maybe') {
    if (cumDy > 20) { input.mode = 'pullback'; input.pullStartT = performance.now(); view.phase = 'pullback'; view.pull = { startT: input.pullStartT, stats: input.aimStats }; }
    else if (Math.abs(cumDx) > 8) input.mode = 'position';
  } else if (input.mode === 'position' && cumDy > 34) {
    // slid into a pull-back from a positioning drag — same throw gesture
    input.mode = 'pullback'; input.pullStartT = performance.now(); view.phase = 'pullback'; view.pull = { startT: input.pullStartT, stats: input.aimStats };
  }
  if (input.mode === 'position') {
    const mPerPx = 0.53 / laneHalfPx(-0.4);
    view.aim.startX = Math.max(-0.45, Math.min(0.45, view.aim.startX + dx * mPerPx));
    view.ball.x = view.aim.startX;
  } else if (input.mode === 'rotate') {
    view.aim.angleDeg = Math.max(-8, Math.min(8, view.aim.angleDeg + dx * 0.030));
  } else if (input.mode === 'pullback') {
    input.samples.push({ x: p.x, y: p.y, t: performance.now() });
    if (input.samples.length > 90) input.samples.shift();
  }
  input.lastX = p.x; input.lastY = p.y;
});
function endPointer(e) {
  if (input.pid !== e.pointerId) return;
  const mode = input.mode; input.mode = null; input.pid = null;
  if (mode !== 'pullback' || !input.aimResolve) { if (view.phase === 'pullback') view.phase = 'aim'; return; }
  const p = canvasPos(e);
  input.samples.push({ x: p.x, y: p.y, t: performance.now() });
  const flick = L.parseFlick(input.samples);
  view.phase = 'aim'; view.pull = null;
  if (!flick) { setHint('That was a drag, not a throw — pull down, hold, then <b>swipe up fast</b>.'); return; }
  const needle = L.needleValue(((flick.from ? flick.from.t : performance.now()) - input.pullStartT) / 1000, input.aimStats.hookControl);
  const hook = L.effectiveHook(needle, input.aimStats);
  const params = {
    startX: view.aim.startX,
    angleDeg: Math.max(-9, Math.min(9, view.aim.angleDeg + flick.errDeg)),
    power: flick.power, hook, loft: flick.loft,
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
