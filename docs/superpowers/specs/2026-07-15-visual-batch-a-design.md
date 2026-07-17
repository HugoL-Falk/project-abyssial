# Visual Batch A — Quick CSS Fixes

**Date:** 2026-07-15
**Backlog items:** P25-12, P25-13, P25-24, P25-25, P25-26
**Scope:** Pure CSS / inline-style changes. No engine or state logic touched.

---

## 1. P25-12 — God path pill text: green → amber

**File:** `src/components/game/ActivityLog.tsx`
**Location:** `InsertPurgePill` — `textColor` constant

**Problem:** `isGodPathInsert` text uses `'var(--gold-bright)'` (`#9ecc7a`, green). Decision D-s151-1 established that amber is the god-path colour: `--color-gold-bright` (`#e8c050`).

**Fix:**
```ts
// before
const textColor = isGodPathInsert
  ? 'var(--gold-bright)'
  : ...

// after
const textColor = isGodPathInsert
  ? 'var(--color-gold-bright)'
  : ...
```

The pill border already uses amber (`rgba(212,175,55,0.55)`) — no change needed there.

---

## 2. P25-13 — +/− sign misalignment in pills and activity log

**Files:**
- `src/components/game/ActivityLog.tsx` — `InsertPurgePill` symbol span
- `src/components/game/ActivityLog.tsx` — `PrepTagRemovedPill` `−❖` span
- `src/components/game/tags/ResourceTag.tsx` — icon/number alignment

**Problem:** In Cormorant Garamond, `+` and `−` sit slightly high relative to the text baseline when inside a `lineHeight: 1` span. The icon and number in ResourceTag can also misalign due to the fixed `height: 13px` container.

**Fix — InsertPurgePill:**
Replace `<span style={{ lineHeight: 1 }}>` on the symbol with `<span style={{ display: 'inline-flex', alignItems: 'center' }}>`. This lets the flex-item itself centre the glyph rather than relying on line-height collapse.

**Fix — PrepTagRemovedPill:**
Same treatment on the `−❖` span: switch from implicit inline to `display: inline-flex; alignItems: center`.

**Fix — ResourceTag:**
The number span already uses `display: inline-flex; alignItems: center; height: 13px`. If visual misalignment persists after the code change, add `position: relative; top: 0.05em` to nudge the glyph down to match the icon midpoint. Apply conservatively — verify in browser before committing.

---

## 3. P25-24 — Selected blessing: outline-only, no gold fill

**File:** `src/components/SetupScreens.tsx`
**Location:** `BlessingSelectScreen` — the unlocked blessing `<button>` render

**Problem:** Selected blessings use `background: 'rgba(180,155,60,0.82)'` — a heavy gold fill that makes the description text hard to read.

**Fix:**
- `background`: always `'var(--surface)'` (same as unselected)
- Keep existing amber border: `1px solid rgba(200,160,40,0.85)` when selected
- Add amber glow: `boxShadow: chosen ? '0 0 0 1px rgba(200,160,40,0.55), 0 0 10px rgba(200,160,40,0.15)' : 'none'`
- Description text colour when chosen: change from `'var(--text)'` → `'rgba(200,185,158,0.82)'` (same as unselected) so contrast is consistent regardless of selection state

Before:
```ts
background: chosen ? 'rgba(180,155,60,0.82)' : 'var(--surface)',
```
After:
```ts
background: 'var(--surface)',
boxShadow: chosen ? '0 0 0 1px rgba(200,160,40,0.55), 0 0 10px rgba(200,160,40,0.15)' : 'none',
```

Description div: remove the `chosen ? 'var(--text)' : ...` branch — always use `'rgba(200,185,158,0.82)'`.

---

## 4. P25-25 — Succumb screen: detach bottom red line from content

**File:** `src/components/FailureScreen.tsx`
**Location:** Bottom red line `<div>` (after the stats block, before the button section)

**Problem:** The bottom red line reads as a separator between the run stats and the buttons, creating an awkward visual split.

**Fix:** Push it further from the content above and closer to the buttons below:
- Add `marginTop: '1.5rem'` to the bottom line div
- Reduce `marginBottom` from `'2rem'` → `'1rem'`

This makes the line read as a decorative footer element attached to the button block rather than a divider.

---

## 5. P25-26 — Doom escalates row: centered, no icon

**File:** `src/components/game/ActivityLog.tsx`
**Location:** `ActivityRow` — `doomEscalate` branch

**Problem:** Row shows `⚠ Doom escalates` left-aligned with a warning icon that doesn't fit the game's visual language.

**Fix:**
- Remove the `⚠` icon `<span>` entirely
- Add `justifyContent: 'center'` to the row div
- Keep: red colour, `fontVariant: 'small-caps'`, `letterSpacing`

Result: `Doom escalates` centred in red small-caps — reads as a moment of weight without the warning-sign UI idiom.

---

## Files changed

| File | Items |
|---|---|
| `src/components/game/ActivityLog.tsx` | P25-12, P25-13, P25-26 |
| `src/components/game/tags/ResourceTag.tsx` | P25-13 |
| `src/components/SetupScreens.tsx` | P25-24 |
| `src/components/FailureScreen.tsx` | P25-25 |

## Testing

- No logic changes — no engine tests affected.
- Visual-only: verify in browser at each changed screen.
- Existing vitest suite must remain green (302/302).
