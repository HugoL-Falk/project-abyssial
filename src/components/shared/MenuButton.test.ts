import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { MenuButton } from './MenuButton'

describe('MenuButton', () => {
  it('renders children via React.createElement', () => {
    const el = React.createElement(MenuButton, { variant: 'primary', children: 'Next' })
    expect(el.props.children).toBe('Next')
  })

  it('passes primary variant prop correctly', () => {
    const el = React.createElement(MenuButton, { variant: 'primary', children: 'Next' })
    expect(el.props.variant).toBe('primary')
  })

  it('calls onClick when provided', () => {
    const onClick = vi.fn()
    const el = React.createElement(MenuButton, { variant: 'secondary', onClick, children: 'Back' })
    ;(el.props.onClick as () => void)()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
