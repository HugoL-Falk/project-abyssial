# P20-A Whisper Redesign — Design Spec

**Date:** 2026-07-04
**Status:** Approved for implementation
**Session:** s121

---

## Overview

The whisper system currently appends an extra option to whispered cards (additive). This causes two problems:
(a) The extra option feels out of place — visually a 4th or 5th option with no clear relationship to the others.
(b) It produced duplication bugs when the injected option persisted across reshuffles (fixed in `2c367ee`).

**New design:** Whispers **replace** a designated base option with an amplified, more dangerous variant. The player picks it for the same reason as the original — same economic purpose — but the entity's involvement makes the primary payoff bigger while adding new costs. Whether the whisper is attractive depends on game state: a relic-starved player grabs the old_book whisper; a dread-heavy player avoids it. This context-dependence is the intended design.

**Tone:** Dark amplification (B) is the default — same option, pushed further into darkness. Temptation (A) applies where the entity extracts a secondary resource to boost the primary. A few whispers are entity-driven exceptions where the offer is categorically different (the_seance).

---

## 1. Pool Expansion

**Current pool:** 8 cards (2 common, 6 core)
**New pool:** 23 cards (10 common, 13 core)

**Active per run:** 5, chosen randomly at seed time (unchanged).

### All commons (10)
`congregation_meets`, `the_donation`, `the_inheritance`, `the_newspaper`, `word_spreads`,
`the_harbormaster`, `the_left_item`, `the_collection`, `the_complaint`, `the_delayed_shipment`

### Core selection (13 = 6 existing + 7 new)
Existing: `the_landlord_cometh`, `follower_confesses_doubt`, `the_old_book`, `rival_stirs`, `academic_society`, `the_seance`
New: `stranger_asks_questions`, `the_harbour`, `the_fire`, `the_printing_press`, `the_opium_den`, `the_wedding_rite`, `supplies_dwindle`

### Excluded core (4)
`relic_market`, `local_elections`, `woodcutters_report`, `the_census_agent`
Rationale: transactional/civic flavour doesn't fit the entity's register; woodcutters_report has a randomOutcome that resists clean slot replacement; the_census_agent's Clarence option is already dark without amplification.

---

## 2. Engine Change — Override/Replace

### 2a. Type change

Add `replacesSlot?: number` to `CardOption` in `types/index.ts` (0-indexed). Present only on whisper options that target a specific slot. The generic fallback whisper (Whispered Counsel blessing) has no `replacesSlot` and continues to use the append path.

```typescript
// types/index.ts — add to CardOption
replacesSlot?: number   // which base option index to swap out at draw time
```

### 2b. Draw-time injection (`gameStore.ts` drawNextCard)

**Current:**
```typescript
{ ...card, options: [...card.options, whisperOption] }
```

**New:**
```typescript
if (whisperOption.replacesSlot !== undefined) {
  const newOptions = [...card.options]
  newOptions[whisperOption.replacesSlot] = whisperOption
  currentCard = { ...card, options: newOptions }
} else {
  // Fallback: append (generic whisper / Whispered Counsel blessing)
  currentCard = { ...card, options: [...card.options, whisperOption] }
}
```

The replaced option occupies the same list position as the base option — card layout is unchanged.

### 2c. Discard stripping

Already implemented in `2c367ee`: whisper options (`isWhisper: true`) are stripped from the card before it returns to the discard pile. No additional change needed.

### 2d. `WHISPER_POOL_IDS` expansion

Replace the current 8-entry array with all 23 card IDs listed in §1.

---

## 3. Visual Changes

### 3a. Whisper icon

Prefix any option with `isWhisper: true` with **✦** (U+2726 BLACK FOUR POINTED STAR) in **purple** (`#9b59b6`). Display inline before the option label text.

### 3b. Prep-tag diamond recolour

The prep-tag `◆` indicator currently uses a purple/dark colour that collides with the whisper icon. Recolour it to **light blue** (`#5dade2`) everywhere it renders (StructuralTag component and any other prep-tag diamond site).

### 3c. No layout changes

The whispered option occupies exactly the slot it replaced. No new card anatomy required.

---

## 4. Activity Log

When a `seedWhispers` effect fires (Nyarlathotep god path), emit a new `kind: 'whisper'` activity entry listing the card IDs that were newly whispered. Example text: *"The voice reaches: congregation meets, the old book."* This surfaces the entity's action without requiring the player to discover it by drawing the card.

No log entry on draw — the `✦` icon on the option is the in-play signal.

---

## 5. Whisper Variants (23 cards)

### Design invariant
Every whispered option must be strictly better in at least one dimension AND strictly worse in at least one other compared to the base option it replaces. Never net-negative overall.

### Commons (10)

| Card | Slot | Replaces (original effects) | Label | Whisper effects | Tone |
|---|---|---|---|---|---|
| `congregation_meets` | 0 | Pass the plate (+2 gold) | "Speak what they're already thinking." | +3 gold, −1 inf, +2 dread | A |
| `the_donation` | 0 | Accept it (+2 gold, insert strings_attached) | "You already know who sent it." | +3 gold, +2 dread, insert strings_attached | B |
| `the_inheritance` | 0 | Fight it in court (−1 gold, random +2/+3/+4 gold) | "The family was never going to win." | −1 gold upfront + 6-outcome roll (see §5a) | B |
| `the_newspaper` | 1 | Let it run (+2 inf, +1 dread) | "The wrong people are already reading it." | +3 inf, +2 dread | B |
| `word_spreads` | 0 | Lean into it (+1 inf, +2 dread, +1 fol) | "It's further than you think." | +2 inf, +3 dread, +2 fol | B |
| `the_harbormaster` | 2 | Send someone down (+1 gold, −1 fol) | "She already knows the price." | +3 gold, −1 fol, +2 dread | B |
| `the_left_item` | 2 | Call it a donation (+1 fol, +2 dread) | "It was always going to be left." | +2 fol, +3 dread | B |
| `the_collection` | 0 | Press for more (+2 gold, −1 fol) | "They give what is asked of them." | +3 gold, −2 fol, +1 dread | A |
| `the_complaint` | 2 | Leave it unanswered (+1 dread, +1 fol) | "The silence is an answer." | +2 dread, +2 fol | B |
| `the_delayed_shipment` | 2 | Say it was deliberate (+1 inf, +1 dread) | "You already knew what was in it." | +2 inf, +2 dread | B |

#### §5a — the_inheritance 6-outcome randomOutcome

The whisper converts the court case into a high-variance entity-assisted gamble. Still costs −1 gold upfront to file. Six outcomes at equal weight (1/6 each):

| # | Effect |
|---|---|
| 1 | −1 relic |
| 2 | −2 followers |
| 3 | −2 gold |
| 4 | +3 gold |
| 5 | +2 influence |
| 6 | +1 relic |

Rationale: preserves the randomOutcome structure the player already knows, but the entity's involvement makes the swings genuinely extreme — positive and negative. Whether to gamble becomes a real decision.

### Cores (13)

| Card | Slot | Replaces (original effects) | Label | Whisper effects | Tone |
|---|---|---|---|---|---|
| `the_landlord_cometh` | 0 | Pay the rent (−2 gold) | "He won't ask twice." | −2 gold, +1 fol, +2 dread | B |
| `follower_confesses_doubt` | 0 | Counsel them (+1 fol, +1 dread) | "Agree with them." | +2 fol, +2 dread | B |
| `the_old_book` | 0 | Read it yourself (+3 dread, +1 relic) | "Read it in the voice it was written in." | +5 dread, +2 relics | B |
| `rival_stirs` | 2 | Ignore them (insert rival_escalation) | "They were already listening." | +3 fol, +2 dread, removeCard rival_escalation, removeCard their_survivors | B |
| `academic_society` | 1 | Guest speaker (+2 inf, insert investigators_file) | "Tell them what you've actually found." | +3 inf, +2 dread, insert investigators_file | B |
| `the_seance` | 1 | Let them do it alone (+1 fol, insert wandering_soul) | "Let it have the room." | surfaceChainCard, +2 dread | entity exception |
| `stranger_asks_questions` | 0 | Offer him a tour (+1 inf, +1 dread) | "Show him the church." | +2 inf, +2 dread | B |
| `the_harbour` | 0 | Invest in longer lines (−2 gold, +1 fol) | "What they're pulling up isn't fish." | −2 gold, +3 fol, +2 dread | B |
| `the_fire` | 1 | Watch it burn (−1 inf, +1 dread) | "You know why this happened." | −1 inf, +1 fol, +2 dread | B |
| `the_printing_press` | 0 | Propaganda run (−2 gold, +2 inf) | "Put what it asked you to put." | −2 gold, +3 inf, +2 dread | B |
| `the_opium_den` | 0 | Encourage the visits (−2 fol, +2 dread, setPrepTag:opium_pact) | "Let them go as far as they can." | −2 fol, +3 dread, setPrepTag:opium_pact, +1 relic | B |
| `the_wedding_rite` | 2 | Use the pulpit (+1 fol, +1 dread) | "Say what it gave you to say." | +2 fol, +3 dread | B |
| `supplies_dwindle` | 0 | Spend on provisions (−2 gold, +1 fol, −1 dread) | "Something already provided." | −2 gold, +2 fol, +1 dread | B |

### Notes on specific cards

**rival_stirs:** The original "ignore them" option inserts `rival_escalation` (a future problem). The whisper replaces this with follower gain and card removal — the entity simply makes the rival stop being a problem. Keep both `removeCard rival_escalation` and `removeCard their_survivors`; these were in the original whisper design and remain appropriate.

**academic_society:** The whisper keeps the `investigators_file` insert. +1 more influence is the upside; investigators_file AND +2 dread are the costs. Deliberately a desperation pick — useful when influence is critical, risky otherwise.

**the_seance:** Entity-driven exception to the same-purpose rule. The base option lets followers run a séance and risks a wandering soul. The whisper turns that into a direct divine encounter — `surfaceChainCard` + dread. The entity refuses to be a wandering soul; it surfaces itself. Monitor in playtest; downgrade to +2 fol, +3 dread if it trivialises the god path.

**the_landlord_cometh:** Base option is a pure cost (−2 gold, no benefit). The whisper adds +1 fol (entity's involvement draws someone to speak of it) and +2 dread. Even a small gain over a cost-only option justifies the whisper.

---

## 6. Deferred / Out of Scope

- **Flavour text** for each whispered option: not specified in this spec. Thematic pass needed separately (can use existing WHISPER_OPTIONS flavour text where it still fits, otherwise new text via thematic agent).
- **Whispered Counsel blessing** (generic whisper, no `replacesSlot`): continues to use the append fallback. No card in the pool gets a second whisper from this blessing.
- **`the_seance` power level:** flagged for playtest monitoring.
- **Activity log `kind: 'whisper'` entry:** ActivityEntry union type needs a new branch; small type extension, handled in implementation plan.

---

## 7. Testing

**`gameStore.test.ts` — new tests:**
- Draw a whispered card with `replacesSlot=0`: slot 0 is replaced, slots 1+ are unchanged
- Draw a whispered card with `replacesSlot=2`: slots 0, 1 unchanged, slot 2 replaced
- Resolve whispered option → discard → card in discardPile has no `isWhisper` options (existing test `2c367ee` already covers this pattern)
- Generic whisper (no `replacesSlot`) still appends to end (Whispered Counsel fallback)

**`whispers.test.ts` — no new unit tests:** Pool expansion is data-only; `applyWhisperSeed` logic unchanged.

**Manual visual check:** `✦` icon is purple on whispered option; prep-tag `◆` is light blue; no layout shift from replaced option position.
