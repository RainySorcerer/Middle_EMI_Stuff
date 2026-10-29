import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth";
import { hasSampleData, listAccounts, countTransactions } from "@/lib/store";
import { OnboardingWizard } from "@/components/app/onboarding-wizard";

export const metadata: Metadata = { title: "Setup" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const user = await requireUser();
  const profile = getProfile(user.id);
  const editing = edit === "1";

  if (profile?.onboarded_at && !editing) redirect("/dashboard");

  const accounts = listAccounts(user.id).map((account) => ({
    id: account.id,
    name: account.name,
    kind: account.kind,
  }));

  return (
    <OnboardingWizard
      user={{ name: user.name, email: user.email }}
      initial={{
        name: user.name,
        city: profile?.city ?? "",
        employment: profile?.employment ?? "",
        dependents: profile?.dependents ?? 0,
        income: Math.round((profile?.monthly_income_paise ?? 0) / 100),
        spend: Math.round((profile?.monthly_spend_paise ?? 0) / 100),
        emergency: Math.round((profile?.emergency_fund_paise ?? 0) / 100),
        goal: profile?.primary_goal ?? "",
        goalAmount: Math.round((profile?.goal_amount_paise ?? 0) / 100),
        goalMonths: profile?.goal_months ?? 0,
        risk: profile?.risk_comfort ?? "",
      }}
      accounts={accounts}
      txCount={countTransactions(user.id)}
      sample={hasSampleData(user.id)}
      editing={editing}
    />
  );
}
