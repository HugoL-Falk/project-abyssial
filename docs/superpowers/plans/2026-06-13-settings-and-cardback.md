# Settings, Card-Back Selector & Audio Plumbing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Settings screen (accessible from main menu and in-game) that lets the player change their card back (8 options) and adjust music/SFX volume, plus the audio plumbing layer to support both real SFX (one placeholder ships) and future music.

**Architecture:** One `SettingsModal` component opened from two entry points. Audio is a standalone module (`engine/audio.ts`) reading from a dedicated localStorage helper (`engine/audioSettings.ts`), decoupled from the Zustand store. Card back is an `<img>` swap in `DrawPile.tsx` with a CSS edge vignette and an optional frame-PNG overlay that auto-activates when present.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, HTML5 Audio API, localStorage. No test framework — verification via `npm run typecheck` and manual smoke testing in `npm run dev`.

**Spec:** [`docs/superpowers/specs/2026-06-13-settings-and-cardback-design.md`](../specs/2026-06-13-settings-and-cardback-design.md)

**Working directory for all commands:** `E:\Project Abyssial\Code\project-abyssial`

---

## File Structure

**New files (under `Code/project-abyssial/`):**

| Path | Responsibility |
|---|---|
| `src/engine/audioSettings.ts` | localStorage helpers + defaults for music volume, SFX volume, card back slug |
| `src/engine/audio.ts` | HTML5 Audio singleton (music) + throw-away `Audio()` (SFX), exposing `playSfx`, `playMusic`, `stopMusic`, `setMusicVolume`, `setSfxVolume` |
| `src/data/cardBacks.ts` | Static catalog of 8 card-back entries (slug, file, label) + `DEFAULT_CARD_BACK` |
| `src/components/SettingsModal.tsx` | Modal with two volume sliders + horizontal card-back picker |
| `public/cardbacks/*.png` | 8 card-back PNGs, copied from `Art/Card Backs/best/` |
| `public/sfx/click.mp3` | Placeholder CC0 click SFX |

**Modified files:**

| Path | Change |
|---|---|
| `src/components/MainMenu.tsx` | 2×2 grid → 2×3 with Settings + Codex tiles |
| `src/components/GameScreen.tsx` | Add floating gear button (top-right) opening SettingsModal |
| `src/components/game/DrawPile.tsx` | Replace card back visual with `<img>` + vignette + optional frame overlay |
| Various button-bearing components | Wire `playSfx('click')` to onClick handlers |

---

## Task 1: Card-back PNG assets

**Files:**
- Create: `Code/project-abyssial/public/cardbacks/notegpt-default.png`
- Create: `Code/project-abyssial/public/cardbacks/tarot-22.png`
- Create: `Code/project-abyssial/public/cardbacks/tarot-27.png`
- Create: `Code/project-abyssial/public/cardbacks/tarot-29.png`
- Create: `Code/project-abyssial/public/cardbacks/tarot-sym.png`
- Create: `Code/project-abyssial/public/cardbacks/painterly-15.png`
- Create: `Code/project-abyssial/public/cardbacks/painterly-9.png`
- Create: `Code/project-abyssial/public/cardbacks/gothic-4.png`

- [ ] **Step 1: Create the cardbacks directory and copy + rename source PNGs**

Run from vault root (`E:\Project Abyssial`):

```bash
mkdir -p "Code/project-abyssial/public/cardbacks"
cp "Art/Card Backs/best/NoteGPT_Image_20260612221100.png" "Code/project-abyssial/public/cardbacks/notegpt-default.png"
cp "Art/Card Backs/best/a-vertical-tarot-card-back-design-perfect-symmetry(22)-ezremove.png" "Code/project-abyssial/public/cardbacks/tarot-22.png"
cp "Art/Card Backs/best/a-vertical-tarot-card-back-design-perfect-symmetry(27)-ezremove.png" "Code/project-abyssial/public/cardbacks/tarot-27.png"
cp "Art/Card Backs/best/a-vertical-tarot-card-back-design-perfect-symmetry(29)-ezremove.png" "Code/project-abyssial/public/cardbacks/tarot-29.png"
cp "Art/Card Backs/best/a-vertical-tarot-card-back-design-symmetrical-comp-ezremove.png" "Code/project-abyssial/public/cardbacks/tarot-sym.png"
cp "Art/Card Backs/best/a-vertical-playing-card-back-design-painterly-digi(15)-ezremove.png" "Code/project-abyssial/public/cardbacks/painterly-15.png"
cp "Art/Card Backs/best/a-vertical-playing-card-back-design-painterly-digi(9)-ezremove.png" "Code/project-abyssial/public/cardbacks/painterly-9.png"
cp "Art/Card Backs/best/a-vertical-playing-card-back-design-gothic-art-sty(4)-ezremove.png" "Code/project-abyssial/public/cardbacks/gothic-4.png"
```

- [ ] **Step 2: Verify all 8 files copied**

Run:

```bash
ls "Code/project-abyssial/public/cardbacks/" | wc -l
```

Expected output: `8`

- [ ] **Step 3: Commit**

Run from `Code/project-abyssial`:

```bash
git add public/cardbacks/
git commit -m "feat(art): add 8 selectable card-back images"
```

---

## Task 2: Placeholder click SFX

**Files:**
- Create: `Code/project-abyssial/public/sfx/click.mp3`

- [ ] **Step 1: Create the sfx directory**

Run from `Code/project-abyssial`:

```bash
mkdir -p public/sfx
```

- [ ] **Step 2: Source a CC0 click sound**

Visit https://freesound.org/search/?q=ui+click&f=license%3A%22Creative+Commons+0%22 and download a short (<200ms) UI click sound. Convert to MP3 if needed (online tool or `ffmpeg -i input.wav -b:a 96k click.mp3`). Place at `Code/project-abyssial/public/sfx/click.mp3`, target size ≤ 20 KB.

**Fallback if sourcing fails:** Skip this task. Leave `public/sfx/` empty. The audio module no-ops gracefully on missing assets (verified in Task 4). Spec 2 will source proper SFX later. Note this in the commit message.

- [ ] **Step 3: Verify file exists and is reasonable size**

Run from `Code/project-abyssial`:

```bash
ls -la public/sfx/click.mp3
```

Expected: file exists, size < 30 KB.

- [ ] **Step 4: Commit**

```bash
git add public/sfx/
git commit -m "feat(audio): add CC0 placeholder click SFX"
```

(If you skipped Step 2: `git commit --allow-empty -m "chore(audio): defer click.mp3 sourcing — audio module no-ops gracefully"`)

---

## Task 3: Card back catalog (`src/data/cardBacks.ts`)

**Files:**
- Create: `Code/project-abyssial/src/data/cardBacks.ts`

- [ ] **Step 1: Create the catalog file**

Create `Code/project-abyssial/src/data/cardBacks.ts` with this exact content:

```typescript
export interface CardBack {
  slug: string
  file: string   // filename in /public/cardbacks/
  label: string  // human-readable name for the picker
}

export const CARD_BACKS: CardBack[] = [
  { slug: 'notegpt-default', file: 'notegpt-default.png', label: 'NoteGPT' },
  { slug: 'tarot-22',        file: 'tarot-22.png',        label: 'Tarot I' },
  { slug: 'tarot-27',        file: 'tarot-27.png',        label: 'Tarot II' },
  { slug: 'tarot-29',        file: 'tarot-29.png',        label: 'Tarot III' },
  { slug: 'tarot-sym',       file: 'tarot-sym.png',       label: 'Symmetrical' },
  { slug: 'painterly-15',    file: 'painterly-15.png',    label: 'Painterly I' },
  { slug: 'painterly-9',     file: 'painterly-9.png',     label: 'Painterly II' },
  { slug: 'gothic-4',        file: 'gothic-4.png',        label: 'Gothic' },
]

export const DEFAULT_CARD_BACK = CARD_BACKS[0]  // notegpt-default

export function getCardBackBySlug(slug: string): CardBack {
  return CARD_BACKS.find(cb => cb.slug === slug) ?? DEFAULT_CARD_BACK
}
```

- [ ] **Step 2: Typecheck**

Run from `Code/project-abyssial`:

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/cardBacks.ts
git commit -m "feat(data): add card back catalog with 8 entries"
```

---

## Task 4: Audio settings persistence (`src/engine/audioSettings.ts`)

**Files:**
- Create: `Code/project-abyssial/src/engine/audioSettings.ts`

- [ ] **Step 1: Create the persistence helper**

Create `Code/project-abyssial/src/engine/audioSettings.ts` with this exact content:

```typescript
import { DEFAULT_CARD_BACK, getCardBackBySlug } from '../data/cardBacks'

const KEY_MUSIC = 'abyssial.musicVolume'
const KEY_SFX   = 'abyssial.sfxVolume'
const KEY_BACK  = 'abyssial.cardBack'

export const DEFAULT_MUSIC_VOLUME = 40
export const DEFAULT_SFX_VOLUME   = 70

function clampVolume(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function getMusicVolume(): number {
  const raw = localStorage.getItem(KEY_MUSIC)
  if (raw === null) return DEFAULT_MUSIC_VOLUME
  const n = Number(raw)
  return Number.isFinite(n) ? clampVolume(n) : DEFAULT_MUSIC_VOLUME
}

export function setMusicVolume(n: number): void {
  localStorage.setItem(KEY_MUSIC, String(clampVolume(n)))
}

export function getSfxVolume(): number {
  const raw = localStorage.getItem(KEY_SFX)
  if (raw === null) return DEFAULT_SFX_VOLUME
  const n = Number(raw)
  return Number.isFinite(n) ? clampVolume(n) : DEFAULT_SFX_VOLUME
}

export function setSfxVolume(n: number): void {
  localStorage.setItem(KEY_SFX, String(clampVolume(n)))
}

export function getCardBackSlug(): string {
  const raw = localStorage.getItem(KEY_BACK)
  if (raw === null) return DEFAULT_CARD_BACK.slug
  // Validate against catalog — unknown slug falls back to default
  return getCardBackBySlug(raw).slug
}

export function setCardBackSlug(slug: string): void {
  const validated = getCardBackBySlug(slug).slug
  localStorage.setItem(KEY_BACK, validated)
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Smoke-test in browser dev console**

Run `npm run dev` and open the app. In the browser console run:

```js
localStorage.removeItem('abyssial.musicVolume')
// Then in another console, reload and run:
// import-not-allowed-in-console — instead test via UI later
```

(Skip if devtools workflow is fiddly — Task 5/9 will exercise these functions through actual UI.)

- [ ] **Step 4: Commit**

```bash
git add src/engine/audioSettings.ts
git commit -m "feat(audio): add localStorage helpers for music/sfx volume and card back"
```

---

## Task 5: Audio module (`src/engine/audio.ts`)

**Files:**
- Create: `Code/project-abyssial/src/engine/audio.ts`

- [ ] **Step 1: Create the audio module**

Create `Code/project-abyssial/src/engine/audio.ts` with this exact content:

```typescript
import { getMusicVolume, getSfxVolume } from './audioSettings'

// ── SFX ──────────────────────────────────────────────────────────────────────

const SFX_PATHS: Record<string, string> = {
  click: '/sfx/click.mp3',
}

export type SfxKey = keyof typeof SFX_PATHS | string

export function playSfx(key: SfxKey): void {
  const path = SFX_PATHS[key]
  if (!path) return
  const vol = getSfxVolume()
  if (vol <= 0) return
  try {
    const a = new Audio(path)
    a.volume = vol / 100
    a.play().catch(() => { /* asset missing or autoplay blocked — silent */ })
  } catch {
    /* Audio constructor failed — silent */
  }
}

// ── Music ────────────────────────────────────────────────────────────────────

const MUSIC_PATHS: Record<string, string> = {
  // Empty in Spec 1 — Spec 2 will add: menu, intro, game, etc.
}

export type MusicKey = keyof typeof MUSIC_PATHS | null

let musicEl: HTMLAudioElement | null = null
let currentMusicKey: string | null = null

export function playMusic(key: MusicKey): void {
  if (key === null) { stopMusic(); return }
  const path = MUSIC_PATHS[key]
  if (!path) return  // unknown key or no asset registered

  if (currentMusicKey === key && musicEl) {
    // Already playing — just re-apply volume
    musicEl.volume = getMusicVolume() / 100
    return
  }

  stopMusic()
  try {
    musicEl = new Audio(path)
    musicEl.loop = true
    musicEl.volume = getMusicVolume() / 100
    currentMusicKey = key
    musicEl.play().catch(() => { /* asset missing or autoplay blocked — silent */ })
  } catch {
    musicEl = null
    currentMusicKey = null
  }
}

export function stopMusic(): void {
  if (musicEl) {
    try { musicEl.pause() } catch { /* noop */ }
    musicEl = null
  }
  currentMusicKey = null
}

export function applyMusicVolume(): void {
  // Call after audioSettings.setMusicVolume() to update the live element
  if (musicEl) {
    musicEl.volume = getMusicVolume() / 100
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/engine/audio.ts
git commit -m "feat(audio): add HTML5 Audio module with sfx + music playback"
```

---

## Task 6: Settings modal component (`src/components/SettingsModal.tsx`)

**Files:**
- Create: `Code/project-abyssial/src/components/SettingsModal.tsx`

- [ ] **Step 1: Create the modal component**

Create `Code/project-abyssial/src/components/SettingsModal.tsx` with this exact content:

```typescript
import { useState } from 'react'
import { CARD_BACKS } from '../data/cardBacks'
import {
  getMusicVolume, setMusicVolume,
  getSfxVolume,   setSfxVolume,
  getCardBackSlug, setCardBackSlug,
} from '../engine/audioSettings'
import { playSfx, applyMusicVolume } from '../engine/audio'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const [music, setMusic] = useState(getMusicVolume())
  const [sfx,   setSfx]   = useState(getSfxVolume())
  const [back,  setBack]  = useState(getCardBackSlug())

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
            position: 'absolute', top: '0.5rem', right: '0.6rem',
            background: 'none', border: 'none',
            color: 'var(--text-dim)', fontSize: '1.1rem',
            cursor: 'pointer', padding: '0.25rem 0.5rem',
          }}
        >
          ×
        </button>

        {/* Audio section */}
        <div>
          <div style={{ fontSize: '0.82rem', color: 'var(--gold)', fontVariant: 'small-caps', letterSpacing: '0.08em', marginBottom: '0.8rem' }}>
            Audio
          </div>
          <SliderRow label="Music"          value={music} onChange={onMusicChange} />
          <SliderRow label="Sound Effects"  value={sfx}   onChange={onSfxChange}   />
        </div>

        {/* Card back section */}
        <div>
          <div style={{ fontSize: '0.82rem', color: 'var(--gold)', fontVariant: 'small-caps', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text)', minWidth: '6.5rem' }}>{label}</div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={onChange}
        style={{ flex: 1 }}
      />
      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', minWidth: '2.5rem', textAlign: 'right' }}>{value}%</div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsModal.tsx
git commit -m "feat(ui): add SettingsModal with audio sliders and card back picker"
```

---

## Task 7: Main menu — expand to 2×3 with Settings + Codex tiles

**Files:**
- Modify: `Code/project-abyssial/src/components/MainMenu.tsx`

- [ ] **Step 1: Add SettingsModal import and modal state**

Open `src/components/MainMenu.tsx`. After the existing imports (top of file), add:

```typescript
import { SettingsModal } from './SettingsModal'
import { playSfx } from '../engine/audio'
```

Inside the `MainMenu` function, after the existing `useState` calls (near line 24), add:

```typescript
const [showSettings, setShowSettings] = useState(false)
```

- [ ] **Step 2: Replace the 2×2 grid with a 2×3 grid**

Locate the `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>` block (around line 168) and replace the entire 4-button grid contents.

Replace this block:

```typescript
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
              <button className="menu-card" onClick={() => goToPhase('godPathSelect')} style={{ background: 'rgba(8,6,3,0.91)' }}>
                <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>New</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>Begin a new ritual</div>
              </button>
              <button
                className="menu-card"
                disabled={!saveInfo}
                onClick={() => { if (saveInfo) loadRun() }}
                style={{ background: 'rgba(8,6,3,0.91)' }}
              >
                <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: saveInfo ? 'var(--gold)' : 'rgba(160,140,110,0.4)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Continue</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>
                  {saveInfo
                    ? `Turn ${saveInfo.turnCount} · ${GOD_LABEL[saveInfo.runConfig.godPath] ?? saveInfo.runConfig.godPath}`
                    : 'No save found'}
                </div>
              </button>
              <button className="menu-card" onClick={() => startTutorial()} style={{ background: 'rgba(8,6,3,0.91)' }}>
                <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Tutorial</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>
                  {tutorialDone ? 'Replay the introduction' : 'Learn the ritual'}
                </div>
              </button>
              <button className="menu-card" onClick={() => crossFade(() => { sessionStorage.removeItem('seenIntro'); setPhase('splash') })} style={{ background: 'rgba(8,6,3,0.91)' }}>
                <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: 'var(--text-dim)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Intro</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>Watch the opening</div>
              </button>
            </div>
```

with this new version:

```typescript
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
              <button className="menu-card" onClick={() => { playSfx('click'); goToPhase('godPathSelect') }} style={{ background: 'rgba(8,6,3,0.91)' }}>
                <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>New</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>Begin a new ritual</div>
              </button>
              <button
                className="menu-card"
                disabled={!saveInfo}
                onClick={() => { if (saveInfo) { playSfx('click'); loadRun() } }}
                style={{ background: 'rgba(8,6,3,0.91)' }}
              >
                <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: saveInfo ? 'var(--gold)' : 'rgba(160,140,110,0.4)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Continue</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>
                  {saveInfo
                    ? `Turn ${saveInfo.turnCount} · ${GOD_LABEL[saveInfo.runConfig.godPath] ?? saveInfo.runConfig.godPath}`
                    : 'No save found'}
                </div>
              </button>
              <button className="menu-card" onClick={() => { playSfx('click'); startTutorial() }} style={{ background: 'rgba(8,6,3,0.91)' }}>
                <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Tutorial</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>
                  {tutorialDone ? 'Replay the introduction' : 'Learn the ritual'}
                </div>
              </button>
              <button className="menu-card" onClick={() => { playSfx('click'); crossFade(() => { sessionStorage.removeItem('seenIntro'); setPhase('splash') }) }} style={{ background: 'rgba(8,6,3,0.91)' }}>
                <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: 'var(--text-dim)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Intro</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>Watch the opening</div>
              </button>
              <button className="menu-card" onClick={() => { playSfx('click'); setShowSettings(true) }} style={{ background: 'rgba(8,6,3,0.91)' }}>
                <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Settings</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>Audio & card back</div>
              </button>
              <button className="menu-card" disabled style={{ background: 'rgba(8,6,3,0.91)', opacity: 0.4, cursor: 'default' }}>
                <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: 'var(--text-dim)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Codex</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>Lore index — soon</div>
              </button>
            </div>
```

- [ ] **Step 3: Render the SettingsModal**

Locate the existing `{showPrompt && phase === 'menu' && ( … )}` block (the first-launch tutorial prompt, around line 203). After its closing `)}`, add the modal render:

```typescript
      {/* ── Settings modal ── */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Smoke test**

Run `npm run dev`, open the app. Verify:
1. Main menu shows a 2×3 grid: New / Continue / Tutorial / Intro / Settings / Codex.
2. Codex tile is greyed out and does nothing on click.
3. Settings tile opens the modal with two sliders and 8 card-back thumbnails.
4. Closing the modal (X, scrim, or Close button) dismisses it.
5. Clicking thumbnails changes the gold highlight.
6. Sliders move smoothly and show their % value.

- [ ] **Step 6: Commit**

```bash
git add src/components/MainMenu.tsx
git commit -m "feat(ui): expand main menu to 2x3 with Settings tile and Codex placeholder"
```

---

## Task 8: In-game floating gear button

**Files:**
- Modify: `Code/project-abyssial/src/components/GameScreen.tsx`

- [ ] **Step 1: Inspect current top-of-component imports and state**

Open `src/components/GameScreen.tsx` and confirm the import block at the top. You'll add a new import and a new piece of state.

Add to the top imports section:

```typescript
import { useState } from 'react'   // skip if already imported
import { SettingsModal } from './SettingsModal'
import { playSfx } from '../engine/audio'
```

(If `useState` is already imported from the same `react` line, leave it alone.)

- [ ] **Step 2: Add modal state at the top of the component**

Inside the `GameScreen` function body, near the other state hooks, add:

```typescript
const [showSettings, setShowSettings] = useState(false)
```

- [ ] **Step 3: Add the gear button and modal render**

Inside the top-level returned JSX wrapper (the outermost `<div>` that renders the game), add this as a sibling near the end (just before the closing tag of the wrapper):

```typescript
      {/* ── Floating settings gear ── */}
      <button
        onClick={() => { playSfx('click'); setShowSettings(true) }}
        aria-label="Open settings"
        style={{
          position: 'absolute',
          top: '0.6rem', right: '0.6rem',
          zIndex: 40,
          background: 'none', border: 'none',
          color: 'var(--gold)', opacity: 0.55,
          fontSize: '1.4rem', cursor: 'pointer',
          padding: '0.15rem 0.35rem',
          lineHeight: 1,
          transition: 'opacity 0.15s',
        }}
        onMouseDown={(e) => { e.currentTarget.style.opacity = '1' }}
        onMouseUp={(e)   => { e.currentTarget.style.opacity = '0.55' }}
        onMouseLeave={(e)=> { e.currentTarget.style.opacity = '0.55' }}
      >
        ⚙
      </button>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
```

**Important:** if the top-level wrapper does not have `position: 'relative'` (or `absolute`), the floating button will anchor to the page, not the screen. Inspect the outermost JSX wrapper of `GameScreen`. If it lacks `position`, add `position: 'relative'` to its inline style. (Most likely it already has `position: 'relative'` or `height: '100%'` with an ancestor positioned — verify by inspection.)

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Smoke test**

Run `npm run dev`, start a new run (skip tutorial), and verify:
1. Top-right of the game screen shows a low-opacity gold ⚙.
2. Tapping the ⚙ opens the SettingsModal (same modal as main menu).
3. Changing volume sliders persists when modal is closed and reopened.
4. Changing card back inside a run does not crash the game.

- [ ] **Step 6: Commit**

```bash
git add src/components/GameScreen.tsx
git commit -m "feat(ui): add floating settings gear button to in-game screen"
```

---

## Task 9: Card back rendering in `DrawPile.tsx`

**Files:**
- Modify: `Code/project-abyssial/src/components/game/DrawPile.tsx`

- [ ] **Step 1: Read the current DrawPile structure**

Open `src/components/game/DrawPile.tsx` and identify the JSX element with `width: '195px', height: '293px'` (the card-back visual). Note what currently renders inside it. The change replaces whatever's inside with an `<img>` + vignette + optional frame overlay.

- [ ] **Step 2: Add the import**

At the top of the file, add:

```typescript
import { useState, useEffect } from 'react'   // skip duplicates
import { getCardBackSlug } from '../../engine/audioSettings'
import { getCardBackBySlug } from '../../data/cardBacks'
```

(Adjust the relative path depth if the file is nested differently — the file lives at `src/components/game/DrawPile.tsx`, so `../../engine/audioSettings` and `../../data/cardBacks` are correct.)

- [ ] **Step 3: Read card back inside the component**

Inside the `DrawPile` function body, near the top, add:

```typescript
const cardBack = getCardBackBySlug(getCardBackSlug())
const [frameOk, setFrameOk] = useState(true)
```

- [ ] **Step 4: Replace the card-back inner content**

Locate the element with `style={{ position: 'relative', width: '195px', height: '293px', cursor: 'pointer', opacity: isEmpty ? 0.72 : 1, transition: 'opacity 0.4s' }}` (line ~21 per existing source). Its children currently render the back visual.

**Inside that element**, replace its existing children (whatever they are — typically a parchment background, an icon, etc.) with this exact JSX:

```typescript
        {!isEmpty && (
          <>
            <img
              src={`/cardbacks/${cardBack.file}`}
              alt=""
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                borderRadius: '6px',
                display: 'block',
              }}
            />
            {/* CSS edge vignette */}
            <div
              style={{
                position: 'absolute', inset: 0,
                borderRadius: '6px',
                pointerEvents: 'none',
                boxShadow: 'inset 0 0 22px 6px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(0,0,0,0.7)',
              }}
            />
            {/* Optional iron frame overlay — hides itself on 404 */}
            {frameOk && (
              <img
                src="/cardback-frame.png"
                alt=""
                onError={() => setFrameOk(false)}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  display: 'block',
                }}
              />
            )}
          </>
        )}
```

**Preserve** any existing rendering for the `isEmpty` state (the "empty pile" visual) — only the populated-pile visual changes. If the existing code does not branch on `isEmpty` inside the inner content, keep the original empty-state markup where it was and wrap the new card-back markup with `{!isEmpty && (...)}` as shown.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Smoke test**

Run `npm run dev`, start a run, and verify:
1. The draw pile shows the selected card-back image with a dark vignette on all four edges.
2. Open Settings (gear), change card back, close modal → the pile updates to the new back on the next render (may require a click on an option or any UI interaction that triggers a re-render).
3. Empty-pile state still renders correctly when the draw pile is exhausted.
4. Browser dev console shows no 404 errors except possibly `/cardback-frame.png` (expected; the optional frame is opt-in).

- [ ] **Step 7: Commit**

```bash
git add src/components/game/DrawPile.tsx
git commit -m "feat(ui): render selected card back with vignette and optional frame overlay"
```

---

## Task 10: Wire `playSfx('click')` into remaining UI buttons

**Files:**
- Modify: any component with `<button onClick>` not already wired in earlier tasks

- [ ] **Step 1: Identify candidate buttons**

Run from `Code/project-abyssial`:

```bash
grep -rn "onClick" src/components --include="*.tsx"
```

Note the locations. Skip:
- Buttons already wired in Task 7 (MainMenu tiles) and Task 8 (gear).
- Buttons inside SettingsModal (the modal handles its own playSfx).
- Buttons inside `IntroScreen.tsx` if the intro is silent by design.
- Pure navigation arrows inside carousels (`InsertPreviewOverlay`, `RemovalPreviewOverlay`) — those click frequently and would be noisy. Leave them silent for now.

**Wire `playSfx('click')` into:**
- `OptionsColumn.tsx` — the main option buttons (the core game interaction).
- `FailureScreen.tsx` — any restart/main-menu buttons.
- `VictoryScreen.tsx` — any continue/main-menu buttons.
- `TutorialCompleteScreen.tsx` — any continue buttons.
- `SetupScreens.tsx` — god path selection buttons.

- [ ] **Step 2: For each file in the list, add the import**

At the top of each file:

```typescript
import { playSfx } from '../engine/audio'
// (adjust relative path: `../../engine/audio` for files in src/components/game/)
```

- [ ] **Step 3: Wire each button**

For every relevant `onClick={someHandler}` in those files, change to:

```typescript
onClick={() => { playSfx('click'); someHandler() }}
```

Or for inline handlers, prepend the call:

```typescript
onClick={() => { playSfx('click'); /* existing handler body */ }}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Smoke test**

Run `npm run dev` with SFX volume at 70 (default). Click through:
1. Main menu tiles → click sound on each.
2. God path selection → click sound on each.
3. In-game option buttons → click sound on each.
4. Failure / Victory / Tutorial-Complete screens → click sound on buttons.
5. Lower SFX slider to 0 in Settings → confirm no click sound.
6. Raise back to 70 → click sound returns.

(If `public/sfx/click.mp3` was skipped in Task 2, you will hear no sound; verify instead that the dev console shows no errors when clicking — the `.play().catch` swallows the 404.)

- [ ] **Step 6: Commit**

```bash
git add src/components/
git commit -m "feat(audio): wire playSfx click into core UI buttons"
```

---

## Task 11: Final manual playtest verification

- [ ] **Step 1: Reset localStorage & verify defaults**

In browser dev console:

```js
localStorage.clear()
location.reload()
```

Open Settings → confirm Music slider at 40%, SFX slider at 70%, NoteGPT card back selected.

- [ ] **Step 2: Run through the spec's testing checklist**

For each item, mark pass/fail:

- [ ] All 8 card backs visible and selectable in modal.
- [ ] Picking a back persists across reload.
- [ ] SFX slider at 0 = no click sound on button presses.
- [ ] SFX slider at 70 (default) = audible click on every wired UI button (skip if Task 2 was deferred).
- [ ] Music slider at any value = silent (no music asset in Spec 1).
- [ ] In-game gear opens the same modal as the menu tile.
- [ ] Modal dismiss on scrim tap works.
- [ ] Modal dismiss on X tap works.
- [ ] Codex tile is visibly disabled and not clickable.
- [ ] Vignette visible on all 8 card backs (with `/cardback-frame.png` absent).
- [ ] Reload-mid-run with non-default card back: pile still shows correct back after load.

- [ ] **Step 3: Knowledge base updates (controller-side, no git commit)**

`knowledge/` lives at the vault root, **outside** the `Code/project-abyssial` git repo. These updates are vault-resident Obsidian notes — do **not** attempt `git add knowledge/` from inside the code repo. The controller (Claudian) handles knowledge updates manually after subagent work completes. Specifically the controller will:

1. Append a completion entry to `E:/Project Abyssial/knowledge/backlog.md` under a fitting section.
2. Create `E:/Project Abyssial/knowledge/sessions/session-70.md` summarising commits and decisions.
3. Update any relevant agent context files in `E:/Project Abyssial/knowledge/agents/` if needed.

If you are an implementer subagent: skip this step entirely. Report DONE after Step 2.

---

## Self-Review

**Spec coverage** — each spec section mapped to a task:

| Spec section | Task(s) |
|---|---|
| New file: `engine/audioSettings.ts` | Task 4 |
| New file: `engine/audio.ts` | Task 5 |
| New file: `components/SettingsModal.tsx` | Task 6 |
| New file: `data/cardBacks.ts` | Task 3 |
| Asset: `public/cardbacks/*.png` | Task 1 |
| Asset: `public/sfx/click.mp3` | Task 2 |
| Edit: `MainMenu.tsx` (2×3 grid, Settings tile, Codex placeholder, click SFX) | Task 7 |
| Edit: `GameScreen.tsx` (floating gear) | Task 8 |
| Edit: `DrawPile.tsx` (img + vignette + frame overlay) | Task 9 |
| Edit: button-bearing components (click SFX) | Task 10 |
| Edit: `InsertPreviewOverlay.tsx` (no change) | — (explicitly out of scope per spec) |
| Testing checklist | Task 11 |

All spec deliverables have a task. No gaps.

**Placeholder scan** — none. Every code step has the actual code. Task 2 has an explicit fallback path (skip if sourcing fails). Task 10 has a concrete grep+filter procedure rather than a vague "wire all buttons".

**Type consistency** — exported names check:
- `audioSettings.ts` exports `getMusicVolume`, `setMusicVolume`, `getSfxVolume`, `setSfxVolume`, `getCardBackSlug`, `setCardBackSlug`, `DEFAULT_MUSIC_VOLUME`, `DEFAULT_SFX_VOLUME` — all consumed correctly in Tasks 5, 6, 9.
- `audio.ts` exports `playSfx`, `playMusic`, `stopMusic`, `applyMusicVolume` — `playSfx` consumed in Tasks 6, 7, 8, 10; `applyMusicVolume` consumed in Task 6.
- `cardBacks.ts` exports `CARD_BACKS`, `CardBack`, `DEFAULT_CARD_BACK`, `getCardBackBySlug` — consumed in Tasks 4, 6, 9.

All consistent.
