# Nyar Whisper Escalation — Design Spec

**Date:** 2026-07-14
**Status:** Approved for implementation
**Backlog:** P25-23, P25-65
**Related specs:** `2026-07-04-p20-a-whisper-redesign.md`, `2026-07-06-p20-a-followup-whisper-polish.md`

---

## Problem

On a clean Nyarlathotep run (no Whispered Counsel blessing), whispers do not begin seeding until chain stage 3 (The Exhibit, weeks 3–4). The early game feels identical to any other run. PT25 feedback: *"Nyar should probably have more whispers in the game, escalating as you go further."*

The whisper system's intended arc — Nyar's influence creeping in and corrupting familiar cards as you move toward summoning — is not landing because the creep starts too late and escalates too weakly.

---

## Design Decisions

### 1. Every advance option seeds whispers from CS1 onwards

All options on Nyar god path cards that include `advanceGodPath` should also include a `seedWhispers` effect. This ensures that committing to Nyar's path always carries the cost of increased influence over your deck, from the very first god path card.

Non-advance options (deferral, resistance) do not seed. The player can delay the escalation by not advancing, but cannot avoid it if they want to summon.

### 2. Prep tag advance options seed 1 fewer than standard advance options (floor: 1)

Prep tag options represent preparation — the player spent resources earlier to acquire the tag. This prior cost is acknowledged: the influence Nyar gains through a prepared approach is slightly less than through a raw commitment. This principle is already implicit in the existing data (CS3: Sponsor seeds 2, Recognise the pattern seeds 1) and is now made explicit as a design rule.

**Rule:** Standard advance option → seed count as specified below. Prep tag advance option → 1 seed (always), regardless of stage.

### 3. The Moving Painting seeds whispers on both options

The detour path through The Exhibit ("Arrange a private viewing") inserts `the_moving_painting` as a threat. The Moving Painting does not advance the god path, but Nyar's influence seeps through it regardless. Both options on The Moving Painting add `seedWhispers: 1` — the card's presence in your deck is itself a vector of corruption.

The Exhibit is already re-inserted by the detour option, so the flow (detour → Moving Painting → Exhibit again) is unchanged. No insertCard changes needed on The Moving Painting.

### 4. Active whisper cap raised from 5 to 10

With whispers seeding from CS1, the current cap of 5 is hit mid-run and later seeds become meaningless. The new cap of 10 accommodates a full escalating run. The cap is hardcoded in `applyWhisperSeed` in `src/engine/whispers.ts`.

**Full standard path maximum:** 1+2+2+2+2 = 9 seeds (+ 1 from Moving Painting = 10)
**Full prep tag path maximum:** 1+1+1+2+1 = 6–7 seeds

### 5. Whispered Counsel blessing is unchanged

The blessing seeds 2 whispers at run start. Its dual purpose is preserved:
- **In Nyar runs:** head start — more total whispers active, earlier corruption of the deck.
- **In Yha/Shub runs:** flavour intrusion — 2 whisper seeds with no escalation behind them, giving those runs a faint signal of Nyar's influence.

No mechanical changes to the blessing.

---

## Seed Curve

| Card | Chain Stage | Option | Type | Seeds (new) | Seeds (was) |
|---|---|---|---|---|---|
| The Book is Opened | CS1 | Formalise a study group | Standard advance | **+1** | 0 |
| The Book is Opened | CS1 | Dream the bargain | Prep tag advance | **+1** | 0 |
| The Black Man at the Crossroads | CS2 | Encourage the meetings | Standard advance | **+2** | 0 |
| The Black Man at the Crossroads | CS2 | Observe without intervening | Standard advance | **+1** | 0 |
| The Black Man at the Crossroads | CS2 | Greet him as expected | Prep tag advance | **+1** | 0 |
| The Exhibit | CS3 | Sponsor the exhibit | Standard advance | +2 | 2 (unchanged) |
| The Exhibit | CS3 | Recognise the pattern | Prep tag advance | +1 | 1 (unchanged) |
| The Lecture | CS4 | Attend | Standard advance | +2 | 2 (unchanged) |
| The Signal Broadens | CS5 | Tune in | Standard advance | **+2** | 1 |
| The Signal Broadens | CS5 | Speak his name back | Prep tag advance | **+1** | 0 |
| The Moving Painting | — | Speak with each of them | — | **+1** | 0 |
| The Moving Painting | — | Leave it | — | **+1** | 0 |

**Bold** = change from current. Unchanged rows included for reference.

---

## Files to Change

| File | Change |
|---|---|
| `src/engine/whispers.ts` | Raise cap: `min(count, 5 - active)` → `min(count, 10 - active)` |
| `src/data/godPaths/nyarlathotep.ts` | Add `seedWhispers` to CS1 (both options), CS2 (all three options), CS5 Speak his name; increase CS5 Tune in from 1 → 2; add `seedWhispers` to both Moving Painting options |

No type changes. No blessing changes. No pool changes.

---

## Deferred

**Whisper replacement mechanic** — if Nyar runs become too difficult with the higher cap, a replacement system (new seed overwrites oldest active whisper) can be introduced as a difficulty safety valve. Park in backlog until PT26 data.

**Blessing thematic alignment audit** — separate task to verify all Nyar/Yha/Shub blessings are thematically appropriate to their god. Not in scope here.
