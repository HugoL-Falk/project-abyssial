# P20-K2: Blessing Screen Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the blessing screen so unlocked blessings show their full description, locked copy uses in-voice language, and both states use the established option-card colour conventions.

**Architecture:** Three targeted string/style edits inside `BlessingSelectScreen` in `SetupScreens.tsx`. No new components, no new state. No tests exist for this component (node-only harness, no DOM/RTL). Verify with vitest after changes to confirm nothing broken elsewhere.

**Tech Stack:** React (TSX), inline styles, vitest

## Global Constraints

- Repo: `C:/Project Abyssial/Code/project-abyssial` (use this path for all git commands — E: drive unreachable on laptop)
- Git branch: `claude/build-abyssial-game-IuJp8` — this IS trunk, no merge step needed
- Never push unless user says so
- Max 50 lines output per response
- Tests must pass: `npx vitest run` — currently 242/242

---

### Task 1: Full description + locked copy rephrase + colour alignment

**Files:**
- Modify: `src/components/SetupScreens.tsx` lines 249, 253–255, 262, 265, 284

**What to change and why:**

1. **Line 249** — remove snippet regex, use full description
2. **Lines 253–255** — rephrase `lockCopy` strings to in-voice register
3. **Line 262** — locked title colour: `var(--text-dim)` → `rgba(200,185,155,0.78)` (matches disabled option title)
4. **Line 265** — locked body colour: `var(--text-faint)` → `rgba(200,185,155,0.68)` (matches disabled option body)
5. **Line 284** — unlocked body colour: `var(--text-dim)` → `rgba(200,185,158,0.82)` (matches available option body); also change `snippet` reference to `b.description`

- [ ] **Step 1: Apply edit — remove snippet, rephrase lock copy**

In `src/components/SetupScreens.tsx`, replace:

```tsx
            const snippet    = b.description.match(/^[^.!?]+[.!?]/)?.[0] ?? b.description

            if (!isUnlocked) {
              const unlockGod = getUnlockingGod(b.id)
              const lockCopy = unlockGod
                ? `Unlocked when summoning ${GOD_PATH_NAMES[unlockGod]}.`
                : 'Complete a run to unlock.'
```

With:

```tsx
            if (!isUnlocked) {
              const unlockGod = getUnlockingGod(b.id)
              const lockCopy = unlockGod
                ? `Earned by summoning ${GOD_PATH_NAMES[unlockGod]}.`
                : 'Earned by completing a run.'
```

- [ ] **Step 2: Apply edit — locked title colour**

Replace:

```tsx
                    <span style={{ fontSize: '0.9rem', fontVariant: 'small-caps', color: 'var(--text-dim)', letterSpacing: '0.06em' }}>{b.title}</span>
```

With:

```tsx
                    <span style={{ fontSize: '0.9rem', fontVariant: 'small-caps', color: 'rgba(200,185,155,0.78)', letterSpacing: '0.06em' }}>{b.title}</span>
```

- [ ] **Step 3: Apply edit — locked body colour**

Replace:

```tsx
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontStyle: 'italic', lineHeight: 1.4 }}>{lockCopy}</div>
```

With:

```tsx
                  <div style={{ fontSize: '0.8rem', color: 'rgba(200,185,155,0.68)', fontStyle: 'italic', lineHeight: 1.4 }}>{lockCopy}</div>
```

- [ ] **Step 4: Apply edit — unlocked body colour + swap snippet → b.description**

Replace:

```tsx
                <div style={{ fontSize: '0.8rem', color: chosen ? 'var(--text)' : 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.45 }}>{snippet}</div>
```

With:

```tsx
                <div style={{ fontSize: '0.8rem', color: chosen ? 'var(--text)' : 'rgba(200,185,158,0.82)', fontStyle: 'italic', lineHeight: 1.45 }}>{b.description}</div>
```

- [ ] **Step 5: Run vitest to confirm 242/242**

```bash
cd "C:/Project Abyssial/Code/project-abyssial" && npx vitest run
```

Expected: `242 passed` — no failures.

- [ ] **Step 6: Commit**

```bash
git -C "C:/Project Abyssial/Code/project-abyssial" add src/components/SetupScreens.tsx
git -C "C:/Project Abyssial/Code/project-abyssial" commit -m "polish(p20-k2): blessing screen full desc, in-voice lock copy, option-card colours"
```
