# P14-4 Content Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the content delegated by the s86 prep-tag engine — 11 stage-scaled chain-card prep-bonus options across 3 gods, plus 3 threat TODO cleanups, 4 defer-carrier extensions, and 3 WeekBanner prep-nudge strings.

**Architecture:** Pure card-data edits in `src/data/godPaths/*.ts`, `src/data/cards/threats.ts`, `src/data/cards/core.ts`, `src/data/cards/rare.ts`, plus a 3-line edit in `src/components/GameScreen.tsx` for the WeekBanner copy. No engine changes. The s86 effect types (`hasPrepTag` condition, `consumePrepTag` effect, `setPrepTag` effect, `deferGodPathCard` effect) are already in place.

**Tech Stack:** TypeScript 5.5, React 18, vitest 2.x — all existing devDeps. No new dependencies.

## Global Constraints

- **Spec reference:** `Code/project-abyssial/docs/superpowers/specs/2026-06-22-p14-4-content-pass-design.md` (commit `79b5baa`).
- **Engine reference:** `Code/project-abyssial/docs/superpowers/specs/2026-06-17-god-path-prep-tags-design.md` — the prep-tag system shipped in s86.
- **Tag↔stage pairing (uniform across gods):** `studied↔2`, `attended_seance↔3`, `opium_pact↔4`, `recited↔5`. Locked in s86 spec.
- **Stage-scaled effect template** (after `consumePrepTag` and before `advanceGodPath`):
  - Stage 2: `+1 dread`
  - Stage 3: `+1 dread, +1 inf`
  - Stage 4: `+1 dread, +1 fol`
  - Stage 5: `+2 dread, +1 relic`
- **Every prep-bonus option:** `condition: { type: 'hasPrepTag', tag: '<tag>' }`. Effects begin with `{ type: 'consumePrepTag', tag: '<tag>' }` and end with `{ type: 'advanceGodPath' }`.
- **Each chain card ≤ 3 options.** Trims required: `yha_nthlei_4` removes "Request more time"; `shub_niggurath_5` removes "Leave an offering at the boundary".
- **Branch:** `claude/build-abyssial-game-IuJp8` (current trunk; LOCAL ONLY — never `git push`).
- **Test baseline:** 66 vitest pass, typecheck clean. After this plan: ~72 (66 + 4 integration + 2 static guards).
- **No flavour-text tests.** Behaviour gates only.

---

### Task 1: Y'ha-nthlei chain bonus options + trim

**Files:**
- Modify: `src/data/godPaths/yha_nthlei.ts` — polish stage-2 seed flavour; add stage-3 bonus; trim "Request more time" on stage-4 + add stage-4 bonus; add stage-5 bonus.

**Interfaces:**
- Consumes: existing `Card` type, existing `Effect` discriminators (`hasPrepTag`, `consumePrepTag`, `advanceGodPath`, `resource`).
- Produces: 3 new options + 1 polished flavour string. No new exports.

- [ ] **Step 1: Polish the stage-2 seed flavour on `yha_nthlei_2` "Speak the deep tongue"**

Open `src/data/godPaths/yha_nthlei.ts`. Locate the existing seed option (around line 88-98). Replace the option block (preserving its position, third option in the array):

```ts
      {
        label: 'Speak the deep tongue',
        flavourText: 'The book spoke first. You answer second. The conversation feels older than either of you.',
        condition: { type: 'hasPrepTag', tag: 'studied' },
        effects: [
          { type: 'consumePrepTag', tag: 'studied' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

The current seed already has the correct effect shape; this step removes the `// TODO(thematic): flavour pass for the prep-bonus option below` comment and finalises the flavour string.

- [ ] **Step 2: Add stage-3 bonus on `yha_nthlei_3` "The Innsmouth Look"**

Open `src/data/godPaths/yha_nthlei.ts`. Locate `yha_nthlei_3` (around line 106). Inside its `options:` array, after the existing "Approach him" option, add:

```ts
      {
        label: 'Recognise the sign',
        flavourText: 'At the gathering they made a shape with their hands. You make it back. They nod, and one of them adjusts his place at the table.',
        condition: { type: 'hasPrepTag', tag: 'attended_seance' },
        effects: [
          { type: 'consumePrepTag', tag: 'attended_seance' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

The card now has 2 options total.

- [ ] **Step 3: Trim "Request more time" + add stage-4 bonus on `yha_nthlei_4` "The Oath of Dagon"**

Open `src/data/godPaths/yha_nthlei.ts`. Locate `yha_nthlei_4` (around line 129). In its `options:` array, **remove** the entire "Request more time" option block (currently the 2nd of 3 options — around lines 148-156). Then **add** in its place (so the array reads Accept → new prep-bonus → Refuse):

```ts
      {
        label: 'Sign the dream-bound version',
        flavourText: 'The version of the document you read in the den had different terms. Better terms. You sign that one. Someone from the den comes with you afterwards.',
        condition: { type: 'hasPrepTag', tag: 'opium_pact' },
        effects: [
          { type: 'consumePrepTag', tag: 'opium_pact' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

Card still has 3 options total: Accept the terms / Sign the dream-bound version / Refuse.

- [ ] **Step 4: Add stage-5 bonus on `yha_nthlei_5` "Devil's Reef at Low Tide"**

Open `src/data/godPaths/yha_nthlei.ts`. Locate `yha_nthlei_5` (around line 175). Inside its `options:` array, after the existing "Do not go" option, add:

```ts
      {
        label: 'Speak the closing rite',
        flavourText: 'The rite has a final phrase. You held it back until now. The sea returns something to the doorstep before morning.',
        condition: { type: 'hasPrepTag', tag: 'recited' },
        effects: [
          { type: 'consumePrepTag', tag: 'recited' },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

Card now has 3 options total.

- [ ] **Step 5: Typecheck + full test suite**

From `Code/project-abyssial/`:

```
npx tsc --noEmit
npx vitest run
```

Expected: typecheck clean. 66/66 tests still pass (no test added in this task; new options have `hasPrepTag` condition so they don't surface in existing tests where the tag isn't set).

- [ ] **Step 6: Commit**

```
git add src/data/godPaths/yha_nthlei.ts
git commit -m "data(P14-4): Y'ha-nthlei chain bonus options + Oath trim"
```

Pre-commit hook will regenerate `knowledge/cards/INDEX.md` and `knowledge/architecture-inventory.md`. Non-blocking; ignore warnings.

---

### Task 2: Nyarlathotep chain bonus options

**Files:**
- Modify: `src/data/godPaths/nyarlathotep.ts` — add 4 bonus options (one per stage 2-5). No trims (all cards at ≤ 2 options today).

**Interfaces:**
- Consumes: existing `Card` / `Effect` types.
- Produces: 4 new options. No new exports.

- [ ] **Step 1: Add stage-2 bonus on `nyarlathotep_2` "The Exhibit"**

Open `src/data/godPaths/nyarlathotep.ts`. Locate `nyarlathotep_2` (around line 70). Inside its `options:` array, after the existing options, add:

```ts
      {
        label: 'Recognise the pattern',
        flavourText: 'You have read this shape before. The recognition does not comfort you, but it does steady you.',
        condition: { type: 'hasPrepTag', tag: 'studied' },
        effects: [
          { type: 'consumePrepTag', tag: 'studied' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

Card now has 3 options.

- [ ] **Step 2: Add stage-3 bonus on `nyarlathotep_3` "The Black Man at the Crossroads"**

Open `src/data/godPaths/nyarlathotep.ts`. Locate `nyarlathotep_3` (around line 111). Inside its `options:` array, after the existing options, add:

```ts
      {
        label: 'Greet him as expected',
        flavourText: 'You sat through his gathering once. You know the form of greeting. He answers in kind, which is not in itself a comfort.',
        condition: { type: 'hasPrepTag', tag: 'attended_seance' },
        effects: [
          { type: 'consumePrepTag', tag: 'attended_seance' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

Card now has 3 options.

- [ ] **Step 3: Add stage-4 bonus on `nyarlathotep_4` "The Book is Opened"**

Open `src/data/godPaths/nyarlathotep.ts`. Locate `nyarlathotep_4` (around line 146). Inside its `options:` array, after the existing options, add:

```ts
      {
        label: 'Dream the bargain',
        flavourText: 'The dreamers at the den had reached him first. They told you the terms. You renegotiate from there. A dreamer follows you home.',
        condition: { type: 'hasPrepTag', tag: 'opium_pact' },
        effects: [
          { type: 'consumePrepTag', tag: 'opium_pact' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

Card now has 3 options.

- [ ] **Step 4: Add stage-5 bonus on `nyarlathotep_5` "The Signal Broadens"**

Open `src/data/godPaths/nyarlathotep.ts`. Locate `nyarlathotep_5` (around line 185). Inside its `options:` array, after the existing options, add:

```ts
      {
        label: 'Speak his name back',
        flavourText: 'You return the name he gave you. He smiles. Something falls from his sleeve as he turns away. You pick it up.',
        condition: { type: 'hasPrepTag', tag: 'recited' },
        effects: [
          { type: 'consumePrepTag', tag: 'recited' },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

Card now has 3 options.

- [ ] **Step 5: Typecheck + full test suite**

```
npx tsc --noEmit
npx vitest run
```

Expected: typecheck clean; 66/66 still pass.

- [ ] **Step 6: Commit**

```
git add src/data/godPaths/nyarlathotep.ts
git commit -m "data(P14-4): Nyarlathotep chain bonus options"
```

---

### Task 3: Shub-Niggurath chain bonus options + trim

**Files:**
- Modify: `src/data/godPaths/shub_niggurath.ts` — add stages 2, 3, 4 bonuses; trim "Leave an offering at the boundary" on stage 5 + add stage-5 bonus.

**Interfaces:**
- Consumes: existing `Card` / `Effect` types.
- Produces: 4 new options. No new exports.

- [ ] **Step 1: Add stage-2 bonus on `shub_niggurath_2`**

Open `src/data/godPaths/shub_niggurath.ts`. Locate `shub_niggurath_2` (around line 37). Inside its `options:` array, after the existing options, add:

```ts
      {
        label: 'Recognise the root-tongue',
        flavourText: 'The shape in the bark is a letter. You have read this letter before.',
        condition: { type: 'hasPrepTag', tag: 'studied' },
        effects: [
          { type: 'consumePrepTag', tag: 'studied' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

Card now has 3 options.

- [ ] **Step 2: Add stage-3 bonus on `shub_niggurath_3`**

Open `src/data/godPaths/shub_niggurath.ts`. Locate `shub_niggurath_3` (around line 83). Inside its `options:` array, after the existing options, add:

```ts
      {
        label: 'Sing the offering',
        flavourText: 'You sang it at the gathering. You sing it again here. The grove sings back. One of yours answers without meaning to.',
        condition: { type: 'hasPrepTag', tag: 'attended_seance' },
        effects: [
          { type: 'consumePrepTag', tag: 'attended_seance' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

Card now has 3 options.

- [ ] **Step 3: Add stage-4 bonus on `shub_niggurath_4`**

Open `src/data/godPaths/shub_niggurath.ts`. Locate `shub_niggurath_4` (around line 123). Inside its `options:` array, after the existing options, add:

```ts
      {
        label: 'Dream into the soil',
        flavourText: 'The dreamers had been listening to the roots. They taught you the cadence. The forest answers. One of them follows you home with soil still on her hands.',
        condition: { type: 'hasPrepTag', tag: 'opium_pact' },
        effects: [
          { type: 'consumePrepTag', tag: 'opium_pact' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

Card now has 3 options.

- [ ] **Step 4: Trim "Leave an offering at the boundary" + add stage-5 bonus on `shub_niggurath_5`**

Open `src/data/godPaths/shub_niggurath.ts`. Locate `shub_niggurath_5` (around line 164). In its `options:` array, **remove** the entire "Leave an offering at the boundary" option block (currently the 2nd of 3 options — around lines 189-205). Then **add** in its place:

```ts
      {
        label: 'Recite the rite of unbecoming',
        flavourText: 'You spoke it back to the treeline. The forest accepts the offering and returns something that is not quite a stone.',
        condition: { type: 'hasPrepTag', tag: 'recited' },
        effects: [
          { type: 'consumePrepTag', tag: 'recited' },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
```

Card still has 3 options total: Follow it in / Recite the rite of unbecoming / Wait at the treeline.

- [ ] **Step 5: Typecheck + full test suite**

```
npx tsc --noEmit
npx vitest run
```

Expected: typecheck clean; 66/66 still pass.

- [ ] **Step 6: Commit**

```
git add src/data/godPaths/shub_niggurath.ts
git commit -m "data(P14-4): Shub-Niggurath chain bonus options + offering trim"
```

---

### Task 4: Threat TODO cleanups, defer-carrier extensions, WeekBanner copy

**Files:**
- Modify: `src/data/cards/threats.ts` — clean 3 TODO comments; expand `grove_awaits` "Go yourself" effects.
- Modify: `src/data/cards/core.ts` — add 2 options to `the_wedding_rite`.
- Modify: `src/data/cards/rare.ts` — add 2 options to `the_diocese_sends_word`.
- Modify: `src/components/GameScreen.tsx` — replace 3 PREP_NUDGE strings.

**Interfaces:**
- Consumes: existing `Card` / `Effect` types; existing `PREP_NUDGE` Record.
- Produces: no new exports.

- [ ] **Step 1: Clean `the_thing_in_the_tank` TODO**

Open `src/data/cards/threats.ts`. Locate line 1025 (the `// TODO(thematic): replacement effect for s86 content pass (was surfaceGodPathCard)` comment inside `the_thing_in_the_tank` "Listen to it"). Delete that single comment line. The effects array remains: `+3 dread, +1 inf, insertCard(the_thing_in_the_tank, 5-8)`.

- [ ] **Step 2: Clean `grove_awaits` "Send a scouting party" TODO**

In `src/data/cards/threats.ts`, locate the `// TODO(thematic): replacement effect for s86 content pass (was surfaceGodPathCard)` and `// Note: this option has other effects, so no "filler" TODO needed` comments inside `grove_awaits` "Send a scouting party" (around line 1108-1109). Delete both comment lines. The effects array remains: `-1 fol, +1 dread`.

- [ ] **Step 3: Expand `grove_awaits` "Go yourself" effects**

In `src/data/cards/threats.ts`, locate `grove_awaits` "Go yourself" (around line 1113-1120). Replace the entire option's `effects:` array with:

```ts
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 4, maxPos: 8 },
        ],
```

This deletes the `// TODO(thematic): replacement effect for s86 content pass (was surfaceGodPathCard)` comment that lived inside the array, and adds the influence + changed_follower-insert effects.

- [ ] **Step 4: Add 2 options to `the_wedding_rite`**

Open `src/data/cards/core.ts`. Locate `the_wedding_rite` (around line 641). Inside its `options:` array, after the existing "Perform the rite" option, add (also delete the existing TODO comment block at the end of the array):

```ts
      {
        label: 'Send a deputy',
        flavourText: 'You sign the certificate but send a deputy to read the vows. They get through it. One of yours catches an inscrutable look from the bride during the ring exchange.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'gold', delta: 1 },
        ],
      },
      {
        label: 'Use the pulpit',
        flavourText: 'You preach the way you would have anyway, in front of the couple\'s families. One stays after, asking when the next gathering is.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
```

Note the apostrophe in "couple's" needs to be escaped (`couple\'s`) because the flavourText is single-quoted.

Card now has 3 options.

- [ ] **Step 5: Add 2 options to `the_diocese_sends_word`**

Open `src/data/cards/rare.ts`. Locate `the_diocese_sends_word` (around line 250). Inside its `options:` array, after the existing "Compose a careful reply" option, add (also delete the existing TODO comment line at the end of the array):

```ts
      {
        label: 'Refuse to engage',
        flavourText: 'You return the letter unopened. The bishop\'s people will note this. They will also stop writing.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
      {
        label: 'Welcome the inquiry openly',
        flavourText: 'You invite the bishop to visit. He sends a clerk instead. The clerk asks for membership records. You hand him the version you keep for this.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 5, maxPos: 9 },
        ],
      },
```

Card now has 3 options.

- [ ] **Step 6: Replace PREP_NUDGE strings**

Open `src/components/GameScreen.tsx`. Locate the `PREP_NUDGE` constant (around line 45-49). Replace the four-entry object literal with:

```ts
  const PREP_NUDGE: Record<GodPath, string> = {
    yha_nthlei:     'The tide is turning. Study what washes ashore before the next reading.',
    nyarlathotep:   'He approaches in dreams. Sit at his next gathering before he sits at yours.',
    shub_niggurath: 'The grove is hungry. Bargain or recite — but do it now, while the door is open.',
    olgreth:        '',
  }
```

If the existing declaration uses a different type annotation (e.g. inline rather than `Record<GodPath, string>`), keep the existing annotation form — only swap the four string values.

- [ ] **Step 7: Typecheck + full test suite**

```
npx tsc --noEmit
npx vitest run
```

Expected: typecheck clean; 66/66 still pass.

- [ ] **Step 8: Commit**

```
git add src/data/cards/threats.ts src/data/cards/core.ts src/data/cards/rare.ts src/components/GameScreen.tsx
git commit -m "data(P14-4): threat TODOs + defer carrier extensions + WeekBanner copy"
```

---

### Task 5: Tests — sample integration + static guards

**Files:**
- Modify: `src/state/gameStore.test.ts` — append a new describe block for P14-4 content coverage.

**Interfaces:**
- Consumes: Tasks 1–3 (chain cards must have their new bonus options); Task 4 (no test impact, but should be in to keep the commit history coherent).
- Produces: 6 new test cases (4 integration samples + 2 static-pool guards).

- [ ] **Step 1: Append the new describe block**

Open `src/state/gameStore.test.ts`. At the bottom of the file, after the last existing describe block, append:

```ts
// ─── P14-4 content pass coverage ────────────────────────────────────────
describe('P14-4 prep-bonus options', () => {
  const RESET: Partial<{
    resources: Resources
    prepTags: string[]
    godPathProgress: number
    runConfig: { godPath: 'yha_nthlei' | 'nyarlathotep' | 'shub_niggurath' | 'olgreth' }
  }> = {}

  beforeEach(() => {
    useGameStore.setState({
      resources: { gold: 5, followers: 5, influence: 5, dread: 0, relics: 0, theChanged: 0 },
      prepTags: [],
      godPathProgress: 4, // active mid-chain
      runConfig: { godPath: 'yha_nthlei' } as any,
    })
  })

  it('yha_nthlei_3 "Recognise the sign" hidden without attended_seance tag', () => {
    const store = useGameStore.getState()
    const card = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_3')!
    const opts = store.getVisibleOptions(card)
    const bonus = opts.find(o => o.option.label === 'Recognise the sign')!
    expect(bonus.available).toBe(false)
  })

  it('yha_nthlei_3 "Recognise the sign" available with attended_seance tag', () => {
    useGameStore.setState({ prepTags: ['attended_seance'] })
    const store = useGameStore.getState()
    const card = GOD_PATH_CHAINS.yha_nthlei.find(c => c.id === 'yha_nthlei_3')!
    const opts = store.getVisibleOptions(card)
    const bonus = opts.find(o => o.option.label === 'Recognise the sign')!
    expect(bonus.available).toBe(true)
  })

  it('nyarlathotep_4 "Dream the bargain" available with opium_pact tag', () => {
    useGameStore.setState({ runConfig: { godPath: 'nyarlathotep' } as any, prepTags: ['opium_pact'] })
    const store = useGameStore.getState()
    const card = GOD_PATH_CHAINS.nyarlathotep.find(c => c.id === 'nyarlathotep_4')!
    const opts = store.getVisibleOptions(card)
    const bonus = opts.find(o => o.option.label === 'Dream the bargain')!
    expect(bonus.available).toBe(true)
  })

  it('shub_niggurath_5 "Recite the rite of unbecoming" available with recited tag', () => {
    useGameStore.setState({ runConfig: { godPath: 'shub_niggurath' } as any, prepTags: ['recited'] })
    const store = useGameStore.getState()
    const card = GOD_PATH_CHAINS.shub_niggurath.find(c => c.id === 'shub_niggurath_5')!
    const opts = store.getVisibleOptions(card)
    const bonus = opts.find(o => o.option.label === 'Recite the rite of unbecoming')!
    expect(bonus.available).toBe(true)
  })

  it('each god has exactly one hasPrepTag option on chain stages 2-5', () => {
    for (const god of ['yha_nthlei', 'nyarlathotep', 'shub_niggurath'] as const) {
      for (const stage of [2, 3, 4, 5]) {
        const card = GOD_PATH_CHAINS[god].find(c => c.chainStage === stage)!
        const prepOpts = card.options.filter(o => o.condition?.type === 'hasPrepTag')
        expect(prepOpts).toHaveLength(1)
      }
    }
  })

  it('each prep tag has at least one chain-card carrier across the three gods', () => {
    const expected = new Set(['studied', 'attended_seance', 'opium_pact', 'recited'])
    const seen = new Set<string>()
    for (const god of ['yha_nthlei', 'nyarlathotep', 'shub_niggurath'] as const) {
      for (const card of GOD_PATH_CHAINS[god]) {
        for (const opt of card.options) {
          if (opt.condition?.type === 'hasPrepTag') {
            seen.add(opt.condition.tag)
          }
        }
      }
    }
    for (const tag of expected) {
      expect(seen).toContain(tag)
    }
  })
})
```

If the test file already imports `beforeEach` from `'vitest'` and `GOD_PATH_CHAINS` from `'../data'`, no extra imports needed. If `beforeEach` is missing from the imports, add it. The first integration test already runs in the file (the affordability tests use `useGameStore.setState`), so the store-mutation pattern is established.

- [ ] **Step 2: Run the new tests in isolation**

```
npx vitest run src/state/gameStore.test.ts -t "P14-4 prep-bonus"
```

Expected: 6 PASS.

- [ ] **Step 3: Run the full suite + typecheck**

```
npx vitest run
npx tsc --noEmit
```

Expected: 72/72 pass (66 baseline + 6 new). Typecheck clean.

- [ ] **Step 4: Commit**

```
git add src/state/gameStore.test.ts
git commit -m "test(P14-4): prep-bonus sample integration + static guards"
```

---

## Self-Review

**1. Spec coverage:**
- Spec § "Stage-scaled bonus pattern" → Global Constraints + Tasks 1, 2, 3 (every option in each task uses the stage-scaled template verbatim).
- Spec § "Chain-card bonus options" table → 12 entries, each implemented:
  - `yha_nthlei_2` (polish) → Task 1 Step 1 ✓
  - `yha_nthlei_3, 4, 5` → Task 1 Steps 2, 3, 4 ✓
  - `nyarlathotep_2, 3, 4, 5` → Task 2 Steps 1-4 ✓
  - `shub_niggurath_2, 3, 4, 5` → Task 3 Steps 1-4 ✓
- Spec § "Trims" → Task 1 Step 3 (yha_4 "Request more time") + Task 3 Step 4 (shub_5 "Leave an offering") ✓
- Spec § "Threat TODO cleanups" → Task 4 Steps 1, 2, 3 ✓
- Spec § "Defer-carrier extensions" → Task 4 Steps 4, 5 ✓
- Spec § "WeekBanner prep-nudge copy" → Task 4 Step 6 ✓
- Spec § "Testing" → Task 5 (4 sample integration cases + 2 static guards) ✓

**2. Placeholder scan:**
- No "TBD" / "implement later" / "similar to Task N". Every code block is the actual content to paste.
- One "if the existing annotation differs, keep the existing form" note in Task 4 Step 6 — that's not a placeholder, it's a guardrail against a known divergence between the spec's idealised code and the existing source.

**3. Type consistency:**
- All `hasPrepTag` conditions use `{ type: 'hasPrepTag', tag: '<tag>' }`. ✓
- All `consumePrepTag` effects use `{ type: 'consumePrepTag', tag: '<tag>' }`. ✓
- All `advanceGodPath` effects use `{ type: 'advanceGodPath' }` with no payload. ✓
- All resource deltas use `{ type: 'resource', resource: '<key>', delta: <number> }`. ✓
- Test imports (`GOD_PATH_CHAINS`, `useGameStore`) match the existing test file's pattern. ✓
- Test references `Resources` type — already imported at the top of `gameStore.test.ts` after Task 2 of the affordability plan hoisted it.

All checks pass.
