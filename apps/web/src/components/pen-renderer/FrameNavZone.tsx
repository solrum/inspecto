'use client'

import React from 'react'

export function FrameNavZone({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const isLeft = side === 'left'
  const id = `frame-nav-${side}`

  return (
    <>
      <style>{`
        #${id} { background: transparent; transition: background 0.2s; }
        #${id}:hover { background: linear-gradient(${isLeft ? '90deg' : '270deg'}, rgba(0,0,0,0.04) 0%, transparent 100%); }
        #${id} .frame-nav-btn { opacity: 0; background-color: transparent; box-shadow: none; transition: opacity 0.15s ease-out 0.3s, background-color 0.2s, box-shadow 0.2s; }
        #${id}:hover .frame-nav-btn { opacity: 1; background-color: var(--color-surface-elevated); box-shadow: inset 0 0 0 1px var(--color-border), 0 2px 8px var(--color-shadow); transition: opacity 0.15s ease-out 0s, background-color 0.2s, box-shadow 0.2s; }
      `}</style>
      <div
        id={id}
        onClick={onClick}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [isLeft ? 'left' : 'right']: 0,
          width: 60,
          cursor: 'pointer',
          zIndex: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="frame-nav-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 9999,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-foreground)' }}>
            {isLeft ? <path d="m15 18-6-6 6-6"/> : <path d="m9 18 6-6-6-6"/>}
          </svg>
        </div>
      </div>
    </>
  )
}
