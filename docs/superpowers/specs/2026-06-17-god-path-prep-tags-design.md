# God Path Preparation Tags — Design

> Replaces the `surfaceGodPathCard` mechanic (P14-4). Introduces weekly-reset
> preparation tags that unlock conditional bonus options on chain card stages 2–5.

**Goal.** Give the player a clear, motivated reason to manipulate god-path timing.
Today, `surfaceGodPathCard` is a mechanically weak lever (the chain card is going
to appear this week anyway) with theme-clashing carriers. Replace it with a prep
system where 4 existing carrier cards mark the run for a single week, unlocking a
themed bonus option on a paired chain stage; complement with a new `deferGodPathCard`
effect that lets the player buy time to draw the prep card first.

**Architecture.** New run-state field `prepTags: string[]` cleared on every reshuffle.
New effects (`setPrepTag`, `consumePrepTag`, `deferGodPathCard`) and new condition
(`hasPrepTag`). Existing `advanceGodPath` is untouched. `surfaceGodPathCard` is
removed from the type system and engine. Tag pairings are uniform across the three
god paths (stage 2 ↔ `studied`, stage 3 ↔ `attended_seance`, stage 4 ↔ `opium_pact`,
stage 5 ↔ `recited`). Stage 1 (intro) and Stage 6 (final summoning) carry no prep
slot. The bonus option is greyed out and visible on the chain card preview when its
required tag is not currently set.

**Tech Stack.** TypeScript, React, Zustand. Tests via Vitest.

---

## Tag system

### State

Add to `GameState`:
```ts
prepTags: string[]
```

Initial value: `[]`. Reset to `[]` at the start of every `reshuffleOnly` (both
tutorial and non-tutorial branches). Persisted to save data alongside other run
state.

### Effects

Add to the `Effect` union:
```ts
| { type: 'setPrepTag'; tag: string }
| { type: 'consumePrepTag'; tag: string }
| { type: 'deferGodPathCard' }
```

Remove from the `Effect` union:
```ts
| { type: 'surfaceGodPathCard' }   // ← deleted
```

Engine behaviour:

- **`setPrepTag`** — push `tag` onto `state.prepTags` if not already present.
- **`consumePrepTag`** — remove the first occurrence of `tag` from `state.prepTags`.
  No-op if the tag is not present (silently skip; the option's gating condition
  should have already prevented the option from being selectable without it).
- **`deferGodPathCard`** — find the first card with `tier === 'god_path'` in
  `deck.drawPile`. If found, splice it out and re-insert at
  `Math.min(currentIdx + 4, drawPile.length - 1)`. If not found (already drawn,
  in `chainReserve`, or in `nextCycleQueue`), no-op.

### Conditions

Add to the `Condition` union:
```ts
| { type: 'hasPrepTag'; tag: string }
```

Evaluates true when `state.prepTags.includes(tag)`.

### Tag → Stage mapping (uniform across gods)

| Tag | Set by | Triggers bonus on | Theme |
|---|---|---|---|
| `studied` | `the_old_book` "Hire a translator" | Stage 2 of active god path | Forbidden knowledge |
| `attended_seance` | `the_seance` "Attend and steer" | Stage 3 of active god path | Reaching across |
| `opium_pact` | `the_opium_den` "Encourage the visits" | Stage 4 of active god path | Induced contact |
| `recited` | `what_was_already_read` "The words arrange themselves" | Stage 5 of active god path | Words that cannot be unspoken |

Stage 1 (introduction) and Stage 6 (summoning) carry **no** bonus options — these
stages must remain pure narrative beats.

### Carrier card changes (4 cards)

Each of the four prep options today has effect `{ type: 'surfaceGodPathCard' }`.
Replace with `{ type: 'setPrepTag', tag: '<tag>' }`. No other change. A `(?)` hint
is added to the option label: *"Marks you as <tag> this week."* (The `<tag>` is
shown to the player as `STUDIED`, `ATTENDED SEANCE`, etc. — small-caps.)

Carrier cards retain ≤ 3 options each (no expansion).

---

## Chain card bonus options (12 cards modified)

Each chain card at stages 2, 3, 4, 5 across all three gods gains ONE new
conditional option, gated by `hasPrepTag`. The option includes a
`consumePrepTag` effect to consume the tag on use.

Bonus-option content (effect numbers, flavour text, label) is **out of scope
for this design** — that pass is delegated to the thematic + balance agents
after the engine is in place.

**Authoring rule:** Each chain card stays at ≤ 3 options total. Cards that
currently have 3 options will need their authoring trimmed during the content
pass to make room for the prep bonus, or the bonus is dropped for that card.

### Visibility

- **Chain card preview** (when peeking from the activity log, deck preview, or
  in-hand): the bonus option is rendered always, **greyed out** when the
  required tag is unset, with a requirement badge: *"❖ requires: STUDIED this
  week."* When the tag is set in the current week, the option renders normally,
  prefixed with **❖** in `var(--gold-bright)` with a soft text-shadow glow
  (`text-shadow: 0 0 6px rgba(200,160,40,0.6)`).
- **Drawn chain card (live)**: if the tag is set, the bonus option appears in
  the normal options column, prefixed with **❖** in gold. If the tag is unset,
  the option is hidden entirely (no greyed-out clutter in the active card UI).

### The ❖ icon

The black diamond character (`❖`) is the **prep slot marker**. It appears:

- On the chain card preview, prefixing every prep-bonus option (greyed or active).
- On the drawn chain card, prefixing the active prep-bonus option in gold.
- On the prep card's option label, after the option text, as a small badge to
  signal "this option marks you for this week." (Plain text colour, no glow —
  the prep card itself is not the climactic moment.)

---

## Defer cards (2 carriers)

Two cards gain a `deferGodPathCard` option. Both options also cost some
resource so defer is never a free button.

### Core carrier: `the_promotion`

Modify the existing core card. One option is repurposed:

- **Label:** "Take the role"
- **Effects:** `-2 influence`, `deferGodPathCard`
- **Flavour:** *(authored by thematic agent)*

Card stays at ≤ 3 options.

### Rare carrier: `the_diocese_sends_word` (new card)

A new rare card. Single-flavour, low-option-count, defer-focused.

- **Tier:** rare
- **Title:** "The Diocese Sends Word"
- **Flavour text:** *"The bishop's letter is brief. The questions in it are not."*
- **Options:** ≤ 3, authored by thematic agent. At least one carries
  `deferGodPathCard` with an influence or dread cost.

**Art prep.**

- Add prompt file: `Art/Defer Cards/the_diocese_sends_word.md` containing the
  art direction (theme, composition guidance, mood — *bishop's seal on parchment,
  candlelit study, formal interrogation about the cult's books*).
- Reserve image slot: register `the_diocese_sends_word` in `CARD_ART` map with
  path `'/cards/the_diocese_sends_word.jpeg'`. Image file added later by the
  art pipeline.

---

## Week banner — prep nudge

The reshuffle Week banner (rendered above the draw deck) currently shows:
```
Week N
<flavour line>
A new week begins.
Doom escalates
```

Add a fourth conditional subtitle line when, at the start of the new week:

- The active god path is between stages 2 and 5 inclusive, **and**
- The tag paired to the current stage is **not** present in `prepTags` after
  reset (it is `[]` at reshuffle so this is always true if the stage is in
  range — i.e., the line shows on every reshuffle entering stages 2–5)

Line content varies by god (thematic agent authors the per-god copy):

| God | Stage 2–5 subtitle |
|---|---|
| Y'ha-nthlei | *"A new mark of the deep waits for your study."* |
| Nyarlathotep | *"A new shape stalks the periphery this week."* |
| Shub-Niggurath | *"The roots stir with a fresh hunger."* |

These are placeholder lines — final copy by thematic agent. Styling matches the
existing flavour subtitle (italic, 0.8rem, dim text colour).

---

## Effects removed

- `surfaceGodPathCard` is removed from `Effect` union, from
  `EffectTags.tsx` rendering, and from the engine switch in `gameStore.ts`.
- The four prep-carrier options (table above) have their effect replaced with
  `setPrepTag`. No card loses options; no card gains options.
- Three further cards currently carry `surfaceGodPathCard` effects that fall
  outside the prep system: `the_thing_in_the_tank` (1 option),
  `grove_awaits` (2 options). The god-path lever is **dropped entirely** on
  these three card-option entries; the effect slot is replaced with a
  non-god-path effect (resource shift, peek, remove, etc.) authored by the
  thematic agent in the content pass. The implementation plan must remove
  the `surfaceGodPathCard` line from these option effect lists during the
  engine pass — leaving a `// TODO(thematic): replacement effect for s86 content pass`
  comment as a placeholder so the option's other effects continue to compile
  and play in a degraded but functional form.
- Tests previously asserting `surfaceGodPathCard` behaviour are deleted or
  rewritten to assert `setPrepTag` behaviour.

`advanceGodPath` is **untouched** — it remains the only stage-completion
mechanism and continues to fire only on chain card advance options.

---

## Engine changes (file-by-file)

### `src/types/index.ts`

- Add `prepTags: string[]` to `GameState`.
- Add the three new effect types to the `Effect` union.
- Add `hasPrepTag` to the `Condition` union.
- Remove `surfaceGodPathCard` from the `Effect` union.

### `src/state/gameStore.ts`

- Initial state: `prepTags: []`.
- `resetGame`: reset `prepTags` to `[]`.
- `reshuffleOnly` (both tutorial and non-tutorial): set
  `prepTags: []` in the `set(...)` call alongside the existing log reset.
- Effect switch: handle `setPrepTag`, `consumePrepTag`, `deferGodPathCard`.
  Remove `surfaceGodPathCard` case.
- Save/load persistence: serialise `prepTags` to/from save data.

### `src/engine/godPath.ts` (where `checkCondition` lives)

- Add `case 'hasPrepTag'` to the `checkCondition` switch: returns
  `state.prepTags.includes(cond.tag)`.
- Extend the `state` parameter of `checkCondition` with `prepTags: string[]`
  so callers can pass it through.

### `src/components/game/EffectTags.tsx`

- Remove the `surfaceGodPathCard` branch.
- Add a small `setPrepTag` tag: renders **❖** prefix + tag label small-caps
  (e.g. *"❖ studied"*).
- Add a `deferGodPathCard` tag: similar styling to the original
  surface tag but with a "later" connotation (e.g. *"god path → later"*).

### `src/components/game/CardPreviewModal.tsx` (or wherever card previews live)

- When previewing a chain card, render bonus options with `hasPrepTag`
  conditions even when the player does not have the tag — greyed out, with the
  **❖** requirement badge.

### `src/components/game/OptionsColumn.tsx`

- On the drawn chain card, options gated by `hasPrepTag` are hidden when the
  tag is absent (default condition-gating behaviour — no change needed unless
  the condition system currently hides options).
- When the option is visible, prefix the label with **❖** in
  `var(--gold-bright)` and apply the gold text-shadow glow.

### `src/components/game/WeekBanner.tsx`

- Accept a new optional prop `prepNudge?: string`.
- When provided, render as a fourth flavour line beneath "Doom escalates".

### `src/state/gameStore.ts` (WeekBanner wiring)

- The parent that mounts `WeekBanner` computes the per-god nudge string when
  `godPathProgress` ∈ {1, 2, 3, 4} (i.e. next chain stage is 2–5) and passes it
  to the banner.

### `src/data/cards/core.ts`

- `the_old_book` "Hire a translator": effect → `setPrepTag: studied`.
- `the_seance` "Attend and steer": effect → `setPrepTag: attended_seance`.
- `the_opium_den` "Encourage the visits": effect → `setPrepTag: opium_pact`.
- `the_promotion` "Take the role": effects updated to include
  `deferGodPathCard` + resource cost (existing cost may be tuned).

### `src/data/cards/threats.ts`

- `what_was_already_read` "The words arrange themselves": effect →
  `setPrepTag: recited`.

### `src/data/cards/rares.ts` (or wherever rares live)

- Add new rare card `the_diocese_sends_word` (full card definition).

### `src/data/godPaths/yha_nthlei.ts`, `nyarlathotep.ts`, `shub_niggurath.ts`

- Stages 2, 3, 4, 5 of each chain card: add one new conditional option gated
  by `hasPrepTag` with the appropriate tag. Bonus-option content authored by
  the thematic + balance agents in a follow-up pass.

### `src/data/cardArt.ts`

- Add `the_diocese_sends_word: '/cards/the_diocese_sends_word.jpeg'`.

### `Art/Defer Cards/the_diocese_sends_word.md` (new file)

- Art prompt with composition, mood, colour palette.

---

## Tests

### New vitest cases (`src/state/gameStore.test.ts`)

1. `setPrepTag` effect adds the tag to `prepTags`.
2. Duplicate `setPrepTag` for an already-present tag is a no-op (no duplicate).
3. `consumePrepTag` removes the tag.
4. `consumePrepTag` on an absent tag is a no-op.
5. `deferGodPathCard` moves the current god_path card later in `drawPile`.
6. `deferGodPathCard` is a no-op when no god_path card is in `drawPile`.
7. Reshuffle (tutorial + non-tutorial) resets `prepTags` to `[]`.
8. A chain card's prep-bonus option is gated correctly:
   - Selectable when `hasPrepTag` is satisfied.
   - Not selectable / hidden otherwise.
9. Selecting a prep-bonus option consumes the tag (`prepTags` no longer
   contains it after resolution).
10. Save/load round-trips `prepTags` correctly.

### Existing tests to update

- `surfaceGodPathCard`-related test cases: removed or rewritten as the
  effect no longer exists.

---

## Out of scope (delegated)

- **Bonus-option content for the 12 chain cards** — labels, flavour text,
  effect numbers. Delegated to thematic + balance agents in a follow-up
  session after the engine is in.
- **Replacement effects for `the_thing_in_the_tank` and `grove_awaits`
  (2 options)** — the engine pass strips the `surfaceGodPathCard` line and
  leaves a TODO comment. Thematic agent authors the replacement effect(s)
  in the same follow-up content pass as the chain card bonus options.
- **Final `the_diocese_sends_word` option count and effects** (beyond at least
  one carrying `deferGodPathCard`) — delegated to thematic + balance agents.
- **Per-god Week banner nudge copy** — placeholder strings shown above;
  thematic agent finalises.
- **Art asset for `the_diocese_sends_word`** — prompt file is part of this
  spec; image generation is downstream.

---

## Why this design

- **Motivates the lever.** Players have a clear, single-sentence reason to
  surface or defer: *"I haven't prepped yet — buy me time."* / *"My prep is
  ready — encounter now."* The existing surface mechanic provides neither.
- **Honours the carrier theme.** The four prep cards (`the_old_book`,
  `the_seance`, `the_opium_den`, `what_was_already_read`) are already
  thematically about preparation, knowledge, and contact. The prep tag system
  makes them *do* what their names already imply.
- **Caps the strategy depth.** Tags reset per week and a tag pairs with exactly
  one stage. Players cannot bank prep across the run; the loop is small and
  contained within a single reshuffle cycle.
- **Discoverable without hand-holding.** The chain card preview shows
  greyed-out bonus options with their tag requirements; the prep card option
  shows the `(?)` hint and ❖ badge. The connection requires both halves but is
  legible by reading the cards.
- **Removes a known broken mechanic.** `surfaceGodPathCard` is unmotivated for
  the player and conflates with `advanceGodPath`. Deleting it simplifies the
  effect surface area.
