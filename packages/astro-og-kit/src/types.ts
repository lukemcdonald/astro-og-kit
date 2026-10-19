import type { Markup } from './svg.ts'

export type OgColors = {
  /** Accent bar. Default "#c6c6bd". */
  accent?: string
  /** Card canvas. Default "#111111". */
  background?: string
  /** Title. Default "#f4f4f4". */
  foreground?: string
  /** Recolor the logo (`currentColor` / fill). Default is `foreground`. `false` keeps the SVG's own colors. */
  logo?: string | false
  /** Footer text. Default "#a3a3a3". */
  muted?: string
  /** Tint over a full-bleed photo. Default is `background`. */
  overlay?: string
}

export type OgFont = {
  /** Family name used in the SVG, e.g. "Inter". Required. */
  family: string
  /** TTF/OTF files, relative to the project root. Required; resvg cannot use WOFF/WOFF2. */
  files: string[]
  /** Weight the built-in templates use for the title. Default 700. */
  weight?: number
}

/** A file path relative to the project root, a file URL, or an imported Astro image. */
export type OgImageSource = string | URL | { fsPath?: string; src: string }

/** Which edge of the photo to keep when it is cropped to fill. Default "center". */
export type OgPhotoPosition = 'left' | 'center' | 'right' | 'top' | 'bottom'

export type OgPhoto = {
  position?: OgPhotoPosition
  src: OgImageSource
}

/** A photo file, or `{ src, position }` to pick which edge to keep. */
export type OgPhotoInput = OgImageSource | OgPhoto

export type OgLogo = {
  /** SVG (recommended), PNG or JPEG. */
  src: OgImageSource
  /** Display width in px; height follows the aspect ratio. Default 96. */
  width?: number
}

export type OgOutput = {
  /** Cache directory. Default "node_modules/.astro-og-kit". `false` disables. */
  cache?: string | false
  /** Quantize PNGs with sharp when installed. Default true. */
  compress?: boolean
  /**
   * Image route. Default "/og". Not Astro's deploy `base`.
   * Must match where the route file lives.
   */
  path?: string
}

export type OgPage = {
  colors?: OgColors
  /** Anything else a custom template wants. */
  data?: Record<string, unknown>
  /** Small line under the title. `false` hides the site-level footer on this page. */
  footer?: string | false
  /** Text drawn on the image. Defaults to `title`. */
  heading?: string
  /** Override the site logo for this page, or `false` to hide it. */
  logo?: Partial<OgLogo> | false
  /** Page URL path, e.g. "/about/". The image slug is always derived from this. */
  pathname?: string
  /** Page photo, or `false` to hide the site photo. Split draws a right panel; cover draws it full-bleed. */
  photo?: OgPhotoInput | false
  template?: OgTemplateOption
  title: string
}

export type OgImage = { height: number; href: string; width: number }

export type OgLogoRender = {
  height: number
  width: number
  /** Place the logo with its top-left corner at (x, y). */
  at(x: number, y: number): Markup
}

export type OgResolvedColors = {
  accent: string
  background: string
  foreground: string
  logo: string | false
  muted: string
  overlay: string
}

export type OgTemplateContext = {
  colors: OgResolvedColors
  font: {
    family: string
    weight: number
    /** Advance width of `text` in px at `size`, from the configured TTF/OTF. */
    width(text: string, size: number): number
  }
  /** Resolved site footer (or page override); empty when hidden. */
  footer: string
  height: number
  logo?: OgLogoRender
  page: OgPage
  /** Page or site photo, if any. */
  photo?: OgImage & { position: OgPhotoPosition }
  width: number
}

export type OgTemplate = (context: OgTemplateContext) => Markup | string

export type OgTemplateName = 'cover' | 'split'

export type OgTemplateOption = OgTemplateName | OgTemplate

/** Site-wide options. Flat; Brand / Layout / Build are README groups, not nested keys. */
export type OgConfig = {
  colors?: OgColors
  /** Family plus TTF/OTF files. Required; resvg needs a font file to draw text. */
  font: OgFont
  /** Site-wide small line, usually the site name or domain. Default none. */
  footer?: string
  logo?: OgLogo
  output?: OgOutput
  /** Site photo. Pages override with `photo`; `photo: false` hides it. */
  photo?: OgPhotoInput
  /** Built-in name, a configured template, or a function. Default "split". */
  template?: OgTemplateOption
}

export type OgMetaInput = {
  /** Astro deploy base. `<OgMeta>` sets this from `import.meta.env.BASE_URL`. Default "/". */
  deployBase?: string
  description?: string
  /**
   * Override og:image. Absolute URL, or a path resolved against `site`
   * (root-relative from the origin; relative paths include `deployBase`).
   * When set, width/height tags are omitted and no PNG is generated.
   */
  image?: string
  imageAlt?: string
  /** Site origin, e.g. `Astro.site`. Needed for absolute image URLs. */
  site?: URL | string
  siteName?: string
  title: string
  /** og:type. Default "website". */
  type?: string
  /** Page URL or path, e.g. `Astro.url`. Used for og:url and og:image. */
  url: URL | string
}

export type OgMetaTag = { content: string; name: string } | { content: string; property: string }

export type OgRoute = {
  GET: (context: { props: Partial<OgPage> }) => Promise<Response>
  getStaticPaths: () => Promise<{ params: { slug: string }; props: OgPage }[]>
}

export type Og = {
  readonly config: OgConfig
  /** Open Graph and Twitter tags for a page. */
  meta(input: OgMetaInput): OgMetaTag[]
  /**
   * Image path for a page. `/about/` → `/og/about.png`.
   * Pass the page path without the Astro deploy base. If `pathname` includes
   * `deployBase` (default `/`), that prefix is stripped from the slug and
   * always prefixed on the result (`'/docs'` → `/docs/og/about.png`).
   */
  path(pathname: string, deployBase?: string): string
  /** Render a page directly, outside a route. */
  render(page: OgPage): Promise<Uint8Array>
  /** `getStaticPaths` and `GET` for `src/pages/og/[...slug].png.ts`. Put `export const prerender = true` next to it. */
  route(pages: OgPage[] | (() => OgPage[] | Promise<OgPage[]>)): OgRoute
  svg(page: OgPage): Promise<string>
}

/** Props for `<OgMeta>`. Page fields are recorded by the integration and rendered to PNG. */
export type OgMetaProps = Omit<OgMetaInput, 'site' | 'url'> &
  Pick<OgPage, 'colors' | 'data' | 'footer' | 'heading' | 'logo' | 'photo'> & {
    /** `defineOg()` result. Required unless `ogKit(og)` is in astro.config. */
    og?: Og
    /** Built-in template name. Custom functions belong on `defineOg({ template })`. */
    template?: OgTemplateName
    /** Page URL for og:url and og:image. Defaults to `Astro.url`. */
    url?: string | URL
  }
