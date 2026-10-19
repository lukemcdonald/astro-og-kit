import type { Og, OgConfig } from './types.ts'

import { createMeta, imagePath } from './page-path.ts'
import { renderPng, renderSvg } from './render.ts'
import { createRoute } from './route.ts'

export type * from './types.ts'
export { HEIGHT, WIDTH } from './render.ts'
export { cover, split, type FrameOptions } from './templates/index.ts'
export { escapeXml, raw, svg, type Markup } from './svg.ts'
export { fontMetrics, type FontMetrics } from './font.ts'
export { wrapText, type WrapOptions } from './wrap.ts'

/**
 * Configure site-wide Open Graph image rendering.
 *
 * `font` is required (`family` plus TTF/OTF `files`). Returns
 * `{ meta, path, render, route, svg }`.
 *
 * `prefix` is the image route (default `/og`), not Astro's deploy `base`.
 * Page paths passed to `path()` / `route()` omit the deploy base.
 * Pass `import.meta.env.BASE_URL` as `path()`'s second argument (and as
 * `meta({ deployBase })`); `<OgMeta>` does that for you.
 */
export function defineOg(config: OgConfig): Og {
  const prefix = config.prefix ?? '/og'
  const path = (pathname: string, deployBase = '/') => imagePath(pathname, prefix, deployBase)

  return {
    config,
    meta: createMeta(path),
    path,
    render: (page) => renderPng(config, page),
    route: createRoute(config),
    svg: (page) => renderSvg(config, page),
  }
}
