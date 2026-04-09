# Gotchas & Common Mistakes

## 1. Fill Semantic (Most Common Bug)

### BAD
```
// Treating text.fill as background
node.type == "text"
backgroundColor = resolve(node.fill)  // WRONG! text.fill is foreground
```

### GOOD
```
if node is container/shape:
  backgroundColor = resolve(node.fill)
if node is text:
  color = resolve(node.fill)  // text color
if node is icon_font:
  iconTint = resolve(node.fill)  // icon tint
```

**Rule:** Always check `node.type` before deciding if `fill` is background or foreground.

---

## 2. Group Has No Visual Properties

### BAD
```
// Applying fill/stroke/corners to a group
if node.type == "group":
  backgroundColor = resolve(node.fill)     // WRONG — groups ignore fill
  borderRadius = resolve(node.cornerRadius) // WRONG — groups have no corners
```

### GOOD
```
if node.type == "group":
  // Only layout + effects (shadow, blur)
  // No fill, no stroke, no cornerRadius
```

---

## 3. Absolute Positioning in "none" Layout

### BAD
```
// Only checking layoutPosition for absolute
if node.layoutPosition == "absolute":
  position = ABSOLUTE
```

### GOOD
```
if parent.layout == "none" OR node.layoutPosition == "absolute":
  position = ABSOLUTE  // ALL children are absolute in "none" layout
else:
  position = FLEX
```

---

## 4. Gradient Rotation Off by 180 Degrees

### BAD
```
// Using pen rotation directly in CSS
css = `linear-gradient(${penRotation}deg, ...)`
```

### GOOD
```
cssRotation = 180 - penRotation
css = `linear-gradient(${cssRotation}deg, ...)`
```

.pen: 0° = right→left, 90° = bottom→top.
CSS: 0° = bottom→top, 90° = left→right.

---

## 5. Stroke Align Affects Layout Differently

### BAD
```
// Treating all strokes the same
border = `${thickness}px solid ${color}`  // Wrong for inside/outside
```

### GOOD
```
if align == "center":
  border = `${thickness}px solid ${color}`         // standard border
if align == "inside":
  boxShadow = `inset 0 0 0 ${thickness}px ${color}` // no layout impact
if align == "outside":
  outline = `${thickness}px solid ${color}`         // no layout impact
```

---

## 6. Corner Radius Array Order

### BAD
```
// Assuming CSS order (clockwise from top-left)... but getting it wrong
borderRadius = `${corners[0]}px ${corners[1]}px ${corners[2]}px ${corners[3]}px`
// Actually this IS correct — but verify your platform matches
```

### GOOD
```
// .pen order: [topLeft, topRight, bottomRight, bottomLeft]
// CSS order:  topLeft topRight bottomRight bottomLeft (same!)
// SwiftUI: UnevenRoundedRectangle(topLeading, bottomLeading, bottomTrailing, topTrailing) — DIFFERENT ORDER
```

**SwiftUI reorders corners.** Always check platform docs.

---

## 7. Ellipse Corner Radius

### BAD
```
if node.cornerRadius:
  borderRadius = resolve(node.cornerRadius)
if node.type == "ellipse":
  borderRadius = "50%"  // This overwrites — order matters!
```

### GOOD
```
if node.type == "ellipse":
  borderRadius = "50%"  // Always. Ignore cornerRadius prop entirely.
else:
  borderRadius = resolve(node.cornerRadius)
```

---

## 8. Multiple Fills — Wrong One Selected

### BAD
```
// Using first fill for background
fills = node.fill  // array
backgroundColor = resolve(fills[0])  // Wrong — should be last for background
```

### GOOD
```
// Background (containers/shapes): LAST fill wins (painter's order)
backgroundColor = resolve(fills[fills.length - 1])
// Foreground (text/icon): FIRST fill is used
textColor = resolve(fills[0])
```

---

## 9. Ref Uses Component's ID Instead of Instance ID

### BAD
```
renderedNode.id = component.id  // "btn-primary" — same for ALL instances
```

### GOOD
```
renderedNode.id = refNode.id  // "instance-1" — unique per instance
```

---

## 10. Disabled Nodes Still Affecting Layout

### BAD
```
for child in node.children:
  renderChild(child)  // Renders disabled nodes
```

### GOOD
```
for child in node.children:
  if child.enabled == false: continue  // Skip entirely
  renderChild(child)
```

`enabled: false` means the node doesn't exist — not rendered AND not in layout.

---

## 11. Line Height Confusion

### BAD
```
// Treating lineHeight as px value
lineHeight = `${node.lineHeight}px`  // Might be a multiplier like 1.5
```

### GOOD
```
// lineHeight in .pen can be a multiplier OR absolute
// Convert based on context:
// CSS: unitless multiplier works → lineHeight: 1.5
// SwiftUI: needs .lineSpacing() with computed value
// Compose: lineHeight = 1.5.em
```

---

## 12. Missing flexShrink on Fixed-Size Elements

### BAD
```
if width is number:
  element.width = `${width}px`
  // Element may shrink below its width in a flex container!
```

### GOOD
```
if width is number:
  element.width = `${width}px`
  element.flexShrink = 0  // Prevent shrinking
```

Fixed-size elements should not shrink. Always pair with `flexShrink: 0`.

---

## 13. Theme Resolution — Partial Axis Match

### BAD
```
// Requiring exact theme object equality
if entry.theme == activeTheme: match  // Too strict
```

### GOOD
```
// Each AXIS in entry.theme must match, but entry doesn't need ALL axes
entry.theme = { "mode": "dark" }      // matches if activeTheme.mode == "dark"
activeTheme = { "mode": "dark", "density": "compact" }  // ✓ matches!
```

An entry only specifies the axes it cares about. Extra active theme axes are ignored.

---

## 14. ImGui: Color Format Mismatch

### BAD
```cpp
// Using hex string directly
dl->AddRectFilled(min, max, "#7C3AED");  // WRONG — not a valid ImU32
```

### GOOD
```cpp
// Convert hex to IM_COL32 (R, G, B, A)
dl->AddRectFilled(min, max, IM_COL32(0x7C, 0x3A, 0xED, 0xFF));
// Or use ImVec4 for float colors (0.0–1.0)
ImVec4 col(0.486f, 0.227f, 0.929f, 1.0f);
dl->AddRectFilled(min, max, ImGui::ColorConvertFloat4ToU32(col));
```

ImGui uses `ImU32` (packed RGBA) or `ImVec4` (float RGBA). Never pass hex strings.

---

## 15. ImGui: Draw Order — Background After Content

### BAD
```cpp
// Drawing background first, then content overwrites cursor position
dl->AddRectFilled(min, max, bgColor, rounding);  // draws here...
ImGui::Text("Hello");  // but cursor is now wrong
```

### GOOD
```cpp
// Use BeginGroup/EndGroup to measure content first, then draw background
ImVec2 pos = ImGui::GetCursorScreenPos();
ImGui::BeginGroup();
  ImGui::Text("Hello");
ImGui::EndGroup();
ImVec2 contentMax = ImGui::GetItemRectMax();

// Draw background BEHIND using the background draw list or channel splitting
ImDrawList* dl = ImGui::GetWindowDrawList();
dl->ChannelsSplit(2);
dl->ChannelsSetCurrent(0); // background channel
dl->AddRectFilled(pos, contentMax, bgColor, rounding);
dl->ChannelsSetCurrent(1); // foreground (already drawn)
dl->ChannelsMerge();
```

Or use `GetWindowDrawList()` channel splitting to draw backgrounds behind content.

---

## 16. ImGui: Forgetting Push/Pop Balance

### BAD
```cpp
ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(0x33, 0x33, 0x33, 0xFF));
ImGui::PushStyleVar(ImGuiStyleVar_FrameRounding, 8.0f);
ImGui::Text("Hello");
// Forgot PopStyleColor and PopStyleVar — stack corruption!
```

### GOOD
```cpp
ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(0x33, 0x33, 0x33, 0xFF));
ImGui::PushStyleVar(ImGuiStyleVar_FrameRounding, 8.0f);
ImGui::Text("Hello");
ImGui::PopStyleVar();    // MUST match every Push
ImGui::PopStyleColor();  // MUST match every Push
```

**Rule:** Every `Push*()` must have a matching `Pop*()`. ImGui asserts in debug builds if unbalanced.

---

## 17. ImGui: Font Size is Load-Time, Not Runtime

### BAD
```cpp
// Trying to change font size at render time
ImGui::SetFontSize(18.0f);  // This function doesn't exist!
ImGui::Text("Big text");
```

### GOOD
```cpp
// Load fonts at INIT time, one ImFont* per size/weight combo
ImFont* font14 = io.Fonts->AddFontFromFileTTF("Inter-Regular.ttf", 14.0f);
ImFont* font18 = io.Fonts->AddFontFromFileTTF("Inter-Regular.ttf", 18.0f);
ImFont* fontBold18 = io.Fonts->AddFontFromFileTTF("Inter-Bold.ttf", 18.0f);

// At render time, switch fonts
ImGui::PushFont(fontBold18);
ImGui::Text("Big bold text");
ImGui::PopFont();
```

Pre-load every `fontSize × fontWeight × fontFamily` combination you need. ImGui bakes fonts into texture atlas at load time.

---

## 18. ImGui: Layout — No Automatic Flexbox

### BAD
```cpp
// Expecting ImGui to auto-distribute children like flexbox
ImGui::BeginChild("row", ImVec2(400, 50));
  ImGui::Button("A");  // takes minimal space
  ImGui::Button("B");  // takes minimal space — rest is empty
ImGui::EndChild();
```

### GOOD
```cpp
// Manual layout: compute sizes, use SameLine with explicit positions
float totalW = 400.0f;
float buttonW = totalW / 2.0f;  // split equally

ImGui::Button("A", ImVec2(buttonW, 0));
ImGui::SameLine(0, 0);
ImGui::Button("B", ImVec2(buttonW, 0));

// Or for fill_container: use GetContentRegionAvail()
float avail = ImGui::GetContentRegionAvail().x;
ImGui::Button("Fill", ImVec2(avail, 0));
```

ImGui has no flex model. You must compute sizes manually for `fill_container`, `space_between`, etc.
