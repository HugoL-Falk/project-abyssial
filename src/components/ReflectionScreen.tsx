import { useGameStore } from '../state'
import { MenuButton } from './shared/MenuButton'
import { playSfx } from '../engine/audio'
import { GOD_TINT_DEFEAT } from '../data/godTints'

export function ReflectionScreen() {
  const runStats  = useGameStore(s => s.runStats)
  const runConfig = useGameStore(s => s.runConfig)
  const resetGame = useGameStore(s => s.resetGame)
  const goToPhase = useGameStore(s => s.goToPhase)

  const godTint = runConfig ? (GOD_TINT_DEFEAT[runConfig.godPath] ?? 'transparent') : 'transparent'

  const rows: { key: string; text: string }[] = []
  if (runStats.prepLockedSkipped > 0) {
    const n = runStats.prepLockedSkipped
    rows.push({ key: 'prep', text: `${n} ${n === 1 ? 'option stayed' : 'options stayed'} hidden behind preparations` })
  }
  if (runStats.affordLockedSkipped > 0) {
    const n = runStats.affordLockedSkipped
    rows.push({ key: 'afford', text: `${n} ${n === 1 ? 'path that closed' : 'paths that closed'} before you` })
  }
  for (const path of runStats.closedPaths) {
    rows.push({ key: `path-${path}`, text: `1 path closed: "${path}"` })
  }

  return (
    <div
      className="screen-slow"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2.5rem 2rem',
        background: `radial-gradient(ellipse at 50% 30%, ${godTint} 0%, transparent 60%), radial-gradient(ellipse at 50% 60%, rgba(80,10,10,0.20) 0%, var(--bg) 70%)`,
      }}
    >
      <div style={{ width: '1px', height: '60px', background: 'linear-gradient(to bottom, transparent, var(--red))', marginBottom: '1.5rem' }} />

      <div style={{ textAlign: 'center', maxWidth: '320px' }}>
        <div style={{ fontFamily: 'var(--title-font)', fontWeight: 400, fontSize: '1.7rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.15, marginBottom: '1.6rem', textShadow: '0 2px 28px rgba(0,0,0,0.9)' }}>
          What You Missed
        </div>

        {rows.length === 0 ? (
          <p style={{
            color: 'rgba(218,198,162,0.88)',
            fontStyle: 'italic',
            fontSize: '0.95rem',
            lineHeight: 1.8,
            textShadow: '0 1px 10px rgba(0,0,0,0.9)',
          }}>
            You walked every road that opened to you.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
            {rows.map(r => (
              <li
                key={r.key}
                style={{
                  color: 'rgba(218,198,162,0.92)',
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  marginBottom: '0.6rem',
                  textShadow: '0 1px 10px rgba(0,0,0,0.9)',
                }}
              >
                <span style={{ marginRight: '0.6rem', color: 'rgba(218,198,162,0.6)' }}>◌</span>
                {r.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, var(--red), transparent)', margin: '2rem 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '180px' }}>
        <MenuButton variant="primary" onClick={() => { playSfx('click'); resetGame(); goToPhase('godPathSelect') }}>
          New Run
        </MenuButton>
        <MenuButton variant="secondary" style={{ textAlign: 'center' }} onClick={() => { playSfx('click'); resetGame() }}>
          Main Menu
        </MenuButton>
      </div>
    </div>
  )
}
