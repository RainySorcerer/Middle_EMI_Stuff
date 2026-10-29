#!/usr/bin/env node
/**
 * Consistent SQLite backup. Safe to run while the app is serving traffic.
 *
 *   node scripts/backup.mjs                 # writes to ./backups
 *   node scripts/backup.mjs /mnt/backups    # custom destination
 *
 * Uses `VACUUM INTO`, which produces a single defragmented file without
 * copying the -wal/-shm sidecars. Keep the destination outside the repo or in
 * a gitignored directory, and copy it off the host.
 */

import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const source =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "paisapilot.db");
const outDir = path.resolve(process.argv[2] ?? path.join(process.cwd(), "backups"));
const keep = Number.parseInt(process.env.BACKUP_KEEP ?? "14", 10);

if (!statSync(source, { throwIfNoEntry: false })) {
  console.error(`No database at ${source}.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(outDir, `paisapilot-${stamp}.db`);

const db = new DatabaseSync(source, { readOnly: true });
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
db.close();

const size = (statSync(target).size / 1024).toFixed(0);
console.log(`Backup written: ${target} (${size} KB)`);

// Keep the newest N files, delete older ones.
const backups = readdirSync(outDir)
  .filter((name) => name.startsWith("paisapilot-") && name.endsWith(".db"))
  .sort()
  .reverse();

for (const stale of backups.slice(keep)) {
  unlinkSync(path.join(outDir, stale));
  console.log(`Removed old backup: ${stale}`);
}
