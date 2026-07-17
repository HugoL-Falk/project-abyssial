import type { GameState, GodPath } from '../types'

export interface PathLockoutRule {
  pathName: string
  isClosed: (state: GameState) => boolean
}

export const PATH_LOCKOUT_RULES: Partial<Record<GodPath, PathLockoutRule[]>> = {
  yha_nthlei: [
    {
      pathName: 'the recited descent',
      isClosed: (s) =>
        s.godPathProgress >= 5 &&
        !(s.prepTags ?? []).includes('recited'),
    },
  ],
  // nyarlathotep + shub_niggurath: deferred to per-god follow-up tickets
}

/**
 * Returns the set of path-names newly closed by `state` that are not already in `alreadyClosed`.
 * Pure — caller is responsible for applying the result to RunStats.
 */
export function newlyClosedPaths(state: GameState, alreadyClosed: string[]): string[] {
  const godPath = state.runConfig?.godPath
  if (!godPath) return []
  const rules = PATH_LOCKOUT_RULES[godPath] ?? []
  const out: string[] = []
  for (const rule of rules) {
    if (alreadyClosed.includes(rule.pathName)) continue
    if (rule.isClosed(state)) out.push(rule.pathName)
  }
  return out
}
