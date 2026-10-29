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
import { isIsoDate, rateLimit, rupees, text, type ActionState } from "@/lib/validate";
import { extractPdfTransactions, MAX_PDF_BYTES, PdfError } from "@/lib/pdf";
import { geminiConfigured } from "@/lib/gemini";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  revalidatePath("/insights");
  revalidatePath("/settings");
}

function pdfErrorMessage(error: PdfError): string {
  switch (error.code) {
    case "password_required":
      return "This PDF is password-protected. Enter the PDF password and try again.";
    case "bad_password":
      return "That password did not open the PDF. Check it and try again.";
    case "too_large":
      return "PDFs are limited to 8 MB. Export a shorter date range.";
    case "ai_unavailable":
      return "PDF import needs GEMINI_API_KEY on the server. Export a CSV instead.";
    case "empty":
      return "No transactions could be read from that PDF. Try the original bank file or a CSV export.";
    case "ai_failed":
      return "The AI reader could not process this statement. Try again, or export a CSV.";
    default:
      return "That PDF could not be read. Try the original bank file or a CSV export.";
  }
}

export async function importStatementAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Choose a CSV or PDF file to upload." };

  const accountIdRaw = text(formData, "accountId", 60);
  const account = accountIdRaw
    ? listAccounts(user.id).find((item) => item.id === accountIdRaw)
    : undefined;

  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

  if (isPdf) {
    if (file.size > MAX_PDF_BYTES)
      return { ok: false, error: "PDFs are limited to 8 MB. Export a shorter date range." };
    if (!geminiConfigured())
      return { ok: false, error: "PDF import needs GEMINI_API_KEY on the server. Export a CSV instead." };
    if (formData.get("aiConsent") !== "on")
      return {
        ok: false,
        error: "Tick the AI notice first: PDF import sends the statement to Google Gemini.",
      };
    if (!rateLimit(`pdf:${user.id}`, 10, 60 * 60_000))
      return { ok: false, error: "Too many PDF imports. Try again in an hour." };

    let result;
    try {
      result = await extractPdfTransactions({
        bytes: new Uint8Array(await file.arrayBuffer()),
        password: text(formData, "pdfPassword", 200),
      });
    } catch (error) {
      if (error instanceof PdfError) return { ok: false, error: pdfErrorMessage(error) };
      throw error;
    }

    const inserted = importRows(user.id, result.rows, account?.id ?? null, "pdf");
    revalidateAll();

    if (inserted === 0)
      return {
        ok: false,
        error: `No new transactions — all ${result.rows.length} rows from this PDF were already imported.`,
      };

    const warnings = result.warnings.length > 0 ? ` ${result.warnings.join(" ")}` : "";
    return {
      ok: true,
      count: inserted,
      message: `Imported ${inserted} transaction${inserted === 1 ? "" : "s"} from your PDF.${
        result.mode === "text" ? " Read from the decrypted layout." : ""
      }${warnings}`,
    };
  }

  if (file.size > 2 * 1024 * 1024)
    return { ok: false, error: "File is larger than 2 MB." };

  let content: string;
  try {
    content = await file.text();
  } catch {
    return { ok: false, error: "Could not read that file. Try exporting it as CSV." };
  }

  const parsed = parseCsv(content);
  if (parsed.error) return { ok: false, error: parsed.error };

  const inserted = importRows(user.id, parsed.rows, account?.id ?? null, "csv");
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
