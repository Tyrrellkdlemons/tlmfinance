/**
 * budgetCalculator.js — pure functions for the planner's math.
 */

const sum = (rows) => (rows || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

export function totals(plan) {
  const monthlyIncome = sum(plan.income) + sum(plan.benefits);
  const monthlyExpenses = sum(plan.expenses);
  const monthlyDebtPayments = sum((plan.debts || []).map(d => ({ amount: d.minPayment })));
  const net = monthlyIncome - (monthlyExpenses + monthlyDebtPayments);
  const ratio = monthlyIncome > 0 ? Math.min(1, (monthlyExpenses + monthlyDebtPayments) / monthlyIncome) : 0;
  const savingsGoal = sum((plan.goals || []).filter(g => g.kind === 'save').map(g => ({ amount: g.monthly })));
  return { monthlyIncome, monthlyExpenses, monthlyDebtPayments, net, ratio, savingsGoal };
}

export function canIAfford(plan, oneTime, monthlyAdd = 0) {
  const t = totals(plan);
  const newNet = t.net - monthlyAdd;
  const monthsToAfford = oneTime > 0 && t.net > 0 ? Math.ceil(oneTime / t.net) : null;
  return { newNet, monthsToAfford, currentNet: t.net };
}

export function debtPriority(plan) {
  // Avalanche: highest APR first. Tie-break by smallest balance (snowball-friendly fallback).
  return [...(plan.debts || [])]
    .filter(d => d.balance > 0)
    .sort((a, b) => (b.apr || 0) - (a.apr || 0) || (a.balance - b.balance));
}

/** Plain-language risk flags for the right rail. */
export function riskFlags(plan) {
  const t = totals(plan);
  const flags = [];

  if (t.monthlyIncome === 0 && (plan.expenses || []).length === 0) {
    flags.push({ kind: 'info', text: 'Add a couple of income and expense lines to see your live cash flow.' });
  }
  if (t.monthlyIncome > 0 && t.net < 0) {
    flags.push({ kind: 'warn', text: 'Spending is higher than income. Look at largest expenses or add a benefit you may qualify for (211, USA.gov benefit finder).' });
  }
  if (t.monthlyIncome > 0 && t.ratio > 0.9) {
    flags.push({ kind: 'warn', text: 'Less than 10% of income is left over. Aim for a small starter emergency fund of $250–$500 first.' });
  }
  if ((plan.documents || []).length === 0) {
    flags.push({ kind: 'info', text: "Documents checklist is empty — add ID, Social Security card, birth certificate to track what's missing." });
  }
  const phoneOrInternet = (plan.expenses || []).some(e => /phone|internet|data|wifi/i.test(e.label || ''));
  if (!phoneOrInternet && t.monthlyIncome > 0) {
    flags.push({ kind: 'info', text: 'No phone or internet expense yet — you may qualify for the federal Lifeline program.' });
  }
  const transit = (plan.expenses || []).some(e => /bus|gas|fuel|car|transit|uber|lyft/i.test(e.label || ''));
  if (!transit) {
    flags.push({ kind: 'info', text: 'No transportation line yet — most jobs need reliable transit. Add it so we can flag a gap.' });
  }
  if ((plan.first72Hours || []).length < 3 && t.monthlyIncome > 0) {
    flags.push({ kind: 'info', text: "Your 72-hour plan is light. Open the Freedom Plan Panel to seed it from a quick quiz." });
  }
  if (t.net > 0 && t.savingsGoal === 0) {
    flags.push({ kind: 'ok', text: `You have positive cash flow. Consider directing $${Math.min(50, Math.round(t.net * 0.1))}/month toward a starter emergency fund.` });
  }
  return flags;
}

export function fmtMoney(n) {
  if (!isFinite(n)) return '$0';
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(Math.round(n)).toLocaleString();
}
