import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileUp,
  LockKeyhole,
  ScanLine,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ScoreRing } from "@/components/app/score-ring";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "PaisaPilot — know where your money goes",
  description:
    "Upload a bank or UPI statement, answer a short questionnaire, and get a scored monthly analysis of your spending, subscriptions, cards and goals.",
};

const STEPS = [
  {
    title: "Answer six questions",
    body: "Income, city, dependants, emergency savings and one goal. No bank login, no paperwork.",
    icon: Wallet,
  },
  {
    title: "Bring your records",
    body: "Drop in a bank, UPI or card CSV — or type a few transactions by hand. We read Indian date and amount formats.",
    icon: FileUp,
  },
  {
    title: "Read your month",
    body: "A score, spending breakdown, repeating payments and the top moves with a rupee impact on each.",
    icon: Sparkles,
  },
];

const FEATURES = [
  "Recurring and subscription detection from your own statement",
  "Credit utilisation and total EMI burden across accounts",
  "Emergency-fund cover in months, not guesswork",
  "Goal feasibility against your real monthly surplus",
  "CSV import with duplicate protection",
  "Export or delete everything in one click",
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-1.5" aria-label="Account">
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>
      </header>

      {deleted ? (
        <div className="mx-auto mt-2 w-full max-w-[1180px] px-5 sm:px-8">
          <p className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-[13px] text-brand-900">
            Your account and all associated records were deleted.
          </p>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        <section className="grid gap-12 pb-16 pt-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-brand-800">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
              Invite-only beta · no bank credentials
            </p>
            <h1 className="mt-6 max-w-[15ch] text-[42px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink-900 sm:text-[58px]">
              Know where it goes.{" "}
              <span className="text-brand-700">Then move it.</span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-[15.5px] leading-relaxed text-ink-600">
              PaisaPilot turns a bank or UPI export into one honest monthly read: what you spent,
              what quietly repeats, and the three moves worth making. Built for Indian salaries,
              cards, SIPs and EMIs.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn-primary px-5 py-2.5">
                Analyse my money
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className="btn-secondary px-4 py-2.5">
                I have an account
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[12px] text-ink-500">
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              Invite-only beta. Password-protected, export or delete your data any time.
            </p>
          </div>

          <PreviewCard />
        </section>

        <section aria-labelledby="how" className="border-t border-ink-200/80 py-14 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                How it works
              </p>
              <h2 id="how" className="mt-2 text-[28px] font-semibold tracking-[-0.02em]">
                Three steps, one sitting.
              </h2>
            </div>
            <p className="max-w-sm text-[13.5px] leading-relaxed text-ink-500">
              Most finance apps ask for everything. PaisaPilot asks for enough to be useful, then
              stays out of the way.
            </p>
          </div>

          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="card-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <step.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="numeric text-[12px] text-ink-400">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="what"
          className="grid gap-8 border-t border-ink-200/80 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:py-20"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              What you get
            </p>
            <h2 id="what" className="mt-2 max-w-[18ch] text-[30px] font-semibold leading-tight tracking-[-0.025em]">
              The analysis, not another dashboard to maintain.
            </h2>
            <p className="mt-4 max-w-[38ch] text-[14px] leading-relaxed text-ink-600">
              Every number is computed from your records. The language explains it; it never
              invents an amount. No trades, no applications, no money moved.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gold-200 bg-gold-50 px-3.5 py-2.5 text-[12.5px] text-gold-800">
              <ScanLine className="h-4 w-4" aria-hidden="true" />
              Works with most Indian bank CSV exports.
            </div>
          </div>
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 border-b border-ink-100 pb-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="text-[13.5px] leading-relaxed text-ink-700">{feature}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl bg-brand-950 px-6 py-12 text-brand-50 sm:px-10 lg:flex lg:items-center lg:justify-between lg:py-14">
          <div className="max-w-lg">
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-brand-50 sm:text-[30px]">
              Your statement already has the answers.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-brand-100/80">
              PaisaPilot is in a small invite-only beta. Use your invite code, answer a few
              questions, and upload your first export. Your report is ready in under a minute.
            </p>
          </div>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[13.5px] font-semibold text-brand-900 transition hover:bg-brand-50 lg:mt-0"
          >
            Use my invite
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className="mx-auto mt-14 flex w-full max-w-[1180px] flex-col gap-3 border-t border-ink-200/80 px-5 py-8 text-[11.5px] text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© 2026 PaisaPilot. Educational analysis, not financial advice.</p>
        <p>Built for India · INR · DPDP-style data controls</p>
      </footer>
    </div>
  );
}

function PreviewCard() {
  return (
    <div className="relative mx-auto w-full max-w-[430px]">
      <div
        aria-hidden="true"
        className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-brand-100 via-white to-gold-100 opacity-70 blur-xl"
      />
      <div className="relative rounded-3xl border border-ink-200/80 bg-white p-5 shadow-lift">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">
              October 2026
            </p>
            <p className="mt-1 text-[15px] font-semibold">Aarav&apos;s month at a glance</p>
          </div>
          <ScoreRing score={76} size={72} label="Sample financial score" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-ink-50 px-3 py-2.5">
            <p className="text-[10.5px] font-medium text-ink-500">Left after spending</p>
            <p className="numeric mt-0.5 text-[19px] font-semibold text-ink-900">₹12,400</p>
          </div>
          <div className="rounded-xl bg-ink-50 px-3 py-2.5">
            <p className="text-[10.5px] font-medium text-ink-500">Savings rate</p>
            <p className="numeric mt-0.5 text-[19px] font-semibold text-ink-900">13%</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50/70 p-3.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-gold-800">
            Top move
          </p>
          <p className="mt-1 text-[13px] font-medium leading-snug text-ink-900">
            7 repeating payments cost ₹1,520 a month
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-600">
            Trimming two could free ₹380/month without touching essentials.
          </p>
        </div>

        <div className="mt-4 space-y-2.5">
          {[
            ["Food & dining", "₹6,420", 72],
            ["Rent", "₹22,000", 58],
            ["Shopping", "₹5,180", 44],
          ].map(([label, value, width]) => (
            <div key={label as string}>
              <div className="flex items-baseline justify-between text-[11.5px]">
                <span className="text-ink-600">{label}</span>
                <span className="numeric text-ink-800">{value}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-3 text-[10.5px] text-ink-500">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          Illustrative preview · computed from sample records
        </div>
      </div>
    </div>
  );
}
