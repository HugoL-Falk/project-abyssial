import * as ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

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
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const srcDir = path.resolve(__dirname, '../src')
  const outPath = path.resolve(__dirname, '../../../knowledge/architecture-inventory.md')
  const out = generateArchInventory(srcDir)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, out, 'utf8')
  console.log(`wrote ${outPath} (${out.split('\n').length} lines)`)
}

const _isMain =
  typeof process !== 'undefined' &&
  process.argv[1] != null &&
  (process.argv[1] === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('gen-knowledge-arch.ts') ||
    process.argv[1].endsWith('gen-knowledge-arch.js'))
if (_isMain) {
  main()
}
