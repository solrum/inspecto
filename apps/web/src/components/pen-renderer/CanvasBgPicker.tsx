'use client'

import React, { memo, useState, useRef, useEffect } from 'react'

const BG_PRESETS = [
  { color: '#EDEDF0', label: 'Light gray' },
  { color: '#FFFFFF', label: 'White' },
  { color: '#F5F5F5', label: 'Warm gray' },
  { color: '#1E1E1E', label: 'Dark' },
  { color: '#2C2C2C', label: 'Charcoal' },
  { color: '#0D1117', label: 'Midnight' },
]

export const CanvasBgPicker = memo(function CanvasBgPicker({
  value,
  onChange,
}: {
  value: string
  onChange?: (color: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        title="Canvas background"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 36,
          padding: '0 8px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface-elevated)',
          boxShadow: 'inset 0 0 0 1px var(--color-border), 0 2px 8px 0 var(--color-shadow)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 18,
          height: 18,
          borderRadius: 'var(--radius-sm)',
          backgroundColor: value,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
          flexShrink: 0,
        }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: 'var(--color-foreground-secondary)' }}>BG</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: 4,
          padding: 8,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface-elevated)',
          boxShadow: 'inset 0 0 0 1px var(--color-border), 0 4px 12px var(--color-shadow)',
          zIndex: 100,
          width: 200,
        }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--color-foreground-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
            Canvas Background
          </p>

          {/* Presets */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {BG_PRESETS.map((p) => (
              <button
                key={p.color}
                onClick={() => { onChange?.(p.color); setOpen(false) }}
                title={p.label}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: p.color,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: value === p.color
                    ? `inset 0 0 0 2px var(--color-primary), 0 0 0 1px rgba(0,0,0,0.1)`
                    : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                }}
              />
            ))}
          </div>

          {/* Custom color input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              style={{ width: 28, height: 28, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange?.(v)
              }}
              style={{
                flex: 1,
                height: 28,
                border: 'none',
                outline: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '0 8px',
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-foreground)',
                backgroundColor: 'var(--color-background)',
                boxShadow: 'inset 0 0 0 1px var(--color-border)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
})
