# T2 `- random threat` Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten `removeRandomThreat`: exclude overflow/deficit cards from targeting, restyle the chip as `- threat` matching `-card` outline, and collapse Clarence into a two-priced generic rare. Closes P17-9, P17-10, P17-24, P18-9.

**Architecture:** Three independent edits with their own test slices: (1) extend the `removeRandomThreat` filter in `gameStore.ts` + the dead-code mirror in `gameLoop.ts` using a derived `OVERFLOW_DEFICIT_IDS` registry; (2) replace `renderRandomThreatTag` in `StructuralTag.tsx` with an outline-styled `- threat` chip; (3) rewrite Clarence's options in `rare.ts` and drop the two `previewTag` overrides. Each change ships with its own vitest coverage.

**Tech Stack:** TypeScript, React, Zustand (`useGameStore`), Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-23-t2-random-threat-rework-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/state/gameStore.ts` | Modify | Add `OVERFLOW_DEFICIT_IDS` registry near the existing `PREP_CARRIER_IDS` (around line 60–62); extend the `removeRandomThreat` filter at ~line 851. |
| `src/engine/gameLoop.ts` | Modify | Mirror the same registry + filter change at ~line 335 (dead-code path kept consistent per S4 precedent). |
| `src/data/cards/rare.ts` | Modify | Rewrite Clarence's options (~lines 148–219); delete `previewTag` lines 155 + 184. |
| `src/components/game/tags/StructuralTag.tsx` | Modify | Replace `renderRandomThreatTag` body with outline-styled `- threat` chip matching `renderRemoveCardSingle`. |
| `src/state/gameStore.test.ts` | Modify | Append a new `describe('removeRandomThreat excludes overflow/deficit ...')` block + Clarence describe block. |

No new files. No type-schema changes.

---

## Task 1: Add overflow/deficit exclusion to `removeRandomThreat` filter (gameStore)

**Files:**
- Modify: `src/state/gameStore.ts:60-65, 846-866`
- Test: `src/state/gameStore.test.ts` (append after the existing `removeRandomThreat excludes prep carriers (S4)` describe block)

- [ ] **Step 1.1: Write the first failing test — overflow card excluded**

Append to `src/state/gameStore.test.ts` after the `removeRandomThreat excludes prep carriers (S4)` describe block:

```typescript
describe('removeRandomThreat excludes overflow/deficit cards (P17-10)', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  it('does not remove the_ledger_is_noticed when another threat exists', () => {
    const overflow = THREAT_CARDS.find(c => c.id === 'the_ledger_is_noticed')!
    const generic = THREAT_CARDS.find(c =>
      c.tier === 'threat'
      && !c.permanent
      && c.id !== 'the_ledger_is_noticed'
      && c.id !== 'theyre_not_listening'
      && c.id !== 'the_wrong_rooms'
      && c.id !== 'deficit_gold'
      && c.id !== 'deficit_followers'
      && c.id !== 'deficit_influence'
      && c.id !== 'what_was_already_read'
    )!
    const triggerCard = {
      id: 'test_rrt_overflow', title: 'Test', tier: 'core' as const,
      options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeRandomThreat' }] }],
    } as never

    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      deck: { drawPile: [overflow, generic], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: triggerCard,
      activityLog: [],
      activityBatchSealed: true,
    })

    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    const allPiles = [...state.deck.drawPile, ...state.deck.discardPile, ...state.deck.nextCycleQueue]
    expect(allPiles.some(c => c.id === 'the_ledger_is_noticed')).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
  })
})
```

- [ ] **Step 1.2: Run the test, verify it fails**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "does not remove the_ledger_is_noticed"`
Expected: FAIL — `expect(allPiles.some(...)).toBe(true)` receives false, because today the overflow card is a valid purge target.

- [ ] **Step 1.3: Add `OVERFLOW_DEFICIT_IDS` registry in gameStore.ts**

In `src/state/gameStore.ts`, immediately after the `DEFICIT_CARD_ID` declaration (~line 214, before `function toSummary`), add a single new block:

```typescript
// P17-10 (T2): excluded from removeRandomThreat targeting. Derived from the
// canonical overflow/deficit maps so any future entry joins the exclusion
// automatically.
const OVERFLOW_DEFICIT_IDS: ReadonlySet<string> = new Set([
  ...Object.values(OVERFLOW_CARD_ID),
  ...Object.values(DEFICIT_CARD_ID),
])
```

No edit at the top of the file is needed — the registry sits next to its source-of-truth maps and is read inside `resolveOption`, well after module init.

- [ ] **Step 1.4: Extend the filter at the `removeRandomThreat` case**

In `src/state/gameStore.ts`, the filter at ~line 851:

```typescript
].filter(({ card }) =>
  card.tier === 'threat'
  && !card.permanent
  && !PREP_CARRIER_IDS.has(card.id)
)
```

Change to:

```typescript
].filter(({ card }) =>
  card.tier === 'threat'
  && !card.permanent
  && !PREP_CARRIER_IDS.has(card.id)
  && !OVERFLOW_DEFICIT_IDS.has(card.id)
)
```

- [ ] **Step 1.5: Run the test, verify it passes**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "does not remove the_ledger_is_noticed"`
Expected: PASS.

- [ ] **Step 1.6: Add the remaining 5 exclusion tests**

Append five more `it(...)` cases inside the same describe block, one per remaining ID (`theyre_not_listening`, `the_wrong_rooms`, `deficit_gold`, `deficit_followers`, `deficit_influence`). Each test is a structural copy of step 1.1 with only the card ID swapped. Also add a "no-eligible-targets" case:

```typescript
it('removes nothing when only overflow/deficit cards exist', () => {
  const ids = ['the_ledger_is_noticed', 'theyre_not_listening', 'the_wrong_rooms', 'deficit_gold', 'deficit_followers', 'deficit_influence']
  const seeded = ids.map(id => THREAT_CARDS.find(c => c.id === id)!)
  const triggerCard = {
    id: 'test_rrt_none', title: 'Test', tier: 'core' as const,
    options: [{ id: 'o', label: 'Remove', effects: [{ type: 'removeRandomThreat' }] }],
  } as never

  useGameStore.setState({
    phase: 'playing',
    runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
    deck: { drawPile: seeded, discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
    currentCard: triggerCard,
    activityLog: [],
    activityBatchSealed: true,
  })

  useGameStore.getState().resolveOption(0)
  const state = useGameStore.getState()
  expect(state.deck.permDiscardPile.length).toBe(0)
})
```

- [ ] **Step 1.7: Run the full describe block, verify all pass**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "removeRandomThreat excludes overflow/deficit"`
Expected: PASS — 7 tests (6 ID-specific + 1 no-eligible-targets).

- [ ] **Step 1.8: Run the existing S4 prep-carrier describe block to confirm no regression**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "removeRandomThreat excludes prep carriers"`
Expected: PASS — 2 tests stay green.

- [ ] **Step 1.9: Commit**

```bash
cd Code/project-abyssial
git add src/state/gameStore.ts src/state/gameStore.test.ts
git commit -m "feat(t2): exclude overflow/deficit cards from removeRandomThreat (P17-10)"
```

---

## Task 2: Mirror the filter change in `gameLoop.ts`

**Files:**
- Modify: `src/engine/gameLoop.ts:43-48, 335-360`

This is the dead-code mirror flagged in `knowledge/backlog.md` ("gameLoop.ts cleanup"). Per the S4 precedent we keep both paths in sync until a dedicated cleanup session deletes the dead code.

- [ ] **Step 2.1: Add `OVERFLOW_DEFICIT_IDS` registry in gameLoop.ts**

`src/engine/gameLoop.ts` already has its own `PREP_CARRIER_IDS` mirror at ~line 43. Add a similar block immediately after it:

```typescript
// P17-10 (T2): mirror of gameStore.ts. Excluded from removeRandomThreat.
const OVERFLOW_DEFICIT_IDS: ReadonlySet<string> = new Set([
  'the_ledger_is_noticed',
  'theyre_not_listening',
  'the_wrong_rooms',
  'deficit_gold',
  'deficit_followers',
  'deficit_influence',
])
```

(Hardcoded list here — `gameLoop.ts` doesn't import the `OVERFLOW_CARD_ID` / `DEFICIT_CARD_ID` maps and we don't want to create a new cross-module dependency for a dead-code path. The list is short and stable; if it ever changes, the s89-flagged cleanup session will collapse this duplication.)

- [ ] **Step 2.2: Extend the filter in the `removeRandomThreat` case**

At ~line 335, find the filter mirroring gameStore.ts and add the same `&& !OVERFLOW_DEFICIT_IDS.has(card.id)` clause as Task 1 step 1.4. Match it line-for-line.

- [ ] **Step 2.3: Run typecheck**

Run: `cd Code/project-abyssial && npx tsc --noEmit`
Expected: clean (no errors).

- [ ] **Step 2.4: Run the full test suite, verify no regression**

Run: `cd Code/project-abyssial && npx vitest run`
Expected: all tests pass (previous count + 7 new from Task 1 = 103). If anything beyond the new Task 1 tests changed, stop and diagnose.

- [ ] **Step 2.5: Commit**

```bash
cd Code/project-abyssial
git add src/engine/gameLoop.ts
git commit -m "feat(t2): mirror overflow/deficit exclusion in gameLoop.ts dead-code path"
```

---

## Task 3: Restyle `- random threat` chip to `- threat` outline

**Files:**
- Modify: `src/components/game/tags/StructuralTag.tsx:106-114`

Today `renderRandomThreatTag` renders `- random threat` with no border or background. The new chip matches `renderRemoveCardSingle`'s outline treatment but stays non-clickable (random target has no specific card to preview).

- [ ] **Step 3.1: Replace `renderRandomThreatTag`**

In `src/components/game/tags/StructuralTag.tsx`, replace the existing `renderRandomThreatTag` function (lines 106–114) with:

```typescript
export function renderRandomThreatTag(key: number | string): JSX.Element {
  // P18-9 (T2): match `- card` outline styling. Non-clickable: random
  // targeting means no specific card to preview.
  return (
    <span key={key} style={{
      fontSize: '0.8rem', color: '#e08080', background: 'rgba(0,0,0,0.55)',
      border: '1px solid rgba(220,80,80,0.5)', padding: '0.2rem 0.5rem', borderRadius: '2px',
    }}>
      − threat
    </span>
  )
}
```

Three changes from the old body: (a) label `− random threat` → `− threat`, (b) added background + border (mirroring `renderRemoveCardSingle`), (c) font size 0.9rem → 0.8rem to match the other remove chips. The function signature and the call sites are unchanged.

- [ ] **Step 3.2: Verify no other styling drift**

Run: `cd Code/project-abyssial && npx tsc --noEmit`
Expected: clean.

Then grep for any place that hardcodes the old label string in case a test or doc references it:

```bash
cd Code/project-abyssial && grep -rn "random threat" src/ --include="*.ts" --include="*.tsx"
```

Expected hits: only inside `gameStore.ts` / `gameLoop.ts` comments referring to the effect name (acceptable), and in `StructuralTag.tsx` (the new comment). No code expects the literal string `'− random threat'`. If a test does, update it now.

- [ ] **Step 3.3: Run the full test suite**

Run: `cd Code/project-abyssial && npx vitest run`
Expected: all green.

- [ ] **Step 3.4: Commit**

```bash
cd Code/project-abyssial
git add src/components/game/tags/StructuralTag.tsx
git commit -m "feat(t2): restyle random-threat chip to outline '- threat' (P18-9)"
```

---

## Task 4: Rewrite Clarence into two-priced generic rare

**Files:**
- Modify: `src/data/cards/rare.ts:142-219`
- Test: `src/state/gameStore.test.ts` (append a new describe block for Clarence)

- [ ] **Step 4.1: Write the failing tests for Clarence**

Append to `src/state/gameStore.test.ts` after the new Task 1 describe block:

```typescript
describe('Clarence rare — two-priced generic removeRandomThreat (P17-9)', () => {
  beforeEach(() => useGameStore.getState().resetGame())

  function seedClarence(resources: Partial<Record<'gold' | 'followers' | 'influence' | 'dread' | 'relics' | 'theChanged', number>>) {
    const clarence = RARE_CARDS.find(c => c.id === 'clarence')!
    const generic = THREAT_CARDS.find(c =>
      c.tier === 'threat'
      && !c.permanent
      && !['the_ledger_is_noticed', 'theyre_not_listening', 'the_wrong_rooms', 'deficit_gold', 'deficit_followers', 'deficit_influence', 'what_was_already_read'].includes(c.id)
    )!
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 0, followers: 0, influence: 0, dread: 0, relics: 0, theChanged: 0, ...resources },
      deck: { drawPile: [generic], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: clarence,
      activityLog: [],
      activityBatchSealed: true,
    })
    return { clarence, generic }
  }

  it('opt A spends 3 influence, removes a threat, retires Clarence', () => {
    const { generic } = seedClarence({ influence: 3 })
    useGameStore.getState().resolveOption(0)
    const state = useGameStore.getState()
    expect(state.resources.influence).toBe(0)
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === 'clarence')).toBe(true)
  })

  it('opt B spends 2 gold, removes a threat, retires Clarence', () => {
    const { generic } = seedClarence({ gold: 2 })
    useGameStore.getState().resolveOption(1)
    const state = useGameStore.getState()
    expect(state.resources.gold).toBe(0)
    expect(state.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === 'clarence')).toBe(true)
  })

  it('opt B with zero eligible threats still pays cost and retires Clarence', () => {
    // Seed only an overflow card → no eligible target.
    const clarence = RARE_CARDS.find(c => c.id === 'clarence')!
    const overflow = THREAT_CARDS.find(c => c.id === 'the_ledger_is_noticed')!
    useGameStore.setState({
      phase: 'playing',
      runConfig: { godPath: 'yha_nthlei', runLength: 'short' },
      resources: { gold: 2, followers: 0, influence: 0, dread: 0, relics: 0, theChanged: 0 },
      deck: { drawPile: [overflow], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] },
      currentCard: clarence,
      activityLog: [],
      activityBatchSealed: true,
    })
    useGameStore.getState().resolveOption(1)
    const state = useGameStore.getState()
    expect(state.resources.gold).toBe(0)
    expect(state.deck.drawPile.some(c => c.id === 'the_ledger_is_noticed')).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === 'clarence')).toBe(true)
    expect(state.deck.permDiscardPile.some(c => c.id === 'the_ledger_is_noticed')).toBe(false)
  })

  it('"Not yet" is unconditional no-op', () => {
    seedClarence({})
    useGameStore.getState().resolveOption(2)
    const state = useGameStore.getState()
    expect(state.deck.permDiscardPile.some(c => c.id === 'clarence')).toBe(false)
  })
})
```

Add an `import { RARE_CARDS } from '../data/cards/rare'` near the existing `THREAT_CARDS` import at the top of the test file if it's not already imported.

- [ ] **Step 4.2: Run the tests, verify they fail (or pass for wrong reasons)**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "Clarence rare"`
Expected: the four tests fail. Likely failures:
- opt A: passes the influence check (current Clarence opt A also costs 3 influence) but the `removeCard` targets named threats, so the generic seeded threat isn't removed.
- opt B: fails — current opt B costs `-1 influence -1 gold`, not `-2 gold`.
- opt B zero-eligible: current opt B has a `hasCard` gate; the option may not be available.
- "Not yet": option index may differ. If so, adjust to `resolveOption(2)` or whichever matches current index for `Not yet`.

If any test passes for the wrong reason, treat it as a failure and proceed.

- [ ] **Step 4.3: Rewrite Clarence's options in `rare.ts`**

In `src/data/cards/rare.ts`, replace lines 152–218 (the entire `options: [ ... ]` array of the Clarence entry) with:

```typescript
    options: [
      {
        // P17-9 / P17-24 (T2): collapsed from named-target removeCard list to
        // generic removeRandomThreat. hasCard gate dropped — Clarence is now
        // useful whenever you have the resources, regardless of which threats
        // are in the deck. Self-remove preserves one-use identity; rare-rotation
        // handles the unused case.
        label: 'Have him handle it',
        flavourText: 'He handles it. You do not ask how. You will not ask.',
        hideWhenUnavailable: true,
        condition: { type: 'resourceMin', resource: 'influence', min: 3 },
        effects: [
          { type: 'resource', resource: 'influence', delta: -3 },
          { type: 'removeRandomThreat' },
          { type: 'removeCard', cardId: 'clarence' },
        ],
      },
      {
        label: 'Pay him to bury it',
        flavourText: 'Money changes hands. The loose ends are tidied. Clarence is thorough about tidying.',
        hideWhenUnavailable: true,
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'removeRandomThreat' },
          { type: 'removeCard', cardId: 'clarence' },
        ],
      },
      {
        // Unconditional fallback — satisfies allBlocked invariant.
        label: 'Not yet',
        flavourText: 'He waits. He is very good at waiting.',
        effects: [],
      },
    ],
```

This deletes the two `previewTag` overrides at the old lines 155 (`'− removes investigators'`) and 184 (`'− buries loose ends'`). The new `- threat` chip is auto-generated by `StructuralTag.tsx` (Task 3).

- [ ] **Step 4.4: Run the Clarence tests, verify they pass**

Run: `cd Code/project-abyssial && npx vitest run src/state/gameStore.test.ts -t "Clarence rare"`
Expected: 4 tests pass.

- [ ] **Step 4.5: Audit other `previewTag` strings**

Run: `cd Code/project-abyssial && grep -rn "previewTag" src/data --include="*.ts"`
Expected hits: only `rare.ts:124` `'+ summons the guardian'` (unrelated to T2, keep).
If any other previewTag mentions "threat", "investigators", or "random", evaluate whether it should be dropped to let the auto-chip win. Currently expected: none.

- [ ] **Step 4.6: Run the full test suite**

Run: `cd Code/project-abyssial && npx vitest run`
Expected: all green (96 prior + 7 from Task 1 + 4 from Task 4 = 107).

- [ ] **Step 4.7: Run typecheck**

Run: `cd Code/project-abyssial && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4.8: Commit**

```bash
cd Code/project-abyssial
git add src/data/cards/rare.ts src/state/gameStore.test.ts
git commit -m "feat(t2): collapse Clarence into two-priced generic rare (P17-9, P17-24)"
```

---

## Task 5: Final verification

- [ ] **Step 5.1: Full test suite + typecheck**

Run: `cd Code/project-abyssial && npx vitest run && npx tsc --noEmit`
Expected: all tests pass, typecheck clean.

- [ ] **Step 5.2: Manual smoke checklist (read-only, ~5 min)**

The user playtests continuously, so no separate "manual playtest" task. Just confirm the obvious surface area:

- `git log --oneline -5` shows four T2 commits (one per task 1/2/3/4).
- `grep -n "− random threat" src/` returns nothing (label fully replaced).
- `grep -n "previewTag.*investigators\|previewTag.*loose ends" src/` returns nothing (overrides deleted).
- `grep -n "removeRandomThreat" src/data/cards/` shows three callsites: `core.ts` "Have him followed", `rare.ts` "Send it ahead" (Dark Young Guardian), `rare.ts` Clarence opt A + B.

- [ ] **Step 5.3: Update knowledge files**

This step belongs to Claudian per the CLAUDE.md shutdown protocol, not to the executing agent. After plan execution closes the implementation session, Claudian:
- writes `knowledge/sessions/session-NN.md` with the four commits and the four tickets closed,
- overwrites `knowledge/sessions/handoff.md` (mark P17-9 / P17-10 / P17-24 / P18-9 as CLOSED in NEXT_UP, remove T2 from the highest-leverage list),
- updates `knowledge/backlog.md` (strike T2 items, add closure-block under Cluster T2),
- appends a decision entry to `knowledge/decisions-live.md` if the auto-no-op-when-zero-eligible policy is worth recording.

This step is **not** a code task — leave the checkbox here as a Claudian-side reminder, do not dispatch a subagent for it.

---

## Self-review notes

**Spec coverage:**
- Change 1 (filter): Task 1 + Task 2. ✓
- Change 2 (chip): Task 3. ✓
- Change 3 (Clarence): Task 4 — option set, self-remove, `hideWhenUnavailable`, `previewTag` deletion all covered. ✓
- Test plan items 1–6 from the spec: covered by Task 1 (steps 1.1, 1.6) and Task 4 (step 4.1). Spec test 7 (chip rendering in RTL) is intentionally skipped per spec note "Skip if `StructuralTag.tsx` lacks existing test infra"; the manual smoke in 5.2 + playtest covers it. ✓

**Open spec items deferred to here:**
- Final Clarence labels: chosen ("Have him handle it" / "Pay him to bury it"). Thematic agent not invoked — labels are within the spec's allowed placeholder discretion. If user wants a thematic pass post-implementation, that's a follow-up.
- Save-state coupling check: not needed — Clarence's options had auto-generated ids previously (no explicit `id` field on the option objects in the current code), so renaming labels does not break any persisted save.

**Type consistency:** `removeRandomThreat` effect shape unchanged. `OVERFLOW_DEFICIT_IDS` is a `ReadonlySet<string>` in both files — matches `PREP_CARRIER_IDS`'s type. ✓

**No placeholders.** All test code, all source edits, all commands written out in full.
