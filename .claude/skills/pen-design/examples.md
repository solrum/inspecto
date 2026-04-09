# Examples — .pen JSON → Platform Code

## Example 1: Simple Card

### .pen JSON

```json
{
  "id": "card-1",
  "type": "frame",
  "name": "Card",
  "width": 320,
  "height": "fit_content",
  "layout": "vertical",
  "padding": [16, 16, 16, 16],
  "gap": 12,
  "fill": "#FFFFFF",
  "cornerRadius": 12,
  "stroke": { "align": "inside", "thickness": 1, "fill": "#E5E5E5" },
  "effect": { "type": "shadow", "offset": { "x": 0, "y": 2 }, "blur": 8, "color": "rgba(0,0,0,0.08)" },
  "children": [
    {
      "id": "card-title",
      "type": "text",
      "content": "Card Title",
      "fill": "#1A1A1A",
      "fontSize": 18,
      "fontWeight": "600"
    },
    {
      "id": "card-desc",
      "type": "text",
      "content": "Description text goes here",
      "fill": "#666666",
      "fontSize": 14,
      "textGrowth": "fixed-width"
    }
  ]
}
```

### CSS/HTML

```html
<div style="
  width: 320px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
  background-color: #FFFFFF;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px #E5E5E5, 0px 2px 8px 0px rgba(0,0,0,0.08);
">
  <div style="color: #1A1A1A; font-size: 18px; font-weight: 600;">
    Card Title
  </div>
  <div style="color: #666666; font-size: 14px; word-wrap: break-word; overflow-wrap: break-word;">
    Description text goes here
  </div>
</div>
```

### SwiftUI

```swift
VStack(alignment: .leading, spacing: 12) {
    Text("Card Title")
        .font(.system(size: 18, weight: .semibold))
        .foregroundColor(Color(hex: 0x1A1A1A))
    Text("Description text goes here")
        .font(.system(size: 14))
        .foregroundColor(Color(hex: 0x666666))
}
.padding(16)
.frame(width: 320)
.background(Color.white)
.clipShape(RoundedRectangle(cornerRadius: 12))
.overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color(hex: 0xE5E5E5), lineWidth: 1))
.shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
```

### Jetpack Compose

```kotlin
Column(
    modifier = Modifier
        .width(320.dp)
        .background(Color.White, RoundedCornerShape(12.dp))
        .border(1.dp, Color(0xFFE5E5E5), RoundedCornerShape(12.dp))
        .shadow(elevation = 4.dp, shape = RoundedCornerShape(12.dp))
        .padding(16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp)
) {
    Text("Card Title", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1A1A1A))
    Text("Description text goes here", fontSize = 14.sp, color = Color(0xFF666666))
}
```

### Flutter

```dart
Container(
  width: 320,
  padding: EdgeInsets.all(16),
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: Color(0xFFE5E5E5), width: 1),
    boxShadow: [BoxShadow(offset: Offset(0, 2), blurRadius: 8, color: Colors.black.withOpacity(0.08))],
  ),
  child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text("Card Title", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Color(0xFF1A1A1A))),
      SizedBox(height: 12),
      Text("Description text goes here", style: TextStyle(fontSize: 14, color: Color(0xFF666666))),
    ],
  ),
)
```

### Dear ImGui (C++)

```cpp
void RenderCard() {
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 pos = ImGui::GetCursorScreenPos();
    ImVec2 size(320.0f, 0.0f); // height = fit_content

    // Push styles for the card container
    ImGui::PushStyleVar(ImGuiStyleVar_ChildRounding, 12.0f);

    // Begin a child region for the card
    ImGui::BeginGroup();
    ImGui::Dummy(ImVec2(320.0f, 0.0f)); // reserve width

    // Background + border + shadow (drawn on background draw list)
    ImVec2 min = pos;
    // We'll compute max after content, for now draw with estimated height
    float padding = 16.0f;
    float gap = 12.0f;

    ImGui::SetCursorScreenPos(ImVec2(pos.x + padding, pos.y + padding));

    // Title
    ImGui::PushFont(semiboldFont18); // pre-loaded at 18px semibold
    ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(0x1A, 0x1A, 0x1A, 0xFF));
    ImGui::TextUnformatted("Card Title");
    ImGui::PopStyleColor();
    ImGui::PopFont();

    ImGui::Dummy(ImVec2(0, gap)); // gap

    // Description
    ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(0x66, 0x66, 0x66, 0xFF));
    ImGui::PushTextWrapPos(pos.x + 320.0f - padding);
    ImGui::TextWrapped("Description text goes here");
    ImGui::PopTextWrapPos();
    ImGui::PopStyleColor();

    ImGui::Dummy(ImVec2(0, padding)); // bottom padding
    ImGui::EndGroup();

    // Now draw background behind the group
    ImVec2 max = ImVec2(pos.x + 320.0f, ImGui::GetItemRectMax().y);

    // Shadow (behind)
    dl->AddRectFilled(
        ImVec2(min.x, min.y + 2.0f), ImVec2(max.x, max.y + 2.0f),
        IM_COL32(0, 0, 0, 20), 12.0f);
    // Background
    dl->AddRectFilled(min, max, IM_COL32(0xFF, 0xFF, 0xFF, 0xFF), 12.0f);
    // Border (inside)
    dl->AddRect(min, max, IM_COL32(0xE5, 0xE5, 0xE5, 0xFF), 12.0f, 0, 1.0f);

    ImGui::PopStyleVar();
}
```

---

## Example 2: Button with Icon (Component + Ref)

### .pen JSON — Component Definition

```json
{
  "id": "btn-primary",
  "type": "frame",
  "reusable": true,
  "name": "Primary Button",
  "layout": "horizontal",
  "gap": 8,
  "padding": [10, 20, 10, 20],
  "alignItems": "center",
  "justifyContent": "center",
  "fill": "$color-primary",
  "cornerRadius": 8,
  "children": [
    { "id": "btn-icon", "type": "icon_font", "iconFontName": "plus", "width": 16, "height": 16, "fill": "#FFFFFF" },
    { "id": "btn-label", "type": "text", "content": "Add Item", "fill": "#FFFFFF", "fontSize": 14, "fontWeight": "600" }
  ]
}
```

### .pen JSON — Instance (ref)

```json
{
  "id": "save-btn",
  "type": "ref",
  "ref": "btn-primary",
  "descendants": {
    "btn-icon": { "iconFontName": "save" },
    "btn-label": { "content": "Save" }
  }
}
```

### Resolved (after ref merging)

The instance renders as a frame with `fill: $color-primary`, icon "save", label "Save".

---

## Example 3: Themed Variable Resolution

### Variables

```json
{
  "color-bg": {
    "type": "color",
    "value": [
      { "value": "#FFFFFF", "theme": { "mode": "light" } },
      { "value": "#1A1A1A", "theme": { "mode": "dark" } }
    ]
  },
  "color-text": {
    "type": "color",
    "value": [
      { "value": "#333333", "theme": { "mode": "light" } },
      { "value": "#E5E5E5", "theme": { "mode": "dark" } }
    ]
  }
}
```

### Node

```json
{ "type": "frame", "fill": "$color-bg",
  "children": [{ "type": "text", "fill": "$color-text", "content": "Hello" }] }
```

### Active theme: `{ "mode": "dark" }`

- `frame.fill` → resolves `$color-bg` → `#1A1A1A` → `backgroundColor: #1A1A1A`
- `text.fill` → resolves `$color-text` → `#E5E5E5` → `color: #E5E5E5` (foreground!)

---

## Example 4: fill_container Sizing

### .pen JSON

```json
{
  "type": "frame", "layout": "horizontal", "width": 400, "height": 200, "gap": 12,
  "children": [
    { "type": "frame", "width": "fill_container", "height": "fill_container", "fill": "#EDE9FE" },
    { "type": "frame", "width": 100, "height": "fill_container", "fill": "#DDD6FE" }
  ]
}
```

### Resolution

Parent is `horizontal`, width 400, height 200.

- Child 1: `width: fill_container` in horizontal parent → `flex: 1; minWidth: 0` (takes remaining 288px). `height: fill_container` cross-axis → `alignSelf: stretch` (200px).
- Child 2: `width: 100` → fixed 100px. `height: fill_container` cross-axis → `alignSelf: stretch` (200px).
