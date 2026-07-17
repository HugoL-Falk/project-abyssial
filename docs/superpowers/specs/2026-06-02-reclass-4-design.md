# Reclass-4: Rare / Treat / Threat / Unravelling Audit — Design Spec

**Date:** 2026-06-02
**Session:** 48
**Feeds into:** Threat chains session (stranded entry paths), P10-34 (relics from rare only), P10-36 (unravelling escalation)

---

## Overview

This spec formalises the Reclass-4 audit: every card in the Rare, Threat, and Unravelling tiers measured against its tier definition. Changes are grouped into four areas:

1. **Treat tier** (new) — formalise the "positive inserted card" pattern that already existed informally in `threats.ts`
2. **Rare tier** — fix two borderline cards by adding `randomOutcome`
3. **Threat tier** — net-negative rule enforcement + P10-31 stall fixes
4. **Unravelling tier** — escalating severity redesign + net-positive violation fix

### Tier definitions (reference)

| Tier | Question asked | Key constraint |
|---|---|---|
| Common | Which resource do you need? | No insertCard, no randomOutcome, ≤2 effects per option |
| Core | How do you respond — knowing it shapes what comes next? | Can insertCard; medium complexity |
| Rare | How much risk? | randomOutcome, relics, major swings |
| God Path | Are you committed? | High advance cost; harsh non-advance punishment |
| Threat | Which resource can you sacrifice? | Both options net-negative; no net gains |
| Unravelling | Can you survive what you've let in? | Escalating severity per reshuffle tier; worse than threats |
| **Treat** (new) | Something has found you. | Positive inserted cards; always self-remove (one-shot) or passive engine |

---

## Part 1: Treat Tier (New)

### Rationale

`threats.ts` contained a clearly-labelled section of "positive inserted cards" — boon-type cards that arrive mid-run via `insertCard` and give the player gains. These are not threats by any definition. They needed a formal home.

"Treat" was chosen over "Boon" to:
- Avoid confusion with the Boon/Bane blessing terminology (blessings already use boon/bane)
- Provide a fun, slightly ironic label fitting the Lovecraftian tone
- Be visually distinct from "Threat" in the UI

### Identity

*"Something has found you."*

Treat cards **never appear in the base draw pool**. They arrive only via `insertCard` effects from Core, Rare, Threat, or God Path cards. They represent earned or discovered advantages: contacts, knowledge, resources.

**Design principle:** Core and Rare cards are explicitly encouraged to use Treat insertion as a design pattern. An option that looks unappealing at face value (costs something, gives nothing immediately) becomes interesting when it inserts a Treat as a deferred reward. This mirrors the blessings boon/bane pattern at the card level.

### Two sub-types

| Sub-type | Pattern | Removal |
|---|---|---|
| One-shot | Options give immediate gains | Always self-removes on every option |
| Passive | Passive effect fires each reshuffle; `onDraw: Dread+1` as mild bane | Stays in deck permanently |

### Files

| File | Change |
|---|---|
| `src/types.ts` | Add `'treat'` to `CardTier` union type |
| `src/data/cards/treats.ts` | **New file** — move 5 cards from `threats.ts` |
| `src/data/cards/threats.ts` | Remove the 5 treat cards |
| `src/data/index.ts` | Export `TREAT_CARDS` from `treats.ts` |

### Cards moving to treats.ts (no mechanical changes — reclassification only)

**One-shot treats:**

- `a_useful_contact` — Inf+2 / Gold+2 / removes investigators_file; self-removes on all options
- `the_dreamer` — surfaceChainCard + Dread+1 / Gold+1+Fol+1+Inf+1; self-removes on all options
- `merchant_remembers` — Relics+1+Inf+1 / Gold+2; self-removes on all options

**Passive treats:**

- `his_research_notes` — passive: Relics+1/reshuffle; onDraw: Dread+1; "Consult the notes" has no effects (passive continues). Stays in deck.
- `marsh_connection` — passive: 20% Gold+1 or Relics+1 per reshuffle; onDraw: Dread+1; "Read the letter" has no effects. Stays in deck.

**Stranded entry paths (deferred — see Backlog):**
- `a_useful_contact`: entry via `academic_society` was removed in Phase 2. Needs new entry path.
- `something_on_the_hook`: entry via `the_harbour` was removed in Phase 1. Needs new core card.
- Both deferred to the dedicated **card balancing / threat chains session**.

---

## Part 2: Rare Tier

### Audit findings

| Card | Verdict |
|---|---|
| `travelling_merchant` | ✓ Perfect rare — randomOutcome 4-way, relics possible |
| `artefact_from_deep` | ✓ Fits — Relics+1, chain insertion, dread swing |
| `dark_young_pilgrim` | ✓ Fits — major swing, produces the guardian treat |
| `clarence` | ✓ Fits — unique named follower, run-defining power |
| `the_defector` | ⚠️ Borderline — no randomOutcome, no relics. Fix: add randomOutcome |
| `dreaming_academic` | ⚠️ Borderline — no randomOutcome, no relics. Fix: add randomOutcome |

### P10-34 flag (not implemented here)

`cursed_object` (a threat card) — "Study it" gives Relics+1. Violates the future rule that only rare cards deliver relics per reshuffle. **Deferred to dedicated P10-34 session.**

### Changes

**`the_defector` — "Take her in"**

Add `randomOutcome` to reflect the genuine risk of taking in a defector.

New option `flavourText`:
> *"You make tea. She opens the ledger to a specific page without being asked. Her expression while you read is carefully neutral."*

New effects:
```typescript
effects: [
  { type: 'randomOutcome', outcomes: [
    {
      weight: 7,
      // Genuine defector
      effects: [
        { type: 'resource', resource: 'influence', delta: 2 },
        { type: 'resource', resource: 'followers', delta: 2 },
        { type: 'resource', resource: 'dread', delta: 2 },
        { type: 'insertCard', cardId: 'their_former_associates', position: 'random', minPos: 4, maxPos: 8 },
      ],
    },
    {
      weight: 3,
      // Plant
      effects: [
        { type: 'resource', resource: 'influence', delta: -2 },
        { type: 'resource', resource: 'followers', delta: -1 },
        { type: 'insertCard', cardId: 'investigators_file', position: 'discard' },
      ],
    },
  ]},
]
```

"Decline" option unchanged (Inf+1 — safe small gain).

---

**`dreaming_academic` — "Bring him in"**

Add `randomOutcome` to reflect whether his arrival was noticed.

New option `flavourText`:
> *"He arrives at the requested time. The research notes come with him. Whether this is useful or dangerous will become clear shortly."*

New effects:
```typescript
effects: [
  { type: 'randomOutcome', outcomes: [
    {
      weight: 65,
      // Useful
      effects: [
        { type: 'resource', resource: 'followers', delta: 1 },
        { type: 'resource', resource: 'influence', delta: 2 },
        { type: 'resource', resource: 'dread', delta: 2 },
        { type: 'insertCard', cardId: 'his_research_notes', position: 'random', minPos: 2, maxPos: 5 },
      ],
    },
    {
      weight: 35,
      // Noticed — someone followed him
      effects: [
        { type: 'resource', resource: 'followers', delta: 1 },
        { type: 'resource', resource: 'dread', delta: 4 },
        { type: 'insertCard', cardId: 'investigators_file', position: 'discard' },
      ],
    },
  ]},
]
```

"Send him home with a doctored memory" option unchanged (Gold-1, Dread-1, condition gold≥1).

---

## Part 3: Threat Tier

### Rule: Net-negative

All threat options must be net-negative. Small gains alongside larger costs are permitted. Options where gains meet or exceed costs are violations.

### Part 3A: Net-negative fixes

**`something_came_to_the_door`**

Option: "Open the door"
- Old: Inf+2, Dread+3
- New: Dread+4 (remove Inf gain; the encounter gives nothing)
- New flavourText: *"We are not certain what we gave in return. The door has been left open since."*

Option: "Send someone else"
- Old: Fol-1, Dread+4, Inf+3
- New: Fol-1, Dread+4, Inf+1 (reduce Inf gain; still net-negative)
- FlavourText unchanged: *"They came back. They were fine. They are not fine."*

---

**`political_debt`**

Option: "Pay it early"
- Old: Gold-2, Inf+2 (net neutral)
- New: Gold-2, Inf+1 (net negative)
- FlavourText unchanged: *"Pre-emptive generosity. He is satisfied. For now."*

---

**`desperate_congregation`**

Option: "Reveal something true"
- Old: Dread+2, Fol+2 (net positive on followers)
- New: Fol+1, Dread+3
- FlavourText unchanged: *"They came for bread. They leave with something they cannot name."*

---

**`public_scrutiny`**

Option: "Reframe entirely"
- Old: Inf+2, Dread-1 (net positive; condition Inf≥7)
- New: Inf+2, Fol-1, Dread+1 (gains influence; loses followers exposed by the publicity; dread rises)
- Condition unchanged: Inf≥7
- FlavourText unchanged: *"The narrative inverts. The paper prints a correction. Nobody reads corrections."*

---

**`terms_remain`**

Option: "Open it"
- Old: Dread+1, inserts yha_nthlei_4 (too cheap for re-enabling the god path)
- New: Dread+3, inserts yha_nthlei_4
- New flavourText: *"The terms were unchanged. We had not expected them to be. Reading them a second time cost more than the first. The path is still open."*

---

### Part 3B: P10-31 — Explicit stall fixes

Stall options that previously let the card silently linger in the deck now either remove the card (resolution) or explicitly re-insert it (acknowledged delay). No card should stay in the deck via silent omission.

**`the_newspaper_article`**

Option: "Issue a denial"
- Change: add `{ type: 'removeCard', cardId: 'the_newspaper_article' }`
- Rationale: a denial IS a resolution — imperfect but final. The card leaving the deck reflects this.

Option: "Ignore it"
- Change: add `{ type: 'insertCard', cardId: 'the_newspaper_article', position: 'random', minPos: 5, maxPos: 8 }`
- Rationale: ignoring a newspaper article doesn't make it disappear — it comes back.

---

**`missing_persons`**

Option: "Claim ignorance"
- Change: add `{ type: 'insertCard', cardId: 'missing_persons', position: 'random', minPos: 5, maxPos: 8 }`
- Rationale: claiming ignorance doesn't close the investigation; it resurfaces.

---

**`arson_inspector`**

Option: "Obstruct the investigation"
- Change: add `{ type: 'insertCard', cardId: 'arson_inspector', position: 'random', minPos: 5, maxPos: 8 }`
- Rationale: "This slows him. It does not stop him. He makes a note." — the flavour already describes re-insertion; the data now matches.

---

## Part 4: Unravelling Tier

### Escalation principle

Each unravelling tier should be strictly harder than the tier before it — measured by the minimum cost to survive it. The five tiers span five reshuffles; by tier 5, the run is under existential pressure.

| Tier | Card | Minimum survivable cost (after redesign) |
|---|---|---|
| 1 | The Veil Thins | Gold-2, Dread-1 |
| 2 | The Geometry Is Wrong | Inf-2, Dread+2 |
| 3 | Something Is Listening | Fol-1, Inf-1, Dread+2 |
| 4 | The Congregation Changes | Fol-2, Dread+2 |
| 5 | It Is Already Here | Relics-1 (or run ends) |

Each tier also asks for a different primary resource, distributing pressure across the run.

---

### Tier 1 — The Veil Thins

`onDraw: Dread+1` — unchanged.

Option: "Manage the damage" — **unchanged** (Gold-2, Dread-1)

Option: "Let it pass"
- Old: inserts revelation (no cost)
- New: Dread+1, inserts revelation
- FlavourText unchanged: *"It passes. It leaves something behind."*

---

### Tier 2 — The Geometry Is Wrong

Option: "Reassure the congregation"
- Old: Inf-1, Dread+1
- New: Inf-2, Dread+2
- FlavourText unchanged: *"They accept the reassurance. They stop measuring. The walls remain incorrect."*

Option: "Let them measure"
- Old: Dread+3, Fol+1, inserts revelation, removes card (net-positive violation on Fol)
- New: Fol-1, Dread+4, inserts revelation, removes card
- New flavourText: *"The results are distributed. Several leave. A different group arrives, but fewer than left."*

---

### Tier 3 — Something Is Listening

Option: "Claim it as prophecy"
- Old: Inf+2, Dread+2 (net positive — violation)
- New: Fol-1, Dread+3
- New flavourText: *"Some receive this as confirmation. Others stop attending. The silence has a name now, and the name is worse than the silence was."*

Option: "Deny it"
- Old: Fol-1, Dread+1 (too mild for tier 3)
- New: Fol-1, Inf-1, Dread+2
- New flavourText: *"The denial is not believed. It reduces the volume. Your credibility takes the rest of the weight."*

---

### Tier 4 — The Congregation Changes

Option: "Embrace the change"
- Old: Fol-1, inserts changed_follower
- New: Fol-2, Dread+2, inserts changed_follower
- New flavourText: *"Two of them changed overnight. The changed are loyal. You watch the others watch them. Nobody says anything."*

Option: "Purge the affected"
- Old: Fol-3, Dread-2, condition Fol≥3 (Dread-2 was a net gain — violation)
- New: Fol-4, Dread+1, condition Fol≥4
- New flavourText: *"Four gone. The remaining congregation watched it happen. The room is smaller and quieter. So are they."*

---

### Tier 5 — It Is Already Here

**No changes.** Already well-designed: pay Relics-1 to surface the chain card, or the run ends. Maximum pressure, appropriate for fifth reshuffle.

---

## File Summary

| File | Change type |
|---|---|
| `src/types.ts` | Add `'treat'` to `CardTier` union |
| `src/data/cards/treats.ts` | **New** — 5 cards moved from threats.ts |
| `src/data/cards/threats.ts` | Remove 5 treat cards; 9 option edits (net-negative + P10-31) |
| `src/data/cards/rare.ts` | 2 option rewrites (randomOutcome on the_defector, dreaming_academic) |
| `src/data/cards/unravelling.ts` | 7 option edits across tiers 1–4 |
| `src/data/index.ts` | Export TREAT_CARDS |

---

## Deferred / Flagged Items

| Item | Deferred to |
|---|---|
| `a_useful_contact` entry path (stranded) | Card balancing / threat chains session |
| `something_on_the_hook` entry path (stranded) | Card balancing / threat chains session |
| `cursed_object` "Study it" Relics+1 | P10-34 dedicated session |
| `his_research_notes` passive Relics+1 | P10-34 dedicated session |
| `marsh_connection` passive Relics+1 | P10-34 dedicated session |
