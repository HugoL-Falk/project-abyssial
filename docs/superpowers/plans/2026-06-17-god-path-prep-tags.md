# God Path Preparation Tags — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `surfaceGodPathCard` mechanic with a weekly-reset preparation-tag system that unlocks conditional bonus options on chain card stages 2–5, plus introduce a new `deferGodPathCard` effect on two carrier cards.

**Architecture:** New run-state field `prepTags: string[]` cleared on every reshuffle. New effects (`setPrepTag`, `consumePrepTag`, `deferGodPathCard`) and one new condition (`hasPrepTag`). `surfaceGodPathCard` is removed from the type system, engine switch, UI tag rendering, and the 7 card-option call sites. Existing `advanceGodPath` is untouched.

**Tech Stack:** TypeScript, React, Zustand, Vitest. Verify with `npx tsc --noEmit` and `npx vitest run` from `Code/project-abyssial/`.

**Spec:** [[Code/project-abyssial/docs/superpowers/specs/2026-06-17-god-path-prep-tags-design.md]]

## Global Constraints

- **Max 3 options per card.** No card may gain a 4th option in this plan; carriers stay at ≤ 3.
- **`advanceGodPath` is untouched.** It remains only on chain-card advance options and continues to queue the next chain stage.
- **Tag → Stage pairing is uniform across gods:** `studied`↔2, `attended_seance`↔3, `opium_pact`↔4, `recited`↔5. Stages 1 and 6 carry no prep slot.
- **Tags reset on every reshuffle** (both tutorial and non-tutorial branches).
- **❖ (U+2756) is the prep slot marker.** Gold-bright (`var(--gold-bright)`) with `text-shadow: 0 0 6px rgba(200,160,40,0.6)` when the bonus is active; plain text colour on the prep card option badge.
- **Bonus-option content and replacement effects for `the_thing_in_the_tank` / `grove_awaits` are out of scope** — leave `// TODO(thematic): ...` markers for the follow-up content pass.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/types/index.ts` | Type definitions for effects, conditions, state | Modify |
| `src/state/gameStore.ts` | Effect handlers, reshuffle, save/load | Modify |
| `src/engine/godPath.ts` | `checkCondition` switch | Modify |
| `src/engine/gameLoop.ts` | `surfaceGodPathCard` case in effect expansion | Modify |
| `src/components/game/EffectTags.tsx` | Render new effect tags, drop old one | Modify |
| `src/components/game/OptionsColumn.tsx` | ❖ prefix on active prep-bonus options | Modify |
| `src/components/game/CardPreviewModal.tsx` | Show greyed-out bonus options on preview | Modify |
| `src/components/game/WeekBanner.tsx` | Accept `prepNudge` prop, render 4th line | Modify |
| `src/components/GameScreen.tsx` (or banner parent) | Wire `prepNudge` based on godPathProgress | Modify |
| `src/data/cards/core.ts` | the_old_book, the_seance, the_opium_den, the_promotion | Modify |
| `src/data/cards/threats.ts` | what_was_already_read, the_thing_in_the_tank, grove_awaits | Modify |
| `src/data/cards/rare.ts` | Add the_diocese_sends_word | Modify |
| `src/data/cardArt.ts` | Register the_diocese_sends_word art slot | Modify |
| `src/data/godPaths/yha_nthlei.ts` | One end-to-end stub bonus option on stage 2 | Modify |
| `src/state/gameStore.test.ts` | New vitest cases | Modify |
| `Art/Defer Cards/the_diocese_sends_word.md` | Art prompt | Create |

---

## Task 1: Type system — prepTags state + new effect/condition members + remove surfaceGodPathCard

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `GameState.prepTags: string[]`
  - `Effect` union members: `{ type: 'setPrepTag'; tag: string }`, `{ type: 'consumePrepTag'; tag: string }`, `{ type: 'deferGodPathCard' }`
  - `Effect` union NO LONGER contains `{ type: 'surfaceGodPathCard' }`
  - `Condition` union member: `{ type: 'hasPrepTag'; tag: string }`

- [ ] **Step 1: Add `prepTags: string[]` to `GameState`**

Find the `GameState` interface in `src/types/index.ts`. Add a new field next to other run-state fields (near `activityLog` is a natural placement):

```ts
// Preparation tags set by prep-card options. Cleared on every reshuffle.
// Consumed by chain-card bonus options gated via { type: 'hasPrepTag' }.
prepTags: string[]
```

- [ ] **Step 2: Remove `surfaceGodPathCard` from `Effect` union**

Find `| { type: 'surfaceGodPathCard' }` in the `Effect` union and delete that line.

- [ ] **Step 3: Add three new members to the `Effect` union**

In the same union, add:

```ts
| { type: 'setPrepTag'; tag: string }
| { type: 'consumePrepTag'; tag: string }
| { type: 'deferGodPathCard' }
```

- [ ] **Step 4: Add `hasPrepTag` to the `Condition` union**

Find the `Condition` union. Add:

```ts
| { type: 'hasPrepTag'; tag: string }
```

- [ ] **Step 5: Run typecheck to see expected compile failures**

Run: `npx tsc --noEmit`
Expected: typecheck FAILS with `surfaceGodPathCard` errors at `src/state/gameStore.ts`, `src/engine/gameLoop.ts`, `src/components/game/EffectTags.tsx`, and 7 card data sites. This is expected — Tasks 2–7 will resolve them.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts
git commit -m "$(cat <<'EOF'
feat(types): add prepTags state + prep/defer effects + hasPrepTag condition

- GameState gains prepTags: string[] (run-state field, reset on reshuffle)
- Effect union: + setPrepTag, + consumePrepTag, + deferGodPathCard
- Effect union: – surfaceGodPathCard
- Condition union: + hasPrepTag

Typecheck deliberately broken — Tasks 2–7 wire up the implementations.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Initial state + reshuffle reset + save/load wiring for `prepTags`

**Files:**
- Modify: `src/state/gameStore.ts`
- Test: `src/state/gameStore.test.ts`

**Interfaces:**
- Consumes: `GameState.prepTags` (from Task 1)
- Produces: `prepTags: []` in initial state, reset to `[]` in both `reshuffleOnly` branches, serialised in save data

- [ ] **Step 1: Write the failing test for reshuffle reset**

Add to `src/state/gameStore.test.ts` under the existing `describe('reshuffleOnly activity batch', ...)` or a new `describe('reshuffleOnly prepTags reset', ...)`:

```ts
describe('reshuffleOnly prepTags reset', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('non-tutorial reshuffle clears prepTags', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [{ id: 'congregation_meets', title: 'C', tier: 'core', options: [] } as never], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      blessings: { unlocked: [], selected: [] },
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied', 'attended_seance'],
    })
    useGameStore.getState().reshuffleOnly()
    expect(useGameStore.getState().prepTags).toEqual([])
  })

  it('tutorial reshuffle clears prepTags', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'olgreth', runLength: 'short', isTutorial: true },
      deck: { drawPile: [], discardPile: [{ id: 't', title: 'T', tier: 'core', options: [] } as never], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['recited'],
    })
    useGameStore.getState().reshuffleOnly()
    expect(useGameStore.getState().prepTags).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/state/gameStore.test.ts -t "prepTags reset"`
Expected: typecheck or runtime FAIL — `prepTags` does not exist on initial state yet.

- [ ] **Step 3: Add `prepTags: []` to the initial state object**

In `src/state/gameStore.ts`, find the initial state literal (where `godPathProgress: 0`, `activityLog: []`, etc. are defined). Add `prepTags: []` alongside `activityLog`.

There are multiple state-init sites (initial store, `resetGame`, `startTutorial`, `startRun`). Add `prepTags: []` to every one of them so resets are consistent.

- [ ] **Step 4: Reset `prepTags` to `[]` in both `reshuffleOnly` branches**

In the tutorial branch of `reshuffleOnly`, the existing `set` call already clears `activityLog`. Add `prepTags: []` next to it:

```ts
set({
  deck,
  activityLog: [],
  activityBatchSealed: true,
  prepTags: [],
})
```

In the non-tutorial branch, add the same line to that `set` call:

```ts
set({
  deck,
  resources,
  reshuffleCount,
  unravellingTier,
  pendingUnravelling: false,
  usedRareIds: nextUsedRareIds,
  activityLog: reshuffleLog,
  activityBatchSealed: true,
  prepTags: [],
})
```

- [ ] **Step 5: Run tests to verify the new tests pass**

Run: `npx vitest run src/state/gameStore.test.ts -t "prepTags reset"`
Expected: PASS (both tests).

- [ ] **Step 6: Add save/load round-trip test**

In `src/state/gameStore.test.ts`, add to a `describe('save/load prepTags', ...)`:

```ts
describe('save/load prepTags', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
    localStorage.clear()
  })

  it('round-trips prepTags through saveRun + loadRun', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      prepTags: ['studied', 'opium_pact'],
    })
    // saveRun is invoked automatically by resolveOption / reshuffle paths,
    // but we trigger it directly via state mutation persistence — call the
    // private saveRun helper through any state mutator. Simplest: call the
    // exported saveRun directly if available, otherwise use loadRun's
    // restore path on a fresh resetGame.
    // Implementation note: persistence.ts exposes saveRun(state) and loadSaveData().
    const { saveRun } = require('../engine/persistence')
    saveRun(useGameStore.getState())

    useGameStore.getState().resetGame()
    expect(useGameStore.getState().prepTags).toEqual([])

    useGameStore.getState().loadRun()
    expect(useGameStore.getState().prepTags).toEqual(['studied', 'opium_pact'])
  })
})
```

- [ ] **Step 7: Run the save/load test to confirm it fails**

Run: `npx vitest run src/state/gameStore.test.ts -t "round-trips prepTags"`
Expected: FAIL — `loadRun` does not currently restore `prepTags`.

- [ ] **Step 8: Wire prepTags into persistence**

Search `src/engine/persistence.ts` for the save shape (likely a `saveRun(state)` and `loadSaveData()` pair). Add `prepTags: state.prepTags` to the serialised payload and `prepTags: data.prepTags ?? []` to the deserialised value (the `?? []` keeps old saves loadable). Then in `src/state/gameStore.ts`'s `loadRun` action, add `prepTags: data.prepTags ?? []` to the `set(...)` call alongside the other restored fields.

- [ ] **Step 9: Re-run save/load test**

Run: `npx vitest run src/state/gameStore.test.ts -t "round-trips prepTags"`
Expected: PASS.

- [ ] **Step 10: Run the full test suite**

Run: `npx vitest run`
Expected: all 32+ tests PASS (30 original + 2 new reset tests + 1 new round-trip test).

- [ ] **Step 11: Commit**

```bash
git add src/state/gameStore.ts src/state/gameStore.test.ts src/engine/persistence.ts
git commit -m "$(cat <<'EOF'
feat(state): prepTags initial state + reshuffle reset + save/load round-trip

- prepTags: [] added to all state-init sites (store, resetGame, startTutorial,
  startRun) and to reshuffleOnly (both tutorial and non-tutorial branches)
- persistence.ts serialises prepTags into save data; loadRun restores with
  `?? []` fallback for back-compat with pre-prep saves
- 3 new vitest cases: tutorial reshuffle reset, non-tutorial reshuffle reset,
  save/load round-trip

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Effect handlers — setPrepTag, consumePrepTag, deferGodPathCard; remove surfaceGodPathCard

**Files:**
- Modify: `src/state/gameStore.ts`
- Modify: `src/engine/gameLoop.ts`
- Test: `src/state/gameStore.test.ts`

**Interfaces:**
- Consumes: `Effect` union members from Task 1, `prepTags` from Task 2
- Produces: working engine effect handlers; deferGodPathCard relocates a draw-pile chain card

- [ ] **Step 1: Write failing tests for the three new effects**

Add a new `describe('prep-tag and defer effects', ...)` to `src/state/gameStore.test.ts`:

```ts
describe('prep-tag and defer effects', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  function cardWithEffects(id: string, effects: any[]) {
    return {
      id, title: id, tier: 'core' as const,
      options: [{ id: 'o', label: 'go', effects }],
    } as never
  }

  it('setPrepTag adds the tag to prepTags', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_set', [{ type: 'setPrepTag', tag: 'studied' }]),
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().prepTags).toContain('studied')
  })

  it('setPrepTag is idempotent (no duplicate of the same tag)', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_dupe', [{ type: 'setPrepTag', tag: 'studied' }]),
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied'],
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().prepTags.filter(t => t === 'studied')).toHaveLength(1)
  })

  it('consumePrepTag removes the tag', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_consume', [{ type: 'consumePrepTag', tag: 'studied' }]),
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied', 'recited'],
    })
    useGameStore.getState().resolveOption(0)
    const tags = useGameStore.getState().prepTags
    expect(tags).not.toContain('studied')
    expect(tags).toContain('recited')
  })

  it('consumePrepTag on absent tag is a no-op', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_no_consume', [{ type: 'consumePrepTag', tag: 'opium_pact' }]),
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied'],
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().prepTags).toEqual(['studied'])
  })

  it('deferGodPathCard moves the current god-path card later in drawPile', () => {
    const gp = { id: 'yha_3', title: 'Chain 3', tier: 'god_path', godPath: 'yha_nthlei', chainStage: 3, options: [] } as never
    const filler = (i: number) => ({ id: `f${i}`, title: `F${i}`, tier: 'core', options: [] } as never)
    const drawPile = [filler(0), filler(1), gp, filler(3), filler(4), filler(5), filler(6), filler(7)]
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile, discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_defer', [{ type: 'deferGodPathCard' }]),
      activityLog: [],
      activityBatchSealed: true,
    })
    useGameStore.getState().resolveOption(0)
    const newPile = useGameStore.getState().deck.drawPile
    const newIdx = newPile.findIndex(c => c.id === 'yha_3')
    expect(newIdx).toBeGreaterThan(2)  // moved later than its original index of 2
  })

  it('deferGodPathCard is a no-op when no god-path card is in drawPile', () => {
    const drawPile = [{ id: 'a', title: 'A', tier: 'core', options: [] } as never]
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile, discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_defer_noop', [{ type: 'deferGodPathCard' }]),
      activityLog: [],
      activityBatchSealed: true,
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().deck.drawPile).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run src/state/gameStore.test.ts -t "prep-tag and defer effects"`
Expected: FAIL (effects not handled). Typecheck may also still be broken from Task 1.

- [ ] **Step 3: Remove the `surfaceGodPathCard` case from `gameStore.ts`'s effect switch**

In `src/state/gameStore.ts`, find `case 'surfaceGodPathCard': {` (around line 854 — the case that finds a god_path card in drawPile and re-inserts at random position [1,5]). Delete the entire case block (from `case 'surfaceGodPathCard': {` through its `break` and closing brace).

- [ ] **Step 4: Add three new cases to `gameStore.ts`'s effect switch**

In the same switch statement, add:

```ts
case 'setPrepTag': {
  // Idempotent — only push if not already present.
  if (!prepTags.includes(effect.tag)) {
    prepTags = [...prepTags, effect.tag]
  }
  break
}

case 'consumePrepTag': {
  const idx = prepTags.indexOf(effect.tag)
  if (idx !== -1) {
    prepTags = prepTags.filter((_, i) => i !== idx)
  }
  break
}

case 'deferGodPathCard': {
  // Push the current god_path card later in drawPile.
  // Moves from its current index to min(currentIdx + 4, drawPile.length - 1).
  // No-op if no god_path card is in drawPile.
  const gpIdx = deck.drawPile.findIndex(c => c.tier === 'god_path')
  if (gpIdx !== -1) {
    const card = deck.drawPile[gpIdx]
    const newPile = [...deck.drawPile]
    newPile.splice(gpIdx, 1)
    const targetPos = Math.min(gpIdx + 4, newPile.length)
    newPile.splice(targetPos, 0, card)
    deck = { ...deck, drawPile: newPile }
  }
  break
}
```

Add `let prepTags = state.prepTags` near the top of `resolveOption` where other local mutables (e.g. `let deck = state.deck`) are declared. Then add `prepTags` to the `set({...})` call at the end of `resolveOption` alongside other restored fields.

- [ ] **Step 5: Remove the `surfaceGodPathCard` case from `engine/gameLoop.ts`**

In `src/engine/gameLoop.ts`, find `case 'surfaceGodPathCard':` (around line 379, in `expandEffects` or similar). The case is likely a no-op fall-through (effect doesn't expand to anything). Delete the case line and any associated comment.

- [ ] **Step 6: Run the new tests — should PASS now**

Run: `npx vitest run src/state/gameStore.test.ts -t "prep-tag and defer effects"`
Expected: PASS (6 tests).

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: all PASS. Typecheck may still complain about the 7 remaining `surfaceGodPathCard` call sites in card data — Task 4 fixes those.

- [ ] **Step 8: Commit**

```bash
git add src/state/gameStore.ts src/engine/gameLoop.ts src/state/gameStore.test.ts
git commit -m "$(cat <<'EOF'
feat(engine): setPrepTag / consumePrepTag / deferGodPathCard handlers

- gameStore.resolveOption: setPrepTag pushes (idempotent), consumePrepTag
  removes (no-op if absent), deferGodPathCard relocates god_path card from
  current index to current+4 (clamped to drawPile length)
- Removed surfaceGodPathCard case from gameStore.resolveOption and gameLoop
  expansion switch
- 6 new vitest cases covering all three effects' happy paths and no-ops

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: hasPrepTag condition + plumb prepTags into checkCondition callers

**Files:**
- Modify: `src/engine/godPath.ts`
- Modify: `src/state/gameStore.ts` (callers of `checkCondition`)
- Modify: `src/components/game/OptionsColumn.tsx` (if it calls checkCondition)
- Modify: any other `checkCondition` callers
- Test: `src/state/gameStore.test.ts`

**Interfaces:**
- Consumes: `Condition` union member `hasPrepTag` from Task 1, `prepTags` from Task 2
- Produces: `checkCondition(condition, state)` now respects `state.prepTags` for `hasPrepTag` conditions

- [ ] **Step 1: Locate all `checkCondition` call sites**

Run: `grep -rn "checkCondition(" src/`
Note every call site. Each one must pass `prepTags: state.prepTags` (or local equivalent) inside the state object.

- [ ] **Step 2: Write failing test for hasPrepTag gating**

Add to `src/state/gameStore.test.ts`:

```ts
describe('hasPrepTag condition', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('option with hasPrepTag condition is selectable only when tag is present', () => {
    const card = {
      id: 'test_gated', title: 'Test Gated', tier: 'core' as const,
      options: [{
        id: 'o', label: 'Bonus',
        condition: { type: 'hasPrepTag', tag: 'studied' },
        effects: [{ type: 'consumePrepTag', tag: 'studied' }],
      }],
    } as never

    // Without tag: option blocked
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
    })
    // Resolving a blocked option should be a no-op or guarded.
    // Implementation detail: the engine's option selection guard is the
    // common path. We verify by checking that resolving DOES NOT consume.
    // If the engine permits resolve-through, the consumePrepTag is still
    // a no-op (Task 3 test). So we also assert via checkCondition directly:
    const { checkCondition } = require('../engine/godPath')
    expect(checkCondition(card.options[0].condition, {
      resources: useGameStore.getState().resources,
      deck: useGameStore.getState().deck,
      godPathProgress: useGameStore.getState().godPathProgress,
      runConfig: useGameStore.getState().runConfig,
      cardRunState: useGameStore.getState().cardRunState,
      prepTags: useGameStore.getState().prepTags,
    })).toBe(false)

    // With tag: option allowed
    useGameStore.setState({ prepTags: ['studied'] })
    expect(checkCondition(card.options[0].condition, {
      resources: useGameStore.getState().resources,
      deck: useGameStore.getState().deck,
      godPathProgress: useGameStore.getState().godPathProgress,
      runConfig: useGameStore.getState().runConfig,
      cardRunState: useGameStore.getState().cardRunState,
      prepTags: useGameStore.getState().prepTags,
    })).toBe(true)
  })
})
```

- [ ] **Step 3: Run test — expect FAIL**

Run: `npx vitest run src/state/gameStore.test.ts -t "hasPrepTag condition"`
Expected: FAIL — `checkCondition` doesn't handle `hasPrepTag` yet; also `state.prepTags` isn't accepted.

- [ ] **Step 4: Extend `checkCondition`'s state parameter and add the new case**

In `src/engine/godPath.ts`, find the `checkCondition` function (line 106). Extend its `state` parameter type:

```ts
export function checkCondition(
  condition: import('../types').Condition,
  state: {
    resources: import('../types').Resources
    deck: DeckState
    godPathProgress: number
    runConfig: import('../types').RunConfig | null
    cardRunState?: Record<CardId, CardRunState>
    prepTags?: string[]
  }
): boolean {
```

Inside the `switch (condition.type)`, add a new case:

```ts
case 'hasPrepTag':
  return (state.prepTags ?? []).includes(condition.tag)
```

- [ ] **Step 5: Update every call site to pass `prepTags`**

For every call site found in Step 1, update it to include `prepTags: state.prepTags` (or equivalent) in the state object. In `src/state/gameStore.ts` the `resolveOption` action calls `checkCondition` — pass `prepTags: state.prepTags`. In `src/components/game/OptionsColumn.tsx` it likely calls `checkCondition` to decide selectability — pass `prepTags` from the store via `useGameStore(s => s.prepTags)`.

- [ ] **Step 6: Run the test — expect PASS**

Run: `npx vitest run src/state/gameStore.test.ts -t "hasPrepTag condition"`
Expected: PASS.

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/engine/godPath.ts src/state/gameStore.ts src/components/game/OptionsColumn.tsx src/state/gameStore.test.ts
git commit -m "$(cat <<'EOF'
feat(conditions): hasPrepTag condition + plumb prepTags into checkCondition

- checkCondition state param gains optional prepTags: string[]
- hasPrepTag case returns state.prepTags.includes(condition.tag)
- All checkCondition call sites updated to forward prepTags from the store
- 1 new vitest case covering present/absent gating

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Carrier card updates — set prep tags on 4 cards; defer effect on the_promotion; TODO comments on the_thing_in_the_tank and grove_awaits

**Files:**
- Modify: `src/data/cards/core.ts`
- Modify: `src/data/cards/threats.ts`

**Interfaces:**
- Consumes: `setPrepTag`, `deferGodPathCard` effects from Task 1; removal of `surfaceGodPathCard` already done in Task 1's type change
- Produces: 6 cards' effect lists updated; 7 `surfaceGodPathCard` call sites eliminated

- [ ] **Step 1: Replace `surfaceGodPathCard` with `setPrepTag` on 4 prep cards**

For each card, locate the option in the file and replace its effect entry.

`src/data/cards/core.ts` — `the_old_book` "Hire a translator" option (around line 192):

```ts
// Before:
{ type: 'surfaceGodPathCard' },
// After:
{ type: 'setPrepTag', tag: 'studied' },
```

`src/data/cards/core.ts` — `the_seance` "Attend and steer" option (around line 490):

```ts
{ type: 'setPrepTag', tag: 'attended_seance' },
```

`src/data/cards/core.ts` — `the_opium_den` "Encourage the visits" option (around line 616):

```ts
{ type: 'setPrepTag', tag: 'opium_pact' },
```

`src/data/cards/threats.ts` — `what_was_already_read` "The words arrange themselves" option (around line 880):

```ts
{ type: 'setPrepTag', tag: 'recited' },
```

- [ ] **Step 2: Update `the_promotion` "Take the role" option in `core.ts`**

Locate `the_promotion` in `src/data/cards/core.ts`. Find the option whose label is "Take the role" (or the most thematically appropriate option if no exact match). Modify its `effects` array to include `deferGodPathCard` and a defer cost (`-2 influence`). Existing resource effects on the option may be tuned for balance — keep the option at ≤ 3 options on the card.

If the option's existing effects don't include a `-influence` line, add one. If they do, leave them as is (don't double-cost without balance review).

Concrete example:

```ts
// Before:
{ label: 'Take the role', effects: [{ type: 'resource', resource: 'gold', delta: 2 }] }
// After:
{ label: 'Take the role', effects: [
  { type: 'resource', resource: 'gold', delta: 2 },
  { type: 'resource', resource: 'influence', delta: -2 },
  { type: 'deferGodPathCard' },
] }
```

- [ ] **Step 3: Strip `surfaceGodPathCard` lines from `the_thing_in_the_tank` and `grove_awaits` with TODO markers**

In `src/data/cards/threats.ts`:

`the_thing_in_the_tank` (around line 1025) — delete the `{ type: 'surfaceGodPathCard' },` line. Replace with a comment line:

```ts
// TODO(thematic): replacement effect for s86 content pass (was surfaceGodPathCard)
```

`grove_awaits` (around lines 1108, 1117) — same treatment, twice.

Verify the surrounding effect arrays still have at least ONE effect entry. If stripping the surface effect leaves an option with an empty effects array (which would compile but produce a no-op option), add a temporary `// TODO(thematic): option may need filler effect — currently no-op` comment so the content pass notices.

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no more surfaceGodPathCard usages).

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/cards/core.ts src/data/cards/threats.ts
git commit -m "$(cat <<'EOF'
feat(cards): carrier updates — 4 prep cards set tags, the_promotion defers

- the_old_book "Hire a translator": setPrepTag(studied)
- the_seance "Attend and steer": setPrepTag(attended_seance)
- the_opium_den "Encourage the visits": setPrepTag(opium_pact)
- what_was_already_read "The words arrange themselves": setPrepTag(recited)
- the_promotion "Take the role": -2 influence + deferGodPathCard
- the_thing_in_the_tank: surface line removed, TODO(thematic) marker left
- grove_awaits (2 options): same TODO treatment

surfaceGodPathCard now has zero call sites. Typecheck clean.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: New rare card `the_diocese_sends_word` + art prompt

**Files:**
- Modify: `src/data/cards/rare.ts`
- Modify: `src/data/cardArt.ts`
- Create: `Art/Defer Cards/the_diocese_sends_word.md`

**Interfaces:**
- Consumes: `deferGodPathCard` effect from Task 1
- Produces: new card id `the_diocese_sends_word` registered in card data and art map

- [ ] **Step 1: Inspect existing rare card structure**

Read `src/data/cards/rare.ts` to find the existing card shape (imports, array name, export). Match the style of the existing rare cards exactly when adding the new one.

- [ ] **Step 2: Add `the_diocese_sends_word` to the rare cards array**

Append to the rare card array (or to wherever the existing rare cards are defined):

```ts
{
  id: 'the_diocese_sends_word',
  title: 'The Diocese Sends Word',
  flavourText: "The bishop's letter is brief. The questions in it are not.",
  tier: 'rare',
  options: [
    {
      label: 'Compose a careful reply',
      flavourText: 'Hours of drafting. Each sentence weighed for what it admits and what it conceals.',
      effects: [
        { type: 'resource', resource: 'influence', delta: -2 },
        { type: 'deferGodPathCard' },
      ],
    },
    // TODO(thematic): 1-2 additional options at ≤ 3 total, balance-reviewed
  ],
},
```

- [ ] **Step 3: Register the art slot in `cardArt.ts`**

In `src/data/cardArt.ts`, find the `CARD_ART` map (the alphabetical or otherwise ordered map). Add an entry:

```ts
the_diocese_sends_word:   '/cards/the_diocese_sends_word.jpeg',
```

The placeholder image file does NOT need to exist yet — the UI fallback handles missing art. Image generation is downstream.

- [ ] **Step 4: Create the art prompt file**

Create `Art/Defer Cards/the_diocese_sends_word.md` with content:

```markdown
# The Diocese Sends Word — Art Prompt

## Title
The Diocese Sends Word

## Flavour
*"The bishop's letter is brief. The questions in it are not."*

## Scene Direction
A single letter on a writing desk, ornate bishop's seal in red wax cracked
open. A candle burns low. In the background, blurred but unmistakable, the
shadow of cult artifacts (a bound book, a small idol turned to face the wall)
hastily concealed. The priest's hand visible at the edge of frame, holding a
quill above blank reply paper.

## Mood
Bureaucratic dread. Formality as threat. The Church's polite letter as a
sword sheathed in correspondence.

## Composition
Portrait, 600×900. Low-key lighting from candle (warm) contrasting with
cool moonlight through an off-frame window. Letter is the focal point, sharp
focus; everything else falls into atmospheric haze.

## Colour Palette
Burnished gold candlelight, bone-white parchment, deep blood-red wax,
muted ecclesiastical purples in the shadow areas. No bright colours.

## Style Notes
Match the existing `cardArt` portrait style. No text in the image. Image
should read clearly at 320px (the in-game display size) without losing the
letter's central focus.

## Filename
`/cards/the_diocese_sends_word.jpeg`
```

- [ ] **Step 5: Verify the new rare card is registered correctly**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `grep -rn "the_diocese_sends_word" src/` to confirm references in `rare.ts` and `cardArt.ts`.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/cards/rare.ts src/data/cardArt.ts "Art/Defer Cards/the_diocese_sends_word.md"
git commit -m "$(cat <<'EOF'
feat(cards): add rare card the_diocese_sends_word + art prompt

- New rare: "The Diocese Sends Word" — bishop's letter forces priest to
  perform normalcy, defers god-path encounter. -2 influence + deferGodPathCard
  on the placeholder option; balance + 1-2 additional options delegated to
  the thematic + balance content pass
- Art slot registered in cardArt.ts (placeholder path; image generation
  downstream)
- Art prompt at Art/Defer Cards/the_diocese_sends_word.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: EffectTags UI — remove surface tag, add setPrepTag and deferGodPathCard tags

**Files:**
- Modify: `src/components/game/EffectTags.tsx`

**Interfaces:**
- Consumes: `Effect` union from Task 1
- Produces: new tag rendering for setPrepTag (❖ + small-caps tag name, plain colour) and deferGodPathCard (deferred-time icon)

- [ ] **Step 1: Remove the `surfaceGodPathCard` branch**

In `src/components/game/EffectTags.tsx`, find `} else if (e.type === 'surfaceGodPathCard') {` (around line 123). Delete the entire `else if` block including its tag-push body. Keep the broader if/else chain intact.

- [ ] **Step 2: Add the `setPrepTag` branch**

In the same if/else chain (e.g. after the `seedWhispers` branch), add:

```tsx
} else if (e.type === 'setPrepTag') {
  // Tag label shown as small-caps (e.g. STUDIED, ATTENDED SEANCE)
  const label = e.tag.replace(/_/g, ' ').toUpperCase()
  tags.push(
    <span key={i} title={`Marks you as ${label} this week. Prep slots reset at reshuffle.`}
      style={{
        fontSize: '0.8rem', color: 'var(--gold)',
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(200,160,40,0.4)',
        padding: '0.1rem 0.35rem', borderRadius: '2px',
        fontVariant: 'small-caps', letterSpacing: '0.06em',
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      }}>
      <span style={{ color: 'var(--gold-bright)' }}>❖</span>
      <span>{label.toLowerCase()}</span>
    </span>
  )
}
```

- [ ] **Step 3: Add the `deferGodPathCard` branch**

In the same chain, after `setPrepTag`:

```tsx
} else if (e.type === 'deferGodPathCard') {
  tags.push(
    <span key={i} title="Pushes your next god-path card later in the deck."
      style={{
        fontSize: '0.8rem', color: '#c89020',
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(200,144,32,0.3)',
        padding: '0.1rem 0.35rem', borderRadius: '2px',
      }}>
      god path → later
    </span>
  )
}
```

- [ ] **Step 4: Typecheck and run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/EffectTags.tsx
git commit -m "$(cat <<'EOF'
feat(ui): EffectTags renders setPrepTag (❖) and deferGodPathCard tags

- Removed the surfaceGodPathCard branch (effect no longer exists)
- New setPrepTag tag: ❖ + small-caps tag name, gold border, with explanatory
  tooltip — "Marks you as STUDIED this week. Prep slots reset at reshuffle."
- New deferGodPathCard tag: "god path → later" amber pill with tooltip

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: OptionsColumn ❖ prefix on active prep-bonus options

**Files:**
- Modify: `src/components/game/OptionsColumn.tsx`

**Interfaces:**
- Consumes: option's `condition` from card data (existing); `prepTags` from store (Task 2)
- Produces: visual ❖ prefix on option labels where `condition.type === 'hasPrepTag'` AND tag is set

- [ ] **Step 1: Detect hasPrepTag in OptionsColumn option rendering**

Find the option `<button>` rendering loop in `src/components/game/OptionsColumn.tsx`. Inside the map function (where each `visibleOpt` becomes a button), compute:

```ts
const isPrepBonus = option.condition?.type === 'hasPrepTag'
```

(`condition` may need to be visited recursively if wrapped in `and`/`or`/`not`. For this first cut, ONLY treat top-level `hasPrepTag` as a prep bonus — the bonus options the content pass will write all use a direct top-level `hasPrepTag`.)

- [ ] **Step 2: Prefix the label with ❖ when `isPrepBonus` and tag is satisfied**

Find the JSX that renders `option.label`. Wrap it:

```tsx
<div style={{
  fontVariant: 'small-caps', fontSize: isSuccumb ? '1rem' : '0.9rem', letterSpacing: '0.08em',
  color: isSuccumb ? 'var(--red-bright)' : (avail ? (option.isWhisper ? 'rgba(210,170,255,0.9)' : 'var(--gold)') : 'rgba(200,185,155,0.78)'),
  fontStyle: option.isWhisper ? 'italic' : 'normal',
  flex: 1,
}}>
  {isPrepBonus && (
    <span style={{
      color: 'var(--gold-bright)',
      textShadow: '0 0 6px rgba(200,160,40,0.6)',
      marginRight: '0.3rem',
    }}>❖</span>
  )}
  {option.label}
</div>
```

The ❖ only appears for visible (selectable) options because non-selectable `hasPrepTag` options are already hidden by the existing condition gate.

- [ ] **Step 3: Typecheck and visual smoke**

Run: `npx tsc --noEmit`
Expected: PASS.

Visual verification deferred to playtest (no automated UI test for this).

- [ ] **Step 4: Commit**

```bash
git add src/components/game/OptionsColumn.tsx
git commit -m "$(cat <<'EOF'
feat(ui): ❖ prefix on active prep-bonus options in OptionsColumn

When an option's condition is { type: 'hasPrepTag', tag } AND the tag is
satisfied (option is visible), the option label is prefixed with ❖ in
gold-bright with a soft text-shadow glow. Non-satisfied options are still
hidden by the existing condition gate.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: CardPreviewModal — show greyed-out prep-bonus options on chain card preview

**Files:**
- Modify: `src/components/game/CardPreviewModal.tsx`

**Interfaces:**
- Consumes: card definition options (existing); `prepTags` from store (Task 2)
- Produces: on chain card preview, options with `condition: { type: 'hasPrepTag', tag }` are ALWAYS rendered (even if the tag is unset), with grey treatment + requirement badge

- [ ] **Step 1: Read CardPreviewModal to find where options are listed**

Read `src/components/game/CardPreviewModal.tsx`. Find where the previewed card's options are rendered (likely a map over `card.options`). Note how it currently handles conditions (it may or may not show conditionally-locked options).

- [ ] **Step 2: Render prep-bonus options always, with grey + badge when unsatisfied**

Inside the option-rendering map, for each option:

```tsx
const isPrepBonus = option.condition?.type === 'hasPrepTag'
const prepTag = isPrepBonus ? (option.condition as Extract<typeof option.condition, { type: 'hasPrepTag' }>).tag : null
const hasTag = isPrepBonus && prepTags.includes(prepTag!)

// Skip non-prep-bonus options whose condition fails (existing behaviour)
if (!isPrepBonus && option.condition && !checkCondition(option.condition, /* state */)) {
  return null
}

// For prep-bonus options: always render, grey when tag absent
const isGreyed = isPrepBonus && !hasTag
const labelColor = isGreyed ? 'rgba(200,185,155,0.4)' : 'var(--gold)'

return (
  <div key={option.label} style={{ /* preview option styles, with reduced opacity if isGreyed */ }}>
    <div style={{ color: labelColor, fontVariant: 'small-caps' }}>
      {isPrepBonus && (
        <span style={{
          color: isGreyed ? 'rgba(200,160,40,0.4)' : 'var(--gold-bright)',
          textShadow: isGreyed ? 'none' : '0 0 6px rgba(200,160,40,0.6)',
          marginRight: '0.3rem',
        }}>❖</span>
      )}
      {option.label}
    </div>
    {isPrepBonus && isGreyed && (
      <div style={{
        fontSize: '0.7rem', color: 'rgba(200,160,40,0.6)',
        fontStyle: 'italic', marginTop: '0.15rem',
      }}>
        ❖ requires: {prepTag!.replace(/_/g, ' ').toUpperCase()} this week
      </div>
    )}
    {/* existing flavour + effect rendering */}
  </div>
)
```

Inject `prepTags` via `useGameStore(s => s.prepTags)` at the top of the component.

- [ ] **Step 3: Typecheck and visual smoke**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/game/CardPreviewModal.tsx
git commit -m "$(cat <<'EOF'
feat(ui): chain card preview shows greyed prep-bonus options with ❖ requirement

When previewing a card whose options include a hasPrepTag condition, the
bonus option is rendered always — greyed out with "❖ requires: <TAG> this
week" subtitle when the tag is unset, full-colour with glowing ❖ prefix
when satisfied. Non-prep-bonus options retain existing condition-gating
behaviour (hidden when unsatisfied).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: WeekBanner prep nudge — accept `prepNudge` prop, render conditional 4th subtitle line + wire from parent

**Files:**
- Modify: `src/components/game/WeekBanner.tsx`
- Modify: `src/components/GameScreen.tsx` (or wherever WeekBanner is mounted)

**Interfaces:**
- Consumes: existing WeekBanner props + `godPathProgress` and `runConfig.godPath` from store
- Produces: WeekBanner accepts optional `prepNudge?: string`; parent computes the per-god copy when `godPathProgress` ∈ {1, 2, 3, 4}

- [ ] **Step 1: Extend WeekBanner props**

In `src/components/game/WeekBanner.tsx`, extend the props type:

```ts
export function WeekBanner({
  reshuffleCount,
  unravellingTier,
  suppress,
  prepNudge,
}: {
  reshuffleCount: number
  unravellingTier: number
  suppress: boolean
  prepNudge?: string
}) {
```

- [ ] **Step 2: Render the prep nudge below "Doom escalates"**

In the JSX, after the "Doom escalates" div, add:

```tsx
{prepNudge && (
  <div
    style={{
      fontFamily: 'var(--ui-font)',
      fontSize: '0.8rem',
      color: 'rgba(200,185,158,0.82)',
      fontStyle: 'italic',
      lineHeight: 1.28,
      textShadow: '0 1px 4px rgba(0,0,0,0.9)',
      textAlign: 'center',
      maxWidth: '88vw',
    }}
  >
    {prepNudge}
  </div>
)}
```

- [ ] **Step 3: Wire the parent to compute and pass `prepNudge`**

Find where `<WeekBanner ...>` is mounted (search `grep -rn "WeekBanner" src/components/`). In that parent:

```ts
const godPathProgress = useGameStore(s => s.godPathProgress)
const godPath = useGameStore(s => s.runConfig?.godPath)

const PREP_NUDGE: Record<string, string> = {
  yha_nthlei:    'A new mark of the deep waits for your study.',
  nyarlathotep:  'A new shape stalks the periphery this week.',
  shub_niggurath:'The roots stir with a fresh hunger.',
  olgreth:       '',  // tutorial — banner suppressed anyway
}

const prepNudge = (godPath && godPathProgress >= 1 && godPathProgress <= 4)
  ? PREP_NUDGE[godPath]
  : undefined
```

Then in the JSX:

```tsx
<WeekBanner
  reshuffleCount={reshuffleCount}
  unravellingTier={unravellingTier}
  suppress={isTutorial}
  prepNudge={prepNudge}
/>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/WeekBanner.tsx src/components/GameScreen.tsx
git commit -m "$(cat <<'EOF'
feat(ui): WeekBanner gains conditional prep-nudge subtitle (stages 2-5)

- WeekBanner accepts optional prepNudge?: string and renders it as a 4th
  flavour line beneath "Doom escalates"
- Parent (GameScreen) computes prepNudge from godPathProgress ∈ {1,2,3,4}
  and active god path. Per-god placeholder strings; thematic agent finalises
  copy in the content pass.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: One end-to-end stub bonus option on `yha_nthlei_2` for engine integration

**Files:**
- Modify: `src/data/godPaths/yha_nthlei.ts`
- Test: `src/state/gameStore.test.ts`

**Interfaces:**
- Consumes: hasPrepTag condition (Task 4), consumePrepTag effect (Task 3)
- Produces: a working prep-bonus option that, when the player has `studied`, advances stage 2 cheaply; serves as the playtest-able smoke test for the whole prep system

- [ ] **Step 1: Inspect `yha_nthlei_2`'s current options**

Read `src/data/godPaths/yha_nthlei.ts` lines around the `yha_nthlei_2` card definition. Note current option count (must stay ≤ 3 after the add).

- [ ] **Step 2: Add ONE bonus option to `yha_nthlei_2`**

Append (or insert at index 0) the new option:

```ts
{
  label: 'Speak the deep tongue',
  flavourText: 'The book spoke first. You answer second. The conversation feels older than either of you. // TODO(thematic): flavour pass',
  condition: { type: 'hasPrepTag', tag: 'studied' },
  effects: [
    { type: 'consumePrepTag', tag: 'studied' },
    { type: 'resource', resource: 'dread', delta: 1 },
    { type: 'advanceGodPath' },
  ],
},
```

If adding makes the card exceed 3 options, REMOVE the least essential of the existing options instead (likely a redundant `Refuse`-style option) and leave a `// TODO(thematic): may want to restore removed option N` comment.

- [ ] **Step 3: Write an end-to-end test**

Add to `src/state/gameStore.test.ts`:

```ts
describe('end-to-end prep-tag flow on yha_nthlei_2', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('resolving the studied bonus option consumes the tag and advances the chain', () => {
    const { getCardById } = require('../data')
    const yhaTwo = getCardById('yha_nthlei_2')
    expect(yhaTwo).toBeDefined()

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: yhaTwo,
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied'],
      godPathProgress: 1,  // about to encounter stage 2
    })

    // Find the bonus option index by label
    const bonusIdx = yhaTwo.options.findIndex((o: any) => o.label === 'Speak the deep tongue')
    expect(bonusIdx).toBeGreaterThanOrEqual(0)

    useGameStore.getState().resolveOption(bonusIdx)

    expect(useGameStore.getState().prepTags).not.toContain('studied')
    expect(useGameStore.getState().godPathProgress).toBe(2)
  })

  it('the studied bonus option is gated when tag is absent', () => {
    const { getCardById } = require('../data')
    const yhaTwo = getCardById('yha_nthlei_2')
    const bonus = yhaTwo.options.find((o: any) => o.label === 'Speak the deep tongue')
    const { checkCondition } = require('../engine/godPath')
    expect(checkCondition(bonus.condition, {
      resources: { gold: 0, followers: 0, influence: 0, dread: 0, relics: 0, theChanged: 0 },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      godPathProgress: 1,
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      prepTags: [],
    })).toBe(false)
  })
})
```

- [ ] **Step 4: Run the E2E tests**

Run: `npx vitest run src/state/gameStore.test.ts -t "end-to-end prep-tag flow"`
Expected: PASS (both tests).

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/godPaths/yha_nthlei.ts src/state/gameStore.test.ts
git commit -m "$(cat <<'EOF'
feat(godpath): end-to-end prep-tag bonus on yha_nthlei_2 (studied → cheap advance)

- yha_nthlei_2 gains one bonus option "Speak the deep tongue" gated by
  hasPrepTag(studied). On resolve: consumePrepTag(studied), +1 dread,
  advanceGodPath. Card stays at ≤ 3 options.
- 2 vitest cases verify the full happy path (set → consume → progress) and
  the gating (tag absent → condition false)
- The other 11 chain-card bonus options + replacement effects for
  the_thing_in_the_tank / grove_awaits are delegated to the thematic +
  balance content pass

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Final integration sweep — manual checklist + typecheck + full test run

**Files:**
- (no edits — verification only)

**Interfaces:**
- Consumes: every prior task
- Produces: confidence the engine + UI integration is end-to-end clean

- [ ] **Step 1: Confirm zero `surfaceGodPathCard` references remain**

Run: `grep -rn "surfaceGodPathCard" src/ Code/project-abyssial/docs/`
Expected: zero matches in `src/`. Documentation in `docs/` retaining historical references is fine but should NOT contain active code references.

- [ ] **Step 2: Confirm every `checkCondition` caller forwards `prepTags`**

Run: `grep -rn "checkCondition(" src/`
Inspect each call site. Each one's state object must include `prepTags` (or pass through a state that includes it).

- [ ] **Step 3: Confirm `prepTags` is in every state-init site**

Run: `grep -rn "godPathProgress: 0" src/state/`
For each init site found, confirm `prepTags: []` is also present.

- [ ] **Step 4: Full typecheck + test run**

Run: `npx tsc --noEmit && npx vitest run`
Expected: typecheck PASS; all tests PASS (originals + ~13 new = ~43 total).

- [ ] **Step 5: Manual UI smoke checklist (deferred to user playtest)**

Document these as a playtest checklist comment in the commit message:

1. Start a Y'ha-nthlei run. Draw `the_old_book`. Pick "Hire a translator". Verify the activity log shows `❖ studied` tag.
2. Continue play until reshuffle. Verify `prepTags` resets (no carryover indicator — confirm by drawing `the_old_book` again next week, `studied` should be re-settable).
3. Get to chain stage 2 (`yha_nthlei_2 — The Fishmonger's Tiara`). Preview the card from the deck. Verify "❖ Speak the deep tongue" appears greyed out with `❖ requires: STUDIED this week`.
4. Set `studied` again in the same week as drawing stage 2, then draw stage 2. Verify the bonus option appears with golden ❖ prefix and the glow.
5. Pick the bonus option. Verify chain advances and the tag is gone.
6. Draw `the_promotion`. Verify "Take the role" shows the `god path → later` effect tag.
7. Pick it. Verify the active god-path card moves further down the drawPile.
8. Verify the WeekBanner shows the per-god prep nudge subtitle when `godPathProgress ∈ {1,2,3,4}`.

- [ ] **Step 6: Final commit (no edits — just a checkpoint commit if nothing else)**

If Steps 1–5 surfaced any fixes, commit them with focused messages. Otherwise, skip — the prior task commits stand.

If a checkpoint commit is useful for marking "engine complete, content pass next":

```bash
git commit --allow-empty -m "$(cat <<'EOF'
chore(milestone): god-path prep-tag engine complete

All engine + UI integration shipped. Content pass next: thematic + balance
agents author 11 remaining chain-card bonus options + replacement effects
for the_thing_in_the_tank / grove_awaits + finalise the_diocese_sends_word
options.

See [[docs/superpowers/specs/2026-06-17-god-path-prep-tags-design.md]] for
the design; this plan at [[docs/superpowers/plans/2026-06-17-god-path-prep-tags.md]].

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

**1. Spec coverage:**

| Spec section | Implementing task |
|---|---|
| `prepTags` state field | Task 2 |
| `setPrepTag`, `consumePrepTag`, `deferGodPathCard` effects | Tasks 1 (types), 3 (handlers) |
| `surfaceGodPathCard` removal | Tasks 1 (type), 3 (engine), 5 (cards), 7 (UI) |
| `hasPrepTag` condition | Tasks 1 (type), 4 (handler + callers) |
| Reshuffle reset | Task 2 |
| Save/load persistence | Task 2 |
| Tag → stage mapping (4 tags, stages 2–5) | Task 5 (carriers), Task 11 (one E2E stub on yha_nthlei_2) |
| Stage 1 + 6 carry no prep slot | Implicit — Task 11 only touches stage 2; stages 1 and 6 are untouched |
| ❖ icon on active prep-bonus options | Task 8 |
| ❖ icon + requirement badge on chain card preview (greyed) | Task 9 |
| EffectTags rendering of setPrepTag / deferGodPathCard | Task 7 |
| WeekBanner prep nudge line | Task 10 |
| `the_promotion` defer | Task 5 |
| `the_diocese_sends_word` new rare + art prompt | Task 6 |
| `the_thing_in_the_tank` / `grove_awaits` TODO markers | Task 5 |
| Tests for all engine effects + condition + reset + save/load | Tasks 2–4, 11 |
| Content-pass delegation | Explicit in Tasks 5, 6, 11 commit messages and in spec |

No gaps.

**2. Placeholder scan:** No "TBD" or "TODO" outside the explicit content-pass markers, which are intentional and scoped to specific cards (the_thing_in_the_tank, grove_awaits, the_diocese_sends_word, yha_nthlei_2 flavour).

**3. Type consistency:** `prepTags: string[]` used uniformly. Tag names (`studied`, `attended_seance`, `opium_pact`, `recited`) consistent across all tasks. Effect type names (`setPrepTag`, `consumePrepTag`, `deferGodPathCard`) consistent. `hasPrepTag` condition uses `tag: string` parameter consistently. ❖ glyph (U+2756 BLACK DIAMOND MINUS WHITE X) used consistently.

---

## Execution Handoff

Plan complete and saved to `Code/project-abyssial/docs/superpowers/plans/2026-06-17-god-path-prep-tags.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
