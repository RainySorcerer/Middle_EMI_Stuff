/**
 * Invite-code primitives shared by the Next app and `scripts/invite.mjs`.
 *
 * Plain JavaScript on purpose: the CLI runs under bare Node, which cannot load
 * the app's TypeScript or resolve the `@/` alias. Keeping the algorithm in one
 * file means the app and the CLI can never disagree about how a code is
 * normalised, formatted or hashed.
 *
 * Only server code and the CLI import this module (it uses node:crypto).
 */

import { createHash, randomBytes } from "node:crypto";

export const INVITE_PREFIX = "PP";
/** Crockford-style: no I, O, 0 or 1, so codes survive being read aloud. */
export const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_BODY_LENGTH = 12;

/**
 * Invite metadata only. Codes themselves are never stored: the table keeps a
 * SHA-256 hash plus a four-character hint for support conversations.
 */
export const INVITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS invites (
    code_hash TEXT PRIMARY KEY,
    code_hint TEXT NOT NULL,
    label TEXT,
    email TEXT,
    max_uses INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    revoked_at TEXT,
    last_used_at TEXT,
    created_by TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
`;

/** Uppercase and strip separators so `pp-abc` and `PPABC` are the same code. */
export function normalizeInviteCode(raw) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** `PP-XXXX-XXXX-XXXX` for display. Tolerates already-formatted input. */
export function formatInviteCode(raw) {
  const normalized = normalizeInviteCode(raw);
  const body = (normalized.startsWith(INVITE_PREFIX) ? normalized.slice(2) : normalized).slice(
    0,
    INVITE_BODY_LENGTH
  );
  const groups = body.match(/.{1,4}/g) ?? [];
  return [INVITE_PREFIX, ...groups].join("-");
}

export function hashInviteCode(raw) {
  return createHash("sha256")
    .update(`paisapilot-invite:${normalizeInviteCode(raw)}`)
    .digest("hex");
}

export function generateInviteCode() {
  const bytes = randomBytes(INVITE_BODY_LENGTH);
  let body = "";
  for (const byte of bytes) body += INVITE_ALPHABET[byte % INVITE_ALPHABET.length];
  return formatInviteCode(INVITE_PREFIX + body);
}

/** Last four characters, for logs and the admin list. */
export function inviteHint(code) {
  return `…${normalizeInviteCode(code).slice(-4)}`;
}
