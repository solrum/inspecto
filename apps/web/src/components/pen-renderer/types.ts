// ============================================================
// .pen format TypeScript types — aligned with pen-format.md spec
// version: 2.9
// ============================================================

// ---- Theme system ----
// Each key is a theme axis name, value is one of the axis's possible values
// e.g. { mode: 'dark', spacing: 'condensed' }
export interface PenTheme {
  [axis: string]: string
}

// ---- Variable references ----
// To bind a variable to a property, use "$variableName"
export type Variable = string

export type NumberOrVariable = number | Variable
export type ColorOrVariable = string | Variable // hex color or "$var"
export type BooleanOrVariable = boolean | Variable
export type StringOrVariable = string | Variable

// ---- Variable definitions ----

export type PenVariableBoolean = {
  type: 'boolean'
  value: BooleanOrVariable | Array<{ value: BooleanOrVariable; theme?: PenTheme }>
}

export type PenVariableColor = {
  type: 'color'
  value: ColorOrVariable | Array<{ value: ColorOrVariable; theme?: PenTheme }>
}

export type PenVariableNumber = {
  type: 'number'
  value: NumberOrVariable | Array<{ value: NumberOrVariable; theme?: PenTheme }>
}

export type PenVariableString = {
  type: 'string'
  value: StringOrVariable | Array<{ value: StringOrVariable; theme?: PenTheme }>
}

export type PenVariable = PenVariableBoolean | PenVariableColor | PenVariableNumber | PenVariableString

export type PenVariables = Record<string, PenVariable>

// ---- Blend mode ----
export type PenBlendMode =
  | 'normal'
  | 'darken'
  | 'multiply'
  | 'linearBurn'
  | 'colorBurn'
  | 'light'
  | 'screen'
  | 'linearDodge'
  | 'colorDodge'
  | 'overlay'
  | 'softLight'
  | 'hardLight'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'

// ---- Fill ----

export type PenFillColor = {
  type: 'color'
  enabled?: BooleanOrVariable
  blendMode?: PenBlendMode
  color: ColorOrVariable
}

export type PenFillGradient = {
  type: 'gradient'
  enabled?: BooleanOrVariable
  blendMode?: PenBlendMode
  gradientType?: 'linear' | 'radial' | 'angular'
  opacity?: NumberOrVariable
  center?: { x?: number; y?: number }
  size?: { width?: NumberOrVariable; height?: NumberOrVariable }
  rotation?: NumberOrVariable
  colors?: Array<{ color: ColorOrVariable; position: NumberOrVariable }>
}

export type PenFillImage = {
  type: 'image'
  enabled?: BooleanOrVariable
  blendMode?: PenBlendMode
  opacity?: NumberOrVariable
  url: string
  mode?: 'stretch' | 'fill' | 'fit'
}

export type PenFillMeshGradient = {
  type: 'mesh_gradient'
  enabled?: BooleanOrVariable
  blendMode?: PenBlendMode
  opacity?: NumberOrVariable
  columns?: number
  rows?: number
  colors?: ColorOrVariable[]
  points?: (
    | [number, number]
    | {
        position: [number, number]
        leftHandle?: [number, number]
        rightHandle?: [number, number]
        topHandle?: [number, number]
        bottomHandle?: [number, number]
      }
  )[]
}

export type PenFill = ColorOrVariable | PenFillColor | PenFillGradient | PenFillImage | PenFillMeshGradient
export type PenFills = PenFill | PenFill[]

// ---- Stroke ----

export type PenStroke = {
  align?: 'inside' | 'center' | 'outside'
  thickness?:
    | NumberOrVariable
    | {
        top?: NumberOrVariable
        right?: NumberOrVariable
        bottom?: NumberOrVariable
        left?: NumberOrVariable
      }
  join?: 'miter' | 'bevel' | 'round'
  miterAngle?: NumberOrVariable
  cap?: 'none' | 'round' | 'square'
  dashPattern?: number[]
  fill?: PenFills
}

// ---- Effect ----

export type PenBlurEffect = {
  type: 'blur'
  enabled?: BooleanOrVariable
  radius?: NumberOrVariable
}

export type PenBackgroundBlurEffect = {
  type: 'background_blur'
  enabled?: BooleanOrVariable
  radius?: NumberOrVariable
}

export type PenShadowEffect = {
  type: 'shadow'
  enabled?: BooleanOrVariable
  shadowType?: 'inner' | 'outer'
  offset?: { x: NumberOrVariable; y: NumberOrVariable }
  spread?: NumberOrVariable
  blur?: NumberOrVariable
  color?: ColorOrVariable
  blendMode?: PenBlendMode
}

export type PenEffect = PenBlurEffect | PenBackgroundBlurEffect | PenShadowEffect
export type PenEffects = PenEffect | PenEffect[]

// ---- Sizing behavior ----
// "fit_content" | "fill_container" | "fit_content(100)" | "fill_container(500)" | number
export type PenSizingBehavior = string
export type PenSize = NumberOrVariable | PenSizingBehavior

// ---- Padding ----
// single | [horizontal, vertical] | [top, right, bottom, left]
export type PenPadding =
  | NumberOrVariable
  | [NumberOrVariable, NumberOrVariable]
  | [NumberOrVariable, NumberOrVariable, NumberOrVariable, NumberOrVariable]

// ---- Layout ----
export type PenLayout = 'none' | 'vertical' | 'horizontal'
export type PenAlign = 'start' | 'center' | 'end'
export type PenJustify = 'start' | 'center' | 'end' | 'space_between' | 'space_around'

// ---- Corner radius ----
export type PenCornerRadius =
  | NumberOrVariable
  | [NumberOrVariable, NumberOrVariable, NumberOrVariable, NumberOrVariable]

// ---- Text style ----
export interface PenTextStyle {
  fontFamily?: StringOrVariable
  fontSize?: NumberOrVariable
  fontWeight?: StringOrVariable
  letterSpacing?: NumberOrVariable
  fontStyle?: StringOrVariable
  underline?: BooleanOrVariable
  lineHeight?: NumberOrVariable
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  textAlignVertical?: 'top' | 'middle' | 'bottom'
  strikethrough?: BooleanOrVariable
  href?: string
}

export type PenTextContent = StringOrVariable | PenTextStyle[]

// ---- Base entity (all nodes share these) ----
export interface PenEntity {
  id: string
  name?: string
  context?: string
  reusable?: boolean
  theme?: PenTheme
  enabled?: BooleanOrVariable
  opacity?: NumberOrVariable
  rotation?: NumberOrVariable
  flipX?: BooleanOrVariable
  flipY?: BooleanOrVariable
  layoutPosition?: 'auto' | 'absolute'
  metadata?: { type: string; [key: string]: any }
  x?: number
  y?: number
}

// ---- Graphics (fill, stroke, effect) ----
export interface PenGraphics {
  stroke?: PenStroke
  fill?: PenFills
  effect?: PenEffects
}

export interface PenEffectsOnly {
  effect?: PenEffects
}

// ---- Frame ----
export interface PenFrame extends PenEntity, PenGraphics {
  type: 'frame'
  width?: PenSize
  height?: PenSize
  cornerRadius?: PenCornerRadius
  layout?: PenLayout
  gap?: NumberOrVariable
  padding?: PenPadding
  justifyContent?: PenJustify
  alignItems?: PenAlign
  layoutIncludeStroke?: boolean
  clip?: BooleanOrVariable
  placeholder?: boolean
  slot?: string[]
  children?: PenChild[]
}

// ---- Group ----
export interface PenGroup extends PenEntity, PenEffectsOnly {
  type: 'group'
  width?: PenSizingBehavior
  height?: PenSizingBehavior
  layout?: PenLayout
  gap?: NumberOrVariable
  padding?: PenPadding
  justifyContent?: PenJustify
  alignItems?: PenAlign
  children?: PenChild[]
}

// ---- Rectangle ----
export interface PenRectangle extends PenEntity, PenGraphics {
  type: 'rectangle'
  width?: PenSize
  height?: PenSize
  cornerRadius?: PenCornerRadius
}

// ---- Ellipse ----
export interface PenEllipse extends PenEntity, PenGraphics {
  type: 'ellipse'
  width?: PenSize
  height?: PenSize
  innerRadius?: NumberOrVariable
  startAngle?: NumberOrVariable
  sweepAngle?: NumberOrVariable
}

// ---- Line ----
export interface PenLine extends PenEntity, PenGraphics {
  type: 'line'
  width?: PenSize
  height?: PenSize
}

// ---- Polygon ----
export interface PenPolygon extends PenEntity, PenGraphics {
  type: 'polygon'
  width?: PenSize
  height?: PenSize
  polygonCount?: NumberOrVariable
  cornerRadius?: NumberOrVariable
}

// ---- Path ----
export interface PenPath extends PenEntity, PenGraphics {
  type: 'path'
  width?: PenSize
  height?: PenSize
  fillRule?: 'nonzero' | 'evenodd'
  geometry?: string // SVG path data
}

// ---- Text ----
export interface PenText extends PenEntity, PenGraphics, PenTextStyle {
  type: 'text'
  width?: PenSize
  height?: PenSize
  content?: PenTextContent
  textGrowth?: 'auto' | 'fixed-width' | 'fixed-width-height'
}

// ---- Icon font ----
export interface PenIconFont extends PenEntity, PenEffectsOnly {
  type: 'icon_font'
  width?: PenSize
  height?: PenSize
  iconFontName?: StringOrVariable
  iconFontFamily?: StringOrVariable
  weight?: NumberOrVariable
  fill?: PenFills
}

// ---- Note ----
export interface PenNote extends PenEntity, PenTextStyle {
  type: 'note'
  width?: PenSize
  height?: PenSize
  content?: PenTextContent
}

// ---- Prompt ----
export interface PenPrompt extends PenEntity, PenTextStyle {
  type: 'prompt'
  width?: PenSize
  height?: PenSize
  content?: PenTextContent
  model?: StringOrVariable
}

// ---- Context ----
export interface PenContext extends PenEntity, PenTextStyle {
  type: 'context'
  width?: PenSize
  height?: PenSize
  content?: PenTextContent
}

// ---- Ref (component instance) ----
export interface PenRef extends PenEntity {
  type: 'ref'
  ref: string // ID of the reusable component
  descendants?: {
    [idPath: string]:
      | Record<string, any> // property overrides (no type/id/children)
      // OR object replacement (has type field = new node tree)
  }
  // Ref can override any property from the component
  [key: string]: any
}

// ---- Union of all child node types ----
export type PenChild =
  | PenFrame
  | PenGroup
  | PenRectangle
  | PenEllipse
  | PenLine
  | PenPolygon
  | PenPath
  | PenText
  | PenNote
  | PenPrompt
  | PenContext
  | PenIconFont
  | PenRef

// ---- Top-level document ----
export interface PenDocument {
  version: '2.9'
  themes?: { [axis: string]: string[] }
  imports?: { [alias: string]: string }
  variables?: PenVariables
  children: PenChild[]
}

// ---- Resolved value types (after variable resolution) ----
export interface ResolvedFrame extends Omit<PenFrame, 'children'> {
  resolvedFill?: string
  resolvedStroke?: { align: string; thickness: number; color: string }
  resolvedCornerRadius?: number
  resolvedPadding?: [number, number, number, number]
  children?: ResolvedChild[]
}

export type ResolvedChild = ResolvedFrame | (Omit<PenChild, 'fill'> & { resolvedFill?: string })
