"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getProfile, requireUser } from "@/lib/auth";
import { EMPLOYMENT, GOALS, RISK } from "@/lib/domain";
import { updateUserName, upsertProfile } from "@/lib/store";
import { type ActionState } from "@/lib/validate";

export interface ProfileStepInput {
  step: 1 | 2 | 3;
  name?: string;
  city?: string;
  employment?: string;
  dependents?: number;
  monthlyIncomeRupees?: number;
  monthlySpendRupees?: number;
  emergencyFundRupees?: number;
  primaryGoal?: string;
  goalAmountRupees?: number;
  goalMonths?: number;
  riskComfort?: string;
}

export async function saveProfileStep(input: ProfileStepInput): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  if (input.step === 1) {
    const name = (input.name ?? "").trim().slice(0, 80);
    if (name.length < 2) return { ok: false, error: "Enter your name." };
    if (!input.city?.trim()) return { ok: false, error: "Select your city." };
    if (!EMPLOYMENT.includes(input.employment as (typeof EMPLOYMENT)[number]))
      return { ok: false, error: "Select how you earn." };
    updateUserName(user.id, name);
    upsertProfile(user.id, {
      city: input.city.trim().slice(0, 60),
      employment: input.employment,
      dependents: clampNumber(input.dependents, 0, 12),
    });
  }

  if (input.step === 2) {
    const income = clampNumber(input.monthlyIncomeRupees, 0, 100_000_000);
    if (income <= 0) return { ok: false, error: "Enter your monthly take-home income." };
    upsertProfile(user.id, {
      monthlyIncomePaise: Math.round(income * 100),
      monthlySpendPaise: Math.round(clampNumber(input.monthlySpendRupees, 0, 100_000_000) * 100),
      emergencyFundPaise: Math.round(
        clampNumber(input.emergencyFundRupees, 0, 1_000_000_000) * 100
      ),
    });
  }

  if (input.step === 3) {
    if (!GOALS.some((goal) => goal.id === input.primaryGoal))
      return { ok: false, error: "Choose what you are working towards." };
    if (!RISK.includes(input.riskComfort as (typeof RISK)[number]))
      return { ok: false, error: "Choose how you feel about risk." };
    const amount = clampNumber(input.goalAmountRupees, 0, 1_000_000_000);
    const months = clampNumber(input.goalMonths, 0, 600);
    upsertProfile(user.id, {
      primaryGoal: input.primaryGoal,
      goalAmountPaise: Math.round(amount * 100),
      goalMonths: months,
      riskComfort: input.riskComfort,
    });
  }

  return { ok: true };
}

export async function finishOnboarding(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  const profile = getProfile(user.id);
  if (!profile || profile.monthly_income_paise <= 0)
    return { ok: false, error: "Add your monthly income before finishing." };
  upsertProfile(user.id, { onboardedAt: new Date().toISOString() });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const city = String(formData.get("city") ?? "").trim().slice(0, 60);
  const employment = String(formData.get("employment") ?? "");
  const income = Number(String(formData.get("income") ?? "").replace(/[^0-9.]/g, ""));
  const spend = Number(String(formData.get("spend") ?? "").replace(/[^0-9.]/g, ""));
  const emergency = Number(String(formData.get("emergency") ?? "").replace(/[^0-9.]/g, ""));
  const goal = String(formData.get("goal") ?? "");
  const goalAmount = Number(String(formData.get("goalAmount") ?? "").replace(/[^0-9.]/g, ""));
  const goalMonths = Number(String(formData.get("goalMonths") ?? "").replace(/[^0-9]/g, ""));
  const risk = String(formData.get("risk") ?? "");

  if (name.length < 2) return { ok: false, error: "Enter your name." };
  if (!Number.isFinite(income) || income <= 0)
    return { ok: false, error: "Enter a valid monthly income." };

  updateUserName(user.id, name);
  upsertProfile(user.id, {
    city,
    employment: EMPLOYMENT.includes(employment as (typeof EMPLOYMENT)[number])
      ? employment
      : undefined,
    monthlyIncomePaise: Math.round(income * 100),
    monthlySpendPaise: Math.round(Math.max(0, spend) * 100),
    emergencyFundPaise: Math.round(Math.max(0, emergency) * 100),
    primaryGoal: GOALS.some((item) => item.id === goal) ? goal : undefined,
    goalAmountPaise: Math.round(Math.max(0, goalAmount) * 100),
    goalMonths: Math.max(0, Math.min(600, Math.round(goalMonths))),
    riskComfort: RISK.includes(risk as (typeof RISK)[number]) ? risk : undefined,
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/insights");
  return { ok: true, message: "Profile updated." };
}

function clampNumber(value: number | undefined, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
