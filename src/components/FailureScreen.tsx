import { useState } from 'react'
import { MenuButton } from './shared/MenuButton'
import { FeedbackForm } from './FeedbackForm'
import { useGameStore } from '../state'
import { playSfx } from '../engine/audio'
import { ReflectionScreen } from './ReflectionScreen'
import { GOD_TINT_DEFEAT } from '../data/godTints'

const GOD_PATH_NAME: Partial<Record<string, string>> = {
  yha_nthlei:    "Y'ha-nthlei",
  nyarlathotep:  'Nyarlathotep',
  shub_niggurath:'Shub-Niggurath',
}

export function FailureScreen() {
  const [showReflection, setShowReflection] = useState(false)
  const [feedbackDone, setFeedbackDone]     = useState(false)

  const failureReason   = useGameStore(s => s.failureReason)
  const turnCount       = useGameStore(s => s.turnCount)
  const godPathProgress = useGameStore(s => s.godPathProgress)
  const runConfig       = useGameStore(s => s.runConfig)
  const reshuffleCount  = useGameStore(s => s.reshuffleCount)

  // Early return MUST come after all hook calls (Rules of Hooks) —
  // returning before the useGameStore hooks crashed the tree on Continue (P19-30).
  if (showReflection) return <ReflectionScreen />

  const godName = runConfig ? (GOD_PATH_NAME[runConfig.godPath] ?? 'the ancient one') : 'the ancient one'
  const godTint = runConfig ? (GOD_TINT_DEFEAT[runConfig.godPath] ?? 'transparent') : 'transparent'

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
        background: `radial-gradient(ellipse at 50% 30%, ${godTint} 0%, transparent 60%), radial-gradient(ellipse at 50% 60%, rgba(80,10,10,0.35) 0%, var(--bg) 70%)`,
      }}
    >
      {/* Divider line top */}
      <div style={{ width: '1px', height: '60px', background: 'linear-gradient(to bottom, transparent, var(--red))', marginBottom: '1.5rem' }} />

      <div style={{ textAlign: 'center', maxWidth: '300px' }}>
        <div style={{ fontFamily: 'var(--title-font)', fontSize: '2rem', fontWeight: 400, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.15, marginBottom: '1.2rem', textShadow: '0 2px 28px rgba(0,0,0,0.9)' }}>
          You Succumb
        </div>

        <p style={{
          color: 'rgba(218, 198, 162, 0.95)',
          fontStyle: 'italic',
          fontSize: '1.08rem',
          lineHeight: 1.8,
          marginBottom: '2rem',
          textShadow: '0 1px 10px rgba(0,0,0,0.9)',
        }}>
          {failureReason?.message ?? 'The ritual faltered. The dark retreated. Not in mercy.'}
        </p>

        {/* Run stats. P20-L: divider row centred as one unit; stat labels bumped
            from 0.52rem to option-flavour weight so "cards drawn" / "{god} rites"
            read clearly instead of as fine print. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', width: '100%', maxWidth: '240px', margin: '0.5rem auto 0' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', color: 'rgba(218,198,162,0.9)' }}>{turnCount}</div>
            <div style={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'rgba(200,180,148,0.72)', letterSpacing: '0.08em' }}>cards drawn</div>
          </div>
          <div style={{ width: '1px', height: '44px', background: 'rgba(200,180,148,0.22)', flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', color: 'rgba(218,198,162,0.9)' }}>
              {godPathProgress}<span style={{ fontSize: '0.8rem', opacity: 0.45 }}>/6</span>
            </div>
            <div style={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'rgba(200,180,148,0.72)', letterSpacing: '0.08em' }}>{godName} rites</div>
          </div>
        </div>
      </div>

      {/* Divider line bottom */}
      <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, var(--red), transparent)', marginTop: '1.5rem', marginBottom: '1rem' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '260px' }}>
        {!feedbackDone && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Leave feedback
            </div>
            <FeedbackForm
              triggeredBy="end_screen"
              godPath={runConfig?.godPath}
              week={reshuffleCount + 1}
              onDone={() => setFeedbackDone(true)}
            />
          </div>
        )}
        <MenuButton variant="primary" onClick={() => { playSfx('click'); setShowReflection(true) }}>
          Continue
        </MenuButton>
      </div>
    </div>
  )
}
