import { createClient } from "@/lib/supabase/server";
import CategoriesView from "./CategoriesView";
import type { CategorizationRule, Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const [catRes, ruleRes] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("categorization_rules").select("*").order("created_at"),
  ]);

  return (
    <CategoriesView
      categories={(catRes.data ?? []) as Category[]}
      rules={(ruleRes.data ?? []) as CategorizationRule[]}
    />
  );
}
