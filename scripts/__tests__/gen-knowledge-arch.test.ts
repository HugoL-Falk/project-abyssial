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
