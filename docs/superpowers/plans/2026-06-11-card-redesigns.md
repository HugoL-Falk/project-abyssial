# Card Redesigns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply six card redesigns (P9-35, P9-36, P10-20, P10-22, P13-26, P13-27) as pure card-data edits.

**Architecture:** All changes are isolated edits to card definitions in `src/data/cards/*.ts`. No engine, type, or UI changes required (verified during plan writing — see spec). Each task touches one card in one file, runs `npm run typecheck`, then commits.

**Tech Stack:** TypeScript card data, no test framework (verification via `npm run typecheck` and manual playtest).

**Spec:** `docs/superpowers/specs/2026-06-11-card-redesigns-design.md`

---

## Task Order Rationale

Tasks are ordered low-risk to high-risk:
1. P9-35 verify (no code change)
2. P9-36 (`what_was_already_read`) — add option + voice fix + comment
3. P13-27 (`stranger_asks_questions` opt 2) — single option edit
4. P10-20 (`the_census_agent` opt 3) — single condition addition
5. P10-22 (`the_thing_in_the_tank`) — full rewrite, single card
6. P13-26 (`clarence`) — full rewrite, conditions, onDraw removal

After each task: `npm run typecheck` must pass before committing.

---

## File Locations Reference

| Card | File | Approx line |
|---|---|---|
| `changed_follower` | `src/data/cards/special.ts` | 5 |
| `stranger_asks_questions` | `src/data/cards/core.ts` | 39 |
| `the_census_agent` | `src/data/cards/core.ts` | 519 |
| `clarence` | `src/data/cards/rare.ts` | 146 |
| `what_was_already_read` | `src/data/cards/threats.ts` | 845 |
| `the_thing_in_the_tank` | `src/data/cards/threats.ts` | 996 |

---

## Task 1: P9-35 — Verify `changed_follower` already works

**Files:**
- Verify only: `src/data/cards/special.ts:5-122`
- Verify only: `src/components/game/DrawnCard.tsx:80-162` (CardPassiveTag with hasAccum branch)

**No code changes.** This task verifies that the existing `accumulates: true` flag on `changed_follower` already triggers the UI tooltip *"Evolves — options change with each encounter."* via `CardPassiveTag`.

- [ ] **Step 1: Verify `accumulates: true` is set**

Run: `grep -n "accumulates: true" "E:/Project Abyssial/Code/project-abyssial/src/data/cards/special.ts"`
Expected output: One match on `changed_follower` around line 9.

- [ ] **Step 2: Verify `CardPassiveTag` renders the hint for accumulating cards**

Read `src/components/game/DrawnCard.tsx` lines 80–162. Confirm:
- `hasAccum = !!card.accumulates` (around line 88)
- Tooltip block renders `"Evolves — options change with each encounter."` when `hasAccum` is true (around line 154)

- [ ] **Step 3: Manual playtest (defer to verification checklist at end)**

In running game: draw `changed_follower`, look for a `?` button on the card, click it, confirm "Evolves — options change with each encounter." text appears.

- [ ] **Step 4: No commit needed**

This task produces no code change. Move to Task 2.

---

## Task 2: P9-36 — `what_was_already_read` redesign

**Files:**
- Modify: `src/data/cards/threats.ts:840-869`

The change adds a new "File it away" option, revises the card body flavour text, and corrects the stale comment block.

- [ ] **Step 1: Apply the full card replacement**

Replace lines 840–869 of `src/data/cards/threats.ts` with this exact block:

```ts
  {
    // Inserted by the_old_book — "Burn it".
    // Normal case: Dread +1, card goes to discard (reshuffles back).
    // High-dread case (dread ≥8): surfaces god path card.
    // uniqueInDeck: capped to 1 copy — second insertion is silently skipped.
    id: 'what_was_already_read',
    title: 'What Was Already Read',
    flavourText: "The first page was all it needed.",
    tier: 'threat',
    uniqueInDeck: true,
    options: [
      {
        label: 'Acknowledge it',
        flavourText: 'You remember it. The cost of remembering is predictable.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'what_was_already_read', position: 'random', minPos: 5, maxPos: 8 },
        ],
        condition: { type: 'resourceMax', resource: 'dread', max: 7 },
      },
      {
        label: 'File it away',
        flavourText: 'Two of the contacts charge by the hour. Neither asks what it is for.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMax', resource: 'dread', max: 7 },
            { type: 'resourceMin', resource: 'gold', min: 2 },
          ],
        },
        hideWhenUnavailable: true,
      },
      {
        label: 'The words arrange themselves',
        flavourText: 'At the edge of collapse, the text completes its purpose. The path advances.',
        effects: [
          { type: 'surfaceGodPathCard' },
        ],
        condition: { type: 'resourceMin', resource: 'dread', min: 8 },
      },
    ],
  },
```

Changes from current code:
- Card body flavour text: `"You only read the first page. That's all that was needed."` → `"The first page was all it needed."` (voice fix — remove direct "you" address)
- Comment block: remove `; the_seance — "Let them do it alone"` (stale — that option inserts `wandering_soul`)
- Comment block: `advances god path instead` → `surfaces god path card`
- New middle option "File it away" (gold −2, exits, `hideWhenUnavailable: true`)

- [ ] **Step 2: Run typecheck**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm run typecheck`
Expected: passes with no errors.

If it fails, the most likely issue is `hideWhenUnavailable` syntax — verify it sits at the same indentation level as `condition` and `effects`, not inside them.

- [ ] **Step 3: Commit**

```bash
cd "E:/Project Abyssial/Code/project-abyssial"
git add src/data/cards/threats.ts
git commit -m "fix(P9-36): what_was_already_read — add 'File it away' exit, voice fix, comment fix"
```

---

## Task 3: P13-27 — `stranger_asks_questions` opt 2

**Files:**
- Modify: `src/data/cards/core.ts:61-70` (opt 2 only)

Strip the duplicate `removeCard investigators_file` from opt 2, drop `dreadPressureScaling`, and add `influence +1` to differentiate from opt 0.

- [ ] **Step 1: Locate the option**

Read `src/data/cards/core.ts:61-70` to confirm the current opt 2 block:

```ts
      {
        label: 'Bring him to a meeting',
        flavourText: 'He attends out of professional curiosity. He stops asking questions. He starts asking different ones.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'removeCard', cardId: 'investigators_file' },
        ],
      },
```

- [ ] **Step 2: Replace with the new version**

Use the Edit tool with:

old_string:
```
      {
        label: 'Bring him to a meeting',
        flavourText: 'He attends out of professional curiosity. He stops asking questions. He starts asking different ones.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'removeCard', cardId: 'investigators_file' },
        ],
      },
```

new_string:
```
      {
        label: 'Bring him to a meeting',
        flavourText: 'He attends out of professional curiosity. He stops asking questions. He starts asking different ones.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
```

Changes:
- Remove `dreadPressureScaling: true`
- Remove `{ type: 'removeCard', cardId: 'investigators_file' }`
- Add `{ type: 'resource', resource: 'influence', delta: 1 }` between followers and dread

- [ ] **Step 3: Run typecheck**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
cd "E:/Project Abyssial/Code/project-abyssial"
git add src/data/cards/core.ts
git commit -m "fix(P13-27): stranger_asks_questions opt 2 — strip duplicate removeCard, add inf+1, drop scaling"
```

---

## Task 4: P10-20 — `the_census_agent` opt 3 condition

**Files:**
- Modify: `src/data/cards/core.ts:539-553` (opt 3 condition only)

Gate opt 3 on `hasCard` OR-clause across the 4 investigation cards, combined with the existing `followers ≥ 2` requirement.

- [ ] **Step 1: Locate the current condition**

Read `src/data/cards/core.ts:539-553` to confirm the current opt 3 block:

```ts
      {
        label: 'Make the problem go away',
        flavourText: 'Clarence handled it. Clarence always handles it. You do not ask how.',
        dreadPressureScaling: true,
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
```

- [ ] **Step 2: Replace the condition only**

Use the Edit tool with:

old_string:
```
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
    ],
  },
  {
    id: 'local_elections',
```

new_string:
```
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'followers', min: 2 },
            {
              type: 'or',
              conditions: [
                { type: 'hasCard', cardId: 'investigators_file' },
                { type: 'hasCard', cardId: 'the_detective' },
                { type: 'hasCard', cardId: 'arson_inspector' },
                { type: 'hasCard', cardId: 'missing_persons' },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'local_elections',
```

The trailing context (`local_elections`) anchors the edit to the correct census_agent option (since `resourceMin followers, min: 2` may appear elsewhere).

- [ ] **Step 3: Run typecheck**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm run typecheck`
Expected: passes. If `hasCard` is unrecognised, double-check the type union in `src/types/index.ts` line 48.

- [ ] **Step 4: Commit**

```bash
cd "E:/Project Abyssial/Code/project-abyssial"
git add src/data/cards/core.ts
git commit -m "fix(P10-20): the_census_agent opt 3 — gate on hasCard OR investigation threats"
```

---

## Task 5: P10-22 — `the_thing_in_the_tank` overhaul

**Files:**
- Modify: `src/data/cards/threats.ts:994-1036`

Full rewrite of all three options plus card body flavour text. Replaces `surfaceChainCard` with `surfaceGodPathCard`, rewires "Feed it" and "Release it", removes `dreadPressureScaling` (none was present), updates all flavour text.

- [ ] **Step 1: Confirm current card structure**

Read `src/data/cards/threats.ts:994-1036` to confirm the current card spans those lines and starts with the comment line about being inserted by `something_on_the_hook`.

- [ ] **Step 2: Replace the entire card block**

Use the Edit tool with:

old_string:
```
  {
    // Inserted by something_on_the_hook — "Keep it". Card stays in deck (no removeCard on most options).
    id: 'the_thing_in_the_tank',
    title: 'The Thing in the Tank',
    flavourText: "It's learned to tap on the glass. You've learned what the tapping means. This was probably a mistake.",
    tier: 'threat',
    options: [
      {
        // Dread +2, then shuffle the next chain card to positions 2–4 in the draw pile.
        label: 'Listen to it',
        flavourText: 'The tapping has a pattern. The pattern has meaning. The meaning is useful.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'surfaceChainCard', minPos: 2, maxPos: 4 },
          { type: 'insertCard', cardId: 'the_thing_in_the_tank', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
      {
        label: 'Feed it',
        flavourText: 'It seems satisfied. Temporarily.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'insertCard', cardId: 'the_thing_in_the_tank', position: 'random', minPos: 5, maxPos: 8 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'gold', min: 1 },
            { type: 'resourceMin', resource: 'followers', min: 2 },
          ],
        },
      },
      {
        label: 'Release it',
        flavourText: 'You carry the tank to the shore. The water accepts the offering. The thing goes.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -3 },
          { type: 'resource', resource: 'influence', delta: -1 },
        ],
      },
    ],
  },
```

new_string:
```
  {
    // Inserted by something_on_the_hook — "Keep it". Recurs until "Release it" exits.
    id: 'the_thing_in_the_tank',
    title: 'The Thing in the Tank',
    flavourText: "It learned to tap on the glass. We learned what the tapping means. This was probably a mistake.",
    tier: 'threat',
    options: [
      {
        // Unconditional option — satisfies allBlocked invariant.
        // Dread +3, +1 influence, surfaces next god path card, then reinserts.
        label: 'Listen to it',
        flavourText: 'The tapping had a meaning. It was legible. That was worse.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'surfaceGodPathCard' },
          { type: 'insertCard', cardId: 'the_thing_in_the_tank', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
      {
        // Middle-ground deferral with dread relief — costs both gold and a follower.
        label: 'Feed it',
        flavourText: 'One of ours goes down with the pail. The tapping stops. Presently, they come back up.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'insertCard', cardId: 'the_thing_in_the_tank', position: 'random', minPos: 5, maxPos: 8 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'gold', min: 1 },
            { type: 'resourceMin', resource: 'followers', min: 2 },
          ],
        },
      },
      {
        // Permanent exit. Costs a follower (narratively: someone goes with the tank).
        label: 'Release it',
        flavourText: 'The tank goes to the shore. The water accepts the offering. The thing goes.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -3 },
          { type: 'resource', resource: 'followers', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
    ],
  },
```

Key changes:
- Card body: `"It's learned"` → `"It learned"`; `"You've learned"` → `"We learned"` (voice fix)
- Comment block: removed inline option-level comment; added top-level note about recurrence
- "Listen to it": `surfaceChainCard` → `surfaceGodPathCard`; added `inf +1`; dread `+2` → `+3`; new flavour
- "Feed it": added `dread −1`; new flavour
- "Release it": `inf −1` → `fol −1`; added `condition: followers ≥ 2`; new flavour

- [ ] **Step 3: Run typecheck**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm run typecheck`
Expected: passes.

Potential failure: if `surfaceGodPathCard` requires `minPos`/`maxPos` fields you'd see a type error. The effect type definition at `src/types/index.ts` should show it as `{ type: 'surfaceGodPathCard' }` with no required fields. If a failure occurs there, read that section of `types/index.ts` to verify.

- [ ] **Step 4: Commit**

```bash
cd "E:/Project Abyssial/Code/project-abyssial"
git add src/data/cards/threats.ts
git commit -m "fix(P10-22): the_thing_in_the_tank overhaul — surfaceGodPathCard, dread relief on feed, fol cost on release"
```

---

## Task 6: P13-26 — `clarence` full rewrite

**Files:**
- Modify: `src/data/cards/rare.ts:142-182`

Full rewrite. Removes the invisible `onDraw` auto-removal, adds influence/gold costs to both active options, adds resource gates and `hasCard` OR conditions.

- [ ] **Step 1: Confirm current card structure**

Read `src/data/cards/rare.ts:142-182` to confirm the current card.

- [ ] **Step 2: Replace the entire card block**

Use the Edit tool with:

old_string:
```
  {
    // Named follower — rare boon card.
    // onDraw auto-removes what_was_done if present (Clarence's special ability).
    // One use: each active option removes clarence from the deck permanently.
    id: 'clarence',
    title: 'Clarence',
    flavourText: "He doesn't ask questions. This is either his greatest virtue or your greatest concern.",
    tier: 'rare',
    onDraw: [
      { type: 'removeCard', cardId: 'what_was_done' },
    ],
    options: [
      {
        label: 'Remove investigation threats',
        flavourText: 'He handled the investigators. You do not ask how. You will not ask.',
        effects: [
          { type: 'removeCard', cardId: 'investigators_file' },
          { type: 'removeCard', cardId: 'the_detective' },
          { type: 'removeCard', cardId: 'arson_inspector' },
          { type: 'removeCard', cardId: 'missing_persons' },
          { type: 'removeCard', cardId: 'clarence' },
        ],
      },
      {
        label: 'Bury the record',
        flavourText: 'The loose ends are tidied. Clarence is thorough about tidying.',
        effects: [
          { type: 'removeCard', cardId: 'loose_end' },
          { type: 'removeCard', cardId: 'their_report' },
          { type: 'removeCard', cardId: 'their_suspicion' },
          { type: 'removeCard', cardId: 'what_was_done' },
          { type: 'removeCard', cardId: 'clarence' },
        ],
      },
      {
        label: 'Not yet',
        flavourText: 'He waits. He is very good at waiting.',
        effects: [],
      },
    ],
  },
```

new_string:
```
  {
    // Named follower — rare boon card. One-use: active options remove clarence.
    // No onDraw — was previously auto-removing what_was_done invisibly even on "Not yet".
    // Influence cost reflects political capital spent calling in favours.
    // Each active option requires at least one of its target cards to be in the deck (hasCard OR).
    id: 'clarence',
    title: 'Clarence',
    flavourText: "He doesn't ask questions. This is either his greatest virtue or your greatest concern.",
    tier: 'rare',
    options: [
      {
        label: 'Remove investigation threats',
        flavourText: 'He handled the investigators. You do not ask how. You will not ask.',
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'influence', min: 3 },
            {
              type: 'or',
              conditions: [
                { type: 'hasCard', cardId: 'investigators_file' },
                { type: 'hasCard', cardId: 'the_detective' },
                { type: 'hasCard', cardId: 'arson_inspector' },
                { type: 'hasCard', cardId: 'missing_persons' },
              ],
            },
          ],
        },
        effects: [
          { type: 'resource', resource: 'influence', delta: -3 },
          { type: 'removeCard', cardId: 'investigators_file' },
          { type: 'removeCard', cardId: 'the_detective' },
          { type: 'removeCard', cardId: 'arson_inspector' },
          { type: 'removeCard', cardId: 'missing_persons' },
          { type: 'removeCard', cardId: 'clarence' },
        ],
      },
      {
        label: 'Bury the record',
        flavourText: 'The loose ends are tidied. Clarence is thorough about tidying.',
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'influence', min: 1 },
            { type: 'resourceMin', resource: 'gold', min: 1 },
            {
              type: 'or',
              conditions: [
                { type: 'hasCard', cardId: 'loose_end' },
                { type: 'hasCard', cardId: 'their_report' },
                { type: 'hasCard', cardId: 'their_suspicion' },
                { type: 'hasCard', cardId: 'what_was_done' },
              ],
            },
          ],
        },
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'removeCard', cardId: 'loose_end' },
          { type: 'removeCard', cardId: 'their_report' },
          { type: 'removeCard', cardId: 'their_suspicion' },
          { type: 'removeCard', cardId: 'what_was_done' },
          { type: 'removeCard', cardId: 'clarence' },
        ],
      },
      {
        // Unconditional fallback — satisfies allBlocked invariant.
        label: 'Not yet',
        flavourText: 'He waits. He is very good at waiting.',
        effects: [],
      },
    ],
  },
```

Key changes:
- `onDraw: [...]` block — REMOVED entirely (and field omitted from card)
- "Remove investigation threats": added `condition` (inf ≥ 3 AND OR-of-4-hasCard); added `inf −3` to effects
- "Bury the record": added `condition` (inf ≥ 1 AND gold ≥ 1 AND OR-of-4-hasCard); added `inf −1, gold −1` to effects
- "Not yet": unchanged
- Comment block: revised to reflect new design

- [ ] **Step 3: Run typecheck**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm run typecheck`
Expected: passes.

Potential failure: if `hasCard` doesn't accept a string cardId, double-check `src/types/index.ts` line 48 for the actual signature. The card mechanics agent confirmed it's `{ type: 'hasCard'; cardId: CardId }` where `CardId` may be a string union.

- [ ] **Step 4: Commit**

```bash
cd "E:/Project Abyssial/Code/project-abyssial"
git add src/data/cards/rare.ts
git commit -m "fix(P13-26): clarence — add inf costs, hasCard gating, remove invisible onDraw"
```

---

## Final Verification

After all six tasks are committed:

- [ ] **Step 1: Run full typecheck**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm run typecheck`
Expected: passes with no errors.

- [ ] **Step 2: Run a build**

Run: `cd "E:/Project Abyssial/Code/project-abyssial" && npm run build`
Expected: completes without errors. (A successful build implies typecheck pass + Vite bundling works.)

- [ ] **Step 3: Manual playtest checklist**

Start dev server: `npm run dev`. In the running game verify:

- [ ] Draw `what_was_already_read` at dread ≤ 7 with gold ≥ 2 → see "File it away" option; pick it → card removed permanently, gold −2
- [ ] Draw `what_was_already_read` at dread ≤ 7 with gold < 2 → "File it away" is hidden (not just greyed)
- [ ] Draw `what_was_already_read` at dread ≥ 8 → see "The words arrange themselves" with `?` tooltip ("Surfaces next God Path card"); pick it → next god path card surfaces to 3rd in draw pile
- [ ] Draw `changed_follower` for the first time → see `?` button on card; click → tooltip reads "Evolves — options change with each encounter."
- [ ] Draw `the_census_agent` in a fresh run (no investigation cards in deck) → "Make the problem go away" is visible but greyed
- [ ] Draw `the_census_agent` with at least one investigation card → option is active
- [ ] Draw `the_thing_in_the_tank` and pick "Listen to it" → dread +3, inf +1, god path card surfaces, card reinserts
- [ ] Draw `the_thing_in_the_tank` and pick "Feed it" → gold −1, fol −1, dread −1
- [ ] Draw `the_thing_in_the_tank` at fol < 2 → only "Listen to it" available
- [ ] Draw `clarence` with no relevant threats in deck → only "Not yet" is available
- [ ] Draw `clarence` with investigation threats present and inf ≥ 3 → "Remove investigation threats" available; on selection inf −3, all matching investigation cards removed
- [ ] Draw `clarence` and pick "Not yet" → no resource change; verify `what_was_done` is NOT silently removed (if `what_was_done` was in deck, it should still be there after picking "Not yet")
- [ ] Draw `stranger_asks_questions` and pick "Bring him to a meeting" → fol +1, inf +1, dread +2 (no scaling badge visible); `investigators_file` NOT removed

- [ ] **Step 4: Update session-66.md**

After verification passes, append the implementation completion notes to `E:/Project Abyssial/knowledge/sessions/session-66.md` (or write session-67.md if this happens in a new session). Include commit hashes from each task.

---

## Self-Review Notes

**Spec coverage:**
- P9-35 — Task 1 (verify only)
- P9-36 — Task 2
- P10-20 — Task 4
- P10-22 — Task 5
- P13-26 — Task 6
- P13-27 — Task 3
- All six covered.

**Placeholder scan:** No TBDs, all code blocks contain full content, all file paths absolute or repo-relative.

**Type consistency:**
- `hasCard` used consistently across Tasks 4 and 6
- `surfaceGodPathCard` used in Tasks 2 and 5 — confirmed real type
- `dreadPressureScaling` removed in Tasks 3 (stranger) only — not present on the_thing_in_the_tank
- `hideWhenUnavailable` used in Task 2 — option-level field, confirmed in current codebase

**Risk areas:**
1. Task 4's anchor uses `local_elections` as trailing context — if the order of cards in core.ts changes between plan writing and execution, the edit may not match. Worker should read the file first to confirm.
2. Task 6 removes a field (`onDraw`) — engine must tolerate the absence cleanly. `onDraw` is already optional (`onDraw?: Effect[]` in types), so this is safe.
3. The verification playtest is mostly state-dependent — testers may need to seed the deck or play many turns to reach scenarios. Document any blockers and consider adding a debug card-spawn tool if blockers are persistent (out of scope here).
