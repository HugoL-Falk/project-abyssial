import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../../state'
import { FeedbackForm } from '../FeedbackForm'
import { buildPrepTagPills } from '../../data/godPaths/prepTagCarriers'
import { TheChangedIcon } from './ResourceIcons'
import { ALL_BLESSINGS } from '../../data'
import {
  getMusicVolume, setMusicVolume,
  getSfxVolume,   setSfxVolume,
  getUiVolume,    setUiVolume,
} from '../../engine/audioSettings'
import { playSfx, applyMusicVolume, applySfxVolume } from '../../engine/audio'

// ─── Style consts ─────────────────────────────────────────────────────────────

const runRowStyle: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--text)', textAlign: 'left',
  padding: '0.35rem 0.55rem', fontSize: '0.72rem',
  fontFamily: 'inherit', cursor: 'pointer',
  letterSpacing: '0.04em',
}
const confirmBtnStyle: React.CSSProperties = {
  background: 'rgba(180,60,60,0.18)', border: '1px solid rgba(220,110,110,0.6)',
  color: 'rgba(225,130,130,0.95)', fontSize: '0.68rem',
  padding: '0.25rem 0.55rem', cursor: 'pointer', fontFamily: 'inherit',
  fontVariant: 'small-caps', letterSpacing: '0.06em',
}
const cancelBtnStyle: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--text-dim)', fontSize: '0.68rem',
  padding: '0.25rem 0.55rem', cursor: 'pointer', fontFamily: 'inherit',
  fontVariant: 'small-caps', letterSpacing: '0.06em',
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InGameMenuButton() {
  const phase = useGameStore(s => s.phase)
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos,  setPos]  = useState<{ bottom: number; top: number; left: number; useTop: boolean; maxHeight: number } | null>(null)
  const goToPhase    = useGameStore(s => s.goToPhase)
  const restartRun   = useGameStore(s => s.restartRun)
  const prepPills       = buildPrepTagPills(useGameStore(s => s.prepTags))
  const selectedBlessings = useGameStore(s => s.blessings.selected)
  const activeGod    = useGameStore(s => s.runConfig?.godPath)
  const week         = useGameStore(s => s.reshuffleCount + 1)
  const currentCardId = useGameStore(s => s.currentCard?.id)
  const theChanged   = useGameStore(s => s.resources.theChanged ?? 0)
  const isShub       = activeGod === 'shub_niggurath'
  const [music, setMusic]     = useState(getMusicVolume())
  const [sfx,   setSfx]       = useState(getSfxVolume())
  const [ui,    setUi]        = useState(getUiVolume())
  // P16-7 (s87): Restart still confirms (destructive — wipes save). Quit no
  // longer confirms — exiting to the menu preserves the save, Continue brings
  // the player back to the same beat.
  const [pendingAction, setPendingAction] = useState<null | 'restart'>(null)
  const [blessingTip, setBlessingTip] = useState<{ text: string; left: number; bottom: number } | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  // P16-7 (s87): click-outside-to-close on the popover.
  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (ev: MouseEvent) => {
      const target = ev.target as Node | null
      if (!target) return
      if (popoverRef.current?.contains(target)) return
      if (btnRef.current?.contains(target))     return
      setOpen(false)
      setPendingAction(null)
      setBlessingTip(null)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  if (phase !== 'playing') return null

  function onMusicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value)
    setMusic(v); setMusicVolume(v); applyMusicVolume()
  }
  function onSfxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value)
    setSfx(v); setSfxVolume(v); applySfxVolume()
  }
  function onUiChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value)
    setUi(v); setUiVolume(v)
  }
  function confirmAction() {
    playSfx('click')
    if (pendingAction === 'restart') restartRun()
    setPendingAction(null)
    setOpen(false)
  }
  function cancelAction() {
    playSfx('click')
    setPendingAction(null)
  }
  function quitToMenu() {
    // P16-7 (s87): direct quit, no confirmation. The save persists; Continue
    // resumes from this beat. No data is lost by tapping Quit.
    playSfx('click')
    setOpen(false)
    goToPhase('menu')
  }

  const handleToggle = (ev: React.MouseEvent) => {
    ev.stopPropagation()
    playSfx('click')
    if (open) { setPendingAction(null); setBlessingTip(null) }
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const useTop = r.top < window.innerHeight * 0.5
      setPos({
        bottom: window.innerHeight - r.top + 5,
        top: r.bottom + 5,
        left: Math.min(r.left, window.innerWidth - 220),
        useTop,
        // Subtract 20px (padding 16px + border 2px × 2 sides) so the border-box
        // height never breaches the viewport edge.
        maxHeight: (useTop ? window.innerHeight - r.bottom - 15 : r.top - 15) - 20,
      })
    }
    setOpen(v => !v)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '0.4rem' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        aria-label="Game menu"
        style={{
          lineHeight: 1, color: 'var(--text)',
          background: 'transparent',
          width: '1.9rem', height: '1.9rem', padding: 0, borderRadius: '3px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {open
          ? <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>✕</span>
          : <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M7.2 1.5h3.6l.5 2.1a6 6 0 0 1 1.5.87l2-.76 1.8 3.11-1.58 1.3a6 6 0 0 1 0 1.74l1.58 1.3-1.8 3.11-2-.76a6 6 0 0 1-1.5.87l-.5 2.1H7.2l-.5-2.1a6 6 0 0 1-1.5-.87l-2 .76-1.8-3.11 1.58-1.3a6 6 0 0 1 0-1.74L1.2 6.82l1.8-3.11 2 .76a6 6 0 0 1 1.5-.87L7.2 1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.1"/>
            </svg>
        }
      </button>
      {blessingTip && (
        <span
          role="tooltip"
          style={{
            position: 'fixed',
            left: blessingTip.left,
            bottom: blessingTip.bottom,
            zIndex: 600,
            whiteSpace: 'pre-wrap',
            width: 'max-content',
            maxWidth: '18rem',
            fontSize: '0.72rem',
            fontFamily: 'var(--ui-font)',
            color: 'rgba(230,220,200,0.95)',
            background: 'rgba(0,0,0,0.9)',
            border: '1px solid rgba(200,144,32,0.45)',
            borderRadius: '2px',
            padding: '0.35rem 0.55rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            lineHeight: 1.4,
            pointerEvents: 'none',
          }}
        >
          {blessingTip.text}
        </span>
      )}
      {pos && (
        <div ref={popoverRef} style={{
          position: 'fixed', ...(pos.useTop ? { top: pos.top } : { bottom: pos.bottom }), left: pos.left, zIndex: 500, maxHeight: pos.maxHeight, overflowY: 'auto',
          background: 'rgba(6,4,2,0.97)', border: '1px solid var(--border)',
          padding: '0.5rem 0.7rem', borderRadius: '2px', minWidth: '220px',
          transition: 'transform 200ms ease, opacity 200ms ease',
          transformOrigin: 'top',
          transform: open ? 'scaleY(1)' : 'scaleY(0)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}>
          {/* Blessings */}
          {selectedBlessings.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{
                fontSize: '0.7rem',
                color: 'rgba(200,144,32,0.75)',
                fontVariant: 'small-caps',
                letterSpacing: '0.08em',
                marginBottom: '0.35rem',
              }}>
                Blessings
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {selectedBlessings.map(id => {
                  const b = ALL_BLESSINGS.find(x => x.id === id)
                  if (!b) return null
                  const tipText = b.description + (b.flavourText ? `\n\n${b.flavourText}` : '')
                  return (
                    <button
                      key={id}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        if (blessingTip) { setBlessingTip(null); return }
                        const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
                        const maxW = 288
                        setBlessingTip({
                          text: tipText,
                          left: Math.min(Math.max(8, r.left + r.width / 2 - maxW / 2), window.innerWidth - maxW - 20),
                          bottom: window.innerHeight - r.top + 4,
                        })
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                        fontSize: '0.75rem',
                        color: 'rgba(200,160,50,0.95)',
                        textShadow: '0 0 6px rgba(200,144,32,0.4)',
                        background: 'rgba(0,0,0,1)',
                        border: '1px solid rgba(200,144,32,0.3)',
                        padding: '0.08rem 0.35rem',
                        borderRadius: '2px',
                        fontVariant: 'small-caps',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ opacity: 0.7 }}>✦</span>
                      <span style={{ flex: 1 }}>{b.title}</span>
                      <span style={{ fontSize: '0.6rem', opacity: 0.45 }}>?</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Prep tags */}
          {prepPills.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{
                fontSize: '0.7rem',
                color: 'rgba(200,144,32,0.75)',
                fontVariant: 'small-caps',
                letterSpacing: '0.08em',
                marginBottom: '0.35rem',
              }}>
                Preparations
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {prepPills.map(({ tag, label }) => (
                  <span key={tag} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                    fontSize: '0.75rem',
                    color: '#5fb8c8',
                    textShadow: '0 0 6px rgba(95,184,200,0.5)',
                    background: 'rgba(0,0,0,0.55)',
                    border: '1px solid rgba(95,184,200,0.45)',
                    padding: '0.08rem 0.35rem',
                    borderRadius: '2px',
                    fontVariant: 'small-caps',
                    letterSpacing: '0.05em',
                  }}>
                    <span>❖</span><span>{label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* The Changed — Shub runs only */}
          {isShub && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{
                fontSize: '0.7rem',
                color: 'rgba(111,184,106,0.75)',
                fontVariant: 'small-caps',
                letterSpacing: '0.08em',
                marginBottom: '0.25rem',
              }}>
                The Changed
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.9rem',
                color: '#d4601a',
                textShadow: '0 0 6px rgba(212,96,26,0.4)',
              }}>
                <span style={{ opacity: 0.7, lineHeight: 1 }}><TheChangedIcon /></span>
                <span style={{ fontVariant: 'small-caps', letterSpacing: '0.06em' }}>{theChanged}</span>
                <span style={{ fontSize: '0.58rem', color: 'rgba(212,96,26,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>changed</span>
              </div>
            </div>
          )}

          {/* ── Audio section ── */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.6rem', paddingTop: '0.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(200,144,32,0.75)', fontVariant: 'small-caps', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              Audio
            </div>
            <PopoverSlider label="Music"          value={music} onChange={onMusicChange} />
            <PopoverSlider label="Sound Effects"  value={sfx}   onChange={onSfxChange}   />
            <PopoverSlider label="Interface"      value={ui}    onChange={onUiChange}    />
          </div>

          {/* P16-43 + P16-7 (s87): dropped "Run" section header. Verb-only
              labels: "Restart" (destructive — confirms) / "Quit" (preserves
              save — no confirm; main-menu Continue resumes from this beat). */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
            {pendingAction === 'restart' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'rgba(220,110,110,0.9)' }}>
                <span style={{ flex: 1 }}>Lose this run?</span>
                <button onClick={confirmAction} style={confirmBtnStyle}>Confirm</button>
                <button onClick={cancelAction}  style={cancelBtnStyle}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <button onClick={() => { playSfx('click'); setPendingAction('restart') }} style={runRowStyle}>
                  ↻ Restart
                </button>
                <button onClick={quitToMenu} style={runRowStyle}>
                  ✕ Quit
                </button>
                <button style={runRowStyle} onClick={() => { playSfx('click'); setFeedbackOpen(true) }}>
                  ✉ Send feedback
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {feedbackOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 700,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setFeedbackOpen(false) }}
        >
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '1.2rem',
            width: 'min(92vw, 360px)',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Leave feedback
            </div>
            <FeedbackForm triggeredBy="menu_button" godPath={activeGod} week={week} cardId={currentCardId} onDone={() => setFeedbackOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PopoverSlider helper ─────────────────────────────────────────────────────

function PopoverSlider({ label, value, onChange }: {
  label: string
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div style={{ marginBottom: '0.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(200,185,155,0.7)', marginBottom: '0.15rem' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text-dim)' }}>{value}%</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={onChange}
        onClick={e => e.stopPropagation()}
        className="settings-slider"
        style={{ width: '100%' }}
      />
    </div>
  )
}
