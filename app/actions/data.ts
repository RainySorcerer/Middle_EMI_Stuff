"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { ACCOUNT_KINDS, CATEGORIES, type Account } from "@/lib/domain";
import { parseCsv } from "@/lib/csv";
import {
  addAccount,
  addTransaction,
  clearTransactions,
  deleteAccount,
  deleteTransaction,
  hasSampleData,
  importRows,
  listAccounts,
  removeSampleData,
  seedSampleData,
} from "@/lib/store";
import { isIsoDate, rupees, text, type ActionState } from "@/lib/validate";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  revalidatePath("/insights");
  revalidatePath("/settings");
}

export async function importCsvAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Choose a CSV file to upload." };
  if (file.size > 2 * 1024 * 1024)
    return { ok: false, error: "File is larger than 2 MB." };

  let content: string;
  try {
    content = await file.text();
  } catch {
    return { ok: false, error: "Could not read that file. Try exporting it as CSV." };
  }

  const accountIdRaw = text(formData, "accountId", 60);
  const account = accountIdRaw
    ? listAccounts(user.id).find((item) => item.id === accountIdRaw)
    : undefined;

  const parsed = parseCsv(content);
  if (parsed.error) return { ok: false, error: parsed.error };

  const inserted = importRows(user.id, parsed.rows, account?.id ?? null);
  revalidateAll();

  const skipped = parsed.skipped + parsed.duplicatesInFile;
  if (inserted === 0)
    return {
      ok: false,
      error: `No new transactions — all ${parsed.rows.length} rows were already imported.`,
    };

  return {
    ok: true,
    count: inserted,
    skipped,
    message: `Imported ${inserted} transaction${inserted === 1 ? "" : "s"}.${
      skipped > 0 ? ` Skipped ${skipped} blank, duplicate or unreadable row${skipped === 1 ? "" : "s"}.` : ""
    }`,
  };
}

export async function addTransactionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const date = text(formData, "date", 10);
  const description = text(formData, "description", 180);
  const amountPaise = rupees(formData, "amount");
  const direction = text(formData, "direction", 10) === "credit" ? "credit" : "debit";
  const category = text(formData, "category", 40);
  const accountId = text(formData, "accountId", 60);

  if (!isIsoDate(date)) return { ok: false, error: "Choose a valid date." };
  if (description.length < 2) return { ok: false, error: "Add a short description." };
  if (amountPaise <= 0) return { ok: false, error: "Enter an amount greater than zero." };

  addTransaction({
    userId: user.id,
    occurredOn: date,
    description,
    amountPaise,
    direction,
    category: CATEGORIES.includes(category as (typeof CATEGORIES)[number])
      ? category
      : undefined,
    accountId: accountId || null,
    source: "manual",
  });

  revalidateAll();
  return { ok: true, message: "Transaction added.", count: 1 };
}

export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = text(formData, "id", 64);
  if (id) deleteTransaction(user.id, id);
  revalidateAll();
}

export async function seedSampleAction(): Promise<void> {
  const user = await requireUser();
  if (!hasSampleData(user.id)) seedSampleData(user.id);
  revalidateAll();
}

export async function removeSampleAction(): Promise<void> {
  const user = await requireUser();
  removeSampleData(user.id);
  revalidateAll();
}

export async function clearTransactionsAction(): Promise<void> {
  const user = await requireUser();
  clearTransactions(user.id);
  revalidateAll();
}

export async function addAccountAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const kindRaw = text(formData, "kind", 20);
  const kind = ACCOUNT_KINDS.find((item) => item === kindRaw) as Account["kind"] | undefined;
  const name = text(formData, "name", 80);
  if (!kind) return { ok: false, error: "Choose an account type." };
  if (name.length < 2) return { ok: false, error: "Give the account a short name." };

  addAccount({
    userId: user.id,
    kind,
    name,
    institution: text(formData, "institution", 80) || undefined,
    last4: text(formData, "last4", 4).replace(/\D/g, "") || undefined,
    creditLimitPaise: kind === "Credit card" ? rupees(formData, "creditLimit") : 0,
    outstandingPaise:
      kind === "Credit card" || kind === "Loan" ? rupees(formData, "outstanding") : 0,
    interestRate: kind === "Loan" ? Math.min(60, Number(text(formData, "rate", 6)) || 0) : 0,
    emiPaise: kind === "Loan" ? rupees(formData, "emi") : 0,
  });

  revalidateAll();
  return { ok: true, message: `${kind} added.` };
}

export async function removeAccountAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = text(formData, "id", 64);
  if (id) deleteAccount(user.id, id);
  revalidateAll();
}
