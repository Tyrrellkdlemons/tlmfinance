/* =====================================================================
   FREEDOM PLAN PANEL — universal bottom-sheet quiz.
   Loaded on every page. Injects #planPanel markup if missing, otherwise
   defers to whatever script (app.js on index.html) already wires it.
   Reads/writes the same localStorage key as the macro planner so the
   72-hour starter plan carries over to planner.html automatically.
   ===================================================================== */
(function () {
  'use strict';
  const STORAGE_KEY = 'paving-the-road:plan:v1';

  const NEEDS = [
    { id: 'money',   label: 'Money plan',     icon: '💵' },
    { id: 'docs',    label: 'ID & documents', icon: '🪪' },
    { id: 'job',     label: 'Job path',       icon: '🛠️' },
    { id: 'housing', label: 'Housing',        icon: '🏠' },
    { id: 'edu',     label: 'Education',      icon: '🎓' },
    { id: 'transit', label: 'Transportation', icon: '🚌' },
    { id: 'health',  label: 'Health & meds',  icon: '⚕️' },
    { id: 'family',  label: 'Family support', icon: '🤝' }
  ];
  const NEED_TASKS = {
    money:   ['Open a checking account or activate prepaid card', 'Pull free credit report at AnnualCreditReport.com', 'List your one-time release funds and first paycheck date'],
    docs:    ['Locate or request birth certificate', 'Replace Social Security card at ssa.gov/number-card', 'Apply for state ID at the DMV'],
    job:     ['Update resume with TLM/work-while-incarcerated experience', 'Visit a CareerOneStop / American Job Center', 'Apply to 3 fair-chance employers in week 1'],
    housing: ['Confirm housing for tonight + next 7 nights', 'Call 211 if housing is unstable', 'Save HUD rental-assistance contact'],
    edu:     ['Visit Project Rebound or campus reentry center', 'Request transcripts; ask about FAFSA / Cal Grant', 'List 1 short course you can finish in 90 days'],
    transit: ['Pick a daily transit plan and budget', 'Apply to Lifeline for phone/internet', 'Save a backup ride contact'],
    health:  ['Continue medications — call provider on day 1', 'Save 988 + SAMHSA helpline numbers', 'Schedule a primary-care visit'],
    family:  ['Reconnect with one supportive person today', 'Set a weekly check-in time', 'Talk through expectations & boundaries']
  };
  const LABEL = { money:'Money plan', docs:'ID & documents', job:'Job path', housing:'Housing', edu:'Education', transit:'Transportation', health:'Health & meds', family:'Family support' };

  const escape = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const loadPlan = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; } };
  const savePlan = (p) => { try { p.updatedAt = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {} };

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed', left: '50%', bottom: '110px', transform: 'translateX(-50%)',
      background: 'var(--tlm-charcoal, #0E0E0E)', color: 'var(--tlm-gold, #DAA520)',
      padding: '10px 16px', borderRadius: '999px', zIndex: 1001,
      boxShadow: '0 6px 24px rgba(0,0,0,.35)', fontWeight: 700, fontSize: '.9rem'
    });
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  }

  // ---- Inject markup if not present -------------------------------------
  function ensurePanel() {
    if (document.getElementById('planPanel')) return false;
    const aside = document.createElement('aside');
    aside.className = 'plan-panel';
    aside.id = 'planPanel';
    aside.setAttribute('role', 'dialog');
    aside.setAttribute('aria-modal', 'false');
    aside.setAttribute('aria-labelledby', 'planPanelTitle');
    aside.setAttribute('aria-hidden', 'true');
    aside.innerHTML = `
      <div class="plan-panel__handle" aria-hidden="true"></div>
      <div class="plan-panel__head">
        <div>
          <span class="eyebrow">Freedom Plan Panel</span>
          <h3 id="planPanelTitle" style="margin:4px 0 0">What do you need first?</h3>
        </div>
        <button class="btn btn--ghost btn--sm" id="closePlan" aria-label="Close panel">Close</button>
      </div>
      <div class="plan-panel__body">
        <p class="muted" style="margin-top:0">Pick everything that applies. We'll generate a 72-hour plan and link to resources. Want a deeper plan? <a href="./planner.html">Open the customizable plan →</a></p>
        <div class="quiz" id="quiz"></div>
        <div class="flex mt-3">
          <button class="btn btn--primary" id="generate72">Generate my 72-hour plan</button>
          <a class="btn btn--dark" href="./planner.html">Customizable plan →</a>
          <button class="btn btn--ghost" type="button" id="openAdvancedFromPanel">Advanced wizard</button>
        </div>
        <div id="quizOutput" class="mt-3"></div>
      </div>
    `;
    document.body.appendChild(aside);
    return true;
  }

  // Whether THIS script owns the click handlers — true when we just injected
  // the markup, false when an existing #planPanel was already in the page
  // (meaning app.js owns the wiring on that page).
  let owns = false;

  // ---- Render quiz buttons (only when this script owns the panel) -------
  function renderQuiz() {
    const wrap = document.getElementById('quiz');
    if (!wrap) return;
    if (!owns) return; // app.js will render — leave it alone
    wrap.innerHTML = '';
    const plan = loadPlan();
    const needs = plan.needs || [];
    NEEDS.forEach(n => {
      const b = document.createElement('button');
      b.type = 'button';
      const pressed = needs.includes(n.id);
      b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      b.textContent = `${n.icon}  ${n.label}`;
      b.addEventListener('click', () => {
        const p = loadPlan();
        p.needs = p.needs || [];
        const i = p.needs.indexOf(n.id);
        if (i >= 0) p.needs.splice(i, 1); else p.needs.push(n.id);
        savePlan(p);
        b.setAttribute('aria-pressed', p.needs.includes(n.id) ? 'true' : 'false');
      });
      wrap.appendChild(b);
    });
  }

  // ---- Generate the 72-hour starter plan --------------------------------
  function generate72() {
    if (!owns) return; // app.js handles
    const plan = loadPlan();
    if (!(plan.needs || []).length) {
      toast('Pick at least one need above first.');
      return;
    }
    plan.first72Hours = [];
    (plan.needs || []).forEach(n => (NEED_TASKS[n] || []).forEach(t => plan.first72Hours.push(t)));
    savePlan(plan);
    renderQuizOutput();
  }

  function renderQuizOutput() {
    const out = document.getElementById('quizOutput'); if (!out) return;
    if (!owns) return; // app.js handles
    const plan = loadPlan();
    const tasks = plan.first72Hours || [];
    if (!tasks.length) { out.innerHTML = ''; return; }
    out.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<h3>Your starter 72-hour plan</h3>' +
      '<ul style="padding-left:20px;line-height:1.7;color:var(--ink-soft)">' +
      tasks.map(t => `<li>${escape(t)}</li>`).join('') +
      '</ul>' +
      '<div class="quiz-actions">' +
        '<button class="btn btn--primary btn--sm" type="button" data-fpp="dl">⬇ Download PDF</button>' +
        '<button class="btn btn--ghost btn--sm" type="button" data-fpp="print">Print</button>' +
      '</div>' +
      '<div class="fp-upgrade">' +
        '<div class="fp-upgrade__body">' +
          '<strong>Take this further.</strong>' +
          '<span>Open the <em>customizable plan</em> — income, expenses, debts, goals, documents, and a live plan-health score. Your 72-hour starter carries over automatically.</span>' +
        '</div>' +
        '<a class="btn btn--primary btn--sm" href="./planner.html">Open the customizable plan →</a>' +
      '</div>';
    card.querySelector('[data-fpp="dl"]').addEventListener('click', () => downloadStarter(tasks, plan.needs, false));
    card.querySelector('[data-fpp="print"]').addEventListener('click', () => downloadStarter(tasks, plan.needs, true));
    out.appendChild(card);
  }

  function downloadStarter(tasks, needs, autoPrint) {
    const checked = (needs || []).map(n => LABEL[n] || n).join(' · ');
    const today = new Date().toLocaleDateString();
    const items = tasks.map(t => `<li>${escape(t)}</li>`).join('');
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"/>' +
      '<meta name="viewport" content="width=device-width, initial-scale=1"/>' +
      '<title>My 72-hour plan — TLM Finance</title>' +
      '<style>@page{margin:18mm}*{box-sizing:border-box}body{font:14px/1.55 -apple-system,BlinkMacSystemFont,Segoe UI,Inter,Arial,sans-serif;color:#0E0E0E;background:#fff;margin:0;padding:28px}.head{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #DAA520;padding-bottom:14px;margin-bottom:22px}.brand{font-weight:900;font-size:1.1rem}.brand span{color:#8C6810}h1{font-size:1.6rem;margin:0 0 6px}.meta{color:#6B6B6B;font-size:.9rem;margin:0 0 22px}.chip{display:inline-block;background:#FFEFD0;color:#8C6810;padding:4px 10px;border-radius:999px;font-size:.8rem;font-weight:700;margin:0 6px 6px 0}ol{padding-left:22px}ol li{margin:0 0 10px;padding-left:6px}.footer{margin-top:36px;padding-top:14px;border-top:1px solid #E8E2D8;color:#6B6B6B;font-size:.82rem}@media print{body{padding:0}.noprint{display:none!important}}.btn{display:inline-block;background:#0E0E0E;color:#DAA520;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:700;border:0;cursor:pointer}</style>' +
      '</head><body>' +
      '<div class="head"><div class="brand">The Last Mile · <span>Finance</span></div><div class="meta">' + today + '</div></div>' +
      '<h1>Your starter 72-hour plan</h1>' +
      '<p class="meta">Personalized from the items you checked. Print this page or save as PDF on your phone.</p>' +
      (checked ? '<div><strong>Focused on:</strong><br/>' + (needs || []).map(n => '<span class="chip">' + escape(LABEL[n] || n) + '</span>').join('') + '</div>' : '') +
      '<div class="actions noprint"><button class="btn" onclick="window.print()">⬇ Save as PDF / Print</button></div>' +
      '<ol>' + (items || '<li>No items selected — go back and pick the needs that apply to you.</li>') + '</ol>' +
      '<div class="footer">Educational information, not legal or financial advice. Generated by The Last Mile · Finance — tlmfinance.netlify.app</div>' +
      (autoPrint ? '<script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 350); });<\/script>' : '') +
      '</body></html>';
    const w = window.open('', '_blank');
    if (!w) {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'tlm-72hour-plan-' + new Date().toISOString().slice(0,10) + '.html';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
      toast('Plan saved — open the file and use Print → Save as PDF.');
      return;
    }
    w.document.open(); w.document.write(html); w.document.close();
  }

  // ---- Open / close -----------------------------------------------------
  function open() {
    const p = document.getElementById('planPanel');
    if (!p) return;
    if (owns) renderQuiz();
    if (owns) renderQuizOutput();
    p.classList.add('is-open');
    p.setAttribute('aria-hidden', 'false');
    document.body.classList.add('plan-panel-open');
    setTimeout(() => p.querySelector('.quiz button, button')?.focus(), 80);
  }
  function close() {
    const p = document.getElementById('planPanel'); if (!p) return;
    p.classList.remove('is-open');
    p.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('plan-panel-open');
  }
  function toggle() {
    const p = document.getElementById('planPanel');
    if (p && (p.classList.contains('is-open') || p.getAttribute('aria-hidden') === 'false')) close();
    else open();
  }

  // ---- Boot -------------------------------------------------------------
  function boot() {
    owns = ensurePanel();
    // Always wire delegated click handlers — they coexist safely with app.js.
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-open-plan]')) { e.preventDefault(); open(); return; }
      if (!owns) return; // let app.js own #closePlan/#generate72/#openAdvancedFromPanel
      if (t.id === 'closePlan' || t.closest('#closePlan')) { close(); return; }
      if (t.id === 'generate72') { generate72(); return; }
      if (t.id === 'openAdvancedFromPanel') {
        e.preventDefault();
        if (typeof window.__tlmOpenFuturePlan === 'function') {
          close();
          window.__tlmOpenFuturePlan();
        } else {
          // page doesn't have the wizard loaded — go to planner.html which does
          location.href = './planner.html#wizard';
        }
        return;
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const p = document.getElementById('planPanel');
        if (p && (p.classList.contains('is-open') || p.getAttribute('aria-hidden') === 'false')) close();
      }
    });
    // Auto-open on #fpp URL hash
    if (location.hash === '#fpp') {
      setTimeout(open, 120);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ---- Public API -------------------------------------------------------
  window.TLMFreedomPlanPanel = { open, close, toggle };
})();
