# P19-27 — Acquired Prep-Tag Display + Glyph Unification

**Date:** 2026-06-25
**Playtest:** P19-27 — "In the middle [zone] we have on-reshuffle/on-draw effects, but I think we've removed all of them. Audit and instead use this space to show prep tags acquired."

## Background / audit

- The "middle zone" (space between the drawn card art and the options panel in `GameScreen.tsx`) is currently **empty and dead** — no component renders on-draw/on-reshuffle indicators there. The player's memory of effects there is from an older build.
- Live card mechanics (`onDraw`, `passive`, `accumulates`) still exist on 6 cards but are surfaced only via the `?` `CardPassiveTag` tooltip in `DrawnCard.tsx`. **Out of scope** — they stay in the tooltip.
- Acquired prep tags (`state.prepTags`: `studied`, `attended_seance`, `opium_pact`, `recited`) have **no persistent display**. They appear transiently as "tag set" pills (`EffectTags`) or as grey-out requirement hints.
- Prep tags **clear on every reshuffle** (`gameStore.ts` reshuffle paths set `prepTags: []`). This is current intended behavior and is **NOT changed here**. Whether they should persist is filed as a separate backlog item (PREP-PERSIST).

## Scope

Purely a display + visual-consistency change. No mechanics/balance changes.

### 1. New component: `AcquiredPrepTags`

- Location: `src/components/game/AcquiredPrepTags.tsx`.
- Rendered in `GameScreen.tsx` in the band between the card art and the `OptionsColumn`.
- Reads `state.prepTags`. For each held tag, renders a small **purple ❖** pill with the human label from `PREP_TAG_LABELS` (`prepTagCarriers.ts`), e.g. `❖ Studied`.
- **Zero tags held → component returns `null`.** No placeholder; the zone stays empty. After a reshuffle clears tags, the row empties automatically.
- Each pill is a tap-`HintTooltip` (reuse existing `HintTooltip`): text `"Prepared: {label}. Spent automatically on the matching path card."`
- Styling consistent with existing prep-tag marks: purple `#9b7bd4`, `textShadow: '0 0 6px rgba(155,123,212,0.5)'`.

### 2. Glyph unification — prep-tag mark is purple ❖ everywhere

Single visual language: purple `❖` always means "prep tag". Replace these:

| Site | Today | After |
|---|---|---|
| Requirement gate `OptionsColumn.tsx:221` | purple `◆` | purple `❖` |
| Bonus emphasis `OptionsColumn.tsx:156` | gold `❖` | purple `❖` |
| "Tag set" pill `EffectTags.tsx:151` | gold `❖` | purple `❖` |
| `CardPreviewModal.tsx:105/114` requires-hint | `❖` (gold) | purple `❖` |
| Acquired-tags display (new) | — | purple `❖` |
| `WeekBanner.tsx:74` `◆` | `◆` | **unchanged** — decorative week divider, unrelated to prep tags |

Use the existing requirement-diamond purple (`#9b7bd4`) as the single prep-tag color token.

## Testing

- Unit test for `AcquiredPrepTags`: N held tags → N pills with correct labels (via `PREP_TAG_LABELS`); 0 tags → renders `null`.
- Typecheck clean; full vitest suite stays green.

## Out of scope (filed separately)

- **PREP-PERSIST** (backlog): whether prep tags should persist across reshuffles.
- Live passive/onDraw indicators remain in the `?` tooltip.
- P19-40 (black ◆ tag text/tooltip rework) is adjacent but tracked separately; this spec only changes glyph/color, not P19-40's text-drop/tooltip behavior.
