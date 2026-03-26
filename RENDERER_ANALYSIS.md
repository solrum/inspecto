# Pen Renderer — Analysis & Next Steps

## Current State

Renderer dùng HTML/CSS approach (files/renderer.tsx) — đúng hướng nhưng implementation quá phức tạp với nhiều layers không cần thiết.

## Root Cause Analysis

### Verified CORRECT
- **Padding 2-element**: `[a, b]` → `[top=a, right=b, bottom=a, left=b]` — verified against Pencil snapshot
- **Padding 4-element**: `[top, right, bottom, left]` — correct
- **Vertical stack positions**: y-positions accumulate correctly (verified AUTH02)
- **fill_container mapping**: `flex:1` for main axis, `alignSelf:stretch` for cross axis
- **Variable resolution**: `$gray-300` → `#D0D5DD` etc — correct

### Verified ISSUES
1. **Font loading** — design uses `Plus Jakarta Sans`, `SF Pro`, `JetBrains Mono` — not loaded in browser → fallback font → different text dimensions → layout shift
2. **overflow:hidden on main-axis fill** — `chatArea height:fill_container` content overflows onto inputBar. Adding `overflow:hidden` clips content correctly but was previously applied too broadly
3. **Icon coloring** — lucide CDN SVGs need `mask-image` approach for color tinting (fixed but untested)
4. **Multiple fills** — only first fill used, array fills not stacked

### Architecture Problem
Too many moving parts:
- `resolver.ts` — variable/theme resolution (VarResolver class)
- `styleBuilder.ts` — 10+ separate functions for each node type
- `renderer.tsx` — 10+ separate React components
- `CanvasView.tsx` — zoom/pan container
- `NodeInspector.tsx` — inspect panel
- `PenViewer.tsx` — composition

**Should be 1 unified parser**: `.pen node` → `CSS style object` — single function that handles ALL node types based on their properties, not their type.

## Proposed New Architecture

### Core Parser (single function)
```typescript
function penNodeToStyle(node: PenChild, resolver: VarResolver, parentLayout: string): CSSProperties {
  const style: CSSProperties = { boxSizing: 'border-box' }

  // 1. Layout (applies to frame/group only)
  if (node.children) {
    const layout = node.layout ?? (node.type === 'frame' ? 'horizontal' : 'none')
    if (layout === 'none') {
      style.position = 'relative'
    } else {
      style.display = 'flex'
      style.position = 'relative'
      style.flexDirection = layout === 'vertical' ? 'column' : 'row'
      if (node.gap) style.gap = `${resolver.resolveNumber(node.gap)}px`
      if (node.justifyContent) style.justifyContent = mapJustify(node.justifyContent)
      if (node.alignItems) style.alignItems = mapAlign(node.alignItems)
    }
  }

  // 2. Size (ALL node types)
  applySize(style, node.width, node.height, resolver, parentLayout)

  // 3. Padding (frame/group)
  if (node.padding) {
    const [t,r,b,l] = resolver.resolvePadding(node.padding)
    style.padding = `${t}px ${r}px ${b}px ${l}px`
  }

  // 4. Fill → background (ALL types with fill)
  if (node.fill) applyFill(style, node.fill, resolver)

  // 5. Stroke → border/boxShadow
  if (node.stroke) applyStroke(style, node.stroke, resolver)

  // 6. Corner radius
  if (node.cornerRadius) applyRadius(style, node.cornerRadius, resolver)

  // 7. Effects → boxShadow/filter
  if (node.effect) applyEffects(style, node.effect, resolver)

  // 8. Clip
  if (node.clip) style.overflow = 'hidden'

  // 9. Opacity
  if (node.opacity !== undefined) style.opacity = resolver.resolveNumber(node.opacity)

  // 10. Text properties (text type)
  if (node.type === 'text') applyTextStyle(style, node, resolver)

  // 11. Ellipse → borderRadius: 50%
  if (node.type === 'ellipse') style.borderRadius = '50%'

  // 12. Icon → flexShrink:0, fixed size
  if (node.type === 'icon_font') {
    style.flexShrink = 0
    style.display = 'inline-flex'
    style.alignItems = 'center'
    style.justifyContent = 'center'
  }

  return style
}
```

### Unified Renderer (single recursive component)
```tsx
function PenNode({ node, parentLayout }: { node: PenChild, parentLayout: string }) {
  const resolver = useResolver()
  const style = penNodeToStyle(node, resolver, parentLayout)
  const ownLayout = getOwnLayout(node)

  return (
    <div data-pen-id={node.id} style={style} onClick={handleClick}>
      {/* Text content */}
      {node.type === 'text' && <span>{textContent(node.content)}</span>}

      {/* Icon */}
      {node.type === 'icon_font' && <LucideIcon name={node.iconFontName} color={...} />}

      {/* Children */}
      {node.children?.map((child, i) => {
        const isAbsolute = ownLayout === 'none' || child.layoutPosition === 'absolute'
        if (isAbsolute) {
          return (
            <div key={child.id} style={{ position:'absolute', top:child.y??0, left:child.x??0, zIndex:i }}>
              <PenNode node={child} parentLayout={ownLayout} />
            </div>
          )
        }
        return <PenNode key={child.id} node={child} parentLayout={ownLayout} />
      })}
    </div>
  )
}
```

### Key Principle
**1 node = 1 div = 1 style object.** No special-casing by type. All types share the same property resolution. The `type` field only affects:
- Default layout (frame=horizontal, group=none)
- Whether to render text content
- Whether to render icon
- Whether it's an ellipse (borderRadius: 50%)

### Font Loading
Load Google Fonts for `Plus Jakarta Sans`, `Inter`, `JetBrains Mono` via `<link>` in layout.tsx. SF Pro is Apple system font — use `-apple-system` fallback.

## Verification Method
For any frame, compare:
1. `snapshot_layout(parentId, maxDepth:5)` → Pencil computed x/y/w/h
2. Browser DevTools computed styles on rendered divs
3. Pixel-diff between Pencil export PNG and browser screenshot

## Test Data
- AUTH02 (Login): `/tmp/auth02_full.json` — 39 nodes, simple layout
- Pencil export: `/tmp/pen-exports/HamvP.png`
- Pencil layout: `snapshot_layout` results in this analysis
