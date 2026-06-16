"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Budget, Category } from "@/lib/types";
import type { Transaction } from "@/lib/types";
import { formatMoney, monthKey, monthLabel, shiftMonth, yearKey } from "@/lib/format";
import {
  averageMonthlyByCategory,
  categoryProgress,
  excludedCategoryIds,
  monthRange,
  summarizeRange,
  yearRange,
  type DateRange,
} from "@/lib/analytics";
import { Progress } from "@/components/ui";
import { CategoryIcon } from "@/components/icons";
import { upsertBudget, deleteBudget } from "../actions";

const CUR = "USD";

export default function DashboardView({
  categories,
  budgets,
  transactions,
}: {
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"month" | "year">("month");
  const [year, setYear] = useState(yearKey());
  const [month, setMonth] = useState(monthKey());
  const [editing, setEditing] = useState<Category | null>(null);

  const excluded = useMemo(() => excludedCategoryIds(categories), [categories]);
  const avgMonthly = useMemo(
    () => averageMonthlyByCategory(transactions, CUR, excluded),
    [transactions, excluded],
  );

  const { range, months, periodLabel } = useMemo<{
    range: DateRange;
    months: number;
    periodLabel: string;
  }>(() => {
    if (mode === "year")
      return { range: yearRange(year), months: 12, periodLabel: year };
    return { range: monthRange(month), months: 1, periodLabel: monthLabel(month) };
  }, [mode, year, month]);

  const rows = useMemo(
    () =>
      categoryProgress(
        transactions, budgets, categories, range, CUR, months, excluded, avgMonthly,
      ),
    [transactions, budgets, categories, range, months, excluded, avgMonthly],
  );
  const summary = useMemo(
    () => summarizeRange(transactions, range, CUR, excluded),
    [transactions, range, excluded],
  );

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const atEdge = mode === "year" ? year === yearKey() : month === monthKey();

  function step(delta: number) {
    if (mode === "year") setYear(String(Number(year) + delta));
    else setMonth(shiftMonth(month, delta));
  }

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-slate-50/90 px-4 py-3 backdrop-blur">
        <div className="mb-3 flex justify-center">
          <div className="flex rounded-lg bg-slate-200 p-0.5 text-sm font-semibold">
            <button
              onClick={() => setMode("month")}
              className={`rounded-md px-5 py-1.5 ${
                mode === "month" ? "bg-white shadow-sm" : "text-slate-500"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setMode("year")}
              className={`rounded-md px-5 py-1.5 ${
                mode === "year" ? "bg-white shadow-sm" : "text-slate-500"
              }`}
            >
              Year
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => step(-1)}
            className="rounded-lg px-3 py-1 text-lg text-slate-500 hover:bg-slate-200"
            aria-label="Previous"
          >
            ‹
          </button>
          <span className="text-base font-semibold capitalize">{periodLabel}</span>
          <button
            onClick={() => step(1)}
            disabled={atEdge}
            className="rounded-lg px-3 py-1 text-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30"
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* total */}
        <div className="card text-center">
          <p className="text-sm text-slate-500">Spent</p>
          <p className="text-4xl font-bold tracking-tight">
            {formatMoney(summary.expenses, CUR)}
          </p>
          {totalBudget > 0 && (
            <>
              <p className="mt-1 text-sm text-slate-400">
                of {formatMoney(totalBudget, CUR)} budget
              </p>
              <div className="mt-3">
                <Progress ratio={summary.expenses / totalBudget} />
              </div>
            </>
          )}
        </div>

        {/* by category */}
        {rows.length === 0 ? (
          <div className="card py-10 text-center text-sm text-slate-500">
            No spending for {periodLabel}.
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 p-0">
            {rows.map((r) => (
              <button
                key={r.category.id}
                onClick={() => setEditing(r.category)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50"
              >
                <CategoryIcon category={r.category} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.category.name}
                    {r.isAverage && (
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-400">
                        avg
                      </span>
                    )}
                  </p>
                  <div className="mt-1">
                    <Progress ratio={r.ratio} color={r.category.color} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      r.ratio > 1 ? "text-red-600" : "text-slate-900"
                    }`}
                  >
                    {formatMoney(r.spent, CUR)}
                  </p>
                  <p className="text-xs tabular-nums text-slate-400">
                    of {formatMoney(r.budget, CUR)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="px-1 text-center text-xs text-slate-400">
          Tap a category to set its monthly budget. “avg” means we’re using your
          average until you set one.
        </p>
      </div>

      {editing && (
        <BudgetSheet
          category={editing}
          current={
            budgets.find((b) => b.category_id === editing.id && b.currency === CUR)
              ?.amount
          }
          existingId={
            budgets.find((b) => b.category_id === editing.id && b.currency === CUR)?.id
          }
          avg={avgMonthly.get(editing.id)}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(amount, existingId) =>
            startTransition(async () => {
              if (amount > 0) {
                await upsertBudget({
                  category_id: editing.id,
                  amount,
                  currency: CUR,
                });
              } else if (existingId) {
                await deleteBudget(existingId);
              }
              setEditing(null);
              router.refresh();
            })
          }
        />
      )}
    </div>
  );
}

function BudgetSheet({
  category,
  current,
  existingId,
  avg,
  pending,
  onClose,
  onSave,
}: {
  category: Category;
  current?: number;
  existingId?: string;
  avg?: number;
  pending: boolean;
  onClose: () => void;
  onSave: (amount: number, existingId?: string) => void;
}) {
  const [value, setValue] = useState(current != null ? String(current) : "");

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-t-3xl bg-white p-5 pb-8">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
        <div className="mb-4 flex items-center gap-3">
          <CategoryIcon category={category} />
          <div>
            <h2 className="text-lg font-bold">{category.name}</h2>
            <p className="text-sm text-slate-500">Monthly budget</p>
          </div>
        </div>

        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            $
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={avg ? Math.round(avg).toString() : "0"}
            className="input pl-7 text-lg"
          />
        </div>
        {avg != null && (
          <p className="mt-1.5 text-xs text-slate-400">
            Your 12-month average is {formatMoney(avg, CUR)}/mo.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button
            onClick={() => onSave(Number(value) || 0, existingId)}
            disabled={pending}
            className="btn-primary flex-1"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
        {existingId && (
          <button
            onClick={() => onSave(0, existingId)}
            disabled={pending}
            className="mt-2 w-full py-2 text-sm font-medium text-slate-400"
          >
            Remove budget (use average)
          </button>
        )}
      </div>
    </div>
  );
}
