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
        <p class="muted" style="margin-top:0">Pick everything that applies. We'll generate a 72-hour plan and link to resources. Want a deeper plan? <a href="./pages/planner.html">Open the customizable plan →</a></p>
        <div class="quiz" id="quiz"></div>
        <div class="flex mt-3">
          <button class="btn btn--primary" id="generate72">Generate my 72-hour plan</button>
          <a class="btn btn--dark" href="./pages/planner.html">Customizable plan →</a>
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
        '<a class="btn btn--primary btn--sm" href="./pages/planner.html">Open the customizable plan →</a>' +
      '</div>';
    card.querySelector('[data-fpp="dl"]').addEventListener('click', () => downloadStarter(tasks, plan.needs, false));
    card.querySelector('[data-fpp="print"]').addEventListener('click', () => downloadStarter(tasks, plan.needs, true));
    out.appendChild(card);
  }

  // True PDF download via jsPDF (loaded on demand from esm.sh).
  // Works on desktop + mobile — calls doc.save() which the browser treats
  // as an explicit file download, not a print preview.
  async function downloadStarter(tasks, needs /*, _printIgnored */) {
    const checked = (needs || []).map(n => LABEL[n] || n).join(' · ');
    const today = new Date().toLocaleDateString();
    const filename = 'tlm-72hour-plan-' + new Date().toISOString().slice(0, 10) + '.pdf';

    let jsPDF;
    try {
      const m = await import('https://esm.sh/jspdf@2.5.2');
      jsPDF = m.jsPDF || (m.default && m.default.jsPDF) || m.default;
      if (!jsPDF) throw new Error('jsPDF not found in module');
    } catch (e) {
      // Network or module failure — fall back to a plain-text download
      // so the user always gets a file, even offline.
      const txt = textFallback(tasks, needs, today);
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename.replace(/\.pdf$/, '.txt');
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
      toast('PDF library offline — saved as text file instead.');
      return;
    }

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 50; // margin
    let y = M;

    // Header bar (gold under the brand line)
    doc.setFillColor(218, 165, 32);
    doc.rect(M, M + 18, W - 2 * M, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text('The Last Mile · Finance', M, M);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(today, W - M, M, { align: 'right' });
    y = M + 50;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 20);
    doc.text('Your starter 72-hour plan', M, y);
    y += 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    const subLines = doc.splitTextToSize(
      'Personalized from the items you checked. Use this list to plan your first three days.',
      W - 2 * M
    );
    doc.text(subLines, M, y);
    y += subLines.length * 14 + 8;

    // Focus areas chips
    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(140, 104, 16);
      doc.text('FOCUSED ON', M, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const foc = doc.splitTextToSize(checked, W - 2 * M);
      doc.text(foc, M, y);
      y += foc.length * 14 + 18;
    }

    // Task list
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text('Action steps', M, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    const list = (tasks && tasks.length) ? tasks : ['No items selected — go back and pick the needs that apply to you.'];
    list.forEach((t, i) => {
      const num = String(i + 1).padStart(2, '0') + '.  ';
      const wrapped = doc.splitTextToSize(num + t, W - 2 * M - 6);
      // Page break if needed
      if (y + wrapped.length * 14 + 20 > H - M) {
        doc.addPage();
        y = M;
      }
      doc.text(wrapped, M, y);
      y += wrapped.length * 14 + 6;
    });

    // Footer
    if (y + 40 > H - M) { doc.addPage(); y = M; }
    y = H - M - 20;
    doc.setDrawColor(232, 226, 216);
    doc.line(M, y, W - M, y);
    y += 14;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Educational information, not legal or financial advice. Generated by The Last Mile · Finance · tlmfinance.netlify.app',
      M, y, { maxWidth: W - 2 * M }
    );

    doc.save(filename);
  }
  function textFallback(tasks, needs, today) {
    const checked = (needs || []).map(n => LABEL[n] || n).join(' · ');
    const lines = [];
    lines.push('The Last Mile · Finance');
    lines.push('Your starter 72-hour plan');
    lines.push(today);
    lines.push('');
    if (checked) { lines.push('Focused on: ' + checked); lines.push(''); }
    lines.push('Action steps:');
    (tasks || []).forEach((t, i) => lines.push((i + 1) + '. ' + t));
    if (!tasks || !tasks.length) lines.push('(no items selected)');
    lines.push('');
    lines.push('Educational information, not legal or financial advice.');
    lines.push('tlmfinance.netlify.app');
    return lines.join('\n');
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
      if (!owns) return; // let app.js own #closePlan / #generate72
      if (t.id === 'closePlan' || t.closest('#closePlan')) { close(); return; }
      if (t.id === 'generate72') { generate72(); return; }
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
