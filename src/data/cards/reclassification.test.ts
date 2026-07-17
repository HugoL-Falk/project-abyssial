import { describe, it, expect } from 'vitest'
import { CORE_CARDS, COMMON_CARDS, TREAT_CARDS, THREAT_CARDS } from '../index'

describe('tier reclassification (Plan A)', () => {
  const moved = ['congregation_meets', 'the_donation']

  it('moved cards are no longer in CORE_CARDS', () => {
    for (const id of moved) {
      expect(CORE_CARDS.find(c => c.id === id)).toBeUndefined()
    }
  })

  it('moved cards are in COMMON_CARDS with tier "common"', () => {
    for (const id of moved) {
      const card = COMMON_CARDS.find(c => c.id === id)
      expect(card, `${id} should be in COMMON_CARDS`).toBeDefined()
      expect(card!.tier).toBe('common')
    }
  })
})

describe('tier reclassification (P24-12 threat→treat)', () => {
  const reclassified = ['wandering_soul', 'forgers_debt']
  const preExistingTreats = ['cursed_object', 'something_on_the_hook', 'grove_awaits']
  const allMoved = [...reclassified, ...preExistingTreats]

  it('reclassified cards are no longer in THREAT_CARDS', () => {
    for (const id of reclassified) {
      expect(THREAT_CARDS.find(c => c.id === id), `${id} should not be in THREAT_CARDS`).toBeUndefined()
    }
  })

  it('reclassified cards are in TREAT_CARDS with tier "treat"', () => {
    for (const id of reclassified) {
      const card = TREAT_CARDS.find(c => c.id === id)
      expect(card, `${id} should be in TREAT_CARDS`).toBeDefined()
      expect(card!.tier).toBe('treat')
    }
  })

  it('pre-existing treat cards have been moved to TREAT_CARDS', () => {
    for (const id of preExistingTreats) {
      const card = TREAT_CARDS.find(c => c.id === id)
      expect(card, `${id} should be in TREAT_CARDS`).toBeDefined()
      expect(card!.tier).toBe('treat')
    }
  })

  it('all moved cards are absent from THREAT_CARDS', () => {
    for (const id of allMoved) {
      expect(THREAT_CARDS.find(c => c.id === id), `${id} should not be in THREAT_CARDS`).toBeUndefined()
    }
  })
})

describe('bait gap fix (P24-12 census_agent)', () => {
  it('"Provide misleading figures" has gold +1 bait effect', () => {
    const censusAgent = CORE_CARDS.find(c => c.id === 'the_census_agent')
    expect(censusAgent, 'the_census_agent should be in CORE_CARDS').toBeDefined()

    const option = censusAgent!.options.find(o => o.label === 'Provide misleading figures')
    expect(option, '"Provide misleading figures" option should exist').toBeDefined()

    const goldEffect = option!.effects.find(
      e => e.type === 'resource' && e.resource === 'gold' && e.delta === 1
    )
    expect(goldEffect, '"Provide misleading figures" should have gold +1 effect').toBeDefined()
  })
})

describe('P26-13 — an_unremarkable_stump reclassified back to threat', () => {
  it('is in THREAT_CARDS with tier threat', () => {
    const card = THREAT_CARDS.find(c => c.id === 'an_unremarkable_stump')
    expect(card).toBeDefined()
    expect(card!.tier).toBe('threat')
  })
  it('is no longer in TREAT_CARDS', () => {
    expect(TREAT_CARDS.find(c => c.id === 'an_unremarkable_stump')).toBeUndefined()
  })
  it('has exactly 2 options', () => {
    const card = THREAT_CARDS.find(c => c.id === 'an_unremarkable_stump')!
    expect(card.options).toHaveLength(2)
  })
  it('opt0 "Leave" gives dread +2', () => {
    const card = THREAT_CARDS.find(c => c.id === 'an_unremarkable_stump')!
    expect(card.options[0].label).toBe('Leave')
    expect(card.options[0].effects).toContainEqual({ type: 'resource', resource: 'dread', delta: 2 })
  })
  it('opt1 "Wait at the treeline" gives fol −1 and dread +1', () => {
    const card = THREAT_CARDS.find(c => c.id === 'an_unremarkable_stump')!
    expect(card.options[1].label).toBe('Wait at the treeline')
    expect(card.options[1].effects).toContainEqual({ type: 'resource', resource: 'followers', delta: -1 })
    expect(card.options[1].effects).toContainEqual({ type: 'resource', resource: 'dread', delta: 1 })
  })
})
