# Outcome Feedback System — Design Spec

**Date:** 2026-06-13
**Source:** Playtest 14 items P14-2, P14-17, P14-24
**Status:** Approved, ready for implementation plan

---

## Problem

Three related complaints from Playtest 14:

- **P14-2:** The existing `OutcomeToast` (option result) and the Doom Escalates toast both hover over the draw pile and dismiss on a 2500ms timer. Players miss the information or feel rushed.
- **P14-17:** When cards are inserted into the draw pile (by option effects, overflow, deficit, or god-card surfacing), the player gets no visible confirmation of *what* was inserted.
- **P14-24:** `stranger_asks_questions` opt 2 currently calls `removeCard 'investigators_file'`, which silently no-ops in the (very common) case where the file isn't in the deck. The option is wasted gold. User wants the effect swapped to `removeRandomThreat` AND the panel to show *which* threat was removed.

The unifying fix is a persistent feedback panel beneath the draw pile that surfaces deck changes and randomOutcome reveals between draws, plus a parallel panel for doom escalation.

## Goals

- Replace timer-based hovering toasts with persistent panels beneath the draw pile.
- Show players which cards were inserted into / removed from the deck during the last resolution.
- Surface the name of the threat killed by `removeRandomThreat` (and any future similar "random target" effects).
- Auto-dismiss panels when the player clicks the draw pile to draw the next card.
- No new modal chrome — flow stays one-handed and quick.

## Non-Goals

- 1-5-cards-out randomization on insertions (P14-18, separate item).
- Broader resource-gating audit (P14-25b, separate item).
- Showing insertion position (e.g. "3 cards out") — explicitly excluded per brainstorm.
- Resource delta display inside the panel — stays inline on the option button (no duplication).

## Architecture

### Two panels beneath the draw pile

**`DoomPanel`** — appears only when a reshuffle has escalated the unravelling tier. Shows the tier-specific narration that the current Doom Escalates toast already produces, repositioned below the pile. No timer.

**`OutcomePanel`** — appears when either of the following is true:
- A `randomOutcome` branch revealed flavour text the player could not predict from the option button.
- One or more cards were inserted into or removed from the deck during the last resolution (option effects, overflow, deficit, `removeRandomThreat`).

If both conditions are false (a plain option with no deck changes), `OutcomePanel` does not render — the resource deltas already shown inline on the option are sufficient.

Both panels are cleared when the player clicks the draw pile to draw the next card (`handleDraw` action).

### Stacking order

When both panels are visible (e.g. the resolved option triggered a reshuffle), they stack vertically beneath the pile:

```
[ draw pile ]
[ DoomPanel ]      ← top, when present
[ OutcomePanel ]   ← bottom, when present
```

Doom is the more "systemic" event and reads as the higher-stakes line; the outcome panel reads as the local "what just happened" summary.

## Data model

### New types (`src/types/index.ts`)

```ts
export type CardSummary = {
  id: CardId
  title: string
  tier: CardTier  // retained for potential future color-coding; not rendered in v1
}

export type DeckChanges = {
  inserted: CardSummary[]
  removed: CardSummary[]
}
```

### State changes (`src/state/gameStore.ts`)

- **Narrow `pendingOutcomeReveal`** to `{ flavourText: string } | null`. The current `effects` field is removed — effects are already shown inline on the option button. The field is set only when the resolved option's effects array contained a `randomOutcome`, in which case it receives the chosen branch's `flavourText`. For non-random options it stays `null` (the option's own flavour is already visible on the button).
- **Add `pendingDeckChanges: DeckChanges | null`.** Set during option resolution and overflow/deficit handling. Cleared on next draw.
- **`reshuffleToast`** keeps its current shape but the auto-dismiss `setTimeout` is removed. It is cleared on next draw alongside the other two.
- **Remove `confirmOutcomeReveal` action.** All three states are cleared atomically inside `handleDraw`.

## Engine changes (`src/engine/gameLoop.ts`)

Effect resolution currently mutates `deck` and returns nothing about what changed. Introduce a `DeckChanges` accumulator threaded through the effect loop:

- `insertCard` — push `{ id, title, tier }` into `inserted` after a successful insert.
- `removeCard` — push into `removed` only if the target was actually found in the deck (no ghost rows for no-op removes).
- `removeRandomThreat` — already picks a random threat; now also returns it and pushes into `removed`.

`resolveOption` signature changes from `{ ctx, terminated }` to `{ ctx, terminated, deckChanges }`. The `gameStore.resolveOption` action writes `deckChanges` into `pendingDeckChanges` when non-empty. Overflow/deficit insertions handled in `gameStore` append to the same accumulator before it is committed to state.

## UI changes

### New components

- **`src/components/game/OutcomePanel.tsx`** — reads `pendingOutcomeReveal` and `pendingDeckChanges` from store. Renders, in order, any sections that have content:
  1. Italic flavour line (when `pendingOutcomeReveal.flavourText` is set).
  2. Green-tinted "Inserted" rows — each row is the card title, clickable, opens existing `CardPreviewModal`.
  3. Red-tinted "Removed" rows — same shape as Inserted.
- **`src/components/game/DoomPanel.tsx`** — reads `reshuffleToast` from store. Renders the existing tier text in the new beneath-pile position. No timer.

### `GameScreen.tsx`

- Remove the inline `OutcomeToast` component definition and JSX.
- Remove the inline "Doom escalates popup" JSX.
- Mount `<DoomPanel />` and `<OutcomePanel />` in a container beneath the draw pile.
- Effect tags inline on option buttons remain unchanged.

### Card-data change (one card, bundled)

`src/data/cards/core.ts` — `stranger_asks_questions` opt 2:
- Replace `{ type: 'removeCard', cardId: 'investigators_file' }` with `{ type: 'removeRandomThreat' }`.
- Keep the gold −1 cost and `resourceMin gold 1` condition.
- The option is meaningful whenever any threat is in the deck. If no threats are present, the option still resolves cleanly: gold is paid, `removeRandomThreat` is a no-op, and the OutcomePanel does not render (no ghost row). Hiding the option entirely when no threats exist is left to a follow-up `hasThreat`-style condition outside this spec's scope.

## Behavior matrix

| Player action | Panels shown |
|---|---|
| Pick plain option, no inserts/removes | None |
| Pick option with `insertCard` | OutcomePanel: "Inserted: [card]" |
| Pick option with `removeCard` (target in deck) | OutcomePanel: "Removed: [card]" |
| Pick option with `removeCard` (target missing) | None (no ghost row) |
| Pick option with `removeRandomThreat` (threats exist) | OutcomePanel: "Removed: [threat]" |
| Pick option with `removeRandomThreat` (no threats) | None |
| Pick `randomOutcome` option | OutcomePanel: flavour line + any branch inserts/removes |
| Resolution causes overflow/deficit insertion | OutcomePanel includes the auto-inserted card |
| Draw triggers reshuffle + doom escalation | DoomPanel (above) + OutcomePanel (below) if option also had changes |
| Click draw pile | All panels clear, next card draws |

## Risks and edge cases

- **`removeCard` ghost rows.** If `removeCardFromDeck` returns the deck unchanged (target not present), the engine must not push into `removed`. Implementation: check return value or compare deck-pile lengths before/after.
- **Overflow/deficit ordering.** Overflow/deficit cards are inserted in `gameStore` after engine resolution returns. The accumulator must be open for write at that point (i.e. `gameStore` appends to `deckChanges` before setting `pendingDeckChanges`).
- **Simultaneous DoomPanel + OutcomePanel.** Both can be visible. Vertical stacking specified above; CSS layout must accommodate two stacked rows without overflowing the viewport on narrow screens.
- **`randomOutcome` inside `randomOutcome`.** Not currently used in card data, but nested random effects would recursively need to thread through the accumulator. Out of scope; flag if encountered.
- **Tutorial cards.** Tutorial flow currently bypasses some animations. Verify that the new panels do not break tutorial gating (e.g. `interface_tutorial` walking the player through their first choice).

## Files touched

| File | Change type |
|---|---|
| `src/types/index.ts` | Add `CardSummary`, `DeckChanges` |
| `src/engine/gameLoop.ts` | Thread `DeckChanges` through effect resolution; return from `resolveOption`; capture in `removeRandomThreat` |
| `src/state/gameStore.ts` | Add `pendingDeckChanges`; narrow `pendingOutcomeReveal`; remove `confirmOutcomeReveal` and timer logic; clear all three in `handleDraw` |
| `src/components/GameScreen.tsx` | Remove inline `OutcomeToast` + doom toast JSX; mount new panels |
| `src/components/game/OutcomePanel.tsx` | NEW |
| `src/components/game/DoomPanel.tsx` | NEW |
| `src/data/cards/core.ts` | `stranger_asks_questions` opt 2: `removeCard` → `removeRandomThreat` |

## Success criteria

- After picking any option that inserts or removes cards, an outcome panel is visible beneath the draw pile until the next draw.
- The panel displays the title of each inserted/removed card, including the random threat removed by `removeRandomThreat`.
- Clicking a card title in the panel opens the standard `CardPreviewModal`.
- Doom escalation appears in a separate beneath-pile panel, persists until next draw, no timer.
- `OutcomeToast` and the hovering "Doom escalates" popup are gone from the codebase.
- `stranger_asks_questions` opt 2 now always surfaces a meaningful result when a threat exists.
