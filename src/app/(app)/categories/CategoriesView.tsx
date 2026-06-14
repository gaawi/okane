"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CategorizationRule, Category } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import {
  createCategory,
  createRule,
  deleteCategory,
  deleteRule,
} from "../actions";

const ICONS = [
  "💸", "🛒", "🏠", "💡", "🚗", "🍽️", "🛍️", "🔁", "🩺", "🎬",
  "✈️", "🏦", "📦", "💰", "☕", "📱", "🎓", "🐾", "🎁", "⛽",
];
const COLORS = [
  "#1fa862", "#16a34a", "#0ea5e9", "#6366f1", "#f59e0b", "#ef4444",
  "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#06b6d4", "#64748b",
];

export default function CategoriesView({
  categories,
  rules,
}: {
  categories: Category[];
  rules: CategorizationRule[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [kind, setKind] = useState<"expense" | "income">("expense");

  const [ruleText, setRuleText] = useState("");
  const [ruleCat, setRuleCat] = useState("");

  const catById = new Map(categories.map((c) => [c.id, c]));

  function addCategory() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createCategory({ name: name.trim(), icon, color, kind });
      setName("");
      router.refresh();
    });
  }

  function addRule() {
    if (!ruleText.trim() || !ruleCat) return;
    startTransition(async () => {
      await createRule({ match_text: ruleText.trim(), category_id: ruleCat });
      setRuleText("");
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader title="Categories" subtitle="Group and auto-tag spending" />

      <div className="space-y-4 p-4">
        {/* add category */}
        <div className="card space-y-3">
          <p className="font-semibold">New category</p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
            />
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                onClick={() => setKind("expense")}
                className={`rounded-lg px-2 ${
                  kind === "expense" ? "bg-white shadow-sm" : "text-slate-500"
                }`}
              >
                Expense
              </button>
              <button
                onClick={() => setKind("income")}
                className={`rounded-lg px-2 ${
                  kind === "income" ? "bg-white shadow-sm" : "text-slate-500"
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${
                  icon === ic ? "bg-brand-100 ring-2 ring-brand-500" : "bg-slate-100"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((col) => (
              <button
                key={col}
                onClick={() => setColor(col)}
                className={`h-7 w-7 rounded-full ${
                  color === col ? "ring-2 ring-offset-2 ring-slate-400" : ""
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
          <button
            onClick={addCategory}
            disabled={pending}
            className="btn-primary w-full"
          >
            Add category
          </button>
        </div>

        {/* category list */}
        <div className="card divide-y divide-slate-100 p-0">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: c.color + "22" }}
              >
                {c.icon}
              </span>
              <span className="flex-1 font-medium">{c.name}</span>
              <span className="text-xs uppercase text-slate-400">{c.kind}</span>
              <button
                onClick={() =>
                  startTransition(async () => {
                    await deleteCategory(c.id);
                    router.refresh();
                  })
                }
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* auto-categorization rules */}
        <div className="card space-y-3">
          <div>
            <p className="font-semibold">Auto-categorize rules</p>
            <p className="text-sm text-slate-500">
              When an imported description contains this text, assign the category
              automatically.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={ruleText}
              onChange={(e) => setRuleText(e.target.value)}
              placeholder="e.g. netflix"
            />
            <select
              className="input w-36"
              value={ruleCat}
              onChange={(e) => setRuleCat(e.target.value)}
            >
              <option value="">Category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={addRule}
            disabled={pending || !ruleText.trim() || !ruleCat}
            className="btn-ghost w-full"
          >
            Add rule
          </button>

          {rules.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs">
                    {r.match_text}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="flex-1">
                    {catById.get(r.category_id)?.icon}{" "}
                    {catById.get(r.category_id)?.name ?? "—"}
                  </span>
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await deleteRule(r.id);
                        router.refresh();
                      })
                    }
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
