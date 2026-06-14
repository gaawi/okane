import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { signOut } from "../../(auth)/actions";
import SettingsForm from "./SettingsForm";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles").select("*").single();
  const profile = (data ?? { base_currency: "EUR", usd_to_eur: 0.92 }) as Profile;

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="space-y-4 p-4">
        <div className="card">
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="font-semibold">{user?.email}</p>
        </div>

        <SettingsForm profile={profile} />

        <div className="card divide-y divide-slate-100 p-0">
          <Link
            href="/accounts"
            className="flex items-center justify-between px-4 py-3.5 active:bg-slate-50"
          >
            <span className="font-medium">🏦 Accounts</span>
            <span className="text-slate-300">›</span>
          </Link>
          <Link
            href="/categories"
            className="flex items-center justify-between px-4 py-3.5 active:bg-slate-50"
          >
            <span className="font-medium">🏷️ Categories &amp; rules</span>
            <span className="text-slate-300">›</span>
          </Link>
          <Link
            href="/transactions/import"
            className="flex items-center justify-between px-4 py-3.5 active:bg-slate-50"
          >
            <span className="font-medium">📄 Import transactions</span>
            <span className="text-slate-300">›</span>
          </Link>
        </div>

        <form action={signOut}>
          <button className="btn-ghost w-full text-red-600">Sign out</button>
        </form>

        <p className="px-1 text-center text-xs text-slate-400">
          Okane (お金) — your data is private to your account, protected by
          row-level security.
        </p>
      </div>
    </div>
  );
}
