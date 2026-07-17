# P19-34 — Stagger the Week-4 difficulty spike

**Date:** 2026-06-26
**Tier:** E (design)
**Approach:** A — lag dread-pressure one reshuffle behind the doom tier (stagger, keep total)
**Files touched:** `src/state/gameStore.ts` (+ test)
**Review owed:** Balance (already diagnosed; confirm the lag doesn't soften endgame)

---

## Problem

Playtester (Playtest 19): *"Resources feel okay to manage until week 4 where it gets really hard, very steep — high dread and low resources."*

Balance-agent diagnosis: the spike is **convergence**, not magnitude. Three drivers all fire at the same boundary (reshuffle 3 → entering week 4):

1. **Doom card tier 1→2** (`deck.ts:287` `getUnravellingTier`): `unravelling_2` opt B is dread +4 vs tier-1's +2, and the "pay to contain" sink shifts gold→influence.
2. **`dreadPressureScaling` activates**: `dreadPressure = unravellingTier − 1` (`gameStore.ts:147` + `:733`), so at tier 2 it becomes +1, silently adding +1 dread to **7 core options** the player has taken freely for 3 weeks (`core.ts`).
3. **Accumulated passive-reshuffle threats** (`forgers_debt`, `what_was_done`: +1 dread/reshuffle) have had 3 weeks to stack — player-paced, spreads naturally.

Drivers 1 and 2 share **one** trigger (the doom tier), so they're inseparable today — that coupling is the wall. Driver 3 is left alone (it's gradual and player-driven).

---

## Design — Approach A

Decouple the dread-pressure tax from the doom tier and lag it one reshuffle.

**New formula (shared helper, replaces both `gameStore.ts:147` and `:733`):**

```ts
function computeDreadPressure(reshuffleCount: number, unravellingTier: number): number {
  // P19-34: hold the core-option dread tax at 0 through week 4 (reshuffleCount <= 3)
  // so it no longer converges with the doom tier 1->2 jump. It activates at
  // reshuffle 4 (week 5), one week behind the doom escalation.
  return reshuffleCount <= 3 ? 0 : unravellingTier - 1
}
```

### Resulting schedule

| Week | Reshuffle | Doom tier | dreadPressure (before) | dreadPressure (after) |
|---|---|---|---|---|
| 1–3 | 0–2 | 1 | 0 | 0 |
| **4** | 3 | 1→**2** ⛰️ | 0→**1** ⛰️ | **0** |
| **5** | 4 | 2 | 1 | 0→**1** ⛰️ |
| **6** | 5 | 2→**3** ⛰️ | 1→**2** ⛰️ | 1→**2** ⛰️ |

- **Before:** weeks 4 and 6 each stack two cliffs.
- **After:** week 4 = doom upgrade only; week 5 = tax onset only; week 6 = both, but week 6 is the climax (a spike there is intended). Mid-game wall → staircase; endgame peak unchanged.

### "Keep total" check

The only value that changes is **week-4 dreadPressure (1→0)** — the tax is deferred to week 5, not removed. Weeks 5–6 are identical to today. Total run difficulty drops only by the week-4 tax the player would have paid (≈ +1 dread × scaling-options-taken-in-week-4); the late-game peak is fully preserved. This is the intended effect of staggering.

### Note on the dread-10 bump

`gameStore.ts:981` bumps `unravellingTier` when dread hits 10 mid-week. Under the new formula, while `reshuffleCount <= 3` (through week 4) the tax stays 0 even if that bump fires — consistent with the goal of keeping week 4 free of the core-option tax. From week 5 the bump still raises dreadPressure as before.

---

## Out of scope (YAGNI)

- No change to the doom tier schedule (`getUnravellingTier`) — keeps the tier-2 onset and endgame tier 3/4 intact.
- No change to driver-3 passive threats (gradual, player-paced; revisit only if a future playtest flags it).
- No softening of `unravelling_2` costs (user chose stagger-only, not soften).
