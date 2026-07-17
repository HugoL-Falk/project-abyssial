import React from 'react'

type Variant = 'primary' | 'secondary'

interface Props {
  variant: Variant
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  style?: React.CSSProperties
}

export function MenuButton({ variant, onClick, disabled, children, style }: Props) {
  return (
    <button
      className={variant === 'primary' ? 'btn-primary' : 'btn-secondary'}
      onClick={onClick}
      disabled={disabled}
      style={{
        // P20-M: both variants share size — primary vs secondary differ only by
        // colour/border weight (.btn-primary / .btn-secondary), not dimensions.
        minWidth: 160,
        fontSize: '1rem',
        padding: '0.6rem 1.2rem',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
