import { getDb, nowIso, one } from "./db";
import {
  generateInviteCode,
  hashInviteCode,
  inviteHint,
} from "./invite-code.mjs";

export interface InviteRow {
  code_hash: string;
  code_hint: string;
  label: string | null;
  email: string | null;
  max_uses: number;
  used_count: number;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  created_by: string | null;
}

export type InviteFailure = "unknown" | "revoked" | "expired" | "used" | "email";

export interface CreateInviteInput {
  email?: string;
  label?: string;
  maxUses?: number;
  /** 0 means the code never expires. */
  daysValid?: number;
  createdBy?: string;
}

/** Invite-only is the default. Set BETA_INVITE_ONLY=false for open signup. */
export function isInviteOnly(): boolean {
  return process.env.BETA_INVITE_ONLY !== "false";
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(Math.round(value as number), max));
}

export function createInvite(input: CreateInviteInput = {}) {
  const maxUses = clampInt(input.maxUses, 1, 1, 100);
  const daysValid = clampInt(input.daysValid, 30, 0, 365);
  const email = input.email?.trim().toLowerCase().slice(0, 160) || null;
  const label = input.label?.trim().slice(0, 80) || null;
  const code = generateInviteCode();
  const expiresAt =
    daysValid === 0 ? null : new Date(Date.now() + daysValid * 86_400_000).toISOString();

  getDb()
    .prepare(
      `INSERT INTO invites
        (code_hash, code_hint, label, email, max_uses, used_count, created_at, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`
    )
    .run(
      hashInviteCode(code),
      inviteHint(code),
      label,
      email,
      maxUses,
      nowIso(),
      expiresAt,
      input.createdBy?.slice(0, 80) ?? "cli"
    );

  return { code, email, label, maxUses, expiresAt };
}

export function checkInvite(
  code: string,
  email: string
): { ok: true; invite: InviteRow } | { ok: false; reason: InviteFailure } {
  const row = one<InviteRow>(
    getDb().prepare("SELECT * FROM invites WHERE code_hash = ?").get(hashInviteCode(code))
  );

  if (!row) return { ok: false, reason: "unknown" };
  if (row.revoked_at) return { ok: false, reason: "revoked" };
  if (row.expires_at && row.expires_at <= nowIso()) return { ok: false, reason: "expired" };
  if (row.used_count >= row.max_uses) return { ok: false, reason: "used" };
  if (row.email && row.email !== email.trim().toLowerCase()) return { ok: false, reason: "email" };

  return { ok: true, invite: row };
}

/**
 * Atomically claims one use of an invite. Must run inside the signup
 * transaction: the conditional UPDATE is what prevents two simultaneous
 * signups from sharing the last use of a code.
 */
export function redeemInvite(code: string, email: string): boolean {
  const now = nowIso();
  const result = getDb()
    .prepare(
      `UPDATE invites
          SET used_count = used_count + 1, last_used_at = ?
        WHERE code_hash = ?
          AND revoked_at IS NULL
          AND used_count < max_uses
          AND (expires_at IS NULL OR expires_at > ?)
          AND (email IS NULL OR email = ?)`
    )
    .run(now, hashInviteCode(code), now, email.trim().toLowerCase());

  return result.changes === 1;
}

/** One generic message for every failure except a mismatched email. */
export function inviteErrorMessage(reason: InviteFailure): string {
  if (reason === "email") return "That invite code is for a different email address.";
  return "That invite code isn't valid, has expired, or has already been used.";
}

export interface InviteSummary {
  hint: string;
  label: string | null;
  email: string | null;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  status: "active" | "used" | "expired" | "revoked";
}

export function listInvites(limit = 100): InviteSummary[] {
  const rows = getDb()
    .prepare("SELECT * FROM invites ORDER BY created_at DESC LIMIT ?")
    .all(Math.max(1, Math.min(limit, 500))) as unknown as InviteRow[];

  const now = nowIso();
  return rows.map((row) => ({
    hint: row.code_hint,
    label: row.label,
    email: row.email,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastUsedAt: row.last_used_at,
    status: row.revoked_at
      ? "revoked"
      : row.expires_at && row.expires_at <= now
        ? "expired"
        : row.used_count >= row.max_uses
          ? "used"
          : "active",
  }));
}

export function revokeInvite(code: string): boolean {
  const result = getDb()
    .prepare("UPDATE invites SET revoked_at = ? WHERE code_hash = ? AND revoked_at IS NULL")
    .run(nowIso(), hashInviteCode(code));
  return result.changes === 1;
}
