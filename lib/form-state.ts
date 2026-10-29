/** Client-safe form state. Keep this module free of node: imports. */

export interface ActionState {
  ok: boolean;
  error?: string;
  message?: string;
  count?: number;
  skipped?: number;
}

export const EMPTY_STATE: ActionState = { ok: false };

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
