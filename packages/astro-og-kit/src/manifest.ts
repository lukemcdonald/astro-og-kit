import type { OgBackground, OgImageSource, OgLogo, OgPage, OgTemplateName } from './types.ts'

import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MARKER = '.record'
const PAGES = 'pages.jsonl'

export type OgPageRecord = {
  background?: OgBackground | false
  data?: Record<string, unknown>
  footer?: string | false
  image?: string
  logo?: Partial<OgLogo> | false
  pathname: string
  template?: OgTemplateName
  theme?: OgPage['theme']
  title: string
}

/** Site or remote URL: use as og:image and skip PNG generation. File paths and imports are photos. */
export function isImageUrlOverride(image: unknown): image is string {
  if (typeof image !== 'string' || image.length === 0) {
    return false
  }
  if (/^(https?:)?\/\//i.test(image) || image.startsWith('data:')) {
    return true
  }
  if (image.startsWith('/')) {
    return !existsSync(image)
  }

  return false
}

function discoveryDir(cacheDir: string | false | undefined): string {
  const root = cacheDir === false || cacheDir === undefined ? 'node_modules/.astro-og-kit' : cacheDir
  if (isAbsolute(root)) {
    return root
  }

  return join(process.cwd(), root)
}

function markerFile(dir: string): string {
  return join(dir, MARKER)
}

function pagesFile(dir: string): string {
  return join(dir, PAGES)
}

export function beginRecording(cacheDir: string | false | undefined): string {
  const dir = discoveryDir(cacheDir)
  mkdirSync(dir, { recursive: true })
  writeFileSync(markerFile(dir), '1')
  try {
    unlinkSync(pagesFile(dir))
  } catch {
    // no previous manifest
  }

  return dir
}

export function endRecording(cacheDir: string | false | undefined): void {
  try {
    unlinkSync(markerFile(discoveryDir(cacheDir)))
  } catch {
    // already gone
  }
}

function isRecording(dir: string): boolean {
  return existsSync(markerFile(dir))
}

function filePath(source: OgImageSource): string {
  if (source instanceof URL) {
    return fileURLToPath(source)
  }
  if (typeof source === 'object') {
    if (source.fsPath) {
      return source.fsPath
    }

    return source.src.split('?')[0] ?? ''
  }
  if (source.startsWith('file:')) {
    return fileURLToPath(source)
  }
  if (source.startsWith('/@fs/')) {
    return source.slice('/@fs'.length)
  }

  return source
}

function serializeBackground(background: OgPage['background']): OgBackground | false | undefined {
  if (background === undefined || background === false) {
    return background
  }

  return {
    crop: background.crop,
    opacity: background.opacity,
    overlay: background.overlay,
    position: background.position,
    src: filePath(background.src),
  }
}

function serializeLogo(logo: OgPage['logo']): Partial<OgLogo> | false | undefined {
  if (logo === undefined || logo === false) {
    return logo
  }

  return {
    color: logo.color,
    css: logo.css,
    src: logo.src === undefined ? undefined : filePath(logo.src),
    width: logo.width,
  }
}

function serializeTemplate(template: OgPage['template']): OgTemplateName | undefined {
  if (template === 'backdrop' || template === 'editorial') {
    return template
  }

  return undefined
}

function serializeData(data: OgPage['data']): Record<string, unknown> | undefined {
  if (!data) {
    return undefined
  }
  try {
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>
  } catch {
    return undefined
  }
}

export function serializePage(page: OgPage): OgPageRecord {
  return {
    background: serializeBackground(page.background),
    data: serializeData(page.data),
    footer: page.footer,
    image: page.image === undefined ? undefined : filePath(page.image),
    logo: serializeLogo(page.logo),
    pathname: page.pathname ?? '/',
    template: serializeTemplate(page.template),
    theme: page.theme,
    title: page.title,
  }
}

let templateFnWarned = false

export function recordPage(input: { cacheDir: string | false | undefined; page: OgPage }): void {
  const dir = discoveryDir(input.cacheDir)
  if (!isRecording(dir)) {
    return
  }
  if (typeof input.page.template === 'function' && !templateFnWarned) {
    templateFnWarned = true
    console.warn(
      '[astro-og-kit] Per-page template functions are not recorded. Use "editorial" / "backdrop", or set template on defineOg().',
    )
  }

  mkdirSync(dir, { recursive: true })
  appendFileSync(pagesFile(dir), `${JSON.stringify(serializePage(input.page))}\n`)
}

export function readPages(cacheDir: string | false | undefined): {
  duplicates: string[]
  pages: OgPageRecord[]
} {
  const file = pagesFile(discoveryDir(cacheDir))
  if (!existsSync(file)) {
    return { duplicates: [], pages: [] }
  }

  const seen = new Map<string, OgPageRecord>()
  const duplicates: string[] = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line) {
      continue
    }
    try {
      const page = JSON.parse(line) as OgPageRecord
      if (seen.has(page.pathname)) {
        duplicates.push(page.pathname)
      }
      seen.set(page.pathname, page)
    } catch {
      // truncated line from a crashed worker
    }
  }

  return { duplicates: [...new Set(duplicates)], pages: [...seen.values()] }
}
