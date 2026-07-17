# P25-43 — The Merchant Again: Redesign
**Date:** 2026-07-17  
**Status:** Approved  
**Backlog:** P25-43

---

## Problem

The mutated `travelling_merchant` → `the_merchant_again` was unfun because:
- "Buy it" collapses the original's exciting 4-way randomOutcome into always inserting `cursed_object` — no player agency, no surprise
- The cursed_object chain (cursed_object → merchant_remembers) had flat, uninteresting payoffs
- "Pass" stripped the original's inf+1 consolation, making the card all-downside
- Opt3 "Ask where it came from" loaded too many resources (relics+2) onto what should be a forbidden-knowledge play — the changed_follower was buried

The core insight: **the jar is the point**. The mutation should lean into the inevitability of the cursed_object chain and make *that chain* rich, not restore the original's randomness.

---

## Design

### `the_merchant_again` — no change to options structure

| Option | Condition | Change |
|--------|-----------|--------|
| Buy it | gold ≥ 2 | **No change** — gold −2, inserts cursed_object (already correct) |
| Pass | — | **No change** — dread +1 (deliberate: refusing costs something, no consolation) |
| Ask where it came from | 2nd draw only, hidden otherwise | relics+1, **inf+1** (was relics+2), dread+3, inserts changed_follower |

Opt3 rationale: the changed_follower is the real payload. Relics+2 made it feel like a resource trade; relics+1 + inf+1 frames it as forbidden knowledge — you learned something, your influence grew, and something followed you home.

---

### `cursed_object` — Study it cost increase

| Option | Before | After |
|--------|--------|-------|
| Study it | dread +2, relics +1 | **dread +3**, relics +1 |
| Give it back | inserts merchant_remembers | no change |

Rationale: dread+3 makes Study it a real punishment — it's the impatient option. Give it back remains the considered choice that opens the chain.

> ⚠️ `cursed_object` is shared — the original rare's "Buy it" can also roll into cursed_object via randomOutcome. Study it becoming dread+3 makes that roll slightly worse. Acceptable: it was already the bad outcome.

---

### `merchant_remembers` — payoff reshaped

| Option | Before | After |
|--------|--------|-------|
| Accept what he sent | followers +2, inf +1 | **relics +2** |
| Send it back again | gold +2 | gold +2, **dread −2** |

Rationale:
- "Accept" → relics+2 focuses the payoff on the object's nature (it's a thing of power, not a person)
- "Send it back" → gold+2, dread−2 makes this a genuine dread sink for players who engage the full chain — slow, but rewarding

---

## Full Chain Economics (from "Buy it")

| Path | Net effect | Character |
|------|-----------|-----------|
| Buy → Study it | gold −2, dread +3, relics +1 | Punishing — impatience |
| Buy → Give back → Accept | gold −2, relics +2 | Efficient — patient |
| Buy → Give back → Send back | gold 0, dread −2 | Dread sink — very patient |
| Pass | dread +1 | Avoidance — costs something |
| Ask (2nd draw) | relics +1, inf +1, dread +3, changed_follower in deck | Forbidden knowledge — high risk |

---

## Files Affected

| File | Change |
|------|--------|
| `src/data/cards/mutations.ts` | `the_merchant_again` opt2: relics+2→relics+1, add inf+1 |
| `src/data/cards/treats.ts` | `cursed_object` Study it: dread+2→dread+3 |
| `src/data/cards/treats.ts` | `merchant_remembers` Accept: followers+2/inf+1→relics+2 |
| `src/data/cards/treats.ts` | `merchant_remembers` Send back: gold+2→gold+2/dread−2 |

No engine changes. No new card IDs.
