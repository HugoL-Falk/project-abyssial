import type { Card, CardOption } from '../types'
import { seededRng, hashString } from './seededRng'

/**
 * If a card has pooled options, select optionPoolSize of them (one per categoryKey),
 * using a seed derived from cardId + drawCount for determinism within a session.
 * Non-pooled options are always included unchanged.
 * If a checkCondition function is provided, skips options whose condition fails
 * (falls back to next in category; uses first in category if all fail).
 */
export function applyPooledOptions(
  card: Card,
  drawCount: number,
  checkCondition?: (opt: CardOption) => boolean,
): Card {
  const pooled    = card.options.filter(o => o.pooled)
  const nonPooled = card.options.filter(o => !o.pooled)
  if (pooled.length === 0) return card

  const poolSize = card.optionPoolSize ?? 2
  const rng      = seededRng(hashString(`${card.id}:${drawCount}`))

  // Group by categoryKey
  const byCategory = new Map<string, CardOption[]>()
  for (const opt of pooled) {
    const key = opt.categoryKey ?? '__default__'
    if (!byCategory.has(key)) byCategory.set(key, [])
    byCategory.get(key)!.push(opt)
  }

  // Fisher-Yates shuffle of category keys
  const categories = [...byCategory.keys()]
  for (let i = categories.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [categories[i], categories[j]] = [categories[j], categories[i]]
  }

  // Pick poolSize categories; from each pick first passing option (fallback: first)
  const selected: CardOption[] = []
  for (const cat of categories) {
    if (selected.length >= poolSize) break
    const opts = [...byCategory.get(cat)!]
    // Shuffle within category
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]]
    }
    const pick = checkCondition
      ? (opts.find(o => !o.condition || checkCondition(o)) ?? opts[0])
      : opts[0]
    selected.push(pick)
  }

  return { ...card, options: [...nonPooled, ...selected] }
}
