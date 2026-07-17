# Public Playtest July 2026 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable public playtest with password-gated access, all gods unlocked, PostHog metrics active, and feedback submissions enriched with god path / week / card metadata.

**Architecture:** Three changes: (1) `captureFeedback` grows an optional `meta` param; (2) `FeedbackForm` accepts and threads those props; (3) three call sites supply values from the game store. Railway env vars control access gating — no code changes needed there.

**Tech Stack:** React, TypeScript, Zustand (game store), PostHog JS, Vitest, Railway (deployment)

## Global Constraints

- No DOM/RTL test harness — component tests are node-only (vitest).
- `tsc` must be clean (pre-existing errors in `gameStore.test.ts` lines 2495+ are exempt).
- All vitest tests must pass: `340/340` baseline.
- Never rewrite whole files — targeted edits only.
- Git repo path: `C:/Project Abyssial/Code/project-abyssial`

---

## File Map

| File | Action | Change |
|---|---|---|
| `src/lib/telemetry.ts` | Modify | Add optional `meta` param to `captureFeedback` |
| `src/components/FeedbackForm.tsx` | Modify | Add `godPath?`, `week?`, `cardId?` props; thread to `captureFeedback` |
| `src/components/VictoryScreen.tsx` | Modify | Pass `godPath` + `week` to `FeedbackForm` |
| `src/components/FailureScreen.tsx` | Modify | Add `reshuffleCount` selector; pass `godPath` + `week` |
| `src/components/game/InGameMenuButton.tsx` | Modify | Add `reshuffleCount` + `currentCard` selectors; pass all three |

---

## Task 1: Enrich `captureFeedback` and `FeedbackForm`

**Files:**
- Modify: `src/lib/telemetry.ts`
- Modify: `src/components/FeedbackForm.tsx`

**Interfaces:**
- Produces: `captureFeedback(text, triggeredBy, meta?)` where `meta?: { godPath?: string; week?: number; cardId?: string }`
- Produces: `FeedbackForm` props `{ triggeredBy, godPath?, week?, cardId?, onDone }`

- [ ] **Step 1: Update `captureFeedback` in `telemetry.ts`**

Open `src/lib/telemetry.ts`. Replace the existing `captureFeedback` function (lines 83–89) with:

```ts
export function captureFeedback(
  text: string,
  triggeredBy: 'end_screen' | 'menu_button',
  meta?: { godPath?: string; week?: number; cardId?: string }
): void {
  if (!isPosthogEnabled()) return
  posthog.capture('feedback_submitted', {
    text:         text.slice(0, 2000),
    triggered_by: triggeredBy,
    god_path:     meta?.godPath,
    week:         meta?.week,
    card_id:      meta?.cardId,
  })
}
```

- [ ] **Step 2: Update `FeedbackForm.tsx`**

Open `src/components/FeedbackForm.tsx`. Replace the `Props` interface and `FeedbackForm` signature:

```tsx
interface Props {
  triggeredBy: 'end_screen' | 'menu_button'
  godPath?:    string
  week?:       number
  cardId?:     string
  onDone: () => void
}

export function FeedbackForm({ triggeredBy, godPath, week, cardId, onDone }: Props) {
```

Then update `handleSubmit` to pass meta:

```tsx
  function handleSubmit() {
    if (text.trim()) captureFeedback(text.trim(), triggeredBy, { godPath, week, cardId })
    setSubmitted(true)
    setTimeout(onDone, 1200)
  }
```

- [ ] **Step 3: Type-check**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx tsc --noEmit 2>&1 | grep -v "gameStore.test.ts"
```

Expected: no new errors. Pre-existing errors in `gameStore.test.ts` are exempt.

- [ ] **Step 4: Run tests**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run 2>&1 | tail -5
```

Expected: `340 passed` (or higher if new tests were added elsewhere).

- [ ] **Step 5: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/lib/telemetry.ts src/components/FeedbackForm.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(telemetry): enrich captureFeedback with god_path/week/card_id metadata"
```

---

## Task 2: Update call sites — VictoryScreen and FailureScreen

**Files:**
- Modify: `src/components/VictoryScreen.tsx`
- Modify: `src/components/FailureScreen.tsx`

**Interfaces:**
- Consumes: `FeedbackForm` props from Task 1: `godPath?`, `week?`, `cardId?`
- `VictoryScreen`: `reshuffleCount` already selected (line 51); `godPath` already derived (line 61).
- `FailureScreen`: `runConfig` already selected (line 22); `reshuffleCount` not yet selected — must add.

- [ ] **Step 1: Update `VictoryScreen.tsx`**

Find the `<FeedbackForm triggeredBy="end_screen" onDone=...` usage (around line 170). Update it to:

```tsx
<FeedbackForm
  triggeredBy="end_screen"
  godPath={godPath}
  week={reshuffleCount + 1}
  onDone={() => setFeedbackDone(true)}
/>
```

`godPath` is `runConfig?.godPath` already assigned on line 61. `reshuffleCount` is already selected on line 51.

- [ ] **Step 2: Update `FailureScreen.tsx`**

Add `reshuffleCount` to the existing `useGameStore` selectors block (after line 22):

```tsx
const reshuffleCount  = useGameStore(s => s.reshuffleCount)
```

Then find the `<FeedbackForm triggeredBy="end_screen" ...` usage (around line 90) and update it to:

```tsx
<FeedbackForm
  triggeredBy="end_screen"
  godPath={runConfig?.godPath}
  week={reshuffleCount + 1}
  onDone={() => setFeedbackDone(true)}
/>
```

- [ ] **Step 3: Type-check**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx tsc --noEmit 2>&1 | grep -v "gameStore.test.ts"
```

Expected: no new errors.

- [ ] **Step 4: Run tests**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run 2>&1 | tail -5
```

Expected: `340 passed`.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/VictoryScreen.tsx src/components/FailureScreen.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(playtest): pass run metadata to FeedbackForm on end screens"
```

---

## Task 3: Update call site — InGameMenuButton

**Files:**
- Modify: `src/components/game/InGameMenuButton.tsx`

**Interfaces:**
- Consumes: `FeedbackForm` props from Task 1: `godPath?`, `week?`, `cardId?`
- `activeGod` already selected (line 48 as `s.runConfig?.godPath`). Need to add `reshuffleCount` and `currentCard?.id`.

- [ ] **Step 1: Add new store selectors to `InGameMenuButton.tsx`**

In the existing `useGameStore` selectors block (after line 50), add:

```tsx
const week        = useGameStore(s => s.reshuffleCount + 1)
const currentCardId = useGameStore(s => s.currentCard?.id)
```

- [ ] **Step 2: Find the inline FeedbackForm render and add props**

Search for `<FeedbackForm` in `InGameMenuButton.tsx` (around line 342). It currently renders inside a modal/overlay. Update it to pass the new props:

```tsx
<FeedbackForm
  triggeredBy="menu_button"
  godPath={activeGod}
  week={week}
  cardId={currentCardId}
  onDone={() => setFeedbackOpen(false)}
/>
```

- [ ] **Step 3: Type-check**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx tsc --noEmit 2>&1 | grep -v "gameStore.test.ts"
```

Expected: no new errors.

- [ ] **Step 4: Run tests**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run 2>&1 | tail -5
```

Expected: `340 passed`.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/game/InGameMenuButton.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "feat(playtest): attach current card/week/god metadata to in-game feedback"
```

---

## Task 4: Railway Environment Configuration (Manual)

**No code changes.** Configure in the Railway dashboard for the deployed service.

- [ ] **Step 1: Set playtest password gate**

In Railway → your service → Variables:
```
VITE_PLAYTEST_PASSWORD = <your chosen password>
```
This activates `PasswordGate` — players see a password screen on first load.

- [ ] **Step 2: Clear god unlock password**

```
VITE_UNLOCK_PASSWORD = (empty string or delete the var)
```
`isGodsUnlocked()` returns `true` when this var is absent — all god paths freely selectable.

- [ ] **Step 3: Confirm PostHog key is present**

```
VITE_POSTHOG_KEY = <your PostHog project API key>
VITE_POSTHOG_HOST = https://app.posthog.com
```
If `VITE_POSTHOG_KEY` is absent, all telemetry silently no-ops. Verify it's set.

- [ ] **Step 4: Redeploy**

Trigger a Railway redeploy so the new env vars take effect. Confirm the password screen appears on the live URL.

- [ ] **Step 5: Smoke test in PostHog**

Open the game, pick a god, draw a card, choose an option, submit feedback from the in-game menu.  
In PostHog → Events, verify `feedback_submitted` contains `god_path`, `week`, and `card_id` fields.  
Verify `option_picked` events are also appearing.
