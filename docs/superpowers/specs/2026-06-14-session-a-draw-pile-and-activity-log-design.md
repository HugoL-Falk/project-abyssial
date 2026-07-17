# Session A — Draw Pile & Activity Log Design

**Date:** 2026-06-14
**Source:** Playtest 15 items P15-2, P15-3, P15-5, P15-7, P15-8, P15-9, P15-10, P15-12
**Scope:** Replace the current insertion display under the draw pile with a live activity log, redesign the draw-pile thickness visual, and fix associated bugs.

---

## 1. Activity Log (replaces insertion display) — P15-12, P15-2, P15-7, P15-8, P15-9

### 1.1 What it is

A live event tail rendered directly beneath the draw pile. Replaces the existing insertion display component entirely. Shows the last 5 events from the run, newest at the bottom, older entries fading upward by opacity.

### 1.2 Event types

Only three event types appear in the log:

| Type        | Format                       | Notes                                                                                                  |
|-------------|------------------------------|--------------------------------------------------------------------------------------------------------|
| Insertion   | `+ Card Name`                | Fires for `insertCard`, `randomOutcome` insert branches, `surfaceGodPathCard`, deficit/overflow inserts. |
| Purge       | `− Card Name`                | Fires for `removeCard`, `removeRandomThreat`.                                                          |
| Reshuffle   | `↻ Reshuffled (N)` italic    | Single entry per reshuffle event. `N` = number of cards moved from discard back to draw pile.          |

**Excluded:** resource changes, outcome flavor text, doom modal events. Resource deltas already show on the option button and resource HUD. Doom modal stays a separate floating modal.

### 1.3 Red-text rule

Card-name text renders in red (`#c84a3a`) when the card's tier is `threat`, `doom`, `overflow`, or `deficit`. God-path cards render in default color. The `+` / `−` symbol matches the row's text color.

### 1.4 Visual style (Layout A from brainstorm)

- Container: 260px wide, dark translucent background (`rgba(20, 16, 12, 0.85)`), 1px border (`#3a2e1f`), 4px corner radius.
- Rows: 0.85rem Georgia serif, 3px vertical padding, dotted bottom separator (`rgba(120, 100, 70, 0.2)`).
- Symbol column: 14px fixed width, bold.
- Opacity by row position (top → bottom): 0.25 / 0.45 / 0.65 / 0.85 / 1.0.

### 1.5 Lifecycle

- Newest entry enters at the bottom with a ~200ms slide-in from below.
- When a 6th entry arrives, the topmost row fades out and the stack shifts up by one position.
- No scrollback. No per-draw or per-reshuffle reset. Log persists for the run and clears on new run.

### 1.6 Interaction

- Card-name rows (`+` and `−`) are clickable. Click opens the existing card-preview modal for that card.
- Reshuffle rows are not interactive.

### 1.7 Data sources

- Insertions/purges flow from existing `deckChanges.inserted` / `deckChanges.removed` tracking (already populated by `gameStore.ts` effect handlers).
- Reshuffle entries are emitted from the reshuffle handler (`reshuffleOnly()`).
- `surfaceGodPathCard` resolution must push to `deckChanges.inserted` — currently silent (P15-8).
- `randomOutcome` weighted-branch resolution must push every branch's `insertCard` and `resource` effects' inserted-card data — currently only the flavor text surfaces (P15-7). Resource deltas remain excluded per §1.2.

---

## 2. Draw Pile Thickness Visual — P15-3

### 2.1 Visual language

Card face plus stepped shadow edges to the right and bottom, simulating a real deck on a table (Option C from brainstorm). Edges shrink stepwise as the draw pile drains.

### 2.2 Thresholds

| `drawPile.length` | Edges shown                  |
|-------------------|------------------------------|
| ≥15               | 3 stepped edges (full)       |
| 8–14              | 2 stepped edges              |
| 1–7               | 1 stepped edge               |
| 0                 | Reshuffle outline (existing) |

Always at least 1 edge while cards remain — the deck never visually flattens to a single card face until it is genuinely empty.

### 2.3 Implementation

CSS-only via `box-shadow` layering. Apply class names based on threshold buckets in `DrawPile.tsx` (or wherever the pile component lives). Edge colors step from `#2a2218` → `#1f180f` → `#14100a`, plus a soft drop shadow underneath that also scales down with the deck.

---

## 3. Reshuffle Doom Modal Width — P15-5

The reshuffle doom modal currently clips the deck outline. Widen its container so it no longer overlaps. Single CSS change — likely a `min-width` or `width` bump on the reshuffle-doom modal's wrapper.

---

## 4. Reshuffle Outline Count Sync — P15-10

### 4.1 Bug

The "N cards in discard" outline below the draw pile showed `12` in playtest, but `17` cards were actually moved on reshuffle. The displayed count is stale relative to live deck state.

### 4.2 Fix

Investigate the source of the outline's count. Replace any cached/predicted/snapshot value with a direct read of `deck.discardPile.length` at render time. This mirrors the source-of-truth fix used for `getActualRemovalTargets` in P13-25.

### 4.3 Acceptance

On any frame where the outline is visible, the displayed number equals `deck.discardPile.length` at that moment. After the reshuffle animation completes, the outline either hides or reads `0`.

---

## 5. Out of Scope

- **P15-1** Doom jewel onyx color — Session B.
- **P15-4** Background art — Session C.
- **P15-6** Gold-zero pulse — Session B.
- Activity log themes, customization, accessibility audit. Defer until base implementation lands.
- Refactoring `gameStore.ts` / `gameLoop.ts` parallel effect handlers — pre-existing tech debt, flagged but not addressed here.

---

## 6. Open Risks

- **Two-engine parity:** Every change touching effect resolution (P15-7, P15-8) must land in both `state/gameStore.ts` and `engine/gameLoop.ts`. The implementation plan must call this out per change.
- **Log overflow during multi-insert options:** A single option that inserts 3 cards produces 3 log rows in sequence. With max-5 visible, the rest of an active turn's events get pushed off quickly. Acceptable per §1.5 (slide-off-top), but worth a manual playtest pass to confirm it doesn't feel disorienting.
- **Performance:** 200ms slide-in × frequent inserts should remain cheap (CSS transform), but verify on the lower-end target device.
