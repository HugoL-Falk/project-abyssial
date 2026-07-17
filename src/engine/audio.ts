import { getMusicVolume, getUiVolume, getSfxVolume } from './audioSettings'
import { SFX_PATHS, MUSIC_PATHS, musicTier, GOD_LAYERS, GOD_VOLUME_SCALE } from './audioManifest'
import { startStorm, stopStorm, applyStormVolume, retryRain, switchStormSchedule } from './stormAmbience'

// ─── Audio unlock (browser autoplay policy) ──────────────────────────────────
// Modern Chrome blocks audio.play() until the user has interacted with the page.
// We use a silent AudioContext that gets resumed on the first click.
// Once resumed, all HTMLAudioElement.play() calls work.

let audioUnlocked = false
let pendingMusicFn: (() => void) | null = null

/** Call on first user click to unlock the browser's audio subsystem. */
export function unlockAudio(): void {
  if (audioUnlocked) return
  audioUnlocked = true

  // Create a silent AudioContext and resume it — the user gesture (click)
  // makes the resume succeed, which permanently unlocks audio for the session.
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start()
    ctx.resume()
    setTimeout(() => ctx.close(), 50)
  } catch { /* audio not available */ }

  // Flush any music playback that was queued before unlock
  if (pendingMusicFn) {
    pendingMusicFn()
    pendingMusicFn = null
  }

  // Retry rain if it was blocked by autoplay
  retryRain()
}

// ─── Preloader ─────────────────────────────────────────────────────────────────
// Caches audio assets as HTMLAudioElements. Missing assets store null.
// Two phases: essential (on mount — SFX, intro, menu) and lazy (god music, loaded on demand).

const cache = new Map<string, HTMLAudioElement | null>()
const PRELOAD_TIMEOUT = 15_000 // 15s per file, then give up

/** Return the music paths needed immediately (intro + menu only). */
function essentialMusicPaths(): string[] {
  const paths: string[] = []
  const immediate = ['menu', 'intro']
  for (const k of immediate) {
    const v = MUSIC_PATHS[k]
    if (Array.isArray(v)) paths.push(...v)
    else if (v) paths.push(v)
  }
  return paths
}

function preloadOne(path: string, timeoutMs = PRELOAD_TIMEOUT): Promise<HTMLAudioElement | null> {
  return new Promise(resolve => {
    const audio = new Audio()
    audio.preload = 'auto'

    let settled = false
    const finish = (val: HTMLAudioElement | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      audio.oncanplaythrough = null
      audio.onerror = null
      resolve(val)
    }

    const timer = setTimeout(() => finish(null), timeoutMs)
    audio.oncanplaythrough = () => finish(audio)
    audio.onerror = () => finish(null)
    audio.src = path
    audio.load()
  })
}

/** Preload only essential audio (SFX + immediate music). Runs once on mount. */
export async function preloadAudio(
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const allPaths = [...Object.values(SFX_PATHS), ...essentialMusicPaths()]
  let loaded = 0
  const total = allPaths.length
  const results = await Promise.allSettled(
    allPaths.map(p =>
      preloadOne(p).then(r => { onProgress?.(++loaded, total); return r })
    )
  )
  allPaths.forEach((p, i) => {
    const r = results[i]
    cache.set(p, r.status === 'fulfilled' ? r.value : null)
  })

  // If audio is already unlocked (user clicked before preload finished),
  // flush any pending music playback now that files are cached.
  if (audioUnlocked && pendingMusicFn) {
    pendingMusicFn()
    pendingMusicFn = null
  }
}

/** Lazy-preload god-layer music for the given path.
 *  Export so App.tsx can trigger this early (e.g. on god-path selection)
 *  giving the 50–107 MB WAV files time to buffer before gameplay starts. */
export async function preloadGodMusic(godPath: string): Promise<void> {
  const tiers = GOD_LAYERS[godPath]
  if (!tiers) return
  const paths: string[] = []
  for (const tier of tiers) {
    paths.push(tier.base)
    paths.push(...tier.overlays)
  }
  // Only preload files NOT already in cache
  const needed = paths.filter(p => !cache.has(p))
  if (needed.length === 0) return
  const results = await Promise.allSettled(needed.map(p => preloadOne(p)))
  needed.forEach((p, i) => {
    const r = results[i]
    if (!cache.has(p)) cache.set(p, r.status === 'fulfilled' ? r.value : null)
  })
}

// ─── SFX pool ──────────────────────────────────────────────────────────────────
// 3 reusable elements per key, round-robin. No allocation on play.

const SFX_POOL_SIZE = 3
interface SfxPool {
  els: HTMLAudioElement[]
  idx: number
}

const sfxPools = new Map<string, SfxPool>()

function getPool(key: string): SfxPool {
  let pool = sfxPools.get(key)
  if (!pool) {
    const path = SFX_PATHS[key] ?? ''
    const els = Array.from({ length: SFX_POOL_SIZE }, () => {
      const el = new Audio()
      if (path) el.src = path
      return el
    })
    pool = { els, idx: 0 }
    sfxPools.set(key, pool)
  }
  return pool
}

// Per-key volume attenuation on top of the slider level.
// These compensate for source files that are perceptually louder than music
// even after normalisation (P25-10). Tune in playtests.
const SFX_KEY_VOLUME_SCALE: Record<string, number> = {
  cardDraw:      0.60, // card flip is sharp; bring well under music level
  click:         0.80, // muffled click; still audible but less intrusive
  optionResolve: 0.80, // same file as click
}

export function playSfx(key: string): void {
  // UI-specific keys (clicks, page flips, etc.) use the UI volume slider.
  const UI_SFX_KEYS = new Set(['click', 'cardDraw', 'cardPreviewOpen', 'optionResolve', 'pageTurn'])

  // 'click' also serves as the audio unlock trigger — always call unlockAudio
  if (key === 'click') {
    unlockAudio()
  }

  const path = SFX_PATHS[key]
  if (!path) return

  // null = known missing (preload tried and failed) — skip silently
  if (cache.get(path) === null) return

  // Determine which volume slider applies.
  const vol = UI_SFX_KEYS.has(key) ? getUiVolume() : getSfxVolume()
  if (vol <= 0) return

  // Always use pool (round-robin across 3 elements) so rapid triggers don't
  // interrupt a still-playing element, which caused crackle/pop artefacts.
  const pool = getPool(key)
  const el = pool.els[pool.idx++ % SFX_POOL_SIZE]
  try {
    el.volume = (vol / 100) * (SFX_KEY_VOLUME_SCALE[key] ?? 1)
    el.currentTime = 0
    el.play().catch(() => {})
  } catch { /* silent */ }
}

// ─── Music playback helper ─────────────────────────────────────────────────────
// Use the preloaded cached element directly for menu/intro/victory music.
// AbortError (pause+seek race) is handled with a fast retry inside startLoop.
// Cloning was removed: it causes re-buffering of 2–18 MB files from HTTP cache,
// producing startup silence and multi-second replay delays.

/** Return the cached Audio element, or a fresh element if not yet preloaded.
 *  Returns null only if the asset is known-missing (preload failed/timed out). */
function getPlaybackEl(path: string): HTMLAudioElement | null {
  const el = cache.get(path)
  if (el === null) return null   // known missing — skip silently
  if (el) return el              // preloaded — use directly; startLoop handles AbortError
  // Cache miss (preload not yet complete) — stream fresh; startLoop retries on error
  const fresh = new Audio(path)
  fresh.preload = 'auto'
  return fresh
}

// ─── Music manager (supports layered tracks) ────────────────────────────────────
// Each god can have a base track + overlay tracks playing simultaneously.
// Uses arrays of elements with individual ended handlers for reliable looping.

let musicLayers: HTMLAudioElement[] = []
let currentLayerUrls: string[] = []

/** Start playing an audio element as a reliable loop. Returns true on success. */
function startLoop(el: HTMLAudioElement, volume: number): boolean {
  el.loop = true
  el.volume = volume
  el.currentTime = 0

  // Note: NO ended-event fallback here.  Native `loop=true` is reliable in all
  // modern browsers, and adding an ended-handler that also seeks + plays causes
  // a double-play glitch (crackle/pop) at every loop boundary.

  musicLayers.push(el)

  if (!audioUnlocked) return false

  try {
    const promise = el.play()
    if (promise) {
      promise.catch((err?: unknown) => {
        const retry = () => el.play().catch(() => {})
        if (el.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
          // File not buffered yet — wait for enough data before retrying
          el.addEventListener('canplaythrough', retry, { once: true })
        } else if ((err as DOMException)?.name === 'AbortError') {
          // Pause + seek race: browser aborted play() to service the currentTime
          // reset. A 50 ms defer lets the seek settle before retrying.
          setTimeout(retry, 50)
        } else {
          // Other transient failures — retry after a short delay
          setTimeout(retry, 100)
        }
      })
    }
    return true
  } catch {
    return false
  }
}


export function playMusic(key: string): void {
  // Storm stops when gameplay ends (victory/gameOver)
  stopStorm()

  const entry = MUSIC_PATHS[key]
  if (!entry) return

  const path = Array.isArray(entry) ? (entry[0] ?? '') : entry
  if (!path) return

  // If this single track is already the only thing playing, just adjust volume
  if (currentLayerUrls.length === 1 && currentLayerUrls[0].endsWith(path) && musicLayers.length > 0) {
    for (const el of musicLayers) {
      try { el.volume = getMusicVolume() / 100 } catch { /* noop */ }
    }
    return
  }

  stopMusic()

  const el = getPlaybackEl(path)
  if (!el) return

  const ok = startLoop(el, getMusicVolume() / 100)
  // Keep currentLayerUrls consistent with musicLayers so subsequent calls
  // (e.g. playMenuMusic after gameOver) can correctly detect what's playing.
  if (ok) currentLayerUrls = [path]
  if (!ok && !pendingMusicFn) {
    pendingMusicFn = () => {
      musicLayers = []
      currentLayerUrls = []
      playMusic(key)
    }
  }
}

export function stopMusic(): void {
  // Cancel any queued-but-not-yet-started music retry so that stale
  // pendingMusicFn from a previous phase (e.g. intro) can't fire after
  // the phase has already moved on (e.g. menu). Each music function sets
  // a new pendingMusicFn after calling stopMusic() if needed.
  pendingMusicFn = null
  for (const el of musicLayers) {
    try { el.pause() } catch { /* noop */ }
  }
  musicLayers = []
  currentLayerUrls = []
}

// ─── Menu music + storm layering ──────────────────────────────────────────────
// Plays the menu loop AND the storm (rain + thunder) simultaneously.
// Menu/intro music is ambient background — kept quiet relative to thunder.
const MENU_MUSIC_VOLUME_SCALE = 0.15

export function playMenuMusic(phase: 'intro' | 'menu' = 'menu', videoEl?: HTMLVideoElement | null): void {
  // P25-33/34 DEBUG — remove after live investigation
  console.log('[AUDIO] playMenuMusic called', {
    phase,
    audioUnlocked,
    currentLayerUrls: [...currentLayerUrls],
    musicLayersCount: musicLayers.length,
    hasPendingMusicFn: !!pendingMusicFn,
  })
  // Choose appropriate music track for intro or menu
  const path = (phase === 'intro' ? (MUSIC_PATHS.intro as string | undefined) : (MUSIC_PATHS.menu as string | undefined))
  if (path) {
    if (currentLayerUrls.some(u => u.endsWith(path))) {
      // P25-33 fix: this path is already the intended track (playing or queued-but-locked).
      // Don't call stopMusic — that would clear the pendingMusicFn set by the prior call.
      // Just refresh volume if something is audible, then fall through to startStorm.
      if (musicLayers.some(el => !el.paused)) applyMusicVolume()
    } else {
      const el = getPlaybackEl(path)
      if (el) {
        stopMusic()
        // Mark the intended URL immediately so any re-entrant call (e.g. StrictMode
        // double-invoke) sees it and skips the stopMusic path above.
        currentLayerUrls = [path]
        const ok = startLoop(el, (getMusicVolume() / 100) * MENU_MUSIC_VOLUME_SCALE)
        if (!ok && !pendingMusicFn) {
          pendingMusicFn = () => {
            musicLayers = []
            currentLayerUrls = []
            playMenuMusic(phase, videoEl)
          }
        }
      }
    }
  }

  // Layer storm on top (pass optional video element for thunder sync)
  startStorm(phase, videoEl)
}

export function applyMusicVolume(): void {
  for (const el of musicLayers) {
    try { el.volume = getMusicVolume() / 100 } catch { /* noop */ }
  }
}

// Pause the music without resetting the state (used for background tab handling)
export function pauseMusic(): void {
  for (const el of musicLayers) {
    try { el.pause() } catch { /* noop */ }
  }
}

// Resume music if it was paused (used when tab becomes visible again)
export function resumeMusic(): void {
  for (const el of musicLayers) {
    try {
      const promise = el.play()
      if (promise) promise.catch(() => {})
    } catch { /* noop */ }
  }
}

/** Updates storm ambience volume to match the current Sound Effects slider. */
export function applySfxVolume(): void {
  applyStormVolume()
}

// ─── Weekly escalation (layered god music) ────────────────────────────────────

export function setMusicTheme(godPath: string, reshuffleCount: number): void {
  // Storm stops when gameplay starts
  stopStorm()

  const layers = GOD_LAYERS[godPath]
  if (!layers) return

  const tier = musicTier(reshuffleCount)
  const tierLayers = layers[tier]
  if (!tierLayers) return

  // Build the URL set for this tier
  const wantUrls = [tierLayers.base, ...tierLayers.overlays]

  // If already playing all the right layers and at least one is audible — just update volume
  if (currentLayerUrls.length === wantUrls.length &&
      currentLayerUrls.every((u, i) => u.endsWith(wantUrls[i])) &&
      musicLayers.some(el => !el.paused)) {
    applyMusicVolume()
    return
  }

  // Remove layers no longer in wantUrls (reverse-iterate so splices don't shift indices)
  for (let i = musicLayers.length - 1; i >= 0; i--) {
    const url = currentLayerUrls[i] ?? ''
    if (!wantUrls.some(w => url.endsWith(w))) {
      try { musicLayers[i].pause() } catch { /* noop */ }
      musicLayers.splice(i, 1)
      currentLayerUrls.splice(i, 1)
    }
  }
  pendingMusicFn = null  // cancel any stale retry from a prior tier

  // Kick off lazy preload; flush pending when files are ready
  preloadGodMusic(godPath).then(() => {
    if (pendingMusicFn) { pendingMusicFn(); pendingMusicFn = null }
  })

  const godScale = GOD_VOLUME_SCALE[godPath] ?? 1
  const vol = (getMusicVolume() / 100) * godScale

  // Add layers that are wanted but not yet playing (base continues without restart)
  for (const url of wantUrls) {
    if (currentLayerUrls.some(u => u.endsWith(url))) continue  // already active
    const el = cache.get(url)
    if (!el) continue  // not cached yet — pendingMusicFn will retry
    const isBase = url === tierLayers.base
    if (startLoop(el, isBase ? vol : vol * 0.6)) {
      currentLayerUrls.push(url)
    }
  }

  // Some expected layers weren't cached yet — retry when preload completes
  if (musicLayers.length < wantUrls.length && !pendingMusicFn) {
    pendingMusicFn = () => {
      for (const el of musicLayers) { try { el.pause() } catch {} }
      musicLayers = []
      currentLayerUrls = []
      setMusicTheme(godPath, reshuffleCount)
    }
  }
}

// ─── App background handling ────────────────────────────────────────────────────
// Pauses music when the app loses visibility or focus; resumes on return.
// This is a standalone handler (not tied to the storm lifecycle) so it works
// during gameplay too, where storm visibility handling is not active.
// pauseMusic/resumeMusic are idempotent so no conflict with storm's own handler.

function initBackgroundHandlers(): void {
  // Unlock audio on the very first pointer event anywhere — this catches
  // password gate button clicks that happen before the App's onClick div
  // is rendered, so intro music can start immediately on fresh load.
  document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true })

  const onBlur = () => pauseMusic()
  const onFocus = () => resumeMusic()

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseMusic()
    else resumeMusic()
  })

  window.addEventListener('blur', onBlur)
  window.addEventListener('focus', onFocus)
}

// Initialize once at module load — guarded so Node/test environments don't error
// when this module is imported by a component (document is undefined in vitest/node)
if (typeof document !== 'undefined') {
  initBackgroundHandlers()
}

// ─── Re-exports for backward compat ────────────────────────────────────────────
export type SfxKey = string
export { switchStormSchedule }
