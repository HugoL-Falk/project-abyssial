# Purge UI — Deck-Filtered Removal Display (P13-25)

**Date:** 2026-06-13
**Backlog item:** P13-25
**Status:** Spec — ready for plan

---

## Problem

Card options carry `removeCard` effects that target specific `cardId`s (e.g., `the_old_book` "Hide it" → removes 5 investigation cards). The current UI lies about scope:

- **Pre-decision tag** shows `− N cards` based on the raw configured count, ignoring deck reality.
- **Post-decision `RemovalPreviewOverlay`** carousels the configured targets, not the cards actually being removed.

A player whose deck contains only 2 of the 5 targets sees "− 5 cards" and a 5-card carousel — but only 2 are actually purged. The display should reflect what the engine will actually do.

---

## Scope

Filter both the option tag and the removal overlay against the player's current deck state. Apply consistently to top-level `removeCard` effects and to `removeCard` effects nested inside `randomOutcome` branches. The auto-injected `−card` tag for single-use threats/treats is untouched (it always targets the current card, which is always present).

Out of scope: redesigning `removeCard` data, changing card balance, changing what the engine actually removes.

---

## Design Decisions

### D1. Both surfaces are filtered (tag + overlay)

Single source of truth: a new helper `getActualRemovalTargets(cardIds, deck, currentCardId)` is consumed by both `EffectTags` (pre-decision) and `GameScreen` (overlay trigger + carousel content). Neither surface lies independently.

### D2. Zone scope mirrors `removeCardFromDeck`

A target counts as "present" if it lives in `drawPile`, `discardPile`, or `nextCycleQueue` — exactly the zones `removeCardFromDeck` searches in `engine/deck.ts:68`. The removed pile (`permDiscardPile`) does not count. `currentCard` does not count via the zone path.

### D3. Self-targets are always present

If a target `cardId === currentCardId`, the helper counts it as present regardless of zone. This mirrors the engine's `selfRemoved` branch (`gameStore.ts:797`, `gameLoop.ts:412`), which removes the current card independently of `removeCardFromDeck`.

### D4. Zero-target ghost pip (no hide, no disable)

If a `removeCard` effect filters down to zero actual targets:

- Do **not** hide the tag entirely (loses information about intent).
- Do **not** disable the option (other effects still meaningful).
- Render a single dim non-clickable pip:

```
⌀ card        // opacity 0.35, color rgba(220,80,80,0.4), no border
```

Conveys "designed to remove, nothing to act on" without clutter.

### D5. Random-branch filtering matches top-level

`RandomOutcomeTag` (in `EffectTags.tsx`) receives the same `deck` + `currentCardId` props and applies the same filter to each branch's `removeCard` effects:

- Surviving targets → render `− card` per target (unchanged shape).
- All filtered to zero → ghost pip for that branch (consistent with D4).

### D6. Overlay opens only when filtered count > 1

`GameScreen.tsx:241` switches from raw `removeCards.length > 1` to `actualRemoveIds.length > 1`. If filtering drops the count to 0 or 1, the option fires immediately with no overlay (matches today's behaviour for single-target removes — no overlay was ever shown for those).

### D7. Click-to-preview targets actual cards

For the single-target tag, the `onPreviewCard(cardId)` argument becomes `actualTargets[0]`, not the first configured id. Player can never click a tag and preview a card that won't actually be purged.

---

## Architecture

### Helper

```ts
// src/engine/deck.ts
export function getActualRemovalTargets(
  cardIds: CardId[],
  deck: DeckState,
  currentCardId: CardId | null
): CardId[]
```

**Behaviour:** for each input `cardId`, included in output iff one of:

1. `cardId === currentCardId` (self-target rule, D3)
2. Present in `drawPile` (non-permanent)
3. Present in `discardPile` (non-permanent)
4. Present in `nextCycleQueue` (non-permanent)

Input order preserved. **Duplicates de-duplicated** in output: the engine's `removeCardFromDeck` removes each id at most once (returns the deck unchanged if the id is already gone), so the helper mirrors this — duplicate ids in input collapse to a single entry in the output. Empty list in → empty list out.

Pure function. No side effects.

### Component prop threading

```
GameScreen (has deck via store)
  └── OptionsColumn (gains `deck` prop, currently selects `currentDread` from store)
        └── EffectTags (gains `deck` prop)
              └── RandomOutcomeTag (gains `deck` + `currentCardId` props)
```

`OptionsColumn` already pulls store state for `currentDread` (added session 68). Adding `deck` is one more selector — same pattern.

### Overlay flow

```
GameScreen.handleOption(idx):
  configuredRemoveIds = opt.effectiveEffects.filter(removeCard).map(cardId)
  actualRemoveIds = getActualRemovalTargets(configuredRemoveIds, deck, currentCard.id)

  if actualRemoveIds.length > 1:
    setRemovalState({ cards: actualRemoveIds.map(id => CARDS[id]), optionIdx: idx })
  else:
    executeOption(idx)   // engine handles no-op naturally
```

`RemovalPreviewOverlay` itself receives no changes.

---

## Files Touched (Estimate)

| File | Change | Est. lines |
|---|---|---|
| `src/engine/deck.ts` | Add `getActualRemovalTargets` helper | +15 |
| `src/engine/deck.test.ts` (new or extend) | Unit tests for helper | +40 |
| `src/components/game/EffectTags.tsx` | Threading + filtered render + ghost pip + RandomOutcomeTag updates | ~40 modified |
| `src/components/game/OptionsColumn.tsx` | Pass `deck` selector + prop | +3 |
| `src/components/GameScreen.tsx` | Replace raw filter with helper call | ~6 modified |

Per CLAUDE.md, EffectTags edit will be chunked across multiple diff blocks during execution.

---

## Testing Strategy

### Unit (helper)

Exhaustive coverage of `getActualRemovalTargets`:

1. Card present only in `drawPile` → included.
2. Card present only in `discardPile` → included.
3. Card present only in `nextCycleQueue` → included.
4. Card present in `permDiscardPile` only → **excluded**.
5. Card not in any zone, not currentCardId → excluded.
6. Card not in any zone but equals currentCardId → **included** (D3).
7. Permanent card in drawPile → excluded (mirrors removeCardFromDeck).
8. Empty input → empty output.
9. Duplicate ids in input where target is present → collapsed to single entry in output (mirrors engine's at-most-once removal).
10. Mixed input (some present, some not) → returns only present, in input order.

### Manual playtest

1. **`the_old_book` "Hide it"** (5 investigation targets) — early run with all 5 in deck shows "− 5 cards"; mid-run with 2 present shows "− 2 cards" and a 2-card overlay; late run with 0 present shows the ghost pip and no overlay (option still fires).
2. **`congregation_meets` chain** removing `merchant_remembers` — count is correct when target sits in `nextCycleQueue`.
3. **randomOutcome branch with removeCard** — the `Chance of:` popover shows the filtered count per branch, ghost pip for all-zero branches.
4. **Self-removing chain card** (e.g., an option whose `removeCard` lists its own `currentCardId`) — counted as present, tag shows; option fires; engine `selfRemoved` branch removes the card.
5. **Overlay trigger** — only opens when actualTargets > 1; never opens for 0 or 1.
6. **Click-to-preview** — single-target tag opens the actually-present card, never a configured-but-absent one.

### Build / typecheck

- `npm run typecheck` clean after each task.
- `npm run build` clean after final task.

---

## Open Questions

None — all clarified in Q1–Q6 of brainstorm (session 69).

---

## References

- Engine: `src/engine/deck.ts:68` (`removeCardFromDeck`), `src/engine/deck.ts:103` (`reshuffle`)
- Engine: `src/state/gameStore.ts:623,797` and `src/engine/gameLoop.ts:321,412` (selfRemoved branch)
- UI: `src/components/game/EffectTags.tsx:99,326,380` (current removeCard render)
- UI: `src/components/game/RemovalPreviewOverlay.tsx` (consumer, untouched)
- UI: `src/components/GameScreen.tsx:222,241` (overlay trigger)
- Backlog: `knowledge/backlog.md` → "Session: Resource Economy & Card Balance" → P13-25
