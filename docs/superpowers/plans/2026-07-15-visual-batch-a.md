# Visual Batch A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five visual/CSS regressions across the activity log, blessing selection modal, and succumb screen — no engine or state logic touched.

**Architecture:** All changes are inline-style edits inside React components. No new files, no new tests (visual-only — vitest suite must stay green as a regression guard only). Each task touches one file, commits independently.

**Tech Stack:** React, TypeScript, inline styles (project convention), Cormorant Garamond / Cinzel Decorative fonts.

## Global Constraints

- No logic changes — every edit is a style property swap or element removal only.
- `--gold-bright` = `#9ecc7a` (green). `--color-gold-bright` = `#e8c050` (amber). Never confuse them.
- Vitest must remain 302/302 after every commit. Run from `C:/Project Abyssial/Code/project-abyssial`.
- Git path: `git -C "C:/Project Abyssial/Code/project-abyssial"` (laptop path).
- Spec: `docs/superpowers/specs/2026-07-15-visual-batch-a-design.md`

---

### Task 1: ActivityLog — god path colour + symbol alignment + doom escalates

**Items:** P25-12, P25-13 (partial), P25-26

**Files:**
- Modify: `src/components/game/ActivityLog.tsx`

**Interfaces:**
- Produces: nothing downstream — pure visual

- [ ] **Step 1: Fix P25-12 — god path pill text colour**

  In `InsertPurgePill`, find the `textColor` constant (~line 163). Change the `isGodPathInsert` branch:

  ```tsx
  // BEFORE
  const textColor = isGodPathInsert
    ? 'var(--gold-bright)'
    : isInsert
      ? (isRed ? '#c84a3a' : 'var(--gold-bright)')
      : '#e08080'

  // AFTER
  const textColor = isGodPathInsert
    ? 'var(--color-gold-bright)'
    : isInsert
      ? (isRed ? '#c84a3a' : 'var(--gold-bright)')
      : '#e08080'
  ```

  Only the first branch changes. The middle branch (`isInsert && !isGodPathInsert && !isRed`) intentionally stays green (`--gold-bright`) — only god-path inserts use amber.

- [ ] **Step 2: Fix P25-13 — InsertPurgePill symbol span alignment**

  Find the symbol `<span>` inside `InsertPurgePill`'s `<button>` return (~line 187):

  ```tsx
  // BEFORE
  <span style={{ lineHeight: 1 }}>{symbol}</span>

  // AFTER
  <span style={{ display: 'inline-flex', alignItems: 'center' }}>{symbol}</span>
  ```

  The parent button already uses `display: inline-flex; alignItems: center` — replacing `lineHeight: 1` with explicit flex alignment lets Cormorant Garamond's `+`/`−` glyphs centre on the cap-height rather than the descender line.

- [ ] **Step 3: Fix P25-13 — PrepTagRemovedPill symbol span alignment**

  Find `PrepTagRemovedPill` (~line 128). Its inner `−❖` span has no style:

  ```tsx
  // BEFORE
  <span>−❖</span>

  // AFTER
  <span style={{ display: 'inline-flex', alignItems: 'center' }}>−❖</span>
  ```

- [ ] **Step 4: Fix P25-26 — Doom escalates: remove icon, center text**

  Find the `doomEscalate` branch inside `ActivityRow` (~line 218):

  ```tsx
  // BEFORE
  if (entry.kind === 'doomEscalate') {
    return (
      <div style={{ ...baseStyle, color: '#c84a3a', fontVariant: 'small-caps', letterSpacing: '0.08em' }}>
        <span style={{ width: '14px', textAlign: 'center', fontWeight: 'bold' }}>⚠</span>
        <span>Doom escalates</span>
      </div>
    )
  }

  // AFTER
  if (entry.kind === 'doomEscalate') {
    return (
      <div style={{ ...baseStyle, color: '#c84a3a', fontVariant: 'small-caps', letterSpacing: '0.08em', justifyContent: 'center' }}>
        <span>Doom escalates</span>
      </div>
    )
  }
  ```

  Remove the `⚠` icon span entirely. Add `justifyContent: 'center'` to the div. Keep colour, fontVariant, letterSpacing.

- [ ] **Step 5: Run vitest**

  ```bash
  cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run
  ```

  Expected: 302 passed, 0 failed. If any test fails, do not proceed — investigate.

- [ ] **Step 6: Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/game/ActivityLog.tsx
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "fix(visual): god path pill amber text, symbol alignment, doom escalates centred (P25-12/13/26)"
  ```

---

### Task 2: ResourceTag — icon/number alignment check

**Item:** P25-13 (conditional — apply only if misalignment visible in browser)

**Files:**
- Modify: `src/components/game/tags/ResourceTag.tsx` (conditional)

**Interfaces:**
- Produces: nothing downstream

- [ ] **Step 1: Open the game in browser and check ResourceTag alignment**

  Navigate to any card with resource effects (e.g. the first common card in a run). Look at the resource pills in the options column. Check whether the `+N` / `-N` text visually misaligns with the resource icon beside it.

  - If **no misalignment visible**: skip Steps 2–4 entirely and move to Task 3.
  - If **misalignment visible**: proceed to Step 2.

- [ ] **Step 2: (Conditional) Add vertical nudge to number span**

  In `ResourceTag.tsx`, find the number `<span>` (~line 19):

  ```tsx
  // BEFORE
  <span style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center', height: '13px' }}>
    {pos ? '+' : ''}{effect.delta}
  </span>

  // AFTER
  <span style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center', height: '13px', position: 'relative', top: '0.05em' }}>
    {pos ? '+' : ''}{effect.delta}
  </span>
  ```

  `0.05em` is a conservative nudge. Check in browser — if it overshoots, try `0.03em`. If it undershoots, try `0.07em`. Pick the value that aligns the number baseline with the icon midpoint.

- [ ] **Step 3: (Conditional) Run vitest**

  ```bash
  cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run
  ```

  Expected: 302 passed, 0 failed.

- [ ] **Step 4: (Conditional) Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/game/tags/ResourceTag.tsx
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "fix(visual): ResourceTag number alignment nudge (P25-13)"
  ```

---

### Task 3: SetupScreens — blessing selection outline-only

**Item:** P25-24

**Files:**
- Modify: `src/components/SetupScreens.tsx`

**Interfaces:**
- Produces: nothing downstream

- [ ] **Step 1: Remove gold background fill from selected blessing button**

  In `BlessingSelectScreen`, find the unlocked blessing `<button>` (~line 280). The current inline style object has:

  ```tsx
  background: chosen ? 'rgba(180,155,60,0.82)' : 'var(--surface)',
  border: chosen ? '1px solid rgba(200,160,40,0.85)' : '1px solid var(--border)',
  ```

  Replace with:

  ```tsx
  background: 'var(--surface)',
  border: chosen ? '1px solid rgba(200,160,40,0.85)' : '1px solid var(--border)',
  boxShadow: chosen ? '0 0 0 1px rgba(200,160,40,0.55), 0 0 10px rgba(200,160,40,0.15)' : 'none',
  ```

  Keep all other properties on the button (`borderRadius`, `padding`, `fontFamily`, `opacity`, `transition`, `animation`, `cursor`) exactly as they are.

- [ ] **Step 2: Unify description text colour**

  Inside the same `<button>`, find the description `<div>` (~line 297):

  ```tsx
  // BEFORE
  <div style={{ fontSize: '0.8rem', color: chosen ? 'var(--text)' : 'rgba(200,185,158,0.82)', fontStyle: 'italic', lineHeight: 1.45 }}>{snippet}</div>

  // AFTER
  <div style={{ fontSize: '0.8rem', color: 'rgba(200,185,158,0.82)', fontStyle: 'italic', lineHeight: 1.45 }}>{snippet}</div>
  ```

  Remove the ternary — always use the dim colour. With the gold background gone there is no contrast reason to lighten the text when selected.

- [ ] **Step 3: Run vitest**

  ```bash
  cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run
  ```

  Expected: 302 passed, 0 failed.

- [ ] **Step 4: Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/SetupScreens.tsx
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "fix(visual): blessing selection — outline-only, no gold fill (P25-24)"
  ```

---

### Task 4: FailureScreen — detach bottom red line

**Item:** P25-25

**Files:**
- Modify: `src/components/FailureScreen.tsx`

**Interfaces:**
- Produces: nothing downstream

- [ ] **Step 1: Adjust bottom red line margins**

  Find the bottom red line `<div>` (~line 82) — the one that appears **after** the stats block and **before** the buttons:

  ```tsx
  // BEFORE
  <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, var(--red), transparent)', marginBottom: '2rem' }} />

  // AFTER
  <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, var(--red), transparent)', marginTop: '1.5rem', marginBottom: '1rem' }} />
  ```

  Do **not** touch the top red line (the one at the very top of the component, before "You Succumb"). Only the bottom line changes.

- [ ] **Step 2: Run vitest**

  ```bash
  cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run
  ```

  Expected: 302 passed, 0 failed.

- [ ] **Step 3: Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/FailureScreen.tsx
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "fix(visual): succumb screen — detach bottom red line from stats block (P25-25)"
  ```

---

## Completion checklist

- [ ] All 4 tasks committed
- [ ] `npx vitest run` → 302/302 at final state
- [ ] Backlog items P25-12, P25-13, P25-24, P25-25, P25-26 marked `[x]`
- [ ] `knowledge/sessions/handoff.md` updated
