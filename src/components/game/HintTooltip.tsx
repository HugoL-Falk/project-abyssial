import { useEffect, useId, useRef, useState } from 'react'
import { playSfx } from '../../engine/audio'

// P20-H: shared accent → border colour, mirrors the +card/−card chip palette
// (StructuralTag.tsx) so tooltips read as belonging to the same system.
const ACCENT_BORDER: Record<'default' | 'green' | 'red' | 'gold' | 'blue', string> = {
  default: 'rgba(155,123,212,0.45)',
  green: 'rgba(122,173,85,0.55)',
  red: 'rgba(220,80,80,0.55)',
  gold: 'rgba(200,144,32,0.55)',
  blue: 'rgba(95,184,200,0.55)',
}

/**
 * Tap-to-toggle hint bubble. The caller supplies its own trigger glyph as
 * `children`; this component owns only the popover behaviour and styling.
 * Touch-first: opens/closes on click (works for tap), closes on outside
 * click or when another tooltip opens. No card-preview side effect.
 *
 * Single-open guarantee: a module-scoped notifier broadcasts the id of the
 * tooltip that just opened; every other mounted instance closes itself when
 * it receives an id that is not its own.
 */

// ─── Module-scoped single-open notifier ──────────────────────────────────────

type Listener = (openedId: string) => void
const listeners = new Set<Listener>()

function notifyOpen(id: string) {
  listeners.forEach((fn) => fn(id))
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HintTooltip({
  text,
  children,
  ariaLabel,
  accent = 'default',
}: {
  text: string
  children: React.ReactNode
  ariaLabel?: string
  accent?: 'default' | 'green' | 'red' | 'gold' | 'blue'
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ left: number; bottom?: number; top?: number } | null>(null)
  const id = useId()

  // Close when another tooltip opens
  useEffect(() => {
    const unsub = subscribe((openedId) => {
      if (openedId !== id) setOpen(false)
    })
    return unsub
  }, [id])

  // Close on outside click when open
  useEffect(() => {
    if (!open) return
    function onDocClick(ev: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [open])

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-label={ariaLabel ?? text}
        aria-expanded={open}
        onClick={(ev) => {
          ev.stopPropagation()
          playSfx('click')
          if (!open && wrapRef.current) {
            // P20-H: viewport-clamped fixed positioning — prevents the bubble
            // clipping off the left/right edge near narrow option rows.
            const r = wrapRef.current.getBoundingClientRect()
            const maxW = 288 // px, matches maxWidth below
            const useTop = r.top < window.innerHeight * 0.5
            const clampedLeft = Math.min(Math.max(8, r.left + r.width / 2 - maxW / 2), window.innerWidth - maxW - 8)
            setPos(useTop
              ? { left: clampedLeft, top: r.bottom + 4 }
              : { left: clampedLeft, bottom: window.innerHeight - r.top + 4 }
            )
          }
          setOpen((o) => {
            const next = !o
            if (next) notifyOpen(id)
            return next
          })
        }}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          font: 'inherit',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {children}
      </button>
      {open && pos && (
        <span
          role="tooltip"
          style={{
            position: 'fixed',
            left: pos.left,
            ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
            zIndex: 500,
            whiteSpace: 'normal',
            width: 'max-content',
            maxWidth: '288px',
            fontSize: '0.72rem',
            fontFamily: 'var(--ui-font)',
            color: 'rgba(230,220,200,0.95)',
            background: 'rgba(0,0,0,0.85)',
            border: `1px solid ${ACCENT_BORDER[accent]}`,
            borderRadius: '2px',
            padding: '0.35rem 0.55rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
