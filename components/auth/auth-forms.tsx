"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction, signupAction } from "@/app/actions/auth";
import { EMPTY_STATE } from "@/lib/form-state";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, EMPTY_STATE);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Your password"
            className="field-input pr-11"
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-[13px] text-ink-500">
        New to PaisaPilot?{" "}
        <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ inviteOnly = true }: { inviteOnly?: boolean }) {
  const [state, action, pending] = useActionState(signupAction, EMPTY_STATE);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      {inviteOnly ? (
        <div>
          <label htmlFor="invite" className="field-label">
            Invite code
          </label>
          <input
            id="invite"
            name="invite"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="PP-XXXX-XXXX-XXXX"
            aria-describedby="invite-help"
            className="field-input font-mono uppercase tracking-wide"
          />
          <p id="invite-help" className="mt-1.5 text-[12px] text-ink-500">
            PaisaPilot is in a small invite-only beta. Use the code from your invite email.
          </p>
        </div>
      ) : null}

      <div>
        <label htmlFor="name" className="field-label">
          Your name
        </label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          required
          placeholder="Aarav Mehta"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="At least 8 characters"
            className="field-input pr-11"
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirm" className="field-label">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Repeat your password"
          className="field-input"
        />
      </div>

      <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-600">
        <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-700" />
        <span>
          I understand PaisaPilot gives educational analysis, not financial advice, and that my
          data is stored in this app until I delete it.
        </span>
      </label>

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-[13px] text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
