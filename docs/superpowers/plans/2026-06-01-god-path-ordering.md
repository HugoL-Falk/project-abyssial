# God Path Ordering Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the one-chain-card-per-cycle invariant so god path cards always appear in stage order, with no two chain cards ever active in the draw pile simultaneously.

**Architecture:** Three targeted engine changes — an invariant guard in `advanceGodPathChain`, a multi-card repositioning fix in `reshuffle`, and an edge-case cap for god path reinsertion into a short/empty draw pile. No structural state model change. No test framework exists; verification is `npm run typecheck` + `npm run build` + manual game steps.

**Tech Stack:** TypeScript, Zustand, Vite — `src/engine/godPath.ts`, `src/engine/deck.ts`, `src/state/gameStore.ts`

---

## File Map

| File | Change |
|---|---|
| `src/engine/godPath.ts` | Add `countActiveChainCards` helper; add invariant guard at top of `advanceGodPathChain` |
| `src/engine/deck.ts` | Change `const shuffled` → `let shuffled`; replace single-card reposition with multi-card extract+reinsert |
| `src/state/gameStore.ts` | Add god path short-pile branch inside the existing `case 'insertCard'` block |

---

## Task 1: Data Audit — confirm no accidental `advanceGodPath` in yha_nthlei_4 or terms_remain

**Files:**
- Read: `src/data/godPaths/yha_nthlei.ts` lines 148–191
- Read: `src/data/cards/threats.ts` lines 285–308

> This task is pre-audited: both cards are already clean. The steps below lock in that finding so it is on record and doesn't need to be re-investigated.

- [ ] **Step 1: Check yha_nthlei_4 options**

  Open `src/data/godPaths/yha_nthlei.ts` and read lines 158–190 (the `options` array of `yha_nthlei_4`).

  Expected: three options —
  - index 0 (`Accept the terms`): has `{ type: 'advanceGodPath' }` ✓ correct
  - index 1 (`Request more time`): has `{ type: 'insertCard', cardId: 'yha_nthlei_4', ... }`, NO `advanceGodPath` ✓ correct
  - index 2 (`Refuse`): has `{ type: 'insertCard', cardId: 'terms_remain', ... }`, NO `advanceGodPath` ✓ correct

  If any option other than index 0 has `{ type: 'advanceGodPath' }`, remove it and proceed to Step 3. Otherwise continue.

- [ ] **Step 2: Check terms_remain options**

  Open `src/data/cards/threats.ts` and read lines 285–308 (the `terms_remain` card).

  Expected: two options —
  - `Open it`: effects are `resource dread +1`, `insertCard yha_nthlei_4`, `removeCard terms_remain` — NO `advanceGodPath` ✓ correct
  - `Leave it unopened`: effects are `resource dread +2` only — NO `advanceGodPath` ✓ correct

  If either option has `{ type: 'advanceGodPath' }`, remove it and proceed to Step 3. Otherwise continue.

- [ ] **Step 3: Commit audit finding**

  ```bash
  git commit --allow-empty -m "audit: god path data clean — no accidental advanceGodPath in yha_nthlei_4 or terms_remain"
  ```

  (Empty commit is intentional — records the audit on record. Skip if you made actual data changes in Steps 1–2, and commit those files instead.)

---

## Task 2: Invariant guard in `advanceGodPathChain`

**Files:**
- Modify: `src/engine/godPath.ts` lines 36–57

The problem: `advanceGodPathChain` queues the next stage card without checking whether a chain card is already floating in the active deck. If one is, both cards end up active simultaneously, breaking stage ordering.

The fix: add `countActiveChainCards` and check it before queuing.

- [ ] **Step 1: Replace `advanceGodPathChain` in `src/engine/godPath.ts`**

  The current function occupies lines 36–57. Replace the entire block — from the `export function advanceGodPathChain` line through its closing `}` — with the following:

  ```typescript
  function countActiveChainCards(deck: DeckState): number {
    return [
      ...deck.drawPile,
      ...deck.discardPile,
      ...deck.nextCycleQueue,
    ].filter(c => c.tier === 'god_path').length
  }

  export function advanceGodPathChain(
    newProgress: number,
    currentGodPath: GodPath,
    deck: DeckState
  ): DeckState {
    if (newProgress >= 6) return deck

    // Invariant: refuse to queue next card if any chain card is already active.
    // This prevents two chain cards from entering the active deck simultaneously.
    const active = countActiveChainCards(deck)
    if (active > 0) {
      console.warn(
        `[GodPath] Invariant violation: ${active} chain card(s) already active — refusing to queue stage ${newProgress + 1}`
      )
      return deck
    }

    const nextStage = newProgress + 1
    const idx = deck.chainReserve.findIndex(
      c => c.godPath === currentGodPath && c.chainStage === nextStage
    )
    if (idx === -1) return deck
    const card = deck.chainReserve[idx]

    // Queue the next chain card for the next reshuffle.
    return {
      ...deck,
      nextCycleQueue: [...deck.nextCycleQueue, card],
      chainReserve: deck.chainReserve.filter((_, i) => i !== idx),
    }
  }
  ```

  The rest of `godPath.ts` (the `checkCondition` function, lines 59–102) is unchanged.

- [ ] **Step 2: Typecheck**

  ```
  npm run typecheck
  ```

  Expected: no errors. If TypeScript complains about `c.tier === 'god_path'` — confirm that `Card.tier` includes `'god_path'` as a valid literal in `src/types/index.ts`. It does — no change needed.

- [ ] **Step 3: Commit**

  ```bash
  git add src/engine/godPath.ts
  git commit -m "fix(engine): add invariant guard to advanceGodPathChain — refuses to queue next chain card if one is already active"
  ```

---

## Task 3: Reshuffle repositions all god path cards

**Files:**
- Modify: `src/engine/deck.ts` lines 103–128

The problem: `reshuffle` does a single `findIndex` and repositions only the first god path card it finds. If two god path cards end up in the pool (before the Task 2 guard was in place, or in edge cases), the second floats at a random position and can appear before the first.

The fix: extract ALL god path cards from the shuffled array, then reinsert them together at `minGpPos`.

- [ ] **Step 1: Replace the `reshuffle` function in `src/engine/deck.ts`**

  The current function occupies lines 103–128. Replace the entire block with:

  ```typescript
  export function reshuffle(
    deck: DeckState,
    unravellingCard: Card
  ): DeckState {
    // Merge deferred queue into the reshuffle pile — this is where threat inserts and
    // god path chain cards land after being queued mid-cycle.
    const combined = [...deck.drawPile, ...deck.discardPile, unravellingCard, ...deck.nextCycleQueue]
    let shuffled = shuffleArray(combined)

    // Reposition ALL god path chain cards to at least 25% into the new cycle.
    // After the invariant guard (advanceGodPathChain) there should be at most one,
    // but this handles multiple gracefully regardless.
    const minGpPos = Math.max(5, Math.floor(shuffled.length / 4))
    const gpCards  = shuffled.filter(c => c.tier === 'god_path')
    const rest     = shuffled.filter(c => c.tier !== 'god_path')
    if (gpCards.length > 0) {
      const insertAt = Math.min(minGpPos, rest.length)
      rest.splice(insertAt, 0, ...gpCards)
      shuffled = rest
    }

    return {
      drawPile:        shuffled,
      discardPile:     [],
      permDiscardPile: deck.permDiscardPile,
      chainReserve:    deck.chainReserve,
      nextCycleQueue:  [],   // cleared — all queued cards are now in the shuffled pile
    }
  }
  ```

  Key difference from old code: `const shuffled` → `let shuffled` (needed for the reassignment `shuffled = rest`), and the single-card `findIndex/splice` block replaced by the extract-and-reinsert pattern.

- [ ] **Step 2: Typecheck**

  ```
  npm run typecheck
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/engine/deck.ts
  git commit -m "fix(engine): reshuffle now repositions all god path cards, not just the first"
  ```

---

## Task 4: Edge-case cap — god path reinsertion into a short/empty draw pile

**Files:**
- Modify: `src/state/gameStore.ts` — the `case 'insertCard'` block (currently lines 503–528)

The problem: a god path card's non-advance option tries to reinsert itself at e.g. `minPos: 4, maxPos: 6`. The existing `insertCard` engine function has internal clamping, but when the draw pile is completely empty, the card needs to carry over to the next cycle via `nextCycleQueue` — it can't be inserted into an empty pile.

The fix: add a dedicated branch for `tier === 'god_path' && position === 'random'` that handles the empty-pile case explicitly, and caps min/max positions when the pile is shorter than the card's preferred delay.

- [ ] **Step 1: Add the god path branch inside `case 'insertCard'`**

  Locate `case 'insertCard':` in `src/state/gameStore.ts` (around line 503). The current block looks like this:

  ```typescript
  case 'insertCard': {
    const toInsert = getCardById(effect.cardId)
    if (toInsert) {
      // Enforce uniqueInDeck: skip if a copy already exists anywhere in the deck
      if (toInsert.uniqueInDeck) {
        const alreadyInDeck = [
          ...deck.drawPile,
          ...deck.discardPile,
          ...deck.nextCycleQueue,
        ].some(c => c.id === toInsert.id)
        if (alreadyInDeck) break
      }

      if (effect.position === 'discard') {
        deck = { ...deck, discardPile: [...deck.discardPile, toInsert] }
      } else if (toInsert.tier === 'threat') {
        // Threat cards are deferred to the next reshuffle rather than injected mid-cycle.
        // This keeps the current draw pile lean so reshuffles actually happen.
        // (Overflow threat cards bypass this path — they use applyOverflowEffects directly.)
        deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
      } else {
        deck = insertCard(toInsert, deck, effect.position, effect.minPos, effect.maxPos)
      }
    }
    break
  }
  ```

  Replace it with:

  ```typescript
  case 'insertCard': {
    const toInsert = getCardById(effect.cardId)
    if (toInsert) {
      // Enforce uniqueInDeck: skip if a copy already exists anywhere in the deck
      if (toInsert.uniqueInDeck) {
        const alreadyInDeck = [
          ...deck.drawPile,
          ...deck.discardPile,
          ...deck.nextCycleQueue,
        ].some(c => c.id === toInsert.id)
        if (alreadyInDeck) break
      }

      // Edge-case: god path chain card delay into a short or empty draw pile.
      // getCardById returns a fresh card definition — no duplicate with the drawn instance,
      // which is separately routed to permDiscardPile after resolveOption completes.
      if (toInsert.tier === 'god_path' && effect.position === 'random') {
        const remaining = deck.drawPile.length
        if (remaining === 0) {
          // Pile empty — carry into next cycle. Reshuffle will reposition to 25%+.
          deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
        } else {
          const effMin = Math.min(effect.minPos ?? 0, remaining - 1)
          const effMax = Math.min(effect.maxPos ?? remaining - 1, remaining - 1)
          deck = insertCard(toInsert, deck, 'random', effMin, effMax)
        }
        break
      }

      if (effect.position === 'discard') {
        deck = { ...deck, discardPile: [...deck.discardPile, toInsert] }
      } else if (toInsert.tier === 'threat') {
        // Threat cards are deferred to the next reshuffle rather than injected mid-cycle.
        // This keeps the current draw pile lean so reshuffles actually happen.
        // (Overflow threat cards bypass this path — they use applyOverflowEffects directly.)
        deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
      } else {
        deck = insertCard(toInsert, deck, effect.position, effect.minPos, effect.maxPos)
      }
    }
    break
  }
  ```

- [ ] **Step 2: Typecheck**

  ```
  npm run typecheck
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/state/gameStore.ts
  git commit -m "fix(engine): cap god path delay reinsertion when draw pile is short or empty"
  ```

---

## Task 5: Final build check and manual verification

**Files:** none — verification only

- [ ] **Step 1: Full build**

  ```
  npm run build
  ```

  Expected: exits with code 0, no TypeScript or Vite errors.

- [ ] **Step 2: Start dev server**

  ```
  npm run dev
  ```

  Open the game in browser.

- [ ] **Step 3: Manual smoke test — stage ordering**

  Start a Y'ha-nthlei run (standard length).

  Verify the following sequence:
  1. Card 1/6 (The Refinery Smells Wrong) appears at roughly 35–75% into the first draw pile — never as the first card drawn.
  2. Pick the advance option ("Look into it"). Draw through remaining cards — card 2/6 (The Fishmonger's Tiara) should appear somewhere after the 25% mark of the **next** draw pile (i.e. not before the first few draws of cycle 2).
  3. On The Fishmonger's Tiara, pick "Send someone to return it" (non-advance). Verify: the card reappears within the same draw pile (roughly 4–6 draws later), NOT that card 3/6 appears instead.
  4. When Tiara reappears, pick "Take it" (advance). Verify: card 3/6 (The Innsmouth Look) appears in the NEXT reshuffle, not in the current cycle alongside Tiara.
  5. Open browser devtools console. Verify NO `[GodPath] Invariant violation` warnings appear during normal play.

- [ ] **Step 4: Manual smoke test — Oath of Dagon**

  Play into cycle 4+ on the Y'ha-nthlei path.

  When card 4/6 (The Oath of Dagon) appears:
  1. Pick "Refuse" (option 3). Verify: `terms_remain` appears later (5–7 draws), NOT card 5/6 (Devil's Reef).
  2. Draw `terms_remain`. Pick "Leave it unopened". Verify: neither card 4 nor card 5 appears immediately.
  3. Draw `terms_remain` again on the next cycle (it stays in discard). Pick "Open it". Verify: card 4/6 is reinserted 2–4 draws out — card 5/6 does NOT appear until card 4 is advanced.

- [ ] **Step 5: Manual smoke test — short pile edge case**

  This is hard to trigger naturally. To test it: in a dev session, temporarily change `yha_nthlei_4` option 1 ("Request more time") to `minPos: 999, maxPos: 999` in `src/data/godPaths/yha_nthlei.ts`. Start a run, advance to card 4, pick "Request more time" when only 0–2 cards remain in the draw pile.

  Expected: the card appears in the NEXT reshuffle (carried via `nextCycleQueue`), not as the last card of the current pile AND as the first card of the next pile simultaneously.

  Revert the `999` change after testing.

- [ ] **Step 6: Commit final state**

  If no issues found in Steps 3–5:

  ```bash
  git add -p   # confirm no stray debug changes
  git commit --allow-empty -m "verify: god path ordering fix smoke tested — P9-32, P10-18 resolved"
  ```
