import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-950 px-12 py-10 text-brand-50 lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-24 h-96 w-96 rounded-full bg-brand-700/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-gold-600/20 blur-3xl"
        />
        <Link href="/" className="relative inline-flex items-center gap-2.5" aria-label="PaisaPilot home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-900">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path
                d="M6.5 4.75h11M6.5 9.25h11M14.25 4.75c0 4.5-2.9 4.5-7.75 4.5M10.5 9.25V19.25"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[17px] font-semibold tracking-tight">PaisaPilot</span>
        </Link>

        <div className="relative mt-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
            Your money, in focus
          </p>
          <p className="mt-4 text-[30px] font-semibold leading-[1.2] tracking-[-0.02em]">
            One calm read on your month — then the few moves that actually matter.
          </p>
          <ul className="mt-8 space-y-3 text-[13.5px] text-brand-100/90">
            {[
              "Upload a bank or UPI CSV; no credentials, ever.",
              "See where money leaks and what repeats.",
              "Get a scored report with rupee-sized next steps.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-10 text-[11.5px] text-brand-200/70">
          Invite-only beta · Educational analysis · Not investment advice
        </p>
      </section>

      <section className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          {children}
        </div>
        <p className="text-center text-[11.5px] text-ink-500">
          By continuing you agree to keep your login secure.
        </p>
      </section>
    </div>
  );
}
