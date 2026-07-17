# Y'ha-nthlei Difficulty Tuning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tune the Y'ha-nthlei god path so that card 3's stall option drains influence meaningfully, and card 4's advance costs a follower while its non-advance option punishes the player's win-condition resource (influence).

**Architecture:** Pure data edits to one file — `src/data/godPaths/yha_nthlei.ts`. No engine changes, no new cards. Cards 1–2 and 5–6 are untouched. Three option effects modified across cards 3 and 4.

**Tech Stack:** TypeScript card data. `npm run build` for validation.

---

## File Structure

| File | Change |
|---|---|
| `src/data/godPaths/yha_nthlei.ts` | Edit 3 options across cards 3 and 4 |

---

## Task 1: Edit Card 3 — The Innsmouth Look

**Files:**
- Modify: `src/data/godPaths/yha_nthlei.ts`

Read the file before editing. Find the `yha_nthlei_3` card block.

- [ ] **Step 1: Edit "Let him attend"**

Find this option:

```typescript
      {
        label: 'Let him attend',
        flavourText: 'He has been here six times now. Some of our people have started standing at the back as well.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
          // Card returns 7–11 draws out; costs escalate (escalates: true above)
          { type: 'insertCard', cardId: 'yha_nthlei_3', position: 'random', minPos: 7, maxPos: 11 },
        ],
      },
```

Replace with:

```typescript
      {
        label: 'Let him attend',
        flavourText: 'He has been here six times now. Some of our people have started standing at the back as well.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -2 },
          // Card returns 7–11 draws out; costs escalate (escalates: true above)
          { type: 'insertCard', cardId: 'yha_nthlei_3', position: 'random', minPos: 7, maxPos: 11 },
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
git add src/data/godPaths/yha_nthlei.ts
git commit -m "data: yha card 3 — stall drains inf-2 instead of inf-1"
```

---

## Task 2: Edit Card 4 — The Oath of Dagon

**Files:**
- Modify: `src/data/godPaths/yha_nthlei.ts`

Find the `yha_nthlei_4` card block.

- [ ] **Step 1: Edit "Accept the terms"**

Find this option:

```typescript
      {
        label: 'Accept the terms',
        flavourText: 'We agreed to things we did not fully understand. Some of them we did fully understand. We agreed anyway.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 3 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'advanceGodPath' },
        ],
        condition: { type: 'resourceMin', resource: 'relics', min: 1 },
      },
```

Replace with:

```typescript
      {
        label: 'Accept the terms',
        flavourText: 'We agreed to things we did not fully understand. Some of them we did fully understand. We agreed anyway.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'advanceGodPath' },
        ],
        condition: { type: 'resourceMin', resource: 'relics', min: 1 },
      },
```

- [ ] **Step 2: Edit "Request more time"**

Find this option:

```typescript
      {
        label: 'Request more time',
        flavourText: 'More time was not refused. The shape waited while we discussed it. We were aware of it waiting.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          // Card returns 3–5 draws out
          { type: 'insertCard', cardId: 'yha_nthlei_4', position: 'random', minPos: 3, maxPos: 5 },
        ],
      },
```

Replace with:

```typescript
      {
        label: 'Request more time',
        flavourText: 'More time was not refused. The shape waited while we discussed it. We were aware of it waiting.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          // Card returns 3–5 draws out
          { type: 'insertCard', cardId: 'yha_nthlei_4', position: 'random', minPos: 3, maxPos: 5 },
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
git add src/data/godPaths/yha_nthlei.ts
git commit -m "data: yha card 4 — advance costs fol-1, stall drains inf-1 + dread+3"
```

---

## Final Verification

- [ ] **Confirm "Let him attend" has influence delta -2**

```bash
grep -A 8 "Let him attend" src/data/godPaths/yha_nthlei.ts
```

Expected: `influence` delta `-2`.

- [ ] **Confirm "Accept the terms" has followers -1 and influence +2**

```bash
grep -A 10 "Accept the terms" src/data/godPaths/yha_nthlei.ts
```

Expected: `followers` delta `-1` and `influence` delta `2`.

- [ ] **Confirm "Request more time" has influence -1 and dread +3**

```bash
grep -A 8 "Request more time" src/data/godPaths/yha_nthlei.ts
```

Expected: `influence` delta `-1` and `dread` delta `3`.
