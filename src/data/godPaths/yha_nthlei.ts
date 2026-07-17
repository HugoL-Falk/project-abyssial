import type { Card } from '../../types'

// ─── Y'HA-NTHLEI: THE DROWNED COVENANT ───────────────────────────────────────
//
// Six-card chain. The Deep Ones are recruiting us as much as we are summoning
// them. Each card is them extending a hand further. Each advance means we took it.
//
// Tonal arc: Cards 1–2 feel almost manageable. Card 3 is the first moment
// avoidance has a real cost. Cards 4–5 narrow hard. Card 6 does not negotiate.
//
// Resource profile: Influence and Dread heavy. Relics are the final pressure.
// Net across optimal chain: Influence +7, Dread +12, Relics -3 (spent on rite).
//
// New threat cards inserted by this chain (defined in threats.ts):
//   selectman_has_questions, neighbour_has_concerns,
//   something_came_to_the_door, terms_remain

export const YHA_NTHLEI_CHAIN: Card[] = [

  // ─── Card 1: THE REFINERY SMELLS WRONG ──────────────────────────────────
  // Early chain. Real choices. Low commitment.
  // The cult manager notices the refinery. Someone inside notices us noticing.
  {
    id: 'yha_nthlei_1',
    title: 'The Refinery Smells Wrong',
    flavourText: 'The refinery runs past dark. A scheduling matter, the foreman says. The stench is not fish.',
    tier: 'god_path',
    godPath: 'yha_nthlei',
    chainStage: 1,
    options: [
      {
        label: 'Look into it',
        flavourText: 'The foreman was very helpful. He didn\'t use to be helpful.',
        effects: [
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
      {
        // P24-08: defer option — no advanceGodPath; reinserts card so the
        // problem keeps surfacing. "Look into it" is always available and
        // unconditional, so no softlock. Replaces the P22-P23-03 forced-
        // advance fix with the Card 3 stall pattern (insertCard + real cost).
        label: 'Leave it alone',
        flavourText: 'The smell is getting worse. Nothing plugging your nostrils won\'t stop.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'insertCard', cardId: 'yha_nthlei_1', position: 'random', minPos: 5, maxPos: 8 },
        ],
      },
    ],
  },

  // ─── Card 2: THE FISHMONGER'S TIARA ─────────────────────────────────────
  // Early chain. First material cost. The tiara is an offering — a test.
  // "Card returns" options re-insert this card 4–6 draws out via insertCard.
  {
    id: 'yha_nthlei_2',
    title: 'The Fishmonger\'s Tiara',
    flavourText: 'There is a cloth bag on the doorstep this morning. Inside is something that belongs in a grave. There is no note. The bag smells like the refinery.',
    tier: 'god_path',
    godPath: 'yha_nthlei',
    chainStage: 2,
    options: [
      {
        label: 'Keep it',
        flavourText: 'We have it now. Returning it did not occur to us until later. By then it seemed beside the point.',
        effects: [
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'influence', delta: 2 },
          { type: 'advanceGodPath' },
        ],
      },
      {
        // P17-20 (s94): one-shot return — first pick claims the relic;
        // subsequent encounters hide this option, forcing advance via
        // opt1/opt3. P19-21 (s100): re-gated on cardOptionChosen.
        // Historical (pre-PREP-PERSIST): prepTags cleared on reshuffle and
        // this card re-inserts itself, so the old notHasPrepTag gate
        // re-opened after every reshuffle → relic farm. Now re-gated on
        // cardOptionChosen (persists run-long) which closes the loop
        // regardless of prep-tag lifecycle.
        // (opt1 "Keep it" is an unconditional advance, so no softlock.)
        // P20-N: hideWhenUnavailable removed — option shows greyed with
        // "Can't take twice" tooltip after first pick.
        // P22-45: label shortened (was 42 chars, wrapped on mobile).
        label: 'Send someone back with it',
        flavourText: 'One came back. Not carrying what we sent.',
        condition: { type: 'not', condition: { type: 'cardOptionChosen', cardId: 'yha_nthlei_2', optionIdx: 1 } },
        effects: [
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'insertCard', cardId: 'yha_nthlei_2', position: 'random', minPos: 4, maxPos: 6 },
        ],
      },
      {
        // P22-20: label rewritten — condition is 'studied' (book learning), label
        // now bridges that to addressing the artifact rather than implying innate ability.
        label: 'Invoke what the book gave',
        flavourText: 'The book spoke first. We answer second. The conversation predates both.',
        condition: { type: 'hasPrepTag', tag: 'studied' },
        effects: [
          { type: 'consumePrepTag', tag: 'studied' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
    ],
  },

  // ─── Card 3: THE INNSMOUTH LOOK ──────────────────────────────────────────
  // Mid chain. First moment avoidance has a real cost. Dread pressure begins.
  // Inevitable narrative beat — "Approach him" is the only path forward.
  {
    id: 'yha_nthlei_3',
    title: 'The Innsmouth Look',
    flavourText: 'The foreman has been attending our gatherings. We did not invite him. One of our newer followers keeps mentioning the sea.',
    tier: 'god_path',
    godPath: 'yha_nthlei',
    chainStage: 3,
    options: [
      {
        label: 'Approach him',
        flavourText: 'He gave us an address and left. His handshake was cold and suspiciously damp. We found we did not mind this.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'advanceGodPath' },
        ],
      },
      {
        label: 'Recognise the sign',
        flavourText: 'At the gathering they made a shape with their hand. You make it back.',
        condition: { type: 'hasPrepTag', tag: 'attended_seance' },
        effects: [
          { type: 'consumePrepTag', tag: 'attended_seance' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
      {
        // P19-28: stall option — defer the chain advance, reinsert this card
        // to come back this cycle. influence -1 (Balance: charge the resource
        // this card threatens, not just dread) + dread +2 keep stalling a real
        // cost; influence clamps at 0 and "Approach him" is the always-available
        // exit, so no softlock. NO advanceGodPath — so while this stall loop is
        // active, the single-active chain invariant (engine/godPath.ts) blocks
        // any external advance for yha_nthlei until stage 3 actually resolves.
        label: 'Watch him longer',
        flavourText: 'You let him keep coming. You learn his face. The sea keeps coming up.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'insertCard', cardId: 'yha_nthlei_3', position: 'random', minPos: 3, maxPos: 6 },
        ],
      },
    ],
  },

  // ─── Card 4: THE OATH OF DAGON ───────────────────────────────────────────
  // Mid-late chain. The terms arrive before the physical commitment.
  // Relic gate here. "Refuse" no longer locks the path — inserts terms_remain.
  {
    id: 'yha_nthlei_4',
    title: 'The Oath of Dagon',
    flavourText: 'The foreman came again, not alone. Something had his shape. We understood the terms. We are unsure how.',
    tier: 'god_path',
    godPath: 'yha_nthlei',
    chainStage: 4,
    options: [
      {
        label: 'Accept the terms',
        flavourText: 'We agreed to things we did not understand. Some we did. We agreed anyway.',
        effects: [
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'resource', resource: 'followers', delta: -1 },
          { type: 'resource', resource: 'dread', delta: 3 },
          { type: 'advanceGodPath' },
        ],
        condition: { type: 'resourceMin', resource: 'relics', min: 1 },
      },
      {
        label: 'Sign the dream-bound version',
        flavourText: "The den's version had different terms. Better ones. You sign that one instead.",
        condition: { type: 'hasPrepTag', tag: 'opium_pact' },
        effects: [
          { type: 'consumePrepTag', tag: 'opium_pact' },
          { type: 'resource', resource: 'dread', delta: 1 },
          { type: 'resource', resource: 'followers', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
      {
        label: 'Refuse',
        flavourText: 'We refused. The shape nodded. It left something on the doorstep on the way out.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -2 },
          { type: 'resource', resource: 'dread', delta: 3 },
          // Inserts terms_remain — a threat card that re-presents the oath
          // and keeps the path open at escalating cost.
          { type: 'insertCard', cardId: 'terms_remain', position: 'random', minPos: 5, maxPos: 7 },
        ],
      },
    ],
  },

  // ─── Card 5: DEVIL'S REEF AT LOW TIDE ───────────────────────────────────
  // Late chain. Penultimate card. The physical commitment after the Oath.
  // Choices narrow hard. Point of no return dressed as an opportunity.
  {
    id: 'yha_nthlei_5',
    title: "Devil's Reef at Low Tide",
    flavourText: "The foreman came at low tide. He didn't come in. No lanterns, he said. They would find it disrespectful.",
    tier: 'god_path',
    godPath: 'yha_nthlei',
    chainStage: 5,
    options: [
      {
        label: 'Go at the appointed time',
        flavourText: 'Not everyone came back. Those who did found the dark comfortable.',
        effects: [
          { type: 'resource', resource: 'followers', delta: -3 },
          { type: 'resource', resource: 'dread', delta: 5 },
          { type: 'advanceGodPath' },
        ],
        condition: { type: 'resourceMin', resource: 'followers', min: 3 },
      },
      {
        label: 'Do not go',
        flavourText: 'The tide came in. The foreman has not been back. Something else came to the door instead.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -3 },
          { type: 'resource', resource: 'dread', delta: 5 },
          { type: 'insertCard', cardId: 'something_came_to_the_door', position: 'random', minPos: 2, maxPos: 4 },
        ],
      },
      {
        label: 'Speak the closing rite',
        flavourText: 'The rite has a final phrase. You held it back until now. The sea returns something to the doorstep before morning.',
        condition: { type: 'hasPrepTag', tag: 'recited' },
        effects: [
          { type: 'consumePrepTag', tag: 'recited' },
          { type: 'resource', resource: 'dread', delta: 2 },
          { type: 'resource', resource: 'influence', delta: 1 },
          { type: 'resource', resource: 'relics', delta: 1 },
          { type: 'advanceGodPath' },
        ],
      },
    ],
  },

  // ─── Card 6: Y'HA-NTHLEI STIRS ──────────────────────────────────────────
  // Final card. The sea does not negotiate.
  //
  // Full victory:    Influence ≥ 8, Dread ≥ 6, Relics ≥ 2 (2 consumed)
  // Partial victory: Relics ≥ 1 (1 consumed) AND (Influence 5–7 OR Dread 4–5)
  //                  Unlocks Y'ha-nthlei blessings. Not a full win.
  // Forced failure:  Neither above available. Dread maxes. Run ends.
  //
  // partialVictory effect: wires through to VictoryScreen via partialVictoryGod
  // on EngineCtx/GameState. Store and VictoryScreen wiring done.
  {
    id: 'yha_nthlei_6',
    title: "Y'ha-nthlei Stirs",
    flavourText: 'The harbour has been rising for three days. Not due to weather. The foreman is not at the refinery. The water is very close now. Its darkness is inviting.',
    tier: 'god_path',
    godPath: 'yha_nthlei',
    chainStage: 6,
    isSummoning: true,
    options: [
      {
        label: 'Complete the rite',
        flavourText: 'The sea took what we offered. It was thorough.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -5 },
          { type: 'resource', resource: 'gold', delta: -4 },
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'victory' },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'influence', min: 5 },
            { type: 'resourceMin', resource: 'gold', min: 4 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
          ],
        },
      },
      {
        label: 'Complete the rite (underprepared)',
        flavourText: 'We gave what we had. The sea noted the shortfall.',
        effects: [
          { type: 'resource', resource: 'influence', delta: -3 },
          { type: 'resource', resource: 'gold', delta: -3 },
          { type: 'resource', resource: 'relics', delta: -1 },
          { type: 'partialVictory', god: 'yha_nthlei' },
        ],
        condition: {
          type: 'and',
          conditions: [
            { type: 'resourceMin', resource: 'influence', min: 3 },
            { type: 'resourceMin', resource: 'gold', min: 3 },
            { type: 'resourceMin', resource: 'relics', min: 1 },
            {
              type: 'not',
              condition: {
                type: 'and',
                conditions: [
                  { type: 'resourceMin', resource: 'influence', min: 5 },
                  { type: 'resourceMin', resource: 'gold', min: 4 },
                  { type: 'resourceMin', resource: 'relics', min: 1 },
                ],
              },
            },
          ],
        },
      },
      {
        label: 'The water does not wait',
        flavourText: 'The sea notes the deficiency. It does not adjust.',
        succumbOption: true,
        effects: [
          { type: 'resource', resource: 'dread', delta: 10 },
          { type: 'endRun', reason: 'The tide answered before the rite was complete. What was owed was taken anyway.' },
        ],
      },
    ],
  },
]
