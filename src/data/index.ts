import type { Card, CardId, GodPath } from '../types'
import { CORE_CARDS } from './cards/core'
import { COMMON_CARDS } from './cards/common'
import { RARE_CARDS, DARK_YOUNG_GUARDIAN } from './cards/rare'
import { SPECIAL_CARDS } from './cards/special'
import { TREAT_CARDS } from './cards/treats'
import { THREAT_CARDS } from './cards/threats'
import { UNRAVELLING_CARDS, getUnravellingCard } from './cards/unravelling'
import { YHA_NTHLEI_CHAIN } from './godPaths/yha_nthlei'
import { NYARLATHOTEP_CHAIN, THE_MOVING_PAINTING } from './godPaths/nyarlathotep'
import { SHUB_NIGGURATH_CHAIN, SHUB_WORDS_COME_NATURALLY } from './godPaths/shub_niggurath'
import { ALL_BLESSINGS } from './blessings'
import { MUTATION_CARDS, MUTATION_MAP } from './cards/mutations'
import {
  TUTORIAL_CARDS,
  tutorial_doom_card,
  tutorial_threat_card,
  tutorial_treat_card,
  tutorial_reshuffle_card,
  tutorial_prep_react,
  olgreth_1,
  olgreth_2,
} from './cards/tutorial'

export { CORE_CARDS, COMMON_CARDS, RARE_CARDS, DARK_YOUNG_GUARDIAN, SPECIAL_CARDS, TREAT_CARDS, THREAT_CARDS, UNRAVELLING_CARDS, getUnravellingCard }
export { YHA_NTHLEI_CHAIN, NYARLATHOTEP_CHAIN, THE_MOVING_PAINTING, SHUB_NIGGURATH_CHAIN, SHUB_WORDS_COME_NATURALLY }
export { ALL_BLESSINGS }
export { MUTATION_CARDS, MUTATION_MAP }
export { TUTORIAL_CARDS }

export const GOD_PATH_CHAINS: Record<GodPath, Card[]> = {
  yha_nthlei:     YHA_NTHLEI_CHAIN,
  nyarlathotep:   NYARLATHOTEP_CHAIN,
  shub_niggurath: SHUB_NIGGURATH_CHAIN,
  olgreth:        [olgreth_1, olgreth_2],
}

// Flat registry for O(1) card lookup by id
const ALL_CARDS: Card[] = [
  ...TUTORIAL_CARDS,
  tutorial_doom_card,        // dynamically inserted — not in starting deck
  tutorial_threat_card,      // dynamically inserted — not in starting deck
  tutorial_treat_card,       // dynamically inserted — not in starting deck
  tutorial_reshuffle_card,   // dynamically inserted — not in starting deck
  tutorial_prep_react,       // dynamically inserted by tutorial_prep_intro — not in starting deck
  olgreth_2,                 // queued post-reshuffle by advanceGodPath; not in TUTORIAL_CARDS
  ...CORE_CARDS,
  ...COMMON_CARDS,
  ...RARE_CARDS,
  DARK_YOUNG_GUARDIAN,
  ...SPECIAL_CARDS,
  ...TREAT_CARDS,
  ...THREAT_CARDS,
  ...Object.values(UNRAVELLING_CARDS),
  ...YHA_NTHLEI_CHAIN,
  ...NYARLATHOTEP_CHAIN,
  ...SHUB_NIGGURATH_CHAIN,
  SHUB_WORDS_COME_NATURALLY,
  THE_MOVING_PAINTING,
  ...MUTATION_CARDS,
]

export const CARD_REGISTRY: Map<CardId, Card> = new Map(ALL_CARDS.map(c => [c.id, c]))

export function getCardById(id: CardId): Card | undefined {
  return CARD_REGISTRY.get(id)
}

export function getNextChainCard(godPath: GodPath, currentStage: number): Card | undefined {
  return GOD_PATH_CHAINS[godPath]?.find(c => c.chainStage === currentStage + 1)
}

export const GOD_PATH_NAMES: Record<GodPath, string> = {
  yha_nthlei:     "Y'ha-nthlei",
  nyarlathotep:   'Nyarlathotep',
  shub_niggurath: 'Shub-Niggurath',
  olgreth:        'Olgreth',
}

export const GOD_PATH_SUBTITLES: Record<GodPath, string> = {
  yha_nthlei:     'The Drowned Covenant',
  nyarlathotep:   'The Crawling Signal',
  shub_niggurath: 'The Root That Remembers',
  olgreth:        'The Hollow Thought',
}

// P18-6: who they are + a brief mysterious hook, shown on the god-select screen.
// P22-27: rewritten — previous text hinted at gameplay outcomes; new text is
// pure mythos, grounded in observed town-level strangeness. ~130 chars each.
export const GOD_PATH_LORE: Record<GodPath, string> = {
  yha_nthlei:     'A shadow has been spreading beneath the surface. Nearby businesses have gone dark and people have been seen approached by peculiar men and disappear.',
  nyarlathotep:   "An unseen presence has been spreading. Whispers in the static on the radio, and inserted into words in speeches no one prepared. It's growing.",
  shub_niggurath: "The forest and wildlife has changed. Foragers return and speak about effigies and something old. The trees respond when it's being mentioned.",
  olgreth:        'A thought that persists after the mind that held it is gone. Several of our people report thinking it now. They do not discuss it.',
}
