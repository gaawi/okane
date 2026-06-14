import type { Budget, Category, Transaction } from "./types";
import { monthBounds, yearBounds } from "./format";

export interface MonthSummary {
  income: number;
  expenses: number; // positive number representing money out
  net: number;
}

export function inMonth(t: Transaction, monthKey: string): boolean {
  const { start, end } = monthBounds(monthKey);
  return t.posted_on >= start && t.posted_on <= end;
}

export function summarize(
  transactions: Transaction[],
  monthKey: string,
  currency: string,
): MonthSummary {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.currency !== currency) continue;
    if (!inMonth(t, monthKey)) continue;
    if (t.amount >= 0) income += t.amount;
    else expenses += -t.amount;
  }
  return { income, expenses, net: income - expenses };
}

export interface CategorySpend {
  category: Category | null;
  spent: number; // money out, positive
}

/** Spending per category (expenses only) for one month + currency, desc order. */
export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
  monthKey: string,
  currency: string,
): CategorySpend[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.currency !== currency) continue;
    if (!inMonth(t, monthKey)) continue;
    if (t.amount >= 0) continue; // expenses only
    const key = t.category_id ?? "__uncat__";
    totals.set(key, (totals.get(key) ?? 0) + -t.amount);
  }
  const rows: CategorySpend[] = [];
  for (const [key, spent] of totals) {
    rows.push({ category: key === "__uncat__" ? null : (byId.get(key) ?? null), spent });
  }
  return rows.sort((a, b) => b.spent - a.spent);
}

export interface BudgetStatus {
  budget: Budget;
  category: Category | null;
  spent: number;
  remaining: number;
  ratio: number;
}

export function budgetStatuses(
  transactions: Transaction[],
  budgets: Budget[],
  categories: Category[],
  monthKey: string,
  currency: string,
): BudgetStatus[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const spend = spendingByCategory(transactions, categories, monthKey, currency);
  const spentByCat = new Map<string, number>();
  for (const s of spend) {
    if (s.category) spentByCat.set(s.category.id, s.spent);
  }
  return budgets
    .filter((b) => b.currency === currency)
    .map((b) => {
      const spent = spentByCat.get(b.category_id) ?? 0;
      return {
        budget: b,
        category: byId.get(b.category_id) ?? null,
        spent,
        remaining: b.amount - spent,
        ratio: b.amount > 0 ? spent / b.amount : 0,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/* ------------------------------- ranges --------------------------------- */
// Range-based variants power the annual view. A range is an inclusive
// [start, end] pair of YYYY-MM-DD strings.

export interface DateRange {
  start: string;
  end: string;
}

export function monthRange(monthKey: string): DateRange {
  return monthBounds(monthKey);
}
export function yearRange(year: string): DateRange {
  return yearBounds(year);
}

function inRange(t: Transaction, r: DateRange): boolean {
  return t.posted_on >= r.start && t.posted_on <= r.end;
}

export function summarizeRange(
  transactions: Transaction[],
  r: DateRange,
  currency: string,
): MonthSummary {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.currency !== currency) continue;
    if (!inRange(t, r)) continue;
    if (t.amount >= 0) income += t.amount;
    else expenses += -t.amount;
  }
  return { income, expenses, net: income - expenses };
}

export function spendingByCategoryRange(
  transactions: Transaction[],
  categories: Category[],
  r: DateRange,
  currency: string,
): CategorySpend[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.currency !== currency) continue;
    if (!inRange(t, r)) continue;
    if (t.amount >= 0) continue;
    const key = t.category_id ?? "__uncat__";
    totals.set(key, (totals.get(key) ?? 0) + -t.amount);
  }
  const rows: CategorySpend[] = [];
  for (const [key, spent] of totals) {
    rows.push({ category: key === "__uncat__" ? null : (byId.get(key) ?? null), spent });
  }
  return rows.sort((a, b) => b.spent - a.spent);
}

/**
 * Budget status over a range. `months` scales the monthly cap to the period
 * (12 for a full year) so the annual view compares like-for-like.
 */
export function budgetStatusesRange(
  transactions: Transaction[],
  budgets: Budget[],
  categories: Category[],
  r: DateRange,
  currency: string,
  months: number,
): BudgetStatus[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const spend = spendingByCategoryRange(transactions, categories, r, currency);
  const spentByCat = new Map<string, number>();
  for (const s of spend) if (s.category) spentByCat.set(s.category.id, s.spent);

  return budgets
    .filter((b) => b.currency === currency)
    .map((b) => {
      const cap = b.amount * months;
      const spent = spentByCat.get(b.category_id) ?? 0;
      return {
        budget: { ...b, amount: cap },
        category: byId.get(b.category_id) ?? null,
        spent,
        remaining: cap - spent,
        ratio: cap > 0 ? spent / cap : 0,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export interface MonthBar {
  monthIndex: number; // 0-11
  income: number;
  expenses: number;
}

/** Per-month income/expense totals for a calendar year (for the trend chart). */
export function monthlyTrend(
  transactions: Transaction[],
  year: string,
  currency: string,
): MonthBar[] {
  const bars: MonthBar[] = Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i,
    income: 0,
    expenses: 0,
  }));
  for (const t of transactions) {
    if (t.currency !== currency) continue;
    if (!t.posted_on.startsWith(year + "-")) continue;
    const m = Number(t.posted_on.slice(5, 7)) - 1;
    if (m < 0 || m > 11) continue;
    if (t.amount >= 0) bars[m].income += t.amount;
    else bars[m].expenses += -t.amount;
  }
  return bars;
}

/** Currencies that actually appear in the data, in a stable order. */
export function activeCurrencies(
  transactions: Transaction[],
  budgets: Budget[],
): string[] {
  const set = new Set<string>();
  transactions.forEach((t) => set.add(t.currency));
  budgets.forEach((b) => set.add(b.currency));
  const order = ["EUR", "USD"];
  return [...set].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}
