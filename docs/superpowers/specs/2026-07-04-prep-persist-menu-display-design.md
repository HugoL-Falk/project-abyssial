# PREP-PERSIST + Menu Prep-Tag Display

**Date:** 2026-07-04
**Backlog:** PREP-PERSIST (from P19-27, s100) · P20-M remaining · P19-27 display extension
**Supersedes (partially):** `2026-06-25-p19-27-acquired-prep-tags-display.md` — that spec shipped the `AcquiredPrepTags` component and glyph unification. This spec resolves the PREP-PERSIST question (previously "out of scope") and extends the display to the in-game menu.

---

## Decision

**Prep tags are cumulative ritual knowledge, not within-week buffs.**

A player who picks up `studied` in week 2 is carrying that preparation forward until they act on it. Tags now survive reshuffles and are cleared only when spent (`consumePrepTag`) or when a run ends. This fixes a structural timing bug: chain cards are inserted via `nextCycleQueue` *at* reshuffle time, so they always appear *after* the reshuffle that (previously) wiped the tags needed to use them.

Known edge case (accepted): if a player acquires a tag after advancing past the chain stage that would consume it, the tag sits in the display until end-of-run. Harmless and rare.

---

## Changes

### 1. `src/state/gameStore.ts` — remove reshuffle clears

Remove `prepTags: []` from both reshuffle `set()` calls:

- **Tutorial reshuffle path** (~line 1400): remove `prepTags: []`
- **Main reshuffle path** (~line 1439): remove `prepTags: []`

Tags are now cleared only by:
- `consumePrepTag` effect (already fires when a chain card option spends the tag)
- `startRun`, `restartRun`, `startTutorial` (already set `prepTags: []` — run boundaries unchanged)
- `loadRun` reset (unchanged)

No type or persistence changes needed. `saveRun`/`loadRun` already round-trips `prepTags` correctly.

### 2. `src/data/cards/core.ts` — carrier guards

Two carrier options lack the `notHasPrepTag` guard that `the_old_book` already has (P19-26). Under persistence, re-picking while holding wastes resources for no effect.

**`the_opium_den` opt 0** (`opium_pact`):
- Current condition: `{ type: 'resourceMin', resource: 'followers', min: 2 }`
- New condition: `{ type: 'and', conditions: [{ type: 'resourceMin', resource: 'followers', min: 2 }, { type: 'notHasPrepTag', tag: 'opium_pact' }] }`

**`the_seance` opt 0** (`attended_seance`):
- Current condition: none
- New condition: `{ type: 'notHasPrepTag', tag: 'attended_seance' }`

`what_was_already_read` (`recited`) is self-limiting — the card removes itself on pick — no guard needed.

Also update the comment on `the_old_book` opt 2 (line ~168): remove the clause "Tag clears on reshuffle / when a chain card consumes it" — now it's only "when a chain card consumes it."

### 3. `src/components/game/InGameMenuButton.tsx` — swap passive rows for prep tags

**Remove:**
- `ResourceDelta` and `CategoryData` type aliases
- `aggregate`, `buildCategory`, `DeltaTags`, `ProbabilisticLine` helper functions (only used here)
- `reshuffleCards`, `onDrawCards`, `reshuffleData`, `onDrawData` derived values
- The "↻ each reshuffle" and "⬇ on draw" JSX block (~lines 249–271)
- `Effect` and `Card` imports (no longer needed after helper removal)

**Add** at the top of the popover (above the Audio section):

```tsx
import { buildPrepTagPills } from '../../data/godPaths/prepTagCarriers'

// in component body:
const prepTags = useGameStore(s => s.prepTags)
const prepPills = buildPrepTagPills(prepTags)

// in JSX (replaces the reshuffle/ondraw block):
{prepPills.length > 0 && (
  <div style={{ marginBottom: '0.5rem' }}>
    <div style={{
      fontSize: '0.7rem', color: 'rgba(200,144,32,0.75)',
      fontVariant: 'small-caps', letterSpacing: '0.08em', marginBottom: '0.35rem',
    }}>
      Preparations
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
      {prepPills.map(({ tag, label }) => (
        <span key={tag} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
          fontSize: '0.75rem', color: '#9b7bd4',
          textShadow: '0 0 6px rgba(155,123,212,0.5)',
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(155,123,212,0.35)',
          padding: '0.08rem 0.35rem', borderRadius: '2px',
          fontVariant: 'small-caps', letterSpacing: '0.05em',
        }}>
          <span>❖</span><span>{label}</span>
        </span>
      ))}
    </div>
  </div>
)}
```

When no tags are held the block is hidden entirely (no empty state shown).

The existing `AcquiredPrepTags` component in `GameScreen.tsx` (between card art and options) stays in place — it is a separate display location and is not changed.

Net change: ~−80 lines (helpers removed), ~+25 lines (prep block). File gets lighter.

### 4. `src/state/gameStore.test.ts` — update reshuffle tests

**`reshuffleOnly prepTags reset` describe block (~line 474):**
- Both tests currently assert `prepTags` clears to `[]` after reshuffle
- Flip assertions: tags held before reshuffle must **survive** unchanged after reshuffle
- Rename describe block: `prepTags persist across reshuffle`
- Test titles: "non-tutorial reshuffle preserves prepTags" / "tutorial reshuffle preserves prepTags"

**Regression comment at ~line 1845:**
- Remove "reshuffle cleared tags" language from comment and test description — the gate now uses `cardOptionChosen`, not `notHasPrepTag`, so tag persistence is irrelevant to that test. Keep the test logic intact; only update the comment to reflect the correct gate mechanism.

No new tests needed — `notHasPrepTag` condition evaluation is already covered by existing `studied` guard tests.

---

## Scope / out of scope

**In scope:**
- Tags survive reshuffle (engine change)
- Carrier guards for `opium_pact` and `attended_seance`
- Menu popover: reshuffle/ondraw rows → prep tag display
- Test updates

**Out of scope:**
- Stranded-tag pruning on `advanceGodPath` (accepted edge case, defer to follow-up)
- P20-N (prep-tag-gated options hidden vs disabled — separate decision, tracked separately)
- `AcquiredPrepTags` in `GameScreen.tsx` — no changes
- Any balance pass on prep-tag economy (monitor in next playtest)
