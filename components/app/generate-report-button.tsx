"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";

export function GenerateReportButton({
  label = "Generate AI report",
  variant = "primary",
}: {
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={variant === "primary" ? "btn-primary" : "btn-secondary"}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="h-4 w-4 text-gold-600" aria-hidden="true" />
      )}
      {pending ? "Reading your month…" : label}
    </button>
  );
}
