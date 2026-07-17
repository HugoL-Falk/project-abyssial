import { describe, it, expect } from 'vitest'
import { applyPooledOptions } from './pooledOptions'
import type { Card, CardOption } from '../types'

// Minimal card stub helper
function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test_card',
    title: 'Test Card',
    flavourText: 'Test flavour',
    tier: 'common',
    options: [],
    ...overrides,
  } as Card
}

function makeOption(label: string, pooled?: boolean, categoryKey?: string): CardOption {
  return {
    label,
    flavourText: '',
    effects: [],
    pooled,
    categoryKey,
  }
}

describe('applyPooledOptions', () => {
  it('returns the card unchanged when no options are pooled', () => {
    const card = makeCard({
      options: [
        makeOption('A'),
        makeOption('B'),
      ],
    })
    const result = applyPooledOptions(card, 1)
    expect(result).toBe(card)
  })

  it('always includes non-pooled options', () => {
    const nonPooled = makeOption('Always')
    const card = makeCard({
      optionPoolSize: 1,
      options: [
        nonPooled,
        makeOption('Pool A', true, 'cat_a'),
        makeOption('Pool B', true, 'cat_b'),
      ],
    })
    const result = applyPooledOptions(card, 1)
    expect(result.options).toContain(nonPooled)
  })

  it('selects exactly optionPoolSize pooled options', () => {
    const card = makeCard({
      optionPoolSize: 2,
      options: [
        makeOption('Pool A', true, 'cat_a'),
        makeOption('Pool B', true, 'cat_b'),
        makeOption('Pool C', true, 'cat_c'),
        makeOption('Pool D', true, 'cat_d'),
      ],
    })
    const result = applyPooledOptions(card, 1)
    const pooledResult = result.options.filter(o => o.pooled)
    expect(pooledResult).toHaveLength(2)
  })

  it('defaults to poolSize of 2 when optionPoolSize is not set', () => {
    const card = makeCard({
      options: [
        makeOption('Pool A', true, 'cat_a'),
        makeOption('Pool B', true, 'cat_b'),
        makeOption('Pool C', true, 'cat_c'),
      ],
    })
    const result = applyPooledOptions(card, 1)
    const pooledResult = result.options.filter(o => o.pooled)
    expect(pooledResult).toHaveLength(2)
  })

  it('selects at most one option per categoryKey', () => {
    const card = makeCard({
      optionPoolSize: 3,
      options: [
        makeOption('Cat A opt 1', true, 'cat_a'),
        makeOption('Cat A opt 2', true, 'cat_a'),
        makeOption('Cat B opt 1', true, 'cat_b'),
        makeOption('Cat B opt 2', true, 'cat_b'),
        makeOption('Cat C opt 1', true, 'cat_c'),
      ],
    })
    const result = applyPooledOptions(card, 1)
    const selectedCats = result.options
      .filter(o => o.pooled)
      .map(o => o.categoryKey)
    // No duplicate categoryKeys
    expect(new Set(selectedCats).size).toBe(selectedCats.length)
    expect(selectedCats).toHaveLength(3)
  })

  it('is deterministic for the same card id + drawCount', () => {
    const card = makeCard({
      id: 'determinism_test',
      optionPoolSize: 2,
      options: [
        makeOption('Pool A', true, 'cat_a'),
        makeOption('Pool B', true, 'cat_b'),
        makeOption('Pool C', true, 'cat_c'),
        makeOption('Pool D', true, 'cat_d'),
      ],
    })
    const result1 = applyPooledOptions(card, 3)
    const result2 = applyPooledOptions(card, 3)
    expect(result1.options.map(o => o.label)).toEqual(result2.options.map(o => o.label))
  })

  it('produces different results for different drawCounts', () => {
    // With 4 categories and poolSize 2, different drawCounts may select different categories.
    // This test verifies they are not always identical (statistical check).
    const card = makeCard({
      id: 'variety_test',
      optionPoolSize: 2,
      options: [
        makeOption('Cat A', true, 'cat_a'),
        makeOption('Cat B', true, 'cat_b'),
        makeOption('Cat C', true, 'cat_c'),
        makeOption('Cat D', true, 'cat_d'),
      ],
    })
    const results = new Set<string>()
    for (let i = 1; i <= 10; i++) {
      const result = applyPooledOptions(card, i)
      results.add(result.options.filter(o => o.pooled).map(o => o.label).join(','))
    }
    // Across 10 draws, expect at least 2 distinct selections
    expect(results.size).toBeGreaterThan(1)
  })

  it('selects all pooled options when count <= poolSize', () => {
    const card = makeCard({
      optionPoolSize: 5,
      options: [
        makeOption('Pool A', true, 'cat_a'),
        makeOption('Pool B', true, 'cat_b'),
      ],
    })
    const result = applyPooledOptions(card, 1)
    const pooledResult = result.options.filter(o => o.pooled)
    expect(pooledResult).toHaveLength(2)
  })

  it('groups options without categoryKey into __default__ category (one selected)', () => {
    const card = makeCard({
      optionPoolSize: 2,
      options: [
        makeOption('Pool A no cat', true),
        makeOption('Pool B no cat', true),
        makeOption('Pool C no cat', true),
      ],
    })
    const result = applyPooledOptions(card, 1)
    const pooledResult = result.options.filter(o => o.pooled)
    // All share __default__ category, so only 1 is selected
    expect(pooledResult).toHaveLength(1)
  })
})
