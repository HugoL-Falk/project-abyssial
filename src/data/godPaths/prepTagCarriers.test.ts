import { describe, it, expect } from 'vitest'
import { buildPrepTagPills, PREP_TAG_LABELS } from './prepTagCarriers'

describe('buildPrepTagPills', () => {
  it('returns one pill per known tag, preserving order', () => {
    const pills = buildPrepTagPills(['studied', 'recited'])
    expect(pills).toEqual([
      { tag: 'studied', label: PREP_TAG_LABELS.studied },
      { tag: 'recited', label: PREP_TAG_LABELS.recited },
    ])
  })

  it('returns [] for no tags', () => {
    expect(buildPrepTagPills([])).toEqual([])
  })

  it('skips unknown tag strings', () => {
    expect(buildPrepTagPills(['studied', 'not_a_real_tag'])).toEqual([
      { tag: 'studied', label: PREP_TAG_LABELS.studied },
    ])
  })
})
