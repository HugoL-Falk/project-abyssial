# Outcome Modal Redesign (P12-17) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blocking outcome modal in `GameScreen.tsx` with a timed auto-dismiss toast, and make `insertCard` entries in the `?` (RandomOutcome) tooltip tappable to open the existing `CardPreviewModal`.

**Architecture:** Two files changed in order. Task 1 touches only `GameScreen.tsx` — removes the old overlay, adds an `OutcomeToast` component inline. Task 2 touches only `EffectTags.tsx` — threads `onPreviewCard` into `RandomOutcomeTag` and makes `insertCard` items clickable. No new files, no new state.

**Tech Stack:** TypeScript, React. No test framework — verify each task with `npm run typecheck` (runs `tsc --noEmit`). All commits local only.

---

## File Map

| File | Change |
|---|---|
| `src/components/GameScreen.tsx` | Remove blocking overlay (lines 423–470); add `OutcomeToast` component and render it |
| `src/components/game/EffectTags.tsx` | Add `onPreviewCard?` to `RandomOutcomeTag` props; thread it from `EffectTags`; make `insertCard` line clickable |

---

## Existing infrastructure — do not modify these

| Item | Location |
|---|---|
| `pendingOutcomeReveal: Effect[] \| null` | `gameStore.ts` — drives the toast when non-null |
| `confirmOutcomeReveal()` | `gameStore.ts` line 804 — sets `pendingOutcomeReveal: null` |
| `CardPreviewModal` | `src/components/game/CardPreviewModal.tsx` — props: `card: Card, onClose: () => void` |
| `previewCardId` state + `previewCard` derived | `GameScreen.tsx` lines 82, 196 — already wired to `CardPreviewModal` at line 498 |
| `setPreviewCardId` | `GameScreen.tsx` — already passed as `onPreviewCard` to `OptionsColumn` at line 357 |
| `onPreviewCard` on `EffectTags` | `EffectTags.tsx` line 172 — already accepted; used for resolved `insertCard` tags at lines 213, 233 |
| `useEffect` | Already imported in `GameScreen.tsx` line 1 — no new import needed |

---

## Task 1 — Replace outcome modal with `OutcomeToast` (`GameScreen.tsx`)

**Files:**
- Modify: `src/components/GameScreen.tsx`

---

- [ ] **Step 1: Remove the blocking overlay (lines 423–470)**

Delete the entire block from the comment through the closing `)}`:

```tsx
        {/* Outcome reveal overlay — shown after resolving a randomOutcome option */}
        {pendingOutcomeReveal && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.82)',
            }}
          >
            <div
              style={{
                background: 'rgba(10,8,5,0.97)',
                border: '1px solid rgba(200,144,32,0.35)',
                padding: '1.2rem 1.4rem 1rem',
                textAlign: 'center', maxWidth: '220px', width: '80%',
                boxShadow: '0 0 32px rgba(200,144,32,0.12)',
                animation: 'fadeIn 0.22s ease-out',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: '0.52rem', color: 'rgba(200,144,32,0.65)', textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: '0.5rem' }}>
                The outcome
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                {pendingOutcomeReveal.length === 0
                  ? <span style={{ fontSize: '0.8rem', color: 'rgba(200,185,155,0.6)', fontStyle: 'italic' }}>Nothing happened.</span>
                  : <EffectTags effects={pendingOutcomeReveal} inline />
                }
              </div>
              <button
                onClick={confirmOutcomeReveal}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(200,144,32,0.30)',
                  color: 'rgba(200,185,155,0.8)',
                  padding: '0.4rem 1.8rem',
                  fontSize: '0.78rem',
                  letterSpacing: '0.12em',
                  fontVariant: 'small-caps',
                  fontFamily: 'var(--ui-font)',
                  cursor: 'pointer',
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}
```

After deletion, line 423 should be the blank line before the `{/* ResourceBar */}` comment.

---

- [ ] **Step 2: Add `OutcomeToast` component**

Add this function **before** the `export function GameScreen()` declaration (i.e., above line 16). It uses `useEffect`, `EffectTags`, and the `Effect` type — all already imported.

```tsx
// ─── Outcome toast — auto-dismisses after 2500ms, tap to dismiss early ────────
function OutcomeToast({
  effects,
  onDismiss,
  onPreviewCard,
}: {
  effects: Effect[]
  onDismiss: () => void
  onPreviewCard: (id: string) => void
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
        bottom: '7rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 22,
        background: 'rgba(6,4,2,0.95)',
        border: '1px solid rgba(200,144,32,0.35)',
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
        <EffectTags effects={effects} inline onPreviewCard={onPreviewCard} />
      )}
    </div>
  )
}
```

---

- [ ] **Step 3: Render `OutcomeToast` in the JSX**

In the JSX where the old overlay was (around line 423, now a blank line), add:

```tsx
        {/* Outcome toast — auto-dismisses after 2500ms */}
        {pendingOutcomeReveal && (
          <OutcomeToast
            effects={pendingOutcomeReveal}
            onDismiss={confirmOutcomeReveal}
            onPreviewCard={setPreviewCardId}
          />
        )}
```

`setPreviewCardId` is already in scope in `GameScreen` (line 82). No new state needed.

---

- [ ] **Step 4: Typecheck**

```bash
cd E:\Project Abyssial\Code\project-abyssial
npm run typecheck
```

Expected: clean. `EffectTags` already accepts `onPreviewCard?: (id: string) => void`, so passing it here won't cause a type error even before Task 2. If you see errors unrelated to this task, stop and investigate.

---

- [ ] **Step 5: Commit**

```bash
git add src/components/GameScreen.tsx
git commit -m "feat(P12-17): replace outcome modal with auto-dismiss toast"
```

---

## Task 2 — `+card` preview in `?` tooltip (`EffectTags.tsx`)

**Files:**
- Modify: `src/components/game/EffectTags.tsx`

---

- [ ] **Step 1: Add `onPreviewCard?` to `RandomOutcomeTag` props**

Current signature (line 8–11):

```tsx
function RandomOutcomeTag({ outcomes, tagKey }: {
  outcomes: Array<{ weight: number; effects: Effect[] }>
  tagKey: number
}) {
```

Replace with:

```tsx
function RandomOutcomeTag({ outcomes, tagKey, onPreviewCard }: {
  outcomes: Array<{ weight: number; effects: Effect[] }>
  tagKey: number
  onPreviewCard?: (id: string) => void
}) {
```

---

- [ ] **Step 2: Make `insertCard` clickable in the tooltip**

Current line 67:

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

The `e.stopPropagation()` prevents the tooltip from closing when the button is tapped.

---

- [ ] **Step 3: Thread `onPreviewCard` into `RandomOutcomeTag` from `EffectTags`**

Current line 270:

```tsx
      tags.push(<RandomOutcomeTag key={i} outcomes={e.outcomes} tagKey={i} />)
```

Replace with:

```tsx
      tags.push(<RandomOutcomeTag key={i} outcomes={e.outcomes} tagKey={i} onPreviewCard={onPreviewCard} />)
```

`onPreviewCard` is already in scope — it's a prop of `EffectTags` (line 172).

---

- [ ] **Step 4: Typecheck — expect clean**

```bash
npm run typecheck
```

Expected: no errors. This is the final task — the type system should be fully consistent now. If errors appear, stop and investigate.

---

- [ ] **Step 5: Commit**

```bash
git add src/components/game/EffectTags.tsx
git commit -m "feat(P12-17): thread onPreviewCard into RandomOutcomeTag; make +card tappable"
```

---

## Done

Two commits total. Manual verification:

1. Resolve an option with a `randomOutcome` effect → toast appears at bottom-centre, disappears after ~2.5s. Tap it early to dismiss immediately.
2. On an option with a `randomOutcome` that includes `insertCard`, tap `?` → tooltip shows `+ card` as an underlined link → tap it → `CardPreviewModal` opens showing the card → tap anywhere to close.
3. Empty outcome branch (no effects) → toast shows "Nothing happened." and auto-dismisses.
