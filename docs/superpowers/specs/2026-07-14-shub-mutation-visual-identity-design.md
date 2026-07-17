# Shub Mutation Visual Identity — Design Spec

**Date:** 2026-07-14  
**Addresses:** P25-30, P25-50, P25-52  
**Status:** Approved

---

## Summary

Establish a cohesive visual identity for Shub-Niggurath's mutation mechanic. Mutated cards and the changed_follower card receive a shared icon and colour that distinguish them from whispers (✦ purple) and prep tags (❖ cyan).

---

## Design Decisions

### Icon: ⬢ (filled hexagon)
Matches the existing ShubTracker hex pip shape. Players learn the shape once from the tracker band and recognise it on cards. Distinct from ✦ (whisper) and ❖ (prep tag).

### Colour: `#d4601a` (fungal orange)
Sits between the existing amber/gold (`#c9a227`) and red (`#8a2020`). Not used elsewhere in the palette. Evokes organic decay, autumn rot, fungal spread — fits "The Root That Remembers" / thousand young theme. Distinct from whisper purple and prep-tag cyan.

---

## Components

### 1 — Header badge on mutated cards + changed_follower (P25-30, P25-52)

**What:** A small `⬢` badge in fungal orange (`#d4601a`) appears in the card title row of:
- All 6 mutated cards: `second_account`, `word_has_spread_further`, `second_run`, `still_burning`, `still_open`, `the_merchant_again`
- `changed_follower`

**What it does NOT apply to:** Shub god-path chain cards (`shub_niggurath_1`–`6`) — those use the god-path jewel.

**Position:** Same row as the card title, left of the title text — mirroring where whisper `✦` appears on whisper options.

**Detection:** Two valid approaches (implementation plan to decide):
- **A (no data change):** At render time, check `Object.values(MUTATION_MAP).includes(card.id)` (import from `mutations.ts`). For `changed_follower`, check `card.id === 'changed_follower'` separately.
- **B (explicit flag):** Add `isMutated: true` to each of the 6 mutated card definitions in `mutations.ts`. Check `card.isMutated || card.id === 'changed_follower'` at render time.

Approach A requires no card data changes; Approach B is more explicit and easier to extend.

---

### 2 — TheChangedIcon replacement (P25-30)

**What:** Replace the Y-shape SVG in `ResourceIcons.tsx` with a small ⬢ hexagon SVG, coloured fungal orange.

**Auto-propagates to:**
- `InGameMenuButton.tsx` — shows `⬢ N` count in pause menu
- Any effect pill referencing `theChanged` resource delta (e.g., `+⬢ 1` on sacrifice options)

**ShubTracker:** No change. The tracker's hex pips are already ⬢-shaped by geometry. The label `🜏` (alchemical transformation) stays as a decorative tracker header — distinct role from the repeatable `⬢` unit icon.

---

### 3 — Sacrifice pill redesign on changed_follower (P25-50)

**What:** The `previewTag: '-card'` on all four sacrifice options in `special.ts` is replaced with a `-⬢` pill styled in fungal orange.

**Rationale:** The generic grey `-card` pill communicates "a card is removed" but not *what kind* of removal. `-⬢` signals "this follower is consumed/changed by the mutation" — thematically accurate and visually consistent with the new icon system.

**How:** Either:
- Introduce a new `previewTag` value `'-theChanged'` that the pill renderer maps to a `⬢`-styled pill, or
- Extend the existing previewTag system to accept a resource key directly (e.g., `previewTag: { type: 'resource', resource: 'theChanged', delta: -1 }`)

The `+theChanged` delta on each sacrifice option already renders as `+⬢` via the resource pill system after the icon swap in Component 2.

---

## What stays the same

- ShubTracker hex pips and band layout (no change)
- ShubTracker `🜏` label (stays as decorative header)
- God-path chain cards (shub_niggurath_1–6) — no badge added
- All non-Shub cards — unaffected
- Prep tag cyan and whisper purple — unchanged

---

## Files in scope

| File | Change |
|---|---|
| `src/components/game/ResourceIcons.tsx` | Replace Y-SVG with ⬢ hexagon SVG in fungal orange |
| `src/components/game/DrawnCard.tsx` | Add ⬢ badge render for mutated cards + changed_follower |
| `src/data/cards/special.ts` | Replace `previewTag: '-card'` with `-⬢` pill on sacrifice options |
| `src/data/cards/mutations.ts` | (Option B only) Add `isMutated: true` to 6 card definitions |
| `src/types/index.ts` | (Option B only) Add `isMutated?: boolean` to card type; or add new previewTag value |
