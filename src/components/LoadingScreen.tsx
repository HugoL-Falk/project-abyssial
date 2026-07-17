interface Props {
  progress:  number        // 0–1
  fadeOut:   boolean       // triggers opacity fade to 0
  onFadeEnd: () => void    // called when fade completes → parent unmounts
}

export function LoadingScreen({ progress, fadeOut, onFadeEnd }: Props) {
  return (
    <div
      onTransitionEnd={(e) => { if (e.propertyName === 'opacity') onFadeEnd() }}
      style={{
        position:        'absolute',
        inset:           0,
        zIndex:          999,
        background:      'var(--bg)',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             '1.25rem',
        padding:         '0 2rem',
        opacity:         fadeOut ? 0 : 1,
        transition:      'opacity 0.6s ease',
        pointerEvents:   fadeOut ? 'none' : 'auto',
      }}
    >
      <h1 style={{
        fontFamily:    'var(--title-font)',
        fontSize:      '1.6rem',
        fontWeight:    400,
        letterSpacing: '0.15em',
        color:         'var(--text)',
        margin:        0,
        textAlign:     'center',
      }}>
        Project Abyssial
      </h1>

      <p style={{
        fontFamily: 'var(--ui-font)',
        fontSize:   '0.85rem',
        fontStyle:  'italic',
        color:      'var(--text-dim)',
        margin:     0,
      }}>
        The ritual assembles.
      </p>

      {/* Progress bar */}
      <div style={{
        width:      '100%',
        height:     '2px',
        background: 'var(--border)',
      }}>
        <div style={{
          height:     '100%',
          width:      `${Math.round(progress * 100)}%`,
          background: 'var(--color-gold-bright)',
          transition: 'width 0.2s ease',
        }} />
      </div>
    </div>
  )
}
