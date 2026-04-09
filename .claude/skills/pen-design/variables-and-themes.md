# Variables, Themes & Components

## Variable References

Any property value starting with `$` is a variable reference:
```json
{ "fill": "$color-primary", "cornerRadius": "$radius-md", "fontFamily": "$font-heading" }
```

## Variable Definitions

Defined in `document.variables`:
```json
{
  "color-primary": { "type": "color", "value": "#7C3AED" },
  "radius-md": { "type": "number", "value": 8 },
  "font-heading": { "type": "string", "value": "Inter" },
  "is-visible": { "type": "boolean", "value": true }
}
```

Types: `color`, `number`, `string`, `boolean`.

### Variable-Bindable Property Types

| Type Alias | Accepts | Properties |
|---|---|---|
| `ColorOrVariable` | `"#hex"` or `"$var"` | `fill.color`, `stroke.fill`, `effect.color` |
| `NumberOrVariable` | `42` or `"$var"` | `fontSize`, `gap`, `padding`, `opacity`, `rotation`, `blur`, `spread`, `offset.x/y`, `thickness`, `cornerRadius` |
| `StringOrVariable` | `"literal"` or `"$var"` | `fontFamily`, `fontWeight`, `fontStyle`, `iconFontName`, `iconFontFamily` |
| `BooleanOrVariable` | `true`/`false` or `"$var"` | `enabled` (on nodes, fills, effects), `clip`, `flipX`, `flipY`, `underline`, `strikethrough` |

**Important:** `BooleanOrVariable` means you CANNOT use `if (node.enabled === false)` — you must resolve through the variable resolver first: `resolveBoolean(node.enabled) === false`.

## Themed Variables (Multi-Axis)

Variables can have different values per theme combination:

```json
{
  "color-bg": {
    "type": "color",
    "value": [
      { "value": "#FFFFFF", "theme": { "mode": "light" } },
      { "value": "#1A1A1A", "theme": { "mode": "dark" } },
      { "value": "#F5F5F5", "theme": { "mode": "light", "density": "compact" } }
    ]
  }
}
```

### Theme Initialization

**Critical:** The renderer MUST initialize `activeTheme` with defaults from `document.themes`. If `activeTheme = {}`, NO themed entry will match.

```
initTheme(docThemes):
  activeTheme = {}
  for (axis, values) in docThemes:
    activeTheme[axis] = values[0]  // first value = default
  return activeTheme
// e.g. { "mode": ["light", "dark"] } → { mode: "light" }
```

### Resolution Rules

1. Iterate all entries in order
2. An entry **matches** if ALL its theme axis values match the active theme
3. An entry with no `theme` field always matches (default/fallback)
4. **Last match wins**

### Variable Chaining

A variable value can reference another variable — resolve recursively:
```json
{ "color-action": { "type": "color", "value": "$color-primary" } }
```

### Resolution Algorithm

```
resolve(value, variables, activeTheme):
  if not starts with "$": return value  // literal
  varDef = variables[value.slice(1)]
  if varDef.value is literal:
    return resolve(varDef.value, variables, activeTheme)  // may chain
  if varDef.value is array:
    result = null
    for entry in varDef.value:
      if themeMatches(entry.theme, activeTheme):
        result = entry.value
    return resolve(result, variables, activeTheme)

themeMatches(entryTheme, activeTheme):
  if entryTheme is null/undefined: return true  // no constraint
  for (axis, value) in entryTheme:
    if activeTheme[axis] != value: return false
  return true
```

## Component System

### Defining Components

Any node with `reusable: true` becomes a component:
```json
{
  "id": "btn-primary", "type": "frame", "reusable": true,
  "name": "Primary Button",
  "fill": "$color-primary", "cornerRadius": 8, "padding": [12, 24],
  "children": [
    { "id": "btn-label", "type": "text", "content": "Button", "fill": "#fff" }
  ]
}
```

### Using Components (ref)

```json
{
  "id": "instance-1", "type": "ref", "ref": "btn-primary",
  "fill": "$color-secondary"
}
```

### Ref Resolution Steps

1. Build registry: walk entire tree, collect `reusable: true` into `Map<id, node>`
2. Look up `ref` ID in registry
3. Clone component definition
4. Apply root overrides (skip: `id`, `type`, `ref`, `descendants`, `reusable`, `x`, `y`, `layoutPosition`)
5. Set `id` = ref node's ID (each instance is unique)
6. Parse merged node as its actual type (e.g., as `frame`)

### Descendants Overrides (nested customization)

```json
{
  "type": "ref", "ref": "btn-primary",
  "descendants": {
    "btn-label": { "content": "Submit", "fill": "#000" }
  }
}
```

Keys = descendant node IDs. Values = property overrides for that node.
