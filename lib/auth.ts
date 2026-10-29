import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, nowIso, one } from "./db";

const COOKIE = "paisa_session";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface ProfileRow {
  user_id: string;
  city: string | null;
  employment: string | null;
  dependents: number;
  monthly_income_paise: number;
  monthly_spend_paise: number;
  emergency_fund_paise: number;
  primary_goal: string | null;
  goal_amount_paise: number;
  goal_months: number;
  risk_comfort: string | null;
  onboarded_at: string | null;
  updated_at: string;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(userId: string): { token: string; expiresAt: Date } {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(hashToken(token), userId, nowIso(), expiresAt.toISOString());
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(nowIso());
  return { token, expiresAt };
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function sessionCookie(token: string, expiresAt: Date) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE)?.value;
}

export async function getCurrentUser(): Promise<SessionUser | undefined> {
  const token = await getSessionToken();
  if (!token) return undefined;
  const row = one<SessionUser>(
    getDb()
      .prepare(
        `SELECT u.id, u.email, u.name, u.created_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?`
      )
      .get(hashToken(token), nowIso())
  );
  return row;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function getProfile(userId: string): ProfileRow | undefined {
  return one<ProfileRow>(
    getDb().prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId)
  );
}

/** User plus their onboarding progress; redirects to /onboarding until complete. */
export async function requireOnboardedUser(): Promise<{
  user: SessionUser;
  profile: ProfileRow;
}> {
  const user = await requireUser();
  const profile = getProfile(user.id);
  if (!profile?.onboarded_at) redirect("/onboarding");
  return { user, profile };
}
