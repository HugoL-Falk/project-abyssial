# Affordability Audit (P16-39) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block options when their listed resource cost exceeds the player's pool, eliminating the silent-undercharge bug surfaced in Playtest 16.

**Architecture:** New pure helper `affordabilityShortfall` in `src/engine/resources.ts` computes per-resource shortfall from an effect array. `getVisibleOptions` in `src/state/gameStore.ts` ANDs this into the existing `available` flag. `OptionsColumn.tsx` renders a synthesized `≥N {icon}` tag for options blocked by affordability that have no explicit `condition`. One-time audit confirms no card data depends on silent under-payment.

**Tech Stack:** TypeScript 5.5, Zustand, React 18, vitest 2.x — all existing devDeps.

## Global Constraints

- **Spec reference:** `Code/project-abyssial/docs/superpowers/specs/2026-06-19-affordability-audit-design.md` (commit `221ed83`).
- **Engine rule:** `affordabilityShortfall` checks negative resource deltas only. Skips dread (over-paying reduction is intentional). Skips nested `randomOutcome.outcomes[].effects` (probabilistic by design). Skips non-resource effects entirely.
- **Resources gate-checked:** gold, followers, influence, relics, theChanged.
- **Branch:** `claude/build-abyssial-game-IuJp8` (current trunk; LOCAL ONLY per CLAUDE.md — never `git push`).
- **Test baseline:** 53/53 vitest pass, typecheck clean.
- **No data changes** unless audit (Task 4) surfaces a finding requiring user decision.

---

### Task 1: `affordabilityShortfall` helper + unit tests

**Files:**
- Modify: `src/engine/resources.ts` (append new export)
- Modify: `src/state/gameStore.test.ts` (extend with new describe block at the end)

**Interfaces:**
- Consumes: `Effect`, `Resources`, `ResourceKey` from `src/types/index.ts` (already exported)
- Produces:
  ```ts
  export function affordabilityShortfall(
    effects: Effect[],
    resources: Resources,
  ): Partial<Record<ResourceKey, number>>
  ```
  Returns the per-resource missing amount (positive integer) for any resource where the player can't afford the summed negative deltas. Empty map = affordable.

- [ ] **Step 1: Write the failing tests**

Append to `src/state/gameStore.test.ts`:

```ts
// ─── P16-39 affordability ─────────────────────────────────────────────────
import { affordabilityShortfall } from '../engine/resources'
import type { Resources, Effect } from '../types'

const POOL = (over: Partial<Resources> = {}): Resources => ({
  gold: 3, followers: 3, influence: 3, dread: 0, relics: 0, theChanged: 0, ...over,
})

describe('affordabilityShortfall', () => {
  it('returns empty when no costs', () => {
    const fx: Effect[] = [{ type: 'resource', resource: 'gold', delta: 2 }]
    expect(affordabilityShortfall(fx, POOL())).toEqual({})
  })

  it('returns empty when affordable', () => {
    const fx: Effect[] = [{ type: 'resource', resource: 'gold', delta: -2 }]
    expect(affordabilityShortfall(fx, POOL({ gold: 3 }))).toEqual({})
  })

  it('reports shortfall when unaffordable', () => {
    const fx: Effect[] = [{ type: 'resource', resource: 'influence', delta: -2 }]
    expect(affordabilityShortfall(fx, POOL({ influence: 1 }))).toEqual({ influence: 1 })
  })

  it('sums duplicate-resource deltas', () => {
    const fx: Effect[] = [
      { type: 'resource', resource: 'gold', delta: -1 },
      { type: 'resource', resource: 'gold', delta: -1 },
    ]
    expect(affordabilityShortfall(fx, POOL({ gold: 1 }))).toEqual({ gold: 1 })
  })

  it('skips dread (over-paying reduction is a feature)', () => {
    const fx: Effect[] = [{ type: 'resource', resource: 'dread', delta: -5 }]
    expect(affordabilityShortfall(fx, POOL({ dread: 0 }))).toEqual({})
  })

  it('checks relics and theChanged as costs', () => {
    const fxRelic: Effect[] = [{ type: 'resource', resource: 'relics', delta: -1 }]
    expect(affordabilityShortfall(fxRelic, POOL({ relics: 0 }))).toEqual({ relics: 1 })
    const fxChanged: Effect[] = [{ type: 'resource', resource: 'theChanged', delta: -2 }]
    expect(affordabilityShortfall(fxChanged, POOL({ theChanged: 1 }))).toEqual({ theChanged: 1 })
  })

  it('does NOT recurse into randomOutcome nested costs', () => {
    const fx: Effect[] = [
      { type: 'randomOutcome', outcomes: [
        { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: -99 }] },
      ]},
    ]
    expect(affordabilityShortfall(fx, POOL({ gold: 0 }))).toEqual({})
  })

  it('ignores non-resource effect types', () => {
    const fx: Effect[] = [
      { type: 'insertCard', cardId: 'foo', position: 'random', minPos: 1, maxPos: 5 },
      { type: 'removeCard', cardId: 'bar' },
      { type: 'advanceGodPath' },
      { type: 'removeRandomThreat' },
      { type: 'resource', resource: 'gold', delta: -1 },
    ]
    expect(affordabilityShortfall(fx, POOL({ gold: 1 }))).toEqual({})
  })

  it('handles multi-resource shortfall in one option', () => {
    const fx: Effect[] = [
      { type: 'resource', resource: 'gold', delta: -2 },
      { type: 'resource', resource: 'followers', delta: -1 },
    ]
    expect(affordabilityShortfall(fx, POOL({ gold: 1, followers: 0 }))).toEqual({ gold: 1, followers: 1 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `Code/project-abyssial/`:
```
npx vitest run src/state/gameStore.test.ts -t "affordabilityShortfall"
```
Expected: FAIL — `affordabilityShortfall` not found in `'../engine/resources'`.

- [ ] **Step 3: Implement the helper**

Append to `src/engine/resources.ts`:

```ts
import type { Effect, ResourceKey as _ResourceKey } from '../types'

// ─── P16-39: affordability ────────────────────────────────────────────────
//
// Compute per-resource shortfall for an option's effects. Returns an empty
// object when affordable; otherwise maps each unaffordable resource to the
// positive integer shortfall (how much MORE the player would need).
//
// Skips dread: -dread floors at 0 and over-paying reduction is intentional.
// Skips randomOutcome nesting: probabilistic outcomes are surprises by
// design — the player commits only to the parent option's top-level cost.
// Skips non-resource effects entirely (insertCard, removeCard, etc.).

const SKIPPED_RESOURCES: ReadonlySet<_ResourceKey> = new Set(['dread'])

export function affordabilityShortfall(
  effects: Effect[],
  resources: Resources,
): Partial<Record<_ResourceKey, number>> {
  const costs: Partial<Record<_ResourceKey, number>> = {}
  for (const e of effects) {
    if (e.type !== 'resource') continue
    if (e.delta >= 0) continue
    if (SKIPPED_RESOURCES.has(e.resource)) continue
    costs[e.resource] = (costs[e.resource] ?? 0) + e.delta
  }
  const shortfall: Partial<Record<_ResourceKey, number>> = {}
  for (const r of Object.keys(costs) as _ResourceKey[]) {
    const projected = resources[r] + costs[r]!
    if (projected < 0) shortfall[r] = -projected
  }
  return shortfall
}
```

Note: the `import type { Effect, ResourceKey as _ResourceKey }` at the top uses an aliased name to avoid clashing with the existing `ResourceKey` import at the top of `resources.ts`. If the existing file already imports `ResourceKey` and `Effect`, drop the `import type` line and reuse the existing names.

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run src/state/gameStore.test.ts -t "affordabilityShortfall"
```
Expected: PASS — 9/9 cases green.

- [ ] **Step 5: Run full suite + typecheck**

```
npx vitest run
npx tsc --noEmit
```
Expected: full suite passes (53 baseline + 9 new = 62 tests). Typecheck clean.

- [ ] **Step 6: Commit**

```
git add src/engine/resources.ts src/state/gameStore.test.ts
git commit -m "feat(engine): affordabilityShortfall helper (P16-39 task 1)"
```

---

### Task 2: Wire affordability into `getVisibleOptions`

**Files:**
- Modify: `src/state/gameStore.ts:135-162` (extend `getVisibleOptions`)
- Modify: `src/components/game/OptionsColumn.tsx:46-51` (extend `VisibleOpt` type)
- Modify: `src/state/gameStore.test.ts` (add integration tests for Oath of Dagon opt 3)

**Interfaces:**
- Consumes: `affordabilityShortfall` from Task 1 (signature: `(effects: Effect[], resources: Resources) => Partial<Record<ResourceKey, number>>`)
- Produces: `VisibleOpt` now carries `affordabilityShortfall?: Partial<Record<ResourceKey, number>>`. Populated whenever the option fails the affordability check; empty/undefined otherwise. The `available` flag is now `(condition-passes) && (affordable)`.

- [ ] **Step 1: Write the failing integration tests**

Append to `src/state/gameStore.test.ts`:

```ts
describe('getVisibleOptions affordability gate (P16-39)', () => {
  it('Oath of Dagon opt 3 "Refuse" unavailable at influence < 2', () => {
    const store = useGameStore.getState()
    // Reset to a controlled state with low influence
    useGameStore.setState({
      resources: { gold: 3, followers: 3, influence: 1, dread: 0, relics: 0, theChanged: 0 },
    })
    const dagonCard = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_4')!
    const opts = store.getVisibleOptions(dagonCard)
    const refuse = opts.find(o => o.option.label === 'Refuse')!
    expect(refuse.available).toBe(false)
    expect(refuse.affordabilityShortfall).toEqual({ influence: 1 })
  })

  it('Oath of Dagon opt 3 "Refuse" available at influence >= 2', () => {
    const store = useGameStore.getState()
    useGameStore.setState({
      resources: { gold: 3, followers: 3, influence: 2, dread: 0, relics: 0, theChanged: 0 },
    })
    const dagonCard = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_4')!
    const opts = store.getVisibleOptions(dagonCard)
    const refuse = opts.find(o => o.option.label === 'Refuse')!
    expect(refuse.available).toBe(true)
    expect(refuse.affordabilityShortfall ?? {}).toEqual({})
  })

  it('option with explicit resourceMin condition AND affordability both gate', () => {
    // Oath of Dagon opt 1 "Accept" requires relics >= 1 AND costs relics -1
    const store = useGameStore.getState()
    useGameStore.setState({
      resources: { gold: 3, followers: 3, influence: 3, dread: 0, relics: 0, theChanged: 0 },
    })
    const dagonCard = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_4')!
    const opts = store.getVisibleOptions(dagonCard)
    const accept = opts.find(o => o.option.label === 'Accept the terms')!
    expect(accept.available).toBe(false)
  })
})
```

The test imports `GOD_PATH_CHAINS` — add `import { GOD_PATH_CHAINS } from '../data'` at the top of `gameStore.test.ts` if not already present.

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run src/state/gameStore.test.ts -t "affordability gate"
```
Expected: FAIL — the new `affordabilityShortfall` field doesn't exist on `VisibleOpt` yet; `available` is true for "Refuse" at 1 influence (existing buggy behaviour).

- [ ] **Step 3: Extend the `VisibleOpt` type**

Open `src/components/game/OptionsColumn.tsx`. Replace lines 46-51:

```ts
export type VisibleOpt = {
  idx: number
  option: { label: string; flavourText?: string; isWhisper?: boolean; condition?: Condition; succumbOption?: boolean; previewTag?: string }
  available: boolean
  effectiveEffects: Effect[]
  affordabilityShortfall?: Partial<Record<ResourceKey, number>>
}
```

Add `ResourceKey` to the type-import at line 1:

```ts
import type { Effect, Card, Condition, ResourceKey } from '../../types'
```

- [ ] **Step 4: Extend `getVisibleOptions` in the store**

Open `src/state/gameStore.ts`. Add to the imports at the top, alongside the existing `applyDelta` / `checkCondition` imports (the affordability helper lives in `engine/resources`):

```ts
import { affordabilityShortfall } from '../engine/resources'
```

Replace `getVisibleOptions` body (currently `src/state/gameStore.ts:135-162`) with:

```ts
function getVisibleOptions(card: Card, state: GameState) {
  const dreadPressure = state.unravellingTier - 1
  return card.options.map((opt, idx) => {
    const conditionPasses = opt.condition
      ? checkCondition(opt.condition, {
          resources: state.resources,
          deck: state.deck,
          godPathProgress: state.godPathProgress,
          runConfig: state.runConfig,
          cardRunState: state.cardRunState,
          prepTags: state.prepTags,
        })
      : true

    let effectiveEffects: Effect[] = [...opt.effects]

    if (opt.dreadPressureScaling && dreadPressure > 0) {
      effectiveEffects = effectiveEffects.map(e =>
        e.type === 'resource' && e.resource === 'dread' && e.delta > 0
          ? { ...e, delta: e.delta + dreadPressure }
          : e
      )
    }

    // P16-39: affordability gate. Empty shortfall map = affordable.
    const shortfall = affordabilityShortfall(effectiveEffects, state.resources)
    const affordable = Object.keys(shortfall).length === 0

    const available = conditionPasses && affordable
    const hidden = !available && (opt.hideWhenUnavailable ?? false)

    return {
      idx,
      option: opt,
      available,
      hidden,
      effectiveEffects,
      affordabilityShortfall: affordable ? undefined : shortfall,
    }
  })
}
```

- [ ] **Step 5: Run tests to verify they pass**

```
npx vitest run src/state/gameStore.test.ts -t "affordability gate"
```
Expected: PASS — 3/3 new integration cases green.

- [ ] **Step 6: Run full suite + typecheck**

```
npx vitest run
npx tsc --noEmit
```
Expected: full suite passes (62 + 3 = 65 tests). Typecheck clean. If any pre-existing test fails because a previously-buggy "still pickable at low resource" assumption is now blocked, treat it as a regression of the bug we're fixing — update the test's initial-resource fixture to support the option being picked.

- [ ] **Step 7: Commit**

```
git add src/state/gameStore.ts src/components/game/OptionsColumn.tsx src/state/gameStore.test.ts
git commit -m "feat(engine): affordability gate in getVisibleOptions (P16-39 task 2)"
```

---

### Task 3: UI shortfall tag in `OptionsColumn`

**Files:**
- Modify: `src/components/game/OptionsColumn.tsx:148-180` (extend the existing condition-tag render block)

**Interfaces:**
- Consumes: `visibleOpt.affordabilityShortfall` populated by Task 2.
- Produces: visible UI tag. No new exported API.

- [ ] **Step 1: Read the existing condition-tag block once for context**

Open `src/components/game/OptionsColumn.tsx` and re-read the render of `dreadConds` tags at lines 148-162 inside the option's row. The new affordability tag mirrors that styling.

- [ ] **Step 2: Add the affordability tag render**

In `OptionsColumn.tsx`, locate the existing block (around line 148):

```tsx
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0, opacity: avail ? 1 : 0.75 }}>
              {option.condition && (() => {
                const dreadConds = extractResourceConditions(option.condition).filter(h => h.resource === 'dread')
                const DreadIcon = RESOURCE_ICONS['dread']
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
              })()}
```

Immediately AFTER the closing `})()}` of the dreadConds block and BEFORE the `<EffectTags ... />` call, insert:

```tsx
              {/* P16-39: synthesized affordability shortfall tags */}
              {visibleOpts[idx]?.affordabilityShortfall && Object.entries(visibleOpts[idx]!.affordabilityShortfall!).map(([resource, missing]) => {
                const Icon = RESOURCE_ICONS[resource as keyof typeof RESOURCE_ICONS]
                const need = (currentResources?.[resource as keyof typeof currentResources] ?? 0) + (missing as number)
                return (
                  <span key={`aff-${resource}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '2px',
                    fontSize: '0.78rem', color: 'rgba(180,80,80,0.8)',
                    padding: '0.1rem 0.35rem', borderRadius: '2px',
                    border: '1px solid rgba(180,80,80,0.3)',
                  }}>
                    {Icon && <Icon />}≥{need}
                  </span>
                )
              })}
```

Wait — the inner `.map()` callback already receives `option` and the iteration is on `visibleOpts.map(({ idx, option, available: avail, effectiveEffects }) => ...`. Re-read the destructure (around line 112): `{visibleOpts.map(({ idx, option, available: avail, effectiveEffects }) => {`. We need to add the shortfall to the destructure:

Change:
```tsx
      {visibleOpts.map(({ idx, option, available: avail, effectiveEffects }) => {
```

To:
```tsx
      {visibleOpts.map(({ idx, option, available: avail, effectiveEffects, affordabilityShortfall }) => {
```

Then the inserted block uses the destructured `affordabilityShortfall` directly (cleaner than indexing `visibleOpts[idx]`):

```tsx
              {/* P16-39: synthesized affordability shortfall tags */}
              {affordabilityShortfall && Object.entries(affordabilityShortfall).map(([resource, missing]) => {
                const Icon = RESOURCE_ICONS[resource as keyof typeof RESOURCE_ICONS]
                const need = (currentResources?.[resource as keyof typeof currentResources] ?? 0) + (missing as number)
                return (
                  <span key={`aff-${resource}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '2px',
                    fontSize: '0.78rem', color: 'rgba(180,80,80,0.8)',
                    padding: '0.1rem 0.35rem', borderRadius: '2px',
                    border: '1px solid rgba(180,80,80,0.3)',
                  }}>
                    {Icon && <Icon />}≥{need}
                  </span>
                )
              })}
```

- [ ] **Step 3: Typecheck**

```
npx tsc --noEmit
```
Expected: clean. If TS complains about `currentResources?.[resource]` indexing, cast via `as keyof Resources` (the prop is already typed `Resources | undefined` in the component signature).

- [ ] **Step 4: Run full suite**

```
npx vitest run
```
Expected: all 65 tests still pass. No UI-specific tests added in this task; the integration test in Task 2 already asserts that `affordabilityShortfall` is populated correctly. UI rendering is a thin presentation layer over that data.

- [ ] **Step 5: Smoke-build**

```
npm run build
```
Expected: build completes with no TypeScript or Vite errors. (A real run-time smoke test happens via continuous playtest off-band — do not write that as a TODO per CLAUDE.md.)

- [ ] **Step 6: Commit**

```
git add src/components/game/OptionsColumn.tsx
git commit -m "feat(ui): affordability shortfall tag in OptionsColumn (P16-39 task 3)"
```

---

### Task 4: One-time card-data audit

**Files:**
- Read-only sweep of `src/data/cards/*.ts` and `src/data/godPaths/*.ts`.
- Audit findings written to: `knowledge/investigations/2026-06-19-affordability-audit-findings.md`
- If findings → user decision → potential card-data edits in a follow-up commit.

**Interfaces:**
- Consumes: Tasks 1–3 (gate must be in place; the audit asks "did we break anything?")
- Produces: a written findings note. No code changes unless findings require them.

- [ ] **Step 1: Run a grep-based sweep for high-risk options**

The audit's question: are there options where the listed cost EXCEEDS the player's plausible starting pool, AND lack an explicit condition? Such options were previously pickable via the silent-undercharge bug. With the new gate, they become unpickable in those low-resource states.

Run from `Code/project-abyssial/`:

```
grep -rn "resource: 'gold', delta: -[3-9]\|resource: 'gold', delta: -[0-9][0-9]" src/data/cards src/data/godPaths
grep -rn "resource: 'followers', delta: -[3-9]\|resource: 'followers', delta: -[0-9][0-9]" src/data/cards src/data/godPaths
grep -rn "resource: 'influence', delta: -[3-9]\|resource: 'influence', delta: -[0-9][0-9]" src/data/cards src/data/godPaths
grep -rn "resource: 'relics', delta: -[2-9]" src/data/cards src/data/godPaths
grep -rn "resource: 'theChanged', delta: -" src/data/cards src/data/godPaths
```

Each match is a "deep cost" candidate. For each match, open the surrounding option block and check for a matching `condition: resourceMin` that covers the cost.

- [ ] **Step 2: Walk the matches and classify**

For each grep hit, classify as:
- **PASS** — option has an explicit `condition: resourceMin` that gates ≥ |delta|. (Now redundant with the new engine gate but harmless.)
- **PASS** — option's cost is gated by a non-resourceMin condition that implies the resource is available (e.g. `hasPrepTag`, but rare).
- **OK NOW** — option has no condition, was previously pickable via silent-undercharge, is now blocked by the new gate at low resources. **This is the intended fix.** No action needed.
- **FINDING** — option has no condition AND the design intent was for the player to be ABLE to take a partial-cost outcome. Requires user decision: leave hard-blocked, or add a `partialOkay` opt-in flag (out of scope for this plan; would require an engine extension).

Expected: vast majority are OK NOW. Findings (if any) are surfaced for user review.

- [ ] **Step 3: Write the findings note**

Create `knowledge/investigations/2026-06-19-affordability-audit-findings.md` with this exact template, filled in:

```markdown
# P16-39 Affordability Audit — Findings

**Date:** 2026-06-19
**Scope:** All options in `src/data/cards/*.ts` and `src/data/godPaths/*.ts` with negative resource deltas on non-dread resources.

## Methodology

Grep for negative resource deltas with magnitude ≥ 3 (gold/followers/influence), ≥ 2 (relics), or any (theChanged). For each match: inspect the surrounding option block and classify.

## Counts

- Total -resource effects scanned: NN
- PASS (existing explicit condition gates the cost): NN
- OK NOW (no condition; previously underpayable, now properly blocked): NN
- FINDING (no condition; design likely wanted partial-cost): NN

## Findings (cards needing user decision)

(If zero findings: write "None. The affordability gate is invisible to disciplined play; all previously-underpayable options are now correctly blocked at low resources." Otherwise, list each finding as a sub-section with: card id, option label, file:line, cost, current player-state at which it was reachable via under-payment, and the design-intent question.)
```

- [ ] **Step 4: Resolve findings**

If Step 2 surfaced any FINDING entries, **stop and ask the user** which to handle. Possible resolutions per finding:
- Keep the new hard-block (no action).
- Add an explicit `condition: resourceMin` that matches the cost (data edit; the option behaves exactly as before for affordable players).
- Add a `partialOkay: true` opt-out flag on the option (requires engine extension; OUT OF SCOPE — would need its own follow-up plan).

If zero findings, skip to Step 5.

- [ ] **Step 5: Update backlog and decisions ledger**

Edit `knowledge/backlog.md`. Find the line:

```
- [ ] **P16-39.** Oath of Dagon opt 3: Selectable with insufficient influence (had 1 Inf, could still pick). Audit all options — none should be selectable when unaffordable. **Cluster: Resource Gating Audit.** Agent: Code.
```

Replace with:

```
- [x] ~~**P16-39.** Oath of Dagon opt 3: Selectable with insufficient influence; audit all options~~ — **Closed s87+** (engine-level affordability gate in `getVisibleOptions` checks all non-dread negative resource deltas against the player's pool. `affordabilityShortfall` helper in `src/engine/resources.ts` returns the per-resource missing amount. UI renders a synthesized ≥N {icon} tag matching the existing dread-condition pill style. Audit findings: [[knowledge/investigations/2026-06-19-affordability-audit-findings.md]]. Spec: [[Code/project-abyssial/docs/superpowers/specs/2026-06-19-affordability-audit-design.md]].).
```

Append to `knowledge/decisions-live.md`:

```
- **2026-06-19 — Affordability is enforced engine-side, not via per-option declarations.** `getVisibleOptions` ANDs the existing `condition` check with a new `affordabilityShortfall` check that sums negative non-dread resource deltas and compares to the pool. Dread is exempt (over-paying reduction is a feature). Random-outcome nested costs are exempt (player commits to top-level cost only; nested outcomes are surprises). Closes P16-39. See [[Code/project-abyssial/docs/superpowers/specs/2026-06-19-affordability-audit-design.md]].
```

- [ ] **Step 6: Commit the audit + backlog/decisions updates**

```
git add knowledge/investigations/2026-06-19-affordability-audit-findings.md
git commit -m "docs: P16-39 affordability audit findings + close backlog entry"
```

Note: `knowledge/backlog.md` and `knowledge/decisions-live.md` live in the vault, not in the git repo, so they don't get staged — direct file edits are durable.

---

## Self-Review

**1. Spec coverage:**
- Spec § "Engine-level gate" → Task 2 (extend `getVisibleOptions`). ✓
- Spec § "Affordability helper" → Task 1. ✓
- Spec § "Wiring" → Task 2 Step 4. ✓
- Spec § "UI shortfall tag" → Task 3. ✓
- Spec § "Effective-effects ordering" → Task 2 Step 4 (uses `effectiveEffects` after dreadPressureScaling). ✓
- Spec § "Audit" → Task 4. ✓
- Spec § "Testing" — unit + integration → Task 1 (9 cases) + Task 2 (3 cases). ✓
- Spec § "Out of scope" — `partialOkay` opt-out, `applyDelta` changes, mass-cleanup of redundant conditions: not in any task. ✓
- Spec § "Risks" — `allBlocked` fallback, multi-resource shortfall layout, UI regression test: addressed in Task 2 Step 6 note + Task 3 reuse of existing dread-condition styling. ✓

**2. Placeholder scan:**
- No "TBD" / "fill in details" / "similar to Task N" anywhere. ✓
- Every code block is complete and runnable. ✓
- One templated section in Task 4 Step 3 (the findings note's "Counts" + "Findings" sections) where the engineer fills in real numbers from the audit — this is intentional template-completion, not a placeholder.

**3. Type consistency:**
- `affordabilityShortfall(effects: Effect[], resources: Resources): Partial<Record<ResourceKey, number>>` defined in Task 1 Step 3, used in Task 2 Step 4 + Task 3. Same signature throughout. ✓
- `VisibleOpt.affordabilityShortfall?: Partial<Record<ResourceKey, number>>` declared in Task 2 Step 3, consumed in Task 3 Step 2. ✓
- npm scripts (`npx vitest run`, `npx tsc --noEmit`, `npm run build`) match the existing `package.json` scripts. ✓

All checks pass.
