import { useState } from 'react'
import { MenuButton } from './shared/MenuButton'
import { FeedbackForm } from './FeedbackForm'
import { useGameStore } from '../state'
import { playSfx } from '../engine/audio'
import { GOD_PATH_NAMES } from '../data'
import type { GodPath } from '../types'

// ─── Summoning descriptions — full victory ─────────────────────────────────────

const SUMMONING_TEXT: Partial<Record<GodPath, string>> = {
  yha_nthlei: `The ritual is complete. The waters beneath the city stir as they have not stirred in ten thousand years. They come not as an invasion but as a reclamation; the deep places remember what the surface has forgotten. Y'ha-nthlei rises, and the congregation disperses into the tide, each of them smiling, each of them changed. You stand at the threshold as the first wave breaks across the world. You do not step back.`,

  nyarlathotep: `The last transmission goes out at midnight. It carries no words, only a frequency that human hearing cannot parse, but the mind receives regardless. By morning, half the city has stopped sleeping. They gather in the squares and alleys, tuned to something you can no longer hear. Nyarlathotep does not arrive. It was always here. You simply opened the channel. The signal does not stop when you do.`,

  shub_niggurath: `The thing beneath the grove has been patient. Longer than the city, longer than the road that cuts through where the old forest stood. The congregation offered themselves at the roots, and the roots accepted. They are not dead. They are distributed. You feel the first tendril at the edge of your thoughts, not threatening, merely curious. Shub-Niggurath does not conquer. It absorbs. The distinction, you are finding, matters less than you expected.`,
}

// ─── Summoning descriptions — partial victory ──────────────────────────────────

const PARTIAL_SUMMONING_TEXT: Partial<Record<GodPath, string>> = {
  yha_nthlei: `The waters stirred, but did not rise. Something beneath the reef acknowledged the rite, not with welcome, but with recognition. The congregation scattered before the tide finished turning. Y'ha-nthlei is aware of you now. That is not the same as summoned. You are left standing at the waterline, uncertain which outcome you were hoping for.`,

  nyarlathotep: `The signal reached them, but thinly. Half the city paused, a held breath, a missed step, then continued. Nyarlathotep received the transmission. It did not reply. Somewhere in the frequency you left open, something is still listening. You cannot determine whether it is the god or only the echo of its attention.`,

  shub_niggurath: `The grove accepted the offering, but the roots did not extend as far as they should. The forest is a little larger this morning. The congregation returned mostly unchanged. One of them has stopped speaking; they seem content with this. The Root acknowledges what was given. It will remember what remains outstanding.`,
}

// ─── God-specific victory art (final card art per path) ──────────────────────

const GOD_VICTORY_ART: Partial<Record<string, string>> = {
  yha_nthlei:    '/cards/yha_nthlei_6.jpeg',
  nyarlathotep:  '/cards/nyarlathotep_6.jpeg',
  shub_niggurath:'/cards/shub_niggurath_6.jpeg',
}

// ─── God-specific tints ───────────────────────────────────────────────────────

const GOD_TINT: Partial<Record<string, string>> = {
  yha_nthlei:    'rgba(8,18,80,0.55)',
  nyarlathotep:  'rgba(48,8,88,0.55)',
  shub_niggurath:'rgba(8,48,18,0.55)',
}

// ─── Victory screen ────────────────────────────────────────────────────────────

export function VictoryScreen() {
  const runConfig           = useGameStore(s => s.runConfig)
  const resources           = useGameStore(s => s.resources)
  const turnCount           = useGameStore(s => s.turnCount)
  const reshuffleCount      = useGameStore(s => s.reshuffleCount)
  const partialVictoryGod   = useGameStore(s => s.partialVictoryGod)
  const unlockBlessingForGod = useGameStore(s => s.unlockBlessingForGod)
  const resetGame           = useGameStore(s => s.resetGame)
  const goToPhase           = useGameStore(s => s.goToPhase)

  const [phase, setPhase]               = useState<'story' | 'summary'>('story')
  const [feedbackDone, setFeedbackDone] = useState(false)

  const isPartial = partialVictoryGod !== null
  const godPath = runConfig?.godPath
  const tint    = godPath ? (GOD_TINT[godPath] ?? 'rgba(40,28,5,0.8)') : 'rgba(40,28,5,0.8)'
  const artSrc  = godPath ? (GOD_VICTORY_ART[godPath] ?? null) : null

  const summoningText = godPath
    ? (isPartial ? PARTIAL_SUMMONING_TEXT[godPath] : SUMMONING_TEXT[godPath])
    : ''

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: artSrc
          ? `radial-gradient(ellipse at 50% 40%, ${tint} 0%, rgba(18,15,10,0.93) 70%), url(${artSrc}) center top / cover no-repeat`
          : `radial-gradient(ellipse at 50% 40%, ${tint} 0%, var(--bg) 70%)`,
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* Corner vignette — masks watermarks in art image */}
      {artSrc && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(10,6,2,0.92) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}

      {/* Summoning text — story phase */}
      {phase === 'story' && (
        <div className="screen-slow" style={{ padding: '2.5rem 1.75rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '0.58rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: '1rem' }}>
            {isPartial ? 'The Attempt Was Made' : 'It Is Done'}
          </div>
          {godPath && (
            <div style={{ fontFamily: 'var(--title-font)', fontWeight: 400, color: 'var(--gold-bright)', fontSize: '1.7rem', letterSpacing: '0.08em', marginBottom: '1.25rem' }}>
              {GOD_PATH_NAMES[godPath]}
            </div>
          )}
          <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.84rem', lineHeight: 1.75 }}>
            {summoningText}
          </p>
          <button
            onClick={() => { playSfx('click'); unlockBlessingForGod(); setPhase('summary') }}
            style={{ marginTop: '2rem', alignSelf: 'center', background: 'transparent', border: '1px solid rgba(212,160,16,0.35)', color: 'var(--text-dim)', fontSize: '0.68rem', letterSpacing: '0.14em', padding: '0.5rem 1.4rem', cursor: 'pointer', fontFamily: 'var(--ui-font)', textTransform: 'uppercase' }}
          >
            Continue
          </button>
        </div>
      )}

      {/* Run summary */}
      {phase === 'summary' && (
        <div className="screen-slide" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '3rem 1.75rem 3.5rem',
          position: 'relative',
          zIndex: 2,
        }}>

          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.6rem' }}>
              {isPartial ? 'The Attempt Was Made' : 'It Is Done'}
            </div>
            {godPath && (
              <h2 style={{ fontFamily: 'var(--title-font)', fontSize: '1.7rem', fontWeight: 400, color: 'var(--gold)', letterSpacing: '0.08em', margin: 0 }}>
                {GOD_PATH_NAMES[godPath]}
              </h2>
            )}
            <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.6 }}>
              {isPartial ? 'A record of an incomplete rite.' : 'A record of what was spent.'}
            </p>
          </div>

          {/* Stats */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '1.5rem', rowGap: '0.5rem', justifyItems: 'center' }}>
              {[
                ['Cards drawn',         turnCount],
                ['Reshuffles survived', reshuffleCount],
                ['Gold',                resources.gold],
                ['Followers',           resources.followers],
                ['Influence',           resources.influence],
                ['Dread',               resources.dread],
                ['Relics',              resources.relics],
              ].map(([label, val]) => (
                <div key={String(label)} style={{ display: 'contents' }}>
                  <span style={{ color: 'var(--text-dim)', textAlign: 'right', fontSize: '1rem' }}>{label}</span>
                  <span style={{ color: 'var(--gold)', textAlign: 'left', fontSize: '1rem' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback + actions */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {!feedbackDone && (
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.4rem' }}>
                  Leave feedback
                </div>
                <FeedbackForm
                  triggeredBy="end_screen"
                  godPath={godPath}
                  week={reshuffleCount + 1}
                  onDone={() => setFeedbackDone(true)}
                />
              </div>
            )}
            <MenuButton variant="primary" style={{ width: '100%' }} onClick={() => { playSfx('click'); resetGame(); goToPhase('godPathSelect') }}>
              New Run
            </MenuButton>
            <MenuButton variant="secondary" style={{ width: '100%', textAlign: 'center' }} onClick={() => { playSfx('click'); resetGame() }}>
              Main Menu
            </MenuButton>
          </div>

        </div>
      )}

    </div>
  )
}
