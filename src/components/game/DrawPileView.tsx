import type { Card }          from '../../types/index'
import { DrawPile }           from './DrawPile'
import { DrawnCard }          from './DrawnCard'
import { ActivityLog }        from './ActivityLog'
import { WeekBanner }         from './WeekBanner'
import { getCardBackSlug }    from '../../engine/audioSettings'
import { getCardBackBySlug }  from '../../data/cardBacks'

interface DrawPileViewProps {
  drawAnim: { phase: 'lift' | 'flip' | 'zoom'; card: Card } | null
  isFlipped: boolean
  drawPileCount: number
  discardCount: number
  pendingReshuffleAddCount: number
  insertAnim: boolean
  reshuffleAnim: boolean
  weekBannerVisible: boolean
  reshuffleCount: number
  unravellingTier: number
  isTutorial: boolean
  godPath: string | undefined
  onDraw: () => void
  onReshuffle: () => void
  onPreviewCard: (id: string | null, opts?: { showOptions?: boolean }) => void
}

export function DrawPileView({
  drawAnim, isFlipped,
  drawPileCount, discardCount, pendingReshuffleAddCount,
  insertAnim, reshuffleAnim,
  weekBannerVisible, reshuffleCount, unravellingTier,
  isTutorial,
  godPath,
  onDraw, onReshuffle, onPreviewCard,
}: DrawPileViewProps) {
  const bgImage =
    godPath === 'yha_nthlei'     ? 'url(/bg-draw-phase-yha.png)'  :
    godPath === 'nyarlathotep'   ? 'url(/bg-draw-phase-nyar.png)' :
    godPath === 'shub_niggurath' ? 'url(/bg-draw-phase-shub.png)' :
                                   'url(/bg-draw-phase.png)'

  return (
    <div style={{ height: '100%', paddingTop: '70px', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* P15-4: background art pushed down so chalk frame centres around the draw pile */}
      <div style={{ position: 'absolute', top: '6%', left: 0, right: 0, bottom: '-6%', backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center top', zIndex: 0, pointerEvents: 'none' }} />
      {/* P15-4: darkening overlay so UI elements read clearly over the art */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 1, pointerEvents: 'none' }} />
      {/* P15-4: top fade so cropped candles bleed into black naturally */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '18%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.92) 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Top slot — WeekBanner */}
      {!drawAnim && weekBannerVisible && (
        <div style={{ position: 'absolute', top: '70px', left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'center' }}>
          {/* P27-14: suppress only at week-1 start — allow banner after tutorial reshuffle */}
          <WeekBanner reshuffleCount={reshuffleCount} unravellingTier={unravellingTier} suppress={isTutorial && reshuffleCount === 0} isEmpty={drawPileCount === 0} />
        </div>
      )}

      {/* Static pile — hidden while animating */}
      {!drawAnim && (
        <DrawPile count={drawPileCount} onDraw={onDraw} onReshuffle={onReshuffle} discardCount={discardCount} pendingReshuffleAddCount={pendingReshuffleAddCount} insertAnim={insertAnim} reshuffleAnim={reshuffleAnim} weekNumber={reshuffleCount + 1} />
      )}

      {/* Doom + Outcome panels beneath the draw pile */}
      {!drawAnim && (
        <div
          style={{
            position: 'absolute',
            bottom: '1.2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 22,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            pointerEvents: 'auto',
            maxWidth: '92vw',
          }}
        >
          <ActivityLog onPreviewCard={onPreviewCard} />
        </div>
      )}

      {/* Phase 1: top card lifts from pile */}
      {drawAnim?.phase === 'lift' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div className="card-lift-up card-parchment" style={{ width: '220px', height: '330px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '3rem', color: 'var(--gold)', opacity: 0.1 }}>✦</span>
          </div>
        </div>
      )}

      {/* Phase 2: flip */}
      {drawAnim?.phase === 'flip' && (() => {
        const back = getCardBackBySlug(getCardBackSlug())
        return (
          <div style={{ position: 'absolute', inset: 0, paddingTop: '70px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
            <div className="flip-scene" style={{ width: '220px', height: '330px' }}>
              <div className={`flip-inner${isFlipped ? ' is-flipped' : ''}`}>
                <div className="flip-face" style={{
                  backgroundImage: `url(/cardbacks/${back.file})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid #3a3225',
                  borderRadius: '6px',
                  boxShadow: 'inset 0 0 8px 2px rgba(0,0,0,0.40), inset 0 0 0 1px rgba(0,0,0,0.7)',
                }} />
                <div className="flip-face flip-front" style={{ overflow: 'hidden', position: 'relative' }}>
                  <DrawnCard card={drawAnim.card} textVisible={false} />
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Phase 3: zoom — fills full screen (no padding) */}
      {drawAnim?.phase === 'zoom' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          <div className="card-zoom-fill" style={{ position: 'absolute', inset: 0 }}>
            <DrawnCard card={drawAnim.card} textVisible={false} />
          </div>
        </div>
      )}
    </div>
  )
}
