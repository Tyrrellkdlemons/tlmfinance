/**
 * exportPlan.js — print, JSON, CSV, share, mailto, clipboard.
 * No third-party libs required.
 */

import { totals, fmtMoney, debtPriority } from './budgetCalculator.js';

const today = () => new Date().toISOString().slice(0, 10);

export function downloadFile(name, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

export function exportJSON(plan) {
  downloadFile(`paving-the-road-plan-${today()}.json`, JSON.stringify(plan, null, 2), 'application/json');
}

export function exportCSV(plan) {
  const rows = [['Section', 'Label', 'Amount', 'Notes']];
  const push = (section, list, amountKey = 'amount') => {
    (list || []).forEach(r => rows.push([section, r.label || '', r[amountKey] ?? '', r.notes || '']));
  };
  push('Income', plan.income);
  push('Benefits', plan.benefits);
  push('Expenses', plan.expenses);
  (plan.debts || []).forEach(d => rows.push(['Debt', d.label, d.balance, `APR ${d.apr || 0}% · min $${d.minPayment || 0}`]));
  (plan.goals || []).forEach(g => rows.push(['Goal', g.label, g.monthly || g.target || '', g.kind || '']));
  (plan.documents || []).forEach(d => rows.push(['Document', d.label, '', d.have ? 'have' : 'need']));
  (plan.first72Hours || []).forEach(t => rows.push(['72h', t, '', '']));
  (plan.thirtyDayPlan || []).forEach(t => rows.push(['30d', t, '', '']));
  (plan.sixtyDayPlan || []).forEach(t => rows.push(['60d', t, '', '']));
  (plan.ninetyDayPlan || []).forEach(t => rows.push(['90d', t, '', '']));
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadFile(`paving-the-road-plan-${today()}.csv`, csv, 'text/csv');
}

export function planToText(plan) {
  const t = totals(plan);
  const lines = [];
  lines.push('PAVING THE ROAD — Reentry Plan');
  lines.push('Generated ' + new Date().toLocaleString());
  lines.push('');
  lines.push('=== Money picture ===');
  lines.push(`Monthly income:    ${fmtMoney(t.monthlyIncome)}`);
  lines.push(`Monthly expenses:  ${fmtMoney(t.monthlyExpenses)}`);
  lines.push(`Debt payments:     ${fmtMoney(t.monthlyDebtPayments)}`);
  lines.push(`Net cash flow:     ${fmtMoney(t.net)}`);
  lines.push(`Savings goal/mo:   ${fmtMoney(t.savingsGoal)}`);
  const sections = [
    ['Income', plan.income],
    ['Benefits', plan.benefits],
    ['Expenses', plan.expenses]
  ];
  sections.forEach(([name, list]) => {
    if (!(list || []).length) return;
    lines.push('');
    lines.push(`--- ${name} ---`);
    list.forEach(r => lines.push(`  ${r.label || '(unnamed)'}: ${fmtMoney(Number(r.amount) || 0)}`));
  });
  if ((plan.debts || []).length) {
    lines.push('');
    lines.push('--- Debts (priority) ---');
    debtPriority(plan).forEach((d, i) =>
      lines.push(`  ${i + 1}. ${d.label}: ${fmtMoney(d.balance)} @ ${d.apr || 0}% · min ${fmtMoney(d.minPayment || 0)}`));
  }
  ['first72Hours', 'thirtyDayPlan', 'sixtyDayPlan', 'ninetyDayPlan'].forEach(key => {
    const arr = plan[key] || [];
    if (!arr.length) return;
    lines.push('');
    lines.push('--- ' + ({
      first72Hours: 'First 72 hours',
      thirtyDayPlan: '30-day plan',
      sixtyDayPlan: '60-day plan',
      ninetyDayPlan: '90-day plan'
    })[key] + ' ---');
    arr.forEach(t => lines.push('  • ' + t));
  });
  if ((plan.documents || []).length) {
    lines.push('');
    lines.push('--- Documents ---');
    plan.documents.forEach(d => lines.push(`  [${d.have ? 'x' : ' '}] ${d.label}`));
  }
  if (plan.notes) {
    lines.push('');
    lines.push('--- Notes ---');
    lines.push(plan.notes);
  }
  lines.push('');
  lines.push('Disclaimer: This plan is a personal planning tool. It is not legal, financial, or case-management advice.');
  return lines.join('\n');
}

export async function shareOrCopy(plan, prefer = 'share') {
  const text = planToText(plan);
  if (prefer === 'share' && navigator.share) {
    try {
      await navigator.share({ title: 'My reentry plan', text });
      return 'shared';
    } catch { /* fall through */ }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function caseManagerEmail(plan, to = '') {
  const subject = encodeURIComponent('Reentry plan summary');
  const body = encodeURIComponent(planToText(plan).slice(0, 1900) + '\n\n— sent from Paving the Road');
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function printPlan() {
  window.print();
}
