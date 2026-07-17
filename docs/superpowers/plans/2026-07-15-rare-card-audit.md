# Rare Card Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update 6 rare cards and 1 threat card to fix agency gaps, power level, and flavour violations per the P25-06 audit spec.

**Architecture:** Pure data changes to `rare.ts` and `threats.ts`. No engine changes. A new test file `rare-audit.test.ts` covers all structural changes, following the established pattern in `core-audit.test.ts`. Four tasks: small patches first, then Diocese, then Clarence, then Artefact + fishermans_return.

**Tech Stack:** TypeScript, Vitest

## Global Constraints

- Option flavour text ≤ 80 chars (D-2026-06-25)
- Card body text ≤ 108 chars (D-2026-06-25)
- `randomOutcome` branches must use `weight: 1` on all outcomes (D-s148-1)
- Never edit `knowledge/cards/INDEX.md` or `knowledge/architecture-inventory.md` — these are hook-owned
- Run `npx vitest run` after every task; all 303+ tests must pass before committing
- Spec: `docs/superpowers/specs/2026-07-15-rare-card-audit-design.md`

---

### Task 1: Simple patches — Merchant Pass, Defector Decline, Academic Doctor

Three single-value effect changes. Create the test file here; it grows with each subsequent task.

**Files:**
- Modify: `src/data/cards/rare.ts`
- Create: `src/data/cards/rare-audit.test.ts`

---

- [ ] **Step 1: Create the test file with three failing tests**

```typescript
// src/data/cards/rare-audit.test.ts
import { describe, it, expect } from 'vitest'
import { RARE_CARDS } from './rare'
import { THREAT_CARDS } from './threats'
import type { Card } from '../../types'

const rareCard = (id: string): Card => {
  const c = RARE_CARDS.find(c => c.id === id)
  if (!c) throw new Error(`Rare card not found: ${id}`)
  return c
}

const threatCard = (id: string): Card => {
  const c = THREAT_CARDS.find(c => c.id === id)
  if (!c) throw new Error(`Threat card not found: ${id}`)
  return c
}

// ─── Task 1: Merchant / Defector / Academic ───────────────────────────────────

describe('P25-06 rare audit — travelling_merchant', () => {
  it('Pass grants +1inf alongside +1dread', () => {
    const card = rareCard('travelling_merchant')
    const pass = card.options.find(o => o.label === 'Pass')!
    expect(pass.effects).toContainEqual({ type: 'resource', resource: 'influence', delta: 1 })
    expect(pass.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: 1 })
  })
})

describe('P25-06 rare audit — the_defector', () => {
  it('Decline grants +1inf and -1dread', () => {
    const card = rareCard('the_defector')
    const decline = card.options.find(o => o.label === 'Decline')!
    expect(decline.effects).toContainEqual({ type: 'resource', resource: 'influence', delta: 1 })
    expect(decline.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: -1 })
  })
})

describe('P25-06 rare audit — dreaming_academic', () => {
  it('Doctor his memory gives -2dread not -1dread', () => {
    const card = rareCard('dreaming_academic')
    const doctor = card.options.find(o => o.label === 'Doctor his memory')!
    expect(doctor.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: -2 })
    expect(doctor.effects).not.toContainEqual({ type: 'resource', resource: 'dread', delta: -1 })
  })
})
```

- [ ] **Step 2: Run tests to confirm 3 failures**

```
npx vitest run src/data/cards/rare-audit.test.ts
```
Expected: 3 failures (`travelling_merchant`, `the_defector`, `dreaming_academic`).

- [ ] **Step 3: Apply three patches to `src/data/cards/rare.ts`**

**travelling_merchant — `Pass` option effects:**
```typescript
// Before
effects: [
  { type: 'resource', resource: 'dread', delta: 1 },
],

// After
effects: [
  { type: 'resource', resource: 'dread', delta: 1 },
  { type: 'resource', resource: 'influence', delta: 1 },
],
```

**the_defector — `Decline` option effects:**
```typescript
// Before
effects: [
  { type: 'resource', resource: 'dread', delta: -1 },
],

// After
effects: [
  { type: 'resource', resource: 'influence', delta: 1 },
  { type: 'resource', resource: 'dread', delta: -1 },
],
```

**dreaming_academic — `Doctor his memory` option, dread effect only:**
```typescript
// Before
{ type: 'resource', resource: 'dread', delta: -1 },

// After
{ type: 'resource', resource: 'dread', delta: -2 },
```

- [ ] **Step 4: Run all tests**

```
npx vitest run
```
Expected: all pass (303+ total), 0 fail.

- [ ] **Step 5: Commit**

```
git add src/data/cards/rare.ts src/data/cards/rare-audit.test.ts
git commit -m "fix(cards): rare audit — merchant pass +inf, defector decline +inf, academic doctor -2dread (P25-06/P25-48)"
```

---

### Task 2: The Diocese Sends Word — opt2 +fol, opt3 → randomOutcome

**Files:**
- Modify: `src/data/cards/rare.ts`
- Modify: `src/data/cards/rare-audit.test.ts`

---

- [ ] **Step 1: Add failing tests — append inside `rare-audit.test.ts` after Task 1 block**

```typescript
// ─── Task 2: Diocese Sends Word ──────────────────────────────────────────────

describe('P25-06 rare audit — the_diocese_sends_word', () => {
  it('Refuse to engage grants +1fol', () => {
    const card = rareCard('the_diocese_sends_word')
    const refuse = card.options.find(o => o.label === 'Refuse to engage')!
    expect(refuse.effects).toContainEqual({ type: 'resource', resource: 'followers', delta: 1 })
  })

  it('Welcome the inquiry openly is a randomOutcome with two weight-1 branches', () => {
    const card = rareCard('the_diocese_sends_word')
    const welcome = card.options.find(o => o.label === 'Welcome the inquiry openly')!
    const ro = welcome.effects.find((e: any) => e.type === 'randomOutcome') as any
    expect(ro).toBeDefined()
    expect(ro.outcomes).toHaveLength(2)
    expect(ro.outcomes[0].weight).toBe(1)
    expect(ro.outcomes[1].weight).toBe(1)
  })

  it('Welcome good outcome: +2inf +1gold -1dread', () => {
    const card = rareCard('the_diocese_sends_word')
    const welcome = card.options.find(o => o.label === 'Welcome the inquiry openly')!
    const ro = welcome.effects.find((e: any) => e.type === 'randomOutcome') as any
    const good = ro.outcomes[0].effects
    expect(good).toContainEqual({ type: 'resource', resource: 'influence', delta: 2 })
    expect(good).toContainEqual({ type: 'resource', resource: 'gold', delta: 1 })
    expect(good).toContainEqual({ type: 'resource', resource: 'dread', delta: -1 })
  })

  it('Welcome bad outcome: -2inf -1gold +1dread, no investigators_file', () => {
    const card = rareCard('the_diocese_sends_word')
    const welcome = card.options.find(o => o.label === 'Welcome the inquiry openly')!
    const ro = welcome.effects.find((e: any) => e.type === 'randomOutcome') as any
    const bad = ro.outcomes[1].effects
    expect(bad).toContainEqual({ type: 'resource', resource: 'influence', delta: -2 })
    expect(bad).toContainEqual({ type: 'resource', resource: 'gold', delta: -1 })
    expect(bad).toContainEqual({ type: 'resource', resource: 'dread', delta: 1 })
    expect(bad.find((e: any) => e.cardId === 'investigators_file')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to confirm 4 new failures**

```
npx vitest run src/data/cards/rare-audit.test.ts
```
Expected: 4 Diocese failures (previous 3 tests still passing).

- [ ] **Step 3: Apply Diocese changes in `src/data/cards/rare.ts`**

**`Refuse to engage` — add +1fol to effects:**
```typescript
// Before
{
  label: 'Refuse to engage',
  flavourText: 'The letter goes back unopened. They stop writing.',
  effects: [
    { type: 'resource', resource: 'influence', delta: -1 },
    { type: 'resource', resource: 'dread', delta: -1 },
  ],
},

// After
{
  label: 'Refuse to engage',
  flavourText: 'The letter goes back unopened. They stop writing.',
  effects: [
    { type: 'resource', resource: 'influence', delta: -1 },
    { type: 'resource', resource: 'dread', delta: -1 },
    { type: 'resource', resource: 'followers', delta: 1 },
  ],
},
```

**`Welcome the inquiry openly` — replace entire effects array:**
```typescript
// Before
{
  label: 'Welcome the inquiry openly',
  flavourText: 'The bishop sends a clerk. He asks for membership records. We have a version.',
  effects: [
    { type: 'resource', resource: 'influence', delta: 2 },
    { type: 'resource', resource: 'dread', delta: 2 },
    { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 5, maxPos: 9 },
  ],
},

// After
{
  label: 'Welcome the inquiry openly',
  flavourText: 'The bishop sends a clerk. He asks for membership records. We have a version.',
  effects: [
    { type: 'randomOutcome', outcomes: [
      {
        weight: 1,
        flavourText: 'The clerk seemed satisfied. The donations that week were difficult to trace.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
      {
        weight: 1,
        flavourText: 'He asked for seven years of records. Three of those years were creative.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ]},
  ],
},
```

- [ ] **Step 4: Run all tests**

```
npx vitest run
```
Expected: all pass, 0 fail.

- [ ] **Step 5: Commit**

```
git add src/data/cards/rare.ts src/data/cards/rare-audit.test.ts
git commit -m "fix(cards): diocese sends word — opt2 +fol, opt3 randomOutcome bluff (P25-06)"
```

---

### Task 3: Clarence — opt1 −2inf, opt3 free self-reinsert

**Files:**
- Modify: `src/data/cards/rare.ts`
- Modify: `src/data/cards/rare-audit.test.ts`

---

- [ ] **Step 1: Add failing tests — append after Task 2 block in `rare-audit.test.ts`**

```typescript
// ─── Task 3: Clarence ────────────────────────────────────────────────────────

describe('P25-06/P25-53 rare audit — clarence', () => {
  it('Have him handle it costs -2inf not -3inf', () => {
    const card = rareCard('clarence')
    const handle = card.options.find(o => o.label === 'Have him handle it')!
    expect(handle.effects).toContainEqual({ type: 'resource', resource: 'influence', delta: -2 })
    expect(handle.effects).not.toContainEqual({ type: 'resource', resource: 'influence', delta: -3 })
  })

  it('Have him handle it requires inf≥2 not inf≥3', () => {
    const card = rareCard('clarence')
    const handle = card.options.find(o => o.label === 'Have him handle it')!
    expect(handle.condition).toEqual({ type: 'resourceMin', resource: 'influence', min: 2 })
  })

  it('Not yet has no dread cost', () => {
    const card = rareCard('clarence')
    const notYet = card.options.find(o => o.label === 'Not yet')!
    expect(notYet.effects).not.toContainEqual({ type: 'resource', resource: 'dread', delta: 1 })
  })

  it('Not yet reinserts clarence at pos 4-7', () => {
    const card = rareCard('clarence')
    const notYet = card.options.find(o => o.label === 'Not yet')!
    expect(notYet.effects).toContainEqual({ type: 'removeCard', cardId: 'clarence' })
    expect(notYet.effects).toContainEqual({
      type: 'insertCard',
      cardId: 'clarence',
      position: 'random',
      minPos: 4,
      maxPos: 7,
    })
  })

  it('Not yet flavour text is within 80 char cap', () => {
    const card = rareCard('clarence')
    const notYet = card.options.find(o => o.label === 'Not yet')!
    expect(notYet.flavourText.length).toBeLessThanOrEqual(80)
  })
})
```

- [ ] **Step 2: Run to confirm 5 new failures**

```
npx vitest run src/data/cards/rare-audit.test.ts
```
Expected: 5 Clarence failures.

- [ ] **Step 3: Apply Clarence changes in `src/data/cards/rare.ts`**

**`Have him handle it` — update condition and inf delta:**
```typescript
// Before
{
  label: 'Have him handle it',
  flavourText: 'He handles it. You do not ask how. You will not ask.',
  hideWhenUnavailable: true,
  condition: { type: 'resourceMin', resource: 'influence', min: 3 },
  effects: [
    { type: 'resource', resource: 'influence', delta: -3 },
    { type: 'removeRandomThreat' },
    { type: 'removeCard', cardId: 'clarence' },
  ],
},

// After
{
  label: 'Have him handle it',
  flavourText: 'He handles it. You do not ask how. You will not ask.',
  hideWhenUnavailable: true,
  condition: { type: 'resourceMin', resource: 'influence', min: 2 },
  effects: [
    { type: 'resource', resource: 'influence', delta: -2 },
    { type: 'removeRandomThreat' },
    { type: 'removeCard', cardId: 'clarence' },
  ],
},
```

**`Not yet` — replace flavourText and full effects array:**
```typescript
// Before
{
  label: 'Not yet',
  flavourText: 'He waits. He is very good at waiting. The arrangement costs you something even in silence.',
  effects: [
    { type: 'resource', resource: 'dread', delta: 1 },
  ],
},

// After
{
  label: 'Not yet',
  flavourText: 'He waits. He is very good at waiting.',
  effects: [
    { type: 'removeCard', cardId: 'clarence' },
    { type: 'insertCard', cardId: 'clarence', position: 'random', minPos: 4, maxPos: 7 },
  ],
},
```

- [ ] **Step 4: Run all tests**

```
npx vitest run
```
Expected: all pass, 0 fail.

- [ ] **Step 5: Commit**

```
git add src/data/cards/rare.ts src/data/cards/rare-audit.test.ts
git commit -m "fix(cards): clarence — opt1 -2inf, Not Yet free self-reinsert (P25-53)"
```

---

### Task 4: Artefact from the Deep + fishermans_return

**Files:**
- Modify: `src/data/cards/rare.ts`
- Modify: `src/data/cards/threats.ts`
- Modify: `src/data/cards/rare-audit.test.ts`

---

- [ ] **Step 1: Add failing tests — append after Task 3 block in `rare-audit.test.ts`**

```typescript
// ─── Task 4: Artefact + fishermans_return ────────────────────────────────────

describe('P25-06 rare audit — artefact_from_deep', () => {
  it('body text is within 108 char cap', () => {
    const card = rareCard('artefact_from_deep')
    expect(card.flavourText.length).toBeLessThanOrEqual(108)
  })

  it('"Keep it" option exists; "Take it" does not', () => {
    const card = rareCard('artefact_from_deep')
    expect(card.options.find(o => o.label === 'Keep it')).toBeDefined()
    expect(card.options.find(o => o.label === 'Take it')).toBeUndefined()
  })

  it('"Keep it" flavour text is within 80 char cap', () => {
    const card = rareCard('artefact_from_deep')
    const keep = card.options.find(o => o.label === 'Keep it')!
    expect(keep.flavourText.length).toBeLessThanOrEqual(80)
  })

  it('"Keep it" grants +2relics not +1', () => {
    const card = rareCard('artefact_from_deep')
    const keep = card.options.find(o => o.label === 'Keep it')!
    expect(keep.effects).toContainEqual({ type: 'resource', resource: 'relics', delta: 2 })
    expect(keep.effects).not.toContainEqual({ type: 'resource', resource: 'relics', delta: 1 })
  })
})

describe('P25-06 rare audit — fishermans_return', () => {
  it('"Return the artefact" flavour clarifies only one relic is taken back', () => {
    const card = threatCard('fishermans_return')
    const ret = card.options.find(o => o.label === 'Return the artefact')!
    expect(ret.flavourText).toContain('one')
  })
})
```

- [ ] **Step 2: Run to confirm 5 new failures**

```
npx vitest run src/data/cards/rare-audit.test.ts
```
Expected: 5 Artefact/fishermans_return failures.

- [ ] **Step 3: Apply artefact_from_deep changes in `src/data/cards/rare.ts`**

Replace the entire `artefact_from_deep` card object's `flavourText`, first option `label`, first option `flavourText`, and first option `relics` delta:

```typescript
// Before
{
  id: 'artefact_from_deep',
  title: 'The Artefact from the Deep',
  flavourText: 'A fisherman sold it this morning for eight shillings and a meat pie. It sits on the table now. He should have asked for double.',
  tier: 'rare',
  options: [
    {
      label: 'Take it',
      flavourText: 'It is warm to the touch. A low whisper follows it. Neither of these things is remarkable at this point.',
      effects: [
        { type: 'resource', resource: 'relics', delta: 1 },
        { type: 'resource', resource: 'dread', delta: 2 },
        { type: 'insertCard', cardId: 'fishermans_return', position: 'random', minPos: 5, maxPos: 9 },
      ],
    },

// After
{
  id: 'artefact_from_deep',
  title: 'The Artefact from the Deep',
  flavourText: 'A fisherman sold it for eight shillings this morning. It sits on the table. He should have asked for more.',
  tier: 'rare',
  options: [
    {
      label: 'Keep it',
      flavourText: 'Warm to the touch. A low sound follows it wherever it sits.',
      effects: [
        { type: 'resource', resource: 'relics', delta: 2 },
        { type: 'resource', resource: 'dread', delta: 2 },
        { type: 'insertCard', cardId: 'fishermans_return', position: 'random', minPos: 5, maxPos: 9 },
      ],
    },
```

Leave the `Put it back in the waves` option entirely untouched.

- [ ] **Step 4: Apply fishermans_return change in `src/data/cards/threats.ts`**

Find `id: 'fishermans_return'` → `Return the artefact` option → update `flavourText` only:

```typescript
// Before
flavourText: 'He takes it. He does not thank you. He leaves.',

// After
flavourText: "He takes one. He didn't count them when he sold it. You don't correct him.",
```

- [ ] **Step 5: Run all tests**

```
npx vitest run
```
Expected: all pass, 0 fail.

- [ ] **Step 6: Commit**

```
git add src/data/cards/rare.ts src/data/cards/threats.ts src/data/cards/rare-audit.test.ts
git commit -m "fix(cards): artefact from deep +2relics, label/flavour rewrite; fishermans_return flavour (P25-06)"
```

---

## Self-Review

**Spec coverage:**
- Diocese opt2 +fol ✓ Task 2
- Diocese opt3 randomOutcome ✓ Task 2
- Clarence opt1 −2inf + condition −2 ✓ Task 3
- Clarence opt3 free self-reinsert ✓ Task 3
- Clarence "Not yet" flavour cap violation fixed ✓ Task 3
- Merchant Pass +1inf ✓ Task 1
- Artefact +2relics + body/flavour rewrite + char caps ✓ Task 4
- fishermans_return "one" clarification ✓ Task 4
- Defector Decline +1inf ✓ Task 1
- Academic Doctor −2dread ✓ Task 1
- P25-48 closed ✓ Task 1
- P25-53 closed ✓ Task 3

**Placeholder scan:** None.

**Type consistency:** `removeCard`, `insertCard`, `randomOutcome`, `resource` effect shapes match existing usage throughout `rare.ts`. `removeRandomThreat` on Clarence opt1 left untouched (no type change).
