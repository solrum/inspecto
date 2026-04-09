# Rendering Pipeline

## Overview

```
.pen JSON
  → Step 1: Build Component Registry
  → Step 2: Create Variable Resolver (with active theme)
  → Step 3: Parse each node → IRenderNode tree
  → Step 4: Render IRenderNode → platform-native UI
```

## Step 1: Build Component Registry

Walk entire `document.children` tree recursively. Collect every node with `reusable: true` into `Map<id, node>`.

```
function buildRegistry(children):
  registry = Map()
  function walk(nodes):
    for node in nodes:
      if node.reusable == true:
        registry.set(node.id, node)
      if node.children:
        walk(node.children)
  walk(children)
  return registry
```

## Step 2: Create Variable Resolver

Instantiate with `document.variables` + active theme (user-selected axis values).

The resolver provides: `resolveColor(val)`, `resolveNumber(val)`, `resolveString(val)`, `resolvePadding(val)`, `resolveCornerRadius(val)`.

## Step 3: Parse to IRenderNode

### Parser Dispatch (priority order)

| Priority | Parser | Handles |
|----------|--------|---------|
| 1 | FrameParser | `frame` |
| 2 | GroupParser | `group` |
| 3 | TextParser | `text` |
| 4 | IconParser | `icon_font` |
| 5 | RefParser | `ref` (resolves component, re-parses as actual type) |
| 6 | ShapeParser | `rectangle`, `ellipse`, `polygon`, `path`, `line` |
| 7 | MetaParser | `note`, `prompt`, `context` |

### What Each Parser Does

1. Create IRenderNode with `id`, `type`, `name`, `position`, `layout`
2. Resolve size (fixed / fill_container / fit_content)
3. Resolve visual properties (fill → background OR foreground, stroke, corners, effects)
4. For containers: recursively parse children, passing own layout as parent context
5. Skip children with `enabled: false`

### RefParser Special Logic

1. Lookup `ref` ID in component registry
2. Clone component, apply overrides from ref node
3. Re-parse as the component's actual type (e.g., `frame`)

## IRenderNode — Abstract Intermediate

Platform-agnostic representation. Your renderer consumes this, NOT raw .pen JSON.

```
IRenderNode {
  // Identity
  id, type, name

  // Layout
  layout: "horizontal" | "vertical" | "none"
  position: "flex" | "absolute"
  x?, y?, zIndex?

  // Size
  width?: number | string     // number = px, string = "100%"
  height?: number | string
  flex?                        // flex-grow
  minWidth?, minHeight?
  alignSelf?, flexShrink?

  // Box model
  padding?: [t, r, b, l]
  gap?, justifyContent?, alignItems?
  overflow?: "hidden" | "visible"

  // Background
  backgroundColor?             // resolved hex color
  background?                  // gradient CSS string
  backgroundImage?, backgroundSize?, backgroundPosition?, backgroundRepeat?

  // Border
  borderRadius?                // "8px" or "8px 8px 0 0"
  border?, borderTop?, borderRight?, borderBottom?, borderLeft?
  boxShadow?, outline?

  // Effects
  opacity?, filter?, backdropFilter?

  // Text (foreground props)
  color?, fontFamily?, fontSize?, fontWeight?, fontStyle?
  lineHeight?, textAlign?, letterSpacing?
  whiteSpace?, wordWrap?, overflowWrap?
  textDecoration?, textContent?

  // Icon
  iconName?, iconFamily?, iconColor?, iconSize?

  // Shape
  isEllipse?                   // → borderRadius: 50%
  svgGeometry?, svgFillRule?   // for path nodes

  // Tree
  children?: IRenderNode[]
  sourceNode: any              // original .pen node
}
```

## Step 4: Platform Render

Walk IRenderNode tree. For each node, map its properties to platform primitives. See `platform-mapping.md` for complete tables.

### Rendering Pseudocode

```
function render(node: IRenderNode):
  if node.layout == "horizontal":
    container = createHorizontalContainer(node)
  else if node.layout == "vertical":
    container = createVerticalContainer(node)
  else:
    container = createAbsoluteContainer(node)

  applySize(container, node)
  applyPadding(container, node.padding)
  applyBackground(container, node)
  applyBorder(container, node)
  applyEffects(container, node)
  applyOpacity(container, node.opacity)

  if node.textContent:
    addTextContent(container, node)
  if node.iconName:
    addIcon(container, node)

  for child in node.children:
    if child.position == "absolute":
      addAbsoluteChild(container, render(child), child.x, child.y)
    else:
      addFlexChild(container, render(child))

  return container
```
