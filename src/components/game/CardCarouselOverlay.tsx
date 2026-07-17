import { useRef, useState } from 'react'
import { DrawnCard } from './DrawnCard'
import type { Card } from '../../types/index'

// ─── Card carousel overlay ─────────────────────────────────────────────────
// Generalized from the purge-only RemovalPreviewOverlay (P20-I, s114) to also
// back browse-only previews: grouped insert-card returns (＋{n}🂠) and threat
// lists surfaced by the random-removal chip (−⚠). Tap backdrop (outside
// cards/button) to close. Pass `onAction` for a destructive-confirm button
// (purge); omit it for a plain browse carousel.

type Tone = 'red' | 'gold'

const TONE: Record<Tone, { text: string; textDim: string; borderCenter: string; borderFaint: string; dot: string; dotDim: string }> = {
  red:  { text: 'rgba(225,130,130,0.9)', textDim: 'rgba(220,110,110,0.65)', borderCenter: 'rgba(180,60,60,0.5)',  borderFaint: 'rgba(180,60,60,0.22)',  dot: 'rgba(220,110,110,0.85)', dotDim: 'rgba(220,110,110,0.3)' },
  gold: { text: 'rgba(232,192,80,0.9)',  textDim: 'rgba(200,166,80,0.65)',  borderCenter: 'rgba(180,140,60,0.5)', borderFaint: 'rgba(180,140,60,0.22)', dot: 'rgba(220,180,80,0.85)',  dotDim: 'rgba(220,180,80,0.3)' },
}

export function CardCarouselOverlay({
  cards, onClose, onAction, actionLabel, renderLabel, tone = 'red',
}: {
  cards: Card[]
  onClose: () => void
  onAction?: () => void
  actionLabel?: string
  renderLabel: (n: number, idx: number) => string
  tone?: Tone
}) {
  const [fading,     setFading]     = useState(false)
  const [idx,        setIdx]        = useState(0)
  const [textFading, setTextFading] = useState(false)
  const touchStart                  = useRef<number | null>(null)
  const n = cards.length
  const c = TONE[tone]

  function navigate(dir: 1 | -1) {
    if (textFading || n <= 1) return
    setTextFading(true)
    setTimeout(() => { setIdx(i => (i + dir + n) % n); setTextFading(false) }, 160)
  }

  function relPos(i: number): 0 | 1 | -1 | null {
    if (n === 1) return 0
    const diff = ((i - idx) % n + n) % n
    if (diff === 0)     return 0
    if (diff === 1)     return 1
    if (diff === n - 1) return -1
    return null
  }

  function handleAction() {
    if (fading || !onAction) return
    setFading(true)
    setTimeout(onAction, 320)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '1rem',
      }}
    >
      {/* Label */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          fontSize: '0.7rem', color: c.textDim,
          textTransform: 'uppercase', letterSpacing: '0.2em', flexShrink: 0,
          opacity: textFading ? 0 : 1, transition: 'opacity 0.16s',
        }}
      >
        {renderLabel(n, idx)}
      </div>

      {/* Carousel — bigger stage than the original purge-only overlay (P20-I: "space available") */}
      <div
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { touchStart.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          if (touchStart.current === null) return
          const diff = touchStart.current - e.changedTouches[0].clientX
          if (Math.abs(diff) > 40) navigate(diff > 0 ? 1 : -1)
          touchStart.current = null
        }}
        style={{
          position: 'relative', width: '100%', height: 'min(100vw, 410px)',
          flexShrink: 0, overflow: 'hidden',
          opacity: fading ? 0 : 1,
          transform: fading ? 'scale(0.88)' : 'scale(1)',
          transition: 'opacity 0.28s ease, transform 0.28s ease',
        }}
      >
        {cards.map((card, i) => {
          const rel = relPos(i)
          if (rel === null) return null
          const isCenter = rel === 0
          return (
            <div
              key={i}
              onClick={!isCenter ? e => { e.stopPropagation(); navigate(rel as 1 | -1) } : undefined}
              style={{
                position: 'absolute',
                width: '78vw', maxWidth: '300px', aspectRatio: '2/3',
                top: '50%', left: '50%',
                transform: `translateX(-50%) translateY(-50%) translateX(${rel * 60}%) scale(${isCenter ? 1 : 0.82})`,
                zIndex: isCenter ? 2 : 1,
                transition: 'transform 0.3s ease',
                cursor: isCenter ? 'default' : 'pointer',
                border: `1px solid ${isCenter ? c.borderCenter : c.borderFaint}`,
                boxShadow: 'inset 0 0 0 1px rgba(200,185,155,0.22)',
                clipPath: 'inset(0 0 10% 0)',
                overflow: 'hidden',
              }}
            >
              <DrawnCard card={card} compact />
            </div>
          )
        })}
      </div>

      {/* Dot indicators */}
      {n > 1 && (
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          {cards.map((_, i) => (
            <div key={i} style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: i === idx ? c.dot : c.dotDim,
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
      )}

      {/* Action button — directly below cards, only rendered when onAction is passed */}
      {onAction && !fading && (
        <button
          onClick={e => { e.stopPropagation(); handleAction() }}
          style={{
            background: 'rgba(10,8,5,0.88)',
            border: `1px solid ${c.borderCenter}`,
            color: c.text,
            padding: '0.65rem 2.8rem',
            fontSize: '0.78rem',
            letterSpacing: '0.18em',
            fontVariant: 'small-caps',
            fontFamily: 'var(--ui-font)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
