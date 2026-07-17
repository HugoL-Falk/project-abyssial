# Blessing Selected Popover – Opacity Increase Design

**Date:** 2026-07-06
**Status:** Draft

---

## Problem Statement

The pop‑over that lists *selected blessings* in the in‑game menu uses a semi‑transparent black background:
```tsx
background: 'rgba(0,0,0,0.45)'
```
At this opacity the text (title, description, toggle icon) is difficult to read, especially on brighter screens. Users report that the selected blessing rows blend into the background, reducing usability.

## Goals & Success Criteria
1. **Readability** – Text contrast must meet WCAG AA (ratio ≥ 4.5:1) against the background.
2. **Visual Consistency** – Preserve the overall dark theme and subtle vignette feel of the pop‑over.
3. **Non‑intrusive** – No layout changes; only colour/opacity adjustments.
4. **No regression** – Existing tests must continue to pass.

## Proposed Solution (Primary Approach)
### Increase background opacity
Replace the current background definition with a higher‑opacity version, e.g.:
```tsx
background: 'rgba(0,0,0,0.85)'
```
This retains the black tone while making the background substantially less transparent, dramatically improving text legibility.

### Optional complementary tweaks (still within the same change set)
- **Text colour** – Keep the existing `rgba(200,160,50,0.95)` for the title; its contrast already satisfies the ratio against the darker background.
- **Border** – Retain the current border colour (`rgba(200,144,32,0.3)`). No change needed.
- **Hover/active states** – If the component later adds hover effects, they should respect the new base opacity.

## Implementation Details
1. **File:** `src/components/game/InGameMenuButton.tsx`
2. **Change:** Locate the inline style for the selected‑blessing button background (line ~176‑180) and replace `'rgba(0,0,0,0.45)'` with `'rgba(0,0,0,0.85)'`.
3. **Commit message:** `style(P16‑…): increase selected‑blessing popover opacity for readability`
4. **Testing:**
   - Run `npm test` – all existing tests must still pass.
   - Manually inspect the UI in the game to verify the text is clearly visible.
   - Optionally add a visual regression test (snapshot) if the project uses screenshot testing.

## Review Checklist
- [ ] Verify contrast ratio (use any colour‑contrast tool).
- [ ] Ensure no other components unintentionally inherit the new opacity.
- [ ] Confirm that the change does not affect accessibility settings (e.g., high‑contrast mode).

---

*This design is scoped to a single UI styling adjustment. No functional changes are introduced.*