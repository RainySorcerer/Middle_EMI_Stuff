# HANDOFF — PaisaPilot

_Last updated: 29 October 2026._

This is the resume point for the current PaisaPilot build. Read this first, then `README.md`. The older PRD and design notes in `docs/` describe the original prototype; the app has since been rebuilt as a real, account-based product.

## What the app is now

A focused full-stack personal-finance app for India:

1. Create an account with email and password, using a single-use invite code.
2. Complete a four-step questionnaire.
3. Upload a bank/UPI CSV, or a PDF statement (Gemini reads it), add transactions manually, or load sample data.
4. Get a dashboard, a 100-point health score, and ranked insights computed from those records.
5. Optionally generate a written report through Gemini/Claude/OpenAI; otherwise a local rules analyst writes it.

The old demo routes (`/report`, `/leaks`, `/cards`, `/tools`, `/history`, `/profile`) and their components were removed.

## Environment notes

- Node **24.22.1** is installed locally at `~/.local/opt/node`. Prefix commands with:
  ```bash
  export PATH="$HOME/.local/opt/node/bin:$PATH"
  ```
- SQLite is Node's built-in `node:sqlite`; there is no database server.
- Database: `data/paisapilot.db` (gitignored). Schema and migrations live in `lib/db.ts`.
- Playwright is outside the repo at `/tmp/pw`. `/tmp` is volatile; reinstall if it is gone.
- **Never run `next dev` and `next start` against the same `.next`.** Use `NEXT_DIST_DIR` for a parallel build, or stop one server first. A previous round of 500s came from this.

## Current status

Production build passes and the full flow works against `next start`:

- signup and login
- all questionnaire steps and per-step persistence
- CSV import (3 test rows), manual entry, sample data
- dashboard, activity, report generation/regeneration
- card add, JSON export, clear data, delete account paths
- mobile layout at 390 px with no horizontal overflow
- logout/login round-trip
- no browser console errors

Accessibility: axe-core reports **0 WCAG 2.1 A/AA violations** on `/`, `/login`, `/signup`, `/dashboard`, `/activity`, `/insights` and `/settings` at 390 px.

Verification commands:

```bash
export PATH="$HOME/.local/opt/node/bin:$PATH"
npm run typecheck
npm run build
npm run start

cd /tmp/pw
BASE=http://localhost:3000 OUT=/tmp/shots/revamp node revamp-flow.js
BASE=http://localhost:3000 EMAIL=<test-email> PASSWORD=<password> node axe-revamp.js
BASE=http://localhost:3000 node axe-revamp.js
```

The latest full run used a fresh email and passed every check. The axe scripts are dated to the rebuilt routes; the older `/tmp/pw/axe.js` still points at removed demo pages.

After verification, the Playwright test accounts were removed from `data/paisapilot.db`, so the local app starts clean. Create a new account, or load sample data from the onboarding records step.

### Production verification pass (29 Oct, 00:50)

Run against `next start` with `NEXT_DIST_DIR=.next-prod` on :3100 while a dev server used `.next`:

- Full flow 17/17 (`/tmp/pw/revamp-flow.js`): landing, signup, all onboarding steps, CSV import, manual entry, sample data, dashboard, activity, report generation, add card, export, mobile, logout/login, regenerate.
- Edge cases 14/14 (`/tmp/pw/edge.js`): duplicate email, wrong password, empty dashboard before records, re-uploading the same CSV (rows stay at 3), category filter, 360 px overflow on four routes, delete account, deleted account cannot sign in.
- axe-core 0 WCAG 2.1 A/AA violations on `/`, `/login`, `/signup`, `/onboarding`, `/dashboard`, `/activity`, `/insights`, `/insights?fresh=1`, `/settings` (`/tmp/pw/axe-new.js`).

Two narrative bugs were fixed in that pass:

1. `lib/analytics.ts` and `lib/ai.ts` formatted paise with the rupee formatter, so every written amount was 100× too large ("needs ₹20,83,334 a month" for a ₹5L goal). They now use `inrP()`.
2. The emergency-fund insight hard-coded "about six months"; it now computes `ceil(shortfall / monthly)`.

`docs/automation-areas.md` was rewritten against this build: card optimisation and EMI affordability are partial, investment analysis and tax are not built, leak detection and the monthly report are complete.

### Invite-only beta cut (29 Oct, 13:30)

Signup is now gated by single-use invite codes; `BETA_INVITE_ONLY` defaults to on.

- `lib/invite-code.mjs` — plain-JS code format/normalisation/hash shared by the app and the CLI. Codes look like `PP-XXXX-XXXX-XXXX`; only a SHA-256 hash and the last four characters are stored.
- `lib/invites.ts` — create, check, redeem, list, revoke. Redemption is a conditional `UPDATE` inside the signup transaction, so a code's final use cannot be claimed twice.
- `lib/db.ts` — creates the `invites` table on startup.
- `app/actions/auth.ts` — validates the invite before writing, wraps user + profile + invite claim in `BEGIN IMMEDIATE`, and throttles signup per email and globally.
- `scripts/invite.mjs` — `npm run invite -- create|list|validate|revoke|stats`.
- `scripts/backup.mjs` — consistent SQLite backup via `VACUUM INTO`, retention via `BACKUP_KEEP`.
- `app/api/health/route.ts` — liveness probe for hosting.
- `Dockerfile`, `.dockerignore` — single-process image with a `/data` volume.
- `docs/deployment.md` — VPS/systemd/Caddy, Docker, managed platforms, backups, restore, upgrades.
- `docs/known-bugs.md` — the current honest bug list.

Verified in this pass: typecheck, production build, invite hash parity between CLI and app, single-use redemption (second attempt returns 0 changes), email binding, `/signup` renders the invite field, `/api/health` returns 200.

Still not in the repo: the Playwright/axe suites. See `docs/known-bugs.md`.

### PDF statements + Gemini (29 Oct, 17:00)

PDF import was added on top of the beta cut. It is the only feature that sends
user data to a third party, and it is opt-in twice: the server needs
`GEMINI_API_KEY`, and the user must tick the AI notice on every upload.

- `lib/gemini.ts` — minimal `generateContent` REST client (`x-goog-api-key`,
  JSON response mode, timeout, friendly error mapping). Used by PDF import and
  by narration. `GEMINI_API_BASE` exists only so tests can point at a local stub.
- `lib/pdf.ts` — opens the PDF with `pdfjs-dist`, detects encryption, retries
  with the supplied password, and either sends the file as `inlineData` (plain
  or scanned PDF) or a page-by-page layout text with `[x]token` prefixes
  (decrypted PDF, because Gemini cannot open encrypted files). Limits: 8 MB,
  24 pages, 2,000 rows, 90k layout characters.
- Rows go through `parseDate`/`parseAmount`/`dedupeKey` from `lib/csv.ts`, so PDF
  and CSV imports share normalisation and duplicate detection. `importRows` now
  takes a `source` (`csv` | `pdf`) and activity shows `· pdf`.
- `app/actions/data.ts` — `importCsvAction` became `importStatementAction`.
  PDF path checks key, consent, size, then rate-limits 10 PDFs/user/hour;
  each `PdfError` code maps to a specific user-facing message.
- `components/app/upload-form.tsx` — accepts `.pdf`, reveals a password field
  and a required consent checkbox only for PDFs.
- `next.config.mjs` — `serverExternalPackages: ["pdfjs-dist"]` and a 12 MB
  server-action body limit.
- `lib/ai.ts` — provider order is now Gemini → Claude → OpenAI, then the local
  analyst. Only narration facts are sent, never statements.

Verified with a mock Gemini server and a locally generated PDF plus an RC4
password-protected copy: plain PDF imports 3 valid rows and skips malformed and
duplicate ones, re-upload inserts 0, missing password → prompt, wrong password
→ distinct error, correct password → decrypted text mode, fake PDF → unreadable,
missing consent → blocked, CSV still imports 20 rows, `source` stored as `pdf`,
and the API key header is sent. **Not yet tested against the real Google API**
(no key in this environment).

Two pdf.js gotchas worth remembering:

1. `getDocument` transfers/detaches the input buffer to its worker. Always pass
   `new Uint8Array(bytes)` per attempt, or a second attempt throws
   `DataCloneError` (code 25) instead of a password error.
2. `isEvalSupported` is not in the `DocumentInitParameters` type for this
   version; it was removed from the call. The standard-fonts warning is harmless
   and silenced by `standardFontDataUrl`.


## Key implementation decisions

- **Auth is real.** Passwords use salted scrypt. Session tokens are random 32-byte values; only their SHA-256 hashes are stored. Cookie is httpOnly, SameSite=Lax, secure in production, 30-day expiry.
- **Money is integer paise everywhere.** Use `inrP()` from `lib/money.ts` for display. `inr()` in `lib/finance.ts` expects rupees and must not receive paise.
- **Analysis is deterministic.** `lib/analytics.ts` builds facts, score, categories, recurring charges, goal feasibility and ranked insights. AI only narrates; it does not calculate.
- **Scoring:** Savings 30, Card use 20, Emergency 20, Debt 20, Recurring 10. Recurring load counts only flexible categories (`Food & dining`, `Shopping`, `Entertainment`, `Health`, `Education`, `Other`). Rent, utilities, insurance, groceries and EMIs are excluded.
- **Insight ranking** is by estimated monthly impact. Goal gap uses `impactPaise: 0` so it does not outrank cash-saving moves; the gap is still shown in the label/detail.
- **Income** uses the profile value when present, otherwise transaction credits. **Spending** uses a three-month transaction average when available, otherwise the profile value.
- **CSV import** handles common Indian headers/date formats, debit/credit or signed amounts, delimiters, and per-user dedupe hashes.
- **Sample data** is seeded only on explicit action and removed by a separate action; it is never mixed silently into real records.
- **AI is optional.** No key means `PaisaPilot rules` copy. Report generation sends aggregated facts, not raw statements.

## Product layout

| Route | File |
| --- | --- |
| Landing | `app/page.tsx` |
| Login/signup | `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx` |
| Onboarding | `app/onboarding/page.tsx`, `components/app/onboarding-wizard.tsx` |
| Dashboard | `app/(app)/dashboard/page.tsx` |
| Records | `app/(app)/activity/page.tsx` |
| Insights | `app/(app)/insights/page.tsx` |
| Settings | `app/(app)/settings/page.tsx` |
| Export | `app/api/export/route.ts` |

Core libs: `lib/auth.ts`, `lib/db.ts`, `lib/store.ts`, `lib/analytics.ts`, `lib/csv.ts`, `lib/pdf.ts`, `lib/gemini.ts`, `lib/categorize.ts`, `lib/ai.ts`, `lib/money.ts`, `lib/finance.ts`.

## Verification fixtures

The sample dataset produces roughly:

- income ₹95,000; spending ₹73,683; surplus ₹16,412; savings rate 17%
- score 73 before adding another card; 74 after adding a test card because utilisation drops
- recurring payments ₹28,136/month, of which subscriptions/memberships are ₹1,158/month
- goal ₹5,00,000 in 24 months needs ₹20,833/month, leaving a ₹4,421/month gap
- 203 transactions across 7 months

If you change the sample seeder (`lib/store.ts`), update these expectations and the README.

## Known limitations / next work

The maintained list lives in [`docs/known-bugs.md`](docs/known-bugs.md). Highlights:

1. **Tests are external.** There is no checked-in test runner. Next priority: unit tests for `lib/csv.ts`, `lib/analytics.ts` scoring/ranking, `lib/invites.ts`, and `lib/finance.ts` maths, then move the Playwright flow into the repo.
2. **SQLite is single-instance.** Fine for one Node process with a persistent volume. For horizontal scaling, migrate to Postgres and keep the query layer isolated in `lib/store.ts`.
3. **No bank sync.** CSV, PDF and manual entry only. Account Aggregator or bank integrations are intentionally out of scope for this pass.
4. **AI keys are optional and unverified in this environment.** The fallback path is tested; Gemini PDF extraction was only tested against a local stub. Try one real statement before inviting users.
5. **No email verification or password reset.** Add both before a public launch, plus email delivery and token expiry.
6. **No rate-limit backing store.** Auth and PDF actions have local in-process limiting; use Redis or a shared store if running multiple instances.
7. **CSV and PDF coverage is heuristic.** Add fixtures from real HDFC/ICICI/SBI/Axis/UPI exports and grow `lib/csv.ts` from failures; keep a few real PDFs for prompt regression.
8. **No dark mode**, and the interface is English-only.
9. **Invites are CLI-only and shown once.** No admin UI, no email delivery; revoke and reissue a lost code.

## Suggested next steps

1. Add `node:test` (or Vitest) and cover the CSV parser, PDF row validation, scoring, ranking, goal gap and money formatting.
2. Add password reset and email verification.
3. Move the Playwright flow into `tests/e2e` and run it in CI against `npm run build && npm run start`.
4. Add real bank CSV and PDF fixtures and a parser failure report in the UI.
5. Try PDF import with a real `GEMINI_API_KEY` on three bank formats (HDFC, ICICI, a UPI app) and tune the prompt before inviting users.
6. Before public deployment: HTTPS, persistent volume for `data/`, backup/restore procedure for SQLite, and a shared rate-limit store if scaling beyond one instance.

## Cleanup notes

- Old demo files were deleted; do not resurrect `lib/data.ts` or the old route groups.
- `.next-*/` build directories and `data/` are gitignored.
- `next.config.mjs` keeps security headers and a 12 MB server-action body limit (8 MB PDFs plus multipart overhead).
- The landing page and insights report use dark green panels. Global `h1–h4` colors default to dark ink, so any heading on a dark panel needs an explicit light text class.
