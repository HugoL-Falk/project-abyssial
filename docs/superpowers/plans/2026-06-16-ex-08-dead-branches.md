# EX-08 — Dead-Branch Hybrid Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove 12 pure dead-branch options across three god-path chain files and rebalance 3 edge-case branches.

**Architecture:** Pure data edits across `yha_nthlei.ts`, `shub_niggurath.ts`, `nyarlathotep.ts`. One commit per chain file. No engine, type, or UI changes — engine support for `cardOptionChosen` stays for future use even though no card references it after this pass.

**Tech Stack:** TypeScript, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-06-16-ex-08-dead-branches-design.md`

---

## File Structure

- **Modify** `src/data/godPaths/yha_nthlei.ts` — remove 3 options + rebalance 1.
- **Modify** `src/data/godPaths/shub_niggurath.ts` — remove 4 options.
- **Modify** `src/data/godPaths/nyarlathotep.ts` — remove 5 options + rebalance 2.

No new tests. Existing vitest suite + `tsc --noEmit` are the safety nets. Each task ends with `npx vitest run` and `npx tsc --noEmit`.

---

### Task 1: Y'ha-nthlei — remove 3, rebalance 1

**File:** `src/data/godPaths/yha_nthlei.ts`

- [ ] **Step 1: Remove `yha_nthlei_2` opt 3 "Leave it outside"**

Delete this whole option block (currently around lines 88-97):

```ts
      {
        label: 'Leave it outside',
        flavourText: 'By the third day the neighbours had started to notice.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'neighbour_has_concerns', position: 'random', minPos: 3, maxPos: 5 },
          // Card returns in 4–6 draws
          { type: 'insertCard', cardId: 'yha_nthlei_2', position: 'random', minPos: 4, maxPos: 6 },
        ],
      },
```

After removal, `yha_nthlei_2.options` contains 2 items: "Keep it" and "Send someone to return it to the refinery".

- [ ] **Step 2: Remove `yha_nthlei_3` opt 2 "Let him attend" and opt 3 "Turn him away"**

Delete both option blocks (currently around lines 122-143):

```ts
      {
        label: 'Let him attend',
        flavourText: 'He has been here six times now. Some of our people have started standing at the back as well.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -2 },
          // Card returns 7–11 draws out at flat cost.
          { type: 'insertCard', cardId: 'yha_nthlei_3', position: 'random', minPos: 7, maxPos: 11 },
        ],
      },
      {
        // Disappears after being chosen once — you can't turn him away twice.
        label: 'Turn him away',
        flavourText: 'He nodded and left. He was back the following week. We didn\'t try again.',
        hideWhenUnavailable: true,
        condition: { type: 'not', condition: { type: 'cardOptionChosen', cardId: 'yha_nthlei_3', optionIdx: 2 } },
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          // Card returns 7–11 draws out
          { type: 'insertCard', cardId: 'yha_nthlei_3', position: 'random', minPos: 7, maxPos: 11 },
        ],
      },
```

Also update the comment block above `yha_nthlei_3` (around lines 101-104) — delete the third comment line:

```ts
  // ─── Card 3: THE INNSMOUTH LOOK ──────────────────────────────────────────
  // Mid chain. First moment avoidance has a real cost. Dread pressure begins.
  // "Turn him away" option should not reappear after being chosen once;
  // this requires engine-level option-state tracking (TODO).
```

becomes:

```ts
  // ─── Card 3: THE INNSMOUTH LOOK ──────────────────────────────────────────
  // Mid chain. First moment avoidance has a real cost. Dread pressure begins.
  // Inevitable narrative beat — "Approach him" is the only path forward.
```

After removal, `yha_nthlei_3.options` contains 1 item: "Approach him". This is intentional — card 3 becomes a forced pass-through per the spec §Balance impact.

- [ ] **Step 3: Rebalance `yha_nthlei_4` opt 2 "Request more time" — drop `influence -1`**

Find this option (currently around lines 170-179):

```ts
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

Delete the `{ type: 'resource', resource: 'influence', delta: -1 },` line so the option becomes:

```ts
      {
        label: 'Request more time',
        flavourText: 'More time was not refused. The shape waited while we discussed it. We were aware of it waiting.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          // Card returns 3–5 draws out
          { type: 'insertCard', cardId: 'yha_nthlei_4', position: 'random', minPos: 3, maxPos: 5 },
        ],
      },
```

- [ ] **Step 4: Verify**

Run: `npx vitest run`
Expected: all PASS.

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/data/godPaths/yha_nthlei.ts
git commit -m "feat(EX-08): yha-nthlei dead-branch removal + card 4 rebalance"
```

---

### Task 2: Shub-Niggurath — remove 4

**File:** `src/data/godPaths/shub_niggurath.ts`

- [ ] **Step 1: Remove `shub_niggurath_1` opt 3 "Ignore it"**

Delete this whole option block (currently around lines 32-40):

```ts
      {
        label: 'Ignore it',
        flavourText: 'The offerings continued. They became more correct over time.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'removeCard', cardId: 'shub_niggurath_1' },
          { type: 'insertCard', cardId: 'shub_niggurath_1', position: 'random', minPos: 4, maxPos: 8 },
        ],
      },
```

After removal, `shub_niggurath_1.options` contains 2 items: "Make contact", "Leave a counter-offering".

- [ ] **Step 2: Remove `shub_niggurath_2` opt 3 "Postpone"**

Delete this whole option block (currently around lines 87-95):

```ts
      {
        label: 'Postpone',
        flavourText: 'The air is still warm and summer will last long. We will have time, even if something will be less pleased.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'removeCard', cardId: 'shub_niggurath_2' },
          { type: 'insertCard', cardId: 'shub_niggurath_2', position: 'random', minPos: 4, maxPos: 8 },
        ],
      },
```

After removal, `shub_niggurath_2.options` contains 2 items: the two "Conduct" options.

- [ ] **Step 3: Remove `shub_niggurath_3` opt 3 "Chase it off"**

Delete this whole option block (currently around lines 136-145):

```ts
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

After removal, `shub_niggurath_3.options` contains 2 items: "Claim it formally", "Feed it".

- [ ] **Step 4: Remove `shub_niggurath_4` opt 3 "Disperse them and lock the barn"**

Delete this whole option block (currently around lines 187-197):

```ts
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

After removal, `shub_niggurath_4.options` contains 2 items: "Lead the congregation", "Observe what unfolds".

- [ ] **Step 5: Verify**

Run: `npx vitest run`
Expected: all PASS.

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/data/godPaths/shub_niggurath.ts
git commit -m "feat(EX-08): shub-niggurath dead-branch removal"
```

---

### Task 3: Nyarlathotep — remove 5, rebalance 2

**File:** `src/data/godPaths/nyarlathotep.ts`

- [ ] **Step 1: Rebalance `nyarlathotep_1` opt 2 "Distribute pamphlets" — add `followers +1`**

Find this option (currently around lines 55-63):

```ts
      {
        label: 'Distribute pamphlets in the lobby',
        flavourText: "The class was full, but will come back next week. Better make the most of it.",
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
```

Add a `followers +1` effect so the option becomes:

```ts
      {
        label: 'Distribute pamphlets in the lobby',
        flavourText: "The class was full, but will come back next week. Better make the most of it.",
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
```

- [ ] **Step 2: Remove `nyarlathotep_1` opt 3 "Do not attend"**

Delete this whole option block (currently around lines 64-70):

```ts
      {
        label: 'Do not attend',
        flavourText: 'Two of our people went. We didn\'t. They went past us when exiting.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
        ],
      },
```

After steps 1-2, `nyarlathotep_1.options` contains 2 items: "Attend and make introductions" (advance), the rebalanced "Distribute pamphlets".

- [ ] **Step 3: Remove `nyarlathotep_2` opt 3 "Submit a letter of concern" and opt 4 "Walk through anyway"**

Delete both option blocks (currently around lines 111-126):

```ts
      {
        label: 'Submit a letter of concern to the university',
        flavourText: 'The university thanked us for our concern. The exhibit extended its run by three weeks.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
      {
        label: 'Walk through anyway',
        flavourText: 'The catalogue was free. You took one. You put it down somewhere and it was gone when you looked back.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

After removal, `nyarlathotep_2.options` contains 2 items: "Sponsor the exhibit", "Arrange a private viewing".

- [ ] **Step 4: Remove `nyarlathotep_3` opt 3 "Discourage the meetings"**

Delete this whole option block (currently around lines 163-170):

```ts
      {
        label: 'Discourage the meetings',
        flavourText: 'They stopped meeting at the crossroads. They started meeting elsewhere.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
```

After removal, `nyarlathotep_3.options` contains 2 items: "Encourage the meetings", "Observe without intervening".

- [ ] **Step 5: Remove `nyarlathotep_4` opt 3 "Secure the book"**

Delete this whole option block (currently around lines 210-217):

```ts
      {
        label: 'Secure the book',
        flavourText: 'We secured it in a locked cabinet. It was in a different location the next morning. The lock was intact.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'nyarlathotep_4', position: 'random', minPos: 2, maxPos: 3 },
        ],
      },
```

After removal, `nyarlathotep_4.options` contains 2 items: "Formalise a study group", "Let it circulate freely".

- [ ] **Step 6: Rebalance `nyarlathotep_5` opt 2 "Destroy the equipment" — soften to I-2 D+2**

Find this option (currently around lines 242-251):

```ts
      {
        label: 'Destroy the equipment',
        flavourText: 'The humming continued. The followers started repairing the radio the following day.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -3 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'insertCard', cardId: 'nyarlathotep_5', position: 'random', minPos: 7, maxPos: 9 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 3 },
      },
```

Change `influence delta -3 → -2` and `dread delta 3 → 2`. Keep the `influence ≥ 3` gate. Result:

```ts
      {
        label: 'Destroy the equipment',
        flavourText: 'The humming continued. The followers started repairing the radio the following day.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'nyarlathotep_5', position: 'random', minPos: 7, maxPos: 9 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 3 },
      },
```

- [ ] **Step 7: Verify**

Run: `npx vitest run`
Expected: all PASS.

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add src/data/godPaths/nyarlathotep.ts
git commit -m "feat(EX-08): nyarlathotep dead-branch removal + rebalances"
```

---

### Task 4: Final verification

**No file edits — verification only.**

- [ ] **Step 1: Confirm option counts per card**

Open each affected card in the source and verify `.options.length`:

- `yha_nthlei_2` → 2
- `yha_nthlei_3` → 1
- `yha_nthlei_4` → 3
- `shub_niggurath_1` → 2
- `shub_niggurath_2` → 2
- `shub_niggurath_3` → 2
- `shub_niggurath_4` → 2
- `nyarlathotep_1` → 2
- `nyarlathotep_2` → 2
- `nyarlathotep_3` → 2
- `nyarlathotep_4` → 2
- `nyarlathotep_5` → 2

Use the Grep tool to count `label:` lines inside each card block; or open each file and count manually.

- [ ] **Step 2: Confirm no orphan references to deleted option indices**

Run Grep for `optionIdx:` across `src/`:

Expected: zero matches anywhere in `src/data/` (the only consumer was `yha_nthlei_3` opt 3 condition, now removed).

If any match remains in `src/data/`, investigate — there may be a `cardOptionChosen` reference to a now-deleted option index.

- [ ] **Step 3: Full test sweep**

Run: `npx vitest run`
Expected: all PASS.

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Confirm three commits landed**

Run: `git log --oneline -4`
Expected: three `feat(EX-08): ...` commits from tasks 1-3 plus the earlier spec commit.

No commit required for this task — verification only.

---

## Self-Review

- **Spec coverage:** all 15 items from spec §A and §B mapped to specific step:
  - §A removes 1-3 (yha) → Task 1 Steps 1-2.
  - §A removes 4-7 (shub) → Task 2 Steps 1-4.
  - §A removes 8-12 (nyar) → Task 3 Steps 2, 3 (×2), 4, 5.
  - §B rebalances 13-15 → Task 1 Step 3, Task 3 Step 1, Task 3 Step 6.
  - §D verification → Task 4.
- **Placeholder scan:** zero TODO/TBD/"similar to" in plan body. The single "(TODO)" string survives only in deleted code blocks — fine because those blocks are being removed.
- **Type consistency:** all edits operate on existing `Card.options[].effects[]` entries — no new types, signatures, or properties introduced. `cardOptionChosen` reference removed cleanly with its single consumer.
