import { cn } from "@/lib/utils";

const STROKE: Record<string, string> = {
  good: "#047857",
  watch: "#D97706",
  risk: "#B91C1C",
  brand: "#0F766E",
};

export function ScoreRing({
  score,
  size = 96,
  label = "Financial score",
  tone,
}: {
  score: number;
  size?: number;
  label?: string;
  tone?: "good" | "watch" | "risk" | "brand";
}) {
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  const resolved = tone ?? (safe >= 70 ? "good" : safe >= 45 ? "watch" : "risk");
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (safe / 100) * circumference;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${safe} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={STROKE[resolved]}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="numeric text-[22px] font-semibold leading-none text-ink-900">
          {safe}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-500">
          /100
        </span>
      </div>
    </div>
  );
}

export function ScoreBar({
  label,
  score,
  max,
  note,
}: {
  label: string;
  score: number;
  max: number;
  note: string;
}) {
  const share = max > 0 ? Math.max(2, Math.min(100, (score / max) * 100)) : 0;
  const tone = share >= 75 ? "bg-brand-600" : share >= 45 ? "bg-gold-500" : "bg-red-500";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-800">{label}</p>
        <p className="numeric text-[12px] text-ink-500">
          {Math.round(score)}/{max}
        </p>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${share}%` }} />
      </div>
      <p className="mt-1 text-[11.5px] leading-snug text-ink-500">{note}</p>
    </div>
  );
}
