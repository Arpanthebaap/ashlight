/* ==========================================================================
   ASHLIGHT — Operation Lastlight
   Config-driven so new systems / ship types / event types can be added
   without touching the simulation logic. Built with the Evolution
   Challenge in mind from hour one.
   ========================================================================== */

// ---------------- CONFIG ----------------

const SYSTEMS = [
  { id: 'beacon',     label: 'BEACON',     color: '#ff8c42', min: 0, max: 100, step: 10,
    desc: 'Guides ships along the safe path. Low power stalls their progress.' },
  { id: 'shield',     label: 'SHIELD',     color: '#2dd4bf', min: 0, max: 100, step: 10,
    desc: 'Absorbs flare damage. Low power lets hull damage through.' },
  { id: 'stabilizer', label: 'STABILIZER', color: '#ffcf9e', min: 0, max: 100, step: 10,
    desc: 'Slows Luminance decay. Low power drains the station faster.' },
];

const SHIP_NAMES = ['DRIFT-01', 'DRIFT-02', 'DRIFT-03'];

const EVENT_TYPES = [
  {
    type: 'distress', tag: 'DISTRESS SIGNAL', severity: 'critical',
    title: (s) => `Distress signal — ${s.name}`,
    desc: (s) => `${s.name} reports engine strain and is falling behind the convoy formation.`,
    choices: [
      { label: 'Divert power to their engines', sub: '+15 progress · −8 Luminance',
        apply: (state, s) => { s.progress += 15; state.luminance -= 8; return `${s.name} surges forward on emergency power.`; } },
      { label: 'Hold formation, let them catch up', sub: 'safer on power · risks their hull',
        apply: (state, s) => { s.hull -= 10; return `${s.name} limps along under their own power.`; } },
    ],
    timeoutChoice: 1,
  },
  {
    type: 'flare', tag: 'STELLAR FLARE', severity: 'warn',
    title: () => 'Stellar flare burst incoming',
    desc: () => 'Ember Vel is venting a flare pulse toward the corridor. All in-transit ships are exposed.',
    choices: [
      { label: 'Reroute power to Shield', sub: 'reduces damage · −6 Luminance',
        apply: (state) => {
          const mitig = state.power.shield / 100;
          state.luminance -= 6;
          state.ships.forEach(s => { if (s.status !== 'through') s.hull -= Math.round(6 * (1 - mitig)); });
          return 'Shield flexes to absorb the worst of it.';
        } },
      { label: 'Ride it out', sub: 'saves Luminance · full exposure',
        apply: (state) => {
          const mitig = state.power.shield / 100;
          state.ships.forEach(s => { if (s.status !== 'through') s.hull -= Math.round(18 * (1 - mitig)); });
          return 'The flare washes over the convoy unshielded.';
        } },
    ],
    timeoutChoice: 1,
  },
  {
    type: 'debris', tag: 'WAYLINE ANOMALY', severity: 'warn',
    title: (s) => `Debris field near ${s.name}`,
    desc: (s) => `Drifting wreckage has entered ${s.name}'s path. Manual reroute or trust the Beacon to compensate.`,
    choices: [
      { label: 'Manually reroute their course', sub: '+5 progress · −4 Luminance',
        apply: (state, s) => { s.progress += 5; state.luminance -= 4; return `${s.name} threads the debris on manual control.`; } },
      { label: 'Let the Beacon handle it', sub: 'free · may stall their progress',
        apply: (state, s) => { s.stalled = 2; return `${s.name} slows to navigate the field automatically.`; } },
    ],
    timeoutChoice: 1,
  },
];

const KEEPER_LINES = {
  start: "Log start. Ember Vel is dimming faster than the charts predicted. Three ships, one corridor, no backup coming.",
  firstEvent: "First real test of the watch. Steady hands.",
  shipThrough: (s) => `${s.name} clears the corridor. One less light to keep.`,
  lowLuminance: "Luminance under 30%. Every allocation from here on is a choice about what we're willing to lose.",
  allThrough: "All three ships through. Ember Vel can rest now. So can I.",
  luminanceZero: "The light is gone. Whatever's still out there in the dark — I couldn't reach them in time.",
};

const TICK_MS = 1000;
const BASE_DECAY = 0.9;
const MODAL_TIMEOUT_MS = 12000;
const EVENT_MIN_GAP = 7; // ticks
const EVENT_CHANCE = 0.22; // per tick after min gap

// ---------------- STATE ----------------

let state = null;
let tickTimer = null;
let modalTimer = null;
let audioCtx = null, oscNodes = null, soundOn = false;

function freshState() {
  return {
    luminance: 100,
    power: { beacon: 40, shield: 30, stabilizer: 30 },
    elapsedTicks: 0,
    ticksSinceEvent: 0,
    ships: SHIP_NAMES.map((name, i) => ({
      id: 'ship-' + i,
      name,
      progress: 0,           // 0 -> 100
      hull: 100,
      status: 'ok',          // ok | warn | distress | through | lost
      stalled: 0,
      angleOffset: (i / SHIP_NAMES.length) * Math.PI * 2,
      angularDrift: 0.05 + Math.random() * 0.03,
    })),
    activeModal: null,
    ended: false,
    log: [],
  };
}

// ---------------- INIT ----------------

document.addEventListener('DOMContentLoaded', () => {
  buildPowerDials();
  document.getElementById('boot-start').addEventListener('click', startMission);
  document.getElementById('restart-btn').addEventListener('click', () => location.reload());
  document.getElementById('sound-toggle').addEventListener('click', toggleSound);
  bootLog();
});

function bootLog() {
  const lines = [
    'Establishing relay link…',
    'Syncing Wayline telemetry…',
    'Reading Ember Vel decay curve…',
    'Station Ashlight-7 online.',
  ];
  const el = document.getElementById('boot-log');
  let i = 0;
  el.textContent = lines[0];
  const iv = setInterval(() => {
    i++;
    if (i >= lines.length) { clearInterval(iv); return; }
    el.textContent = lines[i];
  }, 650);
}

function startMission() {
  document.getElementById('boot-screen').classList.add('hidden');
  document.getElementById('console').classList.remove('hidden');
  state = freshState();
  renderAll();
  pushLog(KEEPER_LINES.start, 'keeper');
  tickTimer = setInterval(tick, TICK_MS);
}

// ---------------- POWER DIALS ----------------

function buildPowerDials() {
  const wrap = document.getElementById('power-dials');
  wrap.innerHTML = '';
  SYSTEMS.forEach(sys => {
    const row = document.createElement('div');
    row.className = 'dial-row';
    row.innerHTML = `
      <svg class="dial-svg" width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="21" fill="none" stroke="${sys.color}" stroke-width="5" opacity="0.2"/>
        <circle id="ring-${sys.id}" cx="26" cy="26" r="21" fill="none" stroke="${sys.color}" stroke-width="5"
          stroke-linecap="round" transform="rotate(-90 26 26)" stroke-dasharray="0 132"/>
      </svg>
      <div class="dial-info">
        <div class="dial-label" style="color:${sys.color}">${sys.label}</div>
        <div class="dial-pct"><span id="pct-${sys.id}">0</span>%</div>
        <div class="dial-controls">
          <button class="dial-btn" data-sys="${sys.id}" data-dir="-1">−</button>
          <button class="dial-btn" data-sys="${sys.id}" data-dir="1">+</button>
        </div>
      </div>
    `;
    wrap.appendChild(row);
  });
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.dial-btn');
    if (!btn || !state || state.ended) return;
    adjustPower(btn.dataset.sys, parseInt(btn.dataset.dir, 10));
  });
}

function adjustPower(sysId, dir) {
  const sys = SYSTEMS.find(s => s.id === sysId);
  const current = state.power[sysId];
  const total = totalPower();
  if (dir > 0 && total >= 100) return; // pool full
  const next = Math.min(sys.max, Math.max(sys.min, current + dir * sys.step));
  state.power[sysId] = next;
  renderPower();
}

function totalPower() {
  return SYSTEMS.reduce((sum, s) => sum + state.power[s.id], 0);
}

function renderPower() {
  SYSTEMS.forEach(sys => {
    const val = state.power[sys.id];
    document.getElementById('pct-' + sys.id).textContent = val;
    const ring = document.getElementById('ring-' + sys.id);
    const circumference = 2 * Math.PI * 21;
    const filled = (val / 100) * circumference;
    ring.setAttribute('stroke-dasharray', `${filled} ${circumference}`);
  });
  const total = totalPower();
  document.getElementById('power-total-val').textContent = total;
  const warnEl = document.getElementById('power-warn');
  warnEl.textContent = total < 70 ? '⚠ UNDERPOWERED' : '';
}

// ---------------- TICK / SIMULATION ----------------

function tick() {
  if (!state || state.ended) return;
  state.elapsedTicks++;
  state.ticksSinceEvent++;

  // Luminance decay
  const stabBonus = (state.power.stabilizer / 100) * 0.6;
  const underpowerPenalty = totalPower() < 70 ? 0.4 : 0;
  state.luminance -= (BASE_DECAY - stabBonus + underpowerPenalty);
  state.luminance = Math.max(0, state.luminance);

  // Ship progress
  const beaconRate = 0.5 + (state.power.beacon / 100) * 1.8;
  state.ships.forEach(s => {
    if (s.status === 'through' || s.status === 'lost') return;
    if (s.stalled > 0) { s.stalled--; return; }
    s.progress = Math.min(100, s.progress + beaconRate);
    s.hull = Math.max(0, s.hull);
    if (s.progress >= 100) {
      s.status = 'through';
      pushLog(`${s.name} has cleared the Wayline corridor.`, 'ok');
      pushLog(KEEPER_LINES.shipThrough(s), 'keeper');
    } else if (s.hull <= 25) {
      s.status = 'distress';
    } else if (s.hull <= 55) {
      s.status = 'warn';
    } else {
      s.status = 'ok';
    }
  });

  // Random events
  if (!state.activeModal && state.ticksSinceEvent >= EVENT_MIN_GAP && Math.random() < EVENT_CHANCE) {
    maybeSpawnEvent();
  }

  // Keeper commentary thresholds
  if (state.luminance <= 30 && !state._lowWarned) {
    state._lowWarned = true;
    pushLog(KEEPER_LINES.lowLuminance, 'keeper');
  }

  checkEndConditions();
  renderAll();
}

function maybeSpawnEvent() {
  const candidates = state.ships.filter(s => s.status !== 'through' && s.status !== 'lost');
  if (candidates.length === 0) return;
  const evType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  const ship = candidates[Math.floor(Math.random() * candidates.length)];
  state.ticksSinceEvent = 0;
  openModal(evType, ship);
  if (!state._firstEventLogged) {
    state._firstEventLogged = true;
    pushLog(KEEPER_LINES.firstEvent, 'keeper');
  }
}

function checkEndConditions() {
  const allThrough = state.ships.every(s => s.status === 'through');
  if (allThrough) {
    endMission(true);
    return;
  }
  if (state.luminance <= 0) {
    endMission(false);
  }
}

// ---------------- MODAL ----------------

function openModal(evType, ship) {
  state.activeModal = { evType, ship };
  const overlay = document.getElementById('modal-overlay');
  const tagEl = document.getElementById('modal-tag');
  const titleEl = document.getElementById('modal-title');
  const descEl = document.getElementById('modal-desc');
  const choicesEl = document.getElementById('modal-choices');

  tagEl.textContent = evType.tag;
  tagEl.style.color = evType.severity === 'critical' ? 'var(--critical)' : 'var(--ember)';
  titleEl.textContent = evType.title(ship);
  descEl.textContent = evType.desc(ship);
  pushLog(`${evType.tag} — ${evType.title(ship)}`, evType.severity);

  choicesEl.innerHTML = '';
  evType.choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.className = 'modal-choice-btn';
    btn.innerHTML = `${choice.label}<span class="modal-choice-sub">${choice.sub}</span>`;
    btn.addEventListener('click', () => resolveModal(idx));
    choicesEl.appendChild(btn);
  });

  overlay.classList.remove('hidden');

  const bar = document.getElementById('modal-timer-bar');
  bar.style.transition = 'none';
  bar.style.width = '100%';
  requestAnimationFrame(() => {
    bar.style.transition = `width ${MODAL_TIMEOUT_MS}ms linear`;
    bar.style.width = '0%';
  });
  modalTimer = setTimeout(() => resolveModal(evType.timeoutChoice, true), MODAL_TIMEOUT_MS);
}

function resolveModal(choiceIdx, timedOut) {
  if (!state.activeModal) return;
  clearTimeout(modalTimer);
  const { evType, ship } = state.activeModal;
  const choice = evType.choices[choiceIdx];
  const resultLine = choice.apply(state, ship);
  pushLog((timedOut ? '[auto-resolved] ' : '') + resultLine, timedOut ? 'warn' : 'ok');
  ship.hull = Math.max(0, Math.min(100, ship.hull));
  state.luminance = Math.max(0, Math.min(100, state.luminance));
  state.activeModal = null;
  document.getElementById('modal-overlay').classList.add('hidden');
  renderAll();
  checkEndConditions();
}

// ---------------- END STATES ----------------

function endMission(won) {
  state.ended = true;
  clearInterval(tickTimer);
  clearTimeout(modalTimer);
  pushLog(won ? KEEPER_LINES.allThrough : KEEPER_LINES.luminanceZero, 'keeper');

  const overlay = document.getElementById('end-screen');
  const icon = document.getElementById('end-icon');
  const title = document.getElementById('end-title');
  const desc = document.getElementById('end-desc');
  const stats = document.getElementById('end-stats');

  const through = state.ships.filter(s => s.status === 'through').length;
  const time = formatClock(state.elapsedTicks);

  if (won) {
    icon.textContent = '✦';
    icon.style.color = 'var(--teal)';
    title.textContent = 'FLEET THROUGH';
    desc.textContent = 'All three convoy ships cleared the Wayline corridor. Ember Vel holds, for now.';
  } else {
    icon.textContent = '☾';
    icon.style.color = 'var(--critical)';
    title.textContent = 'LUMINANCE LOST';
    desc.textContent = 'Ember Vel went dark before the fleet could clear the corridor.';
  }
  stats.innerHTML = `
    <div>SHIPS THROUGH: ${through} / ${SHIP_NAMES.length}</div>
    <div>MISSION TIME: ${time}</div>
    <div>FINAL LUMINANCE: ${Math.round(state.luminance)}%</div>
  `;
  overlay.classList.remove('hidden');
}

// ---------------- RENDER ----------------

function renderAll() {
  if (!state) return;
  renderHeader();
  renderPower();
  renderStarmap();
  renderConvoy();
  renderFeed();
}

function renderHeader() {
  const lum = Math.round(state.luminance);
  document.getElementById('luminance-num').textContent = lum;
  const bar = document.getElementById('luminance-bar');
  bar.style.width = lum + '%';
  bar.style.background = lum < 30
    ? 'linear-gradient(90deg,#f87171,#ff8c42)'
    : 'linear-gradient(90deg, var(--ember), #ffcf7a)';

  document.getElementById('clock').textContent = formatClock(state.elapsedTicks);

  // star dims as luminance falls
  const t = lum / 100;
  document.getElementById('star-outer').setAttribute('opacity', 0.4 + 0.6 * t);
  document.getElementById('star-mid').setAttribute('opacity', 0.3 + 0.7 * t);
  document.getElementById('star-core').setAttribute('opacity', 0.2 + 0.8 * t);
}

function renderStarmap() {
  const layer = document.getElementById('ships-layer');
  layer.innerHTML = '';
  const cx = 200, cy = 200;
  state.ships.forEach(s => {
    if (s.status === 'through') return;
    const radius = 180 - (s.progress / 100) * 155;
    const angle = s.angleOffset + state.elapsedTicks * s.angularDrift * 0.05;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    const cls = s.status === 'distress' ? 'distress' : (s.status === 'warn' ? 'warn' : '');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'ship-icon');
    g.innerHTML = `
      <circle cx="${x}" cy="${y}" r="6" class="ship-dot ${cls}"/>
      <text x="${x + 9}" y="${y + 3}" class="ship-label">${s.name}</text>
    `;
    layer.appendChild(g);
  });
}

function renderConvoy() {
  const strip = document.getElementById('convoy-strip');
  strip.innerHTML = '';
  state.ships.forEach(s => {
    const card = document.createElement('div');
    card.className = 'ship-card ' + (s.status === 'distress' ? 'distress' : '') + (s.status === 'through' ? ' through' : '');
    const statusLabel = { ok: 'NOMINAL', warn: 'WARNING', distress: 'DISTRESS', through: 'THROUGH' }[s.status];
    card.innerHTML = `
      <div class="ship-card-top">
        <div class="ship-name">${s.name}</div>
        <div class="ship-status ${s.status}">${statusLabel}</div>
      </div>
      <div class="ship-meta">
        <span>PROGRESS: ${Math.round(s.progress)}%</span>
        <span>HULL: ${Math.round(s.hull)}%</span>
      </div>
      <div class="hull-bar-wrap"><div class="hull-bar" style="width:${Math.max(0,s.hull)}%; background:${s.hull < 30 ? 'linear-gradient(90deg,#f87171,#ff8c42)' : ''}"></div></div>
    `;
    strip.appendChild(card);
  });
}

function renderFeed() {
  const feed = document.getElementById('event-feed');
  feed.innerHTML = '';
  state.log.filter(l => l.kind !== 'keeper').slice(-14).reverse().forEach(entry => {
    const div = document.createElement('div');
    div.className = 'event-item ' + (entry.kind === 'critical' ? 'critical' : entry.kind === 'warn' ? 'warn' : '');
    div.innerHTML = `<span class="event-time">${entry.time}</span>${entry.text}`;
    feed.appendChild(div);
  });

  const keeper = document.getElementById('keeper-log');
  keeper.innerHTML = '';
  state.log.filter(l => l.kind === 'keeper').slice(-5).forEach(entry => {
    const div = document.createElement('div');
    div.className = 'keeper-line';
    div.textContent = '"' + entry.text + '"';
    keeper.appendChild(div);
  });
  keeper.scrollTop = keeper.scrollHeight;
}

function pushLog(text, kind) {
  state.log.push({ text, kind, time: formatClock(state.elapsedTicks) });
}

function formatClock(ticks) {
  const totalSec = ticks;
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ---------------- AMBIENT SOUND (optional, no audio files needed) ----------------

function toggleSound() {
  soundOn = !soundOn;
  const btn = document.getElementById('sound-toggle');
  btn.classList.toggle('active', soundOn);
  btn.textContent = soundOn ? '🔊 SOUND' : '🔈 SOUND';
  if (soundOn) startHum(); else stopHum();
}

function startHum() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc1.type = 'sine'; osc1.frequency.value = 55;
    osc2.type = 'sine'; osc2.frequency.value = 82.5;
    gain.gain.value = 0.025;
    osc1.connect(gain); osc2.connect(gain); gain.connect(audioCtx.destination);
    osc1.start(); osc2.start();
    oscNodes = { osc1, osc2, gain };
  } catch (e) { /* audio unsupported, fail silently */ }
}

function stopHum() {
  if (oscNodes) {
    oscNodes.osc1.stop(); oscNodes.osc2.stop();
    oscNodes = null;
  }
}
