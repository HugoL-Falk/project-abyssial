# T3 — Card Balance Batch (P17-7, P17-8, P17-18, P17-19, P17-20, P18-8, P18-16)

**Date:** 2026-06-24
**Source backlog cluster:** T3 — Card balance / rebalance specifics
**Scope:** 7 card balance tweaks, 1 engine addition (`notHasPrepTag`), 1 bug fix (deficit/overflow batch-deferred check).

## Goals

1. Resolve P17/P18 card-specific balance feedback in one pass.
2. Land one small engine primitive (`notHasPrepTag`) that other one-shot options can reuse.
3. Fix a latent resource-resolution bug where intermediate zero-states trigger deficit insertion that the same batch immediately heals.

## Out of scope

- Cluster T1 tutorial redesign (deferred).
- Cluster T2 — already closed s93.
- Bigger inheritance rework — only the dread-strip + opt2 rebalance + bug fix.
- Balance review of options not flagged this batch (e.g. `word_spreads` opt1 / opt2 baseline).

---

## 1. P17-7 — `word_spreads` opt3 dread buff

**File:** `src/data/cards/common.ts` (~L107–116)

Bump opt3 "Produce credentials" dread heal from `-2` to `-3`. Relic cost, influence gain, and `relics ≥ 1` gate all preserved.

```diff
 {
   label: 'Produce credentials',
   flavourText: 'The credentials are presented. No one examines them closely. This is normal.',
   effects: [
     { type: 'resource', resource: 'relics', delta: -1 },
-    { type: 'resource', resource: 'dread', delta: -2 },
+    { type: 'resource', resource: 'dread', delta: -3 },
     { type: 'resource', resource: 'influence', delta: 1 },
   ],
   condition: { type: 'resourceMin', resource: 'relics', min: 1 },
 },
```

**Rationale:** Balance agent flagged that a free-of-relic shape would dominate opt2 (`-1 inf, -1 dread`). Keeping relic cost preserves input-resource diversity; the dread buff makes the relic spend feel worth it (was the original user concern).

**Tests:** No new test — covered by existing card-definition smoke tests.

---

## 2. P17-8 — `innsmouth_look_marked` second option

**File:** `src/data/cards/threats.ts` (~L1230–1249)

Add a second option. Opt1 ("You know what you are") kept unchanged.

```ts
{
  // New: trade influence for follower density. The marked recognise each other.
  label: 'Find your own',
  flavourText: 'The other marked close around you. Some of them don\'t leave when the conversation ends.',
  effects: [
    { type: 'resource', resource: 'influence', delta: -2 },
    { type: 'resource', resource: 'followers', delta: 1 },
  ],
  condition: { type: 'resourceMin', resource: 'influence', min: 2 },
},
```

Full draw if opt2 picked: `+1g, +2f, -2 inf, +2 dread` (onDraw resolves first per existing engine).

**Rationale:** Card was a 1-option "press OK" with onDraw doing all the work. Adds a meaningful fork: accept the mark plainly (opt1), or lean into the marked community at influence cost (opt2). Yha-thematic.

**Gate:** `influence ≥ 2` so the option can resolve cleanly (avoids -2 against 0/1 influence).

**Tests:** Add card-snapshot test confirming opt2 exists with the gate.

---

## 3. P17-18 — `his_research_notes` redesign

**File:** `src/data/cards/treats.ts` (~L97–121)

Strip the passive + onDraw, replace single noop option with two active options.

```diff
 {
   id: 'his_research_notes',
   title: 'His Research Notes',
   permanent: true,
   flavourText: 'Forty years of work. Impeccable sourcing. Absolutely no conclusions drawn, because drawing the conclusion would require accepting what the evidence means.',
   tier: 'treat',
-  passive: {
-    trigger: 'reshuffle',
-    effects: [
-      { type: 'resource', resource: 'relics', delta: 1 },
-    ],
-  },
-  onDraw: [
-    { type: 'resource', resource: 'dread', delta: 1 },
-  ],
   options: [
     {
       label: 'Consult the notes',
-      flavourText: 'The work continues. So does the benefit.',
-      effects: [],
+      flavourText: 'A relic surfaces from the marginalia. So does the cost.',
+      effects: [
+        { type: 'resource', resource: 'relics', delta: 1 },
+        { type: 'resource', resource: 'dread', delta: 3 },
+      ],
+    },
+    {
+      label: 'Lose yourself in the margins',
+      flavourText: 'The footnotes alone are a year\'s reading. By the time you look up, the room is dark and the dread has settled.',
+      effects: [
+        { type: 'resource', resource: 'dread', delta: -2 },
+      ],
     },
   ],
 },
```

`permanent: true` preserved — card remains a recurring active fork (claim a relic at heavy dread cost, or use the library to steady yourself).

**Rationale:** Post P13-24 rare-rotation, passive treats inserted by rares became too set-and-forget. Converting to per-encounter choice restores agency.

**Tests:** Snapshot test for the new option shape.

---

## 4. P17-19 — `dreaming_academic` text trims

**File:** `src/data/cards/rare.ts` (~L72–113)

Two text-only changes:

**Opt1 flavour trim** (3 clauses → 2):

```diff
   {
     label: 'Bring him in',
-    flavourText: 'He arrives at the requested time. The research notes come with him. Whether this is useful or dangerous will become clear shortly.',
+    flavourText: 'He arrives at the requested time. The notes come with him.',
     effects: [ ... ],
   },
```

**Opt2 title shortening:**

```diff
   {
-    label: 'Send him home with a doctored memory',
+    label: 'Doctor his memory',
     flavourText: 'He wakes up with a firm conviction that he attended a dinner party. He seems happier.',
     ...
   },
```

**Rationale:** UI text-density concern. No mechanical change.

**Tests:** None.

---

## 5. P17-20 — `yha_nthlei_2` (Fishmonger's Tiara) one-shot return

### 5a. Engine addition: `notHasPrepTag` condition

**File:** `src/types/index.ts` (condition union)

Add a new condition variant:

```ts
| { type: 'notHasPrepTag'; tag: string }
```

**File:** `src/engine/conditions.ts` (or wherever conditions are evaluated — verify during implementation)

Add evaluation: returns `true` iff `state.prepTags` does **not** include `tag`.

**Rationale:** Existing `hasPrepTag` only supports "tag must be present." For one-shot options that disable after first pick, the natural pattern is `notHasPrepTag(X)` + `setPrepTag(X)` in effects. Reusable for future one-shots.

**Tests:** Unit test for the new condition evaluator (true when tag absent, false when present).

### 5b. Card change

**File:** `src/data/godPaths/yha_nthlei.ts` (~L77–87)

Make opt2 one-shot:

```diff
   {
     label: 'Send someone to return it to the refinery',
     flavourText: 'They didn\'t come back. One of them did, eventually. They were not carrying what we sent. They were carrying something else.',
+    hideWhenUnavailable: true,
+    condition: { type: 'notHasPrepTag', tag: 'tiara_returned_once' },
     effects: [
       { type: 'resource', resource: 'followers', delta: -1 },
       { type: 'resource', resource: 'influence', delta: -1 },
       { type: 'resource', resource: 'relics', delta: 1 },
+      { type: 'setPrepTag', tag: 'tiara_returned_once' },
       { type: 'insertCard', cardId: 'yha_nthlei_2', position: 'random', minPos: 4, maxPos: 6 },
     ],
   },
```

Cost preserved; card still reinserts so player must eventually advance via opt1 or opt3.

**Rationale:** Closes the infinite relic-farm loop. Player can claim the relic once, then must commit to the chain.

**Tests:** Integration test simulating two picks of opt2 in sequence — second should be hidden.

---

## 6. P18-8 — `the_inheritance` rebalance + deficit-batch bug

### 6a. Card change

**File:** `src/data/cards/common.ts` (~L8–48)

Opt1 unchanged. Opt2 drops dread and trims gold gain. Opt3 unchanged (Balance agent flagged that dropping dread there would breach the free-option ceiling).

```diff
   {
     label: 'Have a quiet word',
     flavourText: 'The family withdrew their objections. Quietly and without further questions.',
     effects: [
       { type: 'resource', resource: 'influence', delta: -1 },
-      { type: 'resource', resource: 'gold', delta: 3 },
-      { type: 'resource', resource: 'dread', delta: 1 },
+      { type: 'resource', resource: 'gold', delta: 2 },
     ],
   },
```

**EV check:** Opt1 EV = `-1 + (2+3+4)/3 = +2 gold` (weighted 1/1/1, variance). New opt2 = `-1 inf, +2 gold` certain. Clean parity: variance vs certainty tradeoff with different input resources.

**Rationale (no opt3 change):** Balance agent flagged that `+1 follower, +1 influence` free would violate the "free option = max +1 of one resource" heuristic. Keeping `+1 dread` on opt3 only is the smallest viable fix.

### 6b. Deficit/overflow batch-deferred check bug

**Bug:** With `the_inheritance` opt1 ("Fight it in court") at 1 gold, the resolution order is:
1. `-1 gold` (gold → 0) → engine inserts `the_ledger_is_noticed` (gold deficit card)
2. `randomOutcome +2/+3/+4 gold` (gold restored)
3. Deficit card is already in deck — but gold is now positive

The deficit-insertion logic fires on intermediate state, not post-batch state.

**Fix sketch:** In the effect resolver (likely `src/state/gameStore.ts::resolveOption` and the dead-mirror in `src/engine/gameLoop.ts`):

1. Collect all resource deltas in the option's effect batch.
2. Apply them in order.
3. **After** the full batch settles, check resource floors for deficit insertion and ceilings for overflow insertion.
4. Mirror identical change in `gameLoop.ts` per dead-code policy.

**Edge case to verify:** What if a batch ends at exactly 0? Should deficit fire then. Spec: check post-batch state — fire if final value crosses the trigger threshold from the pre-batch state. (Or simpler: fire iff post-batch value satisfies the trigger.)

**Investigation step (implementation phase):** Use `systematic-debugging` skill to confirm root cause matches this hypothesis before implementing. There may be other resolution paths (e.g. `randomOutcome` nested effects) that need parallel treatment.

**Tests:**
- Regression test: 1 gold → pick opt1 → roll any branch → `the_ledger_is_noticed` should NOT be in deck.
- Negative test: 1 gold → pick opt2 (`-1 inf, +2 gold`) → no deficit (also confirms no leak).
- Pure-zero test: 2 gold → pick a card with `-2 gold, no gold gain` → deficit DOES fire (current behaviour preserved).
- Pure-zero-with-heal test: 2 gold → pick a card with `-2 gold, +1 gold` → deficit DOES fire (final gold = 1 still, but trigger is at 0; verify desired semantic with user during implementation if ambiguous).

---

## 7. P18-16 — `deliver_a_sermon` resource swap

**File:** `src/data/cards/core.ts` (~L17–27)

Swap influence gain for follower gain, halved per Balance agent recommendation.

```diff
   {
     label: 'Deliver a sermon',
     flavourText: 'You speak for twenty minutes. They leave shaken. That is the correct outcome.',
     dreadPressureScaling: true,
     effects: [
-      { type: 'resource', resource: 'influence', delta: 2 },
+      { type: 'resource', resource: 'followers', delta: 1 },
       { type: 'resource', resource: 'dread', delta: 1 },
       { type: 'insertCard', cardId: 'scrutiny', position: 'random', minPos: 5, maxPos: 9 },
     ],
     condition: { type: 'resourceMin', resource: 'followers', min: 2 },
   },
```

Gate (`followers ≥ 2`), `dreadPressureScaling`, and `scrutiny` insertion all preserved.

**Rationale:** Sermon → follower growth reads cleaner than sermon → political reach. Halved gain (Balance agent verdict) because followers carry more per-point value than influence; +1 follower + scrutiny insertion + dread scaling keeps the option a real spend rather than free upside.

**Watch:** May reduce Y'ha-nthlei influence support if those runs visit `congregation_meets` heavily. Track during playtest.

**Tests:** Snapshot update.

---

## Implementation order

1. **Engine: `notHasPrepTag`** (small, prerequisite for P17-20).
2. **Engine: deficit/overflow post-batch deferral** (bug, prerequisite for confident P18-8 ship).
3. **Card data changes:** P17-7, P17-8, P17-18, P17-19, P17-20-card, P18-8-card, P18-16. All independent of each other once the engine pieces land.
4. **Tests** alongside each change.
5. **Typecheck + vitest** must remain clean (current baseline: 107/107).

## Non-goals / explicit deferrals

- No new `notHasPrepTag` usages beyond P17-20 in this batch (resist scope creep).
- No broader inheritance rework beyond the targeted dread strip + gold trim + bug.
- No retroactive review of other relic-farming loops (out of scope).
- No deficit-insertion semantic redesign — purely batch-timing fix, behaviour at terminal states preserved.

## Expected commit footprint

- 1 engine commit (`notHasPrepTag` + types/tests).
- 1 engine commit (deficit/overflow batch-deferred + tests + `gameLoop.ts` mirror).
- 5–7 small card-data commits (one per card or grouped where natural).

Roughly 7–10 commits total. Each under 50 LOC.
