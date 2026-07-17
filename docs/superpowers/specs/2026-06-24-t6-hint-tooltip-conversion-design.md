# T6 — Hint-Tooltip Conversion Design

**Date:** 2026-06-24
**Cluster:** Playtest 18 T6 — tooltip / hint-conversion pass
**Items:** P18-12, P18-13, P18-14
**Agents:** Code (shared component + wiring), Visual (diamond styling), Thematic (P18-14 prose)

## Goal

Replace verbose inline requirement text and long flavour with a consistent, tappable **hint-tooltip** language: a small icon the player taps to toggle a text bubble. The game is touch-played at playtest, so hover-only `title` attributes are insufficient — tap-to-toggle is required.

## Component: `<HintTooltip>` (shared bubble, icons keep own triggers)

New file: `src/components/game/HintTooltip.tsx`.

- A primitive that renders a positioned text bubble on **tap-toggle**.
- It does **not** own the trigger glyph — each call site passes its own icon as the trigger child (`children`) plus the tooltip `text`.
- Tap toggles open/closed. Tapping elsewhere (or opening another tooltip) closes it.
- One styling/positioning home; three distinct triggers wrap it. Keeps `OptionsColumn.tsx` and `EffectTags.tsx` (both already large) from bloating further.

Rationale for "shared bubble, icons keep own triggers" (vs. one fully-shared HintTooltip that owns the icon): the three trigger glyphs differ (purple diamond, reinsert icon, defer tag) and live in different render paths, so centralising only the bubble avoids forcing a single icon model while still giving one place to style/position the popover.

## Conversions

### P18-12 — requirement pill → purple diamond (universal swap)

- In `OptionsColumn.tsx`, the gold `Requires: {label} ⓘ` pill (currently ~lines 206–236) is **replaced** by a **◆ glyph rendered in purple** wrapped in `<HintTooltip>`.
- Universal: applies to **both** prep-tag carriers and narrative tags (e.g. `hasPrepTag: studied` on "Speak the deep tongue").
- Tap = **tooltip only**. Tooltip text describes the requirement (e.g. *"Requires deep reading"*).
- The `◆` glyph (Unicode "black diamond", U+25C6) is **coloured purple** — the glyph name is "black diamond"; the rendered colour is purple.

⚠️ **Watchpoint (flagged regression):** This removes the tap-to-preview chain-card discovery built in NB-G1-03 / P17-29 (the gold pill tapped through to the carrier card's prep-bonus options). Confirm at playtest whether players miss the jump-to-source affordance. Re-enable is trivial — re-attach `onPreviewCard(carrierCardIds[0], { showOptions: true })` to the diamond's tap handler if needed.

### P18-13 — reinsert-icon hint

- The reinsert / `insertCard` indicator (tiara opt2 reinserting `yha_nthlei_2`, and similar reinsert options) keeps its **existing icon** but gains a `<HintTooltip>` wrapper.
- Tap shows: *"This card returns to the deck later."* (final wording TBD during implementation; keep it short).

### P18-14 — diocese flavour → tooltip + prose tighten

- The `deferGodPathCard` tag (`EffectTags.tsx:155`) keeps its short `god path → later` label; the explanation moves from the hover-only `title` into the tappable `<HintTooltip>` (*"Pushes your next god-path card later in the deck."*).
- **Thematic pass:** route `the_diocese_sends_word` option flavour (`src/data/cards/rare.ts:224`) to the Thematic agent for a tightening pass alongside the tooltip change.

## Icon language summary

| Trigger | Glyph | Colour | Means |
|---|---|---|---|
| Requirement (prep + narrative tags) | `◆` | purple | "you need X to pick this" |
| Reinsert | existing reinsert icon | unchanged | "card comes back later" |
| God-path defer | `god path → later` | unchanged | "pushes god card later" |

## Files touched

- `src/components/game/HintTooltip.tsx` — **new** shared bubble primitive.
- `src/components/game/OptionsColumn.tsx` — replace gold requirement pill with purple ◆ + HintTooltip.
- `src/components/game/EffectTags.tsx` — wrap reinsert indicator + `deferGodPathCard` tag in HintTooltip.
- `src/data/cards/rare.ts` — `the_diocese_sends_word` prose tighten (Thematic).

## Testing

- Component test for `<HintTooltip>`: tap toggles bubble; second tap (or outside click) closes; only one open at a time.
- Existing OptionsColumn / EffectTags tests must stay green (126/126 baseline).
- No engine logic changes — purely presentational + one prose edit.

## Out of scope

- Re-enabling chain-card discovery on the diamond (deferred to playtest verdict).
- Any other P18 visual items (T5 closed s95).
