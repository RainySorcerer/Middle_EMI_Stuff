# Known bugs and limitations

_Last reviewed: 29 October 2026, alongside the invite-only beta cut._

This is the honest list. Nothing here is hidden from users in the UI unless the
row says so. Severity is about impact on a beta user, not on a public launch.

## Open — should fix before widening the beta

| # | Severity | Area | Issue |
| --- | --- | --- | --- |
| 1 | High | Auth | **No password reset and no email verification.** A user who forgets their password cannot recover the account; there is no recovery path at all. New accounts are trusted as soon as they are created. |
| 2 | High | Ops | **No automated tests inside the repo.** The Playwright and axe suites live in `/tmp/pw` and are not versioned, so a fresh clone has only `typecheck` and `build` as safety nets. |
| 3 | High | Ops | **One process, one database.** SQLite accepts a single writer and the app assumes one instance. Two containers sharing `data/paisapilot.db` will produce `SQLITE_BUSY` errors. There is no backup job by default. |
| 4 | Medium | Records | **Rows beyond 5,000 are silently omitted.** `loadRawData` and `/api/export` both cap at 5,000 transactions (`lib/store.ts:74`, `app/api/export/route.ts:11`). The activity page has no pagination, so older rows simply disappear from the list and from the export. |
| 5 | Medium | Auth | **Rate limiting is per process and memory-only** (`lib/validate.ts:38`). It resets on every deploy, is not shared between instances, and does nothing to stop a distributed attempt. Login is limited per email address, not per IP. |
| 6 | Medium | Resilience | **No `error.tsx` / `not-found.tsx` / `loading.tsx`.** Any unhandled exception shows Next's default 500 page instead of something a person can act on. |
| 7 | Medium | CSV import | **Parsing is heuristic.** Files are capped at 2 MB, headers must contain a date and description column, and ambiguous `03/04/2026` dates are read as **dd/mm/yyyy**. Real HDFC/ICICI/SBI/Axis exports with unusual footers, multi-line narrations or amount suffixes can lose rows; the UI reports skipped rows but not which ones. |
| 8 | Medium | AI narration | **Provider failures are silent.** If Gemini, Claude or OpenAI times out, returns malformed JSON or the key is wrong, the report quietly falls back to the rules analyst and the UI shows no reason. Every regeneration is a billed call; there is no caching or per-user quota. |
| 9 | Medium | Security headers | No **Content-Security-Policy** and no **Strict-Transport-Security**. `X-Frame-Options`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` are set. |
| 10 | Medium | Dates | **Month boundaries follow the server's timezone.** "This month" uses local time (`lib/analytics.ts:68`) while transaction dates are date-only strings. On a UTC server an IST user can see the previous month for the first 5½ hours of a new month. Set `TZ=Asia/Kolkata` on the host. |

## Open — acceptable for a small beta

| # | Severity | Area | Issue |
| --- | --- | --- | --- |
| 11 | Low | Invites | A code is shown **once**, at creation. Lost codes must be revoked and reissued; there is no lookup by email. Invites are not emailed by the app. |
| 12 | Low | Invites | Administration is **CLI only** (`npm run invite`). There is no in-app admin screen, and issuing a code requires shell access to the host. |
| 13 | Low | Sessions | Sessions last 30 days, are not rotated on privilege change, and there is no device list or "sign out everywhere". Sign-out revokes only the current session. |
| 14 | Low | Privacy | No **terms of service or privacy policy page**. The signup checkbox is a one-line data-use note. Deletion and export are implemented, but a DPDP Act 2023 notice is not. |
| 15 | Low | Product | **No bank sync** (CSV and manual entry only), **no investments or tax analysis** (the PRD scopes them out), INR only, English only, no dark mode. |
| 16 | Low | Analysis | Category and recurring-charge detection is rule-based (`lib/categorize.ts`). Misclassified merchants change the score; there is no way for a user to correct a category. |
| 17 | Low | Data | Sample data is tagged `source='sample'` and removable, but importing a real statement while sample data is loaded keeps both sets in the totals until the sample rows are removed. |
| 18 | Low | Accessibility | axe-core reports 0 WCAG 2.1 A/AA violations on the main routes at 390 px, but the app has not been tested with a real screen reader, keyboard-only on every flow, or at 200% zoom. |
| 19 | Low | Export | JSON export includes the full profile and transaction list. Data is protected by the host's disk and HTTPS in transit, not by encryption at rest inside the app. |
| 20 | Medium | PDF import | **Extraction is model-assisted and unverified.** Gemini returns rows that are validated locally for date, amount and direction, but totals are not reconciled against the statement and faint or overlapping lines can be skipped. Plain PDFs (including scans) are uploaded to Google; only rows are stored. 8 MB / 24 pages / 2,000 rows / 10 imports per user per hour. There is no PDF path without `GEMINI_API_KEY`. |
| 21 | Low | PDF import | **Encrypted scans do not work.** A password-protected PDF is decrypted locally and only its text layer is sent, so a locked image-only statement fails with "no machine-readable text". The user has to export a CSV or unlock and re-save the file. |
| 22 | Low | AI narration | **Gemini is now tried first, then Claude, then OpenAI.** Only the first configured provider is used; a provider that fails falls straight through to the local analyst (see #8). PDF calls disable Gemini "thinking" and cap output at 8,192 tokens, so very long statements can truncate and fail rather than split across calls. |
| 23 | Medium | PDF import | **PDF statement upload does not work in this build.** Uploading a PDF fails or returns no transactions, whatever the file or password. Export the same period as CSV and upload that instead. This is intentional for the beta and is not scheduled for a fix. |

## Fixed in this cut

- Paise/rupee mismatch in narrative amounts that made every written figure 100× too large (`lib/analytics.ts`, `lib/ai.ts`) — fixed in the previous pass.
- Emergency-fund insight hard-coded "six months" instead of computing the shortfall — fixed in the previous pass.
- Duplicate CSV uploads double-counting — fixed with per-user dedupe hashes.
- Unauthenticated signup — now gated by single-use invite codes by default.
- Password-protected PDFs failing with `DataCloneError` on the second open attempt — pdf.js now gets a fresh copy of the buffer per attempt.
- PDF imports with no AI consent silently leaving the server — now blocked before the file is read.

## Checklist before opening signup to the public

1. Password reset and email verification, with expiring single-use tokens.
2. Move the Playwright/axe suites into `tests/` and run them in CI.
3. Email delivery for invites and password resets.
4. Pagination (or a hard, visible cap) on `/activity`, and a streamed export.
5. Shared rate-limit store if running more than one instance.
6. `error.tsx`, `not-found.tsx`, `loading.tsx` on the app routes.
7. CSP and HSTS; a real privacy policy and terms page.
8. Backup and restore rehearsed once on the production host.
