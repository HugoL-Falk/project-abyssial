import { describe, it, expect } from 'vitest'
import { applyWhisperSeed, WHISPER_POOL_IDS } from './whispers'
import type { Card, CardId } from '../types'

// Minimal card stub — only the fields applyWhisperSeed reads (`id`).
const stub = (id: CardId): Card => ({ id } as unknown as Card)

describe('applyWhisperSeed', () => {
  it('prefers ids already in the draw pile (no inserts needed)', () => {
    const inPileIds: CardId[] = ['congregation_meets', 'the_old_book', 'rival_stirs']
    const drawPile = inPileIds.map(stub)
    const result = applyWhisperSeed(3, [], drawPile)

    expect(result.newTargets).toHaveLength(3)
    expect(result.newTargets.every(id => inPileIds.includes(id))).toBe(true)
    expect(result.cardsToInsert).toHaveLength(0)
  })

  it('falls back to inserting when no pool ids are in the draw pile', () => {
    const drawPile: Card[] = [] // empty pile
    const result = applyWhisperSeed(2, [], drawPile)

    expect(result.newTargets).toHaveLength(2)
    expect(result.cardsToInsert).toHaveLength(2)
    expect(
      result.cardsToInsert.every(id => WHISPER_POOL_IDS.includes(id))
    ).toBe(true)
    expect(result.cardsToInsert.every(id => result.newTargets.includes(id))).toBe(true)
  })

  it('mixes in-pile and fallback when both partitions have members', () => {
    const inPile = [stub('congregation_meets')]
    const result = applyWhisperSeed(3, [], inPile)

    expect(result.newTargets).toHaveLength(3)
    expect(result.cardsToInsert).toHaveLength(2)
    expect(result.newTargets).toContain('congregation_meets')
    expect(result.cardsToInsert).not.toContain('congregation_meets')
  })

  it('allows up to 10 active whispers (hard cap)', () => {
    // 8 already active — should still be able to seed 2 more
    const alreadyActive: CardId[] = [
      'congregation_meets',
      'the_old_book',
      'rival_stirs',
      'academic_society',
      'the_donation',
      'the_inheritance',
      'the_newspaper',
      'word_spreads',
    ] // 8 active
    const result = applyWhisperSeed(3, alreadyActive, [])
    // cap = min(3, 10-8) = min(3,2) = 2 — should get exactly 2
    expect(result.newTargets).toHaveLength(2)
  })

  it('hard cap prevents seeding beyond 10', () => {
    const alreadyActive: CardId[] = [
      'congregation_meets',
      'the_old_book',
      'rival_stirs',
      'academic_society',
      'the_donation',
      'the_inheritance',
      'the_newspaper',
      'word_spreads',
      'the_harbormaster',
      'the_left_item',
    ] // 10 active — at cap
    const result = applyWhisperSeed(2, alreadyActive, [])
    expect(result.newTargets).toHaveLength(0)
  })

  it('returns empty when all pool ids are already active', () => {
    const result = applyWhisperSeed(3, [...WHISPER_POOL_IDS], [])
    expect(result.newTargets).toHaveLength(0)
    expect(result.cardsToInsert).toHaveLength(0)
  })

  it('does not re-pick ids already in alreadyActive', () => {
    const alreadyActive: CardId[] = ['congregation_meets']
    const drawPile = [stub('congregation_meets'), stub('the_old_book')]
    const result = applyWhisperSeed(2, alreadyActive, drawPile)

    expect(result.newTargets).not.toContain('congregation_meets')
    expect(result.newTargets).toContain('the_old_book')
  })
})
