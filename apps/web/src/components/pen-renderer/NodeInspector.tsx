'use client'

import React, { type CSSProperties } from 'react'
import type { PenChild, PenFrame, PenText, PenIconFont, PenRef, PenFills } from './types'
import { VarResolver } from './resolver'

interface NodeInspectorProps {
  node: PenChild | null
  resolver: VarResolver
  /** If true, skip outer panel shell — parent provides wrapper + header */
  embedded?: boolean
}

export function NodeInspector({ node, resolver, embedded = false }: NodeInspectorProps) {
  if (!node) {
    const empty = (
      <div style={{ padding: 16, color: v.mutedText, fontFamily: v.font, fontSize: 13 }}>
        Click a node to inspect
      </div>
    )
    if (embedded) return empty
    return <div style={panelStyle}><Header />{empty}</div>
  }

  const content = <InspectorContent node={node} resolver={resolver} />

  if (embedded) return content
  return <div style={panelStyle}><Header /><div style={{ flex: 1, overflowY: 'auto' }}>{content}</div></div>
}

function Header() {
  return (
    <div style={headerStyle}>
      <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 600, color: v.fgText }}>Inspector</span>
      <span style={{ width: 16, height: 16, color: v.mutedText, cursor: 'pointer' }}>✕</span>
    </div>
  )
}

function InspectorContent({ node, resolver }: { node: PenChild; resolver: VarResolver }) {
  const n = node as any
  const isFrame = node.type === 'frame'
  const isText = node.type === 'text'
  const isIcon = node.type === 'icon_font'
  const isRef = node.type === 'ref'

  // Resolve common props
  const fillRaw = getFirstFillString(n.fill)
  const fillResolved = fillRaw ? resolver.resolveColor(fillRaw) : undefined
  const [pt, pr, pb, pl] = isFrame ? resolver.resolvePadding(n.padding) : [0, 0, 0, 0]
  const w = n.width !== undefined ? String(n.width) : undefined
  const h = n.height !== undefined ? String(n.height) : undefined

  return (
    <>
      {/* ═══ COMPONENT ═══ */}
      <Section>
        <SectionLabel>COMPONENT</SectionLabel>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 600, color: v.fgText }}>{n.name ?? n.id}</div>
        {n.name && <div style={{ fontSize: 11, color: v.mutedText }}>{node.type} · {n.id}</div>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          <SmBadge bg="var(--color-primary-light)" color="var(--color-primary)">{node.type}</SmBadge>
          {n.reusable && <SmBadge bg="var(--color-success-light)" color="var(--color-success)">Reusable</SmBadge>}
          {isRef && <SmBadge bg="var(--color-surface)" color={v.secText} border>Instance</SmBadge>}
        </div>
        {isRef && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--color-primary)' }}>↗ Go to Master Component</span>
          </div>
        )}
      </Section>

      {/* ═══ PROPERTIES (for ref/reusable nodes) ═══ */}
      {(isRef || n.reusable) && n.descendants && (
        <Section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionLabel>PROPERTIES</SectionLabel>
            <span style={{ fontSize: 11, color: v.mutedText }}>{Object.keys(n.descendants).length} props</span>
          </div>
          <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: v.insetBorder }}>
            {/* Header */}
            <div style={{ display: 'flex', padding: '6px 10px', backgroundColor: 'var(--color-surface)', boxShadow: v.insetBorderB }}>
              <span style={{ ...propCol, width: 80 }}>Prop</span>
              <span style={{ ...propCol, width: 70 }}>Type</span>
              <span style={propCol}>Value</span>
            </div>
            {Object.entries(n.descendants).map(([key, val]: [string, any]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', boxShadow: v.insetBorderB }}>
                <span style={{ ...propVal, width: 80 }}>{key}</span>
                <span style={{ ...propType, width: 70 }}>override</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-accent-pink)' }}>{JSON.stringify(val)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ═══ POSITION & SIZE ═══ */}
      <Section>
        <SectionLabel>POSITION & SIZE</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <PosField label="X" value={n.x ?? 0} />
          <PosField label="Y" value={n.y ?? 0} />
        </div>
        {(w || h) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {w && <PosField label="W" value={w} />}
            {h && <PosField label="H" value={h} />}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <PosField label="⟳" value={`${n.rotation ?? 0}°`} icon />
          <PosField label="👁" value={`${Math.round((n.opacity ?? 1) * 100)}%`} icon />
        </div>
      </Section>

      {/* ═══ FILL ═══ */}
      {fillRaw && (
        <Section>
          <SectionLabel>FILL</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)', backgroundColor: fillResolved ?? '#ccc', boxShadow: v.insetBorder, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: v.fgText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fillResolved ?? fillRaw}
              </div>
              {fillRaw.startsWith('$') && fillResolved && fillResolved !== fillRaw && (
                <div style={{ fontSize: 11, color: v.mutedText }}>{fillRaw}</div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ═══ STROKE ═══ */}
      <Section>
        <SectionLabel>STROKE</SectionLabel>
        {n.stroke ? (() => {
          const strokeRaw = typeof n.stroke.fill === 'string' ? n.stroke.fill : undefined;
          const strokeResolved = resolver.resolveStrokeColor(n.stroke.fill);
          const isRef = strokeRaw?.startsWith('$');
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {strokeResolved && (
                <div style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)', backgroundColor: strokeResolved, boxShadow: v.insetBorder, flexShrink: 0 }} />
              )}
              <div style={{ fontSize: 12, color: v.fgText }}>
                {n.stroke.align} · {JSON.stringify(n.stroke.thickness)}px · {strokeResolved ?? 'none'}
              </div>
              {isRef && strokeResolved && strokeResolved !== strokeRaw && (
                <span style={{ fontSize: 11, color: v.mutedText }}>{strokeRaw}</span>
              )}
            </div>
          );
        })() : (
          <div style={{ fontSize: 12, fontStyle: 'italic', color: v.mutedText }}>No stroke applied</div>
        )}
      </Section>

      {/* ═══ EFFECTS ═══ */}
      <Section>
        <SectionLabel>EFFECTS</SectionLabel>
        {n.effect ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-background)', boxShadow: v.insetBorder }}>
            <span style={{ fontSize: 14, color: v.mutedText }}>☀</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: v.fgText }}>
                {n.effect.shadowType === 'inner' ? 'Inner Shadow' : 'Drop Shadow'}
              </div>
              <div style={{ fontSize: 10, color: v.mutedText }}>
                {n.effect.offset?.x ?? 0}px {n.effect.offset?.y ?? 0}px {n.effect.blur ?? 0}px {(() => {
                  const raw = n.effect.color;
                  if (!raw) return '';
                  const resolved = typeof raw === 'string' && raw.startsWith('$') ? resolver.resolveColor(raw) : raw;
                  return resolved !== raw ? `${resolved} (${raw})` : raw;
                })()}
              </div>
            </div>
            <span style={{ fontSize: 14, color: v.mutedText }}>👁</span>
          </div>
        ) : (
          <div style={{ fontSize: 12, fontStyle: 'italic', color: v.mutedText }}>No effects</div>
        )}
      </Section>

      {/* ═══ TYPOGRAPHY (text nodes) ═══ */}
      {isText && (
        <Section>
          <SectionLabel>TYPOGRAPHY</SectionLabel>
          <TypoRow label="Font Family" value={resolver.resolveFontFamily(n.fontFamily)} ref$={typeof n.fontFamily === 'string' && n.fontFamily.startsWith('$') ? n.fontFamily : undefined} />
          <TypoRow label="Font Size" value={resolver.resolveFontSize(n.fontSize)} ref$={typeof n.fontSize === 'string' && n.fontSize.startsWith('$') ? n.fontSize : undefined} />
          <TypoRow label="Font Weight" value={String(n.fontWeight ?? 'normal')} />
          {n.lineHeight !== undefined && <TypoRow label="Line Height" value={String(n.lineHeight)} />}
          {n.letterSpacing !== undefined && <TypoRow label="Letter Spacing" value={`${n.letterSpacing}px`} />}
          {n.textAlign && <TypoRow label="Text Align" value={n.textAlign} />}
          {fillResolved && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: v.secText }}>Color</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 9999, backgroundColor: fillResolved, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: v.fgText }}>{fillResolved}</span>
                {fillRaw?.startsWith('$') && fillResolved !== fillRaw && (
                  <span style={{ fontSize: 11, color: v.mutedText }}>{fillRaw}</span>
                )}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ═══ SPACING (frame nodes) ═══ */}
      {isFrame && (pt > 0 || pr > 0 || pb > 0 || pl > 0) && (
        <Section>
          <SectionLabel>SPACING</SectionLabel>
          {/* Box model visualization */}
          <div style={{ position: 'relative', height: 120, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--color-primary-light)', opacity: 0.5, borderRadius: 'var(--radius-sm)' }} />
            <span style={{ position: 'absolute', left: 8, top: 4, fontSize: 9, color: 'var(--color-primary)' }}>padding</span>
            <span style={{ position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 500, color: 'var(--color-primary)' }}>{pt}</span>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 500, color: 'var(--color-primary)' }}>{pl}</span>
            <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 500, color: 'var(--color-primary)' }}>{pr}</span>
            <span style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 500, color: 'var(--color-primary)' }}>{pb}</span>
            <div style={{
              position: 'absolute', left: pl > 30 ? 44 : 24, right: pr > 30 ? 44 : 24, top: pt > 16 ? 28 : 20, bottom: pb > 16 ? 28 : 20,
              backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-sm)', boxShadow: 'inset 0 0 0 1px var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: v.secText }}>{w ?? '?'} × {h ?? '?'}</span>
            </div>
          </div>
          {/* Corner radius */}
          {n.cornerRadius !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: v.secText }}>Corner Radius</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: v.fgText }}>{JSON.stringify(n.cornerRadius)}</span>
            </div>
          )}
        </Section>
      )}

      {/* ═══ DESIGN TOKENS ═══ */}
      <DesignTokensSection node={n} resolver={resolver} />

      {/* ═══ JSON ═══ */}
      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionLabel>JSON</SectionLabel>
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify(node, null, 2))}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 'var(--radius-sm)', boxShadow: v.insetBorder, border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: v.secText }}
          >
            📋 Copy
          </button>
        </div>
        <pre style={{
          margin: 0, padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          backgroundColor: '#1E1B2E', color: '#E2E8F0', borderRadius: 'var(--radius-md)',
          overflowX: 'auto', lineHeight: 1.6, maxHeight: 300, overflowY: 'auto',
        }}>
          {JSON.stringify(node, null, 2)}
        </pre>
      </Section>
    </>
  )
}

// ═══ Design Tokens Section ═══
function DesignTokensSection({ node, resolver }: { node: any; resolver: VarResolver }) {
  const tokens: Array<{ key: string; ref: string; resolved?: string }> = []

  function extractTokens(obj: any, prefix = '') {
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string' && obj.startsWith('$')) {
        const resolved = resolver.resolveColor(obj)
        tokens.push({ key: prefix, ref: obj, resolved: resolved !== obj ? resolved : undefined })
      }
      return
    }
    for (const [k, val] of Object.entries(obj)) {
      if (k === 'id' || k === 'name' || k === 'type' || k === 'children' || k === 'content') continue
      if (typeof val === 'string' && val.startsWith('$')) {
        const resolved = resolver.resolveColor(val)
        tokens.push({ key: k, ref: val, resolved: resolved !== val ? resolved : undefined })
      } else if (typeof val === 'object' && val !== null) {
        extractTokens(val, k)
      }
    }
  }
  extractTokens(node)

  if (tokens.length === 0) return null

  return (
    <Section>
      <SectionLabel>DESIGN TOKENS</SectionLabel>
      {tokens.map((t, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 24 }}>
          {t.resolved ? (
            <div style={{ width: 12, height: 12, borderRadius: 9999, backgroundColor: t.resolved, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: 'var(--color-primary)', flexShrink: 0, marginLeft: 2, marginRight: 2 }} />
          )}
          <span style={{ fontSize: 12, color: v.secText }}>{t.key}</span>
          <span style={{ fontSize: 12, color: v.mutedText }}>→</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-primary)' }}>{t.ref}</span>
          {t.resolved && (
            <span style={{ fontSize: 11, color: v.mutedText, fontFamily: 'JetBrains Mono, monospace' }}>{t.resolved}</span>
          )}
        </div>
      ))}
    </Section>
  )
}


// ═══ Shared sub-components ═══

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 16, boxShadow: v.insetBorderB }}>{children}</div>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: v.mutedText, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>
}

function SmBadge({ children, bg, color, border }: { children: React.ReactNode; bg: string; color: string; border?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: bg, fontSize: 11, fontWeight: 500, color, boxShadow: border ? v.insetBorder : undefined }}>
      {children}
    </span>
  )
}

function PosField({ label, value, icon }: { label: string; value: string | number; icon?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, padding: '7px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-background)', boxShadow: v.insetBorder }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: v.mutedText }}>{label}</span>
      <span style={{ fontSize: 12, color: v.fgText }}>{value}</span>
    </div>
  )
}

function TypoRow({ label, value, ref$ }: { label: string; value: string; ref$?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <span style={{ fontSize: 12, color: v.secText }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: v.fgText }}>{value}</span>
        {ref$ && value !== ref$ && <span style={{ fontSize: 11, color: v.mutedText }}>{ref$}</span>}
      </div>
    </div>
  )
}

// ═══ Helpers ═══

function getFirstFillString(fill: PenFills | undefined): string | undefined {
  if (!fill) return undefined
  const single = Array.isArray(fill) ? fill[0] : fill
  if (typeof single === 'string') return single
  if (typeof single === 'object' && 'type' in single && single.type === 'color') {
    return typeof single.color === 'string' ? single.color : undefined
  }
  return undefined
}

// ═══ CSS variable tokens ═══
const v = {
  font: 'Inter, sans-serif',
  fgText: 'var(--color-foreground)',
  secText: 'var(--color-foreground-secondary)',
  mutedText: 'var(--color-foreground-muted)',
  insetBorder: 'inset 0 0 0 1px var(--color-border)',
  insetBorderB: 'inset 0 -1px 0 0 var(--color-border)',
}

// ═══ Panel styles (standalone mode) ═══
const panelStyle: CSSProperties = {
  width: 320,
  boxShadow: 'inset 1px 0 0 0 var(--color-border)',
  flexShrink: 0,
  backgroundColor: 'var(--color-surface)',
  fontFamily: v.font,
  fontSize: 12,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  boxShadow: v.insetBorderB,
  flexShrink: 0,
}

const propCol: CSSProperties = { fontSize: 10, fontWeight: 600, color: v.mutedText, fontFamily: v.font }
const propVal: CSSProperties = { fontSize: 12, color: v.fgText, fontFamily: v.font }
const propType: CSSProperties = { fontSize: 11, color: v.mutedText, fontFamily: v.font }
