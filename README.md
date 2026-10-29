# PaisaPilot

PaisaPilot turns a bank or UPI export into a calm, honest view of your month. Create an account, answer a short questionnaire, add your records, and get a health score with **ranked next moves in rupees** — not generic budgeting tips.

Built for India: INR formatting, Indian bank CSV layouts, UPI-style merchant names, cards, loans and EMIs.

> Educational analysis, not financial advice. PaisaPilot never asks for bank credentials and never moves money.

**Status: invite-only beta.** Signup requires a single-use invite code. Codes are issued from the host with `npm run invite -- create`; see [Invite-only beta](#invite-only-beta).

## What is in the app

- **Accounts and sessions** — email/password signup gated by invite code, scrypt password hashing, database-backed sessions in an httpOnly cookie, sign-out and account deletion.
- **Four-step onboarding** — about you, income and spending, one goal, then records. Answers are saved as you go, so a refresh does not lose progress.
- **Three ways to add records** — upload a bank/UPI CSV, add a transaction manually, or load clearly labelled sample data to explore the app.
- **Dashboard** — financial score, money in and out, three-month average surplus, spending mix, recent activity, tracked cards/loans and goal progress.
- **Insights** — a generated written report, score breakdown, ranked moves, recurring-payment audit, goal feasibility and top merchants.
- **Settings** — edit profile and goal, add/remove cards and loans, export all data as JSON, clear transactions, remove sample data, or delete the account.

## Stack

- Next.js 15 (App Router, React 19, Server Actions)
- TypeScript and Tailwind CSS 3.4
- SQLite through Node's built-in `node:sqlite` — no database service to run
- `node:crypto` scrypt for passwords and SHA-256 for session tokens
- Optional Claude or OpenAI narration; a deterministic local analyst is the fallback

## Run locally

Requires **Node 24+** (the repo pins 24 in `.nvmrc`). Node's built-in SQLite is used directly.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, create an account, and complete onboarding.

Signup is invite-only by default. Issue yourself a code first:

```bash
npm run invite -- create --email you@example.com --label "Local" --days 7
```

To allow open signup on a local machine only, run with `BETA_INVITE_ONLY=false npm run dev`.

On this machine Node is installed locally:

```bash
export PATH="$HOME/.local/opt/node/bin:$PATH"
npm run dev
```

The database is created automatically at `data/paisapilot.db`. Copy `.env.example` to `.env` only if you want a custom database path or AI narration.

```bash
npm run typecheck   # tsc --noEmit
npm run build       # production build
npm run start       # serve the build on :3000
```

Do not run `next dev` and `next start` against the same `.next` directory at the same time. For a parallel production build, set `NEXT_DIST_DIR=.next-prod`.

## Invite-only beta

`BETA_INVITE_ONLY` defaults to on. While it is on, `/signup` requires a code and
`signupAction` refuses accounts without a valid, unused, unexpired invite.

```bash
npm run invite -- create --email friend@example.com --label "Riya" --days 30
npm run invite -- create --label "Batch of 10" --uses 10 --days 14
npm run invite -- list
npm run invite -- validate PP-XXXX-XXXX-XXXX --email friend@example.com
npm run invite -- revoke PP-XXXX-XXXX-XXXX
npm run invite -- stats
```

- Codes look like `PP-XXXX-XXXX-XXXX`, are case-insensitive and are shown once.
- Only a SHA-256 hash and the last four characters are stored.
- Redemption runs inside the signup transaction, so a code's final use cannot be
  claimed twice by concurrent requests.
- `--days 0` never expires; `--uses` is capped at 100.
- Invites are not emailed by the app and there is no admin UI. Send the code
  yourself and keep shell access to the host.

Full hosting, backup and upgrade instructions: [`docs/deployment.md`](docs/deployment.md).

## Routes

| Route | What it does |
| --- | --- |
| `/` | Public landing page; signed-in visitors get a link into the app. |
| `/signup`, `/login` | Account creation and sign-in. |
| `/onboarding` | Four-step questionnaire and first records import. |
| `/dashboard` | This month at a glance, score and next moves. |
| `/activity` | Full transaction list, filters, CSV upload and manual entry. |
| `/insights` | Generated report, score details, recurring audit and goal check. |
| `/settings` | Profile, accounts, export, clear data and delete account. |
| `/api/export` | Authenticated JSON export of profile, accounts and transactions. |
| `/api/health` | Unauthenticated liveness probe: database reachable, no user data. |

## How the analysis works

Everything is computed from the user's own rows. The UI never invents a number.

- Money is stored as **integer paise** in SQLite and formatted with Indian digit grouping.
- **Income** comes from the profile when provided, otherwise from the average of recent credits.
- **Spending** is the average of up to the last three months of debits, which smooths one-off purchases.
- **Categories** and **recurring charges** are derived from transaction descriptions with local rules; a charge counts as recurring when the same merchant appears in at least two months with a similar amount.
- **Cards** use outstanding balance and total credit limit. **Loans** use EMI, outstanding balance and interest rate.
- **Emergency cover** is emergency savings divided by monthly spending.
- **Goal feasibility** compares the monthly amount needed with the current surplus.
- The **100-point score** is Savings 30, Card use 20, Emergency fund 20, Debt load 20 and Recurring load 10. Only optional repeating payments — subscriptions and memberships — count against the last 10 points; rent, utilities, insurance, groceries and EMIs do not.
- **Ranked moves** are sorted by estimated monthly rupee impact. A goal gap is shown as context, not counted as cash already available.

### AI narration

Without an API key, the app uses a local rules analyst (`PaisaPilot rules`) and labels it as such. Add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to generate a written summary through the selected provider. The model receives the computed facts, not raw bank data, and the deterministic numbers remain the source of truth. If the request fails, the report falls back to the local analyst.

### CSV import

The parser accepts common Indian bank export shapes:

- comma, semicolon or tab delimiters
- date headers such as `Date`, `Txn Date`, `Value Date`
- `dd/mm/yyyy`, `dd-mm-yyyy`, ISO dates and named-month dates
- separate debit/credit columns, or a signed/withdrawal-deposit amount
- description aliases such as `Narration`, `Particulars`, `Remarks`
- duplicate detection per user, so re-uploading the same statement does not double-count rows

Files are limited to 2 MB. Unreadable and duplicate rows are reported rather than silently dropped.

## Privacy and data

- All data lives in the SQLite file configured by `DATABASE_PATH` (default `data/paisapilot.db`).
- Passwords are salted and hashed with scrypt; raw session tokens are never stored.
- Sessions expire after 30 days and are cleared on sign-out.
- There are no analytics scripts, ad trackers or bank connections.
- AI narration sends only aggregated facts. Leave the AI keys unset to keep all processing local.
- Deleting an account removes its profile, accounts, sessions, transactions and reports through foreign-key cascades.

## Project layout

```text
app/
  (app)/            dashboard, activity, insights, settings
  (auth)/           login and signup
  actions/          auth, profile, data and report server actions
  onboarding/       questionnaire entry point
  api/export/       authenticated JSON export
  api/health/       liveness probe
components/
  app/              app shell, onboarding wizard, forms, insight cards
  auth/             auth forms
  ui/               shared primitives
lib/
  analytics.ts      facts, score, ranked insights
  csv.ts            CSV parsing and normalisation
  categorize.ts     merchant/category rules
  store.ts          database queries and mutations
  db.ts             schema and migration
  auth.ts           passwords, sessions, route guards
  invites.ts        invite validation and redemption
  invite-code.mjs   code format/hash shared with the CLI
  ai.ts             optional Claude/OpenAI narration
  finance.ts        INR, EMI and other money maths
scripts/
  invite.mjs        create, list, validate and revoke beta invites
  backup.mjs        consistent SQLite backup via VACUUM INTO
docs/               PRD, design system, deployment, known bugs
Dockerfile          single-process image with a /data volume
```

## Verification

Current checks, run against a production build:

- `npm run typecheck` — clean.
- `npm run build` — all routes compiled.
- Invite gate — invalid, expired, revoked, used and email-mismatched codes are rejected; the CLI and the app hash codes identically; a code's final use cannot be redeemed twice.
- Playwright end-to-end flow — signup with invite, all onboarding steps, CSV import, manual entry, sample data, dashboard, report generation, account add, export, mobile layout at 390 px, logout/login and report regeneration.
- axe-core WCAG 2.1 A/AA — 0 violations on landing, login, signup, dashboard, activity, insights and settings at 390 px.
- `GET /api/health` returns 200 against a production server.
- No console errors and no horizontal overflow in the tested flow.

The Playwright and axe scripts live outside the repo in `/tmp/pw` (not versioned). They can be run with `BASE=http://localhost:3000`. This is a known gap — see [`docs/known-bugs.md`](docs/known-bugs.md).

## Deploying

The backend is the app: one Node 24 process and one SQLite file. No database
server, queue, cache or object storage.

1. Build with `npm run build`.
2. Run `npm run start` behind HTTPS (session cookies are `secure` in production).
3. Mount a persistent volume for `data/`, or set `DATABASE_PATH` to a persistent path.
4. Set `TZ=Asia/Kolkata` so month boundaries match users.
5. Set `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` only if you want AI narration.
6. Run **one** app instance per database.

Full step-by-step guide — VPS with systemd + Caddy, Docker, managed platforms,
backups, restore, upgrades and the security checklist:
[`docs/deployment.md`](docs/deployment.md).

There is no background worker, file storage or external queue. Uploaded files are parsed in memory.

## Limitations

The full, current list is in [`docs/known-bugs.md`](docs/known-bugs.md). The ones
that matter most for the beta:

- No password reset or email verification — a forgotten password locks the account.
- No bank sync, Account Aggregator or credential-based login. Imports are CSV or manual.
- SQLite is single-instance; no horizontal scaling until the data layer moves.
- Activity and export cap at 5,000 transactions with no pagination.
- Invite administration is CLI-only; the app does not send email.
- No investment, tax or credit-score advice; calculations are educational estimates.
- INR only, English only, no dark mode.
- The app is not a substitute for a qualified financial adviser.
