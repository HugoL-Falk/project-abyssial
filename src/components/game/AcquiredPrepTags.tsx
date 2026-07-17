import { useGameStore } from '../../state'
import { buildPrepTagPills, type PrepTag } from '../../data/godPaths/prepTagCarriers'
import { HintTooltip } from './HintTooltip'

// P22-38: unified light-blue across all ❖ locations (was purple #9b7bd4).
const PREP_BLUE   = '#5fb8c8'
const PREP_SHADOW = '0 0 6px rgba(95,184,200,0.5)'

// Thematic tooltip per tag — hints at the preparation without explaining the mechanic.
const PREP_TAG_TOOLTIPS: Record<PrepTag, string> = {
  studied:         'Something studied. It will surface when the moment is right.',
  attended_seance: 'A door was opened. It has not been closed.',
  opium_pact:      'A bargain was made in the dark. The dream-hour approaches.',
  recited:         'Words were spoken that cannot be unspoken. Something is listening.',
  olgreth_prep:    'A prior arrangement. It will surface when the moment is right.',
}

/**
 * P19-27: live row of the player's acquired prep tags, shown in the band
 * between the drawn card art and the options panel. Returns null when no
 * tags are held — the zone stays empty until the first setPrepTag effect fires
 * (or after a chain card consumes the last held tag).
 */
export function AcquiredPrepTags(): JSX.Element | null {
  const prepTags = useGameStore(s => s.prepTags)
  const pills = buildPrepTagPills(prepTags)
  if (pills.length === 0) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'center', pointerEvents: 'auto' }}>
      {pills.map(({ tag, label }) => (
        <HintTooltip
          key={tag}
          text={PREP_TAG_TOOLTIPS[tag]}
          ariaLabel={`Preparation: ${label}`}
          accent="blue"
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            fontSize: '0.78rem', color: PREP_BLUE, textShadow: PREP_SHADOW,
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(95,184,200,0.45)',
            padding: '0.1rem 0.4rem', borderRadius: '2px',
            fontVariant: 'small-caps', letterSpacing: '0.06em',
          }}>
            <span>❖</span>
            <span>{label}</span>
          </span>
        </HintTooltip>
      ))}
    </div>
  )
}
