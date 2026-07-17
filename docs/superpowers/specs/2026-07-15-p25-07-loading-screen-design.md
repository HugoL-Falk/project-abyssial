# P25-07: Loading Screen with Progress Indicator

**Date:** 2026-07-15
**Status:** Approved
**Backlog:** P25-07

---

## Problem

The game takes a noticeable moment to load on first visit because `preloadAudio()` runs
asynchronously after React mounts — the menu appears immediately but audio is not ready.
On slower connections the JS bundle + audio preload together create a dead pause with no
feedback. This spec addresses the audio-readiness gap (B); bundle load on bad connections
(A) is deferred to the card-art-compression pass.

---

## Solution

An absolute-positioned loading overlay renders on top of the app until both:
1. `preloadAudio()` has resolved (all essential audio files settled), **and**
2. at least 1.5 s have elapsed (prevents a sub-second flash on fast connections).

When both conditions are met the overlay fades out over 600 ms, then unmounts.
The menu video and full React tree mount and buffer beneath the overlay — no extra startup
cost, and the transition to the menu is seamless.

---

## Architecture

### Files changed

| File | Change |
|---|---|
| `src/engine/audio.ts` | Add optional `onProgress` callback to `preloadAudio()` |
| `src/App.tsx` | Replace bare `preloadAudio()` call; add loading state; render overlay |
| `src/components/LoadingScreen.tsx` | **New** — thematic loading screen component |

No store changes. No new `GamePhase`. No test changes.

---

## `audio.ts` — progress callback

`preloadAudio` gains an optional `onProgress` parameter. Backward-compatible: all
existing callers with no argument continue to work unchanged.

```ts
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
  if (audioUnlocked && pendingMusicFn) {
    pendingMusicFn()
    pendingMusicFn = null
  }
}
```

Progress fires per file as each settles (success or failure both count). Total is known
upfront (~13 files: all SFX_PATHS + 2 music paths), so the bar is deterministic and
reaches 100% only when all assets have been attempted.

---

## `App.tsx` — loading state

Replace:
```ts
useEffect(() => { preloadAudio() }, [])
```

With:
```ts
const [audioReady,  setAudioReady]  = useState(false)
const [overlayGone, setOverlayGone] = useState(false)
const [loadProgress, setLoadProgress] = useState(0)   // 0–1

useEffect(() => {
  let active = true
  const min  = new Promise<void>(r => setTimeout(r, 1500))
  const load = preloadAudio((n, total) => { if (active) setLoadProgress(n / total) })
  Promise.all([min, load]).then(() => { if (active) setAudioReady(true) })
  return () => { active = false }
}, [])
```

The `active` flag guards against React 18 StrictMode double-invoking the effect in
development; the cleanup cancels the first invocation's callbacks before the second fires.

Render the overlay above everything else in the JSX return, inside the existing outer div:

```tsx
{!overlayGone && (
  <LoadingScreen
    progress={loadProgress}
    fadeOut={audioReady}
    onFadeEnd={() => setOverlayGone(true)}
  />
)}
```

`LoadingScreen` is positioned `absolute; inset: 0; z-index: 999` so it sits over the
video background, vignette, and all screen content.

---

## `LoadingScreen.tsx` — component

**Props:**
```ts
interface Props {
  progress: number   // 0–1
  fadeOut:  boolean  // when true, begin opacity transition to 0
  onFadeEnd: () => void  // called when fade transition ends → triggers unmount
}
```

**Visual layout** (centred column, vertically centred):

```
┌─────────────────────────────┐
│                             │
│      PROJECT ABYSSIAL       │  Cinzel Decorative 1.6rem, weight 400, --text
│                             │
│    The ritual assembles.    │  Cormorant Garamond italic 0.85rem, --text-dim
│                             │
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░  │  2px bar, full width, --color-gold-bright fill
│                             │
└─────────────────────────────┘
```

**Styles:**
- Background: `var(--bg)` (`#120f0a`) — matches `body` background, no seam on load
- Position: `absolute; inset: 0; z-index: 999`
- Title: `var(--title-font)`, `letter-spacing: 0.15em`, `font-weight: 400`
- Tagline: `"The ritual assembles."`, `font-style: italic`, `color: var(--text-dim)`
- Progress bar track: `var(--border)` (`#342e24`), `height: 2px`, `border-radius: 0`
- Progress bar fill: `var(--color-gold-bright)` (`#e8c050`), `width: ${progress * 100}%`,
  `transition: width 0.2s ease`
- Fade: `opacity: fadeOut ? 0 : 1`, `transition: opacity 0.6s ease`,
  `onTransitionEnd: (e) => { if (e.propertyName === 'opacity') onFadeEnd() }`
  (guard on `propertyName` so the width transition on the inner bar can't
  accidentally trigger unmount)

---

## Timing behaviour

| Scenario | Behaviour |
|---|---|
| Fast connection (audio < 1.5s) | Bar fills quickly, screen holds to 1.5s minimum, then fades |
| Slow connection (audio > 1.5s) | Bar stalls partway, reflects real progress; fades when audio done |
| Audio file missing / timeout | `preloadOne` resolves null after 15s timeout — counts as progress; bar reaches 100% |

The 15s per-file timeout in `preloadOne` is the existing safeguard — the loading screen
cannot hang indefinitely.

---

## Out of scope

- Browser autoplay audio unlock via a "Begin" button (considered, rejected: current
  `unlockAudio()` on first click in the App div is sufficient)
- Covering JS bundle load time on bad connections (deferred to card-art-compression pass)
- God music preload progress (lazy-loaded on god selection, not part of initial load)
