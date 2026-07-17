# God Path Ordering — Implementation Design

**Backlog refs:** P9-32, P9-33, P10-18 (priority escalated — confirmed recurring across two playtests)

**Goal:** Enforce the one-chain-card-per-cycle invariant so god path cards always appear in stage order, prevent duplicate chain cards from entering the active deck, and handle edge cases where a delay reinsertion cannot fit in the remaining draw pile.

**Architecture:** Add a single invariant guard to `advanceGodPathChain`, fix the reshuffle to reposition all god path cards (not just the first), add edge-case capping to the `insertCard` handler, and audit `yha_nthlei_4` option 3 + `terms_remain` for accidental advance triggers. No structural change to the state model.

**Tech Stack:** TypeScript, Zustand (gameStore), React — files `src/engine/godPath.ts`, `src/engine/deck.ts`, `src/state/gameStore.ts`, `src/data/godPaths/yha_nthlei.ts`, `src/data/cards/threats.ts`

---

## The Invariant

At any point in a run, **at most one god path chain card may exist** across the combined active deck:

```
drawPile + discardPile + nextCycleQueue
```

`chainReserve` and `permDiscardPile` are excluded — they are safe holding areas outside active play.

**Consequence:** Picking a non-advance option on a chain card keeps that card floating in the active deck. The next-stage card is only queued when the player picks an advance option. Because the invariant prevents queuing when any chain card is already active, card N+1 can never appear until card N has been advanced past.

---

## What Does NOT Change

- `chainReserve` structure and initialisation — unchanged
- `nextCycleQueue` as the delivery mechanism for queued chain cards — unchanged
- Explicit `insertCard` effects on non-advance options per card — unchanged (intentional: delay windows are tunable per card for balance purposes — see Balance Agent note below)
- God path card initialisation (card 1 placed at 35–75% of first draw pile) — unchanged
- `advanceGodPath` effect type and its place in `resolveOption` — unchanged

---

## Engine Changes

### 1. Invariant guard — `src/engine/godPath.ts`

Add a helper and check it at the top of `advanceGodPathChain`:

```typescript
function countActiveChainCards(deck: DeckState): number {
  return [
    ...deck.drawPile,
    ...deck.discardPile,
    ...deck.nextCycleQueue,
  ].filter(c => c.tier === 'god_path').length
}

export function advanceGodPathChain(
  newProgress: number,
  currentGodPath: GodPath,
  deck: DeckState
): DeckState {
  if (newProgress >= 6) return deck

  // Invariant: refuse to queue next card if any chain card is already active.
  // This prevents two chain cards from entering the active deck simultaneously.
  const active = countActiveChainCards(deck)
  if (active > 0) {
    console.warn(
      `[GodPath] Invariant violation: ${active} chain card(s) already active — refusing to queue stage ${newProgress + 1}`
    )
    return deck
  }

  const nextStage = newProgress + 1
  const idx = deck.chainReserve.findIndex(
    c => c.godPath === currentGodPath && c.chainStage === nextStage
  )
  if (idx === -1) return deck

  const card = deck.chainReserve[idx]
  return {
    ...deck,
    nextCycleQueue: [...deck.nextCycleQueue, card],
    chainReserve: deck.chainReserve.filter((_, i) => i !== idx),
  }
}
```

### 2. Reshuffle repositions all god path cards — `src/engine/deck.ts`

Replace the current single-card `findIndex` reposition with an extract-and-reinsert for all god path cards:

```typescript
export function reshuffle(deck: DeckState, unravellingCard: Card): DeckState {
  const combined = [
    ...deck.drawPile,
    ...deck.discardPile,
    unravellingCard,
    ...deck.nextCycleQueue,
  ]
  let shuffled = shuffleArray(combined)

  // Reposition ALL god path chain cards to at least 25% into the new cycle.
  // After the invariant guard there should be at most one, but this is robust
  // regardless.
  const minGpPos = Math.max(5, Math.floor(shuffled.length / 4))
  const gpCards = shuffled.filter(c => c.tier === 'god_path')
  const rest    = shuffled.filter(c => c.tier !== 'god_path')

  if (gpCards.length > 0) {
    const insertAt = Math.min(minGpPos, rest.length)
    rest.splice(insertAt, 0, ...gpCards)
    shuffled = rest
  }

  return {
    drawPile:      shuffled,
    discardPile:   [],
    permDiscardPile: deck.permDiscardPile,
    chainReserve:  deck.chainReserve,
    nextCycleQueue: [],
  }
}
```

### 3. Edge-case cap for short draw pile — `src/state/gameStore.ts`

In the `insertCard` case of `resolveOption`, when the card being inserted is a god path chain card with `position: 'random'`, clamp the delay to what the draw pile can actually hold:

```typescript
case 'insertCard': {
  const toInsert = getCardById(effect.cardId)
  if (!toInsert) break

  // uniqueInDeck guard (existing — unchanged)
  if (toInsert.uniqueInDeck) {
    const alreadyInDeck = [
      ...deck.drawPile, ...deck.discardPile, ...deck.nextCycleQueue,
    ].some(c => c.id === toInsert.id)
    if (alreadyInDeck) break
  }

  // Edge-case cap: god path chain card delay into a short draw pile
  if (toInsert.tier === 'god_path' && effect.position === 'random') {
    const remaining = deck.drawPile.length

    if (remaining === 0) {
      // Draw pile empty — carry card into next cycle via nextCycleQueue.
      // The reshuffle will reposition it to 25%+ of the new cycle.
      // Implementation note: verify post-resolution routing for the drawn card instance
      // does not also add it to discardPile — if it does, a removeCard effect on the
      // drawn instance is required here to avoid a duplicate.
      deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
    } else {
      const effMin = Math.min(effect.minPos ?? 0, remaining - 1)
      const effMax = Math.min(effect.maxPos ?? remaining - 1, remaining - 1)
      deck = insertCard(toInsert, deck, 'random', effMin, effMax)
    }
    break
  }

  // Standard insertCard path (existing — unchanged)
  if (effect.position === 'discard') {
    deck = { ...deck, discardPile: [...deck.discardPile, toInsert] }
  } else if (toInsert.tier === 'threat') {
    deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
  } else {
    deck = insertCard(toInsert, deck, effect.position, effect.minPos, effect.maxPos)
  }
  break
}
```

---

## Data Audit

Before the engine changes ship, audit two specific areas that match the playtest symptoms:

### `yha_nthlei_4` — The Oath of Dagon, option 3
**Symptom:** Devil's Reef (card 5) appeared after the player picked option 3, which should be non-advancing.
**Check:** Open `src/data/godPaths/yha_nthlei.ts`, locate the option at index 2 of `yha_nthlei_4.options`. Verify its `effects` array contains NO `{ type: 'advanceGodPath' }`. If it does, remove it.

### `terms_remain` — The threat inserted by Oath of Dagon refusal
**Symptom:** same run — `terms_remain` is the card inserted when the player refuses the oath. If `terms_remain` carries an `advanceGodPath` effect, it would queue card 5 when drawn.
**Check:** Open `src/data/cards/threats.ts`, locate `terms_remain`. Verify no option has `{ type: 'advanceGodPath' }`. If it does, remove it.

Both fixes are one-line removals if the accidental effect is found.

---

## Balance Agent Note

Non-advance option delay windows (`minPos` / `maxPos` in `insertCard` effects) are **intentionally per-card** and should be treated as balance levers:

- Shorter windows (4–6) = card returns quickly; low commitment, low tension
- Longer windows (7–11) = more time between encounters; higher-stakes delay

When adding or tuning god path cards, the Balance Agent should review these windows to ensure they match the intended pacing and difficulty of that stage. No engine change is needed — the explicit values in card data are the spec.

---

## What a Passing Run Looks Like After This Fix

| Cycle | God path cards in active deck |
|---|---|
| 1 | Only card 1/6 |
| 2 | Only card 2/6 (after card 1 advanced) |
| … | … |
| 6 | Only card 6/6 |

If a player delays (non-advance), the same card re-appears within the current cycle. The next-stage card is never queued until the delay is resolved and advance is chosen. If the delay is attempted on a nearly-empty pile, the card appears at the bottom of the current pile (or, if the pile is already empty, early in the next cycle — but never alongside a queued next-stage card).

**Why card N always appears before card N+1, even across the empty-pile edge case:**

When `advanceGodPath` fires on card N, that card has already been *drawn* — it is in the "currently displayed" state, not in any pile. So `countActiveChainCards = 0` at that moment, card N+1 is safely queued, and card N moves to `permDiscardPile` after resolution. Card N+1 cannot enter `nextCycleQueue` at any other time. If card N carried over to the next cycle via the empty-pile path, card N+1 remains locked in `chainReserve` until the player actually advances — meaning the next cycle still has exactly one chain card in it (card N), and card N+1 cannot appear before it.
