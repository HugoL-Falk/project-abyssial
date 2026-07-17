# Settings Screen, Card-Back Selector & Audio Plumbing — Design

**Date:** 2026-06-13
**Session:** 70
**Status:** Approved, ready for plan

This is **Spec 1 of 2**. Spec 2 (audio assets — music tracks, rain, lightning, full SFX library) is a separate later effort.

---

## Goal

Add a Settings UI surface to the main menu (and in-game), letting the player:

- Choose which card-back image is shown on the draw pile (8 options).
- Adjust music and SFX volume independently (sliders, 0–100, where 0 = muted).

Ship the audio plumbing now so Spec 2 can drop in real assets with no code changes. Ship a placeholder click SFX so the SFX slider is end-to-end testable today.

---

## Architecture overview

- **One `SettingsModal` component**, opened from two entry points: a tile on the main menu and a small floating gear button in-game.
- **Audio layer** is a standalone module under `engine/`, decoupled from the Zustand store. Components call `playSfx('click')` directly — no React hook needed.
- **Persistence** mirrors the pattern in `engine/blessings.ts` — one helper file with safe-fallback `get`/`set` per key.
- **Card back** is an `<img>` swap inside `DrawPile.tsx`, reading the current choice from `audioSettings` on render.
- **Frame overlay** (raster PNG) is optional — see `knowledge/decisions.md` "Card Back Frame (s70)". When the PNG exists at `/cardback-frame.png` it activates automatically; otherwise the CSS edge vignette stands alone.

---

## New files

| Path | Responsibility | Approx. size |
|---|---|---|
| `src/engine/audioSettings.ts` | localStorage get/set for `musicVolume`, `sfxVolume`, `cardBack`. Exported constants for defaults. Safe fallbacks on read. | ~50 lines |
| `src/engine/audio.ts` | HTML5 Audio singleton for music; throw-away `Audio()` for SFX. Exposes `playSfx(key)`, `playMusic(key \| null)`, `setMusicVolume(n)`, `setSfxVolume(n)`, `stopMusic()`. Reads current volumes from `audioSettings` on each call. Silently no-ops if asset file 404s. | ~80 lines |
| `src/components/SettingsModal.tsx` | The modal panel — two volume sliders + card-back picker (horizontal scroll of 8 thumbnails). Used by both menu and in-game entry points. | ~150 lines |
| `src/data/cardBacks.ts` | Exports `CARD_BACKS: { slug, file, label }[]` and `DEFAULT_CARD_BACK`. Single source of truth for the 8 backs. | ~20 lines |
| `public/cardbacks/*.png` | The 8 PNGs copied from `Art/Card Backs/best/`, renamed to web-friendly slugs (e.g. `notegpt-default.png`, `tarot-22.png`, `gothic-4.png`). | — |
| `public/sfx/click.mp3` | Placeholder click SFX (CC0). ~10 KB, <100 ms duration. Verifies SFX slider works end-to-end. Sourced from freesound.org CC0 pool during implementation. | — |

---

## Edits to existing files

| File | Change | Approx. lines |
|---|---|---|
| `src/components/MainMenu.tsx` | Grid 2×2 → 2×3. `Settings` tile and `Codex` placeholder tile added. Settings tile opens `<SettingsModal />`. | +20 |
| `src/components/GameScreen.tsx` | Add floating top-right gear button (~28px, low-opacity gold, absolutely positioned). Opens `<SettingsModal />`. | +15 |
| `src/components/game/DrawPile.tsx` | Replace any hardcoded card-back visual with `<img src={`/cardbacks/${currentBack}`}>` + CSS edge vignette (`box-shadow: inset 0 0 22px 6px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(0,0,0,0.7)`). Reads `currentBack` from `audioSettings.getCardBack()`. Frame overlay: `<img src="/cardback-frame.png" onError={hide} style={{position:'absolute',inset:0,pointerEvents:'none',objectFit:'cover'}}>`. | +25 |
| `src/components/game/InsertPreviewOverlay.tsx` | **No change.** Its flip-back (`card-parchment` with ✦) is a transition placeholder for the insert-preview UX, not the player's deck card back — different concept, intentionally left as parchment. | 0 |
| Any button calling `playSfx('click')` | Wire `playSfx('click')` into onClick handlers — main menu tiles, settings buttons, in-game options column, gear button, modal dismiss. Specific list compiled during plan phase. | scattered |

---

## Data flow

### User drags Music slider
1. Slider `onChange` → `audioSettings.setMusicVolume(n)` (writes localStorage).
2. → `audio.setMusicVolume(n)` (applies to live `<audio>` element if music is playing; in Spec 1 nothing is playing).
3. Slider re-renders with new value. No Zustand store touched.

### User picks a new card back
1. Thumbnail `onClick` → `audioSettings.setCardBack(slug)` + `playSfx('click')`.
2. Modal local state updates → highlights new thumbnail.
3. Next render of `DrawPile.tsx` reads the new value and swaps the `<img>` src. On the main menu (where the pile isn't visible) the change applies on next game start; in-game it shows immediately on the next React render cycle, which fires when the modal closes.

### User clicks any UI button
1. `onClick` → `playSfx('click')`.
2. `audio.ts` reads current `sfxVolume` from `audioSettings`. If 0, returns early.
3. Creates `new Audio('/sfx/click.mp3')`, sets `.volume = sfxVolume/100`, calls `.play().catch(noop)`.
4. If the asset 404s, `.catch` swallows the error silently.

---

## UI behavior

### Settings modal
- ~320px wide centered card, full dark scrim behind (`rgba(0,0,0,0.78)`).
- Tap scrim or close button (X, top-right) to dismiss.
- Sections top → bottom:
  1. Header **"Audio"**
  2. Music slider — label "Music", 0–100 range, % readout to the right.
  3. SFX slider — label "Sound Effects", 0–100 range, % readout to the right.
  4. Header **"Card Back"**
  5. Horizontal-scrollable thumbnail strip — 8 thumbnails (~56×84 each), the selected one bordered in gold (`var(--gold)`).
  6. Close button at the bottom (`btn-secondary` style).
- Styling matches the existing first-launch tutorial prompt modal in `MainMenu.tsx` — same `var(--surface)`, `var(--border)`, 8px radius.

### In-game gear button
- Position: `top: 0.6rem, right: 0.6rem`, `z-index: 40` (above `ResourceBar`).
- Appearance: ~28px round, low-opacity gold (`color: var(--gold); opacity: 0.55`), gear glyph (⚙).
- Active state: opacity rises to 1 on press.
- Opens the same `<SettingsModal />` as the menu tile.

### Codex tile
- Visible in 2×3 grid as a `menu-card` button with `disabled` attribute.
- Visual: `opacity: 0.4`, no `onClick`, label `Codex` (top) + subtitle `Lore index — soon` (bottom).

### Main menu grid (new layout, 2×3, reading order left→right top→bottom)
```
New        | Continue
Tutorial   | Intro
Settings   | Codex (disabled)
```

---

## Persistence

```
localStorage['abyssial.musicVolume']  → number 0-100, default 40
localStorage['abyssial.sfxVolume']    → number 0-100, default 70
localStorage['abyssial.cardBack']     → string slug, default 'notegpt-default'
```

All reads have safe fallbacks: invalid number → default; missing slug or slug not in `CARD_BACKS` → default. Helper lives in `src/engine/audioSettings.ts`.

---

## Card back set

Eight PNGs from `Art/Card Backs/best/`, copied into `public/cardbacks/` and slugged for web:

| Slug | Source file | Default? |
|---|---|---|
| `notegpt-default` | `NoteGPT_Image_20260612221100.png` | ✓ |
| `tarot-22` | `a-vertical-tarot-card-back-design-perfect-symmetry(22)-ezremove.png` | |
| `tarot-27` | `a-vertical-tarot-card-back-design-perfect-symmetry(27)-ezremove.png` | |
| `tarot-29` | `a-vertical-tarot-card-back-design-perfect-symmetry(29)-ezremove.png` | |
| `tarot-sym` | `a-vertical-tarot-card-back-design-symmetrical-comp-ezremove.png` | |
| `painterly-15` | `a-vertical-playing-card-back-design-painterly-digi(15)-ezremove.png` | |
| `painterly-9` | `a-vertical-playing-card-back-design-painterly-digi(9)-ezremove.png` | |
| `gothic-4` | `a-vertical-playing-card-back-design-gothic-art-sty(4)-ezremove.png` | |

`labels` for the thumbnail picker are short human-readable names ("NoteGPT", "Tarot I", "Tarot II", "Tarot III", "Symmetrical", "Painterly I", "Painterly II", "Gothic"). Aspect handled with `object-fit: cover` to the 195×293 card frame.

---

## Out of scope (Spec 2)

- Menu and intro background music tracks
- Rain overlay sound
- Lightning crackle layered over intro / menu videos
- In-game ambient music
- Full UI SFX library (beyond the placeholder click)
- Sourcing and licensing of real audio assets
- Iron frame PNG generation (tracked separately as `P13-art-frame` in `knowledge/backlog.md`)

---

## Testing notes (for plan phase manual checklist)

- All 8 card backs visible and selectable in modal.
- Picking a back persists across reload.
- SFX slider at 0 = no click sound on button presses.
- SFX slider at 70 (default) = audible click on every wired UI button.
- Music slider at any value = silent (no music asset in Spec 1).
- In-game gear opens the same modal as the menu tile.
- Modal dismiss on scrim tap works.
- Modal dismiss on X tap works.
- Codex tile is visibly disabled and not clickable.
- Vignette visible on all 8 card backs (with `/cardback-frame.png` absent).
- (Once frame PNG exists) Frame overlays cleanly with the center transparent area showing card art through.
- Reload-mid-run with non-default card back: pile still shows correct back after load.
