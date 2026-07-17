# P20-B Shub-Niggurath + Mutation Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Shub-Niggurath god path so `changed_follower` is a persistent Shub-exclusive deck presence driven by a pooled sacrifice mechanic, replacing opaque `theChanged +1` direct grants throughout.

**Architecture:** New pooled-options engine (seeded RNG, category-grouped selection) powers the `changed_follower` sacrifice pool. Data changes update card definitions throughout. Doom card 4 is split into two conditional options (one per god path) using the existing `godPath` Condition type — no engine hacks needed. UI moves `theChanged` from resource bar to the in-game menu.

**Tech Stack:** TypeScript, React (inline styles), Vitest, Zustand (gameStore)

## Global Constraints

- Option flavour text ≤ 80 characters (D-2026-06-25). Card body text ≤ 108 characters.
- Never rewrite whole files — targeted edits only.
- All tests use Vitest (`describe`, `it`, `expect`, `vi`). Import from `vitest`, not `jest`.
- Run `npx vitest run` to verify. All 178 existing tests must stay green after every task.
- `changed_follower` new tier: `'god_path'`. New `godPath: 'shub_niggurath'`. Keeps `accumulates: true`.
- Spec file: `docs/superpowers/specs/2026-07-05-p20b-shub-mutation-redesign.md`.

---

## File Map

| File | Action | Task |
|---|---|---|
| `src/types/index.ts` | Add `pooled?`, `categoryKey?` to CardOption; `optionPoolSize?` to Card; `mutationSeed` to ActivityEntry | 1 |
| `src/engine/seededRng.ts` | Create — mulberry32 RNG + djb2 hash | 1 |
| `src/engine/pooledOptions.ts` | Create — `applyPooledOptions` function | 1 |
| `src/state/gameStore.ts` | Import + apply pooled options in draw path | 1 |
| `src/data/cards/special.ts` | Full rewrite of `changed_follower` card | 2 |
| `src/state/gameStore.ts` | Add `MAX_CHANGED_FOLLOWER_COPIES = 3`; cap check in insertCard | 2 |
| `src/data/cards/mutations.ts` | 6 dark options: `theChanged +1` → `insertCard: changed_follower` | 3 |
| `src/data/godPaths/shub_niggurath.ts` | All 6 chain cards + `shub_words_come_naturally` | 4 |
| `src/data/cards/threats.ts` | `fishermans_return` opt 3; `the_weight_of_it` opt 1 condition | 5 |
| `src/data/cards/unravelling.ts` | Split doom card 4 "Embrace" into Shub/non-Shub conditional options | 6 |
| `src/state/gameStore.ts` | seedMutations log | 6 |
| `src/components/game/ActivityLog.tsx` | Add `mutationSeed` rendering | 6 |
| `src/components/game/ResourceBar.tsx` | Remove `theChanged` counter | 7 |
| `src/components/game/InGameMenuButton.tsx` | Add `The Changed: N` section | 7 |
| `src/engine/pooledOptions.test.ts` | Create — pooled option engine tests | 8 |
| `src/state/gameStore.test.ts` | Add: deck cap, doom conditional, seedMutations log, victory gate, weight condition | 8 |
| `src/data/cards/mutations.test.ts` | Create — verify dark option effect type | 8 |

---

## Task 1: Pooled Option Engine (types + seededRng + applyPooledOptions + wire-up)

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/engine/seededRng.ts`
- Create: `src/engine/pooledOptions.ts`
- Modify: `src/state/gameStore.ts`

**Interfaces:**
- Produces: `applyPooledOptions(card, drawCount, checkCond?) → Card` (consumed by gameStore drawNextCard)
- Produces: `seededRng(seed) → () => number`, `hashString(str) → number` (consumed by pooledOptions)

- [ ] **Step 1: Add fields to types**

In `src/types/index.ts`, add three fields. The CardOption block currently ends at line 97. Add after `replacesSlot?`:

```typescript
// In CardOption (after replacesSlot):
  pooled?: boolean           // participates in per-draw pool selection
  categoryKey?: string       // one option per categoryKey shown per draw
```

And in the Card type (after `flavourTextByDrawCount?`):
```typescript
// In Card (after flavourTextByDrawCount):
  optionPoolSize?: number    // how many pooled options to show per draw (default 2)
```

And in `ActivityEntry` (after the `whisper` line, before the closing):
```typescript
  | { kind: 'mutationSeed' }
```

- [ ] **Step 2: Create `src/engine/seededRng.ts`**

```typescript
/**
 * Seeded RNG — mulberry32.
 * Returns a stateful function that produces [0, 1) floats deterministically.
 */
export function seededRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * djb2 string hash → uint32. Used to seed the RNG from a card+drawCount string.
 */
export function hashString(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0
  }
  return h >>> 0
}
```

- [ ] **Step 3: Create `src/engine/pooledOptions.ts`**

```typescript
import type { Card, CardOption } from '../types'
import { seededRng, hashString } from './seededRng'

/**
 * If a card has pooled options, select optionPoolSize of them (one per categoryKey),
 * using a seed derived from cardId + drawCount for determinism within a session.
 * Non-pooled options are always included unchanged.
 * If a checkCondition function is provided, skips options whose condition fails
 * (falls back to next in category; uses first in category if all fail).
 */
export function applyPooledOptions(
  card: Card,
  drawCount: number,
  checkCondition?: (opt: CardOption) => boolean,
): Card {
  const pooled    = card.options.filter(o => o.pooled)
  const nonPooled = card.options.filter(o => !o.pooled)
  if (pooled.length === 0) return card

  const poolSize = card.optionPoolSize ?? 2
  const rng      = seededRng(hashString(`${card.id}:${drawCount}`))

  // Group by categoryKey
  const byCategory = new Map<string, CardOption[]>()
  for (const opt of pooled) {
    const key = opt.categoryKey ?? '__default__'
    if (!byCategory.has(key)) byCategory.set(key, [])
    byCategory.get(key)!.push(opt)
  }

  // Fisher-Yates shuffle of category keys
  const categories = [...byCategory.keys()]
  for (let i = categories.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [categories[i], categories[j]] = [categories[j], categories[i]]
  }

  // Pick poolSize categories; from each pick first passing option (fallback: first)
  const selected: CardOption[] = []
  for (const cat of categories) {
    if (selected.length >= poolSize) break
    const opts = [...byCategory.get(cat)!]
    // Shuffle within category
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]]
    }
    const pick = checkCondition
      ? (opts.find(o => !o.condition || checkCondition(o)) ?? opts[0])
      : opts[0]
    selected.push(pick)
  }

  return { ...card, options: [...nonPooled, ...selected] }
}
```

- [ ] **Step 4: Wire pooled options into `drawNextCard` in gameStore.ts**

Find the whisper injection block (~line 652). It ends with:
```typescript
  return { ...card, options: [...card.options, whisperOption] }
})()
```

After that closing `})()`, add:

```typescript
    // P20-B: Apply pooled option selection if card has pooled options
    if (currentCard.options.some(o => o.pooled)) {
      currentCard = applyPooledOptions(
        currentCard,
        cardRunState[card.id]?.drawCount ?? 1,
        (opt) => opt.condition
          ? checkCondition(opt.condition, {
              resources,
              deck,
              godPathProgress: state.godPathProgress,
              runConfig: state.runConfig,
              cardRunState,
              prepTags: state.prepTags,
            })
          : true,
      )
    }
```

Also add the import at the top of `gameStore.ts` (after existing imports):
```typescript
import { applyPooledOptions } from '../engine/pooledOptions'
```

- [ ] **Step 5: Run tests**

```
npx vitest run
```

Expected: all 178 tests pass (no cards use `pooled` yet, so no behaviour change).

- [ ] **Step 6: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/types/index.ts src/engine/seededRng.ts src/engine/pooledOptions.ts src/state/gameStore.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(engine): pooled option selection with seeded RNG (P20-B)"
```

---

## Task 2: changed_follower Card Redesign + Deck Cap

**Files:**
- Modify: `src/data/cards/special.ts`
- Modify: `src/state/gameStore.ts`

**Interfaces:**
- Consumes: `pooled`, `categoryKey`, `optionPoolSize` from Task 1 types
- Produces: `changed_follower` card with 1 keep + 12 pooled sacrifice options; `MAX_CHANGED_FOLLOWER_COPIES = 3`

- [ ] **Step 1: Write failing test for deck cap**

In `src/state/gameStore.test.ts`, add this `describe` block:

```typescript
describe('changed_follower deck cap', () => {
  const makeChangedFollower = (): Card => ({
    id: 'changed_follower',
    title: 'The Changed Follower',
    tier: 'god_path',
    options: [],
    accumulates: true,
  } as unknown as Card)

  it('blocks insertion when 3 copies already exist in draw+discard+queue', () => {
    const cf = makeChangedFollower()
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
      currentCard: {
        id: 'shub_niggurath_3',
        title: 'The Unknown Goat',
        tier: 'god_path',
        options: [{
          label: 'Claim it formally',
          flavourText: 'test',
          effects: [{ type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 }],
        }],
      } as unknown as Card,
      deck: {
        drawPile: [cf, cf],
        discardPile: [cf],
        permDiscardPile: [],
        nextCycleQueue: [],
        chainReserve: [],
      },
      resources: { ...STARTING_RESOURCES },
      godPathProgress: 2,
      prepTags: [],
      cardRunState: {},
      activityLog: [],
      activityBatchSealed: true,
    } as any)

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const cfCount = [
      ...state.deck.drawPile,
      ...state.deck.discardPile,
      ...state.deck.nextCycleQueue,
    ].filter(c => c.id === 'changed_follower').length
    expect(cfCount).toBe(3)  // cap enforced — no 4th copy
  })

  it('allows insertion when fewer than 3 copies exist', () => {
    const cf = makeChangedFollower()
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
      currentCard: {
        id: 'shub_niggurath_3',
        title: 'The Unknown Goat',
        tier: 'god_path',
        options: [{
          label: 'Claim it formally',
          flavourText: 'test',
          effects: [{ type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 }],
        }],
      } as unknown as Card,
      deck: {
        drawPile: [cf],
        discardPile: [],
        permDiscardPile: [],
        nextCycleQueue: [],
        chainReserve: [],
      },
      resources: { ...STARTING_RESOURCES },
      godPathProgress: 2,
      prepTags: [],
      cardRunState: {},
      activityLog: [],
      activityBatchSealed: true,
    } as any)

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const cfCount = [
      ...state.deck.drawPile,
      ...state.deck.discardPile,
      ...state.deck.nextCycleQueue,
    ].filter(c => c.id === 'changed_follower').length
    expect(cfCount).toBeGreaterThanOrEqual(2)  // insertion succeeded
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```
npx vitest run src/state/gameStore.test.ts
```

Expected: FAIL — `MAX_CHANGED_FOLLOWER_COPIES` not yet defined, cap not enforced.

- [ ] **Step 3: Add deck cap constant and enforcement in gameStore.ts**

Near line 239 (after `const MAX_WEIGHT_CARDS = 3`), add:

```typescript
// P20-B: ceiling on changed_follower copies in drawPile + discardPile + nextCycleQueue
const MAX_CHANGED_FOLLOWER_COPIES = 3
```

In the `case 'insertCard':` block (around line 824), add a cap check right after `const toInsert = getCardById(effect.cardId)` and the `if (toInsert) {` guard, but before `uniqueInDeck`:

```typescript
        case 'insertCard': {
          const toInsert = getCardById(effect.cardId)
          if (toInsert) {
            // P20-B: deck cap for changed_follower
            if (toInsert.id === 'changed_follower') {
              const existingCFCount = [
                ...deck.drawPile,
                ...deck.discardPile,
                ...deck.nextCycleQueue,
              ].filter(c => c.id === 'changed_follower').length
              if (existingCFCount >= MAX_CHANGED_FOLLOWER_COPIES) break
            }

            // Enforce uniqueInDeck: ...  (existing code continues)
```

- [ ] **Step 4: Rewrite `changed_follower` in special.ts**

Replace the entire content of `src/data/cards/special.ts` with:

```typescript
import type { Card } from '../../types'

export const SPECIAL_CARDS: Card[] = [
  {
    id: 'changed_follower',
    title: 'The Changed Follower',
    flavourText: 'One of them is different now. The others have not noticed yet. You have.',
    tier: 'god_path',
    godPath: 'shub_niggurath',
    accumulates: true,
    optionPoolSize: 2,
    flavourTextByDrawCount: {
      1: 'One of them is different now. The others have not noticed yet. You have.',
      2: 'They have stopped pretending. Whatever is working through them has settled in.',
      3: 'Three of the congregation have turned. They are waiting for a signal.',
    },
    options: [
      // ── Keep (always shown, non-pooled) ────────────────────────────────────
      {
        label: 'Let them stay',
        flavourText: "You decided not to intervene. That counts as a decision.",
        effects: [
          { type: 'resource', resource: 'theChanged', delta: 1 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 5, maxPos: 10 },
        ],
      },

      // ── Sacrifice pool (12 options, 2 drawn per appearance) ────────────────
      // One option per categoryKey is selected per draw. Card is consumed.

      {
        label: 'Release them',
        flavourText: "The congregation found the resolution clarifying.",
        effects: [{ type: 'resource', resource: 'dread', delta: -2 }],
        pooled: true,
        categoryKey: 'dread_mild',
        previewTag: '−card',
      },
      {
        label: 'Remove them formally',
        flavourText: "Their certainty on the way out had a settling effect on the room.",
        effects: [{ type: 'resource', resource: 'dread', delta: -3 }],
        pooled: true,
        categoryKey: 'dread_strong',
        previewTag: '−card',
      },
      {
        label: 'Settle their accounts',
        flavourText: "A modest accounting. You didn't ask for the details.",
        effects: [{ type: 'resource', resource: 'gold', delta: 1 }],
        pooled: true,
        categoryKey: 'gold_small',
        previewTag: '−card',
      },
      {
        label: 'Liquidate their position',
        flavourText: "Months of devotion. Settled efficiently.",
        effects: [{ type: 'resource', resource: 'gold', delta: 2 }],
        pooled: true,
        categoryKey: 'gold_large',
        previewTag: '−card',
      },
      {
        label: 'Make an announcement',
        flavourText: "The congregation interpreted it as deliberate. We let them.",
        effects: [{ type: 'resource', resource: 'influence', delta: 1 }],
        pooled: true,
        categoryKey: 'influence_small',
        previewTag: '−card',
      },
      {
        label: 'Use the moment',
        flavourText: "Word spread. The right word, this time.",
        effects: [{ type: 'resource', resource: 'influence', delta: 2 }],
        pooled: true,
        categoryKey: 'influence_large',
        previewTag: '−card',
      },
      {
        label: 'Collect what remains',
        flavourText: "Something they carried remained. We kept it.",
        effects: [{ type: 'resource', resource: 'relics', delta: 1 }],
        pooled: true,
        categoryKey: 'relics_plain',
        previewTag: '−card',
      },
      {
        label: 'Retain and resolve',
        flavourText: "Useful, and quieter after. We noted both.",
        effects: [
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        pooled: true,
        categoryKey: 'relics_combo',
        previewTag: '−card',
      },
      {
        label: 'Fill the space',
        flavourText: "Someone came to fill the space. They didn't ask why it was empty.",
        effects: [{ type: 'resource', resource: 'followers', delta: 1 }],
        pooled: true,
        categoryKey: 'followers_plain',
        previewTag: '−card',
      },
      {
        label: 'Draw replacements',
        flavourText: "Three came to replace one. They asked no questions.",
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        pooled: true,
        categoryKey: 'followers_costly',
        previewTag: '−card',
      },
      {
        label: 'Process it efficiently',
        flavourText: "Practical and visible. Two problems addressed.",
        effects: [
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        pooled: true,
        categoryKey: 'combo',
        previewTag: '−card',
      },
      {
        label: 'Let the problem leave with them',
        flavourText: "The problem left with them. We decided not to examine this.",
        effects: [{ type: 'removeRandomThreat' }],
        pooled: true,
        categoryKey: 'special',
        previewTag: '−card',
      },
    ],
  },
]
```

- [ ] **Step 5: Run tests**

```
npx vitest run
```

Expected: all tests pass including the new deck cap tests.

- [ ] **Step 6: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/special.ts src/state/gameStore.ts src/state/gameStore.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(shub): changed_follower redesign — pooled sacrifice pool + deck cap (P20-B)"
```

---

## Task 3: Mutation Dark Options

**Files:**
- Modify: `src/data/cards/mutations.ts`

**Interfaces:**
- Consumes: `changed_follower` card (Task 2) — inserted rather than theChanged +1
- Produces: 6 dark options with `insertCard: changed_follower` at positions 3–7

- [ ] **Step 1: Write failing test**

Create `src/data/cards/mutations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { MUTATION_CARDS } from './mutations'

describe('mutation dark options', () => {
  const darkOptions = MUTATION_CARDS.map(card => ({
    cardId: card.id,
    dark: card.options.find(o => o.hideWhenUnavailable === true),
  }))

  it('every mutation card has exactly one dark option', () => {
    for (const { cardId, dark } of darkOptions) {
      expect(dark, `${cardId} missing dark option`).toBeDefined()
    }
  })

  it('no dark option grants theChanged +1 directly', () => {
    for (const { cardId, dark } of darkOptions) {
      const hasTheChanged = dark?.effects.some(
        e => e.type === 'resource' && (e as any).resource === 'theChanged'
      )
      expect(hasTheChanged, `${cardId} dark option still grants theChanged`).toBe(false)
    }
  })

  it('every dark option inserts changed_follower at positions 3–7', () => {
    for (const { cardId, dark } of darkOptions) {
      const insert = dark?.effects.find(
        e => e.type === 'insertCard' && (e as any).cardId === 'changed_follower'
      ) as any
      expect(insert, `${cardId} dark option missing insertCard changed_follower`).toBeDefined()
      expect(insert.minPos).toBe(3)
      expect(insert.maxPos).toBe(7)
    }
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```
npx vitest run src/data/cards/mutations.test.ts
```

Expected: FAIL on "no dark option grants theChanged +1 directly" and "every dark option inserts changed_follower".

- [ ] **Step 3: Update mutations.ts dark options**

In each of the 6 mutation cards, replace the dark option's `theChanged +1` resource effect with `insertCard: changed_follower`. The dark options are identified by `hideWhenUnavailable: true` and `cardDrawCount ≥ 2` condition.

**second_account** dark option — currently:
```typescript
effects: [
  { type: 'resource', resource: 'relics', delta: 1 },
  { type: 'resource', resource: 'dread', delta: 4 },
  { type: 'resource', resource: 'theChanged', delta: 1 },
],
```
Replace with:
```typescript
effects: [
  { type: 'resource', resource: 'relics', delta: 1 },
  { type: 'resource', resource: 'dread', delta: 4 },
  { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
],
```

**word_has_spread_further** dark option — currently:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: 4 },
  { type: 'resource', resource: 'followers', delta: 3 },
  { type: 'resource', resource: 'dread', delta: 5 },
  { type: 'resource', resource: 'theChanged', delta: 1 },
],
```
Replace with:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: 4 },
  { type: 'resource', resource: 'followers', delta: 3 },
  { type: 'resource', resource: 'dread', delta: 5 },
  { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
],
```

**second_run** dark option — currently:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: 4 },
  { type: 'resource', resource: 'dread', delta: 3 },
  { type: 'resource', resource: 'theChanged', delta: 1 },
],
```
Replace with:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: 4 },
  { type: 'resource', resource: 'dread', delta: 3 },
  { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
],
```

**still_burning** dark option — currently:
```typescript
effects: [
  { type: 'resource', resource: 'relics', delta: 2 },
  { type: 'resource', resource: 'dread', delta: 4 },
  { type: 'resource', resource: 'theChanged', delta: 1 },
],
```
Replace with:
```typescript
effects: [
  { type: 'resource', resource: 'relics', delta: 2 },
  { type: 'resource', resource: 'dread', delta: 4 },
  { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
],
```

**still_open** dark option — currently:
```typescript
effects: [
  { type: 'resource', resource: 'dread', delta: 4 },
  { type: 'resource', resource: 'followers', delta: -1 },
  { type: 'resource', resource: 'theChanged', delta: 1 },
],
```
Replace with:
```typescript
effects: [
  { type: 'resource', resource: 'dread', delta: 4 },
  { type: 'resource', resource: 'followers', delta: -1 },
  { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
],
```

**the_merchant_again** dark option — currently:
```typescript
effects: [
  { type: 'resource', resource: 'relics', delta: 2 },
  { type: 'resource', resource: 'dread', delta: 3 },
  { type: 'resource', resource: 'theChanged', delta: 1 },
],
```
Replace with:
```typescript
effects: [
  { type: 'resource', resource: 'relics', delta: 2 },
  { type: 'resource', resource: 'dread', delta: 3 },
  { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
],
```

- [ ] **Step 4: Run tests**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/mutations.ts src/data/cards/mutations.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(shub): mutation dark options insert changed_follower instead of theChanged +1 (P20-B)"
```

---

## Task 4: Shub Chain Card Revisions

**Files:**
- Modify: `src/data/godPaths/shub_niggurath.ts`

**Interfaces:**
- Consumes: `changed_follower` card (Task 2)
- Produces: 6 updated chain cards + `shub_words_come_naturally` redesign

- [ ] **Step 1: Card 1 — add stall option**

In `shub_niggurath_1`, the options array currently has 2 entries. Add a third:

```typescript
      {
        label: 'Ignore it',
        flavourText: "The offerings continued. They became more correct over time.",
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'shub_niggurath_1', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
```

- [ ] **Step 2: Card 2 — differentiate opt 2 + add stall**

In `shub_niggurath_2` opt 2 "Conduct it with appropriate preparations", add to effects array:
```typescript
          { type: 'seedMutations', count: 1 },
```
(Add after `{ type: 'advanceGodPath' }`)

Then add a stall option (third entry):
```typescript
      {
        label: 'Postpone',
        flavourText: "The air is still warm. We will have time, even if something is less pleased.",
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'shub_niggurath_2', position: 'random', minPos: 4, maxPos: 7 },
        ],
      },
```

- [ ] **Step 3: Card 3 — add insertCard to opt 1 + add stall**

In `shub_niggurath_3` opt 1 "Claim it formally", add to effects (after `advanceGodPath`, before `seedMutations`):
```typescript
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
```

Then add stall option (fourth entry, after the existing three):
```typescript
      {
        label: 'Chase it off',
        flavourText: "It left. The trail of affected grass ends at the woods. It was back by dawn.",
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'shub_niggurath_3', position: 'random', minPos: 4, maxPos: 7 },
        ],
      },
```

- [ ] **Step 4: Card 4 — fix opt 1 effects + add stall**

In `shub_niggurath_4` opt 1 "Lead the congregation", replace the entire `effects` array:

```typescript
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
          { type: 'advanceGodPath' },
          { type: 'seedMutations', count: 2 },
        ],
```

(Removes the `theChanged +1` resource effect, adds `insertCard: changed_follower`.)

Then add stall option (fourth entry):
```typescript
      {
        label: 'Disperse them and lock the barn',
        flavourText: "They are outside now. You can hear both — the congregation and the hooves.",
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'insertCard', cardId: 'shub_niggurath_4', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
```

- [ ] **Step 5: Card 5 — replace opt 3**

In `shub_niggurath_5`, replace the "Wait at the treeline" option (currently last in the options array):

```typescript
// OLD:
      {
        label: 'Wait at the treeline',
        flavourText: 'The forest grows into the hesitation. Two of ours stepped toward it before you could call them back.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'removeCard', cardId: 'shub_niggurath_5' },
          { type: 'insertCard', cardId: 'shub_niggurath_5', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },

// NEW:
      {
        label: 'Pull them back',
        flavourText: "Two of ours stepped toward it. You called them back. Only one responded.",
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'insertCard', cardId: 'shub_niggurath_5', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
```

- [ ] **Step 6: Card 6 — update victory gate**

In `shub_niggurath_6`, opt 1 "Complete the offering" condition, change:
```typescript
// OLD:
            { type: 'resourceMin', resource: 'theChanged', min: 4 },
// NEW:
            { type: 'resourceMin', resource: 'theChanged', min: 3 },
```

- [ ] **Step 7: shub_words_come_naturally — tier + option revisions**

In the `SHUB_WORDS_COME_NATURALLY` constant:

Change `tier: 'god_path'` → `tier: 'threat'` and remove `godPath: 'shub_niggurath'` line.

Replace the options array entirely:
```typescript
  options: [
    {
      label: 'Go to them',
      flavourText: 'You knew the words. You did not know that you knew the words.',
      effects: [
        { type: 'resource', resource: 'followers', delta: -1 },
        { type: 'advanceGodPath' },
        { type: 'seedMutations', count: 1 },
      ],
      condition: { type: 'godPathStageMin', min: 3 },
    },
    {
      label: 'Leave before they reach you',
      flavourText: "You left before they got to you. Still chanting.",
      effects: [
        { type: 'resource', resource: 'dread', delta: -2 },
        { type: 'insertCard', cardId: 'shub_niggurath_4', position: 'random', minPos: 4, maxPos: 7 },
      ],
    },
  ],
```

**Note:** Changing to `tier: 'threat'` means this card is now deferred to the next reshuffle when inserted (standard threat behaviour). This is intentional per spec §5.

- [ ] **Step 8: Run tests**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/shub_niggurath.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(shub): chain cards 1-6 stall options + changed_follower paths + win gate (P20-B)"
```

---

## Task 5: Supporting Cards

**Files:**
- Modify: `src/data/cards/threats.ts`

**Interfaces:**
- Consumes: `changed_follower` card (Task 2)
- Produces: `fishermans_return` with 3rd option; `the_weight_of_it` with lower followers gate

- [ ] **Step 1: fishermans_return — add third option**

In `fishermans_return` options array (currently 3 options: "Return the artefact", "Refuse", "Stall and deflect"), add a fourth option after "Stall and deflect":

```typescript
      {
        label: "Let him see what you've become",
        flavourText: "He saw one of yours on the way in. He has not asked for the artefact back.",
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },
```

- [ ] **Step 2: the_weight_of_it opt 1 — lower followers gate**

In `the_weight_of_it` opt 1 "Steady them", change:
```typescript
// OLD:
        condition: { type: 'resourceMin', resource: 'followers', min: 3 },
// NEW:
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
```

- [ ] **Step 3: Run tests**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/threats.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(shub): fishermans_return opt3 + weight_of_it gate lowered (P20-B)"
```

---

## Task 6: Doom Card 4 Conditional + seedMutations Log + ActivityLog Entry

**Files:**
- Modify: `src/data/cards/unravelling.ts`
- Modify: `src/state/gameStore.ts`
- Modify: `src/components/game/ActivityLog.tsx`

**Interfaces:**
- Consumes: `ActivityEntry { kind: 'mutationSeed' }` (Task 1), `Condition { type: 'godPath' }` (already in types)
- Produces: doom card 4 split into Shub/non-Shub options; seedMutations pushes 'mutationSeed' to activityLog

**Design note:** Doom card 4's `insertCard: changed_follower` is made conditional by splitting the single "Embrace the change" option into two — one Shub-only (keeps insert), one non-Shub (plain resource drain). Both use the existing `godPath` Condition type, which `checkCondition` already handles. This avoids any engine-level hack and leaves `grove_awaits` unaffected (it was never a doom option).

- [ ] **Step 1: Write failing tests**

Add to `src/state/gameStore.test.ts`:

```typescript
describe('doom card 4 — changed_follower conditional (P20-B)', () => {
  it('on Shub run: "Embrace the change" (Shub option) condition passes', () => {
    const { UNRAVELLING_CARDS } = require('../data/cards/unravelling')
    const doom4 = UNRAVELLING_CARDS.find((c: any) => c.id === 'unravelling_4')
    const shubOpt = doom4.options.find((o: any) =>
      o.condition?.type === 'godPath' && o.condition?.path === 'shub_niggurath'
    )
    expect(shubOpt).toBeDefined()
    const insertEffect = shubOpt.effects.find((e: any) => e.type === 'insertCard' && e.cardId === 'changed_follower')
    expect(insertEffect).toBeDefined()

    const state = {
      resources: { ...STARTING_RESOURCES },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [] },
      godPathProgress: 0,
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
    }
    expect(checkCondition(shubOpt.condition, state as any)).toBe(true)
  })

  it('on Nyar run: non-Shub option visible, has no insertCard effect', () => {
    const { UNRAVELLING_CARDS } = require('../data/cards/unravelling')
    const doom4 = UNRAVELLING_CARDS.find((c: any) => c.id === 'unravelling_4')
    const nonShubOpt = doom4.options.find((o: any) =>
      o.condition?.type === 'not' && o.condition?.condition?.path === 'shub_niggurath'
    )
    expect(nonShubOpt).toBeDefined()
    const insertEffect = nonShubOpt.effects.find((e: any) => e.type === 'insertCard')
    expect(insertEffect).toBeUndefined()  // non-Shub option has no card insert

    const state = {
      resources: { ...STARTING_RESOURCES },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [] },
      godPathProgress: 0,
      runConfig: { godPath: 'nyarlathotep', runLength: 'short' },
    }
    expect(checkCondition(nonShubOpt.condition, state as any)).toBe(true)
  })
})

describe('seedMutations activity log (P20-B)', () => {
  it('pushes mutationSeed entry when mutations are applied', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
      currentCard: {
        id: 'shub_niggurath_3',
        title: 'The Unknown Goat',
        tier: 'god_path',
        options: [{
          label: 'Claim it formally',
          flavourText: 'test',
          effects: [{ type: 'seedMutations', count: 2 }],
        }],
      } as unknown as Card,
      deck: {
        drawPile: [{ id: 'woodcutters_report', title: 'Woodcutters Report', tier: 'common', options: [] } as unknown as Card],
        discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [],
      },
      resources: { ...STARTING_RESOURCES },
      godPathProgress: 2,
      prepTags: [],
      cardRunState: {},
      activityLog: [],
      activityBatchSealed: true,
    } as any)

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const mutEntry = state.activityLog.find(e => e.kind === 'mutationSeed')
    expect(mutEntry).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/state/gameStore.test.ts
```

Expected: FAIL — no split options on doom card 4 yet, no mutationSeed entry.

- [ ] **Step 3: Update doom card 4 in unravelling.ts**

In `src/data/cards/unravelling.ts`, find `unravelling_4`. Replace the current "Embrace the change" option with two conditional options:

```typescript
// OLD (single option):
      {
        label: 'Embrace the change',
        flavourText: 'Two changed overnight. You watch the others watch them. Nobody says anything.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 2, maxPos: 5 },
        ],
      },

// NEW (split into Shub / non-Shub):
      {
        // Shub-Niggurath runs: insert changed_follower (P20-B)
        label: 'Embrace the change',
        flavourText: 'Two changed overnight. You watch the others watch them. Nobody says anything.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 2, maxPos: 5 },
        ],
        condition: { type: 'godPath', path: 'shub_niggurath' },
      },
      {
        // Non-Shub runs: resource drain, no card (P20-B)
        label: 'Embrace the change',
        flavourText: 'Two changed overnight. You watch the others watch them. Nobody says anything.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -3 },
          { type: 'resource', resource: 'dread', delta: 4 },
        ],
        condition: { type: 'not', condition: { type: 'godPath', path: 'shub_niggurath' } },
      },
```

- [ ] **Step 4: Add seedMutations log entry in gameStore.ts**

Find the `case 'seedMutations':` block (around line 1027). Inside the `if (toReplace.length > 0)` block, after `deck = { ...deck, drawPile: newDrawPile }`, add:

```typescript
            // P20-B: notify player their deck was mutated
            activityEntries.push({ kind: 'mutationSeed' as const })
```

> **Implementation note:** The exact mechanism depends on how `resolveOption` accumulates activity entries. Search for how other non-deck entries (like `{ kind: 'whisper' }`) are added to the log in `resolveOption`, and use the same pattern. If activity entries are collected into a local array and applied in a single `set()` call at the end, add the entry to that array. If they're pushed directly via `pushActivity`, call `pushActivity({ kind: 'mutationSeed' })` at that point.

- [ ] **Step 5: Add mutationSeed rendering to ActivityLog.tsx**

In `src/components/game/ActivityLog.tsx`:

Add to `entryKey` switch (after `case 'whisper':`):
```typescript
    case 'mutationSeed': return 'ms'
```

In `ActivityRow`, add before `return null`:
```typescript
  if (entry.kind === 'mutationSeed') {
    return (
      <div style={{ ...baseStyle, color: '#6fb86a', fontStyle: 'italic' }}>
        <span style={{ width: '14px', textAlign: 'center' }}>⌘</span>
        <span>Something in your deck has changed.</span>
      </div>
    )
  }
```

- [ ] **Step 6: Run tests**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/unravelling.ts src/state/gameStore.ts src/state/gameStore.test.ts src/components/game/ActivityLog.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(shub): doom card 4 Shub/non-Shub split + seedMutations log entry (P20-B)"
```

---

## Task 7: UI — theChanged Display

**Files:**
- Modify: `src/components/game/ResourceBar.tsx`
- Modify: `src/components/game/InGameMenuButton.tsx`

**Interfaces:**
- Consumes: `runConfig?.godPath`, `resources.theChanged` from gameStore
- Produces: theChanged removed from resource bar; shown as "The Changed: N" in menu (Shub runs only)

- [ ] **Step 1: Remove theChanged from ResourceBar.tsx**

Find line 244:
```typescript
          {isShub && <ResourceCounter rkey="theChanged" label="Changed" Icon={TheChangedIcon} />}
```

Delete this line entirely. The `isShub` and `TheChangedIcon` variables may now be unused — check and remove their declarations if so.

Check line 216: `const isShub = runConfig?.godPath === 'shub_niggurath'` — keep if `isShub` is still used elsewhere in the component. If the theChanged counter was the only use, remove both the `isShub` constant and any `TheChangedIcon` import.

- [ ] **Step 2: Add theChanged section to InGameMenuButton.tsx**

In `InGameMenuButton`, add selector near the top of the component (after `prepPills` declaration, around line 42):

```typescript
  const activeGod    = useGameStore(s => s.runConfig?.godPath)
  const theChanged   = useGameStore(s => s.resources.theChanged ?? 0)
  const isShub       = activeGod === 'shub_niggurath'
```

Then in the popover JSX, after the prep-tags section (after the closing `</div>` of the Preparations block, around line 170) and before the Audio section, add:

```typescript
          {/* The Changed — Shub runs only */}
          {isShub && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{
                fontSize: '0.7rem',
                color: 'rgba(111,184,106,0.75)',
                fontVariant: 'small-caps',
                letterSpacing: '0.08em',
                marginBottom: '0.35rem',
              }}>
                The Changed
              </div>
              <div style={{
                fontSize: '0.85rem',
                color: '#6fb86a',
                textShadow: '0 0 6px rgba(111,184,106,0.4)',
                fontVariant: 'small-caps',
                letterSpacing: '0.06em',
              }}>
                {theChanged}
              </div>
            </div>
          )}
```

- [ ] **Step 3: Run tests**

```
npx vitest run
```

Expected: all tests pass. Visually verify in browser that theChanged no longer appears in the resource bar, and appears in the menu on a Shub run.

- [ ] **Step 4: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/game/ResourceBar.tsx src/components/game/InGameMenuButton.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(ui): move theChanged from resource bar to menu (Shub only) (P20-B)"
```

---

## Task 8: Tests

**Files:**
- Create: `src/engine/pooledOptions.test.ts`
- Modify: `src/state/gameStore.test.ts`

- [ ] **Step 1: Write pooledOptions tests**

Create `src/engine/pooledOptions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyPooledOptions } from './pooledOptions'
import type { Card, CardOption } from '../types'

const makeCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'changed_follower',
  title: 'The Changed Follower',
  tier: 'god_path',
  optionPoolSize: 2,
  options: [],
  ...overrides,
} as unknown as Card)

const makePooledOpt = (categoryKey: string, label: string): CardOption => ({
  label,
  flavourText: 'test',
  effects: [],
  pooled: true,
  categoryKey,
} as unknown as CardOption)

const makeStaticOpt = (label: string): CardOption => ({
  label,
  flavourText: 'test',
  effects: [],
} as unknown as CardOption)

describe('applyPooledOptions', () => {
  it('returns card unchanged when no pooled options', () => {
    const card = makeCard({ options: [makeStaticOpt('Keep')] })
    const result = applyPooledOptions(card, 1)
    expect(result.options).toHaveLength(1)
    expect(result.options[0].label).toBe('Keep')
  })

  it('shows exactly optionPoolSize pooled options plus all non-pooled', () => {
    const opts = [
      makeStaticOpt('Keep'),
      makePooledOpt('cat_a', 'A1'),
      makePooledOpt('cat_b', 'B1'),
      makePooledOpt('cat_c', 'C1'),
      makePooledOpt('cat_d', 'D1'),
      makePooledOpt('cat_e', 'E1'),
    ]
    const card = makeCard({ options: opts, optionPoolSize: 2 })
    const result = applyPooledOptions(card, 1)
    const pooledShown = result.options.filter(o => o.pooled)
    expect(result.options.filter(o => !o.pooled)).toHaveLength(1)  // Keep always shown
    expect(pooledShown).toHaveLength(2)
  })

  it('never shows two options from the same categoryKey', () => {
    const opts = [
      makePooledOpt('cat_a', 'A1'),
      makePooledOpt('cat_a', 'A2'),  // same category
      makePooledOpt('cat_b', 'B1'),
      makePooledOpt('cat_c', 'C1'),
    ]
    const card = makeCard({ options: opts, optionPoolSize: 2 })

    for (let draw = 1; draw <= 50; draw++) {
      const result = applyPooledOptions(card, draw)
      const pooledShown = result.options.filter(o => o.pooled)
      const categories = pooledShown.map(o => o.categoryKey)
      const uniqueCategories = new Set(categories)
      expect(uniqueCategories.size).toBe(categories.length)  // no duplicates
    }
  })

  it('same draw count produces identical option pair (determinism)', () => {
    const opts = [
      makePooledOpt('cat_a', 'A1'),
      makePooledOpt('cat_b', 'B1'),
      makePooledOpt('cat_c', 'C1'),
      makePooledOpt('cat_d', 'D1'),
    ]
    const card = makeCard({ options: opts, optionPoolSize: 2 })

    const result1 = applyPooledOptions(card, 3)
    const result2 = applyPooledOptions(card, 3)
    expect(result1.options.map(o => o.label)).toEqual(result2.options.map(o => o.label))
  })

  it('different draw counts can produce different option pairs', () => {
    const opts = [
      makePooledOpt('cat_a', 'A1'),
      makePooledOpt('cat_b', 'B1'),
      makePooledOpt('cat_c', 'C1'),
      makePooledOpt('cat_d', 'D1'),
      makePooledOpt('cat_e', 'E1'),
      makePooledOpt('cat_f', 'F1'),
    ]
    const card = makeCard({ options: opts, optionPoolSize: 2 })

    const results = new Set<string>()
    for (let draw = 1; draw <= 20; draw++) {
      const result = applyPooledOptions(card, draw)
      results.add(result.options.filter(o => o.pooled).map(o => o.label).join(','))
    }
    // Over 20 draws with 6 categories, expect more than one unique pair
    expect(results.size).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 2: Write remaining gameStore tests**

Add to `src/state/gameStore.test.ts`:

```typescript
describe('shub_niggurath_6 victory conditions (P20-B)', () => {
  it('theChanged ≥ 3 + godPathStage ≥ 5 → full victory option available', () => {
    const { shub6 } = (() => {
      // Import or find card inline
      const { SHUB_NIGGURATH_CHAIN } = require('../data/godPaths/shub_niggurath')
      return { shub6: SHUB_NIGGURATH_CHAIN.find((c: any) => c.id === 'shub_niggurath_6') }
    })()
    expect(shub6).toBeDefined()

    const state = {
      resources: { ...STARTING_RESOURCES, theChanged: 3, relics: 2 },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [] },
      godPathProgress: 5,
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
    }

    const fullOpt = shub6.options[0]  // "Complete the offering"
    expect(fullOpt.condition).toBeDefined()
    const result = checkCondition(fullOpt.condition, state as any)
    expect(result).toBe(true)
  })

  it('theChanged = 2 → full victory condition fails', () => {
    const { SHUB_NIGGURATH_CHAIN } = require('../data/godPaths/shub_niggurath')
    const shub6 = SHUB_NIGGURATH_CHAIN.find((c: any) => c.id === 'shub_niggurath_6')
    const state = {
      resources: { ...STARTING_RESOURCES, theChanged: 2, relics: 2 },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [] },
      godPathProgress: 5,
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
    }
    const result = checkCondition(shub6.options[0].condition, state as any)
    expect(result).toBe(false)
  })

  it('theChanged = 2 + relics ≥ 2 → partial victory available', () => {
    const { SHUB_NIGGURATH_CHAIN } = require('../data/godPaths/shub_niggurath')
    const shub6 = SHUB_NIGGURATH_CHAIN.find((c: any) => c.id === 'shub_niggurath_6')
    const state = {
      resources: { ...STARTING_RESOURCES, theChanged: 2, relics: 2 },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [] },
      godPathProgress: 5,
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
    }
    const partialOpt = shub6.options[1]  // "Offer what you have"
    const result = checkCondition(partialOpt.condition, state as any)
    expect(result).toBe(true)
  })
})

describe('the_weight_of_it opt 1 gate (P20-B)', () => {
  it('followers = 2 → "Steady them" condition passes', () => {
    const { THREAT_CARDS } = require('../data/cards/threats')
    const twoi = THREAT_CARDS.find((c: any) => c.id === 'the_weight_of_it')
    const steadyOpt = twoi.options[0]  // "Steady them"
    const state = {
      resources: { ...STARTING_RESOURCES, followers: 2 },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [] },
      godPathProgress: 0,
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
    }
    expect(checkCondition(steadyOpt.condition, state as any)).toBe(true)
  })

  it('followers = 1 → "Steady them" condition fails', () => {
    const { THREAT_CARDS } = require('../data/cards/threats')
    const twoi = THREAT_CARDS.find((c: any) => c.id === 'the_weight_of_it')
    const steadyOpt = twoi.options[0]
    const state = {
      resources: { ...STARTING_RESOURCES, followers: 1 },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [] },
      godPathProgress: 0,
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
    }
    expect(checkCondition(steadyOpt.condition, state as any)).toBe(false)
  })
})
```

- [ ] **Step 3: Run all tests**

```
npx vitest run
```

Expected: all tests pass (178 existing + new tests).

- [ ] **Step 4: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/engine/pooledOptions.test.ts src/state/gameStore.test.ts src/data/cards/mutations.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "test(p20b): pooled options, deck cap, doom conditional, victory gates (P20-B)"
```

---

## Spec Coverage Check

| Spec section | Task |
|---|---|
| §1 changed_follower identity (tier, godPath, accumulates, cap) | 2 |
| §1 flavourTextByDrawCount (3 escalating texts) | 2 |
| §1 Keep option (theChanged +1, card remains) | 2 |
| §1 12 sacrifice pool options, 2 per draw, one per category | 2 |
| §1 Deck cap 3 copies enforced | 2 |
| §1 Acquisition paths (mutation darks, shub_3, shub_4, grove_awaits) | 3, 4 |
| §2 theChanged removed from resource bar | 7 |
| §2 theChanged shown in menu (Shub only, even at 0) | 7 |
| §3 Full victory: theChanged ≥ 3 | 4 |
| §3 Partial victory: theChanged ≥ 2 + relics ≥ 2 | 4 |
| §4 Card 1 stall option | 4 |
| §4 Card 2 stall + opt 2 seedMutations | 4 |
| §4 Card 3 stall + opt 1 insertCard: changed_follower | 4 |
| §4 Card 4 stall + lead opt insertCard (not theChanged) | 4 |
| §4 Card 5 replace opt 3 (clean stall) | 4 |
| §4 Card 6 gate update | 4 |
| §5 shub_words_come_naturally tier + options | 4 |
| §5 fishermans_return opt 3 | 5 |
| §5 the_weight_of_it opt 1 gate lowered | 5 |
| §6 Doom card 4 Shub/non-Shub option split (unravelling.ts) | 6 |
| §7a Pooled options engine (types, seeded RNG, selection) | 1 |
| §7b theChanged bar suppression | 7 |
| §7c Menu theChanged display | 7 |
| §7d seedMutations activity log | 6 |
| §7e changed_follower deck cap | 2 |
| §7f Doom card 4 godPath conditional | 6 |
| §9 All test cases | 8 |

> **Edge case noted in spec (§1 grove_awaits):** `changed_follower` can still be inserted on non-Shub runs via `grove_awaits` "Go yourself" (because `woodcutters_report` is Shub-weighted but not Shub-exclusive). On those runs, theChanged is never checked and Keep does nothing useful. This is acceptable — frequency is very low. The doom card 4 fix (Task 6) uses card-level conditions and does NOT affect `grove_awaits` (which is a separate card with a direct `insertCard: changed_follower` effect, not a doom option). Fix the `grove_awaits` edge case in a future pass if playtesting surfaces it.
