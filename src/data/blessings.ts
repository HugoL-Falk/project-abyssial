import type { BlessingCard } from '../types'

// ─── Blessing Pool ─────────────────────────────────────────────────────────────
// Tutorial completion unlocks 3 starter blessings (biscuit_tin, known_faces, prior_standing).
// Each god path unlocks 3 more: 2 paired (boon + bane together) + 1 simple.

export const ALL_BLESSINGS: BlessingCard[] = [

  // ─── TUTORIAL STARTERS ────────────────────────────────────────────────────

  {
    id: 'biscuit_tin',
    title: 'The Biscuit Tin',
    description: 'Begin the run with +1 Gold.',
    flavourText: 'There is always a little left. You have learned not to ask where it comes from.',
    unlockedBy: 'tutorial',
    resourceBonuses: [{ resource: 'gold', delta: 1 }],
  },

  {
    id: 'known_faces',
    title: 'Known Faces',
    description: 'Begin the run with +1 Followers.',
    flavourText: 'They were there when you needed them. They did not ask to be thanked.',
    unlockedBy: 'tutorial',
    resourceBonuses: [{ resource: 'followers', delta: 1 }],
  },

  {
    id: 'prior_standing',
    title: 'Prior Standing',
    description: 'Begin the run with +1 Influence.',
    flavourText: 'Your name was already known in certain rooms. You did not put it there.',
    unlockedBy: 'tutorial',
    resourceBonuses: [{ resource: 'influence', delta: 1 }],
  },

  // ─── Y'HA-NTHLEI ─────────────────────────────────────────────────────────

  {
    id: 'salt_on_the_tongue',
    title: 'Salt on the Tongue',
    description: 'Begin the run with +1 Relic.',
    flavourText: 'The taste does not leave. You have stopped trying to remove it.',
    unlockedBy: 'yha_nthlei',
    resourceBonuses: [{ resource: 'relics', delta: 1 }],
  },

  {
    // Paired. Boon: injects innsmouth_look_marked into the starting deck.
    // That card fires Gold +1, Followers +1 on draw.
    // Bane: encoded directly on the card — Dread +2 on draw instead of +1.
    id: 'the_drowned_mark',
    title: 'The Drowned Mark',
    description: 'The Drowned Mark card is seeded into your starting deck. On draw: Gold +1, Followers +1. Dread +2 instead of +1.',
    flavourText: 'The mark opened doors. The doors cost more than the mark.',
    unlockedBy: 'yha_nthlei',
    injectCardId: 'innsmouth_look_marked',
  },

  {
    // Paired. Boon: once-per-run Relics −2 → Followers +4, Gold +3 (activateDeepTrade action).
    // Bane: inserts The Covenant Demands at positions 2–4 when triggered.
    id: 'the_deep_trade',
    title: 'The Deep Trade',
    description: 'Once per run: spend Relics −2 to gain Followers +4, Gold +3. Inserts The Covenant Demands at positions 2–4 when triggered.',
    flavourText: 'The sea gives generously. You will not always be ready for when it collects.',
    unlockedBy: 'yha_nthlei',
  },

  // ─── NYARLATHOTEP ─────────────────────────────────────────────────────────

  {
    id: 'the_signals_echo',
    title: "The Signal's Echo",
    description: 'Begin the run with +2 Influence.',
    flavourText: 'The frequency is still there. You know where to listen.',
    unlockedBy: 'nyarlathotep',
    resourceBonuses: [{ resource: 'influence', delta: 2 }],
  },

  {
    // Paired. Boon + bane both fire every 5th card drawn.
    // Engine: drawNextCard checks blessings.selected for this ID when turnCount % 5 === 0.
    id: 'the_crawling_network',
    title: 'The Crawling Network',
    description: 'Every 5th card drawn: +1 to a random resource. Dread +1.',
    flavourText: 'The network expands in both directions. You are part of it now.',
    unlockedBy: 'nyarlathotep',
  },

  {
    // Paired. Boon: 2 regular cards get injected whisper options at run start (startRun).
    // Bane: using one → next regular card drawn has halved gains + doubled costs (whisperCounselPenaltyActive).
    id: 'whispered_counsel',
    title: 'Whispered Counsel',
    description: 'At run start, 2 random cards gain an injected whisper option. Using one: next random card drawn has gains halved and costs doubled.',
    flavourText: 'The advice was sound. The silence it left was not.',
    unlockedBy: 'nyarlathotep',
  },

  // ─── SHUB-NIGGURATH ───────────────────────────────────────────────────────

  {
    id: 'root_deep',
    title: 'Root Deep',
    description: 'Begin the run with +2 Followers.',
    flavourText: 'They come back, even when they leave. The root remembers.',
    unlockedBy: 'shub_niggurath',
    resourceBonuses: [{ resource: 'followers', delta: 2 }],
  },

  {
    // Paired. Boon: Dark Young Guardian added to rare pool for this run.
    // Bane: encoded on the Dark Young Guardian card — on draw inserts It Still Needs Feeding 2–4.
    // Engine: startRun adds 'dark_young_guardian' to rare candidates when this blessing is selected.
    id: 'the_groves_gift',
    title: "The Grove's Gift",
    description: 'Dark Young Guardian is added to the rare card pool for this run. When drawn, it inserts It Still Needs Feeding at positions 2–4.',
    flavourText: 'The gift had a shape. The shape had needs.',
    unlockedBy: 'shub_niggurath',
  },

  {
    // Paired. Boon: twice per run, push any drawn card 10 positions back (pushCard action).
    // Bane: next regular card drawn after use has all positive gains removed (patientForestPenaltyActive).
    id: 'the_patient_forest',
    title: 'The Patient Forest',
    description: 'Twice per run: push any drawn card 10 positions back. When used, the next regular card drawn has all positive gains removed.',
    flavourText: 'You did not outrun it. You simply took a longer path to the same place.',
    unlockedBy: 'shub_niggurath',
  },
]
