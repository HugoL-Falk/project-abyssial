import { describe, it, expect, vi } from 'vitest'
import {
  renderInsertCardGrouped,
  renderInsertCardSingle,
  renderRandomThreatTag,
  shouldHideRemoveCardSingleTag,
} from './StructuralTag'
import { getLiveRandomThreatTargets } from '../../../state/gameStore'

vi.mock('../../../state/gameStore', () => ({
  getLiveRandomThreatTargets: vi.fn(),
}))

// ─── P20-I: grouped insert chip opens a browse carousel (s114) ────────────────
//
// P18-13 made renderInsertCardGrouped tooltip-only, flagging the same re-wire
// watchpoint that later tripped renderInsertCardSingle (see below). Playtest 20
// asked for the grouped chip to open a multi-card carousel preview instead of a
// tooltip, mirroring the single-card chip's clickable-button pattern.
//
// These tests verify that:
// 1. The function returns a clickable/disabled button (not a HintTooltip)
// 2. Disabled state reflects whether onPreviewCards + cardIds are usable
// 3. Clicking resolves cardIds and invokes onPreviewCards with Card objects

vi.mock('../../../data', () => ({
  getCardById: (id: string) => (id === 'missing' ? undefined : { id, tier: 'threat' }),
}))

describe('renderInsertCardGrouped — carousel button (P20-I)', () => {
  it('returns a clickable button when onPreviewCards + cardIds are provided', () => {
    // P20-H: the clickable branch is unconditionally enabled — no disabled prop.
    const el = renderInsertCardGrouped('key', 2, ['card-a', 'card-b'], vi.fn())
    expect(el.type).toBe('button')
    expect(el.props.disabled).toBeFalsy()
  })

  it('renders a hint tooltip (not a clickable button) when no onPreviewCards is provided', () => {
    // P20-H: disabled <button> nested inside HintTooltip's trigger <button>
    // would swallow the click, so the non-clickable branch is a plain span
    // wrapped in HintTooltip instead.
    const el = renderInsertCardGrouped('key', 2, ['card-a', 'card-b'], undefined)
    expect(el.type.name).toBe('HintTooltip')
  })

  it('renders a hint tooltip when cardIds is empty', () => {
    const el = renderInsertCardGrouped('key', 0, [], vi.fn())
    expect(el.type.name).toBe('HintTooltip')
  })

  it('calls onPreviewCards with resolved Card objects when clicked', () => {
    const onPreviewCards = vi.fn()
    const el = renderInsertCardGrouped('key', 2, ['card-a', 'card-b'], onPreviewCards)
    el.props.onClick({ stopPropagation: () => {} })
    expect(onPreviewCards).toHaveBeenCalledWith([{ id: 'card-a', tier: 'threat' }, { id: 'card-b', tier: 'threat' }])
  })
})

// ─── P20-I: + card chip re-wired to the preview modal (s110) ─────────────────
//
// The P18-13 decision (2026-06-24) made the reinsert chip tooltip-only and
// explicitly flagged a watchpoint: "re-wire tap → onPreviewCard if missed at
// playtest." Playtest 20 hit that watchpoint — the asymmetry between a
// clickable − card (preview modal) and a tooltip-only + card read as a bug.
// renderInsertCardSingle now mirrors renderRemoveCardSingle: a clickable
// button that opens the single-card preview modal via onPreviewCard.
describe('renderInsertCardSingle — preview button (P20-I)', () => {
  it('returns a clickable button element when onPreviewCard is provided', () => {
    const el = renderInsertCardSingle(0, 'some-card', vi.fn())
    expect(el.type).toBe('button')
    expect(el.props.disabled).toBeFalsy()
  })

  it('calls onPreviewCard with the cardId when clicked', () => {
    const onPreviewCard = vi.fn()
    const el = renderInsertCardSingle(0, 'some-card', onPreviewCard)
    el.props.onClick({ stopPropagation: () => {} })
    expect(onPreviewCard).toHaveBeenCalledWith('some-card')
  })

  it('renders a hint tooltip (not a clickable button) when no onPreviewCard is provided', () => {
    const el = renderInsertCardSingle(0, 'some-card', undefined)
    expect(el.type.name).toBe('HintTooltip')
  })
})

// ─── P20-I: −⚠ opens a live-threat carousel (s114, review fix) ────────────────
//
// renderRandomThreatTag delegates to gameStore's getLiveRandomThreatTargets
// (not a local reimplementation) so the preview always matches the engine's
// actual removeRandomThreat eligibility rules. These tests exercise the
// tooltip-fallback vs clickable-button branching around that call.

const fakeDeck = { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] }
const threatCard = { id: 'a_threat', tier: 'threat' }

describe('renderRandomThreatTag — live-threat carousel (P20-I)', () => {
  it('falls back to the hint tooltip when no deck is provided', () => {
    const el = renderRandomThreatTag(0, undefined, vi.fn())
    expect(el.type.name).toBe('HintTooltip')
  })

  it('falls back to the hint tooltip when no onPreviewCards is provided', () => {
    vi.mocked(getLiveRandomThreatTargets).mockReturnValue([threatCard as never])
    const el = renderRandomThreatTag(0, fakeDeck as never, undefined)
    expect(el.type.name).toBe('HintTooltip')
  })

  it('falls back to the hint tooltip when no threats are currently live', () => {
    vi.mocked(getLiveRandomThreatTargets).mockReturnValue([])
    const el = renderRandomThreatTag(0, fakeDeck as never, vi.fn())
    expect(el.type.name).toBe('HintTooltip')
  })

  it('returns a clickable button when live threats exist', () => {
    vi.mocked(getLiveRandomThreatTargets).mockReturnValue([threatCard as never])
    const el = renderRandomThreatTag(0, fakeDeck as never, vi.fn())
    expect(el.type).toBe('button')
  })

  it('calls onPreviewCards with the live threats when clicked', () => {
    vi.mocked(getLiveRandomThreatTargets).mockReturnValue([threatCard as never])
    const onPreviewCards = vi.fn()
    const el = renderRandomThreatTag(0, fakeDeck as never, onPreviewCards)
    el.props.onClick({ stopPropagation: () => {} })
    expect(onPreviewCards).toHaveBeenCalledWith([threatCard])
  })
})

// ─── P17-25: hide −card indicator on one-shot self-removing options ───────────
//
// One-shot cards (threat/treat) are auto-removed after the player resolves them.
// When an explicit removeCard effect also targets the same card (e.g. the_dreamer
// removes 'the_dreamer'), the − card chip is redundant — the card vanishes anyway.
// shouldHideRemoveCardSingleTag returns true for that case so EffectTags can skip
// renderRemoveCardSingle.

describe('shouldHideRemoveCardSingleTag — P17-25 self-remove suppression', () => {
  it('returns true when target equals currentCardId on a threat', () => {
    expect(shouldHideRemoveCardSingleTag('forgers_debt', 'forgers_debt', 'threat')).toBe(true)
  })

  it('returns true when target equals currentCardId on a treat', () => {
    expect(shouldHideRemoveCardSingleTag('the_dreamer', 'the_dreamer', 'treat')).toBe(true)
  })

  it('returns false when target differs from currentCardId', () => {
    expect(shouldHideRemoveCardSingleTag('other_card', 'the_dreamer', 'treat')).toBe(false)
  })

  it('returns false when cardTier is not threat or treat (e.g. doom)', () => {
    expect(shouldHideRemoveCardSingleTag('doom_card', 'doom_card', 'doom')).toBe(false)
  })

  it('returns false when currentCardId is undefined', () => {
    expect(shouldHideRemoveCardSingleTag('the_dreamer', undefined, 'treat')).toBe(false)
  })
})
