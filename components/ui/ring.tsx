import { cn } from "@/lib/utils";
import { utilizationBand } from "@/lib/finance";

const strokeByBand = {
  good: "#059669",
  watch: "#D97706",
  risk: "#DC2626",
} as const;

export function Ring({
  value,
  size = 72,
  stroke = 8,
  tone,
  color,
  label,
  className,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "good" | "watch" | "risk";
  color?: string;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const band = tone ?? utilizationBand(clamped);
  const ringColor = color ?? strokeByBand[band];
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(clamped)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
