# T2 — `- random threat` rework (narrow scope)

**Date:** 2026-06-23
**Tickets closed:** P17-9, P17-10, P17-24, P18-9
**Out of scope:** P17-11 (common/core/rare cadence redefinition), P18-15 (rare-tag duration). Those belong to a separate Deck & Reshuffle brainstorm.

---

## Goal

Tighten the `removeRandomThreat` effect on three axes:

1. **Targeting** — stop the effect from purging overflow / deficit cards (P17-10), in addition to the existing prep-carrier exclusion.
2. **Surfacing** — rename the chip to `- threat`, restyle to match `-card` outline (P18-9), and let it auto-generate so authored `previewTag` overrides stop drifting (P17-24's string bug).
3. **Carrier card (Clarence)** — collapse the named-target option list into a generic two-priced rare so the rare survives mid-run rare-rotation and reads consistently with the new chip (P17-9 + P17-24's "Clarence purged" perception bug).

## Non-goals

- No change to the `removeRandomThreat` semantics beyond the target filter — still random, still picks across drawPile + discardPile + nextCycleQueue, still silent no-op on zero targets.
- No new effect type. No schema change to `Card` or `Option`.
- No change to the two other `removeRandomThreat` callsites' costs ("Have him followed" -2 gold in `core.ts`, "Send it ahead" in Dark Young Guardian). They inherit the new chip + new filter automatically; their balance is unchanged.
- No change to rare-rotation behaviour from s89.

---

## Change 1 — Effect target filter

### Today

`gameStore.ts::resolveOption` (live) and `gameLoop.ts` (dead-code mirror) both compute:

```ts
const targets = [
  ...deck.drawPile.map(...),
  ...deck.discardPile.map(...),
  ...deck.nextCycleQueue.map(...),
].filter(({ card }) =>
  card.tier === 'threat'
  && !card.permanent
  && !PREP_CARRIER_IDS.has(card.id)
)
```

This filter currently lets overflow cards (`the_ledger_is_noticed`, `theyre_not_listening`, `the_wrong_rooms`) and deficit cards (`deficit_gold`, `deficit_followers`, `deficit_influence`) be valid purge targets — they all live in `threats.ts` with `tier: 'threat'` and lack the `permanent` flag.

### After

Add a static registry derived from the canonical maps in `gameStore.ts`:

```ts
const OVERFLOW_DEFICIT_IDS: ReadonlySet<string> = new Set([
  ...Object.values(OVERFLOW_CARD_ID),
  ...Object.values(DEFICIT_CARD_ID),
])
```

Extend the filter:

```ts
.filter(({ card }) =>
  card.tier === 'threat'
  && !card.permanent
  && !PREP_CARRIER_IDS.has(card.id)
  && !OVERFLOW_DEFICIT_IDS.has(card.id)
)
```

Apply the same change in `gameLoop.ts` to keep the dead-code mirror consistent (per the S4 pattern). Zero-target outcome is unchanged: silent no-op, no cost refund.

### Why derived, not hardcoded

`OVERFLOW_CARD_ID` and `DEFICIT_CARD_ID` already exist as the single source of truth for which card IDs the overflow/deficit subsystem spawns. Deriving the exclusion set from them means any future addition (e.g. a new deficit resource) joins the exclusion automatically.

---

## Change 2 — Chip rendering

### Label

Wherever an option's `effects` array contains a `removeRandomThreat`, the rendered structural chip reads **`- threat`** (singular, no count, no "random").

### Style

Reuse the existing `-card` outline chip class — same border, padding, treatment. The two structural chip variants (`-card` and `- threat`) share one CSS class; if visual divergence is later needed, split is cheap.

### Implementation locus

`Code/project-abyssial/src/components/game/tags/StructuralTag.tsx`. The existing dispatch already renders generic chips for `insertCard` / `removeCard`; add the `removeRandomThreat` branch that emits the outline `- threat` chip.

### `previewTag` audit

Three `previewTag` overrides exist in `src/data/cards/rare.ts` today:

- `:124` `'+ summons the guardian'` — unrelated (summon mechanic), **keep**.
- `:155` `'− removes investigators'` (Clarence opt A) — **delete**, the new auto-generated `- threat` chip replaces it.
- `:184` `'− buries loose ends'` (Clarence opt B) — **delete** for the same reason; under Change 3, opt B is also a `removeRandomThreat` effect.

No other overrides reference investigators/threats. A grep at implementation time will confirm before deletion.

### Effect on the type system

`previewTag` stays on the `Option` schema — it's still useful for non-`removeRandomThreat` overrides (e.g. the summon chip). No type change.

---

## Change 3 — Clarence rework

### Today (`src/data/cards/rare.ts` ~148-219)

Two `hasCard`-gated options, each spending influence (+gold on opt B) and firing a multi-`removeCard` list against a named threat set:

- Opt A: `−3 influence` + remove `investigators_file | the_detective | arson_inspector | missing_persons` + self-remove.
- Opt B: `−1 influence −1 gold` + remove `loose_end | their_report | their_suspicion | what_was_done` + self-remove.
- Opt C: `Not yet` (no-op, satisfies allBlocked).

Problems P17-9 / P17-24 named:
- Rare-rotation (s89) means Clarence might not survive long enough to use his named removes — the gating is brittle.
- The `'− removes investigators'` chip is hardcoded and the playtester read the bundled `removeCard clarence` self-remove as "the game stole my Clarence" rather than "I spent the rare's one-use charge".

### After

Replace the two named-target options with two **generic priced** options that share the new chip:

| Option | Label (placeholder — thematic pass at impl time) | Condition | Effects |
|---|---|---|---|
| A | *"Have him handle it"* (political angle) | `resourceMin influence ≥ 3` + `hideWhenUnavailable: true` | `−3 influence`, `removeRandomThreat`, `removeCard clarence` |
| B | *"Pay him to bury it"* (bribery angle) | `resourceMin gold ≥ 2` + `hideWhenUnavailable: true` | `−2 gold`, `removeRandomThreat`, `removeCard clarence` |
| C | `Not yet` | unconditional | `[]` (satisfies allBlocked) |

Key properties:

- **One-use preserved.** Opt A and B both `removeCard clarence`. Identity intact; rare-rotation handles the unused case automatically.
- **No `previewTag` overrides.** Chip renders as `- threat` from the effect.
- **No `hasCard` predicate.** The effect is allowed to be a no-op when no eligible threats exist (silent). Removing the gate is what makes the option survive rare-swap — Clarence is useful whenever you have the resources, not only when specific threats are present.
- **`hideWhenUnavailable: true`** on A and B so a player short on both economies sees only "Not yet" — same UX policy as the current opt A.
- **Labels and flavour** finalised at implementation time; thematic agent consulted if the placeholder names need work.

### P17-24's "Clarence purged" perception

Resolved structurally: the new option no longer fires a visible `removeCard investigators_file` adjacent to the `removeCard clarence`. The activity log will show one `- threat` purge + the option's spend + the Clarence retirement, in that order — three independent beats rather than one chained "removes everything" beat. The string `'− removes investigators'` is gone (Change 2).

### Save-state coupling

To verify at implementation time: option ids may change (`'remove_threats'` etc.). Skim `gameStore` persistence + any in-progress save format for hard-coded Clarence option ids. None expected, but worth a 60-second grep.

---

## Test plan

All in `gameStore.test.ts` extending the existing `removeRandomThreat` describe block.

1. **Overflow card excluded.** Seed `the_ledger_is_noticed` into the draw pile + one ordinary threat. Fire `removeRandomThreat` 20× with deterministic RNG (or just assert the only purged ID is the ordinary threat across N runs). Mirror for the other two overflow IDs.
2. **Deficit card excluded.** Same shape, with `deficit_gold` / `deficit_followers` / `deficit_influence`.
3. **Existing prep-carrier exclusion** (s89 test) remains green — no regression.
4. **Clarence opt A.** Set influence = 3, seed an ordinary threat, resolve opt A. Assert: influence = 0, threat removed, Clarence is in `permDiscardPile`.
5. **Clarence opt B.** Set gold = 2, seed an ordinary threat, resolve opt B. Assert: gold = 0, threat removed, Clarence in `permDiscardPile`.
6. **Clarence opt B with zero eligible threats.** Set gold = 2, seed only overflow + deficit + prep-carrier threats. Resolve opt B. Assert: gold = 0 (cost still paid), no threat removed, Clarence in `permDiscardPile`. Documents the "silent no-op + cost not refunded" policy.
7. **Chip rendering** — light React Testing Library check that an option with a `removeRandomThreat` effect renders a chip with text `- threat` and the outline class. Skip if `StructuralTag.tsx` lacks existing test infra; the visual pass during playtest covers it.

Target: all 96 existing tests stay green; 6-7 new tests added; typecheck clean.

---

## Implementation order

1. `OVERFLOW_DEFICIT_IDS` registry + filter expansion in both `gameStore.ts` and `gameLoop.ts`.
2. Test 1 + 2 + 3 (filter behaviour). Green before moving on.
3. Clarence option set rewrite in `rare.ts`. Delete the two `previewTag` overrides.
4. Test 4 + 5 + 6. Green.
5. `StructuralTag.tsx` `- threat` chip + style class hookup.
6. Test 7 (if cheap) + grep for any other `previewTag` mentioning "threat" / "investigators".
7. Typecheck + full test run.

Single feature branch, small commits per step.

---

## Open items deferred to implementation time

- Final Clarence labels + flavour text (placeholder above; thematic agent consult if needed).
- Confirm no save-state coupling on Clarence option ids.
- Confirm `StructuralTag.tsx` testing convention before writing test 7.

---

## Risks

- **Clarence ungated could feel weaker** — players may take opt C ("Not yet") more often because the named-threat justification is gone. Mitigation: cost is already low and the effect is reliable; if playtest shows opt C dominance, revisit the prices.
- **`- threat` chip ambiguity** — players might expect it to remove treats too (P18-9's other half). The deliberate decision: it does not. If playtest re-raises this, the door is open to revisit; no schema change would be needed.
