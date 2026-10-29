import type { Metadata } from "next";
import Link from "next/link";
import { Download, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { deleteAccountAction, logoutAction } from "@/app/actions/auth";
import { clearTransactionsAction } from "@/app/actions/data";
import { hasSampleData, listAccounts } from "@/lib/store";
import { formatLongDate } from "@/lib/money";
import { ProfileForm } from "@/components/app/profile-form";
import { AccountManager } from "@/components/app/account-manager";
import { ConfirmSubmit } from "@/components/app/confirm-submit";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, profile } = await requireOnboardedUser();
  const accounts = listAccounts(user.id);
  const sample = hasSampleData(user.id);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink-900 sm:text-[30px]">
          Settings
        </h1>
        <p className="mt-1 max-w-2xl text-[13.5px] text-ink-500">
          Keep your plan current, manage cards and loans, and control your data.
        </p>
      </header>

      <section className="card-surface p-5" aria-labelledby="profile">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="profile" className="text-[15px] font-semibold">
              Your plan
            </h2>
            <p className="mt-0.5 text-[12px] text-ink-500">
              These answers drive the affordability and goal maths.
            </p>
          </div>
          <Link href="/onboarding?edit=1" className="btn-secondary text-[12.5px]">
            Guided edit
          </Link>
        </div>
        <div className="mt-5">
          <ProfileForm
            initial={{
              name: user.name,
              city: profile.city ?? "",
              employment: profile.employment ?? "",
              income: Math.round(profile.monthly_income_paise / 100),
              spend: Math.round(profile.monthly_spend_paise / 100),
              emergency: Math.round(profile.emergency_fund_paise / 100),
              goal: profile.primary_goal ?? "",
              goalAmount: Math.round(profile.goal_amount_paise / 100),
              goalMonths: profile.goal_months,
              risk: profile.risk_comfort ?? "",
            }}
          />
        </div>
      </section>

      <section id="accounts" className="card-surface scroll-mt-24 p-5" aria-labelledby="accounts-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="accounts-heading" className="text-[15px] font-semibold">
              Cards &amp; loans
            </h2>
            <p className="mt-0.5 text-[12px] text-ink-500">
              Used for credit utilisation and total EMI burden. Balances are manually updated.
            </p>
          </div>
          <Badge tone={accounts.length > 0 ? "brand" : "neutral"}>
            {accounts.length} tracked
          </Badge>
        </div>
        <div className="mt-4">
          <AccountManager
            accounts={accounts.map((account) => ({
              id: account.id,
              kind: account.kind,
              name: account.name,
              institution: account.institution,
              last4: account.last4,
              creditLimitPaise: account.credit_limit_paise,
              outstandingPaise: account.outstanding_paise,
              interestRate: account.interest_rate,
              emiPaise: account.emi_paise,
            }))}
          />
        </div>
      </section>

      <section className="card-surface p-5" aria-labelledby="data">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="data" className="text-[15px] font-semibold">
              Data &amp; privacy
            </h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
              Your records live in this app&apos;s database, attached to your login. We never ask
              for bank credentials, and nothing is shared with third parties.
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 rounded-xl bg-ink-50 px-4 py-3 text-[12px] sm:grid-cols-3">
          <div>
            <dt className="text-[10.5px] uppercase tracking-wide text-ink-400">Account</dt>
            <dd className="mt-0.5 truncate font-medium text-ink-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-wide text-ink-400">Member since</dt>
            <dd className="mt-0.5 font-medium text-ink-800">
              {formatLongDate(user.created_at.slice(0, 10))}
            </dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-wide text-ink-400">Sample data</dt>
            <dd className="mt-0.5 font-medium text-ink-800">
              {sample ? "Present — remove from the dashboard" : "None"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a href="/api/export" download className="btn-secondary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Export my data (JSON)
          </a>
          <form action={clearTransactionsAction}>
            <ConfirmSubmit
              message="Delete every transaction? Cards and loans stay, but all records will be removed. This cannot be undone."
              className="btn-ghost text-danger hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete all transactions
            </ConfirmSubmit>
          </form>
        </div>

        <div className="mt-5 rounded-xl border border-red-200 bg-red-50/50 p-4">
          <p className="text-[12.5px] font-semibold text-danger">Delete account</p>
          <p className="mt-1 max-w-[60ch] text-[11.5px] leading-relaxed text-ink-600">
            This permanently removes your login, profile, accounts, transactions and reports.
            Type <strong>DELETE</strong> to confirm.
          </p>
          <form action={deleteAccountAction} className="mt-2.5 flex flex-wrap items-center gap-2">
            <label htmlFor="delete-confirm" className="sr-only">
              Type DELETE to confirm
            </label>
            <input
              id="delete-confirm"
              name="confirm"
              placeholder="Type DELETE"
              autoComplete="off"
              className="w-40 rounded-lg border border-red-200 bg-white px-3 py-2 text-[12.5px] focus-ring"
            />
            <ConfirmSubmit
              message="Permanently delete your account and all data? This cannot be undone."
              className="btn bg-danger text-white hover:bg-red-800"
            >
              Delete everything
            </ConfirmSubmit>
          </form>
        </div>
      </section>

      <section className="card-surface flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-[14px] font-semibold">Sign out</h2>
          <p className="text-[12px] text-ink-500">Your data stays saved for when you return.</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-secondary">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </form>
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-ink-500">
        PaisaPilot provides educational analysis, not financial advice. Numbers are derived from
        the records you add; keep them reasonably current for a useful read.
      </p>
    </div>
  );
}
