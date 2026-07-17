# Nyar Summon Gates, Blessing Rebalance & Crossroads Stall — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all three gods' 6/6 summon cards to display resource costs and use `succumbOption` for failure, rebalance the Crawling Network blessing to grant a random resource, and convert Crossroads opt2 from an advance to a stall.

**Architecture:** Pure data changes — card definitions in `godPaths/*.ts`, blessing description in `blessings.ts`, engine loop in `gameStore.ts`. No new types or components needed. Tests are vitest unit tests in existing test files.

**Tech Stack:** TypeScript, Vitest. Run tests with `npm test` from `C:/Project Abyssial/Code/project-abyssial`.

## Global Constraints

- Flavour text cap: option flavour ≤ 80 chars, card body ≤ 108 chars (tutorial.ts exempt)
- All tests must pass: `npm test` — 283 passing is baseline
- No new types, no new files (all edits go into existing files)
- Git repo: `C:/Project Abyssial/Code/project-abyssial` — use `-C` flag on all git commands
- Commits stay local (no push)

---

### Task 1: P25-60 — Crossroads opt2 becomes a stall

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts` — `nyarlathotep_3` opt1 (index 1)
- Test: `src/data/godPaths/nyarlathotep.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `nyarlathotep_3` opt1 has no `advanceGodPath`, no condition, inserts self at pos 6–9

- [ ] **Step 1: Write the failing tests**

In `src/data/godPaths/nyarlathotep.test.ts`, locate the `describe('nyarlathotep_3 — The Black Man at the Crossroads (CS2)', ...)` block. Replace the existing `it('opts 0 and 1 require godPathStageMin 1', ...)` test and add a new insert test:

```typescript
// REPLACE this test:
// it('opts 0 and 1 require godPathStageMin 1', () => { ... })
// WITH these two:

it('opt0 "Encourage the meetings" requires godPathStageMin 1', () => {
  const enc = card().options.find(o => o.label === 'Encourage the meetings')!
  expect(enc.condition).toEqual({ type: 'godPathStageMin', min: 1 })
})

it('opt1 "Observe without intervening" has no condition (stall — always available)', () => {
  const obs = card().options.find(o => o.label === 'Observe without intervening')!
  expect(obs.condition).toBeUndefined()
})

it('opt1 "Observe without intervening" inserts nyarlathotep_3 at minPos 6 maxPos 9 instead of advancing', () => {
  const obs = card().options.find(o => o.label === 'Observe without intervening')!
  const insert = obs.effects.find((e: any) => e.type === 'insertCard') as any
  const advance = obs.effects.find((e: any) => e.type === 'advanceGodPath')
  expect(insert?.cardId).toBe('nyarlathotep_3')
  expect(insert?.position).toBe('random')
  expect(insert?.minPos).toBe(6)
  expect(insert?.maxPos).toBe(9)
  expect(advance).toBeUndefined()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm test -- nyarlathotep.test
```

Expected: 2–3 failures on the new/replaced tests.

- [ ] **Step 3: Update the card data**

In `src/data/godPaths/nyarlathotep.ts`, find `nyarlathotep_3` opt1 (label `'Observe without intervening'`) and replace it:

```typescript
// OLD:
{
  label: 'Observe without intervening',
  flavourText: 'We watched a meeting from a distance. The distance felt insufficient.',
  effects: [
    { type: 'resource', resource: 'dread', delta: 1 },
    { type: 'seedWhispers', count: 1 },
    { type: 'advanceGodPath' },
  ],
  condition: { type: 'godPathStageMin', min: 1 },
},

// NEW:
{
  label: 'Observe without intervening',
  flavourText: 'We watched a meeting from a distance. The distance felt insufficient.',
  effects: [
    { type: 'resource', resource: 'dread', delta: 1 },
    { type: 'seedWhispers', count: 1 },
    { type: 'insertCard', cardId: 'nyarlathotep_3', position: 'random', minPos: 6, maxPos: 9 },
  ],
},
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npm test -- nyarlathotep.test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/nyarlathotep.ts src/data/godPaths/nyarlathotep.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "fix(nyar): crossroads opt2 — remove advanceGodPath, insert self as stall (P25-60)"
```

---

### Task 2: P25-41a — Nyar 6/6 summon gate redesign

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts` — `nyarlathotep_6` options
- Test: `src/data/godPaths/nyarlathotep.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `nyarlathotep_6` full/partial have drain effects; endRun has `succumbOption: true`; no `godPathStageMin` on any victory opt

- [ ] **Step 1: Write the failing tests**

Add a new describe block at the bottom of `src/data/godPaths/nyarlathotep.test.ts` (before the flavour cap block):

```typescript
describe('nyarlathotep_6 — The Crawling Signal Arrives (CS6) — P25-41 gate redesign', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_6')!

  it('full victory opt has no godPathStageMin condition', () => {
    const opt = card().options.find(o => o.label === 'Receive the message')!
    const cond = opt.condition as any
    const stages = cond.conditions?.filter((c: any) => c.type === 'godPathStageMin') ?? []
    expect(stages).toHaveLength(0)
  })

  it('full victory opt drains −4 fol, −3 inf, −1 relic', () => {
    const opt = card().options.find(o => o.label === 'Receive the message')!
    const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers') as any
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence') as any
    const rel = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'relics') as any
    expect(fol?.delta).toBe(-4)
    expect(inf?.delta).toBe(-3)
    expect(rel?.delta).toBe(-1)
  })

  it('full victory condition gates fol ≥ 4, inf ≥ 3, relics ≥ 1, dread ≥ 6', () => {
    const opt = card().options.find(o => o.label === 'Receive the message')!
    const cond = opt.condition as any
    const folCond = cond.conditions.find((c: any) => c.resource === 'followers')
    const infCond = cond.conditions.find((c: any) => c.resource === 'influence')
    const relCond = cond.conditions.find((c: any) => c.resource === 'relics')
    const dreadCond = cond.conditions.find((c: any) => c.resource === 'dread')
    expect(folCond?.min).toBe(4)
    expect(infCond?.min).toBe(3)
    expect(relCond?.min).toBe(1)
    expect(dreadCond?.min).toBe(6)
  })

  it('partial victory opt drains −3 fol, −3 inf, −1 relic', () => {
    const opt = card().options.find(o => o.label === 'Receive parts of the message')!
    const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers') as any
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence') as any
    const rel = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'relics') as any
    expect(fol?.delta).toBe(-3)
    expect(inf?.delta).toBe(-3)
    expect(rel?.delta).toBe(-1)
  })

  it('partial victory condition gates fol ≥ 3, inf ≥ 3, relics ≥ 1, dread ≥ 4', () => {
    const opt = card().options.find(o => o.label === 'Receive parts of the message')!
    const cond = opt.condition as any
    const folCond = cond.conditions.find((c: any) => c.resource === 'followers')
    const infCond = cond.conditions.find((c: any) => c.resource === 'influence')
    const relCond = cond.conditions.find((c: any) => c.resource === 'relics')
    const dreadCond = cond.conditions.find((c: any) => c.resource === 'dread')
    expect(folCond?.min).toBe(3)
    expect(infCond?.min).toBe(3)
    expect(relCond?.min).toBe(1)
    expect(dreadCond?.min).toBe(4)
  })

  it('partial victory condition has NOT(full) sub-condition', () => {
    const opt = card().options.find(o => o.label === 'Receive parts of the message')!
    const cond = opt.condition as any
    const notCond = cond.conditions.find((c: any) => c.type === 'not')
    expect(notCond).toBeDefined()
    // The NOT must negate the full victory conditions
    const inner = notCond.condition as any
    expect(inner.type).toBe('and')
    const folInner = inner.conditions.find((c: any) => c.resource === 'followers')
    expect(folInner?.min).toBe(4)
  })

  it('endRun opt has succumbOption: true', () => {
    const opt = card().options.find(o => o.label === 'The signal overwhelms you')!
    expect(opt.succumbOption).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm test -- nyarlathotep.test
```

Expected: failures on all new tests.

- [ ] **Step 3: Update nyarlathotep_6 card data**

In `src/data/godPaths/nyarlathotep.ts`, replace the entire `nyarlathotep_6` options array:

```typescript
// Card 6 — THE CRAWLING CHAOS SPEAKS
id: 'nyarlathotep_6',
title: 'The Crawling Signal Arrives',
flavourText: 'It is not a voice. Not in the room. Everyone has stopped. Even those who did not know what we were doing.',
tier: 'god_path',
godPath: 'nyarlathotep',
chainStage: 6,
isSummoning: true,
options: [
  {
    label: 'Receive the message',
    flavourText: 'Not a language. Not through voice. It was felt. We understood. We will help.',
    effects: [
      { type: 'resource', resource: 'followers', delta: -4 },
      { type: 'resource', resource: 'influence', delta: -3 },
      { type: 'resource', resource: 'relics', delta: -1 },
      { type: 'victory' },
    ],
    condition: {
      type: 'and',
      conditions: [
        { type: 'resourceMin', resource: 'followers', min: 4 },
        { type: 'resourceMin', resource: 'influence', min: 3 },
        { type: 'resourceMin', resource: 'relics', min: 1 },
        { type: 'resourceMin', resource: 'dread', min: 6 },
      ],
    },
  },
  {
    label: 'Receive parts of the message',
    flavourText: 'Something was felt but not fully understood. Enough to know what comes next.',
    effects: [
      { type: 'resource', resource: 'followers', delta: -3 },
      { type: 'resource', resource: 'influence', delta: -3 },
      { type: 'resource', resource: 'relics', delta: -1 },
      { type: 'partialVictory', god: 'nyarlathotep' },
    ],
    condition: {
      type: 'and',
      conditions: [
        { type: 'resourceMin', resource: 'followers', min: 3 },
        { type: 'resourceMin', resource: 'influence', min: 3 },
        { type: 'resourceMin', resource: 'relics', min: 1 },
        { type: 'resourceMin', resource: 'dread', min: 4 },
        {
          type: 'not',
          condition: {
            type: 'and',
            conditions: [
              { type: 'resourceMin', resource: 'followers', min: 4 },
              { type: 'resourceMin', resource: 'influence', min: 3 },
              { type: 'resourceMin', resource: 'relics', min: 1 },
              { type: 'resourceMin', resource: 'dread', min: 6 },
            ],
          },
        },
      ],
    },
  },
  {
    label: 'The signal overwhelms you',
    flavourText: 'The frequency was right. The mind was not ready.',
    succumbOption: true,
    effects: [
      { type: 'endRun', reason: 'The signal was received. You were not sufficient to hold it.' },
    ],
  },
],
```

- [ ] **Step 4: Run tests**

```
npm test -- nyarlathotep.test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/nyarlathotep.ts src/data/godPaths/nyarlathotep.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(nyar): 6/6 summon — drain costs, dread gate, succumbOption on failure (P25-41)"
```

---

### Task 3: P25-41b — Yha 6/6 summon gate redesign

**Files:**
- Modify: `src/data/godPaths/yha_nthlei.ts` — `yha_nthlei_6` options
- Test: `src/data/godPaths/nyarlathotep.test.ts` — add a new describe block for Yha (no separate yha test file exists)

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `yha_nthlei_6` full/partial have drain effects (inf, gold, relics); endRun has `succumbOption: true`; dread gate dropped entirely

- [ ] **Step 1: Write the failing tests**

At the bottom of `src/data/godPaths/nyarlathotep.test.ts`, add (before the flavour cap section):

```typescript
import { YHA_NTHLEI_CHAIN } from './yha_nthlei'

describe('yha_nthlei_6 — P25-41 gate redesign', () => {
  const card = () => YHA_NTHLEI_CHAIN.find(c => c.id === 'yha_nthlei_6')!

  it('full victory opt drains −5 inf, −4 gold, −1 relic', () => {
    const opt = card().options.find(o => o.label === 'Complete the rite')!
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence') as any
    const gold = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'gold') as any
    const rel = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'relics') as any
    expect(inf?.delta).toBe(-5)
    expect(gold?.delta).toBe(-4)
    expect(rel?.delta).toBe(-1)
  })

  it('full victory condition gates inf ≥ 5, gold ≥ 4, relics ≥ 1 (no dread)', () => {
    const opt = card().options.find(o => o.label === 'Complete the rite')!
    const cond = opt.condition as any
    const infCond = cond.conditions.find((c: any) => c.resource === 'influence')
    const goldCond = cond.conditions.find((c: any) => c.resource === 'gold')
    const relCond = cond.conditions.find((c: any) => c.resource === 'relics')
    const dreadCond = cond.conditions.find((c: any) => c.resource === 'dread')
    expect(infCond?.min).toBe(5)
    expect(goldCond?.min).toBe(4)
    expect(relCond?.min).toBe(1)
    expect(dreadCond).toBeUndefined()
  })

  it('partial victory opt drains −3 inf, −3 gold, −1 relic', () => {
    const opt = card().options.find(o => o.label === 'Complete the rite (underprepared)')!
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence') as any
    const gold = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'gold') as any
    const rel = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'relics') as any
    expect(inf?.delta).toBe(-3)
    expect(gold?.delta).toBe(-3)
    expect(rel?.delta).toBe(-1)
  })

  it('partial victory condition gates inf ≥ 3, gold ≥ 3, relics ≥ 1 with NOT(full)', () => {
    const opt = card().options.find(o => o.label === 'Complete the rite (underprepared)')!
    const cond = opt.condition as any
    const infCond = cond.conditions.find((c: any) => c.resource === 'influence')
    const goldCond = cond.conditions.find((c: any) => c.resource === 'gold')
    const relCond = cond.conditions.find((c: any) => c.resource === 'relics')
    const notCond = cond.conditions.find((c: any) => c.type === 'not')
    expect(infCond?.min).toBe(3)
    expect(goldCond?.min).toBe(3)
    expect(relCond?.min).toBe(1)
    expect(notCond).toBeDefined()
  })

  it('endRun opt has succumbOption: true', () => {
    const opt = card().options.find(o => o.label === 'The water does not wait')!
    expect(opt.succumbOption).toBe(true)
  })
})
```

**Note:** `YHA_NTHLEI_CHAIN` must be exported from `yha_nthlei.ts`. Check if it already is — if not, add `export` to the `const YHA_NTHLEI_CHAIN` declaration in that file. (It's likely exported via `GOD_PATH_CHAINS` in `src/data/index.ts` but may not be a named export.)

- [ ] **Step 2: Check if YHA_NTHLEI_CHAIN is a named export**

```
grep -n "export.*YHA_NTHLEI\|export.*yha_nthlei" "C:/Project Abyssial/Code/project-abyssial/src/data/godPaths/yha_nthlei.ts"
```

If not exported, add `export` to the chain array declaration in `yha_nthlei.ts`. If it is, skip.

- [ ] **Step 3: Run tests to confirm they fail**

```
npm test -- nyarlathotep.test
```

Expected: all new yha tests fail.

- [ ] **Step 4: Update yha_nthlei_6 card data**

In `src/data/godPaths/yha_nthlei.ts`, replace the `yha_nthlei_6` options array:

```typescript
options: [
  {
    label: 'Complete the rite',
    flavourText: 'The sea took what we offered. It was thorough.',
    effects: [
      { type: 'resource', resource: 'influence', delta: -5 },
      { type: 'resource', resource: 'gold', delta: -4 },
      { type: 'resource', resource: 'relics', delta: -1 },
      { type: 'victory' },
    ],
    condition: {
      type: 'and',
      conditions: [
        { type: 'resourceMin', resource: 'influence', min: 5 },
        { type: 'resourceMin', resource: 'gold', min: 4 },
        { type: 'resourceMin', resource: 'relics', min: 1 },
      ],
    },
  },
  {
    label: 'Complete the rite (underprepared)',
    flavourText: 'We gave what we had. The sea noted the shortfall.',
    effects: [
      { type: 'resource', resource: 'influence', delta: -3 },
      { type: 'resource', resource: 'gold', delta: -3 },
      { type: 'resource', resource: 'relics', delta: -1 },
      { type: 'partialVictory', god: 'yha_nthlei' },
    ],
    condition: {
      type: 'and',
      conditions: [
        { type: 'resourceMin', resource: 'influence', min: 3 },
        { type: 'resourceMin', resource: 'gold', min: 3 },
        { type: 'resourceMin', resource: 'relics', min: 1 },
        {
          type: 'not',
          condition: {
            type: 'and',
            conditions: [
              { type: 'resourceMin', resource: 'influence', min: 5 },
              { type: 'resourceMin', resource: 'gold', min: 4 },
              { type: 'resourceMin', resource: 'relics', min: 1 },
            ],
          },
        },
      ],
    },
  },
  {
    label: 'The water does not wait',
    flavourText: 'The sea notes the deficiency. It does not adjust.',
    succumbOption: true,
    effects: [
      { type: 'resource', resource: 'dread', delta: 10 },
      { type: 'endRun', reason: 'The tide answered before the rite was complete. What was owed was taken anyway.' },
    ],
  },
],
```

- [ ] **Step 5: Run tests**

```
npm test -- nyarlathotep.test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/yha_nthlei.ts src/data/godPaths/nyarlathotep.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(yha): 6/6 summon — inf/gold/relic drain costs, drop dread gate, succumbOption (P25-41)"
```

---

### Task 4: P25-41c — Shub 6/6 succumbOption only

**Files:**
- Modify: `src/data/godPaths/shub_niggurath.ts` — `shub_niggurath_6` endRun opt only
- Test: `src/state/gameStore.test.ts` — add assertion to existing `describe('shub_niggurath_6 victory conditions (P25-51)'...)`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `shub_niggurath_6` endRun opt has `succumbOption: true`

- [ ] **Step 1: Write the failing test**

In `src/state/gameStore.test.ts`, find the existing `describe('shub_niggurath_6 victory conditions (P25-51)', ...)` block and add one test inside it:

```typescript
it('endRun opt "The offering is insufficient" has succumbOption: true', () => {
  const endRunOpt = shub6.options.find(o => o.label === 'The offering is insufficient')!
  expect(endRunOpt.succumbOption).toBe(true)
})
```

Also add the same assertion to `src/state/__tests__/p20b-integration.test.ts` inside `describe('shub_niggurath_6 victory conditions (P20-B)', ...)`:

```typescript
it('endRun opt has succumbOption: true', () => {
  const endRunOpt = shub6.options.find(o => o.label === 'The offering is insufficient')!
  expect(endRunOpt.succumbOption).toBe(true)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm test
```

Expected: 2 failures for the new succumbOption assertions.

- [ ] **Step 3: Update shub_niggurath_6 endRun opt**

In `src/data/godPaths/shub_niggurath.ts`, find the `shub_niggurath_6` endRun option and add `succumbOption: true`:

```typescript
// OLD:
{
  label: 'The offering is insufficient',
  flavourText: 'The forest does not forgive shortfalls. It simply grows.',
  effects: [
    { type: 'endRun', reason: 'We did not give enough. The forest does not forgive shortfalls. It simply grows.' },
  ],
},

// NEW:
{
  label: 'The offering is insufficient',
  flavourText: 'The forest does not forgive shortfalls. It simply grows.',
  succumbOption: true,
  effects: [
    { type: 'endRun', reason: 'We did not give enough. The forest does not forgive shortfalls. It simply grows.' },
  ],
},
```

- [ ] **Step 4: Run full test suite**

```
npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/shub_niggurath.ts src/state/gameStore.test.ts src/state/__tests__/p20b-integration.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(shub): 6/6 endRun succumbOption — only show when no victory opt available (P25-41)"
```

---

### Task 5: P25-21 — Crawling Network blessing rebalance

**Files:**
- Modify: `src/data/blessings.ts` — description text for `the_crawling_network`
- Modify: `src/state/gameStore.ts` — engine block at `newTurnCount % 5 === 0`
- Test: `src/state/gameStore.test.ts` — new describe block

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: every 5th draw, one of `[followers, influence, gold, relics]` increases by 1 and dread increases by 1

- [ ] **Step 1: Write the failing tests**

In `src/state/gameStore.test.ts`, add this new describe block near other blessing tests:

```typescript
describe('the_crawling_network blessing — P25-21 random resource on 5th draw', () => {
  const makeCNState = (turnCount: number) => ({
    phase: 'playing' as const,
    runConfig: { godPath: 'nyarlathotep' as const, runLength: 'short' as const },
    turnCount,
    resources: { gold: 3, followers: 3, influence: 3, dread: 3, relics: 3, theChanged: 0 },
    deck: {
      drawPile: [{ id: 'congregation_meets', title: 'Congregation Meets', tier: 'core' as const, options: [] } as never],
      discardPile: [],
      permDiscardPile: [],
      chainReserve: [],
      nextCycleQueue: [],
    },
    blessings: { unlocked: [], selected: ['the_crawling_network'] },
    activityLog: [],
    activityBatchSealed: true,
    cardRunState: {},
    pendingUnravelling: false,
    pendingGameOver: null,
    usedRareIds: new Set(),
  })

  it('draws on turn 5 (turnCount 4 before draw): one of [followers, influence, gold, relics] increases by 1', () => {
    useGameStore.setState(makeCNState(4) as any)
    const before = { ...useGameStore.getState().resources }
    useGameStore.getState().drawNextCard()
    const after = useGameStore.getState().resources
    const pool = ['followers', 'influence', 'gold', 'relics'] as const
    const increased = pool.filter(r => after[r] === before[r] + 1)
    const unchanged = pool.filter(r => after[r] === before[r])
    expect(increased).toHaveLength(1)
    expect(unchanged).toHaveLength(3)
  })

  it('draws on turn 5: dread increases by 1', () => {
    useGameStore.setState(makeCNState(4) as any)
    const before = useGameStore.getState().resources.dread
    useGameStore.getState().drawNextCard()
    const after = useGameStore.getState().resources.dread
    expect(after).toBe(before + 1)
  })

  it('draws on turn 4 (turnCount 3 before draw): no crawling_network bonus fires', () => {
    useGameStore.setState(makeCNState(3) as any)
    const before = { ...useGameStore.getState().resources }
    useGameStore.getState().drawNextCard()
    const after = useGameStore.getState().resources
    const pool = ['followers', 'influence', 'gold', 'relics', 'dread'] as const
    // No resource should have changed due to the blessing (card itself has no onDraw)
    const changed = pool.filter(r => after[r] !== before[r])
    expect(changed).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm test -- gameStore.test
```

Expected: 3 new failures.

- [ ] **Step 3: Update the blessing description**

In `src/data/blessings.ts`, find the `the_crawling_network` entry and update its `description`:

```typescript
// OLD:
description: 'Every 5th card drawn: Influence +1. Every 5th card drawn: Dread +1.',

// NEW:
description: 'Every 5th card drawn: +1 to a random resource. Dread +1.',
```

- [ ] **Step 4: Update the engine in gameStore.ts**

In `src/state/gameStore.ts`, find the Crawling Network block (search for `the_crawling_network`). It starts at the `if (!isTutorial && state.blessings.selected.includes('the_crawling_network')` line. Replace the block up to (but not including) the dread increment:

```typescript
// OLD block (inside drawNextCard):
if (!isTutorial && state.blessings.selected.includes('the_crawling_network') && newTurnCount % 5 === 0) {
  const prevInfl  = resources.influence
  resources = applyDelta(resources, 'influence', 1)
  const beforeCNOF = deck
  deck = applyOverflowEffects(resources, deck, 'influence', prevInfl)
  appendInsertionDiff(beforeCNOF, deck, drawBeatChanges, 'overflow')
  appendPurgeDiff(beforeCNOF, deck, drawBeatChanges)
  const beforeCNDF = deck
  deck = applyDeficitEffects(resources, deck, 'influence', prevInfl)
  appendInsertionDiff(beforeCNDF, deck, drawBeatChanges, 'deficit')
  appendPurgeDiff(beforeCNDF, deck, drawBeatChanges)

// NEW block:
if (!isTutorial && state.blessings.selected.includes('the_crawling_network') && newTurnCount % 5 === 0) {
  const cnPool = ['followers', 'influence', 'gold', 'relics'] as const
  const cnResource = cnPool[Math.floor(Math.random() * cnPool.length)]
  const prevCN = resources[cnResource]
  resources = applyDelta(resources, cnResource, 1)
  const beforeCNOF = deck
  deck = applyOverflowEffects(resources, deck, cnResource, prevCN)
  appendInsertionDiff(beforeCNOF, deck, drawBeatChanges, 'overflow')
  appendPurgeDiff(beforeCNOF, deck, drawBeatChanges)
  const beforeCNDF = deck
  deck = applyDeficitEffects(resources, deck, cnResource, prevCN)
  appendInsertionDiff(beforeCNDF, deck, drawBeatChanges, 'deficit')
  appendPurgeDiff(beforeCNDF, deck, drawBeatChanges)
```

Leave everything after (the dread increment, unravelling check) unchanged.

- [ ] **Step 5: Run full test suite**

```
npm test
```

Expected: all pass. If the "turn 4 no bonus fires" test fails due to the card having unexpected resource effects, check that `congregation_meets` has no `onDraw` effects — if so, swap to a bare card object in the test state.

- [ ] **Step 6: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/blessings.ts src/state/gameStore.ts src/state/gameStore.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(blessing): crawling_network — random resource instead of fixed influence (P25-21)"
```

---

## Self-Review

**Spec coverage:**
- P25-41 Nyar 6/6 drain + dread gate → Task 2 ✓
- P25-41 Yha 6/6 drain + drop dread gate → Task 3 ✓
- P25-41 Shub 6/6 succumbOption only → Task 4 ✓
- P25-41 all endRun opts → succumbOption: Tasks 2, 3, 4 ✓
- P25-41 remove godPathStageMin → Task 2 (Nyar only had it; confirmed Yha/Shub never did) ✓
- P25-41 partial NOT(full) condition → Tasks 2 and 3 ✓
- P25-21 random resource pool → Task 5 ✓
- P25-21 dread unchanged → Task 5 (block left as-is after resource swap) ✓
- P25-21 description update → Task 5 step 3 ✓
- P25-60 crossroads opt2 stall → Task 1 ✓
- P25-60 condition removed → Task 1 ✓

**Placeholder scan:** No TBDs. All code shown. ✓

**Type consistency:** `cnResource` typed as `typeof cnPool[number]` via `as const`, compatible with `ResourceKey` parameter of `applyDelta`/`applyOverflowEffects`/`applyDeficitEffects`. ✓

**One risk to note:** Task 3 imports `YHA_NTHLEI_CHAIN` directly — verify the named export exists before writing tests. Step 2 of Task 3 covers this check.
