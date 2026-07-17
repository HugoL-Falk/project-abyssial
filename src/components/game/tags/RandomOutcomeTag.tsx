import { useState, useRef } from 'react'
import { playSfx } from '../../../engine/audio'
import type { Effect, DeckState } from '../../../types'
import { RESOURCE_ICONS } from '../ResourceIcons'
import { getActualRemovalTargets } from '../../../engine/deck'

export function RandomOutcomeTag({ outcomes, tagKey, onPreviewCard, deck, currentCardId }: {
  outcomes: Array<{ weight: number; effects: Effect[] }>
  tagKey: number
  onPreviewCard?: (id: string) => void
  deck?: DeckState
  currentCardId?: string
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ bottom: number; top: number; left: number; useTop: boolean; maxHeight: number } | null>(null)

  // Deduplicate outcomes by effect signature
  const seen = new Set<string>()
  const unique = outcomes.filter(o => {
    const sig = JSON.stringify(o.effects)
    if (seen.has(sig)) return false
    seen.add(sig); return true
  })

  const handleToggle = (ev: React.MouseEvent) => {
    ev.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const useTop = r.top < window.innerHeight * 0.5
      setPos({
        bottom: window.innerHeight - r.top + 5,
        top: r.bottom + 5,
        left: Math.min(r.left, window.innerWidth - 256),
        useTop,
        maxHeight: useTop ? window.innerHeight - r.bottom - 15 : r.top - 15,
      })
    }
    setOpen(v => !v)
  }

  return (
    <span key={tagKey} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        style={{
          fontSize: '0.8rem', color: '#c89020', background: 'rgba(0,0,0,0.55)',
          padding: '0.1rem 0.4rem', borderRadius: '2px', fontVariant: 'small-caps',
          letterSpacing: '0.05em', border: `1px solid rgba(200,144,32,${open ? '0.65' : '0.30'})`,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
        ⚄
      </button>
      {open && pos && (
        <div style={{
          position: 'fixed', ...(pos.useTop ? { top: pos.top } : { bottom: pos.bottom }), left: pos.left, zIndex: 500, maxHeight: pos.maxHeight, overflowY: 'auto',
          background: 'rgba(6,4,2,0.97)', border: '1px solid var(--border)',
          padding: '0.3rem 0.55rem', borderRadius: '2px', maxWidth: '240px',
        }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(200,185,155,0.5)', letterSpacing: '0.06em', marginBottom: '0.2rem', fontVariant: 'small-caps' }}>
            Chance of:
          </div>
          {/* P22-54: column layout prevents right-of-viewport overflow */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
          {unique.map((o, oi) => {
            const branchRemoveIds = o.effects
              .filter((ef): ef is Extract<Effect, { type: 'removeCard' }> => ef.type === 'removeCard')
              .map(ef => ef.cardId)
            const actualBranchRemoveIds = deck
              ? getActualRemovalTargets(branchRemoveIds, deck, currentCardId ?? null)
              : branchRemoveIds
            const branchGhost = deck !== undefined && branchRemoveIds.length > 0 && actualBranchRemoveIds.length === 0
            let branchRemoveRendered = 0
            // P23-59: flexWrap so ≥3-effect outcomes don't overflow 240px tooltip
            return (
              <div key={oi} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', fontSize: '0.75rem', color: 'rgba(200,185,155,0.85)', lineHeight: 1.7 }}>
                {o.effects.length === 0
                  ? <span style={{ fontStyle: 'italic', opacity: 0.6 }}>nothing</span>
                  : o.effects.map((ef, efi) => {
                      if (ef.type === 'resource') {
                        const Icon = RESOURCE_ICONS[ef.resource]
                        const pos = ef.delta > 0
                        const col = ef.resource === 'dread' ? (pos ? '#aa6464' : '#6aaa6a') : (pos ? '#6aaa6a' : '#aa6464')
                        return <span key={efi} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: col }}>{Icon && <Icon />}{pos ? '+' : ''}{ef.delta}</span>
                      }
                      if (ef.type === 'insertCard') {
                        return onPreviewCard ? (
                          <button
                            key={efi}
                            type="button"
                            onClick={e => { e.stopPropagation(); playSfx('click'); onPreviewCard(ef.cardId) }}
                            style={{
                              color: '#6aaa6a',
                              background: 'rgba(0,0,0,0.35)',
                              border: '1px solid rgba(106,170,106,0.55)',
                              borderRadius: '2px',
                              padding: '0 0.35rem',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              fontSize: 'inherit',
                            }}
                          >
                            + card
                          </button>
                        ) : (
                          <span key={efi} style={{ color: '#6aaa6a' }}>+ card</span>
                        )
                      }
                      if (ef.type === 'removeCard') {
                        // P16-45 (s87): suppress "-0 cards" ghost inside
                        // random-outcome previews too — same misleading framing
                        // as on options (see EffectTags removeCard branch).
                        if (branchGhost) return null
                        if (branchRemoveRendered >= actualBranchRemoveIds.length) return null
                        branchRemoveRendered++
                        return <span key={efi} style={{ color: '#e08080', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(224,128,128,0.55)', borderRadius: '2px', padding: '0 0.35rem' }}>− card</span>
                      }
                      return null
                    })
                }
              </div>
            )
          })}
          </div>
        </div>
      )}
    </span>
  )
}
