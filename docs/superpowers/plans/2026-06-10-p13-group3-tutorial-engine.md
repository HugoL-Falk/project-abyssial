# P13 Group 3 — Tutorial Engine Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the tutorial reshuffle to be fully predetermined (no shuffling, no unravelling card, discard ignored) and remove the unused short/long run-length selector from the setup flow.

**Architecture:** Task 1 adds a pure `tutorialReshuffle()` function to the deck engine. Task 2 wires it into `reshuffleOnly()` behind an `isTutorial` guard. Task 3 removes the `RunConfigScreen` setup step and patches the three navigation callsites that reference it.

**Tech Stack:** TypeScript, React, Zustand (gameStore). No test framework — use `npx tsc --noEmit` for type-safety verification.

**Spec:** `docs/superpowers/specs/2026-06-10-p13-group3-tutorial-engine-design.md`

**Side effect fix:** Task 2 also resolves P13-17 (Threat & Treat tutorial card reappearing after reshuffle). Root cause is the same — normal reshuffle was merging the discard pile back in. `tutorialReshuffle` clears it. No additional work needed for P13-17.

**Worktree:** Create a new worktree `p13/group3-tutorial-engine` before starting.

---

### Task 1: Add `tutorialReshuffle` to deck engine

**Files:**
- Modify: `src/engine/deck.ts` (append after `reshuffle` function, around line 140)

**Context:** The normal `reshuffle()` function at line 103 merges drawPile + discardPile + unravellingCard + nextCycleQueue and shuffles. For tutorials we want none of that — just take the nextCycleQueue contents in their insertion order (pinned first, then unpinned) and that's the new draw pile.

- [ ] **Step 1: Open `src/engine/deck.ts` and append the new function after the closing `}` of `reshuffle()` (around line 140)**

Add exactly this — no changes to surrounding code:

```ts
// ─── Tutorial reshuffle ───────────────────────────────────────────────────────
// Bypasses normal shuffle entirely. Takes nextCycleQueue in insertion order
// (pinned first, then unpinned) as the predetermined draw pile.
// No unravelling card. Discard pile is cleared and discarded permanently.
export function tutorialReshuffle(deck: DeckState): DeckState {
  const pinned   = deck.nextCycleQueue.filter(c => c.pinnedNextCycle)
  const unpinned = deck.nextCycleQueue.filter(c => !c.pinnedNextCycle)
  return {
    ...deck,
    drawPile:       [...pinned, ...unpinned],
    discardPile:    [],
    nextCycleQueue: [],
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd "E:\Project Abyssial\Code\project-abyssial"
npx tsc --noEmit
```

Expected: no errors. `DeckState` and `Card` types are already imported at the top of `deck.ts` — no new imports needed.

- [ ] **Step 3: Commit**

```bash
git add src/engine/deck.ts
git commit -m "feat(engine): add tutorialReshuffle -- predetermined draw pile from nextCycleQueue"
```

---

### Task 2: Wire `tutorialReshuffle` into `reshuffleOnly()`

**Files:**
- Modify: `src/state/gameStore.ts`
  - Import line (~line 26): add `tutorialReshuffle` to existing deck import
  - `reshuffleOnly()` (~line 939): add `isTutorial` early-return branch

**Context:** `reshuffleOnly()` is the Zustand action called when the draw pile empties and the player taps to reshuffle. It currently always runs the full reshuffle pipeline (unravelling card, passive-on-reshuffle, reshuffleToast). For tutorial runs we skip all of that.

- [ ] **Step 1: Add `tutorialReshuffle` to the deck import in `gameStore.ts`**

Find the existing import block (lines 25–30):

```ts
  removeCardFromDeck,
  reshuffle,
  applyPassivesForReshuffle,
  getUnravellingTier,
  buildInitialDeck,
} from '../engine/deck'
```

Change to:

```ts
  removeCardFromDeck,
  reshuffle,
  tutorialReshuffle,
  applyPassivesForReshuffle,
  getUnravellingTier,
  buildInitialDeck,
} from '../engine/deck'
```

- [ ] **Step 2: Add the `isTutorial` branch to `reshuffleOnly()`**

Find `reshuffleOnly()` (lines 939–953). The current function body is:

```ts
reshuffleOnly: () => {
  const state = get()
  if (state.phase !== 'playing') return
  if (state.deck.drawPile.length > 0) return  // Only valid when draw pile empty

  let reshuffleCount = state.reshuffleCount + 1
  const unravellingTier = getUnravellingTier(reshuffleCount, state.runConfig!.runLength)
  const resources = applyPassivesForReshuffle(state.deck, state.resources)
  const unravelCard = getUnravellingCard(
    state.pendingUnravelling ? Math.min(4, unravellingTier + 1) : unravellingTier
  )
  const deck = reshuffle(state.deck, unravelCard)
  set({ deck, resources, reshuffleCount, unravellingTier, pendingUnravelling: false })
  saveRun(get())
},
```

Replace with:

```ts
reshuffleOnly: () => {
  const state = get()
  if (state.phase !== 'playing') return
  if (state.deck.drawPile.length > 0) return  // Only valid when draw pile empty

  // Tutorial: bypass unravelling, passives, and shuffle entirely.
  // nextCycleQueue already contains the predetermined post-reshuffle sequence.
  if (state.runConfig?.isTutorial) {
    const deck = tutorialReshuffle(state.deck)
    set({ deck })
    saveRun(get())
    return
  }

  let reshuffleCount = state.reshuffleCount + 1
  const unravellingTier = getUnravellingTier(reshuffleCount, state.runConfig!.runLength)
  const resources = applyPassivesForReshuffle(state.deck, state.resources)
  const unravelCard = getUnravellingCard(
    state.pendingUnravelling ? Math.min(4, unravellingTier + 1) : unravellingTier
  )
  const deck = reshuffle(state.deck, unravelCard)
  set({ deck, resources, reshuffleCount, unravellingTier, pendingUnravelling: false })
  saveRun(get())
},
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual verification — tutorial reshuffle sequence**

Start the app (`npm run dev`), begin a tutorial run, play through all 5 cards until the draw pile empties, then tap to reshuffle. Verify:

1. No "Doom escalates" / reshuffle toast popup fires
2. The draw pile now shows exactly **4 cards**
3. Draw them in order — the sequence must be:
   - `tutorial_reshuffle_card` ("The Deck Reshuffles") — always first
   - `tutorial_threat_card` ("An Unwanted Arrival") — second
   - `tutorial_treat_card` ("A Fortunate Find") — third
   - `olgreth_2` ("The Hollow Speaks") — always last
4. No tutorial_interface, tutorial_basic_resources, or other played tutorial cards reappear
5. Playing `olgreth_2` triggers the victory screen

- [ ] **Step 5: Commit**

```bash
git add src/state/gameStore.ts
git commit -m "fix(tutorial): use tutorialReshuffle in reshuffleOnly -- predetermined post-reshuffle sequence (P13-15)"
```

---

### Task 3: Remove run-length selector from setup flow

**Files:**
- Modify: `src/components/SetupScreens.tsx`
  - Delete `RunConfigScreen` component (~lines 200–273)
  - `GodPathSelectScreen` forward action (~line 189–191): skip `runConfig` phase
  - `BlessingSelectScreen` back action (~line 363): fix broken back link
- Modify: `src/types/index.ts` line 18: remove `'runConfig'` from `GamePhase`

**Context:** The setup flow is: `godPathSelect` → `runConfig` → `blessingSelect` → game. We are removing the `runConfig` step. New flow: `godPathSelect` → `blessingSelect` → game. Three navigation callsites need updating plus the `GamePhase` type union.

- [ ] **Step 1: Remove `'runConfig'` from the `GamePhase` union in `src/types/index.ts`**

Find lines 14–22:

```ts
export type GamePhase =
  | 'intro'
  | 'menu'
  | 'godPathSelect'
  | 'runConfig'
  | 'blessingSelect'
  | 'playing'
  | 'gameOver'
  | 'victory'
```

Change to:

```ts
export type GamePhase =
  | 'intro'
  | 'menu'
  | 'godPathSelect'
  | 'blessingSelect'
  | 'playing'
  | 'gameOver'
  | 'victory'
```

- [ ] **Step 2: Run `tsc --noEmit` to find all callsites that reference `'runConfig'` phase**

```bash
npx tsc --noEmit
```

Expected: TypeScript will report errors for every place that passes the string literal `'runConfig'` to `goToPhase()` or uses it as a `GamePhase`. These are the exact lines to fix. Note them.

- [ ] **Step 3: Fix `GodPathSelectScreen` forward action in `SetupScreens.tsx`**

Find the forward action (around line 188–191):

```ts
onForward={() => {
  setRunConfig({ godPath: GOD_PATH_ORDER[idx], runLength: runConfig?.runLength ?? 'short' })
  exit('left', () => goToPhase('runConfig'))
}}
```

Change to:

```ts
onForward={() => {
  setRunConfig({ godPath: GOD_PATH_ORDER[idx], runLength: 'short' })
  exit('left', () => goToPhase('blessingSelect'))
}}
```

Two changes: `runLength: 'short'` hardcoded (no longer depends on prior selection), and destination jumps directly to `blessingSelect`.

- [ ] **Step 4: Fix `BlessingSelectScreen` back action in `SetupScreens.tsx`**

Find the back action in `BlessingSelectScreen`'s `NavFooter` (around line 363):

```ts
onBack={() => exit('right', () => goToPhase('runConfig'))}
```

Change to:

```ts
onBack={() => exit('right', () => goToPhase('godPathSelect'))}
```

- [ ] **Step 5: Delete the `RunConfigScreen` component from `SetupScreens.tsx`**

Find and delete the entire `RunConfigScreen` function from its opening `export function RunConfigScreen()` to its closing `}` (approximately lines 200–273). Do not delete any neighbouring components.

After deletion, also check: if there is a line like `import type { RunLength, ... }` at the top of `SetupScreens.tsx`, remove `RunLength` from it if it is no longer used in the file.

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors. If any remain, they are likely callers of `RunConfigScreen` or further `'runConfig'` references — fix them.

- [ ] **Step 7: Verify the `RunConfigScreen` component is not rendered anywhere**

```bash
grep -r "RunConfigScreen\|runConfig" src/
```

Expected: zero results. The main app renderer (`App.tsx` or similar) likely has a branch like `phase === 'runConfig' && <RunConfigScreen />` — remove that branch entirely. TypeScript would have already flagged the `'runConfig'` string literal in step 6, but the grep confirms all usages are gone.

- [ ] **Step 8: Manual verification — setup flow**

Start the app, tap a god, tap "Choose →". Verify:

1. Goes directly to blessings screen (no run-length selector screen appears)
2. Back button on blessings screen returns to god path select
3. "Begin Run" starts a run using short format (commons ~3–4, 1 rare)

- [ ] **Step 9: Commit**

```bash
git add src/types/index.ts src/components/SetupScreens.tsx
git commit -m "feat(setup): remove run-length selector -- always short run (P13-16)"
```
