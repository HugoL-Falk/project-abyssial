# Nyar Whisper Escalation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed whispers from Nyar chain stage 1 onward on all advance options, raise the active cap from 5 to 10, and add whisper seeding to The Moving Painting.

**Architecture:** Two files change. `whispers.ts` gets a 1-line cap increase. `nyarlathotep.ts` gets `seedWhispers` effects added to 7 options and updated on 1, across 4 chain cards plus the inserted painting card. Existing tests are updated to match; new tests cover every new seed.

**Tech Stack:** TypeScript, Vitest

## Global Constraints

- All options that do NOT advance the god path (deferral, resistance, painting detour) must NOT gain `seedWhispers` — verify these remain clean.
- Prep tag advance options seed 1 (floor). Standard advance options seed as specified.
- `seedWhispers` effect must follow the existing effect object shape: `{ type: 'seedWhispers', count: N }`.
- Run `npx vitest run` from `C:/Project Abyssial/Code/project-abyssial` for all test commands.

---

## File Map

| File | Change |
|---|---|
| `src/engine/whispers.ts` | Line 356 (jsdoc) + line 366: `5` → `10` in cap |
| `src/engine/whispers.test.ts` | Update cap test: 4 active + request 3 → now allows up to 6, not 1 |
| `src/data/godPaths/nyarlathotep.ts` | Add/update `seedWhispers` on 9 options across CS1, CS2, CS5, Moving Painting |
| `src/data/godPaths/nyarlathotep.test.ts` | Update 2 existing tests that assert no seeds; add 7 new seed-count tests |

---

## Task 1: Raise active whisper cap 5 → 10

**Files:**
- Modify: `src/engine/whispers.ts` (lines 356, 366)
- Modify: `src/engine/whispers.test.ts` (line 41–50)

**Interfaces:**
- Produces: `applyWhisperSeed` now allows up to 10 active whispers

- [ ] **Step 1: Write the failing test**

In `src/engine/whispers.test.ts`, replace the existing cap test (lines 41–50):

```typescript
it('respects the 10-active hard cap', () => {
  const alreadyActive: CardId[] = [
    'congregation_meets',
    'the_old_book',
    'rival_stirs',
    'academic_society',
    'the_donation',
    'the_inheritance',
    'the_newspaper',
    'word_spreads',
    'the_harbormaster',
  ] // 9 active
  const result = applyWhisperSeed(3, alreadyActive, [])
  expect(result.newTargets.length).toBeLessThanOrEqual(1)
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/engine/whispers.test.ts --reporter=verbose
```

Expected: FAIL — `expect(received).toBeLessThanOrEqual(1)` because current cap of 5 is already exceeded by 9 active, so result is 0 — actually this passes. 

> **Note:** The current test passes with 4 active asking for 3 → gets ≤1 (gets exactly 1). With the new test, 9 active asking for 3 → cap = min(3, 5-9) = min(3,-4) = clamped to 0 → returns 0, which IS ≤1 so the test passes with old code too.

Rewrite the test to be a **positive** assertion of the new cap instead:

```typescript
it('allows up to 10 active whispers (hard cap)', () => {
  // 8 already active — should still be able to seed 2 more
  const alreadyActive: CardId[] = [
    'congregation_meets',
    'the_old_book',
    'rival_stirs',
    'academic_society',
    'the_donation',
    'the_inheritance',
    'the_newspaper',
    'word_spreads',
  ] // 8 active
  const result = applyWhisperSeed(3, alreadyActive, [])
  // cap = min(3, 10-8) = min(3,2) = 2 — should get exactly 2
  expect(result.newTargets).toHaveLength(2)
})

it('hard cap prevents seeding beyond 10', () => {
  const alreadyActive: CardId[] = [
    'congregation_meets',
    'the_old_book',
    'rival_stirs',
    'academic_society',
    'the_donation',
    'the_inheritance',
    'the_newspaper',
    'word_spreads',
    'the_harbormaster',
    'the_left_item',
  ] // 10 active — at cap
  const result = applyWhisperSeed(2, alreadyActive, [])
  expect(result.newTargets).toHaveLength(0)
})
```

- [ ] **Step 3: Run to verify the new tests fail**

```bash
npx vitest run src/engine/whispers.test.ts --reporter=verbose
```

Expected: first new test FAILS (gets 0, expects 2); second new test passes (old cap also blocks 10).

- [ ] **Step 4: Implement — raise cap in whispers.ts**

In `src/engine/whispers.ts`, update two lines:

Line 356 (jsdoc comment):
```typescript
// Before:
 *   2. cap = min(count, 5 - alreadyActive.length)
// After:
 *   2. cap = min(count, 10 - alreadyActive.length)
```

Line 366 (implementation):
```typescript
// Before:
  const cap = Math.min(count, 5 - alreadyActive.length)
// After:
  const cap = Math.min(count, 10 - alreadyActive.length)
```

- [ ] **Step 5: Run all whisper tests to verify they pass**

```bash
npx vitest run src/engine/whispers.test.ts --reporter=verbose
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/engine/whispers.ts src/engine/whispers.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat: raise active whisper cap 5→10 (P25-23)"
```

---

## Task 2: Add seedWhispers to CS1, CS2, CS5 advance options and The Moving Painting

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts`
- Modify: `src/data/godPaths/nyarlathotep.test.ts`

**Interfaces:**
- Consumes: `seedWhispers` effect type (already in use at CS3/CS4)
- Produces: 9 options now carry `seedWhispers` (was 3)

### 2a — Write failing tests

- [ ] **Step 1: Add failing tests for CS1**

In `src/data/godPaths/nyarlathotep.test.ts`, inside `describe('nyarlathotep_4 — The Book is Opened (CS1)')`, add after the existing tests:

```typescript
it('opt0 "Formalise a study group" seeds 1 whisper', () => {
  const opt = card().options.find(o => o.label === 'Formalise a study group')!
  const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
  expect(whispers?.count).toBe(1)
})

it('opt2 "Dream the bargain" seeds 1 whisper', () => {
  const opt = card().options.find(o => o.label === 'Dream the bargain')!
  const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
  expect(whispers?.count).toBe(1)
})
```

Also update the existing `"Let it circulate freely" ... has no seedWhispers` test — this should still pass (non-advance), no change needed.

- [ ] **Step 2: Update existing CS2 tests + add new ones**

In `describe('nyarlathotep_3 — The Black Man at the Crossroads (CS2)')`:

Replace the existing `"Encourage the meetings" ... no seedWhispers` test:
```typescript
// Remove:
it('opt0 "Encourage the meetings" gives +2 fol/+2 dread with no inf cost or seedWhispers', () => {
  ...
  expect(opt.effects.some((e: any) => e.type === 'seedWhispers')).toBe(false)
})

// Replace with:
it('opt0 "Encourage the meetings" gives +2 fol/+2 dread and seeds 2 whispers', () => {
  const opt = card().options.find(o => o.label === 'Encourage the meetings')!
  const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers') as any
  const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread') as any
  const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence')
  const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
  expect(fol?.delta).toBe(2)
  expect(dread?.delta).toBe(2)
  expect(inf).toBeUndefined()
  expect(whispers?.count).toBe(2)
})
```

Replace the existing `"Observe without intervening" ... no seedWhispers` test:
```typescript
// Remove:
it('opt1 "Observe without intervening" gives only +1 dread — no fol cost, no seedWhispers', () => {
  ...
  expect(opt.effects.some((e: any) => e.type === 'seedWhispers')).toBe(false)
})

// Replace with:
it('opt1 "Observe without intervening" gives +1 dread and seeds 1 whisper', () => {
  const opt = card().options.find(o => o.label === 'Observe without intervening')!
  const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread') as any
  const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers')
  const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
  expect(dread?.delta).toBe(1)
  expect(fol).toBeUndefined()
  expect(whispers?.count).toBe(1)
})
```

Add after the existing `"Greet him as expected" has no dread delta` test:
```typescript
it('opt2 "Greet him as expected" seeds 1 whisper', () => {
  const opt = card().options.find(o => o.label === 'Greet him as expected')!
  const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
  expect(whispers?.count).toBe(1)
})
```

- [ ] **Step 3: Add failing tests for CS5**

In `describe('nyarlathotep_5 — The Signal Broadens (CS5)')`, add after existing tests:

```typescript
it('opt0 "Tune in" seeds 2 whispers', () => {
  const opt = card().options.find(o => o.label === 'Tune in')!
  const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
  expect(whispers?.count).toBe(2)
})

it('opt2 "Speak his name back" seeds 1 whisper', () => {
  const opt = card().options.find(o => o.label === 'Speak his name back')!
  const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
  expect(whispers?.count).toBe(1)
})

it('opt1 "Destroy the equipment" does not seed whispers', () => {
  const opt = card().options.find(o => o.label === 'Destroy the equipment')!
  expect(opt.effects.some((e: any) => e.type === 'seedWhispers')).toBe(false)
})
```

- [ ] **Step 4: Add failing tests for The Moving Painting**

In `describe('THE_MOVING_PAINTING')`, add after existing tests:

```typescript
it('"Speak with each of them" seeds 1 whisper', () => {
  const opt = THE_MOVING_PAINTING.options[0]
  const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
  expect(whispers?.count).toBe(1)
})

it('"Leave it" seeds 1 whisper', () => {
  const opt = THE_MOVING_PAINTING.options[1]
  const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
  expect(whispers?.count).toBe(1)
})
```

- [ ] **Step 5: Run to verify all new tests fail**

```bash
npx vitest run src/data/godPaths/nyarlathotep.test.ts --reporter=verbose
```

Expected: 9 tests fail (the new seed assertions); existing unrelated tests still pass.

### 2b — Implement

- [ ] **Step 6: CS1 — add seedWhispers to "Formalise a study group" and "Dream the bargain"**

In `src/data/godPaths/nyarlathotep.ts`, find `nyarlathotep_4` (CS1).

"Formalise a study group" — add `{ type: 'seedWhispers', count: 1 }` before `advanceGodPath`:
```typescript
effects: [
  { type: 'resource', resource: 'followers', delta: -1 },
  { type: 'resource', resource: 'dread', delta: 1 },
  { type: 'seedWhispers', count: 1 },
  { type: 'advanceGodPath' },
],
```

"Dream the bargain" — add `{ type: 'seedWhispers', count: 1 }` before `advanceGodPath`:
```typescript
effects: [
  { type: 'consumePrepTag', tag: 'opium_pact' },
  { type: 'resource', resource: 'dread', delta: -1 },
  { type: 'resource', resource: 'followers', delta: 1 },
  { type: 'seedWhispers', count: 1 },
  { type: 'advanceGodPath' },
],
```

- [ ] **Step 7: CS2 — add seedWhispers to all three advance options**

In `nyarlathotep_3` (CS2):

"Encourage the meetings" — add `{ type: 'seedWhispers', count: 2 }` before `advanceGodPath`:
```typescript
effects: [
  { type: 'resource', resource: 'followers', delta: 2 },
  { type: 'resource', resource: 'dread', delta: 2 },
  { type: 'seedWhispers', count: 2 },
  { type: 'advanceGodPath' },
],
```

"Observe without intervening" — add `{ type: 'seedWhispers', count: 1 }` before `advanceGodPath`:
```typescript
effects: [
  { type: 'resource', resource: 'dread', delta: 1 },
  { type: 'seedWhispers', count: 1 },
  { type: 'advanceGodPath' },
],
```

"Greet him as expected" — add `{ type: 'seedWhispers', count: 1 }` before `advanceGodPath`:
```typescript
effects: [
  { type: 'consumePrepTag', tag: 'attended_seance' },
  { type: 'resource', resource: 'influence', delta: 1 },
  { type: 'seedWhispers', count: 1 },
  { type: 'advanceGodPath' },
],
```

- [ ] **Step 8: CS5 — update "Tune in" count + add to "Speak his name back"**

In `nyarlathotep_5` (CS5):

"Tune in" — change existing `count: 1` to `count: 2`:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: 2 },
  { type: 'resource', resource: 'dread', delta: 3 },
  { type: 'advanceGodPath' },
  { type: 'seedWhispers', count: 2 },
],
```

"Speak his name back" — add `{ type: 'seedWhispers', count: 1 }` before `advanceGodPath`:
```typescript
effects: [
  { type: 'consumePrepTag', tag: 'recited' },
  { type: 'resource', resource: 'dread', delta: 1 },
  { type: 'resource', resource: 'relics', delta: 1 },
  { type: 'seedWhispers', count: 1 },
  { type: 'advanceGodPath' },
],
```

- [ ] **Step 9: The Moving Painting — add seedWhispers to both options**

In `THE_MOVING_PAINTING`:

"Speak with each of them":
```typescript
{
  label: 'Speak with each of them',
  flavourText: 'You interview them separately. The accounts are identical. Something settles.',
  effects: [
    { type: 'resource', resource: 'influence', delta: -2 },
    { type: 'seedWhispers', count: 1 },
  ],
  condition: { type: 'resourceMin', resource: 'influence', min: 2 },
},
```

"Leave it":
```typescript
{
  label: 'Leave it',
  flavourText: 'The accounts keep circulating. The details get sharper each retelling.',
  effects: [
    { type: 'resource', resource: 'dread', delta: 2 },
    { type: 'seedWhispers', count: 1 },
  ],
},
```

### 2c — Verify and commit

- [ ] **Step 10: Run nyarlathotep tests**

```bash
npx vitest run src/data/godPaths/nyarlathotep.test.ts --reporter=verbose
```

Expected: all tests pass.

- [ ] **Step 11: Run full test suite**

```bash
npx vitest run --reporter=verbose
```

Expected: all tests pass. Note the total count in output.

- [ ] **Step 12: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/nyarlathotep.ts src/data/godPaths/nyarlathotep.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat: whisper escalation from CS1 — all advance options seed (P25-23)"
```
