# Spec — Y'ha-nthlei `recited` stage-5 bonus: add +1 Influence

**Date:** 2026-06-22
**Intent:** Coding (single-card data edit + test)
**Source finding:** [[knowledge/investigations/2026-06-22-god1-playthrough-postP14P16.md]] — tickets **G1-01 (P0, partially-resolved)** and **EX-G1-01 (P0, new)**
**Scope:** 1 file change in `src/data/godPaths/yha_nthlei.ts`, 1 test addition. No engine change.

---

## Problem

The Y'ha-nthlei chain has a structural ceiling on Influence that the prep-tag system (P14-4) accidentally exposed but did not resolve.

Pre-P14-4 finding (s86): **EX-01** — full victory was RNG-locked on `relic_market` frequency, because the chain spends 3 relics (card 4 −1, card 6 −2) and generates 0 internally.

Post-P14-4 (s87): the new stage-5 `recited` prep-bonus option on `yha_nthlei_5` ("Speak the closing rite") grants **+1 relic**, fixing the relic bottleneck for a player who routes a prep_carrier. Vet simulation in the new investigation confirms the relic supply is now solvable from a single prep_carrier.

New finding (s87 vet sim, **EX-G1-01**): with relics solved, the vet still lands at partial-victory because **Influence is the new ceiling**. Chain Influence generation across cards 1–5 nets +5 max (card 1 +1, card 2 +2, card 4 +2); the chain spends Influence on cards 3 and 6, and full victory requires I ≥ 8. The recited route consumes a turn that would otherwise have advanced Influence elsewhere, so the new bonus narrows the relic gap by widening the influence gap.

The chain is currently unwinnable from clean play on full-victory — relic was masking it; once relic is unmasked, the next axis fails.

## Proposed change

Add `{ type: 'resource', resource: 'influence', delta: 1 }` to the `recited` option's effects on `yha_nthlei_5`.

### Diff target

`src/data/godPaths/yha_nthlei.ts` lines ~213–223:

```diff
       {
         label: 'Speak the closing rite',
         flavourText: 'The rite has a final phrase. You held it back until now. The sea returns something to the doorstep before morning.',
         condition: { type: 'hasPrepTag', tag: 'recited' },
         effects: [
           { type: 'consumePrepTag', tag: 'recited' },
           { type: 'resource', resource: 'dread', delta: 2 },
+          { type: 'resource', resource: 'influence', delta: 1 },
           { type: 'resource', resource: 'relics', delta: 1 },
           { type: 'advanceGodPath' },
         ],
       },
```

## Value contract check

Prep-bonus stage contract (from `2026-06-22-p14-4-content-pass-design.md`):

| Stage | Tag | Costs | Bonus |
|---|---|---|---|
| 2 | studied | +1 dread | (cheap advance) |
| 3 | attended_seance | +1 dread | +1 inf |
| 4 | opium_pact | +1 dread | +1 fol |
| 5 | recited | **+2 dread** | **+1 relic** *(current)* → **+1 relic, +1 inf** *(proposed)* |

Stage 5 is the "stronger lever" tier — already pays +2 dread (double the others) and grants a relic (a structurally scarce resource). Adding +1 influence stays inside the contract's intent (s5 is the payoff tier) without breaking the dread-cost asymmetry.

### Cross-god balance

Comparing the other two gods' stage-5 recited bonuses (read `nyarlathotep.ts` and `shub_niggurath.ts` to confirm before merging):
- Nyarlathotep recited: ought to grant a path-relevant lever (whisper or follower variant).
- Shub-Niggurath recited: ought to grant a path-relevant lever (theChanged or mutation).

**Action**: audit during implementation. If Nyar/Shub recited options already grant a path-axis bonus alongside +1 relic, this change is symmetric. If not, file follow-up tickets — DO NOT touch them in this spec.

## Why not the alternatives

- **Drop card 6 full-victory I≥8 to I≥7**: would change the victory math for all players including non-prep routes, and the chain was tuned around 8 deliberately (it's the upper-skill ceiling axis). Worse, it implicitly buffs the entire chain, not the prep route.
- **Add +1 influence to a non-prep stage-5 option** (e.g. "Go at appointed time"): rewards players who never engaged the prep system. The point of P14-4 is to make prep-routing meaningful — bonuses belong on the prep option.
- **Add +1 influence to a different prep stage** (e.g. attended_seance at stage 3): stage 3 already grants +1 inf. Stacking inf earlier wouldn't reach a full I=8 either because the vet's stage-3 inf is then spent on card 4. The influence gap is at stage 5 — that's where the patch belongs.

## Test plan

Add one integration test in `src/data/godPaths/__tests__/yha_nthlei.test.ts` (or wherever the existing P14-4 sample tests live — `Grep "recited" --type ts` first):

```ts
test('yha_nthlei_5 recited grants +1 relic AND +1 influence on advance', () => {
  // Construct state with recited tag set, draw yha_nthlei_5, pick recited option
  // Assert post-state: relics +1, influence +1, dread +2, recited tag cleared
});
```

Reuse the existing P14-4 sample test scaffolding. One assertion line added compared to the existing `recited` sample test, if one exists.

## Acceptance criteria

- [ ] Diff matches the one-line addition above.
- [ ] Existing P14-4 sample tests still pass (the existing test for the recited bonus may need its assertion updated to include `influence: +1` — if so, that's part of the same commit).
- [ ] New/updated integration test passes.
- [ ] Typecheck clean.
- [ ] Vitest full suite passes (72/72 → 72/72 or 73/73).
- [ ] Cross-god audit note appended to this spec (Nyar/Shub recited options confirmed symmetric or follow-up tickets filed).

## Out of scope

- Card 6 victory threshold changes.
- Nyar/Shub recited tuning (audit-only this session).
- Influence generation on non-prep paths.
- The downstream finding **EX-G1-02** (recited requires Dread≥8 at resolve, counter-tutorial) — separate spec.
- The downstream finding **EX-G1-06** (P16-17 -2g removeRandomThreat strips prep carrier) — separate spec.

## Estimated effort

~10 lines including the test. One commit. No subagent dispatch required — controller can hold this in context.
