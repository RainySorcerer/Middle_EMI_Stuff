import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  Landmark,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { buildFacts, monthLabel } from "@/lib/analytics";
import { getLatestAnalysis, hasSampleData, loadRawData } from "@/lib/store";
import { removeSampleAction } from "@/app/actions/data";
import { GOAL_LABELS } from "@/lib/domain";
import { inrP } from "@/lib/money";
import { formatShortDate } from "@/lib/money";
import { ScoreRing } from "@/components/app/score-ring";
import { InsightCard } from "@/components/app/insight-card";
import { CategoryBreakdown } from "@/components/app/category-breakdown";
import { EmptyRecords } from "@/components/app/empty-records";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user, profile } = await requireOnboardedUser();
  const data = loadRawData(user.id);
  if (!data) return null;

  const facts = buildFacts(data);
  const latest = getLatestAnalysis(user.id);
  const sample = hasSampleData(user.id);
  const firstName = user.name.split(" ")[0];
  const recent = data.transactions.slice(0, 6);
  const change =
    facts.previousMonthSpendPaise > 0
      ? ((facts.currentMonthSpendPaise - facts.previousMonthSpendPaise) /
          facts.previousMonthSpendPaise) *
        100
      : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-medium text-ink-500">
            {facts.currentMonthLabel} · {profile.city ?? "India"}
          </p>
          <h1 className="mt-1 text-[27px] font-semibold tracking-[-0.025em] text-ink-900 sm:text-[32px]">
            Hello, {firstName}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-500">
            {facts.hasData
              ? `${facts.transactionCount} records read. Here is the honest version of your month.`
              : "One upload is all it takes to see where your money goes."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/insights" className="btn-secondary">
            <Sparkles className="h-4 w-4 text-gold-600" aria-hidden="true" />
            Insights
          </Link>
          <Link href="/activity" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add records
          </Link>
        </div>
      </header>

      {sample ? (
        <div className="flex flex-col gap-2 rounded-xl border border-gold-200 bg-gold-50 px-3.5 py-2.5 text-[12px] text-gold-900 sm:flex-row sm:items-center sm:justify-between">
          <p>
            You are viewing six months of sample data. Replace it with your own whenever you are
            ready.
          </p>
          <form action={removeSampleAction}>
            <button type="submit" className="shrink-0 font-semibold underline">
              Remove sample data
            </button>
          </form>
        </div>
      ) : null}

      {!facts.hasData ? (
        <EmptyRecords sample={sample} />
      ) : (
        <>
          <section className="grid gap-3 lg:grid-cols-12" aria-label="This month">
            <div className="card-surface flex items-center gap-5 p-5 lg:col-span-4">
              <ScoreRing score={facts.healthScore} size={104} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Financial score
                </p>
                <p className="mt-1 text-[15px] font-semibold text-ink-900">
                  {facts.healthScore >= 75
                    ? "Solid foundation"
                    : facts.healthScore >= 50
                      ? "Workable, worth tuning"
                      : "Under pressure"}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
                  Built from savings, card use, emergency cover, debt and repeating payments.
                </p>
                <Link
                  href="/insights"
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-800 hover:underline"
                >
                  See the breakdown
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="card-surface p-5 lg:col-span-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    Left after spending
                  </p>
                  <p className="text-[10.5px] text-ink-400">
                    {facts.spendSource === "transactions" ? "3-month average" : "From your profile"}
                  </p>
                  <p className="numeric mt-1 text-[30px] font-semibold leading-none tracking-tight text-ink-900">
                    {inrP(Math.max(0, facts.monthlySurplusPaise))}
                  </p>
                  <p className="mt-1.5 text-[12px] text-ink-500">
                    {facts.monthlySurplusPaise > 0
                      ? `A ${Math.max(0, Math.round(facts.savingsRate))}% savings rate on ${inrP(facts.monthlyIncomePaise)} in.`
                      : `Spending is ${inrP(Math.abs(facts.monthlySurplusPaise))} more than income.`}
                  </p>
                </div>
                {change !== null ? (
                  <Badge tone={change > 10 ? "watch" : change < -5 ? "good" : "neutral"}>
                    {change > 0 ? (
                      <TrendingUp className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="h-3 w-3" aria-hidden="true" />
                    )}
                    {Math.abs(Math.round(change))}% vs last month
                  </Badge>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-ink-100 pt-4">
                <div>
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">
                    Money in
                  </p>
                  <p className="numeric mt-0.5 text-[15px] font-semibold text-ink-900">
                    {inrP(facts.monthlyIncomePaise)}
                  </p>
                  <p className="text-[10.5px] text-ink-500">
                    {facts.incomeSource === "profile" ? "From your profile" : "From credits"}
                  </p>
                </div>
                <div>
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">
                    Spent this month
                  </p>
                  <p className="numeric mt-0.5 text-[15px] font-semibold text-ink-900">
                    {inrP(facts.currentMonthSpendPaise)}
                  </p>
                  <p className="text-[10.5px] text-ink-500">{facts.currentMonthLabel}</p>
                </div>
                <div>
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">
                    Emergency cover
                  </p>
                  <p className="numeric mt-0.5 text-[15px] font-semibold text-ink-900">
                    {facts.emergencyMonths.toFixed(1)} mo
                  </p>
                  <p className="text-[10.5px] text-ink-500">
                    Target {inrP(facts.emergencyTargetPaise)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-12" aria-labelledby="moves">
            <div className="lg:col-span-7">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 id="moves" className="text-[15px] font-semibold text-ink-900">
                  Your next moves
                </h2>
                <Link
                  href="/insights"
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-800 hover:underline"
                >
                  Full report
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {facts.insights.slice(0, 4).map((insight, index) => (
                  <InsightCard key={insight.id} insight={insight} index={index} compact />
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="card-surface h-full p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-ink-900">Where it went</h2>
                  <span className="text-[11px] text-ink-500">Last 90 days</span>
                </div>
                <div className="mt-4">
                  <CategoryBreakdown categories={facts.categoryTotals} limit={5} />
                </div>
                <Link
                  href="/insights"
                  className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-800 hover:underline"
                >
                  All categories &amp; recurring payments
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-12" aria-labelledby="recent">
            <div className="card-surface p-5 lg:col-span-7">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="recent" className="text-[15px] font-semibold">
                  Recent activity
                </h2>
                <Link
                  href="/activity"
                  className="text-[12px] font-semibold text-brand-800 hover:underline"
                >
                  View all
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="rounded-lg bg-ink-50 px-3 py-4 text-[12.5px] text-ink-500">
                  Nothing here yet.
                </p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {recent.map((tx) => (
                    <li key={tx.id} className="flex items-center gap-3 py-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-50 text-ink-500">
                        {tx.direction === "credit" ? (
                          <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink-900">
                          {tx.description}
                        </p>
                        <p className="text-[11px] text-ink-500">
                          {formatShortDate(tx.occurred_on)} · {tx.category}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "numeric shrink-0 text-[13px] font-semibold",
                          tx.direction === "credit" ? "text-success" : "text-ink-900"
                        )}
                      >
                        {tx.direction === "credit" ? "+" : "−"}
                        {inrP(tx.amount_paise)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card-surface p-5 lg:col-span-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Tracked accounts</h2>
                <Link href="/settings#accounts" className="text-[12px] font-semibold text-brand-800 hover:underline">
                  Manage
                </Link>
              </div>

              {data.accounts.length === 0 ? (
                <div className="mt-3 rounded-xl bg-ink-50 p-3.5">
                  <p className="text-[12.5px] leading-relaxed text-ink-600">
                    Add a card limit or loan EMI to see utilisation and debt load in your score.
                  </p>
                  <Link
                    href="/settings#accounts"
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-800 hover:underline"
                  >
                    Add an account
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {data.accounts.slice(0, 4).map((account) => (
                    <li
                      key={account.id}
                      className="flex items-start gap-2.5 rounded-lg border border-ink-100 px-3 py-2.5"
                    >
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                        {account.kind === "Credit card" ? (
                          <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-ink-900">
                          {account.name}
                        </p>
                        <p className="text-[11px] text-ink-500">
                          {account.kind === "Credit card"
                            ? `${inrP(account.outstanding_paise)} of ${inrP(account.credit_limit_paise)} used`
                            : account.kind === "Loan"
                              ? `${inrP(account.emi_paise)}/mo · ${account.interest_rate}%`
                              : account.kind}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 border-t border-ink-100 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  Your goal
                </p>
                <p className="mt-1 text-[12.5px] text-ink-700">
                  {profile.primary_goal
                    ? GOAL_LABELS[profile.primary_goal] ?? "Your goal"
                    : "No goal set yet"}
                </p>
                {facts.goal ? (
                  <p className="mt-0.5 text-[11.5px] text-ink-500">
                    {inrP(facts.goal.amountPaise)} in {facts.goal.months} months ·{" "}
                    {inrP(facts.goal.requiredMonthlyPaise)}/mo needed
                  </p>
                ) : (
                  <Link
                    href="/onboarding?edit=1"
                    className="mt-1 inline-flex text-[11.5px] font-semibold text-brand-800 hover:underline"
                  >
                    Set a goal
                  </Link>
                )}
              </div>
            </div>
          </section>

          <p className="px-1 text-[11px] leading-relaxed text-ink-500">
            {facts.incomeSource === "profile"
              ? "Income comes from your profile; spending is averaged from your records."
              : "Income and spending are averaged from your records."}{" "}
            {latest
              ? `Last AI report: ${new Date(latest.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })} (${latest.engine}).`
              : "Run the AI report for a written summary."}{" "}
            Educational analysis, not financial advice.
          </p>
        </>
      )}

      {!facts.hasData && profile.monthly_income_paise > 0 ? (
        <section className="card-surface p-5">
          <h2 className="text-[15px] font-semibold">Your plan so far</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-400">Monthly income</p>
              <p className="numeric mt-0.5 text-[18px] font-semibold">
                {inrP(profile.monthly_income_paise)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-400">Goal</p>
              <p className="mt-0.5 text-[13px] font-medium">
                {profile.primary_goal
                  ? GOAL_LABELS[profile.primary_goal] ?? "Your goal"
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-400">Months of cover</p>
              <p className="numeric mt-0.5 text-[18px] font-semibold">
                {facts.emergencyMonths.toFixed(1)}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
