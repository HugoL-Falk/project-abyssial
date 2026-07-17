/**
 * Seeded RNG — mulberry32.
 * Returns a stateful function that produces [0, 1) floats deterministically.
 */
export function seededRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * djb2 string hash → uint32. Used to seed the RNG from a card+drawCount string.
 */
export function hashString(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0
  }
  return h >>> 0
}
