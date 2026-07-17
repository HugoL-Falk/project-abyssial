# S2 — Run-End "What You Missed" Reflection Screen — Design

**Date:** 2026-06-22
**Status:** Spec ready for review
**Source:** [[knowledge/investigations/2026-06-22-service-safari.md]] §S2
**Backing evidence:** BoH 90%-positive cozy-discovery model + Fallen London storylet→story critique.

---

## Goal

Turn every defeat into legible progress without exposing run content mid-flight. Show the player *that* content existed that they didn't see — without telling them *how* to trigger it. Discovery preserved; "did I miss something?" frustration answered.

## Scope (locked)

| Decision | Choice |
|---|---|
| Trigger | **Defeat only** (`phase === 'gameOver'`). Victory does not show the reflection. |
| Row set | **3 rows**: prep-locked options / affordability-locked options / closed chain paths. |
| Specificity | **Counts + vague path-names.** Path names use existing tonal phrases (e.g. `"the recited descent"`). No card names, no option text, no triggers. |
| Data source | **Live counters in `gameStore`**, incremented at the existing option-filter site. No post-run replay; no engine duplication. |
| Flow | **Two-step.** Existing `FailureScreen` (tonal beat) → `Continue` button → new `ReflectionScreen` on same `gameOver` phase. |

## UX

### Step 1 — Existing FailureScreen (unchanged tonal beat)

`src/components/FailureScreen.tsx` keeps its current layout: italic failure prose, run-stats (`cards drawn`, `god rites N/6`), god-tint background. The **only change** is the footer button pair (`New Run` / `Main Menu`) is collapsed into a single primary **`Continue`** button. Local component state `showReflection: boolean` toggles to step 2 on tap.

### Step 2 — ReflectionScreen

New component `src/components/ReflectionScreen.tsx` (~80 lines). Same god-tint background as step 1 for visual continuity. Layout:

```
─────────────────
  WHAT YOU MISSED
─────────────────

  ◌  3 options stayed hidden behind preparations
  ◌  2 options you couldn't afford
  ◌  1 path closed: "the recited descent"

─────────────────
   [ New Run ]
   [ Main Menu ]
```

- Header style: matches `The Run Ends` (uppercase, letter-spaced, red accent).
- Rows: bullet glyph `◌` + count + soft italic descriptor.
- **Each row only renders if its count > 0.**
- **Zero-rows case** (perfect-discovery defeat): render single italic line *"You walked every road that opened to you."*
- Footer: existing `New Run` + `Main Menu` buttons (same handlers as today).

## Data model

### New type

```ts
// src/types/index.ts
export interface RunStats {
  prepLockedSkipped:   number   // count of options filtered by prep-tag gate
  affordLockedSkipped: number   // count of options filtered by cost gate
  closedPaths:         string[] // path-name strings, e.g. "the recited descent"
}
```

### Store

`gameStore` gains `runStats: RunStats`, initialised to `{ prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] }`. Reset in `resetGame` alongside other run-state.

### Increment points

1. **Prep-lock + afford-lock counters:** at the existing option-visibility filter site (same logic that drives the locked pills in `OptionsColumn.tsx`). On each card draw, sum the count of options filtered for each reason and add to the running total. *Counts options not seen, not cards drawn.* Each option counts at most once per draw.

2. **Closed paths:** registry-driven. When a path's lockout condition becomes true and the path is not already in `closedPaths`, push its name. Idempotent — even if the lockout condition oscillates, the name is pushed at most once per run.

### Path registry

```ts
// src/data/closedPaths.ts  (new, ~20 lines)
export interface PathLockoutRule {
  pathName: string                            // e.g. "the recited descent"
  isClosed: (state: GameState) => boolean     // pure predicate
}

export const PATH_LOCKOUT_RULES: Partial<Record<GodPath, PathLockoutRule[]>> = {
  yha_nthlei: [
    {
      pathName: 'the recited descent',
      isClosed: (s) => /* dread has left the recited band AND stage-5 carrier
                          can no longer be resolved before chain advances */,
    },
  ],
  // nyarlathotep + shub_niggurath: deferred to follow-up tickets
}
```

Path-check runs once per turn at end-of-turn in `gameStore`. New paths slot in by adding entries — no engine changes.

## Files touched

| File | Change | Approx lines |
|---|---|---|
| `src/types/index.ts` | Add `RunStats` interface | +6 |
| `src/state/gameStore.ts` | Add `runStats` to state, reset, increment at filter site, end-of-turn path-check loop | +25 |
| `src/data/closedPaths.ts` | **NEW.** `PATH_LOCKOUT_RULES` registry, Y'ha entry only for v1 | +25 |
| `src/components/FailureScreen.tsx` | Collapse button pair → `Continue`; local `showReflection` state; conditionally render `<ReflectionScreen />` | ~−10 / +15 |
| `src/components/ReflectionScreen.tsx` | **NEW.** Presentational component | +80 |
| `src/state/gameStore.test.ts` | New `runStats` test block | +60 |

Total: ~+200 lines, 1 new component, 1 new data file, 1 new type. Well under the 300-line refactoring threshold for any single file.

## Testing

Vitest, in `gameStore.test.ts`:

1. `runStats` initialises to `{ prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] }` on `resetGame`.
2. Drawing a card whose option list contains 2 prep-locked options increments `prepLockedSkipped` by exactly 2.
3. Drawing a card whose option list contains 1 affordability-locked option increments `affordLockedSkipped` by exactly 1.
4. An option that is *both* prep-locked and afford-locked counts once for the higher-priority reason (prep-lock takes precedence — TBD-resolved: prep-lock first).
5. Y'ha run: simulating dread crossing out of the recited band on a stage-5 carrier pushes `"the recited descent"` to `closedPaths` exactly once, even if dread re-crosses.
6. Non-Y'ha runs do not populate `closedPaths` (registry has no entries).
7. Defeat with all counters at zero: `ReflectionScreen` renders the zero-rows fallback line.

No new tests for `FailureScreen` / `ReflectionScreen` rendering — component logic is presentational and exercised through manual playtest per CLAUDE.md policy.

No `gameLoop.ts` changes (live execution path is `gameStore.ts::resolveOption`; the dead-code mirror is the subject of a separate flagged cleanup ticket).

## Out of scope

- **Victory-side reflection** — defeat-only by decision Q1.
- **Nyar / Shub named paths** — registry supports them; entries deferred to per-god follow-up tickets.
- **Unseen rares row / per-god lifetime tally / codex** — drift toward meta-progression checklist; deliberately omitted per safari §"What NOT to copy" (Astrea unlock meta).
- **`gameLoop.ts` cleanup** — separate flagged ticket; mirror remains unpatched here.
- **New lock types** beyond prep / affordability — add by extending the filter-site counters when introduced.

## Open questions

None remaining. All 5 brainstorm questions resolved; design coheres into a single approach.

## Risks

1. **Filter-site coupling.** Counter logic lives at the same site as the locked-pill renderer. If the pill renderer ever diverges from the count site, counts drift. *Mitigation:* both read from the same `getVisibleOptions` (or equivalent) function. Tests assert option-count parity.
2. **Path predicate correctness.** The `"the recited descent"` predicate must fire on the actual lockout condition, not a proxy. *Mitigation:* the implementation plan will derive the exact dread-band + stage-5-pending condition from existing code; test 5 simulates it explicitly.
3. **Zero-rows tonal weight.** "You walked every road that opened to you" on a defeat could read smug. *Mitigation:* surface in playtest; copy is one-line and easy to revise.
