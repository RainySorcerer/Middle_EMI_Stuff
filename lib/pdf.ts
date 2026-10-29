import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { classify } from "./categorize";
import { dedupeKey, parseAmount, parseDate, type ParsedRow } from "./csv";
import { GeminiError, geminiConfigured, geminiJson } from "./gemini";

export const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_PAGES = 24;
const MAX_LAYOUT_CHARS = 90_000;
const MAX_ROWS = 2_000;

export type PdfErrorCode =
  | "too_large"
  | "password_required"
  | "bad_password"
  | "unreadable"
  | "empty"
  | "ai_unavailable"
  | "ai_failed";

export class PdfError extends Error {
  readonly code: PdfErrorCode;
  constructor(code: PdfErrorCode, message: string) {
    super(message);
    this.name = "PdfError";
    this.code = code;
  }
}

export interface PdfExtractResult {
  rows: ParsedRow[];
  warnings: string[];
  pages: number;
  /** "pdf" = the file itself was sent to Gemini; "text" = decrypted layout text. */
  mode: "pdf" | "text";
}

const SYSTEM = `You extract transactions from Indian bank, credit-card and UPI statement PDFs.

Return one JSON object with the keys "transactions" and "warnings".
- One entry per posted transaction. Never invent a transaction.
- Skip opening/closing balances, totals, summaries, statements of charges, reward points, headers, footers and page numbers.
- date: ISO YYYY-MM-DD. Indian statements are day-first when ambiguous (03/04/2026 = 3 April 2026).
- amount: positive number in rupees, no separators or currency symbols. Always positive; direction carries the sign.
- direction: "debit" for money leaving the account (purchases, fees, transfers out, EMIs), "credit" for money arriving (salary, refunds, transfers in). On credit-card statements, purchases are "debit" and payments or refunds are "credit".
- description: the printed narration or merchant, trimmed to 120 characters. Drop UPI reference numbers only when they make the line unreadable.
- If a row's date, amount or direction cannot be read with confidence, skip that row instead of guessing.
- warnings: up to 3 short strings about anything ambiguous, such as mixed date formats or totals that do not reconcile.

If the input is layout text, tokens are prefixed with their x coordinate, for example "[40]01/10/2026 [150]SWIGGY [420]486.00". Use the x position of the Debit/Credit (or Withdrawal/Deposit) headers to decide the direction of each amount.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    transactions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          date: { type: "STRING" },
          description: { type: "STRING" },
          amount: { type: "NUMBER" },
          direction: { type: "STRING", enum: ["debit", "credit"] },
        },
        required: ["date", "description", "amount", "direction"],
        propertyOrdering: ["date", "description", "amount", "direction"],
      },
    },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["transactions"],
  propertyOrdering: ["transactions", "warnings"],
};

function isPasswordError(error: unknown): boolean {
  return (error as { name?: string })?.name === "PasswordException";
}

function passwordErrorCode(error: unknown): number | undefined {
  return (error as { code?: number })?.code;
}

function standardFontsPath(): string {
  return `${path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts")}${path.sep}`;
}

async function loadDocument(bytes: Uint8Array, password?: string) {
  const task = getDocument({
    // pdf.js transfers the buffer to its worker, so hand it a copy. Reusing the
    // original would leave the caller's bytes detached after the first attempt.
    data: new Uint8Array(bytes),
    password,
    useSystemFonts: false,
    standardFontDataUrl: standardFontsPath(),
  });
  try {
    return { doc: await task.promise, task };
  } catch (error) {
    await task.destroy().catch(() => {});
    throw error;
  }
}

/**
 * Decrypted PDFs are rendered to text with x positions preserved, because
 * Gemini cannot open an encrypted file. Plain PDFs are sent as-is so Gemini
 * can also read scans and column layout.
 */
async function layoutText(doc: { numPages: number; getPage: (n: number) => Promise<any> }): Promise<string> {
  const pages = Math.min(doc.numPages, MAX_PAGES);
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = new Map<number, { x: number; text: string }[]>();

    for (const item of content.items as { str?: string; transform?: number[] }[]) {
      const text = item.str?.trim();
      if (!text || !item.transform) continue;
      const y = Math.round(item.transform[5] / 3);
      const bucket = lines.get(y) ?? [];
      bucket.push({ x: Math.round(item.transform[4]), text });
      lines.set(y, bucket);
    }

    chunks.push(`--- Page ${pageNumber} ---`);
    for (const [, items] of [...lines.entries()].sort((a, b) => b[0] - a[0])) {
      chunks.push(
        items
          .sort((a, b) => a.x - b.x)
          .map((item) => `[${item.x}]${item.text}`)
          .join(" ")
      );
    }
    page.cleanup?.();
  }

  const text = chunks.join("\n");
  return text.length > MAX_LAYOUT_CHARS ? text.slice(0, MAX_LAYOUT_CHARS) : text;
}

interface RawTransaction {
  date?: unknown;
  description?: unknown;
  amount?: unknown;
  direction?: unknown;
}

function toRows(payload: { transactions?: RawTransaction[]; warnings?: unknown }): {
  rows: ParsedRow[];
  warnings: string[];
  skipped: number;
} {
  const seen = new Set<string>();
  const rows: ParsedRow[] = [];
  let skipped = 0;

  for (const raw of payload.transactions ?? []) {
    if (rows.length >= MAX_ROWS) {
      skipped += 1;
      continue;
    }

    const date = parseDate(String(raw?.date ?? ""));
    const amountPaise = parseAmount(
      typeof raw?.amount === "number" ? raw.amount.toFixed(2) : String(raw?.amount ?? "")
    );
    const direction =
      raw?.direction === "credit" ? "credit" : raw?.direction === "debit" ? "debit" : null;
    const description = String(raw?.description ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);

    if (!date || amountPaise <= 0 || amountPaise > 1_000_000_000_00 || !direction || description.length < 2) {
      skipped += 1;
      continue;
    }

    const hash = dedupeKey(date, amountPaise, direction, description);
    if (seen.has(hash)) {
      skipped += 1;
      continue;
    }
    seen.add(hash);

    const classified = classify(description, direction);
    rows.push({
      occurred_on: date,
      description,
      merchant: classified.merchant,
      category: classified.category,
      amount_paise: amountPaise,
      direction,
      dedupe_hash: hash,
    });
  }

  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings
        .filter((warning): warning is string => typeof warning === "string" && warning.trim().length > 0)
        .slice(0, 3)
        .map((warning) => warning.trim().slice(0, 140))
    : [];

  return { rows, warnings, skipped };
}

export async function extractPdfTransactions(input: {
  bytes: Uint8Array;
  password?: string;
}): Promise<PdfExtractResult> {
  const { bytes } = input;
  const password = input.password?.trim() || undefined;

  if (bytes.byteLength > MAX_PDF_BYTES) {
    throw new PdfError("too_large", "PDF is larger than 8 MB.");
  }
  if (!geminiConfigured()) {
    throw new PdfError("ai_unavailable", "PDF import needs a Gemini API key.");
  }

  let doc: Awaited<ReturnType<typeof loadDocument>>["doc"];
  let task: Awaited<ReturnType<typeof loadDocument>>["task"];
  let encrypted = false;

  try {
    // Try without a password first: an unencrypted file should never be read
    // through the text fallback, even if the user filled the password field.
    ({ doc, task } = await loadDocument(bytes));
  } catch (error) {
    if (!isPasswordError(error)) {
      throw new PdfError("unreadable", "That PDF could not be opened.");
    }
    if (!password) {
      throw new PdfError("password_required", "That PDF is password-protected.");
    }
    encrypted = true;
    try {
      ({ doc, task } = await loadDocument(bytes, password));
    } catch (retryError) {
      if (isPasswordError(retryError)) {
        throw new PdfError("bad_password", "That password did not open the PDF.");
      }
      throw new PdfError("unreadable", "That PDF could not be opened.");
    }
  }

  let pages = 0;
  let text = "";
  try {
    pages = doc.numPages;
    if (encrypted) text = await layoutText(doc);
  } finally {
    await task.destroy().catch(() => {});
  }

  if (encrypted && text.replace(/--- Page \d+ ---/g, "").trim().length < 40) {
    throw new PdfError(
      "unreadable",
      "That PDF has no machine-readable text. Password-protected scans need a CSV export."
    );
  }

  const parts =
    encrypted && text
      ? [
          { text: `Statement layout text, page by page:\n\n${text}` },
          { text: "Extract every posted transaction now." },
        ]
      : [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: Buffer.from(bytes).toString("base64"),
            },
          },
          { text: "Extract every posted transaction now." },
        ];

  let payload: { transactions?: RawTransaction[]; warnings?: unknown };
  try {
    payload = await geminiJson({
      system: SYSTEM,
      parts,
      schema: SCHEMA,
      maxOutputTokens: 8192,
      timeoutMs: 90_000,
      thinkingBudget: 0,
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      throw new PdfError("ai_failed", "The AI reader could not process this statement.");
    }
    throw error;
  }

  const { rows, warnings, skipped } = toRows(payload);

  if (rows.length === 0) {
    throw new PdfError("empty", "No transactions could be read from that PDF.");
  }
  if (skipped > 0) {
    warnings.push(`${skipped} line${skipped === 1 ? "" : "s"} could not be read and were skipped.`);
  }

  return {
    rows,
    warnings: warnings.slice(0, 4),
    pages,
    mode: encrypted ? "text" : "pdf",
  };
}
