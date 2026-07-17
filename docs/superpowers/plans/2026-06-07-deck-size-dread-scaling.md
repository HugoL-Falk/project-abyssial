# Deck Size & Dread Scaling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce starting deck from ~28 cards to ~15 by introducing core card rotation, and add Unravelling-scaling dread costs to psychologically intense card options.

**Architecture:** P12-14 splits CORE_CARDS into a 5-card always-in spine and a 13-card weighted rotation pool (drawing 2–3 per run), and reduces commons counts. P12-15 adds a `dreadPressureScaling` boolean to `CardOption` that causes the engine to add `unravellingTier − 1` to that option's dread delta at display and resolution time. Both features touch `gameStore.ts`; P12-14 also extends `godPath.ts`, P12-15 also touches `types/index.ts` and `core.ts`.

**Tech Stack:** TypeScript, React, Zustand. Verify with `npm run typecheck` (`tsc --noEmit`). No test framework — verify by type checking and manual gameplay.

---

## File Map

| File | Change |
|---|---|
| `src/engine/godPath.ts` | Add `weightedCoreDraw`; reduce `weightedDraw` commons limits |
| `src/state/gameStore.ts` | `startRun`: use core rotation + new commons. `getVisibleOptions`: apply dread pressure |
| `src/types/index.ts` | Add `dreadPressureScaling?: boolean` to `CardOption` |
| `src/data/cards/core.ts` | Add `dreadPressureScaling: true` to 9 options across 7 cards |

---

## Task 1: Core rotation helper + reduced commons counts

**Files:**
- Modify: `src/engine/godPath.ts`

This task adds `weightedCoreDraw` (mirrors `weightedDraw` but draws 2 for short runs, 3 for standard from a supplied pool) and reduces the commons min/max to 3–4 (short) and 4–5 (standard).

- [ ] **Step 1: Open `src/engine/godPath.ts` and find the `weightedDraw` function (lines 5–33)**

Current min/max:
```typescript
const minCount = runLength === 'short' ? 5 : 8
const maxCount = runLength === 'short' ? 6 : 10
```

- [ ] **Step 2: Update `weightedDraw` commons limits**

Change lines 10–11 to:
```typescript
const minCount = runLength === 'short' ? 3 : 4
const maxCount = runLength === 'short' ? 4 : 5
```

- [ ] **Step 3: Add `weightedCoreDraw` after the `weightedDraw` function (after line 33, before `function countActiveChainCards`)**

```typescript
export function weightedCoreDraw(
  godPath: GodPath,
  runLength: RunLength,
  pool: Card[]
): Card[] {
  const count = runLength === 'short' ? 2 : 3

  const weightedPool: Card[] = []
  for (const card of pool) {
    const weight = card.godPathWeight === godPath ? THEME_WEIGHT_MULTIPLIER : 1
    for (let i = 0; i < weight; i++) weightedPool.push(card)
  }

  const selected: Card[] = []
  const usedIds = new Set<string>()
  const shuffled = [...weightedPool].sort(() => Math.random() - 0.5)

  for (const card of shuffled) {
    if (!usedIds.has(card.id) && selected.length < count) {
      selected.push(card)
      usedIds.add(card.id)
    }
  }

  return selected
}
```

- [ ] **Step 4: Run typecheck**

```
cd E:\Project Abyssial\Code\project-abyssial
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add src/engine/godPath.ts
git commit -m "feat(P12-14): add weightedCoreDraw; reduce commons min/max"
```

---

## Task 2: Wire core rotation into startRun

**Files:**
- Modify: `src/state/gameStore.ts`

This task replaces `[...CORE_CARDS, ...]` in `startRun` with always-in spine + weighted rotation draw. The import for `weightedCoreDraw` must be added at the top.

- [ ] **Step 1: Add `weightedCoreDraw` to the import from `../engine/godPath` in `gameStore.ts`**

Find the line near the top of the file that imports `weightedDraw`:
```typescript
import { weightedDraw, advanceGodPathChain } from '../engine/godPath'
```

Change it to:
```typescript
import { weightedDraw, weightedCoreDraw, advanceGodPathChain } from '../engine/godPath'
```

- [ ] **Step 2: Add the `ALWAYS_IN_CORE_IDS` constant directly above the `useGameStore = create(...)` line**

```typescript
const ALWAYS_IN_CORE_IDS = new Set([
  'congregation_meets',
  'funds_run_low',
  'the_donation',
  'rival_stirs',
  'stranger_asks_questions',
])
```

- [ ] **Step 3: In `startRun`, replace the deck-build block**

Find this line (around line 248):
```typescript
const regularCards: Card[] = [...CORE_CARDS, ...commons, ...rares, ...injectedCards]
```

Replace **only that line** with:
```typescript
const alwaysInCore = CORE_CARDS.filter(c => ALWAYS_IN_CORE_IDS.has(c.id))
const rotationPool = CORE_CARDS.filter(c => !ALWAYS_IN_CORE_IDS.has(c.id))
const coreRotation = weightedCoreDraw(runConfig.godPath, runConfig.runLength, rotationPool)
const regularCards: Card[] = [...alwaysInCore, ...coreRotation, ...commons, ...rares, ...injectedCards]
```

- [ ] **Step 4: Run typecheck**

```
cd E:\Project Abyssial\Code\project-abyssial
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Verify deck size manually**

Start the dev server (`npm run dev`), start a standard run, open browser console and run:

```javascript
// In console after a run starts — check deck size
window.__ZUSTAND_DEVTOOLS__ // or check via React DevTools
```

Alternatively, start a run and count cards in the draw pile UI. Target: ~14–16 cards on first draw.

Expected deck composition for a standard run:
- Always-in: 5 (congregation_meets, funds_run_low, the_donation, rival_stirs, stranger_asks_questions)
- Rotation: 3
- Commons: 4–5
- Rare: 2 (one chain card inserted into draw pile position)
- Chain card 1: 1
Total: ~15–16

- [ ] **Step 6: Commit**

```
git add src/state/gameStore.ts
git commit -m "feat(P12-14): core rotation — 5 always-in spine + weighted draw from 13-card pool"
```

---

## Task 3: Add `dreadPressureScaling` to `CardOption` type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Open `src/types/index.ts` and find the `CardOption` type (around line 69)**

Current:
```typescript
export type CardOption = {
  label: string
  flavourText: string
  effects: Effect[]
  insertsCards?: CardId[]
  removesCards?: CardId[]
  condition?: Condition
  hideWhenUnavailable?: boolean
  isWhisper?: boolean
}
```

- [ ] **Step 2: Add `dreadPressureScaling` field**

```typescript
export type CardOption = {
  label: string
  flavourText: string
  effects: Effect[]
  insertsCards?: CardId[]
  removesCards?: CardId[]
  condition?: Condition
  hideWhenUnavailable?: boolean
  isWhisper?: boolean
  dreadPressureScaling?: boolean   // if true, dread costs increase by (unravellingTier − 1)
}
```

- [ ] **Step 3: Run typecheck**

```
cd E:\Project Abyssial\Code\project-abyssial
npm run typecheck
```

Expected: no errors (optional field, no existing sites break).

- [ ] **Step 4: Commit**

```
git add src/types/index.ts
git commit -m "feat(P12-15): add dreadPressureScaling field to CardOption type"
```

---

## Task 4: Apply dread pressure in `getVisibleOptions`

**Files:**
- Modify: `src/state/gameStore.ts`

The `getVisibleOptions` helper (lines 122–149) computes `effectiveEffects` for display and resolution. This task extends it to add `unravellingTier − 1` to any positive dread delta on options with `dreadPressureScaling: true`.

- [ ] **Step 1: Find `getVisibleOptions` in `gameStore.ts` (around line 122)**

Current implementation:
```typescript
function getVisibleOptions(card: Card, state: GameState) {
  const drawCount = state.cardRunState[card.id]?.drawCount ?? 0
  return card.options.map((opt, idx) => {
    const available = opt.condition
      ? checkCondition(opt.condition, {
          resources: state.resources,
          deck: state.deck,
          godPathProgress: state.godPathProgress,
          runConfig: state.runConfig,
          cardRunState: state.cardRunState,
        })
      : true
    const hidden = !available && (opt.hideWhenUnavailable ?? false)
    return {
      idx,
      option: opt,
      available,
      hidden,
      effectiveEffects: card.escalates
        ? opt.effects.map(e =>
            e.type === 'resource' && e.delta < 0
              ? { ...e, delta: e.delta - (drawCount - 1) }
              : e
          )
        : [...opt.effects],
    }
  })
}
```

- [ ] **Step 2: Replace the function body**

```typescript
function getVisibleOptions(card: Card, state: GameState) {
  const drawCount = state.cardRunState[card.id]?.drawCount ?? 0
  const dreadPressure = state.unravellingTier - 1
  return card.options.map((opt, idx) => {
    const available = opt.condition
      ? checkCondition(opt.condition, {
          resources: state.resources,
          deck: state.deck,
          godPathProgress: state.godPathProgress,
          runConfig: state.runConfig,
          cardRunState: state.cardRunState,
        })
      : true
    const hidden = !available && (opt.hideWhenUnavailable ?? false)

    let effectiveEffects: Effect[] = card.escalates
      ? opt.effects.map(e =>
          e.type === 'resource' && e.delta < 0
            ? { ...e, delta: e.delta - (drawCount - 1) }
            : e
        )
      : [...opt.effects]

    if (opt.dreadPressureScaling && dreadPressure > 0) {
      effectiveEffects = effectiveEffects.map(e =>
        e.type === 'resource' && e.resource === 'dread' && e.delta > 0
          ? { ...e, delta: e.delta + dreadPressure }
          : e
      )
    }

    return { idx, option: opt, available, hidden, effectiveEffects }
  })
}
```

Note: the `Effect` type is already imported at the top of `gameStore.ts` via `import type { ... } from '../types'`. No new imports needed.

- [ ] **Step 3: Run typecheck**

```
cd E:\Project Abyssial\Code\project-abyssial
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```
git add src/state/gameStore.ts
git commit -m "feat(P12-15): apply Unravelling dread pressure in getVisibleOptions"
```

---

## Task 5: Mark options with `dreadPressureScaling` in core.ts

**Files:**
- Modify: `src/data/cards/core.ts`

Add `dreadPressureScaling: true` to 9 options across 7 cards. These are options where the dread represents psychological exposure to the Unravelling — cult meetings, forbidden knowledge, occult rituals. Do NOT mark options that reduce dread or have no dread cost.

**The 9 options to mark:**

| Card | Option label | Current dread delta | Reason |
|---|---|---|---|
| `congregation_meets` | "Pass the collection plate" | +1 | Cult meeting exposure |
| `congregation_meets` | "Deliver a sermon" | +1 | Preaching cult doctrine |
| `stranger_asks_questions` | "Bring him to a meeting" | +2 | Recruiting into the cult |
| `follower_confesses_doubt` | "Counsel them" | +1 | Confronting the truth of the faith |
| `the_old_book` | "Read it yourself" | +3 | Direct forbidden knowledge |
| `rival_stirs` | "Recruit them" | +1 | Expanding cult into new minds |
| `the_seance` | "Attend and steer" | +2 | Occult ritual |
| `the_census_agent` | "Make the problem go away" | +2 | Dark action on behalf of the cult |
| `the_harbour` | "Ask what he means by 'deep'" | +2 | Cosmic horror encounter |

- [ ] **Step 1: `congregation_meets` — add `dreadPressureScaling: true` to Opt1 and Opt2**

Find Opt1 ("Pass the collection plate"):
```typescript
      {
        label: 'Pass the collection plate',
        flavourText: 'The biscuit provider gives generously. You note this.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

Add `dreadPressureScaling: true,` after `flavourText`:
```typescript
      {
        label: 'Pass the collection plate',
        flavourText: 'The biscuit provider gives generously. You note this.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

Find Opt2 ("Deliver a sermon"):
```typescript
      {
        label: 'Deliver a sermon',
        flavourText: 'You speak for twenty minutes. They leave shaken. That is the correct outcome.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'scrutiny', position: 'random', minPos: 5, maxPos: 9 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
```

Add `dreadPressureScaling: true,` after `flavourText`:
```typescript
      {
        label: 'Deliver a sermon',
        flavourText: 'You speak for twenty minutes. They leave shaken. That is the correct outcome.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'scrutiny', position: 'random', minPos: 5, maxPos: 9 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
```

- [ ] **Step 2: `stranger_asks_questions` — add `dreadPressureScaling: true` to Opt3 ("Bring him to a meeting")**

Find:
```typescript
      {
        label: 'Bring him to a meeting',
        flavourText: 'He attends out of professional curiosity. He stops asking questions. He starts asking different ones.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'removeCard', cardId: 'investigators_file' },
        ],
      },
```

Add `dreadPressureScaling: true,` after `flavourText`:
```typescript
      {
        label: 'Bring him to a meeting',
        flavourText: 'He attends out of professional curiosity. He stops asking questions. He starts asking different ones.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'removeCard', cardId: 'investigators_file' },
        ],
      },
```

- [ ] **Step 3: `follower_confesses_doubt` — add `dreadPressureScaling: true` to Opt1 ("Counsel them")**

Find:
```typescript
      {
        label: 'Counsel them',
        flavourText: 'They stay. The doubt does not leave with them. Something else was listening.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
      },
```

Add `dreadPressureScaling: true,` after `flavourText`:
```typescript
      {
        label: 'Counsel them',
        flavourText: 'They stay. The doubt does not leave with them. Something else was listening.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
      },
```

- [ ] **Step 4: `the_old_book` — add `dreadPressureScaling: true` to Opt1 ("Read it yourself")**

Find:
```typescript
      {
        label: 'Read it yourself',
        flavourText: 'It took three days. You have not slept since.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
      },
```

Add `dreadPressureScaling: true,` after `flavourText`:
```typescript
      {
        label: 'Read it yourself',
        flavourText: 'It took three days. You have not slept since.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
      },
```

- [ ] **Step 5: `rival_stirs` — add `dreadPressureScaling: true` to Opt1 ("Recruit them")**

Find:
```typescript
      {
        label: 'Recruit them',
        flavourText: 'They arrive with their doctrine intact. That fades.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
```

Add `dreadPressureScaling: true,` after `flavourText`:
```typescript
      {
        label: 'Recruit them',
        flavourText: 'They arrive with their doctrine intact. That fades.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
```

- [ ] **Step 6: `the_seance` — add `dreadPressureScaling: true` to Opt1 ("Attend and steer")**

Find:
```typescript
      {
        label: 'Attend and steer',
        flavourText: 'It worked. You steered. Something else was also steering.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'advanceGodPath' },
        ],
      },
```

Add `dreadPressureScaling: true,` after `flavourText`:
```typescript
      {
        label: 'Attend and steer',
        flavourText: 'It worked. You steered. Something else was also steering.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'advanceGodPath' },
        ],
      },
```

- [ ] **Step 7: `the_census_agent` — add `dreadPressureScaling: true` to Opt3 ("Make the problem go away")**

Find:
```typescript
      {
        label: 'Make the problem go away',
        flavourText: 'Clarence handled it. Clarence always handles it. You do not ask how.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'removeCard', cardId: 'investigators_file' },
          { type: 'removeCard', cardId: 'the_detective' },
          { type: 'removeCard', cardId: 'arson_inspector' },
          { type: 'removeCard', cardId: 'missing_persons' },
          { type: 'insertCard', cardId: 'what_was_done', position: 'random', minPos: 3, maxPos: 6 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
```

Add `dreadPressureScaling: true,` after `flavourText`:
```typescript
      {
        label: 'Make the problem go away',
        flavourText: 'Clarence handled it. Clarence always handles it. You do not ask how.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'removeCard', cardId: 'investigators_file' },
          { type: 'removeCard', cardId: 'the_detective' },
          { type: 'removeCard', cardId: 'arson_inspector' },
          { type: 'removeCard', cardId: 'missing_persons' },
          { type: 'insertCard', cardId: 'what_was_done', position: 'random', minPos: 3, maxPos: 6 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
```

- [ ] **Step 8: `the_harbour` — add `dreadPressureScaling: true` to Opt2 ("Ask what he means by 'deep'")**

Find:
```typescript
      {
        label: "Ask what he means by 'deep'",
        flavourText: 'He shows you the net. You understand why he looked away when he said it.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'something_on_the_hook', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
```

Add `dreadPressureScaling: true,` after `flavourText`:
```typescript
      {
        label: "Ask what he means by 'deep'",
        flavourText: 'He shows you the net. You understand why he looked away when he said it.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'something_on_the_hook', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
```

- [ ] **Step 9: Run typecheck**

```
cd E:\Project Abyssial\Code\project-abyssial
npm run typecheck
```

Expected: no errors.

- [ ] **Step 10: Verify dread scaling in gameplay**

Start `npm run dev`. Begin a run. When `unravellingTier` = 1 (before any Unravelling card), dread costs on scaled options should show base values. After first reshuffle that adds an Unravelling card (`unravellingTier` becomes 2), congregation_meets Opt1 should show Dread +2 instead of Dread +1. Verify by inspecting EffectTags on the affected cards.

- [ ] **Step 11: Commit**

```
git add src/data/cards/core.ts
git commit -m "feat(P12-15): mark 9 options with dreadPressureScaling across 7 core cards"
```

---

## Expected Final Deck Sizes

| Run type | Before | After |
|---|---|---|
| Short | ~26 | ~12–13 |
| Standard | ~29 | ~14–16 |

## Expected Dread Scaling Behaviour

| Unravelling tier | dreadPressure | congregation_meets Opt1 | the_old_book Opt1 | the_seance Opt1 |
|---|---|---|---|---|
| 1 (start) | 0 | Dread +1 | Dread +3 | Dread +2 |
| 2 (reshuffle 1) | 1 | Dread +2 | Dread +4 | Dread +3 |
| 3 (reshuffle 2) | 2 | Dread +3 | Dread +5 | Dread +4 |
| 4 (reshuffle 3+) | 3 | Dread +4 | Dread +6 | Dread +5 |
