import { useState } from 'react'
import type { Card } from '../../types/index'
import { playSfx } from '../../engine/audio'
import { useGameStore } from '../../state'
import { DrawnCard } from './DrawnCard'
import { checkCondition } from '../../engine/godPath'

// ─── Card preview modal — tap backdrop to close ───────────────────────────────
// Visual style matches InsertPreviewOverlay: compact DrawnCard, same container
// sizing (68vw / 240px), same inset border, same backdrop. No flip animation
// (card is always face-up), no confirm button.

export function CardPreviewModal({ card, onClose, showOptions = false }: { card: Card; onClose: () => void; showOptions?: boolean }) {
  const prepTags = useGameStore(s => s.prepTags)
  const resources = useGameStore(s => s.resources)
  const deck = useGameStore(s => s.deck)
  const godPathProgress = useGameStore(s => s.godPathProgress)
  const runConfig = useGameStore(s => s.runConfig)
  const cardRunState = useGameStore(s => s.cardRunState)
  const condState = { resources, deck, godPathProgress, runConfig, cardRunState, prepTags }
  const [isClosing, setIsClosing] = useState(false)

  function handleClose() {
    if (isClosing) return
    playSfx('click')
    setIsClosing(true)
    setTimeout(onClose, 160)
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        animation: isClosing ? 'fadeOut 0.16s ease-in forwards' : 'fadeIn 0.18s ease-out',
      }}
    >
      {/* Card area */}
      <div style={{
        flex: 1, minHeight: 0, width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem 1rem 0.8rem',
      }}>
        <div
          onClick={handleClose}
          className="flip-scene"
          style={{
            width: '78vw', maxWidth: '300px',
            aspectRatio: '2/3', maxHeight: '100%',
            overflow: 'hidden', flexShrink: 0,
          }}
        >
          <div
            className="flip-inner is-flipped"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(200,185,155,0.28)' }}
          >
            <div className="flip-face card-parchment" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '3rem', color: 'var(--gold)', opacity: 0.1 }}>✦</span>
            </div>
            {/* P22-P23-50: removed pointerEvents: none — card tap now closes modal */}
            <div className="flip-face flip-front" style={{ overflow: 'hidden', position: 'relative', clipPath: 'inset(0 0 10% 0)' }}>
              <DrawnCard card={card} compact />
            </div>
          </div>
        </div>
      </div>

      {/* Options preview — P17-29: gated to caller intent. Defaults off so
          activity-log pills and incidental previews show card art + flavour
          only. The chain-card 'Requires: <tag>' pill in OptionsColumn opts
          in via showOptions={true} so the player can see what the carrier
          card unlocks. */}
      {showOptions && card.options && card.options.length > 0 && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            flexShrink: 0, width: '100%', maxWidth: '320px',
            padding: '0 1rem 0.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.3rem',
          }}
        >
          {card.options.map((option, idx) => {
            const isPrepBonus = option.condition?.type === 'hasPrepTag'
            const prepTag = isPrepBonus
              ? (option.condition as Extract<typeof option.condition, { type: 'hasPrepTag' }>).tag
              : null
            const hasTag = isPrepBonus && prepTags.includes(prepTag!)
            const isGreyed = isPrepBonus && !hasTag

            // Skip non-prep-bonus options whose condition is NOT met (existing condition-gating).
            // Prep-bonus options ALWAYS render — greyed when their tag is unset.
            if (!isPrepBonus && option.condition && !checkCondition(option.condition, condState)) return null

            const labelColor = isGreyed ? 'rgba(200,185,155,0.4)' : 'var(--gold)'

            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(4,2,1,0.82)',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  padding: '0.35rem 0.55rem',
                  opacity: isGreyed ? 0.72 : 1,
                }}
              >
                <div style={{ fontVariant: 'small-caps', fontSize: '0.9rem', letterSpacing: '0.08em', color: labelColor }}>
                  {isPrepBonus && (
                    // P22-38: unified light-blue across all ❖ locations.
                    <span style={{
                      color: isGreyed ? 'rgba(95,184,200,0.3)' : '#5fb8c8',
                      textShadow: isGreyed ? 'none' : '0 0 6px rgba(95,184,200,0.5)',
                      marginRight: '0.3rem',
                    }}>❖</span>
                  )}
                  {option.label}
                </div>
                {isPrepBonus && isGreyed && (
                  <div style={{
                    fontSize: '0.7rem', color: 'rgba(95,184,200,0.55)',
                    fontStyle: 'italic', marginTop: '0.15rem',
                  }}>
                    ❖ requires: {prepTag!.replace(/_/g, ' ').toUpperCase()} this week
                  </div>
                )}
                {option.flavourText && (
                  <p style={{
                    fontSize: '0.78rem', color: 'rgba(200,185,155,0.55)',
                    fontStyle: 'italic', margin: '0.18rem 0 0', lineHeight: 1.4,
                  }}>
                    {option.flavourText}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Dismiss hint */}
      <div style={{
        flexShrink: 0, padding: '0.6rem 1rem 2rem',
        textAlign: 'center', fontSize: '0.72rem',
        color: 'rgba(200,185,155,0.92)', letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        Tap anywhere to close
      </div>
    </div>
  )
}
