# P20-C Nyarlathotep Coherence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the Nyarlathotep 6-card chain around a "spreading signal" frame, reclassify `the_moving_painting` as a threat, trim resource deltas on early cards, and add self-reinsert loop mechanics on non-advance options to keep runs within 6 weeks.

**Architecture:** All changes are confined to `src/data/godPaths/nyarlathotep.ts` (card definitions) and `src/state/gameStore.test.ts` (one structural test fix). A new dedicated test file is created at `src/data/godPaths/nyarlathotep.test.ts`. No engine changes required.

**Tech Stack:** TypeScript, Vitest. Git repo at `E:/Project Abyssial/Code/project-abyssial`.

## Global Constraints

- Flavour cap: option `flavourText` ≤ 80 chars; card `flavourText` (body) ≤ 108 chars. tutorial.ts exempt.
- No new cards. No engine changes.
- `godPathStageMin` on each advance-option must equal `chainStage - 1`.
- Every non-advance option on a chain card must reinsert the card within the current deck cycle via explicit `insertCard` effect. No card may rely on the reshuffle to return.
- `the_moving_painting` is reclassified to `tier: 'threat'`. When the engine processes an `insertCard` effect targeting a threat-tier card, it routes to `nextCycleQueue` — the `minPos`/`maxPos` are retained in the effect definition for documentation but are not applied to position within the current cycle. This is acceptable: the threat appears early next cycle before the Exhibit self-reinserts.
- All commits local only. Use `git -C "E:/Project Abyssial/Code/project-abyssial"` for all git commands.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/data/godPaths/nyarlathotep.ts` | Modify | All card definitions — THE_MOVING_PAINTING + 6 chain cards |
| `src/data/godPaths/nyarlathotep.test.ts` | Create | Dedicated data-level tests for nyarlathotep cards |
| `src/state/gameStore.test.ts` | Modify | Fix structural test at line 1168 (chainStage 4 Lecture has no prep-tag by design) |

---

## Chain Reorder Reference (keep visible throughout)

| Card ID | Old chainStage | New chainStage | godPathStageMin old → new |
|---|---|---|---|
| `nyarlathotep_4` (Book) | 4 | **1** | 3 → **0** |
| `nyarlathotep_3` (Crossroads) | 3 | **2** | 2 → **1** |
| `nyarlathotep_2` (Exhibit) | 2 | **3** | 1 → **2** |
| `nyarlathotep_1` (Lecture) | 1 | **4** | 0 → **3** |
| `nyarlathotep_5` (Radio) | 5 | 5 | 4 (no change) |
| `nyarlathotep_6` (Crawling Signal) | 6 | 6 | 5 (no change) |

---

## Task 1 — THE_MOVING_PAINTING reclassification

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts` (lines 5–31, THE_MOVING_PAINTING)
- Create: `src/data/godPaths/nyarlathotep.test.ts`

**Interfaces:**
- Produces: `THE_MOVING_PAINTING` with `tier: 'threat'`, no `godPath` field, two options (no conditions, unconditioned)

- [ ] **Step 1: Create the test file with failing tests for the reclassification**

Create `src/data/godPaths/nyarlathotep.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { GOD_PATH_CHAINS } from '../index'
import { THE_MOVING_PAINTING } from './nyarlathotep'

describe('THE_MOVING_PAINTING', () => {
  it('is classified as threat with no godPath', () => {
    expect(THE_MOVING_PAINTING.tier).toBe('threat')
    expect((THE_MOVING_PAINTING as any).godPath).toBeUndefined()
  })

  it('has two options: "Speak with each of them" and "Leave it"', () => {
    expect(THE_MOVING_PAINTING.options).toHaveLength(2)
    expect(THE_MOVING_PAINTING.options[0].label).toBe('Speak with each of them')
    expect(THE_MOVING_PAINTING.options[1].label).toBe('Leave it')
  })

  it('"Speak with each of them" costs −2 influence with resourceMin inf 2 condition', () => {
    const opt = THE_MOVING_PAINTING.options[0]
    expect(opt.condition).toEqual({ type: 'resourceMin', resource: 'influence', min: 2 })
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence')
    expect(inf?.delta).toBe(-2)
  })

  it('"Leave it" gives +2 dread with no condition', () => {
    const opt = THE_MOVING_PAINTING.options[1]
    expect(opt.condition).toBeUndefined()
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    expect(dread?.delta).toBe(2)
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run src/data/godPaths/nyarlathotep.test.ts --reporter=verbose
```

Expected: 4 failures (tier is `god_path`, godPath is defined, options don't match).

- [ ] **Step 3: Update THE_MOVING_PAINTING definition in nyarlathotep.ts**

Replace lines 5–31 (the entire `THE_MOVING_PAINTING` export):

```ts
export const THE_MOVING_PAINTING: Card = {
  id: 'the_moving_painting',
  title: 'The Moving Painting',
  flavourText: 'Three followers described the same motion in the oils. Same direction. Same hour.',
  tier: 'threat',
  options: [
    {
      label: 'Speak with each of them',
      flavourText: 'You interview them separately. The accounts are identical. Something settles.',
      effects: [
        { type: 'resource', resource: 'influence', delta: -2 },
      ],
      condition: { type: 'resourceMin', resource: 'influence', min: 2 },
    },
    {
      label: 'Leave it',
      flavourText: 'The accounts keep circulating. The details get sharper each retelling.',
      effects: [
        { type: 'resource', resource: 'dread', delta: 2 },
      ],
    },
  ],
}
```

- [ ] **Step 4: Run tests to confirm 4 pass**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run src/data/godPaths/nyarlathotep.test.ts --reporter=verbose
```

Expected: 4 pass.

- [ ] **Step 5: Run full suite to confirm no regressions**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run --reporter=verbose 2>&1 | tail -5
```

Expected: all 169 existing tests pass. (The painting's old options had `advanceGodPath` and `insertCard nyarlathotep_2` — removing them does not break any engine test because no test exercised those paths for this card.)

- [ ] **Step 6: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/nyarlathotep.ts src/data/godPaths/nyarlathotep.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "feat(P20-C): reclassify the_moving_painting as threat with two-option trade-off"
```

---

## Task 2 — Chain reorder: chainStage + godPathStageMin for all 6 cards

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts` (chainStage + godPathStageMin on all 6 cards; reorder source array)
- Modify: `src/state/gameStore.test.ts` (line 1168 structural test — add `continue` for nyarlathotep CS4)
- Modify: `src/data/godPaths/nyarlathotep.test.ts` (add chainStage verification test)

**Interfaces:**
- Produces: 6 chain cards with correct `chainStage` values; source array ordered CS1→CS6

- [ ] **Step 1: Add chainStage verification test to nyarlathotep.test.ts**

Append inside the file (after the THE_MOVING_PAINTING describe block):

```ts
describe('nyarlathotep chain — chainStage reorder', () => {
  it('each card has the correct chainStage after reorder', () => {
    const chain = GOD_PATH_CHAINS.nyarlathotep
    expect(chain.find(c => c.id === 'nyarlathotep_4')?.chainStage).toBe(1)
    expect(chain.find(c => c.id === 'nyarlathotep_3')?.chainStage).toBe(2)
    expect(chain.find(c => c.id === 'nyarlathotep_2')?.chainStage).toBe(3)
    expect(chain.find(c => c.id === 'nyarlathotep_1')?.chainStage).toBe(4)
    expect(chain.find(c => c.id === 'nyarlathotep_5')?.chainStage).toBe(5)
    expect(chain.find(c => c.id === 'nyarlathotep_6')?.chainStage).toBe(6)
  })
})
```

- [ ] **Step 2: Run to confirm test fails**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run src/data/godPaths/nyarlathotep.test.ts --reporter=verbose 2>&1 | grep -E "FAIL|chainStage"
```

Expected: `chainStage reorder` test fails (nyarlathotep_4 currently has chainStage 4, not 1, etc.).

- [ ] **Step 3: Update chainStage and godPathStageMin values in nyarlathotep.ts, and reorder the source array**

In `nyarlathotep.ts`, the `NYARLATHOTEP_CHAIN` array currently holds cards in the order: nyarlathotep_1, nyarlathotep_2, nyarlathotep_3, nyarlathotep_4, nyarlathotep_5, nyarlathotep_6.

Reorder the array to: nyarlathotep_4, nyarlathotep_3, nyarlathotep_2, nyarlathotep_1, nyarlathotep_5, nyarlathotep_6 (matching the new chainStage order). For each card, update ONLY the `chainStage` and `godPathStageMin` values at this step — do NOT change options or flavour text yet.

Apply this mapping verbatim:

| Card | Old chainStage | New | Old godPathStageMin (advance opts) | New |
|---|---|---|---|---|
| `nyarlathotep_4` | 4 | **1** | 3 (on opt0 `and` condition) | **0** |
| `nyarlathotep_3` | 3 | **2** | 2 (on opts 0 and 1) | **1** |
| `nyarlathotep_2` | 2 | **3** | 1 (on opt0 `and` condition) | **2** |
| `nyarlathotep_1` | 1 | **4** | 0 (on opt0) | **3** |
| `nyarlathotep_5` | 5 | 5 | 4 — no change | 4 |
| `nyarlathotep_6` | 6 | 6 | 5 — no change | 5 |

For `nyarlathotep_4` opt0: the `and` condition also requires `resourceMin followers: 3`. Leave that condition in place for now — it will be removed in Task 3.

- [ ] **Step 4: Fix the structural test in gameStore.test.ts**

Find the test `'each god has exactly one hasPrepTag option on chain stages 2-5'` at line 1168. Update it to skip nyarlathotep chainStage 4 (Lecture has no prep-tag by design — it is a public event):

```ts
it('each god has exactly one hasPrepTag option on chain stages 2-5', () => {
  for (const god of ['yha_nthlei', 'nyarlathotep', 'shub_niggurath'] as const) {
    for (const stage of [2, 3, 4, 5]) {
      // nyarlathotep chainStage 4 (The Lecture) is a public event — no prep-tag shortcut by design
      if (god === 'nyarlathotep' && stage === 4) continue
      const card = GOD_PATH_CHAINS[god].find(c => c.chainStage === stage)!
      const prepOpts = card.options.filter(o => o.condition?.type === 'hasPrepTag')
      expect(prepOpts).toHaveLength(1)
    }
  }
})
```

- [ ] **Step 5: Run full suite**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run --reporter=verbose 2>&1 | tail -8
```

Expected: 170 tests pass (169 existing + 1 new chainStage test). The structural test no longer fails for nyarlathotep CS4.

- [ ] **Step 6: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/nyarlathotep.ts src/data/godPaths/nyarlathotep.test.ts src/state/gameStore.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "feat(P20-C): reorder nyarlathotep chain — chainStage and godPathStageMin updates"
```

---

## Task 3 — Book (nyarlathotep_4, CS1) + Crossroads (nyarlathotep_3, CS2) option updates

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts` (nyarlathotep_4 and nyarlathotep_3 options)
- Modify: `src/data/godPaths/nyarlathotep.test.ts` (add tests)

- [ ] **Step 1: Add failing tests**

Append a new describe block to `nyarlathotep.test.ts`:

```ts
describe('nyarlathotep_4 — The Book is Opened (CS1)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_4')!

  it('opt0 "Formalise a study group" has only godPathStageMin:0 condition (no resourceMin followers)', () => {
    const opt = card().options.find(o => o.label === 'Formalise a study group')!
    expect(opt.condition).toEqual({ type: 'godPathStageMin', min: 0 })
  })

  it('opt0 "Formalise a study group" costs −1 fol/+1 dread', () => {
    const opt = card().options.find(o => o.label === 'Formalise a study group')!
    const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers')
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    expect(fol?.delta).toBe(-1)
    expect(dread?.delta).toBe(1)
  })

  it('opt1 "Let it circulate freely" requires resourceMin inf 1 (not 2)', () => {
    const opt = card().options.find(o => o.label === 'Let it circulate freely')!
    expect(opt.condition).toEqual({ type: 'resourceMin', resource: 'influence', min: 1 })
  })

  it('opt1 "Let it circulate freely" costs −1 inf and has no seedWhispers', () => {
    const opt = card().options.find(o => o.label === 'Let it circulate freely')!
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence')
    expect(inf?.delta).toBe(-1)
    const hasWhispers = opt.effects.some((e: any) => e.type === 'seedWhispers')
    expect(hasWhispers).toBe(false)
  })

  it('opt2 "Dream the bargain" gives −1 dread (steadying, not alarming)', () => {
    const opt = card().options.find(o => o.label === 'Dream the bargain')!
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    expect(dread?.delta).toBe(-1)
  })
})

describe('nyarlathotep_3 — The Black Man at the Crossroads (CS2)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_3')!

  it('opts 0 and 1 require godPathStageMin 1', () => {
    const enc = card().options.find(o => o.label === 'Encourage the meetings')!
    const obs = card().options.find(o => o.label === 'Observe without intervening')!
    expect(enc.condition).toEqual({ type: 'godPathStageMin', min: 1 })
    expect(obs.condition).toEqual({ type: 'godPathStageMin', min: 1 })
  })

  it('opt0 "Encourage the meetings" gives +2 fol/+2 dread with no inf cost or seedWhispers', () => {
    const opt = card().options.find(o => o.label === 'Encourage the meetings')!
    const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers')
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence')
    expect(fol?.delta).toBe(2)
    expect(dread?.delta).toBe(2)
    expect(inf).toBeUndefined()
    expect(opt.effects.some((e: any) => e.type === 'seedWhispers')).toBe(false)
  })

  it('opt1 "Observe without intervening" gives only +1 dread — no fol cost, no seedWhispers', () => {
    const opt = card().options.find(o => o.label === 'Observe without intervening')!
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers')
    expect(dread?.delta).toBe(1)
    expect(fol).toBeUndefined()
    expect(opt.effects.some((e: any) => e.type === 'seedWhispers')).toBe(false)
  })

  it('opt2 "Greet him as expected" has no dread delta', () => {
    const opt = card().options.find(o => o.label === 'Greet him as expected')!
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    expect(dread).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run src/data/godPaths/nyarlathotep.test.ts --reporter=verbose 2>&1 | grep -E "FAIL|✓|×"
```

Expected: 9 new tests fail. Existing 5 pass.

- [ ] **Step 3: Update nyarlathotep_4 (Book) card definition**

Replace the entire nyarlathotep_4 card object in `nyarlathotep.ts` with:

```ts
{
  // Card 1 — THE BOOK IS OPENED
  id: 'nyarlathotep_4',
  title: 'The Book is Opened',
  flavourText: 'The Necronomicon is circulating among the followers. Not the university copy. We did not organise it.',
  tier: 'god_path',
  godPath: 'nyarlathotep',
  chainStage: 1,
  options: [
    {
      label: 'Formalise a study group',
      flavourText: 'Three appointed to take the lead. The structure has not slowed anything.',
      effects: [
        { type: 'resource', resource: 'followers', delta: -1 },
        { type: 'resource', resource: 'dread', delta: 1 },
        { type: 'advanceGodPath' },
      ],
      condition: { type: 'godPathStageMin', min: 0 },
    },
    {
      label: 'Let it circulate freely',
      flavourText: 'On its fourth reader now. They are all very quiet. The book keeps coming back.',
      effects: [
        { type: 'resource', resource: 'influence', delta: -1 },
        { type: 'resource', resource: 'dread', delta: 1 },
        { type: 'insertCard', cardId: 'nyarlathotep_4', position: 'random', minPos: 6, maxPos: 9 },
      ],
      condition: { type: 'resourceMin', resource: 'influence', min: 1 },
    },
    {
      label: 'Dream the bargain',
      flavourText: "The den's dreamers knew the terms. You renegotiate from there.",
      condition: { type: 'hasPrepTag', tag: 'opium_pact' },
      effects: [
        { type: 'consumePrepTag', tag: 'opium_pact' },
        { type: 'resource', resource: 'dread', delta: -1 },
        { type: 'resource', resource: 'followers', delta: 1 },
        { type: 'advanceGodPath' },
      ],
    },
  ],
},
```

- [ ] **Step 4: Update nyarlathotep_3 (Crossroads) card definition**

Replace the entire nyarlathotep_3 card object:

```ts
{
  // Card 2 — THE BLACK MAN AT THE CROSSROADS
  id: 'nyarlathotep_3',
  title: 'The Black Man at the Crossroads',
  flavourText: 'Someone meets our people at crossroads after dark. They come back changed. They describe the same figure.',
  tier: 'god_path',
  godPath: 'nyarlathotep',
  chainStage: 2,
  options: [
    {
      label: 'Encourage the meetings',
      flavourText: 'Attendance is voluntary. Everyone has attended.',
      effects: [
        { type: 'resource', resource: 'followers', delta: 2 },
        { type: 'resource', resource: 'dread', delta: 2 },
        { type: 'advanceGodPath' },
      ],
      condition: { type: 'godPathStageMin', min: 1 },
    },
    {
      label: 'Observe without intervening',
      flavourText: 'We watched a meeting from a distance. The distance felt insufficient.',
      effects: [
        { type: 'resource', resource: 'dread', delta: 1 },
        { type: 'advanceGodPath' },
      ],
      condition: { type: 'godPathStageMin', min: 1 },
    },
    {
      label: 'Greet him as expected',
      flavourText: 'You sat through his gathering. You know the greeting form. He answers in kind.',
      condition: { type: 'hasPrepTag', tag: 'attended_seance' },
      effects: [
        { type: 'consumePrepTag', tag: 'attended_seance' },
        { type: 'resource', resource: 'influence', delta: 1 },
        { type: 'advanceGodPath' },
      ],
    },
  ],
},
```

- [ ] **Step 5: Run full suite**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run --reporter=verbose 2>&1 | tail -8
```

Expected: 179 pass (170 + 9 new).

- [ ] **Step 6: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/nyarlathotep.ts src/data/godPaths/nyarlathotep.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "feat(P20-C): update Book (CS1) and Crossroads (CS2) options — trim costs, remove early whispers"
```

---

## Task 4 — Exhibit (nyarlathotep_2, CS3) option updates — dual insertCard loop

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts` (nyarlathotep_2)
- Modify: `src/data/godPaths/nyarlathotep.test.ts`

**Note on dual insertCard behaviour:** Exhibit opt1 fires two `insertCard` effects in order. Effect 1 targets `the_moving_painting` (now `tier: 'threat'`) — the engine routes it to `nextCycleQueue`, ignoring minPos/maxPos. Effect 2 targets `nyarlathotep_2` (tier: `god_path`) — the engine inserts it into the current deck at a random position between minPos 5 and maxPos 8. Both fire because the `for` loop over `effectiveEffects` continues after each `case 'insertCard': break` (the `break` exits the `switch`, not the `for`). Confirmed at `gameStore.ts` lines 832–924.

- [ ] **Step 1: Add failing tests**

```ts
describe('nyarlathotep_2 — The Exhibit (CS3)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_2')!

  it('opt0 "Sponsor the exhibit" requires godPathStageMin 2 AND gold 2', () => {
    const opt = card().options.find(o => o.label === 'Sponsor the exhibit')!
    expect(opt.condition).toEqual({
      type: 'and',
      conditions: [
        { type: 'godPathStageMin', min: 2 },
        { type: 'resourceMin', resource: 'gold', min: 2 },
      ],
    })
  })

  it('opt0 "Sponsor the exhibit" costs −2 gold/+2 inf, no dread, seeds 2 whispers', () => {
    const opt = card().options.find(o => o.label === 'Sponsor the exhibit')!
    const gold = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'gold')
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence')
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers')
    expect(gold?.delta).toBe(-2)
    expect(inf?.delta).toBe(2)
    expect(dread).toBeUndefined()
    expect(whispers?.count).toBe(2)
  })

  it('opt1 "Arrange a private viewing" inserts the_moving_painting then self-reinserts', () => {
    const opt = card().options.find(o => o.label === 'Arrange a private viewing')!
    const inserts = opt.effects.filter((e: any) => e.type === 'insertCard')
    expect(inserts).toHaveLength(2)
    expect(inserts[0]).toMatchObject({ cardId: 'the_moving_painting', minPos: 2, maxPos: 5 })
    expect(inserts[1]).toMatchObject({ cardId: 'nyarlathotep_2', minPos: 5, maxPos: 8 })
  })

  it('opt1 "Arrange a private viewing" has no dread delta', () => {
    const opt = card().options.find(o => o.label === 'Arrange a private viewing')!
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    expect(dread).toBeUndefined()
  })

  it('opt2 "Recognise the pattern" seeds 1 whisper', () => {
    const opt = card().options.find(o => o.label === 'Recognise the pattern')!
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers')
    expect(whispers?.count).toBe(1)
  })
})
```

- [ ] **Step 2: Run to confirm 5 new tests fail**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run src/data/godPaths/nyarlathotep.test.ts --reporter=verbose 2>&1 | grep -E "FAIL|✓|×"
```

- [ ] **Step 3: Replace nyarlathotep_2 (Exhibit) card definition**

```ts
{
  // Card 3 — THE EXHIBIT
  id: 'nyarlathotep_2',
  title: 'The Exhibit',
  flavourText: 'Several canvases from the old estate have arrived at the exhibit. The subject is listed as unclear.',
  tier: 'god_path',
  godPath: 'nyarlathotep',
  chainStage: 3,
  options: [
    {
      label: 'Sponsor the exhibit',
      flavourText: 'Our name is on a placard near the pieces. People stand near it for a long time.',
      effects: [
        { type: 'resource', resource: 'gold', delta: -2 },
        { type: 'resource', resource: 'influence', delta: 2 },
        { type: 'advanceGodPath' },
        { type: 'seedWhispers', count: 2 },
      ],
      condition: {
        type: 'and',
        conditions: [
          { type: 'godPathStageMin', min: 2 },
          { type: 'resourceMin', resource: 'gold', min: 2 },
        ],
      },
    },
    {
      label: 'Arrange a private viewing',
      flavourText: 'They found it very moving. Several found it literally moving.',
      effects: [
        { type: 'resource', resource: 'gold', delta: -1 },
        { type: 'resource', resource: 'followers', delta: 2 },
        { type: 'insertCard', cardId: 'the_moving_painting', position: 'random', minPos: 2, maxPos: 5 },
        { type: 'insertCard', cardId: 'nyarlathotep_2', position: 'random', minPos: 5, maxPos: 8 },
      ],
      condition: { type: 'resourceMin', resource: 'gold', min: 1 },
    },
    {
      label: 'Recognise the pattern',
      flavourText: 'You have read this shape before. The recognition steadies you.',
      condition: { type: 'hasPrepTag', tag: 'studied' },
      effects: [
        { type: 'consumePrepTag', tag: 'studied' },
        { type: 'resource', resource: 'dread', delta: 1 },
        { type: 'advanceGodPath' },
        { type: 'seedWhispers', count: 1 },
      ],
    },
  ],
},
```

- [ ] **Step 4: Run full suite**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run --reporter=verbose 2>&1 | tail -8
```

Expected: 184 pass.

- [ ] **Step 5: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/nyarlathotep.ts src/data/godPaths/nyarlathotep.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "feat(P20-C): update Exhibit (CS3) — dual insertCard loop, sponsor trim, recognise gains whisper"
```

---

## Task 5 — Lecture (nyarlathotep_1, CS4) option updates + loop mechanic

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts` (nyarlathotep_1)
- Modify: `src/data/godPaths/nyarlathotep.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('nyarlathotep_1 — The Lecture (CS4)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_1')!

  it('opt0 "Attend" requires godPathStageMin 3', () => {
    const opt = card().options.find(o => o.label === 'Attend')!
    expect(opt.condition).toEqual({ type: 'godPathStageMin', min: 3 })
  })

  it('opt0 "Attend" seeds 2 whispers', () => {
    const opt = card().options.find(o => o.label === 'Attend')!
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers')
    expect(whispers?.count).toBe(2)
  })

  it('opt1 "Distribute pamphlets" self-reinserts at minPos 5 maxPos 8', () => {
    const opt = card().options.find(o => o.label === 'Distribute pamphlets')!
    const selfInsert = opt.effects.find(
      (e: any) => e.type === 'insertCard' && e.cardId === 'nyarlathotep_1',
    )
    expect(selfInsert).toMatchObject({ cardId: 'nyarlathotep_1', minPos: 5, maxPos: 8 })
  })

  it('card has no prep-tag option (Lecture is a public event)', () => {
    const prepOpts = card().options.filter(o => o.condition?.type === 'hasPrepTag')
    expect(prepOpts).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to confirm 4 new tests fail**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run src/data/godPaths/nyarlathotep.test.ts --reporter=verbose 2>&1 | grep -E "FAIL|✓|×"
```

- [ ] **Step 3: Replace nyarlathotep_1 (Lecture) card definition**

```ts
{
  // Card 4 — THE LECTURE
  id: 'nyarlathotep_1',
  title: 'The Lecture',
  flavourText: 'A guest professor speaks on folklore tonight. Full house for a Tuesday. Not everyone came for the lecture.',
  tier: 'god_path',
  godPath: 'nyarlathotep',
  chainStage: 4,
  options: [
    {
      label: 'Attend',
      flavourText: 'The professor was charming. Several attendees were not there for the lecture.',
      effects: [
        { type: 'resource', resource: 'followers', delta: 1 },
        { type: 'resource', resource: 'influence', delta: 2 },
        { type: 'advanceGodPath' },
        { type: 'seedWhispers', count: 2 },
      ],
      condition: { type: 'godPathStageMin', min: 3 },
    },
    {
      label: 'Distribute pamphlets',
      flavourText: 'The class was full and will come back. Better make the most of it.',
      effects: [
        { type: 'resource', resource: 'gold', delta: -1 },
        { type: 'resource', resource: 'influence', delta: 1 },
        { type: 'resource', resource: 'followers', delta: 1 },
        { type: 'insertCard', cardId: 'nyarlathotep_1', position: 'random', minPos: 5, maxPos: 8 },
      ],
      condition: { type: 'resourceMin', resource: 'gold', min: 1 },
    },
  ],
},
```

- [ ] **Step 4: Run full suite**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run --reporter=verbose 2>&1 | tail -8
```

Expected: 188 pass.

- [ ] **Step 5: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/nyarlathotep.ts src/data/godPaths/nyarlathotep.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "feat(P20-C): update Lecture (CS4) — godPathStageMin 3, seedWhispers 2, pamphlets loop mechanic"
```

---

## Task 6 — Radio (nyarlathotep_5) + Crawling Signal (nyarlathotep_6) + flavour cap test

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts` (nyarlathotep_5 and nyarlathotep_6)
- Modify: `src/data/godPaths/nyarlathotep.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('nyarlathotep_5 — The Signal Broadens (CS5)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_5')!

  it('opt0 "Tune in" gives +2 inf/+3 dread with no followers cost', () => {
    const opt = card().options.find(o => o.label === 'Tune in')!
    const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers')
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence')
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    expect(fol).toBeUndefined()
    expect(inf?.delta).toBe(2)
    expect(dread?.delta).toBe(3)
  })

  it('opt1 "Destroy the equipment" requires resourceMin inf 2 (not 3)', () => {
    const opt = card().options.find(o => o.label === 'Destroy the equipment')!
    expect(opt.condition).toEqual({ type: 'resourceMin', resource: 'influence', min: 2 })
  })

  it('opt2 "Speak his name back" gives +1 dread (not +2)', () => {
    const opt = card().options.find(o => o.label === 'Speak his name back')!
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    expect(dread?.delta).toBe(1)
  })
})

describe('nyarlathotep_6 — The Crawling Signal Arrives (CS6)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_6')!

  it('opt "Receive parts of the message" has trimmed flavour text', () => {
    const opt = card().options.find(o => o.label === 'Receive parts of the message')!
    expect(opt.flavourText).toBe('Something was felt but not fully understood. Enough to know what comes next.')
  })

  it('opt "The signal overwhelms you" has trimmed flavour text', () => {
    const opt = card().options.find(o => o.label === 'The signal overwhelms you')!
    expect(opt.flavourText).toBe('The frequency was right. The mind was not ready.')
  })
})

describe('flavour cap compliance — all nyarlathotep cards', () => {
  it('all chain card bodies are ≤108 chars', () => {
    for (const card of GOD_PATH_CHAINS.nyarlathotep) {
      if (card.flavourText) {
        expect(card.flavourText.length).toBeLessThanOrEqual(108)
      }
    }
    if (THE_MOVING_PAINTING.flavourText) {
      expect(THE_MOVING_PAINTING.flavourText.length).toBeLessThanOrEqual(108)
    }
  })

  it('all chain card option flavourTexts are ≤80 chars', () => {
    for (const card of GOD_PATH_CHAINS.nyarlathotep) {
      for (const opt of card.options) {
        if (opt.flavourText) {
          expect(opt.flavourText.length).toBeLessThanOrEqual(80)
        }
      }
    }
    for (const opt of THE_MOVING_PAINTING.options) {
      if (opt.flavourText) {
        expect(opt.flavourText.length).toBeLessThanOrEqual(80)
      }
    }
  })
})
```

- [ ] **Step 2: Run to confirm 7 new tests fail**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run src/data/godPaths/nyarlathotep.test.ts --reporter=verbose 2>&1 | grep -E "FAIL|✓|×"
```

- [ ] **Step 3: Replace nyarlathotep_5 (Radio) card definition**

```ts
{
  // Card 5 — THE SIGNAL BROADENS
  id: 'nyarlathotep_5',
  title: 'The Signal Broadens',
  flavourText: 'The basement radio receives on impossible frequencies. Several followers hum the same sequence.',
  tier: 'god_path',
  godPath: 'nyarlathotep',
  chainStage: 5,
  options: [
    {
      label: 'Tune in',
      flavourText: 'We listened for six hours. It felt like one. We have no memory of most of it.',
      effects: [
        { type: 'resource', resource: 'influence', delta: 2 },
        { type: 'resource', resource: 'dread', delta: 3 },
        { type: 'advanceGodPath' },
        { type: 'seedWhispers', count: 1 },
      ],
      condition: { type: 'godPathStageMin', min: 4 },
    },
    {
      label: 'Destroy the equipment',
      flavourText: 'The humming continued. They started repairing it the next day.',
      effects: [
        { type: 'resource', resource: 'influence', delta: -2 },
        { type: 'resource', resource: 'dread', delta: 2 },
        { type: 'insertCard', cardId: 'nyarlathotep_5', position: 'random', minPos: 7, maxPos: 9 },
      ],
      condition: { type: 'resourceMin', resource: 'influence', min: 2 },
    },
    {
      label: 'Speak his name back',
      flavourText: 'You return the name he gave you. He smiles. Something falls from his sleeve.',
      condition: { type: 'hasPrepTag', tag: 'recited' },
      effects: [
        { type: 'consumePrepTag', tag: 'recited' },
        { type: 'resource', resource: 'dread', delta: 1 },
        { type: 'resource', resource: 'relics', delta: 1 },
        { type: 'advanceGodPath' },
      ],
    },
  ],
},
```

- [ ] **Step 4: Update nyarlathotep_6 (Crawling Signal) — flavour text only on opts 1 and 2**

In nyarlathotep_6, find the option labelled `'Receive parts of the message'` and update its `flavourText`:

```ts
flavourText: 'Something was felt but not fully understood. Enough to know what comes next.',
```

Find the option labelled `'The signal overwhelms you'` and update its `flavourText`:

```ts
flavourText: 'The frequency was right. The mind was not ready.',
```

All other fields on nyarlathotep_6 (conditions, effects, `isSummoning`) remain unchanged.

- [ ] **Step 5: Run full suite**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx vitest run --reporter=verbose 2>&1 | tail -8
```

Expected: 195 pass (188 + 7 new). Zero failures.

- [ ] **Step 6: tsc clean**

```bash
cd "E:/Project Abyssial/Code/project-abyssial" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (zero errors).

- [ ] **Step 7: Commit**

```bash
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/nyarlathotep.ts src/data/godPaths/nyarlathotep.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "feat(P20-C): update Radio (CS5) trims, Crawling Signal flavour, flavour cap tests — P20-C complete"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Chain reorder ✓ | moving_painting reclassification ✓ | loop mechanic (Exhibit opt1 + Lecture opt1) ✓ | existing loops kept (Book opt1, Radio opt1) ✓ | whisper seeding added (Exhibit opt0: 2, opt2: 1; Lecture opt0: 2; Radio opt0: 1) ✓ | whispers removed from Book + Crossroads ✓ | resource trims all 6 cards ✓ | Crawling Signal flavour trims ✓ | flavour cap compliance tested ✓ | structural test fixed ✓
- [x] **Placeholders:** None.
- [x] **Type consistency:** All effects use the same `{ type, resource, delta }` / `{ type, cardId, position, minPos, maxPos }` / `{ type, count }` shapes consistent with existing cards. `hasPrepTag` condition shape `{ type: 'hasPrepTag', tag: string }` consistent with existing tests.
- [x] **Spec note — nyar_4 opt2 flavour:** Spec says "The den's dreamers knew the terms. You renegotiate from there." (62 chars ≤ 80) ✓. Apostrophe uses single-quote string wrapper to avoid escape issues — written above using template literal. Use `"The den's dreamers knew the terms. You renegotiate from there."` with double-outer quotes in the actual file.
- [x] **Spec note — victory thresholds:** The spec explicitly defers nyar_6 victory threshold review to next playtest (P20-D adjacent). Conditions on nyarlathotep_6 opt0 and opt1 are not changed by this plan.
