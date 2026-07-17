# Tutorial Bug Fixes + Backlog Expansion — Design

**Date:** 2026-06-23
**Source:** Playtest 18, Cluster T1
**Status:** Approved, awaiting implementation plan
**Scope:** Two blocking bug fixes + restructured P18-5 backlog entry. **No tutorial content/text changes ship in this work.**

---

## Context

Playtest 18 surfaced three tutorial items (P18-2, P18-4, P18-5). The full tutorial redesign (P18-5) is deferred until closer to the July playtest — mechanics are still in flux and rewriting the script now risks rework. However, two bugs inside P18-4 make the current tutorial unfinishable, so they ship standalone. All cosmetic/text fixes from P18-2 and P18-4 are deliberately *not* in scope; they fold into the deferred redesign instead.

---

## Part 1 — Bug Fixes

### Bug A — `+2 insert` option not clickable for card preview

- **Card:** `tutorial_threats_treats` (`src/data/cards/tutorial.ts`).
- **Effects:** inserts `tutorial_threat_card` and `tutorial_treat_card` into `nextCycleQueue`.
- **Symptom (P18-4):** the inserted-card indicator on the option is not tappable to open the card preview the way other insert options are.
- **Suspected surface:** `OptionsColumn.tsx` (or whichever component renders insert-effect indicators on option chips) — the preview wiring may be filtering on tier (`'tutorial'` / `'threat'` / `'treat'`) or may require the inserted card to already be in a known registry that the tutorial cards bypass.
- **Required investigation (during implementation, using systematic-debugging):**
  1. Reproduce in the running tutorial.
  2. Identify which component owns option-insert preview-on-tap.
  3. Confirm whether the issue is (a) tutorial cards excluded from preview registry, (b) handler not bound for this option shape, or (c) something else.
  4. Apply the smallest fix that restores preview without affecting non-tutorial cards.
- **Acceptance:** tapping the `+2 insert` icon on `tutorial_threats_treats` opens the same preview UI that non-tutorial insert options show.
- **Non-goals:** changing the option's flavour, label, or `-card` indicator (those are P18-4 cosmetic items, deferred).

### Bug B — 2nd god path (`olgreth_2`) never appears, tutorial uncompletable

- **Expected flow** (from `tutorial.ts` header comment):
  1. `olgreth_1` runs `advanceGodPath`.
  2. `GOD_PATH_CHAINS` (registered in `src/data/index.ts`) maps `olgreth` stage 2 → `olgreth_2`, which gets queued into `nextCycleQueue`.
  3. Draw pile empties → reshuffle fires.
  4. Post-reshuffle draw includes `tutorial_reshuffle_card` (pinnedNextCycle), `tutorial_threat_card`, `tutorial_treat_card`, and `olgreth_2` (positioned ≥25% per chain rules).
- **Symptom (P18-4):** `olgreth_2` never surfaces; the run does not end.
- **Required investigation (during implementation, using systematic-debugging):**
  1. Reproduce in the running tutorial; confirm reshuffle does fire.
  2. Verify `olgreth_2` is registered in `GOD_PATH_CHAINS` and the chain entry references the correct card id.
  3. Verify `advanceGodPath` on `olgreth_1` actually pushes `olgreth_2` to `nextCycleQueue` (instrument or log).
  4. Verify nextCycleQueue isn't cleared or filtered by the reshuffle path.
  5. Verify nothing filters cards with `chainStage: 2` or `isSummoning: true` out of the post-reshuffle draw pile.
  6. Apply the smallest fix.
- **Acceptance:** running the tutorial end-to-end reaches `olgreth_2`, the user picks "Step forward," and `TutorialCompleteScreen` shows.
- **Non-goals:** redesigning the chain mechanic, changing chain placement rules, modifying `olgreth_1` flavour.

### Cross-cutting

- **Tests:** add a unit/integration test per bug that fails today and passes after the fix, so neither regresses silently into the July build.
- **No content/text edits.** Reviewers should reject any text-only diff in `tutorial.ts` from this PR.

---

## Part 2 — Backlog Restructure (P18-5)

Replace the single-line P18-5 entry in `knowledge/backlog.md` with a structured block so the deferred redesign brainstorm starts hot. Final shape:

```
- [ ] **P18-5.** Tutorial full redesign. Tier E. Deferred until pre-July content freeze. Format (sandboxed env + predefined slots) keeps; content is stale.

  Mechanics inventory the new tutorial MUST teach:
  - Weeks (renamed from days)
  - Rare swapping at reshuffle
  - Prep tags (carrier hint pill, dread-gate hint)
  - Deficit and overflow cards
  - 3 god paths (not 1) — selection flow
  - Activity log
  - Hint tooltips ((?), dread-gate, prep-carrier, requirement-replacement)
  - Surface cards / whisper
  - Passive-on-reshuffle effects
  - Recited vs. Ack/File split (Service Safari S3 outcome)
  - Closed-path reflection screen (S2)

  Format decisions to revisit:
  - Sandboxed env + predefined slots — keep
  - God selection inside tutorial — currently olgreth-only; pick one of three? all three? abstract "tutorial god"?
  - Length — currently 5 cards + reshuffle + god path; almost certainly needs more
  - Still-frame vs. live deck preview

  Open questions for the future brainstorm:
  - Skippable for returning players?
  - Does god-selection flavour (P18-6) live inside the tutorial flow or outside?
  - How does the tutorial signal "you're now in the real game"?

  Carry-over fixes to address during redesign (do NOT triage as separate tickets):
  - P18-2: em-dashes in tutorial pre-text
  - P18-2: sync the two tutorial pre-messages into one, take styling of the second
  - P18-4: drop `-card` indication on dread/relic options (cards pop anyway)
  - P18-4: talk about inserts in threat/treat cards instead
  - P18-4: remove rose-jewel mention from flavour
  - P18-4: remove the "reshuffle card being inserted" line — just have it pop as first card after reshuffle

  Agent: Design (brainstorm) → Card Mechanics + Thematic + Code (implement).
```

---

## Out of Scope

- All P18-2 and P18-4 cosmetic/text fixes (carried into the restructured P18-5 entry).
- Tutorial redesign itself.
- God-selection flavour (P18-6, cluster T10).
- Any change to non-tutorial card preview behaviour.

---

## Acceptance for This Spec

- Two bug-fix PRs (or one combined PR) merged with regression tests.
- Tutorial runs end-to-end on a fresh save.
- `knowledge/backlog.md` P18-5 entry replaced with the block above; P18-2 and the P18-4 cosmetic items removed as standalone entries (they live inside P18-5 now).
