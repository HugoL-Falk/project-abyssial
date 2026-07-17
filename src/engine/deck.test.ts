import { describe, it, expect } from 'vitest'
import { rotateRares, rotateCore, reshuffle, tutorialReshuffle } from './deck'
import type { Card, DeckState } from '../types'

// Minimal rare-card factory: only the fields rotateRares looks at.
const makeRare = (id: string): Card => ({
  id,
  name: id,
  tier: 'rare',
  options: [],
} as unknown as Card)

const makeCommon = (id: string): Card => ({
  id,
  name: id,
  tier: 'common',
  options: [],
} as unknown as Card)

// Deterministic RNG: returns 0 on every call, so "random" picks always select index 0.
const seededRng = () => 0

describe('rotateRares', () => {
  const pool: Card[] = [
    makeRare('rA'), makeRare('rB'), makeRare('rC'),
    makeRare('rD'), makeRare('rE'), makeRare('rF'),
  ]

  it('returns input unchanged when discard contains no rares', () => {
    const combined = [makeRare('rA'), makeCommon('cX'), makeCommon('cY')]
    const discard  = [makeCommon('cX')]
    const used     = new Set<string>(['rA'])

    const { combined: out, usedRareIds: outUsed } = rotateRares(combined, discard, used, pool, 2, seededRng)

    expect(out).toEqual(combined)
    expect([...outUsed].sort()).toEqual(['rA'])
  })

  it('retires one rare from discard and refills up to rareTarget=2', () => {
    const combined = [makeRare('rA'), makeCommon('cX')]
    const discard  = [makeRare('rA')]
    const used     = new Set<string>(['rA'])

    const { combined: out, usedRareIds: outUsed } = rotateRares(combined, discard, used, pool, 2, seededRng)

    const rareIds = out.filter(c => c.tier === 'rare').map(c => c.id)
    // afterRetire has 0 rares; need = 2-0 = 2; picks rB then rC (seededRng=0)
    expect(rareIds.length).toBe(2)
    expect(rareIds).not.toContain('rA')
    expect(rareIds).toEqual(['rB', 'rC'])
    expect(outUsed.has('rA')).toBe(true)
    expect(outUsed.has('rB')).toBe(true)
    expect(outUsed.has('rC')).toBe(true)
  })

  it('retires two rares and replaces with two fresh rares', () => {
    const combined = [makeRare('rA'), makeRare('rB'), makeCommon('cX')]
    const discard  = [makeRare('rA'), makeRare('rB')]
    const used     = new Set<string>(['rA', 'rB'])

    const { combined: out, usedRareIds: outUsed } = rotateRares(combined, discard, used, pool, 2, seededRng)

    const rareIds = out.filter(c => c.tier === 'rare').map(c => c.id).sort()
    expect(rareIds.length).toBe(2)
    expect(rareIds).not.toContain('rA')
    expect(rareIds).not.toContain('rB')
    expect(outUsed.has('rA')).toBe(true)
    expect(outUsed.has('rB')).toBe(true)
  })

  it('protects undrawn rares: rare in combined but not in discard is not retired', () => {
    const combined = [makeRare('rA'), makeRare('rB'), makeCommon('cX')]
    const discard  = [makeRare('rB')]
    const used     = new Set<string>(['rA', 'rB'])

    const { combined: out } = rotateRares(combined, discard, used, pool, 2, seededRng)

    const rareIds = out.filter(c => c.tier === 'rare').map(c => c.id).sort()
    expect(rareIds).toContain('rA')
    expect(rareIds).not.toContain('rB')
    expect(rareIds.length).toBe(2)
  })

  it('recycles when eligible pool is empty', () => {
    const combined = [makeRare('rA'), makeRare('rB')]
    const discard  = [makeRare('rA')]
    const used     = new Set<string>(['rA', 'rB', 'rC', 'rD', 'rE', 'rF'])

    const { combined: out, usedRareIds: outUsed } = rotateRares(combined, discard, used, pool, 2, seededRng)

    const rareIds = out.filter(c => c.tier === 'rare').map(c => c.id)
    expect(rareIds.length).toBe(2)
    expect(rareIds).toContain('rB')
    expect(rareIds.some(id => id !== 'rB')).toBe(true)
    expect(outUsed.has('rB')).toBe(true)
  })

  it('does not re-pick a just-retired rare during recycle (P19-33)', () => {
    // Pool fully consumed → the recycle branch triggers. The rare retiring this
    // cycle (rA, in discard) must NOT become eligible again and reappear in the
    // very next cycle ("same rare twice in a row").
    const combined = [makeRare('rA'), makeRare('rB')]
    const discard  = [makeRare('rA')]
    const used     = new Set<string>(['rA', 'rB', 'rC', 'rD', 'rE', 'rF'])

    const { combined: out } = rotateRares(combined, discard, used, pool, 2, seededRng)

    const rareIds = out.filter(c => c.tier === 'rare').map(c => c.id)
    expect(rareIds).not.toContain('rA')
  })

  it('is deterministic with a seeded rng', () => {
    const combined1 = [makeRare('rA'), makeCommon('cX')]
    const discard1  = [makeRare('rA')]
    const used1     = new Set<string>(['rA'])

    const r1 = rotateRares(combined1, discard1, used1, pool, 2, seededRng)
    const r2 = rotateRares(combined1, discard1, used1, pool, 2, seededRng)

    const ids1 = r1.combined.filter(c => c.tier === 'rare').map(c => c.id)
    const ids2 = r2.combined.filter(c => c.tier === 'rare').map(c => c.id)
    expect(ids1).toEqual(ids2)
  })

  it('refills rares only up to rareTarget (band floor 1)', () => {
    const rare = (id: string): Card =>
      ({ id, tier: 'rare', title: id, flavour: '', options: [] } as unknown as Card)
    const inDeck: Card[] = []                 // both starting rares were drawn
    const discard = [rare('r1'), rare('r2')]  // 2 retiring
    const combined = [...inDeck, ...discard]
    const pool = ['r3', 'r4', 'r5'].map(rare)
    const res = rotateRares(combined, discard, new Set(['r1', 'r2']), pool, 1, () => 0)
    expect(res.combined.filter(c => c.tier === 'rare').length).toBe(1) // capped at target
  })
})

describe('rotateCore', () => {
  const core = (id: string): Card =>
    ({ id, tier: 'core', title: id, flavour: '', options: [] } as unknown as Card)
  const pool = (ids: string[]) => ids.map(core)
  const seq = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length] }

  it('no-op when no core cards are in the discard pile', () => {
    const combined = [core('a'), core('b')]
    const res = rotateCore(combined, [], new Set(), pool(['c', 'd']), 2, seq(0))
    expect(res.combined).toEqual(combined)
  })

  it('retires drawn core and refills up to coreTarget from the pool', () => {
    const inDeck = [core('a')]            // 1 undrawn core stays
    const discard = [core('b')]           // 1 drawn core retires
    const combined = [...inDeck, ...discard]
    const res = rotateCore(combined, discard, new Set(['b']), pool(['c', 'd', 'e']), 2, seq(0))
    const ids = res.combined.filter(c => c.tier === 'core').map(c => c.id).sort()
    expect(ids).not.toContain('b')        // retired
    expect(ids).toContain('a')            // carried over
    expect(ids.length).toBe(2)            // topped up to coreTarget
  })

  it('keeps a just-retired core ineligible this cycle (recycle fallback)', () => {
    const discard = [core('b')]
    const combined = [core('b')]          // only core is the one retiring
    // usedCoreIds already holds every other pool id, forcing the recycle branch
    const used = new Set(['c'])
    const res = rotateCore(combined, discard, used, pool(['b', 'c']), 1, seq(0))
    const ids = res.combined.filter(c => c.tier === 'core').map(c => c.id)
    expect(ids).not.toContain('b')        // must not return same cycle
  })

  it('does not exceed coreTarget when deck already has enough core', () => {
    const combined = [core('a'), core('b')]
    const res = rotateCore(combined, [], new Set(), pool(['c', 'd']), 1, seq(0))
    expect(res.combined.filter(c => c.tier === 'core').length).toBe(2) // no retire → unchanged
  })
})

describe('reshuffle', () => {
  it('reshuffle rotates a drawn core card out and tops up to coreTarget', () => {
    const mk = (id: string, tier: string): Card =>
      ({ id, tier, title: id, flavour: '', options: [] } as unknown as Card)
    const deck = {
      drawPile: [mk('keep', 'core')],
      discardPile: [mk('drawn', 'core')],
      permDiscardPile: [], chainReserve: [], nextCycleQueue: [],
    } as any
    const corePool = ['drawn', 'keep', 'fresh1', 'fresh2'].map(id => mk(id, 'core'))
    const res = reshuffle(deck, mk('doom', 'doom'), new Set(), [], 2,
                          new Set(['drawn']), corePool, 2)
    const coreIds = res.deck.drawPile.filter((c: Card) => c.tier === 'core').map((c: Card) => c.id)
    expect(coreIds).not.toContain('drawn')   // retired
    expect(coreIds).toContain('keep')        // carried over
    expect(coreIds.length).toBe(2)           // topped up
  })
})

// ─── P19-35: Reshuffle-Time Prune ─────────────────────────────────────────────
describe('reshuffle prune (P19-35)', () => {
  const mk = (id: string, tier: string): Card =>
    ({ id, tier, title: id, flavour: '', options: [], permanent: false } as unknown as Card)
  const doom = mk('veil_thins', 'doom')

  function makeDeck(draw: Card[], discard: Card[] = []): import('../types').DeckState {
    return { drawPile: draw, discardPile: discard, permDiscardPile: [], chainReserve: [], nextCycleQueue: [] }
  }

  it('no prune when deck is at or below MAX_DECK_SIZE (25)', () => {
    // 25 commons — all protected, deck stays at 25
    const cards = Array.from({ length: 25 }, (_, i) => mk(`c${i}`, 'common'))
    const deck = makeDeck(cards.slice(0, 13), cards.slice(13))
    const res = reshuffle(deck, doom, new Set(), [], 0)
    // doom card added → 26 total, but doom is protected; only threat/overflow evictable
    // No threats → no prune
    expect(res.deck.drawPile.length).toBeGreaterThan(0)
    expect(res.deck.permDiscardPile.length).toBe(0)
  })

  it('prunes threat cards when deck exceeds 25 after combining', () => {
    // 20 commons + 10 threats (draw+discard) → combined = 30 + doom card = 31
    const commons  = Array.from({ length: 20 }, (_, i) => mk(`c${i}`, 'common'))
    const threats  = Array.from({ length: 10 }, (_, i) => mk(`t${i}`, 'threat'))
    const deck = makeDeck([...commons, ...threats.slice(0, 5)], threats.slice(5))
    const res = reshuffle(deck, doom, new Set(), [], 0)
    const drawTotal = res.deck.drawPile.length
    const permTotal = res.deck.permDiscardPile.length
    // Should have culled enough threats to reach ≤25 (or exhausted them)
    expect(drawTotal).toBeLessThanOrEqual(25)
    expect(permTotal).toBeGreaterThan(0)
    // Culled cards must all be threats
    expect(res.deck.permDiscardPile.every(c => c.tier === 'threat')).toBe(true)
    // Commons must all survive
    const drawIds = res.deck.drawPile.map(c => c.id)
    commons.forEach(c => expect(drawIds).toContain(c.id))
  })

  it('never evicts protected cards (common/rare/god_path/doom) even over ceiling', () => {
    // 30 commons — no threats to evict; deck stays over ceiling, protected untouched
    const cards = Array.from({ length: 30 }, (_, i) => mk(`c${i}`, 'common'))
    const deck = makeDeck(cards.slice(0, 15), cards.slice(15))
    const res = reshuffle(deck, doom, new Set(), [], 0)
    expect(res.deck.permDiscardPile.length).toBe(0)
    // All 30 commons + doom card remain in draw pile
    const drawIds = res.deck.drawPile.map(c => c.id)
    cards.forEach(c => expect(drawIds).toContain(c.id))
  })

  it('culled cards go to permDiscardPile, not back into drawPile', () => {
    const commons = Array.from({ length: 20 }, (_, i) => mk(`c${i}`, 'common'))
    const threats = Array.from({ length: 10 }, (_, i) => mk(`t${i}`, 'threat'))
    const deck = makeDeck([...commons, ...threats], [])
    const res = reshuffle(deck, doom, new Set(), [], 0)
    const drawIds = new Set(res.deck.drawPile.map(c => c.id))
    // Any culled threat must NOT appear in draw pile
    res.deck.permDiscardPile.forEach(c => {
      expect(drawIds.has(c.id)).toBe(false)
    })
  })

  it('culls duplicates first before singletons', () => {
    // 20 commons + 3 copies of t_dup + 4 singletons → 27+doom = 28 → must cull 3
    const commons = Array.from({ length: 20 }, (_, i) => mk(`c${i}`, 'common'))
    const tDup = [mk('t_dup', 'threat'), mk('t_dup', 'threat'), mk('t_dup', 'threat')]
    const singles = Array.from({ length: 4 }, (_, i) => mk(`s${i}`, 'threat'))
    const deck = makeDeck([...commons, ...tDup, ...singles], [])
    const res = reshuffle(deck, doom, new Set(), [], 0)
    // Should be ≤25; the 3 culled cards should come from t_dup before singletons
    const culled = res.deck.permDiscardPile
    const culledDups = culled.filter(c => c.id === 't_dup')
    // At least one dup culled (likely all 3 since they're highest frequency)
    expect(culledDups.length).toBeGreaterThan(0)
    // Singles should survive as long as dups were enough to reach ceiling
    if (culled.length <= 3) {
      singles.forEach(s => {
        expect(res.deck.drawPile.some(c => c.id === s.id)).toBe(true)
      })
    }
  })
})

const emptyDeck = (): DeckState => ({
  drawPile: [],
  discardPile: [],
  permDiscardPile: [],
  chainReserve: [],
  nextCycleQueue: [],
})

describe('tutorialReshuffle — explicit ordering', () => {
  const makeCard = (id: string, pinnedNextCycle?: true): Card => ({
    id,
    title: id,
    tier: 'tutorial',
    flavourText: '',
    options: [],
    ...(pinnedNextCycle ? { pinnedNextCycle } : {}),
  } as unknown as Card)

  it('places pinned card first regardless of insertion order', () => {
    const deck: DeckState = {
      ...emptyDeck(),
      nextCycleQueue: [
        makeCard('tutorial_threat_card'),
        makeCard('tutorial_reshuffle_card', true),
        makeCard('olgreth_2'),
      ],
    }
    const result = tutorialReshuffle(deck)
    expect(result.drawPile[0].id).toBe('tutorial_reshuffle_card')
  })

  it('orders unpinned cards by TUTORIAL_POST_RESHUFFLE_ORDER', () => {
    const deck: DeckState = {
      ...emptyDeck(),
      nextCycleQueue: [
        makeCard('tutorial_reshuffle_card', true),
        makeCard('tutorial_threat_card'),
        makeCard('tutorial_treat_card'),
        makeCard('tutorial_prep_react'),
        makeCard('olgreth_2'),
      ],
    }
    const result = tutorialReshuffle(deck)
    const ids = result.drawPile.map(c => c.id)
    expect(ids).toEqual([
      'tutorial_reshuffle_card',
      'tutorial_threat_card',
      'tutorial_prep_react',
      'tutorial_treat_card',
      'olgreth_2',
    ])
  })

  it('drops cards not in the order list', () => {
    const deck: DeckState = {
      ...emptyDeck(),
      nextCycleQueue: [
        makeCard('tutorial_reshuffle_card', true),
        makeCard('unknown_card'),
        makeCard('tutorial_threat_card'),
      ],
    }
    const result = tutorialReshuffle(deck)
    expect(result.drawPile.map(c => c.id)).toEqual([
      'tutorial_reshuffle_card',
      'tutorial_threat_card',
    ])
  })

  it('clears discardPile and nextCycleQueue', () => {
    const deck: DeckState = {
      ...emptyDeck(),
      discardPile: [makeCard('played_card')],
      nextCycleQueue: [makeCard('tutorial_reshuffle_card', true)],
    }
    const result = tutorialReshuffle(deck)
    expect(result.discardPile).toEqual([])
    expect(result.nextCycleQueue).toEqual([])
  })
})
