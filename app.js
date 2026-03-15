// ── STORAGE ────────────────────────────────────────────────────
const LS = {
  g: k => { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } },
  gO: (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)) } catch { return d } },
  s: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
};

// ── STATE ───────────────────────────────────────────────────────
let habits   = LS.g('kp_habits');
let goals    = LS.g('kp_goals');
let workouts = LS.g('kp_workouts');
let hlog     = LS.gO('kp_hlog', {});
let arts     = LS.g('kp_arts');
let meds     = LS.g('kp_meds');
let crss     = LS.g('kp_crss');
let confs    = LS.g('kp_confs');
let apps     = LS.g('kp_apps');
let calEvs   = LS.g('kp_cal');

let eCrsIdx = null, eAppIdx = null;
let medF = 'all', appF = 'all';
let calWeekOffset = 0;
let selDay = null;
let selCat = 'workout';

const TODAY = new Date().toISOString().split('T')[0];

// ── CONSTANTS ───────────────────────────────────────────────────
const NEWS_API_KEY = '64515b9dc47049cab14c2b5768692f63'; // Replace with your NewsAPI.org key

const WI = { elliptical:'🔵', run:'🏃', incline:'⛰️', stairs:'🪜', pump:'🏋️', sculpt:'💪', reformer:'🧘', matpilates:'🌸', barre:'🩰' };
const WN = { elliptical:'Elliptical', run:'Run', incline:'Incline Walk', stairs:'Stair Master', pump:'Body Pump', sculpt:'Sculpt', reformer:'Reformer Pilates', matpilates:'Mat Pilates', barre:'Barre' };
const WBG = { elliptical:'rgba(139,92,246,.1)', run:'rgba(16,185,129,.1)', incline:'rgba(245,158,11,.1)', stairs:'rgba(244,114,182,.1)', pump:'rgba(168,85,247,.1)', sculpt:'rgba(192,38,160,.1)', reformer:'rgba(186,104,200,.1)', matpilates:'rgba(244,114,182,.1)', barre:'rgba(168,85,247,.1)' };
const GCLS = { career:'p-career', learning:'p-learning', health:'p-health', research:'p-research', personal:'p-personal' };
const TLBLS = { science:'Science', business:'Business', health:'Health', tech:'Tech', pharma:'Pharma', aitech:'AI & Biotech', general:'General', conference:'Conference', clinical:'Clinical', biotech:'Biotech', bizdev:'BD/VC' };
const TPILL = { science:'p-sci', business:'p-bus', health:'p-hlth', tech:'p-tech', pharma:'p-pha', aitech:'p-ai', general:'p-gen', conference:'p-conf', clinical:'p-clin', biotech:'p-bio', bizdev:'p-bd' };
const SLBL = { applied:'Applied', interview:'Interview', offer:'Offer 🎉', rejected:'Rejected' };
const SCLS = { applied:'s-applied', interview:'s-interview', offer:'s-offer', rejected:'s-rejected' };
const CAT_COLORS = { workout:'#8b5cf6', social:'#ec4899', work:'#3b82f6', personal:'#10b981', other:'#f59e0b' };
const HOURS_DISPLAY = ['6 AM','7 AM','8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM','10 PM'];
const HOUR_VALS = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
const CAL_DN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ── HELPERS ─────────────────────────────────────────────────────
const v   = id => document.getElementById(id)?.value.trim() || '';
const sv  = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
const el  = id => document.getElementById(id);
const tH  = t => `<span class="pill ${TPILL[t] || 'p-gen'}">${TLBLS[t] || t}</span>`;
const fD  = s => { if (!s) return ''; return new Date(s + 'T12:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); };
const fDL = s => { if (!s) return ''; return new Date(s + 'T12:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }); };
const fmt12 = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`; };

// ── INIT ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  el('hdate').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  initTabs();
  initModals();
  initCatChips();
  renderHabits(); renderGoals(); renderWorkouts();
  renderCalendar(); selectDay(TODAY);
  renderArts(); renderMeds(); renderCrss(); renderConfs(); renderApps();
  updCounts(); updStreak();
  fetchNews();
});

// ── TABS ────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    const section = b.closest('.tabs').dataset.section;
    document.querySelectorAll(`.tabs[data-section="${section}"] .tab`).forEach(x => x.classList.remove('active'));
    document.querySelectorAll(`.panels[data-section="${section}"] .panel`).forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    el('p-' + b.dataset.t)?.classList.add('active');
  }));
}

// ── MODALS ──────────────────────────────────────────────────────
function initModals() {
  const ov = el('ov');
  ov.addEventListener('click', () => {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    ov.classList.remove('open');
  });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeM(b.dataset.close)));
}
function openM(id) { el('ov').classList.add('open'); el(id)?.classList.add('open'); }
function closeM(id) { el('ov').classList.remove('open'); el(id)?.classList.remove('open'); }

// ── CAT CHIPS (modal) ───────────────────────────────────────────
function initCatChips() {
  document.querySelectorAll('.cat-chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.cat-chip').forEach(x => x.classList.remove('sel'));
    c.classList.add('sel');
    selCat = c.dataset.cat;
  }));
}
function chips(pid) { return [...document.querySelectorAll('#' + pid + ' .tchip.sel')].map(c => c.dataset.v); }
function resetChips(pid) { document.querySelectorAll('#' + pid + ' .tchip').forEach(c => c.classList.remove('sel')); }

// ── COUNTS & STREAK ─────────────────────────────────────────────
function updCounts() {
  el('cnt-med').textContent  = meds.length;
  el('cnt-crs').textContent  = crss.length;
  el('cnt-conf').textContent = confs.length;
  el('cnt-apps').textContent = apps.length;
}
function updStreak() {
  let s = 0, d = new Date();
  for (let i = 0; i < 365; i++) {
    const k = d.toISOString().split('T')[0];
    if (habits.length && habits.some(h => (hlog[h.id] || []).includes(k))) { s++; } else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  el('sbadge').textContent = `✦ ${s} day streak`;
}

// ══════════════════════════════════════════════════════════════
// SECTION 1 — PERSONAL
// ══════════════════════════════════════════════════════════════

// ── HABITS ──────────────────────────────────────────────────────
el('btn-habit').addEventListener('click', () => openM('m-habit'));
el('sv-habit').addEventListener('click', () => {
  const n = v('hb-n'); if (!n) return;
  habits.push({ id: Date.now(), name: n, emoji: el('hb-e').value.trim() || '🌸' });
  LS.s('kp_habits', habits); renderHabits(); sv('hb-n',''); sv('hb-e',''); closeM('m-habit');
});
window.toggleH = hid => {
  const l = hlog[hid] || [];
  hlog[hid] = l.includes(TODAY) ? l.filter(d => d !== TODAY) : [...l, TODAY];
  LS.s('kp_hlog', hlog); renderHabits(); updStreak();
};
window.dHabit = i => { habits.splice(i, 1); LS.s('kp_habits', habits); renderHabits(); };
function hStr(hid) {
  const l = hlog[hid] || []; let s = 0, d = new Date();
  for (let i = 0; i < 365; i++) { const k = d.toISOString().split('T')[0]; if (l.includes(k)) { s++; } else if (i > 0) break; d.setDate(d.getDate() - 1); }
  return s;
}
function renderHabits() {
  const wrap = el('habit-list');
  if (!habits.length) { wrap.innerHTML = '<div class="empty">No habits yet — add one to start your streak</div>'; return; }
  const DN = ['S','M','T','W','T','F','S'], l7 = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); l7.push(d.toISOString().split('T')[0]); }
  wrap.innerHTML = habits.map((h, i) => {
    const l = hlog[h.id] || [], done = l.includes(TODAY), s = hStr(h.id);
    const days = l7.map(d => `<div class="hd${l.includes(d) ? ' done' : ''}${d === TODAY ? ' today' : ''}">${DN[new Date(d + 'T12:00').getDay()]}</div>`).join('');
    return `<div class="glass hcard"><div class="hcheck${done ? ' done' : ''}" onclick="toggleH(${h.id})">${done ? '✓' : ''}</div><div class="hinfo"><div class="hname">${h.emoji} ${h.name}</div><div class="hstr">${s > 0 ? `✦ ${s} day streak` : 'start your streak today'}</div></div><div class="hdays">${days}</div><button class="btn btn-d" style="margin-left:8px;flex-shrink:0;padding:2px 9px;font-size:15px" onclick="dHabit(${i})">×</button></div>`;
  }).join('');
}

// ── GOALS ────────────────────────────────────────────────────────
el('btn-goal').addEventListener('click', () => openM('m-goal'));
el('sv-goal').addEventListener('click', () => {
  const t = v('gl-t'); if (!t) return;
  const p = Math.min(100, Math.max(0, parseInt(el('gl-p').value) || 0));
  goals.push({ id: Date.now(), title: t, cat: el('gl-c').value, date: v('gl-d'), pct: p, notes: v('gl-n') });
  LS.s('kp_goals', goals); renderGoals(); ['gl-t','gl-d','gl-n','gl-p'].forEach(id => sv(id,'')); closeM('m-goal');
});
window.dGoal = i => { goals.splice(i, 1); LS.s('kp_goals', goals); renderGoals(); };
window.bumpGoal = i => { goals[i].pct = Math.min(100, goals[i].pct + 10); LS.s('kp_goals', goals); renderGoals(); };
function renderGoals() {
  const wrap = el('goal-list');
  if (!goals.length) { wrap.innerHTML = '<div class="empty">No goals yet — set one</div>'; return; }
  wrap.innerHTML = goals.map((g, i) => `<div class="glass goalcard"><div class="goal-h"><div class="goal-t">${g.title}</div><span class="pill ${GCLS[g.cat] || 'p-personal'}">${g.cat}</span></div>${g.date ? `<div style="font-size:11px;color:var(--t3);margin-bottom:7px">🗓 ${fD(g.date)}</div>` : ''}<div class="pbar-row"><span>${g.pct}%</span>${g.pct >= 100 ? '<span style="color:#10b981;font-weight:600">✓ Done</span>' : ''}</div><div class="pbar-bg"><div class="pbar${g.pct >= 100 ? ' g' : ''}" style="width:${g.pct}%"></div></div>${g.notes ? `<div class="cn">${g.notes}</div>` : ''}<div style="display:flex;gap:6px;margin-top:10px">${g.pct < 100 ? `<button class="btn btn-g btn-sm" onclick="bumpGoal(${i})">+10%</button>` : ''}<button class="btn btn-d" onclick="dGoal(${i})">Delete</button></div></div>`).join('');
}

// ── WORKOUTS ─────────────────────────────────────────────────────
el('btn-wk').addEventListener('click', () => { sv('wk-dt', TODAY); openM('m-wk'); });
el('sv-wk').addEventListener('click', () => {
  const tp = el('wk-tp').value;
  workouts.push({ id: Date.now(), type: tp, date: v('wk-dt') || TODAY, dur: parseInt(el('wk-dur').value) || 0, cal: parseInt(el('wk-cal').value) || 0, dist: parseFloat(el('wk-dis').value) || 0 });
  LS.s('kp_workouts', workouts); renderWorkouts(); renderCalendar();
  ['wk-dur','wk-cal','wk-dis'].forEach(id => sv(id,'')); closeM('m-wk');
});
window.dWk = i => { workouts.splice(i, 1); LS.s('kp_workouts', workouts); renderWorkouts(); renderCalendar(); };
function wkDates() {
  const ds = [], d = new Date(), m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) { const dd = new Date(m); dd.setDate(m.getDate() + i); ds.push(dd.toISOString().split('T')[0]); }
  return ds;
}
function renderWorkouts() {
  const wd = wkDates(), tw = workouts.filter(w => wd.includes(w.date));
  const tC = tw.reduce((s,w) => s+w.cal, 0), tD = tw.reduce((s,w) => s+w.dur, 0), tDi = tw.reduce((s,w) => s+w.dist, 0);
  el('cnt-wk').textContent = workouts.length;
  el('wk-stats').innerHTML = `<div class="sc"><div class="sc-lbl">This week</div><div class="sc-val">${tw.length}</div><div class="sc-sub">sessions</div></div><div class="sc"><div class="sc-lbl">Calories</div><div class="sc-val" style="background:var(--g1);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${tC.toLocaleString()}</div><div class="sc-sub">kcal</div></div><div class="sc"><div class="sc-lbl">Duration</div><div class="sc-val" style="color:#818cf8">${tD}</div><div class="sc-sub">mins</div></div><div class="sc"><div class="sc-lbl">Distance</div><div class="sc-val" style="color:#10b981">${tDi.toFixed(1)}</div><div class="sc-sub">km</div></div><div class="sc"><div class="sc-lbl">All time</div><div class="sc-val">${workouts.length}</div><div class="sc-sub">sessions</div></div>`;
  const DN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  el('wk-week').innerHTML = wd.map((d,i) => { const sess = workouts.filter(w => w.date === d), isT = d === TODAY; return `<div class="wk-day${sess.length?' has':''}${isT?' tod':''}"><div class="wk-dn">${DN[i]}</div><div class="wk-num${isT?' t':''}">${new Date(d+'T12:00').getDate()}</div>${sess.length ? sess.map(s => `<div class="wk-ico">${WI[s.type]||'💪'}</div>`).join('') : '<div class="wk-dot"></div>'}</div>`; }).join('');
  const wrap = el('wk-list');
  if (!workouts.length) { wrap.innerHTML = '<div class="empty">No workouts logged yet</div>'; return; }
  wrap.innerHTML = [...workouts].sort((a,b) => b.date.localeCompare(a.date)).map(w => { const ri = workouts.indexOf(w); return `<div class="glass wcard"><div class="wico" style="background:${WBG[w.type]||'rgba(200,150,220,.1)'}">${WI[w.type]||'💪'}</div><div class="wbody"><div class="wtitle">${WN[w.type]||w.type}</div><div class="wdl">${fD(w.date)}</div><div class="wmeta">${w.dur?`<div class="ws"><div class="ws-v">${w.dur}</div><div class="ws-l">mins</div></div>`:''} ${w.cal?`<div class="ws"><div class="ws-v" style="background:var(--g1);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${w.cal}</div><div class="ws-l">kcal</div></div>`:''} ${w.dist?`<div class="ws"><div class="ws-v" style="color:#10b981">${w.dist.toFixed(1)}</div><div class="ws-l">km</div></div>`:''}</div></div><button class="btn btn-d btn-sm" onclick="dWk(${ri})" style="flex-shrink:0">Delete</button></div>`; }).join('');
}

// ── CALENDAR ─────────────────────────────────────────────────────
function calWeekDates(offset) {
  const d = new Date(), m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  const ds = [];
  for (let i = 0; i < 7; i++) { const dd = new Date(m); dd.setDate(m.getDate() + i); ds.push(dd.toISOString().split('T')[0]); }
  return ds;
}
function getCalEvs(date) {
  const manual = calEvs.filter(e => e.date === date);
  const wkSynced = workouts.filter(w => w.date === date).map(w => ({
    id: 'wk-' + w.id, name: (WI[w.type]||'💪') + ' ' + (WN[w.type]||w.type) + (w.dur ? ` · ${w.dur}min` : '') + (w.cal ? ` · ${w.cal}kcal` : ''),
    cat: 'workout', date, time: '', synced: true
  }));
  return [...wkSynced, ...manual].sort((a,b) => (a.time||'99:99').localeCompare(b.time||'99:99'));
}
function renderCalendar() {
  const dates = calWeekDates(calWeekOffset);
  const mon = new Date(dates[0] + 'T12:00'), sun = new Date(dates[6] + 'T12:00');
  el('week-label').textContent = `${mon.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${sun.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
  const grid = el('cal-grid');
  let html = `<div class="cal-head time-col"></div>`;
  dates.forEach((d, i) => {
    const isT = d === TODAY, dn = new Date(d + 'T12:00').getDate();
    html += `<div class="cal-head${isT?' is-today':''}" onclick="selectDay('${d}')"><div class="day-name">${CAL_DN[i]}</div><div class="day-num${isT?' today':''}">${dn}</div></div>`;
  });
  HOUR_VALS.forEach((hr, hi) => {
    html += `<div class="time-label">${HOURS_DISPLAY[hi]}</div>`;
    dates.forEach(d => {
      const isT = d === TODAY;
      const cellEvs = getCalEvs(d).filter(e => e.time && parseInt(e.time.split(':')[0]) === hr);
      html += `<div class="cal-cell${isT?' is-today-col':''}" onclick="handleCellClick('${d}','${String(hr).padStart(2,'0')}:00')">${cellEvs.map(e => `<div class="ev cat-${e.cat}"><span class="ev-text">${e.name}</span>${!e.synced?`<button class="ev-del" onclick="delEv(event,'${e.id}')">×</button>`:''}</div>`).join('')}<span class="add-hint">+ add</span></div>`;
    });
  });
  grid.innerHTML = html;
  // All-day events in header
  dates.forEach((d, i) => {
    const allDay = getCalEvs(d).filter(e => !e.time);
    if (!allDay.length) return;
    const heads = grid.querySelectorAll('.cal-head');
    const cell = heads[i + 1];
    if (cell) cell.insertAdjacentHTML('beforeend', allDay.map(e => `<div class="ev cat-${e.cat}" style="margin-top:3px"><span class="ev-text">${e.name}</span>${!e.synced?`<button class="ev-del" onclick="delEv(event,'${e.id}')">×</button>`:''}</div>`).join(''));
  });
  if (selDay) renderDayDetail(selDay);
}
function renderDayDetail(date) {
  selDay = date;
  el('dd-title').textContent = fDL(date);
  const evs = getCalEvs(date), wrap = el('dd-events');
  if (!evs.length) { wrap.innerHTML = '<div class="dd-empty">No events — click a slot to add one</div>'; return; }
  wrap.innerHTML = evs.map(e => `<div class="dd-ev cat-${e.cat}" style="background:${CAT_COLORS[e.cat]}18"><div class="dd-dot" style="background:${CAT_COLORS[e.cat]}"></div><div style="flex:1;min-width:0"><div class="dd-ev-name">${e.name}</div>${e.time ? `<div class="dd-ev-time">${fmt12(e.time)}${e.dur&&e.dur!='0'?` · ${e.dur}min`:''}</div>` : '<div class="dd-ev-time">All day</div>'}${e.synced?'<div class="dd-sync">synced from workouts</div>':''}</div>${!e.synced?`<button class="dd-del" onclick="delEvDay('${e.id}')">×</button>`:''}</div>`).join('');
}
window.selectDay = d => { selDay = d; renderDayDetail(d); };
window.handleCellClick = (date, time) => { sv('ev-date', date); sv('ev-time', time); openM('m-ev'); };
window.delEv = (evt, id) => { evt.stopPropagation(); calEvs = calEvs.filter(e => e.id !== id); LS.s('kp_cal', calEvs); renderCalendar(); };
window.delEvDay = id => { calEvs = calEvs.filter(e => e.id !== id); LS.s('kp_cal', calEvs); renderCalendar(); };

el('btn-cal-today').addEventListener('click', () => { calWeekOffset = 0; renderCalendar(); selectDay(TODAY); });
el('prev-wk').addEventListener('click', () => { calWeekOffset--; renderCalendar(); });
el('next-wk').addEventListener('click', () => { calWeekOffset++; renderCalendar(); });
el('btn-cal-add').addEventListener('click', () => { sv('ev-date', TODAY); sv('ev-time', '09:00'); openM('m-ev'); });
el('sv-ev').addEventListener('click', () => {
  const name = v('ev-name'); if (!name) return;
  calEvs.push({ id: Date.now().toString(), name, date: v('ev-date') || TODAY, time: v('ev-time') || '', dur: el('ev-dur').value, cat: selCat });
  LS.s('kp_cal', calEvs); sv('ev-name', ''); closeM('m-ev'); renderCalendar();
});

// ══════════════════════════════════════════════════════════════
// SECTION 2 — CAREER & KNOWLEDGE
// ══════════════════════════════════════════════════════════════

// ── NEWS ─────────────────────────────────────────────────────────
async function fetchNews() {
  const feed = el('news-feed');
  feed.innerHTML = '<div class="ld" style="grid-column:1/-1"><div class="spin"></div><p>fetching headlines…</p></div>';
  if (NEWS_API_KEY === 'YOUR_NEWSAPI_KEY_HERE') {
    feed.innerHTML = '<div class="empty" style="grid-column:1/-1">Add your free NewsAPI.org key in app.js to enable live headlines</div>';
    return;
  }
  try {
    const q = encodeURIComponent('biotech OR pharma OR "clinical trial" OR "drug discovery" OR "AI medicine" OR FDA OR science OR business');
    const res = await fetch(`https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=9&apiKey=${NEWS_API_KEY}`);
    const data = await res.json();
    if (!data.articles?.length) throw new Error();
    feed.innerHTML = data.articles.map(a => `<article class="glass nc"><div class="nc-src">${a.source?.name || 'News'}</div><a class="nc-title" href="${a.url}" target="_blank">${a.title}</a><p class="nc-sum">${a.description || ''}</p><div class="nc-date">${new Date(a.publishedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div></article>`).join('');
  } catch {
    feed.innerHTML = '<div class="empty" style="grid-column:1/-1">Could not load feed — check your API key in app.js</div>';
  }
}
el('btn-refresh').addEventListener('click', fetchNews);

// ── SAVED ARTICLES ───────────────────────────────────────────────
el('btn-art').addEventListener('click', () => openM('m-art'));
el('sv-art').addEventListener('click', () => {
  const t = v('a-ti'); if (!t) return;
  arts.push({ id: Date.now(), title: t, url: v('a-ur'), source: v('a-sr'), tags: chips('a-tg'), notes: v('a-no'), date: TODAY });
  LS.s('kp_arts', arts); renderArts(); ['a-ti','a-ur','a-sr','a-no'].forEach(id => sv(id,'')); resetChips('a-tg'); closeM('m-art');
});
function renderArts() {
  const wrap = el('saved-arts');
  if (!arts.length) { wrap.innerHTML = '<div class="empty">No saved articles yet</div>'; return; }
  wrap.innerHTML = arts.map((a,i) => `<div class="glass card-row"><div class="cb"><div class="cmeta">${a.source}${a.source&&a.date?' · ':''}${fD(a.date)}</div>${a.url?`<a class="ct" href="${a.url}" target="_blank">${a.title}</a>`:`<span class="ct">${a.title}</span>`}<div style="margin-top:3px">${a.tags.map(tH).join('')}</div>${a.notes?`<div class="cn">${a.notes}</div>`:''}</div><div class="ca"><button class="btn btn-d" onclick="dArt(${i})">Delete</button></div></div>`).join('');
}
window.dArt = i => { arts.splice(i,1); LS.s('kp_arts',arts); renderArts(); };

// ── SAVED MEDIA ──────────────────────────────────────────────────
el('btn-med').addEventListener('click', () => openM('m-med'));
el('sv-med').addEventListener('click', () => {
  const t = v('md-ti'); if (!t) return;
  meds.push({ id: Date.now(), title: t, url: v('md-ur'), type: el('md-tp').value, creator: v('md-cr'), tags: chips('md-tg'), notes: v('md-no'), date: TODAY });
  LS.s('kp_meds', meds); renderMeds(); updCounts(); ['md-ti','md-ur','md-cr','md-no'].forEach(id => sv(id,'')); resetChips('md-tg'); closeM('m-med');
});
el('med-f').addEventListener('click', e => {
  const fc = e.target.closest('.fc'); if (!fc) return;
  document.querySelectorAll('#med-f .fc').forEach(c => c.classList.remove('active')); fc.classList.add('active'); medF = fc.dataset.f; renderMeds();
});
function renderMeds() {
  const wrap = el('med-list'), items = medF === 'all' ? meds : meds.filter(m => m.tags.includes(medF));
  if (!items.length) { wrap.innerHTML = `<div class="empty">${medF==='all'?'No saved media yet':'Nothing in this category'}</div>`; return; }
  wrap.innerHTML = items.map(m => { const ri = meds.indexOf(m); return `<div class="glass card-row"><div class="cb"><div class="cmeta">${m.type}${m.creator?' · '+m.creator:''}${m.date?' · '+fD(m.date):''}</div>${m.url?`<a class="ct" href="${m.url}" target="_blank">${m.title}</a>`:`<span class="ct">${m.title}</span>`}<div style="margin-top:3px">${m.tags.map(tH).join('')}</div>${m.notes?`<div class="cn">${m.notes}</div>`:''}</div><div class="ca"><button class="btn btn-d" onclick="dMed(${ri})">Delete</button></div></div>`; }).join('');
}
window.dMed = i => { meds.splice(i,1); LS.s('kp_meds',meds); renderMeds(); updCounts(); };

// ── COURSES ──────────────────────────────────────────────────────
el('btn-crs').addEventListener('click', () => openM('m-crs'));
el('sv-crs').addEventListener('click', () => {
  const t = v('cr-ti'); if (!t) return;
  const tot = parseInt(el('cr-to').value) || 1, don = Math.min(parseInt(el('cr-do').value) || 0, tot);
  crss.push({ id: Date.now(), title: t, url: v('cr-ur'), total: tot, done: don, notes: v('cr-no'), date: TODAY });
  LS.s('kp_crss', crss); renderCrss(); updCounts(); ['cr-ti','cr-ur','cr-no','cr-to','cr-do'].forEach(id => sv(id,'')); closeM('m-crs');
});
el('upd-crs').addEventListener('click', () => {
  if (eCrsIdx === null) return;
  const c = crss[eCrsIdx]; c.done = Math.min(parseInt(el('ec-do').value) || 0, c.total); c.notes = v('ec-no');
  LS.s('kp_crss', crss); renderCrss(); closeM('m-ecrs'); eCrsIdx = null;
});
window.openECrs = i => { eCrsIdx = i; sv('ec-do', crss[i].done); sv('ec-no', crss[i].notes || ''); openM('m-ecrs'); };
window.dCrs = i => { crss.splice(i,1); LS.s('kp_crss',crss); renderCrss(); updCounts(); };
function renderCrss() {
  const n = crss.length, comp = crss.filter(c => c.done >= c.total).length, avg = n ? Math.round(crss.reduce((s,c) => s + c.done/c.total*100, 0)/n) : 0;
  el('crs-stats').innerHTML = n ? `<div class="sc"><div class="sc-lbl">Total</div><div class="sc-val">${n}</div></div><div class="sc"><div class="sc-lbl">Completed</div><div class="sc-val" style="color:#10b981">${comp}</div></div><div class="sc"><div class="sc-lbl">Avg progress</div><div class="sc-val">${avg}%</div></div>` : '';
  const wrap = el('crs-list');
  if (!n) { wrap.innerHTML = '<div class="empty">No courses yet</div>'; return; }
  wrap.innerHTML = crss.map((c,i) => { const p = Math.round(c.done/c.total*100); return `<div class="glass crs-card"><div class="crs-top"><div>${c.url?`<a class="ct" href="${c.url}" target="_blank">${c.title}</a>`:`<span class="ct">${c.title}</span>`}<div class="cmeta">Added ${fD(c.date)}</div></div><div style="display:flex;gap:5px"><button class="btn btn-g btn-sm" onclick="openECrs(${i})">Update</button><button class="btn btn-d" onclick="dCrs(${i})">Delete</button></div></div><div class="pbar-row"><span>${c.done} / ${c.total} modules</span><span style="font-weight:600;color:${p>=100?'#10b981':'var(--purple)'}">${p}%${p>=100?' ✓':''}</span></div><div class="pbar-bg"><div class="pbar${p>=100?' g':''}" style="width:${p}%"></div></div>${c.notes?`<div class="cn">${c.notes}</div>`:''}</div>`; }).join('');
}

// ── CONFERENCES ──────────────────────────────────────────────────
el('btn-conf').addEventListener('click', () => openM('m-conf'));
el('sv-conf').addEventListener('click', () => {
  const n = v('cf-na'); if (!n) return;
  confs.push({ id: Date.now(), name: n, date: v('cf-dt'), loc: v('cf-lo'), learn: v('cf-le'), speak: v('cf-sp'), act: v('cf-ac') });
  LS.s('kp_confs', confs); renderConfs(); updCounts(); ['cf-na','cf-dt','cf-lo','cf-le','cf-sp','cf-ac'].forEach(id => sv(id,'')); closeM('m-conf');
});
window.dConf = i => { confs.splice(i,1); LS.s('kp_confs',confs); renderConfs(); updCounts(); };
function renderConfs() {
  const wrap = el('conf-list');
  if (!confs.length) { wrap.innerHTML = '<div class="empty">No conferences logged yet</div>'; return; }
  const sec = (l,t) => t ? `<div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#d4d0e8;margin-top:8px;margin-bottom:2px">${l}</div><div class="cn">${t}</div>` : '';
  wrap.innerHTML = confs.map((c,i) => `<div class="glass card-row"><div class="cb"><div style="margin-bottom:4px">${tH('conference')}</div><span class="ct">${c.name}</span><div class="cmeta">${fD(c.date)}${c.date&&c.loc?' · ':''}${c.loc||''}</div>${sec('Key Learnings',c.learn)}${sec('Speakers',c.speak)}${sec('Action Items',c.act)}</div><div class="ca"><button class="btn btn-d" onclick="dConf(${i})">Delete</button></div></div>`).join('');
}

// ── APPLICATIONS ─────────────────────────────────────────────────
el('btn-app').addEventListener('click', () => { sv('ap-dt', TODAY); openM('m-app'); });
el('sv-app').addEventListener('click', () => {
  const co = v('ap-co'), ro = v('ap-ro'); if (!co || !ro) return;
  apps.push({ id: Date.now(), company: co, role: ro, url: v('ap-ur'), date: v('ap-dt') || TODAY, status: el('ap-st').value, notes: v('ap-no') });
  LS.s('kp_apps', apps); renderApps(); updCounts(); ['ap-co','ap-ro','ap-ur','ap-dt','ap-no'].forEach(id => sv(id,'')); closeM('m-app');
});
el('app-f').addEventListener('click', e => {
  const fc = e.target.closest('.fc'); if (!fc || !fc.dataset.af) return;
  document.querySelectorAll('#app-f .fc').forEach(c => c.classList.remove('active')); fc.classList.add('active'); appF = fc.dataset.af; renderApps();
});
el('upd-app').addEventListener('click', () => {
  if (eAppIdx === null) return;
  apps[eAppIdx].status = el('ua-st').value; apps[eAppIdx].notes = v('ua-no');
  LS.s('kp_apps', apps); renderApps(); closeM('m-ua'); eAppIdx = null;
});
window.oUA = i => { eAppIdx = i; sv('ua-st', apps[i].status); sv('ua-no', apps[i].notes || ''); openM('m-ua'); };
window.dApp = i => { apps.splice(i,1); LS.s('kp_apps',apps); renderApps(); updCounts(); };
function renderApps() {
  const n = apps.length, by = s => apps.filter(a => a.status === s).length;
  el('app-stats').innerHTML = n ? `<div class="sc"><div class="sc-lbl">Total</div><div class="sc-val">${n}</div></div><div class="sc"><div class="sc-lbl">Applied</div><div class="sc-val" style="color:#4f46e5">${by('applied')}</div></div><div class="sc"><div class="sc-lbl">Interviews</div><div class="sc-val" style="color:#d97706">${by('interview')}</div></div><div class="sc"><div class="sc-lbl">Offers</div><div class="sc-val" style="color:#10b981">${by('offer')}</div></div><div class="sc"><div class="sc-lbl">Rejected</div><div class="sc-val" style="color:#f43f5e">${by('rejected')}</div></div>` : '';
  const wrap = el('app-list'), filtered = appF === 'all' ? apps : apps.filter(a => a.status === appF);
  if (!filtered.length) { wrap.innerHTML = `<div class="empty">${appF==='all'?'No applications logged yet':'Nothing with this status'}</div>`; return; }
  wrap.innerHTML = [...filtered].sort((a,b) => b.date.localeCompare(a.date)).map(a => { const ri = apps.indexOf(a), init = a.company.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(); return `<div class="glass app-row"><div class="a-init">${init}</div><div class="ab"><div class="at">${a.url?`<a href="${a.url}" target="_blank" style="color:var(--t);text-decoration:none;font-weight:600">${a.role}</a>`:a.role}</div><div class="ac">${a.company}</div><div class="ad">Applied ${fD(a.date)}</div>${a.notes?`<div class="cn" style="margin-top:5px">${a.notes}</div>`:''}</div><div class="ar"><span class="status ${SCLS[a.status]||''}">${SLBL[a.status]||a.status}</span><button class="btn btn-g btn-sm" onclick="oUA(${ri})">Update</button><button class="btn btn-d" onclick="dApp(${ri})">Delete</button></div></div>`; }).join('');
}
