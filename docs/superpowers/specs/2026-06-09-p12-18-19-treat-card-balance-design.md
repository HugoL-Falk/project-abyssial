# Design Spec — P12-18 + P12-19: Treat Card Balance

**Date:** 2026-06-09
**Status:** Approved
**Backlog items:** P12-18 (Merchant Remembers chain), P12-19 (Marsh Connection)

---

## P12-18 — Merchant Remembers chain balance

### Problem

The `cursed_object` chain offers no meaningful incentive to resolve via "Give it back to the merchant." The "Study it" loop (relics +1, dread +2, object re-inserts) produces the same relic output as the chain resolution option on `merchant_remembers` ("Accept what he sent": relics +1, influence +1). A player who keeps farming Study it gets relics indefinitely; a player who gives it back gets one relic and ends the chain. The comparison makes the chain termination feel like a downgrade.

### Root cause

Two compounding issues:
1. Dread saving on "Give it back" is too small (−1) to register as meaningful threat removal.
2. `merchant_remembers` rewards overlap directly with what "Study it" already provides (relics).

### Solution — Approach 3 (both ends)

**`cursed_object` → "Give it back to the merchant"**
- Change: dread **−1 → −2**
- Rationale: makes threat removal legible. −2 dread is a meaningful swing that signals "this ends the problem."

**`merchant_remembers` → "Accept what he sent"**
- Change: relics +1, influence +1 → **followers +2, influence +1**
- Rationale: removes relics from the treat entirely. The comparison to "Study it" becomes impossible — different resource profile. Thematically: the merchant sends people, not objects.

**`merchant_remembers` → "Send it back again"**
- No change. gold +2 is already non-relic and stays.

### Changes required

| File | Change |
|---|---|
| `src/data/cards/threats.ts` | `cursed_object` "Give it back": dread delta −1 → −2 |
| `src/data/cards/treats.ts` | `merchant_remembers` "Accept": relics +1 → followers +2 |

---

## P12-19 — Marsh Connection redesign

### Problem

`marsh_connection` was flagged as "feeling wrong" in playtest. Root cause: the card was a silent passive treat — automatic reshuffle trigger (40% chance gold+1 or relics+1, 60% nothing), plus onDraw dread +1. The player never made a conscious choice. The passive fired invisibly and the only option "Read the letter" did nothing. This made the card feel inert and the dread cost on draw feel unearned.

### Solution — Convert to active randomOutcome option

Remove the passive and onDraw entirely. Make the player consciously draw the outcome each time they encounter the card.

**Before:**
```
passive: reshuffle → randomOutcome (20% gold+1 / 20% relics+1 / 60% nothing)
onDraw: dread +1
options: [ "Read the letter" → no effects ]
```

**After:**
```
permanent: true  (card stays in deck, recycles each cycle)
options: [
  "Read the letter" → randomOutcome:
    weight 1: gold +1       "A postal order arrived this month. No note, as usual."
    weight 1: relics +1     "A package from the coast. He sends these occasionally. Best not to ask."
    weight 3: dread +1      [new flavour — see below]
]
```

The `(?)` tooltip renders automatically via the existing `RandomOutcomeTag` component in `EffectTags.tsx` — no UI work required.

### Outcome odds

| Result | Weight | Probability |
|---|---|---|
| gold +1 | 1 | 20% |
| relics +1 | 1 | 20% |
| dread +1 | 3 | 60% |

The 60% dread+1 replaces the old "nothing" outcome. The expected value per draw is now slightly negative (60% chance of dread cost) — appropriate for a permanent recurring card. The good outcomes are genuine upsides, not guaranteed.

### Flavour required

New flavour text needed for the dread +1 outcome (weight 3). Should fit the tone: dry, matter-of-fact, the letter this month contains something the player would rather not have read. No em-dashes. Short.

Suggested: *"No useful advice this month. The postscript was not nothing, though."*

### Changes required

| File | Change |
|---|---|
| `src/data/cards/treats.ts` | `marsh_connection`: remove `passive` block, remove `onDraw` block, add `randomOutcome` to "Read the letter" option effects |

---

## Shared constraints

- No engine changes required for either fix
- No new UI components — `RandomOutcomeTag` already handles `randomOutcome` on options
- Both changes are data-only (card definitions in `.ts` files)
- `OutcomeToast` already fires on `randomOutcome` resolution — player sees the result

---

## Out of scope

- Rebalancing the 20%/20%/60% split — treat as locked unless P13 playtest flags it
- Changing how `cursed_object` is sourced (still from `travelling_merchant` randomOutcome)
- Any change to `marsh_connection` flavour card text or title
