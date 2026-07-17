# P17-15 — "What Was Already Read" redesign + option-visibility audit

Date: 2026-06-24
Source: [[Playtest 17]] line 29 (Cluster T9)
Approach: **A — "Not yet / Now"** (user-selected)

## Problem

`what_was_already_read` (threats.ts) is the carrier for the yha `recited`
prep-tag route. `the_old_book → "Burn it"` inserts it; reaching dread ≥6 and
choosing "The words arrange themselves" sets `recited`, later consumed by the
god-path chain card "Speak the closing rite".

Three player complaints (Playtest 17):

1. **It never leaves and keeps reinserting.** None of the three options removes
   the card: "Acknowledge it" reinserts a copy mid-deck, "File it away" only
   costs gold, "The words arrange themselves" only sets the prep tag. As an
   auto-derived `recited` carrier it is also excluded from `removeRandomThreat`.
   So below dread 6 the card is a permanent, randomly-reappearing nag.
2. **Options are hidden, not disabled.** "File it away" uses
   `hideWhenUnavailable: true`; the dread split makes options appear/vanish.
   The player wants gated options shown greyed-out, not removed.
3. **Dread-requirement pill looks clickable.** The red `1px` border on the
   dread-condition pill reads as a tappable control.

## Design (Approach A)

### Card mechanic — two always-visible options

Replace the three options with two:

1. **"Set it aside"** — `dread +1`. Condition: `resourceMax dread 5`.
   No `insertCard`. The card resolves to discard and reshuffles back naturally
   like any threat — no random mid-deck reinsert. The +1 dread means repeated
   deferrals organically climb toward the dread-6 recite threshold, so the card
   self-resolves over time instead of nagging forever.
2. **"The words arrange themselves"** — `setPrepTag recited` **+ `removeCard`
   self**. Condition: `resourceMin dread 6`. Reciting now permanently clears the
   card, so it can no longer linger or re-grant the tag.

Delete the redundant gold-sink "File it away" option (YAGNI — it never removed
the card and duplicated the low-dread stall).

`uniqueInDeck: true` retained. Card stays a `recited` carrier (auto-derived from
the `setPrepTag` on option 2).

### Visibility — disabled, not hidden

Neither option uses `hideWhenUnavailable`. With the flag absent, the engine
(`getVisibleOptions`) returns both options as `available: false` (not `hidden`)
when their dread condition fails, so the player always sees both, greyed, with
the existing dread-condition pill explaining the gate (`≤5` / `≥6`). Scope is
this card only; `hideWhenUnavailable` behavior elsewhere is untouched.

### Visual — borderless dread pill

In `OptionsColumn.tsx`, the dread-condition pill (the `extractResourceConditions`
→ dread branch) drops its `border: '1px solid rgba(180,80,80,0.3)'`, keeping the
icon, colour, and `≥N`/`≤N` text. This is the shared dread-pill style, so the
change applies to every card's dread pill — correct, since it is an info pill,
not a button. The affordability-shortfall pill keeps its border (different
concept, not in scope).

## Tests

Rewrite the `what_was_already_read dread gate (S3)` block in `gameStore.test.ts`:

- dread ≥6: "The words arrange themselves" available; "Set it aside" present but
  not available.
- dread ≤5: "Set it aside" available; "The words arrange themselves" present but
  not available.
- Both options always non-hidden regardless of dread (no `hideWhenUnavailable`).
- Resolving "The words arrange themselves" sets `recited` and removes the card
  from the deck.

## Out of scope

- Global hide→disable change (user chose "just this card").
- Other cards' dread/resource gates.
- Balance of the `recited` route beyond this card.
