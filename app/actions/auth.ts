"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  getCurrentUser,
  getProfile,
  getSessionToken,
  hashPassword,
  sessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { getDb, nowIso, one } from "@/lib/db";
import {
  checkInvite,
  inviteErrorMessage,
  isInviteOnly,
  redeemInvite,
} from "@/lib/invites";
import { clearRateLimit, isEmail, rateLimit, text, type ActionState } from "@/lib/validate";

export async function signupAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = text(formData, "name", 80);
  const email = text(formData, "email", 160).toLowerCase();
  const password = text(formData, "password", 200);
  const confirm = text(formData, "confirm", 200);
  const inviteCode = text(formData, "invite", 40);
  const terms = formData.get("terms");

  if (name.length < 2) return { ok: false, error: "Enter your name." };
  if (!isEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 8)
    return { ok: false, error: "Use at least 8 characters for your password." };
  if (password !== confirm) return { ok: false, error: "Passwords do not match." };
  if (!terms) return { ok: false, error: "Please accept the data-use note to continue." };

  const inviteOnly = isInviteOnly();
  if (inviteOnly && !inviteCode)
    return { ok: false, error: "PaisaPilot is invite-only. Enter the code from your invite." };

  // Throttle account creation per email and globally, whether or not this
  // instance is in invite-only mode.
  if (!rateLimit(`signup:${email}`, 5, 60 * 60_000))
    return { ok: false, error: "Too many signup attempts. Try again in an hour." };
  if (!rateLimit("signup:global", 60, 60 * 60_000))
    return { ok: false, error: "Signups are paused for a moment. Try again shortly." };

  if (inviteOnly) {
    const check = checkInvite(inviteCode, email);
    if (!check.ok) return { ok: false, error: inviteErrorMessage(check.reason) };
  }

  const db = getDb();
  const existing = one<{ id: string }>(db.prepare("SELECT id FROM users WHERE email = ?").get(email));
  if (existing) return { ok: false, error: "An account with this email already exists." };

  const id = randomUUID();
  try {
    db.exec("BEGIN IMMEDIATE");

    // Claim the invite inside the transaction so two concurrent signups cannot
    // both consume the final use of a code.
    if (inviteOnly && !redeemInvite(inviteCode, email)) {
      db.exec("ROLLBACK");
      return { ok: false, error: inviteErrorMessage("used") };
    }

    db.prepare(
      "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, email, name, hashPassword(password), nowIso());
    db.prepare(
      `INSERT INTO profiles (user_id, dependents, monthly_income_paise, monthly_spend_paise,
        emergency_fund_paise, goal_amount_paise, goal_months, updated_at)
       VALUES (?, 0, 0, 0, 0, 0, 0, ?)`
    ).run(id, nowIso());

    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // already rolled back
    }
    if (String(error).includes("UNIQUE")) {
      return { ok: false, error: "An account with this email already exists." };
    }
    throw error;
  }

  const session = createSession(id);
  const store = await cookies();
  store.set(sessionCookie(session.token, session.expiresAt));
  redirect("/onboarding");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = text(formData, "email", 160).toLowerCase();
  const password = text(formData, "password", 200);

  if (!isEmail(email) || !password)
    return { ok: false, error: "Enter your email and password." };

  const key = `login:${email}`;
  if (!rateLimit(key))
    return { ok: false, error: "Too many attempts. Try again in a few minutes." };

  const user = one<{ id: string; password_hash: string }>(
    getDb().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email)
  );
  if (!user || !verifyPassword(password, user.password_hash))
    return { ok: false, error: "Email or password is incorrect." };

  clearRateLimit(key);
  const session = createSession(user.id);
  const store = await cookies();
  store.set(sessionCookie(session.token, session.expiresAt));
  store.set("paisa_seen", "", { path: "/", maxAge: 0 });

  const profile = getProfile(user.id);
  redirect(profile?.onboarded_at ? "/dashboard" : "/onboarding");
}

export async function logoutAction(): Promise<void> {
  const token = await getSessionToken();
  if (token) deleteSession(token);
  const store = await cookies();
  store.set(clearSessionCookie());
  redirect("/");
}

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const confirm = text(formData, "confirm", 40);
  if (confirm !== "DELETE") redirect("/settings?error=confirm");
  getDb().prepare("DELETE FROM users WHERE id = ?").run(user.id);
  const store = await cookies();
  store.set(clearSessionCookie());
  redirect("/?deleted=1");
}
