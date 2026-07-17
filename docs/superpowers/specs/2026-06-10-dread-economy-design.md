# Dread Economy Redesign — Design Spec
**Date:** 2026-06-10
**Session:** 65
**Backlog items addressed:** P10-23, P13-22, P13-23
**Approach:** Option 2 — Card audit + dread relief additions

---

## Problem Statement

With smaller deck sizes (post-P12-15 dread pressure scaling), dread accumulates faster than intended in the early-to-mid game. Two distinct issues:

1. **Too many unjustified dread additions** — some core card options add dread as a mechanical rule artefact (Session 45 minimum-cost rule) rather than because the narrative action generates fear. Specifically `congregation_meets` adds dread on all three options with no relief path.
2. **Not enough dread relief paths** — dread-reducing options are clustered behind influence or gold-2+ costs, leaving players who are influence-starved (Y'ha-nthlei build) or gold-poor with no accessible relief.
3. **P13-23 legibility bug** — `unravelling_1` (The Veil Thins) uses an onDraw pattern that makes "Manage the damage" look like a net-zero trade when the actual cost/benefit is obscured.

---

## Design Constraints

- Max 3 options per card (UI hard limit)
- Max 3 resource delta effects per option (cognitive load limit); insertCard/removeCard do not count
- No new core or common cards — relief added by modifying existing options or adding one new treat card
- Dread relief must cost a real resource (not free −2)
- Single-source invariant: each treat card inserted by exactly one source option

---

## Changes

### 1. congregation_meets — Remove unjustified dread (P13-22)

All three options currently add dread+1. Only "Deliver a sermon" (conditional, inserts scrutiny) earns the dread narratively. The other two are Session 45 rule additions with no narrative basis.

| Option | Before | After |
|---|---|---|
| Pass the collection plate | gold+2, dread+1 | gold+2 |
| Deliver a sermon | inf+2, dread+1, insert scrutiny (cond: fol≥2) | **unchanged** |
| Dismiss early | fol−1, dread+1 | fol−1, **insert the_ordinary_pie** (minPos 3, maxPos 7) |

"Dismiss early" becomes a cost-with-deferred-treat option instead of a double punishment. "Someone lingers on the steps. You do not call after them." — they leave something behind.

---

### 2. local_elections — Nerf fallback dread (P13-22 adjacent)

"Stay out" is the no-resource fallback. dread+2 for "nothing happened" is too steep.

| Option | Before | After |
|---|---|---|
| Stay out | dread+2 | dread+1 |

---

### 3. the_donation — Flip to relief

"Return it anonymously" had dread+1 added by the Session 45 rule. Thematically, refusing suspicious money is calming, not frightening. Flip the effect.

| Option | Before | After |
|---|---|---|
| Return it anonymously | inf+1, dread+1 | inf+1, **dread−1** |

---

### 4. supplies_dwindle — Add dread relief to costed option

No dread relief exists on this card. Feeding your people is one of the few actions that genuinely quiets paranoia.

| Option | Before | After |
|---|---|---|
| Spend on provisions | gold−2, fol+1 (cond: gold≥2) | gold−2, fol+1, **dread−1** (cond: gold≥2) |

---

### 5. unravelling_1 (The Veil Thins) — Fix P13-23 onDraw legibility

**Current:** onDraw fires dread+1 before options appear. "Manage the damage" (gold−2, dread−1) looks like it returns you to baseline. "Let it pass" shows only dread+1, hiding the true net cost of +2.

**Fix:** Remove onDraw. Make both options explicit.

| Option | Before (net) | After |
|---|---|---|
| Manage the damage | gold−2, net dread 0 | gold−2, *(no dread effect — old dread−1 is removed along with the onDraw)* |
| Let it pass | net dread+2, insert revelation | **dread+2**, insert revelation |

Mechanical outcome is identical. Both options are now fully legible to the player.

*Note: "Manage the damage" has no dread delta in the new structure — its value proposition is "pay gold to avoid dread+2." The flavour text "Gold spent, dread contained. Temporary." still reads correctly.*

---

### 6. New treat card — the_ordinary_pie

**Source:** `congregation_meets` "Dismiss early" (see change 1 above)
**Tier:** treat
**Inserted:** into draw pile at random position (minPos 3, maxPos 7 suggested)

```
id: 'the_ordinary_pie'
title: 'The Ordinary Pie'
flavourText: 'A pie arrived this morning. Left on the step. The filling has an unusual colour.'
tier: 'treat'
options:
  - label: 'Share it round'
    flavourText: 'Everyone ate. The conversation was pleasant. The subject of the colour did not come up.'
    effects: [gold −2, dread −2]
    condition: gold ≥ 2

  - label: 'Eat what's there'
    flavourText: 'It was sufficient. Nobody mentioned the smell.'
    effects: [dread −1]
```

Paying more buys the collective fiction that nothing is wrong (and better relief). The free option is slightly more honest and does less. The horror is entirely in what the narrator doesn't say.

*Include explicit `{ type: 'removeCard', cardId: 'the_ordinary_pie' }` on both options — this is the established pattern for treat cards in this codebase (see the_dreamer, a_useful_contact).*

---

## Files to Change

| File | Change |
|---|---|
| `src/data/cards/core.ts` | congregation_meets (opts 0, 2), local_elections (opt 2), the_donation (opt 1), supplies_dwindle (opt 0) |
| `src/data/cards/unravelling.ts` | unravelling_1: remove onDraw, update opt 1 dread delta |
| `src/data/cards/treats.ts` | Add the_ordinary_pie card |

---

## Out of Scope (deferred)

- dreadPressureScaling curve review (Option 3 — needs more playtesting data)
- P10-35: Doom escalation cap/slow
- P11-21: Suppress dread additions on first reshuffle
- P13-21: ±2 resource cap audit (separate session)
