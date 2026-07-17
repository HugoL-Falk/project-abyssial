# Session A — Draw Pile & Activity Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing one-shot outcome/insertion display under the draw pile with a live 5-row activity log, give the draw pile a thickness visual that drains as cards are drawn, and fix the doom-modal overlap and reshuffle-count discrepancy.

**Architecture:** Add a persistent `activityLog: ActivityEntry[]` to `gameStore` state, cap at 5 entries, append on three event sources (option resolution → drains existing `deckChanges`; reshuffle handler; `surfaceGodPathCard` resolution). New `ActivityLog.tsx` component replaces `OutcomePanel.tsx`. Draw pile thickness is pure CSS via stepped `box-shadow`s on `DrawPile.tsx`. Two effect handlers exist in parallel (`state/gameStore.ts` + `engine/gameLoop.ts`) — every engine change must land in both.

**Tech Stack:** React + TypeScript + Vite + zustand store (`useGameStore`). No test framework — verification is `npx tsc --noEmit` plus manual dev-server playtest steps.

**Spec:** `docs/superpowers/specs/2026-06-14-session-a-draw-pile-and-activity-log-design.md`

**Working directory for all commands:** `Code/project-abyssial/`

---

## File Plan

| File | Action | Responsibility |
|---|---|---|
| `src/types/index.ts` | Modify | Add `ActivityEntry` discriminated union type |
| `src/state/gameStore.ts` | Modify | Add `activityLog` state, `appendActivity` helper, hook into resolution + reshuffle + surfaceGodPathCard |
| `src/engine/gameLoop.ts` | Modify | Same surfaceGodPathCard + reshuffle hooks (parallel engine) |
| `src/components/game/ActivityLog.tsx` | Create | Render last 5 entries with fade + click-to-preview |
| `src/components/game/OutcomePanel.tsx` | Delete | Replaced by ActivityLog |
| `src/components/GameScreen.tsx` | Modify | Mount `<ActivityLog>` instead of `<OutcomePanel>` |
| `src/components/game/DrawPile.tsx` | Modify | Stepped side-edge shadows by drawPile count |
| `src/components/game/DoomPanel.tsx` (or wherever reshuffle doom modal lives) | Modify | Widen container to stop clipping deck outline |

---

## Task 1: ActivityEntry type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add type at bottom of file (before any closing braces)**

```ts
// ─── Activity Log ─────────────────────────────────────────────────────────────
// One row of the activity log under the draw pile. Capped to 5 entries in state.
export type ActivityEntry =
  | { kind: 'insert';    card: CardSummary }
  | { kind: 'purge';     card: CardSummary }
  | { kind: 'reshuffle'; count: number }
```

- [ ] **Step 2: Verify CardSummary is already exported from this file**

Run: `grep -n "CardSummary" src/types/index.ts`
Expected: at least one `export` line referencing it. If only used internally, change to `export type CardSummary = ...`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(P15-12): add ActivityEntry type for draw-pile log"
```

---

## Task 2: activityLog state + appendActivity helper in gameStore

**Files:**
- Modify: `src/state/gameStore.ts`

- [ ] **Step 1: Add `activityLog: ActivityEntry[]` to the store state interface**

Find the `GameStore` (or equivalent) interface — the type declaration that lists `phase`, `deck`, `resources`, etc. Add:

```ts
activityLog: ActivityEntry[]
```

Add `ActivityEntry` to the import list at the top of the file from `'../types'`.

- [ ] **Step 2: Initialise to `[]` in every place a fresh store is created**

Search the file for places that initialise the store. Common patterns: `set({ phase: 'menu', ... })` in `startRun`, `restartRun`, initial state, `loadRun`, and `endRun → menu` transitions.

Run: `grep -n "phase: 'menu'\|phase: 'playing'\|phase: 'victory'\|phase: 'gameOver'" src/state/gameStore.ts`

For each `set({...})` that resets the run (start/restart only — NOT every set), add `activityLog: []`. **Do NOT** reset `activityLog` on reshuffle or on draw — it persists for the whole run.

Initial state at the top (`create<GameStore>()(set => ({...}))`) — add `activityLog: []`.

In `loadRun`, after rehydrating deck, add `activityLog: []` (we don't persist log to save data — fresh on load).

- [ ] **Step 3: Add `appendActivity` helper at top of file, after `MAX_ACTIVITY_LOG_ROWS` const**

Insert this near the other top-level constants (e.g. next to `ALWAYS_IN_CORE_IDS`):

```ts
const MAX_ACTIVITY_LOG_ROWS = 5

function appendActivity(log: ActivityEntry[], ...entries: ActivityEntry[]): ActivityEntry[] {
  const next = [...log, ...entries]
  return next.length <= MAX_ACTIVITY_LOG_ROWS
    ? next
    : next.slice(next.length - MAX_ACTIVITY_LOG_ROWS)
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/state/gameStore.ts
git commit -m "feat(P15-12): add activityLog state + appendActivity helper"
```

---

## Task 3: Drain deckChanges into activityLog at end of option resolution

**Files:**
- Modify: `src/state/gameStore.ts`

**Context:** `OutcomePanel.tsx` already reads `pendingDeckChanges.inserted` and `pendingDeckChanges.removed`. We're going to keep populating that field (it's used by other things like the insert preview overlay) AND additionally append the same entries to `activityLog`.

- [ ] **Step 1: Find the option-resolution function**

Run: `grep -n "pendingDeckChanges\|deckChanges" src/state/gameStore.ts | head -20`

Find the place where `deckChanges` is computed and then `set({...})` writes it to state at the end of `resolveOption` (or similarly named). It is likely the function that contains the `switch (effect.type)` with all the `case 'resource':`, `case 'insertCard':`, etc.

- [ ] **Step 2: At the `set({...})` site at the end of resolveOption, append insertions and purges to activityLog**

Pattern: just before the `set({...})` call, build the new entries:

```ts
const newActivityEntries: ActivityEntry[] = [
  ...deckChanges.inserted.map((card): ActivityEntry => ({ kind: 'insert', card })),
  ...deckChanges.removed.map((card):  ActivityEntry => ({ kind: 'purge',  card })),
]
const newActivityLog = appendActivity(state.activityLog, ...newActivityEntries)
```

Then add `activityLog: newActivityLog,` to the `set({...})` object.

If the `set` uses functional form `set(s => ({...}))`, reference `s.activityLog` instead of `state.activityLog`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`
Start a new run, pick an option that inserts or removes a card. Open DevTools console: `useGameStore.getState().activityLog` should now show entries.

- [ ] **Step 5: Commit**

```bash
git add src/state/gameStore.ts
git commit -m "feat(P15-12): drain deckChanges into activityLog on option resolve"
```

---

## Task 4: Emit reshuffle event into activityLog

**Files:**
- Modify: `src/state/gameStore.ts`

- [ ] **Step 1: Open `reshuffleOnly` (around line 1018)**

- [ ] **Step 2: Compute the reshuffle count and append**

The reshuffle count is the number of cards moved from discard back to draw. Before `reshuffle()` is called, capture `const reshuffledCount = state.deck.discardPile.length`.

After the `set({...})` (or fold into it), add:

```ts
const newActivityLog = appendActivity(state.activityLog, { kind: 'reshuffle', count: reshuffledCount })
```

And include `activityLog: newActivityLog` in the `set({...})` call.

**Tutorial branch:** `tutorialReshuffle` also moves cards. Do the same capture + append in the tutorial branch above.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Manual smoke test**

Drain the draw pile to 0, click reshuffle. Console: `useGameStore.getState().activityLog` last entry should be `{kind: 'reshuffle', count: N}`.

- [ ] **Step 5: Commit**

```bash
git add src/state/gameStore.ts
git commit -m "feat(P15-12): emit reshuffle entries into activityLog"
```

---

## Task 5: surfaceGodPathCard logs the surfaced card (P15-8)

**Files:**
- Modify: `src/state/gameStore.ts` (around line 772)
- Modify: `src/engine/gameLoop.ts` (find corresponding `case 'surfaceGodPathCard':`)

- [ ] **Step 1: In gameStore.ts surfaceGodPathCard case, push the surfaced card to deckChanges.inserted**

Today: when a god-path card is moved from later in the deck to position 2, nothing is reported. Modify:

```ts
case 'surfaceGodPathCard': {
  const gpIdx = deck.drawPile.findIndex(c => c.tier === 'god_path')
  if (gpIdx > 2) {
    const card = deck.drawPile[gpIdx]
    const newPile = [...deck.drawPile]
    newPile.splice(gpIdx, 1)
    newPile.splice(2, 0, card)
    deck = { ...deck, drawPile: newPile }
    deckChanges.inserted.push(toSummary(card))  // ← add this
  }
  break
}
```

This automatically flows into the activityLog via Task 3's drain.

- [ ] **Step 2: Apply parallel change in `src/engine/gameLoop.ts`**

Find: `grep -n "surfaceGodPathCard" src/engine/gameLoop.ts`

`gameLoop.ts` may not track `deckChanges` the same way as gameStore — inspect the surrounding context. If `gameLoop.ts` has no `deckChanges` concept, no change is needed there (it's a simulation / batch engine, not the UI path).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Manual smoke test**

Find a card that surfaces god path (e.g. `the_seance` — see Whispers map). Pick that option; verify a `+ <god path card name>` entry appears.

- [ ] **Step 5: Commit**

```bash
git add src/state/gameStore.ts src/engine/gameLoop.ts
git commit -m "feat(P15-8): surfaceGodPathCard reports surfaced card to deckChanges"
```

---

## Task 6: Audit randomOutcome insert tracking (P15-7 merchant fix)

**Files:**
- Modify: `src/state/gameStore.ts` (find `case 'randomOutcome'` in the effect switch)
- Modify: `src/engine/gameLoop.ts` (parallel)

- [ ] **Step 1: Locate randomOutcome resolution**

Run: `grep -n "randomOutcome\|randomBranch\|weightedBranch" src/state/gameStore.ts`

Open the case. Each branch contains its own `effects: Effect[]` plus a `flavourText`. The bug: when a branch fires, its `insertCard` effects must populate `deckChanges.inserted` (so they appear in the log).

- [ ] **Step 2: Verify branch effects are passed back through the same effect loop**

In most engines this is done recursively — the branch's effects are pushed onto the same effect queue. Inspect the existing implementation. If branch effects are already recursed through the main switch, no change is needed (Task 3's drain catches them).

If branch effects are resolved in a sub-function that does NOT update `deckChanges`, fix it: every `insertCard`, `removeCard`, `surfaceGodPathCard` etc. inside a random branch must push to `deckChanges.inserted` / `removed` just like the top-level cases.

- [ ] **Step 3: Confirm with `the_travelling_merchant`**

Run dev server. Draw the merchant card, pick the random outcome. If the branch was a card insert, the activity log should show `+ <card>`. If only flavour appears in the log (which shouldn't, since we're not logging flavour — but no log entry at all also fails), the recursion path is broken.

- [ ] **Step 4: Apply parallel change to `gameLoop.ts` if applicable**

- [ ] **Step 5: Typecheck + commit**

```bash
git add src/state/gameStore.ts src/engine/gameLoop.ts
git commit -m "fix(P15-7): randomOutcome branch inserts populate deckChanges"
```

---

## Task 7: ActivityLog component

**Files:**
- Create: `src/components/game/ActivityLog.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useGameStore } from '../../state/gameStore'

const RED_TIERS = new Set(['threat', 'doom', 'overflow', 'deficit'])

export function ActivityLog({ onPreviewCard }: { onPreviewCard: (id: string) => void }) {
  const log = useGameStore(s => s.activityLog)
  if (log.length === 0) return null

  // Newest entry is at the end of the array; render top-to-bottom with fade rising upward.
  // Opacity ladder for positions counted from the bottom: 1.0, 0.85, 0.65, 0.45, 0.25
  const opacities = [0.25, 0.45, 0.65, 0.85, 1.0]
  const pad = Math.max(0, 5 - log.length)

  return (
    <div
      role="log"
      aria-live="polite"
      style={{
        width: '260px',
        margin: '0.6rem auto 0',
        background: 'rgba(20, 16, 12, 0.85)',
        border: '1px solid #3a2e1f',
        borderRadius: '4px',
        padding: '0.45rem 0.6rem',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Georgia, serif',
      }}
    >
      {log.map((entry, i) => {
        const opacity = opacities[pad + i] ?? 1.0
        return <ActivityRow key={`${i}-${entryKey(entry)}`} entry={entry} opacity={opacity} onPreviewCard={onPreviewCard} />
      })}
    </div>
  )
}

function entryKey(e: ReturnType<typeof useGameStore.getState>['activityLog'][number]): string {
  if (e.kind === 'reshuffle') return `r${e.count}`
  return `${e.kind}-${e.card.id}`
}

function ActivityRow({
  entry, opacity, onPreviewCard,
}: {
  entry: ReturnType<typeof useGameStore.getState>['activityLog'][number]
  opacity: number
  onPreviewCard: (id: string) => void
}) {
  const isReshuffle = entry.kind === 'reshuffle'
  const isRed = !isReshuffle && RED_TIERS.has(entry.card.tier)
  const symbol = entry.kind === 'insert' ? '+' : entry.kind === 'purge' ? '−' : '↻'
  const label  = isReshuffle ? `Reshuffled (${entry.count})` : entry.card.title
  const color  = isReshuffle ? '#8a7a5a' : isRed ? '#c84a3a' : '#d4c8a8'

  const rowStyle: React.CSSProperties = {
    opacity,
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.18rem 0',
    fontSize: '0.85rem',
    color,
    fontStyle: isReshuffle ? 'italic' : 'normal',
    borderBottom: '1px dotted rgba(120, 100, 70, 0.2)',
    animation: 'activityRowIn 0.2s ease-out',
  }

  if (isReshuffle) {
    return (
      <div style={rowStyle}>
        <span style={{ width: '14px', textAlign: 'center', fontWeight: 'bold' }}>{symbol}</span>
        <span>{label}</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onPreviewCard(entry.card.id)}
      style={{
        ...rowStyle,
        background: 'transparent',
        border: 'none',
        borderBottom: '1px dotted rgba(120, 100, 70, 0.2)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'Georgia, serif',
        width: '100%',
      }}
    >
      <span style={{ width: '14px', textAlign: 'center', fontWeight: 'bold' }}>{symbol}</span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  )
}
```

- [ ] **Step 2: Add the `activityRowIn` keyframes to `src/index.css` (or whichever global stylesheet holds the other keyframes — search for `@keyframes pulsePrompt`)**

```css
@keyframes activityRowIn {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}
```

Note: the row's final opacity is set inline; the keyframe overrides it briefly during entry. Acceptable visual trade-off.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/game/ActivityLog.tsx src/index.css
git commit -m "feat(P15-12): ActivityLog component"
```

---

## Task 8: Mount ActivityLog in GameScreen, remove OutcomePanel

**Files:**
- Modify: `src/components/GameScreen.tsx`
- Delete: `src/components/game/OutcomePanel.tsx`

- [ ] **Step 1: Find the `<OutcomePanel>` usage**

Run: `grep -n "OutcomePanel" src/components/GameScreen.tsx`

- [ ] **Step 2: Replace import**

```diff
-import { OutcomePanel } from './game/OutcomePanel'
+import { ActivityLog } from './game/ActivityLog'
```

- [ ] **Step 3: Replace JSX**

```diff
-<OutcomePanel onPreviewCard={...} />
+<ActivityLog onPreviewCard={...} />
```

Keep the same `onPreviewCard` callback that was being passed.

- [ ] **Step 4: Delete OutcomePanel.tsx**

```bash
rm src/components/game/OutcomePanel.tsx
```

Run: `grep -rn "OutcomePanel" src/` — expected: no matches.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Manual smoke test**

`npm run dev`. Start run, draw a card, pick options that insert/purge. Verify:
- Activity log appears under draw pile.
- Each event creates a new row at the bottom.
- After 5 events, oldest fades out / disappears.
- Click a `+ Card Name` row → opens card preview.
- Reshuffle event renders italic with `↻ Reshuffled (N)`.
- Threat/doom/overflow/deficit cards in red.

- [ ] **Step 7: Commit**

```bash
git add src/components/GameScreen.tsx
git rm src/components/game/OutcomePanel.tsx
git commit -m "feat(P15-2): replace OutcomePanel with ActivityLog under draw pile"
```

---

## Task 9: Draw pile thickness — stepped side edges

**Files:**
- Modify: `src/components/game/DrawPile.tsx`

- [ ] **Step 1: Add an `edgeCount` derivation at the top of the component**

```tsx
const edgeCount =
  isEmpty           ? 0 :
  count >= 15       ? 3 :
  count >= 8        ? 2 :
                       1  // 1–7 cards
```

- [ ] **Step 2: Build the box-shadow string conditionally**

Inside the component, before the JSX:

```tsx
const edgeShadow = edgeCount === 3
  ? '4px 0 0 #2a2218, 6px 2px 0 #1f180f, 8px 4px 0 #14100a, 0 8px 18px rgba(0,0,0,0.7)'
  : edgeCount === 2
  ? '3px 0 0 #2a2218, 5px 2px 0 #1f180f, 0 6px 14px rgba(0,0,0,0.65)'
  : edgeCount === 1
  ? '2px 0 0 #2a2218, 0 4px 10px rgba(0,0,0,0.55)'
  : 'none'
```

- [ ] **Step 3: Apply to `imageBackStyle`**

Modify the existing `imageBackStyle.boxShadow` to layer the edge shadow with the inset vignette:

```tsx
boxShadow: `inset 0 0 22px 6px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(0,0,0,0.7), ${edgeShadow === 'none' ? '0 6px 24px rgba(0,0,0,0.55)' : edgeShadow}`,
```

(`edgeShadow === 'none'` keeps the original drop shadow for the empty-pile fallback.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Manual smoke test**

Start run with fresh 17-card deck. Verify 3 stepped edges visible. Draw a few cards down to 9: still 2 edges. Down to 5: 1 edge. Down to 1: still 1 edge. After last draw triggers empty: outline / no edge.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/DrawPile.tsx
git commit -m "feat(P15-3): stepped side-edge shadow shrinks as draw pile drains"
```

---

## Task 10: Widen reshuffle doom modal (P15-5)

**Files:**
- Modify: `src/components/game/DoomPanel.tsx` (likely — verify with grep)

- [ ] **Step 1: Locate the reshuffle doom modal**

Run: `grep -rn "Deck reshuffled\|Unravelling card\|Doom escalates" src/components/`

The user described "When reshuffle happened and doom was inserted, the box covered a little bit of the deck" — the box is the panel that appears next to / over the deck on reshuffle. Open the matching file.

- [ ] **Step 2: Find the offending container and bump its width**

The current width is too narrow → the box wraps too tall, clipping the deck. Increase `min-width` or `max-width` so the text fits on one line (or fewer lines). Concrete target: `min-width: 340px` or `width: 340px` — verify by visual.

- [ ] **Step 3: Manual verify**

Reshuffle in dev to trigger the panel. Confirm it no longer overlaps the deck outline.

- [ ] **Step 4: Commit**

```bash
git add src/components/game/DoomPanel.tsx
git commit -m "fix(P15-5): widen reshuffle doom modal to stop clipping deck outline"
```

---

## Task 11: Investigate reshuffle outline count discrepancy (P15-10)

**Files:**
- Modify: `src/components/game/DrawPile.tsx`
- Possibly: `src/state/gameStore.ts` or `src/engine/deck.ts`

- [ ] **Step 1: Reproduce**

Drain pile to empty in dev. Note the "N in discard" outline number. Click reshuffle. Note the post-reshuffle `drawPile.length` (visible on the pile face).

User reported: outline said 12, drawPile became 17 after reshuffle. Hypothesis: cards are inserted into the drawPile *during* reshuffle (the unravelling doom card, possibly passives via `applyPassivesForReshuffle`) which don't come from the discard.

- [ ] **Step 2: Instrument reshuffleOnly to log the gap**

Temporarily add at the top of `reshuffleOnly`:

```ts
console.log('[P15-10]', {
  discardBefore: state.deck.discardPile.length,
  drawBefore:    state.deck.drawPile.length,
})
```

After the `set({...})`, in the next animation frame (or just chain a second log via setTimeout(0)) log post-state:

```ts
setTimeout(() => {
  const s = get()
  console.log('[P15-10] after', {
    discardAfter: s.deck.discardPile.length,
    drawAfter:    s.deck.drawPile.length,
  })
}, 0)
```

Reshuffle once. Read console.

- [ ] **Step 3: Decide the fix based on evidence**

Two outcomes:

**(a) `drawAfter` = `discardBefore` exactly** → the 12 vs 17 was a reporting bug (e.g. stale React render). Fix: ensure GameScreen.tsx passes a fresh `deck.discardPile.length` each frame (already does at line 42). Look for memoization that could stale.

**(b) `drawAfter` > `discardBefore`** → reshuffle inserts extra cards (likely the unravelling doom card). The outline is *correct* but the player's mental model is wrong. Two valid fixes:
  - **(b1)** Show projected post-reshuffle count: change the outline text from `{discardCount} in discard` to `{discardCount + projectedExtras} after reshuffle`. Compute `projectedExtras` by looking at `getUnravellingTier(reshuffleCount + 1)` to see if an unravelling card will be added (count = 1 if applicable).
  - **(b2)** Show both: `{discardCount} in discard · +1 doom`. Clearer for the player.

Pick **(b2)** if outcome (b) — it preserves transparency.

- [ ] **Step 4: Remove diagnostic console.logs**

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Manual verify**

Drain to empty, observe the outline; reshuffle, observe drawPile count. They must match the outline's prediction.

- [ ] **Step 7: Commit**

```bash
git add -- src/components/game/DrawPile.tsx src/state/gameStore.ts
git commit -m "fix(P15-10): reshuffle outline matches post-reshuffle draw pile count"
```

---

## Task 12: Full manual playtest pass + session log update

- [ ] **Step 1: Full session-A playthrough**

Run `npm run dev`. Start a fresh non-tutorial run on any god path. Verify each checkbox:

- [ ] Activity log appears under draw pile after first option resolved
- [ ] `+ Card Name` rows render in default colour for non-red tiers
- [ ] `+ Card Name` rows render red for threat/doom/overflow/deficit
- [ ] `− Card Name` rows render correctly
- [ ] `↻ Reshuffled (N)` italic row appears on reshuffle, N matches actual count
- [ ] Clicking a `+`/`−` row opens card preview modal
- [ ] Reshuffle row is not clickable
- [ ] After 5 events, oldest event slides off the top, newest at the bottom
- [ ] Slide-in animation visible (~200ms)
- [ ] God-path surface via `the_seance` produces a `+` entry
- [ ] Merchant random outcome that inserts a card produces a `+` entry
- [ ] Stranger Asks Questions random threat removal produces a `−` entry (re-verifies P15-11 from session 73)
- [ ] Draw pile shows 3 edges at start, drains stepwise
- [ ] Reshuffle doom modal no longer clips deck outline
- [ ] Reshuffle outline count matches what appears on draw pile after click

- [ ] **Step 2: Update knowledge files**

Update `knowledge/backlog.md`:
- Mark P15-2, P15-3, P15-5, P15-7, P15-8, P15-9, P15-12 as `[x]` complete with commit hashes
- Mark P15-10 status based on Task 11 outcome
- Update the "Last updated" header line at the top

Create `knowledge/sessions/session-74.md` documenting all commits, root causes for P15-10, and any deviations from the spec.

- [ ] **Step 3: Commit knowledge updates**

```bash
git add knowledge/
git commit -m "docs(session-74): close Session A — activity log + draw pile visuals"
```

---

## Open Risks (carry forward from spec)

- **Two-engine parity:** Every engine change in Tasks 5–6 must land in both `state/gameStore.ts` and `engine/gameLoop.ts`. Verify with `grep` before committing.
- **Multi-insert overload:** A single option that inserts 3+ cards will push 3 rows in one frame. Acceptable per spec §1.5; verify in manual playtest that it doesn't feel jarring.
- **Loading a save mid-run:** Save data does not persist activityLog. On `loadRun`, log starts empty. Acceptable — flagged for user awareness.
