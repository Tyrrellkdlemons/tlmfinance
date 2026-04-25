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
  if (!document.getElementById('counter-alumni')) return;
  const fire = () => {
    animateCount(document.getElementById('counter-alumni'),  1000);
    animateCount(document.getElementById('counter-employed'), 75, '%');
    animateCount(document.getElementById('counter-recid'),    8, '%');
  };
  // wait for hero to be in view-ish, but fire after 1s as a fallback
  if ('IntersectionObserver' in window) {
    const t = document.querySelector('.hero');
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => { if (e.isIntersecting) { fire(); obs.disconnect(); } });
    }, { threshold: 0.2 });
    if (t) io.observe(t);
    setTimeout(fire, 1200);
  } else fire();
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
        // Tall figure · suit shoulders
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="62" r="28" fill="#DAA520" opacity=".88"/><path d="M40 240 Q60 130 100 130 Q140 130 160 240Z" fill="#DAA520" opacity=".82"/><path d="M82 130 q18 -10 36 0 l-2 14 q-16 -8 -32 0z" fill="#0E0E0E"/></svg>',
        // Wide figure · short hair
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="64" r="30" fill="#F5C84F" opacity=".88"/><path d="M28 240 Q56 124 100 124 Q144 124 172 240Z" fill="#F5C84F" opacity=".78"/><circle cx="100" cy="50" r="18" fill="#0E0E0E" opacity=".22"/></svg>',
        // Long-hair figure
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="66" r="26" fill="#DAA520" opacity=".88"/><path d="M70 60 q30 -36 60 0 q4 30 -4 50 q-26 -10 -52 0 q-8 -20 -4 -50z" fill="#0E0E0E" opacity=".24"/><path d="M40 240 Q62 132 100 132 Q138 132 160 240Z" fill="#DAA520" opacity=".82"/></svg>',
        // Cap figure
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="68" r="26" fill="#F5C84F" opacity=".9"/><path d="M64 56 q36 -22 72 0 v8 H64z" fill="#0E0E0E" opacity=".4"/><path d="M44 240 Q62 132 100 132 Q138 132 156 240Z" fill="#F5C84F" opacity=".8"/></svg>',
        // Glasses figure
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="64" r="28" fill="#DAA520" opacity=".9"/><circle cx="90" cy="64" r="6" fill="#0E0E0E"/><circle cx="110" cy="64" r="6" fill="#0E0E0E"/><path d="M40 240 Q60 130 100 130 Q140 130 160 240Z" fill="#DAA520" opacity=".82"/></svg>',
        // Slim figure
        '<svg viewBox="0 0 200 240" aria-hidden="true"><circle cx="100" cy="62" r="24" fill="#F5C84F" opacity=".85"/><path d="M52 240 Q70 134 100 134 Q130 134 148 240Z" fill="#F5C84F" opacity=".78"/></svg>'
      ];
      // Featured order: place co-founders + ED first, then alumni
      const order = [
        { ...people[0], featured: true,  chip: 'Co-Founder',     sil: SILS[0] },
        { ...people[1], featured: true,  chip: 'Co-Founder',     sil: SILS[2] },
        { ...people[2], featured: false, chip: 'Executive Dir.', sil: SILS[4] },
        { ...people[3], featured: false, chip: 'VP · Alumna',    sil: SILS[3] },
        { ...people[4], featured: false, chip: 'Alumna',         sil: SILS[1] }
      ];
      // Add a "Founders" wide tile at the end
      order.push({
        name: 'Founders & community',
        role: 'Started in 2010 at San Quentin',
        summary: 'A nonprofit movement building education, reentry, and employment pipelines across the U.S.',
        sourceUrl: 'https://thelastmile.org/about/',
        chip: 'TLM Story',
        sil: SILS[5],
        wide: true
      });

      order.forEach(p => {
        const c = el('article', { className: 'builder' + (p.featured ? ' builder--featured' : '') });
        c.innerHTML = `
          <div class="builder__portrait">${p.sil}</div>
          <span class="builder__chip">${p.chip}</span>
          <div class="builder__body">
            <h3 class="builder__name">${p.name}</h3>
            <div class="builder__role">${p.role}</div>
            <p class="builder__quote">${p.summary || ''}</p>
            <a class="builder__src" href="${p.sourceUrl}" target="_blank" rel="noopener">Source ↗</a>
          </div>
        `;
        buildersGrid.appendChild(c);
      });
    }

  } catch (e) {
    console.error('Static render failed', e);
  }
})();

/* =====================================================================
   CONFETTI (only on completion)
   ===================================================================== */
function fireConfetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('#confetti'); if (!c) return;
  const ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const N = 90;
  const bits = Array.from({ length: N }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 100,
    y: innerHeight / 2,
    vx: (Math.random() - 0.5) * 8,
    vy: -Math.random() * 9 - 2,
    s: Math.random() * 6 + 3,
    color: Math.random() > .5 ? '#DAA520' : (Math.random() > .5 ? '#FFFFFF' : '#F5C84F'),
    life: 0
  }));
  let raf, t0 = performance.now();
  function frame(now) {
    const dt = (now - t0) / 16; t0 = now;
    ctx.clearRect(0, 0, c.width, c.height);
    bits.forEach(b => {
      b.vy += 0.22 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.life += dt;
      ctx.fillStyle = b.color; ctx.globalAlpha = Math.max(0, 1 - b.life / 80);
      ctx.fillRect(b.x, b.y, b.s, b.s);
    });
    if (bits.every(b => b.y > innerHeight + 40)) { ctx.clearRect(0,0,c.width,c.height); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}

/* ---------- Boot ---------- */
renderQuiz(); renderSteps(); renderStep(); renderSummary(); renderQuizOutput();
