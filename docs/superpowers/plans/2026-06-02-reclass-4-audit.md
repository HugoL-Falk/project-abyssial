# Reclass-4 Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit and fix the Rare, Threat, and Unravelling card tiers — adding a new Treat tier, enforcing net-negative on threats, applying P10-31 stall fixes, and redesigning unravelling escalation.

**Architecture:** Pure data edits across five card data files and one types file. No engine changes, no new card IDs beyond the new treats.ts file. Build validation only — `npm run build` after each task.

**Tech Stack:** TypeScript card data. Vite build (`npm run build`). All paths relative to `E:\Project Abyssial\Code\project-abyssial`.

**Spec:** `docs/superpowers/specs/2026-06-02-reclass-4-design.md`

---

## File Structure

| File | Change |
|---|---|
| `src/types/index.ts` | Add `'treat'` to `CardTier` union (line 13) |
| `src/data/cards/treats.ts` | **New file** — 5 cards moved from threats.ts |
| `src/data/cards/threats.ts` | Remove 5 treat cards + 9 option edits (net-negative + P10-31) |
| `src/data/cards/rare.ts` | randomOutcome on 2 cards |
| `src/data/cards/unravelling.ts` | 7 option edits across tiers 1–4 |
| `src/data/index.ts` | Import/export TREAT_CARDS; add to ALL_CARDS registry |

---

## Task 1: Add 'treat' to CardTier type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Edit CardTier**

Find line 13:
```typescript
export type CardTier = 'core' | 'common' | 'rare' | 'threat' | 'god_path' | 'doom' | 'passive' | 'tutorial'
```

Replace with:
```typescript
export type CardTier = 'core' | 'common' | 'rare' | 'treat' | 'threat' | 'god_path' | 'doom' | 'passive' | 'tutorial'
```

- [ ] **Step 2: Build to verify**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "types: add treat to CardTier union"
```

---

## Task 2: Create treats.ts and wire into index.ts

**Files:**
- Create: `src/data/cards/treats.ts`
- Modify: `src/data/index.ts`

Read `src/data/cards/threats.ts` before editing — you will need to remove 5 card blocks from it after creating treats.ts.

- [ ] **Step 1: Create src/data/cards/treats.ts**

Create the file with the following content:

```typescript
import type { Card } from '../../types'

export const TREAT_CARDS: Card[] = [
  // ─── ONE-SHOT TREATS ──────────────────────────────────────────────────────────

  {
    // Inserted by the_opium_den — "Acquire it".
    // Surfaces the next god path chain card to position 0 (next draw).
    id: 'the_dreamer',
    title: 'The Dreamer',
    flavourText: "One of your followers has started dreaming in a language that hasn't been spoken in four thousand years. On the bright side, they're translating.",
    tier: 'treat',
    options: [
      {
        label: 'Draw on the knowledge',
        flavourText: 'The translation is incomplete. It is enough.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'surfaceChainCard', minPos: 0, maxPos: 0 },
          { type: 'removeCard', cardId: 'the_dreamer' },
        ],
      },
      {
        label: 'Set it aside',
        flavourText: "The language resists translation. You leave the notes on the desk. They're still there in the morning.",
        effects: [
          { type: 'resource', resource: 'gold',      delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'removeCard', cardId: 'the_dreamer' },
        ],
      },
    ],
  },
  {
    // Inserted by academic_society — "Attend as a civilian"
    // Entry path currently stranded — see backlog: card balancing / threat chains session.
    id: 'a_useful_contact',
    title: 'A Useful Contact',
    flavourText: 'He knows people. You know people. Neither of you says who.',
    tier: 'treat',
    options: [
      {
        label: 'Request influence',
        flavourText: 'He makes a call. A door opens.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'removeCard', cardId: 'a_useful_contact' },
        ],
      },
      {
        label: 'Request funds',
        flavourText: 'An envelope, unmarked, delivered the next morning.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'removeCard', cardId: 'a_useful_contact' },
        ],
      },
      {
        label: 'Have a file buried',
        flavourText: 'The file is misfiled. In a drawer. In a filing cabinet. In a warehouse.',
        effects: [
          { type: 'removeCard', cardId: 'investigators_file' },
          { type: 'removeCard', cardId: 'a_useful_contact' },
        ],
      },
    ],
  },
  {
    // Inserted by cursed_object — "Give it back to the merchant"
    id: 'merchant_remembers',
    title: 'The Merchant Remembers',
    flavourText: 'He returned the jar to wherever jars like that come from. He has sent something else instead. Something without a jar.',
    tier: 'treat',
    options: [
      {
        label: 'Accept what he sent',
        flavourText: 'It is, in its way, useful.',
        effects: [
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'removeCard', cardId: 'merchant_remembers' },
        ],
      },
      {
        label: 'Send it back again',
        flavourText: 'He will send something else. He always has something else.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'removeCard', cardId: 'merchant_remembers' },
        ],
      },
    ],
  },

  // ─── PASSIVE TREATS ────────────────────────────────────────────────────────────

  {
    // Inserted by dreaming_academic — "Bring him in".
    // Positive passive: Relics +1/reshuffle.
    id: 'his_research_notes',
    title: 'His Research Notes',
    flavourText: 'Forty years of work. Impeccable sourcing. Absolutely no conclusions drawn, because drawing the conclusion would require accepting what the evidence means.',
    tier: 'treat',
    passive: {
      trigger: 'reshuffle',
      effects: [
        { type: 'resource', resource: 'relics', delta: 1 },
      ],
    },
    onDraw: [
      { type: 'resource', resource: 'dread', delta: 1 },
    ],
    options: [
      {
        label: 'Consult the notes',
        flavourText: 'The work continues. So does the benefit.',
        effects: [],
      },
    ],
  },
  {
    // Inserted by forgers_debt — "Meet him".
    // Positive passive: 40% chance Gold +1 or Relic +1 per reshuffle.
    // Weights: 1 Gold +1 / 1 Relic +1 / 3 nothing  ->  20% / 20% / 60%.
    id: 'marsh_connection',
    title: 'The Marsh Connection',
    flavourText: 'He writes monthly now. The letters smell of brine, but the advice is excellent.',
    tier: 'treat',
    passive: {
      trigger: 'reshuffle',
      effects: [
        { type: 'randomOutcome', outcomes: [
          { weight: 1, effects: [{ type: 'resource', resource: 'gold',   delta: 1 }] },
          { weight: 1, effects: [{ type: 'resource', resource: 'relics', delta: 1 }] },
          { weight: 3, effects: [] },
        ]},
      ],
    },
    onDraw: [
      { type: 'resource', resource: 'dread', delta: 1 },
    ],
    options: [
      {
        label: 'Read the letter',
        flavourText: 'The advice is excellent. The postscript is concerning.',
        effects: [],
      },
    ],
  },
]
```

- [ ] **Step 2: Remove the 5 treat cards from threats.ts**

Read `src/data/cards/threats.ts` first. Find and remove the following five card blocks **including their preceding comments**:

**Block 1 — remove the entire "POSITIVE INSERTED CARDS" section** (the_dreamer, a_useful_contact, his_research_notes and the section header comment):

Find:
```typescript
  // ─── POSITIVE INSERTED CARDS ───────────────────────────────────────────────────
  {
    // Inserted by the_opium_den — "Acquire it".
```

Remove from that comment all the way through the closing `},` of `his_research_notes` (the last card in that section, ending with `},` after the `'Consult the notes'` option).

**Block 2 — remove merchant_remembers** from the INSERTED THREATS section:

Find and remove:
```typescript
  {
    // Inserted by cursed_object — "Give it back to the merchant"
    id: 'merchant_remembers',
```
...through its closing `},`.

**Block 3 — remove marsh_connection** from the THREAT CHAINS section:

Find and remove:
```typescript
  {
    // Inserted by forgers_debt — "Meet him".
    // Positive passive: 40% chance Gold +1 or Relic +1 per reshuffle (vault spec).
    // Weights: 1 Gold +1 / 1 Relic +1 / 3 nothing  ->  20% / 20% / 60%.
    id: 'marsh_connection',
```
...through its closing `},`.

- [ ] **Step 3: Update src/data/index.ts**

Add import after the existing THREAT_CARDS import line:
```typescript
import { TREAT_CARDS } from './cards/treats'
```

Add to the export line (after `THREAT_CARDS`):
```typescript
export { CORE_CARDS, COMMON_CARDS, RARE_CARDS, DARK_YOUNG_GUARDIAN, SPECIAL_CARDS, TREAT_CARDS, THREAT_CARDS, UNRAVELLING_CARDS, getUnravellingCard }
```

Add `...TREAT_CARDS,` to the ALL_CARDS array, after `...SPECIAL_CARDS,`:
```typescript
  ...SPECIAL_CARDS,
  ...TREAT_CARDS,
  ...THREAT_CARDS,
```

- [ ] **Step 4: Build to verify**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run build
```

Expected: 0 TypeScript errors. If you see `Type '"treat"' is not assignable to type 'CardTier'`, Task 1 was not completed — go back and add 'treat' to the union.

- [ ] **Step 5: Commit**

```bash
git add src/data/cards/treats.ts src/data/cards/threats.ts src/data/index.ts
git commit -m "data: introduce treat tier — move 5 positive inserted cards from threats.ts"
```

---

## Task 3: Rare tier — the_defector randomOutcome

**Files:**
- Modify: `src/data/cards/rare.ts`

Read `src/data/cards/rare.ts` before editing.

- [ ] **Step 1: Replace "Take her in" option on the_defector**

Find:
```typescript
      {
        label: 'Take her in',
        flavourText: 'The ledger is extraordinary. The grudge is professional-grade. She has brought two others with her. Their penmanship is also terrible.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'their_former_associates', position: 'random', minPos: 4, maxPos: 8 },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Take her in',
        flavourText: 'You make tea. She opens the ledger to a specific page without being asked. Her expression while you read is carefully neutral.',
        effects: [
          { type: 'randomOutcome', outcomes: [
            {
              weight: 7,
              effects: [
                { type: 'resource', resource: 'influence', delta: 2 },
                { type: 'resource', resource: 'followers', delta: 2 },
                { type: 'resource', resource: 'dread', delta: 2 },
                { type: 'insertCard', cardId: 'their_former_associates', position: 'random', minPos: 4, maxPos: 8 },
              ],
            },
            {
              weight: 3,
              effects: [
                { type: 'resource', resource: 'influence', delta: -2 },
                { type: 'resource', resource: 'followers', delta: -1 },
                { type: 'insertCard', cardId: 'investigators_file', position: 'discard' },
              ],
            },
          ]},
        ],
      },
```

- [ ] **Step 2: Build to verify**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/cards/rare.ts
git commit -m "data: the_defector — add randomOutcome to Take her in (70/30 genuine/plant)"
```

---

## Task 4: Rare tier — dreaming_academic randomOutcome

**Files:**
- Modify: `src/data/cards/rare.ts`

- [ ] **Step 1: Replace "Bring him in" option on dreaming_academic**

Find:
```typescript
      {
        label: 'Bring him in',
        flavourText: 'He is delighted to have an audience who understands the significance. You are delighted for different reasons.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'his_research_notes', position: 'random', minPos: 2, maxPos: 5 },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Bring him in',
        flavourText: 'He arrives at the requested time. The research notes come with him. Whether this is useful or dangerous will become clear shortly.',
        effects: [
          { type: 'randomOutcome', outcomes: [
            {
              weight: 65,
              effects: [
                { type: 'resource', resource: 'followers', delta: 1 },
                { type: 'resource', resource: 'influence', delta: 2 },
                { type: 'resource', resource: 'dread', delta: 2 },
                { type: 'insertCard', cardId: 'his_research_notes', position: 'random', minPos: 2, maxPos: 5 },
              ],
            },
            {
              weight: 35,
              effects: [
                { type: 'resource', resource: 'followers', delta: 1 },
                { type: 'resource', resource: 'dread', delta: 4 },
                { type: 'insertCard', cardId: 'investigators_file', position: 'discard' },
              ],
            },
          ]},
        ],
      },
```

- [ ] **Step 2: Build to verify**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/cards/rare.ts
git commit -m "data: dreaming_academic — add randomOutcome to Bring him in (65/35 useful/noticed)"
```

---

## Task 5: Threat tier — net-negative fixes

**Files:**
- Modify: `src/data/cards/threats.ts`

Six options across five cards. Read `src/data/cards/threats.ts` before editing.

- [ ] **Step 1: something_came_to_the_door — "Open the door"**

Find:
```typescript
      {
        label: 'Open the door',
        flavourText: 'It gave us something. We are not certain what we gave in return. The door has been left open since.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'removeCard', cardId: 'something_came_to_the_door' },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Open the door',
        flavourText: 'We are not certain what we gave in return. The door has been left open since.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'removeCard', cardId: 'something_came_to_the_door' },
        ],
      },
```

- [ ] **Step 2: something_came_to_the_door — "Send someone else to answer"**

Find:
```typescript
      {
        label: 'Send someone else to answer',
        flavourText: 'They came back. They were fine. They are not fine.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'resource', resource: 'influence', delta: 3 },
          { type: 'removeCard', cardId: 'something_came_to_the_door' },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
```

Replace with:
```typescript
      {
        label: 'Send someone else to answer',
        flavourText: 'They came back. They were fine. They are not fine.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'removeCard', cardId: 'something_came_to_the_door' },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
```

- [ ] **Step 3: political_debt — "Pay it early"**

Find:
```typescript
      {
        label: 'Pay it early',
        flavourText: 'Pre-emptive generosity. He is satisfied. For now.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'removeCard', cardId: 'political_debt' },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
```

Replace with:
```typescript
      {
        label: 'Pay it early',
        flavourText: 'Pre-emptive generosity. He is satisfied. For now.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'removeCard', cardId: 'political_debt' },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
```

- [ ] **Step 4: desperate_congregation — "Reveal something true"**

Find:
```typescript
      {
        label: 'Reveal something true',
        flavourText: 'They came for bread. They leave with something they cannot name.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'removeCard', cardId: 'desperate_congregation' },
        ],
        condition: { type: 'resourceMin', resource: 'dread', min: 5 },
      },
```

Replace with:
```typescript
      {
        label: 'Reveal something true',
        flavourText: 'They came for bread. They leave with something they cannot name.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'removeCard', cardId: 'desperate_congregation' },
        ],
        condition: { type: 'resourceMin', resource: 'dread', min: 5 },
      },
```

- [ ] **Step 5: public_scrutiny — "Reframe entirely"**

Find:
```typescript
      {
        label: 'Reframe entirely',
        flavourText: 'The narrative inverts. The paper prints a correction. Nobody reads corrections.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'removeCard', cardId: 'public_scrutiny' },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 7 },
      },
```

Replace with:
```typescript
      {
        label: 'Reframe entirely',
        flavourText: 'The narrative inverts. The paper prints a correction. Nobody reads corrections.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'removeCard', cardId: 'public_scrutiny' },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 7 },
      },
```

- [ ] **Step 6: terms_remain — "Open it"**

Find:
```typescript
      {
        label: 'Open it',
        flavourText: 'The terms were unchanged. We had not expected them to be. The path is still open.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'yha_nthlei_4', position: 'random', minPos: 2, maxPos: 4 },
          { type: 'removeCard', cardId: 'terms_remain' },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Open it',
        flavourText: 'The terms were unchanged. We had not expected them to be. Reading them a second time cost more than the first. The path is still open.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'insertCard', cardId: 'yha_nthlei_4', position: 'random', minPos: 2, maxPos: 4 },
          { type: 'removeCard', cardId: 'terms_remain' },
        ],
      },
```

- [ ] **Step 7: Build to verify**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/data/cards/threats.ts
git commit -m "data: threat tier net-negative fixes — 6 options across 5 cards"
```

---

## Task 6: Threat tier — P10-31 stall fixes

**Files:**
- Modify: `src/data/cards/threats.ts`

Four options across three cards. Stall options now either resolve (removeCard) or explicitly re-insert — no more silent lingering.

- [ ] **Step 1: the_newspaper_article — "Issue a denial" (add removeCard)**

Find:
```typescript
      {
        label: 'Issue a denial',
        flavourText: 'The denial is believed by no one relevant. It reduces the spread marginally.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
```

Replace with:
```typescript
      {
        label: 'Issue a denial',
        flavourText: 'The denial is believed by no one relevant. It reduces the spread marginally.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'removeCard', cardId: 'the_newspaper_article' },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
```

- [ ] **Step 2: the_newspaper_article — "Ignore it" (add explicit re-insert)**

Find:
```typescript
      {
        label: 'Ignore it',
        flavourText: 'The article is read. Filed. Referenced.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Ignore it',
        flavourText: 'The article is read. Filed. Referenced.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'the_newspaper_article', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
```

- [ ] **Step 3: missing_persons — "Claim ignorance" (add explicit re-insert)**

Find:
```typescript
      {
        label: 'Claim ignorance',
        flavourText: 'The claim is noted. The investigation widens.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Claim ignorance',
        flavourText: 'The claim is noted. The investigation widens.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'missing_persons', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
```

- [ ] **Step 4: arson_inspector — "Obstruct the investigation" (add explicit re-insert)**

Find:
```typescript
      {
        label: 'Obstruct the investigation',
        flavourText: 'This slows him. It does not stop him. He makes a note.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
```

Replace with:
```typescript
      {
        label: 'Obstruct the investigation',
        flavourText: 'This slows him. It does not stop him. He makes a note.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'arson_inspector', position: 'random', minPos: 5, maxPos: 8 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
```

- [ ] **Step 5: Build to verify**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/data/cards/threats.ts
git commit -m "data: P10-31 stall fixes — explicit re-insert or removeCard on 4 lingering options"
```

---

## Task 7: Unravelling tier — escalation redesign

**Files:**
- Modify: `src/data/cards/unravelling.ts`

Seven option edits across tiers 1–4. Tier 5 is unchanged. Read `src/data/cards/unravelling.ts` before editing.

- [ ] **Step 1: Tier 1 — "Let it pass" (add Dread+1 cost)**

Find:
```typescript
      {
        label: 'Let it pass',
        flavourText: 'It passes. It leaves something behind.',
        effects: [
          { type: 'insertCard', cardId: 'revelation', position: 'random', minPos: 5, maxPos: 10 },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Let it pass',
        flavourText: 'It passes. It leaves something behind.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'revelation', position: 'random', minPos: 5, maxPos: 10 },
        ],
      },
```

- [ ] **Step 2: Tier 2 — "Reassure the congregation" (Inf-1/Dread+1 → Inf-2/Dread+2)**

Find:
```typescript
      {
        label: 'Reassure the congregation',
        flavourText: 'They accept the reassurance. They stop measuring. The walls remain incorrect.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 1 },
      },
```

Replace with:
```typescript
      {
        label: 'Reassure the congregation',
        flavourText: 'They accept the reassurance. They stop measuring. The walls remain incorrect.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
```

- [ ] **Step 3: Tier 2 — "Let them measure" (fix net-positive Fol gain)**

Find:
```typescript
      {
        label: 'Let them measure',
        flavourText: 'The results are distributed. Several leave. A different group arrives.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'insertCard', cardId: 'revelation', position: 'random', minPos: 3, maxPos: 7 },
          { type: 'removeCard', cardId: 'unravelling_2' },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Let them measure',
        flavourText: 'The results are distributed. Several leave. A different group arrives, but fewer than left.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'insertCard', cardId: 'revelation', position: 'random', minPos: 3, maxPos: 7 },
          { type: 'removeCard', cardId: 'unravelling_2' },
        ],
      },
```

- [ ] **Step 4: Tier 3 — "Claim it as prophecy" (fix net-positive Inf gain)**

Find:
```typescript
      {
        label: 'Claim it as prophecy',
        flavourText: 'The congregation receives this well. Too well.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Claim it as prophecy',
        flavourText: 'Some receive this as confirmation. Others stop attending. The silence has a name now, and the name is worse than the silence was.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
        ],
      },
```

- [ ] **Step 5: Tier 3 — "Deny it" (harden for tier 3)**

Find:
```typescript
      {
        label: 'Deny it',
        flavourText: 'The denial is not believed. It reduces the volume, at least.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Deny it',
        flavourText: 'The denial is not believed. It reduces the volume. Your credibility takes the rest of the weight.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
```

- [ ] **Step 6: Tier 4 — "Embrace the change" (Fol-1 → Fol-2, add Dread+2)**

Find:
```typescript
      {
        label: 'Embrace the change',
        flavourText: 'The changed are loyal. They are also changed.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 2, maxPos: 5 },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Embrace the change',
        flavourText: 'Two of them changed overnight. The changed are loyal. You watch the others watch them. Nobody says anything.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 2, maxPos: 5 },
        ],
      },
```

- [ ] **Step 7: Tier 4 — "Purge the affected" (Fol-3/Dread-2 → Fol-4/Dread+1)**

Find:
```typescript
      {
        label: 'Purge the affected',
        flavourText: 'Painful. Effective. Temporary.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -3 },
          { type: 'resource', resource: 'dread', delta: -2 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 3 },
      },
```

Replace with:
```typescript
      {
        label: 'Purge the affected',
        flavourText: 'Four gone. The remaining congregation watched it happen. The room is smaller and quieter. So are they.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -4 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 4 },
      },
```

- [ ] **Step 8: Build to verify**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add src/data/cards/unravelling.ts
git commit -m "data: unravelling tiers 1-4 — escalating severity redesign + fix tier 3 net-positive"
```

---

## Final Verification

- [ ] **Confirm treat tier is wired into CARD_REGISTRY**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && grep -n "TREAT_CARDS" src/data/index.ts
```

Expected: import line, export line, and `...TREAT_CARDS,` in ALL_CARDS.

- [ ] **Confirm no treat cards remain in threats.ts**

```bash
grep "the_dreamer\|a_useful_contact\|merchant_remembers\|his_research_notes\|marsh_connection" "src/data/cards/threats.ts"
```

Expected: 0 matches (all moved to treats.ts).

- [ ] **Confirm CardTier includes treat**

```bash
grep "CardTier" src/types/index.ts
```

Expected: `'treat'` present in the union.

- [ ] **Final build**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run build
```

Expected: 0 errors, clean build.
