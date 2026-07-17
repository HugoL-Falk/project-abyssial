import { describe, it, expect } from 'vitest'
import { CORE_CARDS } from './core'
import { TREAT_CARDS } from './treats'
import { THREAT_CARDS } from './threats'
import type { Card } from '../../types'

const coreCard = (id: string): Card => {
  const c = CORE_CARDS.find(c => c.id === id)
  if (!c) throw new Error(`Core card not found: ${id}`)
  return c
}

const treatCard = (id: string): Card => {
  const c = TREAT_CARDS.find(c => c.id === id)
  if (!c) throw new Error(`Treat card not found: ${id}`)
  return c
}

const threatCard = (id: string): Card => {
  const c = THREAT_CARDS.find(c => c.id === id)
  if (!c) throw new Error(`Threat card not found: ${id}`)
  return c
}

// ─── Task 1: a_useful_contact ────────────────────────────────────────────────

describe('P25 core audit — a_useful_contact (treats.ts)', () => {
  it('opt3 "Have a file buried" gives dread-2 with no condition', () => {
    const card = treatCard('a_useful_contact')
    const opt = card.options[2]
    expect(opt.label).toBe('Have a file buried')
    expect(opt.condition).toBeUndefined()
    expect(opt.hideWhenUnavailable).toBeUndefined()
    expect(opt.effects).toEqual([
      { type: 'resource', resource: 'dread', delta: -2 },
      { type: 'removeCard', cardId: 'a_useful_contact' },
    ])
  })
})

// ─── Task 2: the_seance ──────────────────────────────────────────────────────

describe('P25 core audit — the_seance', () => {
  it('opt2 "Let them do it alone" costs followers-1 before inserting wandering_soul (treat fix)', () => {
    const card = coreCard('the_seance')
    const opt = card.options[1]
    expect(opt.label).toBe('Let them do it alone')
    const followerEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'followers'
    )
    expect(followerEffect).toEqual({ type: 'resource', resource: 'followers', delta: -1 })
  })
})

// ─── Task 3: the_printing_press ─────────────────────────────────────────────

describe('P25 core audit — the_printing_press', () => {
  it('has exactly 3 options ("Offer Workers" removed)', () => {
    const card = coreCard('the_printing_press')
    expect(card.options).toHaveLength(3)
  })

  it('opt3 "Forgery work" inserts forgers_debt without dread relief (treat fix)', () => {
    const card = coreCard('the_printing_press')
    const opt = card.options[2]
    expect(opt.label).toBe('Forgery work')
    const dreadEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'dread'
    )
    expect(dreadEffect).toBeUndefined()
    const insertEffect = opt.effects.find(e => e.type === 'insertCard')
    expect(insertEffect).toMatchObject({ type: 'insertCard', cardId: 'forgers_debt' })
  })
})

// ─── Task 4: academic_society ────────────────────────────────────────────────

describe('P25 core audit — academic_society', () => {
  it('opt1 "Attend as a civilian" costs influence-1 (not +1)', () => {
    const card = coreCard('academic_society')
    const opt = card.options[0]
    expect(opt.label).toBe('Attend as a civilian')
    const infEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'influence'
    )
    expect(infEffect).toEqual({ type: 'resource', resource: 'influence', delta: -1 })
  })
})

// ─── Task 5: local_elections ─────────────────────────────────────────────────

describe('P25 core audit — local_elections', () => {
  it('opt2 "Back them quietly" does not insert political_debt', () => {
    const card = coreCard('local_elections')
    const opt = card.options[1]
    expect(opt.label).toBe('Back them quietly')
    const insertEffect = opt.effects.find(e => e.type === 'insertCard')
    expect(insertEffect).toBeUndefined()
  })

  it('opt3 is "Redirect them" with followers-1 and influence+1', () => {
    const card = coreCard('local_elections')
    const opt = card.options[2]
    expect(opt.label).toBe('Redirect them')
    expect(opt.effects).toEqual([
      { type: 'resource', resource: 'followers', delta: -1 },
      { type: 'resource', resource: 'influence', delta: 1 },
    ])
  })
})

// ─── Task 6: follower_confesses_doubt ────────────────────────────────────────

describe('P25 core audit — follower_confesses_doubt', () => {
  it('opt2 "Offer tea" includes gold+1 bait before inserting loose_end', () => {
    const card = coreCard('follower_confesses_doubt')
    const opt = card.options[1]
    expect(opt.label).toBe('Offer tea. Not another word.')
    const goldEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'gold'
    )
    expect(goldEffect).toEqual({ type: 'resource', resource: 'gold', delta: 1 })
    const insertEffect = opt.effects.find(e => e.type === 'insertCard')
    expect(insertEffect).toMatchObject({ cardId: 'loose_end' })
  })

  it('has a third option "Convert the doubt" costing followers/gold/influence for a relic', () => {
    const card = coreCard('follower_confesses_doubt')
    expect(card.options).toHaveLength(3)
    const opt = card.options[2]
    expect(opt.label).toBe('Convert the doubt')
    expect(opt.effects).toEqual([
      { type: 'resource', resource: 'followers', delta: -1 },
      { type: 'resource', resource: 'gold', delta: -1 },
      { type: 'resource', resource: 'influence', delta: -1 },
      { type: 'resource', resource: 'relics', delta: 1 },
    ])
  })
})

// ─── Task 7: supplies_dwindle ────────────────────────────────────────────────

describe('P25 core audit — supplies_dwindle', () => {
  it('opt1 "Spend on provisions" includes influence+1', () => {
    const card = coreCard('supplies_dwindle')
    const opt = card.options[0]
    expect(opt.label).toBe('Spend on provisions')
    const infEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'influence'
    )
    expect(infEffect).toEqual({ type: 'resource', resource: 'influence', delta: 1 })
  })

  it('opt2 "Send foragers" has 4 equal-weight randomOutcome branches', () => {
    const card = coreCard('supplies_dwindle')
    const opt = card.options[1]
    const rng = opt.effects.find(e => e.type === 'randomOutcome') as any
    expect(rng).toBeDefined()
    expect(rng.outcomes).toHaveLength(4)
    rng.outcomes.forEach((o: any) => expect(o.weight).toBe(1))
  })

  it('opt2 "Send foragers" worst branch inserts selectman_has_questions', () => {
    const card = coreCard('supplies_dwindle')
    const opt = card.options[1]
    const rng = opt.effects.find(e => e.type === 'randomOutcome') as any
    const worstBranch = rng.outcomes[3]
    const insert = worstBranch.effects.find((e: any) => e.type === 'insertCard')
    expect(insert).toBeDefined()
    expect(insert.cardId).toBe('selectman_has_questions')
  })

  it('opt3 "Frame as spiritual discipline" gives influence+2 (reduced from +3)', () => {
    const card = coreCard('supplies_dwindle')
    const opt = card.options[2]
    const infEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'influence'
    )
    expect(infEffect).toEqual({ type: 'resource', resource: 'influence', delta: 2 })
  })
})

// ─── Task 8: woodcutters_report ──────────────────────────────────────────────

describe('P25 core audit — woodcutters_report', () => {
  it('opt2 is "Buy the rumor instead" with gold-1, influence+2, gated on gold≥1', () => {
    const card = coreCard('woodcutters_report')
    const opt = card.options[1]
    expect(opt.label).toBe('Buy the rumor instead')
    expect(opt.effects).toEqual([
      { type: 'resource', resource: 'gold', delta: -1 },
      { type: 'resource', resource: 'influence', delta: 2 },
    ])
    expect(opt.condition).toEqual({ type: 'resourceMin', resource: 'gold', min: 1 })
  })
})

// ─── P26-07: selectman_has_questions rewrite ─────────────────────────────────

describe('P26-07 — selectman_has_questions rewrite', () => {
  it('opt1 costs inf −2 and dread −1', () => {
    const card = threatCard('selectman_has_questions')
    const opt = card.options[1]
    expect(opt.effects).toContainEqual({ type: 'resource', resource: 'influence', delta: -2 })
    expect(opt.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: -1 })
  })

  it('opt2 label is "Give him a name to follow"', () => {
    const card = threatCard('selectman_has_questions')
    expect(card.options[2].label).toBe('Give him a name to follow')
  })

  it('all flavour texts are within 80 chars', () => {
    const card = threatCard('selectman_has_questions')
    card.options.forEach(opt => {
      expect(opt.flavourText.length).toBeLessThanOrEqual(80)
    })
  })

  it('card body is within 108 chars', () => {
    const card = threatCard('selectman_has_questions')
    expect(card.flavourText.length).toBeLessThanOrEqual(108)
  })
})

// ─── P26-18: the_dreamer opt0 rework ─────────────────────────────────────────

describe('P26-18 — the_dreamer opt0', () => {
  it('gives relics +1 and dread +1', () => {
    const card = treatCard('the_dreamer')
    const opt = card.options[0]
    expect(opt.effects).toContainEqual({ type: 'resource', resource: 'relics', delta: 1 })
    expect(opt.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: 1 })
  })

  it('does not contain surfaceChainCard', () => {
    const card = treatCard('the_dreamer')
    const opt = card.options[0]
    expect(opt.effects.some((e: any) => e.type === 'surfaceChainCard')).toBe(false)
  })

  it('flavour text is within 80 chars', () => {
    const card = treatCard('the_dreamer')
    expect(card.options[0].flavourText.length).toBeLessThanOrEqual(80)
  })
})
