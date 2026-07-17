# Whisper Guaranteed Surfacing — Design

Date: 2026-06-15
Resolves: EX-03 (P1), NB-10 (P2) — "whispers seeded but never resolved in short runs"
Source investigations: `knowledge/investigations/2026-06-13-noob-playthrough.md`, `knowledge/investigations/2026-06-15-experienced-playthrough.md`

## Problem

`seedWhispers(N)` tags N random card IDs from an 8-card pool as "whispered." A whisper option only injects when one of those tagged cards is *later drawn*. Short runs (~27 cards) routinely seed 3–5 whispers and surface zero. Confirmed at both noob and skill level. The mechanic is non-functional for the majority of runs.

## Goal

A seeded whisper should reliably surface within a small number of draws after seeding, without changing the existing pool, the cap on simultaneously-active whispers, or the whisper option authoring in `whispers.ts`.

## Non-goals

- Redesigning whisper effects, themes, or the pool composition
- Changing the 5-active cap
- UI changes (the `seedWhispers` chip tooltip shipped in session 81 covers teaching)
- Reworking `seedMutations` or `surfaceCards` (separate mechanics)

## Design

### Selection policy (the "hybrid")

A new pure function in `engine/whispers.ts`:

```ts
applyWhisperSeed(
  count: number,
  alreadyActive: CardId[],
  drawPile: Card[]
): { newTargets: CardId[]; cardsToInsert: CardId[] }
```

Algorithm:

1. `eligible = WHISPER_POOL_IDS - alreadyActive`
2. `cap = min(count, 5 - alreadyActive.length)` — preserves the existing hard cap of 5 simultaneously active whispers
3. Partition `eligible` into two sets:
   - `inPile` — id appears in the current `drawPile`
   - `notInPile` — id is in the pool but not currently in the draw pile
4. Shuffle each partition independently
5. Drain `inPile` first up to `cap`. If `cap` is not yet reached, drain `notInPile`
6. `newTargets` = the union of picks
7. `cardsToInsert` = only the `notInPile` picks (these need to be physically inserted so the player can draw them)

### Insertion

For each id in `cardsToInsert`, the caller (`gameStore.ts` and `gameLoop.ts`) looks up the card from the card catalog (same lookup `surfaceChainCard` uses today) and inserts it into the draw pile at a random position in `[1, min(4, drawPile.length)]`. Position 0 is reserved — the player's current turn is already drawn or about to be drawn from the top.

The `N=4` ceiling matches the investigation's "surface within N=4 draws of seeding" guidance.

### Integration points

`gameStore.ts` (`seedWhispers` handler near line 842) and `gameLoop.ts` (`seedWhispers` case near line 381) both replace their current 2-line bodies with:

1. Call `applyWhisperSeed(effect.count, activeWhispers, deck.drawPile)`
2. Extend `activeWhispers` with `newTargets`
3. For each id in `cardsToInsert`, insert the corresponding card into `drawPile` at a random position in `[1, min(4, len)]`

### Edge cases

| Case | Behaviour |
|---|---|
| All 8 pool ids already active | `cap = 0`; return empty result. Existing cap behaviour preserved. |
| `eligible` empty after filter | Return empty. No crash. |
| `cardsToInsert` id missing from card catalog | Skip that id silently (defensive). Pool ids are stable, so this should not happen in practice. |
| Draw pile empty or near-empty when inserting | Random position clamped to `[1, drawPile.length]`. If `drawPile.length === 0`, insert at position 0. |
| Card currently in hand | Treated as not-in-pile. Tagging it late is moot because its options are already resolved this turn; if a fallback insert duplicates the id into the draw pile, the player draws a fresh whispered copy later. Acceptable. |

### Test plan

New file: `src/engine/whispers.test.ts`

Unit tests for `applyWhisperSeed`:

1. **In-pile preference** — given a draw pile containing 3 eligible ids and 3 eligible ids not in the pile, seeding count=3 returns 3 in-pile targets and zero inserts
2. **Fallback inserts** — given an empty draw pile (or no overlap), seeding count=2 returns 2 targets all flagged for insertion
3. **Partial fallback** — given 1 in-pile and 3 not-in-pile, seeding count=3 returns 3 targets with exactly 2 inserts (the not-in-pile picks)
4. **5-active cap** — with 4 already active, seeding count=3 returns at most 1 new target
5. **All active** — with all 8 already active, seeding count=N returns empty
6. **Empty eligible** — with all pool ids already active, returns empty

Integration check (manual): start a Nyarlathotep run, pick the seedWhispers-bearing chain option early. Confirm at least one whisper-injected card draws within 4-5 turns.

## Scope estimate

| File | Change |
|---|---|
| `src/engine/whispers.ts` | +~35 lines (new `applyWhisperSeed` export; existing helpers retained for now) |
| `src/state/gameStore.ts` | ~10 lines changed in `seedWhispers` case |
| `src/engine/gameLoop.ts` | ~10 lines changed in `seedWhispers` case |
| `src/engine/whispers.test.ts` | new test file, ~60 lines |

No card-data changes. No UI changes. No type changes.

## Out of scope / follow-ups

- The existing `selectWhisperTargets` export remains for now to avoid breaking any other importers. A follow-up pass can remove it once nothing references it.
- Whisper option content tuning (e.g. the +2 dread cost on every whisper) is unchanged here.
