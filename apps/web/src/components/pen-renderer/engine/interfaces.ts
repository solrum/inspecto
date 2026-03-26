/**
 * Core Engine Interfaces
 *
 * IRenderNode: renderer-agnostic output from parsers
 * INodeParser: parses .pen node → IRenderNode
 * IRenderer: renders IRenderNode tree → output (HTML, Canvas, etc.)
 */

import type { PenChild, PenDocument } from '../types'
import type { VarResolver } from '../resolver'

// ── Node detection result ──

export interface NodeDetection {
  category: 'container' | 'shape' | 'text' | 'icon' | 'ref' | 'meta'
  fillSemantic: 'background' | 'foreground' | 'none'
  hasChildren: boolean
  defaultLayout: 'horizontal' | 'vertical' | 'none'
}

// ── Abstract render node (renderer-agnostic) ──

export interface IRenderNode {
  id: string
  type: string
  name?: string

  // Layout
  layout: 'horizontal' | 'vertical' | 'none'
  position: 'flex' | 'absolute'
  x?: number
  y?: number
  zIndex?: number

  // Size
  width?: string | number
  height?: string | number
  flex?: number
  minWidth?: number
  minHeight?: number
  alignSelf?: string
  flexShrink?: number

  // Box model
  padding?: [number, number, number, number]
  gap?: number
  justifyContent?: string
  alignItems?: string
  overflow?: 'hidden' | 'visible'

  // Background visual
  backgroundColor?: string
  background?: string          // gradient/image CSS
  backgroundImage?: string
  backgroundSize?: string
  backgroundPosition?: string
  backgroundRepeat?: string

  // Border
  borderRadius?: string
  border?: string
  borderTop?: string
  borderRight?: string
  borderBottom?: string
  borderLeft?: string
  boxShadow?: string
  outline?: string

  // Opacity & filters
  opacity?: number
  filter?: string
  backdropFilter?: string

  // Text (foreground)
  color?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: string
  fontStyle?: string
  lineHeight?: number
  textAlign?: string
  letterSpacing?: number
  whiteSpace?: string
  wordWrap?: string
  overflowWrap?: string
  textDecoration?: string
  textContent?: string

  // Icon
  iconName?: string
  iconFamily?: string
  iconColor?: string
  iconSize?: number

  // Shape-specific
  isEllipse?: boolean          // borderRadius: 50%
  svgGeometry?: string         // SVG path data
  svgFillRule?: string

  // Children
  children?: IRenderNode[]

  // Source reference (for inspector)
  sourceNode: any
}

// ── Parser interface ──

export interface INodeParser {
  /** Which node types can this parser handle? */
  canParse(node: PenChild): boolean

  /** Parse .pen node → abstract IRenderNode */
  parse(
    node: PenChild,
    resolver: VarResolver,
    parentLayout: string,
    childIndex: number,
    parseChild: ChildParser,
  ): IRenderNode
}

/** Callback for parsers to recursively parse children */
export type ChildParser = (
  node: PenChild,
  parentLayout: string,
  childIndex: number,
) => IRenderNode

// ── Renderer interface ──

export interface IRenderer {
  render(node: IRenderNode): any
}

// ── Factory interface ──

export interface IParserFactory {
  register(parser: INodeParser): void
  parse(
    node: PenChild,
    resolver: VarResolver,
    parentLayout: string,
    childIndex: number,
  ): IRenderNode
}
