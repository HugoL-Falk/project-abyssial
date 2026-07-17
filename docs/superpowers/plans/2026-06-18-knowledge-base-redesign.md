# Knowledge Base Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stale hand-summaries and append-only ledgers in `knowledge/` with auto-derived indices, live/archive splits, and a rolling-window handoff — optimised for Claude's token cost at startup, not human readability.

**Architecture:** Two TypeScript generator scripts (`gen-knowledge-cards.ts`, `gen-knowledge-arch.ts`) walk `src/data/cards/*.ts` and `src/**/*.{ts,tsx,css}` respectively and emit pipe-delimited one-line-per-entry markdown into `knowledge/`. A non-blocking husky pre-commit hook runs both scripts and stages nothing (the vault is not in the code repo's git tree — outputs live on disk only). A one-time migration archives the 14 hand-summary card notes, splits decisions into live + archive, sweeps old sessions into a rolling-window archive, and rewrites CLAUDE.md's startup/shutdown routine. The vault root (`E:/Project Abyssial/`) is **not** a git repository; only the code repo at `E:/Project Abyssial/Code/project-abyssial/` is versioned. All paths into `knowledge/` are absolute or relative-to-vault-root.

**Tech Stack:** Node.js + TypeScript (TS compiler API via `typescript` package — already a devDep), husky 9.x, vitest 2.x (already devDep).

## Global Constraints

- **Spec reference:** `Code/project-abyssial/docs/superpowers/specs/2026-06-18-knowledge-base-redesign-design.md` (commit `5d0702f`).
- **Vault layout:** All `knowledge/...` paths in this plan are relative to `E:/Project Abyssial/` (the vault root). The code repo at `E:/Project Abyssial/Code/project-abyssial/` is the only git-tracked path; `knowledge/` is NOT tracked.
- **Script location:** Generator scripts live at `Code/project-abyssial/scripts/gen-knowledge-cards.ts` and `Code/project-abyssial/scripts/gen-knowledge-arch.ts`. Tests live at `Code/project-abyssial/scripts/__tests__/`.
- **Script invocation:** Scripts are invoked via `npx tsx scripts/<name>.ts` (add `tsx` as devDep). Working directory must be the code repo root.
- **Output path resolution:** Scripts write to `../../knowledge/cards/INDEX.md` and `../../knowledge/architecture-inventory.md` (relative to code repo root → vault root → `knowledge/`).
- **Non-blocking hook:** The pre-commit hook must `exit 0` even if generator scripts throw. Print warning, never block.
- **No deletion of irreplaceable content:** Vault is not git-tracked. The 14 hand-summary card `.md` files must be **archived to `knowledge/cards/archive-handnotes/`**, not deleted.
- **Format discipline:** All Claude-facing files use pipe-delimited one-line-per-entry format where possible. No prose preamble. README is a routing table, not a tour.

---

### Task 1: Tooling scaffolding (husky + tsx + npm scripts)

**Files:**
- Modify: `Code/project-abyssial/package.json` (add `tsx` and `husky` devDeps; add `knowledge:gen-cards`, `knowledge:gen-arch`, `knowledge:gen`, `prepare` scripts)
- Create: `Code/project-abyssial/.husky/pre-commit`
- Create: `Code/project-abyssial/scripts/.gitkeep`

**Interfaces:**
- Consumes: nothing (foundational task)
- Produces: `npm run knowledge:gen` runs both generators (will fail until Tasks 2+3 land — that's expected); `.husky/pre-commit` exists with the non-blocking invocation; `tsx` available for the generator scripts.

- [ ] **Step 1: Install devDeps**

Run from `Code/project-abyssial/`:
```
npm install --save-dev husky@^9.1.0 tsx@^4.19.0
```
Expected: `package.json` updated with both entries under `devDependencies`; `package-lock.json` updated; no errors.

- [ ] **Step 2: Add npm scripts**

Edit `Code/project-abyssial/package.json`. In the `"scripts"` block, add (alphabetical order is fine; keep existing scripts):

```json
"knowledge:gen": "npm run knowledge:gen-cards && npm run knowledge:gen-arch",
"knowledge:gen-cards": "tsx scripts/gen-knowledge-cards.ts",
"knowledge:gen-arch": "tsx scripts/gen-knowledge-arch.ts",
"prepare": "husky"
```

Then run:
```
npm run prepare
```
Expected: `.husky/` directory created.

- [ ] **Step 3: Create scripts directory and pre-commit hook**

Create the scripts directory with a placeholder so git tracks it:
```
mkdir -p scripts/__tests__
touch scripts/.gitkeep
```

Create `Code/project-abyssial/.husky/pre-commit` with these exact contents:

```sh
#!/usr/bin/env sh
# Non-blocking knowledge regeneration.
# The vault is not git-tracked; outputs live on disk only.
# If generation fails, we warn but never block the commit.

if ! npm run --silent knowledge:gen 2>/tmp/knowledge-gen.log; then
  echo "warning: knowledge regeneration failed (see /tmp/knowledge-gen.log) — commit continuing" >&2
fi

exit 0
```

Make it executable (Windows note: the shebang plus husky's wrapper handle execution on Windows via Git Bash; no `chmod` needed).

- [ ] **Step 4: Verify scaffolding**

Run:
```
git add -A
git commit -m "chore: scaffold husky + tsx for knowledge generators"
```
Expected: pre-commit hook fires, `npm run knowledge:gen` fails (scripts don't exist yet), warning is printed, commit succeeds anyway.

- [ ] **Step 5: Confirm commit landed**

Run:
```
git log -1 --oneline
```
Expected: shows the chore commit.

---

### Task 2: Cards index generator (`gen-knowledge-cards.ts`)

**Files:**
- Create: `Code/project-abyssial/scripts/gen-knowledge-cards.ts`
- Create: `Code/project-abyssial/scripts/__tests__/gen-knowledge-cards.test.ts`
- Read (for type understanding): `Code/project-abyssial/src/types/index.ts` (do not modify)
- Read (for input format): `Code/project-abyssial/src/data/cards/*.ts` (do not modify)
- Write at runtime: `E:/Project Abyssial/knowledge/cards/INDEX.md`

**Interfaces:**
- Consumes: Card definitions in `src/data/cards/*.ts` (typed as `Card[]` from `src/types/index.ts`). Each card has `id`, `title`, `tier`, `flavourText`, optional `tags`, and `options[]`. Each option has `effects[]` where an entry may be `{ type: 'setPrepTag', tag: 'studied' | 'attended_seance' | 'opium_pact' | 'recited' }` or `{ type: 'deferGodPathCard' }`.
- Produces: Function `generateCardsIndex(srcDir: string): string` returning the full INDEX.md content as a string, and a `main()` that writes it to the vault. The exported `generateCardsIndex` is what the test imports.

- [ ] **Step 1: Write the failing test**

Create `Code/project-abyssial/scripts/__tests__/gen-knowledge-cards.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateCardsIndex } from '../gen-knowledge-cards'
import * as path from 'node:path'

describe('generateCardsIndex', () => {
  const srcDir = path.resolve(__dirname, '../../src/data/cards')

  it('emits a header line and at least one card line', () => {
    const out = generateCardsIndex(srcDir)
    const lines = out.split('\n').filter(l => l.startsWith('|'))
    expect(lines.length).toBeGreaterThan(10)
    expect(lines[0]).toContain('id')
    expect(lines[0]).toContain('prep_carrier')
    expect(lines[0]).toContain('defer_carrier')
  })

  it('detects setPrepTag carriers', () => {
    const out = generateCardsIndex(srcDir)
    // the_old_book has option setting prep tag 'studied'
    const oldBookLine = out.split('\n').find(l => l.includes('| the_old_book |'))
    expect(oldBookLine).toBeDefined()
    expect(oldBookLine!).toContain('studied')
  })

  it('detects deferGodPathCard carriers', () => {
    const out = generateCardsIndex(srcDir)
    const deferCardLine = out.split('\n').find(l => l.includes('| the_diocese_sends_word |'))
    expect(deferCardLine).toBeDefined()
    expect(deferCardLine!.split('|')[6].trim()).toBe('yes')
  })

  it('emits a generation-timestamp header', () => {
    const out = generateCardsIndex(srcDir)
    expect(out).toMatch(/^<!-- generated /)
  })

  it('produces stable output for unchanged input', () => {
    const a = generateCardsIndex(srcDir)
    const b = generateCardsIndex(srcDir)
    // strip the timestamp line for the equality check
    const stripTs = (s: string) => s.split('\n').slice(1).join('\n')
    expect(stripTs(a)).toBe(stripTs(b))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
cd Code/project-abyssial
npx vitest run scripts/__tests__/gen-knowledge-cards.test.ts
```
Expected: FAIL — module `../gen-knowledge-cards` does not exist.

- [ ] **Step 3: Implement the generator**

Create `Code/project-abyssial/scripts/gen-knowledge-cards.ts`:

```ts
import * as ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'

type CardRow = {
  id: string
  title: string
  tier: string
  tags: string
  prepCarrier: string
  deferCarrier: string
  optionCount: number
  flavourHash: string
}

const PREP_TAGS = new Set(['studied', 'attended_seance', 'opium_pact', 'recited'])

function readObjectProp(obj: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === name) {
      return p.initializer
    }
  }
  return undefined
}

function stringLiteralValue(node: ts.Expression | undefined): string | undefined {
  if (!node) return undefined
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  return undefined
}

function arrayElements(node: ts.Expression | undefined): readonly ts.Expression[] {
  if (!node || !ts.isArrayLiteralExpression(node)) return []
  return node.elements
}

function extractCardsFromSourceFile(sf: ts.SourceFile): CardRow[] {
  const rows: CardRow[] = []

  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!decl.initializer) continue
        // Looking for `export const FOO_CARDS: Card[] = [ { ... }, ... ]`
        if (!ts.isArrayLiteralExpression(decl.initializer)) continue
        for (const el of decl.initializer.elements) {
          if (!ts.isObjectLiteralExpression(el)) continue
          const row = extractCardObject(el)
          if (row) rows.push(row)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return rows
}

function extractCardObject(obj: ts.ObjectLiteralExpression): CardRow | null {
  const id = stringLiteralValue(readObjectProp(obj, 'id'))
  const title = stringLiteralValue(readObjectProp(obj, 'title'))
  const tier = stringLiteralValue(readObjectProp(obj, 'tier'))
  if (!id || !title || !tier) return null

  const flavour = stringLiteralValue(readObjectProp(obj, 'flavourText')) ?? ''
  const tags = arrayElements(readObjectProp(obj, 'tags'))
    .map(t => stringLiteralValue(t))
    .filter((t): t is string => Boolean(t))
    .join(',') || '-'

  const optionsNode = readObjectProp(obj, 'options')
  const options = arrayElements(optionsNode)

  let prepCarrier = '-'
  let deferCarrier = '-'
  const optionFlavour: string[] = [flavour]

  for (const opt of options) {
    if (!ts.isObjectLiteralExpression(opt)) continue
    const optFlav = stringLiteralValue(readObjectProp(opt, 'flavourText'))
    if (optFlav) optionFlavour.push(optFlav)
    const effects = arrayElements(readObjectProp(opt, 'effects'))
    for (const eff of effects) {
      if (!ts.isObjectLiteralExpression(eff)) continue
      const effType = stringLiteralValue(readObjectProp(eff, 'type'))
      if (effType === 'setPrepTag') {
        const tag = stringLiteralValue(readObjectProp(eff, 'tag'))
        if (tag && PREP_TAGS.has(tag) && prepCarrier === '-') prepCarrier = tag
      } else if (effType === 'deferGodPathCard') {
        deferCarrier = 'yes'
      }
    }
  }

  const flavourHash = crypto
    .createHash('sha1')
    .update(optionFlavour.join(' '))
    .digest('hex')
    .slice(0, 4)

  return {
    id,
    title,
    tier,
    tags,
    prepCarrier,
    deferCarrier,
    optionCount: options.length,
    flavourHash,
  }
}

export function generateCardsIndex(srcDir: string): string {
  const files = fs
    .readdirSync(srcDir)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .sort()

  const rows: CardRow[] = []
  for (const file of files) {
    const full = path.join(srcDir, file)
    const text = fs.readFileSync(full, 'utf8')
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true)
    rows.push(...extractCardsFromSourceFile(sf))
  }

  rows.sort((a, b) => a.id.localeCompare(b.id))

  const ts_ = new Date().toISOString()
  const header =
    `<!-- generated ${ts_} by scripts/gen-knowledge-cards.ts — do not hand-edit -->\n` +
    `<!-- format: one row per card; grep by id/tag; for detail read src/data/cards/<file>.ts -->\n\n`

  const tableHeader =
    `| id | title | tier | tags | prep_carrier | defer_carrier | option_count | flavour_hash |\n` +
    `|---|---|---|---|---|---|---|---|\n`

  const body = rows
    .map(
      r =>
        `| ${r.id} | ${r.title} | ${r.tier} | ${r.tags} | ${r.prepCarrier} | ${r.deferCarrier} | ${r.optionCount} | ${r.flavourHash} |`,
    )
    .join('\n')

  return header + tableHeader + body + '\n'
}

function main() {
  const srcDir = path.resolve(__dirname, '../src/data/cards')
  const outPath = path.resolve(__dirname, '../../../knowledge/cards/INDEX.md')
  const out = generateCardsIndex(srcDir)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, out, 'utf8')
  console.log(`wrote ${outPath} (${out.split('\n').length} lines)`)
}

// Run main only when invoked directly, not when imported by tests.
if (require.main === module) {
  main()
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run scripts/__tests__/gen-knowledge-cards.test.ts
```
Expected: PASS — all 5 test cases green.

- [ ] **Step 5: Smoke-run the generator end-to-end**

```
npm run knowledge:gen-cards
```
Expected: prints `wrote E:/Project Abyssial/knowledge/cards/INDEX.md (NN lines)`; the file exists at that path; contains a generation timestamp and the table.

- [ ] **Step 6: Commit**

```
git add scripts/gen-knowledge-cards.ts scripts/__tests__/gen-knowledge-cards.test.ts
git commit -m "feat(knowledge): cards index generator"
```

---

### Task 3: Architecture inventory generator (`gen-knowledge-arch.ts`)

**Files:**
- Create: `Code/project-abyssial/scripts/gen-knowledge-arch.ts`
- Create: `Code/project-abyssial/scripts/__tests__/gen-knowledge-arch.test.ts`
- Read (for input): `Code/project-abyssial/src/**/*.{ts,tsx,css}` (do not modify)
- Write at runtime: `E:/Project Abyssial/knowledge/architecture-inventory.md`

**Interfaces:**
- Consumes: source files under `src/`
- Produces: exported `generateArchInventory(srcDir: string): string` returning the full inventory markdown. Each row: `path | LOC | exports`. CSS files: `exports` column is `-`.

- [ ] **Step 1: Write the failing test**

Create `Code/project-abyssial/scripts/__tests__/gen-knowledge-arch.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateArchInventory } from '../gen-knowledge-arch'
import * as path from 'node:path'

describe('generateArchInventory', () => {
  const srcDir = path.resolve(__dirname, '../../src')

  it('emits a header line and many file lines', () => {
    const out = generateArchInventory(srcDir)
    const lines = out.split('\n').filter(l => l.startsWith('|') && !l.startsWith('|---'))
    expect(lines.length).toBeGreaterThan(20)
    expect(lines[0]).toContain('path')
    expect(lines[0]).toContain('LOC')
    expect(lines[0]).toContain('exports')
  })

  it('lists gameStore.ts with at least one named export', () => {
    const out = generateArchInventory(srcDir)
    const line = out.split('\n').find(l => l.includes('gameStore.ts'))
    expect(line).toBeDefined()
    expect(line!).toMatch(/useGameStore/)
  })

  it('lists css files with - in the exports column', () => {
    const out = generateArchInventory(srcDir)
    const line = out.split('\n').find(l => l.includes('index.css'))
    expect(line).toBeDefined()
    const cols = line!.split('|').map(c => c.trim())
    expect(cols[3]).toBe('-')
  })

  it('emits a generation timestamp header', () => {
    const out = generateArchInventory(srcDir)
    expect(out).toMatch(/^<!-- generated /)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run scripts/__tests__/gen-knowledge-arch.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the generator**

Create `Code/project-abyssial/scripts/gen-knowledge-arch.ts`:

```ts
import * as ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'

type Row = { rel: string; loc: number; exports: string }

function walk(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name.startsWith('.')) continue
      walk(full, out)
    } else if (/\.(ts|tsx|css)$/.test(ent.name)) {
      out.push(full)
    }
  }
  return out
}

function countLoc(text: string): number {
  return text.split('\n').filter(l => l.trim().length > 0).length
}

function extractExports(text: string, filename: string): string[] {
  const sf = ts.createSourceFile(filename, text, ts.ScriptTarget.ES2022, true)
  const names: string[] = []
  for (const stmt of sf.statements) {
    const mods = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined
    const isExported = mods?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
    if (!isExported) continue

    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      names.push(stmt.name.text)
    } else if (ts.isClassDeclaration(stmt) && stmt.name) {
      names.push(stmt.name.text)
    } else if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) names.push(d.name.text)
      }
    } else if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) {
      names.push(stmt.name.text)
    } else if (ts.isEnumDeclaration(stmt)) {
      names.push(stmt.name.text)
    }
  }
  return names
}

export function generateArchInventory(srcDir: string): string {
  const files = walk(srcDir).sort()
  const rows: Row[] = []
  for (const full of files) {
    const rel = path.relative(path.resolve(srcDir, '..'), full).replace(/\\/g, '/')
    const text = fs.readFileSync(full, 'utf8')
    const loc = countLoc(text)
    let exportsStr = '-'
    if (!rel.endsWith('.css')) {
      const names = extractExports(text, full)
      exportsStr = names.length ? names.join(', ') : '-'
    }
    rows.push({ rel, loc, exports: exportsStr })
  }

  const ts_ = new Date().toISOString()
  const header =
    `<!-- generated ${ts_} by scripts/gen-knowledge-arch.ts — do not hand-edit -->\n\n`
  const tableHeader =
    `| path | LOC | exports |\n|---|---|---|\n`
  const body = rows
    .map(r => `| ${r.rel} | ${r.loc} | ${r.exports} |`)
    .join('\n')
  return header + tableHeader + body + '\n'
}

function main() {
  const srcDir = path.resolve(__dirname, '../src')
  const outPath = path.resolve(__dirname, '../../../knowledge/architecture-inventory.md')
  const out = generateArchInventory(srcDir)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, out, 'utf8')
  console.log(`wrote ${outPath} (${out.split('\n').length} lines)`)
}

if (require.main === module) {
  main()
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run scripts/__tests__/gen-knowledge-arch.test.ts
```
Expected: PASS — all 4 cases green.

- [ ] **Step 5: Smoke-run the generator**

```
npm run knowledge:gen-arch
```
Expected: prints `wrote E:/Project Abyssial/knowledge/architecture-inventory.md (NN lines)`; the file exists.

- [ ] **Step 6: Commit**

```
git add scripts/gen-knowledge-arch.ts scripts/__tests__/gen-knowledge-arch.test.ts
git commit -m "feat(knowledge): architecture inventory generator"
```

---

### Task 4: Verify pre-commit hook fires both generators

**Files:**
- Modify: `Code/project-abyssial/src/data/cards/core.ts` (trivial whitespace touch — will be reverted before commit)
- Read: `E:/Project Abyssial/knowledge/cards/INDEX.md` (verify timestamp updated)

**Interfaces:**
- Consumes: Tasks 1–3 (hook + both generators must exist)
- Produces: nothing new; proves the wired-together system works end-to-end.

- [ ] **Step 1: Capture current INDEX.md timestamp**

```
grep -m1 "generated" "../../knowledge/cards/INDEX.md"
```
Expected: a line like `<!-- generated 2026-06-18T... -->`. Record this.

- [ ] **Step 2: Touch a card file and stage it**

```
echo "// trigger hook" >> src/data/cards/core.ts
git add src/data/cards/core.ts
```

- [ ] **Step 3: Commit and check hook output**

```
git commit -m "test: trigger pre-commit knowledge regen"
```
Expected: commit succeeds. Hook output is silent (success) or warning (acceptable, must not block).

- [ ] **Step 4: Verify INDEX.md timestamp moved forward**

```
grep -m1 "generated" "../../knowledge/cards/INDEX.md"
```
Expected: a newer timestamp than Step 1's.

- [ ] **Step 5: Revert the test commit**

```
git reset --hard HEAD~1
```
Expected: working tree clean; the trivial whitespace gone. (The INDEX.md regeneration that happened is harmless residue — Task 5 will regenerate it again anyway.)

- [ ] **Step 6: Confirm hook failure mode is non-blocking**

Temporarily break the generator: edit `scripts/gen-knowledge-cards.ts` line 1 to `import {NONEXISTENT} from 'nowhere'`. Then:

```
echo "// trigger" >> src/data/cards/core.ts
git add src/data/cards/core.ts
git commit -m "test: hook non-blocking failure"
```
Expected: commit succeeds with stderr warning `warning: knowledge regeneration failed ...`. The commit exists on the branch.

- [ ] **Step 7: Restore script + revert test commit**

Restore `scripts/gen-knowledge-cards.ts` line 1 to its original import. Then:
```
git reset --hard HEAD~1
```
Expected: clean working tree. No commits added since end of Task 3.

---

### Task 5: One-time vault migration

**Files (vault-side, NOT in code repo):**
- Move: `knowledge/cards/*.md` (14 files: `academic_society.md`, `artefact_from_deep.md`, `changed_follower.md`, `fishermans_return.md`, `forgers_debt.md`, `geometry_is_wrong.md`, `grove_awaits.md`, `investigators_file.md`, `marsh_connection.md`, `relic_market.md`, `something_on_the_hook.md`, `the_dreamer.md`, `the_inheritance.md`, `what_was_already_read.md`) → `knowledge/cards/archive-handnotes/`
- Rename: `knowledge/decisions.md` → `knowledge/decisions-live.md`
- Create: `knowledge/decisions-archive.md` (empty with header)
- Move: `knowledge/sessions/session-52.md` through `knowledge/sessions/session-83.md` → `knowledge/sessions/archive/` (32 files; sessions 84, 85, 86 stay in `knowledge/sessions/`)
- Create: `knowledge/sessions/handoff.md`
- Modify: `knowledge/architecture.md` (replace file-inventory section with pointer to `architecture-inventory.md`)
- Rewrite: `knowledge/README.md`
- Run: `npm run knowledge:gen` to produce initial `INDEX.md` and `architecture-inventory.md`

**Interfaces:**
- Consumes: Tasks 1–4 (generators + hook in place and proven working)
- Produces: Knowledge folder in its new shape. No code changes — this is a content/structure migration only. There are no automated tests for this task; verification is by file presence and content shape.

- [ ] **Step 1: Archive the 14 card hand-summaries**

From the vault root (`E:/Project Abyssial/`):

```
mkdir -p knowledge/cards/archive-handnotes
mv knowledge/cards/academic_society.md \
   knowledge/cards/artefact_from_deep.md \
   knowledge/cards/changed_follower.md \
   knowledge/cards/fishermans_return.md \
   knowledge/cards/forgers_debt.md \
   knowledge/cards/geometry_is_wrong.md \
   knowledge/cards/grove_awaits.md \
   knowledge/cards/investigators_file.md \
   knowledge/cards/marsh_connection.md \
   knowledge/cards/relic_market.md \
   knowledge/cards/something_on_the_hook.md \
   knowledge/cards/the_dreamer.md \
   knowledge/cards/the_inheritance.md \
   knowledge/cards/what_was_already_read.md \
   knowledge/cards/archive-handnotes/
```
Expected: 14 files moved; `knowledge/cards/` contains only `archive-handnotes/` (and will receive `INDEX.md` in Step 6).

- [ ] **Step 2: Generate the cards INDEX.md and architecture-inventory.md**

From the code repo (`E:/Project Abyssial/Code/project-abyssial/`):

```
npm run knowledge:gen
```
Expected: both files written; ~100+ rows in INDEX.md, ~30+ rows in architecture-inventory.md.

- [ ] **Step 3: Split decisions into live + archive**

```
cd "E:/Project Abyssial"
mv knowledge/decisions.md knowledge/decisions-live.md
```

Create `knowledge/decisions-archive.md` with these exact contents:

```
# Decisions Archive

Superseded entries moved here from decisions-live.md. Each entry retains its original D-NN id and date and gains a `SUPERSEDED BY: D-MM` suffix line.

Format: one decision per line where possible; longer ones use a bullet block.

---
```

Expected: `decisions-live.md` exists with the prior content; `decisions-archive.md` exists with only the header above.

- [ ] **Step 4: Move sessions 52–83 to archive**

```
mkdir -p knowledge/sessions/archive
for i in $(seq 52 83); do
  mv "knowledge/sessions/session-$i.md" "knowledge/sessions/archive/" 2>/dev/null || true
done
```
Expected: `knowledge/sessions/` contains `session-84.md`, `session-85.md`, `session-86.md`, plus `archive/` (and the existing `archive-*.md` files; leave those where they are). `knowledge/sessions/archive/` contains 32 session files.

- [ ] **Step 5: Create handoff.md**

Create `knowledge/sessions/handoff.md` with this initial snapshot (reflects session-86's end state):

```
UNCOMMITTED: knowledge base redesign work in progress this session
LAST_COMMIT: <run `git -C "E:/Project Abyssial/Code/project-abyssial" log -1 --oneline` to fill>
NEXT_UP: P14-4 content pass (11 chain-card bonus options + 2 defer replacement effects + WeekBanner per-god copy)
BLOCKED: none
OPEN_COMMITMENTS:
- Manual playtest verification of P14-4 engine + Cluster D + activity log redesign
- P14-4 content pass (thematic + balance agents)
ACTIVE_SPEC: Code/project-abyssial/docs/superpowers/specs/2026-06-18-knowledge-base-redesign-design.md
ACTIVE_PLAN: Code/project-abyssial/docs/superpowers/plans/2026-06-18-knowledge-base-redesign.md
TESTS: 44 / 44 vitest pass, typecheck pass
```

Fill in `LAST_COMMIT` by running the shown command and pasting the `<sha> <subject>` line.

- [ ] **Step 6: Edit architecture.md to remove the file-inventory section**

Open `knowledge/architecture.md`. Locate the section that lists files with line counts (likely titled "Files" or "Module Map" or similar). Replace that entire section with:

```
## File inventory

See [[architecture-inventory.md]] — auto-generated from `src/**/*.{ts,tsx,css}` by the pre-commit hook. Grep by symbol name to locate a file; grep by path prefix to scope a search.
```

Leave all other narrative (types, conventions, module philosophy) untouched. If `architecture.md` is entirely a file inventory with no narrative, replace the whole file body with the snippet above.

- [ ] **Step 7: Rewrite README.md as a routing table**

Overwrite `knowledge/README.md` with these exact contents:

```
# Knowledge Routing Table

Optimised for Claude's grep/read speed. Pipe-delimited; one task class per row.

## Mandatory startup reads (in order)

1. `knowledge/README.md` (this file)
2. `knowledge/sessions/handoff.md` — current state, < 30 lines
3. `knowledge/backlog.md` — priorities

## Routing — task → file

| task | action |
|---|---|
| card lookup (by id, tag, prep_carrier, defer_carrier) | grep `knowledge/cards/INDEX.md` → read `Code/project-abyssial/src/data/cards/<file>.ts` |
| symbol / export lookup | grep `knowledge/architecture-inventory.md` |
| "is decision X still current?" | grep `knowledge/decisions-live.md` |
| historical decision context | grep `knowledge/decisions-archive.md` |
| bug recurrence check | grep `knowledge/bugs.md` |
| backlog / next-up | read `knowledge/backlog.md` |
| backup agent context (thematic / card-mechanics / balance / code / visual / playtest) | read `knowledge/agents/<agent>.md` |
| infra (Syncthing / SSH / Tailscale) | read `knowledge/infrastructure.md` |
| prior session detail | read `knowledge/sessions/session-NN.md` (84/85/86 hot; older in `archive/`) |
| investigations | read `knowledge/investigations/<file>.md` |

## Cold archives — do NOT read unless explicitly requested

- `knowledge/sessions/archive/` — sessions 52–83
- `knowledge/cards/archive-handnotes/` — superseded hand-summary card notes
- `knowledge/decisions-archive.md` — superseded decisions
- `knowledge/claude-history.md`, `knowledge/claude-history-archive.md` — sessions 14–41
- `knowledge/backlog-archive.md`
```

- [ ] **Step 8: Verify the migration**

Spot-check:
```
ls knowledge/cards/                            # should show INDEX.md and archive-handnotes/
ls knowledge/cards/archive-handnotes/ | wc -l  # 14
ls knowledge/sessions/ | grep '^session-'      # only 84, 85, 86
ls knowledge/sessions/archive/ | wc -l         # 32
test -f knowledge/sessions/handoff.md && echo ok
test -f knowledge/decisions-live.md && echo ok
test -f knowledge/decisions-archive.md && echo ok
test -f knowledge/architecture-inventory.md && echo ok
```
Expected: every check passes, counts match.

- [ ] **Step 9: No commit step**

The vault is not git-tracked, so there is nothing to commit for vault file changes. Move on to Task 6.

---

### Task 6: CLAUDE.md routine rewrite

**Files:**
- Modify: `E:/Project Abyssial/CLAUDE.md` (the vault-root project instructions file)

**Interfaces:**
- Consumes: Task 5 (new vault layout must be in place)
- Produces: new startup / shutdown routines that Claude will follow in future sessions.

- [ ] **Step 1: Locate the current routines**

Open `E:/Project Abyssial/CLAUDE.md`. Find:
- The "Behavioral Self-Check" list at the top
- The "Session Memory & Intent Routing" section (Startup Context + Shutdown Log bullets)

These are the two blocks that need rewording.

- [ ] **Step 2: Replace the Startup Context bullet**

Find the bullet that begins `* **Startup Context:**` and replace it with:

```
* **Startup Context:** Read these three files in order, every session, before doing anything else:
  1. `knowledge/README.md` — routing table
  2. `knowledge/sessions/handoff.md` — current state (under 30 lines)
  3. `knowledge/backlog.md` — priorities
  Everything else is grep-on-demand per the README routing table. Do NOT read `session-NN.md` files at startup; the handoff covers what you need. Do NOT read `claude-history.md`, `claude-history-archive.md`, or anything under `archive/` / `archive-handnotes/` unless the user explicitly asks.
```

- [ ] **Step 3: Replace the Shutdown Log bullet**

Find the bullet that begins `* **Shutdown Log:**` and replace it with:

```
* **Shutdown Log:** At session end, in this order:
  1. Write a new `knowledge/sessions/session-NN.md` (full narrative)
  2. **Overwrite** `knowledge/sessions/handoff.md` with the new state (schema: UNCOMMITTED, LAST_COMMIT, NEXT_UP, BLOCKED, OPEN_COMMITMENTS, ACTIVE_SPEC, ACTIVE_PLAN, TESTS)
  3. If this session's `session-NN.md` push made an older session more than 3 files behind the head, `mv` the now-stale one to `knowledge/sessions/archive/`
  4. Append new decisions to `knowledge/decisions-live.md`. If a new decision supersedes an older one, cut the older entry's lines and paste them into `knowledge/decisions-archive.md` with a `SUPERSEDED BY: D-NN` suffix
  5. Update `knowledge/backlog.md` and `knowledge/bugs.md` as needed
  6. Tell the user to run `/clear`. Do NOT manually edit `knowledge/cards/INDEX.md` or `knowledge/architecture-inventory.md` — the pre-commit hook owns them.
```

- [ ] **Step 4: Add a new self-check item**

In the Behavioral Self-Check block at the top of CLAUDE.md, add this bullet (place it before the "Is this task superficial" bullet so it fires earlier):

```
- [ ] Did I just finish a session (user about to run `/clear`)? If so, **overwrite** `knowledge/sessions/handoff.md` BEFORE telling them to clear. The handoff IS the next session's startup context — if it's stale, the next session starts blind.
```

- [ ] **Step 5: Remove the obsolete "knowledge/cards/" reference**

In the Shutdown routine section (if `CLAUDE.md` has one separate from the bullet above) or anywhere else, find any line that says `Update any knowledge/cards/ files that changed` (or similar — these files no longer exist). Delete that line.

Also find the line in the Behavioral Self-Check that says `Did I just finish executing an implementation plan? If so, immediately update knowledge/sessions/session-NN.md` — this stays as-is, but if it mentions updating `knowledge/cards/`, remove that part.

- [ ] **Step 6: Verification read**

Re-read the modified `CLAUDE.md` end-to-end. Confirm:
- Startup says: README → handoff.md → backlog.md
- Shutdown says: session-NN → handoff overwrite → archive rolling → decisions split → backlog/bugs → /clear
- Self-check includes the new handoff line
- No remaining references to `knowledge/cards/<card-id>.md` as a hand-maintained file
- No remaining `Read claude-history.md` instructions (these were already cold; just confirm)

- [ ] **Step 7: No commit step**

CLAUDE.md lives in the vault root and is not git-tracked. The change is durable on disk.

---

## Self-Review

**1. Spec coverage:**
- §1 Cards auto-derived index → Task 2 (generator) + Task 5 step 1 (archive hand-summaries) + Task 5 step 2 (initial generation). ✓
- §2 Decisions live/archive split → Task 5 step 3. ✓
- §3 Sessions rolling window + handoff → Task 5 steps 4–5 + Task 6 step 3 (shutdown rule). ✓
- §4 Architecture auto-derived inventory → Task 3 + Task 5 steps 2 & 6. ✓
- §5 README routing table → Task 5 step 7. ✓
- §6 Pre-commit hook tooling → Task 1 (scaffold) + Task 4 (verify). ✓
- §7 CLAUDE.md routine rewrite → Task 6. ✓
- Risks (non-blocking hook, handoff self-check, deletion safety, drift detection via timestamps, TS-compiler-API for exports, flavour-hash churn, resist human-pretty pressure) → all addressed: non-blocking hook in Task 1 step 3 + verified in Task 4 step 6; handoff self-check in Task 6 step 4; archive (not delete) in Task 5 step 1; timestamp headers in Tasks 2/3; TS compiler API used in both generators; flavour-hash documented in Task 2 step 3.

**2. Placeholder scan:**
- No "TBD" / "TODO" / "fill in later" anywhere. ✓
- Every code block is complete and runnable. ✓
- No "similar to Task N" — code is repeated where needed. ✓
- One placeholder of intentional shape: Task 5 step 5 says "Fill in LAST_COMMIT by running the shown command" — this is the engineer pasting one git output line into a templated file. Acceptable.

**3. Type consistency:**
- `generateCardsIndex(srcDir: string): string` defined in Task 2 step 3, imported in Task 2 step 1. ✓
- `generateArchInventory(srcDir: string): string` defined in Task 3 step 3, imported in Task 3 step 1. ✓
- npm scripts `knowledge:gen-cards`, `knowledge:gen-arch`, `knowledge:gen` referenced consistently across Tasks 1, 2, 3, 4, 5. ✓
- File path `knowledge/cards/INDEX.md` and `knowledge/architecture-inventory.md` consistent across all tasks. ✓
- Handoff schema field names (`UNCOMMITTED` / `LAST_COMMIT` / `NEXT_UP` / `BLOCKED` / `OPEN_COMMITMENTS` / `ACTIVE_SPEC` / `ACTIVE_PLAN` / `TESTS`) match between spec, Task 5 step 5, and Task 6 step 3. ✓

All checks pass.
