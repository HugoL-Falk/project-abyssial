import type { Resources, ResourceKey, Effect } from '../types'

export const RESOURCE_DISPLAY_MIN = 0
export const RESOURCE_DISPLAY_MAX = 10
export const DREAD_DANGER_THRESHOLD = 10

export const STARTING_RESOURCES: Resources = {
  gold: 3,
  followers: 3,
  influence: 3,
  dread: 0,
  relics: 0,
  theChanged: 0,
}

export const RESOURCE_MIN = 0
export const RESOURCE_MAX = 10

// Uncapped resources: no ceiling. Dread spirals; relics are the safety valve.
const UNCAPPED: ResourceKey[] = ['dread', 'relics', 'theChanged']

export function applyDelta(resources: Resources, key: ResourceKey, delta: number): Resources {
  const raw = resources[key] + delta
  if (UNCAPPED.includes(key)) {
    return { ...resources, [key]: Math.max(0, raw) }
  }
  // Gold, followers, influence: clamped to [0, 10]. Overflow is handled by the store.
  return { ...resources, [key]: Math.max(RESOURCE_MIN, Math.min(RESOURCE_MAX, raw)) }
}

export function clampDisplayValue(value: number): number {
  return Math.max(RESOURCE_DISPLAY_MIN, Math.min(RESOURCE_DISPLAY_MAX, value))
}

export function isDreadMaxed(resources: Resources): boolean {
  return resources.dread >= DREAD_DANGER_THRESHOLD
}

// ─── P16-39: affordability ────────────────────────────────────────────────
//
// Compute per-resource shortfall for an option's effects. Returns an empty
// object when affordable; otherwise maps each unaffordable resource to the
// positive integer shortfall (how much MORE the player would need).
//
// Skips dread: -dread floors at 0 and over-paying reduction is intentional.
// Skips randomOutcome nesting: probabilistic outcomes are surprises by
// design — the player commits only to the parent option's top-level cost.
// Skips non-resource effects entirely (insertCard, removeCard, etc.).

const SKIPPED_RESOURCES: ReadonlySet<ResourceKey> = new Set(['dread'])

export function affordabilityShortfall(
  effects: Effect[],
  resources: Resources,
): Partial<Record<ResourceKey, number>> {
  const costs: Partial<Record<ResourceKey, number>> = {}
  for (const e of effects) {
    if (e.type !== 'resource') continue
    if (e.delta >= 0) continue
    if (SKIPPED_RESOURCES.has(e.resource)) continue
    costs[e.resource] = (costs[e.resource] ?? 0) + e.delta
  }
  const shortfall: Partial<Record<ResourceKey, number>> = {}
  for (const r of Object.keys(costs) as ResourceKey[]) {
    const projected = resources[r] + costs[r]!
    if (projected < 0) shortfall[r] = -projected
  }
  return shortfall
}

// ─── P18-10: redundant requirement pill suppression ───────────────────────
//
// Returns true when a requirement (resource + minimum value) is already
// fully covered by the option's costs — i.e. the player must spend at least
// that much of the resource anyway, so showing "≥N" is redundant next to a
// "-N" cost pill.
//
// `req.value` is the minimum (positive integer).
// `costs` are the raw effect deltas (negative numbers).

export function reqRedundant(
  req: { resource: string; value: number },
  costs: Array<{ resource: string; value: number }>,
): boolean {
  const totalCost = costs
    .filter(c => c.resource === req.resource)
    .reduce((sum, c) => sum + Math.abs(c.value), 0)
  return totalCost >= req.value
}
