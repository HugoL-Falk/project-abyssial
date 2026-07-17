# Outcome Modal Redesign (P12-17)

**Goal:** Replace the blocking outcome modal with a timed auto-dismiss toast, and make `+card` items in the `?` (RandomOutcome) tooltip tappable to open the existing card preview.

**Architecture:** Two files touched. `GameScreen.tsx` — remove blocking overlay, add toast with 2.5s auto-dismiss. `EffectTags.tsx` — thread `onPreviewCard` into `RandomOutcomeTag`, make `insertCard` items clickable chips.

**Tech Stack:** TypeScript/React. Verify with `npm run typecheck`.

---

## Background

**Current behaviour:**
- After resolving an option with a `randomOutcome` effect, `pendingOutcomeReveal` is set to the chosen branch's effects.
- `GameScreen.tsx` renders a full blocking overlay (zIndex 22) with a "Continue" button that calls `confirmOutcomeReveal()` to clear the state.
- In the `?` tooltip (pre-resolution), `insertCard` effects render as plain `+ card` text — not interactive.

**New behaviour:**
- Outcome shown as a fixed toast, auto-dismisses after 2500ms or on tap. No blocking.
- `insertCard` items in the `?` tooltip become tappable — opens `CardPreviewModal` for the relevant card.

---

## Existing Infrastructure (do not modify)

| Item | Location | Notes |
|---|---|---|
| `pendingOutcomeReveal: Effect[] \| null` | `gameStore.ts` line 80, 191 | Drives both old modal and new toast |
| `confirmOutcomeReveal()` | `gameStore.ts` line 804 | Sets `pendingOutcomeReveal: null` |
| `CardPreviewModal` | `src/components/game/CardPreviewModal.tsx` | Props: `card: Card, onClose: () => void` |
| `previewCardId` state | `GameScreen.tsx` line 82 | `useState<string \| null>(null)` |
| `previewCard` derived | `GameScreen.tsx` line 196 | `getCardById(previewCardId) ?? null` |
| `CardPreviewModal` render | `GameScreen.tsx` line 498 | `{previewCard && <CardPreviewModal card={previewCard} onClose={() => setPreviewCardId(null)} />}` |
| `onPreviewCard` prop | `EffectTags.tsx` (post-resolution tags) | Already passed in; used at lines 213, 233, 249 for resolved `insertCard`/`removeCard` |

---

## Files Changed

| File | Change |
|---|---|
| `src/components/GameScreen.tsx` | Remove blocking outcome overlay; add `OutcomeToast` inline component |
| `src/components/game/EffectTags.tsx` | Add `onPreviewCard?` to `RandomOutcomeTag` props; thread from `EffectTags`; make `insertCard` tappable |

---

## Task 1 — Replace outcome modal with toast (`GameScreen.tsx`)

**Files:**
- Modify: `src/components/GameScreen.tsx`

### Context

The outcome overlay is rendered inline in `GameScreen.tsx`. It currently looks roughly like this (around lines 424–470):

```tsx
{pendingOutcomeReveal !== null && (
  <div style={{ position: 'absolute', inset: 0, zIndex: 22, background: 'rgba(0,0,0,0.7)', ... }}>
    <div style={{ ... }}>
      <div>The outcome</div>
      <EffectTags effects={pendingOutcomeReveal} ... />
      <button onClick={confirmOutcomeReveal}>
        {pendingOutcomeReveal.length === 0 ? 'Nothing happened.' : 'Continue'}
      </button>
    </div>
  </div>
)}
```

### What to do

**Step 1:** Remove the entire blocking overlay block above.

**Step 2:** Add an `OutcomeToast` component immediately before the `return` statement of `GameScreen` (or as a named inner function in the same file). It must:

- Render only when `pendingOutcomeReveal !== null`
- Auto-dismiss: `useEffect` with `setTimeout(confirmOutcomeReveal, 2500)` — clear timeout on cleanup and on dep change
- Tap to dismiss: `onClick={confirmOutcomeReveal}` on the container
- Display the effect tags (or "Nothing happened." for empty array)
- Be non-blocking (no backdrop, pointer-events only on the toast itself)

```tsx
function OutcomeToast({
  effects,
  onDismiss,
}: {
  effects: Effect[]
  onDismiss: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2500)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'absolute',
        bottom: '7rem',          // above bottom UI strip — adjust if needed
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 22,
        background: 'rgba(6,4,2,0.95)',
        border: '1px solid var(--border)',
        borderRadius: '3px',
        padding: '0.5rem 0.9rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.3rem',
        cursor: 'pointer',
        animation: 'fadeIn 0.18s ease-out',
        maxWidth: '80vw',
        pointerEvents: 'auto',
      }}
    >
      {effects.length === 0 ? (
        <span style={{ fontSize: '0.78rem', color: 'rgba(200,185,155,0.55)', fontStyle: 'italic' }}>
          Nothing happened.
        </span>
      ) : (
        <EffectTags effects={effects} onPreviewCard={setPreviewCardId} />
      )}
    </div>
  )
}
```

**Step 3:** Render the toast in the JSX where the old overlay was (or at the end of the JSX, alongside `CardPreviewModal`):

```tsx
{pendingOutcomeReveal !== null && (
  <OutcomeToast effects={pendingOutcomeReveal} onDismiss={confirmOutcomeReveal} />
)}
```

`setPreviewCardId` is already in scope in `GameScreen` — no new state needed.

**Step 4:** Typecheck

```bash
cd E:\Project Abyssial\Code\project-abyssial
npm run typecheck
```

Expected: clean or errors only about `onPreviewCard` not yet existing on `RandomOutcomeTag` (next task). If errors elsewhere, stop and investigate.

**Step 5:** Commit

```bash
git add src/components/GameScreen.tsx
git commit -m "feat(P12-17): replace outcome modal with auto-dismiss toast"
```

---

## Task 2 — `+card` preview in `?` tooltip (`EffectTags.tsx`)

**Files:**
- Modify: `src/components/game/EffectTags.tsx`

### Context

`RandomOutcomeTag` currently renders `insertCard` effects as plain `<span>+ card</span>`. It has no `onPreviewCard` prop. The parent `EffectTags` function already accepts `onPreviewCard?: (id: string) => void` and uses it for resolved tags — it just doesn't pass it down to `RandomOutcomeTag`.

### What to do

**Step 1:** Add `onPreviewCard?: (id: string) => void` to `RandomOutcomeTag`'s props:

```tsx
function RandomOutcomeTag({ outcomes, tagKey, onPreviewCard }: {
  outcomes: Array<{ weight: number; effects: Effect[] }>
  tagKey: number
  onPreviewCard?: (id: string) => void
}) {
```

**Step 2:** In the tooltip render, change the `insertCard` branch from a plain span to a clickable button:

Find this line (around line 80 in the current file):
```tsx
if (ef.type === 'insertCard') return <span key={efi} style={{ color: 'var(--gold-bright)' }}>+ card</span>
```

Replace with:
```tsx
if (ef.type === 'insertCard') {
  return onPreviewCard ? (
    <button
      key={efi}
      type="button"
      onClick={e => { e.stopPropagation(); onPreviewCard(ef.cardId) }}
      style={{
        color: 'var(--gold-bright)',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        textDecoration: 'underline',
        textDecorationColor: 'rgba(200,144,32,0.4)',
      }}
    >
      + card
    </button>
  ) : (
    <span key={efi} style={{ color: 'var(--gold-bright)' }}>+ card</span>
  )
}
```

The `e.stopPropagation()` prevents the click from toggling the tooltip closed while opening the preview.

**Step 3:** Find where `EffectTags` renders `randomOutcome` effects and passes them to `RandomOutcomeTag`. Thread `onPreviewCard` through:

Look for the line where `RandomOutcomeTag` is instantiated inside `EffectTags` (will look like `<RandomOutcomeTag outcomes={ef.outcomes} tagKey={i} />`). Add the prop:

```tsx
<RandomOutcomeTag
  outcomes={ef.outcomes}
  tagKey={i}
  onPreviewCard={onPreviewCard}
/>
```

**Step 4:** Typecheck — expect clean

```bash
npm run typecheck
```

Expected: no errors.

**Step 5:** Commit

```bash
git add src/components/game/EffectTags.tsx
git commit -m "feat(P12-17): thread onPreviewCard into RandomOutcomeTag; make +card tappable"
```

---

## Done

Two commits total. Verify:
- Outcome after resolving a randomOutcome option shows as a toast that disappears in 2.5s (or on tap)
- The `?` tooltip on options with `insertCard` outcomes shows `+ card` as a tappable link that opens `CardPreviewModal`
- `CardPreviewModal` closes on tap (existing behaviour, no change needed)
