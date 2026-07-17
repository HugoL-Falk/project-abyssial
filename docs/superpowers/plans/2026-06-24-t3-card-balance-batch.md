# T3 Card Balance Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 7 card balance changes from P17/P18 plus one engine condition primitive (`notHasPrepTag`) and one resource-resolution bug fix (defer overflow/deficit insertion to post-batch state).

**Architecture:** Card-data edits are independent of each other once two engine prerequisites land. Engine first (Tasks 1–2), card data second (Tasks 3–9), final verification last (Task 10). TDD throughout: failing test → minimal fix → green → commit.

**Tech Stack:** TypeScript, Vitest, Zustand store (`src/state/gameStore.ts`), Vite. Repo lives at `E:/Project Abyssial/Code/project-abyssial` — run all `git` and `npm` commands from there. Branch is the trunk; commits stay local (no push).

**Spec:** `docs/superpowers/specs/2026-06-24-t3-card-balance-batch-design.md`

**Test baseline:** 107/107 vitest pass at start. Every task must finish on a passing test suite. `npm run typecheck` must also stay clean.

---

## File Structure

| File | Responsibility | Touched by tasks |
|---|---|---|
| `src/types/index.ts` | Add `notHasPrepTag` to the `Condition` union | 1 |
| `src/engine/godPath.ts` | Add evaluator branch for `notHasPrepTag` | 1 |
| `src/state/gameStore.test.ts` | Engine unit tests + integration tests | 1, 2, 4, 5, 7, 8 |
| `src/state/gameStore.ts` | Defer overflow/deficit checks per-resource to post-batch in `resolveOption`'s effect loop | 2 |
| `src/engine/gameLoop.ts` | Dead-code mirror — apply same deferral fix | 2 |
| `src/data/cards/common.ts` | `word_spreads` opt3, `the_inheritance` opt2 | 3, 8 |
| `src/data/cards/threats.ts` | `innsmouth_look_marked` opt2 add | 4 |
| `src/data/cards/treats.ts` | `his_research_notes` redesign | 5 |
| `src/data/cards/rare.ts` | `dreaming_academic` text trims | 6 |
| `src/data/godPaths/yha_nthlei.ts` | `yha_nthlei_2` opt2 one-shot gate | 7 |
| `src/data/cards/core.ts` | `congregation_meets` opt2 swap | 9 |

---

## Task 1: Engine — add `notHasPrepTag` condition

**Files:**
- Modify: `src/types/index.ts` (Condition union ~L41–60)
- Modify: `src/engine/godPath.ts` (checkCondition switch ~L149)
- Test: `src/state/gameStore.test.ts` (append to the existing `describe('hasPrepTag condition', ...)` block ~L713)

- [ ] **Step 1.1: Write failing test**

Open `src/state/gameStore.test.ts`. Below the closing `})` of the `describe('hasPrepTag condition', ...)` block (currently ends ~L713), append:

```ts
describe('notHasPrepTag condition', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('option with notHasPrepTag condition is selectable only when tag is absent', () => {
    const condition: Condition = { type: 'notHasPrepTag', tag: 'tiara_returned_once' }

    // Without tag: option allowed
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: null,
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
    })
    expect(checkCondition(condition, {
      resources: useGameStore.getState().resources,
      deck: useGameStore.getState().deck,
      godPathProgress: useGameStore.getState().godPathProgress,
      runConfig: useGameStore.getState().runConfig,
      cardRunState: useGameStore.getState().cardRunState,
      prepTags: useGameStore.getState().prepTags,
    })).toBe(true)

    // With tag: option blocked
    useGameStore.setState({ prepTags: ['tiara_returned_once'] })
    expect(checkCondition(condition, {
      resources: useGameStore.getState().resources,
      deck: useGameStore.getState().deck,
      godPathProgress: useGameStore.getState().godPathProgress,
      runConfig: useGameStore.getState().runConfig,
      cardRunState: useGameStore.getState().cardRunState,
      prepTags: useGameStore.getState().prepTags,
    })).toBe(false)
  })
})
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
npm run test -- gameStore.test.ts -t "notHasPrepTag"
```

Expected: TypeScript error (`Type '"notHasPrepTag"' is not assignable…`) or runtime fail.

- [ ] **Step 1.3: Add the type variant**

In `src/types/index.ts`, find the line:
```ts
  | { type: 'hasPrepTag'; tag: string }
```
and append directly below it:
```ts
  | { type: 'notHasPrepTag'; tag: string }
```

- [ ] **Step 1.4: Add the evaluator branch**

In `src/engine/godPath.ts`, locate the `hasPrepTag` case (~L149):
```ts
    case 'hasPrepTag':
      return (state.prepTags ?? []).includes(condition.tag)
```
Append directly after it:
```ts
    case 'notHasPrepTag':
      return !(state.prepTags ?? []).includes(condition.tag)
```

- [ ] **Step 1.5: Run test to verify it passes**

```bash
npm run test -- gameStore.test.ts -t "notHasPrepTag"
```
Expected: PASS.

- [ ] **Step 1.6: Run typecheck**

```bash
npm run typecheck
```
Expected: clean.

- [ ] **Step 1.7: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/types/index.ts src/engine/godPath.ts src/state/gameStore.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "feat(engine): add notHasPrepTag condition primitive

Inverse of hasPrepTag. Enables one-shot options that disable after
firing via setPrepTag in their effects. First consumer in Task 7
(yha_nthlei_2 opt2 one-shot return)."
```

---

## Task 2: Engine — defer overflow/deficit per-resource to post-batch

**Background:** When an option's effects include `-1 gold` followed by `+3 gold`, with starting gold = 1, the current code (`gameStore.ts:760–778`) calls `applyOverflowEffects` / `applyDeficitEffects` after each individual `resource` effect. The intermediate state (gold = 0) inserts `the_ledger_is_noticed` even though the same batch immediately restores gold > 0. This task defers those checks until all effects in the batch have applied.

**Files:**
- Modify: `src/state/gameStore.ts` (`resolveOption` effect loop ~L749–778)
- Modify: `src/engine/gameLoop.ts` (dead-code mirror, same logic)
- Test: `src/state/gameStore.test.ts` (new describe block)

**Note on scope:** ONLY the effect loop inside `resolveOption` is changed (the loop covering `effectiveEffects` and any `randomOutcome`-expanded resource effects). The `onDraw` effects at L562–581 and the Crawling Network blessing at L587–607 already process one effect at a time per call site — they are out of scope. Dread crossing 10 mid-batch still triggers `pendingUnravelling` immediately (unchanged).

- [ ] **Step 2.1: Confirm the bug with a failing regression test**

Open `src/state/gameStore.test.ts`. Find a good location near the end of the file. Add a new describe block:

```ts
describe('deficit/overflow batch deferral (P18-8 bug)', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('does not insert gold deficit card when batch ends with gold > 0', () => {
    // Reproduce: option with effects [-1 gold, +2 gold], starting gold = 1.
    // Intermediate state hits gold=0 but final state is gold=2.
    const card = {
      id: 'test_batch_gold', title: 'Test', flavourText: '', tier: 'core' as const,
      options: [{
        label: 'Spend then gain',
        flavourText: '',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'gold', delta: 2 },
        ],
      }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 1, followers: 5, influence: 5, relics: 0, dread: 0 },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
    })

    useGameStore.getState().resolveOption(0)

    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    expect(allPiles.some(c => c.id === 'deficit_gold')).toBe(false)
    expect(state.resources.gold).toBe(2)
  })

  it('still inserts gold deficit card when batch ends with gold = 0', () => {
    // Starting gold = 2, effects -2 gold → final gold = 0. Deficit MUST fire.
    const card = {
      id: 'test_batch_zero', title: 'Test', flavourText: '', tier: 'core' as const,
      options: [{
        label: 'Spend all',
        flavourText: '',
        effects: [{ type: 'resource', resource: 'gold', delta: -2 }],
      }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 2, followers: 5, influence: 5, relics: 0, dread: 0 },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
    })

    useGameStore.getState().resolveOption(0)

    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    expect(allPiles.some(c => c.id === 'deficit_gold')).toBe(true)
    expect(state.resources.gold).toBe(0)
  })
})
```

- [ ] **Step 2.2: Run the two new tests — first must FAIL, second must PASS**

```bash
npm run test -- gameStore.test.ts -t "deficit/overflow batch deferral"
```
Expected: first test FAILS (deficit_gold present in pile), second test PASSES (current behaviour is correct for the terminal-zero case).

If the first test does NOT fail, STOP and invoke `superpowers:systematic-debugging` to diagnose the actual mechanism before implementing — the hypothesis may be wrong.

- [ ] **Step 2.3: Implement the deferral in `gameStore.ts`**

In `src/state/gameStore.ts`, locate the `resolveOption` effect loop. The structure today (~L749–778):

```ts
    for (let effectIdx = 0; effectIdx < effectiveEffects.length; effectIdx++) {
      const effect = effectiveEffects[effectIdx]
      if (phase === 'gameOver' || phase === 'victory') break
      const isFromRandom = capturedOutcome !== null
        && effectIdx >= capturedOutcome.expandedStart
        && effectIdx < capturedOutcome.expandedEnd

      switch (effect.type) {
        case 'resource': {
          const prevVal = resources[effect.resource]
          resources = applyDelta(resources, effect.resource, effect.delta)

          if (!isTutorial && effect.resource === 'dread' && resources.dread >= 10 && !pendingUnravelling) {
            pendingUnravelling = true
            deck = insertCard(getUnravellingCard(unravellingTier), deck, 'top')
          }
          if (!isTutorial) {
            const beforeOverflow = deck
            deck = applyOverflowEffects(resources, deck, effect.resource, prevVal)
            appendInsertionDiff(beforeOverflow, deck, deckChanges, 'overflow')
          }
          if (!isTutorial) {
            const beforeDeficit = deck
            deck = applyDeficitEffects(resources, deck, effect.resource, prevVal)
            appendInsertionDiff(beforeDeficit, deck, deckChanges, 'deficit')
          }
          break
        }
        // ... other cases unchanged
```

Replace the `case 'resource':` block AND wrap the loop so deficit/overflow are deferred. The exact change:

**Before the `for` loop**, snapshot pre-batch resource values:

```ts
    // P18-8 fix: defer overflow/deficit checks for resource effects until the
    // full batch settles, so intermediate zero-states (e.g. -1 then +3 gold)
    // don't insert a deficit card the same batch immediately heals. Dread→10
    // unravelling still fires intra-batch (different mechanism).
    const batchPrevVals: Partial<Record<ResourceKey, number>> = {}
    const touchedResources = new Set<ResourceKey>()
```

**Inside the `case 'resource':` block**, replace it with:

```ts
        case 'resource': {
          const key = effect.resource as ResourceKey
          if (!(key in batchPrevVals)) batchPrevVals[key] = resources[key]
          touchedResources.add(key)
          resources = applyDelta(resources, key, effect.delta)

          if (!isTutorial && key === 'dread' && resources.dread >= 10 && !pendingUnravelling) {
            pendingUnravelling = true
            deck = insertCard(getUnravellingCard(unravellingTier), deck, 'top')
          }
          break
        }
```

**After the `for` loop closes**, BEFORE the existing post-loop logic, add:

```ts
    // Apply deferred overflow/deficit using pre-batch values per touched resource.
    if (!isTutorial) {
      for (const key of touchedResources) {
        const prevVal = batchPrevVals[key]!
        const beforeOverflow = deck
        deck = applyOverflowEffects(resources, deck, key, prevVal)
        appendInsertionDiff(beforeOverflow, deck, deckChanges, 'overflow')
        appendPurgeDiff(beforeOverflow, deck, deckChanges)
        const beforeDeficit = deck
        deck = applyDeficitEffects(resources, deck, key, prevVal)
        appendInsertionDiff(beforeDeficit, deck, deckChanges, 'deficit')
        appendPurgeDiff(beforeDeficit, deck, deckChanges)
      }
    }
```

Note: `appendPurgeDiff` was missing from the per-effect deficit branch before (only overflow used purge). Add it for symmetry — if a batch removes a deficit card via cross-resource changes, the purge should be recorded.

If `ResourceKey` is not in scope at this location, add it to the existing import from `../types` at the top of the file (search for other ResourceKey usages — already imported).

- [ ] **Step 2.4: Run the failing test — must now pass**

```bash
npm run test -- gameStore.test.ts -t "deficit/overflow batch deferral"
```
Expected: both PASS.

- [ ] **Step 2.5: Run the full vitest suite to catch regressions**

```bash
npm run test
```
Expected: all 107+ PASS. If any test breaks because it relied on per-effect deficit/overflow timing, fix the test to assert post-batch state instead (the new semantics are correct).

- [ ] **Step 2.6: Mirror the fix in `gameLoop.ts`**

Open `src/engine/gameLoop.ts`. Find the analogous effect loop (search for `applyOverflowEffects` and `applyDeficitEffects` calls inside an effect-resolution loop). Apply the same restructure: collect `batchPrevVals` + `touchedResources` before the loop, remove the per-effect overflow/deficit calls inside the resource case, append deferred calls after the loop.

If `gameLoop.ts` has divergent structure that makes the restructure non-obvious, document the divergence at the top of the modified block with a `// P18-8: ...` comment and either (a) apply the same conceptual fix or (b) explicitly note this path is unreachable per the existing dead-code header.

- [ ] **Step 2.7: Run typecheck and full vitest**

```bash
npm run typecheck && npm run test
```
Expected: clean + all PASS.

- [ ] **Step 2.8: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/state/gameStore.ts src/engine/gameLoop.ts src/state/gameStore.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "fix(engine): defer overflow/deficit checks to post-batch (P18-8)

resolveOption was calling applyOverflowEffects/applyDeficitEffects
after every resource effect inside an option's batch. Intermediate
zero-states (e.g. -1 then +2 gold from gold=1) inserted a deficit card
the same batch immediately healed. Now batched: snapshot per-resource
pre-batch values, apply all resource deltas, then evaluate
overflow/deficit once per touched resource against the net change.
Mirror updated in dead gameLoop.ts path."
```

---

## Task 3: P17-7 — `word_spreads` opt3 dread buff

**Files:**
- Modify: `src/data/cards/common.ts` (~L107–116)

- [ ] **Step 3.1: Make the edit**

In `src/data/cards/common.ts`, locate the `word_spreads` "Produce credentials" option. Change the dread delta from `-2` to `-3`:

```ts
      {
        // P14-16 / P17-7: relic-spend dread valve. Dread heal bumped -2 → -3
        // (s94) so the relic cost feels worth it; opt2 remains distinct via
        // input resource (influence, not relic).
        label: 'Produce credentials',
        flavourText: 'The credentials are presented. No one examines them closely. This is normal.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -3 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'relics', min: 1 },
      },
```

- [ ] **Step 3.2: Run typecheck + tests**

```bash
npm run typecheck && npm run test
```
Expected: clean + all PASS.

- [ ] **Step 3.3: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/common.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(P17-7): word_spreads opt3 dread heal -2 → -3

Relic-spend dread valve now removes 3 dread instead of 2. Cost and
gate preserved. Makes the relic spend feel proportionate to the heal."
```

---

## Task 4: P17-8 — `innsmouth_look_marked` add opt2

**Files:**
- Modify: `src/data/cards/threats.ts` (~L1230–1249)
- Test: `src/state/gameStore.test.ts` (new test asserting card shape)

- [ ] **Step 4.1: Write failing snapshot test**

Append to `src/state/gameStore.test.ts`:

```ts
describe('innsmouth_look_marked (P17-8)', () => {
  it('has two options including the find-your-own trade', () => {
    const card = THREAT_CARDS.find(c => c.id === 'innsmouth_look_marked')!
    expect(card.options).toHaveLength(2)
    const trade = card.options.find(o => o.label === 'Find your own')
    expect(trade).toBeDefined()
    expect(trade!.effects).toEqual([
      { type: 'resource', resource: 'influence', delta: -2 },
      { type: 'resource', resource: 'followers', delta: 1 },
    ])
    expect(trade!.condition).toEqual({ type: 'resourceMin', resource: 'influence', min: 2 })
  })
})
```

If `THREAT_CARDS` isn't already imported at the top of the test file, add it:
```ts
import { THREAT_CARDS } from '../data/cards/threats'
```
(Check existing imports first — it may already be imported.)

- [ ] **Step 4.2: Run test to verify it fails**

```bash
npm run test -- gameStore.test.ts -t "innsmouth_look_marked"
```
Expected: FAIL (options length is 1).

- [ ] **Step 4.3: Add the new option**

In `src/data/cards/threats.ts`, locate `innsmouth_look_marked` and update the `options` array:

```ts
    options: [
      {
        label: 'You know what you are',
        flavourText: 'The mark is part of you now. You stopped arguing with it some time ago.',
        effects: [],
      },
      {
        // P17-8 (s94): trade influence for follower density. The marked
        // recognise each other. Gate so the option can resolve cleanly.
        label: 'Find your own',
        flavourText: "The other marked close around you. Some of them don't leave when the conversation ends.",
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
    ],
```

- [ ] **Step 4.4: Run test to verify it passes**

```bash
npm run test -- gameStore.test.ts -t "innsmouth_look_marked"
```
Expected: PASS.

- [ ] **Step 4.5: Run full suite + typecheck**

```bash
npm run typecheck && npm run test
```

- [ ] **Step 4.6: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/threats.ts src/state/gameStore.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(P17-8): innsmouth_look_marked second option

Add 'Find your own': -2 influence, +1 follower, gated influence ≥ 2.
The marked recognise each other — converts political capital into
follower density. opt1 ('You know what you are') unchanged."
```

---

## Task 5: P17-18 — `his_research_notes` redesign

**Files:**
- Modify: `src/data/cards/treats.ts` (~L97–121)
- Test: `src/state/gameStore.test.ts`

- [ ] **Step 5.1: Write failing snapshot test**

Append to `src/state/gameStore.test.ts`:

```ts
describe('his_research_notes redesign (P17-18)', () => {
  it('has no passive or onDraw, two active options', () => {
    const card = TREAT_CARDS.find(c => c.id === 'his_research_notes')!
    expect(card.permanent).toBe(true)
    expect(card.passive).toBeUndefined()
    expect(card.onDraw).toBeUndefined()
    expect(card.options).toHaveLength(2)

    const consult = card.options.find(o => o.label === 'Consult the notes')!
    expect(consult.effects).toEqual([
      { type: 'resource', resource: 'relics', delta: 1 },
      { type: 'resource', resource: 'dread', delta: 3 },
    ])

    const lose = card.options.find(o => o.label === 'Lose yourself in the margins')!
    expect(lose.effects).toEqual([
      { type: 'resource', resource: 'dread', delta: -2 },
    ])
  })
})
```

Add import if needed:
```ts
import { TREAT_CARDS } from '../data/cards/treats'
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
npm run test -- gameStore.test.ts -t "his_research_notes redesign"
```
Expected: FAIL.

- [ ] **Step 5.3: Replace the card definition**

In `src/data/cards/treats.ts`, replace the entire `his_research_notes` card definition with:

```ts
  {
    // Inserted by dreaming_academic — "Bring him in".
    // P17-18 (s94): converted from passive +1 relic/reshuffle + onDraw dread
    // to active per-encounter fork. Stays permanent so it remains a recurring
    // decision under rare-rotation cadence.
    id: 'his_research_notes',
    title: 'His Research Notes',
    permanent: true,
    flavourText: 'Forty years of work. Impeccable sourcing. Absolutely no conclusions drawn, because drawing the conclusion would require accepting what the evidence means.',
    tier: 'treat',
    options: [
      {
        label: 'Consult the notes',
        flavourText: 'A relic surfaces from the marginalia. So does the cost.',
        effects: [
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 3 },
        ],
      },
      {
        label: 'Lose yourself in the margins',
        flavourText: "The footnotes alone are a year's reading. By the time you look up, the room is dark and the dread has settled.",
        effects: [
          { type: 'resource', resource: 'dread', delta: -2 },
        ],
      },
    ],
  },
```

- [ ] **Step 5.4: Run test + full suite**

```bash
npm run test -- gameStore.test.ts -t "his_research_notes redesign"
npm run typecheck && npm run test
```
Expected: both PASS.

- [ ] **Step 5.5: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/treats.ts src/state/gameStore.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(P17-18): his_research_notes active redesign

Drop passive (+1 relic/reshuffle) and onDraw (+1 dread). Add two
active options: 'Consult the notes' (+1 relic, +3 dread) vs 'Lose
yourself in the margins' (-2 dread). Card stays permanent — recurring
fork under rare-rotation cadence."
```

---

## Task 6: P17-19 — `dreaming_academic` text trims

**Files:**
- Modify: `src/data/cards/rare.ts` (~L77–112)

- [ ] **Step 6.1: Trim opt1 flavour and shorten opt2 label**

In `src/data/cards/rare.ts`, locate `dreaming_academic`. Apply two text changes:

**Opt1 flavour** — change:
```ts
        flavourText: 'He arrives at the requested time. The research notes come with him. Whether this is useful or dangerous will become clear shortly.',
```
to:
```ts
        flavourText: 'He arrives at the requested time. The notes come with him.',
```

**Opt2 label** — change:
```ts
        label: 'Send him home with a doctored memory',
```
to:
```ts
        label: 'Doctor his memory',
```

Opt2 flavour stays unchanged.

- [ ] **Step 6.2: Run typecheck + tests**

```bash
npm run typecheck && npm run test
```
Expected: clean + all PASS.

- [ ] **Step 6.3: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/rare.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "text(P17-19): dreaming_academic flavour and label trims

opt1 'Bring him in' flavour: 3 clauses → 2. opt2 label: 'Send him home
with a doctored memory' → 'Doctor his memory'. No mechanical change."
```

---

## Task 7: P17-20 — `yha_nthlei_2` opt2 one-shot

**Depends on Task 1** (`notHasPrepTag` must exist).

**Files:**
- Modify: `src/data/godPaths/yha_nthlei.ts` (~L77–87)
- Test: `src/state/gameStore.test.ts`

- [ ] **Step 7.1: Write failing integration test**

Append to `src/state/gameStore.test.ts`:

```ts
describe('yha_nthlei_2 opt2 one-shot return (P17-20)', () => {
  it('opt2 is hidden after first pick (notHasPrepTag gated)', () => {
    const yhaCards = require('../data/godPaths/yha_nthlei')
    const tiara = yhaCards.YHA_NTHLEI_CHAIN.find((c: { id: string }) => c.id === 'yha_nthlei_2')
    const returnOpt = tiara.options.find((o: { label: string }) => o.label.startsWith('Send someone to return'))

    expect(returnOpt.condition).toEqual({ type: 'notHasPrepTag', tag: 'tiara_returned_once' })
    expect(returnOpt.hideWhenUnavailable).toBe(true)
    expect(returnOpt.effects).toContainEqual({ type: 'setPrepTag', tag: 'tiara_returned_once' })
  })
})
```

Verify the actual exported name from `yha_nthlei.ts` (it may be `YHA_NTHLEI_CHAIN` or similar — confirm via `grep -n "^export" src/data/godPaths/yha_nthlei.ts` and adjust the import name in the test to match).

- [ ] **Step 7.2: Run test to verify it fails**

```bash
npm run test -- gameStore.test.ts -t "yha_nthlei_2 opt2 one-shot"
```
Expected: FAIL.

- [ ] **Step 7.3: Update the option**

In `src/data/godPaths/yha_nthlei.ts`, locate the `yha_nthlei_2` `Send someone to return it to the refinery` option (~L77–87) and update it to:

```ts
      {
        // P17-20 (s94): one-shot via notHasPrepTag. First pick claims the
        // relic and sets the tag; subsequent encounters hide this option,
        // forcing the player to advance via opt1 or opt3. Closes the
        // relic-farming loop while preserving the narrative beat.
        label: 'Send someone to return it to the refinery',
        flavourText: "They didn't come back. One of them did, eventually. They were not carrying what we sent. They were carrying something else.",
        hideWhenUnavailable: true,
        condition: { type: 'notHasPrepTag', tag: 'tiara_returned_once' },
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'setPrepTag', tag: 'tiara_returned_once' },
          { type: 'insertCard', cardId: 'yha_nthlei_2', position: 'random', minPos: 4, maxPos: 6 },
        ],
      },
```

- [ ] **Step 7.4: Run test + full suite**

```bash
npm run test -- gameStore.test.ts -t "yha_nthlei_2 opt2 one-shot"
npm run typecheck && npm run test
```
Expected: both PASS.

- [ ] **Step 7.5: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/yha_nthlei.ts src/state/gameStore.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(P17-20): fishmonger's tiara opt2 one-shot

opt2 ('Send someone to return it') gated by notHasPrepTag and sets
tiara_returned_once on resolution. Card still reinserts so the chain
isn't stalled; opt2 hides on subsequent draws. Closes the infinite
relic-farm loop. Cost and reinsertion timing preserved."
```

---

## Task 8: P18-8 — `the_inheritance` opt2 rebalance

**Depends on Task 2** (deficit batch deferral must be live so the bug doesn't recur even after this trim).

**Files:**
- Modify: `src/data/cards/common.ts` (~L8–48)
- Test: `src/state/gameStore.test.ts`

- [ ] **Step 8.1: Write failing snapshot test**

Append to `src/state/gameStore.test.ts`:

```ts
describe('the_inheritance opt2 rebalance (P18-8)', () => {
  it('opt2 quiet word: -1 inf, +2 gold, no dread', () => {
    const card = COMMON_CARDS.find(c => c.id === 'the_inheritance')!
    const quiet = card.options.find(o => o.label === 'Have a quiet word')!
    expect(quiet.effects).toEqual([
      { type: 'resource', resource: 'influence', delta: -1 },
      { type: 'resource', resource: 'gold', delta: 2 },
    ])
  })
})
```

Add import if needed:
```ts
import { COMMON_CARDS } from '../data/cards/common'
```

- [ ] **Step 8.2: Run test to verify it fails**

```bash
npm run test -- gameStore.test.ts -t "the_inheritance opt2 rebalance"
```
Expected: FAIL.

- [ ] **Step 8.3: Update opt2**

In `src/data/cards/common.ts`, locate `the_inheritance` opt2 ("Have a quiet word"). Replace its `effects` array:

```ts
      {
        // P14-15 / P18-8 (s94): dread +1 dropped; gold +3 → +2 to maintain
        // EV parity with opt1 (avg -1 + 3 = +2 gold). Now reads as
        // certainty-vs-variance fork against opt1, paid with influence.
        label: 'Have a quiet word',
        flavourText: 'The family withdrew their objections. Quietly and without further questions.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'gold', delta: 2 },
        ],
      },
```

Opt1 and opt3 unchanged.

- [ ] **Step 8.4: Run test + full suite**

```bash
npm run test -- gameStore.test.ts -t "the_inheritance opt2 rebalance"
npm run typecheck && npm run test
```
Expected: both PASS.

- [ ] **Step 8.5: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/common.ts src/state/gameStore.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(P18-8): the_inheritance opt2 dread strip and gold trim

opt2 'Have a quiet word': drop +1 dread; gold +3 → +2 for EV parity
with opt1's randomOutcome average (+2 gold). Becomes a clean
certainty-vs-variance fork against opt1, paid with influence. opt1
and opt3 unchanged. Bug-fix predecessor (Task 2) prevents deficit
mis-insertion when opt1's -1 gold transits zero."
```

---

## Task 9: P18-16 — `congregation_meets` opt2 swap

**Files:**
- Modify: `src/data/cards/core.ts` (~L17–27)

- [ ] **Step 9.1: Make the swap**

In `src/data/cards/core.ts`, locate `congregation_meets` opt2 "Deliver a sermon". Replace:

```ts
      {
        // P18-16 (s94): +2 influence → +1 follower. Sermon grows the flock
        // (thematic fit) and rebalances per Balance agent: followers carry
        // ~2:3 more value per point than influence, so +1 follower replaces
        // +2 influence at parity. Gate, dread scaling, scrutiny insertion
        // all preserved.
        label: 'Deliver a sermon',
        flavourText: 'You speak for twenty minutes. They leave shaken. That is the correct outcome.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'scrutiny', position: 'random', minPos: 5, maxPos: 9 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
```

- [ ] **Step 9.2: Run typecheck + tests**

```bash
npm run typecheck && npm run test
```
Expected: clean + all PASS.

- [ ] **Step 9.3: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/core.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(P18-16): deliver a sermon → follower growth

congregation_meets opt2: +2 influence → +1 follower. Sermon grows the
flock thematically; +1 at parity vs +2 influence per Balance agent
ratio. Gate (followers ≥ 2), dreadPressureScaling, and scrutiny
insertion preserved."
```

---

## Task 10: Final verification

- [ ] **Step 10.1: Clean test pass**

```bash
npm run typecheck && npm run test
```
Expected: clean typecheck, ALL tests PASS (107 baseline + new tests from Tasks 1, 2, 4, 5, 7, 8 = 7 new = 114 minimum).

- [ ] **Step 10.2: Manual sanity check via vault tooling (optional)**

If a dev server is available, run a quick interactive smoke:

```bash
npm run dev
```

Then in-game: trigger each affected card if reachable in a short run (`word_spreads`, `the_inheritance`, `congregation_meets`, plus a Yha run for `yha_nthlei_2`). Verify the new text renders and options resolve cleanly. (Optional — handoff playtest covers this.)

- [ ] **Step 10.3: Confirm commit log**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" log --oneline -15
```

Expected commits in this order (from oldest to newest in this batch):
1. `feat(engine): add notHasPrepTag condition primitive`
2. `fix(engine): defer overflow/deficit checks to post-batch (P18-8)`
3. `balance(P17-7): word_spreads opt3 dread heal -2 → -3`
4. `balance(P17-8): innsmouth_look_marked second option`
5. `balance(P17-18): his_research_notes active redesign`
6. `text(P17-19): dreaming_academic flavour and label trims`
7. `balance(P17-20): fishmonger's tiara opt2 one-shot`
8. `balance(P18-8): the_inheritance opt2 dread strip and gold trim`
9. `balance(P18-16): deliver a sermon → follower growth`

9 commits total, all local. No `git push`.

- [ ] **Step 10.4: Update knowledge files (post-shutdown step — not in this plan)**

Handled separately per CLAUDE.md session-end protocol (handoff.md, session-NN.md, backlog.md). Do NOT update inside this plan run.

---

## Notes for the executing engineer

- **Branch:** Stay on the current `claude/build-abyssial-game-IuJp8` branch. It IS the trunk.
- **No push:** Commits stay local unless the user explicitly asks for `git push`.
- **Test layout:** All vitest tests live in `src/state/gameStore.test.ts`. Add to it; don't create new test files.
- **Run vitest from the repo root** (`E:/Project Abyssial/Code/project-abyssial`), not the vault root.
- **Dead-code mirror:** `src/engine/gameLoop.ts` is documented dead but kept in sync per project policy. Task 2 explicitly patches it.
- **If Task 2's bug-reproducer test unexpectedly PASSES on Step 2.2:** STOP. Invoke `superpowers:systematic-debugging` — the bug hypothesis is wrong and the fix would be misdirected.
- **If any subsequent task breaks existing tests:** the new test behaviour is the contract; the old test was asserting per-effect timing that we've intentionally changed. Update the old test to assert post-batch state, don't roll back the engine fix.
