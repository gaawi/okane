import { createClient } from "@/lib/supabase/server";
import BudgetsView from "./BudgetsView";
import type { Budget, Category, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const supabase = await createClient();
  const [catRes, budgetRes, txRes] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("budgets").select("*"),
    supabase.from("transactions").select("*"),
  ]);

  return (
    <BudgetsView
      categories={(catRes.data ?? []) as Category[]}
      budgets={(budgetRes.data ?? []) as Budget[]}
      transactions={(txRes.data ?? []) as Transaction[]}
    />
  );
}
