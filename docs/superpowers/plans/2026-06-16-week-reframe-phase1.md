# Week Reframe — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename "Day" → "Week" globally, reposition the reshuffle banner above the draw deck and persist it until the next draw, unify reshuffle-count display, and fix the empty-deck total readout.

**Architecture:** Pure mechanical refactor + small UX changes. No card data, no engine logic changes beyond computing a post-reshuffle count. File rename + symbol rename in two component files and one data module. Banner repositioning replaces the floating overlay with a deck-anchored element controlled by parent state.

**Tech Stack:** React + TypeScript + Vite + Zustand store; vitest for tests.

**Spec:** `docs/superpowers/specs/2026-06-16-week-reframe-design.md`

**Tickets covered:** P13-24 follow-up rename, P16-51, P16-25, P16-13b.

---

## File Structure

**Renamed:**
- `src/components/game/DayBanner.tsx` → `src/components/game/WeekBanner.tsx`
- `src/data/dayFlavour.ts` → `src/data/weekFlavour.ts`

**Modified:**
- `src/components/GameScreen.tsx` — import update, prop name update, banner integration moved to top-of-deck slot
- `src/components/game/DrawPile.tsx` — prop rename, label rename, empty-state count fix
- `src/components/game/ActivityLog.tsx` — copy update
- `src/state/gameStore.ts:1049-1088` — emit post-reshuffle count in reshuffle ActivityEntry

**No changes:**
- Card data files (`src/data/cards/*`)
- Engine logic beyond the reshuffle count emit
- Type definitions (`ActivityEntry` shape unchanged — only the value computed for `count`)

---

## Task 1 — Rename `dayFlavour` module to `weekFlavour`

**Files:**
- Rename: `src/data/dayFlavour.ts` → `src/data/weekFlavour.ts`
- Modify: `src/data/weekFlavour.ts` (rename symbols)
- Modify: `src/components/game/DayBanner.tsx:7,26-27` (consumer; will be renamed in Task 2)

- [ ] **Step 1: Rename the file**

```bash
git mv src/data/dayFlavour.ts src/data/weekFlavour.ts
```

- [ ] **Step 2: Rename the exported symbols inside the file**

In `src/data/weekFlavour.ts`, change every occurrence of `DayFlavourTier` → `WeekFlavourTier` and `pickDayFlavour` → `pickWeekFlavour`. Flavour string contents inside `POOLS` are **not** touched — those are Phase 2 territory.

Current file (33 lines) has:
- `export type DayFlavourTier = 1 | 2 | 3 | 4`
- `const POOLS: Record<DayFlavourTier, readonly string[]> = { ... }`
- `export function pickDayFlavour(tier: DayFlavourTier): string { ... }`

Replace with `WeekFlavourTier` and `pickWeekFlavour` respectively. Internal POOLS values (the flavour text strings) stay byte-for-byte identical.

- [ ] **Step 3: Update the (still-named) DayBanner consumer to use new symbol names**

In `src/components/game/DayBanner.tsx` line 7:

```ts
import { pickWeekFlavour, type WeekFlavourTier } from '../../data/weekFlavour'
```

And lines 26-27:

```ts
const tier = (Math.max(1, Math.min(4, unravellingTier)) as WeekFlavourTier)
const line = pickWeekFlavour(tier)
```

(File itself is renamed in Task 2; only update imports for now.)

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 5: Run tests**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/weekFlavour.ts src/components/game/DayBanner.tsx
git commit -m "refactor: rename dayFlavour module to weekFlavour"
```

---

## Task 2 — Rename `DayBanner` component to `WeekBanner`

**Files:**
- Rename: `src/components/game/DayBanner.tsx` → `src/components/game/WeekBanner.tsx`
- Modify: `src/components/game/WeekBanner.tsx` (rename export + internal label)
- Modify: `src/components/GameScreen.tsx:17,221` (import + JSX usage)

- [ ] **Step 1: Rename the file**

```bash
git mv src/components/game/DayBanner.tsx src/components/game/WeekBanner.tsx
```

- [ ] **Step 2: Rename the export and update the heading text inside the component**

In `src/components/game/WeekBanner.tsx`:

- Header comment line 1-4: change "Day banner overlay" → "Week banner overlay" and "Day N transition" → "Week N transition" and "Day N — <flavour>" → "Week N — <flavour>".
- Line 11: `export function DayBanner({` → `export function WeekBanner({`.
- Line 21: rename the local `{ day, line }` state shape to `{ week, line }`:

```ts
const [visible, setVisible] = useState<{ week: number; line: string } | null>(null)
```

- Line 28: `setVisible({ day: reshuffleCount + 1, line })` → `setVisible({ week: reshuffleCount + 1, line })`.
- Line 47: animation name `dayBannerFade` → `weekBannerFade` (will also need a CSS update in Task 3 — flag here, no rename until then).
- Line 67: `Day {visible.day}` → `Week {visible.week}`.

- [ ] **Step 3: Update the GameScreen consumer**

In `src/components/GameScreen.tsx`:

- Line 17: `import { DayBanner } from './game/DayBanner'` → `import { WeekBanner } from './game/WeekBanner'`.
- Line 221: `<DayBanner reshuffleCount=...` → `<WeekBanner reshuffleCount=...`.

- [ ] **Step 4: Find the `dayBannerFade` keyframes and rename**

Run: `grep -rn "dayBannerFade" src public`
Expected: locations of the keyframes definition (likely `src/index.css` or similar). Rename `@keyframes dayBannerFade` → `@keyframes weekBannerFade` AND update the matching `animation:` reference in `WeekBanner.tsx` line 47.

If no matches found beyond `WeekBanner.tsx` itself, the keyframes live inline — flag this to the reviewer; do not invent a fallback.

- [ ] **Step 5: Run typecheck and tests**

Run: `npx tsc --noEmit && npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename DayBanner component to WeekBanner"
```

---

## Task 3 — Rename `dayNumber` prop to `weekNumber` and update labels

**Files:**
- Modify: `src/components/game/DrawPile.tsx:7,8,77,87`
- Modify: `src/components/GameScreen.tsx:231`

- [ ] **Step 1: Update DrawPile signature and labels**

In `src/components/game/DrawPile.tsx`:

- Line 7: `export function DrawPile({ count, dayNumber, ...` → `export function DrawPile({ count, weekNumber, ...`.
- Line 8: `count: number; dayNumber: number; onDraw: () => void` → `count: number; weekNumber: number; onDraw: () => void`.
- Line 77: `Day {dayNumber}` → `Week {weekNumber}`.
- Line 87: `Day {dayNumber}` → `Week {weekNumber}`.

- [ ] **Step 2: Update the GameScreen caller**

In `src/components/GameScreen.tsx` line 231:

```tsx
<DrawPile count={drawPileCount} onDraw={handleDraw} onReshuffle={handleReshuffle} discardCount={discardCount} pendingReshuffleAddCount={pendingReshuffleAddCount} insertAnim={insertAnim} reshuffleAnim={reshuffleAnim} weekNumber={reshuffleCount + 1} />
```

- [ ] **Step 3: Run typecheck and tests**

Run: `npx tsc --noEmit && npm test -- --run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/game/DrawPile.tsx src/components/GameScreen.tsx
git commit -m "refactor: rename dayNumber prop to weekNumber"
```

---

## Task 4 — Update activity-log reshuffle copy

**Files:**
- Modify: `src/components/game/ActivityLog.tsx:56`

- [ ] **Step 1: Change the reshuffle label string**

In `src/components/game/ActivityLog.tsx` line 56:

```ts
const label  = isReshuffle ? 'A new week begins.' : entry.card.title
```

- [ ] **Step 2: Search for any other "Day" / "day" strings in user-facing UI**

Run: `grep -rn "'Day\|\"Day\| day \|A new day" src --include="*.ts" --include="*.tsx" | grep -vi "yesterday\|today" `
Expected: no further user-facing "Day" strings remain in components or data outside of card flavour text (which is Phase 2). If matches are found, decide case-by-case: if user-visible reshuffle/banner copy, update; if it's card flavour, leave it; if ambiguous, flag to reviewer.

- [ ] **Step 3: Run typecheck and tests**

Run: `npx tsc --noEmit && npm test -- --run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/game/ActivityLog.tsx
git commit -m "refactor: update reshuffle log copy from day to week"
```

---

## Task 5 — P16-25: Emit post-reshuffle count in activity log

**Files:**
- Modify: `src/state/gameStore.ts:1049-1088`
- Test: `src/state/gameStore.test.ts` (create if missing — see Step 1)

The reshuffle entry currently uses `reshuffledCount = state.deck.discardPile.length` — that's the count of cards *entering* the reshuffle, before the unravelling card is added. Players see the discard count in the activity log and a larger number in the draw deck (post-shuffle). Player only cares about post-shuffle.

Fix: compute the count from the post-reshuffle deck (`deck.drawPile.length`) and use that in the `ActivityEntry`. Apply to both the tutorial branch (line 1062) and the main branch (line 1084).

- [ ] **Step 1: Write a failing test**

Locate or create `src/state/gameStore.test.ts`. Add a test that:
1. Sets up a deck with N cards in discard and 0 in draw pile.
2. Calls `reshuffleOnly()`.
3. Asserts the latest activity log entry of kind `'reshuffle'` has `count === deck.drawPile.length` after the reshuffle (NOT the pre-shuffle discard count).

Use the existing engine helpers. Reference pattern: find an existing gameStore test in `src/` (run `find src -name "*.test.ts"`) and follow its setup.

If no gameStore test file exists, create the file with the standard vitest pattern:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'

describe('reshuffleOnly', () => {
  beforeEach(() => {
    // Reset store between tests — pattern depends on store helpers; if no reset helper exists, recreate state via the store's existing init action.
  })

  it('records post-reshuffle draw pile count in the activity log', () => {
    // Arrange: bring the store to a state where draw pile is empty and discard has cards.
    // Act: call useGameStore.getState().reshuffleOnly()
    // Assert: latest reshuffle entry's count === useGameStore.getState().deck.drawPile.length
  })
})
```

Implementer note: the existing test patterns in this repo are the authority — match them. If state reset is non-trivial and the test is becoming a yak-shave, flag to reviewer rather than inventing patterns.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/state/gameStore.test.ts --run`
Expected: FAIL — current code emits pre-shuffle count.

- [ ] **Step 3: Update both reshuffle branches in `gameStore.ts`**

In `src/state/gameStore.ts`, replace the tutorial branch (around line 1062):

```ts
const deck = tutorialReshuffle(state.deck)
set({
  deck,
  activityLog: appendActivity(state.activityLog, { kind: 'reshuffle', count: deck.drawPile.length }),
})
```

And the main branch (around line 1084):

```ts
set({
  deck,
  resources,
  reshuffleCount,
  unravellingTier,
  pendingUnravelling: false,
  activityLog: appendActivity(state.activityLog, { kind: 'reshuffle', count: deck.drawPile.length }),
  usedRareIds: nextUsedRareIds,
})
```

The `reshuffledCount` local variable at line 1054 is no longer used — remove it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/state/gameStore.test.ts --run`
Expected: PASS.

- [ ] **Step 5: Run full test suite**

Run: `npm test -- --run`
Expected: PASS. Any other test that asserted the pre-shuffle count needs updating; if such a test exists, update its expectation to post-shuffle count and document the change in the commit message.

- [ ] **Step 6: Commit**

```bash
git add src/state/gameStore.ts src/state/gameStore.test.ts
git commit -m "fix(P16-25): emit post-reshuffle count in activity log"
```

---

## Task 6 — P16-13b: Empty-deck shows post-reshuffle total

**Files:**
- Modify: `src/components/game/DrawPile.tsx:80`

The empty-deck state currently reads `{discardCount} in discard · +N more`. Replace with the literal post-reshuffle total — the sum.

- [ ] **Step 1: Update the empty-state line**

In `src/components/game/DrawPile.tsx` line 80, replace:

```tsx
<div style={{ fontSize: '0.85rem', color: 'rgba(200,185,155,0.65)', margin: '0.35rem 0 0.1rem', lineHeight: 1.2 }}>{discardCount} in discard{pendingReshuffleAddCount > 0 ? ` · +${pendingReshuffleAddCount} more` : ''}</div>
```

with:

```tsx
<div style={{ fontSize: '0.85rem', color: 'rgba(200,185,155,0.65)', margin: '0.35rem 0 0.1rem', lineHeight: 1.2 }}>{discardCount + pendingReshuffleAddCount} cards next week</div>
```

Note: "next week" reinforces the weekly frame. If the implementer feels the copy is awkward in context, swap to `"{N} cards"` only — flag the choice to reviewer.

- [ ] **Step 2: Run typecheck and tests**

Run: `npx tsc --noEmit && npm test -- --run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/game/DrawPile.tsx
git commit -m "fix(P16-13b): show post-reshuffle total on empty deck"
```

---

## Task 7 — P16-51: WeekBanner anchored above deck, persists until next draw

**Files:**
- Modify: `src/components/game/WeekBanner.tsx` (rewrite positioning + persistence)
- Modify: `src/components/GameScreen.tsx:220-255` (move banner into the draw-pile view container)

The current banner is a `position: fixed` overlay at `top: 14%` of the viewport that auto-fades after 1500ms. New behaviour: positioned in normal flow above the DrawPile component, persists from reshuffle until the next card is drawn.

The visibility trigger flips from "auto-clear after timeout" to "clear when a card is drawn." Easiest signal: parent passes a `visible` boolean controlled by GameScreen state (e.g., the same state that controls `drawAnim`). Simpler alternative: parent unmounts the banner once `drawPileCount` changes from the post-reshuffle total. Pick the simpler alternative — fewer moving parts.

- [ ] **Step 1: Refactor WeekBanner to be a controlled component**

Rewrite `src/components/game/WeekBanner.tsx`:

```tsx
// ─── Week banner ──────────────────────────────────────────────────────────────
// Inline banner shown above the draw deck on reshuffle (Week N transition).
// Renders "Week N — <flavour>" while `visible` is true. Suppressed when
// `suppress` (tutorial) is true. Parent controls when to hide it (typically
// when the next card is drawn).

import { useMemo } from 'react'
import { pickWeekFlavour, type WeekFlavourTier } from '../../data/weekFlavour'

export function WeekBanner({
  reshuffleCount,
  unravellingTier,
  suppress,
}: {
  reshuffleCount: number
  unravellingTier: number
  suppress: boolean
}) {
  // Pick flavour once per (reshuffleCount, unravellingTier) pair so the line
  // doesn't reshuffle on every render while the banner is visible.
  const line = useMemo(() => {
    const tier = (Math.max(1, Math.min(4, unravellingTier)) as WeekFlavourTier)
    return pickWeekFlavour(tier)
  }, [reshuffleCount, unravellingTier])

  if (suppress) return null
  if (reshuffleCount < 1) return null  // first hand = Week 1, no banner before any reshuffle

  return (
    <div
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.6rem 0',
        animation: 'weekBannerIn 0.35s ease-out',
      }}
    >
      <div
        style={{
          fontSize: '1.4rem',
          color: 'var(--gold)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          lineHeight: 1,
        }}
      >
        Week {reshuffleCount + 1}
      </div>
      <div
        style={{
          fontSize: '0.85rem',
          color: 'rgba(200,185,155,0.85)',
          letterSpacing: '0.08em',
          fontStyle: 'italic',
          textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          textAlign: 'center',
          maxWidth: '88vw',
        }}
      >
        {line}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace the old `weekBannerFade` keyframes**

Locate the existing `@keyframes weekBannerFade` (renamed from `dayBannerFade` in Task 2) and replace with a brief entry animation only:

```css
@keyframes weekBannerIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

The fade-out is gone — banner stays until parent hides it.

- [ ] **Step 3: Wire visibility in GameScreen**

In `src/components/GameScreen.tsx`:

1. Remove the existing top-level `<WeekBanner reshuffleCount=... />` at line 221 (the floating overlay placement).

2. Add a local state `weekBannerVisible` that turns true on reshuffle and false when the next card is drawn. Trigger flips:

```tsx
// Add near other useState hooks
const [weekBannerVisible, setWeekBannerVisible] = useState(false)

// Watch for reshuffleCount increment → show banner
useEffect(() => {
  if (reshuffleCount > 0) setWeekBannerVisible(true)
}, [reshuffleCount])

// Watch for drawPileCount decrement → hide banner (a card was drawn)
const prevDrawCount = useRef(drawPileCount)
useEffect(() => {
  if (drawPileCount < prevDrawCount.current) setWeekBannerVisible(false)
  prevDrawCount.current = drawPileCount
}, [drawPileCount])
```

3. Render `<WeekBanner>` inside the draw-pile view, above `<DrawPile>` (around line 227-232):

```tsx
{showingDrawPile ? (
  <div style={{ height: '100%', paddingTop: '70px', position: 'relative', display: 'flex', flexDirection: 'column' }}>

    {!drawAnim && weekBannerVisible && (
      <WeekBanner reshuffleCount={reshuffleCount} unravellingTier={unravellingTier} suppress={isTutorial} />
    )}

    {!drawAnim && (
      <DrawPile count={drawPileCount} onDraw={handleDraw} onReshuffle={handleReshuffle} discardCount={discardCount} pendingReshuffleAddCount={pendingReshuffleAddCount} insertAnim={insertAnim} reshuffleAnim={reshuffleAnim} weekNumber={reshuffleCount + 1} />
    )}
    ...
  </div>
) : ...
```

Note: the existing imports for `useState`, `useEffect`, `useRef` need to be present; check the top of GameScreen.tsx and add any missing.

- [ ] **Step 4: Verify the Doom-escalates slot doesn't collide**

The DoomPanel (line ~251) is currently rendered in the bottom-stacked container with OutcomeReveal + ActivityLog. P16-13a / Cluster A will later move it. Phase 1 leaves DoomPanel where it is. The new WeekBanner sits *above* the DrawPile; DoomPanel sits *below* the DrawPile. No collision in this phase. Document at the top of the WeekBanner render site:

```tsx
{/* Top slot — WeekBanner. DoomPanel currently lives below the deck (line ~251); */}
{/* Cluster A may relocate it to share this top slot later — coordinate then. */}
```

- [ ] **Step 5: Manual verification checklist**

Run: `npm run dev`

Verify in-browser:
1. Start a new run, drain the draw pile.
2. Tap to reshuffle.
3. Confirm the Week banner appears **above** the draw deck (not as a centered overlay).
4. Confirm the banner **persists** while the deck is visible.
5. Tap to draw a card → confirm the banner disappears.
6. Reshuffle again → confirm it reappears.
7. Run the tutorial → confirm the banner is suppressed.

- [ ] **Step 6: Run typecheck and full test suite**

Run: `npx tsc --noEmit && npm test -- --run`
Expected: PASS. If any DayBanner-related test still exists and references the old positioning behaviour or the `dayBannerFade` animation, update or remove it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(P16-51): anchor week banner above deck, persist until next draw"
```

---

## Task 8 — Final audit sweep for residual "Day" strings

**Files:** All `src/**/*.{ts,tsx}` and `src/**/*.css`.

- [ ] **Step 1: Grep for residual references**

Run:
```bash
grep -rn "DayBanner\|dayBanner\|dayNumber\|DayFlavour\|dayFlavour\|pickDayFlavour" src
```
Expected: zero hits.

Run:
```bash
grep -rn "Day {\|Day  *N\|new day\|A new day" src --include="*.ts" --include="*.tsx"
```
Expected: zero hits in components/state. Hits inside `src/data/cards/*` are card flavour text and are explicitly **out of scope for Phase 1** — leave them.

- [ ] **Step 2: If any residual hits found, fix them**

For each hit:
- If it's a user-visible string in a component → rename per Phase 1 convention.
- If it's an internal identifier → rename to the week-prefixed equivalent.
- If it's card flavour text → leave it (Phase 2).
- If ambiguous → flag to reviewer.

- [ ] **Step 3: Run typecheck and full test suite one more time**

Run: `npx tsc --noEmit && npm test -- --run`
Expected: PASS.

- [ ] **Step 4: Commit (only if Step 2 made changes)**

```bash
git add -A
git commit -m "refactor: sweep residual day references after week rename"
```

---

## Task 9 — Update backlog and session log

**Files:**
- Modify: `E:/Project Abyssial/knowledge/backlog.md` (mark P16-51, P16-25, P16-13b done; note rename complete)
- Modify (create): `E:/Project Abyssial/knowledge/sessions/session-NN.md` (NN = next session number)

- [ ] **Step 1: Mark Cluster C tickets complete in backlog**

In `knowledge/backlog.md`, change the `- [ ]` for P16-51, P16-25, and P16-13b to `- [x]` with a brief annotation pointing to the commits.

- [ ] **Step 2: Note the rename in the P13-24 section**

Add a line under "Session: Deck & Reshuffle Redesign" noting that the Day → Week rename shipped in Phase 1 of the Week reframe spec.

- [ ] **Step 3: Write a session log**

Create the next sequential `knowledge/sessions/session-NN.md` summarising:
- Commits shipped in Phase 1
- Tickets closed (P13-24 rename, P16-51, P16-25, P16-13b)
- Tickets still open (Phase 2 — thematic flavour pass)
- Any flags raised during the rename (e.g., card flavour text containing "day" left untouched)

- [ ] **Step 4: No commit**

`knowledge/` is in the vault, not the project repo. No git action required.

---

## Phase 1 Done When

- All 9 tasks above are checked off.
- `npx tsc --noEmit && npm test -- --run` is green.
- Manual verification checklist in Task 7 Step 5 passes.
- Backlog reflects closed tickets.
- Session log written.

**Next:** Phase 2 plan (`docs/superpowers/plans/2026-06-16-week-reframe-phase2.md`) — thematic flavour rewrite for ~33 common+core cards. Defer until Phase 1 is playtested and the weekly frame is confirmed feeling right in-game.
