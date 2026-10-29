"use client";

import { useActionState, useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { importCsvAction } from "@/app/actions/data";
import { EMPTY_STATE } from "@/lib/form-state";
import { cn } from "@/lib/utils";

export function UploadForm({
  accounts = [],
  compact = false,
}: {
  accounts?: { id: string; name: string; kind: string }[];
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(importCsvAction, EMPTY_STATE);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <form action={action} className="space-y-3">
      <div
        className={cn(
          "rounded-xl border border-dashed bg-ink-50/60 px-4 py-6 text-center transition",
          dragging ? "border-brand-500 bg-brand-50" : "border-ink-300"
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={() => setDragging(false)}
      >
        <UploadCloud className="mx-auto h-6 w-6 text-brand-700" aria-hidden="true" />
        <p className="mt-2 text-[13px] font-medium text-ink-800">
          {fileName ?? "Drop a CSV, or choose a file"}
        </p>
        <p className="mt-0.5 text-[11.5px] text-ink-500">Bank, UPI, card or wallet export · up to 2 MB</p>
        <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-700 hover:border-ink-300">
          Choose CSV
          <input
            type="file"
            name="file"
            accept=".csv,.txt,text/csv,text/plain"
            required
            className="sr-only"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
          />
        </label>
      </div>

      {accounts.length > 0 ? (
        <div>
          <label htmlFor="csv-account" className="field-label">
            Attach to account <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <select id="csv-account" name="accountId" className="field-input" defaultValue="">
            <option value="">No specific account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.kind}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
        {pending ? "Reading your file…" : "Import transactions"}
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

      {!compact ? (
        <details className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-[12px] text-ink-600">
          <summary className="cursor-pointer font-medium text-ink-700">
            What should the CSV look like?
          </summary>
          <div className="mt-2 space-y-2 leading-relaxed">
            <p>
              Any file with a <strong>date</strong> and <strong>description</strong> column, plus
              either <strong>amount</strong> or separate <strong>debit / credit</strong> columns.
              Common names like narration, particulars and withdrawal are recognised.
            </p>
            <pre className="overflow-x-auto rounded-md bg-ink-50 p-2.5 text-[10.5px] leading-relaxed text-ink-700">
{`Date,Description,Debit,Credit
01/10/2026,SALARY ACME PVT LTD,,95000
02/10/2026,SWIGGY ORDER 8821,486,`}
            </pre>
            <p className="text-ink-500">
              Dates can be dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd or 01 Oct 2026. Rows you have
              already imported are skipped automatically.
            </p>
            <a
              href="/sample-transactions.csv"
              download
              className="inline-flex font-semibold text-brand-800 underline"
            >
              Download a sample CSV
            </a>
          </div>
        </details>
      ) : null}
    </form>
  );
}
