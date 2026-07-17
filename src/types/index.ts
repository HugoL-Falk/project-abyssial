// ─── Primitives ───────────────────────────────────────────────────────────────

export type ResourceKey = 'gold' | 'followers' | 'influence' | 'dread' | 'relics' | 'theChanged'

export type Resources = {
  [K in ResourceKey]: number
}

export type CardId = string
export type BlessingId = string
export type GodPath = 'yha_nthlei' | 'nyarlathotep' | 'shub_niggurath' | 'olgreth'
export type RunLength = 'short' | 'long'
export type CardTier = 'core' | 'common' | 'rare' | 'treat' | 'threat' | 'god_path' | 'doom' | 'passive' | 'tutorial'
export type GamePhase =
  | 'intro'
  | 'menu'
  | 'godPathSelect'
  | 'blessingSelect'
  | 'playing'
  | 'gameOver'
  | 'victory'

// ─── Effects ──────────────────────────────────────────────────────────────────

export type Effect =
  | { type: 'resource'; resource: ResourceKey; delta: number }
  | { type: 'insertCard'; cardId: CardId; position: 'top' | 'bottom' | 'random' | 'discard' | 'nextCycle'; minPos?: number; maxPos?: number }
  | { type: 'removeCard'; cardId: CardId }
  | { type: 'endRun'; reason?: string }
  | { type: 'victory' }
  | { type: 'partialVictory'; god: GodPath }
  | { type: 'advanceGodPath' }
  | { type: 'drawCard'; count: number }
  | { type: 'doomTick' }
  | { type: 'seedMutations'; count: number }
  | { type: 'surfaceCards'; maxPos: number }
  | { type: 'removeRandomThreat' }
  | { type: 'seedWhispers'; count: number }
  | { type: 'surfaceChainCard'; minPos?: number; maxPos?: number }
  | { type: 'randomOutcome'; outcomes: Array<{ weight: number; effects: Effect[]; flavourText?: string }> }
  | { type: 'setPrepTag'; tag: string }
  | { type: 'consumePrepTag'; tag: string }
  | { type: 'deferGodPathCard' }

// ─── Conditions ───────────────────────────────────────────────────────────────

export type Condition =
  | { type: 'resourceMin'; resource: ResourceKey; min: number }
  | { type: 'resourceMax'; resource: ResourceKey; max: number }
  | { type: 'hasCard'; cardId: CardId }
  | { type: 'godPath'; path: GodPath }
  | { type: 'godPathStageMin'; min: number }
  | { type: 'runLength'; length: RunLength }
  | { type: 'not'; condition: Condition }
  | { type: 'and'; conditions: Condition[] }
  | { type: 'or'; conditions: Condition[] }
  | { type: 'cardDrawCount'; cardId: CardId; min?: number; max?: number }
  | { type: 'cardOptionChosen'; cardId: CardId; optionIdx: number }
  | { type: 'hasPrepTag'; tag: string }
  | { type: 'notHasPrepTag'; tag: string }

// ─── Outcome Feedback ─────────────────────────────────────────────────────────

export type CardSummary = {
  id: CardId
  title: string
  tier: CardTier
}

export type DeckInsertion = { card: CardSummary; source: ActivityInsertSource; flavour?: string; godPath?: GodPath }
export type DeckRemoval   = { card: CardSummary; source: ActivityPurgeSource }
export type DeckChanges   = { inserted: DeckInsertion[]; removed: DeckRemoval[] }

// ─── Passive Effects ──────────────────────────────────────────────────────────

export type PassiveEffect = {
  trigger: 'reshuffle' | 'onDraw'
  effects: Effect[]
  condition?: Condition
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export type CardOption = {
  label: string
  flavourText: string
  effects: Effect[]
  insertsCards?: CardId[]
  removesCards?: CardId[]
  condition?: Condition
  hideWhenUnavailable?: boolean  // hide entirely rather than grey out when condition not met
  revealWhenLocked?: true         // if set: hasPrepTag options show greyed, not hidden
  isWhisper?: boolean            // true for Nyarlathotep whisper-injected options (purple styling)
  dreadPressureScaling?: boolean  // if true, dread costs increase by (unravellingTier − 1)
  succumbOption?: boolean         // only visible when no non-succumb option is available; styled as red SUCCUMB
  previewTag?: string            // authored override for the generic structural chip(s). Overrides default rendering of insertCard / removeCard / removeRandomThreat chips. Resource chips render unchanged.
  replacesSlot?: number          // 0-indexed slot to swap out at draw time; present only on slot-targeted whisper options
  pooled?: boolean               // participates in per-draw pool selection
  categoryKey?: string           // one option per categoryKey shown per draw
}

export type Card = {
  id: CardId
  title: string
  flavourText: string
  options: CardOption[]
  tier: CardTier
  godPathWeight?: GodPath
  chainStage?: number
  godPath?: GodPath
  passive?: PassiveEffect
  onDraw?: Effect[]
  permanent?: boolean
  isSummoning?: boolean
  accumulates?: boolean
  flavourTextByDrawCount?: Record<number, string>
  optionPoolSize?: number        // how many pooled options to show per draw (default 2)
  uniqueInDeck?: true   // at most one copy may exist across draw + discard + nextCycleQueue at any time
  pinnedNextCycle?: true  // pinned to position 0 after reshuffle (tutorial use only)
  isMutated?: boolean        // true for Shub deck-mutation replacements; renders ⬢ badge
  isWhisperAffected?: boolean // true when Whispered Counsel penalty modified this draw; renders ✦ badge
}

// ─── Deck ─────────────────────────────────────────────────────────────────────

export type DeckState = {
  drawPile: Card[]
  discardPile: Card[]
  permDiscardPile: Card[]
  chainReserve: Card[]      // chain cards 2–6; not shuffled into main deck
  nextCycleQueue: Card[]    // cards deferred to next reshuffle (threat inserts, god path advances)
}

// ─── Run ──────────────────────────────────────────────────────────────────────

export type RunConfig = {
  godPath: GodPath
  runLength: RunLength
  isTutorial?: boolean
}

export interface RunStats {
  /** Count of options filtered by prep-tag gate across the run. */
  prepLockedSkipped: number
  /** Count of options filtered by affordability gate across the run. */
  affordLockedSkipped: number
  /** Named chain paths the player closed during the run (e.g. "the recited descent"). */
  closedPaths: string[]
}

export type FailureReason = {
  resource?: ResourceKey
  message: string
}

// ─── Blessings ────────────────────────────────────────────────────────────────

export type BlessingResourceBonus = {
  resource: ResourceKey
  delta: number
}

export type BlessingCard = {
  id: BlessingId
  title: string
  description: string
  flavourText: string
  unlockedBy?: GodPath | 'tutorial'
  resourceBonuses?: BlessingResourceBonus[]
  passive?: PassiveEffect
  injectCardId?: CardId
}

export type BlessingsState = {
  unlocked: BlessingId[]
  selected: BlessingId[]
}

// ─── Card Run State ───────────────────────────────────────────────────────────

export type CardRunState = {
  drawCount: number
  chosenOptions?: number[]  // indices of options chosen on previous draws of this card
}

export type VisibleOption = {
  idx: number
  option: CardOption
  available: boolean
  effectiveEffects: Effect[]
  hidden: boolean  // true when unavailable + hideWhenUnavailable — UI should not render
  affordabilityShortfall?: Partial<Record<ResourceKey, number>>
  disabledReason?: string
  prepRequirement?: {
    tag: string
    label: string
    // carrierCardIds is populated by gameStore but intentionally unread by OptionsColumn.
    // Retained for the NB-G1-03/P17-29 re-enable watchpoint: tap-to-preview
    // chain-card discovery will route through onPreviewCard when re-wired.
    carrierCardIds: CardId[]
  }
}

// ─── Full Game State ──────────────────────────────────────────────────────────

export type GameState = {
  phase: GamePhase
  resources: Resources
  deck: DeckState
  currentCard: Card | null
  runConfig: RunConfig | null
  godPathProgress: number
  reshuffleCount: number
  unravellingTier: number
  pendingUnravelling: boolean
  turnCount: number
  failureReason: FailureReason | null
  pendingGameOver: { reason: string } | null
  blessings: BlessingsState
  cardRunState: Record<CardId, CardRunState>
  // Set when a partialVictory effect fires; null for full victory or no victory yet.
  // Store and VictoryScreen must read this to differentiate win types.
  partialVictoryGod: GodPath | null
  // Cards currently whisper-seeded for this run (Nyarlathotep only). CardIds from WHISPER_POOL.
  activeWhispers: CardId[]
  // The Deep Trade blessing: fired once per run.
  deepTradeUsed: boolean
  // The Patient Forest blessing: uses remaining (starts 2), and penalty flag.
  patientForestUsesRemaining: number
  patientForestPenaltyActive: boolean
  // Whispered Counsel blessing: penalty flag — next regular card has gains halved, costs doubled.
  whisperCounselPenaltyActive: boolean
  // Activity log: events from the most recent beat. Cleared & rebuilt per beat.
  activityLog: ActivityEntry[]
  // True after a beat completes; the next pushActivity call will reset the batch.
  activityBatchSealed: boolean
  // Rare rotation: tracks which rare IDs have been used this run to avoid re-seeding.
  usedRareIds: Set<string>
  // Core rotation: tracks which core IDs have been used this run to avoid re-seeding.
  usedCoreIds: Set<string>
  // Preparation tags set by prep-card options. Cleared on every reshuffle.
  // Consumed by chain-card bonus options gated via { type: 'hasPrepTag' }.
  prepTags: string[]
  // Run statistics: counts of skipped options and closed paths. Reset on resetGame.
  runStats: RunStats
}

// ─── Activity Log ─────────────────────────────────────────────────────────────
// One batch of rows shown beneath the DrawPile. A batch represents events from
// the most recent player-action beat (option resolved, reshuffle, or
// overflow/deficit fire). Cap = 3 rows; typical = 1-2.
export type ActivityInsertSource = 'godPath' | 'random' | 'overflow' | 'deficit' | 'doom' | 'option'
export type ActivityPurgeSource  = 'recover' | 'option'

export type ActivityEntry =
  | { kind: 'reshuffle';    count: number }
  | { kind: 'doomEscalate' }
  | { kind: 'insert';       card: CardSummary; source: ActivityInsertSource; flavour?: string; godPath?: GodPath }
  | { kind: 'purge';        card: CardSummary; source: ActivityPurgeSource }
  | { kind: 'randomOutcome'; flavour?: string; deltas: Array<{ resource: ResourceKey; delta: number }>; insertedCard?: CardSummary }
  | { kind: 'whisper';      cardIds: CardId[] }
  | { kind: 'mutationSeed'; cardTitles: string[] }
  | { kind: 'prepTagSet';     tag: string; label: string }
  | { kind: 'prepTagRemoved'; tag: string; label: string }
