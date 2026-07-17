import { useState, useRef } from 'react'
import { MenuButton } from './shared/MenuButton'
import { useGameStore } from '../state'
import { GOD_PATH_NAMES, GOD_PATH_SUBTITLES, GOD_PATH_LORE, ALL_BLESSINGS } from '../data'
import { playSfx } from '../engine/audio'
import { CARD_ART } from '../data/cardArt'
import type { GodPath, BlessingId } from '../types'
import { getMaxSelectableBlessings, loadWonLastRun, loadWonLastRunOnce, getUnlockingGod } from '../engine/blessings'
import { isGodsUnlocked } from '../lib/unlock'

// ─── Page-turn animation ───────────────────────────────────────────────────────
// Module-level direction so incoming screen knows how to enter
let _navDir: 'forward' | 'back' = 'forward'

function usePageTurn() {
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null)
  const entryClass = _navDir === 'forward' ? 'page-in-right' : 'page-in-left'
  const animClass  = exitDir ? `page-out-${exitDir}` : entryClass

  /** Animate out, then run `then()` after 230 ms */
  function exit(dir: 'left' | 'right', then: () => void) {
    _navDir = dir === 'left' ? 'forward' : 'back'
    setExitDir(dir)
    setTimeout(then, 230)
  }

  return { animClass, exit }
}

// ─── Shared footer ─────────────────────────────────────────────────────────────
function NavFooter({ onBack, onForward, forwardLabel }: {
  onBack: () => void
  onForward: () => void
  forwardLabel: string
}) {
  return (
    <div style={{ padding: '0.85rem 1rem 1.2rem', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
      <MenuButton variant="secondary" style={{ flex: 1, padding: '0.65rem' }} onClick={() => { playSfx('click'); onBack() }}>
        ← Back
      </MenuButton>
      <MenuButton variant="primary" style={{ flex: 1 }} onClick={() => { playSfx('click'); onForward() }}>
        {forwardLabel}
      </MenuButton>
    </div>
  )
}

// ─── God path data ─────────────────────────────────────────────────────────────

const FINAL_CARD: Partial<Record<GodPath, { id: string; title: string }>> = {
  yha_nthlei:     { id: 'yha_nthlei_6',     title: "Y'ha-nthlei Stirs"         },
  nyarlathotep:   { id: 'nyarlathotep_6',   title: 'The Crawling Signal Arrives' },
  shub_niggurath: { id: 'shub_niggurath_6', title: 'The Root Remembers'        },
}

const GOD_PATH_ORDER: GodPath[] = ['yha_nthlei', 'nyarlathotep', 'shub_niggurath']

const GOD_PATH_SIGIL: Partial<Record<GodPath, string>> = {
  yha_nthlei:    '〰',
  nyarlathotep:  '✦',
  shub_niggurath:'❧',
}

// ─── Portrait god card ─────────────────────────────────────────────────────────

function PortraitGodCard({ path }: { path: GodPath }) {
  const { id, title } = FINAL_CARD[path] ?? { id: '', title: '' }
  const artSrc = CARD_ART[id] ?? null
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: '2px' }}>
      {artSrc
        ? <img src={artSrc} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
        : <div className="card-parchment" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '4rem', color: 'var(--gold)', opacity: 0.14 }}>{GOD_PATH_SIGIL[path]}</span>
          </div>
      }
      {artSrc && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0, width: '55%', height: '20%',
          background: 'radial-gradient(ellipse at 100% 100%, rgba(4,2,1,0.98) 0%, rgba(4,2,1,0.68) 32%, transparent 62%)',
          pointerEvents: 'none',
        }} />
      )}
      {/* Card border */}
      <div style={{
        position: 'absolute', inset: 0,
        border: '1px solid rgba(122,173,85,0.35)',
        borderRadius: '2px',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ─── God path select ───────────────────────────────────────────────────────────

export function GodPathSelectScreen() {
  const runConfig    = useGameStore(s => s.runConfig)
  const setRunConfig = useGameStore(s => s.setRunConfig)
  const goToPhase    = useGameStore(s => s.goToPhase)
  const { animClass, exit } = usePageTurn()

  const [idx, setIdx]         = useState(() => {
    const cur = runConfig?.godPath
    return cur ? Math.max(GOD_PATH_ORDER.indexOf(cur), 0) : 0 // GOD_PATH_ORDER intentional: idx is stable across unlock
  })
  const godsUnlocked = isGodsUnlocked()
  const visiblePaths = godsUnlocked
    ? GOD_PATH_ORDER
    : GOD_PATH_ORDER.slice(0, 1)

  const [textFading, setTextFading] = useState(false)
  const touchStart                  = useRef<number | null>(null)
  const n = visiblePaths.length

  function navigate(dir: 1 | -1) {
    if (textFading) return
    setTextFading(true)
    setTimeout(() => { setIdx(i => (i + dir + n) % n); setTextFading(false) }, 160)
  }

  const current = visiblePaths[idx]

  // rel: -1 = left, 0 = center, 1 = right
  function relPos(i: number) {
    const diff = ((i - idx) % n + n) % n
    if (diff === 0) return 0
    if (diff === 1) return 1
    return -1
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Animated content ── */}
      <div
        className={animClass}
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '1.5rem 0 0', overflowX: 'clip' }}
        onTouchStart={e => { touchStart.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          if (touchStart.current === null) return
          const diff = touchStart.current - e.changedTouches[0].clientX
          if (Math.abs(diff) > 40) { playSfx('cardDraw'); navigate(diff > 0 ? 1 : -1) }
          touchStart.current = null
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1rem', padding: '0 1rem' }}>
          <div style={{ fontSize: '0.56rem', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: '0.35rem', textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>
            Choose Your Ancient One
          </div>
          <div style={{ width: '50px', height: '1px', background: 'var(--border)', margin: '0 auto' }} />
        </div>

        {/* 3-card peek carousel */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', overflowX: 'clip', overflowY: 'visible' }}>
          {visiblePaths.map((path, i) => {
            const rel = relPos(i)
            const isCenter = rel === 0
            return (
              <div
                key={path}
                onClick={() => { if (!isCenter && !textFading) { playSfx('click'); navigate(rel as 1 | -1) } }}
                style={{
                  position: 'absolute',
                  width: '74%',
                  aspectRatio: '2/3',
                  top: '50%', left: '50%',
                  transform: `translateX(-50%) translateY(-50%) translateX(${rel * 80}%) scale(${isCenter ? 1 : 0.84})`,
                  opacity: 1,
                  zIndex: isCenter ? 2 : 1,
                  transition: 'transform 0.3s ease',
                  cursor: isCenter ? 'default' : 'pointer',
                }}
              >
                <PortraitGodCard path={path} />
              </div>
            )
          })}
        </div>

        {/* God info — flexShrink:0 ensures text is never clipped by the carousel above */}
        <div style={{ textAlign: 'center', padding: '0.65rem 1.5rem 0.75rem', flexShrink: 0, opacity: textFading ? 0 : 1, transition: 'opacity 0.16s ease' }}>
          <div style={{ fontSize: '1rem', fontVariant: 'small-caps', color: 'var(--gold-bright)', letterSpacing: '0.08em', marginBottom: '0.2rem', textShadow: '0 1px 12px rgba(0,0,0,0.95)' }}>
            {GOD_PATH_NAMES[current]}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.12em', textShadow: '0 1px 8px rgba(0,0,0,0.9)', opacity: 0.8 }}>
            {GOD_PATH_SUBTITLES[current]}
          </div>
          <div style={{ margin: '0.55rem auto 0', fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text)', fontStyle: 'italic', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
            {GOD_PATH_LORE[current]}
          </div>
        </div>
      </div>

      {/* ── Static nav ── */}
      <NavFooter
        onBack={() => exit('right', () => goToPhase('menu'))}
        onForward={() => {
          setRunConfig({ godPath: visiblePaths[idx], runLength: 'short' })
          exit('left', () => goToPhase('blessingSelect'))
        }}
        forwardLabel="Choose →"
      />
    </div>
  )
}

// ─── Blessing select ───────────────────────────────────────────────────────────

export function BlessingSelectScreen() {
  const blessings            = useGameStore(s => s.blessings)
  const setBlessingSelection = useGameStore(s => s.setBlessingSelection)
  const startRun             = useGameStore(s => s.startRun)
  const goToPhase            = useGameStore(s => s.goToPhase)
  const { animClass, exit }  = usePageTurn()

  const maxSelect = getMaxSelectableBlessings(loadWonLastRun() || loadWonLastRunOnce())

  function toggle(id: BlessingId) {
    if (!blessings.unlocked.includes(id)) return
    const sel = blessings.selected
    if (sel.includes(id)) setBlessingSelection(sel.filter(x => x !== id))
    else if (sel.length < maxSelect) setBlessingSelection([...sel, id])
  }

  const hasUnlocked = blessings.unlocked.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Animated content ── */}
      <div className={animClass} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem 0', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.56rem', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: '0.2rem', textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>
            Blessings
          </div>
          {hasUnlocked && (
            <div style={{ fontSize: '0.66rem', color: 'var(--text)', textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
              Choose up to {maxSelect} ·{' '}
              <span style={{ color: 'var(--gold-bright)' }}>{blessings.selected.length} selected</span>
            </div>
          )}
          <div style={{ width: '50px', height: '1px', background: 'var(--border)', margin: '0.5rem auto 0' }} />
        </div>

        {/* Blessing rows list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {ALL_BLESSINGS.map((b) => {
            const isUnlocked = blessings.unlocked.includes(b.id)
            const chosen     = blessings.selected.includes(b.id)
            const atMax      = !chosen && blessings.selected.length >= maxSelect
            const snippet    = b.description

            if (!isUnlocked) {
              const unlockGod = getUnlockingGod(b.id)
              const lockCopy = unlockGod
                 ? `Earned by summoning ${GOD_PATH_NAMES[unlockGod]}.`
                 : 'Earned by completing a run.'
              return (
                <div key={b.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '6px', padding: '0.75rem 1rem', opacity: 0.7,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.9rem', fontVariant: 'small-caps', color: 'rgba(200,185,155,0.78)', letterSpacing: '0.06em' }}>{b.title}</span>
                    <svg width="12" height="13" viewBox="0 0 12 13" fill="none" aria-hidden="true" style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
                      <rect x="1.5" y="5.5" width="9" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M3.5 5.5V3.5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(200,185,155,0.68)', fontStyle: 'italic', lineHeight: 1.4 }}>{lockCopy}</div>
                </div>
              )
            }

            return (
              <button key={b.id} disabled={atMax && !chosen} onClick={() => { playSfx('click'); toggle(b.id) }} style={{
                display: 'block', width: '100%', textAlign: 'left', cursor: (atMax && !chosen) ? 'not-allowed' : 'pointer',
                background: 'var(--surface)',
                border: chosen ? '1px solid rgba(200,160,40,0.85)' : '1px solid var(--border)',
                boxShadow: chosen ? '0 0 0 1px rgba(200,160,40,0.55), 0 0 10px rgba(200,160,40,0.15)' : 'none',
                borderRadius: '6px', padding: '0.75rem 1rem', fontFamily: 'var(--ui-font)',
                opacity: (atMax && !chosen) ? 0.45 : 1,
                transition: 'border-color 0.2s, background 0.2s',
                animation: chosen ? 'blessingPop 0.3s ease-out' : undefined,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.9rem', fontVariant: 'small-caps', color: chosen ? 'var(--color-gold-bright)' : 'var(--gold)', letterSpacing: '0.06em' }}>{b.title}</span>
                  {chosen && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ color: 'var(--color-gold-bright)', flexShrink: 0 }}>
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(200,185,158,0.82)', fontStyle: 'italic', lineHeight: 1.45 }}>{snippet}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Static nav ── */}
      <NavFooter
        onBack={() => exit('right', () => goToPhase('godPathSelect'))}
        onForward={() => exit('left', startRun)}
        forwardLabel="Begin Run"
      />
    </div>
  )
}
