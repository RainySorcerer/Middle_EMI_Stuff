import type { CategoryTotal } from "@/lib/domain";
import { inrP } from "@/lib/money";

const COLORS = [
  "bg-brand-600",
  "bg-gold-500",
  "bg-brand-400",
  "bg-ink-400",
  "bg-gold-300",
  "bg-brand-300",
  "bg-ink-300",
];

export function CategoryBreakdown({
  categories,
  limit = 6,
}: {
  categories: CategoryTotal[];
  limit?: number;
}) {
  const visible = categories.slice(0, limit);
  if (visible.length === 0) {
    return (
      <p className="rounded-xl bg-ink-50 px-3.5 py-4 text-[12.5px] text-ink-500">
        No spending recorded yet. Import a statement to see the breakdown.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {visible.map((item, index) => (
        <li key={item.category}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-700">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${COLORS[index % COLORS.length]}`}
                aria-hidden="true"
              />
              <span className="truncate">{item.category}</span>
            </span>
            <span className="numeric shrink-0 text-[12.5px] font-medium text-ink-900">
              {inrP(item.paise)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
              <div
                className={`h-full rounded-full ${COLORS[index % COLORS.length]}`}
                style={{ width: `${Math.max(2, item.share)}%` }}
              />
            </div>
            <span className="numeric w-8 text-right text-[10.5px] text-ink-500">
              {item.share.toFixed(0)}%
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
