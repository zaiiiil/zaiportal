// mobile.js — runs after app.js, patches workout UI for mobile

// ── Panel switcher ────────────────────────────────────
window.switchPanel = function(panelId, btn) {
  document.querySelectorAll('.mob-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bn').forEach(b => b.classList.remove('active'));
  document.getElementById(panelId)?.classList.add('active');
  btn?.classList.add('active');
};

// ── Workout types ─────────────────────────────────────
const WK_TYPES = [
  { v:'elliptical', ico:'🔵', lbl:'Elliptical' },
  { v:'run',        ico:'🏃', lbl:'Run' },
  { v:'incline',    ico:'⛰️', lbl:'Incline Walk' },
  { v:'stairs',     ico:'🪜', lbl:'Stair Master' },
  { v:'pump',       ico:'🏋️', lbl:'Body Pump' },
  { v:'sculpt',     ico:'💪', lbl:'Sculpt' },
  { v:'reformer',   ico:'🧘', lbl:'Reformer Pilates' },
  { v:'matpilates', ico:'🌸', lbl:'Mat Pilates' },
  { v:'barre',      ico:'🩰', lbl:'Barre' },
  { v:'weights',    ico:'🏋️‍♀️', lbl:'Weights' },
  { v:'trainer',    ico:'👟', lbl:'Trainer' },
];

let selectedType = 'elliptical';

function buildTypeGrid() {
  const grid = document.getElementById('quick-type-grid');
  if (!grid) return;
  grid.innerHTML = WK_TYPES.map(t =>
    `<button class="type-chip${t.v === selectedType ? ' sel' : ''}" data-v="${t.v}" onclick="pickType('${t.v}', this)">
      <span class="tc-ico">${t.ico}</span>
      <span class="tc-lbl">${t.lbl}</span>
    </button>`
  ).join('');
}

window.pickType = function(val, el) {
  selectedType = val;
  document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
};

// ── Save from quick-log form ──────────────────────────
function wireQuickLog() {
  const saveBtn = document.getElementById('ql-save');
  if (!saveBtn) return;

  // Set today's date
  const dtInput = document.getElementById('ql-dt');
  if (dtInput) dtInput.value = new Date().toISOString().split('T')[0];

  saveBtn.addEventListener('click', async () => {
    // Reach into app.js state via the existing sv-wk flow
    // We mirror the exact same save logic by populating app.js fields and clicking save
    const tp = selectedType;
    const dt = document.getElementById('ql-dt')?.value || new Date().toISOString().split('T')[0];
    const dur = parseInt(document.getElementById('ql-dur')?.value) || 0;
    const cal = parseInt(document.getElementById('ql-cal')?.value) || 0;
    const dis = parseFloat(document.getElementById('ql-dis')?.value) || 0;

    // Populate the hidden app.js modal fields so its save handler works
    const setV = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };
    setV('wk-tp', tp);
    setV('wk-dt', dt);
    setV('wk-dur', dur || '');
    setV('wk-cal', cal || '');
    setV('wk-dis', dis || '');

    // Trigger app.js save button
    document.getElementById('sv-wk')?.click();

    // Visual feedback
    saveBtn.textContent = 'Saved! ✓';
    saveBtn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
    setTimeout(() => {
      saveBtn.textContent = 'Save Workout ✓';
      saveBtn.style.background = '';
    }, 1800);

    // Clear fields
    setV('ql-dur', '');
    setV('ql-cal', '');
    setV('ql-dis', '');

    // Switch to overview after save
    setTimeout(() => {
      const homeBtn = document.querySelector('.bn[data-panel="mp-home"]');
      switchPanel('mp-home', homeBtn);
    }, 600);
  });
}

// ── Delete toast (replaces window.dWk) ───────────────
let pendingDeleteIdx = null;

function wireDeleteToast() {
  const toast = document.getElementById('del-toast');
  const confirmBtn = document.getElementById('del-confirm');
  const cancelBtn = document.getElementById('del-cancel');

  // Override window.dWk with a confirmation toast
  const origDWk = window.dWk;
  window.dWk = function(idx) {
    pendingDeleteIdx = idx;
    toast.style.display = 'block';
  };

  confirmBtn?.addEventListener('click', async () => {
    if (pendingDeleteIdx !== null) {
      // Call original
      const origDWk = window._origDWk;
      if (origDWk) await origDWk(pendingDeleteIdx);
      pendingDeleteIdx = null;
    }
    toast.style.display = 'none';
  });

  cancelBtn?.addEventListener('click', () => {
    pendingDeleteIdx = null;
    toast.style.display = 'none';
  });
}

// ── Weekly goal button on overview ───────────────────
function addGoalButton() {
  // Add a small gear button to the overview stats area
  const statsRow = document.getElementById('wk-stats');
  if (!statsRow) return;

  const existing = document.getElementById('mob-goal-btn');
  if (existing) return;

  const btn = document.createElement('button');
  btn.id = 'mob-goal-btn';
  btn.className = 'btn btn-g';
  btn.textContent = 'Set Goal';
  btn.style.cssText = 'font-size:11px;padding:6px 14px;margin-top:.5rem;width:100%';
  btn.onclick = () => {
    document.getElementById('wk-goal-val').value = window._wkGoal || 4;
    openMob('m-wk-goal');
  };
  statsRow.insertAdjacentElement('afterend', btn);
}

// ── Open/close modals from mobile.js ─────────────────
function openMob(id) {
  document.getElementById('ov')?.classList.add('open');
  document.getElementById(id)?.classList.add('open');
}

// ── Patch renderWorkouts to also refresh mobile panels ─
function patchRenderWorkouts() {
  const orig = window.renderWorkouts;
  if (!orig) return;
  window.renderWorkouts = function() {
    orig.call(this);
    addGoalButton();
  };
}

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildTypeGrid();
  wireQuickLog();
  wireDeleteToast();

  // Patch after app.js has had a chance to define renderWorkouts
  setTimeout(() => {
    patchRenderWorkouts();
    addGoalButton();

    // Store original dWk so confirm can call it
    window._origDWk = window.dWk;
    wireDeleteToast();
  }, 100);

  // Prevent double-tap zoom on buttons
  document.querySelectorAll('button, .type-chip').forEach(el => {
    el.addEventListener('touchend', e => e.preventDefault(), { passive: false });
  });
});
