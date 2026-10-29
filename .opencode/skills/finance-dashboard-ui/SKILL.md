---
name: Finance Dashboard UI
description: Domain rules for the Indian personal-finance dashboard. Use when building credit utilization, EMI, SIP, tax, expense, or recommendation views, formatting INR amounts, or deciding what a financial metric should communicate.
---

# Finance Dashboard UI

The product helps middle-class Indian users see credit utilization, EMI load, SIP performance,
expenses, and recommended actions. Accuracy and trust matter more than visual flourish.

## Money and number formatting

- Currency: `₹` with the Indian digit grouping, not Western grouping.
  `1234567` → `₹12,34,567`. Use compact forms in KPI cards: `₹12.3L`, `₹1.24Cr`.
- Always show the unit in the label when the number is compacted (`Monthly income`, `in lakhs`).
- Use tabular numerals for aligned figures in tables and KPI rows.
- Percentages: one decimal max unless precision is meaningful. Credit utilization: whole percent.
- Negative values: show a real minus sign `−`, and a semantic color, not just red text.
- Never round away a number the user needs to act on (EMI, due date, balance).

## Metric semantics

- **Credit utilization** = outstanding / credit limit per card and overall. Under 30% is healthy;
  30–50% is a warning; above 50% is a problem. Show the limit and the balance, not only the ratio.
- **EMI load (FOIR)** = total monthly EMIs / net monthly income. Flag above ~40%; above 50% is
  high risk. Use net income, and say so on screen.
- **SIP performance** needs invested amount, current value, absolute return, and XIRR if available.
  Never show a return without its period.
- **Tax savings** are awareness only: 80C and 80D limits, used vs remaining. Do not present a
  computed tax liability as advice.
- **Expense leaks** need a category, an amount, a trend, and a concrete next action.

## Screen composition

1. Top: 3–5 KPI cards — net worth or monthly surplus, credit utilization, EMI load, SIP value,
   upcoming dues.
2. Middle: one primary chart plus one breakdown (utilization per card, EMI timeline, spend by
   category).
3. Bottom: recommendation cards, each with the action, the reason, and the estimated impact.
4. Keep a persistent "as of" date and data source on the dashboard.

## Recommendations

Each recommendation must state:

- **Action**: one imperative sentence, e.g. "Move ₹5,000 from the emergency SIP to the growth fund."
- **Why**: the metric that triggered it.
- **Impact**: estimated monthly or annual rupee effect, labeled as an estimate.
- **Confidence or caveat**: what data is missing or assumed.

Never fabricate a product, card, fund, or interest rate. If a rate is unknown, show "not provided".

## Trust and safety

- Label estimates as estimates and assumptions explicitly.
- Show the data's as-of date and staleness. Stale data must look stale.
- Financial data is sensitive: never log amounts, balances, card numbers, or identifiers.
- Include a short "not financial advice" note near recommendations.
- Empty state must explain what to add first, not show zeroed charts.

## Accessibility for financial data

- Charts need a text summary and a table or list equivalent.
- Color must not be the only signal for healthy/warning/critical; add a label or icon.
- Large amounts must not overflow cards at 360px; switch to compact notation.
