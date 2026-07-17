// ─── SFX paths ─────────────────────────────────────────────────────────────────
// All assets are optional — missing files load as null and playback is silent.

export const SFX_PATHS: Record<string, string> = {
  click:            '/sfx/clickmuffled.mp3',
  cardDraw:         '/sfx/card-draw.mp3',
  cardPreviewOpen:  '/sfx/682449.mp3',
  optionResolve:    '/sfx/clickmuffled.mp3',
  pageTurn:         '/sfx/page-turn.mp3',
  rain:             '/sfx/rain.mp3',
  reshuffle:        '/sfx/reshuffle.mp3',
  succumb:          '/sfx/succumb.mp3',
  summon:           '/sfx/summon.mp3',
  thunderSharp:     '/sfx/thunder-sharp.mp3',
  thunderBoom:      '/sfx/thunder-boom.mp3',
  thunderRumble:    '/sfx/thunder-rumble.mp3',
}

// ─── Music paths ───────────────────────────────────────────────────────────────

export type GodPath = 'yha_nthlei' | 'nyarlathotep' | 'shub_niggurath'

export const MUSIC_PATHS: Record<string, string | string[]> = {
  menu:     '/music/menu.mp3',
  intro:    '/Audio/Music/intro/573379.mp3',
  victory:  '/music/victory.mp3',
  gameOver: '/music/game-over.mp3',
  bonus:    '/music/bonus.wav',
}

// ─── God‑specific layered music ───────────────────────────────────────────────
// Each god has a base track that always plays, with optional overlay tracks
// that layer on top per escalation tier.

export interface GodTierLayers {
  base: string
  overlays: string[]
}

export const GOD_LAYERS: Record<string, GodTierLayers[]> = {
  nyarlathotep: [
    { base: '/Audio/Music/nyar/316821.mp3', overlays: [] },
    { base: '/Audio/Music/nyar/316821.mp3', overlays: ['/Audio/Music/nyar/860890.mp3'] },
    { base: '/Audio/Music/nyar/316821.mp3', overlays: ['/Audio/Music/nyar/860890.mp3', '/Audio/Music/nyar/860847.mp3'] },
  ],
  shub_niggurath: [
    { base: '/Audio/Music/shub/861250.mp3', overlays: [] },
    { base: '/Audio/Music/shub/861250.mp3', overlays: ['/Audio/Music/shub/434017.mp3'] },
    { base: '/Audio/Music/shub/861250.mp3', overlays: ['/Audio/Music/nyar/860847.mp3'] },
  ],
  yha_nthlei: [
    { base: '/Audio/Music/yha/567347.mp3', overlays: [] },
    { base: '/Audio/Music/yha/567347.mp3', overlays: ['/Audio/Music/yha/567220.mp3'] },
    { base: '/Audio/Music/yha/567347.mp3', overlays: ['/Audio/Music/yha/567220.mp3', '/Audio/Music/yha/504641.mp3'] },
  ],
}

// ─── Per-god volume scale (P25-14) ────────────────────────────────────────────
// Compensates for source files that differ in perceived loudness across gods.
// Applied on top of the global music slider. Tune by ear during playtest.
// nyarlathotep reported louder than yha_nthlei — scale it down.
export const GOD_VOLUME_SCALE: Record<string, number> = {
  nyarlathotep:   0.75,
  shub_niggurath: 0.75,
  yha_nthlei:     1.00,
}

// ─── Week escalation — reshuffleCount → tier index ─────────────────────────────
// reshuffleCount 0-1 → tier 0 (early week, calm)
// reshuffleCount 2-3 → tier 1 (mid-run, tense)
// reshuffleCount 4-5 → tier 2 (endgame, intense)

export function musicTier(reshuffleCount: number): number {
  if (reshuffleCount <= 1) return 0
  if (reshuffleCount <= 3) return 1
  return 2
}
