# P20-A Whisper Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the whisper pool from 8 to 23 cards, switch injection from append to slot-replace, add a ✦ visual marker, recolour the prep-tag diamond, and emit an activity log entry when whispers seed.

**Architecture:** `replacesSlot?: number` is added to `CardOption`; at draw time `drawNextCard` reads this field and swaps the target slot instead of appending. All 23 `WHISPER_OPTIONS` entries are authored with the correct slot index. Visual changes are confined to `OptionsColumn.tsx` and `EffectTags.tsx`. The activity log change adds one branch to the `ActivityEntry` union and one emit site in the `seedWhispers` effect case.

**Tech Stack:** TypeScript, React, Zustand (`gameStore.ts`), Vitest (`gameStore.test.ts`)

## Global Constraints

- `replacesSlot` is **0-indexed** — matches the position in `card.options[]`
- Generic fallback whisper (`GENERIC_WHISPER_OPTION`, no `replacesSlot`) continues to use the append path
- Whisper icon: **✦** (U+2726), colour **`#9b59b6`** (purple)
- Prep-tag diamond recolour: **`#5dade2`** (light blue) — applies everywhere `❖` renders
- Pool size: 23 IDs; 5 active per run (unchanged)
- Flavour text for new whisper entries is a placeholder (`'The voice reaches.'`) — thematic pass is a separate task
- Run tests with: `npx vitest run src/state/gameStore.test.ts` from the repo root (`C:/Project Abyssial/Code/project-abyssial`)

---

## File Map

| File | Change |
|---|---|
| `src/types/index.ts` | Add `replacesSlot?: number` to `CardOption`; add `kind: 'whisper'` to `ActivityEntry` union |
| `src/engine/whispers.ts` | Replace `WHISPER_POOL_IDS` (8 → 23 IDs); replace `WHISPER_OPTIONS` (8 → 23 entries with `replacesSlot`) |
| `src/state/gameStore.ts` | Replace append with replace/append logic in `drawNextCard`; emit `kind:'whisper'` entry in `seedWhispers` case |
| `src/state/gameStore.test.ts` | Add 3 new tests for replace-slot injection |
| `src/components/game/OptionsColumn.tsx` | Prefix `✦` before `option.label` when `isWhisper`; recolour prepBonus `❖` to light blue |
| `src/components/game/EffectTags.tsx` | Recolour `setPrepTag` `❖` chip from purple to light blue |

---

## Task 1: Type Extensions

**Files:**
- Modify: `src/types/index.ts` (lines 84–96 for `CardOption`; lines 247–252 for `ActivityEntry`)

**Interfaces:**
- Produces: `CardOption.replacesSlot?: number` — consumed by Tasks 2 and 3
- Produces: `ActivityEntry | { kind: 'whisper'; cardIds: CardId[] }` — consumed by Task 4

- [ ] **Step 1: Add `replacesSlot` to `CardOption`**

  In `src/types/index.ts`, after the `previewTag?: string` line (currently last field of `CardOption`):

  ```typescript
  export type CardOption = {
    label: string
    flavourText: string
    effects: Effect[]
    insertsCards?: CardId[]
    removesCards?: CardId[]
    condition?: Condition
    hideWhenUnavailable?: boolean
    isWhisper?: boolean
    dreadPressureScaling?: boolean
    succumbOption?: boolean
    previewTag?: string
    replacesSlot?: number   // 0-indexed slot to swap out at draw time; present only on slot-targeted whisper options
  }
  ```

- [ ] **Step 2: Add `kind: 'whisper'` to `ActivityEntry`**

  In `src/types/index.ts`, extend the `ActivityEntry` union (currently ends at line ~252):

  ```typescript
  export type ActivityEntry =
    | { kind: 'reshuffle';    count: number }
    | { kind: 'doomEscalate' }
    | { kind: 'insert';       card: CardSummary; source: ActivityInsertSource; flavour?: string; godPath?: GodPath }
    | { kind: 'purge';        card: CardSummary; source: ActivityPurgeSource }
    | { kind: 'randomOutcome'; flavour?: string; deltas: Array<{ resource: ResourceKey; delta: number }>; insertedCard?: CardSummary }
    | { kind: 'whisper';      cardIds: CardId[] }
  ```

- [ ] **Step 3: Verify compilation**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/types/index.ts
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(types): add replacesSlot to CardOption and whisper ActivityEntry branch"
  ```

---

## Task 2: Whisper Data Expansion

**Files:**
- Modify: `src/engine/whispers.ts` (full replacement of `WHISPER_POOL_IDS` and `WHISPER_OPTIONS`)

**Interfaces:**
- Consumes: `CardOption.replacesSlot?: number` from Task 1
- Produces: updated `WHISPER_OPTIONS` with `replacesSlot` on all 23 entries — consumed by Task 3

**Note on flavour text:** Entries marked `'[Thematic pass pending]'` at the option level are intentional placeholders. Each `randomOutcome` outcome's `flavourText` is also a placeholder. A separate thematic pass will replace these.

**Note on conditions:** The `the_inheritance` whisper preserves `condition: { type: 'resourceMin', resource: 'gold', min: 1 }` (costs −1 gold upfront). The `the_opium_den` whisper preserves `condition: { type: 'resourceMin', resource: 'followers', min: 2 }` (costs −2 followers). All other new whispers have no condition.

- [ ] **Step 1: Replace `WHISPER_POOL_IDS`**

  Replace the existing 8-entry array (lines 7–16 of `src/engine/whispers.ts`) with:

  ```typescript
  export const WHISPER_POOL_IDS: CardId[] = [
    // Commons (10)
    'congregation_meets',
    'the_donation',
    'the_inheritance',
    'the_newspaper',
    'word_spreads',
    'the_harbormaster',
    'the_left_item',
    'the_collection',
    'the_complaint',
    'the_delayed_shipment',
    // Core (13)
    'the_landlord_cometh',
    'follower_confesses_doubt',
    'the_old_book',
    'rival_stirs',
    'academic_society',
    'the_seance',
    'stranger_asks_questions',
    'the_harbour',
    'the_fire',
    'the_printing_press',
    'the_opium_den',
    'the_wedding_rite',
    'supplies_dwindle',
  ]
  ```

- [ ] **Step 2: Replace `WHISPER_OPTIONS` — Commons block (10 entries)**

  Replace the existing `WHISPER_OPTIONS` constant (lines 20–100) with the full 23-entry version below. Write the entire constant in one edit — do not attempt partial replacement.

  ```typescript
  export const WHISPER_OPTIONS: Record<CardId, CardOption> = {
    // ── Commons ──────────────────────────────────────────────────────────────

    congregation_meets: {
      label: '"Speak what they\'re already thinking."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'gold',      delta:  3 },
        { type: 'resource', resource: 'influence', delta: -1 },
        { type: 'resource', resource: 'dread',     delta:  2 },
      ],
      isWhisper: true,
      replacesSlot: 0,
    },

    the_donation: {
      label: '"You already know who sent it."',
      flavourText: 'You did. The money arrived anyway. No note this time.',
      effects: [
        { type: 'resource', resource: 'gold',  delta: 3 },
        { type: 'resource', resource: 'dread', delta: 2 },
        { type: 'insertCard', cardId: 'strings_attached', position: 'random', minPos: 4, maxPos: 8 },
      ],
      isWhisper: true,
      replacesSlot: 0,
    },

    the_inheritance: {
      label: '"The family was never going to win."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'gold', delta: -1 },
        { type: 'randomOutcome', outcomes: [
          { weight: 1, effects: [{ type: 'resource', resource: 'relics',    delta: -1 }], flavourText: 'The court found against you. What you lost was not gold.' },
          { weight: 1, effects: [{ type: 'resource', resource: 'followers', delta: -2 }], flavourText: 'Two left before the verdict was read.' },
          { weight: 1, effects: [{ type: 'resource', resource: 'gold',      delta: -2 }], flavourText: 'The case collapsed. The family was pleased.' },
          { weight: 1, effects: [{ type: 'resource', resource: 'gold',      delta:  3 }], flavourText: 'The settlement was unexpectedly generous.' },
          { weight: 1, effects: [{ type: 'resource', resource: 'influence', delta:  2 }], flavourText: 'The judge was a reader. He remembered your name.' },
          { weight: 1, effects: [{ type: 'resource', resource: 'relics',    delta:  1 }], flavourText: 'The estate contained something the family had not inventoried.' },
        ]},
      ],
      condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      isWhisper: true,
      replacesSlot: 0,
    },

    the_newspaper: {
      label: '"The wrong people are already reading it."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'influence', delta: 3 },
        { type: 'resource', resource: 'dread',     delta: 2 },
      ],
      isWhisper: true,
      replacesSlot: 1,
    },

    word_spreads: {
      label: '"It\'s further than you think."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'influence', delta: 2 },
        { type: 'resource', resource: 'dread',     delta: 3 },
        { type: 'resource', resource: 'followers', delta: 2 },
      ],
      isWhisper: true,
      replacesSlot: 0,
    },

    the_harbormaster: {
      label: '"She already knows the price."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'gold',      delta:  3 },
        { type: 'resource', resource: 'followers', delta: -1 },
        { type: 'resource', resource: 'dread',     delta:  2 },
      ],
      isWhisper: true,
      replacesSlot: 2,
    },

    the_left_item: {
      label: '"It was always going to be left."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'followers', delta: 2 },
        { type: 'resource', resource: 'dread',     delta: 3 },
      ],
      isWhisper: true,
      replacesSlot: 2,
    },

    the_collection: {
      label: '"They give what is asked of them."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'gold',      delta:  3 },
        { type: 'resource', resource: 'followers', delta: -2 },
        { type: 'resource', resource: 'dread',     delta:  1 },
      ],
      isWhisper: true,
      replacesSlot: 0,
    },

    the_complaint: {
      label: '"The silence is an answer."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'dread',     delta: 2 },
        { type: 'resource', resource: 'followers', delta: 2 },
      ],
      isWhisper: true,
      replacesSlot: 2,
    },

    the_delayed_shipment: {
      label: '"You already knew what was in it."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'influence', delta: 2 },
        { type: 'resource', resource: 'dread',     delta: 2 },
      ],
      isWhisper: true,
      replacesSlot: 2,
    },

    // ── Core ─────────────────────────────────────────────────────────────────

    the_landlord_cometh: {
      label: '"He won\'t ask twice."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'gold',      delta: -2 },
        { type: 'resource', resource: 'followers', delta:  1 },
        { type: 'resource', resource: 'dread',     delta:  2 },
      ],
      isWhisper: true,
      replacesSlot: 0,
    },

    follower_confesses_doubt: {
      label: '"Agree with them."',
      flavourText: 'The doubt was real. So was what replaced it.',
      effects: [
        { type: 'resource', resource: 'followers', delta: 2 },
        { type: 'resource', resource: 'dread',     delta: 2 },
      ],
      isWhisper: true,
      replacesSlot: 0,
    },

    the_old_book: {
      label: '"Read it in the voice it was written in."',
      flavourText: 'The language was wrong. The meaning was precise.',
      effects: [
        { type: 'resource', resource: 'dread',  delta: 5 },
        { type: 'resource', resource: 'relics', delta: 2 },
      ],
      isWhisper: true,
      replacesSlot: 0,
    },

    rival_stirs: {
      label: '"They were already listening."',
      flavourText: 'The rival cult was never a rival. They were an audience waiting for the right speaker.',
      effects: [
        { type: 'resource', resource: 'followers', delta: 3 },
        { type: 'resource', resource: 'dread',     delta: 2 },
        { type: 'removeCard', cardId: 'rival_escalation' },
        { type: 'removeCard', cardId: 'their_survivors' },
      ],
      isWhisper: true,
      replacesSlot: 2,
    },

    academic_society: {
      label: '"Tell them what you\'ve actually found."',
      flavourText: 'Several left. More arrived the following week. The ones who arrived had already heard.',
      effects: [
        { type: 'resource', resource: 'influence', delta: 3 },
        { type: 'resource', resource: 'dread',     delta: 2 },
        { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 5, maxPos: 9 },
      ],
      isWhisper: true,
      replacesSlot: 1,
    },

    the_seance: {
      label: '"Let it have the room."',
      flavourText: 'It had already taken the room. You just made it official.',
      effects: [
        { type: 'surfaceChainCard' },
        { type: 'resource', resource: 'dread', delta: 2 },
      ],
      isWhisper: true,
      replacesSlot: 1,
    },

    stranger_asks_questions: {
      label: '"Show him the church."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'influence', delta: 2 },
        { type: 'resource', resource: 'dread',     delta: 2 },
      ],
      isWhisper: true,
      replacesSlot: 0,
    },

    the_harbour: {
      label: '"What they\'re pulling up isn\'t fish."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'gold',      delta: -2 },
        { type: 'resource', resource: 'followers', delta:  3 },
        { type: 'resource', resource: 'dread',     delta:  2 },
      ],
      isWhisper: true,
      replacesSlot: 0,
    },

    the_fire: {
      label: '"You know why this happened."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'influence', delta: -1 },
        { type: 'resource', resource: 'followers', delta:  1 },
        { type: 'resource', resource: 'dread',     delta:  2 },
      ],
      isWhisper: true,
      replacesSlot: 1,
    },

    the_printing_press: {
      label: '"Put what it asked you to put."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'gold',      delta: -2 },
        { type: 'resource', resource: 'influence', delta:  3 },
        { type: 'resource', resource: 'dread',     delta:  2 },
      ],
      isWhisper: true,
      replacesSlot: 0,
    },

    the_opium_den: {
      label: '"Let them go as far as they can."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'followers', delta: -2 },
        { type: 'resource', resource: 'dread',     delta:  3 },
        { type: 'setPrepTag', tag: 'opium_pact' },
        { type: 'resource', resource: 'relics',    delta:  1 },
      ],
      condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      isWhisper: true,
      replacesSlot: 0,
    },

    the_wedding_rite: {
      label: '"Say what it gave you to say."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'followers', delta: 2 },
        { type: 'resource', resource: 'dread',     delta: 3 },
      ],
      isWhisper: true,
      replacesSlot: 2,
    },

    supplies_dwindle: {
      label: '"Something already provided."',
      flavourText: '[Thematic pass pending]',
      effects: [
        { type: 'resource', resource: 'gold',      delta: -2 },
        { type: 'resource', resource: 'followers', delta:  2 },
        { type: 'resource', resource: 'dread',     delta:  1 },
      ],
      isWhisper: true,
      replacesSlot: 0,
    },
  }
  ```

- [ ] **Step 3: Verify compilation**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors. The `the_inheritance` entry uses `randomOutcome` which is already a known effect type; `setPrepTag` and `surfaceChainCard` are existing effect types — no new type work needed.

- [ ] **Step 4: Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/engine/whispers.ts
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(whispers): expand pool 8→23 and author all replacesSlot entries"
  ```

---

## Task 3: Engine — Draw-Time Replace Logic + Tests

**Files:**
- Modify: `src/state/gameStore.ts` (lines 644–648)
- Modify: `src/state/gameStore.test.ts` (add 3 tests)

**Interfaces:**
- Consumes: `CardOption.replacesSlot?: number` from Task 1; updated `WHISPER_OPTIONS` from Task 2
- Produces: corrected `currentCard.options` layout at draw time

- [ ] **Step 1: Write the three failing tests**

  In `src/state/gameStore.test.ts`, add a new `describe` block near the existing P20-A whisper deduplication tests:

  ```typescript
  describe('P20-A replace-slot draw injection', () => {
    beforeEach(() => {
      const s = useGameStore.getState()
      s.setRunConfig({ godPath: 'nyarlathotep', runLength: 'standard' })
      s.setBlessingSelection([])
      s.startRun()
    })

    it('replacesSlot: 0 — whisper occupies slot 0, option count unchanged', () => {
      const card = COMMON_CARDS.find(c => c.id === 'congregation_meets')!
      useGameStore.setState(state => ({
        deck: { ...state.deck, drawPile: [card, ...state.deck.drawPile] },
        activeWhispers: ['congregation_meets'],
      }))
      useGameStore.getState().drawNextCard()
      const current = useGameStore.getState().currentCard!
      // Whisper replaces slot 0 — total length stays the same
      expect(current.options.length).toBe(card.options.length)
      expect(current.options[0].isWhisper).toBe(true)
      expect(current.options[0].replacesSlot).toBe(0)
      // Slot 1 onwards are original options
      expect(current.options[1]).toEqual(card.options[1])
    })

    it('replacesSlot: 2 — whisper occupies slot 2, slots 0 and 1 unchanged', () => {
      const card = COMMON_CARDS.find(c => c.id === 'the_harbormaster')!
      useGameStore.setState(state => ({
        deck: { ...state.deck, drawPile: [card, ...state.deck.drawPile] },
        activeWhispers: ['the_harbormaster'],
      }))
      useGameStore.getState().drawNextCard()
      const current = useGameStore.getState().currentCard!
      expect(current.options.length).toBe(card.options.length)
      expect(current.options[2].isWhisper).toBe(true)
      expect(current.options[2].replacesSlot).toBe(2)
      expect(current.options[0]).toEqual(card.options[0])
      expect(current.options[1]).toEqual(card.options[1])
    })

    it('generic whisper (no replacesSlot) appends to end', () => {
      // 'the_census_agent' is excluded from WHISPER_OPTIONS so getWhisperOption
      // falls back to GENERIC_WHISPER_OPTION which has no replacesSlot
      const card = COMMON_CARDS.find(c => c.id === 'the_census_agent')!
      const baseLength = card.options.length
      useGameStore.setState(state => ({
        deck: { ...state.deck, drawPile: [card, ...state.deck.drawPile] },
        activeWhispers: ['the_census_agent'],
      }))
      useGameStore.getState().drawNextCard()
      const current = useGameStore.getState().currentCard!
      // Append path: length grows by 1
      expect(current.options.length).toBe(baseLength + 1)
      expect(current.options[baseLength].isWhisper).toBe(true)
      expect(current.options[baseLength].replacesSlot).toBeUndefined()
    })
  })
  ```

  **Import note:** `COMMON_CARDS` is already imported in `gameStore.test.ts` (used by existing tests). If `the_census_agent` is not in `COMMON_CARDS`, check `CORE_CARDS` — adjust the import accordingly.

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npx vitest run src/state/gameStore.test.ts --reporter=verbose 2>&1 | grep -A3 "replace-slot"
  ```

  Expected: all 3 new tests FAIL — `congregation_meets` draw will show `options.length` as `card.options.length + 1` (current append behaviour).

- [ ] **Step 3: Implement the replace logic in `gameStore.ts`**

  Locate lines 644–648 in `src/state/gameStore.ts`:
  ```typescript
  // current (lines 644-648):
  const whisperOption = getWhisperOption(card.id, state.activeWhispers)
  let currentCard = whisperOption
    ? { ...card, options: [...card.options, whisperOption] }
    : card
  ```

  Replace with:
  ```typescript
  const whisperOption = getWhisperOption(card.id, state.activeWhispers)
  let currentCard = (() => {
    if (!whisperOption) return card
    if (whisperOption.replacesSlot !== undefined) {
      const newOptions = [...card.options]
      newOptions[whisperOption.replacesSlot] = whisperOption
      return { ...card, options: newOptions }
    }
    // Fallback: append (generic whisper / Whispered Counsel blessing)
    return { ...card, options: [...card.options, whisperOption] }
  })()
  ```

- [ ] **Step 4: Run tests to confirm all 3 pass**

  ```bash
  npx vitest run src/state/gameStore.test.ts --reporter=verbose 2>&1 | grep -A3 "replace-slot"
  ```

  Expected: all 3 PASS. Also run the full suite to check no regressions:

  ```bash
  npx vitest run src/state/gameStore.test.ts 2>&1 | tail -5
  ```

  Expected: all tests pass (count will be higher than before this task).

- [ ] **Step 5: Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/state/gameStore.ts src/state/gameStore.test.ts
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(engine): replace-slot whisper injection with append fallback"
  ```

---

## Task 4: Activity Log — `kind: 'whisper'` Emission

**Files:**
- Modify: `src/state/gameStore.ts` (~lines 788–792 and ~lines 1054–1056 and ~lines 1174–1186)

**Interfaces:**
- Consumes: `ActivityEntry | { kind: 'whisper'; cardIds: CardId[] }` from Task 1
- No new tests — integration-level; the `✦` icon on the drawn card is the in-play signal per spec

- [ ] **Step 1: Declare accumulator before the effects loop**

  In `src/state/gameStore.ts`, find the comment `// Apply effects in order` (around line 791) and the `for` loop that follows it. Add one line immediately before the loop:

  ```typescript
  let seedWhisperTargets: CardId[] = []

  // Apply effects in order
  for (let effectIdx = 0; effectIdx < effectiveEffects.length; effectIdx++) {
  ```

- [ ] **Step 2: Capture new targets in the `seedWhispers` case**

  Locate the `case 'seedWhispers':` block (around line 1048). After the existing `activeWhispers = [...]` assignment, add one line:

  ```typescript
  case 'seedWhispers': {
    const { newTargets, cardsToInsert } = applyWhisperSeed(
      effect.count,
      activeWhispers,
      deck.drawPile
    )
    if (newTargets.length > 0) {
      activeWhispers = [...activeWhispers, ...newTargets]
      seedWhisperTargets = newTargets   // ← add this line
    }
    // ... rest of insertion logic unchanged ...
    break
  }
  ```

- [ ] **Step 3: Include whisper entry in `batchEntries`**

  Locate the `batchEntries` array construction (around line 1174):

  ```typescript
  // current:
  const batchEntries: ActivityEntry[] = [
    ...(randomOutcomeEntry ? [randomOutcomeEntry] : []),
    ...deckChanges.inserted
      .filter(ins => ins.source !== 'random')
      .map((ins): ActivityEntry => ({
        kind: 'insert', card: ins.card, source: ins.source,
        ...(ins.flavour ? { flavour: ins.flavour } : {}),
        ...(ins.godPath ? { godPath: ins.godPath } : {}),
      })),
    ...deckChanges.removed.map((rem): ActivityEntry => ({
      kind: 'purge', card: rem.card, source: rem.source,
    })),
  ]
  ```

  Replace with:

  ```typescript
  const batchEntries: ActivityEntry[] = [
    ...(randomOutcomeEntry ? [randomOutcomeEntry] : []),
    ...(seedWhisperTargets.length > 0
      ? [{ kind: 'whisper' as const, cardIds: seedWhisperTargets }]
      : []),
    ...deckChanges.inserted
      .filter(ins => ins.source !== 'random')
      .map((ins): ActivityEntry => ({
        kind: 'insert', card: ins.card, source: ins.source,
        ...(ins.flavour ? { flavour: ins.flavour } : {}),
        ...(ins.godPath ? { godPath: ins.godPath } : {}),
      })),
    ...deckChanges.removed.map((rem): ActivityEntry => ({
      kind: 'purge', card: rem.card, source: rem.source,
    })),
  ]
  ```

- [ ] **Step 4: Check compilation and tests**

  ```bash
  npx tsc --noEmit && npx vitest run src/state/gameStore.test.ts 2>&1 | tail -5
  ```

  Expected: no type errors, all tests pass.

  **Note on UI rendering:** The `kind: 'whisper'` entry will currently render as nothing (the activity log renderer likely has no branch for it yet). The activity log renderer is a separate UI component — wire it up only if the spec calls for text in this session. The spec text is: *"The voice reaches: congregation meets, the old book."* If wiring now, locate the activity log renderer and add a branch like:

  ```tsx
  } else if (entry.kind === 'whisper') {
    const names = entry.cardIds.map(id => id.replace(/_/g, ' ')).join(', ')
    return <span>The voice reaches: {names}.</span>
  }
  ```

  Otherwise leave this as a follow-up — the entry will be silently skipped.

- [ ] **Step 5: Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/state/gameStore.ts
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(store): emit kind:whisper activity entry on seedWhispers effect"
  ```

---

## Task 5: Visual — ✦ Icon and Prep-Tag Recolour

**Files:**
- Modify: `src/components/game/OptionsColumn.tsx` (lines ~139–146)
- Modify: `src/components/game/EffectTags.tsx` (lines ~168–176)

**Interfaces:**
- No new tests — visual; confirm with manual browser check

- [ ] **Step 1: Add ✦ prefix in `OptionsColumn.tsx`**

  Locate the label `<div>` inside `renderOptionRow` (around line 133–146). It currently renders:
  ```tsx
  {isPrepBonus && (
    <span style={{
      color: '#9b7bd4',
      textShadow: '0 0 6px rgba(155,123,212,0.5)',
      marginRight: '0.3rem',
    }}>❖</span>
  )}
  {option.label}
  ```

  Replace with:
  ```tsx
  {option.isWhisper && (
    <span style={{
      color: '#9b59b6',
      marginRight: '0.25rem',
      fontStyle: 'normal',  // override the italic applied to the outer div
    }}>✦</span>
  )}
  {isPrepBonus && (
    <span style={{
      color: '#5dade2',
      textShadow: '0 0 6px rgba(93,173,226,0.5)',
      marginRight: '0.3rem',
    }}>❖</span>
  )}
  {option.label}
  ```

  Note two changes in one edit: the ✦ prefix is added AND the prepBonus `❖` colour is changed from `#9b7bd4` (purple) to `#5dade2` (light blue), with matching textShadow.

- [ ] **Step 2: Recolour the `setPrepTag` chip in `EffectTags.tsx`**

  Locate the `setPrepTag` case rendering (around line 160–178). It currently has:
  ```tsx
  <span style={{
    fontSize: '0.8rem', color: '#9b7bd4',
    background: 'rgba(0,0,0,0.55)',
    border: '1px solid rgba(155,123,212,0.4)',
    padding: '0.1rem 0.35rem', borderRadius: '2px',
    textShadow: '0 0 6px rgba(155,123,212,0.5)',
    display: 'inline-flex', alignItems: 'center', lineHeight: 1,
  }}>
    ❖
  </span>
  ```

  Replace with:
  ```tsx
  <span style={{
    fontSize: '0.8rem', color: '#5dade2',
    background: 'rgba(0,0,0,0.55)',
    border: '1px solid rgba(93,173,226,0.4)',
    padding: '0.1rem 0.35rem', borderRadius: '2px',
    textShadow: '0 0 6px rgba(93,173,226,0.5)',
    display: 'inline-flex', alignItems: 'center', lineHeight: 1,
  }}>
    ❖
  </span>
  ```

- [ ] **Step 3: Verify compilation**

  ```bash
  npx tsc --noEmit && npx vitest run src/state/gameStore.test.ts 2>&1 | tail -3
  ```

  Expected: no errors, all tests still pass.

- [ ] **Step 4: Manual visual check**

  Start the dev server (`npm run dev`) and draw a card that is whispered (seed Nyarlathotep run, draw `congregation_meets`). Verify:
  - `✦` appears in purple (`#9b59b6`) before the label text
  - The label text is italic and purple-tinted (existing styling, unchanged)
  - Any option with `condition: hasPrepTag` shows `❖` in light blue (`#5dade2`)
  - The `setPrepTag` chip in effect tags is light blue
  - No layout shift from replaced-slot position

- [ ] **Step 5: Commit**

  ```bash
  git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/game/OptionsColumn.tsx src/components/game/EffectTags.tsx
  git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(visual): add whisper star icon and recolour prep-tag diamond to light blue"
  ```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| §1 Pool Expansion (8→23) | Task 2 `WHISPER_POOL_IDS` |
| §2a `replacesSlot` type field | Task 1 |
| §2b Draw-time replace/append logic | Task 3 |
| §2c Discard stripping | Already landed in `2c367ee` — no change needed |
| §2d `WHISPER_POOL_IDS` expansion | Task 2 |
| §3a ✦ purple icon | Task 5 Step 1 |
| §3b Prep-tag `◆` light blue recolour | Task 5 Steps 1 + 2 |
| §3c No layout changes | Implicit — replace-slot preserves position |
| §4 Activity log `kind:'whisper'` | Tasks 1 (type) + 4 (emit) |
| §5 All 23 whisper variants | Task 2 |
| §7 Tests: replacesSlot=0, replacesSlot=2, append fallback | Task 3 |
| §7 Strip on discard (existing test) | Already covered — no new test |

All spec sections covered. ✓
