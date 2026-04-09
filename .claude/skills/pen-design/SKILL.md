---
name: pen-design
description: "Local Complete guide for .pen design format — understanding, parsing, and rendering .pen documents to native UI on any platform (Web, iOS, Android, Flutter). Use when working with .pen files, building renderers, implementing UI from .pen nodes, or debugging rendering issues."
user-invocable: true
---

# .pen Design System

This skill gives you everything needed to understand, parse, and render `.pen` design documents into native UI on any platform (Web, iOS, Android, Flutter, and C++ with Dear ImGui).

## Skill Structure

| File | Purpose |
|------|---------|
| [format.md](format.md) | .pen JSON specification — document structure, all node types, properties |
| [variables-and-themes.md](variables-and-themes.md) | Variable system, theme resolution, component reuse (ref) |
| [layout-and-sizing.md](layout-and-sizing.md) | Layout model (flexbox), sizing behaviors, positioning rules |
| [visual-properties.md](visual-properties.md) | Fill, stroke, corner radius, effects, opacity — and the critical fill semantic rule |
| [rendering-pipeline.md](rendering-pipeline.md) | Step-by-step parsing pipeline, IRenderNode spec, parser architecture |
| [platform-mapping.md](platform-mapping.md) | Complete mapping tables: IRenderNode → CSS, SwiftUI, Compose, Flutter, ImGui |
| [examples.md](examples.md) | Real .pen JSON → rendered output on each platform |
| [gotchas.md](gotchas.md) | Common mistakes, edge cases, "good vs bad" patterns |

## When to Read What

- **"I need to understand .pen files"** → Start with `format.md`, then `variables-and-themes.md`
- **"I need to build a renderer"** → Read `rendering-pipeline.md`, then `platform-mapping.md`
- **"I'm debugging a rendering issue"** → Check `gotchas.md` first, then `visual-properties.md`
- **"How do I handle layout?"** → Read `layout-and-sizing.md`
- **"Show me real code"** → See `examples.md`
- **"I'm implementing in ImGui (C++)"** → Read `platform-mapping.md` "ImGui Deep Dive" section + `gotchas.md` entries #14-23. Critical topics: padding strategies, scrollbar positioning, gap implementation, baseline alignment, icon drawing via DrawList.
- **"I need to extract .pen design for native implementation"** → See "Design Extract Checklist" at the bottom of `platform-mapping.md` — ensures all info needed for implementation is captured.

## The One Rule You Must Never Forget

```
frame.fill / shape.fill → BACKGROUND color
text.fill / icon.fill   → FOREGROUND color (text color / icon tint)
```

The `fill` property means different things depending on node type. This is the #1 source of rendering bugs.
