export const CATEGORIES = [
  "Food & dining",
  "Groceries",
  "Shopping",
  "Transport",
  "Entertainment",
  "Utilities",
  "Rent",
  "Insurance",
  "Health",
  "Education",
  "EMI & loans",
  "Investments",
  "Cash",
  "Taxes",
  "Giving",
  "Income",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const GOALS = [
  { id: "emergency", label: "Build an emergency fund" },
  { id: "debt", label: "Pay off debt" },
  { id: "save", label: "Save for a big goal" },
  { id: "invest", label: "Invest more each month" },
  { id: "spend", label: "Spend less and track better" },
] as const;

export const GOAL_LABELS: Record<string, string> = Object.fromEntries(
  GOALS.map((goal) => [goal.id, goal.label])
);

export const EMPLOYMENT = [
  "Salaried",
  "Self-employed",
  "Business owner",
  "Freelancer",
  "Student",
  "Other",
] as const;

export const RISK = ["Cautious", "Balanced", "Growth"] as const;

export const ACCOUNT_KINDS = ["Bank", "Credit card", "Loan", "Investment"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export interface Account {
  id: string;
  user_id: string;
  kind: AccountKind;
  name: string;
  institution: string | null;
  last4: string | null;
  credit_limit_paise: number;
  outstanding_paise: number;
  interest_rate: number;
  emi_paise: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  occurred_on: string;
  description: string;
  merchant: string | null;
  amount_paise: number;
  direction: "debit" | "credit";
  category: Category;
  source: "manual" | "csv" | "sample" | "pdf";
  created_at: string;
}

export interface Insight {
  id: string;
  title: string;
  detail: string;
  impactPaise: number;
  impactLabel: string;
  tone: "good" | "watch" | "risk" | "brand";
  cta?: { label: string; href: string };
}

export interface CategoryTotal {
  category: Category;
  paise: number;
  share: number;
}

export interface RecurringCharge {
  merchant: string;
  category: Category;
  averagePaise: number;
  months: number;
  lastDate: string;
}

export interface AnalysisFacts {
  hasData: boolean;
  transactionCount: number;
  monthsCovered: string[];
  monthlyIncomePaise: number;
  incomeSource: "profile" | "transactions";
  monthlySpendPaise: number;
  spendSource: "profile" | "transactions";
  monthlySurplusPaise: number;
  savingsRate: number;
  categoryTotals: CategoryTotal[];
  currentMonthKey: string;
  currentMonthLabel: string;
  currentMonthSpendPaise: number;
  currentMonthIncomePaise: number;
  previousMonthSpendPaise: number;
  recurring: RecurringCharge[];
  recurringTotalPaise: number;
  topMerchants: { merchant: string; paise: number; count: number }[];
  cards: { count: number; limitPaise: number; outstandingPaise: number; utilization: number };
  loans: {
    count: number;
    emiPaise: number;
    outstandingPaise: number;
    weightedRate: number;
  };
  emiRatio: number;
  emergencyMonths: number;
  emergencyTargetPaise: number;
  goal: {
    label: string;
    amountPaise: number;
    months: number;
    requiredMonthlyPaise: number;
    feasible: boolean;
    gapPaise: number;
  } | null;
  healthScore: number;
  scoreParts: { label: string; score: number; max: number; note: string }[];
  insights: Insight[];
  generatedAt: string;
}

export interface StoredAnalysis {
  id: string;
  created_at: string;
  engine: string;
  headline: string;
  summary: string;
  payload_json: string;
}
