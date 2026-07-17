import type { GameState, GamePhase, Resources, RunConfig, GodPath, CardId, CardRunState, BlessingId } from '../types'

export const SAVE_KEY   = 'project_abyssial_save'
const SAVE_VERSION = 2

// ── Serialised shape (deck stored as ID arrays) ────────────────────────────────

export interface SaveData {
  version:    typeof SAVE_VERSION
  timestamp:  number
  phase:      GamePhase
  resources:  Resources
  deckIds: {
    drawPile:        string[]
    discardPile:     string[]
    permDiscardPile: string[]
    chainReserve:    string[]
    nextCycleQueue:  string[]
  }
  currentCardId:           string | null
  runConfig:               RunConfig
  godPathProgress:         number
  reshuffleCount:          number
  unravellingTier:         number
  pendingUnravelling:      boolean
  turnCount:               number
  blessings:               { unlocked: BlessingId[]; selected: BlessingId[] }
  cardRunState:            Record<CardId, CardRunState>
  partialVictoryGod:       GodPath | null
  activeWhispers:          CardId[]
  deepTradeUsed:           boolean
  patientForestUsesRemaining:   number
  patientForestPenaltyActive:   boolean
  whisperCounselPenaltyActive:  boolean
  usedRareIds?:                 string[]   // optional for backward-compat with saves predating P13-24(a)
  usedCoreIds?:                 string[]   // optional for pre-P13-24 week-cadence saves
  prepTags?:                    string[]   // optional for backward-compat with pre-prep saves
}

// ── Write ─────────────────────────────────────────────────────────────────────

export function saveRun(state: GameState): void {
  if (state.phase !== 'playing') return
  const data: SaveData = {
    version:   SAVE_VERSION,
    timestamp: Date.now(),
    phase:     state.phase,
    resources: state.resources,
    deckIds: {
      drawPile:        state.deck.drawPile.map(c => c.id),
      discardPile:     state.deck.discardPile.map(c => c.id),
      permDiscardPile: state.deck.permDiscardPile.map(c => c.id),
      chainReserve:    state.deck.chainReserve.map(c => c.id),
      nextCycleQueue:  state.deck.nextCycleQueue.map(c => c.id),
    },
    currentCardId:              state.currentCard?.id ?? null,
    runConfig:                  state.runConfig!,
    godPathProgress:            state.godPathProgress,
    reshuffleCount:             state.reshuffleCount,
    unravellingTier:            state.unravellingTier,
    pendingUnravelling:         state.pendingUnravelling,
    turnCount:                  state.turnCount,
    blessings:                  state.blessings,
    cardRunState:               state.cardRunState,
    partialVictoryGod:          state.partialVictoryGod,
    activeWhispers:             state.activeWhispers,
    deepTradeUsed:              state.deepTradeUsed,
    patientForestUsesRemaining: state.patientForestUsesRemaining,
    patientForestPenaltyActive: state.patientForestPenaltyActive,
    whisperCounselPenaltyActive: state.whisperCounselPenaltyActive,
    usedRareIds:                Array.from(state.usedRareIds),
    usedCoreIds:                Array.from(state.usedCoreIds),
    prepTags:                   state.prepTags,
  }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)) } catch {}
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function loadSaveData(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SaveData
    if (data.version !== SAVE_VERSION) { clearSave(); return null }
    return data
  } catch { return null }
}

export function hasSave(): boolean {
  return loadSaveData() !== null
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function clearSave(): void {
  try { localStorage.removeItem(SAVE_KEY) } catch {}
}
