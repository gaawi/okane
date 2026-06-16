import { createClient } from "@/lib/supabase/server";
import DashboardView from "./DashboardView";
import type { Budget, Category, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [catRes, budgetRes, txRes] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("budgets").select("*"),
    supabase
      .from("transactions")
      .select("category_id,posted_on,amount,currency")
      .order("posted_on", { ascending: false }),
  ]);

  return (
    <DashboardView
      categories={(catRes.data ?? []) as Category[]}
      budgets={(budgetRes.data ?? []) as Budget[]}
      transactions={(txRes.data ?? []) as Transaction[]}
    />
  );
}
