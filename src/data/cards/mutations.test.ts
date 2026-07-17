import { describe, it, expect } from 'vitest'
import { MUTATION_CARDS } from './mutations'

describe('mutation dark options', () => {
  const darkOptions = MUTATION_CARDS.map(card => ({
    cardId: card.id,
    dark: card.options.find(o => o.hideWhenUnavailable === true),
  }))

  it('every mutation card has exactly one dark option', () => {
    for (const { cardId, dark } of darkOptions) {
      expect(dark, `${cardId} missing dark option`).toBeDefined()
    }
  })

  it('no dark option grants theChanged +1 directly', () => {
    for (const { cardId, dark } of darkOptions) {
      const hasTheChanged = dark?.effects.some(
        e => e.type === 'resource' && (e as any).resource === 'theChanged'
      )
      expect(hasTheChanged, `${cardId} dark option still grants theChanged`).toBe(false)
    }
  })

  it('every dark option inserts changed_follower at positions 3–7', () => {
    for (const { cardId, dark } of darkOptions) {
      const insert = dark?.effects.find(
        e => e.type === 'insertCard' && (e as any).cardId === 'changed_follower'
      ) as any
      expect(insert, `${cardId} dark option missing insertCard changed_follower`).toBeDefined()
      expect(insert.minPos).toBe(3)
      expect(insert.maxPos).toBe(7)
    }
  })
})

describe('mutation card data', () => {
  it('every mutation card has isMutated: true', () => {
    for (const card of MUTATION_CARDS) {
      expect(card.isMutated, `${card.id} missing isMutated flag`).toBe(true)
    }
  })
})

describe('P25-43 — the_merchant_again opt3', () => {
  const card = MUTATION_CARDS.find(c => c.id === 'the_merchant_again')!
  const opt3 = card.options.find(o => o.label === 'Ask where it came from')!

  it('gives relics+1 (not relics+2)', () => {
    expect(opt3.effects).toContainEqual({ type: 'resource', resource: 'relics', delta: 1 })
    expect(opt3.effects).not.toContainEqual({ type: 'resource', resource: 'relics', delta: 2 })
  })

  it('gives inf+1', () => {
    expect(opt3.effects).toContainEqual({ type: 'resource', resource: 'influence', delta: 1 })
  })

  it('still gives dread+3 (pre-existing, unchanged)', () => {
    expect(opt3.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: 3 })
  })
})
