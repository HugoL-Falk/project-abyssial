# P20-N: Prep-Tag Hide, Rotation Hint, Tiara "Can't Take Twice" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide `hasPrepTag`-gated options until the tag is held, surface a tappable ◆ on the card title, add rotation text to rare/uncommon jewel hints, and show a "Can't take twice" tooltip on `yha_nthlei_2` opt1 after the relic is claimed.

**Architecture:** Engine change in `getVisibleOptions` auto-hides `hasPrepTag` options (no data edits needed). `GameScreen` extracts hidden prep requirements and passes them to `DrawnCard` as a new prop. `OptionsColumn` gains a `disabledReason` field and a ✕ badge. `yha_nthlei.ts` drops one flag. `DrawnCard.tsx` gains the ◆ JSX and updated `TIER_HINTS`.

**Tech Stack:** TypeScript, React 18, Vitest, `zustand` (gameStore)

## Global Constraints

- No file over 300 LOC without a split plan — GameScreen.tsx is currently ~407 LOC (over cap but pre-approved); do not add feature logic to it, only add prop-passing.
- `PREP_TAG_CARRIERS`, `PREP_TAG_LABELS`, `carrierCardIds` must **not** be removed — they are retained for the NB-G1-03/P17-29 re-enable watchpoint.
- All existing 169 tests must remain green. Run `npx vitest run` from `C:/Project Abyssial/Code/project-abyssial`.
- Commits are LOCAL ONLY — do not push.
- No `any` casts introduced.
- VisibleOpt in OptionsColumn intentionally omits `hidden` (filtered upstream) — do not add `hidden` to it.

---

### Task 1: Engine — auto-hide hasPrepTag options + disabledReason

**Files:**
- Modify: `src/state/gameStore.ts` lines 189–211 (the `getVisibleOptions` return block)
- Modify: `src/types/index.ts` lines 180–195 (`VisibleOption` type)
- Modify: `src/state/gameStore.test.ts` — update 2 existing assertions + add 2 new `describe` blocks

**Interfaces:**
- Produces: `getVisibleOptions` now returns `hidden: true` for any option whose `condition.type === 'hasPrepTag'` and that condition fails. Also returns `disabledReason?: string` (`"Can't take twice"`) when `condition.type === 'not'` and the inner condition is `cardOptionChosen` and the option is unavailable.

---

- [ ] **Step 1: Add `hidden: true` assertion to the existing "Recognise the sign hidden without tag" test**

In `src/state/gameStore.test.ts`, find the test at the `describe('P14-4 prep-bonus options')` block (search for `'Recognise the sign' hidden without attended_seance tag`). Add one line after `expect(bonus.available).toBe(false)`:

```ts
it('yha_nthlei_3 "Recognise the sign" hidden without attended_seance tag', () => {
  const store = useGameStore.getState()
  const card = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_3')!
  const opts = store.getVisibleOptions(card)
  const bonus = opts.find(o => o.option.label === 'Recognise the sign')!
  expect(bonus.available).toBe(false)
  expect(bonus.hidden).toBe(true)    // ← new assertion
})
```

- [ ] **Step 2: Add `hidden: true` assertion to the existing VisibleOption.prepRequirement test**

In `src/state/gameStore.test.ts`, find the `describe('VisibleOption.prepRequirement')` block (search for `'populates prepRequirement on locked prep-bonus options'`). Add `expect(recitedOpt.hidden).toBe(true)` after `expect(recitedOpt.available).toBe(false)`:

```ts
it('populates prepRequirement on locked prep-bonus options', () => {
  useGameStore.setState({
    runConfig: { godPath: 'yha_nthlei' } as any,
    prepTags: [],
    godPathProgress: 4,
  })
  const card = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_5')!
  const opts = useGameStore.getState().getVisibleOptions(card)
  const recitedOpt = opts.find(o => o.option.label === 'Speak the closing rite')!
  expect(recitedOpt.available).toBe(false)
  expect(recitedOpt.hidden).toBe(true)           // ← new assertion
  expect(recitedOpt.prepRequirement).toBeDefined()
  expect(recitedOpt.prepRequirement!.tag).toBe('recited')
  expect(recitedOpt.prepRequirement!.label).toBe('the rite spoken')
  expect(recitedOpt.prepRequirement!.carrierCardIds).toContain('what_was_already_read')
})
```

- [ ] **Step 3: Add new describe block for disabledReason**

Append this block after the `describe('VisibleOption.prepRequirement')` block in `src/state/gameStore.test.ts`:

```ts
describe('P20-N: disabledReason for not+cardOptionChosen', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('sets disabledReason "Can\'t take twice" when not+cardOptionChosen condition fails', () => {
    useGameStore.setState({
      resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 0, theChanged: 0 },
      cardRunState: { yha_nthlei_2: { drawCount: 2, chosenOptions: [1] } },
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
    })
    const store = useGameStore.getState()
    const card = YHA_NTHLEI_CHAIN.find((c: Card) => c.id === 'yha_nthlei_2')!
    const opts = store.getVisibleOptions(card)
    const returnOpt = opts.find(o => o.option.label === 'Send someone to return it to the refinery')!
    expect(returnOpt.available).toBe(false)
    expect(returnOpt.disabledReason).toBe("Can't take twice")
  })

  it('disabledReason is undefined when not+cardOptionChosen passes', () => {
    useGameStore.setState({
      resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 0, theChanged: 0 },
      cardRunState: {},
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
    })
    const store = useGameStore.getState()
    const card = YHA_NTHLEI_CHAIN.find((c: Card) => c.id === 'yha_nthlei_2')!
    const opts = store.getVisibleOptions(card)
    const returnOpt = opts.find(o => o.option.label === 'Send someone to return it to the refinery')!
    expect(returnOpt.available).toBe(true)
    expect(returnOpt.disabledReason).toBeUndefined()
  })
})
```

- [ ] **Step 4: Run tests — expect 3 failures**

```
cd C:/Project Abyssial/Code/project-abyssial && npx vitest run
```

Expected failures:
1. `"Recognise the sign" hidden without attended_seance tag` — `hidden` is `false`, not `true`
2. `populates prepRequirement on locked prep-bonus options` — `hidden` is `false`, not `true`
3. `sets disabledReason "Can't take twice"...` — `disabledReason` is `undefined`

- [ ] **Step 5: Add `disabledReason?` to `VisibleOption` in `src/types/index.ts`**

Locate the `VisibleOption` type (lines 180–195). Add `disabledReason?: string` after `affordabilityShortfall?`:

```ts
export type VisibleOption = {
  idx: number
  option: CardOption
  available: boolean
  effectiveEffects: Effect[]
  hidden: boolean  // true when unavailable + hideWhenUnavailable — UI should not render
  affordabilityShortfall?: Partial<Record<ResourceKey, number>>
  disabledReason?: string   // ← add this line
  prepRequirement?: {
    tag: string
    label: string
    carrierCardIds: CardId[]
  }
}
```

- [ ] **Step 6: Update `getVisibleOptions` in `src/state/gameStore.ts`**

Locate the function (starting at line 160). Replace lines 188–211:

```ts
    const available = conditionPasses && affordable
    const isPrepTagMissing = opt.condition?.type === 'hasPrepTag' && !conditionPasses
    const hidden = (!available && (opt.hideWhenUnavailable ?? false)) || isPrepTagMissing

    let prepRequirement: { tag: string; label: string; carrierCardIds: string[] } | undefined
    if (opt.condition?.type === 'hasPrepTag' && !conditionPasses) {
      const tag = opt.condition.tag as PrepTag
      if (tag in PREP_TAG_LABELS) {
        prepRequirement = {
          tag,
          label: PREP_TAG_LABELS[tag],
          carrierCardIds: PREP_TAG_CARRIERS[tag].map(c => c.cardId),
        }
      }
    }

    let disabledReason: string | undefined
    if (!available && opt.condition?.type === 'not' &&
        opt.condition.condition.type === 'cardOptionChosen') {
      disabledReason = "Can't take twice"
    }

    return {
      idx,
      option: opt,
      available,
      hidden,
      effectiveEffects,
      affordabilityShortfall: affordable ? undefined : shortfall,
      disabledReason,
      prepRequirement,
    }
```

- [ ] **Step 7: Run tests — expect all to pass**

```
cd C:/Project Abyssial/Code/project-abyssial && npx vitest run
```

Expected: 172/172 pass (169 existing + 3 new). Confirm no regressions.

- [ ] **Step 8: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/state/gameStore.ts src/types/index.ts src/state/gameStore.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(P20-N): auto-hide hasPrepTag options + disabledReason in getVisibleOptions"
```

---

### Task 2: Data fix — tiara hideWhenUnavailable removal

**Files:**
- Modify: `src/data/godPaths/yha_nthlei.ts` — remove `hideWhenUnavailable: true` from opt1 of `yha_nthlei_2`
- Modify: `src/state/gameStore.test.ts` — update 1 existing assertion + add 1 new assertion

**Interfaces:**
- Consumes: Task 1's `disabledReason` in `getVisibleOptions`
- Produces: `yha_nthlei_2` opt1 renders as greyed (not hidden) with `disabledReason: "Can't take twice"` after first pick

---

- [ ] **Step 1: Update the existing tiara test assertion**

In `src/state/gameStore.test.ts`, find the `describe('yha_nthlei_2 opt2 one-shot return')` block. Locate the test `'opt2 gated on cardOptionChosen, not a reshuffle-scoped prep tag'` and change:

```ts
// BEFORE:
expect(returnOpt!.hideWhenUnavailable).toBe(true)

// AFTER:
expect(returnOpt!.hideWhenUnavailable).toBeUndefined()
```

- [ ] **Step 2: Add a test verifying opt1 is no longer hidden after first pick**

Append a new `it` inside the same `describe('yha_nthlei_2 opt2 one-shot return')` block:

```ts
it('opt1 is not hidden after first pick — shows greyed with disabledReason (P20-N)', () => {
  useGameStore.setState({
    resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 0, theChanged: 0 },
    cardRunState: { yha_nthlei_2: { drawCount: 2, chosenOptions: [1] } },
    runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
  })
  const store = useGameStore.getState()
  const card = YHA_NTHLEI_CHAIN.find((c: Card) => c.id === 'yha_nthlei_2')!
  const opts = store.getVisibleOptions(card)
  const returnOpt = opts.find(o => o.option.label === 'Send someone to return it to the refinery')!
  expect(returnOpt.available).toBe(false)
  expect(returnOpt.hidden).toBe(false)
  expect(returnOpt.disabledReason).toBe("Can't take twice")
})
```

- [ ] **Step 3: Run tests — expect 2 failures**

```
cd C:/Project Abyssial/Code/project-abyssial && npx vitest run
```

Expected failures:
1. `opt2 gated on cardOptionChosen...` — `hideWhenUnavailable` is still `true`
2. `opt1 is not hidden after first pick` — `hidden` is still `true` (because `hideWhenUnavailable: true` is still in data)

- [ ] **Step 4: Remove `hideWhenUnavailable: true` from `yha_nthlei_2` opt1**

In `src/data/godPaths/yha_nthlei.ts`, locate the `yha_nthlei_2` card (comment: `THE FISHMONGER'S TIARA`). In opt1 (`label: 'Send someone to return it to the refinery'`), remove the line:

```ts
        hideWhenUnavailable: true,
```

The option block should read:

```ts
      {
        // P17-20 (s94): one-shot return — first pick claims the relic;
        // subsequent encounters hide this option, forcing advance via
        // opt1/opt3. P19-21 (s100): re-gated on cardOptionChosen.
        // Historical (pre-PREP-PERSIST): prepTags cleared on reshuffle and
        // this card re-inserts itself, so the old notHasPrepTag gate
        // re-opened after every reshuffle → relic farm. Now re-gated on
        // cardOptionChosen (persists run-long) which closes the loop
        // regardless of prep-tag lifecycle.
        // (opt1 "Keep it" is an unconditional advance, so no softlock.)
        // P20-N: hideWhenUnavailable removed — option shows greyed with
        // "Can't take twice" tooltip after first pick.
        label: 'Send someone to return it to the refinery',
        flavourText: 'They didn\'t come back. One of them did, eventually. They were not carrying what we sent. They were carrying something else.',
        condition: { type: 'not', condition: { type: 'cardOptionChosen', cardId: 'yha_nthlei_2', optionIdx: 1 } },
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'insertCard', cardId: 'yha_nthlei_2', position: 'random', minPos: 4, maxPos: 6 },
        ],
      },
```

- [ ] **Step 5: Run tests — expect all to pass**

```
cd C:/Project Abyssial/Code/project-abyssial && npx vitest run
```

Expected: all tests pass. Confirm count is still 172/172.

- [ ] **Step 6: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/godPaths/yha_nthlei.ts src/state/gameStore.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(P20-N): tiara opt1 shows greyed with can't-take-twice tooltip instead of hiding"
```

---

### Task 3: OptionsColumn — disabledReason display + dead prepRequirement branch removal

**Files:**
- Modify: `src/components/game/OptionsColumn.tsx`

**Interfaces:**
- Consumes: `disabledReason?: string` from `VisibleOpt` (Task 1 added it to the engine; this task adds it to the component type and renders it)
- Note: No DOM/RTL test harness exists for components — this task has no new tests. Verify visually at runtime.

---

- [ ] **Step 1: Add `disabledReason?` to the `VisibleOpt` type**

In `src/components/game/OptionsColumn.tsx`, locate the `VisibleOpt` export type (lines 49–63). Add `disabledReason?: string` after `affordabilityShortfall?`:

```ts
export type VisibleOpt = {
  idx: number
  option: { label: string; flavourText?: string; isWhisper?: boolean; condition?: Condition; succumbOption?: boolean; previewTag?: string }
  available: boolean
  effectiveEffects: Effect[]
  affordabilityShortfall?: Partial<Record<ResourceKey, number>>
  disabledReason?: string   // ← add this line
  prepRequirement?: {
    tag: string
    label: string
    carrierCardIds: string[]
  }
}
```

- [ ] **Step 2: Remove the dead `prepRequirement` HintTooltip block**

In `renderOptionRow`, locate the block starting at `{prepRequirement && (` (currently lines 208–224). Delete it entirely:

```tsx
// DELETE this entire block:
{prepRequirement && (
  <HintTooltip
    text={`Requires ${prepRequirement.label}.`}
    ariaLabel={`Requirement: ${prepRequirement.label}`}
  >
    <span
      style={{
        color: '#9b7bd4',
        fontSize: '0.85rem',
        lineHeight: 1,
        textShadow: '0 0 6px rgba(155,123,212,0.5)',
      }}
    >
      ❖
    </span>
  </HintTooltip>
)}
```

- [ ] **Step 3: Add the `disabledReason` ✕ badge**

In `renderOptionRow`, update the destructuring at the top of the function to include `disabledReason`:

```ts
function renderOptionRow({ idx, option, available: avail, effectiveEffects, affordabilityShortfall, prepRequirement, disabledReason }: VisibleOpt) {
```

Then, in the right-side tag cluster (the `<div style={{ display: 'flex', gap: '0.25rem' ... }}>` block that contains the dread condition pills and affordability shortfall pills), add the `disabledReason` badge **after** the `{affordabilityShortfall && ...}` block and **before** `<EffectTags .../>`:

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

- [ ] **Step 4: Run tests — confirm no regressions**

```
cd C:/Project Abyssial/Code/project-abyssial && npx vitest run
```

Expected: 172/172 pass (component changes don't affect node-only tests).

- [ ] **Step 5: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/game/OptionsColumn.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(P20-N): OptionsColumn — disabledReason badge, remove dead prepRequirement hint"
```

---

### Task 4: DrawnCard ◆ indicator + TIER_HINTS + GameScreen prop thread

**Files:**
- Modify: `src/components/game/DrawnCard.tsx`
- Modify: `src/components/GameScreen.tsx`

**Interfaces:**
- Consumes: `hiddenPrepReqs` computed from `visibleOpts` in GameScreen (options where `hidden && prepRequirement != null`)
- Note: No DOM/RTL test harness — verify visually at runtime.

---

- [ ] **Step 1: Update `TIER_HINTS` in `src/components/game/DrawnCard.tsx`**

Locate the `TIER_HINTS` constant (line 167). Update `core` and `rare` entries:

```ts
const TIER_HINTS: Record<string, string> = {
  core:        'Uncommon card · rotates each reshuffle',
  common:      'Common card',
  rare:        'Rare card · rotates each reshuffle',
  threat:      'Threat card',
  treat:       'Treat card',
  god_path:    'God Path card',
  doom:        'Doom card',
  mutation:    'Mutation card',
  tutorial:    'Tutorial',
}
```

- [ ] **Step 2: Add `hiddenPrepReqs` prop + `prepOpen` state + reset effect to DrawnCard**

Locate the function signature (line 181):

```ts
export function DrawnCard({ card, compact = false, textVisible = true }: { card: Card; compact?: boolean; textVisible?: boolean }) {
```

Replace with:

```ts
export function DrawnCard({ card, compact = false, textVisible = true, hiddenPrepReqs }: {
  card: Card
  compact?: boolean
  textVisible?: boolean
  hiddenPrepReqs?: Array<{ tag: string; label: string }>
}) {
```

After the existing `const [jewel, setJewel] = useState(false)` line, add:

```ts
  const [prepOpen, setPrepOpen] = useState(false)
```

After the existing `useRef` / first `useEffect` in the component (wherever the text-reveal effect is), add a new `useEffect` to reset `prepOpen` on card change:

```ts
  useEffect(() => { setPrepOpen(false) }, [card.id])
```

- [ ] **Step 3: Add the ◆ element to the title row in DrawnCard**

Locate the title row (the `<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>` containing the title `<div>`, `<CardPassiveTag>`, and jewel area). After `{!compact && <CardPassiveTag card={card} />}` and **before** the `{isGodPath && stage ? (` block, insert:

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

- [ ] **Step 4: Compute `hiddenPrepReqs` in GameScreen and pass to DrawnCard**

In `src/components/GameScreen.tsx`, locate the line:

```ts
const nonHiddenOpts = visibleOpts.filter(o => !o.hidden)
```

Add immediately after it:

```ts
const hiddenPrepReqs = visibleOpts
  .filter(o => o.hidden && o.prepRequirement != null)
  .map(o => o.prepRequirement!)
```

Then locate the `<DrawnCard>` render at line ~266:

```tsx
<DrawnCard card={currentCard!} textVisible={textReveal} />
```

Add the new prop:

```tsx
<DrawnCard card={currentCard!} textVisible={textReveal} hiddenPrepReqs={hiddenPrepReqs} />
```

**Important:** The DrawnCard calls in `DrawPileView.tsx` (draw animation, compact mode) do NOT receive this prop — leave them unchanged.

- [ ] **Step 5: Run tests — confirm no regressions**

```
cd C:/Project Abyssial/Code/project-abyssial && npx vitest run
```

Expected: 172/172 pass. TypeScript must be clean: `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/game/DrawnCard.tsx src/components/GameScreen.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(P20-N): DrawnCard ◆ prep-tag indicator, TIER_HINTS rotation hint"
```

---

## Self-Review Checklist

- [x] Spec §1 (auto-hide hasPrepTag) → Task 1 engine change
- [x] Spec §2 (hiddenPrepReqs prop thread) → Task 4 GameScreen + DrawnCard
- [x] Spec §3 (◆ indicator in title row) → Task 4 DrawnCard
- [x] Spec §4 (remove dead prepRequirement branch) → Task 3 OptionsColumn
- [x] Spec §5 (TIER_HINTS rotation text) → Task 4 DrawnCard
- [x] Spec §6 (tiara hideWhenUnavailable + disabledReason) → Tasks 1+2+3
- [x] `PREP_TAG_CARRIERS` / `carrierCardIds` retained — Tasks 1 and 3 don't remove them
- [x] DrawPileView DrawnCard calls excluded — Task 4 Step 4 explicitly notes this
- [x] `effects.ts` not touched — its `getVisibleOptions` is dead code (gameLoop cleanup queued separately); `VisibleOption.disabledReason?` is optional so `effects.ts` still type-checks
- [x] Test count: 169 existing + 3 new = 172 expected throughout
