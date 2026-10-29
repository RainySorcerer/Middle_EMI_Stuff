import { parseAmount } from "./csv";
import type { ActionState } from "./form-state";

export type { ActionState } from "./form-state";

export const EMPTY_STATE: ActionState = { ok: false };

export function text(formData: FormData, key: string, max = 200): string {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function rupees(formData: FormData, key: string): number {
  const value = text(formData, key, 40);
  if (!value) return 0;
  const paise = parseAmount(value);
  return Number.isFinite(paise) ? Math.max(0, Math.min(paise, 1_000_000_000_00)) : 0;
}

export function wholeNumber(formData: FormData, key: string, max = 1000): number {
  const value = Number(text(formData, key, 20).replace(/[^0-9]/g, ""));
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.round(value), max));
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Naive in-process limiter — enough for a single-node deployment. */
const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 8, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}
