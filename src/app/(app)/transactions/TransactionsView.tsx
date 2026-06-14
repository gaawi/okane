"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Account, Category, Transaction } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import { CategoryIcon, CategoryGlyph } from "@/components/icons";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "../actions";

const DRAFT_DEFAULT = {
  account_id: "",
  category_id: "",
  posted_on: new Date().toISOString().slice(0, 10),
  description: "",
  amount: "",
  direction: "out" as "in" | "out",
  currency: "USD",
  notes: "",
};

export default function TransactionsView({
  accounts,
  categories,
  transactions,
}: {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [visible, setVisible] = useState(150);
  const [sheet, setSheet] = useState<null | "add" | { edit: Transaction }>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (q && !t.description.toLowerCase().includes(q)) return false;
      if (catFilter === "__uncat__" && t.category_id) return false;
      if (catFilter && catFilter !== "__uncat__" && t.category_id !== catFilter)
        return false;
      return true;
    });
  }, [transactions, query, catFilter]);

  // Only render a slice — drawing thousands of rows at once is what makes the
  // page sluggish. Search/filter still run over the full set.
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered.slice(0, visible)) {
      const arr = map.get(t.posted_on) ?? [];
      arr.push(t);
      map.set(t.posted_on, arr);
    }
    return [...map.entries()];
  }, [filtered, visible]);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  return (
    <div>
      <PageHeader
        title="Activity"
        right={
          <button
            onClick={() => setSheet("add")}
            className="btn-ghost px-3 py-2 text-sm"
          >
            + Add
          </button>
        }
      />

      <div className="space-y-3 p-4">
        {/* filters */}
        <input
          className="input"
          placeholder="Search descriptions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip
            active={catFilter === ""}
            onClick={() => setCatFilter("")}
            label="All"
          />
          <FilterChip
            active={catFilter === "__uncat__"}
            onClick={() => setCatFilter("__uncat__")}
            label="Uncategorized"
          />
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              active={catFilter === c.id}
              onClick={() => setCatFilter(c.id)}
              label={
                <span className="inline-flex items-center gap-1.5">
                  <CategoryGlyph category={c} />
                  {c.name}
                </span>
              }
            />
          ))}
        </div>

        {grouped.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="No transactions"
            hint="Import a CSV from your bank or add one manually to get started."
          />
        ) : (
          grouped.map(([date, items]) => (
            <div key={date}>
              <p className="px-1 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {formatDate(date)}
              </p>
              <div className="card divide-y divide-slate-100 p-0">
                {items.map((t) => {
                  const cat = t.category_id ? catById.get(t.category_id) : null;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSheet({ edit: t })}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50"
                    >
                      <CategoryIcon category={cat ?? null} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {t.description || "(no description)"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {cat?.name ?? "Tap to categorize"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-semibold tabular-nums ${
                          t.amount >= 0 ? "text-brand-700" : "text-slate-900"
                        }`}
                      >
                        {formatMoney(t.amount, t.currency)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {filtered.length > visible && (
          <button
            onClick={() => setVisible((v) => v + 150)}
            className="btn-ghost w-full"
          >
            Show more ({visible} of {filtered.length})
          </button>
        )}
      </div>

      {sheet === "add" && (
        <TransactionSheet
          title="Add transaction"
          accounts={accounts}
          categories={categories}
          onClose={() => setSheet(null)}
          pending={pending}
          onSubmit={(draft) =>
            startTransition(async () => {
              const amt =
                draft.direction === "out"
                  ? -Math.abs(Number(draft.amount))
                  : Math.abs(Number(draft.amount));
              await createTransaction({
                account_id: draft.account_id || null,
                category_id: draft.category_id || null,
                posted_on: draft.posted_on,
                description: draft.description,
                amount: amt,
                currency: draft.currency,
                notes: draft.notes || null,
              });
              setSheet(null);
              router.refresh();
            })
          }
        />
      )}

      {sheet && typeof sheet === "object" && "edit" in sheet && (
        <TransactionSheet
          title="Edit transaction"
          accounts={accounts}
          categories={categories}
          initial={sheet.edit}
          pending={pending}
          onClose={() => setSheet(null)}
          onDelete={() =>
            startTransition(async () => {
              await deleteTransaction((sheet as { edit: Transaction }).edit.id);
              setSheet(null);
              router.refresh();
            })
          }
          onSubmit={(draft) =>
            startTransition(async () => {
              const amt =
                draft.direction === "out"
                  ? -Math.abs(Number(draft.amount))
                  : Math.abs(Number(draft.amount));
              await updateTransaction(
                (sheet as { edit: Transaction }).edit.id,
                {
                  account_id: draft.account_id || null,
                  category_id: draft.category_id || null,
                  posted_on: draft.posted_on,
                  description: draft.description,
                  amount: amt,
                  currency: draft.currency,
                  notes: draft.notes || null,
                },
              );
              setSheet(null);
              router.refresh();
            })
          }
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
        active
          ? "bg-brand-600 text-white ring-brand-600"
          : "bg-white text-slate-600 ring-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function TransactionSheet({
  title,
  accounts,
  categories,
  initial,
  onSubmit,
  onClose,
  onDelete,
  pending,
}: {
  title: string;
  accounts: Account[];
  categories: Category[];
  initial?: Transaction;
  onSubmit: (draft: typeof DRAFT_DEFAULT) => void;
  onClose: () => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const [draft, setDraft] = useState({
    ...DRAFT_DEFAULT,
    ...(initial
      ? {
          account_id: initial.account_id ?? "",
          category_id: initial.category_id ?? "",
          posted_on: initial.posted_on,
          description: initial.description,
          amount: String(Math.abs(initial.amount)),
          direction: (initial.amount >= 0 ? "in" : "out") as "in" | "out",
          currency: initial.currency,
          notes: initial.notes ?? "",
        }
      : {}),
  });

  function set<K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-t-3xl bg-white p-5 pb-8">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
        <h2 className="mb-4 text-lg font-bold">{title}</h2>

        <div className="space-y-3">
          <div>
            <label className="label">Description</label>
            <input
              className="input"
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. Mercadona"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={draft.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="label">Type</label>
              <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => set("direction", "out")}
                  className={`flex-1 rounded-lg py-1.5 ${
                    draft.direction === "out"
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => set("direction", "in")}
                  className={`flex-1 rounded-lg py-1.5 ${
                    draft.direction === "in"
                      ? "bg-white text-brand-700 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Income
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                value={draft.posted_on}
                onChange={(e) => set("posted_on", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Currency</label>
              <div className="input bg-slate-50 text-slate-500">USD $</div>
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={draft.category_id}
              onChange={(e) => set("category_id", e.target.value)}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {accounts.length > 0 && (
            <div>
              <label className="label">Account</label>
              <select
                className="input"
                value={draft.account_id}
                onChange={(e) => {
                  const acc = accounts.find((a) => a.id === e.target.value);
                  set("account_id", e.target.value);
                  if (acc) set("currency", acc.currency);
                }}
              >
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(draft)}
            disabled={pending || !draft.amount}
            className="btn-primary flex-1"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={pending}
            className="mt-2 w-full py-2 text-sm font-medium text-red-600"
          >
            Delete transaction
          </button>
        )}
      </div>
    </div>
  );
}
