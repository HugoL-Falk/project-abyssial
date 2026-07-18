import { useRef, useEffect, useState } from 'react'
import { MenuButton } from './shared/MenuButton'
import { useGameStore } from '../state'
import { loadSaveData } from '../engine/persistence'
import { loadTutorialComplete } from '../engine/blessings'
import { SettingsModal } from './SettingsModal'
import { playSfx, playMenuMusic } from '../engine/audio'

const GOD_LABEL: Record<string, string> = {
  yha_nthlei:     "Y'ha-nthlei",
  nyarlathotep:   'Nyarlathotep',
  shub_niggurath: 'Shub-Niggurath',
}

const TRIM = 0.5  // seconds trimmed from each end
const FADE = 0.8  // fade in / fade out duration in seconds

export function MainMenu() {
  const goToPhase      = useGameStore(s => s.goToPhase)
  const loadRun        = useGameStore(s => s.loadRun)
  const skipTutorial   = useGameStore(s => s.skipTutorial)
  const saveInfo       = loadSaveData()
  const tutorialDone   = loadTutorialComplete()

  // First-launch tutorial prompt
  const [showPrompt, setShowPrompt] = useState(!tutorialDone)

  // Settings modal
  const [showSettings, setShowSettings] = useState(false)

  // P17-22: always start on the intro splash, even on reload. The
  // sessionStorage 'seenIntro' marker is still written by advance() so a
  // future setting can opt back into skipping if desired.
  const [phase, setPhase]               = useState<'splash' | 'menu'>('splash')
  const [splashOpacity, setSplashOpacity] = useState(0)
  const [blackFade,     setBlackFade]     = useState<'in' | 'out' | null>(null)
  const splashRef = useRef<HTMLVideoElement>(null)

  function crossFade(then: () => void) {
    setBlackFade('in')
    setTimeout(() => { then(); setBlackFade('out') }, 380)
    setTimeout(() => setBlackFade(null), 760)
  }

  // Intro video control — always mounted; reset+play on splash enter, pause on exit
  useEffect(() => {
    const v = splashRef.current
    if (!v) return

    if (phase !== 'splash') { v.pause(); return }

    // (Re-)entering splash: reset to trim point and fade from black
    v.currentTime = TRIM
    setSplashOpacity(0)
    v.play().catch(() => {})

    const onTime = () => {
      const t   = v.currentTime
      const end = v.duration - TRIM
      if (!end || isNaN(end)) return
      if (t >= end) { v.currentTime = TRIM; return }
      setSplashOpacity(Math.min(
        Math.min(1, (t - TRIM) / FADE),
        Math.min(1, (end - t) / FADE),
      ))
    }
    v.addEventListener('timeupdate', onTime)
    return () => v.removeEventListener('timeupdate', onTime)
  }, [phase])

  // Advance from splash on any keypress
  useEffect(() => {
    if (phase !== 'splash') return
    const onKey = () => advance()
    document.addEventListener('keydown', onKey, { once: true })
    return () => document.removeEventListener('keydown', onKey)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    if (phase !== 'splash') return
    playSfx('click')
    sessionStorage.setItem('seenIntro', '1')
    crossFade(() => {
      setPhase('menu')
      // Switch music + thunder back to menu when leaving splash
      playMenuMusic('menu')
    })
  }

  // ── Shared styles ──────────────────────────────────────────────────────────

  const videoStyle = (opacity: number): React.CSSProperties => ({
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    objectFit: 'cover', zIndex: 0,
    opacity,
    // P19-12: splash intro had no brightness filter (was much darker than the
    // menu video); match the bumped menu brightness so the splash isn't dim.
    filter: 'brightness(1.7)',
    transition: 'opacity 0.05s linear',
  })

  const vignetteStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.75) 100%)',
    zIndex: 1,
  }

  const contentStyle: React.CSSProperties = {
    position: 'relative', zIndex: 2,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '100%', padding: '2.5rem 2rem', gap: '3.5rem',
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: 'var(--title-font)',
    fontSize: '2.4rem', fontWeight: 400,
    color: 'var(--gold)', letterSpacing: '0.1em',
    textTransform: 'uppercase', lineHeight: 1.15,
    textShadow: '0 2px 28px rgba(0,0,0,0.9)',
    textAlign: 'center',
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>

      {/* Intro video — always mounted so browser retains buffer; hidden when not on splash */}
      <video
        ref={splashRef}
        src="/intro.mp4"
        autoPlay muted playsInline preload="auto"
        style={{ ...videoStyle(splashOpacity), display: phase === 'splash' ? 'block' : 'none' }}
      />

      {/* ── Splash screen ── */}
      {phase === 'splash' && (
        <div
          className="screen-fade"
          style={{ position: 'absolute', inset: 0 }}
          onClick={advance}
        >
          <div style={vignetteStyle} />
          <div style={contentStyle}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                <h1 style={titleStyle}>Project<br />Abyssial</h1>
                {/* P22-25: increased size + weight for intro subtitle */}
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>
                  A ritual of debt and darkness
                </p>
              </div>
              {/* P22-25: increased size + weight for tap-to-start */}
              <p style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                animation: 'pulsePrompt 2.4s ease-in-out infinite',
              }}>
                Tap anywhere to start
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main menu ── */}
      {phase === 'menu' && (
        <div className="screen-fade" style={{ position: 'absolute', inset: 0 }}>

          {/* Bottom scrim — darkens lower portion for card contrast */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.38) 65%, transparent 100%)',
            zIndex: 1, pointerEvents: 'none',
          }} />

          {/* Navigation — 3-tile vertical stack, pinned to bottom third */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', padding: '0 1.75rem 1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <button className="menu-card" disabled={!saveInfo}
                onClick={() => { if (saveInfo) { playSfx('click'); loadRun() } }}
                style={{ background: 'rgba(8,6,3,0.91)' }}>
                <div style={{ fontSize: '0.9rem', fontVariant: 'small-caps', color: saveInfo ? 'var(--gold)' : 'rgba(160,140,110,0.4)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Continue</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.85 }}>
                  {saveInfo
                    ? `Turn ${saveInfo.turnCount} · ${GOD_LABEL[saveInfo.runConfig.godPath] ?? saveInfo.runConfig.godPath}`
                    : 'No save found'}
                </div>
              </button>
              <button className="menu-card"
                onClick={() => { playSfx('click'); goToPhase('godPathSelect') }}
                style={{ background: 'rgba(8,6,3,0.91)' }}>
                <div style={{ fontSize: '0.9rem', fontVariant: 'small-caps', color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>New</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.85 }}>Begin a new ritual</div>
              </button>
              <button className="menu-card"
                onClick={() => { playSfx('click'); setShowSettings(true) }}
                style={{ background: 'rgba(8,6,3,0.91)' }}>
                <div style={{ fontSize: '0.9rem', fontVariant: 'small-caps', color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Settings</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.85 }}>Audio, card back, &amp; more</div>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ── First-launch tutorial prompt ── */}
      {showPrompt && phase === 'menu' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.75rem 1.5rem',
            maxWidth: '320px',
            width: '100%',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--gold)', fontVariant: 'small-caps', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
                The cult haven't seen you before.
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text)', lineHeight: 1.65 }}>
                Running a cult requires a certain baseline of competence. We recommend the introduction
                before attempting a real summoning — for your sake, and for the congregation's.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <MenuButton variant="primary" style={{ width: '100%', minWidth: 0 }} onClick={() => { playSfx('click'); setShowPrompt(false); goToPhase('intro') }}>
                Walk me through it
              </MenuButton>
              <MenuButton variant="secondary" style={{ width: '100%', minWidth: 0, fontSize: '0.72rem', opacity: 0.75 }} onClick={() => { playSfx('click'); setShowPrompt(false); skipTutorial() }}>
                I know enough
              </MenuButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings modal ── */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onReplayIntro={() => {
            setShowSettings(false)
            crossFade(() => {
              sessionStorage.removeItem('seenIntro')
              setPhase('splash')
              // Switch music + thunder to match intro.mp4 video during splash.
              // Pass the splash video element so thunder rAF syncs to intro.mp4, not menu.mp4.
              playMenuMusic('intro', splashRef.current)
            })
          }}
        />
      )}

      {/* Black fade overlay for transitions */}
      {blackFade && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 99,
          background: 'black',
          opacity: blackFade === 'in' ? 1 : 0,
          transition: 'opacity 0.36s ease',
          pointerEvents: 'none',
        }} />
      )}

    </div>
  )
}
