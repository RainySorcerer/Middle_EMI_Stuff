import type { ProfileRow } from "./auth";
import type {
  Account,
  AnalysisFacts,
  Category,
  CategoryTotal,
  Insight,
  RecurringCharge,
  Transaction,
} from "./domain";
import { GOAL_LABELS } from "./domain";
import { inrP } from "./money";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DISCRETIONARY: Category[] = ["Food & dining", "Shopping", "Entertainment", "Other"];

// Repeating payments the user can realistically cut. Rent, utilities,
// insurance, groceries and EMIs repeat every month but are not optional.
const FLEXIBLE_RECURRING: Category[] = [
  "Food & dining",
  "Shopping",
  "Entertainment",
  "Health",
  "Education",
  "Other",
];

export interface RawData {
  profile: ProfileRow;
  accounts: Account[];
  transactions: Transaction[];
  today?: Date;
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function previousMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToHundred(paise: number): number {
  return Math.round(paise / 10_000) * 10_000;
}

export function buildFacts({ profile, accounts, transactions, today }: RawData): AnalysisFacts {
  const now = today ?? new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const sorted = [...transactions].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  const debits = sorted.filter((tx) => tx.direction === "debit");
  const credits = sorted.filter((tx) => tx.direction === "credit");

  const dataMonths = Array.from(new Set(sorted.map((tx) => monthKey(tx.occurred_on)))).sort();
  const latestKey = dataMonths.at(-1) ?? currentKey;
  const displayKey = dataMonths.includes(currentKey) ? currentKey : latestKey;

  const recentMonths = dataMonths.slice(-3);
  const monthDebits = recentMonths.map((key) =>
    sum(debits.filter((tx) => monthKey(tx.occurred_on) === key).map((tx) => tx.amount_paise))
  );
  const monthCredits = recentMonths.map((key) =>
    sum(credits.filter((tx) => monthKey(tx.occurred_on) === key).map((tx) => tx.amount_paise))
  );

  const spendFromTx = monthDebits.length ? Math.round(sum(monthDebits) / monthDebits.length) : 0;
  const incomeFromTx = monthCredits.length ? Math.round(sum(monthCredits) / monthCredits.length) : 0;

  const monthlyIncomePaise =
    profile.monthly_income_paise > 0 ? profile.monthly_income_paise : incomeFromTx;
  const incomeSource: AnalysisFacts["incomeSource"] =
    profile.monthly_income_paise > 0 ? "profile" : "transactions";

  const monthlySpendPaise =
    spendFromTx > 0 ? spendFromTx : profile.monthly_spend_paise;
  const spendSource: AnalysisFacts["spendSource"] =
    spendFromTx > 0 ? "transactions" : "profile";

  const monthlySurplusPaise = monthlyIncomePaise - monthlySpendPaise;
  const savingsRate =
    monthlyIncomePaise > 0 ? (monthlySurplusPaise / monthlyIncomePaise) * 100 : 0;

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const windowTx = debits.filter((tx) => tx.occurred_on >= cutoffKey);

  const categoryMap = new Map<Category, number>();
  for (const tx of windowTx) {
    if (tx.category === "Income") continue;
    categoryMap.set(tx.category, (categoryMap.get(tx.category) ?? 0) + tx.amount_paise);
  }
  const categoryTotal = sum([...categoryMap.values()]);
  const categoryTotals: CategoryTotal[] = [...categoryMap.entries()]
    .map(([category, paise]) => ({
      category,
      paise,
      share: categoryTotal > 0 ? (paise / categoryTotal) * 100 : 0,
    }))
    .sort((a, b) => b.paise - a.paise);

  const currentMonthSpendPaise = sum(
    debits.filter((tx) => monthKey(tx.occurred_on) === displayKey).map((tx) => tx.amount_paise)
  );
  const currentMonthIncomePaise = sum(
    credits.filter((tx) => monthKey(tx.occurred_on) === displayKey).map((tx) => tx.amount_paise)
  );
  const previousMonthSpendPaise = sum(
    debits
      .filter((tx) => monthKey(tx.occurred_on) === previousMonthKey(displayKey))
      .map((tx) => tx.amount_paise)
  );

  const recurring = findRecurring(debits).slice(0, 8);
  const recurringTotalPaise = sum(recurring.map((item) => item.averagePaise));
  const flexibleRecurringPaise = sum(
    recurring
      .filter((item) => FLEXIBLE_RECURRING.includes(item.category))
      .map((item) => item.averagePaise)
  );

  const merchantMap = new Map<string, { paise: number; count: number }>();
  for (const tx of windowTx) {
    const name = tx.merchant || tx.description.slice(0, 32);
    const entry = merchantMap.get(name) ?? { paise: 0, count: 0 };
    entry.paise += tx.amount_paise;
    entry.count += 1;
    merchantMap.set(name, entry);
  }
  const topMerchants = [...merchantMap.entries()]
    .map(([merchant, entry]) => ({ merchant, ...entry }))
    .sort((a, b) => b.paise - a.paise)
    .slice(0, 6);

  const cards = accounts.filter((account) => account.kind === "Credit card");
  const limitPaise = sum(cards.map((card) => card.credit_limit_paise));
  const outstandingPaise = sum(cards.map((card) => card.outstanding_paise));
  const utilization = limitPaise > 0 ? (outstandingPaise / limitPaise) * 100 : 0;

  const loans = accounts.filter((account) => account.kind === "Loan");
  const emiPaise = sum(loans.map((loan) => loan.emi_paise));
  const loansOutstanding = sum(loans.map((loan) => loan.outstanding_paise));
  const weightedRate =
    loansOutstanding > 0
      ? sum(loans.map((loan) => loan.interest_rate * loan.outstanding_paise)) / loansOutstanding
      : 0;
  const emiRatio = monthlyIncomePaise > 0 ? (emiPaise / monthlyIncomePaise) * 100 : 0;

  const emergencyMonths =
    monthlySpendPaise > 0 ? profile.emergency_fund_paise / monthlySpendPaise : 0;
  const emergencyTargetPaise = roundToHundred(monthlySpendPaise * 3);

  const goalAmount = profile.goal_amount_paise;
  const goalMonths = profile.goal_months;
  const requiredMonthlyPaise =
    goalAmount > 0 && goalMonths > 0 ? Math.ceil(goalAmount / goalMonths) : 0;
  const goal =
    goalAmount > 0 && goalMonths > 0
      ? {
          label: profile.primary_goal ? GOAL_LABELS[profile.primary_goal] ?? "Your goal" : "Your goal",
          amountPaise: goalAmount,
          months: goalMonths,
          requiredMonthlyPaise,
          feasible: monthlySurplusPaise >= requiredMonthlyPaise,
          gapPaise: Math.max(0, requiredMonthlyPaise - monthlySurplusPaise),
        }
      : null;

  const scoreParts = scoreBreakdown({
    savingsRate,
    utilization,
    hasCards: limitPaise > 0,
    emergencyMonths,
    emiRatio,
    flexibleRecurringPaise,
    monthlyIncomePaise,
  });
  const healthScore = Math.round(sum(scoreParts.map((part) => part.score)));

  const factsBase: Omit<AnalysisFacts, "insights"> = {
    hasData: sorted.length > 0,
    transactionCount: sorted.length,
    monthsCovered: dataMonths,
    monthlyIncomePaise,
    incomeSource,
    monthlySpendPaise,
    spendSource,
    monthlySurplusPaise,
    savingsRate,
    categoryTotals,
    currentMonthKey: displayKey,
    currentMonthLabel: monthLabel(displayKey),
    currentMonthSpendPaise,
    currentMonthIncomePaise,
    previousMonthSpendPaise,
    recurring,
    recurringTotalPaise,
    topMerchants,
    cards: {
      count: cards.length,
      limitPaise,
      outstandingPaise,
      utilization,
    },
    loans: {
      count: loans.length,
      emiPaise,
      outstandingPaise: loansOutstanding,
      weightedRate,
    },
    emiRatio,
    emergencyMonths,
    emergencyTargetPaise,
    goal,
    healthScore,
    scoreParts,
    generatedAt: new Date().toISOString(),
  };

  return { ...factsBase, insights: buildInsights(factsBase) };
}

function findRecurring(debits: Transaction[]): RecurringCharge[] {
  const groups = new Map<string, Transaction[]>();
  for (const tx of debits) {
    if (tx.category === "Income" || tx.category === "Investments") continue;
    const key = (tx.merchant || tx.description.slice(0, 24)).toLowerCase().trim();
    if (!key || key.length < 3) continue;
    const list = groups.get(key) ?? [];
    list.push(tx);
    groups.set(key, list);
  }

  const result: RecurringCharge[] = [];
  for (const list of groups.values()) {
    const months = new Set(list.map((tx) => monthKey(tx.occurred_on)));
    if (months.size < 2) continue;
    const amounts = list.map((tx) => tx.amount_paise);
    const average = Math.round(sum(amounts) / amounts.length);
    const spread = Math.max(...amounts) - Math.min(...amounts);
    // A recurring charge should stay roughly the same each month.
    if (average > 0 && spread / average > 0.5) continue;
    const latest = [...list].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))[0];
    result.push({
      merchant: latest.merchant || latest.description.slice(0, 32),
      category: latest.category,
      averagePaise: average,
      months: months.size,
      lastDate: latest.occurred_on,
    });
  }
  return result.sort((a, b) => b.averagePaise - a.averagePaise);
}

function scoreBreakdown(input: {
  savingsRate: number;
  utilization: number;
  hasCards: boolean;
  emergencyMonths: number;
  emiRatio: number;
  flexibleRecurringPaise: number;
  monthlyIncomePaise: number;
}) {
  const savings = clamp(input.savingsRate / 30, 0, 1) * 30;
  const utilization = !input.hasCards
    ? 12
    : input.utilization <= 30
      ? 20
      : clamp(20 - (input.utilization - 30) * 0.4, 0, 20);
  const emergency = clamp(input.emergencyMonths / 6, 0, 1) * 20;
  const debt =
    input.emiRatio <= 20
      ? 20
      : input.emiRatio <= 40
        ? 20 - ((input.emiRatio - 20) / 20) * 10
        : input.emiRatio <= 60
          ? 10 - ((input.emiRatio - 40) / 20) * 10
          : 0;
  const recurringShare =
    input.monthlyIncomePaise > 0
      ? (input.flexibleRecurringPaise / input.monthlyIncomePaise) * 100
      : 0;
  const recurring = clamp(10 - Math.max(0, recurringShare - 2) * 1.6, 0, 10);

  return [
    {
      label: "Savings",
      score: Math.round(savings),
      max: 30,
      note:
        input.savingsRate > 0
          ? `${input.savingsRate.toFixed(0)}% of income left after spending`
          : "Add income and transactions to score this",
    },
    {
      label: "Card use",
      score: Math.round(utilization),
      max: 20,
      note: input.hasCards
        ? `${input.utilization.toFixed(0)}% of your credit limit is used`
        : "No credit card tracked",
    },
    {
      label: "Emergency fund",
      score: Math.round(emergency),
      max: 20,
      note: `${input.emergencyMonths.toFixed(1)} months of expenses saved`,
    },
    {
      label: "Debt load",
      score: Math.round(debt),
      max: 20,
      note:
        input.emiRatio > 0
          ? `EMIs are ${input.emiRatio.toFixed(0)}% of income`
          : "No loan EMIs tracked",
    },
    {
      label: "Recurring load",
      score: Math.round(recurring),
      max: 10,
      note:
        input.monthlyIncomePaise > 0
          ? input.flexibleRecurringPaise > 0
            ? `${recurringShare.toFixed(1)}% of income goes to subscriptions and memberships`
            : "No optional repeating payments found"
          : "Add data to score this",
    },
  ];
}

function buildInsights(facts: Omit<AnalysisFacts, "insights">): Insight[] {
  const insights: Insight[] = [];
  const add = (insight: Insight) => insights.push(insight);
  const income = facts.monthlyIncomePaise;

  if (facts.transactionCount === 0) {
    add({
      id: "no-data",
      title: "Add your records to unlock the analysis",
      detail: income
        ? "Upload a bank or UPI CSV, or add a few transactions manually. We will group them, spot repeating payments and build your first report."
        : "Start with your income and a bank CSV. Everything else is calculated from there.",
      impactPaise: 0,
      impactLabel: "",
      tone: "brand",
      cta: { label: "Add records", href: "/activity" },
    });
  }

  const subscriptions = facts.recurring.filter((item) =>
    FLEXIBLE_RECURRING.includes(item.category)
  );
  const subscriptionTotal = sum(subscriptions.map((item) => item.averagePaise));
  if (subscriptions.length >= 2 && subscriptionTotal > 0) {
    const trim = Math.round(subscriptionTotal * 0.25);
    add({
      id: "subscriptions",
      title: `${subscriptions.length} repeating payments cost ${inrP(subscriptionTotal)}/month`,
      detail: `These look like subscriptions or memberships: ${subscriptions
        .slice(0, 4)
        .map((item) => item.merchant)
        .join(", ")}. Cancelling even one or two frees up cash without touching essentials.`,
      impactPaise: trim,
      impactLabel: "potential / month",
      tone: "watch",
      cta: { label: "Review recurring", href: "/insights" },
    });
  }

  if (facts.cards.limitPaise > 0 && facts.cards.utilization > 30) {
    const reduction = Math.max(
      0,
      facts.cards.outstandingPaise - facts.cards.limitPaise * 0.3
    );
    add({
      id: "utilization",
      title: `Card usage is ${facts.cards.utilization.toFixed(0)}% of your limit`,
      detail: `Paying ${inrP(reduction)} before your due date brings usage under the 30% mark lenders prefer. Keep the card open — closing it can raise utilisation elsewhere.`,
      impactPaise: 0,
      impactLabel: "credit-health fix",
      tone: facts.cards.utilization > 50 ? "risk" : "watch",
      cta: { label: "Manage cards", href: "/settings#accounts" },
    });
  }

  if (facts.savingsRate < 20 && income > 0) {
    const gap = Math.max(0, income * 0.2 - facts.monthlySurplusPaise);
    add({
      id: "savings-rate",
      title: `You keep ${facts.savingsRate.toFixed(0)}% of income`,
      detail: `A 20% savings rate is a useful floor. Closing the ${inrP(gap)} monthly gap is easier from one large category than from ten small ones.`,
      impactPaise: gap,
      impactLabel: "gap to 20% / month",
      tone: facts.savingsRate < 10 ? "risk" : "watch",
      cta: { label: "See spending", href: "/insights" },
    });
  }

  for (const category of facts.categoryTotals) {
    if (!DISCRETIONARY.includes(category.category)) continue;
    if (category.share < 15) continue;
    if (insights.some((insight) => insight.id === "category")) break;
    const trim = Math.round(category.paise * 0.1);
    add({
      id: "category",
      title: `${category.category} is ${category.share.toFixed(0)}% of your spending`,
      detail: `You spent ${inrP(category.paise)} here in the last 90 days. A 10% trim frees about ${inrP(trim)} a month — try one swap rather than a strict budget.`,
      impactPaise: trim,
      impactLabel: "10% trim / month",
      tone: "watch",
      cta: { label: "Break down spending", href: "/insights" },
    });
    break;
  }

  if (facts.emergencyMonths < 3 && facts.monthlySpendPaise > 0) {
    const shortfall = Math.max(
      0,
      facts.emergencyTargetPaise - Math.max(0, facts.emergencyMonths * facts.monthlySpendPaise)
    );
    const monthly = Math.max(
      0,
      Math.round(Math.min(facts.monthlySurplusPaise * 0.4, shortfall / 6))
    );
    const monthsToClose = monthly > 0 ? Math.ceil(shortfall / monthly) : 0;
    add({
      id: "emergency",
      title: `Emergency fund covers ${facts.emergencyMonths.toFixed(1)} months`,
      detail:
        monthly > 0
          ? `Three months of expenses is ${inrP(facts.emergencyTargetPaise)}. Setting aside ${inrP(monthly)} a month closes the gap in about ${monthsToClose} months.`
          : `Three months of expenses is ${inrP(facts.emergencyTargetPaise)}. Cash flow is negative right now, so bring monthly spending below income before building this buffer.`,
      impactPaise: 0,
      impactLabel: `${inrP(Math.max(0, shortfall))} to target`,
      tone: facts.emergencyMonths < 1 ? "risk" : "watch",
      cta: { label: "Update savings", href: "/settings" },
    });
  }

  if (facts.emiRatio > 40 && facts.loans.count > 0) {
    add({
      id: "emi",
      title: `EMIs take ${facts.emiRatio.toFixed(0)}% of income`,
      detail: `Lenders usually prefer total EMIs under 40%. Avoid adding a new loan and target the highest-rate balance first (${facts.loans.weightedRate.toFixed(1)}% weighted).`,
      impactPaise: 0,
      impactLabel: "debt guardrail",
      tone: facts.emiRatio > 50 ? "risk" : "watch",
      cta: { label: "Review loans", href: "/settings#accounts" },
    });
  }

  if (facts.goal) {
    add({
      id: "goal",
      title: facts.goal.feasible
        ? "On track for your goal"
        : `Your goal needs ${inrP(facts.goal.gapPaise)} more a month`,
      detail: facts.goal.feasible
        ? `At ${inrP(facts.goal.requiredMonthlyPaise)} a month you reach ${inrP(facts.goal.amountPaise)} in ${facts.goal.months} months. Automate the transfer on payday.`
        : `Reaching ${inrP(facts.goal.amountPaise)} in ${facts.goal.months} months needs ${inrP(facts.goal.requiredMonthlyPaise)} a month. Your current surplus is ${inrP(facts.monthlySurplusPaise)}.`,
      // A goal gap is a target, not a saving already available, so it should
      // not outrank real monthly moves in the ranked list.
      impactPaise: 0,
      impactLabel: facts.goal.feasible ? "per month" : "monthly gap",
      tone: facts.goal.feasible ? "good" : "watch",
      cta: { label: "Adjust goal", href: "/settings" },
    });
  }

  if (
    facts.cards.count === 0 &&
    facts.loans.count === 0 &&
    facts.transactionCount > 0
  ) {
    add({
      id: "accounts",
      title: "Add your cards and loans for the full picture",
      detail:
        "Utilisation and EMI burden are the two biggest blind spots. Add a card limit or loan EMI in Settings — it takes a minute and stays editable.",
      impactPaise: 0,
      impactLabel: "",
      tone: "brand",
      cta: { label: "Add an account", href: "/settings#accounts" },
    });
  }

  if (facts.healthScore >= 75 && insights.every((insight) => insight.impactPaise === 0)) {
    add({
      id: "healthy",
      title: "Your basics look healthy",
      detail: `Score ${facts.healthScore}/100. Keep the emergency fund topped up and review repeating payments every quarter — that is enough maintenance.`,
      impactPaise: 0,
      impactLabel: "",
      tone: "good",
    });
  }

  const toneRank: Record<Insight["tone"], number> = { risk: 0, watch: 1, brand: 2, good: 3 };
  return insights
    .sort((a, b) => {
      if (b.impactPaise !== a.impactPaise) return b.impactPaise - a.impactPaise;
      return toneRank[a.tone] - toneRank[b.tone];
    })
    .slice(0, 5);
}
