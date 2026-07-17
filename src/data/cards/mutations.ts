import type { Card } from '../../types'

// ─── Mutation Pool Cards ───────────────────────────────────────────────────────
// Seeded into the deck by the seedMutations effect (Shub-Niggurath runs only).
// Each card has a dark option hidden on first draw, visible on second draw.
// Dark options grant +1 theChanged on resolution.

export const MUTATION_CARDS: Card[] = [

  // ─── Second Account (mutated: woodcutters_report) ─────────────────────────
  {
    id: 'second_account',
    title: 'Second Account',
    flavourText: "He came back. He said he went to the city. He is standing in the exact spot he always stood, and his boots are wrong.",
    tier: 'common',
    isMutated: true,
    options: [
      {
        label: 'Buy the map',
        flavourText: "He hands it over before you ask. He's been holding it out.",
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'insertCard', cardId: 'grove_awaits', position: 'random', minPos: 3, maxPos: 7 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        label: 'Decline',
        flavourText: "He nods. He turns back toward the tree line. You watch him go.",
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
      },
      {
        label: 'Follow him into the forest',
        flavourText: "He does not look surprised.",
        effects: [
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
        ],
        condition: { type: 'cardDrawCount', cardId: 'second_account', min: 2 },
        hideWhenUnavailable: true,
      },
    ],
  },

  // ─── Word Has Spread Further (mutated: word_spreads) ──────────────────────
  {
    id: 'word_has_spread_further',
    title: 'Word Has Spread Further',
    flavourText: "You stopped saying it weeks ago. It keeps spreading. The version coming back is not the one you sent out.",
    tier: 'common',
    isMutated: true,
    options: [
      {
        label: 'Lean into it',
        flavourText: 'The story grows. It is not entirely accurate. That helps.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
      {
        label: 'Subdue with gold',
        flavourText: 'Smaller story. More manageable. Stories do not stay small.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        label: 'Accept it',
        flavourText: "The word is better now. More accurate than yours. You're not sure what it means.",
        effects: [
          { type: 'resource', resource: 'influence', delta: 4 },
          { type: 'resource', resource: 'followers', delta: 3 },
          { type: 'resource', resource: 'dread', delta: 5 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
        ],
        condition: { type: 'cardDrawCount', cardId: 'word_has_spread_further', min: 2 },
        hideWhenUnavailable: true,
      },
    ],
  },

  // ─── Second Run (mutated: the_printing_press) ─────────────────────────────
  // P25-45: removed "Help the printer catch up" (mundane gold swap, too similar
  //         to original). Replaced with "Let it spread" — unconditional, Shub-
  //         thematic (organic spread: the pamphlets are circulating on their own).
  {
    id: 'second_run',
    title: 'Second Run',
    flavourText: "You didn't order a second run. The printer doesn't remember running it. The press was warm when you arrived.",
    tier: 'common',
    isMutated: true,
    options: [
      {
        label: 'Propaganda run',
        flavourText: 'Someone with a clipboard has taken interest.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 3 },
          { type: 'insertCard', cardId: 'scrutiny', position: 'random', minPos: 4, maxPos: 8 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Let it spread',
        flavourText: "The pamphlets are in hands you don't recognise. You decide not to ask whose.",
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
      {
        label: 'Let him keep printing',
        flavourText: "He doesn't know what they say. You don't either. They are being picked up.",
        effects: [
          { type: 'resource', resource: 'influence', delta: 4 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
        ],
        condition: { type: 'cardDrawCount', cardId: 'second_run', min: 2 },
        hideWhenUnavailable: true,
      },
    ],
  },

  // ─── Still Burning (mutated: the_fire) ────────────────────────────────────
  {
    id: 'still_burning',
    title: 'Still Burning',
    flavourText: "It has been three days. The fire department gave up on the second. The fire has not given up on anything.",
    tier: 'core',
    isMutated: true,
    options: [
      {
        label: 'Help with relief',
        flavourText: 'The congregation is visible and generous. People notice.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 3 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Watch it burn',
        flavourText: 'You find you still do not mind this. That is still worth noting.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'influence', delta: -1 },
        ],
      },
      {
        label: 'Investigate',
        flavourText: "Someone was thorough the first time. The same boot print is back.",
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'evidence_of_rival', position: 'random', minPos: 2, maxPos: 5 },
        ],
      },
      {
        label: 'Go in',
        flavourText: "The fire doesn't burn you. You note this carefully.",
        effects: [
          { type: 'resource', resource: 'relics', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
        ],
        condition: { type: 'cardDrawCount', cardId: 'still_burning', min: 2 },
        hideWhenUnavailable: true,
      },
    ],
  },

  // ─── The Opium Den Is Still Open (mutated: the_opium_den) ────────────────
  // P25-44: removed advanceGodPath from opt1; renamed title.
  // P25-55: dreamer moved to Encourage (thematic: visitors come back changed);
  //         Acquire loses dreamer insert, boosted to inf+3/dread+2.
  {
    id: 'still_open',
    title: 'The Opium Den Is Still Open',
    flavourText: 'It was supposed to have been shut down. More customers than before. The new proprietor does not give a name.',
    tier: 'common',
    isMutated: true,
    options: [
      {
        label: 'Encourage the visits',
        flavourText: 'They come back changed. The change is, for now, still useful.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'insertCard', cardId: 'the_dreamer', position: 'random', minPos: 2, maxPos: 5 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
      {
        label: 'Forbid it',
        flavourText: 'The word goes out. Some comply. The rest go on different days.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
      {
        label: 'Acquire it',
        flavourText: 'The premises are modest. The access to its clientele is not.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -3 },
          { type: 'resource', resource: 'influence', delta: 3 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 3 },
      },
      {
        label: 'Let them go deeper',
        flavourText: 'Some of them have been in there for four days. They come out with better posture.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
        ],
        condition: { type: 'cardDrawCount', cardId: 'still_open', min: 2 },
        hideWhenUnavailable: true,
      },
    ],
  },

  // ─── The Merchant Again (mutated: travelling_merchant) ────────────────────
  {
    id: 'the_merchant_again',
    title: 'The Merchant Again',
    flavourText: "Same cart. Same smile. Same jar, actually. You've seen this jar before. It keeps coming back.",
    tier: 'common',
    isMutated: true,
    options: [
      {
        label: 'Buy it',
        flavourText: "The price is the same as last time. He knew you would come back.",
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'insertCard', cardId: 'cursed_object', position: 'random', minPos: 2, maxPos: 5 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Pass',
        flavourText: 'He nods. He will be back. He is already back.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
      {
        label: 'Ask where it came from',
        flavourText: 'He tells you. The jar is heavier than it was when you set it down.',
        effects: [
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
        ],
        condition: { type: 'cardDrawCount', cardId: 'the_merchant_again', min: 2 },
        hideWhenUnavailable: true,
      },
    ],
  },
]

// ─── Mutation Map ─────────────────────────────────────────────────────────────
// Maps original card ID → mutated card ID.
// Used by seedMutations engine to replace originals in the draw pile.

export const MUTATION_MAP: Record<string, string> = {
  woodcutters_report:  'second_account',
  word_spreads:        'word_has_spread_further',
  the_printing_press:  'second_run',
  the_fire:            'still_burning',
  the_opium_den:       'still_open',
  travelling_merchant: 'the_merchant_again',
}
