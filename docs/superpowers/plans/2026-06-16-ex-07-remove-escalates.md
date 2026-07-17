# EX-07 — Remove `escalates` Mechanic — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the `escalates: true` card field and all engine/UI support. The only card using it (`yha_nthlei_3`) keeps flat costs on every redraw.

**Architecture:** Pure deletion. Field on `Card` type → callsites in engine + store that branch on `card.escalates` → data line in `yha_nthlei.ts` → two UI surfaces in `DrawnCard.tsx`. No replacement mechanic.

**Tech Stack:** TypeScript, Vite, Vitest, React.

**Spec:** `docs/superpowers/specs/2026-06-16-ex-07-remove-escalates-design.md`

---

## File Structure

- **Modify** `src/types/index.ts` — drop `escalates?: boolean` from `Card`.
- **Modify** `src/engine/gameLoop.ts` — strip escalation branches in `computeVisibleOptions` and `applyOption`.
- **Modify** `src/state/gameStore.ts` — strip escalation branches at two callsites.
- **Modify** `src/data/godPaths/yha_nthlei.ts` — drop `escalates: true` + outdated comments on `yha_nthlei_3`.
- **Modify** `src/components/game/DrawnCard.tsx` — remove `hasEscalate` branch and the inline subtitle.
- **Create** `src/engine/escalates-removal.test.ts` — regression test: redrawing `yha_nthlei_3` costs the same as first draw.

---

### Task 1: Regression test — no escalation on redraw

**Files:**
- Create: `src/engine/escalates-removal.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { computeVisibleOptions } from './gameLoop'
import { godPathCards } from '../data/godPaths'
import type { CardRunState, CardId, ConditionContext } from '../types'

describe('EX-07: escalates removal', () => {
  const yha3 = godPathCards.find(c => c.id === 'yha_nthlei_3')!

  const ctx: ConditionContext = {
    resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 0, theChanged: 0 },
    chainStage: { yha_nthlei: 3, nyarlathotep: 0, shub_niggurath: 0 },
    cardRunState: {} as Record<CardId, CardRunState>,
    unravellingTier: 1,
  }

  it('yha_nthlei_3 costs do not escalate on redraw', () => {
    const firstDraw = { yha_nthlei_3: { drawCount: 1, optionsChosen: [] } } as Record<CardId, CardRunState>
    const secondDraw = { yha_nthlei_3: { drawCount: 2, optionsChosen: [] } } as Record<CardId, CardRunState>

    const first = computeVisibleOptions(yha3, ctx, firstDraw)
    const second = computeVisibleOptions(yha3, ctx, secondDraw)

    // Compare resource deltas for the "Let him attend" option (idx 1)
    const firstDeltas = first[1].effectiveEffects.filter(e => e.type === 'resource')
    const secondDeltas = second[1].effectiveEffects.filter(e => e.type === 'resource')

    expect(secondDeltas).toEqual(firstDeltas)
  })
})
```

- [ ] **Step 2: Run test — expected to FAIL because `escalates: true` is still set**

Run: `npx vitest run src/engine/escalates-removal.test.ts`
Expected: FAIL — second-draw delta on `influence` is -3 (or `followers` -2), differs from first-draw -2 / -1.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/engine/escalates-removal.test.ts
git commit -m "test(EX-07): regression test for escalates removal (failing)"
```

---

### Task 2: Remove engine + state + data support

**Files:**
- Modify: `src/types/index.ts:106`
- Modify: `src/engine/gameLoop.ts:170-177, 286-293`
- Modify: `src/state/gameStore.ts:145-151, 603-609`
- Modify: `src/data/godPaths/yha_nthlei.ts:103, 113, 130`

- [ ] **Step 1: Remove `escalates` from `Card` type**

In `src/types/index.ts`, delete line 106:

```ts
  escalates?: boolean
```

Resulting block:

```ts
  passive?: PassiveEffect
  onDraw?: Effect[]
  permanent?: boolean
  isSummoning?: boolean
```

- [ ] **Step 2: Strip escalation in `gameLoop.ts` `computeVisibleOptions`**

Replace lines 169-177:

```ts
    // Escalate negative resource deltas for escalating cards
    const effectiveEffects: Effect[] = card.escalates
      ? opt.effects.map(e => {
          if (e.type === 'resource' && e.delta < 0) {
            return { ...e, delta: e.delta - (drawCount - 1) }
          }
          return e
        })
      : [...opt.effects]
```

with:

```ts
    const effectiveEffects: Effect[] = [...opt.effects]
```

Note: `drawCount` (declared on line 162) is still used elsewhere — leave it.

- [ ] **Step 3: Strip escalation in `gameLoop.ts` `applyOption`**

Replace lines 285-294:

```ts
  // Build effective effects (escalation for escalating cards), then expand random outcomes
  const effects: Effect[] = expandEffects(card.escalates
    ? option.effects.map(e => {
        if (e.type === 'resource' && e.delta < 0) {
          return { ...e, delta: e.delta - (drawCount - 1) }
        }
        return e
      })
    : [...option.effects]
  )
```

with:

```ts
  // Build effective effects, then expand random outcomes
  const effects: Effect[] = expandEffects([...option.effects])
```

If `drawCount` (line 283) is unused after this edit, remove its declaration. Check with `grep -n "drawCount" src/engine/gameLoop.ts` after the edit — if no other reference remains in `applyOption`, drop the const.

- [ ] **Step 4: Strip escalation in `gameStore.ts` `computeVisibleOptions` callsite**

Replace lines 145-151:

```ts
    let effectiveEffects: Effect[] = card.escalates
      ? opt.effects.map(e =>
          e.type === 'resource' && e.delta < 0
            ? { ...e, delta: e.delta - (drawCount - 1) }
            : e
        )
      : [...opt.effects]
```

with:

```ts
    let effectiveEffects: Effect[] = [...opt.effects]
```

If `drawCount` declared earlier in that function block is unused after this edit, remove it.

- [ ] **Step 5: Strip escalation in `gameStore.ts` `applyOption` callsite**

Replace lines 599-609:

```ts
    // Compute effective effects — escalate negative deltas, apply dread pressure, then expand random outcomes
    const drawCount = state.cardRunState[state.currentCard.id]?.drawCount ?? 0
    const dreadPressure = state.unravellingTier - 1

    let baseEffects: Effect[] = state.currentCard.escalates
      ? option.effects.map(e =>
          e.type === 'resource' && e.delta < 0
            ? { ...e, delta: e.delta - (drawCount - 1) }
            : e
        )
      : [...option.effects]
```

with:

```ts
    // Compute effective effects — apply dread pressure, then expand random outcomes
    const dreadPressure = state.unravellingTier - 1

    let baseEffects: Effect[] = [...option.effects]
```

(The `drawCount` local is removed here; if it's read later in the function for a different purpose, restore the declaration. Search with `grep -n "drawCount" src/state/gameStore.ts` after the edit.)

- [ ] **Step 6: Remove `escalates: true` and outdated comments from `yha_nthlei_3`**

In `src/data/godPaths/yha_nthlei.ts`, edit lines 101-113:

```ts
  // ─── Card 3: THE INNSMOUTH LOOK ──────────────────────────────────────────
  // Mid chain. First moment avoidance has a real cost. Dread pressure begins.
  // escalates: true — negative resource costs increase by 1 each draw count.
  // "Turn him away" option should not reappear after being chosen once;
  // this requires engine-level option-state tracking (TODO).
  {
    id: 'yha_nthlei_3',
    title: 'The Innsmouth Look',
    flavourText: 'The foreman has been attending our gatherings. We did not invite him. One of our newer followers has mentioned the sea unprompted on six separate occasions after talking to him.',
    tier: 'god_path',
    godPath: 'yha_nthlei',
    chainStage: 3,
    escalates: true,
```

to:

```ts
  // ─── Card 3: THE INNSMOUTH LOOK ──────────────────────────────────────────
  // Mid chain. First moment avoidance has a real cost. Dread pressure begins.
  // "Turn him away" option should not reappear after being chosen once;
  // this requires engine-level option-state tracking (TODO).
  {
    id: 'yha_nthlei_3',
    title: 'The Innsmouth Look',
    flavourText: 'The foreman has been attending our gatherings. We did not invite him. One of our newer followers has mentioned the sea unprompted on six separate occasions after talking to him.',
    tier: 'god_path',
    godPath: 'yha_nthlei',
    chainStage: 3,
```

Then update the inline comment on line 130 inside "Let him attend":

```ts
          // Card returns 7–11 draws out; costs escalate (escalates: true above)
```

to:

```ts
          // Card returns 7–11 draws out at flat cost.
```

- [ ] **Step 7: Run the regression test — expected PASS**

Run: `npx vitest run src/engine/escalates-removal.test.ts`
Expected: PASS — both draws return identical resource deltas.

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — no regressions.

- [ ] **Step 9: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. Any remaining reference to `card.escalates` surfaces here.

- [ ] **Step 10: Verify no stragglers in `src/`**

Run: `grep -rn "escalates" src/`
Expected: matches ONLY in `src/components/game/DoomPanel.tsx` ("Doom escalates" — unrelated doom-tier copy) and `src/components/game/DrawnCard.tsx` (handled in Task 3). No matches in `engine/`, `state/`, `data/`, or `types/`.

- [ ] **Step 11: Commit**

```bash
git add src/types/index.ts src/engine/gameLoop.ts src/state/gameStore.ts src/data/godPaths/yha_nthlei.ts src/engine/escalates-removal.test.ts
git commit -m "feat(EX-07): remove escalates field from type, engine, state, data"
```

---

### Task 3: Remove UI surfaces in `DrawnCard.tsx`

**Files:**
- Modify: `src/components/game/DrawnCard.tsx:54, 87, 89, 148-152, 267-272`

- [ ] **Step 1: Update the comment on line 54**

Change:

```ts
// Shows a ? tooltip for cards with passive/onDraw/escalates/accumulates mechanics.
```

to:

```ts
// Shows a ? tooltip for cards with passive/onDraw/accumulates mechanics.
```

- [ ] **Step 2: Remove `hasEscalate` and its references**

In `CardPassiveTag`, delete line 87:

```ts
  const hasEscalate = !!card.escalates
```

Change line 89 from:

```ts
  if (!hasOnDraw && !hasPassive && !hasEscalate && !hasAccum) return null
```

to:

```ts
  if (!hasOnDraw && !hasPassive && !hasAccum) return null
```

Delete the tooltip row at lines 148-152:

```tsx
          {hasEscalate && (
            <div style={{ ...rowStyle, fontStyle: 'italic', color: 'rgba(200,185,155,0.55)' }}>
              Escalates. Costs increase on each redraw.
            </div>
          )}
```

- [ ] **Step 3: Remove the inline "Escalates" subtitle**

Delete lines 267-272:

```tsx
        {/* Escalates badge — sits just below title, mirrors god-path stage counter weight */}
        {card.escalates && (
          <div style={{ marginTop: '0.2rem', fontSize: compact ? '0.58rem' : '0.62rem', color: 'rgba(200,144,32,0.75)', textTransform: 'uppercase', letterSpacing: '0.18em', fontVariant: 'small-caps' }}>
            Escalates. Each redraw costs more.
          </div>
        )}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Final verification — no `card.escalates` references left**

Run: `grep -rn "escalates" src/`
Expected: matches ONLY in `src/components/game/DoomPanel.tsx` (unrelated "Doom escalates" copy). Zero references to `card.escalates` anywhere.

- [ ] **Step 7: Manual smoke (optional, if dev server is available)**

Start the dev server, start a Y'ha-nthlei run, draw `yha_nthlei_3`, pick "Let him attend" to force a re-insert, redraw the card later, and confirm:
- No "Escalates. Each redraw costs more." subtitle under the title.
- The `?`-popup (if it appears for other reasons) does not mention escalation.
- "Let him attend" displays F-1 I-2 on both draws.

- [ ] **Step 8: Commit**

```bash
git add src/components/game/DrawnCard.tsx
git commit -m "feat(EX-07): strip escalates UI from DrawnCard"
```

---

## Self-Review

- **Spec coverage:** spec lists 6 edit targets + 1 verify. All addressed: types (Task 2 Step 1), gameLoop x2 (Task 2 Steps 2-3), gameStore x2 (Task 2 Steps 4-5), yha_nthlei.ts (Task 2 Step 6), DrawnCard.tsx (Task 3). CardPassiveTag verify is folded into Task 3 Steps 1-2 (the `?`-popup escalation row is in `DrawnCard.tsx`'s `CardPassiveTag` component itself, not a separate file — grep confirmed no other `CardPassiveTag.tsx` file exists). DoomPanel exclusion noted in Task 2 Step 10 and Task 3 Step 6.
- **Placeholder scan:** all steps contain concrete code. The "(TODO)" inside the preserved `yha_nthlei_3` comment is an existing project TODO unrelated to EX-07 and is preserved verbatim.
- **Type consistency:** `effectiveEffects: Effect[]` and `baseEffects: Effect[]` retain their original types; only the RHS changes. `drawCount` local removal is gated on grep verification per step.
