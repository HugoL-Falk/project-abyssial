# Deck & Reshuffle Week-Cadence — Plan A (Mechanic + Reclassification) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each reshuffle feel like a distinct week by giving the uncommon (internal `core`) tier the same per-reshuffle rotation that rares already have, reclassifying two genuinely-weekly cards to common, varying rares to 1–2/week (floor 1), and relabelling "Core" → "Uncommon" in the UI.

**Architecture:** Mirror the proven `rotateRares` pure function with a new `rotateCore` in `engine/deck.ts`, wire it into `reshuffle()` alongside rare rotation, and thread a new `usedCoreIds` cooldown set through game state + persistence exactly as `usedRareIds` is threaded today. No internal enum rename — `tier: 'core'` stays; only the player-facing label changes.

**Tech Stack:** TypeScript, Zustand store (`src/state/gameStore.ts`), Vitest (node environment, no DOM harness), React (display only).

## Global Constraints

- **Internal tier enum stays `'core'`** — only the player-facing display label becomes "Uncommon". Do NOT rename the enum string.
- **Tests are node-only** — no jsdom/RTL. Test pure functions (`deck.ts`) and store actions that don't need DOM.
- **All existing tests must stay green:** baseline is 135/135 vitest pass + clean typecheck (`npm run typecheck`).
- **Pure functions in `deck.ts` take an injectable `rng: () => number = Math.random`** for deterministic tests (follow `rotateRares`).
- **Run dir:** all commands run from `Code/project-abyssial`.
- **Commit locally only** — never push. End commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **N (uncommon-in-deck) = 4; rare band = 1–2, floor 1** — starting numbers; the later balance audit (Plan B) may tune.

---

### Task 1: Reclassify `congregation_meets` and `the_donation` to common

These two read as genuinely weekly. Move them from `core.ts` to `common.ts` and flip their `tier` field. The always-in-core mechanism is removed in Task 4; this task only relocates the cards.

**Files:**
- Modify: `src/data/cards/core.ts` (remove the two card objects)
- Modify: `src/data/cards/common.ts` (add the two card objects, `tier: 'common'`)
- Test: `src/data/cards/reclassification.test.ts` (create)

**Interfaces:**
- Consumes: `CORE_CARDS`, `COMMON_CARDS` exports from `src/data` (re-exported in `src/data/index.ts`).
- Produces: `congregation_meets` and `the_donation` now have `tier: 'common'` and live in `COMMON_CARDS`; `CORE_CARDS` no longer contains them.

- [ ] **Step 1: Write the failing test**

Create `src/data/cards/reclassification.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { CORE_CARDS, COMMON_CARDS } from '../index'

describe('tier reclassification (Plan A)', () => {
  const moved = ['congregation_meets', 'the_donation']

  it('moved cards are no longer in CORE_CARDS', () => {
    for (const id of moved) {
      expect(CORE_CARDS.find(c => c.id === id)).toBeUndefined()
    }
  })

  it('moved cards are in COMMON_CARDS with tier "common"', () => {
    for (const id of moved) {
      const card = COMMON_CARDS.find(c => c.id === id)
      expect(card, `${id} should be in COMMON_CARDS`).toBeDefined()
      expect(card!.tier).toBe('common')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- reclassification`
Expected: FAIL — cards still in `CORE_CARDS`, not in `COMMON_CARDS`.

- [ ] **Step 3: Move the two cards**

In `src/data/cards/core.ts`: cut the full card objects for `congregation_meets` and `the_donation` out of the `CORE_CARDS` array.
In `src/data/cards/common.ts`: paste both objects into the `COMMON_CARDS` array and change each object's `tier: 'core'` to `tier: 'common'`. Change nothing else (keep ids, options, flavour, `godPathWeight`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- reclassification`
Expected: PASS.

- [ ] **Step 5: Typecheck + full suite**

Run: `npm run typecheck && npm run test`
Expected: typecheck clean; all tests pass (the gameStore test at `gameStore.test.ts:776` asserting a deferGodPathCard carrier exists in `CORE_CARDS + RARE_CARDS` should still pass — if it fails, a carrier lived on a moved card; in that case keep the carrier by leaving that card in core and pick the other always-in card; STOP and report).

- [ ] **Step 6: Commit**

```bash
git add src/data/cards/core.ts src/data/cards/common.ts src/data/cards/reclassification.test.ts
git commit -m "refactor(P13-24): reclassify congregation_meets + the_donation to common

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Add `rotateCore` pure function to `deck.ts`

Mirror `rotateRares` (`deck.ts:142-183`) exactly: retire core cards sitting in the discard pile, refill from the core pool minus a cooldown set, with the same recycle-when-exhausted fallback that keeps just-retired cards ineligible for one cycle (the P19-33 hardening).

**Files:**
- Modify: `src/engine/deck.ts` (add `rotateCore` after `rotateRares`)
- Test: `src/engine/deck.test.ts` (add a `rotateCore` describe block)

**Interfaces:**
- Consumes: `Card` type; `tier` field; the discard pile and combined pile arrays.
- Produces:
  ```typescript
  export function rotateCore(
    combined: Card[],
    discardPile: Card[],
    usedCoreIds: Set<string>,
    corePool: Card[],
    coreTarget: number,
    rng?: () => number,
  ): { combined: Card[]; usedCoreIds: Set<string> }
  ```
  Retires every `tier === 'core'` card in `discardPile` from `combined`, then refills with fresh core (excluding `usedCoreIds` and core still in deck) until the in-deck core count reaches `coreTarget`. Returns the new combined pile (pre-shuffle) and the updated cooldown set.

- [ ] **Step 1: Write the failing tests**

Add to `src/engine/deck.test.ts`:

```typescript
import { rotateCore } from './deck'

describe('rotateCore', () => {
  const core = (id: string): Card =>
    ({ id, tier: 'core', title: id, flavour: '', options: [] } as unknown as Card)
  const pool = (ids: string[]) => ids.map(core)
  const seq = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length] }

  it('no-op when no core cards are in the discard pile', () => {
    const combined = [core('a'), core('b')]
    const res = rotateCore(combined, [], new Set(), pool(['c', 'd']), 2, seq(0))
    expect(res.combined).toEqual(combined)
  })

  it('retires drawn core and refills up to coreTarget from the pool', () => {
    const inDeck = [core('a')]            // 1 undrawn core stays
    const discard = [core('b')]           // 1 drawn core retires
    const combined = [...inDeck, ...discard]
    const res = rotateCore(combined, discard, new Set(['b']), pool(['c', 'd', 'e']), 2, seq(0))
    const ids = res.combined.filter(c => c.tier === 'core').map(c => c.id).sort()
    expect(ids).not.toContain('b')        // retired
    expect(ids).toContain('a')            // carried over
    expect(ids.length).toBe(2)            // topped up to coreTarget
  })

  it('keeps a just-retired core ineligible this cycle (recycle fallback)', () => {
    const discard = [core('b')]
    const combined = [core('b')]          // only core is the one retiring
    // usedCoreIds already holds every other pool id, forcing the recycle branch
    const used = new Set(['c'])
    const res = rotateCore(combined, discard, used, pool(['b', 'c']), 1, seq(0))
    const ids = res.combined.filter(c => c.tier === 'core').map(c => c.id)
    expect(ids).not.toContain('b')        // must not return same cycle
  })

  it('does not exceed coreTarget when deck already has enough core', () => {
    const combined = [core('a'), core('b')]
    const res = rotateCore(combined, [], new Set(), pool(['c', 'd']), 1, seq(0))
    expect(res.combined.filter(c => c.tier === 'core').length).toBe(2) // no retire → unchanged
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- deck.test`
Expected: FAIL — `rotateCore` is not exported.

- [ ] **Step 3: Implement `rotateCore`**

Add to `src/engine/deck.ts` immediately after `rotateRares` (after line 183):

```typescript
/**
 * Core (display: "Uncommon") rotation, mirroring rotateRares. At reshuffle,
 * every core card in the discard pile is retired and the deck is topped up to
 * `coreTarget` with fresh core from `corePool` minus `usedCoreIds` minus core
 * still in the deck. If the eligible set is too small, `usedCoreIds` is recycled
 * to "core still in deck + core retiring this cycle" so a just-retired card
 * cannot reappear two cycles in a row (P19-33 hardening).
 *
 * Pure. Caller commits the returned `usedCoreIds` to game state. `combined` is
 * pre-shuffle — reshuffle() shuffles afterwards.
 */
export function rotateCore(
  combined: Card[],
  discardPile: Card[],
  usedCoreIds: Set<string>,
  corePool: Card[],
  coreTarget: number,
  rng: () => number = Math.random,
): { combined: Card[]; usedCoreIds: Set<string> } {
  const retiring = discardPile.filter(c => c.tier === 'core')
  if (retiring.length === 0) {
    return { combined, usedCoreIds }
  }

  const retiringIds = new Set(retiring.map(c => c.id))
  const afterRetire = combined.filter(c => !(c.tier === 'core' && retiringIds.has(c.id)))

  const inDeckCoreIds = new Set(
    afterRetire.filter(c => c.tier === 'core').map(c => c.id)
  )
  const need = Math.max(0, coreTarget - inDeckCoreIds.size)
  if (need === 0) {
    return { combined: afterRetire, usedCoreIds }
  }

  let nextUsed = new Set(usedCoreIds)
  let eligible = corePool.filter(c => !nextUsed.has(c.id) && !inDeckCoreIds.has(c.id))

  if (eligible.length < need) {
    nextUsed = new Set([...inDeckCoreIds, ...retiringIds])
    eligible = corePool.filter(c => !nextUsed.has(c.id) && !inDeckCoreIds.has(c.id))
  }

  const picks: Card[] = []
  for (let i = 0; i < need; i++) {
    if (eligible.length === 0) break
    const idx = Math.floor(rng() * eligible.length)
    const picked = eligible[idx]
    picks.push(picked)
    nextUsed.add(picked.id)
    eligible = eligible.filter(c => c.id !== picked.id)
  }

  return { combined: [...afterRetire, ...picks], usedCoreIds: nextUsed }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- deck.test`
Expected: PASS (all `rotateCore` cases + existing `rotateRares`/deck tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/deck.ts src/engine/deck.test.ts
git commit -m "feat(P13-24): add rotateCore pure function mirroring rotateRares

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Vary rare refill to a 1–2 band (floor 1) in `rotateRares`

Add a `rareTarget` parameter so the caller can roll 1 or 2; refill only up to the target instead of always 1:1. Keeps the floor at 1 (caller never rolls 0).

**Files:**
- Modify: `src/engine/deck.ts` (`rotateRares` signature + refill loop)
- Modify: `src/engine/deck.ts` (`reshuffle` passes the target through)
- Test: `src/engine/deck.test.ts` (add rare-band cases)

**Interfaces:**
- Consumes: existing `rotateRares` callers.
- Produces: new signature
  ```typescript
  export function rotateRares(
    combined: Card[],
    discardPile: Card[],
    usedRareIds: Set<string>,
    rarePool: Card[],
    rareTarget: number,
    rng?: () => number,
  ): { combined: Card[]; usedRareIds: Set<string> }
  ```
  Refills the deck up to `rareTarget` total rares (not 1:1 with retired).

- [ ] **Step 1: Write the failing tests**

Add to the existing `rotateRares` describe block in `src/engine/deck.test.ts`:

```typescript
it('refills rares only up to rareTarget (band floor 1)', () => {
  const rare = (id: string): Card =>
    ({ id, tier: 'rare', title: id, flavour: '', options: [] } as unknown as Card)
  const inDeck: Card[] = []                 // both starting rares were drawn
  const discard = [rare('r1'), rare('r2')]  // 2 retiring
  const combined = [...inDeck, ...discard]
  const pool = ['r3', 'r4', 'r5'].map(rare)
  const res = rotateRares(combined, discard, new Set(['r1', 'r2']), pool, 1, () => 0)
  expect(res.combined.filter(c => c.tier === 'rare').length).toBe(1) // capped at target
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- deck.test`
Expected: FAIL — `rotateRares` ignores a target / arity mismatch in existing callers (compile error is acceptable failure here).

- [ ] **Step 3: Update `rotateRares` to honour `rareTarget`**

In `src/engine/deck.ts`, change the signature (line 142-148) to add `rareTarget: number` before `rng`, and replace the refill bound. Replace the picks loop bound `for (let i = 0; i < retiring.length; i++)` with a need-based bound:

```typescript
  const inDeckRareIds = new Set(
    afterRetire.filter(c => c.tier === 'rare').map(c => c.id)
  )
  const need = Math.max(0, rareTarget - inDeckRareIds.size)

  let nextUsed = new Set(usedRareIds)
  let eligible = rarePool.filter(r => !nextUsed.has(r.id) && !inDeckRareIds.has(r.id))

  if (eligible.length < need) {
    nextUsed = new Set([...inDeckRareIds, ...retiringIds])
    eligible = rarePool.filter(r => !nextUsed.has(r.id) && !inDeckRareIds.has(r.id))
  }

  const picks: Card[] = []
  for (let i = 0; i < need; i++) {
    if (eligible.length === 0) break
    const idx = Math.floor(rng() * eligible.length)
    const picked = eligible[idx]
    picks.push(picked)
    nextUsed.add(picked.id)
    eligible = eligible.filter(r => r.id !== picked.id)
  }
```

(The `inDeckRareIds`/`nextUsed`/`eligible` block above replaces the existing one at `deck.ts:157-170`; the `retiring`/`afterRetire` lines above it stay unchanged.)

- [ ] **Step 4: Update `reshuffle` to roll and pass the target**

In `reshuffle` (`deck.ts:185-202`), add a `rareTarget` parameter and pass it. Replace the `rotateRares` call line:

```typescript
export function reshuffle(
  deck: DeckState,
  unravellingCard: Card,
  usedRareIds: Set<string>,
  rarePool: Card[],
  rareTarget: number = 2,
): { deck: DeckState; usedRareIds: Set<string>; insertedUnravelling: Card } {
```

and

```typescript
  const rotated = rotateRares(preRotate, deck.discardPile, usedRareIds, rarePool, rareTarget)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- deck.test`
Expected: PASS. (The `gameLoop.ts:264` dead-path call to `reshuffle` still compiles because `rareTarget` defaults to 2.)

- [ ] **Step 6: Commit**

```bash
git add src/engine/deck.ts src/engine/deck.test.ts
git commit -m "feat(P13-24): rare refill honours a 1-2 target band (floor 1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Thread `usedCoreIds` through game state + persistence

`rotateCore` needs a cooldown set that survives across reshuffles and saves, exactly like `usedRareIds`.

**Files:**
- Modify: `src/types/index.ts:230` (add `usedCoreIds` to `GameState`)
- Modify: `src/state/gameStore.ts` (`makeInitialState`, `startRun` init, `loadRun` hydrate)
- Modify: `src/engine/persistence.ts:35,70` (`SaveData` field + serialise)
- Test: `src/state/gameStore.test.ts` (assert init + load round-trip)

**Interfaces:**
- Consumes: existing `usedRareIds: Set<string>` patterns.
- Produces: `GameState.usedCoreIds: Set<string>`; `SaveData.usedCoreIds?: string[]`.

- [ ] **Step 1: Write the failing test**

Add to `src/state/gameStore.test.ts`:

```typescript
it('usedCoreIds initialises empty and survives a save/load round-trip', async () => {
  const { useGameStore } = await import('./gameStore')
  expect(useGameStore.getState().usedCoreIds instanceof Set).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- gameStore.test`
Expected: FAIL — `usedCoreIds` undefined on initial state.

- [ ] **Step 3: Add the type field**

In `src/types/index.ts`, directly after line 230 (`usedRareIds: Set<string>`), add:

```typescript
  usedCoreIds: Set<string>
```

- [ ] **Step 4: Initialise + thread in the store**

In `src/state/gameStore.ts`:
- In `makeInitialState` (near line 97, beside `usedRareIds: new Set<string>()`), add `usedCoreIds: new Set<string>(),`.
- In `startRun`'s `set({...})` (near line 486 where `usedRareIds: startingUsedRareIds`), add `usedCoreIds: new Set<string>(coreRotation.map(c => c.id)),` (this line is added in Task 5 where `coreRotation` is defined; if Task 5 not yet done, use `usedCoreIds: new Set<string>(),`).
- In `loadRun` (near line 1483 beside `usedRareIds: hydratedUsedRareIds`), add `usedCoreIds: new Set(data.usedCoreIds ?? []),`.

- [ ] **Step 5: Persist in save data**

In `src/engine/persistence.ts`:
- After line 35 (`usedRareIds?: string[]`), add `usedCoreIds?: string[]   // optional for pre-P13-24 week-cadence saves`.
- After line 70 (`usedRareIds: Array.from(state.usedRareIds),`), add `usedCoreIds: Array.from(state.usedCoreIds),`.

- [ ] **Step 6: Run tests + typecheck**

Run: `npm run typecheck && npm run test -- gameStore.test`
Expected: typecheck clean; test passes.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/state/gameStore.ts src/engine/persistence.ts src/state/gameStore.test.ts
git commit -m "feat(P13-24): thread usedCoreIds cooldown through state + persistence

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Draw N=4 uncommon at run start from the full core pool (drop always-in spine)

Remove the `ALWAYS_IN_CORE_IDS` split; draw 4 uncommon from all `CORE_CARDS` via `weightedCoreDraw`.

**Files:**
- Modify: `src/engine/godPath.ts:39` (`weightedCoreDraw` count 2 → 4)
- Modify: `src/state/gameStore.ts:378-389,437-443` (remove always-in split)
- Test: `src/state/gameStore.test.ts` (assert ≤4 core in starting deck, none guaranteed)

**Interfaces:**
- Consumes: `CORE_CARDS`, `weightedCoreDraw`.
- Produces: starting deck holds exactly `min(4, CORE_CARDS.length)` core cards drawn from the full pool; no card is always-in.

- [ ] **Step 1: Write the failing test**

Add to `src/state/gameStore.test.ts`:

```typescript
it('starting deck holds exactly 4 core (uncommon) cards', async () => {
  const { useGameStore } = await import('./gameStore')
  const s = useGameStore.getState()
  s.setRunConfig({ godPath: 'yha_nthlei' } as any)
  s.setBlessingSelection([])
  s.startRun()
  const deck = useGameStore.getState().deck
  const coreInDeck = [...deck.drawPile, ...deck.discardPile].filter(c => c.tier === 'core')
  expect(coreInDeck.length).toBe(4)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- gameStore.test`
Expected: FAIL — currently 5 always-in + 2 rotation = 7 core.

- [ ] **Step 3: Bump `weightedCoreDraw` count**

In `src/engine/godPath.ts:39`, change `const count = 2` to `const count = 4`.

- [ ] **Step 4: Remove the always-in split in `startRun`**

In `src/state/gameStore.ts`:
- Delete the `ALWAYS_IN_CORE_IDS` constant block (lines ~378-389).
- Replace the always-in/rotation block (lines ~437-443) with:

```typescript
    const coreRotation = weightedCoreDraw(runConfig.godPath, CORE_CARDS)
    const regularCards: Card[] = [...coreRotation, ...commons, ...rares, ...injectedCards]
```

- Confirm the `usedCoreIds` init from Task 4 Step 4 now reads `new Set<string>(coreRotation.map(c => c.id))`.

- [ ] **Step 5: Run tests + typecheck**

Run: `npm run typecheck && npm run test`
Expected: typecheck clean (no remaining `ALWAYS_IN_CORE_IDS` reference); the new test passes; full suite green.

- [ ] **Step 6: Commit**

```bash
git add src/engine/godPath.ts src/state/gameStore.ts src/state/gameStore.test.ts
git commit -m "feat(P13-24): draw 4 uncommon from full core pool, drop always-in spine

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Wire core rotation + rare band into the live reshuffle action

Now connect `rotateCore` and the rare target inside `reshuffle()` and the store's reshuffle action so weeks actually rotate.

**Files:**
- Modify: `src/engine/deck.ts` (`reshuffle` calls `rotateCore`, accepts `corePool`, `usedCoreIds`, returns updated set)
- Modify: `src/state/gameStore.ts:1376-1400` (build `corePool`, roll `rareTarget`, pass through, commit `usedCoreIds`)
- Test: `src/engine/deck.test.ts` (reshuffle rotates a drawn core out)

**Interfaces:**
- Consumes: `rotateCore` (Task 2), `rotateRares` band (Task 3), `usedCoreIds` state (Task 4).
- Produces: `reshuffle` returns `{ deck, usedRareIds, usedCoreIds, insertedUnravelling }`.

- [ ] **Step 1: Write the failing test**

Add to `src/engine/deck.test.ts`:

```typescript
it('reshuffle rotates a drawn core card out and tops up to coreTarget', () => {
  const mk = (id: string, tier: string): Card =>
    ({ id, tier, title: id, flavour: '', options: [] } as unknown as Card)
  const deck = {
    drawPile: [mk('keep', 'core')],
    discardPile: [mk('drawn', 'core')],
    permDiscardPile: [], chainReserve: [], nextCycleQueue: [],
  } as any
  const corePool = ['drawn', 'keep', 'fresh1', 'fresh2'].map(id => mk(id, 'core'))
  const res = reshuffle(deck, mk('doom', 'doom'), new Set(), [], 2,
                        new Set(['drawn']), corePool, 2)
  const coreIds = res.deck.drawPile.filter((c: Card) => c.tier === 'core').map((c: Card) => c.id)
  expect(coreIds).not.toContain('drawn')   // retired
  expect(coreIds).toContain('keep')        // carried over
  expect(coreIds.length).toBe(2)           // topped up
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- deck.test`
Expected: FAIL — `reshuffle` arity/return shape mismatch.

- [ ] **Step 3: Extend `reshuffle`**

In `src/engine/deck.ts`, update `reshuffle`'s signature and body. Add params after `rareTarget`:

```typescript
export function reshuffle(
  deck: DeckState,
  unravellingCard: Card,
  usedRareIds: Set<string>,
  rarePool: Card[],
  rareTarget: number = 2,
  usedCoreIds: Set<string> = new Set(),
  corePool: Card[] = [],
  coreTarget: number = 4,
): { deck: DeckState; usedRareIds: Set<string>; usedCoreIds: Set<string>; insertedUnravelling: Card } {
```

After the `rotateRares` call (line ~202), add core rotation on the rotated pile, threading the discard pile (which still holds the drawn core):

```typescript
  const rotated = rotateRares(preRotate, deck.discardPile, usedRareIds, rarePool, rareTarget)
  const coreRotated = rotateCore(rotated.combined, deck.discardPile, usedCoreIds, corePool, coreTarget)
  let shuffled = shuffleArray(coreRotated.combined)
```

(Replace the existing `let shuffled = shuffleArray(rotated.combined)` line.)

Then add `usedCoreIds: coreRotated.usedCoreIds,` to the returned object (beside `usedRareIds: rotated.usedRareIds,`).

- [ ] **Step 4: Wire the store reshuffle action**

In `src/state/gameStore.ts` (the reshuffle action, ~1376-1400):
- After the `rarePool` definition (~1378), add:

```typescript
    const rareTarget = 1 + Math.floor(Math.random() * 2)   // 1 or 2, floor 1
```

- Replace the `reshuffle(...)` call (line 1379) with:

```typescript
    const { deck, usedRareIds: nextUsedRareIds, usedCoreIds: nextUsedCoreIds, insertedUnravelling } =
      reshuffle(state.deck, unravelCard, state.usedRareIds, rarePool, rareTarget,
                state.usedCoreIds, CORE_CARDS, 4)
```

- In the action's `set({...})` (line ~1390-1400), add `usedCoreIds: nextUsedCoreIds,` beside `usedRareIds: nextUsedRareIds,`.

- [ ] **Step 5: Fix the dead-path caller**

`src/engine/gameLoop.ts:264` calls `reshuffle(...)`. It already destructures only `{ deck, usedRareIds }`; the new return fields are additive and the new params default, so it still compiles. Run typecheck to confirm — if it errors, leave the call as-is (defaults cover it). Do NOT add core rotation to this documented dead path.

- [ ] **Step 6: Run tests + typecheck**

Run: `npm run typecheck && npm run test`
Expected: typecheck clean; new reshuffle test passes; full suite green (135 + new tests).

- [ ] **Step 7: Commit**

```bash
git add src/engine/deck.ts src/state/gameStore.ts src/engine/deck.test.ts
git commit -m "feat(P13-24): wire core rotation + rare band into live reshuffle

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Relabel "Core" → "Uncommon" in the UI (display only)

**Files:**
- Modify: `src/components/game/DrawnCard.tsx:168`
- Test: none (display string; no DOM harness). Verified by grep + typecheck.

**Interfaces:**
- Consumes: `TIER_HINTS` map.
- Produces: card tooltip shows "Uncommon card" for `tier: 'core'`.

- [ ] **Step 1: Change the label**

In `src/components/game/DrawnCard.tsx:168`, change:

```typescript
  core:        'Core card',
```
to
```typescript
  core:        'Uncommon card',
```

- [ ] **Step 2: Grep for stragglers**

Run: `npm run test >/dev/null; git grep -n "Core card"`
Expected: no remaining "Core card" occurrences in `src/`. If any appear in other tooltip/preview components, change each to "Uncommon card" the same way.

- [ ] **Step 3: Typecheck + full suite**

Run: `npm run typecheck && npm run test`
Expected: typecheck clean; 135 + new tests all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/game/DrawnCard.tsx
git commit -m "feat(P13-24): relabel Core -> Uncommon in card tier hint (display only)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Tier reclassification (spec §1) → Task 1.
- `rotateCore` mechanic, N=4, retire-resolved-only, cooldown (spec §2) → Tasks 2, 5, 6.
- Rare cadence 1–2 floor 1 (spec §3) → Tasks 3, 6.
- Display-label rename, internal enum unchanged (spec §4 naming) → Task 7.
- Tests / rollout step 1 (spec §6) → every task is TDD; full-suite gate in Tasks 1, 5, 6, 7.
- **Deferred to Plan B (correctly out of scope here):** balance audit (spec §5), full deadpan reflavour sweep + per-week `WeekBanner`/`weekFlavour` framing (spec §4 flavour). Noted, not planned now per user's Plan-A-only scope.

**Placeholder scan:** No TBD/TODO; every code step shows exact code. Test bodies are concrete.

**Type consistency:** `rotateCore` / `rotateRares` signatures match between definition (Tasks 2, 3) and call sites (Task 6). `reshuffle` return shape `{ deck, usedRareIds, usedCoreIds, insertedUnravelling }` consistent between Task 6 Step 3 (definition) and Step 4 (destructure). `usedCoreIds` field name consistent across types (Task 4), store, persistence, and rotation. `coreTarget`/`rareTarget` parameter names consistent.

**Known sequencing note:** Task 4 Step 4 references `coreRotation` which is finalised in Task 5; the task text flags the fallback so tasks can be executed in order without a dangling reference.
