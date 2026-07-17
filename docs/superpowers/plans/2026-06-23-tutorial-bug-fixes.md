# Tutorial Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two blocking tutorial bugs from Playtest 18 (cluster T1) so the tutorial is completable end-to-end, and restructure the deferred P18-5 backlog entry.

**Architecture:** Two independent bug fixes, each scoped as *investigate → write failing repro test → minimal fix → verify → commit*. No tutorial content/text edits. After both fixes, restructure the P18-5 entry in `knowledge/backlog.md` so the deferred redesign brainstorm starts with a complete mechanics inventory and absorbed cosmetic carry-overs.

**Tech Stack:** TypeScript, React, Zustand (`gameStore`), Vitest. Tutorial code lives in `src/data/cards/tutorial.ts`, `src/data/index.ts`, `src/components/game/OptionsColumn.tsx`, `src/components/game/CardPreviewModal.tsx`, and the `advanceGodPath` / reshuffle paths in `src/state/gameStore.ts`.

## Global Constraints

- **No tutorial content/text edits.** Reviewers must reject any text-only diff in `src/data/cards/tutorial.ts` from this work — those changes are deferred into the P18-5 redesign per spec.
- **TDD with reproducer-first.** Each bug ships with a regression test that fails on `main` (the bug's current state) and passes after the fix.
- **Minimal-fix discipline.** Per the spec, find the smallest change that restores correct behaviour. Do not refactor neighbouring code, do not "improve" the tutorial flow, do not change non-tutorial behaviour.
- **Local commits only.** Per CLAUDE.md, never `git push` unless the user explicitly asks. The active branch (`claude/build-abyssial-game-*`) is trunk.
- **Test gate.** All existing Vitest suites must still pass after each task (`npm test -- --run` from `Code/project-abyssial/`).
- **Spec reference:** `docs/superpowers/specs/2026-06-23-tutorial-bug-fixes-design.md` (commit `bdc312f`).

---

## File Inventory

| Path | Role | Action |
|---|---|---|
| `src/data/cards/tutorial.ts` | Tutorial card definitions, including `tutorial_threats_treats` and `olgreth_1`/`olgreth_2` | **Read only** for this plan. No edits. |
| `src/data/index.ts` | `GOD_PATH_CHAINS` registration, `ALL_CARDS`, `getNextChainCard` | Read; only edit if Bug B's root cause is here. |
| `src/state/gameStore.ts` | Live `resolveOption`, `advanceGodPath` effect handler, reshuffle path | Read; likely edit site for Bug B. |
| `src/components/game/OptionsColumn.tsx` | Renders option chips including insert-effect indicators | Read; likely edit site for Bug A. |
| `src/components/game/CardPreviewModal.tsx` | The preview modal opened by tapping option insert icons | Read; possible edit site for Bug A. |
| `src/state/gameStore.test.ts` | Existing engine tests; add tutorial regression tests here | **Modify** — append two regression tests. |
| `knowledge/backlog.md` | Project backlog (outside the repo, in the vault) | **Modify** — restructure P18-5 entry. |

---

## Task 1: Bug A — `+2 insert` option preview not clickable in tutorial

**Files:**
- Read: `src/data/cards/tutorial.ts` (specifically `tutorial_threats_treats`, `tutorial_threat_card`, `tutorial_treat_card`)
- Read: `src/components/game/OptionsColumn.tsx`, `src/components/game/CardPreviewModal.tsx`, any helper that renders option insert-icons
- Modify: whichever component owns the preview-on-tap wiring for option insert effects (identified during Step 1)
- Test: `src/state/gameStore.test.ts` (append regression test) **or** a new co-located component test if the root cause is rendering-side

**Interfaces:**
- Consumes: existing `Card` type, `Effect` type (`insertCard` variant), existing card-preview component contract
- Produces: nothing new — fix restores existing contract for tutorial cards

- [ ] **Step 1: Investigate — locate the preview-on-tap wiring**

  Read `src/components/game/OptionsColumn.tsx` end to end. Grep for "preview", "CardPreviewModal", `onClick`/`onPointerDown` on insert-effect renderers, and any guard that conditions preview by `tier`, `id`, or registry membership.

  ```bash
  cd Code/project-abyssial
  grep -nE "preview|insertCard" src/components/game/OptionsColumn.tsx src/components/game/CardPreviewModal.tsx
  grep -nE "tier === ['\"]tutorial['\"]|tutorial_" src/components/game/
  ```

  Document in the commit message which file owns the wiring and what's filtering tutorial cards out (if anything).

- [ ] **Step 2: Run the tutorial in dev to reproduce**

  ```bash
  cd Code/project-abyssial
  npm run dev
  ```

  Start a new tutorial run, advance to `tutorial_threats_treats` (card 3), try to tap the `+card` icon(s) on the "Make the call" option. Confirm preview does NOT open. Note exactly what does happen (no-op, wrong card, modal flicker, etc.).

- [ ] **Step 3: Write the failing regression test**

  Decide test type based on Step 1's finding:
  - **If root cause is in pure logic** (e.g. `getCardById` returning undefined for tutorial card ids, or a guard predicate excluding `tier === 'tutorial'` cards): write a Vitest unit test in `src/state/gameStore.test.ts` that asserts whatever the broken predicate/helper should return for `tutorial_threat_card` / `tutorial_treat_card`.
  - **If root cause is in component rendering** (handler not bound, button disabled): write a React Testing Library test co-located with the component (e.g. `src/components/game/OptionsColumn.test.tsx`) that renders `OptionsColumn` with `tutorial_threats_treats` as the current card and asserts the insert-icon is tappable and triggers the preview handler.

  Example shape for the logic-test path:

  ```typescript
  // src/state/gameStore.test.ts — append near other tutorial tests
  import { getCardById } from '../data'

  describe('tutorial card preview wiring', () => {
    it('resolves tutorial_threat_card via getCardById so option-insert preview can open', () => {
      const card = getCardById('tutorial_threat_card')
      expect(card).toBeDefined()
      expect(card?.title).toBe('An Unwanted Arrival')
    })

    it('resolves tutorial_treat_card via getCardById so option-insert preview can open', () => {
      const card = getCardById('tutorial_treat_card')
      expect(card).toBeDefined()
      expect(card?.title).toBe('A Fortunate Find')
    })
  })
  ```

  If `getCardById` already returns these correctly (likely — they're in `ALL_CARDS` per `src/data/index.ts:42-43`), this test will pass on `main` and is the wrong test. In that case the root cause is component-side; write the rendering test instead.

- [ ] **Step 4: Run the new test to confirm it fails**

  ```bash
  cd Code/project-abyssial
  npx vitest run <path-to-new-test> -t "<test name>"
  ```

  Expected: FAIL with a message that names the actual broken behaviour. If it passes, the test does not capture the bug — go back to Step 3.

- [ ] **Step 5: Implement the minimal fix**

  Apply the smallest possible change in the file identified in Step 1. Examples of acceptable fixes:
  - Remove a `tier !== 'tutorial'` guard from a preview predicate
  - Bind the missing `onClick` to the insert-icon for option effects
  - Pass the missing `cardId` prop through to the preview modal

  Do NOT: refactor the component, rename props, change non-tutorial behaviour, or edit `src/data/cards/tutorial.ts`.

- [ ] **Step 6: Run the new test, then the full suite**

  ```bash
  cd Code/project-abyssial
  npx vitest run <path-to-new-test> -t "<test name>"
  npm test -- --run
  ```

  Expected: new test PASS; full suite all PASS (no regressions).

- [ ] **Step 7: Manual re-verification in dev**

  Re-run the tutorial and confirm tapping the `+card` icon on `tutorial_threats_treats` opens the preview for the correct card. Also tap a non-tutorial insert option (e.g. a common card in a fresh non-tutorial run) and confirm it still works unchanged.

- [ ] **Step 8: Commit**

  ```bash
  cd Code/project-abyssial
  git add -A
  git commit -m "$(cat <<'EOF'
  fix(tutorial): restore card preview on +card insert option

  tutorial_threats_treats' "Make the call" option was not opening the
  card preview when tapping the +card indicator. Root cause: <one-line
  from Step 1>. Minimal fix: <one-line from Step 5>. Regression test
  added in <test file>.

  Closes P18-4 Bug A. Cosmetic P18-4 items remain deferred into P18-5.

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 2: Bug B — 2nd god path (`olgreth_2`) never appears, tutorial uncompletable

**Files:**
- Read: `src/data/cards/tutorial.ts` (specifically `olgreth_1`, `olgreth_2`, the resource trace comment)
- Read: `src/data/index.ts` (confirm `GOD_PATH_CHAINS.olgreth` and `ALL_CARDS` include `olgreth_2`)
- Read: `src/state/gameStore.ts` (search for `advanceGodPath` handler, reshuffle path, `nextCycleQueue` handling)
- Modify: whichever file holds the root cause (identified during Step 1)
- Test: `src/state/gameStore.test.ts` (append integration test)

**Interfaces:**
- Consumes: existing `gameStore` actions (`startRun`, `chooseOption`, etc.), `TUTORIAL_CARDS`, `GOD_PATH_CHAINS.olgreth`, `getNextChainCard`
- Produces: nothing new — fix restores existing intended flow

- [ ] **Step 1: Investigate — trace `advanceGodPath` for the tutorial olgreth chain**

  Confirm what already looks right (no edits yet):
  - `src/data/index.ts:34` — `olgreth: [olgreth_1, olgreth_2]` is registered.
  - `src/data/index.ts:44` — `olgreth_2` is in `ALL_CARDS`.
  - `src/data/cards/tutorial.ts:182-211` — `olgreth_1` has `advanceGodPath`, `olgreth_2` has `chainStage: 2` and `isSummoning: true`.

  Then find the divergence:

  ```bash
  cd Code/project-abyssial
  grep -nE "advanceGodPath|nextCycleQueue|getNextChainCard" src/state/gameStore.ts src/engine/gameLoop.ts
  ```

  Likely root-cause candidates to check in order:
  1. `advanceGodPath` handler in `gameStore.resolveOption`: does it call `getNextChainCard(godPath, currentStage)` and push the result into `nextCycleQueue`? Or does it only update progress state without queuing the next card?
  2. The reshuffle path: does it drain `nextCycleQueue` into the new draw pile, or does it skip it for tutorial / for chain-stage > 1 / for `isSummoning` cards?
  3. `isSummoning: true` on `olgreth_2` — does any filter treat summoning cards specially (e.g. excluded from normal draw, requires a separate summoner mechanic)?

  Document the finding in the commit message.

- [ ] **Step 2: Reproduce in dev**

  ```bash
  cd Code/project-abyssial
  npm run dev
  ```

  Run the tutorial end to end. At card 5 (`olgreth_1`), pick "Speak it aloud." Continue past the reshuffle. Confirm `olgreth_2` ("The Hollow Speaks") never appears and the run does not end.

- [ ] **Step 3: Write the failing integration test**

  Append to `src/state/gameStore.test.ts`. Drive the store programmatically through the tutorial and assert `olgreth_2` lands in the deck after reshuffle.

  ```typescript
  // src/state/gameStore.test.ts — append at end of file (or near other tutorial tests if present)
  import { useGameStore } from './gameStore'
  import { TUTORIAL_CARDS } from '../data'

  describe('tutorial olgreth chain completion', () => {
    it('queues olgreth_2 so it surfaces after the tutorial reshuffle', () => {
      const store = useGameStore.getState()
      store.startRun({ godPath: 'olgreth', tutorial: true }) // adjust signature to match actual API

      // Resolve cards 0..4 with their only-available option index.
      // Each call to chooseOption(0) advances the deck per tutorial.ts header trace.
      for (let i = 0; i < TUTORIAL_CARDS.length; i++) {
        useGameStore.getState().chooseOption(0)
      }
      // After resolving olgreth_1, the draw pile empties and reshuffle fires.
      // olgreth_2 must now be reachable from drawPile + nextCycleQueue.

      const s = useGameStore.getState()
      const allUpcoming = [...s.drawPile, ...(s.nextCycleQueue ?? [])]
      expect(allUpcoming).toContain('olgreth_2')
    })
  })
  ```

  Note: adjust the exact `startRun` signature and the post-state field names (`drawPile`, `nextCycleQueue`) to match the live `gameStore` API. If `startRun` does not have a `tutorial` flag, find the actual entry-point used by `TutorialSplash.tsx` and use that.

- [ ] **Step 4: Run the new test to confirm it fails**

  ```bash
  cd Code/project-abyssial
  npx vitest run src/state/gameStore.test.ts -t "queues olgreth_2"
  ```

  Expected: FAIL — `olgreth_2` not present in `drawPile` or `nextCycleQueue` post-reshuffle. If it passes on `main`, the test is wrong or driving the wrong code path; revise.

- [ ] **Step 5: Implement the minimal fix**

  Apply the smallest change at the root-cause site identified in Step 1. Examples:
  - If `advanceGodPath` doesn't queue the next chain card: add the `getNextChainCard` + push-to-`nextCycleQueue` call there.
  - If reshuffle drops queue contents: include `nextCycleQueue` cards in the new draw pile build.
  - If `isSummoning` cards are filtered: add the chain-card exemption.

  Do NOT: edit `src/data/cards/tutorial.ts`, change `GOD_PATH_CHAINS`, or alter non-tutorial chain behaviour. If the fix would change non-tutorial chains (e.g. yha_nthlei), stop and add a test for the non-tutorial case before changing the shared code.

- [ ] **Step 6: Run the new test, then the full suite**

  ```bash
  cd Code/project-abyssial
  npx vitest run src/state/gameStore.test.ts -t "queues olgreth_2"
  npm test -- --run
  ```

  Expected: new test PASS; full suite all PASS. If a non-tutorial chain test now fails, the fix was not minimal — revert and reconsider scope per Step 5's caveat.

- [ ] **Step 7: Manual re-verification — complete the tutorial**

  Re-run the tutorial in dev, complete it through to `olgreth_2` → "Step forward," and confirm `TutorialCompleteScreen` displays.

- [ ] **Step 8: Commit**

  ```bash
  cd Code/project-abyssial
  git add -A
  git commit -m "$(cat <<'EOF'
  fix(tutorial): surface olgreth_2 so tutorial completes

  Resolving olgreth_1's "Speak it aloud" did not result in olgreth_2
  appearing post-reshuffle, leaving the tutorial uncompletable. Root
  cause: <one-line from Step 1>. Minimal fix: <one-line from Step 5>.
  Integration test added in src/state/gameStore.test.ts that drives the
  tutorial deck programmatically.

  Closes P18-4 Bug B.

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 3: Backlog restructure — replace P18-5 entry

**Files:**
- Modify: `knowledge/backlog.md` (in vault root `E:/Project Abyssial/knowledge/backlog.md` — NOT in the repo)

**Interfaces:** none (markdown only)

- [ ] **Step 1: Open `knowledge/backlog.md` and locate cluster T1 entries**

  Find the "## Playtest 17 + 18 — Open (triaged unprocessed)" section. Inside it: `### Cluster T1 — Tutorial overhaul (P18 heavy)` containing P18-2, P18-4, P18-5.

- [ ] **Step 2: Replace the entire `### Cluster T1` block with the restructured version**

  Replace with exactly:

  ```markdown
  ### Cluster T1 — Tutorial (P18-5 deferred; bug fixes shipped)

  - [x] ~~**P18-4 bugs.**~~ **CLOSED s<NN>** — `+2 insert` option preview unclickable on `tutorial_threats_treats` (Bug A) and `olgreth_2` never surfacing post-reshuffle (Bug B) both fixed with regression tests. See commits in session log.
  - [ ] **P18-5.** Tutorial full redesign. Tier E. Deferred until pre-July content freeze. Format (sandboxed env + predefined slots) keeps; content is stale.

    Mechanics inventory the new tutorial MUST teach:
    - Weeks (renamed from days)
    - Rare swapping at reshuffle
    - Prep tags (carrier hint pill, dread-gate hint)
    - Deficit and overflow cards
    - 3 god paths (not 1) — selection flow
    - Activity log
    - Hint tooltips (`(?)`, dread-gate, prep-carrier, requirement-replacement)
    - Surface cards / whisper
    - Passive-on-reshuffle effects
    - Recited vs. Ack/File split (Service Safari S3 outcome)
    - Closed-path reflection screen (S2)

    Format decisions to revisit:
    - Sandboxed env + predefined slots — keep
    - God selection inside tutorial — currently olgreth-only; pick one of three? all three? abstract "tutorial god"?
    - Length — currently 5 cards + reshuffle + god path; almost certainly needs more
    - Still-frame vs. live deck preview

    Open questions for the future brainstorm:
    - Skippable for returning players?
    - Does god-selection flavour (P18-6) live inside the tutorial flow or outside?
    - How does the tutorial signal "you're now in the real game"?

    Carry-over fixes to address during redesign (do NOT triage as separate tickets):
    - P18-2: em-dashes in tutorial pre-text
    - P18-2: sync the two tutorial pre-messages into one, take styling of the second
    - P18-4: drop `-card` indication on dread/relic options (cards pop anyway)
    - P18-4: talk about inserts in threat/treat cards instead
    - P18-4: remove rose-jewel mention from flavour
    - P18-4: remove the "reshuffle card being inserted" line — just have it pop as first card after reshuffle

    Agent: Design (brainstorm) → Card Mechanics + Thematic + Code (implement).
  ```

  Replace `s<NN>` in the closed-bullet with the actual session number at execution time.

- [ ] **Step 3: Verify no other entries reference P18-2 or the absorbed P18-4 cosmetic items**

  ```bash
  grep -nE "P18-2|P18-4" "E:/Project Abyssial/knowledge/backlog.md"
  ```

  Expected: only the new P18-5 block mentions them (as carry-overs), and the closed-bullet mentions P18-4 bugs. No stray standalone tickets.

- [ ] **Step 4: No commit needed**

  `knowledge/backlog.md` lives in the vault, not the repo. Session-end handoff per CLAUDE.md captures it.

---

## Self-Review

**Spec coverage:**
- Spec Part 1 Bug A → Task 1 ✓
- Spec Part 1 Bug B → Task 2 ✓
- Spec Part 1 "tests per bug" → Task 1 Step 3, Task 2 Step 3 ✓
- Spec Part 1 "no content/text edits" → Global Constraints + Task 1/2 Step 5 explicit non-goals ✓
- Spec Part 2 backlog restructure → Task 3 ✓
- Spec "out of scope" items (cosmetic, redesign, P18-6) → none addressed; consistent ✓

**Placeholder scan:**
- `<one-line from Step 1>` / `<one-line from Step 5>` in commit templates — intentional, filled at execution time with the actual root cause / fix description. Acceptable per skill (these are filled by the implementer from concrete investigation output, not "TBD".)
- `s<NN>` in Task 3 Step 2 — intentional, session number unknown at plan-write time.
- No other placeholders.

**Type consistency:**
- `getCardById`, `GOD_PATH_CHAINS`, `getNextChainCard`, `nextCycleQueue`, `drawPile` all match `src/data/index.ts` and `src/state/gameStore.ts` references confirmed during plan write.
- `startRun` signature flagged for verification at Task 2 Step 3 — explicitly called out as "adjust to match actual API."

No issues to fix.

---

## Execution Handoff

Plan complete and saved to `Code/project-abyssial/docs/superpowers/plans/2026-06-23-tutorial-bug-fixes.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks. Both bug tasks involve investigation; isolated subagents avoid context bleed between Bug A and Bug B root causes.
2. **Inline Execution** — execute in this session with batched checkpoints.

Which approach?
