# Dread Economy Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce unjustified dread pressure on core cards, add dread-relief paths to under-served options, fix a P13-23 legibility bug on The Veil Thins, and add one new treat card.

**Architecture:** Pure card data changes across three files. No engine changes required. New treat card (`the_ordinary_pie`) must be added before it is referenced by `congregation_meets`.

**Tech Stack:** TypeScript, Vite. No test framework — verification via `npm run typecheck` (tsc --noEmit) and `npm run build`.

---

## File Map

| File | What changes |
|---|---|
| `src/data/cards/treats.ts` | Add `the_ordinary_pie` card |
| `src/data/cards/core.ts` | 5 option edits across 4 cards |
| `src/data/cards/unravelling.ts` | Remove onDraw, fix 2 option effects on `unravelling_1` |

---

## Task 1: Add `the_ordinary_pie` to treats.ts

**Files:**
- Modify: `src/data/cards/treats.ts`

This card must exist before Task 2, because `congregation_meets` "Dismiss early" will insert it by id.

- [ ] **Step 1: Read the file to understand insertion point**

Open `src/data/cards/treats.ts`. Cards are listed in the `TREAT_CARDS` array. Add the new card at the **end** of the array, before the closing `]`.

- [ ] **Step 2: Add the card**

Append this object as the last entry in `TREAT_CARDS`:

```ts
  {
    // Inserted by congregation_meets — "Dismiss early"
    id: 'the_ordinary_pie',
    title: 'The Ordinary Pie',
    flavourText: 'A pie arrived this morning. Left on the step. The filling has an unusual colour.',
    tier: 'treat',
    options: [
      {
        label: 'Share it round',
        flavourText: 'Everyone ate. The conversation was pleasant. The subject of the colour did not come up.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -2 },
          { type: 'removeCard', cardId: 'the_ordinary_pie' },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Eat what\'s there',
        flavourText: 'It was sufficient. Nobody mentioned the smell.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'removeCard', cardId: 'the_ordinary_pie' },
        ],
      },
    ],
  },
```

- [ ] **Step 3: Type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/treats.ts
git commit -m "feat: add the_ordinary_pie treat card (dread relief)"
```

---

## Task 2: Update `congregation_meets` in core.ts

**Files:**
- Modify: `src/data/cards/core.ts`

Three changes on this card:
1. **"Pass the collection plate"** (opt 0): remove `dreadPressureScaling: true` and remove the `dread +1` effect.
2. **"Dismiss early"** (opt 2): remove `dread +1` effect, add `insertCard the_ordinary_pie`.

"Deliver a sermon" (opt 1) is **unchanged**.

- [ ] **Step 1: Fix "Pass the collection plate"**

Find this block in `src/data/cards/core.ts`:

```ts
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

Replace with:

```ts
      {
        label: 'Pass the collection plate',
        flavourText: 'The biscuit provider gives generously. You note this.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
        ],
      },
```

- [ ] **Step 2: Fix "Dismiss early"**

Find this block:

```ts
      {
        label: 'Dismiss early',
        flavourText: 'The hall empties quickly. Someone lingers on the steps. You do not call after them.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

Replace with:

```ts
      {
        label: 'Dismiss early',
        flavourText: 'The hall empties quickly. Someone lingers on the steps. You do not call after them.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'insertCard', cardId: 'the_ordinary_pie', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
```

- [ ] **Step 3: Type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/core.ts
git commit -m "fix: congregation_meets — remove unjustified dread, dismiss early inserts pie treat"
```

---

## Task 3: Remaining core.ts changes — local_elections, the_donation, supplies_dwindle

**Files:**
- Modify: `src/data/cards/core.ts`

Three independent edits to the same file. All can be done in one pass.

- [ ] **Step 1: Fix `local_elections` "Stay out" — dread +2 → +1**

Find:

```ts
      {
        label: 'Stay out',
        flavourText: 'Neutrality is also a position. You are aware of its cost.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
```

Replace with:

```ts
      {
        label: 'Stay out',
        flavourText: 'Neutrality is also a position. You are aware of its cost.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

- [ ] **Step 2: Fix `the_donation` "Return it anonymously" — dread +1 → −1**

Find:

```ts
      {
        label: 'Return it anonymously',
        flavourText: 'One person noticed you turned it down. That\'s enough.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

Replace with:

```ts
      {
        label: 'Return it anonymously',
        flavourText: 'One person noticed you turned it down. That\'s enough.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
```

- [ ] **Step 3: Fix `supplies_dwindle` "Spend on provisions" — add dread −1**

Find:

```ts
      {
        label: 'Spend on provisions',
        flavourText: 'They eat. They are grateful. Gratitude is worth something.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
```

Replace with:

```ts
      {
        label: 'Spend on provisions',
        flavourText: 'They eat. They are grateful. Gratitude is worth something.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
```

- [ ] **Step 4: Type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/data/cards/core.ts
git commit -m "fix: local_elections fallback dread+2->+1, donation return flips to dread-1, supplies_dwindle adds dread relief"
```

---

## Task 4: Fix `unravelling_1` (The Veil Thins) — P13-23

**Files:**
- Modify: `src/data/cards/unravelling.ts`

**Problem:** onDraw fires dread+1 before options appear. "Manage the damage" has dread−1 to cancel it (net 0 for gold−2). "Let it pass" appears to cost only dread+1 but true net is +2. The mechanical outcome is identical if we remove the onDraw and make both options explicit — this is purely a legibility fix.

**Changes:**
1. Remove the `onDraw` array entirely from `unravelling_1`
2. "Manage the damage" (opt 0): remove `{ type: 'resource', resource: 'dread', delta: -1 }` — the option now costs gold−2 with no dread movement (its value is avoiding opt 1)
3. "Let it pass" (opt 1): change `dread delta: 1` → `dread delta: 2`

- [ ] **Step 1: Remove onDraw and fix both options**

Find this entire block in `src/data/cards/unravelling.ts`:

```ts
  {
    id: 'unravelling_1',
    title: 'The Veil Thins',
    flavourText: 'Something shifted. No one mentions it, which means everyone noticed.',
    tier: 'doom',
    onDraw: [
      { type: 'resource', resource: 'dread', delta: 1 },
    ],
    options: [
      {
        label: 'Manage the damage',
        flavourText: 'Gold spent, dread contained. Temporary.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Let it pass',
        flavourText: 'It passes. It leaves something behind.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'revelation', position: 'random', minPos: 5, maxPos: 10 },
        ],
      },
    ],
  },
```

Replace with:

```ts
  {
    id: 'unravelling_1',
    title: 'The Veil Thins',
    flavourText: 'Something shifted. No one mentions it, which means everyone noticed.',
    tier: 'doom',
    options: [
      {
        label: 'Manage the damage',
        flavourText: 'Gold spent, dread contained. Temporary.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Let it pass',
        flavourText: 'It passes. It leaves something behind.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'revelation', position: 'random', minPos: 5, maxPos: 10 },
        ],
      },
    ],
  },
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/unravelling.ts
git commit -m "fix: the_veil_thins P13-23 — remove onDraw, make both options explicit (manage: gold-2 no dread, let it pass: dread+2)"
```

---

## Verification Checklist

After all four tasks are committed, manually verify in the running game:

- [ ] Draw `congregation_meets` — "Pass the collection plate" shows only gold+2 (no dread tag). "Dismiss early" shows fol−1 and a card insert tag. Draw the resulting pie treat card.
- [ ] Draw `the_ordinary_pie` — "Share it round" shows gold−2 and dread−2 (greyed if gold<2). "Eat what's there" shows dread−1. Both options remove the card.
- [ ] Draw `local_elections` — "Stay out" shows dread+1 (not +2).
- [ ] Draw `the_donation` — "Return it anonymously" shows inf+1 and dread−1 (green dread tag).
- [ ] Draw `supplies_dwindle` — "Spend on provisions" shows gold−2, fol+1, dread−1.
- [ ] Draw `unravelling_1` (The Veil Thins) — dread does NOT tick up on draw. "Manage the damage" shows only gold−2. "Let it pass" shows dread+2.
