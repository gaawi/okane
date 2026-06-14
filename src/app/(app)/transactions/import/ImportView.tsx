"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import type { Account, CategorizationRule, Category } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { categorize, importHash, parseAmount, parseDate } from "@/lib/import";
import { importTransactions } from "../../actions";

type Row = Record<string, string>;

const NONE = "__none__";

function guess(headers: string[], candidates: string[]): string {
  const lower = headers.map((h) => h.toLowerCase());
  for (const c of candidates) {
    const i = lower.findIndex((h) => h.includes(c));
    if (i > -1) return headers[i];
  }
  return "";
}

export default function ImportView({
  accounts,
  categories,
  rules,
}: {
  accounts: Account[];
  categories: Category[];
  rules: CategorizationRule[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");

  const [accountId, setAccountId] = useState("");
  const [currency, setCurrency] = useState("EUR");

  // column mapping
  const [dateCol, setDateCol] = useState("");
  const [descCol, setDescCol] = useState("");
  const [amountMode, setAmountMode] = useState<"single" | "split">("single");
  const [amountCol, setAmountCol] = useState("");
  const [debitCol, setDebitCol] = useState("");
  const [creditCol, setCreditCol] = useState("");
  // does a positive number in the single amount column mean money OUT?
  const [flipSign, setFlipSign] = useState(false);

  const [result, setResult] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = (res.meta.fields ?? []).filter(Boolean);
        setHeaders(hs);
        setRows(res.data);
        setDateCol(guess(hs, ["date", "fecha", "datum", "booking"]));
        setDescCol(
          guess(hs, ["description", "concept", "detail", "payee", "name", "memo"]),
        );
        const amt = guess(hs, ["amount", "importe", "value", "betrag"]);
        const debit = guess(hs, ["debit", "withdrawal", "cargo", "out"]);
        const credit = guess(hs, ["credit", "deposit", "abono", "in"]);
        if (amt) {
          setAmountMode("single");
          setAmountCol(amt);
        } else if (debit || credit) {
          setAmountMode("split");
          setDebitCol(debit);
          setCreditCol(credit);
        }
      },
    });
  }

  const account = accounts.find((a) => a.id === accountId);
  const effectiveCurrency = account?.currency ?? currency;

  const parsed = useMemo(() => {
    return rows.map((r) => {
      const date = parseDate(r[dateCol] ?? "");
      const description = (r[descCol] ?? "").trim();

      let amount: number | null = null;
      if (amountMode === "single") {
        amount = parseAmount(r[amountCol] ?? "");
        if (amount != null && flipSign) amount = -amount;
      } else {
        const debit = parseAmount(r[debitCol] ?? "") ?? 0;
        const credit = parseAmount(r[creditCol] ?? "") ?? 0;
        // debit = money out (negative), credit = money in (positive)
        amount = Math.abs(credit) - Math.abs(debit);
      }

      const category_id =
        amount != null ? categorize(description, rules) : null;
      const valid = !!date && amount != null && !Number.isNaN(amount);

      return { date, description, amount, category_id, valid };
    });
  }, [
    rows,
    dateCol,
    descCol,
    amountMode,
    amountCol,
    debitCol,
    creditCol,
    flipSign,
    rules,
  ]);

  const validRows = parsed.filter((p) => p.valid);
  const catById = new Map(categories.map((c) => [c.id, c]));

  function doImport() {
    startTransition(async () => {
      const payload = validRows.map((p) => ({
        account_id: accountId || null,
        category_id: p.category_id,
        posted_on: p.date!,
        description: p.description,
        amount: p.amount!,
        currency: effectiveCurrency,
        import_hash: importHash({
          accountId: accountId || "none",
          date: p.date!,
          amount: p.amount!,
          description: p.description,
        }),
      }));
      const res = await importTransactions(payload);
      if (res && "error" in res && res.error) {
        setResult(`Error: ${res.error}`);
        return;
      }
      const inserted = (res as { inserted: number }).inserted ?? 0;
      const dupes = payload.length - inserted;
      setResult(
        `Imported ${inserted} transaction${inserted === 1 ? "" : "s"}` +
          (dupes > 0 ? ` · skipped ${dupes} duplicate${dupes === 1 ? "" : "s"}` : ""),
      );
      setRows([]);
      setHeaders([]);
      setFileName("");
      router.refresh();
    });
  }

  const ready =
    validRows.length > 0 &&
    dateCol &&
    descCol &&
    (amountMode === "single" ? amountCol : debitCol || creditCol);

  return (
    <div>
      <PageHeader
        title="Add transactions"
        subtitle="Import a bank CSV or add manually"
      />

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/transactions" className="card text-center active:bg-slate-50">
            <div className="text-2xl">✍️</div>
            <p className="mt-1 text-sm font-semibold">Add manually</p>
            <p className="text-xs text-slate-400">One transaction</p>
          </Link>
          <div className="card text-center ring-2 ring-brand-500">
            <div className="text-2xl">📄</div>
            <p className="mt-1 text-sm font-semibold">Import CSV</p>
            <p className="text-xs text-slate-400">Bulk upload</p>
          </div>
        </div>

        {/* step 1: account / currency */}
        <div className="card space-y-3">
          <p className="font-semibold">1. Which account?</p>
          {accounts.length > 0 ? (
            <select
              className="input"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">No specific account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-slate-500">
              No accounts yet — pick a currency below, or{" "}
              <Link href="/accounts" className="font-medium text-brand-700">
                create an account
              </Link>{" "}
              first (recommended for EUR + USD).
            </p>
          )}
          {!accountId && (
            <div>
              <label className="label">Currency for this file</label>
              <select
                className="input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
              </select>
            </div>
          )}
        </div>

        {/* step 2: upload */}
        <div className="card space-y-3">
          <p className="font-semibold">2. Upload CSV</p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 px-4 py-8 text-center">
            <span className="text-3xl">⬆️</span>
            <span className="mt-2 text-sm font-medium text-slate-600">
              {fileName || "Tap to choose a .csv file"}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        </div>

        {/* step 3: mapping */}
        {headers.length > 0 && (
          <div className="card space-y-3">
            <p className="font-semibold">3. Map columns</p>

            <ColSelect
              label="Date column"
              value={dateCol}
              onChange={setDateCol}
              headers={headers}
            />
            <ColSelect
              label="Description column"
              value={descCol}
              onChange={setDescCol}
              headers={headers}
            />

            <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
              <button
                onClick={() => setAmountMode("single")}
                className={`flex-1 rounded-lg py-1.5 ${
                  amountMode === "single" ? "bg-white shadow-sm" : "text-slate-500"
                }`}
              >
                One amount column
              </button>
              <button
                onClick={() => setAmountMode("split")}
                className={`flex-1 rounded-lg py-1.5 ${
                  amountMode === "split" ? "bg-white shadow-sm" : "text-slate-500"
                }`}
              >
                Debit + Credit
              </button>
            </div>

            {amountMode === "single" ? (
              <>
                <ColSelect
                  label="Amount column"
                  value={amountCol}
                  onChange={setAmountCol}
                  headers={headers}
                />
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={flipSign}
                    onChange={(e) => setFlipSign(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  Positive numbers are expenses (flip the sign)
                </label>
              </>
            ) : (
              <>
                <ColSelect
                  label="Debit (money out) column"
                  value={debitCol}
                  onChange={setDebitCol}
                  headers={headers}
                />
                <ColSelect
                  label="Credit (money in) column"
                  value={creditCol}
                  onChange={setCreditCol}
                  headers={headers}
                />
              </>
            )}
          </div>
        )}

        {/* step 4: preview */}
        {headers.length > 0 && (
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold">4. Preview</p>
              <span className="text-sm text-slate-500">
                {validRows.length} of {rows.length} rows ready
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {parsed.slice(0, 8).map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-2 text-sm">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      p.valid ? "bg-brand-500" : "bg-red-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {p.description || "(no description)"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {p.date ?? "bad date"} ·{" "}
                      {p.category_id
                        ? catById.get(p.category_id)?.name
                        : "uncategorized"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-semibold tabular-nums ${
                      (p.amount ?? 0) >= 0 ? "text-brand-700" : "text-slate-900"
                    }`}
                  >
                    {p.amount != null
                      ? formatMoney(p.amount, effectiveCurrency)
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
            {rows.length > 8 && (
              <p className="text-center text-xs text-slate-400">
                …and {rows.length - 8} more
              </p>
            )}

            <button
              onClick={doImport}
              disabled={!ready || pending}
              className="btn-primary mt-2 w-full"
            >
              {pending
                ? "Importing…"
                : `Import ${validRows.length} transaction${
                    validRows.length === 1 ? "" : "s"
                  }`}
            </button>
            <p className="text-center text-xs text-slate-400">
              Duplicates (same account, date, amount &amp; description) are skipped
              automatically.
            </p>
          </div>
        )}

        {result && (
          <div className="card bg-brand-50 text-center text-sm font-medium text-brand-800">
            {result}{" "}
            <Link href="/transactions" className="underline">
              View activity
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ColSelect({
  label,
  value,
  onChange,
  headers,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  headers: string[];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        className="input"
        value={value || NONE}
        onChange={(e) => onChange(e.target.value === NONE ? "" : e.target.value)}
      >
        <option value={NONE}>— none —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );
}
