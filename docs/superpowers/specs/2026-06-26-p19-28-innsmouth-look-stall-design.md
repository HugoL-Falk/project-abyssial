# P19-28 — `yha_nthlei_3` "The Innsmouth Look" stall option + marked-card rename

**Date:** 2026-06-26
**Tier:** E (design)
**Card:** `yha_nthlei_3` (god-path, yha_nthlei, chainStage 3)
**Files touched:** `src/data/godPaths/yha_nthlei.ts`, `src/data/cards/threats.ts`, `src/data/blessings.ts`
**Review owed:** Balance + Card-Mechanics (chain-pacing sanity check)

---

## Problem

`yha_nthlei_3` "The Innsmouth Look" is the chain-stage-3 god-path card — the comment calls it *"the first moment avoidance has a real cost."* It has two options:

- **opt0 "Approach him"** — influence −2, dread +2, `advanceGodPath`. Ungated. The only unconditional way forward.
- **opt1 "Recognise the sign"** — gated `hasPrepTag attended_seance` → consume tag, dread +1, influence +1, `advanceGodPath`. Prep-route shortcut.

A player without the seance prep tag is **forced** to take "Approach him" — spend influence and advance the chain *now*, even if influence-starved. P19-28 asks for a third option: stall (defer the advance) at a dread cost, reinserting the card later, with no softlock.

Secondary: the threat card `innsmouth_look_marked` (blessing-seeded) shares the **display title** "The Innsmouth Look" with this god-path card, causing confusion.

---

## Design

### 1. New stall option on `yha_nthlei_3`

opt0 and opt1 unchanged. Add opt2:

| # | Label | Effects | Gate |
|---|-------|---------|------|
| 0 | Approach him | influence −2, dread +2, `advanceGodPath` | none *(unchanged)* |
| 1 | Recognise the sign | consume `attended_seance`, dread +1, influence +1, `advanceGodPath` | hasPrepTag `attended_seance` *(unchanged)* |
| 2 | **Watch him longer** *(new)* | **influence −1, dread +2, `insertCard` `yha_nthlei_3` @ position random, minPos 3, maxPos 6** *(no `advanceGodPath`)* | none |

> **Balance tweak (adopted, agent review 2026-06-26):** influence −1 added to the stall. This card's identity is the "first real *influence* cost"; dread +2 alone would let an influence-rich player stall to climb influence via common cards then pay the −2 from a stronger base, softening the beat. With influence −1 per stall, two stalls cost −1 −1 then −2 = −3 total, so stalling is a genuine risk decision, not a free delay. (`influence` clamps at 0, so a broke player can still stall and "Approach him" remains the always-available exit — no softlock.)
>
> **Card-Mechanics caveat (adopted as a code comment):** while a stall loop is active, any *external* `advanceGodPath` for yha_nthlei is blocked by the single-active chain invariant. No out-of-band yha_nthlei advance exists in normal play, so this is benign — note it in a comment on opt2.

**Proposed copy** (option flavour ≤80 chars, per standing flavour-cap rule):
- Label: **"Watch him longer"**
- Flavour: *"You let him keep coming. You learn his face. The sea keeps coming up."* (68 chars)

### 2. Rename the marked threat card (title only)

`innsmouth_look_marked` (`threats.ts`): display title **"The Innsmouth Look" → "The Drowned Mark"** (matches the seeding blessing). Id, art filename, and `cardArt.ts` key are **unchanged**.

`blessings.ts` `the_drowned_mark` description: drop the "Innsmouth Look" reference. Current: *"A modified Innsmouth Look card is seeded into your starting deck. On draw: Gold +1, Followers +1. Dread +2 instead of +1."* → reword to e.g. *"The Drowned Mark card is seeded into your starting deck. On draw: Gold +1, Followers +1. Dread +2 instead of +1."*

---

## Engine validation (no engine changes required)

Verified against `gameStore.ts` + `engine/godPath.ts`:

1. **God-path cards never reshuffle naturally.** On resolution they route to `permDiscardPile` (`gameStore.ts:1091-1106`). A stall therefore *must* explicitly re-insert — it cannot rely on discard. The new option does exactly this via `insertCard`.
2. **Dedicated god-path insert branch** (`gameStore.ts:798-812`): `insertCard` with `tier:'god_path'` + `position:'random'` drops a *fresh* `getCardById` copy into the draw pile at `minPos`–`maxPos`, and gracefully carries to `nextCycleQueue` if the draw pile is empty. The drawn instance is separately routed to `permDiscardPile`, and self-reinserting cards are explicitly handled (`gameStore.ts:1101`) → **no duplicate instance**.
3. **Single-active chain invariant respected** (`godPath.ts:80-86`): `advanceGodPathChain` refuses to queue the next stage while any chain card is active. Because the stall does **not** call `advanceGodPath`, the next stage is never queued — exactly one chain card stays live. No chain corruption, no double-advance.
4. **No softlock:** opt0 "Approach him" is always available; dread climbs +2 per stall, so repeated stalling self-terminates (the player is eventually pressured to engage).

---

## Why these choices

- **Pure defer (no influence spend, no boon):** keeps the stall honestly costly — you trade dread and a delay for not paying influence now. (User decision.)
- **Near reinsert (pos 3–6):** the card returns this same cycle rather than waiting for a reshuffle — tighter pressure. (User decision.)
- **No gate:** rising dread (+2/stall) is its own self-limiter; no `resourceMax` gate needed. (User decision.)
- **Title-only rename:** kills the player-facing and dev-facing title collision with zero id/asset churn. (User decision.)

---

## Open review question for Balance + Card-Mechanics

Does letting a player defer the influence cost (at dread +2 per cycle) trivialize this card's intended "first real cost" beat? Expected answer: no — dread +2/cycle is steep, and the chain can't advance while stalling, so the player pays in tempo + dread. Confirm before code.

---

## Out of scope (YAGNI)

- No id rename for `innsmouth_look_marked` (art file / cardArt key left alone).
- No changes to opt0/opt1 of `yha_nthlei_3`.
- No engine changes.
