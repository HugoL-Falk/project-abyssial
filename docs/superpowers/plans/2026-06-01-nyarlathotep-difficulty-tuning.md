# Nyarlathotep Difficulty Tuning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tune the Nyarlathotep god path so that card 3's advance options have real costs and its non-advance is genuinely punishing, and card 5's advance costs followers to create a resource-building requirement.

**Architecture:** Pure data edits to one file — `src/data/godPaths/nyarlathotep.ts`. No engine changes, no new cards. Cards 1–2, 4, and 6 are untouched. Four option effects modified across cards 3 and 5.

**Tech Stack:** TypeScript card data. `npm run build` for validation.

---

## File Structure

| File | Change |
|---|---|
| `src/data/godPaths/nyarlathotep.ts` | Edit 4 options across cards 3 and 5 |

---

## Task 1: Edit Card 3 — The Black Man at the Crossroads

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts`

Read the file before editing. Find the `nyarlathotep_3` card block. Three options change in this task.

- [ ] **Step 1: Edit "Encourage the meetings"**

Find this option:

```typescript
      {
        label: 'Encourage the meetings',
        flavourText: 'Attendance is voluntary. Everyone has attended.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 3 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'advanceGodPath' },
          { type: 'seedWhispers', count: 3 },
        ],
        condition: { type: 'godPathStageMin', min: 2 },
      },
```

Replace with:

```typescript
      {
        label: 'Encourage the meetings',
        flavourText: 'Attendance is voluntary. Everyone has attended.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 3 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'advanceGodPath' },
          { type: 'seedWhispers', count: 3 },
        ],
        condition: { type: 'godPathStageMin', min: 2 },
      },
```

- [ ] **Step 2: Edit "Observe without intervening"**

Find this option:

```typescript
      {
        label: 'Observe without intervening',
        flavourText: 'We watched a meeting from a distance. The distance felt insufficient.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'advanceGodPath' },
          { type: 'seedWhispers', count: 4 },
        ],
        condition: { type: 'godPathStageMin', min: 2 },
      },
```

Replace with:

```typescript
      {
        label: 'Observe without intervening',
        flavourText: 'We watched a meeting from a distance. The distance felt insufficient.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'advanceGodPath' },
          { type: 'seedWhispers', count: 4 },
        ],
        condition: { type: 'godPathStageMin', min: 2 },
      },
```

- [ ] **Step 3: Edit "Discourage the meetings"**

Find this option:

```typescript
      {
        label: 'Discourage the meetings',
        flavourText: 'They stopped meeting at the crossroads. They started meeting elsewhere.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

Replace with:

```typescript
      {
        label: 'Discourage the meetings',
        flavourText: 'They stopped meeting at the crossroads. They started meeting elsewhere.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
```

- [ ] **Step 4: Build to verify**

```bash
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/data/godPaths/nyarlathotep.ts
git commit -m "data: nyarlathotep card 3 — add costs to both advances, harden non-advance"
```

---

## Task 2: Edit Card 5 — The Signal Broadens

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts`

Find the `nyarlathotep_5` card block.

- [ ] **Step 1: Edit "Tune in"**

Find this option:

```typescript
      {
        label: 'Tune in',
        flavourText: 'We listened for six hours. It felt like one. We have no memory of most of it.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 4 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'advanceGodPath' },
          { type: 'seedWhispers', count: 1 },
        ],
        condition: { type: 'godPathStageMin', min: 4 },
      },
```

Replace with:

```typescript
      {
        label: 'Tune in',
        flavourText: 'We listened for six hours. It felt like one. We have no memory of most of it.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 4 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'advanceGodPath' },
          { type: 'seedWhispers', count: 1 },
        ],
        condition: { type: 'godPathStageMin', min: 4 },
      },
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/godPaths/nyarlathotep.ts
git commit -m "data: nyarlathotep card 5 — tune in now costs fol-2"
```

---

## Final Verification

- [ ] **Confirm card 3 "Encourage" has Inf-1 and Dread+3**

```bash
grep -A 10 "Encourage the meetings" src/data/godPaths/nyarlathotep.ts
```

Expected: `influence` delta `-1` and `dread` delta `3`.

- [ ] **Confirm card 3 "Observe" has Fol-1 and Dread+3**

```bash
grep -A 8 "Observe without intervening" src/data/godPaths/nyarlathotep.ts
```

Expected: `followers` delta `-1` and `dread` delta `3`.

- [ ] **Confirm card 3 "Discourage" has Fol-2 and Dread+2**

```bash
grep -A 6 "Discourage the meetings" src/data/godPaths/nyarlathotep.ts
```

Expected: `followers` delta `-2` and `dread` delta `2`.

- [ ] **Confirm card 5 "Tune in" has Fol-2**

```bash
grep -A 8 "Tune in" src/data/godPaths/nyarlathotep.ts
```

Expected: `followers` delta `-2` present before the `influence` line.
