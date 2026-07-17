# Card Tier Reclassification Phase 2 — Core Audit

> **Covers backlog item:** Reclass-2 (core tier audit)

**Goal:** Enforce single-source threat chains across all core cards — each consequence card has exactly one source — and simplify the four displaced cards, downgrading one to common.

**Architecture:** Data-only changes to `core.ts` and `common.ts`. No engine changes. The "threat chain" pattern: a core card's trap option inserts a consequence card; that consequence card may continue the chain. No consequence card may be inserted by more than one source card.

---

## Threat Chain Ownership (post-Phase 2)

Each consequence card is owned by exactly one source. This is the single-source invariant.

| Consequence card | Exclusive source card | Source option |
|---|---|---|
| `scrutiny` | `congregation_meets` | "Deliver a sermon" |
| `wandering_soul` | `the_seance` | "Let them do it alone" |
| `investigators_file` | `academic_society` | "Attend as guest speaker" |
| `their_suspicion` | `the_census_agent` | "Provide misleading figures" |
| `political_debt` | `local_elections` | "Back them openly" |
| `strings_attached` | `the_donation` | "Accept it" |
| `lost_safehouse` | `funds_run_low` | "Relocate" |
| `local_gossip` | `funds_run_low` | "Remind him you know things" |
| `loose_end` | `follower_confesses_doubt` | "Offer tea. Not another word." |
| `changed_follower` | `relic_market` | "Send someone after hours" |
| `what_was_already_read` | `the_old_book` | "Burn it" |
| `desperate_congregation` | `supplies_dwindle` | (audit in Phase 4) |
| `their_survivors` | `rival_stirs` | "Report them anonymously" |
| `rival_escalation` | `rival_stirs` | "Ignore them" |
| `their_report` | `the_census_agent` | "Cooperate fully" |
| `what_was_done` | `the_census_agent` | "Make the problem go away" |
| `grove_awaits` | `woodcutters_report` | "Buy the map" (randomOutcome) |
| `an_unremarkable_stump` | `woodcutters_report` | "Buy the map" (randomOutcome) |
| `forgers_debt` | `the_printing_press` | "Forgery work" |
| `the_dreamer` | `the_opium_den` | "Acquire it" |

---

## Card Changes

### 1. `congregation_meets` — "Dismiss early"
**File:** `src/data/cards/core.ts`

Remove `insertCard(wandering_soul)`. Replace with resource effects.

Old effects:
```typescript
effects: [
  { type: 'insertCard', cardId: 'wandering_soul', position: 'random', minPos: 3, maxPos: 7 },
],
```

New effects:
```typescript
effects: [
  { type: 'resource', resource: 'followers', delta: -1 },
  { type: 'resource', resource: 'dread', delta: 1 },
],
```

New flavour text: `'The hall empties quickly. Someone lingers on the steps. You do not call after them.'`

---

### 2. `stranger_asks_questions` — "Offer him a tour"
**File:** `src/data/cards/core.ts`

Remove `insertCard(investigators_file)`. Replace with resource effects. Update flavour.

Note: "Have him followed" (removeCard investigators_file) is unaffected — it remains a chain-counter for the academic_society → investigators_file chain.

Old effects:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: 1 },
  { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 4, maxPos: 8 },
],
```

New effects:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: 1 },
  { type: 'resource', resource: 'dread', delta: 1 },
],
```

New flavour: `'Charming. Informative. He notices more than he lets on. So do you.'`

---

### 3. `word_spreads` — reclassify to common
**Files:** `src/data/cards/core.ts` (remove), `src/data/cards/common.ts` (add)

Remove `insertCard(their_suspicion)` from "Lean into it". Both options become pure resource effects. Card downgraded from core to common.

New "Lean into it" effects:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: 1 },
  { type: 'resource', resource: 'dread', delta: 2 },
],
```

Full card as it should appear in `COMMON_CARDS`:
```typescript
{
  id: 'word_spreads',
  title: 'Word Spreads',
  flavourText: "You hear people talking. You didn't plan this. On the other hand, is it so bad?",
  tier: 'common',
  options: [
    {
      label: 'Lean into it',
      flavourText: 'The story grows past the version you told. The version coming back is unrecognisable.',
      effects: [
        { type: 'resource', resource: 'influence', delta: 1 },
        { type: 'resource', resource: 'dread', delta: 2 },
      ],
    },
    {
      label: 'Let it settle',
      flavourText: 'Smaller story. More manageable story. Stories do not stay small.',
      effects: [
        { type: 'resource', resource: 'influence', delta: -1 },
        { type: 'resource', resource: 'dread', delta: -1 },
      ],
    },
  ],
},
```

---

### 4. `the_printing_press` — "Propaganda run"
**File:** `src/data/cards/core.ts`

Remove `insertCard(scrutiny)`. Option becomes pure resource trade-off. Card stays in core (still owns the forgers_debt chain).

Old effects:
```typescript
effects: [
  { type: 'resource', resource: 'gold', delta: -2 },
  { type: 'resource', resource: 'influence', delta: 2 },
  { type: 'insertCard', cardId: 'scrutiny', position: 'random', minPos: 4, maxPos: 8 },
],
```

New effects:
```typescript
effects: [
  { type: 'resource', resource: 'gold', delta: -2 },
  { type: 'resource', resource: 'influence', delta: 2 },
],
```

---

### 5. `academic_society` — "Attend as civilian"
**File:** `src/data/cards/core.ts`

Remove `insertCard(a_useful_contact)`. Replace with immediate resource reward — fixes the dominant-option problem while keeping the option attractive.

Old effects:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: 1 },
  { type: 'insertCard', cardId: 'a_useful_contact', position: 'random', minPos: 3, maxPos: 6 },
],
```

New effects:
```typescript
effects: [
  { type: 'resource', resource: 'influence', delta: 1 },
  { type: 'resource', resource: 'followers', delta: 1 },
],
```

---

## Stranded Cards — Deferred

Both cards lose their only entry path in Phase 2. They remain in the card registry (threats.ts / wherever defined) but cannot appear in runs until reassigned.

| Card | Previously inserted by | Status |
|---|---|---|
| `something_on_the_hook` | `the_harbour` (removed in Phase 1) | Deferred to threat chains session |
| `a_useful_contact` | `academic_society` civilian (removed Phase 2) | Deferred to threat chains session |

---

## Net Result

- 4 `insertCard` effects removed from core cards
- 1 card downgraded: `word_spreads` → common (common pool now 5 cards)
- Single-source invariant enforced across all core chains
- No new cards created
