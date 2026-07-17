# P19-45 — Cap the dread-overflow Weight-of-It batch

**Date:** 2026-06-26
**Tier:** C (engine fix, single-file)
**Status:** Design approved, ready for plan.

## Problem

During playtest 19 the yha-nthlei god-path card **"Devil's Reef at Low Tide"** (`yha_nthlei_5`, opt0/opt1 both apply `dread +5`) dumped **5× `the_weight_of_it`** into the draw pile in a single resolution. The activity log showed five grouped insert pills (the trigger behind the P19-39 layout fix) and the deck/log felt punishingly cluttered in one swing.

Root cause is **engine-level**, not card-level: `applyOverflowEffects` in `src/state/gameStore.ts` (~lines 300–308) inserts **one `the_weight_of_it` per dread point above 10** every time dread rises:

```
const prevAbove = Math.max(0, prevVal - 10)
const newAbove  = Math.max(0, newVal  - 10)
if (newAbove > prevAbove) {
  const wc = getCardById('the_weight_of_it')
  for (let i = 0; i < newAbove - prevAbove; i++) {
    if (wc) d = insertCard(wc, d, 'random', 1, 5)
  }
}
```

A +5 dread jump from a single option therefore inserts 5 copies at once. There is no ceiling on how many copies can exist.

## Decision

**Approach A — cap total copies in the deck at 3.** Keep the per-point scaling that already exists, but never let more than **3** copies of `the_weight_of_it` exist across the draw pile + discard pile at once. When dread rises, insert one copy per new point above 10 **only until the cap is reached**; suppress the rest.

Rejected alternatives:
- **B (single presence card):** one copy while dread >10 — throws away the escalation gradient (dread 11 and dread 18 feel identical).
- **C (cap per-event batch):** spreads the burden across turns but needs per-event tracking and still lets copies accumulate unboundedly over a run.

Cap value **3** chosen as the "felt like too many" threshold from playtest — meaningful weight without flooding the draw pile.

## Mechanism

Inside the existing `if (newAbove > prevAbove)` branch:

1. Count current copies of `the_weight_of_it` in `drawPile` + `discardPile`.
2. Compute how many points were gained: `newAbove - prevAbove`.
3. Insert at most `min(pointsGained, MAX_WEIGHT_CARDS - currentCount)` copies (floored at 0), each via the existing `insertCard(wc, d, 'random', 1, 5)` call.

Introduce a named constant `MAX_WEIGHT_CARDS = 3` near the overflow helper so the ceiling is discoverable and tunable.

The existing cleanup branch (`prevVal > 10 && newVal <= 10` → filter all copies out of drawPile/discardPile) is **unchanged**.

## Scope / boundaries

- **Single file:** `src/state/gameStore.ts`, the `applyOverflowEffects` helper only.
- **No card-data changes.** Devil's Reef and `the_weight_of_it` definitions are untouched — this is purely the engine insertion rule.
- **Does not touch** the gold/followers/influence overflow branch (those already insert exactly one card on threshold crossing — no batch problem).
- **Does not touch** P19-34 dread-pressure scaling.

## Edge cases

- Copies already in `nextCycleQueue` or `permDiscardPile`: not counted (weight cards aren't routed there; they live in draw/discard). Counting drawPile + discardPile is sufficient.
- If 3 copies already exist and dread rises further, zero new copies are inserted (no negative-count loop — guard with `Math.max(0, ...)`).
- Dread falling to ≤10 still removes **all** copies regardless of count (existing behaviour).

## Testing

Node-only engine test (no DOM harness needed):
- Dread 10→15 with 0 existing copies → exactly 3 inserted, not 5.
- Dread 13→18 with 3 existing copies → 0 inserted (cap held).
- Dread 11→ ≤10 → all copies removed.
- Regression: gold/followers/influence overflow path still inserts exactly one card on crossing 10.

## Follow-ups (out of scope, tracked elsewhere)

- General deck bloat (P19-35) and the Deck & Reshuffle Redesign (P13-24) are a separate, larger design track.
