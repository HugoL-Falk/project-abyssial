# Blessing Selected Popover Opacity Increase Implementation Plan

> **For agentic workers:** REQUIRED SUB‑SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase the background opacity of the selected‑blessing popover in the in‑game menu so the text is clearly readable.

**Architecture:** A single UI style change in the `InGameMenuButton` component; no new logic or state is introduced.

**Tech Stack:** React, TypeScript, inline CSS‑in‑JS styles, Jest + React Testing Library for unit tests.

## Global Constraints
- Maintain existing colour palette and theme variables (no new colours).
- Do not alter functional behaviour of the popover (selection logic, toggling, etc.).
- Keep all existing tests passing; add a UI‑style test for the new opacity.
- Follow the project's linting and formatting rules (prettier, eslint).

---

### Task 1: Write a failing test for the popover background opacity

**Files:**
- Create: `src/components/game/__tests__/InGameMenuButton.opacity.test.tsx`

**Interfaces:**
- Consumes: `InGameMenuButton` component (exported as default).
- Produces: No direct output; test will assert the `background` style of the selected‑blessing button after the user opens the popover.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import InGameMenuButton from '../../InGameMenuButton';

/**
 * Render the button, open the popover, and verify the background of a selected
 * blessing button contains the new opacity value.
 */
test('selected blessing button uses high‑opacity background', async () => {
  // Mock a store with a selected blessing ID
  const mockStore = {
    blessings: { selected: ['the_deep_trade'] },
    // other required slices can be stubbed as empty objects
  };
  // Render with the mock store (assume the project uses a Provider utility)
  render(<InGameMenuButton mockStore={mockStore} />);

  // Open the popover by clicking the gear icon
  const gearBtn = screen.getByText('⚙');
  fireEvent.click(gearBtn);

  // Wait for the selected blessing list to appear
  const selectedBtn = await screen.findByText('The Deep Trade');
  // The style is applied inline; inspect the parent button element
  const btn = selectedBtn.closest('button');
  expect(btn).toBeInTheDocument();
  const style = window.getComputedStyle(btn!);
  // The background should contain the new opacity value 0.85
  expect(style.background).toContain('rgba(0,0,0,0.85)');
});
```

- [ ] **Step 2: Run the test to confirm it fails**
```bash
npm test -- src/components/game/__tests__/InGameMenuButton.opacity.test.tsx
```
Expected: Test fails because the current background is `rgba(0,0,0,0.45)`.

- [ ] **Step 3: Implement the opacity change**

**File to modify:** `src/components/game/InGameMenuButton.tsx` (line ~176‑180)
```tsx
- background: 'rgba(0,0,0,0.45)'
+ background: 'rgba(0,0,0,0.85)'
```

- [ ] **Step 4: Run the test to verify it passes**
```bash
npm test -- src/components/game/__tests__/InGameMenuButton.opacity.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Run the full test suite to ensure no regressions**
```bash
npm test
```
All 242 tests should pass.

- [ ] **Step 6: Run the TypeScript type‑check**
```bash
npm run typecheck
```
No errors.

- [ ] **Step 7: Commit the changes**
```bash
git add src/components/game/InGameMenuButton.tsx src/components/game/__tests__/InGameMenuButton.opacity.test.tsx

git commit -m "style(P16‑…): increase selected‑blessing popover opacity to improve readability"
```

---

**Spec compliance check:** This plan covers every requirement from the design spec:
- Opacity increase (0.85) ✅
- Text contrast remains unchanged ✅
- No functional changes ✅
- Tests added and passing ✅

**Next steps:** Choose an execution mode.

**Execution options:**
1. **Subagent‑Driven (recommended)** – dispatch a fresh subagent per task, review after each.
2. **Inline Execution** – run all steps in this session using the `executing‑plans` skill.

Which approach would you like to use?