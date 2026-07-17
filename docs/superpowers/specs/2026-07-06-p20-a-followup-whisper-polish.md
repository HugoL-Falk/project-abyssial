# P20-A Follow-Up — Whisper Polish

**Date:** 2026-07-06
**Status:** Approved for implementation
**Session:** s129
**Scope:** `src/engine/whispers.ts` only — no engine or type changes.

---

## Overview

Three follow-up items from P20-A (whisper redesign):

1. **`the_newspaper` — add meaningful downside.** Whisper was strictly better than base option (net: +1 inf for +1 dread). Fix: insert `the_newspaper_article` threat card as a delayed consequence.
2. **`the_seance` — pre-emptive power nerf.** `surfaceChainCard` currently places the next god-path card at position 0 (immediate next draw), risking Nyarlathotep trivialisation. Fix: clamp to positions 2–4.
3. **Thematic pass — 15 new whisper flavour texts.** P20-A implementation wrote placeholder texts; a full thematic agent pass is needed to bring them to production quality.

---

## 1. `the_newspaper` — threat insert

**File:** `src/engine/whispers.ts`

**Change:** Add `insertCard` effect to the existing whisper option.

```ts
the_newspaper: {
  label: '"The wrong people are already reading it."',
  flavourText: '<see §3 — thematic agent to sharpen>',
  effects: [
    { type: 'resource', resource: 'influence', delta: 3 },
    { type: 'resource', resource: 'dread',     delta: 2 },
    { type: 'insertCard', cardId: 'the_newspaper_article', position: 'random', minPos: 4, maxPos: 8 },
  ],
  isWhisper: true,
  replacesSlot: 1,
},
```

**Design invariant check:**
- Better than base ("Let it run": +2 inf, +1 dread): +1 more influence ✓
- Worse than base: +1 extra dread AND a future threat card ✓
- Not net-negative: influence gain remains real ✓

**Flavour text:** Thematic agent must sharpen — current "The story spread where it was meant to. The wrong people read very carefully." should acknowledge the follow-up consequence (the scrutiny that results, not just the reading).

---

## 2. `the_seance` — surface position clamp

**File:** `src/engine/whispers.ts`

**Change:** Add `minPos: 2, maxPos: 4` to the `surfaceChainCard` effect.

```ts
the_seance: {
  label: '"Let it have the room."',
  flavourText: 'It had already taken the room. You just made it official.',
  effects: [
    { type: 'surfaceChainCard', minPos: 2, maxPos: 4 },
    { type: 'resource', resource: 'dread', delta: 2 },
  ],
  isWhisper: true,
  replacesSlot: 1,
},
```

**Rationale:** Without bounds, `surfaceChainCard` defaults to position 0 — the player draws the god-path card immediately on their next draw. Positions 2–4 preserves the timing advantage (card is guaranteed to arrive soon) without making it the literal next card. Still a meaningful effect; still distinct from the base option (which inserts `wandering_soul`, a random-position threat).

**The seance base option comparison:**
- Base ("Let them do it alone"): +1 fol, insert wandering_soul at random 3–7 (bad card, unpredictable)
- Whisper: surfaceChainCard minPos:2 maxPos:4, +2 dread (useful card, predictable timing, costs more dread)
- Invariant: better (predictable god-path advance vs random bad card), worse (dread cost + god-path consequence) ✓

**Monitoring resolved:** This closes the `the_seance` watch item from handoff. No further playtest monitoring needed unless god-path routing proves trivial despite the position clamp.

---

## 3. Thematic Pass — 15 new whisper flavour texts

**File:** `src/engine/whispers.ts`

**Agent:** Thematic (Haiku). Claudian reviews output and applies accepted rewrites.

### Voice constraints

- Past tense, matter-of-fact deadpan — narrator is the cult, not the entity
- Entity is implied by the situation, never named or described directly
- No grandiosity, no rhetorical flourishes as ending beats
- ≤108 characters per text
- No repetition of imagery, sentence structure, or opening word across the 15 entries in this pass
- Two-sentence maximum; one sentence preferred where possible

### Targets (15 entries)

Agent output per entry: **KEEP** (current text is strong) or **REWRITE** with proposed replacement + char count.

#### New commons (8)

| ID | Current flavour text |
|---|---|
| `the_inheritance` | The family was already gone. We only made it official. |
| `the_newspaper` | The story spread where it was meant to. The wrong people read very carefully. *(must sharpen — see §1)* |
| `word_spreads` | The word reached further than expected. They were already quoting it back at us. |
| `the_harbormaster` | She named the price. We paid. The one who didn't return was already written off. |
| `the_left_item` | It sat where he left it. Three new faces appeared the day someone moved it. |
| `the_collection` | They gave what was asked. Two of them won't be asked again. |
| `the_complaint` | We said nothing. They heard authority in it. |
| `the_delayed_shipment` | It arrived empty. We'd already removed what mattered. |

#### New cores (7)

| ID | Current flavour text |
|---|---|
| `stranger_asks_questions` | He saw the space between the prayer and the practice. He stayed anyway. |
| `the_harbour` | Three of the crew knew what it was. The rest found out by proxy. |
| `the_fire` | They suspect us now. Someone found that suspicious compelling. |
| `the_printing_press` | The run cost more than expected. The text arrived anyway. No corrections needed. |
| `the_opium_den` | Two of them went further than they came back. A relic surfaced in the exchange. |
| `the_wedding_rite` | The words came as a gift. The followers heard them as a summons. Both correct. |
| `supplies_dwindle` | The provisions ran out. The whisper did not. No one mentioned the discrepancy. |

### Reference texts (original 8 — not to be changed, voice anchors)

Agent should use these as calibration for tone:

- `congregation_meets`: *The words landed like coins in a bowl. The air felt heavier. Nothing was agreed.*
- `the_donation`: *You did. The money arrived anyway. No note this time.*
- `the_landlord_cometh`: *The payment was prompt. One of ours offered to make the delivery.*
- `follower_confesses_doubt`: *The doubt was real. So was what replaced it.*
- `the_old_book`: *The language was wrong. The meaning was precise.*
- `rival_stirs`: *The rival cult was never a rival. They were an audience waiting for the right speaker.*
- `academic_society`: *Several left. More arrived the following week. The ones who arrived had already heard.*
- `the_seance`: *It had already taken the room. You just made it official.*

---

## 4. Testing

- No new unit tests required — this is data-only (effects + strings).
- Verify: `the_newspaper` whisper in the EffectTags preview shows the threat insert indicator.
- Verify: `the_seance` whisper does not surface a god-path card to position 0 in a test run.
- Run `vitest` — all 242 tests should continue to pass unchanged.

---

## 5. Out of scope

- The `the_seance` base card options are unchanged.
- The 8 original whisper flavour texts (listed as reference in §3) are not touched.
- `the_opium_den` missing `notHasPrepTag: opium_pact` guard remains a low-priority open commitment in handoff — not addressed here.
