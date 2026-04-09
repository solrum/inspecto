# .pen Format Specification

## Document Structure

```json
{
  "version": "2.9",
  "themes": { "mode": ["light", "dark"], "density": ["default", "compact"] },
  "variables": { ... },
  "children": [ ...nodes ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | `"2.9"` | Format version |
| `themes` | `{ [axis]: string[] }` | Multi-axis theme definitions |
| `imports` | `{ [alias]: string }` | Import components from other .pen files |
| `variables` | `{ [name]: VariableDef }` | Design tokens |
| `children` | `Node[]` | Top-level nodes (frames = screens/artboards) |

## Node Types

### Containers (have children)

| Type | Default Layout | Has Fill/Stroke | Notes |
|------|---------------|-----------------|-------|
| `frame` | `horizontal` | Yes | Primary container. Background fill, stroke, corners, clip. |
| `group` | `none` | No (effects only) | Transparent grouping. No visual fill or stroke. |

### Shapes (leaf nodes)

| Type | Notes |
|------|-------|
| `rectangle` | `fill`, `stroke`, `cornerRadius` |
| `ellipse` | Circle/oval (`borderRadius: 50%`). Optional: `innerRadius` (donut), `startAngle`/`sweepAngle` (arcs) |
| `line` | Height defaults to `1`, `flexShrink: 0`. Fill = line color. |
| `polygon` | `polygonCount` sides |
| `path` | `geometry` (SVG path data), `fillRule` |

### Text & Icon

| Type | `fill` semantic | Key props |
|------|----------------|-----------|
| `text` | **Foreground** (text color) | `content`, `fontFamily`, `fontSize`, `fontWeight`, `textGrowth` |
| `icon_font` | **Foreground** (icon tint) | `iconFontName`, `iconFontFamily` (default: `lucide`) |

### Meta (non-visual, design-time only)

| Type | Renders? |
|------|----------|
| `note` | Minimal (annotation text) |
| `prompt` | No |
| `context` | No |

### Component Instance

| Type | Description |
|------|-------------|
| `ref` | Instance of a `reusable: true` component. `ref` = component ID. |

## Base Entity (shared by ALL nodes)

```
id: string          — unique identifier (no slashes)
name?: string       — display name
type: string        — node type
enabled?: BooleanOrVariable — false = skip entirely (render + layout). Can be "$var"!
opacity?: NumberOrVariable  — 0.0–1.0
rotation?: NumberOrVariable — degrees
flipX?: BooleanOrVariable
flipY?: BooleanOrVariable
layoutPosition?: "auto" | "absolute"
x?: number          — position (used when absolute)
y?: number
reusable?: boolean  — true = component definition
theme?: { [axis]: value }
metadata?: { type: string, ... }
```

## Text Properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| `content` | string \| TextStyle[] | `""` | Plain string or rich text array |
| `fontFamily` | string | `"Inter"` | Append platform fallback |
| `fontSize` | number | `14` | Pixels/points |
| `fontWeight` | string | `"400"` | `"100"` to `"900"` |
| `fontStyle` | string | — | `"italic"` or `"normal"` |
| `letterSpacing` | number | — | Pixels |
| `lineHeight` | number | — | Multiplier or absolute |
| `textAlign` | string | `"left"` | `left` / `center` / `right` / `justify` |
| `textAlignVertical` | string | `"top"` | `top` / `middle` / `bottom` — vertical alignment within text box |
| `underline` | BooleanOrVariable | false | Can be `"$var"` |
| `strikethrough` | BooleanOrVariable | false | Can be `"$var"` |
| `href` | string | — | Makes text a link. Render as `<a>` on web. |
| `textGrowth` | string | `"auto"` | `auto` / `fixed-width` / `fixed-width-height` |

### Rich Text Content

```json
{ "content": [
  { "content": "Bold", "fontWeight": "700" },
  { "content": " normal" },
  { "content": "link", "href": "https://..." }
] }
```

### textGrowth Modes

| Mode | Behavior |
|------|----------|
| `auto` | Text box grows to fit. `whiteSpace: pre-wrap`, `flexShrink: 0`. |
| `fixed-width` | Width fixed, wraps. `wordWrap: break-word`. |
| `fixed-width-height` | Both fixed, clips. `overflow: hidden`. |

## Icon Properties

| Property | Default | Notes |
|----------|---------|-------|
| `iconFontFamily` | `"lucide"` | Icon font family |
| `iconFontName` | — | Icon identifier (e.g. `"arrow-right"`) |
| `fill` | — | **Tint color** (foreground!) |
| `weight` | — | Icon weight (NumberOrVariable) — thin/regular/bold variant |
| `width` / `height` | `16` | Icon size |
