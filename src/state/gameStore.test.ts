import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useGameStore, computeDreadPressure } from './gameStore'
import { saveRun } from '../engine/persistence'
import { checkCondition } from '../engine/godPath'
import type { Card, Condition, Resources, Effect, RunConfig } from '../types'
import { GOD_PATH_CHAINS, RARE_CARDS, THREAT_CARDS, YHA_NTHLEI_CHAIN, CORE_CARDS } from '../data'
import { TREAT_CARDS } from '../data/cards/treats'
import { DARK_YOUNG_GUARDIAN } from '../data/cards/rare'
import { COMMON_CARDS } from '../data/cards/common'
import { affordabilityShortfall, reqRedundant, STARTING_RESOURCES } from '../engine/resources'
import type { PrepTag } from '../data/godPaths/prepTagCarriers'
import { UNRAVELLING_CARDS } from '../data/cards/unravelling'
import { SPECIAL_CARDS } from '../data/cards/special'

const makeCard = (id: string): Card => ({
  id,
  name: id,
  tier: 'common',
  options: [],
} as unknown as Card)

describe('reshuffleOnly', () => {
  it('post-reshuffle draw pile includes the unravelling card (count > raw discard count)', () => {
    const discardCards = [makeCard('a'), makeCard('b'), makeCard('c')]

    useGameStore.setState({
      phase: 'playing',
      deck: {
        drawPile: [],
        discardPile: discardCards,
        nextCycleQueue: [],
        permDiscardPile: [],
        chainReserve: [],
      },
      activityLog: [],
      reshuffleCount: 0,
      pendingUnravelling: false,
      runConfig: null,
    } as any)

    useGameStore.getState().reshuffleOnly()

    const state = useGameStore.getState()
    // Post-shuffle draw pile must include the unravelling card on top of the recycled discard,
    // so length should exceed the raw pre-shuffle discard count.
    expect(state.deck.drawPile.length).toBeGreaterThan(discardCards.length)
  })
})

describe('activity log batch lifecycle', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('starts empty with batchSealed=false', () => {
    const s = useGameStore.getState()
    expect(s.activityLog).toEqual([])
    expect(s.activityBatchSealed).toBe(false)
  })

  it('pushActivity after sealed batch replaces the batch', () => {
    const { pushActivity, sealActivityBatch } = useGameStore.getState()
    pushActivity({ kind: 'reshuffle', count: 5 })
    sealActivityBatch()
    pushActivity({ kind: 'insert', card: { id: 'x', title: 'X', tier: 'threat' }, source: 'option' })
    const s = useGameStore.getState()
    expect(s.activityLog).toHaveLength(1)
    expect(s.activityLog[0].kind).toBe('insert')
    expect(s.activityBatchSealed).toBe(false)
  })

  it('multiple pushActivity calls in one beat accumulate', () => {
    const { pushActivity } = useGameStore.getState()
    pushActivity({ kind: 'reshuffle', count: 15 })
    pushActivity({ kind: 'doomEscalate' })
    pushActivity({ kind: 'insert', card: { id: 'd', title: 'Doom', tier: 'doom' }, source: 'doom' })
    expect(useGameStore.getState().activityLog).toHaveLength(3)
  })

  it('sealActivityBatch with no entries leaves an empty batch', () => {
    const { sealActivityBatch } = useGameStore.getState()
    sealActivityBatch()
    expect(useGameStore.getState().activityLog).toEqual([])
  })

  it('idle beat clears the previous batch', () => {
    const { pushActivity, sealActivityBatch } = useGameStore.getState()
    pushActivity({ kind: 'insert', card: { id: 'a', title: 'A', tier: 'core' }, source: 'option' })
    sealActivityBatch()
    // Next beat: seal again without pushing -> previous batch persists
    // until the NEXT pushActivity, which will replace it. To model an idle
    // beat that clears, we explicitly check the replacement behavior:
    sealActivityBatch() // double-seal is a no-op
    expect(useGameStore.getState().activityLog).toHaveLength(1) // still visible
    // The clear happens lazily on next push:
    pushActivity({ kind: 'reshuffle', count: 12 })
    expect(useGameStore.getState().activityLog).toEqual([{ kind: 'reshuffle', count: 12 }])
  })
})

describe('reshuffleOnly activity batch', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('non-tutorial reshuffle log contains doomEscalate then the doom insert (P22-42/P22-51: moved from WeekBanner)', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [{ id: 'congregation_meets', title: 'Congregation Meets', tier: 'core', options: [] } as never], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      blessings: { unlocked: [], selected: [] },
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().reshuffleOnly()

    const log = useGameStore.getState().activityLog
    expect(log).toHaveLength(2)
    expect(log[0].kind).toBe('doomEscalate')
    expect(log[1].kind).toBe('insert')
    if (log[1].kind === 'insert') {
      expect(log[1].source).toBe('doom')
    }
  })

  it('tutorial reshuffle clears the activity log (banner is suppressed in tutorial)', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'olgreth', runLength: 'short', isTutorial: true },
      deck: { drawPile: [], discardPile: [{ id: 't', title: 'T', tier: 'core', options: [] } as never], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      activityLog: [],
      activityBatchSealed: true,
    })
    useGameStore.getState().reshuffleOnly()
    const log = useGameStore.getState().activityLog
    expect(log).toHaveLength(0)
  })
})

describe('resolveOption activity batch', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('emits insert{source:option} for an option-driven insert', () => {
    const insertingCard = {
      id: 'test_insert', title: 'Test Insert', tier: 'core' as const,
      options: [{ id: 'o', label: 'Add', effects: [{ type: 'insertCard', cardId: 'congregation_meets', position: 'random' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: insertingCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const log = useGameStore.getState().activityLog
    const insert = log.find(e => e.kind === 'insert')
    expect(insert).toBeDefined()
    if (insert?.kind === 'insert') {
      expect(insert.source).toBe('option')
      expect(insert.card.id).toBe('congregation_meets')
    }
  })

  it('P19-29: every dark_young_guardian option inserts it_still_needs_feeding', () => {
    DARK_YOUNG_GUARDIAN.options.forEach((_, optIdx) => {
      useGameStore.getState().resetGame()
      useGameStore.setState({
        phase: 'playing',
        runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
        deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
        currentCard: DARK_YOUNG_GUARDIAN,
        resources: { ...STARTING_RESOURCES, gold: 5, followers: 5, influence: 5, dread: 0 },
        activityLog: [],
        activityBatchSealed: true,
      })
      useGameStore.getState().resolveOption(optIdx)
      const log = useGameStore.getState().activityLog
      const fed = log.find(e => e.kind === 'insert' && e.card.id === 'it_still_needs_feeding')
      expect(fed, `option ${optIdx} should insert it_still_needs_feeding`).toBeDefined()
    })
  })

  it('emits randomOutcome entry (folding flavour + insertedCard) when the chosen branch inserts a card', () => {
    const card = {
      id: 'test_random', title: 'Test Random', tier: 'core' as const,
      options: [{
        id: 'o', label: 'Roll',
        effects: [{
          type: 'randomOutcome',
          outcomes: [{
            weight: 1,
            flavourText: 'A wave breaks.',
            effects: [{ type: 'insertCard', cardId: 'congregation_meets', position: 'random' }],
          }],
        }],
      }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const log = useGameStore.getState().activityLog
    const ro = log.find(e => e.kind === 'randomOutcome')
    expect(ro).toBeDefined()
    if (ro?.kind === 'randomOutcome') {
      expect(ro.flavour).toBe('A wave breaks.')
      expect(ro.insertedCard?.id).toBe('congregation_meets')
    }
    // The random insert should NOT also appear as a separate insert entry.
    expect(log.find(e => e.kind === 'insert' && e.source === 'random')).toBeUndefined()
  })

  it('emits insert{source:godPath, godPath:yha_nthlei} for god-path insertions', () => {
    const card = {
      id: 'test_gp', title: 'Test GP', tier: 'core' as const,
      options: [{ id: 'o', label: 'Open', effects: [{ type: 'insertCard', cardId: 'yha_nthlei_1', position: 'random' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [{ id: 'congregation_meets', title: 'C', tier: 'core' } as never], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const log = useGameStore.getState().activityLog
    const insert = log.find(e => e.kind === 'insert' && e.source === 'godPath')
    expect(insert).toBeDefined()
    if (insert?.kind === 'insert') {
      expect(insert.godPath).toBe('yha_nthlei')
    }
  })

  it('emits purge{source:option} on removeCard effect', () => {
    const card = {
      id: 'test_purge', title: 'Test Purge', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeCard', cardId: 'congregation_meets' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [{ id: 'congregation_meets', title: 'C', tier: 'core' } as never], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const log = useGameStore.getState().activityLog
    const purge = log.find(e => e.kind === 'purge')
    expect(purge).toBeDefined()
    if (purge?.kind === 'purge') {
      expect(purge.source).toBe('option')
    }
  })
})

describe('overflow/deficit/recover events at auto-fire sites', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('drawNextCard: onDraw that pushes gold to >= 10 emits insert{source:overflow}', () => {
    const overflowCard = {
      id: 'test_ondraw_overflow',
      title: 'Test Overflow',
      tier: 'core' as const,
      onDraw: [{ type: 'resource', resource: 'gold', delta: 3 }],
      options: [{ id: 'o', label: 'OK', effects: [] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: {
        gold: 8, followers: 5, influence: 5, dread: 0, relics: 0,
      },
      deck: {
        drawPile: [overflowCard],
        discardPile: [],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      activityLog: [],
      activityBatchSealed: true,
      blessings: { unlocked: [], selected: [] },
      cardRunState: {},
      usedRareIds: new Set(),
    } as any)

    useGameStore.getState().drawNextCard()

    const log = useGameStore.getState().activityLog
    const insert = log.find(e => e.kind === 'insert')
    expect(insert).toBeDefined()
    if (insert?.kind === 'insert') {
      expect(insert.source).toBe('overflow')
    }
  })

  it('drawNextCard: onDraw that drops gold from >= 10 to < 10 emits purge{source:recover}', () => {
    const recoverCard = {
      id: 'test_ondraw_recover',
      title: 'Test Recover',
      tier: 'core' as const,
      onDraw: [{ type: 'resource', resource: 'gold', delta: -3 }],
      options: [{ id: 'o', label: 'OK', effects: [] }],
    } as never

    // Simulate an overflow card already present in the deck
    const overflowDummyCard = {
      id: 'the_ledger_is_noticed',
      title: 'The Ledger Is Noticed',
      tier: 'threat' as const,
      options: [],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: {
        gold: 10, followers: 5, influence: 5, dread: 0, relics: 0,
      },
      deck: {
        drawPile: [recoverCard, overflowDummyCard],
        discardPile: [],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      activityLog: [],
      activityBatchSealed: true,
      blessings: { unlocked: [], selected: [] },
      cardRunState: {},
      usedRareIds: new Set(),
    } as any)

    useGameStore.getState().drawNextCard()

    const log = useGameStore.getState().activityLog
    const purge = log.find(e => e.kind === 'purge')
    expect(purge).toBeDefined()
    if (purge?.kind === 'purge') {
      expect(purge.source).toBe('recover')
    }
  })

  it('s96 fix: onDraw insertCard inserts the card and logs it', () => {
    const target = { id: 'congregation_meets', title: 'C', tier: 'core' as const, options: [] } as never
    const card = {
      id: 'test_ondraw_insert', title: 'Test Insert', tier: 'core' as const,
      onDraw: [{ type: 'insertCard', cardId: 'congregation_meets', position: 'random', minPos: 0, maxPos: 3 }],
      options: [{ id: 'o', label: 'OK', effects: [] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [card], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 1, theChanged: 0 },
      activityLog: [],
      activityBatchSealed: true,
      cardRunState: {},
      pendingUnravelling: false,
    } as any)

    useGameStore.getState().drawNextCard()
    const { deck, activityLog } = useGameStore.getState()
    const inserted = [...deck.drawPile, ...deck.discardPile].find(c => c.id === 'congregation_meets')
    expect(inserted).toBeDefined()
    const logEntry = activityLog.find(e => e.kind === 'insert' && e.card.id === 'congregation_meets')
    expect(logEntry).toBeDefined()
  })

  it('s96 fix: onDraw removeCard removes the target card', () => {
    const removable = { id: 'congregation_meets', title: 'C', tier: 'core' as const, options: [] } as never
    const card = {
      id: 'test_ondraw_remove', title: 'Test Remove', tier: 'core' as const,
      onDraw: [{ type: 'removeCard', cardId: 'congregation_meets' }],
      options: [{ id: 'o', label: 'OK', effects: [] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [card, removable], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 1, theChanged: 0 },
      activityLog: [],
      activityBatchSealed: true,
      cardRunState: {},
      pendingUnravelling: false,
    } as any)

    useGameStore.getState().drawNextCard()
    const { deck } = useGameStore.getState()
    const stillThere = [...deck.drawPile, ...deck.discardPile, ...deck.nextCycleQueue]
      .find(c => c.id === 'congregation_meets')
    expect(stillThere).toBeUndefined()
  })

  it('spendRelic: spending to drive gold to 0 emits insert{source:deficit}', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: {
        gold: 1, followers: 5, influence: 5, dread: 0, relics: 1,
      },
      deck: {
        drawPile: [],
        discardPile: [],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      activityLog: [],
      activityBatchSealed: true,
      blessings: { unlocked: [], selected: [] },
      cardRunState: {},
      pendingUnravelling: false,
      pendingGameOver: null,
      usedRareIds: new Set(),
    } as any)

    useGameStore.getState().spendRelic('gold', -2)

    const log = useGameStore.getState().activityLog
    const insert = log.find(e => e.kind === 'insert')
    expect(insert).toBeDefined()
    if (insert?.kind === 'insert') {
      expect(insert.source).toBe('deficit')
    }
  })

  it('activateDeepTrade: followers crossing 10 emits insert{source:overflow}', () => {
    // followers 7 + 4 = 11 => crosses overflow threshold => theyre_not_listening inserted
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      blessings: { unlocked: [], selected: ['the_deep_trade'] },
      resources: { gold: 0, followers: 7, influence: 5, dread: 0, relics: 2 },
      deck: {
        drawPile: [],
        discardPile: [],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      activityLog: [],
      activityBatchSealed: true,
      deepTradeUsed: false,
      cardRunState: {},
      pendingUnravelling: false,
      pendingGameOver: null,
      usedRareIds: new Set(),
    } as any)

    useGameStore.getState().activateDeepTrade()

    const log = useGameStore.getState().activityLog
    const overflowInsert = log.find(e => e.kind === 'insert' && e.source === 'overflow')
    expect(overflowInsert).toBeDefined()
    if (overflowInsert?.kind === 'insert') {
      expect(overflowInsert.card.id).toBe('theyre_not_listening')
    }
  })
})

describe('reshuffleOnly doom disambiguation (I-2 / P20-F dedup)', () => {
  it('reuses a prior undrawn doom card instead of duplicating it (P20-F: two veil_thins bug)', () => {
    // Stage: a doom card (unravelling_1) already in discardPile from a prior cycle.
    // reshuffle() now guards against duplicating an already-present doom card
    // (src/engine/deck.ts existingDoom check) — the log entry must reference the
    // EXISTING stale card, and no second copy should be folded into the new draw pile.
    const staleDoomCard = {
      id: 'unravelling_1',
      title: 'Unravelling',
      tier: 'doom',
      options: [],
    } as unknown as Card

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: {
        drawPile: [],
        discardPile: [staleDoomCard, makeCard('congregation_meets')],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      blessings: { unlocked: [], selected: [] },
      activityLog: [],
      activityBatchSealed: true,
      reshuffleCount: 0,
      pendingUnravelling: false,
      usedRareIds: new Set(),
      cardRunState: {},
      pendingGameOver: null,
    } as any)

    useGameStore.getState().reshuffleOnly()

    const log = useGameStore.getState().activityLog
    const doomInsert = log.find(e => e.kind === 'insert' && e.source === 'doom')
    expect(doomInsert).toBeDefined()
    // The referenced card must still be the unravelling_1 doom card.
    if (doomInsert?.kind === 'insert') {
      expect(doomInsert.card.id).toBe('unravelling_1')
      expect(doomInsert.card.tier).toBe('doom')
    }
    // P20-F fix: the draw pile must contain exactly ONE unravelling_1 — the stale
    // discard-pile copy is reshuffled in, and no second copy should be folded into the new draw pile.
    const newDrawPile = useGameStore.getState().deck.drawPile
    const doomCount = newDrawPile.filter(c => c.id === 'unravelling_1').length
    expect(doomCount).toBe(1)
  })

  it('P22-P23-05: handles undrawn doom card in drawPile (not discardPile)', () => {
    // Stage: Edge case where doom card sits undrawn in drawPile before reshuffle.
    // The existingDoom check should find it and prevent duplication.
    const undrawnDoomCard = {
      id: 'unravelling_2',
      title: 'The Geometry Is Wrong',
      tier: 'doom',
      options: [],
    } as unknown as Card

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: {
        drawPile: [undrawnDoomCard, makeCard('congregation_meets')],
        discardPile: [makeCard('the_donation')],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      blessings: { unlocked: [], selected: [] },
      activityLog: [],
      activityBatchSealed: true,
      reshuffleCount: 0,
      pendingUnravelling: false,
      usedRareIds: new Set(),
      cardRunState: {},
      pendingGameOver: null,
    } as any)

    useGameStore.getState().reshuffleOnly()

    const newDrawPile = useGameStore.getState().deck.drawPile
    const doomCount = newDrawPile.filter(c => c.id === 'unravelling_2').length
    // Must have exactly ONE unravelling_2, not two
    expect(doomCount).toBe(1)
  })
})

describe('P25-37: pendingUnravelling clears when dread recovers below 10', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('resolveOption: clears pendingUnravelling when dread drops back below 10', () => {
    const card = {
      id: 'test_dread_reduce', title: 'Test', tier: 'core' as const,
      options: [{ label: 'Calm down', effects: [{ type: 'resource', resource: 'dread', delta: -5 }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      resources: { ...STARTING_RESOURCES, dread: 10 },
      pendingUnravelling: true,
      activityLog: [],
      activityBatchSealed: true,
      cardRunState: {},
    } as any)

    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().pendingUnravelling).toBe(false)
  })

  it('resolveOption: does NOT clear pendingUnravelling when dread stays at or above 10', () => {
    const card = {
      id: 'test_dread_stay', title: 'Test', tier: 'core' as const,
      options: [{ label: 'Hold', effects: [{ type: 'resource', resource: 'dread', delta: 1 }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      resources: { ...STARTING_RESOURCES, dread: 10 },
      pendingUnravelling: true,
      activityLog: [],
      activityBatchSealed: true,
      cardRunState: {},
    } as any)

    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().pendingUnravelling).toBe(true)
  })
})

describe('prepTags persist across reshuffle', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('non-tutorial reshuffle preserves prepTags', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [{ id: 'congregation_meets', title: 'C', tier: 'core', options: [] } as never], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      blessings: { unlocked: [], selected: [] },
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied', 'attended_seance'],
    })
    useGameStore.getState().reshuffleOnly()
    expect(useGameStore.getState().prepTags).toEqual(['studied', 'attended_seance'])
  })

  it('tutorial reshuffle preserves prepTags', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'olgreth', runLength: 'short', isTutorial: true },
      deck: { drawPile: [], discardPile: [{ id: 't', title: 'T', tier: 'core', options: [] } as never], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['recited'],
    })
    useGameStore.getState().reshuffleOnly()
    expect(useGameStore.getState().prepTags).toEqual(['recited'])
  })
})

describe('save/load prepTags', () => {
  beforeEach(() => {
    // Provide a minimal localStorage mock for the node test environment
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v },
      removeItem: (k: string) => { delete store[k] },
      clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    })
    useGameStore.getState().resetGame()
    localStorage.clear()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('round-trips prepTags through saveRun + loadRun', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      prepTags: ['studied', 'opium_pact'],
    })
    saveRun(useGameStore.getState())

    // Verify prepTags is non-empty before resetting (sanity check)
    expect(useGameStore.getState().prepTags).toEqual(['studied', 'opium_pact'])
    // Then wipe state in-place (without calling resetGame which also clears the save)
    useGameStore.setState({ prepTags: [] })
    expect(useGameStore.getState().prepTags).toEqual([])

    useGameStore.getState().loadRun()
    expect(useGameStore.getState().prepTags).toEqual(['studied', 'opium_pact'])
  })
})

describe('carrier guards: notHasPrepTag blocks re-acquisition while tag held', () => {
  const minState = (prepTags: string[]) => ({
    resources: STARTING_RESOURCES,
    deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
    godPathProgress: 0,
    runConfig: { godPath: 'yha_nthlei' as const, runLength: 'short' as const },
    cardRunState: {},
    prepTags,
  })

  it('the_opium_den opt2 "Acquire it" is blocked when opium_pact is already held', () => {
    const card = CORE_CARDS.find(c => c.id === 'the_opium_den')!
    const opt = card.options[2]
    expect(opt.condition).toBeDefined()
    expect(checkCondition(opt.condition!, minState(['opium_pact']))).toBe(false)
    // Without the tag, gold check passes (minState gives gold 10 by default)
    expect(checkCondition(opt.condition!, minState([]))).toBe(true)
  })

  it('the_opium_den opt0 "Encourage the visits" is NOT blocked by opium_pact', () => {
    const card = CORE_CARDS.find(c => c.id === 'the_opium_den')!
    const opt = card.options[0]
    // opt0 only checks followers >= 2 — opium_pact does not block it
    expect(checkCondition(opt.condition!, minState(['opium_pact']))).toBe(true)
  })

  it('the_seance opt 0 is blocked when attended_seance is already held', () => {
    const card = CORE_CARDS.find(c => c.id === 'the_seance')!
    const opt  = card.options[0]
    expect(opt.condition).toBeDefined()
    expect(checkCondition(opt.condition!, minState(['attended_seance']))).toBe(false)
    // Without the tag, option is open
    expect(checkCondition(opt.condition!, minState([]))).toBe(true)
  })
})

describe('prep-tag and defer effects', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  function cardWithEffects(id: string, effects: any[]) {
    return {
      id, title: id, flavourText: '', tier: 'core' as const,
      options: [{ label: 'go', flavourText: '', effects }],
    } as never
  }

  it('setPrepTag adds the tag to prepTags', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_set', [{ type: 'setPrepTag', tag: 'studied' }]),
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().prepTags).toContain('studied')
  })

  it('setPrepTag is idempotent (no duplicate of the same tag)', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_dupe', [{ type: 'setPrepTag', tag: 'studied' }]),
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied'],
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().prepTags.filter(t => t === 'studied')).toHaveLength(1)
  })

  it('consumePrepTag removes the tag', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_consume', [{ type: 'consumePrepTag', tag: 'studied' }]),
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied', 'recited'],
    })
    useGameStore.getState().resolveOption(0)
    const tags = useGameStore.getState().prepTags
    expect(tags).not.toContain('studied')
    expect(tags).toContain('recited')
  })

  it('consumePrepTag on absent tag is a no-op', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_no_consume', [{ type: 'consumePrepTag', tag: 'opium_pact' }]),
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied'],
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().prepTags).toEqual(['studied'])
  })

  it('consumePrepTag creates a prepTagRemoved activity entry', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_consume_log', [{ type: 'consumePrepTag', tag: 'studied' }]),
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied'],
    })
    useGameStore.getState().resolveOption(0)
    const log = useGameStore.getState().activityLog
    const entry = log.find(e => e.kind === 'prepTagRemoved')
    expect(entry).toBeDefined()
    expect((entry as any).tag).toBe('studied')
  })

  it('consumePrepTag on absent tag does NOT create a prepTagRemoved entry', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_no_consume_log', [{ type: 'consumePrepTag', tag: 'opium_pact' }]),
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied'],
    })
    useGameStore.getState().resolveOption(0)
    const log = useGameStore.getState().activityLog
    expect(log.some(e => e.kind === 'prepTagRemoved')).toBe(false)
  })

  it('deferGodPathCard moves the current god-path card later in drawPile', () => {
    const gp = { id: 'yha_3', title: 'Chain 3', tier: 'god_path', godPath: 'yha_nthlei', chainStage: 3, options: [] } as never
    const filler = (i: number) => ({ id: `f${i}`, title: `F${i}`, tier: 'core', options: [] } as never)
    const drawPile = [filler(0), filler(1), gp, filler(3), filler(4), filler(5), filler(6), filler(7)]
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile, discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_defer', [{ type: 'deferGodPathCard' }]),
      activityLog: [],
      activityBatchSealed: true,
    })
    useGameStore.getState().resolveOption(0)
    const newPile = useGameStore.getState().deck.drawPile
    const newIdx = newPile.findIndex(c => c.id === 'yha_3')
    expect(newIdx).toBe(6)
  })

  it('deferGodPathCard is a no-op when no god-path card is in drawPile', () => {
    const drawPile = [{ id: 'a', title: 'A', tier: 'core', options: [] } as never]
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile, discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithEffects('test_defer_noop', [{ type: 'deferGodPathCard' }]),
      activityLog: [],
      activityBatchSealed: true,
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().deck.drawPile).toHaveLength(1)
  })
})

describe('end-to-end prep-tag flow on yha_nthlei_2', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('resolving the studied bonus option consumes the tag and advances the chain', async () => {
    const { getCardById } = await import('../data')
    const yhaTwo = getCardById('yha_nthlei_2')
    expect(yhaTwo).toBeDefined()

    // Stage 3 card must be in chainReserve so advanceGodPathChain can queue it
    const { getCardById: getCardById2 } = await import('../data')
    const yhaThree = getCardById2('yha_nthlei_3')

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: yhaThree ? [yhaThree] : [], nextCycleQueue: [] },
      currentCard: yhaTwo,
      activityLog: [],
      activityBatchSealed: true,
      prepTags: ['studied'],
      godPathProgress: 1,  // about to encounter stage 2
    })

    // Find the bonus option index by label
    const bonusIdx = yhaTwo!.options.findIndex((o: any) => o.label === 'Invoke what the book gave')
    expect(bonusIdx).toBeGreaterThanOrEqual(0)

    useGameStore.getState().resolveOption(bonusIdx)

    expect(useGameStore.getState().prepTags).not.toContain('studied')
    expect(useGameStore.getState().godPathProgress).toBe(2)
  })

  it('the studied bonus option is gated when tag is absent', async () => {
    const { getCardById } = await import('../data')
    const yhaTwo = getCardById('yha_nthlei_2')
    const bonus = yhaTwo!.options.find((o: any) => o.label === 'Invoke what the book gave')
    expect(bonus).toBeDefined()
    expect(checkCondition(bonus!.condition!, {
      resources: { gold: 0, followers: 0, influence: 0, dread: 0, relics: 0, theChanged: 0 },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      godPathProgress: 1,
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      cardRunState: {},
      prepTags: [],
    })).toBe(false)
  })
})

describe('hasPrepTag condition', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('option with hasPrepTag condition is selectable only when tag is present', () => {
    const condition: Condition = { type: 'hasPrepTag', tag: 'studied' }
    const card = {
      id: 'test_gated', title: 'Test Gated', flavourText: '', tier: 'core' as const,
      options: [{
        label: 'Bonus', flavourText: '',
        condition,
        effects: [{ type: 'consumePrepTag', tag: 'studied' }],
      }],
    } as never

    // Without tag: option blocked
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
    })
    expect(checkCondition(condition, {
      resources: useGameStore.getState().resources,
      deck: useGameStore.getState().deck,
      godPathProgress: useGameStore.getState().godPathProgress,
      runConfig: useGameStore.getState().runConfig,
      cardRunState: useGameStore.getState().cardRunState,
      prepTags: useGameStore.getState().prepTags,
    })).toBe(false)

    // With tag: option allowed
    useGameStore.setState({ prepTags: ['studied'] })
    expect(checkCondition(condition, {
      resources: useGameStore.getState().resources,
      deck: useGameStore.getState().deck,
      godPathProgress: useGameStore.getState().godPathProgress,
      runConfig: useGameStore.getState().runConfig,
      cardRunState: useGameStore.getState().cardRunState,
      prepTags: useGameStore.getState().prepTags,
    })).toBe(true)
  })
})

describe('notHasPrepTag condition', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('option with notHasPrepTag condition is selectable only when tag is absent', () => {
    const condition: Condition = { type: 'notHasPrepTag', tag: 'tiara_returned_once' }

    // Without tag: option allowed
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: null,
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
    })
    expect(checkCondition(condition, {
      resources: useGameStore.getState().resources,
      deck: useGameStore.getState().deck,
      godPathProgress: useGameStore.getState().godPathProgress,
      runConfig: useGameStore.getState().runConfig,
      cardRunState: useGameStore.getState().cardRunState,
      prepTags: useGameStore.getState().prepTags,
    })).toBe(true)

    // With tag: option blocked
    useGameStore.setState({ prepTags: ['tiara_returned_once'] })
    expect(checkCondition(condition, {
      resources: useGameStore.getState().resources,
      deck: useGameStore.getState().deck,
      godPathProgress: useGameStore.getState().godPathProgress,
      runConfig: useGameStore.getState().runConfig,
      cardRunState: useGameStore.getState().cardRunState,
      prepTags: useGameStore.getState().prepTags,
    })).toBe(false)
  })
})

describe('static card pool guards (regression prevention)', () => {
  it('at least one card in CORE_CARDS + RARE_CARDS carries deferGodPathCard', async () => {
    const { CORE_CARDS, RARE_CARDS } = await import('../data')
    const all = [...CORE_CARDS, ...RARE_CARDS]
    const found = all.some(c =>
      c.options.some(o =>
        o.effects.some(e => e.type === 'deferGodPathCard')
      )
    )
    expect(found).toBe(true)
  })

  it('all four prep tags have at least one carrier card in the static pool', async () => {
    const data = await import('../data') as any
    const threats = await import('../data/cards/threats') as any
    const pool: any[] = [
      ...(data.CORE_CARDS ?? []),
      ...(data.COMMON_CARDS ?? []),
      ...(data.RARE_CARDS ?? []),
      ...Object.values(threats).flatMap((v: any) => Array.isArray(v) ? v : []),
    ]
    const expectedTags = ['studied', 'attended_seance', 'opium_pact', 'recited']
    for (const tag of expectedTags) {
      const found = pool.some((c: any) =>
        c.options?.some((o: any) =>
          o.effects?.some((e: any) => e.type === 'setPrepTag' && e.tag === tag)
        )
      )
      expect(found, `prep tag '${tag}' has no carrier card`).toBe(true)
    }
  })
})

// ─── NB-G1-03 prep-tag carrier hints ────────────────────────────────────
import { PREP_TAG_LABELS, PREP_TAG_CARRIERS } from '../data/godPaths/prepTagCarriers'

describe('PREP_TAG_CARRIERS data', () => {
  it('covers all four prep tags with at least one carrier each', () => {
    const tags = ['studied', 'attended_seance', 'opium_pact', 'recited'] as const
    for (const tag of tags) {
      expect(PREP_TAG_LABELS[tag]).toBeTruthy()
      expect(PREP_TAG_CARRIERS[tag].length).toBeGreaterThan(0)
    }
  })

  it('maps studied → the_old_book "Hire a translator"', () => {
    const carriers = PREP_TAG_CARRIERS.studied
    expect(carriers).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardId: 'the_old_book', optionLabel: 'Hire a translator' }),
    ]))
  })
})

describe('VisibleOption.prepRequirement', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('populates prepRequirement on locked prep-bonus options', () => {
    useGameStore.setState({
      runConfig: { godPath: 'yha_nthlei' } as any,
      prepTags: [],
      godPathProgress: 4,
    })
    const card = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_5')!
    const opts = useGameStore.getState().getVisibleOptions(card)
    const recitedOpt = opts.find(o => o.option.label === 'Speak the closing rite')!
    expect(recitedOpt.available).toBe(false)
    expect(recitedOpt.hidden).toBe(true)
    expect(recitedOpt.prepRequirement).toBeDefined()
    expect(recitedOpt.prepRequirement!.tag).toBe('recited')
    expect(recitedOpt.prepRequirement!.label).toBe('the rite spoken')
    expect(recitedOpt.prepRequirement!.carrierCardIds).toContain('what_was_already_read')
  })

  it('omits prepRequirement when the tag IS set (option becomes available)', () => {
    useGameStore.setState({
      runConfig: { godPath: 'yha_nthlei' } as any,
      prepTags: ['recited'],
      godPathProgress: 4,
    })
    const card = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_5')!
    const opts = useGameStore.getState().getVisibleOptions(card)
    const recitedOpt = opts.find(o => o.option.label === 'Speak the closing rite')!
    expect(recitedOpt.available).toBe(true)
    expect(recitedOpt.prepRequirement).toBeUndefined()
  })
})

describe('P20-N: disabledReason for not+cardOptionChosen', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('sets disabledReason "Can\'t take twice" when not+cardOptionChosen condition fails', () => {
    useGameStore.setState({
      resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 0, theChanged: 0 },
      cardRunState: { yha_nthlei_2: { drawCount: 2, chosenOptions: [1] } },
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
    })
    const store = useGameStore.getState()
    const card = YHA_NTHLEI_CHAIN.find((c: Card) => c.id === 'yha_nthlei_2')!
    const opts = store.getVisibleOptions(card)
    const returnOpt = opts.find(o => o.option.label === 'Send someone back with it')!
    expect(returnOpt.available).toBe(false)
    expect(returnOpt.disabledReason).toBe("Can't take twice")
  })

  it('disabledReason is undefined when not+cardOptionChosen passes', () => {
    useGameStore.setState({
      resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 0, theChanged: 0 },
      cardRunState: {},
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
    })
    const store = useGameStore.getState()
    const card = YHA_NTHLEI_CHAIN.find((c: Card) => c.id === 'yha_nthlei_2')!
    const opts = store.getVisibleOptions(card)
    const returnOpt = opts.find(o => o.option.label === 'Send someone back with it')!
    expect(returnOpt.available).toBe(true)
    expect(returnOpt.disabledReason).toBeUndefined()
  })
})

// ─── P16-39 affordability ─────────────────────────────────────────────────

const POOL = (over: Partial<Resources> = {}): Resources => ({
  gold: 3, followers: 3, influence: 3, dread: 0, relics: 0, theChanged: 0, ...over,
})

describe('affordabilityShortfall', () => {
  it('returns empty when no costs', () => {
    const fx: Effect[] = [{ type: 'resource', resource: 'gold', delta: 2 }]
    expect(affordabilityShortfall(fx, POOL())).toEqual({})
  })

  it('returns empty when affordable', () => {
    const fx: Effect[] = [{ type: 'resource', resource: 'gold', delta: -2 }]
    expect(affordabilityShortfall(fx, POOL({ gold: 3 }))).toEqual({})
  })

  it('reports shortfall when unaffordable', () => {
    const fx: Effect[] = [{ type: 'resource', resource: 'influence', delta: -2 }]
    expect(affordabilityShortfall(fx, POOL({ influence: 1 }))).toEqual({ influence: 1 })
  })

  it('sums duplicate-resource deltas', () => {
    const fx: Effect[] = [
      { type: 'resource', resource: 'gold', delta: -1 },
      { type: 'resource', resource: 'gold', delta: -1 },
    ]
    expect(affordabilityShortfall(fx, POOL({ gold: 1 }))).toEqual({ gold: 1 })
  })

  it('skips dread (over-paying reduction is a feature)', () => {
    const fx: Effect[] = [{ type: 'resource', resource: 'dread', delta: -5 }]
    expect(affordabilityShortfall(fx, POOL({ dread: 0 }))).toEqual({})
  })

  it('checks relics and theChanged as costs', () => {
    const fxRelic: Effect[] = [{ type: 'resource', resource: 'relics', delta: -1 }]
    expect(affordabilityShortfall(fxRelic, POOL({ relics: 0 }))).toEqual({ relics: 1 })
    const fxChanged: Effect[] = [{ type: 'resource', resource: 'theChanged', delta: -2 }]
    expect(affordabilityShortfall(fxChanged, POOL({ theChanged: 1 }))).toEqual({ theChanged: 1 })
  })

  it('does NOT recurse into randomOutcome nested costs', () => {
    const fx: Effect[] = [
      { type: 'randomOutcome', outcomes: [
        { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: -99 }] },
      ]},
    ]
    expect(affordabilityShortfall(fx, POOL({ gold: 0 }))).toEqual({})
  })

  it('ignores non-resource effect types', () => {
    const fx: Effect[] = [
      { type: 'insertCard', cardId: 'foo', position: 'random', minPos: 1, maxPos: 5 },
      { type: 'removeCard', cardId: 'bar' },
      { type: 'advanceGodPath' },
      { type: 'removeRandomThreat' },
      { type: 'resource', resource: 'gold', delta: -1 },
    ]
    expect(affordabilityShortfall(fx, POOL({ gold: 1 }))).toEqual({})
  })

  it('handles multi-resource shortfall in one option', () => {
    const fx: Effect[] = [
      { type: 'resource', resource: 'gold', delta: -2 },
      { type: 'resource', resource: 'followers', delta: -1 },
    ]
    expect(affordabilityShortfall(fx, POOL({ gold: 1, followers: 0 }))).toEqual({ gold: 1, followers: 1 })
  })
})

describe('getVisibleOptions affordability gate (P16-39)', () => {
  it('Oath of Dagon opt 3 "Refuse" unavailable at influence < 2', () => {
    const store = useGameStore.getState()
    // Reset to a controlled state with low influence
    useGameStore.setState({
      resources: { gold: 3, followers: 3, influence: 1, dread: 0, relics: 0, theChanged: 0 },
    })
    const dagonCard = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_4')!
    const opts = store.getVisibleOptions(dagonCard)
    const refuse = opts.find(o => o.option.label === 'Refuse')!
    expect(refuse.available).toBe(false)
    expect(refuse.affordabilityShortfall).toEqual({ influence: 1 })
  })

  it('Oath of Dagon opt 3 "Refuse" available at influence >= 2', () => {
    const store = useGameStore.getState()
    useGameStore.setState({
      resources: { gold: 3, followers: 3, influence: 2, dread: 0, relics: 0, theChanged: 0 },
    })
    const dagonCard = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_4')!
    const opts = store.getVisibleOptions(dagonCard)
    const refuse = opts.find(o => o.option.label === 'Refuse')!
    expect(refuse.available).toBe(true)
    expect(refuse.affordabilityShortfall).toBeUndefined()
  })

  it('option with explicit resourceMin condition AND affordability both gate', () => {
    // Oath of Dagon opt 1 "Accept" requires relics >= 1 AND costs relics -1
    const store = useGameStore.getState()
    useGameStore.setState({
      resources: { gold: 3, followers: 3, influence: 3, dread: 0, relics: 0, theChanged: 0 },
    })
    const dagonCard = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_4')!
    const opts = store.getVisibleOptions(dagonCard)
    const accept = opts.find(o => o.option.label === 'Accept the terms')!
    expect(accept.available).toBe(false)
  })

  it('option where condition passes but affordability fails isolates the affordability gate', () => {
    // relics=1 satisfies resourceMin condition (relics >= 1),
    // but followers=0 makes the -1 followers cost unaffordable.
    // If the affordability gate were silently dropped this test would fail.
    const store = useGameStore.getState()
    useGameStore.setState({
      resources: { gold: 3, followers: 0, influence: 3, dread: 0, relics: 1, theChanged: 0 },
    })
    const dagonCard = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_4')!
    const opts = store.getVisibleOptions(dagonCard)
    const accept = opts.find(o => o.option.label === 'Accept the terms')!
    expect(accept.available).toBe(false)
    expect(accept.affordabilityShortfall).toEqual({ followers: 1 })
  })
})

// ─── P18-10 redundant requirement pill suppression ──────────────────────
describe('reqRedundant (P18-10)', () => {
  it('hides requirement pill when cost satisfies the requirement', () => {
    // relic_market "Buy it": condition gold >= 3, costs gold -3
    const req = { resource: 'gold', value: 3 }
    const costs = [{ resource: 'gold', value: -3 }]
    expect(reqRedundant(req, costs)).toBe(true)
  })

  it('does not hide when cost is less than requirement', () => {
    const req = { resource: 'gold', value: 3 }
    const costs = [{ resource: 'gold', value: -2 }]
    expect(reqRedundant(req, costs)).toBe(false)
  })

  it('does not hide when cost is for a different resource', () => {
    const req = { resource: 'gold', value: 3 }
    const costs = [{ resource: 'followers', value: -3 }]
    expect(reqRedundant(req, costs)).toBe(false)
  })

  it('hides when combined costs for resource cover requirement', () => {
    const req = { resource: 'gold', value: 3 }
    const costs = [{ resource: 'gold', value: -2 }, { resource: 'gold', value: -2 }]
    expect(reqRedundant(req, costs)).toBe(true)
  })
})

// ─── P14-4 content pass coverage ────────────────────────────────────────
describe('P14-4 prep-bonus options', () => {
  beforeEach(() => {
    useGameStore.setState({
      resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 0, theChanged: 0 },
      prepTags: [],
      godPathProgress: 4, // active mid-chain
      runConfig: { godPath: 'yha_nthlei' } as any,
    })
  })

  it('yha_nthlei_3 "Recognise the sign" hidden without attended_seance tag', () => {
    const store = useGameStore.getState()
    const card = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_3')!
    const opts = store.getVisibleOptions(card)
    const bonus = opts.find(o => o.option.label === 'Recognise the sign')!
    expect(bonus.available).toBe(false)
    expect(bonus.hidden).toBe(true)
  })

  it('yha_nthlei_3 "Recognise the sign" available with attended_seance tag', () => {
    useGameStore.setState({ prepTags: ['attended_seance'] })
    const store = useGameStore.getState()
    const card = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_3')!
    const opts = store.getVisibleOptions(card)
    const bonus = opts.find(o => o.option.label === 'Recognise the sign')!
    expect(bonus.available).toBe(true)
  })

  it('P19-34: dread-pressure tax lags one reshuffle behind the doom tier (no week-4 convergence)', () => {
    // Weeks 1-4 (reshuffleCount <= 3): tax held at 0 even after doom hits tier 2 at rc3.
    expect(computeDreadPressure(0, 1)).toBe(0) // week 1
    expect(computeDreadPressure(2, 1)).toBe(0) // week 3
    expect(computeDreadPressure(3, 2)).toBe(0) // week 4 — doom tier 2, but tax still 0 (the fix)
    // Week 5 (rc4): tax activates at +1.
    expect(computeDreadPressure(4, 2)).toBe(1) // week 5
    // Week 6 (rc5): tax steps to +2 alongside doom tier 3 (intended climax convergence).
    expect(computeDreadPressure(5, 3)).toBe(2) // week 6
    // Post-week-6 / dread-10 bump path still scales.
    expect(computeDreadPressure(6, 4)).toBe(3)
  })

  it('yha_nthlei_3 "Watch him longer" stall: ungated, costs influence -1/dread +2, self-reinserts, does NOT advance', () => {
    const card = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_3')!
    const stall = card.options.find(o => o.label === 'Watch him longer')!
    expect(stall).toBeDefined()
    // ungated — always available as a no-softlock breathing-room choice
    expect(stall.condition).toBeUndefined()
    // must NOT advance the chain (that is the whole point of a stall)
    expect(stall.effects.some(e => e.type === 'advanceGodPath')).toBe(false)
    // self-reinsert so a god_path card (which would otherwise hit permDiscardPile) returns
    const insert = stall.effects.find(e => e.type === 'insertCard')
    expect(insert).toMatchObject({ cardId: 'yha_nthlei_3', position: 'random', minPos: 3, maxPos: 6 })
    // costs: influence -1 (Balance tweak) + dread +2
    expect(stall.effects).toEqual(
      expect.arrayContaining([
        { type: 'resource', resource: 'influence', delta: -1 },
        { type: 'resource', resource: 'dread', delta: 2 },
      ])
    )
  })

  it('nyarlathotep_4 "Dream the bargain" available with opium_pact tag', () => {
    useGameStore.setState({ runConfig: { godPath: 'nyarlathotep' } as any, prepTags: ['opium_pact'] })
    const store = useGameStore.getState()
    const card = GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_4')!
    const opts = store.getVisibleOptions(card)
    const bonus = opts.find(o => o.option.label === 'Dream the bargain')!
    expect(bonus.available).toBe(true)
  })

  it('yha_nthlei_5 "Speak the closing rite" grants +1 inf, +1 relic, +2 dread on advance', () => {
    useGameStore.setState({ prepTags: ['recited'] })
    const card = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_5')!
    const opt = card.options.find(o => o.label === 'Speak the closing rite')!
    const deltas = (opt.effects ?? []).filter((e: any) => e.type === 'resource')
      .reduce((acc: Record<string, number>, e: any) => {
        acc[e.resource] = (acc[e.resource] ?? 0) + e.delta
        return acc
      }, {})
    expect(deltas).toEqual({ dread: 2, influence: 1, relics: 1 })
  })

  it('shub_niggurath_5 "Recite the rite of unbecoming" available with recited tag', () => {
    useGameStore.setState({ runConfig: { godPath: 'shub_niggurath' } as any, prepTags: ['recited'] })
    const store = useGameStore.getState()
    const card = GOD_PATH_CHAINS.shub_niggurath.find(c => c.id === 'shub_niggurath_5')!
    const opts = store.getVisibleOptions(card)
    const bonus = opts.find(o => o.option.label === 'Recite the rite of unbecoming')!
    expect(bonus.available).toBe(true)
  })

  it('each god has exactly one hasPrepTag option on chain stages 2-5', () => {
    for (const god of ['yha_nthlei', 'nyarlathotep', 'shub_niggurath'] as const) {
      for (const stage of [2, 3, 4, 5]) {
        // nyarlathotep chainStage 4 (The Lecture) is a public event — no prep-tag shortcut by design
        if (god === 'nyarlathotep' && stage === 4) continue
        const card = GOD_PATH_CHAINS[god].find(c => c.chainStage === stage)!
        const prepOpts = card.options.filter(o => o.condition?.type === 'hasPrepTag')
        expect(prepOpts).toHaveLength(1)
      }
    }
  })

  it('each prep tag has at least one chain-card carrier across the three gods', () => {
    const expected = new Set(['studied', 'attended_seance', 'opium_pact', 'recited'])
    const seen = new Set<string>()
    for (const god of ['yha_nthlei', 'nyarlathotep', 'shub_niggurath'] as const) {
      for (const card of GOD_PATH_CHAINS[god]) {
        for (const opt of card.options) {
          if (opt.condition?.type === 'hasPrepTag') {
            seen.add(opt.condition.tag)
          }
        }
      }
    }
    for (const tag of expected) {
      expect(seen).toContain(tag)
    }
  })
})

describe('removeRandomThreat excludes prep carriers (S4)', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('does not remove what_was_already_read when other threats exist', () => {
    const carrier = THREAT_CARDS.find(c => c.id === 'what_was_already_read')!
    const generic = THREAT_CARDS.find(c => c.id !== 'what_was_already_read' && c.tier === 'threat' && !c.permanent)!
    const triggerCard = {
      id: 'test_rrt_trigger', title: 'Test RRT', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeRandomThreat' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [carrier, generic], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: triggerCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const allPiles = [
      ...state.deck.drawPile,
      ...state.deck.discardPile,
      ...state.deck.nextCycleQueue,
    ]
    // Carrier must still be present in some non-perm pile.
    expect(allPiles.some(c => c.id === 'what_was_already_read')).toBe(true)
    // Generic threat must have moved to permDiscardPile.
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
  })

  it('removes nothing when only a prep carrier exists in the deck', () => {
    const carrier = THREAT_CARDS.find(c => c.id === 'what_was_already_read')!
    const triggerCard = {
      id: 'test_rrt_trigger2', title: 'Test RRT2', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeRandomThreat' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [carrier], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: triggerCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    expect(state.deck.drawPile.some(c => c.id === 'what_was_already_read')).toBe(true)
    expect(state.deck.permDiscardPile.length).toBe(0)
  })
})

describe('removeRandomThreat excludes overflow/deficit cards (P17-10)', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('does not remove the_ledger_is_noticed when another threat exists', () => {
    const overflow = THREAT_CARDS.find(c => c.id === 'the_ledger_is_noticed')!
    const generic = THREAT_CARDS.find(c =>
      c.tier === 'threat'
      && !c.permanent
      && c.id !== 'the_ledger_is_noticed'
      && c.id !== 'theyre_not_listening'
      && c.id !== 'the_wrong_rooms'
      && c.id !== 'deficit_gold'
      && c.id !== 'deficit_followers'
      && c.id !== 'deficit_influence'
      && c.id !== 'what_was_already_read'
    )!
    const triggerCard = {
      id: 'test_rrt_overflow', title: 'Test', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeRandomThreat' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [overflow, generic], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: triggerCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    expect(allPiles.some(c => c.id === 'the_ledger_is_noticed')).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
  })

  it('does not remove theyre_not_listening when another threat exists', () => {
    const overflow = THREAT_CARDS.find(c => c.id === 'theyre_not_listening')!
    const generic = THREAT_CARDS.find(c =>
      c.tier === 'threat'
      && !c.permanent
      && c.id !== 'the_ledger_is_noticed'
      && c.id !== 'theyre_not_listening'
      && c.id !== 'the_wrong_rooms'
      && c.id !== 'deficit_gold'
      && c.id !== 'deficit_followers'
      && c.id !== 'deficit_influence'
      && c.id !== 'what_was_already_read'
    )!
    const triggerCard = {
      id: 'test_rrt_overflow2', title: 'Test', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeRandomThreat' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [overflow, generic], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: triggerCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    expect(allPiles.some(c => c.id === 'theyre_not_listening')).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
  })

  it('does not remove the_wrong_rooms when another threat exists', () => {
    const overflow = THREAT_CARDS.find(c => c.id === 'the_wrong_rooms')!
    const generic = THREAT_CARDS.find(c =>
      c.tier === 'threat'
      && !c.permanent
      && c.id !== 'the_ledger_is_noticed'
      && c.id !== 'theyre_not_listening'
      && c.id !== 'the_wrong_rooms'
      && c.id !== 'deficit_gold'
      && c.id !== 'deficit_followers'
      && c.id !== 'deficit_influence'
      && c.id !== 'what_was_already_read'
    )!
    const triggerCard = {
      id: 'test_rrt_overflow3', title: 'Test', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeRandomThreat' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [overflow, generic], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: triggerCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    expect(allPiles.some(c => c.id === 'the_wrong_rooms')).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
  })

  it('does not remove deficit_gold when another threat exists', () => {
    const overflow = THREAT_CARDS.find(c => c.id === 'deficit_gold')!
    const generic = THREAT_CARDS.find(c =>
      c.tier === 'threat'
      && !c.permanent
      && c.id !== 'the_ledger_is_noticed'
      && c.id !== 'theyre_not_listening'
      && c.id !== 'the_wrong_rooms'
      && c.id !== 'deficit_gold'
      && c.id !== 'deficit_followers'
      && c.id !== 'deficit_influence'
      && c.id !== 'what_was_already_read'
    )!
    const triggerCard = {
      id: 'test_rrt_overflow4', title: 'Test', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeRandomThreat' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [overflow, generic], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: triggerCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    expect(allPiles.some(c => c.id === 'deficit_gold')).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
  })

  it('does not remove deficit_followers when another threat exists', () => {
    const overflow = THREAT_CARDS.find(c => c.id === 'deficit_followers')!
    const generic = THREAT_CARDS.find(c =>
      c.tier === 'threat'
      && !c.permanent
      && c.id !== 'the_ledger_is_noticed'
      && c.id !== 'theyre_not_listening'
      && c.id !== 'the_wrong_rooms'
      && c.id !== 'deficit_gold'
      && c.id !== 'deficit_followers'
      && c.id !== 'deficit_influence'
      && c.id !== 'what_was_already_read'
    )!
    const triggerCard = {
      id: 'test_rrt_overflow5', title: 'Test', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeRandomThreat' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [overflow, generic], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: triggerCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    expect(allPiles.some(c => c.id === 'deficit_followers')).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
  })

  it('does not remove deficit_influence when another threat exists', () => {
    const overflow = THREAT_CARDS.find(c => c.id === 'deficit_influence')!
    const generic = THREAT_CARDS.find(c =>
      c.tier === 'threat'
      && !c.permanent
      && c.id !== 'the_ledger_is_noticed'
      && c.id !== 'theyre_not_listening'
      && c.id !== 'the_wrong_rooms'
      && c.id !== 'deficit_gold'
      && c.id !== 'deficit_followers'
      && c.id !== 'deficit_influence'
      && c.id !== 'what_was_already_read'
    )!
    const triggerCard = {
      id: 'test_rrt_overflow6', title: 'Test', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeRandomThreat' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [overflow, generic], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: triggerCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    expect(allPiles.some(c => c.id === 'deficit_influence')).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
  })

  it('removes nothing when only overflow/deficit cards exist', () => {
    const ids = ['the_ledger_is_noticed', 'theyre_not_listening', 'the_wrong_rooms', 'deficit_gold', 'deficit_followers', 'deficit_influence']
    const seeded = ids.map(id => THREAT_CARDS.find(c => c.id === id)!)
    const triggerCard = {
      id: 'test_rrt_none', title: 'Test', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeRandomThreat' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: seeded, discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: triggerCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    expect(state.deck.permDiscardPile.length).toBe(0)
  })
})

describe('Clarence rare — two-priced generic removeRandomThreat (P17-9)', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  function seedClarence(resources: Partial<Record<'gold' | 'followers' | 'influence' | 'dread' | 'relics' | 'theChanged', number>>) {
    const clarence = RARE_CARDS.find(c => c.id === 'clarence')!
    const generic = THREAT_CARDS.find(c =>
      c.tier === 'threat'
      && !c.permanent
      && !['the_ledger_is_noticed', 'theyre_not_listening', 'the_wrong_rooms', 'deficit_gold', 'deficit_followers', 'deficit_influence', 'what_was_already_read'].includes(c.id)
    )!
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 0, followers: 0, influence: 0, dread: 0, relics: 0, theChanged: 0, ...resources },
      deck: { drawPile: [generic], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: clarence,
      activityLog: [],
      activityBatchSealed: true,
    })
    return { clarence, generic }
  }

  // Helper: Clarence is "retired" when not present in any deck pile after option resolution.
  // `removeCard cardId=clarence` triggers the selfRemoved branch (gameStore.ts ~line 1084),
  // which skips pile placement entirely — Clarence ends up in no pile rather than permDiscardPile.
  function clarenceRetired(state: ReturnType<typeof useGameStore.getState>): boolean {
    const allPiles = [
      ...state.deck.drawPile,
      ...state.deck.discardPile,
      ...state.deck.permDiscardPile,
      ...state.deck.chainReserve,
      ...state.deck.nextCycleQueue,
    ]
    return !allPiles.some(c => c.id === 'clarence')
  }

  it('opt A spends 2 influence, removes a threat, retires Clarence', () => {
    const { generic } = seedClarence({ influence: 2 })
    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    expect(state.resources.influence).toBe(0)
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
    expect(clarenceRetired(state)).toBe(true)
  })

  it('opt B spends 2 gold, removes a threat, retires Clarence', () => {
    const { generic } = seedClarence({ gold: 2 })
    useGameStore.getState().resolveOption(1)
    const state = useGameStore.getState()
    expect(state.resources.gold).toBe(0)
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
    expect(clarenceRetired(state)).toBe(true)
  })

  it('opt B with zero eligible threats still pays cost and retires Clarence', () => {
    const clarence = RARE_CARDS.find(c => c.id === 'clarence')!
    const overflow = THREAT_CARDS.find(c => c.id === 'the_ledger_is_noticed')!
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 2, followers: 0, influence: 0, dread: 0, relics: 0, theChanged: 0 },
      deck: { drawPile: [overflow], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: clarence,
      activityLog: [],
      activityBatchSealed: true,
    })
    useGameStore.getState().resolveOption(1)
    const state = useGameStore.getState()
    expect(state.resources.gold).toBe(0)
    expect(state.deck.drawPile.some(c => c.id === 'the_ledger_is_noticed')).toBe(true)
    expect(clarenceRetired(state)).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === 'the_ledger_is_noticed')).toBe(false)
  })

  it('"Not yet" does not retire Clarence (unconditional no-op)', () => {
    seedClarence({})
    useGameStore.getState().resolveOption(2)
    const state = useGameStore.getState()
    // "Not yet" has no effects → no selfRemove → currentCard goes through normal
    // discard flow for a rare (rare is not single-use; lands in discardPile).
    expect(clarenceRetired(state)).toBe(false)
  })
})

describe('what_was_already_read dread gate (P17-15)', () => {
  const card = THREAT_CARDS.find(c => c.id === 'what_was_already_read')!

  it('shows both options always (none hidden), regardless of dread', () => {
    useGameStore.setState({ resources: { gold: 10, followers: 5, influence: 5, dread: 3, relics: 0, theChanged: 0 } })
    const opts = useGameStore.getState().getVisibleOptions(card)
    const visible = opts.filter(o => !o.hidden).map(o => o.option.label)
    expect(visible).toEqual(expect.arrayContaining(['Set it aside', 'The words arrange themselves']))
  })

  it('only "Set it aside" available at dread <= 5', () => {
    useGameStore.setState({ resources: { gold: 10, followers: 5, influence: 5, dread: 5, relics: 0, theChanged: 0 } })
    const opts = useGameStore.getState().getVisibleOptions(card)
    const available = opts.filter(o => o.available).map(o => o.option.label)
    expect(available).toContain('Set it aside')
    expect(available).not.toContain('The words arrange themselves')
  })

  it('only "The words arrange themselves" available at dread >= 6', () => {
    useGameStore.setState({ resources: { gold: 10, followers: 5, influence: 5, dread: 6, relics: 0, theChanged: 0 } })
    const opts = useGameStore.getState().getVisibleOptions(card)
    const available = opts.filter(o => o.available).map(o => o.option.label)
    expect(available).toContain('The words arrange themselves')
    expect(available).not.toContain('Set it aside')
  })
})

describe('runStats', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getState(), true)
    useGameStore.getState().resetGame()
  })

  it('initialises runStats to zeros and empty paths on resetGame', () => {
    useGameStore.setState({
      runStats: { prepLockedSkipped: 5, affordLockedSkipped: 3, closedPaths: ['x'] },
    })
    useGameStore.getState().resetGame()
    expect(useGameStore.getState().runStats).toEqual({
      prepLockedSkipped: 0,
      affordLockedSkipped: 0,
      closedPaths: [],
    })
  })

  it('increments prepLockedSkipped by the count of prep-locked sibling options on resolveOption', () => {
    // Build a card with 3 options: one chosen, one prep-locked, one open.
    const card: Card = {
      id: 'test_prep_card' as any,
      title: 'Test Prep Card',
      tier: 'common',
      copies: 1,
      prompt: '',
      options: [
        { id: 'a', label: 'Chosen',     effects: [] },
        { id: 'b', label: 'Prep locked', effects: [], condition: { type: 'hasPrepTag', tag: 'studied' as PrepTag } },
        { id: 'c', label: 'Also open',   effects: [] },
      ],
    } as unknown as Card

    useGameStore.setState({
      phase: 'playing',
      currentCard: card,
      prepTags: [],
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
    })

    useGameStore.getState().resolveOption(0)

    expect(useGameStore.getState().runStats.prepLockedSkipped).toBe(1)
    expect(useGameStore.getState().runStats.affordLockedSkipped).toBe(0)
  })

  it('increments affordLockedSkipped when a sibling option is unaffordable', () => {
    const card: Card = {
      id: 'test_afford_card' as any,
      title: 'Test Afford',
      tier: 'common',
      copies: 1,
      prompt: '',
      options: [
        { id: 'a', label: 'Cheap',     effects: [] },
        { id: 'b', label: 'Expensive', effects: [{ type: 'resource', resource: 'gold', delta: -99 }] },
      ],
    } as unknown as Card

    useGameStore.setState({
      phase: 'playing',
      currentCard: card,
      resources: { ...STARTING_RESOURCES, gold: 0 },
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
    })

    useGameStore.getState().resolveOption(0)

    expect(useGameStore.getState().runStats.affordLockedSkipped).toBe(1)
    expect(useGameStore.getState().runStats.prepLockedSkipped).toBe(0)
  })

  it('prep-lock takes precedence over afford-lock when both apply', () => {
    const card: Card = {
      id: 'test_double_card' as any,
      title: 'Test Double',
      tier: 'common',
      copies: 1,
      prompt: '',
      options: [
        { id: 'a', label: 'Chosen', effects: [] },
        { id: 'b', label: 'Both locks',
          effects: [{ type: 'resource', resource: 'gold', delta: -99 }],
          condition: { type: 'hasPrepTag', tag: 'studied' as PrepTag } },
      ],
    } as unknown as Card

    useGameStore.setState({
      phase: 'playing',
      currentCard: card,
      prepTags: [],
      resources: { ...STARTING_RESOURCES, gold: 0 },
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
    })

    useGameStore.getState().resolveOption(0)

    expect(useGameStore.getState().runStats.prepLockedSkipped).toBe(1)
    expect(useGameStore.getState().runStats.affordLockedSkipped).toBe(0)
  })

  it('pushes "the recited descent" to closedPaths exactly once when Y\'ha stage-5 passes without recited tag', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { ...({} as RunConfig), godPath: 'yha_nthlei', isTutorial: false } as RunConfig,
      godPathProgress: 5,
      prepTags: [],
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
      currentCard: {
        id: 'noop' as any, title: '', tier: 'common', copies: 1, prompt: '',
        options: [{ id: 'a', label: '', effects: [] }],
      } as unknown as Card,
    })

    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().runStats.closedPaths).toEqual(['the recited descent'])

    // Resolving again must not duplicate.
    useGameStore.setState({
      phase: 'playing',
      currentCard: {
        id: 'noop2' as any, title: '', tier: 'common', copies: 1, prompt: '',
        options: [{ id: 'a', label: '', effects: [] }],
      } as unknown as Card,
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().runStats.closedPaths).toEqual(['the recited descent'])
  })

  it('does not close the recited descent when the player holds the recited prep tag', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { ...({} as RunConfig), godPath: 'yha_nthlei', isTutorial: false } as RunConfig,
      godPathProgress: 5,
      prepTags: ['recited'],
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
      currentCard: {
        id: 'noop' as any, title: '', tier: 'common', copies: 1, prompt: '',
        options: [{ id: 'a', label: '', effects: [] }],
      } as unknown as Card,
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().runStats.closedPaths).toEqual([])
  })

  it('does not populate closedPaths on non-Y\'ha runs', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { ...({} as RunConfig), godPath: 'nyarlathotep', isTutorial: false } as RunConfig,
      godPathProgress: 5,
      prepTags: [],
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
      currentCard: {
        id: 'noop' as any, title: '', tier: 'common', copies: 1, prompt: '',
        options: [{ id: 'a', label: '', effects: [] }],
      } as unknown as Card,
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().runStats.closedPaths).toEqual([])
  })

  it('closes the recited descent when succumb() is called with qualifying Y\'ha state', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { ...({} as RunConfig), godPath: 'yha_nthlei', isTutorial: false } as RunConfig,
      godPathProgress: 5,
      prepTags: [],
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
      currentCard: {
        id: 'noop' as any, title: '', tier: 'common', copies: 1, prompt: '',
        options: [{ id: 'a', label: '', effects: [] }],
      } as unknown as Card,
    })
    useGameStore.getState().succumb()
    expect(useGameStore.getState().runStats.closedPaths).toEqual(['the recited descent'])
  })
})

// ─── Bug B regression: olgreth_2 must surface after tutorial reshuffle ────────
describe('tutorial olgreth chain completion', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('queues olgreth_2 so it surfaces after the tutorial reshuffle', () => {
    useGameStore.getState().startTutorial()

    // Draw and resolve cards until the draw pile is empty (includes any dynamically inserted cards).
    // Card olgreth_1 fires advanceGodPath → queues olgreth_2 into nextCycleQueue.
    let safety = 0
    while (safety++ < 20) {
      const s0 = useGameStore.getState()
      if (s0.deck.drawPile.length === 0 && s0.currentCard === null) break
      if (s0.currentCard === null) useGameStore.getState().drawNextCard()
      if (useGameStore.getState().currentCard !== null) useGameStore.getState().resolveOption(0)
    }
    // Draw pile is now empty; trigger reshuffle so nextCycleQueue becomes the new drawPile.
    useGameStore.getState().reshuffleOnly()

    const s = useGameStore.getState()
    const allUpcoming = [
      ...s.deck.drawPile.map(c => c.id),
      ...s.deck.nextCycleQueue.map(c => c.id),
    ]
    expect(allUpcoming).toContain('olgreth_2')
  })
})

describe('deficit/overflow batch deferral (P18-8 bug)', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('does not insert gold deficit card when batch ends with gold > 0 (deck state + activity log)', () => {
    // Reproduce: option with effects [-1 gold, +2 gold], starting gold = 1.
    // Intermediate state hits gold=0 but final state is gold=2.
    // Bug (P18-8): activity log shows spurious deficit insertion even though deck ends clean.
    const card = {
      id: 'test_batch_gold', title: 'Test', flavourText: '', tier: 'core' as const,
      options: [{
        label: 'Spend then gain',
        flavourText: '',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'gold', delta: 2 },
        ],
      }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 1, followers: 5, influence: 5, relics: 0, dread: 0, theChanged: 0 },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
    })

    useGameStore.getState().resolveOption(0)

    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    expect(allPiles.some(c => c.id === 'deficit_gold')).toBe(false)
    expect(state.resources.gold).toBe(2)
    // Activity log must not show a deficit insertion for a batch that healed back above 0
    const deficitInserted = state.activityLog.some(
      e => e.kind === 'insert' && 'card' in e && (e as any).card.id === 'deficit_gold'
    )
    expect(deficitInserted).toBe(false)
  })

  it('still inserts gold deficit card when batch ends with gold = 0', () => {
    // Starting gold = 2, effects -2 gold -> final gold = 0. Deficit MUST fire.
    const card = {
      id: 'test_batch_zero', title: 'Test', flavourText: '', tier: 'core' as const,
      options: [{
        label: 'Spend all',
        flavourText: '',
        effects: [{ type: 'resource', resource: 'gold', delta: -2 }],
      }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 2, followers: 5, influence: 5, relics: 0, dread: 0, theChanged: 0 },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: card,
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
    })

    useGameStore.getState().resolveOption(0)

    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    expect(allPiles.some(c => c.id === 'deficit_gold')).toBe(true)
    expect(state.resources.gold).toBe(0)
  })
})

describe('innsmouth_look_marked (P17-8 / P20-Q)', () => {
  it('has no onDraw, three options including lean-into-it and find-your-own', () => {
    const card = THREAT_CARDS.find(c => c.id === 'innsmouth_look_marked')!
    expect(card.onDraw).toBeUndefined()
    expect(card.options).toHaveLength(3)

    const lean = card.options.find(o => o.label === 'Lean into it')!
    expect(lean).toBeDefined()
    expect(lean.effects).toEqual([
      { type: 'resource', resource: 'gold', delta: 1 },
      { type: 'resource', resource: 'followers', delta: 1 },
      { type: 'resource', resource: 'dread', delta: 2 },
    ])

    const trade = card.options.find(o => o.label === 'Find your own')!
    expect(trade).toBeDefined()
    expect(trade.effects).toEqual([
      { type: 'resource', resource: 'influence', delta: -2 },
      { type: 'resource', resource: 'followers', delta: 2 },
    ])
    expect(trade.condition).toEqual({ type: 'resourceMin', resource: 'influence', min: 2 })
  })
})

describe('his_research_notes redesign (P17-18)', () => {
  it('has no passive or onDraw, two active options', () => {
    const card = TREAT_CARDS.find(c => c.id === 'his_research_notes')!
    expect(card.permanent).toBeFalsy() // P19-32: one-shot, no longer recycles
    expect(card.passive).toBeUndefined()
    expect(card.onDraw).toBeUndefined()
    expect(card.options).toHaveLength(2)

    const consult = card.options.find(o => o.label === 'Consult the notes')!
    expect(consult.effects).toEqual([
      { type: 'resource', resource: 'relics', delta: 1 },
      { type: 'resource', resource: 'dread', delta: 2 }, // P26-17: reduced from 3
    ])

    const lose = card.options.find(o => o.label === 'Lose yourself in the margins')!
    expect(lose.effects).toEqual([
      { type: 'resource', resource: 'dread', delta: -3 }, // P20-O: bumped from -2
    ])
  })
})

describe('yha_nthlei_2 opt2 one-shot return (P17-20 / P19-21)', () => {
  // P19-21: gate uses cardOptionChosen (not notHasPrepTag) so it persists
  // run-long regardless of prep-tag state. prepTags now survive reshuffles
  // (PREP-PERSIST 2026-07-04) — this test remains valid because the gate
  // mechanism is independent of prepTags.
  const tiara = YHA_NTHLEI_CHAIN.find((c: Card) => c.id === 'yha_nthlei_2')
  const returnOpt = tiara!.options.find((o: any) => o.label === 'Send someone back with it')

  it('opt2 gated on cardOptionChosen, not a reshuffle-scoped prep tag', () => {
    expect(returnOpt).toBeDefined()
    expect(returnOpt!.condition).toEqual({
      type: 'not',
      condition: { type: 'cardOptionChosen', cardId: 'yha_nthlei_2', optionIdx: 1 },
    })
    expect(returnOpt!.hideWhenUnavailable).toBeUndefined()
    // No longer sets a prep tag — chosenOptions records the pick automatically.
    expect(returnOpt!.effects).not.toContainEqual({ type: 'setPrepTag', tag: 'tiara_returned_once' })
  })

  it('opt1 is not hidden after first pick — shows greyed with disabledReason (P20-N)', () => {
    useGameStore.setState({
      resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 0, theChanged: 0 },
      cardRunState: { yha_nthlei_2: { drawCount: 2, chosenOptions: [1] } },
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
    })
    const store = useGameStore.getState()
    const card = YHA_NTHLEI_CHAIN.find((c: Card) => c.id === 'yha_nthlei_2')!
    const opts = store.getVisibleOptions(card)
    const returnOpt = opts.find(o => o.option.label === 'Send someone back with it')!
    expect(returnOpt.available).toBe(false)
    expect(returnOpt.hidden).toBe(false)
    expect(returnOpt.disabledReason).toBe("Can't take twice")
  })

  it('stays blocked run-long via cardOptionChosen gate (regression)', () => {
    const evalState = (chosenOptions: number[]) => checkCondition(returnOpt!.condition!, {
      resources: STARTING_RESOURCES,
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      godPathProgress: useGameStore.getState().godPathProgress,
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      cardRunState: { yha_nthlei_2: { drawCount: 2, chosenOptions } },
      prepTags: [], // empty — gate is cardOptionChosen, independent of prepTags
    })
    expect(evalState([])).toBe(true)   // not yet returned → available
    expect(evalState([1])).toBe(false) // returned once → blocked, even with prepTags wiped
  })
})

describe('usedCoreIds (P13-24)', () => {
  it('usedCoreIds initialises as an empty Set', async () => {
    const { useGameStore } = await import('./gameStore')
    expect(useGameStore.getState().usedCoreIds instanceof Set).toBe(true)
  })

  it('starting deck holds exactly 4 core (uncommon) cards', async () => {
    const { useGameStore } = await import('./gameStore')
    const s = useGameStore.getState()
    s.setRunConfig({ godPath: 'yha_nthlei' } as any)
    s.setBlessingSelection([])
    s.startRun()
    const deck = useGameStore.getState().deck
    const coreInDeck = [...deck.drawPile, ...deck.discardPile].filter(c => c.tier === 'core')
    expect(coreInDeck.length).toBe(4)
  })

  it('P22-P23-06: starting deck includes all common cards (13 total)', async () => {
    const { useGameStore } = await import('./gameStore')
    const s = useGameStore.getState()
    s.setRunConfig({ godPath: 'yha_nthlei' } as any)
    s.setBlessingSelection([])
    s.startRun()
    const deck = useGameStore.getState().deck
    const commonsInDeck = [...deck.drawPile, ...deck.discardPile].filter(c => c.tier === 'common')
    const commonIds = new Set(commonsInDeck.map(c => c.id))
    expect(commonIds.size).toBe(COMMON_CARDS.length)
    expect(commonsInDeck.length).toBe(COMMON_CARDS.length)
  })
})

describe('the_inheritance opt2 rebalance (P18-8 / P22-P23-31)', () => {
  it('opt2 quiet word: -1 inf, +2 gold, no dread (P22-P23-31: downgrade certainty premium +3→+2)', () => {
    const card = COMMON_CARDS.find(c => c.id === 'the_inheritance')!
    const quiet = card.options.find(o => o.label === 'Have a quiet word')!
    expect(quiet.effects).toEqual([
      { type: 'resource', resource: 'influence', delta: -1 },
      { type: 'resource', resource: 'gold', delta: 2 },
    ])
  })
})

describe('P19-45 — weight card cap', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('caps the_weight_of_it at 3 when dread jumps 10→15 with 0 existing', () => {
    const weightCard = THREAT_CARDS.find((c: Card) => c.id === 'the_weight_of_it')!

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 5, followers: 5, influence: 5, dread: 10, relics: 0, theChanged: 0 },
      deck: {
        drawPile: [],
        discardPile: [],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      currentCard: weightCard,
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
      blessings: { unlocked: [], selected: [] },
      cardRunState: {},
      usedRareIds: new Set(),
    } as any)

    const overflowCard = {
      id: 'test_dread_overflow',
      title: 'Test Dread Spike',
      tier: 'core' as const,
      options: [{
        label: 'Push dread',
        flavourText: '',
        effects: [{ type: 'resource', resource: 'dread', delta: 5 }],
      }],
    } as never

    useGameStore.setState({
      resources: { gold: 5, followers: 5, influence: 5, dread: 10, relics: 0, theChanged: 0 },
      deck: {
        drawPile: [overflowCard],
        discardPile: [],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      currentCard: overflowCard,
    })

    useGameStore.getState().resolveOption(0)

    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile]
    const weightCount = allPiles.filter(c => c.id === 'the_weight_of_it').length
    expect(weightCount).toBe(3)
    expect(state.resources.dread).toBe(15)
  })

  it('inserts 0 copies when 3 already exist in drawPile+discardPile', () => {
    const weightCard = THREAT_CARDS.find((c: Card) => c.id === 'the_weight_of_it')!

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 5, followers: 5, influence: 5, dread: 13, relics: 0, theChanged: 0 },
      deck: {
        drawPile: [weightCard, weightCard],
        discardPile: [weightCard],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
      blessings: { unlocked: [], selected: [] },
      cardRunState: {},
      usedRareIds: new Set(),
    } as any)

    const overflowCard = {
      id: 'test_dread_overflow2',
      title: 'Test Dread Spike',
      tier: 'core' as const,
      options: [{
        label: 'Push dread',
        flavourText: '',
        effects: [{ type: 'resource', resource: 'dread', delta: 5 }],
      }],
    } as never

    useGameStore.setState({
      deck: {
        drawPile: [overflowCard, weightCard, weightCard],
        discardPile: [weightCard],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      currentCard: overflowCard,
    })

    useGameStore.getState().resolveOption(0)

    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile]
    const weightCount = allPiles.filter(c => c.id === 'the_weight_of_it').length
    expect(weightCount).toBe(3)
    expect(state.resources.dread).toBe(18)
  })

  it('removes all copies when dread drops from 11 to ≤10', () => {
    const weightCard = THREAT_CARDS.find((c: Card) => c.id === 'the_weight_of_it')!

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 5, followers: 5, influence: 5, dread: 11, relics: 0, theChanged: 0 },
      deck: {
        drawPile: [weightCard, weightCard],
        discardPile: [],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
      blessings: { unlocked: [], selected: [] },
      cardRunState: {},
      usedRareIds: new Set(),
    } as any)

    const reduceCard = {
      id: 'test_dread_reduce',
      title: 'Test Dread Reduce',
      tier: 'core' as const,
      options: [{
        label: 'Reduce dread',
        flavourText: '',
        effects: [{ type: 'resource', resource: 'dread', delta: -2 }],
      }],
    } as never

    useGameStore.setState({
      currentCard: reduceCard,
    })

    useGameStore.getState().resolveOption(0)

    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile]
    const weightCount = allPiles.filter(c => c.id === 'the_weight_of_it').length
    expect(weightCount).toBe(0)
    expect(state.resources.dread).toBe(9)
  })

  it('gold overflow still inserts exactly 1 ledger on crossing 10 (regression)', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 8, followers: 5, influence: 5, dread: 0, relics: 0, theChanged: 0 },
      deck: {
        drawPile: [],
        discardPile: [],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
      blessings: { unlocked: [], selected: [] },
      cardRunState: {},
      usedRareIds: new Set(),
    } as any)

    const goldCard = {
      id: 'test_gold_overflow',
      title: 'Test Gold Gain',
      tier: 'core' as const,
      options: [{
        label: 'Gain gold',
        flavourText: '',
        effects: [{ type: 'resource', resource: 'gold', delta: 4 }],
      }],
    } as never

    useGameStore.setState({
      currentCard: goldCard,
    })

    useGameStore.getState().resolveOption(0)

    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    const ledgerCount = allPiles.filter(c => c.id === 'the_ledger_is_noticed').length
    expect(ledgerCount).toBe(1)
    expect(state.resources.gold).toBe(10)
  })

  it('followers overflow still inserts exactly 1 card on crossing 10 (regression)', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 5, followers: 8, influence: 5, dread: 0, relics: 0, theChanged: 0 },
      deck: {
        drawPile: [],
        discardPile: [],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
      blessings: { unlocked: [], selected: [] },
      cardRunState: {},
      usedRareIds: new Set(),
    } as any)

    const followersCard = {
      id: 'test_followers_overflow',
      title: 'Test Followers Gain',
      tier: 'core' as const,
      options: [{
        label: 'Gain followers',
        flavourText: '',
        effects: [{ type: 'resource', resource: 'followers', delta: 3 }],
      }],
    } as never

    useGameStore.setState({
      currentCard: followersCard,
    })

    useGameStore.getState().resolveOption(0)

    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    const overflowCount = allPiles.filter(c => c.id === 'theyre_not_listening').length
    expect(overflowCount).toBe(1)
    expect(state.resources.followers).toBe(10)
  })

  it('influence overflow still inserts exactly 1 card on crossing 10 (regression)', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 5, followers: 5, influence: 8, dread: 0, relics: 0, theChanged: 0 },
      deck: {
        drawPile: [],
        discardPile: [],
        permDiscardPile: [],
        chainReserve: [],
        nextCycleQueue: [],
      },
      activityLog: [],
      activityBatchSealed: true,
      prepTags: [],
      blessings: { unlocked: [], selected: [] },
      cardRunState: {},
      usedRareIds: new Set(),
    } as any)

    const influenceCard = {
      id: 'test_influence_overflow',
      title: 'Test Influence Gain',
      tier: 'core' as const,
      options: [{
        label: 'Gain influence',
        flavourText: '',
        effects: [{ type: 'resource', resource: 'influence', delta: 3 }],
      }],
    } as never

    useGameStore.setState({
      currentCard: influenceCard,
    })

    useGameStore.getState().resolveOption(0)

    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    const overflowCount = allPiles.filter(c => c.id === 'the_wrong_rooms').length
    expect(overflowCount).toBe(1)
    expect(state.resources.influence).toBe(10)
  })
})

// ─── P20-A: whisper option must not persist across draws ───────────────────────
describe('P20-A whisper deduplication', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('strips isWhisper options from the card before discarding it', () => {
    // Simulate the bug state: card already carrying an injected whisper option
    // (as if it was drawn once, whisper appended, then discarded without stripping)
    const baseOpt = {
      label: 'Normal opt', flavourText: '',
      effects: [{ type: 'resource' as const, resource: 'gold', delta: 1 }],
    }
    const whisperOpt = {
      label: 'Whisper opt', flavourText: 'A voice.', effects: [], isWhisper: true as const,
    }
    const cardWithPersistedWhisper = {
      id: 'congregation_meets', name: 'The Congregation Meets', tier: 'common' as const,
      options: [baseOpt, whisperOpt], // whisper already embedded — this is the bug state
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'nyarlathotep', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithPersistedWhisper,
      resources: { ...STARTING_RESOURCES },
      activeWhispers: ['congregation_meets'],
      activityLog: [],
      activityBatchSealed: true,
    } as any)

    useGameStore.getState().resolveOption(0) // pick normal opt

    const { deck } = useGameStore.getState()
    const discarded = deck.discardPile.find(c => c.id === 'congregation_meets')
    expect(discarded, 'card must land in discard pile').toBeDefined()
    // Whisper option must be stripped — not persisted across reshuffle
    expect(discarded!.options.some(o => (o as any).isWhisper)).toBe(false)
  })

  it('P25-38: restores all original options from base definition (not just filters whisper)', () => {
    // P25-38 fix: strip code must restore from base definition, not filter(!isWhisper).
    // Filtering was re-indexing the array, causing each reshuffle to eat one more option.
    // Use congregation_meets (3 base opts). Inject it as currentCard with whisper at slot 0.
    const base = COMMON_CARDS.find(c => c.id === 'congregation_meets')!
    const whisperOpt = { label: 'Whisper', flavourText: '', effects: [], isWhisper: true as const, replacesSlot: 0 as const }
    const cardWithWhisperReplaced = { ...base, options: [whisperOpt, base.options[1], base.options[2]] }

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'nyarlathotep', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: cardWithWhisperReplaced as never,
      resources: { ...STARTING_RESOURCES },
      activeWhispers: ['congregation_meets'],
      activityLog: [],
      activityBatchSealed: true,
    } as any)

    useGameStore.getState().resolveOption(1) // pick non-whisper opt

    const { deck } = useGameStore.getState()
    const discarded = deck.discardPile.find(c => c.id === 'congregation_meets')
    expect(discarded).toBeDefined()
    // Must have all 3 base options — no shrinkage
    expect(discarded!.options).toHaveLength(base.options.length)
    expect(discarded!.options.some(o => (o as any).isWhisper)).toBe(false)
    // Slot 0 restored to original base option (not whisper, not shifted)
    expect(discarded!.options[0].label).toBe(base.options[0].label)
  })
})

// ─── P20-A: replace-slot draw injection ────────────────────────────────────────
describe('P20-A replace-slot draw injection', () => {
  beforeEach(() => {
    const s = useGameStore.getState()
    s.setRunConfig({ godPath: 'nyarlathotep', runLength: 'short' })
    s.setBlessingSelection([])
    s.startRun()
  })

  it('replacesSlot: 0 — whisper occupies slot 0, option count unchanged', () => {
    const card = COMMON_CARDS.find(c => c.id === 'congregation_meets')!
    useGameStore.setState(state => ({
      deck: { ...state.deck, drawPile: [card, ...state.deck.drawPile] },
      activeWhispers: ['congregation_meets'],
    }))
    useGameStore.getState().drawNextCard()
    const current = useGameStore.getState().currentCard!
    // Whisper replaces slot 0 — total length stays the same
    expect(current.options.length).toBe(card.options.length)
    expect(current.options[0].isWhisper).toBe(true)
    expect(current.options[0].replacesSlot).toBe(0)
    // Slot 1 onwards are original options
    expect(current.options[1]).toEqual(card.options[1])
  })

  it('replacesSlot: 2 — whisper occupies slot 2, slots 0 and 1 unchanged', () => {
    const card = COMMON_CARDS.find(c => c.id === 'the_harbormaster')!
    useGameStore.setState(state => ({
      deck: { ...state.deck, drawPile: [card, ...state.deck.drawPile] },
      activeWhispers: ['the_harbormaster'],
    }))
    useGameStore.getState().drawNextCard()
    const current = useGameStore.getState().currentCard!
    expect(current.options.length).toBe(card.options.length)
    expect(current.options[2].isWhisper).toBe(true)
    expect(current.options[2].replacesSlot).toBe(2)
    expect(current.options[0]).toEqual(card.options[0])
    expect(current.options[1]).toEqual(card.options[1])
  })

  it('generic whisper (no replacesSlot) appends to end', () => {
    // 'the_census_agent' is not in WHISPER_OPTIONS so getWhisperOption
    // falls back to GENERIC_WHISPER_OPTION which has no replacesSlot
    const card = CORE_CARDS.find(c => c.id === 'the_census_agent')!
    const baseLength = card.options.length
    useGameStore.setState(state => ({
      deck: { ...state.deck, drawPile: [card, ...state.deck.drawPile] },
      activeWhispers: ['the_census_agent'],
    }))
    useGameStore.getState().drawNextCard()
    const current = useGameStore.getState().currentCard!
    // Append path: length grows by 1
    expect(current.options.length).toBe(baseLength + 1)
    expect(current.options[baseLength].isWhisper).toBe(true)
    expect(current.options[baseLength].replacesSlot).toBeUndefined()
  })

  // P25-46: congregation_meets with active whisper + 1 follower — all 3 options visible
  it('P25-46: congregation_meets whisper + 1 follower → 3 non-hidden options, sermon available', () => {
    const card = COMMON_CARDS.find(c => c.id === 'congregation_meets')!
    useGameStore.setState(state => ({
      deck: { ...state.deck, drawPile: [card, ...state.deck.drawPile] },
      activeWhispers: ['congregation_meets'],
      resources: { ...STARTING_RESOURCES, followers: 1 },
    }))
    useGameStore.getState().drawNextCard()
    const state = useGameStore.getState()
    const current = state.currentCard!
    // Whisper replaces slot 0, total option count unchanged
    expect(current.options.length).toBe(card.options.length)
    // getVisibleOptions must return all 3 — none hidden, all non-prep-gated-missing
    const opts = state.getVisibleOptions(current)
    expect(opts.length).toBe(card.options.length)
    expect(opts.every(o => !o.hidden)).toBe(true)
    // Whisper at slot 0
    expect(opts[0].option.isWhisper).toBe(true)
    // Sermon (slot 1): condition followers >= 1, player has 1 → available (P25-03 fix)
    expect(opts[1].available).toBe(true)
    // Dismiss early (slot 2): followers -1 with 1 → 0, not below 0 → affordable
    expect(opts[2].available).toBe(true)
  })
})

// ─── P25-38: whisper slot replacement survives save/load round-trip ────────────
describe('P25-38 whisper slot replacement on loadRun', () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v },
      removeItem: (k: string) => { delete store[k] },
      clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    })
    useGameStore.getState().resetGame()
    localStorage.clear()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('replacesSlot whisper reconstructed at correct slot after reload (not appended)', () => {
    // the_inheritance whisper: replacesSlot 0
    const base = COMMON_CARDS.find(c => c.id === 'the_inheritance')!
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'nyarlathotep', runLength: 'short' },
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: base,
      resources: { ...STARTING_RESOURCES, gold: 3 },
      activeWhispers: ['the_inheritance'],
      activityLog: [],
      activityBatchSealed: true,
    } as any)

    saveRun(useGameStore.getState())
    useGameStore.setState({ currentCard: null })
    useGameStore.getState().loadRun()

    const { currentCard } = useGameStore.getState()
    expect(currentCard).not.toBeNull()
    // Option count must stay the same (replace, not append)
    expect(currentCard!.options.length).toBe(base.options.length)
    // Slot 0 must be the whisper
    expect(currentCard!.options[0].isWhisper).toBe(true)
    expect(currentCard!.options[0].replacesSlot).toBe(0)
    // Slot 1 & 2 are the original non-whisper options
    expect((currentCard!.options[1] as any).isWhisper).toBeFalsy()
    expect((currentCard!.options[2] as any).isWhisper).toBeFalsy()
  })
})

describe('changed_follower deck cap', () => {
  const makeChangedFollower = (): Card => ({
    id: 'changed_follower',
    title: 'The Changed Follower',
    tier: 'god_path',
    options: [],
    accumulates: true,
  } as unknown as Card)

  it('blocks insertion when 6 copies already exist in draw+discard+queue', () => {
    const cf = makeChangedFollower()
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
      currentCard: {
        id: 'shub_niggurath_3',
        title: 'The Unknown Goat',
        tier: 'god_path',
        options: [{
          label: 'Claim it formally',
          flavourText: 'test',
          effects: [{ type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 }],
        }],
      } as unknown as Card,
      deck: {
        drawPile: [cf, cf, cf, cf],
        discardPile: [cf, cf],
        permDiscardPile: [],
        nextCycleQueue: [],
        chainReserve: [],
      },
      resources: { ...STARTING_RESOURCES },
      godPathProgress: 2,
      prepTags: [],
      cardRunState: {},
      activityLog: [],
      activityBatchSealed: true,
    } as any)

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const cfCount = [
      ...state.deck.drawPile,
      ...state.deck.discardPile,
      ...state.deck.nextCycleQueue,
    ].filter(c => c.id === 'changed_follower').length
    expect(cfCount).toBe(6)  // cap enforced — no 7th copy
  })

  it('allows insertion when fewer than 6 copies exist', () => {
    const cf = makeChangedFollower()
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
      currentCard: {
        id: 'shub_niggurath_3',
        title: 'The Unknown Goat',
        tier: 'god_path',
        options: [{
          label: 'Claim it formally',
          flavourText: 'test',
          effects: [{ type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 }],
        }],
      } as unknown as Card,
      deck: {
        drawPile: [cf, cf, cf],
        discardPile: [cf, cf],
        permDiscardPile: [],
        nextCycleQueue: [],
        chainReserve: [],
      },
      resources: { ...STARTING_RESOURCES },
      godPathProgress: 2,
      prepTags: [],
      cardRunState: {},
      activityLog: [],
      activityBatchSealed: true,
    } as any)

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const cfCount = [
      ...state.deck.drawPile,
      ...state.deck.discardPile,
      ...state.deck.nextCycleQueue,
    ].filter(c => c.id === 'changed_follower').length
    expect(cfCount).toBe(6)  // 5 existing + 1 inserted
  })
})

describe('changed_follower sacrifice escalation', () => {
  const makeCF = (): Card => ({
    id: 'changed_follower',
    title: 'The Changed Follower',
    tier: 'god_path',
    godPath: 'shub_niggurath',
    accumulates: true,
    options: [],
  } as unknown as Card)

  function setupSacrifice(theChanged: number) {
    const cf = SPECIAL_CARDS.find((c: Card) => c.id === 'changed_follower') as Card
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
      currentCard: cf,
      deck: {
        drawPile: [],
        discardPile: [],
        permDiscardPile: [],
        nextCycleQueue: [],
        chainReserve: [],
      },
      resources: { gold: 3, followers: 3, influence: 3, dread: 0, relics: 1, theChanged },
      godPathProgress: 2,
      prepTags: [],
      cardRunState: {},
      activityLog: [],
      activityBatchSealed: true,
    } as any)
  }

  it('1st sacrifice (theChanged=0): costs dread+1 only', () => {
    setupSacrifice(0)
    useGameStore.getState().resolveOption(0)
    const after = useGameStore.getState()
    expect(after.resources.theChanged).toBe(1)
    expect(after.resources.dread).toBe(1)
    expect(after.resources.followers).toBe(3) // unchanged
    expect(after.resources.influence).toBe(3) // unchanged
  })

  it('2nd sacrifice (theChanged=1): costs dread+1, fol-1', () => {
    setupSacrifice(1)
    useGameStore.getState().resolveOption(1)
    const after = useGameStore.getState()
    expect(after.resources.theChanged).toBe(2)
    expect(after.resources.dread).toBe(1)
    expect(after.resources.followers).toBe(2)
    expect(after.resources.influence).toBe(3)
  })

  it('3rd sacrifice (theChanged=2): costs dread+2, fol-1', () => {
    setupSacrifice(2)
    useGameStore.getState().resolveOption(2)
    const after = useGameStore.getState()
    expect(after.resources.theChanged).toBe(3)
    expect(after.resources.dread).toBe(2)
    expect(after.resources.followers).toBe(2)
    expect(after.resources.influence).toBe(3)
  })

  it('4th+ sacrifice (theChanged=3): costs dread+2, fol-1, inf-1', () => {
    setupSacrifice(3)
    useGameStore.getState().resolveOption(3)
    const after = useGameStore.getState()
    expect(after.resources.theChanged).toBe(4)
    expect(after.resources.dread).toBe(2)
    expect(after.resources.followers).toBe(2)
    expect(after.resources.influence).toBe(2)
  })

  it('sacrifice removes card from deck (does not reinsert)', () => {
    setupSacrifice(0)
    // Seed one CF in draw pile first
    const cf = makeCF()
    useGameStore.setState({ deck: { drawPile: [cf], discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [] } } as any)
    useGameStore.getState().resolveOption(0)
    const after = useGameStore.getState()
    const cfCount = [...after.deck.drawPile, ...after.deck.discardPile, ...after.deck.nextCycleQueue]
      .filter(c => c.id === 'changed_follower').length
    expect(cfCount).toBe(1) // the seeded one, not the current card
  })

  it('keep returns card to deck', () => {
    setupSacrifice(0)
    useGameStore.getState().resolveOption(4) // index 4 = Keep
    const after = useGameStore.getState()
    expect(after.resources.theChanged).toBe(0) // unchanged
    const cfCount = [...after.deck.drawPile, ...after.deck.discardPile, ...after.deck.nextCycleQueue]
      .filter(c => c.id === 'changed_follower').length
    expect(cfCount).toBe(1) // reinserted
  })
})

describe('doom card 4 — god-agnostic "Embrace the change" (P22-P23-68)', () => {
  // P22-P23-68: Collapsed Shub/non-Shub split to single unconditional option.
  it('"Embrace the change" has no god-path condition and no changed_follower insert', () => {
    const doom4 = UNRAVELLING_CARDS.find((c: any) => c.id === 'unravelling_4')!
    const embraceOpt = doom4.options.find((o: any) => o.label === 'Embrace the change')!
    expect(embraceOpt).toBeDefined()
    // No condition — available on all god paths
    expect(embraceOpt.condition).toBeUndefined()
    // No changed_follower insert — Shub runs get it via mutations and god path cards
    const insertEffect = embraceOpt.effects.find((e: any) => e.type === 'insertCard' && e.cardId === 'changed_follower')
    expect(insertEffect).toBeUndefined()
    // Effects: -fol1, +dread2
    const folEffect = embraceOpt.effects.find((e: any) => e.type === 'resource' && e.resource === 'followers')
    expect(folEffect?.delta).toBe(-1)
    const dreadEffect = embraceOpt.effects.find((e: any) => e.type === 'resource' && e.resource === 'dread')
    expect(dreadEffect?.delta).toBe(2)
  })
})

describe('seedMutations activity log (P20-B)', () => {
  it('pushes mutationSeed entry when mutations are applied', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
      currentCard: {
        id: 'shub_niggurath_3',
        title: 'The Unknown Goat',
        tier: 'god_path',
        options: [{
          label: 'Claim it formally',
          flavourText: 'test',
          effects: [{ type: 'seedMutations', count: 2 }],
        }],
      } as unknown as Card,
      deck: {
        drawPile: [{ id: 'woodcutters_report', title: "Woodcutter's Report", tier: 'common', options: [] } as unknown as Card],
        discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [],
      },
      resources: { ...STARTING_RESOURCES },
      godPathProgress: 2,
      prepTags: [],
      cardRunState: {},
      activityLog: [],
      activityBatchSealed: true,
    } as any)

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const mutEntry = state.activityLog.find(e => e.kind === 'mutationSeed')
    expect(mutEntry).toBeDefined()
    if (mutEntry?.kind === 'mutationSeed') {
      expect(mutEntry.cardTitles).toHaveLength(1)
      expect(mutEntry.cardTitles[0]).toBe("Woodcutter's Report")
    }
  })
})

describe('shub_niggurath_6 victory conditions (P25-51)', () => {
  const shub6 = GOD_PATH_CHAINS['shub_niggurath'].find(c => c.id === 'shub_niggurath_6')!

  it('full victory: opt0 condition has theChanged>=3 AND relics>=1', () => {
    const cond = shub6.options[0].condition as any
    expect(cond.type).toBe('and')
    const theChangedCond = cond.conditions.find((c: any) => c.resource === 'theChanged')
    const relicsCond = cond.conditions.find((c: any) => c.resource === 'relics')
    expect(theChangedCond?.min).toBe(3)
    expect(relicsCond?.min).toBe(1)
  })

  it('full victory: opt0 condition does NOT have a standalone relics>=2 (old spec gone)', () => {
    const cond = shub6.options[0].condition as any
    const relicsCond = cond.conditions.find((c: any) => c.resource === 'relics')
    expect(relicsCond?.min).toBe(1)
    // old spec had relics>=2 on opt1; new full victory requires only relics>=1
  })

  it('partial victory: opt1 condition has theChanged>=2, followers>=3, relics>=1', () => {
    const cond = shub6.options[1].condition as any
    expect(cond.type).toBe('and')
    const theChangedCond = cond.conditions.find((c: any) => c.resource === 'theChanged')
    const followersCond = cond.conditions.find((c: any) => c.resource === 'followers')
    const relicsCond = cond.conditions.find((c: any) => c.resource === 'relics')
    expect(theChangedCond?.min).toBe(2)
    expect(followersCond?.min).toBe(3)
    expect(relicsCond?.min).toBe(1)
  })

  it('endRun opt "The offering is insufficient" has succumbOption: true', () => {
    const endRunOpt = shub6.options.find(o => o.label === 'The offering is insufficient')!
    expect(endRunOpt.succumbOption).toBe(true)
  })
})

describe('the_crawling_network blessing — P25-21 random resource on 5th draw', () => {
  const makeCNState = (turnCount: number) => ({
    phase: 'playing' as const,
    runConfig: { godPath: 'nyarlathotep' as const, runLength: 'short' as const },
    turnCount,
    currentCard: null,
    resources: { gold: 3, followers: 3, influence: 3, dread: 3, relics: 3, theChanged: 0 },
    deck: {
      drawPile: [{ id: 'congregation_meets', title: 'Congregation Meets', tier: 'core' as const, options: [] } as never],
      discardPile: [],
      permDiscardPile: [],
      chainReserve: [],
      nextCycleQueue: [],
    },
    blessings: { unlocked: [], selected: ['the_crawling_network'] },
    activityLog: [],
    activityBatchSealed: true,
    cardRunState: {},
    pendingUnravelling: false,
    pendingGameOver: null,
    usedRareIds: new Set(),
  })

  it('draws on turn 5 (turnCount 4 before draw): one of [followers, influence, gold, relics] increases by 1', () => {
    useGameStore.setState(makeCNState(4) as any)
    const before = { ...useGameStore.getState().resources }
    useGameStore.getState().drawNextCard()
    const after = useGameStore.getState().resources
    const pool = ['followers', 'influence', 'gold', 'relics'] as const
    const increased = pool.filter(r => after[r] === before[r] + 1)
    const unchanged = pool.filter(r => after[r] === before[r])
    expect(increased).toHaveLength(1)
    expect(unchanged).toHaveLength(3)
  })

  it('draws on turn 5: dread increases by 1', () => {
    useGameStore.setState(makeCNState(4) as any)
    const before = useGameStore.getState().resources.dread
    useGameStore.getState().drawNextCard()
    const after = useGameStore.getState().resources.dread
    expect(after).toBe(before + 1)
  })

  it('draws on turn 4 (turnCount 3 before draw): no crawling_network bonus fires', () => {
    useGameStore.setState(makeCNState(3) as any)
    const before = { ...useGameStore.getState().resources }
    useGameStore.getState().drawNextCard()
    const after = useGameStore.getState().resources
    const pool = ['followers', 'influence', 'gold', 'relics', 'dread'] as const
    // No resource should have changed due to the blessing (card itself has no onDraw)
    const changed = pool.filter(r => after[r] !== before[r])
    expect(changed).toHaveLength(0)
  })
})

describe('P25-22: whisperCounselPenalty stamps isWhisperAffected on drawn card', () => {
  const regularCard: Card = {
    id: 'woodcutters_report',
    title: "Woodcutter's Report",
    tier: 'common',
    options: [{ id: 'o', label: 'OK', effects: [] }],
  } as unknown as Card

  const godPathCard: Card = {
    id: 'yha_nthlei_1',
    title: 'The Dreaming City',
    tier: 'god_path',
    options: [{ id: 'o', label: 'OK', effects: [] }],
  } as unknown as Card

  const baseState = {
    phase: 'playing' as const,
    runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
    resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 0 },
    prepTags: [],
    cardRunState: {},
    activityLog: [],
    activityBatchSealed: true,
    blessings: { unlocked: [], selected: [] },
    usedRareIds: new Set(),
    activeWhispers: [],
  }

  it('stamps isWhisperAffected on a regular card when penalty is active', () => {
    useGameStore.setState({
      ...baseState,
      whisperCounselPenaltyActive: true,
      currentCard: null,
      deck: {
        drawPile: [regularCard],
        discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [],
      },
    } as any)

    useGameStore.getState().drawNextCard()
    const { currentCard } = useGameStore.getState()
    expect(currentCard?.isWhisperAffected).toBe(true)
  })

  it('does NOT stamp isWhisperAffected on a god_path card when penalty is active', () => {
    useGameStore.setState({
      ...baseState,
      whisperCounselPenaltyActive: true,
      currentCard: null,
      deck: {
        drawPile: [godPathCard],
        discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [],
      },
    } as any)

    useGameStore.getState().drawNextCard()
    const { currentCard } = useGameStore.getState()
    expect(currentCard?.isWhisperAffected).toBeUndefined()
  })

  it('does NOT stamp isWhisperAffected when penalty is not active', () => {
    useGameStore.setState({
      ...baseState,
      whisperCounselPenaltyActive: false,
      currentCard: null,
      deck: {
        drawPile: [regularCard],
        discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [],
      },
    } as any)

    useGameStore.getState().drawNextCard()
    const { currentCard } = useGameStore.getState()
    expect(currentCard?.isWhisperAffected).toBeUndefined()
  })
})
