import { useState } from 'react'

const SESSION_KEY = 'playtest_unlocked'

function isUnlocked(): boolean {
  const required = import.meta.env.VITE_PLAYTEST_PASSWORD as string | undefined
  if (!required) return true // no env var = no gate
  return sessionStorage.getItem(SESSION_KEY) === required
}

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [input, setInput]       = useState('')
  const [error, setError]       = useState(false)

  if (unlocked) return <>{children}</>

  function attempt() {
    const required = import.meta.env.VITE_PLAYTEST_PASSWORD as string
    if (input === required) {
      sessionStorage.setItem(SESSION_KEY, required)
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div style={{
      height: '100dvh', maxWidth: '480px', margin: '0 auto',
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1.2rem',
      padding: '2rem',
    }}>
      <div style={{ fontFamily: 'var(--title-font)', fontSize: '1.1rem', color: 'var(--gold)', letterSpacing: '0.1em', textAlign: 'center' }}>
        Project Abyssial
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Playtest Access
      </div>
      <input
        type="password"
        value={input}
        onChange={e => { setInput(e.target.value); setError(false) }}
        onKeyDown={e => e.key === 'Enter' && attempt()}
        placeholder="Password"
        style={{
          background: 'var(--surface)', border: `1px solid ${error ? 'var(--red-bright)' : 'var(--border)'}`,
          color: 'var(--text)', fontFamily: 'var(--ui-font)', fontSize: '1rem',
          padding: '0.7rem 1rem', width: '100%', boxSizing: 'border-box', borderRadius: '2px',
          textAlign: 'center', letterSpacing: '0.2em',
        }}
        autoFocus
      />
      {error && (
        <div style={{ fontSize: '0.78rem', color: 'var(--red-bright)', letterSpacing: '0.08em' }}>
          Incorrect password.
        </div>
      )}
      <button onClick={attempt} className="btn-primary" style={{ width: '100%' }}>
        Enter
      </button>
    </div>
  )
}
