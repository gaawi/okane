import { createClient } from "@/lib/supabase/server";
import AccountsView from "./AccountsView";
import type { Account, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const supabase = await createClient();
  const [accRes, txRes] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("transactions").select("account_id, amount, currency"),
  ]);

  return (
    <AccountsView
      accounts={(accRes.data ?? []) as Account[]}
      transactions={(txRes.data ?? []) as Pick<
        Transaction,
        "account_id" | "amount" | "currency"
      >[]}
    />
  );
}
