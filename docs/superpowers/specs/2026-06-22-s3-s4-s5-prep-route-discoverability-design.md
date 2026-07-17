# Spec — S3 + S4 + S5 prep-route discoverability bundle

**Date:** 2026-06-22
**Intent:** Coding (data + engine + UI)
**Source findings:** [[knowledge/investigations/2026-06-22-service-safari.md]] (S3/S4/S5) and [[knowledge/investigations/2026-06-22-god1-playthrough-postP14P16.md]] (EX-G1-02, EX-G1-06)
**Closes:** EX-G1-02 (S3), EX-G1-06 (S4). Partial side-effect close of EX-G1-01 / G1-01 (see Risk section).
**Scope:** 3 data condition edits, 1 engine filter extension, 1 UI hint-pill branch, ~5 new tests.

---

## Problem

Three related issues observed in the s88 Y'ha-nthlei simulated playthrough and reinforced by Service Safari review evidence across 8 neighbouring games:

1. **EX-G1-02** — the "recited" prep route on `what_was_already_read` requires Dread ≥ 8 to unlock. The game teaches "Dread = bad" throughout the early tutorial, then this single card requires the player to actively pump dread above 8 to access the option that grants +1 relic on the final chain card. Counter-tutorial; only discoverable via source-reading. Reigns / Cultist Sim / BoH reviews confirm counter-intuitive gates are the #1 hated mechanic in this genre.
2. **EX-G1-06** — `removeRandomThreat` (the "Have him followed" -2g option on `stranger_asks_questions`, post-P16-17 baseline) can silently delete `what_was_already_read` from the deck, destroying the prep route the player set up by burning the Old Book. No player-facing signal that this is happening.
3. **S5 / dread-gate discoverability** — dread-threshold-gated options today are hidden when the threshold is unmet. After the s88 prep-tag carrier hint pill (`fcd9e69`), prep-tag-gated options render greyed with a `Requires: <themed label>` pill. Dread-gated options have no equivalent affordance.

## Proposed changes

### S3 — Lower the recited dread gate from ≥ 8 to ≥ 6, clean-split with Ack/File at ≤ 5

`src/data/cards/threats.ts`, on the `what_was_already_read` card:

| Option | Current condition | New condition |
|---|---|---|
| Acknowledge it | `resourceMax: dread max: 7` | `resourceMax: dread max: 5` |
| File it away | inner `resourceMax: dread max: 7` (inside an `and` with `resourceMin gold min: 2`) | inner `resourceMax: dread max: 5` |
| The words arrange themselves | `resourceMin: dread min: 8` | `resourceMin: dread min: 6` |

Behaviour after:
- D = 0–5 → Ack + File visible (File still requires gold ≥ 2). Words hidden.
- D = 6+ → Words visible. Ack + File hidden.
- Clean handoff at D = 6 — the same threshold as the partial-victory dread band on `yha_nthlei_6`. A player drifting toward partial naturally crosses 6, lands the recited tag, and earns +1 relic on `yha_nthlei_5` without ever needing to do counter-tutorial dread-pumping.

### S4 — Exclude prep-carrier cards from removeRandomThreat target pool

`src/engine/gameLoop.ts`, `removeRandomThreat` case (~line 328):

```ts
// New: derived once at module scope from the existing PREP_TAG_CARRIERS registry.
import { PREP_TAG_CARRIERS } from '../data/godPaths/prepTagCarriers'
const PREP_CARRIER_IDS: ReadonlySet<CardId> = new Set(
  Object.values(PREP_TAG_CARRIERS).flat().map(c => c.cardId)
)

// Inside the removeRandomThreat case, extend the filter:
.filter(({ card }) =>
  card.tier === 'threat'
  && !card.permanent
  && !PREP_CARRIER_IDS.has(card.id)
)
```

Silent — no UI signal, no toast, no log line change. The option still does its job (removes a non-carrier threat if one exists); carriers stay in the deck.

### S5 — Add `Unlocks at Dread ≥ N` hover tooltip on existing dread-condition pill

**Code-reality update (post-spec):** the existing locked-option dread pill at `OptionsColumn.tsx:159–172` already renders `<dread-icon> ≥ N` for any option with a `resourceMin: dread` condition. The investigation's "hidden" claim was outdated — the option IS rendered (as a locked button) with the terse pill. Only the verbose wording is missing.

Minimum-diff approach: add a `title` HTML attribute on the existing dread-condition pill span so hover / long-press reveals the verbose wording **`Unlocks at Dread ≥ {N}`** (or `Hidden when Dread > {N}` for the `resourceMax` direction, if we extend symmetrically — see Out-of-Scope below).

Render path: `src/components/game/OptionsColumn.tsx:163` (the existing `<span key="dcond-${i}">`):
- Add `title={...}` attribute with verbose wording derived from the comparator (`>=` → "Unlocks at", `<=` → "Hidden when").
- No visual change. No new pill, no new component. Tooltip only.
- Scope: dread only (matches the existing pill's scope).

## Architecture details

### Files touched
1. `src/data/cards/threats.ts` — 3 numeric edits on `what_was_already_read`.
2. `src/engine/gameLoop.ts` — import + 1 derived set + filter extension on `removeRandomThreat`.
3. `src/components/game/OptionsColumn.tsx` — 1 new conditional branch for dread `resourceMin` gates, alongside the existing prep-tag pill (~line 216).
4. `src/state/gameStore.test.ts` (or sibling test file) — new test cases.

### No new public types or data files needed
S4 reuses the existing `PREP_TAG_CARRIERS` registry. S5 reuses the existing locked-option pill component.

## Tests

1. **S3-1**: `what_was_already_read` at D = 4 → Ack visible, File visible (assuming gold ≥ 2), Words hidden.
2. **S3-2**: `what_was_already_read` at D = 5 → same as D = 4 (boundary on new `max: 5`).
3. **S3-3**: `what_was_already_read` at D = 6 → Words visible, Ack hidden, File hidden (boundary on new `min: 6`).
4. **S4-1**: `removeRandomThreat` with `what_was_already_read` + one generic threat in deck → only the generic threat is removed; carrier remains.
5. **S5-1**: Render test — locked dread-gated option's pill has a `title` attribute containing `Unlocks at Dread ≥ 6`.

## Risk & rollout

### Risk: balance shift on Y'ha-nthlei full-victory rate (intended direction)
The s88 vet sim landed partial at I = 7 / R = 2. With S3, the vet no longer burns T13 on a dread-pump pivot — they bank the turn for an influence-gaining play. Full-victory rate likely rises. This is the *intended* direction (G1-01 / EX-G1-01 flagged Y'ha as currently partial-locked), but it means **S3 partially closes G1-01 as a side effect**. Do not also ship an additional `+1 I` on the recited bonus (a previously-considered fix) until the next playtest confirms whether S3 alone is sufficient. Flag in playtest report.

### Risk: S4 makes `removeRandomThreat` strictly better
Today the option carries a hidden risk of nuking your own prep route. After S4, that risk is gone. Players who never knew about the risk lose nothing; players who knew it gain a free upgrade. Across Nyar/Shub the option becomes uniformly more attractive. Likely fine (it costs 2 gold and the carrier-protection is invisible to noobs), but worth a one-line note in the next balance review.

### Risk: S5 copy could be misread as a cost
"Unlocks at Dread ≥ 6" was chosen over "Requires: Dread ≥ 6" specifically because **"Unlocks" disambiguates the pill from a resource cost.** If post-playtest feedback shows confusion, fall back to a two-line variant (`Unlocks at` / `Dread ≥ 6` stacked) or an icon prefix.

### Out of scope (deferred)
- **Run-end "What you missed" reflection screen (S2)** — separate spec, larger UI surface. Defer to follow-up brainstorm.
- **General dread-tug preview pills on every option (broad S5)** — user explicitly narrowed S5 to "only on locked/conditional options." Broader rollout would re-open the brainstorm.
- **Additional `+1 I` on recited bonus** — already shipped in s88 (`65d9e3f`). No further change.

## Open questions
None. All ambiguities locked during the brainstorm.

## Acceptance criteria
- All 77 existing vitest cases still pass.
- 5 new test cases pass.
- `typecheck` clean.
- Manual smoke test: load a Y'ha-nthlei run, burn the Old Book, raise dread to 6, verify Words option appears with no pill (because not locked), AND that lowering dread back below 6 hides Words and re-shows Ack/File with the `Unlocks at Dread ≥ 6` pill on Words.
