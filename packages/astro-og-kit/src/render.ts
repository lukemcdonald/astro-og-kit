import type { OgColors, OgConfig, OgPage, OgResolvedColors, OgTemplate, OgTemplateContext } from './types.ts'

import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { loadImage, loadLogo, photoSource, readFont, resolvePath } from './assets.ts'
import { fontMetrics } from './font.ts'
import { loadResvg, loadSharp } from './native.ts'
import { templates } from './templates/index.ts'

export const HEIGHT = 630
export const WIDTH = 1200

const VERSION = '1'

const DEFAULT_COLORS = {
  accent: '#c6c6bd',
  background: '#111111',
  foreground: '#f4f4f4',
  muted: '#a3a3a3',
} as const

function resolveColors(config?: OgColors, page?: OgColors): OgResolvedColors {
  const merged = { ...DEFAULT_COLORS, ...config, ...page }
  const overlay = merged.overlay ?? merged.background
  const logo = merged.logo === false ? false : (merged.logo ?? merged.foreground)

  return { ...merged, logo, overlay }
}

function isPng(bytes: Uint8Array) {
  if (bytes.length < 8) {
    return false
  }

  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
}

function pickTemplate(option: OgPage['template']): OgTemplate {
  if (typeof option === 'function') {
    return option
  }

  return templates[option ?? 'split']
}

/** Everything a template needs for one page. */
export async function buildContext(config: OgConfig, page: OgPage): Promise<OgTemplateContext> {
  const colors = resolveColors(config.colors, page.colors)
  const footer = page.footer === false ? '' : (page.footer ?? config.footer ?? '')
  const logo = page.logo === false ? undefined : { ...config.logo, ...page.logo }
  const resolved = photoSource(page.photo === false ? undefined : (page.photo ?? config.photo))
  const fontFile = config.font.files[0]
  if (!fontFile) {
    throw new Error('[astro-og-kit] font.files must include a TTF or OTF file.')
  }
  const metrics = fontMetrics(readFont(resolvePath(fontFile)))

  return {
    colors,
    font: {
      family: config.font.family,
      weight: config.font.weight ?? 700,
      width: (text, size) => metrics.width(text, size),
    },
    footer,
    height: HEIGHT,
    logo: logo?.src
      ? await loadLogo({ ...logo, src: logo.src }, { color: colors.logo, width: 96 })
      : undefined,
    page: { ...page, title: page.heading ?? page.title },
    photo: resolved && { ...(await loadImage(resolved.src)), position: resolved.position },
    width: WIDTH,
  }
}

/** The SVG for one page, before rasterizing. Handy for debugging templates. */
export async function renderSvg(config: OgConfig, page: OgPage): Promise<string> {
  const template = pickTemplate(page.template ?? config.template)

  return String(template(await buildContext(config, page)))
}

let missingSharpWarned = false

function warnMissingSharp() {
  if (missingSharpWarned) {
    return
  }
  missingSharpWarned = true
  console.warn('[astro-og-kit] compress is on but sharp could not be loaded. Install sharp to shrink PNGs.')
}

async function compress(png: Uint8Array, sharp: NonNullable<ReturnType<typeof loadSharp>>) {
  return sharp(png).png({ compressionLevel: 9, palette: true, quality: 80 }).toBuffer()
}

function cacheKey(config: OgConfig, svgMarkup: string, compressed: boolean) {
  const hash = createHash('sha256')
    .update(VERSION)
    .update(compressed ? '1' : '0')
    .update(svgMarkup)
  for (const file of config.font.files) {
    hash.update(readFont(resolvePath(file)))
  }

  return hash.digest('hex').slice(0, 32)
}

function writeCache(cacheFile: string, png: Uint8Array) {
  const tmp = `${cacheFile}.${process.pid}-${randomBytes(4).toString('hex')}.tmp`
  try {
    writeFileSync(tmp, png)
    renameSync(tmp, cacheFile)
  } catch (error) {
    try {
      unlinkSync(tmp)
    } catch {
      // tmp may not exist if writeFileSync failed
    }
    throw error
  }
}

/** Render one page to PNG bytes. */
export async function renderPng(config: OgConfig, page: OgPage): Promise<Uint8Array> {
  const svgMarkup = await renderSvg(config, page)
  const wantCompress = config.output?.compress !== false
  const sharp = wantCompress ? loadSharp() : undefined
  if (wantCompress && !sharp) {
    warnMissingSharp()
  }
  const compressed = Boolean(sharp)
  const cache = config.output?.cache
  const cacheDir = cache === false ? undefined : resolvePath(cache ?? 'node_modules/.astro-og-kit')
  const cacheFile = cacheDir && join(cacheDir, `${cacheKey(config, svgMarkup, compressed)}.png`)

  if (cacheFile && existsSync(cacheFile)) {
    const hit = readFileSync(cacheFile)
    if (isPng(hit)) {
      return hit
    }
  }

  const { Resvg } = loadResvg()
  const resvg = new Resvg(svgMarkup, {
    fitTo: { mode: 'width', value: WIDTH },
    font: {
      defaultFontFamily: config.font.family,
      fontFiles: config.font.files.map((file) => resolvePath(file)),
      loadSystemFonts: false,
    },
  })
  const raw = resvg.render().asPng()
  const png = sharp ? await compress(raw, sharp) : raw

  if (cacheDir && cacheFile) {
    mkdirSync(cacheDir, { recursive: true })
    writeCache(cacheFile, png)
  }

  return png
}
