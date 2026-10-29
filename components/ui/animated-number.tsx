"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/ui/use-reduced-motion";
import { compactInr, formatNumber, inr } from "@/lib/finance";

type Kind = "inr" | "compact" | "number";

function formatValue(value: number, kind: Kind) {
  if (kind === "compact") return compactInr(value);
  if (kind === "number") return formatNumber(value);
  return inr(value);
}

export function AnimatedNumber({
  value,
  kind = "inr",
  duration = 750,
  className,
}: {
  value: number;
  kind?: Kind;
  duration?: number;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(reducedMotion ? value : value * 0.92);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = value * 0.92;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, duration, reducedMotion]);

  return (
    <span className={className}>
      <span aria-hidden="true">{formatValue(display, kind)}</span>
      <span className="sr-only">{formatValue(value, kind)}</span>
    </span>
  );
}
