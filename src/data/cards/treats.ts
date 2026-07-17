import type { Card } from '../../types'

export const TREAT_CARDS: Card[] = [
  // ─── ONE-SHOT TREATS ──────────────────────────────────────────────────────────

  {
    // Inserted by the_opium_den opt0 — "Encourage the visits".
    // opt0 "Draw on the knowledge" gives relics+1 + dread+1 and self-removes.
    id: 'the_dreamer',
    title: 'The Dreamer',
    flavourText: "One of your followers has been dreaming in a language not spoken in four thousand years. They're translating.",
    tier: 'treat',
    options: [
      {
        label: 'Draw on the knowledge',
        flavourText: 'The translation is incomplete. It is enough to find it.',
        effects: [
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'removeCard', cardId: 'the_dreamer' },
        ],
      },
      {
        label: 'Set it aside',
        flavourText: "The language resists translation. You leave the notes on the desk. They're still there in the morning.",
        effects: [
          { type: 'resource', resource: 'gold',      delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'removeCard', cardId: 'the_dreamer' },
        ],
      },
    ],
  },
  {
    // Inserted by academic_society — "Attend as a civilian"
    id: 'a_useful_contact',
    title: 'A Useful Contact',
    flavourText: 'He knows people. You know people. Neither of you says who.',
    tier: 'treat',
    options: [
      {
        label: 'Request followers',
        flavourText: 'He makes a call. A door opens.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 2 },
          { type: 'removeCard', cardId: 'a_useful_contact' },
        ],
      },
      {
        label: 'Request funds',
        flavourText: 'An envelope, unmarked, delivered the next morning.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'removeCard', cardId: 'a_useful_contact' },
        ],
      },
      {
        // P25 audit: removed investigators_file mechanic — clean dread-2 always available.
        label: 'Have a file buried',
        flavourText: 'The file is misfiled. In a drawer. In a filing cabinet. In a warehouse.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -2 },
          { type: 'removeCard', cardId: 'a_useful_contact' },
        ],
      },
    ],
  },
  {
    // Inserted by cursed_object — "Give it back to the merchant"
    id: 'merchant_remembers',
    title: 'The Merchant Remembers',
    flavourText: 'He returned the jar to wherever jars like that come from. He sent something else. Something without a jar.',
    tier: 'treat',
    options: [
      {
        label: 'Accept what he sent',
        flavourText: 'It is, in its way, useful.',
        effects: [
          { type: 'resource', resource: 'relics', delta: 2 },
          { type: 'removeCard', cardId: 'merchant_remembers' },
        ],
      },
      {
        label: 'Send it back again',
        flavourText: 'He will send something else. He always has something else.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'resource', resource: 'dread', delta: -2 },
          { type: 'removeCard', cardId: 'merchant_remembers' },
        ],
      },
    ],
  },

  // ─── PASSIVE TREATS ────────────────────────────────────────────────────────────

  {
    // Inserted by dreaming_academic — "Bring him in".
    // P17-18 (s94): converted from passive +1 relic/reshuffle + onDraw dread
    // to active per-encounter fork.
    // P19-32 (s99): made one-shot per playtest — no longer permanent, so it
    // resolves once then goes to permDiscardPile (supersedes the recurring intent).
    id: 'his_research_notes',
    title: 'His Research Notes',
    flavourText: 'Forty years. Impeccable sourcing. No conclusions. To conclude is to accept what the evidence means.',
    tier: 'treat',
    options: [
      {
        label: 'Consult the notes',
        flavourText: 'A relic surfaces from the marginalia. So does the cost.',
        effects: [
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
        ],
      },
      {
        label: 'Lose yourself in the margins',
        flavourText: "The footnotes are a year's reading. By the time you look up, the room is dark.",
        effects: [
          { type: 'resource', resource: 'dread', delta: -3 },
        ],
      },
    ],
  },
  {
    // Inserted by forgers_debt — "Meet him".
    // Active treat: player draws randomOutcome each encounter.
    // 33% gold +1 / 33% relics +1 / 33% dread +1 (equal odds, P24-13).
    // P25-58: removed permanent flag — should auto-remove after resolving like all treats.
    id: 'marsh_connection',
    title: 'The Marsh Connection',
    flavourText: 'He writes monthly now. The letters smell of brine, but the advice is excellent.',
    tier: 'treat',
    options: [
      {
        label: 'Read the letter',
        flavourText: 'The envelope is damp, as always.',
        effects: [
          { type: 'randomOutcome', outcomes: [
            { weight: 1, effects: [{ type: 'resource', resource: 'gold',   delta: 1 }], flavourText: 'A postal order arrived this month. No note, as usual.' },
            { weight: 1, effects: [{ type: 'resource', resource: 'relics', delta: 1 }], flavourText: 'A package from the coast. He sends these occasionally. Best not to ask.' },
            { weight: 1, effects: [{ type: 'resource', resource: 'dread',  delta: 1 }], flavourText: 'No useful advice this month. The postscript was not nothing, though.' },
          ]},
        ],
      },
    ],
  },
  {
    // Inserted by congregation_meets — "Dismiss early"
    id: 'the_ordinary_pie',
    title: 'The Ordinary Pie',
    flavourText: 'A pie arrived this morning. Left on the step. The filling has an unusual colour.',
    tier: 'treat',
    options: [
      {
        label: 'Share it round',
        flavourText: 'Everyone ate. The conversation was pleasant. The subject of the colour did not come up.',
        // P19-23: gold−2 → −1. At −2, the extra dread−1 over opt1 (free dread−1)
        // cost 2 gold — too steep for a treat. Now 1 gold buys the bigger heal.
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -2 },
          { type: 'removeCard', cardId: 'the_ordinary_pie' },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        label: 'Eat what\'s there',
        flavourText: 'It was sufficient. Nobody mentioned the smell.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'removeCard', cardId: 'the_ordinary_pie' },
        ],
      },
    ],
  },

  // ─── P24-12 RECLASSIFIED FROM threats.ts ─────────────────────────────────

  {
    // Reclassified treat (P24-12). Inserted by the_seance — "Let them do it alone".
    id: 'wandering_soul',
    title: 'Wandering Soul',
    flavourText: 'He showed up on a Tuesday. He\'s been sitting on the steps since. What day is it now?',
    tier: 'treat',
    options: [
      {
        label: 'Recruit him',
        flavourText: 'He is glad to have somewhere to be.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'gold', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        label: 'Turn him away',
        flavourText: 'He goes. You watch him go.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
  {
    // Reclassified treat (P24-12). Inserted by the_printing_press — "Forgery work".
    // P20-Q: passive Dread +1/reshuffle removed. Only opt1 unlocks marsh_connection.
    id: 'forgers_debt',
    title: "Forger's Debt",
    flavourText: "Mr. H. Marsh of Innsmouth has received strongly worded correspondence. He's written back. He wants to meet.",
    tier: 'treat',
    options: [
      {
        label: 'Meet him',
        flavourText: 'The meeting is unsettling. His advice: impeccably sourced. Shakes hands twice.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'marsh_connection', position: 'random', minPos: 2, maxPos: 5 },
        ],
      },
      {
        label: 'Ignore him',
        flavourText: "The letters keep arriving. You've found them useful.",
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'insertCard', cardId: 'forgers_debt', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
    ],
  },
  {
    // File move only — already tier: 'treat'. Inserted by travelling_merchant — "Buy it"
    // P22-P23-47: reclassified treat. Removed "Contain it" (looping cost opt) and self-reinsertion
    // from "Study it". Now a clean one-shot: study for relic at dread cost, or return it.
    // Closes P21-7 (chain design question — loop removed by design).
    id: 'cursed_object',
    title: 'Cursed Object',
    flavourText: 'It came in a jar. It seemed fine in the jar. It is less fine outside the jar.',
    tier: 'treat',
    options: [
      {
        label: 'Study it',
        flavourText: 'You learn something. The knowledge is not free.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
      },
      {
        // P24-12 C4: removed dread−2 — inserting a Treat must not be on a net-positive option.
        // Returning the object is uneventful; merchant_remembers is the upside.
        label: 'Give it back to the merchant',
        flavourText: 'He takes it back without surprise. He sends something in its place.',
        effects: [
          { type: 'insertCard', cardId: 'merchant_remembers', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },
    ],
  },
  {
    // File move only — already tier: 'treat'. Inserted by the_harbour — "Ask what he means by 'deep'"
    // P17-17: recategorized as treat — opt1 nets a relic + sets up a chain,
    // opt2 reduces dread; net pickup is positive despite the option costs.
    id: 'something_on_the_hook',
    title: 'Something on the Hook',
    flavourText: 'The net came up full. The thing in the net is not a fish. It is, however, cooperative.',
    tier: 'treat',
    options: [
      {
        label: 'Keep it',
        flavourText: 'It is kept in a tank in the cellar. Others have begun going down to look.',
        effects: [
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'the_thing_in_the_tank', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
      {
        // P21-11: −1 followers removed; +1 influence added.
        label: 'Return it',
        flavourText: 'As it went, it pulled one of ours with it. An effigy floated up in their place.',
        effects: [
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'relics', delta: 1 },
        ],
      },
    ],
  },
  {
    // File move only — already tier: 'treat'. Inserted by woodcutters_report "Buy the map" — real outcome.
    id: 'grove_awaits',
    title: 'The Grove Awaits',
    flavourText: "The map is accurate. The path is clear. You've been finding reasons not to go.",
    tier: 'treat',
    options: [
      {
        label: 'Send a scouting party',
        flavourText: 'Two followers. The map. Three days.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -2 },
          { type: 'randomOutcome', outcomes: [
            {
              weight: 1,
              flavourText: 'The coordinates were correct. Both returned. They don\'t speak of what they saw.',
              effects: [
                { type: 'resource', resource: 'gold', delta: 2 },
                { type: 'resource', resource: 'followers', delta: 2 },
              ],
            },
            {
              weight: 1,
              flavourText: 'One returned. He left with an effigy. He didn\'t leave with his colleague.',
              effects: [
                { type: 'resource', resource: 'relics', delta: 1 },
                { type: 'resource', resource: 'followers', delta: 1 },
              ],
            },
            {
              weight: 1,
              flavourText: 'Neither came back. The map did, three days later, on the doorstep.',
              effects: [
                { type: 'resource', resource: 'dread', delta: 2 },
              ],
            },
          ]},
          { type: 'removeCard', cardId: 'grove_awaits' },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 2 },
      },
      {
        label: 'Sell map to the relic market',
        flavourText: "The buyer didn't ask where it came from. You didn't ask who else had tried.",
        effects: [
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'removeCard', cardId: 'grove_awaits' },
        ],
      },
    ],
  },
]
