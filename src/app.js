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

function generate72() {
  const tasks = new Set(state.plan.first72Hours || []);
  const map = {
    money:   ['Open a checking account or activate prepaid card', 'Pull free credit report at AnnualCreditReport.com', 'List your one-time release funds and first paycheck date'],
    docs:    ['Locate or request birth certificate', 'Replace Social Security card at ssa.gov/number-card', 'Apply for state ID at the DMV'],
    job:     ['Update resume with TLM/work-while-incarcerated experience', 'Visit a CareerOneStop / American Job Center', 'Apply to 3 fair-chance employers in week 1'],
    housing: ['Confirm housing for tonight + next 7 nights', 'Call 211 if housing is unstable', 'Save HUD rental-assistance contact'],
    edu:     ['Visit Project Rebound or campus reentry center', 'Request transcripts; ask about FAFSA / Cal Grant', 'List 1 short course you can finish in 90 days'],
    transit: ['Pick a daily transit plan and budget', 'Apply to Lifeline for phone/internet', 'Save a backup ride contact'],
    health:  ['Continue medications — call provider on day 1', 'Save 988 + SAMHSA helpline numbers', 'Schedule a primary-care visit'],
    family:  ['Reconnect with one supportive person today', 'Set a weekly check-in time', 'Talk through expectations & boundaries']
  };
  (state.plan.needs || []).forEach(n => (map[n] || []).forEach(t => tasks.add(t)));
  state.plan.first72Hours = Array.from(tasks);
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
  out.appendChild(card);
}
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

$('#btnPrint')?.addEventListener('click', printPlan);
$('#btnPrintMobile')?.addEventListener('click', printPlan);
$('#btnExportJSON')?.addEventListener('click', () => exportJSON(state.plan));
$('#btnExportCSV')?.addEventListener('click', () => exportCSV(state.plan));
$('#btnSavePhone')?.addEventListener('click', () => {
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

    // Builders wall — bigger, cinematic, individualized silhouettes
    const buildersGrid = $('#buildersGrid');
    if (buildersGrid) {
      const SILS = [
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="62" r="28" fill="#DAA520" opacity=".88"/><path d="M40 240 Q60 130 100 130 Q140 130 160 240Z" fill="#DAA520" opacity=".82"/><path d="M82 130 q18 -10 36 0 l-2 14 q-16 -8 -32 0z" fill="#0E0E0E"/></svg>',
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="60" r="30" fill="#F5C84F" opacity=".9"/><path d="M30 240 Q56 122 100 122 Q144 122 170 240Z" fill="#F5C84F" opacity=".82"/><rect x="80" y="124" width="40" height="14" fill="#0E0E0E" opacity=".8"/></svg>',
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="64" r="26" fill="#DAA520" opacity=".88"/><path d="M44 240 Q62 130 100 130 Q138 130 156 240Z" fill="#DAA520" opacity=".78"/><path d="M86 130 q14 -8 28 0 l-2 12 q-12 -6 -24 0z" fill="#0E0E0E"/></svg>',
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="58" r="32" fill="#FFD970" opacity=".9"/><path d="M28 240 Q54 120 100 120 Q146 120 172 240Z" fill="#FFD970" opacity=".82"/><circle cx="100" cy="50" r="36" fill="#0E0E0E" opacity=".18"/></svg>',
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="62" r="28" fill="#DAA520" opacity=".88"/><path d="M38 240 Q60 128 100 128 Q140 128 162 240Z" fill="#DAA520" opacity=".8"/><path d="M84 128 q16 -10 32 0 l-2 14 q-14 -8 -28 0z" fill="#0E0E0E"/></svg>',
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="60" r="30" fill="#B8860B" opacity=".9"/><path d="M34 240 Q58 124 100 124 Q142 124 166 240Z" fill="#B8860B" opacity=".82"/><rect x="78" y="126" width="44" height="12" fill="#0E0E0E" opacity=".7"/></svg>'
      ];
      (people || []).slice(0, 6).forEach((p, i) => {
        const card = el('article', { className: 'builder' });
        card.innerHTML =
          '<div class="builder__sil" aria-hidden="true">' + SILS[i % SILS.length] + '</div>' +
          '<h3 class="builder__name">' + (p.name || 'Builder') + '</h3>' +
          '<p class="builder__role muted">' + (p.role || '') + '</p>' +
          (p.story ? '<p class="builder__story">' + p.story + '</p>' : '') +
          (p.url ? '<a class="btn btn--ghost btn--sm" href="' + p.url + '" target="_blank" rel="noopener">Read more →</a>' : '');
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

    $('#advBtn').addEventListener('click', () => {
      const persona = prompt("Main goal? Type one of: job, school, business, health", "job") || "job";
      const skill   = prompt("Your strongest skill or interest?", "") || "";
      const city    = prompt("City or region?", "") || "";
      const savings = parseInt(prompt("3-month emergency fund target ($)?", "1000")) || 1000;

      const plan = buildPlan(persona.trim().toLowerCase(), { skill, city, savings });
      try {
        const raw = localStorage.getItem('paving-the-road:plan:v1');
        const state = raw ? JSON.parse(raw) : {};
        Object.keys(plan).forEach(k => {
          state[k] = Array.from(new Set([...(state[k] || []), ...plan[k]]));
        });
        state.updatedAt = new Date().toISOString();
        localStorage.setItem('paving-the-road:plan:v1', JSON.stringify(state));
      } catch {}
      // gentle reload so the UI repaints with the new tasks
      const sum = `Generated! Added:\n• ${plan.first72Hours.length} tasks for 72h\n• ${plan.thirtyDayPlan.length} tasks for 30 days\n• ${plan.sixtyDayPlan.length} for 60 days\n• ${plan.ninetyDayPlan.length} for 90 days\n• ${plan.halfYearPlan.length} for 6 months\n• ${plan.yearPlan.length} for 1 year`;
      alert(sum + "\n\nReloading the planner so you see them.");
      location.hash = "#planner"; location.reload();
    });
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
