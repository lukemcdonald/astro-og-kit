export type WrapOptions = {
  /** Even out line lengths instead of filling greedily. Default true. */
  balance?: boolean
  /**
   * Character budget per line. Use this only when you are not measuring a
   * font; built-in templates wrap by glyph width instead.
   */
  maxChars?: number
  /** Lines to keep; the last one gets an ellipsis when the text is cut. Default 3. */
  maxLines?: number
  /** Max line width in px. Requires `measure`. */
  maxWidth?: number
  /** Width of a string in px (typically `font.width(text, size)`). */
  measure?: (text: string) => number
}

function widerThan(text: string, limit: number, measure?: (text: string) => number) {
  return measure ? measure(text) > limit : text.length > limit
}

function greedy(words: string[], limit: number, measure?: (text: string) => number) {
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (current && widerThan(next, limit, measure)) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

/**
 * Break text into lines. Prefer `maxWidth` + `measure` (real glyph advances).
 * `maxChars` is the no-font fallback.
 */
export function wrapText(text: string, options: WrapOptions) {
  const { balance = true, maxChars, maxLines = 3, maxWidth, measure } = options
  const limit = measure ? maxWidth : maxChars
  if (limit == null || limit <= 0) {
    throw new Error('[astro-og-kit] wrapText needs maxWidth (with measure) or maxChars.')
  }

  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return []
  }

  let lines = greedy(words, limit, measure)

  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines)
    const last = visible[maxLines - 1] ?? ''
    visible[maxLines - 1] = `${last.includes(' ') ? last.replace(/\s+\S+$/, '') : last}…`
    return visible
  }

  if (balance && lines.length > 1) {
    const count = lines.length
    let width = limit
    while (width > 1) {
      const tighter = greedy(words, width - 1, measure)
      if (tighter.length !== count) break
      width -= 1
      lines = tighter
    }
  }

  return lines
}
