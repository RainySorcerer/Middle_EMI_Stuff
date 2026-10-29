# What PaisaPilot automates

_Source: product brief "What Gets Automated (6 Core Areas)". Mapped to the current full-stack build
on 29 Oct 2026._

PaisaPilot is an analyst, not a robo-advisor. It never moves money, cancels a subscription or applies
for a loan. It does the monthly analysis, shows the rupee impact, and leaves execution to you.

The app has changed shape since the first prototype: records now come from a real CSV import, answers
are stored per account, and every report is computed from the user's own rows. Coverage of the six
areas is therefore uneven and stated honestly below.

## Coverage today

| # | Automation | Status | Where it lives | What the build actually does |
| --- | --- | --- | --- | --- |
| 1 | Credit card optimization | **Partial** | `/settings`, `/dashboard`, `/insights` | Tracks limits and outstanding balances, shows utilisation per card and overall, and raises a "pay X before the due date" move when usage is above 30%. No rewards/fee matcher yet. |
| 2 | Expense leak detection | **Built** | `/insights`, `/activity` | Categorises every imported row, finds charges that repeat in two or more months at a similar amount, and lists them with the monthly and annual cost. A ranked move surfaces the ones worth reviewing. |
| 3 | Investment analysis | **Not built** | — | `Investment` accounts can be recorded, but there is no SIP/XIRR valuation or allocation analysis. |
| 4 | EMI affordability | **Partial** | `/insights`, `/settings` | Computes total EMI as a share of income, applies the 40% lender guardrail, and names the weighted cost of debt. There is no "can I take ₹X?" simulator or safe-borrowing cap. |
| 5 | Tax deduction tracking | **Not built** | — | No 80C/80D headroom or old-vs-new regime view. |
| 6 | Monthly financial report | **Built** | `/insights` | Generates a written summary, a 100-point score with a five-part breakdown, ranked moves in rupees, spending mix, top merchants, recurring audit and goal feasibility. Regenerates on demand; falls back to the local rules analyst when no AI key is set. |

### What "built" means here

- **Deterministic maths, language only for explanation.** Every amount is computed in
  `lib/analytics.ts` from rows in SQLite; the optional AI narration receives the computed facts, not
  raw transactions, and is instructed never to invent a number.
- **Money is integer paise end to end.** `lib/money.ts` is the single formatter; narratives, cards and
  tables all go through it.
- **No execution.** The app can export or delete data, but nothing is sent to an issuer, merchant or
  lender, and there is no trading or application flow.
- **One action list.** The dashboard shows the top four moves; `/insights` shows the full ranked set.

## Worked example (sample records)

With the built-in sample data — ₹95,000 income, 203 records over seven months — the app produces:

1. **Cards** — ₹1,59,800 used of ₹4,70,000 (34%). The move: pay ₹18,800 before the due date to get
   under the 30% mark lenders prefer.
2. **Leaks** — 3 repeating charges cost ₹1,158/month. The audit lists each merchant with its monthly
   and annual cost and the months it was seen in.
3. **Investments** — not tracked. This is the largest honest gap against the brief.
4. **EMI** — ₹14,000/month, 15% of income, inside the 40% guardrail. No new-loan cap is offered.
5. **Tax** — not tracked.
6. **Report** — score 73/100 (Savings 17/30, Card use 18/20, Emergency 8/20, Debt 20/20, Recurring
   10/10), 3-month average surplus ₹16,412, emergency cover 2.3 months, goal ₹5,00,000 in 24 months →
   ₹20,833/month needed, ₹4,421/month short.

## Design rules this implies

- Show the rupee figure next to every warning; never a vague "you're spending too much".
- Prefer the user's own baseline to an arbitrary benchmark: "above your 3-month average" beats "above
  the average Indian".
- Recurring does not mean unused. The audit says so explicitly, because the app cannot see what the
  user actually watches or uses.
- Never present a partial feature as complete. Where the build lacks tax or investment analysis, the
  UI should not hint that it has it.

## Still to automate (P2)

- SIP and portfolio tracking, XIRR, and an allocation view.
- Tax planner with 80C/80D headroom and regime comparison.
- Loan affordability simulator with a safe-borrowing cap.
- Rewards-aware card routing by category.
- Account Aggregator import, statement PDF parsing, family accounts.
- WhatsApp nudges and vernacular copy.

## Appendix A — source brief (verbatim)

### What Gets Automated (6 Core Areas)

1. **Credit Card Optimization (saves ₹195/month = ₹2,340/year)**
   - Manual: check 3 card websites, categorize spending, calculate the best card for each
     category (1.5 hrs).
   - Automated: the system analyzes cards + spending → recommends "use Card A for groceries,
     Card B for fuel" → shows exact savings.
2. **Expense Leak Detection (saves ₹2,100/month)**
   - Manual: scroll through 100 bank transactions, categorize, track subscriptions (3 hrs).
   - Automated: upload bank CSV → AI categorizes in seconds → alerts "you're paying for 4
     streaming services but use 2; cancel for ₹600/month".
3. **Investment Analysis (saves ₹10,800/year in taxes)**
   - Manual: log into 3+ MF platforms, track SIP values, calculate "am I on track?" (2.5 hrs).
   - Automated: tracks all investments → "you're on track, but shift ₹5k from PPF to ELSS for tax
     benefits".
4. **EMI Affordability (prevents costly mistakes)**
   - Manual: calculator, spreadsheet, rule of thumb (1.5 hrs of worry).
   - Automated: "Can I take a ₹30L loan?" → "No — too risky. Better: take ₹20L instead."
5. **Tax Deduction Tracking (₹1.3L/year tax savings)**
   - Manual: track 80C (₹1.5L limit), 80D, 80E throughout the year, panic in December (4+ hrs).
   - Automated: tracks monthly → October: "you've used ₹1.44L of ₹1.5L — don't invest more in 80C".
6. **Monthly Financial Report (2 hours saved)**
   - Manual: gather data from 5 apps, type into Excel, analyze trends.
   - Automated: generates a 5-minute summary → "savings rate 28%, emergency fund on track, dining
     out up 8%".

**Key point:** this is not a robo-advisor that moves money. It is an intelligent analyst that tells
you what to do. You still make the final decisions and execute transactions. PaisaPilot provides the
reasoning and shows optimizations that would take about 14 hours a month to find manually.

## Appendix B — how the build maps to the brief's scenarios

| Brief scenario | Current answer |
| --- | --- |
| "Use Card A for groceries, Card B for fuel" | Not yet. The app tracks utilisation and debt load, not reward rates. |
| "You pay for 4 streaming services but use 2" | The app finds repeats and their cost, but cannot know usage. Copy says "recurring does not mean unused". |
| "Shift ₹5k from PPF to ELSS" | Not yet. No investment or tax module. |
| "Can I take a ₹30L loan?" | Partly: the EMI ratio and 40% guardrail are shown, but there is no simulator. |
| "You've used ₹1.44L of the ₹1.5L 80C limit" | Not yet. |
| "Savings rate 28%, emergency fund on track" | Yes: savings rate, score, emergency cover and ranked moves appear in every report. |
