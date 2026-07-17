# Card Redesigns — Design Spec

**Date:** 2026-06-11
**Backlog items:** P9-35, P9-36, P10-20, P10-22, P13-26, P13-27
**Sessions:** 66 (started 2026-06-11) — Card Redesigns

---

## Summary

Six card redesigns grouped into one design session. Three are small targeted fixes (condition gating, single-effect swaps). Three are full redesigns of mechanically or thematically broken cards.

**Engine-level corrections discovered during plan writing:**

1. The `cardInDeck` condition we initially proposed for `the_census_agent` **already exists** in the engine as `hasCard` (in `types/index.ts` line 48, evaluated in `godPath.ts` lines 123–127). All deck-presence checks below use the existing `hasCard` type.

2. **The `hint` field does NOT exist** on `Card` or `CardOption` types. Two hint-based design decisions are already covered by existing infrastructure:
   - `changed_follower`'s "options change each draw" hint is already rendered by the UI when `accumulates: true` is set (it shows "Evolves — options change with each encounter." via `CardPassiveTag` in `DrawnCard.tsx`). The flag is already present on the card. **No data change required.**
   - `surfaceGodPathCard` already renders a `?` tooltip via `EffectTags.tsx` (line 155): "Surfaces next God Path card." Sufficient on `what_was_already_read` opt 2. **No new hint field needed.**

No engine, type, or UI work is required for this spec. All changes are pure card-data edits.

---

## 1. `what_was_already_read` (P9-36)

**File:** `src/data/cards/threats.ts` (around line 845)

**Problem:** Power level, hint text, possible rework. Existing card has only 2 options — both conditional, with no escape from the dread-loop at low dread.

**Direction:** Add third option (exit valve), add hint to high-dread option, keep original cost levels.

**Stale comment to fix:** The comment block above the card claims it is inserted by `the_seance` "Let them do it alone". The live code shows that option inserts `wandering_soul`, not this card. Only `the_old_book` "Burn it" inserts it. Update the comment to reflect actual insertion source.

### Final card

```ts
{
  // Inserted by the_old_book — "Burn it".
  // Normal case: Dread +1, card goes to discard (reshuffles back).
  // High-dread case (dread ≥8): surfaces god path card.
  // uniqueInDeck: capped to 1 copy.
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
      // The `surfaceGodPathCard` effect already renders a `?` tooltip
      // ("Surfaces next God Path card") via EffectTags.tsx. No hint field needed.
      effects: [
        { type: 'surfaceGodPathCard' },
      ],
      condition: { type: 'resourceMin', resource: 'dread', min: 8 },
    },
  ],
}
```

**Changes from original:**
- New option "File it away" (gold −2, permanent exit, hidden when unavailable)
- Card body flavour text revised to remove direct "you" address (voice fix)
- All other options unchanged
- Card comment updated to remove stale seance reference
- Note: `surfaceGodPathCard` tooltip already exists in EffectTags.tsx — no new hint needed

---

## 2. `changed_follower` (P9-35) — NO CODE CHANGE

**File:** `src/data/cards/special.ts` (around line 5)

**Problem (original):** 3-phase escalation across draws was thought to be invisible to the player. Options change unexpectedly each time the card appears.

**Discovery during plan writing:** The card already has `accumulates: true`. The UI's `CardPassiveTag` component (in `DrawnCard.tsx` around line 153) already renders a `?` button on the card that, when clicked, displays *"Evolves — options change with each encounter."* This is exactly the hint we designed.

**Resolution:** No code changes required. Verify in-game during the verification pass that the tooltip is visible and reads correctly. If the player still doesn't notice the hint, the fix would be a UI tweak (e.g., always-visible label) — out of scope for this spec.

---

## 3. `the_census_agent` opt 3 (P10-20)

**File:** `src/data/cards/core.ts` (around line 519)

**Problem:** Opt 3 removes 4 specific threat cards that may not be in the deck. Player sees a list of removals but engine silently no-ops absent cards.

**Direction:** Gate opt 3 on `hasCard` condition (existing engine type) — OR-clause across the 4 target cards. Option greys out visibly when none are present (no `hideWhenUnavailable`).

### Change

Update opt 3 condition:

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
```

No new engine work — `hasCard` already exists.

---

## 4. `the_thing_in_the_tank` (P10-22)

**File:** `src/data/cards/threats.ts` (around line 996)

**Problem:** Mechanical and unthematic. "Feed it" was pure deferral with no upside. "Listen to it" surfaceChainCard only benefits Nyarlathotep players. "Release it" was under-costed for an exit.

**Direction:** Full overhaul of all three options. All three agents consulted.

### Final card

```ts
{
  // Inserted by something_on_the_hook — "Keep it"
  id: 'the_thing_in_the_tank',
  title: 'The Thing in the Tank',
  flavourText: "It learned to tap on the glass. We learned what the tapping means. This was probably a mistake.",
  tier: 'threat',
  options: [
    {
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
      label: 'Release it',
      flavourText: 'The tank goes to the shore. The water accepts the offering. The thing goes.',
      effects: [
        { type: 'resource', resource: 'dread', delta: -3 },
        { type: 'resource', resource: 'followers', delta: -1 },
      ],
      condition: { type: 'resourceMin', resource: 'followers', min: 2 },
    },
  ],
}
```

**Changes from original:**
- "Listen to it": `surfaceChainCard` → `surfaceGodPathCard` (benefits all god paths); added inf +1; dread +2 → +3
- "Feed it": added dread −1 (transforms pure deferral into a meaningful middle-ground choice)
- "Release it": influence cost → followers cost (followers is narratively supported by parent card; doesn't penalise Y'ha-nthlei); added condition followers ≥ 2
- Card body: "It's" → "It"; "You've" → "We" (voice fix)
- All option flavour texts rewritten

allBlocked satisfied — "Listen to it" is unconditional.

---

## 5. `clarence` (P13-26)

**File:** `src/data/cards/rare.ts` (around line 142)

**Problem:** Both active options were free card-removal — no resource trade-off. `onDraw` auto-removed `what_was_done` invisibly even on "Not yet" deferral. "Not yet" was zero-cost zero-effect.

**Direction:** Add influence-based costs (influence is the under-drained resource and fits the "calling in favours" narrative). Remove the invisible `onDraw`. Gate options on `hasCard` so they grey out when target threats are absent.

### Final card

```ts
{
  // Named follower — rare boon card.
  // Two paid options, each removes a category of threats and removes clarence himself.
  // Influence cost reflects political capital spent calling in favours.
  id: 'clarence',
  title: 'Clarence',
  flavourText: "He doesn't ask questions. This is either his greatest virtue or your greatest concern.",
  tier: 'rare',
  // onDraw REMOVED — was invisible and fired even on "Not yet" deferral.
  // what_was_done removal is now explicit on "Bury the record" only.
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
      label: 'Not yet',
      flavourText: 'He waits. He is very good at waiting.',
      effects: [],
    },
  ],
}
```

**Changes from original:**
- `onDraw: [removeCard what_was_done]` — REMOVED entirely
- "Remove investigation threats": added inf −3 cost; added `hasCard` OR condition; added resource gate inf ≥ 3
- "Bury the record": cost asymmetric to opt 0 (inf −1, gold −1) — cheap housekeeping vs expensive investigator removal; added `hasCard` OR condition; resource gates inf ≥ 1, gold ≥ 1
- "Not yet": unchanged (zero cost, zero effect — unconditional fallback satisfies allBlocked)
- All flavour texts unchanged (still work with new costs)

allBlocked satisfied — "Not yet" is unconditional.

**Note on balance agent's threat cost analysis:** The balance agent inflated the floor cost of natural threat resolution (claiming ~gold −6, inf −5, fol −1 for the investigation set). User pushed back — those underlying threat costs may themselves be over-tuned. The Clarence costs above (inf −3 / inf −1 + gold −1) are correctly calibrated assuming a realistic ~gold −3, inf −3 alternative cost. The underlying threat card costs are out of scope for this session but worth reviewing separately.

---

## 6. `stranger_asks_questions` opt 2 (P13-27)

**File:** `src/data/cards/core.ts` (around line 39)

**Problem:** Opt 2 "Bring him to a meeting" and opt 1 "Have him followed" both `removeCard investigators_file` — duplicate effect. Stripping the duplicate from opt 2 leaves it strictly worse than opt 0 (fol+1/dread+2 scaling vs inf+1/dread+1).

**Engine-level discovery during review:** `removeRandomThreat` only scans `drawPile` (not discard or nextCycleQueue) and silently no-ops on empty threat pools. Initially proposed `removeRandomThreat` was rejected after card-mechanics caught these landmines. Chose deterministic resource-trade solution instead.

**Direction:** Strip the duplicate `removeCard`, drop `dreadPressureScaling`, add a small extra benefit (inf +1) so opt 2 becomes a viable broad-gain option distinct from opt 0 and opt 1.

### Change

Update opt 2 only:

```ts
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

**Changes from original:**
- `dreadPressureScaling: true` — REMOVED (was unpickable at high tiers)
- `removeCard investigators_file` — REMOVED (was duplicate of opt 1)
- Added `influence +1`
- Flavour text unchanged

**Three-option separation:**
- Opt 0 "Offer him a tour": inf +1 / dread +1 — Y'ha-nthlei line, cheap
- Opt 1 "Have him followed": gold −1 / removeCard investigators_file — surgical threat management
- Opt 2 "Bring him to a meeting": fol +1 / inf +1 / dread +2 — broad gain at higher dread cost

All three god paths get something from opt 2:
- Y'ha-nthlei gets the inf +1
- Shub-Niggurath gets the fol +1 (TheChanged conversion path)
- Nyarlathotep gets the fol +1 (chain card support)

No dominated options. Three resource deltas — at the cap.

---

## Engine work required

**None.** All changes are pure card-data edits:
- `hasCard` condition type already exists — no engine logic needed
- `surfaceGodPathCard` tooltip already renders in `EffectTags.tsx`
- `accumulates: true` flag already triggers card-level hint via `CardPassiveTag`
- Removing `clarence`'s `onDraw` field is a card-data change (not engine work)

---

## File touch list

| File | Cards changed |
|---|---|
| `src/data/cards/threats.ts` | `what_was_already_read`, `the_thing_in_the_tank` |
| `src/data/cards/special.ts` | NONE (P9-35 already works via existing `accumulates: true` infrastructure) |
| `src/data/cards/core.ts` | `the_census_agent` opt 3, `stranger_asks_questions` opt 2 |
| `src/data/cards/rare.ts` | `clarence` (full rewrite) |

No type files changed. No engine files changed. No UI components changed.

---

## Verification checklist (manual playtest)

- [ ] Draw `what_was_already_read` at dread ≤ 7 with gold ≥ 2 → see "File it away" option; pick it → card removed permanently, gold −2
- [ ] Draw `what_was_already_read` at dread ≥ 8 → see "The words arrange themselves" with `?` hint; pick it → next god path card surfaces to 3rd in draw pile
- [ ] Draw `changed_follower` for the first time → see card-level `?` hint about options changing
- [ ] Draw `the_census_agent` with no investigation cards in deck → "Make the problem go away" greys out
- [ ] Draw `the_census_agent` with at least one investigation card → option active
- [ ] Draw `the_thing_in_the_tank` and pick "Listen to it" → dread +3, inf +1, god path card surfaces, card reinserts
- [ ] Draw `the_thing_in_the_tank` and pick "Feed it" → resources change as expected, no random outcomes
- [ ] Draw `the_thing_in_the_tank` at fol < 2 → only "Listen to it" available
- [ ] Draw `clarence` with no threats in deck → only "Not yet" available
- [ ] Draw `clarence` with investigation threats present and inf ≥ 3 → "Remove investigation threats" available; on selection inf −3, all 4 cards removed
- [ ] Draw `clarence` and pick "Not yet" → no resource change; `what_was_done` NOT silently removed (verify the onDraw fix)
- [ ] Draw `stranger_asks_questions` and pick "Bring him to a meeting" → fol +1, inf +1, dread +2 (no scaling indicator); `investigators_file` NOT removed

---

## Out of scope (carry forward)

- Underlying threat card costs (`the_detective` worst-case fol−3/inf−3/dread+2, `investigators_file` accumulator) — balance agent flagged these as potentially over-tuned. Worth a dedicated session.
- Comment fix on `what_was_already_read` is bundled with that card's implementation
- `removeRandomThreat` engine issues (drawPile-only, silent no-op) — documented during this session but no card change relies on it. Worth fixing in the engine but doesn't block these card changes.
