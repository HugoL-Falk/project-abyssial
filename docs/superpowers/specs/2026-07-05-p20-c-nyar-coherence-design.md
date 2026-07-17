# P20-C Design Spec — Nyarlathotep God-Path Coherence

**Date:** 2026-07-05
**Status:** Approved — ready for implementation planning
**Addresses:** Playtest 20 cluster P20-C
**Agents:** Thematic + Card Mechanics + Code

---

## Problem

The Nyarlathotep god-path chain has no red thread. The six cards visit disconnected Lovecraftian
vignettes (a lecture, paintings, a crossroads encounter, a book, radio signals) with no escalating
throughline and no recurring figure or location to anchor the player's sense of building dread.
Playtest verdict: "no red thread to get me hooked to the story and mythos" / "too many alterations
to resources on options."

Additionally the encounter order is backwards — the crossroads and book feel like early cult
activity, the exhibit mid-game, the lecture a bigger organised event. The current ordering (lecture
first, book fourth) buries the intimate encounters late and the public ones early.

Secondary issues addressed here:
- `the_moving_painting` is classified as `god_path` but functions as a threat; its mechanics are
  confusing (why take opt2 of the Exhibit?)
- nyar_2, nyar_5, nyar_6 options touch too many resources for their chain position
- Non-advance options on the Exhibit and Lecture had no loop mechanic, risking an 8th week

---

## Approach

**Approach 2 (chosen):** Flavour rewrite + resource trim + card reorder + loop mechanic fix.
No new cards. Thematic agent pass recommended on all body/option text before shipping —
this spec provides direction and approved draft text.

---

## The Signal Frame

The chain's red thread is a **transmission arriving through successive media**. Each card is the
signal finding a new channel — louder, more direct, harder to ignore. The cult is not searching
for Nyarlathotep; he is broadcasting, and they are tuning in.

| Position | Card ID | Signal medium | Tonal beat |
|---|---|---|---|
| 1 | `nyarlathotep_4` — The Book is Opened | Text | Mundane discovery. It arrived. We didn't put it there. |
| 2 | `nyarlathotep_3` — The Black Man at the Crossroads | Contact | The signal has a face. Followers describe the same figure. |
| 3 | `nyarlathotep_2` — The Exhibit | Vision | The signal is in objects. Harder to dismiss. |
| 4 | `nyarlathotep_1` — The Lecture | Voice | The signal through an authoritative human channel, at scale. |
| 5 | `nyarlathotep_5` — The Signal Broadens | Broadcast | It outgrows human vessels. Impossible frequencies. |
| 6 | `nyarlathotep_6` — The Crawling Signal Arrives | Arrival | Full transmission. You are the receiver. |

**Tonal arc:** Cards 1–2 almost manageable. Card 3 harder to dismiss. Cards 4–5 narrowing hard.
Card 6 does not negotiate.

**Prose register:** The signal frame is carried obliquely — felt in the language, never stated.
No card says "the signal is arriving." Words like "frequency," "transmission," "receiving" are
used sparingly and atmospherically, not as exposition.

---

## Chain Reorder

Card IDs do not change. Only `chainStage` and `godPathStageMin` values update:

| Card ID | Old chainStage | New chainStage | godPathStageMin old → new |
|---|---|---|---|
| `nyarlathotep_4` | 4 | **1** | 3 → **0** |
| `nyarlathotep_3` | 3 | **2** | 2 → **1** |
| `nyarlathotep_2` | 2 | **3** | 1 → **2** |
| `nyarlathotep_1` | 1 | **4** | 0 → **3** |
| `nyarlathotep_5` | 5 | 5 (no change) | 4 (no change) |
| `nyarlathotep_6` | 6 | 6 (no change) | 5 (no change) |

---

## Loop Mechanic — Softlock Prevention

Design rule: **every non-advance option on a chain card must reinsert the card within the current
deck cycle.** No chain card may rely on the reshuffle to return — that would push the run beyond
the 6-week constraint.

| Card | Non-advance opt | Loop mechanic |
|---|---|---|
| Card 1 (Book) opt1 | Let it circulate | `insertCard nyarlathotep_4` minPos 6 maxPos 9 — **existing, keep** |
| Card 3 (Exhibit) opt1 | Private viewing | `insertCard nyarlathotep_2` minPos 5 maxPos 8 — **new** |
| Card 4 (Lecture) opt1 | Distribute pamphlets | `insertCard nyarlathotep_1` minPos 5 maxPos 8 — **new** |
| Card 5 (Radio) opt1 | Destroy the equipment | `insertCard nyarlathotep_5` minPos 7 maxPos 9 — **existing, keep** |

Cards 2 and 6 have no non-advance options — loop not needed.

The Exhibit opt1 also inserts `the_moving_painting` (threat) at minPos 2 maxPos 5. The two
`insertCard` effects fire sequentially: threat appears soon, Exhibit reappears 5–8 cards later
(after the threat has likely been resolved). Player who picks the cheaper route navigates the
threat, then returns to the Exhibit and can advance.

---

## Card-by-Card Spec

### Card 1 — The Book is Opened (`nyarlathotep_4`, chainStage: 1)

```
flavourText: "The Necronomicon is circulating among the followers. Not the university copy.
              We did not organise it."
```

| # | Label | Condition | Effects | flavourText |
|---|---|---|---|---|
| 0 | Formalise a study group | godPathStageMin: **0** | −1 fol, +1 dread, advanceGodPath | `Three appointed to take the lead. The structure has not slowed anything.` |
| 1 | Let it circulate freely | resourceMin inf: **1** | −1 inf, +1 dread, insertCard `nyarlathotep_4` (minPos 6, maxPos 9) | `On its fourth reader now. They are all very quiet. The book keeps coming back.` |
| 2 | Dream the bargain | hasPrepTag `opium_pact` | consumePrepTag, +1 fol, −1 dread, advanceGodPath | `The den's dreamers knew the terms. You renegotiate from there.` |

**Changes from current:**
- `chainStage` 4 → 1; `godPathStageMin` 3 → 0
- Opt0: cost trimmed −3 fol/+3 dread → −1 fol/+1 dread
- Opt1: cost trimmed −2 inf → −1 inf; remove `seedWhispers 1`
- Opt2: remove +1 dread delta; add −1 dread (opium familiarity steadies the approach)

---

### Card 2 — The Black Man at the Crossroads (`nyarlathotep_3`, chainStage: 2)

```
flavourText: "Someone meets our people at crossroads after dark. They come back changed.
              They describe the same figure."
```

| # | Label | Condition | Effects | flavourText |
|---|---|---|---|---|
| 0 | Encourage the meetings | godPathStageMin: **1** | +2 fol, +2 dread, advanceGodPath | `Attendance is voluntary. Everyone has attended.` |
| 1 | Observe without intervening | godPathStageMin: **1** | +1 dread, advanceGodPath | `We watched a meeting from a distance. The distance felt insufficient.` |
| 2 | Greet him as expected | hasPrepTag `attended_seance` | consumePrepTag, +1 inf, advanceGodPath | `You sat through his gathering. You know the greeting form. He answers in kind.` |

**Changes from current:**
- `chainStage` 3 → 2; `godPathStageMin` 2 → 1 on opts 0 and 1
- Opt0: trimmed from +3 fol/−1 inf/+3 dread/seedWhispers 3 → +2 fol/+2 dread; remove seedWhispers
- Opt1: trimmed from −1 fol/+3 dread/seedWhispers 4 → +1 dread only; remove seedWhispers, remove fol cost
- Opt2: drop +1 dread delta

No non-advance option → no loop mechanic needed. All three opts advance the path.

---

### Card 3 — The Exhibit (`nyarlathotep_2`, chainStage: 3)

```
flavourText: "Several canvases from the old estate have arrived at the exhibit.
              The subject is listed as unclear."
```

| # | Label | Condition | Effects | flavourText |
|---|---|---|---|---|
| 0 | Sponsor the exhibit | godPathStageMin: **2** AND resourceMin gold: **2** | −2 gold, +2 inf, advanceGodPath, seedWhispers **2** | `Our name is on a placard near the pieces. People stand near it for a long time.` |
| 1 | Arrange a private viewing | resourceMin gold: 1 | −1 gold, +2 fol, insertCard `the_moving_painting` (minPos 2, maxPos 5), insertCard `nyarlathotep_2` (minPos 5, maxPos 8) | `They found it very moving. Several found it literally moving.` |
| 2 | Recognise the pattern | hasPrepTag `studied` | consumePrepTag, +1 dread, advanceGodPath, seedWhispers **1** | `You have read this shape before. The recognition steadies you.` |

**Changes from current:**
- `chainStage` 2 → 3; `godPathStageMin` 1 → 2; gold condition 3 → 2
- Opt0: trimmed −3 gold/+3 inf/+1 dread → −2 gold/+2 inf; gains seedWhispers 2
- Opt1: `the_moving_painting` now a threat (see below); add self-reinsert `nyarlathotep_2`
  minPos 5 maxPos 8 (loop mechanic); drop +2 dread delta (threat delivers that pressure)
- Opt2: gains seedWhispers 1; flavour trimmed

---

### Card 4 — The Lecture (`nyarlathotep_1`, chainStage: 4)

```
flavourText: "A guest professor speaks on folklore tonight. Full house for a Tuesday.
              Not everyone came for the lecture."
```

| # | Label | Condition | Effects | flavourText |
|---|---|---|---|---|
| 0 | Attend | godPathStageMin: **3** | +1 fol, +2 inf, advanceGodPath, seedWhispers **2** | `The professor was charming. Several attendees were not there for the lecture.` |
| 1 | Distribute pamphlets | resourceMin gold: 1 | −1 gold, +1 inf, +1 fol, insertCard `nyarlathotep_1` (minPos 5, maxPos 8) | `The class was full and will come back. Better make the most of it.` |

**Changes from current:**
- `chainStage` 1 → 4; `godPathStageMin` 0 → 3
- Opt0: gains seedWhispers 2; flavour trimmed
- Opt1: gains self-reinsert `nyarlathotep_1` minPos 5 maxPos 8 (loop mechanic); flavour trimmed
- No prep tag option added (the lecture is a public event — no secret shortcut)
- Card title: "Professor Whately" reference removed from body; "A guest professor" avoids names

---

### Card 5 — The Signal Broadens (`nyarlathotep_5`, chainStage: 5)

```
flavourText (trimmed): "The basement radio receives on impossible frequencies.
                         Several followers hum the same sequence."
```

| # | Label | Condition | Effects | flavourText |
|---|---|---|---|---|
| 0 | Tune in | godPathStageMin: 4 | +2 inf, +3 dread, advanceGodPath, seedWhispers 1 | `We listened for six hours. It felt like one. We have no memory of most of it.` |
| 1 | Destroy the equipment | resourceMin inf: **2** | −2 inf, +2 dread, insertCard `nyarlathotep_5` (minPos 7, maxPos 9) | `The humming continued. They started repairing it the next day.` |
| 2 | Speak his name back | hasPrepTag `recited` | consumePrepTag, +1 relic, +1 dread, advanceGodPath | `You return the name he gave you. He smiles. Something falls from his sleeve.` |

**Changes from current:**
- Body trimmed (~207 chars → 94 chars)
- Opt0: trimmed −2 fol/+4 inf/+4 dread → +2 inf/+3 dread (fol cost removed, counts trimmed)
- Opt1: inf condition 3 → 2; flavour trimmed
- Opt2: flavour trimmed
- seedWhispers count on opt0 unchanged (1)

---

### Card 6 — The Crawling Signal Arrives (`nyarlathotep_6`, chainStage: 6)

Body and conditions **unchanged**. Two flavour text trims only:

| # | Old flavourText | New flavourText |
|---|---|---|
| 1 "Receive parts of the message" | `The air felt heavy and your brain was working as if someone was communicating with you. You didn't fully understand, but enough to know what to do.` | `Something was felt but not fully understood. Enough to know what comes next.` |
| 2 "The signal overwhelms you" | `The frequency was right. The mind was not ready. You will not be able to try again.` | `The frequency was right. The mind was not ready.` |

**Victory condition flag:** Influence thresholds (≥6 full, ≥4 partial) may need adjusting once
trimmed resource profiles across the chain are playtested — earlier cards now generate less
influence. Do not change now; flag for next playtest balance pass (P20-D adjacent).

---

## The Moving Painting — Reclassification

**Change:** `tier: 'god_path'` → `tier: 'threat'`. Remove `godPath: 'nyarlathotep'`. Remove all
existing options. Replace with two-option threat card.

**File:** Currently exported as `THE_MOVING_PAINTING` from `nyarlathotep.ts` (registered
separately in ALL_CARDS). Update definition in place — moving to `threats.ts` is optional
cleanup but not required.

```
flavourText: "Three followers described the same motion in the oils. Same direction. Same hour."
```

| # | Label | Effects | flavourText |
|---|---|---|---|
| 0 | Speak with each of them | −2 influence | `You interview them separately. The accounts are identical. Something settles.` |
| 1 | Leave it | +2 dread | `The accounts keep circulating. The details get sharper each retelling.` |

**Trade-off:** −2 influence to contain the accounts vs +2 dread to let them fester. At any
mid-game stage, the choice is real — both costs are meaningful.

---

## Whisper Seeding Summary

Whispers removed from Cards 1 and 2 (too early — players haven't learned the mechanic yet).
Introduced at Card 3, building through Card 5.

| Card | Opt | Count |
|---|---|---|
| Card 3 — Exhibit, opt0 (Sponsor) | advance | 2 |
| Card 3 — Exhibit, opt2 (studied) | advance | 1 |
| Card 4 — Lecture, opt0 (Attend) | advance | 2 |
| Card 5 — Radio, opt0 (Tune in) | advance | 1 |

**Total per typical run:** 4–5 seeds (3–4 if prep tag path taken at Card 3, skipping opt0).
Spread across mid-to-late chain. Consistent with current total; better paced introduction.

---

## Flavour Cap Compliance

Standing rule (D 2026-06-25): option flavour ≤ 80 chars, body ≤ 108 chars.
All bodies and option flavour texts in this spec are within caps. Longest body: Card 4 at 105 chars.

---

## Out of Scope

- nyar_6 opt2 "The signal overwhelms you" red styling — visual/UI concern, tracked separately
- Balance review of nyar_6 victory thresholds — defer to next playtest
- The Merchant Again / P20-B — not a Nyar card; P20-C backlog reference was a misattribution
- Activity log entries for whispered cards — P20-J
- Flavour text for any card that was NOT listed in this spec — do not touch

---

## Implementation Notes

1. Only `nyarlathotep.ts` and `the_moving_painting`'s definition need to change — no engine
   modifications required.
2. The Exhibit opt1 fires two `insertCard` effects in sequence. Order matters: insert
   `the_moving_painting` first (minPos 2, maxPos 5), then insert `nyarlathotep_2` (minPos 5,
   maxPos 8). Because effects run sequentially, the deck grows by one between the two inserts —
   the Exhibit's minPos 5 is relative to the post-threat-insert pile, which is fine. Confirm
   engine processes multiple `insertCard` effects within a single option (should work per
   existing patterns, but worth a quick check before implementing).
3. godPathStageMin conditions on ALL six chain cards must be updated — easy to miss one.
   Recommend a single pass through the file updating every `godPathStageMin` value against the
   table in the "Chain Reorder" section.
4. `the_moving_painting` loses `godPath: 'nyarlathotep'` — check that no UI or engine code
   gates on this field for this specific card ID (unlikely, but confirm).
5. Thematic agent pass recommended on body and option text before shipping. Draft text in this
   spec is approved direction; final prose may vary within caps.
