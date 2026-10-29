export type UtilBand = "good" | "watch" | "risk";

export type SipCategory = "Equity" | "Hybrid" | "Debt" | "Emergency";

export interface CreditCard {
  id: string;
  name: string;
  issuer: string;
  last4: string;
  limit: number;
  outstanding: number;
  dueDay: number;
  rewardType: string;
  bestFor: string[];
  accent: string;
}

export interface Sip {
  id: string;
  name: string;
  category: SipCategory;
  monthly: number;
  invested: number;
  current: number;
  goal: string;
  start: string;
}

export interface Loan {
  id: string;
  name: string;
  lender: string;
  outstanding: number;
  rate: number;
  emi: number;
  remainingMonths: number;
  totalMonths: number;
}

export interface Expense {
  id: string;
  label: string;
  amount: number;
}

export interface RecommendedAction {
  id: string;
  title: string;
  category: string;
  impactValue: number;
  impactPeriod: "one-time" | "per month" | "per year";
  confidence: "High" | "Medium";
  why: string;
  detail: string;
  accent: "teal" | "gold";
  deadline?: string;
}

export interface MonthSnapshot {
  key: string;
  label: string;
  short: string;
  netWorth: number;
  utilization: number;
  cashFlow: number;
  daysToEmi: number;
  score: number;
  saved: number;
  sipValue: number;
  narrative: string;
  changes: string[];
}

export interface RewardCard {
  id: string;
  name: string;
  annualFee: number;
  feeWaiverSpend: number;
  rates: Record<string, number>;
}

export interface SpendCategory {
  id: string;
  label: string;
  defaultSpend: number;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  lastUsed: string;
  unusedMonths: number;
  verdict: "keep" | "review" | "cancel";
  note: string;
}

export interface LeakCategory {
  id: string;
  label: string;
  current: number;
  average: number;
  note: string;
  /** Trim potential in rupees per month, 0 when spend is healthy. */
  trim: number;
}
