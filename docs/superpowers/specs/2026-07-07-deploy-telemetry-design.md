# Deploy + Telemetry Design — July Playtest
**Date:** 2026-07-07
**Tickets:** DEPLOY-1, P17-28
**Status:** Approved

---

## Overview

Two interlinked systems shipped together for the mid-July playtest:

1. **Deployment** — Railway hosting behind a password wall, god-unlock via second password, `playtest/v1` branch strategy.
2. **Telemetry** — PostHog event tracking (run depth, option picks/skips, resource snapshots) + free-text feedback form.

Target audience: <10 players. All data is anonymous. Hugo reviews PostHog exports with Claude for analysis.

---

## 1. Deployment

### Hosting
- **Platform:** Railway
- **Branch:** `playtest/v1` — cut from the current HEAD at content freeze. Railway deploys this branch only. Hotfixes are cherry-picked in; the main dev branch never auto-deploys to production.

### Password wall
A full-screen gate renders before the menu if `VITE_PLAYTEST_PASSWORD` is set. The player must enter the correct password to proceed. On success, the value is stored in `sessionStorage` so the check survives page refreshes but not new tabs (intentional — sharing the URL does not bypass the gate).

- If `VITE_PLAYTEST_PASSWORD` is not set (local dev), no gate is shown.
- Component: `PasswordGate.tsx` wraps `App.tsx` root.

### God unlock
Gods 2 (Nyarlathotep) and 3 (Shub-Niggurath) are hidden on the god-selection screen by default. A second env var `VITE_UNLOCK_PASSWORD` gates them. The player enters this in a Settings field; on match the unlock is stored in `localStorage` (persists across sessions on the same device).

- If `VITE_UNLOCK_PASSWORD` is not set, the setting field is not shown.
- God 1 (Y'ha-nthlei) is always available.

### Env vars summary

| Var | Purpose | Default |
|---|---|---|
| `VITE_PLAYTEST_PASSWORD` | Full-app password gate | unset = no gate |
| `VITE_UNLOCK_PASSWORD` | Gods 2+3 unlock | unset = field hidden |
| `VITE_POSTHOG_KEY` | PostHog project API key | unset = telemetry disabled |
| `VITE_POSTHOG_HOST` | PostHog host (default: app.posthog.com) | `https://app.posthog.com` |

---

## 2. Telemetry

### Library
`posthog-js` — installed as a prod dependency. Initialised once in `main.tsx` using `VITE_POSTHOG_KEY`. If the key is absent, PostHog is not initialised and all `posthog.capture()` calls are no-ops (guarded by a `isPosthogEnabled()` helper).

All events are anonymous. PostHog auto-generates a `distinct_id` per device and a `$session_id` per browser session — no PII is collected.

### Event schema

#### `run_started`
Fired when a new run begins (after god selection).

| Property | Type | Notes |
|---|---|---|
| `god_path` | string | `yha_nthlei` / `nyarlathotep` / `shub_niggurath` / `olgreth` |
| `is_tutorial` | boolean | |

#### `card_drawn`
Fired each time a card is drawn and displayed to the player.

| Property | Type | Notes |
|---|---|---|
| `card_id` | string | |
| `card_title` | string | |
| `week` | number | 1-indexed reshuffle count |
| `draw_pile_count` | number | size before this draw |
| `res_gold` | number | |
| `res_followers` | number | |
| `res_influence` | number | |
| `res_dread` | number | |
| `res_relics` | number | |

#### `option_picked`
Fired when the player resolves an option.

| Property | Type | Notes |
|---|---|---|
| `card_id` | string | |
| `option_idx` | number | |
| `option_label` | string | first 60 chars of option title |
| `week` | number | |
| `res_gold` | number | resources *before* resolution |
| `res_followers` | number | |
| `res_influence` | number | |
| `res_dread` | number | |
| `res_relics` | number | |

#### `option_skipped`
Fired for every visible option on a card that was *not* picked (i.e. player saw it, didn't choose it). Fired at the same moment as `option_picked` for the sibling options.

| Property | Type | Notes |
|---|---|---|
| `card_id` | string | |
| `option_idx` | number | |
| `option_label` | string | first 60 chars |
| `week` | number | |
| `reason` | string | `locked` / `available` (was affordable but not chosen) |

#### `run_ended`
Fired on any run termination (victory, succumb, accept defeat).

| Property | Type | Notes |
|---|---|---|
| `outcome` | string | `victory` / `succumb` / `accept_defeat` |
| `god_path` | string | |
| `week_reached` | number | |
| `cards_drawn` | number | total across the run |
| `god_path_progress` | number | 0–6 |
| `res_gold` | number | final state |
| `res_followers` | number | |
| `res_influence` | number | |
| `res_dread` | number | |
| `res_relics` | number | |

#### `feedback_submitted`
Fired when a player submits the feedback form.

| Property | Type | Notes |
|---|---|---|
| `text` | string | raw free-text, max 2000 chars |
| `triggered_by` | string | `end_screen` / `menu_button` |

PostHog's `$session_id` automatically links this to the run events from the same session.

---

## 3. Feedback form

### Trigger points
- **End-of-run screen** — shown above "Return to menu" on both victory and succumb screens. Not mandatory; includes a "Skip" button.
- **In-game menu (cogwheel)** — "Send feedback" button opens a modal with the same form. Available at any point during play.

### Form
- Single `<textarea>` with placeholder: *"Anything that felt broken, confusing, or great?"*
- "Submit" + "Skip / Close" buttons
- On submit: fires `feedback_submitted`, shows brief confirmation ("Thanks!"), then closes / returns to menu flow.
- Max 2000 characters. No auth, no email required.

### Component
`FeedbackForm.tsx` — shared between end-screen usage and modal usage via a `triggeredBy` prop.

---

## 4. Implementation scope

### New files
- `src/components/PasswordGate.tsx`
- `src/components/FeedbackForm.tsx`
- `src/lib/telemetry.ts` — PostHog init + typed `captureEvent()` wrapper + `isPosthogEnabled()` guard

### Modified files
- `main.tsx` — PostHog init
- `App.tsx` — wrap with `PasswordGate`
- God-selection screen — hide gods 2+3 behind unlock check
- Settings screen — add unlock password field (conditional on `VITE_UNLOCK_PASSWORD`)
- `gameStore.ts` — fire `run_started`, `card_drawn`, `option_picked`/`option_skipped`, `run_ended`
- Victory + succumb screens — embed `FeedbackForm`
- `InGameMenuButton.tsx` / menu panel — add "Send feedback" button + modal

### Not in scope
- Server-side event validation
- User accounts or persistent identity
- Dashboard configuration (PostHog default views are sufficient)
- Replay or session recording

---

## 5. Analysis workflow

After playtest, Hugo exports PostHog event data (CSV or JSON) and pastes to Claude for analysis. Key questions the schema is designed to answer:

- What week do most runs end, and on what outcome?
- Which cards are players reaching week 4+ on vs. dying on early?
- What is the option pick rate per card — are any options never chosen?
- Which options are locked vs. available-but-skipped? (resource ceiling vs. player preference)
- What is the resource state at the point runs collapse?
- What free-text feedback patterns emerge?
