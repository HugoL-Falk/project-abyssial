import type { Effect, GodPath, DeckState, Resources, Card } from '../../types'
import { playSfx } from '../../engine/audio'
import { RESOURCE_ORDER } from './ResourceIcons'
import { getNextChainCard, getCardById } from '../../data'
import { getActualRemovalTargets } from '../../engine/deck'
import { HintTooltip } from './HintTooltip'
import { PREP_TAG_LABELS, PREP_TAG_CARRIERS, type PrepTag } from '../../data/godPaths/prepTagCarriers'
import { RarityJewel } from './DrawnCard'
import {
  PreviewTag,
  ResourceTag,
  RandomOutcomeTag,
  SurfaceChainCardTag,
  AdvanceGodPathTag,
  renderRecursTag,
  renderInsertCardGrouped,
  renderInsertCardSingle,
  renderRemoveCardSingle,
  renderRemoveCardGrouped,
  renderRandomThreatTag,
  renderAutoRemoveTag,
  shouldHideRemoveCardSingleTag,
} from './tags'

export function EffectTags({ effects, onPreviewCard, onPreviewCards, inline, godPathCtx, currentCardId, cardTier, cardPermanent, currentResources, isTutorial, deck, previewTag }: {
  effects: Effect[]
  onPreviewCard?: (cardId: string) => void
  // P20-I: multi-card browse carousel — grouped insert returns (gold) + live
  // threat lists off the −⚠ chip (red). Caller (OptionsColumn/GameScreen)
  // picks the tone.
  onPreviewCards?: (cards: Card[], tone: 'gold' | 'red') => void
  inline?: boolean
  godPathCtx?: { godPath: GodPath; chainStage: number; chainTotal: number }
  currentCardId?: string
  cardTier?: string
  cardPermanent?: boolean
  currentResources?: Resources
  isTutorial?: boolean
  deck?: DeckState
  previewTag?: string
}) {
  const tags: JSX.Element[] = []
  const hasPreviewOverride = typeof previewTag === 'string' && previewTag.length > 0

  const configuredRemoveIds = effects
    .filter((e): e is Extract<Effect, { type: 'removeCard' }> => e.type === 'removeCard')
    .map(e => e.cardId)
  const actualRemoveIds = deck
    ? getActualRemovalTargets(configuredRemoveIds, deck, currentCardId ?? null)
    : configuredRemoveIds
  // P23-65: cross-card removes (targets ≠ current card) should show even when
  // targets aren't in the deck. Ghost suppression (P16-45) is narrowed to the
  // self-remove-only case where showing a chip is genuinely redundant.
  const crossCardConfiguredIds = configuredRemoveIds.filter(id => id !== (currentCardId ?? ''))
  const ghostRemove = deck !== undefined && configuredRemoveIds.length > 0
    && actualRemoveIds.length === 0 && crossCardConfiguredIds.length === 0
  // Prefer actual (in-deck) remove IDs; fall back to configured cross-card IDs
  // so the chip still renders when targets happen to be absent from the deck.
  const displayRemoveIds = actualRemoveIds.length > 0 ? actualRemoveIds : crossCardConfiguredIds
  const removeCardCount = displayRemoveIds.length
  let removeCardSeen = false

  const insertCardEffects = effects.filter(e =>
    e.type === 'insertCard' && !(currentCardId && e.cardId === currentCardId)
  )
  const insertCardCount = insertCardEffects.length
  let insertCardSeen = false

  const sortedEffects = [...effects].sort((a, b) => {
    if (a.type === 'resource' && b.type === 'resource')
      return RESOURCE_ORDER.indexOf(a.resource) - RESOURCE_ORDER.indexOf(b.resource)
    if (a.type === 'resource') return -1
    if (b.type === 'resource') return 1
    return 0
  })

  sortedEffects.forEach((e, i) => {
    if (e.type === 'resource') {
      tags.push(<ResourceTag key={i} effect={e} currentResources={currentResources} isTutorial={isTutorial} />)
    } else if (e.type === 'victory') {
      tags.push(<span key={i} style={{ fontSize: '0.8rem', color: 'var(--gold)', padding: '0.1rem 0.3rem', borderRadius: '2px' }}>SUMMON</span>)
    } else if (e.type === 'advanceGodPath') {
      if (godPathCtx && godPathCtx.chainStage < godPathCtx.chainTotal) {
        const nextCard = getNextChainCard(godPathCtx.godPath, godPathCtx.chainStage)
        if (nextCard && onPreviewCard) {
          tags.push(
            <button key={`${i}-next`} type="button"
              onClick={(ev) => { ev.stopPropagation(); playSfx('click'); onPreviewCard(nextCard.id) }}
              style={{ fontSize: '0.8rem', color: '#c89020', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(200,144,32,0.65)', padding: '0.1rem 0.4rem', borderRadius: '2px', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', lineHeight: 1 }}>
              <span style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>+</span><RarityJewel tier="god_path" size={10} />
            </button>
          )
        }
      } else if (!godPathCtx) {
        tags.push(<AdvanceGodPathTag key={i} tagKey={i} />)
      }
    } else if (e.type === 'doomTick') {
      tags.push(<span key={i} style={{ fontSize: '0.8rem', color: 'var(--red-bright)', padding: '0.1rem 0.3rem', borderRadius: '2px' }}>doom &#8593;</span>)
    } else if (e.type === 'insertCard') {
      if (currentCardId && e.cardId === currentCardId) {
        tags.push(renderRecursTag(i, e.minPos, e.maxPos))
        return
      }
      if (!hasPreviewOverride) {
        if (insertCardCount > 1) {
          if (!insertCardSeen) {
            insertCardSeen = true
            const groupCardIds = (insertCardEffects as Extract<Effect, { type: 'insertCard' }>[]).map(e => e.cardId)
            tags.push(renderInsertCardGrouped('insertCard-group', insertCardCount, groupCardIds,
              onPreviewCards ? (cards) => onPreviewCards(cards, 'gold') : undefined))
          }
        } else {
          tags.push(renderInsertCardSingle(i, e.cardId, onPreviewCard))
        }
      }
    } else if (e.type === 'removeCard') {
      if (!hasPreviewOverride) {
        if (ghostRemove) {
          // P16-45 (s87) narrowed by P23-65: suppress only when ALL configured
          // targets are self-removes (the card removes itself — chip is redundant
          // with the auto-remove chip already shown below). Cross-card removals
          // whose targets happen to be absent from the deck still show a chip so
          // the player knows the option intends to remove cards (see rival_escalation
          // "Strike back" — target absent ≠ effect is meaningless).
          return
        }
        if (removeCardCount === 1) {
          if (removeCardSeen) return
          removeCardSeen = true
          // P17-25: suppress − card chip when this option removes its own one-shot
          // card (threat/treat). The card auto-removes anyway; the chip is redundant.
          if (shouldHideRemoveCardSingleTag(displayRemoveIds[0], currentCardId, cardTier)) return
          tags.push(renderRemoveCardSingle(i, displayRemoveIds[0], onPreviewCard))
          return
        }
        if (!removeCardSeen) {
          removeCardSeen = true
          tags.push(renderRemoveCardGrouped(i, removeCardCount))
        }
      }
    } else if (e.type === 'randomOutcome') {
      tags.push(<RandomOutcomeTag key={i} outcomes={e.outcomes} tagKey={i} onPreviewCard={onPreviewCard} deck={deck} currentCardId={currentCardId} />)
    } else if (e.type === 'surfaceChainCard') {
      tags.push(<SurfaceChainCardTag key={i} tagKey={i} />)
    } else if (e.type === 'removeRandomThreat') {
      if (!hasPreviewOverride) tags.push(renderRandomThreatTag(i, deck,
        onPreviewCards ? (cards) => onPreviewCards(cards, 'red') : undefined))
    } else if (e.type === 'partialVictory') {
      tags.push(<span key={i} style={{ fontSize: '0.8rem', color: 'rgba(200,144,32,0.55)', padding: '0.1rem 0.3rem', borderRadius: '2px' }}>SUMMON (partial)</span>)
    } else if (e.type === 'seedMutations') {
      tags.push(
        <HintTooltip key={i} text={`Replaces ${e.count} random cards in your deck with mutated variants. Mutated cards reveal hidden options when re-drawn.`} ariaLabel={`Mutates ${e.count} cards`} accent="green">
          <span style={{ fontSize: '0.8rem', color: 'var(--gold-bright)', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(122,173,85,0.3)', padding: '0.1rem 0.35rem', borderRadius: '2px' }}>mutates ×{e.count}</span>
        </HintTooltip>
      )
    } else if (e.type === 'seedWhispers') {
      tags.push(
        <HintTooltip key={i} text={`Adds ${e.count} whisper event${e.count > 1 ? 's' : ''} to the deck. They surface later as disruptive cards.`} ariaLabel={`Adds ${e.count} whispers`}>
          <span style={{ fontSize: '0.8rem', color: '#9080c8', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(144,128,200,0.3)', padding: '0.1rem 0.35rem', borderRadius: '2px' }}>+ {e.count} whisper{e.count > 1 ? 's' : ''}</span>
        </HintTooltip>
      )
    } else if (e.type === 'surfaceCards') {
      tags.push(
        <HintTooltip key={i} text="Pulls cards from later in the deck to the top, accelerating events." ariaLabel="Surfaces cards" accent="gold">
          <span style={{ fontSize: '0.8rem', color: '#c89020', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(200,144,32,0.3)', padding: '0.1rem 0.35rem', borderRadius: '2px' }}>surfaces cards</span>
        </HintTooltip>
      )
    } else if (e.type === 'setPrepTag') {
      // P19-40: drop the literal tag text ("studied"), keep the outlined
      // pill, and move the explanation into a click tooltip.
      // P22-38: unified light-blue (#5fb8c8) across all ❖ locations.
      const friendly = PREP_TAG_LABELS[e.tag as PrepTag] ?? e.tag.replace(/_/g, ' ')
      tags.push(
        <HintTooltip key={i}
          text={`Grants the ${friendly} mark this week. It activates automatically on the matching path card; resets each reshuffle.`}
          ariaLabel={`Prep mark: ${friendly}`}>
          <span style={{
            fontSize: '0.8rem', color: '#5fb8c8',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(95,184,200,0.45)',
            padding: '0.1rem 0.35rem', borderRadius: '2px',
            textShadow: '0 0 6px rgba(95,184,200,0.5)',
            display: 'inline-flex', alignItems: 'center', lineHeight: 1,
          }}>
            ❖
          </span>
        </HintTooltip>
      )
    } else if (e.type === 'consumePrepTag') {
      // P22-22 part 2: prep-required options show a −❖ chip here instead of
      // a label prefix in OptionsColumn. Mirrors setPrepTag styling but signals
      // consumption rather than acquisition.
      // P22-38: unified light-blue (#5fb8c8) across all ❖ locations.
      const friendly = PREP_TAG_LABELS[e.tag as PrepTag] ?? e.tag.replace(/_/g, ' ')
      const carriers = (PREP_TAG_CARRIERS[e.tag as PrepTag] ?? [])
      const carrierTitles = carriers
        .map(c => getCardById(c.cardId)?.title ?? c.cardId.replace(/_/g, ' '))
        .filter((t, i, arr) => arr.indexOf(t) === i) // dedupe
      const fromText = carrierTitles.length > 0
        ? ` Obtainable from: ${carrierTitles.join(', ')}.`
        : ''
      tags.push(
        <HintTooltip key={i}
          text={`Requires ${friendly}.${fromText} Mark is spent on use.`}
          ariaLabel={`Requires prep mark: ${friendly}`}>
          <span style={{
            fontSize: '0.8rem', color: '#5fb8c8',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(95,184,200,0.45)',
            padding: '0.1rem 0.35rem', borderRadius: '2px',
            textShadow: '0 0 6px rgba(95,184,200,0.5)',
            display: 'inline-flex', alignItems: 'center', lineHeight: 1,
          }}>
            −❖
          </span>
        </HintTooltip>
      )
    } else if (e.type === 'deferGodPathCard') {
      tags.push(
        <HintTooltip key={i} text="Pushes your next god-path card later in the deck." ariaLabel="God-path card pushed later">
          <span style={{
            fontSize: '0.8rem', color: '#c89020',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(200,144,32,0.3)',
            padding: '0.1rem 0.35rem', borderRadius: '2px',
            display: 'inline-flex', alignItems: 'center', gap: '0.2rem', lineHeight: 1,
          }}>
            <RarityJewel tier="god_path" size={10} /><span style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>→</span>
          </span>
        </HintTooltip>
      )
    }
  })

  const hasExplicitRemove = effects.some(e => e.type === 'removeCard')
  const hasSelfReinsert   = !!currentCardId && effects.some(e => e.type === 'insertCard' && e.cardId === currentCardId)
  const autoRemoveCard    =
    !hasPreviewOverride &&
    (cardTier === 'threat' || cardTier === 'treat' || cardTier === 'doom') &&
    !cardPermanent &&
    !hasExplicitRemove &&
    !hasSelfReinsert

  if (autoRemoveCard) {
    tags.push(renderAutoRemoveTag(currentCardId, onPreviewCard))
  }

  if (hasPreviewOverride) {
    if (previewTag === '-theChanged') {
      tags.push(
        <span key="preview-override" style={{
          fontSize: '0.8rem',
          color: '#d4601a',
          border: '1px solid rgba(212,96,26,0.45)',
          padding: '0.15rem 0.45rem',
          borderRadius: '2px',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          lineHeight: 1,
        }}>
          −⬢
        </span>
      )
    } else {
      tags.push(<PreviewTag key="preview-override" text={previewTag!} />)
    }
  }

  if (tags.length === 0) return null
  return <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.25rem', marginTop: inline ? 0 : '0.3rem' }}>{tags}</div>
}
