import type { Card, DeckState, CardId } from '../types'

// Deck size ceiling to combat bloat (P19-35)
const MAX_DECK_SIZE = 25;

// Overflow/deficit cards exempted from pruning protection (P19-35)
const OVERFLOW_DEFICIT_IDS = new Set<string>([
  'the_weight_of_it', // Dread overflow
  'crawling_network', // Influence overflow
  'golden_opportunity', // Gold overflow
  'deficit_cycle', // Deficit card
]);

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function buildInitialDeck(cards: Card[], chainReserve: Card[] = []): DeckState {
  return {
    drawPile: shuffleArray(cards),
    discardPile: [],
    permDiscardPile: [],
    chainReserve,
    nextCycleQueue: [],
  }
}

export function drawCard(deck: DeckState): { card: Card | null; deck: DeckState } {
  if (deck.drawPile.length === 0) return { card: null, deck }
  const [card, ...rest] = deck.drawPile
  return { card, deck: { ...deck, drawPile: rest } }
}

export function discardCard(card: Card, deck: DeckState): DeckState {
  return { ...deck, discardPile: [card, ...deck.discardPile] }
}

/**
 * Insert a card into the draw pile.
 * position: 'top' | 'bottom' inserts at the respective end.
 * position: 'random' inserts at a random index within [minPos, maxPos].
 * If minPos/maxPos are omitted, the full pile length is used as the range.
 */
export function insertCard(
  card: Card,
  deck: DeckState,
  position: 'top' | 'bottom' | 'random',
  minPos?: number,
  maxPos?: number
): DeckState {
  if (position === 'top') return { ...deck, drawPile: [card, ...deck.drawPile] }
  if (position === 'bottom') return { ...deck, drawPile: [...deck.drawPile, card] }

  // 'random' with optional position range
  const len = deck.drawPile.length
  const lo = minPos !== undefined ? Math.min(minPos, len) : 0
  const hi = maxPos !== undefined ? Math.min(maxPos, len) : len
  const clampedLo = Math.min(lo, hi)
  const clampedHi = Math.max(lo, hi)
  const pos = clampedLo + Math.floor(Math.random() * (clampedHi - clampedLo + 1))
  const newPile = [...deck.drawPile]
  newPile.splice(Math.min(pos, len), 0, card)
  return { ...deck, drawPile: newPile }
}

export function moveFromDrawToDiscard(cardId: CardId, deck: DeckState): DeckState {
  const idx = deck.drawPile.findIndex(c => c.id === cardId)
  if (idx === -1) return deck
  const card = deck.drawPile[idx]
  const newDraw = deck.drawPile.filter((_, i) => i !== idx)
  return { ...deck, drawPile: newDraw, discardPile: [card, ...deck.discardPile] }
}

export function removeCardFromDeck(cardId: CardId, deck: DeckState): DeckState {
  const tryDraw = deck.drawPile.findIndex(c => c.id === cardId)
  if (tryDraw !== -1) {
    const card = deck.drawPile[tryDraw]
    if (card.permanent) return deck
    return {
      ...deck,
      drawPile: deck.drawPile.filter((_, i) => i !== tryDraw),
      permDiscardPile: [...deck.permDiscardPile, card],
    }
  }
  const tryDiscard = deck.discardPile.findIndex(c => c.id === cardId)
  if (tryDiscard !== -1) {
    const card = deck.discardPile[tryDiscard]
    if (card.permanent) return deck
    return {
      ...deck,
      discardPile: deck.discardPile.filter((_, i) => i !== tryDiscard),
      permDiscardPile: [...deck.permDiscardPile, card],
    }
  }
  // Also check the deferred queue — threats sitting here must not survive to next reshuffle
  const tryQueue = deck.nextCycleQueue.findIndex(c => c.id === cardId)
  if (tryQueue !== -1) {
    const card = deck.nextCycleQueue[tryQueue]
    if (card.permanent) return deck
    return {
      ...deck,
      nextCycleQueue: deck.nextCycleQueue.filter((_, i) => i !== tryQueue),
      permDiscardPile: [...deck.permDiscardPile, card],
    }
  }
  return deck
}

// ─── UI helper ────────────────────────────────────────────────────────────────
// Filters a list of removeCard targets against actual deck state. Mirrors the
// semantics of removeCardFromDeck (drawPile + discardPile + nextCycleQueue,
// permanent cards excluded) plus the selfRemoved branch in gameStore
// (a target equal to currentCardId is always "present").
//
// De-duplicates: the engine removes each id at most once, so duplicate inputs
// collapse to a single entry in the output. Input order preserved.
export function getActualRemovalTargets(
  cardIds: CardId[],
  deck: DeckState,
  currentCardId: CardId | null,
): CardId[] {
  const seen = new Set<CardId>()
  const out: CardId[] = []
  for (const id of cardIds) {
    if (seen.has(id)) continue
    const inDraw    = deck.drawPile.find(c => c.id === id && !c.permanent)
    const inDiscard = deck.discardPile.find(c => c.id === id && !c.permanent)
    const inQueue   = deck.nextCycleQueue.find(c => c.id === id && !c.permanent)
    const isSelf    = currentCardId !== null && id === currentCardId
    if (inDraw || inDiscard || inQueue || isSelf) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

/**
 * Rare rotation: at reshuffle time, every rare in the discard pile is retired
 * and replaced with a fresh rare drawn from `rarePool` minus `usedRareIds`
 * minus rares still in the deck. If that eligible set is empty, `usedRareIds`
 * is recycled (reset to "rares still in the deck") and the pick happens again.
 *
 * Pure function. Caller is responsible for committing the returned
 * `usedRareIds` back to game state. The returned `combined` is pre-shuffle —
 * `reshuffle()` runs `shuffleArray` on it afterwards.
 */
export function rotateRares(
  combined: Card[],
  discardPile: Card[],
  usedRareIds: Set<string>,
  rarePool: Card[],
  rareTarget: number,
  rng: () => number = Math.random,
): { combined: Card[]; usedRareIds: Set<string> } {
  const retiring = discardPile.filter(c => c.tier === 'rare')
  if (retiring.length === 0) {
    return { combined, usedRareIds }
  }

  const retiringIds = new Set(retiring.map(c => c.id))
  const afterRetire = combined.filter(c => !(c.tier === 'rare' && retiringIds.has(c.id)))

  const inDeckRareIds = new Set(
    afterRetire.filter(c => c.tier === 'rare').map(c => c.id)
  )
  const need = Math.max(0, rareTarget - inDeckRareIds.size)

  let nextUsed = new Set(usedRareIds)
  let eligible = rarePool.filter(r => !nextUsed.has(r.id) && !inDeckRareIds.has(r.id))

  if (eligible.length < need) {
    // Recycle history, but keep the rares retiring THIS cycle ineligible so the
    // same rare can't reappear two cycles in a row (P19-33). They're in discard,
    // not the deck, so inDeckRareIds alone wouldn't exclude them.
    nextUsed = new Set([...inDeckRareIds, ...retiringIds])
    eligible = rarePool.filter(r => !nextUsed.has(r.id) && !inDeckRareIds.has(r.id))
  }

  const picks: Card[] = []
  for (let i = 0; i < need; i++) {
    if (eligible.length === 0) break
    const idx = Math.floor(rng() * eligible.length)
    const picked = eligible[idx]
    picks.push(picked)
    nextUsed.add(picked.id)
    eligible = eligible.filter(r => r.id !== picked.id)
  }

  return { combined: [...afterRetire, ...picks], usedRareIds: nextUsed }
}

/**
 * Core (display: "Uncommon") rotation, mirroring rotateRares. At reshuffle,
 * every core card in the discard pile is retired and the deck is topped up to
 * `coreTarget` with fresh core from `corePool` minus `usedCoreIds` minus core
 * still in the deck. If the eligible set is too small, `usedCoreIds` is recycled
 * to "core still in deck + core retiring this cycle" so a just-retired card
 * cannot reappear two cycles in a row (P19-33 hardening).
 *
 * Pure. Caller commits the returned `usedCoreIds` to game state. `combined` is
 * pre-shuffle — reshuffle() shuffles afterwards.
 */
export function rotateCore(
  combined: Card[],
  discardPile: Card[],
  usedCoreIds: Set<string>,
  corePool: Card[],
  coreTarget: number,
  rng: () => number = Math.random,
): { combined: Card[]; usedCoreIds: Set<string> } {
  const retiring = discardPile.filter(c => c.tier === 'core')
  if (retiring.length === 0) {
    return { combined, usedCoreIds }
  }

  const retiringIds = new Set(retiring.map(c => c.id))
  const afterRetire = combined.filter(c => !(c.tier === 'core' && retiringIds.has(c.id)))

  const inDeckCoreIds = new Set(
    afterRetire.filter(c => c.tier === 'core').map(c => c.id)
  )
  // Assumes coreTarget >= in-deck core count (callers guarantee this). If need = 0 and
  // retirement still fires, the deck temporarily holds fewer core cards than coreTarget.
  // Guard: ensure callers never set coreTarget below the current in-deck core count.
  const need = Math.max(0, coreTarget - inDeckCoreIds.size)
  if (need === 0) {
    return { combined: afterRetire, usedCoreIds }
  }

  let nextUsed = new Set(usedCoreIds)
  let eligible = corePool.filter(c => !nextUsed.has(c.id) && !inDeckCoreIds.has(c.id) && !retiringIds.has(c.id))

  if (eligible.length < need) {
    nextUsed = new Set([...inDeckCoreIds, ...retiringIds])
    eligible = corePool.filter(c => !nextUsed.has(c.id) && !inDeckCoreIds.has(c.id))
  }

  const picks: Card[] = []
  for (let i = 0; i < need; i++) {
    if (eligible.length === 0) break
    const idx = Math.floor(rng() * eligible.length)
    const picked = eligible[idx]
    picks.push(picked)
    nextUsed.add(picked.id)
    eligible = eligible.filter(c => c.id !== picked.id)
  }

  return { combined: [...afterRetire, ...picks], usedCoreIds: nextUsed }
}

export function reshuffle(
  deck: DeckState,
  unravellingCard: Card,
  usedRareIds: Set<string>,
  rarePool: Card[],
  rareTarget: number = 2,
  usedCoreIds: Set<string> = new Set(),
  corePool: Card[] = [],
  coreTarget: number = 4,
): { deck: DeckState; usedRareIds: Set<string>; usedCoreIds: Set<string>; insertedUnravelling: Card; culledCount: number } {
  // Split nextCycleQueue into pinned (prepended to pos 0 post-reshuffle) and unpinned.
  const pinnedQueue   = deck.nextCycleQueue.filter(c => c.pinnedNextCycle)
  const unpinnedQueue = deck.nextCycleQueue.filter(c => !c.pinnedNextCycle)

  // A doom card from a mid-cycle dread-threshold trigger (gameStore.ts pendingUnravelling
  // insert, e.g. line ~814) may still be undrawn here — don't fold in a second fresh copy.
  const existingDoom = [...deck.drawPile, ...deck.discardPile].find(c => c.tier === 'doom')

  // Merge unpinned queue into the reshuffle pile — this is where threat inserts and
  // god path chain cards land after being queued mid-cycle.
  const preRotate = existingDoom
    ? [...deck.drawPile, ...deck.discardPile, ...unpinnedQueue]
    : [...deck.drawPile, ...deck.discardPile, unravellingCard, ...unpinnedQueue]

  // Rare rotation: retire rares that were drawn this day (in discard pile) and
  // inject fresh ones from the unused pool. See spec
  // docs/superpowers/specs/2026-06-16-rare-rotation-design.md.
  const rotated = rotateRares(preRotate, deck.discardPile, usedRareIds, rarePool, rareTarget)
  const coreRotated = rotateCore(rotated.combined, deck.discardPile, usedCoreIds, corePool, coreTarget)

  // ─── P19-35: Reshuffle-Time Prune ────────────────────────────────────────────────
  // Eviction pool: filler only (threat cards + overflow/deficit cards).
  // Protected tiers: core, common, rare, god_path, mutation, doom, treat.
  // Culled cards → permDiscardPile (no recycle). Never evict protected cards.
  // Cull order: duplicates first (by id count), then oldest (by array position).

  const combined = coreRotated.combined;
  const evictionCandidates = combined.filter(card =>
    card.tier === 'threat' || OVERFLOW_DEFICIT_IDS.has(card.id)
  );

  // Count frequency of each card id in the combined pile
  const idCounts = new Map<string, number>();
  for (const card of combined) {
    idCounts.set(card.id, (idCounts.get(card.id) ?? 0) + 1);
  }

  // Sort candidates: duplicates first (descending count), then oldest (ascending index)
  const sortedCandidates = [...evictionCandidates].sort((a, b) => {
    const countA = idCounts.get(a.id) ?? 1;
    const countB = idCounts.get(b.id) ?? 1;
    if (countA !== countB) return countB - countA; // higher count first
    return combined.indexOf(a) - combined.indexOf(b); // older (lower index) first
  });

  let pruned = [...combined];
  let culledCount = 0;
  const culledCards: Card[] = [];

  while (pruned.length > MAX_DECK_SIZE && sortedCandidates.length > 0) {
    const candidate = sortedCandidates.shift()!;
    pruned = pruned.filter(card => card !== candidate);
    culledCards.push(candidate);
    culledCount++;
  }

  // If still over ceiling after exhausting candidates, stop (never evict protected)
  let shuffled = shuffleArray(pruned);

  // Reposition ALL god path chain cards to at least 25% into the new cycle.
  const minGpPos = Math.max(5, Math.floor(shuffled.length / 4))
  const gpCards  = shuffled.filter(c => c.tier === 'god_path')
  const rest     = shuffled.filter(c => c.tier !== 'god_path')
  if (gpCards.length > 0) {
    const insertAt = Math.min(minGpPos, rest.length)
    rest.splice(insertAt, 0, ...gpCards)
    shuffled = rest
  }

  // Pinned cards surface first — prepended after god_path repositioning.
  if (pinnedQueue.length > 0) {
    shuffled = [...pinnedQueue, ...shuffled]
  }

  return {
    deck: {
      drawPile:        shuffled,
      discardPile:     [],
      permDiscardPile: [...deck.permDiscardPile, ...culledCards], // culled cards added here
      chainReserve:    deck.chainReserve,
      nextCycleQueue:  [],
    },
    usedRareIds: rotated.usedRareIds,
    usedCoreIds: coreRotated.usedCoreIds,
    insertedUnravelling: existingDoom ?? unravellingCard,
    culledCount,
  }
}

// Post-reshuffle draw order for the scripted tutorial run.
// Cards not in this list are silently dropped (unreachable in normal play).
const TUTORIAL_POST_RESHUFFLE_ORDER = [
  'tutorial_threat_card',
  'tutorial_prep_react',
  'tutorial_treat_card',
  'olgreth_2',
]

// ─── Tutorial reshuffle ───────────────────────────────────────────────────────
// Bypasses normal shuffle entirely. Pinned cards (pinnedNextCycle: true) surface
// first. Remaining cards are ordered by TUTORIAL_POST_RESHUFFLE_ORDER — any card
// not in the list is dropped. Discard pile cleared permanently.
export function tutorialReshuffle(deck: DeckState): DeckState {
  const pinned   = deck.nextCycleQueue.filter(c => c.pinnedNextCycle)
  const unpinned = deck.nextCycleQueue.filter(c => !c.pinnedNextCycle)
  const sorted   = TUTORIAL_POST_RESHUFFLE_ORDER
    .map(id => unpinned.find(c => c.id === id))
    .filter((c): c is Card => c !== undefined)
  return {
    ...deck,
    drawPile:       [...pinned, ...sorted],
    discardPile:    [],
    nextCycleQueue: [],
  }
}

export function applyPassivesForReshuffle(
  deck: DeckState,
  resources: import('../types').Resources,
  suppressDreadGain: boolean = false,
): import('../types').Resources {
  const isSuppressedDreadGain = (e: { type: string; resource?: string; delta?: number }) =>
    suppressDreadGain && e.type === 'resource' && e.resource === 'dread' && (e.delta ?? 0) > 0

  let r = resources
  const allCards = [...deck.drawPile, ...deck.discardPile]
  for (const card of allCards) {
    if (card.passive?.trigger === 'reshuffle') {
      for (const effect of card.passive.effects) {
        if (effect.type === 'resource') {
          if (isSuppressedDreadGain(effect)) continue
          r = { ...r, [effect.resource]: r[effect.resource] + effect.delta }
        } else if (effect.type === 'randomOutcome') {
          // Weighted pick one outcome branch
          const total = effect.outcomes.reduce((s, o) => s + o.weight, 0)
          let roll  = Math.random() * total
          for (const outcome of effect.outcomes) {
            roll -= outcome.weight
            if (roll <= 0) {
              for (const e of outcome.effects) {
                if (e.type === 'resource') {
                  if (isSuppressedDreadGain(e)) continue
                  r = { ...r, [e.resource]: r[e.resource] + e.delta }
                }
              }
              break
            }
          }
        }
      }
    }
  }
  return r
}

export function getUnravellingTier(reshuffleCount: number): number {
  if (reshuffleCount <= 2) return 1
  if (reshuffleCount <= 4) return 2
  if (reshuffleCount === 5) return 3
  return 4
}
