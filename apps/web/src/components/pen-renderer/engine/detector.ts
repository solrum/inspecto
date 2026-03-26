/**
 * NodeDetector
 *
 * Detects node category, fill semantic, and layout defaults from node type.
 * Used by ParserFactory to dispatch to correct parser.
 */

import type { PenChild } from '../types'
import type { NodeDetection } from './interfaces'

const DETECTION_MAP: Record<string, NodeDetection> = {
  frame: {
    category: 'container',
    fillSemantic: 'background',
    hasChildren: true,
    defaultLayout: 'horizontal',
  },
  group: {
    category: 'container',
    fillSemantic: 'none',
    hasChildren: true,
    defaultLayout: 'none',
  },
  rectangle: {
    category: 'shape',
    fillSemantic: 'background',
    hasChildren: false,
    defaultLayout: 'none',
  },
  ellipse: {
    category: 'shape',
    fillSemantic: 'background',
    hasChildren: false,
    defaultLayout: 'none',
  },
  line: {
    category: 'shape',
    fillSemantic: 'background',
    hasChildren: false,
    defaultLayout: 'none',
  },
  polygon: {
    category: 'shape',
    fillSemantic: 'background',
    hasChildren: false,
    defaultLayout: 'none',
  },
  path: {
    category: 'shape',
    fillSemantic: 'background',
    hasChildren: false,
    defaultLayout: 'none',
  },
  text: {
    category: 'text',
    fillSemantic: 'foreground',
    hasChildren: false,
    defaultLayout: 'none',
  },
  icon_font: {
    category: 'icon',
    fillSemantic: 'foreground',
    hasChildren: false,
    defaultLayout: 'none',
  },
  ref: {
    category: 'ref',
    fillSemantic: 'background', // delegates to component
    hasChildren: false,
    defaultLayout: 'none',
  },
  note: {
    category: 'meta',
    fillSemantic: 'none',
    hasChildren: false,
    defaultLayout: 'none',
  },
  prompt: {
    category: 'meta',
    fillSemantic: 'none',
    hasChildren: false,
    defaultLayout: 'none',
  },
  context: {
    category: 'meta',
    fillSemantic: 'none',
    hasChildren: false,
    defaultLayout: 'none',
  },
}

const FALLBACK_DETECTION: NodeDetection = {
  category: 'shape',
  fillSemantic: 'background',
  hasChildren: false,
  defaultLayout: 'none',
}

export class NodeDetector {
  static detect(node: PenChild): NodeDetection {
    return DETECTION_MAP[node.type] ?? FALLBACK_DETECTION
  }
}
