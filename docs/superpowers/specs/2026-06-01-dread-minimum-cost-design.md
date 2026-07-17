# Dread Minimum Cost (P10-17) Design

## Goal

Every unconditional option in `core.ts` and `common.ts` that gives resources (or does nothing) with no deferred cost must carry at least Dread +1. Players should feel the threat of `allBlocked` as a common pressure mechanic throughout a run, not just a theoretical edge case.

## Problem

130 cards were audited. 92 have at least one unconditional option (no `condition` field). 10 of those are pure dumps with zero effect. Because the cheapest option on most cards costs nothing, `allBlocked` — the failure screen — is functionally unreachable. Dread never accumulates passively from choosing the "safe" path.

## Rule

> Every unconditional option in `core.ts` and `common.ts` that does not already contain a dread effect AND does not insert a card gets `{ type: 'resource', resource: 'dread', delta: 1 }` added.
>
> Options that already insert another card are excluded — the inserted card carries its own pressure.

## Out of Scope

- Options that already have any dread effect (positive or negative)
- Options that insert a card (deferred pressure assumed)
- Threats, rare, mutations, unravelling, and god path cards — separate balance session

## Changes

### core.ts — 1 edit

| Card | Option | Change |
|---|---|---|
| `congregation_meets` | "Pass the collection plate" | + Dread +1 |

### common.ts — 7 edits

| Card | Option | Change |
|---|---|---|
| `academic_society` | "Send regrets" | + Dread +1 |
| `woodcutters_report` | "Decline" | + Dread +1 |
| `the_printing_press` | "Help the printer" | + Dread +1 |
| `the_inheritance` | "Have a quiet word" | + Dread +1 |
| `the_inheritance` | "Relinquish" | + Dread +1 |
| `local_elections` | "Stay out" | Dread +1 (was empty) |
| `travelling_merchant` | "Pass" | Dread +1 (was empty) |

**Total: 8 edits across 7 cards.**

## Follow-up

Balance subagent to review the 8 changes for EV impact after implementation. Key cards to watch: `the_inheritance` (both non-conditioned options now cost dread, making it significantly heavier) and `the_printing_press` ("Help the printer" is the low-cost trade option — adding dread raises its floor).
