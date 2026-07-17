# P20-N: Prep-Tag Hide, Rotation Hint, Tiara "Can't Take Twice"

**Date:** 2026-07-05
**Backlog item:** P20-N
**Overrides:** D-T6-1 (2026-06-24) — UI portion only; data model (`PREP_TAG_CARRIERS`, labels, `carrierCardIds`) retained.

---

## Problem

Three distinct UX gaps, bundled under P20-N:

1. **Prep-tag-gated options are always visible (greyed).** D-T6-1 chose show-disabled + ❖ HintTooltip. Playtest 20 feedback: clutters the option list with options the player cannot take — worse on a first run where the prep path hasn't been discovered yet. New model: hide entirely, surface a ◆ on the card title that the player taps to learn the requirement.

2. **Rare/uncommon jewel hint says nothing about rotation.** Players asked "do we not have all commons always show up?" — same confusion for rares/uncommons. The existing tap-to-reveal tier hint shows only "Rare card" / "Uncommon card" with no rotation context.

3. **Tiara opt1 disappears silently after first pick.** `yha_nthlei_2` opt1 ("Send someone to return it") is hidden (`hideWhenUnavailable: true`) once chosen, so on subsequent encounters the player has no idea the option ever existed or why it's gone. The fix: show it greyed with a "Can't take twice" tooltip.

---

## Scope

- `src/state/gameStore.ts` — `getVisibleOptions`
- `src/components/GameScreen.tsx`
- `src/components/game/DrawnCard.tsx`
- `src/components/game/OptionsColumn.tsx`
- `src/data/godPaths/yha_nthlei.ts`

**Not in scope:** changes to `hasPrepTag` option data in god-path files (no `hideWhenUnavailable` additions needed — engine handles it universally). `PREP_TAG_CARRIERS` / `PREP_TAG_LABELS` / `carrierCardIds` are retained for future re-enable of the NB-G1-03/P17-29 tap-to-preview watchpoint.

---

## Design

### 1. Auto-hide prep-tag-gated options (gameStore.ts)

In `getVisibleOptions`, replace:

```ts
const hidden = !available && (opt.hideWhenUnavailable ?? false)
```

with:

```ts
const isPrepTagMissing = opt.condition?.type === 'hasPrepTag' && !conditionPasses
const hidden = (!available && (opt.hideWhenUnavailable ?? false)) || isPrepTagMissing
```

`prepRequirement` computation is unchanged and runs before `hidden` is set, so hidden entries carry their `{ tag, label, carrierCardIds }` outward. This is used by GameScreen to drive the DrawnCard indicator.

Affected options: exactly 12 — `hasPrepTag` options on `yha_nthlei_2/3/4/5`, `nyar_2_6/3_6/4_6/5_6`, `shub_2_6/3_6/4_6/5_6`.

### 2. Surface hidden prep requirements to DrawnCard (GameScreen.tsx)

After the existing `nonHiddenOpts` line, add:

```ts
const hiddenPrepReqs = visibleOpts
  .filter(o => o.hidden && o.prepRequirement != null)
  .map(o => o.prepRequirement!)
// type: Array<{ tag: string; label: string; carrierCardIds: string[] }>
```

Pass as a new prop to the DrawnCard at the card-view render site:

```tsx
<DrawnCard card={currentCard!} textVisible={textReveal} hiddenPrepReqs={hiddenPrepReqs} />
```

The DrawnCard in `DrawPileView.tsx` (draw animation, compact mode) does **not** receive this prop — the indicator is only needed on the live flipped card, not the pile thumbnail.

### 3. ◆ indicator in title row (DrawnCard.tsx)

**New prop:**
```ts
hiddenPrepReqs?: Array<{ tag: string; label: string }>
```

**New state:**
```ts
const [prepOpen, setPrepOpen] = useState(false)
```

**Reset on card change:**
```ts
useEffect(() => setPrepOpen(false), [card.id])
```

**In the title row**, after the existing title `<div>` and `<CardPassiveTag>`, insert:

```tsx
{!compact && hiddenPrepReqs && hiddenPrepReqs.length > 0 && (
  <span
    onClick={e => { e.stopPropagation(); setPrepOpen(v => !v) }}
    style={{
      color: '#9b7bd4',
      fontSize: '0.85rem',
      cursor: 'pointer',
      position: 'relative',
      padding: '0.4rem',
      margin: '-0.4rem',
      textShadow: '0 0 6px rgba(155,123,212,0.5)',
      flexShrink: 0,
    }}
  >
    ◆
    {prepOpen && (
      <div style={{
        position: 'absolute', top: '20px', left: 0, zIndex: 30,
        background: 'rgba(4,2,1,0.92)',
        border: '1px solid rgba(155,123,212,0.35)',
        color: 'rgba(200,185,155,0.9)',
        fontSize: '0.78rem', letterSpacing: '0.04em',
        padding: '0.2rem 0.5rem',
        whiteSpace: 'nowrap', pointerEvents: 'none',
      }}>
        {hiddenPrepReqs.map(r => `Requires: ${r.label}`).join(' · ')}
      </div>
    )}
  </span>
)}
```

The glyph ◆ matches the existing prep-bonus ❖ family (same purple, same glow). Multi-tag case (two hidden requirements on one card) joins labels with ` · `. In practice all current god-path cards have at most one hidden prep option.

### 4. Remove dead prepRequirement branch (OptionsColumn.tsx)

Delete the `prepRequirement && (…HintTooltip…)` block (lines 208–223 in current file). Options with `prepRequirement` are now always hidden before reaching OptionsColumn.

`VisibleOpt` retains the `prepRequirement` field — `gameStore.ts` line 731 still reads it for `runStats.prepLockedSkipped` tallying, and the NB-G1-03/P17-29 watchpoint may re-wire tap-to-preview here in future.

### 5. Rare/uncommon rotation hint (DrawnCard.tsx)

In `TIER_HINTS`, update two entries:

```ts
core: 'Uncommon card · rotates each reshuffle',
rare: 'Rare card · rotates each reshuffle',
```

No new component or state. The existing tappable jewel already surfaces `hintLabel` for these tiers.

Side-effect: addresses the `dark_young_pilgrim`/rare-removal confusion — players learn via the jewel hint that rares rotate, so card disappearance is contextualised without a per-removal popup.

### 6. Tiara "can't take twice" (yha_nthlei.ts + gameStore.ts + OptionsColumn.tsx)

**Data change — `yha_nthlei.ts`:**
Remove `hideWhenUnavailable: true` from `yha_nthlei_2` opt1 ("Send someone to return it"). The option will now render greyed on subsequent encounters rather than vanishing.

**Engine — `gameStore.ts` `getVisibleOptions`:**
After the `prepRequirement` block, add:

```ts
let disabledReason: string | undefined
if (!available && opt.condition?.type === 'not' &&
    opt.condition.condition.type === 'cardOptionChosen') {
  disabledReason = "Can't take twice"
}
```

Return `disabledReason` in the computed object.

**Component — `OptionsColumn.tsx`:**
Add to `VisibleOpt`:
```ts
disabledReason?: string
```

In `renderOptionRow`, in the right-side tag cluster (alongside dread pills and affordability shortfall pills), when `!avail && disabledReason`:

```tsx
{!avail && disabledReason && (
  <HintTooltip text={disabledReason} ariaLabel={disabledReason}>
    <span style={{
      fontSize: '0.72rem', color: 'rgba(180,80,80,0.7)',
      padding: '0.1rem 0.3rem', borderRadius: '2px',
      border: '1px solid rgba(180,80,80,0.25)',
    }}>
      ✕
    </span>
  </HintTooltip>
)}
```

Small red ✕ badge, same visual weight as affordability shortfall pills. Tap reveals "Can't take twice." The `disabledReason` pattern is general: any future `not + cardOptionChosen` option gets the signal automatically.

---

## What changes in player experience

| Scenario | Before | After |
|---|---|---|
| See god-path card without prep tag | Option visible, greyed, ❖ tooltip | Option hidden; ◆ on card title |
| Tap ◆ | N/A | Bubble: "Requires: a deep reading." |
| Already have the tag | Option visible, ❖ on label (unchanged) | Same — no change when tag is held |
| Tap rare/uncommon jewel | "Rare card" | "Rare card · rotates each reshuffle" |
| See tiara after first relic pick | Option vanishes silently | Option greyed; ✕ badge; tap → "Can't take twice" |

---

## Decision recorded

Supersedes **D-T6-1 UI** (2026-06-24 — show-disabled + ❖ tooltip). Data model of that decision (PREP_TAG_CARRIERS, labels, carrierCardIds) survives. New decision: `D-P20-N-1`.

---

## Tests

No new unit tests required — `getVisibleOptions` is tested via integration in `gameStore.test.ts`. Verify:
- A god-path card with unmet `hasPrepTag` condition: `hidden: true` on that VisibleOpt, `prepRequirement` populated.
- A god-path card with met `hasPrepTag` condition: `hidden: false`, option available.
- `yha_nthlei_2` after opt1 chosen: `disabledReason: "Can't take twice"`, `hidden: false`.
- No existing tests should break — `hideWhenUnavailable` logic is additive (OR'd, not replaced).
