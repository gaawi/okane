import type { CategorizationRule } from "./types";

/**
 * Parse a money string from a bank CSV into a number.
 * Handles European ("1.234,56") and US ("1,234.56") groupings, currency
 * symbols, spaces, and parenthesised negatives "(12,34)".
 */
export function parseAmount(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.includes("-")) negative = true;

  // strip everything except digits, separators and sign
  s = s.replace(/[^0-9.,]/g, "");
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // the right-most separator is the decimal separator
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    // only commas: decimal if it looks like ",dd", else thousands
    if (/,\d{1,2}$/.test(s)) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }

  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return negative ? -Math.abs(n) : n;
}

/** Normalise a date cell into YYYY-MM-DD. Returns null if unparseable. */
export function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim();

  // already ISO
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // DD/MM/YYYY or MM/DD/YYYY or with dots/dashes
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    let [, a, b, y] = m;
    if (y.length === 2) y = "20" + y;
    // Assume day-first (European) when the first field can't be a month.
    let day = a;
    let month = b;
    if (Number(a) > 12 && Number(b) <= 12) {
      day = a;
      month = b;
    } else if (Number(b) > 12 && Number(a) <= 12) {
      day = b;
      month = a;
    }
    return `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  }
  return null;
}

/** Stable de-dupe key so the same CSV row isn't imported twice. */
export function importHash(parts: {
  accountId: string;
  date: string;
  amount: number;
  description: string;
}): string {
  const base = `${parts.accountId}|${parts.date}|${parts.amount.toFixed(2)}|${parts.description
    .trim()
    .toLowerCase()}`;
  // djb2 — small, deterministic, good enough for a row fingerprint
  let h = 5381;
  for (let i = 0; i < base.length; i++) {
    h = (h * 33) ^ base.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

/** Apply the user's text-match rules to pick a category for a description. */
export function categorize(
  description: string,
  rules: CategorizationRule[],
): string | null {
  const desc = description.toLowerCase();
  for (const rule of rules) {
    if (rule.match_text && desc.includes(rule.match_text.toLowerCase())) {
      return rule.category_id;
    }
  }
  return null;
}
