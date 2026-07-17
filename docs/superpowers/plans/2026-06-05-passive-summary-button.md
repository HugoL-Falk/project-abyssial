# Passive Summary Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `↻` tap target in the resource bar that opens an on-demand tooltip showing net passive effects (reshuffle + onDraw) currently active in the player's deck.

**Architecture:** One new self-contained component `PassiveSummaryButton.tsx` reads `deck` from `useGameStore`, aggregates resource deltas across all passive/onDraw cards in drawPile + discardPile, and renders a gold `↻` button with a fixed-position tooltip (same pattern as `RandomOutcomeTag`). `ResourceBar.tsx` gets one import and one JSX line.

**Tech Stack:** TypeScript, React, Vite. No test framework — validation is `npm run build`.

---

## File Map

| File | Change |
|---|---|
| `src/components/game/PassiveSummaryButton.tsx` | Create — new component |
| `src/components/game/ResourceBar.tsx` | Modify — import + one JSX line |

---

## Task 1: Create PassiveSummaryButton.tsx

**Files:**
- Create: `src/components/game/PassiveSummaryButton.tsx`

**Context:** The component lives alongside `ResourceBar.tsx`, `EffectTags.tsx`, etc. in `src/components/game/`. It reads game state from `useGameStore` (imported from `../../state`). The `RandomOutcomeTag` in `EffectTags.tsx` (lines 8–75) is the exact tooltip pattern to follow: `useState` for open, `useRef` for the button, `getBoundingClientRect` to position the fixed tooltip above the button.

Card fields used:
- `card.passive?: { trigger: 'reshuffle' | 'onDraw'; effects: Effect[]; condition?: Condition }` — reshuffle passives live here
- `card.onDraw?: Effect[]` — onDraw effects live here
- `Effect` is a discriminated union; only `{ type: 'resource'; resource: ResourceKey; delta: number }` and `{ type: 'randomOutcome'; outcomes: Array<{ weight: number; effects: Effect[] }> }` are relevant here

`RESOURCE_ICONS` from `./ResourceIcons` is a `Record<ResourceKey, () => JSX.Element>` (may have undefined entries — always guard with `Icon &&`).

- [ ] **Step 1: Create the file with full implementation**

Create `src/components/game/PassiveSummaryButton.tsx` with exactly this content:

```tsx
import { useState, useRef } from 'react'
import { useGameStore } from '../../state'
import type { ResourceKey, Card, Effect } from '../../types'
import { RESOURCE_ICONS } from './ResourceIcons'

// ─── Types ────────────────────────────────────────────────────────────────────

type ResourceDelta = Partial<Record<ResourceKey, number>>

type CategoryData = {
  deterministic: ResourceDelta
  probabilisticCards: Card[]
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

function aggregate(effects: Effect[]): { deterministic: ResourceDelta; hasProbabilistic: boolean } {
  const deterministic: ResourceDelta = {}
  let hasProbabilistic = false
  for (const e of effects) {
    if (e.type === 'resource') {
      deterministic[e.resource] = (deterministic[e.resource] ?? 0) + e.delta
    } else if (e.type === 'randomOutcome') {
      hasProbabilistic = true
    }
  }
  return { deterministic, hasProbabilistic }
}

function buildCategory(cards: Card[], getEffects: (c: Card) => Effect[] | undefined): CategoryData {
  const deterministic: ResourceDelta = {}
  const probabilisticCards: Card[] = []
  for (const card of cards) {
    const effects = getEffects(card)
    if (!effects || effects.length === 0) continue
    const { deterministic: d, hasProbabilistic } = aggregate(effects)
    for (const rkey of Object.keys(d) as ResourceKey[]) {
      deterministic[rkey] = (deterministic[rkey] ?? 0) + (d[rkey] ?? 0)
    }
    if (hasProbabilistic) probabilisticCards.push(card)
  }
  return { deterministic, probabilisticCards }
}

// ─── Display helpers ──────────────────────────────────────────────────────────

const RESOURCE_ORDER: ResourceKey[] = ['gold', 'followers', 'influence', 'dread', 'relics', 'theChanged']

function deltaColor(resource: ResourceKey, delta: number): string {
  const positive = delta > 0
  return resource === 'dread'
    ? (positive ? '#aa6464' : '#6aaa6a')
    : (positive ? '#6aaa6a' : '#aa6464')
}

function DeltaTags({ deltas }: { deltas: ResourceDelta }) {
  const entries = RESOURCE_ORDER.filter(k => deltas[k] !== undefined && deltas[k] !== 0)
  if (entries.length === 0) {
    return <span style={{ color: 'rgba(200,185,155,0.4)', fontStyle: 'italic' }}>—</span>
  }
  return (
    <>
      {entries.map(rkey => {
        const delta = deltas[rkey]!
        const Icon = RESOURCE_ICONS[rkey]
        return (
          <span key={rkey} style={{
            display: 'inline-flex', alignItems: 'center', gap: '2px',
            color: deltaColor(rkey, delta), marginRight: '0.35rem',
          }}>
            {Icon && <Icon />}{delta > 0 ? '+' : ''}{delta}
          </span>
        )
      })}
    </>
  )
}

function ProbabilisticLine({ effects }: { effects: Effect[] }) {
  const lines: string[] = []
  for (const e of effects) {
    if (e.type !== 'randomOutcome') continue
    const total = e.outcomes.reduce((s, o) => s + o.weight, 0)
    const nonEmpty = e.outcomes.filter(o => o.effects.length > 0)
    if (nonEmpty.length === 0) continue
    lines.push(
      nonEmpty.map(o => {
        const pct = Math.round((o.weight / total) * 100)
        const efStr = o.effects
          .filter((ef): ef is { type: 'resource'; resource: ResourceKey; delta: number } => ef.type === 'resource')
          .map(ef => `${ef.delta > 0 ? '+' : ''}${ef.delta} ${ef.resource}`)
          .join(', ')
        return `~${pct}% ${efStr}`
      }).join(' or ')
    )
  }
  if (lines.length === 0) return null
  return (
    <div style={{ fontSize: '0.72rem', color: 'rgba(200,185,155,0.55)', fontStyle: 'italic', lineHeight: 1.6 }}>
      {lines.join('; ')}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PassiveSummaryButton() {
  const deck  = useGameStore(s => s.deck)
  const phase = useGameStore(s => s.phase)
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos,  setPos]  = useState<{ bottom: number; left: number } | null>(null)

  if (phase !== 'playing') return null

  const allCards = [...deck.drawPile, ...deck.discardPile]

  const reshuffleCards = allCards.filter(c => c.passive?.trigger === 'reshuffle')
  const onDrawCards    = allCards.filter(c => c.onDraw && c.onDraw.length > 0)

  const reshuffleData = buildCategory(reshuffleCards, c => c.passive?.effects)
  const onDrawData    = buildCategory(onDrawCards,    c => c.onDraw)

  const handleToggle = (ev: React.MouseEvent) => {
    ev.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ bottom: window.innerHeight - r.top + 5, left: r.left })
    }
    setOpen(v => !v)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '0.4rem' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        style={{
          fontSize: '0.8rem', color: '#c89020', background: 'rgba(0,0,0,0.55)',
          padding: '0.1rem 0.4rem', borderRadius: '2px', fontVariant: 'small-caps',
          letterSpacing: '0.05em', border: `1px solid rgba(200,144,32,${open ? '0.65' : '0.30'})`,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        ↻
      </button>
      {open && pos && (
        <div style={{
          position: 'fixed', bottom: pos.bottom, left: pos.left, zIndex: 500,
          background: 'rgba(6,4,2,0.97)', border: '1px solid var(--border)',
          padding: '0.5rem 0.7rem', borderRadius: '2px', whiteSpace: 'nowrap',
        }}>
          {/* Reshuffle row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.75rem', color: 'rgba(200,185,155,0.85)',
            marginBottom: reshuffleData.probabilisticCards.length > 0 ? '0.1rem' : '0.3rem',
          }}>
            <span style={{ color: 'rgba(200,185,155,0.5)', minWidth: '7rem' }}>↻ each reshuffle</span>
            <DeltaTags deltas={reshuffleData.deterministic} />
          </div>
          {reshuffleData.probabilisticCards.map(c => (
            <ProbabilisticLine key={c.id} effects={c.passive!.effects} />
          ))}
          {/* On draw row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.75rem', color: 'rgba(200,185,155,0.85)',
            marginTop: reshuffleData.probabilisticCards.length > 0 ? '0.2rem' : 0,
          }}>
            <span style={{ color: 'rgba(200,185,155,0.5)', minWidth: '7rem' }}>⬇ on draw</span>
            <DeltaTags deltas={onDrawData.deterministic} />
          </div>
          {onDrawData.probabilisticCards.map(c => (
            <ProbabilisticLine key={c.id} effects={c.onDraw!} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
cd E:\Project Abyssial\Code\project-abyssial && npm run build
```

Expected: `✓ built in ~1s` with 0 TypeScript errors. The component won't be visible yet — that's fine, it's not wired in. If TypeScript complains about `RESOURCE_ICONS[rkey]` being possibly undefined, add `as () => JSX.Element | undefined` or guard with the existing `Icon &&` pattern (already present).

- [ ] **Step 3: Commit**

```bash
git add src/components/game/PassiveSummaryButton.tsx
git commit -m "ui(P10-28): PassiveSummaryButton — passive effects tooltip for resource bar"
```

---

## Task 2: Wire PassiveSummaryButton into ResourceBar

**Files:**
- Modify: `src/components/game/ResourceBar.tsx:1–7` (import) and `src/components/game/ResourceBar.tsx:227–228` (JSX)

**Context:** `ResourceBar.tsx` renders the gold/followers/influence/dread/relics row in a `<div style={{ display: 'flex', padding: '0.65rem 0.5rem 0.3rem' }}>`. The last item in this row is:

```tsx
{isShub && <ResourceCounter rkey="theChanged" label="Changed" Icon={TheChangedIcon} />}
```

You're appending `<PassiveSummaryButton />` after this line. `PassiveSummaryButton` reads its own store state — no props needed.

- [ ] **Step 1: Add the import to ResourceBar.tsx**

In `src/components/game/ResourceBar.tsx`, find the existing import block at the top:

```ts
import { useRef, useEffect, useState } from 'react'
import { useGameStore } from '../../state'
import { clampDisplayValue } from '../../engine/resources'
import type { ResourceKey } from '../../types'

import { GoldIcon, FollowersIcon, InfluenceIcon, DreadIcon, RelicsIcon, TheChangedIcon } from './ResourceIcons'
```

Add one line after the ResourceIcons import:

```ts
import { useRef, useEffect, useState } from 'react'
import { useGameStore } from '../../state'
import { clampDisplayValue } from '../../engine/resources'
import type { ResourceKey } from '../../types'

import { GoldIcon, FollowersIcon, InfluenceIcon, DreadIcon, RelicsIcon, TheChangedIcon } from './ResourceIcons'
import { PassiveSummaryButton } from './PassiveSummaryButton'
```

- [ ] **Step 2: Add the component to the JSX**

In `ResourceBar.tsx`, find this block (lines ~214–228 in the `ResourceBar` function's return):

```tsx
        <div style={{ display: 'flex', padding: '0.65rem 0.5rem 0.3rem' }}>
          <ResourceCounter rkey="gold"       label="Gold"      Icon={GoldIcon} />
          <ResourceCounter rkey="followers"  label="Followers" Icon={FollowersIcon} />
          <ResourceCounter rkey="influence"  label="Influence" Icon={InfluenceIcon} />
          <ResourceCounter rkey="dread"      label="Dread"     Icon={DreadIcon} />
          {/* Relics: tappable when > 0 to open resource picker */}
          <div
            onClick={canSpend ? onOpenRelicPicker : undefined}
            title={canSpend ? 'Spend 1 Relic: restore one resource to its base value' : undefined}
            style={{ flex: 1, cursor: canSpend ? 'pointer' : 'default', outline: canSpend ? '1px solid rgba(212,160,16,0.28)' : undefined }}
          >
            <ResourceCounter rkey="relics" label="Relics" Icon={RelicsIcon} />
          </div>
          {isShub && <ResourceCounter rkey="theChanged" label="Changed" Icon={TheChangedIcon} />}
        </div>
```

Replace with:

```tsx
        <div style={{ display: 'flex', padding: '0.65rem 0.5rem 0.3rem' }}>
          <ResourceCounter rkey="gold"       label="Gold"      Icon={GoldIcon} />
          <ResourceCounter rkey="followers"  label="Followers" Icon={FollowersIcon} />
          <ResourceCounter rkey="influence"  label="Influence" Icon={InfluenceIcon} />
          <ResourceCounter rkey="dread"      label="Dread"     Icon={DreadIcon} />
          {/* Relics: tappable when > 0 to open resource picker */}
          <div
            onClick={canSpend ? onOpenRelicPicker : undefined}
            title={canSpend ? 'Spend 1 Relic: restore one resource to its base value' : undefined}
            style={{ flex: 1, cursor: canSpend ? 'pointer' : 'default', outline: canSpend ? '1px solid rgba(212,160,16,0.28)' : undefined }}
          >
            <ResourceCounter rkey="relics" label="Relics" Icon={RelicsIcon} />
          </div>
          {isShub && <ResourceCounter rkey="theChanged" label="Changed" Icon={TheChangedIcon} />}
          <PassiveSummaryButton />
        </div>
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
cd E:\Project Abyssial\Code\project-abyssial && npm run build
```

Expected: `✓ built in ~1s`, 0 errors.

- [ ] **Step 4: Manual smoke test**

Start a run. Verify:

1. **Button present** — a small gold `↻` button appears at the right end of the resource bar while in `playing` phase.
2. **Tap opens tooltip** — tapping `↻` opens a fixed tooltip above it with two rows: "↻ each reshuffle" and "⬇ on draw".
3. **Empty state** — at run start (no passive cards yet), both rows show `—`.
4. **With passives** — draw `forgers_debt` (passive: dread+1/reshuffle) and resolve it. Then acquire `his_research_notes` (passive: relics+1/reshuffle; onDraw: dread+1). Tap `↻`. Verify:
   - "↻ each reshuffle" shows `+2 dread +1 relics` (forgers_debt dread+1 + his_research_notes relics+1)

     Wait — `forgers_debt` is a threat: it'll go to `permDiscardPile` after resolution (single-use). So after resolving it, it won't be in drawPile/discardPile. Use a run where `forgers_debt` hasn't been resolved yet to test the reshuffle row. Or: acquire `his_research_notes` (permanent treat) and verify "↻ each reshuffle" shows `+1 relics` and "⬇ on draw" shows `+1 dread`.

5. **Tap closes tooltip** — tapping `↻` again closes the tooltip.
6. **`↻` absent outside playing** — navigate to menu/victory/gameOver. The button should not render.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/ResourceBar.tsx
git commit -m "ui(P10-28): wire PassiveSummaryButton into resource bar"
```

---

## Final verification

- [ ] **Full build check**

```bash
cd E:\Project Abyssial\Code\project-abyssial && npm run build
```

Expected: `✓ built in ~1s`, zero TypeScript errors, zero warnings.
