# Shub-Niggurath theChanged Accessibility — Design Spec

**Date:** 2026-06-13
**Scope:** NB-01 from `knowledge/investigations/2026-06-13-noob-playthrough.md`
**Branch:** `claude/build-abyssial-game-IuJp8` (local only)

---

## Problem

Shub-Niggurath's chain victory condition gates on `theChanged ≥ 4` (full) or `theChanged ≥ 2` (partial). The resource has exactly one source in the current build: a hidden "dark option" on six mutated cards, gated by `cardDrawCount: 2` + `hideWhenUnavailable`. A first-time player has no way to discover that mutations exist, that mutated cards have hidden options, or that those options grant theChanged.

The Noob playthrough simulation found a player can complete 5 chain stages of Shub-Niggurath and arrive at Card 6 with `theChanged: 0`. Both victory paths are mechanically unreachable from the chain alone. The only on-screen exit is `endRun` ("The offering is insufficient").

This is unambiguously a teaching failure — but it's also a structural one. Even a veteran needs lucky draws to get 4 mutated-second-draws within a short run (~27 cards).

## Goal

A first-time Shub-Niggurath player taking the obvious advance options through the chain reaches Card 6 with `theChanged ≥ 2` and qualifies for partial victory (provided their relics are sufficient). Mutations remain in play as the optional richer path that pushes the run toward full victory at `theChanged ≥ 4`.

The chain becomes self-contained for partial-victory accessibility; mutations are no longer the sole gate.

## Change

Add `{ type: 'resource', resource: 'theChanged', delta: 1 }` to two existing chain options in `src/data/godPaths/shub_niggurath.ts`:

### Card 4 — "Lead the congregation" (shub_niggurath_4, option 1)

Existing effects:
```ts
{ type: 'resource', resource: 'relics', delta: -1 },
{ type: 'resource', resource: 'followers', delta: -3 },
{ type: 'resource', resource: 'dread', delta: 4 },
{ type: 'advanceGodPath' },
{ type: 'seedMutations', count: 2 },
```

New effects (added line):
```ts
{ type: 'resource', resource: 'relics', delta: -1 },
{ type: 'resource', resource: 'followers', delta: -3 },
{ type: 'resource', resource: 'dread', delta: 4 },
{ type: 'resource', resource: 'theChanged', delta: 1 },
{ type: 'advanceGodPath' },
{ type: 'seedMutations', count: 2 },
```

Conditions unchanged: `godPathStageMin: 3 AND resourceMin: relics 1 AND resourceMin: followers 3`.

### Card 5 — "Follow it in" (shub_niggurath_5, option 1)

Existing effects:
```ts
{ type: 'resource', resource: 'followers', delta: -3 },
{ type: 'resource', resource: 'dread', delta: 5 },
{ type: 'advanceGodPath' },
{ type: 'surfaceCards', maxPos: 5 },
```

New effects (added line):
```ts
{ type: 'resource', resource: 'followers', delta: -3 },
{ type: 'resource', resource: 'dread', delta: 5 },
{ type: 'resource', resource: 'theChanged', delta: 1 },
{ type: 'advanceGodPath' },
{ type: 'surfaceCards', maxPos: 5 },
```

Conditions unchanged: `godPathStageMin: 4 AND resourceMin: followers 3`.

## Rationale for the two chosen options

Both options already model "your followers are being transformed" in their flavour text:

- Card 4 "Lead the congregation": *"Not everyone who attended has been accounted for since."*
- Card 5 "Follow it in": *"…the followers who went to look have come back — but they have not said what they saw."*

The theChanged resource numerically expresses what the flavour already describes. The grant is narratively earned, not arbitrarily injected.

The two options are also both already on the canonical "advance the chain" path — they're the routes a player picks when they want to progress. Adding theChanged here means the resource accrues naturally for any player choosing forward momentum, without requiring esoteric play patterns.

Card 5's other advance option ("Leave an offering at the boundary") intentionally does NOT receive theChanged. That option trades relics for safer dread (R-2 D+3 instead of F-3 D+5) and is the relic-spending alternate; granting it theChanged would make it strictly dominant. It remains a no-theChanged option, preserving meaningful choice between Card 5's two advance options.

## Resource trajectory after the change

A Noob taking obvious advance options through the chain:

| Stage | Option | theChanged after |
|---|---|---|
| 1 | Make contact | 0 |
| 2 | Willing participants OR preparations | 0 |
| 3 | Claim it formally | 0 (seedMutations 2) |
| 4 | Lead the congregation | 1 |
| 5 | Follow it in | 2 |
| 6 | Complete partial (if relics ≥ 2) | — partial victory |

Veteran adding mutations (best case: 2 mutated-second-draws on dark option):

| Stage | Option | theChanged after |
|---|---|---|
| ... | (chain as above) | 2 |
| Mid-run | Mutation 1 dark option | 3 |
| Mid-run | Mutation 2 dark option | 4 |
| 6 | Complete full victory | — full victory |

## Out of scope

The following NB-01 adjacent issues are explicitly NOT addressed in this spec. Each gets its own design session.

1. **Partial-victory relic-gate tension.** Card 4 "Lead the congregation" costs R-1. A chain-only partial-victory player who took this option then needs to gain 2 more relics by Card 6 (from `relic_market` or rare-card drops). Whether this gate is appropriately reachable is a separate balance question.
2. **`seedMutations` silent effect feedback.** Players still won't know mutations are happening. Cluster D from the noob playthrough report.
3. **Chain victory condition signposting.** Card 6's tri-resource gate is still unannounced before reaching Card 6. Cluster A from the noob playthrough report.
4. **Tooltip + UI legibility of theChanged.** Verify the existing `EffectTags` component renders "+1 The Changed" with the resource icon. If it doesn't, a separate visual task.

## Acceptance checklist

- [ ] `shub_niggurath_4` option 1 ("Lead the congregation") has `theChanged +1` added between dread and advanceGodPath.
- [ ] `shub_niggurath_5` option 1 ("Follow it in") has `theChanged +1` added between dread and advanceGodPath.
- [ ] No other Shub chain options modified.
- [ ] Mutation cards unchanged.
- [ ] `npm run typecheck` clean.
- [ ] Manual smoke: start a Shub run, take Card 4 "Lead the congregation" → confirm theChanged increments by 1 in the resource bar. Same for Card 5 "Follow it in".

## Follow-ups (for the backlog)

After this ships:
- Add to backlog as **NB-01-followup-relics**: balance check on chain-only partial-victory relic accessibility.
- Add to backlog as **NB-01-followup-ui**: verify theChanged effect tag legibility in `EffectTags.tsx`.
