# P13-21 — Common/Core Resource Cap Audit

**Date:** 2026-06-12
**Session:** 67
**Status:** Approved (pre-implementation)
**Related backlog item:** P13-21 — "Common and core cards should max out at ±2 resources per option (excluding card insertion/removal) — too much mental calculation otherwise. Audit all common/core cards; cascade risk high."

---

## Problem

Several common and core options carry resource deltas of ±3 or larger. Playtest 13 feedback flagged this as adding too much in-head arithmetic to option comparison. The player should be able to compare options without summing three-digit-style swings.

## Goal

Cap direct resource deltas on common/core options at ±2, while preserving the identity of cards whose mechanical purpose is an explicit larger swing.

## Non-goals

- Rare cards (intentionally larger swings)
- Threat / doom / god_path / mutation tiers
- RandomOutcome internal variants — these are mediated by the `?` tooltip and don't impose summing on the player
- Engine, type, or UI changes

## Audit Result

A grep of `delta:\s*-?[3-9]` across `core.ts` and `common.ts` returned:

**Core — 8 options exceed ±2**
**Common — zero base-option violations** (two randomOutcome variants in `the_inheritance` "Fight it in court" reach gold +3/+4; out of scope per non-goal #3).

## Strategic Decisions (locked)

1. **Soft cap** — ±2 is the default. Cards whose mechanical identity *requires* a larger swing may exceed it; each exception is documented inline in this spec and added to `knowledge/agents/balance.md`.
2. **RandomOutcome exempt** — variants inside `randomOutcome` may exceed ±2 individually. Legibility comes from the `?` tooltip.
3. **Direct effects only** — the cap applies to deterministic `resource` effects directly listed on the option.
4. **InsertCard / removeCard exempt** — these are not resource deltas; they count separately under their own balance rules.

## Per-card treatment

### Keep as documented exceptions (4)

| Card / option | Value kept | Rationale |
|---|---|---|
| `relic_market` "Buy it" | gold −3 → relic +1 | Headline gold→relic sink. Trimming to −2 would make relic conversion 1:1 (player can spend the relic for +2 elsewhere via RelicPicker), neutering its role as a resource sink. |
| `relic_market` "Trade on your name" | influence −3 → relic +1 | Headline influence→relic sink. Influence is the least-drained resource (50 drains vs 70 gold drains, per session 66 audit) and the Y'ha-nthlei win condition — keeping a strong influence sink is structurally important. |
| `the_old_book` "Read it yourself" | dread +3 + relic +1, `dreadPressureScaling` | The card's identity is "the dread-spike for a relic". Already gated by `dreadPressureScaling`. Trimming flattens its character. |
| `the_old_book` "Hire a translator" | gold −2 + dread +3 + surfaceGodPathCard | Same identity — the dread spike IS the card. |

### Trim to ±2 (4)

| Card / option | Change | Rationale |
|---|---|---|
| `the_donation` "Accept it" | gold +3 → **gold +2** | `strings_attached` threat is already a heavy counterweight; +3 was over-generous. |
| `academic_society` "Attend as a guest speaker" | influence +3 → **influence +2** | `investigators_file` accumulates via 6+ triggers and is flagged as possibly too punishing (balance.md open question #1). The option is paying for a real liability — +2 is sufficient payoff. |
| `the_opium_den` "Acquire it" | gold −3 → **gold −2**; condition `gold ≥ 3` → **`gold ≥ 2`** | Three resource deltas plus a threat insert is already a heavy option. Trimming gold preserves all other effects. Condition lowered to remain consistent with the new cost. |
| `local_elections` "Back them openly" | influence +3 → **influence +2** | `political_debt` is a meaningful threat. +2 + threat keeps the option attractive against the quieter "Back quietly" alternative without dominating it. |

## File changes

| File | Change |
|---|---|
| `src/data/cards/core.ts` | 4 deltas trimmed (lines ~292, ~400, ~508+513, ~580). Line numbers indicative — verify by card id in implementation. |
| `src/data/cards/common.ts` | No changes. |
| `knowledge/agents/balance.md` | Append new heuristic under "Hard Limits"; append 2026-06-12 lesson entry. |
| `knowledge/decisions.md` | Append decision entry. |

## New rule (to add to `knowledge/agents/balance.md` under "Hard Limits")

> **Common/core option resource cap:** Each direct resource delta on a common or core option ≤ ±2. RandomOutcome variants are exempt (legibility comes from `?` tooltip). InsertCard / removeCard effects are exempt. Documented exceptions: `relic_market` (×2 — headline sinks), `the_old_book` (×2 — dread-spike identity).

## Verification

**Static (pre-commit):**
- `tsc` clean — confirm no type errors (no type changes expected).
- `eslint` clean.
- `grep -nE 'delta:\s*-?[3-9]' src/data/cards/core.ts` must return only the four documented-exception lines (relic_market ×2, the_old_book ×2). Any other hit is a regression.
- `grep -nE 'delta:\s*-?[3-9]' src/data/cards/common.ts` should return only inside `randomOutcome` blocks.

**Behavioural smoke:**
- Run the game, draw each of the 4 trimmed cards, confirm option labels render and EffectTags reflect new deltas.
- `the_opium_den` condition: option correctly gated at gold ≥ 2, greyed when gold < 2.

**Balance regression watch (Playtest 14, non-blocking):**
- Average influence/cycle and Y'ha-nthlei win rate (loss of 1 inf from two strong inf options).
- Shub-path acquisition rate via `the_opium_den` (slightly cheaper to access).

## Out of scope

- Auditing rare cards
- Common randomOutcome variants (`the_inheritance` "Fight it in court", forgers_debt internals)
- Refactoring `core.ts` (currently ~315 lines, under the 300-line guardrail with growth headroom)
- Tooling to automatically detect future violations (manual grep is sufficient at current scale)

## Risk

- Influence-heavy Y'ha-nthlei builds may slow by ~2 inf per run on average. Flag for telemetry but do not pre-compensate — wait for playtest data.
- The_opium_den becoming easier to access could accelerate Shub-path. Monitor.
