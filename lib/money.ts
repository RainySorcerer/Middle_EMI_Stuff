import { compactInr, inr } from "./finance";

export function inrP(paise: number, maximumFractionDigits = 0): string {
  return inr(paise / 100, maximumFractionDigits);
}

export function compactP(paise: number): string {
  return compactInr(paise / 100);
}

export function rupeesFromPaise(paise: number): number {
  return Math.round(paise / 100);
}

export function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
