# P13-21 Resource Cap Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trim 4 common/core card options whose direct resource deltas exceed ±2, per the soft cap with documented exceptions agreed in the spec.

**Architecture:** Pure card-data edits in `src/data/cards/core.ts`. Two knowledge-base appends in the vault (not git-tracked). No engine, type, or UI changes. Each card edit lands as its own commit; verification runs `npm run typecheck` and a grep regression check.

**Tech Stack:** TypeScript card data; no test framework — verification via `npm run typecheck` + grep + manual playtest.

**Spec:** `docs/superpowers/specs/2026-06-12-resource-cap-audit-design.md`

---

## Task Order Rationale

1. The 4 trim tasks are independent. Order is lowest-to-highest-blast-radius:
   - `the_donation` (no `dreadPressureScaling`, simple +3 gold trim)
   - `academic_society` (single delta trim)
   - `local_elections` (single delta trim)
   - `the_opium_den` (delta + condition — two edits in one card)
2. After all 4 card edits: knowledge-base appends in the vault (Task 5).
3. Final verification + backlog update closes the work (Task 6).

After each card task: `npm run typecheck` must pass before committing.

---

## File Locations Reference

| Target | File | Approx line |
|---|---|---|
| `the_donation` "Accept it" gold delta | `src/data/cards/core.ts` | 292 |
| `academic_society` "Attend as a guest speaker" inf delta | `src/data/cards/core.ts` | 400 |
| `the_opium_den` "Acquire it" gold delta | `src/data/cards/core.ts` | 508 |
| `the_opium_den` "Acquire it" condition min | `src/data/cards/core.ts` | 513 |
| `local_elections` "Back them openly" inf delta | `src/data/cards/core.ts` | 580 |
| Balance heuristic + lesson | `E:/Project Abyssial/knowledge/agents/balance.md` | end of file |
| Decision entry | `E:/Project Abyssial/knowledge/decisions.md` | end of file |
| Backlog status flip | `E:/Project Abyssial/knowledge/backlog.md` | P13-21 row |

Line numbers indicative — verify by surrounding card id before editing.

---

## Task 1: Trim `the_donation` "Accept it" gold +3 → +2

**Files:**
- Modify: `src/data/cards/core.ts` around line 292

- [ ] **Step 1: Apply the edit**

Use `Edit` with this exact `old_string`:

```ts
          { type: 'resource', resource: 'gold', delta: 3 },
          { type: 'insertCard', cardId: 'strings_attached', position: 'random', minPos: 4, maxPos: 8 },
```

And this `new_string`:

```ts
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'insertCard', cardId: 'strings_attached', position: 'random', minPos: 4, maxPos: 8 },
```

The `insertCard` line is what makes the `old_string` unique — do not drop it.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/data/cards/core.ts
git commit -m "balance(P13-21): the_donation 'Accept it' gold +3 → +2 (strings_attached threat is the counterweight)"
```

---

## Task 2: Trim `academic_society` "Attend as a guest speaker" inf +3 → +2

**Files:**
- Modify: `src/data/cards/core.ts` around line 400

- [ ] **Step 1: Apply the edit**

Use `Edit` with this exact `old_string`:

```ts
          { type: 'resource', resource: 'influence', delta: 3 },
          { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 5, maxPos: 9 },
```

And this `new_string`:

```ts
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 5, maxPos: 9 },
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/data/cards/core.ts
git commit -m "balance(P13-21): academic_society 'Guest speaker' inf +3 → +2 (investigators_file is sufficient liability)"
```

---

## Task 3: Trim `local_elections` "Back them openly" inf +3 → +2

**Files:**
- Modify: `src/data/cards/core.ts` around line 580

- [ ] **Step 1: Apply the edit**

Use `Edit` with this exact `old_string`:

```ts
          { type: 'resource', resource: 'influence', delta: 3 },
          { type: 'insertCard', cardId: 'political_debt', position: 'random', minPos: 5, maxPos: 9 },
```

And this `new_string`:

```ts
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'insertCard', cardId: 'political_debt', position: 'random', minPos: 5, maxPos: 9 },
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/data/cards/core.ts
git commit -m "balance(P13-21): local_elections 'Back openly' inf +3 → +2 (political_debt + quiet alternative preserved)"
```

---

## Task 4: Trim `the_opium_den` "Acquire it" gold −3 → −2 + condition `min: 3` → `min: 2`

**Files:**
- Modify: `src/data/cards/core.ts` around lines 508 and 513 (two edits in the same option block)

- [ ] **Step 1: Apply edit A (gold delta)**

Use `Edit` with this exact `old_string`:

```ts
          { type: 'resource', resource: 'gold', delta: -3 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'the_dreamer', position: 'random', minPos: 2, maxPos: 5 },
```

And this `new_string`:

```ts
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'the_dreamer', position: 'random', minPos: 2, maxPos: 5 },
```

- [ ] **Step 2: Apply edit B (condition `min`)**

Use `Edit` with this exact `old_string`:

```ts
          { type: 'insertCard', cardId: 'the_dreamer', position: 'random', minPos: 2, maxPos: 5 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 3 },
```

And this `new_string`:

```ts
          { type: 'insertCard', cardId: 'the_dreamer', position: 'random', minPos: 2, maxPos: 5 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
```

The shared `insertCard` line locks the location to the "Acquire it" option specifically.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/data/cards/core.ts
git commit -m "balance(P13-21): the_opium_den 'Acquire it' gold -3 → -2 (cost + gate lowered together)"
```

---

## Task 5: Knowledge-base updates (vault, not git)

**Files:**
- Append: `E:/Project Abyssial/knowledge/agents/balance.md`
- Append: `E:/Project Abyssial/knowledge/decisions.md`

These files live at the **vault root**, not inside the code repo. They are not git-tracked. Just save the appends.

- [ ] **Step 1: Append heuristic to `knowledge/agents/balance.md` under "Hard Limits"**

Find the "Hard Limits" section (currently has two bullets: "Max 3 options per card" and "Max 3 resource delta effects per option"). Add a new bullet immediately after them:

```markdown
- **Common/core option resource cap (P13-21, 2026-06-12):** Each direct resource delta on a common or core option ≤ ±2. RandomOutcome variants are exempt (legibility comes from `?` tooltip). InsertCard / removeCard effects are exempt. Documented exceptions: `relic_market` (×2 — headline sinks), `the_old_book` (×2 — dread-spike identity).
```

- [ ] **Step 2: Append lesson to the bottom of `knowledge/agents/balance.md`**

Add this line at the very end of the file (in the "Lessons Learned" section):

```markdown
- 2026-06-12: P13-21 audit — 8 core options exceeded ±2. Soft-cap approach: trimmed 4 (the_donation, academic_society, local_elections, the_opium_den) where the option also inserts a threat (the threat IS the counterweight). Kept 4 (relic_market ×2, the_old_book ×2) as documented exceptions — their larger swing IS the card's identity. Common had zero base violations; only randomOutcome variants exceeded the cap and those are exempt per spec. Common.ts untouched.
```

- [ ] **Step 3: Append decision to `knowledge/decisions.md`**

Add a new section to the bottom of `decisions.md` (match the file's existing format — read the last entry first to mirror its style):

```markdown
## 2026-06-12 — Common/core resource cap (P13-21)

- Direct resource deltas on common/core options ≤ ±2.
- RandomOutcome variants exempt — legibility via `?` tooltip.
- InsertCard / removeCard effects exempt — not resource deltas.
- Documented exceptions (do not re-litigate): `relic_market` "Buy it" (gold −3), `relic_market` "Trade on your name" (inf −3), `the_old_book` "Read it yourself" (dread +3), `the_old_book` "Hire a translator" (dread +3).
- Spec: `docs/superpowers/specs/2026-06-12-resource-cap-audit-design.md`.
```

- [ ] **Step 4: No commit needed**

Vault files are not git-tracked. Move on.

---

## Task 6: Final verification + backlog update

**Files:**
- Verify: `src/data/cards/core.ts`, `src/data/cards/common.ts`
- Update: `E:/Project Abyssial/knowledge/backlog.md` (mark P13-21 done)

- [ ] **Step 1: Grep regression check — core.ts**

Run: `grep -nE 'delta:\s*-?[3-9]' src/data/cards/core.ts`

Expected: **exactly 4 matches**, all on documented-exception cards. They must be (line numbers approximate):
- `relic_market` "Buy it" — `delta: -3` (gold)
- `relic_market` "Trade on your name" — `delta: -3` (influence)
- `the_old_book` "Read it yourself" — `delta: 3` (dread)
- `the_old_book` "Hire a translator" — `delta: 3` (dread)

Any other match is a regression. If the count is not 4, stop and re-check the previous tasks.

- [ ] **Step 2: Grep regression check — common.ts**

Run: `grep -nE 'delta:\s*-?[3-9]' src/data/cards/common.ts`

Expected: **only matches inside `randomOutcome` blocks** (currently `the_inheritance` "Fight it in court" with gold +3 / +4 variants). If any match is on a direct option `effects` array, that is a regression to investigate.

- [ ] **Step 3: Full typecheck and build**

Run: `npm run typecheck`
Expected: clean.

Run: `npm run build`
Expected: clean (catches type drift the typecheck-only mode might miss).

- [ ] **Step 4: Manual smoke playtest**

Start the app (`npm run dev`). For each of the 4 trimmed cards, draw or force-draw it and confirm:
- `the_donation` "Accept it" shows gold **+2** in the EffectTags row (not +3).
- `academic_society` "Attend as a guest speaker" shows influence **+2**.
- `local_elections` "Back them openly" shows influence **+2**.
- `the_opium_den` "Acquire it" shows gold **−2**, and is selectable when gold = 2 (previously required gold ≥ 3).

- [ ] **Step 5: Update `knowledge/backlog.md` — mark P13-21 complete**

Under "Session: Resource Economy & Card Balance", change the P13-21 line from:

```markdown
- P13-21: Common and core cards should max out at ±2 resources per option (excluding card insertion/removal) — too much mental calculation otherwise. Audit all common/core cards; cascade risk high.
```

to:

```markdown
- [x] **P13-21:** Complete (session 67, 2026-06-12). 4 core options trimmed (the_donation, academic_society, local_elections, the_opium_den). 4 documented exceptions kept (relic_market ×2, the_old_book ×2). Common had no base-option violations. Spec: `docs/superpowers/specs/2026-06-12-resource-cap-audit-design.md` · Plan: `docs/superpowers/plans/2026-06-12-resource-cap-audit.md`.
```

If P13-25 is the only remaining item in that session header, leave the header — do not delete (P13-25 is still open).

- [ ] **Step 6: No further commit**

The 4 task commits already cover all git-tracked changes. Vault files are not git-tracked. Done.
