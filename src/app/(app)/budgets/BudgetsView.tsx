"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Budget, Category, Transaction } from "@/lib/types";
import { formatMoney, monthKey, yearKey } from "@/lib/format";
import {
  averageMonthlyByCategory,
  budgetStatusesRange,
  isTransferCategory,
  monthRange,
  yearRange,
} from "@/lib/analytics";
import { PageHeader, Progress } from "@/components/ui";
import { CategoryIcon } from "@/components/icons";
import { upsertBudget, deleteBudget } from "../actions";

export default function BudgetsView({
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
  const currency = "USD";
  const [scope, setScope] = useState<"month" | "year">("year");

  const expenseCats = useMemo(
    () =>
      categories.filter(
        (c) => c.kind !== "income" && !isTransferCategory(c.name),
      ),
    [categories],
  );
  const avgMonthly = useMemo(
    () =>
      averageMonthlyByCategory(
        transactions,
        currency,
        new Set(categories.filter((c) => isTransferCategory(c.name)).map((c) => c.id)),
      ),
    [transactions, currency, categories],
  );

  const range = scope === "year" ? yearRange(yearKey()) : monthRange(monthKey());
  const months = scope === "year" ? 12 : 1;

  const statuses = useMemo(
    () =>
      budgetStatusesRange(transactions, budgets, categories, range, currency, months),
    [transactions, budgets, categories, range, currency, months],
  );
  const statusByCat = new Map(statuses.map((s) => [s.budget.category_id, s]));

  const budgetByCat = new Map(
    budgets.filter((b) => b.currency === currency).map((b) => [b.category_id, b]),
  );

  function save(category_id: string, raw: string) {
    const amount = Number(raw);
    const existing = budgetByCat.get(category_id);
    startTransition(async () => {
      if (!raw || Number.isNaN(amount) || amount <= 0) {
        if (existing) await deleteBudget(existing.id);
      } else {
        await upsertBudget({ category_id, amount, currency });
      }
      router.refresh();
    });
  }

  const totalMonthly = budgets
    .filter((b) => b.currency === currency)
    .reduce((s, b) => s + b.amount, 0);
  const periodTotal = totalMonthly * months;

  return (
    <div>
      <PageHeader
        title="Budgets"
        subtitle="Monthly spending caps per category"
      />

      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-lg bg-slate-200 p-0.5 text-sm font-semibold">
            <button
              onClick={() => setScope("year")}
              className={`rounded-md px-3 py-1 ${
                scope === "year" ? "bg-white shadow-sm" : "text-slate-500"
              }`}
            >
              This year
            </button>
            <button
              onClick={() => setScope("month")}
              className={`rounded-md px-3 py-1 ${
                scope === "month" ? "bg-white shadow-sm" : "text-slate-500"
              }`}
            >
              This month
            </button>
          </div>
        </div>

        {periodTotal > 0 && (
          <div className="card">
            <p className="text-sm text-slate-500">
              Total budget {scope === "year" ? "this year" : "this month"}
            </p>
            <p className="text-2xl font-bold">{formatMoney(periodTotal, currency)}</p>
            <p className="text-xs text-slate-400">
              {formatMoney(totalMonthly, currency)} / month
            </p>
          </div>
        )}

        <div className="card divide-y divide-slate-100 p-0">
          {expenseCats.map((c) => {
            const b = budgetByCat.get(c.id);
            const st = statusByCat.get(c.id);
            return (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <CategoryIcon category={c} size="sm" />
                  <span className="flex-1 font-medium">{c.name}</span>
                  <div className="relative w-28">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      defaultValue={b ? String(b.amount) : ""}
                      placeholder={
                        avgMonthly.get(c.id)
                          ? Math.round(avgMonthly.get(c.id)!).toString()
                          : "0"
                      }
                      onBlur={(e) => {
                        const v = e.target.value;
                        const cur = b ? String(b.amount) : "";
                        if (v !== cur) save(c.id, v);
                      }}
                      className="input py-1.5 pr-10 text-right"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      /mo
                    </span>
                  </div>
                </div>
                {st && st.budget.amount > 0 && (
                  <div className="mt-2">
                    <div className="mb-1 flex justify-between text-xs">
                      <span
                        className={st.ratio > 1 ? "text-red-600" : "text-slate-500"}
                      >
                        {formatMoney(st.spent, currency)} spent
                      </span>
                      <span className="text-slate-400">
                        {st.remaining >= 0
                          ? `${formatMoney(st.remaining, currency)} left`
                          : `${formatMoney(-st.remaining, currency)} over`}
                      </span>
                    </div>
                    <Progress ratio={st.ratio} color={c.color} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="px-1 text-center text-xs text-slate-400">
          Enter a monthly cap (the greyed number is your 12-month average). The yearly
          view multiplies it by 12. Clear or set 0 to remove. {pending && "Saving…"}
        </p>
      </div>
    </div>
  );
}
