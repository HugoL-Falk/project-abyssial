import type { Card } from '../../types'

export const THREAT_CARDS: Card[] = [
  // ─── STARTING THREATS ───────────────────────────────────────────────────────────
  {
    id: 'the_detective',
    title: 'The Detective',
    flavourText: "He's good. He got this far, which means he's better than good. He has your schedule.",
    tier: 'threat',
    options: [
      {
        label: 'Buy him off',
        flavourText: 'Expensive. Permanent, if the price is right. This price is right.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -4 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 4 },
      },
      {
        label: 'Discredit him',
        flavourText: 'Influence does the work. He is not believed. He knows he is not believed.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -3 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 3 },
      },
      {
        label: 'Disappear him',
        flavourText: 'This creates more problems than it solves. You know this before you do it.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 3 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 3 },
      },
      {
        label: 'Flee and scatter',
        flavourText: 'You survive. The work survives. Nothing else does.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -3 },
          { type: 'resource', resource: 'influence', delta: -3 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'the_newspaper_article',
    title: 'The Newspaper Article',
    flavourText: 'Page seven. Buried, but not buried enough. The headline is accurate. The photograph is worse.',
    tier: 'threat',
    options: [
      {
        label: 'Buy the column',
        flavourText: 'Counter-narrative, professionally produced. It almost works.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -3 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 3 },
      },
      {
        label: 'Issue a denial',
        flavourText: 'The denial is believed by no one relevant. It reduces the spread marginally.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
      {
        label: 'Ignore it',
        flavourText: 'The article is read. Filed. Referenced.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'the_newspaper_article', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
    ],
  },
  {
    id: 'arson_inspector',
    title: 'The Arson Inspector',
    flavourText: 'The fire at the church was not an accident. He has reached a conclusion. You appear in it.',
    tier: 'threat',
    options: [
      {
        label: 'Cooperate fully',
        flavourText: 'You are forthcoming about everything except the relevant things.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -3 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'influence', min: 2 },
            { type: 'resourceMin', resource: 'gold', min: 1 },
          ],
        },
      },
      {
        label: 'Provide a scapegoat',
        flavourText: 'Someone else faces the consequences. You live with having arranged this.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
      {
        label: 'Sit through the visit',
        flavourText: 'You say nothing useful. He writes it down anyway. The investigation continues.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'arson_inspector', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
    ],
  },
  {
    id: 'missing_persons',
    title: 'Missing Persons Report',
    flavourText: 'Four names. You recognise two of them. A third you placed there intentionally.',
    tier: 'threat',
    options: [
      {
        label: 'Provide information',
        flavourText: 'Selective cooperation reduces scrutiny. For now.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -2 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
      {
        label: 'Claim ignorance',
        flavourText: 'The claim is noted. The investigation widens.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'missing_persons', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
      {
        label: 'Find the other two first',
        flavourText: 'Pre-emptive resolution. The expense is considerable. So is the outcome.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -3 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'gold', min: 2 },
            { type: 'resourceMin', resource: 'followers', min: 1 },
          ],
        },
      },
    ],
  },

  // ─── Y'HA-NTHLEI CHAIN THREATS ─────────────────────────────────────────────────
  {
    id: 'selectman_has_questions',
    title: 'The Selectman Has Questions',
    flavourText: 'He saw your people past the grain stores. He has been asking around. He is the kind of man who keeps asking.',
    tier: 'threat',
    options: [
      {
        label: 'Meet with him and misdirect',
        flavourText: 'The donation carried more weight than the explanation. He seemed satisfied.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Refer him to the coastal authority',
        flavourText: 'A jurisdictional matter. He pursued it for a week and found different ones.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
      {
        label: 'Give him a name to follow',
        flavourText: 'He was grateful for the lead. The name you gave him is no longer available.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'neighbour_has_concerns',
    title: 'The Neighbour Has Concerns',
    flavourText: 'She waited until the third day to say something. This is either patience or reluctance. The bag is still there.',
    tier: 'threat',
    options: [
      {
        label: 'Explain it away',
        flavourText: 'A misdelivery. Entirely routine. She appears to believe this, which is worse.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        label: 'Move the bag',
        flavourText: 'Out of sight. It is not, however, out of smell.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 1 },
      },
      {
        label: 'Invite her to hear more about the congregation',
        flavourText: 'She came the next Thursday. She has not missed a Thursday since.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'something_came_to_the_door',
    title: 'Something Came to the Door',
    flavourText: 'The foreman is not at the refinery. Something has been at the door for three hours. It has not knocked.',
    tier: 'threat',
    options: [
      {
        label: 'Open the door',
        flavourText: 'We are not certain what we gave in return. The door has been left open since.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 4 },
        ],
      },
      {
        label: 'Bar the door and wait',
        flavourText: 'It waited longer than we did. When we checked at dawn it was gone. The step was wet.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
      {
        label: 'Send someone else to answer',
        flavourText: 'They came back. They were fine. They are not fine.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 4 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
    ],
  },
  {
    id: 'terms_remain',
    title: 'The Terms Remain',
    flavourText: 'The shape left something on the doorstep. We have not opened it. Six days. It does not get lighter.',
    tier: 'threat',
    options: [
      {
        label: 'Open it',
        flavourText: 'The terms were unchanged. Reading them again cost more. The path is still open.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'insertCard', cardId: 'yha_nthlei_4', position: 'random', minPos: 2, maxPos: 4 },
        ],
      },
      {
        label: 'Leave it unopened',
        flavourText: 'We are aware of it. It is aware of us being aware of it. This is not a comfortable arrangement.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'terms_remain', position: 'random', minPos: 4, maxPos: 7 },
        ],
      },
    ],
  },

  // ─── DOOM-INSERTED ───────────────────────────────────────────────────────────
  {
    // Inserted by doom tier 2 (The Geometry Is Wrong) — "Let them measure" option.
    id: 'revelation',
    title: 'Revelation',
    flavourText: 'The measurement was right. The walls are wrong. The room is wrong. The ceiling is wrong. You are in exactly the right place.',
    tier: 'threat',
    options: [
      {
        label: 'Accept it',
        flavourText: 'The congregation accepts this more readily than you did.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
      {
        label: 'Suppress it',
        flavourText: 'The suppression is only partially successful.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
    ],
  },

  // ─── INSERTED THREATS ───────────────────────────────────────────────────────────
  {
    // Inserted by multiple cards. Escalates on repeat draws.
    id: 'investigators_file',
    title: "Investigator's File",
    flavourText: 'In a low-lit office, a thin file with your address on it. At the back of a cabinet. For now.',
    tier: 'threat',
    accumulates: true,
    flavourTextByDrawCount: {
      1: "Somewhere in a low-lit office, someone has a thin file with your address on it. It's at the back of the cabinet. For now.",
      2: 'The file has moved. There is a second file. They have been cross-referenced.',
      3: 'Three visits. This one has a warrant.',
    },
    options: [
      {
        label: 'Be proactive',
        flavourText: 'Gold spent, the matter reduced. For now.',
        hideWhenUnavailable: true,
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        // P22-P23-04: cardDrawCount gate separated from resource cost
        // — option only shows on 1st draw; resource cost checked separately by engine
        condition: { type: 'cardDrawCount', cardId: 'investigators_file', max: 1 },
      },
      {
        label: 'Be proactive: second attempt',
        flavourText: 'More expensive now. The file has context.',
        hideWhenUnavailable: true,
        effects: [
          { type: 'resource', resource: 'gold', delta: -3 },
          { type: 'resource', resource: 'influence', delta: -1 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'gold', min: 3 },
            { type: 'cardDrawCount', cardId: 'investigators_file', min: 2, max: 2 },
          ],
        },
      },
      {
        label: 'Do nothing',
        flavourText: 'The file sits. It grows.',
        effects: [
          { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 5, maxPos: 8 },
        ],
        condition: { type: 'cardDrawCount', cardId: 'investigators_file', max: 2 },
      },
      {
        label: 'A warrant has been issued',
        flavourText: 'Three visits means a warrant. The congregation scatters.',
        hideWhenUnavailable: true,
        effects: [
          { type: 'resource', resource: 'followers', delta: -3 },
          { type: 'resource', resource: 'influence', delta: -3 },
        ],
        condition: { type: 'cardDrawCount', cardId: 'investigators_file', min: 3 },
      },
    ],
  },
  {
    // Inserted by the_landlord_cometh — "Remind him you know things"
    id: 'local_gossip',
    title: 'Local Gossip',
    flavourText: "Someone's been talking. It's always someone. You have a shortlist.",
    tier: 'threat',
    options: [
      {
        label: 'Find the source',
        flavourText: 'The source is found. The shortlist was accurate.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
      {
        label: 'Wait it out',
        flavourText: 'The gossip fades. The memory of it does not.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'influence', delta: -1 },
        ],
      },
    ],
  },
  {
    // P26-13. Inserted by woodcutters_report "Buy the map" — bad outcome. Converted from treat.
    id: 'an_unremarkable_stump',
    title: 'An Unremarkable Stump',
    flavourText: 'The roots go further down than the tree was tall. The silence is the wrong kind.',
    tier: 'threat',
    options: [
      {
        label: 'Leave',
        flavourText: 'You leave. The image stays. It will be there when you close your eyes tonight.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
      {
        label: 'Wait at the treeline',
        flavourText: 'You send them ahead. You wait at the treeline. They do not come back.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
  {
    // Inserted by the_landlord_cometh — "Relocate".
    // P20-Q: passive Gold −1/reshuffle removed; option costs carry the weight.
    id: 'lost_safehouse',
    title: 'Lost Safehouse',
    flavourText: 'The new location has advantages. Fewer windows. Less scrutiny. More rats.',
    tier: 'threat',
    options: [
      {
        label: 'Re-establish routines',
        flavourText: 'Expensive. Necessary. The drain stops.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -3 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 3 },
      },
      {
        label: 'Accept the limitations',
        flavourText: 'You adapt. Morale frays. The rats are at least quiet.',
        effects: [
          // P20-O: add fol-1 so opt2 is no longer strictly better than opt1.
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
  {
    // Inserted by follower_confesses_doubt — "Release them"
    id: 'loose_end',
    title: 'Loose End',
    flavourText: 'They left quietly. That\'s the problem. Quiet people become loud problems.',
    tier: 'threat',
    options: [
      {
        label: 'Find them',
        flavourText: 'They are found. The situation is resolved. You do not ask how.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
      {
        label: 'Hope for the best',
        flavourText: 'They surface eventually. So does the problem.',
        effects: [
          { type: 'randomOutcome', outcomes: [
            { weight: 1, effects: [], flavourText: 'They surface. They say nothing.' },
            { weight: 1, effects: [{ type: 'insertCard', cardId: 'investigators_file', position: 'discard' }], flavourText: 'They surface. They say everything.' },
          ]},
        ],
      },
    ],
  },
  {
    // Inserted by supplies_dwindle — "Frame as spiritual discipline"
    id: 'desperate_congregation',
    title: 'Desperate Congregation',
    flavourText: "They've been patient. Spiritually patient. That has a limit.",
    tier: 'threat',
    options: [
      {
        label: 'Bribe them',
        flavourText: 'Gold buys patience. A limited quantity of patience.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Deliver a rousing sermon',
        flavourText: 'The sermon works. The hunger remains.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
      {
        label: 'Reveal something true',
        flavourText: 'You spend your credibility on honesty. They are moved. So are you.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
  {
    // Inserted by the_donation — "Accept it"
    id: 'strings_attached',
    title: 'Strings Attached',
    flavourText: 'The envelope had no name on it. The note inside knew yours.',
    tier: 'threat',
    uniqueInDeck: true,
    options: [
      {
        label: 'Pay what\'s asked',
        flavourText: 'The amount is unreasonable. You pay it anyway.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'randomOutcome', outcomes: [
            { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: 0 }], flavourText: 'They asked for nothing this time. That is the worst sign.' },
            { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: -1 }], flavourText: 'A token amount. They are being patient.' },
            { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: -2 }], flavourText: "They asked for little. That's more suspicious than the alternative." },
            { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: -3 }], flavourText: 'The amount was firm. No receipt was offered.' },
            { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: -4 }], flavourText: 'The demand was significant. No further contact, as yet.' },
          ]},
        ],
        condition: { type: 'and', conditions: [
          { type: 'resourceMin', resource: 'gold', min: 3 },
          { type: 'resourceMin', resource: 'followers', min: 1 },
        ]},
      },
      {
        label: 'Ignore it',
        flavourText: 'The note is filed. A follow-up arrives. A representative will be in touch.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'their_representative', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },
    ],
  },
  {
    // Inserted by strings_attached — "Ignore it"
    id: 'their_representative',
    title: 'Their Representative',
    flavourText: "He's not a threat. He's very clear about that. He's just here to clarify the original arrangement.",
    tier: 'threat',
    options: [
      {
        label: 'Settle the debt now',
        flavourText: 'He takes the gold. He takes the followers you offered as collateral. He leaves.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -3 },
          { type: 'resource', resource: 'followers', delta: -1 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'gold', min: 3 },
            { type: 'resourceMin', resource: 'followers', min: 2 },
          ],
        },
      },
      {
        label: 'Offer something else',
        flavourText: 'He accepts a relic in lieu. The arrangement continues under different terms.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'insertCard', cardId: 'ongoing_arrangement', position: 'random', minPos: 2, maxPos: 5 },
        ],
        condition: { type: 'resourceMin', resource: 'relics', min: 1 },
      },
      {
        label: 'Admit you cannot pay',
        flavourText: 'He already knew. He came to hear you say it. He leaves with something else.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 4 },
        ],
      },
    ],
  },
  {
    // Inserted by rival_stirs — "Report them anonymously"
    id: 'their_survivors',
    title: 'Their Survivors',
    flavourText: 'They reorganised faster than expected. Also changed to more tasteful robes now, which is irritating.',
    tier: 'threat',
    options: [
      {
        label: 'Approach them',
        flavourText: 'The absorption is smooth. Their doctrine is less smooth.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        // P17-13: opt2 no longer reinserts their_survivors (was a soft loop).
        // Added an influence cost reflecting political ground ceded by inaction,
        // and self-remove so the card resolves cleanly. rival_escalation insert
        // retained — the rival doctrine still gains.
        label: 'Watch them',
        flavourText: 'You watch. They grow. They recruit from your fringes. Some of yours drift their way.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'removeCard', cardId: 'their_survivors' },
          { type: 'insertCard', cardId: 'rival_escalation', position: 'discard' },
        ],
        // No condition gate — letting the influence cost go into deficit (per
        // P18-8 batch resolution) is preferable to creating a new allBlocked
        // lockout when both opt1 (gold ≥ 1) and opt2 would be ungated.
      },
    ],
  },
  {
    // Inserted by rival_stirs / their_survivors
    id: 'rival_escalation',
    title: 'Rival Escalation',
    flavourText: "They've started recruiting from your fringes. The audacity is almost impressive.",
    tier: 'threat',
    options: [
      {
        label: 'Strike back',
        flavourText: 'The rival is eliminated. The robes are burned. You feel better than you expected.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'removeCard', cardId: 'their_survivors' },
          { type: 'removeCard', cardId: 'evidence_of_rival' },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
      {
        label: 'Poach their best',
        flavourText: 'The best of them arrive with their resentments intact. That fades.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Escalate to authorities',
        flavourText: 'Civic intervention. Useful. Creates its own paperwork.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -2 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'insertCard', cardId: 'investigators_file', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
    ],
  },
  {
    // Inserted by the_census_agent — "Cooperate fully"
    id: 'their_report',
    title: 'Their Report',
    flavourText: 'Six pages. Mostly accurate. The section on membership numbers is over-estimated, which is flattering.',
    tier: 'threat',
    options: [
      {
        label: 'Contest it formally',
        flavourText: 'The contestation is noted. An amendment is filed. No one reads the amendment.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        label: 'Let it circulate',
        flavourText: 'Most of those who read it will set it aside. Most.',
        effects: [
          { type: 'randomOutcome', outcomes: [
            { weight: 1, effects: [], flavourText: 'Most who read it set it aside. Most.' },
            { weight: 1, effects: [{ type: 'insertCard', cardId: 'investigators_file', position: 'discard' }], flavourText: 'Someone at the bureau found the membership figures interesting.' },
          ]},
        ],
      },
    ],
  },
  {
    // Inserted by the_census_agent — "Provide misleading figures"
    id: 'their_suspicion',
    title: 'Their Suspicion',
    flavourText: "They don't know anything. They feel something. Feelings file reports too, it turns out.",
    tier: 'threat',
    options: [
      {
        label: 'Be visibly boring for a fortnight',
        flavourText: 'The performance is convincing. You almost convince yourself.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
      {
        label: 'Do nothing differently',
        flavourText: 'The feeling becomes a certainty. The certainty becomes a file.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
    ],
  },
  {
    // Inserted by local_elections — "Back them openly"
    id: 'political_debt',
    title: 'Political Debt',
    flavourText: "He won. He's delighted. He'll be calling in a favour, and it won't be a small one.",
    tier: 'threat',
    options: [
      {
        label: 'Pay it early',
        flavourText: 'Pre-emptive generosity. He is satisfied. For now.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Wait for the call',
        flavourText: 'The call comes. It is not a small favour.',
        effects: [
          { type: 'randomOutcome', outcomes: [
            { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: -4 }], flavourText: 'He wanted cash. A significant amount. Paid discreetly, as requested.' },
            { weight: 1, effects: [{ type: 'resource', resource: 'followers', delta: -2 }], flavourText: "He didn't want money. He wanted access. Two of yours went with him." },
            { weight: 1, effects: [{ type: 'insertCard', cardId: 'public_scrutiny', position: 'discard' }], flavourText: 'He gave an interview. He named you as a supporter. He meant it as a compliment.' },
          ]},
        ],
      },
    ],
  },
  {
    // Inserted by congregation_meets — "Deliver a sermon"; relic_market — "Send someone after hours"
    id: 'scrutiny',
    title: 'Scrutiny',
    flavourText: 'Someone with a clipboard has started attending meetings. Oh no.',
    tier: 'threat',
    options: [
      {
        label: 'Welcome them openly',
        flavourText: 'The scrutiny is embraced. It returns the embrace.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
      {
        label: 'End the campaign',
        flavourText: 'The attention lapses. The clipboard person leaves. The influence gained remains.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
    ],
  },
  {
    // Inserted by the_census_agent — "Make the problem go away".
    // P20-Q: passive Dread +1/reshuffle removed. Only Clarence removes it; opt1 "Carry it" still reinserts with Dread +1.
    id: 'what_was_done',
    title: 'What Was Done',
    flavourText: 'Clarence knows. You know. The basement knows. Let\'s leave it there.',
    tier: 'threat',
    options: [
      {
        label: 'Carry it',
        flavourText: 'There is nothing to be done. You carry it.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'what_was_done', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },
    ],
  },
  {
    // Inserted by the_old_book — "Burn it".
    // Normal case: Dread +1, card goes to discard (reshuffles back).
    // High-dread case (dread ≥8): surfaces god path card.
    // uniqueInDeck: capped to 1 copy — second insertion is silently skipped.
    id: 'what_was_already_read',
    title: 'What Was Already Read',
    flavourText: 'The first page was all it needed.',
    tier: 'threat',
    uniqueInDeck: true,
    options: [
      {
        // P17-15: low-dread defer. No reinsert — resolves to discard and
        // reshuffles back like any threat. The +1 dread climbs toward the
        // recite threshold so the card self-resolves over repeated deferrals.
        label: 'Set it aside',
        flavourText: 'You shelve it, spine out, where you will not meet its gaze. It waits. So do you.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMax', resource: 'dread', max: 5 },
      },
      {
        // P17-15: recite now removes the card so it cannot linger or re-grant.
        label: 'The words arrange themselves',
        flavourText: 'At the edge of collapse, the text completes its purpose. The path advances.',
        effects: [
          { type: 'setPrepTag', tag: 'recited' },
          { type: 'removeCard', cardId: 'what_was_already_read' },
        ],
        condition: { type: 'resourceMin', resource: 'dread', min: 6 },  // S3: dread gate lowered from 8 to 6
      },
    ],
  },
  {
    // Inserted by the_fire — "Investigate"
    id: 'evidence_of_rival',
    title: 'Evidence of a Rival',
    flavourText: 'The boot. And now, on reflection, the smell. And the markings on the doorframe you tried to scrub off.',
    tier: 'threat',
    options: [
      {
        label: 'Act on it immediately',
        flavourText: 'The rival is eliminated. The evidence is less elegant than the boot.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'removeCard', cardId: 'their_survivors' },
          { type: 'removeCard', cardId: 'rival_escalation' },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
      {
        label: 'File it away',
        flavourText: 'It is filed. The rival is not.',
        effects: [
          { type: 'insertCard', cardId: 'rival_escalation', position: 'discard' },
        ],
      },
    ],
  },
  {
    // Inserted by political_debt — "Wait for the call"
    id: 'public_scrutiny',
    title: 'Public Scrutiny',
    flavourText: "You're in the paper again. This time there were no typos. Progress, of a kind.",
    tier: 'threat',
    options: [
      {
        label: 'Give a statement',
        flavourText: 'The statement is measured. The dread is not.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
      {
        label: 'Say nothing',
        flavourText: 'The silence is read as integrity by those who are already loyal.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
      {
        label: 'Reframe entirely',
        flavourText: 'The narrative inverts. The paper prints a correction. Nobody reads corrections.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 7 },
      },
    ],
  },

  // ─── THREAT CHAINS ────────────────────────────────────────────────────────────
  {
    // Inserted by something_on_the_hook — "Keep it". Recurs until "Release it" exits.
    id: 'the_thing_in_the_tank',
    title: 'The Thing in the Tank',
    flavourText: "It learned to tap on the glass. We learned what the tapping means. This was probably a mistake.",
    tier: 'threat',
    options: [
      {
        // Unconditional option — satisfies allBlocked invariant.
        // P21-13: influence bumped +1→+2; listening has real payoff even when forced.
        label: 'Listen to it',
        flavourText: 'The tapping had a meaning. It was legible. That was worse.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'insertCard', cardId: 'the_thing_in_the_tank', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
      {
        // Middle-ground deferral — P21-13: follower cost removed so this option
        // has a clear niche: cheap stall (gold only) vs. permanent exit (opt3, −1 fol).
        label: 'Feed it',
        flavourText: 'One of ours goes down with the pail. The tapping stops. Presently, they come back up.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'insertCard', cardId: 'the_thing_in_the_tank', position: 'random', minPos: 5, maxPos: 8 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        // Permanent exit. Costs a follower (narratively: someone goes with the tank).
        label: 'Release it',
        flavourText: 'The tank goes to the shore. The thing leaves. The headcount is different after.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -3 },
          { type: 'resource', resource: 'followers', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
    ],
  },
  {
    // Inserted by artefact_from_deep — "Keep it"
    id: 'fishermans_return',
    title: "The Fisherman's Return",
    flavourText: "He has noticed his mistake and wants the relic back. He's asking with a boat hook stern in his hand.",
    tier: 'threat',
    options: [
      {
        label: 'Return the artefact',
        flavourText: "He takes one. He didn't count them when he sold it. You don't correct him.",
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'relics', min: 1 },
      },
      {
        // P22-P23-64: removed covenant_demands insert; removed opts 3 (stall) and 4 (let him see).
        // Two-option card — if neither resource is available the run ends here by design.
        label: 'Refuse',
        flavourText: 'He does not argue. He sends a different kind of message.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 3 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
    ],
  },
  {
    // Inserted by fishermans_return — "Refuse"
    id: 'covenant_demands',
    title: 'The Covenant Demands',
    flavourText: 'The arrangement has terms. The terms have arrived.',
    tier: 'threat',
    options: [
      {
        label: 'Pay the covenant',
        flavourText: 'The price is paid. The arrangement is satisfied. For now.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -2 },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'relics', min: 1 },
            { type: 'resourceMin', resource: 'followers', min: 2 },
          ],
        },
      },
      {
        label: 'Refuse the terms',
        flavourText: 'The refusal is noted. The covenant has a memory.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 4 },
        ],
      },
    ],
  },
  {
    // Inserted by their_representative — "Offer something else".
    // P20-Q: passive Inf −1/reshuffle removed. Folded into opt2 so deferring still costs.
    id: 'ongoing_arrangement',
    title: 'The Ongoing Arrangement',
    flavourText: 'It seemed reasonable at the time. Most arrangements do.',
    tier: 'threat',
    options: [
      {
        label: 'Pay it off',
        flavourText: 'The debt is settled. The arrangement concludes.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -3 },
          { type: 'removeCard', cardId: 'ongoing_arrangement' },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 3 },
      },
      {
        label: 'Continue the arrangement',
        flavourText: 'The terms hold. The cost is modest, for now.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'insertCard', cardId: 'ongoing_arrangement', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
    ],
  },
  {
    // Inserted by the_defector — "Take her in"
    id: 'their_former_associates',
    title: 'Her Former Associates',
    flavourText: "They know she came to you. They'd like a word. Several words, probably.",
    tier: 'threat',
    options: [
      {
        label: 'Meet with them',
        flavourText: 'The meeting is tense. The outcome is negotiated.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Make her disappear',
        flavourText: 'She disappears. The associates stop asking.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 3 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
    ],
  },

  // ─── Blessing-injected cards ──────────────────────────────────────────────

  {
    // Seeded into starting deck by The Drowned Mark blessing.
    // P20-Q: onDraw removed — boon/bane are now explicit option choices.
    // P19-28: title renamed to "The Drowned Mark" (matches its seeding blessing)
    // to remove the display-title collision with the god-path card yha_nthlei_3,
    // also titled "The Innsmouth Look". Id kept to avoid art/cardArt-key churn.
    id: 'innsmouth_look_marked',
    title: 'The Drowned Mark',
    flavourText: 'The mark opened doors. The doors cost more than the mark.',
    tier: 'threat',
    options: [
      {
        // Full boon/bane trade made explicit — same numbers as the old onDraw.
        label: 'Lean into it',
        flavourText: 'The mark is part of you now. You stopped arguing with it some time ago.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
      {
        label: 'Keep your head down',
        flavourText: 'Not every door needs opening. You keep the mark quiet.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
      {
        // P17-8 (s94): trade influence for follower density. Fol+1→+2 (P20-Q)
        // to compete now that opt1 gives Fol+1 without inf cost.
        label: 'Find your own',
        flavourText: 'The other marked close around you. Some don\'t leave when the conversation ends.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
    ],
  },

  {
    // Inserted whenever Dread hits 10. Surfaces before the Unravelling card so player can manage Dread first.
    id: 'the_weight_of_it',
    title: 'The Weight of It',
    flavourText: 'It has been building. The congregation can feel it. You can feel them feeling it. Something is going to give.',
    tier: 'threat',
    options: [
      {
        label: 'Steady them',
        flavourText: "You don't explain. You don't comfort. You occupy every space in their attention.",
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -3 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
      {
        label: 'Buy time',
        flavourText: 'Incense. Ritual. The appearance of control. It addresses the immediate problem.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: -3 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Sit with it',
        flavourText: "The weight remains. The day ends. Both facts are absorbed.",
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
    ],
  },
  // ─── DEFICIT CARDS (Gold / Followers / Influence at 0) ───────────────────────
  {
    // Inserted by engine when Gold hits 0. Removed if Gold rises above 0 before drawn.
    id: 'deficit_gold',
    title: 'The Ledger Calls',
    tier: 'threat',
    flavourText: 'The accounts are empty. Someone is already making enquiries.',
    options: [
      {
        label: 'Call in favours',
        flavourText: 'You spent goodwill you had been saving. It worked. It will cost more next time.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -2 },
        ],
        condition: { type: 'and', conditions: [
          { type: 'resourceMin', resource: 'followers', min: 1 },
          { type: 'resourceMin', resource: 'influence', min: 2 },
        ]},
      },
      {
        label: 'Liquidate the faithful',
        flavourText: 'Some assets are people. The funds arrived. Nobody asked where they came from.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'influence', delta: -1 },
        ],
        condition: { type: 'and', conditions: [
          { type: 'resourceMin', resource: 'followers', min: 2 },
          { type: 'resourceMin', resource: 'influence', min: 1 },
        ]},
      },
      {
        label: 'Sell the unsellable',
        flavourText: 'The buyer did not ask what it was. The price suggested they had some idea.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'resource', resource: 'relics', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'relics', min: 1 },
      },
      {
        label: 'The ledger closes',
        flavourText: 'There is nothing left to draw on. The cause ends here.',
        effects: [{ type: 'endRun', reason: 'The accounts are empty. Someone is already at the door.' }],
        succumbOption: true,
      },
    ],
  },
  {
    // Inserted by engine when Followers hits 0. Removed if Followers rises above 0 before drawn.
    id: 'deficit_followers',
    title: 'The Congregation Thins',
    tier: 'threat',
    flavourText: 'The chairs are set out. No one sits in them. The candles have stopped being worth lighting.',
    options: [
      {
        label: 'Spend the reputation',
        flavourText: 'Money opened the door. Your name got them through. Both are slightly diminished.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -2 },
        ],
        condition: { type: 'and', conditions: [
          { type: 'resourceMin', resource: 'gold', min: 1 },
          { type: 'resourceMin', resource: 'influence', min: 2 },
        ]},
      },
      {
        label: 'Make a scene',
        flavourText: 'You spent heavily and showed yourself in public. People came to look. Some stayed.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: -1 },
        ],
        condition: { type: 'and', conditions: [
          { type: 'resourceMin', resource: 'gold', min: 2 },
          { type: 'resourceMin', resource: 'influence', min: 1 },
        ]},
      },
      {
        label: 'Show them something',
        flavourText: 'You brought it out. The curious came closer. Curiosity is reliable.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'resource', resource: 'relics', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'relics', min: 1 },
      },
      {
        label: 'The last one left',
        flavourText: 'The room is empty. The cause ends here.',
        effects: [{ type: 'endRun', reason: 'The chairs sit in rows. There is no one left to fill them.' }],
        succumbOption: true,
      },
    ],
  },
  {
    // Inserted by engine when Influence hits 0. Removed if Influence rises above 0 before drawn.
    id: 'deficit_influence',
    title: 'No One Is Listening',
    tier: 'threat',
    flavourText: 'The right doors are closed. The wrong ones have stopped opening. Your name gets a pause, then nothing.',
    options: [
      {
        label: 'Send envoys',
        flavourText: 'You paid people to speak well of you. They were convincing. Best not to ask why.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -2 },
        ],
        condition: { type: 'and', conditions: [
          { type: 'resourceMin', resource: 'gold', min: 1 },
          { type: 'resourceMin', resource: 'followers', min: 2 },
        ]},
      },
      {
        label: 'Appear in person',
        flavourText: 'You arrived, you spent, you were seen. It is a crude method. It functions.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: -1 },
        ],
        condition: { type: 'and', conditions: [
          { type: 'resourceMin', resource: 'gold', min: 2 },
          { type: 'resourceMin', resource: 'followers', min: 1 },
        ]},
      },
      {
        label: 'Demonstrate something',
        flavourText: 'You showed them something that could not be explained. Interest followed.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'relics', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'relics', min: 1 },
      },
      {
        label: 'The name means nothing',
        flavourText: 'There is no longer anyone to persuade. The cause ends here.',
        effects: [{ type: 'endRun', reason: 'Without influence, the cult cannot operate. It disbands quietly. We are left alone.' }],
        succumbOption: true,
      },
    ],
  },

  // ─── OVERFLOW CARDS (Gold / Influence / Followers at 10) ──────────────────────
  {
    // Inserted by engine when Gold hits 10. Removed if Gold drops below 10 before drawn.
    id: 'the_ledger_is_noticed',
    title: 'The Ledger Is Noticed',
    flavourText: 'Someone has been watching the accounts. The surplus is not, in their view, explained. They want one.',
    tier: 'threat',
    options: [
      {
        label: 'Settle quietly',
        flavourText: "The ledger is rebalanced. The others note that it had to be.",
        effects: [
          { type: 'resource', resource: 'gold', delta: -5 },
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'followers', delta: -2 },
        ],
      },
    ],
  },
  {
    // Inserted by engine when Influence hits 10. Removed if Influence drops below 10 before drawn.
    id: 'the_wrong_rooms',
    title: 'The Wrong Rooms',
    flavourText: "You've been seen in the wrong rooms by the right people. Or the right rooms. It no longer matters.",
    tier: 'threat',
    options: [
      {
        label: 'Step back',
        flavourText: "You withdraw from the public eye. The eye follows you anyway.",
        effects: [
          { type: 'resource', resource: 'influence', delta: -5 },
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: -2 },
        ],
      },
    ],
  },
  {
    // Inserted by engine when Followers hits 10. Removed if Followers drops below 10 before drawn.
    id: 'theyre_not_listening',
    title: "They're Not Listening",
    flavourText: 'You have been speaking. They have been in the room. Presence and attention are not the same thing.',
    tier: 'threat',
    options: [
      {
        label: 'Give them something worth hearing',
        flavourText: "Some of them stay. The rest were not going to stay regardless.",
        effects: [
          { type: 'resource', resource: 'followers', delta: -5 },
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'influence', delta: -2 },
        ],
      },
    ],
  },

  {
    // P19-29: inserted by every Dark Young Guardian option (pos 2–4) when the
    // Guardian is resolved — covers both the Grove's Gift blessing path and the
    // dark_young_pilgrim "Feed it" path. (Was guardian.onDraw, removed P17-2.)
    id: 'it_still_needs_feeding',
    title: 'It Still Needs Feeding',
    flavourText: "The congregation began to understand the arrangement. The arrangement did not care whether they understood.",
    tier: 'threat',
    // P17-2: one-shot — the previous self-reinsert on every option created
    // a recurring spiral that was never experienced in play (the chain was
    // dead due to the onDraw engine bug). Now a single feeding tax companion
    // to the Guardian, inserted by dark_young_pilgrim's "Feed it".
    options: [
      {
        label: 'Feed it followers',
        flavourText: 'Two fewer faces at the meeting. The thing seemed satisfied. Temporarily.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
      {
        label: 'Feed it gold',
        flavourText: 'It does not value money. It values the effort it took to acquire.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Let it find its own food',
        flavourText: 'You looked away. When you looked back, the room was different.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 2 },
      },
    ],
  },
]
