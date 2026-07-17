# Deck Bloat Fix — Single-Use Threat & Treat Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make threat and treat tier cards single-use by default — they disappear after being drawn and resolved, instead of recycling back into the deck every reshuffle.

**Architecture:** Three targeted changes: (1) mark two passive treat cards `permanent: true` so they keep recycling; (2) add a single routing condition in the game loop so all other threat/treat cards route to `permDiscardPile` after resolution; (3) auto-inject a `−card` UI tag in `EffectTags` for single-use options so the player always sees the signal.

**Tech Stack:** TypeScript, React, Vite. No test framework — validation is `npm run build` + manual in-game verification.

---

## File Map

| File | Change |
|---|---|
| `src/data/cards/treats.ts` | Add `permanent: true` to `his_research_notes` and `marsh_connection` |
| `src/engine/gameLoop.ts` | Add `isSingleUse` constant + extend discard-routing condition |
| `src/components/game/EffectTags.tsx` | Add `cardTier` + `cardPermanent` props; auto-inject `−card` tag |
| `src/components/game/OptionsColumn.tsx` | Pass `card.tier` + `card.permanent` to `EffectTags` |

---

## Task 1: Mark passive treats as permanent

**Context:** `his_research_notes` and `marsh_connection` are passive treat cards that fire a bonus every reshuffle. They must survive across reshuffles. The `permanent` field already exists on the `Card` type (`permanent?: boolean`) — it's also used by `removeCardFromDeck` to prevent the card from being ejected. Setting it here exempts these two cards from the new single-use routing rule.

**Files:**
- Modify: `src/data/cards/treats.ts`

- [ ] **Step 1: Add `permanent: true` to `his_research_notes`**

In `src/data/cards/treats.ts`, the `his_research_notes` object starts at the line `id: 'his_research_notes'`. Add `permanent: true` as the second field:

```ts
  {
    // Inserted by dreaming_academic — "Bring him in".
    // Positive passive: Relics +1/reshuffle.
    id: 'his_research_notes',
    title: 'His Research Notes',
    permanent: true,
    flavourText: 'Forty years of work. Impeccable sourcing. Absolutely no conclusions drawn, because drawing the conclusion would require accepting what the evidence means.',
    tier: 'treat',
```

- [ ] **Step 2: Add `permanent: true` to `marsh_connection`**

In the same file, the `marsh_connection` object. Add `permanent: true` as the second field:

```ts
  {
    // Inserted by forgers_debt — "Meet him".
    // Positive passive: 40% chance Gold +1 or Relic +1 per reshuffle.
    // Weights: 1 Gold +1 / 1 Relic +1 / 3 nothing  ->  20% / 20% / 60%.
    id: 'marsh_connection',
    title: 'The Marsh Connection',
    permanent: true,
    flavourText: 'He writes monthly now. The letters smell of brine, but the advice is excellent.',
    tier: 'treat',
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
npm run build
```

Expected: `✓ built in ~1s` with no errors. If TypeScript complains about `permanent` not existing on `Card`, check `src/types/index.ts` — the field should already be there as `permanent?: boolean`. If it's missing, add it.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/treats.ts
git commit -m "data: permanent: true on his_research_notes + marsh_connection"
```

---

## Task 2: Single-use routing in the game loop

**Context:** In `src/engine/gameLoop.ts` around line 413, after a card's effects are applied, three booleans determine where the card goes:

- `selfRemoved` — option had `removeCard self` → card dropped entirely (already works)
- `didAdvanceChain` — god-path chain card advanced → route to `permDiscardPile` (already works)
- `selfReinserts` — option had `insertCard self` → fresh copy re-queued, original to `permDiscardPile` (already works)
- **gap:** everything else → `discardPile` → comes back at reshuffle ← this is what we fix

The fix: add `isSingleUse` — `true` for non-permanent threat/treat cards — and include it in the `permDiscardPile` condition.

**Files:**
- Modify: `src/engine/gameLoop.ts:413-428`

- [ ] **Step 1: Add `isSingleUse` and extend the routing condition**

Find this block in `src/engine/gameLoop.ts` (currently lines 413–428):

```ts
  const selfRemoved     = effects.some(e => e.type === 'removeCard' && e.cardId === card.id)
  const didAdvanceChain = effects.some(e => e.type === 'advanceGodPath') && card.tier === 'god_path'
  const selfReinserts   = effects.some(e => e.type === 'insertCard' && e.cardId === card.id)

  if (!selfRemoved) {
    if (didAdvanceChain || selfReinserts) {
      // Permanently retire the card so it cannot re-enter the deck at the next reshuffle:
      // • didAdvanceChain: played chain cards must not return — countActiveChainCards would
      //   see them in discardPile and block queuing the next stage (P11-19 root cause).
      // • selfReinserts: a fresh copy was already inserted by the effect; discarding the
      //   original to the regular pile would create a duplicate after reshuffle.
      deck = { ...deck, permDiscardPile: [...deck.permDiscardPile, card] }
    } else {
      deck = discardCard(card, deck)
    }
  }
```

Replace it with:

```ts
  const selfRemoved     = effects.some(e => e.type === 'removeCard' && e.cardId === card.id)
  const didAdvanceChain = effects.some(e => e.type === 'advanceGodPath') && card.tier === 'god_path'
  const selfReinserts   = effects.some(e => e.type === 'insertCard' && e.cardId === card.id)
  const isSingleUse     = (card.tier === 'threat' || card.tier === 'treat') && !card.permanent

  if (!selfRemoved) {
    if (didAdvanceChain || selfReinserts || isSingleUse) {
      // Permanently retire the card so it cannot re-enter the deck at the next reshuffle:
      // • didAdvanceChain: played chain cards must not return — countActiveChainCards would
      //   see them in discardPile and block queuing the next stage (P11-19 root cause).
      // • selfReinserts: a fresh copy was already inserted by the effect; discarding the
      //   original to the regular pile would create a duplicate after reshuffle.
      // • isSingleUse: threat/treat cards are single-use by default (P9-34 / P11-32 deck
      //   bloat fix). Cards with permanent: true (his_research_notes, marsh_connection)
      //   are exempt and continue to recycle normally.
      deck = { ...deck, permDiscardPile: [...deck.permDiscardPile, card] }
    } else {
      deck = discardCard(card, deck)
    }
  }
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
npm run build
```

Expected: `✓ built in ~1s` with no errors.

- [ ] **Step 3: Manual smoke test**

Start a run. Draw any threat card (e.g. `investigators_file`, `strings_attached`, `cursed_object`). Resolve it — pick any option. Complete the cycle and reshuffle. **Verify:** the resolved threat does NOT reappear in the new cycle. The deck should return to roughly its starting size (19 core + commons) rather than growing.

Also draw `his_research_notes` or `marsh_connection` if available — resolve the single option. **Verify:** these DO reappear after reshuffle (they are `permanent: true`).

- [ ] **Step 4: Commit**

```bash
git add src/engine/gameLoop.ts
git commit -m "engine(P9-34): threat/treat cards route to permDiscardPile after resolution

Single-use by default: resolved threats/treats go to permDiscardPile instead
of discardPile, so they don't return at next reshuffle. Cards with
permanent: true (his_research_notes, marsh_connection) are exempt.
Self-reinserting options (insertCard self) still work — fresh copy
re-enters deck, original retires as before."
```

---

## Task 3: Auto `−card` tag for single-use options

**Context:** The `−card` tag currently only shows when an option has an explicit `removeCard` effect in its data. After the engine change in Task 2, many threat options that previously had no explicit `removeCard` will now silently disappear — the player won't see the `−card` signal. We fix this by auto-injecting the tag in `EffectTags` for any threat/treat option that doesn't explicitly self-reinsert and isn't permanent.

The auto-tag fires when:
1. `cardTier` is `'threat'` or `'treat'` (new prop)
2. `cardPermanent` is not `true` (new prop)
3. The option has no explicit `removeCard` effect already (avoids duplicates)
4. The option has no `insertCard self` effect (those already show `+ card`, card is coming back)

**Files:**
- Modify: `src/components/game/EffectTags.tsx`
- Modify: `src/components/game/OptionsColumn.tsx`

- [ ] **Step 1: Add `cardTier` and `cardPermanent` props to `EffectTags`**

In `src/components/game/EffectTags.tsx`, find the exported function signature (line 167):

```ts
export function EffectTags({ effects, onPreviewCard, inline, godPathCtx, currentCardId }: {
  effects: Effect[]
  onPreviewCard?: (cardId: string) => void
  inline?: boolean
  godPathCtx?: { godPath: GodPath; chainStage: number; chainTotal: number }
  currentCardId?: string
}) {
```

Replace with:

```ts
export function EffectTags({ effects, onPreviewCard, inline, godPathCtx, currentCardId, cardTier, cardPermanent }: {
  effects: Effect[]
  onPreviewCard?: (cardId: string) => void
  inline?: boolean
  godPathCtx?: { godPath: GodPath; chainStage: number; chainTotal: number }
  currentCardId?: string
  cardTier?: string
  cardPermanent?: boolean
}) {
```

- [ ] **Step 2: Inject the auto `−card` tag**

In the same file, find the closing lines of the `sortedEffects.forEach` block (around line 278), just before the `if (tags.length === 0)` check:

```ts
  })

  if (tags.length === 0) return null
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: inline ? 0 : '0.3rem' }}>{tags}</div>
}
```

Replace with:

```ts
  })

  // Auto-inject −card for single-use threat/treat options.
  // Only fires when the option doesn't already have an explicit removeCard tag
  // and doesn't self-reinsert (those already show +card and the card returns).
  const hasExplicitRemove = effects.some(e => e.type === 'removeCard')
  const hasSelfReinsert   = !!currentCardId && effects.some(e => e.type === 'insertCard' && e.cardId === currentCardId)
  const autoRemoveCard    =
    (cardTier === 'threat' || cardTier === 'treat') &&
    !cardPermanent &&
    !hasExplicitRemove &&
    !hasSelfReinsert

  if (autoRemoveCard) {
    tags.push(
      <span key="auto-remove" style={{
        fontSize: '0.8rem', color: '#e08080', background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(220,80,80,0.5)', padding: '0.2rem 0.5rem', borderRadius: '2px',
      }}>
        − card
      </span>
    )
  }

  if (tags.length === 0) return null
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: inline ? 0 : '0.3rem' }}>{tags}</div>
}
```

- [ ] **Step 3: Pass `cardTier` and `cardPermanent` from `OptionsColumn`**

In `src/components/game/OptionsColumn.tsx`, find the `<EffectTags` call (around line 128):

```tsx
              <EffectTags
                effects={effectiveEffects}
                onPreviewCard={avail ? onPreviewCard : undefined}
                inline
                currentCardId={currentCard?.id}
                godPathCtx={currentCard?.tier === 'god_path' && currentCard.godPath && currentCard.chainStage
                  ? { godPath: currentCard.godPath, chainStage: currentCard.chainStage, chainTotal }
                  : undefined}
              />
```

Replace with:

```tsx
              <EffectTags
                effects={effectiveEffects}
                onPreviewCard={avail ? onPreviewCard : undefined}
                inline
                currentCardId={currentCard?.id}
                cardTier={currentCard?.tier}
                cardPermanent={currentCard?.permanent}
                godPathCtx={currentCard?.tier === 'god_path' && currentCard.godPath && currentCard.chainStage
                  ? { godPath: currentCard.godPath, chainStage: currentCard.chainStage, chainTotal }
                  : undefined}
              />
```

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
npm run build
```

Expected: `✓ built in ~1s` with no errors.

- [ ] **Step 5: Manual smoke test**

Draw any threat card. **Verify:**
- All options show `−card` tag (either from explicit data or auto-injected)
- Options with `insertCard self` (persistent re-queue, e.g. `ongoing_arrangement` "Continue") do NOT show `−card` — they show `+ card` instead
- `his_research_notes` "Consult the notes" and `marsh_connection` "Read the letter" do NOT show `−card` (they are `permanent: true`)

- [ ] **Step 6: Commit**

```bash
git add src/components/game/EffectTags.tsx src/components/game/OptionsColumn.tsx
git commit -m "ui(P9-34): auto −card tag for single-use threat/treat options

EffectTags accepts cardTier + cardPermanent props. When a threat/treat
option has no explicit removeCard and no insertCard self, injects a
−card tag automatically so the player always sees the removal signal."
```

---

## Final verification

- [ ] **Full build check**

```bash
npm run build
```

Expected: `✓ built in ~1s`, zero TypeScript errors, zero warnings.

- [ ] **Deck size check** (manual)

Play a full run to reshuffle. Count the draw pile before and after the first reshuffle. Expected: deck size at second reshuffle ≈ starting deck size (19 core + commons + 1 new unravelling card). No accumulated threats from the previous cycle should be present.
