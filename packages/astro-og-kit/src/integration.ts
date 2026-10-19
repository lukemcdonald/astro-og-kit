import type { AstroIntegration } from 'astro'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Og, OgConfig } from './types.ts'

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineOg } from './index.ts'
import { beginRecording, endRecording, readPages } from './manifest.ts'
import { stripDeployBase } from './route.ts'

function isOg(input: Og | OgConfig): input is Og {
  return 'render' in input && typeof (input as Og).render === 'function'
}

function toOg(input: Og | OgConfig): Og {
  if (isOg(input)) {
    return input
  }

  return defineOg(input)
}

function requestPath(req: IncomingMessage): string {
  const raw = req.url ?? ''

  return decodeURIComponent(raw.split('?')[0] ?? '')
}

function outFile(imageUrl: string, deployBase: string, outDir: string): string {
  return join(outDir, stripDeployBase(imageUrl, deployBase).replace(/^\//, ''))
}

/**
 * Write PNGs for every page that rendered `<OgMeta>` during the static build.
 * In `astro dev`, serve those URLs from the same recorded page data.
 */
export default function ogkit(ogOrConfig: Og | OgConfig): AstroIntegration {
  const og = toOg(ogOrConfig)
  const cacheDir = og.config.cacheDir
  let base = '/'
  let output: 'static' | 'server' = 'static'

  return {
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const { duplicates, pages } = readPages(cacheDir)
        for (const pathname of duplicates) {
          logger.warn(`Duplicate <OgMeta> for ${pathname}; last one wins.`)
        }
        if (output === 'server') {
          logger.info('On-demand pages are skipped at build time. Use og.route() to render those on request.')
        }
        if (pages.length === 0) {
          logger.warn('No pages recorded. Render <OgMeta> on prerendered pages.')
          endRecording(cacheDir)
          return
        }

        const outDir = fileURLToPath(dir)
        for (const page of pages) {
          const imageUrl = og.path(page.pathname, base)
          const dest = outFile(imageUrl, base, outDir)
          mkdirSync(dirname(dest), { recursive: true })
          writeFileSync(dest, await og.render(page))
        }
        logger.info(`Wrote ${pages.length} Open Graph image${pages.length === 1 ? '' : 's'}.`)
        endRecording(cacheDir)
      },
      'astro:build:start': () => {
        beginRecording(cacheDir)
      },
      'astro:config:done': ({ buildOutput, config }) => {
        base = config.base
        output = buildOutput
      },
      'astro:config:setup': ({ command, updateConfig }) => {
        if (command !== 'dev') {
          return
        }
        updateConfig({
          vite: {
            plugins: [
              {
                configureServer(server) {
                  server.middlewares.use((req, res, next) => {
                    void serveDev(og, cacheDir, base, req, res, next)
                  })
                },
                name: 'astro-og-kit-dev',
              },
            ],
          },
        })
      },
      'astro:server:done': () => {
        endRecording(cacheDir)
      },
      'astro:server:setup': () => {
        beginRecording(cacheDir)
      },
    },
    name: 'astro-og-kit',
  }
}

async function serveDev(
  og: Og,
  cacheDir: string | false | undefined,
  base: string,
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
): Promise<void> {
  if (req.method !== 'GET') {
    next()
    return
  }
  const pathname = requestPath(req)
  if (!pathname.endsWith('.png')) {
    next()
    return
  }

  const page = readPages(cacheDir).pages.find((entry) => og.path(entry.pathname, base) === pathname)
  if (!page) {
    next()
    return
  }

  try {
    const png = await og.render(page)
    res.statusCode = 200
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'no-store')
    res.end(png)
  } catch (error) {
    next(error)
  }
}
