import type { Effect, Resources } from '../../../types'
import { RESOURCE_ICONS } from '../ResourceIcons'

export function ResourceTag({ effect, currentResources: _currentResources, isTutorial: _isTutorial }: {
  effect: Extract<Effect, { type: 'resource' }>
  currentResources?: Resources  // reserved for future cap-glow logic
  isTutorial?: boolean          // reserved for future tutorial overlays
}) {
  const pos = effect.delta > 0
  const color = effect.resource === 'dread'
    ? (pos ? '#aa6464' : '#6aaa6a')
    : (pos ? '#6aaa6a' : '#aa6464')
  const Icon = RESOURCE_ICONS[effect.resource]
  // P17-12: option effect tags never pulse — critical-resource pulsing lives on
  // the ResourceBar counter instead (see ResourceBar.tsx).
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.9rem', color, padding: '0.15rem 0.38rem', borderRadius: '2px', lineHeight: 1 }}>
      {Icon && <span style={{ display: 'inline-flex', alignItems: 'center', height: '13px' }}><Icon /></span>}
      <span style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center', height: '13px' }}>
        {pos ? '+' : ''}{effect.delta}
      </span>
    </span>
  )
}
