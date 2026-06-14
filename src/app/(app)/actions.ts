"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

function revalidateApp() {
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/accounts");
  revalidatePath("/categories");
  revalidatePath("/settings");
}

/* ----------------------------- transactions ----------------------------- */

export async function createTransaction(input: {
  account_id: string | null;
  category_id: string | null;
  posted_on: string;
  description: string;
  amount: number;
  currency: string;
  notes?: string | null;
}) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    ...input,
  });
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

export async function updateTransaction(
  id: string,
  patch: Partial<{
    account_id: string | null;
    category_id: string | null;
    posted_on: string;
    description: string;
    amount: number;
    currency: string;
    notes: string | null;
  }>,
) {
  const { supabase } = await uid();
  const { error } = await supabase.from("transactions").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  const { supabase } = await uid();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

/** Bulk insert for CSV import. Ignores duplicates via import_hash unique index. */
export async function importTransactions(
  rows: Array<{
    account_id: string | null;
    category_id: string | null;
    posted_on: string;
    description: string;
    amount: number;
    currency: string;
    import_hash: string;
  }>,
) {
  const { supabase, userId } = await uid();
  const payload = rows.map((r) => ({ user_id: userId, ...r }));
  // upsert on the (user_id, import_hash) unique index, skipping dupes
  const { data, error } = await supabase
    .from("transactions")
    .upsert(payload, { onConflict: "user_id,import_hash", ignoreDuplicates: true })
    .select("id");
  if (error) return { error: error.message };
  revalidateApp();
  return { inserted: data?.length ?? 0, received: rows.length };
}

/* ------------------------------- accounts -------------------------------- */

export async function createAccount(input: {
  name: string;
  type: string;
  currency: string;
}) {
  const { supabase, userId } = await uid();
  const { error } = await supabase
    .from("accounts")
    .insert({ user_id: userId, ...input });
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

export async function deleteAccount(id: string) {
  const { supabase } = await uid();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

/* ------------------------------ categories ------------------------------- */

export async function createCategory(input: {
  name: string;
  kind: string;
  color: string;
  icon: string;
}) {
  const { supabase, userId } = await uid();
  const { error } = await supabase
    .from("categories")
    .insert({ user_id: userId, ...input });
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

export async function updateCategory(
  id: string,
  patch: Partial<{ name: string; color: string; icon: string; kind: string }>,
) {
  const { supabase } = await uid();
  const { error } = await supabase.from("categories").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

export async function deleteCategory(id: string) {
  const { supabase } = await uid();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

/* -------------------------------- budgets -------------------------------- */

export async function upsertBudget(input: {
  category_id: string;
  amount: number;
  currency: string;
}) {
  const { supabase, userId } = await uid();
  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: userId, ...input },
      { onConflict: "user_id,category_id,currency" },
    );
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

export async function deleteBudget(id: string) {
  const { supabase } = await uid();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

/* ----------------------------- categorization ---------------------------- */

export async function createRule(input: {
  match_text: string;
  category_id: string;
}) {
  const { supabase, userId } = await uid();
  const { error } = await supabase
    .from("categorization_rules")
    .insert({ user_id: userId, ...input });
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

export async function deleteRule(id: string) {
  const { supabase } = await uid();
  const { error } = await supabase
    .from("categorization_rules")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}

/* -------------------------------- profile -------------------------------- */

export async function updateProfile(patch: {
  base_currency?: string;
  usd_to_eur?: number;
}) {
  const { supabase, userId } = await uid();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" });
  if (error) return { error: error.message };
  revalidateApp();
  return { ok: true };
}
