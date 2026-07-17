# P24-12 Threat/Treat Classification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reclassify 3 threat cards as treats, move 6 treat-tier cards from threats.ts to treats.ts, add a gold +1 bait effect to census_agent "Provide misleading figures", and fix one stale comment.

**Architecture:** Data-only changes — no engine code touched. The engine resolves cards by `tier` field and by ID via `CARD_REGISTRY` (a flat Map in `src/data/index.ts`). File location (threats.ts vs treats.ts) is cosmetic; the registry loads from both arrays. Moving a card between files with its `tier` field correct is safe.

**Tech Stack:** TypeScript, Vitest

## Global Constraints

- Flavour cap: option `flavourText` ≤ 80 chars, card `flavourText` ≤ 108 chars (`tutorial.ts` exempt)
- `randomOutcome`: all branches must use `weight: 1`
- Never edit `knowledge/cards/INDEX.md` or `knowledge/architecture-inventory.md` (hook-owned — git hook regenerates them automatically)
- Test runner: `npx vitest run` from repo root (`C:/Project Abyssial/Code/project-abyssial`)
- Baseline: 245 tests passing — must not regress
- Git: commit each task separately; never push

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/data/cards/threats.ts` | Modify | Remove 6 card objects; fix `scrutiny` comment |
| `src/data/cards/treats.ts` | Modify | Add 6 card objects (3 with tier changed to `'treat'`) |
| `src/data/cards/core.ts` | Modify | Add `gold +1` effect to `the_census_agent` option |
| `src/data/cards/reclassification.test.ts` | Modify | Add assertions for new reclassifications and census_agent bait |

---

## Task 1: Reclassify and move 6 cards (threats.ts → treats.ts)

**Cards being moved:**

| Card ID | Old tier | New tier | Was already a treat? |
|---|---|---|---|
| `wandering_soul` | `threat` | `treat` | No — reclassified |
| `forgers_debt` | `threat` | `treat` | No — reclassified |
| `an_unremarkable_stump` | `threat` | `treat` | No — reclassified |
| `cursed_object` | `treat` | `treat` | Yes — file move only |
| `something_on_the_hook` | `treat` | `treat` | Yes — file move only |
| `grove_awaits` | `treat` | `treat` | Yes — file move only |

**Files:**
- Modify: `src/data/cards/threats.ts`
- Modify: `src/data/cards/treats.ts`
- Modify: `src/data/cards/reclassification.test.ts`

**Interfaces:**
- Produces: `TREAT_CARDS` array (in `treats.ts`) now contains all 6 cards with `tier: 'treat'`
- Produces: `THREAT_CARDS` array (in `threats.ts`) no longer contains any of the 6 cards

---

- [ ] **Step 1: Write failing tests in reclassification.test.ts**

Open `src/data/cards/reclassification.test.ts`. Add a new `describe` block at the bottom of the file (after the existing `describe('tier reclassification (Plan A)', ...)`):

```typescript
import { describe, it, expect } from 'vitest'
import { CORE_CARDS, COMMON_CARDS, TREAT_CARDS, THREAT_CARDS } from '../index'

// ... existing describe block stays unchanged ...

describe('tier reclassification (P24-12 threat→treat)', () => {
  const reclassified = ['wandering_soul', 'forgers_debt', 'an_unremarkable_stump']
  const preExistingTreats = ['cursed_object', 'something_on_the_hook', 'grove_awaits']
  const allMoved = [...reclassified, ...preExistingTreats]

  it('reclassified cards are no longer in THREAT_CARDS', () => {
    for (const id of reclassified) {
      expect(THREAT_CARDS.find(c => c.id === id), `${id} should not be in THREAT_CARDS`).toBeUndefined()
    }
  })

  it('reclassified cards are in TREAT_CARDS with tier "treat"', () => {
    for (const id of reclassified) {
      const card = TREAT_CARDS.find(c => c.id === id)
      expect(card, `${id} should be in TREAT_CARDS`).toBeDefined()
      expect(card!.tier).toBe('treat')
    }
  })

  it('pre-existing treat cards have been moved to TREAT_CARDS', () => {
    for (const id of preExistingTreats) {
      const card = TREAT_CARDS.find(c => c.id === id)
      expect(card, `${id} should be in TREAT_CARDS`).toBeDefined()
      expect(card!.tier).toBe('treat')
    }
  })

  it('all moved cards are absent from THREAT_CARDS', () => {
    for (const id of allMoved) {
      expect(THREAT_CARDS.find(c => c.id === id), `${id} should not be in THREAT_CARDS`).toBeUndefined()
    }
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/data/cards/reclassification.test.ts
```

Expected: new tests FAIL (cards still in THREAT_CARDS). Existing Plan A tests still PASS.

- [ ] **Step 3: Remove 6 card objects from THREAT_CARDS in threats.ts**

Open `src/data/cards/threats.ts`. Find and **delete** the following 6 complete card objects (their full `{ id: '...', ... }` blocks, including the surrounding comment lines):

1. `wandering_soul` — search for `id: 'wandering_soul'`
2. `forgers_debt` — search for `id: 'forgers_debt'`
3. `an_unremarkable_stump` — search for `id: 'an_unremarkable_stump'`
4. `cursed_object` — search for `id: 'cursed_object'`
5. `something_on_the_hook` — search for `id: 'something_on_the_hook'`
6. `grove_awaits` — search for `id: 'grove_awaits'`

Remove each complete object including any `// Inserted by...` comment line immediately above it.

- [ ] **Step 4: Fix the stale scrutiny comment in threats.ts**

Find the `scrutiny` card (search for `id: 'scrutiny'`). Its comment above currently reads:

```typescript
  {
    // Inserted by the_printing_press — "Propaganda run"
    id: 'scrutiny',
```

Change it to:

```typescript
  {
    // Inserted by congregation_meets — "Deliver a sermon"; relic_market — "Send someone after hours"
    id: 'scrutiny',
```

- [ ] **Step 5: Add 6 card objects to TREAT_CARDS in treats.ts**

Open `src/data/cards/treats.ts`. At the bottom of the `TREAT_CARDS` array (before the closing `]`), add a new section:

```typescript
  // ─── P24-12 RECLASSIFIED FROM threats.ts ─────────────────────────────────

  {
    // Reclassified treat (P24-12). Inserted by the_seance — "Let them do it alone".
    id: 'wandering_soul',
    title: 'Wandering Soul',
    flavourText: 'He showed up on a Tuesday. He\'s been sitting on the steps since. What day is it now?',
    tier: 'treat',
    options: [
      {
        label: 'Recruit him',
        flavourText: 'He is glad to have somewhere to be.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'gold', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        label: 'Turn him away',
        flavourText: 'He goes. You watch him go.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
  {
    // Reclassified treat (P24-12). Inserted by the_printing_press — "Forgery work".
    // P20-Q: passive Dread +1/reshuffle removed. Only opt1 unlocks marsh_connection.
    id: 'forgers_debt',
    title: "Forger's Debt",
    flavourText: "Mr. H. Marsh of Innsmouth has received strongly worded correspondence. He's written back. He wants to meet.",
    tier: 'treat',
    options: [
      {
        label: 'Meet him',
        flavourText: 'The meeting is unsettling. His advice is impeccably sourced. He shakes hands twice.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'marsh_connection', position: 'random', minPos: 2, maxPos: 5 },
        ],
      },
      {
        label: 'Ignore him',
        flavourText: "The letters keep arriving. You've found them useful.",
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'forgers_debt', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
    ],
  },
  {
    // Reclassified treat (P24-12). Inserted by woodcutters_report "Buy the map" — dud outcome.
    id: 'an_unremarkable_stump',
    title: 'An Unremarkable Stump',
    flavourText: 'The map was extremely detailed. The grove, however, contains one unremarkable stump and a boot of unknown origin.',
    tier: 'treat',
    options: [
      {
        label: 'Return empty-handed.',
        flavourText: 'You burned the map on the walk back. It burned reluctantly, as though making a point.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
    ],
  },
  {
    // File move only — already tier: 'treat'. Inserted by travelling_merchant — "Buy it"
    // P22-P23-47: reclassified treat. Removed "Contain it" (looping cost opt) and self-reinsertion
    // from "Study it". Now a clean one-shot: study for relic at dread cost, or return it.
    // Closes P21-7 (chain design question — loop removed by design).
    id: 'cursed_object',
    title: 'Cursed Object',
    flavourText: 'It came in a jar. It seemed fine in the jar. It is less fine outside the jar.',
    tier: 'treat',
    options: [
      {
        label: 'Study it',
        flavourText: 'You learn something. The knowledge is not free.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
      },
      {
        label: 'Give it back to the merchant',
        flavourText: 'He takes it back without surprise. He sends something in its place.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -2 },
          { type: 'insertCard', cardId: 'merchant_remembers', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },
    ],
  },
  {
    // File move only — already tier: 'treat'. Inserted by the_harbour — "Ask what he means by 'deep'"
    // P17-17: recategorized as treat — opt1 nets a relic + sets up a chain,
    // opt2 reduces dread; net pickup is positive despite the option costs.
    id: 'something_on_the_hook',
    title: 'Something on the Hook',
    flavourText: 'The net came up full. The thing in the net is not a fish. It is, however, cooperative.',
    tier: 'treat',
    options: [
      {
        label: 'Keep it',
        flavourText: 'It is kept in a tank in the cellar. Others have begun going down to look.',
        effects: [
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'the_thing_in_the_tank', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
      {
        // P21-11: −1 followers removed; +1 influence added.
        label: 'Return it',
        flavourText: 'As it went, it pulled one of ours with it. An effigy floated up in their place.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
      },
    ],
  },
  {
    // File move only — already tier: 'treat'. Inserted by woodcutters_report "Buy the map" — real outcome.
    id: 'grove_awaits',
    title: 'The Grove Awaits',
    flavourText: "The map is accurate. The path is clear. You've been finding reasons not to go.",
    tier: 'treat',
    options: [
      {
        label: 'Send a scouting party',
        flavourText: 'Two followers. The map. Three days.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'randomOutcome', outcomes: [
            {
              weight: 1,
              flavourText: 'The coordinates were correct. Both returned, carrying something. They don\'t speak of what they saw.',
              effects: [
                { type: 'resource', resource: 'gold', delta: 2 },
                { type: 'resource', resource: 'followers', delta: 2 },
              ],
            },
            {
              weight: 1,
              flavourText: 'One returned. He left with an effigy. He didn\'t leave with his colleague.',
              effects: [
                { type: 'resource', resource: 'relics', delta: 1 },
                { type: 'resource', resource: 'followers', delta: 1 },
              ],
            },
            {
              weight: 1,
              flavourText: 'Neither came back. The map did, three days later, on the doorstep.',
              effects: [
                { type: 'resource', resource: 'dread', delta: 2 },
              ],
            },
          ]},
          { type: 'removeCard', cardId: 'grove_awaits' },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
      {
        label: 'Sell map to the relic market',
        flavourText: "The buyer didn't ask where it came from. You didn't ask who else had tried.",
        effects: [
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'removeCard', cardId: 'grove_awaits' },
        ],
      },
    ],
  },
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx vitest run src/data/cards/reclassification.test.ts
```

Expected: all tests in both `describe` blocks PASS.

- [ ] **Step 7: Run full test suite**

```bash
npx vitest run
```

Expected: 245+ tests pass, 0 failures. The new tests add to the count.

- [ ] **Step 8: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/threats.ts src/data/cards/treats.ts src/data/cards/reclassification.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "refactor(cards): P24-12 reclassify 3 threats as treats, move 6 to treats.ts

wandering_soul, forgers_debt, an_unremarkable_stump → tier treat.
cursed_object, something_on_the_hook, grove_awaits file-moved (tier unchanged).
scrutiny comment updated to reflect actual parent cards.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Add gold +1 bait to census_agent "Provide misleading figures"

The option currently inserts `their_suspicion` with no resource gain (bait gap). Adding `gold +1` — you presented tidy, plausible figures, a small win that invites future scrutiny.

**Files:**
- Modify: `src/data/cards/core.ts`
- Modify: `src/data/cards/reclassification.test.ts`

**Interfaces:**
- Produces: `the_census_agent` card's "Provide misleading figures" option has `effects` array containing `{ type: 'resource', resource: 'gold', delta: 1 }` before the `insertCard` effect

---

- [ ] **Step 1: Write failing test**

Open `src/data/cards/reclassification.test.ts`. Add a third `describe` block at the bottom:

```typescript
describe('bait gap fix (P24-12 census_agent)', () => {
  it('"Provide misleading figures" has gold +1 bait effect', () => {
    const censusAgent = CORE_CARDS.find(c => c.id === 'the_census_agent')
    expect(censusAgent, 'the_census_agent should be in CORE_CARDS').toBeDefined()

    const option = censusAgent!.options.find(o => o.label === 'Provide misleading figures')
    expect(option, '"Provide misleading figures" option should exist').toBeDefined()

    const goldEffect = option!.effects.find(
      e => e.type === 'resource' && e.resource === 'gold' && e.delta === 1
    )
    expect(goldEffect, '"Provide misleading figures" should have gold +1 effect').toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/data/cards/reclassification.test.ts
```

Expected: the new bait gap test FAILS. All other tests PASS.

- [ ] **Step 3: Add gold +1 effect to the option in core.ts**

Open `src/data/cards/core.ts`. Find `the_census_agent` (search for `id: 'the_census_agent'`). Find the "Provide misleading figures" option. Its current effects array is:

```typescript
        effects: [
          { type: 'insertCard', cardId: 'their_suspicion', position: 'random', minPos: 3, maxPos: 7 },
        ],
```

Change it to:

```typescript
        effects: [
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'insertCard', cardId: 'their_suspicion', position: 'random', minPos: 3, maxPos: 7 },
        ],
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/data/cards/reclassification.test.ts
```

Expected: all tests in all three `describe` blocks PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: 245+ tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/core.ts src/data/cards/reclassification.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(cards): P24-12 add gold+1 bait to census_agent 'Provide misleading figures'

Closes bait gap — option now gives gold +1 upfront before inserting
their_suspicion. Consistent with deal-with-the-devil bait pattern.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Section 3a (3 reclassifications) → Task 1. Section 3b (census_agent bait) → Task 2. Section 3c (scrutiny comment) → Task 1 Step 4. Section 3d (file moves) → Task 1 Steps 3+5. Section 1+2 (axioms/bait mechanic) → design doc only, no implementation needed.
- [x] **Placeholders:** None. All steps have exact file paths, exact code, exact commands.
- [x] **Type consistency:** `tier: 'treat'` used consistently. `resource: 'gold', delta: 1` matches engine effect schema. `TREAT_CARDS` / `THREAT_CARDS` / `CORE_CARDS` imports match `src/data/index.ts` exports.
- [x] **Test import check:** `reclassification.test.ts` already imports from `'../index'` which exports `TREAT_CARDS`, `THREAT_CARDS`, `CORE_CARDS` — the new `describe` blocks use the same import, no new import line needed.
