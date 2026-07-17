# Design Spec — Tutorial Expansion: Prep Tags & Weekly Cadence

**Date:** 2026-07-16
**Status:** Approved
**Backlog item:** Tutorial (Design Sessions)

---

## Problem

The existing tutorial (shipped as of s124 / P12-25 redesign) teaches the building blocks of the game correctly: interface, resources, dread, relics, doom cards, threats, treats, reshuffle, and the basic god path chain. It does not teach two mechanics that are structurally necessary for a player to engage meaningfully with a real run:

1. **Prep tags** — the causal link between an earlier option and a later unlock is invisible without explicit teaching. Players who do not understand prep tags will read gated god path options as bugs or bad luck, not as consequences of prior decisions.
2. **Weekly cadence** — the tutorial explains that a reshuffle happens but not that each reshuffle is a week boundary with escalating stakes. Without this framing, the god path cards feel like random arrivals rather than a building sequence.

God-specific mechanics (whispers, mutations, changed followers) are explicitly out of scope — each god's chain introduces its own mechanics via card text.

---

## Approach

Expand the scripted tutorial with two new cards and one text update. The run stays fully deterministic — no randomness introduced. Every new card is authored to the same scripted-safety standard as existing tutorial cards (no allBlocked risk, no resource floor violations).

The prep tag demonstration uses a genuine two-path choice (A2 approach): the player can set or not set the tag, and the reacting card shows the gated option greyed out if the tag was not set. The player who missed it sees exactly what they forfeited and why.

---

## Full Mechanics Map (for reference)

What the tutorial now teaches, and what is left for discovery or per-god teaching:

| Mechanic | Coverage | Method |
|---|---|---|
| Interface, options, greyed-out conditions | Taught | tutorial_interface |
| Gold / Followers / Influence | Taught | tutorial_basic_resources |
| Jewel tap (tier info) | Taught | tutorial_basic_resources |
| Dread | Taught | tutorial_dread_relics |
| Relics | Taught | tutorial_dread_relics |
| Doom cards (tier 1) | Taught | tutorial_doom_card |
| Doom escalation (tier 2+) | Hinted | tutorial_doom_card text: "a worse one follows" |
| Threats | Taught | tutorial_threat_card + tutorial_threats_treats |
| Treats | Taught | tutorial_treat_card + tutorial_threats_treats |
| Reshuffle (it happens) | Taught | tutorial_reshuffle_card |
| Weekly cadence (escalating stakes) | **Newly taught** | tutorial_reshuffle_card (updated text) |
| Prep tags | **Newly taught** | tutorial_prep_intro + tutorial_prep_react |
| Activity log (exists, records events) | **Newly pointed to** | tutorial_prep_intro text |
| God path (chain structure, win condition shape) | Taught | olgreth_1 + olgreth_2 |
| Rare card rotation | Discoverable | Not taught — players notice the new card |
| Overflow / deficit | Discoverable | Consciously excluded (prior spec decision) |
| Core card rotation | Discoverable | Consciously excluded (prior spec decision) |
| Passives | Discoverable | Effects are visible; no teaching needed |
| Blessings | Discoverable | First run with a blessing makes it clear |
| Win condition gates (full vs partial) | Discoverable | God path card 6 text carries this |
| Whispers (Yha / Nyar) | Per-god | Each god's chain teaches its own mechanic |
| Mutations / changed followers (Shub) | Per-god | Shub chain teaches its own mechanic |

---

## New Draw Sequence

**Starting state:** G=3, F=3, I=3, Dr=0, R=0

### Week 1 (pre-reshuffle)

| # | Card | Key teaching | State after (G/F/I/Dr/R) |
|---|---|---|---|
| 1 | tutorial_interface | Interface, options, greyed-out | 4/3/3/0/0 |
| 2 | tutorial_basic_resources | Resources, jewel tap | 3/5/3/0/1 |
| 3 | tutorial_dread_relics | Dread, relics → inserts doom@top + reshuffle_card@nextCycle | 3/5/3/13/1 |
| 4 | tutorial_doom_card (inserted at top) | Doom tier 1 | 1/3/3/5/1 |
| 5 | tutorial_threats_treats | Threats, treats → inserts threat@nextCycle + treat@nextCycle | 1/3/3/5/1 |
| 6 | tutorial_prep_intro (NEW) | Prep tags, activity log → inserts prep_react@nextCycle | varies by option |
| 7 | olgreth_1 | God path card 1 → queues olgreth_2@nextCycle → RESHUFFLE | varies |

### Week 2 (post-reshuffle)

| # | Card | Key teaching | Notes |
|---|---|---|---|
| 8 | tutorial_reshuffle_card (updated) | Weekly cadence | pinnedNextCycle — always first |
| 9 | tutorial_threat_card | — | from nextCycleQueue |
| 10 | tutorial_prep_react (NEW) | Prep tag payoff | from nextCycleQueue |
| 11 | tutorial_treat_card | — | from nextCycleQueue |
| 12 | olgreth_2 | Victory | from nextCycleQueue |

**Why prep_react appears between threat and treat:** The threat costs something; the prep consequence follows; the treat rewards. This rhythm is intentional and mirrors the emotional arc of a real week. See tutorialReshuffle() changes below for how this ordering is enforced.

**The reshuffle as structural teaching:** The gap between tutorial_prep_intro (week 1) and tutorial_prep_react (week 2) is the lesson. The player sets or does not set a commitment, plays through to reshuffle, and only then sees the consequence. This mirrors how prep tags actually function in real runs.

---

## Resource Safety Trace

**Worst path (Option B taken — tag not set):**

| Card | Effect | G/F/I/Dr/R |
|---|---|---|
| Start | — | 3/3/3/0/0 |
| tutorial_interface | G+1 | 4/3/3/0/0 |
| tutorial_basic_resources | G-1, F+2, R+1 | 3/5/3/0/1 |
| tutorial_dread_relics | Dr+13 | 3/5/3/13/1 |
| tutorial_doom_card | G-2, F-2, Dr-8 | 1/3/3/5/1 |
| tutorial_threats_treats | — | 1/3/3/5/1 |
| tutorial_prep_intro (B) | G+1 | 2/3/3/5/1 |
| olgreth_1 | — | 2/3/3/5/1 |
| tutorial_reshuffle_card | — | 2/3/3/5/1 |
| tutorial_threat_card | I-1 | 2/3/2/5/1 |
| tutorial_prep_react (D, fallback) | — | 2/3/2/5/1 |
| tutorial_treat_card | F+2 | 2/5/2/5/1 |
| olgreth_2 | victory | — |

Gold minimum: 2. Influence minimum: 2. No resource hits 0. No allBlocked risk on any card.

**Best path (Option A taken — tag set):**

tutorial_prep_intro gives I+1 instead of G+1. tutorial_prep_react Option C gives G+1, F+1.
All floors remain safe, all ceilings clear.

---

## Card Definitions

All tutorial cards are exempt from the 80/108 character length cap (standing rule D-2026-06-25).
Voice: same deadpan bureaucratic register as existing tutorial cards.
No em-dashes anywhere. Period separators only.

---

### tutorial_prep_intro (NEW) — "The Prior Arrangement"

```ts
{
  id: 'tutorial_prep_intro',
  title: 'The Prior Arrangement',
  tier: 'tutorial',
  flavourText: 'Some options carry forward. Setting a commitment now may unlock a different option in a later card. The activity log at the bottom of the screen records when these are set.',
  options: [
    {
      label: 'Make the arrangement',
      flavourText: 'The arrangement is noted. The activity log has recorded it.',
      effects: [
        { type: 'resource', resource: 'influence', delta: 1 },
        { type: 'setPrepTag', tag: 'olgreth_prep' },
        { type: 'insertCard', cardId: 'tutorial_prep_react', position: 'nextCycle' },
      ],
    },
    {
      label: 'Leave it open',
      flavourText: 'Nothing was committed. The option remains open in the loosest possible sense.',
      effects: [
        { type: 'resource', resource: 'gold', delta: 1 },
        { type: 'insertCard', cardId: 'tutorial_prep_react', position: 'nextCycle' },
      ],
    },
  ],
}
```

Both options insert `tutorial_prep_react` into nextCycleQueue. The card always appears in week 2 regardless of which option was taken.

**Note on setPrepTag effect:** `setPrepTag` is confirmed as a valid effect type in `src/types/index.ts` (line 41). Use `{ type: 'setPrepTag', tag: 'olgreth_prep' }` exactly. The activity log will emit a `prepTagSet` entry automatically when this fires.

---

### tutorial_prep_react (NEW) — "The Arrangement, Recalled"

```ts
{
  id: 'tutorial_prep_react',
  title: 'The Arrangement, Recalled',
  tier: 'tutorial',
  flavourText: 'The prior commitment surfaces. It was either made or it was not. The options below reflect this.',
  options: [
    {
      label: 'Complete it',
      flavourText: 'The arrangement held. Both parties benefited.',
      condition: { type: 'hasPrepTag', tag: 'olgreth_prep' },
      // hideWhenUnavailable: NOT set — the greyed option must be visible so the player
      // understands what they missed and why.
      effects: [
        { type: 'resource', resource: 'gold', delta: 1 },
        { type: 'resource', resource: 'followers', delta: 1 },
      ],
    },
    {
      label: 'Continue without it',
      flavourText: 'The arrangement was not made. This is fine. It is less fine than it could have been.',
      effects: [],
    },
  ],
}
```

Option "Complete it" is shown greyed (not hidden) when `olgreth_prep` is not set. The player sees what they forfeited and why.

---

### tutorial_reshuffle_card (UPDATED TEXT)

```ts
{
  id: 'tutorial_reshuffle_card',
  title: 'A New Week',
  tier: 'tutorial',
  pinnedNextCycle: true,
  flavourText: 'Week 1 is over. The deck has reshuffled. Each reshuffle marks a new week. The god path advances toward its conclusion. Costs mount as weeks pass. Cards inserted last week surface now.',
  options: [
    {
      label: 'Continue',
      flavourText: 'Week 2 begins.',
      effects: [],
    },
  ],
}
```

**Title change:** "The Deck Reshuffles" -> "A New Week". The old title described the mechanical event; the new title names the concept the card is teaching.

---

## Starting Deck

```ts
export const TUTORIAL_CARDS: Card[] = [
  tutorial_interface,       // 0 — UI, options, greyed-out demo
  tutorial_basic_resources, // 1 — primary resources, jewel tap
  tutorial_dread_relics,    // 2 — dread, relics; inserts doom@top + reshuffle_card@nextCycle
  tutorial_threats_treats,  // 3 — inserts threat@nextCycle + treat@nextCycle
  tutorial_prep_intro,      // 4 (NEW) — prep tags, activity log; inserts prep_react@nextCycle
  olgreth_1,                // 5 — god path 1; queues olgreth_2@nextCycle; draw pile empties -> RESHUFFLE
]
// Post-reshuffle nextCycleQueue (insertion order):
//   tutorial_reshuffle_card  — pinnedNextCycle: true (inserted by dread_relics)
//   tutorial_threat_card     — inserted by threats_treats effect 0
//   tutorial_treat_card      — inserted by threats_treats effect 1
//   tutorial_prep_react      — inserted by tutorial_prep_intro (both option branches)
//   olgreth_2                — queued by olgreth_1 advanceGodPath
//
// tutorialReshuffle() enforces draw order: reshuffle_card, threat, prep_react, treat, olgreth_2
// (prep_react is pulled ahead of treat — see Engine Changes).
```

---

## Engine Changes

### 1. tutorialReshuffle() — enforce explicit post-reshuffle order

The current `tutorialReshuffle()` in `src/engine/deck.ts` processes `nextCycleQueue` as pinned-first then unpinned in insertion order. Because `tutorial_threats_treats` inserts both threat and treat (effects 0 and 1) before `tutorial_prep_intro` inserts prep_react, the natural insertion order would produce:

`reshuffle_card, threat, treat, prep_react, olgreth_2`

The desired order is:

`reshuffle_card, threat, prep_react, treat, olgreth_2`

Update `tutorialReshuffle()` to enforce this by sorting the unpinned queue against an explicit ID order array:

```ts
const TUTORIAL_POST_RESHUFFLE_ORDER = [
  'tutorial_threat_card',
  'tutorial_prep_react',
  'tutorial_treat_card',
  'olgreth_2',
]

export function tutorialReshuffle(deck: DeckState): DeckState {
  const pinned   = deck.nextCycleQueue.filter(c => c.pinnedNextCycle)
  const unpinned = deck.nextCycleQueue.filter(c => !c.pinnedNextCycle)
  const sorted   = TUTORIAL_POST_RESHUFFLE_ORDER
    .map(id => unpinned.find(c => c.id === id))
    .filter((c): c is Card => c !== undefined)
  return {
    ...deck,
    drawPile:       [...pinned, ...sorted],
    discardPile:    [],
    nextCycleQueue: [],
  }
}
```

Any card in the queue not present in `TUTORIAL_POST_RESHUFFLE_ORDER` is silently dropped (consistent with existing behaviour). Any card in the order array missing from the queue is silently omitted.

### 2. No prepTag investigation needed

`setPrepTag` is confirmed valid (`src/types/index.ts` line 41). Activity log emits `prepTagSet` automatically. No additional plumbing required.

### 3. No other engine changes

- `reshuffle()` — untouched
- `startTutorial()` — untouched
- `isTutorial` guards — untouched

---

## Registry Changes

**`src/data/cards/tutorial.ts`:**
- Add `tutorial_prep_intro` (not exported — internal to tutorial sequence)
- Export `tutorial_prep_react` (needed in ALL_CARDS for engine card lookup)
- Update `TUTORIAL_CARDS` array (5 entries -> 6)
- Update `tutorial_reshuffle_card` title + flavourText + option label/flavourText

**`src/data/index.ts`:**
- Add `tutorial_prep_react` to ALL_CARDS

---

## Flavour Text Pass

Before implementation, all tutorial card text must be reviewed line by line:
- No em-dashes (use periods or restructure)
- No exclamation marks
- No "you" addressing the player
- Length: tutorial.ts is exempt from the 80/108 cap but text should still be tight
- Voice: deadpan bureaucratic, flat acknowledgement of events
- Accuracy: every mechanical claim must match current engine behaviour

Cards to review in full: `tutorial_interface`, `tutorial_basic_resources`, `tutorial_dread_relics`, `tutorial_doom_card`, `tutorial_threats_treats`, `tutorial_prep_intro` (new), `tutorial_reshuffle_card` (updated), `tutorial_threat_card`, `tutorial_prep_react` (new), `tutorial_treat_card`, `olgreth_1`, `olgreth_2`.

This pass is part of the implementation plan, not a pre-condition for writing it.

---

## Out of Scope

- Overflow / deficit teaching — consciously excluded (prior spec decision)
- Core card rotation teaching — consciously excluded (prior spec decision)
- Rare card rotation teaching — discoverable; player notices the new card
- Activity log deep teaching — pointed to on tutorial_prep_intro; not explained in detail
- Whispers, mutations, changed followers — each god's chain teaches its own mechanics
- Win condition gates — god path card 6 text carries this per god
- Any change to TutorialSplash, TutorialCompleteScreen, or non-tutorial game flow
- Any change to the olgreth god path chain beyond text updates already made
