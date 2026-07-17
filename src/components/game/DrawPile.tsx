// ─── Draw pile visual ─────────────────────────────────────────────────────────

import { useState } from 'react'
import { getCardBackSlug } from '../../engine/audioSettings'
import { getCardBackBySlug } from '../../data/cardBacks'

export function DrawPile({ count, weekNumber, onDraw, onReshuffle, discardCount, pendingReshuffleAddCount, insertAnim, reshuffleAnim }: {
  count: number; weekNumber: number; onDraw: () => void
  onReshuffle: () => void; discardCount: number; pendingReshuffleAddCount: number
  insertAnim: boolean; reshuffleAnim: boolean
}) {
  const isEmpty = count === 0
  const edgeCount =
    isEmpty     ? 0 :
    count >= 15 ? 3 :
    count >= 8  ? 2 :
                  1
  const back = getCardBackBySlug(getCardBackSlug())
  const [frameOk, setFrameOk] = useState(true)

  // Empty-pile: fully transparent — summoning circle in background provides context.
  const parchmentStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    background: 'transparent',
    border: 'none',
  }

  // Stepped edge shadow that shrinks as pile drains.
  const edgeShadow =
    edgeCount === 3 ? '4px 0 0 #2a2218, 6px 2px 0 #1f180f, 8px 4px 0 #14100a, 0 8px 18px rgba(0,0,0,0.7)' :
    edgeCount === 2 ? '3px 0 0 #2a2218, 5px 2px 0 #1f180f, 0 6px 14px rgba(0,0,0,0.65)' :
    edgeCount === 1 ? '2px 0 0 #2a2218, 0 4px 10px rgba(0,0,0,0.55)' :
                      '0 6px 24px rgba(0,0,0,0.55)'  // empty fallback drop shadow

  // Non-empty: chosen card-back image with edge vignette baked in via boxShadow.
  const imageBackStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    backgroundImage: `url(/cardbacks/${back.file})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    border: '1px solid #3a3225',
    borderRadius: '6px',
    boxShadow: `inset 0 0 8px 2px rgba(0,0,0,0.40), inset 0 0 0 1px rgba(0,0,0,0.7), ${edgeShadow}`,
  }

  const stackStyle = isEmpty ? parchmentStyle : imageBackStyle

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        onClick={isEmpty ? onReshuffle : onDraw}
        className={reshuffleAnim ? 'pile-shuffle' : ''}
        style={{ position: 'relative', width: '220px', height: '330px', cursor: 'pointer', opacity: 1, transition: 'opacity 0.4s' }}
      >
        <div style={{ ...stackStyle, transform: 'rotate(-2.5deg) translate(-5px, 5px)', opacity: isEmpty ? 0.3 : 1 }} />
        <div style={{ ...stackStyle, transform: 'rotate(1.5deg) translate(3px, 2px)', opacity: isEmpty ? 0.3 : 1 }} />
        <div style={{ ...stackStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Optional iron frame overlay — hides itself on 404. Only on top of the front-most card. */}
          {!isEmpty && frameOk && (
            <img
              src="/cardback-frame.png"
              alt=""
              onError={() => setFrameOk(false)}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
                borderRadius: '6px',
                display: 'block',
              }}
            />
          )}
          {isEmpty ? (
            <div style={{ textAlign: 'center', padding: '0 0.6rem', position: 'relative', zIndex: 2, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 55%, transparent 85%)', borderRadius: '8px' }}>
              {/* P22-16: ⊘ icon + bright text for empty-pile visibility */}
              <div style={{ fontSize: '2.8rem', color: 'rgba(230,220,200,0.7)', lineHeight: 1, marginBottom: '0.5rem', textShadow: '0 0 12px rgba(0,0,0,1)' }}>⊘</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: '0.45rem', textShadow: '0 0 8px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1)' }}>Week {weekNumber}</div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(230,220,200,0.95)', textTransform: 'uppercase', letterSpacing: '0.18em', lineHeight: 1.5, textShadow: '0 0 8px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1)' }}>Draw pile empty</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(220,210,190,0.88)', margin: '0.4rem 0 0.2rem', lineHeight: 1.3, textShadow: '0 0 8px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1)' }}>{discardCount + pendingReshuffleAddCount} cards next week</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '0.55rem', animation: 'pulsePrompt 2.4s ease-in-out infinite', textShadow: '0 0 8px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1)' }}>
                Tap to reshuffle
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 45%, transparent 80%)', padding: '0.8rem 1.2rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.24em', opacity: 0.85, marginBottom: '0.25rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>Week {weekNumber}</div>
              <div style={{ fontSize: '1.9rem', color: 'var(--text)', letterSpacing: '0.04em', lineHeight: 1, textShadow: '0 0 8px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1)', WebkitTextStroke: '0.4px rgba(0,0,0,0.9)' }}>{count}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(200,185,155,0.9)', textTransform: 'uppercase', letterSpacing: '0.2em', lineHeight: 1.6, marginTop: '0.2rem', textShadow: '0 0 6px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,1)' }}>cards remaining</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.24em', opacity: 0.9, marginTop: '0.5rem', animation: 'pulsePrompt 2.4s ease-in-out infinite', textShadow: '0 0 6px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,1)' }}>
                Tap to draw
              </div>
            </div>
          )}
        </div>
        {insertAnim && (
          <div className="pile-insert" style={{ ...stackStyle, border: '1px solid rgba(122,173,85,0.5)' }} />
        )}
      </div>
    </div>
  )
}
