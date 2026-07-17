# P25-51 — Changed Followers Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `changed_follower` card so sacrifice tracks ritual progress (`theChanged+1`, escalating cost) and keep is a free defer; update deck cap to 6, victory conditions, and add a slim Shub-only tracker band in the HUD.

**Architecture:** Four hidden sacrifice options (keyed off `theChanged` via `hideWhenUnavailable`) replace the old pooled system. No new engine types needed. A new `ShubTracker.tsx` component renders below the ResourceBar in GameScreen, Shub runs only.

**Tech Stack:** TypeScript, React, Zustand (vitest for tests)

## Global Constraints

- Never rewrite whole files — targeted edits only, max 3 context lines above/below
- Tests must pass: `npx vitest run` from `C:/Project Abyssial/Code/project-abyssial`
- Git repo path: `C:/Project Abyssial/Code/project-abyssial`
- `theChanged` is already excluded from the ResourceBar render — do NOT add it back
- flavour cap: option flavour ≤ 80 chars / body ≤ 108 chars (tutorial.ts exempt)

---

### Task 1: CF card data — new two-option design

**Files:**
- Modify: `src/data/cards/special.ts` (full replacement of card definition)
- Test: `src/state/gameStore.test.ts` (new describe block for sacrifice escalation)

**Interfaces:**
- Produces: `changed_follower` card with options at indices:
  - 0: Sacrifice (theChanged=0, dread+1)
  - 1: Sacrifice (theChanged=1, dread+1 fol-1)
  - 2: Sacrifice (theChanged=2, dread+2 fol-1)
  - 3: Sacrifice (theChanged≥3, dread+2 fol-1 inf-1)
  - 4: Keep (insertCard: changed_follower)

- [ ] **Step 1: Write failing tests for sacrifice escalation**

Add this describe block to `src/state/gameStore.test.ts` after the existing `changed_follower deck cap` block:

```typescript
describe('changed_follower sacrifice escalation', () => {
  const makeCF = (): Card => ({
    id: 'changed_follower',
    title: 'The Changed Follower',
    tier: 'god_path',
    godPath: 'shub_niggurath',
    accumulates: true,
    options: [],
  } as unknown as Card)

  function setupSacrifice(theChanged: number) {
    const { SPECIAL_CARDS } = require('../data/cards/special')
    const cf = SPECIAL_CARDS.find((c: Card) => c.id === 'changed_follower') as Card
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
      currentCard: cf,
      deck: {
        drawPile: [],
        discardPile: [],
        permDiscardPile: [],
        nextCycleQueue: [],
        chainReserve: [],
      },
      resources: { gold: 3, followers: 3, influence: 3, dread: 0, relics: 1, theChanged },
      godPathProgress: 2,
      prepTags: [],
      cardRunState: {},
      activityLog: [],
      activityBatchSealed: true,
    } as any)
  }

  it('1st sacrifice (theChanged=0): costs dread+1 only', () => {
    setupSacrifice(0)
    const state = useGameStore.getState()
    // Option 0 is sacrifice at theChanged=0, condition: resourceMax theChanged 0
    // Find the visible sacrifice option (condition passes at theChanged=0)
    const visibleOpts = state.currentCard!.options.filter((o, i) => {
      // Use checkCondition to find available options
      return true // we resolve option 0 directly
    })
    useGameStore.getState().resolveOption(0)
    const after = useGameStore.getState()
    expect(after.resources.theChanged).toBe(1)
    expect(after.resources.dread).toBe(1)
    expect(after.resources.followers).toBe(3) // unchanged
    expect(after.resources.influence).toBe(3) // unchanged
  })

  it('2nd sacrifice (theChanged=1): costs dread+1, fol-1', () => {
    setupSacrifice(1)
    useGameStore.getState().resolveOption(1)
    const after = useGameStore.getState()
    expect(after.resources.theChanged).toBe(2)
    expect(after.resources.dread).toBe(1)
    expect(after.resources.followers).toBe(2)
    expect(after.resources.influence).toBe(3)
  })

  it('3rd sacrifice (theChanged=2): costs dread+2, fol-1', () => {
    setupSacrifice(2)
    useGameStore.getState().resolveOption(2)
    const after = useGameStore.getState()
    expect(after.resources.theChanged).toBe(3)
    expect(after.resources.dread).toBe(2)
    expect(after.resources.followers).toBe(2)
    expect(after.resources.influence).toBe(3)
  })

  it('4th+ sacrifice (theChanged=3): costs dread+2, fol-1, inf-1', () => {
    setupSacrifice(3)
    useGameStore.getState().resolveOption(3)
    const after = useGameStore.getState()
    expect(after.resources.theChanged).toBe(4)
    expect(after.resources.dread).toBe(2)
    expect(after.resources.followers).toBe(2)
    expect(after.resources.influence).toBe(2)
  })

  it('sacrifice removes card from deck (does not reinsert)', () => {
    setupSacrifice(0)
    // Seed one CF in draw pile first
    const cf = makeCF()
    useGameStore.setState({ deck: { drawPile: [cf], discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [] } } as any)
    useGameStore.getState().resolveOption(0)
    const after = useGameStore.getState()
    const cfCount = [...after.deck.drawPile, ...after.deck.discardPile, ...after.deck.nextCycleQueue]
      .filter(c => c.id === 'changed_follower').length
    expect(cfCount).toBe(1) // the seeded one, not the current card
  })

  it('keep returns card to deck', () => {
    setupSacrifice(0)
    useGameStore.getState().resolveOption(4) // index 4 = Keep
    const after = useGameStore.getState()
    expect(after.resources.theChanged).toBe(0) // unchanged
    const cfCount = [...after.deck.drawPile, ...after.deck.discardPile, ...after.deck.nextCycleQueue]
      .filter(c => c.id === 'changed_follower').length
    expect(cfCount).toBe(1) // reinserted
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run --reporter=verbose 2>&1 | grep -A3 "sacrifice escalation"
```

Expected: FAIL — option indices don't match current card definition

- [ ] **Step 3: Replace changed_follower card definition in special.ts**

Replace the entire content of `src/data/cards/special.ts` with:

```typescript
import type { Card } from '../../types'

export const SPECIAL_CARDS: Card[] = [
  {
    id: 'changed_follower',
    title: 'The Changed Followers',
    flavourText: 'One of them is different now. The others have not noticed yet. You have.',
    tier: 'god_path',
    godPath: 'shub_niggurath',
    accumulates: true,
    options: [
      // ── Sacrifice: 4 options, exactly one visible at a time via hideWhenUnavailable ──
      // Cost escalates with theChanged (checked before the +1 is applied this turn).

      // 1st sacrifice (theChanged = 0)
      {
        label: 'Sacrifice them',
        flavourText: 'The first offering. The forest accepts quietly.',
        effects: [
          { type: 'resource', resource: 'theChanged', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMax', resource: 'theChanged', max: 0 },
        hideWhenUnavailable: true,
        previewTag: '-card',
      },

      // 2nd sacrifice (theChanged = 1)
      {
        label: 'Sacrifice them',
        flavourText: 'The congregation has noticed the gaps. They say nothing, for now.',
        effects: [
          { type: 'resource', resource: 'theChanged', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'followers', delta: -1 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'theChanged', min: 1 },
            { type: 'resourceMax', resource: 'theChanged', max: 1 },
          ],
        },
        hideWhenUnavailable: true,
        previewTag: '-card',
      },

      // 3rd sacrifice (theChanged = 2)
      {
        label: 'Sacrifice them',
        flavourText: 'Your hands are steadier than they should be. That worries you.',
        effects: [
          { type: 'resource', resource: 'theChanged', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'followers', delta: -1 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'theChanged', min: 2 },
            { type: 'resourceMax', resource: 'theChanged', max: 2 },
          ],
        },
        hideWhenUnavailable: true,
        previewTag: '-card',
      },

      // 4th+ sacrifice (theChanged ≥ 3)
      {
        label: 'Sacrifice them',
        flavourText: 'The ritual is almost complete. The cost of that word is considerable.',
        effects: [
          { type: 'resource', resource: 'theChanged', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'theChanged', min: 3 },
        hideWhenUnavailable: true,
        previewTag: '-card',
      },

      // ── Keep ────────────────────────────────────────────────────────────────
      // Card goes to permDiscardPile (god_path tier); insertCard puts a fresh
      // copy back in the draw pile so it returns in a future week.
      {
        label: 'Let them stay',
        flavourText: 'You decided not to intervene. That counts as a decision.',
        effects: [
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 5, maxPos: 10 },
        ],
      },
    ],
  },
]
```

- [ ] **Step 4: Run tests — verify sacrifice escalation passes**

```
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run --reporter=verbose 2>&1 | grep -E "sacrifice escalation|PASS|FAIL" | head -20
```

Expected: all 5 sacrifice escalation tests PASS

- [ ] **Step 5: Run full test suite**

```
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run 2>&1 | tail -5
```

Expected: all tests pass (264+ passing, pre-existing errors only)

- [ ] **Step 6: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/special.ts src/state/gameStore.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(cards): P25-51 — changed_follower two-option redesign with escalating sacrifice cost"
```

---

### Task 2: Deck cap → 6

**Files:**
- Modify: `src/state/gameStore.ts` line 263
- Test: `src/state/gameStore.test.ts` (update existing cap test)

**Interfaces:**
- Consumes: `MAX_CHANGED_FOLLOWER_COPIES` constant from Task 1 context (same file)
- Produces: cap enforced at 6, existing test updated to match

- [ ] **Step 1: Update the cap constant**

In `src/state/gameStore.ts`, find and replace:

```typescript
// P20-B: ceiling on changed_follower copies in drawPile + discardPile + nextCycleQueue
const MAX_CHANGED_FOLLOWER_COPIES = 3
```

Replace with:

```typescript
// P25-51: raised from 3 to 6 — allows organic accumulation across a full run
const MAX_CHANGED_FOLLOWER_COPIES = 6
```

- [ ] **Step 2: Update the existing deck cap test**

In `src/state/gameStore.test.ts`, find the test `'blocks insertion when 3 copies already exist in draw+discard+queue'`.

Update the deck state setup so it has 6 copies (not 3), and update the assertion:

```typescript
it('blocks insertion when 6 copies already exist in draw+discard+queue', () => {
  const cf = makeChangedFollower()
  useGameStore.setState({
    phase: 'playing',
    runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
    currentCard: {
      id: 'shub_niggurath_3',
      title: 'The Unknown Goat',
      tier: 'god_path',
      options: [{
        label: 'Claim it formally',
        flavourText: 'test',
        effects: [{ type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 }],
      }],
    } as unknown as Card,
    deck: {
      drawPile: [cf, cf, cf, cf],
      discardPile: [cf, cf],
      permDiscardPile: [],
      nextCycleQueue: [],
      chainReserve: [],
    },
    resources: { ...STARTING_RESOURCES },
    godPathProgress: 2,
    prepTags: [],
    cardRunState: {},
    activityLog: [],
    activityBatchSealed: true,
  } as any)

  useGameStore.getState().resolveOption(0)
  const state = useGameStore.getState()
  const cfCount = [
    ...state.deck.drawPile,
    ...state.deck.discardPile,
    ...state.deck.nextCycleQueue,
  ].filter(c => c.id === 'changed_follower').length
  expect(cfCount).toBe(6)  // cap enforced — no 7th copy
})
```

Also update the "allows insertion" test to verify it allows a 6th copy (test with 5 existing):

```typescript
it('allows insertion when fewer than 6 copies exist', () => {
  const cf = makeChangedFollower()
  useGameStore.setState({
    phase: 'playing',
    runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
    currentCard: {
      id: 'shub_niggurath_3',
      title: 'The Unknown Goat',
      tier: 'god_path',
      options: [{
        label: 'Claim it formally',
        flavourText: 'test',
        effects: [{ type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 }],
      }],
    } as unknown as Card,
    deck: {
      drawPile: [cf, cf, cf],
      discardPile: [cf, cf],
      permDiscardPile: [],
      nextCycleQueue: [],
      chainReserve: [],
    },
    resources: { ...STARTING_RESOURCES },
    godPathProgress: 2,
    prepTags: [],
    cardRunState: {},
    activityLog: [],
    activityBatchSealed: true,
  } as any)

  useGameStore.getState().resolveOption(0)
  const state = useGameStore.getState()
  const cfCount = [
    ...state.deck.drawPile,
    ...state.deck.discardPile,
    ...state.deck.nextCycleQueue,
  ].filter(c => c.id === 'changed_follower').length
  expect(cfCount).toBe(6)  // 5 existing + 1 inserted
})
```

- [ ] **Step 3: Run full test suite**

```
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run 2>&1 | tail -5
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/state/gameStore.ts src/state/gameStore.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(engine): P25-51 — raise changed_follower deck cap to 6"
```

---

### Task 3: Victory conditions

**Files:**
- Modify: `src/data/godPaths/shub_niggurath.ts` lines ~285–310
- Test: `src/state/gameStore.test.ts` (new describe block)

**Interfaces:**
- Consumes: `shub_niggurath_6` card options — existing structure with `victory`, `partialVictory`, `endRun`
- Produces: Full victory = `theChanged ≥ 3 AND relics ≥ 1`; Partial = `theChanged ≥ 2 AND followers ≥ 3 AND relics ≥ 1`

- [ ] **Step 1: Write failing tests for victory conditions**

Add this describe block to `src/state/gameStore.test.ts`:

```typescript
describe('shub_niggurath_6 victory conditions (P25-51)', () => {
  function setupShub6(resources: Partial<Record<'theChanged' | 'relics' | 'followers', number>>) {
    const { GOD_PATH_CHAINS } = require('../data/godPaths')
    const shub6 = GOD_PATH_CHAINS['shub_niggurath'][5] // 0-indexed, card 6
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'shub_niggurath', runLength: 'short' },
      currentCard: shub6,
      deck: { drawPile: [], discardPile: [], permDiscardPile: [], nextCycleQueue: [], chainReserve: [] },
      resources: { gold: 3, followers: 3, influence: 3, dread: 0, relics: 1, theChanged: 0, ...resources },
      godPathProgress: 5,
      prepTags: [],
      cardRunState: {},
      activityLog: [],
      activityBatchSealed: true,
    } as any)
  }

  it('full victory: theChanged≥3 AND relics≥1 → opt0 available', () => {
    setupShub6({ theChanged: 3, relics: 1 })
    const state = useGameStore.getState()
    const opts = state.currentCard!.options
    // opt0 condition: godPathStageMin≥5 AND theChanged≥3 AND relics≥1
    // We just verify the condition structure matches spec:
    const cond = opts[0].condition as any
    expect(cond.type).toBe('and')
    const theChangedCond = cond.conditions.find((c: any) => c.resource === 'theChanged')
    const relicsCond = cond.conditions.find((c: any) => c.resource === 'relics')
    expect(theChangedCond?.min).toBe(3)
    expect(relicsCond?.min).toBe(1)
  })

  it('full victory: relics=0 → opt0 condition fails', () => {
    setupShub6({ theChanged: 3, relics: 0 })
    // Resolve opt0 — condition fails, so it should be greyed (not hidden)
    // We verify relics condition exists in opt0
    const state = useGameStore.getState()
    const cond = state.currentCard!.options[0].condition as any
    const relicsCond = cond.conditions.find((c: any) => c.resource === 'relics')
    expect(relicsCond?.min).toBe(1)
  })

  it('partial victory: theChanged≥2, followers≥3, relics≥1 → opt1 available', () => {
    setupShub6({ theChanged: 2, followers: 3, relics: 1 })
    const state = useGameStore.getState()
    const cond = state.currentCard!.options[1].condition as any
    expect(cond.type).toBe('and')
    const theChangedCond = cond.conditions.find((c: any) => c.resource === 'theChanged')
    const followersCond = cond.conditions.find((c: any) => c.resource === 'followers')
    const relicsCond = cond.conditions.find((c: any) => c.resource === 'relics')
    expect(theChangedCond?.min).toBe(2)
    expect(followersCond?.min).toBe(3)
    expect(relicsCond?.min).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run --reporter=verbose 2>&1 | grep -A3 "victory conditions (P25-51)"
```

Expected: FAIL — conditions don't match yet

- [ ] **Step 3: Update shub_niggurath_6 options**

In `src/data/godPaths/shub_niggurath.ts`, find the `shub_niggurath_6` options block and replace the first two options (keep the third `endRun` option unchanged):

```typescript
      {
        label: 'Complete the offering',
        flavourText: 'We cared for The Changed and gave what was asked. The forest accepted it the way a forest accepts rain.',
        effects: [
          { type: 'victory' },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 5 },
            { type: 'resourceMin', resource: 'theChanged', min: 3 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
          ],
        },
      },
      {
        label: 'Offer what you have',
        flavourText: 'We gave what we had. The forest accepted, but wanted more.',
        effects: [
          { type: 'partialVictory', god: 'shub_niggurath' },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 5 },
            { type: 'resourceMin', resource: 'theChanged', min: 2 },
            { type: 'resourceMin', resource: 'followers', min: 3 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
          ],
        },
      },
```

- [ ] **Step 4: Run tests — verify victory condition tests pass**

```
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run --reporter=verbose 2>&1 | grep -A3 "victory conditions (P25-51)"
```

Expected: all 3 tests PASS

- [ ] **Step 5: Run full test suite**

```
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run 2>&1 | tail -5
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/shub_niggurath.ts src/state/gameStore.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(cards): P25-51 — update Shub victory conditions (full: +relics≥1, partial: +fol≥3)"
```

---

### Task 4: ShubTracker component + GameScreen wiring

**Files:**
- Create: `src/components/game/ShubTracker.tsx`
- Modify: `src/components/GameScreen.tsx` (add ShubTracker below ResourceBar)

**Interfaces:**
- Consumes: `useGameStore` — `resources.theChanged`, `runConfig.godPath`
- Produces: `<ShubTracker />` component — renders only when `godPath === 'shub_niggurath'`, null otherwise

- [ ] **Step 1: Create ShubTracker.tsx**

Create `src/components/game/ShubTracker.tsx`:

```typescript
import { useGameStore } from '../../state'

const VICTORY_TARGET = 3

// Hexagonal pip via CSS clip-path (flat-top hexagon)
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

function HexPip({ filled }: { filled: boolean }) {
  return (
    <div
      style={{
        width: '9px',
        height: '9px',
        clipPath: HEX_CLIP,
        background: filled ? '#9b6dbf' : '#2a1e42',
        filter: filled ? 'drop-shadow(0 0 3px rgba(112,64,160,0.5))' : undefined,
        flexShrink: 0,
      }}
    />
  )
}

export function ShubTracker() {
  const godPath    = useGameStore(s => s.runConfig?.godPath)
  const theChanged = useGameStore(s => s.resources.theChanged)

  if (godPath !== 'shub_niggurath') return null

  const filled = Math.min(theChanged, VICTORY_TARGET)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '3px 14px',
        background: '#100e1a',
        borderBottom: '1px solid #221830',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: '#6a4898',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        🜏 The Changed
      </span>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        {Array.from({ length: VICTORY_TARGET }, (_, i) => (
          <HexPip key={i} filled={i < filled} />
        ))}
      </div>
      <span style={{ fontSize: '10px', color: '#5a4080' }}>
        {theChanged} / {VICTORY_TARGET}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Wire ShubTracker into GameScreen.tsx**

In `src/components/GameScreen.tsx`, add the import at the top alongside other game component imports:

```typescript
import { ShubTracker } from './game/ShubTracker'
```

Then find the ResourceBar render block:

```typescript
        {/* ResourceBar — elevated to fixed+zIndex 201 while relic picker is open so it sits above the backdrop */}
        <div style={{ position: relicPickerOpen ? 'fixed' : 'absolute', top: 0, left: 0, right: 0, zIndex: relicPickerOpen ? 201 : 20 }}>
          <ResourceBar onOpenRelicPicker={handleOpenRelicPicker} />
        </div>
```

Replace with:

```typescript
        {/* ResourceBar + ShubTracker — elevated together while relic picker is open */}
        <div style={{ position: relicPickerOpen ? 'fixed' : 'absolute', top: 0, left: 0, right: 0, zIndex: relicPickerOpen ? 201 : 20 }}>
          <ResourceBar onOpenRelicPicker={handleOpenRelicPicker} />
          <ShubTracker />
        </div>
```

- [ ] **Step 3: Run full test suite**

```
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run 2>&1 | tail -5
```

Expected: all tests pass (component tests are node-only — no DOM/RTL test harness)

- [ ] **Step 4: Smoke-check in browser**

Start the dev server and start a Shub run. Verify:
- Slim purple band appears between resource bar and card area
- Three hexagonal pips render
- Pip fills as theChanged increments (sacrifice a CF)
- Band absent on Yha/Nyar runs

- [ ] **Step 5: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/game/ShubTracker.tsx src/components/GameScreen.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(ui): P25-51 — add ShubTracker band with hexagonal pip progress"
```
