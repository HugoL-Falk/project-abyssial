# Cluster A — Activity Log Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate `InsertPreviewOverlay`, `DoomPanel`, and `OutcomeReveal` into the existing `ActivityLog`, becoming a single batched surface beneath the DrawPile that shows what happened on the most recent beat (option resolve, reshuffle, or overflow/deficit fire).

**Architecture:** The engine already produces the data we need — `deckChanges`, `capturedOutcome.flavourText`, and the reshuffle/doom paths all flow through `resolveOption` and `reshuffleOnly`. We extend `ActivityEntry` with a `source` discriminator and an optional `flavour` field, replace the "append + cap-5" semantics with "replace per beat" semantics via a `batchSealed` flag, delete the three overlay components plus their orphaned store fields (`pendingDeckChanges`, `pendingOutcomeReveal`), and rewrite the `ActivityLog` render to display 1–3 rows per beat with the new source-driven styling.

**Tech Stack:** TypeScript, React, Zustand, Vitest, Vite. All under `Code/project-abyssial/`.

**Spec:** `docs/superpowers/specs/2026-06-16-activity-log-consolidation-design.md`

---

## File Structure

**Modify:**
- `src/types/index.ts` — extend `ActivityEntry`, remove `pendingDeckChanges` and `pendingOutcomeReveal` from `GameState`, add `batchSealed: boolean`.
- `src/state/gameStore.ts` — rewrite `appendActivity` helper to replace-on-new-beat, push the new entry types from `resolveOption` and `reshuffleOnly`, remove `pendingDeckChanges`/`pendingOutcomeReveal` writes, add `doomEscalate` + `insert{source:'doom'}` rows in `reshuffleOnly`.
- `src/components/game/ActivityLog.tsx` — rewrite render to handle new entry kinds/sources, drop opacity ladder, add god-path accent and flavour rendering. Remove the 5-row cap.
- `src/components/GameScreen.tsx` — delete `InsertPreviewOverlay`, `DoomPanel`, and (if present) `OutcomeReveal` mount points and supporting state.
- `src/components/game/tags/RandomOutcomeTag.tsx` — add 1px border outline to the `+card` / `−card` buttons inside the popover (P16-47 / P16-21).
- `src/index.css` — remove `flip-scene` and `shrink-to-deck` keyframes if orphaned after `InsertPreviewOverlay` deletion.
- `src/state/gameStore.test.ts` — add tests for new batch lifecycle and entry shapes.

**Delete:**
- `src/components/game/InsertPreviewOverlay.tsx`
- `src/components/game/DoomPanel.tsx`
- `src/components/game/OutcomeReveal.tsx`

**Not touched:**
- Engine deck logic (`engine/deck.ts`, `engine/gameLoop.ts`) — data flow is correct already.
- `RandomOutcomeTag` core behaviour — only the popover button border changes.

---

## Pre-work — verify environment

- [ ] **Step 0.1: Confirm working directory and tests pass**

Run from `Code/project-abyssial/`:
```bash
npm test -- --run
```
Expected: all existing tests pass. If they don't, stop and report — do not start the plan on a broken baseline.

- [ ] **Step 0.2: Grep for the three overlay components to confirm call sites**

```bash
grep -rn "InsertPreviewOverlay\|DoomPanel\|OutcomeReveal" src
```
Expected: matches in `GameScreen.tsx` (imports + JSX mounts) and the three component files themselves. Note any other unexpected call sites and append them to Task 8.

---

## Task 1: Extend `ActivityEntry` and clean `GameState` types

**Files:**
- Modify: `src/types/index.ts` (around lines 200-220)

- [ ] **Step 1.1: Read the existing `ActivityEntry` and `GameState` fields**

Locate `ActivityEntry` (≈ lines 214-219) and the `pendingOutcomeReveal` / `pendingDeckChanges` / `activityLog` fields on `GameState` (≈ lines 200-212).

- [ ] **Step 1.2: Replace `ActivityEntry` with the extended discriminated union**

Replace the existing `ActivityEntry` block with:

```ts
// ─── Activity Log ─────────────────────────────────────────────────────────────
// One batch of rows shown beneath the DrawPile. A batch represents events from
// the most recent player-action beat (option resolved, reshuffle, or
// overflow/deficit fire). Cap = 3 rows; typical = 1-2.
export type ActivityInsertSource = 'godPath' | 'random' | 'overflow' | 'deficit' | 'doom' | 'option'
export type ActivityPurgeSource  = 'recover' | 'option'

export type ActivityEntry =
  | { kind: 'reshuffle';    count: number }
  | { kind: 'doomEscalate' }
  | { kind: 'insert';       card: CardSummary; source: ActivityInsertSource; flavour?: string; godPath?: GodPath }
  | { kind: 'purge';        card: CardSummary; source: ActivityPurgeSource }
```

Note: `source` is **required** on `insert`/`purge` so call sites are forced to declare intent. `godPath` is optional and only set when `source === 'godPath'` so the row can render a god-coloured accent.

- [ ] **Step 1.3: Remove `pendingDeckChanges` and `pendingOutcomeReveal` from `GameState`, add `activityBatchSealed`**

Find and delete these lines on `GameState`:
```ts
// Transient: card-effect reveal shown after option resolution.
pendingOutcomeReveal: { flavourText: string } | null
// Transient: cards inserted/removed by the last resolveOption, shown to the player before advancing.
pendingDeckChanges: DeckChanges | null
```

Update the `activityLog` comment and add the sealed flag:
```ts
// Activity log: events from the most recent beat. Cleared & rebuilt per beat.
activityLog: ActivityEntry[]
// True after a beat completes; the next pushActivity call will reset the batch.
activityBatchSealed: boolean
```

- [ ] **Step 1.4: Run typecheck to surface every call site that needs updating**

```bash
npm run build 2>&1 | head -60
```
Expected: TypeScript errors in `gameStore.ts`, `OutcomeReveal.tsx`, `GameScreen.tsx`, possibly `ActivityLog.tsx`. List them — they're the to-do list for the remaining tasks.

- [ ] **Step 1.5: Commit**

```bash
git add src/types/index.ts
git commit -m "refactor(types): extend ActivityEntry with source/flavour, remove pendingDeckChanges & pendingOutcomeReveal"
```

---

## Task 2: Rewrite `appendActivity` to batch-sealed semantics

**Files:**
- Modify: `src/state/gameStore.ts` (`appendActivity` ≈ lines 273-282, `makeInitialState` ≈ lines 60-90)
- Test: `src/state/gameStore.test.ts` (add new describe block)

- [ ] **Step 2.1: Write failing tests for the new batch lifecycle**

Append to `src/state/gameStore.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
// Note: if appendActivity is currently exported, import it. Otherwise this test
// exercises the lifecycle via direct store manipulation.

describe('activity log batch lifecycle', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('starts empty with batchSealed=false', () => {
    const s = useGameStore.getState()
    expect(s.activityLog).toEqual([])
    expect(s.activityBatchSealed).toBe(false)
  })

  it('pushActivity after sealed batch replaces the batch', () => {
    const { pushActivity, sealActivityBatch } = useGameStore.getState()
    pushActivity({ kind: 'reshuffle', count: 5 })
    sealActivityBatch()
    pushActivity({ kind: 'insert', card: { id: 'x', title: 'X', tier: 'threat' }, source: 'option' })
    const s = useGameStore.getState()
    expect(s.activityLog).toHaveLength(1)
    expect(s.activityLog[0].kind).toBe('insert')
    expect(s.activityBatchSealed).toBe(false)
  })

  it('multiple pushActivity calls in one beat accumulate', () => {
    const { pushActivity } = useGameStore.getState()
    pushActivity({ kind: 'reshuffle', count: 15 })
    pushActivity({ kind: 'doomEscalate' })
    pushActivity({ kind: 'insert', card: { id: 'd', title: 'Doom', tier: 'doom' }, source: 'doom' })
    expect(useGameStore.getState().activityLog).toHaveLength(3)
  })

  it('sealActivityBatch with no entries leaves an empty batch', () => {
    const { sealActivityBatch } = useGameStore.getState()
    sealActivityBatch()
    expect(useGameStore.getState().activityLog).toEqual([])
  })

  it('idle beat clears the previous batch', () => {
    const { pushActivity, sealActivityBatch } = useGameStore.getState()
    pushActivity({ kind: 'insert', card: { id: 'a', title: 'A', tier: 'core' }, source: 'option' })
    sealActivityBatch()
    // Next beat: seal again without pushing -> previous batch persists
    // until the NEXT pushActivity, which will replace it. To model an idle
    // beat that clears, we explicitly check the replacement behavior:
    sealActivityBatch() // double-seal is a no-op
    expect(useGameStore.getState().activityLog).toHaveLength(1) // still visible
    // The clear happens lazily on next push:
    pushActivity({ kind: 'reshuffle', count: 12 })
    expect(useGameStore.getState().activityLog).toEqual([{ kind: 'reshuffle', count: 12 }])
  })
})
```

- [ ] **Step 2.2: Run the test to confirm it fails**

```bash
npm test -- --run gameStore.test
```
Expected: FAIL — `pushActivity` and `sealActivityBatch` don't exist; `activityBatchSealed` is missing from initial state.

- [ ] **Step 2.3: Replace the `appendActivity` helper and add `pushActivity` / `sealActivityBatch` actions**

In `src/state/gameStore.ts`, delete the existing `MAX_ACTIVITY_LOG_ROWS` const and the `appendActivity` helper (≈ lines 273-282). Replace with:

```ts
// ─── Activity Log Helpers ──────────────────────────────────────────────────────
// Lazy replace-on-next-push: after a beat seals, the next pushActivity call
// discards the sealed batch and starts fresh. This gives us "1 idle beat = clear"
// for free: if a beat produces zero pushActivity calls, the seal-then-push from
// the NEXT beat will replace the (now-stale) batch.

function pushActivityHelper(
  log: ActivityEntry[],
  sealed: boolean,
  entries: ActivityEntry[],
): { activityLog: ActivityEntry[]; activityBatchSealed: false } {
  const base = sealed ? [] : log
  return {
    activityLog: [...base, ...entries],
    activityBatchSealed: false,
  }
}
```

Then add to `GameActions` (≈ lines 94-128):

```ts
  // Activity log
  pushActivity: (...entries: ActivityEntry[]) => void
  sealActivityBatch: () => void
```

And add the implementations inside the `create((set, get) => ({ ... }))` block, alongside the other actions:

```ts
  pushActivity: (...entries) => set(s => pushActivityHelper(s.activityLog, s.activityBatchSealed, entries)),
  sealActivityBatch: () => set({ activityBatchSealed: true }),
```

- [ ] **Step 2.4: Add `activityBatchSealed: false` to every state-setting location**

Update `makeInitialState()` to include `activityBatchSealed: false`. Then find every `set({...})` call that sets `activityLog: []` (startRun, startTutorial, loadRun — there are 3) and add `activityBatchSealed: false` next to each. **Do not** add it elsewhere — beat-time pushes manage the flag themselves.

- [ ] **Step 2.5: Run the test to confirm it passes**

```bash
npm test -- --run gameStore.test
```
Expected: PASS for the new describe block.

- [ ] **Step 2.6: Commit**

```bash
git add src/state/gameStore.ts src/state/gameStore.test.ts src/types/index.ts
git commit -m "feat(state): pushActivity/sealActivityBatch with replace-on-next-push semantics"
```

---

## Task 3: Wire reshuffleOnly to push `reshuffle + doomEscalate + insert{source:'doom'}`

**Files:**
- Modify: `src/state/gameStore.ts` (`reshuffleOnly` ≈ lines 1049-1086)
- Test: `src/state/gameStore.test.ts`

- [ ] **Step 3.1: Write the failing test**

Append to `gameStore.test.ts`:

```ts
describe('reshuffleOnly activity batch', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('non-tutorial reshuffle emits [reshuffle, doomEscalate, insert{source:doom}]', () => {
    // Set up a minimal playing run with empty draw pile so reshuffleOnly fires.
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [{ id: 'congregation_meets', title: 'Congregation Meets', tier: 'core', options: [] } as never], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      blessings: { unlocked: [], selected: [] },
      activityLog: [],
      activityBatchSealed: true, // simulate that a previous beat had sealed
    })

    useGameStore.getState().reshuffleOnly()

    const log = useGameStore.getState().activityLog
    expect(log[0].kind).toBe('reshuffle')
    expect(log[1].kind).toBe('doomEscalate')
    expect(log[2].kind).toBe('insert')
    if (log[2].kind === 'insert') {
      expect(log[2].source).toBe('doom')
    }
    expect(log).toHaveLength(3)
  })

  it('tutorial reshuffle emits only [reshuffle]', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'olgreth', runLength: 'short', isTutorial: true },
      deck: { drawPile: [], discardPile: [{ id: 't', title: 'T', tier: 'core', options: [] } as never], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      activityLog: [],
      activityBatchSealed: true,
    })
    useGameStore.getState().reshuffleOnly()
    const log = useGameStore.getState().activityLog
    expect(log).toHaveLength(1)
    expect(log[0].kind).toBe('reshuffle')
  })
})
```

- [ ] **Step 3.2: Run the test to confirm it fails**

```bash
npm test -- --run gameStore.test
```
Expected: FAIL — the third entry will be missing (currently only `reshuffle` is pushed), or older signatures will mismatch.

- [ ] **Step 3.3: Rewrite the `reshuffleOnly` activity push**

In `reshuffleOnly` (≈ line 1049), find the two existing places that push `{ kind: 'reshuffle', count: ... }`:

Tutorial branch (≈ line 1060):
```ts
set({
  deck,
  activityLog: appendActivity(state.activityLog, { kind: 'reshuffle', count: deck.drawPile.length }),
})
```
Replace with:
```ts
set(pushActivityHelper(state.activityLog, state.activityBatchSealed, [
  { kind: 'reshuffle', count: deck.drawPile.length },
]))
set({ deck })
```

Non-tutorial branch (≈ line 1076-1085): the final `set({...})` currently appends only the reshuffle entry. Compute and push all three entries by inspecting the deck after reshuffle for the unravelling card:

```ts
const insertedDoom = deck.drawPile.find(c => c.tier === 'doom')
  ?? deck.discardPile.find(c => c.tier === 'doom')
  ?? deck.nextCycleQueue.find(c => c.tier === 'doom')

const batchEntries: ActivityEntry[] = [
  { kind: 'reshuffle', count: deck.drawPile.length },
  { kind: 'doomEscalate' },
]
if (insertedDoom) {
  batchEntries.push({
    kind: 'insert',
    card: toSummary(insertedDoom),
    source: 'doom',
  })
}

set({
  deck,
  resources,
  reshuffleCount,
  unravellingTier,
  pendingUnravelling: false,
  usedRareIds: nextUsedRareIds,
  ...pushActivityHelper(state.activityLog, state.activityBatchSealed, batchEntries),
})
```

Note: `pushActivityHelper` returns `{ activityLog, activityBatchSealed: false }` — spreading it into the `set` payload merges cleanly.

- [ ] **Step 3.4: Run the test to confirm it passes**

```bash
npm test -- --run gameStore.test
```
Expected: PASS.

- [ ] **Step 3.5: Commit**

```bash
git add src/state/gameStore.ts src/state/gameStore.test.ts
git commit -m "feat(reshuffle): emit reshuffle + doomEscalate + insert{source:doom} as one batch"
```

---

## Task 4: Wire `resolveOption` to push directly, drop `pendingDeckChanges` / `pendingOutcomeReveal`

**Files:**
- Modify: `src/state/gameStore.ts` (`resolveOption` ≈ lines 563-951, drawNextCard ≈ line 556)
- Test: `src/state/gameStore.test.ts`

- [ ] **Step 4.1: Write the failing test**

Append to `gameStore.test.ts`. We need helper deck/card fixtures that already exist in earlier tests in the file — copy that pattern. The new tests:

```ts
describe('resolveOption activity batch', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('emits insert{source:option} for an option-driven insert', () => {
    // Use a real card that inserts another — e.g. relic_market opt that inserts X.
    // Build a minimal playing state where resolving option 0 of currentCard triggers insertCard.
    const insertingCard = {
      id: 'test_insert', title: 'Test Insert', tier: 'core' as const,
      options: [{ id: 'o', label: 'Add', effects: [{ type: 'insertCard', cardId: 'congregation_meets', position: 'random' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: insertingCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const log = useGameStore.getState().activityLog
    const insert = log.find(e => e.kind === 'insert')
    expect(insert).toBeDefined()
    if (insert?.kind === 'insert') {
      expect(insert.source).toBe('option')
      expect(insert.card.id).toBe('congregation_meets')
    }
  })

  it('emits flavour on insert{source:random} when the chosen branch has flavour text', () => {
    // Construct a card with a randomOutcome effect whose chosen branch carries flavourText
    // and a deterministic outcome. Use weight=1 single-branch so capturedOutcome is guaranteed.
    const card = {
      id: 'test_random', title: 'Test Random', tier: 'core' as const,
      options: [{
        id: 'o', label: 'Roll',
        effects: [{
          type: 'randomOutcome',
          outcomes: [{
            weight: 1,
            flavourText: 'A wave breaks.',
            effects: [{ type: 'insertCard', cardId: 'congregation_meets', position: 'random' }],
          }],
        }],
      }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const log = useGameStore.getState().activityLog
    const insert = log.find(e => e.kind === 'insert')
    expect(insert).toBeDefined()
    if (insert?.kind === 'insert') {
      expect(insert.source).toBe('random')
      expect(insert.flavour).toBe('A wave breaks.')
    }
  })

  it('emits insert{source:godPath, godPath:yha_nthlei} for god-path insertions', () => {
    // Find a real god_path-tier card from data and trigger its insertion via insertCard effect.
    // Use a fixture card with surfaceChainCard or direct insertCard of a god_path cardId.
    const card = {
      id: 'test_gp', title: 'Test GP', tier: 'core' as const,
      options: [{ id: 'o', label: 'Open', effects: [{ type: 'insertCard', cardId: 'yha_nthlei_1', position: 'random' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [{ id: 'congregation_meets', title: 'C', tier: 'core' } as never], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const log = useGameStore.getState().activityLog
    const insert = log.find(e => e.kind === 'insert' && e.source === 'godPath')
    expect(insert).toBeDefined()
    if (insert?.kind === 'insert') {
      expect(insert.godPath).toBe('yha_nthlei')
    }
  })

  it('emits purge{source:option} on removeCard effect', () => {
    const card = {
      id: 'test_purge', title: 'Test Purge', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeCard', cardId: 'congregation_meets' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [{ id: 'congregation_meets', title: 'C', tier: 'core' } as never], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const log = useGameStore.getState().activityLog
    const purge = log.find(e => e.kind === 'purge')
    expect(purge).toBeDefined()
    if (purge?.kind === 'purge') {
      expect(purge.source).toBe('option')
    }
  })
})
```

If the card-fixture shape (`options[].effects[]`) does not match the project's actual schema, adjust the literal to whatever real test fixtures elsewhere in `gameStore.test.ts` use, and import from `src/data` if needed.

- [ ] **Step 4.2: Run the tests to confirm they fail**

```bash
npm test -- --run gameStore.test
```
Expected: FAIL — current `resolveOption` writes everything into `pendingDeckChanges` (going away) and the entries it does push lack `source`.

- [ ] **Step 4.3: Augment `appendInsertionDiff` and `deckChanges` to carry source metadata**

Change `DeckChanges` in `src/types/index.ts` to track source per insertion:

```ts
export type DeckInsertion = { card: CardSummary; source: ActivityInsertSource; flavour?: string; godPath?: GodPath }
export type DeckRemoval   = { card: CardSummary; source: ActivityPurgeSource }
export type DeckChanges   = { inserted: DeckInsertion[]; removed: DeckRemoval[] }
```

Update `appendInsertionDiff` signature in `gameStore.ts` to take a `source` parameter:

```ts
function appendInsertionDiff(
  before: DeckState,
  after: DeckState,
  changes: DeckChanges,
  source: ActivityInsertSource,
): void {
  // ... existing body, but replace `changes.inserted.push(toSummary(c))` with:
  //     changes.inserted.push({ card: toSummary(c), source })
}
```

Pass the right source from each call site inside `resolveOption`:
- `applyOverflowEffects` diff → `'overflow'`
- `applyDeficitEffects` diff → `'deficit'`
- (Doom is reshuffleOnly territory, not resolveOption.)

For the direct `deckChanges.inserted.push(...)` lines inside the `insertCard` switch case (≈ lines 659-684), wrap each:
- The god-path branch (≈ line 654, where `toInsert.tier === 'god_path'`): push as `{ card: toSummary(toInsert), source: 'godPath', godPath: toInsert.godPath }`
- Every other branch in that case: push as `{ card: toSummary(toInsert), source: 'option' }` UNLESS the effect originated from a random outcome — see Step 4.4.

For the `removeCard` and `removeRandomThreat` cases, update the existing `deckChanges.removed.push(toSummary(...))` to `deckChanges.removed.push({ card: toSummary(...), source: 'option' })`.

The `surfaceGodPathCard` case (≈ line 776): `{ card: toSummary(card), source: 'godPath', godPath: card.godPath }`.

- [ ] **Step 4.4: Thread `flavour` through random-outcome insertions**

The current `expandEffectsWithCapture` returns `capturedOutcome.flavourText`. We need to know which inserted card came from that random branch. Simplest mechanism: track the index range in `effectiveEffects` that came from the random expansion.

In `engine/gameLoop.ts`, read `expandEffectsWithCapture` and change its return shape to:

```ts
export function expandEffectsWithCapture(base: Effect[]): {
  expanded: Effect[]
  capturedOutcome: { flavourText?: string; expandedStart: number; expandedEnd: number } | null
}
```

Where `expandedStart` / `expandedEnd` are the index slice inside `expanded` that came from the random expansion. (If multiple `randomOutcome` effects exist on one option, capture only the first — current code already does this.)

Back in `resolveOption`, during the effect loop, track `const effectIdx = ...` (just use the loop's index) and check `capturedOutcome && effectIdx >= capturedOutcome.expandedStart && effectIdx < capturedOutcome.expandedEnd`. When true, any `insertCard` pushed in that iteration becomes `{ ..., source: 'random', flavour: capturedOutcome.flavourText }` instead of `'option'`.

If `expandEffectsWithCapture` is non-trivial to extend, fall back to: re-walk `baseEffects` looking for the chosen branch in the (one) `randomOutcome` effect and check whether the current insert matches a cardId in that branch's effects. Document whichever approach is taken with a comment.

- [ ] **Step 4.5: Push the activity batch from `resolveOption` and drop `pendingDeckChanges` / `pendingOutcomeReveal`**

Replace the activity-log block (≈ lines 921-925) and the trailing `set({ ... pendingOutcomeReveal: ..., pendingDeckChanges: ... })` (≈ lines 927-948) with:

```ts
const batchEntries: ActivityEntry[] = [
  ...deckChanges.inserted.map((ins): ActivityEntry => ({
    kind: 'insert', card: ins.card, source: ins.source,
    ...(ins.flavour ? { flavour: ins.flavour } : {}),
    ...(ins.godPath ? { godPath: ins.godPath } : {}),
  })),
  ...deckChanges.removed.map((rem): ActivityEntry => ({
    kind: 'purge', card: rem.card, source: rem.source,
  })),
]

set({
  resources,
  deck,
  godPathProgress,
  phase,
  failureReason,
  pendingGameOver: pendingGameOverLocal ?? state.pendingGameOver,
  unravellingTier,
  pendingUnravelling,
  currentCard: null,
  partialVictoryGod,
  activeWhispers,
  whisperCounselPenaltyActive,
  cardRunState,
  ...(batchEntries.length > 0
    ? pushActivityHelper(state.activityLog, state.activityBatchSealed, batchEntries)
    : { activityBatchSealed: true }),
})
```

Note: when there are zero new entries, we only flip `activityBatchSealed: true` — the existing log persists until the next pushActivity, satisfying the "log holds last beat's events until something new happens" guarantee.

- [ ] **Step 4.6: Seal the batch at the start of each new beat**

In `drawNextCard` (≈ line 542-558), add `activityBatchSealed: true` to the final `set({...})` so a draw that produces nothing (no overflow, no doom escalate, etc.) seals an empty batch — the on-draw effects path already calls overflow/deficit but those write to the deck, not the log. We want the next *option resolution* or *reshuffle* to start fresh. Confirmed correct: setting `activityBatchSealed: true` here is the "beat boundary".

If `drawNextCard` itself does anything log-worthy in the future, swap this for explicit `pushActivity` calls then seal at end.

- [ ] **Step 4.7: Run the tests to confirm they pass**

```bash
npm test -- --run gameStore.test
```
Expected: PASS for all 4 new resolveOption tests.

- [ ] **Step 4.8: Commit**

```bash
git add src/state/gameStore.ts src/state/gameStore.test.ts src/types/index.ts src/engine/gameLoop.ts
git commit -m "feat(resolve): write activity batch directly, drop pendingDeckChanges/pendingOutcomeReveal"
```

---

## Task 5: Rewrite `ActivityLog.tsx`

**Files:**
- Modify: `src/components/game/ActivityLog.tsx` (full rewrite)

- [ ] **Step 5.1: Read the current `ActivityLog.tsx` for visual baseline**

Already done in exploration. Key carry-overs: dark parchment background, `Georgia` font, click-to-preview via `onPreviewCard`, dotted bottom border between rows.

- [ ] **Step 5.2: Replace the file with the new implementation**

Write to `src/components/game/ActivityLog.tsx`:

```tsx
import { useGameStore } from '../../state/gameStore'
import type { ActivityEntry, GodPath } from '../../types'

const RED_TIERS = new Set(['threat', 'doom', 'overflow', 'deficit'])

const GOD_ACCENT: Record<GodPath, string> = {
  yha_nthlei:    '#5fb8c8', // cyan
  nyarlathotep:  '#9b6fc8', // purple
  shub_niggurath:'#6fb86a', // green
  olgreth:       '#c8a05f', // tutorial fallback gold
}

export function ActivityLog({ onPreviewCard }: { onPreviewCard: (id: string) => void }) {
  const log = useGameStore(s => s.activityLog)
  if (log.length === 0) return null

  return (
    <div
      role="log"
      aria-live="polite"
      style={{
        width: '260px',
        margin: '0.6rem auto 0',
        background: 'rgba(20, 16, 12, 0.85)',
        border: '1px solid #3a2e1f',
        borderRadius: '4px',
        padding: '0.45rem 0.6rem',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Georgia, serif',
      }}
    >
      {log.map((entry, i) => (
        <ActivityRow key={`${i}-${entryKey(entry)}`} entry={entry} onPreviewCard={onPreviewCard} />
      ))}
    </div>
  )
}

function entryKey(e: ActivityEntry): string {
  switch (e.kind) {
    case 'reshuffle':    return `r-${e.count}`
    case 'doomEscalate': return 'de'
    case 'insert':       return `i-${e.source}-${e.card.id}`
    case 'purge':        return `p-${e.source}-${e.card.id}`
  }
}

function ActivityRow({ entry, onPreviewCard }: {
  entry: ActivityEntry
  onPreviewCard: (id: string) => void
}) {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.25rem 0.35rem',
    fontSize: '0.85rem',
    borderBottom: '1px dotted rgba(120, 100, 70, 0.2)',
    animation: 'activityRowIn 0.2s ease-out',
  }

  if (entry.kind === 'reshuffle') {
    return (
      <div style={{ ...baseStyle, color: '#8a7a5a', fontStyle: 'italic' }}>
        <span style={{ width: '14px', textAlign: 'center', fontWeight: 'bold' }}>↻</span>
        <span>A new week begins.</span>
        <span style={{ opacity: 0.6 }}> · {entry.count} cards</span>
      </div>
    )
  }

  if (entry.kind === 'doomEscalate') {
    return (
      <div style={{ ...baseStyle, color: '#c84a3a', fontVariant: 'small-caps', letterSpacing: '0.08em' }}>
        <span style={{ width: '14px', textAlign: 'center', fontWeight: 'bold' }}>⚠</span>
        <span>Doom escalates</span>
      </div>
    )
  }

  // insert | purge
  const isInsert = entry.kind === 'insert'
  const isRed = isInsert ? RED_TIERS.has(entry.card.tier) : true
  const symbol = isInsert ? '+' : '−'
  const color  = isRed ? '#c84a3a' : '#d4c8a8'
  const accent = isInsert && entry.source === 'godPath' && entry.godPath
    ? GOD_ACCENT[entry.godPath]
    : null
  const flavour = isInsert && entry.source === 'random' ? entry.flavour : undefined

  return (
    <button
      type="button"
      onClick={() => onPreviewCard(entry.card.id)}
      style={{
        ...baseStyle,
        background: 'transparent',
        border: '1px solid rgba(200, 185, 155, 0.28)',
        borderLeft: accent ? `3px solid ${accent}` : '1px solid rgba(200, 185, 155, 0.28)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'Georgia, serif',
        width: '100%',
        color,
      }}
    >
      <span style={{ width: '14px', textAlign: 'center', fontWeight: 'bold' }}>{symbol}</span>
      {flavour && (
        <span style={{ fontStyle: 'italic', opacity: 0.85, marginRight: '0.25rem' }}>
          {flavour}
        </span>
      )}
      <span style={{ flex: 1 }}>{entry.card.title}</span>
    </button>
  )
}
```

- [ ] **Step 5.3: Typecheck**

```bash
npm run build 2>&1 | head -40
```
Expected: clean for ActivityLog. If `GodPath` is not exported from `src/types`, add it to that file's exports.

- [ ] **Step 5.4: Commit**

```bash
git add src/components/game/ActivityLog.tsx
git commit -m "feat(activity-log): render new entry kinds with source-driven styling"
```

---

## Task 6: Delete the three overlay components and their mount sites

**Files:**
- Delete: `src/components/game/InsertPreviewOverlay.tsx`, `src/components/game/DoomPanel.tsx`, `src/components/game/OutcomeReveal.tsx`
- Modify: `src/components/GameScreen.tsx` (imports + JSX mounts at lines 11, 14, 15, 270, 272, 327, plus any reshuffleToast / pending-state plumbing those mounts depend on)

- [ ] **Step 6.1: Read `GameScreen.tsx` around the mount sites to understand local state**

```bash
grep -n "InsertPreviewOverlay\|DoomPanel\|OutcomeReveal\|reshuffleToast\|pendingDeckChanges\|pendingOutcomeReveal" src/components/GameScreen.tsx
```

Note every local state hook (`useState`), `useEffect`, and prop wiring tied to these three components — they are now orphaned.

- [ ] **Step 6.2: Delete the three component files**

```bash
rm src/components/game/InsertPreviewOverlay.tsx
rm src/components/game/DoomPanel.tsx
rm src/components/game/OutcomeReveal.tsx
```

- [ ] **Step 6.3: Remove imports and JSX mounts from `GameScreen.tsx`**

Delete:
- `import { InsertPreviewOverlay } from './game/InsertPreviewOverlay'`
- `import { DoomPanel } from './game/DoomPanel'`
- Any `OutcomeReveal` import.
- The JSX mount `{reshuffleToast && <DoomPanel tier={reshuffleToast.tier} />}` and the `reshuffleToast` `useState` + the effect that sets it.
- The `<InsertPreviewOverlay ... />` mount block (≈ line 327) and any `pendingInsert`-style local state driving it.
- Any `<OutcomeReveal />` mount.

Where local effects watched `pendingDeckChanges` or `pendingOutcomeReveal` from the store, delete the watching code outright — the activity log now renders straight from `activityLog`.

- [ ] **Step 6.4: Typecheck**

```bash
npm run build 2>&1 | head -60
```
Expected: clean. If errors remain about orphaned references, follow them.

- [ ] **Step 6.5: Manual smoke test**

```bash
npm run dev
```
Open the game, start a run, draw cards. Confirm: (a) no overlay appears when a card is inserted, (b) reshuffle shows the log batch above/beneath the deck per spec, (c) clicking a log row opens the existing card preview modal.

- [ ] **Step 6.6: Commit**

```bash
git add -A
git commit -m "refactor: delete InsertPreviewOverlay, DoomPanel, OutcomeReveal — log now owns reveal"
```

---

## Task 7: Add unified outline to `RandomOutcomeTag` popover buttons (P16-47 / P16-21)

**Files:**
- Modify: `src/components/game/tags/RandomOutcomeTag.tsx` (the `insertCard` button ≈ lines 86-103 and the `removeCard` span ≈ lines 108-116)

- [ ] **Step 7.1: Update the `+card` button to wear the outline**

In the `insertCard` button, replace:
```ts
style={{
  color: 'var(--gold-bright)',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  textDecoration: 'underline',
  textDecorationColor: 'rgba(200,144,32,0.4)',
}}
```
with:
```ts
style={{
  color: 'var(--gold-bright)',
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(200,144,32,0.55)',
  borderRadius: '2px',
  padding: '0 0.35rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 'inherit',
}}
```

- [ ] **Step 7.2: Convert the `−card` span to a styled span with the matching outline**

The remove branches currently render plain `<span style={{ color: '#e08080' }}>− card</span>`. Replace both occurrences (`−0 cards` and `− card`) with:
```ts
<span key={efi} style={{
  color: '#e08080',
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(224,128,128,0.55)',
  borderRadius: '2px',
  padding: '0 0.35rem',
}}>− card</span>
```
(and similarly for `− 0 cards`).

- [ ] **Step 7.3: Smoke-test visually**

`npm run dev`. Trigger a random-outcome option (e.g. any card with multiple `weight` outcomes), click the `?` tag, confirm both `+ card` and `− card` show outlined.

- [ ] **Step 7.4: Commit**

```bash
git add src/components/game/tags/RandomOutcomeTag.tsx
git commit -m "feat(random-outcome): unified outline on +card/−card popover buttons (P16-47, P16-21)"
```

---

## Task 8: Cleanup orphans — CSS animations and persistence

**Files:**
- Modify (or no-op): `src/index.css`, `src/engine/persistence.ts`

- [ ] **Step 8.1: Grep for orphaned CSS classes**

```bash
grep -rn "flip-scene\|shrink-to-deck\|flip-inner\|is-flipped\|flip-face\|flip-front" src
```
Expected: no remaining matches outside `index.css` itself. If true, proceed; if there are surviving consumers, leave the CSS as-is and skip step 8.2.

- [ ] **Step 8.2: Remove orphaned keyframes / classes from `index.css`**

Open `src/index.css`, search for the `flip-scene`, `shrink-to-deck`, `flip-inner`, `flip-face`, `flip-front`, `is-flipped` rules and keyframes, delete them.

- [ ] **Step 8.3: Verify persistence no longer references the dropped fields**

```bash
grep -n "pendingDeckChanges\|pendingOutcomeReveal" src/engine/persistence.ts
```
Expected: no matches. If matches exist, remove the corresponding serialise/deserialise lines.

- [ ] **Step 8.4: Run the full test + build to confirm green**

```bash
npm test -- --run && npm run build
```
Expected: green.

- [ ] **Step 8.5: Commit**

```bash
git add -A
git commit -m "chore: remove orphaned flip/shrink CSS and pending-* persistence fields"
```

---

## Task 9: Final verification

- [ ] **Step 9.1: Full test suite**

```bash
npm test -- --run
```
Expected: all green, including the new tests from Tasks 2, 3, 4.

- [ ] **Step 9.2: Build**

```bash
npm run build
```
Expected: clean.

- [ ] **Step 9.3: Manual playthrough checklist**

Run `npm run dev` and verify:
- [ ] Drawing a card that resolves an option with `+card` shows the inserted card in the log beneath the deck, single row, clickable to preview.
- [ ] An option with a `removeCard` effect shows a `− {card}` row in the log.
- [ ] A reshuffle (empty draw pile + click) shows exactly 3 rows in the log: `A new week begins · N cards`, `Doom escalates`, `+ {Doom card}`.
- [ ] No `InsertPreviewOverlay` modal ever appears.
- [ ] No `DoomPanel` ever appears.
- [ ] No `OutcomeReveal` ever appears.
- [ ] An option with a random outcome that has flavour text renders the flavour italicised before the `+ {card}` title within one row.
- [ ] God-path card insertion shows a left-border accent in the god's colour (cyan / purple / green).
- [ ] Overflow trigger (push resource above 10) shows `+ {Overflow card}` in the log.
- [ ] Overflow recovery (drop resource back below 10) shows `− {Overflow card}` in the log.
- [ ] An option that produces no log-worthy events leaves the previous batch visible until the *next* event happens (per the lazy-replace semantics).
- [ ] The `?` random outcome popover shows `+ card` and `− card` as outlined buttons.

- [ ] **Step 9.4: Push**

```bash
git push
```

---

## Plan Self-Review Notes

- **Spec coverage:** every spec section maps to a task. Surface model + position → Task 5; event taxonomy → Tasks 3, 4, 5; data model → Tasks 1, 2; insertion flow rewrite → Task 6; testing → Tasks 2-4; out-of-scope items are not touched.
- **Tickets:** P16-3a (Task 6), P16-47 (Tasks 2-7), P16-47b (Task 4 god-path), P16-49 (Task 2 lifecycle), P16-53 (Task 4 overflow source + Task 5 styling), P16-13a (subsumed in Task 6 DoomPanel deletion), P16-21 (Task 7).
- **Type consistency:** `pushActivityHelper` returns `{ activityLog, activityBatchSealed: false }` — used identically in Tasks 2, 3, 4. `ActivityInsertSource` / `ActivityPurgeSource` defined in Task 1, referenced unchanged in Tasks 2-5. `DeckChanges` shape extended in Task 4 to carry source per insertion/removal, and the `resolveOption` call sites updated in the same task.
- **Open risk:** Step 4.4 (threading `flavour` through random outcomes) requires understanding `expandEffectsWithCapture` — provided fallback strategy if the first approach is awkward.
