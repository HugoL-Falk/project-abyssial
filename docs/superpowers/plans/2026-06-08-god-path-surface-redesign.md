# God Path Surface Mechanic Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken `advanceGodPath` effect on non-chain cards with a new `surfaceGodPathCard` effect that repositions the current pending chain card to appear sooner in the draw pile, and remove the chain-breaking `regressGodPath` effect entirely.

**Architecture:** Four files touched in dependency order: types first (Effect union), then engine (gameStore switch cases), then card data (core.ts, threats.ts). No new files created. Chain card `advanceGodPath` options are untouched — only non-chain-card uses change.

**Tech Stack:** TypeScript. No test framework — verify each task with `npm run typecheck` (runs `tsc --noEmit`). All commits local only.

---

## File Map

| File | Change |
|---|---|
| `src/types/index.ts` | Add `surfaceGodPathCard` to Effect union; remove `regressGodPath` |
| `src/state/gameStore.ts` | Add `case 'surfaceGodPathCard'`; remove `case 'regressGodPath'` |
| `src/data/cards/core.ts` | 3 options: `advanceGodPath` → `surfaceGodPathCard` |
| `src/data/cards/threats.ts` | `what_was_already_read` opt 2: `advanceGodPath` → `surfaceGodPathCard`; `covenant_demands` opt 2: `regressGodPath` → `dread +4` |

---

## Task 1: Update Effect union in `src/types/index.ts`

**Files:**
- Modify: `src/types/index.ts`

The `Effect` union currently looks like this (lines 30–39):

```typescript
  | { type: 'endRun'; reason?: string }
  | { type: 'victory' }
  | { type: 'partialVictory'; god: GodPath }
  | { type: 'advanceGodPath' }
  | { type: 'drawCard'; count: number }
  | { type: 'doomTick' }
  | { type: 'regressGodPath' }
  | { type: 'seedMutations'; count: number }
  | { type: 'surfaceCards'; maxPos: number }
  | { type: 'removeRandomThreat' }
```

- [ ] **Step 1: Add `surfaceGodPathCard`, remove `regressGodPath`**

Replace those lines with:

```typescript
  | { type: 'endRun'; reason?: string }
  | { type: 'victory' }
  | { type: 'partialVictory'; god: GodPath }
  | { type: 'advanceGodPath' }
  | { type: 'surfaceGodPathCard' }
  | { type: 'drawCard'; count: number }
  | { type: 'doomTick' }
  | { type: 'seedMutations'; count: number }
  | { type: 'surfaceCards'; maxPos: number }
  | { type: 'removeRandomThreat' }
```

- [ ] **Step 2: Typecheck**

```bash
cd E:\Project Abyssial\Code\project-abyssial
npm run typecheck
```

Expected: TypeScript errors about `regressGodPath` being used in `gameStore.ts` and `threats.ts` (those files still reference the removed type). That is correct — those are the next tasks. If you see errors about anything *other* than `regressGodPath`, stop and investigate.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(god-path-surface): add surfaceGodPathCard effect type, remove regressGodPath"
```

---

## Task 2: Update engine cases in `src/state/gameStore.ts`

**Files:**
- Modify: `src/state/gameStore.ts`

**Context:** The switch statement inside `resolveOption` processes effects. The existing `case 'advanceGodPath'` (lines 625–657) handles chain stage completion — **do not touch it**. You are adding a new case and removing an existing one.

The `case 'regressGodPath'` block (lines 663–666) currently reads:

```typescript
        case 'regressGodPath': {
          godPathProgress = Math.max(0, godPathProgress - 1)
          break
        }
```

- [ ] **Step 1: Add `case 'surfaceGodPathCard'` immediately after `case 'advanceGodPath'`**

Insert this block after the closing `}` of `case 'advanceGodPath'` (after line 657) and before `case 'doomTick'`:

```typescript
        case 'surfaceGodPathCard': {
          // Find the first pending chain card in the draw pile and pull it to position 2
          // (3rd card from top), so the player sees it within the next few draws.
          // No-op if: no god_path card in drawPile, or it's already at index 0–2.
          const gpIdx = deck.drawPile.findIndex(c => c.tier === 'god_path')
          if (gpIdx > 2) {
            const card = deck.drawPile[gpIdx]
            const newPile = [...deck.drawPile]
            newPile.splice(gpIdx, 1)
            newPile.splice(2, 0, card)
            deck = { ...deck, drawPile: newPile }
          }
          break
        }
```

- [ ] **Step 2: Remove `case 'regressGodPath'`**

Delete this block entirely:

```typescript
        case 'regressGodPath': {
          godPathProgress = Math.max(0, godPathProgress - 1)
          break
        }
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: Errors only about `regressGodPath` still referenced in `src/data/cards/threats.ts`. If errors appear anywhere else, stop and investigate.

- [ ] **Step 4: Commit**

```bash
git add src/state/gameStore.ts
git commit -m "feat(god-path-surface): add surfaceGodPathCard engine case, remove regressGodPath case"
```

---

## Task 3: Update `src/data/cards/core.ts` — three options

**Files:**
- Modify: `src/data/cards/core.ts`

Three options currently have `{ type: 'advanceGodPath' }` that must become `{ type: 'surfaceGodPathCard' }`. Each is the advance option on a core card (not a chain card — chain card advance options must NOT be changed).

**`the_old_book` — "Hire a translator" (around line 187–195)**

Current effects array:
```typescript
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'advanceGodPath' },
        ],
```

Replace with:
```typescript
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'surfaceGodPathCard' },
        ],
```

**`the_opium_den` — "Encourage the visits" (around line 480–489)**

Current effects array:
```typescript
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'advanceGodPath' },
        ],
```

Replace with:
```typescript
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'surfaceGodPathCard' },
        ],
```

**`the_seance` — "Attend and steer" (around line 588–601)**

Current effects array:
```typescript
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'advanceGodPath' },
        ],
```

Replace with:
```typescript
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'surfaceGodPathCard' },
        ],
```

- [ ] **Step 1: Make all three replacements**

Use search for `{ type: 'advanceGodPath' }` in `core.ts` to locate each. There should be exactly **3 matches** in this file. Replace all three.

- [ ] **Step 2: Verify no `advanceGodPath` remains in core.ts**

```bash
grep -n "advanceGodPath" src/data/cards/core.ts
```

Expected: no output. If any lines appear, a chain card advance option was accidentally changed — revert that one.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: Errors only about `regressGodPath` still in `threats.ts`. No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/core.ts
git commit -m "feat(god-path-surface): replace advanceGodPath with surfaceGodPathCard on 3 core card options"
```

---

## Task 4: Update `src/data/cards/threats.ts` — two cards

**Files:**
- Modify: `src/data/cards/threats.ts`

**`what_was_already_read` — "The words arrange themselves" (around line 845–852)**

This option fires when `dread >= 8`. Current effects:
```typescript
        effects: [
          { type: 'advanceGodPath' },
        ],
```

Replace with:
```typescript
        effects: [
          { type: 'surfaceGodPathCard' },
        ],
```

**`covenant_demands` — "Refuse the terms" (around line 1115–1122)**

This option currently fires `regressGodPath`. Current effects:
```typescript
        effects: [
          { type: 'regressGodPath' },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
```

Replace with:
```typescript
        effects: [
          { type: 'resource', resource: 'dread', delta: 4 },
        ],
```

Note: `regressGodPath` is removed entirely. Dread raised from 2 to 4 to compensate — refusing the covenant is still costly, just without the chain-breaking progress regression.

- [ ] **Step 1: Make both replacements**

- [ ] **Step 2: Verify no `regressGodPath` or stray `advanceGodPath` remain in threats.ts**

```bash
grep -n "regressGodPath\|advanceGodPath" src/data/cards/threats.ts
```

Expected: no output.

- [ ] **Step 3: Typecheck — expect clean**

```bash
npm run typecheck
```

Expected: no errors at all. This is the final task — the type system should be fully consistent now.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/threats.ts
git commit -m "feat(god-path-surface): update what_was_already_read and covenant_demands; remove regressGodPath usage"
```

---

## Done

All four tasks complete. Run a final typecheck to confirm:

```bash
npm run typecheck
```

Expected output:
```
> project-abyssial@0.1.0 typecheck
> tsc --noEmit
```
(no errors, no warnings)

Four commits total. The god path chain now advances strictly in order (1→2→3→4→5→6) via chain card options only. Core card `surfaceGodPathCard` effects reposition the pending chain card to appear within 3 draws, without skipping stages or touching progress state.
