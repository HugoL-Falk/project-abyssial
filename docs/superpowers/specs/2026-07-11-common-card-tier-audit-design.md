# Common Card Tier Audit & Identity — Design Spec
**Date:** 2026-07-11
**Backlog item:** P24-11
**Status:** Approved — ready for implementation planning

---

## Summary

All common cards are now guaranteed in every run. This spec defines what common cards *are*, audits the current 10 against that identity, and specifies rewrite directions for the 4 that don't meet it. No cards are added or removed. Balance numbers are not changed.

---

## What Commons Are

Commons represent **routine weekly occurrences** — standing patterns in the cult's administrative life. Each card should feel like something that happens most weeks, not a singular event. Where strict weekly framing is awkward, lean into "mundane event of the week" (different specifics, same recurring type of problem).

**Standing rules for commons (all existing, confirmed):**
- No relic grants
- No prep-tag conditions
- No high-tier effects: no `advanceGodPath`, `seedMutations`, `seedWhispers`, `surfaceCards`, `surfaceChainCard`
- Flavour register: deadpan bureaucratic absurdism — competent, weary, untroubled

---

## Scope

**In scope:** 10 true common cards in `src/data/cards/common.ts`

**Out of scope:** Shub mutation cards in `mutations.ts` (second_account, word_has_spread_further, second_run, still_open, the_merchant_again). These are a separate mechanical class seeded by `seedMutations`.

**Constraint:** `word_spreads` is mutation-linked (mutates → `word_has_spread_further`). Mechanical identity must be preserved; flavour changes are fine.

---

## Card Audit Verdicts

| Card | Verdict | Reason |
|---|---|---|
| The Congregation Meets | **Keep** | Weekly meeting. Congregation management shape is clear and distinctive. |
| The Collection | **Keep** | Weekly collection plate. Gold engine with follower/influence trade-offs. |
| The Standing Objection | **Keep** | Recurring external pressure from old families. Perfect weekly framing. |
| The Harbormaster's Office | **Keep** | Recurring administrative fee friction. Weekly by nature. |
| Word Spreads | **Keep** *(constrained)* | Rumour mill feels weekly. Mutation-linked — mechanical identity locked. |
| The Newspaper | **Keep** | Press scrutiny recurs. Weekly framing workable as-is. |
| The Donation | **Reframe (light)** | Body reads as one-off anonymous letter arrival. |
| The Delayed Shipment | **Reframe** | "No contact from the driver" anchors it to one specific incident. |
| The Left Item | **Reframe** | "Someone left something at the library" reads as singular event. |
| The Inheritance | **Reframe (B-lean)** | "An old member died and left everything" is clearly a one-time death event. |

---

## Rewrite Directions

Option copy is largely sound on all four cards. Work is in the **card body (flavour text) only**. Titles are unchanged.

### The Donation *(light reframe)*
- **Problem:** "Anonymous letter" reads as one arrival.
- **Direction:** Donations arrive by a regular route. This week's is unusual in weight or origin. The mystery is in *this one*, not in the fact that one arrived.
- **Structure:** Keep two-sentence punchy format. Second sentence undercuts the first.
- **Example register:** *"The regular envelope. Heavier than usual. The handwriting is the same. The handwriting is always the same."*

### The Delayed Shipment *(reframe)*
- **Problem:** "No contact from the driver" anchors the card to one specific incident.
- **Direction:** The weekly supply run is chronically unreliable. The cargo is always difficult to describe on paperwork. The lateness is expected; this week's specifics vary.
- **Anchor:** Body communicates that this happens regularly — what's unusual is only *this week's version* of the problem.
- **Example register:** *"The regular delivery. Late, as usual. The cargo manifest says sundries. It is not sundries."*

### The Left Item *(reframe — lean B)*
- **Problem:** "Someone left something at the library" is a single incident.
- **Direction:** The library regularly receives odd items. The librarian has a process for this. She has stopped asking where they come from.
- **Anchor:** The weirdness is institutional, not surprising. The librarian is a recurring figure who has adapted.
- **Example register:** *"Another item at the library. The librarian has a shelf for these now. She logs them but does not describe them."*

### The Inheritance *(B-lean reframe)*
- **Problem:** A member dying and leaving everything is a singular event.
- **Direction:** The cult regularly receives contested bequests — this has become routine. There is always one estate in dispute. This week's is like the others.
- **Anchor:** "Routine legal matter" register. The family being unprepared for the cause is still the joke — it just needs to be one of several such families, not one specific death.
- **Example register:** *"Another contested estate. The solicitors write again. There is always a family that did not expect the terms."*

---

## Distinctiveness Notes

The three logistical-friction cards (Harbormaster, Left Item, Delayed Shipment) are anchored to different problem types after rewrites:

| Card | Problem type |
|---|---|
| The Harbormaster's Office | Administrative/bureaucratic friction (recurring relationship) |
| The Delayed Shipment | Operational/supply failure (chronic unreliability) |
| The Left Item | The persistent strange thing (institutional weirdness) |

Mechanical profiles are already sufficiently distinct. No mechanical changes required.

---

## Implementation Notes

- All changes are in `src/data/cards/common.ts`, `flavourText` field only
- Thematic agent should write final copy against the directions above and the card-writing-guide register
- Length cap: body ≤ 108 characters (P20-G standing rule)
- After copy is written: run `vitest` — no engine logic changes, tests should stay green
