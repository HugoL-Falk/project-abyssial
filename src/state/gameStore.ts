import { create } from 'zustand'
import type {
  GameState,
  GamePhase,
  GodPath,
  RunConfig,
  Resources,
  Card,
  CardId,
  CardRunState,
  DeckState,
  BlessingId,
  FailureReason,
  ResourceKey,
  Effect,
  CardTier,
  CardSummary,
  DeckChanges,
  ActivityEntry,
} from '../types'
import {
  STARTING_RESOURCES,
  applyDelta,
  affordabilityShortfall,
} from '../engine/resources'
import {
  drawCard,
  discardCard,
  insertCard,
  removeCardFromDeck,
  reshuffle,
  tutorialReshuffle,
  applyPassivesForReshuffle,
  getUnravellingTier,
  buildInitialDeck,
} from '../engine/deck'
import { advanceGodPathChain, checkCondition, weightedCoreDraw } from '../engine/godPath'
import { PREP_TAG_LABELS, PREP_TAG_CARRIERS, type PrepTag } from '../data/godPaths/prepTagCarriers'
import { newlyClosedPaths } from '../data/closedPaths'
import { loadUnlockedBlessings, saveUnlockedBlessings, unlockBlessingsForGod, saveWonLastRun, saveWonLastRunOnce, loadWonLastRunOnce, saveTutorialComplete, loadTutorialComplete } from '../engine/blessings'
import { saveRun, loadSaveData, clearSave } from '../engine/persistence'
import { buildStartingResources } from '../engine/runBuilder'
import {
  CORE_CARDS,
  COMMON_CARDS,
  RARE_CARDS,
  DARK_YOUNG_GUARDIAN,
  GOD_PATH_CHAINS,
  ALL_BLESSINGS,
  MUTATION_MAP,
  TUTORIAL_CARDS,
  getUnravellingCard,
  getCardById,
} from '../data'
import { olgreth_2 } from '../data/cards/tutorial'
import { shuffleArray } from '../engine/deck'
import { applyWhisperSeed, getWhisperOption, WHISPER_POOL_COMMONS, WHISPER_POOL_CORE } from '../engine/whispers'
import { expandEffectsWithCapture } from '../engine/effects'
import { applyPooledOptions } from '../engine/pooledOptions'
import {
  captureCardDrawn,
  captureOptionPicked,
  captureOptionSkipped,
  captureRunEnded,
  type RunEndedProps,
} from '../lib/telemetry'

// S4: prep carriers are excluded from removeRandomThreat targeting so the
// prep route survives 'Have him followed' / similar effects.
const PREP_CARRIER_IDS: ReadonlySet<CardId> = new Set(
  Object.values(PREP_TAG_CARRIERS).flat().map(c => c.cardId)
)

// ─── Initial State ─────────────────────────────────────────────────────────────

const EMPTY_DECK: DeckState = { drawPile: [], discardPile: [], permDiscardPile: [], chainReserve: [], nextCycleQueue: [] }

function makeInitialState(): GameState {
  return {
    phase: 'menu',
    resources: { ...STARTING_RESOURCES },
    deck: EMPTY_DECK,
    currentCard: null,
    runConfig: null,
    godPathProgress: 0,
    reshuffleCount: 0,
    unravellingTier: 1,
    pendingUnravelling: false,
    turnCount: 0,
    failureReason: null,
    pendingGameOver: null,
    blessings: {
      unlocked: loadUnlockedBlessings(),
      selected: [],
    },
    cardRunState: {},
    partialVictoryGod: null,
    activeWhispers: [],
    deepTradeUsed: false,
    patientForestUsesRemaining: 0,
    patientForestPenaltyActive: false,
    whisperCounselPenaltyActive: false,
    activityLog: [],
    activityBatchSealed: false,
    usedRareIds: new Set<string>(),
    usedCoreIds: new Set<string>(),
    prepTags: [],
    runStats: { prepLockedSkipped: 0, affordLockedSkipped: 0, closedPaths: [] },
  }
}

// ─── Store Actions Type ────────────────────────────────────────────────────────

type GameActions = {
  // Navigation
  goToPhase: (phase: GamePhase) => void
  resetGame: () => void

  // Pre-run setup
  setRunConfig: (config: RunConfig) => void
  setBlessingSelection: (ids: BlessingId[]) => void

  // Run start
  startRun: () => void
  restartRun: () => void
  startTutorial: () => void
  skipTutorial: () => void

  // Game loop
  drawNextCard: () => void
  resolveOption: (optionIndex: number) => void

  // Post-run
  unlockBlessingForGod: () => void
  loadRun: () => void

  // Blessing actions
  activateDeepTrade: () => void
  pushCard: () => void
  succumb: () => void
  spendRelic: (resource: ResourceKey, delta: 2 | -2) => void
  acceptDefeat: () => void
  reshuffleOnly: () => void

  // Activity log
  pushActivity: (...entries: ActivityEntry[]) => void
  sealActivityBatch: () => void

  // Utility
  getVisibleOptions: (card: Card) => ReturnType<typeof getVisibleOptions>
}

// ─── Helper: dread pressure ────────────────────────────────────────────────────

// P19-34: the +dread tax on dreadPressureScaling core options is held at 0 through
// week 4 (reshuffleCount <= 3) so it no longer converges with the doom card's
// tier 1->2 jump (which also lands at reshuffle 3). The tax activates at reshuffle 4
// (week 5), one week behind the doom escalation — staggering the mid-game spike
// while leaving the week-6 climax (doom 2->3 + tax 1->2) intact. Shared by the
// display path (getVisibleOptions) and the resolution path (resolveOption) so they
// can never drift.
export function computeDreadPressure(reshuffleCount: number, unravellingTier: number): number {
  return reshuffleCount <= 3 ? 0 : unravellingTier - 1
}

// ─── Helper: visible options ───────────────────────────────────────────────────

function getVisibleOptions(card: Card, state: GameState) {
  const dreadPressure = computeDreadPressure(state.reshuffleCount, state.unravellingTier)
  return card.options.map((opt, idx) => {
    const conditionPasses = opt.condition
      ? checkCondition(opt.condition, {
          resources: state.resources,
          deck: state.deck,
          godPathProgress: state.godPathProgress,
          runConfig: state.runConfig,
          cardRunState: state.cardRunState,
          prepTags: state.prepTags,
        })
      : true

    let effectiveEffects: Effect[] = [...opt.effects]

    if (opt.dreadPressureScaling && dreadPressure > 0) {
      effectiveEffects = effectiveEffects.map(e =>
        e.type === 'resource' && e.resource === 'dread' && e.delta > 0
          ? { ...e, delta: e.delta + dreadPressure }
          : e
      )
    }

    // P16-39: affordability gate. Empty shortfall map = affordable.
    const shortfall = affordabilityShortfall(effectiveEffects, state.resources)
    const affordable = Object.keys(shortfall).length === 0

    const available = conditionPasses && affordable
    const isPrepTagMissing = opt.condition?.type === 'hasPrepTag' && !conditionPasses && !opt.revealWhenLocked
    const hidden = (!available && (opt.hideWhenUnavailable ?? false)) || isPrepTagMissing

    let prepRequirement: { tag: string; label: string; carrierCardIds: string[] } | undefined
    if (opt.condition?.type === 'hasPrepTag' && !conditionPasses) {
      const tag = opt.condition.tag as PrepTag
      if (tag in PREP_TAG_LABELS) {
        prepRequirement = {
          tag,
          label: PREP_TAG_LABELS[tag],
          carrierCardIds: PREP_TAG_CARRIERS[tag].map(c => c.cardId),
        }
      }
    }

    let disabledReason: string | undefined
    if (!available && opt.condition?.type === 'not' &&
        opt.condition.condition.type === 'cardOptionChosen') {
      disabledReason = "Can't take twice"
    }

    // True when option condition is hasPrepTag AND the player currently has it
    // (i.e. the option is available via a prep tag). Used for blue outline.
    const isPrepGated = opt.condition?.type === 'hasPrepTag' && conditionPasses

    return {
      idx,
      option: opt,
      available,
      hidden,
      effectiveEffects,
      affordabilityShortfall: affordable ? undefined : shortfall,
      disabledReason,
      prepRequirement,
      isPrepGated,
    }
  })
}

// ─── Overflow helper ──────────────────────────────────────────────────────────
// Called after every resource delta. Inserts/removes overflow cards based on thresholds.

const OVERFLOW_CARD_ID: Partial<Record<string, string>> = {
  gold: 'the_ledger_is_noticed',
  followers: 'theyre_not_listening',
  influence: 'the_wrong_rooms',
}

const DEFICIT_CARD_ID: Partial<Record<string, string>> = {
  gold: 'deficit_gold',
  followers: 'deficit_followers',
  influence: 'deficit_influence',
}

// P17-10 (T2): excluded from removeRandomThreat targeting. Derived from the
// canonical overflow/deficit maps so any future entry joins the exclusion
// automatically.
const OVERFLOW_DEFICIT_IDS: ReadonlySet<string> = new Set(
  [...Object.values(OVERFLOW_CARD_ID), ...Object.values(DEFICIT_CARD_ID)]
    .filter((id): id is string => id !== undefined),
)

// P19-45: ceiling on the_weight_of_it copies in drawPile + discardPile
const MAX_WEIGHT_CARDS = 3

// P25-51: raised from 3 to 6 — allows organic accumulation across a full run
const MAX_CHANGED_FOLLOWER_COPIES = 6

// Single source of truth for "is this card a legal removeRandomThreat target"
// — mirrors the case 'removeRandomThreat' branch below exactly. Exported so UI
// preview code (the −⚠ chip's carousel in StructuralTag.tsx) can show players
// the same set the engine will actually draw from, instead of maintaining a
// second copy of these exclusion rules that can silently drift out of sync.
function isRemovableRandomThreat(card: Card): boolean {
  return card.tier === 'threat'
    && !card.permanent
    && !PREP_CARRIER_IDS.has(card.id)
    && !OVERFLOW_DEFICIT_IDS.has(card.id)
}

// P20-I (s114): distinct live threats currently eligible for removeRandomThreat,
// for the −⚠ carousel preview. Dedupes by id (a card can't meaningfully be
// "targeted twice" in one preview even if somehow present in two piles).
export function getLiveRandomThreatTargets(deck: DeckState): Card[] {
  const seen = new Set<CardId>()
  const out: Card[] = []
  for (const card of [...deck.drawPile, ...deck.discardPile, ...deck.nextCycleQueue]) {
    if (!isRemovableRandomThreat(card) || seen.has(card.id)) continue
    seen.add(card.id)
    out.push(card)
  }
  return out
}

function toSummary(card: { id: CardId; title: string; tier: CardTier }): CardSummary {
  return { id: card.id, title: card.title, tier: card.tier }
}

function appendInsertionDiff(before: DeckState, after: DeckState, changes: DeckChanges, source: import('../types').ActivityInsertSource): void {
  const beforeCounts = new Map<string, number>()
  for (const c of before.drawPile)       beforeCounts.set(c.id, (beforeCounts.get(c.id) ?? 0) + 1)
  for (const c of before.discardPile)    beforeCounts.set(c.id, (beforeCounts.get(c.id) ?? 0) + 1)
  for (const c of before.nextCycleQueue) beforeCounts.set(c.id, (beforeCounts.get(c.id) ?? 0) + 1)

  const afterCounts = new Map<string, number>()
  for (const c of after.drawPile)       afterCounts.set(c.id, (afterCounts.get(c.id) ?? 0) + 1)
  for (const c of after.discardPile)    afterCounts.set(c.id, (afterCounts.get(c.id) ?? 0) + 1)
  for (const c of after.nextCycleQueue) afterCounts.set(c.id, (afterCounts.get(c.id) ?? 0) + 1)

  // For each card in "after" with a higher count than "before", push that delta many entries.
  // We collect one representative card per id (looking it up in any pile of `after`).
  const seen = new Map<string, number>() // tracks how many we've already pushed for this id within this call
  for (const c of [...after.drawPile, ...after.discardPile, ...after.nextCycleQueue]) {
    const before = beforeCounts.get(c.id) ?? 0
    const total  = afterCounts.get(c.id) ?? 0
    const newOnes = total - before
    if (newOnes <= 0) continue
    const already = seen.get(c.id) ?? 0
    if (already >= newOnes) continue
    changes.inserted.push({ card: toSummary(c), source })
    seen.set(c.id, already + 1)
  }
}

function appendPurgeDiff(before: DeckState, after: DeckState, changes: DeckChanges): void {
  const beforeCounts = new Map<string, number>()
  for (const c of before.drawPile)       beforeCounts.set(c.id, (beforeCounts.get(c.id) ?? 0) + 1)
  for (const c of before.discardPile)    beforeCounts.set(c.id, (beforeCounts.get(c.id) ?? 0) + 1)
  for (const c of before.nextCycleQueue) beforeCounts.set(c.id, (beforeCounts.get(c.id) ?? 0) + 1)

  const afterCounts = new Map<string, number>()
  for (const c of after.drawPile)       afterCounts.set(c.id, (afterCounts.get(c.id) ?? 0) + 1)
  for (const c of after.discardPile)    afterCounts.set(c.id, (afterCounts.get(c.id) ?? 0) + 1)
  for (const c of after.nextCycleQueue) afterCounts.set(c.id, (afterCounts.get(c.id) ?? 0) + 1)

  const seen = new Map<string, number>()
  for (const c of [...before.drawPile, ...before.discardPile, ...before.nextCycleQueue]) {
    const beforeCount = beforeCounts.get(c.id) ?? 0
    const afterCount  = afterCounts.get(c.id) ?? 0
    const removed = beforeCount - afterCount
    if (removed <= 0) continue
    const already = seen.get(c.id) ?? 0
    if (already >= removed) continue
    changes.removed.push({ card: toSummary(c), source: 'recover' })
    seen.set(c.id, already + 1)
  }
}

function applyOverflowEffects(
  resources: Resources,
  deck: DeckState,
  key: ResourceKey,
  prevVal: number,
): DeckState {
  const newVal = resources[key]
  let d = deck

  // Dread: insert Weight of It for each new point above 10; remove all if drops to ≤10
  if (key === 'dread') {
    const prevAbove = Math.max(0, prevVal - 10)
    const newAbove  = Math.max(0, newVal  - 10)
    if (newAbove > prevAbove) {
      const wc = getCardById('the_weight_of_it')
      const pointsGained = newAbove - prevAbove
      // P19-45: count existing copies to enforce cap
      const existingCount = [...d.drawPile, ...d.discardPile]
        .filter(c => c.id === 'the_weight_of_it').length
      const copiesToInsert = Math.max(0, Math.min(pointsGained, MAX_WEIGHT_CARDS - existingCount))
      for (let i = 0; i < copiesToInsert; i++) {
        if (wc) d = insertCard(wc, d, 'random', 1, 5)
      }
    } else if (prevVal > 10 && newVal <= 10) {
      d = { ...d,
        drawPile:    d.drawPile.filter(c    => c.id !== 'the_weight_of_it'),
        discardPile: d.discardPile.filter(c => c.id !== 'the_weight_of_it'),
      }
    }
  }

  // Gold/Followers/Influence: insert overflow card when hitting 10; remove if drops below
  const oid = OVERFLOW_CARD_ID[key]
  if (oid) {
    if (prevVal < 10 && newVal >= 10) {
      const oc = getCardById(oid)
      if (oc) d = insertCard(oc, d, 'random', 1, 5)
    } else if (prevVal >= 10 && newVal < 10) {
      d = { ...d,
        drawPile:    d.drawPile.filter(c    => c.id !== oid),
        discardPile: d.discardPile.filter(c => c.id !== oid),
      }
    }
  }

  return d
}

// ─── Deficit helper ───────────────────────────────────────────────────────────
// Mirror of applyOverflowEffects at the floor (0). Gold/Followers/Influence only.
// Dread is excluded — it has its own floor mechanic (succumb via relics/endRun).

function applyDeficitEffects(
  resources: Resources,
  deck: DeckState,
  key: ResourceKey,
  prevVal: number,
): DeckState {
  const did = DEFICIT_CARD_ID[key]
  if (!did) return deck
  const newVal = resources[key]
  let d = deck
  if (prevVal > 0 && newVal <= 0) {
    const dc = getCardById(did)
    if (dc) d = insertCard(dc, d, 'random', 1, 5)
  } else if (prevVal <= 0 && newVal > 0) {
    d = { ...d,
      drawPile:    d.drawPile.filter(c    => c.id !== did),
      discardPile: d.discardPile.filter(c => c.id !== did),
    }
  }
  return d
}

// ─── Activity Log Helpers ──────────────────────────────────────────────────────
// Lazy replace-on-next-push: after a beat seals, the next pushActivity call
// discards the sealed batch and starts fresh. This gives us "1 idle beat = clear"
// for free: if a beat produces zero pushActivity calls, the seal-then-push from
// the NEXT beat will replace the (now-stale) batch.

function pushActivityHelper(
  log: ActivityEntry[],
  sealed: boolean,
  entries: ActivityEntry[],
): { activityLog: ActivityEntry[]; activityBatchSealed: false } {
  const base = sealed ? [] : log
  return {
    activityLog: [...base, ...entries],
    activityBatchSealed: false,
  }
}

// ─── Core Rotation ─────────────────────────────────────────────────────────────

// 4 core (uncommon) cards drawn from the full CORE_CARDS pool per run via weightedCoreDraw.

// ─── Telemetry helpers ─────────────────────────────────────────────────────────

function resSnapshot(r: { gold: number; followers: number; influence: number; dread: number; relics: number }) {
  return {
    res_gold:      r.gold,
    res_followers: r.followers,
    res_influence: r.influence,
    res_dread:     r.dread,
    res_relics:    r.relics,
  }
}

function buildRunEndedProps(
  state: GameState,
  outcome: RunEndedProps['outcome']
): RunEndedProps {
  const cardsDrawn = Object.values(state.cardRunState)
    .reduce((sum, v) => sum + v.drawCount, 0)
  return {
    outcome,
    god_path:          state.runConfig?.godPath ?? 'unknown',
    week_reached:      state.reshuffleCount + 1,
    cards_drawn:       cardsDrawn,
    god_path_progress: state.godPathProgress,
    ...resSnapshot(state.resources),
  }
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...makeInitialState(),

  goToPhase: (phase) => set({ phase }),

  resetGame: () => { clearSave(); set(makeInitialState()) },

  setRunConfig: (config) => set({ runConfig: config }),

  setBlessingSelection: (ids) =>
    set(s => ({ blessings: { ...s.blessings, selected: ids } })),

  startRun: () => {
    const state = get()
    if (!state.runConfig) return

    // Partial-win bonus was one-time — consume it now so next blessing select is back to 3 slots
    if (loadWonLastRunOnce()) saveWonLastRunOnce(false)

    const { runConfig, blessings } = state
    const rareCount = 2

    // Build deck — P22-P23-06: Include ALL commons in every deck, not weighted subset
    const commons = COMMON_CARDS

    // The Grove's Gift adds dark_young_guardian to the rare pool for this run
    const rarePool = blessings.selected.includes('the_groves_gift')
      ? [...RARE_CARDS, DARK_YOUNG_GUARDIAN]
      : RARE_CARDS
    const shuffledRares = shuffleArray(rarePool)
    const rares = shuffledRares.slice(0, rareCount)
    const startingUsedRareIds = new Set<string>(rares.map(c => c.id))
    const chainCards = GOD_PATH_CHAINS[runConfig.godPath]

    const chainCard1 = chainCards.find(c => c.chainStage === 1)!
    const chainReserve = chainCards.filter(c => c.chainStage !== 1)
    // The Drowned Mark injects innsmouth_look_marked; other injectCardId blessings handled here
    const injectedCards: Card[] = blessings.selected.flatMap(id => {
      const b = ALL_BLESSINGS.find(b => b.id === id)
      if (!b?.injectCardId) return []
      const card = getCardById(b.injectCardId)
      return card ? [card] : []
    })

    const coreRotation = weightedCoreDraw(runConfig.godPath, CORE_CARDS)
    const regularCards: Card[] = [...coreRotation, ...commons, ...rares, ...injectedCards]
    const baseDeck = buildInitialDeck(regularCards, chainReserve)
    const pile0 = baseDeck.drawPile
    const lo0   = Math.floor(pile0.length * 0.35)
    const hi0   = Math.floor(pile0.length * 0.75)
    const pos0  = lo0 + Math.floor(Math.random() * Math.max(hi0 - lo0 + 1, 1))
    const deck  = {
      ...baseDeck,
      drawPile: [...pile0.slice(0, pos0), chainCard1, ...pile0.slice(pos0)],
    }

    // Build resources (base + blessing bonuses)
    const resources = buildStartingResources(blessings.selected, ALL_BLESSINGS)

    // Whispered Counsel: seed 1 random core card + 1 random common card with whisper options at run start.
    // Restricted to WHISPER_POOL_IDS to guarantee a bespoke option (no GENERIC_WHISPER_OPTION fallback).
    let initialWhispers: CardId[] = []
    if (blessings.selected.includes('whispered_counsel')) {
      const pileIds = new Set(deck.drawPile.map(c => c.id))
      const pickOne = (pool: readonly string[]) => {
        const eligible = pool.filter(id => pileIds.has(id))
        if (eligible.length === 0) return null
        return shuffleArray([...eligible])[0]
      }
      const corePick   = pickOne(WHISPER_POOL_CORE)
      const commonPick = pickOne(WHISPER_POOL_COMMONS)
      // Dedup in case both pools happened to pick the same card (shouldn't overlap, but guard anyway)
      const picks = [...new Set([corePick, commonPick].filter(Boolean) as string[])]
      // Fallback: if one tier had nothing in the pile, fill from the other
      if (picks.length < 2) {
        const allEligible = [...WHISPER_POOL_CORE, ...WHISPER_POOL_COMMONS].filter(
          id => pileIds.has(id) && !picks.includes(id)
        )
        const fallback = pickOne(allEligible)
        if (fallback) picks.push(fallback)
      }
      initialWhispers = picks
    }

    set({
      phase: 'playing',
      resources,
      deck,
      currentCard: null,
      godPathProgress: 0,
      reshuffleCount: 0,
      unravellingTier: 1,
      pendingUnravelling: false,
      turnCount: 0,
      failureReason: null,
      pendingGameOver: null,
      cardRunState: {},
      partialVictoryGod: null,
      activeWhispers: initialWhispers,
      deepTradeUsed: false,
      patientForestUsesRemaining: blessings.selected.includes('the_patient_forest') ? 2 : 0,
      patientForestPenaltyActive: false,
      whisperCounselPenaltyActive: false,
      activityLog: [],
      activityBatchSealed: false,
      usedRareIds: startingUsedRareIds,
      usedCoreIds: new Set<string>(coreRotation.map(c => c.id)),
      prepTags: [],
    })
  },

  restartRun: () => {
    const { runConfig, blessings } = get()
    if (!runConfig) return
    clearSave()
    set(makeInitialState())
    // Restore the same config + blessings the player was running
    set({ runConfig, blessings: { ...blessings } })
    get().startRun()
  },

  startTutorial: () => {
    const tutorialConfig: RunConfig = { godPath: 'olgreth', runLength: 'short', isTutorial: true }
    const deck: DeckState = {
      drawPile: [...TUTORIAL_CARDS],
      discardPile: [],
      permDiscardPile: [],
      chainReserve: [olgreth_2],  // olgreth_2 held here; advanceGodPath on olgreth_1 moves it into nextCycleQueue
      nextCycleQueue: [],
    }
    set({
      phase: 'playing',
      runConfig: tutorialConfig,
      resources: { gold: 3, followers: 3, influence: 3, dread: 0, relics: 0, theChanged: 0 },
      deck,
      currentCard: null,
      godPathProgress: 0,
      reshuffleCount: 0,
      unravellingTier: 1,
      pendingUnravelling: false,
      turnCount: 0,
      failureReason: null,
      pendingGameOver: null,
      cardRunState: {},
      partialVictoryGod: null,
      activeWhispers: [],
      deepTradeUsed: false,
      patientForestUsesRemaining: 0,
      patientForestPenaltyActive: false,
      whisperCounselPenaltyActive: false,
      activityLog: [],
      activityBatchSealed: false,
      prepTags: [],
    })
  },

  skipTutorial: () => {
    saveTutorialComplete()
    const current = loadUnlockedBlessings()
    const withTutorial = ['biscuit_tin', 'known_faces', 'prior_standing']
      .reduce((acc, id) => acc.includes(id) ? acc : [...acc, id], current)
    saveUnlockedBlessings(withTutorial)
    set(s => ({ blessings: { ...s.blessings, unlocked: withTutorial } }))
  },

  drawNextCard: () => {
    const state = get()
    if (state.phase !== 'playing') return
    if (state.currentCard !== null) return  // Must resolve current card first

    const isTutorial = state.runConfig?.isTutorial ?? false
    let deck = state.deck
    let reshuffleCount = state.reshuffleCount
    let unravellingTier = state.unravellingTier
    let resources = state.resources
    let pendingUnravelling = state.pendingUnravelling
    let phase: GamePhase = 'playing'
    let failureReason: FailureReason | null = state.failureReason
    let cardRunState: Record<CardId, CardRunState> = state.cardRunState

    // Guard: draw pile must be non-empty (player reshuffles manually via reshuffleOnly)
    if (deck.drawPile.length === 0) return

    const { card, deck: newDeck } = drawCard(deck)
    if (!card) return

    deck = newDeck

    // Track draw count for this card
    const prevDrawCount = cardRunState[card.id]?.drawCount ?? 0
    cardRunState = { ...cardRunState, [card.id]: { ...cardRunState[card.id], drawCount: prevDrawCount + 1 } }

    // Apply onDraw effects
    const drawBeatChanges: DeckChanges = { inserted: [], removed: [] }
    if (card.onDraw && card.onDraw.length > 0) {
      for (const effect of card.onDraw) {
        if (effect.type === 'resource') {
          const prevVal = resources[effect.resource]
          resources = applyDelta(resources, effect.resource, effect.delta)
          if (!isTutorial && effect.resource === 'dread') {
            // P25-37: set on crossing ≥10; clear if dread recovers back below 10
            if (resources.dread >= 10 && !pendingUnravelling) pendingUnravelling = true
            else if (resources.dread < 10)                    pendingUnravelling = false
          }
          if (!isTutorial) {
            const beforeOF = deck
            deck = applyOverflowEffects(resources, deck, effect.resource, prevVal)
            appendInsertionDiff(beforeOF, deck, drawBeatChanges, 'overflow')
            appendPurgeDiff(beforeOF, deck, drawBeatChanges)
            const beforeDF = deck
            deck = applyDeficitEffects(resources, deck, effect.resource, prevVal)
            appendInsertionDiff(beforeDF, deck, drawBeatChanges, 'deficit')
            appendPurgeDiff(beforeDF, deck, drawBeatChanges)
          }
        } else if (effect.type === 'insertCard') {
          // s96 fix: onDraw insertCard — mirrors resolveOption routing (no randomOutcome wrapping)
          const toInsert = getCardById(effect.cardId)
          if (toInsert && !isTutorial) {
            if (toInsert.uniqueInDeck) {
              const alreadyInDeck = [...deck.drawPile, ...deck.discardPile, ...deck.nextCycleQueue]
                .some(c => c.id === toInsert.id)
              if (alreadyInDeck) continue
            }
            const beforeInsert = deck
            if (effect.position === 'discard') {
              deck = { ...deck, discardPile: [...deck.discardPile, toInsert] }
            } else if (effect.position === 'nextCycle' || toInsert.tier === 'threat' || toInsert.tier === 'treat') {
              deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
            } else {
              deck = insertCard(toInsert, deck, effect.position as 'top' | 'bottom' | 'random', effect.minPos, effect.maxPos)
            }
            appendInsertionDiff(beforeInsert, deck, drawBeatChanges, 'option')
          }
        } else if (effect.type === 'removeCard') {
          // s96 fix: onDraw removeCard
          const targetCard =
            deck.drawPile.find(c => c.id === effect.cardId && !c.permanent) ??
            deck.discardPile.find(c => c.id === effect.cardId && !c.permanent) ??
            deck.nextCycleQueue.find(c => c.id === effect.cardId && !c.permanent)
          if (targetCard) {
            const beforeRemove = deck
            deck = removeCardFromDeck(effect.cardId, deck)
            appendPurgeDiff(beforeRemove, deck, drawBeatChanges)
          }
        } else {
          console.warn(`[onDraw] Unsupported effect type "${effect.type}" on card "${card.id}" — add handler in drawNextCard`)
        }
      }
    }

    const newTurnCount = state.turnCount + 1

    // The Crawling Network: random resource +1 and Dread +1 every 5th card drawn
    if (!isTutorial && state.blessings.selected.includes('the_crawling_network') && newTurnCount % 5 === 0) {
      const cnPool = ['followers', 'influence', 'gold', 'relics'] as const
      const cnResource = cnPool[Math.floor(Math.random() * cnPool.length)]
      const prevCN = resources[cnResource]
      resources = applyDelta(resources, cnResource, 1)
      const beforeCNOF = deck
      deck = applyOverflowEffects(resources, deck, cnResource, prevCN)
      appendInsertionDiff(beforeCNOF, deck, drawBeatChanges, 'overflow')
      appendPurgeDiff(beforeCNOF, deck, drawBeatChanges)
      const beforeCNDF = deck
      deck = applyDeficitEffects(resources, deck, cnResource, prevCN)
      appendInsertionDiff(beforeCNDF, deck, drawBeatChanges, 'deficit')
      appendPurgeDiff(beforeCNDF, deck, drawBeatChanges)
      const prevDread = resources.dread
      resources = applyDelta(resources, 'dread', 1)
      if (resources.dread >= 10 && !pendingUnravelling) {
        pendingUnravelling = true
      }
      const beforeCNDread = deck
      deck = applyOverflowEffects(resources, deck, 'dread', prevDread)
      appendInsertionDiff(beforeCNDread, deck, drawBeatChanges, 'overflow')
      appendPurgeDiff(beforeCNDread, deck, drawBeatChanges)
    }

    // Nyarlathotep / Whispered Counsel: inject whisper option if this card is active
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

    // P20-B: Apply pooled option selection if card has pooled options
    if (currentCard.options.some(o => o.pooled)) {
      currentCard = applyPooledOptions(
        currentCard,
        cardRunState[card.id]?.drawCount ?? 1,
        (opt) => opt.condition
          ? checkCondition(opt.condition, {
              resources,
              deck,
              godPathProgress: state.godPathProgress,
              runConfig: state.runConfig,
              cardRunState,
              prepTags: state.prepTags,
            })
          : true,
      )
    }

    const isRegularTier = card.tier === 'core' || card.tier === 'common' || card.tier === 'rare'

    // Whispered Counsel bane: next regular card has gains halved, costs doubled
    // P25-22: stamp flag so DrawnCard can render the whisper-affected badge
    if (state.whisperCounselPenaltyActive && isRegularTier) {
      currentCard = {
        ...currentCard,
        isWhisperAffected: true,
        options: currentCard.options.map(opt => ({
          ...opt,
          effects: opt.effects.map(e =>
            e.type === 'resource'
              ? { ...e, delta: e.delta > 0 ? Math.floor(e.delta / 2) : e.delta * 2 }
              : e
          ),
        })),
      }
    }

    // Patient Forest bane: next regular card has all positive gains removed
    if (state.patientForestPenaltyActive && isRegularTier) {
      currentCard = {
        ...currentCard,
        options: currentCard.options.map(opt => ({
          ...opt,
          effects: opt.effects.map(e =>
            e.type === 'resource' && e.delta > 0 ? { ...e, delta: 0 } : e
          ),
        })),
      }
    }

    // Fire telemetry — card now known, resources still pre-draw
    captureCardDrawn({
      card_id:         card.id,
      card_title:      card.title,
      week:            reshuffleCount + 1,
      draw_pile_count: state.deck.drawPile.length,
      ...resSnapshot(state.resources),
    })

    set({
      deck,
      currentCard,
      resources,
      reshuffleCount,
      unravellingTier,
      pendingUnravelling,
      phase,
      failureReason,
      cardRunState,
      turnCount: newTurnCount,
      // Penalties clear when they fire on a regular card; persist through non-regular draws
      whisperCounselPenaltyActive: state.whisperCounselPenaltyActive && !isRegularTier,
      patientForestPenaltyActive: state.patientForestPenaltyActive && !isRegularTier,
      ...(drawBeatChanges.inserted.length > 0 || drawBeatChanges.removed.length > 0
        ? pushActivityHelper(state.activityLog, state.activityBatchSealed, [
            ...drawBeatChanges.inserted.map((ins): ActivityEntry => ({
              kind: 'insert', card: ins.card, source: ins.source,
            })),
            ...drawBeatChanges.removed.map((rem): ActivityEntry => ({
              kind: 'purge', card: rem.card, source: rem.source,
            })),
          ])
        : { activityBatchSealed: true }),
    })
    if (phase === 'playing') saveRun(get())
    else clearSave()
  },

  resolveOption: (optionIndex) => {
    const state = get()
    if (!state.currentCard || state.phase !== 'playing') return

    const isTutorial = state.runConfig?.isTutorial ?? false
    const option = state.currentCard.options[optionIndex]
    if (!option) return

    // Telemetry: fire option pick + all skipped sibling options
    {
      const visOpts = state.getVisibleOptions(state.currentCard)
      const week    = state.reshuffleCount + 1
      const snap    = resSnapshot(state.resources)
      visOpts
        .filter(o => !o.hidden)
        .forEach(o => {
          if (o.idx === optionIndex) {
            captureOptionPicked({
              card_id:      state.currentCard!.id,
              option_idx:   o.idx,
              option_label: (o.option.label ?? '').slice(0, 60),
              week,
              ...snap,
            })
          } else {
            captureOptionSkipped({
              card_id:      state.currentCard!.id,
              option_idx:   o.idx,
              option_label: (o.option.label ?? '').slice(0, 60),
              week,
              reason:       o.available ? 'available' : 'locked',
            })
          }
        })
    }

    // S2: tally locked sibling options on this card into runStats.
    {
      const visible = getVisibleOptions(state.currentCard, state)
      let prepDelta = 0
      let affordDelta = 0
      for (const v of visible) {
        if (v.idx === optionIndex) continue
        if (!v.available) {
          if (v.prepRequirement !== undefined) {
            // Prep-locked options are hidden from the player but still counted
            // so the reflection screen can show "N options behind preparations".
            prepDelta++
          } else if (!v.hidden) {
            // Count ALL visible non-prep locks: affordability shortfalls AND
            // resourceMin/other conditions where the player lacked a prerequisite.
            // Previously only affordabilityShortfall !== undefined was checked,
            // causing a false-positive "you walked every road" when a condition-locked
            // option had positive effects (affordabilityShortfall was undefined despite
            // the option being locked — e.g. deliver_a_sermon requires followers ≥ 2).
            affordDelta++
          }
        }
      }
      if (prepDelta > 0 || affordDelta > 0) {
        set(s => ({
          runStats: {
            ...s.runStats,
            prepLockedSkipped:   s.runStats.prepLockedSkipped   + prepDelta,
            affordLockedSkipped: s.runStats.affordLockedSkipped + affordDelta,
          },
        }))
      }
    }

    // Guard condition check
    if (option.condition) {
      const conditionMet = checkCondition(option.condition, {
        resources: state.resources,
        deck: state.deck,
        godPathProgress: state.godPathProgress,
        runConfig: state.runConfig,
        cardRunState: state.cardRunState,
        prepTags: state.prepTags,
      })
      if (!conditionMet) return
    }

    let resources: Resources = { ...state.resources }
    let deck: DeckState = { ...state.deck, drawPile: [...state.deck.drawPile], discardPile: [...state.deck.discardPile], permDiscardPile: [...state.deck.permDiscardPile] }
    let godPathProgress = state.godPathProgress
    let prepTags: string[] = [...(state.prepTags ?? [])]
    let phase: GamePhase = 'playing'
    let failureReason: FailureReason | null = state.failureReason
    let pendingGameOverLocal: { reason: string } | null = null
    let unravellingTier = state.unravellingTier
    let pendingUnravelling = state.pendingUnravelling
    let partialVictoryGod: GodPath | null = null
    let activeWhispers: CardId[] = [...state.activeWhispers]
    let whisperCounselPenaltyActive = state.whisperCounselPenaltyActive

    // Compute effective effects — apply dread pressure, then expand random outcomes
    const dreadPressure = computeDreadPressure(state.reshuffleCount, state.unravellingTier)

    let baseEffects: Effect[] = [...option.effects]

    if (option.dreadPressureScaling && dreadPressure > 0) {
      baseEffects = baseEffects.map(e =>
        e.type === 'resource' && e.resource === 'dread' && e.delta > 0
          ? { ...e, delta: e.delta + dreadPressure }
          : e
      )
    }

    const { expanded: effectiveEffects, capturedOutcome } = expandEffectsWithCapture(baseEffects)

    const deckChanges: DeckChanges = { inserted: [], removed: [] }

    // P18-8 fix: defer overflow/deficit checks for resource effects until the
    // full batch settles, so intermediate zero-states (e.g. -1 then +3 gold)
    // don't insert a deficit card the same batch immediately heals. Dread>=10
    // unravelling still fires intra-batch (different mechanism).
    const batchPrevVals: Partial<Record<ResourceKey, number>> = {}
    const touchedResources = new Set<ResourceKey>()

    let seedWhisperTargets: CardId[] = []
    let mutationSeededTitles: string[] = []
    let newlySetPrepTags: Array<{ tag: string; label: string }> = []
    let consumedPrepTags: Array<{ tag: string; label: string }> = []

    // Apply effects in order
    for (let effectIdx = 0; effectIdx < effectiveEffects.length; effectIdx++) {
      const effect = effectiveEffects[effectIdx]
      if (phase === 'gameOver' || phase === 'victory') break
      // Determine whether this effect originated from a random-outcome expansion.
      // Primary strategy: capturedOutcome carries expandedStart/expandedEnd slice indices.
      const isFromRandom = capturedOutcome !== null
        && effectIdx >= capturedOutcome.expandedStart
        && effectIdx < capturedOutcome.expandedEnd

      switch (effect.type) {
        case 'resource': {
          const key = effect.resource as ResourceKey
          if (!(key in batchPrevVals)) batchPrevVals[key] = resources[key]
          touchedResources.add(key)
          resources = applyDelta(resources, key, effect.delta)

          if (!isTutorial && key === 'dread') {
            // P25-37: set on crossing ≥10; clear if dread recovers back below 10
            if (resources.dread >= 10 && !pendingUnravelling) pendingUnravelling = true
            else if (resources.dread < 10)                    pendingUnravelling = false
          }
          break
        }

        case 'insertCard': {
          const toInsert = getCardById(effect.cardId)
          if (toInsert) {
            // P20-B: deck cap for changed_follower
            if (toInsert.id === 'changed_follower') {
              const existingCFCount = [
                ...deck.drawPile,
                ...deck.discardPile,
                ...deck.nextCycleQueue,
              ].filter(c => c.id === 'changed_follower').length
              if (existingCFCount >= MAX_CHANGED_FOLLOWER_COPIES) break
            }

            // Enforce uniqueInDeck: skip if a copy already exists anywhere in the deck
            if (toInsert.uniqueInDeck) {
              const alreadyInDeck = [
                ...deck.drawPile,
                ...deck.discardPile,
                ...deck.nextCycleQueue,
              ].some(c => c.id === toInsert.id)
              if (alreadyInDeck) break
            }

            // Edge-case: god path chain card delay into a short or empty draw pile.
            // getCardById returns a fresh card definition — no duplicate with the drawn instance,
            // which is separately routed to permDiscardPile after resolveOption completes.
            // god_path takes priority over 'random' source: god-path insertions are
            // always tagged 'godPath' even when emitted from a random-outcome branch.
            if (toInsert.tier === 'god_path' && effect.position === 'random') {
              const godPathId = toInsert.godPath ?? state.runConfig?.godPath
              const remaining = deck.drawPile.length
              if (remaining === 0) {
                // Pile empty — carry into next cycle. Reshuffle will reposition to 25%+.
                deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
                deckChanges.inserted.push({ card: toSummary(toInsert), source: 'godPath', ...(godPathId ? { godPath: godPathId } : {}) })
              } else {
                const effMin = Math.min(effect.minPos ?? 0, remaining - 1)
                const effMax = Math.min(effect.maxPos ?? remaining - 1, remaining - 1)
                deck = insertCard(toInsert, deck, 'random', effMin, effMax)
                deckChanges.inserted.push({ card: toSummary(toInsert), source: 'godPath', ...(godPathId ? { godPath: godPathId } : {}) })
              }
              break
            }

            // Source: 'random' if this effect came from a random-outcome expansion (with optional flavour),
            // otherwise 'option' for a directly-chosen option effect.
            const insertSource = isFromRandom ? 'random' : 'option'
            const insertExtra = isFromRandom && capturedOutcome?.flavourText
              ? { flavour: capturedOutcome.flavourText }
              : {}

            if (effect.position === 'discard') {
              deck = { ...deck, discardPile: [...deck.discardPile, toInsert] }
              deckChanges.inserted.push({ card: toSummary(toInsert), source: insertSource, ...insertExtra })
            } else if (effect.position === 'nextCycle') {
              deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
              deckChanges.inserted.push({ card: toSummary(toInsert), source: insertSource, ...insertExtra })
            } else if (toInsert.tier === 'threat' || toInsert.tier === 'treat') {
              // Threat and treat cards are deferred to the next reshuffle rather than injected mid-cycle.
              // This keeps the current draw pile lean so reshuffles actually happen.
              // (Overflow threat cards bypass this path — they use applyOverflowEffects directly.)
              deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
              deckChanges.inserted.push({ card: toSummary(toInsert), source: insertSource, ...insertExtra })
            } else {
              deck = insertCard(toInsert, deck, effect.position as 'top' | 'bottom' | 'random', effect.minPos, effect.maxPos)
              deckChanges.inserted.push({ card: toSummary(toInsert), source: insertSource, ...insertExtra })
            }
          }
          break
        }

        case 'removeCard': {
          // Self-removal: card removing itself while being played.
          // It's not in any deck pile (it's currentCard), so skip removeCardFromDeck.
          // Log the purge; auto-discard is skipped via selfRemoved=true.
          // Card ends up in no pile (intentional — Clarence retirement pattern).
          if (state.currentCard && effect.cardId === state.currentCard.id) {
            deckChanges.removed.push({ card: toSummary(state.currentCard), source: 'option' })
            break
          }
          const targetCard =
            deck.drawPile.find(c => c.id === effect.cardId && !c.permanent) ??
            deck.discardPile.find(c => c.id === effect.cardId && !c.permanent) ??
            deck.nextCycleQueue.find(c => c.id === effect.cardId && !c.permanent)
          if (targetCard) {
            deckChanges.removed.push({ card: toSummary(targetCard), source: 'option' })
            deck = removeCardFromDeck(effect.cardId, deck)
          }
          break
        }

        case 'removeRandomThreat': {
          const targets = [
            ...deck.drawPile.map((card, idx) => ({ pile: 'drawPile' as const, idx, card })),
            ...deck.discardPile.map((card, idx) => ({ pile: 'discardPile' as const, idx, card })),
            ...deck.nextCycleQueue.map((card, idx) => ({ pile: 'nextCycleQueue' as const, idx, card })),
          ].filter(({ card }) => isRemovableRandomThreat(card))
          if (targets.length > 0) {
            const pick = targets[Math.floor(Math.random() * targets.length)]
            deckChanges.removed.push({ card: toSummary(pick.card), source: 'option' })
            deck = {
              ...deck,
              [pick.pile]: deck[pick.pile].filter((_, i) => i !== pick.idx),
              permDiscardPile: [...deck.permDiscardPile, pick.card],
            }
          }
          break
        }

        case 'endRun': {
          const reason = effect.reason ?? 'The ritual failed. The dark could not sustain itself.'
          if (resources.relics > 0) {
            pendingGameOverLocal = { reason }
          } else {
            phase = 'gameOver'
            failureReason = { message: reason }
            saveWonLastRun(false)
          }
          break
        }

        case 'victory': {
          phase = 'victory'
          break
        }

        case 'partialVictory': {
          phase = 'victory'
          partialVictoryGod = effect.god
          break
        }

        case 'advanceGodPath': {
          const chainTotal = state.runConfig ? GOD_PATH_CHAINS[state.runConfig.godPath].length : 6
          const tentativeProgress = godPathProgress + 1
          if (tentativeProgress >= chainTotal) {
            // All god path final cards use { type: 'victory' } directly — advanceGodPath
            // should never legitimately complete the chain. If we're here, a non-chain
            // card (e.g. what_was_already_read) over-advanced the path. Surface the final
            // card immediately and hold progress at chainTotal-1 so the summoning card
            // is still encountered before victory is declared.
            godPathProgress = chainTotal - 1
            const godPath = state.runConfig!.godPath
            const finalStage = chainTotal
            const rsvIdx = deck.chainReserve.findIndex(c => c.godPath === godPath && c.chainStage === finalStage)
            const qIdx   = deck.nextCycleQueue.findIndex(c => c.godPath === godPath && c.chainStage === finalStage)
            let surfacedFinal: Card | null = null
            if (rsvIdx !== -1) {
              const finalCard = deck.chainReserve[rsvIdx]
              deck = { ...deck, drawPile: [finalCard, ...deck.drawPile], chainReserve: deck.chainReserve.filter((_, i) => i !== rsvIdx) }
              surfacedFinal = finalCard
            } else if (qIdx !== -1) {
              const finalCard = deck.nextCycleQueue[qIdx]
              deck = { ...deck, drawPile: [finalCard, ...deck.drawPile], nextCycleQueue: deck.nextCycleQueue.filter((_, i) => i !== qIdx) }
              surfacedFinal = finalCard
            }
            if (surfacedFinal) {
              deckChanges.inserted.push({ card: toSummary(surfacedFinal), source: 'godPath', godPath })
            }
            // If final card is already in drawPile it's already upcoming; if not found anywhere
            // it was already resolved — either way progress stays at chainTotal-1.
          } else {
            // Only commit the progress increment if the chain function actually queued a card.
            // If the invariant guard blocked it (an active chain card already exists), progress
            // must NOT advance — otherwise the counter goes out of sync and skips a stage.
            const result = advanceGodPathChain(tentativeProgress, state.runConfig!.godPath, deck)
            deck = result.deck
            if (result.queued) {
              godPathProgress = tentativeProgress
              const queuedCard = deck.nextCycleQueue[deck.nextCycleQueue.length - 1]
              if (queuedCard) {
                const gpId = queuedCard.godPath ?? state.runConfig?.godPath
                deckChanges.inserted.push({ card: toSummary(queuedCard), source: 'godPath', ...(gpId ? { godPath: gpId } : {}) })
              }
            }
          }
          break
        }

        case 'setPrepTag': {
          // Idempotent — only push if not already present.
          if (!prepTags.includes(effect.tag)) {
            prepTags = [...prepTags, effect.tag]
            const label = effect.tag in PREP_TAG_LABELS
              ? PREP_TAG_LABELS[effect.tag as PrepTag]
              : effect.tag.replace(/_/g, ' ')
            newlySetPrepTags = [...newlySetPrepTags, { tag: effect.tag, label }]
          }
          break
        }

        // Removes the FIRST occurrence only. setPrepTag is idempotent so duplicates
        // should never exist, but this guard is safer than splice(idx, allOccurrences).
        case 'consumePrepTag': {
          const idx = prepTags.indexOf(effect.tag)
          if (idx !== -1) {
            prepTags = prepTags.filter((_, i) => i !== idx)
            const label = effect.tag in PREP_TAG_LABELS
              ? PREP_TAG_LABELS[effect.tag as PrepTag]
              : effect.tag.replace(/_/g, ' ')
            consumedPrepTags = [...consumedPrepTags, { tag: effect.tag, label }]
          }
          break
        }

        case 'deferGodPathCard': {
          // Push the current god_path card later in drawPile.
          // Moves from its current index to min(currentIdx + 4, newPile.length).
          // No-op if no god_path card is in drawPile.
          const gpIdx = deck.drawPile.findIndex(c => c.tier === 'god_path')
          if (gpIdx !== -1) {
            const card = deck.drawPile[gpIdx]
            const newPile = [...deck.drawPile]
            newPile.splice(gpIdx, 1)
            const targetPos = Math.min(gpIdx + 4, newPile.length)
            newPile.splice(targetPos, 0, card)
            deck = { ...deck, drawPile: newPile }
          }
          break
        }

        case 'doomTick': {
          unravellingTier = Math.min(4, unravellingTier + 1)
          break
        }

        case 'drawCard':
          // Handled after resolution — currently unsupported as mid-chain draw
          break
        case 'seedMutations': {
          const replaceable = deck.drawPile
            .map((c, i) => ({ id: c.id, idx: i }))
            .filter(({ id }) => id in MUTATION_MAP)
          const toReplace = shuffleArray([...replaceable]).slice(0, effect.count)
          if (toReplace.length > 0) {
            const newDrawPile = [...deck.drawPile]
            for (const { idx, id } of toReplace) {
              const mutatedCard = getCardById(MUTATION_MAP[id])
              if (mutatedCard) {
                // P25-19: record original card title for activity log
                mutationSeededTitles.push(newDrawPile[idx].title)
                newDrawPile[idx] = mutatedCard
              }
            }
            deck = { ...deck, drawPile: newDrawPile }
          }
          break
        }
        case 'surfaceCards': {
          const mutatedIds = new Set(Object.values(MUTATION_MAP))
          const mutatedCards = deck.drawPile.filter(c => mutatedIds.has(c.id))
          if (mutatedCards.length > 0) {
            let newDrawPile = deck.drawPile.filter(c => !mutatedIds.has(c.id))
            for (const card of mutatedCards) {
              const lo = 1
              const hi = Math.min(effect.maxPos, newDrawPile.length)
              const pos = lo + Math.floor(Math.random() * (Math.max(hi - lo, 0) + 1))
              newDrawPile = [...newDrawPile.slice(0, pos), card, ...newDrawPile.slice(pos)]
            }
            deck = { ...deck, drawPile: newDrawPile }
          }
          break
        }
        case 'seedWhispers': {
          const { newTargets, cardsToInsert } = applyWhisperSeed(
            effect.count,
            activeWhispers,
            deck.drawPile
          )
          if (newTargets.length > 0) {
            activeWhispers = [...activeWhispers, ...newTargets]
            seedWhisperTargets = newTargets
          }
          if (cardsToInsert.length > 0) {
            let newDrawPile = [...deck.drawPile]
            for (const id of cardsToInsert) {
              const card = getCardById(id)
              if (!card) continue
              const maxPos = Math.min(4, newDrawPile.length)
              const pos =
                newDrawPile.length === 0
                  ? 0
                  : 1 + Math.floor(Math.random() * maxPos)
              newDrawPile = [...newDrawPile.slice(0, pos), card, ...newDrawPile.slice(pos)]
            }
            deck = { ...deck, drawPile: newDrawPile }
          }
          break
        }
        case 'surfaceChainCard': {
          const godPath = state.runConfig?.godPath
          const chainIdx = deck.drawPile.findIndex(
            c => c.tier === 'god_path' && c.godPath === godPath
          )
          if (chainIdx >= 0) {
            const chainCard = deck.drawPile[chainIdx]
            const remaining = deck.drawPile.filter((_, i) => i !== chainIdx)
            const lo = effect.minPos ?? 0
            const hi = effect.maxPos ?? 0
            const target = lo < hi ? lo + Math.floor(Math.random() * (hi - lo + 1)) : lo
            const insertPos = Math.min(target, remaining.length)
            deck = {
              ...deck,
              drawPile: [...remaining.slice(0, insertPos), chainCard, ...remaining.slice(insertPos)],
            }
          }
          break
        }
      }
    }

    // Apply deferred overflow/deficit using pre-batch values per touched resource.
    if (!isTutorial) {
      for (const key of touchedResources) {
        const prevVal = batchPrevVals[key]!
        const beforeOverflow = deck
        deck = applyOverflowEffects(resources, deck, key, prevVal)
        appendInsertionDiff(beforeOverflow, deck, deckChanges, 'overflow')
        const beforeDeficit = deck
        appendPurgeDiff(beforeDeficit, deck, deckChanges)
        deck = applyDeficitEffects(resources, deck, key, prevVal)
        appendInsertionDiff(beforeDeficit, deck, deckChanges, 'deficit')
        appendPurgeDiff(beforeDeficit, deck, deckChanges)
      }
    }

    // Process insertsCards shorthand
    for (const cardId of option.insertsCards ?? []) {
      const toInsert = getCardById(cardId)
      if (!toInsert) continue
      if (toInsert.tier === 'threat' || toInsert.tier === 'treat') {
        deck = { ...deck, nextCycleQueue: [...deck.nextCycleQueue, toInsert] }
      } else {
        deck = insertCard(toInsert, deck, 'random')
      }
    }

    // Process removesCards shorthand
    for (const cardId of option.removesCards ?? []) {
      deck = removeCardFromDeck(cardId, deck)
    }

    // Discard the resolved card (unless it removed itself via effect)
    // god_path and doom cards never cycle back. threat and treat cards are single-use
    // (unless permanent:true) — they go to permDiscardPile so they don't bloat the deck
    // on every reshuffle. Self-reinserting cards (insertCard with own cardId) also go to
    // permDiscardPile because a fresh copy is already in the deck from the insertCard effect.
    const currentCard = state.currentCard
    if (currentCard) {
      const selfRemoved = effectiveEffects.some(e => e.type === 'removeCard' && e.cardId === currentCard.id)
      if (!selfRemoved) {
        const isSingleUse = (currentCard.tier === 'threat' || currentCard.tier === 'treat') && !currentCard.permanent
        const selfReinserts = effectiveEffects.some(e => e.type === 'insertCard' && e.cardId === currentCard.id)
        // Strip injected whisper options before returning the card to the deck (P20-A / P25-38).
        // For append-style whispers: filter() was fine.
        // For replacesSlot whispers: filter() ate the replaced slot permanently — each reshuffle
        // shrinks the options array by one. Fix: restore from base definition so the original
        // option at the replaced slot is always recovered. Falls back to filter() for cards with
        // no base definition (shouldn't happen in practice).
        const cardToDiscard: Card = (() => {
          if (!currentCard.options.some(o => o.isWhisper)) return currentCard
          const base = getCardById(currentCard.id)
          if (base) return { ...currentCard, options: base.options }
          // Fallback (append-style whispers with no base): filter as before
          return { ...currentCard, options: currentCard.options.filter(o => !o.isWhisper) }
        })()
        if (currentCard.tier === 'god_path' || currentCard.tier === 'doom' || isSingleUse || selfReinserts) {
          deck = { ...deck, permDiscardPile: [...deck.permDiscardPile, cardToDiscard] }
        } else {
          deck = discardCard(cardToDiscard, deck)
        }
      }
    }

    // Whispered Counsel: using a whisper option triggers the penalty on the next regular card
    if (option.isWhisper && state.blessings.selected.includes('whispered_counsel')) {
      whisperCounselPenaltyActive = true
    }

    // Record this option as chosen for the card (used by cardOptionChosen condition)
    const cardId = state.currentCard.id
    const prevEntry = state.cardRunState[cardId] ?? { drawCount: 0 }
    const cardRunState = {
      ...state.cardRunState,
      [cardId]: { ...prevEntry, chosenOptions: [...(prevEntry.chosenOptions ?? []), optionIndex] },
    }

    // Random outcomes get a composite entry: flavour + resource deltas + inserted card
    // (if any). The corresponding source:'random' insert is folded in — filtered out below.
    const randomOutcomeEntry: ActivityEntry | null = capturedOutcome
      ? {
          kind: 'randomOutcome',
          ...(capturedOutcome.flavourText ? { flavour: capturedOutcome.flavourText } : {}),
          deltas: capturedOutcome.effects
            .filter((e): e is Extract<Effect, { type: 'resource' }> => e.type === 'resource')
            .map(e => ({ resource: e.resource, delta: e.delta })),
          ...(deckChanges.inserted.find(ins => ins.source === 'random')
            ? { insertedCard: deckChanges.inserted.find(ins => ins.source === 'random')!.card }
            : {}),
        }
      : null

    const batchEntries: ActivityEntry[] = [
      ...(randomOutcomeEntry ? [randomOutcomeEntry] : []),
      ...(seedWhisperTargets.length > 0
        ? [{ kind: 'whisper' as const, cardIds: seedWhisperTargets }]
        : []),
      ...(mutationSeededTitles.length > 0 ? [{ kind: 'mutationSeed' as const, cardTitles: mutationSeededTitles }] : []),
      ...newlySetPrepTags.map(({ tag, label }) => ({ kind: 'prepTagSet' as const, tag, label })),
      ...consumedPrepTags.map(({ tag, label }) => ({ kind: 'prepTagRemoved' as const, tag, label })),
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

    set({
      resources,
      deck,
      godPathProgress,
      phase,
      failureReason,
      pendingGameOver: pendingGameOverLocal ?? state.pendingGameOver,
      unravellingTier,
      pendingUnravelling,
      currentCard: null,
      partialVictoryGod,
      activeWhispers,
      whisperCounselPenaltyActive,
      cardRunState,
      prepTags,
      ...(batchEntries.length > 0
        ? pushActivityHelper(state.activityLog, state.activityBatchSealed, batchEntries)
        : { activityLog: [], activityBatchSealed: true }),
    })
    // S2: detect newly-closed named paths against the just-committed state.
    {
      const next = get()
      const newPaths = newlyClosedPaths(next, next.runStats.closedPaths)
      if (newPaths.length > 0) {
        set({
          runStats: {
            ...next.runStats,
            closedPaths: [...next.runStats.closedPaths, ...newPaths],
          },
        })
      }
    }
    if (phase === 'victory') {
      captureRunEnded(buildRunEndedProps(get(), 'victory'))
    }
    if (phase === 'playing') saveRun(get())
    else clearSave()
  },

  activateDeepTrade: () => {
    const state = get()
    if (!state.blessings.selected.includes('the_deep_trade')) return
    if (state.deepTradeUsed || state.phase !== 'playing') return
    if (state.resources.relics < 2) return
    let resources = { ...state.resources }
    resources = applyDelta(resources, 'relics', -2)
    const prevFollowers = resources.followers
    resources = applyDelta(resources, 'followers', 4)
    const prevGold = resources.gold
    resources = applyDelta(resources, 'gold', 3)
    const covenantCard = getCardById('covenant_demands')
    let deck = { ...state.deck, drawPile: [...state.deck.drawPile] }
    if (covenantCard) deck = insertCard(covenantCard, deck, 'random', 2, 4)
    // Reconcile overflow cards for resources that changed
    const deepTradeChanges: DeckChanges = { inserted: [], removed: [] }
    let beforeDT = deck
    deck = applyOverflowEffects(resources, deck, 'followers', prevFollowers)
    appendInsertionDiff(beforeDT, deck, deepTradeChanges, 'overflow')
    appendPurgeDiff(beforeDT, deck, deepTradeChanges)
    beforeDT = deck
    deck = applyDeficitEffects(resources, deck, 'followers', prevFollowers)
    appendInsertionDiff(beforeDT, deck, deepTradeChanges, 'deficit')
    appendPurgeDiff(beforeDT, deck, deepTradeChanges)
    beforeDT = deck
    deck = applyOverflowEffects(resources, deck, 'gold', prevGold)
    appendInsertionDiff(beforeDT, deck, deepTradeChanges, 'overflow')
    appendPurgeDiff(beforeDT, deck, deepTradeChanges)
    beforeDT = deck
    deck = applyDeficitEffects(resources, deck, 'gold', prevGold)
    appendInsertionDiff(beforeDT, deck, deepTradeChanges, 'deficit')
    appendPurgeDiff(beforeDT, deck, deepTradeChanges)
    const deepTradeBatchEntries: ActivityEntry[] = [
      ...deepTradeChanges.inserted.map((ins): ActivityEntry => ({ kind: 'insert', card: ins.card, source: ins.source })),
      ...deepTradeChanges.removed.map((rem): ActivityEntry => ({ kind: 'purge', card: rem.card, source: rem.source })),
    ]
    set({
      resources, deck, deepTradeUsed: true,
      ...(deepTradeBatchEntries.length > 0
        ? pushActivityHelper(state.activityLog, state.activityBatchSealed, deepTradeBatchEntries)
        : { activityBatchSealed: true }),
    })
    saveRun(get())
  },

  pushCard: () => {
    const state = get()
    if (!state.currentCard || state.patientForestUsesRemaining <= 0 || state.phase !== 'playing') return
    const card = state.currentCard
    let deck = { ...state.deck, drawPile: [...state.deck.drawPile] }
    const pos = Math.min(10, deck.drawPile.length)
    deck = { ...deck, drawPile: [...deck.drawPile.slice(0, pos), card, ...deck.drawPile.slice(pos)] }
    set({
      deck,
      currentCard: null,
      patientForestUsesRemaining: state.patientForestUsesRemaining - 1,
      patientForestPenaltyActive: true,
    })
    saveRun(get())
    get().drawNextCard()
  },

  succumb: () => {
    const state = get()
    if (state.phase !== 'playing' || !state.currentCard) return
    const godPath = state.runConfig?.godPath
    const SUCCUMB_MESSAGES: Partial<Record<GodPath, string>> = {
      yha_nthlei: 'The tide comes in. You let it.',
      nyarlathotep: 'You understand, finally. You agree.',
      shub_niggurath: 'The roots have already found you.',
    }
    const message = (godPath && SUCCUMB_MESSAGES[godPath]) ?? 'The dark takes you.'
    saveWonLastRun(false)
    captureRunEnded(buildRunEndedProps(state, 'succumb'))
    set({ phase: 'gameOver', failureReason: { message }, currentCard: null })
    // S2: detect newly-closed named paths.
    {
      const next = get()
      const newPaths = newlyClosedPaths(next, next.runStats.closedPaths)
      if (newPaths.length > 0) {
        set({ runStats: { ...next.runStats, closedPaths: [...next.runStats.closedPaths, ...newPaths] } })
      }
    }
  },

  spendRelic: (resource: ResourceKey, delta: 2 | -2) => {
    const state = get()
    if (state.phase !== 'playing' || state.resources.relics <= 0) return

    const prevVal  = state.resources[resource]
    const newValue = Math.max(0, prevVal + delta)

    const updatedResources: Resources = {
      ...state.resources,
      [resource]: newValue,
      relics: state.resources.relics - 1,
    }

    // Reuse existing overflow/deficit helpers — handles all threshold logic
    const relicChanges: DeckChanges = { inserted: [], removed: [] }
    let beforeRelic = state.deck
    let deck = applyOverflowEffects(updatedResources, state.deck, resource, prevVal)
    appendInsertionDiff(beforeRelic, deck, relicChanges, 'overflow')
    appendPurgeDiff(beforeRelic, deck, relicChanges)
    beforeRelic = deck
    deck = applyDeficitEffects(updatedResources, deck, resource, prevVal)
    appendInsertionDiff(beforeRelic, deck, relicChanges, 'deficit')
    appendPurgeDiff(beforeRelic, deck, relicChanges)

    // If dread crossed 10 via relic spend, mark doom pending (same as option resolution)
    const newPendingUnravelling = state.pendingUnravelling ||
      (resource === 'dread' && !state.pendingUnravelling && updatedResources.dread >= 10)

    const relicBatchEntries: ActivityEntry[] = [
      ...relicChanges.inserted.map((ins): ActivityEntry => ({ kind: 'insert', card: ins.card, source: ins.source })),
      ...relicChanges.removed.map((rem): ActivityEntry => ({ kind: 'purge', card: rem.card, source: rem.source })),
    ]
    set({
      resources: updatedResources,
      deck,
      pendingGameOver: null,
      pendingUnravelling: newPendingUnravelling,
      ...(relicBatchEntries.length > 0
        ? pushActivityHelper(state.activityLog, state.activityBatchSealed, relicBatchEntries)
        : { activityBatchSealed: true }),
    })
    saveRun(get())
  },

  acceptDefeat: () => {
    const state = get()
    if (!state.pendingGameOver) return
    saveWonLastRun(false)
    captureRunEnded(buildRunEndedProps(state, 'accept_defeat'))
    set({
      phase: 'gameOver',
      failureReason: { message: state.pendingGameOver.reason },
      pendingGameOver: null,
      currentCard: null,
    })
    // S2: detect newly-closed named paths.
    {
      const next = get()
      const newPaths = newlyClosedPaths(next, next.runStats.closedPaths)
      if (newPaths.length > 0) {
        set({ runStats: { ...next.runStats, closedPaths: [...next.runStats.closedPaths, ...newPaths] } })
      }
    }
  },

  reshuffleOnly: () => {
    const state = get()
    if (state.phase !== 'playing') return
    if (state.deck.drawPile.length > 0) return  // Only valid when draw pile empty

    // Tutorial: bypass unravelling, passives, and shuffle entirely.
    // nextCycleQueue already contains the predetermined post-reshuffle sequence.
    if (state.runConfig?.isTutorial) {
      const deck = tutorialReshuffle(state.deck)
      // Reshuffle banner displays "A new week begins" / "Doom escalates" inline above
      // the draw deck; the activity log is reset to empty for the new week.
      set({
        deck,
        activityLog: [],
        activityBatchSealed: true,
      })
      saveRun(get())
      return
    }

    let reshuffleCount = state.reshuffleCount + 1
    const unravellingTier = getUnravellingTier(reshuffleCount)
    const resources = applyPassivesForReshuffle(state.deck, state.resources, reshuffleCount === 1)
    // P26-04: pass reshuffleCount directly — getUnravellingCard computes its own
    // tier internally (min 1, max 5). Previously passed unravellingTier (max 4),
    // making unravelling_5 permanently unreachable.
    const unravelCard = getUnravellingCard(
      state.pendingUnravelling ? Math.min(5, reshuffleCount + 1) : reshuffleCount
    )
    const rarePool = state.blessings.selected.includes('the_groves_gift')
      ? [...RARE_CARDS, DARK_YOUNG_GUARDIAN]
      : RARE_CARDS
    const rareTarget = 1 + Math.floor(Math.random() * 2)   // 1 or 2, floor 1
    const { deck, usedRareIds: nextUsedRareIds, usedCoreIds: nextUsedCoreIds, insertedUnravelling } =
      reshuffle(state.deck, unravelCard, state.usedRareIds, rarePool, rareTarget,
                state.usedCoreIds, CORE_CARDS, 4)
    // Use the card reference returned directly from reshuffle — avoids ambiguity when a
    // prior-cycle doom card already sits in the discard pile before reshuffling.
    const insertedDoom: Card | undefined = insertedUnravelling

    // Activity log is reset each week; seed it with doom-escalation entries so
    // the player sees what changed (P22-42/P22-51 moved these from WeekBanner).
    const reshuffleLog: ActivityEntry[] = [
      { kind: 'doomEscalate' },
      ...(insertedDoom ? [{ kind: 'insert' as const, card: toSummary(insertedDoom), source: 'doom' as const }] : []),
    ]

    set({
      deck,
      resources,
      reshuffleCount,
      unravellingTier,
      pendingUnravelling: false,
      usedRareIds: nextUsedRareIds,
      usedCoreIds: nextUsedCoreIds,
      activityLog: reshuffleLog,
      activityBatchSealed: true,
    })
    saveRun(get())
  },

  loadRun: () => {
    const data = loadSaveData()
    if (!data) return

    // Reconstruct deck from card IDs (unknown IDs are silently dropped)
    const rehydrate = (ids: string[]) =>
      ids.map(id => getCardById(id)).filter((c): c is Card => c != null)

    const deck: DeckState = {
      drawPile:        rehydrate(data.deckIds.drawPile),
      discardPile:     rehydrate(data.deckIds.discardPile),
      permDiscardPile: rehydrate(data.deckIds.permDiscardPile),
      chainReserve:    rehydrate(data.deckIds.chainReserve),
      nextCycleQueue:  rehydrate(data.deckIds.nextCycleQueue ?? []),
    }

    // Rare rotation: hydrate usedRareIds, or synthesise from deck for pre-P13-24(a) saves.
    const hydratedUsedRareIds = data.usedRareIds
      ? new Set(data.usedRareIds)
      : new Set(
          [...deck.drawPile, ...deck.discardPile, ...deck.nextCycleQueue]
            .filter(c => c.tier === 'rare')
            .map(c => c.id),
        )

    // Reconstruct currentCard, re-applying whisper option and blessings penalties
    let currentCard: Card | null = null
    if (data.currentCardId) {
      const base = getCardById(data.currentCardId)
      if (base) {
        const whisperOpt = getWhisperOption(base.id, data.activeWhispers)
        // P25-38: mirror draw-time slot-replacement logic (lines 699-705).
        // Previously always appended, showing e.g. inheritance with 4 options after reload.
        let card: Card = (() => {
          if (!whisperOpt) return { ...base }
          if (whisperOpt.replacesSlot !== undefined) {
            const newOptions = [...base.options]
            newOptions[whisperOpt.replacesSlot] = whisperOpt
            return { ...base, options: newOptions }
          }
          // Fallback: append (generic whisper / Whispered Counsel blessing)
          return { ...base, options: [...base.options, whisperOpt] }
        })()

        const isRegular = base.tier === 'core' || base.tier === 'common' || base.tier === 'rare'
        if (data.whisperCounselPenaltyActive && isRegular) {
          card = { ...card, isWhisperAffected: true, options: card.options.map(opt => ({
            ...opt,
            effects: opt.effects.map(e =>
              e.type === 'resource' ? { ...e, delta: e.delta > 0 ? Math.floor(e.delta / 2) : e.delta * 2 } : e
            ),
          }))}
        }
        if (data.patientForestPenaltyActive && isRegular) {
          card = { ...card, options: card.options.map(opt => ({
            ...opt,
            effects: opt.effects.map(e =>
              e.type === 'resource' && e.delta > 0 ? { ...e, delta: 0 } : e
            ),
          }))}
        }
        currentCard = card
      }
    }

    set({
      phase: 'playing',
      resources:                  data.resources,
      deck,
      currentCard,
      runConfig:                  data.runConfig,
      godPathProgress:            data.godPathProgress,
      reshuffleCount:             data.reshuffleCount,
      unravellingTier:            data.unravellingTier,
      pendingUnravelling:         data.pendingUnravelling,
      turnCount:                  data.turnCount,
      failureReason:              null,
      pendingGameOver:            null,
      blessings:                  data.blessings,
      cardRunState:               data.cardRunState,
      partialVictoryGod:          data.partialVictoryGod,
      activeWhispers:             data.activeWhispers,
      deepTradeUsed:              data.deepTradeUsed,
      patientForestUsesRemaining: data.patientForestUsesRemaining,
      patientForestPenaltyActive: data.patientForestPenaltyActive,
      whisperCounselPenaltyActive: data.whisperCounselPenaltyActive,
      activityLog:                 [],
      activityBatchSealed:         false,
      usedRareIds:                 hydratedUsedRareIds,
      usedCoreIds:                 new Set(data.usedCoreIds ?? []),
      prepTags:                    data.prepTags ?? [],
    })
  },

  unlockBlessingForGod: () => {
    const state = get()
    if (!state.runConfig || state.phase !== 'victory') return
    // Tutorial win: unlock starter blessings + mark tutorial complete
    if (state.runConfig.isTutorial) {
      if (loadTutorialComplete()) return  // already done, idempotent
      saveTutorialComplete()
      const tutorialIds = ['biscuit_tin', 'known_faces', 'prior_standing']
      const updated = tutorialIds.reduce(
        (acc, id) => acc.includes(id) ? acc : [...acc, id],
        state.blessings.unlocked,
      )
      saveUnlockedBlessings(updated)
      set(s => ({ blessings: { ...s.blessings, unlocked: updated } }))
      return
    }
    // Normal run win — blessings always unlock; wonLastRun bonus depends on partial vs full
    const updated = unlockBlessingsForGod(state.blessings.unlocked, state.runConfig.godPath)
    saveUnlockedBlessings(updated)
    if (state.partialVictoryGod !== null) {
      saveWonLastRunOnce(true)   // partial: 4-slot next-run-only
    } else {
      saveWonLastRun(true)       // full: persistent 4-slot bonus
    }
    set(s => ({ blessings: { ...s.blessings, unlocked: updated } }))
  },

  pushActivity: (...entries) => set(s => pushActivityHelper(s.activityLog, s.activityBatchSealed, entries)),
  sealActivityBatch: () => set({ activityBatchSealed: true }),

  getVisibleOptions: (card) => getVisibleOptions(card, get()),
}))
