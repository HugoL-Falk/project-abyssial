# Card Tier Reclassification Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move 7 cards from common to core, 1 card from common to rare, redesign 2 cards as clean commons, and document the `something_on_the_hook` entry path gap.

**Architecture:** Data-only changes — no engine modifications. The game engine uses `COMMON_CARDS`, `CORE_CARDS`, and `RARE_CARDS` arrays for deck building, and the `tier` field for in-game logic. Both must be updated together. `src/data/index.ts` does not need changes — it already imports all three arrays.

**Tech Stack:** TypeScript card data files (`src/data/cards/`). `npm run build` is the verification step — there are no unit tests for card data.

---

## Background

This is Phase 1 of a multi-phase card tier reclassification. Full design rationale in `docs/superpowers/specs/2026-06-01-card-tier-reclassification-design.md`.

**Why these cards move:**
- Common cards should only have 1–2 resource effects and no `insertCard` or `randomOutcome`
- 7 cards in common have `insertCard` effects — their narrative identity is about creating future consequences, which is core territory
- `travelling_merchant` has a 4-way `randomOutcome` including relics — that's rare territory
- `the_harbour` and `the_fire` can work as pure resource cards; their `insertCard` effects are stripped

**Deck building change to expect:** Core cards appear in every run. Cards moved from common to core will now always be in the starting deck instead of appearing with ~67% probability. This is intentional — they are run-defining events.

---

## File Structure

| File | Change |
|---|---|
| `src/data/cards/common.ts` | Remove 8 cards; redesign 2 remaining (`the_harbour`, `the_fire`) |
| `src/data/cards/core.ts` | Append 7 cards with `tier: 'core'` |
| `src/data/cards/rare.ts` | Append `travelling_merchant` with `tier: 'rare'` |

---

## Task 1: Move 7 cards from common.ts to core.ts

**Cards:** `academic_society`, `woodcutters_report`, `the_printing_press`, `the_opium_den`, `the_census_agent`, `local_elections`, `the_seance`

**Files:**
- Modify: `src/data/cards/common.ts`
- Modify: `src/data/cards/core.ts`

> Note: three of these cards have a `godPathWeight` field. This field only affects the common weighted-draw pool — it is unused in core. Leave the fields in place; removing them is out of scope.

- [ ] **Step 1: Remove the 7 cards from common.ts**

In `src/data/cards/common.ts`, delete the following blocks from the `COMMON_CARDS` array. Use the card IDs to locate them. Also remove their section comment headers.

Delete:
- The `// ─── NYARLATHOTEP WEIGHTED` comment + `academic_society` block
- The `// ─── SHUB-NIGGURATH WEIGHTED` comment + `woodcutters_report` block  
- The `// ─── NEUTRAL` comment
- `the_printing_press` block
- `the_opium_den` block
- `the_census_agent` block
- `local_elections` block
- `the_seance` block

After deletion, `COMMON_CARDS` should contain only 5 cards: `the_harbour`, `the_inheritance`, `travelling_merchant`, `the_newspaper`, `the_fire`.

- [ ] **Step 2: Append the 7 cards to core.ts**

In `src/data/cards/core.ts`, append the following before the closing `]` of the `CORE_CARDS` array (after the last card, `the_donation`):

```typescript
  // ── Reclassified from common (Phase 1, 2026-06-01) ─────────────────────
  {
    id: 'academic_society',
    title: 'The Academic Society',
    flavourText: 'Monthly meeting. Dry sandwiches, non-alcoholic beverages, and light discussion of pre-human civilisations. What a night.',
    tier: 'core',
    godPathWeight: 'nyarlathotep',
    options: [
      {
        label: 'Attend as a civilian',
        flavourText: 'Thoroughly boring. Extremely useful.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'a_useful_contact', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },
      {
        label: 'Attend as a guest speaker',
        flavourText: 'The talk went well. Several people looked uncomfortable in professionally relevant ways.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 3 },
          { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 5, maxPos: 9 },
        ],
      },
      {
        label: 'Send regrets',
        flavourText: 'Also a missed three hours of dry sandwiches. You run a study group instead. One of the attendees stays longer.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'woodcutters_report',
    title: "The Woodcutter's Report",
    flavourText: "He won't go back to the north grove, but he's selling the map for a ticket out of town. You respect the hustle.",
    tier: 'core',
    godPathWeight: 'shub_niggurath',
    options: [
      {
        label: 'Buy the map',
        flavourText: 'He takes the money and hands it over without making eye contact.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'randomOutcome', outcomes: [
            { weight: 1, effects: [{ type: 'insertCard', cardId: 'grove_awaits', position: 'random', minPos: 3, maxPos: 7 }] },
            { weight: 1, effects: [{ type: 'insertCard', cardId: 'an_unremarkable_stump', position: 'random', minPos: 3, maxPos: 7 }] },
          ]},
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        label: 'Decline',
        flavourText: "He shrugs. He'll find a buyer.",
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'the_printing_press',
    title: 'The Printing Press',
    flavourText: "The printer is behind on too much work to be bothered to ask what the pamphlets are for. You don't ask if that is the only reason his hands are shaking.",
    tier: 'core',
    options: [
      {
        label: 'Propaganda run',
        flavourText: 'Someone with a clipboard has taken interest.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'insertCard', cardId: 'scrutiny', position: 'random', minPos: 4, maxPos: 8 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Help the printer',
        flavourText: 'He is grateful. The invoices are discreet. The work is legitimate, mostly.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
      {
        label: 'Forgery work',
        flavourText: 'Documents that did not exist. Events that did not happen. Very professional.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -2 },
          { type: 'insertCard', cardId: 'forgers_debt', position: 'random', minPos: 4, maxPos: 8 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
    ],
  },
  {
    id: 'the_opium_den',
    title: 'The Opium Den',
    flavourText: "Your followers call it meditation. You've stopped correcting them. It's easier.",
    tier: 'core',
    options: [
      {
        label: 'Encourage the visits',
        flavourText: 'They come back changed. The change is, for now, useful.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'advanceGodPath' },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
      {
        label: 'Forbid it',
        flavourText: 'The word goes out. Some comply. The rest just go on Wednesdays instead.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
      {
        label: 'Acquire it',
        flavourText: 'The premises are modest. The access to its clientele is not.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -3 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'the_dreamer', position: 'random', minPos: 2, maxPos: 5 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 3 },
      },
    ],
  },
  {
    id: 'the_census_agent',
    title: 'The Census Agent',
    flavourText: 'Federal. Polite. Counting heads. You have complicated feelings about her accuracy.',
    tier: 'core',
    options: [
      {
        label: 'Cooperate fully',
        flavourText: 'You are helpful and transparent about the parts that are not the problem.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'their_report', position: 'random', minPos: 4, maxPos: 8 },
        ],
      },
      {
        label: 'Provide misleading figures',
        flavourText: 'Plausible. Unverifiable. Probably fine.',
        effects: [
          { type: 'insertCard', cardId: 'their_suspicion', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
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
    ],
  },
  {
    id: 'local_elections',
    title: 'Local Elections',
    flavourText: 'The mayor is running unopposed again, which suits everyone who matters. Your candidate matters.',
    tier: 'core',
    options: [
      {
        label: 'Back them openly',
        flavourText: 'Public commitment. Public obligation on both sides.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'insertCard', cardId: 'political_debt', position: 'random', minPos: 5, maxPos: 9 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Back them quietly',
        flavourText: 'Gratitude moves differently than obligation. Two new faces appear at the next meeting.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Stay out',
        flavourText: 'Neutrality is also a position. You are aware of its cost.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'the_seance',
    title: 'The Séance',
    flavourText: 'They organised it themselves. You were going to stop them. Then you thought: what if it actually works?',
    tier: 'core',
    options: [
      {
        label: 'Attend and steer',
        flavourText: 'It worked. You steered. Something else was also steering.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'advanceGodPath' },
        ],
      },
      {
        label: 'Let them do it alone',
        flavourText: 'They were enthusiastic. Something answered with equal enthusiasm.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'insertCard', cardId: 'wandering_soul', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
      {
        label: 'Forbid it',
        flavourText: 'They comply with visible resentment. You lose ground on both sides.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
    ],
  },
```

- [ ] **Step 3: Build to verify**

```bash
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/common.ts src/data/cards/core.ts
git commit -m "data: reclassify 7 common cards → core tier (phase 1)"
```

---

## Task 2: Move travelling_merchant from common.ts to rare.ts

**Files:**
- Modify: `src/data/cards/common.ts`
- Modify: `src/data/cards/rare.ts`

- [ ] **Step 1: Remove travelling_merchant from common.ts**

In `src/data/cards/common.ts`, delete this block from `COMMON_CARDS`:

```typescript
  {
    id: 'travelling_merchant',
    title: 'The Travelling Merchant',
    flavourText: 'He has a new jar. He always has a new jar. Why is everything always in jars?',
    tier: 'common',
    options: [
      {
        label: 'Buy it',
        flavourText: 'He names a price. You pay it. The jar goes home with you.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'randomOutcome', outcomes: [
            { weight: 1, effects: [{ type: 'resource', resource: 'relics', delta: 1 }] },
            { weight: 1, effects: [{ type: 'resource', resource: 'dread', delta: -2 }] },
            { weight: 1, effects: [{ type: 'resource', resource: 'followers', delta: 1 }] },
            { weight: 1, effects: [{ type: 'insertCard', cardId: 'cursed_object', position: 'random', minPos: 2, maxPos: 5 }] },
          ]},
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Pass',
        flavourText: 'He nods. He will be back.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
```

- [ ] **Step 2: Append travelling_merchant to rare.ts**

In `src/data/cards/rare.ts`, append the following before the closing `]` of the `RARE_CARDS` array (the `DARK_YOUNG_GUARDIAN` export comes after the array and is not affected):

```typescript
  {
    id: 'travelling_merchant',
    title: 'The Travelling Merchant',
    flavourText: 'He has a new jar. He always has a new jar. Why is everything always in jars?',
    tier: 'rare',
    options: [
      {
        label: 'Buy it',
        flavourText: 'He names a price. You pay it. The jar goes home with you.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'randomOutcome', outcomes: [
            { weight: 1, effects: [{ type: 'resource', resource: 'relics', delta: 1 }] },
            { weight: 1, effects: [{ type: 'resource', resource: 'dread', delta: -2 }] },
            { weight: 1, effects: [{ type: 'resource', resource: 'followers', delta: 1 }] },
            { weight: 1, effects: [{ type: 'insertCard', cardId: 'cursed_object', position: 'random', minPos: 2, maxPos: 5 }] },
          ]},
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Pass',
        flavourText: 'He nods. He will be back.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
```

- [ ] **Step 3: Build to verify**

```bash
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/common.ts src/data/cards/rare.ts
git commit -m "data: reclassify travelling_merchant → rare tier (phase 1)"
```

---

## Task 3: Redesign the_harbour — strip insertCard

**Files:**
- Modify: `src/data/cards/common.ts`

The `the_harbour` card currently has 3 options. Option 2 ("Ask what he means by 'deep'") inserts `something_on_the_hook`. Remove the `insertCard` effect; increase the dread cost to reflect the horror of what is seen.

- [ ] **Step 1: Replace option 2 in the_harbour**

In `src/data/cards/common.ts`, find the `the_harbour` card and replace this option:

```typescript
      {
        label: "Ask what he means by 'deep'",
        flavourText: 'He shows you the net. You understand why he looked away when he said it.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'something_on_the_hook', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },
```

With:

```typescript
      {
        label: "Ask what he means by 'deep'",
        flavourText: 'He shows you the net. You understand why he looked away when he said it.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/cards/common.ts
git commit -m "data: redesign the_harbour as clean common — dread+2, no insertCard"
```

---

## Task 4: Redesign the_fire — strip insertCard

**Files:**
- Modify: `src/data/cards/common.ts`

The `the_fire` card's option 3 ("Investigate") inserts `evidence_of_rival`. Remove the `insertCard`; the investigation now yields dread and influence (you found something useful but disturbing).

Note: `evidence_of_rival` still has an entry path via `src/data/cards/mutations.ts` (line 166) — the card is not orphaned.

- [ ] **Step 1: Replace option 3 in the_fire**

In `src/data/cards/common.ts`, find the `the_fire` card and replace this option:

```typescript
      {
        label: 'Investigate',
        flavourText: 'Someone was thorough. Someone was also careless about a boot.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'evidence_of_rival', position: 'random', minPos: 2, maxPos: 5 },
        ],
      },
```

With:

```typescript
      {
        label: 'Investigate',
        flavourText: 'Someone was thorough. Someone was also careless about a boot.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
      },
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/cards/common.ts
git commit -m "data: redesign the_fire as clean common — dread+1/inf+1, no insertCard"
```

---

## Task 5: Audit something_on_the_hook entry path

`something_on_the_hook` was inserted only by `the_harbour` option 2. After Task 3 it has no entry path. Confirm this and document the known gap.

**Files:** No changes.

- [ ] **Step 1: Verify no remaining insertCard references**

Run from the project root:

```bash
grep -r "something_on_the_hook" src/data/cards/
```

Expected output (all lines should be in `threats.ts` only — no `insertCard` references outside threats.ts):

```
src/data/cards/threats.ts:NNN:    id: 'something_on_the_hook',
src/data/cards/threats.ts:NNN:          { type: 'removeCard', cardId: 'something_on_the_hook' },
src/data/cards/threats.ts:NNN:          { type: 'removeCard', cardId: 'something_on_the_hook' },
src/data/cards/threats.ts:NNN:    // Inserted by something_on_the_hook ...
```

If any line outside `threats.ts` shows `insertCard` referencing `something_on_the_hook`, investigate before proceeding.

- [ ] **Step 2: No code change — document the gap**

`something_on_the_hook` now exists in `threats.ts` with no entry path. This is an accepted Phase 1 limitation. Phase 2 (core tier audit) will assign it to an appropriate core card. No further action needed in this plan.

---

## Final Verification

- [ ] **Run full build**

```bash
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Manual smoke test** — start a run in the browser and verify:
  - Common cards are now only: `the_harbour`, `the_inheritance`, `the_newspaper`, `the_fire` (+ any drawn via weightedDraw)
  - The 7 reclassified cards (`academic_society`, `woodcutters_report`, etc.) appear in every run as core cards
  - `travelling_merchant` may appear as a rare draw (1–2 rares per run)
  - `the_harbour` option 2 "Ask what he means by 'deep'" no longer inserts a card — only gives dread +2
  - `the_fire` "Investigate" no longer inserts a card — gives dread +1, influence +1
