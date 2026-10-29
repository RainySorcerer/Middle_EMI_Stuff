"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, LayoutDashboard, Settings, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/activity", label: "Records", icon: ArrowLeftRight },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-dvh lg:flex">
      <a href="#main" className="sr-only sr-only-focusable">
        Skip to main content
      </a>

      <aside className="hidden w-[232px] shrink-0 border-r border-ink-200/80 bg-white/70 lg:flex lg:flex-col">
        <div className="px-5 py-5">
          <Logo href="/dashboard" />
        </div>
        <nav aria-label="Primary" className="flex-1 px-3">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition",
                      active
                        ? "bg-brand-50 text-brand-900"
                        : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                    )}
                  >
                    <item.icon
                      className={cn("h-[18px] w-[18px]", active ? "text-brand-700" : "text-ink-400")}
                      strokeWidth={active ? 2.1 : 1.7}
                      aria-hidden="true"
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-ink-200/80 p-3">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-700 text-[11px] font-semibold text-white">
              {initials || "PP"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink-900">{user.name}</p>
              <p className="truncate text-[11px] text-ink-500">{user.email}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-canvas/90 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo href="/dashboard" />
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-[10.5px] font-semibold text-white">
              {initials || "PP"}
            </span>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-5 sm:px-6 lg:pb-16 lg:pt-9">
          {children}
        </main>

        <footer className="mx-auto hidden max-w-[1120px] items-center justify-between gap-4 px-6 pb-8 text-[11.5px] text-ink-500 lg:flex">
          <p>PaisaPilot · Educational only, not financial advice.</p>
          <p>We never ask for bank credentials.</p>
        </footer>
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/80 bg-white/95 pb-safe backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4 px-2 pt-1.5">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10.5px] font-medium transition",
                    active ? "text-brand-800" : "text-ink-500 hover:text-ink-800"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-12 place-items-center rounded-full",
                      active ? "bg-brand-50" : "bg-transparent"
                    )}
                  >
                    <item.icon
                      className="h-[19px] w-[19px]"
                      strokeWidth={active ? 2.2 : 1.7}
                      aria-hidden="true"
                    />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
