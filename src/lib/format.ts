export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: "€",
  USD: "$",
};

export function symbolFor(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? currency;
}

/** YYYY-MM for the given date (defaults to today), in local time. */
export function monthKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** First and last day (inclusive) of a YYYY-MM month, as YYYY-MM-DD. */
export function monthBounds(key: string): { start: string; end: string } {
  const [y, m] = key.split("-").map(Number);
  const start = `${key}-01`;
  const last = new Date(y, m, 0).getDate();
  const end = `${key}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export function yearKey(d: Date = new Date()): string {
  return String(d.getFullYear());
}

/** First and last day of a calendar year, as YYYY-MM-DD. */
export function yearBounds(year: string): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
