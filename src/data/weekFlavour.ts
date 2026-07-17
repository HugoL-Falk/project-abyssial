// ─── Week flavour copy ────────────────────────────────────────────────────────
// Looked up per reshuffle by getUnravellingTier(reshuffleCount). Tier table
// lives in src/engine/deck.ts — do not duplicate.

export type WeekFlavourTier = 1 | 2 | 3 | 4

const POOLS: Record<WeekFlavourTier, readonly string[]> = {
  1: [
    'the week brings new tasks',
    'a quiet week, so far',           // P22-58: replaced "another week in the cult" (Week 2+ implied)
  ],
  2: [
    'something stirs beneath the routine',
    'the faithful exchange glances',
    'small wrongnesses accumulate',
  ],
  3: [
    'the week breaks wrong',
    'the air will not settle',
    'duties feel like rites now',
  ],
  4: [
    'the congregation has changed',
    'what wakes is not what slept',
    'this week is not yours',
  ],
}

// P22-58: reshuffleCount passed so Week 1 gets a fresh-start line rather than
// the general tier-1 pool (which reads as familiar routine, not first week).
export function pickWeekFlavour(tier: WeekFlavourTier, reshuffleCount?: number): string {
  if (reshuffleCount === 0) return 'the first account opens'
  const pool = POOLS[tier]
  return pool[Math.floor(Math.random() * pool.length)]
}
