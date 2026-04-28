/**
 * app.js — main entry. Powers planner, Freedom Plan Panel, builders wall,
 * animated counters, parallax stars, particle field, marquee, confetti.
 */

import { Storage, emptyPlan } from './utils/storage.js';
import { totals, riskFlags, fmtMoney } from './utils/budgetCalculator.js';
import {
  exportJSON, exportCSV, printPlan, planToText, shareOrCopy, caseManagerEmail
} from './utils/exportPlan.js';

const state = { plan: Storage.load() || emptyPlan(), step: 0 };

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const el = (tag, props = {}, ...children) => {
  const n = Object.assign(document.createElement(tag), props);
  if (props.html) n.innerHTML = props.html;
  if (props.dataset) Object.entries(props.dataset).forEach(([k, v]) => (n.dataset[k] = v));
  children.flat().forEach(c => n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return n;
};
async function loadJSON(p) { const r = await fetch(p); if (!r.ok) throw new Error('Failed: ' + p); return r.json(); }

function persist() { state.plan.updatedAt = new Date().toISOString(); Storage.save(state.plan); renderSummary(); }

/* =====================================================================
   ATMOSPHERE — stars + particles
   ===================================================================== */
(function stars() {
  const c = document.getElementById('heroStars'); if (!c) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = c.getContext('2d');
  let w, h, dots = [];
  const N = 140;
  const resize = () => {
    w = c.width = c.offsetWidth * devicePixelRatio;
    h = c.height = c.offsetHeight * devicePixelRatio;
    dots = Array.from({ length: N }, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.7,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.6 + 0.2,
      tw: Math.random() * Math.PI * 2
    }));
  };
  const tick = (t) => {
    ctx.clearRect(0, 0, w, h);
    dots.forEach(d => {
      const tw = reduce ? 1 : (0.7 + 0.3 * Math.sin(t / 700 + d.tw));
      ctx.fillStyle = `rgba(255,255,255,${d.a * tw})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * devicePixelRatio, 0, Math.PI * 2); ctx.fill();
    });
    if (!reduce) requestAnimationFrame(tick);
  };
  resize(); addEventListener('resize', resize); requestAnimationFrame(tick);
})();

(function particles() {
  const c = document.getElementById('heroParticles'); if (!c) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = c.getContext('2d');
  let w, h, dots = [];
  const N = 50;
  const resize = () => {
    w = c.width = c.offsetWidth * devicePixelRatio;
    h = c.height = c.offsetHeight * devicePixelRatio;
    dots = Array.from({ length: N }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.6 + 0.4,
      vy: -(Math.random() * 0.35 + 0.05) * devicePixelRatio,
      vx: (Math.random() - 0.5) * 0.2,
      a: Math.random() * 0.5 + 0.2
    }));
  };
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    dots.forEach(d => {
      d.y += d.vy; d.x += d.vx;
      if (d.y < 0) { d.y = h; d.x = Math.random() * w; }
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(218,165,32,${d.a})`;
      ctx.fill();
    });
    requestAnimationFrame(tick);
  };
  resize(); addEventListener('resize', resize); tick();
})();

/* =====================================================================
   ANIMATED HERO COUNTERS
   ===================================================================== */
function animateCount(elNode, target, suffix = '') {
  if (!elNode) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { elNode.textContent = target.toLocaleString() + suffix; return; }
  const dur = 1600;
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const v = Math.round(target * ease(p));
    elNode.textContent = v.toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
(function startCounters() {
  const a = document.getElementById('counter-alumni');
  if (!a) return;
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    animateCount(document.getElementById('counter-alumni'),  1000);
    animateCount(document.getElementById('counter-employed'), 75, '%');
    animateCount(document.getElementById('counter-recid'),    8, '%');
  };
  // Three layers of insurance: fire on load, on raf, and on intersection.
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    requestAnimationFrame(() => setTimeout(fire, 200));
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(fire, 200), { once: true });
    window.addEventListener('load', () => setTimeout(fire, 200), { once: true });
  }
  // Belt-and-suspenders: also try after 800ms no matter what.
  setTimeout(fire, 800);
})();

/* =====================================================================
   REVEAL ON SCROLL
   ===================================================================== */
(function () {
  const io = new IntersectionObserver(entries =>
    entries.forEach(e => e.isIntersecting && e.target.classList.add('is-visible')),
    { threshold: 0.12 });
  $$('.section, .card, .stat, .act, .builder').forEach(n => { n.classList.add('reveal'); io.observe(n); });
})();

/* =====================================================================
   FREEDOM PLAN PANEL
   ===================================================================== */
const PANEL = $('#planPanel');
function openPanel()  { PANEL?.setAttribute('aria-hidden', 'false'); PANEL?.querySelector('button')?.focus(); }
function closePanel() { PANEL?.setAttribute('aria-hidden', 'true'); }

document.addEventListener('click', e => { if (e.target.closest('[data-open-plan]')) { e.preventDefault(); openPanel(); } });
$('#closePlan')?.addEventListener('click', closePanel);
$('#road')?.addEventListener('click', openPanel);
$('#road')?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(); } });

(function bindSwipe() {
  const r = $('#road'); if (!r) return;
  let startY = null;
  r.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  r.addEventListener('touchend', e => {
    if (startY == null) return;
    const dy = startY - (e.changedTouches[0]?.clientY ?? startY);
    if (dy > 30) openPanel();
    startY = null;
  });
})();

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

function renderQuiz() {
  const wrap = $('#quiz'); if (!wrap) return;
  wrap.innerHTML = '';
  NEEDS.forEach(n => {
    const b = el('button', { type: 'button' });
    const pressed = (state.plan.needs || []).includes(n.id);
    b.setAttribute('aria-pressed', pressed);
    b.textContent = `${n.icon}  ${n.label}`;
    b.addEventListener('click', () => {
      const i = state.plan.needs.indexOf(n.id);
      if (i >= 0) state.plan.needs.splice(i, 1); else state.plan.needs.push(n.id);
      b.setAttribute('aria-pressed', state.plan.needs.includes(n.id));
      persist();
    });
    wrap.appendChild(b);
  });
}

// Map of which tasks belong to which selected need — keep available so we
// can rebuild the "only checked" list on every regeneration / PDF export.
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

function tasksFromCheckedNeeds() {
  const tasks = [];
  (state.plan.needs || []).forEach(n => (NEED_TASKS[n] || []).forEach(t => tasks.push(t)));
  return tasks;
}

function generate72() {
  if (!(state.plan.needs || []).length) {
    toast('Pick at least one need above first.');
    return;
  }
  // ONLY include items for needs the user actually checked. Replace, don't
  // accumulate, so unchecking a need removes its tasks on regeneration.
  state.plan.first72Hours = tasksFromCheckedNeeds();
  persist();
  renderQuizOutput();
  fireConfetti();
}

function renderQuizOutput() {
  const out = $('#quizOutput'); if (!out) return;
  if (!state.plan.first72Hours.length) { out.innerHTML = ''; return; }
  out.innerHTML = '';
  const card = el('div', { className: 'card' });
  card.appendChild(el('h3', { textContent: 'Your starter 72-hour plan' }));
  const ul = el('ul', {});
  ul.style.cssText = 'padding-left:20px;line-height:1.7;color:var(--ink-soft)';
  state.plan.first72Hours.forEach(t => ul.appendChild(el('li', { textContent: t })));
  card.appendChild(ul);

  // Action row — Download PDF / Save to phone / Print
  const row = el('div', { className: 'quiz-actions' });
  const dlBtn = el('button', { type: 'button', className: 'btn btn--primary btn--sm', textContent: '⬇ Download PDF' });
  dlBtn.addEventListener('click', () => downloadStarterPlanPDF(state.plan.first72Hours, state.plan.needs));
  const printBtn = el('button', { type: 'button', className: 'btn btn--ghost btn--sm', textContent: 'Print' });
  printBtn.addEventListener('click', () => downloadStarterPlanPDF(state.plan.first72Hours, state.plan.needs, true));
  row.append(dlBtn, printBtn);
  card.appendChild(row);

  out.appendChild(card);
}

/* Build a clean, printable HTML window and trigger the OS print/Save-as-PDF
   sheet. On iOS Safari and Android Chrome this opens the share/print
   menu where users pick "Save to Files" or "Print → Save as PDF" — no
   library required. */
function downloadStarterPlanPDF(tasks, needs, autoPrint = true) {
  const safe = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const labelMap = { money:'Money plan', docs:'ID & documents', job:'Job path', housing:'Housing', edu:'Education', transit:'Transportation', health:'Health & meds', family:'Family support' };
  const checked = (needs || []).map(n => labelMap[n] || n).join(' · ');
  const today = new Date().toLocaleDateString();
  const items = tasks.map(t => `<li>${safe(t)}</li>`).join('');

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>My 72-hour plan — The Last Mile · Finance</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif; color: #0E0E0E; background: #fff; margin: 0; padding: 28px; line-height: 1.55; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #DAA520; padding-bottom: 14px; margin-bottom: 22px; }
  .brand { font-weight: 900; font-size: 1.1rem; letter-spacing: .02em; }
  .brand span { color: #8C6810; }
  h1 { font-size: 1.6rem; margin: 0 0 6px; }
  .meta { color: #6B6B6B; font-size: .9rem; margin: 0 0 22px; }
  .chips { margin: 0 0 18px; }
  .chip { display: inline-block; background: #FFEFD0; color: #8C6810; padding: 4px 10px; border-radius: 999px; font-size: .8rem; font-weight: 700; margin: 0 6px 6px 0; }
  ol { padding-left: 22px; }
  ol li { margin: 0 0 10px; padding-left: 6px; }
  .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #E8E2D8; color: #6B6B6B; font-size: .82rem; }
  @media print {
    body { padding: 0; }
    .noprint { display: none !important; }
  }
  .actions { margin: 0 0 18px; }
  .btn { display: inline-block; background: #0E0E0E; color: #DAA520; padding: 10px 16px; border-radius: 999px; text-decoration: none; font-weight: 700; border: 0; cursor: pointer; }
</style></head><body>
  <div class="head">
    <div class="brand">The Last Mile · <span>Finance</span></div>
    <div class="meta">${today}</div>
  </div>
  <h1>Your starter 72-hour plan</h1>
  <p class="meta">Personalized from the items you checked. Print this page or save as PDF on your phone.</p>
  ${checked ? `<div class="chips"><strong>Focused on:</strong><br/>${(needs || []).map(n => `<span class="chip">${safe(labelMap[n] || n)}</span>`).join('')}</div>` : ''}
  <div class="actions noprint">
    <button class="btn" onclick="window.print()">⬇ Save as PDF / Print</button>
  </div>
  <ol>${items || '<li>No items selected — go back and pick the needs that apply to you.</li>'}</ol>
  <div class="footer">
    Educational information, not legal or financial advice. Generated by The Last Mile · Finance — tlmfinance.netlify.app
  </div>
  <script>
    ${autoPrint ? 'window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 350); });' : ''}
  </script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    // popup blocked — fall back to data: URL download so phones still get a file
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tlm-72hour-plan-${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
    toast('Plan saved — open the file and use Print → Save as PDF.');
    return;
  }
  w.document.open(); w.document.write(html); w.document.close();
}

// expose for the advanced wizard so it can reuse the same printable pipeline
window.__tlmDownloadPlanPDF = downloadStarterPlanPDF;

$('#generate72')?.addEventListener('click', generate72);

/* =====================================================================
   PLANNER
   ===================================================================== */
const STEPS = [
  { key: 'income',   title: 'Income',    hint: "Wages, gig work, family support — anything you'll receive monthly." },
  { key: 'benefits', title: 'Benefits',  hint: 'SNAP, TANF, unemployment, disability, veterans benefits.' },
  { key: 'expenses', title: 'Expenses',  hint: 'Rent, food, phone, transport, hygiene, medication, child support.' },
  { key: 'debts',    title: 'Debts',     hint: 'Restitution, court fees, credit cards, payday loans, medical bills.' },
  { key: 'goals',    title: 'Goals',     hint: 'Emergency fund, deposit on housing, course tuition, transportation.' },
  { key: 'documents',title: 'Documents', hint: 'ID, SS card, birth cert, resume, references, prescriptions.' },
  { key: 'days',     title: '72h / 30 / 60 / 90', hint: 'Sequence the next three months.' }
];

function renderSteps() {
  const wrap = $('#plannerSteps'); if (!wrap) return;
  wrap.innerHTML = '';
  STEPS.forEach((s, i) => {
    const b = el('button', { type: 'button', className: 'planner__step', textContent: `${i + 1}. ${s.title}` });
    b.setAttribute('role', 'tab');
    if (i === state.step) b.setAttribute('aria-current', 'true');
    if (i < state.step) b.classList.add('planner__step--done');
    b.addEventListener('click', () => { state.step = i; renderStep(); renderSteps(); });
    wrap.appendChild(b);
  });
}

function moneyRow(_, valKey, list, placeholder) {
  const wrap = el('div');
  list.forEach((row, i) => {
    const r = el('div', { className: 'row' });
    const labelInput = el('input', { type: 'text', value: row.label || '', placeholder });
    const amtInput = el('input', { type: 'number', value: row[valKey] ?? '', placeholder: 'Amount' });
    amtInput.setAttribute('inputmode', 'decimal');
    const del = el('button', { type: 'button', className: 'icon-btn', title: 'Remove', innerHTML: '&times;' });
    labelInput.addEventListener('input', () => { row.label = labelInput.value; persist(); });
    amtInput.addEventListener('input', () => { row[valKey] = parseFloat(amtInput.value) || 0; persist(); });
    del.addEventListener('click', () => { list.splice(i, 1); persist(); renderStep(); });
    r.append(labelInput, amtInput, del);
    wrap.appendChild(r);
  });
  const add = el('button', { type: 'button', className: 'btn btn--ghost btn--sm', textContent: '+ Add' });
  add.addEventListener('click', () => { list.push({ label: '', [valKey]: 0 }); persist(); renderStep(); });
  wrap.appendChild(add);
  return wrap;
}

function debtRows() {
  const wrap = el('div');
  state.plan.debts.forEach((d, i) => {
    const r = el('div', { className: 'row' });
    r.style.gridTemplateColumns = '1.4fr 1fr 1fr 1fr 36px';
    const label = el('input', { type: 'text', value: d.label || '', placeholder: 'Debt name' });
    const bal = el('input', { type: 'number', value: d.balance || '', placeholder: 'Balance' });
    const apr = el('input', { type: 'number', value: d.apr || '', placeholder: 'APR %' });
    const min = el('input', { type: 'number', value: d.minPayment || '', placeholder: 'Min/mo' });
    const del = el('button', { type: 'button', className: 'icon-btn', innerHTML: '&times;' });
    label.addEventListener('input', () => { d.label = label.value; persist(); });
    bal.addEventListener('input',   () => { d.balance = parseFloat(bal.value) || 0; persist(); });
    apr.addEventListener('input',   () => { d.apr = parseFloat(apr.value) || 0; persist(); });
    min.addEventListener('input',   () => { d.minPayment = parseFloat(min.value) || 0; persist(); });
    del.addEventListener('click',   () => { state.plan.debts.splice(i, 1); persist(); renderStep(); });
    r.append(label, bal, apr, min, del);
    wrap.appendChild(r);
  });
  const add = el('button', { type: 'button', className: 'btn btn--ghost btn--sm', textContent: '+ Add debt' });
  add.addEventListener('click', () => { state.plan.debts.push({ label: '', balance: 0, apr: 0, minPayment: 0 }); persist(); renderStep(); });
  wrap.appendChild(add);
  return wrap;
}

function goalsRows() {
  const wrap = el('div');
  state.plan.goals.forEach((g, i) => {
    const r = el('div', { className: 'row' });
    r.style.gridTemplateColumns = '1.4fr 130px 130px 36px';
    const label = el('input', { type: 'text', value: g.label || '', placeholder: 'Goal' });
    const monthly = el('input', { type: 'number', value: g.monthly || '', placeholder: '$/mo' });
    const target = el('input', { type: 'number', value: g.target || '', placeholder: 'Target $' });
    const del = el('button', { type: 'button', className: 'icon-btn', innerHTML: '&times;' });
    label.addEventListener('input', () => { g.label = label.value; g.kind = 'save'; persist(); });
    monthly.addEventListener('input', () => { g.monthly = parseFloat(monthly.value) || 0; persist(); });
    target.addEventListener('input', () => { g.target = parseFloat(target.value) || 0; persist(); });
    del.addEventListener('click', () => { state.plan.goals.splice(i, 1); persist(); renderStep(); });
    r.append(label, monthly, target, del);
    wrap.appendChild(r);
  });
  const add = el('button', { type: 'button', className: 'btn btn--ghost btn--sm', textContent: '+ Add goal' });
  add.addEventListener('click', () => { state.plan.goals.push({ label: '', monthly: 0, target: 0, kind: 'save' }); persist(); renderStep(); });
  wrap.appendChild(add);
  return wrap;
}

const DEFAULT_DOCS = [
  'Government photo ID', 'Social Security card', 'Birth certificate',
  'Court / sentencing paperwork', 'Resume', 'List of references',
  'Medical records / prescriptions', 'Bank account info', 'Lease / housing letter'
];

function docsList() {
  if ((state.plan.documents || []).length === 0) {
    state.plan.documents = DEFAULT_DOCS.map(label => ({ label, have: false }));
  }
  const wrap = el('div');
  state.plan.documents.forEach((d) => {
    const row = el('label', { style: 'display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)' });
    const cb = el('input', { type: 'checkbox', checked: !!d.have });
    cb.addEventListener('change', () => { d.have = cb.checked; persist(); });
    const t = el('span', { textContent: d.label });
    row.append(cb, t);
    wrap.appendChild(row);
  });
  const addRow = el('div', { className: 'row mt-2' });
  addRow.style.gridTemplateColumns = '1fr 100px';
  const inp = el('input', { type: 'text', placeholder: 'Add another document' });
  const add = el('button', { type: 'button', className: 'btn btn--ghost btn--sm', textContent: 'Add' });
  add.addEventListener('click', () => {
    if (!inp.value.trim()) return;
    state.plan.documents.push({ label: inp.value.trim(), have: false });
    inp.value = ''; persist(); renderStep();
  });
  addRow.append(inp, add); wrap.appendChild(addRow);
  return wrap;
}

function dayPlans() {
  const wrap = el('div');
  const groups = [
    { key: 'first72Hours', title: 'First 72 hours' },
    { key: 'thirtyDayPlan', title: '30 days' },
    { key: 'sixtyDayPlan',  title: '60 days' },
    { key: 'ninetyDayPlan', title: '90 days' }
  ];
  groups.forEach(g => {
    const card = el('div', { className: 'card', style: 'margin-bottom:14px' });
    card.appendChild(el('h3', { textContent: g.title, style: 'margin-top:0' }));
    const list = el('div');
    (state.plan[g.key] || []).forEach((task, i) => {
      const row = el('div', { className: 'row', style: 'grid-template-columns:1fr 36px' });
      const inp = el('input', { type: 'text', value: task });
      const del = el('button', { type: 'button', className: 'icon-btn', innerHTML: '&times;' });
      inp.addEventListener('input', () => { state.plan[g.key][i] = inp.value; persist(); });
      del.addEventListener('click', () => { state.plan[g.key].splice(i, 1); persist(); renderStep(); });
      row.append(inp, del); list.appendChild(row);
    });
    const addRow = el('div', { className: 'row', style: 'grid-template-columns:1fr 100px;margin-top:10px' });
    const inp = el('input', { type: 'text', placeholder: 'Add a step' });
    const add = el('button', { type: 'button', className: 'btn btn--ghost btn--sm', textContent: 'Add' });
    add.addEventListener('click', () => {
      if (!inp.value.trim()) return;
      state.plan[g.key] = (state.plan[g.key] || []).concat([inp.value.trim()]);
      inp.value = ''; persist(); renderStep();
    });
    addRow.append(inp, add);
    card.appendChild(list); card.appendChild(addRow);
    wrap.appendChild(card);
  });
  return wrap;
}

function renderStep() {
  const host = $('#plannerStep'); if (!host) return;
  host.innerHTML = '';
  const s = STEPS[state.step];
  const head = el('div');
  head.appendChild(el('h3', { textContent: s.title, style: 'margin-bottom:4px' }));
  head.appendChild(el('p', { className: 'muted', textContent: s.hint, style: 'margin-top:0' }));
  host.appendChild(head);

  switch (s.key) {
    case 'income':   host.appendChild(moneyRow('Income', 'amount', state.plan.income, 'Paycheck / gig / family')); break;
    case 'benefits': host.appendChild(moneyRow('Benefits', 'amount', state.plan.benefits, 'SNAP / TANF / UI / VA')); break;
    case 'expenses': host.appendChild(moneyRow('Expense', 'amount', state.plan.expenses, 'Rent / food / phone / bus')); break;
    case 'debts':    host.appendChild(debtRows()); break;
    case 'goals':    host.appendChild(goalsRows()); break;
    case 'documents':host.appendChild(docsList()); break;
    case 'days':     host.appendChild(dayPlans()); break;
  }
  const stepHint = $('#stepHint'); if (stepHint) stepHint.textContent = s.hint;
}

$('#prevStep')?.addEventListener('click', () => { state.step = Math.max(0, state.step - 1); renderStep(); renderSteps(); });
$('#nextStep')?.addEventListener('click', () => {
  state.step = Math.min(STEPS.length - 1, state.step + 1);
  if (state.step === STEPS.length - 1) fireConfetti();
  renderStep(); renderSteps();
});

function renderSummary() {
  if (!$('#kpiIncome')) return;
  const t = totals(state.plan);
  $('#kpiIncome').textContent = fmtMoney(t.monthlyIncome);
  $('#kpiExpenses').textContent = fmtMoney(t.monthlyExpenses + t.monthlyDebtPayments);
  const net = $('#kpiNet'); net.textContent = fmtMoney(t.net);
  net.style.color = t.net < 0 ? 'var(--tlm-danger)' : 'var(--tlm-success)';
  $('#kpiSavings').textContent = fmtMoney(t.savingsGoal);
  $('#ratioPct').textContent = Math.round(t.ratio * 100) + '%';
  $('#ratioFill').style.width = (t.ratio * 100).toFixed(0) + '%';

  const flagsHost = $('#riskFlags'); flagsHost.innerHTML = '';
  riskFlags(state.plan).forEach(f => {
    const c = el('div', { className: `callout ${f.kind === 'warn' ? 'callout--warn' : f.kind === 'ok' ? 'callout--ok' : 'callout--info'}`, textContent: f.text });
    flagsHost.appendChild(c);
  });
}

// --- Auth-gated save flow -----------------------------------------------
// Saving / exporting / sharing the plan triggers a non-blocking sign-in
// prompt the FIRST time only. Users who skip can still save locally —
// signing in just syncs across devices and unlocks the admin user list.
async function ensureSignedInForSave(reason) {
  if (!window.TLMAuth) return true;                 // auth.js not loaded yet
  if (window.TLMAuth.getUser()) return true;        // already signed in
  const u = await window.TLMAuth.requireSignIn({ reason });
  if (u && window.TLMAuth.logEvent) window.TLMAuth.logEvent('plan-saved', { plan_size: JSON.stringify(state.plan).length });
  return true;                                      // proceed either way (signed-in OR skipped)
}

$('#btnPrint')?.addEventListener('click', async () => {
  await ensureSignedInForSave('Sign in to keep your plan synced before printing.');
  printPlan();
});
$('#btnPrintMobile')?.addEventListener('click', async () => {
  await ensureSignedInForSave('Sign in to keep your plan synced before printing.');
  printPlan();
});
$('#btnExportJSON')?.addEventListener('click', async () => {
  await ensureSignedInForSave('Sign in to save your plan across devices before exporting.');
  exportJSON(state.plan);
});
$('#btnExportCSV')?.addEventListener('click', async () => {
  await ensureSignedInForSave('Sign in to save your plan across devices before exporting.');
  exportCSV(state.plan);
});
$('#btnSavePhone')?.addEventListener('click', async () => {
  await ensureSignedInForSave('Sign in to save your plan to your phone — and pick it back up later.');
  if (navigator.share) shareOrCopy(state.plan, 'share'); else printPlan();
});
$('#btnShare')?.addEventListener('click', async () => {
  const r = await shareOrCopy(state.plan, 'share');
  toast(r === 'shared' ? 'Shared.' : r === 'copied' ? 'Copied to clipboard.' : 'Could not share.');
});
$('#btnCopy')?.addEventListener('click', async () => {
  const r = await shareOrCopy(state.plan, 'copy');
  toast(r === 'copied' ? 'Plan copied.' : 'Could not copy.');
});
$('#btnCaseMgr')?.addEventListener('click', () => {
  const to = prompt('Case manager email (optional):', '') || '';
  location.href = caseManagerEmail(state.plan, to);
});

function toast(msg) {
  const t = el('div', { textContent: msg });
  Object.assign(t.style, {
    position: 'fixed', left: '50%', bottom: '90px', transform: 'translateX(-50%)',
    background: 'var(--tlm-charcoal)', color: 'var(--tlm-gold)',
    padding: '10px 16px', borderRadius: '999px', zIndex: 100,
    boxShadow: 'var(--shadow-md)', fontWeight: 700
  });
  document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}

/* =====================================================================
   STATIC SECTIONS — impact, resources, builders
   ===================================================================== */
(async function renderStatic() {
  try {
    const [stats, resources, people] = await Promise.all([
      loadJSON('./src/data/tlmStats.json'),
      loadJSON('./src/data/resources.json'),
      loadJSON('./src/data/people.json')
    ]);

    // Impact
    const impactGrid = $('#impactGrid');
    if (impactGrid) {
      stats.stats.forEach(s => {
        const c = el('div', { className: 'stat' });
        c.appendChild(el('div', { className: 'stat__num', textContent: s.value }));
        c.appendChild(el('div', { className: 'stat__label', textContent: s.label }));
        c.appendChild(el('div', { className: 'muted', textContent: s.context, style: 'color:rgba(255,255,255,.7);font-size:.9rem' }));
        c.appendChild(el('a', { className: 'stat__src', href: s.sourceUrl, target: '_blank', rel: 'noopener', textContent: `Source: ${s.source} (${s.year})` }));
        impactGrid.appendChild(c);
      });
    }

    // Resources w/ filters
    const grid = $('#resourceGrid');
    const filters = $('#resourceFilters');
    if (grid && filters) {
      const cats = ['all', ...new Set(resources.map(r => r.category))];
      let active = 'all';
      function paint() {
        grid.innerHTML = '';
        resources
          .filter(r => active === 'all' || r.category === active)
          .forEach(r => {
            const c = el('div', { className: 'card' });
            c.appendChild(el('div', { className: 'flex', innerHTML: `<span class="tag tag--gold">${r.category}</span><span class="tag tag--ghost">${r.location}</span><span class="tag tag--ghost">${r.cost}</span>` }));
            c.appendChild(el('h3', { textContent: r.title, style: 'margin:10px 0 4px' }));
            c.appendChild(el('p', { textContent: r.description }));
            c.appendChild(el('p', { className: 'muted', innerHTML: `<strong>Best for:</strong> ${r.bestFor}`, style: 'font-size:.9rem;margin-bottom:10px' }));
            c.appendChild(el('a', { className: 'btn btn--dark btn--sm', href: r.url, target: '_blank', rel: 'noopener', textContent: 'Visit resource →' }));
            c.appendChild(el('div', { className: 'card__meta', innerHTML: `<span>Source: ${r.source}</span><span>Last checked: ${r.lastChecked}</span>` }));
            grid.appendChild(c);
          });
      }
      cats.forEach(cat => {
        const b = el('button', { className: 'btn btn--ghost btn--sm', textContent: cat });
        if (cat === 'all') b.classList.add('btn--dark');
        b.addEventListener('click', () => {
          active = cat;
          $$('#resourceFilters .btn').forEach(x => x.classList.remove('btn--dark'));
          b.classList.add('btn--dark');
          paint();
        });
        filters.appendChild(b);
      });
      paint();
    }

    // Builders wall — polished cards with monogram avatars, role tag, and source link
    const buildersGrid = $('#buildersGrid');
    if (buildersGrid) {
      const ACCENTS = {
        warm:   { from: '#FFD970', to: '#DAA520' },
        deep:   { from: '#DAA520', to: '#7A5A0F' },
        bright: { from: '#FFE08A', to: '#B8860B' }
      };
      (people || []).slice(0, 6).forEach((p) => {
        const accent = ACCENTS[p.accent] || ACCENTS.warm;
        const initials = (p.initials || (p.name || 'TLM').split(/\s+/).map(s => s[0]).slice(0, 2).join('')).toUpperCase();
        const card = el('article', { className: 'builder' });
        card.setAttribute('role', 'article');
        if (p.alt) card.setAttribute('aria-label', p.alt);
        card.innerHTML =
          '<div class="builder__avatar" aria-hidden="true">' +
            '<svg viewBox="0 0 200 200">' +
              '<defs>' +
                '<radialGradient id="bgrad-' + initials + '" cx="50%" cy="35%" r="70%">' +
                  '<stop offset="0%"  stop-color="' + accent.from + '"/>' +
                  '<stop offset="100%" stop-color="' + accent.to + '"/>' +
                '</radialGradient>' +
              '</defs>' +
              '<circle cx="100" cy="100" r="92" fill="url(#bgrad-' + initials + ')"/>' +
              '<circle cx="100" cy="100" r="92" fill="none" stroke="rgba(14,14,14,.18)" stroke-width="2"/>' +
              '<text x="100" y="118" text-anchor="middle" font-family="Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif" ' +
                'font-size="78" font-weight="900" fill="#0E0E0E" letter-spacing="-2">' + initials + '</text>' +
            '</svg>' +
          '</div>' +
          (p.tag ? '<span class="builder__tag">' + p.tag + '</span>' : '') +
          '<h3 class="builder__name">' + (p.name || 'Builder') + '</h3>' +
          '<p class="builder__role">' + (p.role || '') + '</p>' +
          (p.summary ? '<p class="builder__story">' + p.summary + '</p>' : '') +
          (p.sourceUrl ? '<a class="builder__src" href="' + p.sourceUrl + '" target="_blank" rel="noopener">' +
            'Source · The Last Mile <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></a>' : '');
        buildersGrid.appendChild(card);
      });
    }
  } catch (err) {
    console.warn('renderStatic failed', err);
  }
})();
/* =====================================================================
   ADVANCED PLAN GENERATOR — produces a 72h / 30 / 60 / 90 / 180 / 365
   day plan from a few inputs. Saves into the same plan store so it
   prints / exports identically to the rest of the planner.
   ===================================================================== */
(function () {
  if (window.__tlmAdvancedLoaded) return;
  window.__tlmAdvancedLoaded = true;
  const $ = (s, r=document) => r.querySelector(s);

  const TEMPLATES = {
    job: {
      "first72Hours": [
        "Update resume — include TLM/inside training, certifications, and the timeline gap framed as growth",
        "Set up LinkedIn — headline = your skill, summary = your story in your words",
        "Apply to 3 fair-chance employers today (CareerOneStop > Reentry)",
        "Get government photo ID + Social Security card if missing"
      ],
      "thirtyDayPlan": [
        "Apply to 5 jobs/week — track in a sheet (company, role, contact, status)",
        "Visit local American Job Center for free resume review + interview prep",
        "Complete one free certificate — Google IT Support / AI Essentials / FDIC Money Smart",
        "Open a Bank On certified checking account (joinbankon.org)"
      ],
      "sixtyDayPlan": [
        "Aim for 2 first interviews — practice STAR answers on Big Interview or with TLM Helper",
        "Negotiate scheduling around any parole/probation appointments before signing offers",
        "Direct-deposit setup — split: 80% checking, 10% savings, 10% emergency"
      ],
      "ninetyDayPlan": [
        "Land a role or convert apprenticeship to full-time",
        "Lock in transportation + childcare backup",
        "Start credit-builder loan ($25–$50/mo on Self.inc or local credit union)"
      ],
      "halfYearPlan": [
        "Hit $1,000 emergency fund",
        "Earn one stackable credential (Coursera Google Cybersecurity, CompTIA, or AWS Cloud Practitioner)",
        "Pay off highest-APR debt first; keep paying minimums on others"
      ],
      "yearPlan": [
        "Earn promotion or change to higher-paying role",
        "File taxes via VITA — claim EITC if eligible",
        "Have 3 months of essential expenses saved",
        "Begin investing $50/month in a low-cost index fund (Fidelity ZERO, Vanguard VTI)"
      ]
    },
    school: {
      "first72Hours": [
        "Order school transcripts (high school, prior college)",
        "Email Project Rebound at the nearest CSU campus or your local community college reentry office",
        "Create FAFSA account at studentaid.gov — Pell Grant is restored for justice-impacted students"
      ],
      "thirtyDayPlan": [
        "Submit FAFSA",
        "Apply to 2 schools — community college + a 4-year transfer target",
        "Complete one Khan Academy diagnostic in math + reading to know your starting level",
        "Visit campus (or virtual tour) for the reentry/Project Rebound office"
      ],
      "sixtyDayPlan": [
        "Enroll for next term",
        "Apply for scholarships specifically for formerly incarcerated students (Beyond the Bars, Restoring Promise, BTNRC)",
        "Buy/rent textbooks via Library Genesis legal alts, Open Stax, library reserve"
      ],
      "ninetyDayPlan": [
        "Attend orientation",
        "Build a 4-semester course plan with the academic advisor",
        "Find a study buddy + commit to 8h/week study time"
      ],
      "halfYearPlan": [
        "Maintain 3.0+ GPA",
        "Apply for federal work-study or campus job",
        "Earn one CLEP or Sophia credit to accelerate"
      ],
      "yearPlan": [
        "30+ college credits earned",
        "Declare major; meet faculty in your field",
        "Apply for one summer internship or research assistantship"
      ]
    },
    business: {
      "first72Hours": [
        "Validate your idea — text 10 people in your target audience and ask if they'd pay for it",
        "Reserve domain + Instagram handle if relevant",
        "Open a free Square / Stripe / Shopify Lite account"
      ],
      "thirtyDayPlan": [
        "Apply for an EIN (free, IRS, online, 10 minutes)",
        "Register the business in your state (LLC ~ $50–$500 depending on state)",
        "Make 3 sales — even at a loss to learn the funnel",
        "Open a separate business bank account (LendingClub Tailored Checking is free)"
      ],
      "sixtyDayPlan": [
        "Apply for a Kiva microloan ($1k–$15k at 0% if approved)",
        "Connect with Defy Ventures CEO of Your New Life",
        "Hit $500 in revenue"
      ],
      "ninetyDayPlan": [
        "Get to $1,500/mo gross",
        "Build a simple website (free with Carrd, Bolt.new, or Hostinger)",
        "Set up bookkeeping in Wave (free)"
      ],
      "halfYearPlan": [
        "Hit $5,000/mo gross or break even",
        "Hire your first contractor",
        "Quarterly tax payments started"
      ],
      "yearPlan": [
        "$10k–$50k+ annual revenue",
        "Apply for SBA microloan or Hello Alice grant for growth",
        "Sign first commercial lease or move from home base if appropriate"
      ]
    },
    health: {
      "first72Hours": [
        "Refill prescriptions (call provider day 1) — most have a 30-day grace at release",
        "Schedule a primary-care visit",
        "Save crisis numbers: 988 (mental health), SAMHSA 1-800-662-4357"
      ],
      "thirtyDayPlan": [
        "Apply for Medicaid (state portal — most reentry states have streamlined enrollment)",
        "Find a sliding-scale clinic (HRSA find-a-clinic)",
        "Schedule dental + vision exams (often free at FQHCs)"
      ],
      "sixtyDayPlan": ["Build a daily routine — sleep, food, movement, sunlight", "Identify one accountability partner"],
      "ninetyDayPlan": ["Annual physical complete", "Mental-health support in place (group, therapy, peer)"],
      "halfYearPlan": ["Six months of consistent self-care", "Reduce or quit any substance use plan with provider"],
      "yearPlan": ["Stable health baseline", "Help one other returning citizen with their health plan"]
    }
  };

  function buildPlan(persona, opts) {
    const tpl = TEMPLATES[persona] || TEMPLATES.job;
    const customize = (arr) => arr.map(s =>
      s
        .replace(/\$1,000/g, opts.savings ? `$${opts.savings.toLocaleString()}` : "$1,000")
        .replace(/your skill/g, opts.skill || "your skill")
        .replace(/your city/g, opts.city || "your city")
    );
    return {
      first72Hours:    customize(tpl.first72Hours),
      thirtyDayPlan:   customize(tpl.thirtyDayPlan),
      sixtyDayPlan:    customize(tpl.sixtyDayPlan),
      ninetyDayPlan:   customize(tpl.ninetyDayPlan),
      halfYearPlan:    customize(tpl.halfYearPlan || []),
      yearPlan:        customize(tpl.yearPlan || [])
    };
  }

  function downloadAdvancedPlanPDF(plan, data) {
    const safe = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    const today = new Date().toLocaleDateString();
    const personas = { job: 'Job', school: 'School', business: 'Business', health: 'Health' };
    const personaLabel = personas[data.persona] || 'Reentry plan';
    const sections = [
      ['First 72 hours', plan.first72Hours],
      ['30 days',        plan.thirtyDayPlan],
      ['60 days',        plan.sixtyDayPlan],
      ['90 days',        plan.ninetyDayPlan],
      ['6 months',       plan.halfYearPlan],
      ['1 year',         plan.yearPlan]
    ].filter(s => (s[1] || []).length);

    const sectionHtml = sections.map(([title, list]) => `
      <section class="sec">
        <h2>${safe(title)}</h2>
        <ol>${list.map(t => `<li>${safe(t)}</li>`).join('')}</ol>
      </section>
    `).join('');

    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${safe(personaLabel)} plan — The Last Mile · Finance</title>
<style>
  @page { margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif; color: #0E0E0E; background: #fff; margin: 0; padding: 28px; line-height: 1.55; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #DAA520; padding-bottom: 14px; margin-bottom: 22px; }
  .brand { font-weight: 900; font-size: 1.1rem; }
  .brand span { color: #8C6810; }
  h1 { font-size: 1.7rem; margin: 0 0 6px; }
  .meta { color: #6B6B6B; font-size: .9rem; }
  .chips { margin: 6px 0 22px; }
  .chip { display: inline-block; background: #FFEFD0; color: #8C6810; padding: 4px 10px; border-radius: 999px; font-size: .8rem; font-weight: 700; margin: 0 6px 6px 0; }
  .sec { break-inside: avoid; margin: 0 0 18px; padding: 14px 16px; border: 1px solid #E8E2D8; border-left: 4px solid #DAA520; border-radius: 8px; background: #FFFBF0; }
  .sec h2 { margin: 0 0 8px; color: #8C6810; font-size: 1.05rem; letter-spacing: .04em; text-transform: uppercase; }
  ol { padding-left: 22px; margin: 0; }
  ol li { margin: 0 0 8px; padding-left: 4px; }
  .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #E8E2D8; color: #6B6B6B; font-size: .82rem; }
  .actions { margin: 0 0 18px; }
  .btn { display: inline-block; background: #0E0E0E; color: #DAA520; padding: 10px 16px; border-radius: 999px; font-weight: 700; border: 0; cursor: pointer; }
  @media print { body { padding: 0; } .noprint { display: none !important; } }
</style></head><body>
  <div class="head">
    <div class="brand">The Last Mile · <span>Finance</span></div>
    <div class="meta">${today}</div>
  </div>
  <h1>${safe(personaLabel)} — your full reentry plan</h1>
  <p class="meta">A structured 72-hour to 1-year plan personalized to your goals.</p>
  <div class="chips">
    ${data.skill ? `<span class="chip">Skill · ${safe(data.skill)}</span>` : ''}
    ${data.city ? `<span class="chip">City · ${safe(data.city)}</span>` : ''}
    ${data.savings ? `<span class="chip">Emergency target · $${Number(data.savings).toLocaleString()}</span>` : ''}
  </div>
  <div class="actions noprint">
    <button class="btn" onclick="window.print()">⬇ Save as PDF / Print</button>
  </div>
  ${sectionHtml || '<p>No tasks generated yet — go back and pick a focus.</p>'}
  <div class="footer">
    Educational information, not legal or financial advice. Generated by The Last Mile · Finance — tlmfinance.netlify.app
  </div>
  <script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 350); });</script>
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `tlm-plan-${data.persona || 'reentry'}-${new Date().toISOString().slice(0,10)}.html`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
      return;
    }
    w.document.open(); w.document.write(html); w.document.close();
  }

  // ---- Wizard auto-save / resume helpers (persist across sessions) ----
  const FP_STORE = 'tlm:fpWiz:v1';
  function loadFp()  { try { return JSON.parse(localStorage.getItem(FP_STORE) || '{}'); } catch { return {}; } }
  function saveFp(d, step, completed) {
    try {
      localStorage.setItem(FP_STORE, JSON.stringify(Object.assign({}, d, {
        step, completed: !!completed, updatedAt: Date.now()
      })));
    } catch {}
  }
  function clearFp() { try { localStorage.removeItem(FP_STORE); } catch {} }

  function inject() {
    const stepHost = $('#plannerStep')?.parentElement;
    if (!stepHost) return;
    if ($('#advBtn')) return;
    const wrap = document.createElement('div');
    wrap.className = 'mt-3';
    wrap.innerHTML = `
      <button id="advBtn" class="btn btn--primary btn--sm" type="button">⚡ Generate advanced future plan</button>
    `;
    stepHost.appendChild(wrap);

    $('#advBtn').addEventListener('click', () => openFuturePlanWizard());
    // Wire the panel's "Open full planner" button to launch the wizard too
    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'openAdvancedFromPanel') {
        e.preventDefault();
        openFuturePlanWizard();
      }
    });
    // Expose for any other entry point
    window.__tlmOpenFuturePlan = openFuturePlanWizard;

    // Resume nudge — once per session, if there's an in-progress wizard,
    // ask the user if they want to pick it back up.
    setTimeout(() => {
      const saved = loadFp();
      if (!saved || !saved.persona) return;
      if (saved.completed) return;
      if (sessionStorage.getItem('tlm:fpWiz:nudged')) return;
      try { sessionStorage.setItem('tlm:fpWiz:nudged', '1'); } catch {}
      const nudge = document.createElement('div');
      nudge.className = 'fp-resume-nudge';
      nudge.innerHTML =
        '<div class="fp-resume-nudge__body">' +
          '<strong>Pick your plan back up?</strong>' +
          '<span>You\'re on step ' + (saved.step || 1) + ' of your full planner.</span>' +
        '</div>' +
        '<button type="button" class="btn btn--primary btn--sm" data-fp-resume>Resume →</button>' +
        '<button type="button" class="fp-resume-nudge__close" aria-label="Dismiss">×</button>';
      document.body.appendChild(nudge);
      requestAnimationFrame(() => nudge.classList.add('is-in'));
      nudge.querySelector('[data-fp-resume]').addEventListener('click', () => {
        nudge.remove();
        openFuturePlanWizard();
      });
      nudge.querySelector('.fp-resume-nudge__close').addEventListener('click', () => nudge.remove());
      // auto-hide after 14s if untouched
      setTimeout(() => nudge.remove(), 14000);
    }, 8000);

    function openFuturePlanWizard() {
      if (document.getElementById('fpWizard')) return;
      const PERSONAS = [
        { id: 'job',      icon: '🛠️', title: 'Job',      tag: 'Land work fast',   desc: 'Resume, fair-chance employers, certifications, banking.' },
        { id: 'school',   icon: '🎓',       title: 'School',   tag: 'Get back in class',desc: 'Project Rebound, FAFSA, transfer plans, scholarships.' },
        { id: 'business', icon: '💼',       title: 'Business', tag: 'Start something',  desc: 'EIN, LLC, microloan, first sales, books in Wave.' },
        { id: 'health',   icon: '⚕️',       title: 'Health',   tag: 'Body & mind first',desc: 'Refill meds, Medicaid, sliding-scale clinic, peer support.' },
      ];
      const SKILLS = ['Coding', 'Sales', 'Welding', 'Design', 'Food service', 'Driving', 'Music', 'Construction', 'Trades', 'Writing', 'Customer service', 'Warehouse'];
      const REGIONS = ['California', 'Texas', 'New York', 'Florida', 'Illinois', 'Georgia', 'Michigan', 'Pennsylvania', 'Ohio', 'Other / national'];
      const EXTRAS = [
        { id: 'banking',  label: 'Open a bank account',     icon: '🏦' },
        { id: 'docs',     label: 'Replace ID & SS card',    icon: '🪪' },
        { id: 'housing',  label: 'Stable housing',          icon: '🏠' },
        { id: 'transit',  label: 'Daily transportation',    icon: '🚌' },
        { id: 'family',   label: 'Reconnect with family',   icon: '🤝' },
        { id: 'savings',  label: 'Build emergency fund',    icon: '💰' },
        { id: 'credit',   label: 'Build credit',            icon: '💳' },
        { id: 'tech',     label: 'Tech skills (AI, code)',  icon: '🤖' }
      ];
      const PACES = [
        { id: 'easy',       icon: '🌱', label: 'Take it easy',  desc: 'Health & stability first.' },
        { id: 'standard',   icon: '⚙️',  label: 'Standard',      desc: 'Steady balanced pace.' },
        { id: 'aggressive', icon: '🚀',  label: 'Aggressive',    desc: 'Move fast, big goals.' }
      ];

      const wiz = document.createElement('div');
      wiz.id = 'fpWizard';
      wiz.className = 'fp-wizard';
      wiz.setAttribute('role', 'dialog');
      wiz.setAttribute('aria-modal', 'true');
      wiz.setAttribute('aria-labelledby', 'fpWizTitle');

      const personaCards = PERSONAS.map(p =>
        '<button class="fp-persona" type="button" data-persona="' + p.id + '">' +
          '<span class="fp-persona__icon" aria-hidden="true">' + p.icon + '</span>' +
          '<span class="fp-persona__title">' + p.title + '</span>' +
          '<span class="fp-persona__tag">' + p.tag + '</span>' +
          '<span class="fp-persona__desc">' + p.desc + '</span>' +
        '</button>'
      ).join('');
      const skillChips  = SKILLS.map(s  => '<button type="button" class="fp-chip" data-skill="' + s + '">' + s + '</button>').join('');
      const regionChips = REGIONS.map(r => '<button type="button" class="fp-chip" data-region="' + r + '">' + r + '</button>').join('');
      const extrasChips = EXTRAS.map(x  => '<button type="button" class="fp-chip fp-chip--multi" data-extra="' + x.id + '"><span aria-hidden="true">' + x.icon + '</span> ' + x.label + '</button>').join('');
      const paceCards   = PACES.map(p   => '<button type="button" class="fp-pace" data-pace="' + p.id + '"><span class="fp-pace__icon" aria-hidden="true">' + p.icon + '</span><span class="fp-pace__label">' + p.label + '</span><span class="fp-pace__desc">' + p.desc + '</span></button>').join('');

      wiz.innerHTML =
        '<div class="fp-wizard__scrim" data-fp-close></div>' +
        '<div class="fp-wizard__panel" role="document">' +
          '<button class="fp-wizard__close" type="button" aria-label="Close" data-fp-close>×</button>' +
          '<div class="fp-wizard__progress" aria-hidden="true"><span class="fp-wizard__bar"></span></div>' +
          '<div class="fp-wizard__steps">' +

            '<section class="fp-step is-active" data-step="1">' +
              '<p class="fp-eyebrow">Step 1 of 5</p>' +
              '<h2 id="fpWizTitle">Pick the focus that fits you right now.</h2>' +
              '<p class="fp-sub">We\'ll build a 72-hour, 30/60/90-day, 6-month and 1-year plan around it. Change anything later.</p>' +
              '<div class="fp-personas">' + personaCards + '</div>' +
            '</section>' +

            '<section class="fp-step" data-step="2">' +
              '<p class="fp-eyebrow">Step 2 of 5 · Optional</p>' +
              '<h2>What\'s your strongest skill?</h2>' +
              '<p class="fp-sub">Tap one — or skip and add your own.</p>' +
              '<div class="fp-chips" id="fpSkillChips">' + skillChips + '</div>' +
              '<input class="fp-input" id="fpSkill" type="text" placeholder="Or type your own (optional)" autocomplete="off" />' +
            '</section>' +

            '<section class="fp-step" data-step="3">' +
              '<p class="fp-eyebrow">Step 3 of 5 · Optional</p>' +
              '<h2>Where are you rebuilding?</h2>' +
              '<p class="fp-sub">Tap your state, then add a city if you want.</p>' +
              '<div class="fp-chips" id="fpRegionChips">' + regionChips + '</div>' +
              '<input class="fp-input" id="fpCity" type="text" placeholder="City or neighborhood (optional)" autocomplete="off" />' +
              '<details class="fp-more"><summary>+ More options</summary>' +
                '<p class="fp-sub" style="margin-top:14px">Anything else worth covering in your plan?</p>' +
                '<div class="fp-chips" id="fpExtrasChips">' + extrasChips + '</div>' +
              '</details>' +
            '</section>' +

            '<section class="fp-step" data-step="4">' +
              '<p class="fp-eyebrow">Step 4 of 5</p>' +
              '<h2>Pace + emergency fund.</h2>' +
              '<p class="fp-sub">Pick your pace, then drag the dial for your 3-month savings target.</p>' +
              '<div class="fp-paces" id="fpPaces">' + paceCards + '</div>' +
              '<div class="fp-dial">' +
                '<input class="fp-range" id="fpSavings" type="range" min="500" max="10000" step="100" value="1000" />' +
                '<div class="fp-dial__readout"><span id="fpSavingsAmt">$1,000</span></div>' +
                '<div class="fp-dial__ticks" aria-hidden="true"><span>$500</span><span>$2.5k</span><span>$5k</span><span>$7.5k</span><span>$10k</span></div>' +
              '</div>' +
            '</section>' +

            '<section class="fp-step" data-step="5">' +
              '<p class="fp-eyebrow">Almost there</p>' +
              '<h2>Here\'s your custom plan.</h2>' +
              '<div class="fp-preview" id="fpPreview"></div>' +
            '</section>' +

            '<section class="fp-step" data-step="6">' +
              '<p class="fp-eyebrow">Done</p>' +
              '<h2>Plan saved to this device.</h2>' +
              '<p class="fp-sub">Tasks added to the Planner below. Print, export, or share when you\'re ready.</p>' +
              '<div class="fp-confetti" aria-hidden="true">' +
                '<span></span><span></span><span></span><span></span><span></span>' +
                '<span></span><span></span><span></span><span></span><span></span>' +
                '<span></span><span></span><span></span><span></span><span></span>' +
              '</div>' +
            '</section>' +

          '</div>' +
          '<footer class="fp-wizard__nav">' +
            '<button class="btn btn--dark btn--sm" type="button" data-fp-pdf hidden>⬇ Download PDF</button>' +
            '<button class="btn btn--ghost btn--sm" type="button" data-fp-back>← Back</button>' +
            '<button class="btn btn--primary btn--sm" type="button" data-fp-next>Next →</button>' +
          '</footer>' +
        '</div>';
      document.body.appendChild(wiz);
      requestAnimationFrame(() => wiz.classList.add('is-open'));

      // Restore prior progress if any
      const restored = loadFp();
      const data = {
        persona: restored.persona || '',
        skill:   restored.skill   || '',
        city:    restored.city    || '',
        region:  restored.region  || '',
        extras:  Array.isArray(restored.extras) ? restored.extras : [],
        pace:    restored.pace    || 'standard',
        savings: typeof restored.savings === 'number' ? restored.savings : 1000
      };
      let step = (restored.step && !restored.completed) ? Math.min(restored.step, 5) : 1;
      const TOTAL = 6;
      const W = (s) => wiz.querySelector(s);
      const Wa = (s) => Array.from(wiz.querySelectorAll(s));

      function setStep(n) {
        step = Math.max(1, Math.min(TOTAL, n));
        Wa('.fp-step').forEach(el => el.classList.toggle('is-active', el.dataset.step === String(step)));
        const pct = ((step - 1) / (TOTAL - 1)) * 100;
        W('.fp-wizard__bar').style.width = pct + '%';
        const back = W('[data-fp-back]');
        const next = W('[data-fp-next]');
        const pdf  = W('[data-fp-pdf]');
        back.disabled = step === 1 || step === TOTAL;
        if (step === TOTAL) next.textContent = 'Close';
        else if (step === 5) next.textContent = 'Save my plan ✓';
        else next.textContent = 'Next →';
        next.disabled = (step === 1 && !data.persona);
        // Show "Download PDF" on the preview step (5) and the done step (6)
        if (pdf) pdf.hidden = !(step === 5 || step === TOTAL);
        if (step === 5) renderPreview();
        if (step === TOTAL) fireWizConfetti(wiz);
        // Persist on every step transition so the user can resume
        saveFp(data, step, step === TOTAL);
        setTimeout(() => {
          const live = W('.fp-step.is-active');
          const focusable = live && live.querySelector('input, button:not([data-fp-close])');
          if (focusable) focusable.focus({ preventScroll: true });
        }, 60);
      }

      // ----- Persona -----
      Wa('.fp-persona').forEach(b => {
        b.addEventListener('click', () => {
          Wa('.fp-persona').forEach(x => x.classList.remove('is-selected'));
          b.classList.add('is-selected');
          data.persona = b.dataset.persona;
          W('[data-fp-next]').disabled = false;
          saveFp(data, step);
        });
        if (data.persona && b.dataset.persona === data.persona) b.classList.add('is-selected');
      });

      // ----- Skill chips + free text -----
      Wa('#fpSkillChips .fp-chip').forEach(b => {
        b.addEventListener('click', () => {
          Wa('#fpSkillChips .fp-chip').forEach(x => x.classList.remove('is-selected'));
          b.classList.add('is-selected');
          data.skill = b.dataset.skill;
          W('#fpSkill').value = data.skill;
          saveFp(data, step);
        });
        if (data.skill && b.dataset.skill === data.skill) b.classList.add('is-selected');
      });
      W('#fpSkill').value = data.skill || '';
      W('#fpSkill').addEventListener('input', () => {
        data.skill = W('#fpSkill').value.trim();
        // typing custom skill clears chip selection
        Wa('#fpSkillChips .fp-chip').forEach(x => x.classList.remove('is-selected'));
        saveFp(data, step);
      });

      // ----- Region chips + city free text + extras -----
      Wa('#fpRegionChips .fp-chip').forEach(b => {
        b.addEventListener('click', () => {
          Wa('#fpRegionChips .fp-chip').forEach(x => x.classList.remove('is-selected'));
          b.classList.add('is-selected');
          data.region = b.dataset.region;
          saveFp(data, step);
        });
        if (data.region && b.dataset.region === data.region) b.classList.add('is-selected');
      });
      W('#fpCity').value = data.city || '';
      W('#fpCity').addEventListener('input', () => {
        data.city = W('#fpCity').value.trim();
        saveFp(data, step);
      });

      Wa('#fpExtrasChips .fp-chip').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.extra;
          const i = data.extras.indexOf(id);
          if (i >= 0) { data.extras.splice(i, 1); b.classList.remove('is-selected'); }
          else        { data.extras.push(id);     b.classList.add('is-selected'); }
          saveFp(data, step);
        });
        if (data.extras.includes(b.dataset.extra)) b.classList.add('is-selected');
      });

      // ----- Pace -----
      Wa('#fpPaces .fp-pace').forEach(b => {
        b.addEventListener('click', () => {
          Wa('#fpPaces .fp-pace').forEach(x => x.classList.remove('is-selected'));
          b.classList.add('is-selected');
          data.pace = b.dataset.pace;
          saveFp(data, step);
        });
        if (data.pace && b.dataset.pace === data.pace) b.classList.add('is-selected');
      });

      // ----- Savings dial -----
      const range = W('#fpSavings');
      const readout = W('#fpSavingsAmt');
      range.value = data.savings || 1000;
      function updateAmt() {
        const v = parseInt(range.value, 10) || 0;
        data.savings = v;
        readout.textContent = '$' + v.toLocaleString();
        const pct = (v - 500) / (10000 - 500);
        range.style.background = 'linear-gradient(90deg, #DAA520 0%, #FFD970 ' + (pct*100) + '%, rgba(255,255,255,.12) ' + (pct*100) + '%, rgba(255,255,255,.12) 100%)';
        saveFp(data, step);
      }
      range.addEventListener('input', updateAmt);
      updateAmt();

      function combinedCity() {
        // Merge free-text city with chip-selected region for the plan engine
        const c = (W('#fpCity').value || '').trim();
        if (c && data.region) return c + ', ' + data.region;
        return c || data.region || '';
      }

      function renderPreview() {
        data.skill   = (W('#fpSkill').value || '').trim();
        data.city    = (W('#fpCity').value || '').trim();
        data.savings = parseInt(W('#fpSavings').value, 10) || 1000;
        const plan = buildPlan(data.persona, { skill: data.skill, city: combinedCity(), savings: data.savings });
        // Pace + extras: prepend extras-driven tasks to first 72h to reflect the user's choices
        if (data.extras && data.extras.length) {
          const extraMap = {
            banking:  'Open a Bank On certified checking account (joinbankon.org)',
            docs:     'Replace ID + Social Security card (ssa.gov/number-card, DMV)',
            housing:  'Confirm housing for tonight + next 7 nights · call 211 if unstable',
            transit:  'Pick a daily transit plan and a backup ride contact',
            family:   'Reconnect with one supportive person today',
            savings:  'Auto-transfer $10/week from checking → savings',
            credit:   'Open a secured / credit-builder card (Self.inc or local CU)',
            tech:     'Take one free AI / coding course (Google AI Essentials, Khan Academy)'
          };
          const adds = data.extras.map(e => extraMap[e]).filter(Boolean);
          plan.first72Hours = Array.from(new Set([].concat(adds, plan.first72Hours)));
        }
        const sections = [
          ['First 72 hours', plan.first72Hours],
          ['30 days',        plan.thirtyDayPlan],
          ['60 days',        plan.sixtyDayPlan],
          ['90 days',        plan.ninetyDayPlan],
          ['6 months',       plan.halfYearPlan],
          ['1 year',         plan.yearPlan],
        ];
        const total = sections.reduce((s, pair) => s + pair[1].length, 0);
        const cols = sections.map(pair => {
          const label = pair[0]; const list = pair[1];
          const items = list.slice(0, 2).map(t =>
            '<li>' + (t.length > 80 ? (t.slice(0, 77) + '…') : t) + '</li>'
          ).join('');
          return '<div class="fp-preview__col">' +
                   '<div class="fp-preview__label">' + label + '</div>' +
                   '<div class="fp-preview__count">' + list.length + '</div>' +
                   '<ul>' + items + '</ul>' +
                 '</div>';
        }).join('');
        const paceLabel = ({ easy:'Take it easy', standard:'Standard', aggressive:'Aggressive' })[data.pace] || 'Standard';
        W('#fpPreview').innerHTML =
          '<div class="fp-preview__chips">' +
            '<span class="fp-preview__chip">Pace · ' + paceLabel + '</span>' +
            (data.skill  ? '<span class="fp-preview__chip">Skill · ' + data.skill + '</span>'   : '') +
            (data.region ? '<span class="fp-preview__chip">Region · ' + data.region + '</span>' : '') +
            (data.city   ? '<span class="fp-preview__chip">City · '   + data.city   + '</span>' : '') +
            (data.extras && data.extras.length ? '<span class="fp-preview__chip">+' + data.extras.length + ' extras</span>' : '') +
          '</div>' +
          '<p class="fp-preview__total"><strong>' + total + '</strong> personalized tasks across 6 horizons.</p>' +
          '<div class="fp-preview__grid">' + cols + '</div>';
        // expose for PDF
        wiz.__lastPlan = plan;
      }

      function applyPlan() {
        const plan = wiz.__lastPlan || buildPlan(data.persona, { skill: data.skill, city: combinedCity(), savings: data.savings });
        try {
          const raw = localStorage.getItem('paving-the-road:plan:v1');
          const stored = raw ? JSON.parse(raw) : {};
          Object.keys(plan).forEach(k => {
            stored[k] = Array.from(new Set([].concat(stored[k] || [], plan[k])));
          });
          stored.updatedAt = new Date().toISOString();
          localStorage.setItem('paving-the-road:plan:v1', JSON.stringify(stored));
        } catch (e) {}
        // mark wizard as completed so the resume nudge stops appearing
        saveFp(data, TOTAL, true);
      }

      W('[data-fp-back]').addEventListener('click', () => setStep(step - 1));
      W('[data-fp-next]').addEventListener('click', () => {
        if (step === 1 && !data.persona) return;
        if (step === 5) { applyPlan(); setStep(6); return; }
        if (step === TOTAL) { closeWiz(true); return; }
        setStep(step + 1);
      });
      // Download a structured PDF of the full advanced plan
      W('[data-fp-pdf]').addEventListener('click', () => {
        data.skill   = (W('#fpSkill').value || '').trim();
        data.city    = (W('#fpCity').value || '').trim();
        data.savings = parseInt(W('#fpSavings').value, 10) || 1000;
        const plan = wiz.__lastPlan || buildPlan(data.persona, { skill: data.skill, city: combinedCity(), savings: data.savings });
        downloadAdvancedPlanPDF(plan, data);
      });
      Wa('[data-fp-close]').forEach(el => el.addEventListener('click', () => closeWiz(false)));
      function escListener(e) { if (e.key === 'Escape') closeWiz(false); }
      document.addEventListener('keydown', escListener);

      function closeWiz(reload) {
        document.removeEventListener('keydown', escListener);
        wiz.classList.remove('is-open');
        setTimeout(() => {
          wiz.remove();
          if (reload) { location.hash = '#planner'; location.reload(); }
        }, 280);
      }

      function fireWizConfetti(host) {
        host.querySelectorAll('.fp-confetti span').forEach((s, i) => {
          s.style.left = (5 + Math.random() * 90) + '%';
          s.style.animationDelay = (i * 0.08) + 's';
        });
      }

      // Resume to the saved step, or start fresh if nothing useful is stored
      setStep(step || 1);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();

/* Pointer glow on hero */
(function pointerGlow() {
  const hero = document.querySelector('.hero'); if (!hero) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
})();

/* =====================================================================
   PLANNER INIT — fire all initial renders so the UI actually shows up
   ===================================================================== */
(function bootPlanner() {
  const boot = () => {
    try { if (document.getElementById('plannerSteps')) renderSteps(); } catch (e) { console.warn('renderSteps', e); }
    try { if (document.getElementById('plannerStep'))  renderStep();  } catch (e) { console.warn('renderStep', e); }
    try { if (document.getElementById('quiz'))         renderQuiz();  } catch (e) { console.warn('renderQuiz', e); }
    try { if (document.getElementById('quizOutput'))   renderQuizOutput(); } catch (e) { console.warn('renderQuizOutput', e); }
    try { if (document.getElementById('kpiIncome'))    renderSummary(); } catch (e) { console.warn('renderSummary', e); }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    // already past DOMContentLoaded
    boot();
  }
})();

/* =====================================================================
   ANIMATED NAV — link underline, active highlight, mobile slide,
   smooth scroll, scroll-progress bar, button ripple, page-fade
   ===================================================================== */
(function navAnimations() {
  const nav = document.querySelector('.nav'); if (!nav) return;

  // Build a scroll-progress bar at the top
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? Math.min(1, scrollY / max) : 0;
    bar.style.transform = `scaleX(${pct})`;
    nav.classList.toggle('nav--shrunk', scrollY > 30);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Active-link highlight by URL pathname
  const here = location.pathname.split('/').pop().toLowerCase() || 'index.html';
  document.querySelectorAll('.nav__links a, .bottom-nav a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    const file = href.replace(/^\.\//, '').split('#')[0];
    if (file && file === here) a.setAttribute('aria-current', 'page');
  });

  // Smooth-scroll anchors and slow-fade page transitions on internal links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
  });

  // Page-out fade for internal navigation
  document.querySelectorAll('a[href$=".html"]').forEach(a => {
    if (a.target === '_blank') return;
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      e.preventDefault();
      document.body.classList.add('page-leaving');
      setTimeout(() => { location.href = a.href; }, 220);
    });
  });

  // Subtle ripple on .btn clicks
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn'); if (!b) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = b.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'btn-ripple';
    dot.style.left = (e.clientX - r.left) + 'px';
    dot.style.top  = (e.clientY - r.top)  + 'px';
    b.appendChild(dot);
    setTimeout(() => dot.remove(), 700);
  });

  // Reveal-on-scroll for any node with .reveal-on-scroll OR data-reveal
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-visible');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });
  document.querySelectorAll('.reveal-on-scroll, [data-reveal]').forEach(n => io.observe(n));
})();

/* =====================================================================
   PAGE-IN FADE — fades main content in on first paint
   ===================================================================== */
(function pageIn() {
  document.body.classList.add('page-entering');
  const reveal = () => requestAnimationFrame(() => document.body.classList.add('page-entered'));
  if (document.readyState === 'complete' || document.readyState === 'interactive') reveal();
  else document.addEventListener('DOMContentLoaded', reveal, { once: true });
})();

/* =====================================================================
   PWA — Add-to-Home prompt + standalone class
   ===================================================================== */
(function pwaInstall() {
  const isStandalone = matchMedia('(display-mode: standalone)').matches ||
                       matchMedia('(display-mode: window-controls-overlay)').matches ||
                       window.navigator.standalone === true;
  if (isStandalone) {
    document.documentElement.classList.add('is-standalone');
    return;
  }

  // Show the "Install app" CTA on both mobile and desktop.
  const ua = navigator.userAgent || '';

  // Skip if user dismissed within last 7 days
  try {
    const dismissed = parseInt(localStorage.getItem('tlm:pwa:dismissed') || '0', 10);
    if (dismissed && Date.now() - dismissed < 7 * 24 * 3600 * 1000) return;
  } catch {}

  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    showCTA();
  });

  function showCTA() {
    if (document.querySelector('.pwa-install-cta')) return;
    const cta = document.createElement('div');
    cta.className = 'pwa-install-cta';
    cta.setAttribute('role', 'button');
    cta.setAttribute('aria-label', 'Install The Last Mile · Finance as an app');
    cta.innerHTML =
      '<span class="pwa-install-cta__icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>' +
      '</span>' +
      '<span>Install app</span>' +
      '<button class="pwa-install-cta__close" aria-label="Dismiss" type="button">×</button>';
    document.body.appendChild(cta);
    cta.querySelector('.pwa-install-cta__close').addEventListener('click', (ev) => {
      ev.stopPropagation();
      cta.remove();
      try { localStorage.setItem('tlm:pwa:dismissed', String(Date.now())); } catch {}
    });
    cta.addEventListener('click', async () => {
      if (deferred) {
        deferred.prompt();
        const choice = await deferred.userChoice.catch(() => null);
        deferred = null;
        cta.remove();
        if (choice && choice.outcome === 'accepted') {
          try { localStorage.setItem('tlm:pwa:installed', String(Date.now())); } catch {}
        }
      } else {
        // iOS / Safari fallback: explain manual install
        alert('To install: tap the Share button, then choose "Add to Home Screen".');
        cta.remove();
        try { localStorage.setItem('tlm:pwa:dismissed', String(Date.now())); } catch {}
      }
    });
  }

  // iOS Safari has no beforeinstallprompt; show CTA after first interaction
  const isIOS = /iPhone|iPad|iPod/.test(ua) && !/(CriOS|FxiOS)/.test(ua);
  if (isIOS) {
    window.addEventListener('load', () => setTimeout(showCTA, 4000), { once: true });
  }
})();
