import type { Card } from '../../types'

// ─── Inserted card (not part of chain array, registered separately in ALL_CARDS) ─

export const THE_MOVING_PAINTING: Card = {
  id: 'the_moving_painting',
  title: 'The Moving Painting',
  flavourText: 'Three followers described the same motion in the oils. Same direction. Same hour.',
  tier: 'threat',
  options: [
    {
      label: 'Speak with each of them',
      flavourText: 'You interview them separately. The accounts are identical. Something settles.',
      effects: [
        { type: 'resource', resource: 'influence', delta: -2 },
        { type: 'seedWhispers', count: 1 },
      ],
      condition: { type: 'resourceMin', resource: 'influence', min: 2 },
    },
    {
      label: 'Leave it',
      flavourText: 'The accounts keep circulating. The details get sharper each retelling.',
      effects: [
        { type: 'resource', resource: 'dread', delta: 2 },
        { type: 'seedWhispers', count: 1 },
      ],
    },
  ],
}

// ─── Chain cards ──────────────────────────────────────────────────────────────

export const NYARLATHOTEP_CHAIN: Card[] = [
  {
    // Card 4 (new CS1) — THE BOOK IS OPENED
    id: 'nyarlathotep_4',
    title: 'The Book is Opened',
    flavourText: 'The Necronomicon is circulating among the followers. Not the university copy. We did not organise it.',
    tier: 'god_path',
    godPath: 'nyarlathotep',
    chainStage: 1,
    options: [
      {
        label: 'Formalise a study group',
        flavourText: 'Three appointed to take the lead. The structure has not slowed anything.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'seedWhispers', count: 1 },
          { type: 'advanceGodPath' },
        ],
        condition: { type: 'godPathStageMin', min: 0 },
      },
      {
        label: 'Let it circulate freely',
        flavourText: 'On its fourth reader now. They are all very quiet. The book keeps coming back.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'nyarlathotep_4', position: 'random', minPos: 6, maxPos: 9 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 1 },
      },
      {
        label: 'Dream the bargain',
        flavourText: "The den's dreamers knew the terms. You renegotiate from there.",
        condition: { type: 'hasPrepTag', tag: 'opium_pact' },
        effects: [
          { type: 'consumePrepTag', tag: 'opium_pact' },
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'seedWhispers', count: 1 },
          { type: 'advanceGodPath' },
        ],
      },
    ],
  },

  {
    // Card 3 (new CS2) — THE BLACK MAN AT THE CROSSROADS
    id: 'nyarlathotep_3',
    title: 'The Black Man at the Crossroads',
    flavourText: 'Someone meets our people at crossroads after dark. They come back changed. They describe the same figure.',
    tier: 'god_path',
    godPath: 'nyarlathotep',
    chainStage: 2,
    options: [
      {
        label: 'Encourage the meetings',
        flavourText: 'Attendance is voluntary. Everyone has attended.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'seedWhispers', count: 2 },
          { type: 'advanceGodPath' },
        ],
        condition: { type: 'godPathStageMin', min: 1 },
      },
      {
        label: 'Observe without intervening',
        flavourText: 'We watched a meeting from a distance. The distance felt insufficient.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'seedWhispers', count: 1 },
          { type: 'insertCard', cardId: 'nyarlathotep_3', position: 'random', minPos: 6, maxPos: 9 },
        ],
      },
      {
        label: 'Greet him as expected',
        flavourText: 'You sat through his gathering. You know the greeting form. He answers in kind.',
        condition: { type: 'hasPrepTag', tag: 'attended_seance' },
        effects: [
          { type: 'consumePrepTag', tag: 'attended_seance' },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'seedWhispers', count: 1 },
          { type: 'advanceGodPath' },
        ],
      },
    ],
  },

  {
    // Card 2 (new CS3) — THE EXHIBIT
    id: 'nyarlathotep_2',
    title: 'The Exhibit',
    flavourText: 'Several canvases from the old estate have arrived at the exhibit. The subject is listed as unclear.',
    tier: 'god_path',
    godPath: 'nyarlathotep',
    chainStage: 3,
    options: [
      {
        label: 'Sponsor the exhibit',
        flavourText: 'Our name is on a placard near the pieces. People stand near it for a long time.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'advanceGodPath' },
          { type: 'seedWhispers', count: 2 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'godPathStageMin', min: 2 },
            { type: 'resourceMin', resource: 'gold', min: 2 },
          ],
        },
      },
      {
        label: 'Arrange a private viewing',
        flavourText: 'They found it very moving. Several found it literally moving.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'insertCard', cardId: 'the_moving_painting', position: 'random', minPos: 2, maxPos: 5 },
          { type: 'insertCard', cardId: 'nyarlathotep_2', position: 'random', minPos: 5, maxPos: 8 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        label: 'Recognise the pattern',
        flavourText: 'You have read this shape before. The recognition steadies you.',
        condition: { type: 'hasPrepTag', tag: 'studied' },
        effects: [
          { type: 'consumePrepTag', tag: 'studied' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'advanceGodPath' },
          { type: 'seedWhispers', count: 1 },
        ],
      },
    ],
  },

  {
    // Card 1 (new CS4) — THE LECTURE
    id: 'nyarlathotep_1',
    title: 'The Lecture',
    flavourText: 'A guest professor speaks on folklore tonight. Full house for a Tuesday. Not everyone came for the lecture.',
    tier: 'god_path',
    godPath: 'nyarlathotep',
    chainStage: 4,
    options: [
      {
        label: 'Attend',
        flavourText: 'The professor was charming. Several attendees were not there for the lecture.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'advanceGodPath' },
          { type: 'seedWhispers', count: 2 },
        ],
        condition: { type: 'godPathStageMin', min: 3 },
      },
      {
        label: 'Distribute pamphlets',
        flavourText: 'The class was full and will come back. Better make the most of it.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'insertCard', cardId: 'nyarlathotep_1', position: 'random', minPos: 5, maxPos: 8 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
    ],
  },

  {
    // Card 5 — THE SIGNAL BROADENS
    id: 'nyarlathotep_5',
    title: 'The Signal Broadens',
    flavourText: 'The basement radio receives on impossible frequencies. Several followers hum the same sequence.',
    tier: 'god_path',
    godPath: 'nyarlathotep',
    chainStage: 5,
    options: [
      {
        label: 'Tune in',
        flavourText: 'We listened for six hours. It felt like one. We have no memory of most of it.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'advanceGodPath' },
          { type: 'seedWhispers', count: 2 },
        ],
        condition: { type: 'godPathStageMin', min: 4 },
      },
      {
        label: 'Destroy the equipment',
        flavourText: 'The humming continued. They started repairing it the next day.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'nyarlathotep_5', position: 'random', minPos: 7, maxPos: 9 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
      {
        label: 'Speak his name back',
        flavourText: 'You return the name he gave you. He smiles. Something falls from his sleeve.',
        condition: { type: 'hasPrepTag', tag: 'recited' },
        effects: [
          { type: 'consumePrepTag', tag: 'recited' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'seedWhispers', count: 1 },
          { type: 'advanceGodPath' },
        ],
      },
    ],
  },

  {
    // Card 6 — THE CRAWLING CHAOS SPEAKS
    id: 'nyarlathotep_6',
    title: 'The Crawling Signal Arrives',
    flavourText: 'It is not a voice. Not in the room. Everyone has stopped. Even those who did not know what we were doing.',
    tier: 'god_path',
    godPath: 'nyarlathotep',
    chainStage: 6,
    isSummoning: true,
    options: [
      {
        label: 'Receive the message',
        flavourText: 'Not a language. Not through voice. It was felt. We understood. We will help.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -4 },
          { type: 'resource', resource: 'influence', delta: -3 },
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'victory' },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'followers', min: 4 },
            { type: 'resourceMin', resource: 'influence', min: 3 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
            { type: 'resourceMin', resource: 'dread', min: 6 },
          ],
        },
      },
      {
        label: 'Receive parts of the message',
        flavourText: 'Something was felt but not fully understood. Enough to know what comes next.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -3 },
          { type: 'resource', resource: 'influence', delta: -3 },
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'partialVictory', god: 'nyarlathotep' },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'followers', min: 3 },
            { type: 'resourceMin', resource: 'influence', min: 3 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
            { type: 'resourceMin', resource: 'dread', min: 4 },
            {
              type: 'not',
              condition: {
                type: 'and',
                conditions: [
                  { type: 'resourceMin', resource: 'followers', min: 4 },
                  { type: 'resourceMin', resource: 'influence', min: 3 },
                  { type: 'resourceMin', resource: 'relics', min: 1 },
                  { type: 'resourceMin', resource: 'dread', min: 6 },
                ],
              },
            },
          ],
        },
      },
      {
        label: 'The signal overwhelms you',
        flavourText: 'The frequency was right. The mind was not ready.',
        succumbOption: true,
        effects: [
          { type: 'endRun', reason: 'The signal was received. You were not sufficient to hold it.' },
        ],
      },
    ],
  },
]
