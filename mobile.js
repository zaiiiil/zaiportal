// mobile.js — runs after app.js, drives the mobile UI
// app.js renders into hidden ghost elements; we copy results into visible mobile ones

// ── Panel switcher ────────────────────────────────────
window.switchPanel = function(panelId, btn) {
  document.querySelectorAll('.mob-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bn').forEach(b => b.classList.remove('active'));
  document.getElementById(panelId)?.classList.add('active');
  btn?.classList.add('active');
};

// ── Copy rendered HTML from ghost → visible elements ──
function syncFromGhost() {
  const copy = (from, to) => {
    const src = document.getElementById(from);
    const dst = document.getElementById(to);
    if (src && dst) dst.innerHTML = src.innerHTML;
  };
  copy('wk-stats',  'mob-stats');
  copy('wk-week',   'mob-week');
  copy('wk-chart',  'mob-chart');
  copy('wk-list',   'mob-history');
}

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
    `<button class="type-chip${t.v === selectedType ? ' sel' : ''}" data-v="${t.v}">
      <span class="tc-ico">${t.ico}</span>
      <span class="tc-lbl">${t.lbl}</span>
    </button>`
  ).join('');
  grid.querySelectorAll('.type-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedType = chip.dataset.v;
      grid.querySelectorAll('.type-chip').forEach(c => c.classList.remove('sel'));
      chip.classList.add('sel');
    });
  });
}

// ── Quick-log save ────────────────────────────────────
function wireQuickLog() {
  const saveBtn = document.getElementById('ql-save');
  if (!saveBtn) return;

  // Set today's date
  const dtInput = document.getElementById('ql-dt');
  if (dtInput) dtInput.value = new Date().toISOString().split('T')[0];

  saveBtn.addEventListener('click', async () => {
    const setV = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };

    // Push values into app.js ghost fields
    setV('wk-tp',  selectedType);
    setV('wk-dt',  document.getElementById('ql-dt')?.value || new Date().toISOString().split('T')[0]);
    setV('wk-dur', document.getElementById('ql-dur')?.value || '');
    setV('wk-cal', document.getElementById('ql-cal')?.value || '');
    setV('wk-dis', document.getElementById('ql-dis')?.value || '');

    // Trigger app.js save
    document.getElementById('sv-wk')?.click();

    // Feedback
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

    // Sync and switch to overview
    setTimeout(() => {
      syncFromGhost();
      switchPanel('mp-home', document.querySelector('.bn[data-panel="mp-home"]'));
    }, 400);
  });
}

// ── Weekly goal ───────────────────────────────────────
function wireGoal() {
  const openBtn = document.getElementById('mob-goal-btn');
  const saveBtn = document.getElementById('mob-sv-goal');
  const valInput = document.getElementById('mob-goal-val');

  openBtn?.addEventListener('click', () => {
    // Read current goal from app.js ghost input
    valInput.value = document.getElementById('wk-goal-val')?.value || 4;
    openMob('m-wk-goal');
  });

  saveBtn?.addEventListener('click', () => {
    // Push value into app.js ghost field and trigger its save button
    const ghost = document.getElementById('wk-goal-val');
    if (ghost) ghost.value = valInput.value;
    document.getElementById('sv-wk-goal')?.click();
    closeMob('m-wk-goal');
    setTimeout(syncFromGhost, 300);
  });
}

// ── Delete confirm toast ──────────────────────────────
let pendingDeleteIdx = null;

function wireDelete() {
  const toast   = document.getElementById('del-toast');
  const confirm = document.getElementById('del-confirm');
  const cancel  = document.getElementById('del-cancel');

  // Store the real dWk from app.js
  const realDWk = window.dWk;

  // Replace with toast version
  window.dWk = (idx) => {
    pendingDeleteIdx = idx;
    toast.style.display = 'block';
  };

  confirm?.addEventListener('click', async () => {
    if (pendingDeleteIdx !== null && realDWk) {
      await realDWk(pendingDeleteIdx);
      setTimeout(syncFromGhost, 300);
    }
    pendingDeleteIdx = null;
    toast.style.display = 'none';
  });

  cancel?.addEventListener('click', () => {
    pendingDeleteIdx = null;
    toast.style.display = 'none';
  });
}

// ── Modal helpers ─────────────────────────────────────
function openMob(id) {
  document.getElementById('ov')?.classList.add('open');
  document.getElementById(id)?.classList.add('open');
}
function closeMob(id) {
  document.getElementById('ov')?.classList.remove('open');
  document.getElementById(id)?.classList.remove('open');
}

// Wire overlay close
document.getElementById('ov')?.addEventListener('click', () => {
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  document.getElementById('ov')?.classList.remove('open');
});
document.querySelectorAll('[data-close]').forEach(b => {
  b.addEventListener('click', () => closeMob(b.dataset.close));
});

// ── Patch renderWorkouts so mobile syncs automatically ─
function patchRenderWorkouts() {
  const orig = window.renderWorkouts;
  if (!orig) return;
  window.renderWorkouts = function() {
    orig.call(this);
    // Small delay so app.js finishes writing to ghost elements
    setTimeout(syncFromGhost, 50);
  };
}

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildTypeGrid();
  wireQuickLog();
  wireGoal();

  // Wait for app.js to finish loading Firebase data, then patch & sync
  setTimeout(() => {
    patchRenderWorkouts();
    wireDelete();
    syncFromGhost();
  }, 2500); // app.js loads Firebase async, give it time
});
