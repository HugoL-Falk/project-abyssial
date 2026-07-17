import { useRef, useEffect, useState } from 'react'
import { useGameStore } from './state'
import { captureRunStarted } from './lib/telemetry'
import { IntroScreen } from './components/IntroScreen'
import { preloadAudio, preloadGodMusic, playMusic, stopMusic, setMusicTheme, playMenuMusic, unlockAudio } from './engine/audio'
import { setStormVideoEl } from './engine/stormAmbience'
import { MainMenu } from './components/MainMenu'
import { GodPathSelectScreen, BlessingSelectScreen } from './components/SetupScreens'
import { GameScreen } from './components/GameScreen'
import { FailureScreen } from './components/FailureScreen'
import { VictoryScreen } from './components/VictoryScreen'
import { TutorialCompleteScreen } from './components/TutorialCompleteScreen'
import { PasswordGate } from './components/PasswordGate'
import { LoadingScreen } from './components/LoadingScreen'

const TRIM = 0.5
const FADE = 0.8
const PRE_RUN_PHASES = ['intro', 'menu', 'godPathSelect', 'blessingSelect']

export default function App() {
  const phase       = useGameStore(s => s.phase)
  const runConfig   = useGameStore(s => s.runConfig)
  const isPreRun    = PRE_RUN_PHASES.includes(phase)
  const isTutorialVictory = phase === 'victory' && runConfig?.isTutorial === true

  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoOpacity, setVideoOpacity] = useState(0)
  const [audioReady,   setAudioReady]   = useState(false)
  const [overlayGone,  setOverlayGone]  = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)      // 0–1

  // Fade logic — listeners registered once on mount, always active
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onMeta = () => { v.currentTime = TRIM }
    const onTime = () => {
      const t   = v.currentTime
      const end = v.duration - TRIM
      if (!end || isNaN(end)) return
      if (t >= end) { v.currentTime = TRIM; return }
      setVideoOpacity(Math.min(
        Math.min(1, (t - TRIM) / FADE),
        Math.min(1, (end - t) / FADE),
      ))
    }
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('timeupdate',     onTime)
    return () => {
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('timeupdate',     onTime)
    }
  }, [])

  // Play/pause menu video — keeps element mounted so browser retains buffer
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (isPreRun) v.play().catch(() => {})
    else          v.pause()
  }, [isPreRun])

  // Sync thunder schedule to the video's playback position
  useEffect(() => {
    setStormVideoEl(videoRef.current)
  }, [])

  // Preload all audio assets once on mount; hold loading overlay until done + 1.5 s min
  useEffect(() => {
    let active = true
    const min  = new Promise<void>(r => setTimeout(r, 1500))
    const load = preloadAudio((n, total) => { if (active) setLoadProgress(n / total) })
    Promise.all([min, load]).then(() => { if (active) setAudioReady(true) })
    return () => { active = false }
  }, [])

  // Pre-buffer god music as soon as godPath is known (blessingSelect phase).
  // God music files are 50–107 MB WAVs; they need time to buffer before gameplay
  // starts so setMusicTheme finds them in cache and plays without crackling.
  useEffect(() => {
    if (runConfig?.godPath) preloadGodMusic(runConfig.godPath)
  }, [runConfig?.godPath])

  // Phase-based music routing + weekly escalation
  const reshuffleCount = useGameStore(s => s.reshuffleCount)
  useEffect(() => {
    switch (phase) {
      case 'intro':
        playMenuMusic('intro')
        break
      case 'menu':
      case 'godPathSelect':
      case 'blessingSelect':
        playMenuMusic('menu')
        break
      case 'playing': {
        // Tutorial uses 'olgreth' godPath which has no music — fall back to Yha.
        const musicPath = runConfig?.isTutorial ? 'yha_nthlei' : runConfig?.godPath
        if (musicPath) setMusicTheme(musicPath, reshuffleCount)
        break
      }
      case 'victory':
        playMusic('victory')
        break
      case 'gameOver':
        playMusic('gameOver')
        break
      default:
        stopMusic()
    }
  }, [phase, runConfig?.godPath, reshuffleCount])

  // Fire run_started telemetry only on a truly new run (turnCount === 0), not on Continue
  const turnCount = useGameStore(s => s.turnCount)
  useEffect(() => {
    if (phase === 'playing' && runConfig && turnCount === 0) {
      captureRunStarted(runConfig.godPath ?? 'unknown', runConfig.isTutorial ?? false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return (
    <PasswordGate>
      <div onClick={unlockAudio} style={{
        height: '100dvh',
        maxWidth: '480px',
        margin: '0 auto',
        background: 'var(--bg)',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Loading overlay — covers everything until audio is ready */}
        {!overlayGone && (
          <LoadingScreen
            progress={loadProgress}
            fadeOut={audioReady}
            onFadeEnd={() => setOverlayGone(true)}
          />
        )}

        {/* Menu video — always mounted so browser retains buffer; opacity hides it during gameplay */}
        <video
          ref={videoRef}
          src="/menu.mp4"
          autoPlay muted playsInline preload="auto"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', zIndex: 0,
            opacity: isPreRun ? videoOpacity : 0,
            // P19-12: bumped 1.5 -> 1.7; videos read very dark in playtest.
            filter: 'brightness(1.7)',
            transition: 'opacity 0.05s linear',
            pointerEvents: 'none',
          }}
        />

        {/* Vignette overlay */}
        {isPreRun && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.75) 100%)',
            pointerEvents: 'none',
          }} />
        )}

        {/* Screen content */}
        <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {phase === 'intro'          && <IntroScreen />}
          {phase === 'menu'           && <MainMenu />}
          {phase === 'godPathSelect'  && <GodPathSelectScreen />}
          {phase === 'blessingSelect' && <BlessingSelectScreen />}
          {phase === 'playing'        && <GameScreen />}
          {phase === 'gameOver'       && <FailureScreen />}
          {isTutorialVictory          && <TutorialCompleteScreen />}
          {phase === 'victory' && !isTutorialVictory && <VictoryScreen />}
        </div>

      </div>
    </PasswordGate>
  )
}
