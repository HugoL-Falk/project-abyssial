// ─── Week banner ──────────────────────────────────────────────────────────────
// Inline banner shown above the draw deck on reshuffle (Week N transition).
// Renders "Week N — <flavour>" while mounted. Suppressed when
// `suppress` (tutorial) is true. Parent controls when to unmount it (typically
// when the next card is drawn).

import { useMemo } from 'react'
import { pickWeekFlavour, type WeekFlavourTier } from '../../data/weekFlavour'

export function WeekBanner({
  reshuffleCount,
  unravellingTier,
  suppress,
  isEmpty = false,
}: {
  reshuffleCount: number
  unravellingTier: number
  suppress: boolean
  isEmpty?: boolean
}) {
  // Pick flavour once per (reshuffleCount, unravellingTier) pair so the line
  // doesn't reshuffle on every render while the banner is visible.
  // P23-61: ◆ glyph (D-T7-2) removed — all tiers use prose now.
  const clampedTier = Math.max(1, Math.min(4, unravellingTier)) as WeekFlavourTier
  const line = useMemo(() => {
    return pickWeekFlavour(clampedTier, reshuffleCount)
  }, [reshuffleCount, clampedTier])

  if (suppress) return null

  return (
    <div
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.6rem 1.2rem',
        animation: 'weekBannerIn 0.35s ease-out',
        background: 'rgba(0,0,0,0.55)',
        borderRadius: '6px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--title-font)',
          fontSize: '1.4rem',
          color: 'var(--gold)',
          letterSpacing: '0.06em',
          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          lineHeight: 1,
        }}
      >
        {isEmpty ? 'End of Week' : 'Week'} {reshuffleCount + 1}
      </div>
      {!isEmpty && (
        <div
          style={{
            fontSize: '0.85rem',
            color: 'rgba(200,185,155,0.85)',
            letterSpacing: '0.08em',
            fontStyle: 'italic',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            textAlign: 'center',
            maxWidth: '88vw',
          }}
        >
          {line}
        </div>
      )}
    </div>
  )
}
