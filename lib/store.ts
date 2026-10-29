import { createHash, randomUUID } from "node:crypto";
import type { ProfileRow, SessionUser } from "./auth";
import { getDb, nowIso, one, rows } from "./db";
import type { Account, AnalysisFacts, StoredAnalysis, Transaction } from "./domain";
import { classify } from "./categorize";
import { monthKey } from "./analytics";

export function listAccounts(userId: string): Account[] {
  return rows<Account>(
    getDb()
      .prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC")
      .all(userId)
  );
}

export function listTransactions(
  userId: string,
  options: { limit?: number; month?: string; category?: string } = {}
): Transaction[] {
  const clauses = ["user_id = ?"];
  const params: (string | number)[] = [userId];
  if (options.month) {
    clauses.push("substr(occurred_on, 1, 7) = ?");
    params.push(options.month);
  }
  if (options.category) {
    clauses.push("category = ?");
    params.push(options.category);
  }
  params.push(options.limit ?? 500);
  return rows<Transaction>(
    getDb()
      .prepare(
        `SELECT * FROM transactions WHERE ${clauses.join(" AND ")}
         ORDER BY occurred_on DESC, created_at DESC LIMIT ?`
      )
      .all(...params)
  );
}

export function getTransactionMonths(userId: string): string[] {
  return rows<{ month: string }>(
    getDb()
      .prepare(
        "SELECT DISTINCT substr(occurred_on, 1, 7) AS month FROM transactions WHERE user_id = ? ORDER BY month DESC"
      )
      .all(userId)
  ).map((row) => row.month);
}

export function countTransactions(userId: string): number {
  const row = one<{ count: number }>(
    getDb().prepare("SELECT COUNT(*) AS count FROM transactions WHERE user_id = ?").get(userId)
  );
  return row?.count ?? 0;
}

export function loadRawData(userId: string): {
  profile: ProfileRow;
  user: SessionUser;
  accounts: Account[];
  transactions: Transaction[];
} | null {
  const db = getDb();
  const profile = one<ProfileRow>(db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId));
  const user = one<SessionUser>(
    db.prepare("SELECT id, email, name, created_at FROM users WHERE id = ?").get(userId)
  );
  if (!profile || !user) return null;
  return {
    profile,
    user,
    accounts: listAccounts(userId),
    transactions: listTransactions(userId, { limit: 5000 }),
  };
}

export function addAccount(input: {
  userId: string;
  kind: Account["kind"];
  name: string;
  institution?: string;
  last4?: string;
  creditLimitPaise?: number;
  outstandingPaise?: number;
  interestRate?: number;
  emiPaise?: number;
  source?: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO accounts (id, user_id, kind, name, institution, last4,
        credit_limit_paise, outstanding_paise, interest_rate, emi_paise, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      input.userId,
      input.kind,
      input.name,
      input.institution ?? null,
      input.last4 ?? null,
      input.creditLimitPaise ?? 0,
      input.outstandingPaise ?? 0,
      input.interestRate ?? 0,
      input.emiPaise ?? 0,
      input.source ?? "manual",
      nowIso()
    );
}

export function deleteAccount(userId: string, accountId: string): void {
  getDb().prepare("DELETE FROM accounts WHERE id = ? AND user_id = ?").run(accountId, userId);
}

export function addTransaction(input: {
  userId: string;
  occurredOn: string;
  description: string;
  amountPaise: number;
  direction: "debit" | "credit";
  category?: string;
  accountId?: string | null;
  source?: Transaction["source"];
  dedupeHash?: string | null;
}): void {
  const classified = classify(input.description, input.direction);
  getDb()
    .prepare(
      `INSERT INTO transactions (id, user_id, account_id, occurred_on, description, merchant,
        amount_paise, direction, category, source, dedupe_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      input.userId,
      input.accountId ?? null,
      input.occurredOn,
      input.description.slice(0, 180),
      classified.merchant,
      input.amountPaise,
      input.direction,
      input.category ?? classified.category,
      input.source ?? "manual",
      input.dedupeHash ?? null,
      nowIso()
    );
}

export function importRows(
  userId: string,
  items: {
    occurred_on: string;
    description: string;
    merchant: string;
    category: string;
    amount_paise: number;
    direction: "debit" | "credit";
    dedupe_hash: string;
  }[],
  accountId?: string | null,
  source: "csv" | "pdf" = "csv"
): number {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO transactions (id, user_id, account_id, occurred_on, description,
      merchant, amount_paise, direction, category, source, dedupe_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  let inserted = 0;
  db.exec("BEGIN");
  try {
    for (const item of items) {
      const result = stmt.run(
        randomUUID(),
        userId,
        accountId ?? null,
        item.occurred_on,
        item.description,
        item.merchant,
        item.amount_paise,
        item.direction,
        item.category,
        source,
        item.dedupe_hash,
        nowIso()
      );
      inserted += Number(result.changes);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return inserted;
}

export function deleteTransaction(userId: string, id: string): void {
  getDb().prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(id, userId);
}

export function clearTransactions(userId: string): void {
  getDb().prepare("DELETE FROM transactions WHERE user_id = ?").run(userId);
}

export function clearAllUserData(userId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM transactions WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM accounts WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM analyses WHERE user_id = ?").run(userId);
}

export function getLatestAnalysis(userId: string): StoredAnalysis | undefined {
  return one<StoredAnalysis>(
    getDb()
      .prepare("SELECT * FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(userId)
  );
}

export function saveAnalysis(
  userId: string,
  input: { engine: string; headline: string; summary: string; facts: AnalysisFacts }
): void {
  getDb()
    .prepare(
      `INSERT INTO analyses (id, user_id, created_at, engine, headline, summary, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      userId,
      nowIso(),
      input.engine,
      input.headline,
      input.summary,
      JSON.stringify({
        healthScore: input.facts.healthScore,
        savingsRate: input.facts.savingsRate,
        monthlySpendPaise: input.facts.monthlySpendPaise,
        insights: input.facts.insights.map((insight) => ({
          title: insight.title,
          impactPaise: insight.impactPaise,
        })),
      })
    );
}

export function upsertProfile(
  userId: string,
  input: Partial<{
    city: string;
    employment: string;
    dependents: number;
    monthlyIncomePaise: number;
    monthlySpendPaise: number;
    emergencyFundPaise: number;
    primaryGoal: string;
    goalAmountPaise: number;
    goalMonths: number;
    riskComfort: string;
    onboardedAt: string | null;
  }>
): void {
  const db = getDb();
  const existing = one<ProfileRow>(db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId));

  if (!existing) {
    db.prepare(
      `INSERT INTO profiles (user_id, city, employment, dependents, monthly_income_paise,
        monthly_spend_paise, emergency_fund_paise, primary_goal, goal_amount_paise, goal_months,
        risk_comfort, onboarded_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      input.city ?? null,
      input.employment ?? null,
      input.dependents ?? 0,
      input.monthlyIncomePaise ?? 0,
      input.monthlySpendPaise ?? 0,
      input.emergencyFundPaise ?? 0,
      input.primaryGoal ?? null,
      input.goalAmountPaise ?? 0,
      input.goalMonths ?? 0,
      input.riskComfort ?? null,
      input.onboardedAt ?? null,
      nowIso()
    );
    return;
  }

  db.prepare(
    `UPDATE profiles SET city = ?, employment = ?, dependents = ?, monthly_income_paise = ?,
      monthly_spend_paise = ?, emergency_fund_paise = ?, primary_goal = ?, goal_amount_paise = ?,
      goal_months = ?, risk_comfort = ?, onboarded_at = ?, updated_at = ? WHERE user_id = ?`
  ).run(
    input.city ?? existing.city,
    input.employment ?? existing.employment,
    input.dependents ?? existing.dependents,
    input.monthlyIncomePaise ?? existing.monthly_income_paise,
    input.monthlySpendPaise ?? existing.monthly_spend_paise,
    input.emergencyFundPaise ?? existing.emergency_fund_paise,
    input.primaryGoal ?? existing.primary_goal,
    input.goalAmountPaise ?? existing.goal_amount_paise,
    input.goalMonths ?? existing.goal_months,
    input.riskComfort ?? existing.risk_comfort,
    input.onboardedAt !== undefined ? input.onboardedAt : existing.onboarded_at,
    nowIso(),
    userId
  );
}

export function updateUserName(userId: string, name: string): void {
  getDb().prepare("UPDATE users SET name = ? WHERE id = ?").run(name, userId);
}

export function emailExists(email: string): boolean {
  return Boolean(
    getDb().prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase())
  );
}

export function deleteUser(userId: string): void {
  getDb().prepare("DELETE FROM users WHERE id = ?").run(userId);
}

/* ------------------------------- sample data ------------------------------ */

const SAMPLE_SHOPS: [string, number, number][] = [
  // description, min rupees, max rupees
  ["SWIGGY ORDER", 280, 780],
  ["ZOMATO DINNER", 320, 900],
  ["BLINKIT GROCERY", 600, 2400],
  ["BIGBASKET ORDER", 900, 2600],
  ["UBER RIDE", 120, 480],
  ["OLA CABS", 140, 520],
  ["AMAZON PAY ORDER", 500, 3200],
  ["MYNTRA ORDER", 900, 4200],
  ["RELIANCE FRESH", 700, 2100],
  ["APOLLO PHARMACY", 180, 950],
  ["IRCTC TICKET", 450, 1800],
  ["CAFE COFFEE DAY", 180, 520],
  ["PVR CINEMAS", 400, 1200],
  ["DECATHLON STORE", 1200, 3400],
];

export function seedSampleData(userId: string): number {
  const db = getDb();
  const existing = one<{ count: number }>(
    db.prepare("SELECT COUNT(*) AS count FROM transactions WHERE user_id = ? AND source = 'sample'").get(userId)
  );
  if ((existing?.count ?? 0) > 0) return 0;

  const accounts = listAccounts(userId);
  if (accounts.length === 0) {
    addAccount({
      userId,
      kind: "Credit card",
      name: "Millennia card",
      institution: "HDFC Bank",
      last4: "4412",
      creditLimitPaise: 470_000_00,
      outstandingPaise: 159_800_00,
      source: "sample",
    });
    addAccount({
      userId,
      kind: "Loan",
      name: "Car loan",
      institution: "HDFC Bank",
      interestRate: 9.2,
      emiPaise: 9_800_00,
      outstandingPaise: 242_000_00,
      source: "sample",
    });
    addAccount({
      userId,
      kind: "Loan",
      name: "Personal loan",
      institution: "ICICI Bank",
      interestRate: 14.5,
      emiPaise: 4_200_00,
      outstandingPaise: 78_000_00,
      source: "sample",
    });
  }

  const now = new Date();
  const items: Parameters<typeof importRows>[1] = [];
  let serial = 0;

  const push = (
    date: Date,
    description: string,
    rupees: number,
    direction: "debit" | "credit",
    category?: string
  ) => {
    const classified = classify(description, direction);
    const hash = createHash("sha1")
      .update(`sample|${date.toISOString().slice(0, 10)}|${rupees}|${description}|${serial++}`)
      .digest("hex");
    items.push({
      occurred_on: date.toISOString().slice(0, 10),
      description,
      merchant: classified.merchant,
      category: category ?? classified.category,
      amount_paise: rupees * 100,
      direction,
      dedupe_hash: hash,
    });
  };

  for (let offset = 5; offset >= 0; offset--) {
    const base = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = base.getFullYear();
    const month = base.getMonth();
    const day = (value: number) =>
      new Date(year, month, Math.min(value, new Date(year, month + 1, 0).getDate()));

    push(day(1), "SALARY ACME PVT LTD", 95_000, "credit");
    push(day(3), "RENT TRANSFER LANDLORD", 22_000, "debit", "Rent");
    push(day(4), "HDFC CAR LOAN EMI", 9_800, "debit", "EMI & loans");
    push(day(5), "ICICI PERSONAL LOAN EMI", 4_200, "debit", "EMI & loans");
    push(day(6), "NETFLIX SUBSCRIPTION", 649, "debit", "Entertainment");
    push(day(6), "PRIME VIDEO", 299, "debit", "Entertainment");
    push(day(7), "SPOTIFY PREMIUM", 119, "debit", "Entertainment");
    push(day(8), "GOOGLE ONE STORAGE", 210, "debit", "Entertainment");
    push(day(9), "AIRTEL POSTPAID", 799, "debit", "Utilities");
    push(day(10), "BESCOM ELECTRICITY", 1_400 + (offset % 3) * 220, "debit", "Utilities");
    push(day(11), "JIO FIBER BROADBAND", 999, "debit", "Utilities");
    push(day(12), "LIC PREMIUM", 1_560, "debit", "Insurance");
    push(day(14), "HDFC CREDIT CARD PAYMENT", 12_000, "debit", "EMI & loans");

    // variable spending — deterministic-ish per month
    const picks = 18 + (offset % 3) * 2;
    for (let i = 0; i < picks; i++) {
      const [description, min, max] = SAMPLE_SHOPS[(i * 5 + offset) % SAMPLE_SHOPS.length];
      const amount = min + ((i * 173 + offset * 97) % (max - min));
      push(day(13 + (i % 15)), description, amount, "debit");
    }

    if (offset === 2) push(day(22), "FREELANCE INVOICE", 18_000, "credit");
  }

  return importRows(userId, items);
}

export function removeSampleData(userId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM transactions WHERE user_id = ? AND source = 'sample'").run(userId);
  db.prepare("DELETE FROM accounts WHERE user_id = ? AND source = 'sample'").run(userId);
}

export function hasSampleData(userId: string): boolean {
  const row = one<{ count: number }>(
    getDb()
      .prepare("SELECT COUNT(*) AS count FROM transactions WHERE user_id = ? AND source = 'sample'")
      .get(userId)
  );
  return (row?.count ?? 0) > 0;
}

export function monthOptions(transactions: Transaction[]): string[] {
  return Array.from(new Set(transactions.map((tx) => monthKey(tx.occurred_on)))).sort().reverse();
}
