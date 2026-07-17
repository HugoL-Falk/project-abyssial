# Week Reframe & Recurring-Card Thematic Pass — Design

**Date:** 2026-06-16
**Status:** Draft — awaiting user review
**Source tickets:** P13-24 follow-up (Day reframe extension), Cluster C (P16-51, P16-25, P16-13b)
**Out of scope:** P13-24-followup #1 (between-weeks decision), P10-36 (Unravelling escalation), P13-dread-scaling, Cluster A/B/D

## 1. Summary

Two-phase spec under one design document:

1. **Phase 1 — Mechanical.** Rename "Day" → "Week" globally. Each reshuffle = one Week. Absorb Cluster C messaging tickets (P16-51, P16-25, P16-13b).
2. **Phase 2 — Thematic.** Rewrite flavour on the ~33 common + core cards to fit the "weekly rhythm of cult-running" frame. Mechanics unchanged.

Phases ship as separate plans under this spec. Phase 1 lands first (mechanical refactor + UX). Phase 2 lands afterward as a creative pass delegated to the Thematic agent.

## 2. Thematic Frame

Each Week = one compressed cycle of small-town cult life — roughly a week of village time, deliberately fuzzy. Recurring cards are the **rhythms** of that life: rent due, the weekly paper, congregation gathers, market day, harbour traffic, supplies running low. Flavour should read as cyclical obligation, not one-shot events.

Tone is unchanged — Lovecraftian dread, the existing register stands. This is reframing, not retoning.

## 3. Phase 1 — Week Rename + Cluster C UX

### 3.1 Global rename

| Old | New |
|---|---|
| `DayBanner.tsx` | `WeekBanner.tsx` |
| `<DayBanner>` import / export | `<WeekBanner>` |
| `dayNumber` prop | `weekNumber` |
| "Day N" UI label | "Week N" |
| "Day N" activity log copy | "Week N" |
| Any test fixtures referencing "Day" | "Week" |

Files known affected (audit at execution time):
- `src/components/game/DayBanner.tsx` (renamed)
- `src/components/GameScreen.tsx`
- `src/components/game/DrawPile.tsx`
- `src/components/game/ActivityLog.tsx` (or wherever reshuffle copy lives)
- Vitest files referencing "Day" copy

No card data files are touched in Phase 1.

### 3.2 P16-51 — Week banner positioning

**Current:** DayBanner is a floating overlay on reshuffle that fades.

**New:** WeekBanner is positioned **above** the draw deck (not a floating overlay), persists from reshuffle until the next card is drawn.

**Coordination:** The Doom-escalates modal (P16-13a, folded into Cluster A) will also want the top-of-deck slot. Phase 1 reserves the top slot for the Week banner and documents that Cluster A will need to position below it (or merge with it) when that work lands.

### 3.3 P16-25 — Reshuffle count unification

**Current:** Activity log shows pre-shuffle count; draw deck shows post-shuffle count. Mismatch confuses players.

**New:** Single source — post-reshuffle count, displayed in both the activity log and the draw deck. Pre-shuffle count is no longer surfaced.

### 3.4 P16-13b — Empty deck display

**Current:** Empty deck reads "12+3 more" (discard count + pending reshuffle additions).

**New:** Render the literal reshuffle total — the sum (`pendingReshuffleAddCount + discardCount`, or equivalent). Example: "15".

### 3.5 Phase 1 verification

- All existing tests pass after rename (grep for "Day" and `dayNumber` in test files).
- Manual: trigger reshuffle, confirm Week banner sits above deck and persists; confirm reshuffle count matches in both UI surfaces; confirm empty-deck shows correct total.
- No new vitest needed unless count-unification logic is non-trivial.

## 4. Phase 2 — Recurring-Card Thematic Flavour Pass

### 4.1 Target cards

Approximately 33 recurring cards.

**Common (8):** `the_inheritance`, `the_newspaper`, `word_spreads`, `the_harbormaster`, `the_left_item`, `the_collection`, `the_complaint`, `the_delayed_shipment`.

**Core (~25):** `congregation_meets`, `stranger_asks_questions`, `the_landlord_cometh`, `follower_confesses_doubt`, `relic_market`, `the_old_book`, `supplies_dwindle`, `rival_stirs`, `the_donation`, `the_harbour`, `the_fire`, `academic_society`, `woodcutters_report`, `the_printing_press`, `the_opium_den`, `the_census_agent`, `local_elections`, `the_seance`, … (full list pulled at execution time from `src/data/cards/core.ts`).

### 4.2 Constraints

- **Mechanics, option titles, option effects, hint tooltips — unchanged.**
- **Card titles — unchanged** unless audit flags one that explicitly breaks the weekly frame (escalate to Claudian; do not rewrite unilaterally).
- Flavour length stays within current bounds. Tier A P16 tickets are already trimming long flavour — don't undo.
- Audit pass: any in-card text using "day" / "today" / "tonight" / "this evening" → reframe to "this week" or remove the temporal anchor entirely.

### 4.3 Process

1. Claudian spawns the Thematic agent (`general-purpose` subagent + `knowledge/agents/thematic.md` injected) with the full card list and frame.
2. Thematic returns a proposal table: `card_id → old flavour → new flavour`.
3. Claudian reviews for tone, length, and frame consistency. Edits inline if needed.
4. Claudian applies edits to `src/data/cards/common.ts` and `src/data/cards/core.ts` via direct Edit calls.
5. Append lesson to `knowledge/agents/thematic.md` per backup-roster protocol.
6. Commit per logical group: common cards as one commit, core cards in 2–3 commits split by theme (e.g., civic cycles, supply cycles, social cycles).

### 4.4 Phase 2 verification

- Existing tests pass (mechanics untouched; flavour-string snapshots regenerate cleanly).
- Manual: skim 5 random recurring cards in-game across Week 1, Week 3, Week 5; confirm the weekly-rhythm frame reads through.
- No new vitest.

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Rename misses a string and "Day" leaks somewhere | Grep audit before commit; reserve a final pass after Phase 1 to sweep for stragglers |
| Thematic rewrite drifts in tone or length | Claudian reviews proposal table before applying; constraint section above is explicit |
| Phase 1 UI changes collide with Cluster A (Doom-escalates positioning) | Documented in §3.2; Cluster A spec will need to reconcile |
| Card flavour audit surfaces a card whose title or option contradicts the weekly frame | Escalate to Claudian; do not rewrite titles or options under this spec |

## 6. Open Questions

None at spec-writing time.

## 7. Plans

Two implementation plans will follow this spec:

1. `docs/superpowers/plans/2026-06-16-week-reframe-phase1.md` — rename + Cluster C UX.
2. `docs/superpowers/plans/2026-06-16-week-reframe-phase2.md` — thematic flavour pass.

Phase 2 may be deferred until Phase 1 ships and is playtested.
