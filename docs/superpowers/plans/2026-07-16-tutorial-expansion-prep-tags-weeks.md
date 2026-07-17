# Tutorial Expansion: Prep Tags & Weekly Cadence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the scripted tutorial with two new cards (tutorial_prep_intro, tutorial_prep_react), update tutorial_reshuffle_card text, and fix tutorialReshuffle() ordering — teaching prep tags and weekly cadence to new players.

**Architecture:** Four self-contained tasks: (1) type system + engine flag for visible-when-locked prep options, (2) tutorialReshuffle() explicit ordering, (3) new card data + text updates + registry, (4) full flavour text audit. Each task commits independently. No UI component changes — all changes are in types, engine, and card data.

**Tech Stack:** TypeScript, Vitest (test runner). Run tests with `npx vitest run` from `C:/Project Abyssial/Code/project-abyssial`. Git path: `git -C "C:/Project Abyssial/Code/project-abyssial"`.

## Global Constraints

- No em-dashes anywhere in card text. Period separators only.
- No exclamation marks in card text.
- No "you" addressing the player in flavour text.
- `tutorial.ts` is exempt from the 80-char option / 108-char body length caps.
- All tutorial cards are `tier: 'tutorial'` unless they are actual game-tier cards (doom, threat, treat, god_path).
- `hideWhenUnavailable` must NOT be set on `tutorial_prep_react` option "Complete it" — the greyed state must be visible.
- Git repo path for all git commands: `C:/Project Abyssial/Code/project-abyssial`
- Test command: `npx vitest run` (run from repo root)
- All tests must pass before each commit (323 currently passing).

---

## File Map

| File | Change |
|---|---|
| `src/types/index.ts` | Add `revealWhenLocked?: true` to `CardOption` |
| `src/data/godPaths/prepTagCarriers.ts` | Add `'olgreth_prep'` to `PrepTag` union + `PREP_TAG_LABELS` |
| `src/state/gameStore.ts` | Update `isPrepTagMissing` hidden logic to respect `revealWhenLocked` |
| `src/engine/deck.ts` | Update `tutorialReshuffle()` to enforce explicit card ordering |
| `src/data/cards/tutorial.ts` | Add `tutorial_prep_intro`, `tutorial_prep_react`; update `tutorial_reshuffle_card`; audit all card text; update `TUTORIAL_CARDS` |
| `src/data/index.ts` | Add `tutorial_prep_react` to `ALL_CARDS` |
| `src/engine/deck.test.ts` | Add tests for tutorialReshuffle ordering |

---

## Task 1: PrepTag type extension + revealWhenLocked engine flag

**Why this is first:** Tasks 3 and 4 depend on `olgreth_prep` being a valid PrepTag and on `revealWhenLocked` existing in the CardOption type. Do this first so TypeScript compiles cleanly when the tutorial cards are added.

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/data/godPaths/prepTagCarriers.ts`
- Modify: `src/state/gameStore.ts`

**Interfaces:**
- Produces: `PrepTag` union includes `'olgreth_prep'`; `PREP_TAG_LABELS['olgreth_prep']` = `'Prior Arrangement'`; `CardOption.revealWhenLocked?: true`; `isPrepTagMissing` is false when `opt.revealWhenLocked` is set

---

- [ ] **Step 1: Add `revealWhenLocked` to CardOption in types/index.ts**

Open `src/types/index.ts`. Find the `CardOption` type (search for `hideWhenUnavailable`). Add `revealWhenLocked` immediately after `hideWhenUnavailable`:

```ts
  hideWhenUnavailable?: boolean
  revealWhenLocked?: true          // if set: hasPrepTag options show greyed, not hidden
  replacesSlot?: number
```

- [ ] **Step 2: Add `olgreth_prep` to PrepTag in prepTagCarriers.ts**

Open `src/data/godPaths/prepTagCarriers.ts`. Find line 7:

```ts
export type PrepTag = 'studied' | 'attended_seance' | 'opium_pact' | 'recited'
```

Change to:

```ts
export type PrepTag = 'studied' | 'attended_seance' | 'opium_pact' | 'recited' | 'olgreth_prep'
```

Then find `PREP_TAG_LABELS` (the `Record<PrepTag, string>` object) and add the new entry:

```ts
export const PREP_TAG_LABELS: Record<PrepTag, string> = {
  studied:          'Studied',
  attended_seance:  'Attended Seance',
  opium_pact:       'Opium Pact',
  recited:          'Recited',
  olgreth_prep:     'Prior Arrangement',
}
```

(Preserve the existing entries exactly. Only add the `olgreth_prep` line.)

- [ ] **Step 3: Update isPrepTagMissing hidden logic in gameStore.ts**

Open `src/state/gameStore.ts`. Find line 197–198 (search for `isPrepTagMissing`):

```ts
const isPrepTagMissing = opt.condition?.type === 'hasPrepTag' && !conditionPasses
const hidden = (!available && (opt.hideWhenUnavailable ?? false)) || isPrepTagMissing
```

Change to:

```ts
const isPrepTagMissing = opt.condition?.type === 'hasPrepTag' && !conditionPasses && !opt.revealWhenLocked
const hidden = (!available && (opt.hideWhenUnavailable ?? false)) || isPrepTagMissing
```

This is the only change in gameStore.ts. One character addition (`&& !opt.revealWhenLocked`). Do not touch anything else.

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: all 323 tests pass. If any fail, the `isPrepTagMissing` change is wrong — recheck step 3.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/types/index.ts src/data/godPaths/prepTagCarriers.ts src/state/gameStore.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(types): revealWhenLocked CardOption flag; add olgreth_prep PrepTag"
```

---

## Task 2: tutorialReshuffle() — explicit post-reshuffle ordering

**Why this is second:** Independent of card data. Clean to test in isolation before the new cards exist in the registry.

**Files:**
- Modify: `src/engine/deck.ts`
- Modify: `src/engine/deck.test.ts`

**Interfaces:**
- Consumes: `DeckState` from `src/types/index.ts`, `Card` type
- Produces: `tutorialReshuffle(deck)` returns drawPile ordered as: pinned cards first, then unpinned sorted by `TUTORIAL_POST_RESHUFFLE_ORDER`, any unrecognised cards dropped

---

- [ ] **Step 1: Write failing tests for explicit ordering**

Open `src/engine/deck.test.ts`. Add a new describe block at the end of the file:

```ts
describe('tutorialReshuffle — explicit ordering', () => {
  const makeCard = (id: string, pinnedNextCycle?: true): Card => ({
    id,
    title: id,
    tier: 'tutorial',
    flavourText: '',
    options: [],
    ...(pinnedNextCycle ? { pinnedNextCycle } : {}),
  })

  it('places pinned card first regardless of insertion order', () => {
    const deck: DeckState = {
      ...emptyDeck(),
      nextCycleQueue: [
        makeCard('tutorial_threat_card'),
        makeCard('tutorial_reshuffle_card', true),
        makeCard('olgreth_2'),
      ],
    }
    const result = tutorialReshuffle(deck)
    expect(result.drawPile[0].id).toBe('tutorial_reshuffle_card')
  })

  it('orders unpinned cards by TUTORIAL_POST_RESHUFFLE_ORDER', () => {
    const deck: DeckState = {
      ...emptyDeck(),
      nextCycleQueue: [
        makeCard('tutorial_reshuffle_card', true),
        makeCard('tutorial_threat_card'),
        makeCard('tutorial_treat_card'),
        makeCard('tutorial_prep_react'),
        makeCard('olgreth_2'),
      ],
    }
    const result = tutorialReshuffle(deck)
    const ids = result.drawPile.map(c => c.id)
    expect(ids).toEqual([
      'tutorial_reshuffle_card',
      'tutorial_threat_card',
      'tutorial_prep_react',
      'tutorial_treat_card',
      'olgreth_2',
    ])
  })

  it('drops cards not in the order list', () => {
    const deck: DeckState = {
      ...emptyDeck(),
      nextCycleQueue: [
        makeCard('tutorial_reshuffle_card', true),
        makeCard('unknown_card'),
        makeCard('tutorial_threat_card'),
      ],
    }
    const result = tutorialReshuffle(deck)
    expect(result.drawPile.map(c => c.id)).toEqual([
      'tutorial_reshuffle_card',
      'tutorial_threat_card',
    ])
  })

  it('clears discardPile and nextCycleQueue', () => {
    const deck: DeckState = {
      ...emptyDeck(),
      discardPile: [makeCard('played_card')],
      nextCycleQueue: [makeCard('tutorial_reshuffle_card', true)],
    }
    const result = tutorialReshuffle(deck)
    expect(result.discardPile).toEqual([])
    expect(result.nextCycleQueue).toEqual([])
  })
})
```

Check what `emptyDeck()` is called in deck.test.ts — if the helper doesn't exist with that name, find what helper creates a minimal `DeckState` and use that instead. Also check that `tutorialReshuffle` is imported at the top of deck.test.ts — add it to the import if not present.

- [ ] **Step 2: Run tests — confirm new tests fail**

```bash
npx vitest run src/engine/deck.test.ts
```

Expected: the new ordering tests FAIL (current implementation uses insertion order, not explicit order). Existing tests still pass.

- [ ] **Step 3: Update tutorialReshuffle() in deck.ts**

Open `src/engine/deck.ts`. Find the `tutorialReshuffle` function (around line 360). Replace it entirely:

```ts
// Post-reshuffle draw order for the scripted tutorial run.
// Cards not in this list are silently dropped (unreachable in normal play).
const TUTORIAL_POST_RESHUFFLE_ORDER = [
  'tutorial_threat_card',
  'tutorial_prep_react',
  'tutorial_treat_card',
  'olgreth_2',
]

// ─── Tutorial reshuffle ───────────────────────────────────────────────────────
// Bypasses normal shuffle entirely. Pinned cards (pinnedNextCycle: true) surface
// first. Remaining cards are ordered by TUTORIAL_POST_RESHUFFLE_ORDER — any card
// not in the list is dropped. Discard pile cleared permanently.
export function tutorialReshuffle(deck: DeckState): DeckState {
  const pinned   = deck.nextCycleQueue.filter(c => c.pinnedNextCycle)
  const unpinned = deck.nextCycleQueue.filter(c => !c.pinnedNextCycle)
  const sorted   = TUTORIAL_POST_RESHUFFLE_ORDER
    .map(id => unpinned.find(c => c.id === id))
    .filter((c): c is Card => c !== undefined)
  return {
    ...deck,
    drawPile:       [...pinned, ...sorted],
    discardPile:    [],
    nextCycleQueue: [],
  }
}
```

The `TUTORIAL_POST_RESHUFFLE_ORDER` constant goes immediately above the JSDoc comment, inside the module scope (not inside the function).

- [ ] **Step 4: Run tests — confirm all pass**

```bash
npx vitest run
```

Expected: all 323 + 4 new = 327 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/engine/deck.ts src/engine/deck.test.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(engine): tutorialReshuffle enforces explicit post-reshuffle card order"
```

---

## Task 3: New tutorial cards + text updates + registry

**Files:**
- Modify: `src/data/cards/tutorial.ts`
- Modify: `src/data/index.ts`

**Interfaces:**
- Consumes: `PrepTag` (now includes `'olgreth_prep'`), `CardOption.revealWhenLocked` (from Task 1)
- Produces: `tutorial_prep_intro` (internal), `tutorial_prep_react` (exported), updated `tutorial_reshuffle_card`, updated `TUTORIAL_CARDS` (6 entries)

No automated tests for card data correctness — the tutorialReshuffle test in Task 2 already covers the engine side. Verify by inspection and manual play-through (Task 4).

---

- [ ] **Step 1: Add tutorial_prep_intro to tutorial.ts**

Open `src/data/cards/tutorial.ts`. Add the following card definition after `tutorial_threats_treats` and before the olgreth cards. This card is NOT exported (internal to the tutorial sequence):

```ts
const tutorial_prep_intro: Card = {
  id: 'tutorial_prep_intro',
  title: 'The Prior Arrangement',
  tier: 'tutorial',
  flavourText: 'Some options carry forward. Setting a commitment now may unlock a different option in a later card. The activity log at the bottom of the screen records when these are set.',
  options: [
    {
      label: 'Make the arrangement',
      flavourText: 'The arrangement is noted. The activity log has recorded it.',
      effects: [
        { type: 'resource', resource: 'influence', delta: 1 },
        { type: 'setPrepTag', tag: 'olgreth_prep' },
        { type: 'insertCard', cardId: 'tutorial_prep_react', position: 'nextCycle' },
      ],
    },
    {
      label: 'Leave it open',
      flavourText: 'Nothing was committed. The option remains open in the loosest possible sense.',
      effects: [
        { type: 'resource', resource: 'gold', delta: 1 },
        { type: 'insertCard', cardId: 'tutorial_prep_react', position: 'nextCycle' },
      ],
    },
  ],
}
```

- [ ] **Step 2: Add tutorial_prep_react to tutorial.ts**

Add the following exported card definition immediately after `tutorial_prep_intro`. It must be exported so it can be added to ALL_CARDS:

```ts
export const tutorial_prep_react: Card = {
  id: 'tutorial_prep_react',
  title: 'The Arrangement, Recalled',
  tier: 'tutorial',
  flavourText: 'The prior commitment surfaces. It was either made or it was not. The options below reflect this.',
  options: [
    {
      label: 'Complete it',
      flavourText: 'The arrangement held. Both parties benefited.',
      condition: { type: 'hasPrepTag', tag: 'olgreth_prep' },
      revealWhenLocked: true,
      effects: [
        { type: 'resource', resource: 'gold', delta: 1 },
        { type: 'resource', resource: 'followers', delta: 1 },
      ],
    },
    {
      label: 'Continue without it',
      flavourText: 'The arrangement was not made. This is fine. It is less fine than it could have been.',
      effects: [],
    },
  ],
}
```

Note: `hideWhenUnavailable` is intentionally absent on "Complete it". `revealWhenLocked: true` makes it show greyed (not hidden) when `olgreth_prep` is missing.

- [ ] **Step 3: Update tutorial_reshuffle_card**

Find `tutorial_reshuffle_card` in `tutorial.ts`. Replace its `title`, `flavourText`, and the option `label` + `flavourText`:

```ts
export const tutorial_reshuffle_card: Card = {
  id: 'tutorial_reshuffle_card',
  title: 'A New Week',
  tier: 'tutorial',
  pinnedNextCycle: true,
  flavourText: 'Week 1 is over. The deck has reshuffled. Each reshuffle marks a new week. The god path advances toward its conclusion. Costs mount as weeks pass. Cards inserted last week surface now.',
  options: [
    {
      label: 'Continue',
      flavourText: 'Week 2 begins.',
      effects: [],
    },
  ],
}
```

- [ ] **Step 4: Update TUTORIAL_CARDS array**

Find the `TUTORIAL_CARDS` export at the bottom of `tutorial.ts`. Add `tutorial_prep_intro` at position 4 (after `tutorial_threats_treats`, before `olgreth_1`):

```ts
export const TUTORIAL_CARDS: Card[] = [
  tutorial_interface,           // 0 — UI, options, greyed-out demo
  tutorial_basic_resources,     // 1 — primary resources, jewel tap
  tutorial_dread_relics,        // 2 — dread, relics; inserts doom@top + reshuffle_card@nextCycle
  tutorial_threats_treats,      // 3 — inserts threat@nextCycle + treat@nextCycle
  tutorial_prep_intro,          // 4 (NEW) — prep tags, activity log; inserts prep_react@nextCycle
  olgreth_1,                    // 5 — god path 1; queues olgreth_2@nextCycle; draw pile empties -> RESHUFFLE
]
// Post-reshuffle nextCycleQueue (insertion order):
//   tutorial_reshuffle_card  — pinnedNextCycle: true (from dread_relics)
//   tutorial_threat_card     — from threats_treats effect 0
//   tutorial_treat_card      — from threats_treats effect 1
//   tutorial_prep_react      — from tutorial_prep_intro (both option branches)
//   olgreth_2                — from olgreth_1 advanceGodPath
//
// tutorialReshuffle() enforces draw order:
//   tutorial_reshuffle_card, tutorial_threat_card, tutorial_prep_react,
//   tutorial_treat_card, olgreth_2
```

Also update the comment block at the top of tutorial.ts that documents the resource trace. Find the existing trace comment and extend it:

```ts
//   4  tutorial_prep_intro      -> opt A: Inf+1, setPrepTag olgreth_prep, prep_react->nextCycle  (1/3/4/5/1)
//                                   opt B: Gold+1, prep_react->nextCycle                         (2/3/3/5/1)
//   5  olgreth_1                -> advanceGodPath (queues olgreth_2 -> nextCycleQueue)
```

(Insert after the line documenting `tutorial_threats_treats`. Adjust the existing olgreth_1 line number from `5` to match.)

- [ ] **Step 5: Add tutorial_prep_react to ALL_CARDS in index.ts**

Open `src/data/index.ts`. Find where tutorial cards are imported and added to `ALL_CARDS`. Add `tutorial_prep_react` to the import and to the array.

Find the existing tutorial import line (it imports `tutorial_doom_card`, `tutorial_reshuffle_card`, `tutorial_threat_card`, `tutorial_treat_card`, `olgreth_1`, `olgreth_2`). Add `tutorial_prep_react`:

```ts
import {
  TUTORIAL_CARDS,
  tutorial_doom_card,
  tutorial_reshuffle_card,
  tutorial_threat_card,
  tutorial_treat_card,
  tutorial_prep_react,   // ADD THIS
  olgreth_1,
  olgreth_2,
} from './cards/tutorial'
```

Then find the ALL_CARDS array and add `tutorial_prep_react` alongside the other tutorial cards.

- [ ] **Step 6: Run tests**

```bash
npx vitest run
```

Expected: all tests pass. If TypeScript errors appear related to `olgreth_prep` not matching `PrepTag`, Task 1 was not completed first — check the PrepTag union in `prepTagCarriers.ts`.

- [ ] **Step 7: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/tutorial.ts src/data/index.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(tutorial): add prep tag teaching cards + update reshuffle card text"
```

---

## Task 4: Flavour text audit — all tutorial cards

**Why a separate task:** Text correctness is a different concern from code correctness. Separating it gives a clean commit that is purely copy changes and makes it easy to revert independently.

**Files:**
- Modify: `src/data/cards/tutorial.ts` (text only — no structural changes)

**What to check on every card:**
1. No em-dashes (`—`). Replace with a period or restructure the sentence.
2. No exclamation marks.
3. No second-person "you" in flavour text (option responses can use implied context but not direct address).
4. Every mechanical claim in card text must match current engine behaviour (see notes per card below).
5. Option flavour text must be dry, flat, deadpan — not warm or explanatory.

---

- [ ] **Step 1: Audit tutorial_interface**

Current flavour text:
> The bar at the top tracks your five resources. The boxes at the bottom of the screen are your options. Tap one to resolve the card. Options shown in full are available. Greyed-out options have unmet requirements. If every option is unavailable at once, you succumb.

Check:
- "your" appears twice — acceptable in tutorial register (tutorial is exempt from strict voice rules, but reduce if natural)
- "you succumb" — accurate. Correct.
- No em-dashes. No exclamation marks.
- Option label "I need more first" — keep.
- Option flavour "This is what a greyed-out option looks like. You do not have enough to take it." — acceptable.

No changes required unless you find an em-dash on close inspection.

- [ ] **Step 2: Audit tutorial_basic_resources**

Current flavour text:
> Gold, Followers, Influence. The three regular resources to keep your cult alive. Keep each above zero and below ten, stray past either and the deck reacts. The jewel in each card header marks the type. Tap it for the tier.

Check:
- "your cult" — acceptable in tutorial register.
- "stray past either and the deck reacts" — accurate (overflow/deficit insert cards). Correct.
- "Tap it for the tier" — verify this is still correct UI behaviour. If jewel tap no longer shows tier info, update to match.
- No em-dashes. No exclamation marks.

Option flavour: "The funds arrived. They have been redirected. Two new members presented themselves shortly after." — good. No issues.

- [ ] **Step 3: Audit tutorial_dread_relics**

Current flavour text:
> Dread accumulates. Keep it below ten. At ten, a doom card enters the top of the draw pile, drawn next. The Relics counter sits beside the others. Tap it to spend one: pick any resource, move it two in either direction.

Check:
- "At ten, a doom card enters the top of the draw pile, drawn next" — accurate. Correct.
- "Tap it to spend one: pick any resource, move it two in either direction" — verify this is still the current relic UI behaviour. If it has changed, update.
- Colon after "spend one" — acceptable punctuation (not an em-dash).
- No em-dashes. No exclamation marks.

Option flavour: "Dread exceeded ten during the examination. The artefact itself remains inconclusive." — good.

- [ ] **Step 4: Audit tutorial_doom_card**

Current flavour text:
> This entered the deck when Dread reached ten. It is single-use. If Dread reaches ten again, a worse one follows. Some members found the first one instructive.

Check:
- "single-use" — hyphen is fine (not an em-dash).
- Doom escalation claim accurate? Yes — hitting dread 10 again inserts a tier-2 doom card.
- No em-dashes. No exclamation marks.

Option flavour: "The costs were expected. Gold and Followers declined. Dread subsided. File it." — good.

- [ ] **Step 5: Audit tutorial_threats_treats**

Current flavour text:
> Some choices insert cards into the draw pile. Threat cards cost resources on arrival. Most are removed once resolved. Treat cards provide benefit. The rose jewel marks them. Both will surface after the next reshuffle.

Check:
- "Both will surface after the next reshuffle" — accurate? In the tutorial, both go to nextCycleQueue which means they surface in week 2. Correct.
- "The rose jewel marks them" — does the rose jewel mark treat cards in the current UI? Verify.
- No em-dashes. No exclamation marks.

Option flavour: "A threat card and a treat card have been added to the deck. The rose jewel identifies the one worth looking forward to." — acceptable. Check length but tutorial is exempt from cap.

- [ ] **Step 6: Audit tutorial_prep_intro (new card)**

Flavour text:
> Some options carry forward. Setting a commitment now may unlock a different option in a later card. The activity log at the bottom of the screen records when these are set.

Check:
- No em-dashes. No exclamation marks. No second-person.
- "The activity log at the bottom of the screen" — verify this is the correct location/description of the activity log in the current UI.
- Option A flavour: "The arrangement is noted. The activity log has recorded it." — good.
- Option B flavour: "Nothing was committed. The option remains open in the loosest possible sense." — good.

- [ ] **Step 7: Audit tutorial_reshuffle_card (updated)**

New flavour text:
> Week 1 is over. The deck has reshuffled. Each reshuffle marks a new week. The god path advances toward its conclusion. Costs mount as weeks pass. Cards inserted last week surface now.

Check:
- No em-dashes. No exclamation marks. No second-person.
- "The god path advances toward its conclusion" — in the tutorial, olgreth_2 is queued after olgreth_1. Accurate.
- "Costs mount as weeks pass" — accurate (dread pressure kicks in from week 4 in real runs). Acceptable framing for tutorial.
- Option flavour: "Week 2 begins." — good.

- [ ] **Step 8: Audit tutorial_threat_card**

Current flavour text:
> The blood red jewel. Threat cards can surface anywhere in the deck. Most are removed once resolved. Influence is the cost of resolution here.

Check:
- "The blood red jewel" — verify threat cards still use a blood-red jewel in the current UI.
- "Threat cards can surface anywhere in the deck" — accurate.
- "Most are removed once resolved" — accurate (threat tier, permDiscard on resolution).
- No em-dashes. No exclamation marks.

Option flavour: "Influence declined by one. The matter is closed." — good.

- [ ] **Step 9: Audit tutorial_prep_react (new card)**

Flavour text:
> The prior commitment surfaces. It was either made or it was not. The options below reflect this.

Check:
- No em-dashes. No exclamation marks. No second-person.
- "The options below reflect this" — mild UI reference, acceptable in tutorial register.
- Option C ("Complete it") flavour: "The arrangement held. Both parties benefited." — good.
- Option D ("Continue without it") flavour: "The arrangement was not made. This is fine. It is less fine than it could have been." — good. Dry, accurate.

- [ ] **Step 10: Audit tutorial_treat_card**

Current flavour text:
> The rose jewel. This treat was inserted earlier. Not all insertions are a problem.

Check:
- "The rose jewel" — verify treat cards still use a rose jewel.
- "This treat was inserted earlier" — accurate, it was inserted by tutorial_threats_treats.
- No em-dashes. No exclamation marks.

Option flavour: "Two new members joined without incident. The paperwork is minimal." — good.

- [ ] **Step 11: Audit olgreth_1**

Current flavour text:
> A name. Buried in the margin of a page you didn't mean to open. This is the god path. A chain of ritual cards seeded into the run. There are two. Completing both ends the run.

Check:
- "a page you didn't mean to open" — second-person "you". Acceptable in tutorial register given the framing.
- "There are two. Completing both ends the run." — accurate for the tutorial (2-card olgreth chain). Also honest about real runs (god paths are also chains, longer).
- No em-dashes. No exclamation marks.

Option flavour: "Something shifted. The second ritual card is in the deck. It was already waiting." — good.

- [ ] **Step 12: Audit olgreth_2**

Current flavour text:
> The second card in the chain. The last one. What began in the margin ends here.

Check:
- Clean. Accurate.
- No em-dashes. No exclamation marks.

Option flavour: "The run ends here." — good.

- [ ] **Step 13: Apply any fixes found during audit and run tests**

Make any text corrections identified in steps 1–12. Then:

```bash
npx vitest run
```

Expected: all tests still pass (text changes cannot break tests).

- [ ] **Step 14: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/data/cards/tutorial.ts
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "fix(tutorial): flavour text audit pass — all cards verified"
```

---

## Verification Checklist (manual)

After all four tasks are committed, verify the tutorial plays correctly:

- [ ] Start a tutorial run from the main menu
- [ ] **Week 1:** Play through cards 1–5 normally
- [ ] **tutorial_prep_intro:** Two options visible. Take "Make the arrangement" — confirm activity log shows a prep tag entry
- [ ] **olgreth_1:** Play. Confirm draw pile empties and reshuffle triggers
- [ ] **Week 2:** First card is "A New Week" (tutorial_reshuffle_card)
- [ ] **tutorial_threat_card:** Draws second. Play it.
- [ ] **tutorial_prep_react:** Draws third. "Complete it" option is available (not greyed). "Continue without it" also available. Take "Complete it." Confirm G+1, F+1 apply.
- [ ] **tutorial_treat_card:** Draws fourth. Play it.
- [ ] **olgreth_2:** Draws fifth. Play it. Run ends with victory.
- [ ] Repeat with "Leave it open" on tutorial_prep_intro. On tutorial_prep_react, "Complete it" is now **greyed but visible** (not hidden). "Continue without it" is available. Take it. Run completes normally.

---

## Self-Review Notes

**Spec coverage check:**
- Two new cards (tutorial_prep_intro, tutorial_prep_react) — Task 3 ✓
- Updated tutorial_reshuffle_card text — Task 3 ✓
- tutorialReshuffle() explicit ordering — Task 2 ✓
- Activity log pointed to — tutorial_prep_intro flavour text, Task 3 ✓
- revealWhenLocked flag for greyed-not-hidden prep option — Task 1 ✓
- olgreth_prep added to PrepTag union — Task 1 ✓
- tutorial_prep_react exported + added to ALL_CARDS — Task 3 ✓
- Flavour text pass — Task 4 ✓
- Resource safety (no resource floors breached on either path) — verified in spec, Task 3 comment ✓

**No placeholders.** All steps contain exact code or exact audit criteria.

**Type consistency:**
- `olgreth_prep` used as PrepTag in Task 1 and as `tag: 'olgreth_prep'` in Task 3. Consistent.
- `revealWhenLocked` added to type in Task 1, used in Task 3. Consistent.
- `tutorial_prep_react` exported in Task 3, imported in Task 3 (index.ts). Consistent.
- `TUTORIAL_POST_RESHUFFLE_ORDER` defined and used only in deck.ts. Consistent.
