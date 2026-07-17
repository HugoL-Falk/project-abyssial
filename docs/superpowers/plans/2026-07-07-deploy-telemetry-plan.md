# Deploy + Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship PostHog telemetry, a free-text feedback form, a password gate, and god-unlock to the July playtest on Railway.

**Architecture:** A thin `src/lib/telemetry.ts` module owns all PostHog calls; game store and components call typed functions from it. `PasswordGate.tsx` wraps `App.tsx`. God unlock state lives in `localStorage` accessed via `src/lib/unlock.ts`. Feedback form is a shared component embedded in end screens and the in-game menu.

**Tech Stack:** React + TypeScript + Zustand (`gameStore.ts`), `posthog-js`, Vite env vars (`import.meta.env.VITE_*`), Railway.

## Global Constraints

- All `VITE_*` env vars are optional: absent = feature disabled, no errors thrown.
- No PII collected. PostHog `distinct_id` is auto-generated per device; never attach emails or names.
- `posthog.capture()` must never throw — always guard with `isPosthogEnabled()`.
- TypeScript strict mode — no `any`.
- Follow existing code style: inline styles, `var(--*)` CSS vars, `var(--ui-font)` for text.
- Run `npx vitest run` after every task — 242 tests must stay green (telemetry functions are no-ops in test env since `VITE_POSTHOG_KEY` is unset).

---

### Task 1: Install posthog-js + telemetry module

**Files:**
- Modify: `package.json`
- Create: `src/lib/telemetry.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces:
  - `isPosthogEnabled(): boolean`
  - `captureRunStarted(godPath: string, isTutorial: boolean): void`
  - `captureCardDrawn(p: CardDrawnProps): void`
  - `captureOptionPicked(p: OptionPickedProps): void`
  - `captureOptionSkipped(p: OptionSkippedProps): void`
  - `captureRunEnded(p: RunEndedProps): void`
  - `captureFeedback(text: string, triggeredBy: 'end_screen' | 'menu_button'): void`

- [ ] **Step 1: Install posthog-js**

```bash
cd C:/Project Abyssial/Code/project-abyssial
npm install posthog-js
```

Expected: `posthog-js` appears in `package.json` dependencies.

- [ ] **Step 2: Create `src/lib/telemetry.ts`**

```typescript
import posthog from 'posthog-js'

export function initTelemetry(): void {
  const key  = import.meta.env.VITE_POSTHOG_KEY  as string | undefined
  const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined)
    ?? 'https://app.posthog.com'
  if (!key) return
  posthog.init(key, { api_host: host, capture_pageview: false, persistence: 'localStorage' })
}

export function isPosthogEnabled(): boolean {
  return typeof import.meta.env.VITE_POSTHOG_KEY === 'string'
    && import.meta.env.VITE_POSTHOG_KEY.length > 0
}

// ── Prop types ────────────────────────────────────────────────────────────────

interface ResourceSnapshot {
  res_gold: number
  res_followers: number
  res_influence: number
  res_dread: number
  res_relics: number
}

export interface CardDrawnProps extends ResourceSnapshot {
  card_id: string
  card_title: string
  week: number
  draw_pile_count: number
}

export interface OptionPickedProps extends ResourceSnapshot {
  card_id: string
  option_idx: number
  option_label: string
  week: number
}

export interface OptionSkippedProps {
  card_id: string
  option_idx: number
  option_label: string
  week: number
  reason: 'locked' | 'available'
}

export interface RunEndedProps extends ResourceSnapshot {
  outcome: 'victory' | 'succumb' | 'accept_defeat'
  god_path: string
  week_reached: number
  cards_drawn: number
  god_path_progress: number
}

// ── Capture helpers ───────────────────────────────────────────────────────────

export function captureRunStarted(godPath: string, isTutorial: boolean): void {
  if (!isPosthogEnabled()) return
  posthog.capture('run_started', { god_path: godPath, is_tutorial: isTutorial })
}

export function captureCardDrawn(p: CardDrawnProps): void {
  if (!isPosthogEnabled()) return
  posthog.capture('card_drawn', p)
}

export function captureOptionPicked(p: OptionPickedProps): void {
  if (!isPosthogEnabled()) return
  posthog.capture('option_picked', p)
}

export function captureOptionSkipped(p: OptionSkippedProps): void {
  if (!isPosthogEnabled()) return
  posthog.capture('option_skipped', p)
}

export function captureRunEnded(p: RunEndedProps): void {
  if (!isPosthogEnabled()) return
  posthog.capture('run_ended', p)
}

export function captureFeedback(text: string, triggeredBy: 'end_screen' | 'menu_button'): void {
  if (!isPosthogEnabled()) return
  posthog.capture('feedback_submitted', {
    text: text.slice(0, 2000),
    triggered_by: triggeredBy,
  })
}
```

- [ ] **Step 3: Call `initTelemetry()` in `src/main.tsx`**

Add import and call before `createRoot`:

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initTelemetry } from './lib/telemetry'

initTelemetry()

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: 242 pass. Telemetry is a no-op (no `VITE_POSTHOG_KEY` in test env).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/telemetry.ts src/main.tsx
git commit -m "feat(telemetry): install posthog-js + typed telemetry module"
```

---

### Task 2: Wire telemetry into game store

**Files:**
- Modify: `src/state/gameStore.ts`

**Interfaces:**
- Consumes: all six capture functions from `src/lib/telemetry.ts`
- Produces: no new exports — side-effects only

**Context:**
- `drawNextCard` starts at line 579. The card being drawn is the first item of `state.deck.drawPile`.
- `resolveOption(optionIndex)` starts at line 746. `optionIndex` is the card-level option index. All visible options can be retrieved via `state.getVisibleOptions(state.currentCard!)`.
- `succumb()` starts at line 1349 — sets `phase: 'gameOver'`.
- `acceptDefeat()` starts at line 1415 — sets `phase: 'gameOver'`.
- Victory is set inside `resolveOption` when `phase = 'victory'` (lines 969–975).
- `cardRunState` tracks per-card draw counts — use `Object.values(state.cardRunState).reduce((sum, v) => sum + v.drawCount, 0)` to compute total cards drawn.
- Resources are at `state.resources`: `{ gold, followers, influence, dread, relics }`.
- Week is `state.reshuffleCount + 1` (1-indexed).

- [ ] **Step 1: Add telemetry imports to gameStore.ts**

At the top of `src/state/gameStore.ts`, after existing imports add:

```typescript
import {
  captureCardDrawn,
  captureOptionPicked,
  captureOptionSkipped,
  captureRunEnded,
  type RunEndedProps,
} from '../lib/telemetry'
```

- [ ] **Step 2: Add resource snapshot helper inside gameStore.ts**

Add this small helper just above the `createGameStore` / `create(` call (not exported — internal only):

```typescript
function resSnapshot(r: { gold: number; followers: number; influence: number; dread: number; relics: number }) {
  return {
    res_gold:       r.gold,
    res_followers:  r.followers,
    res_influence:  r.influence,
    res_dread:      r.dread,
    res_relics:     r.relics,
  }
}
```

- [ ] **Step 3: Fire `card_drawn` in `drawNextCard`**

Locate `drawNextCard: () => {` (line 579). Find the point where the drawn card is confirmed and `set(...)` is about to be called with `currentCard: card`. Add the capture call immediately before the `set(...)`:

```typescript
// Fire telemetry — card now known, resources still pre-draw
captureCardDrawn({
  card_id:         card.id,
  card_title:      card.title,
  week:            reshuffleCount + 1,
  draw_pile_count: state.deck.drawPile.length,
  ...resSnapshot(state.resources),
})
```

- [ ] **Step 4: Fire `option_picked` and `option_skipped` in `resolveOption`**

Locate `resolveOption: (optionIndex) => {` (line 746). Add the following block at the very start of the function body, before any existing logic. `state` is the Zustand `get()` snapshot:

```typescript
// Telemetry: fire option pick + all skipped sibling options
if (state.currentCard) {
  const visOpts = state.getVisibleOptions(state.currentCard)
  const week    = state.reshuffleCount + 1
  const snap    = resSnapshot(state.resources)
  visOpts
    .filter(o => !o.hidden)
    .forEach(o => {
      if (o.idx === optionIndex) {
        captureOptionPicked({
          card_id:      state.currentCard!.id,
          option_idx:   o.idx,
          option_label: (o.option.title ?? '').slice(0, 60),
          week,
          ...snap,
        })
      } else {
        captureOptionSkipped({
          card_id:      state.currentCard!.id,
          option_idx:   o.idx,
          option_label: (o.option.title ?? '').slice(0, 60),
          week,
          reason:       o.available ? 'available' : 'locked',
        })
      }
    })
}
```

- [ ] **Step 5: Add shared `fireRunEnded` helper inside resolveOption / succumb / acceptDefeat**

Add this helper inside the gameStore `create(...)` block (not exported), just before `succumb`:

```typescript
function buildRunEndedProps(
  state: GameState,
  outcome: RunEndedProps['outcome']
): RunEndedProps {
  const cardsDrawn = Object.values(state.cardRunState)
    .reduce((sum, v) => sum + v.drawCount, 0)
  return {
    outcome,
    god_path:           state.runConfig?.godPath ?? 'unknown',
    week_reached:       state.reshuffleCount + 1,
    cards_drawn:        cardsDrawn,
    god_path_progress:  state.godPathProgress,
    ...resSnapshot(state.resources),
  }
}
```

Note: `buildRunEndedProps` must be defined inside the `create(...)` callback so it closes over `resSnapshot`. Place it just before the `succumb` method definition.

- [ ] **Step 6: Fire `run_ended` in `succumb`, `acceptDefeat`, and victory path**

In `succumb()` (line 1349), add before `set(...)`:
```typescript
captureRunEnded(buildRunEndedProps(state, 'succumb'))
```

In `acceptDefeat()` (line 1415), add before `set(...)`:
```typescript
captureRunEnded(buildRunEndedProps(state, 'accept_defeat'))
```

For victory, locate the `phase = 'victory'` assignment(s) inside `resolveOption` (lines 969–975). Immediately before each `set(...)` call that includes `phase: 'victory'`, add:
```typescript
captureRunEnded(buildRunEndedProps(state, 'victory'))
```

- [ ] **Step 7: Run tests**

```bash
npx vitest run
```

Expected: 242 pass.

- [ ] **Step 8: Commit**

```bash
git add src/state/gameStore.ts src/lib/telemetry.ts
git commit -m "feat(telemetry): wire card_drawn, option_picked/skipped, run_ended into gameStore"
```

---

### Task 3: Wire `run_started` from App.tsx

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `captureRunStarted` from `src/lib/telemetry.ts`

**Context:** `App.tsx` already watches `phase` and `runConfig` via `useGameStore`. When `phase` transitions to `'playing'`, `runConfig` is set. Fire `run_started` in a `useEffect` on this transition.

- [ ] **Step 1: Add telemetry import to App.tsx**

```typescript
import { captureRunStarted } from './lib/telemetry'
```

- [ ] **Step 2: Add useEffect for run_started**

Inside `App()`, after the existing `useEffect` blocks, add:

```typescript
useEffect(() => {
  if (phase === 'playing' && runConfig) {
    captureRunStarted(runConfig.godPath ?? 'unknown', runConfig.isTutorial ?? false)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [phase]) // fire once per phase transition to 'playing'
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: 242 pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(telemetry): fire run_started on phase transition to playing"
```

---

### Task 4: Feedback form component + wiring

**Files:**
- Create: `src/components/FeedbackForm.tsx`
- Modify: `src/components/FailureScreen.tsx`
- Modify: `src/components/VictoryScreen.tsx`
- Modify: `src/components/game/InGameMenuButton.tsx`

**Interfaces:**
- Consumes: `captureFeedback` from `src/lib/telemetry.ts`
- Produces: `<FeedbackForm triggeredBy="end_screen" | "menu_button" onDone={() => void} />`

- [ ] **Step 1: Create `src/components/FeedbackForm.tsx`**

```typescript
import { useState } from 'react'
import { captureFeedback } from '../lib/telemetry'

interface Props {
  triggeredBy: 'end_screen' | 'menu_button'
  onDone: () => void
}

export function FeedbackForm({ triggeredBy, onDone }: Props) {
  const [text, setText]       = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (text.trim()) captureFeedback(text.trim(), triggeredBy)
    setSubmitted(true)
    setTimeout(onDone, 1200)
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--gold)', fontFamily: 'var(--ui-font)', fontSize: '0.9rem', letterSpacing: '0.08em' }}>
        Thanks for the feedback.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.75rem 0' }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="Anything that felt broken, confusing, or great?"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          fontFamily: 'var(--ui-font)',
          fontSize: '0.85rem',
          padding: '0.6rem 0.75rem',
          resize: 'none',
          borderRadius: '2px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleSubmit}
          className="btn-primary"
          style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem' }}
        >
          Submit
        </button>
        <button
          onClick={onDone}
          className="btn-secondary"
          style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem' }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Embed FeedbackForm in FailureScreen**

In `src/components/FailureScreen.tsx`, add import:
```typescript
import { FeedbackForm } from './FeedbackForm'
```

Add state and embed form above the existing "Return to menu" button area. The form calls `onDone` which is a no-op (the button is still available; the form just closes itself):

```typescript
const [feedbackDone, setFeedbackDone] = useState(false)
```

Then in the JSX, just above the return-to-menu button, add:
```tsx
{!feedbackDone && (
  <div style={{ marginBottom: '1rem' }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
      Leave feedback
    </div>
    <FeedbackForm triggeredBy="end_screen" onDone={() => setFeedbackDone(true)} />
  </div>
)}
```

- [ ] **Step 3: Embed FeedbackForm in VictoryScreen**

In `src/components/VictoryScreen.tsx`, same pattern as Step 2 — add import, `feedbackDone` state, and embed form above "Return to menu":

```typescript
import { FeedbackForm } from './FeedbackForm'
```

```typescript
const [feedbackDone, setFeedbackDone] = useState(false)
```

```tsx
{!feedbackDone && (
  <div style={{ marginBottom: '1rem' }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
      Leave feedback
    </div>
    <FeedbackForm triggeredBy="end_screen" onDone={() => setFeedbackDone(true)} />
  </div>
)}
```

- [ ] **Step 4: Add "Send feedback" button + modal to InGameMenuButton**

In `src/components/game/InGameMenuButton.tsx`:

Add import:
```typescript
import { FeedbackForm } from '../FeedbackForm'
```

Add state:
```typescript
const [feedbackOpen, setFeedbackOpen] = useState(false)
```

In the menu panel JSX, add a button below the existing menu items:
```tsx
<button style={runRowStyle} onClick={() => setFeedbackOpen(true)}>
  Send feedback
</button>
```

Then add the modal (outside the popover, inside the component root — append before the final closing tag of the component):
```tsx
{feedbackOpen && (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}
    onClick={e => { if (e.target === e.currentTarget) setFeedbackOpen(false) }}
  >
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      padding: '1.2rem',
      width: 'min(92vw, 360px)',
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Leave feedback
      </div>
      <FeedbackForm triggeredBy="menu_button" onDone={() => setFeedbackOpen(false)} />
    </div>
  </div>
)}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: 242 pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/FeedbackForm.tsx src/components/FailureScreen.tsx src/components/VictoryScreen.tsx src/components/game/InGameMenuButton.tsx
git commit -m "feat(feedback): FeedbackForm component wired into end screens and menu"
```

---

### Task 5: Password gate

**Files:**
- Create: `src/components/PasswordGate.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `<PasswordGate children />` — renders children if unlocked, else renders gate screen.

- [ ] **Step 1: Create `src/components/PasswordGate.tsx`**

```typescript
import { useState } from 'react'

const SESSION_KEY = 'playtest_unlocked'

function isUnlocked(): boolean {
  const required = import.meta.env.VITE_PLAYTEST_PASSWORD as string | undefined
  if (!required) return true // no env var = no gate
  return sessionStorage.getItem(SESSION_KEY) === required
}

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [input, setInput]       = useState('')
  const [error, setError]       = useState(false)

  if (unlocked) return <>{children}</>

  function attempt() {
    const required = import.meta.env.VITE_PLAYTEST_PASSWORD as string
    if (input === required) {
      sessionStorage.setItem(SESSION_KEY, required)
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div style={{
      height: '100dvh', maxWidth: '480px', margin: '0 auto',
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1.2rem',
      padding: '2rem',
    }}>
      <div style={{ fontFamily: 'var(--title-font)', fontSize: '1.1rem', color: 'var(--gold)', letterSpacing: '0.1em', textAlign: 'center' }}>
        Project Abyssial
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Playtest Access
      </div>
      <input
        type="password"
        value={input}
        onChange={e => { setInput(e.target.value); setError(false) }}
        onKeyDown={e => e.key === 'Enter' && attempt()}
        placeholder="Password"
        style={{
          background: 'var(--surface)', border: `1px solid ${error ? 'var(--red-bright)' : 'var(--border)'}`,
          color: 'var(--text)', fontFamily: 'var(--ui-font)', fontSize: '1rem',
          padding: '0.7rem 1rem', width: '100%', boxSizing: 'border-box', borderRadius: '2px',
          textAlign: 'center', letterSpacing: '0.2em',
        }}
        autoFocus
      />
      {error && (
        <div style={{ fontSize: '0.78rem', color: 'var(--red-bright)', letterSpacing: '0.08em' }}>
          Incorrect password.
        </div>
      )}
      <button onClick={attempt} className="btn-primary" style={{ width: '100%' }}>
        Enter
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Wrap App root with PasswordGate in `src/App.tsx`**

Add import:
```typescript
import { PasswordGate } from './components/PasswordGate'
```

Wrap the return in `App()`:
```tsx
return (
  <PasswordGate>
    <div onClick={unlockAudio} style={{ ... }}>
      {/* existing content unchanged */}
    </div>
  </PasswordGate>
)
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: 242 pass. Gate is bypassed in tests (no `VITE_PLAYTEST_PASSWORD`).

- [ ] **Step 4: Commit**

```bash
git add src/components/PasswordGate.tsx src/App.tsx
git commit -m "feat(deploy): password gate for playtest access"
```

---

### Task 6: God unlock

**Files:**
- Create: `src/lib/unlock.ts`
- Modify: `src/components/SetupScreens.tsx`
- Modify: `src/components/SettingsModal.tsx`

**Interfaces:**
- Produces:
  - `isGodsUnlocked(): boolean`
  - `attemptGodUnlock(input: string): boolean`

**Context:** `GodPathSelectScreen` in `SetupScreens.tsx` renders all three gods using `GOD_PATH_ORDER` (line 55). Gods 2+3 are `nyarlathotep` and `shub_niggurath` at indices 1 and 2. `SettingsModal.tsx` renders sliders; the unlock field goes at the bottom of the settings panel.

- [ ] **Step 1: Create `src/lib/unlock.ts`**

```typescript
const STORAGE_KEY = 'gods_unlocked'

export function isGodsUnlocked(): boolean {
  const required = import.meta.env.VITE_UNLOCK_PASSWORD as string | undefined
  if (!required) return false // env var absent = field hidden, gods always locked at 1
  return localStorage.getItem(STORAGE_KEY) === required
}

export function attemptGodUnlock(input: string): boolean {
  const required = import.meta.env.VITE_UNLOCK_PASSWORD as string | undefined
  if (!required) return false
  if (input === required) {
    localStorage.setItem(STORAGE_KEY, required)
    return true
  }
  return false
}

export function isUnlockFieldVisible(): boolean {
  const required = import.meta.env.VITE_UNLOCK_PASSWORD as string | undefined
  return typeof required === 'string' && required.length > 0
}
```

- [ ] **Step 2: Filter gods in GodPathSelectScreen**

In `src/components/SetupScreens.tsx`, add import:
```typescript
import { isGodsUnlocked } from '../lib/unlock'
```

Inside `GodPathSelectScreen()`, derive the visible path list from `GOD_PATH_ORDER`:
```typescript
const godsUnlocked = isGodsUnlocked()
const visiblePaths = godsUnlocked
  ? GOD_PATH_ORDER
  : GOD_PATH_ORDER.slice(0, 1)
```

Replace all usages of `GOD_PATH_ORDER` in the render loop (the `.map()` that renders each god card) with `visiblePaths`.

- [ ] **Step 3: Add unlock field to SettingsModal**

In `src/components/SettingsModal.tsx`, add imports:
```typescript
import { isGodsUnlocked, attemptGodUnlock, isUnlockFieldVisible } from '../lib/unlock'
```

Add state at the top of `SettingsModal`:
```typescript
const [unlockInput,   setUnlockInput]   = useState('')
const [unlockResult,  setUnlockResult]  = useState<'idle' | 'ok' | 'fail'>('idle')
const alreadyUnlocked = isGodsUnlocked()
```

At the bottom of the settings panel JSX, before the close button, add:
```tsx
{isUnlockFieldVisible() && (
  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      {alreadyUnlocked ? 'All gods unlocked ✓' : 'Unlock additional content'}
    </div>
    {!alreadyUnlocked && (
      <>
        <input
          type="password"
          value={unlockInput}
          onChange={e => { setUnlockInput(e.target.value); setUnlockResult('idle') }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setUnlockResult(attemptGodUnlock(unlockInput) ? 'ok' : 'fail')
              setUnlockInput('')
            }
          }}
          placeholder="Unlock code"
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text)', fontFamily: 'var(--ui-font)', fontSize: '0.85rem',
            padding: '0.5rem 0.75rem', borderRadius: '2px', width: '100%', boxSizing: 'border-box',
          }}
        />
        {unlockResult === 'ok'   && <div style={{ fontSize: '0.78rem', color: 'var(--gold)' }}>Unlocked. Return to god selection.</div>}
        {unlockResult === 'fail' && <div style={{ fontSize: '0.78rem', color: 'var(--red-bright)' }}>Incorrect code.</div>}
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: 242 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/unlock.ts src/components/SetupScreens.tsx src/components/SettingsModal.tsx
git commit -m "feat(deploy): god unlock via settings code + filter GodPathSelect"
```

---

### Task 7: Railway config + env file

**Files:**
- Create: `railway.json`
- Create: `.env.example`

**Context:** Railway auto-detects Vite projects. A `railway.json` pins the build command and output directory. `.env.example` documents all vars for the deployer.

- [ ] **Step 1: Create `railway.json`**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npx serve dist -s -l 3000",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

- [ ] **Step 2: Add `serve` as a dependency**

```bash
npm install serve
```

- [ ] **Step 3: Create `.env.example`**

```
# Playtest password gate (omit to disable gate in local dev)
VITE_PLAYTEST_PASSWORD=

# God unlock code — entering this in Settings reveals gods 2+3 (omit to hide field)
VITE_UNLOCK_PASSWORD=

# PostHog telemetry (omit to disable all telemetry)
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://app.posthog.com
```

- [ ] **Step 4: Ensure `.env.example` is NOT in `.gitignore`**

```bash
grep "env.example" "C:/Project Abyssial/Code/project-abyssial/.gitignore"
```

Expected: no output (not ignored). If it appears, remove that line.

- [ ] **Step 5: Run full build to verify**

```bash
npm run build
```

Expected: build completes with no errors, `dist/` created.

- [ ] **Step 6: Run tests**

```bash
npx vitest run
```

Expected: 242 pass.

- [ ] **Step 7: Commit**

```bash
git add railway.json .env.example package.json package-lock.json
git commit -m "feat(deploy): Railway config + env.example"
```

---

## Post-implementation: cut playtest/v1 branch

Once all tasks are done and you're ready to freeze:

```bash
git checkout -b playtest/v1
git push origin playtest/v1
```

In Railway dashboard: set the deployment branch to `playtest/v1`. Set all four env vars. Any hotfix: cherry-pick the commit from the dev branch onto `playtest/v1`.
