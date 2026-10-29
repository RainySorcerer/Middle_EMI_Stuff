import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow-sm",
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M6.5 4.75h11M6.5 9.25h11M14.25 4.75c0 4.5-2.9 4.5-7.75 4.5M10.5 9.25V19.25"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg
        viewBox="0 0 12 12"
        className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-gold-500 p-[2.5px] text-white ring-2 ring-canvas"
        fill="none"
      >
        <path
          d="M6 9.5V2.5M3 5.5 6 2.5l3 3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-lg", className)}
      aria-label="PaisaPilot home"
    >
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight text-ink-900">
        Paisa<span className="text-brand-700">Pilot</span>
      </span>
    </Link>
  );
}
