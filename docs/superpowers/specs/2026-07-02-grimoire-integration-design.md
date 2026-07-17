# Grimoire Integration Design

**Date:** 2026-07-02  
**Author:** Claudian (orchestrator AI)  
**Status:** Approved — awaiting implementation plan  
**Scope:** Vault workflow only — no game code changes

---

## Overview

Grimoire is a secondary local AI operating inside the same Obsidian vault. Claudian (Claude Code) remains the orchestrator: it plans, designs, and specs all work. Grimoire is the doer: it executes well-specced implementation tasks and reports results.

This document specifies the integration layer — startup reads, routing criteria, task graduation, verification, and file ownership.

---

## Goals

1. Route implementation-ready tasks to Grimoire without manual overhead
2. Keep Claudian's knowledge system (`handoff.md`, `backlog.md`, `knowledge/`) as the single source of truth
3. Give Grimoire a clear, unambiguous queue to read from
4. Close the feedback loop: completed Grimoire work is verified and merged into Claudian's records

## Non-Goals

- Grimoire does not own design decisions
- Grimoire does not write to `knowledge/` files (except its own `Grimoire/` folder)
- Grimoire does not replace any existing Claudian subagent (thematic, card-mechanics, balance, code, etc.)
- No new files beyond what Grimoire already created in `Grimoire/`

---

## Architecture

```
backlog.md (Claudian owns)
    |
    | [graduation step — shutdown]
    v
Grimoire/grimoire-work-queue.md  <-- Grimoire reads + executes
    |
    | [Grimoire updates status + commit hash]
    v
Grimoire/grimoire-handover-to-claude.md  <-- Claudian reads at startup
    |
    | [Claudian spot-checks diff + merges]
    v
knowledge/sessions/handoff.md (updated)
```

---

## Section 1 — Startup Sequence

Claudian's mandatory startup reads (in order):

1. `knowledge/README.md`
2. `knowledge/sessions/handoff.md`
3. `knowledge/backlog.md`
4. **`Grimoire/grimoire-handover-to-claude.md`** — read if Grimoire has run since last session (user will indicate this, or date/content will differ from last known state)

When reading step 4, Claudian does two things inline:
- **Spot-check**: runs `git show <commit-hash>` on any new commits Grimoire reports, scanning the diff for obvious issues (wrong files touched, missing test run, scope creep)
- **Merge**: updates `handoff.md` with `GRIMOIRE_LANDED: <hash> - spot-check OK` (or `FLAG: <reason>` if an issue is found)

If flagged, Claudian adds a note in `Grimoire/grimoire-handover-to-claude.md` for Grimoire to address next session. Claudian does not block on this — flagged items are noted in `handoff.md` and picked up when Grimoire next runs.

---

## Section 2 — Routing Criteria

### Grimoire-eligible (`🤖`)

A backlog item is Grimoire-eligible when ALL of the following are true:

| Criterion | Description |
|-----------|-------------|
| Specced | A spec exists (`docs/superpowers/specs/`) OR implementation steps are unambiguous (no design decision required mid-task) |
| Pattern-following | Changes read/write to existing code patterns — no new architecture decisions |
| Bounded complexity | S or M complexity; L is acceptable if risk is Low and scope is tightly bounded |
| Risk ≤ Med | High-risk items stay with Claudian |
| Not a design session | No brainstorm or balance tuning that requires judgement |
| Safe zones respected | Does not touch files in "Do NOT touch" list in `grimoire-vault-context.md` |

### Claudian-only (`🧠`)

A backlog item stays with Claudian when ANY of the following are true:

- Needs a brainstorm/design session before coding can begin
- Requires cross-file architecture decisions or tradeoffs
- Creative, thematic, or flavour work needing narrative judgement
- Balance tuning requiring playtest-dependent judgement
- Touches engine invariants with latent bugs (e.g., `onDraw` latent bug — `bugs.md` line 10)
- Marked as "design session" in `backlog.md`

---

## Section 3 — Backlog Owner Markers

`backlog.md` entries get an owner marker appended on the same line:

```markdown
- [ ] P19-45 weight cap impl 🤖 queued
- [ ] P19-35 reshuffle prune 🤖 queued
- [ ] GameScreen.tsx split 🤖 queued
- [ ] P20-G flavour bloat sweep 🤖 queued
- [ ] P20-B shub redesign 🧠
- [ ] P20-A whisper redesign 🧠
- [ ] P20-D difficulty floor 🧠
```

**Marker meanings:**

| Marker | Meaning |
|--------|---------|
| `🤖` | Grimoire-eligible, not yet in queue |
| `🤖 queued` | Written to `grimoire-work-queue.md`, Grimoire can claim |
| `🤖 done <hash>` | Grimoire completed, spot-check passed, merged into handoff |
| `🧠` | Claudian-only — design session or complex decision required |
| *(none)* | Not yet classified |

---

## Section 4 — Shutdown: Graduation Step

Claudian's shutdown checklist gains one step, inserted between "update backlog" and "tell user /clear":

> **Graduate to Grimoire queue?**
> Scan `backlog.md` for items that are:
> - Tagged `🤖` (not yet `🤖 queued`)
> - Have a spec or are well-enough defined to write a plan now
>
> For each graduating item:
> 1. Write the plan to `Grimoire/grimoire-work-queue.md` using the existing template
> 2. Update the backlog entry: `🤖` → `🤖 queued`
>
> If an item is `🤖` but not yet specced enough, leave it — do not force premature graduation.

---

## Section 5 — Verification (Spot-Check Protocol)

When Grimoire marks a task `[x] <hash>` in the work queue:

1. **At next Claudian startup**: read `grimoire-handover-to-claude.md`, extract new commit hashes
2. **Run**: `git -C "E:/Project Abyssial/Code/project-abyssial" show <hash> --stat` to see files changed (use `C:/Project Abyssial/...` if E drive unreachable — see handoff OPEN_COMMITMENTS re: E drive)
3. **Check**:
   - Files changed match the plan's "Modify" scope
   - "Do NOT touch" files are not in the diff
   - Commit message mentions the task ID
4. **Update `handoff.md`**:
   - Pass: `GRIMOIRE_LANDED: <hash> - spot-check OK — <task-id>`
   - Fail: `GRIMOIRE_LANDED: <hash> - FLAG: <reason> — <task-id>`
5. **Update backlog**: mark item `🤖 done <hash>`

Full `requesting-code-review` skill invocation is reserved for flagged items or large L-complexity tasks.

---

## Section 6 — File Ownership

| File | Owner | Notes |
|------|-------|-------|
| `knowledge/README.md` | Claudian | Add Grimoire routing entry |
| `knowledge/sessions/handoff.md` | Claudian | Add `GRIMOIRE_LANDED` field |
| `knowledge/backlog.md` | Claudian | Add `🤖`/`🧠` markers to existing items |
| `CLAUDE.md` | Claudian | Add startup step 4 + graduation step + spot-check rule |
| `Grimoire/grimoire-work-queue.md` | Claudian writes plans; Grimoire updates status | Shared — clear ownership per section |
| `Grimoire/grimoire-vault-context.md` | Grimoire maintains | Claudian reads on demand only |
| `Grimoire/grimoire-handover-to-claude.md` | Grimoire writes; Claudian reads | Grimoire overwrites each session |

---

## Section 7 — Grimoire Startup Convention

Grimoire reads (in order) at the start of each session:

1. `Grimoire/grimoire-vault-context.md`
2. `knowledge/sessions/handoff.md`
3. `Grimoire/grimoire-work-queue.md` (top unclaimed task)

Grimoire writes at the end of each session:

1. Updates status markers in `grimoire-work-queue.md` (in place)
2. Overwrites `Grimoire/grimoire-handover-to-claude.md` with: what it did, commit hashes, any questions or blockers

---

## Changes Required (Implementation Plan Input)

| File | Change Type | Description |
|------|-------------|-------------|
| `CLAUDE.md` | Edit | Add startup step 4 (Grimoire handover); add graduation step to shutdown checklist; add spot-check rule to startup |
| `knowledge/README.md` | Edit | Add Grimoire routing entry to routing table |
| `knowledge/sessions/handoff.md` | Edit | Add `GRIMOIRE_LANDED` field (initially empty) |
| `knowledge/backlog.md` | Edit | Add `🤖`/`🧠` markers to all open items; classify each |
| `Grimoire/grimoire-handover-to-claude.md` | Edit | Add note: Claudian now reads this at startup; Grimoire should overwrite (not append) each session |

---

## Open Questions / Future Considerations

- **Parallel execution**: Can Grimoire run while a Claudian session is active? Currently assumed sequential (one AI at a time). If parallel, shared writes to `backlog.md` could conflict — defer until it becomes a practical problem.
- **Grimoire escalation**: If Grimoire hits an ambiguous decision mid-task, it writes a question in `grimoire-handover-to-claude.md`. Sufficient for now. If escalation becomes frequent, consider a formal `BLOCKED` field in the queue item.
- **Archive hygiene**: Completed Grimoire tasks should be periodically moved from "Active Queue" to "Completed" in `grimoire-work-queue.md`. Cadence: every 5–10 completed items.
