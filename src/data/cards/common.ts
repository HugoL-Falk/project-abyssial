import type { Card } from '../../types'

export const COMMON_CARDS: Card[] = [
  // ── Reclassified to Core (Phase 2, 2026-06-05) ────────────────────────────
  // the_harbour → core.ts (restored insertCard something_on_the_hook)
  // the_fire    → core.ts (restored insertCard arson_inspector)

  // ── Reclassified from Core (Task 1, 2026-07-02) ───────────────────────────
  {
    id: 'congregation_meets',
    title: 'The Congregation Meets',
    flavourText: 'Attendance is down, even though someone has been bringing homemade biscuits.',
    tier: 'common',
    options: [
      {
        label: 'Pass the collection plate',
        flavourText: 'The biscuit provider gives generously. You note this.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
        ],
      },
      {
        // P18-16 (s94): +2 influence → +1 follower. Sermon grows the flock
        // (thematic fit) and rebalances per Balance agent: followers carry
        // ~2:3 more value per point than influence, so +1 follower replaces
        // +2 influence at parity. Gate, dread scaling, scrutiny insertion
        // all preserved.
        label: 'Deliver a sermon',
        flavourText: 'You speak for twenty minutes. They leave shaken. That is the correct outcome.',
        dreadPressureScaling: true,
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: -1 },
          { type: 'insertCard', cardId: 'scrutiny', position: 'random', minPos: 5, maxPos: 9 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
      {
        label: 'Dismiss early',
        flavourText: 'The hall empties quickly. Someone lingers on the steps. You do not call after them.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'insertCard', cardId: 'the_ordinary_pie', position: 'random', minPos: 3, maxPos: 7 },
        ],
      },
    ],
  },
  {
    id: 'the_donation',
    title: 'The Donation',
    flavourText: 'Donations arrive by standing arrangement. This week\'s was heavier than usual. The postmark is illegible.',
    tier: 'common',
    options: [
      {
        label: 'Accept it',
        flavourText: 'The money is real. The note inside is carefully worded.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'insertCard', cardId: 'strings_attached', position: 'random', minPos: 4, maxPos: 8 },
        ],
      },
      {
        label: 'Return it anonymously',
        flavourText: 'One person noticed you turned it down. That\'s enough.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
    ],
  },

  {
    id: 'the_inheritance',
    title: 'The Inheritance',
    flavourText: "Another estate in dispute. The family didn't expect the terms.",
    tier: 'common',
    options: [
      {
        label: 'Fight it in court',
        flavourText: 'The solicitor was thorough. The family was not prepared for the solicitor.',
        effects: [
          { type: 'randomOutcome', outcomes: [
            { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: 0 }], flavourText: 'The judgment was in our favour. The debts were not in the will.' },
            { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: 1 }], flavourText: 'The settlement was modest. Enough, for now.' },
            { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: 2 }], flavourText: "The family's case was weaker than they'd prepared for." },
            { weight: 1, effects: [{ type: 'resource', resource: 'gold', delta: 3 }], flavourText: 'The family did not appear. Their solicitor cited ill health.' },
          ]},
        ],
      },
      {
        // P22-P23-31: Downgrade certainty premium from +3 → +2 to improve opt1 viability.
        label: 'Have a quiet word',
        flavourText: 'The family withdrew their objections. Quietly and without further questions.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'gold', delta: 2 },
        ],
      },
      {
        label: 'Relinquish',
        flavourText: 'You relinquish the claim. The family notes it. The daughter reaches out a fortnight later.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'the_newspaper',
    title: 'The Newspaper',
    flavourText: 'Page six. "Questions Raised About Local Society." The address is precise. The name, less so. Probably a typo.',
    tier: 'common',
    options: [
      {
        label: 'Buy the journalist',
        flavourText: 'He accepts. The story dies. He files a different story.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 2 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        label: 'Let it run',
        flavourText: 'It is read. It is filed. The culprit is now in several files.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 2 },
        ],
      },
      {
        label: 'Write a letter',
        flavourText: 'A measured response. Measured so carefully that it says nothing.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
    ],
  },
  {
    id: 'word_spreads',
    title: 'Word Spreads',
    flavourText: "You hear people talking. You didn't plan this. On the other hand, is it so bad?",
    tier: 'common',
    options: [
      {
        label: 'Lean into it',
        flavourText: 'The story grows past the version you told. The version coming back is unrecognisable.',
        // P19-22: opt0 was a flat inf+1/dread+2 with no niche vs the other two.
        // Add fol+1 — the spreading rumour draws new attendees — so it becomes
        // the followers+influence play (at a real dread cost).
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
      },
      {
        label: 'Let it settle',
        flavourText: 'Smaller story. More manageable story. Stories do not stay small.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        // P14-25: gate so opt 2 isn't pickable below 0 influence.
        condition: { type: 'resourceMin', resource: 'influence', min: 1 },
      },
      {
        // P14-16 / P17-7: relic-spend dread valve. Dread heal bumped -2 → -3
        // (s94) so the relic cost feels worth it; opt2 remains distinct via
        // input resource (influence, not relic).
        label: 'Produce credentials',
        flavourText: 'The credentials are presented. No one examines them closely. This is normal.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -3 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'relics', min: 1 },
      },
    ],
  },

  // ── Reclass-5 new common cards (2026-06-05) ───────────────────────────────

  {
    id: 'the_harbormaster',
    title: "The Harbormaster's Office",
    flavourText: "The docking fees have been recalculated again. The harbormaster insists this is routine. It always is.",
    tier: 'common',
    godPathWeight: 'yha_nthlei',
    options: [
      {
        label: 'Settle the record',
        flavourText: 'The fees are paid. The form is signed. His handwriting is extremely regular.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -2 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 2 },
      },
      {
        // P21-12: was +1 dread (no upside). Now −1 dread — the bureaucratic
        // dispute actually works; costs influence (the resource you fight with).
        label: 'Dispute the hours',
        flavourText: 'You cite tide tables. He cites others. Both are correct. You both know this.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
      {
        label: 'Send someone down',
        flavourText: "The money comes back. The person sent does not. No one asks why.",
        effects: [
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'resource', resource: 'followers', delta: -1 },
        ],
      },
    ],
  },
  {
    id: 'the_left_item',
    title: 'The Left Item',
    flavourText: 'Another item at the library. The librarian has a shelf for these. She has stopped asking.',
    tier: 'common',
    options: [
      {
        label: 'Retrieve it quietly',
        flavourText: 'You send someone. They retrieve it. She will remember their face.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -2 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
      {
        label: 'Ask her to forget it',
        flavourText: 'A favour. She extends it. You are now on her list of people who owe favours.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'influence', min: 1 },
      },
      {
        label: 'Call it a donation',
        flavourText: 'She accepts the framing. Three people heard you say it. One of them asks where the meetings are.',
        effects: [
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'the_collection',
    title: 'The Collection',
    flavourText: 'The envelopes come in. Most are light. The ones who give most are not always the ones who can afford to.',
    tier: 'common',
    options: [
      {
        label: 'Press for more',
        flavourText: 'Most comply. One stops attending after Tuesday. The envelopes more than cover it.',
        effects: [
          { type: 'resource', resource: 'gold', delta: 2 },
          { type: 'resource', resource: 'followers', delta: -1 },
        ],
      },
      {
        label: 'Accept what is given',
        flavourText: 'You thank each household by name. One of the newer attendees stays to help count.',
        // P20-O: swap inf+1 → fol+1 to restore common-pool follower coverage.
        effects: [
          { type: 'resource', resource: 'gold', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
      },
      {
        label: 'Waive the collection',
        flavourText: 'Two people stop you on the street to thank you. One of them you have never met.',
        // P19-16: inf+1 → inf+2 so the zero-gold option is a real influence push.
        effects: [
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'resource', resource: 'dread', delta: 1 },
        ],
      },
    ],
  },
  {
    // P22-53: reflavoured — original "one-off fishermen letter" didn't read as
    // weekly-recurring. Now "The Standing Objection" (old families, procedural
    // concern, ongoing) — same three options, same effects, new copy.
    id: 'the_complaint',
    title: 'The Standing Objection',
    flavourText: 'A letter from the old families again. The concern is procedural. The subtext is not.',
    tier: 'common',
    options: [
      {
        label: 'Settle it formally',
        flavourText: 'You pay the fee, file a response. They accept it. The matter is closed.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
      },
      {
        label: 'Call in a favour',
        flavourText: 'The letter is withdrawn. He looks like he would prefer not to explain why.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
      },
      {
        label: 'Leave it unanswered',
        flavourText: 'One of their members finds you after a meeting. He has questions of his own.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'the_delayed_shipment',
    title: 'The Delayed Shipment',
    flavourText: 'The weekly delivery. Late, as before. The cargo is never easy to describe accurately.',
    tier: 'common',
    options: [
      {
        label: 'Cut your losses',
        flavourText: "The wagon turns up at market without the driver. You take what's there and close the matter.",
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'gold', delta: 1 },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 1 },
      },
      {
        label: 'Send someone to look',
        flavourText: 'They find the wagon, and the driver. Sorting it out costs more than expected.',
        effects: [
          { type: 'resource', resource: 'gold', delta: -1 },
          { type: 'resource', resource: 'dread', delta: -1 },
        ],
        condition: { type: 'resourceMin', resource: 'gold', min: 1 },
      },
      {
        label: 'Say it was deliberate',
        flavourText: 'You give nothing away. This reads as composure. People trust composure.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
        ],
      },
    ],
  },
]
