# PRD: AI Personal Finance Optimizer for India

**Working name:** PaisaPilot · **Version:** 0.1 · **Owner:** Product · **Status:** Draft

> Source: `PRD AI Personal Finance Optimizer for India (1).pdf` (6 pages). Text extracted and formatted for the repository; content unchanged in substance.

## 1. Overview

Middle-class Indians manage a tangle of products: SIPs, credit cards, savings accounts, EMIs, insurance and tax-saving instruments. Each lives in a different app, and no one connects them. Existing tools are either generic expense trackers or paid advisory services that most people won't pay for.

PaisaPilot is an AI agent that ingests a user's financial picture, analyzes it holistically, and delivers a monthly report with specific, quantified actions (for example: "Use your cashback card for utilities to earn about ₹420 more per month").

## 2. Goals and Non-Goals

### Goals

- Give users one consolidated view of credit utilization, SIPs, EMIs and cash flow.
- Turn raw data into 3 to 5 prioritized, quantified actions each month.
- Track progress over time so users see the effect of acting on advice.
- Be affordable (free tier plus low-cost premium) and India-specific (INR, Indian tax rules, Indian card and fund ecosystem).

### Non-Goals (v1)

- Executing transactions, such as buying funds or paying bills.
- Giving personalized securities recommendations (see Compliance, section 9).
- Supporting business finances, F&O or crypto.
- Automated bank sync (planned for v2 via Account Aggregator).

## 3. Target Users

| Persona | Profile | Core need |
| --- | --- | --- |
| Early-career salaried (primary) | Age 22–30, income ₹30k–₹1L per month, 1–2 cards, first SIPs | Build habits, avoid card debt, start investing well |
| Mid-career family earner | Age 30–45, income ₹1L–₹3L per month, home or car EMI, several SIPs, goals such as education | Optimize across goals, EMIs and taxes |
| Credit-card power user | Any age, 3+ cards | Maximize rewards without hurting credit score |

## 4. Problem Statement and Key Questions

The product must answer, with numbers:

1. Am I using my credit limit healthily? (utilization, due-date risk)
2. Is this EMI expensive, and should I prepay or foreclose?
3. Is my SIP allocation aligned with my goals and time horizons?
4. Where is my money leaking?
5. Am I using available tax deductions?

## 5. User Stories

- As a user, I enter my income, expenses, cards, SIPs and EMIs once and get a full analysis in under 5 minutes.
- As a user, I see my credit utilization per card and overall, with a warning if I cross 30%.
- As a user, I get told which card to use for which spending category.
- As a user, I can test whether a new loan is affordable before taking it.
- As a user, I can compare SIP vs lump sum for a specific goal.
- As a user, I receive a monthly report and can see how I improved month over month.
- As a user, I can delete all my data at any time.

## 6. Features

### 6.1 MVP (P0)

**A. Financial Profile Intake** — Guided form (manual entry; CSV upload as a stretch). Captures income, fixed and variable expenses, cards (limit, outstanding, due date, rewards structure), SIPs (fund, amount, goal, start date), loans and EMIs (principal, rate, tenure, remaining months), savings balances.

**B. Credit Utilization Analyzer** — Per-card and aggregate utilization, status bands (under 30% good, 30–50% watch, over 50% risk), reminders to pay before statement date.

**C. EMI Affordability and Cost Calculator** — EMI-to-income ratio (flag above roughly 40%), effective interest rate, total interest paid, prepayment and foreclosure savings, and a "what if I take this new loan" simulator.

**D. SIP Review** — Allocation by category (equity, debt, hybrid, emergency), goal mapping, and flags such as over-concentration or an emergency fund below 6 months of expenses.

**E. Monthly AI Report** — Claude-generated narrative plus a ranked list of actions, each with estimated monthly or annual impact in ₹. Example: "Move ₹5,000 from your liquid fund to an equity index SIP once your emergency fund reaches 6 months of expenses."

**F. Dashboard** — Credit utilization gauges, EMI timeline, SIP allocation chart, net-worth trend, and a recommended-actions panel with a done/dismiss state.

**G. History** — Monthly snapshots stored so the dashboard shows trends and progress.

### 6.2 P1 (Fast Follow)

- **Credit card category matcher:** user enters spend by category (fuel, groceries, dining, utilities, travel, online shopping); the engine ranks cards by net annual value after fees using a maintained card rewards database.
- **SIP vs lump sum comparison:** goal amount, horizon and assumed return range; shows outcomes under multiple scenarios, with rupee-cost averaging explained.
- **Expense leak detector:** flags subscriptions, category spend above peer or personal benchmarks, and month-over-month spikes.
- **Tax-saving planner:** Section 80C, 80D and related awareness, shows used vs remaining headroom and old vs new regime comparison.

### 6.3 P2 (Later)

Account Aggregator integration, statement PDF parsing, goal-based planning, family accounts, WhatsApp nudges, vernacular languages.

## 7. AI Agent Design

**Principle: deterministic math, LLM for reasoning and explanation.** All calculations (utilization, EMI, XIRR, tax) are done in code and tested. Claude receives structured results and produces insights, prioritization and plain-language explanations. This prevents arithmetic hallucinations.

### Pipeline

1. Validate and normalize the user's data.
2. Run rule-based analyzers (utilization, EMI ratio, emergency fund, tax headroom).
3. Pass the structured output plus history to Claude with a strict JSON schema.
4. Claude returns ranked actions with rationale, impact estimate (computed values only) and confidence.
5. A guardrail layer checks outputs against rules (no specific stock tips, disclaimers attached, numbers match the analyzers).
6. Store the report; render in UI and email.

**Tone:** clear, non-judgmental, jargon-light, with English first and Hinglish later.

## 8. Technical Architecture (Suggested)

**Core data model:** User, Profile, CreditCard, SIP, Loan, Expense, MonthlySnapshot, Report, Action.

| Layer | Choice |
| --- | --- |
| Frontend | React or Next.js, charting via Recharts |
| Backend | Python (FastAPI) or Node |
| Database | PostgreSQL (users, snapshots, reports); field-level encryption for sensitive data |
| AI | Claude API with structured JSON output |
| Auth | Email or phone OTP, optional Google sign-in |
| Jobs | Scheduled monthly report generation and reminder emails |
| Hosting | India-region cloud (data residency preference) |

## 9. Security, Privacy and Compliance

- Do not collect full card numbers, CVV, net-banking credentials or OTPs. Only last 4 digits, limits and balances.
- Encryption in transit and at rest; minimal data retention; one-click export and delete.
- Comply with India's Digital Personal Data Protection Act, 2023: explicit consent, purpose limitation, grievance contact.
- **SEBI:** personalized investment advice may require registration as an Investment Adviser (RIA). v1 should stay at education and analysis level (asset-category guidance, not specific fund or stock recommendations) until legal counsel confirms the approach.
- Every report carries a disclaimer: informational only, not financial advice.
- Get legal review before launch, as regulations change.

## 10. Success Metrics

| Metric | Target (first 6 months) |
| --- | --- |
| Onboarding completion rate | 60% or higher |
| Time to first report | Under 5 minutes |
| Monthly active retention (month 3) | 35% or higher |
| Users acting on at least 1 recommendation | 40% or higher |
| Avg. utilization reduction for users above 30% | 10 percentage points |
| Report helpfulness rating | 4.0 or higher out of 5 |
| Free to paid conversion | 3% to 5% |

## 11. Monetization

- **Free:** manual profile, dashboard, one report per month.
- **Premium (about ₹99–199 per month):** card matcher, tax planner, unlimited what-if simulations, history beyond 6 months.
- **Later:** affiliate partnerships (disclosed clearly; must never bias recommendations).

## 12. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Users distrust sharing financial data | No credentials collected, clear privacy page, local-first option, data deletion |
| Manual entry causes drop-off | Short intake, sensible defaults, CSV import, later Account Aggregator |
| LLM gives wrong or risky advice | Deterministic calculations, schema constraints, guardrails, human review of sample reports |
| Regulatory exposure (SEBI) | Education-only framing, legal review, RIA path if needed |
| Stale card and fund data | Versioned reward database with a quarterly update process |
| Affiliate conflicts of interest | Separate recommendation engine from monetization |

## 13. Milestones

| Phase | Scope | Duration |
| --- | --- | --- |
| 0. Discovery | 10–15 user interviews, competitor scan, legal consult | 2 weeks |
| 1. MVP build | Intake, analyzers, report, dashboard, history | 6 weeks |
| 2. Closed beta | 50–100 users, iterate on report quality | 4 weeks |
| 3. P1 features | Card matcher, SIP vs lump sum, leak detector, tax planner | 6 weeks |
| 4. Public launch | Pricing, onboarding polish, marketing | 2 weeks |

## 14. Open Questions

1. Manual entry only at launch, or ship statement upload early?
2. Which card issuers and fund categories does the rewards database cover first?
3. How far can recommendations go before SEBI registration is needed?
4. Mobile web first, or a native app?
5. Do we default tax comparison to the new regime, given it is now the default?

## 15. Out-of-Scope Reminder

No money movement, no trading, no credit scoring, and no sharing of user data with third parties.
