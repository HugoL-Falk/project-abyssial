import { useEffect } from 'react'
import { MenuButton } from './shared/MenuButton'
import { useGameStore } from '../state'
import { playSfx } from '../engine/audio'
import { GoldIcon, FollowersIcon, InfluenceIcon } from './game/ResourceIcons'

const TUTORIAL_BLESSINGS = [
  {
    id: 'biscuit_tin',
    title: 'The Biscuit Tin',
    icon: GoldIcon,
    flavourText: 'There is always a little left. You have learned not to ask where it comes from.',
  },
  {
    id: 'known_faces',
    title: 'Known Faces',
    icon: FollowersIcon,
    flavourText: 'They were there when you needed them. They did not ask to be thanked.',
  },
  {
    id: 'prior_standing',
    title: 'Prior Standing',
    icon: InfluenceIcon,
    flavourText: 'Your name was already known in certain rooms. You did not put it there.',
  },
]

export function TutorialCompleteScreen() {
  const unlockBlessingForGod = useGameStore(s => s.unlockBlessingForGod)
  const resetGame            = useGameStore(s => s.resetGame)
  const goToPhase            = useGameStore(s => s.goToPhase)
  const skipTutorial         = useGameStore(s => s.skipTutorial)

  // Unlock tutorial blessings on mount
  useEffect(() => {
    unlockBlessingForGod()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function beginFirstRun() {
    resetGame()
    goToPhase('menu')
  }

  return (
    <div className="screen-fade" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '3rem 1.75rem 3.5rem',
      background: 'var(--bg)',
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '0.55rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
          marginBottom: '0.6rem',
        }}>
          Summoning complete
        </div>
        <h2 style={{
          fontFamily: 'var(--title-font)',
          fontSize: '1.7rem',
          fontWeight: 400,
          color: 'var(--gold)',
          letterSpacing: '0.08em',
          margin: 0,
        }}>
          Olgreth Answers
        </h2>
        <p style={{
          marginTop: '1rem',
          fontSize: '0.78rem',
          color: 'var(--text)',
          lineHeight: 1.6,
          maxWidth: '280px',
        }}>
          The hollow thought has a shape. You know the shape now.
          The real work begins with the next ritual.
        </p>
      </div>

      {/* Blessings unlocked */}
      <div style={{ width: '100%' }}>
        <div style={{
          fontSize: '0.52rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
          textAlign: 'center',
          marginBottom: '0.5rem',
        }}>
          Blessings unlocked
        </div>
        <p style={{
          fontSize: '0.7rem', color: 'rgba(200,184,154,0.65)',
          fontStyle: 'italic', lineHeight: 1.55, textAlign: 'center',
          marginBottom: '0.85rem', padding: '0 0.5rem',
        }}>
          Before each run, you may choose one Blessing — a small advantage carried into the ritual. More are unlocked as you play.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {TUTORIAL_BLESSINGS.map(b => (
            <div key={b.id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--gold)', fontVariant: 'small-caps', letterSpacing: '0.06em' }}>
                  {b.title}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: 'var(--text)', opacity: 0.85 }}>
                  +1 <b.icon /> at start of run
                </span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.4 }}>
                {b.flavourText}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <MenuButton variant="primary" onClick={() => { playSfx('click'); beginFirstRun() }} style={{ width: '100%' }}>
          Begin your first ritual
        </MenuButton>
        <MenuButton variant="secondary" onClick={() => { playSfx('click'); skipTutorial(); resetGame(); goToPhase('menu') }} style={{ width: '100%', fontSize: '0.7rem', opacity: 0.7 }}>
          Return to menu
        </MenuButton>
      </div>

    </div>
  )
}
