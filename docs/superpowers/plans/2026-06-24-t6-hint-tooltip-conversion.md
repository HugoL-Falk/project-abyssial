# T6 Hint-Tooltip Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert verbose option-requirement text and long flavour into a consistent tap-to-toggle hint-tooltip language across three Playtest-18 items (P18-12, P18-13, P18-14).

**Architecture:** A new shared `<HintTooltip>` bubble primitive renders a positioned, tap-toggled text popover. It does NOT own the trigger glyph — each call site passes its own icon as `children`. Three call sites adopt it: the option requirement pill (becomes a purple `◆`), the reinsert `+ card` indicator, and the `god path → later` defer tag. Plus a one-line Thematic prose tighten on the diocese card.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest (node env), Zustand store. Inline-style convention (no CSS modules) per existing `tags/` components.

## Global Constraints

- **Glyph:** requirement trigger is `◆` (U+25C6), rendered in **purple** (`#9b7bd4` family — match to existing palette during impl; no new CSS var unless reused 2+ times).
- **Interaction:** tap toggles the bubble open/closed; tapping elsewhere or opening another tooltip closes it. Touch-first (playtest is touch-played) — do NOT rely on hover-only `title`.
- **Tooltip-only:** the requirement diamond (P18-12) and reinsert icon (P18-13) do NOT open a card preview on tap. This drops the existing tap-to-preview chain-card discovery (NB-G1-03 / P17-29) and reinsert preview — **flagged watchpoint**, confirm at playtest, trivially re-enableable.
- **No DOM test harness:** Vitest runs `environment: 'node'`, `include: ['src/**/*.test.ts']` only — no jsdom, no `.test.tsx`. Presentational changes are verified by `npx tsc --noEmit` + the existing 126-test suite staying green + manual playtest. Do NOT add a DOM-testing harness (out of scope). This matches the T5 precedent (s95 visual cluster shipped with no new test files).
- **Baseline:** 126/126 vitest pass, typecheck clean. Every task must preserve this.
- **File-size cap:** CLAUDE.md flags any file >300 lines. `HintTooltip.tsx` is new and small; do not let it balloon.

---

## File Structure

- **Create** `src/components/game/HintTooltip.tsx` — shared tap-toggle bubble primitive. One responsibility: show/hide a positioned text popover around an arbitrary trigger child.
- **Modify** `src/components/game/OptionsColumn.tsx` (~lines 206–236) — replace gold `Requires: {label} ⓘ` pill with purple `◆` wrapped in `<HintTooltip>`.
- **Modify** `src/components/game/tags/StructuralTag.tsx` (`renderInsertCardSingle`, `renderInsertCardGrouped`, ~lines 46–86) — wrap the reinsert indicator in `<HintTooltip>`, tap = tooltip not preview.
- **Modify** `src/components/game/EffectTags.tsx` (~lines 155–166) — wrap `deferGodPathCard` tag in `<HintTooltip>`.
- **Modify** `src/data/cards/rare.ts` (`the_diocese_sends_word`, ~lines 224–255) — Thematic prose tighten.

---

## Task 1: HintTooltip shared component

**Files:**
- Create: `src/components/game/HintTooltip.tsx`

**Interfaces:**
- Consumes: nothing (leaf component).
- Produces: `export function HintTooltip({ text, children, ariaLabel }: { text: string; children: React.ReactNode; ariaLabel?: string }): JSX.Element` — wraps `children` (the trigger glyph) in an inline-flex span; tapping the trigger toggles a positioned text bubble showing `text`.

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useRef, useState } from 'react'

/**
 * Tap-to-toggle hint bubble. The caller supplies its own trigger glyph as
 * `children`; this component owns only the popover behaviour and styling.
 * Touch-first: opens/closes on click (works for tap), closes on outside
 * click or when another tooltip opens. No card-preview side effect.
 */
export function HintTooltip({
  text,
  children,
  ariaLabel,
}: {
  text: string
  children: React.ReactNode
  ariaLabel?: string
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(ev: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [open])

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-label={ariaLabel ?? text}
        aria-expanded={open}
        onClick={(ev) => {
          ev.stopPropagation()
          setOpen((o) => !o)
        }}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          font: 'inherit',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            whiteSpace: 'normal',
            width: 'max-content',
            maxWidth: '14rem',
            fontSize: '0.72rem',
            fontFamily: 'var(--ui-font)',
            color: 'rgba(230,220,200,0.95)',
            background: 'rgba(20,16,28,0.96)',
            border: '1px solid rgba(155,123,212,0.45)',
            borderRadius: '4px',
            padding: '0.35rem 0.5rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/game/HintTooltip.tsx
git commit -m "feat(ui): add shared HintTooltip tap-toggle bubble (T6)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: P18-12 — requirement pill → purple diamond

**Files:**
- Modify: `src/components/game/OptionsColumn.tsx` (~lines 206–236)

**Interfaces:**
- Consumes: `HintTooltip` from Task 1.
- Produces: visual change only; `prepRequirement` shape unchanged.

- [ ] **Step 1: Add the import**

At the top of `OptionsColumn.tsx`, add to the existing imports:

```tsx
import { HintTooltip } from './HintTooltip'
```

- [ ] **Step 2: Replace the requirement pill JSX**

Replace the entire `{prepRequirement && ( ... )}` block (currently the gold `role="button"` span ending in `Requires: {prepRequirement.label} ⓘ`) with:

```tsx
              {prepRequirement && (
                <HintTooltip
                  text={`Requires ${prepRequirement.label}.`}
                  ariaLabel={`Requirement: ${prepRequirement.label}`}
                >
                  <span
                    style={{
                      color: '#9b7bd4',
                      fontSize: '0.85rem',
                      lineHeight: 1,
                      textShadow: '0 0 6px rgba(155,123,212,0.5)',
                    }}
                  >
                    ◆
                  </span>
                </HintTooltip>
              )}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Note: `onPreviewCard` may now be unused by this block — leave it; it is still used by the `<EffectTags>` render below at ~line 237.)

- [ ] **Step 4: Run the suite**

Run: `npm test`
Expected: 126/126 pass (no logic touched).

- [ ] **Step 5: Commit**

```bash
git add src/components/game/OptionsColumn.tsx
git commit -m "feat(ui): replace requirement pill with purple diamond hint (P18-12)

Tooltip-only; drops tap-to-preview chain-card discovery (NB-G1-03) —
flagged watchpoint, re-enableable.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: P18-13 — reinsert icon hint

**Files:**
- Modify: `src/components/game/tags/StructuralTag.tsx` (`renderInsertCardSingle` ~72–86, `renderInsertCardGrouped` ~46–70)

**Interfaces:**
- Consumes: `HintTooltip` from Task 1.
- Produces: `renderInsertCardSingle` / `renderInsertCardGrouped` keep the same signatures; tap now toggles a tooltip instead of previewing.

- [ ] **Step 1: Add the import**

At the top of `StructuralTag.tsx`, add:

```tsx
import { HintTooltip } from '../HintTooltip'
```

- [ ] **Step 2: Rewrite `renderInsertCardSingle`**

Replace the function body with a non-clickable styled span wrapped in `HintTooltip` (drop the preview button — consistent with the tooltip-only model):

```tsx
export function renderInsertCardSingle(key: number | string, cardId: string, onPreviewCard?: (id: string) => void): JSX.Element {
  void cardId; void onPreviewCard // P18-13: reinsert is tooltip-only now; preview path retired (watchpoint)
  return (
    <HintTooltip key={key} text="This card returns to the deck later." ariaLabel="Card returns to the deck later">
      <span style={{
        fontSize: '0.8rem', color: 'var(--gold-bright)', background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(122,173,85,0.3)', padding: '0.2rem 0.5rem', borderRadius: '2px',
      }}>
        + card
      </span>
    </HintTooltip>
  )
}
```

- [ ] **Step 3: Rewrite `renderInsertCardGrouped`**

Replace the function body similarly (drop the clickable branch):

```tsx
export function renderInsertCardGrouped(key: string, count: number, cardIds?: string[], onPreviewCard?: (id: string) => void): JSX.Element {
  void cardIds; void onPreviewCard // P18-13: tooltip-only
  return (
    <HintTooltip key={key} text="These cards return to the deck later." ariaLabel="Cards return to the deck later">
      <span style={{
        fontSize: '0.8rem', color: 'var(--gold-bright)', background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(122,173,85,0.3)', padding: '0.2rem 0.5rem', borderRadius: '2px',
      }}>
        + {count} cards
      </span>
    </HintTooltip>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. The `void` statements suppress unused-param warnings while keeping the signatures stable for callers.

- [ ] **Step 5: Run the suite**

Run: `npm test`
Expected: 126/126 pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/tags/StructuralTag.tsx
git commit -m "feat(ui): reinsert icon shows hint tooltip on tap (P18-13)

Tooltip-only; reinsert preview path retired (watchpoint).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: P18-14 — defer tag tooltip + diocese prose tighten

**Files:**
- Modify: `src/components/game/EffectTags.tsx` (~155–166)
- Modify: `src/data/cards/rare.ts` (`the_diocese_sends_word` ~224–255)

**Interfaces:**
- Consumes: `HintTooltip` from Task 1.
- Produces: visual + content change only.

- [ ] **Step 1: Add the import to EffectTags**

At the top of `EffectTags.tsx`, add:

```tsx
import { HintTooltip } from './HintTooltip'
```

- [ ] **Step 2: Wrap the defer tag**

Replace the `deferGodPathCard` push block (the span with `title="Pushes your next god-path card later in the deck."` containing `god path → later`) with:

```tsx
    } else if (e.type === 'deferGodPathCard') {
      tags.push(
        <HintTooltip key={i} text="Pushes your next god-path card later in the deck." ariaLabel="God-path card pushed later">
          <span style={{
            fontSize: '0.8rem', color: '#c89020',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(200,144,32,0.3)',
            padding: '0.1rem 0.35rem', borderRadius: '2px',
          }}>
            god path → later
          </span>
        </HintTooltip>
      )
    }
```

- [ ] **Step 3: Tighten the diocese prose (Thematic)**

Dispatch the **Thematic** game agent (inject `knowledge/agents/thematic.md`) to propose tightened option flavour for `the_diocese_sends_word`. Constraints to pass the agent: three options ("Compose a careful reply" / "Refuse to engage" / "Welcome the inquiry openly"); keep each flavour to ~1 short sentence; preserve the bishop/inquiry tone; the `deferGodPathCard` mechanic is now explained by the tooltip, so flavour must NOT re-explain "god path later". Apply the agent's proposal to `src/data/cards/rare.ts` lines 231 / 239 / 247 (the three `flavourText` strings) only — do NOT change `effects` or `label`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the suite**

Run: `npm test`
Expected: 126/126 pass.

- [ ] **Step 6: Append the agent lesson**

Append to the bottom of `knowledge/agents/thematic.md`:

```
- 2026-06-24: the_diocese_sends_word — tightened opt flavour (P18-14); defer mechanic now lives in tooltip, removed from prose.
```

- [ ] **Step 7: Commit**

```bash
git add src/components/game/EffectTags.tsx src/data/cards/rare.ts knowledge/agents/thematic.md
git commit -m "feat(ui): defer tag tooltip + tighten diocese prose (P18-14)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] `npx tsc --noEmit` clean.
- [ ] `npm test` → 126/126.
- [ ] Manual playtest spot-check (off-band): purple ◆ toggles on tap; reinsert `+ card` toggles explanation; `god path → later` toggles explanation; only one tooltip open at a time; outside-tap closes.

## Watchpoints to record at session end

- Diamond (P18-12) and reinsert (P18-13) are tooltip-only — tap-to-preview chain-card discovery (NB-G1-03 / P17-29) is dropped. Confirm at playtest; re-enable by routing tap to `onPreviewCard` if missed.
- `HintTooltip` bubble uses fixed `bottom`/`translateX` positioning — if an option near the top/edge clips the bubble at playtest, add edge-flip later (deferred, YAGNI for now).
