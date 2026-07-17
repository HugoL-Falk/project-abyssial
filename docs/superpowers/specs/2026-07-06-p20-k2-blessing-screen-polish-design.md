# P20-K2: Blessing Screen Text + Locked Copy Polish

**Date:** 2026-07-06  
**Status:** Approved  
**Scope:** `src/components/SetupScreens.tsx` — `BlessingSelectScreen` only

---

## Problem

Three issues with the current blessing screen:

1. **Truncated descriptions** — unlocked blessings show only the first sentence (via regex snippet). For mechanically complex blessings (The Drowned Mark, The Deep Trade, The Crawling Network, The Patient Forest) this silently hides the bane half. Players can select a blessing without knowing its cost.

2. **Out-of-voice locked copy** — `"Unlocked when summoning X."` reads as a UI tooltip, not in the game's register.

3. **Styling inconsistency** — blessing body text uses ad-hoc CSS vars (`var(--text-dim)`, `var(--text-faint)`) rather than the established option-card colour conventions.

---

## Design Decisions

### 1. Full description for unlocked blessings

Remove the snippet regex (`b.description.match(/^[^.!?]+[.!?]/)?.[0]`). Render `b.description` in full. All blessings have concise descriptions (1–3 short sentences); full display is not a layout risk.

### 2. Locked copy — light rephrase

| Condition | Before | After |
|---|---|---|
| God-gated | `"Unlocked when summoning X."` | `"Earned by summoning X."` |
| Fallback | `"Complete a run to unlock."` | `"Earned by completing a run."` |

"Earned" is one step closer to the game's register without becoming opaque.

### 3. Styling — match option card conventions

Align to `OptionsColumn.tsx` available/disabled body and title colours:

| State | Body | Title |
|---|---|---|
| Unlocked (unchosen) | `rgba(200,185,158,0.82)` | `var(--gold)` (unchanged) |
| Locked | `rgba(200,185,155,0.68)` | `rgba(200,185,155,0.78)` |

Font: `0.8rem italic` unchanged for both states — matches option body exactly.

---

## Files Changed

- `src/components/SetupScreens.tsx`
  - Line ~249: remove snippet regex, use `b.description` directly
  - Line ~254: rephrase `lockCopy` strings
  - Line ~265: update locked body colour to `rgba(200,185,155,0.68)`
  - Line ~262: update locked title colour to `rgba(200,185,155,0.78)`
  - Line ~284: update unlocked body colour to `rgba(200,185,158,0.82)`

---

## Out of Scope

- Flavour text display (not shown on any blessing row currently — no change)
- Chosen/selected state styling (gold border + `var(--color-gold-bright)` — already correct)
- `atMax` disabled state (opacity 0.45 on the row — unchanged)
