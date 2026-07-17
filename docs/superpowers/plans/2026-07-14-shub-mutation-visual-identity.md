# Shub Mutation Visual Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Shub-Niggurath's mutation mechanic a unified visual identity: ⬢ hexagon icon in fungal orange (#d4601a) on mutated cards, changed_follower, and the sacrifice pill.

**Architecture:** Add `isMutated?: boolean` to the Card type and flag all 6 mutated cards. DrawnCard renders a ⬢ badge on mutation-flagged cards and changed_follower. TheChangedIcon SVG is replaced with a matching ⬢ hex shape. The sacrifice previewTag changes from the generic `-card` grey pill to a fungal-orange `-⬢` pill.

**Tech Stack:** React (TSX), TypeScript, Vitest. No new dependencies.

## Global Constraints

- Fungal orange colour token: `#d4601a` (no CSS variable — use literal hex throughout)
- Hex shape: pointy-top hexagon matching ShubTracker clip-path `polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)`; in SVG: `M6.5,0.5 L12.5,3.5 L12.5,9.5 L6.5,12.5 L0.5,9.5 L0.5,3.5 Z`
- Flavour cap still applies to any text changes: option flavour ≤ 80 chars, body ≤ 108 chars
- Git: `git -C "C:/Project Abyssial/Code/project-abyssial"`
- Test runner: `npx vitest run` from `C:/Project Abyssial/Code/project-abyssial`
- All tests must pass (currently 273/273) before committing

---

### Task 1: Add `isMutated` flag to Card type and mutated card data

**Files:**
- Modify: `src/types/index.ts` (around line 117 — end of Card type)
- Modify: `src/data/cards/mutations.ts` — add flag to all 6 mutated cards
- Test: `src/data/cards/mutations.test.ts`

**Interfaces:**
- Produces: `Card.isMutated?: boolean` — consumed by Task 3 (DrawnCard badge)

- [ ] **Step 1: Write the failing test**

Add to the bottom of `src/data/cards/mutations.test.ts`:

```ts
it('every mutation card has isMutated: true', () => {
  for (const card of MUTATION_CARDS) {
    expect(card.isMutated, `${card.id} missing isMutated flag`).toBe(true)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run src/data/cards/mutations.test.ts
```

Expected: FAIL — `second_account missing isMutated flag`

- [ ] **Step 3: Add `isMutated` to the Card type**

In `src/types/index.ts`, locate the `Card` type (around line 101). Add after `pinnedNextCycle`:

```ts
  isMutated?: boolean        // true for Shub deck-mutation replacements; renders ⬢ badge
```

- [ ] **Step 4: Add `isMutated: true` to all 6 mutated cards in `src/data/cards/mutations.ts`**

Each card object starts with `id:` and `title:`. Add `isMutated: true` immediately after the `tier:` line for all six cards. The cards are: `second_account`, `word_has_spread_further`, `second_run`, `still_burning`, `still_open`, `the_merchant_again`.

Example diff for `second_account` (repeat for all 6):

```ts
// Before
  id: 'second_account',
  title: "Second Account",
  flavourText: "...",
  tier: 'common',

// After
  id: 'second_account',
  title: "Second Account",
  flavourText: "...",
  tier: 'common',
  isMutated: true,
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run src/data/cards/mutations.test.ts
```

Expected: all 4 tests PASS

- [ ] **Step 6: Run full suite to confirm no regressions**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run
```

Expected: 273+ tests PASS, 0 fail

- [ ] **Step 7: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/types/index.ts src/data/cards/mutations.ts src/data/cards/mutations.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(data): add isMutated flag to Card type and 6 mutated cards (P25-30)"
```

---

### Task 2: Replace TheChangedIcon with ⬢ hexagon + update InGameMenuButton to orange

**Files:**
- Modify: `src/components/game/ResourceIcons.tsx` (line 10)
- Modify: `src/components/game/InGameMenuButton.tsx` (lines 297–302)

**Interfaces:**
- Consumes: nothing new
- Produces: updated `TheChangedIcon` component (⬢ hex, fill="currentColor") — consumed by InGameMenuButton, ResourceTag, and (after Task 4) the previewTag pill

- [ ] **Step 1: Replace TheChangedIcon SVG in `src/components/game/ResourceIcons.tsx`**

Replace line 10:

```ts
// Before
export function TheChangedIcon() { return <svg style={{ display: 'block' }} width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 12V7M6.5 7L3 3M6.5 7L10 3M3 3L1.5 1.5M10 3L11.5 1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg> }

// After
export function TheChangedIcon() { return <svg style={{ display: 'block' }} width="13" height="13" viewBox="0 0 13 13"><path d="M6.5,0.5 L12.5,3.5 L12.5,9.5 L6.5,12.5 L0.5,9.5 L0.5,3.5 Z" fill="currentColor"/></svg> }
```

- [ ] **Step 2: Update InGameMenuButton to use fungal orange for the theChanged section**

In `src/components/game/InGameMenuButton.tsx`, locate the div around line 293–303 (the theChanged display block). It currently has `color: '#6fb86a'`. Replace the three colour values:

```tsx
// Before (lines ~295–302)
              color: '#6fb86a',
              textShadow: '0 0 6px rgba(111,184,106,0.4)',
// ...
                <span style={{ fontSize: '0.58rem', color: 'rgba(111,184,106,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>changed</span>

// After
              color: '#d4601a',
              textShadow: '0 0 6px rgba(212,96,26,0.4)',
// ...
                <span style={{ fontSize: '0.58rem', color: 'rgba(212,96,26,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>changed</span>
```

- [ ] **Step 3: Run full test suite**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run
```

Expected: 273+ PASS (visual change only, no logic change)

- [ ] **Step 4: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/game/ResourceIcons.tsx src/components/game/InGameMenuButton.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(ui): replace TheChangedIcon Y-shape with ⬢ hexagon in fungal orange (P25-30)"
```

---

### Task 3: Add ⬢ badge to mutated cards and changed_follower in DrawnCard

**Files:**
- Modify: `src/components/game/DrawnCard.tsx` (title row, around line 240–265)

**Interfaces:**
- Consumes: `card.isMutated` (Task 1), `card.id === 'changed_follower'` check

- [ ] **Step 1: Locate the title div in `src/components/game/DrawnCard.tsx`**

Find the inner `<div>` that renders `{card.title}` (around line 240). It looks like:

```tsx
<div style={{ fontVariant: 'small-caps', color: 'var(--gold-bright)', fontSize: compact ? '1.05rem' : '1.1rem', letterSpacing: '0.04em', flex: 1, lineHeight: 1.2, position: 'relative', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
  {card.title}
  {!compact && hiddenPrepReqs && hiddenPrepReqs.length > 0 && (
    <HintTooltip ...>
```

- [ ] **Step 2: Insert ⬢ badge immediately after `{card.title}`**

Add the badge between `{card.title}` and the prep-tag HintTooltip:

```tsx
  {card.title}
  {(card.isMutated || card.id === 'changed_follower') && (
    <span style={{ color: '#d4601a', fontSize: '0.7rem', flexShrink: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>⬢</span>
  )}
  {!compact && hiddenPrepReqs && hiddenPrepReqs.length > 0 && (
```

- [ ] **Step 3: Run full test suite**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run
```

Expected: 273+ PASS

- [ ] **Step 4: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/game/DrawnCard.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(ui): add ⬢ mutation badge to mutated cards and changed_follower (P25-30/52)"
```

---

### Task 4: Redesign sacrifice previewTag from `-card` to `-⬢` orange pill

**Files:**
- Modify: `src/data/cards/special.ts` — 4 occurrences of `previewTag: '-card'`
- Modify: `src/components/game/EffectTags.tsx` (lines 248–250)

**Interfaces:**
- Consumes: `TheChangedIcon` from ResourceIcons (Task 2)
- Produces: new `-theChanged` previewTag handling in EffectTags

- [ ] **Step 1: Update `src/data/cards/special.ts` — replace all 4 previewTag values**

Find all four occurrences of `previewTag: '-card'` in `special.ts` (one per sacrifice option, lines ~25, ~45, ~65, ~80). Replace each with:

```ts
// Before
        previewTag: '-card',

// After
        previewTag: '-theChanged',
```

There are exactly 4 instances — all on the sacrifice options of `changed_follower`. The "Let them stay" option has no previewTag and is unchanged.

- [ ] **Step 2: Handle `-theChanged` in `src/components/game/EffectTags.tsx`**

Locate lines 248–250:

```tsx
  if (hasPreviewOverride) {
    tags.push(<PreviewTag key="preview-override" text={previewTag!} />)
  }
```

Replace with:

```tsx
  if (hasPreviewOverride) {
    if (previewTag === '-theChanged') {
      tags.push(
        <span key="preview-override" style={{
          fontSize: '0.8rem',
          color: '#d4601a',
          border: '1px solid rgba(212,96,26,0.45)',
          padding: '0.15rem 0.45rem',
          borderRadius: '2px',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          lineHeight: 1,
        }}>
          −⬢
        </span>
      )
    } else {
      tags.push(<PreviewTag key="preview-override" text={previewTag!} />)
    }
  }
```

- [ ] **Step 3: Run full test suite**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run
```

Expected: 273+ PASS

- [ ] **Step 4: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/special.ts src/components/game/EffectTags.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(ui): replace -card grey pill with -⬢ orange pill on changed_follower sacrifice (P25-50)"
```
