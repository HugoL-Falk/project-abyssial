import { describe, it, expect, vi } from 'vitest'
import { expandEffects, expandEffectsWithCapture } from './effects'
import type { Effect } from '../types'

// ─── Helpers ───────────────────────────────────────────────────────────────────
const res = (resource: 'gold' | 'followers' | 'influence' | 'dread' | 'relics' | 'theChanged', delta: number): Effect =>
  ({ type: 'resource', resource, delta } as Effect)

// flatRes unused — remove
// const flatRes = (effects: Effect[], resource: string): number =>
//   effects.filter(e => e.type === 'resource').reduce((s, e) => s + e.delta, 0)

const rnd = (weight: number, effects: Effect[], flavour?: string) =>
  ({ weight, effects, flavourText: flavour } as const)

const rc = (outcomes: ReturnType<typeof rnd>[]): Effect =>
  ({ type: 'randomOutcome', outcomes })

// ─── expandEffects ─────────────────────────────────────────────────────────────
describe('expandEffects', () => {
  it('passes through non-randomOutcome effects unchanged', () => {
    const input: Effect[] = [res('gold', 2), res('dread', -1)]
    const result = expandEffects(input)
    expect(result).toEqual(input)
  })

  it('expands a single randomOutcome into its resolved effects', () => {
    // deterministic: both outcomes weight 1, first gets chosen (Math.random returns 0.5, r=1.0, subtract 1→ r=0 → break)
    // But we need deterministic tests. We'll spy on Math.random.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const input: Effect[] = [rc([
      rnd(1, [res('gold', 2)]),
      rnd(1, [res('gold', 3)]),
    ])]
    const result = expandEffects(input)
    expect(result).toEqual([res('gold', 2)])
    vi.restoreAllMocks()
  })

  it('picks the last outcome as fallback when random would overshoot', () => {
    // total weight = 2, Math.random returns 0.75 → roll = 1.5
    // subtract 1 → 0.5, subtract 1 → -0.5 → picks second outcome
    vi.spyOn(Math, 'random').mockReturnValue(0.75)
    const input: Effect[] = [rc([
      rnd(1, [res('gold', 1)]),
      rnd(1, [res('gold', 2)]),
    ])]
    const result = expandEffects(input)
    expect(result).toEqual([res('gold', 2)])
    vi.restoreAllMocks()
  })

  it('expands nested randomOutcomes recursively', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const input: Effect[] = [rc([
      rnd(1, [rc([
        rnd(1, [res('gold', 2)]),
        rnd(1, [res('gold', 3)]),
      ])]),
      rnd(1, [res('gold', 4)]),
    ])]
    // First RNG picks outer outcome 1 (roll=0→subtract 1→r≤0 → first). Inside, another RNG picks inner outcome 1.
    const result = expandEffects(input)
    expect(result).toEqual([res('gold', 2)])
    vi.restoreAllMocks()
  })

  it('preserves non-resource effects through expansion', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const input: Effect[] = [res('dread', -1), rc([
      rnd(1, [res('gold', 2)]),
      rnd(1, [res('gold', 3)]),
    ]), res('dread', 1)]
    const result = expandEffects(input)
    expect(result).toEqual([res('dread', -1), res('gold', 2), res('dread', 1)])
    vi.restoreAllMocks()
  })
})

// ─── expandEffectsWithCapture ──────────────────────────────────────────────────
describe('expandEffectsWithCapture', () => {
  it('returns null capturedOutcome when no randomOutcome exists', () => {
    const input: Effect[] = [res('gold', 2)]
    const { expanded, capturedOutcome } = expandEffectsWithCapture(input)
    expect(expanded).toEqual([res('gold', 2)])
    expect(capturedOutcome).toBeNull()
  })

  it('captures first randomOutcome with effects, flavourText, and slice markers', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const input: Effect[] = [
      res('dread', -1),
      rc([
        rnd(1, [res('gold', 2)], 'found gold'),
        rnd(1, [res('gold', 3)], 'found more gold'),
      ]),
      res('dread', 1),
    ]
    const { expanded, capturedOutcome } = expandEffectsWithCapture(input)
    expect(expanded).toEqual([res('dread', -1), res('gold', 2), res('dread', 1)])
    expect(capturedOutcome).toEqual({
      effects: [res('gold', 2)],
      flavourText: 'found gold',
      expandedStart: 1,
      expandedEnd: 2,
    })
    vi.restoreAllMocks()
  })

  it('only captures the first randomOutcome; subsequent ones are expanded without capture', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const input: Effect[] = [
      rc([
        rnd(1, [res('gold', 2)], 'first'),
        rnd(1, [res('gold', 3)]),
      ]),
      rc([
        rnd(1, [res('influence', 1)], 'second - should not be captured'),
        rnd(1, [res('influence', 2)]),
      ]),
    ]
    const { expanded, capturedOutcome } = expandEffectsWithCapture(input)
    expect(capturedOutcome).toEqual({
      effects: [res('gold', 2)],
      flavourText: 'first',
      expandedStart: 0,
      expandedEnd: 1,
    })
    // Second randomOutcome was expanded into gold+2 (first choice, mock returns 0)
    expect(expanded).toEqual([res('gold', 2), res('influence', 1)])
    vi.restoreAllMocks()
  })

  it('handles nested randomOutcomes — capture captures outer, inner gets expanded', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const input: Effect[] = [rc([
      rnd(1, [rc([
        rnd(1, [res('gold', 2)]),
        rnd(1, [res('gold', 3)]),
      ])], 'outer flavour'),
      rnd(1, [res('gold', 4)]),
    ])]
    const { expanded, capturedOutcome } = expandEffectsWithCapture(input)
    // Outer picked first outcome (nested rnd), inner nested also picks first (gold+2)
    expect(expanded).toEqual([res('gold', 2)])
    expect(capturedOutcome).toBeDefined()
    expect(capturedOutcome!.effects.length).toBe(1) // the nested randomOutcome itself
    expect(capturedOutcome!.flavourText).toBe('outer flavour')
    vi.restoreAllMocks()
  })
})