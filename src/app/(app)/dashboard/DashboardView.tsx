"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Budget, Category, Profile, Transaction } from "@/lib/types";
import {
  formatMoney,
  monthKey,
  monthLabel,
  shiftMonth,
  yearKey,
  MONTH_ABBR,
} from "@/lib/format";
import {
  activeCurrencies,
  averageMonthlyByCategory,
  categoryProgress,
  excludedCategoryIds,
  monthRange,
  monthlyTrend,
  spendingByCategoryRange,
  summarizeRange,
  yearRange,
  type DateRange,
} from "@/lib/analytics";
import { Progress } from "@/components/ui";
import Donut from "@/components/Donut";
import { CategoryIcon } from "@/components/icons";

type Mode = "year" | "month";

export default function DashboardView({
  profile,
  categories,
  budgets,
  transactions,
}: {
  profile: Profile;
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
}) {
  const [mode, setMode] = useState<Mode>("year");
  const [year, setYear] = useState(yearKey());
  const [month, setMonth] = useState(monthKey());

  const currencies = useMemo(
    () => activeCurrencies(transactions, budgets),
    [transactions, budgets],
  );
  const [currency, setCurrency] = useState(
    currencies[0] ?? profile.base_currency ?? "USD",
  );
  const cur = currencies.includes(currency) ? currency : (currencies[0] ?? "USD");

  // The active period as a date range, plus how many months it spans (for
  // scaling monthly budgets to the period).
  const { range, months, periodLabel } = useMemo<{
    range: DateRange;
    months: number;
    periodLabel: string;
  }>(() => {
    if (mode === "year") {
      return { range: yearRange(year), months: 12, periodLabel: year };
    }
    return { range: monthRange(month), months: 1, periodLabel: monthLabel(month) };
  }, [mode, year, month]);

  const excluded = useMemo(() => excludedCategoryIds(categories), [categories]);
  const avgMonthly = useMemo(
    () => averageMonthlyByCategory(transactions, cur, excluded),
    [transactions, cur, excluded],
  );

  const summary = useMemo(
    () => summarizeRange(transactions, range, cur, excluded),
    [transactions, range, cur, excluded],
  );
  const spend = useMemo(
    () => spendingByCategoryRange(transactions, categories, range, cur, excluded),
    [transactions, categories, range, cur, excluded],
  );
  const statuses = useMemo(
    () =>
      categoryProgress(
        transactions, budgets, categories, range, cur, months, excluded, avgMonthly,
      ),
    [transactions, budgets, categories, range, cur, months, excluded, avgMonthly],
  );
  const trend = useMemo(
    () => monthlyTrend(transactions, year, cur, excluded),
    [transactions, year, cur, excluded],
  );

  const totalBudget = statuses.reduce((s, x) => s + x.budget, 0);
  const totalBudgetSpent = statuses.reduce((s, x) => s + x.spent, 0);
  const maxTrend = Math.max(1, ...trend.map((b) => Math.max(b.income, b.expenses)));

  const slices = spend.slice(0, 6).map((s) => ({
    label: s.category?.name ?? "Uncategorized",
    value: s.spent,
    color: s.category?.color ?? "#94a3b8",
  }));

  const avgMonthlySpend = mode === "year" ? summary.expenses / 12 : summary.expenses;
  const atCurrentEdge =
    mode === "year" ? year === yearKey() : month === monthKey();

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-slate-50/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Budget</h1>
          {currencies.length > 1 && (
            <div className="flex rounded-lg bg-slate-200 p-0.5 text-sm font-semibold">
              {currencies.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`rounded-md px-3 py-1 ${
                    c === cur ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* year / month toggle */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex rounded-lg bg-slate-200 p-0.5 text-sm font-semibold">
            <button
              onClick={() => setMode("year")}
              className={`rounded-md px-3 py-1 ${
                mode === "year" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              Year
            </button>
            <button
              onClick={() => setMode("month")}
              className={`rounded-md px-3 py-1 ${
                mode === "month" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              Month
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                mode === "year"
                  ? setYear(String(Number(year) - 1))
                  : setMonth(shiftMonth(month, -1))
              }
              className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-200"
              aria-label="Previous period"
            >
              ‹
            </button>
            <span className="min-w-[7rem] text-center text-sm font-medium text-slate-600">
              {periodLabel}
            </span>
            <button
              onClick={() =>
                mode === "year"
                  ? setYear(String(Number(year) + 1))
                  : setMonth(shiftMonth(month, 1))
              }
              disabled={atCurrentEdge}
              className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
              aria-label="Next period"
            >
              ›
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* headline */}
        <div className="card">
          <p className="text-sm text-slate-500">
            {mode === "year" ? `Total spent in ${year}` : `Spent in ${periodLabel}`}
          </p>
          <p className="text-3xl font-bold text-slate-900">
            {formatMoney(summary.expenses, cur)}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-brand-50 px-2 py-2">
              <p className="text-brand-700">Income</p>
              <p className="font-semibold text-brand-800">
                {formatMoney(summary.income, cur)}
              </p>
            </div>
            <div
              className={`rounded-xl px-2 py-2 ${
                summary.net >= 0 ? "bg-brand-50" : "bg-red-50"
              }`}
            >
              <p className={summary.net >= 0 ? "text-brand-700" : "text-red-700"}>
                Net
              </p>
              <p
                className={`font-semibold ${
                  summary.net >= 0 ? "text-brand-800" : "text-red-800"
                }`}
              >
                {formatMoney(summary.net, cur)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 px-2 py-2">
              <p className="text-slate-500">Avg/mo</p>
              <p className="font-semibold text-slate-700">
                {formatMoney(avgMonthlySpend, cur)}
              </p>
            </div>
          </div>
        </div>

        {/* by category — budget vs actual (the main view) */}
        {statuses.length > 0 && (
          <div className="card">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-semibold">Budget by category</p>
              <Link href="/budgets" className="text-sm font-medium text-brand-700">
                Set budgets
              </Link>
            </div>
            <p className="mb-3 text-xs text-slate-400">
              {mode === "year" ? "This year" : "This month"} vs budget · “avg” = your
              trailing 12-month average until you set a budget
            </p>
            <ul className="space-y-3.5">
              {statuses.map((s) => (
                <li key={s.category.id}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <CategoryIcon category={s.category} size="sm" />
                    <span className="flex-1 truncate text-sm font-medium">
                      {s.category.name}
                      {s.isAverage && (
                        <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-400">
                          avg
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-sm tabular-nums ${
                        s.ratio > 1 ? "font-semibold text-red-600" : "text-slate-500"
                      }`}
                    >
                      {formatMoney(s.spent, cur)} / {formatMoney(s.budget, cur)}
                    </span>
                  </div>
                  <Progress ratio={s.ratio} color={s.category.color} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* annual trend chart (year mode only) */}
        {mode === "year" && (
          <div className="card">
            <p className="mb-3 font-semibold">Monthly spending in {year}</p>
            <div className="flex h-36 items-end justify-between gap-1">
              {trend.map((b) => {
                const isThisMonth =
                  year === yearKey() &&
                  b.monthIndex === new Date().getMonth();
                return (
                  <button
                    key={b.monthIndex}
                    onClick={() => {
                      setMode("month");
                      setMonth(`${year}-${String(b.monthIndex + 1).padStart(2, "0")}`);
                    }}
                    className="group flex flex-1 flex-col items-center gap-1"
                    title={`${MONTH_ABBR[b.monthIndex]}: ${formatMoney(b.expenses, cur)}`}
                  >
                    <div className="flex h-28 w-full items-end justify-center">
                      <div
                        className={`w-full max-w-[18px] rounded-t transition-all group-hover:opacity-80 ${
                          isThisMonth ? "bg-brand-600" : "bg-brand-300"
                        }`}
                        style={{
                          height: `${(b.expenses / maxTrend) * 100}%`,
                          minHeight: b.expenses > 0 ? "3px" : "0",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {MONTH_ABBR[b.monthIndex][0]}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-center text-xs text-slate-400">
              Tap a bar to open that month
            </p>
          </div>
        )}

        {/* overall budget for the period */}
        {totalBudget > 0 && (
          <div className="card">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="font-semibold">
                Budget used {mode === "year" ? "(annualized)" : ""}
              </p>
              <p className="text-sm text-slate-500">
                {formatMoney(totalBudgetSpent, cur)} of {formatMoney(totalBudget, cur)}
              </p>
            </div>
            <Progress ratio={totalBudget > 0 ? totalBudgetSpent / totalBudget : 0} />
          </div>
        )}

        {/* breakdown */}
        {spend.length > 0 ? (
          <div className="card">
            <p className="mb-3 font-semibold">Where it went</p>
            <div className="flex items-center gap-4">
              <Donut slices={slices} />
              <ul className="flex-1 space-y-1.5 text-sm">
                {spend.slice(0, 6).map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.category?.color ?? "#94a3b8" }}
                    />
                    <span className="flex-1 truncate text-slate-600">
                      {s.category?.name ?? "Uncategorized"}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(s.spent, cur)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="card text-center text-sm text-slate-500">
            No spending recorded for {periodLabel}.
            <div className="mt-3">
              <Link href="/transactions/import" className="btn-primary">
                Add transactions
              </Link>
            </div>
          </div>
        )}

        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold">Recent</p>
            <Link href="/transactions" className="text-sm font-medium text-brand-700">
              See all
            </Link>
          </div>
          {transactions.filter((t) => t.currency === cur).length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Nothing here yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {transactions
                .filter((t) => t.currency === cur)
                .slice(0, 6)
                .map((t) => {
                  const cat = categories.find((c) => c.id === t.category_id);
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-2.5">
                      <CategoryIcon category={cat ?? null} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t.description || "(no description)"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {cat?.name ?? "Uncategorized"}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          t.amount >= 0 ? "text-brand-700" : "text-slate-800"
                        }`}
                      >
                        {formatMoney(t.amount, t.currency)}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
