# P19-44 Investigator-file Relic Lockup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a card locks up (all options unavailable), keep the real options on screen (greyed), keep the relic-spend prompt, and gate succumb behind a two-tap inline confirm.

**Architecture:** Single-component change in `OptionsColumn.tsx`. Extract the existing per-option `<button>` JSX into a local `renderOptionRow` helper, then render `visibleOpts.map(renderOptionRow)` in BOTH the normal path and the rewritten `allBlocked` branch. The `allBlocked` branch appends the existing relic toast (unchanged tone/handler) and a new two-tap succumb row backed by local arm-state.

**Tech Stack:** React + TypeScript, Zustand store (read-only here), Vitest. Inline-style components (no CSS modules).

## Global Constraints

- **Local git only** — never `git push`. Repo at `E:/Project Abyssial/Code/project-abyssial`; run git with `-C "E:/Project Abyssial/Code/project-abyssial"`. Active branch IS trunk.
- **No engine/store/card-data changes.** Only `src/components/game/OptionsColumn.tsx` is touched.
- **Relic prompt keeps EXISTING tone:** heading "Spend a Relic — adjust a resource", body "Nudge one resource by ±2. (N remaining)".
- **Render order (confirmed):** greyed options → relic toast (if `relics > 0`) → succumb row.
- **No jsdom/RTL harness exists** — component behaviour is not unit-testable. Verification = `npm run typecheck` clean + existing 132 vitest pass + manual `npm run dev`.
- **File cap 300 lines** — OptionsColumn is ~257 lines; the extraction must not balloon it. Net change should be roughly flat (move JSX, don't duplicate).

---

### Task 1: Extract `renderOptionRow` helper

**Files:**
- Modify: `src/components/game/OptionsColumn.tsx` (the `.map` callback at lines 122–253 → extract to a function declared inside the component, above the `allBlocked` check ~line 94)

**Interfaces:**
- Consumes: the existing closure vars `btnBase`, `onResolve`, `onPreviewCard`, `currentCard`, `currentResources`, `deck`, `chainTotal`, `isTutorial`, and the `VisibleOpt` element fields (`idx, option, available, effectiveEffects, affordabilityShortfall, prepRequirement`).
- Produces: `renderOptionRow(vo: VisibleOpt): JSX.Element` — a single option `<button>` keyed by `vo.idx`. Used by both render branches.

- [ ] **Step 1: Define the helper**

Inside the `OptionsColumn` component body, AFTER `btnBase` is declared (line ~92) and BEFORE the `if (allBlocked …)` check (line ~94), add:

```tsx
  function renderOptionRow({ idx, option, available: avail, effectiveEffects, affordabilityShortfall, prepRequirement }: VisibleOpt) {
    const isSuccumb = !!option.succumbOption
    const isPrepBonus = option.condition?.type === 'hasPrepTag'
    return (
      <button
        key={idx}
        onClick={() => { if (!avail) return; playSfx('click'); onResolve(idx) }}
        aria-disabled={!avail}
        style={{
          ...btnBase,
          background: avail ? 'rgba(4,2,1,0.82)' : 'rgba(8,5,3,0.6)',
          cursor: avail ? 'pointer' : 'not-allowed',
          border: isSuccumb ? '1px solid rgba(180,40,40,0.45)' : (option.isWhisper ? '1px solid rgba(160,100,255,0.55)' : '1px solid var(--border)'),
          boxShadow: option.isWhisper ? '0 0 8px rgba(160,100,255,0.15)' : undefined,
          filter: avail ? 'none' : 'grayscale(0.4)',
        }}
      >
        {/* ...MOVE the full existing label-row + flavour JSX here verbatim (current lines 143–250)... */}
      </button>
    )
  }
```

Move the existing inner JSX (the label row `<div>` block through the closing flavour `<p>`, current lines 143–250) verbatim into the `{/* ... */}` slot. Do NOT alter that inner JSX — it already handles `isSuccumb`, prep bonus, dread/affordability pills, `EffectTags`, and flavour.

- [ ] **Step 2: Rewrite the normal-branch render to use the helper**

Replace the normal `return` block (current lines 120–256) so its body is:

```tsx
  return (
    <div style={{ padding: '0 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
      {visibleOpts.map(renderOptionRow)}
    </div>
  )
```

- [ ] **Step 3: Typecheck**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm run typecheck`
Expected: clean (no errors). Confirms the extraction preserved all referenced symbols.

- [ ] **Step 4: Run tests**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm test -- --run`
Expected: 132 passed (no regressions; this is a pure refactor so far).

- [ ] **Step 5: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/components/game/OptionsColumn.tsx
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "refactor(P19-44): extract renderOptionRow helper in OptionsColumn

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Rewrite the `allBlocked` branch — greyed options + relic toast + two-tap succumb

**Files:**
- Modify: `src/components/game/OptionsColumn.tsx` (the `if (allBlocked && !isTutorial)` block, current lines 94–118; add a `useState`/`useEffect` import-level hook usage at top of component)

**Interfaces:**
- Consumes: `renderOptionRow` (Task 1), `visibleOpts`, `relics`, `onSpendRelic`, `onSuccumb`, `succumbFlavour`, `currentCard`, `btnBase`.
- Produces: no new exports — internal behaviour only.

- [ ] **Step 1: Add succumb arm-state and reset**

Ensure `useState` and `useEffect` are imported from React at the top of the file:

```tsx
import { useState, useEffect } from 'react'
```

Near the top of the `OptionsColumn` component body (with the other hooks, ~line 78–81), add:

```tsx
  const [succumbArmed, setSuccumbArmed] = useState(false)
  // Reset the two-tap arm whenever the card changes so succumb is never pre-armed.
  useEffect(() => { setSuccumbArmed(false) }, [currentCard?.id])
```

- [ ] **Step 2: Rewrite the allBlocked branch**

Replace the entire `if (allBlocked && !isTutorial) { return ( … ) }` block (current lines 94–118) with:

```tsx
  if (allBlocked && !isTutorial) {
    return (
      <div style={{ padding: '0 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
        {/* Real options stay visible (greyed) so the lockup reads as "can't afford", not "two options". */}
        {visibleOpts.map(renderOptionRow)}

        {relics > 0 && (
          <button onClick={() => { playSfx('click'); onSpendRelic() }} style={{ ...btnBase, borderColor: 'rgba(212,160,16,0.5)' }}>
            <div style={{ fontVariant: 'small-caps', fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.08em' }}>
              Spend a Relic — adjust a resource
            </div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(200,185,155,0.75)', fontStyle: 'italic', lineHeight: 1.4, margin: 0 }}>
              Nudge one resource by ±2. ({relics} remaining)
            </p>
          </button>
        )}

        <button
          onClick={() => {
            playSfx('click')
            if (!succumbArmed) { setSuccumbArmed(true); return }
            onSuccumb()
          }}
          style={{ ...btnBase, borderColor: 'rgba(180,40,40,0.45)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ fontVariant: 'small-caps', fontSize: '1rem', color: 'var(--red-bright)', letterSpacing: '0.08em', flex: 1 }}>
              {succumbArmed ? 'Tap again to succumb' : 'You succumb to the gods'}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--red-bright)', padding: '0.1rem 0.3rem', borderRadius: '2px', flexShrink: 0 }}>SUCCUMB</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontStyle: 'italic', lineHeight: 1.4, margin: 0 }}>{succumbFlavour}</p>
        </button>
      </div>
    )
  }
```

- [ ] **Step 3: Typecheck**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm run typecheck`
Expected: clean.

- [ ] **Step 4: Run tests**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm test -- --run`
Expected: 132 passed.

- [ ] **Step 5: Manual verification (dev server)**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm run dev`
Verify, by reaching a lockup (e.g. drain gold below Investigator's File thresholds):
1. Greyed real options remain visible with shortfall pills.
2. Relic toast (existing copy) opens the picker; a nudge un-greys an option, which is then tappable.
3. Succumb requires two taps: first tap → "Tap again to succumb"; second tap → run ends.
4. Switching to a different blocked card resets the succumb arm (label back to "You succumb to the gods").

- [ ] **Step 6: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/components/game/OptionsColumn.tsx
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "feat(P19-44): show greyed options + two-tap succumb on lockup

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage:** greyed real options (Task 2 Step 2 `visibleOpts.map`), relic toast existing tone (Task 2 Step 2, copy verbatim), two-tap succumb inline confirm (Task 2 Steps 1–2), render order options→toast→succumb (Task 2 Step 2), single-file scope (both tasks), arm-reset on card change (Task 2 Step 1). All covered.
- **Placeholder scan:** the only "move JSX here" instruction (Task 1 Step 1) is an explicit verbatim-move of identified existing lines, not a vague placeholder.
- **Type consistency:** `renderOptionRow(vo: VisibleOpt): JSX.Element` referenced consistently in both tasks; arm-state `succumbArmed`/`setSuccumbArmed` consistent.
