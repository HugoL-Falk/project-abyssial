# P25-43 — Merchant Again Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance the `the_merchant_again` mutation chain by strengthening the cursed_object chain payoffs and retuning opt3.

**Architecture:** Four targeted line-edits across two card data files (`mutations.ts`, `treats.ts`). No engine changes. No new card IDs. Tests added to `mutations.test.ts` and `rare-audit.test.ts`.

**Tech Stack:** TypeScript, Vitest

## Global Constraints

- Flavour cap: option flavour ≤ 80 chars, body ≤ 108 chars (tutorial.ts exempt)
- No new card IDs introduced
- No engine changes
- All tests run via: `npx vitest run` from repo root
- Git repo: `C:/Project Abyssial/Code/project-abyssial`

---

### Task 1: Retune `the_merchant_again` opt3

**Files:**
- Modify: `src/data/cards/mutations.ts` (opt3 effects block, ~lines 260–263)
- Test: `src/data/cards/mutations.test.ts`

**Interfaces:**
- Produces: opt3 effects = `[relics+1, dread+3, inf+1, insertCard changed_follower pos 3–7]`

- [ ] **Step 1: Write the failing test**

Add to `src/data/cards/mutations.test.ts`, inside `describe('mutation card data', ...)` or as a new top-level describe:

```typescript
describe('P25-43 — the_merchant_again opt3', () => {
  const card = MUTATION_CARDS.find(c => c.id === 'the_merchant_again')!
  const opt3 = card.options.find(o => o.label === 'Ask where it came from')!

  it('gives relics+1 (not relics+2)', () => {
    expect(opt3.effects).toContainEqual({ type: 'resource', resource: 'relics', delta: 1 })
    expect(opt3.effects).not.toContainEqual({ type: 'resource', resource: 'relics', delta: 2 })
  })

  it('gives inf+1', () => {
    expect(opt3.effects).toContainEqual({ type: 'resource', resource: 'influence', delta: 1 })
  })

  it('gives dread+3', () => {
    expect(opt3.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: 3 })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd "C:/Project Abyssial/Code/project-abyssial"
npx vitest run src/data/cards/mutations.test.ts
```

Expected: FAIL — `relics+2` found, `relics+1` / `influence+1` not found.

- [ ] **Step 3: Edit opt3 in `mutations.ts`**

Find the block at ~line 260:
```typescript
        effects: [
          { type: 'resource', resource: 'relics', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
        ],
```

Replace with:
```typescript
        effects: [
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
        ],
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run src/data/cards/mutations.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/mutations.ts src/data/cards/mutations.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "fix(cards): P25-43 merchant_again opt3 relics+2→+1, add inf+1"
```

---

### Task 2: Retune `cursed_object` Study it cost

**Files:**
- Modify: `src/data/cards/treats.ts` (`cursed_object` Study it effects, ~line 263)
- Test: `src/data/cards/rare-audit.test.ts`

**Interfaces:**
- Produces: `cursed_object` Study it effects = `[dread+3, relics+1]`

- [ ] **Step 1: Write the failing test**

Add to `src/data/cards/rare-audit.test.ts` as a new top-level describe:

```typescript
import { TREAT_CARDS } from './treats'

describe('P25-43 — cursed_object Study it', () => {
  const card = TREAT_CARDS.find(c => c.id === 'cursed_object')!
  const study = card.options.find(o => o.label === 'Study it')!

  it('costs dread+3 (not dread+2)', () => {
    expect(study.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: 3 })
    expect(study.effects).not.toContainEqual({ type: 'resource', resource: 'dread', delta: 2 })
  })

  it('still gives relics+1', () => {
    expect(study.effects).toContainEqual({ type: 'resource', resource: 'relics', delta: 1 })
  })
})
```

Check existing imports at top of `rare-audit.test.ts` — if `TREAT_CARDS` is not already imported, add it. The file likely imports from `./rare` and `./core`; add:
```typescript
import { TREAT_CARDS } from './treats'
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd "C:/Project Abyssial/Code/project-abyssial"
npx vitest run src/data/cards/rare-audit.test.ts
```

Expected: FAIL — `dread+2` found, `dread+3` not found.

- [ ] **Step 3: Edit `treats.ts` cursed_object Study it**

Find the block at ~line 262:
```typescript
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
```

Replace with:
```typescript
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run src/data/cards/rare-audit.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/treats.ts src/data/cards/rare-audit.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "fix(cards): P25-43 cursed_object Study it dread+2→+3"
```

---

### Task 3: Retune `merchant_remembers` payoffs

**Files:**
- Modify: `src/data/cards/treats.ts` (`merchant_remembers` options, ~lines 79–91)
- Test: `src/data/cards/rare-audit.test.ts`

**Interfaces:**
- Produces:
  - "Accept what he sent" effects = `[relics+2, removeCard merchant_remembers]`
  - "Send it back again" effects = `[gold+2, dread−2, removeCard merchant_remembers]`

- [ ] **Step 1: Write the failing tests**

Add to `src/data/cards/rare-audit.test.ts`:

```typescript
describe('P25-43 — merchant_remembers payoffs', () => {
  const card = TREAT_CARDS.find(c => c.id === 'merchant_remembers')!
  const accept = card.options.find(o => o.label === 'Accept what he sent')!
  const sendBack = card.options.find(o => o.label === 'Send it back again')!

  it('Accept gives relics+2 (not followers+2)', () => {
    expect(accept.effects).toContainEqual({ type: 'resource', resource: 'relics', delta: 2 })
    expect(accept.effects).not.toContainEqual({ type: 'resource', resource: 'followers', delta: 2 })
  })

  it('Accept does not give influence+1', () => {
    expect(accept.effects).not.toContainEqual({ type: 'resource', resource: 'influence', delta: 1 })
  })

  it('Send it back gives gold+2 and dread-2', () => {
    expect(sendBack.effects).toContainEqual({ type: 'resource', resource: 'gold', delta: 2 })
    expect(sendBack.effects).toContainEqual({ type: 'resource', resource: 'dread', delta: -2 })
  })

  it('both options still removeCard merchant_remembers', () => {
    expect(accept.effects).toContainEqual({ type: 'removeCard', cardId: 'merchant_remembers' })
    expect(sendBack.effects).toContainEqual({ type: 'removeCard', cardId: 'merchant_remembers' })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd "C:/Project Abyssial/Code/project-abyssial"
npx vitest run src/data/cards/rare-audit.test.ts
```

Expected: FAIL — `followers+2` / `influence+1` found; `relics+2` / `dread-2` not found.

- [ ] **Step 3: Edit `merchant_remembers` Accept option (~lines 77–84)**

Find:
```typescript
      {
        label: 'Accept what he sent',
        flavourText: 'It is, in its way, useful.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'removeCard', cardId: 'merchant_remembers' },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Accept what he sent',
        flavourText: 'It is, in its way, useful.',
        effects: [
          { type: 'resource', resource: 'relics', delta: 2 },
          { type: 'removeCard', cardId: 'merchant_remembers' },
        ],
      },
```

- [ ] **Step 4: Edit `merchant_remembers` Send it back option (~lines 85–92)**

Find:
```typescript
      {
        label: 'Send it back again',
        flavourText: 'He will send something else. He always has something else.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'removeCard', cardId: 'merchant_remembers' },
        ],
      },
```

Replace with:
```typescript
      {
        label: 'Send it back again',
        flavourText: 'He will send something else. He always has something else.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'resource', resource: 'dread', delta: -2 },
          { type: 'removeCard', cardId: 'merchant_remembers' },
        ],
      },
```

- [ ] **Step 5: Run full test suite**

```bash
cd "C:/Project Abyssial/Code/project-abyssial"
npx vitest run
```

Expected: all 331+ tests PASS. No tsc errors beyond pre-existing.

- [ ] **Step 6: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/treats.ts src/data/cards/rare-audit.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "fix(cards): P25-43 merchant_remembers relics+2, send-back dread-2"
```
