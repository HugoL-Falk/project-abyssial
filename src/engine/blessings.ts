import type { BlessingId, GodPath } from '../types'

const STORAGE_KEY          = 'abyssial_unlocked_blessings'
const WON_LAST_RUN_KEY      = 'abyssial_won_last_run'
const WON_LAST_RUN_ONCE_KEY = 'abyssial_won_last_run_once'
const TUTORIAL_COMPLETE_KEY  = 'abyssial_tutorial_complete'
const DEFAULT_BLESSINGS: BlessingId[] = []  // no starting blessings; unlocked by god path wins

// Single source of truth: which blessings each god unlocks when summoned.
const GOD_BLESSING_MAP: Partial<Record<GodPath, BlessingId[]>> = {
  yha_nthlei:     ['salt_on_the_tongue', 'the_drowned_mark', 'the_deep_trade'],
  nyarlathotep:   ['the_signals_echo', 'the_crawling_network', 'whispered_counsel'],
  shub_niggurath: ['root_deep', 'the_groves_gift', 'the_patient_forest'],
}

export function loadUnlockedBlessings(): BlessingId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_BLESSINGS]
    const parsed = JSON.parse(raw) as BlessingId[]
    return Array.isArray(parsed) ? parsed : [...DEFAULT_BLESSINGS]
  } catch {
    return [...DEFAULT_BLESSINGS]
  }
}

export function saveUnlockedBlessings(ids: BlessingId[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // localStorage unavailable — continue without persistence
  }
}

export function loadTutorialComplete(): boolean {
  try { return localStorage.getItem(TUTORIAL_COMPLETE_KEY) === 'true' } catch { return false }
}

export function saveTutorialComplete(): void {
  try { localStorage.setItem(TUTORIAL_COMPLETE_KEY, 'true') } catch {}
}

export function unlockBlessingsForGod(existing: BlessingId[], godPath: GodPath): BlessingId[] {
  const toAdd = GOD_BLESSING_MAP[godPath] ?? []
  const updated = [...existing]
  for (const id of toAdd) {
    if (!updated.includes(id)) updated.push(id)
  }
  return updated
}

// Reverse of the godBlessingMap above: which god, when summoned, unlocks a
// given blessing. Used by the blessing-select screen to show locked rows as
// "Unlocked when summoning <God>" (P20-K) instead of the vague "Complete a run".
export function getUnlockingGod(blessingId: BlessingId): GodPath | null {
  for (const god of Object.keys(GOD_BLESSING_MAP) as GodPath[]) {
    if (GOD_BLESSING_MAP[god]!.includes(blessingId)) return god
  }
  return null
}

export function getMaxSelectableBlessings(wonLastRun: boolean): number {
  return wonLastRun ? 4 : 3
}

export function loadWonLastRun(): boolean {
  try { return localStorage.getItem(WON_LAST_RUN_KEY) === 'true' } catch { return false }
}

export function saveWonLastRun(won: boolean): void {
  try { localStorage.setItem(WON_LAST_RUN_KEY, String(won)) } catch {}
}

// Partial-win bonus: grants 4-slot blessing select for the very next run only.
// Cleared by startRun() the moment a run begins.
export function loadWonLastRunOnce(): boolean {
  try { return localStorage.getItem(WON_LAST_RUN_ONCE_KEY) === 'true' } catch { return false }
}

export function saveWonLastRunOnce(won: boolean): void {
  try { localStorage.setItem(WON_LAST_RUN_ONCE_KEY, String(won)) } catch {}
}
