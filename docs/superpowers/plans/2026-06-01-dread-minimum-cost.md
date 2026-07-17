# Dread Minimum Cost (P10-17) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `dread +1` to 8 unconditional options across `core.ts` and `common.ts` that currently have no dread cost and no insertCard effect.

**Architecture:** Pure data edits — no logic changes, no new components. Each affected option gets one additional effect object appended to its `effects` array. The RESOURCE_ORDER sort in `EffectTags.tsx` already handles dread display position automatically.

**Tech Stack:** TypeScript, Vite (`npx tsc --noEmit` for compile check)

---

### Task 1: Edit core.ts — congregation_meets

**Files:**
- Modify: `src/data/cards/core.ts` (lines ~9–35, `congregation_meets` card)

One option to change: **"Pass the collection plate"** — currently `Gold +3`, no dread.

- [ ] **Step 1: Open the file and locate the option**

In `src/data/cards/core.ts`, find the `congregation_meets` card (starts around line 4). Find the option with `label: 'Pass the collection plate'`.

Current state:
```typescript
{
  label: 'Pass the collection plate',
  flavourText: 'The biscuit provider gives generously. You note this.',
  effects: [
    { type: 'resource', resource: 'gold', delta: 3 },
  ],
},
```

- [ ] **Step 2: Add the dread effect**

Replace that option's `effects` array:
```typescript
{
  label: 'Pass the collection plate',
  flavourText: 'The biscuit provider gives generously. You note this.',
  effects: [
    { type: 'resource', resource: 'gold', delta: 3 },
    { type: 'resource', resource: 'dread', delta: 1 },
  ],
},
```

- [ ] **Step 3: Compile check**

Run from `E:\Project Abyssial\Code\project-abyssial`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/core.ts
git commit -m "balance(P10-17): add dread +1 to congregation_meets free option"
```

---

### Task 2: Edit common.ts — 7 options

**Files:**
- Modify: `src/data/cards/common.ts`

Seven options across six cards. Work through them in file order.

- [ ] **Step 1: academic_society — "Send regrets"**

Find card `academic_society`. Find option `label: 'Send regrets'`.

Current:
```typescript
{
  label: 'Send regrets',
  flavourText: 'Also a missed three hours of dry sandwiches. You run a study group instead. One of the attendees stays longer.',
  effects: [
    { type: 'resource', resource: 'followers', delta: 1 },
  ],
},
```

Replace `effects`:
```typescript
effects: [
  { type: 'resource', resource: 'followers', delta: 1 },
  { type: 'resource', resource: 'dread', delta: 1 },
],
```

- [ ] **Step 2: woodcutters_report — "Decline"**

Find card `woodcutters_report`. Find option `label: 'Decline'`.

Current:
```typescript
{
  label: 'Decline',
  flavourText: "He shrugs. He'll find a buyer.",
  effects: [
    { type: 'resource', resource: 'influence', delta: 1 },
  ],
},
```

Replace `effects`:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: 1 },
  { type: 'resource', resource: 'dread', delta: 1 },
],
```

- [ ] **Step 3: the_printing_press — "Help the printer"**

Find card `the_printing_press`. Find option `label: 'Help the printer'`.

Current:
```typescript
{
  label: 'Help the printer',
  flavourText: 'He is grateful. The invoices are discreet. The work is legitimate, mostly.',
  effects: [
    { type: 'resource', resource: 'gold', delta: 2 },
    { type: 'resource', resource: 'influence', delta: -2 },
  ],
},
```

Replace `effects`:
```typescript
effects: [
  { type: 'resource', resource: 'gold', delta: 2 },
  { type: 'resource', resource: 'influence', delta: -2 },
  { type: 'resource', resource: 'dread', delta: 1 },
],
```

- [ ] **Step 4: the_inheritance — "Have a quiet word"**

Find card `the_inheritance`. Find option `label: 'Have a quiet word'`.

Current:
```typescript
{
  label: 'Have a quiet word',
  flavourText: 'The family withdrew their objections. Quietly and without further questions.',
  effects: [
    { type: 'resource', resource: 'influence', delta: -1 },
    { type: 'resource', resource: 'gold', delta: 2 },
  ],
},
```

Replace `effects`:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: -1 },
  { type: 'resource', resource: 'gold', delta: 2 },
  { type: 'resource', resource: 'dread', delta: 1 },
],
```

- [ ] **Step 5: the_inheritance — "Relinquish"**

Same card. Find option `label: 'Relinquish'`.

Current:
```typescript
{
  label: 'Relinquish',
  flavourText: "You chose to relinquish your claim. This was noted by the family. The daughter later reaches out asking about the cause.",
  effects: [
    { type: 'resource', resource: 'followers', delta: 1 },
    { type: 'resource', resource: 'influence', delta: 1 },
  ],
},
```

Replace `effects`:
```typescript
effects: [
  { type: 'resource', resource: 'followers', delta: 1 },
  { type: 'resource', resource: 'influence', delta: 1 },
  { type: 'resource', resource: 'dread', delta: 1 },
],
```

- [ ] **Step 6: local_elections — "Stay out"**

Find card `local_elections`. Find option `label: 'Stay out'`.

Current:
```typescript
{
  label: 'Stay out',
  flavourText: 'Neutrality is also a position. You are aware of its cost.',
  effects: [],
},
```

Replace `effects`:
```typescript
effects: [
  { type: 'resource', resource: 'dread', delta: 1 },
],
```

- [ ] **Step 7: travelling_merchant — "Pass"**

Find card `travelling_merchant`. Find option `label: 'Pass'`.

Current:
```typescript
{
  label: 'Pass',
  flavourText: 'He nods. He will be back.',
  effects: [],
},
```

Replace `effects`:
```typescript
effects: [
  { type: 'resource', resource: 'dread', delta: 1 },
],
```

- [ ] **Step 8: Compile check**

Run from `E:\Project Abyssial\Code\project-abyssial`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/data/cards/common.ts
git commit -m "balance(P10-17): add dread +1 to 7 free options in common cards"
```

---

### Task 3: Smoke test in browser

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Start a new run and verify each affected card**

Load the game and play through until you see each affected card. For each one, confirm:
- The dread effect tag appears in the UI on the modified option (small red dread icon)
- The tag is sorted correctly among other resource tags (gold → followers → influence → dread → relics)
- Choosing the option correctly increments dread by 1

Cards to check: `The Congregation Meets`, `The Academic Society`, `The Woodcutter's Report`, `The Printing Press`, `The Inheritance`, `Local Elections`, `The Travelling Merchant`.

- [ ] **Step 3: Update backlog**

In `knowledge/backlog.md`, mark **P10-17** as `[x]`.

---

## Self-Review

**Spec coverage:**
- ✅ 1 core.ts edit (congregation_meets)
- ✅ 7 common.ts edits (all listed in spec)
- ✅ Excluded: insertCard options, options with existing dread, threats/rare/god path

**Placeholder scan:** No TBDs, no vague steps. All code shown verbatim.

**Type consistency:** All effect objects use the same shape `{ type: 'resource', resource: 'dread', delta: 1 }` — matches the existing `Effect` type in use throughout the file.
