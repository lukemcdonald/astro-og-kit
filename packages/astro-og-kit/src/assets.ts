import type { OgImageSource, OgLogo, OgLogoRender } from './types.ts'

import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertSfntFont } from './font.ts'
import { raw, svg } from './svg.ts'

/** Sniff the real format; extensions lie (a ".jpg" that is really WebP is common). */
function sniff(bytes: Buffer): string | undefined {
  if (bytes.readUInt32BE(0) === 0x89504e47) {
    return 'image/png'
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'image/jpeg'
  }
  if (bytes.subarray(0, 3).toString('ascii') === 'GIF') {
    return 'image/gif'
  }
  if (bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp'
  }
  if (bytes.subarray(4, 12).toString('ascii').startsWith('ftypavi')) {
    return 'image/avif'
  }
  if (/<svg[\s>]/i.test(bytes.subarray(0, 1024).toString('utf8'))) {
    return 'image/svg+xml'
  }

  return undefined
}

const memo = new Map<string, unknown>()

function cached<T>(key: string, load: () => T): T {
  if (!memo.has(key)) {
    memo.set(key, load())
  }

  return memo.get(key) as T
}

function missingFileMessage(path: string): string {
  if (path.includes('/_astro/') || path.includes('\\_astro\\')) {
    return `[astro-og-kit] File not found: ${path}. Pass the imported image object, not .src.`
  }

  return `[astro-og-kit] File not found: ${path}. Paths are relative to the project root.`
}

/** Turn a path, file URL or imported Astro image into an absolute file path. */
export function resolvePath(source: OgImageSource, root = process.cwd()): string {
  if (source instanceof URL) {
    return fileURLToPath(source)
  }
  if (typeof source === 'object') {
    if (source.fsPath) {
      return source.fsPath
    }

    return resolvePath(source.src.split('?')[0] ?? '', root)
  }
  let path = decodeURIComponent(source)
  if (path.startsWith('file:')) {
    return fileURLToPath(path)
  }
  if (path.startsWith('/@fs/')) {
    path = path.slice('/@fs'.length)
  }
  if (isAbsolute(path) && existsSync(path)) {
    return path
  }

  return join(root, path.replace(/^[/\\]/, ''))
}

function read(path: string) {
  if (!existsSync(path)) {
    throw new Error(missingFileMessage(path))
  }

  return readFileSync(path)
}

export function readFont(path: string) {
  return cached(`font:${path}`, () => {
    const bytes = read(path)
    assertSfntFont(bytes, path)

    return bytes
  })
}

let sharpModule: Promise<typeof import('sharp').default | undefined> | undefined

/** sharp is optional: Astro installs it, and we only reach for it when we must. */
export function loadSharp() {
  sharpModule ??= import('sharp').then(
    (mod) => mod.default,
    () => undefined,
  )

  return sharpModule
}

export type ImageData = { height: number; href: string; width: number }

/** Read an image as a data URI resvg can draw (PNG, JPEG, GIF; WebP/AVIF via sharp). */
export function loadImage(source: OgImageSource): Promise<ImageData> {
  const path = resolvePath(source)

  return cached(`uri:${path}`, async () => {
    let bytes = read(path)
    let mime = sniff(bytes)
    if (mime === 'image/webp' || mime === 'image/avif') {
      const sharp = await loadSharp()
      if (!sharp) {
        throw new Error(`[astro-og-kit] ${path} is ${mime}. Install sharp, or use a PNG or JPEG.`)
      }
      bytes = await sharp(bytes).jpeg({ quality: 85 }).toBuffer()
      mime = 'image/jpeg'
    }
    if (!mime || mime === 'image/svg+xml') {
      throw new Error(
        `[astro-og-kit] Unsupported image: ${path}. Use PNG, JPEG, or GIF. WebP and AVIF need sharp.`,
      )
    }

    return {
      href: `data:${mime};base64,${bytes.toString('base64')}`,
      ...rasterSize(bytes),
    }
  })
}

/** Pixel size of a PNG or JPEG, read from its header. */
function rasterSize(bytes: Buffer): { height: number; width: number } {
  if (bytes.readUInt32BE(0) === 0x89504e47) {
    return { height: bytes.readUInt32BE(20), width: bytes.readUInt32BE(16) }
  }
  let i = 2
  while (i < bytes.length) {
    const marker = bytes[i + 1] ?? 0
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        height: bytes.readUInt16BE(i + 5),
        width: bytes.readUInt16BE(i + 7),
      }
    }
    i += 2 + bytes.readUInt16BE(i + 2)
  }

  // GIF
  return { height: bytes.readUInt16LE(8), width: bytes.readUInt16LE(6) }
}

export async function loadLogo(
  logo: OgLogo,
  defaults: { color: string; width: number },
): Promise<OgLogoRender> {
  const path = resolvePath(logo.src)
  const width = logo.width ?? defaults.width

  if (sniff(read(path)) !== 'image/svg+xml') {
    const { height: sourceHeight, href, width: sourceWidth } = await loadImage(path)
    const height = (width * sourceHeight) / sourceWidth

    return {
      height,
      width,
      at: (x, y) => svg`<image href="${href}" x="${x}" y="${y}" width="${width}" height="${height}" />`,
    }
  }

  const source = read(path).toString('utf8')
  const viewBox = source.match(/viewBox=["']([^"']+)["']/)?.[1]?.trim()
  const [, , vbWidth, vbHeight] = (viewBox ?? '').split(/[\s,]+/).map(Number)
  if (!viewBox || !vbWidth || !vbHeight) {
    throw new Error(`[astro-og-kit] Logo needs a viewBox: ${path}`)
  }
  const inner = source.replace(/^[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>\s*$/i, '')
  const height = (width * vbHeight) / vbWidth
  const style = logo.css ? svg`<style>${raw(logo.css)}</style>` : ''

  return {
    height,
    width,
    at: (x, y) =>
      svg`<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}" fill="${logo.color ?? defaults.color}">${style}${raw(inner)}</svg>`,
  }
}
