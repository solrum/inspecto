/**
 * Shared Build Helpers
 *
 * Pure functions that resolve .pen properties → IRenderNode properties.
 * Used by all parsers via composition (not inheritance).
 */

import type { IRenderNode } from './interfaces'
import type { VarResolver } from '../resolver'
import type {
  PenFills,
  PenStroke,
  PenEffects,
  PenCornerRadius,
  NumberOrVariable,
} from '../types'

// ─── Size Resolution ───

export function resolveSize(
  target: Partial<IRenderNode>,
  width: any,
  height: any,
  resolver: VarResolver,
  parentLayout: string,
) {
  const isParentH = parentLayout === 'horizontal'
  const isParentV = parentLayout === 'vertical'

  if (width !== undefined) {
    if (typeof width === 'number') {
      target.width = width
      target.flexShrink = 0
    } else if (typeof width === 'string') {
      if (width.startsWith('fill_container')) {
        if (isParentH) { target.flex = 1; target.minWidth = 0 }
        else if (isParentV) { target.alignSelf = 'stretch' }
        else { target.width = '100%' }
      } else if (width.startsWith('fit_content')) {
        // auto sizing — no explicit width
      } else if (width.startsWith('$')) {
        const v = resolver.resolveNumber(width)
        if (v !== undefined) { target.width = v; target.flexShrink = 0 }
      }
    }
  }

  if (height !== undefined) {
    if (typeof height === 'number') {
      target.height = height
      target.flexShrink = 0
    } else if (typeof height === 'string') {
      if (height.startsWith('fill_container')) {
        if (isParentV) { target.flex = 1; target.minHeight = 0; target.overflow = 'hidden' }
        else if (isParentH) { target.alignSelf = 'stretch' }
        else { target.height = '100%' }
      } else if (height.startsWith('fit_content')) {
        // auto sizing
      } else if (height.startsWith('$')) {
        const v = resolver.resolveNumber(height)
        if (v !== undefined) { target.height = v; target.flexShrink = 0 }
      }
    }
  }
}

// ─── Background Fill (for containers/shapes) ───

export function resolveBackgroundFill(
  target: Partial<IRenderNode>,
  fill: PenFills | undefined,
  resolver: VarResolver,
) {
  if (!fill) return
  const single = Array.isArray(fill) ? fill[fill.length - 1] : fill
  if (!single) return

  if (typeof single === 'string') {
    const color = resolver.resolveColor(single)
    if (color) target.backgroundColor = color
    return
  }

  if (typeof single === 'object' && 'type' in single) {
    const fillEnabled = resolver.resolveBoolean((single as any).enabled)
    if (fillEnabled === false) return

    if (single.type === 'color') {
      const color = resolver.resolveColor((single as any).color)
      if (color) target.backgroundColor = color
    } else if (single.type === 'gradient') {
      const grad = single as any
      const gradEnabled = resolver.resolveBoolean(grad.enabled)
      if (gradEnabled === false) return
      if (grad.colors?.length) {
        const gradOpacity = resolver.resolveNumber(grad.opacity)
        const stops = grad.colors.map((s: any) => {
          const c = resolver.resolveColor(s.color) ?? '#000'
          const p = (resolver.resolveNumber(s.position) ?? 0) * 100
          return `${c} ${p}%`
        }).join(', ')
        const rot = resolver.resolveNumber(grad.rotation) ?? 0
        let gradientCSS: string
        if (grad.gradientType === 'radial') {
          gradientCSS = `radial-gradient(circle, ${stops})`
        } else {
          gradientCSS = `linear-gradient(${180 - rot}deg, ${stops})`
        }
        target.background = gradientCSS
        if (gradOpacity !== undefined && gradOpacity < 1) target.opacity = gradOpacity
      }
    } else if (single.type === 'image') {
      const img = single as any
      const modeMap: Record<string, string> = { fill: 'cover', fit: 'contain', stretch: '100% 100%' }
      target.backgroundImage = `url("${img.url}")`
      target.backgroundSize = modeMap[img.mode ?? 'fill'] ?? 'cover'
      target.backgroundPosition = 'center'
      target.backgroundRepeat = 'no-repeat'
      const imgOpacity = resolver.resolveNumber(img.opacity)
      if (imgOpacity !== undefined && imgOpacity < 1) target.opacity = imgOpacity
    }
  }
}

// ─── Foreground Fill (for text/icons) ───

export function resolveForegroundFill(
  fill: PenFills | undefined,
  resolver: VarResolver,
): string | undefined {
  if (!fill) return undefined
  const single = Array.isArray(fill) ? fill[0] : fill
  if (typeof single === 'string') return resolver.resolveColor(single)
  if (typeof single === 'object' && 'type' in single) {
    const enabled = resolver.resolveBoolean((single as any).enabled)
    if (enabled === false) return undefined
    if (single.type === 'color') {
      return resolver.resolveColor((single as any).color)
    }
  }
  return undefined
}

// ─── Stroke ───

export function resolveStroke(
  target: Partial<IRenderNode>,
  stroke: PenStroke | undefined,
  resolver: VarResolver,
) {
  if (!stroke) return
  const color = resolver.resolveStrokeColor(stroke.fill) ?? 'transparent'
  const align = stroke.align ?? 'center'

  // Per-side thickness
  if (typeof stroke.thickness === 'object' && stroke.thickness !== null && !Array.isArray(stroke.thickness)) {
    const sides = stroke.thickness as any
    const t = resolver.resolveNumber(sides.top) ?? 0
    const r = resolver.resolveNumber(sides.right) ?? 0
    const b = resolver.resolveNumber(sides.bottom) ?? 0
    const l = resolver.resolveNumber(sides.left) ?? 0

    if (align === 'inside') {
      const shadows: string[] = []
      if (t > 0) shadows.push(`inset 0 ${t}px 0 0 ${color}`)
      if (b > 0) shadows.push(`inset 0 -${b}px 0 0 ${color}`)
      if (l > 0) shadows.push(`inset ${l}px 0 0 0 ${color}`)
      if (r > 0) shadows.push(`inset -${r}px 0 0 0 ${color}`)
      if (shadows.length) target.boxShadow = appendShadow(target.boxShadow, shadows.join(', '))
    } else {
      if (t > 0) target.borderTop = `${t}px solid ${color}`
      if (r > 0) target.borderRight = `${r}px solid ${color}`
      if (b > 0) target.borderBottom = `${b}px solid ${color}`
      if (l > 0) target.borderLeft = `${l}px solid ${color}`
    }
    return
  }

  const thickness = typeof stroke.thickness === 'number'
    ? stroke.thickness
    : resolver.resolveNumber(stroke.thickness as NumberOrVariable) ?? 1

  if (align === 'inside') {
    target.boxShadow = appendShadow(target.boxShadow, `inset 0 0 0 ${thickness}px ${color}`)
  } else if (align === 'outside') {
    target.outline = `${thickness}px solid ${color}`
  } else {
    target.border = `${thickness}px solid ${color}`
  }
}

// ─── Corner Radius ───

export function resolveCornerRadius(
  target: Partial<IRenderNode>,
  cr: PenCornerRadius | undefined,
  resolver: VarResolver,
) {
  if (cr === undefined) return
  if (typeof cr === 'number') {
    target.borderRadius = `${cr}px`
  } else if (typeof cr === 'string') {
    const v = resolver.resolveNumber(cr)
    if (v !== undefined) target.borderRadius = `${v}px`
  } else if (Array.isArray(cr) && cr.length === 4) {
    target.borderRadius = cr.map(v => {
      const n = typeof v === 'number' ? v : resolver.resolveNumber(v) ?? 0
      return `${n}px`
    }).join(' ')
  }
}

// ─── Effects ───

export function resolveEffects(
  target: Partial<IRenderNode>,
  effects: PenEffects | undefined,
  resolver: VarResolver,
) {
  if (!effects) return
  const list = Array.isArray(effects) ? effects : [effects]
  const shadows: string[] = []
  const filters: string[] = []
  const backdropFilters: string[] = []

  for (const e of list) {
    const enabled = resolver.resolveBoolean((e as any).enabled)
    if (enabled === false) continue

    if (e.type === 'shadow') {
      const s = e as any
      const x = resolver.resolveNumber(s.offset?.x) ?? 0
      const y = resolver.resolveNumber(s.offset?.y) ?? 0
      const blur = resolver.resolveNumber(s.blur) ?? 0
      const spread = resolver.resolveNumber(s.spread) ?? 0
      const color = typeof s.color === 'string' ? (resolver.resolveColor(s.color) ?? 'rgba(0,0,0,0.25)') : 'rgba(0,0,0,0.25)'
      const inset = s.shadowType === 'inner' ? 'inset ' : ''
      shadows.push(`${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`)
    } else if (e.type === 'blur') {
      const r = resolver.resolveNumber((e as any).radius) ?? 0
      if (r > 0) filters.push(`blur(${r}px)`)
    } else if (e.type === 'background_blur') {
      const r = resolver.resolveNumber((e as any).radius) ?? 0
      if (r > 0) backdropFilters.push(`blur(${r}px)`)
    }
  }

  if (shadows.length) target.boxShadow = appendShadow(target.boxShadow, shadows.join(', '))
  if (filters.length) target.filter = filters.join(' ')
  if (backdropFilters.length) target.backdropFilter = backdropFilters.join(' ')
}

// ─── Layout Props ───

export function resolveLayoutProps(
  target: Partial<IRenderNode>,
  node: any,
  resolver: VarResolver,
  defaultLayout: 'horizontal' | 'vertical' | 'none',
) {
  const layout = node.layout ?? defaultLayout
  target.layout = layout

  if (layout !== 'none') {
    if (node.gap !== undefined) {
      const g = resolver.resolveNumber(node.gap)
      if (g !== undefined && g > 0) target.gap = g
    }
    if (node.justifyContent) {
      const map: Record<string, string> = {
        start: 'flex-start', center: 'center', end: 'flex-end',
        space_between: 'space-between', space_around: 'space-around',
      }
      target.justifyContent = map[node.justifyContent]
    }
    if (node.alignItems) {
      const map: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end' }
      target.alignItems = map[node.alignItems]
    }
  }

  if (node.padding !== undefined) {
    target.padding = resolver.resolvePadding(node.padding)
  }

  if (resolver.resolveBoolean(node.clip) === true) target.overflow = 'hidden'
}

// ─── Transform (rotation, flip) ───

export function resolveTransform(
  target: Partial<IRenderNode>,
  node: any,
  resolver: VarResolver,
) {
  const transforms: string[] = []

  const rotation = resolver.resolveNumber(node.rotation)
  if (rotation !== undefined && rotation !== 0) {
    transforms.push(`rotate(${rotation}deg)`)
  }

  const flipX = resolver.resolveBoolean(node.flipX)
  const flipY = resolver.resolveBoolean(node.flipY)
  if (flipX === true) transforms.push('scaleX(-1)')
  if (flipY === true) transforms.push('scaleY(-1)')

  if (transforms.length) target.transform = transforms.join(' ')
}

// ─── Text Content Extractor ───

export function extractTextContent(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((c: any) => (typeof c === 'string' ? c : c.content ?? '')).join('')
  }
  return ''
}

// ─── Utility ───

function appendShadow(existing: string | undefined, newShadow: string): string {
  return existing ? `${existing}, ${newShadow}` : newShadow
}
