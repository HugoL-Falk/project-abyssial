import type { Card } from '../../types'

export const RARE_CARDS: Card[] = [
  {
    id: 'the_defector',
    title: 'The Defector',
    flavourText: 'She arrives at 2am with a ledger, a grudge, and lousy penmanship. You make tea.',
    tier: 'rare',
    options: [
      {
        label: 'Take her in',
        flavourText: 'She opens the ledger to a specific page. Her expression is carefully neutral.',
        effects: [
          { type: 'randomOutcome', outcomes: [
            {
              weight: 1,
              flavourText: 'The ledger checks out. She has brought others with her, quietly.',
              effects: [
                { type: 'resource', resource: 'influence', delta: 2 },
                { type: 'resource', resource: 'followers', delta: 2 },
                { type: 'resource', resource: 'dread', delta: 2 },
                { type: 'insertCard', cardId: 'their_former_associates', position: 'random', minPos: 4, maxPos: 8 },
              ],
            },
            {
              weight: 1,
              flavourText: 'She was watching to see what you would accept. Now they know.',
              effects: [
                { type: 'resource', resource: 'influence', delta: -2 },
                { type: 'resource', resource: 'followers', delta: -1 },
                { type: 'insertCard', cardId: 'investigators_file', position: 'discard' },
              ],
            },
          ]},
        ],
      },
      {
        label: 'Decline',
        flavourText: 'She accepts this. She takes the ledger with her. You watch her go.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
    ],
  },
  {
    id: 'artefact_from_deep',
    title: 'The Artefact from the Deep',
    flavourText: 'A fisherman sold it for eight shillings this morning. It sits on the table. He should have asked for more.',
    tier: 'rare',
    options: [
      {
        label: 'Keep it',
        flavourText: 'Warm to the touch. A low sound follows it wherever it sits.',
        effects: [
          { type: 'resource', resource: 'relics', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'fishermans_return', position: 'random', minPos: 5, maxPos: 9 },
        ],
      },
      {
        label: 'Put it back in the waves',
        flavourText: 'The water accepted it. Almost yearned for it.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'dreaming_academic',
    title: 'The Dreaming Academic',
    flavourText: "He's been sleepwalking here for a fortnight. His notes on pre-human linguistics are relevant. Extremely so.",
    tier: 'rare',
    options: [
      {
        label: 'Bring him in',
        flavourText: 'He arrives at the requested time. The notes come with him.',
        effects: [
          { type: 'randomOutcome', outcomes: [
            {
              weight: 1,
              // P25-48: removed dread+2 — good branch should be clearly good.
              flavourText: 'His notes are extraordinary. His enthusiasm is harder to contain.',
              effects: [
                { type: 'resource', resource: 'followers', delta: 1 },
                { type: 'resource', resource: 'influence', delta: 2 },
                { type: 'insertCard', cardId: 'his_research_notes', position: 'random', minPos: 2, maxPos: 5 },
              ],
            },
            {
              weight: 1,
              flavourText: 'He mentioned the meetings to someone. That someone mentioned them further.',
              effects: [
                { type: 'resource', resource: 'followers', delta: 1 },
                { type: 'resource', resource: 'dread', delta: 3 },
                { type: 'insertCard', cardId: 'investigators_file', position: 'discard' },
              ],
            },
          ]},
        ],
      },
      {
        label: 'Doctor his memory',
        flavourText: 'He wakes convinced he attended a dinner party. He seems happier.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
    ],
  },
  {
    id: 'dark_young_pilgrim',
    title: 'The Dark Young Pilgrim',
    flavourText: "Three days in the basement. It hasn't eaten anything you're aware of. The neighbours are quiet.",
    tier: 'rare',
    options: [
      {
        // P17-1: drop previewTag — let the auto `+card` chip render the
        // guardian directly so its identity is preview-clickable.
        // P17-26: insert guardian into the discard pile (returns at next
        // reshuffle) instead of as the next card off the top.
        label: 'Feed it',
        flavourText: 'It seemed appreciative. In the way that things like this are appreciative.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'removeCard', cardId: 'dark_young_pilgrim' },
          { type: 'insertCard', cardId: 'dark_young_guardian', position: 'discard' },
          // P19-29: feeding insert now lives on the Guardian's own options (fires
          // for BOTH this pilgrim path and the Grove's Gift blessing path), so it
          // is no longer duplicated here — the Guardian inserts it when resolved.
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
      {
        label: 'Convince it to leave',
        flavourText: 'The conversation was one-sided. The result was not.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -3 },
          { type: 'resource', resource: 'influence', delta: -1 },
        ],
      },
    ],
  },
  {
    // Named follower — rare boon card. One-use: active options remove clarence.
    // No onDraw — was previously auto-removing what_was_done invisibly even on "Not yet".
    // Influence cost reflects political capital spent calling in favours.
    // Each active option requires at least one of its target cards to be in the deck (hasCard OR).
    id: 'clarence',
    title: 'Clarence',
    flavourText: "He doesn't ask questions. This is either his greatest virtue or your greatest concern.",
    tier: 'rare',
    options: [
      {
        // P17-9 / P17-24 (T2): collapsed from named-target removeCard list to
        // generic removeRandomThreat. hasCard gate dropped — Clarence is now
        // useful whenever you have the resources, regardless of which threats
        // are in the deck. Self-remove preserves one-use identity; rare-rotation
        // handles the unused case.
        label: 'Have him handle it',
        flavourText: 'He handles it. You do not ask how. You will not ask.',
        hideWhenUnavailable: true,
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'removeRandomThreat' },
          { type: 'removeCard', cardId: 'clarence' },
        ],
      },
      {
        label: 'Pay him to bury it',
        flavourText: 'Money changes hands. The loose ends are tidied. Clarence is thorough about tidying.',
        hideWhenUnavailable: true,
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'removeRandomThreat' },
          { type: 'removeCard', cardId: 'clarence' },
        ],
      },
      {
        // Unconditional fallback — satisfies allBlocked invariant.
        label: 'Not yet',
        flavourText: 'He waits. He is very good at waiting.',
        effects: [
          { type: 'removeCard', cardId: 'clarence' },
          { type: 'insertCard', cardId: 'clarence', position: 'random', minPos: 4, maxPos: 7 },
        ],
      },
    ],
  },
  {
    id: 'travelling_merchant',
    title: 'The Travelling Merchant',
    flavourText: 'He has a new jar. He always has a new jar. Why is everything always in jars?',
    tier: 'rare',
    options: [
      {
        label: 'Buy it',
        flavourText: 'He names a price. You pay it. The jar goes home with you.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'randomOutcome', outcomes: [
            { weight: 1, effects: [{ type: 'resource', resource: 'relics', delta: 1 }], flavourText: 'Whatever is inside hums faintly when held.' },
            { weight: 1, effects: [{ type: 'resource', resource: 'dread', delta: -2 }], flavourText: 'The smell, on opening, is of low tide and cedar. It settles something.' },
            { weight: 1, effects: [{ type: 'resource', resource: 'followers', delta: 1 }], flavourText: 'One of the congregation takes an interest. They ask to keep it for a while.' },
            { weight: 1, effects: [{ type: 'insertCard', cardId: 'cursed_object', position: 'random', minPos: 2, maxPos: 5 }], flavourText: "You don't open it until you get home. You should have waited longer." },
          ]},
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Pass',
        flavourText: 'He nods. He will be back.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'the_diocese_sends_word',
    title: 'The Diocese Sends Word',
    flavourText: "The bishop's letter is brief. The questions in it are not.",
    tier: 'rare',
    options: [
      {
        label: 'Compose a careful reply',
        flavourText: 'Hours of drafting. The reply says very little, very carefully.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'deferGodPathCard' },
        ],
      },
      {
        label: 'Refuse to engage',
        flavourText: 'The letter goes back unopened. They stop writing.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
      },
      {
        label: 'Welcome the inquiry openly',
        flavourText: 'The bishop sends a clerk. He asks for membership records. We have a version.',
        effects: [
          { type: 'randomOutcome', outcomes: [
            {
              weight: 1,
              flavourText: 'The clerk seemed satisfied. The donations that week were difficult to trace.',
              effects: [
                { type: 'resource', resource: 'influence', delta: 2 },
                { type: 'resource', resource: 'gold', delta: 1 },
                { type: 'resource', resource: 'dread', delta: -1 },
              ],
            },
            {
              weight: 1,
              flavourText: 'He asked for seven years of records. Three of those years were creative.',
              effects: [
                { type: 'resource', resource: 'influence', delta: -2 },
                { type: 'resource', resource: 'gold', delta: -1 },
                { type: 'resource', resource: 'dread', delta: 1 },
              ],
            },
          ]},
        ],
      },
    ],
  },
]

// Not in RARE_CARDS — added to rare pool only when The Grove's Gift blessing is active,
// or inserted into the deck when dark_young_pilgrim "Feed it" is chosen.
export const DARK_YOUNG_GUARDIAN: Card = {
  id: 'dark_young_guardian',
  title: 'Dark Young Guardian',
  flavourText: 'It arrived without introduction. The congregation adjusted. Its requirements became apparent quickly.',
  tier: 'rare',
  // No onDraw: the engine's onDraw handler only processes `type:'resource'`
  // effects and silently drops insertCard (see gameStore.ts:562). P19-29: the
  // feeding tax lives on every option's effects instead, so resolving the
  // Guardian inserts "It Still Needs Feeding" (pos 2–4) regardless of how it
  // arrived — the Grove's Gift blessing path AND the pilgrim "Feed it" path.
  // This honors the Grove's Gift bane text and removes the duplicate that used
  // to sit on the pilgrim's option.
  options: [
    {
      label: 'Send it ahead',
      flavourText: 'It moves efficiently. Whatever the problem was, there is less of it now.',
      effects: [
        { type: 'removeRandomThreat' },
        { type: 'resource', resource: 'influence', delta: 2 },
        { type: 'resource', resource: 'dread', delta: 3 },
        { type: 'insertCard', cardId: 'it_still_needs_feeding', position: 'random', minPos: 2, maxPos: 4 },
      ],
    },
    {
      label: 'Let the congregation see it',
      flavourText: 'Several left. More arrived the following day. The ones who arrived had already heard.',
      effects: [
        { type: 'resource', resource: 'followers', delta: 3 },
        { type: 'resource', resource: 'dread', delta: 3 },
        { type: 'insertCard', cardId: 'it_still_needs_feeding', position: 'random', minPos: 2, maxPos: 4 },
      ],
    },
    {
      label: 'Keep it back',
      flavourText: 'It has drawn a reputation and some are willing to pay to see it.',
      effects: [
        { type: 'resource', resource: 'gold', delta: 2 },
        { type: 'resource', resource: 'dread', delta: 1 },
        { type: 'insertCard', cardId: 'it_still_needs_feeding', position: 'random', minPos: 2, maxPos: 4 },
      ],
    },
  ],
}
