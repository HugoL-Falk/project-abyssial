# Passive Summary Button — P10-28 Phase 2

**Goal:** Give the player an on-demand way to see what passive effects are currently running in their deck — so when a resource changes unexpectedly they know why.

**Backlog reference:** P10-28 Phase 2

---

## Problem

Passive cards (treat/threat tier cards with `passive` or `onDraw` fields) fire resource effects silently. The player sees their dread tick up at reshuffle or gold drop on draw but has no way to trace it back to a cause. Phase 1 (Session 50) added a `CardPassiveTag` tooltip on each drawn card. Phase 2 adds a persistent, always-accessible summary.

---

## Design

### Trigger

A small `↻` button appended to the right end of the resource bar row, after the last resource counter. Always rendered during `phase === 'playing'`. Same visual style as the existing `?` tooltip buttons: gold text (`#c89020`), dark background, 1px gold border, `small-caps`, `border-radius: 2px`.

### Tooltip

Fixed-position tooltip (same pattern as `RandomOutcomeTag`): positioned above the button via `getBoundingClientRect`, `z-index: 500`, dark background `rgba(6,4,2,0.97)`, 1px `var(--border)` border, `border-radius: 2px`, `white-space: nowrap`.

Two rows inside the tooltip:

```
↻  Each reshuffle    +2 dread  −1 gold
⬇  On draw           +2 dread
```

- **Row 1 — Each reshuffle:** Aggregated effects from all cards in `drawPile + discardPile` with `passive?.trigger === 'reshuffle'`. Resource deltas summed per resource key (e.g. two cards with dread+1 → dread+2). Displayed as resource icon + delta using the same colour logic as `EffectTags` (dread positive = red, other positive = green).
- **Row 2 — On draw:** Aggregated effects from all cards with `onDraw`. Same summation and display.
- **Probabilistic effects** (`randomOutcome` inside a passive): cannot be summed. Shown as a separate line per card: e.g. `~20% +1 gold or +1 relics` (italic, dimmed). One line per probabilistic card.
- **Empty category:** If no cards contribute to a row, that row shows `—` (em-dash) in place of tags.
- **Tooltip dismissal:** tap the `↻` button again (toggle). Matches `RandomOutcomeTag` — no tap-outside close.

### No passive cards at all

Both rows show `—`. The button is still present. This ensures the player learns it exists before they need it.

---

## Implementation

### New file: `src/components/game/PassiveSummaryButton.tsx`

Self-contained component. Reads `deck` directly from `useGameStore`. No props needed.

**Aggregation logic:**

```ts
const allCards = [...deck.drawPile, ...deck.discardPile]

// Reshuffle passives
const reshuffleCards = allCards.filter(c => c.passive?.trigger === 'reshuffle')
// OnDraw passives
const onDrawCards = allCards.filter(c => c.onDraw && c.onDraw.length > 0)
```

For each category, iterate cards and accumulate resource deltas into `Partial<Record<ResourceKey, number>>`. Handle `passive.effects` vs `onDraw` arrays identically. Skip effects where `e.type === 'randomOutcome'` during summation — collect those cards separately for the probabilistic display lines.

Tooltip open/close: `useState(false)`. Position: `useState<{bottom: number; left: number} | null>(null)`. Set on open via `btnRef.current.getBoundingClientRect()` (same pattern as `RandomOutcomeTag`).

### Modified file: `src/components/game/ResourceBar.tsx`

Add `<PassiveSummaryButton />` inside the resources row `<div>`, after the `isShub && <ResourceCounter rkey="theChanged" ... />` line. No new props to `ResourceBar` — `PassiveSummaryButton` reads the store itself.

---

## What This Does Not Change

- `CardPassiveTag` in `DrawnCard.tsx` — unchanged. It remains a per-card tooltip on the drawn card screen.
- `applyPassivesForReshuffle` in `deck.ts` — no engine changes.
- Game state shape — no new fields.
- Any card data — no changes to card definitions.

---

## Out of Scope

- Showing passive card titles (Phase 2 is net aggregate only — option A from design session).
- Distinguishing which specific cards contribute to each delta line.
- Animating the `↻` button when a passive fires.
- Filtering by resource (tapping a specific resource icon to see its passives).
