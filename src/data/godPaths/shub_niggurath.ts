import type { Card } from '../../types'

export const SHUB_NIGGURATH_CHAIN: Card[] = [

  // ─── Card 1 — The Pilgrim's Path ──────────────────────────────────────────────
  {
    id: 'shub_niggurath_1',
    title: "The Pilgrim's Path",
    flavourText: 'Offerings have been left at the standing stone. Wrong, but arranged correctly. We did not teach anyone that.',
    tier: 'god_path',
    godPath: 'shub_niggurath',
    chainStage: 1,
    options: [
      {
        label: 'Make contact',
        flavourText: 'We waited for the next occurrence. They were not surprised to see us.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
      {
        // P22-P23-33: Removed "Leave a counter-offering" (opt2 was always better due to +1 relic).
        label: 'Ignore it',
        flavourText: 'The offerings continued. They became more correct over time.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'shub_niggurath_1', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
    ],
  },

  // ─── Card 2 — The First Rite ──────────────────────────────────────────────────
  {
    id: 'shub_niggurath_2',
    title: 'The First Rite',
    flavourText: 'Autumn arrives and the rite with it. Participants must offer something personal. The definition is broad.',
    tier: 'god_path',
    godPath: 'shub_niggurath',
    chainStage: 2,
    options: [
      {
        label: 'Conduct the rite with willing participants',
        flavourText: 'Both were willing. We checked twice. They were willing both times.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'advanceGodPath' },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 1 },
            { type: 'resourceMin', resource: 'followers', min: 2 },
          ],
        },
      },
      {
        label: 'Conduct it with appropriate preparations',
        flavourText: 'The preparation helped. With the paperwork side of things.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'advanceGodPath' },
          { type: 'seedMutations', count: 1 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 1 },
            { type: 'resourceMin', resource: 'gold', min: 1 },
            { type: 'resourceMin', resource: 'followers', min: 1 },
          ],
        },
      },
      {
        label: 'Recognise the root-tongue',
        flavourText: 'The shape in the bark is a letter. You have read this letter before.',
        condition: { type: 'hasPrepTag', tag: 'studied' },
        effects: [
          { type: 'consumePrepTag', tag: 'studied' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
      {
        label: 'Postpone',
        flavourText: 'The air is still warm. We will have time, even if something is less pleased.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'shub_niggurath_2', position: 'random', minPos: 4, maxPos: 7 },
        ],
      },
    ],
  },

  // ─── Card 3 — The Unknown Goat ────────────────────────────────────────────────
  {
    id: 'shub_niggurath_3',
    title: 'The Unknown Goat',
    flavourText: 'It appeared in the field behind the farmhouse. No one brought it. No one claims it. Eleven days now.',
    tier: 'god_path',
    godPath: 'shub_niggurath',
    chainStage: 3,
    options: [
      {
        label: 'Claim it formally',
        flavourText: 'The claim was brief. No one questioned it. One who touched it walks differently now.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'advanceGodPath' },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
          { type: 'seedMutations', count: 2 },
        ],
        condition: { type: 'godPathStageMin', min: 2 },
      },
      {
        label: 'Feed it',
        flavourText: 'It has a particular taste. We are not listing what it ate.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'advanceGodPath' },
          { type: 'seedMutations', count: 3 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 2 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
          ],
        },
      },
      {
        label: 'Chase it off',
        flavourText: 'It left. The trail of affected grass ends at the woods. It was back by dawn.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'shub_niggurath_3', position: 'random', minPos: 4, maxPos: 7 },
        ],
      },
    ],
  },

  // ─── Card 4 — The Familiar Chant ─────────────────────────────────────────────
  {
    id: 'shub_niggurath_4',
    title: 'The Familiar Chant',
    flavourText: 'Gathering at the farmhouse at dusk. Our people, and strangers. Several already know the chant.',
    tier: 'god_path',
    godPath: 'shub_niggurath',
    chainStage: 4,
    options: [
      {
        label: 'Lead the congregation',
        flavourText: 'The podium taken. Not everyone who attended has been accounted for since.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'insertCard', cardId: 'changed_follower', position: 'random', minPos: 3, maxPos: 7 },
          { type: 'advanceGodPath' },
          { type: 'seedMutations', count: 2 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 3 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
            { type: 'resourceMin', resource: 'followers', min: 3 },
          ],
        },
      },
      {
        label: 'Observe what unfolds',
        flavourText: 'Stood outside the barn. The door was open. Something pulled from inside.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'insertCard', cardId: 'shub_words_come_naturally', position: 'random', minPos: 2, maxPos: 4 },
        ],
        condition: { type: 'godPathStageMin', min: 3 },
      },
      {
        label: 'Dream into the soil',
        flavourText: 'They taught the cadence. The forest answers. One follows home, soil on her hands.',
        condition: { type: 'hasPrepTag', tag: 'opium_pact' },
        effects: [
          { type: 'consumePrepTag', tag: 'opium_pact' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
      {
        label: 'Disperse them and lock the barn',
        flavourText: 'They are outside. Congregation on one side. Hooves on the floorboards.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'insertCard', cardId: 'shub_niggurath_4', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
    ],
  },

  // ─── Card 5 — A Thousand Young ────────────────────────────────────────────────
  {
    id: 'shub_niggurath_5',
    title: 'A Thousand Young',
    flavourText: 'The goat left at dusk. The forest is now larger. Those who looked came back. They said nothing.',
    tier: 'god_path',
    godPath: 'shub_niggurath',
    chainStage: 5,
    options: [
      {
        label: 'Follow it in',
        flavourText: 'The path closed immediately. There were others. There had always been others.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -3 },
          { type: 'resource', resource: 'dread', delta: 5 },
          { type: 'resource', resource: 'theChanged', delta: 1 },
          { type: 'advanceGodPath' },
          { type: 'surfaceCards', maxPos: 5 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 4 },
            { type: 'resourceMin', resource: 'followers', min: 3 },
          ],
        },
      },
      {
        label: 'Recite the rite of unbecoming',
        flavourText: 'You spoke it back to the treeline. The forest accepts the offering and returns something that is not quite a stone.',
        condition: { type: 'hasPrepTag', tag: 'recited' },
        effects: [
          { type: 'consumePrepTag', tag: 'recited' },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
      {
        label: 'Pull them back',
        flavourText: 'Two of ours stepped toward it. You called them back. Only one responded.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'insertCard', cardId: 'shub_niggurath_5', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
    ],
  },

  // ─── Card 6 — The Root Remembers ─────────────────────────────────────────────
  {
    id: 'shub_niggurath_6',
    title: 'The Root Remembers',
    flavourText: 'The trees are not trees anymore. It only remembers to maintain their shape. The roots go further than they should. You are standing inside something ancient.',
    tier: 'god_path',
    godPath: 'shub_niggurath',
    chainStage: 6,
    isSummoning: true,
    options: [
      {
        label: 'Complete the offering',
        flavourText: 'We cared for The Changed and gave what was asked. The forest accepted it the way a forest accepts rain.',
        effects: [
          { type: 'victory' },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 5 },
            { type: 'resourceMin', resource: 'theChanged', min: 3 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
          ],
        },
      },
      {
        label: 'Offer what you have',
        flavourText: 'We gave what we had. The forest accepted, but wanted more.',
        effects: [
          { type: 'partialVictory', god: 'shub_niggurath' },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 5 },
            { type: 'resourceMin', resource: 'theChanged', min: 2 },
            { type: 'resourceMin', resource: 'followers', min: 3 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
          ],
        },
      },
      {
        label: 'The offering is insufficient',
        flavourText: 'The forest does not forgive shortfalls. It simply grows.',
        succumbOption: true,
        effects: [
          { type: 'endRun', reason: 'We did not give enough. The forest does not forgive shortfalls. It simply grows.' },
        ],
      },
    ],
  },
]

// ─── Insert card: The Words Come Naturally ────────────────────────────────────
// Triggered by Card 4 "Observe what unfolds". Not part of chain reserve.

export const SHUB_WORDS_COME_NATURALLY: Card = {
  id: 'shub_words_come_naturally',
  title: 'The Words Come Naturally',
  flavourText: 'Closer to the farmhouse than intended, chanting words never heard before. The people inside have noticed.',
  tier: 'threat',
  options: [
    {
      label: 'Go to them',
      flavourText: 'The words were known. The knowing came as a surprise.',
      effects: [
        { type: 'resource', resource: 'followers', delta: -1 },
        { type: 'advanceGodPath' },
        { type: 'seedMutations', count: 1 },
      ],
      condition: { type: 'godPathStageMin', min: 3 },
    },
    {
      label: 'Leave before they reach you',
      flavourText: 'Left before they arrived. Still chanting.',
      effects: [
        { type: 'resource', resource: 'dread', delta: -2 },
        { type: 'insertCard', cardId: 'shub_niggurath_4', position: 'random', minPos: 4, maxPos: 7 },
      ],
    },
  ],
}
