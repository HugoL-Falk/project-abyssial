import type { Card } from '../../types'

export const SPECIAL_CARDS: Card[] = [
  {
    id: 'changed_follower',
    title: 'The Changed Followers',
    flavourText: 'One of them is different now. The others have not noticed yet. You have.',
    tier: 'god_path',
    godPath: 'shub_niggurath',
    accumulates: true,
    options: [
      // -- Sacrifice: 4 options, exactly one visible at a time via hideWhenUnavailable --
      // Cost escalates with theChanged (checked before the +1 is applied this turn).

      // 1st sacrifice (theChanged = 0)
      {
        label: 'Sacrifice them',
        flavourText: 'The first offering. The forest accepts quietly.',
        effects: [
          { type: 'resource', resource: 'theChanged', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMax', resource: 'theChanged', max: 0 },
        hideWhenUnavailable: true,
        previewTag: '-theChanged',
      },

      // 2nd sacrifice (theChanged = 1)
      {
        label: 'Sacrifice them',
        flavourText: 'The congregation has noticed the gaps. They say nothing, for now.',
        effects: [
          { type: 'resource', resource: 'theChanged', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'followers', delta: -1 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'theChanged', min: 1 },
            { type: 'resourceMax', resource: 'theChanged', max: 1 },
          ],
        },
        hideWhenUnavailable: true,
        previewTag: '-theChanged',
      },

      // 3rd sacrifice (theChanged = 2)
      {
        label: 'Sacrifice them',
        flavourText: 'Your hands are steadier than they should be. That worries you.',
        effects: [
          { type: 'resource', resource: 'theChanged', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'followers', delta: -1 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'theChanged', min: 2 },
            { type: 'resourceMax', resource: 'theChanged', max: 2 },
          ],
        },
        hideWhenUnavailable: true,
        previewTag: '-theChanged',
      },

      // 4th+ sacrifice (theChanged >= 3)
      {
        label: 'Sacrifice them',
        flavourText: 'The ritual is almost complete. The cost of that word is considerable.',
        effects: [
          { type: 'resource', resource: 'theChanged', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'theChanged', min: 3 },
        hideWhenUnavailable: true,
        previewTag: '-theChanged',
      },

      // -- Keep ----------------------------------------------------------------
      // Card goes to permDiscardPile (god_path tier); insertCard puts a fresh
      // copy back in the draw pile so it returns in a future week.
      {
        label: 'Let them stay',
        flavourText: 'You decided not to intervene. That counts as a decision.',
        effects: [
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 5, maxPos: 10 },
        ],
      },
    ],
  },
]
