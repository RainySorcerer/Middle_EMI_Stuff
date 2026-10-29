---
name: Frontend Architecture
description: Structure decisions for frontend features — component boundaries, state, data fetching, forms, API contracts, and performance. Use when adding a feature, refactoring a screen, wiring an API, or deciding where state belongs.
---

# Frontend Architecture

The stack is not fixed yet. Confirm the framework before writing code, then follow its idioms
rather than forcing patterns from another ecosystem.

## Decide before coding

1. **Rendering**: does this screen need SEO, first-paint speed, or per-request data? If yes, render
   on the server where the framework allows. If it is a highly interactive widget, it can be client-side.
2. **Data ownership**: one source of truth per piece of data. Server state is fetched and cached;
   UI state lives in the component; URL state is for anything shareable (filters, tabs, date range).
3. **Scope**: is this used twice or more, with the same semantics? Only then extract a shared
   component. Otherwise keep it colocated.
4. **Failure mode**: what happens on slow network, empty response, 500, and partial data? Decide now.

## Component design

- Components should be small enough to read in one screen. Split by responsibility, not line count.
- Presentational components take data and callbacks; they do not fetch or know routes.
- Container or route components own fetching, permissions, and orchestration.
- Props should be explicit. Avoid boolean explosion; prefer variants.
- Keep domain logic (FOIR, utilization, XIRR, formatting) in plain functions with tests, outside JSX.
- Colocate styles, tests, and stories next to the component.

## Data fetching

- Centralize API calls in a typed client or service layer; never call `fetch` with inline URLs
  across components.
- Validate responses at the boundary. Assume the server can return malformed data.
- Model three states explicitly: loading, success, error. Add empty and stale where relevant.
- Cache and dedupe by key. Invalidate after mutations. Do not manually refetch everything.
- Show the last-updated time for financial data. Refetch on focus only if it will not disrupt input.

## Forms

- Validate on blur and on submit; do not shout errors while the user is still typing.
- Inline errors next to the field, plus a summary for long forms.
- Preserve user input on failure. Never clear a form because a request failed.
- Money inputs: accept `₹`, commas, and decimals; store minor units or a decimal string, never a
  float for currency.
- Disable submit only while in flight, and show what is happening.

## API contracts

- Share types between client and server when the stack allows. Otherwise define a schema and
  validate at the boundary.
- One error envelope: `{ error: { code, message, field? } }`. Surface `message` to the user.
- Paginate lists. Never return an unbounded financial history.
- Version or evolve endpoints additively; the UI must tolerate unknown fields.

## Performance

- Measure before optimizing. Check bundle size, route payload, and render count.
- Virtualize tables over ~100 rows. Financial histories grow.
- Avoid client-side waterfalls: fetch independent data in parallel.
- Do not put large chart libraries or PDF exporters in the initial bundle; lazy-load them.
- Memoize only measured hot paths; premature memoization adds noise.

## Definition of done

- Types pass, lint passes, tests pass.
- All data states are handled.
- No secrets or financial amounts in logs.
- The feature works with keyboard only and at 360px width.
