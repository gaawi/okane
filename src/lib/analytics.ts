import type { Budget, Category, Transaction } from "./types";
import { monthBounds, yearBounds } from "./format";

/**
 * Transfers and card payments move money between your own accounts — they are
 * not real income or spending, so they're excluded from totals and budgets.
 */
export function isTransferCategory(name?: string | null): boolean {
  if (!name) return false;
  return /transfer|credit card payment/i.test(name);
}

export function excludedCategoryIds(categories: Category[]): Set<string> {
  return new Set(
    categories.filter((c) => isTransferCategory(c.name)).map((c) => c.id),
  );
}

function isExcluded(t: Transaction, excluded?: Set<string>): boolean {
  return !!(excluded && t.category_id && excluded.has(t.category_id));
}

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
  excluded?: Set<string>,
): MonthSummary {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.currency !== currency) continue;
    if (!inRange(t, r)) continue;
    if (isExcluded(t, excluded)) continue;
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
  excluded?: Set<string>,
): CategorySpend[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.currency !== currency) continue;
    if (!inRange(t, r)) continue;
    if (t.amount >= 0) continue;
    if (isExcluded(t, excluded)) continue;
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
  excluded?: Set<string>,
): MonthBar[] {
  const bars: MonthBar[] = Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i,
    income: 0,
    expenses: 0,
  }));
  for (const t of transactions) {
    if (t.currency !== currency) continue;
    if (!t.posted_on.startsWith(year + "-")) continue;
    if (isExcluded(t, excluded)) continue;
    const m = Number(t.posted_on.slice(5, 7)) - 1;
    if (m < 0 || m > 11) continue;
    if (t.amount >= 0) bars[m].income += t.amount;
    else bars[m].expenses += -t.amount;
  }
  return bars;
}

/**
 * Average monthly spend per category over the trailing 12 months (from the
 * given reference month, default today). Used as a budget baseline until the
 * user sets their own budgets. Excluded (transfer) categories are skipped.
 */
export function averageMonthlyByCategory(
  transactions: Transaction[],
  currency: string,
  excluded: Set<string>,
  refMonth: string = new Date().toISOString().slice(0, 7),
): Map<string, number> {
  // 12-month window ending at refMonth (inclusive)
  const [ry, rm] = refMonth.split("-").map(Number);
  const startDate = new Date(ry, rm - 1 - 11, 1);
  const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-01`;
  const end = `${refMonth}-31`;

  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.currency !== currency) continue;
    if (t.posted_on < start || t.posted_on > end) continue;
    if (t.amount >= 0) continue;
    if (!t.category_id || excluded.has(t.category_id)) continue;
    totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + -t.amount);
  }
  const avg = new Map<string, number>();
  for (const [id, sum] of totals) avg.set(id, sum / 12);
  return avg;
}

export interface CategoryProgress {
  category: Category;
  spent: number;
  budget: number; // scaled to the active period
  ratio: number;
  isAverage: boolean; // true when the budget is the average fallback
}

/**
 * Per-category budget-vs-actual for the active period. Uses the user's budget
 * if set, otherwise the trailing-12-month average. Income and transfer
 * categories are excluded.
 */
export function categoryProgress(
  transactions: Transaction[],
  budgets: Budget[],
  categories: Category[],
  r: DateRange,
  currency: string,
  months: number,
  excluded: Set<string>,
  avgMonthly: Map<string, number>,
): CategoryProgress[] {
  const spendByCat = new Map<string, number>();
  for (const s of spendingByCategoryRange(transactions, categories, r, currency, excluded)) {
    if (s.category) spendByCat.set(s.category.id, s.spent);
  }
  const budgetByCat = new Map(
    budgets.filter((b) => b.currency === currency).map((b) => [b.category_id, b.amount]),
  );

  return categories
    .filter((c) => c.kind !== "income" && !excluded.has(c.id))
    .map((c) => {
      const spent = spendByCat.get(c.id) ?? 0;
      const userBudget = budgetByCat.get(c.id);
      const monthly = userBudget ?? avgMonthly.get(c.id) ?? 0;
      const budget = monthly * months;
      return {
        category: c,
        spent,
        budget,
        ratio: budget > 0 ? spent / budget : 0,
        isAverage: userBudget == null,
      };
    })
    .filter((row) => row.budget > 0 || row.spent > 0)
    .sort((a, b) => b.spent - a.spent);
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
