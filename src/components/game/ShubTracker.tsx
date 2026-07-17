import { useGameStore } from '../../state'

const VICTORY_TARGET = 3

// Hexagonal pip via CSS clip-path (flat-top hexagon)
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

function HexPip({ filled }: { filled: boolean }) {
  return (
    <div
      style={{
        width: '9px',
        height: '9px',
        clipPath: HEX_CLIP,
        background: filled ? '#9b6dbf' : '#2a1e42',
        filter: filled ? 'drop-shadow(0 0 3px rgba(112,64,160,0.5))' : undefined,
        flexShrink: 0,
      }}
    />
  )
}

export function ShubTracker() {
  const godPath    = useGameStore(s => s.runConfig?.godPath)
  const theChanged = useGameStore(s => s.resources.theChanged)

  if (godPath !== 'shub_niggurath') return null

  const filled = Math.min(theChanged, VICTORY_TARGET)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '3px 14px',
        background: '#100e1a',
        borderBottom: '1px solid #221830',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: '#6a4898',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {'\u{1F70F}'} The Changed
      </span>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        {Array.from({ length: VICTORY_TARGET }, (_, i) => (
          <HexPip key={i} filled={i < filled} />
        ))}
      </div>
      <span style={{ fontSize: '10px', color: '#5a4080' }}>
        {theChanged} / {VICTORY_TARGET}
      </span>
    </div>
  )
}
