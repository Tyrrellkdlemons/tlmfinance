/**
 * storage.js — local-only persistence for the Reentry Planning Companion
 * No accounts. No servers. Default to localStorage with an IndexedDB upgrade path.
 */

const KEY = 'paving-the-road:plan:v1';

export const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  },
  clear() {
    try { localStorage.removeItem(KEY); } catch {}
  }
};

/** Default plan shape — matches docs/research schema. */
export function emptyPlan() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    needs: [],
    income: [],
    benefits: [],
    expenses: [],
    debts: [],
    goals: [],
    documents: [],
    first72Hours: [],
    thirtyDayPlan: [],
    sixtyDayPlan: [],
    ninetyDayPlan: [],
    notes: ''
  };
}
