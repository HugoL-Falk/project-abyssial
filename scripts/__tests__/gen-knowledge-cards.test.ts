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
