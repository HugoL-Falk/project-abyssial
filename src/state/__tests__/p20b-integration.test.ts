import { describe, it, expect } from 'vitest'
import { checkCondition } from '../../engine/godPath'
import { SHUB_NIGGURATH_CHAIN } from '../../data/godPaths/shub_niggurath'
import { THREAT_CARDS } from '../../data/cards/threats'
import { STARTING_RESOURCES } from '../../engine/resources'

// Minimal game state builder for condition checks
const minState = (
  resources: Partial<typeof STARTING_RESOURCES>,
  overrides: { godPathProgress?: number; runConfig?: any } = {}
) => ({
  resources: { ...STARTING_RESOURCES, ...resources },
  deck: { drawPile: [], discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [] },
  godPathProgress: overrides.godPathProgress ?? 0,
  runConfig: overrides.runConfig ?? { godPath: 'shub_niggurath', runLength: 'short' },
  cardRunState: {},
  prepTags: [],
})

// ─── shub_niggurath_6 victory gates (P20-B §3) ────────────────────────────────

const shub6 = SHUB_NIGGURATH_CHAIN.find(c => c.id === 'shub_niggurath_6')!

describe('shub_niggurath_6 victory conditions (P20-B)', () => {
  it('card is present in chain', () => {
    expect(shub6).toBeDefined()
    expect(shub6.id).toBe('shub_niggurath_6')
  })

  it('theChanged >= 3 + godPathStage >= 5 → full victory condition passes', () => {
    const fullOpt = shub6.options[0]
    expect(fullOpt.condition).toBeDefined()
    const state = minState(
      { theChanged: 3, relics: 2 },
      { godPathProgress: 5, runConfig: { godPath: 'shub_niggurath', runLength: 'short' } }
    )
    expect(checkCondition(fullOpt.condition!, state as any)).toBe(true)
  })

  it('theChanged = 2 → full victory condition fails', () => {
    const fullOpt = shub6.options[0]
    const state = minState(
      { theChanged: 2, relics: 2 },
      { godPathProgress: 5, runConfig: { godPath: 'shub_niggurath', runLength: 'short' } }
    )
    expect(checkCondition(fullOpt.condition!, state as any)).toBe(false)
  })

  it('theChanged = 2 + followers >= 3 + relics >= 1 + godPathStage >= 5 → partial victory condition passes (P25-51)', () => {
    const partialOpt = shub6.options[1]
    expect(partialOpt.condition).toBeDefined()
    const state = minState(
      { theChanged: 2, followers: 3, relics: 1 },
      { godPathProgress: 5, runConfig: { godPath: 'shub_niggurath', runLength: 'short' } }
    )
    expect(checkCondition(partialOpt.condition!, state as any)).toBe(true)
  })

  it('theChanged = 2 + followers < 3 → partial victory condition fails (P25-51)', () => {
    const partialOpt = shub6.options[1]
    const state = minState(
      { theChanged: 2, followers: 2, relics: 1 },
      { godPathProgress: 5, runConfig: { godPath: 'shub_niggurath', runLength: 'short' } }
    )
    expect(checkCondition(partialOpt.condition!, state as any)).toBe(false)
  })

  it('godPathStage < 5 → full victory condition fails even with theChanged >= 3', () => {
    const fullOpt = shub6.options[0]
    const state = minState(
      { theChanged: 3, relics: 2 },
      { godPathProgress: 4, runConfig: { godPath: 'shub_niggurath', runLength: 'short' } }
    )
    expect(checkCondition(fullOpt.condition!, state as any)).toBe(false)
  })

  it('full victory option effects include victory type', () => {
    const fullOpt = shub6.options[0]
    const victoryEffect = fullOpt.effects.find(e => e.type === 'victory')
    expect(victoryEffect).toBeDefined()
  })

  it('partial victory option effects include partialVictory type for shub_niggurath', () => {
    const partialOpt = shub6.options[1]
    const pvEffect = partialOpt.effects.find(e => e.type === 'partialVictory') as any
    expect(pvEffect).toBeDefined()
    expect(pvEffect.god).toBe('shub_niggurath')
  })

  it('endRun opt has succumbOption: true', () => {
    const endRunOpt = shub6.options.find(o => o.label === 'The offering is insufficient')!
    expect(endRunOpt.succumbOption).toBe(true)
  })
})

// ─── the_weight_of_it opt 1 gate (P20-B §5) ────────────────────────────────────

const weightCard = THREAT_CARDS.find(c => c.id === 'the_weight_of_it')!

describe('the_weight_of_it opt 1 gate (P20-B)', () => {
  it('card is present in threat pool', () => {
    expect(weightCard).toBeDefined()
  })

  it('"Steady them" option has a followers condition', () => {
    const steadyOpt = weightCard.options.find(o => o.label === 'Steady them')
    expect(steadyOpt).toBeDefined()
    expect(steadyOpt!.condition).toBeDefined()
  })

  it('followers = 2 → "Steady them" condition passes', () => {
    const steadyOpt = weightCard.options.find(o => o.label === 'Steady them')!
    const state = minState(
      { followers: 2 },
      { godPathProgress: 0, runConfig: { godPath: 'yha_nthlei', runLength: 'short' } }
    )
    expect(checkCondition(steadyOpt.condition!, state as any)).toBe(true)
  })

  it('followers = 1 → "Steady them" condition fails', () => {
    const steadyOpt = weightCard.options.find(o => o.label === 'Steady them')!
    const state = minState(
      { followers: 1 },
      { godPathProgress: 0, runConfig: { godPath: 'yha_nthlei', runLength: 'short' } }
    )
    expect(checkCondition(steadyOpt.condition!, state as any)).toBe(false)
  })

  it('followers = 0 → "Steady them" condition fails', () => {
    const steadyOpt = weightCard.options.find(o => o.label === 'Steady them')!
    const state = minState(
      { followers: 0 },
      { godPathProgress: 0, runConfig: { godPath: 'yha_nthlei', runLength: 'short' } }
    )
    expect(checkCondition(steadyOpt.condition!, state as any)).toBe(false)
  })

  it('followers >= 3 → "Steady them" condition passes', () => {
    const steadyOpt = weightCard.options.find(o => o.label === 'Steady them')!
    const state = minState(
      { followers: 5 },
      { godPathProgress: 0, runConfig: { godPath: 'yha_nthlei', runLength: 'short' } }
    )
    expect(checkCondition(steadyOpt.condition!, state as any)).toBe(true)
  })
})
