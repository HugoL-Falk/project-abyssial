import type { Card, GodPath, DeckState, CardId, CardRunState } from '../types'

const THEME_WEIGHT_MULTIPLIER = 3

export function weightedDraw(
  godPath: GodPath,
  allCommons: Card[]
): Card[] {
  const minCount = 3
  const maxCount = 4
  const targetCount = minCount + Math.floor(Math.random() * (maxCount - minCount + 1))

  // Build weighted pool — themed cards appear THEME_WEIGHT_MULTIPLIER times
  const weightedPool: Card[] = []
  for (const card of allCommons) {
    const weight = card.godPathWeight === godPath ? THEME_WEIGHT_MULTIPLIER : 1
    for (let i = 0; i < weight; i++) weightedPool.push(card)
  }

  // Sample without replacement by card id
  const selected: Card[] = []
  const usedIds = new Set<string>()
  const shuffled = [...weightedPool].sort(() => Math.random() - 0.5)

  for (const card of shuffled) {
    if (!usedIds.has(card.id) && selected.length < targetCount) {
      selected.push(card)
      usedIds.add(card.id)
    }
  }

  return selected
}

export function weightedCoreDraw(
  godPath: GodPath,
  pool: Card[]
): Card[] {
  const count = 4

  const weightedPool: Card[] = []
  for (const card of pool) {
    const weight = card.godPathWeight === godPath ? THEME_WEIGHT_MULTIPLIER : 1
    for (let i = 0; i < weight; i++) weightedPool.push(card)
  }

  const selected: Card[] = []
  const usedIds = new Set<string>()
  const shuffled = [...weightedPool].sort(() => Math.random() - 0.5)

  for (const card of shuffled) {
    if (!usedIds.has(card.id) && selected.length < count) {
      selected.push(card)
      usedIds.add(card.id)
    }
  }

  return selected
}

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
): { deck: DeckState; queued: boolean } {
  if (newProgress >= 6) return { deck, queued: false }

  // Invariant: refuse to queue next card if any chain card is already active.
  // This prevents two chain cards from entering the active deck simultaneously.
  // IMPORTANT: caller must NOT increment godPathProgress when queued === false —
  // the progress counter must stay in sync with what is actually queued.
  const active = countActiveChainCards(deck)
  if (active > 0) {
    console.warn(
      `[GodPath] Invariant violation: ${active} chain card(s) already active — refusing to queue stage ${newProgress + 1}`
    )
    return { deck, queued: false }
  }

  const nextStage = newProgress + 1
  const idx = deck.chainReserve.findIndex(
    c => c.godPath === currentGodPath && c.chainStage === nextStage
  )
  if (idx === -1) return { deck, queued: false }
  const card = deck.chainReserve[idx]

  // Queue the next chain card for the next reshuffle.
  return {
    deck: {
      ...deck,
      nextCycleQueue: [...deck.nextCycleQueue, card],
      chainReserve: deck.chainReserve.filter((_, i) => i !== idx),
    },
    queued: true,
  }
}

export function checkCondition(
  condition: import('../types').Condition,
  state: {
    resources: import('../types').Resources
    deck: DeckState
    godPathProgress: number
    runConfig: import('../types').RunConfig | null
    cardRunState?: Record<CardId, CardRunState>
    prepTags?: string[]
  }
): boolean {
  switch (condition.type) {
    case 'resourceMin':
      return state.resources[condition.resource] >= condition.min
    case 'resourceMax':
      return state.resources[condition.resource] <= condition.max
    case 'hasCard':
      return (
        state.deck.drawPile.some(c => c.id === condition.cardId) ||
        state.deck.discardPile.some(c => c.id === condition.cardId)
      )
    case 'godPath':
      return state.runConfig?.godPath === condition.path
    case 'godPathStageMin':
      return state.godPathProgress >= condition.min
    case 'runLength':
      return state.runConfig?.runLength === condition.length
    case 'not':
      return !checkCondition(condition.condition, state)
    case 'and':
      return condition.conditions.every(c => checkCondition(c, state))
    case 'or':
      return condition.conditions.some(c => checkCondition(c, state))
    case 'cardDrawCount': {
      const drawCount = state.cardRunState?.[condition.cardId]?.drawCount ?? 0
      if (condition.min !== undefined && drawCount < condition.min) return false
      if (condition.max !== undefined && drawCount > condition.max) return false
      return true
    }
    case 'cardOptionChosen': {
      const chosen = state.cardRunState?.[condition.cardId]?.chosenOptions ?? []
      return chosen.includes(condition.optionIdx)
    }
    case 'hasPrepTag':
      return (state.prepTags ?? []).includes(condition.tag)
    case 'notHasPrepTag':
      return !(state.prepTags ?? []).includes(condition.tag)
  }
}
