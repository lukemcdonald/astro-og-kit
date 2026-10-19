import { createRequire } from 'node:module'
import { join } from 'node:path'

type ResvgMod = typeof import('@resvg/resvg-js')
type SharpFn = typeof import('sharp').default

function loadNative<T>(id: string): T {
  try {
    // Unbundled: this file lives next to @resvg/resvg-js in the package.
    return createRequire(import.meta.url)(id) as T
  } catch (error) {
    try {
      // Vite inlines this module; import.meta.url is the site chunk. Resolve from the project.
      return createRequire(join(process.cwd(), 'package.json'))(id) as T
    } catch {
      throw error
    }
  }
}

let resvg: ResvgMod | undefined

export function loadResvg(): ResvgMod {
  if (!resvg) {
    resvg = loadNative<ResvgMod>('@resvg/resvg-js')
  }

  return resvg
}

let sharp: { value: SharpFn | undefined } | undefined

export function loadSharp(): SharpFn | undefined {
  if (!sharp) {
    try {
      const mod = loadNative<SharpFn | { default: SharpFn }>('sharp')
      sharp = { value: typeof mod === 'function' ? mod : mod.default }
    } catch {
      sharp = { value: undefined }
    }
  }

  return sharp.value
}
