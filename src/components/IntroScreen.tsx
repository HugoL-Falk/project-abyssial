import { useGameStore } from '../state'
import { MenuButton } from './shared/MenuButton'
import { playSfx } from '../engine/audio'

export function IntroScreen() {
  const goToPhase     = useGameStore(s => s.goToPhase)
  const startTutorial = useGameStore(s => s.startTutorial)

  return (
    <div className="screen-fade" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: '2rem 1.75rem 3rem',
    }}>

      {/* Tinted modal */}
      <div style={{
        background: 'rgba(8, 6, 3, 0.82)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.75rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>

        {/* Body text */}
        <div style={{
          fontSize: '0.82rem',
          color: 'var(--text)',
          lineHeight: 1.75,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}>
          <p style={{ margin: 0 }}>
            You have been given responsibility for a cult.
          </p>
          <p style={{ margin: 0 }}>
            The objective is straightforward: summon one of the Ancient Ones — entities that
            predate recorded memory and will, in all likelihood, render most of what you know
            irrelevant. This is considered a success condition.
          </p>
          <p style={{ margin: 0 }}>
            Between now and that moment, you will manage five resources. Gold, Followers, and
            Influence sustain the operation. Dread complicates it. Relics, when you find them, help.
          </p>
          <p style={{ margin: 0 }}>
            The Ancient Ones do not forgive poorly run cults. They simply do not notice them.
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <MenuButton variant="secondary" style={{ flex: 1 }} onClick={() => { playSfx('click'); goToPhase('menu') }}>
            Back
          </MenuButton>
          <MenuButton variant="primary" style={{ flex: 1 }} onClick={() => { playSfx('click'); startTutorial() }}>
            Next
          </MenuButton>
        </div>

      </div>
    </div>
  )
}
