import type { Card, RunConfig, Resources, BlessingId, DeckState } from '../types'
import { STARTING_RESOURCES } from './resources'
import { buildInitialDeck, shuffleArray } from './deck'
import { weightedDraw } from './godPath'

export function buildStartingResources(
  selectedBlessingIds: BlessingId[],
  allBlessings: import('../types').BlessingCard[]
): Resources {
  let r: Resources = { ...STARTING_RESOURCES }
  for (const id of selectedBlessingIds) {
    const blessing = allBlessings.find(b => b.id === id)
    if (!blessing?.resourceBonuses) continue
    for (const bonus of blessing.resourceBonuses) {
      r = { ...r, [bonus.resource]: r[bonus.resource] + bonus.delta }
    }
  }
  return r
}

export function buildStartingDeck(
  config: RunConfig,
  selectedBlessingIds: BlessingId[],
  coreCards: Card[],
  allCommons: Card[],
  allRares: Card[],
  godPathChains: Record<import('../types').GodPath, Card[]>,
  allBlessings: import('../types').BlessingCard[]
): DeckState {
  const rareCount = 2

  // Weighted common selection
  const commons = weightedDraw(config.godPath, allCommons)

  // Random rare selection
  const shuffledRares = shuffleArray(allRares)
  const rares = shuffledRares.slice(0, rareCount)

  // All 6 god path chain cards for the active path
  const chainCards = godPathChains[config.godPath]

  // Blessing injection cards
  const injectedCards: Card[] = []
  for (const id of selectedBlessingIds) {
    const blessing = allBlessings.find(b => b.id === id)
    if (blessing?.injectCardId) {
      // The injected card lookup happens in data/index; we skip here and handle at store level
    }
  }

  const allStartingCards = [...coreCards, ...commons, ...rares, ...chainCards, ...injectedCards]
  return buildInitialDeck(allStartingCards)
}
