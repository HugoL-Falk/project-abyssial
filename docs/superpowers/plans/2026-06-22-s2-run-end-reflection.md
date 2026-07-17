# S2 Run-End Reflection Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "What you missed" reflection screen that appears after the defeat tonal beat, showing counts of prep-locked options, affordability-locked options, and closed chain paths.

**Architecture:** Live counters on `gameStore.runStats`, incremented once per card resolved inside `resolveOption`. Closed-path detection is registry-driven via a small `PATH_LOCKOUT_RULES` map checked at the same hook. A new `ReflectionScreen` component renders behind a `Continue` button on the existing `FailureScreen`.

**Tech Stack:** React + Zustand + TypeScript + Vitest. Existing project conventions only — no new deps.

## Global Constraints

- Defeat-only trigger. Victory does not show the reflection screen.
- Counts + vague path-names only. No card names, no option text, no triggers leaked.
- No `gameLoop.ts` changes (dead-code mirror — separate cleanup ticket owns it).
- Tally site is `resolveOption` (single source of truth). No second filter implementation.
- Each named path pushes to `closedPaths` at most once per run (idempotent).
- Prep-lock takes precedence over afford-lock when both apply to the same option.
- Follow existing project file conventions (`src/state/`, `src/components/`, `src/data/`, `src/types/`).
- Spec: `docs/superpowers/specs/2026-06-22-s2-run-end-reflection-design.md`.

---

### Task 1: Add `RunStats` type and store field

**Files:**
- Modify: `src/types/index.ts` (add `RunStats` interface)
- Modify: `src/state/gameStore.ts` (add to `GameState`, init in `makeInitialState`)
- Test: `src/state/gameStore.test.ts` (new `describe('runStats')` block)

**Interfaces:**
- Produces: `RunStats` interface — `{ prepLockedSkipped: number; affordLockedSkipped: number; closedPaths: string[] }`. Stored on `GameState.runStats`. Reset to `{ prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] }` by `resetGame` (which calls `makeInitialState`).

- [ ] **Step 1: Write the failing test**

Add to `src/state/gameStore.test.ts`:

```ts
describe('runStats', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getState(), true)
    useGameStore.getState().resetGame()
  })

  it('initialises runStats to zeros and empty paths on resetGame', () => {
    useGameStore.setState({
      runStats: { prepLockedSkipped: 5, affordLockedSkipped: 3, closedPaths: ['x'] },
    })
    useGameStore.getState().resetGame()
    expect(useGameStore.getState().runStats).toEqual({
      prepLockedSkipped: 0,
      affordLockedSkipped: 0,
      closedPaths: [],
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "runStats"`
Expected: FAIL (`runStats` is `undefined` on state).

- [ ] **Step 3: Add the `RunStats` type**

In `src/types/index.ts`, add (placed near other run-state types):

```ts
export interface RunStats {
  /** Count of options filtered by prep-tag gate across the run. */
  prepLockedSkipped: number
  /** Count of options filtered by affordability gate across the run. */
  affordLockedSkipped: number
  /** Named chain paths the player closed during the run (e.g. "the recited descent"). */
  closedPaths: string[]
}
```

- [ ] **Step 4: Wire `runStats` into the store**

In `src/state/gameStore.ts`:

1. Add `RunStats` to the existing type import from `'../types'` (or `'../types/index'` if that's the form already used in the file).
2. In the `GameState` interface (search for existing fields like `prepTags: string[]`), add:

```ts
  runStats: RunStats
```

3. In `makeInitialState()` (around line 68), add to the returned object (alongside `prepTags: []`):

```ts
    runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "runStats"`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `cd Code/project-abyssial && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/state/gameStore.ts src/state/gameStore.test.ts
git commit -m "feat(s2): add RunStats type and runStats field on gameStore"
```

---

### Task 2: Tally prep-lock + afford-lock counters in `resolveOption`

**Files:**
- Modify: `src/state/gameStore.ts` (top of `resolveOption`, around line 663)
- Test: `src/state/gameStore.test.ts`

**Interfaces:**
- Consumes: `RunStats` from Task 1; existing `getVisibleOptions(card, state)` selector (line 143).
- Produces: side effect — after every `resolveOption` call, `runStats.prepLockedSkipped` and `runStats.affordLockedSkipped` reflect the cumulative count of locked options seen across all resolved cards (excluding the chosen option itself).

**Tally rule (verbatim from spec):**
- Tally on **`resolveOption`** entry, after the guard but before effects compute.
- For each option on `state.currentCard` *other than* the chosen `optionIndex`:
  - If `prepRequirement !== undefined` → increment `prepLockedSkipped` by 1.
  - Else if `affordabilityShortfall !== undefined` → increment `affordLockedSkipped` by 1.
  - Prep-lock takes precedence; an option is never double-counted.
- Hidden options (`hidden === true`) still count — they were unavailable to the player.

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('runStats', …)` block in `src/state/gameStore.test.ts`:

```ts
  it('increments prepLockedSkipped by the count of prep-locked sibling options on resolveOption', () => {
    // Build a card with 3 options: one chosen, one prep-locked, one open.
    const card: Card = {
      id: 'test_prep_card' as CardId,
      title: 'Test Prep Card',
      tier: 'common',
      copies: 1,
      prompt: '',
      options: [
        { id: 'a', label: 'Chosen',     effects: [] },
        { id: 'b', label: 'Prep locked', effects: [], condition: { type: 'hasPrepTag', tag: 'studied' as PrepTag } },
        { id: 'c', label: 'Also open',   effects: [] },
      ],
    } as unknown as Card

    useGameStore.setState({
      phase: 'playing',
      currentCard: card,
      prepTags: [],
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
    })

    useGameStore.getState().resolveOption(0)

    expect(useGameStore.getState().runStats.prepLockedSkipped).toBe(1)
    expect(useGameStore.getState().runStats.affordLockedSkipped).toBe(0)
  })

  it('increments affordLockedSkipped when a sibling option is unaffordable', () => {
    const card: Card = {
      id: 'test_afford_card' as CardId,
      title: 'Test Afford',
      tier: 'common',
      copies: 1,
      prompt: '',
      options: [
        { id: 'a', label: 'Cheap',     effects: [] },
        { id: 'b', label: 'Expensive', effects: [{ type: 'resource', resource: 'gold', delta: -99 }] },
      ],
    } as unknown as Card

    useGameStore.setState({
      phase: 'playing',
      currentCard: card,
      resources: { ...STARTING_RESOURCES, gold: 0 },
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
    })

    useGameStore.getState().resolveOption(0)

    expect(useGameStore.getState().runStats.affordLockedSkipped).toBe(1)
    expect(useGameStore.getState().runStats.prepLockedSkipped).toBe(0)
  })

  it('prep-lock takes precedence over afford-lock when both apply', () => {
    const card: Card = {
      id: 'test_double_card' as CardId,
      title: 'Test Double',
      tier: 'common',
      copies: 1,
      prompt: '',
      options: [
        { id: 'a', label: 'Chosen', effects: [] },
        { id: 'b', label: 'Both locks',
          effects: [{ type: 'resource', resource: 'gold', delta: -99 }],
          condition: { type: 'hasPrepTag', tag: 'studied' as PrepTag } },
      ],
    } as unknown as Card

    useGameStore.setState({
      phase: 'playing',
      currentCard: card,
      prepTags: [],
      resources: { ...STARTING_RESOURCES, gold: 0 },
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
    })

    useGameStore.getState().resolveOption(0)

    expect(useGameStore.getState().runStats.prepLockedSkipped).toBe(1)
    expect(useGameStore.getState().runStats.affordLockedSkipped).toBe(0)
  })
```

Import `PrepTag` and `STARTING_RESOURCES` at the top of the test file if not already imported.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "runStats"`
Expected: 3 new tests FAIL (`prepLockedSkipped` stays at 0).

- [ ] **Step 3: Implement the tally**

In `src/state/gameStore.ts` `resolveOption` (line 663), insert after the option-existence guard (after `if (!option) return`) and before resources/deck shallow copies:

```ts
    // S2: tally locked sibling options on this card into runStats.
    {
      const visible = getVisibleOptions(state.currentCard, state)
      let prepDelta = 0
      let affordDelta = 0
      for (const v of visible) {
        if (v.idx === optionIndex) continue
        if (v.prepRequirement !== undefined) {
          prepDelta++
        } else if (v.affordabilityShortfall !== undefined) {
          affordDelta++
        }
      }
      if (prepDelta > 0 || affordDelta > 0) {
        set(s => ({
          runStats: {
            ...s.runStats,
            prepLockedSkipped:   s.runStats.prepLockedSkipped   + prepDelta,
            affordLockedSkipped: s.runStats.affordLockedSkipped + affordDelta,
          },
        }))
      }
    }
```

Note: `getVisibleOptions` is the module-private helper (line 143), already in scope inside this file.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "runStats"`
Expected: PASS (all 4 in the block).

- [ ] **Step 5: Run the full test suite**

Run: `cd Code/project-abyssial && npx vitest run`
Expected: 83 (or 86 with the new tests) PASS, no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/state/gameStore.ts src/state/gameStore.test.ts
git commit -m "feat(s2): tally prep/afford locked siblings on resolveOption"
```

---

### Task 3: Closed-path registry + Y'ha "recited descent" lockout detection

**Files:**
- Create: `src/data/closedPaths.ts`
- Modify: `src/state/gameStore.ts` (call the check inside `resolveOption` after effects are applied)
- Test: `src/state/gameStore.test.ts`

**Interfaces:**
- Consumes: `RunStats.closedPaths` from Task 1; `GameState` shape.
- Produces:
  - `interface PathLockoutRule { pathName: string; isClosed: (state: GameState) => boolean }`
  - `const PATH_LOCKOUT_RULES: Partial<Record<GodPath, PathLockoutRule[]>>`
  - Y'ha entry: `{ pathName: 'the recited descent', isClosed: (s) => s.runConfig?.godPath === 'yha_nthlei' && s.unravellingTier >= /* recited-band cutoff */ && s.godPathProgress < 5 }`

**Predicate definition (Y'ha):** The recited descent is the path that requires Dread ≥ 6 on the stage-5 carrier (`what_was_already_read`). Per the spec, the path is "closed" when the player can no longer reach a stage-5 carrier resolution with Dread ≥ 6. The implementation uses a conservative proxy:

> `isClosed` returns `true` iff `godPath === 'yha_nthlei'` AND `godPathProgress >= 5` (the stage-5 card has been resolved or passed) AND the player did **not** acquire the `recited` prep-tag during the run.

Rationale: once stage 5 is past with no `recited` tag, the recited path is unreachable for the remainder of the run. This avoids encoding dread-band math twice and is testable from state alone.

- [ ] **Step 1: Write the failing test**

Append inside `describe('runStats', …)`:

```ts
  it('pushes "the recited descent" to closedPaths exactly once when Y\'ha stage-5 passes without recited tag', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { ...({} as RunConfig), godPath: 'yha_nthlei', isTutorial: false } as RunConfig,
      godPathProgress: 4,
      prepTags: [],
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
      currentCard: {
        id: 'noop' as CardId, title: '', tier: 'common', copies: 1, prompt: '',
        options: [{ id: 'a', label: '', effects: [{ type: 'godPathProgress', delta: 1 }] }],
      } as unknown as Card,
    })

    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().runStats.closedPaths).toEqual(['the recited descent'])

    // Resolving again must not duplicate.
    useGameStore.setState({
      phase: 'playing',
      currentCard: {
        id: 'noop2' as CardId, title: '', tier: 'common', copies: 1, prompt: '',
        options: [{ id: 'a', label: '', effects: [] }],
      } as unknown as Card,
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().runStats.closedPaths).toEqual(['the recited descent'])
  })

  it('does not close the recited descent when the player holds the recited prep tag', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { ...({} as RunConfig), godPath: 'yha_nthlei', isTutorial: false } as RunConfig,
      godPathProgress: 4,
      prepTags: ['recited'],
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
      currentCard: {
        id: 'noop' as CardId, title: '', tier: 'common', copies: 1, prompt: '',
        options: [{ id: 'a', label: '', effects: [{ type: 'godPathProgress', delta: 1 }] }],
      } as unknown as Card,
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().runStats.closedPaths).toEqual([])
  })

  it('does not populate closedPaths on non-Y\'ha runs', () => {
    useGameStore.setState({
      phase: 'playing',
      runConfig: { ...({} as RunConfig), godPath: 'nyarlathotep', isTutorial: false } as RunConfig,
      godPathProgress: 5,
      prepTags: [],
      runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
      currentCard: {
        id: 'noop' as CardId, title: '', tier: 'common', copies: 1, prompt: '',
        options: [{ id: 'a', label: '', effects: [] }],
      } as unknown as Card,
    })
    useGameStore.getState().resolveOption(0)
    expect(useGameStore.getState().runStats.closedPaths).toEqual([])
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "runStats"`
Expected: 3 new tests FAIL.

- [ ] **Step 3: Create the registry**

Create `src/data/closedPaths.ts`:

```ts
import type { GameState, GodPath } from '../types'

export interface PathLockoutRule {
  pathName: string
  isClosed: (state: GameState) => boolean
}

export const PATH_LOCKOUT_RULES: Partial<Record<GodPath, PathLockoutRule[]>> = {
  yha_nthlei: [
    {
      pathName: 'the recited descent',
      isClosed: (s) =>
        s.godPathProgress >= 5 &&
        !(s.prepTags ?? []).includes('recited'),
    },
  ],
  // nyarlathotep + shub_niggurath: deferred to per-god follow-up tickets
}

/**
 * Returns the set of path-names newly closed by `state` that are not already in `alreadyClosed`.
 * Pure — caller is responsible for applying the result to RunStats.
 */
export function newlyClosedPaths(state: GameState, alreadyClosed: string[]): string[] {
  const godPath = state.runConfig?.godPath
  if (!godPath) return []
  const rules = PATH_LOCKOUT_RULES[godPath] ?? []
  const out: string[] = []
  for (const rule of rules) {
    if (alreadyClosed.includes(rule.pathName)) continue
    if (rule.isClosed(state)) out.push(rule.pathName)
  }
  return out
}
```

- [ ] **Step 4: Wire the check into `resolveOption`**

In `src/state/gameStore.ts`:

1. Add import at the top of the file (alongside other `src/data/...` imports):

```ts
import { newlyClosedPaths } from '../data/closedPaths'
```

2. Find the final `set({ ... })` call inside `resolveOption` (the one that commits the post-effect state). Immediately after that `set`, append a second call that evaluates the path-check against the now-current state:

```ts
    // S2: detect newly-closed named paths against the just-committed state.
    {
      const next = get()
      const newPaths = newlyClosedPaths(next, next.runStats.closedPaths)
      if (newPaths.length > 0) {
        set({
          runStats: {
            ...next.runStats,
            closedPaths: [...next.runStats.closedPaths, ...newPaths],
          },
        })
      }
    }
```

If `resolveOption` has multiple `set` exit points (succumb, gameOver, etc.), call the same check after each.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "runStats"`
Expected: PASS (7 tests now in the block).

- [ ] **Step 6: Run full test suite + typecheck**

Run: `cd Code/project-abyssial && npx vitest run && npx tsc --noEmit`
Expected: all pass, zero TS errors.

- [ ] **Step 7: Commit**

```bash
git add src/data/closedPaths.ts src/state/gameStore.ts src/state/gameStore.test.ts
git commit -m "feat(s2): closed-path registry + Y'ha 'recited descent' detection"
```

---

### Task 4: `ReflectionScreen` component

**Files:**
- Create: `src/components/ReflectionScreen.tsx`

**Interfaces:**
- Consumes: `useGameStore` (reads `runStats`, `runConfig`, `failureReason`, `resetGame`, `goToPhase`).
- Produces: default export `ReflectionScreen` — a presentational React component, no props. Renders header + conditional rows + footer buttons.

- [ ] **Step 1: Create the component**

Create `src/components/ReflectionScreen.tsx`:

```tsx
import { useGameStore } from '../state'
import { playSfx } from '../engine/audio'

const GOD_TINT_REFLECT: Partial<Record<string, string>> = {
  yha_nthlei:    'rgba(8,18,80,0.22)',
  nyarlathotep:  'rgba(48,8,88,0.22)',
  shub_niggurath:'rgba(8,48,18,0.22)',
}

export function ReflectionScreen() {
  const runStats  = useGameStore(s => s.runStats)
  const runConfig = useGameStore(s => s.runConfig)
  const resetGame = useGameStore(s => s.resetGame)
  const goToPhase = useGameStore(s => s.goToPhase)

  const godTint = runConfig ? (GOD_TINT_REFLECT[runConfig.godPath] ?? 'transparent') : 'transparent'

  const rows: { key: string; text: string }[] = []
  if (runStats.prepLockedSkipped > 0) {
    const n = runStats.prepLockedSkipped
    rows.push({ key: 'prep', text: `${n} ${n === 1 ? 'option stayed' : 'options stayed'} hidden behind preparations` })
  }
  if (runStats.affordLockedSkipped > 0) {
    const n = runStats.affordLockedSkipped
    rows.push({ key: 'afford', text: `${n} ${n === 1 ? "option you couldn't" : "options you couldn't"} afford` })
  }
  for (const path of runStats.closedPaths) {
    rows.push({ key: `path-${path}`, text: `1 path closed: "${path}"` })
  }

  return (
    <div
      className="screen-slow"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2.5rem 2rem',
        background: `radial-gradient(ellipse at 50% 30%, ${godTint} 0%, transparent 60%), radial-gradient(ellipse at 50% 60%, rgba(80,10,10,0.20) 0%, var(--bg) 70%)`,
      }}
    >
      <div style={{ width: '1px', height: '60px', background: 'linear-gradient(to bottom, transparent, var(--red))', marginBottom: '1.5rem' }} />

      <div style={{ textAlign: 'center', maxWidth: '320px' }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '1.6rem' }}>
          What You Missed
        </div>

        {rows.length === 0 ? (
          <p style={{
            color: 'rgba(218,198,162,0.88)',
            fontStyle: 'italic',
            fontSize: '0.95rem',
            lineHeight: 1.8,
            textShadow: '0 1px 10px rgba(0,0,0,0.9)',
          }}>
            You walked every road that opened to you.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
            {rows.map(r => (
              <li
                key={r.key}
                style={{
                  color: 'rgba(218,198,162,0.92)',
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  marginBottom: '0.6rem',
                  textShadow: '0 1px 10px rgba(0,0,0,0.9)',
                }}
              >
                <span style={{ marginRight: '0.6rem', color: 'rgba(218,198,162,0.6)' }}>◌</span>
                {r.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, var(--red), transparent)', margin: '2rem 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '180px' }}>
        <button
          className="btn-primary"
          onClick={() => { playSfx('click'); resetGame(); goToPhase('godPathSelect') }}
        >
          New Run
        </button>
        <button
          className="btn-secondary"
          style={{ textAlign: 'center' }}
          onClick={() => { playSfx('click'); resetGame() }}
        >
          Main Menu
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd Code/project-abyssial && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ReflectionScreen.tsx
git commit -m "feat(s2): add ReflectionScreen component"
```

---

### Task 5: Wire `FailureScreen` → `ReflectionScreen` via `Continue`

**Files:**
- Modify: `src/components/FailureScreen.tsx`

**Interfaces:**
- Consumes: `ReflectionScreen` from Task 4.
- Produces: behavioural change — `FailureScreen` now renders a single `Continue` primary button. On tap, swaps the panel to `<ReflectionScreen />`.

- [ ] **Step 1: Modify `FailureScreen.tsx`**

In `src/components/FailureScreen.tsx`:

1. Add imports at the top:

```tsx
import { useState } from 'react'
import { ReflectionScreen } from './ReflectionScreen'
```

2. Inside the `FailureScreen` function body, add local state at the top:

```tsx
  const [showReflection, setShowReflection] = useState(false)
  if (showReflection) return <ReflectionScreen />
```

3. Replace the existing two-button block (the `<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '180px' }}>` near the bottom) with:

```tsx
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '180px' }}>
        <button
          className="btn-primary"
          onClick={() => { playSfx('click'); setShowReflection(true) }}
        >
          Continue
        </button>
      </div>
```

- [ ] **Step 2: Typecheck + full test suite**

Run: `cd Code/project-abyssial && npx tsc --noEmit && npx vitest run`
Expected: all tests pass, zero TS errors.

- [ ] **Step 3: Manual smoke (defer to user playtest per CLAUDE.md)**

No automated test for the FailureScreen / ReflectionScreen interaction. Manual playtest verifies:
- After defeat, `Continue` shows reflection panel.
- Counts render correctly.
- `New Run` / `Main Menu` work from the reflection screen.

*(Do NOT add this to backlog or handoff per CLAUDE.md — user playtests off-band.)*

- [ ] **Step 4: Commit**

```bash
git add src/components/FailureScreen.tsx
git commit -m "feat(s2): FailureScreen Continue button → ReflectionScreen"
```

---

## Final Verification

- [ ] **Step 1: Full suite + typecheck**

Run: `cd Code/project-abyssial && npx vitest run && npx tsc --noEmit`
Expected: all tests pass (83 existing + 7 new = 90), zero TS errors.

- [ ] **Step 2: Update session notes**

Per CLAUDE.md "After every completed plan" rule, immediately update `knowledge/sessions/session-90.md` (or current session file) with:
- 5 commits for S2 (Task 1–5).
- Spec ref + plan ref.
- Note: closed-path detection uses progress-past-stage-5-without-recited-tag proxy; refine if playtest shows premature/late firing.

---

## Self-Review Notes

**Spec coverage:** Every spec section maps to a task:
- Type + store field → Task 1.
- Tally site + precedence rule → Task 2.
- Registry + Y'ha entry → Task 3.
- ReflectionScreen + zero-rows fallback → Task 4.
- Continue button + flow → Task 5.

**Type consistency:** `RunStats` field names (`prepLockedSkipped`, `affordLockedSkipped`, `closedPaths`) used identically across all 5 tasks. `PathLockoutRule.isClosed` signature `(state: GameState) => boolean` matches its only consumer `newlyClosedPaths`.

**Out-of-scope items** (Nyar/Shub paths, victory reflection, gameLoop.ts mirror) confirmed not present in any task.

**Risk noted:** The Y'ha predicate is a *proxy* (progress≥5 + no recited tag) rather than the exact dread-band condition from the spec. Documented in Task 3 rationale and Final Verification Step 2. Acceptable per spec Risk §2 — testable from state, no engine duplication, refinable post-playtest.
