# GameScreen Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `GameScreen.tsx` (487 LOC) into three focused files by extracting the draw-pile view branch and the overlay layer into dedicated components.

**Architecture:** Pure JSX-extraction refactor — no logic changes, no state moves. All state and effects remain in `GameScreen.tsx`; new components are presentational wrappers that receive props. `DrawPileView` owns the draw-pile branch (pile display + lift/flip/zoom animation phases). `GameOverlays` owns the four floating overlays (TutorialSplash, RelicPicker, PendingGameOver, CardPreviewModal).

**Tech Stack:** React 18, TypeScript, Vite, Vitest

## Global Constraints

- No logic changes — this is JSX extraction only. If in doubt, copy the code exactly.
- No DOM/RTL test harness exists. Tests are Vitest unit tests in `src/`. Do not add component tests.
- Verify 151/151 Vitest tests pass and `npm run typecheck` is clean after every task.
- Max 3 context lines above/below any diff. Never rewrite whole files.
- New files live in `src/components/game/`.
- Git repo: `C:/Project Abyssial/Code/project-abyssial`. Always `git -C "C:/Project Abyssial/Code/project-abyssial"` for git commands.
- Branch: `claude/build-abyssial-game-*` (current branch is trunk — do not merge anywhere).

---

## File Map

| File | Action | Responsibility after split |
|---|---|---|
| `src/components/GameScreen.tsx` | Modify | State management, effects, card-view branch JSX, ResourceBar; renders DrawPileView + GameOverlays |
| `src/components/game/DrawPileView.tsx` | **Create** | Draw-pile branch: WeekBanner, DrawPile, ActivityLog panel, lift/flip/zoom animation phases |
| `src/components/game/GameOverlays.tsx` | **Create** | TutorialSplash, RelicPicker (standalone), PendingGameOver modal, CardPreviewModal |

---

### Task 1: Extract DrawPileView

**Files:**
- Create: `src/components/game/DrawPileView.tsx`
- Modify: `src/components/GameScreen.tsx`

**What moves:** The entire `showingDrawPile` JSX branch (currently lines 241–326 of `GameScreen.tsx`) moves verbatim into `DrawPileView`. `GameScreen` replaces those 86 lines with a single `<DrawPileView ...props />` call.

**Interfaces:**

```typescript
// Props for DrawPileView
interface DrawPileViewProps {
  drawAnim: { phase: 'lift' | 'flip' | 'zoom'; card: Card } | null
  isFlipped: boolean
  drawPileCount: number
  discardCount: number
  pendingReshuffleAddCount: number
  insertAnim: boolean
  reshuffleAnim: boolean
  weekBannerVisible: boolean
  reshuffleCount: number
  unravellingTier: number
  isTutorial: boolean
  prepNudge: string | undefined
  insertedUnravellingName: string | undefined
  onDraw: () => void
  onReshuffle: () => void
  onPreviewCard: (id: string | null, opts?: { showOptions?: boolean }) => void
}
```

- [ ] **Step 1: Create `src/components/game/DrawPileView.tsx`**

Create the file with the following exact content (copied verbatim from `GameScreen.tsx` lines 241–326, then wrapped in a component with the props interface above):

```typescript
import type { Card }          from '../../types/index'
import { DrawPile }           from './DrawPile'
import { DrawnCard }          from './DrawnCard'
import { ActivityLog }        from './ActivityLog'
import { WeekBanner }         from './WeekBanner'
import { getCardBackSlug }    from '../../engine/audioSettings'
import { getCardBackBySlug }  from '../../data/cardBacks'

interface DrawPileViewProps {
  drawAnim: { phase: 'lift' | 'flip' | 'zoom'; card: Card } | null
  isFlipped: boolean
  drawPileCount: number
  discardCount: number
  pendingReshuffleAddCount: number
  insertAnim: boolean
  reshuffleAnim: boolean
  weekBannerVisible: boolean
  reshuffleCount: number
  unravellingTier: number
  isTutorial: boolean
  prepNudge: string | undefined
  insertedUnravellingName: string | undefined
  onDraw: () => void
  onReshuffle: () => void
  onPreviewCard: (id: string | null, opts?: { showOptions?: boolean }) => void
}

export function DrawPileView({
  drawAnim, isFlipped,
  drawPileCount, discardCount, pendingReshuffleAddCount,
  insertAnim, reshuffleAnim,
  weekBannerVisible, reshuffleCount, unravellingTier,
  isTutorial, prepNudge, insertedUnravellingName,
  onDraw, onReshuffle, onPreviewCard,
}: DrawPileViewProps) {
  return (
    <div style={{ height: '100%', paddingTop: '70px', position: 'relative', display: 'flex', flexDirection: 'column' }}>

      {/* Top slot — WeekBanner */}
      {!drawAnim && weekBannerVisible && (
        <div style={{ position: 'absolute', top: '70px', left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'center' }}>
          <WeekBanner reshuffleCount={reshuffleCount} unravellingTier={unravellingTier} suppress={isTutorial} prepNudge={prepNudge} insertedUnravellingName={insertedUnravellingName} />
        </div>
      )}

      {/* Static pile — hidden while animating */}
      {!drawAnim && (
        <DrawPile count={drawPileCount} onDraw={onDraw} onReshuffle={onReshuffle} discardCount={discardCount} pendingReshuffleAddCount={pendingReshuffleAddCount} insertAnim={insertAnim} reshuffleAnim={reshuffleAnim} weekNumber={reshuffleCount + 1} />
      )}

      {/* Doom + Outcome panels beneath the draw pile */}
      {!drawAnim && (
        <div
          style={{
            position: 'absolute',
            bottom: '1.2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 22,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            pointerEvents: 'auto',
            maxWidth: '92vw',
          }}
        >
          <ActivityLog onPreviewCard={onPreviewCard} />
        </div>
      )}

      {/* Phase 1: top card lifts from pile */}
      {drawAnim?.phase === 'lift' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div className="card-lift-up card-parchment" style={{ width: '220px', height: '330px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '3rem', color: 'var(--gold)', opacity: 0.1 }}>✦</span>
          </div>
        </div>
      )}

      {/* Phase 2: flip */}
      {drawAnim?.phase === 'flip' && (() => {
        const back = getCardBackBySlug(getCardBackSlug())
        return (
          <div style={{ position: 'absolute', inset: 0, paddingTop: '70px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
            <div className="flip-scene" style={{ width: '220px', height: '330px' }}>
              <div className={`flip-inner${isFlipped ? ' is-flipped' : ''}`}>
                <div className="flip-face" style={{
                  backgroundImage: `url(/cardbacks/${back.file})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid #3a3225',
                  borderRadius: '6px',
                  boxShadow: 'inset 0 0 22px 6px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(0,0,0,0.7)',
                }} />
                <div className="flip-face flip-front" style={{ overflow: 'hidden', position: 'relative' }}>
                  <DrawnCard card={drawAnim.card} textVisible={false} />
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Phase 3: zoom — fills full screen (no padding) */}
      {drawAnim?.phase === 'zoom' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          <div className="card-zoom-fill" style={{ position: 'absolute', inset: 0 }}>
            <DrawnCard card={drawAnim.card} textVisible={false} />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace the draw-pile branch in `GameScreen.tsx`**

In `GameScreen.tsx`, add `DrawPileView` to imports:

Old:
```typescript
import { ActivityLog }           from './game/ActivityLog'
```
New:
```typescript
import { ActivityLog }           from './game/ActivityLog'
import { DrawPileView }          from './game/DrawPileView'
```

Then replace the draw-pile branch JSX. In `GameScreen.tsx`, find this block (currently inside the `showingDrawPile ? (` ternary):

Old (entire draw-pile branch content — the `<div style={{ height: '100%', paddingTop: '70px'...` through its closing `</div>`):
```tsx
          /* ── Draw pile view + lift → flip → zoom animation ── */
          <div style={{ height: '100%', paddingTop: '70px', position: 'relative', display: 'flex', flexDirection: 'column' }}>

            {/* Top slot — WeekBanner. Absolutely positioned so it doesn't
                push the draw pile down (P17-27: pile was offset vs. empty state). */}
            {!drawAnim && weekBannerVisible && (
              <div style={{ position: 'absolute', top: '70px', left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'center' }}>
                <WeekBanner reshuffleCount={reshuffleCount} unravellingTier={unravellingTier} suppress={isTutorial} prepNudge={prepNudge} insertedUnravellingName={insertedUnravellingName} />
              </div>
            )}

            {/* Static pile — hidden while animating */}
            {!drawAnim && (
              <DrawPile count={drawPileCount} onDraw={handleDraw} onReshuffle={handleReshuffle} discardCount={discardCount} pendingReshuffleAddCount={pendingReshuffleAddCount} insertAnim={insertAnim} reshuffleAnim={reshuffleAnim} weekNumber={reshuffleCount + 1} />
            )}

            {/* Doom + Outcome panels beneath the draw pile */}
            {!drawAnim && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '1.2rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.4rem',
                  pointerEvents: 'auto',
                  maxWidth: '92vw',
                }}
              >
                <ActivityLog onPreviewCard={setPreviewCardId} />
              </div>
            )}

            {/* Phase 1: top card lifts from pile */}
            {drawAnim?.phase === 'lift' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div className="card-lift-up card-parchment" style={{ width: '220px', height: '330px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '3rem', color: 'var(--gold)', opacity: 0.1 }}>✦</span>
                </div>
              </div>
            )}

            {/* Phase 2: flip */}
            {drawAnim?.phase === 'flip' && (() => {
              // P16-2 (s87): use the actual selected card-back art on the back
              // face of the flip (was a parchment + sparkle placeholder). Mirrors
              // DrawPile's imageBackStyle so the flipped card visibly matches
              // the pile it came from.
              const back = getCardBackBySlug(getCardBackSlug())
              return (
              <div style={{ position: 'absolute', inset: 0, paddingTop: '70px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                <div className="flip-scene" style={{ width: '220px', height: '330px' }}>
                  <div className={`flip-inner${isFlipped ? ' is-flipped' : ''}`}>
                    {/* Card back — chosen card-back image */}
                    <div className="flip-face" style={{
                      backgroundImage: `url(/cardbacks/${back.file})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: '1px solid #3a3225',
                      borderRadius: '6px',
                      boxShadow: 'inset 0 0 22px 6px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(0,0,0,0.7)',
                    }} />
                    {/* Card front — no text overlay during flip */}
                    <div className="flip-face flip-front" style={{ overflow: 'hidden', position: 'relative' }}>
                      <DrawnCard card={drawAnim.card} textVisible={false} />
                    </div>
                  </div>
                </div>
              </div>
              )
            })()}

            {/* Phase 3: zoom — fills full screen (no padding) */}
            {drawAnim?.phase === 'zoom' && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
                <div className="card-zoom-fill" style={{ position: 'absolute', inset: 0 }}>
                  <DrawnCard card={drawAnim.card} textVisible={false} />
                </div>
              </div>
            )}
          </div>
```

New (single component call):
```tsx
          /* ── Draw pile view + lift → flip → zoom animation ── */
          <DrawPileView
            drawAnim={drawAnim}
            isFlipped={isFlipped}
            drawPileCount={drawPileCount}
            discardCount={discardCount}
            pendingReshuffleAddCount={pendingReshuffleAddCount}
            insertAnim={insertAnim}
            reshuffleAnim={reshuffleAnim}
            weekBannerVisible={weekBannerVisible}
            reshuffleCount={reshuffleCount}
            unravellingTier={unravellingTier}
            isTutorial={isTutorial}
            prepNudge={prepNudge}
            insertedUnravellingName={insertedUnravellingName}
            onDraw={handleDraw}
            onReshuffle={handleReshuffle}
            onPreviewCard={setPreviewCardId}
          />
```

- [ ] **Step 3: Clean up now-unused imports in `GameScreen.tsx`**

Remove any imports that are now only used inside `DrawPileView` and nowhere else in `GameScreen.tsx`. Check each:

- `WeekBanner` — only used in draw-pile branch → **remove from `GameScreen.tsx`**
- `ActivityLog` — only used in draw-pile branch → **remove from `GameScreen.tsx`**
- `getCardBackSlug` — only used in flip phase → **remove from `GameScreen.tsx`**
- `getCardBackBySlug` — only used in flip phase → **remove from `GameScreen.tsx`**
- `DrawPile` — only used in draw-pile branch → **remove from `GameScreen.tsx`**

`DrawnCard` is still used in the card-view branch → **keep**.

- [ ] **Step 4: Typecheck**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npm run typecheck
```

Expected: no errors. If errors appear, fix them before proceeding.

- [ ] **Step 5: Run tests**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npm test
```

Expected: 151/151 pass.

- [ ] **Step 6: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/GameScreen.tsx src/components/game/DrawPileView.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "refactor: extract DrawPileView from GameScreen (pile branch + anim phases)"
```

---

### Task 2: Extract GameOverlays

**Files:**
- Create: `src/components/game/GameOverlays.tsx`
- Modify: `src/components/GameScreen.tsx`

**What moves:** The four overlay elements at the bottom of `GameScreen`'s return (TutorialSplash, standalone RelicPicker, PendingGameOver modal, CardPreviewModal) move verbatim into `GameOverlays`. `GameScreen` replaces those ~30 lines with a single `<GameOverlays ...props />` call.

**Interfaces:**

```typescript
interface GameOverlaysProps {
  showTutorialSplash: boolean
  onBegin: () => void
  relicPickerOpen: boolean
  onRelicPick: (resource: ResourceKey, delta: 2 | -2) => void
  onRelicPickerClose: () => void
  pendingGameOver: { reason: string } | null
  acceptDefeat: () => void
  resources: { relics: number }
  onSpendRelic: (resource: ResourceKey, delta: 2 | -2) => void
  previewCard: Card | null
  showOptions: boolean
  onClosePreview: () => void
}
```

- [ ] **Step 1: Create `src/components/game/GameOverlays.tsx`**

```typescript
import type { Card }        from '../../types/index'
import type { ResourceKey } from '../../types'
import { RelicPicker }      from './ResourceBar'
import { TutorialSplash }   from './TutorialSplash'
import { CardPreviewModal } from './CardPreviewModal'

interface GameOverlaysProps {
  showTutorialSplash: boolean
  onBegin: () => void
  relicPickerOpen: boolean
  onRelicPick: (resource: ResourceKey, delta: 2 | -2) => void
  onRelicPickerClose: () => void
  pendingGameOver: { reason: string } | null
  acceptDefeat: () => void
  resources: { relics: number }
  onSpendRelic: (resource: ResourceKey, delta: 2 | -2) => void
  previewCard: Card | null
  showOptions: boolean
  onClosePreview: () => void
}

export function GameOverlays({
  showTutorialSplash, onBegin,
  relicPickerOpen, onRelicPick, onRelicPickerClose,
  pendingGameOver, acceptDefeat, resources, onSpendRelic,
  previewCard, showOptions, onClosePreview,
}: GameOverlaysProps) {
  return (
    <>
      {showTutorialSplash && (
        <TutorialSplash onBegin={onBegin} />
      )}
      {relicPickerOpen && <RelicPicker onPick={onRelicPick} onClose={onRelicPickerClose} />}
      {pendingGameOver && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,8,5,0.97)', border: '1px solid rgba(180,60,60,0.45)', padding: '1.2rem 1.1rem 1rem', minWidth: '240px', boxShadow: '0 0 32px rgba(180,60,60,0.18)' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(200,120,120,0.9)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '0.5rem', textAlign: 'center' }}>
              {pendingGameOver.reason}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(212,160,16,0.7)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.9rem', textAlign: 'center' }}>
              {resources.relics === 1 ? '1 relic remaining' : `${resources.relics} relics remaining`}
            </div>
            <RelicPicker onPick={onSpendRelic} embedded />
            <div style={{ margin: '0.75rem 0 0.25rem', borderTop: '1px solid rgba(180,60,60,0.2)', paddingTop: '0.75rem', textAlign: 'center' }}>
              <button onClick={acceptDefeat} style={{ background: 'transparent', border: '1px solid rgba(180,60,60,0.35)', color: 'rgba(200,100,100,0.8)', fontSize: '0.78rem', padding: '0.4rem 1.2rem', cursor: 'pointer', fontFamily: 'var(--ui-font)', letterSpacing: '0.06em' }}>
                Accept defeat
              </button>
            </div>
          </div>
        </div>
      )}
      {previewCard && <CardPreviewModal card={previewCard} onClose={onClosePreview} showOptions={showOptions} />}
    </>
  )
}
```

- [ ] **Step 2: Replace the overlay block in `GameScreen.tsx`**

Add `GameOverlays` to imports in `GameScreen.tsx`:

Old:
```typescript
import { TutorialSplash }        from './game/TutorialSplash'
```
New:
```typescript
import { TutorialSplash }        from './game/TutorialSplash'
import { GameOverlays }          from './game/GameOverlays'
```

Find this block at the bottom of the `GameScreen` return (after the `</div>` that closes the main flex container):

Old:
```tsx
      {relicPickerOpen && <RelicPicker onPick={handleRelicPick} onClose={() => setRelicPickerOpen(false)} />}
      {pendingGameOver && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,8,5,0.97)', border: '1px solid rgba(180,60,60,0.45)', padding: '1.2rem 1.1rem 1rem', minWidth: '240px', boxShadow: '0 0 32px rgba(180,60,60,0.18)' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(200,120,120,0.9)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '0.5rem', textAlign: 'center' }}>
              {pendingGameOver.reason}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(212,160,16,0.7)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.9rem', textAlign: 'center' }}>
              {resources.relics === 1 ? '1 relic remaining' : `${resources.relics} relics remaining`}
            </div>
            <RelicPicker onPick={(r, d) => spendRelic(r, d)} embedded />
            <div style={{ margin: '0.75rem 0 0.25rem', borderTop: '1px solid rgba(180,60,60,0.2)', paddingTop: '0.75rem', textAlign: 'center' }}>
              <button onClick={acceptDefeat} style={{ background: 'transparent', border: '1px solid rgba(180,60,60,0.35)', color: 'rgba(200,100,100,0.8)', fontSize: '0.78rem', padding: '0.4rem 1.2rem', cursor: 'pointer', fontFamily: 'var(--ui-font)', letterSpacing: '0.06em' }}>
                Accept defeat
              </button>
            </div>
          </div>
        </div>
      )}
      {previewCard && <CardPreviewModal card={previewCard} onClose={() => setPreviewCardId(null)} showOptions={previewState?.showOptions ?? false} />}
```

Also find and remove the `TutorialSplash` block that's inside the main `<div>`:
```tsx
        {/* Tutorial goal splash — shown once at start of tutorial runs */}
        {showTutorialSplash && (
          <TutorialSplash onBegin={() => setShowTutorialSplash(false)} />
        )}
```

Replace both occurrences with a single `<GameOverlays />` call placed after the closing `</div>` of the main flex container (same position as the old relic picker):

```tsx
      <GameOverlays
        showTutorialSplash={showTutorialSplash}
        onBegin={() => setShowTutorialSplash(false)}
        relicPickerOpen={relicPickerOpen}
        onRelicPick={handleRelicPick}
        onRelicPickerClose={() => setRelicPickerOpen(false)}
        pendingGameOver={pendingGameOver}
        acceptDefeat={acceptDefeat}
        resources={resources}
        onSpendRelic={spendRelic}
        previewCard={previewCard}
        showOptions={previewState?.showOptions ?? false}
        onClosePreview={() => setPreviewCardId(null)}
      />
```

- [ ] **Step 3: Clean up now-unused imports in `GameScreen.tsx`**

Check each import that moved:
- `TutorialSplash` — only used in GameOverlays now → **remove from `GameScreen.tsx`**
- `CardPreviewModal` — only used in GameOverlays now → **remove from `GameScreen.tsx`**
- `RelicPicker` — only used in GameOverlays now → **remove from `GameScreen.tsx`** (it was imported via `{ ResourceBar, RelicPicker }`)

Note: `ResourceBar` is still used — keep the `ResourceBar` import. Change the import from:
```typescript
import { ResourceBar, RelicPicker } from './game/ResourceBar'
```
to:
```typescript
import { ResourceBar } from './game/ResourceBar'
```

Also check whether `relicPickerOpen` is still used in `GameScreen.tsx` — it is, because the ResourceBar wrapper `div` uses `relicPickerOpen` for its `position` style. Keep that state.

- [ ] **Step 4: Typecheck**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npm test
```

Expected: 151/151 pass.

- [ ] **Step 6: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/GameScreen.tsx src/components/game/GameOverlays.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "refactor: extract GameOverlays from GameScreen (tutorial, relic, game-over, preview)"
```

---

## Self-Review

**Spec coverage:**
- ✅ DrawPileView extracted (draw pile branch + all 3 animation phases)
- ✅ GameOverlays extracted (TutorialSplash, RelicPicker, PendingGameOver, CardPreviewModal)
- ✅ GameScreen reduced (from 487 → ~370 LOC; all future feature work deferred to sub-components)
- ✅ No logic changes — pure JSX extraction
- ✅ All imports audited and cleaned up

**Placeholder scan:** None found. All code blocks are complete and exact.

**Type consistency:**
- `DrawPileViewProps.drawAnim.card: Card` matches `drawAnim` state in GameScreen (`{ phase: …; card: Card }`)
- `GameOverlaysProps.onRelicPick` matches `handleRelicPick: (resource: ResourceKey, delta: 2 | -2) => void`
- `GameOverlaysProps.pendingGameOver: { reason: string } | null` matches store type confirmed at line 760 of gameStore.ts
- `previewCard` is `Card | null` derived from `getCardById(previewCardId)` — confirmed matches `CardPreviewModal`'s `card` prop
