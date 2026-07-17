# Rare Card Audit — Design Spec
**Date:** 2026-07-15
**Session:** s165
**Backlog:** P25-06, P25-48, P25-53
**Status:** Approved — ready for implementation

---

## Goals

Audit all rare cards so they feel rare: every option is a real choice (no traps, no obviously-wrong picks), power level is commensurate with rarity, and each card has a mechanically distinctive identity.

**Design axioms applied:**
- A — Guaranteed agency: no card forces a bad fallback as the only visible option
- C — Thematic identity first: fixes flow from each card's narrative role
- B — Exciting options: applied selectively where a card earns it (Diocese opt3, Defector/Academic randomOutcome preserved)

---

## Card Changes

### 1. The Diocese Sends Word (`the_diocese_sends_word`)

**Identity:** Political pressure from the established church. Every option is a different way to manage a powerful institution sniffing around your operation.

**Problem:** Opt3 "Welcome the inquiry openly" was net negative — +2inf but +2dread + investigators_file insert. No situation where a player should choose it.

**Changes:**

| Option | Old effects | New effects |
|---|---|---|
| Compose a careful reply | −2inf, deferGodPathCard | unchanged |
| Refuse to engage | −1inf, −1dread | −1inf, −1dread, **+1fol** |
| Welcome the inquiry openly | +2inf, +2dread, insert investigators_file | **randomOutcome:** Good → +2inf, +1gold, −1dread / Bad → −2inf, −1gold, +1dread |

**Opt3 rationale:** The bold bluff concept is right — pretend you're legitimate, invite scrutiny. Made into a genuine 50/50 gamble. investigators_file removed; resource swing is sufficient punishment on the bad branch. Opt2 gains +1fol to match Diocese opt2's "decline thoughtfully = credibility" identity (mirrors Defector fix).

---

### 2. Clarence (`clarence`)

**Identity:** The cult's fixer. One-use, no questions asked. Calling in a favour this big burns the relationship.

**Problem (P25-53):** `hideWhenUnavailable: true` on both active options means players with insufficient resources see only "Not yet". "Not yet" sent Clarence to discard → retired at reshuffle → permanently gone. Forced +1dread for zero agency.

**Changes:**

| Option | Old effects | New effects |
|---|---|---|
| Have him handle it | −3inf, removeRandomThreat, removeCard self (inf≥3) | **−2inf**, removeRandomThreat, removeCard self (inf≥2) |
| Pay him to bury it | −2gold, removeRandomThreat, removeCard self (gold≥2) | unchanged |
| Not yet | +1dread | **free**, removeCard self + insertCard(clarence, random, pos 4–7) |

**Opt1 cost rationale:** Reducing to −2inf symmetrises both active options at exactly 2 resources. The choice between them is now purely which resource you can spare.

**"Not yet" rationale:** Clarence re-inserts himself into the draw pile instead of going to discard. He never enters the discard pile → never retired at reshuffle → player gets another shot when resources are better. The removeCard + insertCard self-reference pattern is established (s161, ongoing_arrangement).

---

### 3. The Travelling Merchant (`travelling_merchant`)

**Identity:** A recurring visitor with strange wares. He always has something. The jars are a running bit.

**Problem:** Pass gave +1dread only — taxing the player for not having gold, with no compensating interest.

**Changes:**

| Option | Old effects | New effects |
|---|---|---|
| Buy it | −2gold, randomOutcome (4-way) | unchanged |
| Pass | +1dread | +1dread, **+1inf** |

**Rationale:** Refusing deliberately reads as discerning, not desperate. Small inf gain makes Pass a real choice on low-gold turns rather than a pure punishment.

---

### 4. The Artefact from the Deep (`artefact_from_deep`) + The Fisherman's Return (`fishermans_return`)

**Identity:** A cosmic object that doesn't belong on land. Taking it is a meaningful gain — but the sea, and the fisherman, want it back.

**Problems:** (1) Body text was 127 chars (over 108-char cap). (2) Option flavour was 103 chars (over 80-char cap). (3) "Take it" label was ambiguous — the artefact was already on the table. (4) +1relic upside was too thin against +2dread + threat insert. (5) fishermans_return "Return" flavour didn't explain why only 1 of 2 relics was returned.

**artefact_from_deep changes:**

| Field | Old | New |
|---|---|---|
| Body | *"A fisherman sold it this morning for eight shillings and a meat pie. It sits on the table now. He should have asked for double."* (127 chars ❌) | *"A fisherman sold it for eight shillings this morning. It sits on the table. He should have asked for more."* (106 chars ✓) |
| Opt label | "Take it" | "Keep it" |
| Opt flavour | *"It is warm to the touch. A low whisper follows it. Neither of these things is remarkable at this point."* (103 chars ❌) | *"Warm to the touch. A low sound follows it wherever it sits."* (59 chars ✓) |
| Opt effects | +1relic, +2dread, insert fishermans_return | **+2relics**, +2dread, insert fishermans_return |
| Put back label | "Put it back in the waves" | unchanged |
| Put back flavour | *"The water accepted it. Almost yearned for it."* | unchanged |
| Put back effects | +1inf, −2dread | unchanged |

**fishermans_return changes:**

| Field | Old | New |
|---|---|---|
| Body | unchanged | unchanged (100 chars ✓, singular "the relic" intentional) |
| "Return" opt flavour | *"He takes it. He does not thank you. He leaves."* | *"He takes one. He didn't count them when he sold it. You don't correct him."* (73 chars ✓) |
| "Return" opt effects | −1relic, +1dread (relics≥1) | unchanged |
| "Refuse" opt | unchanged | unchanged |

**Rationale:** Keeping "Return" at −1relic (not −2) is intentional — the fisherman only asks for one back because he didn't count carefully when he sold them. The new flavour line carries this. Net result of taking + returning: +1relic, +3dread total — still a positive relic gain but dread-expensive.

---

### 5. The Defector (`the_defector`)

**Identity:** A double-agent arriving at 2am with intelligence. High-stakes trust game — is she genuine or a plant?

**Problem:** "Decline" gave −1dread only. Thin for a rare-level moment.

**Changes:**

| Option | Old effects | New effects |
|---|---|---|
| Take her in | randomOutcome (Good/Bad) | unchanged — well-designed, leave alone |
| Decline | −1dread | **+1inf, −1dread** |

**Rationale:** Being known as someone who doesn't accept unsolicited defectors at 2am has quiet reputational value. The flavour ("She accepts this. She takes the ledger with her. You watch her go.") reads as controlled and deliberate — inf gain fits.

---

### 6. The Dreaming Academic (`dreaming_academic`)

**Identity:** An academic sleepwalking into your orbit with genuinely useful, genuinely dangerous knowledge.

**Problem (P25-48):** Note — the dread+2 removal from the good randomOutcome branch was already applied in code. P25-48 is closed by that prior fix. Remaining issue: "Doctor his memory" payoff was thin (−1gold, −1dread) for spending a resource on the safe option.

**Changes:**

| Option | Old effects | New effects |
|---|---|---|
| Bring him in | randomOutcome (Good: +1fol +2inf +notes / Bad: +1fol +3dread +investigators) | unchanged |
| Doctor his memory | −1gold, −1dread (gold≥1) | −1gold, **−2dread** (gold≥1) |

**Rationale:** Spending gold to avoid the gamble should feel like a meaningful safe play. −2dread makes the trade-off (gold for safety) worth considering rather than barely noticeable.

---

### 7. Dark Young Pilgrim (`dark_young_pilgrim`)

**No changes.** Both options are real choices, the transform mechanic is the most distinctive in the rare set, dark_young_guardian chain is solid. Strongest card in the set — leave alone.

---

## Files to edit

| File | Cards affected |
|---|---|
| `src/data/cards/rare.ts` | diocese, clarence, travelling_merchant, artefact_from_deep, the_defector, dreaming_academic |
| `src/data/cards/threats.ts` | fishermans_return |

## Notes for implementation

- Clarence "Not yet": use removeCard(clarence) + insertCard(clarence, random, minPos:4, maxPos:7). Same pattern as ongoing_arrangement self-removal (s161).
- Diocese opt3: randomOutcome with weight:1 on both branches (D-s148-1 authoring rule).
- artefact_from_deep body + option flavour: enforce char caps in implementation pass.
- P25-48 backlog entry: close as fixed (dread removal already in code; −2dread on Doctor his memory is the final piece).
- P25-53 backlog entry: close as fixed by Clarence "Not yet" redesign.
