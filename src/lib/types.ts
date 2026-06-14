export type CategoryKind = "expense" | "income";

export interface Profile {
  id: string;
  base_currency: string;
  usd_to_eur: number;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  currency: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  posted_on: string;
  description: string;
  amount: number;
  currency: string;
  notes: string | null;
  import_hash: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  currency: string;
  created_at: string;
}

export interface CategorizationRule {
  id: string;
  user_id: string;
  match_text: string;
  category_id: string;
  created_at: string;
}

export const CURRENCIES = ["USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY = "USD";

export const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "credit",
  "cash",
  "investment",
] as const;
