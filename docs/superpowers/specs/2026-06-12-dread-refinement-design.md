# Dread Refinement — Design Spec

**Date:** 2026-06-12
**Backlog items:** P10-25, P10-35, P11-21
**Session:** 68 (in progress)
**Predecessor:** session 65 (Dread Economy), session 67 (Resource Cap)

---

## Purpose

Refine three rough edges in the dread system that survived the Dread Economy pass:

1. **P11-21** — The first reshuffle is the player's first encounter with passive dread accumulation, and it can produce a silent dread spike that wasn't a choice.
2. **P10-25** — Options that push dread to ≥10 silently insert `weight_of_it` copies; the player has no pre-commit signal that they're about to fall off the cliff.
3. **P10-35** — Doom escalation curve never reaches tier 4 (`unravelling_4` — The Congregation Changes) within a normal 6-reshuffle short run, and the early curve can feel punishing.

This spec is engine + UI only. No card-data balance changes. `dreadPressureScaling` intensity is **deferred** to a post-playtest tuning pass.

---

## Decisions Locked (brainstorm session 68)

| # | Topic | Decision |
|---|---|---|
| 1 | P11-21 scope | Suppress **dread-positive** passive effects only on `reshuffleCount === 1`. Non-dread passives and dread reductions still fire. `unravelling_1` still inserts. |
| 2 | P10-25 treatment | Visual overflow indicator on the dread tag — **pulsating red** font-size animation. Option remains clickable; no modal, no disable. |
| 3 | P10-35 curve | Replace rate-based formula with explicit table: `1→1, 2→1, 3→2, 4→2, 5→3, 6+→4`. Tier 4 lands on the final reshuffle as climax. |
| 4 | P10-35 signature | Drop `runLength` parameter from `getUnravellingTier` (always short post-P13-16). |
| 5 | dreadPressureScaling | **No change.** Defer tuning to backlog post-playtest. |
| 6 | pendingUnravelling bump | **No change.** Pre-existing tier+1 on dread spike preserved. |

---

## Change 1 — P11-21: First-reshuffle dread-passive suppression

### Today

On every reshuffle, `applyPassivesForReshuffle(deck, resources)` walks all cards in draw + discard, finds `passive.trigger === 'reshuffle'`, and applies their effects to `resources`. Several passives add dread (e.g. `forgers_debt`, `what_was_done`, `changed_follower`-style cards). The first reshuffle therefore can deliver several silent dread points before the player has any opportunity to react.

### Target behavior

On `reshuffleCount === 1` (i.e. the first reshuffle), filter out **only** passive effects matching `type === 'resource' && resource === 'dread' && delta > 0`. Everything else fires:

- Non-dread resource effects (gold, followers, influence) — fire normally.
- Dread *reduction* passive effects (delta < 0) — fire normally.
- `randomOutcome` passives — fire, but inside the chosen branch, dread-positive resource effects are skipped.

On reshuffle 2+, behavior is unchanged.

### Engine change

`src/engine/deck.ts` — `applyPassivesForReshuffle`:

- Add a third optional parameter: `suppressDreadGain: boolean = false`.
- Inside the effect loop and inside the `randomOutcome` outcome resolution, skip any `resource` effect matching dread + positive delta when `suppressDreadGain` is true.

Call sites:

- `src/state/gameStore.ts` `reshuffleOnly()`: pass `reshuffleCount === 1` as the new arg.
- `src/engine/gameLoop.ts` `executeReshuffle()`: same — `reshuffleCount === 1` (note: at the call site `reshuffleCount` has already been incremented).

### Verification

Manual:
1. Start a run, pick up a card with a dread-positive reshuffle passive (e.g. `forgers_debt`).
2. Exhaust the draw pile.
3. Trigger reshuffle 1 → confirm dread did **not** rise from the passive.
4. Exhaust again, trigger reshuffle 2 → confirm dread rose from the passive this time.
5. Repeat with a non-dread passive (e.g. follower-gain) — should fire on reshuffle 1.

---

## Change 2 — P10-25: Pulsating overflow indicator on dread tag

### Today

`EffectTags` displays each resource effect as a tag with the delta. For a `dread +3` option clicked when current dread is 8, no visual difference vs. clicking it at dread 0 — even though the former inserts 1 (or 3) `weight_of_it` copies and triggers `pendingUnravelling`.

### Target behavior

When rendering a `type: 'resource', resource: 'dread', delta > 0` tag and the player's current `resources.dread + delta >= 10`, animate the tag's delta number with a pulsating font-size loop. Color remains the existing dread-up color (red). No new glyph, no opacity change. Tag remains clickable; option remains enabled.

### UI change

`src/components/game/EffectTags.tsx`:

- Accept `currentDread: number` (new prop) — threaded from the parent that already has access to `resources` (likely `OptionsColumn` → `DrawnCard`; verify during implementation).
- For each rendered dread-positive tag, compute `willOverflow = currentDread + delta >= 10`.
- When `willOverflow`, apply an inline CSS animation: `pulseDreadOverflow` keyframes, font-size scaling roughly `1.0 → 1.18 → 1.0`, duration ~1.2s, `infinite ease-in-out`.
- Tutorial: skip animation entirely (`isTutorial` short-circuit) — the overflow mechanic is bypassed in tutorial and the visual would mislead.

### Animation details

```css
@keyframes pulseDreadOverflow {
  0%, 100% { transform: scale(1.0); }
  50%      { transform: scale(1.18); }
}
```

Apply to the delta span only (not the resource icon), to keep tag layout stable. `transform-origin: center`. Use `animation: pulseDreadOverflow 1.2s ease-in-out infinite`.

If the existing component is purely CSS-in-JS inline styles (per architecture.md convention), the keyframes go into a shared style block injected once, or are defined as a `style` jsx-style construct already used in the codebase — verify pattern in implementation.

### Verification

Manual:
1. Set dread to 8 in dev tools / seed run; draw a card with a dread +3 option → tag delta pulses.
2. Set dread to 0, draw the same card → no pulse.
3. Set dread to 10, draw an option with dread +1 → pulse (already over, still overflow-relevant).
4. Tutorial run, any dread-positive option → no pulse.
5. Negative dread tags (dread −2) → never pulse.

---

## Change 3 — P10-35: New doom escalation curve

### Today

```ts
export function getUnravellingTier(reshuffleCount: number, runLength: RunLength): number {
  const rate = runLength === 'short' ? 2 : 3
  return Math.min(4, Math.floor((reshuffleCount - 1) / rate) + 1)
}
```

Short-run output: `1, 1, 2, 2, 3, 3, 4, …` — so tier 4 first appears at reshuffle 7. A normal short run is ~6 reshuffles long, so **tier 4 is effectively unreachable.**

### Target behavior

```ts
export function getUnravellingTier(reshuffleCount: number): number {
  if (reshuffleCount <= 2) return 1
  if (reshuffleCount <= 4) return 2
  if (reshuffleCount === 5) return 3
  return 4
}
```

Output: `1, 1, 2, 2, 3, 4, 4, 4, …`. Tier 4 lands on reshuffle 6 — the climactic final reshuffle of a normal short run.

### Engine change

- `src/engine/deck.ts`: rewrite `getUnravellingTier` per above. Drop `runLength` parameter.
- `src/state/gameStore.ts` `reshuffleOnly()`: update call site `getUnravellingTier(reshuffleCount, runConfig.runLength)` → `getUnravellingTier(reshuffleCount)`.
- `src/engine/gameLoop.ts` `executeReshuffle()`: same update.
- `pendingUnravelling` tier bump (`Math.min(4, unravellingTier + 1)`) — unchanged. So a dread spike before reshuffle 5 still bumps tier 3 → tier 4 climactically.

### Verification

Quick console / unit-test-style check:

```
getUnravellingTier(1) === 1
getUnravellingTier(2) === 1
getUnravellingTier(3) === 2
getUnravellingTier(4) === 2
getUnravellingTier(5) === 3
getUnravellingTier(6) === 4
getUnravellingTier(7) === 4
```

Manual full-run check: complete 6 reshuffles in a single run; confirm reshuffle 6 inserts `unravelling_4` (The Congregation Changes).

---

## Out of Scope

- `dreadPressureScaling` intensity (the `+unravellingTier−1` adder on flagged options). New backlog item: **"Dread pressure scaling tuning — review after playtest 14."**
- Late-game unravelling card *option* rebalance (separate Dread Economy follow-up if needed).
- `weight_of_it` insertion position (`minPos: 1, maxPos: 5`) — unchanged.
- `pendingUnravelling` tier bump on dread spike — unchanged.
- Tutorial behavior — unchanged (still bypasses all overflow).

---

## Files Touched

| Path | Change |
|---|---|
| `src/engine/deck.ts` | `getUnravellingTier` rewrite + signature change; `applyPassivesForReshuffle` accepts `suppressDreadGain` |
| `src/state/gameStore.ts` | Two call-site updates in `reshuffleOnly` |
| `src/engine/gameLoop.ts` | Two call-site updates in `executeReshuffle` |
| `src/components/game/EffectTags.tsx` | New `currentDread` prop + pulsating overflow animation on dread-positive tags |
| `src/components/game/OptionsColumn.tsx` (or DrawnCard) | Thread `resources.dread` into `EffectTags` props (verify exact source during implementation) |

Estimated diff size: <80 LOC across 5 files. Well under the 300-line refactor threshold.

---

## Backlog Updates After This Spec Lands

- Mark P10-25, P10-35, P11-21 done.
- Close "Session: Dread Refinement" in `backlog.md`.
- Open new item: **"Dread pressure scaling tuning"** under Resource Economy / Balance.
- Append decision block to `knowledge/decisions.md` under "Session 68 Design Decisions — Dread Refinement".

---

## References

- Predecessor spec: `docs/superpowers/specs/2026-06-09-dread-economy-design.md` (session 65)
- Backlog: `knowledge/backlog.md` → "Session: Dread Refinement"
- Current engine code: `src/engine/deck.ts` lines 157–193, `src/state/gameStore.ts` lines 940–963
