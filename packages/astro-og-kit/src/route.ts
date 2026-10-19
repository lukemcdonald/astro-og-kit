import type { OgConfig, OgMetaInput, OgMetaTag, OgPage, OgRoute } from './types.ts'

import { HEIGHT, WIDTH, renderPng } from './render.ts'

/** `/docs/` → `/docs`, `/` stays `/`. */
function normalizeBase(base: string): string {
  const trimmed = base.replace(/^\/+|\/+$/g, '')
  if (trimmed === '') {
    return '/'
  }

  return `/${trimmed}`
}

function joinUrl(...segments: string[]): string {
  const parts: string[] = []
  for (const segment of segments) {
    const trimmed = segment.replace(/^\/+|\/+$/g, '')
    if (trimmed !== '') {
      parts.push(trimmed)
    }
  }

  return `/${parts.join('/')}`
}

/** Drop Astro's deploy base from a page pathname so the slug does not include it. */
function stripDeployBase(pathname: string, deployBase: string): string {
  const base = normalizeBase(deployBase)
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (base === '/') {
    return path
  }
  if (path === base || path === `${base}/`) {
    return '/'
  }
  if (path.startsWith(`${base}/`)) {
    return path.slice(base.length) || '/'
  }

  return path
}

function slugFor(pathname: string): string {
  const trimmed = pathname.replace(/\.html$/, '').replace(/^\/+|\/+$/g, '')
  if (trimmed === '') {
    return 'index'
  }

  return trimmed
}

/** Match Astro's shouldAppendForwardSlash (trailingSlash + build.format). */
function appendSlash(
  trailingSlash: NonNullable<OgMetaInput['trailingSlash']> = 'ignore',
  buildFormat?: OgMetaInput['buildFormat'],
): boolean | undefined {
  if (trailingSlash === 'always') {
    return true
  }
  if (trailingSlash === 'never') {
    return false
  }
  if (buildFormat === 'directory') {
    return true
  }
  if (buildFormat === 'file' || buildFormat === 'preserve') {
    return false
  }

  return undefined
}

/**
 * Route path from a build URL. Strips `/index.html` and `.html` so og:url
 * and og:image share one path, then applies trailingSlash / build.format.
 */
export function pagePath(
  pathname: string,
  options: { buildFormat?: OgMetaInput['buildFormat']; trailingSlash?: OgMetaInput['trailingSlash'] } = {},
): string {
  const { buildFormat, trailingSlash = 'ignore' } = options
  let path = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (path.endsWith('/index.html')) {
    path = path.slice(0, -'index.html'.length) || '/'
  } else if (path.endsWith('.html')) {
    path = path.slice(0, -'.html'.length)
  }
  if (path === '' || path === '/') {
    return '/'
  }

  const slash = appendSlash(trailingSlash, buildFormat)
  if (slash === true) {
    return path.endsWith('/') ? path : `${path}/`
  }
  if (slash === false) {
    return path.replace(/\/+$/, '') || '/'
  }

  return path
}

/**
 * Image URL path. `pathname` is the page path; `prefix` is the image route
 * (`/og`); `deployBase` is Astro's `base`. The deploy base is stripped from
 * the slug and prefixed on the result.
 */
export function imagePath(pathname: string, prefix = '/og', deployBase = '/'): string {
  const deploy = normalizeBase(deployBase)
  const slug = slugFor(stripDeployBase(pagePath(pathname), deploy))

  return joinUrl(deploy, prefix, `${slug}.png`)
}

export function createMeta(path: (pathname: string, deployBase?: string) => string) {
  return (input: OgMetaInput): OgMetaTag[] => {
    const {
      buildFormat,
      canonical,
      deployBase,
      description,
      image,
      imageAlt,
      site,
      siteName,
      title,
      trailingSlash,
      type = 'website',
      url,
    } = input
    const pageUrl = new URL(url, site)
    const route = pagePath(pageUrl.pathname, { buildFormat, trailingSlash })
    const ogUrl = canonical
      ? new URL(canonical, site ?? pageUrl).toString()
      : site
        ? new URL(route, site).toString()
        : undefined
    const imageUrl = new URL(image ?? path(route, deployBase), site ?? pageUrl).toString()
    const tags: [string, string | undefined, 'name' | 'property'][] = [
      ['og:title', title, 'property'],
      ['og:description', description, 'property'],
      ['og:type', type, 'property'],
      ['og:url', ogUrl, 'property'],
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

    return tags.flatMap(([key, content, attr]): OgMetaTag[] => {
      if (!content) {
        return []
      }
      if (attr === 'name') {
        return [{ content, name: key }]
      }

      return [{ content, property: key }]
    })
  }
}

export function createRoute(config: OgConfig) {
  return (pages: OgPage[] | (() => OgPage[] | Promise<OgPage[]>)): OgRoute => ({
    GET: async ({ props }) => {
      if (typeof props.title !== 'string' || props.title.length === 0) {
        throw new Error(
          '[astro-og-kit] Missing page title. og.route() GET needs a prerendered page with props.title. Add a literal `export const prerender = true` to the route file.',
        )
      }

      const png = await renderPng(config, { ...props, title: props.title })

      return new Response(Uint8Array.from(png), {
        headers: { 'Content-Type': 'image/png' },
      })
    },
    getStaticPaths: async () => {
      const list = typeof pages === 'function' ? await pages() : pages

      return list.map((page) => ({
        params: { slug: slugFor(page.pathname ?? '/') },
        props: page,
      }))
    },
  })
}
