# S3 + S4 + S5 Prep-Route Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Y'ha-nthlei "recited" prep route discoverable through normal play by (a) lowering the `what_was_already_read` dread gate from ≥8 to ≥6 with a clean D≤5 / D≥6 split (S3), (b) silently excluding prep-carrier cards from `removeRandomThreat` (S4), and (c) adding an `Unlocks at Dread ≥ N` hover tooltip on the existing dread-condition pill (S5).

**Architecture:** Three independent edits to three files plus a fourth test file. No new files. No new types. Reuses existing `PREP_TAG_CARRIERS` registry and existing locked-option pill rendering. Test-driven: write failing tests first, then make them pass.

**Tech Stack:** TypeScript, vitest, React. Existing project conventions (no new deps).

**Spec:** [`docs/superpowers/specs/2026-06-22-s3-s4-s5-prep-route-discoverability-design.md`](../specs/2026-06-22-s3-s4-s5-prep-route-discoverability-design.md)

---

## File Structure

**Modify:**
- `src/data/cards/threats.ts` — three condition edits on `what_was_already_read` (lines ~853–883).
- `src/engine/gameLoop.ts` — import + derived `Set<CardId>` + filter extension on `removeRandomThreat` case (lines ~328–343).
- `src/components/game/OptionsColumn.tsx` — add `title` attribute to existing dread-condition pill (~line 163).

**Test:**
- `src/state/gameStore.test.ts` — add S3 and S4 test cases (file already exists; same suite that tests prep-tag behaviour).
- For S5 (UI tooltip), inline JSX assertion using React Testing Library if the project uses it, else a snapshot string match. Use the file the project already uses for `OptionsColumn` tests; if none exists, add tests inside `gameStore.test.ts` is acceptable for the data assertions and skip the DOM test, documenting it as a manual smoke check.

---

## Task 1: S3 — Lower the recited dread gate

**Files:**
- Modify: `src/data/cards/threats.ts` (3 condition edits on `what_was_already_read`)
- Test: `src/state/gameStore.test.ts`

### - [ ] Step 1: Write the failing test for D = 6 unlock

Open `src/state/gameStore.test.ts`. Find the existing `what_was_already_read` test block (search for `what_was_already_read`). Add this test alongside it:

```ts
describe('what_was_already_read dread gate (S3)', () => {
  it('shows only "The words arrange themselves" when dread >= 6', () => {
    const card = THREAT_CARDS.find(c => c.id === 'what_was_already_read')!
    const opts = getVisibleOptionsForCard(card, {
      ...defaultResourcesForTest(),
      dread: 6,
      gold: 10, // ensure File-it-away isn't gold-blocked
    })
    const labels = opts.filter(o => o.available).map(o => o.option.label)
    expect(labels).toEqual(['The words arrange themselves'])
  })

  it('shows "Acknowledge it" + "File it away" when dread <= 5 and gold >= 2', () => {
    const card = THREAT_CARDS.find(c => c.id === 'what_was_already_read')!
    const opts = getVisibleOptionsForCard(card, {
      ...defaultResourcesForTest(),
      dread: 5,
      gold: 10,
    })
    const labels = opts.filter(o => o.available).map(o => o.option.label)
    expect(labels).toEqual(expect.arrayContaining(['Acknowledge it', 'File it away']))
    expect(labels).not.toContain('The words arrange themselves')
  })

  it('hides "File it away" when gold < 2 (still hideWhenUnavailable)', () => {
    const card = THREAT_CARDS.find(c => c.id === 'what_was_already_read')!
    const opts = getVisibleOptionsForCard(card, {
      ...defaultResourcesForTest(),
      dread: 5,
      gold: 1,
    })
    const visible = opts.filter(o => !o.hidden).map(o => o.option.label)
    expect(visible).not.toContain('File it away')
    expect(visible).toContain('Acknowledge it')
  })
})
```

**Note for engineer:** the exact helper names (`getVisibleOptionsForCard`, `defaultResourcesForTest`) may differ in this repo — locate the existing prep-tag carrier test in the same file (search for `Requires: the rite spoken` or `setPrepTag`) and mirror its setup pattern. The pattern of "get visible options at given resources" already exists in the test file.

### - [ ] Step 2: Run tests and verify they fail

```bash
cd Code/project-abyssial
npx vitest run src/state/gameStore.test.ts -t 'what_was_already_read dread gate'
```

Expected: 3 tests fail (current thresholds are 7/8, not 5/6).

### - [ ] Step 3: Apply the three condition edits

In `src/data/cards/threats.ts`, on the `what_was_already_read` card (around line 853):

```ts
// Option 1: Acknowledge it
condition: { type: 'resourceMax', resource: 'dread', max: 5 },  // was: max: 7

// Option 2: File it away (inside the existing `and` block)
condition: {
  type: 'and',
  conditions: [
    { type: 'resourceMax', resource: 'dread', max: 5 },  // was: max: 7
    { type: 'resourceMin', resource: 'gold', min: 2 },
  ],
},

// Option 3: The words arrange themselves
condition: { type: 'resourceMin', resource: 'dread', min: 6 },  // was: min: 8
```

### - [ ] Step 4: Run new tests and verify they pass

```bash
npx vitest run src/state/gameStore.test.ts -t 'what_was_already_read dread gate'
```

Expected: 3 tests pass.

### - [ ] Step 5: Run the full vitest suite to verify no regressions

```bash
npx vitest run
```

Expected: 77 (pre-existing) + 3 (new) = 80 tests pass, 0 failures. If any pre-existing test referenced the old `7` or `8` threshold, update it to `5` or `6` respectively and add a brief comment `// S3: dread gate lowered from 8 to 6`.

### - [ ] Step 6: Typecheck

```bash
npx tsc --noEmit
```

Expected: no errors.

### - [ ] Step 7: Commit

```bash
git add src/data/cards/threats.ts src/state/gameStore.test.ts
git commit -m "feat(yha): lower recited dread gate from 8 to 6 (S3, EX-G1-02)

what_was_already_read 'The words arrange themselves' now unlocks at
dread >= 6 (was >= 8). Acknowledge/File ceiling lowered to dread <= 5
(was <= 7) to maintain a clean split between the three options.

This makes the recited prep route discoverable through normal play —
a player drifting toward partial victory naturally crosses dread 6
and lands the +1 relic on yha_nthlei_5 'Speak the closing rite'.
Previously required deliberate counter-tutorial dread-pumping.

Closes EX-G1-02. Partial side-effect on G1-01 — flag for playtest."
```

---

## Task 2: S4 — Exclude prep carriers from removeRandomThreat

**Files:**
- Modify: `src/engine/gameLoop.ts` (~line 328, removeRandomThreat case)
- Test: `src/state/gameStore.test.ts`

### - [ ] Step 1: Write the failing test

Add to `src/state/gameStore.test.ts`:

```ts
describe('removeRandomThreat excludes prep carriers (S4)', () => {
  it('does not remove what_was_already_read when other threats exist', () => {
    const carrier = THREAT_CARDS.find(c => c.id === 'what_was_already_read')!
    const generic = THREAT_CARDS.find(c => c.id !== 'what_was_already_read' && c.tier === 'threat' && !c.permanent)!
    const deckBefore = {
      drawPile: [carrier, generic],
      discardPile: [],
      nextCycleQueue: [],
      permDiscardPile: [],
    }
    const result = applyEffect({ type: 'removeRandomThreat' }, deckBefore, /* …context */)
    // Carrier must still be present in some pile.
    const stillPresent = [
      ...result.deck.drawPile,
      ...result.deck.discardPile,
      ...result.deck.nextCycleQueue,
    ].some(c => c.id === 'what_was_already_read')
    expect(stillPresent).toBe(true)
    // Generic threat must have moved to permDiscardPile.
    expect(result.deck.permDiscardPile.some(c => c.id === generic.id)).toBe(true)
  })

  it('removes nothing when only a prep carrier exists in the deck', () => {
    const carrier = THREAT_CARDS.find(c => c.id === 'what_was_already_read')!
    const deckBefore = {
      drawPile: [carrier],
      discardPile: [],
      nextCycleQueue: [],
      permDiscardPile: [],
    }
    const result = applyEffect({ type: 'removeRandomThreat' }, deckBefore, /* …context */)
    expect(result.deck.drawPile.some(c => c.id === 'what_was_already_read')).toBe(true)
    expect(result.deck.permDiscardPile.length).toBe(0)
  })
})
```

**Note for engineer:** the exact `applyEffect` signature and how to invoke it from tests may differ. Search `gameStore.test.ts` for an existing `removeRandomThreat` test — it almost certainly exists (the option was added in P16-17). Mirror its setup exactly; the difference is just the carrier-exclusion assertion.

### - [ ] Step 2: Run tests and verify they fail

```bash
npx vitest run src/state/gameStore.test.ts -t 'removeRandomThreat excludes prep carriers'
```

Expected: at least the first test fails (today the carrier CAN be removed).

### - [ ] Step 3: Add the import + derived set to `gameLoop.ts`

At the top of `src/engine/gameLoop.ts`, add the import alongside the existing card-data imports:

```ts
import { PREP_TAG_CARRIERS } from '../data/godPaths/prepTagCarriers'
```

Below the imports, at module scope, derive the set once:

```ts
// S4: prep carriers are excluded from removeRandomThreat targeting so the
// prep route survives "Have him followed" / similar effects.
const PREP_CARRIER_IDS: ReadonlySet<CardId> = new Set(
  Object.values(PREP_TAG_CARRIERS).flat().map(c => c.cardId)
)
```

If `CardId` isn't already imported in `gameLoop.ts`, add it to the existing types import.

### - [ ] Step 4: Extend the filter in the `removeRandomThreat` case

Locate the case body (~line 328–343). Modify the `.filter(...)` to:

```ts
.filter(({ card }) =>
  card.tier === 'threat'
  && !card.permanent
  && !PREP_CARRIER_IDS.has(card.id)
)
```

### - [ ] Step 5: Run the new tests and verify they pass

```bash
npx vitest run src/state/gameStore.test.ts -t 'removeRandomThreat excludes prep carriers'
```

Expected: both tests pass.

### - [ ] Step 6: Run full vitest + typecheck

```bash
npx vitest run && npx tsc --noEmit
```

Expected: all tests pass; no type errors.

### - [ ] Step 7: Commit

```bash
git add src/engine/gameLoop.ts src/state/gameStore.test.ts
git commit -m "feat(engine): exclude prep carriers from removeRandomThreat (S4, EX-G1-06)

removeRandomThreat now silently skips any card whose id appears in
PREP_TAG_CARRIERS (currently only what_was_already_read; future-proofs
if more carrier-threats are added). No UI signal — the option still
works on any non-carrier threat in the deck.

This protects the recited prep route from being silently deleted by
'Have him followed' (stranger_asks_questions -2g). Previously the
vet had to refuse this option to preserve the route, which was only
knowable via source-reading.

Closes EX-G1-06."
```

---

## Task 3: S5 — Hover tooltip on dread-condition pill

**Files:**
- Modify: `src/components/game/OptionsColumn.tsx` (~line 163)
- Test (optional): UI render test if project tooling supports it

### - [ ] Step 1: Locate the existing dread-condition pill

Open `src/components/game/OptionsColumn.tsx`. Around line 162–172, find the JSX block:

```tsx
return dreadConds.map((h, i) => (
  <span key={`dcond-${i}`} style={{
    display: 'inline-flex', alignItems: 'center', gap: '2px',
    fontSize: '0.78rem', color: 'rgba(180,80,80,0.8)',
    padding: '0.1rem 0.35rem', borderRadius: '2px',
    border: '1px solid rgba(180,80,80,0.3)',
  }}>
    {DreadIcon && <DreadIcon />}{h.op === '>=' ? '≥' : '≤'}{h.value}
  </span>
))
```

### - [ ] Step 2: Add the `title` attribute

Modify the `<span>` to include a `title` attribute computed from the comparator:

```tsx
return dreadConds.map((h, i) => (
  <span
    key={`dcond-${i}`}
    title={h.op === '>=' ? `Unlocks at Dread ≥ ${h.value}` : `Hidden when Dread > ${h.value}`}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '2px',
      fontSize: '0.78rem', color: 'rgba(180,80,80,0.8)',
      padding: '0.1rem 0.35rem', borderRadius: '2px',
      border: '1px solid rgba(180,80,80,0.3)',
    }}
  >
    {DreadIcon && <DreadIcon />}{h.op === '>=' ? '≥' : '≤'}{h.value}
  </span>
))
```

### - [ ] Step 3: Manual smoke test

```bash
npm run dev
```

Open the running app. Start a Y'ha-nthlei run, trigger `what_was_already_read` (burn the Old Book early), reach dread < 6 so "The words arrange themselves" is locked. Hover the dread pill on that option. Expected tooltip: `Unlocks at Dread ≥ 6`. Drop dread to ≤ 5 and hover the dread pill on "Acknowledge it" or "File it away". Expected tooltip: `Hidden when Dread > 5`.

### - [ ] Step 4: Run typecheck + vitest

```bash
npx tsc --noEmit && npx vitest run
```

Expected: clean.

### - [ ] Step 5: Commit

```bash
git add src/components/game/OptionsColumn.tsx
git commit -m "feat(ui): dread-condition pill hover tooltip (S5)

Adds a title attribute to the existing dread-condition pill rendered
on locked options. Hover/long-press reveals 'Unlocks at Dread ≥ N'
for resourceMin gates and 'Hidden when Dread > N' for resourceMax
gates. No visual change; preserves symmetry with the affordability
shortfall pill alongside it.

Pairs with S3 (recited dread gate lowered to 6): a player who sees
the locked 'Words' option can hover to learn it unlocks at dread ≥ 6
instead of guessing from the bare icon."
```

---

## Task 4: Self-check & wrap

### - [ ] Step 1: Full vitest + typecheck

```bash
npx vitest run && npx tsc --noEmit
```

Expected: 77 (pre-existing) + 5 (new) = 82 tests pass; typecheck clean.

### - [ ] Step 2: Verify git log

```bash
git log --oneline -3
```

Expected three commits in order:
1. `feat(yha): lower recited dread gate from 8 to 6 (S3, EX-G1-02)`
2. `feat(engine): exclude prep carriers from removeRandomThreat (S4, EX-G1-06)`
3. `feat(ui): dread-condition pill hover tooltip (S5)`

### - [ ] Step 3: Do NOT push

Per CLAUDE.md standing rule, leave commits local. The user pushes manually when ready.

### - [ ] Step 4: Report back

Summarise: closed EX-G1-02 + EX-G1-06; S5 wording shipped as hover tooltip. Flag the side-effect partial close of G1-01 / EX-G1-01 for the next playtest balance review.

---

## Spec Coverage Self-Check

- ✅ S3 condition edits — Task 1 Step 3 (all three condition changes)
- ✅ S3 tests at boundary values D=4/5/6 — Task 1 Step 1 (three test cases)
- ✅ S4 filter extension using PREP_TAG_CARRIERS — Task 2 Steps 3–4
- ✅ S4 test (carrier preserved when other threats exist) — Task 2 Step 1
- ✅ S5 tooltip wording "Unlocks at Dread ≥ N" — Task 3 Step 2
- ✅ S5 symmetric wording for resourceMax — Task 3 Step 2
- ✅ Acceptance: 77→82 vitest pass, typecheck clean — Task 4 Step 1
- ✅ Acceptance: manual smoke check — Task 3 Step 3

## Out of Scope (deferred to follow-up brainstorms)

- S2 — Run-end "What you missed" reflection screen
- Broader S5 — dread-tug preview pills on every option (not just locked)
- Additional `+1 I` on recited bonus — already shipped in `65d9e3f` (s88), do not re-tune until playtest
