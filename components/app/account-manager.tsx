"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, CreditCard, Landmark, Loader2, Plus, Trash2 } from "lucide-react";
import { addAccountAction, removeAccountAction } from "@/app/actions/data";
import { ACCOUNT_KINDS, type AccountKind } from "@/lib/domain";
import { EMPTY_STATE } from "@/lib/form-state";
import { inrP } from "@/lib/money";

export interface AccountSummary {
  id: string;
  kind: string;
  name: string;
  institution: string | null;
  last4: string | null;
  creditLimitPaise: number;
  outstandingPaise: number;
  interestRate: number;
  emiPaise: number;
}

export function AccountManager({ accounts }: { accounts: AccountSummary[] }) {
  const [state, action, pending] = useActionState(addAccountAction, EMPTY_STATE);
  const [kind, setKind] = useState<AccountKind>("Credit card");

  return (
    <div className="space-y-4">
      {accounts.length === 0 ? (
        <p className="rounded-xl bg-ink-50 px-3.5 py-3 text-[12.5px] text-ink-500">
          No accounts tracked yet. Adding a card or loan makes the score more accurate.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200">
          {accounts.map((account) => {
            const utilization =
              account.kind === "Credit card" && account.creditLimitPaise > 0
                ? (account.outstandingPaise / account.creditLimitPaise) * 100
                : null;
            return (
              <li key={account.id} className="flex items-start gap-3 px-3.5 py-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  {account.kind === "Credit card" ? (
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Landmark className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink-900">
                    {account.name}
                    {account.last4 ? <span className="text-ink-400"> ····{account.last4}</span> : null}
                  </p>
                  <p className="text-[11.5px] text-ink-500">
                    {account.institution ? `${account.institution} · ` : ""}
                    {account.kind}
                    {account.kind === "Credit card"
                      ? ` · ${inrP(account.outstandingPaise)} of ${inrP(account.creditLimitPaise)} used`
                      : account.kind === "Loan"
                        ? ` · ${inrP(account.emiPaise)}/mo · ${account.interestRate}%`
                        : ""}
                  </p>
                  {utilization !== null ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className={`h-full rounded-full ${
                            utilization > 50 ? "bg-red-500" : utilization > 30 ? "bg-gold-500" : "bg-brand-600"
                          }`}
                          style={{ width: `${Math.min(100, utilization)}%` }}
                        />
                      </div>
                      <span className="numeric text-[10.5px] text-ink-500">
                        {utilization.toFixed(0)}%
                      </span>
                    </div>
                  ) : null}
                </div>
                <form action={removeAccountAction}>
                  <input type="hidden" name="id" value={account.id} />
                  <button
                    type="submit"
                    aria-label={`Remove ${account.name}`}
                    className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <form action={action} className="rounded-xl border border-ink-200 bg-ink-50/40 p-4">
        <p className="text-[13px] font-semibold text-ink-900">Add an account</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="acc-kind" className="field-label">
              Type
            </label>
            <select
              id="acc-kind"
              name="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as AccountKind)}
              className="field-input"
            >
              {ACCOUNT_KINDS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="acc-name" className="field-label">
              Name
            </label>
            <input id="acc-name" name="name" required className="field-input" placeholder="Millennia card" />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="acc-institution" className="field-label">
              Bank <span className="font-normal text-ink-400">(optional)</span>
            </label>
            <input id="acc-institution" name="institution" className="field-input" placeholder="HDFC Bank" />
          </div>
          <div>
            <label htmlFor="acc-last4" className="field-label">
              Last 4 digits <span className="font-normal text-ink-400">(optional)</span>
            </label>
            <input
              id="acc-last4"
              name="last4"
              inputMode="numeric"
              maxLength={4}
              className="field-input numeric"
              placeholder="4412"
            />
          </div>
        </div>

        {kind === "Credit card" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="acc-limit" className="field-label">
                Credit limit (₹)
              </label>
              <input id="acc-limit" name="creditLimit" inputMode="numeric" className="field-input numeric" placeholder="200000" />
            </div>
            <div>
              <label htmlFor="acc-outstanding" className="field-label">
                Current outstanding (₹)
              </label>
              <input id="acc-outstanding" name="outstanding" inputMode="numeric" className="field-input numeric" placeholder="38000" />
            </div>
          </div>
        ) : null}

        {kind === "Loan" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="acc-outstanding" className="field-label">
                Outstanding (₹)
              </label>
              <input id="acc-outstanding" name="outstanding" inputMode="numeric" className="field-input numeric" placeholder="242000" />
            </div>
            <div>
              <label htmlFor="acc-emi" className="field-label">
                EMI (₹/mo)
              </label>
              <input id="acc-emi" name="emi" inputMode="numeric" className="field-input numeric" placeholder="9800" />
            </div>
            <div>
              <label htmlFor="acc-rate" className="field-label">
                Interest rate (%)
              </label>
              <input id="acc-rate" name="rate" inputMode="decimal" className="field-input numeric" placeholder="9.2" />
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-secondary" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            {pending ? "Adding…" : "Add account"}
          </button>
          {state.error ? <span className="text-[12.5px] text-danger">{state.error}</span> : null}
          {state.ok && state.message ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-brand-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {state.message}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
