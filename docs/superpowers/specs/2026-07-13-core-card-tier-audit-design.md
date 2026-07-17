# Core Card Tier Audit & Identity — Design Spec
**Date:** 2026-07-13
**Session:** brainstorm → this spec
**Status:** Approved — ready for implementation planning

---

## Summary

Core cards are always in the deck (labeled "Uncommon" in UI, N=4 per reshuffle). This spec defines what core cards *are*, audits all 17 current core cards against that identity, and specifies changes for cards that don't meet the bar. It also applies the D-s150-1 treat/threat insertion rules retroactively to core cards. Two violations were pre-confirmed in PT25 (the_seance, the_printing_press).

---

## What Core Cards Are

> Core cards are **significant but irregular events** — the town fixtures, civic moments, and cult crises that arrive with real weight and leave a mark. Each should feel like an occasion: a decision that shapes the run, does something mechanically distinctive, or sets something in motion.

**The thematic test:** Could this plausibly happen every week? If yes → it belongs in commons. If no, but it's not a one-off either → it belongs as core.

**The few-shot constraint:** Core cards rotate out (N=4 per reshuffle) and may only appear once per run. Design knowing the consequence — insert, prep-tag, or resource swing — resolves in the same run. The choice should feel weighty because there likely won't be a second chance.

### Three types of core events (all valid):
- **Town fixtures** — civic and institutional moments in the world that the cult must respond to (a fire, an election, a census, a stranger passing through)
- **Cult management crises** — internal moments that define how the organisation operates (a doubting follower, a rival, a séance)
- **Opportunity and resource nodes** — recurring fixtures of the world that can be leveraged (the press, the relic market, the opium den, the harbour)

The type matters less than the *weight*. Any of these is valid as core, as long as it doesn't feel like something that would happen every week.

---

## Standing Rules

**Core cards MUST:**
- Have at least one option that does something mechanically distinctive — inserts a treat or threat, removes a threat, sets a prep-tag, uses randomOutcome, deferGodPathCard, or similar. Pure resource-swap options on every branch are not enough.
- Have meaningful option tension — no single obviously dominant choice.

**Core cards CAN (unlike commons):**
- Grant relics
- Set and condition on prep-tags
- Use randomOutcome, dreadPressureScaling, god path weights, complex conditions (hasCard, notHasPrepTag, etc.)
- Remove threats directly

**Core cards SHOULD NOT:**
- Use flavour framing that implies weekly recurrence (*"once again"*, *"as usual"*, *"every week"*)
- Have every option be a plain resource trade with no mechanical hook

**Treat/threat insertion rules (D-s150-1 applied to core cards):**
- Inserting a **treat**: the option must not be net positive
- Inserting a **threat**: the option should give upfront resource bait (Pattern A — deal-with-the-devil)
- Exception: a deliberate no-reward deferral option (e.g. "Ignore" on A Rival Stirs, P14-14) is an accepted Pattern A exception — the absence of bait *is* the penalty

---

## Card Audit Verdicts

| Card | Verdict | Notes |
|---|---|---|
| A Stranger Asks Questions | ✅ Keep | removeRandomThreat on opt2 is the distinctive hook. Strong three-way tension. |
| The Landlord Cometh | ✅ Keep | Two threat inserts with proper Pattern A bait. hasCard gate on opt3 is clean. |
| The Relic Market | ✅ Keep | Three currencies for one relic — valid market structure. opt2 inserts scrutiny as the risk path. |
| The Old Book | ✅ Keep | dreadPressureScaling, prep-tag, threat insert with bait. Thematically rich. |
| The Harbour | ✅ Keep | Treat insert behind dread cost is correct. something_on_the_hook chain is high-value. |
| The Fire | ✅ Keep | Clean three-way split. arson_inspector insert is well-baited. |
| The Opium Den | ✅ Keep | prep-tag, treat insert (the_dreamer) with dread cost offsetting influence gain. Strong. |
| The Census Agent | ✅ Keep | All three options have inserts. Pattern A on opt1+2. Clarence mechanic on opt3 is distinctive. |
| A Wedding to Officiate | ✅ Keep | deferGodPathCard is mechanically unique. Flat opts 2–3 acceptable given opt1's hook. |
| A Rival Stirs | ✅ Keep | opt3 "Ignore" inserts rival_escalation with zero bait — intentional procrastination design (P14-14). Confirmed leave as-is. |
| The Séance opt1 | ✅ Keep | Steep cost (influence-1, followers-1, dread+2) + prep-tag gate is intentional — prep-tag delivers outsized value on later chain cards. |
| A Follower Confesses Doubt | ⚠️ Enrich | Only 2 options — thin for a core card. opt2 Pattern A gap. See changes. |
| Supplies Dwindle | ⚠️ Enrich | opts 1–2 are plain resource swaps — common-tier. opt3 bait is over-generous. See changes. |
| Woodcutter's Report | ⚠️ Enrich | opt2 "Decline" is a flat resource swap — no hook for a few-shot card. See changes. |
| Local Elections | ⚠️ Differentiate | opts 1 and 2 both insert political_debt — reduces the felt weight of the choice. opt3 is flat. See changes. |
| The Séance opt2 | ❌ Fix | "Let them do it alone": followers+1 + wandering_soul (treat) = net positive + treat. D-s150-1 violation. PT25 confirmed. |
| The Printing Press opt3 | ❌ Fix | "Forgery work": gold-2, dread-2 + forgers_debt (treat) — dread relief tips it net positive. D-s150-1 violation. PT25 confirmed. |
| The Printing Press opt4 | ❌ Remove | "Offer Workers" — remove per PT25. |

---

## Changes Specified

### A Follower Confesses Doubt

**opt2 — add gold+1 bait:**
- Before: influence-1 → insertCard(loose_end)
- After: influence-1, **gold+1** → insertCard(loose_end)
- Rationale: Pattern A requires upfront resource gain when inserting a threat. They left something awkward on the table on the way out.

**opt3 — new option:**
- Label: *"The doubt has a use"*
- Effects: followers-1, gold-1, influence-1 → relics+1
- No insert needed — opt2 already covers the card's "leave a mark" requirement
- Flavour register: treat something horrifying as an administrative outcome. *"It took all three to arrange. The doubt resolved itself."*
- Rationale: dark exploitation path. Converts a problem into a resource. Multi-resource cost makes it genuinely situational.

---

### The Academic Society — opt1

- Before: gold-1, influence+1 → insertCard(a_useful_contact)
- After: gold-1, **influence-1** → insertCard(a_useful_contact)
- Rationale: gold-1, influence+1 was borderline net positive before the treat insert. Two-resource cost (gold+influence) makes the treat the reward rather than a bonus on top of influence gain. "Thoroughly boring. Extremely useful." — boring enough to cost standing, but you made the contact.

---

### a_useful_contact (treats.ts) — opt3

- Before: condition `hasCard(investigators_file)`, hideWhenUnavailable, effects: dread-1, removeCard(investigators_file), removeCard(a_useful_contact)
- After: no condition, effects: **dread-2**, removeCard(a_useful_contact)
- Rationale: situational file-removal mechanic adds complexity without much payoff. Clean dread-2 makes the treat's three options read as: followers+2 / gold+2 / dread-2 — each appealing in different run states.

---

### Local Elections

**opt2 — drop political_debt insert:**
- Before: gold-1, followers+1 + insertCard(political_debt)
- After: gold-1, followers+1 *(no insert)*
- Rationale: opts 1 and 2 inserting the same card made the choice feel like resource preference, not a real decision. Quiet backing carries less exposure and no formal obligation.

**opt3 — rewrite:**
- Before: "Stay out" — followers-1, dread+1
- After: "Redirect them" — followers-1, influence+1, no insert
- Rationale: staying out conspicuously, while steering your people away from the election, reads as principled in this town. You lose a follower to the political energy but gain influence for the display of control.
- Flavour direction: *"You find them other priorities. The ward notices your discretion."*

---

### The Séance — opt2

- Before: "Let them do it alone" — followers+1 → insertCard(wandering_soul)
- After: "Let them do it alone" — **followers-1** → insertCard(wandering_soul)
- Rationale: one follower was consumed or changed by what came through. Paying a follower to get a treat is the correct pattern.

---

### The Printing Press — opt3 and opt4

**opt3 — remove dread-2:**
- Before: gold-2, dread-2 → insertCard(forgers_debt)
- After: gold-2 → insertCard(forgers_debt)
- Rationale: dread relief tipped this to net positive + treat. Forgery reduces paperwork, not anxiety. Paying gold to unlock forgers_debt is the correct pattern.

**opt4 — remove entirely:**
- "Offer Workers" (followers-2, gold+1, influence+1) — removed per PT25.

---

### Supplies Dwindle

**opt1 — add influence+1:**
- Before: gold-2, followers+1
- After: gold-2, followers+1, **influence+1**
- Rationale: visible generosity builds standing. Spending to provision the congregation is a public act.

**opt2 — add randomOutcome:**
- Before: followers-1, gold+1
- After: followers-1 → randomOutcome (weight:1 / weight:1):
  - Branch A: gold+1 *(clean return)*
  - Branch B: gold+1, dread+1 *(they found something out there)*
- Rationale: foragers combing the area might encounter the wrong thing. Equal odds per D-s148-1.

**opt3 — reduce bait:**
- Before: influence+3, dread-1 → insertCard(desperate_congregation)
- After: **influence+2**, dread-1 → insertCard(desperate_congregation)
- Rationale: influence+3 was over-generous for a single threat insert. influence+2 keeps the option attractive while staying within Pattern A norms.

---

### Woodcutter's Report — opt2

- Before: "Decline" — influence+1, dread+1
- After: "Buy the rumour, not the map" — gold-1, influence+2, no insert
- Rationale: instead of a flat "no thanks," you buy the information and spend it socially without going to the grove. Costs gold, gives more influence than opt1's minimal gain, and is thematically distinct from actually buying the map.
- Flavour direction: *"You pay for the story. It travels well. The grove stays where it is."*

---

## Out of Scope

- Shub mutation cards (`mutations.ts`) — separate mechanical class, own design rules
- God path cards — separate audit
- Rare card audit — separate item (PT25 flagged separately)
- Flavour text rewrites beyond the structural changes above — thematic agent pass can follow once mechanics are locked

---

## Implementation Notes

- Changes touch: `src/data/cards/core.ts`, `src/data/cards/treats.ts`
- No new cards added or removed (Printing Press opt4 removed, Follower Confesses Doubt opt3 added)
- All randomOutcome branches must use weight:1 (D-s148-1)
- Length caps apply: option flavour ≤ 80 chars, card body ≤ 108 chars (P20-G)
- After changes: run vitest — no engine logic changes expected, tests should stay green
- Thematic agent pass recommended for new opt3 copy (Follower Confesses Doubt, Woodcutter's Report opt2, Local Elections opt3)
