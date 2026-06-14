"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/transactions", label: "Activity", icon: "📃" },
  { href: "/transactions/import", label: "Add", icon: "➕", primary: true },
  { href: "/budgets", label: "Budgets", icon: "🎯" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
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
          const active =
            pathname === item.href ||
            (item.href !== "/transactions" &&
              item.href !== "/dashboard" &&
              pathname.startsWith(item.href)) ||
            (item.href === "/transactions" && pathname === "/transactions");

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center px-3 py-1.5"
                aria-label={item.label}
              >
                <span className="mb-0.5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-xl text-white shadow-lg shadow-brand-600/30">
                  {item.icon}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? "text-brand-700" : "text-slate-400"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
