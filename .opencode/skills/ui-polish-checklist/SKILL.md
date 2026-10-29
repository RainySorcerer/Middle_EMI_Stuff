---
name: UI Polish Checklist
description: Pre-ship implementation checklist for spacing, type tokens, interaction states, loading and empty states, breakpoint QA, and edge-case data. Use when finishing a screen, reviewing a component, or when a UI works but feels unfinished.
---

# UI Polish Checklist

Aesthetic direction lives in the `frontend-design` skill. This skill is the quality
floor for implementation: the details that make a screen feel finished at every state
and size.

## Use existing tokens

1. Read the theme, token file, and 2–3 representative components before styling.
2. Reuse existing spacing, color, radius, and type scales. Do not invent a parallel system.
3. If none exist, define one small set (4px spacing base, 4–6 type sizes, semantic colors)
   and use it everywhere. No hard-coded hex in components.

## States

Every interactive element needs hover, focus-visible, active, and disabled states.

Every data view needs:

- **Loading** — skeleton matching the final layout, or a progress indicator for work over 300ms.
  No layout shift when data arrives.
- **Empty** — explains what to add first, with the action. Not a zeroed chart.
- **Error** — says what failed, what to do, and keeps user input.
- **Partial** — shows what is available and marks what is missing.
- **Stale** — shows the as-of date; stale data must look stale.

## Layout rhythm

- One spacing scale, applied consistently. Arbitrary margins read as sloppy.
- Align to a container and column grid; check left edges line up across sections.
- Body text at least 14px, 16px preferred. Line length under ~80 characters.
- Data-dense screens need less elevation, not more. Avoid cards inside cards.
- Do not make every region the same visual weight; one thing should dominate.

## Edge-case content

Check with:

- Very long strings and translated text.
- Zero, negative, and very large numbers; compact notation in tight cards.
- Missing or unknown values shown explicitly, not as `0`, `NaN`, or an empty cell.
- 0 items, 1 item, and 1,000 items in lists and tables.
- 200% browser zoom: no clipping, no horizontal text scroll.
- 360px, 768px, 1280px, 1440px widths. 360px is the minimum supported width.
- Dark mode, if supported.
- `prefers-reduced-motion` enabled.

## Motion

- 120–200ms for state changes, 200–300ms for panels. Ease-out entering, ease-in leaving.
- Motion should answer a user action or explain a change, not decorate page load.
- Never animate essential information.

## Final pass

- Screenshot the result and critique alignment, contrast, spacing rhythm, and density.
- Remove one accessory: cut decoration that does not serve the screen.
- Confirm no placeholder copy, fake data, or unused imports remain.
