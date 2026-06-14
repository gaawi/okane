import { createClient } from "@/lib/supabase/server";
import TransactionsView from "./TransactionsView";
import type { Account, Category, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const [accRes, catRes, txRes] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("transactions")
      .select("*")
      .order("posted_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  return (
    <TransactionsView
      accounts={(accRes.data ?? []) as Account[]}
      categories={(catRes.data ?? []) as Category[]}
      transactions={(txRes.data ?? []) as Transaction[]}
    />
  );
}
