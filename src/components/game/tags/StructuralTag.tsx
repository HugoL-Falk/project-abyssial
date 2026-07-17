import { HintTooltip } from '../HintTooltip'
import { getCardById } from '../../../data'
import { getLiveRandomThreatTargets } from '../../../state/gameStore'
import type { Card, DeckState } from '../../../types'

// P17-25: returns true when a removeCard effect targets its own one-shot card,
// meaning the explicit − card chip is redundant (the card auto-removes anyway).
export function shouldHideRemoveCardSingleTag(
  targetCardId: string,
  currentCardId: string | undefined,
  cardTier: string | undefined,
): boolean {
  if (!currentCardId) return false
  if (targetCardId !== currentCardId) return false
  return cardTier === 'threat' || cardTier === 'treat'
}

export function renderRecursTag(
  key: number | string,
  _minPos?: number,
  _maxPos?: number,
): JSX.Element {
  // P16-27 (s87): compress permanent "returns in 4-7 draws" label to a single
  // ⟲ icon. P22-P23-21: draw-count range removed from tooltip — too mechanical;
  // "returns soon if not removed" is sufficient.
  return (
    <HintTooltip
      key={key}
      text="Returns soon if not removed."
      ariaLabel="Returns to the deck later"
    >
      <span
        style={{
          fontSize: '0.85rem',
          color: 'rgba(220,160,90,0.95)',
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(220,160,90,0.55)',
          padding: '0.1rem 0.4rem',
          borderRadius: '2px',
        }}
      >
        ⟲
      </span>
    </HintTooltip>
  )
}

// P20-I (s114): re-wired from tooltip-only (P18-13) to a clickable button that
// opens a browse-only carousel preview (CardCarouselOverlay, gold tone) of all
// cards in the group — mirrors renderRemoveCardGrouped's counterpart on the
// removal side (P20-I: −⚠ threat carousel).
export function renderInsertCardGrouped(key: string, count: number, cardIds?: string[], onPreviewCards?: (cards: Card[]) => void): JSX.Element {
  const clickable = !!onPreviewCards && !!cardIds?.length
  const handleClick = clickable
    ? (ev: React.MouseEvent) => {
        ev.stopPropagation()
        const cards = cardIds!.map(getCardById).filter((c): c is Card => c != null)
        if (cards.length) onPreviewCards!(cards)
      }
    : undefined
  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', lineHeight: 1,
    fontSize: '0.8rem', color: 'var(--gold-bright)', background: 'rgba(0,0,0,0.72)',
    border: '1px solid rgba(122,173,85,0.5)', padding: '0.1rem 0.4rem', borderRadius: '2px',
    cursor: clickable ? 'pointer' : 'default', fontFamily: 'inherit',
  } as const
  if (clickable) {
    return (
      <button key={key} type="button" onClick={handleClick}
        aria-label={`${count} cards return to the deck later`} style={chipStyle}>
        +{count}<span style={{ display: 'inline-flex', alignItems: 'center', height: '0.8rem', overflow: 'hidden' }}>🂠</span>
      </button>
    )
  }
  // P20-H: nothing to preview — explain the chip via tooltip instead of an
  // inert disabled button. NOTE: a disabled <button> nested inside
  // HintTooltip's trigger <button> would swallow the click (disabled
  // controls don't dispatch/bubble click events) — use a plain <span>.
  return (
    <HintTooltip key={key} text={`Adds ${count} cards to the deck.`} ariaLabel={`${count} cards return to the deck later`} accent="green">
      <span style={chipStyle}>+{count}<span style={{ display: 'inline-flex', alignItems: 'center', height: '0.8rem', overflow: 'hidden' }}>🂠</span></span>
    </HintTooltip>
  )
}

// P20-I (s110): re-wired from tooltip-only (P18-13) back to a clickable preview
// button — the P18-13 watchpoint ("re-wire tap → onPreviewCard if missed at
// playtest") was tripped by Playtest 20. Mirrors renderRemoveCardSingle exactly,
// differing only in colour (gold/green) and icon (＋🂠) so the +/− chips read
// as one family.
export function renderInsertCardSingle(key: number | string, cardId: string, onPreviewCard?: (id: string) => void): JSX.Element {
  const clickable = !!onPreviewCard
  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', lineHeight: 1,
    fontSize: '0.8rem', color: 'var(--gold-bright)', background: 'rgba(0,0,0,0.72)',
    border: '1px solid rgba(122,173,85,0.5)', padding: '0.1rem 0.4rem', borderRadius: '2px',
    cursor: clickable ? 'pointer' : 'default', fontFamily: 'inherit',
  } as const
  if (clickable) {
    return (
      <button key={key} type="button" onClick={(ev) => { ev.stopPropagation(); onPreviewCard!(cardId) }} style={chipStyle}>
        +<span style={{ display: 'inline-flex', alignItems: 'center', height: '0.8rem', overflow: 'hidden' }}>🂠</span>
      </button>
    )
  }
  // P20-H: see renderInsertCardGrouped — plain span, disabled button would eat the click.
  return (
    <HintTooltip key={key} text="Adds a card to the deck." ariaLabel="Adds a card to the deck" accent="green">
      <span style={chipStyle}>+<span style={{ display: 'inline-flex', alignItems: 'center', height: '0.8rem', overflow: 'hidden' }}>🂠</span></span>
    </HintTooltip>
  )
}

// renderRemoveCardGhost removed in s87 (P16-45) — "-0 cards" tag was
// misleading on options whose removeCard targets were absent from the deck.
// Suppression lives in EffectTags + RandomOutcomeTag now.

export function renderRemoveCardSingle(key: number | string, cardId: string, onPreviewCard?: (id: string) => void): JSX.Element {
  const clickable = !!onPreviewCard
  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', lineHeight: 1,
    fontSize: '0.8rem', color: '#e08080', background: 'rgba(0,0,0,0.72)',
    border: '1px solid rgba(220,80,80,0.5)', padding: '0.1rem 0.4rem', borderRadius: '2px',
    cursor: clickable ? 'pointer' : 'default', fontFamily: 'inherit',
  } as const
  if (clickable) {
    return (
      <button key={key} type="button" onClick={(ev) => { ev.stopPropagation(); onPreviewCard!(cardId) }} style={chipStyle}>
        −<span style={{ display: 'inline-flex', alignItems: 'center', height: '0.8rem', overflow: 'hidden' }}>🂠</span>
      </button>
    )
  }
  // P20-H: see renderInsertCardGrouped — plain span, disabled button would eat the click.
  return (
    <HintTooltip key={key} text="Removes a card from the deck." ariaLabel="Removes a card from the deck" accent="red">
      <span style={chipStyle}>−<span style={{ display: 'inline-flex', alignItems: 'center', height: '0.8rem', overflow: 'hidden' }}>🂠</span></span>
    </HintTooltip>
  )
}

export function renderRemoveCardGrouped(key: number | string, count: number): JSX.Element {
  return (
    <HintTooltip key={key} text={`Removes ${count} cards from the deck.`} ariaLabel={`Removes ${count} cards from the deck`} accent="red">
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        fontSize: '0.8rem', color: '#e08080', background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(220,80,80,0.5)', padding: '0.1rem 0.4rem', borderRadius: '2px',
      }}>
        −{count}<span style={{ display: 'inline-flex', alignItems: 'center', height: '0.8rem', overflow: 'hidden' }}>🂠</span>
      </span>
    </HintTooltip>
  )
}

// P20-I (s114): −⚠ is a random-target removal (no single card to preview), so
// tapping it now opens a browse-only carousel (CardCarouselOverlay, red tone)
// listing every threat currently live in the deck — "like purge-several, no
// button" per Playtest 20 request. Falls back to the P19-43 hint tooltip when
// deck/onPreviewCards aren't supplied (e.g. legacy callers) or no threats are live.
// Uses gameStore's getLiveRandomThreatTargets (not a local reimplementation) so
// this preview always matches the engine's actual removeRandomThreat eligibility
// rules (permanent / prep-carrier / overflow-deficit exclusions included).
export function renderRandomThreatTag(key: number | string, deck?: DeckState, onPreviewCards?: (cards: Card[]) => void): JSX.Element {
  const liveThreats = deck ? getLiveRandomThreatTargets(deck) : []
  const clickable = !!onPreviewCards && liveThreats.length > 0
  if (!clickable) {
    return (
      <HintTooltip key={key} text="Removes a random threat from the deck." ariaLabel="Removes a random threat" accent="red">
        <span style={{
          fontSize: '0.8rem', color: '#e08080', background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(220,80,80,0.5)', padding: '0.1rem 0.4rem', borderRadius: '2px',
          letterSpacing: '0.04em',
        }}>
          −⚠
        </span>
      </HintTooltip>
    )
  }
  return (
    <button key={key} type="button"
      onClick={(ev: React.MouseEvent) => { ev.stopPropagation(); onPreviewCards!(liveThreats) }}
      aria-label="Removes a random threat from the deck"
      style={{
        fontSize: '0.8rem', color: '#e08080', background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(220,80,80,0.5)', padding: '0.1rem 0.4rem', borderRadius: '2px',
        cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em',
      }}>
      −⚠
    </button>
  )
}

// P23-60: styling matches renderRemoveCardSingle exactly (background 0.72,
// no letterSpacing, display inline-flex) for visual consistency across all −🂠 chips.
export function renderAutoRemoveTag(currentCardId: string | undefined, onPreviewCard?: (id: string) => void): JSX.Element {
  const clickable = !!onPreviewCard && !!currentCardId
  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', lineHeight: 1,
    fontSize: '0.8rem', color: '#e08080', background: 'rgba(0,0,0,0.72)',
    border: '1px solid rgba(220,80,80,0.5)', padding: '0.1rem 0.4rem', borderRadius: '2px',
    cursor: clickable ? 'pointer' : 'default', fontFamily: 'inherit',
  } as const
  return clickable ? (
    <button key="auto-remove" type="button"
      onClick={(ev) => { ev.stopPropagation(); onPreviewCard!(currentCardId!) }}
      style={chipStyle}>
      −<span style={{ display: 'inline-flex', alignItems: 'center', height: '0.8rem', overflow: 'hidden' }}>🂠</span>
    </button>
  ) : (
    <span key="auto-remove" style={chipStyle}>−<span style={{ display: 'inline-flex', alignItems: 'center', height: '0.8rem', overflow: 'hidden' }}>🂠</span></span>
  )
}
