import type { Metadata } from "next";
import Link from "next/link";
import { Filter, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { loadRawData, hasSampleData } from "@/lib/store";
import { deleteTransactionAction } from "@/app/actions/data";
import { CATEGORIES } from "@/lib/domain";
import { monthLabel } from "@/lib/analytics";
import { formatShortDate, inrP } from "@/lib/money";
import { UploadForm } from "@/components/app/upload-form";
import { TransactionForm } from "@/components/app/transaction-form";
import { EmptyRecords } from "@/components/app/empty-records";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Records" };

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string }>;
}) {
  const { month, category } = await searchParams;
  const { user } = await requireOnboardedUser();
  const data = loadRawData(user.id);
  if (!data) return null;

  const months = Array.from(
    new Set(data.transactions.map((tx) => tx.occurred_on.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  const activeMonth = month && months.includes(month) ? month : "";
  const activeCategory =
    category && CATEGORIES.includes(category as (typeof CATEGORIES)[number]) ? category : "";

  const filtered = data.transactions.filter(
    (tx) =>
      (!activeMonth || tx.occurred_on.startsWith(activeMonth)) &&
      (!activeCategory || tx.category === activeCategory)
  );

  const spend = filtered
    .filter((tx) => tx.direction === "debit")
    .reduce((total, tx) => total + tx.amount_paise, 0);
  const income = filtered
    .filter((tx) => tx.direction === "credit")
    .reduce((total, tx) => total + tx.amount_paise, 0);

  const accounts = data.accounts.map((account) => ({
    id: account.id,
    name: account.name,
    kind: account.kind,
  }));
  const sample = hasSampleData(user.id);

  function monthHref(value: string): string {
    const params = new URLSearchParams();
    if (value) params.set("month", value);
    if (activeCategory) params.set("category", activeCategory);
    const query = params.toString();
    return query ? `/activity?${query}` : "/activity";
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink-900 sm:text-[30px]">
            Records
          </h1>
          <p className="mt-1 max-w-2xl text-[13.5px] text-ink-500">
            Upload a statement or add entries by hand. Re-uploading the same file will not create
            duplicates.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-ink-500">
          <Badge tone={data.transactions.length > 0 ? "brand" : "neutral"}>
            {data.transactions.length} transaction{data.transactions.length === 1 ? "" : "s"}
          </Badge>
          {sample ? <Badge tone="gold">Sample included</Badge> : null}
        </div>
      </header>

      <section className="grid gap-3 lg:grid-cols-2" aria-label="Add records">
        <div id="upload" className="card-surface scroll-mt-24 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold">Upload a statement</h2>
              <p className="text-[11.5px] text-ink-500">CSV or PDF from your bank, UPI app or card</p>
            </div>
          </div>
          <UploadForm accounts={accounts} />
        </div>

        <div id="manual" className="card-surface scroll-mt-24 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold">Add one by hand</h2>
              <p className="text-[11.5px] text-ink-500">About ten seconds per entry</p>
            </div>
          </div>
          <TransactionForm accounts={accounts} />
        </div>
      </section>

      {data.transactions.length === 0 ? (
        <EmptyRecords sample={sample} />
      ) : (
        <section className="card-surface overflow-hidden" aria-labelledby="records">
          <div className="border-b border-ink-100 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="records" className="text-[15px] font-semibold">
                  {activeMonth ? monthLabel(activeMonth) : "All records"}
                </h2>
                <p className="mt-0.5 text-[11.5px] text-ink-500">
                  {activeCategory || "All categories"} · {filtered.length} shown
                </p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ink-400">Out</p>
                  <p className="numeric text-[13px] font-semibold text-ink-900">{inrP(spend)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ink-400">In</p>
                  <p className="numeric text-[13px] font-semibold text-success">{inrP(income)}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href={monthHref("")}
                aria-current={!activeMonth ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition",
                  !activeMonth
                    ? "border-brand-700 bg-brand-50 text-brand-900"
                    : "border-ink-200 text-ink-600 hover:border-ink-300"
                )}
              >
                All months
              </Link>
              {months.slice(0, 6).map((key) => (
                <Link
                  key={key}
                  href={monthHref(key)}
                  aria-current={activeMonth === key ? "page" : undefined}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition",
                    activeMonth === key
                      ? "border-brand-700 bg-brand-50 text-brand-900"
                      : "border-ink-200 text-ink-600 hover:border-ink-300"
                  )}
                >
                  {monthLabel(key)}
                </Link>
              ))}

              <form method="get" className="ml-auto flex items-center gap-1.5">
                {activeMonth ? <input type="hidden" name="month" value={activeMonth} /> : null}
                <label htmlFor="filter-category" className="sr-only">
                  Filter by category
                </label>
                <Filter className="h-3.5 w-3.5 text-ink-500" aria-hidden="true" />
                <select
                  id="filter-category"
                  name="category"
                  defaultValue={activeCategory}
                  className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[11.5px] text-ink-700"
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-secondary !px-2.5 !py-1.5 text-[11.5px]">
                  Apply
                </button>
              </form>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-ink-500">
              No transactions match these filters.{" "}
              <Link href="/activity" className="font-semibold text-brand-800 underline">
                Clear filters
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {filtered.slice(0, 300).map((tx) => (
                <li
                  key={tx.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[84px_1fr_110px_auto_32px] sm:px-5"
                >
                  <span className="order-2 hidden text-[11.5px] text-ink-500 sm:order-none sm:block">
                    {formatShortDate(tx.occurred_on)}
                  </span>
                  <div className="order-1 min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink-900">
                      {tx.description}
                    </p>
                    <p className="text-[11px] text-ink-500">
                      <span className="sm:hidden">{formatShortDate(tx.occurred_on)} · </span>
                      {tx.category}
                      {tx.source === "sample" ? " · sample" : tx.source === "csv" ? " · csv" : tx.source === "pdf" ? " · pdf" : ""}
                    </p>
                  </div>
                  <span className="order-3 hidden sm:order-none sm:block">
                    <span className="chip bg-ink-50 text-ink-600">{tx.category}</span>
                  </span>
                  <span
                    className={cn(
                      "order-4 numeric justify-self-end text-[13px] font-semibold",
                      tx.direction === "credit" ? "text-success" : "text-ink-900"
                    )}
                  >
                    {tx.direction === "credit" ? "+" : "−"}
                    {inrP(tx.amount_paise)}
                  </span>
                  <form action={deleteTransactionAction} className="order-5 justify-self-end">
                    <input type="hidden" name="id" value={tx.id} />
                    <button
                      type="submit"
                      aria-label={`Delete ${tx.description}`}
                      className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {filtered.length > 300 ? (
            <p className="border-t border-ink-100 px-5 py-3 text-[11.5px] text-ink-500">
              Showing the latest 300 of {filtered.length} matching records. Narrow by month or
              category to see more.
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
