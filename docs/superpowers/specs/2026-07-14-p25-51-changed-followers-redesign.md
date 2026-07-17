# P25-51 — Changed Followers Redesign

**Date:** 2026-07-14
**Status:** Approved, pending implementation plan
**Supersedes:** P20-B spec §1 (CF card), §2 (theChanged display), §3 (win condition), §7e (deck cap)
**Scope:** `src/data/cards/special.ts`, `src/data/godPaths/shub_niggurath.ts`, `src/components/` (resource bar + tracker band)
**Tests affected:** Any test touching `changed_follower`, `theChanged`, Shub victory conditions

---

## Background

Playtest 25 surfaced a fundamental design flaw in the Changed Follower card:

> "Count should be current 'The Changed Followers' count in deck + discard pile. Opt1 gains one 'The changed' which is silly. Purpose should be: need amount of Changed Followers in deck, with option to sacrifice them to lower number. NOT keeping one changed follower and constantly gaining it."

The P20-B design treated CF as a sacrifice-pool currency and `theChanged` as a keep-to-accumulate counter. This created a confusing loop where "keep" advanced your victory meter and "sacrifice" drained resources for side benefits — the opposite of intuitive.

**New framing:** Shub floods your deck with Changed Followers involuntarily. Drawing one is a ritual moment: sacrifice it (progress toward summoning, at increasing cost) or let it stay (deck clogs, no progress). `theChanged` now tracks *how many you've sacrificed* — the ritual is accumulation through offering, not possession.

---

## §1 — The Changed Follower Card (replaces P20-B §1)

### Identity

`changed_follower` is Shub-exclusive. Tier: `god_path`, `godPath: 'shub_niggurath'`. No self-remove on any option — the card stays in deck unless explicitly sacrificed.

### Options (two only — drop pool system from P20-B)

**Option 1 — Sacrifice them**
> *Flavour: varies by theChanged count — see below*
> Effects: `theChanged +1`, card removed from deck, escalating cost (see §2)
> Always shown.

**Option 2 — Let them stay**
> *"You decided not to intervene. That counts as a decision."*
> Effects: none. Card remains in deck.
> Always shown.

The P20-B pooled sacrifice options and `optionPoolSize` engine feature are **not needed** for this card. Remove from scope unless another card requires them.

### Flavour text (by theChanged count — shown on Sacrifice option)

```
theChanged = 0: "The first offering. The forest accepts quietly."
theChanged = 1: "The congregation has noticed the gaps. They say nothing, for now."
theChanged = 2: "Your hands are steadier than they should be. That worries you more than the trembling did."
theChanged ≥ 3: "The ritual is almost complete. The cost of that word — almost — is considerable."
```

---

## §2 — Escalating Sacrifice Cost (new)

Cost is keyed off the current `theChanged` value at the moment of sacrifice (i.e. before the +1 is applied):

| theChanged before sacrifice | Cost |
|---|---|
| 0 (1st sacrifice) | `dread +1` |
| 1 (2nd sacrifice) | `dread +1, followers −1` |
| 2 (3rd sacrifice) | `dread +2, followers −1` |
| ≥ 3 (4th+ sacrifice) | `dread +2, followers −1, influence −1` |

**Rationale:** `theChanged` already tracks sacrifice count, so it doubles as the escalation index with no new state needed. Costs hit dread (mental toll), followers (congregation attrition), and influence (public standing) — all three feel the weight of what you're doing.

---

## §3 — Deck Cap (replaces P20-B §7e)

Max **6 copies** of `changed_follower` in drawPile + discardPile simultaneously.

Replace `MAX_CHANGED_FOLLOWER_COPIES = 3` (P20-B) with `MAX_CHANGED_FOLLOWER_COPIES = 6`.

**Rationale:** The 3-copy cap was too tight — playtesting confirmed players reached 4+ copies. With full victory requiring only 3 sacrifices, a cap of 6 gives room for the accumulation to feel organic without becoming unplayable.

---

## §4 — Victory Conditions (replaces P20-B §3)

**File:** `src/data/godPaths/shub_niggurath.ts` — Card 6 (`shub_niggurath_6`)

| Outcome | Condition |
|---|---|
| Full victory | `theChanged ≥ 3` AND `relics ≥ 1` |
| Partial victory | `theChanged ≥ 2` AND `followers ≥ 3` AND `relics ≥ 1` |
| Fail | Default |

**Changes from P20-B:**
- Full: added `relics ≥ 1` gate (was theChanged-only)
- Partial: replaced `relics ≥ 2` with `followers ≥ 3 AND relics ≥ 1` — followers gate makes thematic sense (you still have a congregation, even if the full ritual wasn't completed)

Start at `theChanged ≥ 3` for full; tune upward if too easy in PT26.

---

## §5 — theChanged Display (replaces P20-B §2)

### Remove from resource bar

`theChanged` is excluded from the resource bar render on all runs. (Same intent as P20-B — no change here.)

### New: Slim tracker band (replaces P20-B menu display)

**Instead of** showing `The Changed: N` as a prep-tag row in the menu, render a dedicated slim tracker band **directly below the resource bar, above the card area**. Shub runs only (`activeGod === 'shub_niggurath'`).

**Visual spec:**
- Background: dark purple (`#100e1a`), border-bottom `#221830`
- Vertical padding: ~3px (significantly slimmer than resource bar)
- Content: `🜏 THE CHANGED` label (10px, uppercase, muted purple) + 3 hexagonal pips + `N / 3` count
- Pips: hexagonal via CSS `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)`
  - Filled (sacrificed): `#9b6dbf` with soft glow
  - Empty (remaining): dark `#2a1e42`
- Show from run start (even at 0/3) so the player knows the counter exists
- Fades in/appears on Shub run start; not rendered for Yha/Nyar runs

**Rationale:** The menu placement (P20-B) was deemed too invisible. The resource bar was too crowded with 6 items. A separate slim band is always visible during play without squashing existing resources.

---

## §6 — What This Does NOT Change

The following sections of P20-B remain valid and unchanged:
- §4 — Chain card revisions (stall options, Card 1–5 fixes)
- §5 — Supporting cards (`fishermans_return`, `the_weight_of_it`)
- §6 — Doom card 4 non-Shub conditional *(open question — deferred to future pass)*
- §7a — Pooled options engine feature *(removed from CF card scope, but may be needed elsewhere — defer)*
- §7b — theChanged resource bar suppression
- §7d — seedMutations activity log
- §7f — Doom card 4 god-path conditional *(deferred)*
- Mutation dark options: `insertCard: changed_follower` (already shipped s156)
- Acquisition paths: unchanged

---

## §7 — Open Questions (deferred)

- **Doom card 4 non-Shub runs:** When CF becomes fully Shub-exclusive, Doom Stack card 4 "The Congregation Changes" needs an alternative effect for Yha/Nyar runs. Parked — low frequency, handle in a future pass.
- **Tune theChanged ≥ 3 victory gate:** Starting value — adjust upward post-PT26 if too easy.

---

## §8 — Test Surface

Tests to add/update:

- `changed_follower` deck cap: ≤ 6 copies enforced (replace old cap-3 test)
- Sacrifice escalation: correct cost applied at each `theChanged` level (0, 1, 2, ≥3)
- Sacrifice: `theChanged` increments AND card is removed from deck
- Keep: card remains in deck, `theChanged` unchanged, no resource change
- `shub_niggurath_6` full victory: `theChanged = 3 + relics ≥ 1` → passes; `relics = 0` → fails
- `shub_niggurath_6` partial: `theChanged = 2 + fol ≥ 3 + relics ≥ 1` → passes; `fol = 2` → fails
- Tracker band: renders on Shub run, not on Yha/Nyar
- Pip fill state matches `theChanged` value

---

## Implementation Order

1. **Data: `changed_follower`** — new two-option card, escalating cost logic, updated flavour
2. **Engine: deck cap** — update `MAX_CHANGED_FOLLOWER_COPIES` to 6
3. **Data: `shub_niggurath_6`** — update victory conditions
4. **UI: tracker band** — slim Shub-only row below resource bar, hexagonal pips
5. **UI: resource bar suppression** — ensure `theChanged` not rendered in bar (verify P20-B §7b is live)
6. **Tests**
