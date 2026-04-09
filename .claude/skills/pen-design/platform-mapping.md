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
| `gap: N` | `gap: Npx` | `spacing: N` | `spacedBy(N.dp)` | `SizedBox` between children | `Dummy(ImVec2(N, 0))` (h) or `Dummy(ImVec2(0, N))` (v) between items. **IMPORTANT:** Also set `ItemSpacing` to `(0,0)` so Dummy is the sole gap source. |
| `padding: [t,r,b,l]` | `padding: tpx rpx bpx lpx` | `.padding(EdgeInsets(...))` | `Modifier.padding(t,r,b,l)` | `EdgeInsets.only(...)` | **For cards/widgets:** `PushStyleVar(WindowPadding, ImVec2(l, t))` before `BeginChild`. **For page-level containers:** use manual padding — `Dummy(0, t)` top, `SetCursorPosX(l)` left, constrain child width to `avail - l - r`. See "ImGui Padding Strategies" below. |
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
| **ImGui** | **Option A (best):** Load icon font (Lucide/FontAwesome) via `AddFontFromFileTTF` with glyph ranges + IconFontCppHeaders. **Option B (no dependencies):** Draw icons via `ImDrawList` using lines, rects, circles — resolution independent. See "ImGui Icon Drawing" below. |

## SVG Path

| Platform | Approach |
|----------|----------|
| **Web** | `<svg><path d="{geometry}" fill="{color}" fill-rule="{fillRule}"/></svg>` |
| **iOS** | `Shape { Path { CGPath.from(svgData) } }.fill(color)` |
| **Android** | `Canvas { drawPath(parseSvgPath(geometry), paint) }` |
| **Flutter** | `CustomPaint` with `Path` or `flutter_svg` |
| **ImGui** | Parse SVG path → `ImDrawList` calls: `PathLineTo()`, `PathBezierCubicCurveTo()`, `PathFillConvex()` or `AddConvexPolyFilled()`. For complex paths, rasterize to texture offline. |

---

## ImGui Deep Dive — Practical Patterns

These sections address real pitfalls discovered during .pen → ImGui implementation.

### ImGui Padding Strategies

`WindowPadding` works reliably for **card-like children** (small, auto-sized). For **page-level scrollable containers**, it is unreliable due to parent context inheritance. Use manual padding instead.

**Card padding (reliable):**
```cpp
// Works: WindowPadding applied to a self-contained card child
PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(24, 24));
PushStyleVar(ImGuiStyleVar_ChildRounding, 16);
BeginChild("card", ImVec2(w, 0), AutoResizeY | Borders);
  // Content is correctly padded 24px on all sides
EndChild();
PopStyleVar(2);
```

**Page-level padding (manual — required):**
```cpp
// WindowPadding may be ignored or overridden by parent context.
// Instead, use explicit cursor manipulation:
BeginChild("##scrollArea", ImVec2(0, 0)); // scrollable, full width

Dummy(ImVec2(0, 32));  // top padding

float padH = 48.0f;
float contentW = GetWindowWidth() - padH * 2;

// Each section: indent + constrain width
SetCursorPosX(padH);
BeginChild("##section", ImVec2(contentW, 0), AutoResizeY);
  RenderCard(); // card uses GetContentRegionAvail().x → gets contentW
EndChild();

Dummy(ImVec2(0, 32));  // bottom padding
EndChild();
```

**Why manual?** ImGui's `WindowPadding` is consumed at `BeginChild` time from the **current style stack**, which may have been reset by a parent's push/pop. Nested children amplify this problem. Manual `Dummy` + `SetCursorPosX` is deterministic and always correct.

### ImGui Scrollbar Positioning

**Problem:** Nested children each create their own scrollbar. If content padding is achieved via an inner child, the scrollbar appears *inside* the padded area instead of at the viewport edge.

**Rule:** Only ONE level should scroll — the outermost content child. Inner sections must use `ImGuiChildFlags_AutoResizeY` (no scrollbar).

```
CORRECT:
  MainContent (scrollable, full width)  ← scrollbar at right edge
    ├── [manual padding via Dummy/SetCursorPosX]
    ├── CardSection (AutoResizeY, width-constrained)  ← no scrollbar
    └── CardSection (AutoResizeY, width-constrained)  ← no scrollbar

WRONG:
  MainContent (not scrollable)
    └── InnerPadded (scrollable, width-constrained)  ← scrollbar inside padding!
```

### ImGui Gap Implementation

.pen's `gap` property adds spacing between siblings **but not before the first or after the last child**. ImGui has no equivalent.

**Pattern:** Set `ItemSpacing` to `(0, 0)` and use explicit `Dummy(0, gap)` between items:
```cpp
PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(0, 0));
RenderCard1();
Dummy(ImVec2(0, 24));  // gap
RenderCard2();
Dummy(ImVec2(0, 24));  // gap
RenderCard3();
// NO dummy after last item
PopStyleVar();
```

**Why not just use ItemSpacing?** `ItemSpacing` adds space after EVERY widget including `Dummy`, making gap values unpredictable. Zeroing it and using explicit Dummies gives exact control.

### ImGui Baseline Alignment (Mixed Font Sizes)

.pen `alignItems: end` on a horizontal container with mixed font sizes means **baseline alignment**. `ImGui::SameLine()` aligns at **top**, not baseline.

**Solution:** Use `ImDrawList::AddText()` directly to position text at computed baselines:
```cpp
ImVec2 pos = GetCursorScreenPos();
ImDrawList* dl = GetWindowDrawList();

// Big text
PushFont(fontPrice); // 36px
ImVec2 bigSize = CalcTextSize("$12");
dl->AddText(fontPrice, fontPrice->FontSize, pos, bigCol, "$12");
PopFont();

// Small text — aligned to big text's baseline
PushFont(fontBody); // 14px
ImVec2 smallSize = CalcTextSize("/ month");
float baseline = pos.y + bigSize.y - smallSize.y - 2.0f; // align bottoms
dl->AddText(fontBody, fontBody->FontSize,
            ImVec2(pos.x + bigSize.x + 6, baseline), smallCol, "/ month");
PopFont();

// Advance cursor past both
Dummy(ImVec2(bigSize.x + 6 + smallSize.x, bigSize.y));
```

### ImGui Font Loading

Each unique `(fontFamily, fontSize, fontWeight)` tuple in the design must be a separate `ImFont*`. Pre-load all during init.

**Glyph ranges:** Default ImGui only loads Basic Latin (0x0020-0x00FF). For em-dash (U+2014), arrows, or other punctuation, extend the range:
```cpp
static const ImWchar ranges[] = {
    0x0020, 0x00FF, // Basic Latin + Supplement
    0x2000, 0x206F, // General Punctuation (em-dash, bullets, etc.)
    0,              // terminator
};
ImFontConfig cfg;
cfg.GlyphRanges = ranges;
// Apply cfg to ALL AddFontFromFileTTF calls
```

**Font weight mapping (Inter example):**
| .pen fontWeight | TTF file | Typical usage |
|----------------|----------|--------------|
| 400 (normal) | Inter-Regular.ttf | Body text, descriptions |
| 500 (medium) | Inter-Medium.ttf | Button labels, badges |
| 600 (semibold) | Inter-SemiBold.ttf | Card titles, nav labels, table headers |
| 700 (bold) | Inter-Bold.ttf | Page titles, plan names |
| 800 (extrabold) | Inter-ExtraBold.ttf | Price displays |

### ImGui Icon Drawing via DrawList

When icon fonts are unavailable, draw Lucide-style icons using `ImDrawList` primitives. This is resolution-independent and requires no font files.

**Pattern:**
```cpp
typedef void (*IconDrawFn)(ImDrawList* dl, ImVec2 pos, float size, ImU32 col);

// Inline icon that advances cursor:
void Icon(IconDrawFn fn, float size, unsigned int colorHex) {
    ImVec2 pos = GetCursorScreenPos();
    fn(GetWindowDrawList(), pos, size, HexToU32(colorHex));
    Dummy(ImVec2(size, size));
}

// Usage:
Icon(DrawIconCreditCard, 22.0f, 0x6938EF);
SameLine(0, 12.0f);
Text("Current Plan");
```

**Common Lucide icons — DrawList recipes:**

| Icon | Key shapes |
|------|-----------|
| credit-card | Rounded rect + horizontal line at 36% height + small filled rect |
| wallet | Rounded rect + inner line at 30% + circle clasp at right |
| receipt | Tall narrow rect + 4 horizontal lines evenly spaced |
| triangle-alert | Triangle outline + vertical line (stem) + dot at bottom |
| check-circle | Circle + two-segment checkmark polyline |
| user | Circle (head at 30% y) + bezier arc (shoulders) |
| shield | 6-point polygon approximating shield shape |
| bell | Two bezier curves (body) + base line + small circle (clapper) |
| layout-dashboard | 2x2 grid of rounded rects with gap |
| building-2 | Outer rect + grid of small filled rects (windows) |
| log-out | Half-rect (door frame) + arrow with chevron head |

### ImGui space_between Pattern

.pen `justifyContent: space_between` places first child at start, last at end.

```cpp
// Header row: title on left, badge/button on right
CardHeader(DrawIconCreditCard, "Current Plan");  // left-aligned

float rightW = 70.0f; // measure or estimate right content width
SameLine(GetContentRegionAvail().x - rightW);    // jump to right edge
Badge("Active", ...);                             // right-aligned
```

### ImGui Card Borders

.pen `stroke: { align: "inside", fill: "#EAECF0", thickness: 1 }` maps to ImGui child borders:
```cpp
PushStyleVar(ImGuiStyleVar_ChildBorderSize, 1.0f);
PushStyleColor(ImGuiCol_Border, HexToColor(0xEAECF0));
BeginChild("card", size, ImGuiChildFlags_Borders);
```
ImGui draws borders inside the child rect, matching `align: "inside"`.

### ImGui Table Row Borders

For exact border color control in tables, two approaches:

**A) Built-in (simpler, less control):**
```cpp
PushStyleColor(ImGuiCol_TableBorderLight, HexToColor(0xEAECF0));
BeginTable("t", cols, ImGuiTableFlags_BordersInnerH);
```

**B) Manual (exact color, per-row):**
```cpp
BeginTable("t", cols, ImGuiTableFlags_NoBordersInBody);
for (row : rows) {
    TableNextRow(0, 44.0f);
    ImVec2 pos = GetCursorScreenPos();
    GetWindowDrawList()->AddLine(pos, ImVec2(pos.x + tableW, pos.y), borderCol);
    // ... cells ...
}
```

### Design Extract Checklist for ImGui

When extracting .pen designs for ImGui implementation, **always include**:

- [ ] Layout tree with sizing mode (fixed px / fill_container / fit_content) and direction (h/v)
- [ ] Padding as expanded `[top, right, bottom, left]` — not shorthand
- [ ] Gap values between siblings
- [ ] Which container scrolls (only one should)
- [ ] All font instances as `(family, size, weight, color)` tuples
- [ ] Icon names with family (lucide/feather/material), exact size, and color
- [ ] Background vs foreground fill — state explicitly per node
- [ ] Border with align (inside/center/outside), thickness, color
- [ ] cornerRadius for every rounded element
- [ ] Alignment — `justifyContent` and `alignItems` for **each** container
- [ ] Exact text content including special characters (em-dash U+2014, etc.)
- [ ] Component reuse patterns — which elements share the same structure
