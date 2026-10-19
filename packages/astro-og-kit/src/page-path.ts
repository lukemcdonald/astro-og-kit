type BuildFormat = 'directory' | 'file' | 'preserve'
type TrailingSlash = 'always' | 'ignore' | 'never'

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
export function pagePath(
  pathname: string,
  options: { buildFormat?: BuildFormat; trailingSlash?: TrailingSlash } = {},
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
