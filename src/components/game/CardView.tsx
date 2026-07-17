import { useEffect, useState } from 'react'
import { useGameStore }       from '../../state'
import { playSfx }            from '../../engine/audio'
import { getCardById }        from '../../data'
import { getActualRemovalTargets } from '../../engine/deck'
import type { Card, Effect }  from '../../types/index'
import type { VisibleOpt }    from './OptionsColumn'
import { DrawnCard }          from './DrawnCard'
import { OptionsColumn }      from './OptionsColumn'
import { CardCarouselOverlay } from './CardCarouselOverlay'

interface CardViewProps {
  onPreviewCard: (id: string | null, opts?: { showOptions?: boolean }) => void
  onOpenRelicPicker: () => void
}

export function CardView({ onPreviewCard, onOpenRelicPicker }: CardViewProps) {
  const currentCard       = useGameStore(s => s.currentCard)
  const resolveOption     = useGameStore(s => s.resolveOption)
  const getVisibleOpts    = useGameStore(s => s.getVisibleOptions)
  const deck              = useGameStore(s => s.deck)
  const blessings         = useGameStore(s => s.blessings)
  const resources         = useGameStore(s => s.resources)
  const deepTradeUsed     = useGameStore(s => s.deepTradeUsed)
  const activateDeepTrade = useGameStore(s => s.activateDeepTrade)
  const patientForestUses = useGameStore(s => s.patientForestUsesRemaining)
  const pushCard          = useGameStore(s => s.pushCard)
  const runConfig         = useGameStore(s => s.runConfig)
  const succumb           = useGameStore(s => s.succumb)

  const hasDeepTrade     = blessings.selected.includes('the_deep_trade')
  const hasPatientForest = blessings.selected.includes('the_patient_forest')

  const visibleOpts   = currentCard ? getVisibleOpts(currentCard) : []
  const nonHiddenOpts = visibleOpts.filter(o => !o.hidden)
  const hiddenPrepReqs = visibleOpts
    .filter(o => o.hidden && o.prepRequirement != null)
    .map(o => o.prepRequirement!)
  const recoverable   = nonHiddenOpts.some(o => !o.option.succumbOption && o.available)
  const gatedOpts     = recoverable ? nonHiddenOpts.filter(o => !o.option.succumbOption) : nonHiddenOpts
  const allBlocked    = currentCard !== null && (gatedOpts.length === 0 || gatedOpts.every(o => !o.available))

  const SUCCUMB_FLAVOUR: Partial<Record<string, string>> = {
    yha_nthlei: 'The tide comes in. You let it.',
    nyarlathotep: 'You understand, finally. You agree.',
    shub_niggurath: 'The roots have already found you.',
  }
  const succumbFlavour = runConfig ? (SUCCUMB_FLAVOUR[runConfig.godPath] ?? 'The dark takes you.') : 'The dark takes you.'
  const showPatientForest = hasPatientForest && patientForestUses > 0

  // ── Option-pick / insert animations ──────────────────────────────────────
  const [cardAnim,      setCardAnim]      = useState<{ phase: 'sweep' } | null>(null)
  const [removalState,  setRemovalState]  = useState<{ cards: Card[]; optionIdx: number } | null>(null)
  // P20-I: browse-only carousel — grouped insert-card returns (gold) + live
  // threat lists off the −⚠ chip (red). No action button, just navigation.
  const [browseCards,   setBrowseCards]   = useState<{ cards: Card[]; tone: 'gold' | 'red' } | null>(null)
  const [optionsOpen,   setOptionsOpen]   = useState(false)
  const [textReveal,    setTextReveal]    = useState(false)

  // Auto-open options when mounting into a loaded run (currentCard already present on mount).
  useEffect(() => {
    if (currentCard) {
      const t = setTimeout(() => { setOptionsOpen(true); setTextReveal(true) }, 600)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — mount only

  function doSweep(idx: number) {
    setOptionsOpen(false)
    setTextReveal(false)
    setCardAnim({ phase: 'sweep' })
    setTimeout(() => { resolveOption(idx); setCardAnim(null) }, 360)
  }

  function handleResolve(idx: number) {
    if (cardAnim || removalState) return
    const opt = nonHiddenOpts.find(o => o.idx === idx)
    const configuredRemoveIds = (opt?.effectiveEffects ?? [])
      .filter((e): e is Extract<Effect, { type: 'removeCard' }> => e.type === 'removeCard')
      .map(e => e.cardId)
    const actualRemoveIds = getActualRemovalTargets(configuredRemoveIds, deck, currentCard?.id ?? null)
    const removeCards    = actualRemoveIds
      .map(id => getCardById(id))
      .filter((c): c is Card => c != null)
    if (removeCards.length > 1) {
      setRemovalState({ cards: removeCards, optionIdx: idx })
    } else {
      doSweep(idx)
    }
  }

  return (
    <>
      {/* Card art — sweep-out on option pick; tap to toggle options panel */}
      <div
        style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
        className={cardAnim?.phase === 'sweep' ? 'card-sweep-to-deck' : ''}
        onClick={() => { playSfx('pageTurn'); setOptionsOpen(o => !o) }}
      >
        <DrawnCard card={currentCard!} textVisible={textReveal} hiddenPrepReqs={hiddenPrepReqs} collapsed={!optionsOpen} />
      </div>

      {/* Removal-card preview overlay */}
      {removalState && (
        <CardCarouselOverlay
          cards={removalState.cards}
          tone="red"
          onClose={() => setRemovalState(null)}
          onAction={() => {
            const idx = removalState!.optionIdx
            setRemovalState(null)
            doSweep(idx)
          }}
          actionLabel={removalState.cards.length > 1 ? `Purge ${removalState.cards.length} cards` : 'Purge card'}
          renderLabel={(n, i) => n > 1 ? `Removing ${n} cards — ${i + 1} of ${n}` : 'Removing from deck'}
        />
      )}

      {/* Grouped insert-return / live-threat browse carousel (P20-I) */}
      {browseCards && (
        <CardCarouselOverlay
          cards={browseCards.cards}
          tone={browseCards.tone}
          onClose={() => setBrowseCards(null)}
          renderLabel={(n, i) => browseCards.tone === 'gold'
            ? (n > 1 ? `Returning ${n} cards — ${i + 1} of ${n}` : 'Returning to the deck')
            : (n > 1 ? `${n} threats in the deck — ${i + 1} of ${n}` : 'Threat in the deck')}
        />
      )}

      {/* Patient forest floating button */}
      {showPatientForest && (
        <button onClick={pushCard} style={{
          position: 'absolute', top: '4.5rem', right: '0.65rem', zIndex: 15,
          background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(80,180,80,0.45)',
          color: 'rgba(120,210,120,0.85)', fontSize: '0.56rem', letterSpacing: '0.08em',
          padding: '0.2rem 0.45rem', cursor: 'pointer', borderRadius: '2px',
        }}>
          PUSH ×{patientForestUses}
        </button>
      )}

      {/* Deep trade floating button */}
      {hasDeepTrade && !deepTradeUsed && (
        <button onClick={activateDeepTrade} disabled={resources.relics < 2} style={{
          position: 'absolute',
          top: showPatientForest ? '7.5rem' : '4.5rem',
          right: '0.65rem', zIndex: 15,
          background: 'rgba(0,0,0,0.75)',
          border: `1px solid rgba(80,160,200,${resources.relics >= 2 ? '0.6' : '0.2'})`,
          color: `rgba(120,200,230,${resources.relics >= 2 ? '0.85' : '0.3'})`,
          fontSize: '0.58rem', letterSpacing: '0.07em', padding: '0.28rem 0.55rem',
          cursor: resources.relics >= 2 ? 'pointer' : 'not-allowed', borderRadius: '2px',
        }}>
          TRADE
        </button>
      )}

      {/* P22-19: removed floating AcquiredPrepTags band — prep tag is now shown
          as a light-blue pill in the activity log (P22-8). */}

      {/* Options panel — bare arrow peeks at bottom when closed */}
      {!removalState && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
          transform: optionsOpen ? 'translateY(0)' : 'translateY(calc(100% - 1.4rem))',
          transition: 'transform 0.3s ease-out',
        }}>
          {/* Arrow toggle — no background, just the icon */}
          <div
            role="button"
            onClick={() => { playSfx('click'); setOptionsOpen(o => !o) }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
          >
            <span style={{
              color: 'rgba(200,185,155,0.8)', fontSize: '1.2rem', lineHeight: 1,
              textShadow: '0 1px 8px rgba(0,0,0,1)',
            }}>
              {optionsOpen ? '▾' : '▴'}
            </span>
          </div>
          {/* Options scroll area */}
          <div style={{
            maxHeight: '58vh', overflowY: 'auto',
            background: 'linear-gradient(to top, rgba(4,2,1,0.95) 0%, rgba(4,2,1,0.80) 60%, transparent 100%)',
          }}>
            <OptionsColumn
              visibleOpts={gatedOpts as VisibleOpt[]}
              allBlocked={allBlocked}
              succumbFlavour={succumbFlavour}
              onResolve={handleResolve}
              onSuccumb={succumb}
              onSpendRelic={onOpenRelicPicker}
              relics={resources.relics}
              onPreviewCard={onPreviewCard}
              onPreviewCards={(cards, tone) => setBrowseCards({ cards, tone })}
              currentCard={currentCard}
              isTutorial={runConfig?.isTutorial === true}
            />
          </div>
        </div>
      )}
    </>
  )
}
