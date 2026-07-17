# Design Spec — P12-25: Tutorial Redesign

**Date:** 2026-06-10
**Status:** Approved
**Backlog item:** P12-25

---

## Problem

The tutorial was written before several major engine changes and does not accurately represent the game. Known issues going into this redesign:

- Jewel colours and tap interaction not described
- Threat insertion framing implied threats only came from player choices (overflow and deficit also insert cards)
- Doom card text claimed escalation happened every reshuffle (wrong — escalation happens when dread hits 10 again)
- Treat cards never introduced
- Reshuffle mechanics never explained
- Old `tutorial_threats_doom` card did dread +6 with `pendingUnravelling` suppression — a design fiction not matching real engine behaviour
- "mid-deck" threat arrival description was inaccurate

---

## New Tutorial Sequence

Starting state: G=3, F=3, I=3, Dr=0, R=0

| Slot | Card | Key effects | State after (G/F/I/Dr/R) |
|---|---|---|---|
| 0 | tutorial_interface | Gold +1 | 4/3/3/0/0 |
| 1 | tutorial_basic_resources | Gold −1, Fol +2, Relic +1 | 3/5/3/0/1 |
| 2 | tutorial_dread_relics | Dread +13, manually inserts doom_card@top | 3/5/3/13/1 |
| 3 | tutorial_doom_card (surfaces immediately) | Gold −2, Fol −2, Dread −8 | 1/3/3/5/1 |
| 4 | tutorial_threats_treats | Inserts threat+treat → nextCycleQueue | 1/3/3/5/1 |
| 5 | olgreth_1 | advanceGodPath | 1/3/3/5/1 |
| — | **RESHUFFLE** | draw pile empty after olgreth_1 | — |
| 6 | tutorial_reshuffle_card (pinned pos 0) | No resource effect | 1/3/3/5/1 |
| 7–8 | tutorial_threat_card + tutorial_treat_card | Inf −1 / Fol +2 (shuffled order) | 1/5/2/5/1 |
| 9 | olgreth_2 | advanceGodPath + victory | WIN |

**Safety:** Gold minimum = 1 (after doom card). Influence minimum = 2 (after threat card). No resource hits 0. No conditions on any tutorial option — no allBlocked risk.

**Relic note:** Player has 1 relic from card 1, available throughout. Even if spent to lower dread before card 2 (max dread reduction = −2, bringing dread from 0 to −2), dread +13 still exceeds 10 and doom inserts. The tutorial is safe regardless of relic usage.

---

## Starting Deck

```ts
export const TUTORIAL_CARDS: Card[] = [
  tutorial_interface,       // 0
  tutorial_basic_resources, // 1
  tutorial_dread_relics,    // 2 — doom inserts at top; reshuffle_card to nextCycle
  tutorial_threats_treats,  // 3 — threat/treat to nextCycle
  olgreth_1,                // 4 — draw pile now empty → reshuffle triggers
]
// olgreth_2 is NOT in the starting array. With 5 cards + doom inserting at top,
// the draw sequence is: interface → basic_resources → dread_relics → doom_card →
// threats_treats → olgreth_1 → DRAW PILE EMPTY → RESHUFFLE.
// olgreth_1's advanceGodPath queues olgreth_2 into nextCycleQueue so it surfaces
// post-reshuffle after the reshuffle_card, threat, and treat cards.
//
// IMPLEMENTATION NOTE: Verify that 'olgreth' is registered in GOD_PATH_CHAINS in
// src/data/index.ts so advanceGodPath can find and queue olgreth_2 without it being
// pre-seeded in the deck. If not registered, add it.
//
// Dynamically inserted (NOT in starting array):
// tutorial_doom_card      — inserted by tutorial_dread_relics, position 'top'
// tutorial_reshuffle_card — inserted by tutorial_dread_relics, position 'nextCycle', pinnedNextCycle: true
// tutorial_threat_card    — inserted by tutorial_threats_treats, tier 'threat' auto-routes to nextCycleQueue
// tutorial_treat_card     — inserted by tutorial_threats_treats, position 'nextCycle'
// olgreth_2               — queued by olgreth_1 advanceGodPath into nextCycleQueue
```

---

## Cards — Full Definitions

### tutorial_interface (UNCHANGED)
No changes required.

---

### tutorial_basic_resources (TEXT UPDATE ONLY)

**Flavour text:**
> Gold, Followers, Influence. The three regular resources to keep your cult alive. Keep each above zero and below ten, stray past either and the deck reacts. The jewel in each card header marks the type. Tap it for the tier.

**Option — "Redirect the funds"**
> The funds arrived. They have been redirected. Two new members presented themselves shortly after. These things happen together more often than not.

Effects unchanged: Gold −1, Followers +2, Relic +1.

---

### tutorial_dread_relics (UPDATED — replaces old card, dread +13, inserts doom manually)

**Flavour text:**
> Dread accumulates. Keep it below ten. At ten, a doom card enters the top of the draw pile, drawn next. The Relics counter sits beside the others. Tap it to spend one: pick any resource, move it two in either direction. One Relic is available.

**Option — "Examine the artefact"**
> Dread exceeded ten during the examination. The artefact itself remains inconclusive.

**Effects:**
```ts
effects: [
  { type: 'resource', resource: 'dread', delta: 13 },
  { type: 'insertCard', cardId: 'tutorial_doom_card', position: 'top' },
  { type: 'insertCard', cardId: 'tutorial_reshuffle_card', position: 'nextCycle' },
]
```

Note: `tutorial_reshuffle_card` has `pinnedNextCycle: true` — it surfaces as the first draw after reshuffle.
No relic gain on this card (player already has 1 from card 1).

---

### tutorial_doom_card (UPDATED — Dread −8 instead of −2)

**Flavour text:**
> This entered the deck when Dread reached ten. It is single-use. If Dread reaches ten again, a worse one follows. Some members found the first one instructive.

**Option — "Absorb it"**
> The costs were expected. Gold and Followers declined. Dread subsided. File it.

**Effects:**
```ts
effects: [
  { type: 'resource', resource: 'gold', delta: -2 },
  { type: 'resource', resource: 'followers', delta: -2 },
  { type: 'resource', resource: 'dread', delta: -8 },
]
```

---

### tutorial_threats_treats (NEW — replaces tutorial_threats_doom)

**Flavour text:**
> Some choices insert cards into the draw pile. Threat cards cost resources on arrival. Most are removed once resolved. Treat cards provide benefit. The rose jewel marks them. Both will surface after the next reshuffle.

**Option — "Make the call"**
> A threat card and a treat card have been added to the deck. The rose jewel identifies the one worth looking forward to.

**Effects:**
```ts
effects: [
  { type: 'insertCard', cardId: 'tutorial_threat_card' },
  // threat tier auto-routes to nextCycleQueue — no position needed
  { type: 'insertCard', cardId: 'tutorial_treat_card', position: 'nextCycle' },
]
```

---

### tutorial_reshuffle_card (NEW)

**Flavour text:**
> The draw pile is empty. The deck has reshuffled. The threat and treat from the previous cycle are now ahead.

**Option — "Understood"**
> Noted.

**Card definition:**
```ts
{
  id: 'tutorial_reshuffle_card',
  title: 'The Deck Reshuffles',
  tier: 'tutorial',
  pinnedNextCycle: true,
  flavourText: '...',
  options: [{ label: 'Understood', flavourText: 'Noted.', effects: [] }],
}
```

`pinnedNextCycle: true` requires a Card type addition and reshuffle() engine support (see Engine Changes).

---

### tutorial_treat_card (NEW — treat tier)

**Flavour text:**
> The rose jewel. This treat was inserted earlier. Not all insertions are a problem.

**Option — "Accept it"**
> Two new members joined without incident. The paperwork is minimal.

**Effects:**
```ts
effects: [
  { type: 'resource', resource: 'followers', delta: 2 },
]
```

---

### tutorial_threat_card (TEXT UPDATE — existing card)

**Flavour text:**
> The blood red jewel. Threat cards can surface anywhere in the deck. Most are removed once resolved. Influence is the cost of resolution here.

**Option — "Handle it"**
> Influence declined by one. The matter is closed.

Effects unchanged: Influence −1.

---

### olgreth_1 (TEXT UPDATE ONLY)

**Flavour text:**
> A name. Buried in the margin of a page you didn't mean to open. This is the god path. A chain of ritual cards seeded into the run. There are two. Completing both ends the run.

**Option — "Speak it aloud"**
> Something shifted. The second ritual card is in the deck. It was already waiting.

Effects unchanged: advanceGodPath.

---

### olgreth_2 (TEXT UPDATE ONLY)

**Flavour text:**
> The second card in the chain. The last one. What began in the margin ends here.

**Option — "Step forward"**
> The run ends here.

Effects unchanged: advanceGodPath + victory.

---

## Engine Changes Required

### 1. Add `'nextCycle'` position to insertCard effect (types.ts + gameStore.ts)

**`src/types/index.ts`** — InsertCardEffect type:
Add `'nextCycle'` as a valid position value.

**`src/state/gameStore.ts`** — `resolveOption`, insertCard case:
Add a new branch before the existing `else`:
```ts
} else if (effect.position === 'nextCycle') {
  deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
}
```

### 2. Add `pinnedNextCycle?: true` to Card type + reshuffle support (types.ts + deck.ts)

**`src/types/index.ts`** — Card interface:
```ts
pinnedNextCycle?: true
```

**`src/engine/deck.ts`** — `reshuffle()`:
Split `nextCycleQueue` into pinned and unpinned before building the shuffle pool. After shuffle and god_path repositioning, prepend pinned cards:
```ts
const pinnedQueue   = deck.nextCycleQueue.filter(c => c.pinnedNextCycle)
const unpinnedQueue = deck.nextCycleQueue.filter(c => !c.pinnedNextCycle)
const combined      = [...deck.drawPile, ...deck.discardPile, unravellingCard, ...unpinnedQueue]
let shuffled        = shuffleArray(combined)
// ... existing god_path repositioning ...
shuffled = [...pinnedQueue, ...shuffled]
```

No impact on non-tutorial runs (no existing cards use `pinnedNextCycle`).

### 3. No changes to startTutorial() or overflow guards

The `pendingUnravelling` flag comment in old `tutorial.ts` was a design fiction — no code change is required. The `!isTutorial` guards on overflow remain in place. The new `tutorial_dread_relics` card manually inserts doom via `insertCard` at `position: 'top'`, which is already supported.

---

## Registry Changes

**`src/data/cards/tutorial.ts`:**
- Delete `tutorial_threats_doom`
- Add `tutorial_threats_treats`, `tutorial_reshuffle_card`, `tutorial_treat_card`
- Export `tutorial_doom_card`, `tutorial_threat_card`, `tutorial_reshuffle_card`, `tutorial_treat_card` (for ALL_CARDS registry)
- Update `TUTORIAL_CARDS` array (5 cards only — dynamic inserts listed in comments)

**`src/data/index.ts`:**
- Remove `tutorial_threats_doom` from ALL_CARDS
- Add `tutorial_threats_treats`, `tutorial_reshuffle_card`, `tutorial_treat_card` to ALL_CARDS

---

## Out of Scope

- Demonstrating overflow on primary resources (gold/followers/influence hitting 10) — left for gameplay discovery
- Demonstrating deficit cards (resource hitting 0) — left for gameplay discovery
- Core card rotation explanation — removed per designer decision (too much for one tutorial)
- Any change to the win screen, TutorialSplash, or non-tutorial game flow
