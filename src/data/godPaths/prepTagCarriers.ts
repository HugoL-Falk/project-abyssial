import type { CardId, Card } from '../../types'
import { CORE_CARDS } from '../cards/core'
import { COMMON_CARDS } from '../cards/common'
import { RARE_CARDS } from '../cards/rare'
import { THREAT_CARDS } from '../cards/threats'

export type PrepTag = 'studied' | 'attended_seance' | 'opium_pact' | 'recited' | 'olgreth_prep'

export const PREP_TAG_LABELS: Record<PrepTag, string> = {
  studied:          'a deep reading',
  attended_seance:  'a séance attended',
  opium_pact:       'a dream-bargain',
  recited:          'the rite spoken',
  olgreth_prep:     'a prior arrangement',
}

export type PrepTagCarrier = { cardId: CardId; optionLabel: string }

// Derived once at module load. Walks the static card pool and indexes every
// option whose effects include a setPrepTag effect, grouping by tag.
function deriveCarriers(): Record<PrepTag, PrepTagCarrier[]> {
  const out: Record<PrepTag, PrepTagCarrier[]> = {
    studied: [],
    attended_seance: [],
    opium_pact: [],
    recited: [],
    olgreth_prep: [],
  }
  const pool: Card[] = [...CORE_CARDS, ...COMMON_CARDS, ...RARE_CARDS, ...THREAT_CARDS]
  for (const card of pool) {
    for (const opt of card.options) {
      for (const ef of opt.effects ?? []) {
        if (ef.type === 'setPrepTag' && ef.tag in out) {
          out[ef.tag as PrepTag].push({ cardId: card.id, optionLabel: opt.label })
        }
      }
    }
  }
  return out
}

export const PREP_TAG_CARRIERS: Record<PrepTag, PrepTagCarrier[]> = deriveCarriers()

export type PrepTagPill = { tag: PrepTag; label: string }

/** Maps held prep-tag keys to display descriptors. Unknown keys are skipped;
 *  input order is preserved. */
export function buildPrepTagPills(prepTags: string[]): PrepTagPill[] {
  return prepTags
    .filter((t): t is PrepTag => t in PREP_TAG_LABELS)
    .map(t => ({ tag: t, label: PREP_TAG_LABELS[t] }))
}
