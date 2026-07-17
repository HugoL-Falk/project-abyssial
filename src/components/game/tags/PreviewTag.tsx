export function PreviewTag({ text }: { text: string }) {
  // Authored thematic override for structural deck-change chips.
  // Border-only pill, muted grey-violet — distinct from filled resource chips.
  return (
    <span style={{
      fontSize: '0.8rem',
      color: 'rgba(200,185,200,0.85)',
      border: '1px solid rgba(160,140,180,0.45)',
      padding: '0.15rem 0.45rem',
      borderRadius: '2px',
      fontFamily: 'inherit',
    }}>
      {text}
    </span>
  )
}
