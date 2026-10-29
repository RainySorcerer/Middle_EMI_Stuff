import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Insight } from "@/lib/domain";
import { inrP } from "@/lib/money";
import { cn } from "@/lib/utils";

const TONE_TO_BADGE = {
  good: "good",
  watch: "watch",
  risk: "risk",
  brand: "brand",
} as const;

export function InsightCard({
  insight,
  index,
  compact = false,
}: {
  insight: Insight;
  index?: number;
  compact?: boolean;
}) {
  return (
    <article className="group flex h-full flex-col rounded-xl border border-ink-200/80 bg-white p-4 transition hover:border-ink-300 hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {typeof index === "number" ? (
            <span className="numeric grid h-5 w-5 place-items-center rounded-full bg-ink-100 text-[10.5px] font-semibold text-ink-600">
              {index + 1}
            </span>
          ) : null}
          <Badge tone={TONE_TO_BADGE[insight.tone]}>
            {insight.tone === "risk"
              ? "Act now"
              : insight.tone === "watch"
                ? "Worth fixing"
                : insight.tone === "good"
                  ? "On track"
                  : "Next step"}
          </Badge>
        </div>
        {insight.impactPaise > 0 ? (
          <span className="numeric shrink-0 text-[12px] font-semibold text-brand-800">
            {inrP(insight.impactPaise)}
            <span className="ml-0.5 text-[10px] font-normal text-ink-500">/mo</span>
          </span>
        ) : null}
      </div>

      <h3 className="mt-2.5 text-[14px] font-semibold leading-snug text-ink-900">
        {insight.title}
      </h3>
      <p
        className={cn(
          "mt-1 text-[12.5px] leading-relaxed text-ink-600",
          compact ? "line-clamp-3" : ""
        )}
      >
        {insight.detail}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        {insight.impactLabel ? (
          <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">
            {insight.impactLabel}
          </span>
        ) : (
          <span />
        )}
        {insight.cta ? (
          <Link
            href={insight.cta.href}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-800 hover:underline"
          >
            {insight.cta.label}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
