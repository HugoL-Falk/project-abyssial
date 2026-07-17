# God Path Surface Mechanic Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix a fundamental design bug where `advanceGodPath` on non-chain cards skips god path stages. Introduce a `surfaceGodPathCard` effect that repositions the current pending chain card earlier in the draw pile, replace `regressGodPath` with a passive dread penalty, and ensure god path stages can only be completed by playing chain cards in order.

**Architecture:** New effect type `surfaceGodPathCard` handles repositioning only. Existing `advanceGodPath` on chain cards is untouched — it remains the stage-completion mechanism. `regressGodPath` is removed entirely.

**Tech Stack:** TypeScript. No tests framework — verify with `npm run typecheck`.

---

## Background / Bug Being Fixed

`advanceGodPath` currently does two different things depending on context:
- On **chain cards** (correct): queues the next chain card from `chainReserve`, increments `godPathProgress`. This is stage completion.
- On **core cards** (wrong): also queues the next chain card, skipping any chain card that was played without advancing. Stages can be bypassed.

The player should always encounter chain cards 1→2→3→4→5→6 in order. The only way to progress through a stage is to play that stage's chain card and choose the advance option. Core cards with `advanceGodPath` should instead pull the *current* pending chain card earlier in the draw pile — making it arrive sooner, not skipping it.

Additionally, `regressGodPath` (used by `covenant_demands`) has a chain-break bug: if the next chain card was already queued into `nextCycleQueue` when regression fires, playing that chain card's advance option afterwards fails to queue the stage after it (the card is no longer in `chainReserve`). The god path becomes permanently stuck. Removing `regressGodPath` removes this bug entirely.

---

## Effect Semantics

### `surfaceGodPathCard` (new)
- Finds the first card with `tier === 'god_path'` in `deck.drawPile`
- If found at index > 2: moves it to index 2 (3rd position from top of draw pile)
- If found at index 0–2: no-op (already near the top)
- If no god_path card in `drawPile` (in `nextCycleQueue`, `chainReserve`, or not yet queued): no-op, effect is silently skipped
- Does **not** touch `godPathProgress`, `chainReserve`, or `nextCycleQueue`

### `advanceGodPath` (unchanged)
- Remains on all chain card advance options only
- Continues to queue the next chain card and increment `godPathProgress`

### `regressGodPath` (removed)
- Removed from type system and engine
- `covenant_demands` "Refuse the terms" replaces it with `{ type: 'resource', resource: 'dread', delta: 4 }`

---

## Files Changed

### `src/types/index.ts`
- Add `{ type: 'surfaceGodPathCard' }` to the `Effect` union
- Remove `{ type: 'regressGodPath' }` from the `Effect` union

### `src/state/gameStore.ts`
- Add `case 'surfaceGodPathCard'`: find first `tier === 'god_path'` card in `deck.drawPile`; if found at index > 2, splice it out and re-insert at index 2; otherwise no-op
- Remove `case 'regressGodPath'`

### `src/data/cards/core.ts`
Three options updated — `advanceGodPath` → `surfaceGodPathCard`:
- `the_old_book` "Hire a translator"
- `the_seance` "Attend and steer"
- `the_opium_den` "Encourage the visits"

### `src/data/cards/threats.ts`
Two cards updated:
- `what_was_already_read` "The words arrange themselves": `advanceGodPath` → `surfaceGodPathCard`
- `covenant_demands` "Refuse the terms": `{ type: 'regressGodPath' }` → `{ type: 'resource', resource: 'dread', delta: 4 }`

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Chain card at index 0–2 in drawPile | No-op — already surfaced |
| Chain card in `nextCycleQueue` (not in drawPile yet) | No-op |
| Chain card in `chainReserve` (not yet queued) | No-op |
| Multiple god_path cards in drawPile (shouldn't occur) | Move first found to index 2 |
| drawPile has fewer than 3 cards | Move chain card to `Math.min(2, drawPile.length - 1)` |

---

## What Is Not Changed

- All `advanceGodPath` effects on chain card options (all three god path files) — untouched
- `godPath.ts` — no changes
- `advanceGodPathChain` function — no changes
- The invariant guard in `advanceGodPathChain` — no changes
- `godPathProgress` tracking — no changes
- Reshuffle repositioning logic (chain cards placed at 25%+ on reshuffle) — no changes
