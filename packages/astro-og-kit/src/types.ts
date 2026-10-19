import type { Markup } from './svg.ts'

export type OgTheme = {
  /** Accent bar and highlights. */
  accent: string
  /** Canvas color behind everything. */
  background: string
  /** Title color. */
  foreground: string
  /** Secondary text (the mark). */
  muted: string
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
export type OgImageSource = string | URL | { fsPath?: string; src: string }

export type OgLogo = {
  /** Fill for SVG shapes that don't set their own (the `currentColor` of your logo). */
  color?: string
  /** Extra CSS scoped to the logo, e.g. `.accent { fill: #e8ddc1 }`. */
  css?: string
  /** SVG (recommended), PNG or JPEG. */
  src: OgImageSource
  /** Display width in px; height follows the aspect ratio. */
  width?: number
}

export type OgBackground = {
  /** Use only this region of the photo, in source pixels: [x, y, width, height]. */
  crop?: [number, number, number, number]
  /** Overlay opacity, 0–1. Default 0.7. */
  opacity?: number
  /** Color laid over the photo so the title stays readable. */
  overlay?: string
  /** Which edge of the photo to keep when it's cropped to fill. Default "center". */
  position?: 'left' | 'center' | 'right' | 'top' | 'bottom'
  src: OgImageSource
}

export type OgPage = {
  /** Override the site background for this page, or `false` to drop it. */
  background?: OgBackground | false
  /** Anything else a custom template wants. */
  data?: Record<string, unknown>
  /** Page photo; the editorial template shows it on the right. */
  image?: OgImageSource
  /** Small line under the title. `false` hides the site-level mark on this page. */
  mark?: string | false
  /** Page URL path, e.g. "/about/". The image slug is always derived from this. */
  pathname?: string
  template?: OgTemplateOption
  theme?: Partial<OgTheme>
  title: string
}

export type OgImage = { height: number; href: string; width: number }

export type OgLogoRender = {
  height: number
  width: number
  /** Place the logo with its top-left corner at (x, y). */
  at(x: number, y: number): Markup
}

export type OgTemplateContext = {
  /** Background photo (data URI, size, crop as a viewBox), if any. */
  background?: OgImage & {
    opacity: number
    overlay: string
    position: NonNullable<OgBackground['position']>
    viewBox: string
  }
  font: {
    family: string
    weight: number
    /** Advance width of `text` in px at `size`, from the configured TTF/OTF. */
    width(text: string, size: number): number
  }
  height: number
  /** Page photo, if any. */
  image?: OgImage
  logo?: OgLogoRender
  /** Resolved site mark (or page override); empty when hidden. */
  mark: string
  page: OgPage
  theme: OgTheme
  width: number
}

export type OgTemplate = (context: OgTemplateContext) => Markup | string

export type OgTemplateName = 'backdrop' | 'editorial'

export type OgTemplateOption = OgTemplateName | OgTemplate

export type OgConfig = {
  background?: OgBackground
  /**
   * Image route prefix. Must match where the route file lives. Default "/og".
   * Not Astro's deploy `base` (`import.meta.env.BASE_URL`); `path()` prefixes that itself.
   */
  base?: string
  /** Reuse renders across builds. Default "node_modules/.astro-og-kit"; `false` disables. */
  cacheDir?: string | false
  /** Quantize PNGs with sharp when it's installed (Astro ships it). Default true. */
  compress?: boolean
  font: OgFont
  logo?: OgLogo
  /** Site-wide small line, usually the site name or domain. */
  mark?: string
  /** Built-in template name, a configured template, or your own function. Default "editorial". */
  template?: OgTemplateOption
  theme?: Partial<OgTheme>
}

export type OgMetaInput = {
  description?: string
  /** Astro deploy base. `<OgMeta>` sets this from `import.meta.env.BASE_URL`. */
  deployBase?: string
  /** Use a specific image URL instead of the generated one. */
  image?: string
  imageAlt?: string
  /** Site origin, e.g. `Astro.site`. Needed for absolute image URLs. */
  site?: URL | string
  siteName?: string
  title: string
  /** og:type. Default "website". */
  type?: string
  /** Page URL or path, e.g. `Astro.url`. */
  url: URL | string
}

export type OgMetaTag = { content: string; name: string } | { content: string; property: string }

export type OgRoute = {
  GET: (context: { props: Partial<OgPage> }) => Promise<Response>
  getStaticPaths: () => Promise<{ params: { slug: string }; props: OgPage }[]>
  prerender: true
}

export type Og = {
  readonly config: OgConfig
  /** Open Graph and Twitter tags for a page. */
  meta(input: OgMetaInput): OgMetaTag[]
  /**
   * Image path for a page. `/about/` → `/og/about.png`.
   * Pass the page path without the Astro deploy base; if the path includes
   * `import.meta.env.BASE_URL`, that prefix is stripped from the slug and
   * always prefixed on the result (`base: '/docs'` → `/docs/og/about.png`).
   */
  path(pathname: string, deployBase?: string): string
  /** Render a page directly, outside a route. */
  render(page: OgPage): Promise<Uint8Array>
  /** `getStaticPaths`, `GET`, and `prerender: true` for `src/pages/og/[...slug].png.ts`. */
  route(pages: OgPage[] | (() => OgPage[] | Promise<OgPage[]>)): OgRoute
  svg(page: OgPage): Promise<string>
}
