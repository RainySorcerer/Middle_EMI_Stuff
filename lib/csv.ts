import { createHash } from "node:crypto";
import { classify } from "./categorize";
import type { Category } from "./domain";

export interface ParsedRow {
  occurred_on: string;
  description: string;
  merchant: string;
  category: Category;
  amount_paise: number;
  direction: "debit" | "credit";
  dedupe_hash: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  skipped: number;
  duplicatesInFile: number;
  headers: string[];
  delimiter: string;
  error?: string;
}

const MAX_ROWS = 5_000;
const MAX_BYTES = 2 * 1024 * 1024;

export const SAMPLE_CSV = `Date,Description,Debit,Credit
01/10/2026,SALARY OCT 2026 ACME PVT LTD,,95000
02/10/2026,SWIGGY ORDER 8821,486,
03/10/2026,RENT TRANSFER LANDLORD,22000,
04/10/2026,NETFLIX SUBSCRIPTION,649,
05/10/2026,BLINKIT GROCERY,1840,
06/10/2026,UBER RIDE,268,
07/10/2026,AMAZON PAY ORDER,2199,
08/10/2026,AIRTEL POSTPAID,799,
09/10/2026,ZOMATO DINNER,712,
10/10/2026,JIO FIBER BROADBAND,999,
11/10/2026,HDFC CAR LOAN EMI,9800,
12/10/2026,PHARMEASY ORDER,634,
13/10/2026,SPOTIFY PREMIUM,119,
14/10/2026,IRCTC TICKET,1245,
15/10/2026,LIC PREMIUM,1560,
16/10/2026,SWIGGY INSTAMART,920,
17/10/2026,HDFC CREDIT CARD PAYMENT,12000,
18/10/2026,APOLLO PHARMACY,455,
19/10/2026,OLA CABS,340,
20/10/2026,PRIME VIDEO,299,
21/10/2026,ELECTRICITY BILL BESCOM,1720,
22/10/2026,DECATHLON STORE,3450,
23/10/2026,SALARY OCT 2026 ACME PVT LTD,,95000
`;

/** Parse a bank / UPI / card CSV export into normalised transactions. */
export function parseCsv(input: string): ParseResult {
  const empty: ParseResult = {
    rows: [],
    skipped: 0,
    duplicatesInFile: 0,
    headers: [],
    delimiter: ",",
  };

  if (!input.trim()) return { ...empty, error: "The file is empty." };
  if (Buffer.byteLength(input, "utf8") > MAX_BYTES)
    return { ...empty, error: "File is larger than 2 MB. Upload a smaller statement." };

  // Normalise BOM / CRLF, drop fully empty lines.
  const text = input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("\n");

  const delimiter = detectDelimiter(text);
  const matrix = tokenize(text, delimiter);
  const headerIndex = findHeaderRow(matrix);
  if (headerIndex === -1)
    return {
      ...empty,
      delimiter,
      error:
        "Could not find a header row with Date and Description columns. Export a CSV with columns like Date, Description, Debit, Credit.",
    };

  const headers = matrix[headerIndex].map((cell) => cell.trim());
  const keys = headers.map(normaliseHeader);
  const map = {
    date: findColumn(keys, ["date", "txndate", "transactiondate", "valuedate", "valdate", "postingdate", "transdate"]),
    description: findColumn(keys, ["description", "narration", "particulars", "details", "remarks", "transactiondetails", "memo", "transactiondescription"]),
    amount: findColumn(keys, ["amount", "transactionamount", "amt", "value"]),
    debit: findColumn(keys, ["debit", "debitamount", "withdrawal", "withdrawals", "withdrawalamt", "withdrawalamount", "dr", "debitamt"]),
    credit: findColumn(keys, ["credit", "creditamount", "deposit", "deposits", "depositamt", "cr", "creditamt"]),
    type: findColumn(keys, ["type", "drcr", "debitcredit", "transactiontype", "cr_dr"]),
  };

  if (map.date === -1 || map.description === -1)
    return {
      ...empty,
      delimiter,
      headers,
      error: "Missing a date or description column. Expected headers such as Date, Description, Debit, Credit.",
    };
  if (map.amount === -1 && map.debit === -1 && map.credit === -1)
    return {
      ...empty,
      delimiter,
      headers,
      error: "Missing an amount column. Expected Amount, or separate Debit and Credit columns.",
    };

  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  let duplicatesInFile = 0;
  let skipped = 0;
  const today = new Date();
  const latest = new Date(today.getTime() + 2 * 86_400_000);

  for (let i = headerIndex + 1; i < matrix.length && rows.length < MAX_ROWS; i++) {
    const cells = matrix[i];
    if (cells.every((cell) => !cell.trim())) {
      skipped++;
      continue;
    }
    const description = [map.description, map.type]
      .filter((index) => index !== -1)
      .map((index) => (cells[index] ?? "").trim())
      .filter(Boolean)
      .join(" ")
      .trim();
    const date = parseDate((cells[map.date] ?? "").trim());
    if (!date || !description) {
      skipped++;
      continue;
    }
    if (new Date(`${date}T00:00:00`) > latest) {
      skipped++;
      continue;
    }

    const amountInfo = readAmount(cells, map);
    if (!amountInfo || amountInfo.amount_paise <= 0) {
      skipped++;
      continue;
    }

    const classified = classify(description, amountInfo.direction);
    const hash = dedupeKey(date, amountInfo.amount_paise, amountInfo.direction, description);
    if (seen.has(hash)) {
      duplicatesInFile++;
      continue;
    }
    seen.add(hash);

    rows.push({
      occurred_on: date,
      description: description.slice(0, 180),
      merchant: classified.merchant,
      category: classified.category,
      amount_paise: amountInfo.amount_paise,
      direction: amountInfo.direction,
      dedupe_hash: hash,
    });
  }

  if (rows.length === 0)
    return {
      ...empty,
      delimiter,
      headers,
      skipped,
      error:
        "No usable rows found. Check that dates are dd/mm/yyyy and amounts are numeric, or try the sample CSV.",
    };

  return { rows, skipped, duplicatesInFile, headers, delimiter };
}

function detectDelimiter(text: string): string {
  const sample = text.split("\n").slice(0, 8).join("\n");
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = sample.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

function tokenize(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function findHeaderRow(matrix: string[][]): number {
  const limit = Math.min(matrix.length, 30);
  for (let i = 0; i < limit; i++) {
    const keys = matrix[i].map(normaliseHeader);
    const hasDate = keys.some((key) => ["date", "txndate", "transactiondate", "valuedate", "postingdate"].includes(key));
    const hasDescription = keys.some((key) =>
      ["description", "narration", "particulars", "details", "remarks", "memo"].includes(key)
    );
    if (hasDate && hasDescription) return i;
  }
  return -1;
}

function normaliseHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(keys: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const index = keys.indexOf(alias);
    if (index !== -1) return index;
  }
  for (let i = 0; i < keys.length; i++) {
    if (aliases.some((alias) => keys[i].startsWith(alias))) return i;
  }
  return -1;
}

function readAmount(
  cells: string[],
  map: { amount: number; debit: number; credit: number; type: number }
): { amount_paise: number; direction: "debit" | "credit" } | null {
  const typeText = map.type === -1 ? "" : (cells[map.type] ?? "").toLowerCase();

  if (map.debit !== -1 || map.credit !== -1) {
    const debitRaw = map.debit === -1 ? "" : (cells[map.debit] ?? "").trim();
    const creditRaw = map.credit === -1 ? "" : (cells[map.credit] ?? "").trim();
    const debit = parseAmount(debitRaw);
    const credit = parseAmount(creditRaw);
    if (debit && debit > 0) return { amount_paise: debit, direction: "debit" };
    if (credit && credit > 0) return { amount_paise: credit, direction: "credit" };
  }

  const raw = map.amount === -1 ? "" : (cells[map.amount] ?? "").trim();
  if (!raw) return null;
  const negative = /^\(.*\)$/.test(raw) || /^-/.test(raw.trim());
  const amount = parseAmount(raw);
  if (!amount || amount <= 0) return null;

  let direction: "debit" | "credit" = negative ? "debit" : "debit";
  if (/\bcr\b|credit/i.test(raw) || /credit|\bcr\b/.test(typeText)) direction = "credit";
  if (/\bdr\b|debit/i.test(raw) || /debit|\bdr\b/.test(typeText)) direction = "debit";
  return { amount_paise: amount, direction };
}

/** Rupees (with decimals) → paise. Returns 0 when not numeric. */
export function parseAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw
    .replace(/[₹$,\s]/g, "")
    .replace(/\((.*)\)/, "-$1")
    .replace(/(cr|dr|credit|debit)$/i, "")
    .replace(/^-+/, "-")
    .trim();
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.abs(value) * 100);
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

export function parseDate(raw: string): string | null {
  if (!raw) return null;
  const value = raw.trim().replace(/[.]/g, "/").replace(/-/g, "/").replace(/\s+/g, " ");

  // 2026-10-01 or 01/10/2026 or 01/10/26
  const numeric = value.match(/^(\d{1,4})\/(\d{1,2})\/(\d{1,4})$/);
  if (numeric) {
    const [, a, b, c] = numeric;
    if (a.length === 4) return buildDate(Number(a), Number(b), Number(c));
    const year = Number(c.length === 2 ? `20${c}` : c);
    const first = Number(a);
    const second = Number(b);
    if (first > 12) return buildDate(year, second, first);
    if (second > 12) return buildDate(year, first, second);
    // Ambiguous: Indian statements default to dd/mm/yyyy.
    return buildDate(year, second, first);
  }

  // 01 Oct 2026 / 01-Oct-26
  const named = value.match(/^(\d{1,2})[ /]([a-zA-Z]{3,9})[ /](\d{2,4})$/);
  if (named) {
    const month = MONTHS[named[2].slice(0, 4).toLowerCase()] ?? MONTHS[named[2].slice(0, 3).toLowerCase()];
    if (month) return buildDate(Number(named[3].length === 2 ? `20${named[3]}` : named[3]), month, Number(named[1]));
  }

  // Oct 01, 2026
  const namedFirst = value.match(/^([a-zA-Z]{3,9})[ /](\d{1,2}),?[ /](\d{2,4})$/);
  if (namedFirst) {
    const month = MONTHS[namedFirst[1].slice(0, 3).toLowerCase()];
    if (month)
      return buildDate(
        Number(namedFirst[3].length === 2 ? `20${namedFirst[3]}` : namedFirst[3]),
        month,
        Number(namedFirst[2])
      );
  }

  return null;
}

function buildDate(year: number, month: number, day: number): string | null {
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dedupeKey(
  date: string,
  amountPaise: number,
  direction: string,
  description: string
): string {
  return createHash("sha1")
    .update(`${date}|${amountPaise}|${direction}|${description.trim().toLowerCase()}`)
    .digest("hex");
}
