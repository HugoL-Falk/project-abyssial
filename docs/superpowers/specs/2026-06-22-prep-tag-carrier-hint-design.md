# Spec — Prep-tag carrier hint (locked prep-bonus option discoverability)

**Date:** 2026-06-22
**Intent:** Coding (data + engine + UI)
**Source finding:** [[knowledge/investigations/2026-06-22-god1-playthrough-postP14P16.md]] — ticket **NB-G1-03 (P1, new)**, also closes **NB-G1-07**
**Scope:** 1 new data file, 1 type field, 1 engine-helper change, 1 UI change, 3 new tests.

---

## Problem

After P14-4 shipped, every chain card at stages 2–5 has a `hasPrepTag` prep-bonus option (4 tags × 3 gods = 12 options). The tags are set by 4 carrier options scattered across core + threat cards.

Current UX:
- Locked prep-bonus options ARE rendered in `OptionsColumn` (with a `❖` gold-jewel prefix, click-guarded). Visibility is fine.
- But there is **no hint text** explaining what `❖` means or what unlocks the option.
- The four prep tags (`studied`, `attended_seance`, `opium_pact`, `recited`) have no UI exposure. A noob sees a greyed-out `❖ Speak the closing rite`, doesn't know what `❖` is, doesn't know what to do, and never engages the prep system.

Vet playtest (2026-06-22) confirmed: vets only route prep via source-reading. Noobs simulated in the same investigation see zero prep options resolve.

## Proposed change

Add a per-option `Requires: <themed label>` pill on locked prep-bonus options, tappable to open the carrier card in the existing `CardPreviewModal`. Mirrors the P16-31 tappable-pill pattern used for `+card`/`-card` previews and the P16-39 `≥N {Resource}` affordability shortfall pill.

### Visual

```
[❖ Speak the closing rite]   ← greyed when tag unset
    Requires: the rite spoken ⓘ   ← gold-tinted pill, tappable
```

Tapping the pill calls `onPreviewCard(carrierCardIds[0])` — opens the existing `CardPreviewModal` for the carrier card.

Hover/long-press tooltip: `Requires {label}. Tap to preview the source card.`

### Reveal timing

**Always visible.** From the first draw of any chain card with a prep option, the pill renders. No first-encounter unlock, no fade-in, no run-progression gate. Aligns with Project Abyssial's existing "show your hand" UX precedent (deck inspector, preview chips, dread-tint indicator, structural `⟲` pill, etc.).

Accepted tradeoff: on first run, the player may see hints pointing to cards they haven't drawn yet (e.g. `what_was_already_read` for `recited`, which is itself an inserted threat). Modal opens fine and shows flavour; player has to follow the breadcrumb to find a card that inserts the carrier. Mild disorientation, not breaking. See "Known limitation" below.

## Architecture

### 1. Data — new file `src/data/godPaths/prepTagCarriers.ts`

Build-time derivation. Walks `COMMON_CARDS`, `CORE_CARDS`, `RARE_CARDS`, all threats, and any other card pool, finds every option with a `setPrepTag` effect, and groups by tag.

```ts
import type { CardId } from '../../types'

export type PrepTag = 'studied' | 'attended_seance' | 'opium_pact' | 'recited'

export const PREP_TAG_LABELS: Record<PrepTag, string> = {
  studied:          'a deep reading',
  attended_seance:  'a séance attended',
  opium_pact:       'a dream-bargain',
  recited:          'the rite spoken',
}

export type PrepTagCarrier = { cardId: CardId; optionLabel: string }

// Derived at module load. Stable across the run.
export const PREP_TAG_CARRIERS: Record<PrepTag, PrepTagCarrier[]> = /* derived */
```

Derivation walks `[...COMMON_CARDS, ...CORE_CARDS, ...RARE_CARDS, ...Object.values(threats).flat()]` (same pool the existing prep-tag-coverage test uses at gameStore.test.ts:732). Order of `carriers[]` is deterministic — first occurrence wins for tap target.

### 2. Type extension — `src/types/index.ts`

Add to `VisibleOption`:
```ts
prepRequirement?: {
  tag: PrepTag
  label: string
  carrierCardIds: CardId[]
}
```

Populated only when `option.condition?.type === 'hasPrepTag'` AND `conditionPasses === false`. Undefined when the tag is set (option becomes regular-available) or when the option has no prep condition.

### 3. Engine — `src/state/gameStore.ts`

In `getVisibleOptions`, after computing `conditionPasses`:
```ts
let prepRequirement: VisibleOption['prepRequirement']
if (opt.condition?.type === 'hasPrepTag' && !conditionPasses) {
  const tag = opt.condition.tag as PrepTag
  prepRequirement = {
    tag,
    label: PREP_TAG_LABELS[tag],
    carrierCardIds: PREP_TAG_CARRIERS[tag].map(c => c.cardId),
  }
}
// ...
return { ..., prepRequirement }
```

No engine logic change beyond populating the field.

### 4. UI — `src/components/game/OptionsColumn.tsx`

Inside the option-button effect-pill row (where `affordabilityShortfall` pills are rendered), add a sibling render block when `prepRequirement` is present. Style mirrors the affordability `≥N` pill but uses gold tint to match the `❖` jewel.

Pill markup (sketch):
```tsx
{prepRequirement && (
  <span
    role="button"
    title={`Requires ${prepRequirement.label}. Tap to preview the source card.`}
    onClick={(e) => {
      e.stopPropagation()
      onPreviewCard(prepRequirement.carrierCardIds[0])
    }}
    style={{ /* gold-tint pill matching ❖ */ }}
  >
    Requires: {prepRequirement.label} ⓘ
  </span>
)}
```

Co-renders cleanly with the existing affordability pill (no current case where a prep option also has resource costs, but rendering supports it).

The `e.stopPropagation()` prevents the parent option-button's click guard from swallowing the tap. The parent button is already correctly NOT using the `disabled` HTML attr (per P16-31), so pointer events on children fire.

## Cross-god coverage check (audit during implementation)

Walking the card data, the four tags currently have these carriers:

| Tag | Carrier card | Carrier option | Pool |
|---|---|---|---|
| `studied` | `the_old_book` *(presumed)* | "Hire a translator" | core |
| `attended_seance` | `the_seance` *(presumed)* | "Attend and steer" | core |
| `opium_pact` | `the_opium_den` *(presumed)* | "Encourage the visits" | core |
| `recited` | `what_was_already_read` | "The words arrange themselves" | threat (inserted by `the_old_book` → "Burn it") |

The implementation MUST verify these exact cardIds by reading the source — table above is from grep context, not validated yet. The derivation does the validation automatically (it walks the cards), so the visible carriers in the running game will be whatever the data actually says.

## Known limitations (accepted)

1. **`recited` is a two-step chain.** Tapping the pill opens `what_was_already_read`, but that card has to first be inserted by `the_old_book` → "Burn it". Noob taps → sees flavour → may not know how to encounter the card. A "how do I encounter this card" reverse-lookup is OUT OF SCOPE for this spec.
2. **Multi-carrier tags pick the first carrier deterministically.** No tag has multiple carriers today. A future tag with 2+ carriers will only surface the first via tap. A carousel popover or "and N others" indicator is out of scope.
3. **The `❖` jewel itself has no tooltip explaining "this is a prep-bonus".** Players learn that `❖` = prep-bonus by clicking the pill. Adding a hover tooltip on the jewel is a low-cost follow-up but not in scope.

## Test plan

Added to `src/state/gameStore.test.ts` in a new describe block `prep-tag carrier hints`:

1. **PREP_TAG_CARRIERS covers all four tags** — guards against drift when adding new tags.
2. **Locked prep option carries `prepRequirement` populated correctly** — set godPath state with empty `prepTags`, draw a known prep-gated chain card (e.g. `yha_nthlei_5`), call `getVisibleOptions`, assert `prepRequirement.label === 'the rite spoken'` and `carrierCardIds` is non-empty.
3. **Unlocked prep option has `prepRequirement === undefined`** — same setup with `prepTags: ['recited']`, assert undefined.

No component snapshot test — affordability pill is structurally analogous and not snapshotted; visual review during playtest catches styling drift.

## Acceptance criteria

- [ ] New file `src/data/godPaths/prepTagCarriers.ts` exists; exports `PrepTag`, `PREP_TAG_LABELS`, `PrepTagCarrier`, `PREP_TAG_CARRIERS`.
- [ ] `VisibleOption.prepRequirement?` field added to `src/types/index.ts`.
- [ ] `getVisibleOptions` in `gameStore.ts` populates `prepRequirement` correctly.
- [ ] `OptionsColumn.tsx` renders a tappable `Requires: <label>` pill when present.
- [ ] Pill tap opens the existing `CardPreviewModal` for the first carrier card (uses existing `onPreviewCard` prop chain).
- [ ] Pill styled with gold tint to match `❖` jewel; co-renders cleanly with affordability pill.
- [ ] 3 new tests pass.
- [ ] Existing 73 tests still pass (74/74 at branch end).
- [ ] Typecheck clean.
- [ ] Pre-commit hook regenerates `knowledge/cards/INDEX.md` and `knowledge/architecture-inventory.md` (auto, no manual edit).

## Out of scope

- A "how do I encounter this card" reverse-lookup for inserted-by-other-card carriers like `what_was_already_read`.
- Multi-carrier popover / carousel.
- Tooltip on the `❖` jewel itself.
- Per-god flavour variants of the label text (single label per tag, same across gods).
- Per-tag setPrepTag carrier ADDITIONS to give 'recited' a direct core-card path. Separate spec if desired.
- The downstream **EX-G1-02** (recited Dread≥8 counter-tutorial) and **EX-G1-06** (-2g threat-removal strips prep carrier) findings — separate specs.

## Estimated effort

~80 lines added including tests. Single commit. No subagent dispatch required.
