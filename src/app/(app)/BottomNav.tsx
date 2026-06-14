"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ReceiptText, Plus, Target, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ITEMS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}> = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/transactions", label: "Activity", icon: ReceiptText },
  { href: "/transactions/import", label: "Add", icon: Plus, primary: true },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div
        className="mx-auto flex max-w-xl items-stretch justify-around px-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href === "/transactions/import" &&
              pathname.startsWith("/transactions/import")) ||
            (item.href === "/budgets" && pathname.startsWith("/budgets")) ||
            (item.href === "/settings" && pathname.startsWith("/settings"));

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center px-3 py-1.5"
                aria-label={item.label}
              >
                <span className="mb-0.5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30">
                  <Icon size={24} />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-brand-700" : "text-slate-400"
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
