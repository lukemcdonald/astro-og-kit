import type { OgImageSource, OgPage } from './types.ts'

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

export function isImageUrlOverride(image: unknown): image is string {
  return typeof image === 'string' && /^https?:\/\//i.test(image)
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

export function encodeRecord(page: OgPage): string {
  const template = page.template

  return encodeURIComponent(
    JSON.stringify({
      background: withSrc(page.background),
      data: page.data,
      footer: page.footer,
      image: page.image === undefined ? undefined : filePath(page.image),
      logo: withSrc(page.logo),
      pathname: page.pathname ?? '/',
      template: template === 'backdrop' || template === 'editorial' ? template : undefined,
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
