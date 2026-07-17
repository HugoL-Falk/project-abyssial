import { useEffect, useState, useRef } from 'react'
import { playSfx } from '../../../engine/audio'

// P19-13: close an open toggle-popover on any outside click. The opening click
// is shielded because the trigger button calls stopPropagation, so the document
// listener only ever sees outside clicks — which also reach the element beneath.
function useCloseOnOutsideClick(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return
    function onDocClick() { close() }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [open, close])
}

export function SurfaceChainCardTag({ tagKey }: { tagKey: number }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ bottom: number; top: number; left: number; useTop: boolean; maxHeight: number } | null>(null)
  useCloseOnOutsideClick(open, () => setOpen(false))

  const handleToggle = (ev: React.MouseEvent) => {
    ev.stopPropagation()
    playSfx('click')
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const useTop = r.top < window.innerHeight * 0.5
      setPos({
        bottom: window.innerHeight - r.top + 5,
        top: r.bottom + 5,
        left: Math.min(r.left, window.innerWidth - 220),
        useTop,
        maxHeight: useTop ? window.innerHeight - r.bottom - 15 : r.top - 15,
      })
    }
    setOpen(v => !v)
  }

  return (
    <span key={tagKey} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        style={{
          fontSize: '0.8rem', color: '#c89020', background: 'rgba(0,0,0,0.55)',
          padding: '0.1rem 0.4rem', borderRadius: '2px', fontVariant: 'small-caps',
          letterSpacing: '0.05em', border: `1px solid rgba(200,144,32,${open ? '0.65' : '0.30'})`,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
        ?
      </button>
      {open && pos && (
        <div style={{
          position: 'fixed', ...(pos.useTop ? { top: pos.top } : { bottom: pos.bottom }), left: pos.left, zIndex: 500, maxHeight: pos.maxHeight, overflowY: 'auto',
          background: 'rgba(6,4,2,0.97)', border: '1px solid var(--border)',
          padding: '0.3rem 0.55rem', borderRadius: '2px', whiteSpace: 'nowrap',
          fontSize: '0.75rem', color: 'rgba(200,185,155,0.85)', pointerEvents: 'none',
        }}>
          Surfaces next God Path card
        </div>
      )}
    </span>
  )
}

export function AdvanceGodPathTag({ tagKey }: { tagKey: number }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ bottom: number; top: number; left: number; useTop: boolean; maxHeight: number } | null>(null)
  useCloseOnOutsideClick(open, () => setOpen(false))

  const handleToggle = (ev: React.MouseEvent) => {
    ev.stopPropagation()
    playSfx('click')
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const useTop = r.top < window.innerHeight * 0.5
      setPos({
        bottom: window.innerHeight - r.top + 5,
        top: r.bottom + 5,
        left: Math.min(r.left, window.innerWidth - 220),
        useTop,
        maxHeight: useTop ? window.innerHeight - r.bottom - 15 : r.top - 15,
      })
    }
    setOpen(v => !v)
  }

  return (
    <span key={tagKey} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        style={{
          fontSize: '0.8rem', color: '#c89020', background: 'rgba(0,0,0,0.55)',
          padding: '0.1rem 0.4rem', borderRadius: '2px', fontVariant: 'small-caps',
          letterSpacing: '0.05em', border: `1px solid rgba(200,144,32,${open ? '0.65' : '0.30'})`,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
        ?
      </button>
      {open && pos && (
        <div style={{
          position: 'fixed', ...(pos.useTop ? { top: pos.top } : { bottom: pos.bottom }), left: pos.left, zIndex: 500, maxHeight: pos.maxHeight, overflowY: 'auto',
          background: 'rgba(6,4,2,0.97)', border: '1px solid var(--border)',
          padding: '0.3rem 0.55rem', borderRadius: '2px', whiteSpace: 'nowrap',
          fontSize: '0.75rem', color: 'rgba(200,185,155,0.85)', pointerEvents: 'none',
        }}>
          Advances the God Path
        </div>
      )}
    </span>
  )
}
