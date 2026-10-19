import type { OgConfig, OgPage } from './types.ts'

import { renderPng, renderSvg, HEIGHT, WIDTH } from './render.ts'

export type * from './types.ts'
export { backdrop, editorial, type FrameOptions } from './templates/index.ts'
export { escapeXml, raw, svg, type Markup } from './svg.ts'
export { fontMetrics, type FontMetrics } from './font.ts'
export { wrapText, type WrapOptions } from './wrap.ts'

export type OgMetaInput = {
  /** Page URL or path, e.g. `Astro.url`. */
  url: URL | string
  /** Site origin, e.g. `Astro.site`. Needed for absolute image URLs. */
  site?: URL | string
  title: string
  description?: string
  siteName?: string
  /** og:type. Default "website". */
  type?: string
  /** Use a specific image instead of the generated one. */
  image?: string
  imageAlt?: string
}

export type OgMetaTag = { property: string; content: string } | { name: string; content: string }

export type Og = {
  readonly config: OgConfig
  /** Image path for a page: "/about/" → "/og/about.png". */
  path(pathname: string): string
  /** Open Graph and Twitter tags for a page. */
  meta(input: OgMetaInput): OgMetaTag[]
  /** `getStaticPaths` and `GET` for an endpoint at `src/pages/og/[...slug].png.ts`. */
  route(pages: OgPage[] | (() => OgPage[] | Promise<OgPage[]>)): {
    getStaticPaths: () => Promise<{ params: { slug: string }; props: OgPage }[]>
    GET: (context: { props: Record<string, unknown> }) => Promise<Response>
  }
  /** Render a page directly, outside a route. */
  render(page: OgPage): Promise<Uint8Array>
  svg(page: OgPage): Promise<string>
}

function slugFor(pathname: string) {
  const trimmed = pathname.replace(/\.html$/, '').replace(/^\/+|\/+$/g, '')
  return trimmed === '' ? 'index' : trimmed
}

export function defineOg(config: OgConfig): Og {
  const base = `/${(config.base ?? '/og').replace(/^\/+|\/+$/g, '')}`
  const path = (pathname: string) => `${base}/${slugFor(pathname)}.png`

  return {
    config,
    path,

    meta({ url, site, title, description, siteName, type = 'website', image, imageAlt }) {
      const pageUrl = new URL(url, site)
      const imageUrl = new URL(image ?? path(pageUrl.pathname), site ?? pageUrl).toString()
      const tags: [string, string | undefined, 'property' | 'name'][] = [
        ['og:title', title, 'property'],
        ['og:description', description, 'property'],
        ['og:type', type, 'property'],
        ['og:url', site ? pageUrl.toString() : undefined, 'property'],
        ['og:site_name', siteName, 'property'],
        ['og:image', imageUrl, 'property'],
        ['og:image:width', image ? undefined : String(WIDTH), 'property'],
        ['og:image:height', image ? undefined : String(HEIGHT), 'property'],
        ['og:image:alt', imageAlt, 'property'],
        ['twitter:card', 'summary_large_image', 'name'],
        ['twitter:title', title, 'name'],
        ['twitter:description', description, 'name'],
        ['twitter:image', imageUrl, 'name'],
      ]
      return tags.flatMap(([key, content, attr]) =>
        content ? [attr === 'name' ? { content, name: key } : { content, property: key }] : [],
      )
    },

    route(pages) {
      return {
        async getStaticPaths() {
          const list = typeof pages === 'function' ? await pages() : pages
          return list.map((page) => ({
            params: { slug: page.slug ?? slugFor(page.pathname ?? '/') },
            props: page,
          }))
        },
        async GET({ props }) {
          const png = await renderPng(config, props as OgPage)
          return new Response(Uint8Array.from(png), {
            headers: { 'Content-Type': 'image/png' },
          })
        },
      }
    },

    render: (page) => renderPng(config, page),
    svg: (page) => renderSvg(config, page),
  }
}
