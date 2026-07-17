# P20-B — Shub-Niggurath + Mutation Redesign

**Date:** 2026-07-05
**Status:** Approved, pending implementation plan
**Scope:** `src/data/cards/special.ts`, `src/data/cards/mutations.ts`, `src/data/godPaths/shub_niggurath.ts`, `src/data/cards/threats.ts`, `src/state/gameStore.ts`, `src/components/` (resource bar + menu), `src/engine/` (doom card conditional, pooled options)
**Tests affected:** Any test touching `changed_follower`, `theChanged`, shub chain cards, doom card 4, `the_weight_of_it`

---

## Background

Playtest 20 (shub ×2): chain "felt yanky and not thought through." Designer has never summoned Shub. Core problems:

- `changed_follower` is a generic threat card with no link to Shub's mechanics
- `theChanged` resource is only acquired at Cards 4 and 5 — too late, acquisition path opaque
- Mutation dark options give `theChanged +1` directly — no narrative pipeline
- Both options on Cards 1 and 2 advance the chain (no stall = railroaded feel)
- Card 5 opt 3 (self-remove + reinsert) is mechanically confusing
- `shub_words_come_naturally` carries god-path jewel but plays like a threat
- `the_weight_of_it` opt 1 gate (`followers ≥ 3`) unpickable on Shub runs that spend followers

---

## §1 — The Changed Follower Card

### Identity

`changed_follower` becomes **Shub-exclusive**. It is no longer a threat card. It is a persistent deck presence — a transformed member of the congregation who keeps showing up.

```
tier: 'god_path'
godPath: 'shub_niggurath'
accumulates: true
```

No self-remove on any option. The card remains in the deck until explicitly sacrificed. Visual treatment: uses the mutation jewel/icon (to be designed in the P20-B visual pass — same jewel as mutated cards). Until that pass, use god_path tier styling.

### Flavour text (by draw count)

```
1: "One of them is different now. The others have not noticed yet. You have."
2: "They have stopped pretending. Whatever is working through them has settled in."
3+: "Three of the congregation have turned. They are waiting for a signal."
```

### Options

**Keep** (always shown — no card removal):

> **"Let them stay"**
> *"You decided not to intervene. That counts as a decision."*
> Effects: `theChanged +1`. Card remains in deck.

**Sacrifice A + Sacrifice B** — 2 options drawn randomly from the pool each time the card is drawn. Each option shows a `−card` indicator in UI.

### Sacrifice pool (12 options, pick 2 per draw — one per category, never two from same)

| Category | Effect | Flavour text |
|---|---|---|
| Dread mild | `dread −2` | *"The congregation found the resolution clarifying."* |
| Dread strong | `dread −3` | *"Their certainty on the way out had a settling effect on the room."* |
| Gold small | `gold +1` | *"A modest accounting. You didn't ask for the details."* |
| Gold large | `gold +2` | *"Months of devotion. Settled efficiently."* |
| Influence small | `influence +1` | *"The congregation interpreted it as deliberate. We let them."* |
| Influence large | `influence +2` | *"Word spread. The right word, this time."* |
| Relics plain | `relics +1` | *"Something they carried remained. We kept it."* |
| Relics combo | `relics +1, dread −1` | *"Useful, and quieter after. We noted both."* |
| Followers plain | `followers +1` | *"Someone came to fill the space. They didn't ask why it was empty."* |
| Followers costly | `followers +1, dread +1` | *"Three came to replace one. They asked no questions."* |
| Combo | `gold +1, influence +1` | *"Practical and visible. Two problems addressed."* |
| Special | Remove 1 random `tier: 'threat'` card from drawPile (excludes unravelling/doom cards; no effect if no threats in drawPile) | *"The problem left with them. We decided not to examine this."* |

### Deck cap

Max **3 copies** of `changed_follower` in drawPile + discardPile simultaneously. Same enforcement pattern as `the_weight_of_it` cap (`MAX_WEIGHT_COPIES`). Add `MAX_CHANGED_FOLLOWER_COPIES = 3` constant.

### Acquisition paths (Shub runs only)

| Source | How |
|---|---|
| Mutation dark options (all 6) | `insertCard: changed_follower` at positions 3–7 *(replaces `theChanged +1`)* |
| `shub_niggurath_3` "Claim it formally" | `insertCard: changed_follower` directly |
| `shub_niggurath_4` "Lead the congregation" | `insertCard: changed_follower` directly *(replaces `theChanged +1`)* |
| `grove_awaits` "Go yourself" | Already inserts `changed_follower` — no change. **Edge case:** `woodcutters_report` is Shub-weighted but not Shub-exclusive, so `grove_awaits` can appear on Yha/Nyar runs. On those runs, `changed_follower` has no meaningful effect (theChanged is never checked, keep does nothing useful). Acceptable for now — frequency is very low. Fix in a future pass if playtesting surfaces it. |

---

## §2 — theChanged Display

**Remove from resource bar.** `theChanged` is excluded from the resource bar render on all runs.

**Add to menu.** `MenuPanel` renders `The Changed: N` as a named passive entry alongside prep-tags when `activeGod === 'shub_niggurath'`. Only shown if `theChanged > 0` or `activeGod === 'shub_niggurath'`. Same pill/row pattern as prep-tag display.

`theChanged` remains in `GameState.resources` as a tracked integer. No type change needed — only the render layer changes.

---

## §3 — Win Condition

**File:** `src/data/godPaths/shub_niggurath.ts` — Card 6 (`shub_niggurath_6`) conditions

| Outcome | Condition |
|---|---|
| Full victory (`victory` effect) | `godPathStage ≥ 5` AND `theChanged ≥ 3` |
| Partial victory (`partialVictory` effect) | `godPathStage ≥ 5` AND `theChanged ≥ 2` AND `relics ≥ 2` |
| Fail (`endRun`) | Default — *"We did not give enough. The forest does not forgive shortfalls. It simply grows."* |

*(Was: full = theChanged ≥ 4, partial = theChanged 2–3 + relics 2. Updated to match 3-copy deck cap.)*

---

## §4 — Chain Card Revisions

All cards in `src/data/godPaths/shub_niggurath.ts`.

### Card 1 — The Pilgrim's Path

**Add stall option** (was missing — both opts advanced chain):

```
label: 'Ignore it'
flavourText: "The offerings continued. They became more correct over time."
effects: [dread +1, insertCard: shub_niggurath_1 positions 5–8]
condition: none
```

Existing opts 1 and 2 unchanged.

### Card 2 — The First Rite

**Differentiate opt 2** (was near-identical to opt 1 — only gold cost differed):

Opt 2 "Conduct with appropriate preparations" — add `seedMutations: 1` to effects (preparation as a ritual act that seeds one early mutation). This gives opt 2 a mechanical identity opt 1 lacks.

**Add stall option:**

```
label: 'Postpone'
flavourText: "The air is still warm. We will have time, even if something is less pleased."
effects: [dread +2, insertCard: shub_niggurath_2 positions 4–7]
condition: none
```

### Card 3 — The Unknown Goat

**Add stall option:**

```
label: 'Chase it off'
flavourText: "It left. The trail of affected grass ends at the woods. It was back by dawn."
effects: [dread +2, insertCard: shub_niggurath_3 positions 4–7]
condition: none
```

**Opt 1 "Claim it formally"** — add `insertCard: changed_follower` to effects (the follower who first touched it walks differently now — this is that card entering the deck).

**Activity log:** After `seedMutations` resolves, push log entry: *"Something in your deck has changed."* (Implement in `seedMutations` case in `gameStore.ts` — append to `activityLog`.)

### Card 4 — The Familiar Chant

**Opt 1 "Lead the congregation"** — remove `theChanged +1`, add `insertCard: changed_follower`. Full revised effects:

```
effects: [
  relics −1,
  followers −2,
  dread +4,
  insertCard: changed_follower,
  advanceGodPath,
  seedMutations: 2,
]
```

**Add stall option:**

```
label: 'Disperse them and lock the barn'
flavourText: "They are outside now. You can hear both — the congregation on one side, and from inside, the hooves on the floorboards."
effects: [followers −2, influence −2, insertCard: shub_niggurath_4 positions 5–8]
condition: none
```

Opts 2 and 3 unchanged.

### Card 5 — A Thousand Young

**Replace opt 3** "Wait at the treeline" (current: `removeCard` + `insertCard` same card — confusing):

```
label: 'Pull them back'
flavourText: "Two of ours stepped toward it. You called them back. Only one responded."
effects: [followers −1, dread +3, insertCard: shub_niggurath_5 positions 5–8]
condition: none
```

Opts 1 and 2 unchanged.

### Card 6 — The Root Remembers

Update conditions per §3. No other changes.

---

## §5 — Supporting Cards

### shub_words_come_naturally

**Change tier** from `'god_path'` → `'threat'`. Remove `godPath` field. This removes the god-path jewel — the card plays like a threat and should look like one.

**Revise options:**

```
Option 1 — "Go to them"
flavourText: "You knew the words. You did not know that you knew the words."
effects: [followers −1, advanceGodPath, seedMutations: 1]
condition: { godPathStageMin: 3 }

Option 2 — "Leave before they reach you"
flavourText: "You left before they got to you. Still chanting."
effects: [dread −2, insertCard: shub_niggurath_4 positions 4–7]
condition: none
```

### fishermans_return

**Add third option:**

```
label: "Let him see what you've become"
flavourText: "He saw one of yours on the way in. He has not asked for the artefact back."
effects: [dread +1, insertCard: changed_follower positions 3–6]
condition: none
```

Existing opts 1 ("Return the artefact") and 2 ("Refuse") unchanged.

### the_weight_of_it — opt 1 "Steady them"

Change condition from `followers ≥ 3` → `followers ≥ 2`. Shub runs spend followers on chain cards; the old gate was unpickable by the time the card appeared.

---

## §6 — Doom Card 4 — Non-Shub Runs

**File:** wherever doom card 4 ("The Congregation Changes") is applied in `gameStore.ts`.

Current behaviour: `insertCard: changed_follower`.

**New behaviour:**
- Shub run (`activeGod === 'shub_niggurath'`): insert `changed_follower` as before
- Non-Shub run: apply inline `followers −1, dread +2` — no card inserted

Add a `godPath` conditional in the doom tier 4 application logic.

---

## §7 — Engine Changes

### 7a — Pooled options (new feature)

**New CardOption fields:**

```typescript
pooled?: boolean          // if true, this option participates in pool selection
categoryKey?: string      // used to enforce one-per-category constraint
```

**New Card field:**

```typescript
optionPoolSize?: number   // how many pooled options to show per draw (default 2)
```

**Engine behaviour** (in card draw / option resolution path):

1. On card draw, separate options into `pooled` and `non-pooled`
2. Non-pooled options always shown (subject to normal conditions)
3. Pooled options: group by `categoryKey`, pick one random option per category, select `optionPoolSize` categories randomly, show those options
4. Selection is stable for the duration of viewing the card (re-roll only on next draw)
5. Selected pool options still respect `condition` — if selected option fails its condition, pick next in that category

**Seeding:** Use `cardId + drawCount` as seed for determinism within a session (same draw = same pair). Prevents flickering if card is re-rendered.

### 7b — theChanged resource bar suppression

In the resource bar render component: exclude `theChanged` from the displayed resources array unconditionally. It is always menu-only.

### 7c — Menu theChanged display

In `MenuPanel` (or equivalent): when `activeGod === 'shub_niggurath'`, render a `The Changed: N` row in the prep-tag section. Show even at 0 so the player knows the counter exists.

### 7d — seedMutations activity log

In `gameStore.ts` `seedMutations` case: after mutations are applied, push to `activityLog`:
```
"Something in your deck has changed."
```
Only if `toReplace.length > 0` (at least one mutation seeded).

### 7e — changed_follower deck cap

Add `MAX_CHANGED_FOLLOWER_COPIES = 3` constant in `deck.ts` (alongside `MAX_WEIGHT_COPIES`). Apply same cap enforcement pattern in the relevant engine path (wherever `insertCard: changed_follower` effects are resolved — check current total in drawPile + discardPile before inserting).

### 7f — Doom card 4 god-path conditional

In doom card 4 application: branch on `gameState.activeGod`. Shub → insertCard. Others → applyInlineEffects `[{ type: 'resource', resource: 'followers', delta: -1 }, { type: 'resource', resource: 'dread', delta: 2 }]`.

---

## §8 — What This Does NOT Change

- Mutation pool card IDs and existing options (only dark option effects change — `theChanged +1` → `insertCard: changed_follower`)
- `seedMutations` engine mechanics (random replacement in drawPile) — unchanged
- `surfaceCards` engine mechanics — unchanged
- Yha and Nyar chains — untouched
- Whisper system — untouched
- `changed_follower` `flavourTextByDrawCount` escalation — preserved, text updated above

---

## §9 — Test Surface

Tests to add/update:

- `changed_follower` deck cap (≤ 3 copies enforced)
- Pooled option selection (2 shown, one per category, no duplicates)
- Pooled option determinism (same draw = same pair)
- `seedMutations` activity log entry
- Doom card 4: Shub → card inserted; Nyar/Yha → inline resource drain, no card
- `shub_niggurath_6` full victory gate: `theChanged ≥ 3` passes, `theChanged = 2` fails full but passes partial
- `the_weight_of_it` opt 1 condition: `followers = 2` → available; `followers = 1` → hidden
- Mutation dark options: effect is `insertCard: changed_follower`, not `theChanged +1`

---

## Implementation order (for writing-plans)

Suggested sequence to avoid broken intermediate states:

1. **Engine: pooled options** — needs to exist before changed_follower card works
2. **Data: changed_follower** — new card definition (tier, options, pool, cap)
3. **Data: mutation dark options** — swap `theChanged +1` → `insertCard: changed_follower`
4. **Data: Shub chain cards** — all 6 cards + shub_words_come_naturally
5. **Data: supporting cards** — fishermans_return opt 3, the_weight_of_it opt 1
6. **Engine: doom card 4 conditional**
7. **UI: theChanged bar suppression + menu display**
8. **Engine: seedMutations log entry**
9. **Tests**
