# Shub-Niggurath Difficulty Tuning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tune Shub-Niggurath (the third god path) so that cards 3–5 have real advance costs and harsh non-advance punishments, making it genuinely more demanding than Y'ha-nthlei and Nyarlathotep.

**Architecture:** Pure data edits to one file — `src/data/godPaths/shub_niggurath.ts`. No engine changes, no new cards, no other files touched. Cards 1–2 are untouched. Cards 3–5 have specific option effects and conditions modified.

**Tech Stack:** TypeScript card data. `npm run build` for validation.

---

## File Structure

| File | Change |
|---|---|
| `src/data/godPaths/shub_niggurath.ts` | Edit 6 options across cards 3, 4, 5 |

---

## Task 1: Edit Card 3 — The Unknown Goat

**Files:**
- Modify: `src/data/godPaths/shub_niggurath.ts`

Read the file before editing. Find the `shub_niggurath_3` card block.

- [ ] **Step 1: Edit "Claim it formally"**

Find this option:

```typescript
      {
        label: 'Claim it formally',
        flavourText: 'The claim was brief. No one questioned it. You decide to keep it at the farmhouse. The follower who first touched it walks differently now.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'advanceGodPath' },
          { type: 'seedMutations', count: 2 },
        ],
        condition: { type: 'godPathStageMin', min: 2 },
      },
```

Replace with:

```typescript
      {
        label: 'Claim it formally',
        flavourText: 'The claim was brief. No one questioned it. You decide to keep it at the farmhouse. The follower who first touched it walks differently now.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'advanceGodPath' },
          { type: 'seedMutations', count: 2 },
        ],
        condition: { type: 'godPathStageMin', min: 2 },
      },
```

- [ ] **Step 2: Edit "Chase it off"**

Find this option:

```typescript
      {
        label: 'Chase it off',
        flavourText: 'It left. The trail of affected grass ends by the woods. It returned by dawn.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'removeCard', cardId: 'shub_niggurath_3' },
          { type: 'insertCard', cardId: 'shub_niggurath_3', position: 'random', minPos: 4, maxPos: 8 },
        ],
      },
```

Replace with:

```typescript
      {
        label: 'Chase it off',
        flavourText: 'One of ours followed it without being asked. Neither came back by dawn.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'removeCard', cardId: 'shub_niggurath_3' },
          { type: 'insertCard', cardId: 'shub_niggurath_3', position: 'random', minPos: 4, maxPos: 8 },
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
git add src/data/godPaths/shub_niggurath.ts
git commit -m "data: shub card 3 — remove inf gain, add fol cost, harden stall"
```

---

## Task 2: Edit Card 4 — The Familiar Chant

**Files:**
- Modify: `src/data/godPaths/shub_niggurath.ts`

Find the `shub_niggurath_4` card block.

- [ ] **Step 1: Edit "Lead the congregation"**

Find this option:

```typescript
      {
        label: 'Lead the congregation',
        flavourText: 'You step upon the podium. The acoustics were not the reason people kept turning toward the center of the room. Not everyone who attended has been accounted for since.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 3 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'advanceGodPath' },
          { type: 'seedMutations', count: 2 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 3 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
          ],
        },
      },
```

Replace with:

```typescript
      {
        label: 'Lead the congregation',
        flavourText: 'You step upon the podium. The acoustics were not the reason people kept turning toward the center of the room. Not everyone who attended has been accounted for since.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -3 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'advanceGodPath' },
          { type: 'seedMutations', count: 2 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 3 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
            { type: 'resourceMin', resource: 'followers', min: 3 },
          ],
        },
      },
```

- [ ] **Step 2: Edit "Observe what unfolds"**

Find this option:

```typescript
      {
        label: 'Observe what unfolds',
        flavourText: 'You watched from outside the barn. The door was open. You could feel the uncanny eyes in the middle of the room pull you in.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'shub_words_come_naturally', position: 'random', minPos: 2, maxPos: 4 },
        ],
        condition: { type: 'godPathStageMin', min: 3 },
      },
```

Replace with:

```typescript
      {
        label: 'Observe what unfolds',
        flavourText: 'You watched from outside the barn. The door was open. You could feel the uncanny eyes in the middle of the room pull you in.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'insertCard', cardId: 'shub_words_come_naturally', position: 'random', minPos: 2, maxPos: 4 },
        ],
        condition: { type: 'godPathStageMin', min: 3 },
      },
```

- [ ] **Step 3: Edit "Disperse them and lock the barn"**

Find this option:

```typescript
      {
        label: 'Disperse them and lock the barn',
        flavourText: 'They are outside now. You can hear both — the congregation on one side, and from inside, the hooves on the floorboards.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'removeCard', cardId: 'shub_niggurath_4' },
          { type: 'insertCard', cardId: 'shub_niggurath_4', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
```

Replace with:

```typescript
      {
        label: 'Disperse them and lock the barn',
        flavourText: 'They are outside now. You can hear both — the congregation on one side, and from inside, the hooves on the floorboards.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'removeCard', cardId: 'shub_niggurath_4' },
          { type: 'insertCard', cardId: 'shub_niggurath_4', position: 'random', minPos: 5, maxPos: 8 },
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
git add src/data/godPaths/shub_niggurath.ts
git commit -m "data: shub card 4 — advance now costs fol-3, stall adds dread+3"
```

---

## Task 3: Edit Card 5 — A Thousand Young

**Files:**
- Modify: `src/data/godPaths/shub_niggurath.ts`

Find the `shub_niggurath_5` card block.

- [ ] **Step 1: Edit "Wait at the treeline"**

Find this option:

```typescript
      {
        label: 'Wait at the treeline',
        flavourText: 'The forest does not acknowledge your hesitation. It simply grows.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'removeCard', cardId: 'shub_niggurath_5' },
          { type: 'insertCard', cardId: 'shub_niggurath_5', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },
```

Replace with:

```typescript
      {
        label: 'Wait at the treeline',
        flavourText: 'The forest grows into the hesitation. Two of ours stepped toward it before you could call them back.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'removeCard', cardId: 'shub_niggurath_5' },
          { type: 'insertCard', cardId: 'shub_niggurath_5', position: 'random', minPos: 3, maxPos: 6 },
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
git add src/data/godPaths/shub_niggurath.ts
git commit -m "data: shub card 5 — stall now costs fol-2 + dread+4, new flavour"
```

---

## Final Verification

- [ ] **Confirm no Inf+2 remains on card 3 "Claim it formally"**

```bash
grep -A 10 "Claim it formally" src/data/godPaths/shub_niggurath.ts
```

Expected: `influence` does NOT appear in the effects block for this option.

- [ ] **Confirm followers≥3 gate on card 4 "Lead the congregation"**

```bash
grep -A 20 "Lead the congregation" src/data/godPaths/shub_niggurath.ts
```

Expected: `{ type: 'resourceMin', resource: 'followers', min: 3 }` appears in the condition block.

- [ ] **Confirm card 5 stall has Fol-2 and Dread+4**

```bash
grep -A 10 "Wait at the treeline" src/data/godPaths/shub_niggurath.ts
```

Expected: `followers` delta `-2` and `dread` delta `4` in the effects block.
