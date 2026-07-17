// ─── Shared resource SVG icons ────────────────────────────────────────────────
// Used by ResourceBar and EffectTags
import type { ResourceKey } from '../../types'

export function GoldIcon()       { return <svg style={{ display: 'block' }} width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1"/><circle cx="6.5" cy="6.5" r="2.5" fill="currentColor" opacity="0.45"/></svg> }
export function FollowersIcon()  { return <svg style={{ display: 'block' }} width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="4.5" r="2.3" stroke="currentColor" strokeWidth="1"/><path d="M1.5 12.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg> }
export function InfluenceIcon()  { return <svg style={{ display: 'block' }} width="13" height="13" viewBox="0 0 13 13" fill="none"><ellipse cx="6.5" cy="6.5" rx="5.5" ry="3.2" stroke="currentColor" strokeWidth="1"/><circle cx="6.5" cy="6.5" r="1.6" fill="currentColor"/></svg> }
export function DreadIcon()      { return <svg style={{ display: 'block' }} width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L12 10.5H1L6.5 1Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/></svg> }
export function RelicsIcon()     { return <svg style={{ display: 'block' }} width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1l1.8 3.8 3.7 1.7-3.7 1.7-1.8 3.8-1.8-3.8L1 6.5l3.7-1.7L6.5 1z" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round"/></svg> }
export function TheChangedIcon() { return <svg style={{ display: 'block' }} width="13" height="13" viewBox="0 0 13 13"><path d="M6.5,0.5 L12.5,3.5 L12.5,9.5 L6.5,12.5 L0.5,9.5 L0.5,3.5 Z" fill="currentColor"/></svg> }

export const RESOURCE_ICONS: Partial<Record<string, () => JSX.Element>> = {
  gold: GoldIcon, followers: FollowersIcon, influence: InfluenceIcon,
  dread: DreadIcon, relics: RelicsIcon, theChanged: TheChangedIcon,
}

export const RESOURCE_ORDER: ResourceKey[] = ['gold', 'followers', 'influence', 'dread', 'relics', 'theChanged']
