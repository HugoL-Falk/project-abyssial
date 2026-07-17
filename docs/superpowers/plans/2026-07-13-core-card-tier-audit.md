# Core Card Tier Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply core card tier audit decisions — fix two D-s150-1 treat/threat violations, enrich five underpowered cards, and update one treat card.

**Architecture:** Card data only. All changes are in `src/data/cards/core.ts` and `src/data/cards/treats.ts`. No engine logic changes. Tests written alongside each change in a new file `src/data/cards/core-audit.test.ts`.

**Tech Stack:** TypeScript, Vitest

## Global Constraints

- Option flavour text ≤ 80 characters (P20-G / D-2026-06-25)
- Card body flavour text ≤ 108 characters (P20-G / D-2026-06-25)
- All `randomOutcome` branches must use `weight: 1` (D-s148-1)
- Spec: `docs/superpowers/specs/2026-07-13-core-card-tier-audit-design.md`
- Run all tests: `npx vitest run` from repo root
- Run single file: `npx vitest run src/data/cards/core-audit.test.ts`
- Git: always `-C "E:/Project Abyssial/Code/project-abyssial"` (E: drive unreachable on laptop — commit from desktop)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/data/cards/treats.ts` | Modify | `a_useful_contact` opt3: remove investigators_file mechanic, add dread-2 |
| `src/data/cards/core.ts` | Modify | 7 cards across 13 option-level changes (see tasks below) |
| `src/data/cards/core-audit.test.ts` | Create | New test file — one describe block per card changed |

---

### Task 1: treats.ts — a_useful_contact opt3

**Files:**
- Modify: `src/data/cards/treats.ts`
- Create: `src/data/cards/core-audit.test.ts`

**What:** opt3 "Have a file buried" currently gates on `hasCard(investigators_file)` and removes it at dread-1. Change to always-available dread-2 option. Removes situational complexity with low payoff; makes the treat's three paths clean: followers+2, gold+2, dread-2.

- [ ] **Step 1: Create test file with failing test**

Create `src/data/cards/core-audit.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { CORE_CARDS } from './core'
import { TREAT_CARDS } from './treats'
import type { Card } from '../../types'

const coreCard = (id: string): Card => {
  const c = CORE_CARDS.find(c => c.id === id)
  if (!c) throw new Error(`Core card not found: ${id}`)
  return c
}

const treatCard = (id: string): Card => {
  const c = TREAT_CARDS.find(c => c.id === id)
  if (!c) throw new Error(`Treat card not found: ${id}`)
  return c
}

// ─── Task 1: a_useful_contact ────────────────────────────────────────────────

describe('P25 core audit — a_useful_contact (treats.ts)', () => {
  it('opt3 "Have a file buried" gives dread-2 with no condition', () => {
    const card = treatCard('a_useful_contact')
    const opt = card.options[2]
    expect(opt.label).toBe('Have a file buried')
    expect(opt.condition).toBeUndefined()
    expect(opt.hideWhenUnavailable).toBeUndefined()
    expect(opt.effects).toEqual([
      { type: 'resource', resource: 'dread', delta: -2 },
      { type: 'removeCard', cardId: 'a_useful_contact' },
    ])
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```
npx vitest run src/data/cards/core-audit.test.ts
```
Expected: FAIL — `expect(opt.condition).toBeUndefined()` or `delta: -2` mismatch.

- [ ] **Step 3: Edit treats.ts — a_useful_contact opt3**

In `src/data/cards/treats.ts`, find the `a_useful_contact` card's third option and replace it:

Before:
```typescript
      {
        label: 'Have a file buried',
        flavourText: 'The file is misfiled. In a drawer. In a filing cabinet. In a warehouse.',
        // P20-O: hide when investigators_file not in deck so purge tag doesn't show as dead weight.
        hideWhenUnavailable: true,
        condition: { type: 'hasCard', cardId: 'investigators_file' },
        effects: [
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'removeCard', cardId: 'investigators_file' },
          { type: 'removeCard', cardId: 'a_useful_contact' },
        ],
      },
```

After:
```typescript
      {
        // P25 audit: removed investigators_file mechanic — clean dread-2 always available.
        label: 'Have a file buried',
        flavourText: 'The file is misfiled. In a drawer. In a filing cabinet. In a warehouse.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -2 },
          { type: 'removeCard', cardId: 'a_useful_contact' },
        ],
      },
```

- [ ] **Step 4: Run test — expect PASS**

```
npx vitest run src/data/cards/core-audit.test.ts
```
Expected: PASS.

- [ ] **Step 5: Run full suite — expect no regressions**

```
npx vitest run
```
Expected: all tests pass (250+).

- [ ] **Step 6: Commit**

```
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/treats.ts src/data/cards/core-audit.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(cards): P25 audit — a_useful_contact opt3 dread-2, remove investigators_file gate"
```

---

### Task 2: core.ts — The Séance opt2 (treat rule fix)

**Files:**
- Modify: `src/data/cards/core.ts`
- Modify: `src/data/cards/core-audit.test.ts`

**What:** opt2 "Let them do it alone" currently gives followers+1 then inserts `wandering_soul` (treat). Net positive + treat = D-s150-1 violation. Change followers delta from +1 to -1: one follower was consumed by what came through.

- [ ] **Step 1: Add failing test**

Append to `src/data/cards/core-audit.test.ts`:

```typescript
// ─── Task 2: the_seance ──────────────────────────────────────────────────────

describe('P25 core audit — the_seance', () => {
  it('opt2 "Let them do it alone" costs followers-1 before inserting wandering_soul (treat fix)', () => {
    const card = coreCard('the_seance')
    const opt = card.options[1]
    expect(opt.label).toBe('Let them do it alone')
    const followerEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'followers'
    )
    expect(followerEffect).toEqual({ type: 'resource', resource: 'followers', delta: -1 })
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```
npx vitest run src/data/cards/core-audit.test.ts
```
Expected: FAIL — `delta: -1` does not match current `delta: 1`.

- [ ] **Step 3: Edit core.ts — the_seance opt2**

In `src/data/cards/core.ts`, find the `the_seance` card's second option and change `followers` delta:

Before:
```typescript
      {
        label: 'Let them do it alone',
        flavourText: 'They were enthusiastic. Something came through. It has not left.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'insertCard', cardId: 'wandering_soul', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
```

After:
```typescript
      {
        // P25 audit: followers+1 → -1 (treat rule fix — net positive + treat violated D-s150-1).
        label: 'Let them do it alone',
        flavourText: 'They were enthusiastic. Something came through. It has not left.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'insertCard', cardId: 'wandering_soul', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
```

- [ ] **Step 4: Run test — expect PASS**

```
npx vitest run src/data/cards/core-audit.test.ts
```

- [ ] **Step 5: Run full suite**

```
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/core.ts src/data/cards/core-audit.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(cards): P25 audit — seance opt2 followers+1→-1 (D-s150-1 treat fix)"
```

---

### Task 3: core.ts — The Printing Press opt3 fix + opt4 removal

**Files:**
- Modify: `src/data/cards/core.ts`
- Modify: `src/data/cards/core-audit.test.ts`

**What:** opt3 "Forgery work" gives gold-2, dread-2 + inserts `forgers_debt` (treat). Dread relief tips it net positive — D-s150-1 violation. Remove dread-2. Also remove opt4 "Offer Workers" per PT25.

- [ ] **Step 1: Add failing tests**

Append to `src/data/cards/core-audit.test.ts`:

```typescript
// ─── Task 3: the_printing_press ─────────────────────────────────────────────

describe('P25 core audit — the_printing_press', () => {
  it('has exactly 3 options ("Offer Workers" removed)', () => {
    const card = coreCard('the_printing_press')
    expect(card.options).toHaveLength(3)
  })

  it('opt3 "Forgery work" inserts forgers_debt without dread relief (treat fix)', () => {
    const card = coreCard('the_printing_press')
    const opt = card.options[2]
    expect(opt.label).toBe('Forgery work')
    const dreadEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'dread'
    )
    expect(dreadEffect).toBeUndefined()
    const insertEffect = opt.effects.find(e => e.type === 'insertCard')
    expect(insertEffect).toMatchObject({ type: 'insertCard', cardId: 'forgers_debt' })
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npx vitest run src/data/cards/core-audit.test.ts
```
Expected: FAIL on both tests (4 options exist, dread effect present).

- [ ] **Step 3: Edit core.ts — printing press**

In `src/data/cards/core.ts`, find the `the_printing_press` card. Make two changes:

**Change 1 — opt3, remove dread effect:**

Before:
```typescript
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -2 },
          { type: 'insertCard', cardId: 'forgers_debt', position: 'random', minPos: 4, maxPos: 8 },
        ],
```

After:
```typescript
        effects: [
          // P25 audit: removed dread-2 — dread relief made this net positive + treat (D-s150-1).
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'insertCard', cardId: 'forgers_debt', position: 'random', minPos: 4, maxPos: 8 },
        ],
```

**Change 2 — remove opt4 entirely:**

Delete the entire fourth option object (the one with label `'Offer workers'`):

```typescript
      {
        // P22-P23-34: Add follower-cost option to balance all three.
        label: 'Offer workers',
        flavourText: 'Your people volunteer to help with the print run. They ask no questions. The printer asks no questions.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
```
Remove this block in its entirety so the card has 3 options.

- [ ] **Step 4: Run tests — expect PASS**

```
npx vitest run src/data/cards/core-audit.test.ts
```

- [ ] **Step 5: Run full suite**

```
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/core.ts src/data/cards/core-audit.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(cards): P25 audit — printing press opt3 dread fix + remove opt4 (D-s150-1 + PT25)"
```

---

### Task 4: core.ts — The Academic Society opt1

**Files:**
- Modify: `src/data/cards/core.ts`
- Modify: `src/data/cards/core-audit.test.ts`

**What:** opt1 currently gives gold-1, influence+1 then inserts `a_useful_contact` (treat). The influence gain makes it borderline net positive before the treat. Change influence delta to -1: attending as a civilian costs standing but earns a contact.

- [ ] **Step 1: Add failing test**

Append to `src/data/cards/core-audit.test.ts`:

```typescript
// ─── Task 4: academic_society ────────────────────────────────────────────────

describe('P25 core audit — academic_society', () => {
  it('opt1 "Attend as a civilian" costs influence-1 (not +1)', () => {
    const card = coreCard('academic_society')
    const opt = card.options[0]
    expect(opt.label).toBe('Attend as a civilian')
    const infEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'influence'
    )
    expect(infEffect).toEqual({ type: 'resource', resource: 'influence', delta: -1 })
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```
npx vitest run src/data/cards/core-audit.test.ts
```
Expected: FAIL — `delta: -1` does not match current `delta: 1`.

- [ ] **Step 3: Edit core.ts — academic_society opt1**

In `src/data/cards/core.ts`, find the `academic_society` card's first option:

Before:
```typescript
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'a_useful_contact', position: 'random', minPos: 4, maxPos: 8 },
        ],
```

After:
```typescript
        effects: [
          // P25 audit: influence+1 → -1 (borderline treat rule; attending as civilian costs standing).
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'insertCard', cardId: 'a_useful_contact', position: 'random', minPos: 4, maxPos: 8 },
        ],
```

- [ ] **Step 4: Run test — expect PASS**

```
npx vitest run src/data/cards/core-audit.test.ts
```

- [ ] **Step 5: Run full suite**

```
npx vitest run
```

- [ ] **Step 6: Commit**

```
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/core.ts src/data/cards/core-audit.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(cards): P25 audit — academic_society opt1 influence+1→-1"
```

---

### Task 5: core.ts — Local Elections (opt2 + opt3)

**Files:**
- Modify: `src/data/cards/core.ts`
- Modify: `src/data/cards/core-audit.test.ts`

**What:** opts 1 and 2 both insert `political_debt` — reduces felt choice weight. Fix: opt2 drops the insert (quiet backing = no formal obligation). opt3 rewritten from "Stay out" (followers-1, dread+1) to "Redirect them" (followers-1, influence+1) — staying out conspicuously while steering your people reads as principled.

- [ ] **Step 1: Add failing tests**

Append to `src/data/cards/core-audit.test.ts`:

```typescript
// ─── Task 5: local_elections ─────────────────────────────────────────────────

describe('P25 core audit — local_elections', () => {
  it('opt2 "Back them quietly" does not insert political_debt', () => {
    const card = coreCard('local_elections')
    const opt = card.options[1]
    expect(opt.label).toBe('Back them quietly')
    const insertEffect = opt.effects.find(e => e.type === 'insertCard')
    expect(insertEffect).toBeUndefined()
  })

  it('opt3 is "Redirect them" with followers-1 and influence+1', () => {
    const card = coreCard('local_elections')
    const opt = card.options[2]
    expect(opt.label).toBe('Redirect them')
    expect(opt.effects).toEqual([
      { type: 'resource', resource: 'followers', delta: -1 },
      { type: 'resource', resource: 'influence', delta: 1 },
    ])
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npx vitest run src/data/cards/core-audit.test.ts
```
Expected: both tests fail.

- [ ] **Step 3: Edit core.ts — local_elections**

**Change 1 — opt2, remove insertCard:**

Before:
```typescript
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'insertCard', cardId: 'political_debt', position: 'random', minPos: 5, maxPos: 9 },
        ],
```

After:
```typescript
        effects: [
          // P25 audit: removed political_debt insert — quiet backing leaves no formal obligation.
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
```

**Change 2 — opt3, full rewrite:**

Before:
```typescript
      {
        // P22-P23-30: Add follower cost and dread.
        label: 'Stay out',
        flavourText: 'Neutrality is also a position. You are aware of its cost.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

After:
```typescript
      {
        // P25 audit: rewritten — "Stay out" flat dread+1 replaced with "Redirect them"
        // (followers-1, influence+1). Staying out while steering your people reads as principled.
        label: 'Redirect them',
        flavourText: 'You find them other priorities. The ward notices your discretion.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
      },
```

- [ ] **Step 4: Run tests — expect PASS**

```
npx vitest run src/data/cards/core-audit.test.ts
```

- [ ] **Step 5: Run full suite**

```
npx vitest run
```

- [ ] **Step 6: Commit**

```
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/core.ts src/data/cards/core-audit.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(cards): P25 audit — local_elections opt2 drop insert, opt3 redirect"
```

---

### Task 6: core.ts — A Follower Confesses Doubt (opt2 bait + new opt3)

**Files:**
- Modify: `src/data/cards/core.ts`
- Modify: `src/data/cards/core-audit.test.ts`

**What:** opt2 inserts `loose_end` (threat) with no bait — Pattern A violation. Add gold+1. Also add a third option: dark exploitation path — sacrifice follower, gold, influence for a relic.

- [ ] **Step 1: Add failing tests**

Append to `src/data/cards/core-audit.test.ts`:

```typescript
// ─── Task 6: follower_confesses_doubt ────────────────────────────────────────

describe('P25 core audit — follower_confesses_doubt', () => {
  it('opt2 "Offer tea" includes gold+1 bait before inserting loose_end', () => {
    const card = coreCard('follower_confesses_doubt')
    const opt = card.options[1]
    expect(opt.label).toBe('Offer tea. Not another word.')
    const goldEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'gold'
    )
    expect(goldEffect).toEqual({ type: 'resource', resource: 'gold', delta: 1 })
    const insertEffect = opt.effects.find(e => e.type === 'insertCard')
    expect(insertEffect).toMatchObject({ cardId: 'loose_end' })
  })

  it('has a third option "The doubt has a use" costing followers/gold/influence for a relic', () => {
    const card = coreCard('follower_confesses_doubt')
    expect(card.options).toHaveLength(3)
    const opt = card.options[2]
    expect(opt.label).toBe('The doubt has a use')
    expect(opt.effects).toEqual([
      { type: 'resource', resource: 'followers', delta: -1 },
      { type: 'resource', resource: 'gold', delta: -1 },
      { type: 'resource', resource: 'influence', delta: -1 },
      { type: 'resource', resource: 'relics', delta: 1 },
    ])
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npx vitest run src/data/cards/core-audit.test.ts
```
Expected: both tests fail (no gold effect on opt2, no opt3).

- [ ] **Step 3: Edit core.ts — follower_confesses_doubt**

**Change 1 — opt2, add gold+1 bait:**

Before:
```typescript
      {
        label: 'Offer tea. Not another word.',
        flavourText: 'They go. You watch them go. Quiet people become loud problems.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'insertCard', cardId: 'loose_end', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
```

After:
```typescript
      {
        // P25 audit: added gold+1 Pattern A bait — they left something on the table on the way out.
        label: 'Offer tea. Not another word.',
        flavourText: 'They go. You watch them go. Quiet people become loud problems.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'insertCard', cardId: 'loose_end', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
```

**Change 2 — add opt3 after opt2:**

```typescript
      {
        // P25 audit: new option — dark exploitation path. Converts doubt into a ritual resource.
        label: 'The doubt has a use',
        flavourText: 'It took all three to arrange. The doubt resolved itself.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
        condition: { type: 'and', conditions: [
          { type: 'resourceMin', resource: 'followers', min: 1 },
          { type: 'resourceMin', resource: 'gold', min: 1 },
          { type: 'resourceMin', resource: 'influence', min: 1 },
        ]},
      },
```

- [ ] **Step 4: Run tests — expect PASS**

```
npx vitest run src/data/cards/core-audit.test.ts
```

- [ ] **Step 5: Run full suite**

```
npx vitest run
```

- [ ] **Step 6: Commit**

```
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/core.ts src/data/cards/core-audit.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(cards): P25 audit — follower_confesses_doubt opt2 bait + new opt3"
```

---

### Task 7: core.ts — Supplies Dwindle (opts 1–3)

**Files:**
- Modify: `src/data/cards/core.ts`
- Modify: `src/data/cards/core-audit.test.ts`

**What:** opts 1–2 are plain resource swaps — weak for a core card. Enrich: opt1 adds influence+1 (visible generosity), opt2 becomes a randomOutcome (foragers might find something disturbing), opt3 bait reduced from influence+3 to +2.

- [ ] **Step 1: Add failing tests**

Append to `src/data/cards/core-audit.test.ts`:

```typescript
// ─── Task 7: supplies_dwindle ────────────────────────────────────────────────

describe('P25 core audit — supplies_dwindle', () => {
  it('opt1 "Spend on provisions" includes influence+1', () => {
    const card = coreCard('supplies_dwindle')
    const opt = card.options[0]
    expect(opt.label).toBe('Spend on provisions')
    const infEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'influence'
    )
    expect(infEffect).toEqual({ type: 'resource', resource: 'influence', delta: 1 })
  })

  it('opt2 "Send foragers" uses equal-weight randomOutcome (two branches, weight:1 each)', () => {
    const card = coreCard('supplies_dwindle')
    const opt = card.options[1]
    const rng = opt.effects.find(e => e.type === 'randomOutcome') as any
    expect(rng).toBeDefined()
    expect(rng.outcomes).toHaveLength(2)
    expect(rng.outcomes[0].weight).toBe(1)
    expect(rng.outcomes[1].weight).toBe(1)
  })

  it('opt3 "Frame as spiritual discipline" gives influence+2 (reduced from +3)', () => {
    const card = coreCard('supplies_dwindle')
    const opt = card.options[2]
    const infEffect = opt.effects.find(
      e => e.type === 'resource' && (e as any).resource === 'influence'
    )
    expect(infEffect).toEqual({ type: 'resource', resource: 'influence', delta: 2 })
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npx vitest run src/data/cards/core-audit.test.ts
```
Expected: all three fail.

- [ ] **Step 3: Edit core.ts — supplies_dwindle**

**Change 1 — opt1, add influence+1:**

Before:
```typescript
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
```

After:
```typescript
        effects: [
          // P25 audit: added influence+1 — visible charity builds public standing.
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
```

**Change 2 — opt2, convert to randomOutcome:**

Before:
```typescript
      {
        label: 'Send foragers',
        flavourText: 'They find enough. The process is not dignified.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'gold', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
```

After:
```typescript
      {
        // P25 audit: converted to randomOutcome — foragers might find something out there.
        label: 'Send foragers',
        flavourText: 'They find enough. The process is not dignified.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'randomOutcome', outcomes: [
            {
              weight: 1,
              effects: [{ type: 'resource', resource: 'gold', delta: 1 }],
              flavourText: 'They return with enough. No one asks what enough means.',
            },
            {
              weight: 1,
              effects: [
                { type: 'resource', resource: 'gold', delta: 1 },
                { type: 'resource', resource: 'dread', delta: 1 },
              ],
              flavourText: 'They return with enough. One of them has stopped speaking.',
            },
          ]},
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
```

**Change 3 — opt3, reduce influence+3 → +2:**

Before:
```typescript
        effects: [
          { type: 'resource', resource: 'influence', delta: 3 },
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'insertCard', cardId: 'desperate_congregation', position: 'random', minPos: 4, maxPos: 8 },
        ],
```

After:
```typescript
        effects: [
          // P25 audit: influence+3 → +2 — bait was over-generous for a single threat insert.
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'insertCard', cardId: 'desperate_congregation', position: 'random', minPos: 4, maxPos: 8 },
        ],
```

- [ ] **Step 4: Run tests — expect PASS**

```
npx vitest run src/data/cards/core-audit.test.ts
```

- [ ] **Step 5: Run full suite**

```
npx vitest run
```

- [ ] **Step 6: Commit**

```
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/core.ts src/data/cards/core-audit.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(cards): P25 audit — supplies_dwindle opt1 influence, opt2 randomOutcome, opt3 bait trim"
```

---

### Task 8: core.ts — Woodcutter's Report opt2

**Files:**
- Modify: `src/data/cards/core.ts`
- Modify: `src/data/cards/core-audit.test.ts`

**What:** opt2 "Decline" is a flat influence+1/dread+1 swap — no hook for a few-shot card. Rewrite as "Buy the rumour, not the map": gold-1, influence+2. You buy the story and spend it socially without going to the grove. Distinct from opt1 (map + randomOutcome), costs gold, gated on gold≥1.

- [ ] **Step 1: Add failing test**

Append to `src/data/cards/core-audit.test.ts`:

```typescript
// ─── Task 8: woodcutters_report ──────────────────────────────────────────────

describe('P25 core audit — woodcutters_report', () => {
  it('opt2 is "Buy the rumour, not the map" with gold-1, influence+2, gated on gold≥1', () => {
    const card = coreCard('woodcutters_report')
    const opt = card.options[1]
    expect(opt.label).toBe('Buy the rumour, not the map')
    expect(opt.effects).toEqual([
      { type: 'resource', resource: 'gold', delta: -1 },
      { type: 'resource', resource: 'influence', delta: 2 },
    ])
    expect(opt.condition).toEqual({ type: 'resourceMin', resource: 'gold', min: 1 })
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```
npx vitest run src/data/cards/core-audit.test.ts
```
Expected: FAIL — label and effects don't match.

- [ ] **Step 3: Edit core.ts — woodcutters_report opt2**

Before:
```typescript
      {
        label: 'Decline',
        flavourText: "He shrugs. He'll find a buyer.",
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

After:
```typescript
      {
        // P25 audit: "Decline" flat swap replaced with "Buy the rumour" — you buy the
        // story and spend it socially without going to the grove. Distinct from opt1.
        label: 'Buy the rumour, not the map',
        flavourText: "You pay for the story. It travels well. The grove stays where it is.",
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
```

- [ ] **Step 4: Run test — expect PASS**

```
npx vitest run src/data/cards/core-audit.test.ts
```

- [ ] **Step 5: Run full suite — final green bar**

```
npx vitest run
```
Expected: all tests pass. Note final count in output.

- [ ] **Step 6: Commit**

```
git -C "E:/Project Abyssial/Code/project-abyssial" add src/data/cards/core.ts src/data/cards/core-audit.test.ts
git -C "E:/Project Abyssial/Code/project-abyssial" commit -m "balance(cards): P25 audit — woodcutters_report opt2 rewrite"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] a_useful_contact opt3 dread-2 / no condition — Task 1
- [x] the_seance opt2 followers-1 — Task 2
- [x] the_printing_press opt3 no dread, opt4 removed — Task 3
- [x] academic_society opt1 influence-1 — Task 4
- [x] local_elections opt2 no insert, opt3 "Redirect them" — Task 5
- [x] follower_confesses_doubt opt2 gold+1, new opt3 — Task 6
- [x] supplies_dwindle all three opts — Task 7
- [x] woodcutters_report opt2 rewrite — Task 8
- [x] No new engine logic required — confirmed, card data only

**Placeholder scan:** None found — all steps contain exact code.

**Type consistency:** `coreCard()` and `treatCard()` helpers defined once in Task 1, reused across all tasks. Effect type assertions use `(e as any).resource` to avoid narrowing issues on the union type.
