import type {
  Card,
  CardId,
  CardRunState,
  DeckState,
  Effect,
  Resources,
  RunConfig,
  VisibleOption,
} from '../types'
import { checkCondition } from './godPath'

// ─── expandEffects ────────────────────────────────────────────────────────────
// Pre-expands any randomOutcome effects into a flat resolved list.

export function expandEffects(effects: Effect[]): Effect[] {
  const result: Effect[] = []
  for (const e of effects) {
    if (e.type === 'randomOutcome') {
      const total = e.outcomes.reduce((s, o) => s + o.weight, 0)
      let r = Math.random() * total
      let chosen: Effect[] = e.outcomes[e.outcomes.length - 1]?.effects ?? []
      for (const o of e.outcomes) { r -= o.weight; if (r <= 0) { chosen = o.effects; break } }
      result.push(...expandEffects(chosen))
    } else {
      result.push(e)
    }
  }
  return result
}

// Variant: expands AND captures the chosen outcome's effect list + flavourText (for display).
// expandedStart/expandedEnd mark the slice of `expanded` that came from the random expansion,
// so callers can tag those insertCard effects with source:'random' and the flavour text.
export function expandEffectsWithCapture(effects: Effect[]): {
  expanded: Effect[]
  capturedOutcome: { effects: Effect[]; flavourText?: string; expandedStart: number; expandedEnd: number } | null
} {
  let capturedOutcome: { effects: Effect[]; flavourText?: string; expandedStart: number; expandedEnd: number } | null = null
  const result: Effect[] = []
  for (const e of effects) {
    if (e.type === 'randomOutcome') {
      const total = e.outcomes.reduce((s, o) => s + o.weight, 0)
      let r = Math.random() * total
      let chosenOutcome = e.outcomes[e.outcomes.length - 1] ?? { weight: 0, effects: [] }
      for (const o of e.outcomes) { r -= o.weight; if (r <= 0) { chosenOutcome = o; break } }
      if (capturedOutcome === null) {
        const expandedStart = result.length
        const expanded = expandEffects(chosenOutcome.effects)
        result.push(...expanded)
        capturedOutcome = {
          effects: chosenOutcome.effects,
          flavourText: chosenOutcome.flavourText,
          expandedStart,
          expandedEnd: result.length,
        }
      } else {
        result.push(...expandEffects(chosenOutcome.effects))
      }
    } else {
      result.push(e)
    }
  }
  return { expanded: result, capturedOutcome }
}

// ─── getAvailableOptions ──────────────────────────────────────────────────────
// Pure utility: evaluates conditions and returns visible options for a card.
// Retained from gameLoop.ts because escalates-removal.test.ts uses it.

export function getAvailableOptions(
  card: Card,
  condCtx: {
    resources: Resources
    deck: DeckState
    godPathProgress: number
    runConfig: RunConfig | null
    cardRunState?: Record<CardId, CardRunState>
    prepTags?: string[]
  },
  cardRunState?: Record<CardId, CardRunState>
): VisibleOption[] {
  return card.options.map((opt, idx) => {
    const available = opt.condition
      ? checkCondition(opt.condition, { ...condCtx, cardRunState: cardRunState ?? condCtx.cardRunState })
      : true

    const effectiveEffects: Effect[] = [...opt.effects]

    const hidden = !available && (opt.hideWhenUnavailable ?? false)
    return { idx, option: opt, available, effectiveEffects, hidden }
  })
}