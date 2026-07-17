# P19-27 — Acquired Prep-Tag Display + Glyph Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the dead middle zone of the game screen with a live row of the player's acquired prep tags, and make the purple `❖` glyph mean "prep tag" everywhere.

**Architecture:** A pure helper (`buildPrepTagPills`) maps `state.prepTags` → display descriptors and is unit-tested node-only (no DOM harness exists). A thin presentational component (`AcquiredPrepTags`) renders those descriptors as `❖`-pills wrapped in the existing `HintTooltip`, mounted in `GameScreen.tsx` between the card art and the options panel. Four existing glyph sites are recolored/swapped to the single purple `❖` token.

**Tech Stack:** React 18 + TypeScript, Zustand (`useGameStore`), Vitest (node environment — no jsdom/RTL).

## Global Constraints

- **No DOM/RTL test harness exists** — tests run in the node vitest environment only. Test pure helpers and props (see `MenuButton.test.ts` pattern: `React.createElement` + inspect `.props`); do NOT call `render()` or query the DOM.
- **No mechanics/balance changes** — display + visual-consistency only. Do not touch `gameStore.ts` reshuffle logic or prep-tag clearing.
- **Prep tags clear on every reshuffle** — current intended behavior, NOT changed here (PREP-PERSIST is a separate backlog item).
- **Single prep-tag color token:** purple `#9b7bd4`, with `textShadow: '0 0 6px rgba(155,123,212,0.5)'`. This is the existing requirement-diamond purple in `OptionsColumn.tsx:215`.
- **Labels come from `PREP_TAG_LABELS`** in `src/data/godPaths/prepTagCarriers.ts` (e.g. `studied → 'a deep reading'`). Do NOT invent labels. (Spec's `❖ Studied` examples are illustrative; the file is source of truth.)
- **`state.prepTags` is `string[]`** (not `PrepTag[]`) — a held tag may be a string not present in `PREP_TAG_LABELS`. Filter unknown tags out so the row never shows a raw key.
- **Branch is trunk** — commit locally to the active `claude/build-abyssial-game-*` branch. Never push.
- **Run all git from** `E:/Project Abyssial/Code/project-abyssial` (vault root is not a repo).

---

## File Structure

- `src/data/godPaths/prepTagCarriers.ts` — **modify**: add the pure `buildPrepTagPills` helper next to `PREP_TAG_LABELS` (shares the same data, lives together).
- `src/data/godPaths/prepTagCarriers.test.ts` — **create**: node-only unit test for `buildPrepTagPills`.
- `src/components/game/AcquiredPrepTags.tsx` — **create**: presentational component reading `state.prepTags`, rendering pills.
- `src/components/GameScreen.tsx` — **modify**: mount `<AcquiredPrepTags />` in the card-view band above the options panel.
- `src/components/game/OptionsColumn.tsx` — **modify**: glyph unification (lines ~156 bonus `❖` gold→purple; ~221 requirement `◆`→`❖`).
- `src/components/game/EffectTags.tsx` — **modify**: glyph unification (line ~151 "tag set" pill `❖` gold→purple).
- `src/components/game/CardPreviewModal.tsx` — **modify**: glyph unification (lines ~105/114 `❖` gold→purple).

**Out of scope / leave untouched:** `WeekBanner.tsx:74` `◆` (decorative week divider), live `onDraw`/`passive` indicators (stay in the `?` tooltip), P19-40 text-drop behavior.

---

### Task 1: `buildPrepTagPills` helper + unit test

**Files:**
- Modify: `src/data/godPaths/prepTagCarriers.ts` (append after line 40)
- Test: `src/data/godPaths/prepTagCarriers.test.ts` (create)

**Interfaces:**
- Consumes: `PREP_TAG_LABELS`, `PrepTag` (already exported from this file).
- Produces: `export type PrepTagPill = { tag: PrepTag; label: string }` and
  `export function buildPrepTagPills(prepTags: string[]): PrepTagPill[]` — returns one
  descriptor per held tag that exists in `PREP_TAG_LABELS`, preserving input order,
  skipping unknown strings. Empty/unknown-only input → `[]`.

- [ ] **Step 1: Write the failing test**

Create `src/data/godPaths/prepTagCarriers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildPrepTagPills, PREP_TAG_LABELS } from './prepTagCarriers'

describe('buildPrepTagPills', () => {
  it('returns one pill per known tag, preserving order', () => {
    const pills = buildPrepTagPills(['studied', 'recited'])
    expect(pills).toEqual([
      { tag: 'studied', label: PREP_TAG_LABELS.studied },
      { tag: 'recited', label: PREP_TAG_LABELS.recited },
    ])
  })

  it('returns [] for no tags', () => {
    expect(buildPrepTagPills([])).toEqual([])
  })

  it('skips unknown tag strings', () => {
    expect(buildPrepTagPills(['studied', 'not_a_real_tag'])).toEqual([
      { tag: 'studied', label: PREP_TAG_LABELS.studied },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run src/data/godPaths/prepTagCarriers.test.ts`
Expected: FAIL — `buildPrepTagPills is not a function` (not exported yet).

- [ ] **Step 3: Write minimal implementation**

Append to `src/data/godPaths/prepTagCarriers.ts`:

```ts
export type PrepTagPill = { tag: PrepTag; label: string }

/** Maps held prep-tag keys to display descriptors. Unknown keys are skipped;
 *  input order is preserved. */
export function buildPrepTagPills(prepTags: string[]): PrepTagPill[] {
  return prepTags
    .filter((t): t is PrepTag => t in PREP_TAG_LABELS)
    .map(t => ({ tag: t, label: PREP_TAG_LABELS[t] }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run src/data/godPaths/prepTagCarriers.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd "E:/Project Abyssial/Code/project-abyssial"
git add src/data/godPaths/prepTagCarriers.ts src/data/godPaths/prepTagCarriers.test.ts
git commit -m "feat(P19-27): add buildPrepTagPills helper + node-only test

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `AcquiredPrepTags` component

**Files:**
- Create: `src/components/game/AcquiredPrepTags.tsx`

**Interfaces:**
- Consumes: `useGameStore` (selector `s => s.prepTags`), `buildPrepTagPills` (Task 1), `HintTooltip` (`./HintTooltip`).
- Produces: `export function AcquiredPrepTags(): JSX.Element | null`. Returns `null` when no known tags are held; otherwise a centered flex-wrap row of purple `❖`-pills.

- [ ] **Step 1: Write the component**

Create `src/components/game/AcquiredPrepTags.tsx`:

```tsx
import { useGameStore } from '../../state'
import { buildPrepTagPills } from '../../data/godPaths/prepTagCarriers'
import { HintTooltip } from './HintTooltip'

const PREP_PURPLE = '#9b7bd4'
const PREP_SHADOW = '0 0 6px rgba(155,123,212,0.5)'

/**
 * P19-27: live row of the player's acquired prep tags, shown in the band
 * between the drawn card art and the options panel. Returns null when no
 * tags are held — the zone stays empty (e.g. immediately after a reshuffle
 * clears prepTags).
 */
export function AcquiredPrepTags(): JSX.Element | null {
  const prepTags = useGameStore(s => s.prepTags)
  const pills = buildPrepTagPills(prepTags)
  if (pills.length === 0) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'center', pointerEvents: 'auto' }}>
      {pills.map(({ tag, label }) => (
        <HintTooltip
          key={tag}
          text={`Prepared: ${label}. Spent automatically on the matching path card.`}
          ariaLabel={`Prepared: ${label}`}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            fontSize: '0.78rem', color: PREP_PURPLE, textShadow: PREP_SHADOW,
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(155,123,212,0.4)',
            padding: '0.1rem 0.4rem', borderRadius: '2px',
            fontVariant: 'small-caps', letterSpacing: '0.06em',
          }}>
            <span>❖</span>
            <span>{label}</span>
          </span>
        </HintTooltip>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "E:/Project Abyssial/Code/project-abyssial"
git add src/components/game/AcquiredPrepTags.tsx
git commit -m "feat(P19-27): AcquiredPrepTags component (purple prep-tag row)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Mount `AcquiredPrepTags` in `GameScreen.tsx`

**Files:**
- Modify: `src/components/GameScreen.tsx` (import near line 13; render in the card-view `<>` block, above the options panel `div` at line 378)

**Interfaces:**
- Consumes: `AcquiredPrepTags` (Task 2).

The card view (the `else` branch, lines 324–417) currently shows the card art, floating buttons, then the options panel. Mount the tag row as an absolutely-positioned band that sits above the options panel and below the resource bar, centered, so it does not interfere with the full-bleed card art (`position: absolute; inset: 0`) or the tap-to-toggle handler on it.

- [ ] **Step 1: Add the import**

In `src/components/GameScreen.tsx`, after line 13 (`import { ActivityLog } ...`) add:

```tsx
import { AcquiredPrepTags }       from './game/AcquiredPrepTags'
```

- [ ] **Step 2: Render the band above the options panel**

In the card-view branch, immediately before the `{/* Options panel ... */}` block (the `{!removalState && (` at line 378), insert:

```tsx
            {/* P19-27: acquired prep-tag row — middle band above the options panel.
                Hidden while the removal overlay is up; self-hides when no tags held. */}
            {!removalState && (
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: '3.2rem',
                zIndex: 12, display: 'flex', justifyContent: 'center',
                padding: '0 0.6rem', pointerEvents: 'none',
              }}>
                <AcquiredPrepTags />
              </div>
            )}
```

- [ ] **Step 3: Typecheck**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual smoke (playtest)**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm run dev`
Acquire a prep tag (e.g. `the_old_book` opt2 "Hire a translator" → `studied`). Expect a purple `❖ a deep reading` pill in the band above the options. Tap it → tooltip. Reshuffle → row empties.

- [ ] **Step 5: Commit**

```bash
cd "E:/Project Abyssial/Code/project-abyssial"
git add src/components/GameScreen.tsx
git commit -m "feat(P19-27): mount AcquiredPrepTags band in GameScreen card view

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Glyph unification — purple `❖` everywhere

**Files:**
- Modify: `src/components/game/OptionsColumn.tsx:151-157` (bonus emphasis) and `:213-222` (requirement gate `◆`→`❖`)
- Modify: `src/components/game/EffectTags.tsx:139-154` ("tag set" pill)
- Modify: `src/components/game/CardPreviewModal.tsx:100-115` (requires-hint)

**Interfaces:** none — pure styling/glyph edits.

- [ ] **Step 1: OptionsColumn bonus emphasis (gold ❖ → purple ❖)**

`src/components/game/OptionsColumn.tsx` lines 151–157, replace:

```tsx
              {isPrepBonus && (
                <span style={{
                  color: 'var(--gold-bright)',
                  textShadow: '0 0 6px rgba(200,160,40,0.6)',
                  marginRight: '0.3rem',
                }}>❖</span>
              )}
```

with:

```tsx
              {isPrepBonus && (
                <span style={{
                  color: '#9b7bd4',
                  textShadow: '0 0 6px rgba(155,123,212,0.5)',
                  marginRight: '0.3rem',
                }}>❖</span>
              )}
```

- [ ] **Step 2: OptionsColumn requirement gate (`◆` → `❖`)**

`src/components/game/OptionsColumn.tsx` line 221 — the requirement glyph already uses purple `#9b7bd4`; change only the glyph from `◆` to `❖`:

```tsx
                    ❖
```

- [ ] **Step 3: EffectTags "tag set" pill (gold → purple)**

`src/components/game/EffectTags.tsx` lines 142–153, replace the `style` color/border + the inner glyph color:

```tsx
        <span key={i} title={`Marks you as ${label} this week. Prep slots reset at reshuffle.`}
          style={{
            fontSize: '0.8rem', color: '#9b7bd4',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(155,123,212,0.4)',
            padding: '0.1rem 0.35rem', borderRadius: '2px',
            fontVariant: 'small-caps', letterSpacing: '0.06em',
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          }}>
          <span style={{ color: '#9b7bd4', textShadow: '0 0 6px rgba(155,123,212,0.5)' }}>❖</span>
          <span>{label.toLowerCase()}</span>
        </span>
```

- [ ] **Step 4: CardPreviewModal requires-hint (gold → purple)**

`src/components/game/CardPreviewModal.tsx` lines 100–106, replace the bonus `❖` color:

```tsx
                  {isPrepBonus && (
                    <span style={{
                      color: isGreyed ? 'rgba(155,123,212,0.4)' : '#9b7bd4',
                      textShadow: isGreyed ? 'none' : '0 0 6px rgba(155,123,212,0.5)',
                      marginRight: '0.3rem',
                    }}>❖</span>
                  )}
```

And lines 109–115, the requires-hint line — recolor the text to purple (glyph already `❖`):

```tsx
                {isPrepBonus && isGreyed && (
                  <div style={{
                    fontSize: '0.7rem', color: 'rgba(155,123,212,0.6)',
                    fontStyle: 'italic', marginTop: '0.15rem',
                  }}>
                    ❖ requires: {prepTag!.replace(/_/g, ' ').toUpperCase()} this week
                  </div>
                )}
```

- [ ] **Step 5: Typecheck + full suite**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npx tsc --noEmit && npx vitest run`
Expected: typecheck clean; all tests pass (129 prior + 3 new = 132).

- [ ] **Step 6: Commit**

```bash
cd "E:/Project Abyssial/Code/project-abyssial"
git add src/components/game/OptionsColumn.tsx src/components/game/EffectTags.tsx src/components/game/CardPreviewModal.tsx
git commit -m "feat(P19-27): unify prep-tag glyph to purple ❖ across all sites

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- §1 New `AcquiredPrepTags` component → Tasks 1–3 (helper, component, mount). Reads `state.prepTags` ✓; purple ❖ pill + `PREP_TAG_LABELS` ✓; 0 tags → `null` ✓; `HintTooltip` with spec wording ✓; purple `#9b7bd4` + textShadow ✓.
- §2 Glyph unification table → Task 4: OptionsColumn:221 `◆`→`❖` ✓; OptionsColumn:156 gold→purple ✓; EffectTags:151 gold→purple ✓; CardPreviewModal:105/114 gold→purple ✓; new display purple ✓; WeekBanner:74 left unchanged ✓.
- Testing §: unit test for the pill-builder (node-only, since no RTL harness) ✓; typecheck + full vitest ✓.
- Out-of-scope items (PREP-PERSIST, live passive/onDraw tooltip, P19-40 text behavior) untouched ✓.

**Placeholder scan:** none — every code step shows complete content.

**Type consistency:** `buildPrepTagPills(prepTags: string[]) → PrepTagPill[]` defined in Task 1, consumed identically in Task 2. `PrepTagPill = { tag: PrepTag; label: string }` used consistently. `AcquiredPrepTags(): JSX.Element | null` defined Task 2, imported Task 3.

**Note on labels:** Spec illustrated `❖ Studied`; the actual `PREP_TAG_LABELS` gives lowercase narrative labels (`a deep reading`). Plan uses the file as source of truth per Global Constraints. `fontVariant: small-caps` renders them in the prep-tag house style.
