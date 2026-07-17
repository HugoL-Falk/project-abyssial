import { useState } from 'react'
import { useGameStore } from '../state'
import { CARD_BACKS } from '../data/cardBacks'
import {
  getMusicVolume, setMusicVolume,
  getSfxVolume,   setSfxVolume,
  getUiVolume,    setUiVolume,
  getCardBackSlug, setCardBackSlug,
} from '../engine/audioSettings'
import { playSfx, applyMusicVolume, applySfxVolume } from '../engine/audio'
import { isGodsUnlocked, attemptGodUnlock, isUnlockFieldVisible } from '../lib/unlock'

interface Props {
  onClose: () => void
  onReplayIntro?: () => void
}

const menuActionRowStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  textAlign: 'left',
  padding: '0.55rem 0.7rem',
  fontSize: '0.78rem',
  fontFamily: 'var(--ui-font)',
  fontWeight: 600,
  letterSpacing: '0.06em',
  cursor: 'pointer',
}

export function SettingsModal({ onClose, onReplayIntro }: Props) {
  const startTutorial = useGameStore(s => s.startTutorial)
  const [music, setMusic] = useState(getMusicVolume())
  const [sfx,   setSfx]   = useState(getSfxVolume())
  const [ui,    setUi]    = useState(getUiVolume())
  const [back,  setBack]  = useState(getCardBackSlug())
  const [unlockInput,   setUnlockInput]   = useState('')
  const [unlockResult,  setUnlockResult]  = useState<'idle' | 'ok' | 'fail'>('idle')
  const alreadyUnlocked = isGodsUnlocked()

  function onMusicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value)
    setMusic(v)
    setMusicVolume(v)
    applyMusicVolume()
  }

  function onSfxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value)
    setSfx(v)
    setSfxVolume(v)
    applySfxVolume()
  }

function onUiChange(e: React.ChangeEvent<HTMLInputElement>) {
  const v = Number(e.target.value)
  setUi(v)
  setUiVolume(v)
}

  function onBackPick(slug: string) {
    setBack(slug)
    setCardBackSlug(slug)
    playSfx('click')
  }

  function onCloseClick() {
    playSfx('click')
    onClose()
  }

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}
      onClick={onCloseClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '1.5rem 1.4rem 1.4rem',
          maxWidth: '320px',
          width: '100%',
          display: 'flex', flexDirection: 'column', gap: '1.25rem',
          position: 'relative',
        }}
      >
        {/* X close */}
        <button
          onClick={onCloseClick}
          aria-label="Close settings"
          style={{
            position: 'absolute', top: '0.6rem', right: '0.6rem',
            background: 'none', border: 'none',
            color: 'var(--text-dim)', fontSize: '1.8rem',
            lineHeight: 1,
            cursor: 'pointer', padding: '0.2rem 0.4rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>

        {/* Audio section */}
        <div>
          <div style={{ fontSize: '0.92rem', color: 'var(--gold)', fontFamily: 'var(--title-font)', fontVariant: 'small-caps', letterSpacing: '0.08em', marginBottom: '0.8rem' }}>
            Audio
          </div>
          <SliderRow label="Music"          value={music} onChange={onMusicChange} />
          <SliderRow label="Sound Effects"  value={sfx}   onChange={onSfxChange}   />
          <SliderRow label="Interface"      value={ui}    onChange={onUiChange}    />
        </div>

        {/* Card back section */}
        <div>
          <div style={{ fontSize: '0.92rem', color: 'var(--gold)', fontFamily: 'var(--title-font)', fontVariant: 'small-caps', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
            Card Back
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', padding: '0.3rem 0.1rem' }}>
            {CARD_BACKS.map(cb => (
              <button
                key={cb.slug}
                onClick={() => onBackPick(cb.slug)}
                title={cb.label}
                style={{
                  flexShrink: 0,
                  width: '56px', height: '84px',
                  padding: 0, background: '#000',
                  border: `2px solid ${back === cb.slug ? 'var(--gold)' : 'transparent'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                <img
                  src={`/cardbacks/${cb.file}`}
                  alt={cb.label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* ── Replay actions ── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => { playSfx('click'); onClose(); startTutorial() }}
            style={menuActionRowStyle}>
            Replay Tutorial
          </button>
          <button
            onClick={() => { playSfx('click'); onReplayIntro?.() }}
            disabled={!onReplayIntro}
            style={{ ...menuActionRowStyle, opacity: onReplayIntro ? 1 : 0.4 }}>
            Replay Intro
          </button>
          <button disabled style={{ ...menuActionRowStyle, opacity: 0.4, cursor: 'default' }}>
            Codex — soon
          </button>
        </div>

        {isUnlockFieldVisible() && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--title-font)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {alreadyUnlocked ? 'All gods unlocked ✓' : 'Unlock additional content'}
            </div>
            {!alreadyUnlocked && (
              <>
                <input
                  type="password"
                  value={unlockInput}
                  onChange={e => { setUnlockInput(e.target.value); setUnlockResult('idle') }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setUnlockResult(attemptGodUnlock(unlockInput) ? 'ok' : 'fail')
                      setUnlockInput('')
                    }
                  }}
                  placeholder="Unlock code"
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontFamily: 'var(--ui-font)', fontSize: '0.85rem',
                    padding: '0.5rem 0.75rem', borderRadius: '2px', width: '100%', boxSizing: 'border-box',
                  }}
                />
                {unlockResult === 'ok'   && <div style={{ fontSize: '0.78rem', color: 'var(--gold)' }}>Unlocked. Return to god selection.</div>}
                {unlockResult === 'fail' && <div style={{ fontSize: '0.78rem', color: 'var(--red-bright)' }}>Incorrect code.</div>}
              </>
            )}
          </div>
        )}

        <button className="btn-secondary" onClick={onCloseClick}>
          Close
        </button>
      </div>
    </div>
  )
}

interface SliderRowProps {
  label: string
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function SliderRow({ label, value, onChange }: SliderRowProps) {
  return (
    <div style={{ marginBottom: '0.8rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '0.35rem',
      }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={onChange}
        className="settings-slider"
      />
    </div>
  )
}
