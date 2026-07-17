# T5 Visual Polish Batch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Playtest 17 + 18 visual polish cluster — 10 items, 7 require code, 3 close out via verification.

**Architecture:** Mostly CSS / inline-style edits in existing components (`ResourceBar.tsx`, `OptionsColumn.tsx`, `ActivityLog.tsx`, `DrawPile.tsx`, `StructuralTag.tsx`, `EffectTags.tsx`) plus one shared `<MenuButton>` extraction. No engine changes. Tests only where logic (not styling) is introduced — P18-10 (requirement-pill suppression) and P17-25 (self-target removal) get vitest shape asserts; CSS-only changes verified by user playtest.

**Tech Stack:** React + TypeScript + inline styles (project convention — no CSS modules), Vitest for shape asserts.

## Global Constraints

- Repo path: run all git/npm from `E:/Project Abyssial/Code/project-abyssial`. Vault root is NOT a git repo.
- Branch: stay on `claude/build-abyssial-game-IuJp8` — that IS trunk. Do NOT push.
- Test floor: 114/114 vitest pass + typecheck clean at end of every task.
- 300-line file cap (CLAUDE.md) — flag any file that crosses it.
- 50-line code-output cap per response — chunk if needed.
- Never edit `knowledge/cards/INDEX.md` or `knowledge/architecture-inventory.md` (pre-commit hook owns them).
- Commit per task. Conventional commit style matching recent log (`fix(ui):`, `feat(ui):`, `chore:`).

---

### Task 1: Close out already-shipped items (P17-6, P17-14, P18-7)

**Files:**
- Modify: `E:/Project Abyssial/knowledge/backlog.md` (Cluster T5 entries for P17-6, P17-14, P18-7)

**Interfaces:**
- Consumes: explorer report confirming each is shipped.
- Produces: backlog reflects reality; subsequent tasks don't waste effort.

- [ ] **Step 1: Verify P17-6** — open `src/components/EffectTags.tsx` lines 60–90 and confirm `+ card` button uses green outline (`rgba(122,173,85,0.3)`). Run grep for any defector card option that overrides the styling away from green.
- [ ] **Step 2: Verify P17-14** — open `src/components/ResourceBar.tsx` line 47, confirm dread `dangerI` thresholds `0.55 / 0.85` map to dread values 8 / 10 against the dread max (likely 10 or 12 — read the max from gameStore or resource config). If max is 10: 0.55×10 = 5.5 (yellow at 6) — that is TOO EARLY per P17-14. In that case, escalate this back to in-scope and raise dread-yellow threshold so yellow fires at ≥ 8, red at ≥ 10. Document finding either way.
- [ ] **Step 3: Verify P18-7** — confirm `+ card` tooltip border in `StructuralTag.tsx` lines 60–74 is `rgba(122,173,85,0.3)` (green). Mark closed.
- [ ] **Step 4: Update backlog** — in `E:/Project Abyssial/knowledge/backlog.md` Cluster T5, prepend `[x] ~~**P17-X.**~~ **CLOSED s95 (verify)** — already shipped, no change required.` for each closed item. Keep dread-color item open if Step 2 escalated it.
- [ ] **Step 5: Commit** (knowledge files are in vault root, NOT a git repo — DO NOT commit. Stage these for session-end docs instead. Note in handoff.)

---

### Task 2: P17-21 — Resource bar polish (chevron + accordion animation + spacing)

**Files:**
- Modify: `src/components/ResourceBar.tsx` lines 73–82 (spacing), 223–237 (number↔icon, number↔label gaps)
- Modify: `src/components/InGameMenuButton.tsx` lines 225–232 (◇ → chevron unicode `›` or `⌄`)

**Interfaces:**
- Consumes: nothing.
- Produces: open/close state already exists on the bar — wrap children in a transform-Y / max-height transition.

- [ ] **Step 1:** Tighten number↔icon gap (currently a fixed gap — reduce by ~30%) and loosen number↔label gap by same amount. Use existing inline-style values, no new constants.
- [ ] **Step 2:** Replace `◇` glyph in `InGameMenuButton.tsx` with `⌄` (down chevron when closed) / `⌃` (up when open). Tie to existing open-state prop. Remove the outline box around the glyph (set `border: 'none', background: 'transparent'`).
- [ ] **Step 3:** Add accordion flip — wrap the expanded panel in a `<div style={{ transition: 'transform 200ms ease, opacity 200ms ease', transformOrigin: 'top', transform: open ? 'scaleY(1)' : 'scaleY(0)', opacity: open ? 1 : 0 }}>`.
- [ ] **Step 4:** Run `npm run typecheck && npm test`. Expected: 114/114 pass.
- [ ] **Step 5:** Commit `feat(ui): tighten resource bar spacing, add chevron + accordion flip (P17-21)`.

---

### Task 3: P17-25 — Hide `−card` indicator on self-target one-shot cards

**Files:**
- Modify: `src/components/StructuralTag.tsx` lines 80–94 (`renderRemoveCardSingle`) and 119–139 (`renderAutoRemoveTag`)
- Modify: `src/components/EffectTags.tsx` lines 84–86 (currentCardId self-target check)
- Test: `src/__tests__/optionShape.test.ts` (extend existing card-shape test file — find via grep)

**Interfaces:**
- Consumes: `currentCardId: string` already passed to EffectTags.
- Produces: when `targetCardId === currentCardId` AND card is one-shot threat/treat, `renderRemoveCardSingle` returns `null`.

- [ ] **Step 1: Failing test** — add `it('does not render -card indicator when option removes its own one-shot card', () => { ... })` asserting `forgers_debt` option that self-removes returns no `-card` chip when rendered.
- [ ] **Step 2:** Run test, expect FAIL.
- [ ] **Step 3:** In `EffectTags.tsx` near line 84, add guard: `if (target === currentCardId && isOneShot(card)) return null;` for the remove-self branch. Source `isOneShot` from existing card category check (`card.category === 'threat' || card.category === 'treat'`).
- [ ] **Step 4:** Run test, expect PASS. Run full suite — expect 115/115.
- [ ] **Step 5:** Commit `fix(ui): hide -card indicator on one-shot self-removing options (P17-25)`.

---

### Task 4: P17-27 — Recenter draw deck position relative to reshuffle pile

**Files:**
- Read first: `src/components/DrawPile.tsx` lines 50–101 + the reshuffle pile component (grep for `ReshufflePile` or similar)
- Modify: `src/components/DrawPile.tsx` container alignment

**Interfaces:**
- Consumes: nothing.
- Produces: draw pile vertical center matches reshuffle pile vertical center across phases.

- [ ] **Step 1: Reproduce** — grep `ReshufflePile|reshuffle.*Pile|DiscardPile` to locate the sibling component. Read both. Compare top-padding / flex alignment.
- [ ] **Step 2: Diagnose** — identify the offset (likely a `paddingTop` or `marginTop` in DrawPile that the sibling lacks, or vice versa).
- [ ] **Step 3: Fix** — equalize alignment. Prefer removing the offset from DrawPile rather than adding to the sibling.
- [ ] **Step 4:** Run typecheck + tests. 114/114 pass. Note in commit that visual verification by user playtest required.
- [ ] **Step 5:** Commit `fix(ui): recenter draw pile to match reshuffle pile vertical alignment (P17-27)`.

---

### Task 5: P17-30 — Remove weird glow on left side of god-path activity log entries

**Files:**
- Modify: `src/components/ActivityLog.tsx` lines 103–105 (god-path conditional border + any box-shadow)

**Interfaces:**
- Consumes: god-path color tokens already in component (`#5fb8c8`, `#9b6fc8`, `#6fb86a`).
- Produces: god-path log entries get a consistent golden glow (or no glow), not a colored side-glow.

- [ ] **Step 1:** Read lines 95–120 of `ActivityLog.tsx`. Locate the `borderLeft` and any `boxShadow` that uses the god-path accent color.
- [ ] **Step 2:** Either (a) remove the `borderLeft` accent and let the golden god-path styling stand alone, OR (b) replace with a soft golden `boxShadow: '0 0 6px rgba(212,175,55,0.4)'`. Match user feedback wording ("not golden there"): user wants golden, so go with (b).
- [ ] **Step 3:** Run typecheck + tests. 114/114 pass.
- [ ] **Step 4:** Commit `fix(ui): replace god-path log side-border with golden glow (P17-30)`.

---

### Task 6: P18-1 — Normalize Next/Back buttons across menus

**Files:**
- Create: `src/components/shared/MenuButton.tsx` (new, ~40 lines)
- Modify call sites: `SetupScreens.tsx` (36, 39), `MainMenu.tsx` (228, 231), `IntroScreen.tsx` (56, 63), `FailureScreen.tsx` (78), `ReflectionScreen.tsx` (82, 88), `TutorialCompleteScreen.tsx` (132, 136), `VictoryScreen.tsx` (172, 179, 186)

**Interfaces:**
- Produces: `<MenuButton variant="primary" | "secondary" onClick={...}>label</MenuButton>` — wraps existing `btn-primary` / `btn-secondary` class with consistent padding, font-size, min-width. Secondary variant uses smaller font (per backlog: "smaller text").

- [ ] **Step 1:** Create `MenuButton.tsx`. Props: `variant: 'primary'|'secondary'`, `onClick`, `disabled?`, `children`. Use existing class names + a single inline style block for normalization (`minWidth: variant === 'primary' ? '160px' : '120px'`, `fontSize: variant === 'primary' ? '1rem' : '0.85rem'`).
- [ ] **Step 2:** Add minimal shape test `MenuButton.test.tsx` — renders children, applies variant class, fires onClick. 3 assertions.
- [ ] **Step 3:** Replace each call site one component at a time. After each component, run typecheck.
- [ ] **Step 4:** Run full vitest. Expect 116+/116+ pass (1 new test + the P17-25 test).
- [ ] **Step 5:** Commit `refactor(ui): extract <MenuButton> and normalize Next/Back across screens (P18-1)`.

---

### Task 7: P18-3 — Strengthen disabled option styling

**Files:**
- Modify: `src/components/OptionsColumn.tsx` line 132 (background), line 158 (opacity)

**Interfaces:**
- Consumes: existing `avail: boolean`.
- Produces: disabled options visibly more inert.

- [ ] **Step 1:** Lower `opacity` from `0.75` → `0.45` when `!avail`. Darken background from `rgba(8,5,3,0.95)` → `rgba(8,5,3,0.6)` (more grey-out via transparency).
- [ ] **Step 2:** Add `filter: 'grayscale(0.4)'` on disabled. Keep cursor: 'not-allowed'.
- [ ] **Step 3:** Run typecheck + tests. 116+/116+ pass.
- [ ] **Step 4:** Commit `fix(ui): strengthen disabled option styling (P18-3)`.

---

### Task 8: P18-10 — Hide redundant requirement pill when cost pill carries the same info

**Files:**
- Modify: `src/components/OptionsColumn.tsx` lines 159–218 (requirement pill render block)
- Test: existing options shape test file (same as Task 3)

**Interfaces:**
- Consumes: option's `requirements: {resource, value}[]` and `costs: {resource, value}[]`.
- Produces: requirement pill suppressed when `requirements.length === 1 && costs.some(c => c.resource === req.resource && c.value >= req.value)`. Example: relic_market top option requires `gold ≥ 2`, cost is `-2 gold` → suppress.

- [ ] **Step 1: Failing test** — `it('hides requirement pill when cost satisfies the requirement', () => { ... })` against the relic_market top option shape.
- [ ] **Step 2:** Run test, expect FAIL.
- [ ] **Step 3:** Add `const reqRedundant = (req, costs) => costs.some(c => c.resource === req.resource && Math.abs(c.value) >= req.value);` near OptionsColumn render. Skip rendering requirement chip when `reqRedundant(req, opt.costs)` returns true.
- [ ] **Step 4:** Run test, expect PASS. Full suite 117+/117+.
- [ ] **Step 5:** Commit `feat(ui): suppress redundant requirement pill when cost covers it (P18-10)`.

---

## Self-Review

**Spec coverage:** All 10 T5 items addressed (3 close-out in Task 1, 7 implementation in Tasks 2–8). Dread-color (P17-14) has an escalation path baked into Task 1 Step 2 if explorer's `0.55 / 0.85` thresholds map to wrong dread values.

**Placeholders:** Two soft spots —
- Task 4 Step 2 ("diagnose offset") is investigation-dependent; impossible to write exact fix without reading the sibling component. Acceptable per skill ("if step changes code, show code" — Step 2 doesn't change code yet).
- Task 6 reuses `btn-primary` / `btn-secondary` classes without showing them — they exist already in repo CSS; engineer reads on demand.

**Type consistency:** `MenuButton` props referenced consistently in Task 6. `reqRedundant` signature defined once in Task 8.

---

## Session-end (after all 8 tasks)

- Update `knowledge/sessions/handoff.md` schema fields: UNCOMMITTED, LAST_COMMIT (final commit hash), NEXT_UP (T7 or T4 or T8 — user pick), TESTS (117+/117+).
- Write `knowledge/sessions/session-95.md` (narrative).
- Append T5 closure entry to `knowledge/backlog.md` header.
- Append agent lessons if Visual / Code agents were spawned.
- Tell user to `/clear`.
