# Outcome Feedback System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the timer-based hovering OutcomeToast and DoomEscalates popup with two persistent panels beneath the draw pile. Surface inserts/removes (including the random threat picked by `removeRandomThreat`) and flip `stranger_asks_questions` opt 2 to use it.

**Architecture:** A new `DeckChanges` accumulator is built up during effect application in `gameStore.resolveOption` and committed to a new `pendingDeckChanges` store field. `pendingOutcomeReveal` narrows to flavour-only. Two new presentational components — `OutcomePanel` and `DoomPanel` — read from the store / GameScreen state and render beneath the draw pile. The `Continue` button and 2500 ms `setTimeout` go away; all three reveal states are cleared atomically when the player draws the next card.

**Tech Stack:** TypeScript, React, Zustand. No test framework — verification is `npm run typecheck`, `npm run build`, plus targeted manual playtest scenarios.

**Spec:** `docs/superpowers/specs/2026-06-13-outcome-feedback-design.md`

**Note about file naming in the spec:** The spec refers to "engine changes (`gameLoop.ts`)". The actual effect-resolution switch the player sees is in `src/state/gameStore.ts` (lines 564–638). `gameLoop.ts` has a parallel switch that is no longer the primary path. This plan modifies `gameStore.ts` only. `gameLoop.ts` is left untouched.

---

## File Structure

| File | Role |
|---|---|
| `src/types/index.ts` | Add `CardSummary`, `DeckChanges`, and narrow the in-store `PendingOutcomeReveal` shape. |
| `src/state/gameStore.ts` | Add `pendingDeckChanges` state slot. Accumulate inserts/removes inside `resolveOption`. Capture the picked threat from `removeRandomThreat`. Remove `confirmOutcomeReveal` action. Clear all three reveal states inside `drawNextCard`. |
| `src/components/game/OutcomePanel.tsx` | NEW. Reads `pendingOutcomeReveal` + `pendingDeckChanges`. Renders flavour line + inserted/removed rows beneath the draw pile. Auto-mounts only when there is something to show. |
| `src/components/game/DoomPanel.tsx` | NEW. Receives `tier` + `onClear` props from GameScreen. Replaces the inline reshuffle popup. No `Continue` button; cleared by the next-draw click. |
| `src/components/GameScreen.tsx` | Remove the inline `OutcomeToast` function and its JSX. Remove the inline doom popup JSX and its `Continue` button. Mount `<DoomPanel />` + `<OutcomePanel />` beneath the draw pile. Wire `setReshuffleToast(null)` into the draw handler. |
| `src/data/cards/core.ts` | `stranger_asks_questions` opt 2: swap `removeCard 'investigators_file'` → `removeRandomThreat`. |

---

## Task 1: Add `CardSummary` and `DeckChanges` types

**Files:**
- Modify: `src/types/index.ts` (add after the existing `Condition` union, before "Passive Effects")

- [ ] **Step 1: Add the types**

In `src/types/index.ts`, immediately after the closing of `export type Condition = ...` (the `cardOptionChosen` line near line 57), insert a new block:

```typescript
// ─── Outcome Feedback ─────────────────────────────────────────────────────────

export type CardSummary = {
  id: CardId
  title: string
  tier: CardTier
}

export type DeckChanges = {
  inserted: CardSummary[]
  removed: CardSummary[]
}
```

- [ ] **Step 2: Confirm `CardTier` is exported**

Run: `grep -n "export type CardTier" src/types/index.ts`
Expected: a single match. If `CardTier` is internal (not exported), change the line to `export type CardTier = ...`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add CardSummary and DeckChanges for outcome panel"
```

---

## Task 2: Add `pendingDeckChanges` to store + narrow `pendingOutcomeReveal`

**Files:**
- Modify: `src/state/gameStore.ts` (state type, initial state, action signature)

- [ ] **Step 1: Locate the `PendingOutcomeReveal` shape**

Run: `grep -n "pendingOutcomeReveal" src/state/gameStore.ts`
Expected: declarations of the field on the state type, the initial-state object, and where it gets read/written.

- [ ] **Step 2: Narrow the type and add the new field**

Inside the `GameState` (or equivalent) type, find the line `pendingOutcomeReveal: { effects: Effect[]; flavourText?: string } | null` (or similar). Change it to:

```typescript
pendingOutcomeReveal: { flavourText: string } | null
pendingDeckChanges:   DeckChanges | null
```

Add `DeckChanges` to the existing type import from `../types`.

- [ ] **Step 3: Update `makeInitialState`**

Find the initial-state factory (currently around line 56 onward). Set both fields to `null`:

```typescript
pendingOutcomeReveal: null,
pendingDeckChanges:   null,
```

- [ ] **Step 4: Remove the `confirmOutcomeReveal` action from the type signature**

Find `confirmOutcomeReveal: () => void` in the actions type block (around line 100-ish) and delete the line.

- [ ] **Step 5: Remove the `confirmOutcomeReveal` action implementation**

Find `confirmOutcomeReveal: () => set({ pendingOutcomeReveal: null }),` (currently line 842). Delete the entire line.

- [ ] **Step 6: Typecheck — expect errors**

Run: `npm run typecheck`
Expected: errors. We have not yet updated the call sites in `gameStore.resolveOption` (writes `capturedOutcome` directly into the old shape) and `GameScreen.tsx` (consumes `confirmOutcomeReveal` and the old shape). These are fixed in later tasks. **Do not commit yet.**

---

## Task 3: Capture deck changes inside `resolveOption`

**Files:**
- Modify: `src/state/gameStore.ts` (the `resolveOption` action, around lines 506–840)

- [ ] **Step 1: Open the action and locate the effect loop**

Open `src/state/gameStore.ts`. The action `resolveOption: (optionIndex) => {` begins at line 506. The effect-application `for` loop begins at line 561 (`for (const effect of effectiveEffects) {`).

- [ ] **Step 2: Declare the accumulator before the loop**

Immediately above the `for (const effect of effectiveEffects) {` line, add:

```typescript
const deckChanges: DeckChanges = { inserted: [], removed: [] }
```

Add `DeckChanges` to the imports at the top of `gameStore.ts` if not already imported from `../types`.

Also add `CardSummary` to the same import — it is needed for the helper below.

- [ ] **Step 3: Add a `toSummary` helper above the action**

Above the `resolveOption` action definition (or near the existing helpers near the top of the file), add:

```typescript
function toSummary(card: { id: CardId; title: string; tier: CardTier }): CardSummary {
  return { id: card.id, title: card.title, tier: card.tier }
}
```

If `CardId` / `CardTier` are not yet imported, add them.

- [ ] **Step 4: Capture inserts**

In the `case 'insertCard':` block (currently lines 578–621), after each branch that actually mutates `deck` to add the card, push into the accumulator. There are five mutating branches:

```typescript
// 1. nextCycle via god_path empty-pile path (line 598)
deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
deckChanges.inserted.push(toSummary(toInsert))

// 2. random god_path with remaining > 0 (line 602)
deck = insertCard(toInsert, deck, 'random', effMin, effMax)
deckChanges.inserted.push(toSummary(toInsert))

// 3. position === 'discard' (line 608)
deck = { ...deck, discardPile: [...deck.discardPile, toInsert] }
deckChanges.inserted.push(toSummary(toInsert))

// 4. position === 'nextCycle' OR threat-tier deferral (lines 610 and 615)
deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
deckChanges.inserted.push(toSummary(toInsert))

// 5. fallback insertCard call (line 617)
deck = insertCard(toInsert, deck, effect.position as 'top' | 'bottom' | 'random', effect.minPos, effect.maxPos)
deckChanges.inserted.push(toSummary(toInsert))
```

The `uniqueInDeck` early `break` (line 588) must remain unchanged — when a duplicate is rejected, nothing is pushed.

- [ ] **Step 5: Capture removes (only when something was actually removed)**

Replace the `case 'removeCard':` block (lines 623–626):

```typescript
case 'removeCard': {
  const targetCard =
    deck.drawPile.find(c => c.id === effect.cardId && !c.permanent) ??
    deck.discardPile.find(c => c.id === effect.cardId && !c.permanent) ??
    deck.nextCycleQueue.find(c => c.id === effect.cardId && !c.permanent)
  if (targetCard) {
    deckChanges.removed.push(toSummary(targetCard))
    deck = removeCardFromDeck(effect.cardId, deck)
  }
  break
}
```

This guarantees no ghost rows for no-op removes.

- [ ] **Step 6: Capture the random threat**

Replace the `case 'removeRandomThreat':` block (lines 628–638):

```typescript
case 'removeRandomThreat': {
  const threatIndices = deck.drawPile
    .map((c, i) => ({ card: c, idx: i }))
    .filter(({ card }) => card.tier === 'threat')
  if (threatIndices.length > 0) {
    const pick = threatIndices[Math.floor(Math.random() * threatIndices.length)]
    deckChanges.removed.push(toSummary(pick.card))
    const newDrawPile = deck.drawPile.filter((_, i) => i !== pick.idx)
    deck = { ...deck, drawPile: newDrawPile }
  }
  break
}
```

- [ ] **Step 7: Capture overflow / deficit insertions**

`applyOverflowEffects` and `applyDeficitEffects` (called at lines 573–574) return a new `deck` but do not report what they added. Without modifying those helpers, infer the inserted cards by diffing pile lengths.

Replace lines 573–574:

```typescript
if (!isTutorial) {
  const beforeOverflow = deck
  deck = applyOverflowEffects(resources, deck, effect.resource, prevVal)
  appendDiff(beforeOverflow, deck, deckChanges)
}
if (!isTutorial) {
  const beforeDeficit = deck
  deck = applyDeficitEffects(resources, deck, effect.resource, prevVal)
  appendDiff(beforeDeficit, deck, deckChanges)
}
```

Add this helper near `toSummary`:

```typescript
function appendDiff(before: DeckState, after: DeckState, changes: DeckChanges): void {
  const beforeIds = new Set<string>([
    ...before.drawPile.map(c => c.id),
    ...before.discardPile.map(c => c.id),
    ...before.nextCycleQueue.map(c => c.id),
  ])
  for (const c of [...after.drawPile, ...after.discardPile, ...after.nextCycleQueue]) {
    if (!beforeIds.has(c.id)) {
      changes.inserted.push(toSummary(c))
      beforeIds.add(c.id) // avoid double-counting if both helpers fire
    }
  }
}
```

`DeckState` is already imported; if not, add it from `../types`.

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: errors about the `capturedOutcome` write at line 836 and unresolved references in `GameScreen.tsx`. Engine block is now clean. **Do not commit yet.**

---

## Task 4: Commit the accumulator and clear on next draw

**Files:**
- Modify: `src/state/gameStore.ts` (the final `set({...})` of `resolveOption`, and `drawNextCard`)

- [ ] **Step 1: Write the deck-changes record into state**

In `resolveOption`'s final `set({...})` block (currently line 822 onward), change the `pendingOutcomeReveal` line and add the new field:

```typescript
pendingOutcomeReveal: phase === 'playing' && capturedOutcome?.flavourText
  ? { flavourText: capturedOutcome.flavourText }
  : null,
pendingDeckChanges: phase === 'playing' && (deckChanges.inserted.length > 0 || deckChanges.removed.length > 0)
  ? deckChanges
  : null,
```

Effect now lives only on the option button; the previously-captured `effects` array is intentionally dropped.

- [ ] **Step 2: Locate `drawNextCard`**

Run: `grep -n "drawNextCard:" src/state/gameStore.ts`
Expected: one match for the action definition.

- [ ] **Step 3: Clear all three reveal states in `drawNextCard`**

Inside `drawNextCard`, find the `set({...})` call that mutates state for the new draw. Add these three lines (alongside whatever else is being set):

```typescript
pendingOutcomeReveal: null,
pendingDeckChanges:   null,
```

If `drawNextCard` does NOT currently call `set` with these fields (because they were previously cleared by `confirmOutcomeReveal`), wrap the existing logic so it does. The reshuffle toast is local component state in `GameScreen` (handled in Task 7) — do not try to clear it from the store.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: now errors only remain in `GameScreen.tsx` (consumes the old `effects` field and calls `confirmOutcomeReveal`). **Do not commit yet — `GameScreen` still references removed action.**

---

## Task 5: Create `OutcomePanel`

**Files:**
- Create: `src/components/game/OutcomePanel.tsx`

- [ ] **Step 1: Create the file**

Write `src/components/game/OutcomePanel.tsx`:

```typescript
import { useGameStore }   from '../../state/gameStore'
import type { CardSummary } from '../../types'

const TIER_TINT: Record<string, string> = {
  threat:   'rgba(220,110,110,0.85)',
  treat:    'rgba(160,200,140,0.85)',
  core:     'rgba(220,200,160,0.85)',
  rare:     'rgba(220,180,90,0.95)',
  common:   'rgba(220,200,160,0.85)',
  god_path: 'rgba(180,140,220,0.95)',
  tutorial: 'rgba(200,185,155,0.7)',
}

const GREEN = 'rgba(160,210,150,0.95)'
const RED   = 'rgba(220,110,110,0.95)'

export function OutcomePanel({ onPreviewCard }: { onPreviewCard: (id: string) => void }) {
  const flavour       = useGameStore(s => s.pendingOutcomeReveal?.flavourText ?? null)
  const inserted      = useGameStore(s => s.pendingDeckChanges?.inserted ?? [])
  const removed       = useGameStore(s => s.pendingDeckChanges?.removed ?? [])

  if (!flavour && inserted.length === 0 && removed.length === 0) return null

  function Row({ label, card, color }: { label: string; card: CardSummary; color: string }) {
    return (
      <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.78rem', alignItems: 'baseline' }}>
        <span style={{ color: 'rgba(200,185,155,0.55)', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: '0.62rem' }}>
          {label}
        </span>
        <button
          type="button"
          onClick={() => onPreviewCard(card.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'var(--ui-font)',
            fontSize: '0.78rem',
            textAlign: 'left',
          }}
        >
          {card.title}
        </button>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-label="Outcome"
      style={{
        background: 'rgba(6,4,2,0.92)',
        border: '1px solid rgba(200,144,32,0.28)',
        borderRadius: '3px',
        padding: '0.5rem 0.8rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
        maxWidth: '80vw',
        animation: 'fadeIn 0.18s ease-out',
      }}
    >
      {flavour && (
        <span style={{ fontSize: '0.78rem', color: 'rgba(200,185,155,0.7)', fontStyle: 'italic', textAlign: 'center' }}>
          {flavour}
        </span>
      )}
      {inserted.map((c, i) => (
        <Row key={`ins-${i}-${c.id}`} label="Inserted" card={c} color={GREEN} />
      ))}
      {removed.map((c, i) => (
        <Row key={`rem-${i}-${c.id}`} label="Removed" card={c} color={RED} />
      ))}
    </div>
  )
}
```

(The `TIER_TINT` map is unused in v1 per the spec — kept in place for the future color-coding hook. If lint complains, prefix with `// eslint-disable-next-line` or remove and reinstate later.)

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: errors remain in `GameScreen.tsx` (still references removed members). New component compiles.

- [ ] **Step 3: Do not commit yet** — `GameScreen.tsx` is still broken until Task 7.

---

## Task 6: Create `DoomPanel`

**Files:**
- Create: `src/components/game/DoomPanel.tsx`

- [ ] **Step 1: Create the file**

Write `src/components/game/DoomPanel.tsx`:

```typescript
export function DoomPanel({ tier }: { tier: 1 | 2 | 3 | 4 }) {
  const message =
    tier === 1 ? 'An Unravelling card now lurks in the deck. Each reshuffle brings one, and each is worse than the last.'
    : tier === 2 ? 'A more severe Unravelling has entered the deck.'
    : tier === 3 ? 'A grave Unravelling now haunts your every draw.'
    :              'The darkest Unravelling tears through your deck.'

  return (
    <div
      role="status"
      aria-label="Doom escalates"
      style={{
        background: 'rgba(10,8,5,0.95)',
        border: '1px solid rgba(180,60,60,0.45)',
        borderRadius: '3px',
        padding: '0.5rem 0.9rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.3rem',
        maxWidth: '80vw',
        boxShadow: '0 0 24px rgba(180,60,60,0.18)',
        animation: 'fadeIn 0.22s ease-out',
      }}
    >
      <div style={{ fontSize: '0.62rem', color: 'rgba(220,110,110,0.7)', textTransform: 'uppercase', letterSpacing: '0.22em' }}>
        Deck reshuffled
      </div>
      <div style={{ fontSize: '0.92rem', color: 'rgba(220,100,100,0.95)', fontVariant: 'small-caps', letterSpacing: '0.12em' }}>
        Doom escalates
      </div>
      <div style={{ fontSize: '0.74rem', color: 'rgba(200,185,155,0.78)', fontStyle: 'italic', lineHeight: 1.45, textAlign: 'center' }}>
        {message}
      </div>
    </div>
  )
}
```

No `Continue` button — clearing is the draw click in GameScreen.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: same `GameScreen.tsx` errors as before; new component compiles.

- [ ] **Step 3: Do not commit yet.**

---

## Task 7: Wire panels into `GameScreen`, remove old toasts, drop the timer

**Files:**
- Modify: `src/components/GameScreen.tsx`

- [ ] **Step 1: Remove the `OutcomeToast` function**

Delete the entire `OutcomeToast` component definition at lines 20–75 (from the `// ─── Outcome toast` comment through the closing `}` before `export function GameScreen()`).

- [ ] **Step 2: Drop the `confirmOutcomeReveal` selector**

In the selectors block (around line 97–98), delete the `confirmOutcomeReveal` line:

```typescript
const confirmOutcomeReveal   = useGameStore(s => s.confirmOutcomeReveal)  // delete this line
```

- [ ] **Step 3: Add the new imports**

At the top of the file, add:

```typescript
import { OutcomePanel } from './game/OutcomePanel'
import { DoomPanel }    from './game/DoomPanel'
```

- [ ] **Step 4: Remove the inline doom popup JSX**

Find the JSX block starting `{/* Doom escalates popup — shown immediately after reshuffle on both screens */}` at line 433 and ending at the closing `)}` near line 487. Delete the entire block.

- [ ] **Step 5: Remove the inline outcome toast JSX**

Find the block:

```typescript
{/* Outcome toast — auto-dismisses after 2500ms */}
{pendingOutcomeReveal && (
  <OutcomeToast
    effects={pendingOutcomeReveal.effects}
    flavourText={pendingOutcomeReveal.flavourText}
    onDismiss={confirmOutcomeReveal}
    onPreviewCard={setPreviewCardId}
  />
)}
```

(currently lines 489–497). Delete it.

- [ ] **Step 6: Mount the new panels**

Locate the draw-pile rendering (search for `DrawPile` JSX usage). Immediately after the `<DrawPile ... />` closing tag, insert:

```tsx
<div
  style={{
    position: 'absolute',
    bottom: '1.2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 22,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    pointerEvents: 'auto',
    maxWidth: '92vw',
  }}
>
  {reshuffleToast && <DoomPanel tier={reshuffleToast.tier as 1 | 2 | 3 | 4} />}
  <OutcomePanel onPreviewCard={setPreviewCardId} />
</div>
```

Stacking order (DoomPanel on top, OutcomePanel below) matches the spec's "Stacking order" section.

- [ ] **Step 7: Clear the reshuffle toast on next draw**

In the `handleDraw` function (around line 168), find the existing body and add `setReshuffleToast(null)` near the top, before the lift animation kicks off. Example placement:

```typescript
function handleDraw() {
  if (drawPileCount === 0) { /* reshuffle path — leave alone */ ... }
  setReshuffleToast(null)
  // ... existing draw animation code
}
```

Check the existing function carefully and ensure the `null` set fires on the *playing-card draw* path, not the reshuffle path (reshuffle is what *sets* the toast).

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 9: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add src/types/index.ts src/state/gameStore.ts \
        src/components/game/OutcomePanel.tsx src/components/game/DoomPanel.tsx \
        src/components/GameScreen.tsx
git commit -m "feat(ui): outcome + doom panels beneath draw pile (P14-2/17/24)"
```

---

## Task 8: Flip `stranger_asks_questions` opt 2 to `removeRandomThreat`

**Files:**
- Modify: `src/data/cards/core.ts` (the `stranger_asks_questions` card)

- [ ] **Step 1: Locate the card**

Run: `grep -n "stranger_asks_questions" src/data/cards/core.ts`
Expected: one match around line 39.

- [ ] **Step 2: Swap the effect**

Find:

```typescript
{
  label: 'Have him followed',
  flavourText: 'He goes to the post office. He goes to the library. He writes things down. Your people write things down too.',
  effects: [
    { type: 'resource', resource: 'gold', delta: -1 },
    { type: 'removeCard', cardId: 'investigators_file' },
  ],
  condition: { type: 'resourceMin', resource: 'gold', min: 1 },
},
```

Replace the `removeCard` line with:

```typescript
    { type: 'removeRandomThreat' },
```

So the effects array becomes:

```typescript
effects: [
  { type: 'resource', resource: 'gold', delta: -1 },
  { type: 'removeRandomThreat' },
],
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/core.ts
git commit -m "fix(cards): stranger_asks_questions opt 2 -> removeRandomThreat (P14-24)"
```

---

## Task 9: Manual playtest verification

No automated tests exist for this codebase. Run through these scenarios in `npm run dev` and confirm each behaves as specified.

- [ ] **Step 1: Plain option, no deck changes**

Start a run. Draw any common card whose options only change resources (e.g. `local_gossip` opt 1).

Expected: no `OutcomePanel` appears. Effect tags on the option button reflect the change. No timer-based toast hovers above the pile.

- [ ] **Step 2: Insert option**

Draw `follower_confesses_doubt` and pick "Offer tea. Not another word." (opt 2, inserts `loose_end`).

Expected: `OutcomePanel` appears beneath the draw pile with a single "Inserted Loose End" row in green. Clicking the title opens `CardPreviewModal` showing the Loose End card. The panel persists until you click the draw pile to draw the next card.

- [ ] **Step 3: Remove option (target present)**

Construct a scenario where `investigators_file` is in the deck and trigger a removal effect that targets a real card. Easiest: use the new `stranger_asks_questions` opt 2 path (Task 8) after a threat has been inserted.

Expected: `OutcomePanel` shows "Removed [threat title]" in red. Title is clickable.

- [ ] **Step 4: Remove option (target absent)**

Pick `stranger_asks_questions` opt 2 while no threats are in the deck (e.g. early run).

Expected: gold is paid, no `OutcomePanel` row appears, no ghost row. Panel does not render at all unless something else happened.

- [ ] **Step 5: Random outcome**

Draw `loose_end` and pick "Hope for the best" (opt 2, randomOutcome).

Expected: `OutcomePanel` shows the branch's flavour line in italic at the top, and — if the unlucky branch fired — an "Inserted Investigator's File" row below.

- [ ] **Step 6: Reshuffle + doom**

Drain the draw pile until it triggers a reshuffle.

Expected: `DoomPanel` appears beneath the pile with the tier-appropriate message. No `Continue` button. Panel stays visible until next draw. The previous floating modal with the dark backdrop should be gone.

- [ ] **Step 7: Both panels visible together**

Drain to one card left. Pick an option that inserts a card. The next draw both reshuffles and starts a new card.

Expected: After picking, `OutcomePanel` is visible (insert row). After the draw, both panels are cleared and the next card appears with its own resolution flow.

- [ ] **Step 8: Tutorial unchanged**

Start a new tutorial run from the main menu. Walk through the first three cards.

Expected: tutorial gating still works. No regressions in card sequencing. Tutorial cards do not trigger overflow/deficit panels (engine is gated by `isTutorial`).

- [ ] **Step 9: Final commit if any tweaks were needed**

If verification surfaced any small adjustments, commit them now with a clear message. Otherwise skip.

```bash
# only if changes were made
git add <files>
git commit -m "fix(ui): outcome panel polish from manual verification"
```

---

## Self-Review Notes

- **Spec coverage:**
  - Spec §"Two panels beneath the draw pile" → Tasks 5, 6, 7.
  - Spec §"State changes" → Tasks 2, 4.
  - Spec §"Engine changes" → Task 3 (note: implemented in `gameStore.ts`, not `gameLoop.ts`, per plan header).
  - Spec §"UI rendering" → Tasks 5, 6, 7.
  - Spec §"Card-data change" → Task 8.
  - Spec §"Behavior matrix" → Task 9 verification covers each row.
  - Spec §"Risks and edge cases":
    - Ghost rows → Task 3 Step 5 explicitly guards.
    - Overflow/deficit ordering → Task 3 Step 7 implements diff-based capture inside the same loop so the accumulator covers all paths.
    - Stacking order → Task 7 Step 6 enforces DoomPanel-above-OutcomePanel in a flex container.
    - Nested randomOutcome → not currently used in card data; the existing `expandEffectsWithCapture` already flattens one level, so no change required. Flag if encountered.
    - Tutorial → Task 9 Step 8 verifies.

- **Type consistency:** `CardSummary { id, title, tier }` used in Tasks 1, 3, 5. `DeckChanges { inserted, removed }` consistent everywhere. `pendingOutcomeReveal: { flavourText: string } | null` consistent.

- **Placeholder scan:** No TBDs or vague "handle errors" steps. Each task has either exact code or an exact command + expected output.
