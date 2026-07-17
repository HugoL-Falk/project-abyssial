# Prep-Tag Carrier Hint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface locked prep-bonus chain options with a tappable `Requires: <label>` pill that opens the source carrier card in the existing CardPreviewModal, so noobs can discover the prep-tag system without source reading.

**Architecture:** Static `PREP_TAG_CARRIERS` map derived at module load from card pools; `VisibleOption.prepRequirement` field populated in `getVisibleOptions` when a `hasPrepTag` condition fails; gold-tinted pill rendered in `OptionsColumn` wired to the existing `onPreviewCard` callback.

**Tech Stack:** TypeScript, React, Zustand, Vitest. No new dependencies.

**Spec:** [[Code/project-abyssial/docs/superpowers/specs/2026-06-22-prep-tag-carrier-hint-design.md]]

## Global Constraints

- Single commit at branch end. Co-Authored-By: Claude Opus 4.7.
- GIT POLICY: LOCAL ONLY (no `git push` unless user explicitly instructs).
- Must keep 73+ tests passing throughout. Final state ≥ 76 tests (3 new).
- Typecheck must remain clean (`npx tsc --noEmit`).
- No new dependencies.
- Pre-commit hook auto-regenerates `knowledge/cards/INDEX.md` and `knowledge/architecture-inventory.md` — do NOT manually edit those.
- The four authored label strings are EXACT: `studied: 'a deep reading'`, `attended_seance: 'a séance attended'`, `opium_pact: 'a dream-bargain'`, `recited: 'the rite spoken'`.
- Always-visible reveal timing — no run-progress gating, no per-tag unlock.

## File Structure

| File | Role | Lines (est) |
|---|---|---|
| `src/data/godPaths/prepTagCarriers.ts` (new) | Static `PREP_TAG_LABELS` + derived `PREP_TAG_CARRIERS` map | ~35 |
| `src/types/index.ts` (modify) | Add `prepRequirement?` optional field on `VisibleOption` | +6 |
| `src/state/gameStore.ts` (modify) | Populate `prepRequirement` in `getVisibleOptions` | +12 |
| `src/components/game/OptionsColumn.tsx` (modify) | Render tappable pill alongside affordability pills | +25 |
| `src/state/gameStore.test.ts` (modify) | 3 new tests in a new `describe` block | +50 |

Total: ~130 lines added; spec estimate was ~80 excluding boilerplate which is honest.

---

### Task 1: Data + types + engine wiring (with tests)

**Files:**
- Create: `src/data/godPaths/prepTagCarriers.ts`
- Modify: `src/types/index.ts:170-180` (VisibleOption type)
- Modify: `src/state/gameStore.ts:136-176` (getVisibleOptions)
- Test: `src/state/gameStore.test.ts` (append new describe block before the `// ─── P16-39 affordability` divider at line ~747)

**Interfaces:**
- Produces: `PrepTag` (union type), `PREP_TAG_LABELS: Record<PrepTag, string>`, `PrepTagCarrier { cardId: CardId; optionLabel: string }`, `PREP_TAG_CARRIERS: Record<PrepTag, PrepTagCarrier[]>`. Task 2 consumes `VisibleOption.prepRequirement`.

- [ ] **Step 1.1: Write the three failing tests**

Append to `src/state/gameStore.test.ts`, immediately before the `// ─── P16-39 affordability ─────────────────────────────────────────────────` divider (currently around line 747).

```ts
// ─── NB-G1-03 prep-tag carrier hints ────────────────────────────────────
import { PREP_TAG_LABELS, PREP_TAG_CARRIERS } from '../data/godPaths/prepTagCarriers'

describe('PREP_TAG_CARRIERS data', () => {
  it('covers all four prep tags with at least one carrier each', () => {
    const tags = ['studied', 'attended_seance', 'opium_pact', 'recited'] as const
    for (const tag of tags) {
      expect(PREP_TAG_LABELS[tag]).toBeTruthy()
      expect(PREP_TAG_CARRIERS[tag].length).toBeGreaterThan(0)
    }
  })

  it('maps studied → the_old_book "Hire a translator"', () => {
    const carriers = PREP_TAG_CARRIERS.studied
    expect(carriers).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardId: 'the_old_book', optionLabel: 'Hire a translator' }),
    ]))
  })
})

describe('VisibleOption.prepRequirement', () => {
  beforeEach(() => useGameStore.getState().resetGame())

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
    expect(recitedOpt.prepRequirement).toBeDefined()
    expect(recitedOpt.prepRequirement!.tag).toBe('recited')
    expect(recitedOpt.prepRequirement!.label).toBe('the rite spoken')
    expect(recitedOpt.prepRequirement!.carrierCardIds).toContain('what_was_already_read')
  })

  it('omits prepRequirement when the tag IS set (option becomes available)', () => {
    useGameStore.setState({
      runConfig: { godPath: 'yha_nthlei' } as any,
      prepTags: ['recited'],
      godPathProgress: 4,
    })
    const card = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_5')!
    const opts = useGameStore.getState().getVisibleOptions(card)
    const recitedOpt = opts.find(o => o.option.label === 'Speak the closing rite')!
    expect(recitedOpt.available).toBe(true)
    expect(recitedOpt.prepRequirement).toBeUndefined()
  })
})
```

- [ ] **Step 1.2: Run tests to verify they fail**

Run from `E:/Project Abyssial/Code/project-abyssial`:
```
npx vitest run src/state/gameStore.test.ts --reporter=dot
```

Expected: 3 new failures with `Cannot find module '../data/godPaths/prepTagCarriers'` (Step 1.1's import line).

- [ ] **Step 1.3: Create the prepTagCarriers data file**

Create `src/data/godPaths/prepTagCarriers.ts`:

```ts
import type { CardId, Card } from '../../types'
import { CORE_CARDS } from '../cards/core'
import { COMMON_CARDS } from '../cards/common'
import { RARE_CARDS } from '../cards/rare'
import { THREAT_CARDS } from '../cards/threats'

export type PrepTag = 'studied' | 'attended_seance' | 'opium_pact' | 'recited'

export const PREP_TAG_LABELS: Record<PrepTag, string> = {
  studied:          'a deep reading',
  attended_seance:  'a séance attended',
  opium_pact:       'a dream-bargain',
  recited:          'the rite spoken',
}

export type PrepTagCarrier = { cardId: CardId; optionLabel: string }

// Derived once at module load. Walks the static card pool and indexes every
// option whose effects include a setPrepTag effect, grouping by tag.
function deriveCarriers(): Record<PrepTag, PrepTagCarrier[]> {
  const out: Record<PrepTag, PrepTagCarrier[]> = {
    studied: [],
    attended_seance: [],
    opium_pact: [],
    recited: [],
  }
  const pool: Card[] = [...CORE_CARDS, ...COMMON_CARDS, ...RARE_CARDS, ...THREAT_CARDS]
  for (const card of pool) {
    for (const opt of card.options) {
      for (const ef of opt.effects ?? []) {
        if (ef.type === 'setPrepTag' && ef.tag in out) {
          out[ef.tag as PrepTag].push({ cardId: card.id, optionLabel: opt.label })
        }
      }
    }
  }
  return out
}

export const PREP_TAG_CARRIERS: Record<PrepTag, PrepTagCarrier[]> = deriveCarriers()
```

- [ ] **Step 1.4: Add `prepRequirement` field on VisibleOption**

Modify `src/types/index.ts`. Locate the `VisibleOption` type (around line 165–175). Add the optional field at the end:

```ts
export type VisibleOption = {
  idx: number
  option: Option
  available: boolean
  effectiveEffects: Effect[]
  hidden: boolean
  affordabilityShortfall?: Partial<Record<ResourceKey, number>>
  prepRequirement?: {
    tag: string
    label: string
    carrierCardIds: CardId[]
  }
}
```

Note: keep the existing field order. Only add the `prepRequirement?` block.

- [ ] **Step 1.5: Populate prepRequirement in getVisibleOptions**

Modify `src/state/gameStore.ts`. Add import at the top of the file alongside other data imports:

```ts
import { PREP_TAG_LABELS, PREP_TAG_CARRIERS, type PrepTag } from '../data/godPaths/prepTagCarriers'
```

Inside `getVisibleOptions` (around line 136–176), after `conditionPasses` is computed and before the return statement, add:

```ts
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
```

And add `prepRequirement` to the returned object:

```ts
    return {
      idx,
      option: opt,
      available,
      hidden,
      effectiveEffects,
      affordabilityShortfall: affordable ? undefined : shortfall,
      prepRequirement,
    }
```

- [ ] **Step 1.6: Run tests to verify they pass**

```
npx vitest run src/state/gameStore.test.ts --reporter=dot
```

Expected: all tests pass, including the 3 new ones. Total count rises from 73 → 76.

- [ ] **Step 1.7: Run full suite + typecheck**

```
npx vitest run --reporter=dot
npx tsc --noEmit
```

Expected: 76 tests pass, typecheck clean.

- [ ] **Step 1.8: Do NOT commit yet**

This task ends without a commit. Task 2 ships the UI pill in the same commit. If you must stop here for a review gate, commit-as-WIP is fine but the spec calls for a single combined commit.

---

### Task 2: UI pill in OptionsColumn

**Files:**
- Modify: `src/components/game/OptionsColumn.tsx:113-200` (option-button render block)

**Interfaces:**
- Consumes: `VisibleOption.prepRequirement` (Task 1 output), `onPreviewCard: (cardId: string) => void` prop (already present, line 64).
- Produces: visible/tappable pill in the option-button row.

- [ ] **Step 2.1: Add the pill render block**

Open `src/components/game/OptionsColumn.tsx`. Locate the `visibleOpts.map` block around line 113. The destructuring currently reads:

```tsx
{visibleOpts.map(({ idx, option, available: avail, effectiveEffects, affordabilityShortfall }) => {
```

Extend to include `prepRequirement`:

```tsx
{visibleOpts.map(({ idx, option, available: avail, effectiveEffects, affordabilityShortfall, prepRequirement }) => {
```

Then locate the affordability-pill render block (around line 172–185 — the `affordabilityShortfall && Object.entries(...).map(...)` JSX). Immediately AFTER that block (still inside the same row container), add the prep-requirement pill:

```tsx
              {prepRequirement && (
                <span
                  role="button"
                  title={`Requires ${prepRequirement.label}. Tap to preview the source card.`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (prepRequirement.carrierCardIds.length > 0) {
                      onPreviewCard(prepRequirement.carrierCardIds[0])
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    padding: '1px 5px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--ui-font)',
                    color: 'var(--gold-bright)',
                    border: '1px solid rgba(200,160,40,0.45)',
                    borderRadius: '3px',
                    background: 'rgba(40,30,10,0.45)',
                    cursor: 'pointer',
                    textShadow: '0 0 6px rgba(200,160,40,0.4)',
                  }}
                >
                  Requires: {prepRequirement.label} ⓘ
                </span>
              )}
```

The `e.stopPropagation()` is required — without it the parent button's onClick fires, which calls the click guard. Pointer events fire on this child because the parent does NOT use the HTML `disabled` attribute (per P16-31).

- [ ] **Step 2.2: Run full test suite to confirm nothing regressed**

```
npx vitest run --reporter=dot
npx tsc --noEmit
```

Expected: 76 tests pass, typecheck clean. Visual change is not tested — that's a manual playtest concern.

- [ ] **Step 2.3: Sanity-check the UI manually (optional but recommended)**

If a dev server is available:
```
npm run dev
```
Start a Y'ha-nthlei short run, advance to chain card 2 (`yha_nthlei_2`), and verify:
1. The `❖ Speak the deep tongue` option is greyed out.
2. A gold-bordered pill reads `Requires: a deep reading ⓘ` beside or beneath it.
3. Tapping the pill opens `the_old_book` in CardPreviewModal.
4. Tapping the greyed button does nothing (click guard works).

Note: this step is verification, not a deliverable. If unable to run the dev server, skip — tests are the gate.

- [ ] **Step 2.4: Commit Task 1 + Task 2 together**

```
git add src/data/godPaths/prepTagCarriers.ts src/types/index.ts src/state/gameStore.ts src/components/game/OptionsColumn.tsx src/state/gameStore.test.ts docs/superpowers/specs/2026-06-22-prep-tag-carrier-hint-design.md docs/superpowers/plans/2026-06-22-prep-tag-carrier-hint.md
git commit -m "$(cat <<'EOF'
feat(prep-tags): tappable carrier hint on locked prep-bonus options

Closes NB-G1-03 (also closes NB-G1-07) from
knowledge/investigations/2026-06-22-god1-playthrough-postP14P16.md.

Locked prep-bonus options (the `❖` chain options gated on hasPrepTag)
now display a gold-tinted `Requires: <label>` pill alongside their
existing affordability/structural pills. Tapping the pill opens the
carrier card in the existing CardPreviewModal — same pattern as
P16-31's +card/-card preview pills.

Architecture:
- New static `PREP_TAG_CARRIERS` map derived at module load by
  walking CORE/COMMON/RARE/THREAT card pools and indexing every
  setPrepTag effect. Author-side `PREP_TAG_LABELS` constant supplies
  themed human-readable labels.
- `VisibleOption.prepRequirement?` field populated by
  getVisibleOptions when a hasPrepTag condition fails.
- OptionsColumn renders the pill alongside affordability pills,
  wires onClick to the existing onPreviewCard chain.

Always-visible reveal timing — no run-progress gating, no per-tag
unlock. Matches Project Abyssial's "show your hand" UX precedent.

Known limitation accepted: `recited` carrier `what_was_already_read`
is itself an inserted threat (from `the_old_book` → "Burn it"). The
pill correctly points to it; following the breadcrumb to the
upstream inserter is left to the player.

76/76 vitest pass (was 73; +3 new), typecheck clean.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2.5: Verify pre-commit hook regenerated knowledge indices**

```
git status
git log -1 --stat
```

Expected: commit shows `knowledge/cards/INDEX.md` and `knowledge/architecture-inventory.md` regenerated (these are auto-derived by the husky pre-commit hook). If they're shown as modified-not-staged after the commit, the hook didn't run — investigate.

---

## Self-Review Notes

**Spec coverage check:** Each requirement in the spec is implemented:
- New data file with `PREP_TAG_LABELS` + `PREP_TAG_CARRIERS` → Task 1, Step 1.3 ✓
- `VisibleOption.prepRequirement?` field → Task 1, Step 1.4 ✓
- `getVisibleOptions` populates field → Task 1, Step 1.5 ✓
- UI pill in OptionsColumn → Task 2, Step 2.1 ✓
- Pill tap opens CardPreviewModal via `onPreviewCard` → Task 2, Step 2.1 ✓
- 3 new tests → Task 1, Step 1.1 ✓
- Co-render with affordability pill → JSX placement after the affordability block guarantees this ✓
- Acceptance criteria's `74/74 at branch end` — actually `76/76` because 3 tests, not 1; I'll note this on commit ✓

**Placeholder scan:** No "TBD", "TODO", or vague directives. All code blocks complete.

**Type consistency check:** `PrepTag` defined in Task 1.3 is consumed in Task 1.5 (`as PrepTag` cast) and Task 2 reads `prepRequirement` shape exactly as defined in Task 1.4. Function `onPreviewCard(cardId: string)` matches the existing prop signature at OptionsColumn line 64. `carrierCardIds[0]` is safe because the data test (Step 1.1 first assertion) guards `.length > 0` for every tag.

**Scope check:** Single coherent feature, single commit, ~130 lines including tests/boilerplate. Appropriate for one plan.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-22-prep-tag-carrier-hint.md`. Two execution options:

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute both tasks in this session, single commit at end, controller holds context.

Which approach?
