import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "watch" | "risk" | "brand" | "gold";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-600 ring-ink-200",
  good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  watch: "bg-gold-50 text-gold-700 ring-gold-200",
  risk: "bg-red-50 text-red-700 ring-red-200",
  brand: "bg-brand-50 text-brand-800 ring-brand-200",
  gold: "bg-gold-50 text-gold-800 ring-gold-200",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 ring-inset",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
