import posthog from 'posthog-js'

export function initTelemetry(): void {
  const key  = import.meta.env.VITE_POSTHOG_KEY  as string | undefined
  const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined)
    ?? 'https://app.posthog.com'
  if (!key) return
  posthog.init(key, { api_host: host, capture_pageview: false, persistence: 'localStorage' })
}

export function isPosthogEnabled(): boolean {
  return typeof import.meta.env.VITE_POSTHOG_KEY === 'string'
    && import.meta.env.VITE_POSTHOG_KEY.length > 0
}

// -- Prop types ----------------------------------------------------------------

interface ResourceSnapshot {
  res_gold: number
  res_followers: number
  res_influence: number
  res_dread: number
  res_relics: number
}

export interface CardDrawnProps extends ResourceSnapshot {
  card_id: string
  card_title: string
  week: number
  draw_pile_count: number
}

export interface OptionPickedProps extends ResourceSnapshot {
  card_id: string
  option_idx: number
  option_label: string
  week: number
}

export interface OptionSkippedProps {
  card_id: string
  option_idx: number
  option_label: string
  week: number
  reason: 'locked' | 'available'
}

export interface RunEndedProps extends ResourceSnapshot {
  outcome: 'victory' | 'succumb' | 'accept_defeat'
  god_path: string
  week_reached: number
  cards_drawn: number
  god_path_progress: number
}

// -- Capture helpers ----------------------------------------------------------

export function captureRunStarted(godPath: string, isTutorial: boolean): void {
  if (!isPosthogEnabled()) return
  posthog.capture('run_started', { god_path: godPath, is_tutorial: isTutorial })
}

export function captureCardDrawn(p: CardDrawnProps): void {
  if (!isPosthogEnabled()) return
  posthog.capture('card_drawn', p)
}

export function captureOptionPicked(p: OptionPickedProps): void {
  if (!isPosthogEnabled()) return
  posthog.capture('option_picked', p)
}

export function captureOptionSkipped(p: OptionSkippedProps): void {
  if (!isPosthogEnabled()) return
  posthog.capture('option_skipped', p)
}

export function captureRunEnded(p: RunEndedProps): void {
  if (!isPosthogEnabled()) return
  posthog.capture('run_ended', p)
}

export function captureFeedback(
  text: string,
  triggeredBy: 'end_screen' | 'menu_button',
  meta?: { godPath?: string; week?: number; cardId?: string }
): void {
  if (!isPosthogEnabled()) return
  posthog.capture('feedback_submitted', {
    text:         text.slice(0, 2000),
    triggered_by: triggeredBy,
    god_path:     meta?.godPath,
    week:         meta?.week,
    card_id:      meta?.cardId,
  })
}
