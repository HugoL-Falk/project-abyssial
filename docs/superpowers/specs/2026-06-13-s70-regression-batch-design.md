# S70 Regression Batch — Design Spec

**Date:** 2026-06-13
**Scope:** P14-1, P14-6, P14-7, P14-8
**Branch:** `claude/build-abyssial-game-IuJp8` (local only)
**Investigation notes:** `knowledge/investigations/2026-06-13-s70-regression-batch.md`

---

## Goal

Resolve the four UI/UX regressions and structural gaps introduced when Session 70 shipped the Settings + card-back + audio system. Consolidate the in-game menu surface, simplify the main menu, and finish the flip-back / slider visual loose ends.

---

## P14-1 — Flip-back face uses the chosen card back

### Current state
`InsertPreviewOverlay.tsx` (and the mirror `RemovalPreviewOverlay.tsx`) render the flip-back face as a `card-parchment` div with a faint gold `✦` glyph. The chosen card back from `getCardBackSlug()` is never read.

### Change
- Both overlays render the flip-back face as `<img src={/cardbacks/{file}}>` using the active card back from `data/cardBacks.ts` resolved via `getCardBackSlug()`.
- Apply the same dark-edge inset vignette already used in `DrawPile.tsx` so the flip-back reads identically to the deck.
- The optional `/cardback-frame.png` overlay (`P13-art-frame`) auto-activates here too if the asset exists.

### Decision override
Session 70 explicitly chose parchment + ✦ for the flip-back as a "transition placeholder." This spec **inverts that decision** per user direction. Update `knowledge/decisions.md` accordingly when the batch ships.

### Files
- `src/components/game/InsertPreviewOverlay.tsx`
- `src/components/game/RemovalPreviewOverlay.tsx` (verify shape; mirror change)
- `knowledge/decisions.md` (post-ship)

---

## P14-6 — Settings sliders overflow + style mismatch

### Current state
`SettingsModal.tsx > SliderRow` lays out `label (minWidth 6.5rem) | range (flex 1) | value (minWidth 2.5rem)` on a single row. The range input's browser intrinsic min-width pushes the row past the 320px modal on some Android Chrome builds. Range thumb is unstyled OS default — mismatched with the rest of the gold/parchment UI.

### Change
- **Layout:** Stack `SliderRow` vertically.
  - Top row: label (left) + value `N%` (right), justify-between.
  - Bottom row: range input at full width.
  - Removes the label `minWidth` reservation entirely.
- **Styling:** Custom range styling in `index.css` (needs pseudo-element selectors):
  - Track: 2px high, `var(--border)` background, faint inset.
  - Thumb (`::-webkit-slider-thumb` + `::-moz-range-thumb`): 14px circle, `var(--gold)` fill, subtle dark border.
  - Targets the slider via a new class `.settings-slider` applied to the `<input type="range">`.

### Files
- `src/components/SettingsModal.tsx` (SliderRow layout)
- `src/index.css` (range thumb / track rules)

---

## P14-7 + P14-8 (in-game) — Consolidated `◇` menu

### Current state
- `GameScreen.tsx` renders a floating gear (`⚙`) at `top: 0.6rem; right: 0.6rem` that opens the full `SettingsModal`.
- `PassiveSummaryButton` (`◇`) sits at the right end of `ResourceBar.tsx` with a popover summarising upcoming passive effects.
- Gear visually overlaps the `◇`.

### Change
- **Delete the floating gear** from `GameScreen.tsx` (button + state + import).
- **Rebrand `PassiveSummaryButton` → `InGameMenuButton`** (file renamed, icon stays `◇` for continuity). Component owns the popover that now hosts three sections.

### Popover structure

```
┌─ ◇ popover ────────────────────┐
│ Passives                       │  (existing aggregation, unchanged)
│   <existing content>           │
│                                │
│ ── divider ──                  │
│ Audio                          │
│   Music   [——●———]  40%        │  (volume only — no card back)
│   SFX     [—————●——] 70%       │
│                                │
│ ── divider ──                  │
│ Run                            │
│   ↻ Restart      (inline confirm)
│   ✕ Quit to menu (inline confirm)
└────────────────────────────────┘
```

### Run section behaviour
- **Restart**: clears save, rebuilds deck from the current run's `runConfig` + selected blessings, resets resources/turn/reshuffle state, phase stays `'playing'`. New store action `restartRun()`.
- **Quit to menu**: clears save, calls `goToPhase('menu')`. Reuses existing primitives.
- **Inline confirm:** Tapping Restart or Quit swaps the row text to `Lose this run?  [Confirm] [Cancel]`. No full modal. Auto-cancels if popover closes.

### Sliders inside the popover
- Reuse the same restyled `SliderRow` from P14-6. No card-back picker (menu-only).
- Live updates via `applyMusicVolume()` exactly as in `SettingsModal`.

### Files
- `src/components/game/PassiveSummaryButton.tsx` → rename to `InGameMenuButton.tsx`, expand structure
- `src/components/game/ResourceBar.tsx` (import rename)
- `src/components/GameScreen.tsx` (delete floating gear, delete `showSettings` local state)
- `src/state/gameStore.ts` (add `restartRun()` action)

### New store action shape

```ts
restartRun: () => {
  const cfg = get().runConfig
  const blessings = get().blessings.selected
  if (!cfg) return
  clearSave()
  // re-invoke the same path New uses to bootstrap a fresh run
  get().startRun(cfg, blessings)
}
```
(Exact entry point determined during implementation — likely `startRun` or its equivalent; verify against current store.)

---

## P14-8 (main menu) — 3-tile layout

### Current state
2×3 grid with: New, Continue, Tutorial, Intro, Settings, Codex (disabled).

### Change
- **Tiles reduce to three**: Continue · New · Settings.
- Layout: single-column vertical stack, 3 tiles, same `.menu-card` styling. (Vertical stack reads cleaner at portrait mobile widths than 1×3 horizontal; final choice during implementation.)
- **Continue**: unchanged behaviour. Disabled when `loadSaveData()` returns null.
- **New**: unchanged behaviour. `goToPhase('godPathSelect')`.
- **Settings**: opens `SettingsModal` with `context: 'menu'` (see below).

### Expanded `SettingsModal` (menu context)
Adds three rows beneath the existing Audio + Card Back sections:

```
Audio
  Music     [slider]  N%
  SFX       [slider]  N%

Card Back
  [8 thumbnails]

── divider ──
Replay Tutorial          → startTutorial()
Replay Intro             → re-trigger splash video
Codex                    (disabled "Lore index — soon")
```

### `SettingsModal` context prop
- New prop: `context: 'menu' | 'inGame'`.
- `'menu'` (default): renders audio + card back + replay actions + Codex placeholder.
- `'inGame'`: not used by `SettingsModal` directly — the in-game volume sliders live inside `InGameMenuButton`'s popover. `SettingsModal` therefore only ever opens from the menu in this design. The prop is kept for forward-compatibility; current implementation may default to `'menu'` and skip the in-game branch entirely.

> Simplification: if `SettingsModal` is only ever opened from the main menu after this batch, the context prop is unnecessary. Final call during implementation — drop the prop if true.

### First-launch tutorial prompt
Unchanged. Still appears when `tutorialDone` is false. Primary new-player path.

### Replay Intro wiring
- The current Intro tile calls `crossFade(() => { sessionStorage.removeItem('seenIntro'); setPhase('splash') })`.
- That logic moves into the SettingsModal action; modal closes first, then triggers the same fade-to-splash.

### Files
- `src/components/MainMenu.tsx` (grid → 3-tile stack, drop Tutorial / Intro / Codex tiles)
- `src/components/SettingsModal.tsx` (add replay tutorial / replay intro / Codex rows; possibly add context prop)

---

## Out of scope (explicit)

- Audio asset sourcing (S70-spec2 stays separate)
- Codex feature implementation (still a disabled placeholder)
- Iron card-back frame PNG (`P13-art-frame`)
- Any card mechanics or balance changes

---

## Acceptance checklist

- [ ] **P14-1:** Insert preview and removal preview flip animations show the player's chosen card back, with vignette parity to the draw pile.
- [ ] **P14-6:** Settings sliders fit inside the 320px modal at all viewport widths. Thumb + track styled in gold/parchment palette.
- [ ] **P14-7:** No floating gear on the game screen. `◇` button at the right end of the resource bar opens the unified popover.
- [ ] **P14-8 in-game:** `◇` popover contains Passives, Audio (volume only), and Run (Restart / Quit) sections. Restart + Quit each show inline confirm before acting. Restart preserves god path + blessings.
- [ ] **P14-8 menu:** Main menu shows exactly 3 tiles (Continue / New / Settings). Settings modal exposes Replay Tutorial, Replay Intro, and disabled Codex placeholder.
- [ ] First-launch tutorial prompt still appears for new installs.
- [ ] `knowledge/decisions.md` updated to reverse the S70 parchment flip-back decision.

---

## Open during implementation

- Whether the `SettingsModal` context prop is needed (drop if not used).
- Exact entry point for `restartRun()` — verify against current store's run-bootstrap helper.
- Layout micro-choice for the 3-tile menu (vertical stack vs 1×3 horizontal).
