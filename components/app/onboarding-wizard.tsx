"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { UploadForm } from "@/components/app/upload-form";
import { TransactionForm } from "@/components/app/transaction-form";
import { finishOnboarding, saveProfileStep } from "@/app/actions/profile";
import { seedSampleAction } from "@/app/actions/data";
import { EMPLOYMENT, GOALS, RISK } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface Draft {
  name: string;
  city: string;
  employment: string;
  dependents: number;
  income: number;
  spend: number;
  emergency: number;
  goal: string;
  goalAmount: number;
  goalMonths: number;
  risk: string;
}

const CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Chennai",
  "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Other",
];

const STEPS = [
  { title: "About you", hint: "20 seconds" },
  { title: "Your money", hint: "Income & savings" },
  { title: "Your goal", hint: "One priority" },
  { title: "Your records", hint: "Optional now" },
];

export function OnboardingWizard({
  user,
  initial,
  accounts,
  txCount,
  sample,
  editing,
}: {
  user: { name: string; email: string };
  initial: Draft;
  accounts: { id: string; name: string; kind: string }[];
  txCount: number;
  sample: boolean;
  editing: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [finishing, setFinishing] = useState(false);
  const [sampleAdded, setSampleAdded] = useState(sample);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function validate(current: number): string | null {
    if (current === 0) {
      if (draft.name.trim().length < 2) return "Enter your name.";
      if (!draft.city) return "Choose your city.";
      if (!draft.employment) return "Choose how you earn.";
      return null;
    }
    if (current === 1) {
      if (!draft.income || draft.income <= 0) return "Enter your monthly take-home income.";
      return null;
    }
    if (current === 2) {
      if (!draft.goal) return "Pick the goal that matters most right now.";
      if (!draft.risk) return "Choose how you feel about risk.";
      return null;
    }
    return null;
  }

  async function saveCurrent(): Promise<boolean> {
    const stepNumber = (step + 1) as 1 | 2 | 3;
    const result = await saveProfileStep({
      step: stepNumber,
      name: draft.name,
      city: draft.city,
      employment: draft.employment,
      dependents: draft.dependents,
      monthlyIncomeRupees: draft.income,
      monthlySpendRupees: draft.spend,
      emergencyFundRupees: draft.emergency,
      primaryGoal: draft.goal,
      goalAmountRupees: draft.goalAmount,
      goalMonths: draft.goalMonths,
      riskComfort: draft.risk,
    });
    if (!result.ok) {
      setError(result.error ?? "Could not save. Try again.");
      return false;
    }
    return true;
  }

  function next() {
    const problem = validate(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    startTransition(async () => {
      if (step < 3) {
        const saved = await saveCurrent();
        if (saved) setStep((current) => current + 1);
      }
    });
  }

  function back() {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  }

  async function finish() {
    setError(null);
    setFinishing(true);
    const saved = await saveCurrent();
    if (!saved) {
      setFinishing(false);
      return;
    }
    const result = await finishOnboarding();
    if (!result.ok) {
      setError(result.error ?? "Could not finish setup.");
      setFinishing(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  function trySample() {
    setSampleAdded(true);
    startTransition(async () => {
      await seedSampleAction();
    });
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 w-full max-w-[1060px] items-center justify-between px-5 sm:px-8">
        <Logo href={editing ? "/dashboard" : "/"} />
        <p className="text-[11.5px] text-ink-500">
          {editing ? "Editing your plan" : `Signed in as ${user.email}`}
        </p>
      </header>

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
          <aside className="lg:pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              {editing ? "Your plan" : "Setup"}
            </p>
            <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.02em]">
              {editing ? "Keep your plan current" : "Let’s get your first read"}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
              Four short steps. You can skip the records step and add them later.
            </p>

            <ol className="mt-6 hidden space-y-1 lg:block">
              {STEPS.map((item, index) => {
                const complete = index < step;
                const active = index === step;
                return (
                  <li
                    key={item.title}
                    className={cn(
                      "flex items-start gap-3 rounded-xl px-3 py-2.5",
                      active ? "bg-white shadow-card" : ""
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                        complete
                          ? "border-brand-700 bg-brand-700 text-white"
                          : active
                            ? "border-brand-700 text-brand-800"
                            : "border-ink-200 text-ink-400"
                      )}
                    >
                      {complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                    </span>
                    <span>
                      <span
                        className={cn(
                          "block text-[13px] font-medium",
                          active ? "text-ink-900" : "text-ink-600"
                        )}
                      >
                        {item.title}
                      </span>
                      <span className="text-[11px] text-ink-400">{item.hint}</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 rounded-xl border border-ink-200 bg-white/70 p-3.5">
              <p className="flex items-center gap-2 text-[12px] font-medium text-ink-700">
                <Sparkles className="h-3.5 w-3.5 text-gold-600" aria-hidden="true" />
                Why we ask
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
                Income and goals let us judge affordability. Your city and dependants only change
                the context, never the maths.
              </p>
            </div>
          </aside>

          <section className="card-surface p-5 sm:p-7">
            <div className="mb-6 lg:hidden">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {STEPS.map((item, index) => (
                  <span
                    key={item.title}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      index <= step ? "bg-brand-600" : "bg-ink-200"
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11.5px] font-medium text-ink-500">
                Step {step + 1} of 4 · {STEPS[step].title}
              </p>
            </div>

            {error ? (
              <p
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-danger"
              >
                {error}
              </p>
            ) : null}

            {step === 0 ? (
              <div className="animate-fade-up">
                <StepHeading title="A little about you" body="This is only used to personalise your report." />
                <div className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="ob-name" className="field-label">
                      Name
                    </label>
                    <input
                      id="ob-name"
                      value={draft.name}
                      onChange={(event) => set("name", event.target.value)}
                      autoComplete="name"
                      className="field-input"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ob-city" className="field-label">
                        City
                      </label>
                      <select
                        id="ob-city"
                        value={draft.city}
                        onChange={(event) => set("city", event.target.value)}
                        className="field-input"
                      >
                        <option value="">Select city</option>
                        {CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="ob-employment" className="field-label">
                        How do you earn?
                      </label>
                      <select
                        id="ob-employment"
                        value={draft.employment}
                        onChange={(event) => set("employment", event.target.value)}
                        className="field-input"
                      >
                        <option value="">Select</option>
                        {EMPLOYMENT.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ob-dependents" className="field-label">
                      People who depend on your income
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2, 3, 4, 5].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => set("dependents", count)}
                          aria-pressed={draft.dependents === count}
                          className={cn(
                            "min-w-[46px] rounded-lg border px-3 py-2 text-[13px] font-medium transition",
                            draft.dependents === count
                              ? "border-brand-700 bg-brand-50 text-brand-900"
                              : "border-ink-200 text-ink-600 hover:border-ink-300"
                          )}
                        >
                          {count === 5 ? "5+" : count}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-ink-500">
                      Include children, parents or anyone you support.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="animate-fade-up">
                <StepHeading
                  title="What comes in, what stays"
                  body="Use your take-home amount — after tax and PF. Rough numbers are fine; you can edit later."
                />
                <div className="mt-5 space-y-4">
                  <MoneyField
                    id="ob-income"
                    label="Monthly take-home income"
                    value={draft.income}
                    onChange={(value) => set("income", value)}
                    hint="Salary, business or freelance income after deductions."
                    required
                  />
                  <MoneyField
                    id="ob-spend"
                    label="Typical monthly spending"
                    value={draft.spend}
                    onChange={(value) => set("spend", value)}
                    hint="Rent, bills, EMI, food and everything else. Leave blank to estimate from your records."
                  />
                  <MoneyField
                    id="ob-emergency"
                    label="Emergency savings set aside"
                    value={draft.emergency}
                    onChange={(value) => set("emergency", value)}
                    hint="Cash in a savings or liquid account you could reach this week."
                  />
                </div>
                <div className="mt-4 rounded-xl bg-ink-50 px-3.5 py-3 text-[12px] leading-relaxed text-ink-600">
                  We never ask for account numbers, net banking or OTPs. If you upload a statement,
                  it stays attached to your account and can be deleted in Settings.
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="animate-fade-up">
                <StepHeading
                  title="What are you working towards?"
                  body="Pick one priority. The report will judge your goal against your actual surplus."
                />
                <div className="mt-5 space-y-2">
                  {GOALS.map((goal) => (
                    <label
                      key={goal.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition",
                        draft.goal === goal.id
                          ? "border-brand-600 bg-brand-50/70"
                          : "border-ink-200 hover:border-ink-300"
                      )}
                    >
                      <span className="text-[13.5px] font-medium text-ink-800">{goal.label}</span>
                      <input
                        type="radio"
                        name="goal"
                        value={goal.id}
                        checked={draft.goal === goal.id}
                        onChange={() => set("goal", goal.id)}
                        className="h-4 w-4 accent-brand-700"
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <MoneyField
                    id="ob-goal-amount"
                    label="Target amount"
                    value={draft.goalAmount}
                    onChange={(value) => set("goalAmount", value)}
                    hint="Optional. Skip for a tracking-only goal."
                  />
                  <div>
                    <label htmlFor="ob-goal-months" className="field-label">
                      Months to get there
                    </label>
                    <input
                      id="ob-goal-months"
                      type="number"
                      min={1}
                      max={600}
                      value={draft.goalMonths || ""}
                      onChange={(event) => set("goalMonths", Number(event.target.value) || 0)}
                      placeholder="e.g. 24"
                      className="field-input numeric"
                    />
                  </div>
                </div>

                <fieldset className="mt-5">
                  <legend className="field-label">How do you feel about risk?</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {RISK.map((risk) => (
                      <label
                        key={risk}
                        className={cn(
                          "cursor-pointer rounded-xl border px-2 py-2.5 text-center text-[12.5px] font-medium transition",
                          draft.risk === risk
                            ? "border-brand-600 bg-brand-50 text-brand-900"
                            : "border-ink-200 text-ink-600 hover:border-ink-300"
                        )}
                      >
                        <input
                          type="radio"
                          name="risk"
                          value={risk}
                          checked={draft.risk === risk}
                          onChange={() => set("risk", risk)}
                          className="sr-only"
                        />
                        {risk}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-ink-500">
                    Used only for tone and pacing. We never recommend specific products.
                  </p>
                </fieldset>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="animate-fade-up">
                <StepHeading
                  title="Add your records"
                  body="A CSV or PDF gives the best analysis. Manual entries work too — you can always add more later."
                />

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-ink-200 p-4">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
                      <UploadCloud className="h-4 w-4 text-brand-700" aria-hidden="true" />
                      Upload a statement
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-500">
                      Bank, UPI, card or wallet CSV or PDF.
                    </p>
                    <div className="mt-3">
                      <UploadForm accounts={accounts} compact />
                    </div>
                  </div>

                  <div className="rounded-xl border border-ink-200 p-4">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
                      <CheckCircle2 className="h-4 w-4 text-brand-700" aria-hidden="true" />
                      Or add one manually
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-500">
                      Good for a quick start with salary and rent.
                    </p>
                    <div className="mt-3">
                      <TransactionForm accounts={accounts} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl bg-ink-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[12.5px] font-medium text-ink-800">
                      {txCount > 0
                        ? `${txCount} transaction${txCount === 1 ? "" : "s"} saved`
                        : "No records yet — that is okay"}
                    </p>
                    <p className="text-[11.5px] text-ink-500">
                      Want to look around first? Load a six-month sample you can delete any time.
                    </p>
                  </div>
                  {sampleAdded ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-800">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Sample loaded
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={trySample}
                      disabled={pending}
                      className="btn-secondary shrink-0 text-[12.5px]"
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : null}
                      Use sample data
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {step > 0 ? (
                  <button type="button" onClick={back} className="btn-ghost" disabled={pending || finishing}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                  </button>
                ) : (
                  <span className="hidden text-[11.5px] text-ink-500 sm:block">
                    Takes about two minutes.
                  </span>
                )}
              </div>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={pending}
                  className="btn-primary px-5"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {pending ? "Saving…" : "Continue"}
                  {!pending ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
                </button>
              ) : (
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  {editing ? (
                    <Link href="/dashboard" className="btn-ghost justify-center text-[12.5px]">
                      Cancel
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={finish}
                    disabled={finishing}
                    className="btn-primary px-5"
                  >
                    {finishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    )}
                    {finishing ? "Building your report…" : editing ? "Save plan" : "Finish setup"}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StepHeading({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h2>
      <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-ink-500">{body}</p>
    </div>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  hint,
  required,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-ink-500">
          ₹
        </span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={value ? new Intl.NumberFormat("en-IN").format(value) : ""}
          onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, "")) || 0)}
          placeholder="0"
          className="field-input numeric !pl-8"
        />
      </div>
      {hint ? <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">{hint}</p> : null}
    </div>
  );
}
