import type { AstroIntegration } from 'astro'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Og, OgPage } from './types.ts'

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractRecords, pagePath, type PagePathOptions } from './page-path.ts'
import { stripDeployBase } from './route.ts'

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

/**
 * Write PNGs for every prerendered page that rendered `<OgMeta>`.
 * In `astro dev`, serve those URLs by reading the carrier tag from the page.
 */
export default function ogkit(og: Og): AstroIntegration {
  const prefix = og.config.prefix ?? '/og'
  let base = '/'
  let pathOptions: PagePathOptions = {}

  return {
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir)
        const pages = new Map<string, OgPage>()
        for (const name of readdirSync(outDir, { recursive: true })) {
          if (!String(name).endsWith('.html')) {
            continue
          }
          const file = join(outDir, String(name))
          const source = readFileSync(file, 'utf8')
          const { html, records } = extractRecords(source)
          if (records.length > 1) {
            logger.warn(`Duplicate astro-og-kit tag in ${name}; last one wins.`)
          }
          for (const record of records) {
            pages.set(record.pathname ?? '/', record)
          }
          if (html !== source) {
            writeFileSync(file, html)
          }
        }
        if (pages.size === 0) {
          logger.warn('No pages recorded. Render <OgMeta> on prerendered pages.')
          return
        }
        for (const page of pages.values()) {
          const dest = join(
            outDir,
            stripDeployBase(og.path(page.pathname ?? '/', base), base).replace(/^\//, ''),
          )
          mkdirSync(dirname(dest), { recursive: true })
          writeFileSync(dest, await og.render(page))
        }
      },
      'astro:config:done': ({ config }) => {
        base = config.base
        pathOptions = { buildFormat: config.build.format, trailingSlash: config.trailingSlash }
      },
      'astro:config:setup': ({ command, updateConfig }) => {
        updateConfig({
          vite: {
            define: { 'import.meta.env.ASTRO_OG_KIT': true },
            ...(command === 'dev'
              ? {
                  plugins: [
                    {
                      configureServer(server) {
                        server.middlewares.use((req, res, next) => {
                          void serveDev(og, prefix, base, pathOptions, req, res, next)
                        })
                      },
                      name: 'astro-og-kit-dev',
                    },
                  ],
                }
              : {}),
          },
        })
      },
    },
    name: 'astro-og-kit',
  }
}

async function serveDev(
  og: Og,
  prefix: string,
  base: string,
  pathOptions: PagePathOptions,
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
): Promise<void> {
  if (req.method !== 'GET') {
    next()
    return
  }
  const pathname = decodeURIComponent((req.url ?? '').split('?')[0] ?? '')
  const slug = pathname.endsWith('.png') ? pngSlug(pathname, prefix, base) : undefined
  if (!slug) {
    next()
    return
  }

  try {
    const page = await fetch(
      pageUrl(String(req.headers.host ?? ''), base, slug, pathOptions, 'encrypted' in req.socket),
    )
    if (!page.ok) {
      next()
      return
    }
    const record = extractRecords(await page.text()).records.at(-1)
    if (!record) {
      next()
      return
    }
    res.statusCode = 200
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'image/png')
    res.end(await og.render(record))
  } catch (error) {
    next(error)
  }
}
