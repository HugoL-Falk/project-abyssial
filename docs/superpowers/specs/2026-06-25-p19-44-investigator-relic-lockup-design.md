# P19-44 — Investigator-file relic lockup redesign

**Date:** 2026-06-25
**Source:** [[Playtest 19]] line 39 — "Investigator file has two options if you lock up with relics, instead maybe we should show the original options and then a toast to spend the relic if you otherwise would succumb."
**Tier:** C (decided / implement)

## Problem

When every non-succumb option on a card is unavailable (`allBlocked`), `OptionsColumn.tsx` (lines 94–118) discards the card's real options and renders only two buttons: "Spend a Relic" (if `relics > 0`) and "You succumb to the gods". On Investigator's File this reads as "the card only has two options," hiding the actual (now-unaffordable) choices and making the lockup feel arbitrary. The player loses the context of *why* they are stuck.

## Goal

- Keep the card's real options on screen (greyed / blocked) so the player sees why they're locked up.
- Surface a relic prompt as a recovery path that re-uses the existing relic picker.
- Gate succumb behind an inline two-tap confirm so the run can't end by accident.

## Behaviour — the `allBlocked && !isTutorial` branch

Replace the current two-button early return with this render order (confirmed with user):

1. **Real options, greyed.** Render the same option rows the normal branch produces from `visibleOpts` (`hideWhenUnavailable` rows stay hidden as today), all in their unavailable / greyed state with shortfall pills (`≥N`, dread gates) intact. Taps are no-ops, exactly as today's unavailable rows.
2. **Relic toast** (only when `relics > 0`). Gold-bordered prompt beneath the options, keeping the **existing tone**: heading "Spend a Relic — adjust a resource", body "Nudge one resource by ±2. (N remaining)". Tapping opens the existing `RelicPicker` via the unchanged `onSpendRelic` handler. After a nudge, an option may un-grey and become tappable through the normal flow.
3. **Succumb row — inline two-tap confirm.** Final red row. First tap arms it and swaps the label to "Tap again to succumb"; second tap calls `onSuccumb()`. Armed state is local component state, reset when the card / options change.

## Scope & isolation

- **All changes live in `src/components/game/OptionsColumn.tsx`.** No engine, store, or card-data changes. The relic and succumb handlers (`onSpendRelic`, `onSuccumb`) already exist and are passed in from `GameScreen.tsx`.
- **Extract the single option-row JSX into a local helper** (e.g. `renderOptionRow(opt)`) so the `allBlocked` branch and the normal branch render identical rows without duplicated JSX — prevents the two copies drifting and trims the file rather than growing it.
- **Arm-state:** a `useState<boolean>` for "succumb armed" plus a reset keyed on `currentCard?.id` (via `useEffect` or a React `key`) so switching cards never leaves succumb pre-armed.

## Out of scope

- Spending a relic directly "on" an option (auto-applying the needed resource) — rejected in brainstorming; the relic picker flow is reused instead.
- Engine/`spendRelic`/`succumb` logic changes — untouched.
- Card-data changes to `investigators_file` — the fix is generic to every `allBlocked` card.

## Testing

- No jsdom / RTL harness exists (standing watchpoint), so this is **not** unit-testable at the component level.
- Verification via `npm run dev` playtest: trigger a lockup (drain gold below Investigator's File thresholds), confirm greyed options remain visible, the relic toast opens the picker and a nudge un-greys an option, and succumb requires two taps.
- `npm run typecheck` clean and existing 132 vitest tests stay green.

## Files

- `src/components/game/OptionsColumn.tsx` — only file changed.
