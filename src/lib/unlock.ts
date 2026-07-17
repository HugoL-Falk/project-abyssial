const STORAGE_KEY = 'gods_unlocked'

export function isGodsUnlocked(): boolean {
  const required = import.meta.env.VITE_UNLOCK_PASSWORD as string | undefined
  if (!required) return true  // env var absent = no password protection, all gods available
  return localStorage.getItem(STORAGE_KEY) === required
}

export function attemptGodUnlock(input: string): boolean {
  const required = import.meta.env.VITE_UNLOCK_PASSWORD as string | undefined
  if (!required) return false
  if (input === required) {
    localStorage.setItem(STORAGE_KEY, required)
    return true
  }
  return false
}

export function isUnlockFieldVisible(): boolean {
  const required = import.meta.env.VITE_UNLOCK_PASSWORD as string | undefined
  return typeof required === 'string' && required.length > 0
}
