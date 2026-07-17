# Deck & Reshuffle Week-Cadence — Plan B (Balance Audit + Reflavour + Week Framing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **⚠️ GATE — DO NOT START PLAN B UNTIL:** (1) Plan A is fully merged and on trunk, AND (2) the user has playtested the new cadence at least once. Plan B's reflavour and balance tasks consume what the playtest + audit reveal. If either is missing, STOP and tell the user.

**Goal:** Complete the "every reshuffle feels like a week" redesign — confirm/repair the resource economy after core stopped being always-present, sweep common + uncommon flavour into a tighter cadence-feel (deadpan voice preserved), and make the WeekBanner telegraph each week's texture (quiet vs. stirring).

**Architecture:** Run the balance audit first as a decision-producing investigation (Balance + Card-Mechanics agents) → a committed decision record. Apply only the tweaks that record approves. Then a creative reflavour sweep (Thematic agent) bound by the existing flavour-cap rule. Finally a small, audit-independent WeekBanner/weekFlavour extension.

**Tech Stack:** TypeScript, Vitest (node-only), React (WeekBanner display), markdown decision record. Domain agents per `knowledge/agents/*.md`.

## Global Constraints

- **Plan A is the foundation** — `tier:'core'` enum unchanged (UI label "Uncommon"); `rotateCore`, `usedCoreIds`, N=4 uncommon, rare 1–2 band already exist. Do NOT re-implement them.
- **Flavour cap standing rule (D 2026-06-25):** option flavour ≤80 chars (2 rows), card body ≤108 chars (3 rows). `tutorial.ts` exempt. Every reflavoured string MUST pass.
- **Deadpan house voice is mandatory** — understated, dry, second person, dread-comedy ("...a grudge, and lousy penmanship. You make tea."). Tighten cadence-feel WITHOUT flattening tone. No em-dashes in card flavour (P18-2 house rule); no "card"-as-noun in option text where a glyph is used.
- **Audit gates reclassification + numbers** — the audit may veto `congregation_meets`/`the_donation`→common, or re-tune N=4 / rare band. Later tasks consume the audit's verdict, not this plan's defaults.
- **Tests node-only.** Baseline after Plan A: all vitest pass + clean typecheck. Keep them green.
- **Run dir:** `Code/project-abyssial`. **Commit locally only**, never push. End commits with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Balance audit → committed decision record

This is an investigation, not a code change. Dispatch the Balance + Card-Mechanics agents (inject `knowledge/agents/balance.md` and `knowledge/agents/card-mechanics.md`) with the spec §5 questions, plus playtest observations. Capture verdicts in a record the remaining tasks consume.

**Files:**
- Create: `docs/superpowers/audits/2026-deck-cadence-balance-audit.md`

**Interfaces:**
- Consumes: post-Plan-A deck composition (all commons + ~4 uncommon + 1–2 rare/week); `knowledge/decisions-live.md` D-P19-36 (intentional ~3:1 sink:source); the user's playtest notes.
- Produces: a decision record with explicit verdicts on each question below, each marked **CONFIRM** / **CHANGE → <action>** / **DEFER**.

- [ ] **Step 1: Gather the inputs**

Collect: (a) the user's playtest observations of the new cadence (did a week ever starve? did weeks feel different? did the rare beat land?); (b) current per-week source/sink counts across `common.ts`, `core.ts`, threats. Note that `congregation_meets` + `the_donation` are now `common` (Plan A Task 1).

- [ ] **Step 2: Dispatch the audit agents with these exact questions**

Spawn Balance + Card-Mechanics (per roster spawn protocol — they return a proposal, do not write files). Ask each, verbatim:

1. **Per-week income floor:** with uncommon rotating (N=4, retire-resolved) and `congregation_meets`/`the_donation` now common, can a week roll a deck with no reliable gold/follower/influence source? Identify any source-bearing card that can rotate OUT and starve a week. Recommend a fix only if a starve is reachable (per D-P19-36: add `+1` to ONE unconditional source, never to common/threat).
2. **Sink:source ratio:** does the intentional ~3:1 (D-P19-36) survive fewer source-bearing cards/week (was ~7–8 core + 2 rare; now ~4 uncommon + 1–2 rare)? CONFIRM or propose the single controlled lever.
3. **Reclassification veto:** are `congregation_meets`/`the_donation` correct as common, or is either load-bearing enough to belong in the rotating uncommon pool? Final verdict.
4. **N + rare band tuning:** is N=4 uncommon and rare 1–2 (floor 1) the right cadence, or should N or the band shift? Number + rationale.
5. **Curve interaction:** does the thinner deck change the P19-34 week-4 spike stagger or P19-35 bloat outlook? Flag, don't fix here.
6. **Prep/chain economy:** does any prep→chain depend on a `core` card persisting across a reshuffle? Rotating uncommon can now rotate a prep-carrier out mid-chain — list any at-risk chain.

- [ ] **Step 3: Write the decision record**

Create `docs/superpowers/audits/2026-deck-cadence-balance-audit.md` with one section per question, each ending in a bold verdict line: `**VERDICT: CONFIRM**` or `**VERDICT: CHANGE →** <exact card+option+delta>` or `**VERDICT: DEFER →** <ticket/watch>`. List every approved code tweak in a "Tweaks to apply (Task 2)" summary block at the top. If no tweaks: write "No tweaks — cadence economically sound."

- [ ] **Step 4: Append the agent lesson + commit**

Append to `knowledge/agents/balance.md` and `knowledge/agents/card-mechanics.md`:
`- 2026-XX-XX: deck-cadence audit — [one-line verdict summary].`

```bash
git add docs/superpowers/audits/2026-deck-cadence-balance-audit.md
git commit -m "docs(P13-24): balance audit decision record for week-cadence

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Apply the audit's approved balance tweaks

Apply ONLY what Task 1's record marked **CHANGE**. If the record says "No tweaks", skip to Step 4 (mark task complete, no commit).

**Files:**
- Modify: card files named in the audit record (e.g. `src/data/cards/core.ts`, `common.ts`) and/or `src/engine/godPath.ts` (if N changes) / `src/state/gameStore.ts` (if rare band changes).
- Test: `src/state/gameStore.test.ts` or `src/engine/deck.test.ts` per the change.

**Interfaces:**
- Consumes: the "Tweaks to apply" block from Task 1's record.
- Produces: each approved tweak implemented, with a regression test where it touches logic (not needed for a flat resource delta on an option).

- [ ] **Step 1: For each tweak, write a failing assertion (if it touches logic)**

For a number change (e.g. N=4→3): update the Plan A test that asserts the count (`gameStore.test.ts` "starting deck holds exactly 4 core") to the new number and run it to see it fail. For a flat option-delta change on a card (e.g. `the_collection` opt1 +1 gold): no test needed — verify by reading the card.

- [ ] **Step 2: Apply each tweak exactly as the record specifies**

Edit the named card option / parameter to the record's exact value. Change nothing the record did not approve.

- [ ] **Step 3: Run tests + typecheck**

Run: `npm run typecheck && npm run test`
Expected: clean; all pass (including any count test you updated).

- [ ] **Step 4: Commit (only if a tweak was applied)**

```bash
git add -A
git commit -m "balance(P13-24): apply week-cadence audit tweaks

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Full deadpan reflavour sweep of common + uncommon bodies

Creative pass over every `COMMON_CARDS` + `CORE_CARDS` body and option flavour so tone tracks cadence: commons read routine/passive (recurring weekly grind), uncommon read episodic ("the rival stirs again", "a stranger turns up this week"). Authored by the Thematic agent at execution. This task specifies the PROCESS and acceptance gates, not the final strings.

**Files:**
- Modify: `src/data/cards/common.ts`, `src/data/cards/core.ts` (flavour fields only — never ids, tiers, options' effects/conditions)
- Verify: char-cap check (reuse the P19-1 audit approach)

**Interfaces:**
- Consumes: Task 1's final reclassification verdict (which cards are common vs uncommon decides target tone per card).
- Produces: every common/uncommon `flavour` (body) and each option `flavour` rewritten or confirmed, all within caps, voice preserved.

- [ ] **Step 1: Build the worklist**

List every card in `COMMON_CARDS` and `CORE_CARDS` (post-Task-1 roster). For each, record current title, body flavour, and per-option flavour. This is the sweep checklist.

- [ ] **Step 2: Dispatch the Thematic agent with the voice brief**

Spawn Thematic (inject `knowledge/agents/thematic.md`). Brief, verbatim:
- **Goal:** tighten cadence-feel. Commons = routine, recurring, passive-voiced, mundane-with-dread ("The envelopes come in."). Uncommon = episodic, a notable development *this* week, slightly more active ("The rival stirs again.").
- **Voice:** deadpan, understated, second person, dry dread-comedy. Preserve existing wit. Do NOT flatten or over-explain.
- **Hard limits:** option flavour ≤80 chars; body ≤108 chars; no em-dashes; no "card" as a noun in option text.
- **Scope:** flavour strings ONLY. Never touch id, tier, effects, conditions, options' mechanical fields.
- **Deliver:** for each card, either CONFIRM (already perfect) or the rewritten strings.

- [ ] **Step 3: Apply the agent's approved strings**

Edit `common.ts` / `core.ts` flavour fields to the agent's strings (Claudian reviews tone before applying, per spawn protocol). Mechanical fields untouched.

- [ ] **Step 4: Char-cap verification**

Run a length check over both files (mirror the P19-1 audit): assert no option flavour >80 and no body >108. Add a quick node test if none exists:

```typescript
import { describe, it, expect } from 'vitest'
import { COMMON_CARDS, CORE_CARDS } from '../index'

describe('flavour cap (common + uncommon)', () => {
  for (const card of [...COMMON_CARDS, ...CORE_CARDS]) {
    it(`${card.id} body ≤108`, () => expect((card.flavour ?? '').length).toBeLessThanOrEqual(108))
    for (const [i, o] of card.options.entries()) {
      it(`${card.id} opt${i} ≤80`, () => expect((o.flavour ?? '').length).toBeLessThanOrEqual(80))
    }
  }
})
```

Save as `src/data/cards/flavour-cap.test.ts` if not already covered.

- [ ] **Step 5: Run tests + typecheck**

Run: `npm run typecheck && npm run test`
Expected: clean; cap test green.

- [ ] **Step 6: Append agent lesson + commit**

Append to `knowledge/agents/thematic.md`: `- 2026-XX-XX: common+uncommon cadence reflavour sweep — [one-line lesson].`

```bash
git add src/data/cards/common.ts src/data/cards/core.ts src/data/cards/flavour-cap.test.ts
git commit -m "content(P13-24): deadpan reflavour sweep — common routine / uncommon episodic

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: WeekBanner telegraphs each week's texture

Today `weekFlavour.ts` keys only off the doom tier (`getUnravellingTier`). Add a light, audit-independent texture signal so a quiet week (no rare surfaced) reads differently from a stirring one (a rare entered), reinforcing that weeks now differ.

**Files:**
- Modify: `src/data/weekFlavour.ts` (add a texture-keyed secondary line)
- Modify: `src/components/game/WeekBanner.tsx` (accept + render the texture line)
- Modify: `src/state/gameStore.ts` reshuffle action (compute texture from this reshuffle's rare outcome) + the GameScreen prop wiring
- Test: `src/data/weekFlavour.test.ts` (create)

**Interfaces:**
- Consumes: whether a rare entered the deck this reshuffle (derivable from the `reshuffle` result — compare rare count vs prior, or expose the rolled `rareTarget`).
- Produces:
  ```typescript
  export type WeekTexture = 'quiet' | 'stirring'
  export function pickTextureLine(texture: WeekTexture): string
  ```
  and a new optional `WeekBanner` prop `textureLine?: string` rendered under the doom-tier flavour line (suppressed when iconified, tier ≥3).

- [ ] **Step 1: Write the failing test**

Create `src/data/weekFlavour.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { pickTextureLine } from './weekFlavour'

describe('pickTextureLine', () => {
  it('returns a non-empty string for each texture', () => {
    expect(pickTextureLine('quiet').length).toBeGreaterThan(0)
    expect(pickTextureLine('stirring').length).toBeGreaterThan(0)
  })
  it('quiet and stirring draw from different pools', () => {
    const quiet = new Set(Array.from({ length: 50 }, () => pickTextureLine('quiet')))
    const stirring = new Set(Array.from({ length: 50 }, () => pickTextureLine('stirring')))
    for (const q of quiet) expect(stirring.has(q)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- weekFlavour`
Expected: FAIL — `pickTextureLine` not exported.

- [ ] **Step 3: Add texture pools + picker to `weekFlavour.ts`**

Append to `src/data/weekFlavour.ts`:

```typescript
export type WeekTexture = 'quiet' | 'stirring'

const TEXTURE_POOLS: Record<WeekTexture, readonly string[]> = {
  quiet: [
    'a quiet week, mostly',
    'the usual rounds, nothing more',
    'little out of the ordinary',
  ],
  stirring: [
    'something new is afoot this week',
    'word of an unusual matter reaches you',
    'the week carries an uncommon weight',
  ],
}

export function pickTextureLine(texture: WeekTexture): string {
  const pool = TEXTURE_POOLS[texture]
  return pool[Math.floor(Math.random() * pool.length)]
}
```

(Keep each line ≤ ~40 chars so it sits on one row under the existing flavour line.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- weekFlavour`
Expected: PASS.

- [ ] **Step 5: Render the texture line in WeekBanner**

In `WeekBanner.tsx`, add `textureLine?: string` to the props type, and after the tier-flavour `{line}` block (before the doom block, ~line 90) render it when present and NOT iconified:

```tsx
      {!iconified && textureLine && (
        <div
          style={{
            fontSize: '0.78rem',
            color: 'rgba(180,168,140,0.7)',
            letterSpacing: '0.06em',
            fontStyle: 'italic',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            textAlign: 'center',
            maxWidth: '88vw',
          }}
        >
          {textureLine}
        </div>
      )}
```

- [ ] **Step 6: Compute texture in the reshuffle action + thread to the banner**

In `gameStore.ts` reshuffle action: after `reshuffle(...)` returns, derive texture by comparing rare counts before/after, e.g.:

```typescript
    const raresBefore = state.deck.drawPile.filter(c => c.tier === 'rare').length
    const raresAfter  = deck.drawPile.filter(c => c.tier === 'rare').length
    const weekTexture: WeekTexture = raresAfter > raresBefore ? 'stirring' : 'quiet'
    const weekTextureLine = pickTextureLine(weekTexture)
```

Store `weekTextureLine` in state (add field beside the banner's other inputs) and pass it as the `textureLine` prop where `<WeekBanner .../>` is rendered in `GameScreen.tsx`. (Add `weekTextureLine: string` to `GameState` in `types/index.ts` and `makeInitialState` `= ''`, mirroring existing banner-input state.) Import `pickTextureLine`, `WeekTexture` in `gameStore.ts`.

- [ ] **Step 7: Run tests + typecheck**

Run: `npm run typecheck && npm run test`
Expected: clean; all pass.

- [ ] **Step 8: Commit**

```bash
git add src/data/weekFlavour.ts src/data/weekFlavour.test.ts src/components/game/WeekBanner.tsx src/state/gameStore.ts src/components/game/GameScreen.tsx src/types/index.ts
git commit -m "feat(P13-24): WeekBanner telegraphs quiet vs stirring week texture

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Balance audit (spec §5, all 6 concerns) → Task 1 (questions map 1:1 to §5 bullets), Task 2 applies.
- Full deadpan reflavour sweep under caps, voice preserved (spec §4 flavour) → Task 3.
- Per-week WeekBanner/weekFlavour framing telegraphing texture (spec §4 flavour) → Task 4. Folds in P17-4 (per-week common/core flavour).

**Placeholder scan:** Task 1 (audit) and Task 3 (reflavour) are intentionally process-specified, not string-specified — their content is gated on the audit verdict + playtest and authored by domain agents at execution, with concrete acceptance gates (verdict format, char caps, voice rules, cap test). This is the correct concreteness level given the GATE; it is not a "TODO: write later" placeholder. Tasks 2 and 4 contain exact code. No TBD/TODO.

**Type consistency:** `WeekTexture` / `pickTextureLine` consistent between definition (Task 4 Step 3) and consumers (Steps 5–6). `textureLine` prop name and `weekTextureLine` state field name consistent across weekFlavour, WeekBanner, gameStore, GameScreen, types.

**Gate reminder:** Plan B must not begin until Plan A is on trunk AND the user has playtested — header GATE enforces this.

**Dependency note:** Task 3 consumes Task 1's reclassification verdict; Task 2 consumes Task 1's tweak list. Task 4 is independent of the audit and could run anytime after Plan A, but is ordered last to keep the cadence commits grouped.
