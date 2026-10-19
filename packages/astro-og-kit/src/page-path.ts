import type { OgImageSource, OgMetaInput, OgMetaTag, OgPage, OgPhotoInput } from './types.ts'

import { photoSource } from './assets.ts'

type BuildFormat = 'directory' | 'file' | 'preserve'
type TrailingSlash = 'always' | 'ignore' | 'never'

export type PagePathOptions = { buildFormat?: BuildFormat; trailingSlash?: TrailingSlash }

const TAG = /<meta name="astro-og-kit" content="([^"]*)"\s*\/?>/g
const onDemand = new Set<string>()

/** Match Astro's shouldAppendForwardSlash (trailingSlash + build.format). */
function appendSlash(
  trailingSlash: TrailingSlash = 'ignore',
  buildFormat?: BuildFormat,
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
}

/**
 * Route path from a build URL. Strips `/index.html` and `.html` so og:url
 * and og:image share one path, then applies trailingSlash / build.format.
 */
export function pagePath(pathname: string, options: PagePathOptions = {}): string {
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
export function stripDeployBase(pathname: string, deployBase: string): string {
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

export function slugFor(pathname: string): string {
  const trimmed = pathname.replace(/\.html$/, '').replace(/^\/+|\/+$/g, '')
  if (trimmed === '') {
    return 'index'
  }

  return trimmed
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

export function pngSlug(pathname: string, prefix = '/og', base = '/'): string | undefined {
  const path = stripDeployBase(pathname.split('?')[0] ?? '', base)
  const pre = prefix === '/' ? '' : `/${prefix.replace(/^\/+|\/+$/g, '')}`
  if (!path.endsWith('.png') || (pre && path !== `${pre}.png` && !path.startsWith(`${pre}/`))) {
    return
  }
  const slug = path.slice(pre.length).replace(/^\//, '').slice(0, -4)
  if (slug) {
    return slug
  }
}

function pageFromSlug(slug: string, options?: PagePathOptions): string {
  return pagePath(slug === 'index' ? '/' : `/${slug}`, options)
}

export function pageUrl(
  host: string,
  base: string,
  slug: string,
  options: PagePathOptions = {},
  tls = false,
): string {
  const protocol = tls ? 'https' : 'http'
  const root = base.replace(/\/+$/, '')
  const path = pageFromSlug(slug, options)
  if (path === '/') {
    return `${protocol}://${host}${root && options.trailingSlash === 'never' ? root : `${root}/`}`
  }

  return `${protocol}://${host}${root}${path}`
}

export function createMeta(path: (pathname: string, deployBase?: string) => string) {
  return (input: OgMetaInput): OgMetaTag[] => {
    const { deployBase, description, image, imageAlt, site, siteName, title, type = 'website', url } = input
    const pageUrl = new URL(url, site)
    const route = pagePath(pageUrl.pathname)
    const ogUrl = site ? new URL(route, site).toString() : undefined
    const root = normalizeBase(deployBase ?? '/')
    const imageUrl = new URL(
      image ?? path(route, deployBase),
      new URL(root === '/' ? '/' : `${root}/`, site ?? pageUrl),
    ).toString()
    const tags: [string, string | undefined, 'name' | 'property'][] = [
      ['og:title', title, 'property'],
      ['og:description', description, 'property'],
      ['og:type', type, 'property'],
      ['og:url', ogUrl, 'property'],
      ['og:site_name', siteName, 'property'],
      ['og:image', imageUrl, 'property'],
      ['og:image:width', image ? undefined : '1200', 'property'],
      ['og:image:height', image ? undefined : '630', 'property'],
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

export function metaTags(input: OgMetaInput, prefix = '/og'): OgMetaTag[] {
  return createMeta((pathname, deployBase) => imagePath(pathname, prefix, deployBase))(input)
}

function filePath(source: OgImageSource): string {
  if (typeof source === 'object' && !(source instanceof URL)) {
    return source.fsPath ?? source.src.split('?')[0] ?? ''
  }
  const href = String(source)
  if (href.startsWith('/@fs/')) {
    return decodeURIComponent(href.slice('/@fs'.length))
  }
  if (href.startsWith('file:')) {
    return decodeURIComponent(new URL(href).pathname)
  }

  return href
}

function withSrc<T extends { src?: OgImageSource }>(value: T | false | undefined): T | false | undefined {
  if (!value) {
    return value
  }

  return { ...value, src: value.src === undefined ? undefined : filePath(value.src) }
}

function encodePhoto(photo: OgPage['photo']): OgPhotoInput | false | undefined {
  if (photo === undefined || photo === false) {
    return photo
  }
  const resolved = photoSource(photo)
  if (!resolved) {
    return
  }
  const src = filePath(resolved.src)
  if (resolved.position === 'center') {
    return src
  }

  return { position: resolved.position, src }
}

export function encodeRecord(page: OgPage): string {
  const template = page.template

  return encodeURIComponent(
    JSON.stringify({
      data: page.data,
      footer: page.footer,
      heading: page.heading,
      logo: withSrc(page.logo),
      pathname: page.pathname ?? '/',
      photo: encodePhoto(page.photo),
      template: template === 'cover' || template === 'split' ? template : undefined,
      theme: page.theme,
      title: page.title,
    }),
  )
}

export function extractRecords(html: string): { html: string; records: OgPage[] } {
  const records: OgPage[] = []
  const next = html.replace(TAG, (_match, content: string) => {
    try {
      records.push(JSON.parse(decodeURIComponent(content)) as OgPage)
    } catch {
      // skip a bad tag
    }

    return ''
  })

  return { html: next, records }
}

export function warnOnDemand(pathname: string): void {
  if (onDemand.has(pathname)) {
    return
  }
  onDemand.add(pathname)
  console.warn(
    `[astro-og-kit] ${pathname} is on-demand; no image is generated at build. Use og.route() or an image URL.`,
  )
}
