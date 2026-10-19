import type { Markup } from './svg.ts'

export type OgTheme = {
  /** Canvas color behind everything. */
  background: string
  /** Title color. */
  foreground: string
  /** Secondary text (the mark). */
  muted: string
  /** Accent bar and highlights. */
  accent: string
}

export type OgFont = {
  /** Family name used in the SVG, e.g. "Inter". */
  family: string
  /** TTF/OTF files, relative to the project root. WOFF/WOFF2 are rejected with a clear error. */
  files: string[]
  /** Weight the built-in templates use for the title. Default 700. */
  weight?: number
}

/** A file path relative to the project root, a file URL, or an imported Astro image. */
export type OgImageSource = string | URL | { src: string; fsPath?: string }

export type OgLogo = {
  /** SVG (recommended), PNG or JPEG. */
  src: OgImageSource
  /** Display width in px; height follows the aspect ratio. */
  width?: number
  /** Fill for SVG shapes that don't set their own (the `currentColor` of your logo). */
  color?: string
  /** Extra CSS scoped to the logo, e.g. `.accent { fill: #e8ddc1 }`. */
  css?: string
}

export type OgBackground = {
  src: OgImageSource
  /** Use only this region of the photo, in source pixels: [x, y, width, height]. */
  crop?: [number, number, number, number]
  /** Which edge of the photo to keep when it's cropped to fill. Default "center". */
  position?: 'left' | 'center' | 'right' | 'top' | 'bottom'
  /** Color laid over the photo so the title stays readable. */
  overlay?: string
  /** Overlay opacity, 0–1. Default 0.7. */
  opacity?: number
}

export type OgPage = {
  /** Output slug, e.g. "about" → /og/about.png. Derived from `pathname` if omitted. */
  slug?: string
  /** Page URL path, e.g. "/about/". Used when `slug` is omitted. */
  pathname?: string
  title: string
  description?: string
  /** Small line under the title. `false` hides the site-level mark on this page. */
  mark?: string | false
  /** Page photo; the editorial template shows it on the right. */
  image?: OgImageSource
  /** Override the site background for this page, or `false` to drop it. */
  background?: OgBackground | false
  template?: OgTemplateOption
  theme?: Partial<OgTheme>
  /** Anything else a custom template wants. */
  data?: Record<string, unknown>
}

export type OgImage = { href: string; width: number; height: number }

export type OgLogoRender = {
  width: number
  height: number
  /** Place the logo with its top-left corner at (x, y). */
  at(x: number, y: number): Markup
}

export type OgTemplateContext = {
  width: number
  height: number
  page: OgPage
  theme: OgTheme
  font: {
    family: string
    weight: number
    /** Advance width of `text` in px at `size`, from the configured TTF/OTF. */
    width(text: string, size: number): number
  }
  /** Resolved site mark (or page override); empty when hidden. */
  mark: string
  logo?: OgLogoRender
  /** Background photo (data URI, size, crop as a viewBox), if any. */
  background?: OgImage & {
    viewBox: string
    position: NonNullable<OgBackground['position']>
    overlay: string
    opacity: number
  }
  /** Page photo, if any. */
  image?: OgImage
}

export type OgTemplate = (context: OgTemplateContext) => Markup | string

export type OgTemplateName = 'editorial' | 'backdrop'

export type OgTemplateOption = OgTemplateName | OgTemplate

export type OgConfig = {
  font: OgFont
  /** Built-in template name, a configured template, or your own function. Default "editorial". */
  template?: OgTemplateOption
  theme?: Partial<OgTheme>
  logo?: OgLogo
  background?: OgBackground
  /** Site-wide small line, usually the site name or domain. */
  mark?: string
  /** URL base the images are served from. Must match where your route file lives. Default "/og". */
  base?: string
  /** Quantize PNGs with sharp when it's installed (Astro ships it). Default true. */
  compress?: boolean
  /** Reuse renders across builds. Default "node_modules/.astro-og-kit"; `false` disables. */
  cacheDir?: string | false
}
