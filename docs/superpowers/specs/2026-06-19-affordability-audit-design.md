# Affordability Audit (P16-39) — Spec

**Date:** 2026-06-19
**Intent:** Block options when the player can't afford their listed resource cost. Removes the silent-undercharge bug surfaced in Playtest 16 ("Oath of Dagon opt 3 selectable with insufficient influence").

---

## Problem

The engine's `applyDelta` (`src/engine/resources.ts:25-28`) clamps resource values to `[0, 10]` for gold/followers/influence and at `0` for relics/theChanged/dread. When an option carries a cost the player can't fully cover, the clamp silently truncates the cost rather than blocking the option:

```
Player: 1 influence
Option: "Refuse" → -2 influence, +3 dread, insertCard
Result: influence becomes 0 (paid 1 of 2), all other effects apply normally.
Player effectively got the option for 1 inf less than listed.
```

Some options carry explicit `condition: resourceMin` gates that prevent this. Many don't. Player report: Oath of Dagon opt 3 "Refuse" (`src/data/godPaths/yha_nthlei.ts:157-167`) costs -2 influence with no condition; picking it at 1 influence under-pays by 1.

---

## Design

### Engine-level gate

Extend the `available` flag computed in `getVisibleOptions` (`src/state/gameStore.ts:135-162`). An option is `available` iff:
1. Its declared `condition` passes (existing behaviour), **AND**
2. Its net negative resource deltas don't exceed the player's pool for each affected resource (new).

The new check sits next to the condition check — same place, same effect on the rest of the UI pipeline (greyed-out treatment, allBlocked detection, etc.).

### Affordability helper

New pure function in `src/engine/resources.ts`:

```ts
export function affordabilityShortfall(
  effects: Effect[],
  resources: Resources,
): Partial<Record<ResourceKey, number>>
```

**Rules:**
- Sum all negative `resource` effect deltas per resource key.
- For each resource where `resources[r] + sum_neg[r] < 0`, record the **shortfall** as `-(resources[r] + sum_neg[r])` (positive integer indicating how much more the player would need).
- **Skip dread.** Negative dread always lands at floor 0; over-paying dread reduction is a feature, not a cheat.
- **Don't recurse into `randomOutcome.outcomes[].effects`.** Random outcomes are probabilistic; the player commits only to the parent option's listed cost. Nested costs are surprises by design.
- Returns empty map when affordable.

### Wiring

`getVisibleOptions` computes:

```ts
const shortfall = affordabilityShortfall(effectiveEffects, state.resources)
const affordable = Object.keys(shortfall).length === 0
const available = (opt.condition
  ? checkCondition(opt.condition, ...)
  : true) && affordable
```

The returned `VisibleOpt` shape gains a new optional field `affordabilityShortfall?: Partial<Record<ResourceKey, number>>` so the UI can render the synthesized requirement tag.

### UI shortfall tag

`OptionsColumn.tsx` (lines 148-162 already render a similar tag for dread `condition`-derived requirements). Add a parallel render block: when `option.condition` is absent but `affordabilityShortfall` is non-empty, render one tag per shortfall resource showing `≥N {ResourceIcon}` styled identically to the existing dread-condition tag (red-bordered pill, fontSize 0.78rem). Reuses `RESOURCE_ICONS` from `ResourceIcons.tsx`.

### Effective-effects ordering

The check uses `effectiveEffects` (post-dreadPressureScaling). In practice this never affects affordability because `dreadPressureScaling` only modifies positive dread deltas; affordability only inspects negative non-dread deltas. The choice is correctness via the same code path everything else uses.

---

## Audit

After the gate is in place, walk every option in `src/data/cards/*.ts` + `src/data/godPaths/*.ts` and verify no card's design relies on under-payment as a feature. **Expected: zero such cards.** This step is a sanity sweep, not a redesign — the gate makes silent-undercharge unreachable for any player whose pool sits below the listed cost. Findings (if any) get flagged for user decision: keep the gate, or add an explicit opt-out flag (`partialOkay: true`) on the option.

---

## Out of scope

- No change to `applyDelta` — the clamp stays correct for dread-floor and as a defensive idiom.
- No rewriting of existing `condition: resourceMin` declarations even where they become redundant after this gate. Harmless overlap; mass-cleanup is a separate task.
- No new effect types, no card-data edits (unless audit surfaces a finding).
- No nested-randomOutcome affordability — random outcomes resolve probabilistically and committing to the parent option's listed cost is the player's contract.
- No `partialOkay` opt-out flag unless the audit surfaces a card that needs it.

---

## Risks

| Risk | Mitigation |
|---|---|
| Option that was previously "pickable but secretly cheaper" becomes "sometimes not pickable" | Audit confirms no card relies on this. Findings get user review. |
| Player ends up with all options blocked (no affordable picks) | Existing `allBlocked → spend Relic / succumb` flow plugs into the same `available` flag; same fallback fires. No new path needed. |
| Multi-resource shortfall renders cluttered | Existing `dcond` block handles multi-tag flex layout; same styling reused. |
| Nested random-outcome costs let players "afford" expensive surprises | Intentional. Random outcomes are surprises. If a designer wants a nested cost gated, hoist it to the option level. |
| Test coverage gap on UI rendering of the new tag | Integration test asserts `getVisibleOptions` returns populated `affordabilityShortfall`. UI renders from that data; covered at the store level. |

---

## Testing

**Unit (new):** `affordabilityShortfall` pure function
- Returns empty when affordable
- Returns `{ influence: 1 }` for -2 influence on 1 influence pool
- Sums duplicate-resource deltas: `-1 gold + -1 gold` on 1 gold = `{ gold: 1 }`
- Skips dread: `-5 dread` on 0 dread = `{}`
- Skips randomOutcome nested costs: parent option with no top-level cost remains affordable regardless of nested branch costs
- Skips other effect types (insertCard, removeCard, advanceGodPath, etc.)

**Integration (extended `gameStore.test.ts`):**
- Oath of Dagon opt 3 "Refuse" is unavailable when influence < 2
- Oath of Dagon opt 3 "Refuse" is available when influence ≥ 2
- Regression: existing affordable options stay available

**File-size note:** `src/state/gameStore.ts` is ~1259 lines (post-knowledge-base-redesign baseline). Adding ~5 lines won't push it past the 300-line architectural guard since the guard threshold is per-file growth-from-new-logic, not historical size.

---

## Success criteria

- Oath of Dagon opt 3 "Refuse" is unselectable at influence < 2; renders a `≥2 inf` shortfall tag.
- No new test regressions; full suite passes (53/53 baseline + new tests).
- Audit produces a written finding: zero cards depend on under-payment, OR a small list of cards that need `partialOkay` opt-in (user decides).
- Typecheck clean.
