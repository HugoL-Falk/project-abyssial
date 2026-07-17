import { describe, it, expect } from 'vitest'
import { GOD_PATH_CHAINS } from '../index'
import { THE_MOVING_PAINTING } from './nyarlathotep'
import { YHA_NTHLEI_CHAIN } from './yha_nthlei'

describe('THE_MOVING_PAINTING', () => {
  it('is classified as threat with no godPath', () => {
    expect(THE_MOVING_PAINTING.tier).toBe('threat')
    expect((THE_MOVING_PAINTING as any).godPath).toBeUndefined()
  })

  it('has two options: "Speak with each of them" and "Leave it"', () => {
    expect(THE_MOVING_PAINTING.options).toHaveLength(2)
    expect(THE_MOVING_PAINTING.options[0].label).toBe('Speak with each of them')
    expect(THE_MOVING_PAINTING.options[1].label).toBe('Leave it')
  })

  it('"Speak with each of them" costs −2 influence with resourceMin inf 2 condition', () => {
    const opt = THE_MOVING_PAINTING.options[0]
    expect(opt.condition).toEqual({ type: 'resourceMin', resource: 'influence', min: 2 })
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence') as any
    expect(inf?.delta).toBe(-2)
  })

  it('"Leave it" gives +2 dread with no condition', () => {
    const opt = THE_MOVING_PAINTING.options[1]
    expect(opt.condition).toBeUndefined()
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread') as any
    expect(dread?.delta).toBe(2)
  })

  it('"Speak with each of them" seeds 1 whisper', () => {
    const opt = THE_MOVING_PAINTING.options[0]
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(whispers?.count).toBe(1)
  })

  it('"Leave it" seeds 1 whisper', () => {
    const opt = THE_MOVING_PAINTING.options[1]
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(whispers?.count).toBe(1)
  })
})

describe('nyarlathotep chain — chainStage reorder', () => {
  it('each card has the correct chainStage after reorder', () => {
    const chain = GOD_PATH_CHAINS.nyarlathotep
    expect(chain.find(c => c.id === 'nyarlathotep_4')?.chainStage).toBe(1)
    expect(chain.find(c => c.id === 'nyarlathotep_3')?.chainStage).toBe(2)
    expect(chain.find(c => c.id === 'nyarlathotep_2')?.chainStage).toBe(3)
    expect(chain.find(c => c.id === 'nyarlathotep_1')?.chainStage).toBe(4)
    expect(chain.find(c => c.id === 'nyarlathotep_5')?.chainStage).toBe(5)
    expect(chain.find(c => c.id === 'nyarlathotep_6')?.chainStage).toBe(6)
  })
})

describe('nyarlathotep_4 — The Book is Opened (CS1)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_4')!

  it('opt0 "Formalise a study group" has only godPathStageMin:0 condition (no resourceMin followers)', () => {
    const opt = card().options.find(o => o.label === 'Formalise a study group')!
    expect(opt.condition).toEqual({ type: 'godPathStageMin', min: 0 })
  })

  it('opt0 "Formalise a study group" costs −1 fol/+1 dread', () => {
    const opt = card().options.find(o => o.label === 'Formalise a study group')!
    const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers') as any
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread') as any
    expect(fol?.delta).toBe(-1)
    expect(dread?.delta).toBe(1)
  })

  it('opt1 "Let it circulate freely" requires resourceMin inf 1 (not 2)', () => {
    const opt = card().options.find(o => o.label === 'Let it circulate freely')!
    expect(opt.condition).toEqual({ type: 'resourceMin', resource: 'influence', min: 1 })
  })

  it('opt1 "Let it circulate freely" costs −1 inf and has no seedWhispers', () => {
    const opt = card().options.find(o => o.label === 'Let it circulate freely')!
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence') as any
    expect(inf?.delta).toBe(-1)
    const hasWhispers = opt.effects.some((e: any) => e.type === 'seedWhispers')
    expect(hasWhispers).toBe(false)
  })

  it('opt2 "Dream the bargain" gives −1 dread (steadying, not alarming)', () => {
    const opt = card().options.find(o => o.label === 'Dream the bargain')!
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread') as any
    expect(dread?.delta).toBe(-1)
  })

  it('opt0 "Formalise a study group" seeds 1 whisper', () => {
    const opt = card().options.find(o => o.label === 'Formalise a study group')!
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(whispers?.count).toBe(1)
  })

  it('opt2 "Dream the bargain" seeds 1 whisper', () => {
    const opt = card().options.find(o => o.label === 'Dream the bargain')!
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(whispers?.count).toBe(1)
  })
})

describe('nyarlathotep_2 — The Exhibit (CS3)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_2')!

  it('opt0 "Sponsor the exhibit" requires godPathStageMin 2 AND gold 2', () => {
    const opt = card().options.find(o => o.label === 'Sponsor the exhibit')!
    expect(opt.condition).toEqual({
      type: 'and',
      conditions: [
        { type: 'godPathStageMin', min: 2 },
        { type: 'resourceMin', resource: 'gold', min: 2 },
      ],
    })
  })

  it('opt0 "Sponsor the exhibit" costs −2 gold/+2 inf, no dread, seeds 2 whispers', () => {
    const opt = card().options.find(o => o.label === 'Sponsor the exhibit')!
    const gold = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'gold') as any
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence') as any
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(gold?.delta).toBe(-2)
    expect(inf?.delta).toBe(2)
    expect(dread).toBeUndefined()
    expect(whispers?.count).toBe(2)
  })

  it('opt1 "Arrange a private viewing" inserts the_moving_painting then self-reinserts', () => {
    const opt = card().options.find(o => o.label === 'Arrange a private viewing')!
    const inserts = opt.effects.filter((e: any) => e.type === 'insertCard') as any[]
    expect(inserts).toHaveLength(2)
    expect(inserts[0]).toMatchObject({ cardId: 'the_moving_painting', minPos: 2, maxPos: 5 })
    expect(inserts[1]).toMatchObject({ cardId: 'nyarlathotep_2', minPos: 5, maxPos: 8 })
  })

  it('opt1 "Arrange a private viewing" has no dread delta', () => {
    const opt = card().options.find(o => o.label === 'Arrange a private viewing')!
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread') as any
    expect(dread).toBeUndefined()
  })

  it('opt2 "Recognise the pattern" seeds 1 whisper', () => {
    const opt = card().options.find(o => o.label === 'Recognise the pattern')!
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(whispers?.count).toBe(1)
  })
})

describe('nyarlathotep_3 — The Black Man at the Crossroads (CS2)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_3')!

  it('opt0 "Encourage the meetings" requires godPathStageMin 1', () => {
    const enc = card().options.find(o => o.label === 'Encourage the meetings')!
    expect(enc.condition).toEqual({ type: 'godPathStageMin', min: 1 })
  })

  it('opt1 "Observe without intervening" has no condition (stall — always available)', () => {
    const obs = card().options.find(o => o.label === 'Observe without intervening')!
    expect(obs.condition).toBeUndefined()
  })

  it('opt1 "Observe without intervening" inserts nyarlathotep_3 at minPos 6 maxPos 9 instead of advancing', () => {
    const obs = card().options.find(o => o.label === 'Observe without intervening')!
    const insert = obs.effects.find((e: any) => e.type === 'insertCard') as any
    const advance = obs.effects.find((e: any) => e.type === 'advanceGodPath')
    expect(insert?.cardId).toBe('nyarlathotep_3')
    expect(insert?.position).toBe('random')
    expect(insert?.minPos).toBe(6)
    expect(insert?.maxPos).toBe(9)
    expect(advance).toBeUndefined()
  })

  it('opt0 "Encourage the meetings" gives +2 fol/+2 dread and seeds 2 whispers', () => {
    const opt = card().options.find(o => o.label === 'Encourage the meetings')!
    const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers') as any
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread') as any
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence')
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(fol?.delta).toBe(2)
    expect(dread?.delta).toBe(2)
    expect(inf).toBeUndefined()
    expect(whispers?.count).toBe(2)
  })

  it('opt1 "Observe without intervening" gives +1 dread and seeds 1 whisper', () => {
    const opt = card().options.find(o => o.label === 'Observe without intervening')!
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread') as any
    const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers')
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(dread?.delta).toBe(1)
    expect(fol).toBeUndefined()
    expect(whispers?.count).toBe(1)
  })

  it('opt2 "Greet him as expected" has no dread delta', () => {
    const opt = card().options.find(o => o.label === 'Greet him as expected')!
    const dread = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread') as any
    expect(dread).toBeUndefined()
  })

  it('opt2 "Greet him as expected" seeds 1 whisper', () => {
    const opt = card().options.find(o => o.label === 'Greet him as expected')!
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(whispers?.count).toBe(1)
  })
})

describe('nyarlathotep_1 — The Lecture (CS4)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_1')!

  it('opt0 "Attend" requires godPathStageMin 3', () => {
    const opt = card().options.find(o => o.label === 'Attend')!
    expect(opt.condition).toEqual({ type: 'godPathStageMin', min: 3 })
  })

  it('opt0 "Attend" seeds 2 whispers', () => {
    const opt = card().options.find(o => o.label === 'Attend')!
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(whispers?.count).toBe(2)
  })

  it('opt1 "Distribute pamphlets" self-reinserts at minPos 5 maxPos 8', () => {
    const opt = card().options.find(o => o.label === 'Distribute pamphlets')!
    const selfInsert = opt.effects.find(
      (e: any) => e.type === 'insertCard' && e.cardId === 'nyarlathotep_1',
    ) as any
    expect(selfInsert).toMatchObject({ cardId: 'nyarlathotep_1', minPos: 5, maxPos: 8 })
  })

  it('card has no prep-tag option (Lecture is a public event)', () => {
    const prepOpts = card().options.filter(o => o.condition?.type === 'hasPrepTag')
    expect(prepOpts).toHaveLength(0)
  })
})

describe('nyarlathotep_5 — The Signal Broadens (CS5)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_5')!

  it('opt0 "Tune in" gives +2 inf/+3 dread with no followers cost', () => {
    const opt = card().options.find(o => o.label === 'Tune in')!
    const fol = opt.effects.find((e: any) => e.type === 'resource' && (e as any).resource === 'followers')
    const inf = opt.effects.find((e: any) => e.type === 'resource' && (e as any).resource === 'influence') as any
    const dread = opt.effects.find((e: any) => e.type === 'resource' && (e as any).resource === 'dread') as any
    expect(fol).toBeUndefined()
    expect(inf?.delta).toBe(2)
    expect(dread?.delta).toBe(3)
  })

  it('opt1 "Destroy the equipment" requires resourceMin inf 2 (not 3)', () => {
    const opt = card().options.find(o => o.label === 'Destroy the equipment')!
    expect(opt.condition).toEqual({ type: 'resourceMin', resource: 'influence', min: 2 })
  })

  it('opt2 "Speak his name back" gives +1 dread (not +2)', () => {
    const opt = card().options.find(o => o.label === 'Speak his name back')!
    const dread = opt.effects.find((e: any) => e.type === 'resource' && (e as any).resource === 'dread') as any
    expect(dread?.delta).toBe(1)
  })

  it('opt0 "Tune in" seeds 2 whispers', () => {
    const opt = card().options.find(o => o.label === 'Tune in')!
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(whispers?.count).toBe(2)
  })

  it('opt2 "Speak his name back" seeds 1 whisper', () => {
    const opt = card().options.find(o => o.label === 'Speak his name back')!
    const whispers = opt.effects.find((e: any) => e.type === 'seedWhispers') as any
    expect(whispers?.count).toBe(1)
  })

  it('opt1 "Destroy the equipment" does not seed whispers', () => {
    const opt = card().options.find(o => o.label === 'Destroy the equipment')!
    expect(opt.effects.some((e: any) => e.type === 'seedWhispers')).toBe(false)
  })
})

describe('nyarlathotep_6 — The Crawling Signal Arrives (CS6) — P25-41 gate redesign', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_6')!

  it('full victory opt has no godPathStageMin condition', () => {
    const opt = card().options.find(o => o.label === 'Receive the message')!
    const cond = opt.condition as any
    const stages = cond.conditions?.filter((c: any) => c.type === 'godPathStageMin') ?? []
    expect(stages).toHaveLength(0)
  })

  it('full victory opt drains −4 fol, −3 inf, −1 relic', () => {
    const opt = card().options.find(o => o.label === 'Receive the message')!
    const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers') as any
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence') as any
    const rel = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'relics') as any
    expect(fol?.delta).toBe(-4)
    expect(inf?.delta).toBe(-3)
    expect(rel?.delta).toBe(-1)
  })

  it('full victory condition gates fol ≥ 4, inf ≥ 3, relics ≥ 1, dread ≥ 6', () => {
    const opt = card().options.find(o => o.label === 'Receive the message')!
    const cond = opt.condition as any
    const folCond = cond.conditions.find((c: any) => c.resource === 'followers')
    const infCond = cond.conditions.find((c: any) => c.resource === 'influence')
    const relCond = cond.conditions.find((c: any) => c.resource === 'relics')
    const dreadCond = cond.conditions.find((c: any) => c.resource === 'dread')
    expect(folCond?.min).toBe(4)
    expect(infCond?.min).toBe(3)
    expect(relCond?.min).toBe(1)
    expect(dreadCond?.min).toBe(6)
  })

  it('partial victory opt drains −3 fol, −3 inf, −1 relic', () => {
    const opt = card().options.find(o => o.label === 'Receive parts of the message')!
    const fol = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers') as any
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence') as any
    const rel = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'relics') as any
    expect(fol?.delta).toBe(-3)
    expect(inf?.delta).toBe(-3)
    expect(rel?.delta).toBe(-1)
  })

  it('partial victory condition gates fol ≥ 3, inf ≥ 3, relics ≥ 1, dread ≥ 4', () => {
    const opt = card().options.find(o => o.label === 'Receive parts of the message')!
    const cond = opt.condition as any
    const folCond = cond.conditions.find((c: any) => c.resource === 'followers')
    const infCond = cond.conditions.find((c: any) => c.resource === 'influence')
    const relCond = cond.conditions.find((c: any) => c.resource === 'relics')
    const dreadCond = cond.conditions.find((c: any) => c.resource === 'dread')
    expect(folCond?.min).toBe(3)
    expect(infCond?.min).toBe(3)
    expect(relCond?.min).toBe(1)
    expect(dreadCond?.min).toBe(4)
  })

  it('partial victory condition has NOT(full) sub-condition', () => {
    const opt = card().options.find(o => o.label === 'Receive parts of the message')!
    const cond = opt.condition as any
    const notCond = cond.conditions.find((c: any) => c.type === 'not')
    expect(notCond).toBeDefined()
    // The NOT must negate the full victory conditions
    const inner = notCond.condition as any
    expect(inner.type).toBe('and')
    const folInner = inner.conditions.find((c: any) => c.resource === 'followers')
    expect(folInner?.min).toBe(4)
  })

  it('endRun opt has succumbOption: true', () => {
    const opt = card().options.find(o => o.label === 'The signal overwhelms you')!
    expect(opt.succumbOption).toBe(true)
  })
})

describe('nyarlathotep_6 — The Crawling Signal Arrives (CS6)', () => {
  const card = () => GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_6')!

  it('opt "Receive parts of the message" has trimmed flavour text', () => {
    const opt = card().options.find(o => o.label === 'Receive parts of the message')!
    expect(opt.flavourText).toBe('Something was felt but not fully understood. Enough to know what comes next.')
  })

  it('opt "The signal overwhelms you" has trimmed flavour text', () => {
    const opt = card().options.find(o => o.label === 'The signal overwhelms you')!
    expect(opt.flavourText).toBe('The frequency was right. The mind was not ready.')
  })
})

describe('yha_nthlei_6 — P25-41 gate redesign', () => {
  const card = () => YHA_NTHLEI_CHAIN.find(c => c.id === 'yha_nthlei_6')!

  it('full victory opt drains −5 inf, −4 gold, −1 relic', () => {
    const opt = card().options.find(o => o.label === 'Complete the rite')!
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence') as any
    const gold = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'gold') as any
    const rel = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'relics') as any
    expect(inf?.delta).toBe(-5)
    expect(gold?.delta).toBe(-4)
    expect(rel?.delta).toBe(-1)
  })

  it('full victory condition gates inf ≥ 5, gold ≥ 4, relics ≥ 1 (no dread)', () => {
    const opt = card().options.find(o => o.label === 'Complete the rite')!
    const cond = opt.condition as any
    const infCond = cond.conditions.find((c: any) => c.resource === 'influence')
    const goldCond = cond.conditions.find((c: any) => c.resource === 'gold')
    const relCond = cond.conditions.find((c: any) => c.resource === 'relics')
    const dreadCond = cond.conditions.find((c: any) => c.resource === 'dread')
    expect(infCond?.min).toBe(5)
    expect(goldCond?.min).toBe(4)
    expect(relCond?.min).toBe(1)
    expect(dreadCond).toBeUndefined()
  })

  it('partial victory opt drains −3 inf, −3 gold, −1 relic', () => {
    const opt = card().options.find(o => o.label === 'Complete the rite (underprepared)')!
    const inf = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'influence') as any
    const gold = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'gold') as any
    const rel = opt.effects.find((e: any) => e.type === 'resource' && e.resource === 'relics') as any
    expect(inf?.delta).toBe(-3)
    expect(gold?.delta).toBe(-3)
    expect(rel?.delta).toBe(-1)
  })

  it('partial victory condition gates inf ≥ 3, gold ≥ 3, relics ≥ 1 with NOT(full)', () => {
    const opt = card().options.find(o => o.label === 'Complete the rite (underprepared)')!
    const cond = opt.condition as any
    const infCond = cond.conditions.find((c: any) => c.resource === 'influence')
    const goldCond = cond.conditions.find((c: any) => c.resource === 'gold')
    const relCond = cond.conditions.find((c: any) => c.resource === 'relics')
    const notCond = cond.conditions.find((c: any) => c.type === 'not')
    expect(infCond?.min).toBe(3)
    expect(goldCond?.min).toBe(3)
    expect(relCond?.min).toBe(1)
    expect(notCond).toBeDefined()
  })

  it('endRun opt has succumbOption: true', () => {
    const opt = card().options.find(o => o.label === 'The water does not wait')!
    expect(opt.succumbOption).toBe(true)
  })
})

describe('flavour cap compliance — all nyarlathotep cards', () => {
  it('all chain card bodies are ≤108 chars', () => {
    for (const card of GOD_PATH_CHAINS.nyarlathotep) {
      if (card.flavourText) {
        expect(card.flavourText.length).toBeLessThanOrEqual(108)
      }
    }
    if (THE_MOVING_PAINTING.flavourText) {
      expect(THE_MOVING_PAINTING.flavourText.length).toBeLessThanOrEqual(108)
    }
  })

  it('all chain card option flavourTexts are ≤80 chars', () => {
    for (const card of GOD_PATH_CHAINS.nyarlathotep) {
      for (const opt of card.options) {
        if (opt.flavourText) {
          expect(opt.flavourText.length).toBeLessThanOrEqual(80)
        }
      }
    }
    for (const opt of THE_MOVING_PAINTING.options) {
      if (opt.flavourText) {
        expect(opt.flavourText.length).toBeLessThanOrEqual(80)
      }
    }
  })
})
