// ─── Storm ambience: rain + thunder ───────────────────────────────────────────
// Plays a rain loop (rain-on-windows) with flash-synced thunder strikes.
// Per-size short thunder files play in full (no slicing).
// Volume follows the Sound Effects slider.
// Drops out when the browser tab is hidden.

import { getSfxVolume } from './audioSettings'
import { pauseMusic, resumeMusic } from './audio'

// ─── Schedule types ───────────────────────────────────────────────────────────

export interface FlashEvent {
  time: number       // seconds from storm start
  area: number       // percentage of bright pixels (0-100)
  size: string       // 'XS' | 'S' | 'M' | 'L' | 'XL'
}

// Flash schedules extracted from video analysis at threshold 15.
const INTRO_SCHEDULE: FlashEvent[] = [
  { time: 5.67,  area: 63, size: "S"  },
  { time: 7.05,  area: 66, size: "XL" },
  { time: 6.79,  area: 70, size: "M"  },
  { time: 7.75,  area: 66, size: "M"  },
  { time: 12.04, area: 64, size: "XS" },
  { time: 18.83, area: 63, size: "M"  },
  { time: 22.34, area: 57, size: "L"  },
  { time: 24.73, area: 59, size: "XS" },
  { time: 25.63, area: 63, size: "L"  },
  { time: 26.65, area: 65, size: "S"  },
  { time: 28.26, area: 62, size: "XS" },
  { time: 31.80, area: 61, size: "L"  },
  { time: 32.81, area: 69, size: "XL" },
  { time: 38.20, area: 63, size: "S"  },
]

const MENU_SCHEDULE: FlashEvent[] = [
  { time: 7.53,  area: 36, size: "XS" },
  { time: 8.02,  area: 43, size: "S"  },
  { time: 8.47,  area: 46, size: "S"  },
  { time: 9.01,  area: 65, size: "L"  },
  { time: 12.72, area: 43, size: "XS" },
  { time: 12.88, area: 69, size: "L"  },
  { time: 13.33, area: 63, size: "M"  },
  { time: 13.77, area: 62, size: "S"  },
  { time: 14.83, area: 78, size: "XL" },
  { time: 16.71, area: 41, size: "XS" },
  { time: 19.17, area: 39, size: "XS" },
  { time: 20.38, area: 40, size: "XS" },
  { time: 21.00, area: 51, size: "M"  },
  { time: 22.15, area: 52, size: "S"  },
  { time: 23.09, area: 70, size: "L"  },
  { time: 23.53, area: 67, size: "L"  },
  { time: 24.30, area: 76, size: "M"  },
  { time: 33.57, area: 41, size: "S"  },
  { time: 34.55, area: 65, size: "M"  },
  { time: 38.12, area: 42, size: "XS" },
  { time: 38.48, area: 70, size: "M"  },
  { time: 38.96, area: 74, size: "L"  },
  { time: 40.05, area: 57, size: "S"  },
  { time: 41.05, area: 53, size: "XS" },
  { time: 42.11, area: 66, size: "M"  },
  { time: 42.58, area: 79, size: "L"  },
  { time: 43.42, area: 78, size: "M"  },
]

// ─── Thunder file map ─────────────────────────────────────────────────────────
// Short per-size sound files — play in full, randomized from the pool.

const THUNDER_FILES: Record<string, string[]> = {
  XS: ['/sfx/thunder/thunderXS_1.mp3', '/sfx/thunder/thunderXS_2.mp3', '/sfx/thunder/thunderXS_3.mp3'],
  S:  ['/sfx/thunder/thunderS_1.mp3', '/sfx/thunder/thunderS_2.mp3', '/sfx/thunder/thunderS_3.mp3'],
  M:  ['/sfx/thunder/thunderM_1.mp3', '/sfx/thunder/thunderM_2.mp3', '/sfx/thunder/thunderM_3.mp3'],
  L:  ['/sfx/thunder/thunderL_1.mp3', '/sfx/thunder/thunderL_2.mp3'],
  XL: ['/sfx/thunder/thunderXL_1.mp3', '/sfx/thunder/thunderXL_2.mp3', '/sfx/thunder/thunderXL_3.mp3'],
}

// Scale factor for thunder volume relative to SFX volume (makes thunder break through rain)
const THUNDER_VOLUME_SCALE = 1.2

// XL sounds are a bit quieter so they don't overpower everything
const XL_VOLUME_REDUCTION = 0.7

function thunderVolume(area: number, size: string): number {
  // area is 0-100 (percentage of bright pixels).
  // Map linearly: 0% → 0.25, 100% → 0.75, then apply XL reduction.
  const vol = 0.25 + (Math.min(100, area) / 100) * 0.5
  return size === 'XL' ? vol * XL_VOLUME_REDUCTION : vol
}

// ─── State ────────────────────────────────────────────────────────────────────

let rainEl: HTMLAudioElement | null = null
let thunderTimers: ReturnType<typeof setTimeout>[] = []
// @ts-ignore
let scheduleLoopTimer: ReturnType<typeof setTimeout> | null = null
let isPlaying = false
let currentScheduleType: 'intro' | 'menu' | null = null
let visibilityCleanup: (() => void) | null = null
let rainEndedHandler: (() => void) | null = null

// Saved video element override for resume-after-background scenarios.
// When startStorm is called with a specific video (e.g. intro.mp4 for Replay Intro),
// we save it here so resumeThunderSchedule can re-sync to the correct video.
let scheduledVideoEl: HTMLVideoElement | null | undefined = undefined

// ─── Thunder pool for reuse ────────────────────────────────────────────────────
// Keyed by file path so each distinct sound gets its own round-robin pool.
const THUNDER_POOL_SIZE = 2
const thunderPools: Record<string, { els: HTMLAudioElement[]; idx: number }> = {}

function getThunderEl(path: string): HTMLAudioElement {
  let pool = thunderPools[path]
  if (!pool) {
    const els = Array.from({ length: THUNDER_POOL_SIZE }, () => {
      const audio = new Audio(path)
      audio.preload = 'auto'
      return audio
    })
    pool = { els, idx: 0 }
    thunderPools[path] = pool
  }
  const el = pool.els[pool.idx]
  pool.idx = (pool.idx + 1) % THUNDER_POOL_SIZE
  return el
}


// ─── Rain ─────────────────────────────────────────────────────────────────────

const RAIN_PATH = '/sfx/rain.wav'
const RAIN_VOLUME_SCALE = 0.8

function startRain(): void {
  // P25-33/34 DEBUG — remove after live investigation
  console.log('[AUDIO] startRain called', { isPlaying, hasRainEl: !!rainEl })
  try {
    const el = new Audio(RAIN_PATH)
    el.loop = true
    el.volume = (getSfxVolume() / 100) * RAIN_VOLUME_SCALE
    // P25-34 fix: fresh Audio elements may not be buffered yet when play() is called.
    // Add a canplaythrough fallback so rain retries once data is ready if play() rejects.
    el.play().catch(() => {
      el.addEventListener('canplaythrough', () => el.play().catch(() => {}), { once: true })
    })

    // Belt-and-suspenders: also restart on ended event in case loop attr fails
    const onEnded = () => {
      el.currentTime = 0
      el.play().catch(() => {})
    }
    el.addEventListener('ended', onEnded)
    rainEndedHandler = onEnded
    rainEl = el
  } catch {
    // silent
  }
}

function stopRain(): void {
  if (rainEl) {
    try { rainEl.pause() } catch { /* noop */ }
    if (rainEndedHandler) {
      rainEl.removeEventListener('ended', rainEndedHandler)
      rainEndedHandler = null
    }
    rainEl = null
  }
}

function applyRainVolume(): void {
  if (rainEl) {
    rainEl.volume = (getSfxVolume() / 100) * RAIN_VOLUME_SCALE
  }
}

// ─── Thunder ──────────────────────────────────────────────────────────────────

function playThunder(event: FlashEvent): void {
  const files = THUNDER_FILES[event.size]
  if (!files || files.length === 0) return

  // Pick a random file from the pool for this size category
  const path = files[Math.floor(Math.random() * files.length)]
  const baseVol = thunderVolume(event.area, event.size) * (getSfxVolume() / 100)
  const vol = Math.min(1, baseVol * THUNDER_VOLUME_SCALE)

  try {
    const el = getThunderEl(path)
    el.volume = vol
    el.currentTime = 0
    el.play().catch(() => {})
    // Let thunder play out fully — these are short files, no premature stop.
  } catch {
    // silent
  }
}

// ─── Video-synced thunder scheduling ──────────────────────────────────────────
// Uses requestAnimationFrame to check the video's currentTime frame-by-frame,
// firing thunder when the video reaches a flash timestamp.  This stays in sync
// even if storm starts late, the video loops, or playback stutters.

let videoEl: HTMLVideoElement | null = null
let rafId: number | null = null
let nextEventIdx = 0
let prevVideoTime = 0

/** Provide a reference to the menu video so thunder stays frame‑accurate. */
export function setStormVideoEl(el: HTMLVideoElement | null): void {
  videoEl = el
}

function scheduleThunders(schedule: FlashEvent[], videoElOverride?: HTMLVideoElement | null): void {
  // Clear any previous sync
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  for (const t of thunderTimers) clearTimeout(t)
  thunderTimers = []

  const activeVideoEl = videoElOverride !== undefined ? videoElOverride : videoEl
  nextEventIdx = 0
  prevVideoTime = activeVideoEl?.currentTime ?? 0

  if (!activeVideoEl) {
    // Fallback: setTimeout-based (used when no video element available)
    for (const event of schedule) {
      const timer = setTimeout(() => {
        if (isPlaying) playThunder(event)
      }, event.time * 1000)
      thunderTimers.push(timer)
    }
    const lastEvent = schedule[schedule.length - 1]
    const totalDurationSec = (lastEvent?.time ?? 0) + 5
    if (scheduleLoopTimer) clearTimeout(scheduleLoopTimer)
    scheduleLoopTimer = setTimeout(() => {
      if (isPlaying) scheduleThunders(schedule)
    }, totalDurationSec * 1000)
    return
  }

  // Video-synced mode: poll with requestAnimationFrame
  const tick = () => {
    if (!isPlaying) return
    const t = activeVideoEl!.currentTime

    // Detect video loop: time jumped backwards significantly
    if (t < prevVideoTime - 0.5) {
      nextEventIdx = 0
    }
    prevVideoTime = t

    // Fire all events whose video timestamp has been reached
    while (nextEventIdx < schedule.length && t >= schedule[nextEventIdx].time) {
      playThunder(schedule[nextEventIdx])
      nextEventIdx++
    }

    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

// ─── Volume slider integration ────────────────────────────────────────────────
// Reads the Sound Effects slider and applies to rain (thunder applies at play).

export function applyStormVolume(): void {
  applyRainVolume()
  // Thunder volume applied at play time via getSfxVolume()
}

// ─── Stop all actively playing thunder ────────────────────────────────────────
// playThunder() fires HTMLAudioElements that play to completion.  When the app
// loses focus we need to kill them mid-playback, not just cancel future timers.

function stopAllThunder(): void {
  for (const path in thunderPools) {
    for (const el of thunderPools[path].els) {
      try { el.pause(); el.currentTime = 0 } catch { /* noop */ }
    }
  }
}

// ─── Tab visibility + window focus ────────────────────────────────────────────

function stopThunderSchedule(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  for (const t of thunderTimers) clearTimeout(t)
  thunderTimers = []
  if (scheduleLoopTimer) {
    clearTimeout(scheduleLoopTimer)
    scheduleLoopTimer = null
  }
}

function resumeThunderSchedule(): void {
  if (!currentScheduleType) return
  const schedule = currentScheduleType === 'intro' ? INTRO_SCHEDULE : MENU_SCHEDULE
  // Use the saved video override so resume re-syncs to the correct video
  // (e.g., intro.mp4 during Replay Intro splash, not the default menu.mp4)
  scheduleThunders(schedule, scheduledVideoEl)
}

function setupVisibilityHandling(): () => void {
  const stopAll = () => {
    // Pause rain
    if (rainEl) try { rainEl.pause() } catch { /* noop */ }
    // Pause music
    pauseMusic()
    // Stop in-progress thunder sounds immediately
    stopAllThunder()
    // Prevent future thunder events from firing
    isPlaying = false
    stopThunderSchedule()
  }
  const startAll = () => {
    // Resume rain
    if (rainEl) try { rainEl.play().catch(() => {}) } catch { /* noop */ }
    // Resume music
    resumeMusic()
    // Resume thunder schedule from the beginning
    isPlaying = true
    resumeThunderSchedule()
  }

  const onVisibility = () => { if (document.hidden) stopAll(); else startAll() }
  const onBlur = stopAll
  const onFocus = startAll

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('blur', onBlur)
  window.addEventListener('focus', onFocus)

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('focus', onFocus)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function startStorm(scheduleType: 'intro' | 'menu' = 'menu', videoElOverride?: HTMLVideoElement | null): void {
  // P25-33/34 DEBUG — remove after live investigation
  console.log('[AUDIO] startStorm called', {
    scheduleType,
    isPlaying,
    currentScheduleType,
    hasRainEl: !!rainEl,
    rainPaused: rainEl?.paused ?? 'n/a',
  })
  // Already running the exact same schedule — no-op
  if (isPlaying && currentScheduleType === scheduleType) return

  // Save video override so resumeThunderSchedule can re-sync to the correct video
  // after tab return. undefined = "use default module-level videoEl" (menu video).
  scheduledVideoEl = videoElOverride

  // Switch to a different schedule
  if (isPlaying) {
    currentScheduleType = scheduleType
    const schedule = scheduleType === 'intro' ? INTRO_SCHEDULE : MENU_SCHEDULE
    stopThunderSchedule()
    scheduleThunders(schedule, videoElOverride)
    // Ensure rain is playing through the schedule switch (may have been
    // paused by visibility/blur and not yet resumed)
    if (!rainEl || rainEl.paused) { stopRain(); startRain() }
    return
  }

  // First-time start
  isPlaying = true
  currentScheduleType = scheduleType
  const schedule = scheduleType === 'intro' ? INTRO_SCHEDULE : MENU_SCHEDULE

  startRain()
  scheduleThunders(schedule, videoElOverride)
  visibilityCleanup = setupVisibilityHandling()
}

export function stopStorm(): void {
  isPlaying = false
  currentScheduleType = null

  // Cancel raf-based sync
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  // Clear thunder event timers (fallback setTimeout mode)
  for (const t of thunderTimers) clearTimeout(t)
  thunderTimers = []

  // Clear the looping schedule timer
  if (scheduleLoopTimer) {
    clearTimeout(scheduleLoopTimer)
    scheduleLoopTimer = null
  }

  // P22-29: stop any thunder sounds that are mid-playback
  stopAllThunder()
  stopRain()
  scheduledVideoEl = undefined

  if (visibilityCleanup) {
    visibilityCleanup()
    visibilityCleanup = null
  }
}

export function isStormPlaying(): boolean {
  return isPlaying
}

/** Retry rain playback if it was blocked by autoplay policy. */
export function retryRain(): void {
  if (rainEl && rainEl.paused) {
    rainEl.play().catch(() => {})
  }
}

/** Switch the thunder schedule to match a different video (e.g. intro → menu). */
export function switchStormSchedule(scheduleType: 'intro' | 'menu'): void {
  currentScheduleType = scheduleType
  nextEventIdx = 0
  prevVideoTime = videoEl?.currentTime ?? 0
  // The next rAF tick will pick up the new schedule automatically
}
