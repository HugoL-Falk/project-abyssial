# P25-07: Loading Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a thematic loading screen with a progress bar until essential audio is preloaded, with a 1.5 s minimum display time, then fade out to the menu.

**Architecture:** An absolute-positioned React overlay (`z-index: 999`) renders on top of the existing app tree while `preloadAudio()` runs. The overlay holds for at least 1.5 s (whichever finishes last — audio or timer), then fades out over 600 ms and unmounts. The menu video and React tree mount and buffer beneath the overlay for free — no extra startup cost. No game store changes; loading is a UI concern only.

**Tech Stack:** React 18, TypeScript, inline styles (existing pattern), `Promise.allSettled`, CSS `opacity` transition.

## Global Constraints

- No changes to `GamePhase` union or game store.
- No changes to existing test files — 303/303 vitest must still pass.
- `preloadAudio()` change must be backward-compatible (optional param, zero call-site changes except App.tsx).
- Inline styles only — no new CSS files (existing pattern in this codebase).
- Flavour cap rule does not apply to loading screen copy (it's not a card option).
- Git repo path: `C:/Project Abyssial/Code/project-abyssial` — always use `-C` flag.
- Run vitest as: `npx vitest run` from the repo root.
- Run tsc as: `npx tsc --noEmit` from the repo root.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/engine/audio.ts` | Modify | Add optional `onProgress` callback to `preloadAudio()` |
| `src/components/LoadingScreen.tsx` | Create | Thematic loading overlay component |
| `src/App.tsx` | Modify | Loading state management + render `<LoadingScreen>` |

---

### Task 1: Add `onProgress` callback to `preloadAudio()`

**Files:**
- Modify: `src/engine/audio.ts` lines 84–98

**Interfaces:**
- Produces: `preloadAudio(onProgress?: (loaded: number, total: number) => void): Promise<void>`
  — Task 3 calls it with `(n, total) => setLoadProgress(n / total)`.

- [ ] **Step 1: Apply the edit to `audio.ts`**

  Replace the existing `preloadAudio` function (lines 84–98):

  ```ts
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
  ```

  Key changes from the original:
  - Signature gains `onProgress?: (loaded: number, total: number) => void`
  - `let loaded = 0` and `const total = allPaths.length` declared before allSettled
  - Each `preloadOne(p)` is wrapped: `.then(r => { onProgress?.(++loaded, total); return r })`
  - Everything else (cache-fill, pendingMusicFn flush) is unchanged

- [ ] **Step 2: Verify tsc is clean**

  ```bash
  cd "C:/Project Abyssial/Code/project-abyssial" && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: same pre-existing errors only (lines 2495+ in gameStore.test.ts). No new errors.

- [ ] **Step 3: Verify tests still pass**

  ```bash
  cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run 2>&1 | tail -10
  ```

  Expected: `303 passed` (or current count), no failures.

- [ ] **Step 4: Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/engine/audio.ts
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(audio): add onProgress callback to preloadAudio — P25-07"
  ```

---

### Task 2: Create `LoadingScreen` component

**Files:**
- Create: `src/components/LoadingScreen.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (standalone component).
- Produces:
  ```ts
  export function LoadingScreen(props: {
    progress: number      // 0–1; drives progress bar width
    fadeOut:  boolean     // when true, opacity transitions to 0
    onFadeEnd: () => void // called on opacity transitionend → parent unmounts
  }): JSX.Element
  ```

- [ ] **Step 1: Create `src/components/LoadingScreen.tsx`**

  ```tsx
  interface Props {
    progress:  number        // 0–1
    fadeOut:   boolean       // triggers opacity fade to 0
    onFadeEnd: () => void    // called when fade completes → parent unmounts
  }

  export function LoadingScreen({ progress, fadeOut, onFadeEnd }: Props) {
    return (
      <div
        onTransitionEnd={(e) => { if (e.propertyName === 'opacity') onFadeEnd() }}
        style={{
          position:        'absolute',
          inset:           0,
          zIndex:          999,
          background:      'var(--bg)',
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          gap:             '1.25rem',
          padding:         '0 2rem',
          opacity:         fadeOut ? 0 : 1,
          transition:      'opacity 0.6s ease',
          pointerEvents:   fadeOut ? 'none' : 'auto',
        }}
      >
        <h1 style={{
          fontFamily:    'var(--title-font)',
          fontSize:      '1.6rem',
          fontWeight:    400,
          letterSpacing: '0.15em',
          color:         'var(--text)',
          margin:        0,
          textAlign:     'center',
        }}>
          Project Abyssial
        </h1>

        <p style={{
          fontFamily: 'var(--ui-font)',
          fontSize:   '0.85rem',
          fontStyle:  'italic',
          color:      'var(--text-dim)',
          margin:     0,
        }}>
          The ritual assembles.
        </p>

        {/* Progress bar */}
        <div style={{
          width:      '100%',
          height:     '2px',
          background: 'var(--border)',
        }}>
          <div style={{
            height:     '100%',
            width:      `${Math.round(progress * 100)}%`,
            background: 'var(--color-gold-bright)',
            transition: 'width 0.2s ease',
          }} />
        </div>
      </div>
    )
  }
  ```

  Notes:
  - `onTransitionEnd` guards on `e.propertyName === 'opacity'` — the inner bar's `width`
    transition must not accidentally trigger `onFadeEnd`.
  - `pointerEvents: 'none'` during fade-out prevents clicks landing on the overlay while
    it's invisible but still mounted.
  - `Math.round(progress * 100)` avoids sub-pixel jitter in the width string.

- [ ] **Step 2: Verify tsc is clean**

  ```bash
  cd "C:/Project Abyssial/Code/project-abyssial" && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: same pre-existing errors only. No new errors from LoadingScreen.tsx.

- [ ] **Step 3: Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/LoadingScreen.tsx
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(ui): add LoadingScreen component — P25-07"
  ```

---

### Task 3: Wire loading state into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes:
  - `preloadAudio(onProgress?: (loaded: number, total: number) => void): Promise<void>` (Task 1)
  - `LoadingScreen({ progress, fadeOut, onFadeEnd })` (Task 2)

- [ ] **Step 1: Add `LoadingScreen` import to `App.tsx`**

  After the existing imports (around line 9), add:

  ```ts
  import { LoadingScreen } from './components/LoadingScreen'
  ```

- [ ] **Step 2: Add loading state variables**

  Inside the `App()` function body, after the existing state declarations
  (`videoOpacity`, etc.), add:

  ```ts
  const [audioReady,   setAudioReady]   = useState(false)
  const [overlayGone,  setOverlayGone]  = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)      // 0–1
  ```

- [ ] **Step 3: Replace the bare `preloadAudio()` effect**

  Find and replace:

  ```ts
  // Preload all audio assets once on mount
  useEffect(() => { preloadAudio() }, [])
  ```

  With:

  ```ts
  // Preload all audio assets once on mount; hold loading overlay until done + 1.5 s min
  useEffect(() => {
    let active = true
    const min  = new Promise<void>(r => setTimeout(r, 1500))
    const load = preloadAudio((n, total) => { if (active) setLoadProgress(n / total) })
    Promise.all([min, load]).then(() => { if (active) setAudioReady(true) })
    return () => { active = false }
  }, [])
  ```

  The `active` flag prevents React 18 StrictMode's double-invoke from firing stale
  state setters after the first effect instance is cleaned up.

- [ ] **Step 4: Render `<LoadingScreen>` in the JSX return**

  In the JSX return, inside the outermost `<div>` (the one with `height: '100dvh'`),
  add the overlay as the **first child** — before the `<video>` element:

  ```tsx
  {/* Loading overlay — covers everything until audio is ready */}
  {!overlayGone && (
    <LoadingScreen
      progress={loadProgress}
      fadeOut={audioReady}
      onFadeEnd={() => setOverlayGone(true)}
    />
  )}
  ```

  The full JSX return should look like:

  ```tsx
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
  ```

- [ ] **Step 5: Verify tsc is clean**

  ```bash
  cd "C:/Project Abyssial/Code/project-abyssial" && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: same pre-existing errors only. No new errors.

- [ ] **Step 6: Verify tests still pass**

  ```bash
  cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run 2>&1 | tail -10
  ```

  Expected: `303 passed`, no failures.

- [ ] **Step 7: Manual browser check**

  Start the dev server:
  ```bash
  cd "C:/Project Abyssial/Code/project-abyssial" && npx vite
  ```

  Verify in browser:
  1. On hard refresh (`Ctrl+Shift+R`) the loading screen appears immediately with dark bg + title + tagline + empty progress bar.
  2. The gold bar animates rightward as audio files settle.
  3. At least 1.5 s passes before the screen begins to fade (even if audio loads instantly).
  4. The overlay fades smoothly (600 ms) and the menu video appears beneath.
  5. On repeat soft refresh (no cache clear) the bar sweeps fast and the 1.5 s minimum holds the screen.
  6. No console errors.

- [ ] **Step 8: Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/App.tsx
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(ui): wire loading screen into App — P25-07"
  ```
