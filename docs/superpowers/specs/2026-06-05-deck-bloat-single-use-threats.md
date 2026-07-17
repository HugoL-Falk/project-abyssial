# Deck Bloat Fix — Single-Use Threat & Treat Cards

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent deck bloat by making threat and treat tier cards single-use by default — they disappear after being drawn and resolved, instead of recycling back into the deck every reshuffle.

**Architecture:** One engine routing change in `gameLoop.ts` + a `persistent` flag for the two passive treats that must survive across reshuffles + auto-display of `−card` UI tag for single-use options in `EffectTags.tsx`.

**Backlog references:** P9-34, P11-32

---

## Problem

The source cards (core/common) that insert threats and treats are permanent — they recycle every reshuffle and can re-trigger their insert options repeatedly. If the *inserted* cards also recycle, deck size compounds with each cycle. Confirmed at 30+ cards by 3rd reshuffle, ~120 cards total by run end, across 3 playtests.

**Root cause:** In `gameLoop.ts`, after a card is resolved, the routing logic sends cards to either `permDiscardPile` (gone forever) or `discardPile` (returns at next reshuffle). Threat and treat cards currently take the `discardPile` path by default — they come back every reshuffle unless the chosen option had an explicit `removeCard self` or `insertCard self` effect.

---

## Design

### Rule

Threat and treat tier cards are **single-use by default**: after being drawn and resolved, they route to `permDiscardPile`. They do not return at the next reshuffle.

**Exception — permanent flag:** Cards with `permanent: true` are excluded from this rule and continue to recycle normally. Only two cards qualify: `his_research_notes` and `marsh_connection` (passive treats that fire a bonus on every reshuffle — their value depends on recurring over the run). The `permanent` field already exists on the `Card` type and is already respected by `removeCardFromDeck`.

**Exception — self-reinserting options:** If the player chose an option with `insertCard self` in its effects, the card was already explicitly re-queued into the draw pile. The original is still routed to `permDiscardPile` (existing behaviour, unchanged) to prevent duplicates. The re-queued copy will itself be single-use when drawn.

### Target deck size

- Starting deck: 19 core + up to 8 common = ~24–27 cards
- Threats/treats inserted during a cycle are drawn once and gone — deck returns to base size each reshuffle
- Player choices that insert multiple threats (e.g. rare cards, escalating chains) cause temporary growth within a cycle but not cumulative growth across reshuffles
- Unavoidable growth: +1 unravelling card per reshuffle (intended pressure escalation)

---

## Changes

### 1. `src/data/cards/treats.ts`

Add `permanent: true` to `his_research_notes` and `marsh_connection`. The `permanent` field already exists on the `Card` type (`permanent?: boolean`) and already prevents `removeCard` from ejecting the card. Reusing it here also exempts the card from the single-use routing rule — no new type field needed.

```ts
{
  id: 'his_research_notes',
  permanent: true,
  // ...
}

{
  id: 'marsh_connection',
  permanent: true,
  // ...
}
```

### 2. `src/engine/gameLoop.ts`

Extend the discard routing block (currently lines ~413–428). Add `isSingleUse` condition:

```ts
const selfRemoved     = effects.some(e => e.type === 'removeCard' && e.cardId === card.id)
const didAdvanceChain = effects.some(e => e.type === 'advanceGodPath') && card.tier === 'god_path'
const selfReinserts   = effects.some(e => e.type === 'insertCard' && e.cardId === card.id)
const isSingleUse     = (card.tier === 'threat' || card.tier === 'treat') && !card.permanent

if (!selfRemoved) {
  if (didAdvanceChain || selfReinserts || isSingleUse) {
    deck = { ...deck, permDiscardPile: [...deck.permDiscardPile, card] }
  } else {
    deck = discardCard(card, deck)
  }
}
```

No other engine changes needed. The existing `selfRemoved` and `selfReinserts` paths are unchanged and still take priority.

### 3. `src/components/game/EffectTags.tsx`

Auto-display `−card` on any threat or treat option that does not have `insertCard self` in its effects, and whose card is not `permanent`.

**Current behaviour:** `−card` only shows when effects array contains an explicit `removeCard` entry.

**New behaviour:** For threat/treat tier cards, `−card` is shown automatically unless:
- The option contains `insertCard` with `cardId === card.id` (card is coming back — show `+card` instead, which already renders)
- The card has `permanent: true` (passive treat — card always returns, no removal signal needed)

`OptionsColumn.tsx` already passes option effects down to `EffectTags`. The card tier and `persistent` flag need to be passed as additional props. `EffectTags` injects a display-only `−card` signal based on this.

---

## What This Does Not Change

- **Mutation cards** (`tier: 'mutation'`): not threat/treat tier, not affected. They recycle normally as part of the Shub-Niggurath deck substitution system.
- **God path chain cards** (`tier: 'god_path'`): already route to `permDiscardPile` via `didAdvanceChain`. Unchanged.
- **Doom/unravelling cards** (`tier: 'doom'`): different lifecycle, not affected.
- **Core and common cards**: unchanged. They always recycle.
- **Explicit `removeCard self` effects on threat options**: these remain valid and still work (the `selfRemoved` path fires first). They are now redundant for routing purposes but harmless — no data cleanup required.

---

## Out of Scope

- Removing redundant `removeCard self` data entries from threat options (harmless, deferred)
- Capping the number of simultaneously inserted threats (not needed if single-use rule holds)
- Changes to unravelling card lifecycle (separate escalation system)
