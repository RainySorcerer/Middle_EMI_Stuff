# PaisaPilot

PaisaPilot turns a bank or UPI export into a calm, honest view of your month. Create an account, answer a short questionnaire, add your records, and get a health score with **ranked next moves in rupees** — not generic budgeting tips.

Built for India: INR formatting, Indian bank CSV layouts, UPI-style merchant names, cards, loans and EMIs.

> Educational analysis, not financial advice. PaisaPilot never asks for bank credentials and never moves money.

**Status: invite-only beta.** Signup requires a single-use invite code. Codes are issued from the host with `npm run invite -- create`; see [Invite-only beta](#invite-only-beta).

## What is in the app

- **Accounts and sessions** — email/password signup gated by invite code, scrypt password hashing, database-backed sessions in an httpOnly cookie, sign-out and account deletion.
- **Four-step onboarding** — about you, income and spending, one goal, then records. Answers are saved as you go, so a refresh does not lose progress.
- **Three ways to add records** — upload a bank/UPI **CSV or PDF** statement, add a transaction manually, or load clearly labelled sample data to explore the app.
- **Dashboard** — financial score, money in and out, three-month average surplus, spending mix, recent activity, tracked cards/loans and goal progress.
- **Insights** — a generated written report, score breakdown, ranked moves, recurring-payment audit, goal feasibility and top merchants.
- **Settings** — edit profile and goal, add/remove cards and loans, export all data as JSON, clear transactions, remove sample data, or delete the account.

## Stack

- Next.js 15 (App Router, React 19, Server Actions)
- TypeScript and Tailwind CSS 3.4
- SQLite through Node's built-in `node:sqlite` — no database service to run
- `node:crypto` scrypt for passwords and SHA-256 for session tokens
- `pdfjs-dist` to open and decrypt statement PDFs on the server
- Optional Gemini for PDF extraction and narration; Claude and OpenAI for narration
- A deterministic local analyst is the fallback when no AI key is set

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

The database is created automatically at `data/paisapilot.db`. Copy `.env.example` to `.env` only if you want a custom database path, AI narration or PDF import.

```bash
npm run typecheck   # tsc --noEmit
npm run build       # production build
npm run start       # serve the build on :3000
```

Do not run `next dev` and `next start` against the same `.next` directory at the same time. For a parallel production build, set `NEXT_DIST_DIR=.next-prod`.

### Adding your Gemini key locally

PDF import (and optional Gemini narration) needs a Google AI Studio key:

1. Open <https://aistudio.google.com/apikey>, sign in with a Google account, and
   choose **Create API key**. Copy the key — it looks like `AIza…`.
2. Create the local env file and add the key:

   ```bash
   cp .env.example .env
   printf '\nGEMINI_API_KEY=AIza-your-key-here\nGEMINI_MODEL=gemini-2.5-flash\n' >> .env
   ```

3. Restart `npm run dev` (or `npm run start`). Env changes are not hot-reloaded.
4. Upload a statement at `/activity` → **Upload** and tick the AI consent box.
   If the key is missing, wrong or has no quota, the upload returns a readable
   error and CSV import still works.

Notes:

- `.env` is gitignored. The key is read only by `lib/gemini.ts` on the server and
  never reaches the browser bundle.
- `GEMINI_MODEL` is optional; `gemini-2.5-flash` is the default and is the
  cheapest model that accepts PDFs.
- To disable PDF import deliberately, leave `GEMINI_API_KEY` empty.
- For hosting, set the same variables on the host instead of in a file — see
  [`docs/deployment.md`](docs/deployment.md#gemini-and-pdf-import).

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
| `/activity` | Full transaction list, filters, CSV/PDF upload and manual entry. |
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

Without an API key, the app uses a local rules analyst (`PaisaPilot rules`) and labels it as such. Add `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to generate a written summary through the first configured provider (Gemini, then Claude, then OpenAI). The model receives the computed facts, not raw bank data, and the deterministic numbers remain the source of truth. If the request fails, the report falls back to the local analyst.

### CSV import

The parser accepts common Indian bank export shapes:

- comma, semicolon or tab delimiters
- date headers such as `Date`, `Txn Date`, `Value Date`
- `dd/mm/yyyy`, `dd-mm-yyyy`, ISO dates and named-month dates
- separate debit/credit columns, or a signed/withdrawal-deposit amount
- description aliases such as `Narration`, `Particulars`, `Remarks`
- duplicate detection per user, so re-uploading the same statement does not double-count rows

Files are limited to 2 MB. Unreadable and duplicate rows are reported rather than silently dropped.

### PDF statements

PDF import requires `GEMINI_API_KEY`. Upload a bank, card or UPI statement and Gemini returns the transactions; the rows are then validated locally (real dates, positive amounts, debit/credit) and deduplicated by the same hash as CSV, so importing the same period twice does not double-count.

- **Password-protected PDFs:** enter the PDF password in the upload form. `pdfjs-dist` decrypts the file on the server, and only the extracted layout text is sent to Gemini. The password is used once and never stored.
- **Plain PDFs and scans:** the file itself is sent to Gemini, which also reads image-only statements.
- **Limits:** 8 MB per file, 24 pages read per import, 2,000 transactions per PDF, 10 PDF imports per user per hour.
- **Consent:** the upload form refuses a PDF unless the "sent to Google Gemini" notice is ticked. Use CSV if the statement must stay on the server.
- **Accuracy:** extraction is model-assisted. Lines the model cannot read are skipped and reported in the import message; totals are not reconciled against the statement. Check the first import against your statement before relying on the score.

The PDF is parsed in memory and is not written to disk.

## Privacy and data

- All data lives in the SQLite file configured by `DATABASE_PATH` (default `data/paisapilot.db`).
- Passwords and PDF passwords are never stored; statement PDFs are parsed in memory.
- Passwords are salted and hashed with scrypt; raw session tokens are never stored.
- Sessions expire after 30 days and are cleared on sign-out.
- There are no analytics scripts, ad trackers or bank connections.
- AI narration sends only aggregated facts.
- PDF import sends the statement (or its decrypted text) to Google Gemini after an explicit consent tick. Leave `GEMINI_API_KEY` unset to disable PDF import entirely and keep all processing on your server.
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
  pdf.ts            PDF open, decryption and Gemini transaction extraction
  gemini.ts         minimal Gemini REST client
  ai.ts             optional Gemini/Claude/OpenAI narration
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
- PDF import — a plain PDF is sent to Gemini as a file, a password-protected PDF is decrypted locally and sent as layout text, wrong and missing passwords are rejected with distinct messages, a fake PDF is rejected, and re-uploading the same statement inserts nothing.
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
5. Set `GEMINI_API_KEY` to enable PDF import and Gemini narration.
6. Set `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` only if you want those narrators.
7. Run **one** app instance per database.

Full step-by-step guide — VPS with systemd + Caddy, Docker, managed platforms,
backups, restore, upgrades and the security checklist:
[`docs/deployment.md`](docs/deployment.md).

There is no background worker, file storage or external queue. Uploaded files are parsed in memory.

## Limitations

The full, current list is in [`docs/known-bugs.md`](docs/known-bugs.md). The ones
that matter most for the beta:

- No password reset or email verification — a forgotten password locks the account.
- No bank sync, Account Aggregator or credential-based login. Imports are CSV, PDF or manual.
- PDF import needs a Gemini key, sends the statement to Google, and is capped at 8 MB / 24 pages / 2,000 rows. Extraction is model-assisted and can skip faint lines.
- SQLite is single-instance; no horizontal scaling until the data layer moves.
- Activity and export cap at 5,000 transactions with no pagination.
- Invite administration is CLI-only; the app does not send email.
- No investment, tax or credit-score advice; calculations are educational estimates.
- INR only, English only, no dark mode.
- The app is not a substitute for a qualified financial adviser.
