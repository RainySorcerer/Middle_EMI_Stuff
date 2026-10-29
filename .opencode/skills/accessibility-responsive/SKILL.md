---
name: Accessibility and Responsive UI
description: Accessibility, keyboard, screen-reader, contrast, and responsive-layout requirements. Use when building forms, tables, charts, navigation, modals, or when reviewing a screen for inclusive use.
---

# Accessibility and Responsive UI

Target WCAG 2.2 AA. Treat this as part of the definition of done, not a later audit.

## Semantics

- Use real elements: `button` for actions, `a` for navigation, `label` for inputs, `table` for
  tabular data, headings in order.
- One `h1` per page. Do not skip heading levels for styling.
- ARIA only when native semantics cannot express the pattern, and never to patch a wrong element.
- Landmarks: `header`, `nav`, `main`, `aside`, `footer` where they apply.

## Keyboard

- Everything operable by mouse is operable by keyboard, in a logical order.
- Visible `:focus-visible` ring on every interactive element; never `outline: none` without a
  replacement.
- No keyboard traps. Modals trap focus while open, restore focus on close, and close on Escape.
- Skip link to main content on dashboard pages.
- Custom widgets (tabs, combobox, menu, date picker) follow the ARIA Authoring Practices pattern
  or use an accessible library.

## Forms and errors

- Every input has a visible, programmatically associated label. Placeholders are not labels.
- Errors are announced (`aria-live` or `aria-describedby`) and tied to the field.
- Required fields are marked in text, not only with color or an asterisk alone.
- Autocomplete tokens for money-adjacent personal data where applicable.

## Contrast and color

- Text: 4.5:1 minimum, 3:1 for large text. UI borders and focus indicators: 3:1.
- Never use color alone for status. Pair with text, icon, or pattern.
- Test the actual rendered colors, including disabled and placeholder states.

## Charts and data

- Provide a text summary of the chart's takeaway.
- Provide a table or accessible list of the underlying values.
- Do not animate essential information; respect `prefers-reduced-motion`.
- Use patterns or direct labels in addition to color series.

## Responsive layout

- Design mobile-first, then widen. Breakpoints from content, not device names.
- 360px is the minimum supported width. No horizontal page scroll.
- Tables: keep at most 3–4 key columns on mobile, or switch to stacked cards with labels.
- Touch targets at least 44×44px with adequate spacing.
- Modals become full-screen sheets on small screens; sidebars become drawers.
- Respect safe areas on iOS and avoid fixed footers covering inputs.
- Test with 200% text zoom and with a long translated string.

## Verification

1. Tab through the screen; confirm order, focus visibility, and no traps.
2. Run an automated check (axe or Lighthouse) and fix real issues.
3. Read the screen with a screen reader for the primary flow.
4. Check contrast with a real tool, not by eye.
5. Resize to 360, 768, 1280, 1440 and 200% zoom.
