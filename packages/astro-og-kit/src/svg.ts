/**
 * A tiny tagged template for writing SVG by hand.
 *
 *   svg`<text>${title}</text>`
 *
 * Interpolated strings and numbers are XML-escaped. Nested `svg` results,
 * arrays of them, and `raw()` values are inserted as-is. `false`, `null`
 * and `undefined` render nothing, so `${cond && svg`...`}` just works.
 */
const MARKUP = Symbol('astro-og-kit.markup')

export type Markup = {
  readonly [MARKUP]: true
  readonly value: string
  toString(): string
}

type Value = Markup | string | number | boolean | null | undefined | Value[]

function markup(value: string): Markup {
  return { [MARKUP]: true, value, toString: () => value }
}

export function isMarkup(value: unknown): value is Markup {
  return typeof value === 'object' && value !== null && MARKUP in value
}

export function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function stringify(value: Value): string {
  if (value === false || value === true || value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(stringify).join('')
  if (isMarkup(value)) return value.value
  return escapeXml(String(value))
}

/** Mark a trusted string (an SVG fragment you produced) as safe to insert. */
export function raw(value: string): Markup {
  return markup(value)
}

export function svg(strings: TemplateStringsArray, ...values: Value[]): Markup {
  let out = strings[0] ?? ''
  values.forEach((value, i) => {
    out += stringify(value) + (strings[i + 1] ?? '')
  })
  return markup(out)
}
