# EX-07 — Remove `escalates` Mechanic

**Status:** Design approved 2026-06-16
**Source ticket:** [[knowledge/backlog.md]] EX-07 (P2); [[knowledge/investigations/2026-06-15-experienced-playthrough.md]] §EX-07
**Priority:** P2

## Problem

The `escalates: true` card field is deployed on exactly **1 of 18 chain cards** (`yha_nthlei_3`). Its purpose is to make negative resource deltas grow by `(drawCount − 1)` on each subsequent draw, so deferring a card via re-insert branches gets progressively worse. In skilled play (see EX playthrough), Vets defuse it trivially by always picking the advancing option on first draw — escalation never fires. The mechanic carries engine complexity and UI surface area without delivering decision pressure.

## Decision

Remove the mechanic entirely. No replacement. The two re-insert branches on `yha_nthlei_3` keep their flat first-draw costs on every subsequent draw.

## Scope

### In scope (6 files edited + 1 verified)

1. **`src/types/index.ts`** (line 106) — remove `escalates?: boolean` from the `Card` type.
2. **`src/engine/gameLoop.ts`** (line 170) — collapse the `card.escalates ? <delta-escalation map> : [...opt.effects]` ternary in `computeVisibleOptions` to just `[...opt.effects]`.
3. **`src/engine/gameLoop.ts`** (line 286) — same collapse at the `expandEffects` callsite inside `applyOption`.
4. **`src/state/gameStore.ts`** (lines 145, 603) — same collapse at both store callsites.
5. **`src/data/godPaths/yha_nthlei.ts`** (lines 103, 113, 130) — delete the `escalates: true` line on `yha_nthlei_3` and the two comments that reference escalation.
6. **`src/components/game/DrawnCard.tsx`** (lines 54, 87, 268) — remove the `hasEscalate` branch, the `{card.escalates && (…)}` subtitle JSX ("Escalates. Each redraw costs more."), and the comment on line 54.
7. **`src/components/game/CardPassiveTag.tsx`** (verify only) — if the `?`-popup copy mentions escalates, prune that segment as part of step 6.

### Out of scope

- **`DoomPanel.tsx` "Doom escalates" label** — unrelated; refers to the doom-tier mechanic, not the card flag. Leave untouched.
- **EX-08 (re-insert branches as dead options)** — separate ticket. Removing escalation makes deferral slightly less punishing but does not fix the dead-branch problem on its own.
- **Rebalance of `yha_nthlei_3`** — Vets never let escalation fire, so removal does not change first-draw decision-making. Defer further tuning to a future balance pass if playtest shows the re-insert branches are now too attractive.

## Balance impact

`yha_nthlei_3` after removal:
- "Approach him" — I-2, D+2, advance (unchanged).
- "Let him attend" — F-1, I-2, re-insert at pos 7-11 (flat on redraw; previously escalated).
- "Turn him away" — D+2, re-insert at pos 7-11 (flat on redraw; previously escalated).

Expected effect: negligible at skill level (Vets do not defer). At noob level the re-insert branches become marginally safer — acceptable, since EX-08 already flags those branches for separate review.

## Verification

- `grep -rn "escalates" src/` returns zero matches except the unrelated `aria-label="Doom escalates"` and "Doom escalates" text in `DoomPanel.tsx`.
- `npx vitest run` is green.
- Manual smoke: trigger `yha_nthlei_3`, pick "Let him attend" to force re-insert, redraw the card later, confirm displayed costs match the first-draw costs (F-1 I-2, no extra negative delta).

## Rollback

Single revert restores the field. No data migration required because no save format exposes `escalates`.
