import { useRef, useEffect, useState } from 'react'
import { useGameStore } from '../../state'
import { playSfx } from '../../engine/audio'
import { clampDisplayValue } from '../../engine/resources'
import type { ResourceKey } from '../../types'

import { GoldIcon, FollowersIcon, InfluenceIcon, DreadIcon, RelicsIcon, RESOURCE_ICONS } from './ResourceIcons'
import { InGameMenuButton } from './InGameMenuButton'

// ─── Single resource counter ──────────────────────────────────────────────────

type ResConfig = { rkey: ResourceKey; label: string; Icon: () => JSX.Element }

// Resources that are uncapped and should not be clamped for display
const UNCAPPED_DISPLAY: ResourceKey[] = ['relics', 'dread', 'theChanged']

function ResourceCounter({ rkey, label, Icon }: ResConfig) {
  const rawValue = useGameStore(s => s.resources[rkey])
  const value    = UNCAPPED_DISPLAY.includes(rkey) ? rawValue : clampDisplayValue(rawValue)
  const prevRef  = useRef(value)
  const [pulsing,   setPulsing]   = useState(false)
  const [deltaInfo, setDeltaInfo] = useState<{ val: number; id: number } | null>(null)

  useEffect(() => {
    const prev = prevRef.current
    if (value === prev) { prevRef.current = value; return }
    const d = value - prev
    prevRef.current = value
    setPulsing(true)
    setDeltaInfo(di => ({ val: d, id: (di?.id ?? 0) + 1 }))
    const t1 = setTimeout(() => setPulsing(false), 420)
    const t2 = setTimeout(() => setDeltaInfo(null), 950)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [value, rkey])

  const isDread   = rkey === 'dread'
  const isTracked = !isDread && rkey !== 'theChanged' && rkey !== 'relics'

  // Smooth danger intensity for tracked resources (0 → calm, 1 → full danger)
  // Low danger: 0 at value=4, 1 at value=0
  // High danger: 0 at value=7, 1 at value=10
  const lowI     = isTracked ? Math.max(0, (3 - value) / 3)  : 0
  const highI    = isTracked ? Math.max(0, (value - 7) / 3)  : 0
  const trackI   = Math.max(lowI, highI)
  // P16-11a (s87): pivot raised from 3 to 5 so dread tint stays calm until 7,
  // yellow at 8, red at 10. Mapping with the dangerI thresholds below:
  //   value 7 → 0.4 (gold), 8 → 0.6 (yellow), 10 → 1.0 (red).
  const dreadI   = isDread   ? Math.max(0, (value - 5) / 5)  : 0
  const dangerI  = Math.max(trackI, dreadI)

  // Base colour: flash green/red while delta animates, otherwise derive from danger level
  const flashColor = deltaInfo
    ? (isDread
        ? (deltaInfo.val > 0 ? '#aa6464' : '#6aaa6a')
        : (deltaInfo.val > 0 ? '#6aaa6a' : '#c03030'))
    : null

  // P17-14: Dread uses raw value thresholds (not dangerI) so yellow appears at dread ≥ 8, red at dread ≥ 10.
  // Tracked resources use dangerI thresholds as before.
  const baseColor = isDread
    ? (value >= 10 ? 'var(--red-bright)' : value >= 8 ? 'var(--warning)' : 'var(--text)')
    : (dangerI >= 0.85 ? 'var(--red-bright)' : dangerI >= 0.55 ? 'var(--warning)' : dangerI >= 0.25 ? '#c9a227' : 'var(--text)')

  const color = flashColor ?? baseColor

  // P17-12: counter pulsates continuously while a resource sits at a critical
  // value — tracked resources at deficit (0) or overflow (≥10), dread at ≥10.
  // Relics / theChanged are uncapped with no overflow/deficit cards → never pulse.
  const isCritical = isDread
    ? value >= 10
    : isTracked && (value === 0 || value >= 10)

  // Glow: tracked resources near limits use orange→red; dread uses red
  const glowR = isDread ? 180 : 200
  const glowG = isDread ? 30  : Math.round(80 * (1 - dangerI))
  const glowB = isDread ? 30  : 0
  const textShadow = dangerI > 0.15 || flashColor
    ? `0 0 ${Math.round(12 * Math.max(dangerI, 0.4))}px rgba(${glowR},${glowG},${glowB},${Math.min(0.95, dangerI * 1.1 + (flashColor ? 0.5 : 0)).toFixed(2)})`
    : undefined

  return (
    <div className="res-counter">
      {deltaInfo && (
        <span key={deltaInfo.id} className="res-delta" style={{ color: isDread ? (deltaInfo.val > 0 ? '#aa6464' : '#6aaa6a') : (deltaInfo.val > 0 ? '#6aaa6a' : 'var(--red-bright)') }}>
          {deltaInfo.val > 0 ? '+' : ''}{deltaInfo.val}
        </span>
      )}
      <span style={{ color, opacity: 0.65, lineHeight: 1 }}><Icon /></span>
      <span className={`res-value${pulsing ? ' pulsing' : isCritical ? ' critical' : ''}`} style={{ color, textShadow }}>{value}</span>
      <span style={{ fontSize: '0.5rem', color: 'rgba(200,184,154,0.72)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
    </div>
  )
}

// ─── Relic picker overlay ─────────────────────────────────────────────────────

const RELIC_ROWS: { rkey: ResourceKey; label: string }[] = [
  { rkey: 'gold',      label: 'Gold'      },
  { rkey: 'followers', label: 'Followers' },
  { rkey: 'influence', label: 'Influence' },
  { rkey: 'dread',     label: 'Dread'     },
]

function RelicPickerRows({ onPick }: { onPick: (r: ResourceKey, delta: 2 | -2) => void }) {
  const resources = useGameStore(s => s.resources)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {RELIC_ROWS.map(({ rkey, label }) => {
        const current = resources[rkey]
        const minusDis = current === 0
        return (
          <div key={rkey}>
            <div style={{ fontSize: '0.62rem', color: 'rgba(200,185,155,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {(() => { const Icon = RESOURCE_ICONS[rkey]; return Icon ? <span style={{ opacity: 0.65 }}><Icon /></span> : null })()}
              {label}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={() => { playSfx('click'); onPick(rkey, -2) }}
                disabled={minusDis}
                style={{
                  flex: 1,
                  background: minusDis ? 'rgba(30,24,18,0.4)' : 'rgba(30,24,18,0.9)',
                  border: `1px solid ${minusDis ? 'rgba(212,160,16,0.12)' : 'rgba(212,160,16,0.30)'}`,
                  color: minusDis ? 'rgba(200,185,155,0.25)' : 'var(--text)',
                  padding: '0.45rem 0',
                  fontFamily: 'var(--ui-font)', fontSize: '0.9rem',
                  cursor: minusDis ? 'default' : 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                  if (minusDis) return
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(212,160,16,0.75)'
                  el.style.background  = 'rgba(212,160,16,0.08)'
                }}
                onMouseLeave={e => {
                  if (minusDis) return
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(212,160,16,0.30)'
                  el.style.background  = 'rgba(30,24,18,0.9)'
                }}
              >
                −2
              </button>
              <button
                onClick={() => { playSfx('click'); onPick(rkey, 2) }}
                style={{
                  flex: 1,
                  background: 'rgba(30,24,18,0.9)',
                  border: '1px solid rgba(212,160,16,0.30)',
                  color: 'var(--text)',
                  padding: '0.45rem 0',
                  fontFamily: 'var(--ui-font)', fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(212,160,16,0.75)'
                  el.style.background  = 'rgba(212,160,16,0.08)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(212,160,16,0.30)'
                  el.style.background  = 'rgba(30,24,18,0.9)'
                }}
              >
                +2
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function RelicPicker({ onPick, onClose, embedded = false }: {
  onPick: (r: ResourceKey, delta: 2 | -2) => void
  onClose?: () => void
  embedded?: boolean
}) {
  const panel = (
    <div style={{ background: 'rgba(10,8,5,0.97)', border: '1px solid rgba(212,160,16,0.45)', padding: '1.2rem 1.1rem 1rem', minWidth: '220px', boxShadow: '0 0 32px rgba(212,160,16,0.18)' }}>
      <div style={{ fontSize: '0.58rem', color: 'rgba(212,160,16,0.75)', fontFamily: 'var(--title-font)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.75rem', textAlign: 'center' }}>
        Spend 1 Relic — adjust one resource
      </div>
      <RelicPickerRows onPick={onPick} />
      {onClose && (
        <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
          <button onClick={() => { playSfx('click'); onClose?.() }} style={{ background: 'transparent', border: '1px solid rgba(212,160,16,0.30)', color: 'rgba(200,185,155,0.75)', fontSize: '0.78rem', padding: '0.4rem 1.2rem', cursor: 'pointer', fontFamily: 'var(--ui-font)', letterSpacing: '0.06em' }}>
            cancel
          </button>
        </div>
      )}
    </div>
  )

  if (embedded) return panel

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ animation: 'fadeIn 0.22s ease-out' }}>
        {panel}
      </div>
    </div>
  )
}

// ─── Resource bar (exported) ──────────────────────────────────────────────────

export function ResourceBar({ onOpenRelicPicker }: { onOpenRelicPicker: () => void }) {
  const dread     = useGameStore(s => s.resources.dread)
  const relics    = useGameStore(s => s.resources.relics)
  const phase     = useGameStore(s => s.phase)
  // P16-11a (s87): matches dreadI pivot above; background red tint also stays
  // calm until dread 5, fully red at 10.
  const intensity = Math.max(0, (dread - 5) / 5)
  const r         = Math.round(intensity * 40)
  const canSpend  = phase === 'playing' && relics > 0

  return (
    <>
      <div style={{
        background: `linear-gradient(to bottom, rgba(${r+8},${Math.max(0,8-r)},${Math.max(0,8-r)},1.0) 0%, rgba(${r+16},${Math.max(0,16-r)},${Math.max(0,16-r)},0.65) 52%, transparent 100%)`,
        transition: 'background 0.6s',
        paddingBottom: '1rem',
      }}>
        {/* Resources row */}
        <div style={{ display: 'flex', padding: '0.65rem 0.5rem 0.3rem' }}>
          <ResourceCounter rkey="gold"       label="Gold"      Icon={GoldIcon} />
          <ResourceCounter rkey="followers"  label="Followers" Icon={FollowersIcon} />
          <ResourceCounter rkey="influence"  label="Influence" Icon={InfluenceIcon} />
          <ResourceCounter rkey="dread"      label="Dread"     Icon={DreadIcon} />
          {/* Relics: tappable when > 0 to open resource picker */}
          <div
            onClick={canSpend ? onOpenRelicPicker : undefined}
            title={canSpend ? 'Spend 1 Relic: restore one resource to its base value' : undefined}
            style={{ flex: 1, cursor: canSpend ? 'pointer' : 'default', outline: canSpend ? '1px solid rgba(212,160,16,0.28)' : undefined }}
          >
            <ResourceCounter rkey="relics" label="Relics" Icon={RelicsIcon} />
          </div>
          <InGameMenuButton />
        </div>
      </div>
    </>
  )
}
