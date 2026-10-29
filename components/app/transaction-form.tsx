"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { addTransactionAction } from "@/app/actions/data";
import { CATEGORIES } from "@/lib/domain";
import { EMPTY_STATE, todayIso } from "@/lib/form-state";

export function TransactionForm({
  accounts = [],
}: {
  accounts?: { id: string; name: string; kind: string }[];
}) {
  const [state, action, pending] = useActionState(addTransactionAction, EMPTY_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="tx-date" className="field-label">
            Date
          </label>
          <input
            id="tx-date"
            name="date"
            type="date"
            required
            defaultValue={todayIso()}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="tx-direction" className="field-label">
            Money
          </label>
          <select id="tx-direction" name="direction" className="field-input" defaultValue="debit">
            <option value="debit">Money out</option>
            <option value="credit">Money in</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="tx-description" className="field-label">
          Description
        </label>
        <input
          id="tx-description"
          name="description"
          required
          maxLength={180}
          placeholder="e.g. Swiggy order"
          className="field-input"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="tx-amount" className="field-label">
            Amount (₹)
          </label>
          <input
            id="tx-amount"
            name="amount"
            inputMode="decimal"
            required
            placeholder="1,250"
            className="field-input numeric"
          />
        </div>
        <div>
          <label htmlFor="tx-category" className="field-label">
            Category
          </label>
          <select id="tx-category" name="category" className="field-input" defaultValue="">
            <option value="">Auto-detect</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {accounts.length > 0 ? (
        <div>
          <label htmlFor="tx-account" className="field-label">
            Account <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <select id="tx-account" name="accountId" className="field-input" defaultValue="">
            <option value="">No specific account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.kind}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <button type="submit" className="btn-secondary w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="h-4 w-4" aria-hidden="true" />
        )}
        {pending ? "Adding…" : "Add transaction"}
      </button>

      <div aria-live="polite">
        {state.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-danger">
            {state.error}
          </p>
        ) : null}
        {state.ok && state.message ? (
          <p className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[12.5px] text-brand-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
