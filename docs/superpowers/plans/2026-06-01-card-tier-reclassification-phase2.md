# Card Tier Reclassification Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove 4 insertCard effects from core cards to enforce single-source threat chains, and downgrade `word_spreads` from core to common.

**Architecture:** Pure data edits — no engine changes. Task 1 edits four options in `core.ts`. Task 2 moves `word_spreads` from `core.ts` to `common.ts` with `tier: 'common'`. `src/data/index.ts` does not need changes.

**Tech Stack:** TypeScript card data files. `npm run build` for validation.

---

## File Structure

| File | Change |
|---|---|
| `src/data/cards/core.ts` | Edit 4 card options (remove insertCard); remove `word_spreads` block |
| `src/data/cards/common.ts` | Add `word_spreads` with `tier: 'common'` |

---

## Task 1: Remove 4 insertCard effects from core.ts

Four cards each lose one `insertCard` effect on a specific option. All edits are in `src/data/cards/core.ts`. Read the file before editing.

**Files:**
- Modify: `src/data/cards/core.ts`

- [ ] **Step 1: Edit congregation_meets — "Dismiss early"**

Find this option in the `congregation_meets` card:

```typescript
      {
        label: 'Dismiss early',
        flavourText: 'The hall empties quickly. Someone lingers on the steps.',
        effects: [
          { type: 'insertCard', cardId: 'wandering_soul', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
```

Replace with:

```typescript
      {
        label: 'Dismiss early',
        flavourText: 'The hall empties quickly. Someone lingers on the steps. You do not call after them.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

- [ ] **Step 2: Edit stranger_asks_questions — "Offer him a tour"**

Find this option in the `stranger_asks_questions` card:

```typescript
      {
        label: 'Offer him a tour',
        flavourText: 'Charming. Informative. Professionally inadvisable.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 4, maxPos: 8 },
        ],
      },
```

Replace with:

```typescript
      {
        label: 'Offer him a tour',
        flavourText: 'Charming. Informative. He notices more than he lets on. So do you.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

- [ ] **Step 3: Edit the_printing_press — "Propaganda run"**

Find this option in the `the_printing_press` card:

```typescript
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
```

Replace with:

```typescript
      {
        label: 'Propaganda run',
        flavourText: 'Someone with a clipboard has taken interest.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
```

- [ ] **Step 4: Edit academic_society — "Attend as a civilian"**

Find this option in the `academic_society` card:

```typescript
      {
        label: 'Attend as a civilian',
        flavourText: 'Thoroughly boring. Extremely useful.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'a_useful_contact', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },
```

Replace with:

```typescript
      {
        label: 'Attend as a civilian',
        flavourText: 'Thoroughly boring. Extremely useful.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
      },
```

- [ ] **Step 5: Build to verify**

```bash
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/data/cards/core.ts
git commit -m "data: remove 4 insertCard effects from core cards (phase 2 threat chains)"
```

---

## Task 2: Move word_spreads from core.ts to common.ts

`word_spreads` loses its only `insertCard` effect making it a clean common card. Remove it from `CORE_CARDS` and add it to `COMMON_CARDS` with `tier: 'common'`.

**Files:**
- Modify: `src/data/cards/core.ts`
- Modify: `src/data/cards/common.ts`

- [ ] **Step 1: Remove word_spreads from core.ts**

Read `src/data/cards/core.ts` first. Find and delete this entire block from `CORE_CARDS`:

```typescript
  {
    id: 'word_spreads',
    title: 'Word Spreads',
    flavourText: "You hear people talking. You didn't plan this. On the other hand, is it so bad?",
    tier: 'core',
    options: [
      {
        label: 'Lean into it',
        flavourText: 'The story grows past the version you told. The version coming back is unrecognisable. Something else is spreading with it.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'their_suspicion', position: 'random', minPos: 5, maxPos: 9 },
        ],
      },
      {
        label: 'Let it settle',
        flavourText: 'Smaller story. More manageable story. Stories do not stay small.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
    ],
  },
```

- [ ] **Step 2: Add word_spreads to common.ts**

Read `src/data/cards/common.ts` first. Append the following before the closing `]` of `COMMON_CARDS`:

```typescript
  {
    id: 'word_spreads',
    title: 'Word Spreads',
    flavourText: "You hear people talking. You didn't plan this. On the other hand, is it so bad?",
    tier: 'common',
    options: [
      {
        label: 'Lean into it',
        flavourText: 'The story grows past the version you told. The version coming back is unrecognisable.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
      {
        label: 'Let it settle',
        flavourText: 'Smaller story. More manageable story. Stories do not stay small.',
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
git add src/data/cards/core.ts src/data/cards/common.ts
git commit -m "data: reclassify word_spreads → common tier (phase 2)"
```

---

## Final Verification

- [ ] **Confirm common pool size**

Run:
```bash
grep -c "id:" src/data/cards/common.ts
```

Expected: `5` (the_harbour, the_inheritance, the_newspaper, the_fire, word_spreads)

- [ ] **Confirm no orphaned insertCard references to removed cards**

Run:
```bash
grep -r "cardId: 'wandering_soul'\|cardId: 'investigators_file'\|cardId: 'scrutiny'\|cardId: 'their_suspicion'\|cardId: 'a_useful_contact'" src/data/cards/core.ts
```

Expected output — only the single-source owners should remain:
- `wandering_soul` → only in `the_seance`
- `investigators_file` → only in `academic_society` (guest speaker option)
- `scrutiny` → only in `congregation_meets` (deliver a sermon option)
- `their_suspicion` → only in `the_census_agent`
- `a_useful_contact` → zero results in core.ts (stranded, deferred)
