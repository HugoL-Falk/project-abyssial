# P20-G — Flavour Bloat Sweep (Char Caps + Em-Dash Audit)

**Date:** 2026-07-02
**Tier:** A (text audit, multi-file)
**Status:** Design approved, ready for plan.

## Problem

Playtest 19 established global flavour-text caps (session 100):
- Option `flavourText` ≤ 80 chars (2 rows @ 0.8rem Cormorant in draw view)
- Card body `flavourText` ≤ 108 chars (3 rows @ 1.0rem in main draw view)
- Second-person voice preserved on trim (no passive conversion)
- Tutorial.ts exempt

Session 100 trimmed 51 strings across 7 files. P20-G is the regression sweep + em-dash removal across the full vault.

Backlog P20-G specifically calls out 12 cards for attention, plus full-vault audit:
1. `nyarlathotep_1` (The Lecture) — opt headers → "Attend" / "Distribute pamphlets"
2. `yha_nthoath_of_dagon` (The Oath of Dagon) — body 4→3, opt1 too many changes, opt2 long
3. `the_veil_thins` (unravelling_1) — reflavour softer→eerie
4. `the_book_is_opened` (nyarlathotep_4) — em-dashes
5. `nyarlathotep_3` — em-dashes, long titles
6. `nyarlathotep_6` — em-dashes, long titles
7. `shub_niggurath_1` — long bodies/opts, em-dashes
8. `shub_niggurath_2` — long bodies/opts, em-dashes
9. `shub_niggurath_3` — long bodies/opts, em-dashes
10. `shub_niggurath_5` — long bodies/opts, em-dashes
11. `shub_words_come_naturally` — long bodies/opts
12. `travelling_merchant` — activity-log line

Plus em-dash audit across ALL cards.

## Decision

**Approach: One-off audit script → manual edits.**

1. Write a Node/TS script that scans ALL `flavourText` fields across all card data files
2. Script outputs structured violation report (CSV/JSON)
3. Manually edit each flagged card with per-context em-dash replacement and deadpan trimming
4. Deadpan voice rules from session 100:
   - Most body overflows are two sentences + weak kicker — cut the kicker
   - Direct-address "you" co-occurs with overflow — KEEP second-person
   - Two-clause symmetry jokes → compress to one clause + flat punchline
   - Derive caps from MAIN draw view (not compact preview overlay)

**Files to scan (11 files, 1 exempt):**
- `src/data/cards/core.ts`
- `src/data/cards/common.ts`
- `src/data/cards/rare.ts`
- `src/data/cards/threats.ts`
- `src/data/cards/treats.ts`
- `src/data/cards/special.ts`
- `src/data/cards/mutations.ts`
- `src/data/cards/unravelling.ts`
- `src/data/godPaths/yha_nthlei.ts`
- `src/data/godPaths/nyarlathotep.ts`
- `src/data/godPaths/shub_niggurath.ts`

**Exempt:** `src/data/cards/tutorial.ts`

**Fields to audit:**
- Card body `flavourText`
- Option `flavourText`
- `flavourTextByDrawCount` variants (e.g., `changed_follower`)
- `randomOutcome.flavourText` inside effects (for consistency)

## Mechanism

### Audit Script

Location: `scripts/audit-flavour-caps.ts` (one-off, not checked into tests)

Algorithm:
1. Import all card arrays from the 11 source files
2. For each card, extract:
   - `card.id`, `card.title`, `card.flavourText` (body)
   - Each `option.flavourText`
   - Each `option.effects` → find `randomOutcome` → each outcome's `flavourText`
   - `card.flavourTextByDrawCount` if present
3. For each string, check:
   - `type: 'body'` → limit 108
   - `type: 'option'` → limit 80
   - Count `—` (U+2014) and `–` (U+2010) characters
4. Output row for each string, flag violations

### Manual Edit Pass

For each flagged card:
1. Trim body to ≤ 108 chars, option to ≤ 80 chars
2. Replace em-dashes with context-appropriate punctuation
3. Apply deadpan voice: cut weak kickers, compress symmetry jokes, keep "you"
3. Use straight quotes only

## Scope / Boundaries

- **Only** `flavourText` strings (body, option, randomOutcome, draw-count variants)
- **No** logic changes, no effect changes, no condition changes
- **No** card title changes (unless title IS the flavour — not the case here)
- **Exempt:** `tutorial.ts` entirely
- **Deadpan sweep:** Fold into this pass where overlap exists (P17-4 / P13-24 Plan B)

## Edge Cases

- `changed_follower.flavourTextByDrawCount` — audit each draw-count variant
- `randomOutcome` flavourText — not explicitly in spec but should be consistent
- Em-dashes inside template literals — same replacement
- Curly quotes from encoding bug (bugs.md line 53) — ensure straight quotes

## Testing

- Script runs without error, produces report
- Post-edit: grep verification for zero em-dashes, zero over-limit strings
- `npm test` passes (no syntax errors from quote changes)
- `npm run typecheck` clean
- Manual spot-check: cards read naturally, voice preserved

## Follow-ups

- P13-24 Plan B (deadpan sweep) — this task covers the flavour portion
- P17-4 (per-week flavour for common+core) — separate session