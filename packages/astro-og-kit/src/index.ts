import type { Og, OgConfig } from './types.ts'

import { renderPng, renderSvg } from './render.ts'
import { astroBaseUrl, createMeta, createRoute, imagePath } from './route.ts'

export type * from './types.ts'
export { backdrop, editorial, type FrameOptions } from './templates/index.ts'
export { escapeXml, raw, svg, type Markup } from './svg.ts'
export { fontMetrics, type FontMetrics } from './font.ts'
export { wrapText, type WrapOptions } from './wrap.ts'

export function defineOg(config: OgConfig): Og {
  const prefix = `/${(config.base ?? '/og').replace(/^\/+|\/+$/g, '')}`
  const path = (pathname: string, deployBase = astroBaseUrl()) => imagePath(pathname, prefix, deployBase)

  return {
    config,
    meta: createMeta(path),
    path,
    render: (page) => renderPng(config, page),
    route: createRoute(config),
    svg: (page) => renderSvg(config, page),
  }
}
