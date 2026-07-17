# Card Tier Reclassification & Redesign

> **Covers backlog items:** P10-24 (card complexity stratification), P10-26 (full card audit)

**Goal:** Establish clear mechanical identities for each card tier, then reclassify and redesign existing common cards to match — with core, rare, god path, threat, and unravelling following in subsequent sessions.

**Architecture:** Each tier asks a different question of the player and uses a distinct mechanical toolset. Cards that violate their tier's constraints are either reclassified to the correct tier (tier field change) or redesigned to fit their current tier (options and effects rewritten). Card titles and main flavour text are preserved where they still fit; option labels, effects, and option flavour text are redesigned freely.

---

## Tier Definitions

### Common — The Metabolism
**Question asked:** "Which resource do you need most right now?"

| Constraint | Rule |
|---|---|
| Effects per option | 1–2 resource effects (gold, followers, influence, dread) |
| `insertCard` | ❌ Not allowed |
| `randomOutcome` | ❌ Not allowed |
| Conditions | Avoided — cards should always be resolvable |
| Max options | 3 |

Common cards are the steady state of the run. The interesting choice comes from asymmetric resource trade-offs — not from complexity.

---

### Core — The Run's Character
**Question asked:** "How do you respond — knowing your choice shapes what comes next?"

| Constraint | Rule |
|---|---|
| `insertCard` | ✅ Allowed — this is core's main lever |
| Conditions | ✅ One allowed |
| Effects per option | Up to 3 if the trade-off is clear |
| `randomOutcome` | ❌ Not allowed (variance belongs in rare) |

Core cards are narrative events — things that happen to the town or the cult, whose consequences change what's coming in the deck. They make the run feel like it has character.

---

### Rare — The Gamble
**Question asked:** "How much risk are you willing to take?"

| Constraint | Rule |
|---|---|
| `randomOutcome` | ✅ Allowed — variance is the point |
| Relics | ✅ Primary home for relic interactions |
| Complexity | High complexity is earned by the stakes |
| `insertCard` | ✅ Allowed if narratively warranted |

Rare cards are memorable moments. A player should be able to name their rare cards after a run.

---

### God Path — The Commitment
**Question asked:** "Are you all in, or are you paying the price?"

| Option type | Rule |
|---|---|
| Advance option | Meaningful resource cost (2–3 resources); chain progress |
| Non-advance option | Resource hit heavier than any common card, OR inserts a harsh threat |

God path cards are mechanically distinctive — their options should feel unlike anything in the common/core pool. Narrative is already solid; the mechanical stakes need to match.

---

### Threat — The Crisis
**Question asked:** "Which resource can you sacrifice?"

| Constraint | Rule |
|---|---|
| Both options | Costly — but in **different resources** |
| Resource gains | ❌ Not allowed — pure damage mitigation |
| Entry | Always inserted; never starts in deck |

Threats create a real choice because different resources matter differently at different points in the run. Neither option should be an obvious pick.

---

### Unravelling — The Run Breaking Down
**Question asked:** "Can you survive what you've let in?"

| Constraint | Rule |
|---|---|
| Severity | Worse than threats — real sacrifice required |
| Entry | Inserted by the escalation mechanic as reshuffles accumulate |
| Doom mechanic | **Merged** — "doom" is not a separate concept; unravelling cards ARE how doom manifests |

Note: the "Doom escalates" popup should eventually be reframed as a brief narrative beat ("The unravelling deepens") rather than a mechanical announcement — deferred to a UX pass.

---

## Common Tier Audit

Current `common.ts` has 12 cards. Audit against the common constraints:

### Reclassify → Core

These cards' core narrative is about creating future consequences. Moving them to core is correct; their options and effects stay as-is for now.

| Card | Violation | Notes |
|---|---|---|
| `academic_society` | inserts `investigators_file` + `a_useful_contact` | The whole card is about suspicious activity → investigators follow |
| `woodcutters_report` | `randomOutcome` + `insertCard` | The map gamble is a core event, not metabolism |
| `the_printing_press` | inserts `scrutiny` + `forgers_debt`; two conditions | Consequences cascade — clearly core territory |
| `the_opium_den` | inserts `the_dreamer`; condition; 3 effects | High complexity + insertCard; fits core |
| `the_census_agent` | removes 3 cards + inserts `what_was_done`; condition | The most complex card in common — belongs in core |
| `local_elections` | inserts `political_debt`; condition | A run-shaping political event |
| `the_seance` | inserts `wandering_soul` | The insertion IS the point of the card |

### Reclassify → Rare

| Card | Violation | Notes |
|---|---|---|
| `travelling_merchant` | 4-way `randomOutcome` incl. relic + `insertCard` | Variance + relics = rare territory |

### Redesign to Fit Common

These cards have insertCard effects that were bolted on, but their narrative identity works as a simple resource trade-off. Strip the insertCard; redesign options as pure resource choices.

| Card | Current violation | Redesign direction |
|---|---|---|
| `the_harbour` | inserts `something_on_the_hook` | Harbour as a resource card — the event at the harbour creates immediate pressure (dread, gold, followers) without a trailing card |
| `the_fire` | inserts `evidence_of_rival` | Fire as a crisis trade-off — gold/followers/influence costs with no trailing insertion |

Note: if `something_on_the_hook` previously entered the deck only via `the_harbour`, its entry path needs a new home (either a core card, or it becomes a standalone threat). Audit required during implementation.

### Keep in Common

| Card | Note |
|---|---|
| `the_newspaper` | No violations — keep as-is |
| `the_inheritance` | Has `randomOutcome` but outcomes are pure gold variance (no insertCard, no relics). Borderline — acceptable in common as a mild variance moment, or simplify to fixed effects. Decision deferred to implementation. |

---

## Pool Size Concern

After reclassification, the common pool drops from 12 cards to approximately 3–4 cards (`the_harbour` redesign, `the_fire` redesign, `the_newspaper`, `the_inheritance`). This is too thin — common cards need to appear frequently as the run's metabolism.

**Decision deferred:** new common cards should be designed to fill the pool, but this is a separate creative task. The audit session (reclassification + 2 redesigns) comes first; new common card design follows in a dedicated session.

---

## Approach

### Phase 1 — Common (this spec)
1. Reclassify 7 cards from common → core (tier field change in `common.ts` → move to `core.ts`)
2. Reclassify 1 card from common → rare (`travelling_merchant` → `rare.ts`)
3. Redesign 2 cards to fit common constraints (`the_harbour`, `the_fire`)
4. Audit `something_on_the_hook` entry path after `the_harbour` redesign

### Phase 2 — Core (follow-up session)
Audit all core cards (including the 7 newly arrived) against core constraints.

### Phase 3 — God Path (follow-up session)
Rework advance/non-advance cost structure across all god path cards.

### Phase 4 — Rare, Threat, Unravelling (follow-up sessions)

---

## Design Constraints (Reference)

- **Card title:** preserve where it still fits the tier
- **Card main flavour text:** preserve where it still fits
- **Option labels:** redesign freely
- **Option effects:** redesign to fit tier constraints
- **Option flavour text:** redesign freely
