import { describe, it, expect } from 'vitest'
import { getAvailableOptions } from './effects'
import { YHA_NTHLEI_CHAIN } from '../data/godPaths/yha_nthlei'
import type { CardId, CardRunState, DeckState } from '../types'

describe('EX-07: escalates removal', () => {
  const yha3 = YHA_NTHLEI_CHAIN.find(c => c.id === 'yha_nthlei_3')!

  const emptyDeck: DeckState = {
    drawPile: [],
    discardPile: [],
    permDiscardPile: [],
    chainReserve: [],
    nextCycleQueue: [],
  }

  const condCtx = {
    resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 0, theChanged: 0 },
    deck: emptyDeck,
    godPathProgress: 3,
    runConfig: { godPath: 'yha_nthlei' as const, runLength: 'long' as const },
  }

  it('yha_nthlei_3 costs do not escalate on redraw', () => {
    const firstDrawState: Record<CardId, CardRunState> = {
      yha_nthlei_3: { drawCount: 1, chosenOptions: [] },
    }
    const secondDrawState: Record<CardId, CardRunState> = {
      yha_nthlei_3: { drawCount: 2, chosenOptions: [] },
    }

    const first = getAvailableOptions(yha3, condCtx, firstDrawState)
    const second = getAvailableOptions(yha3, condCtx, secondDrawState)

    // Option index 0 = "Approach him" (only option after EX-08 branch removal)
    const firstDeltas = first[0].effectiveEffects.filter(e => e.type === 'resource')
    const secondDeltas = second[0].effectiveEffects.filter(e => e.type === 'resource')

    expect(secondDeltas).toEqual(firstDeltas)
  })
})
