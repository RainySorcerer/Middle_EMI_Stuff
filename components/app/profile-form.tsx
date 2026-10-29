"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { updateProfileAction } from "@/app/actions/profile";
import { EMPLOYMENT, GOALS, RISK } from "@/lib/domain";
import { EMPTY_STATE } from "@/lib/form-state";

export function ProfileForm({
  initial,
}: {
  initial: {
    name: string;
    city: string;
    employment: string;
    income: number;
    spend: number;
    emergency: number;
    goal: string;
    goalAmount: number;
    goalMonths: number;
    risk: string;
  };
}) {
  const [state, action, pending] = useActionState(updateProfileAction, EMPTY_STATE);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="set-name" className="field-label">
            Name
          </label>
          <input id="set-name" name="name" defaultValue={initial.name} required className="field-input" />
        </div>
        <div>
          <label htmlFor="set-city" className="field-label">
            City
          </label>
          <input id="set-city" name="city" defaultValue={initial.city} className="field-input" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="set-employment" className="field-label">
            How you earn
          </label>
          <select id="set-employment" name="employment" defaultValue={initial.employment} className="field-input">
            <option value="">Not set</option>
            {EMPLOYMENT.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="set-income" className="field-label">
            Monthly take-home (₹)
          </label>
          <input
            id="set-income"
            name="income"
            inputMode="numeric"
            defaultValue={initial.income || ""}
            required
            className="field-input numeric"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="set-spend" className="field-label">
            Typical monthly spend (₹)
          </label>
          <input
            id="set-spend"
            name="spend"
            inputMode="numeric"
            defaultValue={initial.spend || ""}
            className="field-input numeric"
            placeholder="Estimated from records"
          />
        </div>
        <div>
          <label htmlFor="set-emergency" className="field-label">
            Emergency savings (₹)
          </label>
          <input
            id="set-emergency"
            name="emergency"
            inputMode="numeric"
            defaultValue={initial.emergency || ""}
            className="field-input numeric"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="set-goal" className="field-label">
            Primary goal
          </label>
          <select id="set-goal" name="goal" defaultValue={initial.goal} className="field-input">
            <option value="">Not set</option>
            {GOALS.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="set-risk" className="field-label">
            Risk comfort
          </label>
          <select id="set-risk" name="risk" defaultValue={initial.risk} className="field-input">
            <option value="">Not set</option>
            {RISK.map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="set-goal-amount" className="field-label">
            Goal target (₹)
          </label>
          <input
            id="set-goal-amount"
            name="goalAmount"
            inputMode="numeric"
            defaultValue={initial.goalAmount || ""}
            className="field-input numeric"
          />
        </div>
        <div>
          <label htmlFor="set-goal-months" className="field-label">
            Months
          </label>
          <input
            id="set-goal-months"
            name="goalMonths"
            type="number"
            min={0}
            max={600}
            defaultValue={initial.goalMonths || ""}
            className="field-input numeric"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {pending ? "Saving…" : "Save changes"}
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
  );
}
