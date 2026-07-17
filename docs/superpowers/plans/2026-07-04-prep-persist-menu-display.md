# PREP-PERSIST + Menu Prep-Tag Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prep tags survive reshuffles and appear in the in-game menu, replacing the empty passive-effects rows.

**Architecture:** Three independent sequential tasks — engine state (remove two `prepTags: []` lines), card data (add two `notHasPrepTag` guards), UI (swap menu passive rows for prep-tag pills). No new types, no migrations, no new files. Each task ends with a passing suite and a commit.

**Tech Stack:** TypeScript, React, Zustand (`useGameStore`), Vitest

## Global Constraints

- Edit only what the task specifies — max 3 context lines above/below each change
- Test runner: `npx vitest run` from `C:\Project Abyssial\Code\project-abyssial`
- All tests must pass after each task (currently 167)
- Git: `git -C "C:/Project Abyssial/Code/project-abyssial"` — branch `claude/build-abyssial-game-IuJp8`, NEVER push
- Spec: `docs/superpowers/specs/2026-07-04-prep-persist-menu-display-design.md`

---

## File Map

| File | Change |
|---|---|
| `src/state/gameStore.ts` | Remove `prepTags: []` from 2 reshuffle `set()` calls |
| `src/state/gameStore.test.ts` | Flip 2 tests; update 1 comment + 1 title; add 2 new carrier guard tests |
| `src/data/cards/core.ts` | Add `notHasPrepTag` guard to `the_opium_den` opt 0; add guard to `the_seance` opt 0; update `the_old_book` comment |
| `src/components/game/InGameMenuButton.tsx` | Remove all passive-row code; add prep-tag display block |

---

### Task 1: Engine — prep tags persist across reshuffle

**Files:**
- Modify: `src/state/gameStore.ts` (~lines 1400, 1439)
- Modify: `src/state/gameStore.test.ts` (~lines 474–502, ~lines 1844–1873)

**Interfaces:**
- Produces: `prepTags` in store survives both reshuffle paths (tutorial + main)

- [ ] **Step 1: Flip describe title and both test titles**

In `gameStore.test.ts` at line 474, change the describe and both `it` titles:

```ts
// line 474 — was: describe('reshuffleOnly prepTags reset', () => {
describe('prepTags persist across reshuffle', () => {

  // line 477 — was: it('non-tutorial reshuffle clears prepTags', () => {
  it('non-tutorial reshuffle preserves prepTags', () => {

  // line 491 — was: it('tutorial reshuffle clears prepTags', () => {
  it('tutorial reshuffle preserves prepTags', () => {
```

- [ ] **Step 2: Flip the two assertions**

Still in that describe block, change both `toEqual([])` assertions:

```ts
// line 488 — was: expect(useGameStore.getState().prepTags).toEqual([])
expect(useGameStore.getState().prepTags).toEqual(['studied', 'attended_seance'])

// line 501 — was: expect(useGameStore.getState().prepTags).toEqual([])
expect(useGameStore.getState().prepTags).toEqual(['recited'])
```

- [ ] **Step 3: Run tests — confirm the 2 flipped tests now fail**

```bash
npx vitest run --reporter=verbose 2>&1 | grep -E "(FAIL|PASS|prepTags persist)"
```

Expected: 2 failures in `prepTags persist across reshuffle`. All other tests pass.

- [ ] **Step 4: Remove `prepTags: []` from the tutorial reshuffle path**

In `gameStore.ts` around line 1396–1401, find the tutorial reshuffle `set()` call. Delete only the `prepTags: []` line:

```ts
// BEFORE:
      activityBatchSealed: true,
      prepTags: [],
    })

// AFTER:
      activityBatchSealed: true,
    })
```

- [ ] **Step 5: Remove `prepTags: []` from the main reshuffle path**

In `gameStore.ts` around line 1434–1440, find the main reshuffle `set()` call. Delete only the `prepTags: []` line:

```ts
// BEFORE:
      activityBatchSealed: true,
      prepTags: [],
    })

// AFTER:
      activityBatchSealed: true,
    })
```

- [ ] **Step 6: Update the regression test comment and title**

In `gameStore.test.ts` at lines 1844–1863, replace the describe-block comment and the second `it` title:

```ts
// BEFORE (~lines 1844–1848):
describe('yha_nthlei_2 opt2 one-shot return (P17-20 / P19-21)', () => {
  // P19-21: prepTags clear on every reshuffle, so the original
  // notHasPrepTag gate re-opened opt2 after a reshuffle → relic farm.
  // Re-gated on cardOptionChosen (cardRunState.chosenOptions persists
  // run-long, survives reshuffle).

// AFTER:
describe('yha_nthlei_2 opt2 one-shot return (P17-20 / P19-21)', () => {
  // P19-21: gate uses cardOptionChosen (not notHasPrepTag) so it persists
  // run-long regardless of prep-tag state. prepTags now survive reshuffles
  // (PREP-PERSIST 2026-07-04) — this test remains valid because the gate
  // mechanism is independent of prepTags.
```

```ts
// BEFORE (~line 1863):
  it('stays blocked after a reshuffle wipes prepTags (regression)', () => {

// AFTER:
  it('stays blocked run-long via cardOptionChosen gate (regression)', () => {
```

Also update the inline comment at line 1870:

```ts
// BEFORE:
      prepTags: [], // reshuffle cleared tags — the old gate would wrongly re-open here

// AFTER:
      prepTags: [], // empty — gate is cardOptionChosen, independent of prepTags
```

- [ ] **Step 7: Run full suite — all tests pass**

```bash
npx vitest run
```

Expected: all tests pass. The 2 previously failing tests now pass.

- [ ] **Step 8: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/state/gameStore.ts src/state/gameStore.test.ts && git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "engine: prep tags persist across reshuffle (PREP-PERSIST)"
```

---

### Task 2: Data — carrier guards for opium_pact and attended_seance

**Files:**
- Modify: `src/data/cards/core.ts` (~lines 454–457, ~lines 571–581, ~lines 166–169)
- Modify: `src/state/gameStore.test.ts` (add new describe after line 503)

**Interfaces:**
- Consumes: `checkCondition` from `'../engine/godPath'` (already imported in test file, line 4)
- Consumes: `CORE_CARDS` from `'../data'` (already imported in test file, line 6)
- Consumes: `STARTING_RESOURCES` from `'../engine/resources'` (already imported, line 10)
- Produces: `the_opium_den` opt 0 blocked when `prepTags` includes `'opium_pact'`
- Produces: `the_seance` opt 0 blocked when `prepTags` includes `'attended_seance'`

- [ ] **Step 1: Write failing tests for the two carrier guards**

In `gameStore.test.ts`, add a new describe block immediately after the closing `})` of `'save/load prepTags'` (~line 503):

```ts
describe('carrier guards: notHasPrepTag blocks re-acquisition while tag held', () => {
  const minState = (prepTags: string[]) => ({
    resources: STARTING_RESOURCES,
    deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
    godPathProgress: 0,
    runConfig: { godPath: 'yha_nthlei' as const, runLength: 'short' as const },
    cardRunState: {},
    prepTags,
  })

  it('the_opium_den opt 0 is blocked when opium_pact is already held', () => {
    const card = CORE_CARDS.find(c => c.id === 'the_opium_den')!
    const opt  = card.options[0]
    expect(opt.condition).toBeDefined()
    expect(checkCondition(opt.condition!, minState(['opium_pact']))).toBe(false)
    // Without the tag, still passes the resource check (3 followers ≥ 2)
    expect(checkCondition(opt.condition!, minState([]))).toBe(true)
  })

  it('the_seance opt 0 is blocked when attended_seance is already held', () => {
    const card = CORE_CARDS.find(c => c.id === 'the_seance')!
    const opt  = card.options[0]
    expect(opt.condition).toBeDefined()
    expect(checkCondition(opt.condition!, minState(['attended_seance']))).toBe(false)
    // Without the tag, option is open
    expect(checkCondition(opt.condition!, minState([]))).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — confirm the 2 new tests fail**

```bash
npx vitest run --reporter=verbose 2>&1 | grep -E "(FAIL|PASS|carrier guard)"
```

Expected: 2 failures — `the_opium_den` opt 0 has no condition containing `notHasPrepTag`; `the_seance` opt 0 has no condition at all.

- [ ] **Step 3: Add guard to `the_opium_den` opt 0**

In `core.ts`, find `the_opium_den` (~line 442). Its first option starts at ~line 448. Change only its `condition`:

```ts
// BEFORE (~line 456):
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },

// AFTER:
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'followers', min: 2 },
            { type: 'notHasPrepTag', tag: 'opium_pact' },
          ],
        },
```

- [ ] **Step 4: Add guard to `the_seance` opt 0**

In `core.ts`, find `the_seance` (~line 568). Its first option (`label: 'Attend and steer'`) starts ~line 571. It currently has no `condition`. Add one after `dreadPressureScaling: true,`:

```ts
// BEFORE (~lines 571–581):
      {
        label: 'Attend and steer',
        flavourText: 'It worked. You steered. Something else was also steering.',
        dreadPressureScaling: true,
        effects: [

// AFTER:
      {
        label: 'Attend and steer',
        flavourText: 'It worked. You steered. Something else was also steering.',
        dreadPressureScaling: true,
        condition: { type: 'notHasPrepTag', tag: 'attended_seance' },
        effects: [
```

- [ ] **Step 5: Update the `the_old_book` comment**

In `core.ts` ~lines 166–169, find:

```ts
        // P19-26: grey out once 'studied' is already held — re-picking
        // before the tag is consumed just re-pays gold/dread for nothing.
        // Tag clears on reshuffle / when a chain card consumes it, which
        // correctly re-enables re-studying.
```

Replace with:

```ts
        // P19-26: grey out once 'studied' is already held — re-picking
        // before the tag is consumed just re-pays gold/dread for nothing.
        // Tag is cleared when a chain card consumes it (PREP-PERSIST:
        // tags no longer clear on reshuffle — 2026-07-04).
```

- [ ] **Step 6: Run full suite — all tests pass**

```bash
npx vitest run
```

Expected: all tests pass including the 2 new carrier guard tests.

- [ ] **Step 7: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/core.ts src/state/gameStore.test.ts && git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "data: notHasPrepTag guards on opium_pact + attended_seance carriers"
```

---

### Task 3: UI — swap menu passive rows for prep-tag display

**Files:**
- Modify: `src/components/game/InGameMenuButton.tsx`

**Interfaces:**
- Consumes: `buildPrepTagPills(prepTags: string[]): { tag: PrepTag; label: string }[]` from `'../../data/godPaths/prepTagCarriers'`
- Consumes: `prepTags: string[]` from `useGameStore(s => s.prepTags)`
- Produces: popover top section shows purple ❖ pills for held prep tags (hidden when none held)

- [ ] **Step 1: Delete the four helper functions and two type aliases**

Remove each of these blocks entirely (leave no blank lines in their place beyond a single separator):

```ts
// DELETE — type aliases (~lines 13–18):
type ResourceDelta = Partial<Record<ResourceKey, number>>
type CategoryData = {
  deterministic: ResourceDelta
  probabilisticCards: Card[]
}

// DELETE — aggregate function (~lines 22–33):
function aggregate(effects: Effect[]): { deterministic: ResourceDelta; hasProbabilistic: boolean } { ... }

// DELETE — buildCategory function (~lines 35–48):
function buildCategory(cards: Card[], getEffects: (c: Card) => Effect[] | undefined): CategoryData { ... }

// DELETE — DeltaTags component (~lines 59–80):
function DeltaTags({ deltas }: { deltas: ResourceDelta }) { ... }

// DELETE — ProbabilisticLine component (~lines 82–106):
function ProbabilisticLine({ effects }: { effects: Effect[] }) { ... }
```

- [ ] **Step 2: Remove now-unused imports and `deck` subscription**

At the top of the file:

```ts
// BEFORE:
import type { ResourceKey, Card, Effect } from '../../types'
import { RESOURCE_ICONS, RESOURCE_ORDER } from './ResourceIcons'

// AFTER: delete both lines entirely
```

Add the prep-tag import in their place (after the existing engine imports):

```ts
import { buildPrepTagPills } from '../../data/godPaths/prepTagCarriers'
```

In the component body, remove the `deck` subscription (it was only used for the passive-row aggregation):

```ts
// BEFORE (~line 133):
  const deck  = useGameStore(s => s.deck)

// AFTER: delete this line
```

- [ ] **Step 3: Remove the derived passive-row values**

In the component body, delete:

```ts
// DELETE (~lines 194–200):
  const allCards = [...deck.drawPile, ...deck.discardPile]
  const reshuffleCards = allCards.filter(c => c.passive?.trigger === 'reshuffle')
  const onDrawCards    = allCards.filter(c => c.onDraw && c.onDraw.length > 0)
  const reshuffleData = buildCategory(reshuffleCards, c => c.passive?.effects)
  const onDrawData    = buildCategory(onDrawCards,    c => c.onDraw)
```

- [ ] **Step 4: Add prep-tag state**

In the component body, after the existing `useGameStore` calls, add:

```ts
  const prepPills = buildPrepTagPills(useGameStore(s => s.prepTags))
```

- [ ] **Step 5: Remove the reshuffle/ondraw JSX block**

In the popover JSX, delete from the `{/* Reshuffle row */}` comment through the closing `)}` of the on-draw probabilistic lines (~lines 248–271):

```tsx
// DELETE entire block:
          {/* Reshuffle row */}
          <div style={{ ... }}>
            <span style={{ ... }}>↻ each reshuffle</span>
            <DeltaTags deltas={reshuffleData.deterministic} />
          </div>
          {reshuffleData.probabilisticCards.map(c => (
            <ProbabilisticLine key={c.id} effects={c.passive?.effects ?? []} />
          ))}
          {/* On draw row */}
          <div style={{ ... }}>
            <span style={{ ... }}>⬇ on draw</span>
            <DeltaTags deltas={onDrawData.deterministic} />
          </div>
          {onDrawData.probabilisticCards.map(c => (
            <ProbabilisticLine key={c.id} effects={c.onDraw!} />
          ))}
```

- [ ] **Step 6: Add prep-tag JSX block in its place**

Insert this block where the deleted reshuffle/ondraw block was (directly above `{/* ── Audio section ── */}`):

```tsx
          {/* Prep tags */}
          {prepPills.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{
                fontSize: '0.7rem',
                color: 'rgba(200,144,32,0.75)',
                fontVariant: 'small-caps',
                letterSpacing: '0.08em',
                marginBottom: '0.35rem',
              }}>
                Preparations
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {prepPills.map(({ tag, label }) => (
                  <span key={tag} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                    fontSize: '0.75rem',
                    color: '#9b7bd4',
                    textShadow: '0 0 6px rgba(155,123,212,0.5)',
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(155,123,212,0.35)',
                    padding: '0.08rem 0.35rem',
                    borderRadius: '2px',
                    fontVariant: 'small-caps',
                    letterSpacing: '0.05em',
                  }}>
                    <span>❖</span><span>{label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
```

- [ ] **Step 7: Run full suite — all tests pass**

```bash
npx vitest run
```

Expected: all tests pass. (No unit tests for the UI component — verify visually in dev server.)

- [ ] **Step 8: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/game/InGameMenuButton.tsx && git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "ui: swap menu passive rows for persistent prep-tag display (P19-27/P20-M)"
```
