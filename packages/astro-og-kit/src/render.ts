import type { OgConfig, OgPage, OgTemplate, OgTemplateContext, OgTheme } from './types.ts'

import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { Resvg } from '@resvg/resvg-js'

import { loadImage, loadLogo, loadSharp, readFont, resolvePath } from './assets.ts'
import { fontMetrics } from './font.ts'
import { templates } from './templates/index.ts'

export const HEIGHT = 630
export const WIDTH = 1200

const VERSION = '1'

const DEFAULT_THEME: OgTheme = {
  accent: '#c6c6bd',
  background: '#111111',
  foreground: '#f4f4f4',
  muted: '#a3a3a3',
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

  return templates[option ?? 'editorial']
}

/** Everything a template needs for one page. */
export async function buildContext(config: OgConfig, page: OgPage): Promise<OgTemplateContext> {
  const theme = { ...DEFAULT_THEME, ...config.theme, ...page.theme }
  const background = page.background === false ? undefined : (page.background ?? config.background)
  const mark = page.mark === false ? '' : (page.mark ?? config.mark ?? '')

  const backgroundImage = background && (await loadImage(background.src))
  const fontFile = config.font.files[0]
  if (!fontFile) {
    throw new Error('[astro-og-kit] font.files must include a TTF or OTF file.')
  }
  const metrics = fontMetrics(readFont(resolvePath(fontFile)))

  return {
    background: background &&
      backgroundImage && {
        ...backgroundImage,
        opacity: background.opacity ?? 0.7,
        overlay: background.overlay ?? theme.background,
        position: background.position ?? 'center',
        viewBox: (background.crop ?? [0, 0, backgroundImage.width, backgroundImage.height]).join(' '),
      },
    font: {
      family: config.font.family,
      weight: config.font.weight ?? 700,
      width: (text, size) => metrics.width(text, size),
    },
    height: HEIGHT,
    image: page.image ? await loadImage(page.image) : undefined,
    logo: config.logo && (await loadLogo(config.logo, { color: theme.foreground, width: 96 })),
    mark,
    page,
    theme,
    width: WIDTH,
  }
}

/** The SVG for one page, before rasterizing. Handy for debugging templates. */
export async function renderSvg(config: OgConfig, page: OgPage): Promise<string> {
  const template = pickTemplate(page.template ?? config.template)

  return String(template(await buildContext(config, page)))
}

async function compress(png: Uint8Array) {
  const sharp = await loadSharp()
  if (!sharp) {
    return png
  }

  return sharp(png).png({ compressionLevel: 9, palette: true, quality: 80 }).toBuffer()
}

function cacheKey(config: OgConfig, svgMarkup: string) {
  const hash = createHash('sha256')
    .update(VERSION)
    .update(String(config.compress ?? true))
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
  const cacheDir =
    config.cacheDir === false ? undefined : resolvePath(config.cacheDir ?? 'node_modules/.astro-og-kit')
  const cacheFile = cacheDir && join(cacheDir, `${cacheKey(config, svgMarkup)}.png`)

  if (cacheFile && existsSync(cacheFile)) {
    const hit = readFileSync(cacheFile)
    if (isPng(hit)) {
      return hit
    }
  }

  const resvg = new Resvg(svgMarkup, {
    fitTo: { mode: 'width', value: WIDTH },
    font: {
      defaultFontFamily: config.font.family,
      fontFiles: config.font.files.map((file) => resolvePath(file)),
      loadSystemFonts: false,
    },
  })
  const raw = resvg.render().asPng()
  const png = config.compress === false ? raw : await compress(raw)

  if (cacheDir && cacheFile) {
    mkdirSync(cacheDir, { recursive: true })
    writeCache(cacheFile, png)
  }

  return png
}
