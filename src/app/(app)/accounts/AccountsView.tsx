"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Account, Transaction } from "@/lib/types";
import { ACCOUNT_TYPES } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import { createAccount, deleteAccount } from "../actions";

export default function AccountsView({
  accounts,
  transactions,
}: {
  accounts: Account[];
  transactions: Pick<Transaction, "account_id" | "amount" | "currency">[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const currency = "USD";

  const balanceFor = (id: string) =>
    transactions
      .filter((t) => t.account_id === id)
      .reduce((s, t) => s + Number(t.amount), 0);

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createAccount({ name: name.trim(), type, currency });
      setName("");
      setAdding(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteAccount(id);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        right={
          <button
            onClick={() => setAdding((v) => !v)}
            className="btn-ghost px-3 py-2 text-sm"
          >
            {adding ? "Close" : "+ Add"}
          </button>
        }
      />

      <div className="space-y-4 p-4">
        {adding && (
          <div className="card space-y-3">
            <div>
              <label className="label">Account name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. BBVA Checking"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select
                  className="input"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Currency</label>
                <div className="input bg-slate-50 text-slate-500">USD $</div>
              </div>
            </div>
            <button onClick={add} disabled={pending} className="btn-primary w-full">
              {pending ? "Saving…" : "Add account"}
            </button>
          </div>
        )}

        {accounts.length === 0 && !adding ? (
          <EmptyState
            icon="🏦"
            title="No accounts yet"
            hint="Add the bank accounts and cards you want to track."
            action={
              <button onClick={() => setAdding(true)} className="btn-primary">
                Add your first account
              </button>
            }
          />
        ) : (
          accounts.map((a) => {
            const bal = balanceFor(a.id);
            return (
              <div key={a.id} className="card flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-xl">
                  {a.currency === "USD" ? "💵" : "💶"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.name}</p>
                  <p className="text-xs capitalize text-slate-400">
                    {a.type} · {a.currency}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold tabular-nums ${
                      bal >= 0 ? "text-slate-900" : "text-red-600"
                    }`}
                  >
                    {formatMoney(bal, a.currency)}
                  </p>
                  <button
                    onClick={() => remove(a.id)}
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}

        <p className="px-1 text-center text-xs text-slate-400">
          Deleting an account keeps its transactions (they become “no account”).
          Manage spending categories on the{" "}
          <Link href="/categories" className="font-medium text-brand-700">
            Categories
          </Link>{" "}
          page.
        </p>
      </div>
    </div>
  );
}
