import Link from "next/link";
import { FileUp, Plus, Sparkles } from "lucide-react";
import { seedSampleAction } from "@/app/actions/data";

export function EmptyRecords({ sample = false }: { sample?: boolean }) {
  return (
    <section className="card-surface overflow-hidden">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-brand-800">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Step one
          </p>
          <h2 className="mt-3 text-[22px] font-semibold tracking-[-0.02em]">
            Add your records to see the month
          </h2>
          <p className="mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-600">
            Upload a bank, UPI or card statement as CSV or PDF and PaisaPilot groups every
            transaction, finds repeating payments and scores your month. Prefer typing? Add a
            handful by hand.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link href="/activity#upload" className="btn-primary">
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Upload a statement
            </Link>
            <Link href="/activity#manual" className="btn-secondary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add manually
            </Link>
          </div>
          {!sample ? (
            <form action={seedSampleAction} className="mt-3">
              <button type="submit" className="text-[12px] font-medium text-ink-500 underline hover:text-ink-800">
                Or load six months of sample data to explore
              </button>
            </form>
          ) : null}
        </div>

        <div className="rounded-xl border border-ink-200 bg-ink-50/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            What we read
          </p>
          <dl className="mt-3 space-y-2.5 text-[12px]">
            {[
              ["Date", "dd/mm/yyyy, 01 Oct 2026, ISO"],
              ["Description", "narration, particulars, remarks"],
              ["Money", "amount, or debit + credit columns"],
              ["Duplicates", "skipped automatically"],
            ].map(([term, detail]) => (
              <div key={term} className="flex items-baseline justify-between gap-3 border-b border-ink-200/70 pb-2 last:border-0 last:pb-0">
                <dt className="font-medium text-ink-700">{term}</dt>
                <dd className="text-right text-ink-500">{detail}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
            No bank login, no account numbers, no OTP. Just the export you already own.
          </p>
        </div>
      </div>
    </section>
  );
}
