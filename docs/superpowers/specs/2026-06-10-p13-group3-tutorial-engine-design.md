# P13 Group 3 — Tutorial Engine Fixes

**Date:** 2026-06-10
**Items:** P13-15 (tutorial controlled reshuffle), P13-16 (remove run-length selector)

---

## Background

The tutorial is a fully scripted 10-card experience. Every card, every insertion, every outcome is known in advance. The engine should enforce that — no randomness, no unintended cards, no unravelling mechanics.

**Current bug (P13-15):** When the tutorial draw pile empties after `olgreth_1`, `reshuffleOnly()` calls the normal `reshuffle()` function, which:
- Merges the discard pile (all 5 played tutorial cards) back into the draw pile — the player sees tutorial_interface, tutorial_basic_resources, etc. again. Wrong.
- Injects an unravelling card. Wrong.
- Shuffles randomly. Wrong.
- This also causes P13-17 (Threat & Treat tutorial card reappearing post-reshuffle) — same root cause.

**Current bug (P13-16):** The setup flow includes a `runConfig` phase that shows a short/long run selector. Short runs are already the de-facto standard; long runs are too long; there is no current plan for a difficulty modifier. The screen is dead weight.

---

## P13-15: Predetermined Tutorial Reshuffle

### Design

Add `tutorialReshuffle(deck: DeckState): DeckState` to `src/engine/deck.ts`.

This function:
1. Takes only the `nextCycleQueue` — ignores `drawPile` and `discardPile` entirely
2. Assembles the post-reshuffle draw pile in a **fixed, predetermined order** (no shuffle):
   ```
   [0] tutorial_reshuffle_card   (pinnedNextCycle — always first)
   [1] tutorial_threat_card
   [2] tutorial_treat_card
   [3] olgreth_2                 (always last)
   ```
3. Returns a new deck state with:
   - `drawPile`: the 4-card predetermined sequence above
   - `discardPile`: `[]` (cleared — played tutorial cards never return)
   - `nextCycleQueue`: `[]` (consumed)
   - All other deck fields (`permDiscardPile`, `chainReserve`) unchanged

The function does not need to know card IDs. The `nextCycleQueue` already contains cards in their natural insertion order:
- `tutorial_reshuffle_card` (inserted first by `tutorial_dread_relics`, `pinnedNextCycle: true`)
- `tutorial_threat_card` (inserted by `tutorial_threats_treats`, effect index 0)
- `tutorial_treat_card` (inserted by `tutorial_threats_treats`, effect index 1)
- `olgreth_2` (queued last by `olgreth_1`'s `advanceGodPath`)

The function simply splits the queue into pinned and unpinned, then concatenates:

```ts
export function tutorialReshuffle(deck: DeckState): DeckState {
  const pinned   = deck.nextCycleQueue.filter(c => c.pinnedNextCycle)
  const unpinned = deck.nextCycleQueue.filter(c => !c.pinnedNextCycle)
  return {
    ...deck,
    drawPile:       [...pinned, ...unpinned],
    discardPile:    [],
    nextCycleQueue: [],
  }
}
```

This yields the correct predetermined order: `[tutorial_reshuffle_card, tutorial_threat_card, tutorial_treat_card, olgreth_2]`. If any card is missing from the queue (unreachable in normal play), it is silently absent — the run continues with however many cards are present.

### Integration point

In `src/state/gameStore.ts`, `reshuffleOnly()`:

```ts
reshuffleOnly: () => {
  const state = get()
  if (state.phase !== 'playing') return
  if (state.deck.drawPile.length > 0) return

  // Tutorial: bypass normal reshuffle entirely
  if (state.runConfig?.isTutorial) {
    const deck = tutorialReshuffle(state.deck)
    set({ deck })
    saveRun(get())
    return
  }

  // Normal reshuffle (unchanged)
  let reshuffleCount = state.reshuffleCount + 1
  // ... existing logic
}
```

No `reshuffleCount` increment, no passive-on-reshuffle, no `reshuffleToast` for the tutorial reshuffle. The tutorial counter can stay at 0 — it is never read in a meaningful way for tutorial runs.

### What does NOT change

- Tutorial card data (`src/data/cards/tutorial.ts`) — untouched
- `insertCard → nextCycle` effects on tutorial cards — still fire, still populate `nextCycleQueue`, still show insertion animations to the player
- `advanceGodPath` on `olgreth_1` — still queues `olgreth_2` into `nextCycleQueue`
- The `reshuffle()` function in `deck.ts` — untouched

### Edge case

If the second draw pile is exhausted before `olgreth_2` is played, the engine would call `reshuffleOnly()` again. `tutorialReshuffle` would find an empty `nextCycleQueue` and return an empty draw pile. The run would softlock. This path is unreachable in normal tutorial play and requires no guard.

---

## P13-16: Remove Run-Length Selector

### Design

The `runConfig` phase in `SetupScreens.tsx` exists solely to show the short/long run selector (`RunConfigScreen`). Remove it from the setup flow.

**Changes:**

1. **`SetupScreens.tsx`** — delete the `RunConfigScreen` component entirely.

2. **`GodPathSelectScreen` forward action** — currently `goToPhase('runConfig')`. Change to `goToPhase('blessingSelect')` (the phase `RunConfigScreen` previously forwarded to).

3. **`BlessingSelectScreen` back action** — currently `goToPhase('runConfig')`. Change to `goToPhase('godPathSelect')` (otherwise the back button becomes a dead link once `runConfig` phase is removed).

4. **`setRunConfig` call in `GodPathSelectScreen`** — currently `setRunConfig({ godPath: ..., runLength: runConfig?.runLength ?? 'short' })`. Change to hardcode `runLength: 'short'` explicitly.

5. **Phase type** — check `src/types/index.ts` (or wherever `GamePhase` is defined) for `'runConfig'` as a union member and remove it if present.

**What does NOT change:**

- `RunLength` type in `src/types/index.ts` — kept as-is
- All engine functions that branch on `runLength` (`getUnravellingTier`, `weightedDraw`, `weightedCoreDraw`, `rareCount`) — kept as-is; they will always receive `'short'` and hit the short branch correctly
- `'long'` RunLength value — kept as dead type variant; removing it is a separate cleanup

### Why not remove RunLength everywhere

The `runLength` field is threaded through types and engine functions. A full purge would touch ~10 files with no user-visible benefit. Keeping it as a used-but-always-`'short'` value is correct — the engine still works, the type still describes future intent, and the cleanup can happen if a proper difficulty rework is ever designed.

---

## Files Changed Summary

| File | Change |
|---|---|
| `src/engine/deck.ts` | Add `export function tutorialReshuffle(deck: DeckState): DeckState` |
| `src/state/gameStore.ts` | `reshuffleOnly()` — add `isTutorial` early-return branch |
| `src/components/SetupScreens.tsx` | Delete `RunConfigScreen`; update `godPathSelect` forward nav |

---

## Testing Notes

**P13-15 verification:**
1. Start a tutorial run
2. Play all 5 cards through to `olgreth_1`
3. Tap draw pile to trigger reshuffle
4. Confirm draw pile is exactly 4 cards: tutorial_reshuffle_card, tutorial_threat_card, tutorial_treat_card, olgreth_2 (in that order)
5. Confirm no unravelling card appears
6. Confirm no reshuffleToast popup fires
7. Play through to victory — confirm run completes normally

**P13-16 verification:**
1. Start a new non-tutorial run
2. Confirm setup flow goes: god path select → blessings → game (no run-length screen)
3. Confirm a short-format run starts (commons count ~3–4, rare count 1)
