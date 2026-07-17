import type { Card } from '../../types'

// ─── Tutorial Cards ───────────────────────────────────────────────────────────
// 6-card starting deck. olgreth_2 is NOT pre-seeded — it is queued into
// nextCycleQueue by olgreth_1's advanceGodPath effect (olgreth chain is
// registered in GOD_PATH_CHAINS in data/index.ts).
//
// Resource trace (starting 3/3/3/0/0):
//   0  tutorial_interface       -> Gold+1                      (4/3/3/0/0)
//   1  tutorial_basic_resources -> Gold-1, Fol+2, Relic+1      (3/5/3/0/1)
//   2  tutorial_dread_relics    -> Dread+13                    (3/5/3/13/1)
//      -> manually inserts tutorial_doom_card@top
//      -> manually inserts tutorial_reshuffle_card -> nextCycleQueue (pinnedNextCycle)
//   3  tutorial_doom_card       -> Gold-2, Fol-2, Dread-8      (1/3/3/5/1)
//   3  tutorial_threats_treats  -> threat->nextCycle, treat->nextCycle  (1/3/3/5/1)
//   4  tutorial_prep_intro      -> opt A: Inf+1, setPrepTag olgreth_prep, prep_react->nextCycle  (1/3/4/5/1)
//                                   opt B: Gold+1, prep_react->nextCycle                         (2/3/3/5/1)
//   5  olgreth_1                -> advanceGodPath (queues olgreth_2 -> nextCycleQueue)
//      -> draw pile now empty -> RESHUFFLE triggered
//   Post-reshuffle draw order:
//   6  tutorial_reshuffle_card  (pinnedNextCycle -- always first) (1/3/3/5/1)
//   7+ tutorial_threat_card + tutorial_prep_react + tutorial_treat_card + olgreth_2 (explicit order — see TUTORIAL_POST_RESHUFFLE_ORDER in deck.ts)
//      -> threat (Inf-1) and treat (Fol+2) in any order; olgreth_2 at >=25%
//   FINAL  olgreth_2            -> advanceGodPath + victory
//
// Safety: Gold min=1 (after doom card), Influence min=2 (after threat card).
// No resource hits 0. No conditions on any tutorial option -- no allBlocked risk.
// Player has 1 Relic from card 1 throughout. Even if spent (dread -2), dread
// still exceeds 10 on card 2 (+13 from 0 or -2 = 11/13 both > 10).

// ─── Regular Tutorial Cards ───────────────────────────────────────────────────

const tutorial_interface: Card = {
  id: 'tutorial_interface',
  title: 'The Interface',
  tier: 'tutorial',
  flavourText: 'The bar at the top tracks your five resources. The boxes at the bottom of the screen are your options. Tap one to resolve the card. Options shown in full are available. Greyed-out options have unmet requirements. If every option is unavailable at once, you succumb.',
  options: [
    {
      label: 'Continue',
      flavourText: 'Your Gold increases by 1.',
      effects: [{ type: 'resource', resource: 'gold', delta: 1 }],
    },
    {
      label: 'I need more first',
      flavourText: 'This is what a greyed-out option looks like. You do not have enough to take it.',
      condition: { type: 'resourceMin', resource: 'gold', min: 99 },
      effects: [],
    },
  ],
}

const tutorial_basic_resources: Card = {
  id: 'tutorial_basic_resources',
  title: 'Basic Resources',
  tier: 'tutorial',
  flavourText: 'Gold, Followers, Influence. The three regular resources to keep your cult alive. Keep each above zero and below ten, stray past either and the deck reacts. The jewel in each card header marks the type. Tap it for the tier.',
  options: [
    {
      label: 'Redirect the funds',
      flavourText: 'The funds arrived. They have been redirected. Two new members presented themselves shortly after.',
      effects: [
        { type: 'resource', resource: 'gold', delta: -1 },
        { type: 'resource', resource: 'followers', delta: 2 },
        { type: 'resource', resource: 'relics', delta: 1 },
      ],
    },
  ],
}

// Demo cards are declared before the cards that reference their IDs so that
// forward-reference issues are avoided if the engine ever resolves by variable
// rather than by string id. (Currently cardIds are strings, so ordering is
// technically irrelevant -- but declaring referenced cards first is cleaner.)

export const tutorial_doom_card: Card = {
  id: 'tutorial_doom_card',
  title: 'The Weight of It',
  tier: 'doom',
  flavourText: 'This entered the deck when Dread reached ten. It is single-use. If Dread reaches ten again, a worse one follows. Some members found the first one instructive.',
  options: [
    {
      label: 'Absorb it',
      flavourText: 'The costs were expected. Gold and Followers declined. Dread subsided. File it.',
      effects: [
        { type: 'resource', resource: 'gold', delta: -2 },
        { type: 'resource', resource: 'followers', delta: -2 },
        { type: 'resource', resource: 'dread', delta: -8 },
      ],
    },
  ],
}

export const tutorial_reshuffle_card: Card = {
  id: 'tutorial_reshuffle_card',
  title: 'A New Week',
  tier: 'tutorial',
  pinnedNextCycle: true,
  flavourText: 'Week 1 is over. The deck has reshuffled. Each reshuffle marks a new week. The god path advances toward its conclusion. Costs mount as weeks pass. Cards inserted last week surface now.',
  options: [
    {
      label: 'Continue',
      flavourText: 'Week 2 begins.',
      effects: [],
    },
  ],
}

export const tutorial_threat_card: Card = {
  id: 'tutorial_threat_card',
  title: 'An Unwanted Arrival',
  tier: 'threat',
  flavourText: 'The blood red jewel. Threat cards can surface anywhere in the deck. Most are removed once resolved. Influence is the cost of resolution here.',
  options: [
    {
      label: 'Handle it',
      flavourText: 'Influence declined by one. The matter is closed.',
      effects: [
        { type: 'resource', resource: 'influence', delta: -1 },
      ],
    },
  ],
}

export const tutorial_treat_card: Card = {
  id: 'tutorial_treat_card',
  title: 'A Fortunate Find',
  tier: 'treat',
  flavourText: 'The rose jewel. This treat was inserted earlier. Not all insertions are a problem.',
  options: [
    {
      label: 'Accept it',
      flavourText: 'Two new members joined without incident. The paperwork is minimal.',
      effects: [
        { type: 'resource', resource: 'followers', delta: 2 },
      ],
    },
  ],
}

const tutorial_dread_relics: Card = {
  id: 'tutorial_dread_relics',
  title: 'Dread & Relics',
  tier: 'tutorial',
  flavourText: 'Dread accumulates. Keep it below ten. At ten, a doom card enters the top of the draw pile, drawn next. The Relics counter sits beside the others. Tap it to spend one: pick any resource, move it two in either direction.',
  options: [
    {
      label: 'Examine the artefact',
      flavourText: 'Dread exceeded ten during the examination. The artefact itself remains inconclusive.',
      effects: [
        { type: 'resource', resource: 'dread', delta: 13 },
        { type: 'insertCard', cardId: 'tutorial_doom_card', position: 'top' },
        { type: 'insertCard', cardId: 'tutorial_reshuffle_card', position: 'nextCycle' },
      ],
    },
  ],
}

const tutorial_threats_treats: Card = {
  id: 'tutorial_threats_treats',
  title: 'Threats & Treats',
  tier: 'tutorial',
  flavourText: 'Some choices insert cards into the draw pile. Threat cards cost resources on arrival. Most are removed once resolved. Treat cards provide benefit. The rose jewel marks them. Both will surface after the next reshuffle.',
  options: [
    {
      label: 'Make the call',
      flavourText: 'A threat card and a treat card have been added to the deck. The rose jewel identifies the one worth looking forward to.',
      effects: [
        { type: 'insertCard', cardId: 'tutorial_threat_card', position: 'nextCycle' },
        { type: 'insertCard', cardId: 'tutorial_treat_card', position: 'nextCycle' },
      ],
    },
  ],
}

const tutorial_prep_intro: Card = {
  id: 'tutorial_prep_intro',
  title: 'The Prior Arrangement',
  tier: 'tutorial',
  flavourText: 'Some options carry forward. Setting a commitment now may unlock a different option in a later card. The activity log at the bottom of the screen records when these are set.',
  options: [
    {
      label: 'Make the arrangement',
      flavourText: 'The arrangement is noted. The activity log has recorded it.',
      effects: [
        { type: 'resource', resource: 'influence', delta: 1 },
        { type: 'setPrepTag', tag: 'olgreth_prep' },
        { type: 'insertCard', cardId: 'tutorial_prep_react', position: 'nextCycle' },
      ],
    },
    {
      label: 'Leave it open',
      flavourText: 'Nothing was committed. The option remains open in the loosest possible sense.',
      effects: [
        { type: 'resource', resource: 'gold', delta: 1 },
        { type: 'insertCard', cardId: 'tutorial_prep_react', position: 'nextCycle' },
      ],
    },
  ],
}

export const tutorial_prep_react: Card = {
  id: 'tutorial_prep_react',
  title: 'The Arrangement, Recalled',
  tier: 'tutorial',
  flavourText: 'The prior commitment surfaces. It was either made or it was not. The options below reflect this.',
  options: [
    {
      label: 'Complete it',
      flavourText: 'The arrangement held. Both parties benefited.',
      condition: { type: 'hasPrepTag', tag: 'olgreth_prep' },
      revealWhenLocked: true,
      effects: [
        { type: 'resource', resource: 'gold', delta: 1 },
        { type: 'resource', resource: 'followers', delta: 1 },
      ],
    },
    {
      label: 'Continue without it',
      flavourText: 'The arrangement was not made. This is fine. It is less fine than it could have been.',
      effects: [],
    },
  ],
}

// ─── Olgreth God Path Chain ───────────────────────────────────────────────────
// olgreth_2 is registered in GOD_PATH_CHAINS (data/index.ts) so advanceGodPath
// on olgreth_1 can queue it into nextCycleQueue without it being in TUTORIAL_CARDS.

export const olgreth_1: Card = {
  id: 'olgreth_1',
  title: 'The Name in the Margin',
  tier: 'god_path',
  godPath: 'olgreth',
  chainStage: 1,
  flavourText: 'A name. Buried in the margin of a page you didn\'t mean to open. This is the god path. A chain of ritual cards seeded into the run. There are two. Completing both ends the run.',
  options: [
    {
      label: 'Speak it aloud',
      flavourText: 'Something shifted. The second ritual card is in the deck. It was already waiting.',
      effects: [{ type: 'advanceGodPath' }],
    },
  ],
}

export const olgreth_2: Card = {
  id: 'olgreth_2',
  title: 'The Hollow Speaks',
  tier: 'god_path',
  godPath: 'olgreth',
  chainStage: 2,
  isSummoning: true,
  flavourText: 'The second card in the chain. The last one. What began in the margin ends here.',
  options: [
    {
      label: 'Step forward',
      flavourText: 'The run ends here.',
      effects: [
        { type: 'advanceGodPath' },
        { type: 'victory' },
      ],
    },
  ],
}

// ─── Tutorial Deck ────────────────────────────────────────────────────────────
// 6 starting cards only. olgreth_2 is NOT pre-seeded -- queued by advanceGodPath.
// All dynamically inserted cards are exported for ALL_CARDS registry registration.

export const TUTORIAL_CARDS: Card[] = [
  tutorial_interface,           // 0 — UI, options, greyed-out demo
  tutorial_basic_resources,     // 1 — primary resources, jewel tap
  tutorial_dread_relics,        // 2 — dread, relics; inserts doom@top + reshuffle_card@nextCycle
  tutorial_threats_treats,      // 3 — inserts threat@nextCycle + treat@nextCycle
  tutorial_prep_intro,          // 4 (NEW) — prep tags, activity log; inserts prep_react@nextCycle
  olgreth_1,                    // 5 — god path 1; queues olgreth_2@nextCycle; draw pile empties -> RESHUFFLE
]
// Post-reshuffle nextCycleQueue (insertion order):
//   tutorial_reshuffle_card  — pinnedNextCycle: true (from dread_relics)
//   tutorial_threat_card     — from threats_treats effect 0
//   tutorial_treat_card      — from threats_treats effect 1
//   tutorial_prep_react      — from tutorial_prep_intro (both option branches)
//   olgreth_2                — from olgreth_1 advanceGodPath
//
// tutorialReshuffle() enforces draw order:
//   tutorial_reshuffle_card, tutorial_threat_card, tutorial_prep_react,
//   tutorial_treat_card, olgreth_2
