# Cluster A — Activity Log Consolidation

**Date:** 2026-06-16
**Status:** Design approved, awaiting implementation plan
**Tickets closed:** P16-3a, P16-47, P16-47b, P16-49, P16-53, P16-13a (folded in s84), P16-21 (subsumed via unified outline rule)
**Related:** Phase 1 Week Reframe (s84) held the slot above the deck open for this work; WeekBanner stays as-is.

## Problem

Four separate UI surfaces currently overlap in purpose:

- `InsertPreviewOverlay` — full-screen blocking modal that reveals an inserted card, requires a tap to commit.
- `DoomPanel` — separate centred status panel that announces doom escalation with tier-specific flavour.
- `OutcomeReveal` — transient banner showing random-outcome flavour text plus an "Added: X / Removed: Y" textual summary.
- `ActivityLog` — a 5-row history strip with an opacity ladder.

Plus several events the player can't see at all today: god-path card insertions (P16-47b), overflow/deficit insertion + recovery (P16-53), and random-outcome resolutions are only visible as side-effects on resource counters.

Playtest 16 feedback: the modals interrupt flow, the panels duplicate explanations the player already understands, and the silent insertions create confusion ("where did that card come from?").

## Solution overview

One log surface beneath the DrawPile holds the events from the **most recent player-action beat** (option resolved, reshuffle, or overflow/deficit fire). On the next beat, the batch is replaced. If the next beat produces zero entries, the batch clears and the log renders nothing.

The InsertPreviewOverlay, DoomPanel, and OutcomeReveal are deleted entirely. Insertion is immediate at the engine level; the log row IS the reveal. Players who want to inspect an inserted card click the row to open the existing full card preview. The `pendingDeckChanges` and `pendingOutcomeReveal` store fields become orphans and are removed — `resolveOption` writes directly to the activity log batch instead.

`RandomOutcomeTag` (the inline `?` pre-resolution forecast button on cards) is unchanged in behaviour — it serves a different purpose (option-time forecasting). Only its popover `+card`/`−card` buttons get the unified outline treatment.

## Surface model

- **Position:** below DrawPile. WeekBanner stays above DrawPile, unchanged.
- **Batch size:** 1–3 rows. Hard cap = 3. Typical = 1–2.
- **Lifecycle:** batch replaces on the next beat; empty batch renders nothing (the "clear after 1 idle draw" rule from P16-49 falls out of this).
- **Row order within a batch:** chronological / causal. A reshuffle beat produces:
  1. `A new week begins · {N} cards`
  2. `Doom escalates`
  3. `+ {Doom card title}`

## Event taxonomy

Seven loggable event types. The table is exhaustive — anything not listed is silent (notably: rare rotation, per s83).

| Event | Symbol | Row content | Colour |
|---|---|---|---|
| Reshuffle | ↻ | `A new week begins · {N} cards` | dim gold, italic |
| Doom escalates | ⚠ | `Doom escalates` | red |
| Card inserted (generic) | + | `+ {card title}` | red if tier ∈ {threat, doom, overflow, deficit}, else parchment |
| Card removed (generic) | − | `− {card title}` | red |
| Random outcome insert | + | `*{outcome flavour}* + {card title}` (single row, flavour italicised, degrades to plain `+ {card title}` if no flavour on the chosen branch) | per-tier of inserted card |
| God-path card inserted | + | `+ {card title}` with god-coloured left border accent (Y'ha cyan, Nyar purple, Shub green) | god-tinted |
| Overflow/deficit recovered | − | `− {card title}` (same styling as generic remove) | red |

**Clickability:** every non-reshuffle row is a button → opens existing card preview via `onPreviewCard`. Reshuffle row is non-interactive text.

**Border outline (P16-47, P16-21):** insert/remove rows in the log AND the `+card`/`−card` buttons inside `RandomOutcomeTag`'s popover get a 1px outline matching the resolved-option `+card`/`−card` button style. One unified visual vocabulary across every place that says `+card`/`−card`.

## Data model

Extend `ActivityEntry`:

```ts
type ActivityEntry =
  | { kind: 'reshuffle'; count: number }
  | { kind: 'doomEscalate' }
  | { kind: 'insert'; card: Card; source?: 'godPath' | 'random' | 'overflow' | 'deficit' | 'doom' | 'option'; flavour?: string }
  | { kind: 'purge';  card: Card; source?: 'recover' | 'option' }
```

`source` drives styling (god accent, flavour rendering) without new top-level `kind`s. `flavour` is only populated when `source === 'random'` and the chosen outcome branch carries flavour text.

**Store actions:**

- `pushActivity(entry)` — appends to the current batch during a beat.
- `startBeat()` — called at the start of a beat; if the previous batch had been committed, it is replaced with `[]` and new entries flow in from `pushActivity`.
- `commitBatch()` — called when a beat completes; marks the batch as "displayed". (Implementation may collapse `startBeat` + `commitBatch` into a single boundary tracked via a `batchSealed` flag — finalised during plan-writing.)

The "clear after 1 idle draw" rule falls out: a draw that produces zero `pushActivity` calls leaves the new batch empty → log renders nothing.

## Insertion flow without InsertPreviewOverlay

Currently insertion blocks the player: card flashes face-up, "Insert" tap required, flip + shrink animation runs, then effect commits.

In the new flow, insertion is **immediate and silent at the engine level**. The reveal lives entirely in the log row.

Call sites to rewire (full list pinned during plan-writing — likely `GameScreen.tsx` plus the insertion handlers in the engine):

- Doom escalation on reshuffle → directly commits insertion; pushes `doomEscalate` + `insert{source:'doom'}`.
- Option-driven insert → directly commits; pushes `insert{source:'option'}`.
- Random outcome insert → directly commits; pushes `insert{source:'random', flavour}`.
- Overflow/deficit insert → directly commits; pushes `insert{source:'overflow'|'deficit'}`.
- God-path insert → directly commits; pushes `insert{source:'godPath'}`.
- Overflow/deficit recovery → pushes `purge{source:'recover'}` when the resource crosses back out of the trigger band.

**Migration risk:** the `flip-scene` / `shrink-to-deck` CSS animations in `index.css` may have no other consumer after this — grep and remove if orphaned (Phase 1 lesson logged in `knowledge/agents/code.md`).

## Testing

Vitest in `gameStore.test.ts`:

- `pushActivity` / batch lifecycle: batch clears on an idle beat, persists across the gap between beats.
- Reshuffle beat produces exactly `[reshuffle, doomEscalate, insert{source:'doom'}]` in order.
- Random outcome insert carries the chosen branch's flavour into the entry; absent-flavour branches yield no `flavour` field.
- God-path insert sets `source:'godPath'`.
- Overflow/deficit recovery emits `purge{source:'recover'}`.

No snapshot test for `ActivityLog.tsx` rendering — visual review only.

## Out of scope

- Phase 2 thematic flavour rewrite of recurring cards (separate spec).
- `RandomOutcomeTag` internals beyond the popover button outline.
- DoomPanel tier-specific descriptive flavour (deleted, not relocated — Q6 = A).
- Rare rotation log surfacing (silent by design — s83).
- All other Playtest 16 clusters (B, C — already shipped — and D).

## Open items for plan-writing

- Confirm the schema location of per-outcome `flavour` text on options/effects (may need a small data-model extension).
- Pin the exact call-site list for the rewire (engine handlers + `GameScreen.tsx`).
- Decide on the `startBeat`/`commitBatch` API shape vs a simpler `batchSealed` flag.
- Grep `flip-scene` / `shrink-to-deck` for orphan removal.
