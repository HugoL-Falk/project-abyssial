# Playtest 16 Tier E Balance Pass — Spec

**Date:** 2026-06-19
**Intent:** Resolve the four Playtest 16 Tier E balance/economy brainstorm tickets. Two close without code; one ships a two-line content edit; one closes after audit.

---

## Problem

Four open Tier E tickets from Playtest 16:
- **P16-17** — `removeRandomThreat` options "too powerful at cheap cost"
- **P16-19** — Most -dread options also affect influence; diversify?
- **P16-41** — 66-draw run ended 4/6 with zero relics — relic supply too tight?
- **P16-55** — Playstyle pattern: gather resources early, pick -dread/+relic late. Intended or degenerate?

Brainstormed in session 87. Data survey decomposed the four into one actionable edit and three closures.

---

## Findings

### P16-17 — partially actionable

Two `removeRandomThreat` carriers in the whole game:

1. **`stranger_asks_questions` opt 2 "Have him followed"** (`src/data/cards/core.ts:53-60`)
   - Effects: `-1 gold`, `removeRandomThreat`
   - Condition: `gold ≥ 1`
   - Sibling options: opt 1 `+1 inf +1 dread` ("Tour"), opt 3 `+1 fol +1 inf +2 dread` ("Meeting")
   - Verdict: **TOO CHEAP.** -1 gold for a 2–5-resource-event threat removal is auto-pick territory mid-late run.

2. **`dark_young_guardian` opt "Send it ahead"** (`src/data/cards/rare.ts:280-287`)
   - Effects: `removeRandomThreat`, `+2 inf`, `+3 dread`
   - Verdict: **SELF-BALANCED.** +3 dread is a real cost; no change.

### P16-19 — close as already-correct

Sibling-resource distribution on -dread options (full survey): **-inf ~9 / -gold ~5 / -followers ~3**. The -inf bias is real but **thematic, not lazy** — every -dread+-inf option in the codebase frames the dread reduction as "spend reputation to calm a social situation":
- "Forbid it" (×2) — issuing an unpopular ban
- "Write a letter" — bureaucratic measured response
- "Ask her to forget it" — calling in a favour
- "Let it settle" — declining to amplify a story
- "Call in a favour" — literal favour call
- "Attend and steer" — political maneuvering (also a prep-carrier — do not touch)

Forcing -gold or -followers siblings on these would require rewriting flavour from "spend social capital" to "spend money" or "spend bodies", which doesn't fit. The proper way to diversify would be **additive** — author new -dread options framed around money or followers (e.g., "Hire enforcers", "Ritual cleansing") — content creation, not rebalancing.

### P16-41 — close as variance, watch for repeats

Single playtest data point (66-draw, 4/6 result, no relics). +relic sources are plentiful in count (~20+ across god-paths, blessings, rares, treats, threats, special card) but most are RNG-gated. Zero-relic in 66 draws is variance-possible. Not a systemic floor. Revisit if multiple playtests show the same pattern.

### P16-55 — close as observational

Meta-strategy pattern with no actionable design. Without telemetry data showing this pattern dominates outcomes, there's no intervention to design. Revisit if more players show the same playstyle.

---

## Design

### Single content edit

**`src/data/cards/core.ts:53-60`** — change `stranger_asks_questions` opt 2 "Have him followed":

```diff
       {
         label: 'Have him followed',
         flavourText: 'He goes to the post office. He goes to the library. He writes things down. Your people write things down too.',
         effects: [
-          { type: 'resource', resource: 'gold', delta: -1 },
+          { type: 'resource', resource: 'gold', delta: -2 },
           { type: 'removeRandomThreat' },
         ],
-        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
+        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
       },
```

Rationale: doubles the spend. Option remains a strong threat-removal at -2 gold but no longer auto-picks at -1 gold cost. Condition raised to match the new cost so the option doesn't appear unaffordable-by-1.

### Three backlog closures

- **P16-19** → close with the "thematic, not lazy" finding. Note the additive-content path as a future option if a real -dread diversification pass is wanted.
- **P16-41** → close as variance; flag for re-evaluation if the zero-relic pattern recurs.
- **P16-55** → close as observational; needs telemetry or repeat reports to act on.

---

## Migration / out of scope

- No engine changes.
- No new conditions or effect types.
- No content-creation work (additive -dread options for P16-19 explicitly deferred).
- No telemetry plumbing (would unlock real P16-55 analysis but is out of scope).

---

## Risks

| Risk | Mitigation |
|---|---|
| -2 gold makes "Have him followed" too steep early-run when gold is scarce | The condition gate (`gold ≥ 2`) hides the option when unaffordable. Players still see opt 1 and opt 3 as viable picks. The option remains available; just requires the player to have saved for it. |
| Closing P16-19/41/55 silently loses the data | Each closure carries an explicit rationale in `backlog.md`. Future playtest reporters can challenge the closure with new evidence. |

---

## Success criteria

- `stranger_asks_questions` "Have him followed" no longer auto-picks at every threat-laden mid-run beat.
- All four Tier E tickets removed from the open backlog.
- 53/53 vitest pass, typecheck clean after the edit.
