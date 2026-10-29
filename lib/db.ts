import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { INVITE_SCHEMA } from "./invite-code.mjs";

const globalForDb = globalThis as unknown as { __paisaDb?: DatabaseSync };

function createDb(): DatabaseSync {
  const file =
    process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "paisapilot.db");
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  migrate(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__paisaDb) globalForDb.__paisaDb = createDb();
  return globalForDb.__paisaDb;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      city TEXT,
      employment TEXT,
      dependents INTEGER NOT NULL DEFAULT 0,
      monthly_income_paise INTEGER NOT NULL DEFAULT 0,
      monthly_spend_paise INTEGER NOT NULL DEFAULT 0,
      emergency_fund_paise INTEGER NOT NULL DEFAULT 0,
      primary_goal TEXT,
      goal_amount_paise INTEGER NOT NULL DEFAULT 0,
      goal_months INTEGER NOT NULL DEFAULT 0,
      risk_comfort TEXT,
      onboarded_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      institution TEXT,
      last4 TEXT,
      credit_limit_paise INTEGER NOT NULL DEFAULT 0,
      outstanding_paise INTEGER NOT NULL DEFAULT 0,
      interest_rate REAL NOT NULL DEFAULT 0,
      emi_paise INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      occurred_on TEXT NOT NULL,
      description TEXT NOT NULL,
      merchant TEXT,
      amount_paise INTEGER NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
      category TEXT NOT NULL DEFAULT 'Other',
      source TEXT NOT NULL DEFAULT 'manual',
      dedupe_hash TEXT,
      created_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_dedupe
      ON transactions(user_id, dedupe_hash) WHERE dedupe_hash IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, occurred_on DESC);
    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      engine TEXT NOT NULL,
      headline TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_id, created_at DESC);
  `);

  // Invite codes are hashed, so the beta gate needs its own table.
  db.exec(INVITE_SCHEMA);
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** SQLite returns null-prototype objects; normalise to plain rows. */
export function rows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function one<T>(value: unknown): T | undefined {
  return value ? (value as T) : undefined;
}
