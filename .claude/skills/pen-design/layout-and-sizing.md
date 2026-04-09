# Layout Model & Sizing

## Layout Modes

The layout model is **flexbox-based**. Every container has a `layout`:

| `layout` | Children flow | CSS | SwiftUI | Compose | Flutter | ImGui |
|----------|--------------|-----|---------|---------|---------|-------|
| `horizontal` | Left → right | `flex-direction: row` | `HStack` | `Row` | `Row` | `BeginGroup()` + `SameLine()` |
| `vertical` | Top → bottom | `flex-direction: column` | `VStack` | `Column` | `Column` | `BeginGroup()` (default flow) |
| `none` | Absolute positioned | children `position: absolute` | `ZStack` | `Box` | `Stack` | `SetCursorPos()` per child |

## Layout Properties

| Property | Values | Description |
|----------|--------|-------------|
| `gap` | number | Space between children |
| `padding` | number \| [h, v] \| [t, r, b, l] | Inner spacing |
| `justifyContent` | `start` \| `center` \| `end` \| `space_between` \| `space_around` | Main-axis alignment |
| `alignItems` | `start` \| `center` \| `end` | Cross-axis alignment |
| `clip` | boolean | `overflow: hidden` |

### Padding Normalization

| Input | Resolved |
|-------|----------|
| `12` | `[12, 12, 12, 12]` |
| `[12, 24]` | `[12, 24, 12, 24]` (vertical, horizontal) |
| `[8, 16, 12, 16]` | `[8, 16, 12, 16]` (top, right, bottom, left) |

## Positioning Rules

A node's position depends on its parent layout AND its own `layoutPosition`:

```
if parent.layout == "none" OR node.layoutPosition == "absolute":
  → ABSOLUTE: uses node.x, node.y coordinates
else:
  → FLEX: participates in parent's flex flow
```

**Top-level children** (frames on canvas) are always absolute-positioned.

## Sizing Behavior

| Value | Example | Behavior |
|-------|---------|----------|
| Fixed number | `360` | Fixed pixels. Sets `flexShrink: 0`. |
| Variable | `"$card-width"` | Resolve to number, then treat as fixed. |
| `fill_container` | `"fill_container"` | Expand to fill available space. |
| `fit_content` | `"fit_content"` | Shrink to content (natural size). |

### fill_container — Context Matters

How `fill_container` maps depends on which axis AND parent layout direction:

| Parent Layout | `width: fill_container` | `height: fill_container` |
|---------------|------------------------|--------------------------|
| `horizontal` | Main axis: `flex: 1; minWidth: 0` | Cross axis: `alignSelf: stretch` |
| `vertical` | Cross axis: `alignSelf: stretch` | Main axis: `flex: 1; minHeight: 0` |
| `none` | `width: 100%` | `height: 100%` |

### Platform fill_container Mapping

| Scenario | CSS | SwiftUI | Compose | Flutter | ImGui |
|----------|-----|---------|---------|---------|-------|
| Main axis fill | `flex: 1; min-width/height: 0` | `.frame(maxWidth/Height: .infinity)` | `Modifier.weight(1f)` | `Expanded()` | `GetContentRegionAvail()` minus siblings |
| Cross axis fill | `align-self: stretch` | `.frame(maxWidth/Height: .infinity)` | `fillMaxWidth/Height()` | `CrossAxisAlignment.stretch` | `GetContentRegionAvail()` for cross axis |
| In `none` layout | `width/height: 100%` | `.frame(maxWidth/Height: .infinity)` | `fillMaxWidth/Height()` | `double.infinity` | `GetContentRegionAvail()` |
