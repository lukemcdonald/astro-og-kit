import { createRequire } from 'node:module'
import { join } from 'node:path'

type SharpFn = typeof import('sharp').default
type SharpModule = SharpFn | { default: SharpFn }

function requireFrom(base: string, id: string): unknown {
  return createRequire(base)(id)
}

function kitEntry(): string | undefined {
  try {
    return createRequire(join(process.cwd(), 'package.json')).resolve('astro-og-kit')
  } catch {
    return undefined
  }
}

/**
 * Load a native module from this package (or the site, for optional peers).
 * Vite bundles astro-og-kit because of the astro peer + OgMeta.astro; a static
 * import then resolves from the site and misses pnpm-nested deps.
 */
export function loadNative<T>(id: string): T {
  const bases = [import.meta.url, join(process.cwd(), 'package.json')]
  const kit = kitEntry()
  if (kit) {
    bases.push(kit)
  }

  let lastError: unknown
  for (const base of bases) {
    try {
      return requireFrom(base, id) as T
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

export function loadResvg(): typeof import('@resvg/resvg-js') {
  return loadNative('@resvg/resvg-js')
}

let sharpCache: { value: SharpFn | undefined } | undefined

export function loadSharp(): SharpFn | undefined {
  if (sharpCache) {
    return sharpCache.value
  }

  try {
    const mod = loadNative<SharpModule>('sharp')
    sharpCache = { value: typeof mod === 'function' ? mod : mod.default }
  } catch {
    sharpCache = { value: undefined }
  }

  return sharpCache.value
}
