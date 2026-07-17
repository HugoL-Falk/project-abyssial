import type { Card, CardId, CardOption } from '../types'

// ─── Whisper Pool ─────────────────────────────────────────────────────────────
// 23 eligible cards. 5 activate per run, chosen randomly at seed time.
// Which 5 are active is unknown to the player until they draw an affected card.

export const WHISPER_POOL_COMMONS: CardId[] = [
  'congregation_meets',
  'the_donation',
  'the_inheritance',
  'the_newspaper',
  'word_spreads',
  'the_harbormaster',
  'the_left_item',
  'the_collection',
  'the_complaint',
  'the_delayed_shipment',
]

export const WHISPER_POOL_CORE: CardId[] = [
  'the_landlord_cometh',
  'follower_confesses_doubt',
  'the_old_book',
  'rival_stirs',
  'academic_society',
  'the_seance',
  'stranger_asks_questions',
  'the_harbour',
  'the_fire',
  'the_printing_press',
  'the_opium_den',
  'the_wedding_rite',
  'supplies_dwindle',
]

export const WHISPER_POOL_IDS: CardId[] = [
  ...WHISPER_POOL_COMMONS,
  ...WHISPER_POOL_CORE,
]

// Whisper option injected onto the card when it is drawn and active.
// All whisper options cost Dread +2 (included in effects).
export const WHISPER_OPTIONS: Record<CardId, CardOption> = {
  // ── Commons ──────────────────────────────────────────────────────────────

  congregation_meets: {
    label: '"Speak what they\'re already thinking."',
    flavourText: 'The words landed like coins in a bowl. The air felt heavier. Nothing was agreed.',
    effects: [
      { type: 'resource', resource: 'gold',      delta:  3 },
      { type: 'resource', resource: 'influence', delta: -1 },
      { type: 'resource', resource: 'dread',     delta:  2 },
    ],
    isWhisper: true,
    replacesSlot: 0,
  },

  the_donation: {
    label: '"You already know who sent it."',
    flavourText: 'You did. The money arrived anyway. No note this time.',
    effects: [
      { type: 'resource', resource: 'gold',  delta: 3 },
      { type: 'resource', resource: 'dread', delta: 2 },
      { type: 'insertCard', cardId: 'strings_attached', position: 'random', minPos: 4, maxPos: 8 },
    ],
    isWhisper: true,
    replacesSlot: 0,
  },

  the_inheritance: {
    label: '"The family was never going to win."',
    flavourText: 'The family was already gone. We only made it official.',
    effects: [
      { type: 'randomOutcome', outcomes: [
        { weight: 1, effects: [{ type: 'resource', resource: 'relics',    delta: -1 }], flavourText: 'The court found against you. What you lost was not gold.' },
        { weight: 1, effects: [{ type: 'resource', resource: 'followers', delta: -2 }], flavourText: 'Two left before the verdict was read.' },
        { weight: 1, effects: [{ type: 'resource', resource: 'gold',      delta: -2 }], flavourText: 'The case collapsed. The family was pleased.' },
        { weight: 1, effects: [{ type: 'resource', resource: 'gold',      delta:  3 }], flavourText: 'The settlement was unexpectedly generous.' },
        { weight: 1, effects: [{ type: 'resource', resource: 'influence', delta:  2 }], flavourText: 'The judge was a reader. He remembered your name.' },
        { weight: 1, effects: [{ type: 'resource', resource: 'relics',    delta:  1 }], flavourText: 'The estate contained something the family had not inventoried.' },
      ]},
    ],
    isWhisper: true,
    replacesSlot: 0,
  },

  the_newspaper: {
    label: '"The wrong people are already reading it."',
    flavourText: 'The story ran where it should have. The scrutiny came faster.',
    effects: [
      { type: 'resource', resource: 'influence', delta: 3 },
      { type: 'resource', resource: 'dread',     delta: 2 },
      { type: 'insertCard', cardId: 'the_newspaper_article', position: 'random', minPos: 4, maxPos: 8 },
    ],
    isWhisper: true,
    replacesSlot: 1,
  },

  word_spreads: {
    label: '"It\'s further than you think."',
    flavourText: 'The word reached further than expected. They were already quoting it back at us.',
    effects: [
      { type: 'resource', resource: 'influence', delta: 2 },
      { type: 'resource', resource: 'dread',     delta: 3 },
      { type: 'resource', resource: 'followers', delta: 2 },
    ],
    isWhisper: true,
    replacesSlot: 0,
  },

  the_harbormaster: {
    label: '"He already knows the price."',
    flavourText: 'He named the price. We paid. The one who didn\'t return was already written off.',
    effects: [
      { type: 'resource', resource: 'gold',      delta:  3 },
      { type: 'resource', resource: 'followers', delta: -1 },
      { type: 'resource', resource: 'dread',     delta:  2 },
    ],
    isWhisper: true,
    replacesSlot: 2,
  },

  the_left_item: {
    label: '"It was always going to be left."',
    flavourText: 'It sat where he left it. Three new faces appeared the day someone moved it.',
    effects: [
      { type: 'resource', resource: 'followers', delta: 2 },
      { type: 'resource', resource: 'dread',     delta: 3 },
    ],
    isWhisper: true,
    replacesSlot: 2,
  },

  the_collection: {
    label: '"They give what is asked of them."',
    flavourText: 'They gave what was asked. Two of them won\'t be asked again.',
    effects: [
      { type: 'resource', resource: 'gold',      delta:  3 },
      { type: 'resource', resource: 'followers', delta: -2 },
      { type: 'resource', resource: 'dread',     delta:  1 },
    ],
    isWhisper: true,
    replacesSlot: 0,
  },

  the_complaint: {
    label: '"The silence is an answer."',
    flavourText: 'We said nothing. They heard authority in it.',
    effects: [
      { type: 'resource', resource: 'dread',     delta: 2 },
      { type: 'resource', resource: 'followers', delta: 2 },
    ],
    isWhisper: true,
    replacesSlot: 2,
  },

  the_delayed_shipment: {
    label: '"You already knew what was in it."',
    flavourText: 'It arrived empty. We\'d already removed what mattered.',
    effects: [
      { type: 'resource', resource: 'gold',      delta: 1 },
      { type: 'resource', resource: 'influence', delta: 2 },
      { type: 'resource', resource: 'dread',     delta: 2 },
    ],
    isWhisper: true,
    replacesSlot: 2,
  },

  // ── Core ─────────────────────────────────────────────────────────────────

  the_landlord_cometh: {
    label: '"He won\'t ask twice."',
    flavourText: 'The payment was prompt. One of ours offered to make the delivery.',
    effects: [
      { type: 'resource', resource: 'gold',      delta: -2 },
      { type: 'resource', resource: 'followers', delta:  1 },
      { type: 'resource', resource: 'dread',     delta:  2 },
    ],
    isWhisper: true,
    replacesSlot: 0,
  },

  follower_confesses_doubt: {
    label: '"Agree with them."',
    flavourText: 'The doubt was real. So was what replaced it.',
    effects: [
      { type: 'resource', resource: 'followers', delta: 2 },
      { type: 'resource', resource: 'dread',     delta: 2 },
    ],
    isWhisper: true,
    replacesSlot: 0,
  },

  the_old_book: {
    label: '"Read it in the voice it was written in."',
    flavourText: 'The language was wrong. The meaning was precise.',
    effects: [
      { type: 'resource', resource: 'dread',  delta: 5 },
      { type: 'resource', resource: 'relics', delta: 2 },
    ],
    isWhisper: true,
    replacesSlot: 0,
  },

  rival_stirs: {
    label: '"They were already listening."',
    flavourText: 'The rival cult was never a rival. They were an audience waiting for the right speaker.',
    effects: [
      { type: 'resource', resource: 'followers', delta: 3 },
      { type: 'resource', resource: 'dread',     delta: 2 },
      { type: 'removeCard', cardId: 'rival_escalation' },
      { type: 'removeCard', cardId: 'their_survivors' },
    ],
    isWhisper: true,
    replacesSlot: 2,
  },

  academic_society: {
    label: '"Tell them what you\'ve actually found."',
    flavourText: 'Several left. More arrived the following week. The ones who arrived had already heard.',
    effects: [
      { type: 'resource', resource: 'influence', delta: 3 },
      { type: 'resource', resource: 'dread',     delta: 2 },
      { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 5, maxPos: 9 },
    ],
    isWhisper: true,
    replacesSlot: 1,
  },

  the_seance: {
    label: '"Let it have the room."',
    flavourText: 'It occupied the room entirely. One of ours stayed behind. Something sat where they had been.',
    effects: [
      { type: 'resource', resource: 'followers', delta: -1 },
      { type: 'resource', resource: 'relics',    delta:  1 },
      { type: 'resource', resource: 'dread',     delta:  3 },
    ],
    isWhisper: true,
    replacesSlot: 1,
  },

  stranger_asks_questions: {
    label: '"Show him the church."',
    flavourText: 'He saw the space between the prayer and the practice. He stayed anyway.',
    effects: [
      { type: 'resource', resource: 'influence', delta: 2 },
      { type: 'resource', resource: 'dread',     delta: 2 },
    ],
    isWhisper: true,
    replacesSlot: 0,
  },

  the_harbour: {
    label: '"What they\'re pulling up isn\'t fish."',
    flavourText: 'Three of the crew knew what it was. The rest found out by proxy.',
    effects: [
      { type: 'resource', resource: 'gold',      delta: -2 },
      { type: 'resource', resource: 'followers', delta:  3 },
      { type: 'resource', resource: 'dread',     delta:  2 },
    ],
    isWhisper: true,
    replacesSlot: 0,
  },

  the_fire: {
    label: '"You know why this happened."',
    flavourText: 'They suspect us now. Someone found that suspicious compelling.',
    effects: [
      { type: 'resource', resource: 'gold',      delta:  1 },
      { type: 'resource', resource: 'followers', delta:  1 },
      { type: 'resource', resource: 'dread',     delta:  2 },
    ],
    isWhisper: true,
    replacesSlot: 1,
  },

  the_printing_press: {
    label: '"Put what it asked you to put."',
    flavourText: 'The run cost more than expected. The text arrived anyway. No corrections needed.',
    effects: [
      { type: 'resource', resource: 'gold',      delta: -2 },
      { type: 'resource', resource: 'influence', delta:  3 },
      { type: 'resource', resource: 'dread',     delta:  2 },
    ],
    isWhisper: true,
    replacesSlot: 0,
  },

  the_opium_den: {
    label: '"Let them go as far as they can."',
    flavourText: 'Two of them went further than they came back. A relic surfaced in the exchange.',
    effects: [
      { type: 'resource', resource: 'followers', delta: -2 },
      { type: 'resource', resource: 'dread',     delta:  3 },
      { type: 'setPrepTag', tag: 'opium_pact' },
      { type: 'resource', resource: 'relics',    delta:  1 },
    ],
    condition: { type: 'resourceMin', resource: 'followers', min: 2 },
    isWhisper: true,
    replacesSlot: 0,
  },

  the_wedding_rite: {
    label: '"Say what it gave you to say."',
    flavourText: 'The words came as a gift. The followers heard them as a summons. Both correct.',
    effects: [
      { type: 'resource', resource: 'followers', delta: 2 },
      { type: 'resource', resource: 'dread',     delta: 3 },
    ],
    isWhisper: true,
    replacesSlot: 2,
  },

  supplies_dwindle: {
    label: '"Something already provided."',
    flavourText: 'The provisions ran out. The whisper did not. No one mentioned the discrepancy.',
    effects: [
      { type: 'resource', resource: 'followers', delta:  2 },
      { type: 'resource', resource: 'dread',     delta:  2 },
    ],
    isWhisper: true,
    replacesSlot: 0,
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Generic fallback whisper for Whispered Counsel blessing (any regular card can be seeded).
const GENERIC_WHISPER_OPTION: CardOption = {
  label: 'The signal reaches here',
  flavourText: 'Something cuts through the noise. A voice that should not be here. It is offering something.',
  effects: [{ type: 'resource', resource: 'dread', delta: 2 }],
  isWhisper: true,
}

/**
 * Returns the injected whisper CardOption for a drawn card, or null if not active this run.
 * Falls back to a generic whisper option for cards not in the pre-designed pool.
 */
export function getWhisperOption(cardId: CardId, activeWhispers: CardId[]): CardOption | null {
  if (!activeWhispers.includes(cardId)) return null
  return WHISPER_OPTIONS[cardId] ?? GENERIC_WHISPER_OPTION
}

/**
 * Plan a whisper seed against the current draw pile.
 *
 * Returns:
 *   - newTargets: the CardIds to add to activeWhispers
 *   - cardsToInsert: subset of newTargets whose card is NOT currently in the
 *     draw pile and therefore needs to be physically inserted by the caller
 *     so the player can actually draw it.
 *
 * Algorithm:
 *   1. eligible = WHISPER_POOL_IDS - alreadyActive
 *   2. cap = min(count, 10 - alreadyActive.length)
 *   3. partition eligible by whether id appears in drawPile
 *   4. drain inPile first (no insert), then notInPile (insert)
 *   5. each partition shuffled independently
 */
export function applyWhisperSeed(
  count: number,
  alreadyActive: CardId[],
  drawPile: Card[]
): { newTargets: CardId[]; cardsToInsert: CardId[] } {
  const cap = Math.min(count, 10 - alreadyActive.length)
  if (cap <= 0) return { newTargets: [], cardsToInsert: [] }

  const pileIds = new Set(drawPile.map(c => c.id))
  const eligible = WHISPER_POOL_IDS.filter(id => !alreadyActive.includes(id))

  const inPile = eligible.filter(id => pileIds.has(id))
  const notInPile = eligible.filter(id => !pileIds.has(id))

  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)
  const inPileShuf = shuffle(inPile)
  const notInPileShuf = shuffle(notInPile)

  const newTargets: CardId[] = []
  const cardsToInsert: CardId[] = []

  while (newTargets.length < cap && inPileShuf.length > 0) {
    newTargets.push(inPileShuf.shift()!)
  }
  while (newTargets.length < cap && notInPileShuf.length > 0) {
    const id = notInPileShuf.shift()!
    newTargets.push(id)
    cardsToInsert.push(id)
  }

  return { newTargets, cardsToInsert }
}
