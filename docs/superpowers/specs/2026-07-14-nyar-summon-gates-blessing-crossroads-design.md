# Nyar Summon Gates, Blessing Rebalance & Crossroads Stall — Design

**Date:** 2026-07-14  
**Backlog items:** P25-41, P25-21, P25-60  
**Files touched:** `nyarlathotep.ts`, `yha_nthlei.ts`, `shub_niggurath.ts`, `blessings.ts`, `gameStore.ts`

---

## P25-41 — 6/6 Summon Gate Redesign (all gods)

### Problem

All three gods' 6/6 summon cards had two issues:
1. The endRun "failure" option was always visible, making it feel like a deliberate choice rather than a fallback.
2. The victory conditions were opaque — the player could not see what resources they needed to summon. The conditions were pure `resourceMin` gates that just locked/greyed the option with no readable cost display.

### Resolution

**Issue 1 — endRun options:**  
Add `succumbOption: true` to all three gods' endRun opts. This flag makes the option invisible when any other option is selectable, and shows it with the red SUCCUMB pill only when neither victory option is available. No new code needed — machinery already exists.

**Issue 2 — Cost display:**  
Convert the resource gate conditions into actual drain effects (negative delta). Resources are consumed when the option is selected. Since `victory` / `partialVictory` ends the run immediately after effects resolve, the drain has no downstream gameplay consequence — it exists purely to display cost pills to the player.

Dread remains a condition gate (not a drain) because:
- It communicates "you need to have reached this intensity" rather than "this is sacrificed"
- Existing condition-lock behaviour is sufficient for dread visibility

`godPathStageMin` removed from all victory conditions — the chain reserve system guarantees card 6 arrives only after stage 5, making the check redundant.

**Partial victory hide rule (all gods):**  
Partial opts retain `NOT(full conditions met)` so they're hidden when full victory is available. This reduces noise when the player can afford the better outcome.

---

### Nyar 6/6 (`nyarlathotep_6`)

**Full victory — "Receive the message"**
- Effects: `−4 fol, −3 inf, −1 relic, victory`
- Condition: `fol ≥ 4 AND inf ≥ 3 AND relics ≥ 1 AND dread ≥ 6`

**Partial victory — "Receive parts of the message"**
- Effects: `−3 fol, −3 inf, −1 relic, partialVictory`
- Condition: `fol ≥ 3 AND inf ≥ 3 AND relics ≥ 1 AND dread ≥ 4 AND NOT(fol ≥ 4 AND inf ≥ 3 AND relics ≥ 1 AND dread ≥ 6)`

**endRun — "The signal overwhelms you"**
- Add `succumbOption: true`. No other changes.

*Old conditions removed: `fol ≥ 7`, `inf ≥ 6`, `dread ≥ 6` (full); `fol ≥ 5`, `inf ≥ 4`, `dread ≥ 4` (partial). New gates match drain amounts.*

---

### Yha 6/6 (`yha_nthlei_6`)

Dread gate dropped entirely — Yha's path focuses on influence and gold. Offering to the sea consumes material resources, not accumulated dread. The OR condition on partial is replaced with a clean dual-drain.

**Full victory — "Complete the rite"**
- Effects: `−5 inf, −4 gold, −1 relic, victory`
- Condition: `inf ≥ 5 AND gold ≥ 4 AND relics ≥ 1`
- *(Old: `−2 relics` only; gate: `inf ≥ 8, dread ≥ 6, relics ≥ 2`)*

**Partial victory — "Complete the rite (underprepared)"**
- Effects: `−3 inf, −3 gold, −1 relic, partialVictory`
- Condition: `inf ≥ 3 AND gold ≥ 3 AND relics ≥ 1 AND NOT(inf ≥ 5 AND gold ≥ 4 AND relics ≥ 1)`
- *(Old: `−1 relics` only; gate: `relics ≥ 1 OR (inf ≥ 5 OR dread ≥ 4)`)*

**endRun — "The water does not wait"**
- Add `succumbOption: true`. No other changes.

---

### Shub 6/6 (`shub_niggurath_6`)

Gates are balanced as-is. `theChanged` is tracked in the ShubTracker HUD, giving the player sufficient context. No drain effects added.

**Full victory — "Complete the offering"**
- Condition unchanged: `theChanged ≥ 3 AND relics ≥ 1`

**Partial victory — "Offer what you have"**
- Condition unchanged: `theChanged ≥ 2 AND fol ≥ 3 AND relics ≥ 1`

**endRun — "The offering is insufficient"**
- Add `succumbOption: true`. No other changes.

---

## P25-21 — `the_crawling_network` Blessing Rebalance

### Problem

Current: every 5th card drawn gives `+1 influence, +1 dread`. Too predictable and narrow — influence is always the bonus regardless of what the player needs. Fits the "signal" theme poorly.

### Change

New behaviour: every 5th card drawn gives `+1 to a random resource (from [followers, influence, gold, relics]), +1 dread`.

- Dread increment logic unchanged.
- The random resource is selected uniformly from `['followers', 'influence', 'gold', 'relics']`. Dread is excluded (already separately granted).
- Overflow/deficit effects are applied for whichever resource is selected (same as the current influence handling).
- Activity log entry updated to reflect which resource was granted.

**`blessings.ts` description update:**  
Old: `"Every 5th card drawn: Influence +1. Every 5th card drawn: Dread +1."`  
New: `"Every 5th card drawn: +1 to a random resource. Dread +1."`

**`gameStore.ts` implementation:**  
Replace the hardcoded `applyDelta(resources, 'influence', 1)` block with:
1. Pick random resource: `const pool = ['followers', 'influence', 'gold', 'relics']` → `pool[Math.floor(Math.random() * pool.length)]`
2. Apply `+1` delta to chosen resource with overflow/deficit effects (same pattern as current influence block)
3. Dread `+1` unchanged

---

## P25-60 — Crossroads (`nyarlathotep_3`) Opt2 Stall

### Problem

`nyarlathotep_3` (CS2, "The Black Man at the Crossroads") opt2 "Observe without intervening" has `advanceGodPath`. It should not — "observing without intervening" is a stall posture, not commitment to the path.

### Change

**Opt2 — "Observe without intervening":**

Old effects: `dread+1, seedWhispers:1, advanceGodPath`  
New effects: `dread+1, seedWhispers:1, insertCard(nyarlathotep_3, random, minPos:6, maxPos:9)`

Old condition: `godPathStageMin: 1`  
New condition: removed (no condition — always available; card only appears after CS1 via chain reserve)

Existing flavour text ("We watched a meeting from a distance. The distance felt insufficient.") is appropriate for a stall — no change needed.

This makes opt2 a true defer: you observe, the card returns later, you pay 1 dread for the delay. The two advance options (opt1 and prep-tag opt3) remain the commitment paths.

---

## Test coverage

- `nyarlathotep.test.ts`: update full/partial victory condition tests; add test that endRun opt is absent when victory opts are available (succumbOption behaviour)
- `yha_nthlei.test.ts`: update full/partial victory condition and effects tests
- `shub_niggurath.test.ts`: add `succumbOption: true` assertion on endRun opt
- `gameStore` blessing tests: update `the_crawling_network` assertion (resource is now variable — assert one of the four valid resources is incremented, not specifically influence)
- Crossroads test: assert opt2 inserts `nyarlathotep_3` and does not call `advanceGodPath`
