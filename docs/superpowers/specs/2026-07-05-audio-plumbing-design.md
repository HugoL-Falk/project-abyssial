# Audio Plumbing — Design Spec

**Date:** 2026-07-05  
**Status:** Draft  
**Design intent:** Build a working audio infrastructure that plays silently when assets are missing and springs to life once audio files are dropped in. Thematic SFX for actions, per-god soundtracks escalating weekly, storm ambience for menu/intro.

---

## Architecture

```
audioManifest.ts     → Asset path registry (all SFX + music keys/paths)
audio.ts             → Preloader, SFX pool, music manager, escalation logic
audioSettings.ts     → Unchanged (volume persistence)
App.tsx              → On mount: preload. Watch phase/godPath/reshuffleCount → route music
```

### Data Flow
1. `App.tsx` mounts → calls `preloadAudio()` once → all assets cached in memory
2. `playSfx(key)` → look up preloaded element from pool → play
3. Phase changes → `App.tsx` effect determines music → calls `playMusic(key)` or `setMusicTheme(godPath, reshuffleCount)`
4. Reshuffle occurs → `reshuffleCount` increment triggers effect re-run → music escalates

---

## Asset Manifest (`audioManifest.ts`)

Defines every audio asset path in one place. The preloader iterates this map.

### SFX Keys
| Key | Path | Type |
|-----|------|------|
| `click` | `/sfx/click.mp3` | One-shot |
| `cardDraw` | `/sfx/card-draw.mp3` | One-shot |
| `optionResolve` | `/sfx/option-resolve.mp3` | One-shot |
| `pageTurn` | `/sfx/page-turn.mp3` | One-shot |
| `thunder` | `/sfx/thunder.mp3` | One-shot |
| `rain` | `/sfx/rain.mp3` | Loop |

### Music Keys
| Key | Path(s) | Type |
|-----|---------|------|
| `menu` | `/music/menu.mp3` | Loop |
| `yha_nthlei` | `[week-1, week-2, week-3]` | Loop, tiered |
| `nyarlathotep` | `[week-1, week-2, week-3]` | Loop, tiered |
| `shub_niggurath` | `[week-1, week-2, week-3]` | Loop, tiered |
| `victory` | `/music/victory.mp3` | Loop |
| `gameOver` | `/music/game-over.mp3` | Loop |

### Week-to-Tier Mapping
```
reshuffleCount 0-1 → tier 0
reshuffleCount 2-3 → tier 1
reshuffleCount 4-5 → tier 2
```
Each tier loads a different track URL from the per-god array. If the file is missing → silent (no crash).

---

## Upgraded `audio.ts`

### Preloader
- On app boot, iterate all paths in manifest
- `fetch()` each file, create `Blob` → `URL.createObjectURL` → `HTMLAudioElement`
- Store in `Map<string, HTMLAudioElement>`
- Keys missing from server → `cache.set(key, null)` — `playSfx` and `playMusic` check for null and return silently
- Promise resolves when all fetches settle (some may fail — that's fine)

### SFX Pool
- Per SFX key, maintain array of 3 preloaded `Audio` elements
- Round-robin index selection — no two clicks share the same element slot, preventing cut-off
- Before playing: `audio.currentTime = 0` to restart
- Volume from `getSfxVolume() / 100`
- `.play()` catch: silent (asset missing or autoplay blocked)

```ts
const SFX_POOL_SIZE = 3
const sfxPools = new Map<string, { els: HTMLAudioElement[]; idx: number }>()

function getPool(key: string): { els: HTMLAudioElement[]; idx: number } {
  let pool = sfxPools.get(key)
  if (!pool) {
    const els = Array.from({ length: SFX_POOL_SIZE }, () => new Audio())
    pool = { els, idx: 0 }
    sfxPools.set(key, pool)
  }
  return pool
}
```

### Music Manager
- Singleton `HTMLAudioElement` for current track
- `playMusic(key)`: looks up preloaded element, assigns to singleton, sets `loop = true`, plays
- `stopMusic()`: pauses + nulls singleton
- `setMusicTheme(godPath, reshuffleCount)`: computes tier from `reshuffleCount`, resolves URL from manifest, calls `playMusic`
- Before switching: short crossfade (current track volume → 0 over 200ms, new track volume → target over 200ms)
- `applyMusicVolume()`: updates singleton volume (already exists, unchanged)

### Error Handling
- All `.play()` calls wrapped in `.catch(() => {})`
- Missing assets: preloader sets null, play functions check and return silently
- No thrown errors from audio module under any condition

---

## Wiring (`App.tsx`)

### On Mount
```ts
useEffect(() => { preloadAudio() }, [])
```

### Phase-based Music Routing
```ts
const phase = useGameStore(s => s.phase)
const godPath = useGameStore(s => s.runConfig?.godPath)
const reshuffleCount = useGameStore(s => s.reshuffleCount)

useEffect(() => {
  switch (phase) {
    case 'intro':
    case 'menu':
      playMusic('menu')
      break
    case 'playing':
      if (godPath) setMusicTheme(godPath, reshuffleCount)
      break
    case 'victory':
      playMusic('victory')
      break
    case 'gameOver':
      playMusic('gameOver')
      break
    default:
      stopMusic()
  }
}, [phase, godPath, reshuffleCount])
```

### Menu Video
The menu video (`/menu.mp4`) is muted (`muted` attribute already set). The storm ambience audio layer replaces any video audio track.

---

## Files Changed

| File | Action | Change |
|------|--------|--------|
| `src/engine/audioManifest.ts` | **Create** | Asset path registry + tier mapping |
| `src/engine/audio.ts` | **Rewrite** | Preloader, SFX pool, music escalation, crossfade |
| `src/App.tsx` | **Modify** | Preload on mount, phase-based music routing |
| `public/sfx/` | **Create** | Empty directory for SFX assets |
| `public/music/` | **Create** | Empty directory + per-god subdirs |
| `src/engine/audioSettings.ts` | **Unchanged** | No changes needed |

---

## What's NOT Included

- **Actual audio asset files** — the `public/sfx/` and `public/music/` directories are created empty. The system works silently when assets are absent.
- **Format fallback** (`.ogg`/`.mp3`) — deferred. If needed, the manifest can be extended to store arrays of paths.
- **Spatial audio, 3D positioning, Web Audio API nodes** — deferred until game has spatial mechanics.
- **Dynamic music layering** (stem-based mixing) — deferred. Week escalation uses discrete tracks, not layered stems.
- **Unit tests** — audio is side-effect-only (DOM API calls). No logic to unit test. Manual verification via browser devtools.

---

## Self-Review Checklist

- [x] No placeholders or TODOs in spec
- [x] Architecture matches feature descriptions
- [x] Scope is focused on plumbing, not asset creation
- [x] Requirements are unambiguous
- [x] `playSfx('click')` signature unchanged — all 27 call sites compatible
- [x] Missing assets never cause errors — silent degradation
- [x] Preloader, SFX pool, music manager each have clear responsibility
