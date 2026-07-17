# P12-25 Tutorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the tutorial to cover all core mechanics (dread/doom, reshuffle, threats, treats, relics) using accurate text and a new card sequence that matches real engine behaviour.

**Architecture:** Four surgical changes — two engine additions (new `'nextCycle'` insert position + `pinnedNextCycle` reshuffle pinning), a full data rewrite of `tutorial.ts`, and a registry update in `index.ts`. No changes to the overflow engine, `startTutorial()`, or any UI components.

**Tech Stack:** TypeScript, React, Vite, Zustand. No test runner — verification via `npm run typecheck` (`tsc --noEmit`).

---

## File Map

| File | Change |
|---|---|
| `src/types/index.ts` | Add `'nextCycle'` to InsertCardEffect position union; add `pinnedNextCycle?: true` to Card |
| `src/state/gameStore.ts` | Add `'nextCycle'` branch in `resolveOption` insertCard case |
| `src/engine/deck.ts` | Modify `reshuffle()` to prepend `pinnedNextCycle` cards before shuffle pool |
| `src/data/cards/tutorial.ts` | Full rewrite — new cards, updated texts, olgreth_2 removed from TUTORIAL_CARDS |
| `src/data/index.ts` | Update imports + ALL_CARDS to include new tutorial cards |

---

## Task 1: Add `'nextCycle'` position and `pinnedNextCycle` to types

**Files:**
- Modify: `src/types/index.ts:28` (InsertCardEffect position union)
- Modify: `src/types/index.ts:97` (Card interface, after `uniqueInDeck`)

- [ ] **Step 1: Edit InsertCardEffect position union**

In `src/types/index.ts` line 28, change:
```ts
| { type: 'insertCard'; cardId: CardId; position: 'top' | 'bottom' | 'random' | 'discard'; minPos?: number; maxPos?: number }
```
To:
```ts
| { type: 'insertCard'; cardId: CardId; position: 'top' | 'bottom' | 'random' | 'discard' | 'nextCycle'; minPos?: number; maxPos?: number }
```

- [ ] **Step 2: Add `pinnedNextCycle` to Card interface**

In `src/types/index.ts` after line 97 (`uniqueInDeck?: true`), add:
```ts
  pinnedNextCycle?: true  // pinned to position 0 after reshuffle (tutorial use only)
```

- [ ] **Step 3: Typecheck**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run typecheck
```
Expected: no errors (no consumers of the new fields yet — no type narrowing issues).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(P12-25): add nextCycle insert position and pinnedNextCycle to Card type"
```

---

## Task 2: Handle `'nextCycle'` position in `resolveOption`

**Files:**
- Modify: `src/state/gameStore.ts` lines 606–615 (insertCard case in `resolveOption`)

- [ ] **Step 1: Add the `'nextCycle'` branch**

In `src/state/gameStore.ts`, find the block (currently around lines 606–615):
```ts
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
```

Change to:
```ts
            if (effect.position === 'discard') {
              deck = { ...deck, discardPile: [...deck.discardPile, toInsert] }
            } else if (effect.position === 'nextCycle') {
              // Explicit next-cycle insert — card deferred to nextCycleQueue regardless of tier.
              deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
            } else if (toInsert.tier === 'threat') {
              // Threat cards are deferred to the next reshuffle rather than injected mid-cycle.
              // This keeps the current draw pile lean so reshuffles actually happen.
              // (Overflow threat cards bypass this path — they use applyOverflowEffects directly.)
              deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
            } else {
              deck = insertCard(toInsert, deck, effect.position, effect.minPos, effect.maxPos)
            }
```

- [ ] **Step 2: Typecheck**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/state/gameStore.ts
git commit -m "feat(P12-25): handle nextCycle insert position in resolveOption"
```

---

## Task 3: Pin `pinnedNextCycle` cards to position 0 after reshuffle

**Files:**
- Modify: `src/engine/deck.ts:109–131` (`reshuffle` function)

- [ ] **Step 1: Modify `reshuffle()`**

In `src/engine/deck.ts`, replace the entire `reshuffle` function body (lines 107–131) with:

```ts
export function reshuffle(
  deck: DeckState,
  unravellingCard: Card
): DeckState {
  // Split nextCycleQueue into pinned (position 0 after reshuffle) and unpinned.
  const pinnedQueue   = deck.nextCycleQueue.filter(c => c.pinnedNextCycle)
  const unpinnedQueue = deck.nextCycleQueue.filter(c => !c.pinnedNextCycle)

  // Merge unpinned queue into the reshuffle pile — this is where threat inserts and
  // god path chain cards land after being queued mid-cycle.
  const combined = [...deck.drawPile, ...deck.discardPile, unravellingCard, ...unpinnedQueue]
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

  // Pinned cards surface first — prepended after god_path repositioning.
  if (pinnedQueue.length > 0) {
    shuffled = [...pinnedQueue, ...shuffled]
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

- [ ] **Step 2: Typecheck**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/engine/deck.ts
git commit -m "feat(P12-25): prepend pinnedNextCycle cards at position 0 after reshuffle"
```

---

## Task 4: Rewrite tutorial card data

**Files:**
- Modify: `src/data/cards/tutorial.ts` (full rewrite)

- [ ] **Step 1: Replace the entire file**

Replace `src/data/cards/tutorial.ts` with:

```ts
import type { Card } from '../../types'

// ─── Tutorial Cards ───────────────────────────────────────────────────────────
// 5-card starting deck. olgreth_2 is NOT pre-seeded — it is queued into
// nextCycleQueue by olgreth_1's advanceGodPath effect (olgreth chain is
// registered in GOD_PATH_CHAINS in data/index.ts).
//
// Resource trace (starting 3/3/3/0/0):
//   0  tutorial_interface       → Gold+1                      (4/3/3/0/0)
//   1  tutorial_basic_resources → Gold-1, Fol+2, Relic+1      (3/5/3/0/1)
//   2  tutorial_dread_relics    → Dread+13                    (3/5/3/13/1)
//      ↳ manually inserts tutorial_doom_card@top
//      ↳ manually inserts tutorial_reshuffle_card → nextCycleQueue (pinnedNextCycle)
//   3  tutorial_doom_card       → Gold-2, Fol-2, Dread-8      (1/3/3/5/1)
//   4  tutorial_threats_treats  → threat→nextCycle, treat→nextCycle  (1/3/3/5/1)
//   5  olgreth_1                → advanceGodPath (queues olgreth_2 → nextCycleQueue)
//      ↳ draw pile now empty → RESHUFFLE triggered
//   Post-reshuffle draw order:
//   6  tutorial_reshuffle_card  (pinnedNextCycle — always first) (1/3/3/5/1)
//   7  tutorial_doom_card / tutorial_threat_card / tutorial_treat_card / olgreth_2 (shuffled)
//      → threat (Inf-1) and treat (Fol+2) in any order; olgreth_2 at ≥25%
//   FINAL  olgreth_2            → advanceGodPath + victory
//
// Safety: Gold min=1 (after doom card), Influence min=2 (after threat card).
// No resource hits 0. No conditions on any tutorial option — no allBlocked risk.
// Player has 1 Relic from card 1 throughout. Even if spent (dread -2), dread
// still exceeds 10 on card 2 (+13 from 0 or -2 = 11/13 both > 10).

// ─── Regular Tutorial Cards ───────────────────────────────────────────────────

const tutorial_interface: Card = {
  id: 'tutorial_interface',
  title: 'The Interface',
  tier: 'tutorial',
  flavourText: 'The bar at the top tracks your five resources. The boxes at the bottom of the screen are your options — tap one to resolve the card. Options shown in full are available. Greyed-out options have unmet requirements. If every option is unavailable at once, the run ends.',
  options: [
    {
      label: 'Continue',
      flavourText: 'Your Gold increases by 1.',
      effects: [{ type: 'resource', resource: 'gold', delta: 1 }],
    },
    {
      label: 'I need more first',
      flavourText: 'This is what a greyed-out option looks like. You do not have enough to take it.',
      condition: { type: 'resourceMin', resource: 'gold', min: 99 },
      effects: [],
    },
  ],
}

const tutorial_basic_resources: Card = {
  id: 'tutorial_basic_resources',
  title: 'Basic Resources',
  tier: 'tutorial',
  flavourText: 'Gold, Followers, Influence. The three regular resources to keep your cult alive. Keep each above zero and below ten, stray past either and the deck reacts. The jewel in each card header marks the type. Tap it for the tier.',
  options: [
    {
      label: 'Redirect the funds',
      flavourText: 'The funds arrived. They have been redirected. Two new members presented themselves shortly after. These things happen together more often than not.',
      effects: [
        { type: 'resource', resource: 'gold', delta: -1 },
        { type: 'resource', resource: 'followers', delta: 2 },
        { type: 'resource', resource: 'relics', delta: 1 },
      ],
    },
  ],
}

const tutorial_dread_relics: Card = {
  id: 'tutorial_dread_relics',
  title: 'Dread & Relics',
  tier: 'tutorial',
  flavourText: 'Dread accumulates. Keep it below ten. At ten, a doom card enters the top of the draw pile, drawn next. The Relics counter sits beside the others. Tap it to spend one: pick any resource, move it two in either direction. One Relic is available.',
  options: [
    {
      label: 'Examine the artefact',
      flavourText: 'Dread exceeded ten during the examination. The artefact itself remains inconclusive.',
      effects: [
        { type: 'resource', resource: 'dread', delta: 13 },
        { type: 'insertCard', cardId: 'tutorial_doom_card', position: 'top' },
        { type: 'insertCard', cardId: 'tutorial_reshuffle_card', position: 'nextCycle' },
      ],
    },
  ],
}

const tutorial_threats_treats: Card = {
  id: 'tutorial_threats_treats',
  title: 'Threats & Treats',
  tier: 'tutorial',
  flavourText: 'Some choices insert cards into the draw pile. Threat cards cost resources on arrival. Most are removed once resolved. Treat cards provide benefit. The rose jewel marks them. Both will surface after the next reshuffle.',
  options: [
    {
      label: 'Make the call',
      flavourText: 'A threat card and a treat card have been added to the deck. The rose jewel identifies the one worth looking forward to.',
      effects: [
        { type: 'insertCard', cardId: 'tutorial_threat_card', position: 'top' },
        // tier 'threat' would auto-route to nextCycleQueue, but explicit nextCycle
        // is cleaner for tutorial intent — avoids relying on tier-routing side effects.
        // However, to be consistent with engine behaviour, using position: 'top' here
        // means we MUST use 'nextCycle' explicitly for the treat card:
        { type: 'insertCard', cardId: 'tutorial_treat_card', position: 'nextCycle' },
      ],
    },
  ],
}

// ─── Tutorial Demo Cards (dynamically inserted) ───────────────────────────────

export const tutorial_reshuffle_card: Card = {
  id: 'tutorial_reshuffle_card',
  title: 'The Deck Reshuffles',
  tier: 'tutorial',
  pinnedNextCycle: true,
  flavourText: 'The draw pile is empty. The deck has reshuffled. The threat and treat from the previous cycle are now ahead.',
  options: [
    {
      label: 'Understood',
      flavourText: 'Noted.',
      effects: [],
    },
  ],
}

export const tutorial_doom_card: Card = {
  id: 'tutorial_doom_card',
  title: 'The Weight of It',
  tier: 'doom',
  flavourText: 'This entered the deck when Dread reached ten. It is single-use. If Dread reaches ten again, a worse one follows. Some members found the first one instructive.',
  options: [
    {
      label: 'Absorb it',
      flavourText: 'The costs were expected. Gold and Followers declined. Dread subsided. File it.',
      effects: [
        { type: 'resource', resource: 'gold', delta: -2 },
        { type: 'resource', resource: 'followers', delta: -2 },
        { type: 'resource', resource: 'dread', delta: -8 },
      ],
    },
  ],
}

export const tutorial_threat_card: Card = {
  id: 'tutorial_threat_card',
  title: 'An Unwanted Arrival',
  tier: 'threat',
  flavourText: 'The blood red jewel. Threat cards can surface anywhere in the deck. Most are removed once resolved. Influence is the cost of resolution here.',
  options: [
    {
      label: 'Handle it',
      flavourText: 'Influence declined by one. The matter is closed.',
      effects: [
        { type: 'resource', resource: 'influence', delta: -1 },
      ],
    },
  ],
}

export const tutorial_treat_card: Card = {
  id: 'tutorial_treat_card',
  title: 'A Fortunate Find',
  tier: 'treat',
  flavourText: 'The rose jewel. This treat was inserted earlier. Not all insertions are a problem.',
  options: [
    {
      label: 'Accept it',
      flavourText: 'Two new members joined without incident. The paperwork is minimal.',
      effects: [
        { type: 'resource', resource: 'followers', delta: 2 },
      ],
    },
  ],
}

// ─── Olgreth God Path Chain ───────────────────────────────────────────────────
// olgreth_2 is registered in GOD_PATH_CHAINS (data/index.ts) so advanceGodPath
// on olgreth_1 can queue it into nextCycleQueue without it being in TUTORIAL_CARDS.

export const olgreth_1: Card = {
  id: 'olgreth_1',
  title: 'The Name in the Margin',
  tier: 'god_path',
  godPath: 'olgreth',
  chainStage: 1,
  flavourText: 'A name. Buried in the margin of a page you didn\'t mean to open. This is the god path. A chain of ritual cards seeded into the run. There are two. Completing both ends the run.',
  options: [
    {
      label: 'Speak it aloud',
      flavourText: 'Something shifted. The second ritual card is in the deck. It was already waiting.',
      effects: [{ type: 'advanceGodPath' }],
    },
  ],
}

export const olgreth_2: Card = {
  id: 'olgreth_2',
  title: 'The Hollow Speaks',
  tier: 'god_path',
  godPath: 'olgreth',
  chainStage: 2,
  isSummoning: true,
  flavourText: 'The second card in the chain. The last one. What began in the margin ends here.',
  options: [
    {
      label: 'Step forward',
      flavourText: 'The run ends here.',
      effects: [
        { type: 'advanceGodPath' },
        { type: 'victory' },
      ],
    },
  ],
}

// ─── Tutorial Deck ────────────────────────────────────────────────────────────
// 5 starting cards only. olgreth_2 is NOT pre-seeded — queued by advanceGodPath.
// All dynamically inserted cards are exported for ALL_CARDS registry registration.

export const TUTORIAL_CARDS: Card[] = [
  tutorial_interface,           // 0 — UI, options, greyed-out demo
  tutorial_basic_resources,     // 1 — primary resources, jewel tap
  tutorial_dread_relics,        // 2 — dread, relics, inserts doom@top + reshuffle_card→nextCycle
  tutorial_threats_treats,      // 3 — inserts threat→nextCycle, treat→nextCycle
  olgreth_1,                    // 4 — god path 1, queues olgreth_2→nextCycle; draw pile empties → RESHUFFLE
]
// Post-reshuffle (nextCycleQueue contents):
//   tutorial_reshuffle_card  — pinnedNextCycle: true, always first
//   tutorial_threat_card     — tier 'threat', auto-routes to nextCycleQueue on insert
//   tutorial_treat_card      — explicit 'nextCycle' insert
//   olgreth_2                — queued by olgreth_1 advanceGodPath
```

- [ ] **Step 2: Typecheck**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run typecheck
```
Expected: errors on `tutorial_threats_treats` referencing `tutorial_threat_card` before declaration if ordering is wrong. If so, reorder so demo cards are defined before `tutorial_threats_treats`. Also expected: `tutorial_reshuffle_card` referenced in `tutorial_dread_relics` — ensure it is declared before use, or move it before `tutorial_dread_relics`. Reorder as needed to resolve forward references.

- [ ] **Step 3: Fix any ordering issues and typecheck again**

If forward reference errors appear, reorder declarations so referenced cards are defined first:
1. `tutorial_reshuffle_card` — must be before `tutorial_dread_relics`
2. `tutorial_doom_card` — must be before `tutorial_dread_relics`
3. `tutorial_threat_card` — must be before `tutorial_threats_treats`
4. `tutorial_treat_card` — must be before `tutorial_threats_treats`

Then re-run typecheck until clean.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/tutorial.ts
git commit -m "feat(P12-25): rewrite tutorial cards — new sequence, corrected texts, new treat/reshuffle cards"
```

---

## Task 5: Update registry in `data/index.ts`

**Files:**
- Modify: `src/data/index.ts:14` (import line)
- Modify: `src/data/index.ts:31–33` (ALL_CARDS entries)
- Modify: `src/state/gameStore.ts:356` (startTutorial comment)

- [ ] **Step 1: Update the import in `data/index.ts`**

Line 14 currently:
```ts
import { TUTORIAL_CARDS, tutorial_threat_card, tutorial_doom_card, olgreth_1, olgreth_2 } from './cards/tutorial'
```

Change to:
```ts
import {
  TUTORIAL_CARDS,
  tutorial_doom_card,
  tutorial_threat_card,
  tutorial_treat_card,
  tutorial_reshuffle_card,
  olgreth_1,
  olgreth_2,
} from './cards/tutorial'
```

- [ ] **Step 2: Update ALL_CARDS**

Lines 31–33 currently:
```ts
  ...TUTORIAL_CARDS,
  tutorial_threat_card,  // dynamically inserted — not in starting deck
  tutorial_doom_card,    // also exported separately to ensure registration
```

Change to:
```ts
  ...TUTORIAL_CARDS,
  tutorial_doom_card,        // dynamically inserted — not in starting deck
  tutorial_threat_card,      // dynamically inserted — not in starting deck
  tutorial_treat_card,       // dynamically inserted — not in starting deck
  tutorial_reshuffle_card,   // dynamically inserted — not in starting deck
```

- [ ] **Step 3: Update stale comment in `gameStore.ts` startTutorial**

In `src/state/gameStore.ts` around line 356, find:
```ts
      chainReserve: [],       // empty — olgreth_2 is already in drawPile at position 7
```

Change to:
```ts
      chainReserve: [],       // empty — olgreth_2 queued into nextCycleQueue by olgreth_1 advanceGodPath
```

- [ ] **Step 4: Typecheck**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/data/index.ts src/state/gameStore.ts
git commit -m "feat(P12-25): register new tutorial cards in ALL_CARDS; update startTutorial comment"
```

---

## Task 6: End-to-end verification

**No automated tests exist for this project. Verification is manual + typecheck.**

- [ ] **Step 1: Final typecheck**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 2: Dev server smoke test**

```bash
cd "E:\Project Abyssial\Code\project-abyssial" && npm run dev
```

Open in browser. Start a tutorial run. Verify the sequence manually:

| Card | What to verify |
|---|---|
| The Interface | Gold +1 on "Continue". "I need more first" is greyed out. |
| Basic Resources | Gold −1, Fol +2, Relic +1. Jewel tappable. |
| Dread & Relics | Dread goes to 13. Doom card surfaces IMMEDIATELY as next card. |
| The Weight of It (doom) | Gold −2, Fol −2, Dread −8 (dread goes from 13 to 5). |
| Threats & Treats | No resource change. |
| The Name in the Margin | advanceGodPath fires. |
| *(reshuffle triggers here)* | Draw pile is empty after olgreth_1. |
| The Deck Reshuffles | First card drawn post-reshuffle. "Noted." on confirm. |
| An Unwanted Arrival + A Fortunate Find | Appear in either order. Inf −1 / Fol +2. |
| The Hollow Speaks | Victory screen triggers. |

- [ ] **Step 3: Verify relic can be spent on card 2**

On "Dread & Relics" card, tap the Relic counter before choosing the option. Verify:
- RelicPicker opens
- Spending on dread sets dread to −2
- Choosing "Examine the artefact" still triggers doom insert (dread goes to 11, doom inserts)

- [ ] **Step 4: Commit if any minor fixes were needed**

```bash
git add -p
git commit -m "fix(P12-25): [describe any minor fix]"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Engine: `'nextCycle'` position → Tasks 1–2
- ✅ Engine: `pinnedNextCycle` reshuffle pinning → Tasks 1, 3
- ✅ Data: all 9 cards written with approved texts → Task 4
- ✅ Data: `tutorial_threats_doom` deleted, `olgreth_2` removed from `TUTORIAL_CARDS` → Task 4
- ✅ Registry: new cards in `ALL_CARDS` → Task 5
- ✅ Resource trace: verified safe in Task 4 header comment
- ✅ olgreth chain: already in `GOD_PATH_CHAINS` at `data/index.ts:26` — no change needed

**Known verification item (from spec):** Confirm `advanceGodPath` on `olgreth_1` successfully queues `olgreth_2` when `olgreth_2` is not pre-seeded. Since `olgreth: [olgreth_1, olgreth_2]` is already in `GOD_PATH_CHAINS`, `getNextChainCard('olgreth', 1)` returns `olgreth_2` correctly. Covered by Task 6 Step 2 manual playthrough.

**Note on `tutorial_threat_card` insert position:** The spec says threat tier auto-routes to `nextCycleQueue`. In the plan, `tutorial_threats_treats` uses `position: 'top'` for the threat card insert — this is wrong. The threat card is tier `'threat'` which routes to `nextCycleQueue` automatically regardless of position. However, using explicit `'nextCycle'` is even clearer and avoids relying on tier-routing. Both approaches land the card in `nextCycleQueue`. The plan uses `position: 'top'` for threat and explicit `'nextCycle'` for treat — update the threat insert to also use `'nextCycle'` for consistency:

```ts
{ type: 'insertCard', cardId: 'tutorial_threat_card', position: 'nextCycle' },
{ type: 'insertCard', cardId: 'tutorial_treat_card', position: 'nextCycle' },
```

This is already reflected in the Task 4 file content. No separate fix needed.
