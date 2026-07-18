import { useState, useRef } from 'react'
import { CARD_ART } from '../../data/cardArt'
import { GOD_PATH_CHAINS, getCardById } from '../../data'
import { useGameStore } from '../../state'
import { HintTooltip } from './HintTooltip'
import type { Card, Effect } from '../../types/index'

// ─── Prep-tag hidden-option tooltips (P22-P23-18) ─────────────────────────────
const HIDDEN_PREP_TOOLTIPS: Record<string, string> = {
  studied:         'The deeper reading shows another layer.',
  attended_seance: 'The séance revealed something this card withholds.',
  opium_pact:      'The bargain shows what sleeping leaves hidden.',
  recited:         'The rite unlocked words this card will not speak.',
}
const HIDDEN_PREP_FALLBACK = 'Something waits here. Its conditions are elsewhere.'

// ─── Rarity jewel ─────────────────────────────────────────────────────────────

export const JEWELS: Record<string, { lt: string; deep: string; dk: string; glow: string }> = {
  // Moody palette (all tiers tuned to Doom depth) — glow pre-dimmed to 40%
  common:      { lt:'#c2bfba', deep:'#8e8a84', dk:'#5a5650', glow:'rgba(235,230,220,0.42)' }, // D2 original
  core:        { lt:'#085838', deep:'#053a24', dk:'#021c10', glow:'rgba(28,184,122,0.30)'  },
  rare:        { lt:'#0a3060', deep:'#061e40', dk:'#030a1c', glow:'rgba(24,120,180,0.22)'  }, // Mid
  threat:      { lt:'#680010', deep:'#480008', dk:'#280004', glow:'rgba(140,0,16,0.34)'    },
  doom:        { lt:'#2a2a32', deep:'#1a1a1f', dk:'#0a0a0e', glow:'rgba(80,80,100,0.28)'   }, // Onyx
  unravelling: { lt:'#2a2a32', deep:'#1a1a1f', dk:'#0a0a0e', glow:'rgba(80,80,100,0.28)'   }, // = Doom (onyx)
  god_path:    { lt:'#8e4e10', deep:'#693606', dk:'#3e1e05', glow:'rgba(224,128,16,0.32)'  }, // Mid
  godPath:     { lt:'#8e4e10', deep:'#693606', dk:'#3e1e05', glow:'rgba(224,128,16,0.32)'  }, // Mid
  treat:       { lt:'#8c3265', deep:'#5e1a40', dk:'#2a0a1e', glow:'rgba(200,80,150,0.32)'  }, // Rose
  mutation:    { lt:'#3a0858', deep:'#240438', dk:'#120218', glow:'rgba(144,32,200,0.30)'  },
  tutorial:    { lt:'#2e5c40', deep:'#1f452c', dk:'#102419', glow:'rgba(90,154,112,0.24)'  }, // Mid
}

export function RarityJewel({ tier, size = 14 }: { tier: string; size?: number }) {
  const j = JEWELS[tier] ?? JEWELS.common

  // Intermediate conic stops — computed per render (trivial cost for a 14px icon)
  const mix = (h1: string, h2: string, t: number) => {
    const p = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)] as const
    const [r1,g1,b1] = p(h1), [r2,g2,b2] = p(h2)
    const hex = (v: number) => Math.round(v).toString(16).padStart(2,'0')
    return `#${hex(r1*(1-t)+r2*t)}${hex(g1*(1-t)+g2*t)}${hex(b1*(1-t)+b2*t)}`
  }
  const md  = mix(j.deep, j.dk,   0.45)  // medium-dark face
  const dkG = mix(j.dk,   j.deep, 0.28)  // shadow face — glass transmits some light

  return (
    <div style={{
      width: `${size}px`, height: `${size}px`,
      flexShrink: 0,
      transform: 'rotate(45deg)',
      // Glass brilliant cut: conic 4-facet, cool specular, secondary transmission
      background: `
        radial-gradient(circle at 28% 25%, rgba(210,230,255,0.92) 0%, rgba(200,220,255,0.22) 28%, transparent 46%),
        radial-gradient(circle at 74% 73%, rgba(255,252,240,0.24) 0%, transparent 30%),
        conic-gradient(from 45deg, ${j.lt} 0deg 90deg, ${j.deep} 90deg 180deg, ${dkG} 180deg 270deg, ${md} 270deg 360deg)
      `,
      boxShadow: `0 0 5px 2px ${j.glow}, inset 0 0 0 1px rgba(210,230,255,0.20)`,
    }} />
  )
}

// ─── Card passive tag ─────────────────────────────────────────────────────────
// Shows a ? tooltip for cards with passive/onDraw/accumulates mechanics.

const PASSIVE_RESOURCE_LABELS: Record<string, string> = {
  gold: 'Gold', followers: 'Followers', influence: 'Influence',
  dread: 'Dread', relics: 'Relics', theChanged: 'Changed',
}

function renderPassiveEffects(effects: Effect[]) {
  return effects.map((ef, i) => {
    if (ef.type === 'resource') {
      const pos = ef.delta > 0
      const col = ef.resource === 'dread'
        ? (pos ? '#aa6464' : '#6aaa6a')
        : (pos ? '#6aaa6a' : '#aa6464')
      return (
        <span key={i} style={{ color: col, marginLeft: '0.2rem' }}>
          {PASSIVE_RESOURCE_LABELS[ef.resource] ?? ef.resource} {pos ? '+' : ''}{ef.delta}
        </span>
      )
    }
    if (ef.type === 'insertCard') {
      // P16-15 (s87): name the inserted card rather than the generic "+ card"
      // so onDraw mechanics like dark_young_guardian → it_still_needs_feeding
      // are legible from the ? tooltip.
      const target = getCardById(ef.cardId)
      const label = target?.title ?? ef.cardId
      return <span key={i} style={{ color: 'var(--gold-bright)', marginLeft: '0.2rem' }}>+ {label}</span>
    }
    if (ef.type === 'randomOutcome') return <span key={i} style={{ color: 'rgba(200,185,155,0.5)', marginLeft: '0.2rem', fontStyle: 'italic' }}>random</span>
    return null
  })
}

function CardPassiveTag({ card }: { card: Card }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ bottom: number; top: number; left: number; useTop: boolean; maxHeight: number } | null>(null)

  const hasOnDraw   = (card.onDraw?.length ?? 0) > 0
  const hasPassive  = !!card.passive
  const hasAccum    = !!card.accumulates
  if (!hasOnDraw && !hasPassive && !hasAccum) return null

  const handleToggle = (ev: React.MouseEvent) => {
    ev.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const useTop = r.top < window.innerHeight * 0.5
      setPos({
        bottom: window.innerHeight - r.top + 5,
        top: r.bottom + 5,
        left: Math.min(r.left, window.innerWidth - 268),
        useTop,
        maxHeight: useTop ? window.innerHeight - r.bottom - 15 : r.top - 15,
      })
    }
    setOpen(v => !v)
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap',
    fontSize: '0.75rem', color: 'rgba(200,185,155,0.75)', lineHeight: 1.7,
  }
  const labelStyle: React.CSSProperties = { color: 'rgba(200,185,155,0.5)', marginRight: '0.15rem' }

  return (
    <span style={{ position: 'relative', display: 'inline-flex', marginLeft: '0.25rem' }}>
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
        ?
      </button>
      {open && pos && (
        <div style={{
          position: 'fixed', ...(pos.useTop ? { top: pos.top } : { bottom: pos.bottom }), left: pos.left, zIndex: 500, maxHeight: pos.maxHeight, overflowY: 'auto',
          background: 'rgba(6,4,2,0.97)', border: '1px solid var(--border)',
          padding: '0.35rem 0.6rem', borderRadius: '2px', whiteSpace: 'normal', maxWidth: '260px',
          display: 'flex', flexDirection: 'column', gap: '0.1rem',
        }}>
          {hasOnDraw && (
            <div style={rowStyle}>
              <span style={labelStyle}>On draw:</span>
              {renderPassiveEffects(card.onDraw!)}
            </div>
          )}
          {hasPassive && (
            <div style={rowStyle}>
              <span style={labelStyle}>
                {card.passive!.trigger === 'reshuffle' ? 'Each reshuffle:' : 'When drawn:'}
              </span>
              {renderPassiveEffects(card.passive!.effects)}
            </div>
          )}
          {hasAccum && (
            <div style={{ ...rowStyle, fontStyle: 'italic', color: 'rgba(200,185,155,0.55)' }}>
              Evolves. Options change with each encounter.
            </div>
          )}
        </div>
      )}
    </span>
  )
}

// ─── Tier hint labels ─────────────────────────────────────────────────────────

const TIER_HINTS: Record<string, string> = {
  core:        'Uncommon card · rotates each reshuffle',
  common:      'Common card',
  rare:        'Rare card · rotates each reshuffle',
  threat:      'Threat card',
  treat:       'Treat card',
  god_path:    'God Path card',
  doom:        'Doom card',
  mutation:    'Mutation card',
  tutorial:    'Tutorial',
}

// ─── Drawn card (fills parent, title + jewel row + flavour overlay) ───────────

export function DrawnCard({ card, compact = false, textVisible = true, hiddenPrepReqs, collapsed = false }: {
  card: Card
  compact?: boolean
  textVisible?: boolean
  hiddenPrepReqs?: Array<{ tag: string; label: string }>
  collapsed?: boolean
}) {
  const artSrc        = CARD_ART[card.id] ?? null
  const [jewel, setJewel] = useState(false)
  const runConfig     = useGameStore(s => s.runConfig)

  const isGodPath    = card.tier === 'god_path'
  const stage        = card.chainStage
  const chainTotal   = runConfig?.godPath ? GOD_PATH_CHAINS[runConfig.godPath].length : 6
  const hintLabel    = isGodPath && stage
    ? `God Path — ${stage}/${chainTotal}`
    : (TIER_HINTS[card.tier] ?? card.tier)

  return (
    <>
      {artSrc
        ? <img src={artSrc} alt={card.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
        : <div className="card-parchment" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '5rem', color: 'var(--gold)', opacity: 0.08 }}>✦</span>
          </div>
      }

      {/* Bottom fade — covers watermark (bottom-right) with solid black, fades up into art */}
      {artSrc && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%',
          background: 'linear-gradient(to top, rgba(4,2,1,1) 0%, rgba(4,2,1,1) 18%, rgba(4,2,1,0.55) 50%, transparent 100%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Title + jewel + flavour overlay — top gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        background: 'linear-gradient(to bottom, rgba(6,4,2,0.97) 0%, rgba(6,4,2,0.72) 48%, transparent 100%)',
        padding: compact ? '0.7rem 0.9rem 2.5rem' : (runConfig?.godPath === 'shub_niggurath' ? '5.05rem 0.9rem 3.5rem' : '4.4rem 0.9rem 3.5rem'),
        opacity: textVisible ? 1 : 0,
        transform: collapsed ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'opacity 0.65s ease, transform 0.3s ease-out',
        pointerEvents: textVisible ? 'auto' : 'none',
      }}>
        {/* Title row: text left, stage counter (god path) or tappable jewel (others) right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {/* P22-22 part 1: ◆ sits inside the title div (left of text), colour
              matches ❖ blue so both prep indicators share the same visual language. */}
          {/* P22-44: prep indicator right of title — ❖ outlined pill, light-blue, tooltip */}
          <div style={{ fontVariant: 'small-caps', color: 'var(--gold-bright)', fontSize: compact ? '1.05rem' : '1.1rem', letterSpacing: '0.04em', flex: 1, lineHeight: 1.2, position: 'relative', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {card.title}
            {(card.isMutated || card.id === 'changed_follower') && (
              <span style={{ color: '#d4601a', fontSize: '0.7rem', flexShrink: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>⬢</span>
            )}
            {card.isWhisperAffected && (
              <span
                title="This card is under a whisper's influence. Gains are halved, costs are doubled."
                style={{ color: '#9b59b6', fontSize: '0.7rem', flexShrink: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
              >✦</span>
            )}
            {!compact && hiddenPrepReqs && hiddenPrepReqs.length > 0 && (
              <HintTooltip
                accent="blue"
                text={hiddenPrepReqs.length === 1
                  ? (HIDDEN_PREP_TOOLTIPS[hiddenPrepReqs[0].tag] ?? HIDDEN_PREP_FALLBACK)
                  : HIDDEN_PREP_FALLBACK}
                ariaLabel="Prep requirement"
              >
                <span style={{
                  color: '#5fb8c8',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  background: 'rgba(0,0,0,0.55)',
                  border: '1px solid rgba(95,184,200,0.45)',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '2px',
                  textShadow: '0 0 6px rgba(95,184,200,0.5)',
                  display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                }}>
                  ❖
                </span>
              </HintTooltip>
            )}
          </div>
          {!compact && <CardPassiveTag card={card} />}
          {isGodPath && stage ? (
            /* God path: tappable — stage counter + jewel, shows hint on tap */
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0, cursor: 'pointer', position: 'relative', padding: '0.5rem', margin: '-0.5rem' }}
              onClick={() => setJewel(v => !v)}
            >
              <span style={{ fontSize: compact ? '0.8rem' : '0.85rem', fontWeight: 600, color: 'rgba(224,128,16,0.95)', letterSpacing: '0.05em', fontVariant: 'small-caps', pointerEvents: 'none' }}>
                {stage}/{chainTotal}
              </span>
              <RarityJewel tier="god_path" size={12} />
              {jewel && (
                <div style={{
                  position: 'absolute', top: '18px', right: 0, whiteSpace: 'nowrap',
                  background: 'rgba(4,2,1,0.92)', border: '1px solid var(--border)',
                  color: 'rgba(200,185,155,0.9)', fontSize: compact ? '0.7rem' : '0.8rem', letterSpacing: '0.05em',
                  padding: '0.2rem 0.5rem', pointerEvents: 'none', zIndex: 30,
                }}>
                  {hintLabel}
                </div>
              )}
            </div>
          ) : (
            /* Non-god-path: tappable jewel for tier hint */
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', position: 'relative', padding: '0.5rem', margin: '-0.5rem' }}
              onClick={() => setJewel(v => !v)}
            >
              <RarityJewel tier={card.tier} />
              {jewel && (
                <div style={{
                  position: 'absolute', top: '18px', right: 0, whiteSpace: 'nowrap',
                  background: 'rgba(4,2,1,0.92)', border: '1px solid var(--border)',
                  color: 'rgba(200,185,155,0.9)', fontSize: compact ? '0.7rem' : '0.8rem', letterSpacing: '0.05em',
                  padding: '0.2rem 0.5rem', pointerEvents: 'none', zIndex: 30,
                }}>
                  {hintLabel}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Flavour text — just below the title */}
        {card.flavourText && (
          <p style={{
            fontSize: compact ? '0.85rem' : '1rem', color: 'rgba(210,194,164,0.88)',
            fontStyle: 'italic', lineHeight: 1.45,
            margin: '0.38rem 0 0', letterSpacing: '0.01em',
            pointerEvents: 'none',
          }}>
            {card.flavourText}
          </p>
        )}
      </div>
    </>
  )
}
