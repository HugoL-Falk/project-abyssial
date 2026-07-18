// Tutorial goal splash — shown once at the start of a tutorial run.
// Explains the objective before the player draws their first card.

export function TutorialSplash({ onBegin }: { onBegin: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 220,
        background: 'rgba(4,2,1,0.97)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.6rem',
        fontFamily: 'var(--ui-font)',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {/* Gold top border accent */}
      <div style={{
        position: 'absolute',
        top: 0, left: '8%', right: '8%',
        height: '1px',
        background: 'linear-gradient(to right, transparent, rgba(200,144,32,0.5), transparent)',
      }} />

      <div style={{
        fontSize: '1.05rem',
        fontFamily: 'var(--title-font)',
        letterSpacing: '0.06em',
        color: 'rgba(200,144,32,0.82)',
        marginBottom: '1.4rem',
      }}>
        Before you begin
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
        maxWidth: '320px',
        width: '100%',
        marginBottom: '2rem',
      }}>
        {[
          'Draw cards from the pile. Each one asks something of you. Choose how to respond.',
          'Your resources (gold, followers, influence, dread) shift with every choice. Let any reach a point of collapse, and the ritual ends.',
          'Six ritual stages are needed in a normal run. This tutorial shows two. You will recognise them when they arrive.',
        ].map((line, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
            <span style={{
              color: 'rgba(200,144,32,0.55)',
              fontSize: '0.85rem',
              marginTop: '0.1rem',
              flexShrink: 0,
            }}>
              {i + 1}.
            </span>
            <p style={{
              margin: 0,
              fontSize: '0.78rem',
              color: 'rgba(200,185,155,0.8)',
              lineHeight: 1.6,
              fontStyle: 'italic',
            }}>
              {line}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={onBegin}
        style={{
          background: 'transparent',
          border: '1px solid rgba(200,144,32,0.4)',
          color: 'rgba(200,185,155,0.85)',
          fontSize: '0.72rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '0.55rem 2rem',
          cursor: 'pointer',
          fontFamily: 'var(--ui-font)',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget
          el.style.borderColor = 'rgba(200,144,32,0.75)'
          el.style.color = 'rgba(220,200,155,1)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget
          el.style.borderColor = 'rgba(200,144,32,0.4)'
          el.style.color = 'rgba(200,185,155,0.85)'
        }}
      >
        Begin
      </button>

      {/* Gold bottom border accent */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: '8%', right: '8%',
        height: '1px',
        background: 'linear-gradient(to right, transparent, rgba(200,144,32,0.5), transparent)',
      }} />
    </div>
  )
}
