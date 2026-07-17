# Deck & Reshuffle Redesign — "Every Reshuffle Feels Like a Week"

**Date:** 2026-06-27
**Status:** Design approved, ready for implementation plan
**Ticket lineage:** P13-24 (Deck & Reshuffle Redesign), folds in P17-11 (core swap-in like rares), P17-4 (per-week common/core flavour). Interacts with P19-35 (deck bloat), P19-34 (week-4 spike), P19-36 (sink:source ratio).
**Agents:** Card Mechanics + Balance (mechanic + audit), Thematic (flavour sweep), Code (deck.ts/gameStore.ts).

---

## Problem

One reshuffle = one week, but every week is compositionally near-identical: the same commons, the same always-in core, two rares. A week never *feels* different from the last, so the "passage of a week" never lands. Reflavour alone can't fix this — the cadence itself never varies.

The fix couples mechanic and narrative (the user's "C"): redefine tier cadence so weeks genuinely differ, then rename + reflavour so the theme reinforces the mechanic.

## Frequency model (the spine)

Tiers mean **frequency of occurrence** (model A): how often *this kind of event* recurs in the cult's life.

| Tier (display) | Internal enum | Cadence | Mechanic |
|---|---|---|---|
| **Common** | `common` | every week | drawn every reshuffle (unchanged); absorbs reclassified weekly cards |
| **Uncommon** | `core` (unchanged) | some weeks, not all | **rotates** via new `rotateCore`, N=4 in deck |
| **Rare** | `rare` | a specific one is seldom | rotates weekly, slot stays 1–2 filled (floor 1) |

**Typical week after redesign:** all commons + ~4 rotating uncommon + 1–2 rare. Weeks now differ in uncommon/rare composition instead of being near-identical.

## Section 1 — Tier reclassification

**Rule:** frequency-classify by default; the balance audit overrides only where the economy breaks.

Default lean for the 5 current always-in core cards:
- `congregation_meets`, `donation` → **common** (read genuinely weekly: the gathering, the plate going round). *Subject to audit veto.*
- `landlord_cometh`, `rival_stirs`, `stranger_asks_questions` → join the rotating **uncommon** pool (episodic: "some weeks, not all").

Post-reclassification there is **no always-in core spine** — commons are the only guaranteed-every-week cards.

## Section 2 — `rotateCore` mechanic (mirrors `rotateRares`)

Runs in the same reshuffle chokepoint in `deck.ts` as `rotateRares`.

- **Deck holds N = 4 uncommon at a time** (audit may tune). Down from ~7–8 core/week today, which also thins the mid-deck (helps P19-35 bloat).
- **At each reshuffle:** retire resolved/discarded uncommon → pull replacements from the uncommon pool, excluding `usedCoreIds` (cooldown) and uncommon still in deck.
- **Cooldown:** a retired uncommon sits out ≥1 cycle before re-eligibility; recycle-when-exhausted fallback identical to the P19-33-hardened `rotateRares`. Produces the "came up a few weeks ago, now something else is afoot" texture.
- **Carry-over (retire policy):** an uncommon *not yet drawn* by reshuffle time stays (it didn't get its week). **Retire resolved only — not a full reroll.** Preserves continuity and the prep/chain economy.

## Section 3 — Rare cadence

- **Rare slot = 1–2 per week, floor of 1.** Lower `rotateRares` target band from fixed-2 so most weeks carry 1, occasionally 2.
- **Floor guarantee:** never 0 rares/week — the "something notable happens" beat is the week's dramatic spine.
- **Rotation/cooldown unchanged** — specific rare still rotates weekly with the no-repeat-two-cycles guard, so any given rare stays seldom-seen.

## Section 4 — Naming & flavour

**Naming:**
- **Player-facing label only:** `core` displays as **"Uncommon"** in UI, jewels, tooltips.
- **Internal enum stays `'core'`** — no enum-string rename (would churn types, card data, deck logic, tests). Internal name ≠ display name. A full enum rename can be reconsidered later by the impl plan if warranted.

**Flavour:**
- **Full reflavour sweep** of every common + uncommon card body. Preserve the **deadpan, understated dread-comedy voice** (the house style — "...a grudge, and lousy penmanship. You make tea."). Tighten cadence-feel (commons routine/passive; uncommon episodic; rare singular) without flattening tone.
- **Bound by standing flavour caps:** option flavour ≤80 chars, card body ≤108 chars (D 2026-06-25). No overflow reintroduced.
- **Per-week framing carries the cadence**, not card bodies: extend `WeekBanner` + `weekFlavour.ts` so a week's opening telegraphs its texture (quiet week vs. something stirring). Folds in P17-4.

## Section 5 — Balance audit scope

Run via Balance + Card-Mechanics agents, after the mechanic lands, before flavour ships.

- **Resource baseline:** old always-in core supplied steady income every week. Confirm per-week income holds with uncommon rotating and `congregation_meets`/`donation` reclassified. Flag any load-bearing source that can rotate *out* and starve a week.
- **Sink:source ratio:** confirm the intentional ~3:1 (P19-36) survives N=4 + 1–2 rare (fewer source-bearing cards/week than today's ~7–8 core + 2 rare).
- **Reclassification veto:** confirm or override the `congregation_meets`/`donation` → common default.
- **Curve interactions:** thinner deck vs P19-35 (bloat) and P19-34 (week-4 spike drivers).
- **Prep/chain economy:** flag any chain depending on a core card persisting — rotating uncommon could rotate out a prep-carrier mid-chain.

## Section 6 — Testing & rollout

**Tests (node-only, mirror `rotateRares` specs):**
- `rotateCore`: N=4 held; retire-resolved-only; undrawn carry-over; cooldown excludes just-retired; recycle-when-exhausted fallback; no duplicate uncommon in deck.
- Rare floor: never 0/week, band 1–2.
- Reclassification: reclassified cards report new tier; commons drawn every week.
- Regression: existing 135 vitest pass; typecheck clean.

**Rollout order (separate commits):**
1. Mechanic (`rotateCore`) + reclassification + tests
2. Balance audit + tuning
3. Display-label rename ("Uncommon")
4. Full deadpan reflavour sweep under char caps

Playtest between (2) and (4).

## Out of scope

- Internal `'core'` enum string rename (display-label only).
- The parked "today's agenda" full-reroll reframe (Approach 2 — rejected: severs continuity, fights prep/chain).
- Weighted-decay appearance (Approach 3 — rejected: opaque, hard to test).
- P19-35 deck-bloat dedicated spec (this thins the deck as a side effect; bloat ticket stays parked pending playtest).
