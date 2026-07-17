# Threat/Treat Classification Design (P24-12)

**Date:** 2026-07-12
**Status:** Approved — ready for implementation
**Backlog:** P24-12

---

## 1. Classification Axioms

### Primary — Affect

Threats create **anxiety** on draw. Treats create **relief** on draw. This is the classification rule. All other signals are supporting evidence, not the definition.

### Secondary — Dread pressure

Threats typically move dread against the player on best realistic options. Treats are dread-neutral or favourable on resolution. Resource gains and losses are secondary — overflow makes raw resource math unreliable as a classification signal. A card that gives `gold +1` is not automatically positive if the player is near gold overflow.

### Tertiary — Option framing

- **Threat options** are damage mitigation: "which cost do I accept?"
- **Treat options** are upside selection: "which benefit do I take?"

A threat may have one tempting option without becoming a treat, provided the dominant emotional register remains anxiety. A treat may have one costly option without becoming a threat, provided drawing it still produces relief.

---

## 2. Bait Mechanic

### Threat inserts — deal-with-the-devil

Options that insert a threat should **usually give a resource gain on the inserting option**. The player takes something good now and pays when the threat lands. The bait is immediate; the cost is deferred.

> `the_donation "Accept it"` — `gold +2` now, `strings_attached` later. ✓

**Exception:** Pure deferral options (e.g. `rival_stirs "Ignore them"`) are valid when they are explicitly distinguished from a baited alternative on the same card. An ungated option that inserts a threat and gives nothing is a bait gap — flag for review.

### Treat inserts — small spend for future windfall

Options that insert a treat can be **slightly costly or neutral upfront**. The player spends something modest and gets a better card later. The cost validates the windfall.

> `congregation_meets "Dismiss early"` — `fol -1` now, `the_ordinary_pie` later. ✓

### Week-6 bait — intentional feature

Threat inserts chosen in week 6 become pure positives — the threat inserts into the deck but the run ends before it surfaces. This is a reward for timing awareness and experience. **No mechanical mitigation.** Treat as intended behaviour.

---

## 3. Retroactive Changes

### 3a. Reclassifications — threat → treat

| Card | Current tier | New tier | Reason |
|---|---|---|---|
| `an_unremarkable_stump` | `threat` | `treat` | Only option is `dread -1`. Drawing it is comedic relief — the "just a stump" beat. Both woodcutter's map outcomes (`grove_awaits` + this) become treats, which is coherent with the parent insert (gold cost for future windfall). |
| `wandering_soul` | `threat` | `treat` | Opt1 `fol +1, gold -1` is net-neutral positive; opt2 `dread +1` is mild. A soul showing up on the steps and potentially recruiting is a minor windfall, not a threat. |
| `forgers_debt` | `threat` | `treat` | Both options give influence; opt1 unlocks `marsh_connection` (treat). Drawing it feels like an opportunity. The parent insert (`the_printing_press "Forgery work"`: `gold -2, dread -2` upfront for future windfall) fits the treat-insert pattern. |

### 3b. Option rewrites — bait gaps

| Card | Option | Change | Reason |
|---|---|---|---|
| `the_census_agent` | "Provide misleading figures" | Add `{ type: 'resource', resource: 'gold', delta: 1 }` | Inserts `their_suspicion` with zero resource gain. Gold +1 reflects presenting tidy, plausible figures — a small win that invites future scrutiny. |

### 3c. Comment fixes (cosmetic)

| Card | Fix |
|---|---|
| `scrutiny` | Comment says "Inserted by the_printing_press — 'Propaganda run'" — stale. Actual inserters: `congregation_meets "Deliver a sermon"` and `relic_market "Send someone after hours"`. Update comment. |

### 3d. File moves (cosmetic — no engine impact)

The following cards carry `tier: 'treat'` but live in `threats.ts` for historical reasons. Move to `treats.ts`:

- `an_unremarkable_stump` *(newly reclassified)*
- `wandering_soul` *(newly reclassified)*
- `forgers_debt` *(newly reclassified)*
- `cursed_object` *(already treat, pre-existing)*
- `something_on_the_hook` *(already treat, pre-existing)*
- `grove_awaits` *(already treat, pre-existing)*

**Engine note:** The engine reads `tier`, not file location. File moves are organisational only.

---

## 4. Cards Audited — No Change Required

All other threat and treat cards pass the affect test. Selected notes:

- **`wandering_soul` opt2 dread cost** — previously `dread +1` was considered too mild; reclassification to treat resolves this.
- **`their_suspicion` opt2** (`inf +1, dread +1`) — influence gain with dread cost; anxiety-producing draw confirmed by overall "suspicion" framing.
- **`public_scrutiny`** — all options produce `dread +1` or `+2`; dread dominance keeps it a threat despite resource upsides.
- **`the_thing_in_the_tank`** — recurring presence produces anxiety; `inf +2` on "Listen to it" is compensation for psychic cost, not misclassification.
- **`innsmouth_look_marked`** — seeded by blessing; all options involve dread; "the mark costs more than it opens" framing confirmed.
- **`his_research_notes`** — treat with a scary option (`dread +3`); player chooses which positive to extract; relief on draw confirmed.
- **`marsh_connection`** — permanent treat; 2/3 outcomes positive; confirmed.
- **Deficit cards** (`deficit_gold`, `deficit_followers`, `deficit_influence`) — special category (emergency fail-state cards); exempt from affect classification.
- **Overflow cards** (`the_ledger_is_noticed`, `the_wrong_rooms`, `theyre_not_listening`) — special category; exempt from affect classification.

---

## 5. Future Card Checklist

When authoring a new threat or treat, verify:

**Is it a threat?**
- [ ] Drawing it produces anxiety (primary test)
- [ ] Best realistic options move dread against player, or cost significant resources with no net positive
- [ ] Options are framed as damage mitigation
- [ ] If an option inserts another threat: does the inserting option give a resource gain (bait)?

**Is it a treat?**
- [ ] Drawing it produces relief (primary test)
- [ ] Dread is neutral or moves in player's favour on resolution
- [ ] Options are framed as upside selection
- [ ] If an option inserts a treat: is there a modest cost or neutral setup on the inserting option?

**Borderline cases:** Apply the affect test first. If a card's best option is genuinely net positive with no significant dread cost, lean treat. If drawing it creates meaningful anxiety regardless of upside options, lean threat.
