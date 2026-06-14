import Link from "next/link";
import { Landmark, Tags, FileUp, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { signOut } from "../../(auth)/actions";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/categories", label: "Categories & rules", icon: Tags },
  { href: "/transactions/import", label: "Import transactions", icon: FileUp },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="space-y-4 p-4">
        <div className="card">
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="font-semibold">{user?.email}</p>
          <p className="mt-1 text-xs text-slate-400">All amounts in USD ($).</p>
        </div>

        <div className="card divide-y divide-slate-100 p-0">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50"
            >
              <Icon size={18} className="text-slate-500" />
              <span className="flex-1 font-medium">{label}</span>
              <ChevronRight size={18} className="text-slate-300" />
            </Link>
          ))}
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
