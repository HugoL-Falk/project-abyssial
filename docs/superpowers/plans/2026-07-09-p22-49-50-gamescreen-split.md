# P22-49/50 Card Review + GameScreen CardView Split

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close two card-mechanics investigations (P22-49, P22-50) and extract `CardView` from `GameScreen.tsx` to bring it under the 300-line cap.

**Architecture:** Task 1–2 are read/decide — no code edits. Task 3 is a JSX+state extraction: the card-view render branch (~110 lines) plus all card-interaction state (`cardAnim`, `removalState`, `browseCards`, `optionsOpen`, `textReveal`) moves verbatim into a new `CardView.tsx`; `GameScreen.tsx` shrinks from ~381 → ~185 lines. `CardView` subscribes to the store directly — no prop drilling for store state.

**Tech Stack:** React 18, TypeScript 5, Vite, Vitest, Zustand

## Global Constraints

- No logic changes in Task 3 — pure extraction. Copy code exactly; fix types only.
- No DOM/RTL test harness. Tests are Vitest node-only in `src/`. Do not add component tests.
- 242/242 Vitest tests must pass and `npm run typecheck` must be clean after every task that touches code.
- Never rewrite whole files. Max 3 context lines above/below any edit hunk.
- New files: `src/components/game/`.
- Git repo at `C:/Project Abyssial/Code/project-abyssial`. Always use `git -C "C:/Project Abyssial/Code/project-abyssial"` for git commands.
- Branch `claude/build-abyssial-game-*` is trunk. No merge needed.

---

## File Map

| File | Action | Responsibility after plan |
|---|---|---|
| `src/data/cards/threats.ts` | Read-only (Task 1) | `grove_awaits` stays `tier: 'threat'` — no change |
| `src/data/cards/treats.ts` | Read-only or Modify (Task 2) | `a_useful_contact` — add influence option if decided yes |
| `src/components/GameScreen.tsx` | Modify (Task 3) | Store subscriptions for draw phase + overlays, draw animation state, previewState, relicPickerOpen, top-level routing JSX |
| `src/components/game/CardView.tsx` | **Create** (Task 3) | Card-view render branch: DrawnCard, removal carousel, browse carousel, PatientForest/DeepTrade buttons, OptionsColumn |

---

### Task 1: P22-49 — Resolve grove_awaits classification

**Files:**
- Read: `src/data/cards/threats.ts` (line 1087–1111)

**Interfaces:** None — decision task only.

- [ ] **Step 1: Read the card**

Read `src/data/cards/threats.ts` lines 1087–1111. The card is:

```
id: 'grove_awaits'  tier: 'threat'
opt1: −1 followers, +1 dread  (condition: followers ≥ 2)
opt2: +3 dread, +1 influence, insert changed_follower (random pos 4–8)
```

- [ ] **Step 2: Evaluate the classification**

Apply these criteria:

| Criterion | Verdict |
|---|---|
| Does every option cost dread? | Yes — opt1 +1, opt2 +3 |
| Is either option net-positive without a major drawback? | No — opt2 +1 influence but +3 dread + threat insert |
| Is the card's primary player experience "opportunity" or "pressure"? | Pressure: "you've been finding reasons not to go" |
| Would Shub players WANT this card in their deck? | Possibly (changed_follower is mutation fodder) — but that's a side path benefit, not the card's primary function |

Expected conclusion: **WONT_DO — grove_awaits is correctly classified as a threat.** The changed_follower insert is a mutation-route by-product embedded in threat framing, not a reason to reclassify. Both options levy meaningful dread costs.

- [ ] **Step 3: Close P22-49 in backlog**

In `knowledge/backlog.md`, change the P22-49 entry from:

```
- [ ] **P22-49.** "The grove awaits" classification: is it a threat or treat? It grants benefits. Design review needed. Agent: Card Mechanics. 🧠
```

to:

```
- [x] **P22-49. ✅ WONT_DO** grove_awaits stays `tier: 'threat'`. Both options levy dread costs; changed_follower insert is a Shub mutation by-product within threat framing, not a benefit that warrants reclassification.
```

- [ ] **Step 4: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add knowledge/backlog.md
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "chore: close P22-49 WONT_DO — grove_awaits correctly classified as threat"
```

---

### Task 2: P22-50 — Resolve a_useful_contact influence option

**Files:**
- Read: `src/data/cards/treats.ts` lines 37–71
- Maybe modify: `src/data/cards/treats.ts`

**Interfaces:** None unless influence option is added.

- [ ] **Step 1: Read the current card**

Read `src/data/cards/treats.ts` lines 37–71. Current state:

```
id: 'a_useful_contact'  tier: 'treat'
opt1: +2 followers, removeCard self
opt2: +2 gold, removeCard self
opt3: −1 dread, remove investigators_file, removeCard self
      (condition: hasCard investigators_file; hideWhenUnavailable: true)
```

- [ ] **Step 2: Check git history for the missing option**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" log --all --oneline -- src/data/cards/treats.ts | head -20
```

Then look at the oldest relevant commit that changed `a_useful_contact`:

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" log --all --oneline --follow -p -- src/data/cards/treats.ts | grep -A 30 -B 5 "useful_contact" | grep -A 15 "influence" | head -40
```

Expected: either find a removed `influence` option or confirm it never existed.

- [ ] **Step 3: Make the design decision**

Present the two cases to the user:

**Case A — influence option never existed / was removed intentionally:**
- Current 3-option design is clean (followers, gold, conditional dread-clear). No gap.
- Close P22-50 as WONT_DO.

**Case B — influence option was accidentally dropped:**
- Add a 4th option: "Pull strings" → +2 influence, removeCard self. This fills the resource-axis gap (treat covers followers, gold, now influence) and matches the card's "he knows people" flavour.
- Implementation: add between opt2 and opt3 in `treats.ts`.

**Add the option only if Case B is confirmed by git history OR the user explicitly decides yes.**

- [ ] **Step 4 (conditional — only if adding influence option): Edit treats.ts**

In `src/data/cards/treats.ts`, after the opt2 closing brace (line ~57), add:

```typescript
      {
        label: 'Ask for an introduction',
        flavourText: 'A letter, a name, a word in the right ear. The door opens a little wider.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'removeCard', cardId: 'a_useful_contact' },
        ],
      },
```

- [ ] **Step 5: Run typecheck (only if code changed)**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Run tests (only if code changed)**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npm test
```

Expected: 242/242 pass.

- [ ] **Step 7: Close P22-50 in backlog**

In `knowledge/backlog.md`, update the P22-50 entry. If WONT_DO:

```
- [x] **P22-50. ✅ WONT_DO** a_useful_contact: no influence option was accidentally removed (confirmed via git). Current 3-option design intentional.
```

If influence option was added:

```
- [x] **P22-50. ✅ DONE** a_useful_contact: added opt3 "Ask for an introduction" (+2 influence, remove self). Fills followers/gold/influence axis. Conditional bury-file option becomes opt4.
```

- [ ] **Step 8: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/treats.ts knowledge/backlog.md
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "chore: close P22-50 — a_useful_contact influence option resolved"
```

(Omit `treats.ts` from the add if no code change.)

---

### Task 3: Extract CardView from GameScreen

**Files:**
- Create: `src/components/game/CardView.tsx`
- Modify: `src/components/GameScreen.tsx`
- Test: no new test file (no DOM harness)

**Interfaces:**

```typescript
// CardView props — minimal; CardView subscribes to the store for everything else
interface CardViewProps {
  onPreviewCard: (id: string | null, opts?: { showOptions?: boolean }) => void
  onOpenRelicPicker: () => void
}
```

**What moves from GameScreen → CardView:**

State: `cardAnim`, `removalState`, `browseCards`, `optionsOpen`, `textReveal`  
Effects: mount auto-open effect  
Functions: `doSweep`, `handleResolve`  
Store subscriptions: `currentCard`, `resolveOption`, `getVisibleOpts`, `deck`, `blessings`, `resources`, `deepTradeUsed`, `activateDeepTrade`, `patientForestUses`, `pushCard`, `runConfig`, `succumb`, `spendRelic`  
Derived: `visibleOpts`, `nonHiddenOpts`, `hiddenPrepReqs`, `recoverable`, `gatedOpts`, `allBlocked`, `SUCCUMB_FLAVOUR`, `succumbFlavour`, `hasDeepTrade`, `hasPatientForest`, `showPatientForest`  
JSX: the entire `{/* ── Card view with overlay options ── */}` branch (currently lines 242–353 of GameScreen)

**What stays in GameScreen:**

Store subscriptions: `currentCard` (for `showingDrawPile`), `drawNextCard`, `reshuffleOnly`, `deck` (pile counts), `reshuffleCount`, `runConfig` (for DrawPileView), `unravellingTier`, `pendingGameOver`, `acceptDefeat`, `resources` (for ResourceBar + GameOverlays), `spendRelic`  
State: `drawAnim`, `isFlipped`, `insertAnim`, `reshuffleAnim`, `weekBannerVisible`, `previewState`, `relicPickerOpen`, `showTutorialSplash`  
Effects: wake lock, all three pile/reshuffle/weekBanner effects  
Functions: `handleDraw`, `handleReshuffle`, `handleOpenRelicPicker`, `handleRelicPick`, `setPreviewCardId`  
JSX: outer wrapper, DrawPileView branch, `<CardView>` call, ResourceBar, GameOverlays

- [ ] **Step 1: Create `src/components/game/CardView.tsx`**

Create the file with the following content. This is verbatim code lifted from current `GameScreen.tsx` — do not invent any logic:

```typescript
import { useEffect, useState } from 'react'
import { useGameStore }       from '../../state'
import { getCardById }        from '../../data'
import { getActualRemovalTargets } from '../../engine/deck'
import type { Card, Effect }  from '../../types/index'
import type { VisibleOpt }    from './OptionsColumn'
import type { ResourceKey }   from '../../types'
import { DrawnCard }          from './DrawnCard'
import { OptionsColumn }      from './OptionsColumn'
import { CardCarouselOverlay } from './CardCarouselOverlay'

interface CardViewProps {
  onPreviewCard: (id: string | null, opts?: { showOptions?: boolean }) => void
  onOpenRelicPicker: () => void
}

export function CardView({ onPreviewCard, onOpenRelicPicker }: CardViewProps) {
  const currentCard       = useGameStore(s => s.currentCard)
  const resolveOption     = useGameStore(s => s.resolveOption)
  const getVisibleOpts    = useGameStore(s => s.getVisibleOptions)
  const deck              = useGameStore(s => s.deck)
  const blessings         = useGameStore(s => s.blessings)
  const resources         = useGameStore(s => s.resources)
  const deepTradeUsed     = useGameStore(s => s.deepTradeUsed)
  const activateDeepTrade = useGameStore(s => s.activateDeepTrade)
  const patientForestUses = useGameStore(s => s.patientForestUsesRemaining)
  const pushCard          = useGameStore(s => s.pushCard)
  const runConfig         = useGameStore(s => s.runConfig)
  const succumb           = useGameStore(s => s.succumb)
  const spendRelic        = useGameStore(s => s.spendRelic)

  const hasDeepTrade     = blessings.selected.includes('the_deep_trade')
  const hasPatientForest = blessings.selected.includes('the_patient_forest')

  const visibleOpts   = currentCard ? getVisibleOpts(currentCard) : []
  const nonHiddenOpts = visibleOpts.filter(o => !o.hidden)
  const hiddenPrepReqs = visibleOpts
    .filter(o => o.hidden && o.prepRequirement != null)
    .map(o => o.prepRequirement!)
  const recoverable   = nonHiddenOpts.some(o => !o.option.succumbOption && o.available)
  const gatedOpts     = recoverable ? nonHiddenOpts.filter(o => !o.option.succumbOption) : nonHiddenOpts
  const allBlocked    = currentCard !== null && (gatedOpts.length === 0 || gatedOpts.every(o => !o.available))

  const SUCCUMB_FLAVOUR: Partial<Record<string, string>> = {
    yha_nthlei: 'The tide comes in. You let it.',
    nyarlathotep: 'You understand, finally. You agree.',
    shub_niggurath: 'The roots have already found you.',
  }
  const succumbFlavour = runConfig ? (SUCCUMB_FLAVOUR[runConfig.godPath] ?? 'The dark takes you.') : 'The dark takes you.'
  const showPatientForest = hasPatientForest && patientForestUses > 0

  // ── Option-pick / insert animations ──────────────────────────────────────
  const [cardAnim,      setCardAnim]      = useState<{ phase: 'sweep' } | null>(null)
  const [removalState,  setRemovalState]  = useState<{ cards: Card[]; optionIdx: number } | null>(null)
  const [browseCards,   setBrowseCards]   = useState<{ cards: Card[]; tone: 'gold' | 'red' } | null>(null)
  const [optionsOpen,   setOptionsOpen]   = useState(false)
  const [textReveal,    setTextReveal]    = useState(false)

  // Auto-open options when mounting into a loaded run (currentCard already present on mount).
  useEffect(() => {
    if (currentCard) {
      const t = setTimeout(() => { setOptionsOpen(true); setTextReveal(true) }, 600)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — mount only

  function doSweep(idx: number) {
    setOptionsOpen(false)
    setTextReveal(false)
    setCardAnim({ phase: 'sweep' })
    setTimeout(() => { resolveOption(idx); setCardAnim(null) }, 360)
  }

  function handleResolve(idx: number) {
    if (cardAnim || removalState) return
    const opt = nonHiddenOpts.find(o => o.idx === idx)
    const configuredRemoveIds = (opt?.effectiveEffects ?? [])
      .filter((e): e is Extract<Effect, { type: 'removeCard' }> => e.type === 'removeCard')
      .map(e => e.cardId)
    const actualRemoveIds = getActualRemovalTargets(configuredRemoveIds, deck, currentCard?.id ?? null)
    const removeCards    = actualRemoveIds
      .map(id => getCardById(id))
      .filter((c): c is Card => c != null)
    if (removeCards.length > 1) {
      setRemovalState({ cards: removeCards, optionIdx: idx })
    } else {
      doSweep(idx)
    }
  }

  return (
    <>
      {/* Card art — sweep-out on option pick; tap to toggle options panel */}
      <div
        style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
        className={cardAnim?.phase === 'sweep' ? 'card-sweep-to-deck' : ''}
        onClick={() => setOptionsOpen(o => !o)}
      >
        <DrawnCard card={currentCard!} textVisible={textReveal} hiddenPrepReqs={hiddenPrepReqs} />
      </div>

      {/* Removal-card preview overlay */}
      {removalState && (
        <CardCarouselOverlay
          cards={removalState.cards}
          tone="red"
          onClose={() => setRemovalState(null)}
          onAction={() => {
            const idx = removalState!.optionIdx
            setRemovalState(null)
            doSweep(idx)
          }}
          actionLabel={removalState.cards.length > 1 ? `Purge ${removalState.cards.length} cards` : 'Purge card'}
          renderLabel={(n, i) => n > 1 ? `Removing ${n} cards — ${i + 1} of ${n}` : 'Removing from deck'}
        />
      )}

      {/* Grouped insert-return / live-threat browse carousel (P20-I) */}
      {browseCards && (
        <CardCarouselOverlay
          cards={browseCards.cards}
          tone={browseCards.tone}
          onClose={() => setBrowseCards(null)}
          renderLabel={(n, i) => browseCards.tone === 'gold'
            ? (n > 1 ? `Returning ${n} cards — ${i + 1} of ${n}` : 'Returning to the deck')
            : (n > 1 ? `${n} threats in the deck — ${i + 1} of ${n}` : 'Threat in the deck')}
        />
      )}

      {/* Patient forest floating button */}
      {showPatientForest && (
        <button onClick={pushCard} style={{
          position: 'absolute', top: '4.5rem', right: '0.65rem', zIndex: 15,
          background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(80,180,80,0.45)',
          color: 'rgba(120,210,120,0.85)', fontSize: '0.56rem', letterSpacing: '0.08em',
          padding: '0.2rem 0.45rem', cursor: 'pointer', borderRadius: '2px',
        }}>
          PUSH ×{patientForestUses}
        </button>
      )}

      {/* Deep trade floating button */}
      {hasDeepTrade && !deepTradeUsed && (
        <button onClick={activateDeepTrade} disabled={resources.relics < 2} style={{
          position: 'absolute',
          top: showPatientForest ? '7.5rem' : '4.5rem',
          right: '0.65rem', zIndex: 15,
          background: 'rgba(0,0,0,0.75)',
          border: `1px solid rgba(80,160,200,${resources.relics >= 2 ? '0.6' : '0.2'})`,
          color: `rgba(120,200,230,${resources.relics >= 2 ? '0.85' : '0.3'})`,
          fontSize: '0.58rem', letterSpacing: '0.07em', padding: '0.28rem 0.55rem',
          cursor: resources.relics >= 2 ? 'pointer' : 'not-allowed', borderRadius: '2px',
        }}>
          TRADE
        </button>
      )}

      {/* P22-19: removed floating AcquiredPrepTags band — prep tag is now shown
          as a light-blue pill in the activity log (P22-8). */}

      {/* Options panel — bare arrow peeks at bottom when closed */}
      {!removalState && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
          transform: optionsOpen ? 'translateY(0)' : 'translateY(calc(100% - 1.4rem))',
          transition: 'transform 0.3s ease-out',
        }}>
          {/* Arrow toggle — no background, just the icon */}
          <div
            role="button"
            onClick={() => setOptionsOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
          >
            <span style={{
              color: 'rgba(200,185,155,0.8)', fontSize: '1.2rem', lineHeight: 1,
              textShadow: '0 1px 8px rgba(0,0,0,1)',
            }}>
              {optionsOpen ? '▾' : '▴'}
            </span>
          </div>
          {/* Options scroll area */}
          <div style={{
            maxHeight: '58vh', overflowY: 'auto',
            background: 'linear-gradient(to top, rgba(4,2,1,0.95) 0%, rgba(4,2,1,0.80) 60%, transparent 100%)',
          }}>
            <OptionsColumn
              visibleOpts={gatedOpts as VisibleOpt[]}
              allBlocked={allBlocked}
              succumbFlavour={succumbFlavour}
              onResolve={handleResolve}
              onSuccumb={succumb}
              onSpendRelic={onOpenRelicPicker}
              relics={resources.relics}
              onPreviewCard={onPreviewCard}
              onPreviewCards={(cards, tone) => setBrowseCards({ cards, tone })}
              currentCard={currentCard}
              isTutorial={runConfig?.isTutorial === true}
            />
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Replace card-view branch in GameScreen.tsx with `<CardView>`**

First add `CardView` to the imports in `GameScreen.tsx`. Find:

```typescript
import { DrawPileView }          from './game/DrawPileView'
```

Replace with:

```typescript
import { DrawPileView }          from './game/DrawPileView'
import { CardView }              from './game/CardView'
```

- [ ] **Step 3: Remove store subscriptions now owned by CardView**

In `GameScreen.tsx`, remove these lines (they will live in CardView instead):

```typescript
  const resolveOption     = useGameStore(s => s.resolveOption)
  const getVisibleOpts    = useGameStore(s => s.getVisibleOptions)
  const blessings         = useGameStore(s => s.blessings)
  const deepTradeUsed     = useGameStore(s => s.deepTradeUsed)
  const activateDeepTrade = useGameStore(s => s.activateDeepTrade)
  const patientForestUses = useGameStore(s => s.patientForestUsesRemaining)
  const pushCard          = useGameStore(s => s.pushCard)
  const succumb           = useGameStore(s => s.succumb)
```

Also remove the derived constants that only existed for the card-view branch:

```typescript
  const hasDeepTrade     = blessings.selected.includes('the_deep_trade')
  const hasPatientForest = blessings.selected.includes('the_patient_forest')
```

And remove:

```typescript
  const visibleOpts   = currentCard ? getVisibleOpts(currentCard) : []
  const nonHiddenOpts = visibleOpts.filter(o => !o.hidden)
  const hiddenPrepReqs = visibleOpts
    .filter(o => o.hidden && o.prepRequirement != null)
    .map(o => o.prepRequirement!)
  // P14-19: succumbOption rows only surface when no non-succumb option is available.
  const recoverable   = nonHiddenOpts.some(o => !o.option.succumbOption && o.available)
  const gatedOpts     = recoverable ? nonHiddenOpts.filter(o => !o.option.succumbOption) : nonHiddenOpts
  const allBlocked    = currentCard !== null && (gatedOpts.length === 0 || gatedOpts.every(o => !o.available))

  const SUCCUMB_FLAVOUR: Partial<Record<string, string>> = {
    yha_nthlei: 'The tide comes in. You let it.',
    nyarlathotep: 'You understand, finally. You agree.',
    shub_niggurath: 'The roots have already found you.',
  }
  const succumbFlavour = runConfig ? (SUCCUMB_FLAVOUR[runConfig.godPath] ?? 'The dark takes you.') : 'The dark takes you.'
```

And remove card-interaction state and effects that move to CardView:

```typescript
  // ── Option-pick / insert animations ──────────────────────────────────────
  const [cardAnim,      setCardAnim]      = useState<{ phase: 'sweep' } | null>(null)
  const [removalState,  setRemovalState]  = useState<{ cards: Card[]; optionIdx: number } | null>(null)
  // P20-I: browse-only carousel — grouped insert-card returns (gold) + live
  // threat lists off the −⚠ chip (red). No action button, just navigation.
  const [browseCards,   setBrowseCards]   = useState<{ cards: Card[]; tone: 'gold' | 'red' } | null>(null)
  const [optionsOpen,   setOptionsOpen]   = useState(false)
  const [textReveal,    setTextReveal]    = useState(false)

  // Auto-open options when mounting into a loaded run (currentCard already present on mount).
  // Fresh draws are handled by handleDraw's setTimeout — this only fires once on mount.
  useEffect(() => {
    if (currentCard) {
      const t = setTimeout(() => { setOptionsOpen(true); setTextReveal(true) }, 600)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — mount only

  function doSweep(idx: number) {
    setOptionsOpen(false)
    setTextReveal(false)
    setCardAnim({ phase: 'sweep' })
    setTimeout(() => { resolveOption(idx); setCardAnim(null) }, 360)
  }

  function handleResolve(idx: number) {
    if (cardAnim || removalState) return
    const opt = nonHiddenOpts.find(o => o.idx === idx)
    const configuredRemoveIds = (opt?.effectiveEffects ?? [])
      .filter((e): e is Extract<Effect, { type: 'removeCard' }> => e.type === 'removeCard')
      .map(e => e.cardId)
    const actualRemoveIds = getActualRemovalTargets(configuredRemoveIds, deck, currentCard?.id ?? null)
    const removeCards    = actualRemoveIds
      .map(id => getCardById(id))
      .filter((c): c is Card => c != null)
    if (removeCards.length > 1) {
      setRemovalState({ cards: removeCards, optionIdx: idx })
    } else {
      doSweep(idx)
    }
  }
```

And remove this derived display line (no longer needed in GameScreen):

```typescript
  const showingDrawPile   = !currentCard || drawAnim !== null
  const showPatientForest = hasPatientForest && patientForestUses > 0
  const previewCard       = previewCardId ? (getCardById(previewCardId) ?? null) : null
```

Replace with just:

```typescript
  const showingDrawPile   = !currentCard || drawAnim !== null
  const previewCard       = previewCardId ? (getCardById(previewCardId) ?? null) : null
```

- [ ] **Step 4: Replace the card-view JSX branch with `<CardView>`**

In the `GameScreen` return, find the card-view branch. Currently it starts after the `DrawPileView` block:

```tsx
        ) : (
          /* ── Card view with overlay options ── */
          <>
            {/* Card art — sweep-out on option pick; tap to toggle options panel */}
            <div
              style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
```

And ends before the ResourceBar section:

```tsx
          </>
        )}
```

Replace everything between `) : (` and `)}` with:

```tsx
        ) : (
          /* ── Card view with overlay options ── */
          <CardView
            onPreviewCard={setPreviewCardId}
            onOpenRelicPicker={handleOpenRelicPicker}
          />
        )}
```

- [ ] **Step 5: Remove now-unused imports from GameScreen.tsx**

Check each import. Remove any that are no longer referenced in the file after the extraction:

- `getActualRemovalTargets` from `'../engine/deck'` — only used in handleResolve → **remove**
- `type { Effect }` from `'../types/index'` — only used in handleResolve → **remove** (keep `Card` only if still used, otherwise remove both)
- `{ CardCarouselOverlay }` — only used in card-view branch → **remove**
- `{ OptionsColumn }` — only used in card-view branch → **remove**
- `type { VisibleOpt }` — only used in card-view branch → **remove**
- `{ DrawnCard }` — only used in card-view branch → **remove**

Check `Card` type: it's still used in the `drawAnim` state type (`{ phase: …; card: Card }`) — **keep**.  
Check `Effect` type: only referenced in `handleResolve` which moved → **remove**.

- [ ] **Step 6: Typecheck**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npm run typecheck
```

Expected: no errors. Common issues to fix:
- `currentCard!` in CardView — `DrawnCard` receives a non-null card, but `currentCard` is `Card | null`. The exclamation mark is intentional (component only renders when currentCard is truthy — verified by GameScreen's branch condition). Keep it.
- Any missing imports in `CardView.tsx` — check against the import list at the top of the file in Step 1.

- [ ] **Step 7: Run tests**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npm test
```

Expected: 242/242 pass.

- [ ] **Step 8: Verify line counts**

```bash
wc -l "C:/Project Abyssial/Code/project-abyssial/src/components/GameScreen.tsx" "C:/Project Abyssial/Code/project-abyssial/src/components/game/CardView.tsx"
```

Expected: GameScreen < 200 lines, CardView < 230 lines. Both under 300-line cap.

- [ ] **Step 9: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/GameScreen.tsx src/components/game/CardView.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "refactor: extract CardView from GameScreen — card interaction state + JSX branch"
```

---

## Self-Review

**Spec coverage:**
- ✅ P22-49: grove_awaits classification reviewed and closed (WONT_DO — correct as threat)
- ✅ P22-50: a_useful_contact influence option investigated; git history check drives decision; implementation conditional
- ✅ GameScreen CardView extraction: card-view branch + all card-interaction state moves to CardView
- ✅ GameScreen shrinks from 381 → ~185 lines (under 300-line cap)
- ✅ CardView < 230 lines (under 300-line cap)
- ✅ No logic changes — pure extraction in Task 3

**Placeholder scan:** None. All code blocks in Task 3 are exact copies from the current GameScreen.tsx.

**Type consistency:**
- `CardViewProps.onPreviewCard` signature `(id: string | null, opts?: { showOptions?: boolean }) => void` matches `setPreviewCardId` in GameScreen exactly (lines 100–103 of current file)
- `CardViewProps.onOpenRelicPicker` matches `handleOpenRelicPicker` signature (no args, no return)
- `VisibleOpt` is imported from `'./OptionsColumn'` in CardView — same source as GameScreen currently uses
- `gatedOpts as VisibleOpt[]` cast preserved verbatim from GameScreen
- Store selector names (`s.patientForestUsesRemaining`, `s.deepTradeUsed`, etc.) are lifted verbatim from GameScreen — no renames
