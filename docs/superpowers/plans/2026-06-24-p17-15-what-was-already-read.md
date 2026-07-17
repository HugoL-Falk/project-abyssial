# What Was Already Read Redesign (P17-15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `what_was_already_read` into a clean two-option dread-split that always shows both options (disabled when gated), self-removes on recite, and stops nagging; remove the clickable-looking border on the dread-condition pill.

**Architecture:** Pure card-data change in `threats.ts` + one style line in `OptionsColumn.tsx` + rewritten test block. No engine changes — `getVisibleOptions` already renders condition-failed options as `available:false` (disabled) unless `hideWhenUnavailable`.

**Tech Stack:** TypeScript, React, Vitest.

## Global Constraints

- Tests: `npx vitest run` must stay green; `npx tsc --noEmit` clean.
- Git: local commits only, never push.
- Card remains a `recited` carrier (auto-derived from `setPrepTag recited`).

---

### Task 1: Redesign the card data

**Files:**
- Modify: `src/data/cards/threats.ts:858-891` (options array of `what_was_already_read`)

- [ ] **Step 1: Replace the three options with two.**

```ts
    options: [
      {
        label: 'Set it aside',
        flavourText: 'You shelve it, spine out, where you will not meet its gaze. It waits. So do you.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMax', resource: 'dread', max: 5 },
      },
      {
        label: 'The words arrange themselves',
        flavourText: 'At the edge of collapse, the text completes its purpose. The path advances.',
        effects: [
          { type: 'setPrepTag', tag: 'recited' },
          { type: 'removeCard', cardId: 'what_was_already_read' },
        ],
        condition: { type: 'resourceMin', resource: 'dread', min: 6 },
      },
    ],
```

- [ ] **Step 2: Verify typecheck.**

Run: `npx tsc --noEmit`
Expected: no errors.

---

### Task 2: Rewrite the card's test block

**Files:**
- Modify: `src/state/gameStore.test.ts:1450-1498` (`describe('what_was_already_read dread gate (S3)', ...)`)

- [ ] **Step 1: Replace the describe block.**

```ts
describe('what_was_already_read dread gate (P17-15)', () => {
  const card = THREAT_CARDS.find(c => c.id === 'what_was_already_read')!

  it('shows both options always (none hidden), regardless of dread', () => {
    useGameStore.setState({ resources: { gold: 10, followers: 5, influence: 5, dread: 3, relics: 0, theChanged: 0 } })
    const opts = useGameStore.getState().getVisibleOptions(card)
    const visible = opts.filter(o => !o.hidden).map(o => o.option.label)
    expect(visible).toEqual(expect.arrayContaining(['Set it aside', 'The words arrange themselves']))
  })

  it('only "Set it aside" available at dread <= 5', () => {
    useGameStore.setState({ resources: { gold: 10, followers: 5, influence: 5, dread: 5, relics: 0, theChanged: 0 } })
    const opts = useGameStore.getState().getVisibleOptions(card)
    const available = opts.filter(o => o.available).map(o => o.option.label)
    expect(available).toContain('Set it aside')
    expect(available).not.toContain('The words arrange themselves')
  })

  it('only "The words arrange themselves" available at dread >= 6', () => {
    useGameStore.setState({ resources: { gold: 10, followers: 5, influence: 5, dread: 6, relics: 0, theChanged: 0 } })
    const opts = useGameStore.getState().getVisibleOptions(card)
    const available = opts.filter(o => o.available).map(o => o.option.label)
    expect(available).toContain('The words arrange themselves')
    expect(available).not.toContain('Set it aside')
  })
})
```

- [ ] **Step 2: Run the block, expect pass.**

Run: `npx vitest run src/state/gameStore.test.ts`
Expected: PASS (no remaining references to "File it away" / "Acknowledge it").

---

### Task 3: Remove the dread-condition pill border

**Files:**
- Modify: `src/components/game/OptionsColumn.tsx:168-173` (dread-condition pill `<span>` style)

- [ ] **Step 1: Drop the `border` line from the dread pill style only.**

Change the dread-condition pill style object from:

```ts
                    padding: '0.1rem 0.35rem', borderRadius: '2px',
                    border: '1px solid rgba(180,80,80,0.3)',
```
to:
```ts
                    padding: '0.1rem 0.35rem', borderRadius: '2px',
```

(Leave the affordability-shortfall pill border at lines ~201-202 unchanged.)

- [ ] **Step 2: Verify typecheck + full test run.**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean typecheck, all tests pass.

- [ ] **Step 3: Commit.**

```bash
git add src/data/cards/threats.ts src/state/gameStore.test.ts src/components/game/OptionsColumn.tsx
git commit -m "feat(cards): redesign What Was Already Read; borderless dread pill (P17-15)"
```
