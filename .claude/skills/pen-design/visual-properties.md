# Visual Properties

## Fill Semantic — THE CRITICAL RULE

```
Container (frame) .fill  → BACKGROUND color/gradient/image
Shape (rect, etc) .fill  → BACKGROUND color/gradient/image
Text              .fill  → FOREGROUND (text color)
Icon (icon_font)  .fill  → FOREGROUND (icon tint color)
Group             .fill  → IGNORED (groups have no visual)
```

This distinction is the #1 source of rendering bugs. Always check `node.type` before interpreting `fill`.

## Fill Types

Each fill object can have:
- `enabled?: BooleanOrVariable` — toggle this fill layer on/off (resolve via variable!)
- `blendMode?: PenBlendMode` — blend mode (`normal`, `multiply`, `overlay`, `screen`, etc.)
- `opacity?: NumberOrVariable` — fill-layer opacity (gradient/image only)

### Color

```json
"#7C3AED"
// or
{ "type": "color", "enabled": true, "blendMode": "normal", "color": "#7C3AED" }
// or variable
"$color-primary"
```

### Gradient

```json
{
  "type": "gradient",
  "gradientType": "linear",
  "rotation": 180,
  "colors": [
    { "color": "#7C3AED", "position": 0 },
    { "color": "#EC4899", "position": 1 }
  ]
}
```

- `gradientType`: `linear` | `radial` | `angular` (angular → CSS `conic-gradient`)
- `rotation`: degrees (NumberOrVariable). **CSS conversion: `180 - pen_rotation`**
- `position`: 0.0–1.0 (NumberOrVariable, multiply by 100 for CSS %)
- `center`: `{ x?, y? }` — radial/angular gradient center point (0.0–1.0)
- `size`: `{ width?, height? }` — gradient extent
- `opacity`: NumberOrVariable — fill-layer opacity

### Image

```json
{ "type": "image", "url": "https://...", "mode": "fill" }
```

| `mode` | CSS `background-size` | SwiftUI | Compose | Flutter | ImGui |
|--------|----------------------|---------|---------|---------|-------|
| `fill` | `cover` | `.scaledToFill().clipped()` | `ContentScale.Crop` | `BoxFit.cover` | `AddImage()` with aspect-ratio crop UV coords |
| `fit` | `contain` | `.scaledToFit()` | `ContentScale.Fit` | `BoxFit.contain` | `AddImage()` with letterbox calculation |
| `stretch` | `100% 100%` | custom | `ContentScale.FillBounds` | `BoxFit.fill` | `AddImage(tex, min, max)` (default stretch) |

### Multiple Fills

When `fill` is an array:
- **Background** (containers/shapes): last entry wins (painter's algorithm)
- **Foreground** (text/icon): first entry is used

## Stroke

```json
{
  "stroke": {
    "align": "inside",
    "thickness": 2,
    "fill": { "type": "color", "color": "#E5E5E5" }
  }
}
```

### Stroke Alignment

| `align` | Rendering | Affects layout? |
|---------|-----------|-----------------|
| `center` | Standard border | Yes |
| `inside` | Inset shadow (`box-shadow: inset 0 0 0 Npx color`) | No |
| `outside` | Outline (`outline: Npx solid color`) | No |

### Stroke Style Properties

| Property | Type | Description |
|---|---|---|
| `join` | `'miter' \| 'bevel' \| 'round'` | Line join style |
| `cap` | `'none' \| 'round' \| 'square'` | Line cap style |
| `miterAngle` | `NumberOrVariable` | Miter limit angle |
| `dashPattern` | `number[]` | Dash/gap pattern (e.g. `[4, 2]`) → CSS `border-style: dashed` or SVG `stroke-dasharray` |

### Per-Side Thickness

`thickness` can be `{ top, right, bottom, left }`:
- `inside`: individual inset box-shadows per side
- `center`: individual border sides (`borderTop`, etc.)

## Corner Radius

```json
12                          // all corners
[12, 12, 0, 0]            // [topLeft, topRight, bottomRight, bottomLeft]
"$radius-lg"               // variable
```

**Special:** `type: "ellipse"` always gets `borderRadius: 50%` regardless.

## Effects

```json
{
  "effect": [
    { "type": "shadow", "shadowType": "outer",
      "offset": { "x": 0, "y": 4 }, "blur": 12, "spread": 0,
      "color": "rgba(0,0,0,0.1)" },
    { "type": "shadow", "shadowType": "inner",
      "offset": { "x": 0, "y": 2 }, "blur": 4, "spread": 0,
      "color": "rgba(0,0,0,0.05)" },
    { "type": "blur", "radius": 8 },
    { "type": "background_blur", "radius": 20 }
  ]
}
```

### Effect Mapping

| Effect | CSS | SwiftUI | Compose | Flutter | ImGui |
|--------|-----|---------|---------|---------|-------|
| `shadow` (outer) | `box-shadow: Xpx Ypx Bpx Spx color` | `.shadow(...)` | `Modifier.shadow(elevation)` | `BoxShadow(...)` | `dl->AddShadowRect()` or offset `AddRectFilled` |
| `shadow` (inner) | `box-shadow: inset ...` | Custom overlay | Custom `drawBehind` | Custom painter | Inset darker `AddRectFilled` |
| `blur` | `filter: blur(Rpx)` | `.blur(radius: R)` | `Modifier.blur(R.dp)` | `ImageFilter.blur(...)` | Not native — skip or render-to-texture |
| `background_blur` | `backdrop-filter: blur(Rpx)` | `.background(.ultraThinMaterial)` | Limited | `BackdropFilter(...)` | Not native — semi-transparent overlay |

Each effect has `enabled?: BooleanOrVariable` — skip the effect if `resolveBoolean(enabled) === false`.

Multiple shadows: concatenate with commas in CSS, stack in native.

## Opacity

```json
{ "opacity": 0.5 }
```

Only apply when < 1. Maps to `opacity` on all platforms.
