import type { UtilBand } from "./types";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** ₹1,23,456 — Indian digit grouping. */
export function inr(value: number, maximumFractionDigits = 0): string {
  if (!Number.isFinite(value)) return "—";
  if (maximumFractionDigits === 0) return inrFormatter.format(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits,
  }).format(value);
}

/** ₹8.42L / ₹1.24Cr — compact form for tight spaces. */
export function compactInr(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `${sign}₹${trim(abs / 1_00_00_000)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trim(abs / 1_00_000)}L`;
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000)}k`;
  return `${sign}₹${trim(abs)}`;
}

function trim(value: number): string {
  return String(Number(value.toFixed(2)));
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** 34.2% — one decimal only when it adds signal. */
export function percent(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(fractionDigits));
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(fractionDigits)}%`;
}

export function signedInr(value: number): string {
  if (value > 0) return `+${inr(value)}`;
  if (value < 0) return `−${inr(Math.abs(value))}`;
  return inr(0);
}

export function utilizationBand(value: number): UtilBand {
  if (value < 30) return "good";
  if (value <= 50) return "watch";
  return "risk";
}

export function utilizationLabel(value: number): string {
  const band = utilizationBand(value);
  if (band === "good") return "Healthy";
  if (band === "watch") return "Watch";
  return "Act now";
}

export const bandStyles: Record<
  UtilBand,
  { text: string; bg: string; border: string; stroke: string; chip: string }
> = {
  good: {
    text: "text-success",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    stroke: "#059669",
    chip: "bg-emerald-50 text-emerald-700",
  },
  watch: {
    text: "text-gold-700",
    bg: "bg-gold-50",
    border: "border-gold-200",
    stroke: "#D97706",
    chip: "bg-gold-50 text-gold-700",
  },
  risk: {
    text: "text-danger",
    bg: "bg-red-50",
    border: "border-red-200",
    stroke: "#DC2626",
    chip: "bg-red-50 text-red-700",
  },
};

/** Standard reducing-balance EMI. */
export function emiFor(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

export function totalInterest(principal: number, annualRate: number, months: number): number {
  return emiFor(principal, annualRate, months) * months - principal;
}

/** Loan principal a given monthly EMI can support, at a rate and tenure. */
export function principalForEmi(emi: number, annualRate: number, months: number): number {
  if (emi <= 0 || months <= 0) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return emi * months;
  const factor = Math.pow(1 + r, months);
  return (emi * (factor - 1)) / (r * factor);
}

/** Fixed-obligation-to-income ratio, in percent. */
export function foir(totalEmi: number, netIncome: number): number {
  if (netIncome <= 0) return 0;
  return (totalEmi / netIncome) * 100;
}

export function foirVerdict(value: number): { label: string; band: UtilBand; detail: string } {
  if (value <= 30)
    return { label: "Comfortable", band: "good", detail: "Well inside the 40% guardrail." };
  if (value <= 40)
    return { label: "Manageable", band: "good", detail: "Inside the guardrail, but little room for a new EMI." };
  if (value <= 50)
    return { label: "Stretched", band: "watch", detail: "Above the 40% guardrail. Avoid adding loans." };
  return { label: "At risk", band: "risk", detail: "Above 50%. Prioritise paying down debt." };
}

export function emergencyMonths(emergencyFund: number, monthlyExpenses: number): number {
  if (monthlyExpenses <= 0) return 0;
  return emergencyFund / monthlyExpenses;
}

/** Interest saved by prepaying now, keeping the same EMI. */
export function prepaymentSaving(
  outstanding: number,
  annualRate: number,
  remainingMonths: number,
  prepay: number
): number {
  const emi = emiFor(outstanding, annualRate, remainingMonths);
  const remainingInterest = emi * remainingMonths - outstanding;
  const newPrincipal = Math.max(0, outstanding - prepay);
  const newMonths = Math.ceil(-Math.log(1 - (newPrincipal * (annualRate / 12 / 100)) / emi) / Math.log(1 + annualRate / 12 / 100));
  if (!Number.isFinite(newMonths) || newMonths <= 0) return remainingInterest;
  const newInterest = emi * newMonths - newPrincipal;
  return Math.max(0, remainingInterest - newInterest);
}

/** Future value of a monthly SIP. */
export function sipFutureValue(monthly: number, annualReturn: number, months: number): number {
  const r = annualReturn / 12 / 100;
  if (r === 0) return monthly * months;
  return monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
}

/** Monthly SIP needed to reach a goal. */
export function sipForGoal(goal: number, annualReturn: number, months: number): number {
  const r = annualReturn / 12 / 100;
  if (months <= 0) return 0;
  if (r === 0) return goal / months;
  return goal / (((Math.pow(1 + r, months) - 1) / r) * (1 + r));
}

/** Future value of a lump sum. */
export function lumpSumFutureValue(amount: number, annualReturn: number, months: number): number {
  return amount * Math.pow(1 + annualReturn / 100, months / 12);
}

/* ------------------------------ income tax ------------------------------ */

type Slab = { upTo: number; rate: number };

const NEW_REGIME_SLABS: Slab[] = [
  { upTo: 400_000, rate: 0 },
  { upTo: 800_000, rate: 0.05 },
  { upTo: 1_200_000, rate: 0.1 },
  { upTo: 1_600_000, rate: 0.15 },
  { upTo: 2_000_000, rate: 0.2 },
  { upTo: 2_400_000, rate: 0.25 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.3 },
];

const OLD_REGIME_SLABS: Slab[] = [
  { upTo: 250_000, rate: 0 },
  { upTo: 500_000, rate: 0.05 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.3 },
];

function slabTax(taxable: number, slabs: Slab[]): number {
  let tax = 0;
  let previous = 0;
  for (const slab of slabs) {
    if (taxable <= previous) break;
    const slice = Math.min(taxable, slab.upTo) - previous;
    tax += slice * slab.rate;
    previous = slab.upTo;
  }
  return tax;
}

export interface TaxResult {
  regime: "new" | "old";
  taxableIncome: number;
  slabTax: number;
  rebate: number;
  cess: number;
  total: number;
  deductions: number;
}

export function taxNewRegime(grossIncome: number): TaxResult {
  const standardDeduction = 75_000;
  const taxableIncome = Math.max(0, grossIncome - standardDeduction);
  const base = slabTax(taxableIncome, NEW_REGIME_SLABS);
  const rebate = taxableIncome <= 1_200_000 ? Math.min(base, 60_000) : 0;
  const afterRebate = Math.max(0, base - rebate);
  const cess = afterRebate * 0.04;
  return {
    regime: "new",
    taxableIncome,
    slabTax: base,
    rebate,
    cess,
    total: afterRebate + cess,
    deductions: standardDeduction,
  };
}

export function taxOldRegime(grossIncome: number, deductions: number): TaxResult {
  const standardDeduction = 50_000;
  const totalDeductions = standardDeduction + deductions;
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);
  const base = slabTax(taxableIncome, OLD_REGIME_SLABS);
  const rebate = taxableIncome <= 500_000 ? Math.min(base, 12_500) : 0;
  const afterRebate = Math.max(0, base - rebate);
  const cess = afterRebate * 0.04;
  return {
    regime: "old",
    taxableIncome,
    slabTax: base,
    rebate,
    cess,
    total: afterRebate + cess,
    deductions: totalDeductions,
  };
}

export function monthLabelFromKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function addMonths(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
