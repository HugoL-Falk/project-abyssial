import type { Card } from '../../types'

export const CORE_CARDS: Card[] = [
  {
    id: 'stranger_asks_questions',
    title: 'A Stranger Asks Questions',
    flavourText: "He says he's writing a travel guide. Nobody writes travel guides about this town.",
    tier: 'core',
    options: [
      {
        label: 'Offer him a tour',
        flavourText: 'Charming. Informative. He notices more than he lets on. So do you.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
      {
        label: 'Have him followed',
        flavourText: 'Post office. Library. He writes things down. Your people write things down too.',
        effects: [
          // P16-17 (s87): cost raised -1 → -2 gold. Sole removeRandomThreat
          // at -1 gold was an auto-pick mid/late run; -2 gold preserves the
          // tool but forces a real spend.
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'removeRandomThreat' },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Bring him to a meeting',
        flavourText: 'He attends out of professional curiosity. He stops asking questions. He starts asking different ones.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'the_landlord_cometh',
    title: 'The Landlord Cometh',
    flavourText: "The landlord has started knocking. You've started not answering.",
    tier: 'core',
    options: [
      {
        label: 'Pay the rent',
        flavourText: 'He takes the money without making eye contact. Progress.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Remind him you know things',
        flavourText: 'He settles the arrears the following morning. The neighbours heard raised voices. It will circulate.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'insertCard', cardId: 'local_gossip', position: 'random', minPos: 3, maxPos: 6 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
      {
        label: 'Relocate',
        flavourText: 'Fewer windows. Less scrutiny. More rats.',
        // P19-25: gold+1 → +2 so "flee" competes with "remind him" (which gives
        // gold+2 at inf−2). opt2 is now the no-influence-cost gold play, traded
        // against a worse, non-repeatable threat insert.
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'insertCard', cardId: 'lost_safehouse', position: 'random', minPos: 2, maxPos: 5 },
        ],
        // P14-23: gate so only one Lost Safehouse can ever be in the deck at a time.
        condition: { type: 'not', condition: { type: 'hasCard', cardId: 'lost_safehouse' } },
      },
    ],
  },
  {
    id: 'follower_confesses_doubt',
    title: 'A Follower Confesses Doubt',
    flavourText: "They've been having dreams. You've been having the same ones. You don't mention this.",
    tier: 'core',
    options: [
      {
        label: 'Counsel them',
        flavourText: 'They stay. The doubt does not leave with them. Something else was listening.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
      },
      {
        // P25 audit: added gold+1 Pattern A bait — they left something on the table on the way out.
        label: 'Offer tea. Not another word.',
        flavourText: 'They go. You watch them go. Quiet people become loud problems.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'insertCard', cardId: 'loose_end', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
      {
        // P25 audit: new option — dark exploitation path. Converts doubt into a ritual resource.
        label: 'Convert the doubt',
        flavourText: 'It took all three to arrange. The doubt resolved itself.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
        condition: { type: 'and', conditions: [
          { type: 'resourceMin', resource: 'followers', min: 1 },
          { type: 'resourceMin', resource: 'gold', min: 1 },
          { type: 'resourceMin', resource: 'influence', min: 1 },
        ]},
      },
    ],
  },
  {
    id: 'relic_market',
    title: 'The Relic Market',
    flavourText: "She says it's Phoenician. You know it isn't. She knows you know. You both smile.",
    tier: 'core',
    options: [
      {
        label: 'Buy it',
        flavourText: 'The price was fair for what it is. Unfair for what it does.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -3 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 3 },
      },
      {
        label: 'Send someone after hours',
        flavourText: 'The shop was closed. That was not a deterrent.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'insertCard', cardId: 'scrutiny', position: 'random', minPos: 4, maxPos: 8 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
      {
        label: 'Trade on your name',
        flavourText: "You drop a name. The name does the work. You are less certain what you promised.",
        effects: [
          { type: 'resource', resource: 'influence', delta: -3 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 3 },
      },
    ],
  },
  {
    id: 'the_old_book',
    title: 'The Old Book',
    flavourText: 'The previous owner died. The one before that also died. You notice a pattern.',
    tier: 'core',
    godPathWeight: 'nyarlathotep',
    options: [
      {
        label: 'Read it yourself',
        flavourText: 'It took three days. You have not slept since.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
      },
      {
        label: 'Hire a translator',
        flavourText: 'He translated it. He has not returned your calls.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'setPrepTag', tag: 'studied' },
        ],
        // P19-26: grey out once 'studied' is already held — re-picking
        // before the tag is consumed just re-pays gold/dread for nothing.
        // Tag is cleared when a chain card consumes it (PREP-PERSIST:
        // tags no longer clear on reshuffle — 2026-07-04).
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'gold', min: 2 },
            { type: 'notHasPrepTag', tag: 'studied' },
          ],
        },
      },
      {
        label: 'Burn it',
        flavourText: 'The smoke was an unusual colour. An old coin was in the ashes. You may have read more of it than you intended.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'insertCard', cardId: 'what_was_already_read', position: 'random', minPos: 2, maxPos: 5 },
        ],
      },
    ],
  },
  {
    id: 'supplies_dwindle',
    title: 'Supplies Dwindle',
    flavourText: 'Faith is abundant, but it cannot be spread on bread.',
    tier: 'core',
    options: [
      {
        label: 'Spend on provisions',
        flavourText: 'They eat. They are grateful. Gratitude is worth something.',
        effects: [
          // P25 audit: added influence+1 — visible charity builds public standing.
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        // P25 audit: converted to randomOutcome — foragers might find something out there.
        label: 'Send foragers',
        flavourText: 'They find enough. The process is not dignified.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'randomOutcome', outcomes: [
            {
              weight: 1,
              effects: [{ type: 'resource', resource: 'gold', delta: 2 }],
              flavourText: 'They return with more than expected. No one asks where it came from.',
            },
            {
              weight: 1,
              effects: [{ type: 'resource', resource: 'gold', delta: 1 }],
              flavourText: 'They return with enough. No one asks what enough means.',
            },
            {
              weight: 1,
              effects: [
                { type: 'resource', resource: 'gold', delta: 1 },
                { type: 'resource', resource: 'dread', delta: 1 },
              ],
              flavourText: 'They return with enough. One of them has stopped speaking.',
            },
            {
              weight: 1,
              effects: [
                { type: 'insertCard', cardId: 'selectman_has_questions', position: 'random', minPos: 3, maxPos: 6 },
              ],
              flavourText: 'They return empty-handed. Someone followed them back with questions.',
            },
          ]},
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
      {
        label: 'Frame as spiritual discipline',
        flavourText: 'They accept this. They are not pleased about it. There is a difference.',
        effects: [
          // P25 audit: influence+3 → +2 — bait was over-generous for a single threat insert.
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'insertCard', cardId: 'desperate_congregation', position: 'random', minPos: 4, maxPos: 8 },
        ],
      },
    ],
  },
  {
    id: 'rival_stirs',
    title: 'A Rival Stirs',
    flavourText: 'Smaller cult. Worse robes. Considerably more confidence than is warranted.',
    tier: 'core',
    options: [
      {
        label: 'Recruit them',
        flavourText: 'They arrive with their doctrine intact. That fades.',
        // P25-56: reduced from +1+scaling (peaked at +3 late game) to flat +2.
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        label: 'Report them',
        flavourText: 'A civic duty. Entirely unrelated to the competition.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'insertCard', cardId: 'their_survivors', position: 'random', minPos: 5, maxPos: 9 },
        ],
      },
      {
        label: 'Ignore them',
        flavourText: "They're fine. It'll be fine. It will not be fine.",
        // P14-14: procrastinator niche — defer the problem to a worse future card.
        // P19-24: dropped the dread−1 upfront. With it, opt1 ("Report") strictly
        // dominated (same dread relief + inf+1). "Ignore" is now pure deferral
        // with no immediate reward, sharpening it against opt1.
        effects: [
          { type: 'insertCard', cardId: 'rival_escalation', position: 'random', minPos: 4, maxPos: 8 },
        ],
      },
    ],
  },

  // ── Reclassified from common (Phase 2, 2026-06-05) ─────────────────────
  {
    id: 'the_harbour',
    title: 'The Harbour',
    flavourText: "The boats came back light again. The fishermen say the fish have gone deep. They say it like it's your fault.",
    tier: 'core',
    options: [
      {
        label: 'Invest in longer lines',
        flavourText: 'The investment is sensible. The fishermen are grateful.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: "Ask what he means by 'deep'",
        flavourText: 'He shows you the net. You understand why he looked away when he said it.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'something_on_the_hook', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
      {
        label: 'Buy the catch anyway',
        flavourText: 'The fish are odd-shaped. You do not remark on this.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
    ],
  },
  {
    id: 'the_fire',
    title: 'The Fire',
    flavourText: "The church is ablaze. Convenient timing. You didn't start it. You checked. Twice.",
    tier: 'core',
    options: [
      {
        label: 'Help with relief',
        flavourText: 'The congregation is visible and generous. The right people notice.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Watch it burn',
        flavourText: 'You find you do not mind this. That is worth noting.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'gold', delta: 1 },
        ],
      },
      {
        label: 'Investigate',
        flavourText: 'Someone was thorough. What you find is more interesting than a fire ought to be.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'arson_inspector', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },
    ],
  },

  // ── Reclassified from common (Phase 1, 2026-06-01) ─────────────────────
  {
    id: 'academic_society',
    title: 'The Academic Society',
    flavourText: 'Monthly meeting. Dry sandwiches, non-alcoholic beverages, and light discussion of pre-human civilisations.',
    tier: 'core',
    godPathWeight: 'nyarlathotep',
    options: [
      {
        label: 'Attend as a civilian',
        flavourText: 'Thoroughly boring. Extremely useful.',
        // P19-20: was free inf+1/fol+1 + a treat insert — over the free-option
        // ceiling, so almost always picked. Add gold−1 (gate gold≥1). opt3
        // "Send regrets" stays ungated as the fallback.
        // P24-12 C3: removed fol+1 — gold−1/inf+1 is neutral; a_useful_contact is the reward.
        // P25 audit: influence+1 → -1 (borderline treat rule; attending as civilian costs standing).
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'insertCard', cardId: 'a_useful_contact', position: 'random', minPos: 4, maxPos: 8 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        // P22-61: investigators_file removed — too punishing vs. opt1 (which has a
        // *good* insert). Replaced with +1 dread: the public talk draws attention.
        label: 'Attend as a guest speaker',
        flavourText: 'The talk went well. Several people looked uncomfortable in professionally relevant ways.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
      {
        label: 'Send regrets',
        flavourText: 'You skip the sandwiches. You run a study group instead. One stays longer.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'gold', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'woodcutters_report',
    title: "The Woodcutter's Report",
    flavourText: "He won't go back to the north grove. He's selling the map for a ticket out of town. You respect the hustle.",
    tier: 'core',
    godPathWeight: 'shub_niggurath',
    options: [
      {
        label: 'Buy the map',
        flavourText: 'He takes the money and hands it over without making eye contact.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'randomOutcome', outcomes: [
            { weight: 1, effects: [{ type: 'insertCard', cardId: 'grove_awaits',      position: 'random', minPos: 3, maxPos: 7 }], flavourText: 'The coordinates are precise. He drew them from memory.' },
            { weight: 1, effects: [{ type: 'insertCard', cardId: 'an_unremarkable_stump', position: 'random', minPos: 3, maxPos: 7 }], flavourText: 'It leads somewhere. A stump, mostly, and a great many nettles.' },
          ]},
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        // P25 audit: "Decline" flat swap replaced with "Buy the rumour" — you buy the
        // story and spend it socially without going to the grove. Distinct from opt1.
        label: 'Buy the rumor instead',
        flavourText: "You pay for the story. It travels well. The grove stays where it is.",
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
    ],
  },
  {
    id: 'the_printing_press',
    title: 'The Printing Press',
    flavourText: "The printer is too busy to ask what the pamphlets are for. You don't ask why his hands are shaking.",
    tier: 'core',
    options: [
      {
        label: 'Propaganda run',
        flavourText: 'The pamphlets reach the right addresses. The message is yours, at least for now.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Help the printer',
        flavourText: 'He is grateful. The invoices are discreet. The work is legitimate, mostly.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
      {
        label: 'Forgery work',
        flavourText: 'Documents that did not exist. Events that did not happen. Very professional.',
        effects: [
          // P25 audit: removed dread-2 — dread relief made this net positive + treat (D-s150-1).
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'insertCard', cardId: 'forgers_debt', position: 'random', minPos: 4, maxPos: 8 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
    ],
  },
  {
    id: 'the_opium_den',
    title: 'The Opium Den',
    flavourText: "Your followers call it meditation. You've stopped correcting them. It's easier.",
    tier: 'core',
    godPathWeight: 'shub_niggurath',
    options: [
      {
        label: 'Encourage the visits',
        flavourText: 'They come back changed. The change is, for now, useful.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'the_dreamer', position: 'random', minPos: 2, maxPos: 5 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
      {
        label: 'Forbid it',
        flavourText: 'The word goes out. Some comply. The rest just go on Wednesdays instead.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
      {
        label: 'Acquire it',
        flavourText: 'The premises are modest. The access to its clientele is not.',
        effects: [
          { type: 'setPrepTag', tag: 'opium_pact' },
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'gold', min: 2 },
            { type: 'notHasPrepTag', tag: 'opium_pact' },
          ],
        },
      },
    ],
  },
  {
    id: 'the_census_agent',
    title: 'The Census Agent',
    flavourText: 'Federal. Polite. Counting heads. You have complicated feelings about her accuracy.',
    tier: 'core',
    options: [
      {
        label: 'Cooperate fully',
        flavourText: 'You are helpful and transparent about the parts that are not the problem.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'their_report', position: 'random', minPos: 4, maxPos: 8 },
        ],
      },
      {
        label: 'Provide misleading figures',
        flavourText: 'Plausible. Unverifiable. Probably fine.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'insertCard', cardId: 'their_suspicion', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
      {
        // P24-09: replace 4 specific removeCard effects with removeRandomThreat —
        // cleaner mechanic, thematically correct (you don't ask what Clarence did),
        // avoids no-op removes when specific threats aren't in deck.
        label: 'Make the problem go away',
        flavourText: 'Clarence handled it. Clarence always handles it. You do not ask how.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'removeRandomThreat' },
          { type: 'insertCard', cardId: 'what_was_done', position: 'random', minPos: 3, maxPos: 6 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
    ],
  },
  {
    id: 'local_elections',
    title: 'Local Elections',
    flavourText: 'The mayor is running unopposed again, which suits everyone who matters. Your candidate matters.',
    tier: 'core',
    options: [
      {
        // P22-P23-30: Revert P22-37 influence bump; rebalance against opt2.
        label: 'Back them openly',
        flavourText: 'Public commitment. Public obligation on both sides.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'insertCard', cardId: 'political_debt', position: 'random', minPos: 5, maxPos: 9 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        // P25 audit: removed political_debt insert — quiet backing leaves no formal obligation.
        label: 'Back them quietly',
        flavourText: 'Gratitude moves differently than obligation. Two new faces at the next meeting.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        // P25 audit: rewritten — "Stay out" flat dread+1 replaced with "Redirect them"
        // (followers-1, influence+1). Staying out while steering your people reads as principled.
        label: 'Redirect them',
        flavourText: 'You find them other priorities. The ward notices your discretion.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'the_seance',
    title: 'The Séance',
    flavourText: 'They organised it themselves. You were going to stop them. Then you thought: what if it actually works?',
    tier: 'core',
    options: [
      {
        label: 'Attend and steer',
        flavourText: 'It worked. You steered. Something else was also steering.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'setPrepTag', tag: 'attended_seance' },
        ],
        condition: { type: 'notHasPrepTag', tag: 'attended_seance' },
      },
      {
        // P25 audit: followers+1 → -1 (treat rule fix — net positive + treat violated D-s150-1).
        label: 'Let them do it alone',
        flavourText: 'They were enthusiastic. Something came through. It has not left.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'insertCard', cardId: 'wandering_soul', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
      {
        label: 'Forbid it',
        flavourText: 'They comply with visible resentment. You lose ground on both sides.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
    ],
  },
  {
    id: 'the_wedding_rite',
    title: 'A Wedding to Officiate',
    flavourText: "They picked you because you're the pastor. You agree because that's the role you keep.",
    tier: 'core',
    options: [
      {
        label: 'Perform the rite',
        flavourText: "Vows. Rings. The smile that never quite reaches. The day disappears.",
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'deferGodPathCard' },
        ],
      },
      {
        label: 'Send a deputy',
        flavourText: 'You send a deputy. One of yours catches an inscrutable look from the bride.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'gold', delta: 1 },
        ],
      },
      {
        label: 'Use the pulpit',
        flavourText: 'You preach as usual. One of the families stays to ask about the next gathering.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
]
