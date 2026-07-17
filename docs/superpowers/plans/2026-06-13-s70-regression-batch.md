# S70 Regression Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve P14-1, P14-6, P14-7, P14-8 — flip-back card render, settings slider styling, consolidated in-game `◇` menu, and 3-tile main menu.

**Architecture:** Five vertical slices, each shippable on its own commit. Order is chosen so later tasks can lean on earlier ones (e.g. restyled SliderRow is reused in the in-game popover). No test framework in this project — verification gates are `npm run typecheck` + manual smoke check.

**Tech Stack:** React 18 + TypeScript + Vite + Zustand. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-13-s70-regression-batch-design.md`
**Branch:** `claude/build-abyssial-game-IuJp8` (local only; never push without explicit instruction)

---

## File map

| File | Operation | Reason |
|---|---|---|
| `src/components/game/InsertPreviewOverlay.tsx` | Modify | P14-1 flip-back image |
| `src/components/game/RemovalPreviewOverlay.tsx` | Modify (only if it uses flip; it does NOT — see Task 1) | P14-1 check |
| `src/index.css` | Modify | P14-6 slider styles, P14-1 (if vignette extracted) |
| `src/components/SettingsModal.tsx` | Modify | P14-6 SliderRow layout, P14-8 menu additions |
| `src/components/game/PassiveSummaryButton.tsx` | Rename + expand → `InGameMenuButton.tsx` | P14-7 + P14-8 in-game consolidation |
| `src/components/game/ResourceBar.tsx` | Modify | Update import after rename |
| `src/components/GameScreen.tsx` | Modify | Delete floating gear + state |
| `src/state/gameStore.ts` | Modify | Add `restartRun()` action |
| `knowledge/decisions.md` | Modify (post-ship) | Reverse S70 parchment decision |

---

## Task 1: P14-1 — Flip-back face uses chosen card back

**Files:**
- Modify: `src/components/game/InsertPreviewOverlay.tsx`
- Verify (no change expected): `src/components/game/RemovalPreviewOverlay.tsx`

**Context for engineer:**
- `getCardBackSlug()` lives in `src/engine/audioSettings.ts` — returns the slug string of the selected back.
- `getCardBackBySlug(slug)` lives in `src/data/cardBacks.ts` — returns `{ slug, file, label }`.
- The image lives at `/cardbacks/${file}` (public folder). See `DrawPile.tsx` for the canonical pattern, including the vignette `boxShadow` recipe.
- `RemovalPreviewOverlay.tsx` does NOT have a flip animation (carousel + fade only). Confirm during Step 1; if true, no change needed there.

- [ ] **Step 1: Confirm RemovalPreviewOverlay has no flip**

Run:
```bash
grep -n "flip\|rotateY\|isFlipped" src/components/game/RemovalPreviewOverlay.tsx
```
Expected: no matches. If matches appear, mirror the change from Step 2 there too.

- [ ] **Step 2: Replace InsertPreviewOverlay flip-back face with chosen card back**

In `src/components/game/InsertPreviewOverlay.tsx`, locate the existing flip-back `<div>`:

```tsx
<div className="flip-face card-parchment" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <span style={{ fontSize: '3rem', color: 'var(--gold)', opacity: 0.1 }}>✦</span>
</div>
```

Replace with:

```tsx
<div className="flip-face" style={{
  backgroundImage: `url(/cardbacks/${cardBackFile})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  border: '1px solid #3a3225',
  borderRadius: '6px',
  boxShadow: 'inset 0 0 22px 6px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(0,0,0,0.7)',
}} />
```

Add the resolution at the top of the component, just inside the function body:

```tsx
import { getCardBackSlug } from '../../engine/audioSettings'
import { getCardBackBySlug } from '../../data/cardBacks'
// ...
const cardBackFile = getCardBackBySlug(getCardBackSlug()).file
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual smoke**

Run `npm run dev`, start a run, queue a card insertion (any option that inserts a card next reshuffle, e.g. a `surfaceGodPathCard` or insertion-driven option). Confirm the flip animation reveals the chosen card back (default = NoteGPT), not the parchment ✦ placeholder. Switch backs in Settings, repeat, confirm new back appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/InsertPreviewOverlay.tsx
git commit -m "feat(P14-1): flip-back uses chosen card back in insert preview"
```

---

## Task 2: P14-6 — SliderRow vertical stack + styled range thumb

**Files:**
- Modify: `src/components/SettingsModal.tsx` (SliderRow only)
- Modify: `src/index.css`

- [ ] **Step 1: Add styled range CSS**

Append to `src/index.css`:

```css
/* ─── Settings slider styling ─────────────────────────────────────────────── */
.settings-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  outline: none;
  margin: 0;
  padding: 0;
  cursor: pointer;
}
.settings-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--gold);
  border: 1px solid rgba(0,0,0,0.5);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.5);
}
.settings-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--gold);
  border: 1px solid rgba(0,0,0,0.5);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.5);
}
.settings-slider::-moz-range-track {
  background: var(--border);
  height: 4px;
  border-radius: 2px;
}
```

- [ ] **Step 2: Restructure SliderRow to vertical stack**

In `src/components/SettingsModal.tsx`, replace the `SliderRow` function (currently lines ~135–150) with:

```tsx
function SliderRow({ label, value, onChange }: SliderRowProps) {
  return (
    <div style={{ marginBottom: '0.8rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '0.35rem',
      }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={onChange}
        className="settings-slider"
      />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + manual**

Run: `npm run typecheck` (expected: clean)

Manual: open Settings from the main menu on a narrow viewport (DevTools → iPhone SE 375×667). Confirm:
- Slider sits on its own row below label
- Label left, value % right, baseline-aligned
- Thumb is gold circle, track is thin dark line
- No horizontal overflow even at 320px modal max-width

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsModal.tsx src/index.css
git commit -m "feat(P14-6): stack settings sliders + gold thumb styling"
```

---

## Task 3: Add `restartRun()` store action

**Files:**
- Modify: `src/state/gameStore.ts`

**Context for engineer:**
- `resetGame` (line ~296) shows the pattern: `clearSave(); set(makeInitialState())`. We need to preserve `runConfig` + `blessings` across the reset, then call `startRun`.
- `makeInitialState` is defined earlier in the file. `clearSave` is imported from `../engine/persistence`.
- `startRun` reads `runConfig` and `blessings` from state, so they must be set BEFORE the call.

- [ ] **Step 1: Add type signature to store interface**

In `src/state/gameStore.ts`, find the store interface (around the existing `startRun: () => void` and `loadRun: () => void` declarations, ~lines 101 / 111) and add:

```ts
restartRun: () => void
```
on a new line in the same block, right after `startRun`.

- [ ] **Step 2: Implement `restartRun`**

Just after the existing `startRun: () => { ... }` implementation closes (find the matching `},`), add:

```ts
restartRun: () => {
  const { runConfig, blessings } = get()
  if (!runConfig) return
  clearSave()
  set(makeInitialState())
  // Restore the same config + blessings the player was running
  set({ runConfig, blessings: { ...blessings } })
  get().startRun()
},
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/state/gameStore.ts
git commit -m "feat(store): add restartRun action that preserves god path + blessings"
```

---

## Task 4: Rename `PassiveSummaryButton` → `InGameMenuButton` and add sections

**Files:**
- Rename: `src/components/game/PassiveSummaryButton.tsx` → `src/components/game/InGameMenuButton.tsx`
- Modify: `src/components/game/ResourceBar.tsx` (import path)
- Modify: `src/components/GameScreen.tsx` (delete floating gear + showSettings state)

**Context for engineer:**
- The component keeps the same `◇` button trigger. The popover gains two new sections: Audio + Run.
- Reuse the `SliderRow` pattern from `SettingsModal.tsx` Task 2 — but the popover is on a black background (`rgba(6,4,2,0.97)`) which the styled track handles fine.
- Inline confirm: tapping Restart or Quit swaps the row from `[icon] [label]` to `Lose this run?  [Confirm]  [Cancel]`. Cancel reverts the row to the action state. The popover staying open is fine.
- Closing the popover (clicking outside) resets any pending confirm.

- [ ] **Step 1: Rename the file**

```bash
git mv src/components/game/PassiveSummaryButton.tsx src/components/game/InGameMenuButton.tsx
```

- [ ] **Step 2: Rename the exported component**

In the new `InGameMenuButton.tsx`, find:

```tsx
export function PassiveSummaryButton() {
```
Replace with:
```tsx
export function InGameMenuButton() {
```

- [ ] **Step 3: Update ResourceBar import**

In `src/components/game/ResourceBar.tsx`, find:

```tsx
import { PassiveSummaryButton } from './PassiveSummaryButton'
```
Replace with:
```tsx
import { InGameMenuButton } from './InGameMenuButton'
```

And the JSX usage at the bottom (around line 232):
```tsx
<PassiveSummaryButton />
```
becomes:
```tsx
<InGameMenuButton />
```

- [ ] **Step 4: Typecheck after rename**

Run: `npm run typecheck`
Expected: clean — confirms no other file references the old name.

- [ ] **Step 5: Add Audio + Run sections inside the popover**

In `InGameMenuButton.tsx`, top of the file alongside existing imports:

```tsx
import {
  getMusicVolume, setMusicVolume,
  getSfxVolume,   setSfxVolume,
} from '../../engine/audioSettings'
import { playSfx, applyMusicVolume } from '../../engine/audio'
```

At the top of the component body (right after `if (phase !== 'playing') return null`):

```tsx
const goToPhase    = useGameStore(s => s.goToPhase)
const restartRun   = useGameStore(s => s.restartRun)
const [music, setMusic]     = useState(getMusicVolume())
const [sfx,   setSfx]       = useState(getSfxVolume())
const [pendingAction, setPendingAction] = useState<null | 'restart' | 'quit'>(null)

function onMusicChange(e: React.ChangeEvent<HTMLInputElement>) {
  const v = Number(e.target.value)
  setMusic(v); setMusicVolume(v); applyMusicVolume()
}
function onSfxChange(e: React.ChangeEvent<HTMLInputElement>) {
  const v = Number(e.target.value)
  setSfx(v); setSfxVolume(v)
}
function confirmAction() {
  playSfx('click')
  if (pendingAction === 'restart') restartRun()
  if (pendingAction === 'quit')    goToPhase('menu')
  setPendingAction(null)
  setOpen(false)
}
function cancelAction() {
  playSfx('click')
  setPendingAction(null)
}
```

Also: when the popover closes (in `handleToggle` when `open` is being toggled to false), clear pending:
```tsx
const handleToggle = (ev: React.MouseEvent) => {
  ev.stopPropagation()
  if (open) setPendingAction(null)
  // ... existing position-measurement code unchanged
  setOpen(v => !v)
}
```

Then inside the popover JSX, AFTER the existing on-draw row block but BEFORE the closing `</div>` of the popover container, append:

```tsx
{/* ── Audio section ── */}
<div style={{ borderTop: '1px solid var(--border)', marginTop: '0.6rem', paddingTop: '0.5rem' }}>
  <div style={{ fontSize: '0.7rem', color: 'rgba(200,144,32,0.75)', fontVariant: 'small-caps', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
    Audio
  </div>
  <PopoverSlider label="Music"          value={music} onChange={onMusicChange} />
  <PopoverSlider label="Sound Effects"  value={sfx}   onChange={onSfxChange}   />
</div>

{/* ── Run section ── */}
<div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
  <div style={{ fontSize: '0.7rem', color: 'rgba(200,144,32,0.75)', fontVariant: 'small-caps', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
    Run
  </div>
  {pendingAction ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'rgba(220,110,110,0.9)' }}>
      <span style={{ flex: 1 }}>Lose this run?</span>
      <button onClick={confirmAction} style={confirmBtnStyle}>Confirm</button>
      <button onClick={cancelAction}  style={cancelBtnStyle}>Cancel</button>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <button onClick={() => { playSfx('click'); setPendingAction('restart') }} style={runRowStyle}>
        ↻ Restart
      </button>
      <button onClick={() => { playSfx('click'); setPendingAction('quit') }} style={runRowStyle}>
        ✕ Quit to menu
      </button>
    </div>
  )}
</div>
```

Add these style consts at the top of the component file (above the component, after the existing helpers):

```tsx
const runRowStyle: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--text)', textAlign: 'left',
  padding: '0.35rem 0.55rem', fontSize: '0.72rem',
  fontFamily: 'inherit', cursor: 'pointer',
  letterSpacing: '0.04em',
}
const confirmBtnStyle: React.CSSProperties = {
  background: 'rgba(180,60,60,0.18)', border: '1px solid rgba(220,110,110,0.6)',
  color: 'rgba(225,130,130,0.95)', fontSize: '0.68rem',
  padding: '0.25rem 0.55rem', cursor: 'pointer', fontFamily: 'inherit',
  fontVariant: 'small-caps', letterSpacing: '0.06em',
}
const cancelBtnStyle: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--text-dim)', fontSize: '0.68rem',
  padding: '0.25rem 0.55rem', cursor: 'pointer', fontFamily: 'inherit',
  fontVariant: 'small-caps', letterSpacing: '0.06em',
}
```

And the small `PopoverSlider` helper at the bottom of the file:

```tsx
function PopoverSlider({ label, value, onChange }: {
  label: string
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div style={{ marginBottom: '0.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(200,185,155,0.7)', marginBottom: '0.15rem' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text-dim)' }}>{value}%</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={onChange}
        onClick={e => e.stopPropagation()}
        className="settings-slider"
        style={{ width: '100%' }}
      />
    </div>
  )
}
```

Also: the popover's outer wrapper has `whiteSpace: 'nowrap'`. Remove that line — it would clip our new vertical sections. And the popover needs a `minWidth` so the sliders aren't crushed:

In the popover `<div style={{ position: 'fixed', ... }}>`, change:
```tsx
padding: '0.5rem 0.7rem', borderRadius: '2px', whiteSpace: 'nowrap',
```
to:
```tsx
padding: '0.5rem 0.7rem', borderRadius: '2px', minWidth: '220px',
```

- [ ] **Step 6: Delete floating gear from GameScreen**

In `src/components/GameScreen.tsx`:

1. Delete the `const [showSettings, setShowSettings] = useState(false)` line (~line 36).
2. Delete the entire floating gear button JSX block (currently ~lines 431–451, the `{/* ── Floating settings gear ── */}` button).
3. Delete the `{showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}` block (~lines 453–455).
4. Remove the now-unused `SettingsModal` import (top of file) IF nothing else uses it — typecheck will catch it.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: clean. If `SettingsModal` import is unused, remove it.

- [ ] **Step 8: Manual smoke**

Run `npm run dev`. Start a run.
- Top-right of the screen: no floating gear visible.
- Tap the `◇` button at the right end of the resource bar.
- Popover opens. Confirm sections visible in order: Passives (existing two rows) → Audio (Music + SFX sliders) → Run (Restart + Quit buttons).
- Drag the Music slider → music volume changes live (no audible test without assets — confirm no console errors and the value % updates).
- Tap Restart → row swaps to "Lose this run? [Confirm] [Cancel]".
- Tap Cancel → row reverts to Restart/Quit buttons.
- Tap Restart → Confirm → run restarts to turn 1 with same god path + blessings. No god-path-select screen seen.
- Reopen popover, tap Quit → Confirm → returns to main menu.

- [ ] **Step 9: Commit**

```bash
git add src/components/game/InGameMenuButton.tsx src/components/game/ResourceBar.tsx src/components/GameScreen.tsx
git commit -m "feat(P14-7/8): consolidate in-game gear into InGameMenuButton with audio + run sections"
```

---

## Task 5: P14-8 — Main menu reduces to 3 tiles + expanded SettingsModal

**Files:**
- Modify: `src/components/MainMenu.tsx`
- Modify: `src/components/SettingsModal.tsx`

**Context for engineer:**
- Tutorial / Intro / Codex tiles get removed from the main menu and re-surface inside the Settings modal as action rows.
- The "Replay Intro" action needs to trigger the same `crossFade → splash` logic that the current Intro tile uses. Easiest path: lift a callback into a `onReplayIntro` prop on `SettingsModal`, since the splash state lives in `MainMenu`.
- `startTutorial()` is on the store — Settings can call it directly via `useGameStore`.

- [ ] **Step 1: Trim main menu to 3 tiles**

In `src/components/MainMenu.tsx`, locate the grid block (~line 172–209) and replace ALL six `<button className="menu-card">` entries with exactly these three, preserving their existing visual style:

```tsx
<button className="menu-card" disabled={!saveInfo}
  onClick={() => { if (saveInfo) { playSfx('click'); loadRun() } }}
  style={{ background: 'rgba(8,6,3,0.91)' }}>
  <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: saveInfo ? 'var(--gold)' : 'rgba(160,140,110,0.4)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Continue</div>
  <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>
    {saveInfo
      ? `Turn ${saveInfo.turnCount} · ${GOD_LABEL[saveInfo.runConfig.godPath] ?? saveInfo.runConfig.godPath}`
      : 'No save found'}
  </div>
</button>
<button className="menu-card"
  onClick={() => { playSfx('click'); goToPhase('godPathSelect') }}
  style={{ background: 'rgba(8,6,3,0.91)' }}>
  <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>New</div>
  <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>Begin a new ritual</div>
</button>
<button className="menu-card"
  onClick={() => { playSfx('click'); setShowSettings(true) }}
  style={{ background: 'rgba(8,6,3,0.91)' }}>
  <div style={{ fontSize: '0.88rem', fontVariant: 'small-caps', color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: '0.18rem' }}>Settings</div>
  <div style={{ fontSize: '0.6rem', color: 'var(--text)', letterSpacing: '0.06em', opacity: 0.72 }}>Audio, card back, & more</div>
</button>
```

Change the grid wrapper from `gridTemplateColumns: '1fr 1fr'` to a vertical stack:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
```

- [ ] **Step 2: Wire `onReplayIntro` into the SettingsModal usage**

Still in `MainMenu.tsx`, find the existing `<SettingsModal onClose={...} />` (~line 255) and replace with:

```tsx
{showSettings && (
  <SettingsModal
    onClose={() => setShowSettings(false)}
    onReplayIntro={() => {
      setShowSettings(false)
      crossFade(() => { sessionStorage.removeItem('seenIntro'); setPhase('splash') })
    }}
  />
)}
```

- [ ] **Step 3: Extend `SettingsModal` with the three new rows**

In `src/components/SettingsModal.tsx`:

Update the `Props` interface:
```tsx
interface Props {
  onClose: () => void
  onReplayIntro?: () => void
}
```
Update the function signature:
```tsx
export function SettingsModal({ onClose, onReplayIntro }: Props) {
```

Import the store hook at the top:
```tsx
import { useGameStore } from '../state'
```

Inside the component body (after the existing `useState` lines):
```tsx
const startTutorial = useGameStore(s => s.startTutorial)
```

Then, right before the existing `<button className="btn-secondary" onClick={onCloseClick}>Close</button>` block, insert:

```tsx
{/* ── Replay actions ── */}
<div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  <button
    onClick={() => { playSfx('click'); onClose(); startTutorial() }}
    style={menuActionRowStyle}>
    Replay Tutorial
  </button>
  <button
    onClick={() => { playSfx('click'); onReplayIntro?.() }}
    disabled={!onReplayIntro}
    style={{ ...menuActionRowStyle, opacity: onReplayIntro ? 1 : 0.4 }}>
    Replay Intro
  </button>
  <button disabled style={{ ...menuActionRowStyle, opacity: 0.4, cursor: 'default' }}>
    Codex — soon
  </button>
</div>
```

And add the style const just above the component (after the `interface Props`):

```tsx
const menuActionRowStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  textAlign: 'left',
  padding: '0.55rem 0.7rem',
  fontSize: '0.78rem',
  fontFamily: 'var(--ui-font)',
  letterSpacing: '0.06em',
  cursor: 'pointer',
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Manual smoke**

Run `npm run dev`. From the main menu:
- Exactly 3 tiles visible: Continue · New · Settings. No Tutorial, Intro, or Codex tiles.
- Continue is disabled when no save exists.
- Tap Settings → modal opens.
- Modal contains: Audio sliders (now stacked from Task 2) → Card Back picker → divider → Replay Tutorial / Replay Intro / Codex (disabled) → Close.
- Tap Replay Tutorial → modal closes, tutorial begins.
- Re-open Settings, tap Replay Intro → modal closes, intro splash video plays.
- First-launch flow: clear localStorage, reload → first-launch tutorial prompt still appears.

- [ ] **Step 6: Commit**

```bash
git add src/components/MainMenu.tsx src/components/SettingsModal.tsx
git commit -m "feat(P14-8): collapse main menu to 3 tiles, move replay actions into Settings"
```

---

## Task 6: Post-ship knowledge updates

**Files:**
- Modify: `knowledge/decisions.md`
- Modify: `knowledge/backlog.md`
- Create: `knowledge/sessions/session-71.md`

- [ ] **Step 1: Reverse the S70 parchment decision**

Open `knowledge/decisions.md`. Find the entry under "Card Back Frame (s70)" or similar (the parchment flip-back decision). Append a new dated entry:

```markdown
### Flip-back face (reversed 2026-06-13, P14-1)
Earlier S70 decision to keep parchment + ✦ on InsertPreviewOverlay flip-back is reversed.
Flip-back now renders the player's selected card back (consistent with deck visual).
Rationale: Playtest 14 expected visual consistency between deck and flip animation.
```

- [ ] **Step 2: Mark P14-1, P14-6, P14-7, P14-8 done in backlog**

In `knowledge/backlog.md`, under "Open — Playtest 14":
- Flip `- [ ] **P14-1.**` to `- [x] **P14-1.**`
- Flip `- [ ] **P14-6.**` to `- [x] **P14-6.**`
- Flip `- [ ] **P14-7.**` to `- [x] **P14-7.**`
- Flip `- [ ] **P14-8.**` to `- [x] **P14-8.**`

Also flip P14-2, P14-17, P14-23, P14-24, P14-25 to `[x]` — they were already shipped pre-session-71 but never marked done in the backlog.

- [ ] **Step 3: Write session 71 log**

Create `knowledge/sessions/session-71.md` with the standard format: topic, what shipped, commits, decisions, manual playtest checklist.

- [ ] **Step 4: Commit knowledge updates**

```bash
git add knowledge/
git commit -m "docs(knowledge): S70 regression batch shipped — session 71"
```

---

## Self-review checklist (engineer to run before declaring done)

- [ ] All five tasks committed individually.
- [ ] `npm run typecheck` passes cleanly.
- [ ] `npm run build` succeeds.
- [ ] Manual smokes for each task completed (insert flip, slider layout, ◇ popover, 3-tile menu, replay actions).
- [ ] `knowledge/decisions.md` reversal entry appended.
- [ ] `knowledge/backlog.md` items marked done.
- [ ] Session 71 log written.
- [ ] No floating gear visible anywhere in-game.
- [ ] First-launch tutorial prompt still appears on fresh localStorage.

---

## Acceptance map (spec → tasks)

| Spec section | Implementing task |
|---|---|
| P14-1 flip-back card back | Task 1 |
| P14-6 slider stack + thumb styling | Task 2 |
| P14-7 delete floating gear | Task 4 (Step 6) |
| P14-8 in-game popover (audio + run) | Task 4 (Step 5) |
| P14-8 main menu 3 tiles | Task 5 (Step 1) |
| P14-8 SettingsModal replay actions | Task 5 (Step 3) |
| `restartRun()` store action | Task 3 |
| Reverse S70 parchment decision | Task 6 (Step 1) |
