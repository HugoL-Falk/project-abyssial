import { useState } from 'react'
import { captureFeedback } from '../lib/telemetry'

interface Props {
  triggeredBy: 'end_screen' | 'menu_button'
  godPath?:    string
  week?:       number
  cardId?:     string
  onDone: () => void
}

export function FeedbackForm({ triggeredBy, godPath, week, cardId, onDone }: Props) {
  const [text, setText]           = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (text.trim()) captureFeedback(text.trim(), triggeredBy, { godPath, week, cardId })
    setSubmitted(true)
    setTimeout(onDone, 1200)
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--gold)', fontFamily: 'var(--ui-font)', fontSize: '0.9rem', letterSpacing: '0.08em' }}>
        Thanks for the feedback.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.75rem 0' }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="Anything that felt broken, confusing, or great?"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          fontFamily: 'var(--ui-font)',
          fontSize: '0.85rem',
          padding: '0.6rem 0.75rem',
          resize: 'none',
          borderRadius: '2px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleSubmit}
          className="btn-primary"
          style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem' }}
        >
          Submit
        </button>
        <button
          onClick={onDone}
          className="btn-secondary"
          style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem' }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}
