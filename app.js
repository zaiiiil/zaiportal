// ── FIREBASE SETUP ────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7BoxdHTTbQyPQZEPje8c_IaaInbJUe8w",
  authDomain: "my-portal-fd675.firebaseapp.com",
  projectId: "my-portal-fd675",
  storageBucket: "my-portal-fd675.firebasestorage.app",
  messagingSenderId: "901831637749",
  appId: "1:901831637749:web:fa93c3208fff016036e3bc"
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const DOC_ID = "knowledge";

const LS = {
  g:  k => { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } },
  gO: (k,d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)) } catch { return d } },
  s:  (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
};

async function loadFromFirebase() {
  try {
    const snap = await getDoc(doc(db, "portals", DOC_ID));
    if (snap.exists()) {
      const d = snap.data();
      habits   = d.habits   || [];
      goals    = d.goals    || [];
      workouts = d.workouts || [];
      hlog     = d.hlog     || {};
      arts     = d.arts     || [];
      meds     = d.meds     || [];
      courses  = d.courses  || [];
      confs    = d.confs    || [];
      apps     = d.apps     || [];
      calEvs   = d.calEvs   || [];
      wkGoal   = d.wkGoal   || 4;
    } else {
      await migrateFromLocalStorage();
    }
  } catch(e) {
    console.warn("Firebase load failed, using localStorage:", e);
  }
}

async function migrateFromLocalStorage() {
  const hasData = LS.g('kp_habits').length || LS.g('kp_workouts').length || LS.g('kp_apps').length;
  if (hasData) {
    habits   = LS.g('kp_habits');
    goals    = LS.g('kp_goals');
    workouts = LS.g('kp_workouts');
    hlog     = LS.gO('kp_hlog', {});
    arts     = LS.g('kp_arts');
    meds     = LS.g('kp_meds');
    courses  = LS.g('kp_courses_v2');
    confs    = LS.g('kp_confs');
    // Migrate old apps format to new format with loc field
    const oldApps = LS.g('kp_apps');
    apps = oldApps.map(a => ({ ...a, loc: a.loc || 'bkk', req: a.req || '', resp: a.resp || '', cv: a.cv || '', int: a.int || '' }));
    calEvs   = LS.g('kp_cal');
    wkGoal   = LS.gO('kp_wk_goal', 4);
    await saveToFirebase();
  }
}

async function saveToFirebase() {
  try {
    await setDoc(doc(db, "portals", DOC_ID), {
      habits, goals, workouts, hlog, arts,
      meds, courses, confs, apps, calEvs, wkGoal
    });
  } catch(e) {
    console.warn("Firebase save failed:", e);
    LS.s('kp_habits', habits); LS.s('kp_goals', goals);
    LS.s('kp_workouts', workouts); LS.s('kp_hlog', hlog);
    LS.s('kp_arts', arts); LS.s('kp_meds', meds);
    LS.s('kp_courses_v2', courses); LS.s('kp_confs', confs);
    LS.s('kp_apps', apps); LS.s('kp_cal', calEvs);
    LS.s('kp_wk_goal', wkGoal);
  }
}

const save = () => saveToFirebase();

// ── STATE ─────────────────────────────────────────────────────────
let habits   = [];
let goals    = [];
let workouts = [];
let hlog     = {};
let arts     = [];
let meds     = [];
let courses  = [];
let confs    = [];
let apps     = [];
let calEvs   = [];
let wkGoal   = 4;

let eAppIdx = null, editCrsId = null, editAppId = null;
let medTypeF = 'all', medTagF = 'all', appF = 'all', appLocF = 'all';
let newCrsStatus = 'following', newAppLoc = 'bkk';
let calWeekOffset = 0;
let selDay = null;
let selCat = 'workout';

const TODAY = new Date().toISOString().split('T')[0];

// ── CONSTANTS ─────────────────────────────────────────────────────
const NEWS_WORKER_URL = 'https://proud-cell-2cbf.zailimwatanakul.workers.dev/';

const WI  = { elliptical:'[e]', run:'[r]', incline:'[i]', stairs:'[s]', pump:'[p]', sculpt:'[sc]', reformer:'[rp]', matpilates:'[mp]', barre:'[b]', weights:'[w]', trainer:'[t]' };
const WN  = { elliptical:'Elliptical', run:'Run', incline:'Incline Walk', stairs:'Stair Master', pump:'Body Pump', sculpt:'Sculpt', reformer:'Reformer Pilates', matpilates:'Mat Pilates', barre:'Barre', weights:'Weights', trainer:'Personal Trainer' };
const WBG = { elliptical:'rgba(139,92,246,.1)', run:'rgba(16,185,129,.1)', incline:'rgba(245,158,11,.1)', stairs:'rgba(244,114,182,.1)', pump:'rgba(168,85,247,.1)', sculpt:'rgba(192,38,160,.1)', reformer:'rgba(186,104,200,.1)', matpilates:'rgba(244,114,182,.1)', barre:'rgba(168,85,247,.1)', weights:'rgba(239,68,68,.1)', trainer:'rgba(59,130,246,.1)' };
const GCLS  = { career:'p-career', learning:'p-learning', health:'p-health', research:'p-research', personal:'p-personal' };
const TLBLS = { science:'Science', business:'Business', health:'Health', tech:'Tech', pharma:'Pharma', aitech:'AI & Biotech', general:'General', conference:'Conference', clinical:'Clinical', biotech:'Biotech', bizdev:'BD/VC' };
const TPILL = { science:'p-sci', business:'p-bus', health:'p-hlth', tech:'p-tech', pharma:'p-pha', aitech:'p-ai', general:'p-gen', conference:'p-conf', clinical:'p-clin', biotech:'p-bio', bizdev:'p-bd' };
const SLBL  = { toapply:'To Apply', applied:'Applied', interview:'Interview', offer:'Offer!', rejected:'Rejected' };
const SCLS  = { toapply:'s-toapply', applied:'s-applied', interview:'s-interview', offer:'s-offer', rejected:'s-rejected' };
const CAT_COLORS = { workout:'#8b5cf6', social:'#ec4899', work:'#3b82f6', personal:'#10b981', other:'#f59e0b' };
const HOURS_DISPLAY = ['6 AM','7 AM','8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM','10 PM'];
const HOUR_VALS = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
const CAL_DN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MEDIA_TYPE_ICONS  = { YouTube:'[YT]', Podcast:'[pod]', Article:'[art]', Webinar:'[web]', Interview:'[int]', Other:'[o]' };
const MEDIA_TYPE_COLORS = { YouTube:'rgba(239,68,68,.12)', Podcast:'rgba(16,185,129,.12)', Article:'rgba(59,130,246,.12)', Webinar:'rgba(139,92,246,.12)', Interview:'rgba(245,158,11,.1)', Other:'rgba(107,114,128,.08)' };
const MEDIA_TYPE_PILL   = { YouTube:'p-pha', Podcast:'p-hlth', Article:'p-bus', Webinar:'p-sci', Interview:'p-ai', Other:'p-gen' };

// ── HELPERS ───────────────────────────────────────────────────────
const v    = id => document.getElementById(id)?.value.trim() || '';
const sv   = (id,val) => { const e = document.getElementById(id); if (e) e.value = val || ''; };
const el   = id => document.getElementById(id);
const tH   = t => `<span class="pill ${TPILL[t] || 'p-gen'}">${TLBLS[t] || t}</span>`;
const fD   = s => { if (!s) return ''; return new Date(s+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); };
const fDL  = s => { if (!s) return ''; return new Date(s+'T12:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}); };
const fmt12 = t => { if (!t) return ''; const [h,m] = t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; };

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  el('hdate').textContent = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  document.querySelectorAll('.panel').forEach(p => p.style.opacity = '0.4');
  await loadFromFirebase();
  document.querySelectorAll('.panel').forEach(p => p.style.opacity = '1');

  initTabs(); initModals(); initCatChips();

  el('btn-wk-goal').addEventListener('click', () => { sv('wk-goal-val', wkGoal); openM('m-wk-goal'); });
  el('sv-wk-goal').addEventListener('click', async () => {
    wkGoal = parseInt(el('wk-goal-val').value) || 4;
    await save(); renderWorkouts(); closeM('m-wk-goal');
  });

  el('btn-med').addEventListener('click', () => {
    resetChips('md-tg'); initTchips('md-tg');
    ['md-ti','md-ur','md-cr','md-no'].forEach(id => sv(id,'')); openM('m-med');
  });

  renderHabits(); renderGoals(); renderWorkouts();
  renderCalendar(); selectDay(TODAY);
  renderArts(); renderMeds(); renderCourses(); renderConfs(); renderApps();
  updCounts(); updStreak();

  // Habits
  el('btn-habit').addEventListener('click', () => openM('m-habit'));
  el('sv-habit').addEventListener('click', async () => {
    const n = v('hb-n'); if (!n) return;
    habits.push({ id:Date.now(), name:n, emoji:el('hb-e').value.trim()||'*' });
    await save(); renderHabits(); sv('hb-n',''); sv('hb-e',''); closeM('m-habit');
  });
  window.toggleH = async hid => {
    const l = hlog[hid]||[];
    hlog[hid] = l.includes(TODAY) ? l.filter(d=>d!==TODAY) : [...l,TODAY];
    await save(); renderHabits(); updStreak();
  };
  window.dHabit = async i => { habits.splice(i,1); await save(); renderHabits(); };

  // Goals
  el('btn-goal').addEventListener('click', () => openM('m-goal'));
  el('sv-goal').addEventListener('click', async () => {
    const t = v('gl-t'); if (!t) return;
    const p = Math.min(100,Math.max(0,parseInt(el('gl-p').value)||0));
    goals.push({ id:Date.now(), title:t, cat:el('gl-c').value, date:v('gl-d'), pct:p, notes:v('gl-n') });
    await save(); renderGoals(); ['gl-t','gl-d','gl-n','gl-p'].forEach(id=>sv(id,'')); closeM('m-goal');
  });
  window.dGoal = async i => { goals.splice(i,1); await save(); renderGoals(); };
  window.bumpGoal = async i => { goals[i].pct = Math.min(100,goals[i].pct+10); await save(); renderGoals(); };

  // Workouts
  el('btn-wk').addEventListener('click', () => { sv('wk-dt',TODAY); openM('m-wk'); });
  el('sv-wk').addEventListener('click', async () => {
    const tp = el('wk-tp').value;
    workouts.push({ id:Date.now(), type:tp, date:v('wk-dt')||TODAY, dur:parseInt(el('wk-dur').value)||0, cal:parseInt(el('wk-cal').value)||0, dist:parseFloat(el('wk-dis').value)||0 });
    await save(); renderWorkouts(); renderCalendar();
    ['wk-dur','wk-cal','wk-dis'].forEach(id=>sv(id,'')); closeM('m-wk');
  });
  window.dWk = async i => { workouts.splice(i,1); await save(); renderWorkouts(); renderCalendar(); };

  // Calendar
  el('btn-cal-today').addEventListener('click', () => { calWeekOffset=0; renderCalendar(); selectDay(TODAY); });
  el('prev-wk').addEventListener('click', () => { calWeekOffset--; renderCalendar(); });
  el('next-wk').addEventListener('click', () => { calWeekOffset++; renderCalendar(); });
  el('btn-cal-add').addEventListener('click', () => { sv('ev-date',TODAY); sv('ev-time','09:00'); openM('m-ev'); });
  el('sv-ev').addEventListener('click', async () => {
    const name = v('ev-name'); if (!name) return;
    calEvs.push({ id:Date.now().toString(), name, date:v('ev-date')||TODAY, time:v('ev-time')||'', dur:el('ev-dur').value, cat:selCat });
    await save(); sv('ev-name',''); closeM('m-ev'); renderCalendar();
  });
  window.delEv = async (evt,id) => { evt.stopPropagation(); calEvs=calEvs.filter(e=>e.id!==id); await save(); renderCalendar(); };
  window.delEvDay = async id => { calEvs=calEvs.filter(e=>e.id!==id); await save(); renderCalendar(); };

  // Articles
  el('btn-art').addEventListener('click', () => openM('m-art'));
  el('sv-art').addEventListener('click', async () => {
    const t = v('a-ti'); if (!t) return;
    arts.push({ id:Date.now(), title:t, url:v('a-ur'), source:v('a-sr'), tags:chips('a-tg'), notes:v('a-no'), date:TODAY });
    await save(); renderArts(); ['a-ti','a-ur','a-sr','a-no'].forEach(id=>sv(id,'')); resetChips('a-tg'); closeM('m-art');
  });
  window.dArt = async i => { arts.splice(i,1); await save(); renderArts(); };

  // Media
  el('sv-med').addEventListener('click', async () => {
    const t = v('md-ti'); if (!t) return;
    meds.push({ id:Date.now(), title:t, url:v('md-ur'), type:el('md-tp').value, creator:v('md-cr'), tags:chips('md-tg'), notes:v('md-no'), date:TODAY });
    await save(); renderMeds(); updCounts();
    resetChips('md-tg'); ['md-ti','md-ur','md-cr','md-no'].forEach(id=>sv(id,'')); closeM('m-med');
  });
  el('med-type-bar').addEventListener('click', e => {
    const fc = e.target.closest('.fc'); if (!fc||!fc.dataset.tv) return;
    document.querySelectorAll('#med-type-bar .fc').forEach(x=>x.classList.remove('active')); fc.classList.add('active'); medTypeF=fc.dataset.tv; renderMeds();
  });
  el('med-tag-bar').addEventListener('click', e => {
    const fc = e.target.closest('.fc'); if (!fc||!fc.dataset.tf) return;
    document.querySelectorAll('#med-tag-bar .fc').forEach(x=>x.classList.remove('active')); fc.classList.add('active'); medTagF=fc.dataset.tf; renderMeds();
  });
  window.saveMedNotes = async (id,val) => { const m=meds.find(x=>x.id===id); if(m){m.notes=val; await save();} };
  window.dMed = async i => { meds.splice(i,1); await save(); renderMeds(); updCounts(); };

  // Courses
  el('btn-add-following').addEventListener('click', () => {
    editCrsId=null; newCrsStatus='following';
    el('m-crs-title').textContent='Add Course - Following';
    el('crs-status-val').value='following';
    ['cr-ti','cr-ur','cr-date','cr-contact','cr-tag','cr-desc','cr-notes'].forEach(id=>sv(id,''));
    openM('m-crs');
  });
  el('btn-add-interested').addEventListener('click', () => {
    editCrsId=null; newCrsStatus='interested';
    el('m-crs-title').textContent='Add Course - Interested';
    el('crs-status-val').value='interested';
    ['cr-ti','cr-ur','cr-date','cr-contact','cr-tag','cr-desc','cr-notes'].forEach(id=>sv(id,''));
    openM('m-crs');
  });
  el('sv-crs').addEventListener('click', async () => {
    const ti = v('cr-ti'); if (!ti) return;
    const status = el('crs-status-val').value||newCrsStatus;
    const entry = { title:ti, url:v('cr-ur'), form:el('cr-form').value, date:v('cr-date'), contact:v('cr-contact'), tag:v('cr-tag'), desc:v('cr-desc'), notes:v('cr-notes'), price:v('cr-price'), duration:v('cr-duration') };
    if (editCrsId) {
      const c = courses.find(x=>x.id===editCrsId);
      if (c) Object.assign(c, entry);
    } else {
      courses.push({ id:Date.now(), ...entry, status, added:TODAY });
    }
    await save(); renderCourses(); updCounts();
    editCrsId=null; ['cr-ti','cr-ur','cr-date','cr-contact','cr-tag','cr-desc','cr-notes','cr-price','cr-duration'].forEach(id=>sv(id,'')); closeM('m-crs');
  });
  window.editCrs = id => {
    const c = courses.find(x=>x.id===id); if (!c) return;
    editCrsId=id; el('m-crs-title').textContent='Edit Course'; el('crs-status-val').value=c.status;
    sv('cr-ti',c.title); sv('cr-ur',c.url||''); sv('cr-date',c.date||''); sv('cr-contact',c.contact||'');
    sv('cr-tag',c.tag||''); sv('cr-desc',c.desc||''); sv('cr-notes',c.notes||'');
    sv('cr-price',c.price||''); sv('cr-duration',c.duration||'');
    if (el('cr-form')) el('cr-form').value=c.form||'Online'; openM('m-crs');
  };
  window.toggleCrsStatus = async id => {
    const c = courses.find(x=>x.id===id);
    if (c) { c.status=c.status==='following'?'interested':'following'; await save(); renderCourses(); }
  };
  window.saveCrsNotes = async (id,val) => { const c=courses.find(x=>x.id===id); if(c){c.notes=val; await save();} };
  window.dCrs = async id => { courses=courses.filter(x=>x.id!==id); await save(); renderCourses(); updCounts(); };

  // Conferences
  el('btn-conf').addEventListener('click', () => openM('m-conf'));
  el('sv-conf').addEventListener('click', async () => {
    const n = v('cf-na'); if (!n) return;
    confs.push({ id:Date.now(), name:n, date:v('cf-dt'), loc:v('cf-lo'), learn:v('cf-le'), speak:v('cf-sp'), act:v('cf-ac') });
    await save(); renderConfs(); updCounts(); ['cf-na','cf-dt','cf-lo','cf-le','cf-sp','cf-ac'].forEach(id=>sv(id,'')); closeM('m-conf');
  });
  window.dConf = async i => { confs.splice(i,1); await save(); renderConfs(); updCounts(); };

  // Applications - new version with Bangkok/Singapore + detail tabs
  el('btn-app').addEventListener('click', () => {
    editAppId=null;
    el('m-app-title').textContent='Log Application';
    sv('ap-dt', TODAY);
    ['ap-co','ap-ro','ap-ur','ap-req','ap-resp','ap-cv','ap-int','ap-no'].forEach(id=>sv(id,''));
    el('ap-st').value='applied';
    setAppLoc('bkk');
    openM('m-app');
  });
  el('sv-app').addEventListener('click', async () => {
    const co=v('ap-co'), ro=v('ap-ro'); if (!co||!ro) return;
    const entry = { id:editAppId||Date.now(), company:co, role:ro, url:v('ap-ur'), date:v('ap-dt')||TODAY, status:el('ap-st').value, loc:newAppLoc, req:v('ap-req'), resp:v('ap-resp'), cv:v('ap-cv'), int:v('ap-int'), notes:v('ap-no') };
    if (editAppId) { const i=apps.findIndex(x=>x.id===editAppId); apps[i]=entry; }
    else { apps.push(entry); }
    await save(); renderApps(); updCounts();
    editAppId=null; closeM('m-app');
  });

  el('app-loc-bar').addEventListener('click', e => {
    const fc = e.target.closest('.fc'); if (!fc||!fc.dataset.al) return;
    document.querySelectorAll('#app-loc-bar .fc').forEach(x=>x.classList.remove('active')); fc.classList.add('active'); appLocF=fc.dataset.al; renderApps();
  });
  el('app-f').addEventListener('click', e => {
    const fc = e.target.closest('.fc'); if (!fc||!fc.dataset.af) return;
    document.querySelectorAll('#app-f .fc').forEach(c=>c.classList.remove('active')); fc.classList.add('active'); appF=fc.dataset.af; renderApps();
  });

  window.openEditApp = id => {
    editAppId=id;
    const a=apps.find(x=>x.id===id); if(!a) return;
    el('m-app-title').textContent='Edit Application';
    sv('ap-co',a.company); sv('ap-ro',a.role); sv('ap-ur',a.url||''); sv('ap-dt',a.date);
    el('ap-st').value=a.status;
    sv('ap-req',a.req||''); sv('ap-resp',a.resp||''); sv('ap-cv',a.cv||''); sv('ap-int',a.int||''); sv('ap-no',a.notes||'');
    setAppLoc(a.loc||'bkk');
    openM('m-app');
  };
  window.dApp = async id => { apps=apps.filter(x=>x.id!==id); await save(); renderApps(); updCounts(); };
  window.updAppStatus = async (id, status) => {
    const a = apps.find(x=>x.id===id); if(a){ a.status=status; await save(); renderApps(); }
  };
  window.toggleAppDet = id => {
    const det = el('app-det-'+id);
    if (det) det.classList.toggle('open');
  };
  window.appDetTab = (id, tab) => {
    document.querySelectorAll(`#app-det-${id} .adt`).forEach(b=>b.classList.remove('active'));
    document.querySelectorAll(`#app-det-${id} .adp`).forEach(p=>p.classList.remove('active'));
    el(`adt-${id}-${tab}`)?.classList.add('active');
    el(`adp-${id}-${tab}`)?.classList.add('active');
  };

});

// ── APP LOC HELPER ────────────────────────────────────────────────
window.setAppLoc = function(loc) {
  newAppLoc = loc;
  const bkk = el('ap-pill-bkk'), sgp = el('ap-pill-sgp');
  if(bkk) { bkk.style.background = loc==='bkk'?'rgba(245,158,11,.25)':'rgba(245,158,11,.1)'; bkk.style.borderColor = loc==='bkk'?'rgba(245,158,11,.8)':'rgba(245,158,11,.4)'; bkk.style.fontWeight = loc==='bkk'?'700':'600'; }
  if(sgp) { sgp.style.background = loc==='sgp'?'rgba(16,185,129,.25)':'#f0fdf4'; sgp.style.borderColor = loc==='sgp'?'#10b981':'#d1fae5'; sgp.style.fontWeight = loc==='sgp'?'700':'600'; }
}

// ── INIT HELPERS ──────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    const section = b.closest('.tabs').dataset.section;
    document.querySelectorAll(`.tabs[data-section="${section}"] .tab`).forEach(x => x.classList.remove('active'));
    document.querySelectorAll(`.panels[data-section="${section}"] .panel`).forEach(x => x.classList.remove('active'));
    b.classList.add('active'); el('p-' + b.dataset.t)?.classList.add('active');
  }));
}
function initModals() {
  const ov = el('ov');
  ov.addEventListener('click', () => { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); ov.classList.remove('open'); });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeM(b.dataset.close)));
}
function openM(id) { el('ov').classList.add('open'); el(id)?.classList.add('open'); }
function closeM(id) { el('ov').classList.remove('open'); el(id)?.classList.remove('open'); }
function initCatChips() {
  document.querySelectorAll('.cat-chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.cat-chip').forEach(x => x.classList.remove('sel')); c.classList.add('sel'); selCat = c.dataset.cat;
  }));
}
function chips(pid) { return [...document.querySelectorAll('#'+pid+' .tchip.sel')].map(c => c.dataset.v); }
function resetChips(pid) { document.querySelectorAll('#'+pid+' .tchip').forEach(c => c.classList.remove('sel')); }
function initTchips(pid) { document.querySelectorAll('#'+pid+' .tchip').forEach(c => c.addEventListener('click', () => c.classList.toggle('sel'))); }

// ── COUNTS & STREAK ───────────────────────────────────────────────
function updCounts() {
  el('cnt-med').textContent  = meds.length;
  el('cnt-crs').textContent  = courses.length;
  el('cnt-conf').textContent = confs.length;
  el('cnt-apps').textContent = apps.length;
}
function updStreak() {
  let s = 0, d = new Date();
  for (let i = 0; i < 365; i++) {
    const k = d.toISOString().split('T')[0];
    if (habits.length && habits.some(h => (hlog[h.id]||[]).includes(k))) { s++; } else if (i > 0) break;
    d.setDate(d.getDate()-1);
  }
  el('sbadge').textContent = `${s} day streak`;
}

// ── HABITS ────────────────────────────────────────────────────────
function hStr(hid) {
  const l = hlog[hid]||[]; let s=0, d=new Date();
  for (let i=0;i<365;i++) { const k=d.toISOString().split('T')[0]; if(l.includes(k)){s++;}else if(i>0)break; d.setDate(d.getDate()-1); }
  return s;
}
function renderHabits() {
  const wrap = el('habit-list');
  if (!habits.length) { wrap.innerHTML='<div class="empty">No habits yet - add one to start your streak</div>'; return; }
  const DN=['S','M','T','W','T','F','S'], l7=[];
  for (let i=6;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); l7.push(d.toISOString().split('T')[0]); }
  wrap.innerHTML = habits.map((h,i) => {
    const l=hlog[h.id]||[], done=l.includes(TODAY), s=hStr(h.id);
    const days = l7.map(d=>`<div class="hd${l.includes(d)?' done':''}${d===TODAY?' today':''}">${DN[new Date(d+'T12:00').getDay()]}</div>`).join('');
    return `<div class="glass hcard"><div class="hcheck${done?' done':''}" onclick="toggleH(${h.id})">${done?'v':''}</div><div class="hinfo"><div class="hname">${h.emoji} ${h.name}</div><div class="hstr">${s>0?`${s} day streak`:'start your streak today'}</div></div><div class="hdays">${days}</div><button class="btn btn-d" style="margin-left:8px;flex-shrink:0;padding:2px 9px;font-size:15px" onclick="dHabit(${i})">x</button></div>`;
  }).join('');
}

// ── GOALS ─────────────────────────────────────────────────────────
function renderGoals() {
  const wrap=el('goal-list');
  if (!goals.length) { wrap.innerHTML='<div class="empty">No goals yet</div>'; return; }
  wrap.innerHTML=goals.map((g,i)=>`<div class="glass goalcard"><div class="goal-h"><div class="goal-t">${g.title}</div><span class="pill ${GCLS[g.cat]||'p-personal'}">${g.cat}</span></div>${g.date?`<div style="font-size:11px;color:var(--t3);margin-bottom:7px">${fD(g.date)}</div>`:''}<div class="pbar-row"><span>${g.pct}%</span>${g.pct>=100?'<span style="color:#10b981;font-weight:600">Done!</span>':''}</div><div class="pbar-bg"><div class="pbar${g.pct>=100?' g':''}" style="width:${g.pct}%"></div></div>${g.notes?`<div class="cn">${g.notes}</div>`:''}<div style="display:flex;gap:6px;margin-top:10px">${g.pct<100?`<button class="btn btn-g btn-sm" onclick="bumpGoal(${i})">+10%</button>`:''}<button class="btn btn-d" onclick="dGoal(${i})">Delete</button></div></div>`).join('');
}

// ── WORKOUTS ──────────────────────────────────────────────────────
function wkDates(offset=0) {
  const ds=[], d=new Date(), m=new Date(d);
  m.setDate(d.getDate()-((d.getDay()+6)%7)+offset*7);
  for (let i=0;i<7;i++) { const dd=new Date(m); dd.setDate(m.getDate()+i); ds.push(dd.toISOString().split('T')[0]); }
  return ds;
}
function wkLabel(offset) { return new Date(wkDates(offset)[0]+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
function renderWorkouts() {
  const wd=wkDates(), tw=workouts.filter(w=>wd.includes(w.date));
  const tC=tw.reduce((s,w)=>s+w.cal,0), tD=tw.reduce((s,w)=>s+w.dur,0), tDi=tw.reduce((s,w)=>s+w.dist,0);
  el('cnt-wk').textContent=workouts.length;
  el('wk-stats').innerHTML=`
    <div class="sc"><div class="sc-lbl">This week</div><div class="sc-val">${tw.length}<span style="font-size:12px;color:var(--t3)"> / ${wkGoal}</span></div><div class="sc-sub">goal: ${wkGoal}</div></div>
    <div class="sc"><div class="sc-lbl">Calories</div><div class="sc-val" style="background:var(--g1);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${tC.toLocaleString()}</div><div class="sc-sub">kcal</div></div>
    <div class="sc"><div class="sc-lbl">Duration</div><div class="sc-val" style="color:#818cf8">${tD}</div><div class="sc-sub">mins</div></div>
    <div class="sc"><div class="sc-lbl">Distance</div><div class="sc-val" style="color:#10b981">${tDi.toFixed(1)}</div><div class="sc-sub">km</div></div>
    <div class="sc"><div class="sc-lbl">All time</div><div class="sc-val">${workouts.length}</div><div class="sc-sub">sessions</div></div>`;
  const DN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  el('wk-week').innerHTML=wd.map((d,i)=>{
    const sess=workouts.filter(w=>w.date===d), isT=d===TODAY;
    return `<div class="wk-day${sess.length?' has':''}${isT?' tod':''}"><div class="wk-dn">${DN[i]}</div><div class="wk-num${isT?' t':''}">${new Date(d+'T12:00').getDate()}</div>${sess.length?sess.map(s=>`<div class="wk-ico">${WN[s.type]||s.type}</div>`).join(''):'<div class="wk-dot"></div>'}</div>`;
  }).join('');
  const weeks=[];
  for (let i=-7;i<=0;i++) weeks.push({ offset:i, sessions:workouts.filter(w=>wkDates(i).includes(w.date)).length, label:wkLabel(i) });
  const maxSess=Math.max(...weeks.map(w=>w.sessions),wkGoal,1);
  const goalH=Math.round(wkGoal/maxSess*80);
  const chartWrap=el('wk-chart');
  if (chartWrap) {
    chartWrap.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-family:var(--font-d);font-size:13px;font-weight:700;color:var(--t)">Week by Week Consistency</div>
        <div style="font-size:11px;color:var(--t3)">Goal: ${wkGoal}/week</div>
      </div>
      <div style="position:relative">
        <div style="position:absolute;left:0;right:0;top:${80-goalH}px;height:1.5px;background:linear-gradient(90deg,#f472b6,#8b5cf6);opacity:.45;z-index:1;border-radius:2px;pointer-events:none"></div>
        <div style="display:flex;align-items:flex-end;gap:5px;height:80px">
          ${weeks.map((w,i)=>{
            const h=Math.max(Math.round(w.sessions/maxSess*80),w.sessions>0?4:0);
            const isCurrent=w.offset===0, met=w.sessions>=wkGoal;
            const bg=isCurrent?'linear-gradient(180deg,#f472b6,#8b5cf6)':met?'rgba(16,185,129,.75)':'rgba(168,85,247,.28)';
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:100%;height:${h}px;background:${bg};border-radius:6px 6px 0 0;min-height:${w.sessions>0?4:0}px" title="${w.sessions} sessions"></div></div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:5px;margin-top:5px">${weeks.map((w,i)=>`<div style="flex:1;font-size:9px;color:var(--t3);font-weight:600;text-align:center">${i===7?'Now':w.label.split(' ')[0]}</div>`).join('')}</div>
      </div>`;
  }
  const wrap=el('wk-list');
  if (!workouts.length) { wrap.innerHTML='<div class="empty">No workouts logged yet</div>'; return; }

  // Group by month
  const byMonth = {};
  [...workouts].sort((a,b)=>b.date.localeCompare(a.date)).forEach(w => {
    const m = w.date.slice(0,7); // YYYY-MM
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(w);
  });

  wrap.innerHTML = Object.entries(byMonth).map(([month, mWorkouts]) => {
    const label = new Date(month+'-01T12:00').toLocaleDateString('en-US',{month:'long',year:'numeric'});
    // Count by type
    const typeCounts = {};
    mWorkouts.forEach(w => { typeCounts[w.type] = (typeCounts[w.type]||0)+1; });
    const totalCal = mWorkouts.reduce((s,w)=>s+w.cal,0);
    const totalDur = mWorkouts.reduce((s,w)=>s+w.dur,0);
    const typeBar = Object.entries(typeCounts).map(([t,n])=>`
      <div style="display:flex;align-items:center;gap:6px">
        <div style="width:28px;height:28px;border-radius:8px;background:${WBG[t]||'rgba(168,85,247,.1)'};display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0">${WI[t]||'x'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:600;color:var(--t)">${WN[t]||t}</div>
        </div>
        <div style="font-family:var(--font-d);font-size:14px;font-weight:700;color:#a855f7">${n}x</div>
      </div>`).join('');
    return `<div class="glass" style="overflow:hidden;margin-bottom:.65rem;padding:0">
      <div style="display:flex;align-items:center;gap:10px;padding:.85rem 1rem;cursor:pointer" onclick="toggleWkMonth('${month}')">
        <div style="flex:1">
          <div style="font-family:var(--font-d);font-size:15px;font-weight:700;color:var(--t)">${label}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${mWorkouts.length} session${mWorkouts.length!==1?'s':''}${totalCal?` · ${totalCal.toLocaleString()} kcal`:''}${totalDur?` · ${totalDur} mins`:''}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;max-width:60%;justify-content:flex-end">
          ${Object.entries(typeCounts).map(([t,n])=>`<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${WBG[t]||'rgba(168,85,247,.1)'};color:#7c3aed">${WN[t]||t} ×${n}</span>`).join('')}
        </div>
        <div id="wk-arrow-${month}" style="font-size:13px;color:var(--t3);transition:transform .2s;flex-shrink:0">v</div>
      </div>
      <div id="wk-month-${month}" style="display:none;border-top:1px solid #f5f0ff;padding:.75rem 1rem">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:12px">${typeBar}</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${mWorkouts.map(w=>{
            const ri=workouts.indexOf(w);
            return `<div style="display:flex;align-items:center;gap:.65rem;padding:6px 0;border-bottom:1px solid #f9f5ff">
              <div style="width:28px;height:28px;border-radius:8px;background:${WBG[w.type]||'rgba(168,85,247,.1)'};display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0">${WI[w.type]||'x'}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;color:var(--t)">${WN[w.type]||w.type}</div>
                <div style="font-size:10px;color:var(--t3)">${fD(w.date)}${w.dur?' · '+w.dur+'min':''}${w.cal?' · '+w.cal+'kcal':''}${w.dist?' · '+w.dist.toFixed(1)+'km':''}</div>
              </div>
              <button class="btn btn-d btn-sm" onclick="dWk(${ri})" style="flex-shrink:0;font-size:11px;padding:2px 8px">x</button>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }).join('');
}

window.toggleWkMonth = month => {
  const body = el('wk-month-'+month);
  const arrow = el('wk-arrow-'+month);
  if (!body) return;
  const open = body.style.display === 'block';
  body.style.display = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
};

// ── CALENDAR ──────────────────────────────────────────────────────
function calWeekDates(offset) {
  const d=new Date(), m=new Date(d);
  m.setDate(d.getDate()-((d.getDay()+6)%7)+offset*7);
  const ds=[];
  for (let i=0;i<7;i++) { const dd=new Date(m); dd.setDate(m.getDate()+i); ds.push(dd.toISOString().split('T')[0]); }
  return ds;
}
function getCalEvs(date) {
  const manual=calEvs.filter(e=>e.date===date);
  const wkSynced=workouts.filter(w=>w.date===date).map(w=>({ id:'wk-'+w.id, name:(WN[w.type]||w.type)+(w.dur?` - ${w.dur}min`:''), cat:'workout', date, time:'', synced:true }));
  return [...wkSynced,...manual].sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
}
function renderCalendar() {
  const dates=calWeekDates(calWeekOffset);
  const mon=new Date(dates[0]+'T12:00'), sun=new Date(dates[6]+'T12:00');
  el('week-label').textContent=`${mon.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${sun.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
  const grid=el('cal-grid');
  let html=`<div class="cal-head time-col"></div>`;
  dates.forEach((d,i)=>{ const isT=d===TODAY, dn=new Date(d+'T12:00').getDate(); html+=`<div class="cal-head${isT?' is-today':''}" onclick="selectDay('${d}')"><div class="day-name">${CAL_DN[i]}</div><div class="day-num${isT?' today':''}">${dn}</div></div>`; });
  HOUR_VALS.forEach((hr,hi)=>{
    html+=`<div class="time-label">${HOURS_DISPLAY[hi]}</div>`;
    dates.forEach(d=>{ const isT=d===TODAY; const cellEvs=getCalEvs(d).filter(e=>e.time&&parseInt(e.time.split(':')[0])===hr); html+=`<div class="cal-cell${isT?' is-today-col':''}" onclick="handleCellClick('${d}','${String(hr).padStart(2,'0')}:00')">${cellEvs.map(e=>`<div class="ev cat-${e.cat}"><span class="ev-text">${e.name}</span>${!e.synced?`<button class="ev-del" onclick="delEv(event,'${e.id}')">x</button>`:''}</div>`).join('')}<span class="add-hint">+ add</span></div>`; });
  });
  grid.innerHTML=html;
  dates.forEach((d,i)=>{ const allDay=getCalEvs(d).filter(e=>!e.time); if(!allDay.length) return; const heads=grid.querySelectorAll('.cal-head'); const cell=heads[i+1]; if(cell) cell.insertAdjacentHTML('beforeend',allDay.map(e=>`<div class="ev cat-${e.cat}" style="margin-top:3px"><span class="ev-text">${e.name}</span>${!e.synced?`<button class="ev-del" onclick="delEv(event,'${e.id}')">x</button>`:''}</div>`).join('')); });
  if (selDay) renderDayDetail(selDay);
}
function renderDayDetail(date) {
  selDay=date; el('dd-title').textContent=fDL(date);
  const evs=getCalEvs(date), wrap=el('dd-events');
  if (!evs.length) { wrap.innerHTML='<div class="dd-empty">No events - click a slot to add one</div>'; return; }
  wrap.innerHTML=evs.map(e=>`<div class="dd-ev cat-${e.cat}" style="background:${CAT_COLORS[e.cat]}18"><div class="dd-dot" style="background:${CAT_COLORS[e.cat]}"></div><div style="flex:1;min-width:0"><div class="dd-ev-name">${e.name}</div>${e.time?`<div class="dd-ev-time">${fmt12(e.time)}${e.dur&&e.dur!='0'?` - ${e.dur}min`:''}</div>`:'<div class="dd-ev-time">All day</div>'}${e.synced?'<div class="dd-sync">synced from workouts</div>':''}</div>${!e.synced?`<button class="dd-del" onclick="delEvDay('${e.id}')">x</button>`:''}</div>`).join('');
}
window.selectDay = d => { selDay=d; renderDayDetail(d); };
window.handleCellClick = (date,time) => { sv('ev-date',date); sv('ev-time',time); openM('m-ev'); };

// ── NEWS ──────────────────────────────────────────────────────────
// news feed replaced with static site links

// ── ARTICLES ──────────────────────────────────────────────────────
function renderArts() {
  const wrap=el('saved-arts');
  if (!arts.length) { wrap.innerHTML='<div class="empty">No saved articles yet</div>'; return; }
  wrap.innerHTML=arts.map((a,i)=>`<div class="glass card-row"><div class="cb"><div class="cmeta">${a.source}${a.source&&a.date?' - ':''}${fD(a.date)}</div>${a.url?`<a class="ct" href="${a.url}" target="_blank">${a.title}</a>`:`<span class="ct">${a.title}</span>`}<div style="margin-top:3px">${a.tags.map(tH).join('')}</div>${a.notes?`<div class="cn">${a.notes}</div>`:''}</div><div class="ca"><button class="btn btn-d" onclick="dArt(${i})">Delete</button></div></div>`).join('');
}

// ── MEDIA — visual cards with YouTube thumbnails ─────────────────
function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function renderMeds() {
  const wrap=el('med-list');
  let items=meds;
  if (medTypeF!=='all') items=items.filter(m=>m.type===medTypeF);
  if (medTagF!=='all') items=items.filter(m=>(m.tags||[]).includes(medTagF));
  if (!items.length) { wrap.innerHTML=`<div class="empty">${medTypeF==='all'&&medTagF==='all'?'No saved media yet':'Nothing matches these filters.'}</div>`; return; }

  // Group into grid for YouTube, list for others
  const ytItems    = items.filter(m=>m.type==='YouTube');
  const otherItems = items.filter(m=>m.type!=='YouTube');

  let html = '';

  // YouTube grid — thumbnail cards
  if (ytItems.length) {
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:1.2rem">`;
    html += ytItems.map(m => {
      const ri = meds.indexOf(m);
      const vid = getYouTubeId(m.url);
      const thumb = vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : null;
      return `<div class="glass" style="overflow:hidden;padding:0;display:flex;flex-direction:column">
        ${thumb
          ? `<a href="${m.url}" target="_blank" style="display:block;position:relative">
              <img src="${thumb}" alt="${m.title}" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block">
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.15)">
                <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,0,0,.9);display:flex;align-items:center;justify-content:center">
                  <div style="width:0;height:0;border-top:10px solid transparent;border-bottom:10px solid transparent;border-left:16px solid #fff;margin-left:4px"></div>
                </div>
              </div>
            </a>`
          : `<div style="aspect-ratio:16/9;background:rgba(239,68,68,.1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#ef4444">No thumbnail</div>`}
        <div style="padding:.75rem .9rem;flex:1;display:flex;flex-direction:column;gap:6px">
          <a class="ct" href="${m.url||'#'}" target="_blank" style="font-size:13px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${m.title}</a>
          <div style="font-size:11px;color:var(--t3)">${m.creator||''}${m.creator&&m.date?' - ':''}${fD(m.date)}</div>
          <div>${(m.tags||[]).map(t=>`<span class="pill ${TPILL[t]||'p-gen'}">${TLBLS[t]||t}</span>`).join('')}</div>
          <textarea style="width:100%;padding:6px 9px;border:1.5px solid #f0ebff;border-radius:8px;font-family:var(--font);font-size:11px;color:var(--t2);background:#faf8ff;resize:vertical;min-height:50px;line-height:1.5;margin-top:auto" placeholder="Notes, timestamps..." onchange="saveMedNotes(${m.id},this.value)">${m.notes||''}</textarea>
          <button class="btn btn-d btn-sm" onclick="dMed(${ri})" style="align-self:flex-end;margin-top:2px">Delete</button>
        </div>
      </div>`;
    }).join('');
    html += `</div>`;
  }

  // Other media — compact visual rows
  if (otherItems.length) {
    const TYPE_ACCENT = { Podcast:'#10b981', Article:'#3b82f6', Webinar:'#8b5cf6', Interview:'#f59e0b', Other:'#9ca3af' };
    html += otherItems.map(m => {
      const ri = meds.indexOf(m);
      const accent = TYPE_ACCENT[m.type] || '#9ca3af';
      return `<div class="glass card-row" style="flex-direction:column;gap:.5rem;align-items:stretch;padding:0;overflow:hidden;margin-bottom:.5rem">
        <div style="display:flex;align-items:stretch;gap:0">
          <div style="width:5px;background:${accent};flex-shrink:0;border-radius:0"></div>
          <div style="flex:1;padding:.75rem .9rem;display:flex;gap:.75rem;align-items:flex-start">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:${accent}18;color:${accent}">${m.type}</span>
                <span class="cmeta">${m.creator||''}${m.creator&&m.date?' - ':''}${fD(m.date)}</span>
              </div>
              ${m.url?`<a class="ct" href="${m.url}" target="_blank">${m.title}</a>`:`<span class="ct">${m.title}</span>`}
              <div style="margin-top:4px">${(m.tags||[]).map(t=>`<span class="pill ${TPILL[t]||'p-gen'}">${TLBLS[t]||t}</span>`).join('')}</div>
            </div>
            <button class="btn btn-d btn-sm" onclick="dMed(${ri})" style="flex-shrink:0">Delete</button>
          </div>
        </div>
        <div style="padding:0 .9rem .75rem">
          <textarea style="width:100%;padding:6px 9px;border:1.5px solid #f0ebff;border-radius:8px;font-family:var(--font);font-size:11px;color:var(--t2);background:#faf8ff;resize:vertical;min-height:50px;line-height:1.5" placeholder="Notes, takeaways..." onchange="saveMedNotes(${m.id},this.value)">${m.notes||''}</textarea>
        </div>
      </div>`;
    }).join('');
  }

  wrap.innerHTML = html;
}

// ── COURSES — collapsible cards with detail tabs ─────────────────
function renderCourses() {
  const renderList=(list,wrapId)=>{
    const wrap=el(wrapId);
    if (!list.length) { wrap.innerHTML='<div class="empty">None here yet</div>'; return; }
    wrap.innerHTML=list.map(c=>{
      const statusBg = c.status==='following'?'rgba(16,185,129,.12)':'rgba(139,92,246,.12)';
      const statusCl = c.status==='following'?'#065f46':'#5b21b6';
      const fmtBg    = c.form==='Online'?'rgba(59,130,246,.1)':c.form==='Onsite'?'rgba(16,185,129,.1)':'rgba(245,158,11,.1)';
      const fmtCl    = c.form==='Online'?'#1e3a8a':c.form==='Onsite'?'#065f46':'#92400e';
      const detailTabs = [
        { id:'price',    label:'Price',    val: c.price    || c.priceVal || '' },
        { id:'duration', label:'Duration', val: c.duration || c.dur || '' },
        { id:'nature',   label:'Nature',   val: [c.form, c.tag].filter(Boolean).join(' - ') || '' },
        { id:'link',     label:'Link',     val: c.url || '' },
      ];
      return `<div class="glass" style="overflow:hidden;margin-bottom:.6rem;padding:0">
        <!-- Header row — always visible, click to toggle -->
        <div style="display:flex;align-items:center;gap:10px;padding:.9rem 1rem;cursor:pointer" onclick="toggleCrsExpand(${c.id})">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700;color:var(--t);margin-bottom:4px">${c.title}</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">
              <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${statusBg};color:${statusCl}">${c.status==='following'?'Following':'Interested'}</span>
              ${c.form?`<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${fmtBg};color:${fmtCl}">${c.form}</span>`:''}
              ${c.tag?`<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(139,92,246,.1);color:#5b21b6">${c.tag}</span>`:''}
              ${c.price?`<span style="font-size:10px;color:var(--t3)">${c.price}</span>`:''}
              ${c.duration?`<span style="font-size:10px;color:var(--t3)">${c.duration}</span>`:''}
            </div>
          </div>
          <div style="display:flex;gap:5px;flex-shrink:0" onclick="event.stopPropagation()">
            <button class="btn btn-g btn-sm" onclick="editCrs(${c.id})">Edit</button>
            <button class="btn btn-d btn-sm" onclick="dCrs(${c.id})">Delete</button>
          </div>
          <div id="crs-arrow-${c.id}" style="font-size:13px;color:var(--t3);transition:transform .2s;flex-shrink:0">v</div>
        </div>

        <!-- Expanded content -->
        <div id="crs-body-${c.id}" style="display:none;border-top:1px solid #f5f0ff">

          <!-- Detail tabs: Price / Duration / Nature / Link -->
          <div style="display:flex;border-bottom:1px solid #f5f0ff;overflow-x:auto;scrollbar-width:none">
            ${detailTabs.filter(t=>t.val).map((t,i)=>`
              <button class="crs-dtab" data-cid="${c.id}" data-tab="${t.id}"
                style="padding:7px 14px;font-size:11px;font-weight:600;background:none;border:none;border-bottom:2px solid ${i===0?'#a855f7':'transparent'};color:${i===0?'#a855f7':'var(--t3)'};cursor:pointer;white-space:nowrap;flex-shrink:0"
                onclick="crsDetailTab(${c.id},'${t.id}',this)">${t.label}</button>`).join('')}
            <button class="crs-dtab" data-cid="${c.id}" data-tab="notes"
              style="padding:7px 14px;font-size:11px;font-weight:600;background:none;border:none;border-bottom:2px solid ${!detailTabs.filter(t=>t.val).length?'#a855f7':'transparent'};color:${!detailTabs.filter(t=>t.val).length?'#a855f7':'var(--t3)'};cursor:pointer;white-space:nowrap;flex-shrink:0"
              onclick="crsDetailTab(${c.id},'notes',this)">Notes & Learnings</button>
          </div>

          <!-- Tab panels -->
          ${detailTabs.filter(t=>t.val).map((t,i)=>`
            <div id="crs-tp-${c.id}-${t.id}" class="crs-tpanel" style="display:${i===0?'block':'none'};padding:.85rem 1rem">
              ${t.id==='link'
                ? `<a href="${t.val}" target="_blank" style="color:#a855f7;font-size:13px;word-break:break-all">${t.val}</a>`
                : `<div style="font-size:13px;color:var(--t2);line-height:1.6">${t.val}</div>`}
            </div>`).join('')}

          <div id="crs-tp-${c.id}-notes" class="crs-tpanel" style="display:${!detailTabs.filter(t=>t.val).length?'block':'none'};padding:.75rem 1rem">
            ${c.desc?`<div style="font-size:12px;color:var(--t2);background:#f9f8ff;border:1px solid #f0ebff;border-radius:8px;padding:.55rem .8rem;margin-bottom:8px;line-height:1.5"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--t3);display:block;margin-bottom:3px">Curriculum</span>${c.desc}</div>`:''}
            <textarea style="width:100%;padding:8px 11px;border:1.5px solid #f0ebff;border-radius:10px;font-family:var(--font);font-size:12px;color:var(--t2);background:#faf8ff;resize:vertical;min-height:80px;line-height:1.5" placeholder="Notes, learnings, action items..." onchange="saveCrsNotes(${c.id},this.value)">${c.notes||''}</textarea>
          </div>

          <div style="display:flex;justify-content:flex-end;padding:.5rem 1rem .8rem;border-top:1px solid #f5f0ff">
            <button class="btn btn-g btn-sm" onclick="toggleCrsStatus(${c.id})">${c.status==='following'?'Move to Interested':'Move to Following'}</button>
          </div>
        </div>
      </div>`;
    }).join('');
  };
  renderList(courses.filter(c=>c.status==='following'), 'crs-following');
  renderList(courses.filter(c=>c.status==='interested'), 'crs-interested');
}

window.toggleCrsExpand = id => {
  const body  = el('crs-body-'+id);
  const arrow = el('crs-arrow-'+id);
  if (!body) return;
  const open = body.style.display === 'block';
  body.style.display  = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
};
window.crsDetailTab = (id, tab, btn) => {
  document.querySelectorAll(`[id^="crs-tp-${id}-"]`).forEach(p => p.style.display='none');
  el(`crs-tp-${id}-${tab}`).style.display = 'block';
  document.querySelectorAll(`.crs-dtab[data-cid="${id}"]`).forEach(b => {
    b.style.borderBottomColor = 'transparent'; b.style.color = 'var(--t3)';
  });
  btn.style.borderBottomColor = '#a855f7'; btn.style.color = '#a855f7';
};

// ── CONFERENCES ───────────────────────────────────────────────────
function renderConfs() {
  const wrap=el('conf-list');
  if (!confs.length) { wrap.innerHTML='<div class="empty">No conferences logged yet</div>'; return; }
  const sec=(l,t)=>t?`<div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#d4d0e8;margin-top:8px;margin-bottom:2px">${l}</div><div class="cn">${t}</div>`:'';
  wrap.innerHTML=confs.map((c,i)=>`<div class="glass card-row"><div class="cb"><div style="margin-bottom:4px">${tH('conference')}</div><span class="ct">${c.name}</span><div class="cmeta">${fD(c.date)}${c.date&&c.loc?' - ':''}${c.loc||''}</div>${sec('Key Learnings',c.learn)}${sec('Speakers',c.speak)}${sec('Action Items',c.act)}</div><div class="ca"><button class="btn btn-d" onclick="dConf(${i})">Delete</button></div></div>`).join('');
}

// ── APPLICATIONS — new with Bangkok/Singapore + detail tabs ───────
function renderApps() {
  const bkkCount = apps.filter(a=>a.loc==='bkk').length;
  const sgpCount = apps.filter(a=>a.loc==='sgp').length;
  const by = s => apps.filter(a=>a.status===s).length;
  el('app-stats').innerHTML = apps.length ? `
    <div class="sc"><div class="sc-lbl">Total</div><div class="sc-val">${apps.length}</div></div>
    <div class="sc"><div class="sc-lbl">To Apply</div><div class="sc-val" style="color:#8b5cf6">${by('toapply')}</div></div>
    <div class="sc"><div class="sc-lbl">Bangkok</div><div class="sc-val" style="color:#f59e0b">${bkkCount}</div></div>
    <div class="sc"><div class="sc-lbl">Singapore</div><div class="sc-val" style="color:#10b981">${sgpCount}</div></div>
    <div class="sc"><div class="sc-lbl">Interview</div><div class="sc-val" style="color:#d97706">${by('interview')}</div></div>
    <div class="sc"><div class="sc-lbl">Offers</div><div class="sc-val" style="color:#10b981">${by('offer')}</div></div>
    <div class="sc"><div class="sc-lbl">Rejected</div><div class="sc-val" style="color:#f43f5e">${by('rejected')}</div></div>` : '';

  let filtered = apps;
  if (appLocF !== 'all') filtered = filtered.filter(a => a.loc === appLocF);
  if (appF !== 'all') filtered = filtered.filter(a => a.status === appF);
  const wrap = el('app-list');
  if (!filtered.length) { wrap.innerHTML=`<div class="empty">${apps.length?'No applications match these filters':'No applications logged yet'}</div>`; return; }

  const locBadge = loc => loc==='sgp'
    ? `<span style="display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(16,185,129,.12);color:#065f46">Singapore</span>`
    : `<span style="display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(245,158,11,.12);color:#92400e">Bangkok</span>`;

  wrap.innerHTML = [...filtered].sort((a,b)=>b.date.localeCompare(a.date)).map(a => {
    const init = a.company.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const tabs = [
      { id:'req', label:'Requirements', content:a.req },
      { id:'resp', label:'Responsibilities', content:a.resp },
      { id:'cv', label:'Cover Letter', content:a.cv },
      { id:'int', label:'Interview Notes', content:a.int },
      { id:'no', label:'Notes', content:a.notes }
    ].filter(t => t.content);
    const isToapply = a.status==='toapply';
    return `<div class="glass app-row" style="flex-direction:column;padding:0;overflow:hidden;${isToapply?'border-left:3px solid #8b5cf6':''}">
      <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.9rem 1rem">
        ${isToapply?`<div style="flex-shrink:0;padding-top:2px"><div onclick="markApplied(${a.id})" title="Check when you've applied" style="width:20px;height:20px;border-radius:6px;border:2px solid #8b5cf6;background:#faf5ff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s" onmouseover="this.style.background='#ede9fe'" onmouseout="this.style.background='#faf5ff'"></div></div>`:''}
        <div class="a-init" style="${isToapply?'background:rgba(139,92,246,.15);color:#7c3aed':''}">${init}</div>
        <div class="ab" style="flex:1;min-width:0">
          <div class="at">${a.url?`<a href="${a.url}" target="_blank" style="color:var(--t);text-decoration:none;font-weight:600">${a.role}</a>`:a.role}</div>
          <div class="ac">${a.company}</div>
          <div style="display:flex;gap:6px;align-items:center;margin-top:5px;flex-wrap:wrap">
            <span class="status ${SCLS[a.status]||''}">${SLBL[a.status]||a.status}</span>
            ${locBadge(a.loc)}
            ${isToapply?`<span style="font-size:11px;color:#8b5cf6;font-style:italic">Tap checkbox when applied</span>`:`<span style="font-size:11px;color:var(--t3)">Applied ${fD(a.date)}</span>`}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end">
          <div style="display:flex;gap:4px">
            <button class="btn btn-g btn-sm" onclick="openEditApp(${a.id})">Edit</button>
            <button class="btn btn-d btn-sm" onclick="dApp(${a.id})">Delete</button>
          </div>
          ${tabs.length?`<button class="btn btn-g btn-sm" onclick="toggleAppDet(${a.id})">Details ${tabs.length}</button>`:''}
        </div>
      </div>
      <div id="app-det-${a.id}" style="display:none;border-top:1px solid #f5f0ff">
        <div style="display:flex;gap:0;border-bottom:1px solid #f5f0ff;overflow-x:auto;scrollbar-width:none">
          ${tabs.map((t,i)=>`<button id="adt-${a.id}-${t.id}" class="adt${i===0?' active':''}" onclick="appDetTab(${a.id},'${t.id}')" style="padding:8px 14px;font-size:11px;font-weight:600;background:none;border:none;border-bottom:2px solid ${i===0?'#a855f7':'transparent'};color:${i===0?'#a855f7':'var(--t3)'};cursor:pointer;white-space:nowrap;flex-shrink:0">${t.label}</button>`).join('')}
        </div>
        ${tabs.map((t,i)=>`<div id="adp-${a.id}-${t.id}" class="adp${i===0?' active':''}" style="display:${i===0?'block':'none'};padding:.85rem 1rem;font-size:12px;color:var(--t2);line-height:1.7;white-space:pre-wrap;background:#faf8ff;max-height:260px;overflow-y:auto">${t.content}</div>`).join('')}
      </div>
    </div>`;
  }).join('');

  // wire up tab active state via JS since we can't use CSS easily inline
  document.querySelectorAll('.adt').forEach(btn => {
    btn.addEventListener('click', function() {
      const detEl = this.closest('[id^="app-det-"]');
      if (!detEl) return;
      detEl.querySelectorAll('.adt').forEach(b => { b.style.borderBottomColor='transparent'; b.style.color='var(--t3)'; });
      this.style.borderBottomColor='#a855f7'; this.style.color='#a855f7';
    });
  });
}

window.toggleAppDet = id => {
  const det = el('app-det-'+id);
  if (!det) return;
  det.style.display = det.style.display === 'none' ? 'block' : 'none';
};
window.markApplied = async id => {
  const a = apps.find(x=>x.id===id); if(!a) return;
  const dateStr = prompt('Date applied (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
  if(dateStr===null) return;
  a.status = 'applied';
  a.date = dateStr || a.date;
  await save(); renderApps();
};
window.appDetTab = (id, tab) => {
  document.querySelectorAll(`#app-det-${id} .adp`).forEach(p => p.style.display='none');
  el(`adp-${id}-${tab}`).style.display = 'block';
};
