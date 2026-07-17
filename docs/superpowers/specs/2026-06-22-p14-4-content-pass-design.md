# P14-4 Content Pass — Spec

**Date:** 2026-06-22
**Intent:** Author the content delegated by the s86 prep-tag engine spec — 11 chain-card bonus options, 3 threat TODO cleanups, 4 defer-carrier extensions, 3 WeekBanner prep-nudge strings.

Engine reference: [[Code/project-abyssial/docs/superpowers/specs/2026-06-17-god-path-prep-tags-design.md]]. Engine shipped s86 (17 commits, `4683cb1` → `6e3ba03`). One end-to-end bonus option exists today on `yha_nthlei_2` ("Speak the deep tongue") as the seed — flavour polish only.

---

## Stage-scaled bonus pattern

Every prep-bonus option carries `consumePrepTag(tag)` + `advanceGodPath`. Resource cost/reward scales by chain stage:

| Stage | Tag | Resource template | Intent |
|---|---|---|---|
| 2 | `studied` | `+1 dread`, advance | Cheap advance (mirrors seed) |
| 3 | `attended_seance` | `+1 dread, +1 inf`, advance | Advance + small benefit |
| 4 | `opium_pact` | `+1 dread, +1 fol`, advance | Advance + dampens chain mid-cost |
| 5 | `recited` | `+2 dread, +1 relic`, advance | Stronger late lever (relic gain) |

Same shape across all three gods. Per-god flavour layer differentiates voice (Y'ha = ocean/depths/tongue; Nyar = whispers/dreams/recognition; Shub = roots/flesh/feeding).

Tag↔stage pairing is uniform across gods (locked in the s86 spec): `studied↔2`, `attended_seance↔3`, `opium_pact↔4`, `recited↔5`.

---

## Chain-card bonus options (12 cards total — 11 new + 1 polish)

Each option's structure:
- `label` and `flavourText` per the table below
- `condition: { type: 'hasPrepTag', tag: '<paired-tag>' }`
- `effects: [{ type: 'consumePrepTag', tag: '<paired-tag>' }, ...resource deltas..., { type: 'advanceGodPath' }]`

| Card | Stage | Tag | Label | Effects (after `consumePrepTag` + advance) | Flavour |
|---|---|---|---|---|---|
| `yha_nthlei_2` | 2 | studied | Speak the deep tongue *(seed — polish)* | `+1 dread` | *"The book spoke first. You answer second. The conversation feels older than either of you."* |
| `yha_nthlei_3` | 3 | attended_seance | Recognise the sign | `+1 dread, +1 inf` | *"At the gathering they made a shape with their hands. You make it back. They nod, and one of them adjusts his place at the table."* |
| `yha_nthlei_4` | 4 | opium_pact | Sign the dream-bound version | `+1 dread, +1 fol` | *"The version of the document you read in the den had different terms. Better terms. You sign that one. Someone from the den comes with you afterwards."* |
| `yha_nthlei_5` | 5 | recited | Speak the closing rite | `+2 dread, +1 relic` | *"The rite has a final phrase. You held it back until now. The sea returns something to the doorstep before morning."* |
| `nyarlathotep_2` | 2 | studied | Recognise the pattern | `+1 dread` | *"You have read this shape before. The recognition does not comfort you, but it does steady you."* |
| `nyarlathotep_3` | 3 | attended_seance | Greet him as expected | `+1 dread, +1 inf` | *"You sat through his gathering once. You know the form of greeting. He answers in kind, which is not in itself a comfort."* |
| `nyarlathotep_4` | 4 | opium_pact | Dream the bargain | `+1 dread, +1 fol` | *"The dreamers at the den had reached him first. They told you the terms. You renegotiate from there. A dreamer follows you home."* |
| `nyarlathotep_5` | 5 | recited | Speak his name back | `+2 dread, +1 relic` | *"You return the name he gave you. He smiles. Something falls from his sleeve as he turns away. You pick it up."* |
| `shub_niggurath_2` | 2 | studied | Recognise the root-tongue | `+1 dread` | *"The shape in the bark is a letter. You have read this letter before."* |
| `shub_niggurath_3` | 3 | attended_seance | Sing the offering | `+1 dread, +1 inf` | *"You sang it at the gathering. You sing it again here. The grove sings back. One of yours answers without meaning to."* |
| `shub_niggurath_4` | 4 | opium_pact | Dream into the soil | `+1 dread, +1 fol` | *"The dreamers had been listening to the roots. They taught you the cadence. The forest answers. One of them follows you home with soil still on her hands."* |
| `shub_niggurath_5` | 5 | recited | Recite the rite of unbecoming | `+2 dread, +1 relic` | *"You spoke it back to the treeline. The forest accepts the offering and returns something that is not quite a stone."* |

---

## Trims (to keep capped cards at ≤3 options)

### `yha_nthlei_4` "The Oath of Dagon"

**Remove option:** "Request more time" (currently `+3 dread, insertCard(yha_nthlei_4, 3-5)`).

**Rationale:** Card-level defer is duplicate now that `deferGodPathCard` exists on `the_wedding_rite` + `the_diocese_sends_word`. Players who want to defer have a dedicated carrier-card path.

Remaining options after edit: "Accept the terms" (canonical advance, gated on relics ≥ 1) + "Refuse" (no-advance narrative branch) + new "Sign the dream-bound version" (opium_pact prep-bonus advance).

### `shub_niggurath_5` "A Thousand Young"

**Remove option:** "Leave an offering at the boundary" (currently `-2 relics, +3 dread, advance, seedMutations`).

**Rationale:** Prep-bonus fills the mechanical slot of "alternate cheaper-than-meat advance." RelicPicker remains the canonical relic-spend mechanism for any resource; chain-card-level relic spend was duplicate.

Remaining options after edit: "Follow it in" (canonical meat-cost advance) + "Wait at the treeline" (defer) + new "Recite the rite of unbecoming" (recited prep-bonus advance).

---

## Threat TODO cleanups

The s86 engine pass replaced `surfaceGodPathCard` with prep-tags but left three card options carrying placeholder `// TODO(thematic): replacement effect for s86 content pass` comments. Resolution per option:

| File:line | Card / option | Action |
|---|---|---|
| `threats.ts:1025` | `the_thing_in_the_tank` "Listen to it" | Delete TODO comment only. Existing effects (`+3 dread, +1 inf, reinsert`) stand. |
| `threats.ts:1108` | `grove_awaits` "Send a scouting party" | Delete TODO comment only. Existing effects (`-1 fol, +1 dread`) stand. |
| `threats.ts:1118` | `grove_awaits` "Go yourself" | Replace TODO with `{ type: 'resource', resource: 'influence', delta: 1 }` and `{ type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 4, maxPos: 8 }`. Final effects: `+3 dread, +1 inf, insertCard(changed_follower)`. Flavour stays. |

---

## Defer-carrier extensions

Both defer carriers ship with one option today (the defer itself). Each gains two more, keeping ≤3 total.

### `the_wedding_rite` (core, `src/data/cards/core.ts:641`)

Existing option "Perform the rite" (`-2 inf, deferGodPathCard`) stays.

**New "Send a deputy":**
- Label: `Send a deputy`
- Flavour: *"You sign the certificate but send a deputy to read the vows. They get through it. One of yours catches an inscrutable look from the bride during the ring exchange."*
- Effects: `{ type: 'resource', resource: 'followers', delta: -1 }, { type: 'resource', resource: 'gold', delta: 1 }`
- No condition.

**New "Use the pulpit":**
- Label: `Use the pulpit`
- Flavour: *"You preach the way you would have anyway, in front of the couple's families. One stays after, asking when the next gathering is."*
- Effects: `{ type: 'resource', resource: 'followers', delta: 1 }, { type: 'resource', resource: 'dread', delta: 1 }`
- No condition.

### `the_diocese_sends_word` (rare, `src/data/cards/rare.ts:250`)

Existing option "Compose a careful reply" (`-2 inf, deferGodPathCard`) stays.

**New "Refuse to engage":**
- Label: `Refuse to engage`
- Flavour: *"You return the letter unopened. The bishop's people will note this. They will also stop writing."*
- Effects: `{ type: 'resource', resource: 'influence', delta: -1 }, { type: 'resource', resource: 'dread', delta: -1 }`
- No condition.

**New "Welcome the inquiry openly":**
- Label: `Welcome the inquiry openly`
- Flavour: *"You invite the bishop to visit. He sends a clerk instead. The clerk asks for membership records. You hand him the version you keep for this."*
- Effects: `{ type: 'resource', resource: 'influence', delta: 2 }, { type: 'resource', resource: 'dread', delta: 2 }, { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 5, maxPos: 9 }`
- No condition.

---

## WeekBanner prep-nudge copy

Replace placeholders in `src/components/GameScreen.tsx:45-48`. Each string names the prep mechanism implicitly so the player can recognise which prep-card class to pick this week.

```ts
const PREP_NUDGE: Record<GodPath, string> = {
  yha_nthlei:     'The tide is turning. Study what washes ashore before the next reading.',
  nyarlathotep:   'He approaches in dreams. Sit at his next gathering before he sits at yours.',
  shub_niggurath: 'The grove is hungry. Bargain or recite — but do it now, while the door is open.',
  olgreth:        '',
}
```

The four prep-card classes (study / gathering / bargain / recite) map to the four prep tags. Players need not memorise the stage↔tag mapping; the banner points them at the class.

---

## Files touched

- `src/data/godPaths/yha_nthlei.ts` — polish stage-2 seed flavour; add stage-3 bonus; trim "Request more time" + add stage-4 bonus; add stage-5 bonus.
- `src/data/godPaths/nyarlathotep.ts` — add 4 bonus options (stages 2-5).
- `src/data/godPaths/shub_niggurath.ts` — add stages 2, 3, 4 bonuses; trim "Leave an offering" + add stage-5 bonus.
- `src/data/cards/threats.ts` — clean 3 TODO comments; expand `grove_awaits` "Go yourself" effects.
- `src/data/cards/core.ts` — add 2 options to `the_wedding_rite`.
- `src/data/cards/rare.ts` — add 2 options to `the_diocese_sends_word`.
- `src/components/GameScreen.tsx` — replace 3 PREP_NUDGE strings.

Test files touched: `src/state/gameStore.test.ts` gains behavioural tests for the new bonus options (presence + condition gate + consumePrepTag firing on use). Per-option flavour text is not tested.

---

## Out of scope

- No new effect types — `consumePrepTag`, `hasPrepTag`, `deferGodPathCard`, `setPrepTag` already exist from s86.
- No new chain cards, no new gods.
- No changes to the prep-tag lifecycle (still cleared on every reshuffle).
- No re-balancing of existing non-bonus options on chain cards.
- No art changes — both defer-carrier art prompts already shipped.
- No telemetry to evaluate prep-bonus uptake post-ship (playtest-driven instead).
- No per-option flavour-text test coverage.

---

## Risks

| Risk | Mitigation |
|---|---|
| 11 bonus options share the same effect template — feel samey across gods | Per-god flavour layer differentiates voice. Effect uniformity is intentional for predictability and balance. |
| Stage 5 bonus `+1 relic` is too generous | Stage 5 is the hardest chain stage; the s86 spec called for stage 5 to be the "stronger lever." Relic gain is the lever. Playtest will surface degenerate use. |
| Trimming "Leave an offering" removes the only relic-spend chain option | RelicPicker remains the canonical relic-spend UI. Chain-card-level relic spend was duplicate. |
| Trimming "Request more time" weakens mid-chain defer | `deferGodPathCard` carriers (`the_wedding_rite`, `the_diocese_sends_word`) cover chain deferral. |
| `+1 fol` at stage 4 implausible thematically (you spent the week with addicts, gain a follower?) | Flavour does the work: "a regular from the den followed you home" / "the dreamer's circle widens" / "the changed bring their kin." |
| New `the_diocese_sends_word` "Welcome the inquiry openly" inserts `investigators_file` which itself can stack dread | Intentional — open-posture is the high-risk reward play. +2 inf is the reward; the threat insertion is the cost. |
| New `the_wedding_rite` "Send a deputy" lets player avoid the rite cheaply (-1 fol +1 gold) | Net resource is small; the player loses the rite's narrative beat but the wedding still happens off-screen. Acceptable trade. |

---

## Testing

**Unit / integration (extend `src/state/gameStore.test.ts`):**

- `getVisibleOptions` returns the bonus option as available when the paired tag is set; unavailable when unset. Sample 4 cases across the 3 gods + the seed (1 yha-new + 1 nyar + 1 shub + the existing `yha_nthlei_2` seed). The engine machinery is uniform; sampling covers the contract.
- `resolveOption` on a bonus option fires `consumePrepTag` — verify `state.prepTags` no longer contains the tag after resolve.
- `resolveOption` on a bonus option advances the chain — verify `godPathProgress` increments.

**Static guards (extend `src/state/gameStore.test.ts`):**

- For each god in `['yha_nthlei', 'nyarlathotep', 'shub_niggurath']`: chain stages 2-5 each have exactly one option with `condition.type === 'hasPrepTag'`.
- For each prep tag in `['studied', 'attended_seance', 'opium_pact', 'recited']`: at least one chain card across the three gods has a bonus option keyed to it.

**No flavour-text tests.**

---

## Success criteria

- All 11 prep-bonus options ship with correct condition + consumePrepTag + advance.
- The two trim cards land at exactly 3 options each.
- All 3 threat TODOs cleaned (one expanded effect, two delete-comment-only).
- Both defer carriers at exactly 3 options each.
- 3 PREP_NUDGE strings replaced.
- Vitest baseline + new tests pass (66 baseline + ~6 new = ~72).
- Typecheck clean.
