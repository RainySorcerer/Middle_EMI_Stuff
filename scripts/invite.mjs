#!/usr/bin/env node
/**
 * Invite administration for the PaisaPilot invite-only beta.
 *
 *   npm run invite -- create --email friend@example.com --label "Riya"
 *   npm run invite -- list
 *   npm run invite -- revoke PP-XXXX-XXXX-XXXX
 *
 * Uses the same database file and the same code algorithm as the app
 * (lib/invite-code.mjs), so codes generated here always validate in signup.
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  INVITE_SCHEMA,
  generateInviteCode,
  hashInviteCode,
  inviteHint,
  normalizeInviteCode,
} from "../lib/invite-code.mjs";

const file =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "paisapilot.db");

function open() {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(INVITE_SCHEMA);
  return db;
}

function flag(args, name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) return true;
  return value;
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

const STATUS = {
  active: "active",
  used: "used",
  expired: "expired",
  revoked: "revoked",
};

function statusOf(row, now) {
  if (row.revoked_at) return STATUS.revoked;
  if (row.expires_at && row.expires_at <= now) return STATUS.expired;
  if (row.used_count >= row.max_uses) return STATUS.used;
  return STATUS.active;
}

function shortDate(iso) {
  return iso ? iso.slice(0, 10) : "never";
}

function help() {
  console.log(`
PaisaPilot invite admin

  node scripts/invite.mjs create [options]
      --email <address>   bind the code to one email address
      --label <text>      note for yourself, e.g. the person's name
      --uses <n>          how many accounts may use it (default 1, max 100)
      --days <n>          validity in days (default 30, 0 = never expires)
      --by <text>         who issued it (default "cli")

  node scripts/invite.mjs list [--limit n]     recent codes with status
  node scripts/invite.mjs revoke <code>        disable a code immediately
  node scripts/invite.mjs validate <code> --email <address>
  node scripts/invite.mjs stats

Database: ${file}
`);
}

function cmdCreate(args) {
  const email = flag(args, "email", null);
  const label = flag(args, "label", null);
  const uses = clampInt(flag(args, "uses", 1), 1, 1, 100);
  const days = clampInt(flag(args, "days", 30), 30, 0, 365);
  const by = flag(args, "by", "cli");

  const emailValue = typeof email === "string" ? email.trim().toLowerCase() : null;
  const code = generateInviteCode();
  const expiresAt =
    days === 0 ? null : new Date(Date.now() + days * 86_400_000).toISOString();

  const db = open();
  db.prepare(
    `INSERT INTO invites
      (code_hash, code_hint, label, email, max_uses, used_count, created_at, expires_at, created_by)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`
  ).run(
    hashInviteCode(code),
    inviteHint(code),
    typeof label === "string" ? label.slice(0, 80) : null,
    emailValue,
    uses,
    new Date().toISOString(),
    expiresAt,
    String(by).slice(0, 80)
  );

  console.log(`
  Invite code:  ${code}
  Email:        ${emailValue ?? "any address"}
  Uses:         ${uses}
  Expires:      ${shortDate(expiresAt)}
  Label:        ${typeof label === "string" ? label : "—"}

  Share this code with the person you are inviting. It cannot be shown again.
`);
}

function cmdList(args) {
  const limit = clampInt(flag(args, "limit", 25), 25, 1, 500);
  const now = new Date().toISOString();
  const rows = open()
    .prepare("SELECT * FROM invites ORDER BY created_at DESC LIMIT ?")
    .all(limit);

  if (rows.length === 0) {
    console.log("No invites yet. Create one with: npm run invite -- create");
    return;
  }

  console.table(
    rows.map((row) => ({
      code: row.code_hint,
      status: statusOf(row, now),
      uses: `${row.used_count}/${row.max_uses}`,
      email: row.email ?? "any",
      label: row.label ?? "",
      created: shortDate(row.created_at),
      expires: shortDate(row.expires_at),
      lastUsed: shortDate(row.last_used_at),
    }))
  );
}

function cmdRevoke(args) {
  const raw = args[0];
  if (!raw) {
    console.error("Usage: npm run invite -- revoke <code>");
    process.exitCode = 1;
    return;
  }
  const result = open()
    .prepare(
      "UPDATE invites SET revoked_at = ? WHERE code_hash = ? AND revoked_at IS NULL"
    )
    .run(new Date().toISOString(), hashInviteCode(raw));

  console.log(
    result.changes === 1
      ? `Revoked ${normalizeInviteCode(raw)}.`
      : "No active invite matched that code."
  );
}

function cmdValidate(args) {
  const raw = args[0];
  if (!raw) {
    console.error("Usage: npm run invite -- validate <code> --email <address>");
    process.exitCode = 1;
    return;
  }
  const email = flag(args, "email", "");
  const now = new Date().toISOString();
  const row = open()
    .prepare("SELECT * FROM invites WHERE code_hash = ?")
    .get(hashInviteCode(raw));

  if (!row) {
    console.log(`Invalid: no invite matches ${normalizeInviteCode(raw)}.`);
    return;
  }
  const status = statusOf(row, now);
  if (status !== STATUS.active) {
    console.log(`Invalid: code is ${status}.`);
    return;
  }
  if (row.email && row.email !== String(email).trim().toLowerCase()) {
    console.log(`Invalid: code is bound to ${row.email}.`);
    return;
  }
  console.log(`Valid: ${row.used_count}/${row.max_uses} uses consumed.`);
}

function cmdStats() {
  const now = new Date().toISOString();
  const rows = open().prepare("SELECT * FROM invites").all();
  const counts = rows.reduce(
    (acc, row) => {
      acc[statusOf(row, now)] += 1;
      return acc;
    },
    { active: 0, used: 0, expired: 0, revoked: 0 }
  );
  const users = (() => {
    try {
      return open().prepare("SELECT COUNT(*) AS count FROM users").get().count;
    } catch {
      return "unknown";
    }
  })();

  console.log(`
  Registered accounts: ${users}
  Invites issued:      ${rows.length}
    active             ${counts.active}
    used               ${counts.used}
    expired            ${counts.expired}
    revoked            ${counts.revoked}
`);
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "create":
    cmdCreate(rest);
    break;
  case "list":
    cmdList(rest);
    break;
  case "revoke":
    cmdRevoke(rest);
    break;
  case "validate":
    cmdValidate(rest);
    break;
  case "stats":
    cmdStats();
    break;
  case undefined:
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    help();
    process.exitCode = 1;
}
