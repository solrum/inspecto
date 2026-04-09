# Platform Mapping Reference

Complete mapping from IRenderNode properties to CSS, SwiftUI, Jetpack Compose, Flutter, and Dear ImGui (C++).

## ImGui Notes

Dear ImGui is an **immediate-mode** GUI library — there is no retained node tree. Code generation produces imperative C++ function calls executed every frame. Key differences:

- **Layout**: No flexbox. Use `ImGui::BeginGroup()`/`EndGroup()`, `ImGui::SameLine()`, `ImGui::BeginTable()` for layout.
- **Styling**: Use `ImGui::PushStyleColor()`/`PushStyleVar()` before widgets, `Pop*()` after.
- **Custom drawing**: Use `ImDrawList*` for gradients, shadows, custom shapes.
- **Colors**: `IM_COL32(r, g, b, a)` macro or `ImVec4(r, g, b, a)` with 0.0–1.0 floats. Hex `#RRGGBB` → `IM_COL32(0xRR, 0xGG, 0xBB, 0xFF)`.

## Layout

| IRenderNode | CSS | SwiftUI | Compose | Flutter | ImGui (C++) |
|-------------|-----|---------|---------|---------|-------------|
| `layout: "horizontal"` | `display:flex; flex-direction:row` | `HStack(spacing: gap)` | `Row(horizontalArrangement=...)` | `Row()` | `BeginGroup()` + children with `SameLine()` between |
| `layout: "vertical"` | `display:flex; flex-direction:column` | `VStack(spacing: gap)` | `Column(verticalArrangement=...)` | `Column()` | `BeginGroup()` + children sequentially |
| `layout: "none"` | `position:relative` + children absolute | `ZStack` | `Box` | `Stack` | `SetCursorPos()` per child |
| `position: "absolute"` | `position:absolute; top:y; left:x` | `.position(x:y:)` | `Modifier.offset(x.dp, y.dp)` | `Positioned(left:x, top:y)` | `SetCursorPos(ImVec2(x, y))` |
| `gap: N` | `gap: Npx` | `spacing: N` | `spacedBy(N.dp)` | `SizedBox` between children | `ImGui::Dummy(ImVec2(N, 0))` (h) or `ImGui::Dummy(ImVec2(0, N))` (v) |
| `padding: [t,r,b,l]` | `padding: tpx rpx bpx lpx` | `.padding(EdgeInsets(...))` | `Modifier.padding(t,r,b,l)` | `EdgeInsets.only(...)` | `PushStyleVar(ImGuiStyleVar_FramePadding, ImVec2(l, t))` + offset cursor |
| `overflow: "hidden"` | `overflow: hidden` | `.clipped()` | `Modifier.clip(shape)` | `clipBehavior: Clip.hardEdge` | `PushClipRect(min, max, true)` / `PopClipRect()` |

### Justify Content

| .pen | CSS | SwiftUI | Compose | Flutter | ImGui |
|------|-----|---------|---------|---------|-------|
| `start` | `flex-start` | default | `Arrangement.Start` | `MainAxisAlignment.start` | Default (left-aligned) |
| `center` | `center` | Spacer + content + Spacer | `Arrangement.Center` | `MainAxisAlignment.center` | `SetCursorPosX((avail - contentW) * 0.5f)` |
| `end` | `flex-end` | Spacer + content | `Arrangement.End` | `MainAxisAlignment.end` | `SetCursorPosX(avail - contentW)` |
| `space_between` | `space-between` | ForEach with Spacer | `Arrangement.SpaceBetween` | `MainAxisAlignment.spaceBetween` | Manual spacing: `gap = (avail - totalW) / (count - 1)` |
| `space_around` | `space-around` | custom | `Arrangement.SpaceAround` | `MainAxisAlignment.spaceAround` | Manual spacing: `gap = (avail - totalW) / count` |

### Align Items

| .pen | CSS | SwiftUI (HStack) | Compose (Row) | Flutter (Row) | ImGui |
|------|-----|-------------------|----------------|----------------|-------|
| `start` | `flex-start` | `alignment: .top` | `Alignment.Top` | `CrossAxisAlignment.start` | Default cursor position |
| `center` | `center` | `alignment: .center` | `Alignment.CenterVertically` | `CrossAxisAlignment.center` | `SetCursorPosY(groupY + (groupH - childH) * 0.5f)` |
| `end` | `flex-end` | `alignment: .bottom` | `Alignment.Bottom` | `CrossAxisAlignment.end` | `SetCursorPosY(groupY + groupH - childH)` |

## Size

| IRenderNode | CSS | SwiftUI | Compose | Flutter | ImGui |
|-------------|-----|---------|---------|---------|-------|
| `width: 200` | `width:200px; flex-shrink:0` | `.frame(width:200)` | `Modifier.width(200.dp)` | `SizedBox(width:200)` | `ImGui::BeginChild("id", ImVec2(200, 0))` or `PushItemWidth(200)` |
| `height: 100` | `height:100px; flex-shrink:0` | `.frame(height:100)` | `Modifier.height(100.dp)` | `SizedBox(height:100)` | `ImGui::BeginChild("id", ImVec2(0, 100))` |
| `flex: 1` (main axis) | `flex:1; min-width:0` | `.frame(maxWidth:.infinity)` | `Modifier.weight(1f)` | `Expanded()` | `ImGui::GetContentRegionAvail().x` to compute width |
| `alignSelf: "stretch"` | `align-self:stretch` | `.frame(maxWidth:.infinity)` | `fillMaxWidth()` | parent `CrossAxisAlignment.stretch` | Use `GetContentRegionAvail()` for full width/height |
| `flexShrink: 0` | `flex-shrink:0` | `.fixedSize()` | (default) | intrinsic | Fixed size (default in ImGui) |

## Visual — Background

| IRenderNode | CSS | SwiftUI | Compose | Flutter | ImGui |
|-------------|-----|---------|---------|---------|-------|
| `backgroundColor: "#7C3AED"` | `background-color:#7C3AED` | `.background(Color(hex:0x7C3AED))` | `Modifier.background(Color(0xFF7C3AED))` | `Container(color:Color(0xFF7C3AED))` | `dl->AddRectFilled(min, max, IM_COL32(0x7C,0x3A,0xED,0xFF), rounding)` |
| `background: "linear-gradient(...)"` | `background:linear-gradient(...)` | `LinearGradient(...)` | `Brush.verticalGradient(...)` | `LinearGradient(...)` | `dl->AddRectFilledMultiColor(min, max, colTL, colTR, colBR, colBL)` |
| `backgroundImage: "url(...)"` | `background-image:url(...)` | `AsyncImage(url:...)` | `AsyncImage(model=...)` | `Image.network(...)` | Load as `ImTextureID`, then `dl->AddImage(texId, min, max)` |

## Visual — Border & Corners

| IRenderNode | CSS | SwiftUI | Compose | Flutter | ImGui |
|-------------|-----|---------|---------|---------|-------|
| `border: "1px solid #ccc"` | `border:1px solid #ccc` | `.overlay(RoundedRectangle.stroke(...))` | `Modifier.border(1.dp, color, shape)` | `Border(...)` | `dl->AddRect(min, max, IM_COL32(...), rounding, 0, thickness)` |
| `boxShadow: "inset 0 0 0 2px #ccc"` | `box-shadow:inset...` | `.strokeBorder(...)` | custom `drawBehind` | custom painter | `dl->AddRect(inMin, inMax, color, rounding, 0, thickness)` (inset rect) |
| `outline: "2px solid #ccc"` | `outline:2px solid #ccc` | `.overlay(...).padding(-2)` | custom `drawBehind` | custom painter | `dl->AddRect(min-expand, max+expand, color, rounding, 0, thickness)` |
| `borderRadius: "8px"` | `border-radius:8px` | `.clipShape(RoundedRectangle(cornerRadius:8))` | `Modifier.clip(RoundedCornerShape(8.dp))` | `BorderRadius.circular(8)` | `rounding = 8.0f` parameter in `AddRectFilled`/`AddRect` |
| `borderRadius: "8px 8px 0 0"` | `border-radius:8px 8px 0 0` | `UnevenRoundedRectangle(...)` | `RoundedCornerShape(topStart=8.dp, topEnd=8.dp)` | `BorderRadius.only(...)` | `dl->AddRectFilled()` with `ImDrawFlags_RoundCornersTop` + rounding |
| `isEllipse: true` | `border-radius:50%` | `.clipShape(Circle())` | `Modifier.clip(CircleShape)` | `BoxShape.circle` | `dl->AddCircleFilled(center, radius, color)` |

### ImGui Corner Flags

```cpp
ImDrawFlags_RoundCornersTopLeft     // top-left only
ImDrawFlags_RoundCornersTopRight    // top-right only
ImDrawFlags_RoundCornersBottomLeft  // bottom-left only
ImDrawFlags_RoundCornersBottomRight // bottom-right only
ImDrawFlags_RoundCornersTop         // top-left + top-right
ImDrawFlags_RoundCornersBottom      // bottom-left + bottom-right
ImDrawFlags_RoundCornersAll         // all corners (default)
```

For per-corner radii, use multiple overlapping `AddRectFilled` calls or a custom path with `PathArcTo`.

## Visual — Effects

| IRenderNode | CSS | SwiftUI | Compose | Flutter | ImGui |
|-------------|-----|---------|---------|---------|-------|
| `boxShadow` (outer) | `box-shadow:...` | `.shadow(...)` | `Modifier.shadow(elevation)` | `BoxShadow(...)` | `dl->AddShadowRect(min, max, color, shadowSize, rounding)` (ImGui 1.91+) or manual: `dl->AddRectFilled(min+offset, max+offset, shadowColor, rounding)` |
| `boxShadow` (inner) | `box-shadow: inset ...` | Custom overlay | Custom `drawBehind` | Custom painter | `dl->AddShadowRect()` with `ImDrawFlags_ShadowCutOutShapeBackground` or draw darker inset rect |
| `opacity: 0.5` | `opacity:0.5` | `.opacity(0.5)` | `Modifier.alpha(0.5f)` | `Opacity(opacity:0.5)` | Alpha channel in all colors: `IM_COL32(r, g, b, 128)` or `PushStyleVar(ImGuiStyleVar_Alpha, 0.5f)` |
| `filter: "blur(8px)"` | `filter:blur(8px)` | `.blur(radius:8)` | `Modifier.blur(8.dp)` | `ImageFilter.blur(...)` | Not native — render to texture + shader, or skip |
| `backdropFilter: "blur(20px)"` | `backdrop-filter:blur(20px)` | `.background(.ultraThinMaterial)` | Limited | `BackdropFilter(...)` | Not native — skip or use semi-transparent overlay as approximation |

## Text

| IRenderNode | CSS | SwiftUI | Compose | Flutter | ImGui |
|-------------|-----|---------|---------|---------|-------|
| `color: "#333"` | `color:#333` | `.foregroundColor(Color(...))` | `color=Color(0xFF333333)` | `TextStyle(color:...)` | `ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(...))` + `TextWrapped()` |
| `fontFamily: "Inter"` | `font-family:Inter,sans-serif` | `.font(.custom("Inter",size:...))` | `fontFamily=FontFamily(...)` | `TextStyle(fontFamily:"Inter")` | `ImGui::PushFont(interFont)` (pre-loaded `ImFont*`) |
| `fontSize: 16` | `font-size:16px` | `.font(.system(size:16))` | `fontSize=16.sp` | `TextStyle(fontSize:16)` | Load font at desired size: `io.Fonts->AddFontFromFileTTF("Inter.ttf", 16.0f)` |
| `fontWeight: "700"` | `font-weight:700` | `.fontWeight(.bold)` | `FontWeight.Bold` | `FontWeight.w700` | Load bold variant as separate `ImFont*`, then `PushFont(boldFont)` |
| `fontStyle: "italic"` | `font-style:italic` | `.italic()` | `FontStyle.Italic` | `FontStyle.italic` | Load italic variant as separate `ImFont*` |
| `textAlign: "center"` | `text-align:center` | `.multilineTextAlignment(.center)` | `TextAlign.Center` | `TextAlign.center` | Compute: `SetCursorPosX(cursorX + (availW - textW) * 0.5f)` |
| `lineHeight: 1.5` | `line-height:1.5` | `.lineSpacing(fontSize*0.5)` | `lineHeight=1.5.em` | `TextStyle(height:1.5)` | `PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(0, lineGap))` between lines |
| `letterSpacing: 0.5` | `letter-spacing:0.5px` | `.kerning(0.5)` | `letterSpacing=0.5.sp` | `TextStyle(letterSpacing:0.5)` | Not native — render char-by-char with manual advance, or skip |
| `textDecoration: "underline"` | `text-decoration:underline` | `.underline()` | `TextDecoration.Underline` | `TextDecoration.underline` | `dl->AddLine(textMin+ImVec2(0,h), textMin+ImVec2(w,h), color, 1.0f)` |

## Icon

| Platform | Rendering Approach |
|----------|--------------------|
| **Web** | CSS mask: `mask-image:url(icon.svg); background-color:{tint}; mask-size:contain` |
| **iOS** | `Image(systemName:name).foregroundColor(tint).frame(width:size, height:size)` |
| **Android** | `Icon(painter=painterResource(id), tint=color, modifier=Modifier.size(size.dp))` |
| **Flutter** | `Icon(iconData, color:tint, size:size)` or `SvgPicture.asset(colorFilter:...)` |
| **ImGui** | Load icon font (e.g. FontAwesome, MaterialIcons) via `AddFontFromFileTTF` with glyph ranges, then `PushFont(iconFont); Text(ICON_GLYPH); PopFont();` Tint via `PushStyleColor(ImGuiCol_Text, tint)` |

## SVG Path

| Platform | Approach |
|----------|----------|
| **Web** | `<svg><path d="{geometry}" fill="{color}" fill-rule="{fillRule}"/></svg>` |
| **iOS** | `Shape { Path { CGPath.from(svgData) } }.fill(color)` |
| **Android** | `Canvas { drawPath(parseSvgPath(geometry), paint) }` |
| **Flutter** | `CustomPaint` with `Path` or `flutter_svg` |
| **ImGui** | Parse SVG path → `ImDrawList` calls: `PathLineTo()`, `PathBezierCubicCurveTo()`, `PathFillConvex()` or `AddConvexPolyFilled()`. For complex paths, rasterize to texture offline. |
