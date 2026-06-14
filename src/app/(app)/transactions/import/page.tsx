import { createClient } from "@/lib/supabase/server";
import ImportView from "./ImportView";
import type { Account, CategorizationRule, Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = await createClient();
  const [accRes, catRes, ruleRes] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
    supabase.from("categorization_rules").select("*"),
  ]);

  return (
    <ImportView
      accounts={(accRes.data ?? []) as Account[]}
      categories={(catRes.data ?? []) as Category[]}
      rules={(ruleRes.data ?? []) as CategorizationRule[]}
    />
  );
}
