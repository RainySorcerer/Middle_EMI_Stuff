import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { buildFacts } from "@/lib/analytics";
import { getLatestAnalysis, loadRawData } from "@/lib/store";
import { GOAL_LABELS } from "@/lib/domain";
import { inrP } from "@/lib/money";
import { formatLongDate } from "@/lib/money";
import { generateAnalysisAction } from "@/app/actions/analysis";
import { ScoreBar, ScoreRing } from "@/components/app/score-ring";
import { InsightCard } from "@/components/app/insight-card";
import { CategoryBreakdown } from "@/components/app/category-breakdown";
import { EmptyRecords } from "@/components/app/empty-records";
import { GenerateReportButton } from "@/components/app/generate-report-button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage() {
  const { user, profile } = await requireOnboardedUser();
  const data = loadRawData(user.id);
  if (!data) return null;

  const facts = buildFacts(data);
  const latest = getLatestAnalysis(user.id);
  const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  const strongest = facts.scoreParts.reduce((worst, part) =>
    part.score / part.max < worst.score / worst.max ? part : worst
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink-900 sm:text-[30px]">
            Insights
          </h1>
          <p className="mt-1 max-w-2xl text-[13.5px] text-ink-500">
            A computed read of your money, with a written summary you can regenerate at any time.
          </p>
        </div>

        {facts.hasData ? (
          <form action={generateAnalysisAction}>
            <GenerateReportButton label={latest ? "Refresh report" : "Generate report"} />
          </form>
        ) : null}
      </header>

      {!facts.hasData ? (
        <EmptyRecords />
      ) : (
        <>
          {latest ? (
            <section className="card-surface overflow-hidden">
              <div className="border-b border-ink-100 bg-brand-950 px-5 py-5 text-brand-50 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brand-200">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {latest.engine === "PaisaPilot rules"
                      ? "PaisaPilot analyst"
                      : `${latest.engine} · AI summary`}
                  </p>
                  <p className="text-[10.5px] text-brand-200/80">
                    {formatLongDate(latest.created_at.slice(0, 10))}
                  </p>
                </div>
                <h2 className="mt-2.5 text-[21px] font-semibold leading-tight tracking-[-0.01em] text-brand-50 sm:text-[24px]">
                  {latest.headline}
                </h2>
                <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-brand-100/90">
                  {latest.summary}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[11.5px] text-ink-500 sm:px-6">
                <p>
                  {latest.engine === "PaisaPilot rules"
                    ? "Local analyst used — add an Anthropic or OpenAI API key for written AI narration."
                    : "AI writes the summary; every rupee figure is computed from your records."}
                </p>
                <form action={generateAnalysisAction}>
                  <GenerateReportButton label="Regenerate" variant="secondary" />
                </form>
              </div>
            </section>
          ) : (
            <section className="card-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-700">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[14.5px] font-semibold">Your written report is ready to run</h2>
                  <p className="mt-0.5 max-w-[58ch] text-[12.5px] leading-relaxed text-ink-500">
                    {aiConfigured
                      ? "The AI reads the computed facts only — no raw transaction text leaves this app."
                      : "The local analyst builds the summary from computed facts. Add an API key in .env to use Claude or OpenAI for the wording."}
                  </p>
                </div>
              </div>
              <form action={generateAnalysisAction} className="shrink-0">
                <GenerateReportButton />
              </form>
            </section>
          )}

          <section className="grid gap-3 lg:grid-cols-12" aria-labelledby="score">
            <div className="card-surface p-5 lg:col-span-5">
              <div className="flex items-center gap-4">
                <ScoreRing score={facts.healthScore} size={92} />
                <div>
                  <h2 id="score" className="text-[15px] font-semibold">
                    Financial score
                  </h2>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
                    {facts.healthScore >= 75
                      ? "Strong. Protect the basics and review quarterly."
                      : facts.healthScore >= 50
                        ? "Workable. One or two fixes move this the most."
                        : "Fragile. Start with the highlighted gap below."}
                  </p>
                  <p className="mt-1 text-[11.5px] text-ink-600">
                    Biggest gap: <strong>{strongest.label}</strong>
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3.5">
                {facts.scoreParts.map((part) => (
                  <ScoreBar key={part.label} {...part} />
                ))}
              </div>
            </div>

            <div className="card-surface p-5 lg:col-span-7">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Where it went</h2>
                <span className="text-[11px] text-ink-500">Last 90 days</span>
              </div>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <CategoryBreakdown categories={facts.categoryTotals} limit={8} />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    Top merchants
                  </p>
                  <ul className="mt-2 space-y-2">
                    {facts.topMerchants.slice(0, 6).map((merchant) => (
                      <li
                        key={merchant.merchant}
                        className="flex items-baseline justify-between gap-3 border-b border-ink-100 pb-2 text-[12px] last:border-0"
                      >
                        <span className="truncate text-ink-700">{merchant.merchant}</span>
                        <span className="numeric shrink-0 text-ink-900">
                          {inrP(merchant.paise)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="moves">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 id="moves" className="text-[15px] font-semibold">
                Ranked moves
              </h2>
              <p className="text-[11.5px] text-ink-500">Ordered by potential monthly impact</p>
            </div>
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {facts.insights.map((insight, index) => (
                <InsightCard key={insight.id} insight={insight} index={index} />
              ))}
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-12" aria-labelledby="recurring">
            <div className="card-surface p-5 lg:col-span-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="recurring" className="text-[15px] font-semibold">
                    Repeating payments
                  </h2>
                  <p className="mt-0.5 text-[11.5px] text-ink-500">
                    Same merchant in two or more months, similar amount
                  </p>
                </div>
                <div className="text-right">
                  <p className="numeric text-[15px] font-semibold text-ink-900">
                    {inrP(facts.recurringTotalPaise)}
                  </p>
                  <p className="text-[10.5px] text-ink-500">per month</p>
                </div>
              </div>

              {facts.recurring.length === 0 ? (
                <p className="mt-3 rounded-xl bg-ink-50 px-3.5 py-4 text-[12.5px] text-ink-500">
                  No repeating payments detected yet. Import at least two months of records.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-ink-100">
                  {facts.recurring.map((charge) => (
                    <li key={`${charge.merchant}-${charge.averagePaise}`} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-ink-900">
                          {charge.merchant}
                        </p>
                        <p className="text-[11px] text-ink-500">
                          {charge.category} · seen in {charge.months} months
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="numeric text-[12.5px] font-medium">{inrP(charge.averagePaise)}</p>
                        <p className="numeric text-[10.5px] text-ink-500">
                          {inrP(charge.averagePaise * 12)}/yr
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-gold-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-gold-900">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Recurring does not mean unused. Check each one before cancelling — we can only see
                the payment, not your usage.
              </p>
            </div>

            <div className="card-surface p-5 lg:col-span-5">
              <h2 className="text-[15px] font-semibold">Your goal</h2>
              {facts.goal ? (
                <>
                  <p className="mt-2 text-[13px] font-medium text-ink-800">{facts.goal.label}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-ink-50 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-ink-400">Target</p>
                      <p className="numeric mt-0.5 text-[15px] font-semibold">
                        {inrP(facts.goal.amountPaise)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-ink-50 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-ink-400">Timeline</p>
                      <p className="numeric mt-0.5 text-[15px] font-semibold">
                        {facts.goal.months} mo
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-[11.5px]">
                      <span className="text-ink-500">Needed monthly</span>
                      <span className="numeric font-medium">
                        {inrP(facts.goal.requiredMonthlyPaise)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between text-[11.5px]">
                      <span className="text-ink-500">Current surplus</span>
                      <span className="numeric font-medium">
                        {inrP(facts.monthlySurplusPaise)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge tone={facts.goal.feasible ? "good" : "watch"}>
                      {facts.goal.feasible ? "On track" : `${inrP(facts.goal.gapPaise)}/mo short`}
                    </Badge>
                  </div>
                  <Link
                    href="/onboarding?edit=1"
                    className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-800 hover:underline"
                  >
                    Adjust goal
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">
                    {profile.primary_goal
                      ? `${GOAL_LABELS[profile.primary_goal] ?? "Your goal"} — add a target amount and timeline to test if it is realistic.`
                      : "No goal set yet. A target makes the surplus actionable."}
                  </p>
                  <Link
                    href="/onboarding?edit=1"
                    className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-800 hover:underline"
                  >
                    Set a goal
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </>
              )}

              <div className="mt-5 border-t border-ink-100 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  Data behind this
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">
                  {facts.transactionCount} records over {facts.monthsCovered.length} month
                  {facts.monthsCovered.length === 1 ? "" : "s"} · income{" "}
                  {facts.incomeSource === "profile" ? "from profile" : "from credits"} · spend{" "}
                  {facts.spendSource === "transactions" ? "from records" : "from profile"}.
                </p>
                <Link
                  href="/activity"
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-800 hover:underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Update records
                </Link>
              </div>
            </div>
          </section>

          <p className="rounded-xl border border-ink-200 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-ink-500">
            PaisaPilot is an educational analyst, not a registered investment adviser. It does not
            move money, recommend specific securities or guarantee outcomes. Tax and credit rules
            change; confirm decisions with a qualified professional.
          </p>
        </>
      )}
    </div>
  );
}
