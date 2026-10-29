---
name: Frontend Testing
description: Testing strategy for UI and financial logic — unit tests for calculations, component tests, end-to-end flows, accessibility checks, and visual review. Use when adding tests, fixing a UI bug, or preparing a feature for review.
---

# Frontend Testing

Test the money math hardest, the critical flows end to end, and the rendering where it is cheap.

## Priority order

1. **Financial calculations** — utilization, FOIR, EMI, SIP returns, tax limits, INR formatting.
   Pure functions, table-driven tests, edge cases included.
2. **State and validation** — form parsing, error mapping, empty and partial data.
3. **Critical flows** — onboarding, adding an account, viewing the dashboard, generating a report.
4. **Rendering** — component tests for conditional states and accessibility wiring.
5. **Visual** — screenshots for key screens if the project supports it.

## Calculation tests

Cover at minimum:

- Zero balance, zero limit, zero income (no division by zero, no `NaN` displayed).
- Values that cross thresholds (utilization 29.9% vs 30%, FOIR 39.9% vs 40%).
- Indian digit grouping and compaction at 1 lakh and 1 crore boundaries.
- Rounding: currency to 2 decimals or minor units, never float drift.
- Negative and refund amounts.
- Missing or unknown rates are represented explicitly, not as zero.

Use exact assertions (`toBe(1234.56)`), not approximations, for currency.

## Component tests

- Assert what the user sees, by role and accessible name, not by CSS class or test id when avoidable.
- Cover loading, empty, error, and success for every data-driven component.
- Assert that errors are announced and linked to fields.
- Avoid snapshot tests for whole screens; they hide intent and break constantly.

## End-to-end tests

- One test per critical user journey, written from the user's point of view.
- Use a deterministic seeded account, not production-shaped data.
- Test the failure path, not only the happy path.
- Do not depend on animation timing; wait for state, not fixed sleeps.
- Keep e2e few and stable; push detail down to unit and component tests.

## Accessibility checks

- Automated check on every page in the e2e suite.
- Manual keyboard pass on new interactive patterns.
- Chart alternatives present in the accessibility tree.

## Test data

- Fixtures live in one place and are typed.
- Include an edge-case user: no credit cards, one maxed card, income below EMIs, no SIPs.
- Never use real personal or financial data in tests or screenshots.

## Definition of done

- New calculation has tests before the UI uses it.
- New screen has loading, empty, error, and success coverage.
- Bug fix includes a regression test that fails without the fix.
- Test suite passes locally and in CI; no flaky retries masking failures.
