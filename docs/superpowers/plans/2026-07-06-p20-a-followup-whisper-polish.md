# P20-A Follow-Up — Whisper Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `the_newspaper` whisper (add threat-insert downside), nerf `the_seance` whisper (clamp surfaceChainCard position), and run a thematic agent pass over the 15 new whisper flavour texts added in P20-A.

**Architecture:** All changes are data-only edits to `src/engine/whispers.ts`. No engine, type, or test file changes. Task 1 is mechanical (two targeted edits + vitest). Task 2 is creative (thematic agent produces KEEP/REWRITE proposals; Claudian reviews and applies).

**Tech Stack:** TypeScript, Vitest. No new dependencies.

## Global Constraints

- `src/engine/whispers.ts` is the only file modified in both tasks.
- Flavour text ≤ 108 characters per entry.
- No new unit tests required (data-only changes); existing 242 vitest tests must continue to pass after each task.
- Never amend existing commits — each task gets its own fresh commit.
- Laptop write path: `C:/Project Abyssial/Code/project-abyssial` (E: drive is unreachable from bash on laptop; use this path for all git commands).

---

## Task 1: Mechanical fixes — newspaper threat insert + seance position clamp

**Files:**
- Modify: `src/engine/whispers.ts` (two edits — `the_newspaper` and `the_seance` entries)

**Interfaces:**
- Produces: `the_newspaper` whisper with `insertCard: the_newspaper_article` effect; `the_seance` whisper with `surfaceChainCard` clamped to positions 2–4.

---

- [ ] **Step 1: Edit `the_newspaper` whisper — add the threat insert**

Open `src/engine/whispers.ts`. Find the `the_newspaper` entry (currently around line 83). Replace it in full:

```ts
  the_newspaper: {
    label: '"The wrong people are already reading it."',
    flavourText: 'The story spread where it was meant to. The wrong people read very carefully.',
    effects: [
      { type: 'resource', resource: 'influence', delta: 3 },
      { type: 'resource', resource: 'dread',     delta: 2 },
      { type: 'insertCard', cardId: 'the_newspaper_article', position: 'random', minPos: 4, maxPos: 8 },
    ],
    isWhisper: true,
    replacesSlot: 1,
  },
```

> Note: flavour text will be updated by Task 2's thematic pass — leave it as-is for now.

- [ ] **Step 2: Edit `the_seance` whisper — clamp surfaceChainCard to positions 2–4**

In the same file, find the `the_seance` entry (currently around line 224). Replace it in full:

```ts
  the_seance: {
    label: '"Let it have the room."',
    flavourText: 'It had already taken the room. You just made it official.',
    effects: [
      { type: 'surfaceChainCard', minPos: 2, maxPos: 4 },
      { type: 'resource', resource: 'dread', delta: 2 },
    ],
    isWhisper: true,
    replacesSlot: 1,
  },
```

- [ ] **Step 3: Run vitest — verify 242 pass**

```bash
cd C:/Project\ Abyssial/Code/project-abyssial && npx vitest run
```

Expected: `242 passed` (or higher if tests were added since s127). Zero failures. If any test fails, stop and diagnose before continuing.

- [ ] **Step 4: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/engine/whispers.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "fix(P20-A-followup): newspaper threat insert + seance surfaceChainCard position clamp"
```

---

## Task 2: Thematic agent pass — 15 new whisper flavour texts

**Files:**
- Modify: `src/engine/whispers.ts` (apply accepted rewrites from thematic agent output)

**Interfaces:**
- Consumes: thematic agent proposal (KEEP or REWRITE per entry, with char counts)
- Produces: all 15 new whisper flavour texts at production quality; `the_newspaper` flavour text sharpened to reflect threat-insert consequence

---

- [ ] **Step 1: Dispatch thematic agent**

Spawn a Haiku subagent (`subagent_type: "thematic"`, model: Haiku) with the following brief verbatim. The agent returns proposals only — it does not edit files.

---

**AGENT BRIEF:**

You are reviewing 15 whisper flavour texts for a Lovecraftian card game. These texts appear on options whispered by an alien entity onto cards at draw time. Your job: for each entry, output either **KEEP** (the current text is strong) or **REWRITE** with a replacement + character count.

**Voice constraints — non-negotiable:**
- Past tense, matter-of-fact deadpan. The narrator is the cult, not the entity.
- The entity is *implied* by the situation — never named, never described directly. No "it spoke", "the voice", "the darkness", "something ancient", etc.
- No grandiosity. No rhetorical flourish as a closing beat.
- ≤ 108 characters per text.
- No repetition of imagery, sentence structure, or opening word across the 15 entries.
- Two sentences maximum; one sentence preferred where possible.
- `the_newspaper` entry MUST be rewritten — it needs to acknowledge the follow-up consequence (scrutiny that arrives after the story runs, not just the reading itself).

**Reference texts (originals — use these to calibrate tone, do not change them):**
- `congregation_meets`: *The words landed like coins in a bowl. The air felt heavier. Nothing was agreed.*
- `the_donation`: *You did. The money arrived anyway. No note this time.*
- `the_landlord_cometh`: *The payment was prompt. One of ours offered to make the delivery.*
- `follower_confesses_doubt`: *The doubt was real. So was what replaced it.*
- `the_old_book`: *The language was wrong. The meaning was precise.*
- `rival_stirs`: *The rival cult was never a rival. They were an audience waiting for the right speaker.*
- `academic_society`: *Several left. More arrived the following week. The ones who arrived had already heard.*
- `the_seance`: *It had already taken the room. You just made it official.*

**The 15 entries to review (ID → current text):**

1. `the_inheritance` → *The family was already gone. We only made it official.*
2. `the_newspaper` → *The story spread where it was meant to. The wrong people read very carefully.* *(MUST REWRITE — sharpen to reflect the scrutiny that follows)*
3. `word_spreads` → *The word reached further than expected. They were already quoting it back at us.*
4. `the_harbormaster` → *She named the price. We paid. The one who didn't return was already written off.*
5. `the_left_item` → *It sat where he left it. Three new faces appeared the day someone moved it.*
6. `the_collection` → *They gave what was asked. Two of them won't be asked again.*
7. `the_complaint` → *We said nothing. They heard authority in it.*
8. `the_delayed_shipment` → *It arrived empty. We'd already removed what mattered.*
9. `stranger_asks_questions` → *He saw the space between the prayer and the practice. He stayed anyway.*
10. `the_harbour` → *Three of the crew knew what it was. The rest found out by proxy.*
11. `the_fire` → *They suspect us now. Someone found that suspicious compelling.*
12. `the_printing_press` → *The run cost more than expected. The text arrived anyway. No corrections needed.*
13. `the_opium_den` → *Two of them went further than they came back. A relic surfaced in the exchange.*
14. `the_wedding_rite` → *The words came as a gift. The followers heard them as a summons. Both correct.*
15. `supplies_dwindle` → *The provisions ran out. The whisper did not. No one mentioned the discrepancy.*

**Output format per entry:**
```
[N] `id` — KEEP
[N] `id` — REWRITE: "proposed text" (NN chars)
```

---

- [ ] **Step 2: Review agent proposals**

Read the agent's KEEP/REWRITE output. For each REWRITE:
- Verify char count ≤ 108
- Check it doesn't repeat the opening word or a structural pattern used by another REWRITE in this batch, or by any of the 8 reference texts
- Check it stays in past tense, no entity named
- Accept or reject each proposed rewrite

`the_newspaper` REWRITE is mandatory — if the agent's proposal doesn't acknowledge the follow-up scrutiny clearly enough, request a revision before proceeding.

- [ ] **Step 3: Apply accepted rewrites to `src/engine/whispers.ts`**

For each accepted REWRITE, find the matching entry in `whispers.ts` and replace only its `flavourText` string. Leave label, effects, isWhisper, and replacesSlot untouched.

Example for `the_fire` (if rewritten — adjust to actual proposal):
```ts
  the_fire: {
    label: '"You know why this happened."',
    flavourText: '<accepted rewrite here>',   // ← only this line changes
    effects: [
      { type: 'resource', resource: 'influence', delta: -1 },
      { type: 'resource', resource: 'followers', delta:  1 },
      { type: 'resource', resource: 'dread',     delta:  2 },
    ],
    isWhisper: true,
    replacesSlot: 1,
  },
```

- [ ] **Step 4: Run vitest — verify tests still pass**

```bash
cd C:/Project\ Abyssial/Code/project-abyssial && npx vitest run
```

Expected: same pass count as after Task 1. Zero failures.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/engine/whispers.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "copy(P20-A-followup): thematic pass — 15 new whisper flavour texts"
```

---

## Self-Review

**Spec coverage check:**
- §1 `the_newspaper` threat insert → Task 1 Step 1 ✓
- §2 `the_seance` position clamp → Task 1 Step 2 ✓
- §3 thematic pass (15 entries + voice constraints + mandatory newspaper rewrite) → Task 2 ✓
- §4 testing (242 vitest, no new tests) → Task 1 Step 3 + Task 2 Step 4 ✓
- §5 out of scope items → no tasks added for them ✓

**Placeholder scan:** No TBDs, no "similar to task N" references. Task 2 Step 3 example shows a concrete pattern even though the actual text isn't known yet (that's by design — it comes from the agent). ✓

**Type consistency:** `insertCard` effect shape matches existing uses in whispers.ts (`cardId`, `position`, `minPos`, `maxPos`). `surfaceChainCard` with `minPos`/`maxPos` matches the type definition at `types/index.ts:39`. ✓
