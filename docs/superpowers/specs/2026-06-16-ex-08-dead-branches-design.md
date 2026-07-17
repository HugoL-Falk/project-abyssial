# EX-08 — Dead-Branch Hybrid Audit

**Status:** Design approved 2026-06-16
**Source ticket:** [[knowledge/backlog.md]] EX-08 (P2); [[knowledge/investigations/2026-06-15-experienced-playthrough.md]] §EX-08
**Priority:** P2

## Problem

Across the 18 chain cards, ~14 options carry a "skip / re-insert / postpone" shape with no positive effect on first draw. The experienced-playthrough doc names them dead branches: skilled players never pick them, they exist as flavour and noob traps, and they waste meaningful decision space.

The mechanic is also less useful since EX-07 (s82) removed the `escalates` flag — deferring no longer punishes via cost growth.

## Decision

Hybrid pass: remove the 12 pure dead branches, rebalance 3 that carry flavour or edge-case rescue value, leave the 3 already-payoff options untouched.

## Scope

### A. Remove (12 options)

Each entry: file, card id, option label, current effects.

1. **`yha_nthlei.ts`** · `yha_nthlei_2` opt 3 "Leave it outside" — D+1, insert `neighbour_has_concerns`, re-insert self.
2. **`yha_nthlei.ts`** · `yha_nthlei_3` opt 2 "Let him attend" — F-1, I-2, re-insert self. (Strictly dominated by opt 1 "Approach him" which also costs I-2 and advances.)
3. **`yha_nthlei.ts`** · `yha_nthlei_3` opt 3 "Turn him away" — D+2, re-insert self (1-shot via `hideWhenUnavailable` + `cardOptionChosen`). After removal, also remove the `// "Turn him away" option should not reappear after being chosen once; this requires engine-level option-state tracking (TODO).` comment block.
4. **`shub_niggurath.ts`** · `shub_niggurath_1` opt 3 "Ignore it" — D+1, re-insert self.
5. **`shub_niggurath.ts`** · `shub_niggurath_2` opt 3 "Postpone" — D+2, re-insert self.
6. **`shub_niggurath.ts`** · `shub_niggurath_3` opt 3 "Chase it off" — F-1, D+3, re-insert self.
7. **`shub_niggurath.ts`** · `shub_niggurath_4` opt 3 "Disperse them and lock the barn" — F-2, I-2, D+3, re-insert self.
8. **`nyarlathotep.ts`** · `nyarlathotep_1` opt 3 "Do not attend" — F-2, no advance.
9. **`nyarlathotep.ts`** · `nyarlathotep_2` opt 3 "Submit a letter of concern" — I-2, D+2, no advance.
10. **`nyarlathotep.ts`** · `nyarlathotep_2` opt 4 "Walk through anyway" — D+1, no advance.
11. **`nyarlathotep.ts`** · `nyarlathotep_3` opt 3 "Discourage the meetings" — F-2, D+2, no advance.
12. **`nyarlathotep.ts`** · `nyarlathotep_4` opt 3 "Secure the book" — D+2, re-insert self at 2-3.

### B. Rebalance (3 options)

13. **`yha_nthlei.ts`** · `yha_nthlei_4` opt 2 "Request more time" — currently I-1, D+3, re-insert self at 3-5. **Drop the `influence -1` effect.** Becomes D+3, re-insert self at 3-5. Rationale: this is the only non-relic, non-burn path on card 4. Becomes a "dread-pay to retry" option — sometimes-correct when waiting for a relic.

14. **`nyarlathotep.ts`** · `nyarlathotep_1` opt 2 "Distribute pamphlets in the lobby" — currently G-1, I+1, no advance, gated on `gold ≥ 1`. **Add `followers +1`.** Becomes G-1, I+1, F+1, no advance. Rationale: a true lateral side-action — pay one gold to gain a follower and influence without advancing. Worth it when the player wants to bank stats for later cards. Keeps the gold-gate; flavour text already supports the follower gain ("the class was full, but will come back next week").

15. **`nyarlathotep.ts`** · `nyarlathotep_5` opt 2 "Destroy the equipment" — currently I-3, D+3, re-insert self at 7-9, gated on `influence ≥ 3`. **Drop to I-2, D+2.** Gate stays at `influence ≥ 3`. Rationale: EX-02 (Nyarlathotep partial-band trap) names this as the only stage-5 exit when the player wants to avoid Tune-in's I+4. A lighter tax keeps the partial-band rescue viable. (EX-02 itself is still open — this softens but does not close it.)

### C. Keep unchanged (informational only — no edits)

- `yha_nthlei_2` opt 2 "Send someone to return it" — R+1 payoff (EX-01 fix, s80).
- `shub_niggurath_4` opt 2 "Observe what unfolds" — inserts `shub_words_come_naturally` threat (different mechanic).
- `nyarlathotep_4` opt 2 "Let it circulate freely" — seedWhispers 1 (whisper-build payoff).

### D. Out of scope

- `yha_nthlei_5` opt 2 "Do not go" — inserts `something_came_to_the_door` threat (not a self re-insert).
- EX-02 partial-band trap proper — the `nyarlathotep_5` rebalance softens it but does not close the ticket.
- Re-tier of `terms_remain`, `shub_words_come_naturally`, etc. (threat-insert cards survive without their parents' dead branches because they remain on other branches or already exist independently).
- Removing related orphan card references — none of the deleted branches reference cards that become unreachable; threat inserts on opt 3 of `yha_nthlei_2` (`neighbour_has_concerns`) still appear from common-card pool.

## Balance impact (qualitative)

- **Y'ha-nthlei** loses 3 options (card 2 down 3→2, card 3 down 3→1, card 4 unchanged in count). Card 3 going to a single option is borderline — but the surviving option "Approach him" was already the only correct play; the loss is teaching loss, not decision loss. Acceptable.
- **Shub-Niggurath** loses 4 options (each of cards 1, 2, 3, 4 down by one). Each card retains 2 advance options.
- **Nyarlathotep** loses 5 options (cards 1, 2, 3, 4 lose dead picks); card 1 retains 2 options (advance + rebalanced pamphlets), card 2 retains 2, card 3 retains 2, card 4 retains 2. Two of card 5's options are unchanged in count.
- Rebalances soften 3 edge-case branches without breaking gate logic.

## Verification

- `npx vitest run` green (existing tests; no new tests required for pure deletion + numeric rebalances).
- `npx tsc --noEmit` zero errors.
- Smoke: open each affected card in-game, confirm option counts match table above and the removed labels are gone.
- Regression check: grep `cardOptionChosen` in src/ — should still resolve (the only consumer was `yha_nthlei_3` opt 3 which is now removed; if `condition` types remain valid, the engine should ignore unreferenced `cardOptionChosen` checks elsewhere — there were no others).

## Rollback

Single revert restores all branches. No data migration; no save format references option indices persistently (option choices are tracked by `cardOptionChosen` runtime state which simply won't trigger after rollback).
