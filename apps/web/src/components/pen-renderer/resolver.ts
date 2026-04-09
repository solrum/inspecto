import type {
  PenVariables,
  PenVariable,
  PenFill,
  PenFills,
  PenFillImage,
  PenPadding,
  PenCornerRadius,
  PenTheme,
  NumberOrVariable,
  ColorOrVariable,
  StringOrVariable,
  BooleanOrVariable,
} from './types'

// ---- Theme resolution ----
// Themes use named axes: { mode: 'dark', spacing: 'condensed' }
// A theme entry matches if ALL its axis values match the active theme.
// The LAST matching entry wins.

export class VarResolver {
  private vars: PenVariables
  private activeTheme: PenTheme

  constructor(vars: PenVariables = {}, activeTheme: PenTheme = {}) {
    this.vars = vars
    this.activeTheme = activeTheme
  }

  setTheme(theme: PenTheme) {
    this.activeTheme = theme
  }

  getTheme(): PenTheme {
    return this.activeTheme
  }

  // Check if a theme entry matches the active theme
  private themeMatches(entryTheme?: PenTheme): boolean {
    if (!entryTheme) return true // no theme constraint = always matches
    return Object.entries(entryTheme).every(
      ([axis, value]) => this.activeTheme[axis] === value
    )
  }

  // Resolve a variable key (with or without leading $)
  private resolveVar(key: string): PenVariable | undefined {
    const k = key.startsWith('$') ? key.slice(1) : key
    return this.vars[k]
  }

  // Resolve a color value: "$token" | "#hex" -> "#hex"
  resolveColor(fill: ColorOrVariable | undefined): string | undefined {
    if (!fill) return undefined
    if (typeof fill !== 'string') return undefined
    if (!fill.startsWith('$')) return fill // literal hex

    const v = this.resolveVar(fill)
    if (!v || v.type !== 'color') return undefined

    if (typeof v.value === 'string') {
      // single value, could itself be a variable ref
      return v.value.startsWith('$') ? this.resolveColor(v.value) : v.value
    }

    // themed array — last matching entry wins
    if (Array.isArray(v.value)) {
      let result: string | undefined
      for (const entry of v.value) {
        if (this.themeMatches(entry.theme)) {
          const val = typeof entry.value === 'string' ? entry.value : undefined
          if (val) result = val
        }
      }
      return result?.startsWith('$') ? this.resolveColor(result) : result
    }

    return undefined
  }

  // Resolve a number variable: "$radius-md" | number -> number
  resolveNumber(val: NumberOrVariable | undefined): number | undefined {
    if (val === undefined) return undefined
    if (typeof val === 'number') return val
    if (typeof val !== 'string') return undefined
    if (!val.startsWith('$')) return parseFloat(val) || undefined

    const v = this.resolveVar(val)
    if (!v || v.type !== 'number') return undefined

    if (typeof v.value === 'number') return v.value

    // themed array
    if (Array.isArray(v.value)) {
      let result: number | undefined
      for (const entry of v.value) {
        if (this.themeMatches(entry.theme)) {
          const entryVal = entry.value
          if (typeof entryVal === 'number') result = entryVal
          else if (typeof entryVal === 'string') result = this.resolveNumber(entryVal)
        }
      }
      return result
    }

    return undefined
  }

  // Resolve a string variable: "$font-family" | literal -> string
  resolveString(val: StringOrVariable | undefined): string | undefined {
    if (val === undefined) return undefined
    if (typeof val !== 'string') return undefined
    if (!val.startsWith('$')) return val

    const v = this.resolveVar(val)
    if (!v || v.type !== 'string') return undefined

    if (typeof v.value === 'string') {
      return v.value.startsWith('$') ? this.resolveString(v.value) : v.value
    }

    // themed array
    if (Array.isArray(v.value)) {
      let result: string | undefined
      for (const entry of v.value) {
        if (this.themeMatches(entry.theme)) {
          const entryVal = entry.value
          if (typeof entryVal === 'string') result = entryVal
        }
      }
      return result?.startsWith('$') ? this.resolveString(result) : result
    }

    return undefined
  }

  // Resolve a boolean variable: "$isVisible" | boolean -> boolean
  resolveBoolean(val: BooleanOrVariable | undefined): boolean | undefined {
    if (val === undefined) return undefined
    if (typeof val === 'boolean') return val
    if (typeof val !== 'string') return undefined
    if (!val.startsWith('$')) return undefined

    const v = this.resolveVar(val)
    if (!v || v.type !== 'boolean') return undefined

    if (typeof v.value === 'boolean') return v.value

    // themed array
    if (Array.isArray(v.value)) {
      let result: boolean | undefined
      for (const entry of v.value) {
        if (this.themeMatches(entry.theme)) {
          const entryVal = entry.value
          if (typeof entryVal === 'boolean') result = entryVal
          else if (typeof entryVal === 'string') result = this.resolveBoolean(entryVal)
        }
      }
      return result
    }

    return undefined
  }

  // Resolve cornerRadius (single number only, not tuple for now)
  resolveCornerRadius(cr: PenCornerRadius | undefined): number | number[] | undefined {
    if (cr === undefined) return undefined
    if (Array.isArray(cr)) {
      return cr.map((v) => this.resolveNumber(v) ?? 0)
    }
    return this.resolveNumber(cr)
  }

  // Resolve fill -> CSS-usable string or image descriptor
  resolveFill(fill: PenFill | undefined): string | PenFillImage | undefined {
    if (!fill) return undefined
    if (typeof fill === 'string') return this.resolveColor(fill)
    if (typeof fill === 'object' && 'type' in fill) {
      if (fill.type === 'color') return this.resolveColor(fill.color)
      if (fill.type === 'image') return fill as PenFillImage
      // gradient / mesh_gradient - pass through for now
      return undefined
    }
    return undefined
  }

  // Resolve padding -> [top, right, bottom, left]
  resolvePadding(padding: PenPadding | undefined): [number, number, number, number] {
    if (padding === undefined) return [0, 0, 0, 0]
    if (typeof padding === 'number' || typeof padding === 'string') {
      const v = this.resolveNumber(padding) ?? 0
      return [v, v, v, v]
    }
    if (Array.isArray(padding)) {
      if (padding.length === 2) {
        const v0 = this.resolveNumber(padding[0]) ?? 0
        const v1 = this.resolveNumber(padding[1]) ?? 0
        return [v0, v1, v0, v1]
      }
      if (padding.length === 4) {
        return [
          this.resolveNumber(padding[0]) ?? 0,
          this.resolveNumber(padding[1]) ?? 0,
          this.resolveNumber(padding[2]) ?? 0,
          this.resolveNumber(padding[3]) ?? 0,
        ]
      }
    }
    return [0, 0, 0, 0]
  }

  // Resolve font family: "$font-family-primary" | literal -> string
  resolveFontFamily(ff: StringOrVariable | undefined): string {
    if (!ff) return 'Inter, sans-serif'
    const resolved = this.resolveString(ff)
    if (resolved) return `${resolved}, sans-serif`
    if (typeof ff === 'string' && !ff.startsWith('$')) return `${ff}, sans-serif`
    return 'Inter, sans-serif'
  }

  // Resolve font size: "$font-size-xl" | number -> px string
  resolveFontSize(fs: NumberOrVariable | undefined): string {
    if (fs === undefined) return '14px'
    const resolved = this.resolveNumber(fs)
    if (resolved !== undefined) return `${resolved}px`
    return '14px'
  }

  // Resolve stroke fill -> CSS color string
  resolveStrokeColor(fill: PenFills | undefined): string | undefined {
    if (!fill) return undefined
    // Handle array of fills — use first one
    const singleFill = Array.isArray(fill) ? fill[0] : fill
    if (!singleFill) return undefined
    if (typeof singleFill === 'string') return this.resolveColor(singleFill)
    if (typeof singleFill === 'object' && 'type' in singleFill && singleFill.type === 'color') {
      return this.resolveColor(singleFill.color)
    }
    return undefined
  }
}
