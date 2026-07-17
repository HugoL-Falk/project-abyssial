# Public Playtest July 2026 — Design Spec

**Date:** 2026-07-17  
**Status:** Approved

---

## Goal

Enable the July public playtest with:
1. A whole-app password gate (link shared privately, password shared on request).
2. All god paths freely accessible — no boss unlock code.
3. PostHog telemetry active for all player choice metrics.
4. Feedback submissions enriched with metadata: god path, week, and current card.

---

## 1. Access Control (Railway env vars — no code changes)

| Var | Value | Effect |
|---|---|---|
| `VITE_PLAYTEST_PASSWORD` | set to chosen password | Enables `PasswordGate` on app load |
| `VITE_UNLOCK_PASSWORD` | empty / unset | `isGodsUnlocked()` returns `true` — all gods free |
| `VITE_POSTHOG_KEY` | PostHog project key | Activates all telemetry |
| `VITE_POSTHOG_HOST` | `https://app.posthog.com` | Default; no change needed |

`PasswordGate` already wraps `<App>` in `App.tsx`. When `VITE_PLAYTEST_PASSWORD` is set, players must enter the password once per session (stored in `sessionStorage`).

---

## 2. Feedback Metadata

### 2a. `telemetry.ts` — `captureFeedback` signature

Add optional metadata fields to the PostHog event:

```ts
export function captureFeedback(
  text: string,
  triggeredBy: 'end_screen' | 'menu_button',
  meta?: { godPath?: string; week?: number; cardId?: string }
): void {
  if (!isPosthogEnabled()) return
  posthog.capture('feedback_submitted', {
    text: text.slice(0, 2000),
    triggered_by: triggeredBy,
    god_path: meta?.godPath,
    week: meta?.week,
    card_id: meta?.cardId,
  })
}
```

### 2b. `FeedbackForm.tsx` — new optional props

```ts
interface Props {
  triggeredBy: 'end_screen' | 'menu_button'
  godPath?: string
  week?: number
  cardId?: string
  onDone: () => void
}
```

`handleSubmit` passes `{ godPath, week, cardId }` as `meta` to `captureFeedback`.

### 2c. Call sites

**`VictoryScreen.tsx`**
- `godPath`: from `runConfig?.godPath` (already in scope as `godPath`)
- `week`: from `useGameStore(s => s.reshuffleCount + 1)`
- `cardId`: undefined (run is over, no current card)

**`FailureScreen.tsx`**
- `godPath`: from `runConfig?.godPath` (already accessed as `runConfig`)
- `week`: from `useGameStore(s => s.reshuffleCount + 1)`
- `cardId`: undefined

**`InGameMenuButton.tsx`**
- `godPath`: already in scope as `activeGod` from `useGameStore(s => s.runConfig?.godPath)`
- `week`: add `useGameStore(s => s.reshuffleCount + 1)`
- `cardId`: add `useGameStore(s => s.currentCard?.id)`

---

## 3. PostHog Event Shape (after change)

`feedback_submitted`:
```json
{
  "text": "...",
  "triggered_by": "menu_button",
  "god_path": "nyarlathotep",
  "week": 3,
  "card_id": "the_dreamer"
}
```

End-screen submissions will have `card_id: undefined` (omitted from PostHog event).

---

## 4. Out of Scope

- Discord/Slack webhook (deferred, Option C from brainstorm)
- Any server-side log drain
- Changes to existing metric events (card_drawn, option_picked, etc.)
