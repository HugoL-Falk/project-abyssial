# Whisper Guaranteed Surfacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee that a `seedWhispers(N)` effect produces at least one whisper card the player will actually draw — by preferring pool ids already in the draw pile, and inserting the card directly when no in-pile candidate exists.

**Architecture:** Add a pure planner function `applyWhisperSeed` in `src/engine/whispers.ts` that returns both the new active whisper ids and a list of card ids to physically insert into the draw pile. Both seed call sites (`gameStore.ts` and `gameLoop.ts`) consume this output and apply inserts. Selection respects the existing 5-active hard cap.

**Tech Stack:** TypeScript, Vite, Zustand, Vitest (added as part of Task 0).

**Spec:** `docs/superpowers/specs/2026-06-15-whisper-guaranteed-surfacing-design.md`

**Resolves:** EX-03 (P1), NB-10 (P2).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `vitest` devDependency + `test` script (one-time test infra) |
| `vitest.config.ts` | Create | Minimal vitest config (jsdom not needed; pure functions only) |
| `src/engine/whispers.ts` | Modify | Add `applyWhisperSeed` planner; keep existing `selectWhisperTargets` for now |
| `src/engine/whispers.test.ts` | Create | Unit tests for `applyWhisperSeed` |
| `src/state/gameStore.ts` | Modify | Replace `seedWhispers` handler (~line 842) to call `applyWhisperSeed` and apply inserts |
| `src/engine/gameLoop.ts` | Modify | Replace `seedWhispers` handler (~line 381) to do the same |

---

## Task 0: Install Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 0.1: Install vitest**

```bash
cd Code/project-abyssial
npm install --save-dev vitest@^2
```

- [ ] **Step 0.2: Add `test` script to `package.json`**

Edit `package.json` — add to `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Final scripts block:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 0.3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 0.4: Verify vitest runs (zero tests yet)**

```bash
npm test
```

Expected: exits 0 with "No test files found" or equivalent. (If vitest exits non-zero with "no tests" — that's fine, we'll add one in Task 1.)

- [ ] **Step 0.5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for unit testing"
```

---

## Task 1: Write failing tests for `applyWhisperSeed`

**Files:**
- Create: `src/engine/whispers.test.ts`

- [ ] **Step 1.1: Write the test file**

Create `src/engine/whispers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { applyWhisperSeed, WHISPER_POOL_IDS } from './whispers'
import type { Card, CardId } from '../types'

// Minimal card stub — only the fields applyWhisperSeed reads (`id`).
const stub = (id: CardId): Card => ({ id } as unknown as Card)

describe('applyWhisperSeed', () => {
  it('prefers ids already in the draw pile (no inserts needed)', () => {
    const inPileIds: CardId[] = ['congregation_meets', 'the_old_book', 'rival_stirs']
    const drawPile = inPileIds.map(stub)
    const result = applyWhisperSeed(3, [], drawPile)

    expect(result.newTargets).toHaveLength(3)
    expect(result.newTargets.every(id => inPileIds.includes(id))).toBe(true)
    expect(result.cardsToInsert).toHaveLength(0)
  })

  it('falls back to inserting when no pool ids are in the draw pile', () => {
    const drawPile: Card[] = [] // empty pile
    const result = applyWhisperSeed(2, [], drawPile)

    expect(result.newTargets).toHaveLength(2)
    expect(result.cardsToInsert).toHaveLength(2)
    // every insert is one of the pool ids
    expect(
      result.cardsToInsert.every(id => WHISPER_POOL_IDS.includes(id))
    ).toBe(true)
    // inserts and targets agree
    expect(result.cardsToInsert.every(id => result.newTargets.includes(id))).toBe(true)
  })

  it('mixes in-pile and fallback when both partitions have members', () => {
    const inPile = [stub('congregation_meets')]
    const result = applyWhisperSeed(3, [], inPile)

    expect(result.newTargets).toHaveLength(3)
    // exactly one came from inPile (no insert); the rest are inserts
    expect(result.cardsToInsert).toHaveLength(2)
    expect(result.newTargets).toContain('congregation_meets')
    // inserts must not include the in-pile id
    expect(result.cardsToInsert).not.toContain('congregation_meets')
  })

  it('respects the 5-active hard cap', () => {
    const alreadyActive: CardId[] = [
      'congregation_meets',
      'the_old_book',
      'rival_stirs',
      'academic_society',
    ] // 4 active
    const result = applyWhisperSeed(3, alreadyActive, [])
    expect(result.newTargets.length).toBeLessThanOrEqual(1)
  })

  it('returns empty when all pool ids are already active', () => {
    const result = applyWhisperSeed(3, [...WHISPER_POOL_IDS], [])
    expect(result.newTargets).toHaveLength(0)
    expect(result.cardsToInsert).toHaveLength(0)
  })

  it('does not re-pick ids already in alreadyActive', () => {
    const alreadyActive: CardId[] = ['congregation_meets']
    const drawPile = [stub('congregation_meets'), stub('the_old_book')]
    const result = applyWhisperSeed(2, alreadyActive, drawPile)

    expect(result.newTargets).not.toContain('congregation_meets')
    // the_old_book is in pile -> picked without insert
    expect(result.newTargets).toContain('the_old_book')
  })
})
```

- [ ] **Step 1.2: Run tests, confirm they fail**

```bash
npm test
```

Expected: FAIL — `applyWhisperSeed is not exported from ./whispers` (or similar import error).

- [ ] **Step 1.3: Commit the failing tests**

```bash
git add src/engine/whispers.test.ts
git commit -m "test: add failing tests for applyWhisperSeed planner"
```

---

## Task 2: Implement `applyWhisperSeed`

**Files:**
- Modify: `src/engine/whispers.ts`

- [ ] **Step 2.1: Add the function**

Append to `src/engine/whispers.ts` (after `selectWhisperTargets`, before the `// Generic fallback whisper for Whispered Counsel blessing` comment if you want clean ordering; otherwise EOF is fine):

```ts
import type { Card } from '../types'

/**
 * Plan a whisper seed against the current draw pile.
 *
 * Returns:
 *   - newTargets: the CardIds to add to activeWhispers
 *   - cardsToInsert: subset of newTargets whose card is NOT currently in the
 *     draw pile and therefore needs to be physically inserted by the caller
 *     so the player can actually draw it.
 *
 * Algorithm:
 *   1. eligible = WHISPER_POOL_IDS - alreadyActive
 *   2. cap = min(count, 5 - alreadyActive.length)
 *   3. partition eligible by whether id appears in drawPile
 *   4. drain inPile first (no insert), then notInPile (insert)
 *   5. each partition shuffled independently
 */
export function applyWhisperSeed(
  count: number,
  alreadyActive: CardId[],
  drawPile: Card[]
): { newTargets: CardId[]; cardsToInsert: CardId[] } {
  const cap = Math.min(count, 5 - alreadyActive.length)
  if (cap <= 0) return { newTargets: [], cardsToInsert: [] }

  const pileIds = new Set(drawPile.map(c => c.id))
  const eligible = WHISPER_POOL_IDS.filter(id => !alreadyActive.includes(id))

  const inPile = eligible.filter(id => pileIds.has(id))
  const notInPile = eligible.filter(id => !pileIds.has(id))

  // Shuffle each partition independently (Math.random — same as selectWhisperTargets).
  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)
  const inPileShuf = shuffle(inPile)
  const notInPileShuf = shuffle(notInPile)

  const newTargets: CardId[] = []
  const cardsToInsert: CardId[] = []

  // Drain in-pile first
  while (newTargets.length < cap && inPileShuf.length > 0) {
    newTargets.push(inPileShuf.shift()!)
  }
  // Then fall back to inserts
  while (newTargets.length < cap && notInPileShuf.length > 0) {
    const id = notInPileShuf.shift()!
    newTargets.push(id)
    cardsToInsert.push(id)
  }

  return { newTargets, cardsToInsert }
}
```

Note: the `import type { Card }` line should be merged into the existing top-of-file import: `import type { CardId, CardOption } from '../types'` becomes `import type { Card, CardId, CardOption } from '../types'`.

- [ ] **Step 2.2: Run tests, confirm they pass**

```bash
npm test
```

Expected: PASS — all 6 tests in `whispers.test.ts` green.

- [ ] **Step 2.3: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 2.4: Commit**

```bash
git add src/engine/whispers.ts
git commit -m "feat(whispers): add applyWhisperSeed planner with in-pile preference"
```

---

## Task 3: Wire `applyWhisperSeed` into `gameStore.ts`

**Files:**
- Modify: `src/state/gameStore.ts:53` (import)
- Modify: `src/state/gameStore.ts:842-848` (seedWhispers handler)

- [ ] **Step 3.1: Update the import line at the top of the seedWhispers/whispers section**

Find line ~53:

```ts
import { selectWhisperTargets, getWhisperOption } from '../engine/whispers'
```

Replace with:

```ts
import { applyWhisperSeed, getWhisperOption } from '../engine/whispers'
```

(`selectWhisperTargets` is no longer used here.)

- [ ] **Step 3.2: Replace the `seedWhispers` case body**

Find around line 842:

```ts
case 'seedWhispers': {
  const newTargets = selectWhisperTargets(effect.count, activeWhispers)
  if (newTargets.length > 0) {
    activeWhispers = [...activeWhispers, ...newTargets]
  }
  break
}
```

Replace with:

```ts
case 'seedWhispers': {
  const { newTargets, cardsToInsert } = applyWhisperSeed(
    effect.count,
    activeWhispers,
    deck.drawPile
  )
  if (newTargets.length > 0) {
    activeWhispers = [...activeWhispers, ...newTargets]
  }
  if (cardsToInsert.length > 0) {
    let newDrawPile = [...deck.drawPile]
    for (const id of cardsToInsert) {
      const card = getCardById(id)
      if (!card) continue // defensive: pool ids are stable, this shouldn't happen
      const maxPos = Math.min(4, newDrawPile.length)
      // Random position in [1, maxPos]. If pile is empty, insert at 0.
      const pos =
        newDrawPile.length === 0
          ? 0
          : 1 + Math.floor(Math.random() * maxPos)
      newDrawPile = [...newDrawPile.slice(0, pos), card, ...newDrawPile.slice(pos)]
    }
    deck = { ...deck, drawPile: newDrawPile }
  }
  break
}
```

- [ ] **Step 3.3: Verify `getCardById` is in scope**

Search the existing imports near the top of `gameStore.ts`:

```bash
grep -n "getCardById" src/state/gameStore.ts | head -5
```

If `getCardById` is not already imported, add it to the existing `from '../data'` import. Existing pattern in `gameLoop.ts` line 34 confirms the import path is `'../data'`.

- [ ] **Step 3.4: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors. If `getCardById` is unresolved, add it to the relevant import per Step 3.3.

- [ ] **Step 3.5: Tests still pass**

```bash
npm test
```

Expected: all `whispers.test.ts` tests still PASS (unchanged).

- [ ] **Step 3.6: Commit**

```bash
git add src/state/gameStore.ts
git commit -m "feat(gameStore): use applyWhisperSeed and insert fallback whisper cards"
```

---

## Task 4: Wire `applyWhisperSeed` into `gameLoop.ts`

**Files:**
- Modify: `src/engine/gameLoop.ts:38` (import)
- Modify: `src/engine/gameLoop.ts:381-387` (seedWhispers handler)

- [ ] **Step 4.1: Update the import**

Find line 38:

```ts
import { selectWhisperTargets } from './whispers'
```

Replace with:

```ts
import { applyWhisperSeed } from './whispers'
```

- [ ] **Step 4.2: Replace the `seedWhispers` case body**

Find around line 381:

```ts
case 'seedWhispers': {
  const newTargets = selectWhisperTargets(effect.count, ctx.activeWhispers)
  if (newTargets.length > 0) {
    ctx = { ...ctx, activeWhispers: [...ctx.activeWhispers, ...newTargets] }
  }
  break
}
```

Replace with:

```ts
case 'seedWhispers': {
  const { newTargets, cardsToInsert } = applyWhisperSeed(
    effect.count,
    ctx.activeWhispers,
    deck.drawPile
  )
  if (newTargets.length > 0) {
    ctx = { ...ctx, activeWhispers: [...ctx.activeWhispers, ...newTargets] }
  }
  if (cardsToInsert.length > 0) {
    let newDrawPile = [...deck.drawPile]
    for (const id of cardsToInsert) {
      const card = getCardById(id)
      if (!card) continue
      const maxPos = Math.min(4, newDrawPile.length)
      const pos =
        newDrawPile.length === 0
          ? 0
          : 1 + Math.floor(Math.random() * maxPos)
      newDrawPile = [...newDrawPile.slice(0, pos), card, ...newDrawPile.slice(pos)]
    }
    deck = { ...deck, drawPile: newDrawPile }
  }
  break
}
```

Note: `getCardById` is already imported in `gameLoop.ts` at line 34.

- [ ] **Step 4.3: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4.4: Tests still pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4.5: Build (full integration check)**

```bash
npm run build
```

Expected: build succeeds. No console errors.

- [ ] **Step 4.6: Commit**

```bash
git add src/engine/gameLoop.ts
git commit -m "feat(gameLoop): use applyWhisperSeed in engine seedWhispers handler"
```

---

## Task 5: Manual integration verification

**Files:** none (manual playtest).

- [ ] **Step 5.1: Run the dev server**

```bash
npm run dev
```

- [ ] **Step 5.2: Start a Nyarlathotep run**

Pick blessings that don't filter out the whisper pool. Play toward chain card 3 (`Black Man at Crossroads`) and pick "Encourage" or "Observe" — both trigger `seedWhispers`.

- [ ] **Step 5.3: Observe**

Within ~4 turns of the seed, at least one drawn card should now show a whisper option (label format like `"Speak what they're already thinking."` — `isWhisper: true` styling). Before this fix, runs frequently ended with zero whisper draws.

- [ ] **Step 5.4: Log the result in the session note**

Append a one-line note to `knowledge/sessions/session-81.md` confirming the whisper fired (or didn't, with detail).

---

## Task 6: Cleanup (optional follow-up)

**Files:**
- Modify: `src/engine/whispers.ts` (remove `selectWhisperTargets` if no other consumers)

- [ ] **Step 6.1: Check for other consumers**

```bash
grep -rn "selectWhisperTargets" src/
```

Expected: zero results (we replaced both call sites in Tasks 3 + 4).

- [ ] **Step 6.2: Delete `selectWhisperTargets` from `whispers.ts`**

Remove the `export function selectWhisperTargets(...)` block (lines 108-113 in the original file).

- [ ] **Step 6.3: Typecheck + tests + build**

```bash
npm run typecheck && npm test && npm run build
```

Expected: all green.

- [ ] **Step 6.4: Commit**

```bash
git add src/engine/whispers.ts
git commit -m "chore(whispers): remove obsolete selectWhisperTargets"
```

---

## Self-review notes

**Spec coverage:**
- Selection algorithm (in-pile preference, cap, partition) → Task 2 ✓
- Insertion at random pos `[1, min(4, len)]` → Tasks 3 + 4 ✓
- Both call sites (gameStore, gameLoop) → Tasks 3 + 4 ✓
- Test plan (6 unit tests) → Task 1 ✓
- Edge cases (all active, empty pool, missing catalog id) → covered in algorithm + defensive `continue` ✓

**Type consistency:** `applyWhisperSeed` signature is identical in spec, test file, implementation, and both call sites. Return shape `{ newTargets, cardsToInsert }` is used consistently throughout.

**No placeholders:** every step shows the exact code to write or command to run.
