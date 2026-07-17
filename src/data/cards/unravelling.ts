import type { Card } from '../../types'

export const UNRAVELLING_CARDS: Card[] = [
  {
    id: 'unravelling_1',
    title: 'The Veil Thins',
    flavourText: 'Something shifted. No one mentions it, which means everyone noticed.',
    tier: 'doom',
    options: [
      {
        label: 'Manage the damage',
        flavourText: 'Gold spent, dread contained. Temporary.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Let it pass',
        flavourText: 'It passes. It leaves something behind.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'revelation', position: 'random', minPos: 5, maxPos: 10 },
        ],
      },
    ],
  },
  {
    id: 'unravelling_2',
    title: 'The Geometry Is Wrong',
    flavourText: 'They have been measuring the walls. The measurements do not agree. They have started measuring again.',
    tier: 'doom',
    options: [
      {
        label: 'Reassure the congregation',
        flavourText: 'They accept the reassurance. They stop measuring. The walls remain incorrect.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
      {
        label: 'Let them measure',
        flavourText: 'The results are distributed. Several leave. A different group arrives, but fewer than left.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'insertCard', cardId: 'revelation', position: 'random', minPos: 3, maxPos: 7 },
          { type: 'removeCard', cardId: 'unravelling_2' },
        ],
      },
    ],
  },
  {
    id: 'unravelling_3',
    title: 'Something Is Listening',
    flavourText: 'The silence has changed. It is fuller now. Something is in it and it is patient.',
    tier: 'doom',
    options: [
      {
        label: 'Claim it as prophecy',
        flavourText: 'Some take it as prophecy. Others leave. The name is worse than the silence.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
        ],
      },
      {
        label: 'Deny it',
        flavourText: 'The denial is not believed. It reduces the volume. Your credibility takes the rest of the weight.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'unravelling_4',
    title: 'The Congregation Changes',
    flavourText: 'The changes are subtle. The differences are not uniform. Some of them are smiling.',
    tier: 'doom',
    options: [
      {
        // P22-P23-68: Collapsed Shub/non-Shub split to single god-agnostic option.
        // Shub runs get changed_follower via mutations and god path cards — doom card need not add more.
        label: 'Embrace the change',
        flavourText: 'Three of the congregation stopped coming. The others filled their places. The dread did not leave with them.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
      {
        label: 'Purge the affected',
        flavourText: 'Four gone. The remaining congregation watched it happen. The room is smaller and quieter. So are they.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -4 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 4 },
      },
    ],
  },
  {
    id: 'unravelling_5',
    title: 'It Is Already Here',
    flavourText: 'There is no longer a question of whether. Only of what happens next.',
    tier: 'doom',
    options: [
      {
        // Pay Relics −1 → surface the next chain card to the top of the draw pile.
        // Forces the current god path confrontation to be drawn immediately.
        label: 'Face it with what you have',
        flavourText: 'The relic was the price. You paid it. The door opened.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'surfaceChainCard' },
        ],
        condition: { type: 'resourceMin', resource: 'relics', min: 1 },
      },
      {
        label: 'The run ends here',
        flavourText: 'Without the relic, the door remains closed. The thing behind it does not leave.',
        effects: [
          { type: 'endRun', reason: 'It Is Already Here. No relic to pay the price.' },
        ],
        condition: { type: 'resourceMax', resource: 'relics', max: 0 },
      },
    ],
  },
]

export function getUnravellingCard(reshuffleCount: number): Card {
  const tier = Math.min(Math.max(reshuffleCount, 1), 5)
  return UNRAVELLING_CARDS[tier - 1]
}
