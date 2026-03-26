'use client'

import React, { memo, useState, useRef, useEffect, useCallback } from 'react'

/**
 * ZoomControl — engine-accurate styles from design.
 *
 * Engine CSS for "Zoom Controls" node:
 *   bg=var(--color-surface-elevated), rounded=var(--radius-md), padding=[6,8], gap=4
 *   stroke inside 1px → boxShadow: inset 0 0 0 1px var(--color-border)
 *   effect: shadow blur=8 color=var(--color-shadow) offset y=2
 *   Combined: boxShadow = inset 0 0 0 1px var(--color-border), 0 2px 8px 0 var(--color-shadow)
 *
 *   Each +/- button: 24x24, rounded=var(--radius-sm), justify=center, align=center
 *   Percent text: Inter 12px 500, color=var(--color-foreground)
 */

const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200] as const
const MIN_ZOOM = 5
const MAX_ZOOM = 400
const ZOOM_STEP = 10

interface ZoomControlProps {
  zoomDisplay: number
  setScale: (scale: number) => void
  fitAll?: () => void
  dropUp?: boolean
}

export const ZoomControl = memo(function ZoomControl({
  zoomDisplay,
  setScale,
  fitAll,
  dropUp = true,
}: ZoomControlProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setInputValue(String(zoomDisplay))
  }, [zoomDisplay, open])

  useEffect(() => {
    if (!open) return
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const applyValue = useCallback((val: string) => {
    const num = parseInt(val, 10)
    if (!isNaN(num)) setScale(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, num)) / 100)
  }, [setScale])

  const handleOpen = useCallback(() => {
    setOpen(true)
    setInputValue(String(zoomDisplay))
    setTimeout(() => inputRef.current?.select(), 0)
  }, [zoomDisplay])

  const stepZoom = useCallback((delta: number) => {
    setScale(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomDisplay + delta)) / 100)
  }, [zoomDisplay, setScale])

  const dropdownPos = dropUp
    ? { bottom: '100%', marginBottom: 4 } as const
    : { top: '100%', marginTop: 4 } as const

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Main control row — matches design Zoom Controls node exactly */}
      <div style={z.controlRow}>
        <button onClick={() => stepZoom(-ZOOM_STEP)} style={z.stepBtn} title="Zoom out">−</button>

        {open ? (
          <div style={z.inputWrap}>
            <input
              ref={inputRef}
              type="number"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { applyValue(inputValue); setOpen(false) }
                else if (e.key === 'Escape') setOpen(false)
              }}
              onBlur={() => applyValue(inputValue)}
              style={z.input}
              autoFocus
            />
            <span style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>%</span>
          </div>
        ) : (
          <button onClick={handleOpen} style={z.display}>{zoomDisplay}%</button>
        )}

        <button onClick={() => stepZoom(ZOOM_STEP)} style={z.stepBtn} title="Zoom in">+</button>
      </div>

      {/* Dropdown presets */}
      {open && (
        <div style={{ ...z.dropdown, ...dropdownPos }}>
          {ZOOM_PRESETS.map((pct) => {
            const active = Math.abs(zoomDisplay - pct) < 3
            return (
              <button
                key={pct}
                onClick={() => { setScale(pct / 100); setOpen(false) }}
                style={{
                  ...z.option,
                  backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--color-foreground)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {pct}%
              </button>
            )
          })}
          {fitAll && (
            <>
              <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '4px 0' }} />
              <button onClick={() => { fitAll(); setOpen(false) }} style={z.option}>Fit all</button>
            </>
          )}
        </div>
      )}
    </div>
  )
})

const z = {
  // Main row: bg=surface-elevated, rounded=radius-md, padding=[6,8], gap=4
  // shadow = inset 0 0 0 1px var(--color-border), 0 2px 8px 0 var(--color-shadow)
  controlRow: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    padding: '6px 8px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface-elevated)',
    boxShadow: 'inset 0 0 0 1px var(--color-border), 0 2px 8px 0 var(--color-shadow)',
    border: 'none',
  },
  // +/- button: 24x24, rounded=radius-sm
  stepBtn: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: 24,
    height: 24,
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer' as const,
    fontFamily: 'Inter, sans-serif',
    fontSize: 16,
    color: 'var(--color-foreground-secondary)',
    flexShrink: 0,
  },
  // % display: Inter 12px 500
  display: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 44,
    height: 24,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer' as const,
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    fontWeight: 500 as const,
    color: 'var(--color-foreground)',
    padding: '0 4px',
  },
  inputWrap: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    minWidth: 44,
    height: 24,
    padding: '0 4px',
  },
  input: {
    width: 30,
    border: 'none',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    fontWeight: 500 as const,
    padding: 0,
    textAlign: 'right' as const,
    background: 'transparent',
    color: 'var(--color-foreground)',
    MozAppearance: 'textfield' as const,
    WebkitAppearance: 'none' as any,
    appearance: 'textfield' as const,
    margin: 0,
  },
  dropdown: {
    position: 'absolute' as const,
    right: 0,
    backgroundColor: 'var(--color-surface-elevated)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'inset 0 0 0 1px var(--color-border), 0 4px 12px var(--color-shadow)',
    padding: '4px 0',
    zIndex: 100,
    minWidth: 100,
  },
  option: {
    display: 'block' as const,
    width: '100%',
    textAlign: 'left' as const,
    padding: '6px 12px',
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    border: 'none',
    cursor: 'pointer' as const,
    background: 'transparent',
    color: 'var(--color-foreground)',
  },
} as const
