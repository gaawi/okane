import { createClient } from "@/lib/supabase/server";
import DashboardView from "./DashboardView";
import type { Budget, Category, Profile, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [profileRes, catRes, budgetRes, txRes] = await Promise.all([
    supabase.from("profiles").select("*").single(),
    supabase.from("categories").select("*").order("name"),
    supabase.from("budgets").select("*"),
    supabase
      .from("transactions")
      .select("id,account_id,category_id,posted_on,description,amount,currency")
      .order("posted_on", { ascending: false }),
  ]);

  const profile = (profileRes.data ?? {
    base_currency: "USD",
    usd_to_eur: 1,
  }) as Profile;

  return (
    <DashboardView
      profile={profile}
      categories={(catRes.data ?? []) as Category[]}
      budgets={(budgetRes.data ?? []) as Budget[]}
      transactions={(txRes.data ?? []) as Transaction[]}
    />
  );
}
