# Dread Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply three engine/UI refinements to dread mechanics: (1) suppress passive dread-gain on the first reshuffle, (2) add a pulsating visual warning on dread tags that would push the player into overflow, (3) replace the doom-escalation tier curve so tier 4 lands on the final reshuffle of a normal short run.

**Architecture:** Engine changes in `src/engine/deck.ts` (signature changes to `applyPassivesForReshuffle` and `getUnravellingTier`), two call-site updates each in `src/state/gameStore.ts` and `src/engine/gameLoop.ts`, and a UI change in `src/components/game/EffectTags.tsx` with one prop threaded from `src/components/game/OptionsColumn.tsx` (which already subscribes to the store).

**Tech Stack:** React + Vite + TypeScript PWA. **No test framework is configured** — verification is via `npm run typecheck`, `npm run build`, and manual playtest. Spec: `docs/superpowers/specs/2026-06-12-dread-refinement-design.md`.

---

## Files Touched

| Path | Change | Approx LOC |
|---|---|---|
| `src/engine/deck.ts` | `applyPassivesForReshuffle` gains `suppressDreadGain` arg; `getUnravellingTier` rewritten and loses `runLength` arg | ~12 |
| `src/state/gameStore.ts` | `reshuffleOnly` call-site updates (2 lines) | ~2 |
| `src/engine/gameLoop.ts` | `executeReshuffle` call-site updates + signature unchanged (runConfig still used elsewhere) | ~3 |
| `src/components/game/EffectTags.tsx` | New `currentDread` prop; dread-positive tag gets pulsating animation when overflow imminent; keyframe injected once via `<style>` tag | ~25 |
| `src/components/game/OptionsColumn.tsx` | Thread `currentDread` to `EffectTags` (read from store) | ~3 |

Total ≈ 45 LOC across 5 files. No file approaches the 300-line refactor threshold.

---

## Task 1 — P10-35 engine: rewrite `getUnravellingTier`

**Files:**
- Modify: `src/engine/deck.ts:190-193`

- [ ] **Step 1: Replace `getUnravellingTier`**

In `src/engine/deck.ts`, replace lines 190–193 (the existing `getUnravellingTier` function) with:

```ts
export function getUnravellingTier(reshuffleCount: number): number {
  if (reshuffleCount <= 2) return 1
  if (reshuffleCount <= 4) return 2
  if (reshuffleCount === 5) return 3
  return 4
}
```

Note: the `RunLength` type import in this file may now be unused. If TypeScript complains in step 5, remove the import.

- [ ] **Step 2: Update call site in `src/state/gameStore.ts:955`**

Find:

```ts
const unravellingTier = getUnravellingTier(reshuffleCount, state.runConfig!.runLength)
```

Replace with:

```ts
const unravellingTier = getUnravellingTier(reshuffleCount)
```

- [ ] **Step 3: Update call site in `src/engine/gameLoop.ts:230`**

Find:

```ts
const unravellingTier = getUnravellingTier(reshuffleCount, runConfig.runLength)
```

Replace with:

```ts
const unravellingTier = getUnravellingTier(reshuffleCount)
```

Note: leave the `runConfig` parameter on `executeReshuffle` as-is — it may be used by other code paths.

- [ ] **Step 4: Run typecheck**

Run from `E:/Project Abyssial/Code/project-abyssial/`:

```
npm run typecheck
```

Expected: PASS, zero errors. If you get "RunLength is declared but never used", remove the unused import from `deck.ts`.

- [ ] **Step 5: Manual smoke verification (paste into browser console after running `npm run dev`)**

Open the running dev server, browser devtools console:

```js
// Import path will be Vite-mangled; instead exercise via the store
const s = window.__store__ // skip if not exposed — see fallback below
```

Fallback (no store exposure): start a run, then in the browser console run only the assertion logic against a function call via the bundled module — OR skip this step and rely on the unit-style assertions in step 6.

- [ ] **Step 6: Inline assertion in a throwaway script**

From the project root, create `scripts/_check-tier.mjs`:

```js
// Throwaway — delete after running.
import { getUnravellingTier } from '../src/engine/deck.ts'
const expected = [null, 1, 1, 2, 2, 3, 4, 4, 4]
for (let i = 1; i <= 8; i++) {
  const got = getUnravellingTier(i)
  if (got !== expected[i]) {
    console.error(`reshuffleCount=${i}: expected ${expected[i]}, got ${got}`)
    process.exit(1)
  }
}
console.log('OK: tier curve matches')
```

Run:

```
npx tsx scripts/_check-tier.mjs
```

Expected: `OK: tier curve matches`. If `tsx` is unavailable, skip this step — typecheck + manual playtest in Task 5 is sufficient.

- [ ] **Step 7: Delete the throwaway script (if created)**

```
rm scripts/_check-tier.mjs
```

- [ ] **Step 8: Commit**

```
git add src/engine/deck.ts src/state/gameStore.ts src/engine/gameLoop.ts
git commit -m "feat(dread): new tier curve 1,1,2,2,3,4 for doom escalation (P10-35)"
```

---

## Task 2 — P11-21 engine: suppress dread-positive passives on first reshuffle

**Files:**
- Modify: `src/engine/deck.ts:157-188` (`applyPassivesForReshuffle`)
- Modify: `src/state/gameStore.ts:956`
- Modify: `src/engine/gameLoop.ts:232`

- [ ] **Step 1: Add `suppressDreadGain` parameter to `applyPassivesForReshuffle`**

In `src/engine/deck.ts`, replace the existing `applyPassivesForReshuffle` (lines 157–188) with:

```ts
export function applyPassivesForReshuffle(
  deck: DeckState,
  resources: import('../types').Resources,
  suppressDreadGain: boolean = false,
): import('../types').Resources {
  const isSuppressedDreadGain = (e: { type: string; resource?: string; delta?: number }) =>
    suppressDreadGain && e.type === 'resource' && e.resource === 'dread' && (e.delta ?? 0) > 0

  let r = resources
  const allCards = [...deck.drawPile, ...deck.discardPile]
  for (const card of allCards) {
    if (card.passive?.trigger === 'reshuffle') {
      for (const effect of card.passive.effects) {
        if (effect.type === 'resource') {
          if (isSuppressedDreadGain(effect)) continue
          r = { ...r, [effect.resource]: r[effect.resource] + effect.delta }
        } else if (effect.type === 'randomOutcome') {
          // Weighted pick one outcome branch
          const total = effect.outcomes.reduce((s, o) => s + o.weight, 0)
          let roll  = Math.random() * total
          for (const outcome of effect.outcomes) {
            roll -= outcome.weight
            if (roll <= 0) {
              for (const e of outcome.effects) {
                if (e.type === 'resource') {
                  if (isSuppressedDreadGain(e)) continue
                  r = { ...r, [e.resource]: r[e.resource] + e.delta }
                }
              }
              break
            }
          }
        }
      }
    }
  }
  return r
}
```

- [ ] **Step 2: Update call site in `src/state/gameStore.ts:956`**

Find:

```ts
const resources = applyPassivesForReshuffle(state.deck, state.resources)
```

Replace with:

```ts
const resources = applyPassivesForReshuffle(state.deck, state.resources, reshuffleCount === 1)
```

(Note: at this call site, `reshuffleCount` has already been incremented on line 954 — so `reshuffleCount === 1` correctly identifies the *first* reshuffle.)

- [ ] **Step 3: Update call site in `src/engine/gameLoop.ts:232`**

Find:

```ts
resources = applyPassivesForReshuffle(deck, resources)
```

Replace with:

```ts
resources = applyPassivesForReshuffle(deck, resources, reshuffleCount === 1)
```

(At this call site, `reshuffleCount` has already been incremented on line 229.)

- [ ] **Step 4: Run typecheck**

```
npm run typecheck
```

Expected: PASS, zero errors.

- [ ] **Step 5: Commit**

```
git add src/engine/deck.ts src/state/gameStore.ts src/engine/gameLoop.ts
git commit -m "feat(dread): suppress dread-positive passives on first reshuffle (P11-21)"
```

---

## Task 3 — P10-25 UI: pulsating dread-overflow indicator

**Files:**
- Modify: `src/components/game/EffectTags.tsx` (signature + render branch + keyframe injection)
- Modify: `src/components/game/OptionsColumn.tsx:54-153` (thread new prop)

- [ ] **Step 1: Add `currentDread` and `isTutorial` props to `EffectTags`**

In `src/components/game/EffectTags.tsx`, update the `EffectTags` component signature (around lines 215–223):

Find:

```ts
export function EffectTags({ effects, onPreviewCard, inline, godPathCtx, currentCardId, cardTier, cardPermanent }: {
  effects: Effect[]
  onPreviewCard?: (cardId: string) => void
  inline?: boolean
  godPathCtx?: { godPath: GodPath; chainStage: number; chainTotal: number }
  currentCardId?: string
  cardTier?: string
  cardPermanent?: boolean
}) {
```

Replace with:

```ts
export function EffectTags({ effects, onPreviewCard, inline, godPathCtx, currentCardId, cardTier, cardPermanent, currentDread, isTutorial }: {
  effects: Effect[]
  onPreviewCard?: (cardId: string) => void
  inline?: boolean
  godPathCtx?: { godPath: GodPath; chainStage: number; chainTotal: number }
  currentCardId?: string
  cardTier?: string
  cardPermanent?: boolean
  currentDread?: number
  isTutorial?: boolean
}) {
```

- [ ] **Step 2: Update the dread-resource render branch to apply pulsating animation when overflow imminent**

In the same file, locate the resource-tag render block (around lines 243–255):

Find:

```ts
    if (e.type === 'resource') {
      const pos  = e.delta > 0
      // Dread: going up is bad (red), going down is good (green)
      const color = e.resource === 'dread'
        ? (pos ? '#aa6464' : '#6aaa6a')
        : (pos ? '#6aaa6a' : '#aa6464')
      const Icon = RESOURCE_ICONS[e.resource]
      tags.push(
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.9rem', color, padding: '0.15rem 0.38rem', borderRadius: '2px' }}>
          {Icon && <Icon />}{pos ? '+' : ''}{e.delta}
        </span>
      )
    } else if (e.type === 'victory') {
```

Replace with:

```ts
    if (e.type === 'resource') {
      const pos  = e.delta > 0
      // Dread: going up is bad (red), going down is good (green)
      const color = e.resource === 'dread'
        ? (pos ? '#aa6464' : '#6aaa6a')
        : (pos ? '#6aaa6a' : '#aa6464')
      const Icon = RESOURCE_ICONS[e.resource]
      const willOverflow =
        !isTutorial &&
        e.resource === 'dread' &&
        pos &&
        typeof currentDread === 'number' &&
        currentDread + e.delta >= 10
      tags.push(
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.9rem', color, padding: '0.15rem 0.38rem', borderRadius: '2px' }}>
          {Icon && <Icon />}
          <span
            style={willOverflow ? {
              display: 'inline-block',
              transformOrigin: 'center',
              animation: 'pulseDreadOverflow 1.2s ease-in-out infinite',
            } : undefined}
          >
            {pos ? '+' : ''}{e.delta}
          </span>
        </span>
      )
    } else if (e.type === 'victory') {
```

- [ ] **Step 3: Inject the keyframe definition once at the bottom of the rendered tag list**

In the same file, locate the final `return` of `EffectTags` (around line 395–397):

Find:

```ts
  if (tags.length === 0) return null
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: inline ? 0 : '0.3rem' }}>{tags}</div>
}
```

Replace with:

```ts
  if (tags.length === 0) return null
  return (
    <>
      <style>{`@keyframes pulseDreadOverflow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } }`}</style>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: inline ? 0 : '0.3rem' }}>{tags}</div>
    </>
  )
}
```

(The `<style>` tag is re-emitted per render of `EffectTags`, but browsers de-duplicate identical keyframe definitions and the cost is negligible. Hoisting it into `index.html` would be cleaner but adds out-of-scope plumbing.)

- [ ] **Step 4: Thread `currentDread` and `isTutorial` from `OptionsColumn`**

In `src/components/game/OptionsColumn.tsx`, the component already imports `useGameStore` and receives `isTutorial` as a prop (verify by reading line 54). Add a single store selector inside the component body (near the top of the component, right after the props destructure):

```ts
const currentDread = useGameStore(s => s.resources.dread)
```

Then update the `EffectTags` invocation (around lines 143–153):

Find:

```ts
              <EffectTags
                effects={effectiveEffects}
                onPreviewCard={avail ? onPreviewCard : undefined}
                inline
                currentCardId={currentCard?.id}
                cardTier={currentCard?.tier}
                cardPermanent={currentCard?.permanent}
                godPathCtx={currentCard?.tier === 'god_path' && currentCard.godPath && currentCard.chainStage
                  ? { godPath: currentCard.godPath, chainStage: currentCard.chainStage, chainTotal }
                  : undefined}
              />
```

Replace with:

```ts
              <EffectTags
                effects={effectiveEffects}
                onPreviewCard={avail ? onPreviewCard : undefined}
                inline
                currentCardId={currentCard?.id}
                cardTier={currentCard?.tier}
                cardPermanent={currentCard?.permanent}
                currentDread={currentDread}
                isTutorial={isTutorial}
                godPathCtx={currentCard?.tier === 'god_path' && currentCard.godPath && currentCard.chainStage
                  ? { godPath: currentCard.godPath, chainStage: currentCard.chainStage, chainTotal }
                  : undefined}
              />
```

- [ ] **Step 5: Run typecheck**

```
npm run typecheck
```

Expected: PASS, zero errors.

- [ ] **Step 6: Run build (catches JSX issues typecheck can miss)**

```
npm run build
```

Expected: clean build.

- [ ] **Step 7: Commit**

```
git add src/components/game/EffectTags.tsx src/components/game/OptionsColumn.tsx
git commit -m "feat(dread): pulsating overflow indicator on dread tags at >=10 (P10-25)"
```

---

## Task 4 — Audit other `EffectTags` call sites

`EffectTags` is also used outside `OptionsColumn` (e.g. card preview modals). Those callers will still work — `currentDread` and `isTutorial` are optional and the pulse simply won't fire when they're not provided. This is the intended behavior (preview modals show the raw effect, not the player's current-state overflow risk).

- [ ] **Step 1: Confirm all call sites still typecheck**

```
npm run typecheck
```

Expected: PASS. If any call site errors, it's because of an unrelated upstream change — fix only what's needed to restore the build.

- [ ] **Step 2: Grep for other call sites (informational only)**

```
grep -rn "EffectTags" src/ --include="*.tsx"
```

Sanity check: every other call site renders effects without overflow-warning context, which is correct.

- [ ] **Step 3: No commit needed if typecheck passes** (this task is verification only).

---

## Task 5 — Manual playtest verification

This is the final gate before marking the backlog items done. The agent executing this plan should pause here for the user to run through these checks; do not mark the plan complete until the user confirms.

- [ ] **Check 1: P11-21 — first-reshuffle passive suppression**

Steps:
1. Start a new short run.
2. Select a blessing or seed a starting deck that includes a card with `passive.trigger === 'reshuffle'` and a positive dread effect — e.g. ensure `forgers_debt` enters the deck.
3. Play through to first reshuffle.
4. Confirm dread did **not** rise from the passive.
5. Continue play to second reshuffle.
6. Confirm dread **did** rise from the passive on reshuffle 2.

Pass criterion: passive dread silent on reshuffle 1; active on reshuffle 2+.

- [ ] **Check 2: P11-21 — non-dread passives still fire on reshuffle 1**

If a reshuffle-passive card with a non-dread effect (e.g. a follower or gold delta) exists, confirm its effect still fires on reshuffle 1. If no such card exists in current data, this check is moot.

- [ ] **Check 3: P10-25 — pulsating overflow indicator visible**

Steps:
1. Set dread to 8 via debug or play (e.g. via opening rounds).
2. Find any option with `dread +2` or `dread +3`.
3. Confirm the delta number pulses (font-size oscillates ~1.0 ↔ 1.18 every ~1.2s).
4. Find an option with `dread +1` while at dread 8 — should NOT pulse (8+1=9, below threshold).
5. Find an option with `dread +1` while at dread 9 — should pulse (9+1=10).

Pass criterion: pulse fires iff `currentDread + delta >= 10`.

- [ ] **Check 4: P10-25 — tutorial suppresses pulse**

In a tutorial run, no dread tag should ever pulse, regardless of values. (Tutorial bypasses dread overflow mechanics, so the visual would mislead.)

- [ ] **Check 5: P10-35 — tier 4 lands on final reshuffle**

Play a full short run through 6 reshuffles. Confirm:
- Reshuffles 1–2 insert `unravelling_1` (The Veil Thins)
- Reshuffles 3–4 insert `unravelling_2` (The Geometry Is Wrong)
- Reshuffle 5 inserts `unravelling_3` (Something Is Listening)
- Reshuffle 6 inserts `unravelling_4` (The Congregation Changes)

Pass criterion: each tier as expected. Note: a `pendingUnravelling` from a mid-run dread spike may bump the next reshuffle's tier by +1 — that is intentional and unchanged from previous behavior.

- [ ] **Check 6: Save/load survives the changes**

After at least one reshuffle, reload the page. Confirm the run resumes and dread / reshuffleCount / unravellingTier persist correctly.

---

## Task 6 — Knowledge base updates (post-implementation)

Once Task 5 passes, perform these vault updates. These are Markdown-only changes inside `E:/Project Abyssial/knowledge/` and are NOT git-tracked (vault is the Obsidian workspace, not the code repo).

- [ ] **Step 1: Append decision block to `knowledge/decisions.md`**

Append below the "Session 67 Design Decisions" block:

```md
## Session 68 Design Decisions — Dread Refinement (P10-25/P10-35/P11-21)

| Topic | Decision |
|---|---|
| First-reshuffle passive dread | Suppressed on `reshuffleCount === 1` (dread-positive resource effects only; non-dread passives still fire). `unravelling_1` still inserts. |
| Dread overflow UI | EffectTags pulsates the dread delta font-size when `currentDread + delta >= 10`. Pure UI; option remains clickable. Suppressed in tutorial. |
| Doom tier curve | Explicit table: reshuffles 1–2 → tier 1, 3–4 → tier 2, 5 → tier 3, 6+ → tier 4. `runLength` parameter dropped from `getUnravellingTier` (always short post-P13-16). |
| pendingUnravelling tier bump | Unchanged — dread spike still bumps next reshuffle's tier by +1. |
| dreadPressureScaling | Unchanged — tuning deferred to a post-playtest backlog item. |
| Reference | Spec `docs/superpowers/specs/2026-06-12-dread-refinement-design.md` · Plan `docs/superpowers/plans/2026-06-12-dread-refinement.md`. |
```

- [ ] **Step 2: Update `knowledge/backlog.md`**

Under "Session: Dread Refinement", mark all three items complete and add a strikethrough/COMPLETE header (mirroring the format used for prior sessions, e.g. "Session: Dread Economy"). Add a new bullet under the still-open balance section:

```md
- **Dread pressure scaling tuning (post-playtest):** Review `dreadPressureScaling` intensity (currently `unravellingTier - 1`, max +3 at tier 4) after playtest 14 data. Open candidates: cap at +2, cap at +1, activate only at tier 3+. Carrier card: `the_old_book`. Agent: Balance.
```

- [ ] **Step 3: Write session log `knowledge/sessions/session-68.md`**

Use the same format as session-67.md. Cover: commits landed, files touched, design decisions locked, manual verification status, and the new backlog item.

- [ ] **Step 4: Append lessons to `knowledge/agents/code.md` and `knowledge/agents/balance.md`** if any subagent was spawned during implementation. Per CLAUDE.md, always append even when the proposal was rejected. Skip this step if no subagent was used.

---

## Risk & Rollback

**Lowest-risk task:** Task 1 (`getUnravellingTier` rewrite) — pure function, no state machine impact, one file to revert.

**Highest-risk task:** Task 3 (`EffectTags` change) — touches a frequently-rendered component. Mitigation: `currentDread` is optional; behavior with prop undefined matches pre-change. Rollback is a single `git revert` of Task 3's commit.

**Task 2 risk:** Save format unchanged (`suppressDreadGain` is a function parameter, not persisted state). Loading a save from before this change continues to work.

**Rollback procedure:** Each task is a standalone commit. `git revert <hash>` any task independently without disturbing the others.

---

## Self-Review (against the spec)

1. **P11-21 — suppress passives on first reshuffle, dread-positive only:** Covered by Task 2. The `suppressDreadGain` flag filters only `resource: dread, delta > 0` effects, including inside `randomOutcome` outcomes. Non-dread and dread-reduction effects pass through. ✓
2. **P10-25 — pulsating font-size on overflow:** Covered by Task 3. Keyframe `pulseDreadOverflow` (1.0 → 1.18 → 1.0, 1.2s loop). Applies only when `currentDread + delta >= 10` and not in tutorial. ✓
3. **P10-35 — new curve 1,1,2,2,3,4 (and sticky at 4):** Covered by Task 1. Explicit if-chain matches the spec table exactly. ✓
4. **Drop `runLength` parameter:** Covered in Task 1, Step 3 (call sites updated in both `gameStore` and `gameLoop`). ✓
5. **dreadPressureScaling unchanged:** No task touches `dreadPressure = unravellingTier - 1` in `gameStore.resolveOption` or `applyPassivesForReshuffle`. ✓
6. **pendingUnravelling bump unchanged:** No task touches the `Math.min(4, unravellingTier + 1)` adjustment in `reshuffleOnly` or `executeReshuffle`. ✓
7. **Backlog updates:** Task 6 covers decisions.md, backlog.md, sessions log, and agent learnings. ✓
8. **Verification:** Typecheck after each task, build after Task 3, and Task 5's manual playtest covers all spec requirements. ✓

No placeholders, no "TBD", no "similar to Task N". All code blocks complete.
