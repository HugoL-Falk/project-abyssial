import { describe, it, expect } from 'vitest'
import { RARE_CARDS } from './rare'
import { THREAT_CARDS } from './threats'
import { TREAT_CARDS } from './treats'
import type { Card } from '../../types'

const rareCard = (id: string): Card => {
  const c = RARE_CARDS.find(c => c.id === id)
  if (!c) throw new Error(`Rare card not found: ${id}`)
  return c
}

const threatCard = (id: string): Card => {
  const c = THREAT_CARDS.find(c => c.id === id)
  if (!c) throw new Error(`Threat card not found: ${id}`)
  return c
}

// ─── Task 1: Merchant / Defector / Academic ───────────────────────────────────

describe('P25-06 rare audit — travelling_merchant', () => {
  it('Pass grants +1inf alongside +1dread', () => {
    const card = rareCard('travelling_merchant')
    const pass = card.options.find(o => o.label === 'Pass')!
    expect(pass.effects).toContainEqual({ type: 'resource', resource: 'influence', delta: 1 })
    expect(pass.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: 1 })
  })
})

describe('P25-06 rare audit — the_defector', () => {
  it('Decline grants +1inf and -1dread', () => {
    const card = rareCard('the_defector')
    const decline = card.options.find(o => o.label === 'Decline')!
    expect(decline.effects).toContainEqual({ type: 'resource', resource: 'influence', delta: 1 })
    expect(decline.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: -1 })
  })
})

describe('P25-06 rare audit — dreaming_academic', () => {
  it('Doctor his memory gives -2dread not -1dread', () => {
    const card = rareCard('dreaming_academic')
    const doctor = card.options.find(o => o.label === 'Doctor his memory')!
    expect(doctor.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: -2 })
    expect(doctor.effects).not.toContainEqual({ type: 'resource', resource: 'dread', delta: -1 })
  })
})

// ─── Task 2: Diocese Sends Word ──────────────────────────────────────────────

describe('P25-06 rare audit — the_diocese_sends_word', () => {
  it('Refuse to engage grants +1fol', () => {
    const card = rareCard('the_diocese_sends_word')
    const refuse = card.options.find(o => o.label === 'Refuse to engage')!
    expect(refuse.effects).toContainEqual({ type: 'resource', resource: 'followers', delta: 1 })
  })

  it('Welcome the inquiry openly is a randomOutcome with two weight-1 branches', () => {
    const card = rareCard('the_diocese_sends_word')
    const welcome = card.options.find(o => o.label === 'Welcome the inquiry openly')!
    const ro = welcome.effects.find((e: any) => e.type === 'randomOutcome') as any
    expect(ro).toBeDefined()
    expect(ro.outcomes).toHaveLength(2)
    expect(ro.outcomes[0].weight).toBe(1)
    expect(ro.outcomes[1].weight).toBe(1)
  })

  it('Welcome good outcome: +2inf +1gold -1dread', () => {
    const card = rareCard('the_diocese_sends_word')
    const welcome = card.options.find(o => o.label === 'Welcome the inquiry openly')!
    const ro = welcome.effects.find((e: any) => e.type === 'randomOutcome') as any
    const good = ro.outcomes[0].effects
    expect(good).toContainEqual({ type: 'resource', resource: 'influence', delta: 2 })
    expect(good).toContainEqual({ type: 'resource', resource: 'gold', delta: 1 })
    expect(good).toContainEqual({ type: 'resource', resource: 'dread', delta: -1 })
  })

  it('Welcome bad outcome: -2inf -1gold +1dread, no investigators_file', () => {
    const card = rareCard('the_diocese_sends_word')
    const welcome = card.options.find(o => o.label === 'Welcome the inquiry openly')!
    const ro = welcome.effects.find((e: any) => e.type === 'randomOutcome') as any
    const bad = ro.outcomes[1].effects
    expect(bad).toContainEqual({ type: 'resource', resource: 'influence', delta: -2 })
    expect(bad).toContainEqual({ type: 'resource', resource: 'gold', delta: -1 })
    expect(bad).toContainEqual({ type: 'resource', resource: 'dread', delta: 1 })
    expect(bad.find((e: any) => e.cardId === 'investigators_file')).toBeUndefined()
  })
})

// ─── Task 3: Clarence ────────────────────────────────────────────────────────

describe('P25-06/P25-53 rare audit — clarence', () => {
  it('Have him handle it costs -2inf not -3inf', () => {
    const card = rareCard('clarence')
    const handle = card.options.find(o => o.label === 'Have him handle it')!
    expect(handle.effects).toContainEqual({ type: 'resource', resource: 'influence', delta: -2 })
    expect(handle.effects).not.toContainEqual({ type: 'resource', resource: 'influence', delta: -3 })
  })

  it('Have him handle it requires inf≥2 not inf≥3', () => {
    const card = rareCard('clarence')
    const handle = card.options.find(o => o.label === 'Have him handle it')!
    expect(handle.condition).toEqual({ type: 'resourceMin', resource: 'influence', min: 2 })
  })

  it('Not yet has no dread cost', () => {
    const card = rareCard('clarence')
    const notYet = card.options.find(o => o.label === 'Not yet')!
    expect(notYet.effects).not.toContainEqual({ type: 'resource', resource: 'dread', delta: 1 })
  })

  it('Not yet reinserts clarence at pos 4-7', () => {
    const card = rareCard('clarence')
    const notYet = card.options.find(o => o.label === 'Not yet')!
    expect(notYet.effects).toContainEqual({ type: 'removeCard', cardId: 'clarence' })
    expect(notYet.effects).toContainEqual({
      type: 'insertCard',
      cardId: 'clarence',
      position: 'random',
      minPos: 4,
      maxPos: 7,
    })
  })

  it('Not yet flavour text is within 80 char cap', () => {
    const card = rareCard('clarence')
    const notYet = card.options.find(o => o.label === 'Not yet')!
    expect(notYet.flavourText.length).toBeLessThanOrEqual(80)
  })
})

// ─── Task 4: Artefact + fishermans_return ────────────────────────────────────

describe('P25-06 rare audit — artefact_from_deep', () => {
  it('body text is within 108 char cap', () => {
    const card = rareCard('artefact_from_deep')
    expect(card.flavourText.length).toBeLessThanOrEqual(108)
  })

  it('"Keep it" option exists; "Take it" does not', () => {
    const card = rareCard('artefact_from_deep')
    expect(card.options.find(o => o.label === 'Keep it')).toBeDefined()
    expect(card.options.find(o => o.label === 'Take it')).toBeUndefined()
  })

  it('"Keep it" flavour text is within 80 char cap', () => {
    const card = rareCard('artefact_from_deep')
    const keep = card.options.find(o => o.label === 'Keep it')!
    expect(keep.flavourText.length).toBeLessThanOrEqual(80)
  })

  it('"Keep it" grants +2relics not +1', () => {
    const card = rareCard('artefact_from_deep')
    const keep = card.options.find(o => o.label === 'Keep it')!
    expect(keep.effects).toContainEqual({ type: 'resource', resource: 'relics', delta: 2 })
    expect(keep.effects).not.toContainEqual({ type: 'resource', resource: 'relics', delta: 1 })
  })
})

describe('P25-06 rare audit — fishermans_return', () => {
  it('"Return the artefact" flavour clarifies only one relic is taken back', () => {
    const card = threatCard('fishermans_return')
    const ret = card.options.find(o => o.label === 'Return the artefact')!
    expect(ret.flavourText).toContain('one')
  })
})

// ─── Task 2: cursed_object ──────────────────────────────────────────────────

describe('P25-43 — cursed_object Study it', () => {
  const card = TREAT_CARDS.find(c => c.id === 'cursed_object')!
  const study = card.options.find(o => o.label === 'Study it')!

  it('costs dread+3 (not dread+2)', () => {
    expect(study.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: 3 })
    expect(study.effects).not.toContainEqual({ type: 'resource', resource: 'dread', delta: 2 })
  })

  it('still gives relics+1', () => {
    expect(study.effects).toContainEqual({ type: 'resource', resource: 'relics', delta: 1 })
  })
})

// ─── Task 3: merchant_remembers ─────────────────────────────────────────────────

describe('P25-43 — merchant_remembers payoffs', () => {
  const card = TREAT_CARDS.find(c => c.id === 'merchant_remembers')!
  const accept = card.options.find(o => o.label === 'Accept what he sent')!
  const sendBack = card.options.find(o => o.label === 'Send it back again')!

  it('Accept gives relics+2 (not followers+2)', () => {
    expect(accept.effects).toContainEqual({ type: 'resource', resource: 'relics', delta: 2 })
    expect(accept.effects).not.toContainEqual({ type: 'resource', resource: 'followers', delta: 2 })
  })

  it('Accept does not give influence+1', () => {
    expect(accept.effects).not.toContainEqual({ type: 'resource', resource: 'influence', delta: 1 })
  })

  it('Send it back gives gold+2 and dread-2', () => {
    expect(sendBack.effects).toContainEqual({ type: 'resource', resource: 'gold', delta: 2 })
    expect(sendBack.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: -2 })
  })

  it('both options still removeCard merchant_remembers', () => {
    expect(accept.effects).toContainEqual({ type: 'removeCard', cardId: 'merchant_remembers' })
    expect(sendBack.effects).toContainEqual({ type: 'removeCard', cardId: 'merchant_remembers' })
  })
})
