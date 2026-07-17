import * as ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

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

  // First option that sets a known prep tag wins; does not recurse into
  // randomOutcome.outcomes[].effects[] — current card data does not place
  // setPrepTag/deferGodPathCard inside randomOutcome.
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
    .update(optionFlavour.join(' '))
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
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const srcDir = path.resolve(__dirname, '../src/data/cards')
  const outPath = path.resolve(__dirname, '../../../knowledge/cards/INDEX.md')
  const out = generateCardsIndex(srcDir)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, out, 'utf8')
  console.log(`wrote ${outPath} (${out.split('\n').length} lines)`)
}

// Run main only when invoked directly, not when imported by tests.
const _isMain =
  typeof process !== 'undefined' &&
  process.argv[1] != null &&
  (process.argv[1] === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('gen-knowledge-cards.ts') ||
    process.argv[1].endsWith('gen-knowledge-cards.js'))
if (_isMain) {
  main()
}
