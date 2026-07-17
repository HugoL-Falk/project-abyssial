import { DEFAULT_CARD_BACK, getCardBackBySlug } from '../data/cardBacks'

const KEY_MUSIC = 'abyssial.musicVolume'
const KEY_SFX   = 'abyssial.sfxVolume'
const KEY_UI    = 'abyssial.uiVolume'
const KEY_BACK  = 'abyssial.cardBack'

// P22-33: Music 15 / SFX 40 / UI 20 defaults
export const DEFAULT_MUSIC_VOLUME = 15
export const DEFAULT_SFX_VOLUME   = 40
export const DEFAULT_UI_VOLUME    = 20

function clampVolume(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function getMusicVolume(): number {
  const raw = localStorage.getItem(KEY_MUSIC)
  if (raw === null) return DEFAULT_MUSIC_VOLUME
  const n = Number(raw)
  return Number.isFinite(n) ? clampVolume(n) : DEFAULT_MUSIC_VOLUME
}

export function setMusicVolume(n: number): void {
  localStorage.setItem(KEY_MUSIC, String(clampVolume(n)))
}

export function getSfxVolume(): number {
  const raw = localStorage.getItem(KEY_SFX)
  if (raw === null) return DEFAULT_SFX_VOLUME
  const n = Number(raw)
  return Number.isFinite(n) ? clampVolume(n) : DEFAULT_SFX_VOLUME
}

export function setSfxVolume(n: number): void {
  localStorage.setItem(KEY_SFX, String(clampVolume(n)))
}

export function getUiVolume(): number {
  const raw = localStorage.getItem(KEY_UI)
  if (raw === null) return DEFAULT_UI_VOLUME
  const n = Number(raw)
  return Number.isFinite(n) ? clampVolume(n) : DEFAULT_UI_VOLUME
}

export function setUiVolume(n: number): void {
  localStorage.setItem(KEY_UI, String(clampVolume(n)))
}

export function getCardBackSlug(): string {
  const raw = localStorage.getItem(KEY_BACK)
  if (raw === null) return DEFAULT_CARD_BACK.slug
  return getCardBackBySlug(raw).slug
}

export function setCardBackSlug(slug: string): void {
  const validated = getCardBackBySlug(slug).slug
  localStorage.setItem(KEY_BACK, validated)
}
